// File: scripts/11_capstones/multitenant_saas.js
// MongoDB Multi-tenant SaaS - Tenant isolation patterns and data segregation strategies

/**
 * MULTI-TENANT SAAS PLATFORM
 * ===========================
 * Comprehensive multi-tenant architecture implementation using MongoDB.
 * Demonstrates tenant isolation, data segregation, and scalable SaaS patterns.
 */

const db = db.getSiblingDB("lms_multitenant");
const adminDB = db.getSiblingDB("admin");

print("\n" + "=".repeat(80));
print("MONGODB MULTI-TENANT SAAS PLATFORM");
print("=".repeat(80));

// ============================================================================
// 1. MULTI-TENANT ARCHITECTURE PATTERNS
// ============================================================================

print("\n1. MULTI-TENANT ARCHITECTURE PATTERNS");
print("-".repeat(50));

function demonstrateMultiTenantPatterns() {
  print("\n🏗️ MULTI-TENANT ARCHITECTURE PATTERNS:");

  const tenantPatterns = [
    {
      name: "Database per Tenant",
      description: "Complete database isolation per tenant",
      pros: ["Maximum isolation", "Easy backup/restore", "Custom schemas"],
      cons: [
        "Resource overhead",
        "Management complexity",
        "Cross-tenant analytics difficult",
      ],
      useCase: "Enterprise customers with strict compliance requirements",
    },
    {
      name: "Collection per Tenant",
      description: "Tenant-specific collections in shared database",
      pros: ["Good isolation", "Easier management", "Shared infrastructure"],
      cons: ["Schema consistency", "Index proliferation", "Query complexity"],
      useCase: "Medium-scale SaaS with varied tenant needs",
    },
    {
      name: "Row-Level Tenancy",
      description: "Shared collections with tenant ID filtering",
      pros: [
        "Resource efficient",
        "Simple schema",
        "Easy cross-tenant analytics",
      ],
      cons: ["Query complexity", "Security risks", "Performance concerns"],
      useCase: "High-scale SaaS with similar tenant requirements",
    },
    {
      name: "Hybrid Approach",
      description: "Combination of patterns based on data sensitivity",
      pros: ["Flexible", "Optimized resources", "Balanced security"],
      cons: ["Complex implementation", "Management overhead"],
      useCase: "Large-scale SaaS with diverse tenant requirements",
    },
  ];

  tenantPatterns.forEach((pattern, index) => {
    print(`\n${index + 1}. ${pattern.name}:`);
    print(`   Description: ${pattern.description}`);
    print(`   Use Case: ${pattern.useCase}`);
    print(`   Pros: ${pattern.pros.join(", ")}`);
    print(`   Cons: ${pattern.cons.join(", ")}`);
  });
}

// ============================================================================
// 2. TENANT MANAGEMENT INFRASTRUCTURE
// ============================================================================

print("\n2. TENANT MANAGEMENT INFRASTRUCTURE");
print("-".repeat(50));

function setupTenantInfrastructure() {
  print("\n🔧 TENANT MANAGEMENT INFRASTRUCTURE SETUP:");

  // Create tenant management collections
  const tenantCollections = [
    {
      name: "tenants",
      description: "Tenant configuration and metadata",
      schema: {
        tenantId: "String (unique)",
        name: "String",
        plan: "String (basic/premium/enterprise)",
        status: "String (active/suspended/trial)",
        settings: "Object",
        limits: "Object",
        createdAt: "Date",
        billingInfo: "Object",
      },
    },
    {
      name: "tenant_users",
      description: "Users associated with tenants",
      schema: {
        userId: "ObjectId",
        tenantId: "String",
        email: "String",
        role: "String",
        permissions: "Array",
        lastLogin: "Date",
      },
    },
    {
      name: "tenant_metrics",
      description: "Per-tenant usage and performance metrics",
      schema: {
        tenantId: "String",
        date: "Date",
        storage_used: "Number",
        api_calls: "Number",
        active_users: "Number",
        revenue: "Number",
      },
    },
  ];

  tenantCollections.forEach((collection) => {
    print(`\n📋 ${collection.name}:`);
    print(`   Description: ${collection.description}`);
    print(`   Schema: ${JSON.stringify(collection.schema, null, 6)}`);

    // Create collection and indexes
    try {
      db.createCollection(collection.name);

      // Create appropriate indexes
      switch (collection.name) {
        case "tenants":
          db[collection.name].createIndex({ tenantId: 1 }, { unique: true });
          db[collection.name].createIndex({ status: 1 });
          db[collection.name].createIndex({ plan: 1 });
          break;
        case "tenant_users":
          db[collection.name].createIndex(
            { tenantId: 1, userId: 1 },
            { unique: true }
          );
          db[collection.name].createIndex({ email: 1 });
          db[collection.name].createIndex({ tenantId: 1, role: 1 });
          break;
        case "tenant_metrics":
          db[collection.name].createIndex({ tenantId: 1, date: -1 });
          db[collection.name].createIndex({ date: -1 });
          break;
      }

      print(`   ✅ Collection created with indexes`);
    } catch (error) {
      print(`   ❌ Error: ${error.message}`);
    }
  });
}

function createSampleTenants() {
  print("\n👥 CREATING SAMPLE TENANTS:");

  const sampleTenants = [
    {
      tenantId: "acme-corp",
      name: "ACME Corporation",
      plan: "enterprise",
      status: "active",
      settings: {
        branding: { logo: "acme-logo.png", primaryColor: "#FF6600" },
        features: ["sso", "api_access", "custom_reports"],
        timezone: "America/New_York",
      },
      limits: {
        max_users: 1000,
        storage_gb: 100,
        api_calls_per_month: 1000000,
      },
      createdAt: new Date("2024-01-15"),
      billingInfo: {
        plan_cost: 999,
        billing_cycle: "monthly",
        next_billing: new Date("2024-12-15"),
      },
    },
    {
      tenantId: "startup-inc",
      name: "Startup Inc",
      plan: "premium",
      status: "active",
      settings: {
        branding: { logo: "startup-logo.png", primaryColor: "#0066CC" },
        features: ["api_access", "advanced_analytics"],
        timezone: "America/Los_Angeles",
      },
      limits: {
        max_users: 100,
        storage_gb: 25,
        api_calls_per_month: 100000,
      },
      createdAt: new Date("2024-03-20"),
      billingInfo: {
        plan_cost: 299,
        billing_cycle: "monthly",
        next_billing: new Date("2024-12-20"),
      },
    },
    {
      tenantId: "education-org",
      name: "Education Organization",
      plan: "basic",
      status: "trial",
      settings: {
        branding: { logo: "edu-logo.png", primaryColor: "#009900" },
        features: ["basic_reports"],
        timezone: "Europe/London",
      },
      limits: {
        max_users: 50,
        storage_gb: 10,
        api_calls_per_month: 10000,
      },
      createdAt: new Date("2024-11-01"),
      billingInfo: {
        plan_cost: 99,
        billing_cycle: "monthly",
        trial_end: new Date("2024-12-01"),
      },
    },
  ];

  sampleTenants.forEach((tenant) => {
    try {
      db.tenants.insertOne(tenant);
      print(`✅ Created tenant: ${tenant.name} (${tenant.tenantId})`);
    } catch (error) {
      print(`❌ Error creating ${tenant.tenantId}: ${error.message}`);
    }
  });
}

// ============================================================================
// 3. ROW-LEVEL TENANCY IMPLEMENTATION
// ============================================================================

print("\n3. ROW-LEVEL TENANCY IMPLEMENTATION");
print("-".repeat(50));

function implementRowLevelTenancy() {
  print("\n📊 ROW-LEVEL TENANCY IMPLEMENTATION:");

  // Create multi-tenant collections with tenantId field
  const multiTenantCollections = [
    {
      name: "mt_users",
      description: "Multi-tenant user data",
    },
    {
      name: "mt_courses",
      description: "Multi-tenant course data",
    },
    {
      name: "mt_enrollments",
      description: "Multi-tenant enrollment data",
    },
  ];

  multiTenantCollections.forEach((collection) => {
    print(`\n📋 Setting up ${collection.name}:`);

    try {
      db.createCollection(collection.name);

      // Create compound indexes with tenantId first
      db[collection.name].createIndex({ tenantId: 1, _id: 1 });
      db[collection.name].createIndex({ tenantId: 1, status: 1 });
      db[collection.name].createIndex({ tenantId: 1, createdAt: -1 });

      print(`   ✅ Created with tenant-aware indexes`);
    } catch (error) {
      print(`   ❌ Error: ${error.message}`);
    }
  });

  // Sample multi-tenant data insertion
  print("\n📝 INSERTING SAMPLE MULTI-TENANT DATA:");

  const sampleData = `
// Insert tenant-specific users
db.mt_users.insertMany([
    {
        tenantId: 'acme-corp',
        name: 'John Smith',
        email: 'john.smith@acme-corp.com',
        role: 'admin',
        status: 'active',
        createdAt: new Date()
    },
    {
        tenantId: 'startup-inc',
        name: 'Jane Doe',
        email: 'jane.doe@startup-inc.com',
        role: 'user',
        status: 'active',
        createdAt: new Date()
    },
    {
        tenantId: 'education-org',
        name: 'Bob Wilson',
        email: 'bob.wilson@education-org.com',
        role: 'instructor',
        status: 'active',
        createdAt: new Date()
    }
]);

// Insert tenant-specific courses
db.mt_courses.insertMany([
    {
        tenantId: 'acme-corp',
        title: 'Enterprise MongoDB Training',
        description: 'Advanced MongoDB for enterprise applications',
        category: 'database',
        price: 999,
        status: 'published',
        createdAt: new Date()
    },
    {
        tenantId: 'startup-inc',
        title: 'Startup Growth Strategies',
        description: 'Scaling your startup effectively',
        category: 'business',
        price: 299,
        status: 'published',
        createdAt: new Date()
    }
]);

// Tenant-aware queries (CRITICAL: Always include tenantId)
db.mt_users.find({ tenantId: 'acme-corp', status: 'active' });
db.mt_courses.find({ tenantId: 'startup-inc', category: 'business' });
db.mt_enrollments.find({ tenantId: 'education-org', enrolledAt: { $gte: new Date('2024-01-01') } });
    `;

  print(sampleData);
}

function implementTenantMiddleware() {
  print("\n🔒 TENANT SECURITY MIDDLEWARE:");

  const middlewareCode = `
// Tenant context middleware
class TenantContext {
    constructor() {
        this.currentTenant = null;
        this.userPermissions = null;
    }

    setTenant(tenantId, userId) {
        this.currentTenant = tenantId;

        // Verify user belongs to tenant
        const user = db.tenant_users.findOne({
            tenantId: tenantId,
            userId: userId
        });

        if (!user) {
            throw new Error('User not authorized for tenant');
        }

        this.userPermissions = user.permissions;
        return true;
    }

    // Ensure all queries include tenant filter
    addTenantFilter(query = {}) {
        if (!this.currentTenant) {
            throw new Error('Tenant context not set');
        }

        return {
            tenantId: this.currentTenant,
            ...query
        };
    }

    // Secure find operation
    find(collection, query = {}, options = {}) {
        const secureQuery = this.addTenantFilter(query);
        return db[collection].find(secureQuery, options);
    }

    // Secure insert operation
    insertOne(collection, document) {
        if (!this.currentTenant) {
            throw new Error('Tenant context not set');
        }

        const secureDocument = {
            tenantId: this.currentTenant,
            ...document,
            createdAt: new Date(),
            createdBy: this.userId
        };

        return db[collection].insertOne(secureDocument);
    }

    // Secure update operation
    updateOne(collection, filter, update, options = {}) {
        const secureFilter = this.addTenantFilter(filter);

        // Add tenant audit info
        if (update.$set) {
            update.$set.updatedAt = new Date();
            update.$set.updatedBy = this.userId;
        }

        return db[collection].updateOne(secureFilter, update, options);
    }

    // Secure delete operation
    deleteOne(collection, filter) {
        const secureFilter = this.addTenantFilter(filter);
        return db[collection].deleteOne(secureFilter);
    }
}

// Usage example
const tenantCtx = new TenantContext();
tenantCtx.setTenant('acme-corp', ObjectId('user123'));

// All operations are now tenant-aware
const users = tenantCtx.find('mt_users', { status: 'active' });
const newCourse = tenantCtx.insertOne('mt_courses', {
    title: 'New Course',
    category: 'training'
});
    `;

  print(middlewareCode);
}

// ============================================================================
// 4. COLLECTION PER TENANT PATTERN
// ============================================================================

print("\n4. COLLECTION PER TENANT PATTERN");
print("-".repeat(50));

function implementCollectionPerTenant() {
  print("\n🗂️ COLLECTION PER TENANT IMPLEMENTATION:");

  const collectionPatternCode = `
// Collection per tenant management
class TenantCollectionManager {
    constructor() {
        this.tenantCollections = new Map();
    }

    // Create tenant-specific collections
    initializeTenantCollections(tenantId) {
        const collections = ['users', 'courses', 'enrollments', 'assignments'];

        collections.forEach(collectionType => {
            const collectionName = \`\${tenantId}_\${collectionType}\`;

            try {
                // Create collection
                db.createCollection(collectionName);

                // Create indexes based on collection type
                this.createTenantIndexes(collectionName, collectionType);

                // Store collection mapping
                this.tenantCollections.set(\`\${tenantId}:\${collectionType}\`, collectionName);

                print(\`Created collection: \${collectionName}\`);

            } catch (error) {
                print(\`Error creating \${collectionName}: \${error.message}\`);
            }
        });
    }

    createTenantIndexes(collectionName, collectionType) {
        switch(collectionType) {
            case 'users':
                db[collectionName].createIndex({ email: 1 }, { unique: true });
                db[collectionName].createIndex({ status: 1 });
                db[collectionName].createIndex({ role: 1 });
                break;
            case 'courses':
                db[collectionName].createIndex({ category: 1, status: 1 });
                db[collectionName].createIndex({ createdAt: -1 });
                break;
            case 'enrollments':
                db[collectionName].createIndex({ userId: 1, courseId: 1 }, { unique: true });
                db[collectionName].createIndex({ status: 1, enrolledAt: -1 });
                break;
            case 'assignments':
                db[collectionName].createIndex({ courseId: 1, dueDate: 1 });
                break;
        }
    }

    // Get tenant-specific collection name
    getCollectionName(tenantId, collectionType) {
        const key = \`\${tenantId}:\${collectionType}\`;
        return this.tenantCollections.get(key) || \`\${tenantId}_\${collectionType}\`;
    }

    // Tenant-aware database operations
    find(tenantId, collectionType, query = {}, options = {}) {
        const collectionName = this.getCollectionName(tenantId, collectionType);
        return db[collectionName].find(query, options);
    }

    insertOne(tenantId, collectionType, document) {
        const collectionName = this.getCollectionName(tenantId, collectionType);
        return db[collectionName].insertOne({
            ...document,
            createdAt: new Date()
        });
    }

    // Cleanup tenant collections (for tenant deletion)
    dropTenantCollections(tenantId) {
        const collections = ['users', 'courses', 'enrollments', 'assignments'];

        collections.forEach(collectionType => {
            const collectionName = \`\${tenantId}_\${collectionType}\`;
            try {
                db[collectionName].drop();
                this.tenantCollections.delete(\`\${tenantId}:\${collectionType}\`);
                print(\`Dropped collection: \${collectionName}\`);
            } catch (error) {
                print(\`Error dropping \${collectionName}: \${error.message}\`);
            }
        });
    }
}

// Usage example
const tenantManager = new TenantCollectionManager();

// Initialize collections for new tenant
tenantManager.initializeTenantCollections('acme-corp');

// Use tenant-specific operations
const acmeUsers = tenantManager.find('acme-corp', 'users', { status: 'active' });
const newCourse = tenantManager.insertOne('acme-corp', 'courses', {
    title: 'ACME Training Course',
    category: 'corporate'
});
    `;

  print(collectionPatternCode);
}

// ============================================================================
// 5. DATABASE PER TENANT PATTERN
// ============================================================================

print("\n5. DATABASE PER TENANT PATTERN");
print("-".repeat(50));

function implementDatabasePerTenant() {
  print("\n🏛️ DATABASE PER TENANT IMPLEMENTATION:");

  const dbPatternCode = `
// Database per tenant management
class TenantDatabaseManager {
    constructor() {
        this.tenantDatabases = new Map();
    }

    // Create dedicated database for tenant
    createTenantDatabase(tenantId, tenantConfig) {
        const dbName = \`lms_tenant_\${tenantId.replace(/[^a-zA-Z0-9]/g, '_')}\`;

        try {
            const tenantDB = db.getSiblingDB(dbName);

            // Create collections with proper schema
            this.initializeTenantSchema(tenantDB, tenantConfig);

            // Set up tenant-specific indexes
            this.createOptimizedIndexes(tenantDB, tenantConfig);

            // Configure tenant-specific settings
            this.configureTenantDatabase(tenantDB, tenantConfig);

            // Store database mapping
            this.tenantDatabases.set(tenantId, dbName);

            print(\`Created database: \${dbName} for tenant: \${tenantId}\`);

            return tenantDB;

        } catch (error) {
            print(\`Error creating database for \${tenantId}: \${error.message}\`);
            throw error;
        }
    }

    initializeTenantSchema(tenantDB, tenantConfig) {
        const collections = {
            users: {
                validator: {
                    $jsonSchema: {
                        bsonType: 'object',
                        required: ['email', 'name', 'role'],
                        properties: {
                            email: { bsonType: 'string', pattern: '^.+@.+ },
                            name: { bsonType: 'string' },
                            role: { enum: ['admin', 'instructor', 'student'] }
                        }
                    }
                }
            },
            courses: {
                validator: {
                    $jsonSchema: {
                        bsonType: 'object',
                        required: ['title', 'category', 'status'],
                        properties: {
                            title: { bsonType: 'string' },
                            category: { bsonType: 'string' },
                            status: { enum: ['draft', 'published', 'archived'] }
                        }
                    }
                }
            },
            enrollments: {
                validator: {
                    $jsonSchema: {
                        bsonType: 'object',
                        required: ['userId', 'courseId', 'enrolledAt'],
                        properties: {
                            userId: { bsonType: 'objectId' },
                            courseId: { bsonType: 'objectId' },
                            enrolledAt: { bsonType: 'date' }
                        }
                    }
                }
            }
        };

        Object.keys(collections).forEach(collectionName => {
            tenantDB.createCollection(collectionName, collections[collectionName]);
        });
    }

    createOptimizedIndexes(tenantDB, tenantConfig) {
        // Optimize indexes based on tenant's usage patterns
        const indexStrategy = tenantConfig.plan;

        if (indexStrategy === 'enterprise') {
            // Enterprise tenants get comprehensive indexes
            tenantDB.users.createIndex({ email: 1 }, { unique: true });
            tenantDB.users.createIndex({ role: 1, status: 1 });
            tenantDB.users.createIndex({ lastLoginAt: -1 });
            tenantDB.users.createIndex({ 'profile.department': 1 });

            tenantDB.courses.createIndex({ category: 1, status: 1 });
            tenantDB.courses.createIndex({ instructorId: 1, status: 1 });
            tenantDB.courses.createIndex({ tags: 1 });
            tenantDB.courses.createIndex({ createdAt: -1 });

        } else if (indexStrategy === 'premium') {
            // Premium tenants get standard indexes
            tenantDB.users.createIndex({ email: 1 }, { unique: true });
            tenantDB.users.createIndex({ role: 1 });
            tenantDB.courses.createIndex({ category: 1, status: 1 });

        } else {
            // Basic tenants get minimal indexes
            tenantDB.users.createIndex({ email: 1 }, { unique: true });
            tenantDB.courses.createIndex({ status: 1 });
        }
    }

    configureTenantDatabase(tenantDB, tenantConfig) {
        // Set up tenant-specific configurations
        if (tenantConfig.settings && tenantConfig.settings.features) {
            // Configure features based on tenant plan
            if (tenantConfig.settings.features.includes('audit_log')) {
                tenantDB.createCollection('audit_log', { capped: true, size: 100000000 });
            }

            if (tenantConfig.settings.features.includes('analytics')) {
                tenantDB.createCollection('analytics_events');
                tenantDB.analytics_events.createIndex({ eventType: 1, timestamp: -1 });
            }
        }
    }

    // Get tenant database connection
    getTenantDB(tenantId) {
        const dbName = this.tenantDatabases.get(tenantId);
        return dbName ? db.getSiblingDB(dbName) : null;
    }

    // Tenant database operations
    query(tenantId, collection, filter = {}, options = {}) {
        const tenantDB = this.getTenantDB(tenantId);
        if (!tenantDB) throw new Error(\`No database found for tenant: \${tenantId}\`);

        return tenantDB[collection].find(filter, options);
    }

    insert(tenantId, collection, document) {
        const tenantDB = this.getTenantDB(tenantId);
        if (!tenantDB) throw new Error(\`No database found for tenant: \${tenantId}\`);

        return tenantDB[collection].insertOne({
            ...document,
            createdAt: new Date()
        });
    }

    // Backup individual tenant database
    backupTenantDatabase(tenantId) {
        const dbName = this.tenantDatabases.get(tenantId);
        if (!dbName) throw new Error(\`No database found for tenant: \${tenantId}\`);

        // MongoDB backup command (would be executed externally)
        const backupCommand = \`mongodump --db \${dbName} --out /backups/\${tenantId}_\${new Date().toISOString().split('T')[0]}\`;

        print(\`Backup command for \${tenantId}: \${backupCommand}\`);
        return backupCommand;
    }

    // Drop tenant database (for tenant deletion)
    dropTenantDatabase(tenantId) {
        const dbName = this.tenantDatabases.get(tenantId);
        if (!dbName) return false;

        try {
            db.getSiblingDB(dbName).dropDatabase();
            this.tenantDatabases.delete(tenantId);
            print(\`Dropped database: \${dbName} for tenant: \${tenantId}\`);
            return true;
        } catch (error) {
            print(\`Error dropping database for \${tenantId}: \${error.message}\`);
            return false;
        }
    }
}

// Usage example
const tenantDBManager = new TenantDatabaseManager();

// Create dedicated database for enterprise tenant
const tenantConfig = {
    plan: 'enterprise',
    settings: {
        features: ['audit_log', 'analytics', 'custom_reports']
    }
};

const acmeDB = tenantDBManager.createTenantDatabase('acme-corp', tenantConfig);

// Use tenant-specific database operations
const users = tenantDBManager.query('acme-corp', 'users', { role: 'admin' });
const newUser = tenantDBManager.insert('acme-corp', 'users', {
    name: 'New Admin',
    email: 'admin@acme-corp.com',
    role: 'admin'
});
    `;

  print(dbPatternCode);
}

// ============================================================================
// 6. CROSS-TENANT ANALYTICS AND REPORTING
// ============================================================================

print("\n6. CROSS-TENANT ANALYTICS AND REPORTING");
print("-".repeat(50));

function implementCrossTenantAnalytics() {
  print("\n📊 CROSS-TENANT ANALYTICS IMPLEMENTATION:");

  const analyticsCode = `
// Cross-tenant analytics and reporting
class CrossTenantAnalytics {
    constructor() {
        this.analyticsDB = db.getSiblingDB('lms_analytics');
    }

    // Aggregate metrics across all tenants
    generateCrossTenantReport() {
        return {
            tenant_summary: this.getTenantSummary(),
            usage_metrics: this.getUsageMetrics(),
            revenue_analysis: this.getRevenueAnalysis(),
            performance_metrics: this.getPerformanceMetrics()
        };
    }

    getTenantSummary() {
        return db.tenants.aggregate([
            {
                $group: {
                    _id: '$plan',
                    tenant_count: { $sum: 1 },
                    total_users: { $sum: '$limits.max_users' },
                    avg_storage_gb: { $avg: '$limits.storage_gb' },
                    total_revenue: { $sum: '$billingInfo.plan_cost' }
                }
            },
            {
                $sort: { total_revenue: -1 }
            }
        ]).toArray();
    }

    getUsageMetrics() {
        // For row-level tenancy pattern
        return [
            {
                name: 'Active Users by Tenant',
                data: db.mt_users.aggregate([
                    { $match: { status: 'active' } },
                    { $group: { _id: '$tenantId', active_users: { $sum: 1 } } },
                    { $sort: { active_users: -1 } }
                ]).toArray()
            },
            {
                name: 'Course Enrollments by Tenant',
                data: db.mt_enrollments.aggregate([
                    { $match: { status: 'active' } },
                    { $group: { _id: '$tenantId', enrollments: { $sum: 1 } } },
                    { $sort: { enrollments: -1 } }
                ]).toArray()
            }
        ];
    }

    getRevenueAnalysis() {
        return db.tenants.aggregate([
            {
                $lookup: {
                    from: 'tenant_metrics',
                    localField: 'tenantId',
                    foreignField: 'tenantId',
                    as: 'metrics'
                }
            },
            {
                $unwind: { path: '$metrics', preserveNullAndEmptyArrays: true }
            },
            {
                $match: {
                    'metrics.date': { $gte: new Date(Date.now() - 30*24*60*60*1000) }
                }
            },
            {
                $group: {
                    _id: '$tenantId',
                    tenant_name: { $first: '$name' },
                    plan: { $first: '$plan' },
                    monthly_revenue: { $first: '$billingInfo.plan_cost' },
                    usage_revenue: { $sum: '$metrics.revenue' },
                    avg_monthly_users: { $avg: '$metrics.active_users' }
                }
            },
            {
                $addFields: {
                    total_revenue: { $add: ['$monthly_revenue', '$usage_revenue'] },
                    revenue_per_user: {
                        $divide: [
                            { $add: ['$monthly_revenue', '$usage_revenue'] },
                            '$avg_monthly_users'
                        ]
                    }
                }
            },
            {
                $sort: { total_revenue: -1 }
            }
        ]).toArray();
    }

    getPerformanceMetrics() {
        // Analyze performance across tenant patterns
        const patterns = ['row_level', 'collection_per_tenant', 'database_per_tenant'];

        return patterns.map(pattern => ({
            pattern: pattern,
            metrics: this.analyzePatternPerformance(pattern)
        }));
    }

    analyzePatternPerformance(pattern) {
        switch(pattern) {
            case 'row_level':
                return {
                    avg_query_time: this.measureQueryTime('mt_users', { tenantId: 'acme-corp' }),
                    index_efficiency: this.analyzeIndexUsage('mt_users'),
                    storage_overhead: 'Low - shared collections'
                };
            case 'collection_per_tenant':
                return {
                    avg_query_time: this.measureQueryTime('acme-corp_users', {}),
                    index_efficiency: 'High - dedicated indexes',
                    storage_overhead: 'Medium - separate collections'
                };
            case 'database_per_tenant':
                return {
                    avg_query_time: 'Varies by tenant database',
                    index_efficiency: 'Highest - optimized per tenant',
                    storage_overhead: 'High - separate databases'
                };
            default:
                return {};
        }
    }

    measureQueryTime(collection, query) {
        const start = Date.now();
        db[collection].find(query).limit(100).toArray();
        return Date.now() - start;
    }

    analyzeIndexUsage(collection) {
        // Would use $indexStats in production
        return 'Analyzed via $indexStats aggregation';
    }

    // Generate SaaS metrics dashboard
    generateSaaSMetrics() {
        const metrics = {
            // Monthly Recurring Revenue
            mrr: db.tenants.aggregate([
                { $match: { status: 'active' } },
                { $group: { _id: null, total_mrr: { $sum: '$billingInfo.plan_cost' } } }
            ]).toArray()[0]?.total_mrr || 0,

            // Customer Acquisition Cost
            cac: this.calculateCAC(),

            // Customer Lifetime Value
            ltv: this.calculateLTV(),

            // Churn Rate
            churn_rate: this.calculateChurnRate(),

            // Net Promoter Score
            nps: this.calculateNPS()
        };

        // Store metrics for historical tracking
        this.analyticsDB.saas_metrics.insertOne({
            ...metrics,
            date: new Date(),
            period: 'monthly'
        });

        return metrics;
    }

    calculateCAC() {
        // Placeholder - would integrate with marketing spend data
        return 150; // Average customer acquisition cost
    }

    calculateLTV() {
        // Calculate based on average revenue per user and retention
        const avgRevenuePerUser = db.tenants.aggregate([
            { $group: { _id: null, avg_revenue: { $avg: '$billingInfo.plan_cost' } } }
        ]).toArray()[0]?.avg_revenue || 0;

        const avgRetentionMonths = 24; // Would calculate from historical data
        return avgRevenuePerUser * avgRetentionMonths;
    }

    calculateChurnRate() {
        // Would calculate based on tenant cancellations
        return 0.05; // 5% monthly churn rate
    }

    calculateNPS() {
        // Would integrate with customer satisfaction surveys
        return 45; // Net Promoter Score
    }
}

// Usage
const analytics = new CrossTenantAnalytics();
const crossTenantReport = analytics.generateCrossTenantReport();
const saasMetrics = analytics.generateSaaSMetrics();
    `;

  print(analyticsCode);
}

// ============================================================================
// 7. EXECUTION SECTION
// ============================================================================

print("\n7. EXECUTING MULTI-TENANT SAAS SETUP");
print("-".repeat(50));

try {
  // Demonstrate architecture patterns
  demonstrateMultiTenantPatterns();

  // Setup tenant infrastructure
  setupTenantInfrastructure();
  createSampleTenants();

  // Implement row-level tenancy
  implementRowLevelTenancy();
  implementTenantMiddleware();

  // Implement collection per tenant
  implementCollectionPerTenant();

  // Implement database per tenant
  implementDatabasePerTenant();

  // Setup cross-tenant analytics
  implementCrossTenantAnalytics();

  print("\n✅ Multi-tenant SaaS platform setup completed!");
  print("🏗️ Multiple tenancy patterns demonstrated");
  print("🔒 Security and isolation implemented");
  print("📊 Cross-tenant analytics configured");
  print("⚡ Scalable architecture patterns provided");

  print("\n🚀 NEXT STEPS:");
  print("1. Choose appropriate tenancy pattern for your scale");
  print("2. Implement tenant onboarding workflows");
  print("3. Set up billing and subscription management");
  print("4. Configure monitoring and alerting per tenant");
  print("5. Test tenant isolation and security");
} catch (error) {
  print("❌ Error during multi-tenant SaaS setup:");
  print(error.message);
}

print("\n" + "=".repeat(80));
print("MULTI-TENANT SAAS PLATFORM COMPLETE");
print("=".repeat(80));
