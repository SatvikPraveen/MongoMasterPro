# Index Strategies Cheat Sheet

**Location:** `docs/cheat_sheets/index_strategies.md`

## Index Types & Creation

### Single Field Indexes

```javascript
// Basic single field index
db.collection.createIndex({ name: 1 }); // Ascending
db.collection.createIndex({ price: -1 }); // Descending

// With options
db.collection.createIndex(
  { email: 1 },
  {
    unique: true,
    name: "unique_email_idx",
    background: true,
  }
);

// Sparse index (only documents with the field)
db.collection.createIndex({ optionalField: 1 }, { sparse: true });
```

### Compound Indexes

```javascript
// Order matters! Most selective field first
db.collection.createIndex({
  status: 1, // Most selective
  category: 1,
  createdAt: -1, // Sort order
});

// For queries like:
db.collection
  .find({ status: "active", category: "electronics" })
  .sort({ createdAt: -1 });

// ESR Rule: Equality, Sort, Range
db.orders.createIndex({
  userId: 1, // Equality
  status: 1, // Equality
  createdAt: -1, // Sort
  amount: 1, // Range
});
```

### Partial Indexes

```javascript
// Index only documents matching condition
db.users.createIndex(
  { email: 1 },
  {
    partialFilterExpression: {
      email: { $exists: true, $ne: null },
    },
  }
);

// Complex partial conditions
db.products.createIndex(
  { price: 1, rating: -1 },
  {
    partialFilterExpression: {
      price: { $gt: 100 },
      inStock: true,
    },
  }
);
```

### Text Indexes

```javascript
// Single field text index
db.articles.createIndex({ title: "text" });

// Multiple fields text index
db.articles.createIndex({
  title: "text",
  content: "text",
  tags: "text",
});

// Weighted text index
db.articles.createIndex(
  {
    title: "text",
    content: "text",
  },
  {
    weights: {
      title: 10, // Title 10x more important
      content: 1,
    },
    name: "article_text_idx",
  }
);

// Text search queries
db.articles.find({ $text: { $search: "mongodb database" } });
db.articles
  .find(
    { $text: { $search: '"exact phrase"' } },
    { score: { $meta: "textScore" } }
  )
  .sort({ score: { $meta: "textScore" } });
```

### Geospatial Indexes

```javascript
// 2dsphere index for GeoJSON data
db.locations.createIndex({ coordinates: "2dsphere" });

// Query nearby locations
db.locations.find({
  coordinates: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [-73.97, 40.77], // [longitude, latitude]
      },
      $maxDistance: 1000, // meters
    },
  },
});

// Geo within polygon
db.locations.find({
  coordinates: {
    $geoWithin: {
      $geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-74, 40.74],
            [-74, 40.78],
            [-73.97, 40.78],
            [-73.97, 40.74],
            [-74, 40.74],
          ],
        ],
      },
    },
  },
});
```

### TTL Indexes

```javascript
// Expire documents after 30 days
db.sessions.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 }
);

// Expire at specific time
db.logs.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 });
```

### Hashed Indexes

```javascript
// For even distribution in sharding
db.collection.createIndex({ userId: "hashed" });

// Hashed compound index (MongoDB 4.4+)
db.collection.createIndex({
  userId: "hashed",
  timestamp: 1,
});
```

## Index Strategy Patterns

### Query Pattern Analysis

```javascript
// Analyze your query patterns first
db.system.profile.aggregate([
  { $match: { "command.find": { $exists: 1 } } },
  {
    $group: {
      _id: {
        collection: "$command.find",
        filter: "$command.filter",
      },
      count: { $sum: 1 },
      avgDuration: { $avg: "$millis" },
    },
  },
  { $sort: { count: -1 } },
]);
```

### Equality-Sort-Range (ESR) Pattern

```javascript
// Optimal compound index order
// 1. Equality filters first
// 2. Sort fields next
// 3. Range filters last

// Query pattern:
db.orders
  .find({
    userId: ObjectId("..."), // Equality
    status: "completed", // Equality
  })
  .sort({
    createdAt: -1, // Sort
  })
  .limit(10);

// Optimal index:
db.orders.createIndex({
  userId: 1, // Equality
  status: 1, // Equality
  createdAt: -1, // Sort
});
```

### Covering Indexes

```javascript
// Index covers entire query (no document access needed)
db.users.createIndex({
  email: 1,
  status: 1,
  name: 1,
  createdAt: 1,
});

// This query is fully covered:
db.users.find(
  { email: "user@example.com", status: "active" },
  { name: 1, createdAt: 1, _id: 0 }
);
```

### Prefix Pattern

```javascript
// Compound index supports prefix queries
db.products.createIndex({
  category: 1,
  subcategory: 1,
  brand: 1,
  price: 1,
});

// These queries use the index:
db.products.find({ category: "electronics" });
db.products.find({ category: "electronics", subcategory: "phones" });
db.products.find({
  category: "electronics",
  subcategory: "phones",
  brand: "apple",
});

// But this doesn't use the index efficiently:
db.products.find({ subcategory: "phones", brand: "apple" });
```

## Performance Optimization

### Index Intersection

```javascript
// MongoDB can use multiple single-field indexes
db.products.createIndex({ category: 1 });
db.products.createIndex({ price: 1 });
db.products.createIndex({ rating: 1 });

// This query might use intersection:
db.products.find({
  category: "electronics",
  price: { $lt: 500 },
  rating: { $gte: 4.0 },
});

// But a compound index is usually better:
db.products.createIndex({
  category: 1,
  rating: -1,
  price: 1,
});
```

### Selectivity Analysis

```javascript
// Check field selectivity (cardinality)
db.products.aggregate([
  {
    $group: {
      _id: null,
      totalDocs: { $sum: 1 },
      uniqueCategories: { $addToSet: "$category" },
      uniqueBrands: { $addToSet: "$brand" },
      uniqueStatuses: { $addToSet: "$status" },
    },
  },
  {
    $project: {
      totalDocs: 1,
      categorySelectivity: {
        $divide: [{ $size: "$uniqueCategories" }, "$totalDocs"],
      },
      brandSelectivity: { $divide: [{ $size: "$uniqueBrands" }, "$totalDocs"] },
      statusSelectivity: {
        $divide: [{ $size: "$uniqueStatuses" }, "$totalDocs"],
      },
    },
  },
]);

// Higher selectivity = better for leading index position
```

### Query Plan Analysis

```javascript
// Analyze query execution
db.collection.find({ query }).explain("executionStats");

// Key metrics to check:
// - executionStats.executionTimeMillis
// - executionStats.totalDocsExamined vs totalDocsReturned
// - winningPlan.stage (IXSCAN vs COLLSCAN)
// - winningPlan.indexName

// Good query characteristics:
// - Uses IXSCAN (index scan)
// - totalDocsExamined ≈ totalDocsReturned
// - executionTimeMillis < 100ms
```

## Index Maintenance

### Monitor Index Usage

```javascript
// Check index usage statistics
db.collection.aggregate([{ $indexStats: {} }]);

// Find unused indexes
db.runCommand({
  aggregate: "collection",
  pipeline: [{ $indexStats: {} }, { $match: { "accesses.ops": 0 } }],
});
```

### Index Size Management

```javascript
// Check index sizes
db.collection.stats().indexSizes;

// Rebuild indexes to reclaim space
db.collection.reIndex();

// Drop unused indexes
db.collection.dropIndex("unused_index_name");

// Background index builds (less blocking)
db.collection.createIndex({ field: 1 }, { background: true });
```

### Index Limits and Constraints

```javascript
// MongoDB limits:
// - Max 64 indexes per collection
// - Max 31 fields in compound index
// - Index key size limit: 1024 bytes
// - Index name length: 125 characters max

// Check index key size before creation
db.collection.find({}, { longFieldName: 1 }).forEach((doc) => {
  if (JSON.stringify(doc.longFieldName).length > 1024) {
    print("Document with oversized key: " + doc._id);
  }
});
```

## Common Patterns by Use Case

### E-commerce Product Catalog

```javascript
// Product search and filtering
db.products.createIndex({
  category: 1,
  inStock: 1,
  rating: -1,
  price: 1,
});

// Text search
db.products.createIndex({
  name: "text",
  description: "text",
  brand: "text",
});

// Popular products by category
db.products.createIndex({
  category: 1,
  popularity: -1,
});
```

### User Activity Tracking

```javascript
// User activity queries
db.activities.createIndex({
  userId: 1,
  timestamp: -1,
});

// Recent activities across users
db.activities.createIndex({
  timestamp: -1,
  type: 1,
});

// TTL for cleanup
db.activities.createIndex(
  { timestamp: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 } // 90 days
);
```

### Time Series Data

```javascript
// Time-based queries
db.metrics.createIndex({
  source: 1,
  timestamp: -1,
});

// Aggregation by time windows
db.metrics.createIndex({
  timestamp: -1,
  metricType: 1,
});

// Cleanup old data
db.metrics.createIndex(
  { timestamp: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 } // 30 days
);
```

### Social Media Feed

```javascript
// User timeline
db.posts.createIndex({
  userId: 1,
  createdAt: -1,
});

// Global feed
db.posts.createIndex({
  createdAt: -1,
  visibility: 1,
});

// Hashtag searches
db.posts.createIndex({ hashtags: 1 });
```

## Anti-Patterns to Avoid

### Over-Indexing

```javascript
// DON'T: Create too many similar indexes
db.users.createIndex({ name: 1 });
db.users.createIndex({ name: 1, email: 1 });
db.users.createIndex({ name: 1, email: 1, status: 1 });

// DO: Create strategic compound indexes
db.users.createIndex({ name: 1, email: 1, status: 1 });
// This single index supports all three query patterns above
```

### Wrong Index Order

```javascript
// DON'T: Range field first in compound index
db.orders.createIndex({
  amount: 1, // Range field first (bad)
  userId: 1, // Equality field second
  status: 1,
});

// DO: Equality fields first
db.orders.createIndex({
  userId: 1, // Equality first
  status: 1, // Equality second
  amount: 1, // Range last
});
```

### Redundant Indexes

```javascript
// DON'T: Create redundant single-field indexes
db.products.createIndex({ category: 1 });
db.products.createIndex({ category: 1, price: 1 }); // Redundant

// DO: The compound index covers single-field queries too
db.products.createIndex({ category: 1, price: 1 });
// This supports both { category: "..." } and { category: "...", price: ... }
```

## Index Strategy Checklist

### Before Creating Indexes

- [ ] Analyze query patterns using profiler
- [ ] Identify most frequent and critical queries
- [ ] Check field selectivity and cardinality
- [ ] Consider compound index order (ESR rule)
- [ ] Evaluate covering index opportunities

### After Creating Indexes

- [ ] Verify index usage with explain plans
- [ ] Monitor index statistics
- [ ] Check query performance improvements
- [ ] Review index size and maintenance overhead
- [ ] Remove unused or redundant indexes

### Ongoing Maintenance

- [ ] Regular index usage analysis
- [ ] Monitor slow query logs
- [ ] Rebuild indexes when needed
- [ ] Update indexes for new query patterns
- [ ] Balance read vs write performance needs
