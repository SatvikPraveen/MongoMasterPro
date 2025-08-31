# Aggregation Pipeline Cheat Sheet

**Location:** `docs/cheat_sheets/aggregation_pipeline.md`

## Core Pipeline Stages

### $match - Filter Documents

```javascript
// Basic filtering (always put early in pipeline)
{ $match: { status: "active", age: { $gte: 18 } } }

// Date range filtering
{ $match: {
  createdAt: {
    $gte: new Date("2024-01-01"),
    $lt: new Date("2025-01-01")
  }
}}

// Regex matching
{ $match: { name: { $regex: /^john/i } } }

// Array field matching
{ $match: { tags: { $in: ["mongodb", "database"] } } }
```

### $project - Shape Documents

```javascript
// Include/exclude fields
{ $project: { _id: 0, name: 1, email: 1 } }

// Create computed fields
{ $project: {
  name: 1,
  fullName: { $concat: ["$firstName", " ", "$lastName"] },
  age: { $subtract: [{ $year: new Date() }, { $year: "$birthDate" }] }
}}

// Conditional fields
{ $project: {
  name: 1,
  category: {
    $cond: {
      if: { $gte: ["$score", 90] },
      then: "excellent",
      else: "good"
    }
  }
}}

// Array projections
{ $project: {
  name: 1,
  firstHobby: { $arrayElemAt: ["$hobbies", 0] },
  hobbyCount: { $size: "$hobbies" }
}}
```

### $group - Aggregate Documents

```javascript
// Basic grouping
{ $group: {
  _id: "$department",
  count: { $sum: 1 },
  averageSalary: { $avg: "$salary" }
}}

// Group by multiple fields
{ $group: {
  _id: {
    department: "$department",
    year: { $year: "$hireDate" }
  },
  totalEmployees: { $sum: 1 }
}}

// Array aggregation
{ $group: {
  _id: "$category",
  allTags: { $push: "$tags" },
  uniqueTags: { $addToSet: "$tags" },
  firstProduct: { $first: "$name" },
  lastProduct: { $last: "$name" }
}}

// Complex grouping with conditions
{ $group: {
  _id: "$department",
  seniorCount: {
    $sum: {
      $cond: [{ $gte: ["$experience", 5] }, 1, 0]
    }
  }
}}
```

### $sort - Order Documents

```javascript
// Single field sort
{ $sort: { createdAt: -1 } }  // -1 descending, 1 ascending

// Multi-field sort
{ $sort: { department: 1, salary: -1 } }

// Sort by computed field
{ $sort: {
  totalScore: { $add: ["$math", "$science", "$english"] }
}}
```

### $limit & $skip - Pagination

```javascript
// Basic pagination
{
  $skip: 20;
}
{
  $limit: 10;
}

// Combined for page 3, 10 items per page
{
  $skip: 20;
} // (page - 1) * limit
{
  $limit: 10;
}
```

## Advanced Stages

### $lookup - Join Collections

```javascript
// Basic join
{ $lookup: {
  from: "orders",
  localField: "_id",
  foreignField: "userId",
  as: "userOrders"
}}

// Join with pipeline (MongoDB 3.6+)
{ $lookup: {
  from: "orders",
  let: { userId: "$_id" },
  pipeline: [
    { $match: {
      $expr: { $eq: ["$userId", "$$userId"] },
      status: "completed"
    }},
    { $project: { total: 1, date: 1 } }
  ],
  as: "completedOrders"
}}

// Self-lookup for hierarchical data
{ $lookup: {
  from: "employees",
  localField: "_id",
  foreignField: "managerId",
  as: "directReports"
}}
```

### $unwind - Destructure Arrays

```javascript
// Basic unwind
{ $unwind: "$tags" }

// Preserve empty arrays
{ $unwind: {
  path: "$tags",
  preserveNullAndEmptyArrays: true
}}

// Include array index
{ $unwind: {
  path: "$items",
  includeArrayIndex: "itemIndex"
}}
```

### $facet - Multi-Pipeline Aggregation

```javascript
{ $facet: {
  // Count by category
  categories: [
    { $group: { _id: "$category", count: { $sum: 1 } } }
  ],

  // Price statistics
  priceStats: [
    { $group: {
      _id: null,
      avgPrice: { $avg: "$price" },
      minPrice: { $min: "$price" },
      maxPrice: { $max: "$price" }
    }}
  ],

  // Top products
  topProducts: [
    { $sort: { rating: -1 } },
    { $limit: 5 }
  ]
}}
```

### $addFields - Add/Modify Fields

```javascript
{ $addFields: {
  // Simple computed field
  totalScore: { $add: ["$math", "$science"] },

  // Conditional field
  grade: {
    $switch: {
      branches: [
        { case: { $gte: ["$score", 90] }, then: "A" },
        { case: { $gte: ["$score", 80] }, then: "B" },
        { case: { $gte: ["$score", 70] }, then: "C" }
      ],
      default: "F"
    }
  },

  // Array manipulation
  tagCount: { $size: "$tags" },
  hasHighPriority: { $in: ["high", "$priorities"] }
}}
```

## Window Functions (MongoDB 5.0+)

### $setWindowFields - Window Operations

```javascript
{ $setWindowFields: {
  partitionBy: "$department",
  sortBy: { salary: -1 },
  output: {
    // Ranking functions
    salaryRank: { $rank: {} },
    salaryDenseRank: { $denseRank: {} },
    salaryRowNumber: { $documentNumber: {} },

    // Running totals
    runningTotal: {
      $sum: "$salary",
      window: { documents: ["unbounded", "current"] }
    },

    // Moving averages
    movingAvg: {
      $avg: "$salary",
      window: { documents: [-2, 2] }  // 2 before, current, 2 after
    }
  }
}}
```

## Operators by Category

### Arithmetic Operators

```javascript
// Basic math
{
  $add: ["$price", "$tax"];
}
{
  $subtract: ["$total", "$discount"];
}
{
  $multiply: ["$quantity", "$unitPrice"];
}
{
  $divide: ["$total", "$count"];
}
{
  $mod: ["$number", 10];
}
{
  $pow: ["$base", "$exponent"];
}
{
  $sqrt: "$area";
}

// Absolute and ceiling/floor
{
  $abs: "$difference";
}
{
  $ceil: "$average";
}
{
  $floor: "$average";
}
{
  $round: ["$price", 2];
} // 2 decimal places
```

### String Operators

```javascript
// Case conversion
{ $toUpper: "$name" }
{ $toLower: "$email" }

// String manipulation
{ $concat: ["$firstName", " ", "$lastName"] }
{ $substr: ["$text", 0, 10] }  // First 10 characters
{ $strLen: "$description" }
{ $trim: { input: "$name" } }

// String search
{ $indexOfBytes: ["$text", "search"] }
{ $regexMatch: { input: "$email", regex: /@gmail\.com$/ } }
```

### Date Operators

```javascript
// Date extraction
{ $year: "$createdAt" }
{ $month: "$createdAt" }
{ $dayOfMonth: "$createdAt" }
{ $dayOfWeek: "$createdAt" }
{ $hour: "$timestamp" }

// Date formatting
{ $dateToString: {
  format: "%Y-%m-%d",
  date: "$createdAt"
}}

// Date arithmetic
{ $dateAdd: {
  startDate: "$createdAt",
  unit: "day",
  amount: 30
}}

{ $dateDiff: {
  startDate: "$startDate",
  endDate: "$endDate",
  unit: "day"
}}
```

### Array Operators

```javascript
// Array information
{ $size: "$items" }
{ $isArray: "$field" }

// Array access
{ $arrayElemAt: ["$items", 0] }
{ $first: "$items" }
{ $last: "$items" }
{ $slice: ["$items", 5] }  // First 5 elements

// Array operations
{ $concatArrays: ["$array1", "$array2"] }
{ $setUnion: ["$array1", "$array2"] }
{ $setIntersection: ["$array1", "$array2"] }

// Array filtering
{ $filter: {
  input: "$items",
  cond: { $gt: ["$$this.price", 100] }
}}

// Array transformation
{ $map: {
  input: "$items",
  as: "item",
  in: { $multiply: ["$$item.price", 1.1] }
}}
```

### Conditional Operators

```javascript
// If-then-else
{ $cond: {
  if: { $gte: ["$score", 70] },
  then: "pass",
  else: "fail"
}}

// Multi-condition switch
{ $switch: {
  branches: [
    { case: { $eq: ["$grade", "A"] }, then: 4.0 },
    { case: { $eq: ["$grade", "B"] }, then: 3.0 },
    { case: { $eq: ["$grade", "C"] }, then: 2.0 }
  ],
  default: 0.0
}}

// Null handling
{ $ifNull: ["$optionalField", "default value"] }
```

## Common Patterns

### Find Top N Per Group

```javascript
// Top 3 students per class by score
[
  { $sort: { class: 1, score: -1 } },
  {
    $group: {
      _id: "$class",
      topStudents: { $push: "$$ROOT" },
    },
  },
  {
    $project: {
      topStudents: { $slice: ["$topStudents", 3] },
    },
  },
];
```

### Running Totals

```javascript
[
  { $sort: { date: 1 } },
  {
    $group: {
      _id: null,
      sales: { $push: { date: "$date", amount: "$amount" } },
    },
  },
  { $unwind: { path: "$sales", includeArrayIndex: "index" } },
  {
    $project: {
      date: "$sales.date",
      amount: "$sales.amount",
      runningTotal: {
        $sum: {
          $slice: [
            { $map: { input: "$sales", in: "$$this.amount" } },
            0,
            { $add: ["$index", 1] },
          ],
        },
      },
    },
  },
];
```

### Data Pivoting

```javascript
// Pivot sales data by month
[
  {
    $group: {
      _id: { year: { $year: "$date" }, product: "$product" },
      Jan: {
        $sum: { $cond: [{ $eq: [{ $month: "$date" }, 1] }, "$amount", 0] },
      },
      Feb: {
        $sum: { $cond: [{ $eq: [{ $month: "$date" }, 2] }, "$amount", 0] },
      },
      Mar: {
        $sum: { $cond: [{ $eq: [{ $month: "$date" }, 3] }, "$amount", 0] },
      },
      // ... continue for all months
    },
  },
];
```

### Moving Averages

```javascript
// 7-day moving average
[
  { $sort: { date: 1 } },
  {
    $setWindowFields: {
      sortBy: { date: 1 },
      output: {
        movingAvg7Day: {
          $avg: "$value",
          window: { range: [-6, 0], unit: "day" },
        },
      },
    },
  },
];
```

## Performance Tips

### Optimization Guidelines

```javascript
// 1. Put $match early in pipeline
[
  { $match: { status: "active" } },  // Filter early
  { $lookup: { /* join */ } },       // Then join
  { $group: { /* aggregate */ } }    // Finally aggregate
]

// 2. Use indexes for $match and $sort
db.collection.createIndex({ status: 1, createdAt: -1 })

// 3. Use allowDiskUse for large datasets
db.collection.aggregate(pipeline, { allowDiskUse: true })

// 4. Limit fields early with $project
{ $project: { _id: 1, name: 1, status: 1 } }  // Only needed fields

// 5. Use $sample for random sampling
{ $sample: { size: 1000 } }  // Random 1000 documents
```

### Memory Considerations

```javascript
// For large groups, consider breaking into smaller chunks
// Instead of grouping all at once:
{ $group: { _id: "$category", items: { $push: "$$ROOT" } } }

// Break into manageable pieces:
{ $group: { _id: "$category", count: { $sum: 1 } } }
```

## Debugging Techniques

### Explain Plans

```javascript
// Get execution stats
db.collection.aggregate(pipeline, { explain: true });

// Check index usage in $match stages
db.collection.explain("executionStats").aggregate(pipeline);
```

### Pipeline Testing

```javascript
// Test pipeline stages incrementally
db.collection
  .aggregate([{ $match: { status: "active" } }])
  .explain("executionStats");

// Add stages one by one to isolate issues
db.collection.aggregate([
  { $match: { status: "active" } },
  { $group: { _id: "$category", count: { $sum: 1 } } },
]);
```

### Common Errors and Fixes

```javascript
// Error: "Exceeded memory limit for $group"
// Fix: Add allowDiskUse or create supporting index
db.collection.aggregate(pipeline, { allowDiskUse: true });

// Error: "$lookup with pipeline requires MongoDB 3.6+"
// Fix: Use simple $lookup or upgrade MongoDB

// Error: "can't $group by expression"
// Fix: Use $project before $group to create computed fields
```

This cheat sheet covers the most commonly used aggregation patterns. For complex scenarios, combine multiple patterns and always test with your actual data structure and size.
