// Location: `/docker/init/bootstrap.js`
// MongoDB Bootstrap Script - Consolidated setup for users, roles, databases, collections, and indexes

print("🚀 Starting MongoMasterPro Bootstrap Process...");

// Switch to admin database for initial setup
use("admin");

print("📊 Current database stats:");
printjson(db.runCommand("listCollections"));

// =============================================================================
// USER AND ROLE MANAGEMENT
// =============================================================================

print("\n👥 Setting up users and roles...");

// Create custom roles for learning platform
try {
  db.createRole({
    role: "learningPlatformAdmin",
    privileges: [
      {
        resource: { db: "learning_platform", collection: "" },
        actions: [
          "find",
          "insert",
          "update",
          "remove",
          "createIndex",
          "dropIndex",
          "createCollection",
          "dropCollection",
          "collStats",
          "dbStats",
        ],
      },
      {
        resource: { db: "learning_platform_test", collection: "" },
        actions: [
          "find",
          "insert",
          "update",
          "remove",
          "createIndex",
          "dropIndex",
          "createCollection",
          "dropCollection",
          "collStats",
          "dbStats",
        ],
      },
    ],
    roles: [],
  });
  print("✅ Created learningPlatformAdmin role");
} catch (e) {
  print("⚠️ Role learningPlatformAdmin already exists or error: " + e.message);
}

try {
  db.createRole({
    role: "learningPlatformReadOnly",
    privileges: [
      {
        resource: { db: "learning_platform", collection: "" },
        actions: ["find", "collStats", "dbStats"],
      },
    ],
    roles: [],
  });
  print("✅ Created learningPlatformReadOnly role");
} catch (e) {
  print(
    "⚠️ Role learningPlatformReadOnly already exists or error: " + e.message
  );
}

// Create application users
try {
  db.createUser({
    user: "app_user",
    pwd: "app_secure_pass",
    roles: [
      { role: "learningPlatformAdmin", db: "admin" },
      { role: "readWrite", db: "learning_platform" },
      { role: "readWrite", db: "learning_platform_test" },
    ],
  });
  print("✅ Created app_user");
} catch (e) {
  print("⚠️ User app_user already exists or error: " + e.message);
}

try {
  db.createUser({
    user: "readonly_user",
    pwd: "readonly_pass",
    roles: [
      { role: "learningPlatformReadOnly", db: "admin" },
      { role: "read", db: "learning_platform" },
    ],
  });
  print("✅ Created readonly_user");
} catch (e) {
  print("⚠️ User readonly_user already exists or error: " + e.message);
}

try {
  db.createUser({
    user: "analytics_user",
    pwd: "analytics_pass",
    roles: [
      { role: "read", db: "learning_platform" },
      { role: "readWrite", db: "analytics" },
    ],
  });
  print("✅ Created analytics_user");
} catch (e) {
  print("⚠️ User analytics_user already exists or error: " + e.message);
}

// =============================================================================
// DATABASE AND COLLECTION SETUP
// =============================================================================

print("\n🗄️ Setting up databases and collections...");

// Switch to learning platform database
use("learning_platform");

// Users collection
try {
  db.createCollection("users", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["email", "username", "created_at"],
        properties: {
          email: {
            bsonType: "string",
            pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
          },
          username: { bsonType: "string", minLength: 3, maxLength: 50 },
          password_hash: { bsonType: "string" },
          profile: {
            bsonType: "object",
            properties: {
              first_name: { bsonType: "string" },
              last_name: { bsonType: "string" },
              bio: { bsonType: "string" },
              avatar_url: { bsonType: "string" },
              social_links: { bsonType: "array" },
            },
          },
          preferences: {
            bsonType: "object",
            properties: {
              language: { bsonType: "string" },
              timezone: { bsonType: "string" },
              email_notifications: { bsonType: "bool" },
              difficulty_level: {
                enum: ["beginner", "intermediate", "advanced"],
              },
            },
          },
          status: { enum: ["active", "inactive", "suspended"] },
          created_at: { bsonType: "date" },
          updated_at: { bsonType: "date" },
        },
      },
    },
  });
  print("✅ Created users collection with validation");
} catch (e) {
  print("⚠️ Users collection setup error: " + e.message);
}

// Courses collection
try {
  db.createCollection("courses", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["title", "instructor_id", "category", "created_at"],
        properties: {
          title: { bsonType: "string", minLength: 5, maxLength: 200 },
          description: { bsonType: "string", maxLength: 2000 },
          instructor_id: { bsonType: "objectId" },
          category: { bsonType: "string" },
          tags: { bsonType: "array", items: { bsonType: "string" } },
          difficulty_level: { enum: ["beginner", "intermediate", "advanced"] },
          duration_hours: { bsonType: "number", minimum: 0.5, maximum: 1000 },
          price: { bsonType: "number", minimum: 0 },
          currency: { bsonType: "string", minLength: 3, maxLength: 3 },
          content: {
            bsonType: "object",
            properties: {
              modules: { bsonType: "array" },
              resources: { bsonType: "array" },
              assignments: { bsonType: "array" },
            },
          },
          enrollment_count: { bsonType: "int", minimum: 0 },
          rating: {
            bsonType: "object",
            properties: {
              average: { bsonType: "number", minimum: 0, maximum: 5 },
              count: { bsonType: "int", minimum: 0 },
            },
          },
          status: { enum: ["draft", "published", "archived"] },
          created_at: { bsonType: "date" },
          updated_at: { bsonType: "date" },
        },
      },
    },
  });
  print("✅ Created courses collection with validation");
} catch (e) {
  print("⚠️ Courses collection setup error: " + e.message);
}

// Enrollments collection
try {
  db.createCollection("enrollments", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["user_id", "course_id", "enrolled_at"],
        properties: {
          user_id: { bsonType: "objectId" },
          course_id: { bsonType: "objectId" },
          progress: {
            bsonType: "object",
            properties: {
              percentage: { bsonType: "number", minimum: 0, maximum: 100 },
              completed_modules: { bsonType: "array" },
              current_module: { bsonType: "string" },
              last_accessed: { bsonType: "date" },
            },
          },
          completion_status: {
            enum: ["not_started", "in_progress", "completed", "dropped"],
          },
          completion_date: { bsonType: "date" },
          certificate_issued: { bsonType: "bool" },
          enrolled_at: { bsonType: "date" },
          updated_at: { bsonType: "date" },
        },
      },
    },
  });
  print("✅ Created enrollments collection with validation");
} catch (e) {
  print("⚠️ Enrollments collection setup error: " + e.message);
}

// Reviews collection
try {
  db.createCollection("reviews", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["user_id", "course_id", "rating", "created_at"],
        properties: {
          user_id: { bsonType: "objectId" },
          course_id: { bsonType: "objectId" },
          rating: { bsonType: "int", minimum: 1, maximum: 5 },
          title: { bsonType: "string", maxLength: 100 },
          comment: { bsonType: "string", maxLength: 1000 },
          helpful_votes: { bsonType: "int", minimum: 0 },
          verified_purchase: { bsonType: "bool" },
          created_at: { bsonType: "date" },
          updated_at: { bsonType: "date" },
        },
      },
    },
  });
  print("✅ Created reviews collection with validation");
} catch (e) {
  print("⚠️ Reviews collection setup error: " + e.message);
}

// Categories collection
try {
  db.createCollection("categories", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["name", "created_at"],
        properties: {
          name: { bsonType: "string", minLength: 2, maxLength: 100 },
          description: { bsonType: "string", maxLength: 500 },
          parent_id: { bsonType: "objectId" },
          level: { bsonType: "int", minimum: 0, maximum: 5 },
          course_count: { bsonType: "int", minimum: 0 },
          status: { enum: ["active", "inactive"] },
          created_at: { bsonType: "date" },
          updated_at: { bsonType: "date" },
        },
      },
    },
  });
  print("✅ Created categories collection with validation");
} catch (e) {
  print("⚠️ Categories collection setup error: " + e.message);
}

// Analytics collection (for reporting and metrics)
try {
  db.createCollection("analytics_events", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["user_id", "event_type", "timestamp"],
        properties: {
          user_id: { bsonType: "objectId" },
          event_type: {
            enum: [
              "login",
              "logout",
              "course_view",
              "enrollment",
              "completion",
              "quiz_attempt",
              "video_play",
              "download",
            ],
          },
          course_id: { bsonType: "objectId" },
          session_id: { bsonType: "string" },
          properties: { bsonType: "object" },
          timestamp: { bsonType: "date" },
        },
      },
    },
  });
  print("✅ Created analytics_events collection with validation");
} catch (e) {
  print("⚠️ Analytics events collection setup error: " + e.message);
}

// =============================================================================
// INDEX CREATION
// =============================================================================

print("\n📊 Creating optimized indexes...");

// Users indexes
try {
  db.users.createIndex(
    { email: 1 },
    { unique: true, name: "idx_users_email_unique" }
  );
  db.users.createIndex(
    { username: 1 },
    { unique: true, name: "idx_users_username_unique" }
  );
  db.users.createIndex(
    { status: 1, created_at: -1 },
    { name: "idx_users_status_created" }
  );
  db.users.createIndex(
    { "profile.first_name": 1, "profile.last_name": 1 },
    { name: "idx_users_name" }
  );
  db.users.createIndex(
    { "preferences.language": 1 },
    { name: "idx_users_language" }
  );
  print("✅ Created users indexes");
} catch (e) {
  print("⚠️ Users indexes error: " + e.message);
}

// Courses indexes
try {
  db.courses.createIndex(
    { title: "text", description: "text" },
    { name: "idx_courses_text_search" }
  );
  db.courses.createIndex(
    { instructor_id: 1, status: 1 },
    { name: "idx_courses_instructor_status" }
  );
  db.courses.createIndex(
    { category: 1, difficulty_level: 1 },
    { name: "idx_courses_category_difficulty" }
  );
  db.courses.createIndex({ tags: 1 }, { name: "idx_courses_tags" });
  db.courses.createIndex(
    { "rating.average": -1, enrollment_count: -1 },
    { name: "idx_courses_popular" }
  );
  db.courses.createIndex(
    { price: 1, currency: 1 },
    { name: "idx_courses_price" }
  );
  db.courses.createIndex({ created_at: -1 }, { name: "idx_courses_created" });
  print("✅ Created courses indexes");
} catch (e) {
  print("⚠️ Courses indexes error: " + e.message);
}

// Enrollments indexes
try {
  db.enrollments.createIndex(
    { user_id: 1, course_id: 1 },
    { unique: true, name: "idx_enrollments_user_course_unique" }
  );
  db.enrollments.createIndex(
    { course_id: 1, completion_status: 1 },
    { name: "idx_enrollments_course_status" }
  );
  db.enrollments.createIndex(
    { user_id: 1, enrolled_at: -1 },
    { name: "idx_enrollments_user_enrolled" }
  );
  db.enrollments.createIndex(
    { completion_status: 1, completion_date: -1 },
    { name: "idx_enrollments_completion" }
  );
  db.enrollments.createIndex(
    { "progress.last_accessed": 1 },
    { name: "idx_enrollments_last_accessed" }
  );
  print("✅ Created enrollments indexes");
} catch (e) {
  print("⚠️ Enrollments indexes error: " + e.message);
}

// Reviews indexes
try {
  db.reviews.createIndex(
    { course_id: 1, rating: -1 },
    { name: "idx_reviews_course_rating" }
  );
  db.reviews.createIndex(
    { user_id: 1, created_at: -1 },
    { name: "idx_reviews_user_created" }
  );
  db.reviews.createIndex(
    { helpful_votes: -1 },
    { name: "idx_reviews_helpful" }
  );
  db.reviews.createIndex(
    { verified_purchase: 1, rating: 1 },
    { name: "idx_reviews_verified_rating" }
  );
  print("✅ Created reviews indexes");
} catch (e) {
  print("⚠️ Reviews indexes error: " + e.message);
}

// Categories indexes
try {
  db.categories.createIndex(
    { name: 1 },
    { unique: true, name: "idx_categories_name_unique" }
  );
  db.categories.createIndex(
    { parent_id: 1, level: 1 },
    { name: "idx_categories_hierarchy" }
  );
  db.categories.createIndex(
    { status: 1, course_count: -1 },
    { name: "idx_categories_active_popular" }
  );
  print("✅ Created categories indexes");
} catch (e) {
  print("⚠️ Categories indexes error: " + e.message);
}

// Analytics indexes
try {
  db.analytics_events.createIndex(
    { user_id: 1, timestamp: -1 },
    { name: "idx_analytics_user_time" }
  );
  db.analytics_events.createIndex(
    { event_type: 1, timestamp: -1 },
    { name: "idx_analytics_event_time" }
  );
  db.analytics_events.createIndex(
    { course_id: 1, event_type: 1 },
    { name: "idx_analytics_course_event" }
  );
  db.analytics_events.createIndex(
    { timestamp: 1 },
    { expireAfterSeconds: 7776000, name: "idx_analytics_ttl" }
  ); // 90 days TTL
  print("✅ Created analytics indexes");
} catch (e) {
  print("⚠️ Analytics indexes error: " + e.message);
}

// =============================================================================
// SEED DATA INSERTION
// =============================================================================

print("\n🌱 Inserting seed data...");

// Insert categories
try {
  const categories = [
    {
      name: "Programming",
      description: "Software development and programming languages",
      level: 0,
      course_count: 0,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      name: "Data Science",
      description: "Data analysis, machine learning, and statistics",
      level: 0,
      course_count: 0,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      name: "Web Development",
      description: "Frontend and backend web technologies",
      level: 0,
      course_count: 0,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      name: "Database",
      description: "Database design, administration, and optimization",
      level: 0,
      course_count: 0,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      name: "DevOps",
      description: "Infrastructure, deployment, and operations",
      level: 0,
      course_count: 0,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  const categoryResult = db.categories.insertMany(categories);
  print(`✅ Inserted ${categoryResult.insertedIds.length} categories`);
} catch (e) {
  print("⚠️ Categories seed data error: " + e.message);
}

// Insert sample instructors
try {
  const instructors = [
    {
      email: "john.doe@mongomaster.com",
      username: "johndoe",
      password_hash:
        "$2b$10$rQZ1vKn7tFzr8YhN.E1oC.2X3q4W5e6R7t8Y9u0I1o2P3a4S5d6F",
      profile: {
        first_name: "John",
        last_name: "Doe",
        bio: "Senior MongoDB Expert with 10+ years of database experience",
        avatar_url: "https://example.com/avatars/johndoe.jpg",
      },
      preferences: {
        language: "en",
        timezone: "UTC",
        email_notifications: true,
        difficulty_level: "advanced",
      },
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      email: "jane.smith@mongomaster.com",
      username: "janesmith",
      password_hash:
        "$2b$10$rQZ1vKn7tFzr8YhN.E1oC.2X3q4W5e6R7t8Y9u0I1o2P3a4S5d6F",
      profile: {
        first_name: "Jane",
        last_name: "Smith",
        bio: "Full-stack developer and database architect",
        avatar_url: "https://example.com/avatars/janesmith.jpg",
      },
      preferences: {
        language: "en",
        timezone: "UTC",
        email_notifications: true,
        difficulty_level: "advanced",
      },
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  const userResult = db.users.insertMany(instructors);
  print(`✅ Inserted ${userResult.insertedIds.length} instructors`);

  // Store instructor IDs for course creation
  const instructorIds = Object.values(userResult.insertedIds);

  // Insert sample courses
  const dbCategory = db.categories.findOne({ name: "Database" });
  const progCategory = db.categories.findOne({ name: "Programming" });

  const courses = [
    {
      title: "MongoDB Fundamentals and Best Practices",
      description:
        "Comprehensive guide to MongoDB basics, data modeling, and optimization techniques",
      instructor_id: instructorIds[0],
      category: "Database",
      tags: ["mongodb", "nosql", "database", "fundamentals"],
      difficulty_level: "beginner",
      duration_hours: 12.5,
      price: 99.99,
      currency: "USD",
      content: {
        modules: [
          "Introduction",
          "CRUD Operations",
          "Indexing",
          "Aggregation",
          "Data Modeling",
        ],
        resources: ["Video Lectures", "Practice Exercises", "Code Examples"],
        assignments: [
          "Build a Simple App",
          "Design a Schema",
          "Optimize Queries",
        ],
      },
      enrollment_count: 0,
      rating: { average: 0, count: 0 },
      status: "published",
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      title: "Advanced MongoDB Performance Tuning",
      description:
        "Deep dive into MongoDB performance optimization, sharding, and replication",
      instructor_id: instructorIds[1],
      category: "Database",
      tags: ["mongodb", "performance", "optimization", "advanced"],
      difficulty_level: "advanced",
      duration_hours: 20.0,
      price: 199.99,
      currency: "USD",
      content: {
        modules: [
          "Performance Analysis",
          "Index Optimization",
          "Sharding",
          "Replication",
          "Monitoring",
        ],
        resources: [
          "Advanced Tutorials",
          "Real-world Case Studies",
          "Performance Scripts",
        ],
        assignments: [
          "Performance Audit",
          "Sharding Strategy",
          "Monitoring Setup",
        ],
      },
      enrollment_count: 0,
      rating: { average: 0, count: 0 },
      status: "published",
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  const courseResult = db.courses.insertMany(courses);
  print(`✅ Inserted ${courseResult.insertedIds.length} courses`);
} catch (e) {
  print("⚠️ Seed data insertion error: " + e.message);
}

// =============================================================================
// ANALYTICS DATABASE SETUP
// =============================================================================

print("\n📈 Setting up analytics database...");

use("analytics");

try {
  db.createCollection("daily_stats", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["date", "metric_type"],
        properties: {
          date: { bsonType: "date" },
          metric_type: {
            enum: ["users", "courses", "enrollments", "completions", "revenue"],
          },
          value: { bsonType: "number" },
          metadata: { bsonType: "object" },
        },
      },
    },
  });

  db.daily_stats.createIndex(
    { date: -1, metric_type: 1 },
    { name: "idx_daily_stats_date_type" }
  );
  print("✅ Created analytics database with daily_stats collection");
} catch (e) {
  print("⚠️ Analytics database setup error: " + e.message);
}

// =============================================================================
// FINAL VALIDATION
// =============================================================================

print("\n✅ Bootstrap complete! Final validation:");

use("learning_platform");

print("📊 Collection counts:");
print("- Users: " + db.users.countDocuments());
print("- Courses: " + db.courses.countDocuments());
print("- Categories: " + db.categories.countDocuments());
print("- Enrollments: " + db.enrollments.countDocuments());
print("- Reviews: " + db.reviews.countDocuments());
print("- Analytics Events: " + db.analytics_events.countDocuments());

print("\n📋 Index summary:");
const collections = [
  "users",
  "courses",
  "enrollments",
  "reviews",
  "categories",
  "analytics_events",
];
collections.forEach((collName) => {
  const indexes = db.getCollection(collName).getIndexes();
  print(`- ${collName}: ${indexes.length} indexes`);
});

print("\n🎉 MongoMasterPro is ready for learning!");
print("💡 Next steps:");
print(
  "   1. Run data generation: python3 /app/data/generators/generate_data.py --mode lite"
);
print("   2. Start with Module 01: CRUD operations");
print("   3. Use validation scripts to verify setup");
print("   4. Begin your MongoDB mastery journey!");

print("\n🔗 Access URLs:");
print(
  "   - MongoDB: mongodb://app_user:app_secure_pass@localhost:27017/learning_platform"
);
print("   - Mongo Express: http://localhost:8081 (admin/express123)");
print("   - Documentation: /app/docs/learning_path.md");

print("===============================================");
