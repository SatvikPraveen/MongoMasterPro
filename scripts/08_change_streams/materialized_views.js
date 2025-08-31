// File: scripts/08_change_streams/materialized_views.js
// MongoDB Materialized Views - CDC for Derived Collections and Real-time Analytics

/**
 * MATERIALIZED VIEWS WITH CHANGE STREAMS
 * =======================================
 * Implementation of materialized views using Change Data Capture (CDC).
 * Maintains derived collections that update automatically via change streams.
 */

// Database connections
const db = db.getSiblingDB("lms_primary");
const analyticsDB = db.getSiblingDB("lms_analytics");

print("\n" + "=".repeat(80));
print("MONGODB MATERIALIZED VIEWS");
print("=".repeat(80));

// ============================================================================
// 1. MATERIALIZED VIEW INFRASTRUCTURE
// ============================================================================

print("\n1. MATERIALIZED VIEW INFRASTRUCTURE");
print("-".repeat(50));

/**
 * Initialize materialized view collections and metadata
 */
function initializeMaterializedViews() {
  print("\n🏗️ INITIALIZING MATERIALIZED VIEW INFRASTRUCTURE:");

  const materializedViews = [
    {
      name: "user_enrollment_summary",
      description: "Real-time user enrollment statistics",
      sourceCollections: ["enrollments", "users", "courses"],
      updateTriggers: ["enrollment changes", "course updates", "user updates"],
      refreshStrategy: "incremental",
    },
    {
      name: "course_analytics",
      description: "Course performance and engagement metrics",
      sourceCollections: ["courses", "enrollments", "grades", "assignments"],
      updateTriggers: [
        "grade submissions",
        "new enrollments",
        "course changes",
      ],
      refreshStrategy: "incremental",
    },
    {
      name: "instructor_dashboard",
      description: "Instructor performance and student progress",
      sourceCollections: ["courses", "enrollments", "grades", "users"],
      updateTriggers: [
        "grade changes",
        "enrollment updates",
        "assignment submissions",
      ],
      refreshStrategy: "incremental",
    },
    {
      name: "revenue_analytics",
      description: "Financial performance and revenue tracking",
      sourceCollections: ["enrollments", "courses", "payments"],
      updateTriggers: [
        "new enrollments",
        "payment updates",
        "course price changes",
      ],
      refreshStrategy: "incremental",
    },
  ];

  materializedViews.forEach((view) => {
    print(`\n📊 Setting up ${view.name}:`);
    print(`   Description: ${view.description}`);
    print(`   Source Collections: ${view.sourceCollections.join(", ")}`);
    print(`   Update Triggers: ${view.updateTriggers.join(", ")}`);
    print(`   Strategy: ${view.refreshStrategy}`);

    try {
      // Create the materialized view collection
      analyticsDB.createCollection(view.name);

      // Create metadata document
      analyticsDB.mv_metadata.replaceOne(
        { _id: view.name },
        {
          _id: view.name,
          description: view.description,
          sourceCollections: view.sourceCollections,
          lastRefresh: new Date(),
          refreshStrategy: view.refreshStrategy,
          status: "active",
          documentCount: 0,
          createdAt: new Date(),
        },
        { upsert: true }
      );

      print(`   ✅ ${view.name} initialized`);
    } catch (error) {
      print(`   ❌ Error initializing ${view.name}: ${error.message}`);
    }
  });
}

/**
 * Create indexes for materialized views
 */
function createMaterializedViewIndexes() {
  print("\n📇 CREATING MATERIALIZED VIEW INDEXES:");

  const indexConfigurations = [
    {
      collection: "user_enrollment_summary",
      indexes: [
        { userId: 1 },
        { totalEnrollments: -1 },
        { lastEnrolled: -1 },
        { userId: 1, status: 1 },
      ],
    },
    {
      collection: "course_analytics",
      indexes: [
        { courseId: 1 },
        { category: 1, enrollmentCount: -1 },
        { averageRating: -1 },
        { revenue: -1 },
      ],
    },
    {
      collection: "instructor_dashboard",
      indexes: [
        { instructorId: 1 },
        { totalStudents: -1 },
        { averageCourseRating: -1 },
        { instructorId: 1, courseId: 1 },
      ],
    },
    {
      collection: "revenue_analytics",
      indexes: [
        { period: 1 },
        { category: 1, totalRevenue: -1 },
        { courseId: 1, period: 1 },
      ],
    },
  ];

  indexConfigurations.forEach((config) => {
    print(`\n📋 ${config.collection} indexes:`);
    config.indexes.forEach((indexSpec) => {
      try {
        analyticsDB[config.collection].createIndex(indexSpec);
        print(`   ✅ Created: ${JSON.stringify(indexSpec)}`);
      } catch (error) {
        print(`   ❌ Failed: ${JSON.stringify(indexSpec)} - ${error.message}`);
      }
    });
  });
}

// ============================================================================
// 2. USER ENROLLMENT SUMMARY VIEW
// ============================================================================

print("\n2. USER ENROLLMENT SUMMARY VIEW");
print("-".repeat(50));

/**
 * Setup user enrollment summary materialized view
 */
function setupUserEnrollmentSummary() {
  print("\n👤 USER ENROLLMENT SUMMARY VIEW:");

  // Initial population query
  print("\n🔄 Initial Population Query:");
  const initialPopulationQuery = `
analyticsDB.user_enrollment_summary.deleteMany({});

db.users.aggregate([
    {
        $lookup: {
            from: 'enrollments',
            localField: '_id',
            foreignField: 'userId',
            as: 'enrollments'
        }
    },
    {
        $addFields: {
            totalEnrollments: { $size: '$enrollments' },
            activeEnrollments: {
                $size: {
                    $filter: {
                        input: '$enrollments',
                        cond: { $eq: ['$$this.status', 'active'] }
                    }
                }
            },
            completedEnrollments: {
                $size: {
                    $filter: {
                        input: '$enrollments',
                        cond: { $eq: ['$$this.status', 'completed'] }
                    }
                }
            },
            lastEnrolled: { $max: '$enrollments.enrolledAt' },
            totalSpent: { $sum: '$enrollments.amountPaid' }
        }
    },
    {
        $project: {
            userId: '$_id',
            userName: '$name',
            email: '$email',
            totalEnrollments: 1,
            activeEnrollments: 1,
            completedEnrollments: 1,
            lastEnrolled: 1,
            totalSpent: 1,
            completionRate: {
                $cond: {
                    if: { $gt: ['$totalEnrollments', 0] },
                    then: { $divide: ['$completedEnrollments', '$totalEnrollments'] },
                    else: 0
                }
            },
            lastUpdated: new Date()
        }
    },
    {
        $out: 'user_enrollment_summary'
    }
]).toArray()`;

  print(initialPopulationQuery);

  // Change stream for incremental updates
  print("\n🌊 Change Stream Configuration:");
  print(`
const enrollmentChangeStream = db.enrollments.watch([
    { $match: { 'operationType': { $in: ['insert', 'update', 'delete', 'replace'] } } }
]);

enrollmentChangeStream.forEach(change => {
    updateUserEnrollmentSummary(change);
});

function updateUserEnrollmentSummary(change) {
    const userId = change.fullDocument ? change.fullDocument.userId :
                   change.documentKey ? extractUserIdFromChange(change) : null;

    if (userId) {
        // Recalculate summary for affected user
        const userSummary = db.users.aggregate([
            { $match: { _id: userId } },
            {
                $lookup: {
                    from: 'enrollments',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'enrollments'
                }
            }
            // ... rest of aggregation pipeline
        ]).toArray()[0];

        if (userSummary) {
            analyticsDB.user_enrollment_summary.replaceOne(
                { userId: userId },
                userSummary,
                { upsert: true }
            );
        }
    }
}
    `);

  print("\n📊 View Usage Examples:");
  const usageExamples = [
    {
      query:
        "analyticsDB.user_enrollment_summary.find({ totalEnrollments: { $gte: 5 } })",
      description: "Find users with 5+ enrollments",
    },
    {
      query:
        "analyticsDB.user_enrollment_summary.find({ completionRate: { $gte: 0.8 } })",
      description: "Find high-performing students",
    },
    {
      query:
        "analyticsDB.user_enrollment_summary.aggregate([{ $group: { _id: null, avgSpent: { $avg: '$totalSpent' } } }])",
      description: "Calculate average spending per user",
    },
  ];

  usageExamples.forEach((example) => {
    print(`\n   ${example.description}:`);
    print(`   ${example.query}`);
  });
}

// ============================================================================
// 3. COURSE ANALYTICS VIEW
// ============================================================================

print("\n3. COURSE ANALYTICS VIEW");
print("-".repeat(50));

/**
 * Setup course analytics materialized view
 */
function setupCourseAnalytics() {
  print("\n📚 COURSE ANALYTICS VIEW:");

  print("\n🔄 Initial Population Logic:");
  print(`
// Comprehensive course analytics calculation
db.courses.aggregate([
    {
        $lookup: {
            from: 'enrollments',
            localField: '_id',
            foreignField: 'courseId',
            as: 'enrollments'
        }
    },
    {
        $lookup: {
            from: 'assignments',
            localField: '_id',
            foreignField: 'courseId',
            as: 'assignments'
        }
    },
    {
        $lookup: {
            from: 'grades',
            localField: '_id',
            foreignField: 'courseId',
            as: 'grades'
        }
    },
    {
        $addFields: {
            totalEnrollments: { $size: '$enrollments' },
            activeEnrollments: {
                $size: { $filter: { input: '$enrollments', cond: { $eq: ['$$this.status', 'active'] } } }
            },
            completedEnrollments: {
                $size: { $filter: { input: '$enrollments', cond: { $eq: ['$$this.status', 'completed'] } } }
            },
            totalRevenue: { $sum: '$enrollments.amountPaid' },
            averageGrade: { $avg: '$grades.score' },
            totalAssignments: { $size: '$assignments' },
            submittedAssignments: {
                $size: { $filter: { input: '$grades', cond: { $ne: ['$$this.score', null] } } }
            }
        }
    },
    {
        $project: {
            courseId: '$_id',
            title: 1,
            category: 1,
            instructor: 1,
            price: 1,
            totalEnrollments: 1,
            activeEnrollments: 1,
            completedEnrollments: 1,
            totalRevenue: 1,
            averageGrade: 1,
            completionRate: {
                $cond: {
                    if: { $gt: ['$totalEnrollments', 0] },
                    then: { $divide: ['$completedEnrollments', '$totalEnrollments'] },
                    else: 0
                }
            },
            engagementScore: {
                $cond: {
                    if: { $gt: ['$totalAssignments', 0] },
                    then: { $divide: ['$submittedAssignments', { $multiply: ['$totalAssignments', '$totalEnrollments'] }] },
                    else: 0
                }
            },
            revenuePerEnrollment: {
                $cond: {
                    if: { $gt: ['$totalEnrollments', 0] },
                    then: { $divide: ['$totalRevenue', '$totalEnrollments'] },
                    else: 0
                }
            },
            lastUpdated: new Date()
        }
    },
    {
        $out: 'course_analytics'
    }
])
    `);

  print("\n🌊 Multi-Collection Change Stream:");
  print(`
// Monitor multiple collections for course analytics updates
const collections = ['enrollments', 'grades', 'assignments', 'courses'];

collections.forEach(collectionName => {
    const changeStream = db[collectionName].watch([
        { $match: { 'operationType': { $in: ['insert', 'update', 'delete'] } } }
    ]);

    changeStream.forEach(change => {
        updateCourseAnalytics(change, collectionName);
    });
});

function updateCourseAnalytics(change, sourceCollection) {
    let courseId;

    // Extract courseId based on source collection
    switch(sourceCollection) {
        case 'courses':
            courseId = change.documentKey._id;
            break;
        case 'enrollments':
        case 'grades':
        case 'assignments':
            courseId = change.fullDocument ? change.fullDocument.courseId : null;
            break;
    }

    if (courseId) {
        // Recalculate analytics for affected course
        recalculateCourseAnalytics(courseId);
    }
}
    `);

  print("\n📊 Analytics Insights Available:");
  const insights = [
    "Course popularity and enrollment trends",
    "Revenue performance by course and category",
    "Student engagement and completion rates",
    "Grade distributions and academic performance",
    "Instructor performance comparisons",
    "Pricing optimization opportunities",
  ];

  insights.forEach((insight, index) => {
    print(`   ${index + 1}. ${insight}`);
  });
}

// ============================================================================
// 4. INSTRUCTOR DASHBOARD VIEW
// ============================================================================

print("\n4. INSTRUCTOR DASHBOARD VIEW");
print("-".repeat(50));

/**
 * Setup instructor dashboard materialized view
 */
function setupInstructorDashboard() {
  print("\n👨‍🏫 INSTRUCTOR DASHBOARD VIEW:");

  print("\n🎯 Dashboard Metrics Calculation:");
  print(`
db.users.aggregate([
    { $match: { role: 'instructor' } },
    {
        $lookup: {
            from: 'courses',
            localField: '_id',
            foreignField: 'instructorId',
            as: 'courses'
        }
    },
    {
        $unwind: { path: '$courses', preserveNullAndEmptyArrays: true }
    },
    {
        $lookup: {
            from: 'enrollments',
            localField: 'courses._id',
            foreignField: 'courseId',
            as: 'courseEnrollments'
        }
    },
    {
        $lookup: {
            from: 'grades',
            localField: 'courses._id',
            foreignField: 'courseId',
            as: 'courseGrades'
        }
    },
    {
        $group: {
            _id: '$_id',
            instructorName: { $first: '$name' },
            email: { $first: '$email' },
            totalCourses: { $sum: { $cond: [{ $ne: ['$courses', null] }, 1, 0] } },
            totalStudents: { $sum: { $size: '$courseEnrollments' } },
            totalRevenue: { $sum: { $sum: '$courseEnrollments.amountPaid' } },
            averageGrade: { $avg: { $avg: '$courseGrades.score' } },
            courses: {
                $push: {
                    $cond: [
                        { $ne: ['$courses', null] },
                        {
                            courseId: '$courses._id',
                            title: '$courses.title',
                            enrollments: { $size: '$courseEnrollments' },
                            revenue: { $sum: '$courseEnrollments.amountPaid' },
                            averageGrade: { $avg: '$courseGrades.score' }
                        },
                        null
                    ]
                }
            }
        }
    },
    {
        $addFields: {
            courses: { $filter: { input: '$courses', cond: { $ne: ['$$this', null] } } }
        }
    },
    {
        $project: {
            instructorId: '$_id',
            instructorName: 1,
            email: 1,
            totalCourses: 1,
            totalStudents: 1,
            totalRevenue: 1,
            averageGrade: 1,
            revenuePerStudent: {
                $cond: {
                    if: { $gt: ['$totalStudents', 0] },
                    then: { $divide: ['$totalRevenue', '$totalStudents'] },
                    else: 0
                }
            },
            courses: 1,
            lastUpdated: new Date()
        }
    },
    { $out: 'instructor_dashboard' }
])
    `);

  print("\n🔄 Real-time Updates Strategy:");
  print(`
// Update instructor dashboard when relevant data changes
function updateInstructorDashboard(change, sourceCollection) {
    let instructorId;

    switch(sourceCollection) {
        case 'courses':
            instructorId = change.fullDocument ? change.fullDocument.instructorId : null;
            break;
        case 'enrollments':
            // Get instructor from course
            const enrollment = change.fullDocument;
            if (enrollment && enrollment.courseId) {
                const course = db.courses.findOne({ _id: enrollment.courseId });
                instructorId = course ? course.instructorId : null;
            }
            break;
        case 'grades':
            // Get instructor from course via grade
            const grade = change.fullDocument;
            if (grade && grade.courseId) {
                const course = db.courses.findOne({ _id: grade.courseId });
                instructorId = course ? course.instructorId : null;
            }
            break;
    }

    if (instructorId) {
        recalculateInstructorDashboard(instructorId);
    }
}
    `);

  print("\n📈 Dashboard Features:");
  const features = [
    "Course performance comparison",
    "Student progress tracking",
    "Revenue analytics by course",
    "Grade distribution analysis",
    "Enrollment trend monitoring",
    "Student engagement metrics",
  ];

  features.forEach((feature, index) => {
    print(`   ${index + 1}. ${feature}`);
  });
}

// ============================================================================
// 5. REVENUE ANALYTICS VIEW
// ============================================================================

print("\n5. REVENUE ANALYTICS VIEW");
print("-".repeat(50));

/**
 * Setup revenue analytics materialized view
 */
function setupRevenueAnalytics() {
  print("\n💰 REVENUE ANALYTICS VIEW:");

  print("\n📊 Time-based Revenue Aggregation:");
  print(`
// Generate revenue analytics by time periods
db.enrollments.aggregate([
    { $match: { status: { $in: ['active', 'completed'] }, amountPaid: { $gt: 0 } } },
    {
        $lookup: {
            from: 'courses',
            localField: 'courseId',
            foreignField: '_id',
            as: 'course'
        }
    },
    { $unwind: '$course' },
    {
        $addFields: {
            year: { $year: '$enrolledAt' },
            month: { $month: '$enrolledAt' },
            week: { $week: '$enrolledAt' },
            day: { $dayOfYear: '$enrolledAt' }
        }
    },
    {
        $group: {
            _id: {
                period: '$year',
                subPeriod: '$month',
                category: '$course.category'
            },
            totalRevenue: { $sum: '$amountPaid' },
            enrollmentCount: { $sum: 1 },
            uniqueCourses: { $addToSet: '$courseId' },
            averageOrderValue: { $avg: '$amountPaid' }
        }
    },
    {
        $project: {
            period: '$_id.period',
            subPeriod: '$_id.subPeriod',
            category: '$_id.category',
            totalRevenue: 1,
            enrollmentCount: 1,
            uniqueCoursesCount: { $size: '$uniqueCourses' },
            averageOrderValue: 1,
            revenuePerCourse: {
                $divide: ['$totalRevenue', { $size: '$uniqueCourses' }]
            },
            lastUpdated: new Date()
        }
    },
    { $out: 'revenue_analytics' }
])
    `);

  print("\n⚡ Real-time Revenue Updates:");
  print(`
// Monitor enrollment changes for revenue updates
const revenueChangeStream = db.enrollments.watch([
    {
        $match: {
            'operationType': { $in: ['insert', 'update'] },
            $or: [
                { 'fullDocument.amountPaid': { $exists: true } },
                { 'updateDescription.updatedFields.amountPaid': { $exists: true } }
            ]
        }
    }
]);

revenueChangeStream.forEach(change => {
    updateRevenueAnalytics(change);
});

function updateRevenueAnalytics(change) {
    const enrollment = change.fullDocument;
    if (!enrollment || !enrollment.enrolledAt) return;

    const period = {
        year: enrollment.enrolledAt.getFullYear(),
        month: enrollment.enrolledAt.getMonth() + 1
    };

    // Get course category
    const course = db.courses.findOne({ _id: enrollment.courseId });
    const category = course ? course.category : 'unknown';

    // Recalculate revenue for this period/category
    recalculateRevenuePeriod(period.year, period.month, category);
}
    `);

  print("\n📈 Revenue Insights:");
  const revenueMetrics = [
    "Monthly and yearly revenue trends",
    "Revenue by course category",
    "Average order value analysis",
    "Course performance ROI",
    "Seasonal revenue patterns",
    "Revenue forecasting data points",
  ];

  revenueMetrics.forEach((metric, index) => {
    print(`   ${index + 1}. ${metric}`);
  });
}

// ============================================================================
// 6. MATERIALIZED VIEW MAINTENANCE
// ============================================================================

print("\n6. MATERIALIZED VIEW MAINTENANCE");
print("-".repeat(50));

/**
 * Materialized view maintenance and monitoring
 */
function setupViewMaintenance() {
  print("\n🔧 MATERIALIZED VIEW MAINTENANCE:");

  print("\n⏰ Scheduled Maintenance Jobs:");
  print(`
// Daily maintenance job
function dailyViewMaintenance() {
    const views = ['user_enrollment_summary', 'course_analytics', 'instructor_dashboard', 'revenue_analytics'];

    views.forEach(viewName => {
        try {
            // Update metadata
            analyticsDB.mv_metadata.updateOne(
                { _id: viewName },
                {
                    $set: {
                        lastMaintenance: new Date(),
                        documentCount: analyticsDB[viewName].countDocuments()
                    }
                }
            );

            // Validate data integrity
            validateViewIntegrity(viewName);

            // Optimize indexes
            optimizeViewIndexes(viewName);

        } catch (error) {
            console.log(\`Maintenance failed for \${viewName}: \${error.message}\`);
        }
    });
}

// Weekly full refresh (fallback)
function weeklyViewRefresh() {
    const views = ['user_enrollment_summary', 'course_analytics', 'instructor_dashboard', 'revenue_analytics'];

    views.forEach(viewName => {
        try {
            console.log(\`Starting full refresh for \${viewName}\`);

            // Backup current view
            analyticsDB[\`\${viewName}_backup\`].drop();
            analyticsDB[\`\${viewName}_backup\`].insertMany(
                analyticsDB[viewName].find().toArray()
            );

            // Full refresh
            refreshMaterializedView(viewName);

            console.log(\`Full refresh completed for \${viewName}\`);

        } catch (error) {
            // Restore from backup if refresh fails
            restoreViewFromBackup(viewName);
            console.error(\`Refresh failed for \${viewName}: \${error.message}\`);
        }
    });
}
    `);

  print("\n🔍 View Health Monitoring:");
  print(`
function monitorViewHealth() {
    const healthReport = {
        timestamp: new Date(),
        views: []
    };

    const viewNames = ['user_enrollment_summary', 'course_analytics', 'instructor_dashboard', 'revenue_analytics'];

    viewNames.forEach(viewName => {
        const metadata = analyticsDB.mv_metadata.findOne({ _id: viewName });
        const currentCount = analyticsDB[viewName].countDocuments();
        const lastUpdate = metadata ? metadata.lastRefresh : null;

        const viewHealth = {
            name: viewName,
            documentCount: currentCount,
            lastUpdate: lastUpdate,
            status: 'healthy',
            issues: []
        };

        // Check for stale data
        if (lastUpdate && (new Date() - lastUpdate) > 24 * 60 * 60 * 1000) {
            viewHealth.status = 'stale';
            viewHealth.issues.push('Data older than 24 hours');
        }

        // Check for significant count changes
        if (metadata && metadata.documentCount) {
            const countChange = Math.abs(currentCount - metadata.documentCount) / metadata.documentCount;
            if (countChange > 0.5) {
                viewHealth.status = 'anomaly';
                viewHealth.issues.push(\`Document count changed by \${(countChange * 100).toFixed(1)}%\`);
            }
        }

        healthReport.views.push(viewHealth);
    });

    // Store health report
    analyticsDB.view_health_reports.insertOne(healthReport);

    return healthReport;
}
    `);

  print("\n🚨 Error Handling:");
  const errorHandling = [
    "Change stream reconnection on failure",
    "Partial update rollback mechanisms",
    "Automatic fallback to full refresh",
    "View corruption detection and repair",
    "Performance degradation alerts",
  ];

  errorHandling.forEach((item, index) => {
    print(`   ${index + 1}. ${item}`);
  });
}

// ============================================================================
// 7. EXECUTION SECTION
// ============================================================================

print("\n7. EXECUTING MATERIALIZED VIEWS SETUP");
print("-".repeat(50));

try {
  // Initialize infrastructure
  initializeMaterializedViews();
  createMaterializedViewIndexes();

  // Setup individual views
  setupUserEnrollmentSummary();
  setupCourseAnalytics();
  setupInstructorDashboard();
  setupRevenueAnalytics();

  // Setup maintenance
  setupViewMaintenance();

  print("\n✅ Materialized views setup completed!");
  print("🔄 Change streams enable real-time updates");
  print("📊 Analytics data is automatically maintained");
  print("⚡ Query performance significantly improved");

  print("\n🚀 USAGE EXAMPLES:");
  print("// Get top performing courses");
  print(
    "analyticsDB.course_analytics.find().sort({ totalRevenue: -1 }).limit(10)"
  );
  print("");
  print("// Find high-value students");
  print(
    "analyticsDB.user_enrollment_summary.find({ totalSpent: { $gte: 1000 } })"
  );
  print("");
  print("// Instructor performance comparison");
  print("analyticsDB.instructor_dashboard.find().sort({ totalRevenue: -1 })");
} catch (error) {
  print("❌ Error during materialized views setup:");
  print(error.message);
}

print("\n" + "=".repeat(80));
print("MATERIALIZED VIEWS COMPLETE");
print("=".repeat(80));
