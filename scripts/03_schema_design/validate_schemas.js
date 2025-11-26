// File: scripts/03_schema_design/validate_schemas.js
// Schema validation rules, constraints, and data integrity checks

use("learning_platform");

print("MongoDB Schema Design: Schema Validation");
print("=" * 50);

// =================================================================
// SCHEMA VALIDATION FRAMEWORK
// =================================================================

class SchemaValidator {
  constructor() {
    this.testsPassed = 0;
    this.testsFailed = 0;
    this.warnings = 0;
    this.results = [];
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

  generateReport() {
    const totalTests = this.testsPassed + this.testsFailed;
    const passRate =
      totalTests > 0 ? ((this.testsPassed / totalTests) * 100).toFixed(1) : 0;

    print("\n" + "=".repeat(60));
    print("SCHEMA VALIDATION REPORT");
    print("=".repeat(60));
    print(`Total Tests: ${totalTests}`);
    print(`Passed: ${this.testsPassed}`);
    print(`Failed: ${this.testsFailed}`);
    print(`Warnings: ${this.warnings}`);
    print(`Pass Rate: ${passRate}%`);

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
        ? "\n🎉 ALL SCHEMA TESTS PASSED!"
        : "\n⚠ SOME SCHEMA TESTS FAILED"
    );
    return this.testsFailed === 0;
  }
}

const validator = new SchemaValidator();

print("\n🧪 STARTING SCHEMA VALIDATION TESTS");
print("-".repeat(50));

// =================================================================
// JSON SCHEMA VALIDATION SETUP
// =================================================================

print("\n📋 JSON SCHEMA VALIDATION SETUP");
print("-" * 30);

// Clean up test collections
db.validated_products.drop();
db.validated_orders.drop();
db.validated_reviews.drop();

// 1. Create collection with comprehensive validation schema
print("1. Creating collections with JSON Schema validation");

const productSchema = {
  $jsonSchema: {
    bsonType: "object",
    required: ["name", "category", "price", "status", "createdAt"],
    properties: {
      name: {
        bsonType: "string",
        minLength: 1,
        maxLength: 200,
        description: "Product name must be a string between 1-200 characters",
      },
      category: {
        enum: ["electronics", "books", "clothing", "home", "sports", "toys"],
        description: "Category must be one of the predefined values",
      },
      price: {
        bsonType: "double",
        minimum: 0,
        maximum: 10000,
        description: "Price must be a positive number up to 10000",
      },
      description: {
        bsonType: "string",
        maxLength: 1000,
        description: "Description cannot exceed 1000 characters",
      },
      tags: {
        bsonType: "array",
        maxItems: 20,
        uniqueItems: true,
        items: {
          bsonType: "string",
          maxLength: 50,
        },
        description: "Tags must be unique strings, max 20 items, 50 chars each",
      },
      status: {
        enum: ["draft", "active", "discontinued", "out_of_stock"],
        description: "Status must be one of the valid states",
      },
      inventory: {
        bsonType: "object",
        properties: {
          quantity: {
            bsonType: "int",
            minimum: 0,
            description: "Quantity must be non-negative integer",
          },
          warehouse: {
            bsonType: "string",
            minLength: 1,
            description: "Warehouse must be specified",
          },
        },
      },
      rating: {
        bsonType: "object",
        properties: {
          average: {
            bsonType: "double",
            minimum: 0,
            maximum: 5,
          },
          count: {
            bsonType: "int",
            minimum: 0,
          },
        },
      },
      createdAt: {
        bsonType: "date",
        description: "Creation date is required",
      },
      updatedAt: {
        bsonType: "date",
      },
    },
    additionalProperties: false,
  },
};

try {
  db.createCollection("validated_products", { validator: productSchema });
  validator.assert(
    true,
    "Product collection with JSON Schema validation created"
  );
} catch (error) {
  validator.assert(false, "Product collection creation", error.message);
}

// 2. Create order validation schema with more complex rules
const orderSchema = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "orderNumber",
      "customerId",
      "items",
      "status",
      "total",
      "createdAt",
    ],
    properties: {
      orderNumber: {
        bsonType: "string",
        pattern: "^ORD-[0-9]{4}-[0-9]{6}$",
        description: "Order number must match format ORD-YYYY-NNNNNN",
      },
      customerId: {
        bsonType: "objectId",
        description: "Customer ID must be a valid ObjectId",
      },
      items: {
        bsonType: "array",
        minItems: 1,
        maxItems: 50,
        items: {
          bsonType: "object",
          required: ["productId", "quantity", "price"],
          properties: {
            productId: { bsonType: "objectId" },
            quantity: { bsonType: "int", minimum: 1, maximum: 100 },
            price: { bsonType: "double", minimum: 0 },
          },
        },
      },
      status: {
        enum: [
          "pending",
          "confirmed",
          "shipped",
          "delivered",
          "cancelled",
          "returned",
        ],
      },
      total: {
        bsonType: "double",
        minimum: 0,
        maximum: 100000,
      },
      shippingAddress: {
        bsonType: "object",
        required: ["street", "city", "country"],
        properties: {
          street: { bsonType: "string", minLength: 5, maxLength: 200 },
          city: { bsonType: "string", minLength: 2, maxLength: 100 },
          state: { bsonType: "string", maxLength: 100 },
          zipCode: { bsonType: "string", maxLength: 20 },
          country: { bsonType: "string", minLength: 2, maxLength: 100 },
        },
      },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
  },
};

try {
  db.createCollection("validated_orders", { validator: orderSchema });
  validator.assert(true, "Order collection with complex validation created");
} catch (error) {
  validator.assert(false, "Order collection creation", error.message);
}

// =================================================================
// TESTING VALIDATION RULES
// =================================================================

print("\n🧪 TESTING VALIDATION RULES");
print("-" * 30);

// 3. Test valid document insertion
print("3. Testing valid document insertion");

const validProduct = {
  name: "MongoDB Complete Guide",
  category: "books",
  price: 49.99,
  description: "Comprehensive guide to MongoDB database development",
  tags: ["mongodb", "database", "nosql", "development"],
  status: "active",
  inventory: {
    quantity: 100,
    warehouse: "WH-001",
  },
  rating: {
    average: 4.5,
    count: 127,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

try {
  const productResult = db.validated_products.insertOne(validProduct);
  validator.assert(
    true,
    "Valid product document inserted",
    `ID: ${productResult.insertedId}`
  );
} catch (error) {
  validator.assert(false, "Valid product insertion", error.message);
}

// 4. Test validation constraint enforcement
print("\n4. Testing validation constraint enforcement");

// Test required field missing
try {
  db.validated_products.insertOne({
    name: "Invalid Product",
    category: "books",
    // Missing required 'price' field
    status: "active",
    createdAt: new Date(),
  });
  validator.assert(
    false,
    "Required field validation",
    "Should have failed due to missing price"
  );
} catch (error) {
  validator.assert(
    error.message.includes("validation"),
    "Required field validation enforced",
    "Missing price field caught"
  );
}

// Test invalid enum value
try {
  db.validated_products.insertOne({
    name: "Another Product",
    category: "invalid_category", // Invalid enum value
    price: 29.99,
    status: "active",
    createdAt: new Date(),
  });
  validator.assert(
    false,
    "Enum validation",
    "Should have failed due to invalid category"
  );
} catch (error) {
  validator.assert(
    error.message.includes("validation"),
    "Enum validation enforced",
    "Invalid category caught"
  );
}

// Test number range validation
try {
  db.validated_products.insertOne({
    name: "Expensive Product",
    category: "electronics",
    price: 15000, // Exceeds maximum of 10000
    status: "active",
    createdAt: new Date(),
  });
  validator.assert(
    false,
    "Number range validation",
    "Should have failed due to price too high"
  );
} catch (error) {
  validator.assert(
    error.message.includes("validation"),
    "Number range validation enforced",
    "Price limit caught"
  );
}

// Test string length validation
try {
  db.validated_products.insertOne({
    name: "", // Empty name (violates minLength: 1)
    category: "books",
    price: 19.99,
    status: "active",
    createdAt: new Date(),
  });
  validator.assert(
    false,
    "String length validation",
    "Should have failed due to empty name"
  );
} catch (error) {
  validator.assert(
    error.message.includes("validation"),
    "String length validation enforced",
    "Empty name caught"
  );
}

// Test array validation
try {
  const tooManyTags = Array(25)
    .fill(0)
    .map((_, i) => `tag${i}`); // Exceeds maxItems: 20
  db.validated_products.insertOne({
    name: "Product with Too Many Tags",
    category: "books",
    price: 19.99,
    tags: tooManyTags,
    status: "active",
    createdAt: new Date(),
  });
  validator.assert(
    false,
    "Array size validation",
    "Should have failed due to too many tags"
  );
} catch (error) {
  validator.assert(
    error.message.includes("validation"),
    "Array size validation enforced",
    "Too many tags caught"
  );
}

// =================================================================
// PATTERN VALIDATION
// =================================================================

print("\n🎯 PATTERN VALIDATION");
print("-" * 30);

// 5. Test regex pattern validation
print("5. Testing regex pattern validation");

const validOrder = {
  orderNumber: "ORD-2023-000001",
  customerId: new ObjectId(),
  items: [
    {
      productId: new ObjectId(),
      quantity: 2,
      price: 49.99,
    },
  ],
  status: "pending",
  total: 99.98,
  shippingAddress: {
    street: "123 Main Street",
    city: "Anytown",
    state: "CA",
    zipCode: "90210",
    country: "USA",
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

try {
  const orderResult = db.validated_orders.insertOne(validOrder);
  validator.assert(
    true,
    "Valid order with pattern validation",
    `ID: ${orderResult.insertedId}`
  );
} catch (error) {
  validator.assert(false, "Valid order insertion", error.message);
}

// Test invalid pattern
try {
  const invalidOrder = { ...validOrder };
  invalidOrder.orderNumber = "INVALID-ORDER-NUMBER";
  delete invalidOrder._id;

  db.validated_orders.insertOne(invalidOrder);
  validator.assert(
    false,
    "Pattern validation",
    "Should have failed due to invalid order number format"
  );
} catch (error) {
  validator.assert(
    error.message.includes("validation"),
    "Pattern validation enforced",
    "Invalid order number format caught"
  );
}

// =================================================================
// CUSTOM VALIDATION RULES
// =================================================================

print("\n⚙️ CUSTOM VALIDATION RULES");
print("-" * 30);

// 6. Create collection with custom validation using $expr
print("6. Creating collection with custom business logic validation");

const customValidationSchema = {
  $expr: {
    $and: [
      // Basic required fields
      { $ne: [{ $type: "$email" }, "missing"] },
      { $ne: [{ $type: "$age" }, "missing"] },

      // Email format validation
      { $regexMatch: { input: "$email", regex: /^.+@.+\..+$/ } },

      // Age range validation
      { $and: [{ $gte: ["$age", 13] }, { $lte: ["$age", 120] }] },

      // Custom business rule: Premium users must have valid payment method
      {
        $or: [
          { $ne: ["$membershipType", "premium"] },
          { $ne: [{ $type: "$paymentMethod" }, "missing"] },
        ],
      },

      // Complex validation: End date must be after start date
      {
        $or: [
          { $eq: [{ $type: "$endDate" }, "missing"] },
          { $eq: [{ $type: "$startDate" }, "missing"] },
          { $gt: ["$endDate", "$startDate"] },
        ],
      },
    ],
  },
};

try {
  db.createCollection("custom_validated_users", {
    validator: customValidationSchema,
  });
  validator.assert(true, "Custom validation collection created");
} catch (error) {
  validator.assert(
    false,
    "Custom validation collection creation",
    error.message
  );
}

// Test custom validation
const customUser = {
  email: "user@example.com",
  age: 25,
  membershipType: "premium",
  paymentMethod: "credit_card",
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days later
};

try {
  const customResult = db.custom_validated_users.insertOne(customUser);
  validator.assert(
    true,
    "Custom validation passed",
    `ID: ${customResult.insertedId}`
  );
} catch (error) {
  validator.assert(false, "Custom validation test", error.message);
}

// Test custom validation failure
try {
  const invalidCustomUser = {
    email: "invalid-email",
    age: 150, // Too old
    membershipType: "premium",
    // Missing required paymentMethod for premium user
    startDate: new Date(),
    endDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // End before start
  };

  db.custom_validated_users.insertOne(invalidCustomUser);
  validator.assert(
    false,
    "Custom validation enforcement",
    "Should have failed multiple validation rules"
  );
} catch (error) {
  validator.assert(
    error.message.includes("validation"),
    "Custom validation rules enforced",
    "Multiple business rules caught"
  );
}

// =================================================================
// VALIDATION PERFORMANCE IMPACT
// =================================================================

print("\n⚡ VALIDATION PERFORMANCE IMPACT");
print("-" * 30);

// 7. Test validation performance impact
print("7. Testing validation performance impact");

function testInsertPerformance(collectionName, documents, description) {
  const start = Date.now();

  try {
    const result = db
      .getCollection(collectionName)
      .insertMany(documents, { ordered: false });
    const duration = Date.now() - start;

    validator.assert(
      true,
      `${description} performance test`,
      `${result.insertedIds.length} docs in ${duration}ms (${(
        (result.insertedIds.length * 1000) /
        duration
      ).toFixed(0)} docs/sec)`
    );

    return duration;
  } catch (error) {
    validator.assert(false, `${description} performance test`, error.message);
    return -1;
  }
}

// Create test documents
const testProducts = [];
for (let i = 0; i < 100; i++) {
  testProducts.push({
    name: `Test Product ${i}`,
    category: ["electronics", "books", "clothing"][i % 3],
    price: Math.random() * 1000,
    status: ["active", "draft"][i % 2],
    tags: [`tag${i}`, `category${i % 3}`],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

// Test with validation
const validatedTime = testInsertPerformance(
  "validated_products",
  testProducts,
  "Validated collection"
);

// Create collection without validation for comparison
db.unvalidated_products.drop();
db.createCollection("unvalidated_products");

const unvalidatedTime = testInsertPerformance(
  "unvalidated_products",
  testProducts,
  "Unvalidated collection"
);

if (validatedTime > 0 && unvalidatedTime > 0) {
  const overhead = (
    ((validatedTime - unvalidatedTime) / unvalidatedTime) *
    100
  ).toFixed(1);
  validator.warn(
    "Validation performance overhead",
    `${overhead}% slower with validation`
  );
}

// =================================================================
// SCHEMA EVOLUTION WITH VALIDATION
// =================================================================

print("\n🔄 SCHEMA EVOLUTION WITH VALIDATION");
print("-" * 30);

// 8. Modify validation schema (schema evolution)
print("8. Testing schema evolution with validation updates");

const updatedProductSchema = {
  $jsonSchema: {
    bsonType: "object",
    required: ["name", "category", "price", "status", "createdAt"],
    properties: {
      name: { bsonType: "string", minLength: 1, maxLength: 200 },
      category: {
        enum: [
          "electronics",
          "books",
          "clothing",
          "home",
          "sports",
          "toys",
          "health",
        ],
      }, // Added 'health'
      price: { bsonType: "double", minimum: 0, maximum: 15000 }, // Increased max price
      description: { bsonType: "string", maxLength: 2000 }, // Increased max length
      tags: {
        bsonType: "array",
        maxItems: 30,
        uniqueItems: true,
        items: { bsonType: "string", maxLength: 50 },
      }, // More tags allowed
      status: {
        enum: [
          "draft",
          "active",
          "discontinued",
          "out_of_stock",
          "coming_soon",
        ],
      }, // Added status

      // New optional fields in evolved schema
      manufacturer: { bsonType: "string", maxLength: 100 },
      warranty: {
        bsonType: "object",
        properties: {
          duration: { bsonType: "int", minimum: 0, maximum: 120 }, // months
          type: { enum: ["limited", "extended", "lifetime"] },
        },
      },

      inventory: {
        bsonType: "object",
        properties: {
          quantity: { bsonType: "int", minimum: 0 },
          warehouse: { bsonType: "string", minLength: 1 },
          reorderLevel: { bsonType: "int", minimum: 0 }, // New field
        },
      },
      rating: {
        bsonType: "object",
        properties: {
          average: { bsonType: "double", minimum: 0, maximum: 5 },
          count: { bsonType: "int", minimum: 0 },
        },
      },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" },
    },
    additionalProperties: false,
  },
};

try {
  db.runCommand({
    collMod: "validated_products",
    validator: updatedProductSchema,
  });
  validator.assert(true, "Schema validation updated successfully");
} catch (error) {
  validator.assert(false, "Schema validation update", error.message);
}

// Test evolved schema
const evolvedProduct = {
  name: "Health Supplement",
  category: "health", // New category
  price: 12000, // Higher price (within new limit)
  status: "coming_soon", // New status
  manufacturer: "HealthCorp",
  warranty: {
    duration: 12,
    type: "limited",
  },
  inventory: {
    quantity: 50,
    warehouse: "WH-002",
    reorderLevel: 10, // New field
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

try {
  const evolvedResult = db.validated_products.insertOne(evolvedProduct);
  validator.assert(
    true,
    "Evolved schema validation works",
    `ID: ${evolvedResult.insertedId}`
  );
} catch (error) {
  validator.assert(false, "Evolved schema test", error.message);
}

// =================================================================
// DATA QUALITY VALIDATION
// =================================================================

print("\n🔍 DATA QUALITY VALIDATION");
print("-" * 30);

// 9. Check existing data quality
print("9. Analyzing data quality across collections");

function analyzeDataQuality(collectionName, checks) {
  const collection = db.getCollection(collectionName);
  const totalDocs = collection.countDocuments();

  print(
    `\nData quality analysis for ${collectionName} (${totalDocs} documents):`
  );

  const results = {};

  Object.entries(checks).forEach(([checkName, query]) => {
    const count = collection.countDocuments(query);
    const percentage =
      totalDocs > 0 ? ((count / totalDocs) * 100).toFixed(1) : 0;

    results[checkName] = { count, percentage };
    print(`  ${checkName}: ${count}/${totalDocs} (${percentage}%)`);
  });

  return results;
}

// Analyze users collection
const userQualityChecks = {
  "Valid emails": { email: { $regex: /^.+@.+\..+$/ } },
  "Complete names": {
    firstName: { $exists: true, $ne: "" },
    lastName: { $exists: true, $ne: "" },
  },
  "Active users": { isActive: true },
  "Users with profiles": { profile: { $exists: true } },
  "Recent activity": {
    updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
  },
};

const userQuality = analyzeDataQuality("users", userQualityChecks);

// Analyze validated products
const productQualityChecks = {
  "With descriptions": { description: { $exists: true, $ne: "" } },
  "With inventory": { "inventory.quantity": { $exists: true } },
  "With ratings": { "rating.count": { $gt: 0 } },
  "Active products": { status: "active" },
  "Tagged products": { tags: { $exists: true, $not: { $size: 0 } } },
};

const productQuality = analyzeDataQuality(
  "validated_products",
  productQualityChecks
);

// Generate quality score
const avgUserQuality =
  Object.values(userQuality).reduce(
    (sum, q) => sum + parseFloat(q.percentage),
    0
  ) / Object.keys(userQuality).length;
const avgProductQuality =
  Object.values(productQuality).reduce(
    (sum, q) => sum + parseFloat(q.percentage),
    0
  ) / Object.keys(productQuality).length;

validator.assert(
  avgUserQuality >= 70,
  "User data quality acceptable",
  `${avgUserQuality.toFixed(1)}% average quality`
);
validator.assert(
  avgProductQuality >= 60,
  "Product data quality acceptable",
  `${avgProductQuality.toFixed(1)}% average quality`
);

// =================================================================
// CLEANUP AND FINAL VALIDATION
// =================================================================

print("\n🧹 CLEANUP");
print("-" * 30);

// Clean up test collections
db.unvalidated_products.drop();
db.custom_validated_users.drop();

print("✓ Cleaned up test collections");

// Final validation check
print("\n🏁 FINAL VALIDATION CHECK");
print("-" * 30);

const finalValidation = {
  collectionsWithValidation: 0,
  totalValidatedCollections: 2, // products and orders
  validationRulesWorking: true,
  dataQualityScore: Math.round((avgUserQuality + avgProductQuality) / 2),
};

// Check validation is active
const productValidation = db.getCollectionInfos({
  name: "validated_products",
})[0];
const orderValidation = db.getCollectionInfos({ name: "validated_orders" })[0];

if (
  productValidation &&
  productValidation.options &&
  productValidation.options.validator
) {
  finalValidation.collectionsWithValidation++;
}

if (
  orderValidation &&
  orderValidation.options &&
  orderValidation.options.validator
) {
  finalValidation.collectionsWithValidation++;
}

validator.assert(
  finalValidation.collectionsWithValidation ===
    finalValidation.totalValidatedCollections,
  "All target collections have validation enabled",
  `${finalValidation.collectionsWithValidation}/${finalValidation.totalValidatedCollections} collections`
);

validator.assert(
  finalValidation.dataQualityScore >= 65,
  "Overall data quality acceptable",
  `${finalValidation.dataQualityScore}% quality score`
);

// Generate final report
const success = validator.generateReport();

print("\n📊 SCHEMA VALIDATION SUMMARY");
print("-".repeat(30));

print("✓ JSON Schema validation with comprehensive rules");
print("✓ Custom validation using $expr and business logic");
print("✓ Pattern validation with regex");
print("✓ Constraint enforcement (required, enum, range, length)");
print("✓ Schema evolution and validation updates");
print("✓ Performance impact analysis");
print("✓ Data quality assessment");
print("✓ Validation rule testing and verification");

if (success) {
  print("\n✅ SCHEMA VALIDATION COMPLETED SUCCESSFULLY!");
  print(
    "All validation rules are working correctly and data quality is acceptable."
  );
  print("Ready to proceed to 04_aggregation/ module.");
} else {
  print("\n❌ Some schema validation tests failed!");
  print("Please review and fix the validation issues before proceeding.");
}

print("\nNext steps:");
print("1. Review any failed validations above");
print("2. Consider additional validation rules for your use cases");
print("3. Run pipeline_fundamentals.js in 04_aggregation/");
print("4. Continue with aggregation pipeline patterns");
