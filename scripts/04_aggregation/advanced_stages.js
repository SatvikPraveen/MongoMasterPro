// File: scripts/04_aggregation/advanced_stages.js
// Advanced aggregation stages: $lookup, $unwind, $facet, $bucket

use("learning_platform");

print("MongoDB Aggregation: Advanced Stages");
print("=" * 50);

// =================================================================
// $LOOKUP STAGE - JOINS AND RELATIONSHIPS
// =================================================================

print("\n🔗 $LOOKUP STAGE - JOINS AND RELATIONSHIPS");
print("-" * 30);

// 1. Basic $lookup - Left outer join
print("1. Basic $lookup operations");

const usersWithEnrollments = db.users
  .aggregate([
    { $match: { role: "student" } },
    {
      $lookup: {
        from: "enrollments",
        localField: "_id",
        foreignField: "studentId",
        as: "enrollments",
      },
    },
    {
      $project: {
        name: { $concat: ["$firstName", " ", "$lastName"] },
        email: 1,
        enrollmentCount: { $size: "$enrollments" },
        enrollments: { $slice: ["$enrollments", 3] },
      },
    },
    { $sort: { enrollmentCount: -1 } },
    { $limit: 5 },
  ])
  .toArray();

print(`✓ Students with enrollments:`);
usersWithEnrollments.forEach((user, i) => {
  print(`  ${i + 1}. ${user.name}: ${user.enrollmentCount} enrollments`);
});

// 2. Complex $lookup with pipeline
print("\n2. $lookup with aggregation pipeline");

const coursesWithActiveStudents = db.courses
  .aggregate([
    { $match: { status: "active" } },
    {
      $lookup: {
        from: "enrollments",
        let: { courseId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$courseId", "$$courseId"] },
                  { $eq: ["$status", "enrolled"] },
                ],
              },
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "studentId",
              foreignField: "_id",
              as: "student",
            },
          },
          { $unwind: "$student" },
          {
            $project: {
              studentName: {
                $concat: ["$student.firstName", " ", "$student.lastName"],
              },
              progress: 1,
              enrolledAt: 1,
            },
          },
        ],
        as: "activeEnrollments",
      },
    },
    {
      $project: {
        title: 1,
        difficulty: 1,
        maxStudents: 1,
        currentEnrollments: { $size: "$activeEnrollments" },
        students: "$activeEnrollments",
        enrollmentRate: {
          $multiply: [
            { $divide: [{ $size: "$activeEnrollments" }, "$maxStudents"] },
            100,
          ],
        },
      },
    },
    { $sort: { currentEnrollments: -1 } },
    { $limit: 3 },
  ])
  .toArray();

print(`✓ Courses with active student details:`);
coursesWithActiveStudents.forEach((course, i) => {
  print(
    `  ${i + 1}. ${course.title}: ${course.currentEnrollments}/${
      course.maxStudents
    } students (${Math.round(course.enrollmentRate)}% full)`
  );
});

// 3. Multiple $lookup stages
const instructorCourseDetails = db.users
  .aggregate([
    { $match: { role: "instructor" } },
    {
      $lookup: {
        from: "courses",
        localField: "_id",
        foreignField: "instructorId",
        as: "courses",
      },
    },
    {
      $lookup: {
        from: "enrollments",
        let: { instructorCourses: "$courses._id" },
        pipeline: [
          {
            $match: {
              $expr: { $in: ["$courseId", "$$instructorCourses"] },
            },
          },
          { $group: { _id: "$courseId", enrollmentCount: { $sum: 1 } } },
        ],
        as: "enrollmentStats",
      },
    },
    {
      $project: {
        name: { $concat: ["$firstName", " ", "$lastName"] },
        email: 1,
        totalCourses: { $size: "$courses" },
        totalEnrollments: { $sum: "$enrollmentStats.enrollmentCount" },
        avgEnrollmentsPerCourse: {
          $cond: {
            if: { $gt: [{ $size: "$courses" }, 0] },
            then: {
              $divide: [
                { $sum: "$enrollmentStats.enrollmentCount" },
                { $size: "$courses" },
              ],
            },
            else: 0,
          },
        },
      },
    },
    { $sort: { totalEnrollments: -1 } },
    { $limit: 3 },
  ])
  .toArray();

print(`✓ Instructor course statistics:`);
instructorCourseDetails.forEach((instructor, i) => {
  print(
    `  ${i + 1}. ${instructor.name}: ${instructor.totalCourses} courses, ${
      instructor.totalEnrollments
    } total enrollments`
  );
});

// =================================================================
// $UNWIND STAGE - ARRAY DECONSTRUCTION
// =================================================================

print("\n📦 $UNWIND STAGE - ARRAY DECONSTRUCTION");
print("-" * 30);

// 4. Basic $unwind
print("4. Basic $unwind operations");

const userInterests = db.users
  .aggregate([
    { $match: { "profile.interests": { $exists: true, $ne: [] } } },
    { $unwind: "$profile.interests" },
    {
      $group: {
        _id: "$profile.interests",
        userCount: { $sum: 1 },
        users: {
          $push: {
            name: { $concat: ["$firstName", " ", "$lastName"] },
            role: "$role",
          },
        },
      },
    },
    { $sort: { userCount: -1 } },
    { $limit: 5 },
  ])
  .toArray();

print(`✓ Most popular interests:`);
userInterests.forEach((interest, i) => {
  print(`  ${i + 1}. ${interest._id}: ${interest.userCount} users interested`);
});

// 5. $unwind with preserveNullAndEmptyArrays
const allUsersInterests = db.users
  .aggregate([
    {
      $unwind: {
        path: "$profile.interests",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: {
          userId: "$_id",
          userName: { $concat: ["$firstName", " ", "$lastName"] },
        },
        interests: { $addToSet: "$profile.interests" },
        totalInterests: {
          $sum: { $cond: [{ $ne: ["$profile.interests", null] }, 1, 0] },
        },
      },
    },
    {
      $project: {
        userName: "$_id.userName",
        interests: {
          $filter: { input: "$interests", cond: { $ne: ["$$this", null] } },
        },
        totalInterests: 1,
      },
    },
    { $sort: { totalInterests: -1 } },
    { $limit: 5 },
  ])
  .toArray();

print(`✓ User interest analysis (including users with no interests):`);
allUsersInterests.forEach((user, i) => {
  print(`  ${i + 1}. ${user.userName}: ${user.totalInterests} interests`);
});

// 6. $unwind with includeArrayIndex
const courseTagsAnalysis = db.courses
  .aggregate([
    { $match: { tags: { $exists: true } } },
    {
      $unwind: {
        path: "$tags",
        includeArrayIndex: "tagPosition",
      },
    },
    {
      $group: {
        _id: "$tags",
        totalUsage: { $sum: 1 },
        avgPosition: { $avg: "$tagPosition" },
        courses: { $addToSet: "$title" },
      },
    },
    {
      $project: {
        totalUsage: 1,
        avgPosition: { $round: ["$avgPosition", 2] },
        courseCount: { $size: "$courses" },
      },
    },
    { $sort: { totalUsage: -1 } },
    { $limit: 8 },
  ])
  .toArray();

print(`✓ Course tags analysis with position:`);
courseTagsAnalysis.forEach((tag, i) => {
  print(
    `  ${i + 1}. ${tag._id}: ${tag.totalUsage} uses, avg position ${
      tag.avgPosition
    }`
  );
});

// =================================================================
// $FACET STAGE - MULTIPLE PIPELINES
// =================================================================

print("\n🎭 $FACET STAGE - MULTIPLE PIPELINES");
print("-" * 30);

// 7. $facet for multiple analyses
print("7. $facet for parallel aggregations");

const userAnalytics = db.users
  .aggregate([
    {
      $facet: {
        roleDistribution: [
          { $group: { _id: "$role", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        experienceBreakdown: [
          { $match: { "profile.experienceLevel": { $exists: true } } },
          { $group: { _id: "$profile.experienceLevel", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        registrationTrend: [
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
              },
              registrations: { $sum: 1 },
            },
          },
          { $sort: { "_id.year": -1, "_id.month": -1 } },
          { $limit: 6 },
        ],
        activeVsInactive: [
          { $group: { _id: "$isActive", count: { $sum: 1 } } },
        ],
      },
    },
  ])
  .toArray();

const analytics = userAnalytics[0];
print(`✓ User analytics facets:`);
print(`  Roles: ${analytics.roleDistribution.length} different roles`);
print(`  Experience levels: ${analytics.experienceBreakdown.length} levels`);
print(
  `  Registration trend: ${analytics.registrationTrend.length} months of data`
);
print(`  Active status: ${analytics.activeVsInactive.length} categories`);

// 8. $facet with $bucket
const courseAnalyticsFacets = db.courses
  .aggregate([
    {
      $facet: {
        difficultyBreakdown: [
          {
            $group: {
              _id: "$difficulty",
              count: { $sum: 1 },
              avgCapacity: { $avg: "$maxStudents" },
            },
          },
          { $sort: { count: -1 } },
        ],
        capacityBuckets: [
          {
            $bucket: {
              groupBy: "$maxStudents",
              boundaries: [0, 25, 50, 75, 100],
              default: "100+",
              output: {
                count: { $sum: 1 },
                courses: { $push: "$title" },
              },
            },
          },
        ],
        statusDistribution: [
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ],
      },
    },
  ])
  .toArray();

const courseAnalytics = courseAnalyticsFacets[0];
print(`✓ Course analytics facets:`);
print(
  `  Difficulty levels: ${courseAnalytics.difficultyBreakdown.length} categories`
);
print(`  Capacity buckets: ${courseAnalytics.capacityBuckets.length} ranges`);
print(`  Status types: ${courseAnalytics.statusDistribution.length} statuses`);

// =================================================================
// $BUCKET AND $BUCKETAUTO STAGES
// =================================================================

print("\n📊 $BUCKET AND $BUCKETAUTO STAGES");
print("-" * 30);

// 9. $bucket for custom grouping
print("9. $bucket operations");

const enrollmentProgressBuckets = db.enrollments
  .aggregate([
    {
      $bucket: {
        groupBy: "$progress",
        boundaries: [0, 25, 50, 75, 100],
        default: "Other",
        output: {
          count: { $sum: 1 },
          avgProgress: { $avg: "$progress" },
          students: { $addToSet: "$studentId" },
        },
      },
    },
    {
      $addFields: {
        uniqueStudents: { $size: "$students" },
        progressRange: {
          $switch: {
            branches: [
              { case: { $eq: ["$_id", 0] }, then: "0-24%" },
              { case: { $eq: ["$_id", 25] }, then: "25-49%" },
              { case: { $eq: ["$_id", 50] }, then: "50-74%" },
              { case: { $eq: ["$_id", 75] }, then: "75-99%" },
              { case: { $eq: ["$_id", 100] }, then: "100%" },
            ],
            default: "$_id",
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ])
  .toArray();

print(`✓ Enrollment progress distribution:`);
enrollmentProgressBuckets.forEach((bucket, i) => {
  print(
    `  ${i + 1}. ${bucket.progressRange}: ${bucket.count} enrollments, ${
      bucket.uniqueStudents
    } unique students`
  );
});

// 10. $bucketAuto for automatic bucketing
const userAgeBuckets = db.users
  .aggregate([
    {
      $addFields: {
        accountAgeInDays: {
          $divide: [
            { $subtract: [new Date(), "$createdAt"] },
            1000 * 60 * 60 * 24,
          ],
        },
      },
    },
    {
      $bucketAuto: {
        groupBy: "$accountAgeInDays",
        buckets: 4,
        output: {
          count: { $sum: 1 },
          avgAge: { $avg: "$accountAgeInDays" },
          minAge: { $min: "$accountAgeInDays" },
          maxAge: { $max: "$accountAgeInDays" },
          roles: { $addToSet: "$role" },
        },
      },
    },
  ])
  .toArray();

print(`✓ User account age buckets (auto-distributed):`);
userAgeBuckets.forEach((bucket, i) => {
  print(
    `  ${i + 1}. ${Math.round(bucket.minAge)}-${Math.round(
      bucket.maxAge
    )} days: ${bucket.count} users`
  );
});

// =================================================================
// $GRAPHLOOKUP STAGE - HIERARCHICAL DATA
// =================================================================

print("\n🌳 $GRAPHLOOKUP STAGE - HIERARCHICAL DATA");
print("-" * 30);

// 11. Create hierarchical test data
db.categories.deleteMany({});
const categories = [
  { _id: "tech", name: "Technology", parentId: null },
  { _id: "prog", name: "Programming", parentId: "tech" },
  { _id: "db", name: "Databases", parentId: "tech" },
  { _id: "web", name: "Web Development", parentId: "prog" },
  { _id: "mobile", name: "Mobile Development", parentId: "prog" },
  { _id: "sql", name: "SQL", parentId: "db" },
  { _id: "nosql", name: "NoSQL", parentId: "db" },
  { _id: "mongodb", name: "MongoDB", parentId: "nosql" },
  { _id: "frontend", name: "Frontend", parentId: "web" },
  { _id: "backend", name: "Backend", parentId: "web" },
];

db.categories.insertMany(categories);

// $graphLookup to find all descendants
const categoryHierarchy = db.categories
  .aggregate([
    { $match: { _id: "tech" } },
    {
      $graphLookup: {
        from: "categories",
        startWith: "$_id",
        connectFromField: "_id",
        connectToField: "parentId",
        as: "descendants",
        depthField: "level",
      },
    },
    {
      $project: {
        name: 1,
        totalDescendants: { $size: "$descendants" },
        maxDepth: { $max: "$descendants.level" },
        descendantsByLevel: {
          $map: {
            input: [0, 1, 2, 3],
            as: "level",
            in: {
              level: "$$level",
              count: {
                $size: {
                  $filter: {
                    input: "$descendants",
                    cond: { $eq: ["$$this.level", "$$level"] },
                  },
                },
              },
            },
          },
        },
      },
    },
  ])
  .toArray();

print(`✓ Technology category hierarchy:`);
const hierarchy = categoryHierarchy[0];
print(`  Root: ${hierarchy.name}`);
print(`  Total descendants: ${hierarchy.totalDescendants}`);
print(`  Max depth: ${hierarchy.maxDepth}`);

// =================================================================
// $ADDFIELDS AND $REPLACEROOT STAGES
// =================================================================

print("\n⚡ $ADDFIELDS AND $REPLACEROOT STAGES");
print("-" * 30);

// 12. $addFields for computed fields
const enrichedUsers = db.users
  .aggregate([
    { $match: { role: "student" } },
    {
      $addFields: {
        fullName: { $concat: ["$firstName", " ", "$lastName"] },
        accountAgeInDays: {
          $round: {
            $divide: [
              { $subtract: [new Date(), "$createdAt"] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
        hasProfile: { $ne: ["$profile", null] },
        interestCount: { $size: { $ifNull: ["$profile.interests", []] } },
        activityScore: {
          $add: [
            { $cond: [{ $eq: ["$isActive", true] }, 10, 0] },
            { $cond: [{ $ne: ["$profile", null] }, 5, 0] },
            {
              $multiply: [
                { $size: { $ifNull: ["$profile.interests", []] } },
                2,
              ],
            },
          ],
        },
      },
    },
    {
      $project: {
        fullName: 1,
        email: 1,
        accountAgeInDays: 1,
        activityScore: 1,
        category: {
          $switch: {
            branches: [
              { case: { $gte: ["$activityScore", 15] }, then: "Highly Active" },
              { case: { $gte: ["$activityScore", 10] }, then: "Active" },
              { case: { $gte: ["$activityScore", 5] }, then: "Moderate" },
            ],
            default: "Low Activity",
          },
        },
      },
    },
    { $sort: { activityScore: -1 } },
    { $limit: 5 },
  ])
  .toArray();

print(`✓ Enriched user data with computed fields:`);
enrichedUsers.forEach((user, i) => {
  print(
    `  ${i + 1}. ${user.fullName}: ${user.activityScore} points (${
      user.category
    })`
  );
});

// 13. $replaceRoot for document restructuring
const userProfiles = db.users
  .aggregate([
    { $match: { profile: { $exists: true } } },
    {
      $addFields: {
        "profile.userName": { $concat: ["$firstName", " ", "$lastName"] },
        "profile.userEmail": "$email",
        "profile.joinDate": "$createdAt",
      },
    },
    { $replaceRoot: { newRoot: "$profile" } },
    { $limit: 3 },
  ])
  .toArray();

print(`✓ User profiles as root documents:`);
userProfiles.forEach((profile, i) => {
  print(
    `  ${i + 1}. ${profile.userName}: ${
      profile.experienceLevel || "Not specified"
    } level`
  );
});

// =================================================================
// PERFORMANCE OPTIMIZATION
// =================================================================

print("\n⚡ PERFORMANCE OPTIMIZATION");
print("-" * 30);

print("Advanced stage performance tips:");
print("• Place $match before $lookup when possible");
print("• Use pipeline in $lookup to filter joined data early");
print("• $unwind can multiply document count - use $match after carefully");
print("• $facet runs sub-pipelines in parallel");
print("• $bucket is more efficient than $group for range queries");
print("• $graphLookup can be memory-intensive on large hierarchies");

// Test performance impact
const performanceTest = {
  withEarlyMatch: 0,
  withoutEarlyMatch: 0,
};

// With early match (optimized)
const start1 = Date.now();
db.users
  .aggregate([
    { $match: { role: "student" } }, // Early filtering
    {
      $lookup: {
        from: "enrollments",
        localField: "_id",
        foreignField: "studentId",
        as: "enrollments",
      },
    },
    { $limit: 10 },
  ])
  .toArray();
performanceTest.withEarlyMatch = Date.now() - start1;

// Without early match (less optimized)
const start2 = Date.now();
db.users
  .aggregate([
    {
      $lookup: {
        from: "enrollments",
        localField: "_id",
        foreignField: "studentId",
        as: "enrollments",
      },
    },
    { $match: { role: "student" } }, // Late filtering
    { $limit: 10 },
  ])
  .toArray();
performanceTest.withoutEarlyMatch = Date.now() - start2;

print(`✓ Performance comparison:`);
print(`  With early $match: ${performanceTest.withEarlyMatch}ms`);
print(`  Without early $match: ${performanceTest.withoutEarlyMatch}ms`);

// =================================================================
// CLEANUP AND SUMMARY
// =================================================================

print("\n🧹 CLEANUP");
print("-" * 30);

db.categories.drop();
print("✓ Cleaned up test hierarchy data");

print("\n📊 ADVANCED STAGES SUMMARY");
print("-" * 30);

const stagesSummary = {
  stagesDemo: [
    "$lookup",
    "$unwind",
    "$facet",
    "$bucket",
    "$bucketAuto",
    "$graphLookup",
    "$addFields",
    "$replaceRoot",
  ],
  totalPipelines: 13,
  keyFeatures: [
    "Joins",
    "Array deconstruction",
    "Parallel processing",
    "Bucketing",
    "Hierarchical traversal",
    "Field computation",
  ],
};

print("Advanced stages demonstrated:");
stagesSummary.stagesDemo.forEach((stage, i) => {
  print(`  ${i + 1}. ${stage}`);
});

print("\n🎯 Key Advanced Concepts Covered:");
print("• $lookup for joins and relationships");
print("• Complex $lookup with aggregation pipelines");
print("• $unwind for array deconstruction and analysis");
print("• $facet for parallel multi-dimensional analysis");
print("• $bucket and $bucketAuto for data categorization");
print("• $graphLookup for hierarchical data traversal");
print("• $addFields for computed field enrichment");
print("• $replaceRoot for document restructuring");
print("• Performance optimization techniques");
print("• Real-world analytics and reporting patterns");

print("\n✅ Advanced stages completed!");
print("Next: Run window_functions.js for advanced analytics operations");
