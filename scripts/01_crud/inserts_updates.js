// File: scripts/01_crud/inserts_updates.js
// Combined insert/update operations with MongoDB best practices

use("mongomasterpro");

print("MongoDB CRUD: Insert & Update Operations");
print("=" * 50);

// =================================================================
// SINGLE DOCUMENT OPERATIONS
// =================================================================

print("\n🔥 SINGLE DOCUMENT OPERATIONS");
print("-" * 30);

// 1. insertOne() - Create single document
print("1. Creating a new user with insertOne()");

const newUser = {
  email: "sarah.connor@future.com",
  firstName: "Sarah",
  lastName: "Connor",
  role: "student",
  isActive: true,
  profile: {
    experienceLevel: "intermediate",
    interests: ["cybersecurity", "ai ethics", "future tech"],
    goals: ["prevent skynet", "master mongodb"],
    bio: "Preparing for the future resistance",
  },
  preferences: {
    theme: "dark",
    notifications: true,
    language: "en",
  },
  metadata: {
    source: "direct_signup",
    campaign: "terminator_series",
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

try {
  const insertResult = db.users.insertOne(newUser);
  print(`✓ User inserted with ID: ${insertResult.insertedId}`);
  print(`  Acknowledged: ${insertResult.acknowledged}`);

  // Store the ID for later use
  const sarahId = insertResult.insertedId;
} catch (error) {
  if (error.code === 11000) {
    print("⚠ User with this email already exists (duplicate key)");
  } else {
    print(`❌ Insert failed: ${error.message}`);
  }
}

// 2. updateOne() - Update single document
print("\n2. Updating user profile with updateOne()");

const updateResult = db.users.updateOne(
  { email: "sarah.connor@future.com" },
  {
    $set: {
      "profile.experienceLevel": "advanced",
      "profile.lastActivity": new Date(),
      updatedAt: new Date(),
    },
    $push: {
      "profile.goals": "learn aggregation pipelines",
    },
    $inc: {
      "stats.loginCount": 1,
    },
  }
);

print(
  `✓ Matched: ${updateResult.matchedCount}, Modified: ${updateResult.modifiedCount}`
);

// 3. replaceOne() - Replace entire document
print("\n3. Replacing document with replaceOne()");

const replacementUser = {
  email: "sarah.connor@future.com",
  firstName: "Sarah",
  lastName: "Connor-Reese",
  role: "instructor", // Promoted!
  isActive: true,
  profile: {
    experienceLevel: "expert",
    specializations: ["cybersecurity", "database security", "ai safety"],
    bio: "Former resistance leader, now teaching database security",
    yearsExperience: 15,
  },
  updatedAt: new Date(),
};

const replaceResult = db.users.replaceOne(
  { email: "sarah.connor@future.com" },
  replacementUser
);

print(
  `✓ Matched: ${replaceResult.matchedCount}, Modified: ${replaceResult.modifiedCount}`
);

// =================================================================
// MULTIPLE DOCUMENT OPERATIONS
// =================================================================

print("\n🔥 MULTIPLE DOCUMENT OPERATIONS");
print("-" * 30);

// 4. insertMany() - Insert multiple documents
print("4. Inserting multiple courses with insertMany()");

const newCourses = [
  {
    title: "Future Database Security",
    description: "Protecting databases from AI threats",
    instructorId: ObjectId(), // In real scenario, use actual instructor ID
    status: "active",
    difficulty: "advanced",
    maxStudents: 25,
    tags: ["security", "ai", "future"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: "Time-Travel Database Design",
    description: "Temporal data modeling for time travelers",
    instructorId: ObjectId(),
    status: "draft",
    difficulty: "expert",
    maxStudents: 10,
    tags: ["temporal", "advanced", "time-travel"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: "Resistance Communications DB",
    description: "Secure, distributed communication systems",
    instructorId: ObjectId(),
    status: "active",
    difficulty: "intermediate",
    maxStudents: 50,
    tags: ["distributed", "security", "communications"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

try {
  const insertManyResult = db.courses.insertMany(newCourses, {
    ordered: false,
  });
  print(`✓ Inserted ${insertManyResult.insertedIds.length} courses`);
  print(
    "  Inserted IDs:",
    Object.values(insertManyResult.insertedIds).slice(0, 2)
  );
} catch (error) {
  print(`❌ Insert many failed: ${error.message}`);
  if (error.writeErrors) {
    print(`  Write errors: ${error.writeErrors.length}`);
  }
}

// 5. updateMany() - Update multiple documents
print("\n5. Updating multiple courses with updateMany()");

const updateManyResult = db.courses.updateMany(
  { status: "draft" },
  {
    $set: {
      status: "review",
      reviewStartedAt: new Date(),
      updatedAt: new Date(),
    },
    $unset: {
      "metadata.draft": "",
    },
  }
);

print(
  `✓ Matched: ${updateManyResult.matchedCount}, Modified: ${updateManyResult.modifiedCount}`
);

// =================================================================
// UPSERT OPERATIONS
// =================================================================

print("\n🔥 UPSERT OPERATIONS (Insert or Update)");
print("-" * 30);

// 6. Upsert with updateOne
print("6. Upsert operation - insert if not exists, update if exists");

const upsertResult = db.users.updateOne(
  { email: "john.connor@future.com" },
  {
    $set: {
      firstName: "John",
      lastName: "Connor",
      role: "admin",
      updatedAt: new Date(),
    },
    $setOnInsert: {
      createdAt: new Date(),
      isActive: true,
      profile: {
        experienceLevel: "expert",
        specialization: "leadership",
      },
    },
  },
  { upsert: true }
);

if (upsertResult.upsertedId) {
  print(`✓ New document created with ID: ${upsertResult.upsertedId}`);
} else {
  print(`✓ Existing document updated. Modified: ${upsertResult.modifiedCount}`);
}

// =================================================================
// ADVANCED UPDATE OPERATORS
// =================================================================

print("\n🔥 ADVANCED UPDATE OPERATORS");
print("-" * 30);

// 7. Array operations
print("7. Advanced array operations");

// Add to array if not exists
db.users.updateOne(
  { email: "john.connor@future.com" },
  {
    $addToSet: {
      "profile.skills": {
        $each: ["leadership", "strategic planning", "mongodb"],
      },
    },
  }
);

// Remove from array
db.users.updateOne(
  { email: "john.connor@future.com" },
  {
    $pull: {
      "profile.skills": "outdated_skill",
    },
  }
);

// Update array element
db.users.updateOne(
  {
    email: "john.connor@future.com",
    "profile.achievements.type": "certification",
  },
  {
    $set: {
      "profile.achievements.$.completed": true,
      "profile.achievements.$.completedAt": new Date(),
    },
  }
);

print("✓ Array operations completed");

// 8. Conditional updates
print("\n8. Conditional updates with $min, $max, $mul");

db.courses.updateMany(
  { difficulty: "beginner" },
  {
    $min: { maxStudents: 100 }, // Only update if current value is greater than 100
    $max: { minStudents: 10 }, // Only update if current value is less than 10
    $mul: { price: 0.9 }, // Multiply price by 0.9 (10% discount)
  }
);

print("✓ Conditional updates applied");

// =================================================================
// BULK OPERATIONS
// =================================================================

print("\n🔥 BULK OPERATIONS");
print("-" * 30);

// 9. Bulk write operations
print("9. Performing bulk write operations");

const bulkOps = [
  {
    insertOne: {
      document: {
        email: "kyle.reese@future.com",
        firstName: "Kyle",
        lastName: "Reese",
        role: "student",
        createdAt: new Date(),
      },
    },
  },
  {
    updateOne: {
      filter: { email: "sarah.connor@future.com" },
      update: {
        $set: { lastLoginAt: new Date() },
        $inc: { "stats.totalLogins": 1 },
      },
    },
  },
  {
    deleteOne: {
      filter: { email: "obsolete.user@old.com" },
    },
  },
  {
    replaceOne: {
      filter: { email: "outdated@user.com" },
      replacement: {
        email: "updated@user.com",
        firstName: "Updated",
        lastName: "User",
        role: "student",
        updatedAt: new Date(),
      },
      upsert: true,
    },
  },
];

try {
  const bulkResult = db.users.bulkWrite(bulkOps, { ordered: false });

  print("✓ Bulk write completed:");
  print(`  Inserted: ${bulkResult.insertedCount}`);
  print(`  Updated: ${bulkResult.modifiedCount}`);
  print(`  Deleted: ${bulkResult.deletedCount}`);
  print(`  Upserted: ${bulkResult.upsertedCount}`);
} catch (error) {
  print(`❌ Bulk write failed: ${error.message}`);
}

// =================================================================
// WRITE CONCERNS AND ERROR HANDLING
// =================================================================

print("\n🔥 WRITE CONCERNS & ERROR HANDLING");
print("-" * 30);

// 10. Write concerns for data durability
print("10. Using write concerns for data durability");

try {
  const criticalUpdate = db.users.updateOne(
    { role: "admin" },
    {
      $set: {
        lastSecurityUpdate: new Date(),
        securityLevel: "maximum",
      },
    },
    {
      writeConcern: {
        w: "majority", // Wait for majority of replica set
        j: true, // Wait for journal
        wtimeout: 5000, // Timeout after 5 seconds
      },
    }
  );

  print("✓ Critical update completed with write concern");
} catch (error) {
  if (error.code === 64) {
    print("⚠ Write concern timeout - operation may have succeeded");
  } else {
    print(`❌ Critical update failed: ${error.message}`);
  }
}

// =================================================================
// VALIDATION AND SUMMARY
// =================================================================

print("\n🔥 VALIDATION & SUMMARY");
print("-" * 30);

// Count documents to verify operations
const userCount = db.users.countDocuments();
const courseCount = db.courses.countDocuments();

print(`📊 Final Statistics:`);
print(`  Total Users: ${userCount}`);
print(`  Total Courses: ${courseCount}`);

// Verify specific operations worked
const sarahExists = db.users.findOne({ email: "sarah.connor@future.com" });
const johnExists = db.users.findOne({ email: "john.connor@future.com" });

print(`  Sarah Connor exists: ${sarahExists ? "✓" : "✗"}`);
print(`  John Connor exists: ${johnExists ? "✓" : "✗"}`);

if (sarahExists) {
  print(`  Sarah's role: ${sarahExists.role}`);
}

print("\n🎯 Key Learnings:");
print("• insertOne/insertMany for creating documents");
print("• updateOne/updateMany for modifying documents");
print("• replaceOne for complete document replacement");
print("• Upserts for insert-or-update operations");
print("• Bulk operations for efficiency");
print("• Write concerns for data durability");
print("• Error handling for robust applications");

print("\n✅ Insert & Update operations completed!");
print("Next: Run queries_deletes.js for query and delete operations");
