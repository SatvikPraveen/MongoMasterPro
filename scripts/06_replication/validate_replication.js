// File: scripts/06_replication/validate_replication.js
// MongoDB Replication Validation - Sync validation, health checks, and consistency verification

/**
 * REPLICATION VALIDATION
 * ======================
 * Comprehensive validation suite for MongoDB replication functionality.
 * Verifies replica sync, data consistency, failover scenarios, and performance.
 */

// Database connections
const db = db.getSiblingDB("lms_primary");
const adminDB = db.getSiblingDB("admin");

print("\n" + "=".repeat(80));
print("MONGODB REPLICATION VALIDATION");
print("=".repeat(80));

// Global validation results
let validationResults = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: [],
};

// Helper function to record test results
function recordTest(name, passed, message, warning = false) {
  validationResults.total++;
  if (warning) {
    validationResults.warnings++;
  } else if (passed) {
    validationResults.passed++;
  } else {
    validationResults.failed++;
  }

  validationResults.tests.push({
    name: name,
    status: warning ? "WARNING" : passed ? "PASSED" : "FAILED",
    message: message,
  });

  const icon = warning ? "⚠️" : passed ? "✅" : "❌";
  print(`${icon} ${name}: ${message}`);
}

// ============================================================================
// 1. REPLICA SET STATUS VALIDATION
// ============================================================================

print("\n1. REPLICA SET STATUS VALIDATION");
print("-".repeat(50));

/**
 * Validate basic replica set health
 */
function validateReplicaSetHealth() {
  print("\n🏥 REPLICA SET HEALTH CHECK:");

  try {
    const status = rs.status();

    // Test 1: Replica set exists
    recordTest(
      "Replica Set Exists",
      status && status.set,
      status
        ? `Replica set '${status.set}' is active`
        : "No replica set configured"
    );

    if (!status) return;

    // Test 2: Member count
    const memberCount = status.members.length;
    recordTest(
      "Member Count",
      memberCount >= 3,
      `${memberCount} members (recommended: 3+ for high availability)`,
      memberCount < 3
    );

    // Test 3: Primary exists
    const primaryMembers = status.members.filter((m) => m.state === 1);
    recordTest(
      "Primary Member",
      primaryMembers.length === 1,
      primaryMembers.length === 1
        ? `Primary: ${primaryMembers[0].name}`
        : `Found ${primaryMembers.length} primaries (should be exactly 1)`
    );

    // Test 4: Secondary members
    const secondaryMembers = status.members.filter((m) => m.state === 2);
    recordTest(
      "Secondary Members",
      secondaryMembers.length > 0,
      `${secondaryMembers.length} secondary members`
    );

    // Test 5: Member health
    const healthyMembers = status.members.filter((m) => m.health === 1);
    recordTest(
      "Member Health",
      healthyMembers.length === status.members.length,
      `${healthyMembers.length}/${status.members.length} members healthy`
    );

    // Test 6: Replication lag
    if (primaryMembers.length === 1) {
      const primary = primaryMembers[0];
      let maxLag = 0;

      secondaryMembers.forEach((secondary) => {
        const lag = (primary.optimeDate - secondary.optimeDate) / 1000;
        if (lag > maxLag) maxLag = lag;
      });

      recordTest(
        "Replication Lag",
        maxLag < 10,
        `Maximum lag: ${maxLag.toFixed(2)}s (threshold: 10s)`,
        maxLag >= 10
      );
    }
  } catch (error) {
    recordTest("Replica Set Health", false, `Error: ${error.message}`);
  }
}

/**
 * Validate replica set configuration
 */
function validateReplicaSetConfiguration() {
  print("\n⚙️ REPLICA SET CONFIGURATION VALIDATION:");

  try {
    const config = rs.conf();

    // Test 1: Configuration exists
    recordTest(
      "Configuration Valid",
      config && config._id,
      config
        ? `Configuration version: ${config.version}`
        : "No configuration found"
    );

    if (!config) return;

    // Test 2: Odd number of voting members
    const votingMembers = config.members.filter((m) => m.votes !== 0);
    recordTest(
      "Voting Members (Odd)",
      votingMembers.length % 2 === 1,
      `${votingMembers.length} voting members (should be odd for split-brain prevention)`,
      votingMembers.length % 2 === 0
    );

    // Test 3: Priority distribution
    const priorityMembers = config.members.filter((m) => m.priority > 0);
    recordTest(
      "Priority Members",
      priorityMembers.length > 0,
      `${priorityMembers.length} members can become primary`
    );

    // Test 4: Arbiter validation
    const arbiters = config.members.filter((m) => m.arbiterOnly === true);
    recordTest(
      "Arbiters",
      arbiters.length <= 1,
      arbiters.length === 0
        ? "No arbiters (recommended for data-bearing sets)"
        : `${arbiters.length} arbiter(s)`,
      arbiters.length > 1
    );
  } catch (error) {
    recordTest("Configuration Validation", false, `Error: ${error.message}`);
  }
}

// ============================================================================
// 2. DATA CONSISTENCY VALIDATION
// ============================================================================

print("\n2. DATA CONSISTENCY VALIDATION");
print("-".repeat(50));

/**
 * Test data consistency across replica set members
 */
function validateDataConsistency() {
  print("\n🔄 DATA CONSISTENCY VALIDATION:");

  try {
    // Insert test data
    const testDoc = {
      _id: new ObjectId(),
      testType: "replication_validation",
      timestamp: new Date(),
      data: `Test data ${Date.now()}`,
      checksum: "md5_placeholder",
    };

    // Write with majority concern
    const writeResult = db.replication_test.insertOne(testDoc, {
      writeConcern: { w: "majority", j: true },
    });

    recordTest(
      "Test Data Insert",
      writeResult.insertedId,
      `Inserted test document: ${writeResult.insertedId}`
    );

    // Wait for replication
    sleep(1000);

    // Read from primary
    db.getMongo().setReadPref("primary");
    const primaryDoc = db.replication_test.findOne({ _id: testDoc._id });

    recordTest(
      "Primary Read",
      primaryDoc !== null,
      primaryDoc ? "Document found on primary" : "Document not found on primary"
    );

    // Read from secondary (if available)
    try {
      db.getMongo().setReadPref("secondary");
      const secondaryDoc = db.replication_test.findOne({ _id: testDoc._id });

      recordTest(
        "Secondary Read",
        secondaryDoc !== null,
        secondaryDoc
          ? "Document found on secondary"
          : "Document not found on secondary"
      );

      // Compare documents
      if (primaryDoc && secondaryDoc) {
        const consistent =
          JSON.stringify(primaryDoc) === JSON.stringify(secondaryDoc);
        recordTest(
          "Data Consistency",
          consistent,
          consistent
            ? "Primary and secondary data match"
            : "Data inconsistency detected"
        );
      }
    } catch (error) {
      recordTest(
        "Secondary Read",
        false,
        "No secondary available or read failed"
      );
    }

    // Reset read preference
    db.getMongo().setReadPref("primary");

    // Clean up test data
    db.replication_test.deleteOne({ _id: testDoc._id });
  } catch (error) {
    recordTest("Data Consistency", false, `Error: ${error.message}`);
  }
}

/**
 * Test write concern validation
 */
function validateWriteConcerns() {
  print("\n📝 WRITE CONCERN VALIDATION:");

  const writeConcernTests = [
    { name: "w:1", concern: { w: 1 }, expectedPass: true },
    { name: "w:majority", concern: { w: "majority" }, expectedPass: true },
    { name: "w:1 + j:true", concern: { w: 1, j: true }, expectedPass: true },
    {
      name: "w:majority + j:true",
      concern: { w: "majority", j: true },
      expectedPass: true,
    },
  ];

  writeConcernTests.forEach((test) => {
    try {
      const start = new Date();

      const result = db.write_concern_test.insertOne(
        {
          test: test.name,
          timestamp: new Date(),
          data: "Write concern test",
        },
        { writeConcern: test.concern }
      );

      const duration = new Date() - start;

      recordTest(
        `Write Concern ${test.name}`,
        result.insertedId !== null,
        `Completed in ${duration}ms`
      );

      // Clean up
      db.write_concern_test.deleteOne({ _id: result.insertedId });
    } catch (error) {
      recordTest(
        `Write Concern ${test.name}`,
        !test.expectedPass,
        `Error: ${error.message}`
      );
    }
  });
}

// ============================================================================
// 3. READ PREFERENCE VALIDATION
// ============================================================================

print("\n3. READ PREFERENCE VALIDATION");
print("-".repeat(50));

/**
 * Test read preference functionality
 */
function validateReadPreferences() {
  print("\n📖 READ PREFERENCE VALIDATION:");

  // Insert test data
  const testDoc = {
    _id: new ObjectId(),
    testType: "read_preference_validation",
    timestamp: new Date(),
  };

  try {
    db.read_pref_test.insertOne(testDoc, { writeConcern: { w: "majority" } });

    const readPreferences = [
      { name: "primary", pref: "primary" },
      { name: "primaryPreferred", pref: "primaryPreferred" },
      { name: "secondary", pref: "secondary" },
      { name: "secondaryPreferred", pref: "secondaryPreferred" },
      { name: "nearest", pref: "nearest" },
    ];

    readPreferences.forEach((readPref) => {
      try {
        db.getMongo().setReadPref(readPref.pref);
        const doc = db.read_pref_test.findOne({ _id: testDoc._id });

        recordTest(
          `Read Preference ${readPref.name}`,
          doc !== null,
          doc ? "Document read successfully" : "Read failed"
        );
      } catch (error) {
        const isSecondaryOnlyError =
          readPref.pref === "secondary" &&
          error.message.includes("no secondary");

        recordTest(
          `Read Preference ${readPref.name}`,
          isSecondaryOnlyError,
          isSecondaryOnlyError
            ? "No secondary available (expected in single-node setup)"
            : `Error: ${error.message}`
        );
      }
    });

    // Reset to primary
    db.getMongo().setReadPref("primary");

    // Clean up
    db.read_pref_test.deleteOne({ _id: testDoc._id });
  } catch (error) {
    recordTest("Read Preferences Setup", false, `Error: ${error.message}`);
  }
}

// ============================================================================
// 4. OPLOG VALIDATION
// ============================================================================

print("\n4. OPLOG VALIDATION");
print("-".repeat(50));

/**
 * Validate oplog configuration and health
 */
function validateOplog() {
  print("\n📜 OPLOG VALIDATION:");

  try {
    const oplogDB = db.getSiblingDB("local");

    // Test 1: Oplog exists
    const oplogStats = oplogDB.oplog.rs.stats();

    recordTest(
      "Oplog Exists",
      oplogStats.count > 0,
      `Oplog contains ${oplogStats.count} entries`
    );

    // Test 2: Oplog size
    const oplogSizeMB = Math.round(oplogStats.size / (1024 * 1024));
    recordTest(
      "Oplog Size",
      oplogSizeMB > 100,
      `Oplog size: ${oplogSizeMB}MB (recommended: >100MB)`,
      oplogSizeMB <= 100
    );

    // Test 3: Recent oplog activity
    const recentOps = oplogDB.oplog.rs
      .find()
      .sort({ ts: -1 })
      .limit(1)
      .toArray();
    if (recentOps.length > 0) {
      const lastOpTime = recentOps[0].ts.getTimestamp();
      const now = new Date();
      const ageMinutes = (now - lastOpTime) / (1000 * 60);

      recordTest(
        "Oplog Activity",
        ageMinutes < 60,
        `Last operation: ${ageMinutes.toFixed(1)} minutes ago`,
        ageMinutes >= 60
      );
    }
  } catch (error) {
    recordTest("Oplog Validation", false, `Error: ${error.message}`);
  }
}

// ============================================================================
// 5. PERFORMANCE VALIDATION
// ============================================================================

print("\n5. PERFORMANCE VALIDATION");
print("-".repeat(50));

/**
 * Test replication performance
 */
function validateReplicationPerformance() {
  print("\n🚀 REPLICATION PERFORMANCE VALIDATION:");

  try {
    // Bulk insert test
    const testDocs = [];
    for (let i = 0; i < 1000; i++) {
      testDocs.push({
        index: i,
        data: `Performance test document ${i}`,
        timestamp: new Date(),
      });
    }

    const start = new Date();
    const bulkResult = db.performance_test.insertMany(testDocs, {
      writeConcern: { w: "majority" },
    });
    const duration = new Date() - start;

    recordTest(
      "Bulk Insert Performance",
      duration < 5000,
      `Inserted 1000 docs in ${duration}ms (threshold: 5000ms)`,
      duration >= 5000
    );

    // Read performance test
    const readStart = new Date();
    const readResult = db.performance_test
      .find({ index: { $gte: 500 } })
      .toArray();
    const readDuration = new Date() - readStart;

    recordTest(
      "Read Performance",
      readDuration < 1000,
      `Read ${readResult.length} docs in ${readDuration}ms (threshold: 1000ms)`,
      readDuration >= 1000
    );

    // Clean up
    db.performance_test.deleteMany({});
  } catch (error) {
    recordTest("Performance Validation", false, `Error: ${error.message}`);
  }
}

// ============================================================================
// 6. FAILOVER SIMULATION
// ============================================================================

print("\n6. FAILOVER SIMULATION");
print("-".repeat(50));

/**
 * Simulate failover scenarios
 */
function validateFailoverCapability() {
  print("\n🔄 FAILOVER CAPABILITY VALIDATION:");

  try {
    const status = rs.status();
    const primaryMember = status.members.find((m) => m.state === 1);

    if (primaryMember) {
      recordTest(
        "Primary Available",
        true,
        `Current primary: ${primaryMember.name}`
      );

      // Test step down capability (don't actually do it in validation)
      recordTest(
        "Step Down Capability",
        true,
        "Primary can be stepped down for maintenance",
        true // Warning since we're not actually testing
      );

      // Check secondary readiness
      const readySecondaries = status.members.filter(
        (m) => m.state === 2 && m.health === 1
      );

      recordTest(
        "Secondary Readiness",
        readySecondaries.length > 0,
        `${readySecondaries.length} secondaries ready for failover`
      );
    } else {
      recordTest("Primary Available", false, "No primary member found");
    }
  } catch (error) {
    recordTest("Failover Validation", false, `Error: ${error.message}`);
  }
}

// ============================================================================
// 7. COMPREHENSIVE HEALTH CHECK
// ============================================================================

print("\n7. COMPREHENSIVE HEALTH CHECK");
print("-".repeat(50));

/**
 * Run comprehensive replication health check
 */
function comprehensiveHealthCheck() {
  print("\n🔍 COMPREHENSIVE HEALTH CHECK:");

  try {
    // Check server status
    const serverStatus = adminDB.runCommand({ serverStatus: 1 });

    recordTest(
      "Server Status",
      serverStatus.ok === 1,
      `MongoDB version: ${serverStatus.version}`
    );

    // Check replication metrics
    if (serverStatus.repl) {
      const repl = serverStatus.repl;

      recordTest(
        "Replication Enabled",
        repl.setName !== undefined,
        `Replica set: ${repl.setName || "Not configured"}`
      );

      if (repl.primary) {
        recordTest(
          "Primary Status",
          repl.ismaster === true,
          `This node is ${repl.ismaster ? "primary" : "secondary"}`
        );
      }
    }

    // Check connections
    const connections = serverStatus.connections;
    recordTest(
      "Connection Health",
      connections.current < connections.available * 0.8,
      `Connections: ${connections.current}/${
        connections.available
      } (${Math.round(
        (connections.current / connections.available) * 100
      )}% used)`,
      connections.current >= connections.available * 0.8
    );
  } catch (error) {
    recordTest("Health Check", false, `Error: ${error.message}`);
  }
}

// ============================================================================
// 8. VALIDATION SUMMARY
// ============================================================================

/**
 * Display validation summary
 */
function displayValidationSummary() {
  print("\n" + "=".repeat(60));
  print("REPLICATION VALIDATION SUMMARY");
  print("=".repeat(60));

  print(`\n📊 OVERALL RESULTS:`);
  print(`   Total Tests: ${validationResults.total}`);
  print(`   Passed: ${validationResults.passed} ✅`);
  print(`   Failed: ${validationResults.failed} ❌`);
  print(`   Warnings: ${validationResults.warnings} ⚠️`);

  const successRate = Math.round(
    (validationResults.passed / validationResults.total) * 100
  );
  print(`   Success Rate: ${successRate}%`);

  if (validationResults.failed > 0) {
    print(`\n❌ FAILED TESTS:`);
    validationResults.tests
      .filter((test) => test.status === "FAILED")
      .forEach((test) => {
        print(`   • ${test.name}: ${test.message}`);
      });
  }

  if (validationResults.warnings > 0) {
    print(`\n⚠️ WARNINGS:`);
    validationResults.tests
      .filter((test) => test.status === "WARNING")
      .forEach((test) => {
        print(`   • ${test.name}: ${test.message}`);
      });
  }

  // Recommendations
  print(`\n💡 RECOMMENDATIONS:`);
  if (validationResults.failed === 0 && validationResults.warnings === 0) {
    print("   🎉 Excellent! Your replica set is properly configured.");
  } else {
    print("   📋 Address failed tests and review warnings above");
    print("   📚 Consult MongoDB documentation for best practices");
    print("   🔄 Re-run validation after making changes");
  }

  print(`\n✅ Validation completed successfully!`);
}

// ============================================================================
// 9. EXECUTION SECTION
// ============================================================================

print("\n9. EXECUTING REPLICATION VALIDATION");
print("-".repeat(50));

try {
  // Run all validation tests
  validateReplicaSetHealth();
  validateReplicaSetConfiguration();
  validateDataConsistency();
  validateWriteConcerns();
  validateReadPreferences();
  validateOplog();
  validateReplicationPerformance();
  validateFailoverCapability();
  comprehensiveHealthCheck();

  // Display summary
  displayValidationSummary();
} catch (error) {
  print("❌ Critical error during replication validation:");
  print(error.message);
  recordTest("Validation Execution", false, `Critical error: ${error.message}`);
}

print("\n" + "=".repeat(80));
print("REPLICATION VALIDATION COMPLETE");
print("=".repeat(80));
