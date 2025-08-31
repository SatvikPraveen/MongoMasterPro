# Performance Tuning Cheat Sheet

**Location:** `docs/cheat_sheets/performance_tuning.md`

## Query Optimization

### Query Analysis

```javascript
// Enable profiler for slow operations
db.setProfilingLevel(2, { slowms: 100 });

// Analyze slow queries
db.system.profile.find().limit(5).sort({ ts: -1 }).pretty();

// Detailed execution statistics
db.collection.find({ query }).explain("executionStats");

// Key metrics to monitor:
// - executionTimeMillis (< 100ms target)
// - totalDocsExamined vs totalDocsReturned (should be close)
// - stage: "IXSCAN" vs "COLLSCAN"
// - indexHit ratio > 95%
```

### Index Optimization

```javascript
// Create optimal compound indexes (ESR rule)
db.orders.createIndex({
  userId: 1, // Equality
  status: 1, // Equality
  createdAt: -1, // Sort
  amount: 1, // Range
});

// Covering indexes (avoid document fetching)
db.users.createIndex({
  email: 1,
  status: 1,
  name: 1,
  _id: 1,
});

// Query fully covered by index
db.users.find(
  { email: "user@example.com", status: "active" },
  { name: 1, _id: 0 }
);

// Monitor index usage
db.collection.aggregate([{ $indexStats: {} }]);

// Find unused indexes
db.runCommand({
  aggregate: "collection",
  pipeline: [{ $indexStats: {} }, { $match: { "accesses.ops": 0 } }],
});
```

### Query Pattern Optimization

```javascript
// Use projection to limit data transfer
db.products.find({ category: "electronics" }, { name: 1, price: 1, _id: 0 });

// Limit results early
db.products.find({ category: "electronics" }).sort({ price: -1 }).limit(10);

// Use hint for query plan consistency
db.products
  .find({ category: "electronics", price: { $lt: 500 } })
  .hint({ category: 1, price: 1 });

// Avoid regex at beginning of string
// Bad: { name: /^prod/i }
// Good: { name: { $gte: "prod", $lt: "proe" } }

// Use $in instead of multiple $or for same field
// Bad: { $or: [{ status: "active" }, { status: "pending" }] }
// Good: { status: { $in: ["active", "pending"] } }
```

## Aggregation Optimization

### Pipeline Order Optimization

```javascript
// Optimal pipeline order
db.orders.aggregate([
  // 1. Filter early (reduce dataset size)
  { $match: { status: "completed", date: { $gte: new Date("2024-01-01") } } },

  // 2. Project only needed fields
  { $project: { userId: 1, amount: 1, date: 1 } },

  // 3. Sort before grouping when possible
  { $sort: { userId: 1, date: -1 } },

  // 4. Group operations
  {
    $group: {
      _id: "$userId",
      totalSpent: { $sum: "$amount" },
      lastOrder: { $first: "$date" },
    },
  },

  // 5. Final sort/limit
  { $sort: { totalSpent: -1 } },
  { $limit: 10 },
]);
```

### Memory-Efficient Aggregation

```javascript
// Use allowDiskUse for large datasets
db.collection.aggregate(pipeline, { allowDiskUse: true });

// Batch processing for very large collections
function processInBatches(collection, pipeline, batchSize = 10000) {
  let skip = 0;
  let batch = [];

  do {
    batch = collection
      .aggregate([{ $skip: skip }, { $limit: batchSize }, ...pipeline])
      .toArray();

    // Process batch
    processBatch(batch);
    skip += batchSize;
  } while (batch.length === batchSize);
}

// Use $sample for random sampling
db.collection.aggregate([
  { $sample: { size: 1000 } },
  // ... rest of pipeline
]);
```

### Index-Supported Aggregation

```javascript
// Create supporting indexes for aggregation
db.sales.createIndex({ date: -1, region: 1, amount: 1 });

// Aggregation that uses the index
db.sales.aggregate([
  { $match: { date: { $gte: new Date("2024-01-01") } } }, // Uses index
  { $sort: { date: -1 } }, // Uses index
  {
    $group: {
      _id: "$region",
      total: { $sum: "$amount" }, // amount is covered by index
    },
  },
]);
```

## Connection and Session Management

### Connection Pool Optimization

```javascript
// MongoDB connection string with optimization
const uri =
  "mongodb://localhost:27017/mydb?" +
  "maxPoolSize=100&" + // Max connections in pool
  "minPoolSize=10&" + // Min connections in pool
  "maxIdleTimeMS=30000&" + // Close idle connections after 30s
  "waitQueueTimeoutMS=5000&" + // Max wait time for connection
  "serverSelectionTimeoutMS=5000&" + // Server selection timeout
  "heartbeatFrequencyMS=10000"; // Heartbeat interval

// Monitor connection pool
db.runCommand({ connPoolStats: 1 });
```

### Session Lifecycle Management

```javascript
// Efficient session handling
function withSession(operations) {
  const session = client.startSession();
  try {
    return operations(session);
  } finally {
    session.endSession(); // Always close sessions
  }
}

// Batch operations in single session
withSession((session) => {
  const bulk = db.collection.initializeUnorderedBulkOp({ session });

  for (const doc of documents) {
    bulk.insert(doc);
  }

  return bulk.execute();
});
```

## Memory Management

### WiredTiger Cache Tuning

```javascript
// Check current cache usage
db.serverStatus().wiredTiger.cache;

// Configure cache size (50% of RAM is default)
// In mongod.conf:
// storage:
//   wiredTiger:
//     engineConfig:
//       cacheSizeGB: 8

// Monitor cache efficiency
db.serverStatus().wiredTiger.cache["bytes currently in the cache"] /
  db.serverStatus().wiredTiger.cache["maximum bytes configured"];
```

### Working Set Management

```javascript
// Monitor working set size
db.runCommand({ serverStatus: 1 }).mem

// Optimize document size
// Keep frequently accessed fields together
// Use shorter field names for large collections
// Consider field-level compression

// Example optimized schema
{
  _id: ObjectId("..."),
  uid: 12345,           // Instead of "userId"
  sts: "active",        // Instead of "status"
  ct: ISODate("..."),   // Instead of "createdAt"
  // Embedded subdocuments for related data
  prof: {               // Instead of separate profile collection
    nm: "John Doe",     // name
    em: "john@ex.com"   // email
  }
}
```

## Storage Optimization

### Index Size Management

```javascript
// Monitor index sizes
db.collection.stats().indexSizes;

// Prefix compression for similar keys
db.collection.createIndex(
  { category: 1, subcategory: 1 },
  { background: true }
);

// Partial indexes to reduce size
db.users.createIndex(
  { email: 1 },
  {
    partialFilterExpression: {
      email: { $exists: true, $ne: null },
    },
  }
);

// Drop unused indexes
db.collection.dropIndex("unused_index_name");

// Rebuild indexes to reclaim space
db.collection.reIndex();
```

### Document Design Optimization

```javascript
// Efficient document structure
// Good: Related data together
{
  _id: ObjectId("..."),
  name: "Product Name",
  pricing: {              // Embedded for 1-to-1 relation
    price: 99.99,
    currency: "USD",
    discountPct: 10
  },
  categoryId: ObjectId("...") // Reference for 1-to-many
}

// Avoid: Deep nesting (> 3 levels)
// Avoid: Very wide documents (> 100 fields)
// Avoid: Large arrays (> 1000 elements)

// Use bucketing pattern for time-series
{
  _id: ObjectId("..."),
  sensor: "temp_01",
  date: ISODate("2024-01-01"),
  readings: [
    { time: ISODate("2024-01-01T00:00:00"), value: 23.5 },
    { time: ISODate("2024-01-01T00:01:00"), value: 23.7 },
    // ... up to 1000 readings per hour
  ]
}
```

## Read/Write Performance

### Read Optimization

```javascript
// Use read preferences strategically
// Primary: Consistency required
db.orders.find({ status: "pending" }).readPref("primary");

// Secondary: Analytics, reporting
db.analytics.aggregate(pipeline).readPref("secondary");

// Nearest: Geographically distributed reads
db.products.find({}).readPref("nearest");

// Read concern optimization
// local: Fastest, eventual consistency
db.collection.find({}).readConcern({ level: "local" });

// majority: Strong consistency, slower
db.collection.find({}).readConcern({ level: "majority" });
```

### Write Optimization

```javascript
// Bulk operations for multiple writes
const bulk = db.collection.initializeUnorderedBulkOp();

documents.forEach((doc) => {
  bulk.insert(doc);
});

bulk.execute({ w: "majority", j: true });

// Write concern tuning
// Fast: { w: 1 } - Acknowledge from primary only
// Durable: { w: "majority", j: true } - Majority + journal
// Custom: { w: 3 } - Acknowledge from 3 members

db.collection.insertMany(documents, {
  w: "majority",
  j: true,
  ordered: false, // Allow parallel writes
});

// Batch size optimization
const batchSize = 1000;
for (let i = 0; i < documents.length; i += batchSize) {
  const batch = documents.slice(i, i + batchSize);
  db.collection.insertMany(batch, { ordered: false });
}
```

## Monitoring and Metrics

### Key Performance Indicators

```javascript
// Real-time performance monitoring
const stats = db.runCommand({ serverStatus: 1 });

// Important metrics to track:
console.log("Connections:", stats.connections.current);
console.log("Operations per second:", stats.opcounters);
console.log("Memory usage:", stats.mem);
console.log("Cache hit ratio:", stats.wiredTiger.cache);
console.log("Index miss ratio:", stats.indexCounters?.missRatio || "N/A");

// Query performance metrics
db.collection
  .find({ query })
  .explain("executionStats")
  .forEach((plan) => {
    console.log("Execution time:", plan.executionStats.executionTimeMillis);
    console.log("Docs examined:", plan.executionStats.totalDocsExamined);
    console.log("Docs returned:", plan.executionStats.totalDocsReturned);
    console.log(
      "Index used:",
      plan.executionStats.indexName || "Collection scan"
    );
  });
```

### Automated Performance Monitoring

```javascript
// Collection of performance monitoring functions
function monitorSlowQueries() {
  return db.system.profile.aggregate([
    { $match: { millis: { $gt: 100 } } },
    {
      $group: {
        _id: "$command.find",
        avgDuration: { $avg: "$millis" },
        count: { $sum: 1 },
      },
    },
    { $sort: { avgDuration: -1 } },
    { $limit: 10 },
  ]);
}

function monitorIndexUsage() {
  return db.collection.aggregate([
    { $indexStats: {} },
    { $match: { "accesses.ops": { $lt: 10 } } },
    {
      $project: {
        name: 1,
        usageCount: "$accesses.ops",
        size: "$spec",
      },
    },
  ]);
}

function monitorCollectionStats() {
  const collections = db.runCommand("listCollections").cursor.firstBatch;

  collections.forEach((coll) => {
    const stats = db[coll.name].stats();
    console.log(`${coll.name}:`);
    console.log(`  Documents: ${stats.count}`);
    console.log(`  Data Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(
      `  Index Size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`
    );
    console.log(
      `  Storage Size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`
    );
  });
}
```

## Hardware and Infrastructure

### Server Configuration

```bash
# MongoDB configuration optimizations
# /etc/mongod.conf

storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 8                    # 50-60% of available RAM
      journalCompressor: snappy         # Fast compression
      directoryForIndexes: true         # Separate index/data directories
    collectionConfig:
      blockCompressor: snappy
    indexConfig:
      prefixCompression: true

net:
  maxIncomingConnections: 20000        # Based on expected load
  compression:
    compressors: snappy               # Network compression

operationProfiling:
  mode: slowOp
  slowOpThresholdMs: 100              # Profile operations > 100ms
```

### OS-Level Optimizations

```bash
# Disable transparent huge pages
echo never > /sys/kernel/mm/transparent_hugepage/enabled
echo never > /sys/kernel/mm/transparent_hugepage/defrag

# Set file descriptor limits
# /etc/security/limits.conf
mongodb soft nofile 64000
mongodb hard nofile 64000

# Disable NUMA if available
numactl --interleave=all mongod --config /etc/mongod.conf

# Set up appropriate swap
# Recommendation: swap = 50% of RAM, swappiness = 1
echo 1 > /proc/sys/vm/swappiness
```

## Performance Testing

### Benchmark Framework

```javascript
// Performance testing helper
function benchmark(name, operation, iterations = 1000) {
  const start = Date.now();

  for (let i = 0; i < iterations; i++) {
    operation();
  }

  const end = Date.now();
  const avgTime = (end - start) / iterations;

  console.log(
    `${name}: ${avgTime.toFixed(2)}ms average (${iterations} iterations)`
  );
  return avgTime;
}

// Example usage
benchmark(
  "Find by indexed field",
  () => {
    db.users.findOne({ email: "user@example.com" });
  },
  1000
);

benchmark(
  "Aggregation pipeline",
  () => {
    db.orders
      .aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: "$userId", total: { $sum: "$amount" } } },
      ])
      .toArray();
  },
  100
);
```

### Load Testing Patterns

```javascript
// Concurrent operation testing
function loadTest(operations, concurrency = 10, duration = 60000) {
  const results = [];
  const startTime = Date.now();

  function runWorker() {
    while (Date.now() - startTime < duration) {
      const operation =
        operations[Math.floor(Math.random() * operations.length)];
      const start = Date.now();

      try {
        operation();
        results.push({ success: true, duration: Date.now() - start });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
  }

  // Start concurrent workers
  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(
      new Promise((resolve) => {
        runWorker();
        resolve();
      })
    );
  }

  return Promise.all(workers).then(() => {
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);
    const avgDuration =
      successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;

    return {
      totalOperations: results.length,
      successful: successful.length,
      failed: failed.length,
      successRate:
        ((successful.length / results.length) * 100).toFixed(2) + "%",
      avgDuration: avgDuration.toFixed(2) + "ms",
      operationsPerSecond: (results.length / (duration / 1000)).toFixed(2),
    };
  });
}
```

## Performance Checklist

### Query Optimization

- [ ] Proper indexes for all query patterns
- [ ] Query plans using IXSCAN, not COLLSCAN
- [ ] totalDocsExamined close to totalDocsReturned
- [ ] Execution time < 100ms for critical queries
- [ ] Covering indexes where possible

### Aggregation Optimization

- [ ] $match stages early in pipeline
- [ ] Proper index support for initial stages
- [ ] allowDiskUse enabled for large datasets
- [ ] Memory-efficient pipeline design
- [ ] Appropriate use of $limit and $skip

### Infrastructure

- [ ] Sufficient RAM for working set
- [ ] SSD storage for production workloads
- [ ] Proper MongoDB configuration
- [ ] OS-level optimizations applied
- [ ] Network latency minimized

### Monitoring

- [ ] Profiler enabled for slow operations
- [ ] Index usage statistics monitored
- [ ] Connection pool health checked
- [ ] Memory usage tracked
- [ ] Automated alerting configured
