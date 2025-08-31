// File: scripts/00_setup/validate_setup.js
// Comprehensive validation of MongoDB installation and setup

const VALIDATION_CONFIG = {
  databases: ["mongomasterpro", "mmp_logs", "mmp_analytics"],
  collections: {
    mongomasterpro: [
      "users",
      "courses",
      "enrollments",
      "assignments",
      "submissions",
      "grades",
    ],
    mmp_logs: ["audit_logs"],
    mmp_analytics: ["system_metrics"],
  },
  requiredIndexes: {
    users: ["email_1", "role_1", "createdAt_-1"],
    courses: ["instructorId_1", "status_1", "createdAt_-1"],
    enrollments: ["studentId_1_courseId_1", "courseId_1", "status_1"],
  },
  users: ["mmpApp", "mmpReadOnly"],
  roles: ["mmpAppUser", "mmpReadOnly"],
};

class ValidationReporter {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: [],
    };
  }

  pass(message) {
    this.results.passed++;
    this.results.details.push({ status: "PASS", message });
    print(`✓ ${message}`);
  }

  fail(message) {
    this.results.failed++;
    this.results.details.push({ status: "FAIL", message });
    print(`✗ ${message}`);
  }

  warn(message) {
    this.results.warnings++;
    this.results.details.push({ status: "WARN", message });
    print(`⚠ ${message}`);
  }

  info(message) {
    this.results.details.push({ status: "INFO", message });
    print(`ℹ ${message}`);
  }

  generateReport() {
    print("\n" + "=".repeat(60));
    print("VALIDATION SUMMARY");
    print("=".repeat(60));
    print(`Total Tests: ${this.results.passed + this.results.failed}`);
    print(`Passed: ${this.results.passed}`);
    print(`Failed: ${this.results.failed}`);
    print(`Warnings: ${this.results.warnings}`);

    const successRate = (
      (this.results.passed / (this.results.passed + this.results.failed)) *
      100
    ).toFixed(1);
    print(`Success Rate: ${successRate}%`);

    if (this.results.failed === 0) {
      print("\n🎉 ALL VALIDATIONS PASSED - Setup is complete and ready!");
    } else {
      print("\n❌ Some validations failed - Please review and fix issues");
    }

    return this.results.failed === 0;
  }
}

// Test MongoDB Server Connection
function validateServerConnection(reporter) {
  reporter.info("Testing MongoDB server connection...");

  try {
    const serverStatus = db.runCommand({ serverStatus: 1 });
    if (serverStatus.ok === 1) {
      reporter.pass("MongoDB server is running and accessible");
      reporter.info(`MongoDB version: ${serverStatus.version}`);
      reporter.info(`Uptime: ${Math.floor(serverStatus.uptime / 3600)} hours`);
    } else {
      reporter.fail("MongoDB server status check failed");
    }
  } catch (e) {
    reporter.fail(`Cannot connect to MongoDB server: ${e.message}`);
  }
}

// Validate Database Existence
function validateDatabases(reporter) {
  reporter.info("Validating database existence...");

  try {
    const databases = db
      .adminCommand("listDatabases")
      .databases.map((db) => db.name);

    VALIDATION_CONFIG.databases.forEach((dbName) => {
      if (databases.includes(dbName)) {
        reporter.pass(`Database '${dbName}' exists`);
      } else {
        reporter.fail(`Database '${dbName}' is missing`);
      }
    });
  } catch (e) {
    reporter.fail(`Error listing databases: ${e.message}`);
  }
}

// Validate Collections
function validateCollections(reporter) {
  reporter.info("Validating collections...");

  Object.entries(VALIDATION_CONFIG.collections).forEach(
    ([dbName, expectedCollections]) => {
      try {
        use(dbName);
        const collections = db
          .runCommand("listCollections")
          .cursor.firstBatch.map((col) => col.name);

        expectedCollections.forEach((collName) => {
          if (collections.includes(collName)) {
            reporter.pass(`Collection '${dbName}.${collName}' exists`);

            // Check document count
            const count = db.getCollection(collName).countDocuments();
            if (count > 0) {
              reporter.pass(`Collection '${collName}' has ${count} documents`);
            } else {
              reporter.warn(`Collection '${collName}' is empty`);
            }
          } else {
            reporter.fail(`Collection '${dbName}.${collName}' is missing`);
          }
        });
      } catch (e) {
        reporter.fail(`Error checking collections in ${dbName}: ${e.message}`);
      }
    }
  );
}

// Validate Indexes
function validateIndexes(reporter) {
  reporter.info("Validating essential indexes...");

  use("mongomasterpro");

  Object.entries(VALIDATION_CONFIG.requiredIndexes).forEach(
    ([collName, expectedIndexes]) => {
      try {
        const indexes = db.getCollection(collName).getIndexes();
        const indexNames = indexes.map((idx) => idx.name);

        expectedIndexes.forEach((expectedIndex) => {
          if (indexNames.includes(expectedIndex)) {
            reporter.pass(`Index '${expectedIndex}' exists on '${collName}'`);
          } else {
            reporter.fail(`Index '${expectedIndex}' missing on '${collName}'`);
          }
        });

        // Check for text indexes
        const textIndexes = indexes.filter((idx) =>
          Object.values(idx.key || {}).includes("text")
        );

        if (textIndexes.length > 0) {
          reporter.pass(
            `Collection '${collName}' has ${textIndexes.length} text index(es)`
          );
        }
      } catch (e) {
        reporter.fail(`Error checking indexes on ${collName}: ${e.message}`);
      }
    }
  );
}

// Validate Schema Validation Rules
function validateSchemas(reporter) {
  reporter.info("Validating schema validation rules...");

  use("mongomasterpro");

  const collectionsToCheck = ["users", "courses", "enrollments"];

  collectionsToCheck.forEach((collName) => {
    try {
      const collInfo = db.runCommand({
        listCollections: 1,
        filter: { name: collName },
      }).cursor.firstBatch[0];

      if (collInfo && collInfo.options && collInfo.options.validator) {
        reporter.pass(`Schema validation active for '${collName}'`);

        // Test schema validation by attempting invalid insert
        try {
          db.getCollection(collName).insertOne({ invalid: "test" });
          reporter.warn(
            `Schema validation may be too permissive for '${collName}'`
          );
        } catch (validationError) {
          if (validationError.message.includes("Document failed validation")) {
            reporter.pass(
              `Schema validation working correctly for '${collName}'`
            );
          }
        }
      } else {
        reporter.warn(`No schema validation found for '${collName}'`);
      }
    } catch (e) {
      reporter.fail(
        `Error checking schema validation for ${collName}: ${e.message}`
      );
    }
  });
}

// Validate Users and Roles
function validateAuthentication(reporter) {
  reporter.info("Validating users and roles...");

  try {
    use("admin");

    // Check roles
    VALIDATION_CONFIG.roles.forEach((roleName) => {
      try {
        const roleInfo = db.runCommand({
          rolesInfo: { role: roleName, db: "admin" },
        });

        if (roleInfo.roles && roleInfo.roles.length > 0) {
          reporter.pass(`Role '${roleName}' exists`);
        } else {
          reporter.fail(`Role '${roleName}' not found`);
        }
      } catch (e) {
        reporter.fail(`Error checking role '${roleName}': ${e.message}`);
      }
    });

    // Check users
    VALIDATION_CONFIG.users.forEach((userName) => {
      try {
        const userInfo = db.runCommand({
          usersInfo: { user: userName, db: "admin" },
        });

        if (userInfo.users && userInfo.users.length > 0) {
          reporter.pass(`User '${userName}' exists`);
        } else {
          reporter.fail(`User '${userName}' not found`);
        }
      } catch (e) {
        reporter.fail(`Error checking user '${userName}': ${e.message}`);
      }
    });
  } catch (e) {
    reporter.fail(`Error validating authentication: ${e.message}`);
  }
}

// Validate Data Integrity
function validateDataIntegrity(reporter) {
  reporter.info("Validating data integrity...");

  use("mongomasterpro");

  try {
    // Check referential integrity
    const courses = db.courses.find({}, { _id: 1, instructorId: 1 }).toArray();
    const instructors = db.users
      .find({ role: "instructor" }, { _id: 1 })
      .toArray();
    const instructorIds = new Set(instructors.map((i) => i._id.toString()));

    let validRefs = 0;
    let invalidRefs = 0;

    courses.forEach((course) => {
      if (instructorIds.has(course.instructorId.toString())) {
        validRefs++;
      } else {
        invalidRefs++;
      }
    });

    if (invalidRefs === 0) {
      reporter.pass(
        `All course-instructor references are valid (${validRefs} checked)`
      );
    } else {
      reporter.fail(
        `Found ${invalidRefs} invalid course-instructor references`
      );
    }

    // Check enrollment integrity
    const enrollments = db.enrollments
      .find({}, { studentId: 1, courseId: 1 })
      .toArray();
    const allUsers = db.users.find({}, { _id: 1 }).toArray();
    const allCourses = db.courses.find({}, { _id: 1 }).toArray();

    const userIds = new Set(allUsers.map((u) => u._id.toString()));
    const courseIds = new Set(allCourses.map((c) => c._id.toString()));

    let validEnrollments = 0;
    let invalidEnrollments = 0;

    enrollments.forEach((enrollment) => {
      if (
        userIds.has(enrollment.studentId.toString()) &&
        courseIds.has(enrollment.courseId.toString())
      ) {
        validEnrollments++;
      } else {
        invalidEnrollments++;
      }
    });

    if (invalidEnrollments === 0) {
      reporter.pass(
        `All enrollments have valid references (${validEnrollments} checked)`
      );
    } else {
      reporter.fail(
        `Found ${invalidEnrollments} enrollments with invalid references`
      );
    }
  } catch (e) {
    reporter.fail(`Error validating data integrity: ${e.message}`);
  }
}

// Performance Quick Check
function validatePerformance(reporter) {
  reporter.info("Running basic performance checks...");

  use("mongomasterpro");

  try {
    // Test index usage
    const explain = db.users
      .find({ email: "admin@mongomasterpro.com" })
      .explain("executionStats");

    if (explain.executionStats.executionSuccess) {
      const docsExamined = explain.executionStats.totalDocsExamined;
      const docsReturned = explain.executionStats.totalDocsReturned;

      if (docsExamined === docsReturned && docsReturned <= 1) {
        reporter.pass("Email query using index efficiently");
      } else {
        reporter.warn(
          `Email query examined ${docsExamined} docs for ${docsReturned} results`
        );
      }
    } else {
      reporter.fail("Query execution failed during performance test");
    }

    // Test aggregation pipeline
    const start = new Date();
    const aggResult = db.enrollments
      .aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
      .toArray();
    const duration = new Date() - start;

    if (duration < 100) {
      reporter.pass(`Aggregation query completed in ${duration}ms`);
    } else {
      reporter.warn(
        `Aggregation query took ${duration}ms - consider optimization`
      );
    }
  } catch (e) {
    reporter.fail(`Error during performance validation: ${e.message}`);
  }
}

// Storage and Resource Validation
function validateResources(reporter) {
  reporter.info("Checking storage and resource usage...");

  try {
    const dbStats = db.runCommand({ dbStats: 1 });

    if (dbStats.ok === 1) {
      const storageMB = Math.round(dbStats.storageSize / (1024 * 1024));
      const dataMB = Math.round(dbStats.dataSize / (1024 * 1024));

      reporter.pass(`Database storage: ${storageMB}MB, Data size: ${dataMB}MB`);

      if (storageMB > 1000) {
        reporter.warn(
          "Database storage exceeds 1GB - monitor for optimization"
        );
      }
    } else {
      reporter.fail("Unable to retrieve database statistics");
    }

    // Check collection stats for main collections
    ["users", "courses", "enrollments"].forEach((collName) => {
      try {
        const stats = db.runCommand({ collStats: collName });
        const avgDocSize = Math.round(stats.avgObjSize);

        if (avgDocSize > 0) {
          reporter.pass(
            `${collName}: ${stats.count} docs, avg size ${avgDocSize} bytes`
          );
        }
      } catch (e) {
        reporter.warn(`Cannot get stats for ${collName}: ${e.message}`);
      }
    });
  } catch (e) {
    reporter.fail(`Error checking resources: ${e.message}`);
  }
}

// Main validation function
function runValidation() {
  const reporter = new ValidationReporter();

  print("MongoMasterPro Setup Validation");
  print("=" * 50);
  print(`Started at: ${new Date().toISOString()}`);
  print();

  try {
    validateServerConnection(reporter);
    validateDatabases(reporter);
    validateCollections(reporter);
    validateIndexes(reporter);
    validateSchemas(reporter);
    validateAuthentication(reporter);
    validateDataIntegrity(reporter);
    validatePerformance(reporter);
    validateResources(reporter);
  } catch (error) {
    reporter.fail(`Validation interrupted: ${error.message}`);
  }

  const success = reporter.generateReport();

  print(`\nCompleted at: ${new Date().toISOString()}`);

  if (success) {
    print("\n🎯 Setup validation successful!");
    print("You can now proceed to:");
    print("1. Generate additional data with data_modes.js");
    print("2. Start learning modules in 01_crud/");
  } else {
    print("\n🔧 Please fix the failed validations before proceeding");
    print("Re-run bootstrap.js if major issues are found");
  }

  return success;
}

// Execute validation
runValidation();
