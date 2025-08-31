// File: scripts/10_performance/profiling_analysis.js
// MongoDB Performance Profiling and Analysis - Database profiler and slow ops analysis

/**
 * PERFORMANCE PROFILING AND ANALYSIS
 * ===================================
 * Comprehensive performance monitoring using MongoDB's built-in profiler.
 * Analyzes slow operations, query patterns, and database performance metrics.
 */

const db = db.getSiblingDB("lms_primary");
const adminDB = db.getSiblingDB("admin");

print("\n" + "=".repeat(80));
print("MONGODB PERFORMANCE PROFILING AND ANALYSIS");
print("=".repeat(80));

// ============================================================================
// 1. DATABASE PROFILER SETUP
// ============================================================================

print("\n1. DATABASE PROFILER SETUP");
print("-".repeat(50));

function setupDatabaseProfiler() {
  print("\n📊 DATABASE PROFILER CONFIGURATION:");

  const profilerLevels = [
    {
      level: 0,
      description: "Profiler disabled",
      useCase: "Production (default)",
    },
    {
      level: 1,
      description: "Profile slow operations only",
      useCase: "Performance monitoring",
    },
    {
      level: 2,
      description: "Profile all operations",
      useCase: "Debugging and analysis",
    },
  ];

  profilerLevels.forEach((config, index) => {
    print(`\n${config.level}. Level ${config.level}:`);
    print(`   Description: ${config.description}`);
    print(`   Use Case: ${config.useCase}`);
  });

  print("\n🔧 PROFILER CONFIGURATION COMMANDS:");
  print(`
// Enable profiler for slow operations (>100ms)
db.setProfilingLevel(1, { slowms: 100 })

// Enable profiler for all operations
db.setProfilingLevel(2)

// Enable profiler with custom filter
db.setProfilingLevel(1, {
    slowms: 50,
    sampleRate: 0.5,  // Sample 50% of operations
    filter: {
        $or: [
            { ns: "lms_primary.users" },
            { "command.find": "courses" },
            { "command.aggregate": { $exists: true } }
        ]
    }
})

// Check current profiler status
db.getProfilingStatus()

// Disable profiler
db.setProfilingLevel(0)
    `);

  try {
    const currentStatus = db.getProfilingStatus();
    print(`\n📈 Current Profiler Status:`);
    print(`   Level: ${currentStatus.level}`);
    print(`   Slow MS: ${currentStatus.slowms || 100}ms`);
    print(`   Sample Rate: ${currentStatus.sampleRate || 1.0}`);
  } catch (error) {
    print(`❌ Error checking profiler status: ${error.message}`);
  }
}

function configureProfilerCollectionSize() {
  print("\n💾 PROFILER COLLECTION MANAGEMENT:");

  print(`
// Create capped collection for profiler (default: system.profile)
db.createCollection("system.profile", {
    capped: true,
    size: 1024 * 1024 * 50  // 50MB cap
})

// Check profiler collection stats
db.system.profile.stats()

// Recreate profiler collection with new size
db.setProfilingLevel(0)  // Disable first
db.system.profile.drop()
db.createCollection("system.profile", {
    capped: true,
    size: 1024 * 1024 * 100  // 100MB cap
})
db.setProfilingLevel(1, { slowms: 100 })
    `);

  try {
    const profileStats = db.system.profile.stats();
    print(`\n📊 Profile Collection Stats:`);
    print(`   Size: ${Math.round(profileStats.size / 1024 / 1024)}MB`);
    print(`   Max Size: ${Math.round(profileStats.maxSize / 1024 / 1024)}MB`);
    print(`   Document Count: ${profileStats.count}`);
    print(`   Capped: ${profileStats.capped}`);
  } catch (error) {
    print(`ℹ️ Profile collection stats not available: ${error.message}`);
  }
}

// ============================================================================
// 2. SLOW OPERATION ANALYSIS
// ============================================================================

print("\n2. SLOW OPERATION ANALYSIS");
print("-".repeat(50));

function analyzeSlowOperations() {
  print("\n🐌 SLOW OPERATION ANALYSIS:");

  print("Query to find slowest operations:");
  print(`
// Find slowest operations in last hour
db.system.profile.find({
    ts: { $gte: new Date(Date.now() - 60*60*1000) },
    millis: { $exists: true }
}).sort({ millis: -1 }).limit(10)

// Slow operations by collection
db.system.profile.aggregate([
    { $match: { ts: { $gte: new Date(Date.now() - 24*60*60*1000) } } },
    { $group: {
        _id: "$ns",
        avgDuration: { $avg: "$millis" },
        maxDuration: { $max: "$millis" },
        count: { $sum: 1 }
    }},
    { $sort: { avgDuration: -1 } }
])

// Slow operations by operation type
db.system.profile.aggregate([
    { $match: { ts: { $gte: new Date(Date.now() - 24*60*60*1000) } } },
    { $group: {
        _id: {
            op: "$op",
            command: { $ifNull: [{ $arrayElemAt: [{ $objectToArray: "$command" }, 0] }, "unknown"] }
        },
        avgDuration: { $avg: "$millis" },
        count: { $sum: 1 }
    }},
    { $sort: { avgDuration: -1 } }
])
    `);

  try {
    // Get recent slow operations
    const slowOps = db.system.profile
      .find({
        ts: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
        millis: { $exists: true },
      })
      .sort({ millis: -1 })
      .limit(5)
      .toArray();

    if (slowOps.length > 0) {
      print(`\n⏱️ Recent Slow Operations (last hour):`);
      slowOps.forEach((op, index) => {
        print(`\n${index + 1}. ${op.ns} (${op.op || "unknown"}):`);
        print(`   Duration: ${op.millis}ms`);
        print(`   Timestamp: ${op.ts}`);
        if (op.command) {
          const cmdName = Object.keys(op.command)[0];
          print(`   Command: ${cmdName}`);
        }
        if (op.execStats) {
          print(`   Docs Examined: ${op.execStats.totalDocsExamined || 0}`);
          print(`   Docs Returned: ${op.execStats.totalDocsReturned || 0}`);
        }
      });
    } else {
      print("\n✅ No slow operations found in the last hour");
    }
  } catch (error) {
    print(`❌ Error analyzing slow operations: ${error.message}`);
  }
}

function identifyQueryPatterns() {
  print("\n🔍 QUERY PATTERN ANALYSIS:");

  print(`
// Find most frequent query shapes
db.system.profile.aggregate([
    { $match: { "command.find": { $exists: true } } },
    { $group: {
        _id: {
            collection: "$command.find",
            filter: "$command.filter"
        },
        count: { $sum: 1 },
        avgDuration: { $avg: "$millis" },
        maxDuration: { $max: "$millis" }
    }},
    { $sort: { count: -1 } },
    { $limit: 10 }
])

// Analyze aggregation pipeline performance
db.system.profile.aggregate([
    { $match: { "command.aggregate": { $exists: true } } },
    { $group: {
        _id: {
            collection: "$command.aggregate",
            pipelineStages: { $size: { $ifNull: ["$command.pipeline", []] } }
        },
        count: { $sum: 1 },
        avgDuration: { $avg: "$millis" }
    }},
    { $sort: { avgDuration: -1 } }
])

// Index usage analysis
db.system.profile.aggregate([
    { $match: {
        "execStats": { $exists: true },
        "execStats.executionStats.indexesUsed": { $exists: true }
    }},
    { $group: {
        _id: "$execStats.executionStats.indexesUsed",
        count: { $sum: 1 },
        avgDuration: { $avg: "$millis" }
    }},
    { $sort: { count: -1 } }
])
    `);
}

// ============================================================================
// 3. EXECUTION STATISTICS ANALYSIS
// ============================================================================

print("\n3. EXECUTION STATISTICS ANALYSIS");
print("-".repeat(50));

function analyzeExecutionStats() {
  print("\n📈 EXECUTION STATISTICS ANALYSIS:");

  print("Key execution statistics to monitor:");
  const executionMetrics = [
    {
      metric: "Documents Examined vs Returned",
      description: "Ratio indicates query efficiency",
      optimal: "Close to 1:1 ratio",
      command: "execStats.totalDocsExamined / execStats.totalDocsReturned",
    },
    {
      metric: "Index Usage",
      description: "Whether queries are using indexes",
      optimal: "Most queries should use indexes",
      command: "execStats.executionStats.indexesUsed",
    },
    {
      metric: "Execution Time Distribution",
      description: "Time spent in different stages",
      optimal: "Minimal time in document examination",
      command: "execStats.executionStats.stages",
    },
    {
      metric: "Working Set Size",
      description: "Memory usage during execution",
      optimal: "Within available RAM",
      command: "execStats.executionStats.memUsage",
    },
  ];

  executionMetrics.forEach((metric, index) => {
    print(`\n${index + 1}. ${metric.metric}:`);
    print(`   Description: ${metric.description}`);
    print(`   Optimal: ${metric.optimal}`);
    print(`   Check: ${metric.command}`);
  });

  print("\n🔢 EXECUTION EFFICIENCY ANALYSIS:");
  print(`
// Find queries with poor document examination ratios
db.system.profile.find({
    "execStats.totalDocsExamined": { $gt: 0 },
    "execStats.totalDocsReturned": { $gt: 0 },
    $expr: {
        $gt: [
            { $divide: ["$execStats.totalDocsExamined", "$execStats.totalDocsReturned"] },
            10  // Examining 10x more docs than returned
        ]
    }
}).sort({ millis: -1 })

// Queries not using indexes
db.system.profile.find({
    "execStats.executionStats.stage": "COLLSCAN",
    millis: { $gt: 100 }
}).sort({ millis: -1 })

// Memory-intensive operations
db.system.profile.find({
    "execStats.executionStats.memUsage": { $gt: 1024 * 1024 }  // > 1MB
}).sort({ "execStats.executionStats.memUsage": -1 })
    `);
}

function generatePerformanceReport() {
  print("\n📋 PERFORMANCE REPORT GENERATION:");

  print(`
function generateDailyPerformanceReport() {
    const report = {
        date: new Date(),
        timeRange: {
            start: new Date(Date.now() - 24*60*60*1000),
            end: new Date()
        },
        summary: {},
        slowOperations: [],
        recommendations: []
    };

    // Overall statistics
    const totalOps = db.system.profile.count({
        ts: { $gte: report.timeRange.start }
    });

    const slowOps = db.system.profile.find({
        ts: { $gte: report.timeRange.start },
        millis: { $gt: 100 }
    }).count();

    report.summary = {
        totalOperations: totalOps,
        slowOperations: slowOps,
        slowOperationPercentage: totalOps > 0 ? (slowOps / totalOps * 100).toFixed(2) : 0
    };

    // Top slow operations
    report.slowOperations = db.system.profile.find({
        ts: { $gte: report.timeRange.start },
        millis: { $gt: 100 }
    }).sort({ millis: -1 }).limit(10).toArray();

    // Performance recommendations
    if (report.summary.slowOperationPercentage > 5) {
        report.recommendations.push("High percentage of slow operations - review indexes");
    }

    // Collection scan detection
    const collScans = db.system.profile.count({
        ts: { $gte: report.timeRange.start },
        "execStats.executionStats.stage": "COLLSCAN"
    });

    if (collScans > 0) {
        report.recommendations.push(\`\${collScans} collection scans detected - add indexes\`);
    }

    // Store report
    db.performance_reports.insertOne(report);

    return report;
}
    `);
}

// ============================================================================
// 4. INDEX PERFORMANCE ANALYSIS
// ============================================================================

print("\n4. INDEX PERFORMANCE ANALYSIS");
print("-".repeat(50));

function analyzeIndexPerformance() {
  print("\n🗂️ INDEX PERFORMANCE ANALYSIS:");

  print(`
// Find operations that could benefit from indexes
db.system.profile.find({
    "execStats.executionStats.stage": "COLLSCAN",
    "millis": { $gt: 100 }
}).forEach(function(op) {
    print("Collection scan in " + op.ns + " took " + op.millis + "ms");
    if (op.command && op.command.filter) {
        print("Filter: " + JSON.stringify(op.command.filter));
        print("Consider creating index on: " + Object.keys(op.command.filter).join(", "));
    }
})

// Analyze index usage efficiency
db.system.profile.aggregate([
    { $match: { "execStats.indexesUsed": { $exists: true } } },
    { $group: {
        _id: "$execStats.indexesUsed",
        count: { $sum: 1 },
        avgDocsExamined: { $avg: "$execStats.totalDocsExamined" },
        avgDocsReturned: { $avg: "$execStats.totalDocsReturned" },
        avgDuration: { $avg: "$millis" }
    }},
    { $addFields: {
        efficiency: { $divide: ["$avgDocsReturned", "$avgDocsExamined"] }
    }},
    { $sort: { efficiency: 1 } }  // Least efficient first
])

// Multi-key index analysis
db.system.profile.find({
    "execStats.executionStats.isMultiKey": true,
    "millis": { $gt: 50 }
}).sort({ millis: -1 })
    `);

  print("\n📊 INDEX USAGE PATTERNS:");
  try {
    // Get collections for index analysis
    const collections = db.runCommand({ listCollections: 1 }).cursor.firstBatch;

    print("\n🔍 Index Usage by Collection:");
    collections.forEach((coll) => {
      if (!coll.name.startsWith("system.")) {
        try {
          const indexes = db[coll.name].getIndexes();
          print(`\n${coll.name} (${indexes.length} indexes):`);
          indexes.forEach((index) => {
            print(`   • ${index.name}: ${JSON.stringify(index.key)}`);
          });
        } catch (error) {
          print(`   Error getting indexes: ${error.message}`);
        }
      }
    });
  } catch (error) {
    print(`❌ Error analyzing index usage: ${error.message}`);
  }
}

// ============================================================================
// 5. REAL-TIME MONITORING
// ============================================================================

print("\n5. REAL-TIME MONITORING");
print("-".repeat(50));

function setupRealTimeMonitoring() {
  print("\n⚡ REAL-TIME PERFORMANCE MONITORING:");

  print(`
// Monitor current operations
function monitorCurrentOps() {
    const currentOps = db.currentOp({
        $or: [
            { "active": true },
            { "secs_running": { $gte: 1 } }
        ]
    });

    print("Active Operations:");
    currentOps.inprog.forEach(function(op) {
        if (op.secs_running > 5) {
            print(\`Long running op: \${op.op} on \${op.ns} (\${op.secs_running}s)\`);
            print(\`Query: \${JSON.stringify(op.command)}\`);
        }
    });

    return currentOps;
}

// Kill long-running operations
function killLongRunningOps(maxSeconds = 300) {
    db.currentOp(true).inprog.forEach(function(op) {
        if (op.secs_running > maxSeconds && op.opid) {
            print("Killing long-running operation: " + op.opid);
            db.killOp(op.opid);
        }
    });
}

// Real-time profiler monitoring
function startProfilerWatch() {
    print("Watching for slow operations...");

    // Create a tailable cursor on the profile collection
    const cursor = db.system.profile.find({
        ts: { $gte: new Date() }
    }).addOption(DBQuery.Option.tailable).addOption(DBQuery.Option.awaitData);

    while (cursor.hasNext()) {
        const op = cursor.next();
        if (op.millis && op.millis > 100) {
            print(\`SLOW OP: \${op.ns} (\${op.millis}ms)\`);
            if (op.command) {
                print(\`Command: \${Object.keys(op.command)[0]}\`);
            }
        }
    }
}
    `);
}

function setupPerformanceAlerts() {
  print("\n🚨 PERFORMANCE ALERTING:");

  const alertThresholds = [
    {
      metric: "Slow Operations",
      threshold: ">100ms",
      action: "Review query optimization",
    },
    {
      metric: "Collection Scans",
      threshold: ">10/hour",
      action: "Add missing indexes",
    },
    {
      metric: "Memory Usage",
      threshold: ">80%",
      action: "Scale resources or optimize queries",
    },
    {
      metric: "Connection Count",
      threshold: ">100",
      action: "Review connection pooling",
    },
    {
      metric: "Lock Wait Time",
      threshold: ">5s",
      action: "Analyze lock contention",
    },
  ];

  print("\n📋 Alert Thresholds:");
  alertThresholds.forEach((alert, index) => {
    print(`${index + 1}. ${alert.metric}:`);
    print(`   Threshold: ${alert.threshold}`);
    print(`   Action: ${alert.action}`);
  });

  print("\n🔧 Alert Implementation:");
  print(`
function checkPerformanceAlerts() {
    const alerts = [];
    const now = new Date();
    const hourAgo = new Date(now - 60*60*1000);

    // Check slow operations
    const slowOps = db.system.profile.count({
        ts: { $gte: hourAgo },
        millis: { $gt: 100 }
    });

    if (slowOps > 10) {
        alerts.push({
            type: 'SLOW_OPERATIONS',
            severity: 'WARNING',
            message: \`\${slowOps} slow operations in last hour\`,
            threshold: 10,
            actual: slowOps
        });
    }

    // Check collection scans
    const collScans = db.system.profile.count({
        ts: { $gte: hourAgo },
        "execStats.executionStats.stage": "COLLSCAN"
    });

    if (collScans > 5) {
        alerts.push({
            type: 'COLLECTION_SCANS',
            severity: 'WARNING',
            message: \`\${collScans} collection scans in last hour\`,
            threshold: 5,
            actual: collScans
        });
    }

    // Store alerts
    if (alerts.length > 0) {
        db.performance_alerts.insertOne({
            timestamp: now,
            alerts: alerts
        });
    }

    return alerts;
}
    `);
}

// ============================================================================
// 6. EXECUTION SECTION
// ============================================================================

print("\n6. EXECUTING PROFILING ANALYSIS SETUP");
print("-".repeat(50));

try {
  // Setup database profiler
  setupDatabaseProfiler();
  configureProfilerCollectionSize();

  // Analyze slow operations
  analyzeSlowOperations();
  identifyQueryPatterns();

  // Execution statistics analysis
  analyzeExecutionStats();
  generatePerformanceReport();

  // Index performance analysis
  analyzeIndexPerformance();

  // Real-time monitoring
  setupRealTimeMonitoring();
  setupPerformanceAlerts();

  print("\n✅ Performance profiling and analysis setup completed!");
  print("📊 Database profiler configured for performance monitoring");
  print("🐌 Slow operation analysis queries provided");
  print("📈 Execution statistics analysis implemented");
  print("🚨 Real-time monitoring and alerting configured");

  print("\n🚀 NEXT STEPS:");
  print("1. Enable profiler at appropriate level (1 for production)");
  print("2. Set up automated performance reporting");
  print("3. Configure alerting thresholds for your environment");
  print("4. Regular review of slow operations and optimization");
  print("5. Monitor index usage and add missing indexes");
} catch (error) {
  print("❌ Error during profiling analysis setup:");
  print(error.message);
}

print("\n" + "=".repeat(80));
print("PERFORMANCE PROFILING AND ANALYSIS COMPLETE");
print("=".repeat(80));
