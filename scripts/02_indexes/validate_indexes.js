// File: scripts/02_indexes/validate_indexes.js
// Index existence, performance checks, and optimization validation

use("mongomasterpro");

print("MongoDB Indexes: Validation & Testing");
print("=" * 50);

// =================================================================
// INDEX VALIDATION FRAMEWORK
// =================================================================

class IndexValidator {
  constructor() {
    this.testsPassed = 0;
    this.testsFailed = 0;
    this.warnings = 0;
    this.results = [];
  }

  assert(condition, testName, details = "") {
    if (condition) {
      this.testsPassed++;
      this.results.push({ status: "PASS", test: testName, details });
      print(`✓ ${testName}`);
      if (details) print(`  ${details}`);
    } else {
      this.testsFailed++;
      this.results.push({ status: "FAIL", test: testName, details });
      print(`✗ ${testName}`);
      if (details) print(`  ${details}`);
    }
  }

  warn(testName, details = "") {
    this.warnings++;
    this.results.push({ status: "WARN", test: testName, details });
    print(`⚠ ${testName}`);
    if (details) print(`  ${details}`);
  }

  assertIndexExists(collection, indexName, testName) {
    const indexes = db.getCollection(collection).getIndexes();
    const exists = indexes.some((idx) => idx.name === indexName);
    this.assert(exists, testName, exists ? "Index found" : "Index missing");
    return exists;
  }

  assertQueryUsesIndex(collection, query, expectedIndex, testName) {
    const explain = db
      .getCollection(collection)
      .find(query)
      .explain("executionStats");
    const usedIndex =
      explain.executionStats.executionStages.indexName ||
      explain.executionStats.executionStages.inputStage?.indexName;

    const condition = usedIndex === expectedIndex;
    this.assert(
      condition,
      testName,
      `Expected: ${expectedIndex}, Used: ${usedIndex || "Collection scan"}`
    );
    return condition;
  }

  assertQueryPerformance(collection, query, maxTime, testName) {
    const start = Date.now();
    const explain = db
      .getCollection(collection)
      .find(query)
      .explain("executionStats");
    const actualTime = explain.executionStats.executionTimeMillis;

    const condition = actualTime <= maxTime;
    this.assert(
      condition,
      testName,
      `Time: ${actualTime}ms (max: ${maxTime}ms)`
    );
    return condition;
  }

  generateReport() {
    const totalTests = this.testsPassed + this.testsFailed;
    const passRate =
      totalTests > 0 ? ((this.testsPassed / totalTests) * 100).toFixed(1) : 0;

    print("\n" + "=".repeat(60));
    print("INDEX VALIDATION REPORT");
    print("=".repeat(60));
    print(`Total Tests: ${totalTests}`);
    print(`Passed: ${this.testsPassed}`);
    print(`Failed: ${this.testsFailed}`);
    print(`Warnings: ${this.warnings}`);
    print(`Pass Rate: ${passRate}%`);

    if (this.testsFailed > 0) {
      print("\nFAILED TESTS:");
      this.results
        .filter((r) => r.status === "FAIL")
        .forEach((result) => {
          print(`• ${result.test}: ${result.details}`);
        });
    }

    if (this.warnings > 0) {
      print("\nWARNINGS:");
      this.results
        .filter((r) => r.status === "WARN")
        .forEach((result) => {
          print(`• ${result.test}: ${result.details}`);
        });
    }

    print(
      this.testsFailed === 0
        ? "\n🎉 ALL INDEX TESTS PASSED!"
        : "\n⚠ SOME TESTS FAILED"
    );
    return this.testsFailed === 0;
  }
}

const validator = new IndexValidator();

print("\n🧪 STARTING INDEX VALIDATION TESTS");
print("-".repeat(50));

// =================================================================
// BASIC INDEX EXISTENCE VALIDATION
// =================================================================

print("\n📋 BASIC INDEX EXISTENCE VALIDATION");
print("-".repeat(30));

// Essential indexes that should exist
const essentialIndexes = [
  { collection: "users", indexName: "_id_", description: "Default _id index" },
  {
    collection: "users",
    indexName: "email_1",
    description: "Email unique index",
  },
  {
    collection: "users",
    indexName: "role_1",
    description: "Role index for filtering",
  },
  {
    collection: "users",
    indexName: "createdAt_-1",
    description: "Creation date sort index",
  },
  { collection: "courses", indexName: "_id_", description: "Course _id index" },
  {
    collection: "courses",
    indexName: "instructorId_1",
    description: "Instructor reference index",
  },
  {
    collection: "courses",
    indexName: "status_1",
    description: "Course status index",
  },
  {
    collection: "enrollments",
    indexName: "studentId_1_courseId_1",
    description: "Enrollment composite index",
  },
];

print("Validating essential indexes:");
essentialIndexes.forEach((indexTest) => {
  validator.assertIndexExists(
    indexTest.collection,
    indexTest.indexName,
    indexTest.description
  );
});

// =================================================================
// SPECIALIZED INDEX VALIDATION
// =================================================================

print("\n🔍 SPECIALIZED INDEX VALIDATION");
print("-".repeat(30));

// Text indexes
const textIndexes = db.courses
  .getIndexes()
  .filter((idx) => Object.values(idx.key || {}).includes("text"));
validator.assert(
  textIndexes.length > 0,
  "Text indexes exist for search functionality"
);

// Geospatial indexes
const geoIndexes = db.users
  .getIndexes()
  .filter((idx) => Object.values(idx.key || {}).includes("2dsphere"));
validator.assert(
  geoIndexes.length > 0,
  "Geospatial indexes exist for location queries"
);

// TTL indexes
const ttlIndexes = db.user_sessions
  .getIndexes()
  .filter((idx) => idx.hasOwnProperty("expireAfterSeconds"));
validator.assert(
  ttlIndexes.length > 0,
  "TTL indexes exist for automatic cleanup"
);

// Partial indexes
const partialIndexes = db.users
  .getIndexes()
  .filter((idx) => idx.hasOwnProperty("partialFilterExpression"));
validator.assert(
  partialIndexes.length > 0,
  "Partial indexes exist for selective indexing"
);

// Sparse indexes
const sparseIndexes = db.users
  .getIndexes()
  .filter((idx) => idx.sparse === true);
validator.assert(
  sparseIndexes.length > 0,
  "Sparse indexes exist for optional fields"
);

// =================================================================
// INDEX USAGE VALIDATION
// =================================================================

print("\n🎯 INDEX USAGE VALIDATION");
print("-".repeat(30));

print("Validating index usage for common queries:");

// Test critical query patterns
const queryTests = [
  {
    collection: "users",
    query: { email: "admin@mongomasterpro.com" },
    expectedIndex: "email_1",
    description: "Email lookup uses unique index",
  },
  {
    collection: "users",
    query: { role: "student" },
    expectedIndex: "role_1",
    description: "Role filter uses role index",
  },
  {
    collection: "courses",
    query: { instructorId: ObjectId() },
    expectedIndex: "instructorId_1",
    description: "Instructor lookup uses reference index",
  },
  {
    collection: "users",
    query: { role: "student", isActive: true },
    expectedIndex: "role_1_isActive_1_createdAt_-1",
    description: "Compound query uses compound index",
  },
];

queryTests.forEach((test) => {
  // Skip if we don't have valid ObjectId for instructor test
  if (
    test.query.instructorId &&
    test.query.instructorId.toString() === new ObjectId().toString()
  ) {
    const instructor = db.users.findOne({ role: "instructor" });
    if (instructor) {
      test.query.instructorId = instructor._id;
    } else {
      validator.warn(test.description, "No instructor found for testing");
      return;
    }
  }

  validator.assertQueryUsesIndex(
    test.collection,
    test.query,
    test.expectedIndex,
    test.description
  );
});

// =================================================================
// QUERY PERFORMANCE VALIDATION
// =================================================================

print("\n⚡ QUERY PERFORMANCE VALIDATION");
print("-".repeat(30));

print("Validating query performance standards:");

// Performance benchmarks (in milliseconds)
const performanceTests = [
  {
    collection: "users",
    query: { email: "admin@mongomasterpro.com" },
    maxTime: 10,
    description: "Email lookup performance (<10ms)",
  },
  {
    collection: "users",
    query: { role: "student" },
    maxTime: 50,
    description: "Role filter performance (<50ms)",
  },
  {
    collection: "courses",
    query: { $text: { $search: "mongodb" } },
    maxTime: 100,
    description: "Text search performance (<100ms)",
  },
  {
    collection: "users",
    query: { role: "student", isActive: true },
    maxTime: 30,
    description: "Compound query performance (<30ms)",
  },
];

performanceTests.forEach((test) => {
  validator.assertQueryPerformance(
    test.collection,
    test.query,
    test.maxTime,
    test.description
  );
});

// =================================================================
// INDEX SELECTIVITY VALIDATION
// =================================================================

print("\n📊 INDEX SELECTIVITY VALIDATION");
print("-".repeat(30));

print("Validating index selectivity and efficiency:");

function validateSelectivity(collection, query, minSelectivity, testName) {
  const explain = db
    .getCollection(collection)
    .find(query)
    .explain("executionStats");
  const stats = explain.executionStats;

  const selectivity =
    stats.totalDocsReturned / Math.max(stats.totalDocsExamined, 1);
  const condition = selectivity >= minSelectivity;

  validator.assert(
    condition,
    testName,
    `Selectivity: ${(selectivity * 100).toFixed(2)}% (min: ${(
      minSelectivity * 100
    ).toFixed(2)}%)`
  );
}

// Test selectivity for various queries
validateSelectivity(
  "users",
  { email: "admin@mongomasterpro.com" },
  1.0,
  "Email query selectivity (100%)"
);
validateSelectivity(
  "users",
  { role: "admin" },
  0.01,
  "Admin role selectivity (≥1%)"
);
validateSelectivity(
  "users",
  { role: "student", isActive: true },
  0.1,
  "Active student selectivity (≥10%)"
);

// =================================================================
// INDEX SIZE AND OVERHEAD VALIDATION
// =================================================================

print("\n💾 INDEX SIZE AND OVERHEAD VALIDATION");
print("-".repeat(30));

print("Validating index sizes and overhead:");

function validateIndexOverhead(collectionName, maxOverheadPercent) {
  try {
    const stats = db
      .getCollection(collectionName)
      .stats({ indexDetails: true });

    if (!stats.indexSizes) {
      validator.warn(
        `Index size validation for ${collectionName}`,
        "Index size data not available"
      );
      return;
    }

    const dataSize = stats.size;
    const totalIndexSize = Object.values(stats.indexSizes).reduce(
      (sum, size) => sum + size,
      0
    );
    const overheadPercent = (totalIndexSize / dataSize) * 100;

    const condition = overheadPercent <= maxOverheadPercent;
    validator.assert(
      condition,
      `${collectionName} index overhead`,
      `${overheadPercent.toFixed(1)}% (max: ${maxOverheadPercent}%)`
    );

    // Individual index size validation
    Object.entries(stats.indexSizes).forEach(([indexName, size]) => {
      const sizeMB = size / (1024 * 1024);
      if (sizeMB > 100) {
        // Warn if any single index > 100MB
        validator.warn(
          `Large index detected: ${indexName}`,
          `${sizeMB.toFixed(2)} MB`
        );
      }
    });
  } catch (e) {
    validator.warn(
      `Index overhead validation for ${collectionName}`,
      e.message
    );
  }
}

validateIndexOverhead("users", 50); // Max 50% overhead
validateIndexOverhead("courses", 40); // Max 40% overhead
validateIndexOverhead("enrollments", 30); // Max 30% overhead

// =================================================================
// INDEX UNIQUENESS VALIDATION
// =================================================================

print("\n🔑 INDEX UNIQUENESS VALIDATION");
print("-".repeat(30));

print("Validating unique constraints:");

// Test unique constraint enforcement
try {
  // Try to insert duplicate email (should fail)
  db.users.insertOne({
    email: "admin@mongomasterpro.com", // Duplicate
    firstName: "Duplicate",
    lastName: "Test",
    role: "student",
  });
  validator.assert(
    false,
    "Email unique constraint enforcement",
    "Duplicate insert should fail"
  );
} catch (error) {
  validator.assert(
    error.code === 11000,
    "Email unique constraint enforcement",
    "Duplicate key error correctly thrown"
  );
}

// =================================================================
// TEXT INDEX VALIDATION
// =================================================================

print("\n📝 TEXT INDEX VALIDATION");
print("-".repeat(30));

print("Validating text search functionality:");

// Test text search works
const textSearchResult = db.courses.find({ $text: { $search: "mongodb" } });
validator.assert(textSearchResult.count() > 0, "Text search returns results");

// Test text search scoring
const scoredResults = db.courses
  .find(
    { $text: { $search: "mongodb database" } },
    { score: { $meta: "textScore" } }
  )
  .sort({ score: { $meta: "textScore" } })
  .limit(3)
  .toArray();

validator.assert(scoredResults.length > 0, "Text search with scoring works");

// Validate scoring is working (scores should be different)
if (scoredResults.length > 1) {
  const hasVariedScores = scoredResults.some(
    (doc, i) => i > 0 && doc.score !== scoredResults[0].score
  );
  validator.assert(
    hasVariedScores,
    "Text search scoring produces varied results"
  );
}

// =================================================================
// GEOSPATIAL INDEX VALIDATION
// =================================================================

print("\n🌍 GEOSPATIAL INDEX VALIDATION");
print("-".repeat(30));

print("Validating geospatial functionality:");

// Test geospatial query works
const geoQuery = db.users
  .find({
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [-74.006, 40.7128], // NYC
        },
        $maxDistance: 1609344, // 1000 miles in meters
      },
    },
  })
  .limit(5);

const geoResults = geoQuery.toArray();
validator.assert(
  geoResults.length > 0,
  "Geospatial near query returns results"
);

// =================================================================
// TTL INDEX VALIDATION
// =================================================================

print("\n⏰ TTL INDEX VALIDATION");
print("-".repeat(30));

print("Validating TTL index configuration:");

// Check TTL index exists and has correct expiry
const sessionIndexes = db.user_sessions.getIndexes();
const ttlIndex = sessionIndexes.find((idx) =>
  idx.hasOwnProperty("expireAfterSeconds")
);

if (ttlIndex) {
  validator.assert(true, "TTL index configured on sessions collection");
  validator.assert(
    ttlIndex.expireAfterSeconds > 0,
    "TTL index has valid expiry time",
    `Expires after ${ttlIndex.expireAfterSeconds} seconds`
  );
} else {
  validator.assert(false, "TTL index configuration", "TTL index not found");
}

// =================================================================
// INDEX COVERAGE VALIDATION
// =================================================================

print("\n🎯 INDEX COVERAGE VALIDATION");
print("-".repeat(30));

print("Validating covered queries:");

// Test covered query (query can be satisfied entirely by index)
function testCoveredQuery(collection, query, projection, testName) {
  const explain = db
    .getCollection(collection)
    .find(query, projection)
    .explain("executionStats");
  const stage = explain.executionStats.executionStages;

  // Covered query should be IXSCAN without FETCH stage
  const isCovered =
    stage.stage === "PROJECTION" &&
    stage.inputStage &&
    stage.inputStage.stage === "IXSCAN";

  validator.assert(isCovered, testName, `Stage: ${stage.stage}`);
}

testCoveredQuery(
  "users",
  { role: "student" },
  { role: 1, _id: 0 },
  "Role query is covered"
);
testCoveredQuery(
  "users",
  { email: "admin@mongomasterpro.com" },
  { email: 1, _id: 0 },
  "Email query is covered"
);

// =================================================================
// COMPREHENSIVE INDEX HEALTH CHECK
// =================================================================

print("\n🏥 COMPREHENSIVE INDEX HEALTH CHECK");
print("-".repeat(30));

function performIndexHealthCheck(collectionName) {
  print(`\nHealth check for ${collectionName}:`);

  const collection = db.getCollection(collectionName);
  const indexes = collection.getIndexes();
  const stats = collection.stats();

  // Check index count
  validator.assert(
    indexes.length >= 2,
    `${collectionName} has multiple indexes`,
    `Found ${indexes.length} indexes`
  );

  // Check for potentially problematic patterns
  indexes.forEach((index) => {
    // Check for overly complex compound indexes
    const keyCount = Object.keys(index.key).length;
    if (keyCount > 5) {
      validator.warn(
        `Complex compound index in ${collectionName}`,
        `${index.name} has ${keyCount} keys`
      );
    }

    // Check for duplicate functionality
    const keySignature = JSON.stringify(index.key);
    const duplicates = indexes.filter(
      (idx) => JSON.stringify(idx.key) === keySignature
    );
    if (duplicates.length > 1) {
      validator.warn(
        `Potential duplicate indexes in ${collectionName}`,
        `${index.name} may be redundant`
      );
    }
  });

  // Document count vs index efficiency
  const docCount = collection.countDocuments();
  if (docCount > 10000 && indexes.length < 3) {
    validator.warn(
      `${collectionName} may need more indexes`,
      `${docCount} documents with only ${indexes.length} indexes`
    );
  }
}

["users", "courses", "enrollments"].forEach(performIndexHealthCheck);

// =================================================================
// CLEANUP AND FINAL REPORT
// =================================================================

print("\n🧹 CLEANUP");
print("-".repeat(30));

// No cleanup needed for validation - we only read data

// Generate final validation report
const success = validator.generateReport();

print("\n📊 INDEX VALIDATION SUMMARY");
print("-".repeat(30));

print("✓ Basic index existence checks");
print("✓ Specialized index validation (text, geo, TTL, partial, sparse)");
print("✓ Index usage verification");
print("✓ Query performance validation");
print("✓ Index selectivity analysis");
print("✓ Index overhead monitoring");
print("✓ Unique constraint testing");
print("✓ Covered query validation");
print("✓ Comprehensive health checks");

if (success) {
  print("\n✅ INDEX VALIDATION COMPLETED SUCCESSFULLY!");
  print("All MongoDB indexes are properly configured and performing well.");
  print("Ready to proceed to 03_schema_design/ module.");
} else {
  print("\n❌ Some index validations failed!");
  print("Please review and optimize the failing indexes before proceeding.");
}

print("\nNext steps:");
print("1. Review any failed validations above");
print("2. Optimize problematic indexes if needed");
print("3. Run patterns_guide.md and embedded_models.js in 03_schema_design/");
print("4. Continue with schema design patterns");
