// File: scripts/06_replication/write_concerns.js
// MongoDB Write Concerns - w:majority, journaling, and write acknowledgment

/**
 * WRITE CONCERNS
 * ==============
 * Comprehensive guide to MongoDB write concerns and write acknowledgment strategies.
 * Covers w:1, w:majority, j:true, and wtimeout configurations for data durability.
 */

// Database connections
const db = db.getSiblingDB("lms_primary");

print("\n" + "=".repeat(80));
print("MONGODB WRITE CONCERNS");
print("=".repeat(80));

// ============================================================================
// 1. BASIC WRITE CONCERNS
// ============================================================================

print("\n1. BASIC WRITE CONCERNS");
print("-".repeat(50));

/**
 * w:1 - Acknowledge from primary only (default)
 */
function demonstrateW1WriteConcern() {
  print("\n📝 W:1 WRITE CONCERN (Default):");
  print("Acknowledgment from primary only");

  try {
    const start = new Date();

    const result = db.users.insertOne(
      {
        name: "John W1",
        email: "john.w1@example.com",
        role: "student",
        createdAt: new Date(),
        writeConcern: "w:1",
      },
      { writeConcern: { w: 1 } }
    );

    const end = new Date();

    print(`✅ W:1 write completed in ${end - start}ms`);
    print(`Inserted ID: ${result.insertedId}`);
    print("⚠️ No guarantee of replication to secondaries yet");
  } catch (error) {
    print("❌ W:1 write failed:");
    print(error.message);
  }
}

/**
 * w:"majority" - Acknowledge from majority of members
 */
function demonstrateMajorityWriteConcern() {
  print("\n📝 W:MAJORITY WRITE CONCERN:");
  print("Acknowledgment from majority of replica set members");

  try {
    const start = new Date();

    const result = db.users.insertOne(
      {
        name: "Jane Majority",
        email: "jane.majority@example.com",
        role: "instructor",
        createdAt: new Date(),
        writeConcern: "w:majority",
      },
      { writeConcern: { w: "majority" } }
    );

    const end = new Date();

    print(`✅ W:majority write completed in ${end - start}ms`);
    print(`Inserted ID: ${result.insertedId}`);
    print("✅ Guaranteed replication to majority of members");
  } catch (error) {
    print("❌ W:majority write failed:");
    print(error.message);
  }
}

/**
 * w:0 - No acknowledgment (fire and forget)
 */
function demonstrateW0WriteConcern() {
  print("\n📝 W:0 WRITE CONCERN (Unacknowledged):");
  print("No acknowledgment - fire and forget");

  try {
    const start = new Date();

    // Note: w:0 doesn't return detailed result
    db.logs.insertOne(
      {
        level: "info",
        message: "Fire and forget log entry",
        timestamp: new Date(),
        writeConcern: "w:0",
      },
      { writeConcern: { w: 0 } }
    );

    const end = new Date();

    print(`✅ W:0 write dispatched in ${end - start}ms`);
    print("⚠️ No acknowledgment - fastest but least safe");
  } catch (error) {
    print("❌ W:0 write failed:");
    print(error.message);
  }
}

// ============================================================================
// 2. JOURNALED WRITES
// ============================================================================

print("\n2. JOURNALED WRITES");
print("-".repeat(50));

/**
 * j:true - Wait for journal acknowledgment
 */
function demonstrateJournaledWrites() {
  print("\n💾 JOURNALED WRITES (j:true):");
  print("Wait for write to be written to journal");

  try {
    const start = new Date();

    const result = db.financial_transactions.insertOne(
      {
        userId: new ObjectId(),
        amount: 299.99,
        type: "course_purchase",
        courseId: new ObjectId(),
        timestamp: new Date(),
        status: "completed",
      },
      { writeConcern: { w: 1, j: true } }
    );

    const end = new Date();

    print(`✅ Journaled write completed in ${end - start}ms`);
    print(`Transaction ID: ${result.insertedId}`);
    print("✅ Write durably committed to journal");

    // Combine with majority
    const majorityJournaled = db.financial_transactions.insertOne(
      {
        userId: new ObjectId(),
        amount: 499.99,
        type: "course_purchase",
        courseId: new ObjectId(),
        timestamp: new Date(),
        status: "completed",
      },
      { writeConcern: { w: "majority", j: true } }
    );

    print("✅ W:majority + j:true - Maximum durability");
  } catch (error) {
    print("❌ Journaled write failed:");
    print(error.message);
  }
}

// ============================================================================
// 3. WRITE TIMEOUTS
// ============================================================================

print("\n3. WRITE TIMEOUTS");
print("-".repeat(50));

/**
 * wtimeout - Timeout for write concern acknowledgment
 */
function demonstrateWriteTimeouts() {
  print("\n⏱️ WRITE TIMEOUTS:");
  print("Timeout configuration for write acknowledgments");

  try {
    // Fast timeout - may fail if secondaries are slow
    const fastTimeout = 100; // 100ms

    try {
      const result = db.users.insertOne(
        {
          name: "Speed Test",
          email: "speed@example.com",
          role: "student",
          createdAt: new Date(),
        },
        {
          writeConcern: {
            w: "majority",
            wtimeout: fastTimeout,
          },
        }
      );

      print(`✅ Fast write (${fastTimeout}ms timeout) succeeded`);
    } catch (timeoutError) {
      print(`⚠️ Fast write timed out after ${fastTimeout}ms`);
      print("This is expected if secondaries are slow");
    }

    // Reasonable timeout
    const reasonableTimeout = 5000; // 5 seconds

    const result = db.users.insertOne(
      {
        name: "Reasonable Test",
        email: "reasonable@example.com",
        role: "student",
        createdAt: new Date(),
      },
      {
        writeConcern: {
          w: "majority",
          wtimeout: reasonableTimeout,
        },
      }
    );

    print(`✅ Reasonable timeout (${reasonableTimeout}ms) succeeded`);
  } catch (error) {
    print("❌ Write timeout demonstration failed:");
    print(error.message);
  }
}

// ============================================================================
// 4. CUSTOM WRITE CONCERN RULES
// ============================================================================

print("\n4. CUSTOM WRITE CONCERN RULES");
print("-".repeat(50));

/**
 * Configure custom write concern rules
 */
function configureCustomWriteConcerns() {
  print("\n⚙️ CUSTOM WRITE CONCERN RULES:");

  const customRules = {
    datacenterMajority: {
      description: "Majority from each datacenter",
      rule: {
        "datacenter.us-east": 1,
        "datacenter.us-west": 1,
      },
    },
    allSecondaries: {
      description: "All secondary members",
      rule: {
        secondary: "all",
      },
    },
    journalMajority: {
      description: "Majority with journal",
      rule: {
        w: "majority",
        j: true,
        wtimeout: 5000,
      },
    },
  };

  print("Available custom write concern patterns:");
  Object.keys(customRules).forEach((ruleName) => {
    const rule = customRules[ruleName];
    print(`\n${ruleName}:`);
    print(`  Description: ${rule.description}`);
    print(`  Rule: ${JSON.stringify(rule.rule, null, 4)}`);
  });

  print("\n💡 To configure custom rules:");
  print("db.adminCommand({");
  print("  setDefaultRWConcern: 1,");
  print("  defaultWriteConcern: { w: 'majority', j: true }");
  print("});");
}

/**
 * Demonstrate tag-based write concerns
 */
function demonstrateTagBasedWriteConcerns() {
  print("\n🏷️ TAG-BASED WRITE CONCERNS:");

  try {
    // Example: Require write to at least one member in each datacenter
    const result = db.critical_data.insertOne(
      {
        type: "user_preferences",
        userId: new ObjectId(),
        settings: {
          notifications: true,
          privacy: "public",
          theme: "dark",
        },
        lastModified: new Date(),
      },
      {
        writeConcern: {
          w: 2, // At least 2 members
          wtimeout: 5000,
        },
      }
    );

    print("✅ Tag-based write concern example completed");
    print("💡 In production, configure replica set members with tags:");
    print("   { datacenter: 'us-east', rack: 'A1' }");
    print("   { datacenter: 'us-west', rack: 'B2' }");
  } catch (error) {
    print("❌ Tag-based write concern failed:");
    print(error.message);
  }
}

// ============================================================================
// 5. WRITE CONCERN STRATEGIES BY USE CASE
// ============================================================================

print("\n5. WRITE CONCERN STRATEGIES BY USE CASE");
print("-".repeat(50));

/**
 * Financial transactions - Maximum durability
 */
function demonstrateFinancialWriteConcern() {
  print("\n💰 FINANCIAL TRANSACTIONS:");
  print("Maximum durability for financial data");

  try {
    const transaction = {
      userId: new ObjectId(),
      amount: 199.99,
      currency: "USD",
      type: "course_purchase",
      courseId: new ObjectId(),
      paymentMethod: "credit_card",
      transactionId: `txn_${Date.now()}`,
      timestamp: new Date(),
      status: "pending",
    };

    // Maximum write concern for financial data
    const result = db.financial_transactions.insertOne(transaction, {
      writeConcern: {
        w: "majority",
        j: true,
        wtimeout: 10000,
      },
    });

    print(`✅ Financial transaction recorded: ${result.insertedId}`);
    print("✅ Maximum durability: w:majority + j:true");
  } catch (error) {
    print("❌ Financial write concern failed:");
    print(error.message);
  }
}

/**
 * Session data - Balanced approach
 */
function demonstrateSessionWriteConcern() {
  print("\n🔐 SESSION DATA:");
  print("Balanced write concern for session management");

  try {
    const session = {
      sessionId: `sess_${Date.now()}`,
      userId: new ObjectId(),
      loginTime: new Date(),
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (compatible; MongoDB Tutorial)",
      isActive: true,
      lastActivity: new Date(),
    };

    // Balanced write concern
    const result = db.user_sessions.insertOne(session, {
      writeConcern: {
        w: 1,
        j: true,
        wtimeout: 3000,
      },
    });

    print(`✅ Session created: ${result.insertedId}`);
    print("✅ Balanced durability: w:1 + j:true");
  } catch (error) {
    print("❌ Session write concern failed:");
    print(error.message);
  }
}

/**
 * Analytics/logging - Performance optimized
 */
function demonstrateAnalyticsWriteConcern() {
  print("\n📊 ANALYTICS/LOGGING:");
  print("Performance-optimized write concern for high-volume data");

  try {
    const events = [
      {
        event: "page_view",
        userId: new ObjectId(),
        page: "/dashboard",
        timestamp: new Date(),
        metadata: { browser: "Chrome", os: "Windows" },
      },
      {
        event: "video_play",
        userId: new ObjectId(),
        videoId: new ObjectId(),
        position: 0,
        timestamp: new Date(),
      },
      {
        event: "quiz_start",
        userId: new ObjectId(),
        quizId: new ObjectId(),
        timestamp: new Date(),
      },
    ];

    // Performance-optimized write concern
    const result = db.analytics_events.insertMany(events, {
      writeConcern: {
        w: 1,
        j: false,
        wtimeout: 1000,
      },
    });

    print(`✅ Analytics events logged: ${result.insertedIds.length}`);
    print("✅ Performance-optimized: w:1, no journal wait");
  } catch (error) {
    print("❌ Analytics write concern failed:");
    print(error.message);
  }
}

// ============================================================================
// 6. MONITORING WRITE CONCERNS
// ============================================================================

print("\n6. MONITORING WRITE CONCERNS");
print("-".repeat(50));

/**
 * Monitor write concern performance
 */
function monitorWriteConcernPerformance() {
  print("\n📈 WRITE CONCERN PERFORMANCE MONITORING:");

  const testCases = [
    { name: "w:1", concern: { w: 1 } },
    { name: "w:1 + j:true", concern: { w: 1, j: true } },
    { name: "w:majority", concern: { w: "majority" } },
    { name: "w:majority + j:true", concern: { w: "majority", j: true } },
  ];

  testCases.forEach((testCase) => {
    try {
      const start = new Date();

      db.performance_test.insertOne(
        {
          test: testCase.name,
          timestamp: new Date(),
          data: "Performance test data",
        },
        { writeConcern: testCase.concern }
      );

      const end = new Date();
      const duration = end - start;

      print(`  ${testCase.name.padEnd(20)}: ${duration}ms`);
    } catch (error) {
      print(`  ${testCase.name.padEnd(20)}: FAILED`);
    }
  });
}

/**
 * Check replica set write concern defaults
 */
function checkWriteConcernDefaults() {
  print("\n⚙️ REPLICA SET WRITE CONCERN CONFIGURATION:");

  try {
    // Get current default write concern
    const result = db.adminCommand({ getDefaultRWConcern: 1 });

    if (result.defaultWriteConcern) {
      print("✅ Default Write Concern:");
      print(`   w: ${result.defaultWriteConcern.w || 1}`);
      print(`   j: ${result.defaultWriteConcern.j || false}`);
      print(`   wtimeout: ${result.defaultWriteConcern.wtimeout || "none"}`);
    } else {
      print("ℹ️ Using MongoDB default write concern (w:1)");
    }

    // Show replica set configuration
    const rsConfig = rs.conf();
    print("\n📋 Replica Set Configuration:");
    print(`   Set Name: ${rsConfig._id}`);
    print(`   Members: ${rsConfig.members.length}`);

    // Calculate majority threshold
    const majority = Math.floor(rsConfig.members.length / 2) + 1;
    print(
      `   Majority Threshold: ${majority}/${rsConfig.members.length} members`
    );
  } catch (error) {
    print("❌ Failed to check write concern defaults:");
    print(error.message);
  }
}

/**
 * Best practices summary
 */
function summarizeWriteConcernBestPractices() {
  print("\n💡 WRITE CONCERN BEST PRACTICES:");
  print("-".repeat(40));

  const practices = [
    "Financial data: w:'majority' + j:true for maximum durability",
    "User data: w:1 + j:true for good balance",
    "Analytics/logs: w:1 for performance",
    "Critical config: w:'majority' + j:true + reasonable wtimeout",
    "Set appropriate wtimeout to avoid indefinite blocking",
    "Monitor write concern performance regularly",
    "Configure default write concerns at cluster level",
    "Test failover scenarios with your write concern settings",
  ];

  practices.forEach((practice, index) => {
    print(`${index + 1}. ${practice}`);
  });

  print("\n⚠️ TRADE-OFFS:");
  print("• Higher write concerns = Better durability + Higher latency");
  print("• Lower write concerns = Better performance + Less durability");
  print("• Choose based on your consistency and performance requirements");
}

// ============================================================================
// 7. EXECUTION SECTION
// ============================================================================

print("\n7. EXECUTING WRITE CONCERN DEMONSTRATIONS");
print("-".repeat(50));

try {
  // Basic write concerns
  demonstrateW1WriteConcern();
  demonstrateMajorityWriteConcern();
  demonstrateW0WriteConcern();

  // Journaled writes
  demonstrateJournaledWrites();

  // Timeouts
  demonstrateWriteTimeouts();

  // Custom rules
  configureCustomWriteConcerns();
  demonstrateTagBasedWriteConcerns();

  // Use case strategies
  demonstrateFinancialWriteConcern();
  demonstrateSessionWriteConcern();
  demonstrateAnalyticsWriteConcern();

  // Monitoring
  monitorWriteConcernPerformance();
  checkWriteConcernDefaults();
  summarizeWriteConcernBestPractices();

  print("\n✅ Write concerns demonstration completed successfully!");
} catch (error) {
  print("❌ Error during write concerns demonstration:");
  print(error.message);
}

print("\n" + "=".repeat(80));
print("WRITE CONCERNS COMPLETE");
print("=".repeat(80));
