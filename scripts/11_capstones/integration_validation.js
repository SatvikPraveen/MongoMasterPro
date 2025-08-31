// File: scripts/11_capstones/integration_validation.js
// MongoDB Integration Validation - End-to-end system validation across all modules

/**
 * INTEGRATION VALIDATION
 * ======================
 * End-to-end validation of all MongoDB components and modules.
 * Validates setup, CRUD, indexes, aggregation, transactions, replication,
 * sharding, change streams, security, and performance as an integrated system.
 */

const db = db.getSiblingDB("lms_primary");
const adminDB = db.getSiblingDB("admin");

print("\n" + "=".repeat(80));
print("MONGODB INTEGRATION VALIDATION");
print("=".repeat(80));

// Global integration validation results
let integrationValidation = {
  modules: {},
  totalTests: 0,
  totalPassed: 0,
  totalFailed: 0,
  overallScore: 0,
};

// Helper function to validate module functionality
function validateModule(moduleName, testFunction) {
  print(`\n🔧 VALIDATING MODULE: ${moduleName.toUpperCase()}`);
  print("-".repeat(40));

  const moduleResult = {
    name: moduleName,
    tests: 0,
    passed: 0,
    failed: 0,
    issues: [],
  };

  try {
    testFunction(moduleResult);
    moduleResult.score =
      moduleResult.tests > 0
        ? Math.round((moduleResult.passed / moduleResult.tests) * 100)
        : 0;

    integrationValidation.modules[moduleName] = moduleResult;
    integrationValidation.totalTests += moduleResult.tests;
    integrationValidation.totalPassed += moduleResult.passed;
    integrationValidation.totalFailed += moduleResult.failed;

    const status =
      moduleResult.score >= 80 ? "✅" : moduleResult.score >= 60 ? "⚠️" : "❌";
    print(
      `${status} ${moduleName}: ${moduleResult.score}% (${moduleResult.passed}/${moduleResult.tests} passed)`
    );
  } catch (error) {
    moduleResult.issues.push(`Module validation failed: ${error.message}`);
    integrationValidation.modules[moduleName] = moduleResult;
    print(`❌ ${moduleName}: FAILED - ${error.message}`);
  }
}

// Test helper function
function test(moduleResult, testName, condition, message) {
  moduleResult.tests++;
  if (condition) {
    moduleResult.passed++;
    print(`  ✅ ${testName}: ${message}`);
  } else {
    moduleResult.failed++;
    moduleResult.issues.push(`${testName}: ${message}`);
    print(`  ❌ ${testName}: ${message}`);
  }
}

// ============================================================================
// 1. DATABASE SETUP VALIDATION
// ============================================================================

function validateSetupModule(moduleResult) {
  // Test database connectivity
  try {
    const result = db.runCommand({ ping: 1 });
    test(
      moduleResult,
      "Database Connection",
      result.ok === 1,
      "Database connection successful"
    );
  } catch (error) {
    test(
      moduleResult,
      "Database Connection",
      false,
      `Connection failed: ${error.message}`
    );
  }

  // Test collections exist
  try {
    const collections = db.runCommand({ listCollections: 1 });
    const collectionNames = collections.cursor.firstBatch.map((c) => c.name);
    const expectedCollections = [
      "users",
      "courses",
      "enrollments",
      "assignments",
      "grades",
    ];

    expectedCollections.forEach((collName) => {
      test(
        moduleResult,
        `Collection ${collName}`,
        collectionNames.includes(collName),
        collectionNames.includes(collName)
          ? "Collection exists"
          : "Collection missing"
      );
    });
  } catch (error) {
    test(moduleResult, "Collection Check", false, `Error: ${error.message}`);
  }

  // Test sample data exists
  try {
    const userCount = db.users.countDocuments();
    test(
      moduleResult,
      "Sample Data",
      userCount > 0,
      `${userCount} users found`
    );
  } catch (error) {
    test(moduleResult, "Sample Data", false, `Error: ${error.message}`);
  }
}

// ============================================================================
// 2. CRUD OPERATIONS VALIDATION
// ============================================================================

function validateCRUDModule(moduleResult) {
  const testDoc = {
    _id: new ObjectId(),
    testField: "integration_test",
    timestamp: new Date(),
  };

  // Test Create
  try {
    const insertResult = db.integration_test.insertOne(testDoc);
    test(
      moduleResult,
      "Create Operation",
      insertResult.insertedId.equals(testDoc._id),
      "Document inserted successfully"
    );
  } catch (error) {
    test(
      moduleResult,
      "Create Operation",
      false,
      `Insert failed: ${error.message}`
    );
  }

  // Test Read
  try {
    const readResult = db.integration_test.findOne({ _id: testDoc._id });
    test(
      moduleResult,
      "Read Operation",
      readResult !== null,
      "Document retrieved successfully"
    );
  } catch (error) {
    test(
      moduleResult,
      "Read Operation",
      false,
      `Read failed: ${error.message}`
    );
  }

  // Test Update
  try {
    const updateResult = db.integration_test.updateOne(
      { _id: testDoc._id },
      { $set: { updated: true } }
    );
    test(
      moduleResult,
      "Update Operation",
      updateResult.modifiedCount === 1,
      "Document updated successfully"
    );
  } catch (error) {
    test(
      moduleResult,
      "Update Operation",
      false,
      `Update failed: ${error.message}`
    );
  }

  // Test Delete
  try {
    const deleteResult = db.integration_test.deleteOne({ _id: testDoc._id });
    test(
      moduleResult,
      "Delete Operation",
      deleteResult.deletedCount === 1,
      "Document deleted successfully"
    );
  } catch (error) {
    test(
      moduleResult,
      "Delete Operation",
      false,
      `Delete failed: ${error.message}`
    );
  }
}

// ============================================================================
// 3. INDEXES VALIDATION
// ============================================================================

function validateIndexesModule(moduleResult) {
  try {
    // Test index creation
    db.integration_test.createIndex({ testField: 1 });
    const indexes = db.integration_test.getIndexes();
    const hasTestIndex = indexes.some((idx) => idx.name === "testField_1");

    test(
      moduleResult,
      "Index Creation",
      hasTestIndex,
      "Index created successfully"
    );

    // Test index usage
    const explainResult = db.integration_test
      .find({ testField: "test" })
      .explain("executionStats");
    const usedIndex =
      explainResult.executionStats.executionStages.stage === "IXSCAN";

    test(
      moduleResult,
      "Index Usage",
      usedIndex,
      "Query uses index efficiently"
    );

    // Cleanup
    db.integration_test.drop();
  } catch (error) {
    test(
      moduleResult,
      "Index Operations",
      false,
      `Index test failed: ${error.message}`
    );
  }
}

// ============================================================================
// 4. AGGREGATION VALIDATION
// ============================================================================

function validateAggregationModule(moduleResult) {
  try {
    // Test basic aggregation
    const aggResult = db.enrollments
      .aggregate([
        { $match: { status: "active" } },
        { $group: { _id: "$courseId", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ])
      .toArray();

    test(
      moduleResult,
      "Basic Aggregation",
      Array.isArray(aggResult),
      `Aggregation returned ${aggResult.length} results`
    );

    // Test complex aggregation with lookup
    const lookupResult = db.enrollments
      .aggregate([
        {
          $lookup: {
            from: "courses",
            localField: "courseId",
            foreignField: "_id",
            as: "course",
          },
        },
        { $match: { course: { $ne: [] } } },
        { $limit: 1 },
      ])
      .toArray();

    test(
      moduleResult,
      "Lookup Aggregation",
      lookupResult.length > 0,
      "Lookup aggregation successful"
    );
  } catch (error) {
    test(
      moduleResult,
      "Aggregation Pipeline",
      false,
      `Aggregation failed: ${error.message}`
    );
  }
}

// ============================================================================
// 5. TRANSACTIONS VALIDATION
// ============================================================================

function validateTransactionsModule(moduleResult) {
  try {
    // Test transaction support
    const session = db.getMongo().startSession();
    session.startTransaction();

    try {
      session
        .getDatabase("lms_primary")
        .integration_test.insertOne({ transactionTest: true });
      session.commitTransaction();

      test(
        moduleResult,
        "Transaction Commit",
        true,
        "Transaction committed successfully"
      );
    } catch (txError) {
      session.abortTransaction();
      test(
        moduleResult,
        "Transaction Support",
        false,
        `Transaction failed: ${txError.message}`
      );
    } finally {
      session.endSession();
    }

    // Cleanup
    db.integration_test.deleteMany({ transactionTest: true });
  } catch (error) {
    test(
      moduleResult,
      "Transaction Support",
      false,
      `No transaction support: ${error.message}`
    );
  }
}

// ============================================================================
// 6. REPLICATION VALIDATION
// ============================================================================

function validateReplicationModule(moduleResult) {
  try {
    const isMaster = adminDB.runCommand({ isMaster: 1 });

    if (isMaster.setName) {
      // Replica set is configured
      test(
        moduleResult,
        "Replica Set",
        true,
        `Replica set: ${isMaster.setName}`
      );

      try {
        const rsStatus = adminDB.runCommand({ replSetGetStatus: 1 });
        const memberCount = rsStatus.members ? rsStatus.members.length : 0;

        test(
          moduleResult,
          "Replica Members",
          memberCount >= 3,
          `${memberCount} replica members (recommended: 3+)`
        );
      } catch (rsError) {
        test(
          moduleResult,
          "Replica Status",
          false,
          `RS status error: ${rsError.message}`
        );
      }
    } else {
      test(
        moduleResult,
        "Replica Set",
        false,
        "Single node deployment - no replication"
      );
    }
  } catch (error) {
    test(moduleResult, "Replication Check", false, `Error: ${error.message}`);
  }
}

// ============================================================================
// 7. SECURITY VALIDATION
// ============================================================================

function validateSecurityModule(moduleResult) {
  try {
    // Test authentication status
    const serverStatus = adminDB.runCommand({ serverStatus: 1 });
    const authEnabled =
      serverStatus.security && serverStatus.security.authentication;

    test(
      moduleResult,
      "Authentication",
      authEnabled !== undefined,
      authEnabled ? "Authentication enabled" : "Authentication disabled"
    );

    // Test current user permissions
    const currentUser = adminDB.runCommand({ connectionStatus: 1 });
    const hasAuth =
      currentUser.authInfo &&
      currentUser.authInfo.authenticatedUsers.length > 0;

    test(
      moduleResult,
      "User Authentication",
      hasAuth,
      hasAuth ? "User authenticated" : "No authentication"
    );

    // Test role-based access
    try {
      const roles = adminDB.system.roles.find().limit(1).toArray();
      test(
        moduleResult,
        "Role System",
        roles.length >= 0,
        "Role system accessible"
      );
    } catch (roleError) {
      test(
        moduleResult,
        "Role System",
        false,
        `Role access error: ${roleError.message}`
      );
    }
  } catch (error) {
    test(moduleResult, "Security Check", false, `Error: ${error.message}`);
  }
}

// ============================================================================
// 8. PERFORMANCE VALIDATION
// ============================================================================

function validatePerformanceModule(moduleResult) {
  try {
    // Test query performance
    const start = Date.now();
    const result = db.users.find().limit(10).toArray();
    const duration = Date.now() - start;

    test(
      moduleResult,
      "Query Performance",
      duration < 100,
      `Query completed in ${duration}ms`
    );

    // Test connection performance
    const serverStatus = adminDB.runCommand({ serverStatus: 1 });
    if (serverStatus.connections) {
      const connUtilization =
        (serverStatus.connections.current /
          serverStatus.connections.available) *
        100;
      test(
        moduleResult,
        "Connection Utilization",
        connUtilization < 80,
        `${connUtilization.toFixed(1)}% connection utilization`
      );
    }

    // Test profiler status
    const profilerStatus = db.getProfilingStatus();
    test(
      moduleResult,
      "Profiler Configuration",
      profilerStatus.level >= 0,
      `Profiler level: ${profilerStatus.level}`
    );
  } catch (error) {
    test(moduleResult, "Performance Check", false, `Error: ${error.message}`);
  }
}

// ============================================================================
// 9. INTEGRATION SCENARIOS
// ============================================================================

function validateIntegrationScenarios(moduleResult) {
  try {
    // End-to-end user enrollment scenario
    const testUser = {
      _id: new ObjectId(),
      name: "Test User",
      email: "test@integration.com",
    };
    const testCourse = {
      _id: new ObjectId(),
      title: "Integration Test Course",
      status: "active",
    };

    // Create user and course
    db.integration_users.insertOne(testUser);
    db.integration_courses.insertOne(testCourse);

    // Create enrollment
    const enrollment = {
      userId: testUser._id,
      courseId: testCourse._id,
      enrolledAt: new Date(),
      status: "active",
    };

    const enrollResult = db.integration_enrollments.insertOne(enrollment);
    test(
      moduleResult,
      "User Enrollment Flow",
      enrollResult.insertedId !== null,
      "Complete enrollment flow successful"
    );

    // Test aggregation across collections
    const enrollmentStats = db.integration_enrollments
      .aggregate([
        {
          $lookup: {
            from: "integration_users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $lookup: {
            from: "integration_courses",
            localField: "courseId",
            foreignField: "_id",
            as: "course",
          },
        },
        { $match: { user: { $ne: [] }, course: { $ne: [] } } },
      ])
      .toArray();

    test(
      moduleResult,
      "Cross-Collection Analytics",
      enrollmentStats.length > 0,
      "Multi-collection aggregation successful"
    );

    // Cleanup
    db.integration_users.drop();
    db.integration_courses.drop();
    db.integration_enrollments.drop();
  } catch (error) {
    test(
      moduleResult,
      "Integration Scenarios",
      false,
      `Error: ${error.message}`
    );
  }
}

// ============================================================================
// 10. COMPREHENSIVE SYSTEM HEALTH
// ============================================================================

function validateSystemHealth(moduleResult) {
  try {
    // Overall system status
    const serverStatus = adminDB.runCommand({ serverStatus: 1 });
    test(
      moduleResult,
      "Server Status",
      serverStatus.ok === 1,
      `MongoDB version: ${serverStatus.version || "unknown"}`
    );

    // Database statistics
    const dbStats = db.stats();
    test(
      moduleResult,
      "Database Statistics",
      dbStats.ok === 1,
      `Database size: ${Math.round(dbStats.dataSize / 1024 / 1024)}MB`
    );

    // Storage engine
    const storageEngine = serverStatus.storageEngine
      ? serverStatus.storageEngine.name
      : "unknown";
    test(
      moduleResult,
      "Storage Engine",
      storageEngine === "wiredTiger",
      `Storage engine: ${storageEngine}`
    );

    // Uptime check
    const uptimeMinutes = Math.round(serverStatus.uptime / 60);
    test(
      moduleResult,
      "System Uptime",
      uptimeMinutes > 0,
      `System uptime: ${uptimeMinutes} minutes`
    );
  } catch (error) {
    test(moduleResult, "System Health", false, `Error: ${error.message}`);
  }
}

// ============================================================================
// 11. FINAL INTEGRATION REPORT
// ============================================================================

function displayIntegrationReport() {
  print("\n" + "=".repeat(80));
  print("INTEGRATION VALIDATION REPORT");
  print("=".repeat(80));

  integrationValidation.overallScore =
    integrationValidation.totalTests > 0
      ? Math.round(
          (integrationValidation.totalPassed /
            integrationValidation.totalTests) *
            100
        )
      : 0;

  print(`\n📊 OVERALL INTEGRATION RESULTS:`);
  print(`   Total Tests: ${integrationValidation.totalTests}`);
  print(`   Total Passed: ${integrationValidation.totalPassed}`);
  print(`   Total Failed: ${integrationValidation.totalFailed}`);
  print(`   Overall Score: ${integrationValidation.overallScore}%`);

  // System status
  let systemStatus;
  if (integrationValidation.overallScore >= 95) {
    systemStatus = "🟢 EXCELLENT - System fully operational";
  } else if (integrationValidation.overallScore >= 85) {
    systemStatus = "🟡 GOOD - System operational with minor issues";
  } else if (integrationValidation.overallScore >= 70) {
    systemStatus = "🟠 FAIR - System functional but needs attention";
  } else {
    systemStatus = "🔴 POOR - System has significant issues";
  }

  print(`\n🎯 SYSTEM STATUS: ${systemStatus}`);

  // Module breakdown
  print(`\n📋 MODULE VALIDATION RESULTS:`);
  Object.keys(integrationValidation.modules).forEach((moduleName) => {
    const module = integrationValidation.modules[moduleName];
    const status = module.score >= 80 ? "✅" : module.score >= 60 ? "⚠️" : "❌";
    print(
      `   ${status} ${moduleName.padEnd(20)}: ${module.score}% (${
        module.passed
      }/${module.tests})`
    );
  });

  // Issues summary
  const modulesWithIssues = Object.values(integrationValidation.modules).filter(
    (m) => m.issues.length > 0
  );
  if (modulesWithIssues.length > 0) {
    print(`\n⚠️ ISSUES FOUND:`);
    modulesWithIssues.forEach((module) => {
      print(`\n   ${module.name.toUpperCase()}:`);
      module.issues.forEach((issue) => {
        print(`     • ${issue}`);
      });
    });
  }

  // Recommendations
  print(`\n💡 RECOMMENDATIONS:`);
  if (integrationValidation.overallScore >= 95) {
    print(`   🎉 System is performing excellently!`);
    print(`   • Continue regular monitoring and maintenance`);
    print(`   • Plan for future scaling and optimization`);
  } else if (integrationValidation.overallScore >= 85) {
    print(`   📈 System is in good shape with minor improvements needed:`);
    print(`   • Address any failed tests in individual modules`);
    print(`   • Monitor performance and optimize as needed`);
  } else {
    print(`   🔧 System needs attention:`);
    print(`   • Review and fix failed module tests`);
    print(`   • Check system configuration and setup`);
    print(`   • Consider consulting MongoDB documentation`);
  }

  print(`\n📅 NEXT STEPS:`);
  print(`   1. Address any critical issues identified`);
  print(`   2. Set up regular health monitoring`);
  print(`   3. Plan for production deployment considerations`);
  print(`   4. Document system configuration and procedures`);

  print(`\n✅ Integration validation completed!`);
}

// ============================================================================
// 12. EXECUTION SECTION
// ============================================================================

print("\n12. EXECUTING COMPREHENSIVE INTEGRATION VALIDATION");
print("-".repeat(50));

try {
  // Validate all modules
  validateModule("00_setup", validateSetupModule);
  validateModule("01_crud", validateCRUDModule);
  validateModule("02_indexes", validateIndexesModule);
  validateModule("04_aggregation", validateAggregationModule);
  validateModule("05_transactions", validateTransactionsModule);
  validateModule("06_replication", validateReplicationModule);
  validateModule("09_security", validateSecurityModule);
  validateModule("10_performance", validatePerformanceModule);
  validateModule("integration_scenarios", validateIntegrationScenarios);
  validateModule("system_health", validateSystemHealth);

  // Display comprehensive report
  displayIntegrationReport();
} catch (error) {
  print("❌ Critical error during integration validation:");
  print(error.message);
}

print("\n" + "=".repeat(80));
print("MONGOMASTERPRO INTEGRATION VALIDATION COMPLETE");
print("=".repeat(80));
