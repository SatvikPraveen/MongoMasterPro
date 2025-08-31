# File: scripts/03_schema_design/patterns_guide.md

# Embedded vs Referenced Patterns - MongoDB Schema Design Guide

## Overview

MongoDB schema design is fundamentally different from relational database design. The flexible document model allows you to choose between embedding related data within documents or referencing it from separate collections. This guide covers the key patterns and when to use each approach.

## Core Design Principles

### 1. Data Access Patterns Drive Design

- **Principle**: Design your schema based on how your application reads and writes data
- **Example**: If you always display user profile with posts, consider embedding posts in user documents
- **Anti-pattern**: Designing based on theoretical "normalization" rules

### 2. Document Size Limitations

- **BSON Document Limit**: 16MB per document
- **Working Rule**: Keep documents under 1-2MB for optimal performance
- **Impact**: Affects embedding vs referencing decisions

### 3. Atomicity Boundaries

- **Single Document**: All operations on a single document are atomic
- **Multiple Documents**: Requires transactions (MongoDB 4.0+)
- **Design Impact**: Related data that must be updated together should be in the same document

## Embedding Patterns

### One-to-Few (1:Few) - Embed

**Use When:**

- Child documents are small (< 100KB each)
- Limited number of children (< 100)
- Children are always accessed with parent
- Children don't need independent querying

**Example: User Profile with Contact Methods**

```javascript
{
  _id: ObjectId("..."),
  email: "user@example.com",
  firstName: "John",
  lastName: "Doe",
  contactMethods: [  // Embedded array
    {
      type: "phone",
      value: "+1-555-0123",
      verified: true
    },
    {
      type: "email",
      value: "john.work@company.com",
      verified: false
    }
  ]
}
```

**Advantages:**

- Single query retrieves all data
- Atomic updates to related data
- Better performance for read operations
- Natural data locality

**Disadvantages:**

- Document grows over time
- May duplicate data across documents
- Limited querying flexibility on embedded data

### One-to-Few with Subset Pattern

**Use When:**

- You have more detailed data but only need summary info frequently
- Want to avoid large document sizes
- Need both summary and detailed views

**Example: Product with Recent Reviews Subset**

```javascript
// Products collection - embedded subset
{
  _id: ObjectId("..."),
  name: "MongoDB Course",
  price: 99,
  recentReviews: [  // Only last 5 reviews embedded
    {
      _id: ObjectId("..."),
      rating: 5,
      comment: "Excellent course!",
      author: "Alice Johnson",
      date: ISODate("2023-10-15")
    }
    // ... 4 more recent reviews
  ],
  reviewStats: {
    averageRating: 4.7,
    totalReviews: 147
  }
}

// Reviews collection - full detailed reviews
{
  _id: ObjectId("..."),
  productId: ObjectId("..."),
  rating: 5,
  comment: "Excellent course! Very detailed...",
  author: "Alice Johnson",
  authorId: ObjectId("..."),
  date: ISODate("2023-10-15"),
  helpful: 23,
  verified: true
}
```

## Referencing Patterns

### One-to-Many (1:Many) - Reference

**Use When:**

- Many child documents (> 100)
- Child documents are large or frequently updated
- Need to query children independently
- Different access patterns for parent and children

**Example: Course with Enrollments**

```javascript
// Courses collection
{
  _id: ObjectId("course123"),
  title: "Advanced MongoDB",
  instructorId: ObjectId("instructor456"),
  maxStudents: 50,
  currentEnrollments: 23  // Denormalized count
}

// Enrollments collection
{
  _id: ObjectId("..."),
  studentId: ObjectId("student789"),
  courseId: ObjectId("course123"),  // Reference to course
  enrolledAt: ISODate("2023-09-01"),
  status: "active",
  progress: 45
}
```

**Advantages:**

- Flexible querying on child documents
- No document size growth issues
- Independent updates to children
- Better for analytics and reporting

**Disadvantages:**

- Multiple queries needed
- Potential consistency issues
- More complex application logic

### Many-to-Many (M:N) - Reference with Junction

**Use When:**

- Entities have many-to-many relationships
- Need to query relationships from both sides
- Relationship has additional properties

**Example: Students and Courses**

```javascript
// Students collection
{
  _id: ObjectId("student123"),
  email: "student@example.com",
  firstName: "Jane",
  lastName: "Smith"
}

// Courses collection
{
  _id: ObjectId("course456"),
  title: "MongoDB Fundamentals",
  instructorId: ObjectId("instructor789")
}

// Enrollments collection (junction/bridge)
{
  _id: ObjectId("..."),
  studentId: ObjectId("student123"),
  courseId: ObjectId("course456"),
  enrolledAt: ISODate("2023-09-01"),
  completedAt: null,
  grade: "A",
  status: "in_progress"
}
```

### Two-Way Referencing

**Use When:**

- Need to query relationships from both directions efficiently
- Willing to maintain referential integrity in application code

**Example: Bidirectional User-Course Relationship**

```javascript
// Users collection
{
  _id: ObjectId("user123"),
  email: "user@example.com",
  enrolledCourses: [  // References to courses
    ObjectId("course456"),
    ObjectId("course789")
  ]
}

// Courses collection
{
  _id: ObjectId("course456"),
  title: "Advanced Aggregation",
  enrolledStudents: [  // References to users
    ObjectId("user123"),
    ObjectId("user456")
  ]
}
```

## Hybrid Patterns

### Extended Reference Pattern

**Use When:**

- Need some denormalized data for performance
- Want to avoid joins for common fields
- Can tolerate some data duplication

**Example: Order with Customer Info**

```javascript
{
  _id: ObjectId("..."),
  customerId: ObjectId("customer123"),  // Reference
  customerInfo: {  // Denormalized for performance
    name: "John Doe",
    email: "john@example.com"
  },
  items: [...],
  total: 299.99
}
```

### Polymorphic Pattern

**Use When:**

- Documents in collection have different structures
- Common base fields with type-specific variations
- Content management systems

**Example: Mixed Content Types**

```javascript
// Articles
{
  _id: ObjectId("..."),
  type: "article",
  title: "MongoDB Best Practices",
  content: "...",
  author: "Jane Developer",
  publishedAt: ISODate("2023-10-01")
}

// Videos
{
  _id: ObjectId("..."),
  type: "video",
  title: "MongoDB Tutorial",
  videoUrl: "https://...",
  duration: 1800,  // seconds
  author: "Tech Channel",
  publishedAt: ISODate("2023-10-15")
}
```

## Schema Versioning

### Schema Evolution Strategy

**Pattern**: Include version field in documents

```javascript
{
  _id: ObjectId("..."),
  schemaVersion: "2.1",  // Version tracking
  email: "user@example.com",
  profile: {
    // New field in v2.1
    preferredLanguage: "en",
    // Migrated field from v2.0
    settings: {
      theme: "dark",
      notifications: true
    }
  }
}
```

### Migration Strategies

1. **Lazy Migration**: Update documents when accessed
2. **Bulk Migration**: Migrate all documents in batches
3. **Dual-Write**: Write in both old and new format during transition

## Performance Considerations

### Read Patterns

- **Embed**: When data is always read together
- **Reference**: When data is read independently
- **Subset**: When you need both summary and detail views

### Write Patterns

- **Embed**: When updates are infrequent or always together
- **Reference**: When child data is frequently updated
- **Denormalize**: When reads greatly outnumber writes

### Query Patterns

- **Single Collection Queries**: Fastest, use with embedding
- **Lookup Aggregations**: Good for referenced data
- **Multiple Queries**: Most flexible but slower

## Common Anti-Patterns

### 1. Over-Normalization

**Problem**: Splitting every relationship into separate collections
**Solution**: Embrace denormalization where appropriate

### 2. Unbounded Arrays

**Problem**: Arrays that grow indefinitely

```javascript
// BAD: Unbounded array
{
  userId: ObjectId("..."),
  posts: [  // This could grow to millions!
    { title: "Post 1", content: "..." },
    // ... thousands more
  ]
}
```

### 3. Massive Documents

**Problem**: Documents approaching 16MB limit
**Solution**: Use referencing or subset patterns

### 4. Fan-Out on Write

**Problem**: Single update triggers many document updates
**Solution**: Careful denormalization strategy

## Decision Framework

### Questions to Ask

1. **Cardinality**: One-to-few, one-to-many, or many-to-many?
2. **Growth**: Will the relationship grow over time? How much?
3. **Access**: Are related documents always accessed together?
4. **Update Frequency**: How often is the data updated?
5. **Query Patterns**: How will you query this data?
6. **Atomicity**: Do updates need to be atomic across related data?

### Decision Tree

```
Is it One-to-Few (< 100 children)?
├─ YES: Are children small (< 10KB each)?
│  ├─ YES: EMBED
│  └─ NO: Consider SUBSET pattern
└─ NO: Is it One-to-Many or Many-to-Many?
   ├─ One-to-Many: REFERENCE (parent to child)
   └─ Many-to-Many: REFERENCE (with junction collection)
```

## Testing Your Schema

### Performance Testing

1. Create realistic test data volumes
2. Test common query patterns
3. Measure read/write performance
4. Monitor document sizes

### Validation Rules

```javascript
// Example validation schema
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "firstName", "lastName"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^.+@.+..+$",
        },
        profile: {
          bsonType: "object",
          properties: {
            contactMethods: {
              bsonType: "array",
              maxItems: 10, // Prevent unbounded growth
              items: {
                bsonType: "object",
                required: ["type", "value"],
                properties: {
                  type: { enum: ["email", "phone", "address"] },
                },
              },
            },
          },
        },
      },
    },
  },
});
```

## Conclusion

MongoDB schema design requires balancing multiple factors:

- **Performance**: How fast do operations need to be?
- **Scalability**: How will data volume and usage grow?
- **Flexibility**: How might requirements change?
- **Consistency**: What level of data consistency is required?

The key is to understand your application's data access patterns and choose the appropriate pattern for each relationship. Don't be afraid to use different patterns within the same application - the flexibility is MongoDB's strength.

Remember: **There's no single "correct" schema design**. The best design is the one that meets your application's specific requirements for performance, scalability, and maintainability.
