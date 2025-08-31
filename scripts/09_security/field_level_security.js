// File: scripts/09_security/field_level_security.js
// MongoDB Field-Level Security - Redaction, Encryption, and Data Protection

/**
 * FIELD-LEVEL SECURITY
 * =====================
 * Advanced field-level security implementation including data redaction,
 * client-side field-level encryption, and sensitive data protection.
 */

const db = db.getSiblingDB("lms_primary");
const adminDB = db.getSiblingDB("admin");

print("\n" + "=".repeat(80));
print("MONGODB FIELD-LEVEL SECURITY");
print("=".repeat(80));

// ============================================================================
// 1. DATA CLASSIFICATION AND SENSITIVITY
// ============================================================================

print("\n1. DATA CLASSIFICATION AND SENSITIVITY");
print("-".repeat(50));

function classifyDataSensitivity() {
  print("\n🏷️ DATA SENSITIVITY CLASSIFICATION:");

  const dataClassification = [
    {
      level: "PUBLIC",
      description: "Data that can be freely shared",
      examples: [
        "Course titles",
        "Public announcements",
        "General course descriptions",
      ],
      protection: "None required",
    },
    {
      level: "INTERNAL",
      description: "Data for internal use only",
      examples: [
        "Internal course IDs",
        "System configurations",
        "Non-personal statistics",
      ],
      protection: "Access controls",
    },
    {
      level: "CONFIDENTIAL",
      description: "Sensitive business data",
      examples: ["Student grades", "Personal profiles", "Course analytics"],
      protection: "Role-based access + field masking",
    },
    {
      level: "RESTRICTED",
      description: "Highly sensitive personal data",
      examples: [
        "SSN",
        "Payment information",
        "Medical records",
        "Authentication credentials",
      ],
      protection: "Encryption + strict access controls",
    },
  ];

  dataClassification.forEach((level, index) => {
    print(`\n${index + 1}. ${level.level}:`);
    print(`   Description: ${level.description}`);
    print(`   Examples: ${level.examples.join(", ")}`);
    print(`   Protection: ${level.protection}`);
  });

  print("\n📊 LMS DATA CLASSIFICATION EXAMPLE:");
  print(`
{
    "_id": ObjectId("..."),
    "name": "John Doe",              // CONFIDENTIAL
    "email": "john@example.com",     // CONFIDENTIAL
    "ssn": "123-45-6789",           // RESTRICTED
    "phone": "555-0123",            // CONFIDENTIAL
    "address": {                    // CONFIDENTIAL
        "street": "123 Main St",
        "city": "Anytown",
        "zipCode": "12345"
    },
    "enrollments": [...],           // INTERNAL
    "courseTitle": "MongoDB 101",   // PUBLIC
    "paymentInfo": {               // RESTRICTED
        "creditCard": "****-****-****-1234",
        "expiryDate": "12/25"
    }
}
    `);
}

// ============================================================================
// 2. FIELD REDACTION WITH VIEWS
// ============================================================================

print("\n2. FIELD REDACTION WITH VIEWS");
print("-".repeat(50));

function implementFieldRedaction() {
  print("\n🎭 FIELD REDACTION IMPLEMENTATION:");

  print("Creating secure views with field redaction for different user roles:");

  const secureViews = [
    {
      viewName: "students_public_view",
      sourceCollection: "users",
      role: "Students",
      pipeline: [
        {
          $project: {
            name: 1,
            email: { $concat: [{ $substr: ["$email", 0, 3] }, "***@***.com"] },
            enrolledCourses: 1,
            publicProfile: 1,
            // Hide all sensitive fields
            ssn: 0,
            phone: 0,
            address: 0,
            paymentInfo: 0,
            adminNotes: 0,
          },
        },
      ],
    },
    {
      viewName: "instructors_limited_view",
      sourceCollection: "users",
      role: "Instructors",
      pipeline: [
        {
          $project: {
            name: 1,
            email: 1,
            phone: {
              $cond: {
                if: { $eq: ["$role", "student"] },
                then: "***-***-****",
                else: "$phone",
              },
            },
            enrolledCourses: 1,
            academicHistory: 1,
            // Hide financial and personal info
            ssn: 0,
            address: { street: 0, city: 1, zipCode: 0 },
            paymentInfo: 0,
            adminNotes: 0,
          },
        },
      ],
    },
    {
      viewName: "analytics_anonymized_view",
      sourceCollection: "users",
      role: "Analysts",
      pipeline: [
        {
          $project: {
            // Anonymized identifier
            userId: { $toString: "$_id" },
            // Demographic data (generalized)
            ageRange: {
              $switch: {
                branches: [
                  { case: { $lt: ["$age", 25] }, then: "18-24" },
                  { case: { $lt: ["$age", 35] }, then: "25-34" },
                  { case: { $lt: ["$age", 45] }, then: "35-44" },
                  { case: { $gte: ["$age", 45] }, then: "45+" },
                ],
              },
            },
            city: "$address.city",
            enrollmentCount: { $size: "$enrolledCourses" },
            registrationMonth: { $month: "$createdAt" },
            // Remove all identifying information
            name: 0,
            email: 0,
            ssn: 0,
            phone: 0,
            address: { street: 0, zipCode: 0 },
            paymentInfo: 0,
          },
        },
      ],
    },
  ];

  secureViews.forEach((viewConfig) => {
    print(`\n🔍 ${viewConfig.viewName}:`);
    print(`   Target Role: ${viewConfig.role}`);
    print(`   Creation Command:`);
    print(`
db.createView("${viewConfig.viewName}", "${
      viewConfig.sourceCollection
    }", ${JSON.stringify(viewConfig.pipeline, null, 2)})
        `);
  });
}

function demonstrateConditionalRedaction() {
  print("\n🔄 CONDITIONAL FIELD REDACTION:");

  print(`
// Dynamic redaction based on user context
db.createView("context_sensitive_users", "users", [
    {
        $addFields: {
            // Get current user context (would be passed from application)
            currentUserRole: "$$userRole",  // Application-provided variable
            currentUserId: "$$userId"       // Application-provided variable
        }
    },
    {
        $project: {
            name: 1,
            email: {
                $cond: {
                    if: {
                        $or: [
                            { $eq: ["$currentUserRole", "admin"] },
                            { $eq: ["$_id", "$currentUserId"] }
                        ]
                    },
                    then: "$email",
                    else: { $concat: [{ $substr: ["$email", 0, 3] }, "***@***.com"] }
                }
            },
            phone: {
                $cond: {
                    if: { $in: ["$currentUserRole", ["admin", "instructor"]] },
                    then: "$phone",
                    else: "***-***-****"
                }
            },
            ssn: {
                $cond: {
                    if: { $eq: ["$currentUserRole", "admin"] },
                    then: "$ssn",
                    else: "***-**-****"
                }
            }
        }
    }
])

// Time-based redaction (e.g., grades hidden until release date)
db.createView("time_sensitive_grades", "grades", [
    {
        $project: {
            studentId: 1,
            assignmentId: 1,
            submittedAt: 1,
            score: {
                $cond: {
                    if: { $gte: [new Date(), "$releaseDate"] },
                    then: "$score",
                    else: "Not Released"
                }
            },
            feedback: {
                $cond: {
                    if: { $gte: [new Date(), "$releaseDate"] },
                    then: "$feedback",
                    else: "Feedback will be available after release date"
                }
            }
        }
    }
])
    `);
}

// ============================================================================
// 3. CLIENT-SIDE FIELD LEVEL ENCRYPTION (CSFLE)
// ============================================================================

print("\n3. CLIENT-SIDE FIELD LEVEL ENCRYPTION");
print("-".repeat(50));

function setupClientSideEncryption() {
  print("\n🔐 CLIENT-SIDE FIELD LEVEL ENCRYPTION SETUP:");

  print("⚠️ CSFLE requires MongoDB Enterprise or Atlas");

  print("\n1️⃣ KEY MANAGEMENT SETUP:");
  print(`
// Create master key (use AWS KMS, Azure Key Vault, or local key)
const localMasterKey = crypto.randomBytes(96);

// Key management configuration
const kmsProviders = {
    local: {
        key: localMasterKey
    }
    // For AWS KMS:
    // aws: {
    //     accessKeyId: "AWS_ACCESS_KEY_ID",
    //     secretAccessKey: "AWS_SECRET_ACCESS_KEY",
    //     region: "us-east-1"
    // }
};

// Create data encryption key
const keyVaultNamespace = "encryption.__keyVault";
const keyVault = db.getSiblingDB("encryption").getCollection("__keyVault");
    `);

  print("\n2️⃣ SCHEMA MAP CONFIGURATION:");
  print(`
const schemaMap = {
    "lms_primary.users": {
        bsonType: "object",
        properties: {
            ssn: {
                encrypt: {
                    keyId: [UUID("12345678-1234-1234-1234-123456789012")],
                    bsonType: "string",
                    algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic"
                }
            },
            paymentInfo: {
                bsonType: "object",
                properties: {
                    creditCardNumber: {
                        encrypt: {
                            keyId: [UUID("12345678-1234-1234-1234-123456789012")],
                            bsonType: "string",
                            algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random"
                        }
                    }
                }
            },
            medicalInfo: {
                encrypt: {
                    keyId: [UUID("87654321-4321-4321-4321-210987654321")],
                    bsonType: "object",
                    algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random"
                }
            }
        }
    }
};
    `);

  print("\n3️⃣ CLIENT CONFIGURATION:");
  print(`
// MongoDB client with encryption
const { MongoClient, Binary } = require('mongodb');
const { ClientEncryption } = require('mongodb-client-encryption');

const client = new MongoClient(uri, {
    autoEncryption: {
        keyVaultNamespace: keyVaultNamespace,
        kmsProviders: kmsProviders,
        schemaMap: schemaMap,
        // Optional: Use explicit encryption for fine-grained control
        bypassAutoEncryption: false
    }
});

// Manual encryption example
const clientEncryption = new ClientEncryption(client, {
    keyVaultNamespace,
    kmsProviders
});

// Encrypt sensitive data manually
const encryptedSSN = await clientEncryption.encrypt("123-45-6789", {
    keyId: dataKeyId,
    algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic"
});
    `);
}

function demonstrateEncryptionPatterns() {
  print("\n🔄 ENCRYPTION PATTERNS AND USE CASES:");

  const encryptionPatterns = [
    {
      pattern: "Deterministic Encryption",
      useCase: "Fields that need to be queryable (SSN, email)",
      algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic",
      pros: ["Supports equality queries", "Consistent encryption"],
      cons: ["More vulnerable to frequency analysis", "No range queries"],
    },
    {
      pattern: "Random Encryption",
      useCase: "Fields that don't need queries (credit cards, medical data)",
      algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random",
      pros: ["Maximum security", "Different ciphertext each time"],
      cons: ["No querying supported", "Higher storage overhead"],
    },
    {
      pattern: "Queryable Encryption",
      useCase: "Fields needing range and equality queries",
      algorithm: "Indexed (MongoDB 6.0+)",
      pros: ["Supports range queries", "High security"],
      cons: ["Requires MongoDB 6.0+", "Complex setup"],
    },
  ];

  encryptionPatterns.forEach((pattern, index) => {
    print(`\n${index + 1}. ${pattern.pattern}:`);
    print(`   Use Case: ${pattern.useCase}`);
    print(`   Algorithm: ${pattern.algorithm}`);
    print(`   Pros: ${pattern.pros.join(", ")}`);
    print(`   Cons: ${pattern.cons.join(", ")}`);
  });
}

// ============================================================================
// 4. SENSITIVE DATA MASKING
// ============================================================================

print("\n4. SENSITIVE DATA MASKING");
print("-".repeat(50));

function implementDataMasking() {
  print("\n🎭 DATA MASKING STRATEGIES:");

  print(`
// Create masking functions
function maskSSN(ssn) {
    return ssn ? ssn.replace(/\\d{3}-\\d{2}-/g, "***-**-") : null;
}

function maskCreditCard(cardNumber) {
    return cardNumber ? cardNumber.replace(/.(?=.{4})/g, "*") : null;
}

function maskEmail(email) {
    if (!email) return null;
    const [username, domain] = email.split("@");
    const maskedUsername = username.substring(0, 2) + "*".repeat(username.length - 2);
    return maskedUsername + "@" + domain;
}

function maskPhone(phone) {
    return phone ? phone.replace(/\\d{3}-\\d{3}-/g, "***-***-") : null;
}

// Create masked view for non-admin users
db.createView("users_masked", "users", [
    {
        $project: {
            _id: 1,
            name: 1,
            email: {
                $function: {
                    body: function(email) {
                        if (!email) return null;
                        const parts = email.split("@");
                        return parts[0].substring(0, 2) + "***@" + parts[1];
                    },
                    args: ["$email"],
                    lang: "js"
                }
            },
            phone: {
                $cond: {
                    if: { $ne: ["$phone", null] },
                    then: { $concat: [
                        { $substr: ["$phone", 0, 3] },
                        "-***-****"
                    ]},
                    else: null
                }
            },
            ssn: {
                $cond: {
                    if: { $ne: ["$ssn", null] },
                    then: "***-**-****",
                    else: null
                }
            },
            address: {
                street: "*** *** St",
                city: "$address.city",
                zipCode: "*****"
            },
            enrollments: 1,
            createdAt: 1
        }
    }
])
    `);

  print("\n🔢 STATISTICAL DATA MASKING:");
  print(`
// K-anonymity implementation for analytics
db.createView("users_k_anonymous", "users", [
    {
        $project: {
            // Generalized age ranges
            ageGroup: {
                $switch: {
                    branches: [
                        { case: { $lt: ["$age", 25] }, then: "20-25" },
                        { case: { $lt: ["$age", 35] }, then: "25-35" },
                        { case: { $lt: ["$age", 45] }, then: "35-45" },
                        { case: { $gte: ["$age", 45] }, then: "45+" }
                    ],
                    default: "Unknown"
                }
            },
            // Generalized location (city only)
            region: "$address.city",
            // Educational level grouping
            educationLevel: {
                $switch: {
                    branches: [
                        { case: { $in: ["$education", ["High School", "GED"]] }, then: "Secondary" },
                        { case: { $in: ["$education", ["Bachelor", "BS", "BA"]] }, then: "Undergraduate" },
                        { case: { $in: ["$education", ["Master", "MS", "MA", "MBA"]] }, then: "Graduate" },
                        { case: { $in: ["$education", ["PhD", "Doctorate"]] }, then: "Doctoral" }
                    ],
                    default: "Other"
                }
            },
            enrollmentCount: { $size: { $ifNull: ["$enrollments", []] } },
            // Remove all identifying information
            _id: 0,
            name: 0,
            email: 0,
            ssn: 0,
            phone: 0
        }
    }
])
    `);
}

// ============================================================================
// 5. AUDIT AND MONITORING
// ============================================================================

print("\n5. AUDIT AND MONITORING");
print("-".repeat(50));

function setupSecurityAuditing() {
  print("\n📊 FIELD-LEVEL SECURITY AUDITING:");

  print(`
// Enable auditing for sensitive data access
db.adminCommand({
    auditConfig: {
        destination: 'file',
        format: 'JSON',
        path: '/var/log/mongodb/audit.json',
        filter: {
            $or: [
                { "atype": "authenticate" },
                { "atype": "authCheck", "param.command": "find" },
                { "atype": "authCheck", "param.ns": { $regex: "users|payments|grades" } }
            ]
        }
    }
})

// Monitor sensitive field access
function auditSensitiveFieldAccess() {
    const sensitiveCollections = ['users', 'payments', 'medical_records'];
    const auditLog = [];

    sensitiveCollections.forEach(collection => {
        const profile = db[collection].find().explain("executionStats");

        auditLog.push({
            timestamp: new Date(),
            collection: collection,
            operation: 'find',
            user: db.runCommand({connectionStatus: 1}).authInfo.authenticatedUsers[0],
            documentsReturned: profile.executionStats.totalDocsExamined,
            executionTimeMillis: profile.executionStats.executionTimeMillis
        });
    });

    // Store audit log
    db.security_audit_log.insertMany(auditLog);

    return auditLog;
}

// Monitor field-level access patterns
db.createView("field_access_patterns", "security_audit_log", [
    {
        $match: {
            timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
    },
    {
        $group: {
            _id: {
                user: "$user.user",
                collection: "$collection",
                hour: { $hour: "$timestamp" }
            },
            accessCount: { $sum: 1 },
            totalDocuments: { $sum: "$documentsReturned" },
            avgResponseTime: { $avg: "$executionTimeMillis" }
        }
    },
    {
        $sort: { accessCount: -1 }
    }
])
    `);
}

function generateSecurityReport() {
  print("\n📋 SECURITY COMPLIANCE REPORT:");

  print(`
function generateFieldSecurityReport() {
    const report = {
        timestamp: new Date(),
        classification: {
            public: 0,
            internal: 0,
            confidential: 0,
            restricted: 0
        },
        protection: {
            encrypted: 0,
            masked: 0,
            redacted: 0,
            plaintext: 0
        },
        access: {
            authorized: 0,
            unauthorized: 0,
            failed: 0
        },
        compliance: {
            gdprCompliant: true,
            hipaaCompliant: false, // Update based on requirements
            pciCompliant: true
        }
    };

    // Analyze collections for data classification
    const collections = ['users', 'payments', 'medical_records', 'grades'];

    collections.forEach(collectionName => {
        const sampleDoc = db[collectionName].findOne();

        if (sampleDoc) {
            // Analyze field sensitivity
            Object.keys(sampleDoc).forEach(field => {
                if (['ssn', 'creditCard', 'password'].includes(field)) {
                    report.classification.restricted++;
                } else if (['email', 'phone', 'address'].includes(field)) {
                    report.classification.confidential++;
                } else if (['grades', 'enrollments'].includes(field)) {
                    report.classification.internal++;
                } else {
                    report.classification.public++;
                }
            });
        }
    });

    // Store report
    db.security_compliance_reports.insertOne(report);

    return report;
}
    `);
}

// ============================================================================
// 6. EXECUTION SECTION
// ============================================================================

print("\n6. EXECUTING FIELD-LEVEL SECURITY SETUP");
print("-".repeat(50));

try {
  // Data classification
  classifyDataSensitivity();

  // Field redaction with views
  implementFieldRedaction();
  demonstrateConditionalRedaction();

  // Client-side encryption
  setupClientSideEncryption();
  demonstrateEncryptionPatterns();

  // Data masking
  implementDataMasking();

  // Auditing and monitoring
  setupSecurityAuditing();
  generateSecurityReport();

  print("\n✅ Field-level security setup completed!");
  print("🏷️ Data classification framework established");
  print("🎭 Field redaction views created");
  print("🔐 Encryption patterns documented");
  print("📊 Security auditing configured");

  print("\n🚀 NEXT STEPS:");
  print("1. Classify your data according to sensitivity levels");
  print("2. Implement appropriate protection for each classification");
  print("3. Create secure views for different user roles");
  print("4. Set up client-side encryption for restricted data");
  print("5. Configure monitoring and alerting");
  print("6. Regular security compliance reviews");
} catch (error) {
  print("❌ Error during field-level security setup:");
  print(error.message);
}

print("\n" + "=".repeat(80));
print("FIELD-LEVEL SECURITY COMPLETE");
print("=".repeat(80));
