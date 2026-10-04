// File: scripts/00_setup/bootstrap.js
// Atomic setup: databases → collections → indexes → seed data

// Configuration
const CONFIG = {
  databases: {
    main: "mongomasterpro",
    logs: "mmp_logs",
    analytics: "mmp_analytics",
  },
  collections: {
    users: "users",
    courses: "courses",
    enrollments: "enrollments",
    assignments: "assignments",
    submissions: "submissions",
    grades: "grades",
    audit_logs: "audit_logs",
    system_metrics: "system_metrics",
  },
};

// Step 1: Create Databases and Collections
function createDatabasesAndCollections() {
  print("=== Creating Databases and Collections ===");

  // Main application database
  use(CONFIG.databases.main);

  // Create collections with validation schemas
  db.createCollection(CONFIG.collections.users, {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["email", "firstName", "lastName", "role", "createdAt"],
        properties: {
          email: { bsonType: "string", pattern: "^.+@.+..+$" },
          firstName: { bsonType: "string", minLength: 1, maxLength: 50 },
          lastName: { bsonType: "string", minLength: 1, maxLength: 50 },
          role: { enum: ["student", "instructor", "admin"] },
          createdAt: { bsonType: "date" },
          updatedAt: { bsonType: "date" },
        },
      },
    },
  });

  db.createCollection(CONFIG.collections.courses, {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["title", "instructorId", "status", "createdAt"],
        properties: {
          title: { bsonType: "string", minLength: 1, maxLength: 200 },
          description: { bsonType: "string" },
          instructorId: { bsonType: "objectId" },
          status: { enum: ["draft", "review", "active", "archived"] },
          maxStudents: { bsonType: "number", minimum: 1 },
          createdAt: { bsonType: "date" },
          updatedAt: { bsonType: "date" },
        },
      },
    },
  });

  db.createCollection(CONFIG.collections.enrollments, {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["studentId", "courseId", "enrolledAt", "status"],
        properties: {
          studentId: { bsonType: "objectId" },
          courseId: { bsonType: "objectId" },
          enrolledAt: { bsonType: "date" },
          completedAt: { bsonType: "date" },
          status: { enum: ["enrolled", "completed", "dropped", "suspended"] },
          progress: { bsonType: "number", minimum: 0, maximum: 100 },
        },
      },
    },
  });

  db.createCollection(CONFIG.collections.assignments);
  db.createCollection(CONFIG.collections.submissions);
  db.createCollection(CONFIG.collections.grades);

  // Logging database
  use(CONFIG.databases.logs);
  db.createCollection(CONFIG.collections.audit_logs, {
    capped: true,
    size: 100000000, // 100MB
    max: 1000000,
  });

  // Analytics database
  use(CONFIG.databases.analytics);
  db.createCollection(CONFIG.collections.system_metrics);

  print("✓ Databases and collections created successfully");
}

// Step 2: Create Essential Indexes
function createIndexes() {
  print("=== Creating Essential Indexes ===");

  use(CONFIG.databases.main);

  // Users indexes
  db.users.createIndex({ email: 1 }, { unique: true });
  db.users.createIndex({ role: 1 });
  db.users.createIndex({ createdAt: -1 });
  db.users.createIndex({ firstName: "text", lastName: "text" });

  // Courses indexes
  db.courses.createIndex({ instructorId: 1 });
  db.courses.createIndex({ status: 1 });
  db.courses.createIndex({ title: "text", description: "text" });
  db.courses.createIndex({ createdAt: -1 });

  // Enrollments indexes
  db.enrollments.createIndex({ studentId: 1, courseId: 1 }, { unique: true });
  db.enrollments.createIndex({ courseId: 1 });
  db.enrollments.createIndex({ status: 1 });
  db.enrollments.createIndex({ enrolledAt: -1 });

  // Assignments indexes
  db.assignments.createIndex({ courseId: 1 });
  db.assignments.createIndex({ dueDate: 1 });
  db.assignments.createIndex({ createdAt: -1 });

  // Submissions indexes
  db.submissions.createIndex(
    { assignmentId: 1, studentId: 1 },
    { unique: true }
  );
  db.submissions.createIndex({ submittedAt: -1 });
  db.submissions.createIndex({ status: 1 });

  // Grades indexes
  db.grades.createIndex({ studentId: 1, assignmentId: 1 }, { unique: true });
  db.grades.createIndex({ courseId: 1 });
  db.grades.createIndex({ gradedAt: -1 });

  // Audit logs indexes
  use(CONFIG.databases.logs);
  db.audit_logs.createIndex({ timestamp: -1 });
  db.audit_logs.createIndex({ userId: 1 });
  db.audit_logs.createIndex({ action: 1 });

  // Analytics indexes
  use(CONFIG.databases.analytics);
  db.system_metrics.createIndex({ timestamp: -1 });
  db.system_metrics.createIndex({ metricType: 1 });

  print("✓ Essential indexes created successfully");
}

// Step 3: Create Users and Roles
function createUsersAndRoles() {
  print("=== Creating Users and Roles ===");

  use("admin");

  const roles = [
    {
      role: "mmpAppUser",
      privileges: [
        {
          resource: { db: CONFIG.databases.main, collection: "" },
          actions: ["find", "insert", "update", "remove"],
        },
        {
          resource: { db: CONFIG.databases.logs, collection: "" },
          actions: ["find", "insert"],
        },
        {
          resource: { db: CONFIG.databases.analytics, collection: "" },
          actions: ["find", "insert", "update"],
        },
      ],
      roles: [],
    },
    {
      role: "mmpReadOnly",
      privileges: [
        {
          resource: { db: CONFIG.databases.main, collection: "" },
          actions: ["find"],
        },
        {
          resource: { db: CONFIG.databases.logs, collection: "" },
          actions: ["find"],
        },
        {
          resource: { db: CONFIG.databases.analytics, collection: "" },
          actions: ["find"],
        },
      ],
      roles: [],
    },
  ];

  const users = [
    { user: "mmpApp", pwd: "mmpApp2024!", roles: ["mmpAppUser"] },
    { user: "mmpReadOnly", pwd: "mmpRead2024!", roles: ["mmpReadOnly"] },
  ];

  // Each object is created independently so that a pre-existing role does not
  // prevent the remaining roles and users from being created (idempotent re-runs).
  roles.forEach((spec) => {
    try {
      db.createRole(spec);
      print(`✓ Role created: ${spec.role}`);
    } catch (e) {
      if (e.codeName === "DuplicateKey" || /already exists/.test(e.message)) {
        print(`• Role already exists: ${spec.role}`);
      } else {
        throw e;
      }
    }
  });

  users.forEach((spec) => {
    try {
      db.createUser(spec);
      print(`✓ User created: ${spec.user}`);
    } catch (e) {
      if (/already exists/.test(e.message)) {
        print(`• User already exists: ${spec.user}`);
      } else {
        throw e;
      }
    }
  });
}

// Step 0: Reset lab databases
// The lab databases (mongomasterpro, mmp_logs, mmp_analytics) are disposable
// sandboxes for modules 01-05. Dropping them first makes the bootstrap
// idempotent; the curated reference dataset in learning_platform is untouched.
function resetLabDatabases() {
  print("=== Resetting Lab Databases ===");
  Object.values(CONFIG.databases).forEach((name) => {
    db.getSiblingDB(name).dropDatabase();
    print(`✓ Dropped ${name}`);
  });
}

// Step 4: Seed Base Data
function seedBaseData() {
  print("=== Seeding Base Data ===");

  use(CONFIG.databases.main);

  // Seed admin user
  const adminUser = {
    email: "admin@mongomasterpro.com",
    firstName: "System",
    lastName: "Administrator",
    role: "admin",
    isActive: true,
    preferences: {
      theme: "dark",
      notifications: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const adminResult = db.users.insertOne(adminUser);
  print(`✓ Admin user created with ID: ${adminResult.insertedId}`);

  // Seed sample instructor
  const instructorUser = {
    email: "instructor@mongomasterpro.com",
    firstName: "John",
    lastName: "Smith",
    role: "instructor",
    isActive: true,
    bio: "Experienced MongoDB instructor with 10+ years of database expertise",
    specializations: ["MongoDB", "Database Design", "Performance Optimization"],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const instructorResult = db.users.insertOne(instructorUser);
  print(`✓ Instructor user created with ID: ${instructorResult.insertedId}`);

  // Seed sample courses
  const courses = [
    {
      title: "MongoDB Fundamentals",
      description:
        "Learn the basics of MongoDB including CRUD operations, indexing, and schema design",
      instructorId: instructorResult.insertedId,
      status: "active",
      maxStudents: 50,
      duration: "6 weeks",
      difficulty: "beginner",
      tags: ["mongodb", "nosql", "database", "fundamentals"],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      title: "Advanced MongoDB Aggregation",
      description:
        "Master complex aggregation pipelines and data processing techniques",
      instructorId: instructorResult.insertedId,
      status: "active",
      maxStudents: 30,
      duration: "8 weeks",
      difficulty: "advanced",
      tags: ["mongodb", "aggregation", "analytics", "advanced"],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      title: "MongoDB Performance Optimization",
      description:
        "Learn to optimize MongoDB performance through indexing, profiling, and tuning",
      instructorId: instructorResult.insertedId,
      status: "draft",
      maxStudents: 25,
      duration: "4 weeks",
      difficulty: "intermediate",
      tags: ["mongodb", "performance", "optimization", "tuning"],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const coursesResult = db.courses.insertMany(courses);
  print(`✓ ${Object.keys(coursesResult.insertedIds).length} sample courses created`);

  // Seed sample students
  const students = [
    {
      email: "alice@student.com",
      firstName: "Alice",
      lastName: "Johnson",
      role: "student",
      isActive: true,
      profile: {
        experienceLevel: "beginner",
        interests: ["web development", "databases"],
        goals: ["learn mongodb", "build web apps"],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      email: "bob@student.com",
      firstName: "Bob",
      lastName: "Williams",
      role: "student",
      isActive: true,
      profile: {
        experienceLevel: "intermediate",
        interests: ["data analysis", "backend development"],
        goals: ["master aggregation", "optimize queries"],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const studentsResult = db.users.insertMany(students);
  print(`✓ ${Object.keys(studentsResult.insertedIds).length} sample students created`);

  // Create sample enrollments
  const enrollments = [
    {
      studentId: studentsResult.insertedIds[0],
      courseId: coursesResult.insertedIds[0],
      enrolledAt: new Date(),
      status: "enrolled",
      progress: 25.5,
    },
    {
      studentId: studentsResult.insertedIds[1],
      courseId: coursesResult.insertedIds[0],
      enrolledAt: new Date(),
      status: "enrolled",
      progress: 75.0,
    },
    {
      studentId: studentsResult.insertedIds[1],
      courseId: coursesResult.insertedIds[1],
      enrolledAt: new Date(),
      status: "enrolled",
      progress: 15.0,
    },
  ];

  const enrollmentsResult = db.enrollments.insertMany(enrollments);
  print(`✓ ${Object.keys(enrollmentsResult.insertedIds).length} sample enrollments created`);

  // Create initial system metrics
  use(CONFIG.databases.analytics);
  const initialMetrics = {
    metricType: "system_initialization",
    timestamp: new Date(),
    data: {
      totalUsers: 4,
      totalCourses: 3,
      totalEnrollments: 3,
      systemStatus: "initialized",
    },
  };

  db.system_metrics.insertOne(initialMetrics);
  print("✓ Initial system metrics recorded");
}

// Step 5: Validation
function validateSetup() {
  print("=== Validating Setup ===");

  const validation = {
    databases: [],
    collections: [],
    indexes: [],
    data: [],
  };

  // Check databases
  const databases = db
    .adminCommand("listDatabases")
    .databases.map((db) => db.name);
  Object.values(CONFIG.databases).forEach((dbName) => {
    if (databases.includes(dbName)) {
      validation.databases.push(`✓ ${dbName}`);
    } else {
      validation.databases.push(`✗ ${dbName} missing`);
    }
  });

  // Check collections and data
  use(CONFIG.databases.main);
  const collections = db
    .runCommand("listCollections")
    .cursor.firstBatch.map((col) => col.name);

  const homeDatabase = {
    audit_logs: CONFIG.databases.logs,
    system_metrics: CONFIG.databases.analytics,
  };
  Object.values(CONFIG.collections).forEach((collName) => {
    const target = db.getSiblingDB(homeDatabase[collName] || CONFIG.databases.main);
    if (target.getCollectionNames().includes(collName)) {
      validation.collections.push(`✓ ${target.getName()}.${collName}`);
      // Check data count
      const count = target.getCollection(collName).countDocuments();
      validation.data.push(`✓ ${collName}: ${count} documents`);
    } else {
      validation.collections.push(`✗ ${target.getName()}.${collName} missing`);
    }
  });

  // Check key indexes
  const userIndexes = db.users.getIndexes();
  const courseIndexes = db.courses.getIndexes();

  validation.indexes.push(`✓ Users indexes: ${userIndexes.length}`);
  validation.indexes.push(`✓ Courses indexes: ${courseIndexes.length}`);

  // Print validation results
  print("\n=== VALIDATION RESULTS ===");
  print("Databases:");
  validation.databases.forEach((result) => print(`  ${result}`));
  print("\nCollections:");
  validation.collections.forEach((result) => print(`  ${result}`));
  print("\nIndexes:");
  validation.indexes.forEach((result) => print(`  ${result}`));
  print("\nData:");
  validation.data.forEach((result) => print(`  ${result}`));

  print("\n=== BOOTSTRAP COMPLETED ===");
  print("Next steps:");
  print("1. Run validate_setup.js to verify installation");
  print("2. Run data_modes.js to generate additional test data");
  print("3. Proceed with CRUD operations in 01_crud/");
}

// Main execution
function main() {
  print("Starting MongoMasterPro Bootstrap Process...");
  print("==========================================");

  try {
    resetLabDatabases();
    createDatabasesAndCollections();
    createIndexes();
    createUsersAndRoles();
    seedBaseData();
    validateSetup();

    print("\n🎉 Bootstrap completed successfully!");
    print("MongoDB environment is ready for MongoMasterPro learning modules.");
  } catch (error) {
    print(`\n❌ Bootstrap failed: ${error.message}`);
    print("Please check the error details and retry.");
    throw error;
  }
}

// Execute bootstrap
main();
