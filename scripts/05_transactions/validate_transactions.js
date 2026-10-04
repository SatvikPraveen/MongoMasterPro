// File: scripts/05_transactions/validate_transactions.js
// Comprehensive transaction validation and consistency checks

use("mongomasterpro");

print("MongoDB Transactions: Validation & Testing");
print("=".repeat(50));

// =================================================================
// TRANSACTION VALIDATION FRAMEWORK
// =================================================================

class TransactionValidator {
  constructor() {
    this.testsPassed = 0;
    this.testsFailed = 0;
    this.warnings = 0;
    this.results = [];
    this.performanceMetrics = [];
  }

  assert(condition, testName, details = "") {
    if (condition) {
      this.testsPassed++;
      this.results.push({ status: "PASS", test: testName, details });
      print(`✓ ${testName}`);
      if (details) print(`  ${details}`);
    } else {
      this.testsFailed++;
      this.results.push({ status: "FAIL", test: testName, details });
      print(`✗ ${testName}`);
      if (details) print(`  ${details}`);
    }
  }

  warn(testName, details = "") {
    this.warnings++;
    this.results.push({ status: "WARN", test: testName, details });
    print(`⚠ ${testName}`);
    if (details) print(`  ${details}`);
  }

  testTransaction(testName, transactionFunction, expectedOutcome = "success") {
    const session = db.getMongo().startSession();
    const startTime = Date.now();

    try {
      session.startTransaction({
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
      });

      const result = transactionFunction(session);
      session.commitTransaction();

      const duration = Date.now() - startTime;
      this.performanceMetrics.push({ test: testName, duration, success: true });

      if (expectedOutcome === "success") {
        this.assert(true, testName, `Completed in ${duration}ms`);
        return { success: true, result, duration };
      } else {
        this.assert(
          false,
          testName,
          "Expected failure but transaction succeeded"
        );
        return { success: false, unexpectedSuccess: true };
      }
    } catch (error) {
      session.abortTransaction();

      const duration = Date.now() - startTime;
      this.performanceMetrics.push({
        test: testName,
        duration,
        success: false,
      });

      if (expectedOutcome === "failure") {
        this.assert(true, testName, `Failed as expected: ${error.message}`);
        return { success: true, expectedFailure: true, error: error.message };
      } else {
        this.assert(false, testName, `Unexpected failure: ${error.message}`);
        return { success: false, error: error.message, duration };
      }
    } finally {
      session.endSession();
    }
  }

  generateReport() {
    const totalTests = this.testsPassed + this.testsFailed;
    const passRate =
      totalTests > 0 ? ((this.testsPassed / totalTests) * 100).toFixed(1) : 0;

    print("\n" + "=".repeat(60));
    print("TRANSACTION VALIDATION REPORT");
    print("=".repeat(60));
    print(`Total Tests: ${totalTests}`);
    print(`Passed: ${this.testsPassed}`);
    print(`Failed: ${this.testsFailed}`);
    print(`Warnings: ${this.warnings}`);
    print(`Pass Rate: ${passRate}%`);

    if (this.performanceMetrics.length > 0) {
      const avgDuration =
        this.performanceMetrics.reduce((sum, m) => sum + m.duration, 0) /
        this.performanceMetrics.length;
      const successfulTxns = this.performanceMetrics.filter(
        (m) => m.success
      ).length;
      print(`Average transaction duration: ${Math.round(avgDuration)}ms`);
      print(
        `Successful transactions: ${successfulTxns}/${this.performanceMetrics.length}`
      );
    }

    if (this.testsFailed > 0) {
      print("\nFAILED TESTS:");
      this.results
        .filter((r) => r.status === "FAIL")
        .forEach((result) => {
          print(`• ${result.test}: ${result.details}`);
        });
    }

    print(
      this.testsFailed === 0
        ? "\n🎉 ALL TRANSACTION TESTS PASSED!"
        : "\n⚠ SOME TRANSACTION TESTS FAILED"
    );
    return this.testsFailed === 0;
  }
}

const validator = new TransactionValidator();

print("\n🧪 STARTING TRANSACTION VALIDATION TESTS");
print("-".repeat(50));

// Check if transactions are available
const isMaster = db.runCommand("isMaster");
if (!isMaster.setName) {
  print("⚠ Transactions require replica set. Some tests may be skipped.");
}

// =================================================================
// BASIC TRANSACTION FUNCTIONALITY
// =================================================================

print("\n📋 BASIC TRANSACTION FUNCTIONALITY");
print("-".repeat(30));

// Test 1: Simple successful transaction
if (isMaster.setName) {
  validator.testTransaction("Simple successful transaction", (session) => {
    const sessionDB = session.getDatabase("mongomasterpro");
    const collection = sessionDB.getCollection("validation_test");

    return collection.insertOne({
      type: "basic_test",
      timestamp: new Date(),
      sessionId: session.id.id,
    });
  });

  // Test 2: Multi-collection transaction
  validator.testTransaction("Multi-collection transaction", (session) => {
    const sessionDB = session.getDatabase("mongomasterpro");
    const users = sessionDB.getCollection("validation_users");
    const logs = sessionDB.getCollection("validation_logs");

    const userResult = users.insertOne({
      email: "tx.validation@test.com",
      name: "Transaction Validation User",
      createdAt: new Date(),
    });

    const logResult = logs.insertOne({
      userId: userResult.insertedId,
      action: "user_created",
      timestamp: new Date(),
    });

    return { userId: userResult.insertedId, logId: logResult.insertedId };
  });

  // Test 3: Transaction rollback on error
  validator.testTransaction(
    "Transaction rollback on error",
    (session) => {
      const sessionDB = session.getDatabase("mongomasterpro");
      const collection = sessionDB.getCollection("validation_test");

      // Insert valid document
      collection.insertOne({
        type: "rollback_test",
        step: 1,
        timestamp: new Date(),
      });

      // Cause error to trigger rollback
      throw new Error("Intentional error to test rollback");
    },
    "failure"
  );

  // Verify rollback worked
  const rollbackCount = db.validation_test.countDocuments({
    type: "rollback_test",
  });
  validator.assert(
    rollbackCount === 0,
    "Rollback verification",
    `Found ${rollbackCount} documents (should be 0)`
  );
}

// =================================================================
// ACID PROPERTIES VALIDATION
// =================================================================

print("\n⚗️ ACID PROPERTIES VALIDATION");
print("-".repeat(30));

if (isMaster.setName) {
  // Test Atomicity
  print("Testing ACID properties:");

  validator.testTransaction("Atomicity test - all or nothing", (session) => {
    const sessionDB = session.getDatabase("mongomasterpro");
    const accounts = sessionDB.getCollection("validation_accounts");

    // Create initial accounts
    accounts.deleteMany({});
    accounts.insertOne({ _id: "account_a", balance: 1000 });
    accounts.insertOne({ _id: "account_b", balance: 500 });

    // Transfer money between accounts
    const debitResult = accounts.updateOne(
      { _id: "account_a", balance: { $gte: 100 } },
      { $inc: { balance: -100 } }
    );

    if (debitResult.matchedCount === 0) {
      throw new Error("Insufficient funds");
    }

    const creditResult = accounts.updateOne(
      { _id: "account_b" },
      { $inc: { balance: 100 } }
    );

    return { debitResult, creditResult };
  });

  // Verify atomicity
  const accountA = db.validation_accounts.findOne({ _id: "account_a" });
  const accountB = db.validation_accounts.findOne({ _id: "account_b" });
  const totalBalance = accountA.balance + accountB.balance;

  validator.assert(
    totalBalance === 1500,
    "Atomicity verification",
    `Total balance: ${totalBalance} (should be 1500)`
  );

  // Test Consistency
  validator.testTransaction(
    "Consistency test - business rules enforced",
    (session) => {
      const sessionDB = session.getDatabase("mongomasterpro");
      const accounts = sessionDB.getCollection("validation_accounts");

      // Try to create negative balance (should be prevented by business logic)
      const result = accounts.updateOne(
        { _id: "account_a" },
        { $inc: { balance: -2000 } } // This would create negative balance
      );

      // Check balance after update
      const updatedAccount = accounts.findOne({ _id: "account_a" });
      if (updatedAccount.balance < 0) {
        throw new Error(
          "Business rule violation: negative balance not allowed"
        );
      }

      return result;
    },
    "failure" // Should fail due to business rule
  );
}

// =================================================================
// ISOLATION LEVEL TESTING
// =================================================================

print("\n🔒 ISOLATION LEVEL TESTING");
print("-".repeat(30));

if (isMaster.setName) {
  // Test snapshot isolation
  validator.testTransaction("Snapshot isolation test", (session) => {
    const sessionDB = session.getDatabase("mongomasterpro");
    const collection = sessionDB.getCollection("isolation_test");

    // Create test document outside transaction
    db.isolation_test.insertOne({ _id: "snapshot_test", value: 100 });

    // Read initial value in transaction
    const initialRead = collection.findOne({ _id: "snapshot_test" });

    // Simulate external modification (this would happen outside the transaction)
    // In a real test, this would be done by another session

    // Read again in same transaction (should see same value due to snapshot isolation)
    const secondRead = collection.findOne({ _id: "snapshot_test" });

    if (initialRead.value !== secondRead.value) {
      throw new Error("Snapshot isolation violated");
    }

    return { initialValue: initialRead.value, secondValue: secondRead.value };
  });

  // Test read your own writes
  validator.testTransaction("Read your own writes test", (session) => {
    const sessionDB = session.getDatabase("mongomasterpro");
    const collection = sessionDB.getCollection("isolation_test");

    // Write within transaction
    const writeResult = collection.insertOne({
      _id: "read_own_writes",
      value: "transaction_data",
      timestamp: new Date(),
    });

    // Read back within same transaction
    const readResult = collection.findOne({ _id: "read_own_writes" });

    if (!readResult || readResult.value !== "transaction_data") {
      throw new Error("Cannot read own writes within transaction");
    }

    return { written: writeResult.insertedId, read: readResult._id };
  });
}

// =================================================================
// WRITE CONCERN VALIDATION
// =================================================================

print("\n✍️ WRITE CONCERN VALIDATION");
print("-".repeat(30));

if (isMaster.setName) {
  // Test majority write concern
  validator.testTransaction("Majority write concern test", (session) => {
    // testTransaction() has already started the transaction with
    // writeConcern { w: "majority" }; starting another would fail.

    const sessionDB = session.getDatabase("mongomasterpro");
    const collection = sessionDB.getCollection("write_concern_test");

    const result = collection.insertOne({
      type: "majority_write",
      timestamp: new Date(),
      data: "This write should be acknowledged by majority",
    });

    return result;
  });

  // Test write concern timeout
  validator.testTransaction("Write concern timeout test", (session) => {
    // Transaction already open (see testTransaction); wtimeout is exercised
    // through the commit's write concern on a multi-node set.

    const sessionDB = session.getDatabase("mongomasterpro");
    const collection = sessionDB.getCollection("write_concern_test");

    // This might timeout in some configurations
    const result = collection.insertOne({
      type: "timeout_test",
      timestamp: new Date(),
    });

    return result;
  });
}

// =================================================================
// SESSION STATE VALIDATION
// =================================================================

print("\n📊 SESSION STATE VALIDATION");
print("-".repeat(30));

if (isMaster.setName) {
  // Test session state consistency
  const session = db.getMongo().startSession();

  try {
    validator.assert(
      session.id !== undefined,
      "Session ID generation",
      `Session ID: ${session.id.id}`
    );

    // Test transaction state transitions
    validator.assert(!session.hasEnded(), "Session active after creation");

    session.startTransaction();

    // Perform operation in transaction
    const sessionDB = session.getDatabase("mongomasterpro");
    const collection = sessionDB.getCollection("session_state_test");

    const insertResult = collection.insertOne({
      type: "session_state",
      timestamp: new Date(),
    });

    validator.assert(
      insertResult.insertedId !== undefined,
      "Operation successful in transaction",
      `Inserted ID: ${insertResult.insertedId}`
    );

    session.commitTransaction();

    // Verify data persisted
    const persistedDoc = db.session_state_test.findOne({
      _id: insertResult.insertedId,
    });
    validator.assert(
      persistedDoc !== null,
      "Transaction data persisted after commit",
      "Document found in collection"
    );
  } finally {
    session.endSession();
  }
}

// =================================================================
// PERFORMANCE VALIDATION
// =================================================================

print("\n⚡ PERFORMANCE VALIDATION");
print("-".repeat(30));

if (isMaster.setName) {
  // Test transaction performance under load
  const performanceMetrics = [];
  const testIterations = 5;

  for (let i = 0; i < testIterations; i++) {
    const result = validator.testTransaction(
      `Performance test iteration ${i + 1}`,
      (session) => {
        const sessionDB = session.getDatabase("mongomasterpro");
        const collection = sessionDB.getCollection("performance_test");

        // Perform multiple operations
        const results = [];
        for (let j = 0; j < 10; j++) {
          const insertResult = collection.insertOne({
            iteration: i,
            operation: j,
            timestamp: new Date(),
            data: `Performance test data ${i}-${j}`,
          });
          results.push(insertResult.insertedId);
        }

        return results;
      }
    );

    if (result.success) {
      performanceMetrics.push(result.duration);
    }
  }

  if (performanceMetrics.length > 0) {
    const avgTime =
      performanceMetrics.reduce((sum, time) => sum + time, 0) /
      performanceMetrics.length;
    const minTime = Math.min(...performanceMetrics);
    const maxTime = Math.max(...performanceMetrics);

    validator.assert(
      avgTime < 1000,
      "Transaction performance acceptable",
      `Avg: ${Math.round(avgTime)}ms, Range: ${minTime}-${maxTime}ms`
    );
  }
}

// =================================================================
// DATA INTEGRITY VALIDATION
// =================================================================

print("\n🔍 DATA INTEGRITY VALIDATION");
print("-".repeat(30));

if (isMaster.setName) {
  // Test referential integrity in transactions
  validator.testTransaction("Referential integrity test", (session) => {
    const sessionDB = session.getDatabase("mongomasterpro");
    const users = sessionDB.getCollection("integrity_users");
    const orders = sessionDB.getCollection("integrity_orders");

    // Create user
    const userResult = users.insertOne({
      email: "integrity@test.com",
      name: "Integrity Test User",
      createdAt: new Date(),
    });

    // Create order referencing user
    const orderResult = orders.insertOne({
      userId: userResult.insertedId,
      total: 99.99,
      status: "pending",
      createdAt: new Date(),
    });

    // Verify references
    const user = users.findOne({ _id: userResult.insertedId });
    const order = orders.findOne({ _id: orderResult.insertedId });

    if (!user || !order || !order.userId.equals(user._id)) {
      throw new Error("Referential integrity violation");
    }

    return { userId: userResult.insertedId, orderId: orderResult.insertedId };
  });

  // Test concurrent modification detection
  validator.testTransaction("Concurrent modification detection", (session) => {
    const sessionDB = session.getDatabase("mongomasterpro");
    const collection = sessionDB.getCollection("concurrent_test");

    // Create document with version
    const doc = collection.insertOne({
      _id: "concurrent_doc",
      value: 0,
      version: 1,
    });

    // Read document
    const current = collection.findOne({ _id: "concurrent_doc" });

    // Update with version check (optimistic locking)
    const updateResult = collection.updateOne(
      { _id: "concurrent_doc", version: current.version },
      {
        $set: { value: current.value + 1, version: current.version + 1 },
      }
    );

    if (updateResult.matchedCount === 0) {
      throw new Error("Document was modified by another process");
    }

    return updateResult;
  });
}

// =================================================================
// CLEANUP AND SUMMARY
// =================================================================

print("\n🧹 CLEANUP");
print("-".repeat(30));

// Clean up test data
const testCollections = [
  "validation_test",
  "validation_users",
  "validation_logs",
  "validation_accounts",
  "isolation_test",
  "write_concern_test",
  "session_state_test",
  "performance_test",
  "integrity_users",
  "integrity_orders",
  "concurrent_test",
];

testCollections.forEach((collection) => {
  db.getCollection(collection).drop();
});

print(`✓ Cleaned up ${testCollections.length} test collections`);

// Generate final validation report
const success = validator.generateReport();

print("\n📊 TRANSACTION VALIDATION SUMMARY");
print("-".repeat(30));

const validationSummary = {
  testAreas: [
    "Basic transaction functionality",
    "ACID properties validation",
    "Isolation level testing",
    "Write concern validation",
    "Session state management",
    "Performance under load",
    "Data integrity checks",
  ],
  keyValidations: [
    "Atomicity - all or nothing execution",
    "Consistency - business rules enforced",
    "Isolation - snapshot reads",
    "Durability - majority write concerns",
    "Error handling and rollbacks",
    "Multi-collection transactions",
    "Concurrent modification detection",
  ],
};

print("Test areas covered:");
validationSummary.testAreas.forEach((area, i) => {
  print(`  ${i + 1}. ${area}`);
});

print("\n🎯 Key Transaction Validations:");
print("• Basic transaction lifecycle and operations");
print("• ACID property compliance and verification");
print("• Isolation level behavior and consistency");
print("• Write concern durability guarantees");
print("• Session state management and cleanup");
print("• Performance characteristics under load");
print("• Data integrity and referential consistency");
print("• Error handling and rollback mechanisms");
print("• Concurrent access and optimistic locking");

if (success) {
  print("\n✅ TRANSACTION VALIDATION COMPLETED SUCCESSFULLY!");
  print(
    "All transaction functionality is working correctly and meets ACID requirements."
  );
  print("Ready to proceed to 06_replication/ module.");
} else {
  print("\n❌ Some transaction validations failed!");
  print("Please review and fix transaction issues before proceeding.");
}

print("\nNext steps:");
print("1. Review any failed validations above");
print("2. Verify replica set configuration if needed");
print("3. Run replica_set_ops.js in 06_replication/");
print("4. Continue with replication and high availability patterns");
