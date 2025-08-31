// File: scripts/07_sharding/validate_sharding.js
// MongoDB Sharding Validation - Distribution validation and cluster health checks

/**
 * SHARDING VALIDATION
 * ===================
 * Comprehensive validation suite for MongoDB sharding functionality.
 * Verifies cluster health, chunk distribution, query routing, and performance.
 */

// Database connections
const db = db.getSiblingDB("lms_primary");
const adminDB = db.getSiblingDB("admin");
const configDB = db.getSiblingDB("config");

print("\n" + "=".repeat(80));
print("MONGODB SHARDING VALIDATION");
print("=".repeat(80));

// Global validation results
let shardingValidation = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: [],
};

// Helper function to record test results
function recordShardingTest(name, passed, message, warning = false) {
  shardingValidation.total++;
  if (warning) {
    shardingValidation.warnings++;
  } else if (passed) {
    shardingValidation.passed++;
  } else {
    shardingValidation.failed++;
  }

  shardingValidation.tests.push({
    name: name,
    status: warning ? "WARNING" : passed ? "PASSED" : "FAILED",
    message: message,
  });

  const icon = warning ? "⚠️" : passed ? "✅" : "❌";
  print(`${icon} ${name}: ${message}`);
}

// ============================================================================
// 1. CLUSTER CONNECTIVITY VALIDATION
// ============================================================================

print("\n1. CLUSTER CONNECTIVITY VALIDATION");
print("-".repeat(50));

/**
 * Validate mongos connection and sharding status
 */
function validateMongosConnection() {
  print("\n🔗 MONGOS CONNECTION VALIDATION:");

  try {
    const isMaster = adminDB.runCommand({ isMaster: 1 });

    recordShardingTest(
      "Mongos Connection",
      isMaster.msg === "isdbgrid",
      isMaster.msg === "isdbgrid"
        ? "Connected to mongos router"
        : `Connected to ${isMaster.msg || "unknown"} (expected mongos)`
    );

    if (isMaster.msg === "isdbgrid") {
      recordShardingTest(
        "MongoDB Version",
        true,
        `Version: ${isMaster.version || "Unknown"}`
      );
    }
  } catch (error) {
    recordShardingTest("Mongos Connection", false, `Error: ${error.message}`);
  }
}

/**
 * Validate shard connectivity
 */
function validateShardConnectivity() {
  print("\n🏛️ SHARD CONNECTIVITY VALIDATION:");

  try {
    const shardList = adminDB.runCommand({ listShards: 1 });

    recordShardingTest(
      "Shard List Command",
      shardList.ok === 1,
      shardList.ok === 1
        ? `Found ${shardList.shards.length} shards`
        : "Failed to retrieve shard list"
    );

    if (shardList.ok === 1) {
      const shardCount = shardList.shards.length;
      recordShardingTest(
        "Shard Count",
        shardCount >= 2,
        `${shardCount} shards configured (recommended: 2+)`,
        shardCount < 2
      );

      // Test connectivity to each shard
      shardList.shards.forEach((shard, index) => {
        try {
          const shardPing = adminDB.runCommand({
            runCommandOnShard: shard._id,
            command: { ping: 1 },
          });

          recordShardingTest(
            `Shard ${shard._id} Connectivity`,
            shardPing.ok === 1,
            shardPing.ok === 1
              ? `${shard.host} is reachable`
              : `${shard.host} connectivity failed`
          );
        } catch (shardError) {
          recordShardingTest(
            `Shard ${shard._id} Connectivity`,
            false,
            `Error: ${shardError.message}`
          );
        }
      });
    }
  } catch (error) {
    recordShardingTest("Shard Connectivity", false, `Error: ${error.message}`);
  }
}

/**
 * Validate config server access
 */
function validateConfigServerAccess() {
  print("\n⚙️ CONFIG SERVER VALIDATION:");

  try {
    const configCollections = configDB.runCommand({ listCollections: 1 });

    recordShardingTest(
      "Config Database Access",
      configCollections.ok === 1,
      configCollections.ok === 1
        ? "Config database accessible"
        : "Cannot access config database"
    );

    if (configCollections.ok === 1) {
      // Check essential config collections
      const essentialCollections = [
        "shards",
        "databases",
        "collections",
        "chunks",
      ];
      const foundCollections = configCollections.cursor.firstBatch.map(
        (c) => c.name
      );

      essentialCollections.forEach((collection) => {
        recordShardingTest(
          `Config Collection ${collection}`,
          foundCollections.includes(collection),
          foundCollections.includes(collection)
            ? `${collection} collection exists`
            : `${collection} collection missing`
        );
      });
    }
  } catch (error) {
    recordShardingTest(
      "Config Server Access",
      false,
      `Error: ${error.message}`
    );
  }
}

// ============================================================================
// 2. DATABASE AND COLLECTION SHARDING VALIDATION
// ============================================================================

print("\n2. DATABASE AND COLLECTION SHARDING VALIDATION");
print("-".repeat(50));

/**
 * Validate database sharding configuration
 */
function validateDatabaseSharding() {
  print("\n🗄️ DATABASE SHARDING VALIDATION:");

  try {
    const databases = configDB.databases.find().toArray();

    recordShardingTest(
      "Sharded Databases",
      databases.length > 0,
      `${databases.length} databases in cluster`
    );

    // Check for sharding enabled databases
    const shardedDatabases = databases.filter((db) => db.partitioned === true);
    recordShardingTest(
      "Sharding Enabled Databases",
      shardedDatabases.length > 0,
      `${shardedDatabases.length} databases have sharding enabled`,
      shardedDatabases.length === 0
    );

    // Validate primary shard assignments
    databases.forEach((database) => {
      recordShardingTest(
        `Database ${database._id} Primary Shard`,
        database.primary !== undefined,
        database.primary
          ? `Primary shard: ${database.primary}`
          : "No primary shard assigned"
      );
    });
  } catch (error) {
    recordShardingTest("Database Sharding", false, `Error: ${error.message}`);
  }
}

/**
 * Validate collection sharding configuration
 */
function validateCollectionSharding() {
  print("\n📚 COLLECTION SHARDING VALIDATION:");

  try {
    const collections = configDB.collections.find().toArray();

    recordShardingTest(
      "Sharded Collections",
      collections.length > 0,
      collections.length > 0
        ? `${collections.length} sharded collections found`
        : "No sharded collections found"
    );

    if (collections.length > 0) {
      collections.forEach((collection) => {
        const namespace = collection._id;
        const shardKey = collection.key;

        recordShardingTest(
          `Collection ${namespace}`,
          shardKey !== undefined,
          shardKey
            ? `Shard key: ${JSON.stringify(shardKey)}`
            : "No shard key defined"
        );

        // Validate shard key indexes exist
        try {
          const dbName = namespace.split(".")[0];
          const collName = namespace.split(".")[1];
          const targetDB = db.getSiblingDB(dbName);
          const indexes = targetDB[collName].getIndexes();

          const hasShardKeyIndex = indexes.some(
            (index) => JSON.stringify(index.key) === JSON.stringify(shardKey)
          );

          recordShardingTest(
            `${namespace} Shard Key Index`,
            hasShardKeyIndex,
            hasShardKeyIndex
              ? "Shard key index exists"
              : "Shard key index missing"
          );
        } catch (indexError) {
          recordShardingTest(
            `${namespace} Index Check`,
            false,
            `Error checking indexes: ${indexError.message}`
          );
        }
      });
    }
  } catch (error) {
    recordShardingTest("Collection Sharding", false, `Error: ${error.message}`);
  }
}

// ============================================================================
// 3. CHUNK DISTRIBUTION VALIDATION
// ============================================================================

print("\n3. CHUNK DISTRIBUTION VALIDATION");
print("-".repeat(50));

/**
 * Validate chunk distribution balance
 */
function validateChunkDistribution() {
  print("\n📦 CHUNK DISTRIBUTION VALIDATION:");

  try {
    const chunks = configDB.chunks.find().toArray();

    recordShardingTest(
      "Chunks Exist",
      chunks.length > 0,
      chunks.length > 0 ? `${chunks.length} chunks found` : "No chunks found"
    );

    if (chunks.length > 0) {
      // Analyze distribution by shard
      const chunksByShard = {};
      chunks.forEach((chunk) => {
        if (!chunksByShard[chunk.shard]) {
          chunksByShard[chunk.shard] = 0;
        }
        chunksByShard[chunk.shard]++;
      });

      const shards = Object.keys(chunksByShard);
      const chunkCounts = Object.values(chunksByShard);
      const maxChunks = Math.max(...chunkCounts);
      const minChunks = Math.min(...chunkCounts);
      const imbalanceRatio = maxChunks / minChunks;

      recordShardingTest(
        "Chunk Distribution Balance",
        imbalanceRatio <= 2.0,
        `Max/Min ratio: ${imbalanceRatio.toFixed(2)} (threshold: 2.0)`,
        imbalanceRatio > 2.0
      );

      // Individual shard analysis
      shards.forEach((shard) => {
        const count = chunksByShard[shard];
        const percentage = ((count / chunks.length) * 100).toFixed(1);
        recordShardingTest(
          `Shard ${shard} Chunk Count`,
          true,
          `${count} chunks (${percentage}%)`
        );
      });
    }
  } catch (error) {
    recordShardingTest("Chunk Distribution", false, `Error: ${error.message}`);
  }
}

/**
 * Validate chunk size and health
 */
function validateChunkHealth() {
  print("\n🏥 CHUNK HEALTH VALIDATION:");

  try {
    // Check for jumbo chunks
    const jumboChunks = configDB.chunks.find({ jumbo: true }).toArray();

    recordShardingTest(
      "Jumbo Chunks",
      jumboChunks.length === 0,
      jumboChunks.length === 0
        ? "No jumbo chunks found"
        : `${jumboChunks.length} jumbo chunks need attention`,
      jumboChunks.length > 0
    );

    // Check chunk history for failed migrations
    const failedMigrations = configDB.changelog
      .find({
        what: "moveChunk.error",
        time: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      })
      .count();

    recordShardingTest(
      "Recent Migration Failures",
      failedMigrations === 0,
      failedMigrations === 0
        ? "No failed migrations in last 24h"
        : `${failedMigrations} failed migrations in last 24h`,
      failedMigrations > 0
    );
  } catch (error) {
    recordShardingTest("Chunk Health", false, `Error: ${error.message}`);
  }
}

// ============================================================================
// 4. BALANCER VALIDATION
// ============================================================================

print("\n4. BALANCER VALIDATION");
print("-".repeat(50));

/**
 * Validate balancer configuration and status
 */
function validateBalancer() {
  print("\n⚖️ BALANCER VALIDATION:");

  try {
    const balancerState = sh.getBalancerState();
    recordShardingTest(
      "Balancer State",
      balancerState === true,
      `Balancer is ${balancerState ? "ENABLED" : "DISABLED"}`,
      !balancerState
    );

    const isRunning = sh.isBalancerRunning();
    recordShardingTest(
      "Balancer Running",
      true, // This is informational
      `Balancer is ${isRunning ? "currently running" : "not running"}`
    );

    // Check balancer window configuration
    const balancerConfig = configDB.settings.findOne({ _id: "balancer" });
    if (balancerConfig && balancerConfig.activeWindow) {
      recordShardingTest(
        "Balancer Window",
        true,
        `Active window: ${balancerConfig.activeWindow.start} - ${balancerConfig.activeWindow.stop}`
      );
    } else {
      recordShardingTest(
        "Balancer Window",
        true,
        "No balancer window configured (runs 24/7)"
      );
    }

    // Check recent balancer activity
    const recentActivity = configDB.changelog
      .find({
        what: "moveChunk.start",
        time: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      })
      .count();

    recordShardingTest(
      "Balancer Activity",
      true,
      `${recentActivity} chunk migrations in last 24h`
    );
  } catch (error) {
    recordShardingTest("Balancer Validation", false, `Error: ${error.message}`);
  }
}

// ============================================================================
// 5. QUERY ROUTING VALIDATION
// ============================================================================

print("\n5. QUERY ROUTING VALIDATION");
print("-".repeat(50));

/**
 * Validate query routing behavior
 */
function validateQueryRouting() {
  print("\n🎯 QUERY ROUTING VALIDATION:");

  try {
    // Create test data for routing validation
    const testCollectionName = "routing_test_" + Date.now();

    // Test basic operations first
    try {
      db[testCollectionName].insertOne({
        _id: new ObjectId(),
        testData: "routing validation",
        timestamp: new Date(),
      });

      recordShardingTest(
        "Basic Write Operation",
        true,
        "Test document inserted successfully"
      );

      // Test read operation
      const readResult = db[testCollectionName].findOne();
      recordShardingTest(
        "Basic Read Operation",
        readResult !== null,
        readResult ? "Test document read successfully" : "Read operation failed"
      );

      // Clean up test data
      db[testCollectionName].drop();
    } catch (operationError) {
      recordShardingTest(
        "Basic Operations",
        false,
        `Operation failed: ${operationError.message}`
      );
    }

    // Test query explanation for existing collections
    const collections = configDB.collections.find().toArray();
    if (collections.length > 0) {
      const sampleCollection = collections[0]._id;
      const [dbName, collName] = sampleCollection.split(".");
      const targetDB = db.getSiblingDB(dbName);

      try {
        const explainResult = targetDB[collName]
          .find()
          .limit(1)
          .explain("executionStats");

        recordShardingTest(
          `Query Explain ${sampleCollection}`,
          explainResult.ok !== false,
          "Query explain executed successfully"
        );

        if (explainResult.shards) {
          const shardsQueried = Object.keys(explainResult.shards).length;
          recordShardingTest(
            `Shards Queried ${sampleCollection}`,
            shardsQueried > 0,
            `Query executed on ${shardsQueried} shard(s)`
          );
        }
      } catch (explainError) {
        recordShardingTest(
          `Query Explain ${sampleCollection}`,
          false,
          `Explain failed: ${explainError.message}`
        );
      }
    }
  } catch (error) {
    recordShardingTest("Query Routing", false, `Error: ${error.message}`);
  }
}

/**
 * Validate aggregation pipeline routing
 */
function validateAggregationRouting() {
  print("\n📊 AGGREGATION ROUTING VALIDATION:");

  try {
    const collections = configDB.collections.find().toArray();

    if (collections.length > 0) {
      const sampleCollection = collections[0]._id;
      const [dbName, collName] = sampleCollection.split(".");
      const targetDB = db.getSiblingDB(dbName);

      try {
        const aggResult = targetDB[collName]
          .aggregate([
            { $limit: 5 },
            { $group: { _id: null, count: { $sum: 1 } } },
          ])
          .explain("executionStats");

        recordShardingTest(
          `Aggregation Routing ${sampleCollection}`,
          aggResult.ok !== false,
          "Aggregation pipeline executed successfully"
        );

        if (aggResult.shards) {
          const shardsUsed = Object.keys(aggResult.shards).length;
          recordShardingTest(
            `Aggregation Shards ${sampleCollection}`,
            shardsUsed > 0,
            `Aggregation used ${shardsUsed} shard(s)`
          );
        }
      } catch (aggError) {
        recordShardingTest(
          `Aggregation Routing ${sampleCollection}`,
          false,
          `Aggregation failed: ${aggError.message}`
        );
      }
    } else {
      recordShardingTest(
        "Aggregation Routing",
        false,
        "No sharded collections found for testing"
      );
    }
  } catch (error) {
    recordShardingTest("Aggregation Routing", false, `Error: ${error.message}`);
  }
}

// ============================================================================
// 6. PERFORMANCE VALIDATION
// ============================================================================

print("\n6. PERFORMANCE VALIDATION");
print("-".repeat(50));

/**
 * Validate cluster performance metrics
 */
function validatePerformanceMetrics() {
  print("\n🚀 PERFORMANCE METRICS VALIDATION:");

  try {
    // Test concurrent operations across shards
    const startTime = new Date();

    // Simple performance test - insert multiple documents
    const testResults = [];
    for (let i = 0; i < 10; i++) {
      try {
        const insertStart = new Date();
        db.performance_test.insertOne({
          _id: new ObjectId(),
          testId: i,
          data: `Performance test document ${i}`,
          timestamp: new Date(),
        });
        const insertEnd = new Date();
        testResults.push(insertEnd - insertStart);
      } catch (insertError) {
        recordShardingTest(
          `Performance Test ${i}`,
          false,
          `Insert failed: ${insertError.message}`
        );
      }
    }

    if (testResults.length > 0) {
      const avgTime =
        testResults.reduce((a, b) => a + b, 0) / testResults.length;
      recordShardingTest(
        "Insert Performance",
        avgTime < 100, // 100ms threshold
        `Average insert time: ${avgTime.toFixed(2)}ms`,
        avgTime >= 100
      );
    }

    // Cleanup
    db.performance_test.drop();

    const totalTime = new Date() - startTime;
    recordShardingTest(
      "Overall Performance Test",
      totalTime < 5000, // 5 second threshold
      `Total test time: ${totalTime}ms`
    );
  } catch (error) {
    recordShardingTest(
      "Performance Validation",
      false,
      `Error: ${error.message}`
    );
  }
}

// ============================================================================
// 7. COMPREHENSIVE VALIDATION SUMMARY
// ============================================================================

/**
 * Display comprehensive validation summary
 */
function displayShardingValidationSummary() {
  print("\n" + "=".repeat(60));
  print("SHARDING VALIDATION SUMMARY");
  print("=".repeat(60));

  print(`\n📊 OVERALL RESULTS:`);
  print(`   Total Tests: ${shardingValidation.total}`);
  print(`   Passed: ${shardingValidation.passed} ✅`);
  print(`   Failed: ${shardingValidation.failed} ❌`);
  print(`   Warnings: ${shardingValidation.warnings} ⚠️`);

  const successRate = Math.round(
    (shardingValidation.passed / shardingValidation.total) * 100
  );
  print(`   Success Rate: ${successRate}%`);

  if (shardingValidation.failed > 0) {
    print(`\n❌ FAILED TESTS:`);
    shardingValidation.tests
      .filter((test) => test.status === "FAILED")
      .forEach((test) => {
        print(`   • ${test.name}: ${test.message}`);
      });
  }

  if (shardingValidation.warnings > 0) {
    print(`\n⚠️ WARNINGS:`);
    shardingValidation.tests
      .filter((test) => test.status === "WARNING")
      .forEach((test) => {
        print(`   • ${test.name}: ${test.message}`);
      });
  }

  // Health assessment
  if (shardingValidation.failed === 0 && shardingValidation.warnings === 0) {
    print(`\n🎉 CLUSTER HEALTH: EXCELLENT`);
    print(`   Your sharded cluster is properly configured and healthy.`);
  } else if (shardingValidation.failed === 0) {
    print(`\n✅ CLUSTER HEALTH: GOOD`);
    print(`   Cluster is functional with minor recommendations.`);
  } else if (shardingValidation.failed <= 3) {
    print(`\n⚠️ CLUSTER HEALTH: NEEDS ATTENTION`);
    print(`   Address failed tests for optimal performance.`);
  } else {
    print(`\n🚨 CLUSTER HEALTH: CRITICAL`);
    print(`   Multiple issues detected - review configuration.`);
  }

  print(`\n💡 NEXT STEPS:`);
  print(`   1. Address any failed tests above`);
  print(`   2. Review warnings and optimize if needed`);
  print(`   3. Monitor cluster performance regularly`);
  print(`   4. Plan for capacity scaling as needed`);
}

// ============================================================================
// 8. EXECUTION SECTION
// ============================================================================

print("\n8. EXECUTING SHARDING VALIDATION");
print("-".repeat(50));

try {
  // Connectivity and basic setup validation
  validateMongosConnection();
  validateShardConnectivity();
  validateConfigServerAccess();

  // Sharding configuration validation
  validateDatabaseSharding();
  validateCollectionSharding();

  // Distribution and balance validation
  validateChunkDistribution();
  validateChunkHealth();
  validateBalancer();

  // Query routing validation
  validateQueryRouting();
  validateAggregationRouting();

  // Performance validation
  validatePerformanceMetrics();

  // Display comprehensive summary
  displayShardingValidationSummary();
} catch (error) {
  print("❌ Critical error during sharding validation:");
  print(error.message);
  recordShardingTest(
    "Validation Execution",
    false,
    `Critical error: ${error.message}`
  );
}

print("\n" + "=".repeat(80));
print("SHARDING VALIDATION COMPLETE");
print("=".repeat(80));
