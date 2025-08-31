// File: tests/integration/cross_module_validation.js
// Cross-Module Validation Integration Tests for MongoMasterPro

const { MongoClient } = require("mongodb");
const { TestHelpers } = require("../utils/test_helpers");
const { AssertionLibrary } = require("../utils/assertion_library");

class CrossModuleValidationTests {
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
    this.db = this.client.db("mongomasterpro_cross_module_test");
    console.log("✓ Cross-Module Validation Tests - Setup complete");
  }

  async teardown() {
    if (this.client) {
      await this.client.close();
      console.log("✓ Cross-Module Validation Tests - Teardown complete");
    }
  }

  // Test 1: CRUD + Indexing Integration
  async testCrudIndexingIntegration() {
    console.log("\n--- Testing CRUD + Indexing Integration ---");

    const collection = this.db.collection("products");

    // Create indexes for performance testing
    await collection.createIndex({ name: 1 });
    await collection.createIndex({ category: 1, price: -1 });
    await collection.createIndex({ tags: 1 });
    await collection.createIndex({ "location.city": 1 });

    // Insert test data
    const products = [
      {
        name: "Laptop Pro",
        category: "electronics",
        price: 1299.99,
        tags: ["computer", "professional"],
        location: { city: "NYC", state: "NY" },
      },
      {
        name: "Office Chair",
        category: "furniture",
        price: 299.99,
        tags: ["office", "ergonomic"],
        location: { city: "LA", state: "CA" },
      },
      {
        name: "Smartphone X",
        category: "electronics",
        price: 899.99,
        tags: ["mobile", "premium"],
        location: { city: "NYC", state: "NY" },
      },
    ];

    await collection.insertMany(products);

    // Test query performance with explain
    const explainResult = await collection
      .find({ category: "electronics", price: { $gte: 800 } })
      .explain("executionStats");

    this.assertions.assertTrue(
      explainResult.executionStats.executionSuccess,
      "Query should execute successfully"
    );
    this.assertions.assertEqual(
      explainResult.executionStats.totalDocsExamined,
      2,
      "Should examine correct number of documents"
    );

    // Test index usage for text search
    const textSearchResults = await collection
      .find({ tags: { $in: ["computer", "mobile"] } })
      .toArray();
    this.assertions.assertEqual(
      textSearchResults.length,
      2,
      "Should find 2 products with specified tags"
    );

    console.log("✓ CRUD + Indexing integration test passed");
    return {
      indexesCreated: 4,
      documentsInserted: products.length,
      queryOptimized: true,
    };
  }

  // Test 2: Aggregation + Schema Design Integration
  async testAggregationSchemaIntegration() {
    console.log("\n--- Testing Aggregation + Schema Design Integration ---");

    // Create collections with embedded and referenced schema patterns
    const ordersCollection = this.db.collection("orders");
    const customersCollection = this.db.collection("customers");
    const orderItemsCollection = this.db.collection("order_items");

    // Insert customers (referenced pattern)
    await customersCollection.insertMany([
      {
        _id: "cust001",
        name: "John Doe",
        email: "john@example.com",
        tier: "premium",
      },
      {
        _id: "cust002",
        name: "Jane Smith",
        email: "jane@example.com",
        tier: "standard",
      },
    ]);

    // Insert orders with embedded customer info (hybrid pattern)
    await ordersCollection.insertMany([
      {
        _id: "order001",
        customerId: "cust001",
        customerInfo: { name: "John Doe", tier: "premium" }, // Embedded for performance
        orderDate: new Date("2024-01-15"),
        total: 299.99,
        status: "completed",
      },
      {
        _id: "order002",
        customerId: "cust001",
        customerInfo: { name: "John Doe", tier: "premium" },
        orderDate: new Date("2024-02-20"),
        total: 149.99,
        status: "shipped",
      },
      {
        _id: "order003",
        customerId: "cust002",
        customerInfo: { name: "Jane Smith", tier: "standard" },
        orderDate: new Date("2024-02-25"),
        total: 89.99,
        status: "pending",
      },
    ]);

    // Insert order items (referenced pattern)
    await orderItemsCollection.insertMany([
      {
        orderId: "order001",
        productName: "Laptop Pro",
        quantity: 1,
        price: 299.99,
      },
      { orderId: "order002", productName: "Mouse", quantity: 2, price: 49.99 },
      {
        orderId: "order002",
        productName: "Keyboard",
        quantity: 1,
        price: 99.99,
      },
      {
        orderId: "order003",
        productName: "Headphones",
        quantity: 1,
        price: 89.99,
      },
    ]);

    // Complex aggregation testing both embedded and referenced data
    const customerOrderSummary = await ordersCollection
      .aggregate([
        {
          $lookup: {
            from: "order_items",
            localField: "_id",
            foreignField: "orderId",
            as: "items",
          },
        },
        {
          $group: {
            _id: "$customerId",
            customerName: { $first: "$customerInfo.name" },
            customerTier: { $first: "$customerInfo.tier" },
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: "$total" },
            totalItems: { $sum: { $size: "$items" } },
            averageOrderValue: { $avg: "$total" },
            lastOrderDate: { $max: "$orderDate" },
          },
        },
        {
          $lookup: {
            from: "customers",
            localField: "_id",
            foreignField: "_id",
            as: "customerDetails",
          },
        },
        {
          $addFields: {
            emailFromRef: { $arrayElemAt: ["$customerDetails.email", 0] },
          },
        },
        { $sort: { totalSpent: -1 } },
      ])
      .toArray();

    this.assertions.assertEqual(
      customerOrderSummary.length,
      2,
      "Should have summary for 2 customers"
    );
    this.assertions.assertTrue(
      customerOrderSummary[0].totalSpent > customerOrderSummary[1].totalSpent,
      "Should be sorted by total spent"
    );
    this.assertions.assertTrue(
      customerOrderSummary[0].emailFromRef !== undefined,
      "Should include referenced email data"
    );

    console.log("✓ Aggregation + Schema Design integration test passed");
    return {
      hybridSchemaImplemented: true,
      aggregationWithLookupsWorking: true,
      customerSummariesGenerated: customerOrderSummary.length,
    };
  }

  // Test 3: Transactions + Replication Integration
  async testTransactionsReplicationIntegration() {
    console.log("\n--- Testing Transactions + Replication Integration ---");

    const accountsCollection = this.db.collection("accounts");
    const transactionsCollection = this.db.collection("transactions");

    // Insert initial account balances
    await accountsCollection.insertMany([
      { _id: "acc001", name: "Alice Account", balance: 1000.0 },
      { _id: "acc002", name: "Bob Account", balance: 500.0 },
    ]);

    // Test transaction with write concern (simulating replication requirements)
    const session = this.client.startSession();

    let transferResult = { success: false, transactionId: null };

    try {
      await session.withTransaction(
        async () => {
          const transferAmount = 200.0;
          const transactionId = "txn_" + Date.now();

          // Debit from source account
          const debitResult = await accountsCollection.updateOne(
            { _id: "acc001", balance: { $gte: transferAmount } },
            {
              $inc: { balance: -transferAmount },
              $set: {
                lastTransaction: transactionId,
                lastModified: new Date(),
              },
            },
            { session, writeConcern: { w: "majority", j: true } }
          );

          if (debitResult.matchedCount === 0) {
            throw new Error("Insufficient funds");
          }

          // Credit to destination account
          await accountsCollection.updateOne(
            { _id: "acc002" },
            {
              $inc: { balance: transferAmount },
              $set: {
                lastTransaction: transactionId,
                lastModified: new Date(),
              },
            },
            { session, writeConcern: { w: "majority", j: true } }
          );

          // Record transaction
          await transactionsCollection.insertOne(
            {
              _id: transactionId,
              fromAccount: "acc001",
              toAccount: "acc002",
              amount: transferAmount,
              timestamp: new Date(),
              status: "completed",
            },
            { session }
          );

          transferResult = { success: true, transactionId };
        },
        {
          readConcern: { level: "majority" },
          writeConcern: { w: "majority", j: true },
        }
      );
    } catch (error) {
      transferResult.error = error.message;
    } finally {
      await session.endSession();
    }

    // Verify transaction results
    const finalBalances = await accountsCollection.find({}).toArray();
    const transactionRecord = await transactionsCollection.findOne({
      _id: transferResult.transactionId,
    });

    this.assertions.assertTrue(
      transferResult.success,
      "Transaction should complete successfully"
    );
    this.assertions.assertEqual(
      finalBalances[0].balance,
      800.0,
      "Source account should be debited"
    );
    this.assertions.assertEqual(
      finalBalances[1].balance,
      700.0,
      "Destination account should be credited"
    );
    this.assertions.assertTrue(
      transactionRecord !== null,
      "Transaction should be recorded"
    );

    console.log("✓ Transactions + Replication integration test passed");
    return {
      transactionCompleted: transferResult.success,
      writeConcernRespected: true,
      balancesCorrect: true,
      transactionRecorded: transactionRecord !== null,
    };
  }

  // Test 4: Performance + Security Integration
  async testPerformanceSecurityIntegration() {
    console.log("\n--- Testing Performance + Security Integration ---");

    const sensitiveDataCollection = this.db.collection("sensitive_data");

    // Create indexes for performance while considering security
    await sensitiveDataCollection.createIndex({ userId: 1 });
    await sensitiveDataCollection.createIndex({ "metadata.department": 1 });
    await sensitiveDataCollection.createIndex({ accessLevel: 1 });

    // Insert test data with different access levels
    const sensitiveDocuments = [
      {
        _id: "doc001",
        userId: "user123",
        content: "Public information about user",
        accessLevel: "public",
        metadata: { department: "marketing", classification: "public" },
        createdAt: new Date(),
      },
      {
        _id: "doc002",
        userId: "user123",
        content: "Internal company data",
        accessLevel: "internal",
        metadata: { department: "hr", classification: "internal" },
        createdAt: new Date(),
      },
      {
        _id: "doc003",
        userId: "user456",
        content: "Confidential financial data",
        accessLevel: "confidential",
        metadata: { department: "finance", classification: "confidential" },
        createdAt: new Date(),
      },
    ];

    await sensitiveDataCollection.insertMany(sensitiveDocuments);

    // Test field-level security with projection (simulating field redaction)
    const secureQuery = async (userRole, userId) => {
      let projection = {};
      let filter = {};

      // Define access control logic
      if (userRole === "public") {
        filter = { accessLevel: "public" };
        projection = { content: 1, accessLevel: 1, _id: 1 };
      } else if (userRole === "employee") {
        filter = { accessLevel: { $in: ["public", "internal"] } };
        projection = {
          content: 1,
          accessLevel: 1,
          "metadata.department": 1,
          _id: 1,
        };
      } else if (userRole === "admin") {
        filter = {}; // Admin sees everything
        projection = {}; // All fields
      }

      // Add user-specific filter if not admin
      if (userRole !== "admin" && userId) {
        filter.userId = userId;
      }

      // Execute query with performance monitoring
      const startTime = Date.now();
      const results = await sensitiveDataCollection
        .find(filter, { projection })
        .toArray();
      const queryTime = Date.now() - startTime;

      return { results, queryTime, filter, projection };
    };

    // Test different access levels
    const publicAccess = await secureQuery("public", "user123");
    const employeeAccess = await secureQuery("employee", "user123");
    const adminAccess = await secureQuery("admin");

    // Validate security restrictions
    this.assertions.assertEqual(
      publicAccess.results.length,
      1,
      "Public user should see only 1 document"
    );
    this.assertions.assertEqual(
      employeeAccess.results.length,
      2,
      "Employee should see 2 documents"
    );
    this.assertions.assertEqual(
      adminAccess.results.length,
      3,
      "Admin should see all 3 documents"
    );

    // Validate performance (queries should be fast with proper indexes)
    this.assertions.assertTrue(
      publicAccess.queryTime < 100,
      "Public query should be fast"
    );
    this.assertions.assertTrue(
      employeeAccess.queryTime < 100,
      "Employee query should be fast"
    );
    this.assertions.assertTrue(
      adminAccess.queryTime < 100,
      "Admin query should be fast"
    );

    // Test aggregation with security filters
    const departmentSummary = await sensitiveDataCollection
      .aggregate([
        { $match: { accessLevel: { $in: ["public", "internal"] } } }, // Security filter
        { $group: { _id: "$metadata.department", docCount: { $sum: 1 } } },
        { $sort: { docCount: -1 } },
      ])
      .toArray();

    this.assertions.assertEqual(
      departmentSummary.length,
      2,
      "Should summarize 2 departments (excluding confidential)"
    );

    console.log("✓ Performance + Security integration test passed");
    return {
      accessControlImplemented: true,
      performanceOptimized: true,
      publicDocuments: publicAccess.results.length,
      employeeDocuments: employeeAccess.results.length,
      adminDocuments: adminAccess.results.length,
      averageQueryTime: Math.round(
        (publicAccess.queryTime +
          employeeAccess.queryTime +
          adminAccess.queryTime) /
          3
      ),
    };
  }

  // Test 5: Change Streams + Sharding Integration
  async testChangeStreamsShardingIntegration() {
    console.log("\n--- Testing Change Streams + Sharding Integration ---");

    const eventsCollection = this.db.collection("events");
    const auditCollection = this.db.collection("audit_log");

    // Create indexes optimized for sharding scenarios
    await eventsCollection.createIndex({ shardKey: 1, timestamp: 1 });
    await auditCollection.createIndex({ eventId: 1, timestamp: 1 });

    // Simulate sharded data distribution
    const events = [];
    const shardKeys = ["shard_a", "shard_b", "shard_c"];

    for (let i = 0; i < 15; i++) {
      events.push({
        _id: `event_${i}`,
        shardKey: shardKeys[i % 3], // Distribute across shards
        eventType: ["user_action", "system_event", "error"][i % 3],
        data: { userId: `user_${i % 5}`, action: `action_${i}` },
        timestamp: new Date(Date.now() + i * 1000),
      });
    }

    await eventsCollection.insertMany(events);

    // Simulate change stream processing (in actual sharded environment, this would work across shards)
    const changeStreamSimulation = async () => {
      // Query for recent changes (simulating change stream)
      const recentChanges = await eventsCollection
        .find({
          timestamp: { $gte: new Date(Date.now() - 10000) },
        })
        .sort({ timestamp: -1 })
        .limit(10)
        .toArray();

      // Process changes and create audit entries
      const auditEntries = recentChanges.map((event) => ({
        eventId: event._id,
        shardKey: event.shardKey,
        changeType: "insert",
        timestamp: new Date(),
        metadata: {
          eventType: event.eventType,
          affectedUser: event.data.userId,
        },
      }));

      await auditCollection.insertMany(auditEntries);

      return auditEntries.length;
    };

    const processedChanges = await changeStreamSimulation();

    // Test cross-shard aggregation (simulating operations across shards)
    const crossShardSummary = await eventsCollection
      .aggregate([
        {
          $group: {
            _id: {
              shardKey: "$shardKey",
              eventType: "$eventType",
            },
            count: { $sum: 1 },
            latestTimestamp: { $max: "$timestamp" },
          },
        },
        {
          $group: {
            _id: "$_id.shardKey",
            eventTypes: {
              $push: {
                type: "$_id.eventType",
                count: "$count",
                latest: "$latestTimestamp",
              },
            },
            totalEvents: { $sum: "$count" },
          },
        },
        { $sort: { totalEvents: -1 } },
      ])
      .toArray();

    // Validate results
    this.assertions.assertEqual(
      crossShardSummary.length,
      3,
      "Should have summary for 3 shards"
    );
    this.assertions.assertTrue(
      processedChanges > 0,
      "Should process change events"
    );

    // Test audit trail consistency
    const auditSummary = await auditCollection
      .aggregate([
        { $group: { _id: "$shardKey", auditCount: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    this.assertions.assertEqual(
      auditSummary.length,
      3,
      "Audit trail should cover all shards"
    );

    console.log("✓ Change Streams + Sharding integration test passed");
    return {
      eventsDistributedAcrossShards: true,
      changeStreamProcessed: processedChanges,
      crossShardAggregationWorking: true,
      auditTrailConsistent: true,
      shardsProcessed: crossShardSummary.length,
    };
  }

  // Test 6: All Modules Integration Test
  async testAllModulesIntegration() {
    console.log("\n--- Testing All Modules Integration ---");

    // Create a comprehensive scenario that uses all MongoDB features
    const usersCollection = this.db.collection("integration_users");
    const coursesCollection = this.db.collection("integration_courses");
    const enrollmentsCollection = this.db.collection("integration_enrollments");
    const analyticsCollection = this.db.collection("integration_analytics");

    // 1. Schema Design + Validation
    await usersCollection.drop().catch(() => {});
    await usersCollection.createCollection("integration_users", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["email", "profile"],
          properties: {
            email: {
              bsonType: "string",
              pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
            },
            profile: {
              bsonType: "object",
              required: ["name"],
              properties: { name: { bsonType: "string", minLength: 2 } },
            },
          },
        },
      },
    });

    // 2. Indexing for Performance
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await coursesCollection.createIndex({ category: 1, price: -1 });
    await enrollmentsCollection.createIndex(
      { userId: 1, courseId: 1 },
      { unique: true }
    );

    // 3. CRUD Operations with Transactions
    const session = this.client.startSession();
    let integrationResult = { success: false };

    try {
      await session.withTransaction(async () => {
        // Insert user
        await usersCollection.insertOne(
          {
            _id: "int_user_001",
            email: "integration@example.com",
            profile: { name: "Integration User" },
            preferences: { notifications: true },
          },
          { session }
        );

        // Insert course
        await coursesCollection.insertOne(
          {
            _id: "int_course_001",
            title: "Full Stack Integration",
            category: "programming",
            price: 299.99,
            instructor: "Tech Expert",
          },
          { session }
        );

        // Create enrollment
        await enrollmentsCollection.insertOne(
          {
            _id: "int_enrollment_001",
            userId: "int_user_001",
            courseId: "int_course_001",
            enrolledAt: new Date(),
            status: "active",
          },
          { session }
        );

        integrationResult.success = true;
      });
    } finally {
      await session.endSession();
    }

    // 4. Aggregation Pipeline with Multiple Stages
    const comprehensiveReport = await usersCollection
      .aggregate([
        {
          $lookup: {
            from: "integration_enrollments",
            localField: "_id",
            foreignField: "userId",
            as: "enrollments",
          },
        },
        {
          $unwind: {
            path: "$enrollments",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "integration_courses",
            localField: "enrollments.courseId",
            foreignField: "_id",
            as: "courseDetails",
          },
        },
        {
          $group: {
            _id: "$_id",
            userName: { $first: "$profile.name" },
            email: { $first: "$email" },
            totalEnrollments: {
              $sum: { $cond: [{ $ifNull: ["$enrollments", false] }, 1, 0] },
            },
            totalSpent: { $sum: { $arrayElemAt: ["$courseDetails.price", 0] } },
            categories: {
              $addToSet: { $arrayElemAt: ["$courseDetails.category", 0] },
            },
          },
        },
        {
          $addFields: {
            avgSpentPerCourse: {
              $cond: [
                { $gt: ["$totalEnrollments", 0] },
                { $divide: ["$totalSpent", "$totalEnrollments"] },
                0,
              ],
            },
          },
        },
      ])
      .toArray();

    // 5. Performance Analysis
    const performanceAnalysis = await enrollmentsCollection
      .find({
        userId: "int_user_001",
      })
      .explain("executionStats");

    // 6. Store results in analytics collection
    await analyticsCollection.insertOne({
      testRun: new Date(),
      integrationResults: {
        transactionSuccess: integrationResult.success,
        aggregationResults: comprehensiveReport.length,
        indexUsage: performanceAnalysis.executionStats.totalKeysExamined,
        executionTime: performanceAnalysis.executionStats.executionTimeMillis,
      },
    });

    // Validate comprehensive integration
    this.assertions.assertTrue(
      integrationResult.success,
      "Transaction should complete successfully"
    );
    this.assertions.assertEqual(
      comprehensiveReport.length,
      1,
      "Should generate user report"
    );
    this.assertions.assertEqual(
      comprehensiveReport[0].totalEnrollments,
      1,
      "User should have 1 enrollment"
    );
    this.assertions.assertTrue(
      performanceAnalysis.executionStats.executionSuccess,
      "Query should execute successfully"
    );

    console.log("✓ All modules integration test passed");
    return {
      allModulesIntegrated: true,
      transactionSuccessful: integrationResult.success,
      aggregationPipelineWorking: true,
      performanceOptimized: true,
      schemaValidationEnabled: true,
      analyticsGenerated: true,
    };
  }

  // Run all cross-module validation tests
  async runAllTests() {
    console.log("\n=== Starting Cross-Module Validation Integration Tests ===");

    await this.setup();

    const results = {};

    try {
      // Clean all collections before testing
      await this.helpers.cleanAllCollections(this.db);

      results.crudIndexing = await this.testCrudIndexingIntegration();
      results.aggregationSchema = await this.testAggregationSchemaIntegration();
      results.transactionsReplication =
        await this.testTransactionsReplicationIntegration();
      results.performanceSecurity =
        await this.testPerformanceSecurityIntegration();
      results.changeStreamsSharding =
        await this.testChangeStreamsShardingIntegration();
      results.allModulesIntegration = await this.testAllModulesIntegration();

      console.log("\n✅ All Cross-Module Validation Tests Passed!");
      console.log("Results Summary:", JSON.stringify(results, null, 2));
    } catch (error) {
      console.error("❌ Cross-Module Validation Tests Failed:", error.message);
      console.error("Stack trace:", error.stack);
      throw error;
    } finally {
      await this.teardown();
    }

    return results;
  }
}

// Export for use in other modules
module.exports = { CrossModuleValidationTests };

// Run tests if called directly
if (require.main === module) {
  const tests = new CrossModuleValidationTests();
  tests.runAllTests().catch(console.error);
}
