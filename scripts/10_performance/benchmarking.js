// File: scripts/10_performance/benchmarking.js
// Location: scripts/10_performance/benchmarking.js
// MongoDB Performance Benchmarking - Workload simulation, metrics collection

/**
 * PERFORMANCE BENCHMARKING
 * ========================
 * Comprehensive performance benchmarking and workload simulation.
 * Tests database performance under various conditions and loads.
 */

const db = db.getSiblingDB("mongomasterpro");
const adminDB = db.getSiblingDB("admin");

print("\n" + "=".repeat(80));
print("MONGODB PERFORMANCE BENCHMARKING");
print("=".repeat(80));

// Global benchmarking results
let benchmarkResults = {
  startTime: new Date(),
  environment: {},
  tests: [],
  summary: {},
  recommendations: [],
};

// Helper function to record benchmark results
function recordBenchmark(testName, duration, operations, metrics = {}) {
  const opsPerSecond = operations / (duration / 1000);
  const result = {
    testName: testName,
    duration: duration,
    operations: operations,
    opsPerSecond: Math.round(opsPerSecond),
    timestamp: new Date(),
    metrics: metrics,
  };

  benchmarkResults.tests.push(result);

  print(
    `   ${testName}: ${operations} ops in ${duration}ms (${Math.round(
      opsPerSecond
    )} ops/sec)`
  );

  return result;
}

// ============================================================================
// 1. ENVIRONMENT AND BASELINE SETUP
// ============================================================================

print("\n1. ENVIRONMENT AND BASELINE SETUP");
print("-".repeat(50));

function setupBenchmarkEnvironment() {
  print("\n🏗️ BENCHMARK ENVIRONMENT SETUP:");

  try {
    // Get server information
    const buildInfo = adminDB.runCommand({ buildInfo: 1 });
    const serverStatus = adminDB.runCommand({ serverStatus: 1 });

    benchmarkResults.environment = {
      mongoVersion: buildInfo.version,
      platform: `${buildInfo.buildEnvironment.target_os} ${buildInfo.buildEnvironment.target_arch}`,
      uptime: serverStatus.uptime,
      connections: serverStatus.connections,
      memory: serverStatus.mem,
      startTime: new Date(),
    };

    print(`   MongoDB Version: ${buildInfo.version}`);
    print(`   Platform: ${benchmarkResults.environment.platform}`);
    print(`   Available Connections: ${serverStatus.connections.available}`);
    print(`   Memory: ${serverStatus.mem.resident}MB resident`);

    // Create benchmark collections
    db.benchmark_users.drop();
    db.benchmark_orders.drop();
    db.benchmark_products.drop();

    // Create indexes for benchmarking
    db.benchmark_users.createIndex({ email: 1 });
    db.benchmark_users.createIndex({ status: 1, createdAt: -1 });
    db.benchmark_users.createIndex({ department: 1, role: 1 });

    db.benchmark_orders.createIndex({ userId: 1, createdAt: -1 });
    db.benchmark_orders.createIndex({ status: 1 });
    db.benchmark_orders.createIndex({ total: 1 });

    db.benchmark_products.createIndex({ category: 1, price: 1 });
    db.benchmark_products.createIndex({ name: "text", description: "text" });

    print("   ✅ Benchmark collections and indexes created");
  } catch (error) {
    print(`   ❌ Environment setup error: ${error.message}`);
  }
}

function generateBenchmarkData(
  userCount = 10000,
  orderCount = 50000,
  productCount = 1000
) {
  print(`\n📊 GENERATING BENCHMARK DATA:`);
  print(
    `   Users: ${userCount}, Orders: ${orderCount}, Products: ${productCount}`
  );

  const startTime = Date.now();

  try {
    // Generate users in batches
    const userBatchSize = 1000;
    const userBatches = Math.ceil(userCount / userBatchSize);

    for (let batch = 0; batch < userBatches; batch++) {
      const users = [];
      const batchStart = batch * userBatchSize;
      const batchEnd = Math.min(batchStart + userBatchSize, userCount);

      for (let i = batchStart; i < batchEnd; i++) {
        users.push({
          userId: i,
          email: `user${i}@benchmark.com`,
          firstName: `User${i}`,
          lastName: `Test${i % 100}`,
          department: ["Engineering", "Marketing", "Sales", "Support"][i % 4],
          role: ["user", "admin", "manager"][i % 3],
          status: i % 10 === 0 ? "inactive" : "active",
          createdAt: new Date(
            Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
          ),
          profile: {
            age: 20 + (i % 50),
            interests: ["tech", "business", "education"].slice(0, (i % 3) + 1),
          },
        });
      }

      db.benchmark_users.insertMany(users, { ordered: false });
    }

    // Generate products
    const products = [];
    const categories = ["Electronics", "Books", "Clothing", "Home", "Sports"];

    for (let i = 0; i < productCount; i++) {
      products.push({
        productId: i,
        name: `Product ${i}`,
        description: `High-quality product number ${i} with excellent features`,
        category: categories[i % categories.length],
        price: Math.round((Math.random() * 1000 + 10) * 100) / 100,
        inStock: i % 20 !== 0,
        rating: Math.round((Math.random() * 2 + 3) * 10) / 10,
        tags: [`tag${i % 10}`, `feature${i % 5}`],
      });
    }

    db.benchmark_products.insertMany(products, { ordered: false });

    // Generate orders
    const orderBatchSize = 2000;
    const orderBatches = Math.ceil(orderCount / orderBatchSize);

    for (let batch = 0; batch < orderBatches; batch++) {
      const orders = [];
      const batchStart = batch * orderBatchSize;
      const batchEnd = Math.min(batchStart + orderBatchSize, orderCount);

      for (let i = batchStart; i < batchEnd; i++) {
        const itemCount = Math.floor(Math.random() * 5) + 1;
        const items = [];
        let total = 0;

        for (let j = 0; j < itemCount; j++) {
          const productId = Math.floor(Math.random() * productCount);
          const quantity = Math.floor(Math.random() * 3) + 1;
          const price = Math.round((Math.random() * 100 + 10) * 100) / 100;

          items.push({
            productId: productId,
            quantity: quantity,
            unitPrice: price,
            subtotal: quantity * price,
          });

          total += quantity * price;
        }

        orders.push({
          orderId: i,
          userId: Math.floor(Math.random() * userCount),
          status: [
            "pending",
            "processing",
            "shipped",
            "delivered",
            "cancelled",
          ][Math.floor(Math.random() * 5)],
          items: items,
          total: Math.round(total * 100) / 100,
          createdAt: new Date(
            Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000
          ),
          shippingAddress: {
            street: `${i} Test Street`,
            city: ["New York", "Los Angeles", "Chicago", "Houston"][i % 4],
            zipCode: `${10000 + (i % 90000)}`,
          },
        });
      }

      db.benchmark_orders.insertMany(orders, { ordered: false });
    }

    const duration = Date.now() - startTime;
    print(`   ✅ Data generation completed in ${duration}ms`);

    // Verify data counts
    const actualUsers = db.benchmark_users.countDocuments();
    const actualOrders = db.benchmark_orders.countDocuments();
    const actualProducts = db.benchmark_products.countDocuments();

    print(
      `   📊 Generated: ${actualUsers} users, ${actualOrders} orders, ${actualProducts} products`
    );
  } catch (error) {
    print(`   ❌ Data generation error: ${error.message}`);
  }
}

// ============================================================================
// 2. READ PERFORMANCE BENCHMARKS
// ============================================================================

print("\n2. READ PERFORMANCE BENCHMARKS");
print("-".repeat(50));

function benchmarkReadOperations() {
  print("\n📖 READ OPERATION BENCHMARKS:");

  // Test 1: Single document lookups
  print("\n   Single Document Lookups:");
  const lookupTests = [
    {
      name: "User by ID",
      collection: "benchmark_users",
      query: { userId: 1000 },
    },
    {
      name: "User by Email",
      collection: "benchmark_users",
      query: { email: "user1000@benchmark.com" },
    },
    {
      name: "Product by ID",
      collection: "benchmark_products",
      query: { productId: 100 },
    },
    {
      name: "Order by ID",
      collection: "benchmark_orders",
      query: { orderId: 5000 },
    },
  ];

  lookupTests.forEach((test) => {
    const iterations = 1000;
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      const randomId = Math.floor(Math.random() * 1000) + 1;
      const modifiedQuery = { ...test.query };

      // Randomize the ID to prevent caching effects
      if (modifiedQuery.userId) modifiedQuery.userId = randomId;
      if (modifiedQuery.productId) modifiedQuery.productId = randomId;
      if (modifiedQuery.orderId) modifiedQuery.orderId = randomId * 10;
      if (modifiedQuery.email)
        modifiedQuery.email = `user${randomId}@benchmark.com`;

      db[test.collection].findOne(modifiedQuery);
    }

    const duration = Date.now() - startTime;
    recordBenchmark(test.name, duration, iterations);
  });

  // Test 2: Range queries
  print("\n   Range Queries:");
  const rangeTests = [
    {
      name: "Users by Date Range",
      collection: "benchmark_users",
      query: {
        createdAt: {
          $gte: new Date("2024-01-01"),
          $lt: new Date("2024-06-01"),
        },
      },
      limit: 100,
    },
    {
      name: "Orders by Total Range",
      collection: "benchmark_orders",
      query: { total: { $gte: 100, $lte: 500 } },
      limit: 200,
    },
    {
      name: "Products by Price Range",
      collection: "benchmark_products",
      query: { price: { $gte: 50, $lte: 200 } },
      limit: 50,
    },
  ];

  rangeTests.forEach((test) => {
    const iterations = 100;
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      db[test.collection].find(test.query).limit(test.limit).toArray();
    }

    const duration = Date.now() - startTime;
    recordBenchmark(test.name, duration, iterations);
  });

  // Test 3: Aggregation queries
  print("\n   Aggregation Queries:");
  const aggregationTests = [
    {
      name: "User Count by Department",
      collection: "benchmark_users",
      pipeline: [
        { $group: { _id: "$department", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ],
    },
    {
      name: "Order Statistics by Status",
      collection: "benchmark_orders",
      pipeline: [
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            avgTotal: { $avg: "$total" },
            totalRevenue: { $sum: "$total" },
          },
        },
        { $sort: { totalRevenue: -1 } },
      ],
    },
    {
      name: "Top Products by Category",
      collection: "benchmark_products",
      pipeline: [
        { $match: { inStock: true } },
        {
          $group: {
            _id: "$category",
            avgPrice: { $avg: "$price" },
            avgRating: { $avg: "$rating" },
            count: { $sum: 1 },
          },
        },
        { $sort: { avgRating: -1 } },
      ],
    },
  ];

  aggregationTests.forEach((test) => {
    const iterations = 50;
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      db[test.collection].aggregate(test.pipeline).toArray();
    }

    const duration = Date.now() - startTime;
    recordBenchmark(test.name, duration, iterations);
  });
}

// ============================================================================
// 3. WRITE PERFORMANCE BENCHMARKS
// ============================================================================

print("\n3. WRITE PERFORMANCE BENCHMARKS");
print("-".repeat(50));

function benchmarkWriteOperations() {
  print("\n✍️ WRITE OPERATION BENCHMARKS:");

  // Test 1: Single inserts
  print("\n   Single Insert Operations:");
  const singleInsertStart = Date.now();
  const insertCount = 1000;

  for (let i = 0; i < insertCount; i++) {
    db.benchmark_temp.insertOne({
      tempId: i,
      data: `Test data ${i}`,
      timestamp: new Date(),
      value: Math.random() * 1000,
    });
  }

  const singleInsertDuration = Date.now() - singleInsertStart;
  recordBenchmark("Single Inserts", singleInsertDuration, insertCount);

  db.benchmark_temp.drop();

  // Test 2: Bulk inserts
  print("\n   Bulk Insert Operations:");
  const bulkSizes = [100, 500, 1000, 2000];

  bulkSizes.forEach((batchSize) => {
    const documents = [];
    for (let i = 0; i < batchSize; i++) {
      documents.push({
        bulkId: i,
        batchSize: batchSize,
        data: `Bulk test data ${i}`,
        timestamp: new Date(),
        value: Math.random() * 1000,
      });
    }

    const bulkInsertStart = Date.now();
    db.benchmark_temp.insertMany(documents, { ordered: false });
    const bulkInsertDuration = Date.now() - bulkInsertStart;

    recordBenchmark(
      `Bulk Insert (${batchSize})`,
      bulkInsertDuration,
      batchSize
    );
    db.benchmark_temp.drop();
  });

  // Test 3: Updates
  print("\n   Update Operations:");

  // Prepare test data for updates
  const updateTestData = [];
  for (let i = 0; i < 5000; i++) {
    updateTestData.push({
      updateId: i,
      status: "pending",
      value: i,
      lastModified: new Date(),
    });
  }
  db.benchmark_temp.insertMany(updateTestData);

  // Single updates
  const singleUpdateStart = Date.now();
  const updateCount = 1000;

  for (let i = 0; i < updateCount; i++) {
    const randomId = Math.floor(Math.random() * 5000);
    db.benchmark_temp.updateOne(
      { updateId: randomId },
      {
        $set: {
          status: "updated",
          lastModified: new Date(),
        },
        $inc: { value: 1 },
      }
    );
  }

  const singleUpdateDuration = Date.now() - singleUpdateStart;
  recordBenchmark("Single Updates", singleUpdateDuration, updateCount);

  // Bulk updates
  const bulkUpdateStart = Date.now();
  const bulkUpdateCount = 2000;

  const bulkOps = [];
  for (let i = 0; i < bulkUpdateCount; i++) {
    const randomId = Math.floor(Math.random() * 5000);
    bulkOps.push({
      updateOne: {
        filter: { updateId: randomId },
        update: {
          $set: { status: "bulk_updated", lastModified: new Date() },
          $inc: { value: 1 },
        },
      },
    });
  }

  db.benchmark_temp.bulkWrite(bulkOps, { ordered: false });
  const bulkUpdateDuration = Date.now() - bulkUpdateStart;
  recordBenchmark("Bulk Updates", bulkUpdateDuration, bulkUpdateCount);

  db.benchmark_temp.drop();

  // Test 4: Deletes
  print("\n   Delete Operations:");

  // Prepare test data for deletes
  const deleteTestData = [];
  for (let i = 0; i < 3000; i++) {
    deleteTestData.push({
      deleteId: i,
      category: i % 10,
      toDelete: i % 5 === 0,
    });
  }
  db.benchmark_temp.insertMany(deleteTestData);

  // Single deletes
  const singleDeleteStart = Date.now();
  const deleteCount = 500;

  for (let i = 0; i < deleteCount; i++) {
    const randomId = Math.floor(Math.random() * 3000);
    db.benchmark_temp.deleteOne({ deleteId: randomId });
  }

  const singleDeleteDuration = Date.now() - singleDeleteStart;
  recordBenchmark("Single Deletes", singleDeleteDuration, deleteCount);

  // Bulk deletes
  const bulkDeleteStart = Date.now();
  const bulkDeleteResult = db.benchmark_temp.deleteMany({ toDelete: true });
  const bulkDeleteDuration = Date.now() - bulkDeleteStart;
  recordBenchmark(
    "Bulk Deletes",
    bulkDeleteDuration,
    bulkDeleteResult.deletedCount
  );

  db.benchmark_temp.drop();
}

// ============================================================================
// 4. CONCURRENT LOAD TESTING
// ============================================================================

print("\n4. CONCURRENT LOAD TESTING");
print("-".repeat(50));

function benchmarkConcurrentOperations() {
  print("\n🔄 CONCURRENT OPERATION BENCHMARKS:");

  // Note: JavaScript in MongoDB shell is single-threaded
  // This simulates concurrent operations by rapid sequential execution

  print("\n   Simulated Concurrent Read Load:");
  const concurrentReadStart = Date.now();
  const concurrentReadOps = 2000;

  const readPromises = [];
  for (let i = 0; i < concurrentReadOps; i++) {
    const randomUserId = Math.floor(Math.random() * 10000);
    const randomProductId = Math.floor(Math.random() * 1000);

    // Mix different types of operations
    if (i % 3 === 0) {
      db.benchmark_users.findOne({ userId: randomUserId });
    } else if (i % 3 === 1) {
      db.benchmark_products
        .find({ category: "Electronics" })
        .limit(10)
        .toArray();
    } else {
      db.benchmark_orders.find({ userId: randomUserId }).limit(5).toArray();
    }
  }

  const concurrentReadDuration = Date.now() - concurrentReadStart;
  recordBenchmark(
    "Concurrent Reads",
    concurrentReadDuration,
    concurrentReadOps
  );

  print("\n   Mixed Read/Write Operations:");
  const mixedStart = Date.now();
  const mixedOps = 1500;

  for (let i = 0; i < mixedOps; i++) {
    if (i % 4 === 0) {
      // Read operation (75% of operations)
      const randomUserId = Math.floor(Math.random() * 10000);
      db.benchmark_users.findOne({ userId: randomUserId });
    } else if (i % 4 === 1) {
      db.benchmark_products.find({ inStock: true }).limit(5).toArray();
    } else if (i % 4 === 2) {
      db.benchmark_orders.find({ status: "delivered" }).limit(3).toArray();
    } else {
      // Write operation (25% of operations)
      db.benchmark_temp.insertOne({
        mixedTestId: i,
        timestamp: new Date(),
        data: `Mixed operation ${i}`,
      });
    }
  }

  const mixedDuration = Date.now() - mixedStart;
  recordBenchmark("Mixed Read/Write", mixedDuration, mixedOps);

  db.benchmark_temp.drop();
}

// ============================================================================
// 5. INDEX PERFORMANCE BENCHMARKS
// ============================================================================

print("\n5. INDEX PERFORMANCE BENCHMARKS");
print("-".repeat(50));

function benchmarkIndexPerformance() {
  print("\n🗂️ INDEX PERFORMANCE BENCHMARKS:");

  // Create test collection without indexes first
  db.benchmark_index_test.drop();

  const testData = [];
  for (let i = 0; i < 50000; i++) {
    testData.push({
      testId: i,
      email: `test${i}@example.com`,
      status: ["active", "inactive", "pending"][i % 3],
      score: Math.floor(Math.random() * 100),
      category: ["A", "B", "C", "D", "E"][i % 5],
      createdAt: new Date(
        Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000
      ),
    });
  }

  db.benchmark_index_test.insertMany(testData, { ordered: false });

  print("\n   Queries WITHOUT Indexes:");

  // Test queries without indexes
  const noIndexTests = [
    { name: "Email Lookup", query: { email: "test25000@example.com" } },
    { name: "Status Filter", query: { status: "active" } },
    { name: "Score Range", query: { score: { $gte: 80, $lte: 100 } } },
    { name: "Category + Status", query: { category: "A", status: "active" } },
  ];

  noIndexTests.forEach((test) => {
    const startTime = Date.now();
    const iterations = 100;

    for (let i = 0; i < iterations; i++) {
      db.benchmark_index_test.find(test.query).toArray();
    }

    const duration = Date.now() - startTime;
    recordBenchmark(`${test.name} (No Index)`, duration, iterations);
  });

  print("\n   Creating Indexes:");
  const indexStart = Date.now();

  db.benchmark_index_test.createIndex({ email: 1 });
  db.benchmark_index_test.createIndex({ status: 1 });
  db.benchmark_index_test.createIndex({ score: 1 });
  db.benchmark_index_test.createIndex({ category: 1, status: 1 });
  db.benchmark_index_test.createIndex({ createdAt: -1 });

  const indexDuration = Date.now() - indexStart;
  recordBenchmark("Index Creation", indexDuration, 5);

  print("\n   Queries WITH Indexes:");

  // Test the same queries with indexes
  noIndexTests.forEach((test) => {
    const startTime = Date.now();
    const iterations = 100;

    for (let i = 0; i < iterations; i++) {
      db.benchmark_index_test.find(test.query).toArray();
    }

    const duration = Date.now() - startTime;
    recordBenchmark(`${test.name} (With Index)`, duration, iterations);
  });

  db.benchmark_index_test.drop();
}

// ============================================================================
// 6. MEMORY AND CACHE BENCHMARKS
// ============================================================================

print("\n6. MEMORY AND CACHE BENCHMARKS");
print("-".repeat(50));

function benchmarkMemoryPerformance() {
  print("\n💾 MEMORY AND CACHE BENCHMARKS:");

  // Test 1: Large document handling
  print("\n   Large Document Operations:");

  const largeDocs = [];
  const docSize = 100; // Fields per document
  const docCount = 1000;

  for (let i = 0; i < docCount; i++) {
    const doc = { docId: i };

    // Create large document with many fields
    for (let j = 0; j < docSize; j++) {
      doc[
        `field${j}`
      ] = `This is test data for field ${j} in document ${i} with some additional content to make it larger`;
    }

    largeDocs.push(doc);
  }

  const largeInsertStart = Date.now();
  db.benchmark_large.insertMany(largeDocs, { ordered: false });
  const largeInsertDuration = Date.now() - largeInsertStart;
  recordBenchmark("Large Document Insert", largeInsertDuration, docCount);

  // Test reading large documents
  const largeReadStart = Date.now();
  const iterations = 100;

  for (let i = 0; i < iterations; i++) {
    const randomId = Math.floor(Math.random() * docCount);
    db.benchmark_large.findOne({ docId: randomId });
  }

  const largeReadDuration = Date.now() - largeReadStart;
  recordBenchmark("Large Document Read", largeReadDuration, iterations);

  db.benchmark_large.drop();

  // Test 2: Working set size impact
  print("\n   Working Set Size Impact:");

  const workingSetSizes = [1000, 5000, 10000, 20000];

  workingSetSizes.forEach((size) => {
    // Create collection with specific size
    const workingSetData = [];
    for (let i = 0; i < size; i++) {
      workingSetData.push({
        wsId: i,
        data: `Working set data ${i}`,
        value: Math.random() * 1000,
        timestamp: new Date(),
      });
    }

    db.benchmark_ws.drop();
    db.benchmark_ws.insertMany(workingSetData, { ordered: false });
    db.benchmark_ws.createIndex({ wsId: 1 });

    // Benchmark random access across the working set
    const wsTestStart = Date.now();
    const wsIterations = 500;

    for (let i = 0; i < wsIterations; i++) {
      const randomId = Math.floor(Math.random() * size);
      db.benchmark_ws.findOne({ wsId: randomId });
    }

    const wsTestDuration = Date.now() - wsTestStart;
    recordBenchmark(`Working Set ${size}`, wsTestDuration, wsIterations);
  });

  db.benchmark_ws.drop();
}

// ============================================================================
// 7. COMPREHENSIVE BENCHMARK ANALYSIS
// ============================================================================

function analyzeBenchmarkResults() {
  print("\n" + "=".repeat(60));
  print("BENCHMARK RESULTS ANALYSIS");
  print("=".repeat(60));

  if (benchmarkResults.tests.length === 0) {
    print("❌ No benchmark results to analyze");
    return;
  }

  // Calculate summary statistics
  const totalDuration = benchmarkResults.tests.reduce(
    (sum, test) => sum + test.duration,
    0
  );
  const totalOperations = benchmarkResults.tests.reduce(
    (sum, test) => sum + test.operations,
    0
  );
  const avgOpsPerSecond =
    benchmarkResults.tests.reduce((sum, test) => sum + test.opsPerSecond, 0) /
    benchmarkResults.tests.length;

  benchmarkResults.summary = {
    totalTests: benchmarkResults.tests.length,
    totalDuration: totalDuration,
    totalOperations: totalOperations,
    avgOpsPerSecond: Math.round(avgOpsPerSecond),
    endTime: new Date(),
  };

  print(`\n📊 BENCHMARK SUMMARY:`);
  print(`   Total Tests: ${benchmarkResults.summary.totalTests}`);
  print(
    `   Total Operations: ${benchmarkResults.summary.totalOperations.toLocaleString()}`
  );
  print(`   Total Duration: ${(totalDuration / 1000).toFixed(2)} seconds`);
  print(
    `   Average Throughput: ${benchmarkResults.summary.avgOpsPerSecond.toLocaleString()} ops/sec`
  );

  // Top performing operations
  const sortedByOps = [...benchmarkResults.tests].sort(
    (a, b) => b.opsPerSecond - a.opsPerSecond
  );
  print(`\n🚀 TOP PERFORMING OPERATIONS:`);
  sortedByOps.slice(0, 5).forEach((test, index) => {
    print(
      `   ${index + 1}. ${
        test.testName
      }: ${test.opsPerSecond.toLocaleString()} ops/sec`
    );
  });

  // Slowest operations
  print(`\n🐌 SLOWEST OPERATIONS:`);
  sortedByOps
    .slice(-5)
    .reverse()
    .forEach((test, index) => {
      print(
        `   ${index + 1}. ${
          test.testName
        }: ${test.opsPerSecond.toLocaleString()} ops/sec`
      );
    });

  // Performance categories
  const readTests = benchmarkResults.tests.filter(
    (t) =>
      t.testName.includes("Read") ||
      t.testName.includes("Lookup") ||
      t.testName.includes("Query")
  );
  const writeTests = benchmarkResults.tests.filter(
    (t) =>
      t.testName.includes("Insert") ||
      t.testName.includes("Update") ||
      t.testName.includes("Delete")
  );
  const aggregationTests = benchmarkResults.tests.filter(
    (t) =>
      t.testName.includes("Aggregation") ||
      t.testName.includes("Count") ||
      t.testName.includes("Statistics")
  );

  if (readTests.length > 0) {
    const avgReadOps =
      readTests.reduce((sum, test) => sum + test.opsPerSecond, 0) /
      readTests.length;
    print(
      `\n📖 READ OPERATIONS: ${Math.round(
        avgReadOps
      ).toLocaleString()} avg ops/sec`
    );
  }

  if (writeTests.length > 0) {
    const avgWriteOps =
      writeTests.reduce((sum, test) => sum + test.opsPerSecond, 0) /
      writeTests.length;
    print(
      `✍️ WRITE OPERATIONS: ${Math.round(
        avgWriteOps
      ).toLocaleString()} avg ops/sec`
    );
  }

  if (aggregationTests.length > 0) {
    const avgAggOps =
      aggregationTests.reduce((sum, test) => sum + test.opsPerSecond, 0) /
      aggregationTests.length;
    print(
      `📊 AGGREGATION OPERATIONS: ${Math.round(
        avgAggOps
      ).toLocaleString()} avg ops/sec`
    );
  }

  // Generate recommendations
  benchmarkResults.recommendations = generatePerformanceRecommendations(
    benchmarkResults.tests
  );

  if (benchmarkResults.recommendations.length > 0) {
    print(`\n💡 PERFORMANCE RECOMMENDATIONS:`);
    benchmarkResults.recommendations.forEach((rec, index) => {
      print(`   ${index + 1}. ${rec}`);
    });
  }

  // Store results
  try {
    db.benchmark_results.insertOne({
      ...benchmarkResults,
      createdAt: new Date(),
    });
    print(`\n✅ Benchmark results stored in benchmark_results collection`);
  } catch (error) {
    print(`❌ Error storing benchmark results: ${error.message}`);
  }
}

function generatePerformanceRecommendations(tests) {
  const recommendations = [];

  // Analyze index performance
  const noIndexTests = tests.filter((t) => t.testName.includes("No Index"));
  const withIndexTests = tests.filter((t) => t.testName.includes("With Index"));

  if (noIndexTests.length > 0 && withIndexTests.length > 0) {
    const avgNoIndex =
      noIndexTests.reduce((sum, test) => sum + test.opsPerSecond, 0) /
      noIndexTests.length;
    const avgWithIndex =
      withIndexTests.reduce((sum, test) => sum + test.opsPerSecond, 0) /
      withIndexTests.length;
    const improvement = ((avgWithIndex - avgNoIndex) / avgNoIndex) * 100;

    if (improvement > 100) {
      recommendations.push(
        `Indexes provide ${improvement.toFixed(
          0
        )}% performance improvement - ensure all queries use appropriate indexes`
      );
    }
  }

  // Analyze bulk vs single operations
  const singleOps = tests.filter((t) => t.testName.includes("Single"));
  const bulkOps = tests.filter((t) => t.testName.includes("Bulk"));

  if (singleOps.length > 0 && bulkOps.length > 0) {
    const avgSingle =
      singleOps.reduce((sum, test) => sum + test.opsPerSecond, 0) /
      singleOps.length;
    const avgBulk =
      bulkOps.reduce((sum, test) => sum + test.opsPerSecond, 0) /
      bulkOps.length;

    if (avgBulk > avgSingle * 2) {
      recommendations.push(
        "Use bulk operations when possible - they provide significantly better throughput than single operations"
      );
    }
  }

  // Check for very slow operations
  const slowOps = tests.filter((t) => t.opsPerSecond < 100);
  if (slowOps.length > 0) {
    recommendations.push(
      `${slowOps.length} operations performing below 100 ops/sec - review and optimize these queries`
    );
  }

  // Check working set performance
  const workingSetTests = tests.filter((t) =>
    t.testName.includes("Working Set")
  );
  if (workingSetTests.length > 1) {
    const smallest = workingSetTests.reduce(
      (min, test) => (test.testName.includes("1000") ? test : min),
      workingSetTests[0]
    );
    const largest = workingSetTests.reduce(
      (max, test) => (test.testName.includes("20000") ? test : max),
      workingSetTests[0]
    );

    if (largest.opsPerSecond < smallest.opsPerSecond * 0.7) {
      recommendations.push(
        "Performance degrades significantly with larger working sets - consider adding more RAM or optimizing data access patterns"
      );
    }
  }

  return recommendations;
}

// ============================================================================
// 8. EXECUTION SECTION
// ============================================================================

print("\n8. EXECUTING PERFORMANCE BENCHMARKS");
print("-".repeat(50));

try {
  // Setup benchmark environment
  setupBenchmarkEnvironment();

  // Generate test data (adjust sizes based on your system capacity)
  generateBenchmarkData(5000, 25000, 500); // Reduced for faster execution

  // Run read performance benchmarks
  benchmarkReadOperations();

  // Run write performance benchmarks
  benchmarkWriteOperations();

  // Run concurrent operation benchmarks
  benchmarkConcurrentOperations();

  // Run index performance benchmarks
  benchmarkIndexPerformance();

  // Run memory performance benchmarks
  benchmarkMemoryPerformance();

  // Analyze results
  analyzeBenchmarkResults();

  print("\n✅ Performance benchmarking completed successfully!");
  print("📊 Results stored in benchmark_results collection");
  print("💡 Review recommendations for optimization opportunities");
} catch (error) {
  print("❌ Critical error during benchmarking:");
  print(error.message);
} finally {
  // Cleanup benchmark collections
  try {
    db.benchmark_users.drop();
    db.benchmark_orders.drop();
    db.benchmark_products.drop();
    db.benchmark_temp.drop();
    db.benchmark_large.drop();
    db.benchmark_ws.drop();
    db.benchmark_index_test.drop();
    print("\n🧹 Benchmark collections cleaned up");
  } catch (error) {
    print(`Cleanup error: ${error.message}`);
  }
}

print("\n" + "=".repeat(80));
print("PERFORMANCE BENCHMARKING COMPLETE");
print("=".repeat(80));
