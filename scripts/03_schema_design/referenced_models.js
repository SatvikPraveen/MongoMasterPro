// File: scripts/03_schema_design/referenced_models.js
// One-to-many, many-to-many reference patterns and normalization

use("mongomasterpro");

print("MongoDB Schema Design: Referenced Models");
print("=" * 50);

// =================================================================
// ONE-TO-MANY REFERENCE PATTERNS
// =================================================================

print("\n🔗 ONE-TO-MANY REFERENCE PATTERNS");
print("-" * 30);

// Clean up test data
db.ref_users.deleteMany({});
db.ref_posts.deleteMany({});
db.ref_comments.deleteMany({});

// 1. User -> Posts (One-to-Many)
print("1. Creating users and their posts (1:Many pattern)");

const refUsers = [
  {
    _id: ObjectId(),
    email: "alice@reference.com",
    firstName: "Alice",
    lastName: "Johnson",
    role: "blogger",
    joinedAt: new Date(),
    postCount: 0,
  },
  {
    _id: ObjectId(),
    email: "bob@reference.com",
    firstName: "Bob",
    lastName: "Smith",
    role: "blogger",
    joinedAt: new Date(),
    postCount: 0,
  },
  {
    _id: ObjectId(),
    email: "charlie@reference.com",
    firstName: "Charlie",
    lastName: "Wilson",
    role: "blogger",
    joinedAt: new Date(),
    postCount: 0,
  },
];

const usersResult = db.ref_users.insertMany(refUsers);
print(
  `✓ Created ${Object.keys(usersResult.insertedIds).length} reference users`
);

// Create posts referencing users (Parent Reference pattern)
const refPosts = [
  {
    _id: ObjectId(),
    title: "Introduction to MongoDB References",
    content: "In this post, we explore referencing patterns...",
    authorId: refUsers[0]._id,
    status: "published",
    tags: ["mongodb", "references"],
    publishedAt: new Date(),
    viewCount: 150,
    likeCount: 12,
  },
  {
    _id: ObjectId(),
    title: "Advanced Aggregation Techniques",
    content: "Let's dive deep into MongoDB aggregation...",
    authorId: refUsers[0]._id,
    status: "published",
    tags: ["mongodb", "aggregation"],
    publishedAt: new Date(Date.now() - 86400000),
    viewCount: 89,
    likeCount: 8,
  },
  {
    _id: ObjectId(),
    title: "Schema Design Best Practices",
    content: "Choosing between embedding and referencing...",
    authorId: refUsers[1]._id,
    status: "published",
    tags: ["mongodb", "schema"],
    publishedAt: new Date(Date.now() - 172800000),
    viewCount: 203,
    likeCount: 15,
  },
  {
    _id: ObjectId(),
    title: "Performance Optimization Tips",
    content: "How to optimize your MongoDB queries...",
    authorId: refUsers[1]._id,
    status: "draft",
    tags: ["mongodb", "performance"],
    publishedAt: null,
    viewCount: 0,
    likeCount: 0,
  },
  {
    _id: ObjectId(),
    title: "Indexing Strategies",
    content: "Complete guide to MongoDB indexing...",
    authorId: refUsers[2]._id,
    status: "published",
    tags: ["mongodb", "indexes"],
    publishedAt: new Date(Date.now() - 259200000),
    viewCount: 178,
    likeCount: 14,
  },
];

const postsResult = db.ref_posts.insertMany(refPosts);
print(
  `✓ Created ${
    Object.keys(postsResult.insertedIds).length
  } posts with author references`
);

// Update user post counts (denormalization for performance)
refUsers.forEach((user) => {
  const userPostCount = refPosts.filter((post) =>
    post.authorId.equals(user._id)
  ).length;
  db.ref_users.updateOne(
    { _id: user._id },
    { $set: { postCount: userPostCount } }
  );
});
print("✓ Updated user post counts (denormalized)");

// =================================================================
// MANY-TO-ONE QUERIES AND LOOKUPS
// =================================================================

print("\n🔍 MANY-TO-ONE QUERIES AND LOOKUPS");
print("-" * 30);

// 2. Query posts with author information using $lookup
print("2. Querying posts with author information");

const postsWithAuthors = db.ref_posts
  .aggregate([
    { $match: { status: "published" } },
    {
      $lookup: {
        from: "ref_users",
        localField: "authorId",
        foreignField: "_id",
        as: "author",
      },
    },
    { $unwind: "$author" },
    {
      $project: {
        title: 1,
        content: { $substr: ["$content", 0, 100] }, // Truncate content
        "author.firstName": 1,
        "author.lastName": 1,
        "author.email": 1,
        publishedAt: 1,
        viewCount: 1,
        tags: 1,
      },
    },
    { $sort: { publishedAt: -1 } },
  ])
  .toArray();

print(
  `✓ Retrieved ${postsWithAuthors.length} posts with author info via $lookup`
);
postsWithAuthors.slice(0, 2).forEach((post, i) => {
  print(
    `  ${i + 1}. "${post.title}" by ${post.author.firstName} ${
      post.author.lastName
    }`
  );
});

// 3. Query authors with their post statistics
const authorsWithStats = db.ref_users
  .aggregate([
    {
      $lookup: {
        from: "ref_posts",
        localField: "_id",
        foreignField: "authorId",
        as: "posts",
      },
    },
    {
      $addFields: {
        totalPosts: { $size: "$posts" },
        publishedPosts: {
          $size: {
            $filter: {
              input: "$posts",
              cond: { $eq: ["$$this.status", "published"] },
            },
          },
        },
        totalViews: { $sum: "$posts.viewCount" },
        totalLikes: { $sum: "$posts.likeCount" },
      },
    },
    {
      $project: {
        firstName: 1,
        lastName: 1,
        email: 1,
        totalPosts: 1,
        publishedPosts: 1,
        totalViews: 1,
        totalLikes: 1,
      },
    },
  ])
  .toArray();

print(`✓ Retrieved author statistics:`);
authorsWithStats.forEach((author) => {
  print(
    `  ${author.firstName}: ${author.publishedPosts}/${author.totalPosts} posts, ${author.totalViews} views`
  );
});

// =================================================================
// ONE-TO-MANY WITH COMMENTS
// =================================================================

print("\n💬 ONE-TO-MANY WITH COMMENTS");
print("-" * 30);

// 4. Create comments referencing posts (Child Reference pattern)
const refComments = [
  {
    _id: ObjectId(),
    postId: refPosts[0]._id,
    authorId: refUsers[1]._id,
    authorName: "Bob Smith",
    content: "Great article! Really helped me understand references.",
    likes: 5,
    createdAt: new Date(Date.now() - 3600000),
    status: "approved",
  },
  {
    _id: ObjectId(),
    postId: refPosts[0]._id,
    authorId: refUsers[2]._id,
    authorName: "Charlie Wilson",
    content: "Thanks for sharing this. The examples are very clear.",
    likes: 3,
    createdAt: new Date(Date.now() - 7200000),
    status: "approved",
  },
  {
    _id: ObjectId(),
    postId: refPosts[0]._id,
    authorId: refUsers[0]._id,
    authorName: "Alice Johnson",
    content: "Thanks everyone! More content coming soon.",
    likes: 2,
    createdAt: new Date(Date.now() - 1800000),
    status: "approved",
  },
  {
    _id: ObjectId(),
    postId: refPosts[2]._id,
    authorId: refUsers[0]._id,
    authorName: "Alice Johnson",
    content: "Excellent insights on schema design!",
    likes: 4,
    createdAt: new Date(Date.now() - 5400000),
    status: "approved",
  },
  {
    _id: ObjectId(),
    postId: refPosts[2]._id,
    authorId: refUsers[2]._id,
    authorName: "Charlie Wilson",
    content: "I wish I had read this earlier in my project.",
    likes: 6,
    createdAt: new Date(Date.now() - 9000000),
    status: "approved",
  },
];

const commentsResult = db.ref_comments.insertMany(refComments);
print(
  `✓ Created ${
    Object.keys(commentsResult.insertedIds).length
  } comments referencing posts`
);

// Update posts with comment counts (denormalization)
refPosts.forEach((post) => {
  const commentCount = refComments.filter((comment) =>
    comment.postId.equals(post._id)
  ).length;
  db.ref_posts.updateOne(
    { _id: post._id },
    { $set: { commentCount: commentCount } }
  );
});
print("✓ Updated post comment counts");

// Query post with its comments
const postWithComments = db.ref_posts
  .aggregate([
    { $match: { _id: refPosts[0]._id } },
    {
      $lookup: {
        from: "ref_comments",
        localField: "_id",
        foreignField: "postId",
        as: "comments",
      },
    },
    {
      $lookup: {
        from: "ref_users",
        localField: "authorId",
        foreignField: "_id",
        as: "author",
      },
    },
    { $unwind: "$author" },
    {
      $project: {
        title: 1,
        content: 1,
        "author.firstName": 1,
        "author.lastName": 1,
        publishedAt: 1,
        comments: {
          $map: {
            input: "$comments",
            as: "comment",
            in: {
              authorName: "$$comment.authorName",
              content: "$$comment.content",
              likes: "$$comment.likes",
              createdAt: "$$comment.createdAt",
            },
          },
        },
      },
    },
  ])
  .toArray();

print(`✓ Retrieved post with ${postWithComments[0].comments.length} comments`);

// =================================================================
// MANY-TO-MANY REFERENCE PATTERNS
// =================================================================

print("\n🔀 MANY-TO-MANY REFERENCE PATTERNS");
print("-" * 30);

// 5. Create many-to-many relationship: Students <-> Courses
db.ref_students.deleteMany({});
db.ref_courses.deleteMany({});
db.ref_enrollments.deleteMany({});

const refStudents = [
  {
    _id: ObjectId(),
    email: "student1@ref.com",
    firstName: "Emma",
    lastName: "Davis",
    major: "Computer Science",
    year: 2,
    gpa: 3.8,
    enrollmentCount: 0,
  },
  {
    _id: ObjectId(),
    email: "student2@ref.com",
    firstName: "James",
    lastName: "Miller",
    major: "Information Systems",
    year: 3,
    gpa: 3.6,
    enrollmentCount: 0,
  },
  {
    _id: ObjectId(),
    email: "student3@ref.com",
    firstName: "Sarah",
    lastName: "Brown",
    major: "Computer Science",
    year: 1,
    gpa: 3.9,
    enrollmentCount: 0,
  },
  {
    _id: ObjectId(),
    email: "student4@ref.com",
    firstName: "Michael",
    lastName: "Jones",
    major: "Data Science",
    year: 2,
    gpa: 3.7,
    enrollmentCount: 0,
  },
];

const refCourses = [
  {
    _id: ObjectId(),
    code: "CS101",
    title: "Introduction to Programming",
    department: "Computer Science",
    credits: 3,
    capacity: 50,
    enrollmentCount: 0,
    instructorName: "Dr. Smith",
  },
  {
    _id: ObjectId(),
    code: "CS201",
    title: "Data Structures",
    department: "Computer Science",
    credits: 4,
    capacity: 40,
    enrollmentCount: 0,
    instructorName: "Dr. Johnson",
  },
  {
    _id: ObjectId(),
    code: "DB301",
    title: "Database Systems",
    department: "Computer Science",
    credits: 3,
    capacity: 35,
    enrollmentCount: 0,
    instructorName: "Dr. Wilson",
  },
  {
    _id: ObjectId(),
    code: "DS401",
    title: "Machine Learning",
    department: "Data Science",
    credits: 4,
    capacity: 30,
    enrollmentCount: 0,
    instructorName: "Dr. Anderson",
  },
];

db.ref_students.insertMany(refStudents);
db.ref_courses.insertMany(refCourses);
print(
  `✓ Created ${refStudents.length} students and ${refCourses.length} courses`
);

// Create junction/bridge collection for many-to-many relationship
const refEnrollments = [
  {
    _id: ObjectId(),
    studentId: refStudents[0]._id,
    courseId: refCourses[0]._id,
    semester: "Fall 2023",
    grade: "A",
    status: "completed",
    enrolledAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    _id: ObjectId(),
    studentId: refStudents[0]._id,
    courseId: refCourses[1]._id,
    semester: "Fall 2023",
    grade: "A-",
    status: "completed",
    enrolledAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    _id: ObjectId(),
    studentId: refStudents[0]._id,
    courseId: refCourses[2]._id,
    semester: "Spring 2024",
    grade: null,
    status: "enrolled",
    enrolledAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    completedAt: null,
  },

  {
    _id: ObjectId(),
    studentId: refStudents[1]._id,
    courseId: refCourses[0]._id,
    semester: "Fall 2023",
    grade: "B+",
    status: "completed",
    enrolledAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    completedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    _id: ObjectId(),
    studentId: refStudents[1]._id,
    courseId: refCourses[2]._id,
    semester: "Spring 2024",
    grade: null,
    status: "enrolled",
    enrolledAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    completedAt: null,
  },
  {
    _id: ObjectId(),
    studentId: refStudents[1]._id,
    courseId: refCourses[3]._id,
    semester: "Spring 2024",
    grade: null,
    status: "enrolled",
    enrolledAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    completedAt: null,
  },

  {
    _id: ObjectId(),
    studentId: refStudents[2]._id,
    courseId: refCourses[0]._id,
    semester: "Spring 2024",
    grade: null,
    status: "enrolled",
    enrolledAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    completedAt: null,
  },
  {
    _id: ObjectId(),
    studentId: refStudents[2]._id,
    courseId: refCourses[1]._id,
    semester: "Spring 2024",
    grade: null,
    status: "enrolled",
    enrolledAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    completedAt: null,
  },

  {
    _id: ObjectId(),
    studentId: refStudents[3]._id,
    courseId: refCourses[3]._id,
    semester: "Spring 2024",
    grade: null,
    status: "enrolled",
    enrolledAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    completedAt: null,
  },
];

db.ref_enrollments.insertMany(refEnrollments);
print(`✓ Created ${refEnrollments.length} enrollments (junction records)`);

// Update denormalized counts
refStudents.forEach((student) => {
  const count = refEnrollments.filter((e) =>
    e.studentId.equals(student._id)
  ).length;
  db.ref_students.updateOne(
    { _id: student._id },
    { $set: { enrollmentCount: count } }
  );
});

refCourses.forEach((course) => {
  const count = refEnrollments.filter((e) =>
    e.courseId.equals(course._id)
  ).length;
  db.ref_courses.updateOne(
    { _id: course._id },
    { $set: { enrollmentCount: count } }
  );
});
print("✓ Updated enrollment counts");

// =================================================================
// MANY-TO-MANY QUERIES
// =================================================================

print("\n🔍 MANY-TO-MANY QUERIES");
print("-" * 30);

// 6. Student transcript (student with all courses)
print("6. Generating student transcripts");

const studentTranscripts = db.ref_students
  .aggregate([
    {
      $lookup: {
        from: "ref_enrollments",
        localField: "_id",
        foreignField: "studentId",
        as: "enrollments",
      },
    },
    {
      $lookup: {
        from: "ref_courses",
        localField: "enrollments.courseId",
        foreignField: "_id",
        as: "courseDetails",
      },
    },
    {
      $project: {
        firstName: 1,
        lastName: 1,
        major: 1,
        gpa: 1,
        courses: {
          $map: {
            input: "$enrollments",
            as: "enrollment",
            in: {
              $mergeObjects: [
                "$$enrollment",
                {
                  courseInfo: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$courseDetails",
                          cond: {
                            $eq: ["$$this._id", "$$enrollment.courseId"],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    },
  ])
  .toArray();

print(`✓ Generated transcripts for ${studentTranscripts.length} students`);
studentTranscripts.slice(0, 2).forEach((student) => {
  print(
    `  ${student.firstName} ${student.lastName}: ${student.courses.length} courses`
  );
});

// 7. Course rosters (course with all students)
const courseRosters = db.ref_courses
  .aggregate([
    {
      $lookup: {
        from: "ref_enrollments",
        localField: "_id",
        foreignField: "courseId",
        as: "enrollments",
      },
    },
    {
      $lookup: {
        from: "ref_students",
        localField: "enrollments.studentId",
        foreignField: "_id",
        as: "studentDetails",
      },
    },
    {
      $project: {
        code: 1,
        title: 1,
        department: 1,
        credits: 1,
        students: {
          $map: {
            input: "$enrollments",
            as: "enrollment",
            in: {
              $mergeObjects: [
                "$$enrollment",
                {
                  studentInfo: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$studentDetails",
                          cond: {
                            $eq: ["$$this._id", "$$enrollment.studentId"],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    },
  ])
  .toArray();

print(`✓ Generated rosters for ${courseRosters.length} courses`);

// =================================================================
// TWO-WAY REFERENCING PATTERN
// =================================================================

print("\n↔️  TWO-WAY REFERENCING PATTERN");
print("-" * 30);

// 8. Create bidirectional references for faster queries
print("8. Implementing two-way references for optimization");

// Update students with course references
refEnrollments.forEach((enrollment) => {
  db.ref_students.updateOne(
    { _id: enrollment.studentId },
    { $addToSet: { courseIds: enrollment.courseId } }
  );
});

// Update courses with student references
refEnrollments.forEach((enrollment) => {
  db.ref_courses.updateOne(
    { _id: enrollment.courseId },
    { $addToSet: { studentIds: enrollment.studentId } }
  );
});

print("✓ Added bidirectional references");

// Test bidirectional queries
const studentCourses = db.ref_students.findOne(
  { _id: refStudents[0]._id },
  { firstName: 1, lastName: 1, courseIds: 1 }
);
print(
  `✓ Student ${studentCourses.firstName} enrolled in ${
    studentCourses.courseIds?.length || 0
  } courses (direct reference)`
);

const courseStudents = db.ref_courses.findOne(
  { _id: refCourses[0]._id },
  { code: 1, title: 1, studentIds: 1 }
);
print(
  `✓ Course ${courseStudents.code} has ${
    courseStudents.studentIds?.length || 0
  } students (direct reference)`
);

// =================================================================
// HIERARCHICAL REFERENCES (TREE STRUCTURES)
// =================================================================

print("\n🌳 HIERARCHICAL REFERENCES");
print("-" * 30);

// 9. Create category hierarchy using references
db.ref_categories.deleteMany({});

const categories = [
  {
    _id: ObjectId(),
    name: "Technology",
    parentId: null,
    level: 0,
    path: "/technology",
    childCount: 0,
  },
  {
    _id: ObjectId(),
    name: "Programming",
    parentId: null,
    level: 1,
    path: "/technology/programming",
    childCount: 0,
  },
  {
    _id: ObjectId(),
    name: "Databases",
    parentId: null,
    level: 1,
    path: "/technology/databases",
    childCount: 0,
  },
  {
    _id: ObjectId(),
    name: "Web Development",
    parentId: null,
    level: 2,
    path: "/technology/programming/web",
    childCount: 0,
  },
  {
    _id: ObjectId(),
    name: "Mobile Development",
    parentId: null,
    level: 2,
    path: "/technology/programming/mobile",
    childCount: 0,
  },
  {
    _id: ObjectId(),
    name: "SQL Databases",
    parentId: null,
    level: 2,
    path: "/technology/databases/sql",
    childCount: 0,
  },
  {
    _id: ObjectId(),
    name: "NoSQL Databases",
    parentId: null,
    level: 2,
    path: "/technology/databases/nosql",
    childCount: 0,
  },
];

// Set up parent-child relationships
categories[1].parentId = categories[0]._id; // Programming -> Technology
categories[2].parentId = categories[0]._id; // Databases -> Technology
categories[3].parentId = categories[1]._id; // Web Dev -> Programming
categories[4].parentId = categories[1]._id; // Mobile Dev -> Programming
categories[5].parentId = categories[2]._id; // SQL -> Databases
categories[6].parentId = categories[2]._id; // NoSQL -> Databases

db.ref_categories.insertMany(categories);
print(`✓ Created ${categories.length} hierarchical categories`);

// Update child counts
categories.forEach((category) => {
  const childCount = categories.filter(
    (cat) => cat.parentId && cat.parentId.equals(category._id)
  ).length;
  db.ref_categories.updateOne(
    { _id: category._id },
    { $set: { childCount: childCount } }
  );
});

// Query: Get category with all descendants
const categoryTree = db.ref_categories
  .aggregate([
    { $match: { name: "Technology" } },
    {
      $graphLookup: {
        from: "ref_categories",
        startWith: "$_id",
        connectFromField: "_id",
        connectToField: "parentId",
        as: "descendants",
      },
    },
    {
      $project: {
        name: 1,
        totalDescendants: { $size: "$descendants" },
        descendants: { $slice: ["$descendants.name", 5] }, // Show first 5
      },
    },
  ])
  .toArray();

print(
  `✓ Category tree: ${categoryTree[0].name} has ${categoryTree[0].totalDescendants} descendants`
);

// =================================================================
// REFERENCE VALIDATION AND INTEGRITY
// =================================================================

print("\n✅ REFERENCE VALIDATION");
print("-" * 30);

// 10. Check referential integrity
function checkReferentialIntegrity() {
  print("Checking referential integrity:");

  // Check orphaned posts (authors that don't exist)
  const orphanedPosts = db.ref_posts
    .aggregate([
      {
        $lookup: {
          from: "ref_users",
          localField: "authorId",
          foreignField: "_id",
          as: "author",
        },
      },
      { $match: { author: { $size: 0 } } },
      { $project: { title: 1, authorId: 1 } },
    ])
    .toArray();

  print(`  Orphaned posts: ${orphanedPosts.length}`);

  // Check orphaned comments
  const orphanedComments = db.ref_comments
    .aggregate([
      {
        $lookup: {
          from: "ref_posts",
          localField: "postId",
          foreignField: "_id",
          as: "post",
        },
      },
      { $match: { post: { $size: 0 } } },
      { $count: "orphanedComments" },
    ])
    .toArray();

  print(`  Orphaned comments: ${orphanedComments[0]?.orphanedComments || 0}`);

  // Check enrollment integrity
  const invalidEnrollments = db.ref_enrollments
    .aggregate([
      {
        $lookup: {
          from: "ref_students",
          localField: "studentId",
          foreignField: "_id",
          as: "student",
        },
      },
      {
        $lookup: {
          from: "ref_courses",
          localField: "courseId",
          foreignField: "_id",
          as: "course",
        },
      },
      {
        $match: {
          $or: [{ student: { $size: 0 } }, { course: { $size: 0 } }],
        },
      },
      { $count: "invalidEnrollments" },
    ])
    .toArray();

  print(
    `  Invalid enrollments: ${invalidEnrollments[0]?.invalidEnrollments || 0}`
  );
}

checkReferentialIntegrity();

// =================================================================
// PERFORMANCE COMPARISON
// =================================================================

print("\n⚡ PERFORMANCE COMPARISON");
print("-" * 30);

// Compare embedded vs referenced queries
function performanceTest() {
  print("Performance comparison (referenced vs embedded):");

  // Referenced query (requires lookup)
  const start1 = Date.now();
  const referencedResult = db.ref_posts
    .aggregate([
      { $match: { status: "published" } },
      {
        $lookup: {
          from: "ref_users",
          localField: "authorId",
          foreignField: "_id",
          as: "author",
        },
      },
      { $unwind: "$author" },
      { $project: { title: 1, "author.firstName": 1, "author.lastName": 1 } },
    ])
    .toArray();
  const referencedTime = Date.now() - start1;

  print(
    `  Referenced pattern: ${referencedTime}ms, ${referencedResult.length} results`
  );

  // For comparison, embedded would be much faster (single query)
  print(`  Embedded pattern: ~1-5ms (no joins needed)`);
  print(`  Trade-off: References are more flexible but slower for reads`);
}

performanceTest();

// =================================================================
// CLEANUP AND SUMMARY
// =================================================================

print("\n📊 REFERENCED MODELS SUMMARY");
print("-" * 30);

const refSummary = {
  users: db.ref_users.countDocuments(),
  posts: db.ref_posts.countDocuments(),
  comments: db.ref_comments.countDocuments(),
  students: db.ref_students.countDocuments(),
  courses: db.ref_courses.countDocuments(),
  enrollments: db.ref_enrollments.countDocuments(),
  categories: db.ref_categories.countDocuments(),
};

print("Created reference examples:");
Object.entries(refSummary).forEach(([collection, count]) => {
  print(`  ${collection}: ${count}`);
});

print("\n🎯 Key Referenced Model Patterns Demonstrated:");
print("• One-to-Many references (users -> posts)");
print("• Child references (posts -> comments)");
print("• Many-to-Many with junction collection (students <-> courses)");
print("• Two-way referencing for performance");
print("• Hierarchical references (category trees)");
print("• $lookup aggregations for joins");
print("• Referential integrity checking");
print("• Denormalized counters for performance");
print("• Complex multi-collection queries");

print("\n✅ Referenced models completed!");
print("Next: Run schema_migrations.js for versioning and migration patterns");
