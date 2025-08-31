// File: scripts/09_security/authorization_rbac.js
// MongoDB Authorization and RBAC - Roles, Privileges, and Access Control

/**
 * MONGODB AUTHORIZATION AND RBAC
 * ===============================
 * Role-Based Access Control implementation with custom roles and privileges.
 * Covers built-in roles, custom role creation, and privilege management.
 */

const db = db.getSiblingDB("admin");

print("\n" + "=".repeat(80));
print("MONGODB AUTHORIZATION AND RBAC");
print("=".repeat(80));

// ============================================================================
// 1. BUILT-IN ROLES OVERVIEW
// ============================================================================

print("\n1. BUILT-IN ROLES OVERVIEW");
print("-".repeat(50));

function demonstrateBuiltInRoles() {
  print("\n📋 BUILT-IN MONGODB ROLES:");

  const builtInRoles = [
    {
      category: "Database User Roles",
      roles: [
        {
          name: "read",
          description: "Read data from all non-system collections",
        },
        {
          name: "readWrite",
          description: "Read and write data to all non-system collections",
        },
      ],
    },
    {
      category: "Database Administration Roles",
      roles: [
        {
          name: "dbAdmin",
          description: "Administrative tasks except user/role management",
        },
        {
          name: "dbOwner",
          description: "Full administrative access to database",
        },
        {
          name: "userAdmin",
          description: "Create and modify users and roles in database",
        },
      ],
    },
    {
      category: "Cluster Administration Roles",
      roles: [
        {
          name: "clusterAdmin",
          description: "Full cluster administration access",
        },
        {
          name: "clusterManager",
          description: "Management actions on cluster",
        },
        {
          name: "clusterMonitor",
          description: "Read-only access to monitoring tools",
        },
        { name: "hostManager", description: "Monitor and manage servers" },
      ],
    },
    {
      category: "Backup and Restore Roles",
      roles: [
        { name: "backup", description: "Backup database contents" },
        { name: "restore", description: "Restore database from backups" },
      ],
    },
    {
      category: "All-Database Roles",
      roles: [
        {
          name: "readAnyDatabase",
          description: "Read access to all databases",
        },
        {
          name: "readWriteAnyDatabase",
          description: "Read/write access to all databases",
        },
        {
          name: "userAdminAnyDatabase",
          description: "User administration on all databases",
        },
        {
          name: "dbAdminAnyDatabase",
          description: "Database administration on all databases",
        },
      ],
    },
    {
      category: "Superuser Roles",
      roles: [
        {
          name: "root",
          description: "Complete access to all resources and operations",
        },
      ],
    },
  ];

  builtInRoles.forEach((category) => {
    print(`\n🏷️ ${category.category}:`);
    category.roles.forEach((role) => {
      print(`   • ${role.name}: ${role.description}`);
    });
  });
}

// ============================================================================
// 2. CUSTOM ROLE CREATION
// ============================================================================

print("\n2. CUSTOM ROLE CREATION");
print("-".repeat(50));

function createLMSCustomRoles() {
  print("\n🛠️ CREATING CUSTOM ROLES FOR LMS:");

  const customRoles = [
    {
      name: "lmsStudentRole",
      description: "Student access to courses and assignments",
      privileges: [
        {
          resource: { db: "lms_primary", collection: "courses" },
          actions: ["find"],
        },
        {
          resource: { db: "lms_primary", collection: "enrollments" },
          actions: ["find", "insert", "update"],
        },
        {
          resource: { db: "lms_primary", collection: "assignments" },
          actions: ["find"],
        },
        {
          resource: { db: "lms_primary", collection: "submissions" },
          actions: ["find", "insert", "update"],
        },
        {
          resource: { db: "lms_primary", collection: "grades" },
          actions: ["find"],
        },
        {
          resource: { db: "lms_primary", collection: "users" },
          actions: ["find", "update"],
        },
      ],
      inheritedRoles: [],
    },
    {
      name: "lmsInstructorRole",
      description: "Instructor access to manage courses and grade assignments",
      privileges: [
        {
          resource: { db: "lms_primary", collection: "courses" },
          actions: ["find", "insert", "update"],
        },
        {
          resource: { db: "lms_primary", collection: "assignments" },
          actions: ["find", "insert", "update", "remove"],
        },
        {
          resource: { db: "lms_primary", collection: "submissions" },
          actions: ["find"],
        },
        {
          resource: { db: "lms_primary", collection: "grades" },
          actions: ["find", "insert", "update"],
        },
        {
          resource: { db: "lms_primary", collection: "enrollments" },
          actions: ["find"],
        },
        {
          resource: { db: "lms_primary", collection: "users" },
          actions: ["find"],
        },
      ],
      inheritedRoles: [],
    },
    {
      name: "lmsAdminRole",
      description: "Administrative access to all LMS operations",
      privileges: [
        {
          resource: { db: "lms_primary", collection: "" },
          actions: [
            "find",
            "insert",
            "update",
            "remove",
            "createIndex",
            "dropIndex",
          ],
        },
      ],
      inheritedRoles: [
        { role: "dbAdmin", db: "lms_primary" },
        { role: "userAdmin", db: "lms_primary" },
      ],
    },
    {
      name: "lmsAnalystRole",
      description: "Read-only access for analytics and reporting",
      privileges: [
        { resource: { db: "lms_primary", collection: "" }, actions: ["find"] },
        {
          resource: { db: "lms_analytics", collection: "" },
          actions: ["find"],
        },
        {
          resource: { cluster: true },
          actions: ["listCollections", "listIndexes"],
        },
      ],
      inheritedRoles: [],
    },
    {
      name: "lmsBackupRole",
      description: "Backup operations for LMS databases",
      privileges: [
        { resource: { db: "lms_primary", collection: "" }, actions: ["find"] },
        {
          resource: { db: "lms_analytics", collection: "" },
          actions: ["find"],
        },
        {
          resource: { cluster: true },
          actions: ["listCollections", "listIndexes", "inprog"],
        },
      ],
      inheritedRoles: [{ role: "backup", db: "admin" }],
    },
  ];

  customRoles.forEach((roleConfig) => {
    print(`\n🎭 ${roleConfig.name}:`);
    print(`   Description: ${roleConfig.description}`);
    print(`   Creation Command:`);
    print(`
use admin
db.createRole({
    role: "${roleConfig.name}",
    privileges: ${JSON.stringify(roleConfig.privileges, null, 6)},
    roles: ${JSON.stringify(roleConfig.inheritedRoles, null, 6)}
})
        `);
  });
}

function demonstrateRoleInheritance() {
  print("\n🔗 ROLE INHERITANCE EXAMPLES:");

  print(`
// Create hierarchical roles
use admin

// Base content role
db.createRole({
    role: "lmsContentBase",
    privileges: [
        { resource: { db: "lms_primary", collection: "courses" }, actions: ["find"] },
        { resource: { db: "lms_primary", collection: "assignments" }, actions: ["find"] }
    ],
    roles: []
})

// Student role inherits from content base
db.createRole({
    role: "lmsStudentExtended",
    privileges: [
        { resource: { db: "lms_primary", collection: "submissions" }, actions: ["find", "insert", "update"] }
    ],
    roles: [
        { role: "lmsContentBase", db: "admin" }
    ]
})

// Instructor role inherits from content base with additional privileges
db.createRole({
    role: "lmsInstructorExtended",
    privileges: [
        { resource: { db: "lms_primary", collection: "courses" }, actions: ["insert", "update"] },
        { resource: { db: "lms_primary", collection: "assignments" }, actions: ["insert", "update", "remove"] },
        { resource: { db: "lms_primary", collection: "grades" }, actions: ["find", "insert", "update"] }
    ],
    roles: [
        { role: "lmsContentBase", db: "admin" }
    ]
})
    `);
}

// ============================================================================
// 3. PRIVILEGE MANAGEMENT
// ============================================================================

print("\n3. PRIVILEGE MANAGEMENT");
print("-".repeat(50));

function demonstratePrivilegeTypes() {
  print("\n🔐 MONGODB PRIVILEGE TYPES:");

  const privilegeCategories = [
    {
      category: "Query and Write Privileges",
      privileges: [
        { action: "find", description: "Query documents in collection" },
        { action: "insert", description: "Insert documents into collection" },
        { action: "update", description: "Update documents in collection" },
        { action: "remove", description: "Remove documents from collection" },
      ],
    },
    {
      category: "Database Management Privileges",
      privileges: [
        { action: "createCollection", description: "Create new collections" },
        { action: "dropCollection", description: "Drop existing collections" },
        { action: "createIndex", description: "Create indexes on collections" },
        { action: "dropIndex", description: "Drop indexes from collections" },
      ],
    },
    {
      category: "User Management Privileges",
      privileges: [
        { action: "createUser", description: "Create new users" },
        { action: "dropUser", description: "Remove users" },
        { action: "createRole", description: "Create custom roles" },
        { action: "dropRole", description: "Remove roles" },
        { action: "grantRole", description: "Grant roles to users" },
        { action: "revokeRole", description: "Revoke roles from users" },
      ],
    },
    {
      category: "Administrative Privileges",
      privileges: [
        {
          action: "serverStatus",
          description: "View server status information",
        },
        { action: "dbStats", description: "View database statistics" },
        { action: "collStats", description: "View collection statistics" },
        { action: "indexStats", description: "View index usage statistics" },
      ],
    },
  ];

  privilegeCategories.forEach((category) => {
    print(`\n📊 ${category.category}:`);
    category.privileges.forEach((privilege) => {
      print(`   • ${privilege.action}: ${privilege.description}`);
    });
  });
}

function demonstrateResourceTargeting() {
  print("\n🎯 RESOURCE TARGETING EXAMPLES:");

  print(`
// Specific collection access
{
    resource: { db: "lms_primary", collection: "users" },
    actions: ["find", "update"]
}

// All collections in database
{
    resource: { db: "lms_primary", collection: "" },
    actions: ["find"]
}

// Specific collections with pattern matching
{
    resource: { db: "lms_primary", collection: "user_*" },
    actions: ["find", "insert", "update"]
}

// Any resource (use with caution)
{
    resource: { anyResource: true },
    actions: ["find"]
}

// Cluster-wide resources
{
    resource: { cluster: true },
    actions: ["listCollections", "serverStatus"]
}

// System collections
{
    resource: { db: "admin", collection: "system.users" },
    actions: ["find"]
}
    `);
}

// ============================================================================
// 4. USER AND ROLE ASSIGNMENT
// ============================================================================

print("\n4. USER AND ROLE ASSIGNMENT");
print("-".repeat(50));

function createLMSUsers() {
  print("\n👥 CREATING LMS USERS WITH ROLES:");

  const lmsUsers = [
    {
      username: "student_alice",
      database: "lms_primary",
      roles: ["lmsStudentRole"],
      description: "Regular student user",
    },
    {
      username: "instructor_bob",
      database: "lms_primary",
      roles: ["lmsInstructorRole"],
      description: "Course instructor",
    },
    {
      username: "admin_charlie",
      database: "lms_primary",
      roles: ["lmsAdminRole"],
      description: "LMS administrator",
    },
    {
      username: "analyst_diana",
      database: "lms_primary",
      roles: ["lmsAnalystRole"],
      description: "Data analyst for reporting",
    },
    {
      username: "backup_service",
      database: "admin",
      roles: ["lmsBackupRole"],
      description: "Automated backup service account",
    },
  ];

  lmsUsers.forEach((userConfig) => {
    print(`\n👤 ${userConfig.username}:`);
    print(`   Description: ${userConfig.description}`);
    print(`   Creation Command:`);
    print(`
use ${userConfig.database}
db.createUser({
    user: "${userConfig.username}",
    pwd: passwordPrompt(),
    roles: [${userConfig.roles
      .map((role) => `{ role: "${role}", db: "admin" }`)
      .join(", ")}]
})
        `);
  });
}

function demonstrateRoleModification() {
  print("\n🔄 ROLE MODIFICATION OPERATIONS:");

  print(`
// Grant additional role to user
use lms_primary
db.grantRolesToUser("student_alice", [
    { role: "lmsAnalystRole", db: "admin" }
])

// Revoke role from user
db.revokeRolesFromUser("student_alice", [
    { role: "lmsAnalystRole", db: "admin" }
])

// Update user roles completely
db.updateUser("instructor_bob", {
    roles: [
        { role: "lmsInstructorRole", db: "admin" },
        { role: "lmsAnalystRole", db: "admin" }
    ]
})

// Update role privileges
use admin
db.updateRole("lmsStudentRole", {
    privileges: [
        { resource: { db: "lms_primary", collection: "courses" }, actions: ["find"] },
        { resource: { db: "lms_primary", collection: "assignments" }, actions: ["find"] },
        { resource: { db: "lms_primary", collection: "forums" }, actions: ["find", "insert"] }
    ]
})

// Grant role to another role (inheritance)
db.grantRolesToRole("lmsStudentRole", [
    { role: "lmsContentBase", db: "admin" }
])
    `);
}

// ============================================================================
// 5. FIELD-LEVEL SECURITY
// ============================================================================

print("\n5. FIELD-LEVEL SECURITY");
print("-".repeat(50));

function implementFieldLevelSecurity() {
  print("\n🔒 FIELD-LEVEL SECURITY IMPLEMENTATION:");

  print("MongoDB field-level security through views and role-based access:");

  print(`
// Create view with restricted fields for students
use lms_primary

db.createView("student_user_view", "users", [
    {
        $project: {
            _id: 1,
            name: 1,
            email: 1,
            enrolledCourses: 1,
            // Hide sensitive fields
            ssn: 0,
            salary: 0,
            adminNotes: 0
        }
    }
])

// Create role that can only access the view
use admin
db.createRole({
    role: "lmsStudentViewRole",
    privileges: [
        { resource: { db: "lms_primary", collection: "student_user_view" }, actions: ["find"] },
        { resource: { db: "lms_primary", collection: "courses" }, actions: ["find"] },
        { resource: { db: "lms_primary", collection: "enrollments" }, actions: ["find", "insert", "update"] }
    ],
    roles: []
})

// Instructor view with more fields but still restricted
db.createView("instructor_user_view", "users", [
    {
        $project: {
            _id: 1,
            name: 1,
            email: 1,
            enrolledCourses: 1,
            academicRecord: 1,
            // Hide financial and personal info
            ssn: 0,
            salary: 0,
            bankAccount: 0
        }
    }
])
    `);

  print("\n📊 AGGREGATION PIPELINE SECURITY:");
  print(`
// Create secure aggregation views
db.createView("course_analytics_view", "enrollments", [
    {
        $lookup: {
            from: "courses",
            localField: "courseId",
            foreignField: "_id",
            as: "courseInfo"
        }
    },
    {
        $project: {
            courseTitle: "$courseInfo.title",
            enrollmentDate: "$enrolledAt",
            status: "$status",
            // Hide user personal information
            userId: 0,
            paymentInfo: 0
        }
    }
])
    `);
}

// ============================================================================
// 6. ROLE MONITORING AND AUDITING
// ============================================================================

print("\n6. ROLE MONITORING AND AUDITING");
print("-".repeat(50));

function setupRoleMonitoring() {
  print("\n📊 ROLE AND ACCESS MONITORING:");

  print(`
// View all users and their roles
use admin
db.system.users.find({}, { user: 1, roles: 1, db: 1 })

// Get detailed role information
db.getRole("lmsStudentRole", { showPrivileges: true })

// List all custom roles
db.getRoles({ showPrivileges: true, showBuiltinRoles: false })

// Check current user privileges
db.runCommand({ connectionStatus: 1 }).authInfo

// Audit user access patterns
use lms_primary
db.runCommand({
    profile: 2,
    filter: {
        "command.authenticate": { $exists: true }
    }
})

// Monitor privilege usage
db.system.profile.find({
    "command.find": { $exists: true },
    "user": { $exists: true }
}).sort({ ts: -1 })
    `);

  print("\n🚨 ACCESS CONTROL ALERTS:");
  const alertConditions = [
    "Unauthorized access attempts",
    "Privilege escalation events",
    "Role modifications outside business hours",
    "Failed authorization for sensitive operations",
    "Unusual data access patterns",
  ];

  alertConditions.forEach((condition, index) => {
    print(`   ${index + 1}. ${condition}`);
  });
}

function generateAccessReport() {
  print("\n📋 ACCESS CONTROL AUDIT REPORT:");

  print(`
// Generate comprehensive access report
function generateAccessAuditReport() {
    const report = {
        timestamp: new Date(),
        userSummary: {},
        roleSummary: {},
        privilegeUsage: {},
        securityEvents: []
    };

    // User analysis
    db.system.users.find().forEach(user => {
        report.userSummary[user.user] = {
            database: user.db,
            roles: user.roles,
            lastModified: user.lastModified || 'Unknown'
        };
    });

    // Role analysis
    db.system.roles.find().forEach(role => {
        report.roleSummary[role.role] = {
            database: role.db,
            privilegeCount: role.privileges ? role.privileges.length : 0,
            inheritedRoles: role.roles || []
        };
    });

    // Store report
    db.access_audit_reports.insertOne(report);

    return report;
}
    `);
}

// ============================================================================
// 7. EXECUTION SECTION
// ============================================================================

print("\n7. EXECUTING RBAC SETUP");
print("-".repeat(50));

try {
  // Demonstrate built-in roles
  demonstrateBuiltInRoles();

  // Create custom roles
  createLMSCustomRoles();
  demonstrateRoleInheritance();

  // Privilege management
  demonstratePrivilegeTypes();
  demonstrateResourceTargeting();

  // User creation and role assignment
  createLMSUsers();
  demonstrateRoleModification();

  // Field-level security
  implementFieldLevelSecurity();

  // Monitoring and auditing
  setupRoleMonitoring();
  generateAccessReport();

  print("\n✅ RBAC setup completed!");
  print("🎭 Custom roles created for LMS use cases");
  print("👥 User templates provided for different access levels");
  print("🔒 Field-level security implemented");
  print("📊 Monitoring and auditing procedures established");

  print("\n🚀 NEXT STEPS:");
  print("1. Create custom roles based on your requirements");
  print("2. Assign appropriate roles to users");
  print("3. Test access controls in development");
  print("4. Set up monitoring and alerting");
  print("5. Regular access reviews and audits");
} catch (error) {
  print("❌ Error during RBAC setup:");
  print(error.message);
}

print("\n" + "=".repeat(80));
print("AUTHORIZATION AND RBAC COMPLETE");
print("=".repeat(80));
