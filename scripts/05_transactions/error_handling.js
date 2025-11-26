// File: scripts/05_transactions/error_handling.js
// Transaction error handling, retry logic, and rollback mechanisms

use("learning_platform");

print("MongoDB Transactions: Error Handling & Recovery");
print("=" * 50);

// =================================================================
// ERROR CATEGORIES IN TRANSACTIONS
// =================================================================

print("\n🚨 ERROR CATEGORIES IN TRANSACTIONS");
print("-" * 30);

print("Transaction Error Types:");
print("• Transient errors - Can be retried (network issues, write conflicts)");
print(
  "• Non-transient errors - Cannot be retried (validation, permission errors)"
);
print("• Unknown transaction commit result - Requires special handling");
print("• Write conflicts - Optimistic concurrency control failures");

const isMaster = db.runCommand("isMaster");
if (!isMaster.setName) {
  print("⚠ Advanced error handling requires replica set configuration");
}

// =================================================================
// RETRY LOGIC IMPLEMENTATION
// =================================================================

print("\n🔄 RETRY LOGIC IMPLEMENTATION");
print("-" * 30);

class TransactionRetryHandler {
  constructor(maxRetries = 3, initialDelayMs = 100) {
    this.maxRetries = maxRetries;
    this.initialDelayMs = initialDelayMs;
  }

  executeWithRetry(transactionFunction, sessionOptions = {}) {
    let attempt = 0;
    let lastError;

    while (attempt <= this.maxRetries) {
      const session = db.getMongo().startSession(sessionOptions);

      try {
        print(`  Attempt ${attempt + 1}/${this.maxRetries + 1}`);

        const result = this.executeTransaction(session, transactionFunction);
        session.endSession();

        print(`✓ Transaction succeeded on attempt ${attempt + 1}`);
        return { success: true, result, attempts: attempt + 1 };
      } catch (error) {
        session.endSession();
        lastError = error;

        print(`  Attempt ${attempt + 1} failed: ${error.message}`);

        if (!this.isRetryableError(error)) {
          print(`❌ Non-retryable error: ${error.message}`);
          return { success: false, error, attempts: attempt + 1 };
        }

        attempt++;

        if (attempt <= this.maxRetries) {
          const delay = this.calculateBackoffDelay(attempt);
          print(`  Retrying in ${delay}ms...`);
        }
      }
    }

    print(`❌ Transaction failed after ${this.maxRetries + 1} attempts`);
    return { success: false, error: lastError, attempts: this.maxRetries + 1 };
  }

  executeTransaction(session, transactionFunction) {
    session.startTransaction({
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
    });

    try {
      const result = transactionFunction(session);
      session.commitTransaction();
      return result;
    } catch (error) {
      session.abortTransaction();
      throw error;
    }
  }

  isRetryableError(error) {
    const retryableLabels = [
      "TransientTransactionError",
      "UnknownTransactionCommitResult",
    ];

    if (error.errorLabels) {
      return error.errorLabels.some((label) => retryableLabels.includes(label));
    }

    const retryableCodes = [11600, 11602, 10107, 13435, 13436, 189, 91, 262];
    return retryableCodes.includes(error.code);
  }

  calculateBackoffDelay(attempt) {
    const baseDelay = this.initialDelayMs * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * baseDelay;
    return Math.min(baseDelay + jitter, 5000);
  }
}

// Test retry logic with simulated errors
function testRetryLogic() {
  const retryHandler = new TransactionRetryHandler(3, 50);
  let simulatedFailures = 0;

  const transactionFunction = (session) => {
    const sessionDB = session.getDatabase("mongomasterpro");
    const collection = sessionDB.getCollection("retry_test");

    simulatedFailures++;
    if (simulatedFailures <= 2) {
      const error = new Error("Simulated transient error");
      error.errorLabels = ["TransientTransactionError"];
      error.code = 11600;
      throw error;
    }

    const result = collection.insertOne({
      message: "Retry test successful",
      attempt: simulatedFailures,
      timestamp: new Date(),
    });

    return { insertedId: result.insertedId, attempt: simulatedFailures };
  };

  if (isMaster.setName) {
    const result = retryHandler.executeWithRetry(transactionFunction);

    if (result.success) {
      print(`✓ Retry logic test passed after ${result.attempts} attempts`);
    } else {
      print(`❌ Retry logic test failed: ${result.error.message}`);
    }

    db.retry_test.drop();
    return result;
  } else {
    print("⚠ Skipping retry test - replica set required");
    return { success: true, skipped: true };
  }
}

testRetryLogic();

// =================================================================
// WRITE CONFLICT HANDLING
// =================================================================

print("\n⚔️ WRITE CONFLICT HANDLING");
print("-" * 30);

function simulateWriteConflict() {
  if (!isMaster.setName) {
    print("⚠ Skipping write conflict test - replica set required");
    return;
  }

  const testDoc = db.conflict_test.insertOne({
    _id: "shared_resource",
    counter: 0,
    version: 1,
    lastModified: new Date(),
  });

  print(`Created shared resource: ${testDoc.insertedId}`);

  function conflictingTransaction(transactionId, expectedVersion) {
    const session = db.getMongo().startSession();

    try {
      session.startTransaction({
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
      });

      const sessionDB = session.getDatabase("mongomasterpro");
      const collection = sessionDB.getCollection("conflict_test");

      print(`  Transaction ${transactionId}: Starting...`);

      const currentDoc = collection.findOne({ _id: "shared_resource" });
      if (!currentDoc) {
        throw new Error("Document not found");
      }

      print(
        `  Transaction ${transactionId}: Read counter = ${currentDoc.counter}, version = ${currentDoc.version}`
      );

      if (currentDoc.version !== expectedVersion) {
        throw new Error(
          `Version mismatch: expected ${expectedVersion}, got ${currentDoc.version}`
        );
      }

      const updateResult = collection.updateOne(
        { _id: "shared_resource", version: expectedVersion },
        {
          $inc: { counter: 1 },
          $set: {
            version: expectedVersion + 1,
            lastModified: new Date(),
            lastModifiedBy: transactionId,
          },
        }
      );

      if (updateResult.matchedCount === 0) {
        throw new Error(
          "Optimistic lock failed - document was modified by another transaction"
        );
      }

      print(`  Transaction ${transactionId}: Updated successfully`);

      session.commitTransaction();
      print(`✓ Transaction ${transactionId}: Committed`);

      return { success: true, transactionId };
    } catch (error) {
      session.abortTransaction();
      print(`❌ Transaction ${transactionId}: Failed - ${error.message}`);
      return { success: false, transactionId, error: error.message };
    } finally {
      session.endSession();
    }
  }

  const results = [];
  results.push(conflictingTransaction("T1", 1));
  results.push(conflictingTransaction("T2", 1));

  const finalDoc = db.conflict_test.findOne({ _id: "shared_resource" });
  print(`\n✓ Write conflict test completed:`);
  print(`  Final counter: ${finalDoc.counter}`);
  print(`  Final version: ${finalDoc.version}`);
  print(`  Last modified by: ${finalDoc.lastModifiedBy}`);
  print(
    `  Successful transactions: ${results.filter((r) => r.success).length}/2`
  );

  db.conflict_test.drop();
  return results;
}

simulateWriteConflict();

// =================================================================
// COMPREHENSIVE ERROR RECOVERY PATTERNS
// =================================================================

print("\n🛠️ COMPREHENSIVE ERROR RECOVERY PATTERNS");
print("-" * 30);

class TransactionErrorRecovery {
  constructor() {
    this.errorStats = {
      total: 0,
      retryable: 0,
      nonRetryable: 0,
      commitUnknown: 0,
      recovered: 0,
    };
  }

  executeRobustTransaction(transactionLogic, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const maxCommitRetries = options.maxCommitRetries || 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const session = db.getMongo().startSession(options.sessionOptions || {});

      try {
        const result = this.executeTransactionWithCommitRetry(
          session,
          transactionLogic,
          maxCommitRetries
        );

        session.endSession();
        this.errorStats.recovered++;

        return {
          success: true,
          result,
          attempt,
          stats: { ...this.errorStats },
        };
      } catch (error) {
        session.endSession();
        this.errorStats.total++;

        const errorInfo = this.analyzeError(error);
        print(`  Attempt ${attempt}: ${errorInfo.type} - ${error.message}`);

        if (errorInfo.retryable && attempt < maxRetries) {
          this.errorStats.retryable++;
          print(`  Retrying... (attempt ${attempt + 1}/${maxRetries})`);
          continue;
        } else {
          this.errorStats.nonRetryable++;
          return {
            success: false,
            error,
            errorType: errorInfo.type,
            attempt,
            stats: { ...this.errorStats },
          };
        }
      }
    }
  }

  executeTransactionWithCommitRetry(
    session,
    transactionLogic,
    maxCommitRetries
  ) {
    while (true) {
      try {
        session.startTransaction({
          readConcern: { level: "snapshot" },
          writeConcern: { w: "majority" },
        });

        const result = transactionLogic(session);
        this.commitWithRetry(session, maxCommitRetries);

        return result;
      } catch (error) {
        session.abortTransaction();

        if (this.hasErrorLabel(error, "TransientTransactionError")) {
          print(
            `  Retrying transaction due to transient error: ${error.message}`
          );
          continue;
        }

        throw error;
      }
    }
  }

  commitWithRetry(session, maxRetries) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        session.commitTransaction();
        return;
      } catch (error) {
        if (this.hasErrorLabel(error, "UnknownTransactionCommitResult")) {
          this.errorStats.commitUnknown++;

          if (attempt < maxRetries) {
            print(`  Commit attempt ${attempt} unknown result, retrying...`);
            continue;
          }
        }

        throw error;
      }
    }
  }

  analyzeError(error) {
    if (this.hasErrorLabel(error, "TransientTransactionError")) {
      return { type: "Transient", retryable: true };
    }

    if (this.hasErrorLabel(error, "UnknownTransactionCommitResult")) {
      return { type: "Unknown Commit", retryable: true };
    }

    const errorCodeAnalysis = {
      11000: { type: "Duplicate Key", retryable: false },
      121: { type: "Document Validation", retryable: false },
      13: { type: "Unauthorized", retryable: false },
      50: { type: "Exceeded Time Limit", retryable: true },
      112: { type: "Write Conflict", retryable: true },
    };

    if (error.code && errorCodeAnalysis[error.code]) {
      return errorCodeAnalysis[error.code];
    }

    return { type: "Unknown", retryable: false };
  }

  hasErrorLabel(error, label) {
    return error.errorLabels && error.errorLabels.includes(label);
  }
}

// Test comprehensive error recovery
function testErrorRecovery() {
  if (!isMaster.setName) {
    print("⚠ Skipping error recovery test - replica set required");
    return;
  }

  const recovery = new TransactionErrorRecovery();

  const successfulTransaction = (session) => {
    const sessionDB = session.getDatabase("mongomasterpro");
    const collection = sessionDB.getCollection("error_recovery_test");

    return collection.insertOne({
      scenario: "success",
      timestamp: new Date(),
      message: "This should succeed",
    });
  };

  const validationErrorTransaction = (session) => {
    const error = new Error("Document failed validation");
    error.code = 121;
    throw error;
  };

  const testScenarios = [
    { name: "Successful Transaction", logic: successfulTransaction },
    {
      name: "Validation Error (Non-retryable)",
      logic: validationErrorTransaction,
    },
  ];

  testScenarios.forEach((scenario, index) => {
    print(`\nTesting scenario: ${scenario.name}`);

    const result = recovery.executeRobustTransaction(scenario.logic, {
      maxRetries: 3,
      maxCommitRetries: 3,
    });

    if (result.success) {
      print(`✓ Scenario ${index + 1} completed successfully`);
    } else {
      print(`❌ Scenario ${index + 1} failed: ${result.errorType}`);
    }
  });

  const finalStats = recovery.errorStats;
  print(`\n📊 Error Recovery Statistics:`);
  print(`  Total errors encountered: ${finalStats.total}`);
  print(`  Retryable errors: ${finalStats.retryable}`);
  print(`  Non-retryable errors: ${finalStats.nonRetryable}`);
  print(`  Unknown commit results: ${finalStats.commitUnknown}`);
  print(`  Successfully recovered: ${finalStats.recovered}`);

  db.error_recovery_test.drop();
  return finalStats;
}

testErrorRecovery();

// =================================================================
// DEADLOCK PREVENTION STRATEGIES
// =================================================================

print("\n🔒 DEADLOCK PREVENTION STRATEGIES");
print("-" * 30);

print("4. Deadlock prevention and resolution");

function demonstrateDeadlockPrevention() {
  if (!isMaster.setName) {
    print("⚠ Skipping deadlock test - replica set required");
    return;
  }

  // Create test resources
  db.resource_a.insertOne({ _id: "res_a", value: 0, locked: false });
  db.resource_b.insertOne({ _id: "res_b", value: 0, locked: false });

  print("Created test resources for deadlock prevention demo");

  // Strategy 1: Ordered resource acquisition
  function orderedResourceTransaction(transactionId, increment) {
    const session = db.getMongo().startSession();

    try {
      session.startTransaction({
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
      });

      const sessionDB = session.getDatabase("mongomasterpro");

      print(`  Transaction ${transactionId}: Acquiring resources in order...`);

      // Always acquire resources in alphabetical order to prevent deadlock
      const resourceA = sessionDB.getCollection("resource_a");
      const resourceB = sessionDB.getCollection("resource_b");

      // Lock resource A first
      const resultA = resourceA.updateOne(
        { _id: "res_a", locked: false },
        {
          $inc: { value: increment },
          $set: { locked: true, lockedBy: transactionId, lockTime: new Date() },
        }
      );

      if (resultA.matchedCount === 0) {
        throw new Error("Resource A is already locked");
      }

      print(`  Transaction ${transactionId}: Locked resource A`);

      // Then lock resource B
      const resultB = resourceB.updateOne(
        { _id: "res_b", locked: false },
        {
          $inc: { value: increment },
          $set: { locked: true, lockedBy: transactionId, lockTime: new Date() },
        }
      );

      if (resultB.matchedCount === 0) {
        throw new Error("Resource B is already locked");
      }

      print(`  Transaction ${transactionId}: Locked resource B`);

      // Unlock resources
      resourceA.updateOne(
        { _id: "res_a" },
        { $set: { locked: false }, $unset: { lockedBy: "", lockTime: "" } }
      );

      resourceB.updateOne(
        { _id: "res_b" },
        { $set: { locked: false }, $unset: { lockedBy: "", lockTime: "" } }
      );

      session.commitTransaction();
      print(`✓ Transaction ${transactionId}: Completed successfully`);

      return { success: true, transactionId };
    } catch (error) {
      session.abortTransaction();
      print(`❌ Transaction ${transactionId}: Failed - ${error.message}`);
      return { success: false, transactionId, error: error.message };
    } finally {
      session.endSession();
    }
  }

  // Run multiple transactions with ordered resource acquisition
  const results = [];
  results.push(orderedResourceTransaction("T1", 1));
  results.push(orderedResourceTransaction("T2", 2));
  results.push(orderedResourceTransaction("T3", 3));

  // Check final state
  const finalA = db.resource_a.findOne({ _id: "res_a" });
  const finalB = db.resource_b.findOne({ _id: "res_b" });

  print(`\n✓ Deadlock prevention test completed:`);
  print(`  Resource A final value: ${finalA.value}`);
  print(`  Resource B final value: ${finalB.value}`);
  print(
    `  Successful transactions: ${results.filter((r) => r.success).length}/3`
  );

  // Cleanup
  db.resource_a.drop();
  db.resource_b.drop();

  return results;
}

demonstrateDeadlockPrevention();

// =================================================================
// TIMEOUT HANDLING
// =================================================================

print("\n⏱️ TIMEOUT HANDLING");
print("-" * 30);

print("5. Transaction timeout handling");

function demonstrateTimeoutHandling() {
  if (!isMaster.setName) {
    print("⚠ Skipping timeout test - replica set required");
    return;
  }

  const session = db.getMongo().startSession();

  try {
    session.startTransaction({
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
      maxCommitTimeMS: 1000, // Short timeout for demonstration
    });

    const sessionDB = session.getDatabase("mongomasterpro");
    const collection = sessionDB.getCollection("timeout_test");

    print("  Starting transaction with 1 second commit timeout");

    // Perform operations
    const operations = [];
    for (let i = 0; i < 10; i++) {
      const result = collection.insertOne({
        operationId: i,
        timestamp: new Date(),
        data: `Test data ${i}`,
      });
      operations.push(result.insertedId);
    }

    print(`  Completed ${operations.length} operations`);

    // Commit with timeout handling
    session.commitTransaction();
    print("✓ Transaction committed within timeout");

    return { success: true, operations: operations.length };
  } catch (error) {
    session.abortTransaction();

    if (error.code === 262) {
      // ExceededTimeLimit
      print(`⏱️ Transaction timed out: ${error.message}`);
      return { success: false, timedOut: true, error: error.message };
    } else {
      print(`❌ Transaction failed: ${error.message}`);
      return { success: false, timedOut: false, error: error.message };
    }
  } finally {
    session.endSession();
    db.timeout_test.drop();
  }
}

demonstrateTimeoutHandling();

// =================================================================
// CLEANUP AND SUMMARY
// =================================================================

print("\n🧹 CLEANUP");
print("-" * 30);

// Clean up any remaining test data
db.retry_test.drop();
db.conflict_test.drop();
db.error_recovery_test.drop();
db.resource_a.drop();
db.resource_b.drop();
db.timeout_test.drop();

print("✓ Cleaned up all error handling test data");

print("\n📊 ERROR HANDLING & RECOVERY SUMMARY");
print("-" * 30);

const errorHandlingSummary = {
  patternsDemo: [
    "Retry logic",
    "Write conflict resolution",
    "Error recovery",
    "Deadlock prevention",
    "Timeout handling",
  ],
  errorTypes: [
    "Transient errors",
    "Non-transient errors",
    "Unknown commit results",
    "Write conflicts",
    "Validation errors",
  ],
  strategies: [
    "Exponential backoff",
    "Optimistic locking",
    "Ordered resource acquisition",
    "Commit retry logic",
    "Comprehensive error analysis",
  ],
};

print("Error handling patterns demonstrated:");
errorHandlingSummary.patternsDemo.forEach((pattern, i) => {
  print(`  ${i + 1}. ${pattern}`);
});

print("\n🎯 Key Error Handling Concepts:");
print("• Transaction retry logic with exponential backoff");
print("• Write conflict detection and resolution");
print("• Optimistic concurrency control with versioning");
print("• Deadlock prevention through ordered resource acquisition");
print("• Timeout handling and resource cleanup");
print("• Comprehensive error classification and analysis");
print("• Unknown commit result handling");
print("• Transient vs non-transient error differentiation");
print("• Production-ready error recovery patterns");

print("\n✅ Error handling & recovery completed!");
print("Next: Run validate_transactions.js for transaction validation");
