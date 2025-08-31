# Transaction Patterns Cheat Sheet

**Location:** `docs/cheat_sheets/transaction_patterns.md`

## Transaction Basics

### Transaction Lifecycle

```javascript
// Basic transaction pattern
const session = db.getMongo().startSession();

try {
  session.startTransaction({
    readConcern: { level: "snapshot" },
    writeConcern: { w: "majority" },
    readPreference: "primary",
  });

  // Perform operations with session
  db.accounts.updateOne(
    { _id: ObjectId("account1") },
    { $inc: { balance: -100 } },
    { session }
  );

  db.accounts.updateOne(
    { _id: ObjectId("account2") },
    { $inc: { balance: 100 } },
    { session }
  );

  // Commit transaction
  session.commitTransaction();
  print("Transaction committed successfully");
} catch (error) {
  print("Transaction aborted: " + error);
  session.abortTransaction();
} finally {
  session.endSession();
}
```

### Session Management

```javascript
// Proper session handling with callbacks
function withSession(callback) {
  const session = db.getMongo().startSession();
  try {
    return callback(session);
  } finally {
    session.endSession();
  }
}

// Usage
withSession((session) => {
  session.startTransaction();
  try {
    // Your transactional operations here
    const result = performOperations(session);
    session.commitTransaction();
    return result;
  } catch (error) {
    session.abortTransaction();
    throw error;
  }
});
```

## Common Transaction Patterns

### 1. Account Transfer Pattern

```javascript
function transferMoney(fromAccountId, toAccountId, amount, session) {
  // Validate accounts exist and have sufficient balance
  const fromAccount = db.accounts.findOne(
    { _id: fromAccountId, balance: { $gte: amount } },
    { session }
  );
  if (!fromAccount) {
    throw new Error("Insufficient funds or account not found");
  }

  const toAccount = db.accounts.findOne({ _id: toAccountId }, { session });
  if (!toAccount) {
    throw new Error("Destination account not found");
  }

  // Perform transfer
  db.accounts.updateOne(
    { _id: fromAccountId },
    { $inc: { balance: -amount } },
    { session }
  );

  db.accounts.updateOne(
    { _id: toAccountId },
    { $inc: { balance: amount } },
    { session }
  );

  // Create transaction log
  db.transactions.insertOne(
    {
      from: fromAccountId,
      to: toAccountId,
      amount: amount,
      timestamp: new Date(),
      type: "transfer",
    },
    { session }
  );
}

// Usage with retry logic
function performTransfer(fromId, toId, amount) {
  const session = db.getMongo().startSession();

  let retries = 3;
  while (retries > 0) {
    try {
      session.startTransaction({
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
      });

      transferMoney(fromId, toId, amount, session);
      session.commitTransaction();
      return { success: true };
    } catch (error) {
      session.abortTransaction();

      if (error.hasErrorLabel("TransientTransactionError") && retries > 1) {
        print("Transient error, retrying...");
        retries--;
        sleep(100); // Wait 100ms before retry
        continue;
      } else {
        throw error;
      }
    } finally {
      if (retries === 0) {
        session.endSession();
      }
    }
  }
  session.endSession();
}
```

### 2. E-commerce Order Processing

```javascript
function processOrder(userId, items, paymentInfo, session) {
  // Validate inventory
  for (let item of items) {
    const product = db.products.findOne(
      { _id: item.productId, inventory: { $gte: item.quantity } },
      { session }
    );
    if (!product) {
      throw new Error(`Insufficient inventory for product ${item.productId}`);
    }
  }

  // Calculate total
  let total = 0;
  for (let item of items) {
    const product = db.products.findOne({ _id: item.productId }, { session });
    total += product.price * item.quantity;
  }

  // Process payment (mock)
  const paymentResult = processPayment(paymentInfo, total);
  if (!paymentResult.success) {
    throw new Error("Payment failed: " + paymentResult.error);
  }

  // Create order
  const order = {
    userId: userId,
    items: items,
    total: total,
    status: "confirmed",
    paymentId: paymentResult.paymentId,
    createdAt: new Date(),
  };

  const orderResult = db.orders.insertOne(order, { session });
  const orderId = orderResult.insertedId;

  // Update inventory
  for (let item of items) {
    db.products.updateOne(
      { _id: item.productId },
      { $inc: { inventory: -item.quantity } },
      { session }
    );
  }

  // Update user purchase history
  db.users.updateOne(
    { _id: userId },
    {
      $push: { orderHistory: orderId },
      $inc: { totalSpent: total },
    },
    { session }
  );

  return { orderId: orderId, total: total };
}
```

### 3. Multi-Document Updates with Validation

```javascript
function updateUserProfile(userId, profileData, session) {
  // Validate user exists and is active
  const user = db.users.findOne({ _id: userId, status: "active" }, { session });
  if (!user) {
    throw new Error("User not found or inactive");
  }

  // Update main profile
  db.users.updateOne(
    { _id: userId },
    {
      $set: {
        ...profileData,
        lastUpdated: new Date(),
      },
    },
    { session }
  );

  // Update related collections
  if (profileData.email && profileData.email !== user.email) {
    // Update notifications preferences
    db.notifications.updateMany(
      { userId: userId },
      { $set: { email: profileData.email } },
      { session }
    );

    // Log email change
    db.auditLog.insertOne(
      {
        userId: userId,
        action: "email_change",
        oldValue: user.email,
        newValue: profileData.email,
        timestamp: new Date(),
      },
      { session }
    );
  }
}
```

### 4. Inventory Management with Reservations

```javascript
function reserveInventory(items, reservationId, session) {
  const reservations = [];

  for (let item of items) {
    // Check available inventory
    const product = db.products.findOne(
      {
        _id: item.productId,
        $expr: {
          $gte: [{ $subtract: ["$inventory", "$reserved"] }, item.quantity],
        },
      },
      { session }
    );

    if (!product) {
      throw new Error(`Insufficient available inventory for ${item.productId}`);
    }

    // Reserve inventory
    db.products.updateOne(
      { _id: item.productId },
      { $inc: { reserved: item.quantity } },
      { session }
    );

    // Create reservation record
    const reservation = {
      reservationId: reservationId,
      productId: item.productId,
      quantity: item.quantity,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      status: "active",
    };

    db.reservations.insertOne(reservation, { session });
    reservations.push(reservation);
  }

  return reservations;
}

function confirmReservation(reservationId, session) {
  // Find all reservations
  const reservations = db.reservations
    .find({ reservationId: reservationId, status: "active" }, { session })
    .toArray();

  if (reservations.length === 0) {
    throw new Error("No active reservations found");
  }

  for (let reservation of reservations) {
    // Convert reservation to actual sale
    db.products.updateOne(
      { _id: reservation.productId },
      {
        $inc: {
          inventory: -reservation.quantity,
          reserved: -reservation.quantity,
        },
      },
      { session }
    );

    // Mark reservation as confirmed
    db.reservations.updateOne(
      { _id: reservation._id },
      { $set: { status: "confirmed" } },
      { session }
    );
  }
}
```

## Error Handling Patterns

### Retry Logic with Exponential Backoff

```javascript
function executeWithRetry(operation, maxRetries = 3) {
  let attempt = 0;

  while (attempt < maxRetries) {
    const session = db.getMongo().startSession();

    try {
      session.startTransaction();
      const result = operation(session);
      session.commitTransaction();
      session.endSession();
      return result;
    } catch (error) {
      session.abortTransaction();
      session.endSession();

      attempt++;

      if (
        error.hasErrorLabel("TransientTransactionError") &&
        attempt < maxRetries
      ) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
        print(`Transient error, retrying in ${backoffMs}ms...`);
        sleep(backoffMs);
        continue;
      } else {
        throw error;
      }
    }
  }
}
```

### Custom Error Types

```javascript
class TransactionError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = "TransactionError";
    this.code = code;
    this.details = details;
  }
}

class InsufficientFundsError extends TransactionError {
  constructor(accountId, requested, available) {
    super(`Insufficient funds in account ${accountId}`, "INSUFFICIENT_FUNDS", {
      accountId,
      requested,
      available,
    });
  }
}

// Usage
function safeTransfer(fromId, toId, amount) {
  try {
    return executeWithRetry((session) => {
      const fromAccount = db.accounts.findOne({ _id: fromId }, { session });
      if (!fromAccount || fromAccount.balance < amount) {
        throw new InsufficientFundsError(
          fromId,
          amount,
          fromAccount?.balance || 0
        );
      }
      // ... rest of transfer logic
    });
  } catch (error) {
    if (error instanceof InsufficientFundsError) {
      return { success: false, error: error.message, code: error.code };
    }
    throw error;
  }
}
```

## Advanced Patterns

### Saga Pattern for Distributed Transactions

```javascript
function executeSaga(steps) {
  const session = db.getMongo().startSession();
  const completedSteps = [];

  try {
    session.startTransaction();

    // Execute forward steps
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const result = step.execute(session);
      completedSteps.push({ step: step, result: result });

      // Log saga progress
      db.sagaLog.insertOne(
        {
          sagaId: session.getSessionId(),
          stepIndex: i,
          stepName: step.name,
          status: "completed",
          result: result,
          timestamp: new Date(),
        },
        { session }
      );
    }

    session.commitTransaction();
    return { success: true, results: completedSteps };
  } catch (error) {
    session.abortTransaction();

    // Execute compensating actions in reverse order
    for (let i = completedSteps.length - 1; i >= 0; i--) {
      const step = completedSteps[i].step;
      if (step.compensate) {
        try {
          step.compensate(session, completedSteps[i].result);
        } catch (compensationError) {
          print("Compensation failed for step: " + step.name);
        }
      }
    }

    throw error;
  } finally {
    session.endSession();
  }
}
```

### Transaction with External API Integration

```javascript
function processPaymentWithWebhook(orderId, paymentData, session) {
  // Create payment record
  const payment = {
    orderId: orderId,
    amount: paymentData.amount,
    status: "pending",
    externalId: null,
    createdAt: new Date(),
  };

  const paymentResult = db.payments.insertOne(payment, { session });
  const paymentId = paymentResult.insertedId;

  try {
    // Call external payment API (outside transaction)
    session.commitTransaction();
    const externalResult = callPaymentAPI(paymentData);
    session.startTransaction();

    // Update payment with external result
    db.payments.updateOne(
      { _id: paymentId },
      {
        $set: {
          externalId: externalResult.paymentId,
          status: externalResult.status,
          processedAt: new Date(),
        },
      },
      { session }
    );

    if (externalResult.status === "completed") {
      // Update order status
      db.orders.updateOne(
        { _id: orderId },
        { $set: { status: "paid", paidAt: new Date() } },
        { session }
      );
    } else {
      throw new Error("Payment failed: " + externalResult.error);
    }

    return { paymentId: paymentId, externalId: externalResult.paymentId };
  } catch (error) {
    // Mark payment as failed
    db.payments.updateOne(
      { _id: paymentId },
      { $set: { status: "failed", error: error.message } },
      { session }
    );
    throw error;
  }
}
```

## Performance Optimization

### Transaction Configuration

```javascript
// Optimized transaction settings
const transactionOptions = {
  readConcern: { level: "local" }, // Faster than "snapshot" for some cases
  writeConcern: { w: "majority", j: true }, // Ensure durability
  maxTimeMS: 30000, // 30 second timeout
};

// For read-heavy transactions
const readOptimizedOptions = {
  readConcern: { level: "majority" },
  readPreference: "secondaryPreferred", // Can read from secondaries
};
```

### Bulk Operations in Transactions

```javascript
function bulkUpdateWithTransaction(updates, session) {
  session.startTransaction();

  try {
    // Group updates by collection for efficiency
    const updatesByCollection = groupBy(updates, "collection");

    for (const [collectionName, collectionUpdates] of Object.entries(
      updatesByCollection
    )) {
      const bulk = db[collectionName].initializeUnorderedBulkOp();

      for (const update of collectionUpdates) {
        bulk.find(update.filter).update(update.update);
      }

      bulk.execute({ session });
    }

    session.commitTransaction();
  } catch (error) {
    session.abortTransaction();
    throw error;
  }
}
```

## Best Practices Checklist

### Transaction Design

- [ ] Keep transactions short and focused
- [ ] Minimize cross-shard operations
- [ ] Use appropriate read/write concerns
- [ ] Implement proper retry logic
- [ ] Handle transient errors gracefully

### Error Handling

- [ ] Distinguish between retryable and non-retryable errors
- [ ] Implement exponential backoff for retries
- [ ] Log transaction failures with context
- [ ] Provide meaningful error messages to users

### Performance

- [ ] Use bulk operations when possible
- [ ] Optimize query patterns within transactions
- [ ] Monitor transaction duration and abort rate
- [ ] Consider read preferences for read-heavy transactions
- [ ] Use appropriate session and transaction timeouts

### Data Consistency

- [ ] Validate business rules within transactions
- [ ] Use appropriate isolation levels
- [ ] Handle concurrent modification scenarios
- [ ] Implement compensation patterns for complex workflows
- [ ] Test edge cases and failure scenarios
