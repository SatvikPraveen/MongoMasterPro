// File: tests/unit/data_quality_tests.js
// Data Quality Unit Tests for MongoMasterPro

const { MongoClient } = require("mongodb");
const assert = require("assert");
const { TestHelpers } = require("../utils/test_helpers");
const { AssertionLibrary } = require("../utils/assertion_library");

class DataQualityTests {
  constructor() {
    this.client = null;
    this.db = null;
    this.helpers = new TestHelpers();
    this.assertions = new AssertionLibrary();
  }

  async setup() {
    this.client = new MongoClient(
      process.env.MONGODB_URI || "mongodb://localhost:27017"
    );
    await this.client.connect();
    this.db = this.client.db("mongomasterpro_test");
    console.log("✓ Data Quality Tests - Setup complete");
  }

  async teardown() {
    if (this.client) {
      await this.client.close();
      console.log("✓ Data Quality Tests - Teardown complete");
    }
  }

  // Test 1: Email Format Validation
  async testEmailFormatValidation() {
    const collection = this.db.collection("users");

    // Insert test data with various email formats
    const testUsers = [
      { email: "valid@example.com", name: "Valid User" },
      { email: "invalid-email", name: "Invalid User 1" },
      { email: "no@domain", name: "Invalid User 2" },
      { email: "", name: "Empty Email" },
      { email: null, name: "Null Email" },
    ];

    await collection.insertMany(testUsers);

    // Query for valid emails using regex
    const validEmails = await collection
      .find({
        email: { $regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      })
      .toArray();

    // Query for invalid emails
    const invalidEmails = await collection
      .find({
        $or: [
          { email: { $not: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ } },
          { email: { $in: [null, ""] } },
        ],
      })
      .toArray();

    this.assertions.assertEqual(
      validEmails.length,
      1,
      "Should find exactly 1 valid email"
    );
    this.assertions.assertEqual(
      invalidEmails.length,
      4,
      "Should find 4 invalid emails"
    );

    console.log("✓ Email format validation test passed");
    return {
      validCount: validEmails.length,
      invalidCount: invalidEmails.length,
    };
  }

  // Test 2: Required Fields Validation
  async testRequiredFieldsValidation() {
    const collection = this.db.collection("courses");

    const testCourses = [
      {
        title: "Complete Course",
        description: "Full desc",
        price: 99.99,
        instructor: "John Doe",
      },
      {
        title: "Missing Price",
        description: "No price",
        instructor: "Jane Doe",
      },
      { description: "No Title", price: 49.99, instructor: "Bob Smith" },
      {
        title: "No Instructor",
        description: "Missing instructor",
        price: 79.99,
      },
      { title: "", description: "", price: null, instructor: null },
    ];

    await collection.insertMany(testCourses);

    // Find courses with all required fields
    const completeCourses = await collection
      .find({
        title: { $exists: true, $ne: "", $ne: null },
        description: { $exists: true, $ne: "", $ne: null },
        price: { $exists: true, $ne: null, $type: "number" },
        instructor: { $exists: true, $ne: "", $ne: null },
      })
      .toArray();

    // Find incomplete courses
    const incompleteCourses = await collection
      .find({
        $or: [
          { title: { $in: [null, ""] } },
          { description: { $in: [null, ""] } },
          { price: { $in: [null] } },
          { instructor: { $in: [null, ""] } },
          { title: { $exists: false } },
          { description: { $exists: false } },
          { price: { $exists: false } },
          { instructor: { $exists: false } },
        ],
      })
      .toArray();

    this.assertions.assertEqual(
      completeCourses.length,
      1,
      "Should find 1 complete course"
    );
    this.assertions.assertTrue(
      incompleteCourses.length >= 4,
      "Should find at least 4 incomplete courses"
    );

    console.log("✓ Required fields validation test passed");
    return {
      completeCount: completeCourses.length,
      incompleteCount: incompleteCourses.length,
    };
  }

  // Test 3: Data Type Consistency
  async testDataTypeConsistency() {
    const collection = this.db.collection("enrollments");

    const testEnrollments = [
      {
        userId: "user123",
        courseId: "course456",
        enrolledAt: new Date(),
        price: 99.99,
      },
      {
        userId: 123,
        courseId: "course789",
        enrolledAt: "2024-01-01",
        price: "49.99",
      },
      {
        userId: "user456",
        courseId: 789,
        enrolledAt: new Date(),
        price: 79.99,
      },
      { userId: null, courseId: null, enrolledAt: null, price: null },
    ];

    await collection.insertMany(testEnrollments);

    // Check string fields
    const stringUserIds = await collection
      .find({ userId: { $type: "string" } })
      .toArray();
    const stringCourseIds = await collection
      .find({ courseId: { $type: "string" } })
      .toArray();

    // Check date fields
    const dateFields = await collection
      .find({ enrolledAt: { $type: "date" } })
      .toArray();

    // Check number fields
    const numberPrices = await collection
      .find({ price: { $type: "number" } })
      .toArray();

    this.assertions.assertEqual(
      stringUserIds.length,
      2,
      "Should find 2 string userId fields"
    );
    this.assertions.assertEqual(
      stringCourseIds.length,
      2,
      "Should find 2 string courseId fields"
    );
    this.assertions.assertEqual(
      dateFields.length,
      2,
      "Should find 2 date fields"
    );
    this.assertions.assertEqual(
      numberPrices.length,
      2,
      "Should find 2 number price fields"
    );

    console.log("✓ Data type consistency test passed");
    return {
      stringUserIds: stringUserIds.length,
      stringCourseIds: stringCourseIds.length,
      dateFields: dateFields.length,
      numberPrices: numberPrices.length,
    };
  }

  // Test 4: Duplicate Detection
  async testDuplicateDetection() {
    const collection = this.db.collection("users");

    const duplicateUsers = [
      { email: "duplicate@example.com", name: "User One" },
      { email: "duplicate@example.com", name: "User Two" },
      { email: "unique@example.com", name: "Unique User" },
      { email: "another@example.com", name: "Another User" },
      { email: "another@example.com", name: "Duplicate Another" },
    ];

    await collection.insertMany(duplicateUsers);

    // Find duplicates using aggregation
    const duplicates = await collection
      .aggregate([
        {
          $group: {
            _id: "$email",
            count: { $sum: 1 },
            docs: { $push: "$$ROOT" },
          },
        },
        { $match: { count: { $gt: 1 } } },
      ])
      .toArray();

    // Count total duplicate documents
    const totalDuplicateDocs = duplicates.reduce(
      (sum, dup) => sum + dup.count,
      0
    );

    this.assertions.assertEqual(
      duplicates.length,
      2,
      "Should find 2 duplicate email groups"
    );
    this.assertions.assertEqual(
      totalDuplicateDocs,
      4,
      "Should find 4 total duplicate documents"
    );

    console.log("✓ Duplicate detection test passed");
    return {
      duplicateGroups: duplicates.length,
      totalDuplicates: totalDuplicateDocs,
    };
  }

  // Test 5: Range Validation
  async testRangeValidation() {
    const collection = this.db.collection("courses");

    const testCourses = [
      { title: "Valid Course 1", price: 29.99, rating: 4.5 },
      { title: "Valid Course 2", price: 199.99, rating: 3.8 },
      { title: "Invalid Negative Price", price: -10.0, rating: 4.2 },
      { title: "Invalid High Price", price: 1000.0, rating: 4.8 },
      { title: "Invalid Rating", price: 79.99, rating: 6.0 },
      { title: "Invalid Low Rating", price: 49.99, rating: 0.5 },
    ];

    await collection.insertMany(testCourses);

    // Valid price range: $1 - $500
    const validPrices = await collection
      .find({
        price: { $gte: 1.0, $lte: 500.0 },
      })
      .toArray();

    // Valid rating range: 1.0 - 5.0
    const validRatings = await collection
      .find({
        rating: { $gte: 1.0, $lte: 5.0 },
      })
      .toArray();

    // Invalid ranges
    const invalidPrices = await collection
      .find({
        $or: [{ price: { $lt: 1.0 } }, { price: { $gt: 500.0 } }],
      })
      .toArray();

    const invalidRatings = await collection
      .find({
        $or: [{ rating: { $lt: 1.0 } }, { rating: { $gt: 5.0 } }],
      })
      .toArray();

    this.assertions.assertEqual(
      validPrices.length,
      4,
      "Should find 4 courses with valid prices"
    );
    this.assertions.assertEqual(
      validRatings.length,
      4,
      "Should find 4 courses with valid ratings"
    );
    this.assertions.assertEqual(
      invalidPrices.length,
      2,
      "Should find 2 courses with invalid prices"
    );
    this.assertions.assertEqual(
      invalidRatings.length,
      2,
      "Should find 2 courses with invalid ratings"
    );

    console.log("✓ Range validation test passed");
    return {
      validPrices: validPrices.length,
      validRatings: validRatings.length,
      invalidPrices: invalidPrices.length,
      invalidRatings: invalidRatings.length,
    };
  }

  // Test 6: Referential Integrity
  async testReferentialIntegrity() {
    const usersCollection = this.db.collection("users");
    const coursesCollection = this.db.collection("courses");
    const enrollmentsCollection = this.db.collection("enrollments");

    // Insert test data
    await usersCollection.insertMany([
      { _id: "user1", email: "user1@example.com", name: "User One" },
      { _id: "user2", email: "user2@example.com", name: "User Two" },
    ]);

    await coursesCollection.insertMany([
      { _id: "course1", title: "Course One", price: 99.99 },
      { _id: "course2", title: "Course Two", price: 149.99 },
    ]);

    await enrollmentsCollection.insertMany([
      { userId: "user1", courseId: "course1", enrolledAt: new Date() },
      { userId: "user2", courseId: "course1", enrolledAt: new Date() },
      { userId: "user1", courseId: "course2", enrolledAt: new Date() },
      {
        userId: "nonexistent_user",
        courseId: "course1",
        enrolledAt: new Date(),
      },
      {
        userId: "user1",
        courseId: "nonexistent_course",
        enrolledAt: new Date(),
      },
    ]);

    // Find orphaned enrollments (referential integrity violations)
    const orphanedUserEnrollments = await enrollmentsCollection
      .aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $match: { user: { $size: 0 } } },
      ])
      .toArray();

    const orphanedCourseEnrollments = await enrollmentsCollection
      .aggregate([
        {
          $lookup: {
            from: "courses",
            localField: "courseId",
            foreignField: "_id",
            as: "course",
          },
        },
        { $match: { course: { $size: 0 } } },
      ])
      .toArray();

    this.assertions.assertEqual(
      orphanedUserEnrollments.length,
      1,
      "Should find 1 enrollment with non-existent user"
    );
    this.assertions.assertEqual(
      orphanedCourseEnrollments.length,
      1,
      "Should find 1 enrollment with non-existent course"
    );

    console.log("✓ Referential integrity test passed");
    return {
      orphanedUsers: orphanedUserEnrollments.length,
      orphanedCourses: orphanedCourseEnrollments.length,
    };
  }

  // Run all data quality tests
  async runAllTests() {
    console.log("\n=== Starting Data Quality Unit Tests ===");

    await this.setup();

    const results = {};

    try {
      // Clean collections before testing
      await this.helpers.cleanCollections(this.db, [
        "users",
        "courses",
        "enrollments",
      ]);

      results.emailValidation = await this.testEmailFormatValidation();
      results.requiredFields = await this.testRequiredFieldsValidation();
      results.dataTypes = await this.testDataTypeConsistency();
      results.duplicates = await this.testDuplicateDetection();
      results.ranges = await this.testRangeValidation();
      results.referentialIntegrity = await this.testReferentialIntegrity();

      console.log("\n✅ All Data Quality Tests Passed!");
      console.log("Results Summary:", JSON.stringify(results, null, 2));
    } catch (error) {
      console.error("❌ Data Quality Tests Failed:", error.message);
      throw error;
    } finally {
      await this.teardown();
    }

    return results;
  }
}

// Export for use in other modules
module.exports = { DataQualityTests };

// Run tests if called directly
if (require.main === module) {
  const tests = new DataQualityTests();
  tests.runAllTests().catch(console.error);
}
