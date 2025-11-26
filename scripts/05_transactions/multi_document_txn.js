// File: scripts/05_transactions/multi_document_txn.js
// ACID multi-document transactions for data consistency

use("learning_platform");

print("MongoDB Transactions: Multi-Document ACID Operations");
print("=" * 50);

// =================================================================
// TRANSACTION PREREQUISITES
// =================================================================

print("\n⚙️ TRANSACTION PREREQUISITES");
print("-" * 30);

print("Transaction Requirements:");
print("• MongoDB 4.0+ for replica sets");
print("• MongoDB 4.2+ for sharded clusters");
print("• Replica set or sharded cluster deployment");
print("• Cannot use on standalone MongoDB instance");

// Check if we're in a replica set environment
const isMaster = db.runCommand("isMaster");
print(`Replica set: ${isMaster.setName || "Not configured"}`);

if (!isMaster.setName) {
  print(
    "⚠ Transactions require replica set. Some examples may not work on standalone."
  );
} else {
  print("✓ Replica set detected - transactions available");
}

// =================================================================
// BASIC TRANSACTION STRUCTURE
// =================================================================

print("\n📝 BASIC TRANSACTION STRUCTURE");
print("-" * 30);

print("1. Basic transaction pattern");

function basicTransactionExample() {
  const session = db.getMongo().startSession();

  try {
    session.startTransaction();

    // Transactional operations
    const usersCollection = session
      .getDatabase("mongomasterpro")
      .getCollection("users");
    const enrollmentsCollection = session
      .getDatabase("mongomasterpro")
      .getCollection("enrollments");

    // Operation 1: Create new student
    const newStudentResult = usersCollection.insertOne({
      email: "tx.student@example.com",
      firstName: "Transaction",
      lastName: "Student",
      role: "student",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    print(`  Created student: ${newStudentResult.insertedId}`);

    // Operation 2: Create enrollment for the student
    const sampleCourse = db.courses.findOne({ status: "active" });
    if (sampleCourse) {
      const enrollmentResult = enrollmentsCollection.insertOne({
        studentId: newStudentResult.insertedId,
        courseId: sampleCourse._id,
        status: "enrolled",
        progress: 0,
        enrolledAt: new Date(),
      });

      print(`  Created enrollment: ${enrollmentResult.insertedId}`);
    }

    // Commit transaction
    session.commitTransaction();
    print("✓ Transaction committed successfully");

    return { success: true, studentId: newStudentResult.insertedId };
  } catch (error) {
    session.abortTransaction();
    print(`❌ Transaction aborted: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    session.endSession();
  }
}

if (isMaster.setName) {
  const basicResult = basicTransactionExample();
  if (basicResult.success) {
    print("✓ Basic transaction pattern demonstrated");
  }
} else {
  print("⚠ Skipping transaction examples - replica set required");
}

// =================================================================
// ENROLLMENT TRANSACTION PATTERN
// =================================================================

print("\n🎓 ENROLLMENT TRANSACTION PATTERN");
print("-" * 30);

print("2. Complete enrollment transaction with validation");

function enrollStudentTransaction(studentId, courseId) {
  const session = db.getMongo().startSession();

  try {
    session.startTransaction({
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
    });

    const db_session = session.getDatabase("mongomasterpro");
    const users = db_session.getCollection("users");
    const courses = db_session.getCollection("courses");
    const enrollments = db_session.getCollection("enrollments");

    // Step 1: Validate student exists and is active
    const student = users.findOne({ _id: studentId, isActive: true });
    if (!student) {
      throw new Error("Student not found or inactive");
    }

    // Step 2: Validate course exists and has capacity
    const course = courses.findOne({ _id: courseId, status: "active" });
    if (!course) {
      throw new Error("Course not found or inactive");
    }

    // Step 3: Check if already enrolled
    const existingEnrollment = enrollments.findOne({
      studentId: studentId,
      courseId: courseId,
    });
    if (existingEnrollment) {
      throw new Error("Student already enrolled in this course");
    }

    // Step 4: Check course capacity
    const currentEnrollments = enrollments.countDocuments({
      courseId: courseId,
      status: { $in: ["enrolled", "completed"] },
    });

    if (currentEnrollments >= course.maxStudents) {
      throw new Error("Course is at maximum capacity");
    }

    // Step 5: Create enrollment
    const enrollmentData = {
      studentId: studentId,
      courseId: courseId,
      status: "enrolled",
      progress: 0,
      enrolledAt: new Date(),
      createdAt: new Date(),
    };

    const enrollmentResult = enrollments.insertOne(enrollmentData);

    // Step 6: Update course enrollment count (denormalized for performance)
    courses.updateOne(
      { _id: courseId },
      {
        $inc: { currentEnrollments: 1 },
        $set: { updatedAt: new Date() },
      }
    );

    // Step 7: Update student enrollment count
    users.updateOne(
      { _id: studentId },
      {
        $inc: { totalEnrollments: 1 },
        $set: { updatedAt: new Date() },
      }
    );

    // Step 8: Log the enrollment action
    db_session.getCollection("enrollment_log").insertOne({
      action: "enroll",
      studentId: studentId,
      courseId: courseId,
      enrollmentId: enrollmentResult.insertedId,
      timestamp: new Date(),
      details: {
        studentName: `${student.firstName} ${student.lastName}`,
        courseName: course.title,
        currentCapacity: currentEnrollments + 1,
        maxCapacity: course.maxStudents,
      },
    });

    session.commitTransaction();

    return {
      success: true,
      enrollmentId: enrollmentResult.insertedId,
      message: `Successfully enrolled ${student.firstName} ${student.lastName} in ${course.title}`,
    };
  } catch (error) {
    session.abortTransaction();
    return {
      success: false,
      error: error.message,
    };
  } finally {
    session.endSession();
  }
}

// Test enrollment transaction
if (isMaster.setName) {
  const testStudent = db.users.findOne({ role: "student", isActive: true });
  const testCourse = db.courses.findOne({ status: "active" });

  if (testStudent && testCourse) {
    const enrollResult = enrollStudentTransaction(
      testStudent._id,
      testCourse._id
    );
    if (enrollResult.success) {
      print(`✓ ${enrollResult.message}`);
    } else {
      print(`⚠ Enrollment failed: ${enrollResult.error}`);
    }
  }
}

// =================================================================
// FINANCIAL TRANSACTION PATTERN
// =================================================================

print("\n💰 FINANCIAL TRANSACTION PATTERN");
print("-" * 30);

print("3. Payment processing transaction");

function processPaymentTransaction(orderId, paymentAmount, paymentMethod) {
  const session = db.getMongo().startSession();

  try {
    session.startTransaction({
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority", j: true },
    });

    const db_session = session.getDatabase("mongomasterpro");
    const orders = db_session.getCollection("orders");
    const payments = db_session.getCollection("payments");
    const users = db_session.getCollection("users");

    // Step 1: Validate order exists and is pending payment
    const order = orders.findOne({
      _id: ObjectId(orderId),
      status: "pending_payment",
    });

    if (!order) {
      throw new Error("Order not found or not pending payment");
    }

    // Step 2: Validate payment amount matches order total
    if (paymentAmount !== order.total) {
      throw new Error(
        `Payment amount ${paymentAmount} does not match order total ${order.total}`
      );
    }

    // Step 3: Create payment record
    const paymentData = {
      orderId: ObjectId(orderId),
      customerId: order.customerId,
      amount: paymentAmount,
      method: paymentMethod,
      status: "processing",
      transactionId: `txn_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      createdAt: new Date(),
    };

    const paymentResult = payments.insertOne(paymentData);

    // Step 4: Simulate payment processing (in real world, call payment gateway)
    const paymentSuccess = Math.random() > 0.1; // 90% success rate

    if (!paymentSuccess) {
      // Update payment status to failed
      payments.updateOne(
        { _id: paymentResult.insertedId },
        {
          $set: {
            status: "failed",
            failureReason: "Payment gateway declined",
            updatedAt: new Date(),
          },
        }
      );
      throw new Error("Payment was declined by payment gateway");
    }

    // Step 5: Update payment status to completed
    payments.updateOne(
      { _id: paymentResult.insertedId },
      {
        $set: {
          status: "completed",
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    // Step 6: Update order status to paid
    orders.updateOne(
      { _id: ObjectId(orderId) },
      {
        $set: {
          status: "paid",
          paidAt: new Date(),
          paymentId: paymentResult.insertedId,
          updatedAt: new Date(),
        },
      }
    );

    // Step 7: Update customer's total spent (denormalized analytics)
    users.updateOne(
      { _id: order.customerId },
      {
        $inc: {
          "analytics.totalSpent": paymentAmount,
          "analytics.totalOrders": 1,
        },
        $set: {
          "analytics.lastPurchaseDate": new Date(),
          updatedAt: new Date(),
        },
      }
    );

    session.commitTransaction();

    return {
      success: true,
      paymentId: paymentResult.insertedId,
      transactionId: paymentData.transactionId,
      message: `Payment of $${paymentAmount} processed successfully`,
    };
  } catch (error) {
    session.abortTransaction();
    return {
      success: false,
      error: error.message,
    };
  } finally {
    session.endSession();
  }
}

// Create test order and process payment
if (isMaster.setName) {
  // Create a test order first
  const testCustomer = db.users.findOne({ role: "student" });
  if (testCustomer) {
    const testOrderResult = db.orders.insertOne({
      customerId: testCustomer._id,
      items: [
        {
          productId: ObjectId(),
          name: "MongoDB Course",
          price: 99.99,
          quantity: 1,
        },
      ],
      total: 99.99,
      status: "pending_payment",
      createdAt: new Date(),
    });

    const paymentResult = processPaymentTransaction(
      testOrderResult.insertedId.toString(),
      99.99,
      "credit_card"
    );

    if (paymentResult.success) {
      print(`✓ ${paymentResult.message}`);
      print(`  Transaction ID: ${paymentResult.transactionId}`);
    } else {
      print(`⚠ Payment failed: ${paymentResult.error}`);
    }
  }
}

// =================================================================
// INVENTORY MANAGEMENT TRANSACTION
// =================================================================

print("\n📦 INVENTORY MANAGEMENT TRANSACTION");
print("-" * 30);

print("4. Inventory update transaction with conflict resolution");

function updateInventoryTransaction(productId, quantityChange, reason) {
  const session = db.getMongo().startSession();

  try {
    session.startTransaction({
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
    });

    const db_session = session.getDatabase("mongomasterpro");
    const products = db_session.getCollection("products");
    const inventory_log = db_session.getCollection("inventory_log");

    // Step 1: Get current product with version for optimistic locking
    const product = products.findOne({
      _id: ObjectId(productId),
    });

    if (!product) {
      throw new Error("Product not found");
    }

    const currentQuantity = product.inventory?.quantity || 0;
    const newQuantity = currentQuantity + quantityChange;

    // Step 2: Validate inventory constraints
    if (newQuantity < 0) {
      throw new Error(
        `Insufficient inventory. Current: ${currentQuantity}, Requested: ${Math.abs(
          quantityChange
        )}`
      );
    }

    if (quantityChange < 0 && product.status === "discontinued") {
      throw new Error("Cannot reduce inventory for discontinued product");
    }

    // Step 3: Update product inventory with version check
    const updateResult = products.updateOne(
      {
        _id: ObjectId(productId),
        $or: [
          { "inventory.version": { $exists: false } },
          { "inventory.version": product.inventory?.version || 0 },
        ],
      },
      {
        $set: {
          "inventory.quantity": newQuantity,
          "inventory.lastUpdated": new Date(),
          "inventory.version": (product.inventory?.version || 0) + 1,
          updatedAt: new Date(),
        },
      }
    );

    if (updateResult.matchedCount === 0) {
      throw new Error(
        "Inventory was modified by another process. Please retry."
      );
    }

    // Step 4: Log inventory change
    const logEntry = {
      productId: ObjectId(productId),
      change: quantityChange,
      previousQuantity: currentQuantity,
      newQuantity: newQuantity,
      reason: reason,
      timestamp: new Date(),
      version: (product.inventory?.version || 0) + 1,
    };

    inventory_log.insertOne(logEntry);

    // Step 5: Update product status based on inventory level
    let newStatus = product.status;
    if (newQuantity === 0 && product.status === "active") {
      newStatus = "out_of_stock";
    } else if (newQuantity > 0 && product.status === "out_of_stock") {
      newStatus = "active";
    }

    if (newStatus !== product.status) {
      products.updateOne(
        { _id: ObjectId(productId) },
        {
          $set: {
            status: newStatus,
            statusUpdatedAt: new Date(),
          },
        }
      );
    }

    session.commitTransaction();

    return {
      success: true,
      previousQuantity: currentQuantity,
      newQuantity: newQuantity,
      statusChange:
        newStatus !== product.status
          ? `${product.status} -> ${newStatus}`
          : null,
      message: `Inventory updated: ${currentQuantity} -> ${newQuantity} (${
        quantityChange >= 0 ? "+" : ""
      }${quantityChange})`,
    };
  } catch (error) {
    session.abortTransaction();
    return {
      success: false,
      error: error.message,
    };
  } finally {
    session.endSession();
  }
}

// Test inventory transaction
if (isMaster.setName) {
  // Create a test product first
  const testProduct = db.products.insertOne({
    name: "Test Product for Inventory",
    price: 29.99,
    status: "active",
    inventory: {
      quantity: 50,
      warehouse: "WH-001",
      version: 0,
    },
    createdAt: new Date(),
  });

  // Test inventory decrease
  const inventoryResult = updateInventoryTransaction(
    testProduct.insertedId.toString(),
    -5,
    "Sale"
  );

  if (inventoryResult.success) {
    print(`✓ ${inventoryResult.message}`);
    if (inventoryResult.statusChange) {
      print(`  Status changed: ${inventoryResult.statusChange}`);
    }
  } else {
    print(`⚠ Inventory update failed: ${inventoryResult.error}`);
  }
}

// =================================================================
// TRANSACTION PERFORMANCE TESTING
// =================================================================

print("\n⚡ TRANSACTION PERFORMANCE TESTING");
print("-" * 30);

print("5. Transaction performance analysis");

function measureTransactionPerformance() {
  if (!isMaster.setName) {
    print("⚠ Skipping performance test - replica set required");
    return;
  }

  const performanceResults = [];
  const testIterations = 5;

  for (let i = 0; i < testIterations; i++) {
    const startTime = Date.now();

    const session = db.getMongo().startSession();

    try {
      session.startTransaction();

      const db_session = session.getDatabase("mongomasterpro");
      const test_collection = db_session.getCollection(
        "transaction_performance_test"
      );

      // Perform multiple operations in transaction
      for (let j = 0; j < 10; j++) {
        test_collection.insertOne({
          testId: i,
          operationId: j,
          timestamp: new Date(),
          data: `Test data for iteration ${i}, operation ${j}`,
        });
      }

      session.commitTransaction();

      const duration = Date.now() - startTime;
      performanceResults.push(duration);
    } catch (error) {
      session.abortTransaction();
      print(`Transaction ${i} failed: ${error.message}`);
    } finally {
      session.endSession();
    }
  }

  // Cleanup test data
  db.transaction_performance_test.drop();

  if (performanceResults.length > 0) {
    const avgDuration =
      performanceResults.reduce((sum, dur) => sum + dur, 0) /
      performanceResults.length;
    const minDuration = Math.min(...performanceResults);
    const maxDuration = Math.max(...performanceResults);

    print(`✓ Transaction performance (${testIterations} iterations):`);
    print(`  Average: ${Math.round(avgDuration)}ms`);
    print(`  Range: ${minDuration}ms - ${maxDuration}ms`);
    print(`  Total operations: ${testIterations * 10} inserts`);
  }
}

measureTransactionPerformance();

// =================================================================
// CLEANUP AND SUMMARY
// =================================================================

print("\n🧹 CLEANUP");
print("-" * 30);

// Clean up test data
if (isMaster.setName) {
  db.users.deleteMany({ email: /tx\.student@example\.com/ });
  db.orders.deleteMany({
    status: { $in: ["pending_payment", "paid"] },
    "items.name": "MongoDB Course",
  });
  db.payments.deleteMany({ transactionId: { $regex: /^txn_/ } });
  db.products.deleteMany({ name: "Test Product for Inventory" });
  db.enrollment_log.deleteMany({});
  db.inventory_log.deleteMany({});
  print("✓ Cleaned up test transaction data");
}

print("\n📊 MULTI-DOCUMENT TRANSACTIONS SUMMARY");
print("-" * 30);

const transactionSummary = {
  patternsDemo: [
    "Basic transaction",
    "Enrollment transaction",
    "Payment processing",
    "Inventory management",
  ],
  keyFeatures: [
    "ACID compliance",
    "Multi-collection operations",
    "Error handling",
    "Optimistic locking",
    "Performance monitoring",
  ],
  realWorldUseCases: [
    "Course enrollment",
    "Payment processing",
    "Inventory updates",
    "Order fulfillment",
    "Account transfers",
  ],
};

print("Transaction patterns demonstrated:");
transactionSummary.patternsDemo.forEach((pattern, i) => {
  print(`  ${i + 1}. ${pattern}`);
});

print("\n🎯 Key Transaction Concepts:");
print("• Multi-document ACID transactions");
print("• Session management and lifecycle");
print("• Read and write concerns for consistency");
print("• Error handling and rollback mechanisms");
print("• Optimistic locking with versioning");
print("• Business logic validation within transactions");
print("• Performance considerations and monitoring");
print("• Real-world transaction patterns");

print("\n✅ Multi-document transactions completed!");
print("Next: Run session_management.js for advanced session handling");
