// File: scripts/04_aggregation/pipeline_fundamentals.js
// Basic aggregation pipeline stages: match, group, sort, limit

use("learning_platform");

print("MongoDB Aggregation: Pipeline Fundamentals");
print("=" * 50);

// =================================================================
// AGGREGATION PIPELINE BASICS
// =================================================================

print("\n🔧 AGGREGATION PIPELINE BASICS");
print("-" * 30);

print("Pipeline Concept:");
print("• Pipelines process documents through stages sequentially");
print("• Each stage transforms documents and passes results to next stage");
print("• Order of stages matters for performance and results");
print("• Stages can filter, transform, group, sort, and limit data");

const userCount = db.users.countDocuments();
const courseCount = db.courses.countDocuments();
const enrollmentCount = db.enrollments.countDocuments();

print(
  `\nData availability: ${userCount} users, ${courseCount} courses, ${enrollmentCount} enrollments`
);

// =================================================================
// $MATCH STAGE - FILTERING
// =================================================================

print("\n🔍 $MATCH STAGE - FILTERING DOCUMENTS");
print("-" * 30);

// Basic match - equivalent to find()
const activeUsers = db.users
  .aggregate([{ $match: { isActive: true } }, { $limit: 5 }])
  .toArray();

print(`✓ Active users: ${activeUsers.length} found`);
activeUsers.slice(0, 3).forEach((user, i) => {
  print(`  ${i + 1}. ${user.firstName} ${user.lastName} (${user.role})`);
});

// Complex match with multiple conditions
const seniorStudents = db.users
  .aggregate([
    {
      $match: {
        role: "student",
        isActive: true,
        "profile.experienceLevel": { $in: ["intermediate", "advanced"] },
      },
    },
    { $limit: 3 },
  ])
  .toArray();

print(`✓ Senior students: ${seniorStudents.length} found`);

// Match with date ranges
const recentUsers = db.users
  .aggregate([
    {
      $match: {
        createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
    },
    { $count: "recentUsers" },
  ])
  .toArray();

print(`✓ Recent users (90 days): ${recentUsers[0]?.recentUsers || 0}`);

// =================================================================
// $PROJECT STAGE - FIELD SELECTION AND TRANSFORMATION
// =================================================================

print("\n📋 $PROJECT STAGE - FIELD SELECTION");
print("-" * 30);

// Basic projection
const userProfiles = db.users
  .aggregate([
    { $match: { role: "student" } },
    {
      $project: {
        fullName: { $concat: ["$firstName", " ", "$lastName"] },
        email: 1,
        role: 1,
        experienceLevel: "$profile.experienceLevel",
        _id: 0,
      },
    },
    { $limit: 5 },
  ])
  .toArray();

print(`✓ User profiles projected:`);
userProfiles.slice(0, 3).forEach((user, i) => {
  print(
    `  ${i + 1}. ${user.fullName} - ${user.experienceLevel || "Not specified"}`
  );
});

// Conditional projection
const userStatus = db.users
  .aggregate([
    { $match: { role: { $in: ["student", "instructor"] } } },
    {
      $project: {
        name: { $concat: ["$firstName", " ", "$lastName"] },
        role: 1,
        status: {
          $cond: {
            if: { $eq: ["$isActive", true] },
            then: "Active",
            else: "Inactive",
          },
        },
        accountAge: {
          $round: {
            $divide: [
              { $subtract: [new Date(), "$createdAt"] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      },
    },
    { $limit: 5 },
  ])
  .toArray();

print(`✓ User status with calculated fields:`);
userStatus.slice(0, 3).forEach((user, i) => {
  print(
    `  ${i + 1}. ${user.name} - ${user.status}, ${user.accountAge} days old`
  );
});

// =================================================================
// $GROUP STAGE - AGGREGATION AND GROUPING
// =================================================================

print("\n📊 $GROUP STAGE - AGGREGATION AND GROUPING");
print("-" * 30);

// Basic grouping by field
const usersByRole = db.users
  .aggregate([
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 },
        averageAccountAge: {
          $avg: {
            $divide: [
              { $subtract: [new Date(), "$createdAt"] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      },
    },
    { $sort: { count: -1 } },
  ])
  .toArray();

print(`✓ Users by role:`);
usersByRole.forEach((group, i) => {
  print(
    `  ${i + 1}. ${group._id}: ${group.count} users, avg ${Math.round(
      group.averageAccountAge
    )} days old`
  );
});

// Multiple field grouping
const experienceByRole = db.users
  .aggregate([
    { $match: { "profile.experienceLevel": { $exists: true } } },
    {
      $group: {
        _id: {
          role: "$role",
          experience: "$profile.experienceLevel",
        },
        count: { $sum: 1 },
        emails: { $push: "$email" },
      },
    },
    { $sort: { "_id.role": 1, "_id.experience": 1 } },
  ])
  .toArray();

print(`✓ Experience levels by role:`);
experienceByRole.slice(0, 5).forEach((group, i) => {
  print(
    `  ${i + 1}. ${group._id.role} (${group._id.experience}): ${
      group.count
    } users`
  );
});

// Group with various accumulator operators
const courseStats = db.courses
  .aggregate([
    { $match: { status: "active" } },
    {
      $group: {
        _id: "$difficulty",
        totalCourses: { $sum: 1 },
        maxStudents: { $max: "$maxStudents" },
        minStudents: { $min: "$maxStudents" },
        avgStudents: { $avg: "$maxStudents" },
        courseTitles: { $addToSet: "$title" },
        firstCourse: { $first: "$title" },
        lastCourse: { $last: "$title" },
      },
    },
    { $sort: { totalCourses: -1 } },
  ])
  .toArray();

print(`✓ Course statistics by difficulty:`);
courseStats.forEach((stat, i) => {
  print(
    `  ${i + 1}. ${stat._id}: ${
      stat.totalCourses
    } courses, avg capacity ${Math.round(stat.avgStudents)}`
  );
});

// =================================================================
// $SORT STAGE - ORDERING RESULTS
// =================================================================

print("\n📈 $SORT STAGE - ORDERING RESULTS");
print("-" * 30);

// Single field sort
const newestUsers = db.users
  .aggregate([
    { $match: { role: "student" } },
    { $sort: { createdAt: -1 } },
    {
      $project: {
        name: { $concat: ["$firstName", " ", "$lastName"] },
        email: 1,
        createdAt: 1,
      },
    },
    { $limit: 5 },
  ])
  .toArray();

print(`✓ Newest students:`);
newestUsers.slice(0, 3).forEach((user, i) => {
  const date = user.createdAt.toISOString().split("T")[0];
  print(`  ${i + 1}. ${user.name} - joined ${date}`);
});

// Multi-field sort
const sortedCourses = db.courses
  .aggregate([
    { $match: { status: "active" } },
    {
      $sort: {
        difficulty: 1,
        maxStudents: -1,
        title: 1,
      },
    },
    {
      $project: {
        title: 1,
        difficulty: 1,
        maxStudents: 1,
      },
    },
    { $limit: 8 },
  ])
  .toArray();

print(`✓ Courses sorted by difficulty, capacity, title:`);
sortedCourses.slice(0, 4).forEach((course, i) => {
  print(
    `  ${i + 1}. ${course.title} (${course.difficulty}, ${
      course.maxStudents
    } max)`
  );
});

// =================================================================
// $LIMIT AND $SKIP STAGES - PAGINATION
// =================================================================

print("\n📄 $LIMIT AND $SKIP STAGES - PAGINATION");
print("-" * 30);

// Basic pagination function
function getUsersPage(page, pageSize) {
  const skip = (page - 1) * pageSize;

  return db.users
    .aggregate([
      { $match: { isActive: true } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: pageSize },
      {
        $project: {
          name: { $concat: ["$firstName", " ", "$lastName"] },
          role: 1,
          email: 1,
        },
      },
    ])
    .toArray();
}

const page1 = getUsersPage(1, 3);
const page2 = getUsersPage(2, 3);

print(`✓ Page 1 (3 users):`);
page1.forEach((user, i) => {
  print(`  ${i + 1}. ${user.name} (${user.role})`);
});

print(`✓ Page 2 (3 users):`);
page2.forEach((user, i) => {
  print(`  ${i + 1}. ${user.name} (${user.role})`);
});

// =================================================================
// $COUNT STAGE - COUNTING DOCUMENTS
// =================================================================

print("\n🔢 $COUNT STAGE - COUNTING DOCUMENTS");
print("-" * 30);

// Count after filtering
const activeCourseCount = db.courses
  .aggregate([{ $match: { status: "active" } }, { $count: "activeCourses" }])
  .toArray();

print(`✓ Active courses: ${activeCourseCount[0]?.activeCourses || 0}`);

const roleDistribution = db.users
  .aggregate([
    { $group: { _id: "$role", count: { $sum: 1 } } },
    { $count: "uniqueRoles" },
  ])
  .toArray();

print(`✓ Unique roles: ${roleDistribution[0]?.uniqueRoles || 0}`);

// =================================================================
// COMBINING MULTIPLE STAGES
// =================================================================

print("\n🔗 COMBINING MULTIPLE STAGES");
print("-" * 30);

// Complex pipeline: Student course preferences analysis
const studentPreferences = db.users
  .aggregate([
    // Stage 1: Filter students only
    { $match: { role: "student", isActive: true } },

    // Stage 2: Add computed fields
    {
      $addFields: {
        fullName: { $concat: ["$firstName", " ", "$lastName"] },
        interestCount: { $size: { $ifNull: ["$profile.interests", []] } },
        hasPreferences: { $ne: ["$preferences", null] },
      },
    },

    // Stage 3: Group by experience level
    {
      $group: {
        _id: "$profile.experienceLevel",
        studentCount: { $sum: 1 },
        avgInterests: { $avg: "$interestCount" },
        withPreferences: { $sum: { $cond: ["$hasPreferences", 1, 0] } },
        sampleNames: { $push: "$fullName" },
      },
    },

    // Stage 4: Add computed percentage
    {
      $addFields: {
        preferencesPercentage: {
          $round: {
            $multiply: [
              { $divide: ["$withPreferences", "$studentCount"] },
              100,
            ],
          },
        },
      },
    },

    // Stage 5: Sort by student count
    { $sort: { studentCount: -1 } },

    // Stage 6: Limit sample names
    {
      $project: {
        studentCount: 1,
        avgInterests: { $round: ["$avgInterests", 1] },
        preferencesPercentage: 1,
        sampleNames: { $slice: ["$sampleNames", 3] },
      },
    },
  ])
  .toArray();

print(`✓ Student analysis by experience level:`);
studentPreferences.forEach((level, i) => {
  const levelName = level._id || "Not specified";
  print(
    `  ${i + 1}. ${levelName}: ${level.studentCount} students, ${
      level.avgInterests
    } avg interests, ${level.preferencesPercentage}% have preferences`
  );
});

// =================================================================
// PRACTICAL EXAMPLES
// =================================================================

print("\n🎯 PRACTICAL EXAMPLES");
print("-" * 30);

// Example 1: Course enrollment summary
const enrollmentSummary = db.enrollments
  .aggregate([
    { $match: { status: { $in: ["enrolled", "completed"] } } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        avgProgress: { $avg: "$progress" },
        students: { $addToSet: "$studentId" },
      },
    },
    {
      $addFields: {
        uniqueStudents: { $size: "$students" },
      },
    },
    {
      $project: {
        count: 1,
        avgProgress: { $round: ["$avgProgress", 1] },
        uniqueStudents: 1,
      },
    },
    { $sort: { count: -1 } },
  ])
  .toArray();

print(`✓ Enrollment summary:`);
enrollmentSummary.forEach((status, i) => {
  print(
    `  ${i + 1}. ${status._id}: ${status.count} enrollments, ${
      status.uniqueStudents
    } unique students, ${status.avgProgress}% avg progress`
  );
});

// Example 2: Monthly user registration trends
const monthlyRegistrations = db.users
  .aggregate([
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        registrations: { $sum: 1 },
        roles: { $addToSet: "$role" },
      },
    },
    {
      $addFields: {
        monthName: {
          $switch: {
            branches: [
              { case: { $eq: ["$_id.month", 1] }, then: "Jan" },
              { case: { $eq: ["$_id.month", 2] }, then: "Feb" },
              { case: { $eq: ["$_id.month", 3] }, then: "Mar" },
              { case: { $eq: ["$_id.month", 4] }, then: "Apr" },
              { case: { $eq: ["$_id.month", 5] }, then: "May" },
              { case: { $eq: ["$_id.month", 6] }, then: "Jun" },
              { case: { $eq: ["$_id.month", 7] }, then: "Jul" },
              { case: { $eq: ["$_id.month", 8] }, then: "Aug" },
              { case: { $eq: ["$_id.month", 9] }, then: "Sep" },
              { case: { $eq: ["$_id.month", 10] }, then: "Oct" },
              { case: { $eq: ["$_id.month", 11] }, then: "Nov" },
              { case: { $eq: ["$_id.month", 12] }, then: "Dec" },
            ],
            default: "Unknown",
          },
        },
      },
    },
    { $sort: { "_id.year": -1, "_id.month": -1 } },
    { $limit: 6 },
  ])
  .toArray();

print(`✓ Monthly registration trends (recent 6 months):`);
monthlyRegistrations.forEach((month, i) => {
  print(
    `  ${i + 1}. ${month.monthName} ${month._id.year}: ${
      month.registrations
    } users`
  );
});

// =================================================================
// PERFORMANCE CONSIDERATIONS
// =================================================================

print("\n⚡ PERFORMANCE CONSIDERATIONS");
print("-" * 30);

print("Pipeline Performance Tips:");
print("• Place $match stages early to reduce document flow");
print("• Use $limit after $sort when possible");
print("• $match and $sort can use indexes effectively");
print("• $group operations require memory - consider limits");
print("• Use $project to reduce field sizes in pipeline");

// Demonstrate early filtering impact
const performanceTest1Start = Date.now();
const earlyFilter = db.users
  .aggregate([
    { $match: { isActive: true } }, // Filter early
    { $sort: { createdAt: -1 } },
    { $limit: 10 },
    {
      $project: {
        name: { $concat: ["$firstName", " ", "$lastName"] },
        role: 1,
      },
    },
  ])
  .toArray();
const earlyFilterTime = Date.now() - performanceTest1Start;

print(
  `✓ Early filtering performance: ${earlyFilterTime}ms for ${earlyFilter.length} results`
);

// =================================================================
// VALIDATION AND SUMMARY
// =================================================================

print("\n📊 PIPELINE FUNDAMENTALS SUMMARY");
print("-" * 30);

const pipelineStats = {
  totalUsers: userCount,
  totalCourses: courseCount,
  totalEnrollments: enrollmentCount,
  activeUsers: activeUsers.length,
  stagesDemo: [
    "$match",
    "$project",
    "$group",
    "$sort",
    "$limit",
    "$skip",
    "$count",
  ],
};

print("Demonstrated pipeline stages:");
pipelineStats.stagesDemo.forEach((stage, i) => {
  print(`  ${i + 1}. ${stage} - ${getStageDescription(stage)}`);
});

function getStageDescription(stage) {
  const descriptions = {
    $match: "Filters documents based on criteria",
    $project: "Reshapes documents, adds/removes fields",
    $group: "Groups documents and performs aggregations",
    $sort: "Orders documents by specified fields",
    $limit: "Restricts number of documents passed to next stage",
    $skip: "Skips specified number of documents",
    $count: "Counts documents in pipeline",
  };
  return descriptions[stage] || "Stage functionality";
}

print(
  `\nProcessed ${pipelineStats.totalUsers} users across ${pipelineStats.stagesDemo.length} different pipeline stages`
);

print("\n🎯 Key Aggregation Concepts Covered:");
print("• Sequential stage processing in pipelines");
print("• Document filtering with $match conditions");
print("• Field transformation and computed values with $project");
print("• Data grouping and accumulation with $group");
print("• Result ordering with single and multi-field $sort");
print("• Pagination using $skip and $limit");
print("• Document counting with $count");
print("• Complex multi-stage pipeline composition");
print("• Performance optimization through early filtering");
print("• Practical real-world aggregation examples");

print("\n✅ Pipeline fundamentals completed!");
print(
  "Next: Run advanced_stages.js for $lookup, $unwind, and $facet operations"
);
