// File: scripts/05_transactions/session_management.js
// Session lifecycle, configuration, and advanced session handling

use("mongomasterpro");

print("MongoDB Transactions: Session Management");
print("=" * 50);

// =================================================================
// SESSION LIFECYCLE BASICS
// =================================================================

print("\n🔄 SESSION LIFECYCLE BASICS");
print("-" * 30);

print("Session Lifecycle:");
print("• startSession() - Create new session");
print("• startTransaction() - Begin transaction in session");
print("• commitTransaction() - Commit changes");
print("• abortTransaction() - Rollback changes");
print("• endSession() - Clean up session resources");

// Check replica set status
const isMaster = db.runCommand("isMaster");
if (!isMaster.setName) {
  print(
    "⚠ Sessions work best with replica sets. Limited functionality on standalone."
  );
}

// 1. Basic session lifecycle demonstration
print("\n1. Complete session lifecycle");

function demonstrateSessionLifecycle() {
  print("Creating session...");
  const session = db.getMongo().startSession({
    readConcern: { level: "majority" },
    writeConcern: { w: "majority" },
  });

  print(`✓ Session created: ${session.getSessionId().id}`);

  try {
    // Get session database reference
    const sessionDB = session.getDatabase("mongomasterpro");
    const collection = sessionDB.getCollection("session_test");

    print("Starting transaction...");
    session.startTransaction({
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority", j: true },
    });

    // Perform operations within transaction
    const doc1 = collection.insertOne({
      type: "session_demo",
      data: "First document",
      timestamp: new Date(),
      sessionId: session.getSessionId().id.toString(),
    });

    const doc2 = collection.insertOne({
      type: "session_demo",
      data: "Second document",
      timestamp: new Date(),
      sessionId: session.getSessionId().id.toString(),
    });

    print(`  Inserted documents: ${doc1.insertedId}, ${doc2.insertedId}`);

    // Read within transaction
    const count = collection.countDocuments({ type: "session_demo" });
    print(`  Documents in transaction: ${count}`);

    print("Committing transaction...");
    session.commitTransaction();
    print("✓ Transaction committed successfully");

    return { success: true, sessionId: session.getSessionId().id };
  } catch (error) {
    print(`❌ Error in transaction: ${error.message}`);
    session.abortTransaction();
    return { success: false, error: error.message };
  } finally {
    print("Ending session...");
    session.endSession();
    print("✓ Session ended");
  }
}

const lifecycleResult = demonstrateSessionLifecycle();
if (lifecycleResult.success) {
  print("✓ Session lifecycle completed successfully");
}

// =================================================================
// SESSION CONFIGURATION OPTIONS
// =================================================================

print("\n⚙️ SESSION CONFIGURATION OPTIONS");
print("-" * 30);

print("2. Session configuration options");

// 2.1 Session with custom options
function createConfiguredSessions() {
  const sessionConfigs = [
    {
      name: "Causal Consistency Session",
      options: {
        causalConsistency: true,
        readConcern: { level: "majority" },
        writeConcern: { w: "majority", wtimeout: 1000 },
      },
    },
    {
      name: "Snapshot Session",
      options: {
        causalConsistency: false,
        readConcern: { level: "local" },
        writeConcern: { w: 1 },
      },
    },
    {
      name: "Strong Consistency Session",
      options: {
        causalConsistency: true,
        readConcern: { level: "linearizable" },
        writeConcern: { w: "majority", j: true },
      },
    },
  ];

  sessionConfigs.forEach((config) => {
    try {
      const session = db.getMongo().startSession(config.options);
      print(`✓ ${config.name} created`);
      print(`  Session ID: ${session.getSessionId().id}`);
      print(`  Causal consistency: ${config.options.causalConsistency}`);
      print(`  Read concern: ${config.options.readConcern.level}`);

      // Test basic operation
      const sessionDB = session.getDatabase("mongomasterpro");
      const result = sessionDB
        .getCollection("users")
        .findOne({ role: "admin" });

      if (result) {
        print(
          `  Test read successful: Found ${result.firstName} ${result.lastName}`
        );
      }

      session.endSession();
    } catch (error) {
      print(`❌ ${config.name} failed: ${error.message}`);
    }
  });
}

createConfiguredSessions();

// =================================================================
// CONCURRENT SESSION MANAGEMENT
// =================================================================

print("\n🔀 CONCURRENT SESSION MANAGEMENT");
print("-" * 30);

print("3. Managing multiple concurrent sessions");

function simulateConcurrentSessions() {
  const sessions = [];
  const sessionCount = 3;

  try {
    // Create multiple sessions
    for (let i = 0; i < sessionCount; i++) {
      const session = db.getMongo().startSession({
        causalConsistency: true,
      });
      sessions.push({
        id: i,
        session: session,
        sessionId: session.getSessionId().id,
      });
      print(`✓ Session ${i} created: ${session.getSessionId().id}`);
    }

    // Perform operations concurrently
    const results = [];

    sessions.forEach((sessionInfo) => {
      try {
        const sessionDB = sessionInfo.session.getDatabase("mongomasterpro");
        const collection = sessionDB.getCollection("concurrent_test");

        sessionInfo.session.startTransaction();

        // Each session inserts different data
        const insertResult = collection.insertOne({
          sessionId: sessionInfo.id,
          sessionUuid: sessionInfo.sessionId.toString(),
          operation: "concurrent_insert",
          timestamp: new Date(),
          data: `Data from session ${sessionInfo.id}`,
        });

        // Update a shared counter
        const counterResult = collection.updateOne(
          { _id: "global_counter" },
          {
            $inc: { count: 1 },
            $set: { lastUpdatedBy: sessionInfo.id, lastUpdated: new Date() },
          },
          { upsert: true }
        );

        sessionInfo.session.commitTransaction();

        results.push({
          sessionId: sessionInfo.id,
          success: true,
          insertedId: insertResult.insertedId,
          counterUpdate:
            counterResult.modifiedCount || counterResult.upsertedCount,
        });

        print(`  Session ${sessionInfo.id} committed successfully`);
      } catch (error) {
        sessionInfo.session.abortTransaction();
        results.push({
          sessionId: sessionInfo.id,
          success: false,
          error: error.message,
        });
        print(`  Session ${sessionInfo.id} failed: ${error.message}`);
      }
    });

    // Verify final state
    const finalCounter = db.concurrent_test.findOne({ _id: "global_counter" });
    const totalInserts = db.concurrent_test.countDocuments({
      operation: "concurrent_insert",
    });

    print(`✓ Concurrent sessions completed:`);
    print(`  Final counter value: ${finalCounter?.count || 0}`);
    print(`  Total inserts: ${totalInserts}`);
    print(
      `  Successful sessions: ${
        results.filter((r) => r.success).length
      }/${sessionCount}`
    );

    return results;
  } finally {
    // Clean up all sessions
    sessions.forEach((sessionInfo) => {
      sessionInfo.session.endSession();
    });
    print(`✓ Cleaned up ${sessions.length} sessions`);

    // Clean up test data
    db.concurrent_test.drop();
  }
}

simulateConcurrentSessions();

// =================================================================
// SESSION TIMEOUT AND EXPIRATION
// =================================================================

print("\n⏰ SESSION TIMEOUT AND EXPIRATION");
print("-" * 30);

print("4. Session timeout handling");

function demonstrateSessionTimeout() {
  const session = db.getMongo().startSession();

  try {
    print(`Created session: ${session.getSessionId().id}`);

    // Check initial session info
    const initialServerStatus = db.runCommand({ serverStatus: 1 });
    const activeSessions =
      initialServerStatus.logicalSessionRecordCache?.activeSessionsCount || 0;
    print(`  Active sessions on server: ${activeSessions}`);

    const sessionDB = session.getDatabase("mongomasterpro");
    const collection = sessionDB.getCollection("timeout_test");

    session.startTransaction();

    // Perform operation
    const insertResult = collection.insertOne({
      message: "Testing session timeout",
      timestamp: new Date(),
    });

    print(`  Inserted document: ${insertResult.insertedId}`);

    // In a real scenario, you might simulate a long-running operation
    // For demonstration, we'll just commit quickly
    print("  Simulating processing time...");

    // Check if session is still active
    try {
      const testRead = collection.findOne({ _id: insertResult.insertedId });
      if (testRead) {
        print("  Session still active during transaction");
      }
    } catch (error) {
      print(`  Session timeout during transaction: ${error.message}`);
      throw error;
    }

    session.commitTransaction();
    print("✓ Transaction completed before timeout");

    return { success: true };
  } catch (error) {
    session.abortTransaction();
    print(`❌ Session timeout handling: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    session.endSession();
    db.timeout_test.drop();
  }
}

demonstrateSessionTimeout();

// =================================================================
// SESSION POOLING SIMULATION
// =================================================================

print("\n🏊‍♂️ SESSION POOLING SIMULATION");
print("-" * 30);

print("5. Session pooling patterns");

class SessionPool {
  constructor(maxSessions = 5) {
    this.maxSessions = maxSessions;
    this.availableSessions = [];
    this.inUseSessions = new Map();
    this.sessionCount = 0;

    print(`✓ Session pool initialized (max: ${maxSessions})`);
  }

  getSession() {
    // Reuse available session if possible
    if (this.availableSessions.length > 0) {
      const session = this.availableSessions.pop();
      this.inUseSessions.set(session.id, session);
      print(`  Reused session from pool: ${session.id}`);
      return session;
    }

    // Create new session if under limit
    if (this.sessionCount < this.maxSessions) {
      const mongoSession = db.getMongo().startSession();
      const sessionWrapper = {
        id: mongoSession.getSessionId().id.toString(),
        session: mongoSession,
        createdAt: new Date(),
        useCount: 0,
      };

      this.inUseSessions.set(sessionWrapper.id, sessionWrapper);
      this.sessionCount++;

      print(
        `  Created new session: ${sessionWrapper.id} (${this.sessionCount}/${this.maxSessions})`
      );
      return sessionWrapper;
    }

    throw new Error("Session pool exhausted");
  }

  returnSession(sessionWrapper) {
    if (this.inUseSessions.has(sessionWrapper.id)) {
      this.inUseSessions.delete(sessionWrapper.id);
      sessionWrapper.useCount++;

      // Return to pool if session is still healthy
      if (sessionWrapper.useCount < 10) {
        // Arbitrary limit
        this.availableSessions.push(sessionWrapper);
        print(
          `  Returned session to pool: ${sessionWrapper.id} (uses: ${sessionWrapper.useCount})`
        );
      } else {
        // Retire overused session
        sessionWrapper.session.endSession();
        this.sessionCount--;
        print(`  Retired overused session: ${sessionWrapper.id}`);
      }
    }
  }

  closeAll() {
    // Close all sessions
    [...this.availableSessions, ...this.inUseSessions.values()].forEach(
      (sessionWrapper) => {
        sessionWrapper.session.endSession();
      }
    );

    print(`✓ Closed all ${this.sessionCount} sessions in pool`);
    this.availableSessions = [];
    this.inUseSessions.clear();
    this.sessionCount = 0;
  }

  getStats() {
    return {
      maxSessions: this.maxSessions,
      totalSessions: this.sessionCount,
      availableSessions: this.availableSessions.length,
      inUseSessions: this.inUseSessions.size,
    };
  }
}

// Test session pooling
function testSessionPool() {
  const pool = new SessionPool(3);

  try {
    const operations = [];

    // Simulate multiple operations requesting sessions
    for (let i = 0; i < 5; i++) {
      try {
        const sessionWrapper = pool.getSession();
        const sessionDB = sessionWrapper.session.getDatabase("mongomasterpro");
        const collection = sessionDB.getCollection("pool_test");

        // Perform operation
        sessionWrapper.session.startTransaction();
        const insertResult = collection.insertOne({
          operationId: i,
          sessionId: sessionWrapper.id,
          timestamp: new Date(),
        });

        sessionWrapper.session.commitTransaction();

        operations.push({
          operationId: i,
          sessionId: sessionWrapper.id,
          success: true,
        });

        // Return session to pool
        pool.returnSession(sessionWrapper);
      } catch (error) {
        print(`  Operation ${i} failed: ${error.message}`);
        operations.push({
          operationId: i,
          success: false,
          error: error.message,
        });
      }
    }

    const stats = pool.getStats();
    print(`✓ Session pool test completed:`);
    print(
      `  Operations completed: ${
        operations.filter((op) => op.success).length
      }/5`
    );
    print(`  Sessions created: ${stats.totalSessions}`);
    print(`  Sessions available: ${stats.availableSessions}`);
    print(`  Sessions in use: ${stats.inUseSessions}`);

    return operations;
  } finally {
    pool.closeAll();
    db.pool_test.drop();
  }
}

testSessionPool();

// =================================================================
// SESSION ERROR HANDLING PATTERNS
// =================================================================

print("\n🚨 SESSION ERROR HANDLING PATTERNS");
print("-" * 30);

print("6. Advanced session error handling");

function demonstrateSessionErrorHandling() {
  const session = db.getMongo().startSession();

  try {
    const sessionDB = session.getDatabase("mongomasterpro");
    const collection = sessionDB.getCollection("error_handling_test");

    session.startTransaction({
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
      maxCommitTimeMS: 1000,
    });

    // Perform operations that might fail
    const operations = [
      {
        name: "Valid insert",
        operation: () =>
          collection.insertOne({
            type: "valid",
            data: "This should work",
            timestamp: new Date(),
          }),
      },
      {
        name: "Duplicate key test",
        operation: () => {
          // Insert same document twice to test error handling
          collection.insertOne({ _id: "duplicate_test", data: "first" });
          collection.insertOne({ _id: "duplicate_test", data: "second" }); // Will fail
        },
      },
    ];

    let successCount = 0;
    let errorCount = 0;

    for (let op of operations) {
      try {
        const result = op.operation();
        print(`✓ ${op.name} succeeded`);
        successCount++;
      } catch (opError) {
        print(`⚠ ${op.name} failed: ${opError.message}`);
        errorCount++;

        // For some errors, we might want to abort the entire transaction
        if (opError.code === 11000) {
          // Duplicate key error
          print("  Duplicate key error detected - aborting transaction");
          throw opError;
        }
      }
    }

    // Only commit if all critical operations succeeded
    if (errorCount === 0) {
      session.commitTransaction();
      print("✓ Transaction committed - all operations successful");
      return { success: true, operations: successCount };
    } else {
      throw new Error(`${errorCount} operations failed`);
    }
  } catch (error) {
    print(`❌ Transaction failed: ${error.message}`);

    try {
      session.abortTransaction();
      print("✓ Transaction aborted successfully");
    } catch (abortError) {
      print(`❌ Failed to abort transaction: ${abortError.message}`);
    }

    return { success: false, error: error.message };
  } finally {
    try {
      session.endSession();
      print("✓ Session ended cleanly");
    } catch (endError) {
      print(`⚠ Error ending session: ${endError.message}`);
    }

    // Cleanup
    db.error_handling_test.drop();
  }
}

demonstrateSessionErrorHandling();

// =================================================================
// SESSION MONITORING AND DIAGNOSTICS
// =================================================================

print("\n📊 SESSION MONITORING AND DIAGNOSTICS");
print("-" * 30);

print("7. Session monitoring and diagnostics");

function monitorSessions() {
  try {
    // Get current server status
    const serverStatus = db.runCommand({ serverStatus: 1 });

    if (serverStatus.logicalSessionRecordCache) {
      const sessionCache = serverStatus.logicalSessionRecordCache;

      print("✓ Session cache statistics:");
      print(`  Active sessions: ${sessionCache.activeSessionsCount || 0}`);
      print(
        `  Sessions collected: ${sessionCache.sessionsCollectedCount || 0}`
      );
      print(
        `  Last session collection: ${
          sessionCache.lastSessionsCollectionDate || "N/A"
        }`
      );
    }

    // List current operations with sessions
    const currentOp = db.runCommand({ currentOp: 1, $all: true });
    const sessionsInUse = currentOp.inprog.filter((op) => op.lsid).length;

    print(`  Operations with sessions: ${sessionsInUse}`);

    // Get session information (if available)
    try {
      const sessions = db.runCommand({ listSessions: 1 });
      if (sessions.ok) {
        print(`  Total tracked sessions: ${sessions.sessions?.length || 0}`);
      }
    } catch (listError) {
      print("  Session listing not available");
    }
  } catch (error) {
    print(`⚠ Session monitoring failed: ${error.message}`);
  }
}

monitorSessions();

// =================================================================
// CLEANUP AND SUMMARY
// =================================================================

print("\n🧹 CLEANUP");
print("-" * 30);

// Clean up any remaining test data
db.session_test.drop();
print("✓ Cleaned up session test data");

print("\n📊 SESSION MANAGEMENT SUMMARY");
print("-" * 30);

const sessionSummary = {
  conceptsDemo: [
    "Session lifecycle",
    "Configuration options",
    "Concurrent sessions",
    "Session pooling",
    "Error handling",
    "Monitoring",
  ],
  keyFeatures: [
    "Causal consistency",
    "Read/write concerns",
    "Timeout handling",
    "Resource management",
    "Connection pooling",
  ],
  bestPractices: [
    "Proper session cleanup",
    "Error handling patterns",
    "Resource pooling",
    "Timeout management",
    "Monitoring",
  ],
};

print("Session management concepts demonstrated:");
sessionSummary.conceptsDemo.forEach((concept, i) => {
  print(`  ${i + 1}. ${concept}`);
});

print("\n🎯 Key Session Management Concepts:");
print("• Session lifecycle and resource management");
print("• Configuration options for consistency levels");
print("• Concurrent session handling and coordination");
print("• Session pooling for performance optimization");
print("• Comprehensive error handling and recovery");
print("• Timeout management and expiration handling");
print("• Session monitoring and diagnostic techniques");
print("• Best practices for production applications");

print("\n✅ Session management completed!");
print("Next: Run error_handling.js for transaction error recovery patterns");
