// File: scripts/01_crud/validate_crud.js
// Comprehensive validation and assertions for CRUD operations

use("learning_platform");

print("MongoDB CRUD: Validation & Testing");
print("=" * 50);

// =================================================================
// VALIDATION FRAMEWORK
// =================================================================

class CRUDValidator {
  constructor() {
    this.testsPassed = 0;
    this.testsFailed = 0;
    this.testResults = [];
  }

  assert(condition, testName, details = "") {
    if (condition) {
      this.testsPassed++;
      this.testResults.push({
        status: "PASS",
        test: testName,
        details: details,
      });
      print(`✓ ${testName}`);
      if (details) print(`  ${details}`);
    } else {
      this.testsFailed++;
      this.testResults.push({
        status: "FAIL",
        test: testName,
        details: details,
      });
      print(`✗ ${testName}`);
      if (details) print(`  ${details}`);
    }
  }

  assertEqual(actual, expected, testName) {
    const condition = actual === expected;
    const details = condition
      ? `Expected: ${expected}, Got: ${actual}`
      : `MISMATCH - Expected: ${expected}, Got: ${actual}`;
    this.assert(condition, testName, details);
  }

  assertGreaterThan(actual, minimum, testName) {
    const condition = actual > minimum;
    const details = `Value: ${actual}, Minimum: ${minimum}`;
    this.assert(condition, testName, details);
  }

  assertExists(document, testName) {
    const condition = document !== null && document !== undefined;
    const details = condition ? "Document found" : "Document not found";
    this.assert(condition, testName, details);
  }

  generateReport() {
    const totalTests = this.testsPassed + this.testsFailed;
    const passRate =
      totalTests > 0 ? ((this.testsPassed / totalTests) * 100).toFixed(1) : 0;

    print("\n" + "=".repeat(60));
    print("CRUD VALIDATION REPORT");
    print("=".repeat(60));
    print(`Total Tests: ${totalTests}`);
    print(`Passed: ${this.testsPassed}`);
    print(`Failed: ${this.testsFailed}`);
    print(`Pass Rate: ${passRate}%`);

    if (this.testsFailed > 0) {
      print("\nFAILED TESTS:");
      this.testResults
        .filter((result) => result.status === "FAIL")
        .forEach((result) => {
          print(`• ${result.test}: ${result.details}`);
        });
    }

    print(
      this.testsFailed === 0
        ? "\n🎉 ALL CRUD TESTS PASSED!"
        : "\n⚠ SOME TESTS FAILED - Review and fix issues"
    );
    return this.testsFailed === 0;
  }
}

const validator = new CRUDValidator();

print("\n🧪 STARTING CRUD VALIDATION TESTS");
print("-".repeat(50));

// =================================================================
// INSERT OPERATIONS VALIDATION
// =================================================================

print("\n📝 INSERT OPERATIONS VALIDATION");
print("-".repeat(30));

// Test 1: insertOne validation
const testUser = {
  email: "validation.test@example.com",
  firstName: "Validation",
  lastName: "Test",
  role: "student",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

try {
  const insertResult = db.users.insertOne(testUser);
  validator.assert(insertResult.acknowledged, "insertOne acknowledged");
  validator.assertExists(
    insertResult.insertedId,
    "insertOne returns insertedId"
  );

  const insertedDoc = db.users.findOne({ _id: insertResult.insertedId });
  validator.assertExists(insertedDoc, "Inserted document can be retrieved");
  validator.assertEqual(
    insertedDoc.email,
    testUser.email,
    "Inserted email matches"
  );
} catch (error) {
  validator.assert(false, "insertOne operation", error.message);
}

// Test 2: insertMany validation
const testUsers = [
  {
    email: "bulk1@validation.com",
    firstName: "Bulk",
    lastName: "User1",
    role: "student",
    createdAt: new Date(),
  },
  {
    email: "bulk2@validation.com",
    firstName: "Bulk",
    lastName: "User2",
    role: "student",
    createdAt: new Date(),
  },
];

try {
  const insertManyResult = db.users.insertMany(testUsers);
  validator.assert(insertManyResult.acknowledged, "insertMany acknowledged");
  validator.assertEqual(
    Object.keys(insertManyResult.insertedIds).length,
    testUsers.length,
    "insertMany inserted correct count"
  );

  const insertedCount = db.users.countDocuments({
    email: { $in: testUsers.map((u) => u.email) },
  });
  validator.assertEqual(
    insertedCount,
    testUsers.length,
    "All inserted documents retrievable"
  );
} catch (error) {
  validator.assert(false, "insertMany operation", error.message);
}

// Test 3: Duplicate key handling
try {
  db.users.insertOne({
    email: "validation.test@example.com",
    firstName: "Duplicate",
    lastName: "Test",
    role: "student",
  });
  validator.assert(
    false,
    "Duplicate key should fail",
    "Expected duplicate key error"
  );
} catch (error) {
  validator.assertEqual(error.code, 11000, "Duplicate key error code");
}

// =================================================================
// UPDATE OPERATIONS VALIDATION
// =================================================================

print("\n📝 UPDATE OPERATIONS VALIDATION");
print("-".repeat(30));

// Test 4: updateOne validation
const updateResult = db.users.updateOne(
  { email: "validation.test@example.com" },
  {
    $set: { firstName: "Updated", updatedAt: new Date() },
    $inc: { "stats.updateCount": 1 },
  }
);

validator.assert(updateResult.acknowledged, "updateOne acknowledged");
validator.assertEqual(updateResult.matchedCount, 1, "updateOne matched count");
validator.assertEqual(
  updateResult.modifiedCount,
  1,
  "updateOne modified count"
);

const updatedDoc = db.users.findOne({ email: "validation.test@example.com" });
validator.assertEqual(
  updatedDoc.firstName,
  "Updated",
  "Update applied correctly"
);

// Test 5: updateMany validation
const updateManyResult = db.users.updateMany(
  { email: { $regex: /^bulk\d+@validation\.com$/ } },
  { $set: { "metadata.validated": true, updatedAt: new Date() } }
);

validator.assert(updateManyResult.acknowledged, "updateMany acknowledged");
validator.assertGreaterThan(
  updateManyResult.matchedCount,
  0,
  "updateMany matched documents"
);

// Test 6: Upsert validation
const upsertResult = db.users.updateOne(
  { email: "upsert.test@validation.com" },
  {
    $set: {
      firstName: "Upsert",
      lastName: "Test",
      role: "student",
      updatedAt: new Date(),
    },
    $setOnInsert: { createdAt: new Date() },
  },
  { upsert: true }
);

validator.assert(upsertResult.acknowledged, "Upsert acknowledged");
validator.assertExists(upsertResult.upsertedId, "Upsert created new document");

// =================================================================
// QUERY OPERATIONS VALIDATION
// =================================================================

print("\n📝 QUERY OPERATIONS VALIDATION");
print("-".repeat(30));

// Test 7: Basic find operations
const findResults = db.users.find({ role: "student" }).limit(5).toArray();
validator.assertGreaterThan(findResults.length, 0, "find returns results");

findResults.forEach((user, index) => {
  validator.assertEqual(user.role, "student", `User ${index} has correct role`);
  validator.assertExists(user._id, `User ${index} has _id`);
  validator.assertExists(user.email, `User ${index} has email`);
});

// Test 8: Query operators
const recentUsers = db.users.find({
  createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
});
const recentCount = recentUsers.count();
validator.assertGreaterThan(recentCount, 0, "Date comparison query works");

const activeStudents = db.users
  .find({ $and: [{ role: "student" }, { isActive: { $ne: false } }] })
  .count();
validator.assertGreaterThan(activeStudents, 0, "Logical AND query works");

// Test 9: Text search validation
try {
  const textSearchResults = db.courses.find({ $text: { $search: "mongodb" } });
  const textCount = textSearchResults.count();
  validator.assertGreaterThan(textCount, 0, "Text search returns results");
} catch (error) {
  validator.assert(false, "Text search operation", "Text index may be missing");
}

// =================================================================
// DELETE OPERATIONS VALIDATION
// =================================================================

print("\n📝 DELETE OPERATIONS VALIDATION");
print("-".repeat(30));

// Test 10: deleteOne validation
db.users.insertOne({
  email: "delete.test@validation.com",
  firstName: "Delete",
  lastName: "Test",
  role: "student",
  createdAt: new Date(),
});

const deleteResult = db.users.deleteOne({
  email: "delete.test@validation.com",
});
validator.assert(deleteResult.acknowledged, "deleteOne acknowledged");
validator.assertEqual(deleteResult.deletedCount, 1, "deleteOne deleted count");

const deletedDoc = db.users.findOne({ email: "delete.test@validation.com" });
validator.assert(deletedDoc === null, "Deleted document no longer exists");

// Test 11: deleteMany validation
const deleteTestDocs = [
  {
    email: "deletemany1@test.com",
    firstName: "DeleteMany",
    lastName: "Test1",
    role: "student",
  },
  {
    email: "deletemany2@test.com",
    firstName: "DeleteMany",
    lastName: "Test2",
    role: "student",
  },
];

db.users.insertMany(deleteTestDocs);

const deleteManyResult = db.users.deleteMany({
  email: { $regex: /^deletemany\d+@test\.com$/ },
});
validator.assert(deleteManyResult.acknowledged, "deleteMany acknowledged");
validator.assertEqual(
  deleteManyResult.deletedCount,
  deleteTestDocs.length,
  "deleteMany deleted correct count"
);

// =================================================================
// BULK OPERATIONS VALIDATION
// =================================================================

print("\n📝 BULK OPERATIONS VALIDATION");
print("-".repeat(30));

// Test 12: Bulk write validation
const bulkOps = [
  {
    insertOne: {
      document: {
        email: "bulk.insert@test.com",
        firstName: "Bulk",
        lastName: "Insert",
        role: "student",
        createdAt: new Date(),
      },
    },
  },
  {
    updateOne: {
      filter: { email: "bulk1@validation.com" },
      update: { $set: { "metadata.bulkTested": true } },
    },
  },
  { deleteOne: { filter: { email: "nonexistent@test.com" } } },
];

try {
  const bulkResult = db.users.bulkWrite(bulkOps, { ordered: false });
  validator.assert(bulkResult.acknowledged, "Bulk write acknowledged");
  validator.assertGreaterThan(
    bulkResult.insertedCount + bulkResult.modifiedCount,
    0,
    "Bulk operations executed"
  );
} catch (error) {
  validator.assert(false, "Bulk write operation", error.message);
}

// =================================================================
// DATA INTEGRITY VALIDATION
// =================================================================

print("\n📝 DATA INTEGRITY VALIDATION");
print("-".repeat(30));

// Test 13: Schema validation
try {
  db.users.insertOne({ firstName: "Invalid", lastName: "User" }); // Missing required email
  validator.assert(false, "Schema validation should prevent invalid documents");
} catch (error) {
  validator.assert(
    error.message.includes("validation"),
    "Schema validation working"
  );
}

// Test 14: Index usage validation
const explainResult = db.users
  .find({ email: "validation.test@example.com" })
  .explain("executionStats");
const indexUsed =
  explainResult.executionStats.executionStages.indexName ||
  explainResult.executionStats.executionStages.inputStage?.indexName;
validator.assertExists(indexUsed, "Query uses index for email field");

// Test 15: Referential integrity check
const sampleEnrollment = db.enrollments.findOne();
if (sampleEnrollment) {
  const studentExists = db.users.findOne({ _id: sampleEnrollment.studentId });
  const courseExists = db.courses.findOne({ _id: sampleEnrollment.courseId });
  validator.assertExists(studentExists, "Enrollment references valid student");
  validator.assertExists(courseExists, "Enrollment references valid course");
}

// =================================================================
// PERFORMANCE VALIDATION
// =================================================================

print("\n📝 PERFORMANCE VALIDATION");
print("-".repeat(30));

// Test 16: Query performance
const perfTestStart = Date.now();
const perfResults = db.users
  .find({ role: "student", isActive: true })
  .limit(100)
  .toArray();
const perfTestDuration = Date.now() - perfTestStart;

validator.assertGreaterThan(
  perfResults.length,
  0,
  "Performance test returned results"
);
validator.assert(
  perfTestDuration < 1000,
  "Query completed within 1 second",
  `Duration: ${perfTestDuration}ms`
);

// Test 17: Bulk operation performance
const bulkPerfStart = Date.now();
const bulkPerfOps = Array.from({ length: 10 }, (_, i) => ({
  insertOne: {
    document: {
      email: `perf${i}@test.com`,
      firstName: "Perf",
      lastName: `Test${i}`,
      role: "student",
      createdAt: new Date(),
    },
  },
}));

try {
  db.users.bulkWrite(bulkPerfOps);
  const bulkPerfDuration = Date.now() - bulkPerfStart;
  validator.assert(
    bulkPerfDuration < 2000,
    "Bulk operation completed within 2 seconds",
    `Duration: ${bulkPerfDuration}ms`
  );

  // Cleanup
  db.users.deleteMany({ email: { $regex: /^perf\d+@test\.com$/ } });
} catch (error) {
  validator.assert(false, "Bulk performance test", error.message);
}

// =================================================================
// CLEANUP AND REPORTING
// =================================================================

print("\n🧹 CLEANUP");
print("-".repeat(30));

// Clean up test data
const cleanupResult = db.users.deleteMany({
  email: { $regex: /(validation|bulk|upsert|delete)/ },
});
print(`✓ Cleaned up ${cleanupResult.deletedCount} test documents`);

// =================================================================
// FINAL VALIDATION REPORT
// =================================================================

print("\n📊 FINAL DATABASE STATE");
print("-".repeat(30));

const finalStats = {
  users: db.users.countDocuments(),
  courses: db.courses.countDocuments(),
  enrollments: db.enrollments.countDocuments(),
  assignments: db.assignments.countDocuments(),
  submissions: db.submissions.countDocuments(),
  grades: db.grades.countDocuments(),
};

print("Collection counts:");
Object.entries(finalStats).forEach(([collection, count]) => {
  print(`  ${collection}: ${count}`);
  validator.assertGreaterThan(
    count,
    0,
    `${collection} collection has documents`
  );
});

// Index validation
const userIndexes = db.users.getIndexes();
const courseIndexes = db.courses.getIndexes();
validator.assertGreaterThan(
  userIndexes.length,
  1,
  "Users collection has multiple indexes"
);
validator.assertGreaterThan(
  courseIndexes.length,
  1,
  "Courses collection has multiple indexes"
);

// Generate final report
const success = validator.generateReport();

print("\n🎯 CRUD OPERATIONS SUMMARY");
print("-".repeat(30));
print("✓ Insert operations (insertOne, insertMany)");
print("✓ Update operations (updateOne, updateMany, upserts)");
print("✓ Query operations (find, findOne, operators)");
print("✓ Delete operations (deleteOne, deleteMany)");
print("✓ Bulk operations (bulkWrite)");
print("✓ Schema validation");
print("✓ Index usage");
print("✓ Performance testing");
print("✓ Data integrity checks");

if (success) {
  print("\n✅ CRUD validation completed successfully!");
  print("All MongoDB CRUD operations are working correctly.");
  print("Ready to proceed to 02_indexes/ module.");
} else {
  print("\n❌ Some CRUD validations failed!");
  print("Please review and fix the issues before proceeding.");
}

print("\nNext steps:");
print("1. Review any failed tests above");
print("2. Run index_fundamentals.js in 02_indexes/");
print("3. Continue with the learning modules");
