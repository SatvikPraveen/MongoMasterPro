// File: scripts/00_setup/data_modes.js
// Lite (5k) vs Full (50k+) data generation modes

const DataModes = {
  LITE: {
    users: 100,
    courses: 25,
    assignments: 150,
    submissions: 800,
    enrollments: 300,
    grades: 600,
  },
  FULL: {
    users: 5000,
    courses: 500,
    assignments: 3000,
    submissions: 25000,
    enrollments: 15000,
    grades: 20000,
  },
  ENTERPRISE: {
    users: 50000,
    courses: 2000,
    assignments: 15000,
    submissions: 150000,
    enrollments: 100000,
    grades: 120000,
  },
};

class DataGenerator {
  constructor(mode = "LITE") {
    this.mode = mode;
    this.config = DataModes[mode];
    this.batchSize = 1000;
    this.generated = {
      users: [],
      courses: [],
      assignments: [],
      submissions: [],
      enrollments: [],
      grades: [],
    };

    print(`🎯 Data Generator initialized for ${mode} mode`);
    this.printTargets();
  }

  printTargets() {
    print("Target document counts:");
    Object.entries(this.config).forEach(([collection, count]) => {
      print(`  ${collection}: ${count.toLocaleString()}`);
    });
    print();
  }

  // Generate realistic names and emails
  generateUserData() {
    const firstNames = [
      "Alice",
      "Bob",
      "Charlie",
      "Diana",
      "Edward",
      "Fiona",
      "George",
      "Helen",
      "Ian",
      "Julia",
      "Kevin",
      "Linda",
      "Michael",
      "Nancy",
      "Oliver",
      "Patricia",
      "Quinn",
      "Rachel",
      "Steven",
      "Tina",
      "Ulrich",
      "Victoria",
      "William",
      "Xenia",
      "Yuki",
      "Zachary",
      "Emma",
      "James",
      "Sophia",
      "Benjamin",
      "Isabella",
      "Lucas",
    ];

    const lastNames = [
      "Smith",
      "Johnson",
      "Williams",
      "Brown",
      "Jones",
      "Garcia",
      "Miller",
      "Davis",
      "Rodriguez",
      "Martinez",
      "Hernandez",
      "Lopez",
      "Gonzalez",
      "Wilson",
      "Anderson",
      "Thomas",
      "Taylor",
      "Moore",
      "Jackson",
      "Martin",
      "Lee",
      "Perez",
      "Thompson",
      "White",
      "Harris",
      "Sanchez",
      "Clark",
      "Ramirez",
      "Lewis",
      "Robinson",
      "Walker",
    ];

    const domains = [
      "gmail.com",
      "yahoo.com",
      "hotmail.com",
      "student.edu",
      "university.edu",
      "company.com",
    ];
    const roles = ["student", "instructor", "admin"];
    const experienceLevels = ["beginner", "intermediate", "advanced"];

    print("Generating user data...");
    const users = [];

    for (let i = 0; i < this.config.users; i++) {
      const firstName =
        firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const domain = domains[Math.floor(Math.random() * domains.length)];
      const role = i < 50 ? "instructor" : i < 55 ? "admin" : "student";

      const user = {
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${domain}`,
        firstName: firstName,
        lastName: lastName,
        role: role,
        isActive: Math.random() > 0.05, // 95% active
        profile: {
          experienceLevel:
            experienceLevels[
              Math.floor(Math.random() * experienceLevels.length)
            ],
          interests: this.generateRandomInterests(),
          goals: this.generateRandomGoals(),
          timezone: this.generateRandomTimezone(),
        },
        preferences: {
          theme: Math.random() > 0.5 ? "dark" : "light",
          notifications: Math.random() > 0.3,
          language: Math.random() > 0.8 ? "es" : "en",
        },
        createdAt: this.generateRandomDate(365),
        updatedAt: this.generateRandomDate(30),
        lastLoginAt: this.generateRandomDate(7),
      };

      if (role === "instructor") {
        user.bio = this.generateInstructorBio();
        user.specializations = this.generateSpecializations();
        user.yearsExperience = Math.floor(Math.random() * 20) + 1;
      }

      users.push(user);

      if ((i + 1) % this.batchSize === 0) {
        print(`  Generated ${i + 1}/${this.config.users} users`);
      }
    }

    this.generated.users = users;
    return users;
  }

  generateCourseData(instructors) {
    const courseTopics = [
      "MongoDB Fundamentals",
      "Advanced Aggregation",
      "Schema Design",
      "Performance Optimization",
      "Replication & Sharding",
      "Security & Authentication",
      "Change Streams",
      "Transactions",
      "Data Modeling",
      "Index Strategies",
      "GridFS",
      "MongoDB Atlas",
      "Backup & Recovery",
      "Monitoring & Alerting",
      "Migration Strategies",
      "Real-time Analytics",
    ];

    const difficulties = ["beginner", "intermediate", "advanced"];
    const statuses = ["draft", "active", "archived"];

    print("Generating course data...");
    const courses = [];
    const instructorIds = instructors
      .filter((u) => u.role === "instructor")
      .map((u) => u._id);

    for (let i = 0; i < this.config.courses; i++) {
      const topic = courseTopics[i % courseTopics.length];
      const level =
        difficulties[Math.floor(Math.random() * difficulties.length)];
      const instructorId =
        instructorIds[Math.floor(Math.random() * instructorIds.length)];

      const course = {
        title: `${topic} - ${level.charAt(0).toUpperCase() + level.slice(1)}`,
        description: this.generateCourseDescription(topic, level),
        instructorId: instructorId,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        difficulty: level,
        duration: Math.floor(Math.random() * 8) + 4 + " weeks",
        maxStudents: Math.floor(Math.random() * 40) + 20,
        tags: this.generateCourseTags(topic),
        price: Math.floor(Math.random() * 300) + 50,
        rating: parseFloat((Math.random() * 2 + 3).toFixed(1)), // 3.0 - 5.0
        totalEnrollments: 0, // Will be updated later
        createdAt: this.generateRandomDate(180),
        updatedAt: this.generateRandomDate(30),
      };

      courses.push(course);

      if ((i + 1) % 100 === 0) {
        print(`  Generated ${i + 1}/${this.config.courses} courses`);
      }
    }

    this.generated.courses = courses;
    return courses;
  }

  generateEnrollmentData(students, courses) {
    print("Generating enrollment data...");
    const enrollments = [];
    const studentIds = students
      .filter((u) => u.role === "student")
      .map((u) => u._id);
    const activeCourses = courses.filter((c) => c.status === "active");
    const statuses = ["enrolled", "completed", "dropped", "suspended"];

    for (let i = 0; i < this.config.enrollments; i++) {
      const studentId =
        studentIds[Math.floor(Math.random() * studentIds.length)];
      const course =
        activeCourses[Math.floor(Math.random() * activeCourses.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const enrolledDate = this.generateRandomDate(120);

      const enrollment = {
        studentId: studentId,
        courseId: course._id,
        enrolledAt: enrolledDate,
        status: status,
        progress:
          status === "completed" ? 100 : Math.floor(Math.random() * 100),
        completedAt:
          status === "completed"
            ? new Date(
                enrolledDate.getTime() +
                  Math.random() * 90 * 24 * 60 * 60 * 1000
              )
            : null,
        lastAccessedAt: this.generateRandomDate(7),
      };

      enrollments.push(enrollment);

      if ((i + 1) % this.batchSize === 0) {
        print(`  Generated ${i + 1}/${this.config.enrollments} enrollments`);
      }
    }

    this.generated.enrollments = enrollments;
    return enrollments;
  }

  generateAssignmentData(courses) {
    print("Generating assignment data...");
    const assignments = [];
    const assignmentTypes = [
      "quiz",
      "project",
      "homework",
      "exam",
      "presentation",
    ];

    for (let i = 0; i < this.config.assignments; i++) {
      const course = courses[Math.floor(Math.random() * courses.length)];
      const type =
        assignmentTypes[Math.floor(Math.random() * assignmentTypes.length)];
      const createdDate = this.generateRandomDate(90);
      const dueDate = new Date(
        createdDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000
      );

      const assignment = {
        courseId: course._id,
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} ${
          Math.floor(i / 10) + 1
        }`,
        description: this.generateAssignmentDescription(type),
        type: type,
        maxPoints: type === "exam" ? 100 : type === "project" ? 150 : 50,
        dueDate: dueDate,
        instructions: this.generateInstructions(type),
        isPublished: Math.random() > 0.2, // 80% published
        allowLateSubmission: Math.random() > 0.5,
        createdAt: createdDate,
        updatedAt: this.generateRandomDate(14),
      };

      assignments.push(assignment);

      if ((i + 1) % 500 === 0) {
        print(`  Generated ${i + 1}/${this.config.assignments} assignments`);
      }
    }

    this.generated.assignments = assignments;
    return assignments;
  }

  generateSubmissionData(assignments, enrollments) {
    print("Generating submission data...");
    const submissions = [];
    const statuses = ["submitted", "late", "draft", "graded"];

    for (let i = 0; i < this.config.submissions; i++) {
      const assignment =
        assignments[Math.floor(Math.random() * assignments.length)];
      const relevantEnrollments = enrollments.filter(
        (e) => e.courseId.toString() === assignment.courseId.toString()
      );

      if (relevantEnrollments.length === 0) continue;

      const enrollment =
        relevantEnrollments[
          Math.floor(Math.random() * relevantEnrollments.length)
        ];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const submittedDate =
        status === "draft" ? null : this.generateRandomDate(30);

      const submission = {
        assignmentId: assignment._id,
        studentId: enrollment.studentId,
        courseId: assignment.courseId,
        content: this.generateSubmissionContent(),
        status: status,
        submittedAt: submittedDate,
        isLate:
          submittedDate &&
          assignment.dueDate &&
          submittedDate > assignment.dueDate,
        attachments: this.generateAttachments(),
        createdAt: this.generateRandomDate(35),
        updatedAt: submittedDate || this.generateRandomDate(7),
      };

      submissions.push(submission);

      if ((i + 1) % this.batchSize === 0) {
        print(`  Generated ${i + 1}/${this.config.submissions} submissions`);
      }
    }

    this.generated.submissions = submissions;
    return submissions;
  }

  generateGradeData(submissions) {
    print("Generating grade data...");
    const grades = [];
    const gradedSubmissions = submissions.filter(
      (s) => s.status === "graded" || Math.random() > 0.3
    );

    for (
      let i = 0;
      i < Math.min(this.config.grades, gradedSubmissions.length);
      i++
    ) {
      const submission = gradedSubmissions[i];
      const assignment = this.generated.assignments.find(
        (a) => a._id.toString() === submission.assignmentId.toString()
      );

      if (!assignment) continue;

      const pointsEarned =
        Math.floor(Math.random() * assignment.maxPoints * 0.4) +
        Math.floor(assignment.maxPoints * 0.6); // Bias toward higher scores

      const grade = {
        assignmentId: submission.assignmentId,
        studentId: submission.studentId,
        courseId: submission.courseId,
        submissionId: submission._id,
        pointsEarned: pointsEarned,
        maxPoints: assignment.maxPoints,
        percentage: Math.round((pointsEarned / assignment.maxPoints) * 100),
        letterGrade: this.calculateLetterGrade(
          pointsEarned,
          assignment.maxPoints
        ),
        feedback: this.generateFeedback(),
        gradedBy: this.getRandomInstructor(),
        gradedAt: new Date(
          submission.submittedAt.getTime() +
            Math.random() * 7 * 24 * 60 * 60 * 1000
        ),
        createdAt: new Date(),
      };

      grades.push(grade);

      if ((i + 1) % this.batchSize === 0) {
        print(
          `  Generated ${i + 1}/${Math.min(
            this.config.grades,
            gradedSubmissions.length
          )} grades`
        );
      }
    }

    this.generated.grades = grades;
    return grades;
  }

  // Helper methods for generating realistic data
  generateRandomDate(daysBack) {
    const now = new Date();
    const randomDays = Math.floor(Math.random() * daysBack);
    return new Date(now.getTime() - randomDays * 24 * 60 * 60 * 1000);
  }

  generateRandomInterests() {
    const interests = [
      "web development",
      "data analysis",
      "machine learning",
      "mobile development",
      "database design",
      "cloud computing",
      "cybersecurity",
      "devops",
      "ai",
      "backend development",
      "frontend development",
      "full stack",
    ];

    const count = Math.floor(Math.random() * 4) + 1;
    const selected = [];

    for (let i = 0; i < count; i++) {
      const interest = interests[Math.floor(Math.random() * interests.length)];
      if (!selected.includes(interest)) {
        selected.push(interest);
      }
    }

    return selected;
  }

  generateRandomGoals() {
    const goals = [
      "get a job in tech",
      "improve database skills",
      "build a portfolio project",
      "start a side business",
      "change careers",
      "get promoted",
      "learn new technologies",
      "contribute to open source",
      "become a tech lead",
      "master mongodb",
    ];

    const count = Math.floor(Math.random() * 3) + 1;
    return goals.sort(() => 0.5 - Math.random()).slice(0, count);
  }

  generateRandomTimezone() {
    const timezones = [
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "Europe/London",
      "Europe/Paris",
      "Asia/Tokyo",
      "Asia/Shanghai",
      "Australia/Sydney",
    ];

    return timezones[Math.floor(Math.random() * timezones.length)];
  }

  generateInstructorBio() {
    const bios = [
      "Experienced database engineer with expertise in MongoDB and NoSQL systems.",
      "Former tech lead at major tech company, passionate about teaching database fundamentals.",
      "MongoDB certified professional with 10+ years of experience in data architecture.",
      "Full-stack developer specializing in modern web applications and database optimization.",
      "Data engineer with extensive experience in big data and real-time analytics.",
    ];

    return bios[Math.floor(Math.random() * bios.length)];
  }

  generateSpecializations() {
    const specs = [
      "MongoDB",
      "Database Design",
      "Performance Optimization",
      "Data Architecture",
      "NoSQL Systems",
      "Aggregation Pipelines",
      "Replication",
      "Sharding",
      "Security",
      "Cloud Databases",
      "Real-time Analytics",
      "Migration Strategies",
    ];

    const count = Math.floor(Math.random() * 4) + 2;
    return specs.sort(() => 0.5 - Math.random()).slice(0, count);
  }

  // Additional helper methods for course, assignment, and other data generation
  generateCourseDescription(topic, level) {
    return `Comprehensive ${level} course covering ${topic}. Learn practical skills through hands-on exercises and real-world projects.`;
  }

  generateCourseTags(topic) {
    const baseTags = ["mongodb", "database", "nosql"];
    const topicTags = topic.toLowerCase().split(" ").slice(0, 2);
    return [...baseTags, ...topicTags];
  }

  generateAssignmentDescription(type) {
    const descriptions = {
      quiz: "Test your understanding with this interactive quiz",
      project: "Apply your learning in this comprehensive project",
      homework: "Practice exercises to reinforce key concepts",
      exam: "Comprehensive assessment of course material",
      presentation: "Present your findings to the class",
    };

    return (
      descriptions[type] ||
      "Complete this assignment to demonstrate your learning"
    );
  }

  generateInstructions(type) {
    return `Detailed instructions for completing this ${type}. Follow the guidelines and submit your work by the due date.`;
  }

  generateSubmissionContent() {
    return "Student submission content with answers, code, and explanations...";
  }

  generateAttachments() {
    const attachments = [];
    const count = Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      attachments.push({
        filename: `attachment_${i + 1}.pdf`,
        filesize: Math.floor(Math.random() * 5000000), // Up to 5MB
        uploadedAt: new Date(),
      });
    }

    return attachments;
  }

  calculateLetterGrade(points, maxPoints) {
    const percentage = (points / maxPoints) * 100;
    if (percentage >= 97) return "A+";
    if (percentage >= 93) return "A";
    if (percentage >= 90) return "A-";
    if (percentage >= 87) return "B+";
    if (percentage >= 83) return "B";
    if (percentage >= 80) return "B-";
    if (percentage >= 77) return "C+";
    if (percentage >= 73) return "C";
    if (percentage >= 70) return "C-";
    if (percentage >= 67) return "D+";
    if (percentage >= 63) return "D";
    if (percentage >= 60) return "D-";
    return "F";
  }

  generateFeedback() {
    const feedback = [
      "Excellent work! Your solution demonstrates deep understanding.",
      "Good effort. Consider reviewing the aggregation pipeline concepts.",
      "Well done. Your schema design shows good planning.",
      "Nice work on the optimization techniques.",
      "Great use of indexes to improve query performance.",
    ];

    return feedback[Math.floor(Math.random() * feedback.length)];
  }

  getRandomInstructor() {
    const instructors = this.generated.users.filter(
      (u) => u.role === "instructor"
    );
    return instructors[Math.floor(Math.random() * instructors.length)]._id;
  }

  // Main generation and insertion methods
  async insertData() {
    print("Starting data insertion process...");

    use("mongomasterpro");

    try {
      // Insert users first (needed for foreign keys)
      if (this.generated.users.length > 0) {
        print("Inserting users...");
        const userResult = await db.users.insertMany(this.generated.users, {
          ordered: false,
        });

        // Update generated data with actual ObjectIds
        this.generated.users = this.generated.users.map((user, index) => ({
          ...user,
          _id: userResult.insertedIds[index],
        }));

        print(`✓ Inserted ${userResult.insertedIds.length} users`);
      }

      // Insert courses
      if (this.generated.courses.length > 0) {
        print("Inserting courses...");
        const courseResult = await db.courses.insertMany(
          this.generated.courses,
          { ordered: false }
        );

        this.generated.courses = this.generated.courses.map(
          (course, index) => ({
            ...course,
            _id: courseResult.insertedIds[index],
          })
        );

        print(`✓ Inserted ${courseResult.insertedIds.length} courses`);
      }

      // Insert enrollments
      if (this.generated.enrollments.length > 0) {
        print("Inserting enrollments...");
        const enrollmentResult = await db.enrollments.insertMany(
          this.generated.enrollments,
          { ordered: false }
        );
        print(`✓ Inserted ${enrollmentResult.insertedIds.length} enrollments`);
      }

      // Insert assignments
      if (this.generated.assignments.length > 0) {
        print("Inserting assignments...");
        const assignmentResult = await db.assignments.insertMany(
          this.generated.assignments,
          { ordered: false }
        );

        this.generated.assignments = this.generated.assignments.map(
          (assignment, index) => ({
            ...assignment,
            _id: assignmentResult.insertedIds[index],
          })
        );

        print(`✓ Inserted ${assignmentResult.insertedIds.length} assignments`);
      }

      // Insert submissions
      if (this.generated.submissions.length > 0) {
        print("Inserting submissions...");
        const submissionResult = await db.submissions.insertMany(
          this.generated.submissions,
          { ordered: false }
        );

        this.generated.submissions = this.generated.submissions.map(
          (submission, index) => ({
            ...submission,
            _id: submissionResult.insertedIds[index],
          })
        );

        print(`✓ Inserted ${submissionResult.insertedIds.length} submissions`);
      }

      // Insert grades
      if (this.generated.grades.length > 0) {
        print("Inserting grades...");
        const gradeResult = await db.grades.insertMany(this.generated.grades, {
          ordered: false,
        });
        print(`✓ Inserted ${gradeResult.insertedIds.length} grades`);
      }

      print("\n🎉 All data inserted successfully!");
    } catch (error) {
      print(`❌ Error during data insertion: ${error.message}`);
      throw error;
    }
  }

  generateAll() {
    print(`\n🚀 Starting ${this.mode} data generation...`);

    const users = this.generateUserData();
    const courses = this.generateCourseData(users);
    const enrollments = this.generateEnrollmentData(users, courses);
    const assignments = this.generateAssignmentData(courses);
    const submissions = this.generateSubmissionData(assignments, enrollments);
    const grades = this.generateGradeData(submissions);

    print("\n📊 Generation Summary:");
    print(`Users: ${users.length}`);
    print(`Courses: ${courses.length}`);
    print(`Enrollments: ${enrollments.length}`);
    print(`Assignments: ${assignments.length}`);
    print(`Submissions: ${submissions.length}`);
    print(`Grades: ${grades.length}`);

    return {
      users,
      courses,
      enrollments,
      assignments,
      submissions,
      grades,
    };
  }
}

// Main execution function
function runDataGeneration(mode = "LITE") {
  print("MongoMasterPro Data Generation");
  print("=" * 40);
  print(`Mode: ${mode}`);
  print(`Started at: ${new Date().toISOString()}\n`);

  try {
    const generator = new DataGenerator(mode);
    const data = generator.generateAll();

    print("\nInserting data into MongoDB...");
    generator.insertData();

    print(`\n✅ Data generation completed successfully!`);
    print(`Mode: ${mode}`);
    print(`Completed at: ${new Date().toISOString()}`);

    return data;
  } catch (error) {
    print(`\n❌ Data generation failed: ${error.message}`);
    throw error;
  }
}

// Command line interface
const mode =
  typeof arguments !== "undefined" && arguments[0]
    ? arguments[0].toUpperCase()
    : "LITE";

if (!DataModes[mode]) {
  print(`❌ Invalid mode: ${mode}`);
  print("Available modes: LITE, FULL, ENTERPRISE");
  quit(1);
}

runDataGeneration(mode);
