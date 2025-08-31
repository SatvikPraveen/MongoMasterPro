// File: tests/integration/end_to_end_workflow.js
// End-to-End Workflow Integration Tests for MongoMasterPro

const { MongoClient } = require("mongodb");
const { TestHelpers } = require("../utils/test_helpers");
const { AssertionLibrary } = require("../utils/assertion_library");

class EndToEndWorkflowTests {
  constructor() {
    this.client = null;
    this.db = null;
    this.helpers = new TestHelpers();
    this.assertions = new AssertionLibrary();
    this.testSession = null;
  }

  async setup() {
    this.client = new MongoClient(
      process.env.MONGODB_URI || "mongodb://localhost:27017"
    );
    await this.client.connect();
    this.db = this.client.db("mongomasterpro_integration_test");
    console.log("✓ End-to-End Workflow Tests - Setup complete");
  }

  async teardown() {
    if (this.testSession) {
      await this.testSession.endSession();
    }
    if (this.client) {
      await this.client.close();
      console.log("✓ End-to-End Workflow Tests - Teardown complete");
    }
  }

  // Test 1: Complete User Registration and Course Enrollment Workflow
  async testUserRegistrationAndEnrollmentWorkflow() {
    console.log(
      "\n--- Testing User Registration and Course Enrollment Workflow ---"
    );

    // Step 1: Create collections with proper indexes
    const usersCollection = this.db.collection("users");
    const coursesCollection = this.db.collection("courses");
    const enrollmentsCollection = this.db.collection("enrollments");
    const paymentsCollection = this.db.collection("payments");

    // Create indexes for performance
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await coursesCollection.createIndex({ title: 1, category: 1 });
    await enrollmentsCollection.createIndex(
      { userId: 1, courseId: 1 },
      { unique: true }
    );
    await paymentsCollection.createIndex({ enrollmentId: 1 });

    // Step 2: User registration
    const newUser = {
      _id: "user123",
      email: "student@example.com",
      name: "John Student",
      role: "student",
      registeredAt: new Date(),
      profile: {
        firstName: "John",
        lastName: "Student",
        bio: "Aspiring developer",
      },
      preferences: {
        notifications: true,
        theme: "dark",
      },
    };

    const userResult = await usersCollection.insertOne(newUser);
    this.assertions.assertTrue(
      userResult.acknowledged,
      "User should be inserted successfully"
    );

    // Step 3: Course creation
    const newCourse = {
      _id: "course456",
      title: "Advanced MongoDB Techniques",
      description:
        "Master advanced MongoDB operations, indexing, and aggregation pipelines",
      instructor: "MongoDB Expert",
      category: "programming",
      price: 199.99,
      duration: { hours: 12, minutes: 30 },
      modules: [
        {
          name: "Advanced Queries",
          duration: 180,
          lessons: [
            { title: "Complex Aggregations", type: "video" },
            { title: "Query Optimization", type: "text" },
            { title: "Practice Quiz", type: "quiz" },
          ],
        },
        {
          name: "Performance Tuning",
          duration: 150,
          lessons: [
            { title: "Index Strategies", type: "video" },
            { title: "Performance Analysis", type: "video" },
          ],
        },
      ],
      tags: ["mongodb", "database", "advanced"],
      createdAt: new Date(),
      isPublished: true,
    };

    const courseResult = await coursesCollection.insertOne(newCourse);
    this.assertions.assertTrue(
      courseResult.acknowledged,
      "Course should be inserted successfully"
    );

    // Step 4: Course enrollment with payment processing (using transactions)
    this.testSession = this.client.startSession();

    let enrollmentResult;
    let paymentResult;

    await this.testSession.withTransaction(async () => {
      // Create enrollment record
      const enrollment = {
        _id: "enrollment789",
        userId: "user123",
        courseId: "course456",
        enrolledAt: new Date(),
        status: "active",
        progress: {
          completedModules: 0,
          totalModules: 2,
          completedLessons: 0,
          totalLessons: 5,
          percentComplete: 0,
        },
      };

      enrollmentResult = await enrollmentsCollection.insertOne(enrollment, {
        session: this.testSession,
      });

      // Process payment
      const payment = {
        _id: "payment999",
        enrollmentId: "enrollment789",
        userId: "user123",
        courseId: "course456",
        amount: 199.99,
        currency: "USD",
        paymentMethod: "credit_card",
        status: "completed",
        transactionId: "txn_" + Date.now(),
        processedAt: new Date(),
      };

      paymentResult = await paymentsCollection.insertOne(payment, {
        session: this.testSession,
      });

      // Update course enrollment count
      await coursesCollection.updateOne(
        { _id: "course456" },
        {
          $inc: { enrollmentCount: 1 },
          $setOnInsert: { enrollmentCount: 1 },
        },
        { session: this.testSession, upsert: true }
      );
    });

    this.assertions.assertTrue(
      enrollmentResult.acknowledged,
      "Enrollment should be created successfully"
    );
    this.assertions.assertTrue(
      paymentResult.acknowledged,
      "Payment should be processed successfully"
    );

    // Step 5: Verify workflow completion with aggregation
    const workflowVerification = await usersCollection
      .aggregate([
        { $match: { _id: "user123" } },
        {
          $lookup: {
            from: "enrollments",
            localField: "_id",
            foreignField: "userId",
            as: "enrollments",
          },
        },
        {
          $lookup: {
            from: "payments",
            localField: "enrollments.userId",
            foreignField: "userId",
            as: "payments",
          },
        },
        {
          $project: {
            name: 1,
            email: 1,
            enrollmentCount: { $size: "$enrollments" },
            paymentCount: { $size: "$payments" },
            totalSpent: { $sum: "$payments.amount" },
          },
        },
      ])
      .toArray();

    this.assertions.assertEqual(
      workflowVerification.length,
      1,
      "Should find user with complete workflow"
    );
    this.assertions.assertEqual(
      workflowVerification[0].enrollmentCount,
      1,
      "User should have 1 enrollment"
    );
    this.assertions.assertEqual(
      workflowVerification[0].paymentCount,
      1,
      "User should have 1 payment"
    );
    this.assertions.assertEqual(
      workflowVerification[0].totalSpent,
      199.99,
      "Total spent should match course price"
    );

    console.log("✓ User registration and enrollment workflow test passed");
    return {
      userCreated: true,
      courseCreated: true,
      enrollmentCompleted: true,
      paymentProcessed: true,
      workflowVerified: true,
    };
  }

  // Test 2: Course Progress Tracking Workflow
  async testCourseProgressTrackingWorkflow() {
    console.log("\n--- Testing Course Progress Tracking Workflow ---");

    const enrollmentsCollection = this.db.collection("enrollments");
    const progressCollection = this.db.collection("lesson_progress");
    const certificatesCollection = this.db.collection("certificates");

    // Step 1: Track lesson completions
    const lessonCompletions = [
      {
        enrollmentId: "enrollment789",
        moduleIndex: 0,
        lessonIndex: 0,
        completedAt: new Date(),
      },
      {
        enrollmentId: "enrollment789",
        moduleIndex: 0,
        lessonIndex: 1,
        completedAt: new Date(),
      },
      {
        enrollmentId: "enrollment789",
        moduleIndex: 0,
        lessonIndex: 2,
        completedAt: new Date(),
      },
      {
        enrollmentId: "enrollment789",
        moduleIndex: 1,
        lessonIndex: 0,
        completedAt: new Date(),
      },
    ];

    await progressCollection.insertMany(lessonCompletions);

    // Step 2: Update enrollment progress using aggregation pipeline
    const progressUpdate = await enrollmentsCollection
      .aggregate([
        { $match: { _id: "enrollment789" } },
        {
          $lookup: {
            from: "lesson_progress",
            localField: "_id",
            foreignField: "enrollmentId",
            as: "completedLessons",
          },
        },
        {
          $addFields: {
            completedLessonsCount: { $size: "$completedLessons" },
            completedModulesSet: {
              $setUnion: ["$completedLessons.moduleIndex", []],
            },
          },
        },
        {
          $addFields: {
            completedModulesCount: { $size: "$completedModulesSet" },
            percentComplete: {
              $multiply: [
                {
                  $divide: ["$completedLessonsCount", "$progress.totalLessons"],
                },
                100,
              ],
            },
          },
        },
      ])
      .toArray();

    const updatedProgress = progressUpdate[0];

    // Update the enrollment document
    await enrollmentsCollection.updateOne(
      { _id: "enrollment789" },
      {
        $set: {
          "progress.completedLessons": updatedProgress.completedLessonsCount,
          "progress.completedModules": updatedProgress.completedModulesCount,
          "progress.percentComplete": Math.round(
            updatedProgress.percentComplete
          ),
          lastActivityAt: new Date(),
        },
      }
    );

    // Step 3: Check if course is completed and issue certificate
    if (updatedProgress.percentComplete >= 80) {
      // 80% completion threshold
      const certificate = {
        _id: "cert_" + Date.now(),
        enrollmentId: "enrollment789",
        userId: "user123",
        courseId: "course456",
        issuedAt: new Date(),
        certificateNumber: "CERT-" + Date.now(),
        completionPercentage: Math.round(updatedProgress.percentComplete),
        status: "issued",
      };

      await certificatesCollection.insertOne(certificate);
    }

    // Step 4: Generate progress report
    const progressReport = await enrollmentsCollection
      .aggregate([
        { $match: { _id: "enrollment789" } },
        {
          $lookup: {
            from: "courses",
            localField: "courseId",
            foreignField: "_id",
            as: "course",
          },
        },
        {
          $lookup: {
            from: "certificates",
            localField: "_id",
            foreignField: "enrollmentId",
            as: "certificates",
          },
        },
        {
          $project: {
            courseTitle: { $arrayElemAt: ["$course.title", 0] },
            progress: 1,
            status: 1,
            certificateIssued: { $gt: [{ $size: "$certificates" }, 0] },
            lastActivity: "$lastActivityAt",
          },
        },
      ])
      .toArray();

    this.assertions.assertEqual(
      progressReport.length,
      1,
      "Should generate progress report"
    );
    this.assertions.assertTrue(
      progressReport[0].progress.percentComplete >= 80,
      "Should show significant progress"
    );
    this.assertions.assertTrue(
      progressReport[0].certificateIssued,
      "Certificate should be issued"
    );

    console.log("✓ Course progress tracking workflow test passed");
    return {
      lessonsTracked: lessonCompletions.length,
      progressUpdated: true,
      certificateIssued: progressReport[0].certificateIssued,
      completionPercentage: progressReport[0].progress.percentComplete,
    };
  }

  // Test 3: Analytics and Reporting Workflow
  async testAnalyticsAndReportingWorkflow() {
    console.log("\n--- Testing Analytics and Reporting Workflow ---");

    // Create additional test data for meaningful analytics
    const usersCollection = this.db.collection("users");
    const coursesCollection = this.db.collection("courses");
    const enrollmentsCollection = this.db.collection("enrollments");
    const paymentsCollection = this.db.collection("payments");

    // Add more sample data
    const additionalUsers = [
      {
        _id: "user456",
        email: "jane@example.com",
        name: "Jane Doe",
        role: "student",
        registeredAt: new Date(2024, 0, 15),
      },
      {
        _id: "user789",
        email: "bob@example.com",
        name: "Bob Smith",
        role: "instructor",
        registeredAt: new Date(2024, 1, 20),
      },
    ];

    const additionalCourses = [
      {
        _id: "course789",
        title: "React Fundamentals",
        category: "programming",
        price: 149.99,
        instructor: "Bob Smith",
        createdAt: new Date(2024, 1, 1),
      },
      {
        _id: "course101",
        title: "Digital Marketing",
        category: "marketing",
        price: 99.99,
        instructor: "Marketing Pro",
        createdAt: new Date(2024, 2, 1),
      },
    ];

    const additionalEnrollments = [
      {
        _id: "enrollment456",
        userId: "user456",
        courseId: "course789",
        enrolledAt: new Date(2024, 1, 25),
        status: "active",
      },
      {
        _id: "enrollment101",
        userId: "user456",
        courseId: "course101",
        enrolledAt: new Date(2024, 2, 10),
        status: "completed",
      },
    ];

    const additionalPayments = [
      {
        _id: "payment456",
        userId: "user456",
        courseId: "course789",
        amount: 149.99,
        status: "completed",
        processedAt: new Date(2024, 1, 25),
      },
      {
        _id: "payment101",
        userId: "user456",
        courseId: "course101",
        amount: 99.99,
        status: "completed",
        processedAt: new Date(2024, 2, 10),
      },
    ];

    await usersCollection.insertMany(additionalUsers);
    await coursesCollection.insertMany(additionalCourses);
    await enrollmentsCollection.insertMany(additionalEnrollments);
    await paymentsCollection.insertMany(additionalPayments);

    // Analytics Report 1: Revenue by Month
    const monthlyRevenue = await paymentsCollection
      .aggregate([
        { $match: { status: "completed" } },
        {
          $group: {
            _id: {
              year: { $year: "$processedAt" },
              month: { $month: "$processedAt" },
            },
            totalRevenue: { $sum: "$amount" },
            transactionCount: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ])
      .toArray();

    // Analytics Report 2: Most Popular Courses
    const popularCourses = await enrollmentsCollection
      .aggregate([
        {
          $group: {
            _id: "$courseId",
            enrollmentCount: { $sum: 1 },
            activeEnrollments: {
              $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
            },
            completedEnrollments: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
          },
        },
        {
          $lookup: {
            from: "courses",
            localField: "_id",
            foreignField: "_id",
            as: "course",
          },
        },
        {
          $addFields: {
            courseTitle: { $arrayElemAt: ["$course.title", 0] },
            category: { $arrayElemAt: ["$course.category", 0] },
            completionRate: {
              $divide: ["$completedEnrollments", "$enrollmentCount"],
            },
          },
        },
        { $sort: { enrollmentCount: -1 } },
      ])
      .toArray();

    // Analytics Report 3: User Engagement Metrics
    const userEngagement = await usersCollection
      .aggregate([
        {
          $lookup: {
            from: "enrollments",
            localField: "_id",
            foreignField: "userId",
            as: "enrollments",
          },
        },
        {
          $lookup: {
            from: "payments",
            localField: "_id",
            foreignField: "userId",
            as: "payments",
          },
        },
        {
          $addFields: {
            totalEnrollments: { $size: "$enrollments" },
            totalSpent: { $sum: "$payments.amount" },
            averageSpentPerCourse: {
              $cond: [
                { $gt: [{ $size: "$enrollments" }, 0] },
                {
                  $divide: [
                    { $sum: "$payments.amount" },
                    { $size: "$enrollments" },
                  ],
                },
                0,
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            averageEnrollmentsPerUser: { $avg: "$totalEnrollments" },
            totalRevenue: { $sum: "$totalSpent" },
            averageRevenuePerUser: { $avg: "$totalSpent" },
          },
        },
      ])
      .toArray();

    // Analytics Report 4: Category Performance
    const categoryPerformance = await coursesCollection
      .aggregate([
        {
          $lookup: {
            from: "enrollments",
            localField: "_id",
            foreignField: "courseId",
            as: "enrollments",
          },
        },
        {
          $lookup: {
            from: "payments",
            localField: "_id",
            foreignField: "courseId",
            as: "payments",
          },
        },
        {
          $group: {
            _id: "$category",
            courseCount: { $sum: 1 },
            totalEnrollments: { $sum: { $size: "$enrollments" } },
            totalRevenue: { $sum: { $sum: "$payments.amount" } },
            averagePricePerCourse: { $avg: "$price" },
          },
        },
        { $sort: { totalRevenue: -1 } },
      ])
      .toArray();

    // Validate analytics results
    this.assertions.assertTrue(
      monthlyRevenue.length >= 2,
      "Should have revenue data for multiple months"
    );
    this.assertions.assertTrue(
      popularCourses.length >= 3,
      "Should have data for multiple courses"
    );
    this.assertions.assertEqual(
      userEngagement.length,
      1,
      "Should have overall engagement metrics"
    );
    this.assertions.assertTrue(
      categoryPerformance.length >= 2,
      "Should have data for multiple categories"
    );

    // Verify specific metrics
    const totalRevenue = monthlyRevenue.reduce(
      (sum, month) => sum + month.totalRevenue,
      0
    );
    this.assertions.assertTrue(
      totalRevenue > 400,
      "Total revenue should exceed $400"
    );

    console.log("✓ Analytics and reporting workflow test passed");
    return {
      monthlyRevenueReports: monthlyRevenue.length,
      popularCoursesAnalyzed: popularCourses.length,
      engagementMetricsGenerated: true,
      categoryPerformanceReports: categoryPerformance.length,
      totalRevenue: totalRevenue,
    };
  }

  // Test 4: Data Integrity and Consistency Workflow
  async testDataIntegrityWorkflow() {
    console.log("\n--- Testing Data Integrity and Consistency Workflow ---");

    const usersCollection = this.db.collection("users");
    const enrollmentsCollection = this.db.collection("enrollments");
    const paymentsCollection = this.db.collection("payments");

    // Test 1: Referential Integrity Check
    const orphanedEnrollments = await enrollmentsCollection
      .aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $lookup: {
            from: "courses",
            localField: "courseId",
            foreignField: "_id",
            as: "course",
          },
        },
        {
          $match: {
            $or: [{ user: { $size: 0 } }, { course: { $size: 0 } }],
          },
        },
      ])
      .toArray();

    // Test 2: Payment-Enrollment Consistency
    const paymentEnrollmentConsistency = await paymentsCollection
      .aggregate([
        {
          $lookup: {
            from: "enrollments",
            localField: "enrollmentId",
            foreignField: "_id",
            as: "enrollment",
          },
        },
        {
          $addFields: {
            hasEnrollment: { $gt: [{ $size: "$enrollment" }, 0] },
            userIdMatch: {
              $eq: ["$userId", { $arrayElemAt: ["$enrollment.userId", 0] }],
            },
            courseIdMatch: {
              $eq: ["$courseId", { $arrayElemAt: ["$enrollment.courseId", 0] }],
            },
          },
        },
        {
          $match: {
            $or: [
              { hasEnrollment: false },
              { userIdMatch: false },
              { courseIdMatch: false },
            ],
          },
        },
      ])
      .toArray();

    // Test 3: Duplicate Detection
    const duplicateUsers = await usersCollection
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

    // Test 4: Data Completeness Check
    const incompleteRecords = await usersCollection
      .aggregate([
        {
          $match: {
            $or: [
              { email: { $in: [null, ""] } },
              { name: { $in: [null, ""] } },
              { role: { $in: [null, ""] } },
            ],
          },
        },
      ])
      .toArray();

    // Validate integrity results
    this.assertions.assertEqual(
      orphanedEnrollments.length,
      0,
      "Should have no orphaned enrollments"
    );
    this.assertions.assertEqual(
      paymentEnrollmentConsistency.length,
      0,
      "Payment-enrollment data should be consistent"
    );
    this.assertions.assertEqual(
      duplicateUsers.length,
      0,
      "Should have no duplicate users"
    );
    this.assertions.assertEqual(
      incompleteRecords.length,
      0,
      "Should have no incomplete records"
    );

    console.log("✓ Data integrity and consistency workflow test passed");
    return {
      orphanedEnrollments: orphanedEnrollments.length,
      inconsistentPayments: paymentEnrollmentConsistency.length,
      duplicateUsers: duplicateUsers.length,
      incompleteRecords: incompleteRecords.length,
      integrityMaintained: true,
    };
  }

  // Run all end-to-end workflow tests
  async runAllTests() {
    console.log("\n=== Starting End-to-End Workflow Integration Tests ===");

    await this.setup();

    const results = {};

    try {
      // Clean all collections before testing
      await this.helpers.cleanAllCollections(this.db);

      results.userRegistrationEnrollment =
        await this.testUserRegistrationAndEnrollmentWorkflow();
      results.progressTracking =
        await this.testCourseProgressTrackingWorkflow();
      results.analyticsReporting =
        await this.testAnalyticsAndReportingWorkflow();
      results.dataIntegrity = await this.testDataIntegrityWorkflow();

      console.log("\n✅ All End-to-End Workflow Tests Passed!");
      console.log("Results Summary:", JSON.stringify(results, null, 2));
    } catch (error) {
      console.error("❌ End-to-End Workflow Tests Failed:", error.message);
      console.error("Stack trace:", error.stack);
      throw error;
    } finally {
      await this.teardown();
    }

    return results;
  }
}

// Export for use in other modules
module.exports = { EndToEndWorkflowTests };

// Run tests if called directly
if (require.main === module) {
  const tests = new EndToEndWorkflowTests();
  tests.runAllTests().catch(console.error);
}
