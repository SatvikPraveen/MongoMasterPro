// File: scripts/04_aggregation/geo_text_time.js
// Location: scripts/04_aggregation/geo_text_time.js
// Specialized aggregations: geospatial, text search, and time-series operations

use("learning_platform");

print("MongoDB Aggregation: Geospatial, Text & Time-Series");
print("=" * 50);

// =================================================================
// GEOSPATIAL AGGREGATION SETUP
// =================================================================

print("\n🌍 GEOSPATIAL AGGREGATION SETUP");
print("-" * 30);

// Create location-based test data
db.student_locations.deleteMany({});
db.course_locations.deleteMany({});

// Student location data with GeoJSON points
const studentLocations = [
  {
    studentId: ObjectId(),
    name: "Alice Johnson",
    email: "alice@example.com",
    location: {
      type: "Point",
      coordinates: [-74.0059, 40.7128], // New York City
    },
    city: "New York",
    timezone: "America/New_York",
  },
  {
    studentId: ObjectId(),
    name: "Bob Smith",
    email: "bob@example.com",
    location: {
      type: "Point",
      coordinates: [-118.2437, 34.0522], // Los Angeles
    },
    city: "Los Angeles",
    timezone: "America/Los_Angeles",
  },
  {
    studentId: ObjectId(),
    name: "Carol Davis",
    email: "carol@example.com",
    location: {
      type: "Point",
      coordinates: [-87.6298, 41.8781], // Chicago
    },
    city: "Chicago",
    timezone: "America/Chicago",
  },
  {
    studentId: ObjectId(),
    name: "David Wilson",
    email: "david@example.com",
    location: {
      type: "Point",
      coordinates: [-122.4194, 37.7749], // San Francisco
    },
    city: "San Francisco",
    timezone: "America/Los_Angeles",
  },
  {
    studentId: ObjectId(),
    name: "Eva Martinez",
    email: "eva@example.com",
    location: {
      type: "Point",
      coordinates: [-95.3698, 29.7604], // Houston
    },
    city: "Houston",
    timezone: "America/Chicago",
  },
  {
    studentId: ObjectId(),
    name: "Frank Chen",
    email: "frank@example.com",
    location: {
      type: "Point",
      coordinates: [-80.1918, 25.7617], // Miami
    },
    city: "Miami",
    timezone: "America/New_York",
  },
];

db.student_locations.insertMany(studentLocations);

// Course location data with service areas
const courseLocations = [
  {
    courseId: ObjectId(),
    title: "MongoDB Fundamentals",
    instructor: "John Doe",
    serviceArea: {
      type: "Polygon",
      coordinates: [
        [
          [-75.0, 40.0],
          [-73.0, 40.0],
          [-73.0, 42.0],
          [-75.0, 42.0],
          [-75.0, 40.0],
        ],
      ],
    },
    center: {
      type: "Point",
      coordinates: [-74.0059, 40.7128],
    },
    region: "Northeast",
  },
  {
    courseId: ObjectId(),
    title: "Advanced Aggregation",
    instructor: "Jane Smith",
    serviceArea: {
      type: "Polygon",
      coordinates: [
        [
          [-120.0, 33.0],
          [-116.0, 33.0],
          [-116.0, 36.0],
          [-120.0, 36.0],
          [-120.0, 33.0],
        ],
      ],
    },
    center: {
      type: "Point",
      coordinates: [-118.2437, 34.0522],
    },
    region: "West",
  },
];

db.course_locations.insertMany(courseLocations);

// Create 2dsphere indexes for geospatial queries
db.student_locations.createIndex({ location: "2dsphere" });
db.course_locations.createIndex({ center: "2dsphere" });
db.course_locations.createIndex({ serviceArea: "2dsphere" });

print(`✓ Created ${studentLocations.length} student locations`);
print(`✓ Created ${courseLocations.length} course service areas`);
print("✓ Created 2dsphere indexes for geospatial operations");

// =================================================================
// GEOSPATIAL AGGREGATIONS
// =================================================================

print("\n📍 GEOSPATIAL AGGREGATIONS");
print("-" * 30);

// 1. $geoNear aggregation stage
print("1. $geoNear - Find students near course centers");

const nearbyStudents = db.student_locations
  .aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [-74.0059, 40.7128] }, // NYC
        distanceField: "distanceFromNYC",
        maxDistance: 500000, // 500km in meters
        spherical: true,
        distanceMultiplier: 0.001, // Convert to kilometers
      },
    },
    {
      $project: {
        name: 1,
        city: 1,
        distanceFromNYC: { $round: ["$distanceFromNYC", 2] },
      },
    },
    { $limit: 5 },
  ])
  .toArray();

print(`✓ Students within 500km of NYC:`);
nearbyStudents.forEach((student, i) => {
  print(
    `  ${i + 1}. ${student.name} (${student.city}): ${
      student.distanceFromNYC
    }km away`
  );
});

// 2. $geoWithin aggregation
print("\n2. $geoWithin - Students within course service areas");

const studentsInServiceArea = db.student_locations
  .aggregate([
    {
      $lookup: {
        from: "course_locations",
        let: { studentLocation: "$location" },
        pipeline: [
          {
            $match: {
              $expr: {
                $geoWithin: {
                  geometry: "$$studentLocation",
                  polygon: "$serviceArea",
                },
              },
            },
          },
          { $project: { title: 1, instructor: 1, region: 1 } },
        ],
        as: "availableCourses",
      },
    },
    {
      $project: {
        name: 1,
        city: 1,
        courseCount: { $size: "$availableCourses" },
        courses: "$availableCourses.title",
      },
    },
  ])
  .toArray();

print(`✓ Students and their available courses:`);
studentsInServiceArea.forEach((student, i) => {
  print(
    `  ${i + 1}. ${student.name} (${student.city}): ${
      student.courseCount
    } courses available`
  );
  if (student.courses.length > 0) {
    student.courses.forEach((course) => print(`    - ${course}`));
  }
});

// 3. Distance calculations and grouping
print("\n3. Distance-based grouping and analysis");

const regionAnalysis = db.student_locations
  .aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [-98.5795, 39.8283] }, // Geographic center of US
        distanceField: "distanceFromCenter",
        spherical: true,
        distanceMultiplier: 0.001,
      },
    },
    {
      $addFields: {
        distanceCategory: {
          $switch: {
            branches: [
              { case: { $lte: ["$distanceFromCenter", 500] }, then: "Central" },
              {
                case: { $lte: ["$distanceFromCenter", 1000] },
                then: "Regional",
              },
              {
                case: { $lte: ["$distanceFromCenter", 2000] },
                then: "Distant",
              },
            ],
            default: "Remote",
          },
        },
      },
    },
    {
      $group: {
        _id: "$distanceCategory",
        studentCount: { $sum: 1 },
        avgDistance: { $avg: "$distanceFromCenter" },
        cities: { $push: "$city" },
        timezones: { $addToSet: "$timezone" },
      },
    },
    {
      $project: {
        studentCount: 1,
        avgDistance: { $round: ["$avgDistance", 0] },
        cities: 1,
        timezoneCount: { $size: "$timezones" },
      },
    },
    { $sort: { avgDistance: 1 } },
  ])
  .toArray();

print(`✓ Student distribution by distance from US center:`);
regionAnalysis.forEach((region, i) => {
  print(
    `  ${i + 1}. ${region._id}: ${region.studentCount} students, avg ${
      region.avgDistance
    }km, ${region.timezoneCount} timezones`
  );
});

// =================================================================
// TEXT SEARCH AGGREGATIONS
// =================================================================

print("\n🔍 TEXT SEARCH AGGREGATIONS");
print("-" * 30);

// Create searchable course content
db.course_content.deleteMany({});

const courseContent = [
  {
    courseId: ObjectId(),
    title: "MongoDB Fundamentals",
    description:
      "Learn the basics of MongoDB database operations, including CRUD operations, indexing strategies, and data modeling patterns.",
    tags: ["database", "mongodb", "nosql", "beginner"],
    content:
      "This comprehensive course covers MongoDB basics from installation to advanced queries. Students will learn document-oriented database concepts.",
    category: "Database",
    difficulty: "beginner",
    rating: 4.5,
  },
  {
    courseId: ObjectId(),
    title: "Advanced MongoDB Aggregation",
    description:
      "Master complex aggregation pipelines, window functions, and advanced analytics with MongoDB aggregation framework.",
    tags: ["mongodb", "aggregation", "analytics", "advanced"],
    content:
      "Deep dive into MongoDB aggregation pipeline stages including match, group, lookup, unwind, and window functions for data analysis.",
    category: "Database",
    difficulty: "advanced",
    rating: 4.8,
  },
  {
    courseId: ObjectId(),
    title: "JavaScript for Web Development",
    description:
      "Complete guide to modern JavaScript programming for web applications including ES6+, async/await, and DOM manipulation.",
    tags: ["javascript", "web", "programming", "frontend"],
    content:
      "Learn JavaScript fundamentals, modern syntax, promises, async programming, and how to build interactive web applications.",
    category: "Programming",
    difficulty: "intermediate",
    rating: 4.6,
  },
  {
    courseId: ObjectId(),
    title: "React.js Complete Course",
    description:
      "Build modern web applications with React including hooks, context, routing, and state management patterns.",
    tags: ["react", "javascript", "frontend", "web"],
    content:
      "Master React.js from components to advanced patterns. Build real-world applications with modern React features and best practices.",
    category: "Frontend",
    difficulty: "intermediate",
    rating: 4.7,
  },
  {
    courseId: ObjectId(),
    title: "Python Data Analysis",
    description:
      "Analyze data using Python with pandas, numpy, and visualization libraries for data science applications.",
    tags: ["python", "data", "analytics", "science"],
    content:
      "Use Python for data manipulation, analysis, and visualization. Work with real datasets and learn statistical analysis techniques.",
    category: "Data Science",
    difficulty: "intermediate",
    rating: 4.4,
  },
];

db.course_content.insertMany(courseContent);

// Create text index for full-text search
db.course_content.createIndex(
  {
    title: "text",
    description: "text",
    content: "text",
    tags: "text",
  },
  {
    weights: {
      title: 10,
      description: 5,
      tags: 8,
      content: 1,
    },
    name: "course_text_search",
  }
);

print(`✓ Created ${courseContent.length} searchable courses`);
print("✓ Created weighted text search index");

// 4. Basic text search aggregation
print("\n4. $text search with scoring");

const textSearchResults = db.course_content
  .aggregate([
    { $match: { $text: { $search: "mongodb aggregation advanced" } } },
    {
      $addFields: {
        searchScore: { $meta: "textScore" },
      },
    },
    {
      $project: {
        title: 1,
        description: 1,
        tags: 1,
        difficulty: 1,
        rating: 1,
        searchScore: 1,
      },
    },
    { $sort: { searchScore: { $meta: "textScore" } } },
  ])
  .toArray();

print(`✓ Text search results for "mongodb aggregation advanced":`);
textSearchResults.forEach((course, i) => {
  print(
    `  ${i + 1}. ${course.title} (score: ${course.searchScore.toFixed(2)}, ${
      course.difficulty
    })`
  );
});

// 5. Faceted text search
print("\n5. Faceted search with text matching");

const facetedSearch = db.course_content
  .aggregate([
    { $match: { $text: { $search: "javascript web programming" } } },
    {
      $facet: {
        searchResults: [
          { $addFields: { score: { $meta: "textScore" } } },
          { $sort: { score: { $meta: "textScore" } } },
          { $limit: 5 },
          {
            $project: {
              title: 1,
              difficulty: 1,
              rating: 1,
              score: 1,
            },
          },
        ],
        categoryFacets: [
          {
            $group: {
              _id: "$category",
              count: { $sum: 1 },
              avgRating: { $avg: "$rating" },
            },
          },
          { $sort: { count: -1 } },
        ],
        difficultyFacets: [
          { $group: { _id: "$difficulty", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        tagCloud: [
          { $unwind: "$tags" },
          { $group: { _id: "$tags", frequency: { $sum: 1 } } },
          { $sort: { frequency: -1 } },
          { $limit: 8 },
        ],
      },
    },
  ])
  .toArray();

const searchFacets = facetedSearch[0];
print(`✓ Faceted search results for "javascript web programming":`);
print(`  Found ${searchFacets.searchResults.length} matching courses`);
print(
  `  Categories: ${searchFacets.categoryFacets
    .map((c) => `${c._id}(${c.count})`)
    .join(", ")}`
);
print(
  `  Difficulties: ${searchFacets.difficultyFacets
    .map((d) => `${d._id}(${d.count})`)
    .join(", ")}`
);

// 6. Search with filters and sorting
print("\n6. Combined text search with filters");

const filteredSearch = db.course_content
  .aggregate([
    {
      $match: {
        $and: [
          { $text: { $search: "database mongodb" } },
          { difficulty: { $in: ["beginner", "intermediate"] } },
          { rating: { $gte: 4.0 } },
        ],
      },
    },
    {
      $addFields: {
        textScore: { $meta: "textScore" },
        combinedScore: {
          $add: [
            { $multiply: [{ $meta: "textScore" }, 0.7] },
            { $multiply: ["$rating", 0.3] },
          ],
        },
      },
    },
    {
      $project: {
        title: 1,
        difficulty: 1,
        rating: 1,
        tags: 1,
        textScore: { $round: ["$textScore", 2] },
        combinedScore: { $round: ["$combinedScore", 2] },
      },
    },
    { $sort: { combinedScore: -1 } },
  ])
  .toArray();

print(`✓ Filtered search results (beginner/intermediate, rating ≥4.0):`);
filteredSearch.forEach((course, i) => {
  print(
    `  ${i + 1}. ${course.title} - Combined score: ${
      course.combinedScore
    } (text: ${course.textScore}, rating: ${course.rating})`
  );
});

// =================================================================
// TIME-SERIES AGGREGATIONS
// =================================================================

print("\n⏰ TIME-SERIES AGGREGATIONS");
print("-" * 30);

// Create time-series enrollment data
db.enrollment_timeseries.deleteMany({});

const timeSeriesData = [];
const baseDate = new Date("2024-01-01");

// Generate 90 days of hourly enrollment data
for (let day = 0; day < 90; day++) {
  for (let hour = 8; hour < 22; hour++) {
    // Business hours 8am-10pm
    const timestamp = new Date(baseDate);
    timestamp.setDate(baseDate.getDate() + day);
    timestamp.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

    // Simulate enrollment patterns (higher on weekdays, peak at lunch/evening)
    const dayOfWeek = timestamp.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isPeakHour = hour === 12 || hour === 18;

    let baseEnrollments = isWeekend ? 2 : 8;
    if (isPeakHour) baseEnrollments *= 1.5;

    timeSeriesData.push({
      timestamp: timestamp,
      courseId: ["course_a", "course_b", "course_c"][day % 3],
      enrollments: Math.floor(Math.random() * baseEnrollments) + 1,
      completions: Math.floor(Math.random() * 3),
      revenue:
        (Math.floor(Math.random() * 500) + 100) * (isWeekend ? 0.7 : 1.0),
      deviceType: ["desktop", "mobile", "tablet"][
        Math.floor(Math.random() * 3)
      ],
    });
  }
}

db.enrollment_timeseries.insertMany(timeSeriesData);

// Create time-series indexes
db.enrollment_timeseries.createIndex({ timestamp: 1, courseId: 1 });
db.enrollment_timeseries.createIndex({ timestamp: 1, deviceType: 1 });

print(`✓ Created ${timeSeriesData.length} time-series enrollment records`);
print("✓ Created time-based indexes");

// 7. Time-based grouping and analysis
print("\n7. Time-series analysis by periods");

const dailyTrends = db.enrollment_timeseries
  .aggregate([
    {
      $group: {
        _id: {
          year: { $year: "$timestamp" },
          month: { $month: "$timestamp" },
          day: { $dayOfMonth: "$timestamp" },
          dayOfWeek: { $dayOfWeek: "$timestamp" },
        },
        totalEnrollments: { $sum: "$enrollments" },
        totalRevenue: { $sum: "$revenue" },
        avgHourlyEnrollments: { $avg: "$enrollments" },
        peakHourEnrollments: { $max: "$enrollments" },
        recordCount: { $sum: 1 },
      },
    },
    {
      $addFields: {
        dayName: {
          $switch: {
            branches: [
              { case: { $eq: ["$_id.dayOfWeek", 1] }, then: "Sunday" },
              { case: { $eq: ["$_id.dayOfWeek", 2] }, then: "Monday" },
              { case: { $eq: ["$_id.dayOfWeek", 3] }, then: "Tuesday" },
              { case: { $eq: ["$_id.dayOfWeek", 4] }, then: "Wednesday" },
              { case: { $eq: ["$_id.dayOfWeek", 5] }, then: "Thursday" },
              { case: { $eq: ["$_id.dayOfWeek", 6] }, then: "Friday" },
              { case: { $eq: ["$_id.dayOfWeek", 7] }, then: "Saturday" },
            ],
          },
        },
        date: {
          $dateFromParts: {
            year: "$_id.year",
            month: "$_id.month",
            day: "$_id.day",
          },
        },
      },
    },
    {
      $project: {
        date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        dayName: 1,
        totalEnrollments: 1,
        totalRevenue: { $round: ["$totalRevenue", 0] },
        avgHourlyEnrollments: { $round: ["$avgHourlyEnrollments", 1] },
      },
    },
    { $sort: { date: 1 } },
    { $limit: 10 },
  ])
  .toArray();

print(`✓ Daily enrollment trends (first 10 days):`);
dailyTrends.forEach((day, i) => {
  print(
    `  ${i + 1}. ${day.date} (${day.dayName}): ${
      day.totalEnrollments
    } enrollments, $${day.totalRevenue} revenue`
  );
});

// 8. Hourly pattern analysis
print("\n8. Hourly enrollment patterns");

const hourlyPatterns = db.enrollment_timeseries
  .aggregate([
    {
      $group: {
        _id: { hour: { $hour: "$timestamp" } },
        avgEnrollments: { $avg: "$enrollments" },
        totalEnrollments: { $sum: "$enrollments" },
        totalSessions: { $sum: 1 },
        deviceBreakdown: {
          $push: {
            device: "$deviceType",
            enrollments: "$enrollments",
          },
        },
      },
    },
    {
      $unwind: "$deviceBreakdown",
    },
    {
      $group: {
        _id: {
          hour: "$_id.hour",
          device: "$deviceBreakdown.device",
        },
        deviceEnrollments: { $sum: "$deviceBreakdown.enrollments" },
        hourlyTotal: { $first: "$totalEnrollments" },
        avgEnrollments: { $first: "$avgEnrollments" },
      },
    },
    {
      $group: {
        _id: "$_id.hour",
        avgEnrollments: { $first: "$avgEnrollments" },
        totalEnrollments: { $first: "$hourlyTotal" },
        deviceStats: {
          $push: {
            device: "$_id.device",
            enrollments: "$deviceEnrollments",
          },
        },
      },
    },
    {
      $project: {
        hour: "$_id",
        avgEnrollments: { $round: ["$avgEnrollments", 1] },
        totalEnrollments: 1,
        topDevice: {
          $arrayElemAt: [
            {
              $map: {
                input: {
                  $slice: [
                    {
                      $sortArray: {
                        input: "$deviceStats",
                        sortBy: { enrollments: -1 },
                      },
                    },
                    1,
                  ],
                },
                in: "$$this.device",
              },
            },
            0,
          ],
        },
      },
    },
    { $sort: { hour: 1 } },
  ])
  .toArray();

print(`✓ Hourly enrollment patterns:`);
const topHours = hourlyPatterns
  .sort((a, b) => b.avgEnrollments - a.avgEnrollments)
  .slice(0, 5);

topHours.forEach((hour, i) => {
  const time =
    hour.hour > 12
      ? `${hour.hour - 12}PM`
      : hour.hour === 12
      ? "12PM"
      : `${hour.hour}AM`;
  print(
    `  ${i + 1}. ${time}: ${
      hour.avgEnrollments
    } avg enrollments/hour, top device: ${hour.topDevice}`
  );
});

// 9. Moving averages and trends
print("\n9. Time-series trends with moving averages");

const trendAnalysis = db.enrollment_timeseries
  .aggregate([
    {
      $group: {
        _id: {
          date: {
            $dateFromParts: {
              year: { $year: "$timestamp" },
              month: { $month: "$timestamp" },
              day: { $dayOfMonth: "$timestamp" },
            },
          },
        },
        dailyEnrollments: { $sum: "$enrollments" },
        dailyRevenue: { $sum: "$revenue" },
      },
    },
    { $sort: { "_id.date": 1 } },
    {
      $setWindowFields: {
        sortBy: { "_id.date": 1 },
        output: {
          threeDayMA: {
            $avg: "$dailyEnrollments",
            window: { documents: [-2, "current"] },
          },
          sevenDayMA: {
            $avg: "$dailyEnrollments",
            window: { documents: [-6, "current"] },
          },
          dayOverDayChange: {
            $subtract: [
              "$dailyEnrollments",
              { $shift: { output: "$dailyEnrollments", by: -1, default: 0 } },
            ],
          },
        },
      },
    },
    {
      $project: {
        date: { $dateToString: { format: "%Y-%m-%d", date: "$_id.date" } },
        dailyEnrollments: 1,
        threeDayMA: { $round: ["$threeDayMA", 1] },
        sevenDayMA: { $round: ["$sevenDayMA", 1] },
        dayOverDayChange: 1,
        trend: {
          $cond: {
            if: { $gt: ["$dayOverDayChange", 5] },
            then: "Strong Growth",
            else: {
              $cond: {
                if: { $gt: ["$dayOverDayChange", 0] },
                then: "Growth",
                else: {
                  $cond: {
                    if: { $lt: ["$dayOverDayChange", -5] },
                    then: "Decline",
                    else: "Stable",
                  },
                },
              },
            },
          },
        },
      },
    },
    { $skip: 6 }, // Skip first 6 days for meaningful 7-day MA
    { $limit: 10 },
  ])
  .toArray();

print(`✓ Daily trends with moving averages:`);
trendAnalysis.forEach((day, i) => {
  const change =
    day.dayOverDayChange > 0
      ? `+${day.dayOverDayChange}`
      : `${day.dayOverDayChange}`;
  print(
    `  ${i + 1}. ${day.date}: ${day.dailyEnrollments} enrollments (7-day MA: ${
      day.sevenDayMA
    }, DoD: ${change}, ${day.trend})`
  );
});

// 10. Seasonal and cyclical patterns
print("\n10. Seasonal pattern detection");

const seasonalPatterns = db.enrollment_timeseries
  .aggregate([
    {
      $addFields: {
        dayOfWeek: { $dayOfWeek: "$timestamp" },
        hourOfDay: { $hour: "$timestamp" },
        weekOfYear: { $week: "$timestamp" },
      },
    },
    {
      $facet: {
        weekdayPatterns: [
          {
            $group: {
              _id: "$dayOfWeek",
              avgEnrollments: { $avg: "$enrollments" },
              totalRevenue: { $sum: "$revenue" },
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
          { $sort: { _id: 1 } },
        ],
        peakHours: [
          {
            $group: {
              _id: "$hourOfDay",
              avgEnrollments: { $avg: "$enrollments" },
              sessionCount: { $sum: 1 },
            },
          },
          { $sort: { avgEnrollments: -1 } },
          { $limit: 5 },
        ],
      },
    },
  ])
  .toArray();

const patterns = seasonalPatterns[0];
print(`✓ Weekly enrollment patterns:`);
patterns.weekdayPatterns.forEach((day, i) => {
  print(
    `  ${day.dayName}: ${day.avgEnrollments.toFixed(
      1
    )} avg enrollments, $${Math.round(day.totalRevenue)} revenue`
  );
});

print(`\n✓ Peak enrollment hours:`);
patterns.peakHours.forEach((hour, i) => {
  const time =
    hour._id > 12
      ? `${hour._id - 12}PM`
      : hour._id === 12
      ? "12PM"
      : `${hour._id}AM`;
  print(
    `  ${i + 1}. ${time}: ${hour.avgEnrollments.toFixed(1)} avg enrollments`
  );
});

// =================================================================
// CLEANUP AND SUMMARY
// =================================================================

print("\n🧹 CLEANUP");
print("-" * 30);

db.student_locations.drop();
db.course_locations.drop();
db.course_content.drop();
db.enrollment_timeseries.drop();

print("✓ Cleaned up geospatial test data");
print("✓ Cleaned up text search test data");
print("✓ Cleaned up time-series test data");

print("\n📊 SPECIALIZED AGGREGATIONS SUMMARY");
print("-" * 30);

const specializedSummary = {
  geospatialFeatures: [
    "$geoNear",
    "$geoWithin",
    "2dsphere indexes",
    "Distance calculations",
    "Spatial grouping",
  ],
  textSearchFeatures: [
    "$text operator",
    "Text scoring",
    "Weighted indexes",
    "Faceted search",
    "Combined filtering",
  ],
  timeSeriesFeatures: [
    "Date grouping",
    "Hourly patterns",
    "Moving averages",
    "Trend analysis",
    "Seasonal detection",
  ],
  realWorldApplications: [
    "Location-based services",
    "Course recommendations",
    "Usage analytics",
    "Performance monitoring",
  ],
};

print("Geospatial aggregation features:");
specializedSummary.geospatialFeatures.forEach((feature, i) => {
  print(`  ${i + 1}. ${feature}`);
});

print("\nText search aggregation features:");
specializedSummary.textSearchFeatures.forEach((feature, i) => {
  print(`  ${i + 1}. ${feature}`);
});

print("\nTime-series aggregation features:");
specializedSummary.timeSeriesFeatures.forEach((feature, i) => {
  print(`  ${i + 1}. ${feature}`);
});

print("\n🎯 Key Specialized Aggregation Concepts:");
print("• Geospatial queries with $geoNear and $geoWithin");
print("• 2dsphere indexes for location-based operations");
print("• Distance calculations and proximity analysis");
print("• Full-text search with weighted scoring");
print("• Faceted search for multi-dimensional filtering");
print("• Time-series data grouping and trend analysis");
print("• Moving averages and statistical calculations");
print("• Seasonal pattern detection and cyclical analysis");
print("• Real-world applications combining multiple techniques");

print("\n✅ Specialized aggregations completed!");
print(
  "Next: Run validate_aggregation.js to verify all aggregation functionality"
);
