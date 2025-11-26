// File: scripts/02_indexes/specialized_indexes.js
// Text, geo, partial, TTL and specialized index types

use("learning_platform");

print("MongoDB Indexes: Specialized Types");
print("=" * 50);

// =================================================================
// TEXT INDEXES
// =================================================================

print("\n📝 TEXT INDEXES");
print("-" * 30);

// 1. Create text indexes for search functionality
print("1. Creating text indexes for full-text search");

// Single field text index on course titles
try {
  db.courses.createIndex({ title: "text" });
  print("✓ Text index on course titles created");
} catch (e) {
  print(`⚠ Course title text index: ${e.message}`);
}

// Compound text index on multiple fields with weights
try {
  db.courses.createIndex(
    {
      title: "text",
      description: "text",
      tags: "text",
    },
    {
      weights: {
        title: 10, // Title matches are most important
        tags: 5, // Tags are moderately important
        description: 1, // Description matches are least important
      },
      name: "course_text_search",
    }
  );
  print("✓ Weighted compound text index created");
} catch (e) {
  print(`⚠ Compound text index: ${e.message}`);
}

// User search text index
try {
  db.users.createIndex(
    {
      firstName: "text",
      lastName: "text",
      "profile.bio": "text",
    },
    {
      weights: {
        firstName: 10,
        lastName: 10,
        "profile.bio": 1,
      },
      name: "user_text_search",
    }
  );
  print("✓ User text search index created");
} catch (e) {
  print(`⚠ User text index: ${e.message}`);
}

// 2. Test text search functionality
print("\n2. Testing text search queries");

// Basic text search
const basicTextSearch = db.courses.find({
  $text: { $search: "mongodb database" },
});
print(`✓ Basic text search found ${basicTextSearch.count()} courses`);

// Text search with score sorting
const scoredSearch = db.courses
  .find(
    { $text: { $search: "advanced mongodb" } },
    { score: { $meta: "textScore" } }
  )
  .sort({ score: { $meta: "textScore" } })
  .limit(5);

print("✓ Top 5 scored text search results:");
scoredSearch.forEach((course, i) => {
  print(`  ${i + 1}. ${course.title} (Score: ${course.score?.toFixed(2)})`);
});

// Text search with phrase matching
const phraseSearch = db.courses.find({
  $text: { $search: '"MongoDB Fundamentals"' },
});
print(`✓ Phrase search found ${phraseSearch.count()} exact matches`);

// Text search with exclusion
const excludeSearch = db.courses.find({
  $text: { $search: "mongodb -advanced" },
});
print(
  `✓ Exclusion search (mongodb but not advanced): ${excludeSearch.count()} results`
);

// =================================================================
// GEOSPATIAL INDEXES
// =================================================================

print("\n🌍 GEOSPATIAL INDEXES");
print("-" * 30);

print("3. Creating geospatial indexes and data");

// Add location data to users (simulating user locations)
const locations = [
  { city: "New York", coordinates: [-74.006, 40.7128] },
  { city: "San Francisco", coordinates: [-122.4194, 37.7749] },
  { city: "Chicago", coordinates: [-87.6298, 41.8781] },
  { city: "Austin", coordinates: [-97.7431, 30.2672] },
  { city: "Seattle", coordinates: [-122.3321, 47.6062] },
  { city: "Boston", coordinates: [-71.0589, 42.3601] },
  { city: "Atlanta", coordinates: [-84.388, 33.749] },
  { city: "Denver", coordinates: [-105.0178, 39.7392] },
];

// Update some users with location data
const sampleUsers = db.users.find({ role: "student" }).limit(50).toArray();
sampleUsers.forEach((user, index) => {
  const location = locations[index % locations.length];
  db.users.updateOne(
    { _id: user._id },
    {
      $set: {
        location: {
          city: location.city,
          type: "Point",
          coordinates: location.coordinates,
        },
      },
    }
  );
});

print("✓ Added location data to sample users");

// Create 2dsphere index for modern geospatial queries
try {
  db.users.createIndex({ location: "2dsphere" });
  print("✓ 2dsphere geospatial index created");
} catch (e) {
  print(`⚠ Geospatial index: ${e.message}`);
}

// 4. Test geospatial queries
print("\n4. Testing geospatial queries");

// Near query - find users within 500 miles of New York
const nearQuery = db.users
  .find({
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [-74.006, 40.7128], // New York
        },
        $maxDistance: 804672, // 500 miles in meters
      },
    },
  })
  .limit(5);

print(`✓ Users within 500 miles of NYC: ${nearQuery.count()}`);

// GeoWithin query - find users within a polygon area (East Coast)
const eastCoastPolygon = {
  type: "Polygon",
  coordinates: [
    [
      [-80.0, 25.0], // South Florida
      [-80.0, 45.0], // North
      [-67.0, 45.0], // Northeast
      [-67.0, 25.0], // Southeast
      [-80.0, 25.0], // Close polygon
    ],
  ],
};

const withinQuery = db.users.find({
  location: {
    $geoWithin: {
      $geometry: eastCoastPolygon,
    },
  },
});

print(`✓ Users on East Coast: ${withinQuery.count()}`);

// =================================================================
// TTL (TIME-TO-LIVE) INDEXES
// =================================================================

print("\n⏰ TTL (TIME-TO-LIVE) INDEXES");
print("-" * 30);

print("5. Creating TTL indexes for automatic document expiration");

// Create a sessions collection with TTL
db.createCollection("user_sessions");

// TTL index to automatically delete sessions after 24 hours
try {
  db.user_sessions.createIndex(
    { lastActivity: 1 },
    { expireAfterSeconds: 86400 } // 24 hours
  );
  print("✓ TTL index on user sessions (24 hour expiry) created");
} catch (e) {
  print(`⚠ TTL index: ${e.message}`);
}

// Create sample session documents
const sessionDocs = [
  {
    userId: ObjectId(),
    sessionId: "sess_123456",
    lastActivity: new Date(),
    userAgent: "Mozilla/5.0...",
    ipAddress: "192.168.1.100",
  },
  {
    userId: ObjectId(),
    sessionId: "sess_789012",
    lastActivity: new Date(Date.now() - 3600000), // 1 hour ago
    userAgent: "Chrome/91.0...",
    ipAddress: "10.0.0.50",
  },
  {
    userId: ObjectId(),
    sessionId: "sess_345678",
    lastActivity: new Date(Date.now() - 7200000), // 2 hours ago
    userAgent: "Safari/14.1...",
    ipAddress: "172.16.0.25",
  },
];

db.user_sessions.insertMany(sessionDocs);
print("✓ Created sample session documents");

// Create audit log collection with TTL
try {
  use("mmp_logs");
  db.audit_logs.createIndex(
    { timestamp: 1 },
    { expireAfterSeconds: 2592000 } // 30 days
  );
  print("✓ TTL index on audit logs (30 day expiry) created");

  use("learning_platform"); // Switch back
} catch (e) {
  print(`⚠ Audit log TTL index: ${e.message}`);
}

// =================================================================
// PARTIAL INDEXES
// =================================================================

print("\n🎯 PARTIAL INDEXES");
print("-" * 30);

print("6. Creating partial indexes for selective indexing");

// Partial index only for active users with recent login
try {
  db.users.createIndex(
    { lastLoginAt: -1 },
    {
      partialFilterExpression: {
        isActive: true,
        lastLoginAt: { $exists: true },
        role: { $in: ["student", "instructor"] },
      },
      name: "active_users_login_idx",
    }
  );
  print("✓ Partial index for active users with login data created");
} catch (e) {
  print(`⚠ Partial index: ${e.message}`);
}

// Partial index for premium courses only
try {
  db.courses.createIndex(
    { price: 1, rating: -1 },
    {
      partialFilterExpression: {
        price: { $gt: 100 },
        status: "active",
      },
      name: "premium_courses_idx",
    }
  );
  print("✓ Partial index for premium courses created");
} catch (e) {
  print(`⚠ Premium courses partial index: ${e.message}`);
}

// Test partial index usage
const partialQuery = db.users
  .find({
    isActive: true,
    lastLoginAt: { $exists: true },
    role: "student",
  })
  .sort({ lastLoginAt: -1 })
  .explain("executionStats");

const indexUsed =
  partialQuery.executionStats.executionStages.indexName ||
  partialQuery.executionStats.executionStages.inputStage?.indexName;
print(`✓ Partial index query uses: ${indexUsed}`);

// =================================================================
// SPARSE INDEXES
// =================================================================

print("\n🕳️  SPARSE INDEXES");
print("-" * 30);

print("7. Creating sparse indexes for optional fields");

// Sparse index on optional profile fields
try {
  db.users.createIndex(
    { "profile.phoneNumber": 1 },
    { sparse: true, name: "sparse_phone_idx" }
  );
  print("✓ Sparse index on phone numbers created");
} catch (e) {
  print(`⚠ Sparse phone index: ${e.message}`);
}

// Sparse compound index
try {
  db.users.createIndex(
    { "profile.linkedinUrl": 1, role: 1 },
    { sparse: true, name: "sparse_linkedin_role_idx" }
  );
  print("✓ Sparse compound index on LinkedIn URL created");
} catch (e) {
  print(`⚠ Sparse compound index: ${e.message}`);
}

// Add some users with phone numbers to test sparse index
db.users.updateMany(
  { role: "instructor" },
  {
    $set: {
      "profile.phoneNumber":
        "+1-555-" + Math.floor(Math.random() * 9000 + 1000),
    },
  },
  { limit: 5 }
);

const sparseQuery = db.users
  .find({ "profile.phoneNumber": { $exists: true } })
  .explain("executionStats");
print(
  `✓ Sparse index query examined ${sparseQuery.executionStats.totalDocsExamined} documents`
);

// =================================================================
// CASE-INSENSITIVE INDEXES
// =================================================================

print("\n🔤 CASE-INSENSITIVE INDEXES");
print("-" * 30);

print("8. Creating case-insensitive indexes with collation");

// Case-insensitive index on names
try {
  db.users.createIndex(
    { firstName: 1, lastName: 1 },
    {
      collation: {
        locale: "en",
        strength: 2, // Case-insensitive
      },
      name: "case_insensitive_names",
    }
  );
  print("✓ Case-insensitive name index created");
} catch (e) {
  print(`⚠ Case-insensitive index: ${e.message}`);
}

// Test case-insensitive queries
const caseQuery1 = db.users
  .find({ firstName: "SARAH" })
  .collation({ locale: "en", strength: 2 });
const caseQuery2 = db.users
  .find({ firstName: "sarah" })
  .collation({ locale: "en", strength: 2 });

print(
  `✓ Case-insensitive search results: ${caseQuery1.count()} (uppercase) vs ${caseQuery2.count()} (lowercase)`
);

// =================================================================
// HASHED INDEXES
// =================================================================

print("\n#️⃣  HASHED INDEXES");
print("-" * 30);

print("9. Creating hashed indexes for sharding support");

// Hashed index on user ID (useful for sharding)
try {
  db.users.createIndex({ _id: "hashed" });
  print("✓ Hashed index on _id created (for sharding)");
} catch (e) {
  print(`⚠ Hashed index: ${e.message}`);
}

// Hashed index on email for even distribution
try {
  db.users.createIndex({ email: "hashed" }, { name: "email_hashed_idx" });
  print("✓ Hashed index on email created");
} catch (e) {
  print(`⚠ Email hashed index: ${e.message}`);
}

// =================================================================
// WILDCARD INDEXES
// =================================================================

print("\n🃏 WILDCARD INDEXES");
print("-" * 30);

print("10. Creating wildcard indexes for flexible schemas");

// Wildcard index on user profile (supports any field in profile)
try {
  db.users.createIndex({ "profile.$**": 1 }, { name: "profile_wildcard_idx" });
  print("✓ Wildcard index on profile fields created");
} catch (e) {
  print(`⚠ Wildcard index: ${e.message}`);
}

// Test wildcard index with various profile queries
const wildcardQueries = [
  { "profile.experienceLevel": "advanced" },
  { "profile.specializations": "mongodb" },
  { "profile.yearsExperience": { $gte: 5 } },
];

wildcardQueries.forEach((query, i) => {
  const explain = db.users.find(query).explain("executionStats");
  const indexUsed =
    explain.executionStats.executionStages.indexName || "Collection scan";
  print(`  Wildcard query ${i + 1}: ${indexUsed}`);
});

// =================================================================
// INDEX PERFORMANCE COMPARISON
// =================================================================

print("\n🏃‍♂️ SPECIALIZED INDEX PERFORMANCE");
print("-" * 30);

print("11. Comparing specialized index performance");

// Text search performance
let start = Date.now();
const textResults = db.courses
  .find({ $text: { $search: "mongodb" } })
  .toArray();
let duration = Date.now() - start;
print(`✓ Text search: ${duration}ms, ${textResults.length} results`);

// Geospatial query performance
start = Date.now();
const geoResults = db.users
  .find({
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [-74.006, 40.7128] },
        $maxDistance: 804672,
      },
    },
  })
  .limit(10)
  .toArray();
duration = Date.now() - start;
print(`✓ Geospatial query: ${duration}ms, ${geoResults.length} results`);

// Partial index query performance
start = Date.now();
const partialResults = db.users
  .find({
    isActive: true,
    lastLoginAt: { $exists: true },
  })
  .limit(10)
  .toArray();
duration = Date.now() - start;
print(`✓ Partial index query: ${duration}ms, ${partialResults.length} results`);

// =================================================================
// INDEX MAINTENANCE AND MONITORING
// =================================================================

print("\n🔧 SPECIALIZED INDEX MAINTENANCE");
print("-" * 30);

print("12. Specialized index maintenance");

// Check TTL index status
const ttlIndexes = db.user_sessions
  .getIndexes()
  .filter((idx) => idx.hasOwnProperty("expireAfterSeconds"));
print(`✓ Found ${ttlIndexes.length} TTL indexes`);

ttlIndexes.forEach((idx) => {
  print(`  ${idx.name}: expires after ${idx.expireAfterSeconds} seconds`);
});

// Check text index language and weights
const textIndexes = db.courses
  .getIndexes()
  .filter((idx) => Object.values(idx.key || {}).includes("text"));
print(`✓ Found ${textIndexes.length} text indexes`);

textIndexes.forEach((idx) => {
  print(`  ${idx.name}: language=${idx.default_language || "english"}`);
  if (idx.weights) {
    print(`    Weights: ${JSON.stringify(idx.weights)}`);
  }
});

// =================================================================
// CLEANUP AND VALIDATION
// =================================================================

print("\n🧹 CLEANUP AND VALIDATION");
print("-" * 30);

// Clean up test session data
const sessionCleanup = db.user_sessions.deleteMany({});
print(`✓ Cleaned up ${sessionCleanup.deletedCount} test sessions`);

// Validate specialized indexes exist
print("\n✅ Specialized Index Validation:");

const specializedIndexChecks = [
  { collection: "courses", indexName: "course_text_search", type: "Text" },
  { collection: "users", indexName: "location_2dsphere", type: "Geospatial" },
  { collection: "user_sessions", field: "expireAfterSeconds", type: "TTL" },
  { collection: "users", indexName: "active_users_login_idx", type: "Partial" },
  { collection: "users", indexName: "sparse_phone_idx", type: "Sparse" },
  { collection: "users", indexName: "profile_wildcard_idx", type: "Wildcard" },
];

specializedIndexChecks.forEach((check) => {
  const indexes = db.getCollection(check.collection).getIndexes();
  let found = false;

  if (check.indexName) {
    found = indexes.some((idx) => idx.name === check.indexName);
  } else if (check.field) {
    found = indexes.some((idx) => idx.hasOwnProperty(check.field));
  }

  print(`  ${check.type} index: ${found ? "✓" : "✗"}`);
});

print("\n🎯 Key Learnings:");
print("• Text indexes enable full-text search with scoring and weights");
print("• Geospatial indexes support location-based queries (2dsphere)");
print("• TTL indexes automatically delete expired documents");
print("• Partial indexes reduce size by filtering documents");
print("• Sparse indexes skip documents without the indexed field");
print("• Collation enables case-insensitive and locale-aware indexing");
print("• Hashed indexes support even distribution for sharding");
print("• Wildcard indexes provide flexibility for dynamic schemas");
print("• Each specialized index type has specific use cases and trade-offs");

print("\n✅ Specialized indexes completed!");
print("Next: Run performance_analysis.js for query optimization");
