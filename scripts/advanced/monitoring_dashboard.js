// File: scripts/advanced/monitoring_dashboard.js
// MongoDB Monitoring Dashboard - Real-time system metrics and KPIs

use("mongomasterpro");

print("\n" + "=".repeat(80));
print("MONGODB MONITORING DASHBOARD");
print("=".repeat(80));

// ============================================================================
// 1. SYSTEM HEALTH CHECK
// ============================================================================

print("\n1. SYSTEM HEALTH CHECK");
print("-".repeat(50));

// Server status
const serverStatus = db.adminCommand("serverStatus");
print("\n📊 Server Status:");
print(`  • Uptime: ${serverStatus.uptime} seconds`);
print(`  • Connections: ${serverStatus.connections.current}/${serverStatus.connections.available}`);
print(`  • Operations: ${serverStatus.opcounters.insert + serverStatus.opcounters.query + serverStatus.opcounters.update + serverStatus.opcounters.delete} total`);

// Memory usage
print("\n💾 Memory Usage:");
print(`  • Resident Memory: ${serverStatus.mem.resident} MB`);
print(`  • Virtual Memory: ${serverStatus.mem.virtual} MB`);
print(`  • Mapped Memory: ${serverStatus.mem.mapped} MB`);

// ============================================================================
// 2. DATABASE STATISTICS
// ============================================================================

print("\n2. DATABASE STATISTICS");
print("-".repeat(50));

const dbStats = db.stats();
print(`\n📈 Database: learning_platform`);
print(`  • Collections: ${dbStats.collections}`);
print(`  • Data Size: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`);
print(`  • Storage Size: ${(dbStats.storageSize / 1024 / 1024).toFixed(2)} MB`);
print(`  • Indexes: ${dbStats.indexes}`);

// ============================================================================
// 3. COLLECTION METRICS
// ============================================================================

print("\n3. COLLECTION METRICS");
print("-".repeat(50));

const collections = ["users", "courses", "enrollments", "reviews", "categories", "analytics_events"];

collections.forEach((collName) => {
  try {
    const stats = db[collName].stats();
    print(`\n📋 ${collName}:`);
    print(`  • Documents: ${stats.count}`);
    print(`  • Size: ${(stats.size / 1024).toFixed(2)} KB`);
    print(`  • Avg Doc Size: ${(stats.avgObjSize).toFixed(2)} bytes`);
    print(`  • Indexes: ${stats.nindexes}`);
  } catch (e) {
    print(`⚠️ Error retrieving stats for ${collName}: ${e.message}`);
  }
});

// ============================================================================
// 4. INDEX PERFORMANCE
// ============================================================================

print("\n4. INDEX PERFORMANCE ANALYSIS");
print("-".repeat(50));

print("\n📊 Index Usage:");
collections.forEach((collName) => {
  try {
    const stats = db[collName].aggregate([
      { $indexStats: {} }
    ]).toArray();
    
    print(`\n${collName} indexes:`);
    stats.forEach((stat) => {
      print(`  • ${stat.name}: ${stat.accesses.ops} accesses`);
    });
  } catch (e) {
    // $indexStats not available in all versions
  }
});

// ============================================================================
// 5. ACTIVE CONNECTIONS
// ============================================================================

print("\n5. ACTIVE CONNECTIONS");
print("-".repeat(50));

try {
  const currentOp = db.currentOp();
  print(`\nActive Operations: ${currentOp.inprog.length}`);
  currentOp.inprog.slice(0, 5).forEach((op) => {
    print(`  • Operation: ${op.op} on ${op.ns}`);
    print(`    Seconds running: ${op.secs_running}`);
  });
} catch (e) {
  print(`⚠️ Could not retrieve current operations: ${e.message}`);
}

// ============================================================================
// 6. SLOW QUERY LOG
// ============================================================================

print("\n6. SLOW QUERY ANALYSIS");
print("-".repeat(50));

try {
  const profiler = db.system.profile.find({
    millis: { $gt: 100 }
  }).sort({ ts: -1 }).limit(5).toArray();
  
  print(`\nRecent slow queries (>100ms):`);
  if (profiler.length === 0) {
    print("  ✓ No slow queries detected!");
  } else {
    profiler.forEach((query, index) => {
      print(`  ${index + 1}. ${query.op} - ${query.millis}ms`);
      print(`     Query: ${JSON.stringify(query.command).substring(0, 60)}...`);
    });
  }
} catch (e) {
  print(`⚠️ Profiler not enabled or data unavailable`);
}

// ============================================================================
// 7. REPLICATION STATUS (if applicable)
// ============================================================================

print("\n7. REPLICATION STATUS");
print("-".repeat(50));

try {
  const replStatus = db.adminCommand("replSetGetStatus");
  print(`\n🔄 Replica Set: ${replStatus.set}`);
  print(`  • Status: ${replStatus.myState === 1 ? "PRIMARY" : replStatus.myState === 2 ? "SECONDARY" : "OTHER"}`);
  print(`  • Members: ${replStatus.members.length}`);
  
  replStatus.members.forEach((member) => {
    const status = member.state === 1 ? "PRIMARY" : member.state === 2 ? "SECONDARY" : "OTHER";
    print(`    - ${member.name}: ${status}`);
  });
} catch (e) {
  print(`⚠️ Not running as replica set`);
}

// ============================================================================
// 8. RECOMMENDATION ENGINE
// ============================================================================

print("\n8. RECOMMENDATIONS");
print("-".repeat(50));

const recommendations = [];

// Check connection usage
if (serverStatus.connections.current / serverStatus.connections.available > 0.8) {
  recommendations.push("⚠️ Connection pool usage is high (>80%)");
}

// Check memory usage
if (serverStatus.mem.resident > 3000) {
  recommendations.push("⚠️ Memory usage is high (>3GB)");
}

// Check for missing indexes
try {
  collections.forEach((collName) => {
    const col = db[collName];
    if (col.countDocuments() > 1000 && col.stats().nindexes < 3) {
      recommendations.push(`⚠️ ${collName} may benefit from additional indexes`);
    }
  });
} catch (e) {
  // Ignore
}

if (recommendations.length === 0) {
  print("\n✓ System is running optimally!");
} else {
  print("\nSuggested Actions:");
  recommendations.forEach((rec) => print(`  ${rec}`));
}

// ============================================================================
// 9. SUMMARY REPORT
// ============================================================================

print("\n" + "=".repeat(80));
print("DASHBOARD SUMMARY");
print("=".repeat(80));

const summary = {
  timestamp: new Date(),
  databases: 1,
  collections: collections.length,
  total_documents: collections.reduce((sum, col) => {
    try {
      return sum + db[col].countDocuments();
    } catch (e) {
      return sum;
    }
  }, 0),
  total_connections: serverStatus.connections.current,
  uptime_hours: (serverStatus.uptime / 3600).toFixed(2),
  memory_mb: serverStatus.mem.resident,
  status: "HEALTHY"
};

print("\n📊 Summary:");
Object.keys(summary).forEach((key) => {
  print(`  • ${key}: ${summary[key]}`);
});

print("\n✅ Monitoring dashboard complete!");
print("🔄 To set up continuous monitoring, run this script periodically:");
print("   mongosh learning_platform < scripts/advanced/monitoring_dashboard.js");

