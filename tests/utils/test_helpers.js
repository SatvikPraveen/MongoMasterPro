// File: tests/utils/test_helpers.js
// Test Helper Utilities for MongoMasterPro

const { MongoClient } = require("mongodb");

class TestHelpers {
  constructor() {
    this.defaultTimeout = 10000; // 10 seconds
  }

  // Database Connection Helpers
  async connectToTestDB(
    uri = "mongodb://localhost:27017",
    dbName = "mongomasterpro_test"
  ) {
    const client = new MongoClient(uri);
    await client.connect();
    return { client, db: client.db(dbName) };
  }

  async closeConnection(client) {
    if (client) {
      await client.close();
    }
  }

  // Collection Management Helpers
  async cleanCollections(db, collectionNames) {
    for (const name of collectionNames) {
      try {
        await db.collection(name).deleteMany({});
        console.log(`✓ Cleaned collection: ${name}`);
      } catch (error) {
        console.warn(
          `Warning: Could not clean collection ${name}: ${error.message}`
        );
      }
    }
  }

  async cleanAllCollections(db) {
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);
    await this.cleanCollections(db, collectionNames);
  }

  async dropCollections(db, collectionNames) {
    for (const name of collectionNames) {
      try {
        await db.collection(name).drop();
        console.log(`✓ Dropped collection: ${name}`);
      } catch (error) {
        if (error.codeName !== "NamespaceNotFound") {
          console.warn(
            `Warning: Could not drop collection ${name}: ${error.message}`
          );
        }
      }
    }
  }

  async createCollectionWithValidation(db, collectionName, validator) {
    try {
      await db.collection(collectionName).drop();
    } catch (error) {
      // Collection might not exist, ignore error
    }

    return await db.createCollection(collectionName, {
      validator: validator,
      validationAction: "error",
      validationLevel: "strict",
    });
  }

  // Index Management Helpers
  async createIndexes(collection, indexSpecs) {
    const results = [];
    for (const spec of indexSpecs) {
      try {
        const result = await collection.createIndex(
          spec.keys,
          spec.options || {}
        );
        results.push({ index: spec.keys, result, success: true });
      } catch (error) {
        results.push({
          index: spec.keys,
          error: error.message,
          success: false,
        });
      }
    }
    return results;
  }

  async dropIndexes(collection, indexNames) {
    const results = [];
    for (const indexName of indexNames) {
      try {
        await collection.dropIndex(indexName);
        results.push({ index: indexName, success: true });
      } catch (error) {
        results.push({
          index: indexName,
          error: error.message,
          success: false,
        });
      }
    }
    return results;
  }

  async getIndexInfo(collection) {
    return await collection.indexes();
  }

  // Data Generation Helpers
  generateUsers(count = 10, startId = 1) {
    const users = [];
    const roles = ["student", "instructor", "admin"];
    const domains = ["example.com", "test.com", "demo.com"];

    for (let i = startId; i < startId + count; i++) {
      users.push({
        _id: `user${i}`,
        email: `user${i}@${domains[i % domains.length]}`,
        name: `User ${i}`,
        role: roles[i % roles.length],
        registeredAt: new Date(
          Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
        ),
        profile: {
          firstName: `First${i}`,
          lastName: `Last${i}`,
          bio: `Bio for user ${i}`,
        },
        preferences: {
          notifications: Math.random() > 0.5,
          theme: Math.random() > 0.5 ? "dark" : "light",
        },
      });
    }
    return users;
  }

  generateCourses(count = 5, startId = 1) {
    const courses = [];
    const categories = [
      "programming",
      "design",
      "business",
      "data-science",
      "marketing",
    ];
    const instructors = [
      "Expert A",
      "Expert B",
      "Expert C",
      "Expert D",
      "Expert E",
    ];

    for (let i = startId; i < startId + count; i++) {
      courses.push({
        _id: `course${i}`,
        title: `Course ${i}: Advanced Topics`,
        description: `Comprehensive course covering advanced topics in subject ${i}`,
        instructor: instructors[i % instructors.length],
        category: categories[i % categories.length],
        price: Math.round((50 + Math.random() * 200) * 100) / 100,
        duration: {
          hours: Math.floor(5 + Math.random() * 20),
          minutes: Math.floor(Math.random() * 60),
        },
        tags: [
          `topic${i}`,
          `level${(i % 3) + 1}`,
          categories[i % categories.length],
        ],
        createdAt: new Date(
          Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000
        ),
        isPublished: Math.random() > 0.2,
      });
    }
    return courses;
  }

  generateEnrollments(userIds, courseIds, enrollmentRatio = 0.3) {
    const enrollments = [];
    const statuses = ["active", "completed", "suspended"];
    let enrollmentId = 1;

    for (const userId of userIds) {
      for (const courseId of courseIds) {
        if (Math.random() < enrollmentRatio) {
          enrollments.push({
            _id: `enrollment${enrollmentId}`,
            userId: userId,
            courseId: courseId,
            enrolledAt: new Date(
              Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000
            ),
            status: statuses[Math.floor(Math.random() * statuses.length)],
            progress: {
              completedModules: Math.floor(Math.random() * 5),
              totalModules: 5,
              completedLessons: Math.floor(Math.random() * 15),
              totalLessons: 15,
              percentComplete: Math.floor(Math.random() * 100),
            },
          });
          enrollmentId++;
        }
      }
    }
    return enrollments;
  }

  generatePayments(enrollments) {
    return enrollments.map((enrollment, index) => ({
      _id: `payment${index + 1}`,
      enrollmentId: enrollment._id,
      userId: enrollment.userId,
      courseId: enrollment.courseId,
      amount: Math.round((50 + Math.random() * 200) * 100) / 100,
      currency: "USD",
      paymentMethod: Math.random() > 0.5 ? "credit_card" : "paypal",
      status: Math.random() > 0.1 ? "completed" : "pending",
      transactionId: `txn_${Date.now()}_${index}`,
      processedAt: new Date(
        enrollment.enrolledAt.getTime() + Math.random() * 24 * 60 * 60 * 1000
      ),
    }));
  }

  // Performance Testing Helpers
  async measureQueryPerformance(collection, query, options = {}) {
    const startTime = process.hrtime.bigint();
    const result = await collection.find(query, options).toArray();
    const endTime = process.hrtime.bigint();

    const executionTimeMs = Number(endTime - startTime) / 1000000;

    return {
      executionTime: executionTimeMs,
      resultCount: result.length,
      results: result,
    };
  }

  async analyzeQueryExecution(collection, query, options = {}) {
    const explainResult = await collection
      .find(query, options)
      .explain("executionStats");

    return {
      executionSuccess: explainResult.executionStats.executionSuccess,
      executionTimeMillis: explainResult.executionStats.executionTimeMillis,
      totalKeysExamined: explainResult.executionStats.totalKeysExamined,
      totalDocsExamined: explainResult.executionStats.totalDocsExamined,
      totalDocsReturned: explainResult.executionStats.totalDocsReturned,
      indexUsed: explainResult.executionStats.indexUsed || "COLLSCAN",
      winningPlan: explainResult.queryPlanner.winningPlan.stage,
    };
  }

  async benchmarkOperations(collection, operations, iterations = 100) {
    const results = {};

    for (const [opName, opFunction] of Object.entries(operations)) {
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = process.hrtime.bigint();
        await opFunction(collection);
        const endTime = process.hrtime.bigint();
        times.push(Number(endTime - startTime) / 1000000);
      }

      results[opName] = {
        iterations,
        avgTime: times.reduce((a, b) => a + b, 0) / times.length,
        minTime: Math.min(...times),
        maxTime: Math.max(...times),
        totalTime: times.reduce((a, b) => a + b, 0),
      };
    }

    return results;
  }

  // Transaction Helpers
  async executeTransaction(client, transactionFunction, options = {}) {
    const session = client.startSession();
    let result = null;
    let error = null;

    try {
      result = await session.withTransaction(
        async () => {
          return await transactionFunction(session);
        },
        {
          readConcern: { level: "majority" },
          writeConcern: { w: "majority", j: true },
          ...options,
        }
      );
    } catch (err) {
      error = err;
    } finally {
      await session.endSession();
    }

    return { result, error, success: error === null };
  }

  // Validation Helpers
  async validateDocumentStructure(collection, expectedStructure) {
    const sampleDoc = await collection.findOne({});
    if (!sampleDoc) {
      return { valid: false, message: "No documents found in collection" };
    }

    const missingFields = [];
    const extraFields = [];

    // Check for missing required fields
    for (const field of expectedStructure.required || []) {
      if (!(field in sampleDoc)) {
        missingFields.push(field);
      }
    }

    // Check field types if specified
    const typeErrors = [];
    if (expectedStructure.properties) {
      for (const [field, spec] of Object.entries(
        expectedStructure.properties
      )) {
        if (field in sampleDoc) {
          const actualType = typeof sampleDoc[field];
          if (spec.type && actualType !== spec.type) {
            typeErrors.push(
              `${field}: expected ${spec.type}, got ${actualType}`
            );
          }
        }
      }
    }

    return {
      valid: missingFields.length === 0 && typeErrors.length === 0,
      missingFields,
      typeErrors,
      sampleDocument: sampleDoc,
    };
  }

  async validateIndexes(collection, expectedIndexes) {
    const actualIndexes = await collection.indexes();
    const actualIndexKeys = actualIndexes.map((idx) => JSON.stringify(idx.key));
    const expectedIndexKeys = expectedIndexes.map((idx) => JSON.stringify(idx));

    const missingIndexes = expectedIndexes.filter(
      (expected) => !actualIndexKeys.includes(JSON.stringify(expected))
    );

    return {
      valid: missingIndexes.length === 0,
      missingIndexes,
      actualIndexes: actualIndexes.map((idx) => idx.key),
      expectedIndexes,
    };
  }

  // Utility Functions
  async waitForOperation(operationPromise, timeoutMs = this.defaultTimeout) {
    return Promise.race([
      operationPromise,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ]);
  }

  generateRandomObjectId() {
    const timestamp = Math.floor(Date.now() / 1000)
      .toString(16)
      .padStart(8, "0");
    const randomBytes = Array.from({ length: 8 }, () =>
      Math.floor(Math.random() * 256)
        .toString(16)
        .padStart(2, "0")
    ).join("");
    return timestamp + randomBytes;
  }

  createDateRange(startDate, endDate, intervals) {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const intervalMs = (end - start) / intervals;

    for (let i = 0; i <= intervals; i++) {
      dates.push(new Date(start.getTime() + i * intervalMs));
    }
    return dates;
  }

  // Aggregation Helpers
  async testAggregationPipeline(collection, pipeline, expectedStages = []) {
    const explainResult = await collection.aggregate(pipeline).explain();
    const actualStages = explainResult.stages || [];

    return {
      pipelineValid: true,
      stagesExecuted: actualStages.length,
      expectedStages: expectedStages.length,
      explainResult,
    };
  }

  // Error Simulation Helpers
  async simulateNetworkDelay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  createFailingOperation(errorMessage = "Simulated failure") {
    return async () => {
      throw new Error(errorMessage);
    };
  }

  // Logging Helpers
  logTestStart(testName) {
    console.log(`\n🧪 Starting test: ${testName}`);
    console.log("=".repeat(50));
  }

  logTestEnd(testName, success = true) {
    const icon = success ? "✅" : "❌";
    const status = success ? "PASSED" : "FAILED";
    console.log(`${icon} Test ${testName}: ${status}`);
    console.log("=".repeat(50));
  }

  logOperation(operation, details = {}) {
    console.log(`📝 ${operation}:`, JSON.stringify(details, null, 2));
  }

  // Resource Cleanup
  async cleanup(resources) {
    const results = [];

    for (const resource of resources) {
      try {
        if (resource.type === "collection" && resource.db && resource.name) {
          await resource.db.collection(resource.name).drop();
        } else if (resource.type === "client" && resource.client) {
          await resource.client.close();
        } else if (resource.type === "session" && resource.session) {
          await resource.session.endSession();
        }
        results.push({
          resource: resource.name || resource.type,
          success: true,
        });
      } catch (error) {
        results.push({
          resource: resource.name || resource.type,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }
}

// Export the TestHelpers class
module.exports = { TestHelpers };

// Also export commonly used static methods for convenience
module.exports.generateTestData = {
  users: (count, startId) => new TestHelpers().generateUsers(count, startId),
  courses: (count, startId) =>
    new TestHelpers().generateCourses(count, startId),
  enrollments: (userIds, courseIds, ratio) =>
    new TestHelpers().generateEnrollments(userIds, courseIds, ratio),
  payments: (enrollments) => new TestHelpers().generatePayments(enrollments),
};
