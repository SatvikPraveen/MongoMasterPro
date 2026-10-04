// File: scripts/06_replication/replica_set_ops.js
// MongoDB Replica Set Operations - Initialization and Member Management

/**
 * REPLICA SET OPERATIONS
 * ======================
 * Comprehensive guide to MongoDB replica set configuration and management.
 * Covers initialization, member addition/removal, priority settings, and failover scenarios.
 */

// Database connections
const primaryDB = db.getSiblingDB("mmp_replication");
const adminDB = db.getSiblingDB("admin");

print("\n" + "=".repeat(80));
print("MONGODB REPLICA SET OPERATIONS");
print("=".repeat(80));

// ============================================================================
// 1. REPLICA SET INITIALIZATION
// ============================================================================

print("\n1. REPLICA SET INITIALIZATION");
print("-".repeat(50));

/**
 * Initialize a replica set with multiple members
 */
function initializeReplicaSet() {
  const config = {
    _id: "rs0",
    members: [
      {
        _id: 0,
        host: "mongo-primary:27017",
        priority: 2,
      },
      {
        _id: 1,
        host: "mongo-secondary1:27017",
        priority: 1,
      },
      {
        _id: 2,
        host: "mongo-secondary2:27017",
        priority: 1,
      },
    ],
  };

  try {
    const result = rs.initiate(config);
    print("✅ Replica set initialized:");
    printjson(result);
  } catch (error) {
    print("❌ Failed to initialize replica set:");
    print(error.message);
  }
}

/**
 * Check replica set status
 */
function checkReplicaSetStatus() {
  try {
    const status = rs.status();
    print("\n📊 Replica Set Status:");
    print(`Set Name: ${status.set}`);
    print(`Date: ${status.date}`);
    print(`Members: ${status.members.length}`);

    status.members.forEach((member) => {
      print(
        `  - ${member.name}: ${member.stateStr} (health: ${member.health})`
      );
    });

    return status;
  } catch (error) {
    print("❌ Error checking replica set status:");
    print(error.message);
    return null;
  }
}

/**
 * Get replica set configuration
 */
function getReplicaSetConfig() {
  try {
    const config = rs.conf();
    print("\n⚙️ Current Replica Set Configuration:");
    printjson(config);
    return config;
  } catch (error) {
    print("❌ Error getting replica set config:");
    print(error.message);
    return null;
  }
}

// ============================================================================
// 2. MEMBER MANAGEMENT
// ============================================================================

print("\n2. MEMBER MANAGEMENT");
print("-".repeat(50));

/**
 * Add a new member to the replica set
 */
function addReplicaSetMember(host, priority = 1, votes = 1) {
  try {
    const config = rs.conf();
    const newId = Math.max(...config.members.map((m) => m._id)) + 1;

    config.members.push({
      _id: newId,
      host: host,
      priority: priority,
      votes: votes,
    });

    config.version += 1;

    const result = rs.reconfig(config);
    print(`✅ Added member ${host} with priority ${priority}`);
    printjson(result);
  } catch (error) {
    print(`❌ Failed to add member ${host}:`);
    print(error.message);
  }
}

/**
 * Remove a member from the replica set
 */
function removeReplicaSetMember(host) {
  try {
    const config = rs.conf();
    config.members = config.members.filter((member) => member.host !== host);
    config.version += 1;

    const result = rs.reconfig(config);
    print(`✅ Removed member ${host}`);
    printjson(result);
  } catch (error) {
    print(`❌ Failed to remove member ${host}:`);
    print(error.message);
  }
}

/**
 * Configure member priority
 */
function setMemberPriority(host, priority) {
  try {
    const config = rs.conf();
    const member = config.members.find((m) => m.host === host);

    if (member) {
      member.priority = priority;
      config.version += 1;

      const result = rs.reconfig(config);
      print(`✅ Set priority for ${host} to ${priority}`);
      printjson(result);
    } else {
      print(`❌ Member ${host} not found in replica set`);
    }
  } catch (error) {
    print(`❌ Failed to set priority for ${host}:`);
    print(error.message);
  }
}

/**
 * Add an arbiter to the replica set
 */
function addArbiter(host) {
  try {
    const result = rs.addArb(host);
    print(`✅ Added arbiter: ${host}`);
    printjson(result);
  } catch (error) {
    print(`❌ Failed to add arbiter ${host}:`);
    print(error.message);
  }
}

// ============================================================================
// 3. HIDDEN AND DELAYED MEMBERS
// ============================================================================

print("\n3. SPECIALIZED MEMBER CONFIGURATIONS");
print("-".repeat(50));

/**
 * Configure a hidden member (for backups or analytics)
 */
function configureHiddenMember(host, priority = 0, hidden = true) {
  try {
    const config = rs.conf();
    const member = config.members.find((m) => m.host === host);

    if (member) {
      member.priority = priority;
      member.hidden = hidden;
      config.version += 1;

      const result = rs.reconfig(config);
      print(`✅ Configured hidden member: ${host}`);
      printjson(result);
    } else {
      print(`❌ Member ${host} not found`);
    }
  } catch (error) {
    print(`❌ Failed to configure hidden member ${host}:`);
    print(error.message);
  }
}

/**
 * Configure a delayed member (for point-in-time recovery)
 */
function configureDelayedMember(host, delaySeconds = 3600) {
  try {
    const config = rs.conf();
    const member = config.members.find((m) => m.host === host);

    if (member) {
      member.priority = 0;
      member.hidden = true;
      member.secondaryDelaySecs = delaySeconds;
      config.version += 1;

      const result = rs.reconfig(config);
      print(`✅ Configured delayed member: ${host} (${delaySeconds}s delay)`);
      printjson(result);
    } else {
      print(`❌ Member ${host} not found`);
    }
  } catch (error) {
    print(`❌ Failed to configure delayed member ${host}:`);
    print(error.message);
  }
}

// ============================================================================
// 4. FAILOVER AND MAINTENANCE
// ============================================================================

print("\n4. FAILOVER AND MAINTENANCE");
print("-".repeat(50));

/**
 * Step down primary for maintenance
 */
function stepDownPrimary(stepDownSecs = 60, secondaryCatchUpPeriodSecs = 10) {
  try {
    const result = rs.stepDown(stepDownSecs, secondaryCatchUpPeriodSecs);
    print(`✅ Primary stepped down for ${stepDownSecs} seconds`);
    printjson(result);
  } catch (error) {
    print("❌ Failed to step down primary:");
    print(error.message);
  }
}

/**
 * Force a member to become primary (use with caution)
 */
function freezeMember(host, seconds = 120) {
  try {
    // This should be run on the specific member
    const result = rs.freeze(seconds);
    print(`✅ Member ${host} frozen for ${seconds} seconds`);
    printjson(result);
  } catch (error) {
    print(`❌ Failed to freeze member ${host}:`);
    print(error.message);
  }
}

/**
 * Monitor replication lag
 */
function monitorReplicationLag() {
  try {
    const status = rs.status();
    const primary = status.members.find((m) => m.state === 1);
    const secondaries = status.members.filter((m) => m.state === 2);

    if (primary) {
      print("\n📈 Replication Lag Analysis:");
      print(`Primary: ${primary.name} (${primary.optimeDate})`);

      secondaries.forEach((secondary) => {
        const lag = (primary.optimeDate - secondary.optimeDate) / 1000;
        print(`Secondary: ${secondary.name} - Lag: ${lag.toFixed(2)}s`);
      });
    }
  } catch (error) {
    print("❌ Error monitoring replication lag:");
    print(error.message);
  }
}

// ============================================================================
// 5. REPLICA SET MAINTENANCE
// ============================================================================

print("\n5. REPLICA SET MAINTENANCE");
print("-".repeat(50));

/**
 * Resync a member from scratch
 */
function resyncMember(host) {
  print(`⚠️ To resync member ${host}:`);
  print("1. Stop mongod on the member");
  print("2. Remove data directory contents");
  print("3. Restart mongod - it will sync from other members");
  print("4. Monitor with rs.status() until SECONDARY state");
}

/**
 * Check replica set health
 */
function healthCheck() {
  try {
    const status = rs.status();
    const config = rs.conf();

    print("\n🏥 Replica Set Health Check:");
    print("=".repeat(40));

    // Basic counts
    const totalMembers = status.members.length;
    const healthyMembers = status.members.filter((m) => m.health === 1).length;
    const primaryCount = status.members.filter((m) => m.state === 1).length;

    print(`Total Members: ${totalMembers}`);
    print(`Healthy Members: ${healthyMembers}`);
    print(`Primary Count: ${primaryCount}`);

    // Check for issues
    const issues = [];

    if (primaryCount !== 1) {
      issues.push(`❌ Expected 1 primary, found ${primaryCount}`);
    }

    if (healthyMembers < totalMembers) {
      issues.push(`❌ ${totalMembers - healthyMembers} unhealthy members`);
    }

    // Check replication lag
    const primary = status.members.find((m) => m.state === 1);
    if (primary) {
      const secondaries = status.members.filter((m) => m.state === 2);
      const maxLag = Math.max(
        ...secondaries.map((s) => (primary.optimeDate - s.optimeDate) / 1000)
      );

      if (maxLag > 10) {
        // 10 second threshold
        issues.push(`⚠️ Maximum replication lag: ${maxLag.toFixed(2)}s`);
      }
    }

    if (issues.length === 0) {
      print("✅ Replica set is healthy!");
    } else {
      print("Issues found:");
      issues.forEach((issue) => print(`  ${issue}`));
    }
  } catch (error) {
    print("❌ Error during health check:");
    print(error.message);
  }
}

// ============================================================================
// 6. EXECUTION SECTION
// ============================================================================

print("\n6. EXECUTING REPLICA SET OPERATIONS");
print("-".repeat(50));

try {
  // Check if replica set is already initialized
  const status = checkReplicaSetStatus();

  if (!status) {
    print("🚀 Initializing replica set...");
    initializeReplicaSet();

    // Wait for initialization
    print("⏳ Waiting for replica set to initialize...");
    sleep(5000);
  }

  // Get current configuration
  getReplicaSetConfig();

  // Perform health check
  healthCheck();

  // Monitor replication lag
  monitorReplicationLag();

  // Example of adding a new member (commented out for safety)
  // addReplicaSetMember("mongo-secondary3:27017", 1, 1);

  // Example of configuring specialized members (commented out)
  // configureHiddenMember("mongo-analytics:27017", 0, true);
  // configureDelayedMember("mongo-backup:27017", 3600);

  print("\n✅ Replica set operations completed successfully!");
} catch (error) {
  print("❌ Error during replica set operations:");
  print(error.message);
}

print("\n" + "=".repeat(80));
print("REPLICA SET OPERATIONS COMPLETE");
print("=".repeat(80));
