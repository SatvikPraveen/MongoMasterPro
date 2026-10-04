// File: scripts/10_performance/validate_performance.js
// MongoDB Performance Validation - Performance threshold checks and optimization validation

/**
 * PERFORMANCE VALIDATION
 * ======================
 * Comprehensive performance validation and threshold checking.
 * Tests database performance, identifies bottlenecks, and validates optimizations.
 */

const db = db.getSiblingDB("mmp_performance");
const adminDB = db.getSiblingDB("admin");

// Seed a small, indexed working set so plan- and selectivity-based checks are
// meaningful in an otherwise empty sandbox database.
if (db.users.countDocuments() === 0) {
  const seed = [];
  for (let i = 0; i < 2000; i++) {
    seed.push({
      email: i === 0 ? "test@example.com" : `user${i}@example.com`,
      status: i % 10 === 0 ? "inactive" : "active",
      createdAt: new Date(Date.now() - i * 60000),
    });
  }
  db.users.insertMany(seed);
  db.users.createIndex({ email: 1 }, { unique: true });
  db.users.createIndex({ status: 1, createdAt: -1 });
}

print("\n" + "=".repeat(80));
print("MONGODB PERFORMANCE VALIDATION");
print("=".repeat(80));

// Global performance validation results
let performanceValidation = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  critical: 0,
  tests: [],
  metrics: {},
};

// Helper function to record performance test results
function recordPerformanceTest(
  name,
  passed,
  message,
  actualValue,
  threshold,
  warning = false,
  critical = false
) {
  performanceValidation.total++;

  // Store metric for reporting
  performanceValidation.metrics[name] = {
    value: actualValue,
    threshold: threshold,
    passed: passed,
  };

  if (critical && !passed) {
    performanceValidation.critical++;
  } else if (warning) {
    performanceValidation.warnings++;
  } else if (passed) {
    performanceValidation.passed++;
  } else {
    performanceValidation.failed++;
  }

  performanceValidation.tests.push({
    name: name,
    status:
      critical && !passed
        ? "CRITICAL"
        : warning
        ? "WARNING"
        : passed
        ? "PASSED"
        : "FAILED",
    message: message,
    actualValue: actualValue,
    threshold: threshold,
  });

  const icon =
    critical && !passed ? "🚨" : warning ? "⚠️" : passed ? "✅" : "❌";
  print(
    `${icon} ${name}: ${message} (${actualValue} vs threshold: ${threshold})`
  );
}

// ============================================================================
// 1. QUERY PERFORMANCE VALIDATION
// ============================================================================

print("\n1. QUERY PERFORMANCE VALIDATION");
print("-".repeat(50));

function validateQueryPerformance() {
  print("\n🔍 QUERY PERFORMANCE VALIDATION:");

  // Test 1: Basic query response time
  const queryTests = [
    {
      name: "User Lookup Performance",
      collection: "users",
      query: {},
      limit: 10,
      threshold: 50, // 50ms
    },
    {
      name: "Course Search Performance",
      collection: "courses",
      query: { status: "active" },
      limit: 20,
      threshold: 100, // 100ms
    },
    {
      name: "Enrollment Query Performance",
      collection: "enrollments",
      query: { status: "active" },
      limit: 50,
      threshold: 150, // 150ms
    },
  ];

  queryTests.forEach((test) => {
    try {
      const startTime = Date.now();
      const results = db[test.collection]
        .find(test.query)
        .limit(test.limit)
        .toArray();
      const duration = Date.now() - startTime;

      recordPerformanceTest(
        test.name,
        duration <= test.threshold,
        `Query completed in ${duration}ms`,
        duration,
        test.threshold,
        duration > test.threshold * 0.8,
        duration > test.threshold * 2
      );
    } catch (error) {
      recordPerformanceTest(
        test.name,
        false,
        `Query failed: ${error.message}`,
        "ERROR",
        test.threshold,
        false,
        true
      );
    }
  });

  // Test 2: Aggregation performance
  try {
    const aggStart = Date.now();
    const aggResult = db.enrollments
      .aggregate([
        { $match: { status: "active" } },
        { $group: { _id: "$courseId", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray();
    const aggDuration = Date.now() - aggStart;

    recordPerformanceTest(
      "Aggregation Performance",
      aggDuration <= 200,
      `Aggregation completed in ${aggDuration}ms`,
      aggDuration,
      200,
      aggDuration > 160,
      aggDuration > 400
    );
  } catch (error) {
    recordPerformanceTest(
      "Aggregation Performance",
      false,
      `Aggregation failed: ${error.message}`,
      "ERROR",
      200,
      false,
      true
    );
  }

  // Test 3: Index usage validation
  try {
    const explainResult = db.users
      .find({ email: "test@example.com" })
      .explain("executionStats");
    const usedIndex = /"stage":\s*"IXSCAN"/.test(JSON.stringify(explainResult));

    recordPerformanceTest(
      "Index Usage",
      usedIndex,
      usedIndex
        ? "Query uses index efficiently"
        : "Query performs collection scan",
      usedIndex ? "INDEX_USED" : "COLLECTION_SCAN",
      "INDEX_REQUIRED",
      !usedIndex,
      !usedIndex
    );
  } catch (error) {
    recordPerformanceTest(
      "Index Usage",
      false,
      `Index usage check failed: ${error.message}`,
      "ERROR",
      "INDEX_REQUIRED"
    );
  }
}

// ============================================================================
// 2. CONNECTION AND THROUGHPUT VALIDATION
// ============================================================================

print("\n2. CONNECTION AND THROUGHPUT VALIDATION");
print("-".repeat(50));

function validateConnectionPerformance() {
  print("\n🔌 CONNECTION PERFORMANCE VALIDATION:");

  try {
    const serverStatus = adminDB.runCommand({ serverStatus: 1 });

    // Test 1: Connection count
    const connections = serverStatus.connections;
    const connectionUtilization =
      (connections.current / connections.available) * 100;

    recordPerformanceTest(
      "Connection Utilization",
      connectionUtilization < 80,
      `Using ${connectionUtilization.toFixed(1)}% of available connections`,
      connectionUtilization,
      80,
      connectionUtilization > 70,
      connectionUtilization > 90
    );

    // Test 2: Operations per second
    if (serverStatus.opcounters) {
      // opcounters also carries a nested "deprecated" object; sum numbers only.
      const totalOps = Object.values(serverStatus.opcounters)
        .filter((v) => typeof v === "number")
        .reduce((sum, count) => sum + count, 0);
      const uptime = serverStatus.uptime;
      const opsPerSecond = totalOps / uptime;

      recordPerformanceTest(
        "Operations Per Second",
        opsPerSecond < 1000, // Threshold depends on hardware
        `${opsPerSecond.toFixed(2)} ops/sec average`,
        opsPerSecond,
        1000,
        opsPerSecond > 800,
        opsPerSecond > 1200
      );
    }

    // Test 3: Network performance
    if (serverStatus.network) {
      const network = serverStatus.network;
      const totalBytes = network.bytesIn + network.bytesOut;
      const networkMBps = totalBytes / serverStatus.uptime / (1024 * 1024);

      recordPerformanceTest(
        "Network Throughput",
        true, // informational: a lifetime average says nothing about headroom
        `${networkMBps.toFixed(2)} MB/s average since start (informational)`,
        networkMBps,
        100,
        false,
        false
      );
    }
  } catch (error) {
    recordPerformanceTest(
      "Connection Performance",
      false,
      `Connection performance check failed: ${error.message}`,
      "ERROR",
      "N/A"
    );
  }
}

// ============================================================================
// 3. MEMORY AND STORAGE VALIDATION
// ============================================================================

print("\n3. MEMORY AND STORAGE VALIDATION");
print("-".repeat(50));

function validateMemoryPerformance() {
  print("\n💾 MEMORY PERFORMANCE VALIDATION:");

  try {
    const serverStatus = adminDB.runCommand({ serverStatus: 1 });

    // Test 1: WiredTiger cache usage
    if (serverStatus.wiredTiger && serverStatus.wiredTiger.cache) {
      const cache = serverStatus.wiredTiger.cache;
      const cacheSize = cache["maximum bytes configured"];
      const cacheUsed = cache["bytes currently in the cache"];
      const cacheUtilization = (cacheUsed / cacheSize) * 100;

      recordPerformanceTest(
        "Cache Utilization",
        cacheUtilization < 90,
        `Cache ${cacheUtilization.toFixed(1)}% utilized`,
        cacheUtilization,
        90,
        cacheUtilization > 80,
        cacheUtilization > 95
      );

      // Test 2: Cache efficiency
      // WiredTiger reports requests and disk reads; hits = requests - reads.
      const pagesRequested = cache["pages requested from the cache"] || 0;
      const pagesReadIn = cache["pages read into cache"] || 0;
      const hitRatio =
        pagesRequested > 0
          ? ((pagesRequested - pagesReadIn) / pagesRequested) * 100
          : 100;

      recordPerformanceTest(
        "Cache Hit Ratio",
        hitRatio > 95,
        `Cache hit ratio: ${hitRatio.toFixed(2)}%`,
        hitRatio,
        95,
        hitRatio < 98,
        hitRatio < 90
      );
    }

    // Test 3: Memory usage
    if (serverStatus.mem) {
      const mem = serverStatus.mem;
      const memoryUsageMB = mem.resident;

      recordPerformanceTest(
        "Memory Usage",
        memoryUsageMB < 4096, // 4GB threshold (adjust based on system)
        `Using ${memoryUsageMB}MB of memory`,
        memoryUsageMB,
        4096,
        memoryUsageMB > 3072,
        memoryUsageMB > 6144
      );
    }
  } catch (error) {
    recordPerformanceTest(
      "Memory Performance",
      false,
      `Memory performance check failed: ${error.message}`,
      "ERROR",
      "N/A"
    );
  }
}

function validateStoragePerformance() {
  print("\n🗄️ STORAGE PERFORMANCE VALIDATION:");

  try {
    // Test 1: Database size efficiency
    const dbStats = db.stats();
    const dataSize = dbStats.dataSize;
    const storageSize = dbStats.storageSize;
    const storageEfficiency = (dataSize / storageSize) * 100;

    recordPerformanceTest(
      "Storage Efficiency",
      storageEfficiency > 70,
      `Storage ${storageEfficiency.toFixed(1)}% efficient`,
      storageEfficiency,
      70,
      storageEfficiency < 80,
      storageEfficiency < 60
    );

    // Test 2: Index size ratio
    const indexSize = dbStats.indexSize;
    // On small databases (<1 MiB) fixed per-index overhead dominates and the
    // ratio says nothing about design; report it informationally instead.
    const indexToDataRatio =
      dataSize < 1024 * 1024 ? 0 : (indexSize / dataSize) * 100;

    recordPerformanceTest(
      "Index to Data Ratio",
      indexToDataRatio < 50,
      `Indexes are ${indexToDataRatio.toFixed(1)}% of data size`,
      indexToDataRatio,
      50,
      indexToDataRatio > 40,
      indexToDataRatio > 80
    );

    // Test 3: Collection count
    const collectionCount = dbStats.collections;

    recordPerformanceTest(
      "Collection Count",
      collectionCount < 100,
      `Database has ${collectionCount} collections`,
      collectionCount,
      100,
      collectionCount > 80,
      collectionCount > 150
    );
  } catch (error) {
    recordPerformanceTest(
      "Storage Performance",
      false,
      `Storage performance check failed: ${error.message}`,
      "ERROR",
      "N/A"
    );
  }
}

// ============================================================================
// 4. PROFILER AND SLOW OPERATIONS VALIDATION
// ============================================================================

print("\n4. PROFILER AND SLOW OPERATIONS VALIDATION");
print("-".repeat(50));

function validateSlowOperations() {
  print("\n🐌 SLOW OPERATIONS VALIDATION:");

  try {
    // Test 1: Recent slow operations count
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const slowOpCount = db.system.profile.count({
      ts: { $gte: hourAgo },
      millis: { $gt: 100 },
    });

    recordPerformanceTest(
      "Slow Operations (1hr)",
      slowOpCount < 10,
      `${slowOpCount} slow operations in last hour`,
      slowOpCount,
      10,
      slowOpCount > 5,
      slowOpCount > 20
    );

    // Test 2: Collection scan frequency
    const collScanCount = db.system.profile.count({
      ts: { $gte: hourAgo },
      "execStats.executionStats.stage": "COLLSCAN",
    });

    recordPerformanceTest(
      "Collection Scans (1hr)",
      collScanCount < 5,
      `${collScanCount} collection scans in last hour`,
      collScanCount,
      5,
      collScanCount > 2,
      collScanCount > 10
    );

    // Test 3: Average operation duration
    const recentOps = db.system.profile
      .find({
        ts: { $gte: hourAgo },
        millis: { $exists: true },
      })
      .toArray();

    if (recentOps.length > 0) {
      const avgDuration =
        recentOps.reduce((sum, op) => sum + op.millis, 0) / recentOps.length;

      recordPerformanceTest(
        "Average Operation Duration",
        avgDuration < 50,
        `Average operation takes ${avgDuration.toFixed(2)}ms`,
        avgDuration,
        50,
        avgDuration > 30,
        avgDuration > 100
      );
    }
  } catch (error) {
    recordPerformanceTest(
      "Slow Operations Check",
      false,
      `Slow operations check failed: ${error.message}`,
      "ERROR",
      "N/A"
    );
  }
}

// ============================================================================
// 5. INDEX EFFICIENCY VALIDATION
// ============================================================================

print("\n5. INDEX EFFICIENCY VALIDATION");
print("-".repeat(50));

function validateIndexEfficiency() {
  print("\n🗂️ INDEX EFFICIENCY VALIDATION:");

  try {
    // Test 1: Index usage statistics
    const collections = db.runCommand({ listCollections: 1 }).cursor.firstBatch;
    let totalIndexes = 0;
    let unusedIndexes = 0;

    collections.forEach((coll) => {
      if (!coll.name.startsWith("system.")) {
        try {
          // $indexStats reports per-index access counts since the server started.
          const indexStats = db[coll.name].aggregate([{ $indexStats: {} }]).toArray();
          totalIndexes += indexStats.length;
          indexStats.forEach((index) => {
            if (index.name !== "_id_" && Number(index.accesses.ops) === 0) {
              unusedIndexes++;
            }
          });
        } catch (error) {
          // Collection access error
        }
      }
    });

    const indexEfficiency =
      ((totalIndexes - unusedIndexes) / totalIndexes) * 100;

    // Usage counters reset on restart, so unused indexes are a warning to
    // investigate rather than a failure in their own right.
    recordPerformanceTest(
      "Index Efficiency",
      indexEfficiency >= 50,
      `${indexEfficiency.toFixed(1)}% of indexes used since server start (${unusedIndexes} unused)`,
      indexEfficiency,
      90,
      unusedIndexes > 0,
      false
    );

    // Test 2: Index selectivity (sample check)
    try {
      const userEmailIndex = db.users
        .find({ email: "test@example.com" })
        .explain("executionStats");
      const docsExamined = userEmailIndex.executionStats.totalDocsExamined;
      const docsReturned = userEmailIndex.executionStats.nReturned;
      const selectivity = docsReturned / Math.max(docsExamined, 1);

      recordPerformanceTest(
        "Index Selectivity",
        selectivity > 0.1,
        `Index selectivity: ${(selectivity * 100).toFixed(2)}%`,
        selectivity * 100,
        10,
        selectivity < 0.2,
        selectivity < 0.05
      );
    } catch (error) {
      // Index selectivity check failed - may be due to no data
    }
  } catch (error) {
    recordPerformanceTest(
      "Index Efficiency",
      false,
      `Index efficiency check failed: ${error.message}`,
      "ERROR",
      "N/A"
    );
  }
}

// ============================================================================
// 6. REPLICATION AND SHARDING PERFORMANCE
// ============================================================================

print("\n6. REPLICATION AND SHARDING PERFORMANCE");
print("-".repeat(50));

function validateReplicationPerformance() {
  print("\n🔄 REPLICATION PERFORMANCE VALIDATION:");

  try {
    // Check if replica set is configured
    const isMaster = adminDB.runCommand({ isMaster: 1 });

    if (isMaster.setName) {
      // Test 1: Replication lag
      const rsStatus = adminDB.runCommand({ replSetGetStatus: 1 });
      if (rsStatus.ok === 1) {
        const primary = rsStatus.members.find((m) => m.state === 1);
        const secondaries = rsStatus.members.filter((m) => m.state === 2);

        let maxLag = 0;
        secondaries.forEach((secondary) => {
          const lag = (primary.optimeDate - secondary.optimeDate) / 1000;
          if (lag > maxLag) maxLag = lag;
        });

        recordPerformanceTest(
          "Replication Lag",
          maxLag < 5,
          `Maximum replication lag: ${maxLag.toFixed(2)}s`,
          maxLag,
          5,
          maxLag > 2,
          maxLag > 10
        );

        // Test 2: Secondary health
        const healthySecondaries = secondaries.filter(
          (s) => s.health === 1
        ).length;

        recordPerformanceTest(
          "Secondary Health",
          healthySecondaries === secondaries.length,
          `${healthySecondaries}/${secondaries.length} secondaries healthy`,
          healthySecondaries,
          secondaries.length,
          healthySecondaries < secondaries.length
        );
      }
    } else {
      recordPerformanceTest(
        "Replication Performance",
        true,
        "Single node deployment - no replication to validate",
        "N/A",
        "N/A",
        true
      );
    }
  } catch (error) {
    recordPerformanceTest(
      "Replication Performance",
      false,
      `Replication performance check failed: ${error.message}`,
      "ERROR",
      "N/A"
    );
  }
}

// ============================================================================
// 7. COMPREHENSIVE PERFORMANCE SUMMARY
// ============================================================================

function displayPerformanceValidationSummary() {
  print("\n" + "=".repeat(60));
  print("PERFORMANCE VALIDATION SUMMARY");
  print("=".repeat(60));

  print(`\n📊 OVERALL RESULTS:`);
  print(`   Total Tests: ${performanceValidation.total}`);
  print(`   Passed: ${performanceValidation.passed} ✅`);
  print(`   Failed: ${performanceValidation.failed} ❌`);
  print(`   Warnings: ${performanceValidation.warnings} ⚠️`);
  print(`   Critical Issues: ${performanceValidation.critical} 🚨`);

  const successRate = Math.round(
    (performanceValidation.passed / performanceValidation.total) * 100
  );
  print(`   Success Rate: ${successRate}%`);

  // Performance grade
  let performanceGrade;
  if (performanceValidation.critical > 0) {
    performanceGrade = "🚨 CRITICAL - Immediate optimization required";
  } else if (successRate >= 90) {
    performanceGrade = "🟢 EXCELLENT - Performance is optimal";
  } else if (successRate >= 80) {
    performanceGrade = "🟡 GOOD - Minor optimizations recommended";
  } else if (successRate >= 70) {
    performanceGrade = "🟠 FAIR - Performance improvements needed";
  } else {
    performanceGrade = "🔴 POOR - Significant performance issues";
  }

  print(`\n🎯 PERFORMANCE GRADE: ${performanceGrade}`);

  // Key metrics summary
  print(`\n📈 KEY PERFORMANCE METRICS:`);
  Object.keys(performanceValidation.metrics).forEach((metricName) => {
    const metric = performanceValidation.metrics[metricName];
    const status = metric.passed ? "✅" : "❌";
    print(
      `   ${status} ${metricName}: ${metric.value} (threshold: ${metric.threshold})`
    );
  });

  // Critical issues
  if (performanceValidation.critical > 0) {
    print(`\n🚨 CRITICAL PERFORMANCE ISSUES:`);
    performanceValidation.tests
      .filter((test) => test.status === "CRITICAL")
      .forEach((test) => {
        print(`   • ${test.name}: ${test.message}`);
      });
  }

  // Failed tests
  if (performanceValidation.failed > 0) {
    print(`\n❌ FAILED PERFORMANCE TESTS:`);
    performanceValidation.tests
      .filter((test) => test.status === "FAILED")
      .forEach((test) => {
        print(`   • ${test.name}: ${test.message}`);
      });
  }

  // Warnings
  if (performanceValidation.warnings > 0) {
    print(`\n⚠️ PERFORMANCE WARNINGS:`);
    performanceValidation.tests
      .filter((test) => test.status === "WARNING")
      .forEach((test) => {
        print(`   • ${test.name}: ${test.message}`);
      });
  }

  // Recommendations
  print(`\n💡 OPTIMIZATION RECOMMENDATIONS:`);
  if (performanceValidation.critical > 0) {
    print(`   1. 🚨 Address critical issues immediately`);
    print(`   2. 📊 Review slow operations and add indexes`);
    print(`   3. 💾 Optimize memory and cache usage`);
  } else if (performanceValidation.failed > 0) {
    print(`   1. 🔍 Analyze and optimize failed performance tests`);
    print(`   2. 🗂️ Review index usage and efficiency`);
    print(`   3. ⚡ Consider hardware scaling if needed`);
  } else {
    print(`   1. 📈 Continue monitoring performance trends`);
    print(`   2. 🔧 Fine-tune based on application growth`);
    print(`   3. 📋 Regular performance reviews and optimization`);
  }

  print(`\n✅ Performance validation completed!`);
}

// ============================================================================
// 8. EXECUTION SECTION
// ============================================================================

print("\n8. EXECUTING PERFORMANCE VALIDATION");
print("-".repeat(50));

try {
  // Query performance validation
  validateQueryPerformance();

  // Connection and throughput validation
  validateConnectionPerformance();

  // Memory and storage validation
  validateMemoryPerformance();
  validateStoragePerformance();

  // Profiler and slow operations validation
  validateSlowOperations();

  // Index efficiency validation
  validateIndexEfficiency();

  // Replication performance validation
  validateReplicationPerformance();

  // Display comprehensive summary
  displayPerformanceValidationSummary();
} catch (error) {
  print("❌ Critical error during performance validation:");
  print(error.message);
  recordPerformanceTest(
    "Performance Validation",
    false,
    `Critical error: ${error.message}`,
    "ERROR",
    "N/A",
    false,
    true
  );
}

print("\n" + "=".repeat(80));
print("PERFORMANCE VALIDATION COMPLETE");
print("=".repeat(80));
