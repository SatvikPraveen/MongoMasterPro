// File: tests/unit/schema_validation_tests.js
// Schema Validation Unit Tests for MongoMasterPro

const { MongoClient } = require("mongodb");
const { TestHelpers } = require("../utils/test_helpers");
const { AssertionLibrary } = require("../utils/assertion_library");

class SchemaValidationTests {
  constructor() {
    this.client = null;
    this.db = null;
    this.helpers = new TestHelpers();
    this.assertions = new AssertionLibrary();
  }

  async setup() {
    this.client = new MongoClient(
      process.env.MONGODB_URI || "mongodb://localhost:27017"
    );
    await this.client.connect();
    this.db = this.client.db("mongomasterpro_test");
    console.log("✓ Schema Validation Tests - Setup complete");
  }

  async teardown() {
    if (this.client) {
      await this.client.close();
      console.log("✓ Schema Validation Tests - Teardown complete");
    }
  }

  // Test 1: User Schema Validation
  async testUserSchemaValidation() {
    const collectionName = "users_with_validation";

    // Drop existing collection
    await this.db
      .collection(collectionName)
      .drop()
      .catch(() => {});

    // Create collection with JSON schema validation
    await this.db.createCollection(collectionName, {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["email", "name", "role"],
          properties: {
            email: {
              bsonType: "string",
              pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
              description: "Valid email address required",
            },
            name: {
              bsonType: "string",
              minLength: 2,
              maxLength: 50,
              description: "Name must be 2-50 characters",
            },
            role: {
              enum: ["student", "instructor", "admin"],
              description: "Role must be student, instructor, or admin",
            },
            age: {
              bsonType: "int",
              minimum: 13,
              maximum: 120,
              description: "Age must be between 13 and 120",
            },
            preferences: {
              bsonType: "object",
              properties: {
                notifications: { bsonType: "bool" },
                theme: { enum: ["light", "dark"] },
              },
            },
          },
        },
      },
      validationAction: "error",
      validationLevel: "strict",
    });

    const collection = this.db.collection(collectionName);

    // Test valid documents
    const validUsers = [
      {
        email: "student@example.com",
        name: "John Student",
        role: "student",
        age: 25,
        preferences: { notifications: true, theme: "dark" },
      },
      {
        email: "instructor@example.com",
        name: "Jane Instructor",
        role: "instructor",
        age: 35,
      },
    ];

    let insertedCount = 0;
    for (const user of validUsers) {
      try {
        await collection.insertOne(user);
        insertedCount++;
      } catch (error) {
        console.error("Unexpected error inserting valid user:", error.message);
      }
    }

    // Test invalid documents
    const invalidUsers = [
      { email: "invalid-email", name: "Test", role: "student" }, // Invalid email
      { email: "test@example.com", name: "X", role: "student" }, // Name too short
      { email: "test@example.com", name: "Valid Name", role: "invalid" }, // Invalid role
      {
        email: "test@example.com",
        name: "Valid Name",
        role: "student",
        age: 12,
      }, // Age too low
      { name: "Missing Email", role: "student" }, // Missing required field
    ];

    let rejectedCount = 0;
    for (const user of invalidUsers) {
      try {
        await collection.insertOne(user);
      } catch (error) {
        rejectedCount++;
      }
    }

    this.assertions.assertEqual(
      insertedCount,
      2,
      "Should insert 2 valid users"
    );
    this.assertions.assertEqual(
      rejectedCount,
      5,
      "Should reject 5 invalid users"
    );

    console.log("✓ User schema validation test passed");
    return { validInserted: insertedCount, invalidRejected: rejectedCount };
  }

  // Test 2: Course Schema Validation
  async testCourseSchemaValidation() {
    const collectionName = "courses_with_validation";

    await this.db
      .collection(collectionName)
      .drop()
      .catch(() => {});

    await this.db.createCollection(collectionName, {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["title", "description", "price", "instructor", "category"],
          properties: {
            title: {
              bsonType: "string",
              minLength: 5,
              maxLength: 100,
              description: "Title must be 5-100 characters",
            },
            description: {
              bsonType: "string",
              minLength: 20,
              description: "Description must be at least 20 characters",
            },
            price: {
              bsonType: "number",
              minimum: 0,
              maximum: 1000,
              description: "Price must be between 0 and 1000",
            },
            instructor: {
              bsonType: "string",
              minLength: 2,
              description: "Instructor name required",
            },
            category: {
              enum: [
                "programming",
                "design",
                "business",
                "data-science",
                "marketing",
              ],
              description: "Valid category required",
            },
            tags: {
              bsonType: "array",
              items: { bsonType: "string" },
              maxItems: 10,
              description: "Tags must be array of strings, max 10 items",
            },
            duration: {
              bsonType: "object",
              required: ["hours", "minutes"],
              properties: {
                hours: { bsonType: "int", minimum: 0, maximum: 100 },
                minutes: { bsonType: "int", minimum: 0, maximum: 59 },
              },
            },
          },
        },
      },
    });

    const collection = this.db.collection(collectionName);

    // Valid courses
    const validCourses = [
      {
        title: "Advanced MongoDB Techniques",
        description:
          "Learn advanced MongoDB operations and optimization techniques",
        price: 199.99,
        instructor: "MongoDB Expert",
        category: "programming",
        tags: ["mongodb", "database", "nosql"],
        duration: { hours: 12, minutes: 30 },
      },
    ];

    // Invalid courses
    const invalidCourses = [
      {
        // Missing required fields
        title: "Short Course",
        price: 99.99,
      },
      {
        // Price out of range
        title: "Expensive Course Here",
        description: "This course costs too much",
        price: 1500,
        instructor: "Expensive Teacher",
        category: "business",
      },
      {
        // Invalid category
        title: "Invalid Category Course",
        description: "This course has an invalid category specified",
        price: 99.99,
        instructor: "Valid Teacher",
        category: "invalid-category",
      },
    ];

    let validInserted = 0;
    let invalidRejected = 0;

    for (const course of validCourses) {
      try {
        await collection.insertOne(course);
        validInserted++;
      } catch (error) {
        console.error("Unexpected error with valid course:", error.message);
      }
    }

    for (const course of invalidCourses) {
      try {
        await collection.insertOne(course);
      } catch (error) {
        invalidRejected++;
      }
    }

    this.assertions.assertEqual(
      validInserted,
      1,
      "Should insert 1 valid course"
    );
    this.assertions.assertEqual(
      invalidRejected,
      3,
      "Should reject 3 invalid courses"
    );

    console.log("✓ Course schema validation test passed");
    return { validInserted, invalidRejected };
  }

  // Test 3: Nested Document Schema Validation
  async testNestedDocumentValidation() {
    const collectionName = "profiles_with_nested_validation";

    await this.db
      .collection(collectionName)
      .drop()
      .catch(() => {});

    await this.db.createCollection(collectionName, {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["userId", "profile"],
          properties: {
            userId: { bsonType: "string" },
            profile: {
              bsonType: "object",
              required: ["personalInfo", "settings"],
              properties: {
                personalInfo: {
                  bsonType: "object",
                  required: ["firstName", "lastName"],
                  properties: {
                    firstName: { bsonType: "string", minLength: 1 },
                    lastName: { bsonType: "string", minLength: 1 },
                    bio: { bsonType: "string", maxLength: 500 },
                  },
                },
                settings: {
                  bsonType: "object",
                  properties: {
                    privacy: { enum: ["public", "private", "friends"] },
                    notifications: {
                      bsonType: "object",
                      properties: {
                        email: { bsonType: "bool" },
                        sms: { bsonType: "bool" },
                        push: { bsonType: "bool" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const collection = this.db.collection(collectionName);

    // Valid nested document
    const validProfile = {
      userId: "user123",
      profile: {
        personalInfo: {
          firstName: "John",
          lastName: "Doe",
          bio: "Software developer with 5 years of experience",
        },
        settings: {
          privacy: "public",
          notifications: {
            email: true,
            sms: false,
            push: true,
          },
        },
      },
    };

    // Invalid nested documents
    const invalidProfiles = [
      {
        // Missing nested required field
        userId: "user456",
        profile: {
          personalInfo: { firstName: "Jane" }, // Missing lastName
          settings: { privacy: "private" },
        },
      },
      {
        // Invalid enum value
        userId: "user789",
        profile: {
          personalInfo: { firstName: "Bob", lastName: "Smith" },
          settings: { privacy: "invalid-privacy-setting" },
        },
      },
    ];

    let validCount = 0;
    let invalidCount = 0;

    try {
      await collection.insertOne(validProfile);
      validCount++;
    } catch (error) {
      console.error(
        "Unexpected error with valid nested document:",
        error.message
      );
    }

    for (const profile of invalidProfiles) {
      try {
        await collection.insertOne(profile);
      } catch (error) {
        invalidCount++;
      }
    }

    this.assertions.assertEqual(
      validCount,
      1,
      "Should insert 1 valid nested document"
    );
    this.assertions.assertEqual(
      invalidCount,
      2,
      "Should reject 2 invalid nested documents"
    );

    console.log("✓ Nested document validation test passed");
    return { validCount, invalidCount };
  }

  // Test 4: Array Schema Validation
  async testArraySchemaValidation() {
    const collectionName = "courses_with_array_validation";

    await this.db
      .collection(collectionName)
      .drop()
      .catch(() => {});

    await this.db.createCollection(collectionName, {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["title", "modules"],
          properties: {
            title: { bsonType: "string" },
            modules: {
              bsonType: "array",
              minItems: 1,
              maxItems: 20,
              items: {
                bsonType: "object",
                required: ["name", "duration", "lessons"],
                properties: {
                  name: { bsonType: "string", minLength: 3 },
                  duration: { bsonType: "int", minimum: 1 },
                  lessons: {
                    bsonType: "array",
                    items: {
                      bsonType: "object",
                      required: ["title", "type"],
                      properties: {
                        title: { bsonType: "string" },
                        type: { enum: ["video", "text", "quiz", "assignment"] },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const collection = this.db.collection(collectionName);

    // Valid course with array structure
    const validCourse = {
      title: "JavaScript Fundamentals",
      modules: [
        {
          name: "Introduction",
          duration: 60,
          lessons: [
            { title: "What is JavaScript?", type: "video" },
            { title: "Setting up Environment", type: "text" },
          ],
        },
        {
          name: "Variables and Types",
          duration: 90,
          lessons: [
            { title: "Declaring Variables", type: "video" },
            { title: "Practice Quiz", type: "quiz" },
          ],
        },
      ],
    };

    // Invalid courses
    const invalidCourses = [
      {
        // Empty modules array
        title: "Empty Course",
        modules: [],
      },
      {
        // Invalid lesson type
        title: "Invalid Lesson Type",
        modules: [
          {
            name: "Module 1",
            duration: 60,
            lessons: [{ title: "Invalid Lesson", type: "invalid-type" }],
          },
        ],
      },
    ];

    let validCount = 0;
    let invalidCount = 0;

    try {
      await collection.insertOne(validCourse);
      validCount++;
    } catch (error) {
      console.error(
        "Unexpected error with valid array document:",
        error.message
      );
    }

    for (const course of invalidCourses) {
      try {
        await collection.insertOne(course);
      } catch (error) {
        invalidCount++;
      }
    }

    this.assertions.assertEqual(
      validCount,
      1,
      "Should insert 1 valid course with arrays"
    );
    this.assertions.assertEqual(
      invalidCount,
      2,
      "Should reject 2 invalid courses"
    );

    console.log("✓ Array schema validation test passed");
    return { validCount, invalidCount };
  }

  // Test 5: Schema Migration Validation
  async testSchemaMigrationValidation() {
    const collectionName = "users_migration_test";

    await this.db
      .collection(collectionName)
      .drop()
      .catch(() => {});

    // Create collection with version 1 schema
    await this.db.createCollection(collectionName, {
      validator: {
        $or: [
          {
            // Version 1 schema
            $jsonSchema: {
              bsonType: "object",
              required: ["email", "name", "version"],
              properties: {
                version: { enum: [1] },
                email: { bsonType: "string" },
                name: { bsonType: "string" },
              },
            },
          },
          {
            // Version 2 schema
            $jsonSchema: {
              bsonType: "object",
              required: ["email", "profile", "version"],
              properties: {
                version: { enum: [2] },
                email: { bsonType: "string" },
                profile: {
                  bsonType: "object",
                  required: ["firstName", "lastName"],
                  properties: {
                    firstName: { bsonType: "string" },
                    lastName: { bsonType: "string" },
                  },
                },
              },
            },
          },
        ],
      },
    });

    const collection = this.db.collection(collectionName);

    // Insert documents with both schema versions
    const documents = [
      { version: 1, email: "old@example.com", name: "Old Format User" },
      {
        version: 2,
        email: "new@example.com",
        profile: { firstName: "New", lastName: "Format" },
      },
    ];

    let insertedCount = 0;
    for (const doc of documents) {
      try {
        await collection.insertOne(doc);
        insertedCount++;
      } catch (error) {
        console.error("Error inserting migration document:", error.message);
      }
    }

    // Test invalid document that doesn't match either schema
    try {
      await collection.insertOne({ version: 3, invalidField: "test" });
    } catch (error) {
      // Expected to fail
    }

    this.assertions.assertEqual(
      insertedCount,
      2,
      "Should insert documents with both schema versions"
    );

    console.log("✓ Schema migration validation test passed");
    return { insertedCount };
  }

  // Run all schema validation tests
  async runAllTests() {
    console.log("\n=== Starting Schema Validation Unit Tests ===");

    await this.setup();

    const results = {};

    try {
      results.userSchema = await this.testUserSchemaValidation();
      results.courseSchema = await this.testCourseSchemaValidation();
      results.nestedDocument = await this.testNestedDocumentValidation();
      results.arraySchema = await this.testArraySchemaValidation();
      results.schemaMigration = await this.testSchemaMigrationValidation();

      console.log("\n✅ All Schema Validation Tests Passed!");
      console.log("Results Summary:", JSON.stringify(results, null, 2));
    } catch (error) {
      console.error("❌ Schema Validation Tests Failed:", error.message);
      throw error;
    } finally {
      await this.teardown();
    }

    return results;
  }
}

// Export for use in other modules
module.exports = { SchemaValidationTests };

// Run tests if called directly
if (require.main === module) {
  const tests = new SchemaValidationTests();
  tests.runAllTests().catch(console.error);
}
