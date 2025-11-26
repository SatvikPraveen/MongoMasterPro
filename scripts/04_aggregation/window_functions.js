// File: scripts/04_aggregation/window_functions.js
// Window operators for analytics: $setWindowFields, ranking, moving averages

use("learning_platform");

print("MongoDB Aggregation: Window Functions");
print("=" * 50);

// =================================================================
// WINDOW FUNCTIONS INTRODUCTION
// =================================================================

print("\n🪟 WINDOW FUNCTIONS INTRODUCTION");
print("-" * 30);

print("Window Functions Concept:");
print("• Process documents in relation to other documents in the same dataset");
print("• Perform calculations across sets of rows related to current row");
print("• Support partitioning (grouping) and ordering");
print("• Enable advanced analytics: rankings, running totals, moving averages");
print("• Available in MongoDB 5.0+");

// Check MongoDB version
const buildInfo = db.runCommand({ buildInfo: 1 });
const version = buildInfo.version;
print(`MongoDB version: ${version}`);

if (parseFloat(version) < 5.0) {
  print("⚠ Window functions require MongoDB 5.0+. Some examples may not work.");
}

// =================================================================
// SETUP TEST DATA FOR ANALYTICS
// =================================================================

print("\n📊 SETUP ANALYTICS DATA");
print("-" * 30);

// Create time-series enrollment data
db.enrollment_metrics.deleteMany({});

const metricsData = [];
const startDate = new Date("2023-01-01");

// Generate daily enrollment metrics for analysis
for (let i = 0; i < 90; i++) {
  const currentDate = new Date(startDate);
  currentDate.setDate(startDate.getDate() + i);

  metricsData.push({
    date: currentDate,
    newEnrollments: Math.floor(Math.random() * 50) + 10,
    completions: Math.floor(Math.random() * 20) + 5,
    revenue: Math.floor(Math.random() * 2000) + 500,
    courseId: ["course1", "course2", "course3"][i % 3],
    courseName: [
      "MongoDB Basics",
      "Advanced Aggregation",
      "Performance Tuning",
    ][i % 3],
  });
}

db.enrollment_metrics.insertMany(metricsData);
print(`✓ Created ${metricsData.length} daily enrollment metrics for analytics`);

// =================================================================
// $SETWINDOWFIELDS BASICS
// =================================================================

print("\n🔢 $SETWINDOWFIELDS BASICS");
print("-" * 30);

// 1. Basic window function - running total
print("1. Running totals with $setWindowFields");

const runningTotals = db.enrollment_metrics
  .aggregate([
    { $sort: { date: 1 } },
    {
      $setWindowFields: {
        sortBy: { date: 1 },
        output: {
          runningEnrollments: {
            $sum: "$newEnrollments",
            window: {
              documents: ["unbounded", "current"],
            },
          },
          runningRevenue: {
            $sum: "$revenue",
            window: {
              documents: ["unbounded", "current"],
            },
          },
        },
      },
    },
    {
      $project: {
        date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        newEnrollments: 1,
        revenue: 1,
        runningEnrollments: 1,
        runningRevenue: 1,
      },
    },
    { $limit: 10 },
  ])
  .toArray();

print(`✓ Running totals (first 10 days):`);
runningTotals.forEach((day, i) => {
  print(
    `  ${i + 1}. ${day.date}: ${day.newEnrollments} new (${
      day.runningEnrollments
    } total), $${day.revenue} (${day.runningRevenue} total)`
  );
});

// 2. Moving averages
print("\n2. Moving averages for trend analysis");

const movingAverages = db.enrollment_metrics
  .aggregate([
    { $sort: { date: 1 } },
    {
      $setWindowFields: {
        sortBy: { date: 1 },
        output: {
          sevenDayAvgEnrollments: {
            $avg: "$newEnrollments",
            window: {
              documents: [-6, "current"], // 7-day window
            },
          },
          fourteenDayAvgEnrollments: {
            $avg: "$newEnrollments",
            window: {
              documents: [-13, "current"], // 14-day window
            },
          },
          monthlyAvgRevenue: {
            $avg: "$revenue",
            window: {
              documents: [-29, "current"], // 30-day window
            },
          },
        },
      },
    },
    {
      $project: {
        date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        newEnrollments: 1,
        sevenDayAvg: { $round: ["$sevenDayAvgEnrollments", 1] },
        fourteenDayAvg: { $round: ["$fourteenDayAvgEnrollments", 1] },
        monthlyAvgRevenue: { $round: ["$monthlyAvgRevenue", 0] },
      },
    },
    { $skip: 29 }, // Skip first 29 days to get meaningful monthly averages
    { $limit: 10 },
  ])
  .toArray();

print(`✓ Moving averages (days 30-40):`);
movingAverages.forEach((day, i) => {
  print(
    `  ${i + 1}. ${day.date}: ${day.newEnrollments} enrollments, 7-day avg: ${
      day.sevenDayAvg
    }, 14-day avg: ${day.fourteenDayAvg}`
  );
});

// =================================================================
// PARTITIONED WINDOW FUNCTIONS
// =================================================================

print("\n📂 PARTITIONED WINDOW FUNCTIONS");
print("-" * 30);

// 3. Window functions with partitioning
print("3. Partitioned window functions by course");

const partitionedAnalytics = db.enrollment_metrics
  .aggregate([
    { $sort: { courseName: 1, date: 1 } },
    {
      $setWindowFields: {
        partitionBy: "$courseName",
        sortBy: { date: 1 },
        output: {
          courseRunningTotal: {
            $sum: "$newEnrollments",
            window: {
              documents: ["unbounded", "current"],
            },
          },
          courseMovingAvg: {
            $avg: "$newEnrollments",
            window: {
              documents: [-6, "current"],
            },
          },
          dayRankInCourse: {
            $rank: {},
          },
          enrollmentRankByDay: {
            $denseRank: {},
          },
        },
      },
    },
    {
      $project: {
        courseName: 1,
        date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        newEnrollments: 1,
        courseRunningTotal: 1,
        courseMovingAvg: { $round: ["$courseMovingAvg", 1] },
        dayRankInCourse: 1,
      },
    },
    { $limit: 15 },
  ])
  .toArray();

print(`✓ Partitioned analytics by course (first 15 records):`);
partitionedAnalytics.forEach((record, i) => {
  print(
    `  ${i + 1}. ${record.courseName} (${record.date}): ${
      record.newEnrollments
    } enrollments, running total: ${record.courseRunningTotal}`
  );
});

// =================================================================
// RANKING FUNCTIONS
// =================================================================

print("\n🏆 RANKING FUNCTIONS");
print("-" * 30);

// 4. Ranking and row number functions
print("4. Ranking functions for performance analysis");

const dailyRankings = db.enrollment_metrics
  .aggregate([
    {
      $setWindowFields: {
        sortBy: { newEnrollments: -1, revenue: -1 },
        output: {
          enrollmentRank: { $rank: {} },
          enrollmentDenseRank: { $denseRank: {} },
          enrollmentRowNumber: { $rowNumber: {} },
          percentileRank: { $percentRank: {} },
        },
      },
    },
    {
      $project: {
        date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        courseName: 1,
        newEnrollments: 1,
        revenue: 1,
        enrollmentRank: 1,
        percentile: { $round: [{ $multiply: ["$percentileRank", 100] }, 1] },
      },
    },
    { $sort: { enrollmentRank: 1 } },
    { $limit: 10 },
  ])
  .toArray();

print(`✓ Top 10 days by enrollment performance:`);
dailyRankings.forEach((day, i) => {
  print(
    `  ${i + 1}. Rank ${day.enrollmentRank}: ${day.courseName} (${
      day.date
    }) - ${day.newEnrollments} enrollments, ${day.percentile}th percentile`
  );
});

// 5. Top N per partition
const topPerformingDays = db.enrollment_metrics
  .aggregate([
    {
      $setWindowFields: {
        partitionBy: "$courseName",
        sortBy: { newEnrollments: -1 },
        output: {
          courseRank: { $rank: {} },
        },
      },
    },
    { $match: { courseRank: { $lte: 3 } } }, // Top 3 days per course
    {
      $project: {
        courseName: 1,
        date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        newEnrollments: 1,
        courseRank: 1,
      },
    },
    { $sort: { courseName: 1, courseRank: 1 } },
  ])
  .toArray();

print(`✓ Top 3 performing days per course:`);
let currentCourse = "";
topPerformingDays.forEach((day) => {
  if (day.courseName !== currentCourse) {
    currentCourse = day.courseName;
    print(`  ${day.courseName}:`);
  }
  print(
    `    Rank ${day.courseRank}: ${day.date} - ${day.newEnrollments} enrollments`
  );
});

// =================================================================
// LEAD AND LAG FUNCTIONS
// =================================================================

print("\n↔️ LEAD AND LAG FUNCTIONS");
print("-" * 30);

// 6. Lead and lag for period-over-period analysis
print("6. Period-over-period comparison with lead/lag");

const periodComparison = db.enrollment_metrics
  .aggregate([
    { $sort: { courseName: 1, date: 1 } },
    {
      $setWindowFields: {
        partitionBy: "$courseName",
        sortBy: { date: 1 },
        output: {
          previousDayEnrollments: {
            $shift: {
              output: "$newEnrollments",
              by: -1,
            },
          },
          nextDayEnrollments: {
            $shift: {
              output: "$newEnrollments",
              by: 1,
            },
          },
          weekAgoEnrollments: {
            $shift: {
              output: "$newEnrollments",
              by: -7,
            },
          },
        },
      },
    },
    {
      $addFields: {
        dayOverDayChange: {
          $cond: {
            if: { $ne: ["$previousDayEnrollments", null] },
            then: { $subtract: ["$newEnrollments", "$previousDayEnrollments"] },
            else: null,
          },
        },
        weekOverWeekChange: {
          $cond: {
            if: { $ne: ["$weekAgoEnrollments", null] },
            then: { $subtract: ["$newEnrollments", "$weekAgoEnrollments"] },
            else: null,
          },
        },
      },
    },
    {
      $project: {
        courseName: 1,
        date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        newEnrollments: 1,
        dayOverDayChange: 1,
        weekOverWeekChange: 1,
      },
    },
    { $match: { dayOverDayChange: { $ne: null } } },
    { $limit: 12 },
  ])
  .toArray();

print(`✓ Period-over-period changes:`);
periodComparison.forEach((day, i) => {
  const dodStr =
    day.dayOverDayChange > 0
      ? `+${day.dayOverDayChange}`
      : `${day.dayOverDayChange}`;
  const wowStr =
    day.weekOverWeekChange !== null
      ? day.weekOverWeekChange > 0
        ? ` WoW: +${day.weekOverWeekChange}`
        : ` WoW: ${day.weekOverWeekChange}`
      : "";
  print(
    `  ${i + 1}. ${day.courseName} (${day.date}): ${
      day.newEnrollments
    } enrollments, DoD: ${dodStr}${wowStr}`
  );
});

// =================================================================
// ADVANCED ANALYTICS PATTERNS
// =================================================================

print("\n📈 ADVANCED ANALYTICS PATTERNS");
print("-" * 30);

// 7. Cohort analysis using window functions
print("7. Cohort analysis with window functions");

const cohortAnalysis = db.enrollment_metrics
  .aggregate([
    {
      $addFields: {
        week: {
          $dateToString: {
            format: "%Y-W%V",
            date: "$date",
          },
        },
      },
    },
    {
      $group: {
        _id: { courseName: "$courseName", week: "$week" },
        weeklyEnrollments: { $sum: "$newEnrollments" },
        weeklyCompletions: { $sum: "$completions" },
        weeklyRevenue: { $sum: "$revenue" },
      },
    },
    { $sort: { "_id.courseName": 1, "_id.week": 1 } },
    {
      $setWindowFields: {
        partitionBy: "$_id.courseName",
        sortBy: { "_id.week": 1 },
        output: {
          weekNumber: { $rowNumber: {} },
          cumulativeEnrollments: {
            $sum: "$weeklyEnrollments",
            window: {
              documents: ["unbounded", "current"],
            },
          },
          enrollmentGrowthRate: {
            $divide: [
              {
                $subtract: [
                  "$weeklyEnrollments",
                  {
                    $shift: {
                      output: "$weeklyEnrollments",
                      by: -1,
                      default: 0,
                    },
                  },
                ],
              },
              {
                $max: [
                  {
                    $shift: {
                      output: "$weeklyEnrollments",
                      by: -1,
                      default: 1,
                    },
                  },
                  1,
                ],
              },
            ],
          },
        },
      },
    },
    {
      $project: {
        courseName: "$_id.courseName",
        week: "$_id.week",
        weekNumber: 1,
        weeklyEnrollments: 1,
        cumulativeEnrollments: 1,
        growthRate: {
          $round: [{ $multiply: ["$enrollmentGrowthRate", 100] }, 1],
        },
      },
    },
    { $limit: 15 },
  ])
  .toArray();

print(`✓ Weekly cohort analysis:`);
cohortAnalysis.forEach((week, i) => {
  print(
    `  ${i + 1}. ${week.courseName} Week ${week.weekNumber}: ${
      week.weeklyEnrollments
    } new, ${week.cumulativeEnrollments} total, ${week.growthRate}% growth`
  );
});

// 8. Percentiles and quartiles
const performanceDistribution = db.enrollment_metrics
  .aggregate([
    {
      $setWindowFields: {
        sortBy: { newEnrollments: 1 },
        output: {
          enrollmentPercentile: { $percentRank: {} },
          quartile: {
            $switch: {
              branches: [
                { case: { $lte: [{ $percentRank: {} }, 0.25] }, then: "Q1" },
                { case: { $lte: [{ $percentRank: {} }, 0.5] }, then: "Q2" },
                { case: { $lte: [{ $percentRank: {} }, 0.75] }, then: "Q3" },
              ],
              default: "Q4",
            },
          },
        },
      },
    },
    {
      $group: {
        _id: "$quartile",
        count: { $sum: 1 },
        avgEnrollments: { $avg: "$newEnrollments" },
        minEnrollments: { $min: "$newEnrollments" },
        maxEnrollments: { $max: "$newEnrollments" },
      },
    },
    { $sort: { _id: 1 } },
  ])
  .toArray();

print(`✓ Enrollment performance distribution by quartiles:`);
performanceDistribution.forEach((quartile, i) => {
  print(
    `  ${quartile._id}: ${quartile.count} days, avg: ${Math.round(
      quartile.avgEnrollments
    )}, range: ${quartile.minEnrollments}-${quartile.maxEnrollments}`
  );
});

// =================================================================
// TIME SERIES ANALYSIS
// =================================================================

print("\n⏰ TIME SERIES ANALYSIS");
print("-" * 30);

// 9. Seasonal trend analysis
print("9. Seasonal trend analysis with window functions");

const seasonalTrends = db.enrollment_metrics
  .aggregate([
    {
      $addFields: {
        dayOfWeek: { $dayOfWeek: "$date" },
        weekOfYear: { $week: "$date" },
      },
    },
    {
      $group: {
        _id: "$dayOfWeek",
        avgDailyEnrollments: { $avg: "$newEnrollments" },
        totalDays: { $sum: 1 },
      },
    },
    {
      $setWindowFields: {
        sortBy: { _id: 1 },
        output: {
          overallAvg: { $avg: "$avgDailyEnrollments" },
          seasonalIndex: {
            $divide: ["$avgDailyEnrollments", { $avg: "$avgDailyEnrollments" }],
          },
        },
      },
    },
    {
      $addFields: {
        dayName: {
          $switch: {
            branches: [
              { case: { $eq: ["$_id", 1] }, then: "Sunday" },
              { case: { $eq: ["$_id", 2] }, then: "Monday" },
              { case: { $eq: ["$_id", 3] }, then: "Tuesday" },
              { case: { $eq: ["$_id", 4] }, then: "Wednesday" },
              { case: { $eq: ["$_id", 5] }, then: "Thursday" },
              { case: { $eq: ["$_id", 6] }, then: "Friday" },
              { case: { $eq: ["$_id", 7] }, then: "Saturday" },
            ],
          },
        },
      },
    },
    {
      $project: {
        dayName: 1,
        avgEnrollments: { $round: ["$avgDailyEnrollments", 1] },
        seasonalIndex: { $round: ["$seasonalIndex", 3] },
        trend: {
          $cond: {
            if: { $gt: ["$seasonalIndex", 1.1] },
            then: "Above Average",
            else: {
              $cond: {
                if: { $lt: ["$seasonalIndex", 0.9] },
                then: "Below Average",
                else: "Average",
              },
            },
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ])
  .toArray();

print(`✓ Day-of-week enrollment patterns:`);
seasonalTrends.forEach((day) => {
  print(
    `  ${day.dayName}: ${day.avgEnrollments} avg enrollments, index: ${day.seasonalIndex} (${day.trend})`
  );
});

// =================================================================
// CLEANUP AND SUMMARY
// =================================================================

print("\n🧹 CLEANUP");
print("-" * 30);

db.enrollment_metrics.drop();
print("✓ Cleaned up analytics test data");

print("\n📊 WINDOW FUNCTIONS SUMMARY");
print("-" * 30);

const windowFunctionsSummary = {
  functionsDemo: [
    "$sum",
    "$avg",
    "$rank",
    "$denseRank",
    "$rowNumber",
    "$percentRank",
    "$shift",
  ],
  analyticsPatterns: [
    "Running totals",
    "Moving averages",
    "Rankings",
    "Period comparisons",
    "Cohort analysis",
    "Seasonal trends",
  ],
  windowTypes: ["Unbounded", "Document range", "Partitioned", "Time-based"],
  realWorldUse: [
    "KPI tracking",
    "Performance rankings",
    "Trend analysis",
    "Comparative metrics",
  ],
};

print("Window functions demonstrated:");
windowFunctionsSummary.functionsDemo.forEach((func, i) => {
  print(`  ${i + 1}. ${func}`);
});

print("\nAnalytics patterns covered:");
windowFunctionsSummary.analyticsPatterns.forEach((pattern, i) => {
  print(`  ${i + 1}. ${pattern}`);
});

print("\n🎯 Key Window Function Concepts:");
print("• $setWindowFields for analytical computations");
print("• Running totals and cumulative calculations");
print("• Moving averages for trend smoothing");
print("• Ranking functions for performance analysis");
print("• Lead/lag functions for period comparisons");
print("• Partitioned windows for group-wise analysis");
print("• Percentiles and quartile analysis");
print("• Time series and seasonal trend analysis");
print("• Advanced cohort and retention analysis");

print("\n✅ Window functions completed!");
print("Next: Run geo_text_time.js for specialized aggregations");
