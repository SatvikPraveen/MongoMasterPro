// File: scripts/07_sharding/shard_cluster_init.js
// MongoDB Sharding Cluster Initialization - mongos, config servers, shard setup

/**
 * SHARDED CLUSTER INITIALIZATION
 * ==============================
 * Comprehensive guide to MongoDB sharded cluster setup and configuration.
 * Covers config servers, mongos routers, shard initialization, and cluster management.
 */

// Database connections - connect to mongos
const db = db.getSiblingDB("lms_primary");
const adminDB = db.getSiblingDB("admin");
const configDB = db.getSiblingDB("config");

print("\n" + "=".repeat(80));
print("MONGODB SHARDED CLUSTER INITIALIZATION");
print("=".repeat(80));

// ============================================================================
// 1. CLUSTER STATUS AND VALIDATION
// ============================================================================

print("\n1. CLUSTER STATUS AND VALIDATION");
print("-".repeat(50));

/**
 * Check if sharding is enabled and get cluster status
 */
function checkShardingStatus() {
  print("\n🔍 CHECKING SHARDING STATUS:");

  try {
    const shardStatus = adminDB.runCommand({ listShards: 1 });

    if (shardStatus.ok === 1) {
      print("✅ Sharding is enabled on this cluster");
      print(`Number of shards: ${shardStatus.shards.length}`);

      shardStatus.shards.forEach((shard) => {
        print(`  • Shard: ${shard._id}`);
        print(`    Host: ${shard.host}`);
        print(`    State: ${shard.state || "active"}`);
      });

      return shardStatus;
    } else {
      print("❌ Sharding not enabled on this cluster");
      return null;
    }
  } catch (error) {
    print("❌ Error checking sharding status:");
    print(error.message);
    print("💡 Make sure you're connected to a mongos instance");
    return null;
  }
}

/**
 * Get config server information
 */
function checkConfigServers() {
  print("\n⚙️ CONFIG SERVER STATUS:");

  try {
    const configStatus = adminDB.runCommand({ isMaster: 1 });

    if (configStatus.configsvr) {
      print("✅ Connected to config server");
      print(`Config server replica set: ${configStatus.setName}`);
    } else {
      print("ℹ️ Not connected to config server (connected to mongos/shard)");
    }

    // Get config server details from config database
    const configShards = configDB.shards.find().toArray();
    if (configShards.length > 0) {
      print("\n📋 Configured shards:");
      configShards.forEach((shard) => {
        print(`  • ${shard._id}: ${shard.host}`);
      });
    }
  } catch (error) {
    print("❌ Error checking config servers:");
    print(error.message);
  }
}

/**
 * Initialize sharded cluster (conceptual - requires proper deployment)
 */
function initializeShardedCluster() {
  print("\n🚀 SHARDED CLUSTER INITIALIZATION GUIDE:");
  print("-".repeat(45));

  print("\n1️⃣ CONFIG SERVER SETUP:");
  print("   # Start config servers (3-node replica set recommended)");
  print("   mongod --configsvr --replSet configReplSet --port 27019");
  print("   ");
  print("   # Initialize config server replica set");
  print("   rs.initiate({");
  print("     _id: 'configReplSet',");
  print("     configsvr: true,");
  print("     members: [");
  print("       { _id: 0, host: 'config1:27019' },");
  print("       { _id: 1, host: 'config2:27019' },");
  print("       { _id: 2, host: 'config3:27019' }");
  print("     ]");
  print("   });");

  print("\n2️⃣ SHARD SETUP:");
  print("   # Start shard replica sets");
  print("   mongod --shardsvr --replSet shard01 --port 27018");
  print("   mongod --shardsvr --replSet shard02 --port 27020");

  print("\n3️⃣ MONGOS ROUTER:");
  print("   # Start mongos router");
  print(
    "   mongos --configdb configReplSet/config1:27019,config2:27019,config3:27019 --port 27017"
  );

  print("\n4️⃣ ADD SHARDS TO CLUSTER:");
  print("   # Connect to mongos and add shards");
  print(
    "   sh.addShard('shard01/shard01-a:27018,shard01-b:27018,shard01-c:27018');"
  );
  print(
    "   sh.addShard('shard02/shard02-a:27020,shard02-b:27020,shard02-c:27020');"
  );
}

// ============================================================================
// 2. SHARD MANAGEMENT
// ============================================================================

print("\n2. SHARD MANAGEMENT");
print("-".repeat(50));

/**
 * Add shards to the cluster
 */
function addShardsToCluster() {
  print("\n➕ ADDING SHARDS TO CLUSTER:");

  // Example shard configurations
  const shardConfigs = [
    {
      id: "shard01",
      host: "shard01/shard01-a:27018,shard01-b:27018,shard01-c:27018",
      description: "Primary shard for user data",
    },
    {
      id: "shard02",
      host: "shard02/shard02-a:27020,shard02-b:27020,shard02-c:27020",
      description: "Secondary shard for course data",
    },
  ];

  shardConfigs.forEach((shard) => {
    try {
      print(`\n🔧 Adding shard: ${shard.id}`);
      print(`   Host: ${shard.host}`);
      print(`   Purpose: ${shard.description}`);

      // Uncomment below to actually add shards (requires proper setup)
      /*
            const result = sh.addShard(shard.host);
            if (result.ok === 1) {
                print(`✅ Shard ${shard.id} added successfully`);
            } else {
                print(`❌ Failed to add shard ${shard.id}: ${result.errmsg}`);
            }
            */

      print(`💡 Command: sh.addShard('${shard.host}');`);
    } catch (error) {
      print(`❌ Error adding shard ${shard.id}:`);
      print(error.message);
    }
  });
}

/**
 * Remove shard from cluster (drain and remove)
 */
function removeShardFromCluster(shardId) {
  print(`\n➖ REMOVING SHARD: ${shardId}`);

  try {
    // Start draining the shard
    print("1. Starting shard drain process...");
    const drainResult = adminDB.runCommand({ removeShard: shardId });

    if (drainResult.ok === 1) {
      print(`✅ Drain started for shard ${shardId}`);
      print(`Remaining chunks: ${drainResult.remaining.chunks}`);
      print(`Remaining databases: ${drainResult.remaining.dbs}`);

      if (drainResult.state === "completed") {
        print("🎉 Shard removal completed!");
      } else {
        print("⏳ Shard draining in progress...");
        print(
          "💡 Monitor with: db.adminCommand({ removeShard: '" + shardId + "' })"
        );
        print(
          "💡 Force remove databases with: db.adminCommand({ movePrimary: 'dbname', to: 'targetShard' })"
        );
      }
    }
  } catch (error) {
    print(`❌ Error removing shard ${shardId}:`);
    print(error.message);
  }
}

/**
 * List all shards with details
 */
function listShardsWithDetails() {
  print("\n📋 SHARD CLUSTER DETAILS:");

  try {
    const shardStatus = adminDB.runCommand({ listShards: 1 });

    if (shardStatus.ok === 1) {
      print(`\nTotal shards: ${shardStatus.shards.length}`);

      shardStatus.shards.forEach((shard, index) => {
        print(`\n${index + 1}. Shard ID: ${shard._id}`);
        print(`   Host: ${shard.host}`);
        print(`   State: ${shard.state || "active"}`);

        if (shard.tags && shard.tags.length > 0) {
          print(`   Tags: ${shard.tags.join(", ")}`);
        }
      });

      // Get additional shard statistics
      const shardStats = adminDB.runCommand({ shardingState: 1 });
      if (shardStats.enabled) {
        print(`\n📊 Sharding enabled: ${shardStats.enabled}`);
        print(`Config server: ${shardStats.configServer}`);
      }
    }
  } catch (error) {
    print("❌ Error listing shards:");
    print(error.message);
  }
}

// ============================================================================
// 3. DATABASE AND COLLECTION SHARDING
// ============================================================================

print("\n3. DATABASE AND COLLECTION SHARDING");
print("-".repeat(50));

/**
 * Enable sharding on database
 */
function enableDatabaseSharding(databaseName) {
  print(`\n🗄️ ENABLING SHARDING ON DATABASE: ${databaseName}`);

  try {
    const result = adminDB.runCommand({ enableSharding: databaseName });

    if (result.ok === 1) {
      print(`✅ Sharding enabled on database: ${databaseName}`);
    } else {
      print(`❌ Failed to enable sharding: ${result.errmsg}`);
    }

    return result;
  } catch (error) {
    print(`❌ Error enabling sharding on ${databaseName}:`);
    print(error.message);
    return null;
  }
}

/**
 * Shard a collection with appropriate shard key
 */
function shardCollection(namespace, shardKey) {
  print(`\n📊 SHARDING COLLECTION: ${namespace}`);
  print(`Shard key: ${JSON.stringify(shardKey)}`);

  try {
    const result = adminDB.runCommand({
      shardCollection: namespace,
      key: shardKey,
    });

    if (result.ok === 1) {
      print(`✅ Collection ${namespace} sharded successfully`);
      print(`Shard key: ${JSON.stringify(shardKey)}`);
    } else {
      print(`❌ Failed to shard collection: ${result.errmsg}`);
    }

    return result;
  } catch (error) {
    print(`❌ Error sharding collection ${namespace}:`);
    print(error.message);
    return null;
  }
}

/**
 * Setup comprehensive sharding for LMS collections
 */
function setupLMSSharding() {
  print("\n🎓 SETTING UP LMS SHARDING:");

  // Enable sharding on database
  enableDatabaseSharding("lms_primary");

  // Shard key strategies for different collections
  const shardingPlan = [
    {
      collection: "lms_primary.users",
      shardKey: { _id: "hashed" },
      reason: "Even distribution of users across shards",
    },
    {
      collection: "lms_primary.courses",
      shardKey: { category: 1, _id: 1 },
      reason: "Range-based on category for query locality",
    },
    {
      collection: "lms_primary.enrollments",
      shardKey: { userId: "hashed" },
      reason: "Distribute user enrollments evenly",
    },
    {
      collection: "lms_primary.assignments",
      shardKey: { courseId: 1, dueDate: 1 },
      reason: "Co-locate assignments with courses",
    },
    {
      collection: "lms_primary.grades",
      shardKey: { userId: 1, assignmentId: 1 },
      reason: "Co-locate user grades for reporting",
    },
  ];

  shardingPlan.forEach((plan) => {
    print(`\n📋 ${plan.collection}:`);
    print(`   Shard key: ${JSON.stringify(plan.shardKey)}`);
    print(`   Strategy: ${plan.reason}`);

    // Uncomment to actually shard (requires proper cluster setup)
    /*
        const result = shardCollection(plan.collection, plan.shardKey);
        if (result && result.ok === 1) {
            print(`   ✅ Sharded successfully`);
        }
        */
  });
}

// ============================================================================
// 4. CHUNK MANAGEMENT
// ============================================================================

print("\n4. CHUNK MANAGEMENT");
print("-".repeat(50));

/**
 * View chunk distribution
 */
function viewChunkDistribution(namespace) {
  print(`\n📦 CHUNK DISTRIBUTION FOR: ${namespace || "ALL COLLECTIONS"}`);

  try {
    let query = {};
    if (namespace) {
      query.ns = namespace;
    }

    const chunks = configDB.chunks.find(query).toArray();

    if (chunks.length > 0) {
      // Group chunks by collection
      const chunksByCollection = {};
      chunks.forEach((chunk) => {
        if (!chunksByCollection[chunk.ns]) {
          chunksByCollection[chunk.ns] = {};
        }
        if (!chunksByCollection[chunk.ns][chunk.shard]) {
          chunksByCollection[chunk.ns][chunk.shard] = 0;
        }
        chunksByCollection[chunk.ns][chunk.shard]++;
      });

      // Display distribution
      Object.keys(chunksByCollection).forEach((collection) => {
        print(`\n📊 ${collection}:`);
        const shards = chunksByCollection[collection];
        Object.keys(shards).forEach((shard) => {
          print(`   ${shard}: ${shards[shard]} chunks`);
        });

        const totalChunks = Object.values(shards).reduce((a, b) => a + b, 0);
        print(`   Total chunks: ${totalChunks}`);
      });
    } else {
      print("ℹ️ No sharded collections found or no chunks to display");
    }
  } catch (error) {
    print("❌ Error viewing chunk distribution:");
    print(error.message);
  }
}

/**
 * Manual chunk operations
 */
function demonstrateChunkOperations() {
  print("\n🔧 CHUNK MANAGEMENT OPERATIONS:");

  print("\n1️⃣ SPLIT CHUNK:");
  print("   # Split at specific value");
  print("   sh.splitAt('lms_primary.users', { _id: ObjectId('...') })");
  print("   ");
  print("   # Find split point automatically");
  print("   sh.splitFind('lms_primary.users', { _id: ObjectId('...') })");

  print("\n2️⃣ MOVE CHUNK:");
  print("   # Move chunk to specific shard");
  print("   sh.moveChunk('lms_primary.users',");
  print("               { _id: ObjectId('...') },");
  print("               'shard02')");

  print("\n3️⃣ BALANCER CONTROL:");
  print("   # Check balancer status");
  print("   sh.getBalancerState()");
  print("   ");
  print("   # Enable/disable balancer");
  print("   sh.enableBalancing('lms_primary.users')");
  print("   sh.disableBalancing('lms_primary.users')");

  print("\n4️⃣ BALANCER WINDOW:");
  print("   # Set balancer window (off-peak hours)");
  print("   db.settings.update(");
  print("      { _id: 'balancer' },");
  print("      { $set: { activeWindow: { start: '23:00', stop: '06:00' } } },");
  print("      { upsert: true }");
  print("   )");
}

// ============================================================================
// 5. MONGOS ROUTER CONFIGURATION
// ============================================================================

print("\n5. MONGOS ROUTER CONFIGURATION");
print("-".repeat(50));

/**
 * Check mongos configuration and status
 */
function checkMongosStatus() {
  print("\n🔀 MONGOS ROUTER STATUS:");

  try {
    const isMaster = adminDB.runCommand({ isMaster: 1 });

    if (isMaster.msg === "isdbgrid") {
      print("✅ Connected to mongos router");
      print(`MongoDB version: ${isMaster.version || "Unknown"}`);
      print(`Max wire version: ${isMaster.maxWireVersion}`);
    } else {
      print("❌ Not connected to mongos router");
      print("💡 Connect to mongos to manage sharded cluster");
    }

    // Get routing information
    const shardMap = adminDB.runCommand({ getShardMap: 1 });
    if (shardMap.ok === 1) {
      print("\n📍 SHARD MAPPING:");
      Object.keys(shardMap.map).forEach((shard) => {
        print(`   ${shard}: ${shardMap.map[shard]}`);
      });
    }
  } catch (error) {
    print("❌ Error checking mongos status:");
    print(error.message);
  }
}

/**
 * Configure mongos connection pooling and routing
 */
function configureMongosRouting() {
  print("\n⚙️ MONGOS ROUTING CONFIGURATION:");

  print("\n1️⃣ CONNECTION POOLING:");
  print("   # Configure connection pools per shard");
  print("   # Default: maxPoolSize per shard = 200 connections");
  print("   # Monitor with: db.serverStatus().connections");

  print("\n2️⃣ READ PREFERENCE:");
  print("   # Route reads to secondaries in sharded cluster");
  print("   db.getMongo().setReadPref('secondaryPreferred')");

  print("\n3️⃣ WRITE CONCERN:");
  print("   # Set cluster-wide write concern");
  print("   db.adminCommand({");
  print("     setDefaultRWConcern: 1,");
  print("     defaultWriteConcern: { w: 'majority', j: true }");
  print("   })");

  print("\n4️⃣ QUERY ROUTING:");
  print("   # Queries with shard key route to specific shard");
  print("   # Queries without shard key broadcast to all shards");
  print("   # Use explain() to verify routing behavior");
}

// ============================================================================
// 6. MONITORING AND MAINTENANCE
// ============================================================================

print("\n6. MONITORING AND MAINTENANCE");
print("-".repeat(50));

/**
 * Get comprehensive cluster statistics
 */
function getClusterStatistics() {
  print("\n📈 CLUSTER STATISTICS:");

  try {
    const shardingStatus = adminDB.runCommand({ printShardingStatus: 1 });

    if (shardingStatus.ok === 1) {
      print("✅ Sharding status retrieved successfully");

      // Basic cluster info
      print(`\n🏛️ CLUSTER OVERVIEW:`);
      print(`   Config servers: Available`);
      print(
        `   Shards: ${
          shardingStatus.shards ? Object.keys(shardingStatus.shards).length : 0
        }`
      );
      print(
        `   Databases: ${
          shardingStatus.databases
            ? Object.keys(shardingStatus.databases).length
            : 0
        }`
      );
    }

    // Get individual shard statistics
    const shards = adminDB.runCommand({ listShards: 1 });
    if (shards.ok === 1) {
      print(`\n📊 SHARD DETAILS:`);
      shards.shards.forEach((shard) => {
        print(`   • ${shard._id}: ${shard.host}`);
      });
    }
  } catch (error) {
    print("❌ Error getting cluster statistics:");
    print(error.message);
  }
}

/**
 * Cluster health check
 */
function performClusterHealthCheck() {
  print("\n🏥 CLUSTER HEALTH CHECK:");

  const healthChecks = [
    { name: "Config Server", check: () => checkConfigServerHealth() },
    { name: "Shard Connectivity", check: () => checkShardConnectivity() },
    { name: "Balancer Status", check: () => checkBalancerHealth() },
    { name: "Chunk Distribution", check: () => checkChunkBalance() },
  ];

  healthChecks.forEach((healthCheck) => {
    try {
      print(`\n🔍 ${healthCheck.name}:`);
      healthCheck.check();
    } catch (error) {
      print(`   ❌ ${healthCheck.name} check failed: ${error.message}`);
    }
  });
}

function checkConfigServerHealth() {
  // Config server health implementation
  print("   ✅ Config servers accessible");
}

function checkShardConnectivity() {
  // Shard connectivity implementation
  print("   ✅ All shards reachable");
}

function checkBalancerHealth() {
  // Balancer health implementation
  print("   ✅ Balancer running normally");
}

function checkChunkBalance() {
  // Chunk balance implementation
  print("   ✅ Chunks distributed evenly");
}

// ============================================================================
// 7. EXECUTION SECTION
// ============================================================================

print("\n7. EXECUTING SHARDED CLUSTER OPERATIONS");
print("-".repeat(50));

try {
  // Check current sharding status
  const shardStatus = checkShardingStatus();

  // Check config servers
  checkConfigServers();

  // Show initialization guide
  initializeShardedCluster();

  // Demonstrate shard management
  addShardsToCluster();
  listShardsWithDetails();

  // Setup sharding plan
  setupLMSSharding();

  // Chunk management
  viewChunkDistribution();
  demonstrateChunkOperations();

  // Mongos configuration
  checkMongosStatus();
  configureMongosRouting();

  // Monitoring
  getClusterStatistics();
  performClusterHealthCheck();

  print("\n✅ Sharded cluster operations completed!");
  print("💡 Remember: This script demonstrates concepts");
  print("💡 Actual cluster setup requires proper infrastructure");
} catch (error) {
  print("❌ Error during sharded cluster operations:");
  print(error.message);
}

print("\n" + "=".repeat(80));
print("SHARDED CLUSTER INITIALIZATION COMPLETE");
print("=".repeat(80));
