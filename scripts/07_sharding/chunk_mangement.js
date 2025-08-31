// File: scripts/07_sharding/chunk_management.js
// MongoDB Chunk Management - Splitting, Balancing, and Distribution Control

/**
 * CHUNK MANAGEMENT
 * ================
 * Comprehensive guide to MongoDB chunk operations and balancing strategies.
 * Covers chunk splitting, migration, balancer control, and distribution optimization.
 */

// Database connections
const db = db.getSiblingDB("lms_primary");
const adminDB = db.getSiblingDB("admin");
const configDB = db.getSiblingDB("config");

print("\n" + "=".repeat(80));
print("MONGODB CHUNK MANAGEMENT");
print("=".repeat(80));

// ============================================================================
// 1. CHUNK BASICS AND INSPECTION
// ============================================================================

print("\n1. CHUNK BASICS AND INSPECTION");
print("-".repeat(50));

/**
 * Understand chunk structure and view current chunks
 */
function exploreChunkStructure() {
  print("\n📦 CHUNK STRUCTURE EXPLORATION:");

  try {
    // Get chunks from config database
    const chunks = configDB.chunks.find().limit(5).toArray();

    if (chunks.length > 0) {
      print("✅ Sample chunk structure:");
      print(JSON.stringify(chunks[0], null, 2));

      print(`\n📊 Chunk Overview:`);
      print(`   Total chunks found: ${chunks.length}`);

      // Group chunks by collection
      const chunksByCollection = {};
      chunks.forEach((chunk) => {
        if (!chunksByCollection[chunk.ns]) {
          chunksByCollection[chunk.ns] = 0;
        }
        chunksByCollection[chunk.ns]++;
      });

      print(`   Collections with chunks:`);
      Object.keys(chunksByCollection).forEach((collection) => {
        print(`      ${collection}: ${chunksByCollection[collection]} chunks`);
      });
    } else {
      print("ℹ️ No chunks found - cluster may not be sharded yet");
    }
  } catch (error) {
    print("❌ Error exploring chunk structure:");
    print(error.message);
    print("💡 Make sure you're connected to a mongos instance");
  }
}

/**
 * View chunk distribution across shards
 */
function viewChunkDistribution(namespace = null) {
  print(`\n📈 CHUNK DISTRIBUTION${namespace ? ` FOR: ${namespace}` : ""}:`);

  try {
    let query = {};
    if (namespace) {
      query.ns = namespace;
    }

    const chunks = configDB.chunks.find(query).toArray();

    if (chunks.length === 0) {
      print("ℹ️ No chunks found for specified criteria");
      return;
    }

    // Analyze distribution by shard
    const distributionByShard = {};
    const distributionByCollection = {};

    chunks.forEach((chunk) => {
      // By shard
      if (!distributionByShard[chunk.shard]) {
        distributionByShard[chunk.shard] = 0;
      }
      distributionByShard[chunk.shard]++;

      // By collection
      if (!distributionByCollection[chunk.ns]) {
        distributionByCollection[chunk.ns] = {};
      }
      if (!distributionByCollection[chunk.ns][chunk.shard]) {
        distributionByCollection[chunk.ns][chunk.shard] = 0;
      }
      distributionByCollection[chunk.ns][chunk.shard]++;
    });

    // Display shard distribution
    print(`\n🏛️ DISTRIBUTION BY SHARD:`);
    const totalChunks = chunks.length;
    Object.keys(distributionByShard).forEach((shard) => {
      const count = distributionByShard[shard];
      const percentage = ((count / totalChunks) * 100).toFixed(1);
      const bar = "█".repeat(Math.round(percentage / 2));
      print(`   ${shard}: ${count} chunks (${percentage}%) ${bar}`);
    });

    // Display collection distribution
    print(`\n📚 DISTRIBUTION BY COLLECTION:`);
    Object.keys(distributionByCollection).forEach((collection) => {
      print(`\n   ${collection}:`);
      const collectionShards = distributionByCollection[collection];
      Object.keys(collectionShards).forEach((shard) => {
        const count = collectionShards[shard];
        print(`      ${shard}: ${count} chunks`);
      });
    });
  } catch (error) {
    print("❌ Error viewing chunk distribution:");
    print(error.message);
  }
}

/**
 * Get detailed chunk information for a specific collection
 */
function getCollectionChunkDetails(namespace) {
  print(`\n🔍 DETAILED CHUNK ANALYSIS FOR: ${namespace}`);

  try {
    const chunks = configDB.chunks
      .find({ ns: namespace })
      .sort({ min: 1 })
      .toArray();

    if (chunks.length === 0) {
      print(`❌ No chunks found for ${namespace}`);
      print("💡 Collection may not be sharded");
      return;
    }

    print(`Total chunks: ${chunks.length}`);
    print(`\n📋 CHUNK DETAILS:`);

    chunks.slice(0, 10).forEach((chunk, index) => {
      print(`\n${index + 1}. Chunk ID: ${chunk._id}`);
      print(`   Shard: ${chunk.shard}`);
      print(`   Min: ${JSON.stringify(chunk.min)}`);
      print(`   Max: ${JSON.stringify(chunk.max)}`);
      print(
        `   History: ${chunk.history ? chunk.history.length : 0} migrations`
      );
    });

    if (chunks.length > 10) {
      print(`\n... and ${chunks.length - 10} more chunks`);
    }

    // Analyze chunk size distribution
    print(`\n📊 CHUNK SIZE ANALYSIS:`);
    print("   💡 Use sh.status() for detailed size information");
  } catch (error) {
    print(`❌ Error getting chunk details for ${namespace}:`);
    print(error.message);
  }
}

// ============================================================================
// 2. CHUNK SPLITTING OPERATIONS
// ============================================================================

print("\n2. CHUNK SPLITTING OPERATIONS");
print("-".repeat(50));

/**
 * Manual chunk splitting strategies
 */
function demonstrateChunkSplitting() {
  print("\n✂️ CHUNK SPLITTING OPERATIONS:");

  const splittingExamples = [
    {
      operation: "Split at specific value",
      command: 'sh.splitAt("lms_primary.users", { _id: ObjectId("...") })',
      useCase: "Split large chunk at known boundary",
      when: "When you know optimal split point",
    },
    {
      operation: "Split find middle",
      command: 'sh.splitFind("lms_primary.users", { _id: ObjectId("...") })',
      useCase: "Find and split at median value",
      when: "When chunk is too large but split point unknown",
    },
    {
      operation: "Split at multiple points",
      command: "Multiple splitAt() calls for range partitioning",
      useCase: "Pre-split collection for known data ranges",
      when: "Initial collection setup with predictable data",
    },
  ];

  splittingExamples.forEach((example, index) => {
    print(`\n${index + 1}. ${example.operation.toUpperCase()}:`);
    print(`   Command: ${example.command}`);
    print(`   Use Case: ${example.useCase}`);
    print(`   When: ${example.when}`);
  });
}

/**
 * Pre-splitting strategy for new collections
 */
function demonstratePreSplitting() {
  print("\n🎯 PRE-SPLITTING STRATEGIES:");

  print("\n1️⃣ HASH-BASED PRE-SPLITTING:");
  print("   # For hashed shard keys - create even distribution");
  print("   for (var i = 0; i < 4; i++) {");
  print("     sh.splitAt('lms_primary.users', { _id: ObjectId() });");
  print("   }");

  print("\n2️⃣ RANGE-BASED PRE-SPLITTING:");
  print("   # For range shard keys - split by logical boundaries");
  print("   sh.splitAt('lms_primary.courses', { category: 'business' });");
  print("   sh.splitAt('lms_primary.courses', { category: 'technology' });");
  print("   sh.splitAt('lms_primary.courses', { category: 'science' });");

  print("\n3️⃣ TIME-BASED PRE-SPLITTING:");
  print("   # For time-series data - split by time ranges");
  print("   var startDate = new Date('2024-01-01');");
  print("   for (var month = 0; month < 12; month++) {");
  print("     var splitDate = new Date(startDate.getTime());");
  print("     splitDate.setMonth(month);");
  print("     sh.splitAt('lms_primary.events', { timestamp: splitDate });");
  print("   }");

  print("\n💡 PRE-SPLITTING BENEFITS:");
  print("   • Immediate parallelization of writes");
  print("   • Reduces initial hotspotting");
  print("   • Better performance during bulk loads");
  print("   • Avoids chunk migration during initial growth");
}

/**
 * Automatic vs manual splitting configuration
 */
function configureSplittingBehavior() {
  print("\n⚙️ SPLITTING BEHAVIOR CONFIGURATION:");

  print("\n📋 AUTOMATIC SPLITTING (Default):");
  print("   • Chunk size threshold: 64MB (default)");
  print("   • MongoDB automatically splits when exceeded");
  print("   • Splits occur during balancing rounds");

  print("\n🔧 MANUAL SPLITTING CONTROL:");
  print("   # Disable automatic splitting");
  print("   sh.disableAutoSplit()");
  print("   ");
  print("   # Enable automatic splitting");
  print("   sh.enableAutoSplit()");
  print("   ");
  print("   # Check auto-split status");
  print("   sh.getShouldAutoSplit()");

  print("\n📊 CHUNK SIZE CONFIGURATION:");
  print("   # Change default chunk size (MB)");
  print("   use config");
  print("   db.settings.save({ _id: 'chunksize', value: 128 })");

  print("\n⚠️ SPLITTING CONSIDERATIONS:");
  print("   • Smaller chunks = more distribution, more overhead");
  print("   • Larger chunks = fewer migrations, potential hotspots");
  print("   • Consider query patterns and data access");
  print("   • Monitor balancer activity after changes");
}

// ============================================================================
// 3. BALANCER MANAGEMENT
// ============================================================================

print("\n3. BALANCER MANAGEMENT");
print("-".repeat(50));

/**
 * Balancer status and control
 */
function manageBalancer() {
  print("\n⚖️ BALANCER MANAGEMENT:");

  try {
    // Check balancer status
    const balancerStatus = sh.getBalancerState();
    print(
      `\n📊 Current balancer state: ${balancerStatus ? "ENABLED" : "DISABLED"}`
    );

    // Get balancer settings
    const balancerConfig = configDB.settings.findOne({ _id: "balancer" });
    if (balancerConfig) {
      print("⚙️ Balancer configuration:");
      print(JSON.stringify(balancerConfig, null, 2));
    }
  } catch (error) {
    print("❌ Error checking balancer status:");
    print(error.message);
  }

  print("\n🔧 BALANCER CONTROL COMMANDS:");

  const balancerCommands = [
    {
      command: 'sh.enableBalancing("lms_primary.users")',
      description: "Enable balancing for specific collection",
    },
    {
      command: 'sh.disableBalancing("lms_primary.users")',
      description: "Disable balancing for specific collection",
    },
    {
      command: "sh.startBalancer()",
      description: "Start the balancer process",
    },
    {
      command: "sh.stopBalancer()",
      description: "Stop the balancer process",
    },
    {
      command: "sh.isBalancerRunning()",
      description: "Check if balancer is currently running",
    },
  ];

  balancerCommands.forEach((cmd) => {
    print(`\n   ${cmd.command}`);
    print(`   └─ ${cmd.description}`);
  });
}

/**
 * Balancer window configuration
 */
function configureBalancerWindow() {
  print("\n🕐 BALANCER WINDOW CONFIGURATION:");

  print("Configure balancer to run only during off-peak hours:");

  print("\n💼 BUSINESS HOURS AVOIDANCE:");
  print("   # Set balancer window (11 PM to 6 AM)");
  print("   use config");
  print("   db.settings.update(");
  print("      { _id: 'balancer' },");
  print("      { $set: { activeWindow: { start: '23:00', stop: '06:00' } } },");
  print("      { upsert: true }");
  print("   )");

  print("\n🌍 TIMEZONE CONSIDERATIONS:");
  print("   # Balancer window uses MongoDB server time");
  print("   # Plan according to your cluster's timezone");
  print("   # Consider multiple regions if globally distributed");

  print("\n❌ REMOVE BALANCER WINDOW:");
  print("   # Allow balancer to run 24/7");
  print("   db.settings.remove({ _id: 'balancer' })");

  print("\n📊 WINDOW STATUS CHECK:");
  print("   db.settings.findOne({ _id: 'balancer' })");
}

/**
 * Balancer performance monitoring
 */
function monitorBalancerPerformance() {
  print("\n📈 BALANCER PERFORMANCE MONITORING:");

  try {
    // Check recent balancer activity
    const balancerStatus = adminDB.runCommand({ balancerStatus: 1 });
    if (balancerStatus.ok === 1) {
      print("✅ Balancer status retrieved");
      print(`   Mode: ${balancerStatus.mode}`);
      print(`   In balancer round: ${balancerStatus.inBalancerRound}`);
      print(
        `   Num balancer rounds: ${balancerStatus.numBalancerRounds || "N/A"}`
      );
    }

    // Check recent migrations
    const recentMigrations = configDB.changelog
      .find({
        what: "moveChunk.start",
      })
      .sort({ time: -1 })
      .limit(5)
      .toArray();

    if (recentMigrations.length > 0) {
      print(`\n📋 RECENT MIGRATION ACTIVITY:`);
      recentMigrations.forEach((migration, index) => {
        print(`   ${index + 1}. ${migration.time}: ${migration.ns}`);
        print(
          `      From: ${migration.details.from} → To: ${migration.details.to}`
        );
      });
    } else {
      print("\n📋 No recent migration activity found");
    }
  } catch (error) {
    print("❌ Error monitoring balancer performance:");
    print(error.message);
  }

  print("\n🔍 MONITORING QUERIES:");
  print("   # Recent chunk migrations");
  print("   db.changelog.find({ what: 'moveChunk.start' })");
  print("     .sort({ time: -1 }).limit(10)");
  print("   ");
  print("   # Failed migrations");
  print("   db.changelog.find({ what: 'moveChunk.error' })");
  print("   ");
  print("   # Balancer lock status");
  print("   db.locks.findOne({ _id: 'balancer' })");
}

// ============================================================================
// 4. CHUNK MIGRATION OPERATIONS
// ============================================================================

print("\n4. CHUNK MIGRATION OPERATIONS");
print("-".repeat(50));

/**
 * Manual chunk migration
 */
function demonstrateChunkMigration() {
  print("\n🚚 CHUNK MIGRATION OPERATIONS:");

  print("\n1️⃣ MANUAL CHUNK MOVE:");
  print("   # Move specific chunk to target shard");
  print("   sh.moveChunk('lms_primary.users',");
  print("               { _id: ObjectId('...') },");
  print("               'shard02')");

  print("\n2️⃣ EMPTY SHARD DRAINING:");
  print("   # Remove shard (drains all chunks first)");
  print("   use admin");
  print("   db.runCommand({ removeShard: 'shard03' })");

  print("\n3️⃣ REBALANCE SPECIFIC COLLECTION:");
  print("   # Force rebalancing of collection");
  print("   sh.enableBalancing('lms_primary.users')");
  print("   sh.startBalancer()");

  print("\n⚠️ MIGRATION CONSIDERATIONS:");
  print("   • Migrations block during the final commit phase");
  print("   • Large chunks take longer to migrate");
  print("   • Network bandwidth affects migration speed");
  print("   • Monitor application performance during migrations");
}

/**
 * Migration failure handling
 */
function handleMigrationFailures() {
  print("\n🔧 MIGRATION FAILURE HANDLING:");

  print("\n📋 COMMON FAILURE SCENARIOS:");
  const failureScenarios = [
    {
      scenario: "Network interruption during migration",
      symptoms: "Chunk stuck in migration state",
      solution: "Restart balancer, check network connectivity",
    },
    {
      scenario: "Target shard disk space full",
      symptoms: "Migration fails with disk space error",
      solution: "Free disk space or choose different target shard",
    },
    {
      scenario: "Chunk too large for migration",
      symptoms: "Migration timeout or memory errors",
      solution: "Split chunk first, then migrate pieces",
    },
    {
      scenario: "Lock contention during migration",
      symptoms: "Migration queued but not starting",
      solution: "Wait for locks to clear or restart balancer",
    },
  ];

  failureScenarios.forEach((scenario, index) => {
    print(`\n${index + 1}. ${scenario.scenario.toUpperCase()}:`);
    print(`   Symptoms: ${scenario.symptoms}`);
    print(`   Solution: ${scenario.solution}`);
  });

  print("\n🔍 TROUBLESHOOTING COMMANDS:");
  print("   # Check migration locks");
  print("   db.locks.find({ _id: /^lms_primary/ })");
  print("   ");
  print("   # View balancer log");
  print("   db.changelog.find({ what: /moveChunk/ })");
  print("     .sort({ time: -1 })");
  print("   ");
  print("   # Clear stuck migration (emergency only)");
  print("   db.locks.remove({ _id: 'balancer' })");
}

// ============================================================================
// 5. CHUNK OPTIMIZATION STRATEGIES
// ============================================================================

print("\n5. CHUNK OPTIMIZATION STRATEGIES");
print("-".repeat(50));

/**
 * Optimize chunk distribution for query patterns
 */
function optimizeForQueryPatterns() {
  print("\n🎯 QUERY-PATTERN OPTIMIZATION:");

  const optimizationStrategies = [
    {
      pattern: "Single-user queries ({ userId: 123 })",
      strategy: "Co-locate user data on same shard",
      implementation: "Use userId as shard key prefix",
      benefit: "Single-shard queries, fast user operations",
    },
    {
      pattern: "Time-range queries ({ timestamp: { $gte: date } })",
      strategy: "Chunk by time ranges",
      implementation: "Include timestamp in shard key",
      benefit: "Time-based queries hit fewer shards",
    },
    {
      pattern: 'Category-based queries ({ category: "tech" })',
      strategy: "Group by category ranges",
      implementation: "Use category as leading shard key field",
      benefit: "Category queries target specific shards",
    },
    {
      pattern: "Cross-collection joins",
      strategy: "Align shard keys across collections",
      implementation: "Use same field (e.g., userId) in both collections",
      benefit: "Co-located data reduces network overhead",
    },
  ];

  optimizationStrategies.forEach((strategy, index) => {
    print(`\n${index + 1}. ${strategy.pattern.toUpperCase()}:`);
    print(`   Strategy: ${strategy.strategy}`);
    print(`   Implementation: ${strategy.implementation}`);
    print(`   Benefit: ${strategy.benefit}`);
  });
}

/**
 * Data lifecycle and chunk management
 */
function manageDataLifecycle() {
  print("\n📅 DATA LIFECYCLE CHUNK MANAGEMENT:");

  print("\n🗂️ HOT/WARM/COLD DATA STRATEGY:");
  print("   1. Hot data (recent): Keep on fast shards");
  print("   2. Warm data (months old): Move to standard shards");
  print("   3. Cold data (archive): Move to slow/cheap shards");

  print("\n🔄 AUTOMATED LIFECYCLE MANAGEMENT:");
  print("   # Tag shards by performance tier");
  print("   sh.addShardTag('shard01', 'hot')");
  print("   sh.addShardTag('shard02', 'warm')");
  print("   sh.addShardTag('shard03', 'cold')");
  print("   ");
  print("   # Create tag ranges for time-based data");
  print("   var now = new Date();");
  print("   var hotThreshold = new Date(now - 30*24*60*60*1000); // 30 days");
  print("   var warmThreshold = new Date(now - 365*24*60*60*1000); // 1 year");
  print("   ");
  print("   sh.addTagRange('lms_primary.events',");
  print("                  { timestamp: hotThreshold },");
  print("                  { timestamp: MaxKey },");
  print("                  'hot')");

  print("\n💡 LIFECYCLE BENEFITS:");
  print("   • Optimize costs by hardware tier");
  print("   • Improve performance for active data");
  print("   • Reduce maintenance overhead");
  print("   • Enable efficient archiving strategies");
}

// ============================================================================
// 6. MONITORING AND ALERTING
// ============================================================================

print("\n6. MONITORING AND ALERTING");
print("-".repeat(50));

/**
 * Comprehensive chunk monitoring
 */
function setupChunkMonitoring() {
  print("\n📊 CHUNK MONITORING SETUP:");

  print("\n🎯 KEY METRICS TO MONITOR:");
  const metrics = [
    "Chunk count per shard (balance)",
    "Chunk size distribution",
    "Migration frequency and success rate",
    "Balancer active time percentage",
    "Failed migration count",
    "Largest chunk sizes",
    "Shard utilization (CPU, disk, memory)",
  ];

  metrics.forEach((metric, index) => {
    print(`   ${index + 1}. ${metric}`);
  });

  print("\n🚨 ALERTING THRESHOLDS:");
  print("   • Chunk imbalance > 20% between shards");
  print("   • Migration failures > 5% rate");
  print("   • Individual chunks > 200MB");
  print("   • Balancer unable to run for > 24 hours");
  print("   • Shard disk utilization > 80%");

  print("\n📈 MONITORING QUERIES:");
  print("   # Chunk distribution");
  print("   db.chunks.aggregate([");
  print("     { $group: { _id: '$shard', count: { $sum: 1 } } }");
  print("   ])");
  print("   ");
  print("   # Recent migration activity");
  print("   db.changelog.find({");
  print("     what: 'moveChunk.start',");
  print("     time: { $gte: new Date(Date.now() - 24*60*60*1000) }");
  print("   }).count()");
}

// ============================================================================
// 7. EXECUTION SECTION
// ============================================================================

print("\n7. EXECUTING CHUNK MANAGEMENT OPERATIONS");
print("-".repeat(50));

try {
  // Explore current chunk structure
  exploreChunkStructure();

  // View chunk distribution
  viewChunkDistribution();

  // Get details for a sample collection (if exists)
  getCollectionChunkDetails("lms_primary.users");

  // Demonstrate chunk operations
  demonstrateChunkSplitting();
  demonstratePreSplitting();
  configureSplittingBehavior();

  // Balancer management
  manageBalancer();
  configureBalancerWindow();
  monitorBalancerPerformance();

  // Migration operations
  demonstrateChunkMigration();
  handleMigrationFailures();

  // Optimization strategies
  optimizeForQueryPatterns();
  manageDataLifecycle();

  // Monitoring setup
  setupChunkMonitoring();

  print("\n✅ Chunk management operations completed!");
  print("💡 Use these patterns for production chunk management");
  print("🔍 Regular monitoring is key to optimal performance");
} catch (error) {
  print("❌ Error during chunk management operations:");
  print(error.message);
}

print("\n" + "=".repeat(80));
print("CHUNK MANAGEMENT COMPLETE");
print("=".repeat(80));
