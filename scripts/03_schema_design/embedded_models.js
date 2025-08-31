// File: scripts/03_schema_design/embedded_models.js
// One-to-few, denormalization patterns and embedded document examples

use("mongomasterpro");

print("MongoDB Schema Design: Embedded Models");
print("=" * 50);

// =================================================================
// ONE-TO-FEW EMBEDDING PATTERNS
// =================================================================

print("\n📦 ONE-TO-FEW EMBEDDING PATTERNS");
print("-" * 30);

// Clean up test data
db.users.deleteMany({ email: /embedded\.test/ });

// 1. User with embedded contact methods
const userWithContacts = {
  email: "embedded.test@example.com",
  firstName: "Emma",
  lastName: "Developer",
  role: "student",
  isActive: true,

  contactMethods: [
    {
      type: "email",
      value: "emma.work@company.com",
      verified: true,
      primary: false,
      addedAt: new Date(),
    },
    {
      type: "phone",
      value: "+1-555-0123",
      verified: false,
      primary: true,
      addedAt: new Date(),
    },
    {
      type: "address",
      value: {
        street: "123 Developer St",
        city: "Tech City",
        state: "CA",
        zipCode: "94105",
        country: "USA",
      },
      verified: false,
      primary: true,
      addedAt: new Date(),
    },
  ],

  preferences: {
    theme: "dark",
    notifications: { email: true, push: false, sms: true },
    language: "en",
    timezone: "America/Los_Angeles",
    privacy: {
      profileVisibility: "public",
      showEmail: false,
      showPhone: false,
    },
  },

  socialProfiles: [
    {
      platform: "linkedin",
      url: "https://linkedin.com/in/emma-developer",
      verified: true,
    },
    { platform: "github", url: "https://github.com/emma-dev", verified: true },
    {
      platform: "twitter",
      url: "https://twitter.com/emma_codes",
      verified: false,
    },
  ],

  createdAt: new Date(),
  updatedAt: new Date(),
};

const userResult = db.users.insertOne(userWithContacts);
print(`✓ Created user with embedded contacts: ${userResult.insertedId}`);

// 2. Course with embedded modules and lessons
const courseWithLessons = {
  title: "Embedded Schema Design Masterclass",
  description: "Learn when and how to use embedded documents effectively",
  instructorId: userResult.insertedId,
  status: "active",
  difficulty: "intermediate",
  maxStudents: 30,

  modules: [
    {
      moduleNumber: 1,
      title: "Introduction to Embedding",
      description: "Basic concepts and when to embed",
      duration: 45,
      lessons: [
        {
          lessonNumber: 1,
          title: "What are Embedded Documents?",
          type: "video",
          duration: 15,
          videoUrl: "https://example.com/video1",
          completed: false,
        },
        {
          lessonNumber: 2,
          title: "One-to-Few Relationship Patterns",
          type: "reading",
          duration: 20,
          content: "When you have a small, bounded set of related data...",
          completed: false,
        },
        {
          lessonNumber: 3,
          title: "Hands-on Practice",
          type: "exercise",
          duration: 10,
          exerciseInstructions:
            "Create a user document with embedded preferences",
          completed: false,
        },
      ],
      completed: false,
      completedAt: null,
    },
    {
      moduleNumber: 2,
      title: "Advanced Embedding Patterns",
      description: "Subset pattern, denormalization strategies",
      duration: 60,
      lessons: [
        {
          lessonNumber: 1,
          title: "The Subset Pattern",
          type: "video",
          duration: 25,
          videoUrl: "https://example.com/video2",
          completed: false,
        },
        {
          lessonNumber: 2,
          title: "When NOT to Embed",
          type: "reading",
          duration: 20,
          content: "Avoid embedding when data grows unbounded...",
          completed: false,
        },
        {
          lessonNumber: 3,
          title: "Migration Strategies",
          type: "video",
          duration: 15,
          videoUrl: "https://example.com/video3",
          completed: false,
        },
      ],
      completed: false,
      completedAt: null,
    },
  ],

  pricingTiers: [
    {
      name: "basic",
      price: 99,
      currency: "USD",
      features: [
        "Full course access",
        "Community forum",
        "Certificate of completion",
      ],
      popular: false,
    },
    {
      name: "premium",
      price: 199,
      currency: "USD",
      features: [
        "Everything in Basic",
        "1-on-1 mentor sessions",
        "Priority support",
        "Bonus advanced modules",
      ],
      popular: true,
    },
  ],

  faq: [
    {
      question: "How long do I have access to the course?",
      answer: "Lifetime access to all course materials and updates.",
      order: 1,
    },
    {
      question: "Is there a money-back guarantee?",
      answer: "Yes, 30-day money-back guarantee if you're not satisfied.",
      order: 2,
    },
    {
      question: "Do I get a certificate?",
      answer: "Yes, you'll receive a certificate of completion.",
      order: 3,
    },
  ],

  tags: ["mongodb", "schema-design", "embedding", "database"],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const courseResult = db.courses.insertOne(courseWithLessons);
print(`✓ Created course with embedded modules: ${courseResult.insertedId}`);

// =================================================================
// DENORMALIZATION PATTERNS
// =================================================================

print("\n📊 DENORMALIZATION PATTERNS");
print("-" * 30);

// 3. Order with denormalized customer data
const orderWithDenormalization = {
  _id: new ObjectId(),
  orderNumber: "ORD-2023-001",
  customerId: userResult.insertedId, // Reference

  customerInfo: {
    // Denormalized for performance
    email: userWithContacts.email,
    firstName: userWithContacts.firstName,
    lastName: userWithContacts.lastName,
    primaryPhone: userWithContacts.contactMethods.find(
      (c) => c.type === "phone" && c.primary
    )?.value,
  },

  items: [
    {
      courseId: courseResult.insertedId,
      courseName: courseWithLessons.title,
      price: 199,
      quantity: 1,
      subtotal: 199,
    },
  ],

  shippingAddress: {
    recipientName: "Emma Developer",
    street: "123 Developer St",
    city: "Tech City",
    state: "CA",
    zipCode: "94105",
    country: "USA",
  },
  payment: {
    method: "credit_card",
    last4: "1234",
    provider: "Visa",
    transactionId: "txn_abc123",
    processedAt: new Date(),
  },

  subtotal: 199,
  tax: 19.9,
  shipping: 0,
  total: 218.9,
  status: "completed",
  placedAt: new Date(),
  updatedAt: new Date(),
};

const orderResult = db.orders.insertOne(orderWithDenormalization);
print(`✓ Created order with denormalized data: ${orderResult.insertedId}`);

// =================================================================
// SUBSET PATTERN IMPLEMENTATION
// =================================================================

print("\n🎯 SUBSET PATTERN IMPLEMENTATION");
print("-" * 30);

// 4. Create detailed reviews collection
const detailedReviews = [
  {
    _id: new ObjectId(),
    courseId: courseResult.insertedId,
    userId: userResult.insertedId,
    rating: 5,
    title: "Excellent Course!",
    content:
      "This course really helped me understand when to use embedded documents vs references. The examples were practical and the explanations were clear.",
    helpful: 15,
    reported: false,
    verified: true,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
  {
    _id: new ObjectId(),
    courseId: courseResult.insertedId,
    userId: new ObjectId(),
    rating: 4,
    title: "Good Content, Could Use More Examples",
    content:
      "The theoretical content is solid but I would have liked more hands-on examples. The embedding patterns are well explained though.",
    helpful: 8,
    reported: false,
    verified: true,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    _id: new ObjectId(),
    courseId: courseResult.insertedId,
    userId: new ObjectId(),
    rating: 5,
    title: "Best MongoDB Course I've Taken",
    content:
      "Comprehensive coverage of schema design patterns. The instructor clearly has real-world experience.",
    helpful: 12,
    reported: false,
    verified: true,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
];

const reviewsResult = db.course_reviews.insertMany(detailedReviews);
print(`✓ Created ${reviewsResult.insertedIds.length} detailed reviews`);

// Update course with subset of recent reviews
const recentReviews = detailedReviews
  .sort((a, b) => b.createdAt - a.createdAt)
  .slice(0, 2)
  .map((review) => ({
    _id: review._id,
    userId: review.userId,
    rating: review.rating,
    title: review.title,
    content: review.content.substring(0, 100) + "...",
    helpful: review.helpful,
    createdAt: review.createdAt,
  }));

const reviewStats = {
  totalReviews: detailedReviews.length,
  averageRating:
    detailedReviews.reduce((sum, r) => sum + r.rating, 0) /
    detailedReviews.length,
  ratingDistribution: {
    5: detailedReviews.filter((r) => r.rating === 5).length,
    4: detailedReviews.filter((r) => r.rating === 4).length,
    3: detailedReviews.filter((r) => r.rating === 3).length,
    2: detailedReviews.filter((r) => r.rating === 2).length,
    1: detailedReviews.filter((r) => r.rating === 1).length,
  },
};

db.courses.updateOne(
  { _id: courseResult.insertedId },
  {
    $set: {
      recentReviews: recentReviews,
      reviewStats: reviewStats,
      updatedAt: new Date(),
    },
  }
);

print(
  `✓ Updated course with subset pattern (${recentReviews.length} recent reviews embedded)`
);

// =================================================================
// NESTED EMBEDDING PATTERNS
// =================================================================

print("\n🗂️  NESTED EMBEDDING PATTERNS");
print("-" * 30);

// 5. Blog post with embedded comments and replies
const blogPostWithComments = {
  title: "Advanced MongoDB Schema Patterns",
  content:
    "In this post, we'll explore advanced patterns for MongoDB schema design...",
  authorId: userResult.insertedId,
  authorName: "Emma Developer", // Denormalized
  slug: "advanced-mongodb-schema-patterns",
  status: "published",

  // Embedded comments (1:Many but limited)
  comments: [
    {
      _id: new ObjectId(),
      authorId: new ObjectId(),
      authorName: "John Smith",
      content: "Great article! The embedded patterns are really helpful.",
      likes: 5,

      // Nested replies (1:Few within each comment)
      replies: [
        {
          _id: new ObjectId(),
          authorId: userResult.insertedId,
          authorName: "Emma Developer",
          content: "Thanks John! Glad you found it useful.",
          likes: 2,
          createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        },
      ],

      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      _id: new ObjectId(),
      authorId: new ObjectId(),
      authorName: "Sarah Wilson",
      content:
        "The subset pattern example was exactly what I needed for my project.",
      likes: 3,
      replies: [],
      createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      updatedAt: new Date(Date.now() - 30 * 60 * 1000),
    },
  ],

  // Embedded metadata
  metadata: {
    readTime: 8, // minutes
    wordCount: 1200,
    tags: ["mongodb", "schema", "database", "patterns"],
    category: "Database Design",
    featured: true,
    seoTitle: "Advanced MongoDB Schema Design Patterns | Best Practices",
    seoDescription:
      "Learn advanced MongoDB schema design patterns including embedding, referencing, and hybrid approaches.",
  },

  // Embedded statistics
  stats: {
    views: 1547,
    likes: 89,
    shares: 23,
    commentsCount: 2,
    avgRating: 4.8,
  },

  publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
  createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
  updatedAt: new Date(),
};

const blogResult = db.blog_posts.insertOne(blogPostWithComments);
print(`✓ Created blog post with nested comments: ${blogResult.insertedId}`);

// =================================================================
// POLYMORPHIC EMBEDDING PATTERNS
// =================================================================

print("\n🎭 POLYMORPHIC EMBEDDING PATTERNS");
print("-" * 30);

// 6. Mixed content types in single collection
const mixedContent = [
  {
    _id: new ObjectId(),
    type: "article",
    title: "Getting Started with MongoDB",
    authorId: userResult.insertedId,

    // Article-specific embedded data
    articleData: {
      content:
        "MongoDB is a document database that provides high performance...",
      readTime: 5,
      wordCount: 800,
      tableOfContents: [
        { section: "Introduction", anchor: "intro" },
        { section: "Installation", anchor: "install" },
        { section: "Basic Operations", anchor: "basics" },
      ],
    },

    tags: ["mongodb", "tutorial", "beginner"],
    publishedAt: new Date(),
    createdAt: new Date(),
  },
  {
    _id: new ObjectId(),
    type: "video",
    title: "MongoDB Aggregation Pipeline Tutorial",
    authorId: userResult.insertedId,

    // Video-specific embedded data
    videoData: {
      videoUrl: "https://youtube.com/watch?v=example",
      duration: 1800, // seconds
      resolution: "1080p",
      thumbnail: "https://example.com/thumb.jpg",
      transcript: "Welcome to this aggregation tutorial...",
      chapters: [
        { title: "Introduction", startTime: 0, endTime: 300 },
        { title: "Match Stage", startTime: 300, endTime: 600 },
        { title: "Group Stage", startTime: 600, endTime: 1200 },
      ],
    },

    tags: ["mongodb", "aggregation", "tutorial", "video"],
    publishedAt: new Date(),
    createdAt: new Date(),
  },
  {
    _id: new ObjectId(),
    type: "quiz",
    title: "MongoDB Schema Design Quiz",
    authorId: userResult.insertedId,

    // Quiz-specific embedded data
    quizData: {
      timeLimit: 600, // seconds
      passingScore: 80, // percentage
      questions: [
        {
          questionNumber: 1,
          question: "When should you embed documents?",
          type: "multiple_choice",
          options: [
            "When you have one-to-many relationships",
            "When you have one-to-few relationships",
            "When you have many-to-many relationships",
            "Always",
          ],
          correctAnswer: 1,
          explanation:
            "Embed when you have one-to-few relationships with bounded data.",
        },
        {
          questionNumber: 2,
          question: "What is the document size limit in MongoDB?",
          type: "short_answer",
          correctAnswer: "16MB",
          explanation: "MongoDB documents have a maximum size of 16MB.",
        },
      ],
    },

    tags: ["mongodb", "quiz", "assessment"],
    publishedAt: new Date(),
    createdAt: new Date(),
  },
];

const contentResult = db.mixed_content.insertMany(mixedContent);
print(
  `✓ Created ${contentResult.insertedIds.length} polymorphic content items`
);

// =================================================================
// QUERY PATTERNS FOR EMBEDDED DATA
// =================================================================

print("\n🔍 QUERY PATTERNS FOR EMBEDDED DATA");
print("-" * 30);

print("Testing embedded data queries:");

// 7. Query embedded arrays
const usersWithLinkedIn = db.users.find({
  "socialProfiles.platform": "linkedin",
  "socialProfiles.verified": true,
});
print(`✓ Users with verified LinkedIn: ${usersWithLinkedIn.count()}`);

// Query nested embedded documents
const coursesWithVideos = db.courses.find({
  "modules.lessons.type": "video",
});
print(`✓ Courses with video lessons: ${coursesWithVideos.count()}`);

// Query using dot notation on embedded objects
const darkThemeUsers = db.users.find({
  "preferences.theme": "dark",
});
print(`✓ Users with dark theme: ${darkThemeUsers.count()}`);

// Array element queries
const phoneUsers = db.users.find({
  contactMethods: {
    $elemMatch: {
      type: "phone",
      verified: false,
    },
  },
});
print(`✓ Users with unverified phone numbers: ${phoneUsers.count()}`);

// =================================================================
// EMBEDDED DATA UPDATES
// =================================================================

print("\n✏️  EMBEDDED DATA UPDATE PATTERNS");
print("-" * 30);

print("Testing embedded data updates:");

// 8. Update specific array element using positional operator
const phoneUpdate = db.users.updateOne(
  {
    email: "embedded.test@example.com",
    "contactMethods.type": "phone",
  },
  {
    $set: {
      "contactMethods.$.verified": true,
      "contactMethods.$.verifiedAt": new Date(),
    },
  }
);
print(`✓ Updated phone verification: ${phoneUpdate.modifiedCount} document(s)`);

// Update nested embedded document
const lessonUpdate = db.courses.updateOne(
  {
    _id: courseResult.insertedId,
    "modules.moduleNumber": 1,
    "modules.lessons.lessonNumber": 1,
  },
  {
    $set: {
      "modules.$[module].lessons.$[lesson].completed": true,
      "modules.$[module].lessons.$[lesson].completedAt": new Date(),
    },
  },
  {
    arrayFilters: [{ "module.moduleNumber": 1 }, { "lesson.lessonNumber": 1 }],
  }
);
print(`✓ Updated lesson completion: ${lessonUpdate.modifiedCount} document(s)`);

// Add new element to embedded array
const socialUpdate = db.users.updateOne(
  { email: "embedded.test@example.com" },
  {
    $push: {
      socialProfiles: {
        platform: "stackoverflow",
        url: "https://stackoverflow.com/users/emma-dev",
        verified: false,
      },
    },
  }
);
print(`✓ Added social profile: ${socialUpdate.modifiedCount} document(s)`);

// =================================================================
// VALIDATION AND BEST PRACTICES
// =================================================================

print("\n✅ VALIDATION AND BEST PRACTICES");
print("-" * 30);

print("Validating embedded model patterns:");

// Check document sizes
function checkDocumentSizes(collectionName) {
  const stats = db.getCollection(collectionName).stats();
  const avgSize = stats.avgObjSize;
  const maxSize = 16 * 1024 * 1024; // 16MB limit

  print(
    `${collectionName} - Average document size: ${(avgSize / 1024).toFixed(
      2
    )} KB`
  );

  if (avgSize > maxSize * 0.1) {
    // Warn if > 1.6MB (10% of limit)
    print(`⚠ Large documents detected in ${collectionName}`);
  } else {
    print(`✓ Document sizes optimal for ${collectionName}`);
  }
}

checkDocumentSizes("users");
checkDocumentSizes("courses");
checkDocumentSizes("orders");

// Verify array bounds
const userWithManyContacts = db.users.findOne({
  email: "embedded.test@example.com",
});
const contactCount = userWithManyContacts.contactMethods.length;
const socialCount = userWithManyContacts.socialProfiles.length;

print(`✓ Contact methods count: ${contactCount} (should be < 10)`);
print(`✓ Social profiles count: ${socialCount} (should be < 10)`);

// Check for proper indexing on embedded fields
const embeddedIndexes = [
  { collection: "users", field: "preferences.theme" },
  { collection: "courses", field: "modules.lessons.type" },
  { collection: "users", field: "socialProfiles.platform" },
];

embeddedIndexes.forEach((indexInfo) => {
  const indexes = db.getCollection(indexInfo.collection).getIndexes();
  const hasIndex = indexes.some((idx) => idx.key[indexInfo.field]);
  print(
    `${hasIndex ? "✓" : "⚠"} Index on ${indexInfo.collection}.${
      indexInfo.field
    }: ${hasIndex ? "exists" : "missing"}`
  );
});

// =================================================================
// CLEANUP AND SUMMARY
// =================================================================

print("\n🧹 CLEANUP");
print("-" * 30);

// Optional: Clean up test data (commented out to preserve examples)
// db.users.deleteMany({ email: /embedded\.test/ });
// db.courses.deleteMany({ title: /Embedded Schema Design/ });
// db.orders.deleteMany({ orderNumber: /ORD-2023/ });
// db.course_reviews.deleteMany({});
// db.blog_posts.deleteMany({});
// db.mixed_content.deleteMany({});

print("✓ Test data preserved for exploration");

print("\n📊 EMBEDDED MODELS SUMMARY");
print("-" * 30);

const summary = {
  usersCreated: db.users.countDocuments({ email: /embedded\.test/ }),
  coursesWithModules: db.courses.countDocuments({
    "modules.0": { $exists: true },
  }),
  ordersWithDenormalization: db.orders.countDocuments({
    customerInfo: { $exists: true },
  }),
  reviewsTotal: db.course_reviews.countDocuments(),
  blogPostsWithComments: db.blog_posts.countDocuments({
    "comments.0": { $exists: true },
  }),
  polymorphicContent: db.mixed_content.countDocuments(),
};

print("Created examples:");
Object.entries(summary).forEach(([key, count]) => {
  print(`  ${key}: ${count}`);
});

print("\n🎯 Key Embedded Model Patterns Demonstrated:");
print("• One-to-Few embedding (contacts, social profiles)");
print("• Nested embedding (course modules with lessons)");
print("• Denormalization for performance (order with customer info)");
print("• Subset pattern (recent reviews embedded, full reviews separate)");
print("• Polymorphic embedding (different content types)");
print("• Complex nested structures (blog comments with replies)");
print("• Embedded arrays with bounded growth");
print("• Mixed embedding strategies in single documents");

print("\n✅ Embedded models completed!");
print(
  "Next: Run referenced_models.js for one-to-many and many-to-many patterns"
);
