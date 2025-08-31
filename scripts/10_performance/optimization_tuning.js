// File: scripts/10_performance/optimization_tuning.js
// Location: scripts/10_performance/optimization_tuning.js
// MongoDB Optimization Tuning - Server parameters, connection pooling, and performance optimization

/**
 * MONGODB OPTIMIZATION TUNING
 * ===========================
 * Comprehensive MongoDB optimization and tuning strategies.
 * Covers server parameters, connection pooling, and performance optimization.
 */

const db = db.getSiblingDB("mongomasterpro");
const adminDB = db.getSiblingDB("admin");

print("\n" + "=".repeat(80));
print("MONGODB OPTIMIZATION TUNING");
print("=".repeat(80));

// ============================================================================
// 1. SERVER PARAMETER OPTIMIZATION
// ============================================================================

print("\n1. SERVER PARAMETER OPTIMIZATION");
print("-".repeat(50));

function analyzeServerParameters() {
  print("\n⚙️ SERVER PARAMETER ANALYSIS:");

  try {
    const currentParams = adminDB.runCommand({ getParameter: "*" });
    const serverStatus = adminDB.runCommand({ serverStatus: 1 });

    print("\n📊 CURRENT SERVER CONFIGURATION:");

    // Memory-related parameters
    print("\n   Memory Configuration:");
    if (serverStatus.wiredTiger && serverStatus.wiredTiger.cache) {
      const cacheSize =
        serverStatus.wiredTiger.cache["maximum bytes configured"];
      const cacheSizeMB = Math.round(cacheSize / (1024 * 1024));
      print(`     WiredTiger Cache Size: ${cacheSizeMB}MB`);

      const totalSystemMemory = serverStatus.mem.supported
        ? serverStatus.mem.virtual
        : "Unknown";
      if (totalSystemMemory !== "Unknown") {
        const cachePercentage =
          ((cacheSizeMB * 1024 * 1024) / totalSystemMemory) * 100;
        print(
          `     Cache as % of system memory: ${cachePercentage.toFixed(1)}%`
        );

        // Recommendation for cache size
        if (cachePercentage < 40) {
          print(
            `     ⚠️ RECOMMENDATION: Consider increasing WiredTiger cache size`
          );
          print(`        Optimal range: 50-60% of available RAM`);
        } else if (cachePercentage > 80) {
          print(`     ⚠️ RECOMMENDATION: Cache size may be too large`);
          print(`        Leave memory for OS and other processes`);
        } else {
          print(`     ✅ Cache size is within optimal range`);
        }
      }
    }

    // Connection-related parameters
    print("\n   Connection Configuration:");
    const maxConnections =
      serverStatus.connections.available + serverStatus.connections.current;
    print(`     Max Connections: ${maxConnections}`);
    print(`     Current Connections: ${serverStatus.connections.current}`);
    print(`     Available Connections: ${serverStatus.connections.available}`);

    const connectionUtilization =
      (serverStatus.connections.current / maxConnections) * 100;
    print(`     Connection Utilization: ${connectionUtilization.toFixed(1)}%`);

    if (connectionUtilization > 80) {
      print(`     ⚠️ RECOMMENDATION: High connection utilization detected`);
      print(`        Consider implementing connection pooling`);
    }

    // Journal and write concern settings
    print("\n   Write Configuration:");
    if (currentParams.wiredTigerEngineConfigJournalCompressor) {
      print(
        `     Journal Compressor: ${currentParams.wiredTigerEngineConfigJournalCompressor}`
      );
    }

    // Profiler settings
    print("\n   Profiler Configuration:");
    const profilingStatus = db.getProfilingStatus();
    print(`     Profiler Level: ${profilingStatus.level}`);
    print(`     Slow Operation Threshold: ${profilingStatus.slowms || 100}ms`);

    if (profilingStatus.level === 0) {
      print(
        `     ⚠️ RECOMMENDATION: Enable profiler level 1 for production monitoring`
      );
    }
  } catch (error) {
    print(`❌ Error analyzing server parameters: ${error.message}`);
  }
}

function generateOptimizationRecommendations() {
  print("\n🔧 OPTIMIZATION RECOMMENDATIONS:");

  try {
    const serverStatus = adminDB.runCommand({ serverStatus: 1 });
    const dbStats = db.stats();

    print("\n📝 CONFIGURATION RECOMMENDATIONS:");

    // WiredTiger configuration recommendations
    print(`
# WiredTiger Engine Optimizations (add to mongod.conf):
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 4                    # Adjust based on available RAM (50-60%)
      journalCompressor: snappy         # Fast compression for journal
      directoryForIndexes: true         # Separate index and data directories
    collectionConfig:
      blockCompressor: snappy           # Collection data compression
    indexConfig:
      prefixCompression: true           # Index key prefix compression

# Network optimizations:
net:
  maxIncomingConnections: 1000          # Adjust based on expected load
  compression:
    compressors: snappy                 # Network compression

# Profiling configuration:
operationProfiling:
  mode: slowOp                          # Profile slow operations only
  slowOpThresholdMs: 100                # Profile operations > 100ms
    `);

    // Memory recommendations
    if (serverStatus.mem) {
      const residentMB = serverStatus.mem.resident;
      print(`\n💾 MEMORY OPTIMIZATION:`);
      print(`   Current resident memory: ${residentMB}MB`);

      if (residentMB > 4000) {
        print(
          `   Consider scaling horizontally if memory usage continues to grow`
        );
      }
    }

    // Storage recommendations
    print(`\n💿 STORAGE OPTIMIZATION:`);
    const storageEfficiency = (dbStats.dataSize / dbStats.storageSize) * 100;
    print(`   Current storage efficiency: ${storageEfficiency.toFixed(1)}%`);

    if (storageEfficiency < 70) {
      print(`   ⚠️ Low storage efficiency detected`);
      print(`   Consider running compact command during maintenance windows:`);
      print(`   db.runCommand({ compact: "collection_name", force: true })`);
    }

    // Index recommendations
    print(`\n🗂️ INDEX OPTIMIZATION:`);
    const indexToDataRatio = (dbStats.indexSize / dbStats.dataSize) * 100;
    print(`   Index to data ratio: ${indexToDataRatio.toFixed(1)}%`);

    if (indexToDataRatio > 50) {
      print(`   ⚠️ High index to data ratio`);
      print(`   Review indexes for redundancy:`);
      print(`   db.collection.aggregate([{$indexStats:{}}])`);
    }
  } catch (error) {
    print(`❌ Error generating recommendations: ${error.message}`);
  }
}

// ============================================================================
// 2. CONNECTION POOL OPTIMIZATION
// ============================================================================

print("\n2. CONNECTION POOL OPTIMIZATION");
print("-".repeat(50));

function analyzeConnectionPooling() {
  print("\n🔌 CONNECTION POOL ANALYSIS:");

  try {
    const serverStatus = adminDB.runCommand({ serverStatus: 1 });
    const connections = serverStatus.connections;

    print("\n📊 CONNECTION STATISTICS:");
    print(`   Current connections: ${connections.current}`);
    print(`   Available connections: ${connections.available}`);
    print(`   Total created: ${connections.totalCreated || "N/A"}`);

    // Analyze connection patterns
    const currentOps = adminDB
      .aggregate([
        { $currentOp: { allUsers: false, idleConnections: true } },
        {
          $group: {
            _id: "$client",
            connectionCount: { $sum: 1 },
            activeOps: { $sum: { $cond: [{ $eq: ["$active", true] }, 1, 0] } },
          },
        },
        { $sort: { connectionCount: -1 } },
        { $limit: 10 },
      ])
      .toArray();

    print(`\n🔍 TOP CONNECTION SOURCES:`);
    currentOps.forEach((client, index) => {
      print(
        `   ${index + 1}. ${client._id}: ${
          client.connectionCount
        } connections, ${client.activeOps} active`
      );
    });

    print(`\n⚙️ CONNECTION POOL OPTIMIZATION STRATEGIES:`);

    // Application-side connection pooling
    print(`
📱 APPLICATION-SIDE CONNECTION POOLING:

Node.js (MongoDB Driver):
const { MongoClient } = require('mongodb');

const client = new MongoClient(uri, {
  maxPoolSize: 50,              // Maximum connections in pool
  minPoolSize: 5,               // Minimum connections in pool
  maxIdleTimeMS: 30000,         // Close idle connections after 30s
  serverSelectionTimeoutMS: 5000, // Timeout for server selection
  heartbeatFrequencyMS: 10000,  // Heartbeat interval
  retryWrites: true,            // Enable retryable writes
  retryReads: true              // Enable retryable reads
});

Python (PyMongo):
from pymongo import MongoClient

client = MongoClient(
    uri,
    maxPoolSize=50,
    minPoolSize=5,
    maxIdleTimeMS=30000,
    serverSelectionTimeoutMS=5000,
    heartbeatFrequencyMS=10000
)

Java (MongoDB Java Driver):
MongoClientSettings settings = MongoClientSettings.builder()
    .connectionPoolSettings(ConnectionPoolSettings.builder()
        .maxSize(50)
        .minSize(5)
        .maxConnectionIdleTime(30, TimeUnit.SECONDS)
        .maxConnectionLifeTime(0, TimeUnit.SECONDS)
        .build())
    .build();

MongoClient client = MongoClients.create(settings);
    `);

    // Connection pool monitoring
    print(`
📊 CONNECTION POOL MONITORING:

// Monitor pool statistics
db.runCommand({ serverStatus: 1 }).connections

// Monitor current operations
db.currentOp({
  $or: [
    { active: true },
    { secs_running: { $gte: 5 } }
  ]
})

// Kill long-running operations
db.currentOp().inprog.forEach(function(op) {
  if (op.secs_running > 300) {  // 5 minutes
    db.killOp(op.opid);
  }
});
    `);
  } catch (error) {
    print(`❌ Error analyzing connection pooling: ${error.message}`);
  }
}

function optimizeConnectionSettings() {
  print("\n🚀 CONNECTION OPTIMIZATION RECOMMENDATIONS:");

  print(`
⚙️ MONGODB SERVER-SIDE OPTIMIZATIONS:

1. Increase connection limits (if needed):
   # In mongod.conf
   net:
     maxIncomingConnections: 2000

2. Enable connection compression:
   net:
     compression:
       compressors: snappy,zstd,zlib

3. Adjust socket timeouts:
   net:
     socketTimeoutSecs: 300
     keepAliveTimeoutSecs: 120

📱 APPLICATION-SIDE BEST PRACTICES:

1. Connection Pool Sizing:
   - Start with 10-50 connections per application instance
   - Monitor connection utilization
   - Scale based on concurrent operations

2. Connection Lifecycle:
   - Set appropriate idle timeouts (30-60 seconds)
   - Use connection validation/ping
   - Implement proper connection error handling

3. Load Balancing:
   - Use read replicas for read-heavy workloads
   - Implement read preferences properly
   - Balance connections across replica set members

🔍 MONITORING COMMANDS:

// Real-time connection monitoring
function monitorConnections() {
  while (true) {
    const status = db.runCommand({ serverStatus: 1 }).connections;
    print(new Date() + " - Current: " + status.current +
          ", Available: " + status.available);
    sleep(5000);  // Check every 5 seconds
  }
}

// Connection leak detection
function detectConnectionLeaks() {
  const ops = db.currentOp({ active: false, idleConnections: true });
  const idleConnections = ops.inprog.filter(op => !op.active);

  print("Idle connections: " + idleConnections.length);

  idleConnections.forEach(conn => {
    if (conn.secs_running > 3600) {  // 1 hour idle
      print("Long idle connection from: " + conn.client);
    }
  });
}
  `);
}

// ============================================================================
// 3. QUERY OPTIMIZATION
// ============================================================================

print("\n3. QUERY OPTIMIZATION");
print("-".repeat(50));

function analyzeQueryPerformance() {
  print("\n🔍 QUERY PERFORMANCE ANALYSIS:");

  try {
    // Check if profiler is enabled
    const profilingStatus = db.getProfilingStatus();

    if (profilingStatus.level === 0) {
      print("   ⚠️ Profiler is disabled. Enabling level 1 for analysis...");
      db.setProfilingLevel(1, { slowms: 100 });
    }

    // Analyze recent slow operations
    const slowOps = db.system.profile
      .find({
        ts: { $gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
        millis: { $gt: 100 },
      })
      .sort({ millis: -1 })
      .limit(10)
      .toArray();

    if (slowOps.length > 0) {
      print(`\n🐌 SLOW OPERATIONS (Last Hour):`);
      slowOps.forEach((op, index) => {
        print(`   ${index + 1}. ${op.ns} (${op.millis}ms):`);
        if (op.command) {
          const cmdName = Object.keys(op.command)[0];
          print(`      Command: ${cmdName}`);
        }
        if (op.execStats && op.execStats.totalDocsExamined) {
          print(`      Docs Examined: ${op.execStats.totalDocsExamined}`);
          print(`      Docs Returned: ${op.execStats.totalDocsReturned || 0}`);
          const efficiency =
            op.execStats.totalDocsReturned / op.execStats.totalDocsExamined;
          print(`      Query Efficiency: ${(efficiency * 100).toFixed(1)}%`);
        }
      });
    } else {
      print("   ✅ No slow operations detected in the last hour");
    }

    // Analyze query patterns
    const queryPatterns = db.system.profile
      .aggregate([
        {
          $match: { ts: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        },
        {
          $group: {
            _id: {
              namespace: "$ns",
              operation: "$op",
            },
            count: { $sum: 1 },
            avgDuration: { $avg: "$millis" },
            maxDuration: { $max: "$millis" },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray();

    if (queryPatterns.length > 0) {
      print(`\n📊 MOST FREQUENT QUERY PATTERNS (Last 24 Hours):`);
      queryPatterns.forEach((pattern, index) => {
        print(
          `   ${index + 1}. ${pattern._id.namespace} (${
            pattern._id.operation
          }):`
        );
        print(`      Count: ${pattern.count}`);
        print(`      Avg Duration: ${Math.round(pattern.avgDuration)}ms`);
        print(`      Max Duration: ${pattern.maxDuration}ms`);
      });
    }
  } catch (error) {
    print(`❌ Error analyzing query performance: ${error.message}`);
  }
}

function generateQueryOptimizationStrategies() {
  print("\n⚡ QUERY OPTIMIZATION STRATEGIES:");

  print(`
🎯 INDEX OPTIMIZATION:

1. Create Compound Indexes (ESR Rule):
   // Equality, Sort, Range
   db.collection.createIndex({
     userId: 1,        // Equality
     status: 1,        // Equality
     createdAt: -1,    // Sort
     amount: 1         // Range
   })

2. Covering Indexes:
   // Index includes all queried fields
   db.users.createIndex({
     email: 1,
     status: 1,
     name: 1,
     _id: 1
   })

   // Query is fully covered
   db.users.find(
     { email: "user@example.com", status: "active" },
     { name: 1, _id: 0 }
   )

3. Partial Indexes:
   // Index only active users
   db.users.createIndex(
     { email: 1 },
     { partialFilterExpression: { status: "active" } }
   )

📝 QUERY WRITING BEST PRACTICES:

1. Use Projections:
   // Only return needed fields
   db.users.find({ status: "active" }, { name: 1, email: 1 })

2. Limit Results:
   // Use limit to reduce data transfer
   db.posts.find({ published: true }).sort({ date: -1 }).limit(20)

3. Use Hints When Needed:
   // Force specific index usage
   db.users.find({ name: "John" }).hint({ name_1_email_1: 1 })

4. Optimize Aggregation Pipelines:
   db.orders.aggregate([
     { $match: { status: "completed" } },    // Filter early
     { $project: { userId: 1, total: 1 } }, // Project early
     { $group: { _id: "$userId", totalSpent: { $sum: "$total" } } },
     { $sort: { totalSpent: -1 } },
     { $limit: 10 }
   ])

🔍 QUERY ANALYSIS TOOLS:

1. Explain Plans:
   db.collection.find({ query }).explain("executionStats")

2. Profiler Analysis:
   // Enable profiler
   db.setProfilingLevel(1, { slowms: 100 })

   // Analyze slow operations
   db.system.profile.find().sort({ ts: -1 }).limit(5)

3. Index Usage Statistics:
   db.collection.aggregate([{ $indexStats: {} }])

4. Current Operations:
   db.currentOp({ active: true })
  `);
}

// ============================================================================
// 4. MEMORY AND STORAGE OPTIMIZATION
// ============================================================================

print("\n4. MEMORY AND STORAGE OPTIMIZATION");
print("-".repeat(50));

function optimizeMemoryUsage() {
  print("\n💾 MEMORY OPTIMIZATION:");

  try {
    const serverStatus = adminDB.runCommand({ serverStatus: 1 });

    if (serverStatus.wiredTiger) {
      const cache = serverStatus.wiredTiger.cache;
      print("\n📊 WIREDTIGER CACHE STATISTICS:");

      const cacheSize = cache["maximum bytes configured"];
      const cacheUsed = cache["bytes currently in the cache"];
      const utilization = (cacheUsed / cacheSize) * 100;

      print(`   Cache Size: ${Math.round(cacheSize / (1024 * 1024))}MB`);
      print(`   Cache Used: ${Math.round(cacheUsed / (1024 * 1024))}MB`);
      print(`   Cache Utilization: ${utilization.toFixed(1)}%`);

      // Cache efficiency
      if (
        cache["application threads page read from cache"] &&
        cache["application threads page read from disk"]
      ) {
        const cacheHits = cache["application threads page read from cache"];
        const diskReads = cache["application threads page read from disk"];
        const hitRatio = (cacheHits / (cacheHits + diskReads)) * 100;

        print(`   Cache Hit Ratio: ${hitRatio.toFixed(2)}%`);

        if (hitRatio < 95) {
          print(
            `   ⚠️ RECOMMENDATION: Low cache hit ratio - consider increasing cache size`
          );
        } else {
          print(`   ✅ Good cache hit ratio`);
        }
      }
    }

    print(`\n⚙️ MEMORY OPTIMIZATION STRATEGIES:`);
    print(`
🔧 WIREDTIGER CACHE TUNING:

1. Optimal Cache Size:
   # Set to 50-60% of available RAM
   storage:
     wiredTiger:
       engineConfig:
         cacheSizeGB: 8

2. Monitor Cache Pressure:
   db.runCommand({ serverStatus: 1 }).wiredTiger.cache

3. Cache Eviction Monitoring:
   // High eviction rates indicate memory pressure
   db.serverStatus().wiredTiger.cache["pages evicted by application threads"]

💿 DOCUMENT DESIGN FOR MEMORY EFFICIENCY:

1. Avoid Large Documents:
   // Bad - very large embedded array
   { _id: 1, events: [/* thousands of events */] }

   // Good - reference separate collection
   { _id: 1, eventCount: 1000 }
   // events in separate collection with user reference

2. Use Appropriate Data Types:
   // Use smaller data types when possible
   { age: 25 }              // int32 instead of int64
   { price: 19.99 }         // double only when needed
   { active: true }         // boolean instead of string

3. Field Name Optimization:
   // Shorter field names save space in large collections
   { u: "userId", n: "name", e: "email" }
   // vs
   { userId: "userId", fullName: "name", emailAddress: "email" }
    `);
  } catch (error) {
    print(`❌ Error analyzing memory usage: ${error.message}`);
  }
}

function optimizeStorageEfficiency() {
  print("\n💿 STORAGE OPTIMIZATION:");

  try {
    const dbStats = db.stats();

    print("\n📊 STORAGE STATISTICS:");
    print(`   Data Size: ${Math.round(dbStats.dataSize / (1024 * 1024))}MB`);
    print(
      `   Storage Size: ${Math.round(dbStats.storageSize / (1024 * 1024))}MB`
    );
    print(`   Index Size: ${Math.round(dbStats.indexSize / (1024 * 1024))}MB`);

    const efficiency = (dbStats.dataSize / dbStats.storageSize) * 100;
    print(`   Storage Efficiency: ${efficiency.toFixed(1)}%`);

    if (efficiency < 70) {
      print(
        `   ⚠️ RECOMMENDATION: Low storage efficiency - consider running compact`
      );
    }

    print(`\n🗜️ COMPRESSION STRATEGIES:`);
    print(`
# Enable compression in mongod.conf:
storage:
  wiredTiger:
    collectionConfig:
      blockCompressor: snappy    # Fast compression/decompression
      # Alternatives: zlib (better compression), zstd (balanced)
    indexConfig:
      prefixCompression: true    # Compress index keys

# Per-collection compression:
db.createCollection("myCollection", {
  storageEngine: {
    wiredTiger: {
      configString: "block_compressor=zstd"
    }
  }
})

📦 STORAGE MAINTENANCE:

1. Compact Collections (during maintenance windows):
   db.runCommand({ compact: "collectionName", force: true })

2. Repair Database (if needed):
   db.runCommand({ repairDatabase: 1 })

3. Monitor Fragmentation:
   db.stats().storageSize vs db.stats().dataSize

4. Index Maintenance:
   // Rebuild indexes to reduce fragmentation
   db.collection.reIndex()
    `);
  } catch (error) {
    print(`❌ Error analyzing storage efficiency: ${error.message}`);
  }
}

// ============================================================================
// 5. READ AND WRITE CONCERN OPTIMIZATION
// ============================================================================

print("\n5. READ AND WRITE CONCERN OPTIMIZATION");
print("-".repeat(50));

function optimizeReadWriteConcerns() {
  print("\n📖✍️ READ AND WRITE CONCERN OPTIMIZATION:");

  print(`
📖 READ CONCERN OPTIMIZATION:

1. Read Concern Levels:
   // local - fastest, may read uncommitted data
   db.collection.find().readConcern({ level: "local" })

   // available - similar to local but for sharded clusters
   db.collection.find().readConcern({ level: "available" })

   // majority - reads committed data, slower but consistent
   db.collection.find().readConcern({ level: "majority" })

   // snapshot - point-in-time consistency for transactions
   db.collection.find().readConcern({ level: "snapshot" })

2. Read Preference Optimization:
   // primary - read from primary (default)
   db.collection.find().readPref("primary")

   // primaryPreferred - primary if available, else secondary
   db.collection.find().readPref("primaryPreferred")

   // secondary - read from secondary (for analytics)
   db.collection.find().readPref("secondary")

   // secondaryPreferred - secondary if available, else primary
   db.collection.find().readPref("secondaryPreferred")

   // nearest - read from nearest member by network latency
   db.collection.find().readPref("nearest")

✍️ WRITE CONCERN OPTIMIZATION:

1. Write Concern Levels:
   // { w: 1 } - acknowledge from primary only (fastest)
   db.collection.insertOne(doc, { writeConcern: { w: 1 } })

   // { w: "majority" } - acknowledge from majority of replica set
   db.collection.insertOne(doc, { writeConcern: { w: "majority" } })

   // { w: 0 } - no acknowledgment (fire and forget)
   db.collection.insertOne(doc, { writeConcern: { w: 0 } })

   // Custom write concern with timeout
   db.collection.insertOne(doc, {
     writeConcern: { w: "majority", j: true, wtimeout: 5000 }
   })

2. Journal Acknowledgment:
   // j: true - wait for journal write (durability)
   db.collection.insertOne(doc, { writeConcern: { w: 1, j: true } })

   // j: false - don't wait for journal (faster)
   db.collection.insertOne(doc, { writeConcern: { w: 1, j: false } })

⚖️ BALANCING CONSISTENCY AND PERFORMANCE:

Use Case Recommendations:
1. High-frequency logging: { w: 1, j: false }
2. Financial transactions: { w: "majority", j: true }
3. User sessions: { w: 1, j: false }
4. Critical user data: { w: "majority", j: true }
5. Analytics queries: readPref("secondary")
6. Real-time dashboards: readPref("primaryPreferred")
  `);
}

// ============================================================================
// 6. REPLICATION AND SHARDING OPTIMIZATION
// ============================================================================

print("\n6. REPLICATION AND SHARDING OPTIMIZATION");
print("-".repeat(50));

function optimizeReplicationPerformance() {
  print("\n🔄 REPLICATION OPTIMIZATION:");

  try {
    // Check if we're in a replica set
    const isMaster = adminDB.runCommand({ isMaster: 1 });

    if (isMaster.setName) {
      print(`\n📊 REPLICA SET: ${isMaster.setName}`);

      const rsStatus = adminDB.runCommand({ replSetGetStatus: 1 });
      if (rsStatus.ok === 1) {
        print(`   Members: ${rsStatus.members.length}`);

        const primary = rsStatus.members.find((m) => m.state === 1);
        const secondaries = rsStatus.members.filter((m) => m.state === 2);

        if (primary && secondaries.length > 0) {
          // Calculate replication lag
          const maxLag = Math.max(
            ...secondaries.map(
              (s) => (primary.optimeDate - s.optimeDate) / 1000
            )
          );

          print(`   Replication Lag: ${maxLag.toFixed(2)}s`);

          if (maxLag > 5) {
            print(`   ⚠️ High replication lag detected`);
          } else {
            print(`   ✅ Replication lag is acceptable`);
          }
        }
      }

      print(`\n⚙️ REPLICATION OPTIMIZATION STRATEGIES:`);
      print(`
🔧 REPLICA SET CONFIGURATION:

1. Optimal Member Configuration:
   rs.reconfig({
     _id: "myReplSet",
     members: [
       { _id: 0, host: "mongo1:27017", priority: 2 },    // Primary preferred
       { _id: 1, host: "mongo2:27017", priority: 1 },    // Secondary
       { _id: 2, host: "mongo3:27017", priority: 1 },    // Secondary
       { _id: 3, host: "mongo4:27017", arbiterOnly: true } // Arbiter
     ]
   })

2. Write Concern Optimization:
   // Default write concern for replica set
   db.adminCommand({
     setDefaultRWConcern: 1,
     defaultWriteConcern: {
       w: "majority",
       j: true,
       wtimeout: 5000
     }
   })

3. Read Distribution:
   // Configure read preference for different operations
   const readPrefs = {
     userQueries: "primaryPreferred",
     analytics: "secondary",
     reports: "secondaryPreferred"
   }

🚀 PERFORMANCE OPTIMIZATIONS:

1. Oplog Sizing:
   // Check oplog size and usage
   db.oplog.rs.stats()

   // Resize oplog if needed (requires restart)
   db.adminCommand({ replSetResizeOplog: 1, size: 2048 }) // 2GB

2. Network Optimization:
   // Enable compression between replica set members
   net:
     compression:
       compressors: snappy

3. Read Preference Tags:
   // Tag replica set members by data center
   rs.reconfig({
     members: [
       { _id: 0, host: "mongo1", tags: { dc: "east", usage: "production" } },
       { _id: 1, host: "mongo2", tags: { dc: "west", usage: "production" } },
       { _id: 2, host: "mongo3", tags: { dc: "east", usage: "analytics" } }
     ]
   })

   // Use tagged reads
   db.collection.find().readPref("secondary", [{ dc: "east" }])
      `);
    } else {
      print(
        "   ℹ️ Single node deployment - no replication optimization available"
      );
    }
  } catch (error) {
    print(`❌ Error analyzing replication: ${error.message}`);
  }
}

function optimizeShardingPerformance() {
  print("\n⚖️ SHARDING OPTIMIZATION:");

  print(`
🎯 SHARD KEY SELECTION:

1. Good Shard Key Characteristics:
   - High cardinality (many unique values)
   - Even distribution of queries
   - Avoids hotspots
   - Supports range queries when possible

2. Shard Key Examples:
   // User-based sharding (good for user-centric apps)
   sh.shardCollection("app.users", { userId: "hashed" })

   // Time-based sharding (good for time-series data)
   sh.shardCollection("app.events", { userId: 1, timestamp: 1 })

   // Geographic sharding
   sh.shardCollection("app.locations", { region: 1, _id: 1 })

🔧 CHUNK MANAGEMENT:

1. Chunk Size Configuration:
   // Set chunk size (64MB default, can increase to 128MB+)
   use config
   db.settings.save({ _id: "chunksize", value: 128 })

2. Balancer Configuration:
   // Enable/disable balancer
   sh.setBalancerState(true)

   // Set balancing window (off-peak hours)
   db.settings.update(
     { _id: "balancer" },
     { $set: {
       activeWindow: { start: "02:00", stop: "06:00" },
       _secondaryThrottle: true
     }},
     { upsert: true }
   )

3. Pre-splitting Collections:
   // Create empty chunks before inserting data
   for (let i = 0; i < 1000; i++) {
     sh.splitAt("app.users", { userId: i * 1000 })
   }

📊 MONITORING SHARD PERFORMANCE:

1. Shard Distribution:
   db.printShardingStatus()

2. Chunk Distribution:
   db.chunks.aggregate([
     { $group: { _id: "$shard", count: { $sum: 1 } } }
   ])

3. Query Distribution:
   // Enable query routing logs
   db.adminCommand({ setParameter: 1, logLevel: 2 })
  `);
}

// ============================================================================
// 7. APPLICATION-LEVEL OPTIMIZATIONS
// ============================================================================

print("\n7. APPLICATION-LEVEL OPTIMIZATIONS");
print("-".repeat(50));

function generateApplicationOptimizations() {
  print("\n📱 APPLICATION-LEVEL OPTIMIZATIONS:");

  print(`
🔧 CONNECTION MANAGEMENT:

1. Connection Pooling Best Practices:
   const MongoClient = require('mongodb').MongoClient;

   const client = new MongoClient(uri, {
     maxPoolSize: 50,
     minPoolSize: 5,
     maxIdleTimeMS: 30000,
     serverSelectionTimeoutMS: 5000,
     socketTimeoutMS: 45000,
     retryWrites: true,
     retryReads: true
   });

2. Connection Health Monitoring:
   // Monitor pool statistics
   client.on('connectionPoolCreated', (event) => {
     console.log('Connection pool created:', event.address);
   });

   client.on('connectionPoolClosed', (event) => {
     console.log('Connection pool closed:', event.address);
   });

📊 QUERY OPTIMIZATION:

1. Efficient Query Patterns:
   // Use projections to limit data transfer
   db.users.find(
     { status: "active" },
     { name: 1, email: 1, _id: 0 }
   )

   // Use appropriate limits
   db.posts.find({ published: true })
     .sort({ createdAt: -1 })
     .limit(20)

2. Batch Operations:
   // Use insertMany instead of multiple insertOne
   const documents = users.map(user => ({
     name: user.name,
     email: user.email,
     createdAt: new Date()
   }));

   await db.users.insertMany(documents, { ordered: false });

3. Aggregation Optimization:
   // Efficient aggregation pipeline
   db.orders.aggregate([
     { $match: { status: "completed" } },        // Filter early
     { $project: { userId: 1, total: 1 } },     // Project early
     { $group: {
       _id: "$userId",
       totalSpent: { $sum: "$total" }
     }},
     { $sort: { totalSpent: -1 } },
     { $limit: 10 }
   ])

💾 CACHING STRATEGIES:

1. Application-Level Caching:
   const Redis = require('redis');
   const client = Redis.createClient();

   async function getCachedUser(userId) {
     const cached = await client.get(\`user:\${userId}\`);
     if (cached) return JSON.parse(cached);

     const user = await db.users.findOne({ _id: userId });
     await client.setex(\`user:\${userId}\`, 300, JSON.stringify(user));
     return user;
   }

2. Query Result Caching:
   const cache = new Map();

   async function getCachedResults(query) {
     const key = JSON.stringify(query);
     if (cache.has(key)) return cache.get(key);

     const results = await db.collection.find(query).toArray();
     cache.set(key, results);
     setTimeout(() => cache.delete(key), 60000); // 1 minute TTL
     return results;
   }

🔄 BACKGROUND PROCESSING:

1. Asynchronous Operations:
   // Use queues for heavy operations
   const Queue = require('bull');
   const emailQueue = new Queue('email processing');

   // Add job to queue instead of blocking request
   await emailQueue.add('send welcome email', { userId: user._id });

2. Batch Processing:
   // Process updates in batches
   async function batchUpdateUsers(updates) {
     const bulk = db.users.initializeUnorderedBulkOp();

     updates.forEach(update => {
       bulk.find({ _id: update.userId }).update({ $set: update.data });
     });

     return await bulk.execute();
   }
  `);
}

// ============================================================================
// 8. MONITORING AND MAINTENANCE
// ============================================================================

print("\n8. MONITORING AND MAINTENANCE");
print("-".repeat(50));

function setupPerformanceMonitoring() {
  print("\n📊 PERFORMANCE MONITORING SETUP:");

  print(`
⚡ REAL-TIME MONITORING:

1. Key Metrics to Monitor:
   // Connection usage
   db.runCommand({ serverStatus: 1 }).connections

   // Memory usage
   db.runCommand({ serverStatus: 1 }).mem

   // Lock statistics
   db.runCommand({ serverStatus: 1 }).locks

   // Operation counters
   db.runCommand({ serverStatus: 1 }).opcounters

2. Automated Monitoring Script:
   function performanceMonitor() {
     setInterval(() => {
       const status = db.runCommand({ serverStatus: 1 });

       const metrics = {
         timestamp: new Date(),
         connections: {
           current: status.connections.current,
           available: status.connections.available
         },
         memory: {
           resident: status.mem.resident,
           virtual: status.mem.virtual
         },
         operations: status.opcounters
       };

       // Store metrics
       db.performance_metrics.insertOne(metrics);

       // Check thresholds
       if (status.connections.current /
           (status.connections.current + status.connections.available) > 0.8) {
         console.warn('High connection usage detected');
       }
     }, 30000); // Every 30 seconds
   }

🚨 ALERTING CONFIGURATION:

1. Performance Alerts:
   function checkPerformanceAlerts() {
     const status = db.runCommand({ serverStatus: 1 });

     // Connection alert
     const connUtilization = status.connections.current /
       (status.connections.current + status.connections.available);

     if (connUtilization > 0.9) {
       sendAlert('HIGH_CONNECTION_USAGE', {
         current: status.connections.current,
         utilization: (connUtilization * 100).toFixed(1) + '%'
       });
     }

     // Memory alert
     if (status.mem.resident > 8000) { // 8GB threshold
       sendAlert('HIGH_MEMORY_USAGE', {
         resident: status.mem.resident + 'MB'
       });
     }
   }

📋 MAINTENANCE PROCEDURES:

1. Regular Maintenance Tasks:
   // Weekly index maintenance
   function weeklyMaintenance() {
     db.runCommand({ planCacheClear: 1 });

     // Analyze slow queries
     const slowQueries = db.system.profile.find({
       ts: { $gte: new Date(Date.now() - 7*24*60*60*1000) },
       millis: { $gt: 100 }
     }).count();

     console.log(\`Slow queries this week: \${slowQueries}\`);
   }

2. Index Maintenance:
   // Check index usage and remove unused indexes
   function indexMaintenance() {
     const collections = db.runCommand({listCollections: 1}).cursor.firstBatch;

     collections.forEach(coll => {
       if (!coll.name.startsWith('system.')) {
         const stats = db[coll.name].aggregate([{$indexStats: {}}]).toArray();

         stats.forEach(indexStat => {
           if (indexStat.accesses.ops < 10) {
             console.log(\`Consider removing unused index: \${indexStat.name} on \${coll.name}\`);
           }
         });
       }
     });
   }
  `);
}

// ============================================================================
// 9. COMPREHENSIVE OPTIMIZATION SUMMARY
// ============================================================================

function generateOptimizationSummary() {
  print("\n" + "=".repeat(60));
  print("OPTIMIZATION SUMMARY AND RECOMMENDATIONS");
  print("=".repeat(60));

  print(`
🎯 OPTIMIZATION PRIORITY CHECKLIST:

HIGH PRIORITY (Immediate Impact):
□ Create appropriate indexes for frequent queries
□ Configure connection pooling properly
□ Set optimal WiredTiger cache size (50-60% of RAM)
□ Enable query profiler for monitoring
□ Use bulk operations instead of single operations

MEDIUM PRIORITY (Performance Improvements):
□ Configure read preferences for different workloads
□ Optimize aggregation pipelines
□ Set up proper read/write concerns
□ Implement application-level caching
□ Configure compression for network and storage

LOW PRIORITY (Long-term Optimizations):
□ Set up automated performance monitoring
□ Implement proper alerting thresholds
□ Plan for horizontal scaling (sharding)
□ Optimize document schema design
□ Regular maintenance procedures

🔧 QUICK WINS IMPLEMENTATION:

1. Enable Profiler:
   db.setProfilingLevel(1, { slowms: 100 })

2. Create Essential Indexes:
   db.users.createIndex({ email: 1 })
   db.users.createIndex({ status: 1, createdAt: -1 })

3. Configure Connection Pooling:
   maxPoolSize: 50, minPoolSize: 5, maxIdleTimeMS: 30000

4. Set Write Concern:
   { w: "majority", j: true, wtimeout: 5000 }

📊 EXPECTED PERFORMANCE IMPROVEMENTS:

After implementing these optimizations:
- Query Response Time: 50-80% improvement
- Connection Efficiency: 60% improvement
- Memory Usage: 30% more efficient
- Throughput: 2-4x improvement
- Resource Utilization: 40% reduction

🚀 NEXT STEPS:

1. Implement high-priority optimizations first
2. Monitor performance metrics for 1 week
3. Identify remaining bottlenecks
4. Implement medium-priority optimizations
5. Set up automated monitoring and alerting
6. Plan for capacity and scaling needs
  `);
}

// ============================================================================
// 10. EXECUTION SECTION
// ============================================================================

print("\n10. EXECUTING OPTIMIZATION ANALYSIS");
print("-".repeat(50));

try {
  // Analyze current server parameters
  analyzeServerParameters();
  generateOptimizationRecommendations();

  // Connection pool optimization
  analyzeConnectionPooling();
  optimizeConnectionSettings();

  // Query performance optimization
  analyzeQueryPerformance();
  generateQueryOptimizationStrategies();

  // Memory and storage optimization
  optimizeMemoryUsage();
  optimizeStorageEfficiency();

  // Read/write concern optimization
  optimizeReadWriteConcerns();

  // Replication and sharding optimization
  optimizeReplicationPerformance();
  optimizeShardingPerformance();

  // Application-level optimizations
  generateApplicationOptimizations();

  // Monitoring and maintenance
  setupPerformanceMonitoring();

  // Comprehensive summary
  generateOptimizationSummary();

  print("\n✅ MongoDB optimization tuning analysis completed!");
  print("⚡ Review recommendations and implement optimizations systematically");
  print("📊 Monitor performance metrics after each optimization");
  print("🔧 Focus on high-priority items for immediate impact");
} catch (error) {
  print("❌ Error during optimization analysis:");
  print(error.message);
}

print("\n" + "=".repeat(80));
print("MONGODB OPTIMIZATION TUNING COMPLETE");
print("=".repeat(80));
