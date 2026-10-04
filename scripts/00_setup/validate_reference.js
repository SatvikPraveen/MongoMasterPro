// File: scripts/00_setup/validate_reference.js
// Verifies the learning_platform reference dataset against the schema created
// by docker/init/00_bootstrap.js and against the generation manifest written by
// data/generators/generate_data.py.
//
// Checks performed
//   1. Every reference collection exists and carries its JSON Schema validator.
//   2. Every index the bootstrap defines is present (by name).
//   3. Document counts equal the manifest (when a manifest is available).
//   4. No document violates its collection's validator ($nor: [$jsonSchema]).
//   5. Referential integrity: no orphaned enrollments, reviews, courses, events.
//   6. Denormalised counters agree with the referencing documents.
//
// Usage:  mongosh --file scripts/00_setup/validate_reference.js
//         MMP_MANIFEST=/path/to/manifest.json mongosh --file ...
// Exit status is non-zero if any check fails, so it can gate CI.

const fs = require("fs");

const ref = db.getSiblingDB("learning_platform");
const manifestPath = process.env.MMP_MANIFEST || "/app/data/generated/manifest.json";

const EXPECTED_INDEXES = {
  users: [
    "idx_users_email_unique",
    "idx_users_username_unique",
    "idx_users_status_created",
    "idx_users_language",
    "idx_users_name",
  ],
  courses: [
    "idx_courses_instructor_status",
    "idx_courses_category_difficulty",
    "idx_courses_text_search",
    "idx_courses_tags",
    "idx_courses_price",
    "idx_courses_popular",
    "idx_courses_created",
  ],
  enrollments: [
    "idx_enrollments_user_course_unique",
    "idx_enrollments_course_status",
    "idx_enrollments_user_enrolled",
    "idx_enrollments_completion",
    "idx_enrollments_last_accessed",
  ],
  reviews: [
    "idx_reviews_course_rating",
    "idx_reviews_user_created",
    "idx_reviews_helpful",
    "idx_reviews_verified_rating",
  ],
  categories: [
    "idx_categories_name_unique",
    "idx_categories_hierarchy",
    "idx_categories_active_popular",
  ],
  analytics_events: [
    "idx_analytics_user_time",
    "idx_analytics_event_time",
    "idx_analytics_course_event",
    "idx_analytics_ttl",
  ],
};

const REFERENCES = [
  // [collection, local field, foreign collection, optional filter]
  ["courses", "instructor_id", "instructors", {}],
  ["courses", "category_id", "categories", { category_id: { $exists: true } }],
  ["enrollments", "user_id", "users", {}],
  ["enrollments", "course_id", "courses", {}],
  ["reviews", "user_id", "users", {}],
  ["reviews", "course_id", "courses", {}],
  ["analytics_events", "user_id", "users", {}],
  ["analytics_events", "course_id", "courses", { course_id: { $exists: true } }],
  ["categories", "parent_id", "categories", { parent_id: { $exists: true } }],
];

const results = { passed: 0, failed: 0, warnings: 0, failures: [] };
function pass(msg) {
  results.passed++;
  print(`✓ ${msg}`);
}
function fail(msg) {
  results.failed++;
  results.failures.push(msg);
  print(`✗ ${msg}`);
}
function warn(msg) {
  results.warnings++;
  print(`⚠ ${msg}`);
}

print("=".repeat(70));
print("REFERENCE DATASET VALIDATION — learning_platform");
print("=".repeat(70));

// 0. Manifest ---------------------------------------------------------------
let manifest = null;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const prm = manifest.parameters || {};
  print(
    `Manifest: ${manifestPath}\n  generator v${manifest.generator.version}, mode=${prm.mode}, scale=${prm.scale}, seed=${prm.seed}, reference_date=${prm.reference_date}`
  );
} catch (e) {
  warn(`No manifest at ${manifestPath}; count checks skipped (${e.message})`);
}

// 1-2. Collections, validators, indexes ------------------------------------
print("\n1. Collections, validators and indexes");
const infos = Object.fromEntries(ref.getCollectionInfos().map((c) => [c.name, c]));
Object.entries(EXPECTED_INDEXES).forEach(([coll, indexNames]) => {
  if (!infos[coll]) {
    fail(`collection ${coll} missing`);
    return;
  }
  const hasValidator = infos[coll].options && infos[coll].options.validator;
  if (hasValidator) pass(`${coll}: JSON Schema validator present`);
  else fail(`${coll}: validator missing`);

  const present = new Set(ref.getCollection(coll).getIndexes().map((i) => i.name));
  const missing = indexNames.filter((n) => !present.has(n));
  if (missing.length === 0) pass(`${coll}: all ${indexNames.length} expected indexes present`);
  else fail(`${coll}: missing indexes ${missing.join(", ")}`);
});
if (!infos.instructors) fail("collection instructors missing (created on import)");
else pass("instructors: collection present");

// 3. Counts -----------------------------------------------------------------
print("\n2. Document counts");
const COLLECTIONS = [
  "categories",
  "users",
  "instructors",
  "courses",
  "enrollments",
  "reviews",
  "analytics_events",
];
COLLECTIONS.forEach((coll) => {
  const n = ref.getCollection(coll).countDocuments();
  if (manifest && manifest.collections[coll]) {
    const expected = manifest.collections[coll].records;
    if (n === expected) pass(`${coll}: ${n} documents (matches manifest)`);
    else fail(`${coll}: ${n} documents, manifest says ${expected}`);
  } else if (n === 0) {
    fail(`${coll}: empty`);
  } else {
    pass(`${coll}: ${n} documents`);
  }
});

// 4. Validator compliance ---------------------------------------------------
print("\n3. Validator compliance (documents violating their collection schema)");
Object.keys(EXPECTED_INDEXES).forEach((coll) => {
  const validator = infos[coll] && infos[coll].options && infos[coll].options.validator;
  if (!validator) return;
  const violating = ref.getCollection(coll).countDocuments({ $nor: [validator] });
  if (violating === 0) pass(`${coll}: 0 violating documents`);
  else fail(`${coll}: ${violating} documents violate the validator`);
});

// 5. Referential integrity --------------------------------------------------
print("\n4. Referential integrity");
REFERENCES.forEach(([coll, field, foreign, filter]) => {
  const orphans = ref
    .getCollection(coll)
    .aggregate([
      { $match: filter },
      { $lookup: { from: foreign, localField: field, foreignField: "_id", as: "t" } },
      { $match: { t: { $size: 0 } } },
      { $count: "n" },
    ])
    .toArray();
  const n = orphans.length ? orphans[0].n : 0;
  if (n === 0) pass(`${coll}.${field} → ${foreign}: no orphans`);
  else fail(`${coll}.${field} → ${foreign}: ${n} orphaned documents`);
});

const dupPairs = ref.enrollments
  .aggregate([
    { $group: { _id: { u: "$user_id", c: "$course_id" }, n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
    { $count: "n" },
  ])
  .toArray();
if (!dupPairs.length) pass("enrollments: (user_id, course_id) pairs unique");
else fail(`enrollments: ${dupPairs[0].n} duplicated (user_id, course_id) pairs`);

// 6. Denormalised counters --------------------------------------------------
print("\n5. Denormalised counters");
const actualEnrollments = Object.fromEntries(
  ref.enrollments
    .aggregate([{ $group: { _id: "$course_id", n: { $sum: 1 } } }])
    .toArray()
    .map((d) => [String(d._id), d.n])
);
let counterMismatches = 0;
ref.courses.find({}, { enrollment_count: 1 }).forEach((c) => {
  if ((actualEnrollments[String(c._id)] || 0) !== c.enrollment_count) counterMismatches++;
});
if (counterMismatches === 0) pass("courses.enrollment_count agrees with enrollments");
else fail(`courses.enrollment_count disagrees for ${counterMismatches} courses`);

const ratingMismatch = ref.reviews
  .aggregate([
    { $group: { _id: "$course_id", avg: { $avg: "$rating" }, n: { $sum: 1 } } },
    { $lookup: { from: "courses", localField: "_id", foreignField: "_id", as: "c" } },
    { $unwind: "$c" },
    {
      $match: {
        $expr: {
          $or: [
            { $ne: ["$n", "$c.rating.count"] },
            { $gt: [{ $abs: { $subtract: ["$avg", "$c.rating.average"] } }, 0.011] },
          ],
        },
      },
    },
    { $count: "n" },
  ])
  .toArray();
if (!ratingMismatch.length) pass("courses.rating agrees with reviews");
else fail(`courses.rating disagrees for ${ratingMismatch[0].n} courses`);

// Summary -------------------------------------------------------------------
print("\n" + "=".repeat(70));
print(`SUMMARY: ${results.passed} passed, ${results.failed} failed, ${results.warnings} warnings`);
if (results.failed) {
  print("Failures:");
  results.failures.forEach((f) => print(`  - ${f}`));
  print("=".repeat(70));
  quit(1);
}
print("Reference dataset is consistent with its schema and manifest.");
print("=".repeat(70));
