// File: scripts/02_indexes/index_fundamentals.js
// Single, compound, multikey indexes and fundamentals

use("learning_platform");

print("MongoDB Indexes: Fundamentals");
print("=" * 50);

// =================================================================
// INDEX BASICS AND THEORY
// =================================================================

print("\n📚 INDEX FUNDAMENTALS");
print("-" * 30);

print("Index Theory:");
print("• Indexes are data structures that improve query performance");
print("• They create shortcuts to find documents quickly");
print("• Trade-off: Faster reads, slower writes, more storage");
print("• MongoDB uses B-tree indexes by default");
print("• Every collection has a default _id index");

// Check existing indexes
print("\n🔍 Current Indexes on Users Collection:");
const existingIndexes = db.users.getIndexes();
existingIndexes.forEach((index, i) => {
  print(`${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
});

// =================================================================
// SINGLE FIELD INDEXES
// =================================================================

print("\n🔑 SINGLE FIELD INDEXES");
print("-" * 30);

// 1. Create basic single field indexes
print("1. Creating single field indexes");

// Email index (should already exist, but let's ensure)
try {
  db.users.createIndex({ email: 1 });
  print("✓ Email ascending index created");
} catch (e) {
  if (e.code === 85) {
    print("✓ Email index already exists");
  } else {
    print(`❌ Email index creation failed: ${e.message}`);
  }
}

// Role index for filtering
try {
  db.users.createIndex({ role: 1 });
  print("✓ Role ascending index created");
} catch (e) {
  print(`⚠ Role index: ${e.message}`);
}

// Creation date for sorting (descending for recent-first)
try {
  db.users.createIndex({ createdAt: -1 });
  print("✓ CreatedAt descending index created");
} catch (e) {
  print(`⚠ CreatedAt index: ${e.message}`);
}

// 2. Test single field index performance
print("\n2. Testing single field index performance");

// Query without index (simulate by dropping temporarily)
print("Query performance comparison:");

// Test email query (should use unique index)
let start = Date.now();
const emailQuery = db.users
  .find({ email: "admin@mongomasterpro.com" })
  .explain("executionStats");
let duration = Date.now() - start;

print(`✓ Email query: ${duration}ms`);
print(`  Documents examined: ${emailQuery.executionStats.totalDocsExamined}`);
print(`  Documents returned: ${emailQuery.executionStats.totalDocsReturned}`);
print(
  `  Index used: ${
    emailQuery.executionStats.executionStages.indexName || "Collection scan"
  }`
);

// Test role query
start = Date.now();
const roleQuery = db.users
  .find({ role: "student" })
  .limit(10)
  .explain("executionStats");
duration = Date.now() - start;

print(`✓ Role query: ${duration}ms`);
print(`  Documents examined: ${roleQuery.executionStats.totalDocsExamined}`);
print(`  Documents returned: ${roleQuery.executionStats.totalDocsReturned}`);
print(
  `  Index used: ${
    roleQuery.executionStats.executionStages.indexName || "Collection scan"
  }`
);

// =================================================================
// COMPOUND INDEXES
// =================================================================

print("\n🔗 COMPOUND INDEXES");
print("-" * 30);

print("3. Creating compound indexes");

// Compound index for role + status filtering and sorting
try {
  db.users.createIndex({ role: 1, isActive: 1, createdAt: -1 });
  print("✓ Compound index: role + isActive + createdAt created");
} catch (e) {
  print(`⚠ Compound index: ${e.message}`);
}

// Course compound index for instructors
try {
  db.courses.createIndex({ instructorId: 1, status: 1, difficulty: 1 });
  print("✓ Course compound index: instructorId + status + difficulty created");
} catch (e) {
  print(`⚠ Course compound index: ${e.message}`);
}

// Enrollment compound index
try {
  db.enrollments.createIndex({ studentId: 1, status: 1, enrolledAt: -1 });
  print("✓ Enrollment compound index: studentId + status + enrolledAt created");
} catch (e) {
  print(`⚠ Enrollment compound index: ${e.message}`);
}

// 4. Test compound index usage
print("\n4. Testing compound index effectiveness");

// Test queries that can use the compound index
const compoundQueries = [
  // Uses entire compound index
  { role: "student", isActive: true },
  // Uses prefix of compound index (role only)
  { role: "instructor" },
  // Uses prefix (role + isActive)
  { role: "student", isActive: true },
];

compoundQueries.forEach((query, i) => {
  const explain = db.users
    .find(query)
    .sort({ createdAt: -1 })
    .limit(5)
    .explain("executionStats");
  const indexUsed =
    explain.executionStats.executionStages.indexName || "Collection scan";

  print(`  Query ${i + 1}: ${JSON.stringify(query)}`);
  print(`    Index: ${indexUsed}`);
  print(`    Examined: ${explain.executionStats.totalDocsExamined}`);
});

// =================================================================
// MULTIKEY INDEXES
// =================================================================

print("\n🎯 MULTIKEY INDEXES");
print("-" * 30);

print("5. Creating indexes on array fields");

// Index on array fields (interests, tags, etc.)
try {
  db.users.createIndex({ "profile.interests": 1 });
  print("✓ Multikey index on profile.interests created");
} catch (e) {
  print(`⚠ Interests index: ${e.message}`);
}

try {
  db.courses.createIndex({ tags: 1 });
  print("✓ Multikey index on course tags created");
} catch (e) {
  print(`⚠ Tags index: ${e.message}`);
}

// Test multikey index queries
print("\n6. Testing multikey index queries");

// Query for users with specific interests
const interestQuery = db.users
  .find({ "profile.interests": "machine learning" })
  .explain("executionStats");
print(
  `✓ Interest query uses index: ${
    interestQuery.executionStats.executionStages.indexName || "No index"
  }`
);

// Query for courses with specific tags
const tagQuery = db.courses.find({ tags: "mongodb" }).explain("executionStats");
print(
  `✓ Tag query uses index: ${
    tagQuery.executionStats.executionStages.indexName || "No index"
  }`
);

// Multiple array values query ($in operator)
const multiTagQuery = db.courses
  .find({ tags: { $in: ["mongodb", "database", "nosql"] } })
  .explain("executionStats");
print(
  `✓ Multi-tag query examined ${multiTagQuery.executionStats.totalDocsExamined} documents`
);

// =================================================================
// NESTED DOCUMENT INDEXES
// =================================================================

print("\n🗂️  NESTED DOCUMENT INDEXES");
print("-" * 30);

print("7. Creating indexes on nested document fields");

// Index on nested profile fields
try {
  db.users.createIndex({ "profile.experienceLevel": 1 });
  print("✓ Index on profile.experienceLevel created");
} catch (e) {
  print(`⚠ Experience level index: ${e.message}`);
}

// Compound index with nested fields
try {
  db.users.createIndex({ role: 1, "profile.experienceLevel": 1, isActive: 1 });
  print("✓ Compound index with nested field created");
} catch (e) {
  print(`⚠ Nested compound index: ${e.message}`);
}

// Test nested field queries
const nestedQuery = db.users
  .find({
    role: "student",
    "profile.experienceLevel": "intermediate",
  })
  .explain("executionStats");

print(
  `✓ Nested field query uses index: ${
    nestedQuery.executionStats.executionStages.indexName || "No index"
  }`
);

// =================================================================
// INDEX PROPERTIES AND OPTIONS
// =================================================================

print("\n⚙️ INDEX PROPERTIES AND OPTIONS");
print("-" * 30);

print("8. Creating indexes with special properties");

// Unique index
try {
  db.users.createIndex({ email: 1 }, { unique: true });
  print("✓ Unique constraint on email enforced");
} catch (e) {
  if (e.code === 85) {
    print("✓ Unique email index already exists");
  } else {
    print(`⚠ Unique index: ${e.message}`);
  }
}

// Sparse index (only indexes documents that have the field)
try {
  db.users.createIndex({ "profile.linkedinUrl": 1 }, { sparse: true });
  print("✓ Sparse index on LinkedIn URL created");
} catch (e) {
  print(`⚠ Sparse index: ${e.message}`);
}

// Partial index (only indexes documents matching a condition)
try {
  db.users.createIndex(
    { lastLoginAt: -1 },
    {
      partialFilterExpression: {
        isActive: true,
        lastLoginAt: { $exists: true },
      },
    }
  );
  print("✓ Partial index on lastLoginAt for active users created");
} catch (e) {
  print(`⚠ Partial index: ${e.message}`);
}

// Case-insensitive index
try {
  db.users.createIndex(
    { firstName: 1, lastName: 1 },
    {
      collation: {
        locale: "en",
        strength: 2, // Case-insensitive
      },
    }
  );
  print("✓ Case-insensitive index on names created");
} catch (e) {
  print(`⚠ Case-insensitive index: ${e.message}`);
}

// =================================================================
// INDEX ANALYSIS AND OPTIMIZATION
// =================================================================

print("\n📊 INDEX ANALYSIS");
print("-" * 30);

print("9. Analyzing index usage and effectiveness");

// Get index statistics
function analyzeIndexStats(collection) {
  print(`\n📈 ${collection} Collection Index Stats:`);

  const indexes = db.getCollection(collection).getIndexes();

  indexes.forEach((index, i) => {
    print(`  ${i + 1}. ${index.name}:`);
    print(`     Keys: ${JSON.stringify(index.key)}`);
    print(`     Unique: ${index.unique || false}`);
    print(`     Sparse: ${index.sparse || false}`);
    print(`     Background: ${index.background || false}`);

    if (index.partialFilterExpression) {
      print(`     Partial: ${JSON.stringify(index.partialFilterExpression)}`);
    }
  });
}

analyzeIndexStats("users");
analyzeIndexStats("courses");
analyzeIndexStats("enrollments");

// =================================================================
// INDEX PERFORMANCE TESTING
// =================================================================

print("\n🚀 INDEX PERFORMANCE TESTING");
print("-" * 30);

print("10. Comprehensive performance testing");

// Create test data for performance analysis
function createTestData() {
  const testUsers = [];
  for (let i = 0; i < 1000; i++) {
    testUsers.push({
      email: `perftest${i}@example.com`,
      firstName: `FirstName${i}`,
      lastName: `LastName${i}`,
      role: i % 3 === 0 ? "instructor" : "student",
      isActive: i % 5 !== 0,
      profile: {
        experienceLevel: ["beginner", "intermediate", "advanced"][i % 3],
        interests: ["mongodb", "javascript", "python", "react"][i % 4],
      },
      createdAt: new Date(Date.now() - i * 60000), // Spread over time
      testData: true,
    });

    if (testUsers.length === 100) {
      db.users.insertMany([...testUsers], { ordered: false });
      testUsers.length = 0; // Clear array
    }
  }

  if (testUsers.length > 0) {
    db.users.insertMany(testUsers, { ordered: false });
  }

  print("✓ Created 1000 test documents for performance testing");
}

// Only create test data if not already present
const testDataCount = db.users.countDocuments({ testData: true });
if (testDataCount < 100) {
  createTestData();
}

// Performance test queries
const performanceTests = [
  {
    name: "Email lookup (unique index)",
    query: { email: "perftest500@example.com" },
  },
  {
    name: "Role filter (single field index)",
    query: { role: "student" },
  },
  {
    name: "Compound query (role + isActive)",
    query: { role: "student", isActive: true },
  },
  {
    name: "Range query with sort (createdAt index)",
    query: { createdAt: { $gte: new Date(Date.now() - 86400000) } }, // Last day
    sort: { createdAt: -1 },
  },
  {
    name: "Array query (multikey index)",
    query: { "profile.interests": "mongodb" },
  },
  {
    name: "Nested field query",
    query: { "profile.experienceLevel": "intermediate" },
  },
];

print("\nPerformance Test Results:");
performanceTests.forEach((test, i) => {
  const start = Date.now();

  let queryPlan;
  if (test.sort) {
    queryPlan = db.users
      .find(test.query)
      .sort(test.sort)
      .limit(10)
      .explain("executionStats");
  } else {
    queryPlan = db.users.find(test.query).limit(10).explain("executionStats");
  }

  const duration = Date.now() - start;
  const indexUsed =
    queryPlan.executionStats.executionStages.indexName ||
    queryPlan.executionStats.executionStages.inputStage?.indexName ||
    "Collection scan";

  print(`  ${i + 1}. ${test.name}:`);
  print(`     Duration: ${duration}ms`);
  print(`     Index: ${indexUsed}`);
  print(`     Examined: ${queryPlan.executionStats.totalDocsExamined}`);
  print(`     Returned: ${queryPlan.executionStats.totalDocsReturned}`);
});

// =================================================================
// INDEX MAINTENANCE
// =================================================================

print("\n🔧 INDEX MAINTENANCE");
print("-" * 30);

print("11. Index maintenance operations");

// List all indexes with sizes
function getIndexSizes(collection) {
  const stats = db.getCollection(collection).stats({ indexDetails: true });
  print(`\n📊 ${collection} Index Sizes:`);

  Object.keys(stats.indexSizes).forEach((indexName) => {
    const sizeBytes = stats.indexSizes[indexName];
    const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
    print(`  ${indexName}: ${sizeMB} MB`);
  });
}

getIndexSizes("users");
getIndexSizes("courses");

// Check for unused indexes (this would require actual query logs in production)
print("\n📋 Index Usage Recommendations:");
print("• Monitor query patterns with profiler");
print("• Remove unused indexes to improve write performance");
print("• Consider compound index order carefully");
print("• Use partial indexes for selective filtering");

// =================================================================
// CLEANUP AND VALIDATION
// =================================================================

print("\n🧹 CLEANUP AND VALIDATION");
print("-" * 30);

// Clean up test data
const cleanupResult = db.users.deleteMany({ testData: true });
print(`✓ Cleaned up ${cleanupResult.deletedCount} test documents`);

// Final index validation
print("\n✅ Index Validation:");
const finalIndexes = db.users.getIndexes();
print(`  Total indexes on users: ${finalIndexes.length}`);

const requiredIndexes = ["_id_", "email_1", "role_1", "createdAt_-1"];
requiredIndexes.forEach((indexName) => {
  const exists = finalIndexes.some((idx) => idx.name === indexName);
  print(`  ${indexName}: ${exists ? "✓" : "✗"}`);
});

print("\n🎯 Key Learnings:");
print("• Single field indexes for equality and range queries");
print("• Compound indexes for multi-field queries (order matters!)");
print("• Multikey indexes automatically handle arrays");
print("• Nested document fields can be indexed with dot notation");
print("• Index properties: unique, sparse, partial, case-insensitive");
print("• Always test index effectiveness with explain()");
print("• Monitor index sizes and usage patterns");
print("• Balance query performance vs write performance");

print("\n✅ Index fundamentals completed!");
print("Next: Run specialized_indexes.js for text, geo, and TTL indexes");
