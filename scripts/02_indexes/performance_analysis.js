// File: scripts/02_indexes/performance_analysis.js
// Query performance analysis, explain plans, and optimization

use("learning_platform");

print("MongoDB Indexes: Performance Analysis");
print("=" * 50);

// =================================================================
// QUERY EXPLAIN FUNDAMENTALS
// =================================================================

print("\n🔍 QUERY EXPLAIN FUNDAMENTALS");
print("-" * 30);

// Function to analyze query performance
function analyzeQuery(collection, query, sort = null, description = "") {
  print(`\n${description}:`);
  print(`Query: ${JSON.stringify(query)}`);
  if (sort) print(`Sort: ${JSON.stringify(sort)}`);

  const start = Date.now();
  let explain;

  if (sort) {
    explain = db
      .getCollection(collection)
      .find(query)
      .sort(sort)
      .explain("executionStats");
  } else {
    explain = db
      .getCollection(collection)
      .find(query)
      .explain("executionStats");
  }

  const duration = Date.now() - start;
  const stats = explain.executionStats;

  let indexName = "Collection scan";
  let stage = stats.executionStages;

  if (stage.indexName) {
    indexName = stage.indexName;
  } else if (stage.inputStage && stage.inputStage.indexName) {
    indexName = stage.inputStage.indexName;
  }

  const selectivity =
    stats.totalDocsReturned / Math.max(stats.totalDocsExamined, 1);
  const efficiency =
    selectivity >= 0.1 ? "Excellent" : selectivity >= 0.01 ? "Good" : "Poor";

  print(`  Index used: ${indexName}`);
  print(`  Execution time: ${stats.executionTimeMillis}ms`);
  print(`  Documents examined: ${stats.totalDocsExamined}`);
  print(`  Documents returned: ${stats.totalDocsReturned}`);
  print(`  Selectivity: ${(selectivity * 100).toFixed(2)}% (${efficiency})`);

  return {
    indexName,
    executionTime: stats.executionTimeMillis,
    docsExamined: stats.totalDocsExamined,
    docsReturned: stats.totalDocsReturned,
    selectivity,
  };
}

// Test various query patterns
const queryTests = [
  {
    collection: "users",
    query: { email: "admin@mongomasterpro.com" },
    description: "Unique field query",
  },
  {
    collection: "users",
    query: { role: "student" },
    description: "Single field query",
  },
  {
    collection: "users",
    query: { role: "student", isActive: true },
    description: "Compound query",
  },
  {
    collection: "users",
    query: { role: "student", isActive: true },
    sort: { createdAt: -1 },
    description: "Compound with sort",
  },
  {
    collection: "courses",
    query: { $text: { $search: "mongodb" } },
    description: "Text search",
  },
];

queryTests.forEach((test) => {
  analyzeQuery(test.collection, test.query, test.sort, test.description);
});

// =================================================================
// INDEX INTERSECTION ANALYSIS
// =================================================================

print("\n🔄 INDEX INTERSECTION ANALYSIS");
print("-" * 30);

print("Comparing compound vs intersection strategies:");

const intersectionQuery = { role: "student", isActive: true };

// Natural choice
const naturalPlan = db.users.find(intersectionQuery).explain("executionStats");
print(
  `✓ Natural choice: ${
    naturalPlan.executionStats.executionStages.indexName || "Collection scan"
  }`
);
print(`  Time: ${naturalPlan.executionStats.executionTimeMillis}ms`);

// Force different indexes with hints
const roleHint = db.users
  .find(intersectionQuery)
  .hint({ role: 1 })
  .explain("executionStats");
print(
  `✓ Role index: ${roleHint.executionStats.executionTimeMillis}ms, examined: ${roleHint.executionStats.totalDocsExamined}`
);

// =================================================================
// SORT PERFORMANCE ANALYSIS
// =================================================================

print("\n📈 SORT PERFORMANCE ANALYSIS");
print("-" * 30);

function analyzeSortPerformance(query, sort, description) {
  print(`\n${description}:`);

  const explain = db.users
    .find(query)
    .sort(sort)
    .limit(10)
    .explain("executionStats");
  const stats = explain.executionStats;

  let sortStage = stats.executionStages;
  let sortType = "Index sort";

  if (
    sortStage.stage === "SORT" ||
    (sortStage.inputStage && sortStage.inputStage.stage === "SORT")
  ) {
    sortType = "In-memory sort";
  }

  print(`  Sort type: ${sortType}`);
  print(`  Execution time: ${stats.executionTimeMillis}ms`);
  print(`  Documents examined: ${stats.totalDocsExamined}`);
}

// Test different sort scenarios
analyzeSortPerformance({}, { createdAt: -1 }, "Sort by createdAt (indexed)");
analyzeSortPerformance(
  { role: "student" },
  { createdAt: -1 },
  "Filter + indexed sort"
);
analyzeSortPerformance(
  { role: "student" },
  { firstName: 1 },
  "Filter + non-indexed sort"
);

// =================================================================
// RANGE QUERY OPTIMIZATION
// =================================================================

print("\n📊 RANGE QUERY OPTIMIZATION");
print("-" * 30);

print("Analyzing range query performance:");

// Date range queries
const dateRangeQuery = {
  createdAt: {
    $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    $lte: new Date(),
  },
};

analyzeQuery("users", dateRangeQuery, null, "Date range query");

// Numeric range query (if any numeric fields exist)
const numericRangeQuery = { "profile.yearsExperience": { $gte: 5, $lte: 15 } };
analyzeQuery("users", numericRangeQuery, null, "Numeric range query");

// =================================================================
// AGGREGATION PERFORMANCE
// =================================================================

print("\n🎯 AGGREGATION PERFORMANCE");
print("-" * 30);

print("Testing aggregation pipeline performance:");

// Simple aggregation with $match
const matchPipeline = [
  { $match: { role: "student", isActive: true } },
  { $group: { _id: "$profile.experienceLevel", count: { $sum: 1 } } },
];

const start1 = Date.now();
const aggResult1 = db.users.aggregate(matchPipeline).toArray();
const duration1 = Date.now() - start1;

print(
  `✓ Match + Group aggregation: ${duration1}ms, ${aggResult1.length} groups`
);

// Aggregation with sort
const sortPipeline = [
  { $match: { role: "student" } },
  { $sort: { createdAt: -1 } },
  { $limit: 100 },
  { $group: { _id: "$profile.experienceLevel", count: { $sum: 1 } } },
];

const start2 = Date.now();
const aggResult2 = db.users.aggregate(sortPipeline).toArray();
const duration2 = Date.now() - start2;

print(`✓ Match + Sort + Group: ${duration2}ms, ${aggResult2.length} groups`);

// =================================================================
// INDEX COVERAGE ANALYSIS
// =================================================================

print("\n🎯 INDEX COVERAGE ANALYSIS");
print("-" * 30);

print("Analyzing query coverage by indexes:");

function analyzeCoverage(query, projection = {}) {
  const explain = db.users.find(query, projection).explain("executionStats");
  const stats = explain.executionStats;

  const isCovered =
    stats.totalDocsExamined === stats.totalDocsReturned &&
    stats.executionStages.stage === "IXSCAN";

  print(`Query: ${JSON.stringify(query)}`);
  print(`Projection: ${JSON.stringify(projection)}`);
  print(`Covered: ${isCovered ? "Yes" : "No"}`);
  print(`Stage: ${stats.executionStages.stage}`);

  return isCovered;
}

// Test covered queries
print("\nCovered query tests:");
analyzeCoverage({ role: "student" }, { role: 1, _id: 0 });
analyzeCoverage({ email: "test@example.com" }, { email: 1, _id: 0 });

// =================================================================
// QUERY OPTIMIZATION RECOMMENDATIONS
// =================================================================

print("\n💡 QUERY OPTIMIZATION RECOMMENDATIONS");
print("-" * 30);

function generateOptimizationRecommendations() {
  print("Analyzing current query patterns and indexes...");

  const recommendations = [];

  // Check for missing indexes
  const slowQuery1 = db.users
    .find({ "profile.experienceLevel": "advanced" })
    .explain("executionStats");
  if (
    slowQuery1.executionStats.totalDocsExamined >
    slowQuery1.executionStats.totalDocsReturned * 10
  ) {
    recommendations.push("Consider index on profile.experienceLevel");
  }

  // Check compound index usage
  const compoundQuery = db.users
    .find({ role: "student", isActive: true })
    .explain("executionStats");
  if (compoundQuery.executionStats.executionStages.indexName) {
    recommendations.push("✓ Compound queries using indexes effectively");
  }

  // Check sort performance
  const sortQuery = db.users
    .find({})
    .sort({ firstName: 1 })
    .limit(10)
    .explain("executionStats");
  if (sortQuery.executionStats.executionStages.stage === "SORT") {
    recommendations.push("Consider index on firstName for sorting");
  }

  print("📋 Optimization Recommendations:");
  recommendations.forEach((rec, i) => {
    print(`  ${i + 1}. ${rec}`);
  });
}

generateOptimizationRecommendations();

// =================================================================
// BULK OPERATION PERFORMANCE
// =================================================================

print("\n⚡ BULK OPERATION PERFORMANCE");
print("-" * 30);

print("Testing bulk operation performance with indexes:");

// Create test data for bulk operations
const bulkTestData = [];
for (let i = 0; i < 100; i++) {
  bulkTestData.push({
    updateOne: {
      filter: { email: `bulktest${i}@example.com` },
      update: {
        $set: {
          firstName: `BulkTest${i}`,
          lastName: "User",
          role: "student",
          updatedAt: new Date(),
        },
      },
      upsert: true,
    },
  });
}

const bulkStart = Date.now();
const bulkResult = db.users.bulkWrite(bulkTestData, { ordered: false });
const bulkDuration = Date.now() - bulkStart;

print(`✓ Bulk upsert performance: ${bulkDuration}ms for 100 operations`);
print(
  `  Upserted: ${bulkResult.upsertedCount}, Modified: ${bulkResult.modifiedCount}`
);

// Clean up bulk test data
db.users.deleteMany({ email: /^bulktest\d+@example\.com$/ });

// =================================================================
// INDEX STATISTICS ANALYSIS
// =================================================================

print("\n📈 INDEX STATISTICS ANALYSIS");
print("-" * 30);

function analyzeIndexStats(collectionName) {
  print(`\n${collectionName} Collection Index Analysis:`);

  const collection = db.getCollection(collectionName);
  const indexes = collection.getIndexes();
  const stats = collection.stats({ indexDetails: true });

  print(`  Total indexes: ${indexes.length}`);
  print(`  Collection size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
  print(`  Average document size: ${stats.avgObjSize} bytes`);

  // Index sizes
  if (stats.indexSizes) {
    print(`  Index sizes:`);
    Object.entries(stats.indexSizes).forEach(([indexName, size]) => {
      const sizeMB = (size / (1024 * 1024)).toFixed(2);
      print(`    ${indexName}: ${sizeMB} MB`);
    });
  }

  // Calculate index to data ratio
  const totalIndexSize = Object.values(stats.indexSizes || {}).reduce(
    (sum, size) => sum + size,
    0
  );
  const indexRatio = ((totalIndexSize / stats.size) * 100).toFixed(1);
  print(`  Index overhead: ${indexRatio}% of data size`);
}

analyzeIndexStats("users");
analyzeIndexStats("courses");
analyzeIndexStats("enrollments");

// =================================================================
// QUERY PLAN CACHE ANALYSIS
// =================================================================

print("\n🗂️  QUERY PLAN CACHE");
print("-" * 30);

print("Query plan cache information:");

try {
  const planCache = db.users.getPlanCache().listQueryShapes();
  print(`✓ Cached query shapes: ${planCache.length}`);

  planCache.slice(0, 3).forEach((shape, i) => {
    print(`  Shape ${i + 1}: ${JSON.stringify(shape.query)}`);
  });
} catch (e) {
  print("⚠ Plan cache access limited in this environment");
}

// =================================================================
// PERFORMANCE BENCHMARKING
// =================================================================

print("\n🏁 PERFORMANCE BENCHMARKING");
print("-" * 30);

print("Running performance benchmark suite:");

const benchmarkTests = [
  {
    name: "Point query (unique)",
    test: () => db.users.findOne({ email: "admin@mongomasterpro.com" }),
  },
  {
    name: "Range query",
    test: () =>
      db.users
        .find({ createdAt: { $gte: new Date(Date.now() - 86400000) } })
        .limit(10)
        .toArray(),
  },
  {
    name: "Compound query",
    test: () =>
      db.users.find({ role: "student", isActive: true }).limit(10).toArray(),
  },
  {
    name: "Sort query",
    test: () =>
      db.users
        .find({ role: "student" })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray(),
  },
  {
    name: "Text search",
    test: () =>
      db.courses
        .find({ $text: { $search: "mongodb" } })
        .limit(5)
        .toArray(),
  },
];

const benchmarkResults = [];

benchmarkTests.forEach((test) => {
  const iterations = 5;
  const times = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    test.test();
    times.push(Date.now() - start);
  }

  const avgTime = times.reduce((sum, time) => sum + time, 0) / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  benchmarkResults.push({
    name: test.name,
    avgTime,
    minTime,
    maxTime,
  });

  print(
    `✓ ${test.name}: ${avgTime.toFixed(2)}ms avg (${minTime}-${maxTime}ms)`
  );
});

// =================================================================
// OPTIMIZATION SUMMARY
// =================================================================

print("\n📋 PERFORMANCE OPTIMIZATION SUMMARY");
print("-" * 30);

// Generate performance report
function generatePerformanceReport() {
  const userCount = db.users.countDocuments();
  const courseCount = db.courses.countDocuments();
  const userIndexes = db.users.getIndexes().length;
  const courseIndexes = db.courses.getIndexes().length;

  print("Database Performance Overview:");
  print(`  Users: ${userCount} documents, ${userIndexes} indexes`);
  print(`  Courses: ${courseCount} documents, ${courseIndexes} indexes`);

  // Calculate average benchmark performance
  const avgPerformance =
    benchmarkResults.reduce((sum, result) => sum + result.avgTime, 0) /
    benchmarkResults.length;

  print(`  Average query time: ${avgPerformance.toFixed(2)}ms`);
  print(
    `  Performance grade: ${
      avgPerformance < 10
        ? "A"
        : avgPerformance < 50
        ? "B"
        : avgPerformance < 100
        ? "C"
        : "D"
    }`
  );
}

generatePerformanceReport();

print("\n🎯 Key Performance Insights:");
print("• Use explain() to analyze query execution plans");
print("• Monitor selectivity ratios (docs returned / docs examined)");
print("• Prefer compound indexes over index intersection");
print("• Ensure sorts use indexes when possible");
print("• Consider covered queries for read performance");
print("• Monitor index overhead vs data size");
print("• Use partial/sparse indexes for optional fields");
print("• Benchmark query performance regularly");

print("\n✅ Performance analysis completed!");
print("Next: Run validate_indexes.js for index validation");
