// File: scripts/03_schema_design/schema_migrations.js
// Schema versioning and migration patterns for evolving data structures

use("learning_platform");

print("MongoDB Schema Design: Migrations & Versioning");
print("=" * 50);

// =================================================================
// SCHEMA VERSIONING FUNDAMENTALS
// =================================================================

print("\n🔄 SCHEMA VERSIONING FUNDAMENTALS");
print("-" * 30);

db.versioned_users.deleteMany({});
db.migration_log.deleteMany({});

// 1. Create documents with different schema versions
const v1Users = [
  {
    _id: ObjectId(),
    schemaVersion: "1.0",
    email: "user1@migration.com",
    name: "John Doe",
    created: new Date(),
    status: "active",
  },
  {
    _id: ObjectId(),
    schemaVersion: "1.0",
    email: "user2@migration.com",
    name: "Jane Smith",
    created: new Date(),
    status: "active",
  },
  {
    _id: ObjectId(),
    schemaVersion: "1.0",
    email: "user3@migration.com",
    name: "Bob Johnson",
    created: new Date(),
    status: "inactive",
  },
];

const v2Users = [
  {
    _id: ObjectId(),
    schemaVersion: "2.0",
    email: "user4@migration.com",
    firstName: "Alice",
    lastName: "Wilson",
    createdAt: new Date(),
    status: "active",
    profile: { preferences: { theme: "dark", notifications: true } },
  },
  {
    _id: ObjectId(),
    schemaVersion: "2.0",
    email: "user5@migration.com",
    firstName: "Charlie",
    lastName: "Brown",
    createdAt: new Date(),
    status: "active",
    profile: { preferences: { theme: "light", notifications: false } },
  },
];

const v3Users = [
  {
    _id: ObjectId(),
    schemaVersion: "3.0",
    email: "user6@migration.com",
    firstName: "David",
    lastName: "Miller",
    createdAt: new Date(),
    updatedAt: new Date(),
    status: "active",
    profile: {
      preferences: { theme: "dark", notifications: true, language: "en" },
      metadata: {
        lastLogin: new Date(),
        loginCount: 1,
        ipAddress: "192.168.1.100",
      },
    },
    tags: ["premium", "verified"],
  },
];

db.versioned_users.insertMany([...v1Users, ...v2Users, ...v3Users]);
print(`✓ Created users with schema versions 1.0, 2.0, and 3.0`);

// =================================================================
// LAZY MIGRATION STRATEGY
// =================================================================

print("\n🔄 LAZY MIGRATION STRATEGY");
print("-" * 30);

function lazyMigrateUser(user) {
  let migrated = { ...user };
  let changed = false;

  if (user.schemaVersion === "1.0") {
    const nameParts = user.name.split(" ");
    migrated.firstName = nameParts[0];
    migrated.lastName = nameParts.slice(1).join(" ") || "";
    migrated.createdAt = user.created;
    delete migrated.name;
    delete migrated.created;
    migrated.schemaVersion = "2.0";
    changed = true;
    print(`  ↗ Migrated ${user.email} from v1.0 to v2.0`);
  }

  if (migrated.schemaVersion === "2.0") {
    migrated.updatedAt = new Date();
    if (!migrated.profile) migrated.profile = {};
    if (!migrated.profile.preferences)
      migrated.profile.preferences = { theme: "light", notifications: true };
    migrated.profile.preferences.language = "en";
    migrated.profile.metadata = {
      lastLogin: new Date(),
      loginCount: 1,
      ipAddress: "unknown",
    };
    migrated.tags = [];
    migrated.schemaVersion = "3.0";
    changed = true;
    print(`  ↗ Migrated ${user.email} from v2.0 to v3.0`);
  }

  return { migrated, changed };
}

// Test lazy migration
const oldUsers = db.versioned_users
  .find({ schemaVersion: { $ne: "3.0" } })
  .toArray();
let migratedCount = 0;

oldUsers.forEach((user) => {
  const { migrated, changed } = lazyMigrateUser(user);
  if (changed) {
    db.versioned_users.replaceOne({ _id: user._id }, migrated);
    migratedCount++;
  }
});
print(`✓ Lazy migration completed: ${migratedCount} users migrated`);

// =================================================================
// BULK MIGRATION STRATEGY
// =================================================================

print("\n⚡ BULK MIGRATION STRATEGY");
print("-" * 30);

// Create more test data
const bulkUsers = [];
for (let i = 7; i <= 20; i++) {
  bulkUsers.push({
    _id: ObjectId(),
    schemaVersion: "1.0",
    email: `bulkuser${i}@migration.com`,
    name: `User ${i}`,
    created: new Date(Date.now() - i * 86400000),
    status: i % 3 === 0 ? "inactive" : "active",
  });
}

db.versioned_users.insertMany(bulkUsers);
print(`✓ Created ${bulkUsers.length} v1.0 users for bulk migration`);

// Bulk migration using aggregation
const bulkMigrationResult = db.versioned_users.updateMany(
  { schemaVersion: "1.0" },
  [
    {
      $set: {
        firstName: { $arrayElemAt: [{ $split: ["$name", " "] }, 0] },
        lastName: {
          $reduce: {
            input: { $slice: [{ $split: ["$name", " "] }, 1, 10] },
            initialValue: "",
            in: {
              $concat: [
                "$$value",
                { $cond: [{ $eq: ["$$value", ""] }, "", " "] },
                "$$this",
              ],
            },
          },
        },
        createdAt: "$created",
        schemaVersion: "2.0",
        profile: { preferences: { theme: "light", notifications: true } },
      },
    },
    { $unset: ["name", "created"] },
  ]
);

print(
  `✓ Bulk migration v1.0->v2.0: ${bulkMigrationResult.modifiedCount} documents updated`
);

// =================================================================
// MIGRATION LOGGING AND TRACKING
// =================================================================

print("\n📝 MIGRATION LOGGING");
print("-" * 30);

function logMigration(fromVersion, toVersion, documentsAffected, strategy) {
  const logEntry = {
    _id: ObjectId(),
    fromVersion: fromVersion,
    toVersion: toVersion,
    documentsAffected: documentsAffected,
    strategy: strategy,
    timestamp: new Date(),
    executionTime: Math.random() * 1000, // Simulated
    success: true,
  };

  db.migration_log.insertOne(logEntry);
  return logEntry;
}

logMigration("1.0", "2.0", bulkMigrationResult.modifiedCount, "bulk");
logMigration("2.0", "3.0", migratedCount, "lazy");

print("✓ Migration activities logged");

// =================================================================
// DUAL-WRITE MIGRATION PATTERN
// =================================================================

print("\n✍️  DUAL-WRITE MIGRATION PATTERN");
print("-" * 30);

// Simulate application writing in both old and new formats during transition
function dualWriteUser(userData) {
  const v2Format = {
    _id: ObjectId(),
    schemaVersion: "2.0",
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
    createdAt: new Date(),
    status: "active",
    profile: { preferences: { theme: "light", notifications: true } },
  };

  const v3Format = {
    _id: v2Format._id,
    schemaVersion: "3.0",
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
    createdAt: v2Format.createdAt,
    updatedAt: new Date(),
    status: "active",
    profile: {
      preferences: { theme: "light", notifications: true, language: "en" },
      metadata: {
        lastLogin: new Date(),
        loginCount: 1,
        ipAddress: "192.168.1.1",
      },
    },
    tags: [],
  };

  // Write v3 format (current)
  db.versioned_users.insertOne(v3Format);

  return v3Format._id;
}

const dualWriteUser1 = dualWriteUser({
  email: "dualwrite1@test.com",
  firstName: "Dual",
  lastName: "Write",
});
print(`✓ Dual-write pattern: Created user ${dualWriteUser1}`);

// =================================================================
// FIELD TRANSFORMATION PATTERNS
// =================================================================

print("\n🔀 FIELD TRANSFORMATION PATTERNS");
print("-" * 30);

// 1. Field renaming
db.versioned_users.updateMany(
  { created: { $exists: true } },
  { $rename: { created: "createdAt" } }
);

// 2. Data type conversion
db.versioned_users.updateMany({ status: { $type: "string" } }, [
  {
    $set: {
      statusInfo: {
        value: "$status",
        updatedAt: new Date(),
        reason: "migration",
      },
    },
  },
]);

// 3. Array field addition
db.versioned_users.updateMany(
  { tags: { $exists: false } },
  { $set: { tags: [] } }
);

// 4. Nested field restructuring
db.versioned_users.updateMany(
  { "profile.preferences.notifications": { $type: "bool" } },
  [
    {
      $set: {
        "profile.notifications": {
          email: "$profile.preferences.notifications",
          push: "$profile.preferences.notifications",
          sms: false,
        },
      },
    },
  ]
);

print(
  "✓ Applied field transformations: rename, type conversion, array addition, restructuring"
);

// =================================================================
// ROLLBACK MECHANISMS
// =================================================================

print("\n⏪ ROLLBACK MECHANISMS");
print("-" * 30);

// Create backup before major migration
function createBackup(collectionName, backupSuffix) {
  const backupName = `${collectionName}_backup_${backupSuffix}`;

  // Copy collection for backup
  db.getCollection(collectionName).aggregate([{ $out: backupName }]);

  const originalCount = db.getCollection(collectionName).countDocuments();
  const backupCount = db.getCollection(backupName).countDocuments();

  print(
    `✓ Backup created: ${backupName} (${backupCount}/${originalCount} documents)`
  );
  return backupName;
}

const backupName = createBackup(
  "versioned_users",
  new Date().toISOString().slice(0, 10)
);

// Rollback function
function rollbackMigration(backupCollection, targetCollection) {
  const backupCount = db.getCollection(backupCollection).countDocuments();

  // Drop current collection and restore from backup
  db.getCollection(targetCollection).drop();
  db.getCollection(backupCollection).aggregate([{ $out: targetCollection }]);

  const restoredCount = db.getCollection(targetCollection).countDocuments();
  print(
    `✓ Rollback completed: Restored ${restoredCount} documents from backup`
  );

  return restoredCount;
}

// Simulate rollback (but don't actually do it)
print("✓ Rollback mechanism available if needed");

// =================================================================
// MIGRATION VALIDATION
// =================================================================

print("\n✅ MIGRATION VALIDATION");
print("-" * 30);

function validateMigration() {
  const versionCounts = db.versioned_users
    .aggregate([
      { $group: { _id: "$schemaVersion", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  print("Schema version distribution:");
  versionCounts.forEach((version) => {
    print(`  v${version._id}: ${version.count} documents`);
  });

  // Validate data integrity
  const validationResults = {
    missingRequiredFields: 0,
    invalidEmails: 0,
    inconsistentNaming: 0,
  };

  // Check for missing required fields in v3.0
  validationResults.missingRequiredFields = db.versioned_users.countDocuments({
    schemaVersion: "3.0",
    $or: [
      { firstName: { $exists: false } },
      { lastName: { $exists: false } },
      { email: { $exists: false } },
    ],
  });

  // Check for invalid email formats
  validationResults.invalidEmails = db.versioned_users.countDocuments({
    email: { $not: /^.+@.+\..+$/ },
  });

  // Check for inconsistent naming (empty names)
  validationResults.inconsistentNaming = db.versioned_users.countDocuments({
    $or: [
      { firstName: { $in: [null, ""] } },
      { lastName: { $in: [null, ""] } },
    ],
  });

  print("Validation results:");
  Object.entries(validationResults).forEach(([check, count]) => {
    print(`  ${check}: ${count} issues ${count === 0 ? "✓" : "⚠"}`);
  });

  return validationResults;
}

validateMigration();

// =================================================================
// PROGRESSIVE MIGRATION PATTERN
// =================================================================

print("\n📈 PROGRESSIVE MIGRATION PATTERN");
print("-" * 30);

function progressiveMigration(batchSize = 10) {
  const totalDocs = db.versioned_users.countDocuments({
    schemaVersion: { $ne: "3.0" },
  });
  let processed = 0;
  let batchNumber = 1;

  print(`Starting progressive migration: ${totalDocs} documents to process`);

  while (processed < totalDocs) {
    const batch = db.versioned_users
      .find({ schemaVersion: { $ne: "3.0" } })
      .limit(batchSize)
      .toArray();

    if (batch.length === 0) break;

    const bulkOps = batch.map((doc) => {
      const { migrated } = lazyMigrateUser(doc);
      return {
        replaceOne: {
          filter: { _id: doc._id },
          replacement: migrated,
        },
      };
    });

    if (bulkOps.length > 0) {
      const result = db.versioned_users.bulkWrite(bulkOps);
      processed += result.modifiedCount;

      print(
        `  Batch ${batchNumber}: ${result.modifiedCount} documents migrated`
      );
      batchNumber++;
    }

    // Simulate delay between batches (remove in production)
    // sleep(100);
  }

  print(`✓ Progressive migration completed: ${processed} documents processed`);
}

// Don't run progressive migration as we already migrated
print("✓ Progressive migration pattern available for large datasets");

// =================================================================
// MIGRATION METRICS AND MONITORING
// =================================================================

print("\n📊 MIGRATION METRICS");
print("-" * 30);

function generateMigrationReport() {
  const report = {
    totalDocuments: db.versioned_users.countDocuments(),
    schemaVersions: {},
    migrationLog: db.migration_log.find().toArray(),
    dataQuality: {},
    performance: {},
  };

  // Schema version distribution
  const versions = db.versioned_users
    .aggregate([{ $group: { _id: "$schemaVersion", count: { $sum: 1 } } }])
    .toArray();

  versions.forEach((v) => {
    report.schemaVersions[v._id] = v.count;
  });

  // Data quality metrics
  report.dataQuality = {
    completeProfiles: db.versioned_users.countDocuments({
      firstName: { $exists: true, $ne: "" },
      lastName: { $exists: true, $ne: "" },
      email: { $regex: /^.+@.+\..+$/ },
    }),
    profileCompletionRate: 0,
  };

  report.dataQuality.profileCompletionRate = (
    (report.dataQuality.completeProfiles / report.totalDocuments) *
    100
  ).toFixed(2);

  // Performance metrics (simulated)
  report.performance = {
    avgMigrationTime: "250ms per document",
    totalMigrationTime: "45 minutes",
    throughput: "240 docs/minute",
  };

  return report;
}

const migrationReport = generateMigrationReport();
print("📋 Migration Report:");
print(`  Total documents: ${migrationReport.totalDocuments}`);
print(`  Schema versions: ${JSON.stringify(migrationReport.schemaVersions)}`);
print(
  `  Profile completion: ${migrationReport.dataQuality.profileCompletionRate}%`
);
print(`  Migration logs: ${migrationReport.migrationLog.length} entries`);

// =================================================================
// CLEANUP AND SUMMARY
// =================================================================

print("\n🧹 CLEANUP");
print("-" * 30);

// Clean up backup collection
db.getCollection(backupName).drop();
print("✓ Cleaned up backup collection");

print("\n📊 MIGRATION SUMMARY");
print("-" * 30);

const finalStats = {
  totalUsers: db.versioned_users.countDocuments(),
  currentSchemaVersion: "3.0",
  migrationLogs: db.migration_log.countDocuments(),
  v3Users: db.versioned_users.countDocuments({ schemaVersion: "3.0" }),
};

print("Final migration statistics:");
Object.entries(finalStats).forEach(([key, value]) => {
  print(`  ${key}: ${value}`);
});

const migrationSuccess = (
  (finalStats.v3Users / finalStats.totalUsers) *
  100
).toFixed(1);
print(`Migration success rate: ${migrationSuccess}%`);

print("\n🎯 Key Migration Patterns Demonstrated:");
print("• Schema versioning with version fields");
print("• Lazy migration (migrate on access)");
print("• Bulk migration using aggregation pipelines");
print("• Dual-write pattern for zero-downtime migrations");
print("• Field transformations (rename, type conversion, restructuring)");
print("• Migration logging and audit trails");
print("• Rollback mechanisms with backups");
print("• Progressive migration for large datasets");
print("• Data validation post-migration");
print("• Migration monitoring and reporting");

print("\n✅ Schema migrations completed!");
print("Next: Run validate_schemas.js for schema validation rules");
