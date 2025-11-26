// File: scripts/01_crud/bulk_operations.js
// Advanced bulk write patterns and optimization strategies

use("learning_platform");

print("MongoDB CRUD: Bulk Operations");
print("=" * 50);

// =================================================================
// BULK WRITE FUNDAMENTALS
// =================================================================

print("\n🚀 BULK WRITE FUNDAMENTALS");
print("-" * 30);

// 1. Basic bulk write operations
print("1. Basic bulk write with mixed operations");

const basicBulkOps = [
  {
    insertOne: {
      document: {
        email: "bulk.user1@test.com",
        firstName: "Bulk",
        lastName: "User1",
        role: "student",
        profile: {
          experienceLevel: "beginner",
          interests: ["mongodb", "databases"],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  },
  {
    insertOne: {
      document: {
        email: "bulk.user2@test.com",
        firstName: "Bulk",
        lastName: "User2",
        role: "student",
        profile: {
          experienceLevel: "intermediate",
          interests: ["web development", "apis"],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  },
  {
    updateOne: {
      filter: { email: "bulk.user1@test.com" },
      update: {
        $set: {
          "profile.lastActivity": new Date(),
          updatedAt: new Date(),
        },
        $inc: { "stats.loginCount": 1 },
      },
      upsert: true,
    },
  },
  {
    updateMany: {
      filter: {
        email: { $regex: /^bulk\.user\d+@test\.com$/ },
        role: "student",
      },
      update: {
        $set: {
          "metadata.batchProcessed": true,
          "metadata.processedAt": new Date(),
        },
      },
    },
  },
  {
    deleteOne: {
      filter: { email: "nonexistent@test.com" },
    },
  },
];

try {
  const basicResult = db.users.bulkWrite(basicBulkOps, { ordered: false });

  print("✓ Basic bulk write completed:");
  print(`  Inserted: ${basicResult.insertedCount}`);
  print(`  Matched: ${basicResult.matchedCount}`);
  print(`  Modified: ${basicResult.modifiedCount}`);
  print(`  Deleted: ${basicResult.deletedCount}`);
  print(`  Upserted: ${basicResult.upsertedCount}`);

  if (
    basicResult.upsertedIds &&
    Object.keys(basicResult.upsertedIds).length > 0
  ) {
    print(
      `  Upserted IDs: ${Object.values(basicResult.upsertedIds).slice(0, 2)}`
    );
  }
} catch (error) {
  print(`❌ Bulk write failed: ${error.message}`);
  if (error.writeErrors) {
    print(`  Write errors: ${error.writeErrors.length}`);
  }
}

// =================================================================
// ORDERED vs UNORDERED OPERATIONS
// =================================================================

print("\n🚀 ORDERED vs UNORDERED OPERATIONS");
print("-" * 30);

// 2. Ordered bulk operations (stops on first error)
print("2. Ordered bulk operations (sequential execution)");

const orderedOps = [
  {
    insertOne: {
      document: {
        email: "ordered1@test.com",
        firstName: "Ordered",
        lastName: "Test1",
        role: "student",
        createdAt: new Date(),
      },
    },
  },
  {
    insertOne: {
      document: {
        email: "ordered1@test.com", // Duplicate - will cause error
        firstName: "Duplicate",
        lastName: "Test",
        role: "student",
        createdAt: new Date(),
      },
    },
  },
  {
    insertOne: {
      document: {
        email: "ordered2@test.com", // This won't execute due to error above
        firstName: "Ordered",
        lastName: "Test2",
        role: "student",
        createdAt: new Date(),
      },
    },
  },
];

try {
  const orderedResult = db.users.bulkWrite(orderedOps, { ordered: true });
  print(`✓ Ordered bulk - Inserted: ${orderedResult.insertedCount}`);
} catch (error) {
  print(
    `⚠ Ordered bulk stopped at error: ${
      error.writeErrors ? error.writeErrors[0].errmsg : error.message
    }`
  );
  print(`  Operations completed before error: ${error.result.nInserted || 0}`);
}

// 3. Unordered bulk operations (continues despite errors)
print("\n3. Unordered bulk operations (parallel execution)");

const unorderedOps = [
  {
    insertOne: {
      document: {
        email: "unordered1@test.com",
        firstName: "Unordered",
        lastName: "Test1",
        role: "student",
        createdAt: new Date(),
      },
    },
  },
  {
    insertOne: {
      document: {
        email: "unordered1@test.com", // Duplicate - will cause error
        firstName: "Duplicate",
        lastName: "Test",
        role: "student",
        createdAt: new Date(),
      },
    },
  },
  {
    insertOne: {
      document: {
        email: "unordered2@test.com", // This WILL execute despite error above
        firstName: "Unordered",
        lastName: "Test2",
        role: "student",
        createdAt: new Date(),
      },
    },
  },
];

try {
  const unorderedResult = db.users.bulkWrite(unorderedOps, { ordered: false });
  print(`✓ Unordered bulk - Inserted: ${unorderedResult.insertedCount}`);
} catch (error) {
  print(`⚠ Unordered bulk had errors but continued:`);
  print(`  Total inserted: ${error.result.nInserted || 0}`);
  print(`  Write errors: ${error.writeErrors ? error.writeErrors.length : 0}`);
}

// =================================================================
// BATCH PROCESSING PATTERNS
// =================================================================

print("\n🚀 BATCH PROCESSING PATTERNS");
print("-" * 30);

// 4. Large dataset batch processing
print("4. Processing large datasets in batches");

function processBatchData(batchSize = 1000) {
  print(`Processing data in batches of ${batchSize}`);

  let totalProcessed = 0;
  let batchNumber = 1;

  // Simulate processing users in batches
  const cursor = db.users
    .find({ "metadata.batchProcessed": { $ne: true } })
    .limit(batchSize);

  while (cursor.hasNext()) {
    const batch = [];
    let count = 0;

    // Collect batch
    while (cursor.hasNext() && count < batchSize) {
      const user = cursor.next();
      batch.push({
        updateOne: {
          filter: { _id: user._id },
          update: {
            $set: {
              "metadata.batchProcessed": true,
              "metadata.batchNumber": batchNumber,
              "metadata.processedAt": new Date(),
            },
          },
        },
      });
      count++;
    }

    if (batch.length > 0) {
      try {
        const batchResult = db.users.bulkWrite(batch, { ordered: false });
        totalProcessed += batchResult.modifiedCount;
        print(
          `  Batch ${batchNumber}: ${batchResult.modifiedCount} documents processed`
        );
        batchNumber++;
      } catch (error) {
        print(`  Batch ${batchNumber} error: ${error.message}`);
      }
    }

    if (count < batchSize) break; // No more documents
  }

  print(`✓ Total documents processed: ${totalProcessed}`);
  return totalProcessed;
}

processBatchData(50);

// =================================================================
// UPSERT PATTERNS IN BULK OPERATIONS
// =================================================================

print("\n🚀 UPSERT PATTERNS IN BULK OPERATIONS");
print("-" * 30);

// 5. Bulk upsert operations
print("5. Bulk upsert for data synchronization");

const upsertData = [
  {
    email: "sync.user1@external.com",
    firstName: "Sync",
    lastName: "User1",
    role: "student",
    externalId: "EXT001",
    lastSyncAt: new Date(),
  },
  {
    email: "sync.user2@external.com",
    firstName: "Sync",
    lastName: "User2",
    role: "instructor",
    externalId: "EXT002",
    lastSyncAt: new Date(),
  },
  {
    email: "existing.user@test.com", // Assume this exists
    firstName: "Updated",
    lastName: "User",
    role: "student",
    externalId: "EXT003",
    lastSyncAt: new Date(),
  },
];

const upsertOps = upsertData.map((userData) => ({
  updateOne: {
    filter: { email: userData.email },
    update: {
      $set: {
        ...userData,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
        isActive: true,
      },
    },
    upsert: true,
  },
}));

try {
  const upsertResult = db.users.bulkWrite(upsertOps, { ordered: false });

  print("✓ Bulk upsert completed:");
  print(`  Matched: ${upsertResult.matchedCount}`);
  print(`  Modified: ${upsertResult.modifiedCount}`);
  print(`  Upserted: ${upsertResult.upsertedCount}`);

  if (upsertResult.upsertedIds) {
    print(
      `  New documents created: ${Object.keys(upsertResult.upsertedIds).length}`
    );
  }
} catch (error) {
  print(`❌ Bulk upsert failed: ${error.message}`);
}

// =================================================================
// BULK OPERATIONS FOR DIFFERENT COLLECTIONS
// =================================================================

print("\n🚀 CROSS-COLLECTION BULK OPERATIONS");
print("-" * 30);

// 6. Course enrollment bulk operations
print("6. Bulk enrollment processing");

// First, get some user and course IDs
const sampleUsers = db.users
  .find({ role: "student" }, { _id: 1 })
  .limit(5)
  .toArray();
const sampleCourses = db.courses
  .find({ status: "active" }, { _id: 1 })
  .limit(3)
  .toArray();

if (sampleUsers.length > 0 && sampleCourses.length > 0) {
  const enrollmentOps = [];

  // Create enrollment operations
  for (let i = 0; i < Math.min(sampleUsers.length, 10); i++) {
    const student = sampleUsers[i % sampleUsers.length];
    const course = sampleCourses[i % sampleCourses.length];

    enrollmentOps.push({
      updateOne: {
        filter: {
          studentId: student._id,
          courseId: course._id,
        },
        update: {
          $set: {
            enrolledAt: new Date(),
            status: "enrolled",
            progress: 0,
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        upsert: true,
      },
    });
  }

  try {
    const enrollmentResult = db.enrollments.bulkWrite(enrollmentOps, {
      ordered: false,
    });

    print("✓ Bulk enrollment processing:");
    print(`  Matched: ${enrollmentResult.matchedCount}`);
    print(`  Modified: ${enrollmentResult.modifiedCount}`);
    print(`  Upserted: ${enrollmentResult.upsertedCount}`);
  } catch (error) {
    print(`❌ Bulk enrollment failed: ${error.message}`);
  }
} else {
  print("⚠ Insufficient sample data for enrollment operations");
}

// =================================================================
// PERFORMANCE OPTIMIZATION
// =================================================================

print("\n🚀 BULK OPERATION PERFORMANCE OPTIMIZATION");
print("-" * 30);

// 7. Optimized bulk write with write concerns
print("7. Performance optimization with write concerns");

const performanceTestData = [];
for (let i = 0; i < 100; i++) {
  performanceTestData.push({
    insertOne: {
      document: {
        email: `perf.test${i}@example.com`,
        firstName: "Performance",
        lastName: `Test${i}`,
        role: "student",
        testData: {
          batchId: "PERF_001",
          generatedAt: new Date(),
          index: i,
        },
        createdAt: new Date(),
      },
    },
  });
}

// Test with different write concerns
const writeConcerns = [
  { w: 1 }, // Default
  { w: 0 }, // Fire and forget (fastest but less safe)
  { w: "majority" }, // Wait for majority (safest but slower)
];

for (let concern of writeConcerns) {
  const startTime = Date.now();

  try {
    const result = db.users.bulkWrite(
      performanceTestData.slice(0, 20), // Test with smaller batch
      {
        ordered: false,
        writeConcern: concern,
      }
    );

    const duration = Date.now() - startTime;
    print(
      `✓ Write concern ${JSON.stringify(concern)}: ${duration}ms, inserted: ${
        result.insertedCount
      }`
    );

    // Clean up test data
    db.users.deleteMany({ "testData.batchId": "PERF_001" });
  } catch (error) {
    print(`❌ Write concern test failed: ${error.message}`);
  }
}

// =================================================================
// ERROR HANDLING AND RECOVERY
// =================================================================

print("\n🚀 ERROR HANDLING & RECOVERY");
print("-" * 30);

// 8. Comprehensive error handling
print("8. Advanced error handling for bulk operations");

const errorProneOps = [
  {
    insertOne: {
      document: {
        email: "valid1@test.com",
        firstName: "Valid",
        lastName: "User1",
        role: "student",
        createdAt: new Date(),
      },
    },
  },
  {
    insertOne: {
      document: {
        // Missing required email field - will cause validation error
        firstName: "Invalid",
        lastName: "User",
        role: "student",
        createdAt: new Date(),
      },
    },
  },
  {
    updateOne: {
      filter: { email: "nonexistent@test.com" },
      update: { $set: { lastUpdated: new Date() } },
    },
  },
  {
    insertOne: {
      document: {
        email: "valid2@test.com",
        firstName: "Valid",
        lastName: "User2",
        role: "student",
        createdAt: new Date(),
      },
    },
  },
];

function handleBulkErrors(operations) {
  try {
    const result = db.users.bulkWrite(operations, { ordered: false });

    print("✓ Bulk operation completed successfully:");
    print(`  Inserted: ${result.insertedCount}`);
    print(`  Modified: ${result.modifiedCount}`);

    return result;
  } catch (error) {
    print("⚠ Bulk operation completed with errors:");

    // Handle successful operations
    if (error.result) {
      print(`  Successful inserts: ${error.result.nInserted || 0}`);
      print(`  Successful updates: ${error.result.nModified || 0}`);
    }

    // Handle write errors
    if (error.writeErrors && error.writeErrors.length > 0) {
      print(`  Write errors encountered: ${error.writeErrors.length}`);

      error.writeErrors.forEach((err, index) => {
        print(`    Error ${index + 1}: ${err.errmsg} (Code: ${err.code})`);
        print(`    Operation index: ${err.index}`);
      });
    }

    // Handle write concern errors
    if (error.writeConcernErrors && error.writeConcernErrors.length > 0) {
      print(`  Write concern errors: ${error.writeConcernErrors.length}`);
      error.writeConcernErrors.forEach((err) => {
        print(`    ${err.errmsg}`);
      });
    }

    return error.result || null;
  }
}

const errorResult = handleBulkErrors(errorProneOps);

// =================================================================
// MONITORING AND METRICS
// =================================================================

print("\n🚀 MONITORING & METRICS");
print("-" * 30);

// 9. Bulk operation metrics collection
print("9. Collecting bulk operation metrics");

function collectBulkMetrics(operationName, operations) {
  const startTime = Date.now();
  const startMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0;

  let result;
  try {
    result = db.users.bulkWrite(operations, { ordered: false });

    const endTime = Date.now();
    const duration = endTime - startTime;
    const endMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
    const memoryDelta = endMemory - startMemory;

    const metrics = {
      operationName: operationName,
      duration: duration,
      memoryUsed: memoryDelta,
      operationsCount: operations.length,
      insertedCount: result.insertedCount,
      modifiedCount: result.modifiedCount,
      deletedCount: result.deletedCount,
      throughput: operations.length / (duration / 1000), // ops per second
      timestamp: new Date(),
    };

    // Store metrics in analytics database
    use("mmp_analytics");
    db.bulk_operation_metrics.insertOne(metrics);

    use("learning_platform"); // Switch back

    print(`✓ ${operationName} metrics:`);
    print(`  Duration: ${duration}ms`);
    print(`  Throughput: ${metrics.throughput.toFixed(2)} ops/sec`);
    print(`  Memory used: ${(memoryDelta / 1024 / 1024).toFixed(2)} MB`);

    return result;
  } catch (error) {
    print(`❌ ${operationName} failed: ${error.message}`);
    throw error;
  }
}

// Test metrics collection
const metricsTestOps = [
  {
    insertOne: {
      document: {
        email: "metrics.test@example.com",
        firstName: "Metrics",
        lastName: "Test",
        role: "student",
        createdAt: new Date(),
      },
    },
  },
];

collectBulkMetrics("MetricsTest", metricsTestOps);

// =================================================================
// VALIDATION AND SUMMARY
// =================================================================

print("\n🔍 VALIDATION & SUMMARY");
print("-" * 30);

// Cleanup test data
print("Cleaning up test data...");
const cleanupResult = db.users.deleteMany({
  email: {
    $regex: /(bulk\.|ordered|unordered|sync\.|perf\.test|valid|metrics\.test)/,
  },
});
print(`✓ Cleaned up ${cleanupResult.deletedCount} test documents`);

// Final statistics
const finalStats = {
  totalUsers: db.users.countDocuments(),
  totalCourses: db.courses.countDocuments(),
  totalEnrollments: db.enrollments.countDocuments(),
};

print("\n📊 Final Database Statistics:");
Object.entries(finalStats).forEach(([key, value]) => {
  print(`  ${key}: ${value}`);
});

// Check bulk operation metrics
use("mmp_analytics");
const metricsCount = db.bulk_operation_metrics.countDocuments();
print(`  Bulk operation metrics recorded: ${metricsCount}`);

use("learning_platform"); // Switch back

print("\n🎯 Key Learnings:");
print("• bulkWrite() for efficient batch operations");
print("• Ordered vs unordered execution strategies");
print("• Error handling and recovery patterns");
print("• Upsert operations in bulk context");
print("• Performance optimization with write concerns");
print("• Batch processing for large datasets");
print("• Metrics collection and monitoring");
print("• Memory and throughput considerations");

print("\n✅ Bulk operations completed!");
print("Next: Run validate_crud.js to verify all CRUD operations");
