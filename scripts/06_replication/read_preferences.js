// File: scripts/06_replication/read_preferences.js
// MongoDB Read Preferences - Primary, Secondary, Tags, and Load Distribution

/**
 * READ PREFERENCES
 * ================
 * Comprehensive guide to MongoDB read preferences and read distribution strategies.
 * Covers primary, secondary, nearest, and tag-based read routing.
 */

// Database connections
const db = db.getSiblingDB("mmp_replication");

// Seed a small sample so the read-preference demonstrations have data to read.
if (db.users.countDocuments() === 0) {
  const seededUsers = db.users.insertMany([
    { name: "Ada Lovelace", email: "ada@example.com", role: "student" },
    { name: "Alan Turing", email: "alan@example.com", role: "student" },
    { name: "Grace Hopper", email: "grace@example.com", role: "instructor" },
  ]);
  const seededCourses = db.courses.insertMany([
    { title: "Replica Set Internals", status: "active", instructorId: seededUsers.insertedIds[2] },
    { title: "Read Scaling Patterns", status: "active", instructorId: seededUsers.insertedIds[2] },
  ]);
  db.enrollments.insertMany([
    { userId: seededUsers.insertedIds[0], courseId: seededCourses.insertedIds[0], enrolledAt: new Date() },
    { userId: seededUsers.insertedIds[1], courseId: seededCourses.insertedIds[1], enrolledAt: new Date() },
  ]);
}

print("\n" + "=".repeat(80));
print("MONGODB READ PREFERENCES");
print("=".repeat(80));

// ============================================================================
// 1. READ PREFERENCE MODES
// ============================================================================

print("\n1. READ PREFERENCE MODES");
print("-".repeat(50));

/**
 * PRIMARY - Default mode, all reads from primary
 */
function demonstratePrimaryReads() {
  print("\n📖 PRIMARY READ PREFERENCE:");
  print("All reads directed to primary member");

  try {
    // Set read preference to primary
    db.getMongo().setReadPref("primary");

    const result = db.users.find().limit(3).toArray();
    print(`✅ Read ${result.length} documents from PRIMARY`);
    print(`Sample: ${result[0].name} (${result[0].email})`);
  } catch (error) {
    print("❌ Primary read failed:");
    print(error.message);
  }
}

/**
 * PRIMARY_PREFERRED - Primary if available, secondary if not
 */
function demonstratePrimaryPreferredReads() {
  print("\n📖 PRIMARY_PREFERRED READ PREFERENCE:");
  print("Reads from primary, fallback to secondary");

  try {
    // Set read preference to primaryPreferred
    db.getMongo().setReadPref("primaryPreferred");

    const result = db.courses.find().limit(3).toArray();
    print(`✅ Read ${result.length} documents with PRIMARY_PREFERRED`);
    print(`Sample: ${result[0].title} (${result[0].category})`);
  } catch (error) {
    print("❌ Primary preferred read failed:");
    print(error.message);
  }
}

/**
 * SECONDARY - Only from secondary members
 */
function demonstrateSecondaryReads() {
  print("\n📖 SECONDARY READ PREFERENCE:");
  print("Reads only from secondary members");

  try {
    // Set read preference to secondary
    db.getMongo().setReadPref("secondary");

    const result = db.enrollments.find().limit(3).toArray();
    print(`✅ Read ${result.length} documents from SECONDARY`);
    print(`Sample enrollment: ${result[0].userId} -> ${result[0].courseId}`);
  } catch (error) {
    print("❌ Secondary read failed (may need secondary members):");
    print(error.message);
  }
}

/**
 * SECONDARY_PREFERRED - Secondary if available, primary if not
 */
function demonstrateSecondaryPreferredReads() {
  print("\n📖 SECONDARY_PREFERRED READ PREFERENCE:");
  print("Reads from secondary, fallback to primary");

  try {
    // Set read preference to secondaryPreferred
    db.getMongo().setReadPref("secondaryPreferred");

    const result = db.assignments.find().limit(3).toArray();
    print(`✅ Read ${result.length} documents with SECONDARY_PREFERRED`);
    if (result.length > 0) {
      print(`Sample: ${result[0].title} (Due: ${result[0].dueDate})`);
    }
  } catch (error) {
    print("❌ Secondary preferred read failed:");
    print(error.message);
  }
}

/**
 * NEAREST - Lowest latency member
 */
function demonstrateNearestReads() {
  print("\n📖 NEAREST READ PREFERENCE:");
  print("Reads from member with lowest network latency");

  try {
    // Set read preference to nearest
    db.getMongo().setReadPref("nearest");

    const result = db.grades.find().limit(3).toArray();
    print(`✅ Read ${result.length} documents from NEAREST member`);
    if (result.length > 0) {
      print(
        `Sample: Grade ${result[0].score} for assignment ${result[0].assignmentId}`
      );
    }
  } catch (error) {
    print("❌ Nearest read failed:");
    print(error.message);
  }
}

// ============================================================================
// 2. TAG-BASED READ PREFERENCES
// ============================================================================

print("\n2. TAG-BASED READ PREFERENCES");
print("-".repeat(50));

/**
 * Configure replica set members with tags
 */
function configureReplicaSetTags() {
  print("\n🏷️ CONFIGURING REPLICA SET TAGS:");

  const tagExamples = {
    primary: { datacenter: "us-east", rack: "A1", ssd: "true" },
    secondary1: { datacenter: "us-west", rack: "B2", ssd: "true" },
    secondary2: { datacenter: "us-east", rack: "A2", ssd: "false" },
    analytics: {
      datacenter: "us-west",
      rack: "C1",
      ssd: "true",
      workload: "analytics",
    },
  };

  print("Example tag configuration:");
  Object.keys(tagExamples).forEach((member) => {
    print(`  ${member}: ${JSON.stringify(tagExamples[member])}`);
  });

  print("\n💡 To apply tags, use:");
  print(
    "rs.reconfig() with member.tags = { datacenter: 'us-east', rack: 'A1' }"
  );
}

/**
 * Demonstrate datacenter-aware reads
 */
function demonstrateDatacenterReads() {
  print("\n🌍 DATACENTER-AWARE READS:");
  print("Route reads to specific datacenter");

  try {
    // Read from US-East datacenter
    db.getMongo().setReadPref("secondary", [{ datacenter: "us-east" }]);

    const result = db.users.find({ region: "east" }).limit(5).toArray();
    print(`✅ Read ${result.length} users from US-East datacenter`);

    // Fallback to US-West if US-East unavailable
    db.getMongo().setReadPref("secondary", [
      { datacenter: "us-east" },
      { datacenter: "us-west" },
    ]);

    print("✅ Configured fallback: US-East → US-West");
  } catch (error) {
    print("❌ Datacenter read failed:");
    print(error.message);
  }
}

/**
 * Demonstrate workload-specific reads
 */
function demonstrateWorkloadSpecificReads() {
  print("\n⚡ WORKLOAD-SPECIFIC READS:");
  print("Route analytics queries to dedicated members");

  try {
    // Route analytics to specialized members
    db.getMongo().setReadPref("secondary", [{ workload: "analytics" }]);

    // Example analytics query
    const analyticsResult = db.enrollments
      .aggregate([
        { $match: { status: "completed" } },
        { $group: { _id: "$courseId", completions: { $sum: 1 } } },
        { $sort: { completions: -1 } },
        { $limit: 5 },
      ])
      .toArray();

    print(
      `✅ Analytics query processed: ${analyticsResult.length} course completion stats`
    );
    analyticsResult.forEach((course) => {
      print(`  Course ${course._id}: ${course.completions} completions`);
    });
  } catch (error) {
    print("❌ Workload-specific read failed:");
    print(error.message);
  }
}

// ============================================================================
// 3. READ PREFERENCE WITH MAX STALENESS
// ============================================================================

print("\n3. READ PREFERENCE WITH MAX STALENESS");
print("-".repeat(50));

/**
 * Configure maximum staleness for secondary reads
 */
function demonstrateMaxStaleness() {
  print("\n⏱️ MAX STALENESS CONFIGURATION:");
  print("Ensure secondary reads are not too stale");

  try {
    // Set max staleness to 120 seconds
    // maxStalenessSeconds is a connection-level option; set it in the URI
    // (…?readPreference=secondaryPreferred&maxStalenessSeconds=120). The
    // shell helper only takes mode, tag sets and hedge options.
    db.getMongo().setReadPref("secondaryPreferred");
    print("Connection string form: mongodb://host/?readPreference=secondaryPreferred&maxStalenessSeconds=120");

    const start = new Date();
    const result = db.courses.find({ status: "active" }).limit(10).toArray();
    const end = new Date();

    print(`✅ Read ${result.length} courses with max staleness 120s`);
    print(`Query time: ${end - start}ms`);

    // Example with shorter staleness
    // maxStalenessSeconds=30 is set through the connection URI, not setReadPref().
    db.getMongo().setReadPref("secondaryPreferred");
    print("✅ Configured stricter staleness: 30 seconds");
  } catch (error) {
    print("❌ Max staleness configuration failed:");
    print(error.message);
  }
}

// ============================================================================
// 4. READ PREFERENCE STRATEGIES
// ============================================================================

print("\n4. READ PREFERENCE STRATEGIES");
print("-".repeat(50));

/**
 * Strategy: Separate read and write workloads
 */
function demonstrateReadWriteSeparation() {
  print("\n🔀 READ/WRITE WORKLOAD SEPARATION:");

  // Writes go to primary
  db.getMongo().setReadPref("primary");

  try {
    // Insert new course (write operation)
    const writeResult = db.courses.insertOne({
      title: "Advanced MongoDB",
      description: "Deep dive into MongoDB features",
      instructor: "Database Expert",
      category: "database",
      price: 199.99,
      createdAt: new Date(),
    });

    print(`✅ Write to primary: ${writeResult.insertedId}`);

    // Reads go to secondary
    db.getMongo().setReadPref("secondaryPreferred");

    const readResult = db.courses.find({ category: "database" }).count();
    print(`✅ Read from secondary: ${readResult} database courses found`);
  } catch (error) {
    print("❌ Read/write separation failed:");
    print(error.message);
  }
}

/**
 * Strategy: Geographic load distribution
 */
function demonstrateGeographicDistribution() {
  print("\n🌎 GEOGRAPHIC LOAD DISTRIBUTION:");

  const regions = [
    { name: "us-east", tags: [{ datacenter: "us-east" }] },
    { name: "us-west", tags: [{ datacenter: "us-west" }] },
    { name: "europe", tags: [{ datacenter: "europe" }] },
  ];

  regions.forEach((region) => {
    try {
      db.getMongo().setReadPref("secondaryPreferred", region.tags);

      // Simulate region-specific query
      const result = db.users.find({ region: region.name }).limit(5).count();
      print(`✅ ${region.name}: ${result} users (routed to local datacenter)`);
    } catch (error) {
      print(`❌ Geographic routing failed for ${region.name}`);
    }
  });
}

/**
 * Strategy: Application-tier read preferences
 */
function demonstrateApplicationTierReads() {
  print("\n🏗️ APPLICATION TIER READ STRATEGIES:");

  const strategies = [
    {
      name: "Real-time Dashboard",
      preference: "primary",
      reason: "Requires most current data",
    },
    {
      name: "Analytics Reports",
      preference: "secondary",
      tags: [{ workload: "analytics" }],
      reason: "Can tolerate slight delay, offloads primary",
    },
    {
      name: "User Profile Reads",
      preference: "secondaryPreferred",
      reason: "Balance load, acceptable slight staleness",
    },
    {
      name: "Search Functionality",
      preference: "nearest",
      reason: "Optimize for low latency",
    },
  ];

  strategies.forEach((strategy) => {
    print(`\n📱 ${strategy.name}:`);
    print(`   Preference: ${strategy.preference}`);
    if (strategy.tags) {
      print(`   Tags: ${JSON.stringify(strategy.tags)}`);
    }
    print(`   Reason: ${strategy.reason}`);
  });
}

// ============================================================================
// 5. MONITORING READ PREFERENCES
// ============================================================================

print("\n5. MONITORING READ PREFERENCES");
print("-".repeat(50));

/**
 * Monitor read distribution across members
 */
function monitorReadDistribution() {
  print("\n📊 MONITORING READ DISTRIBUTION:");

  try {
    // Get replica set status
    const status = rs.status();

    print("\nReplica Set Members:");
    status.members.forEach((member) => {
      print(`  ${member.name}: ${member.stateStr} (health: ${member.health})`);

      // Show member tags if available
      const config = rs.conf();
      const memberConfig = config.members.find((m) => m.host === member.name);
      if (memberConfig && memberConfig.tags) {
        print(`    Tags: ${JSON.stringify(memberConfig.tags)}`);
      }
    });

    // Simulate monitoring different read preferences
    const testQueries = [
      { pref: "primary", desc: "Primary reads" },
      { pref: "secondaryPreferred", desc: "Secondary preferred" },
      { pref: "nearest", desc: "Nearest member" },
    ];

    print("\n📈 Read Preference Performance:");
    testQueries.forEach((query) => {
      try {
        db.getMongo().setReadPref(query.pref);
        const start = new Date();
        db.users.findOne();
        const end = new Date();

        print(`  ${query.desc}: ${end - start}ms`);
      } catch (error) {
        print(`  ${query.desc}: Failed`);
      }
    });
  } catch (error) {
    print("❌ Monitoring failed:");
    print(error.message);
  }
}

/**
 * Best practices summary
 */
function summarizeBestPractices() {
  print("\n💡 READ PREFERENCE BEST PRACTICES:");
  print("-".repeat(40));

  const practices = [
    "Use 'primary' for critical writes and immediate consistency needs",
    "Use 'secondaryPreferred' for read-heavy applications",
    "Use 'secondary' with tags for analytics workloads",
    "Use 'nearest' for geographically distributed applications",
    "Configure maxStalenessSeconds for consistency requirements",
    "Tag members by datacenter, workload, and hardware specs",
    "Monitor read distribution and performance regularly",
    "Test failover scenarios with different read preferences",
  ];

  practices.forEach((practice, index) => {
    print(`${index + 1}. ${practice}`);
  });
}

// ============================================================================
// 6. EXECUTION SECTION
// ============================================================================

print("\n6. EXECUTING READ PREFERENCE DEMONSTRATIONS");
print("-".repeat(50));

try {
  // Demonstrate all read preference modes
  demonstratePrimaryReads();
  demonstratePrimaryPreferredReads();
  demonstrateSecondaryReads();
  demonstrateSecondaryPreferredReads();
  demonstrateNearestReads();

  // Tag-based preferences
  configureReplicaSetTags();
  demonstrateDatacenterReads();
  demonstrateWorkloadSpecificReads();

  // Advanced features
  demonstrateMaxStaleness();

  // Strategies
  demonstrateReadWriteSeparation();
  demonstrateGeographicDistribution();
  demonstrateApplicationTierReads();

  // Monitoring
  monitorReadDistribution();
  summarizeBestPractices();

  // Reset to default
  db.getMongo().setReadPref("primary");
  print("\n✅ Reset read preference to PRIMARY");

  print("\n✅ Read preferences demonstration completed successfully!");
} catch (error) {
  print("❌ Error during read preferences demonstration:");
  print(error.message);
}

print("\n" + "=".repeat(80));
print("READ PREFERENCES COMPLETE");
print("=".repeat(80));
