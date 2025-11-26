// File: scripts/01_crud/queries_deletes.js
// Combined query/delete operations with MongoDB best practices

use("learning_platform");

print("MongoDB CRUD: Query & Delete Operations");
print("=" * 50);

// =================================================================
// BASIC QUERIES
// =================================================================

print("\n🔍 BASIC QUERY OPERATIONS");
print("-" * 30);

// 1. find() - Basic queries
print("1. Basic find operations");

// Find all active users
const activeUsers = db.users.find({ isActive: true }).limit(3);
print("✓ Active users (first 3):");
activeUsers.forEach((user) => {
  print(`  ${user.firstName} ${user.lastName} (${user.role})`);
});

// Find with projection
const userEmails = db.users
  .find({ role: "student" }, { email: 1, firstName: 1, lastName: 1, _id: 0 })
  .limit(5);

print("\n✓ Student emails (projection):");
userEmails.forEach((user) => {
  print(`  ${user.firstName} ${user.lastName}: ${user.email}`);
});

// 2. findOne() - Single document
print("\n2. Finding single documents with findOne()");

const instructor = db.users.findOne({ role: "instructor" });
if (instructor) {
  print(`✓ Found instructor: ${instructor.firstName} ${instructor.lastName}`);
  print(`  Email: ${instructor.email}`);
  print(`  Specializations: ${instructor.specializations || "Not specified"}`);
} else {
  print("✗ No instructor found");
}

// =================================================================
// QUERY OPERATORS
// =================================================================

print("\n🔍 QUERY OPERATORS");
print("-" * 30);

// 3. Comparison operators
print("3. Comparison operators ($gt, $lt, $in, $ne)");

// Users created in the last 30 days
const recentUsers = db.users
  .find({
    createdAt: {
      $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    },
  })
  .count();

print(`✓ Users created in last 30 days: ${recentUsers}`);

// Courses with specific difficulties
const advancedCourses = db.courses
  .find({
    difficulty: { $in: ["advanced", "expert"] },
  })
  .count();

print(`✓ Advanced/Expert courses: ${advancedCourses}`);

// Courses with enrollment capacity
const limitedCourses = db.courses.find({
  maxStudents: { $lt: 30 },
  status: { $ne: "archived" },
});

print("✓ Limited capacity courses (<30 students):");
limitedCourses.forEach((course) => {
  print(`  ${course.title}: ${course.maxStudents} max students`);
});

// 4. Logical operators
print("\n4. Logical operators ($and, $or, $not)");

// Complex query with $or
const flexibleCourses = db.courses
  .find({
    $or: [{ difficulty: "beginner" }, { maxStudents: { $gte: 50 } }],
    status: "active",
  })
  .count();

print(`✓ Beginner OR high-capacity active courses: ${flexibleCourses}`);

// Query with $and (explicit)
const specificCourses = db.courses
  .find({
    $and: [
      { status: "active" },
      { difficulty: "intermediate" },
      { maxStudents: { $gte: 25 } },
    ],
  })
  .count();

print(`✓ Active intermediate courses (≥25 students): ${specificCourses}`);

// =================================================================
// ELEMENT AND ARRAY QUERIES
// =================================================================

print("\n🔍 ELEMENT & ARRAY QUERIES");
print("-" * 30);

// 5. Element queries
print("5. Element existence and type queries");

// Users with profile information
const usersWithProfiles = db.users
  .find({
    "profile.experienceLevel": { $exists: true },
  })
  .count();

print(`✓ Users with experience level: ${usersWithProfiles}`);

// Users with specific data types
const usersWithArrayInterests = db.users
  .find({
    "profile.interests": { $type: "array" },
  })
  .count();

print(`✓ Users with interests array: ${usersWithArrayInterests}`);

// 6. Array queries
print("\n6. Array query operations");

// Users interested in specific topics
const aiInterestedUsers = db.users
  .find({
    "profile.interests": "machine learning",
  })
  .count();

print(`✓ Users interested in machine learning: ${aiInterestedUsers}`);

// Users with multiple interests (array contains all)
const multiInterestUsers = db.users
  .find({
    "profile.interests": {
      $all: ["web development", "database design"],
    },
  })
  .count();

print(
  `✓ Users interested in both web dev and DB design: ${multiInterestUsers}`
);

// Array size queries
const activeGoalUsers = db.users
  .find({
    "profile.goals": { $size: 3 },
  })
  .count();

print(`✓ Users with exactly 3 goals: ${activeGoalUsers}`);

// =================================================================
// TEXT AND REGEX QUERIES
// =================================================================

print("\n🔍 TEXT & REGEX QUERIES");
print("-" * 30);

// 7. Text search
print("7. Text search operations");

// Full-text search on courses
const mongoDbCourses = db.courses
  .find({
    $text: { $search: "mongodb database" },
  })
  .sort({ score: { $meta: "textScore" } })
  .limit(3);

print("✓ MongoDB-related courses (text search):");
mongoDbCourses.forEach((course) => {
  print(`  ${course.title}`);
});

// 8. Regular expressions
print("\n8. Regular expression queries");

// Find users with Gmail addresses
const gmailUsers = db.users
  .find({
    email: /gmail\.com$/i,
  })
  .count();

print(`✓ Gmail users: ${gmailUsers}`);

// Find courses with specific patterns in title
const fundamentalCourses = db.courses.find({
  title: /^MongoDB.*Fundamental/i,
});

print("✓ Fundamental MongoDB courses:");
fundamentalCourses.forEach((course) => {
  print(`  ${course.title}`);
});

// =================================================================
// ADVANCED QUERIES
// =================================================================

print("\n🔍 ADVANCED QUERY OPERATIONS");
print("-" * 30);

// 9. Nested document queries
print("9. Nested document and dot notation");

// Query nested profile data
const intermediateUsers = db.users.find({
  "profile.experienceLevel": "intermediate",
  "preferences.theme": "dark",
});

print("✓ Intermediate users preferring dark theme:");
intermediateUsers.forEach((user) => {
  print(`  ${user.firstName} ${user.lastName}`);
});

// 10. Cursor operations and sorting
print("\n10. Cursor operations, sorting, and pagination");

// Sorted and paginated results
const sortedCourses = db.courses
  .find({ status: "active" })
  .sort({ createdAt: -1, title: 1 })
  .skip(0)
  .limit(5);

print("✓ Recent active courses (sorted by creation date):");
sortedCourses.forEach((course, index) => {
  print(`  ${index + 1}. ${course.title} (${course.difficulty})`);
});

// Count vs find
const totalActiveCourses = db.courses.countDocuments({ status: "active" });
const estimatedCount = db.courses.estimatedDocumentCount();

print(`✓ Total active courses: ${totalActiveCourses}`);
print(`✓ Estimated total courses: ${estimatedCount}`);

// =================================================================
// DELETE OPERATIONS
// =================================================================

print("\n🗑️  DELETE OPERATIONS");
print("-" * 30);

// 11. deleteOne() - Remove single document
print("11. Deleting single documents with deleteOne()");

// First, create a test document to delete
db.users.insertOne({
  email: "test.delete@example.com",
  firstName: "Test",
  lastName: "Delete",
  role: "student",
  isActive: false,
  createdAt: new Date(),
});

const deleteOneResult = db.users.deleteOne({
  email: "test.delete@example.com",
});

print(`✓ DeleteOne - Deleted count: ${deleteOneResult.deletedCount}`);
print(`  Acknowledged: ${deleteOneResult.acknowledged}`);

// 12. deleteMany() - Remove multiple documents
print("\n12. Deleting multiple documents with deleteMany()");

// Create some test documents first
const testUsers = [
  {
    email: "temp1@test.com",
    firstName: "Temp",
    lastName: "User1",
    role: "student",
    isActive: false,
  },
  {
    email: "temp2@test.com",
    firstName: "Temp",
    lastName: "User2",
    role: "student",
    isActive: false,
  },
  {
    email: "temp3@test.com",
    firstName: "Temp",
    lastName: "User3",
    role: "student",
    isActive: false,
  },
];

db.users.insertMany(testUsers);

// Delete all inactive temp users
const deleteManyResult = db.users.deleteMany({
  email: /^temp\d+@test\.com$/,
  isActive: false,
});

print(`✓ DeleteMany - Deleted count: ${deleteManyResult.deletedCount}`);

// =================================================================
// SAFE DELETE OPERATIONS
// =================================================================

print("\n🗑️  SAFE DELETE OPERATIONS");
print("-" * 30);

// 13. Conditional deletes with verification
print("13. Safe delete operations with verification");

// Count before delete
const inactiveUsersBefore = db.users.countDocuments({
  isActive: false,
  createdAt: { $lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }, // 1 year old
});

print(`✓ Inactive users older than 1 year: ${inactiveUsersBefore}`);

// Safe delete with limit simulation
if (inactiveUsersBefore > 0 && inactiveUsersBefore < 100) {
  // Safety check
  const safeDeleteResult = db.users.deleteMany({
    isActive: false,
    createdAt: { $lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
    role: { $ne: "admin" }, // Never delete admins
  });

  print(`✓ Safely deleted ${safeDeleteResult.deletedCount} old inactive users`);
} else {
  print("⚠ Skipped bulk delete (safety check failed)");
}

// 14. Soft delete pattern
print("\n14. Soft delete pattern (recommended for production)");

// Instead of deleting, mark as deleted
const softDeleteResult = db.courses.updateMany(
  {
    status: "draft",
    createdAt: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }, // 90 days old
  },
  {
    $set: {
      isDeleted: true,
      deletedAt: new Date(),
      status: "deleted",
    },
  }
);

print(`✓ Soft deleted ${softDeleteResult.modifiedCount} old draft courses`);

// Query excluding soft-deleted documents
const activeCourses = db.courses
  .find({
    isDeleted: { $ne: true },
    status: "active",
  })
  .count();

print(`✓ Active courses (excluding soft-deleted): ${activeCourses}`);

// =================================================================
// BULK DELETE OPERATIONS
// =================================================================

print("\n🗑️  BULK DELETE OPERATIONS");
print("-" * 30);

// 15. Bulk write with deletes
print("15. Bulk operations including deletes");

// Create test data for bulk operations
const bulkTestData = [
  {
    email: "bulk1@test.com",
    firstName: "Bulk",
    lastName: "Test1",
    role: "student",
    isActive: true,
  },
  {
    email: "bulk2@test.com",
    firstName: "Bulk",
    lastName: "Test2",
    role: "student",
    isActive: true,
  },
  {
    email: "bulk3@test.com",
    firstName: "Bulk",
    lastName: "Test3",
    role: "student",
    isActive: false,
  },
];

db.users.insertMany(bulkTestData);

const bulkOperations = [
  {
    deleteOne: {
      filter: { email: "bulk1@test.com" },
    },
  },
  {
    deleteMany: {
      filter: {
        email: { $regex: /^bulk\d+@test\.com$/ },
        isActive: false,
      },
    },
  },
  {
    updateOne: {
      filter: { email: "bulk2@test.com" },
      update: { $set: { isActive: false, markedForDeletion: true } },
    },
  },
];

const bulkDeleteResult = db.users.bulkWrite(bulkOperations);

print("✓ Bulk operations completed:");
print(`  Deleted: ${bulkDeleteResult.deletedCount}`);
print(`  Modified: ${bulkDeleteResult.modifiedCount}`);

// =================================================================
// QUERY PERFORMANCE AND OPTIMIZATION
// =================================================================

print("\n🚀 QUERY PERFORMANCE & OPTIMIZATION");
print("-" * 30);

// 16. Query performance analysis
print("16. Query performance with explain()");

// Simple query explain
const explainResult = db.users
  .find({ role: "student" })
  .explain("executionStats");

print("✓ Query execution stats:");
print(
  `  Execution time: ${explainResult.executionStats.executionTimeMillis}ms`
);
print(
  `  Documents examined: ${explainResult.executionStats.totalDocsExamined}`
);
print(
  `  Documents returned: ${explainResult.executionStats.totalDocsReturned}`
);
print(
  `  Index used: ${
    explainResult.executionStats.executionStages.indexName || "Collection scan"
  }`
);

// Complex query with index hint
const hintedQuery = db.users
  .find({
    role: "student",
    isActive: true,
  })
  .hint({ role: 1 });

print(`✓ Query with index hint completed`);

// =================================================================
// AGGREGATION PREVIEW
// =================================================================

print("\n📊 AGGREGATION PREVIEW");
print("-" * 30);

// 17. Simple aggregation pipeline
print("17. Simple aggregation for counting and grouping");

const roleStats = db.users.aggregate([
  { $match: { isActive: true } },
  {
    $group: {
      _id: "$role",
      count: { $sum: 1 },
      avgCreationDate: { $avg: "$createdAt" },
    },
  },
  { $sort: { count: -1 } },
]);

print("✓ Active users by role:");
roleStats.forEach((stat) => {
  print(`  ${stat._id}: ${stat.count} users`);
});

// =================================================================
// VALIDATION AND SUMMARY
// =================================================================

print("\n🔍 VALIDATION & SUMMARY");
print("-" * 30);

// Final statistics
const finalStats = {
  totalUsers: db.users.countDocuments(),
  activeUsers: db.users.countDocuments({ isActive: true }),
  totalCourses: db.courses.countDocuments(),
  activeCourses: db.courses.countDocuments({ status: "active" }),
  totalEnrollments: db.enrollments.countDocuments(),
};

print("📊 Final Database Statistics:");
Object.entries(finalStats).forEach(([key, value]) => {
  print(`  ${key}: ${value}`);
});

print("\n🎯 Key Learnings:");
print("• find() and findOne() for document retrieval");
print("• Query operators: comparison, logical, element, array");
print("• Text search and regular expressions");
print("• Cursor operations: sort, skip, limit");
print("• deleteOne() and deleteMany() for removal");
print("• Soft delete pattern for production safety");
print("• Bulk operations for efficiency");
print("• Query performance with explain()");
print("• Basic aggregation pipelines");

print("\n✅ Query & Delete operations completed!");
print("Next: Run bulk_operations.js for advanced bulk patterns");
