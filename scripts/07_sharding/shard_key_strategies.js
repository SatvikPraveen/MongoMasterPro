// File: scripts/07_sharding/shard_key_strategies.js
// MongoDB Shard Key Strategies - Hashed, Ranged, and Compound Keys

/**
 * SHARD KEY STRATEGIES
 * ====================
 * Comprehensive guide to MongoDB shard key selection and strategies.
 * Covers hashed keys, range-based keys, compound keys, and optimization patterns.
 */

// Database connections
const db = db.getSiblingDB("lms_primary");
const adminDB = db.getSiblingDB("admin");

print("\n" + "=".repeat(80));
print("MONGODB SHARD KEY STRATEGIES");
print("=".repeat(80));

// ============================================================================
// 1. HASHED SHARD KEYS
// ============================================================================

print("\n1. HASHED SHARD KEYS");
print("-".repeat(50));

/**
 * Demonstrate hashed shard key strategy
 */
function demonstrateHashedShardKey() {
  print("\n🔀 HASHED SHARD KEY STRATEGY:");
  print("Even distribution across shards using hash function");

  const hashedExamples = [
    {
      collection: "users",
      shardKey: { _id: "hashed" },
      pros: [
        "Even distribution",
        "Prevents hotspots",
        "Good for high write volume",
      ],
      cons: ["No range queries optimization", "Scatter-gather for range scans"],
      useCase: "User profiles, session data, high-volume writes",
    },
    {
      collection: "logs",
      shardKey: { timestamp: "hashed" },
      pros: [
        "Distributes time-series data",
        "Prevents write hotspots on recent data",
      ],
      cons: [
        "Time range queries span all shards",
        "Less efficient for time-based analytics",
      ],
      useCase: "Application logs, events, metrics",
    },
    {
      collection: "products",
      shardKey: { sku: "hashed" },
      pros: ["Even product distribution", "Good for catalog browsing"],
      cons: [
        "Category-based queries span shards",
        "Less locality for related products",
      ],
      useCase: "E-commerce catalogs, inventory systems",
    },
  ];

  hashedExamples.forEach((example, index) => {
    print(`\n${index + 1}. ${example.collection.toUpperCase()} COLLECTION:`);
    print(`   Shard Key: ${JSON.stringify(example.shardKey)}`);
    print(`   Use Case: ${example.useCase}`);
    print(`   ✅ Advantages:`);
    example.pros.forEach((pro) => print(`      • ${pro}`));
    print(`   ⚠️ Disadvantages:`);
    example.cons.forEach((con) => print(`      • ${con}`));
  });
}

/**
 * Create and analyze hashed shard key performance
 */
function analyzeHashedKeyPerformance() {
  print("\n📊 HASHED KEY PERFORMANCE ANALYSIS:");

  // Simulate hashed distribution analysis
  const hashDistribution = {
    shard01: 25.2,
    shard02: 24.8,
    shard03: 25.1,
    shard04: 24.9,
  };

  print("\nSample hash distribution across shards:");
  Object.keys(hashDistribution).forEach((shard) => {
    const percentage = hashDistribution[shard];
    const bar = "█".repeat(Math.round(percentage / 2));
    print(`${shard}: ${percentage}% ${bar}`);
  });

  print("\n🎯 Query Patterns with Hashed Keys:");

  const queryPatterns = [
    {
      query: '{ _id: ObjectId("...") }',
      routing: "Single shard (targeted)",
      performance: "Excellent",
    },
    {
      query: "{ _id: { $in: [id1, id2, id3] } }",
      routing: "Multiple shards (potentially all)",
      performance: "Good for small sets",
    },
    {
      query: "{ createdAt: { $gte: lastWeek } }",
      routing: "All shards (broadcast)",
      performance: "Poor - requires merge",
    },
    {
      query: '{ status: "active" }',
      routing: "All shards (broadcast)",
      performance: "Poor - full collection scan",
    },
  ];

  queryPatterns.forEach((pattern) => {
    print(`\nQuery: ${pattern.query}`);
    print(`  Routing: ${pattern.routing}`);
    print(`  Performance: ${pattern.performance}`);
  });
}

// ============================================================================
// 2. RANGE-BASED SHARD KEYS
// ============================================================================

print("\n2. RANGE-BASED SHARD KEYS");
print("-".repeat(50));

/**
 * Demonstrate range-based shard key strategies
 */
function demonstrateRangeBasedShardKey() {
  print("\n📈 RANGE-BASED SHARD KEY STRATEGY:");
  print("Logical data grouping for query optimization");

  const rangeExamples = [
    {
      collection: "courses",
      shardKey: { category: 1, _id: 1 },
      ranges: {
        shard01: 'category: "business", "finance"',
        shard02: 'category: "technology", "programming"',
        shard03: 'category: "arts", "design"',
        shard04: 'category: "science", "math"',
      },
      pros: [
        "Efficient category queries",
        "Data locality",
        "Optimized range scans",
      ],
      cons: [
        "Potential hotspots",
        "Uneven distribution",
        "Category growth imbalance",
      ],
      useCase: "Course catalogs, content management",
    },
    {
      collection: "orders",
      shardKey: { customerId: 1, orderDate: 1 },
      ranges: {
        shard01: "customerId: 1-25000",
        shard02: "customerId: 25001-50000",
        shard03: "customerId: 50001-75000",
        shard04: "customerId: 75001+",
      },
      pros: [
        "Customer-centric queries",
        "Order history locality",
        "Efficient customer reports",
      ],
      cons: [
        "Customer growth hotspots",
        "VIP customer imbalance",
        "Inactive customer waste",
      ],
      useCase: "E-commerce orders, customer management",
    },
  ];

  rangeExamples.forEach((example, index) => {
    print(`\n${index + 1}. ${example.collection.toUpperCase()} COLLECTION:`);
    print(`   Shard Key: ${JSON.stringify(example.shardKey)}`);
    print(`   Use Case: ${example.useCase}`);

    print(`   📊 Range Distribution:`);
    Object.keys(example.ranges).forEach((shard) => {
      print(`      ${shard}: ${example.ranges[shard]}`);
    });

    print(`   ✅ Advantages:`);
    example.pros.forEach((pro) => print(`      • ${pro}`));
    print(`   ⚠️ Disadvantages:`);
    example.cons.forEach((con) => print(`      • ${con}`));
  });
}

/**
 * Analyze range shard key query patterns
 */
function analyzeRangeKeyPatterns() {
  print("\n🔍 RANGE KEY QUERY PATTERN ANALYSIS:");

  print("\n📋 COURSE COLLECTION (category + _id):");
  const courseQueries = [
    {
      query: '{ category: "programming" }',
      routing: "Single shard (technology shard)",
      performance: "🟢 Excellent",
    },
    {
      query: '{ category: { $in: ["business", "finance"] } }',
      routing: "Single shard (business shard)",
      performance: "🟢 Excellent",
    },
    {
      query: '{ instructor: "John Doe" }',
      routing: "All shards (broadcast)",
      performance: "🔴 Poor",
    },
    {
      query: '{ category: "programming", difficulty: "beginner" }',
      routing: "Single shard with filtering",
      performance: "🟡 Good",
    },
  ];

  courseQueries.forEach((query) => {
    print(`\n  Query: ${query.query}`);
    print(`    Routing: ${query.routing}`);
    print(`    Performance: ${query.performance}`);
  });

  print("\n📋 ORDER COLLECTION (customerId + orderDate):");
  const orderQueries = [
    {
      query: "{ customerId: 12345 }",
      routing: "Single shard (customer range)",
      performance: "🟢 Excellent",
    },
    {
      query: "{ customerId: 12345, orderDate: { $gte: lastMonth } }",
      routing: "Single shard with date filter",
      performance: "🟢 Excellent",
    },
    {
      query: "{ orderDate: { $gte: yesterday } }",
      routing: "All shards (broadcast)",
      performance: "🔴 Poor",
    },
    {
      query: "{ customerId: { $in: [123, 124, 125] } }",
      routing: "Single shard (same range)",
      performance: "🟢 Excellent",
    },
  ];

  orderQueries.forEach((query) => {
    print(`\n  Query: ${query.query}`);
    print(`    Routing: ${query.routing}`);
    print(`    Performance: ${query.performance}`);
  });
}

// ============================================================================
// 3. COMPOUND SHARD KEYS
// ============================================================================

print("\n3. COMPOUND SHARD KEYS");
print("-".repeat(50));

/**
 * Demonstrate compound shard key strategies
 */
function demonstrateCompoundShardKeys() {
  print("\n🔗 COMPOUND SHARD KEY STRATEGY:");
  print("Multi-field keys for complex query optimization");

  const compoundExamples = [
    {
      collection: "enrollments",
      shardKey: { userId: 1, courseId: 1 },
      strategy: "User-Course relationship optimization",
      queryOptimizations: [
        "Single user enrollments: { userId: 123 }",
        "Specific enrollment: { userId: 123, courseId: 456 }",
        "User course range: { userId: 123, courseId: { $gte: 400 } }",
      ],
      pros: [
        "Efficient user queries",
        "Good for user dashboards",
        "Supports user-course locality",
      ],
      cons: [
        "Course-only queries broadcast",
        "User growth hotspots",
        "Complex chunk distribution",
      ],
    },
    {
      collection: "assignments",
      shardKey: { courseId: 1, dueDate: 1, _id: 1 },
      strategy: "Course timeline optimization",
      queryOptimizations: [
        'Course assignments: { courseId: "CS101" }',
        'Upcoming assignments: { courseId: "CS101", dueDate: { $gte: today } }',
        'Assignment timeframe: { courseId: "CS101", dueDate: { $gte: start, $lte: end } }',
      ],
      pros: [
        "Excellent course queries",
        "Timeline efficiency",
        "Assignment locality",
      ],
      cons: [
        "Cross-course queries expensive",
        "Due date clustering",
        "Course popularity imbalance",
      ],
    },
    {
      collection: "analytics_events",
      shardKey: { tenantId: 1, eventType: 1, timestamp: 1 },
      strategy: "Multi-tenant analytics optimization",
      queryOptimizations: [
        'Tenant events: { tenantId: "tenant1" }',
        'Event type analysis: { tenantId: "tenant1", eventType: "page_view" }',
        'Time-based analysis: { tenantId: "tenant1", eventType: "purchase", timestamp: { $gte: lastWeek } }',
      ],
      pros: [
        "Perfect tenant isolation",
        "Event type efficiency",
        "Time series optimization",
      ],
      cons: [
        "Cross-tenant queries impossible",
        "Tenant size imbalance",
        "Complex maintenance",
      ],
    },
  ];

  compoundExamples.forEach((example, index) => {
    print(`\n${index + 1}. ${example.collection.toUpperCase()}:`);
    print(`   Shard Key: ${JSON.stringify(example.shardKey)}`);
    print(`   Strategy: ${example.strategy}`);

    print(`   🎯 Optimized Queries:`);
    example.queryOptimizations.forEach((opt) => print(`      • ${opt}`));

    print(`   ✅ Advantages:`);
    example.pros.forEach((pro) => print(`      • ${pro}`));
    print(`   ⚠️ Disadvantages:`);
    example.cons.forEach((con) => print(`      • ${con}`));
  });
}

/**
 * Compound key cardinality analysis
 */
function analyzeCompoundKeyCardinality() {
  print("\n📊 COMPOUND KEY CARDINALITY ANALYSIS:");

  const cardinalityExamples = [
    {
      key: "{ userId: 1, courseId: 1 }",
      userCardinality: 100000,
      courseCardinality: 5000,
      combinedCardinality: "500M potential combinations",
      distribution: "Excellent - high cardinality",
      recommendation: "🟢 Ideal for sharding",
    },
    {
      key: "{ status: 1, userId: 1 }",
      statusCardinality: 5,
      userCardinality: 100000,
      combinedCardinality: "500K potential combinations",
      distribution: "Poor - low leading field cardinality",
      recommendation: "🔴 Avoid - will create hotspots",
    },
    {
      key: "{ region: 1, userId: 1, timestamp: 1 }",
      regionCardinality: 10,
      userCardinality: 100000,
      timestampCardinality: "High (continuous)",
      combinedCardinality: "Very high",
      distribution: "Good - balanced cardinality growth",
      recommendation: "🟡 Good with proper chunk management",
    },
  ];

  cardinalityExamples.forEach((example, index) => {
    print(`\n${index + 1}. Shard Key: ${example.key}`);
    print(`   Combined Cardinality: ${example.combinedCardinality}`);
    print(`   Distribution: ${example.distribution}`);
    print(`   Recommendation: ${example.recommendation}`);
  });

  print(`\n💡 CARDINALITY GUIDELINES:`);
  print(`   • Leading field should have high cardinality`);
  print(`   • Each field should contribute to uniqueness`);
  print(`   • Avoid low-cardinality leading fields`);
  print(`   • Consider query patterns in field order`);
}

// ============================================================================
// 4. SHARD KEY ANTI-PATTERNS
// ============================================================================

print("\n4. SHARD KEY ANTI-PATTERNS");
print("-".repeat(50));

/**
 * Identify and explain shard key anti-patterns
 */
function identifyShardKeyAntiPatterns() {
  print("\n⚠️ SHARD KEY ANTI-PATTERNS TO AVOID:");

  const antiPatterns = [
    {
      pattern: "Monotonically Increasing Keys",
      example: "{ _id: ObjectId(), timestamp: 1, sequenceId: 1 }",
      problem: "All new writes go to the same shard (hotspot)",
      impact: "Write bottleneck, uneven shard utilization",
      solution: "Use hashed _id or compound key with distributed prefix",
      severity: "🔴 Critical",
    },
    {
      pattern: "Low Cardinality Leading Field",
      example: "{ status: 1, userId: 1 }",
      problem: "Limited number of chunks, uneven distribution",
      impact: "Few active shards, poor scaling",
      solution: "Move high-cardinality field first or use hashed strategy",
      severity: "🔴 Critical",
    },
    {
      pattern: "Highly Skewed Data",
      example: "{ country: 1, userId: 1 }",
      problem: "Some countries have disproportionately more users",
      impact: "Shard imbalance, hotspots in popular countries",
      solution: "Use hashed compound key or add more distributed fields",
      severity: "🟡 Moderate",
    },
    {
      pattern: "Non-Queryable Shard Key",
      example: '{ randomHash: "hashed" }',
      problem: "Shard key not used in application queries",
      impact: "All queries broadcast to all shards",
      solution: "Choose shard key based on query patterns",
      severity: "🟡 Moderate",
    },
    {
      pattern: "Single-Field Low Cardinality",
      example: "{ region: 1 }",
      problem: "Limited chunks, few shards utilized",
      impact: "Poor distribution, scaling limitations",
      solution: "Add high-cardinality field or use hashed approach",
      severity: "🔴 Critical",
    },
  ];

  antiPatterns.forEach((antiPattern, index) => {
    print(`\n${index + 1}. ${antiPattern.pattern} ${antiPattern.severity}:`);
    print(`   Example: ${antiPattern.example}`);
    print(`   Problem: ${antiPattern.problem}`);
    print(`   Impact: ${antiPattern.impact}`);
    print(`   Solution: ${antiPattern.solution}`);
  });
}

/**
 * Shard key selection decision tree
 */
function presentShardKeyDecisionTree() {
  print("\n🌳 SHARD KEY SELECTION DECISION TREE:");

  print(`
    Start Here: Analyze Your Queries
                    ↓
    ┌─────────────────────────────────────┐
    │ Do you have a single field that     │
    │ appears in most queries?            │
    └─────────────┬───────────────────────┘
                  ↓
        ┌─────────────────┐
        │ Is it high      │ YES → Consider single field
        │ cardinality?    │       range-based sharding
        └─────────┬───────┘
                  ↓ NO
        ┌─────────────────┐
        │ Is it used for  │ YES → Use hashed strategy
        │ equality only?  │
        └─────────┬───────┘
                  ↓ NO
    ┌─────────────────────────────────────┐
    │ Do you need range queries           │
    │ on this field?                      │
    └─────────────┬───────────────────────┘
                  ↓ YES
    ┌─────────────────────────────────────┐
    │ Use compound key:                   │
    │ { primaryField: 1, _id: 1 }        │
    └─────────────────────────────────────┘
                  ↓ NO
    ┌─────────────────────────────────────┐
    │ Consider hashed compound key:       │
    │ { primaryField: "hashed" }          │
    └─────────────────────────────────────┘
    `);

  print("\n🎯 DECISION FACTORS:");
  print("• Query patterns (equality vs range)");
  print("• Field cardinality and distribution");
  print("• Write patterns (hotspots vs distributed)");
  print("• Read patterns (targeted vs broadcast)");
  print("• Data growth patterns");
  print("• Application performance requirements");
}

// ============================================================================
// 5. SHARD KEY BEST PRACTICES
// ============================================================================

print("\n5. SHARD KEY BEST PRACTICES");
print("-".repeat(50));

/**
 * Comprehensive shard key best practices
 */
function presentShardKeyBestPractices() {
  print("\n💡 SHARD KEY BEST PRACTICES:");

  const bestPractices = [
    {
      category: "Key Selection",
      practices: [
        "Choose based on query patterns, not data patterns",
        "Ensure high cardinality in leading fields",
        "Include shard key in all critical queries",
        "Avoid monotonically increasing values",
        "Test with realistic data volumes",
      ],
    },
    {
      category: "Performance Optimization",
      practices: [
        "Minimize cross-shard queries",
        "Use compound keys for query locality",
        "Balance write distribution vs query efficiency",
        "Monitor chunk distribution regularly",
        "Plan for data growth patterns",
      ],
    },
    {
      category: "Operational Considerations",
      practices: [
        "Document shard key rationale",
        "Plan chunk splitting strategy",
        "Monitor balancer activity",
        "Prepare for shard key changes",
        "Test failover scenarios",
      ],
    },
    {
      category: "Application Design",
      practices: [
        "Include shard key in all queries when possible",
        "Design aggregations for single-shard execution",
        "Handle cross-shard joins efficiently",
        "Cache frequently accessed cross-shard data",
        "Monitor query performance continuously",
      ],
    },
  ];

  bestPractices.forEach((category) => {
    print(`\n🏷️ ${category.category.toUpperCase()}:`);
    category.practices.forEach((practice) => {
      print(`   • ${practice}`);
    });
  });
}

/**
 * Shard key testing methodology
 */
function presentShardKeyTesting() {
  print("\n🧪 SHARD KEY TESTING METHODOLOGY:");

  print(`\n1️⃣ PRE-PRODUCTION TESTING:`);
  print(`   • Create test cluster with realistic shard count`);
  print(`   • Load representative data volume`);
  print(`   • Execute actual application queries`);
  print(`   • Measure query performance and distribution`);

  print(`\n2️⃣ DISTRIBUTION ANALYSIS:`);
  print(`   • Check chunk distribution: sh.status()`);
  print(`   • Monitor balancer activity`);
  print(`   • Identify hotspot shards`);
  print(`   • Validate even data distribution`);

  print(`\n3️⃣ QUERY PERFORMANCE TESTING:`);
  print(`   • Run explain() on critical queries`);
  print(`   • Measure single vs multi-shard queries`);
  print(`   • Test with different read preferences`);
  print(`   • Validate aggregation pipeline efficiency`);

  print(`\n4️⃣ SCALING SIMULATION:`);
  print(`   • Test with 2x, 5x, 10x data growth`);
  print(`   • Validate chunk splitting behavior`);
  print(`   • Test shard addition scenarios`);
  print(`   • Monitor balancer performance`);

  print(`\n5️⃣ PRODUCTION MONITORING:`);
  print(`   • Set up chunk distribution alerts`);
  print(`   • Monitor query routing patterns`);
  print(`   • Track balancer migration activity`);
  print(`   • Regular performance reviews`);
}

// ============================================================================
// 6. EXECUTION SECTION
// ============================================================================

print("\n6. EXECUTING SHARD KEY STRATEGY ANALYSIS");
print("-".repeat(50));

try {
  // Demonstrate different shard key strategies
  demonstrateHashedShardKey();
  analyzeHashedKeyPerformance();

  demonstrateRangeBasedShardKey();
  analyzeRangeKeyPatterns();

  demonstrateCompoundShardKeys();
  analyzeCompoundKeyCardinality();

  // Identify anti-patterns and provide guidance
  identifyShardKeyAntiPatterns();
  presentShardKeyDecisionTree();

  // Best practices and testing
  presentShardKeyBestPractices();
  presentShardKeyTesting();

  print("\n✅ Shard key strategy analysis completed!");
  print("💡 Use this analysis to choose optimal shard keys");
  print("🧪 Always test shard key performance before production");
} catch (error) {
  print("❌ Error during shard key strategy analysis:");
  print(error.message);
}

print("\n" + "=".repeat(80));
print("SHARD KEY STRATEGIES COMPLETE");
print("=".repeat(80));
