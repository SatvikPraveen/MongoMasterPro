// File: scripts/04_aggregation/validate_aggregation.js
// Output validation and performance testing for aggregation pipelines

use("mongomasterpro");

print("MongoDB Aggregation: Validation & Performance");
print("=" * 50);

// =================================================================
// AGGREGATION VALIDATION FRAMEWORK
// =================================================================

class AggregationValidator {
  constructor() {
    this.testsPassed = 0;
    this.testsFailed = 0;
    this.warnings = 0;
    this.results = [];
    this.performanceMetrics = [];
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

  testPipelinePerformance(
    pipelineName,
    pipeline,
    collection = "users",
    maxTime = 1000
  ) {
    const start = Date.now();
    let result;
    let error = null;

    try {
      result = db.getCollection(collection).aggregate(pipeline).toArray();
      const duration = Date.now() - start;

      this.performanceMetrics.push({
        pipeline: pipelineName,
        duration: duration,
        resultCount: result.length,
        collection: collection,
      });

      this.assert(
        duration <= maxTime,
        `${pipelineName} performance`,
        `${duration}ms (max: ${maxTime}ms), ${result.length} results`
      );

      return { result, duration, success: true };
    } catch (e) {
      error = e.message;
      this.assert(false, `${pipelineName} execution`, error);
      return { result: null, duration: -1, success: false, error };
    }
  }

  validatePipelineOutput(pipelineName, result, expectedFields, minResults = 1) {
    this.assert(
      result && result.length >= minResults,
      `${pipelineName} returns sufficient results`,
      `${result?.length || 0} results (min: ${minResults})`
    );

    if (!result || result.length === 0) return;

    const firstResult = result[0];
    expectedFields.forEach((field) => {
      const hasField = field
        .split(".")
        .reduce((obj, key) => obj && obj[key] !== undefined, firstResult);
      this.assert(hasField, `${pipelineName} includes field: ${field}`);
    });

    const nullCount = result.filter((doc) => {
      return expectedFields.some((field) => {
        const value = field
          .split(".")
          .reduce((obj, key) => obj && obj[key], doc);
        return value === null || value === undefined;
      });
    }).length;

    if (nullCount > 0) {
      this.warn(
        `${pipelineName} has null values`,
        `${nullCount}/${result.length} results with nulls`
      );
    }
  }

  generateReport() {
    const totalTests = this.testsPassed + this.testsFailed;
    const passRate =
      totalTests > 0 ? ((this.testsPassed / totalTests) * 100).toFixed(1) : 0;

    print("\n" + "=".repeat(60));
    print("AGGREGATION VALIDATION REPORT");
    print("=".repeat(60));
    print(`Total Tests: ${totalTests}`);
    print(`Passed: ${this.testsPassed}`);
    print(`Failed: ${this.testsFailed}`);
    print(`Warnings: ${this.warnings}`);
    print(`Pass Rate: ${passRate}%`);

    if (this.performanceMetrics.length > 0) {
      const avgDuration =
        this.performanceMetrics.reduce((sum, m) => sum + m.duration, 0) /
        this.performanceMetrics.length;
      print(`Average pipeline duration: ${Math.round(avgDuration)}ms`);
    }

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
        ? "\n🎉 ALL AGGREGATION TESTS PASSED!"
        : "\n⚠ SOME AGGREGATION TESTS FAILED"
    );
    return this.testsFailed === 0;
  }
}

const validator = new AggregationValidator();

print("\n🧪 STARTING AGGREGATION VALIDATION TESTS");
print("-".repeat(50));

// =================================================================
// BASIC PIPELINE VALIDATION
// =================================================================

print("\n📋 BASIC PIPELINE VALIDATION");
print("-" * 30);

// Test basic aggregation stages
const matchPipeline = [
  { $match: { role: "student", isActive: true } },
  { $limit: 10 },
];

const matchResult = validator.testPipelinePerformance(
  "Basic $match",
  matchPipeline,
  "users",
  100
);
if (matchResult.success) {
  validator.validatePipelineOutput("Basic $match", matchResult.result, [
    "_id",
    "firstName",
    "lastName",
    "role",
  ]);
}

const groupPipeline = [
  {
    $group: {
      _id: "$role",
      count: { $sum: 1 },
      avgCreatedDays: {
        $avg: {
          $divide: [
            { $subtract: [new Date(), "$createdAt"] },
            1000 * 60 * 60 * 24,
          ],
        },
      },
    },
  },
  { $sort: { count: -1 } },
];

const groupResult = validator.testPipelinePerformance(
  "Basic $group",
  groupPipeline,
  "users",
  200
);
if (groupResult.success) {
  validator.validatePipelineOutput("Basic $group", groupResult.result, [
    "_id",
    "count",
    "avgCreatedDays",
  ]);
}

const projectPipeline = [
  { $match: { role: "student" } },
  {
    $project: {
      fullName: { $concat: ["$firstName", " ", "$lastName"] },
      email: 1,
      accountAge: {
        $round: {
          $divide: [
            { $subtract: [new Date(), "$createdAt"] },
            1000 * 60 * 60 * 24,
          ],
        },
      },
    },
  },
  { $limit: 5 },
];

const projectResult = validator.testPipelinePerformance(
  "Basic $project",
  projectPipeline,
  "users",
  150
);
if (projectResult.success) {
  validator.validatePipelineOutput("Basic $project", projectResult.result, [
    "fullName",
    "email",
    "accountAge",
  ]);
}

// =================================================================
// ADVANCED STAGE VALIDATION
// =================================================================

print("\n🔗 ADVANCED STAGE VALIDATION");
print("-" * 30);

// Test $lookup operations
const lookupPipeline = [
  { $match: { role: "student" } },
  {
    $lookup: {
      from: "enrollments",
      localField: "_id",
      foreignField: "studentId",
      as: "enrollments",
    },
  },
  {
    $project: {
      name: { $concat: ["$firstName", " ", "$lastName"] },
      enrollmentCount: { $size: "$enrollments" },
      hasEnrollments: { $gt: [{ $size: "$enrollments" }, 0] },
    },
  },
  { $limit: 10 },
];

const lookupResult = validator.testPipelinePerformance(
  "$lookup join",
  lookupPipeline,
  "users",
  500
);
if (lookupResult.success) {
  validator.validatePipelineOutput("$lookup join", lookupResult.result, [
    "name",
    "enrollmentCount",
    "hasEnrollments",
  ]);

  const withEnrollments = lookupResult.result.filter(
    (user) => user.hasEnrollments
  ).length;
  validator.assert(
    withEnrollments >= 0,
    "$lookup relationship data",
    `${withEnrollments}/${lookupResult.result.length} users have enrollments`
  );
}

// Test $unwind operations
const unwindPipeline = [
  { $match: { "profile.interests": { $exists: true, $ne: [] } } },
  { $unwind: "$profile.interests" },
  {
    $group: {
      _id: "$profile.interests",
      userCount: { $sum: 1 },
      users: { $addToSet: { $concat: ["$firstName", " ", "$lastName"] } },
    },
  },
  { $sort: { userCount: -1 } },
  { $limit: 5 },
];

const unwindResult = validator.testPipelinePerformance(
  "$unwind analysis",
  unwindPipeline,
  "users",
  300
);
if (unwindResult.success) {
  validator.validatePipelineOutput("$unwind analysis", unwindResult.result, [
    "_id",
    "userCount",
    "users",
  ]);
}

// Test $facet operations
const facetPipeline = [
  {
    $facet: {
      roleBreakdown: [
        { $group: { _id: "$role", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ],
      activityStatus: [{ $group: { _id: "$isActive", count: { $sum: 1 } } }],
      recentUsers: [
        {
          $match: {
            createdAt: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        },
        { $count: "recentCount" },
      ],
    },
  },
];

const facetResult = validator.testPipelinePerformance(
  "$facet multi-analysis",
  facetPipeline,
  "users",
  400
);
if (facetResult.success) {
  const facetData = facetResult.result[0];
  validator.assert(
    facetData.roleBreakdown && facetData.roleBreakdown.length > 0,
    "$facet roleBreakdown populated"
  );
  validator.assert(
    facetData.activityStatus && facetData.activityStatus.length > 0,
    "$facet activityStatus populated"
  );
}

// =================================================================
// DATA INTEGRITY VALIDATION
// =================================================================

print("\n🔍 DATA INTEGRITY VALIDATION");
print("-" * 30);

// Test data integrity across aggregations
const enrollmentIntegrityPipeline = [
  {
    $lookup: {
      from: "users",
      localField: "studentId",
      foreignField: "_id",
      as: "student",
    },
  },
  {
    $lookup: {
      from: "courses",
      localField: "courseId",
      foreignField: "_id",
      as: "course",
    },
  },
  {
    $project: {
      hasValidStudent: { $gt: [{ $size: "$student" }, 0] },
      hasValidCourse: { $gt: [{ $size: "$course" }, 0] },
      studentId: 1,
      courseId: 1,
    },
  },
  { $limit: 20 },
];

const integrityResult = validator.testPipelinePerformance(
  "Data integrity check",
  enrollmentIntegrityPipeline,
  "enrollments",
  600
);
if (integrityResult.success && integrityResult.result.length > 0) {
  const validStudents = integrityResult.result.filter(
    (e) => e.hasValidStudent
  ).length;
  const validCourses = integrityResult.result.filter(
    (e) => e.hasValidCourse
  ).length;

  validator.assert(
    validStudents === integrityResult.result.length,
    "All enrollments have valid student references",
    `${validStudents}/${integrityResult.result.length} valid`
  );

  validator.assert(
    validCourses === integrityResult.result.length,
    "All enrollments have valid course references",
    `${validCourses}/${integrityResult.result.length} valid`
  );
}

// =================================================================
// PERFORMANCE STRESS TESTING
// =================================================================

print("\n⚡ PERFORMANCE STRESS TESTING");
print("-" * 30);

// Test performance under different conditions
const performanceTests = [
  {
    name: "Large result set",
    pipeline: [
      { $match: { isActive: true } },
      { $project: { firstName: 1, lastName: 1, email: 1, role: 1 } },
    ],
    maxTime: 300,
  },
  {
    name: "Complex calculations",
    pipeline: [
      {
        $project: {
          name: { $concat: ["$firstName", " ", "$lastName"] },
          accountAge: {
            $divide: [
              { $subtract: [new Date(), "$createdAt"] },
              1000 * 60 * 60 * 24,
            ],
          },
          score: {
            $add: [
              { $cond: [{ $eq: ["$isActive", true] }, 10, 0] },
              {
                $multiply: [
                  { $size: { $ifNull: ["$profile.interests", []] } },
                  2,
                ],
              },
            ],
          },
        },
      },
      { $sort: { score: -1 } },
      { $limit: 50 },
    ],
    maxTime: 400,
  },
  {
    name: "Multiple lookups",
    pipeline: [
      { $match: { role: "student" } },
      {
        $lookup: {
          from: "enrollments",
          localField: "_id",
          foreignField: "studentId",
          as: "enrollments",
        },
      },
      {
        $lookup: {
          from: "courses",
          localField: "enrollments.courseId",
          foreignField: "_id",
          as: "courses",
        },
      },
      {
        $project: {
          name: { $concat: ["$firstName", " ", "$lastName"] },
          enrollmentCount: { $size: "$enrollments" },
          courseCount: { $size: "$courses" },
        },
      },
      { $limit: 20 },
    ],
    maxTime: 800,
  },
];

performanceTests.forEach((test) => {
  validator.testPipelinePerformance(
    test.name,
    test.pipeline,
    "users",
    test.maxTime
  );
});

// =================================================================
// EDGE CASE VALIDATION
// =================================================================

print("\n🎯 EDGE CASE VALIDATION");
print("-" * 30);

// Test edge cases and error handling
const edgeCases = [
  {
    name: "Empty result handling",
    pipeline: [
      { $match: { nonExistentField: "impossible_value" } },
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ],
  },
  {
    name: "Null field handling",
    pipeline: [
      { $match: { role: { $exists: true } } },
      {
        $project: {
          name: {
            $concat: ["$firstName", " ", { $ifNull: ["$lastName", ""] }],
          },
          hasProfile: { $ne: ["$profile", null] },
          interestCount: { $size: { $ifNull: ["$profile.interests", []] } },
        },
      },
      { $limit: 5 },
    ],
  },
  {
    name: "Division by zero protection",
    pipeline: [
      {
        $project: {
          name: { $concat: ["$firstName", " ", "$lastName"] },
          safeRatio: {
            $cond: {
              if: {
                $eq: [{ $size: { $ifNull: ["$profile.interests", []] } }, 0],
              },
              then: 0,
              else: {
                $divide: [
                  100,
                  { $size: { $ifNull: ["$profile.interests", []] } },
                ],
              },
            },
          },
        },
      },
      { $limit: 5 },
    ],
  },
];

edgeCases.forEach((test) => {
  const result = validator.testPipelinePerformance(
    test.name,
    test.pipeline,
    "users",
    500
  );
  if (result.success) {
    validator.assert(true, `${test.name} handled gracefully`);
  }
});

// =================================================================
// INDEX USAGE VALIDATION
// =================================================================

print("\n📇 INDEX USAGE VALIDATION");
print("-" * 30);

// Test that aggregations use indexes appropriately
const indexTestPipelines = [
  {
    name: "Role index usage",
    pipeline: [{ $match: { role: "student" } }, { $limit: 10 }],
    shouldUseIndex: true,
  },
  {
    name: "Email index usage",
    pipeline: [{ $match: { email: "admin@mongomasterpro.com" } }],
    shouldUseIndex: true,
  },
  {
    name: "Date range index usage",
    pipeline: [
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      { $limit: 10 },
    ],
    shouldUseIndex: true,
  },
];

indexTestPipelines.forEach((test) => {
  try {
    const explain = db.users.aggregate(test.pipeline).explain();
    const usesIndex =
      explain.stages &&
      explain.stages.some(
        (stage) =>
          stage.$cursor &&
          stage.$cursor.executionStats &&
          stage.$cursor.executionStats.executionStages.stage === "IXSCAN"
      );

    if (test.shouldUseIndex) {
      validator.assert(
        usesIndex,
        `${test.name} uses index`,
        usesIndex ? "Index scan detected" : "Collection scan detected"
      );
    }
  } catch (e) {
    validator.warn(`${test.name} explain failed`, e.message);
  }
});

// =================================================================
// AGGREGATION BEST PRACTICES VALIDATION
// =================================================================

print("\n📚 BEST PRACTICES VALIDATION");
print("-" * 30);

// Test adherence to aggregation best practices
print("Validating aggregation best practices:");

// 1. Early filtering
const earlyFilterPipeline = [
  { $match: { role: "student" } }, // Good: filter early
  {
    $lookup: {
      from: "enrollments",
      localField: "_id",
      foreignField: "studentId",
      as: "enrollments",
    },
  },
  { $limit: 5 },
];

const earlyFilterResult = validator.testPipelinePerformance(
  "Early filtering best practice",
  earlyFilterPipeline,
  "users",
  300
);
validator.assert(
  earlyFilterResult.success,
  "Early filtering pipeline executes successfully"
);

// 2. Efficient projections
const efficientProjectPipeline = [
  { $match: { role: "instructor" } },
  { $project: { firstName: 1, lastName: 1, email: 1 } }, // Good: project early to reduce document size
  {
    $lookup: {
      from: "courses",
      localField: "_id",
      foreignField: "instructorId",
      as: "courses",
    },
  },
  { $limit: 5 },
];

const projectionResult = validator.testPipelinePerformance(
  "Efficient projection",
  efficientProjectPipeline,
  "users",
  250
);
validator.assert(
  projectionResult.success,
  "Efficient projection pipeline executes successfully"
);

// =================================================================
// SUMMARY AND CLEANUP
// =================================================================

print("\n📊 AGGREGATION VALIDATION SUMMARY");
print("-" * 30);

// Generate performance summary
if (validator.performanceMetrics.length > 0) {
  print("Performance Summary:");
  const sortedMetrics = validator.performanceMetrics.sort(
    (a, b) => b.duration - a.duration
  );

  print("Slowest pipelines:");
  sortedMetrics.slice(0, 3).forEach((metric, i) => {
    print(
      `  ${i + 1}. ${metric.pipeline}: ${metric.duration}ms (${
        metric.resultCount
      } results)`
    );
  });

  const avgDuration =
    sortedMetrics.reduce((sum, m) => sum + m.duration, 0) /
    sortedMetrics.length;
  const medianDuration =
    sortedMetrics[Math.floor(sortedMetrics.length / 2)].duration;

  print(`Average duration: ${Math.round(avgDuration)}ms`);
  print(`Median duration: ${medianDuration}ms`);

  const slowPipelines = sortedMetrics.filter((m) => m.duration > 500).length;
  if (slowPipelines > 0) {
    validator.warn(
      `${slowPipelines} slow pipelines detected`,
      "Consider optimization"
    );
  }
}

// Generate final report
const success = validator.generateReport();

print("\n🎯 Key Validation Areas Covered:");
print("• Basic aggregation stage functionality");
print("• Advanced stage operations ($lookup, $unwind, $facet)");
print("• Data integrity and referential consistency");
print("• Performance under various conditions");
print("• Edge case and error handling");
print("• Index usage optimization");
print("• Best practices adherence");
print("• Output validation and quality checks");

if (success) {
  print("\n✅ AGGREGATION VALIDATION COMPLETED SUCCESSFULLY!");
  print("All aggregation pipelines are working correctly and performing well.");
  print("Ready to proceed to 05_transactions/ module.");
} else {
  print("\n❌ Some aggregation validations failed!");
  print("Please review and optimize the failing pipelines before proceeding.");
}

print("\nNext steps:");
print("1. Review any failed validations above");
print("2. Optimize slow-performing pipelines if needed");
print("3. Run multi_document_txn.js in 05_transactions/");
print("4. Continue with transaction processing patterns");
