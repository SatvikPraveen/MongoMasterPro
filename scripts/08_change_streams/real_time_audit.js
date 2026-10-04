// File: scripts/08_change_streams/real_time_audit.js
// MongoDB Real-time Audit Trail - Change Streams for Data Monitoring

/**
 * REAL-TIME AUDIT TRAIL
 * =====================
 * Comprehensive audit trail implementation using MongoDB Change Streams.
 * Tracks data modifications, user activities, and system events in real-time.
 */

// Database connections
const db = db.getSiblingDB("mmp_change_streams");
const auditDB = db.getSiblingDB("mmp_audit");

print("\n" + "=".repeat(80));
print("MONGODB REAL-TIME AUDIT TRAIL");
print("=".repeat(80));

// ============================================================================
// 1. AUDIT INFRASTRUCTURE SETUP
// ============================================================================

print("\n1. AUDIT INFRASTRUCTURE SETUP");
print("-".repeat(50));

/**
 * Initialize audit collections and indexes
 */
function initializeAuditInfrastructure() {
  print("\n🔧 INITIALIZING AUDIT INFRASTRUCTURE:");

  // Create audit collections
  const auditCollections = [
    {
      name: "user_activities",
      description: "User login, logout, profile changes",
      indexes: [
        { userId: 1, timestamp: -1 },
        { actionType: 1, timestamp: -1 },
        { timestamp: -1 },
      ],
    },
    {
      name: "data_modifications",
      description: "CRUD operations on business data",
      indexes: [
        { collection: 1, documentId: 1, timestamp: -1 },
        { operationType: 1, timestamp: -1 },
        { userId: 1, timestamp: -1 },
      ],
    },
    {
      name: "security_events",
      description: "Authentication failures, permission changes",
      indexes: [
        { eventType: 1, timestamp: -1 },
        { severity: 1, timestamp: -1 },
        { userId: 1, timestamp: -1 },
      ],
    },
    {
      name: "system_events",
      description: "Configuration changes, system alerts",
      indexes: [
        { component: 1, timestamp: -1 },
        { severity: 1, timestamp: -1 },
      ],
    },
  ];

  auditCollections.forEach((collection) => {
    print(`\n📋 Setting up ${collection.name}:`);
    print(`   Purpose: ${collection.description}`);

    try {
      // Create collection if it doesn't exist
      // createCollection on an existing name throws on MongoDB 6.0 (7.0+ tolerates
      // identical options); make the setup idempotent explicitly.
      if (!auditDB.getCollectionNames().includes(collection.name)) {
        auditDB.createCollection(collection.name);
      }

      // Create indexes
      collection.indexes.forEach((indexSpec) => {
        auditDB[collection.name].createIndex(indexSpec);
        print(`   ✅ Created index: ${JSON.stringify(indexSpec)}`);
      });

      print(`   ✅ Collection ${collection.name} ready`);
    } catch (error) {
      print(`   ❌ Error setting up ${collection.name}: ${error.message}`);
    }
  });
}

/**
 * Create audit metadata collection
 */
function setupAuditMetadata() {
  print("\n📊 AUDIT METADATA SETUP:");

  try {
    // Audit configuration
    const auditConfig = {
      _id: "audit_config",
      enabled: true,
      retentionDays: 365,
      realTimeProcessing: true,
      alertThresholds: {
        failedLogins: 5,
        dataModifications: 1000,
        securityEvents: 10,
      },
      excludedCollections: ["sessions", "logs"],
      includedOperations: ["insert", "update", "delete", "replace"],
    };

    auditDB.audit_config.replaceOne({ _id: "audit_config" }, auditConfig, {
      upsert: true,
    });

    print("✅ Audit configuration saved");
    print(`   Retention: ${auditConfig.retentionDays} days`);
    print(`   Real-time: ${auditConfig.realTimeProcessing}`);

    // Initialize audit statistics
    const auditStats = {
      _id: "audit_stats",
      totalEvents: 0,
      eventsByType: {},
      lastProcessed: new Date(),
      alertsGenerated: 0,
    };

    auditDB.audit_stats.replaceOne({ _id: "audit_stats" }, auditStats, {
      upsert: true,
    });

    print("✅ Audit statistics initialized");
  } catch (error) {
    print(`❌ Error setting up audit metadata: ${error.message}`);
  }
}

// ============================================================================
// 2. CHANGE STREAMS FOR DATA AUDITING
// ============================================================================

print("\n2. CHANGE STREAMS FOR DATA AUDITING");
print("-".repeat(50));

/**
 * Setup change streams for comprehensive data auditing
 */
function setupDataAuditStreams() {
  print("\n🌊 DATA AUDIT CHANGE STREAMS:");

  // Collections to monitor
  const monitoredCollections = [
    {
      name: "users",
      sensitive: true,
      auditLevel: "detailed",
      watchFor: ["insert", "update", "delete", "replace"],
    },
    {
      name: "courses",
      sensitive: false,
      auditLevel: "basic",
      watchFor: ["insert", "update", "delete"],
    },
    {
      name: "enrollments",
      sensitive: true,
      auditLevel: "detailed",
      watchFor: ["insert", "update", "delete"],
    },
    {
      name: "grades",
      sensitive: true,
      auditLevel: "detailed",
      watchFor: ["insert", "update", "delete", "replace"],
    },
  ];

  monitoredCollections.forEach((collectionConfig) => {
    print(`\n📹 Setting up change stream for ${collectionConfig.name}:`);
    print(`   Sensitivity: ${collectionConfig.sensitive ? "HIGH" : "NORMAL"}`);
    print(`   Audit Level: ${collectionConfig.auditLevel}`);
    print(`   Operations: ${collectionConfig.watchFor.join(", ")}`);

    // Change stream pipeline
    const pipeline = [
      {
        $match: {
          operationType: { $in: collectionConfig.watchFor },
        },
      },
    ];

    print(`   Pipeline: ${JSON.stringify(pipeline, null, 2)}`);
    print("   💡 Use this code to start monitoring:");
    print(`
const ${collectionConfig.name}Stream = db.${
      collectionConfig.name
    }.watch(${JSON.stringify(pipeline)});
${collectionConfig.name}Stream.forEach(change => {
    processDataChange('${collectionConfig.name}', change, '${
      collectionConfig.auditLevel
    }');
});`);
  });
}

/**
 * Data change processing function
 */
function demonstrateDataChangeProcessing() {
  print("\n🔄 DATA CHANGE PROCESSING LOGIC:");

  print(`
function processDataChange(collectionName, change, auditLevel) {
    const auditRecord = {
        timestamp: new Date(),
        collection: collectionName,
        operationType: change.operationType,
        documentId: change.documentKey._id,
        userId: getCurrentUserId(), // Extract from session
        ipAddress: getClientIP(),   // Extract from connection
        userAgent: getUserAgent(),  // Extract from session
        auditLevel: auditLevel
    };

    // Include different data based on audit level
    if (auditLevel === 'detailed') {
        auditRecord.beforeImage = change.fullDocumentBeforeChange;
        auditRecord.afterImage = change.fullDocument;
        auditRecord.updateDescription = change.updateDescription;
    } else {
        auditRecord.modifiedFields = change.updateDescription?.updatedFields ?
            Object.keys(change.updateDescription.updatedFields) : [];
    }

    // Store audit record
    db.getSiblingDB('lms_audit').data_modifications.insertOne(auditRecord);

    // Check for sensitive data changes
    if (isSensitiveChange(collectionName, change)) {
        generateSecurityAlert(auditRecord);
    }

    // Update audit statistics
    updateAuditStatistics(change.operationType);
}
    `);

  print("🔍 Key Features:");
  print("   • Captures operation type and timing");
  print("   • Records user context (session, IP)");
  print("   • Configurable detail levels");
  print("   • Automatic security alerting");
  print("   • Real-time statistics updates");
}

// ============================================================================
// 3. USER ACTIVITY AUDITING
// ============================================================================

print("\n3. USER ACTIVITY AUDITING");
print("-".repeat(50));

/**
 * Comprehensive user activity tracking
 */
function setupUserActivityAuditing() {
  print("\n👤 USER ACTIVITY AUDITING:");

  const userActivities = [
    {
      event: "user_login",
      trigger: "Authentication success",
      data: ["userId", "loginTime", "ipAddress", "userAgent", "sessionId"],
      severity: "info",
    },
    {
      event: "user_logout",
      trigger: "Session termination",
      data: ["userId", "logoutTime", "sessionDuration"],
      severity: "info",
    },
    {
      event: "profile_update",
      trigger: "User profile changes",
      data: ["userId", "changedFields", "oldValues", "newValues"],
      severity: "info",
    },
    {
      event: "password_change",
      trigger: "Password modification",
      data: ["userId", "changeTime", "ipAddress", "methodUsed"],
      severity: "warning",
    },
    {
      event: "failed_login",
      trigger: "Authentication failure",
      data: ["attemptedUser", "ipAddress", "failureReason", "attemptCount"],
      severity: "error",
    },
    {
      event: "course_enrollment",
      trigger: "User enrolls in course",
      data: ["userId", "courseId", "enrollmentTime", "paymentStatus"],
      severity: "info",
    },
    {
      event: "grade_submission",
      trigger: "Assignment submitted",
      data: ["userId", "assignmentId", "submissionTime", "fileCount"],
      severity: "info",
    },
  ];

  userActivities.forEach((activity) => {
    print(`\n📝 ${activity.event.toUpperCase()}:`);
    print(`   Trigger: ${activity.trigger}`);
    print(`   Severity: ${activity.severity}`);
    print(`   Data Captured: ${activity.data.join(", ")}`);

    // Sample audit function
    print(`   Implementation:`);
    print(`   function audit${activity.event
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("")}(data) {
       auditDB.user_activities.insertOne({
           eventType: '${activity.event}',
           severity: '${activity.severity}',
           timestamp: new Date(),
           userId: data.userId,
           details: data,
           ipAddress: data.ipAddress,
           userAgent: data.userAgent
       });
   }`);
  });
}

/**
 * User behavior analytics from audit data
 */
function demonstrateUserBehaviorAnalytics() {
  print("\n📊 USER BEHAVIOR ANALYTICS:");

  const analyticsQueries = [
    {
      name: "Login Frequency Analysis",
      query: `auditDB.user_activities.aggregate([
    { $match: { eventType: 'user_login' } },
    { $group: {
        _id: {
            userId: '$userId',
            hour: { $hour: '$timestamp' }
        },
        loginCount: { $sum: 1 }
    }},
    { $sort: { loginCount: -1 } }
])`,
      purpose: "Identify peak usage hours per user",
    },
    {
      name: "Failed Login Monitoring",
      query: `auditDB.user_activities.aggregate([
    { $match: {
        eventType: 'failed_login',
        timestamp: { $gte: new Date(Date.now() - 24*60*60*1000) }
    }},
    { $group: {
        _id: '$details.attemptedUser',
        failedAttempts: { $sum: 1 },
        lastAttempt: { $max: '$timestamp' }
    }},
    { $match: { failedAttempts: { $gte: 3 } } }
])`,
      purpose: "Detect potential brute force attacks",
    },
    {
      name: "Course Engagement Tracking",
      query: `auditDB.user_activities.aggregate([
    { $match: {
        eventType: { $in: ['course_enrollment', 'grade_submission'] }
    }},
    { $group: {
        _id: '$userId',
        enrollments: { $sum: { $cond: [{ $eq: ['$eventType', 'course_enrollment'] }, 1, 0] } },
        submissions: { $sum: { $cond: [{ $eq: ['$eventType', 'grade_submission'] }, 1, 0] } }
    }},
    { $addFields: { engagementScore: { $divide: ['$submissions', '$enrollments'] } } }
])`,
      purpose: "Calculate user engagement scores",
    },
    {
      name: "Suspicious Activity Detection",
      query: `auditDB.user_activities.aggregate([
    { $match: {
        timestamp: { $gte: new Date(Date.now() - 60*60*1000) },
        eventType: { $in: ['user_login', 'profile_update', 'password_change'] }
    }},
    { $group: {
        _id: '$userId',
        activities: { $sum: 1 },
        uniqueIPs: { $addToSet: '$ipAddress' }
    }},
    { $match: {
        $or: [
            { activities: { $gt: 50 } },
            { $expr: { $gt: [{ $size: '$uniqueIPs' }, 3] } }
        ]
    }}
])`,
      purpose: "Detect unusual user activity patterns",
    },
  ];

  analyticsQueries.forEach((query) => {
    print(`\n🔍 ${query.name}:`);
    print(`   Purpose: ${query.purpose}`);
    print(`   Query: ${query.query}`);
  });
}

// ============================================================================
// 4. SECURITY EVENT MONITORING
// ============================================================================

print("\n4. SECURITY EVENT MONITORING");
print("-".repeat(50));

/**
 * Security event detection and alerting
 */
function setupSecurityEventMonitoring() {
  print("\n🛡️ SECURITY EVENT MONITORING:");

  const securityEvents = [
    {
      event: "unauthorized_access_attempt",
      description: "Access to restricted resources",
      triggers: ["Invalid permissions", "Role escalation attempts"],
      severity: "high",
      alertThreshold: 1,
    },
    {
      event: "privilege_escalation",
      description: "User role or permission changes",
      triggers: ["Role assignments", "Permission grants"],
      severity: "high",
      alertThreshold: 1,
    },
    {
      event: "data_exfiltration_risk",
      description: "Large data exports or unusual access",
      triggers: ["Bulk data access", "Mass downloads"],
      severity: "critical",
      alertThreshold: 1,
    },
    {
      event: "authentication_anomaly",
      description: "Unusual login patterns",
      triggers: ["Geographic anomalies", "Time-based anomalies"],
      severity: "medium",
      alertThreshold: 3,
    },
  ];

  securityEvents.forEach((event) => {
    print(`\n🚨 ${event.event.toUpperCase()}:`);
    print(`   Description: ${event.description}`);
    print(`   Severity: ${event.severity.toUpperCase()}`);
    print(`   Alert Threshold: ${event.alertThreshold}`);
    print(`   Triggers: ${event.triggers.join(", ")}`);
  });

  print("\n🔧 Security Event Processing:");
  print(`
function processSecurityEvent(eventType, details) {
    const securityEvent = {
        eventType: eventType,
        timestamp: new Date(),
        severity: getSeverityLevel(eventType),
        userId: details.userId,
        ipAddress: details.ipAddress,
        details: details,
        investigated: false,
        falsePositive: false
    };

    // Store security event
    auditDB.security_events.insertOne(securityEvent);

    // Generate real-time alert if needed
    if (shouldGenerateAlert(eventType, details)) {
        generateSecurityAlert(securityEvent);
    }

    // Update security metrics
    updateSecurityMetrics(eventType);
}
    `);
}

/**
 * Real-time security alerting system
 */
function setupSecurityAlertSystem() {
  print("\n🚨 REAL-TIME SECURITY ALERTING:");

  print("Alert Configuration:");
  const alertConfig = {
    _id: "security_alerts",
    enabled: true,
    channels: ["email", "webhook", "database"],
    thresholds: {
      failed_logins: { count: 5, window: "5m" },
      unauthorized_access: { count: 1, window: "1m" },
      privilege_escalation: { count: 1, window: "1m" },
      data_anomaly: { count: 3, window: "10m" },
    },
    recipients: ["security@company.com", "admin@company.com"],
    webhookUrl: "https://hooks.slack.com/security-alerts",
  };

  print(JSON.stringify(alertConfig, null, 2));

  print("\n📧 Alert Generation Logic:");
  print(`
function generateSecurityAlert(securityEvent) {
    const alert = {
        alertId: new ObjectId(),
        timestamp: new Date(),
        eventType: securityEvent.eventType,
        severity: securityEvent.severity,
        message: formatAlertMessage(securityEvent),
        userId: securityEvent.userId,
        ipAddress: securityEvent.ipAddress,
        status: 'active',
        acknowledged: false
    };

    // Store alert
    auditDB.security_alerts.insertOne(alert);

    // Send notifications
    if (alert.severity === 'critical') {
        sendEmailAlert(alert);
        sendWebhookAlert(alert);
    }

    return alert.alertId;
}
    `);
}

// ============================================================================
// 5. AUDIT REPORTING AND ANALYTICS
// ============================================================================

print("\n5. AUDIT REPORTING AND ANALYTICS");
print("-".repeat(50));

/**
 * Generate comprehensive audit reports
 */
function generateAuditReports() {
  print("\n📊 AUDIT REPORTING SYSTEM:");

  const reportTypes = [
    {
      name: "Daily Activity Summary",
      frequency: "daily",
      content: [
        "Total events",
        "Top users by activity",
        "Security events",
        "Failed operations",
      ],
      query: `auditDB.data_modifications.aggregate([
    { $match: { timestamp: { $gte: startOfDay, $lt: endOfDay } } },
    { $group: {
        _id: '$operationType',
        count: { $sum: 1 },
        users: { $addToSet: '$userId' }
    }},
    { $addFields: { uniqueUsers: { $size: '$users' } } }
])`,
    },
    {
      name: "User Behavior Analysis",
      frequency: "weekly",
      content: [
        "Login patterns",
        "Activity trends",
        "Anomaly detection",
        "Engagement metrics",
      ],
      query: `auditDB.user_activities.aggregate([
    { $match: { timestamp: { $gte: weekStart, $lt: weekEnd } } },
    { $group: {
        _id: { userId: '$userId', day: { $dayOfWeek: '$timestamp' } },
        activities: { $sum: 1 },
        firstActivity: { $min: '$timestamp' },
        lastActivity: { $max: '$timestamp' }
    }}
])`,
    },
    {
      name: "Security Incident Report",
      frequency: "monthly",
      content: [
        "Security events",
        "Threat analysis",
        "Compliance status",
        "Remediation actions",
      ],
      query: `auditDB.security_events.aggregate([
    { $match: { timestamp: { $gte: monthStart, $lt: monthEnd } } },
    { $group: {
        _id: { eventType: '$eventType', severity: '$severity' },
        count: { $sum: 1 },
        investigated: { $sum: { $cond: ['$investigated', 1, 0] } }
    }}
])`,
    },
  ];

  reportTypes.forEach((report) => {
    print(`\n📋 ${report.name}:`);
    print(`   Frequency: ${report.frequency}`);
    print(`   Content: ${report.content.join(", ")}`);
    print(`   Sample Query: ${report.query}`);
  });
}

/**
 * Audit data retention and archiving
 */
function setupAuditRetention() {
  print("\n🗄️ AUDIT DATA RETENTION:");

  print("Retention Policy Configuration:");
  const retentionPolicies = [
    {
      collection: "user_activities",
      retentionDays: 365,
      archiveAfter: 90,
      compressionLevel: "standard",
    },
    {
      collection: "data_modifications",
      retentionDays: 2555, // 7 years for compliance
      archiveAfter: 365,
      compressionLevel: "high",
    },
    {
      collection: "security_events",
      retentionDays: 2555, // 7 years for compliance
      archiveAfter: 180,
      compressionLevel: "high",
    },
    {
      collection: "system_events",
      retentionDays: 180,
      archiveAfter: 30,
      compressionLevel: "standard",
    },
  ];

  retentionPolicies.forEach((policy) => {
    print(`\n📅 ${policy.collection}:`);
    print(`   Retention: ${policy.retentionDays} days`);
    print(`   Archive After: ${policy.archiveAfter} days`);
    print(`   Compression: ${policy.compressionLevel}`);

    // TTL Index for automatic cleanup
    print(
      `   TTL Index: { timestamp: 1, expireAfterSeconds: ${
        policy.retentionDays * 24 * 60 * 60
      } }`
    );
  });

  print("\n🔄 Archiving Process:");
  print(`
// Monthly archiving job
function archiveOldAuditData() {
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Archive to separate collection
    const oldRecords = auditDB.user_activities.find({
        timestamp: { $lt: cutoffDate }
    });

    if (oldRecords.count() > 0) {
        auditDB.user_activities_archive.insertMany(oldRecords.toArray());
        auditDB.user_activities.deleteMany({ timestamp: { $lt: cutoffDate } });
    }
}
    `);
}

// ============================================================================
// 6. EXECUTION SECTION
// ============================================================================

print("\n6. EXECUTING AUDIT TRAIL SETUP");
print("-".repeat(50));

try {
  // Initialize audit infrastructure
  initializeAuditInfrastructure();
  setupAuditMetadata();

  // Setup change streams
  setupDataAuditStreams();
  demonstrateDataChangeProcessing();

  // User activity auditing
  setupUserActivityAuditing();
  demonstrateUserBehaviorAnalytics();

  // Security monitoring
  setupSecurityEventMonitoring();
  setupSecurityAlertSystem();

  // Reporting and retention
  generateAuditReports();
  setupAuditRetention();

  print("\n✅ Audit trail system setup completed!");
  print("💡 Change streams provide real-time monitoring");
  print("🔐 Security events are automatically detected");
  print("📊 Comprehensive reporting is available");

  // Sample usage
  print("\n🚀 NEXT STEPS:");
  print("1. Deploy change stream watchers in your application");
  print("2. Configure security alert notifications");
  print("3. Set up automated reporting schedules");
  print("4. Test audit trail with sample data changes");
} catch (error) {
  print("❌ Error during audit trail setup:");
  print(error.message);
}

print("\n" + "=".repeat(80));
print("REAL-TIME AUDIT TRAIL COMPLETE");
print("=".repeat(80));
