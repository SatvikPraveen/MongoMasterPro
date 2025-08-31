// File: scripts/09_security/authentication.js
// MongoDB Authentication - SCRAM, x.509, LDAP authentication methods

/**
 * MONGODB AUTHENTICATION
 * ======================
 * Comprehensive authentication setup and configuration.
 * Covers SCRAM-SHA-1, SCRAM-SHA-256, x.509, and LDAP authentication.
 */

// Database connections
const db = db.getSiblingDB("admin");

print("\n" + "=".repeat(80));
print("MONGODB AUTHENTICATION");
print("=".repeat(80));

// ============================================================================
// 1. AUTHENTICATION OVERVIEW AND SETUP
// ============================================================================

print("\n1. AUTHENTICATION OVERVIEW AND SETUP");
print("-".repeat(50));

/**
 * Enable authentication on MongoDB instance
 */
function enableAuthentication() {
  print("\n🔐 ENABLING MONGODB AUTHENTICATION:");

  print("Authentication Setup Steps:");
  print("1. Create admin user (if not exists)");
  print("2. Restart MongoDB with --auth flag");
  print("3. Connect with authentication credentials");
  print("4. Create application users and roles");

  print("\n📋 Configuration File Updates:");
  print("Add to mongod.conf:");
  print(`
security:
  authorization: enabled
  javascriptEnabled: true
  clusterIpSourceAllowlist:
    - "127.0.0.1"
    - "10.0.0.0/8"
    - "192.168.0.0/16"
    `);

  print("\n⚠️ IMPORTANT SECURITY NOTES:");
  print("• Always create admin user before enabling auth");
  print("• Use strong passwords with mixed characters");
  print("• Limit network access to trusted sources");
  print("• Enable SSL/TLS for production deployments");
  print("• Regularly rotate credentials");
}

/**
 * Check current authentication status
 */
function checkAuthenticationStatus() {
  print("\n📊 AUTHENTICATION STATUS CHECK:");

  try {
    const serverStatus = db.runCommand({ serverStatus: 1 });
    const authEnabled =
      serverStatus.security && serverStatus.security.authentication;

    print(`Authentication enabled: ${authEnabled ? "YES" : "NO"}`);

    if (authEnabled) {
      print(
        `Authentication mechanisms: ${serverStatus.security.authentication.mechanisms.join(
          ", "
        )}`
      );
    }

    // Check current user
    const currentUser = db.runCommand({ connectionStatus: 1 });
    if (
      currentUser.authInfo &&
      currentUser.authInfo.authenticatedUsers.length > 0
    ) {
      print("\nCurrent authenticated users:");
      currentUser.authInfo.authenticatedUsers.forEach((user) => {
        print(`  ${user.user}@${user.db}`);
      });
    } else {
      print("\nNo authenticated users (authentication may be disabled)");
    }
  } catch (error) {
    print(`Error checking authentication status: ${error.message}`);
  }
}

// ============================================================================
// 2. SCRAM AUTHENTICATION
// ============================================================================

print("\n2. SCRAM AUTHENTICATION");
print("-".repeat(50));

/**
 * Setup SCRAM-SHA-256 authentication
 */
function setupSCRAMAuthentication() {
  print("\n🔑 SCRAM AUTHENTICATION SETUP:");

  print("SCRAM (Salted Challenge Response Authentication Mechanism)");
  print("• Default authentication method in MongoDB 4.0+");
  print("• Supports SHA-1 and SHA-256 hashing");
  print("• Password-based authentication");

  // Admin user creation
  print("\n1️⃣ CREATE ADMIN USER:");
  print(`
// Create admin user with root privileges
use admin
db.createUser({
  user: "mongoAdmin",
  pwd: passwordPrompt(), // Interactive password prompt
  roles: [
    { role: "root", db: "admin" },
    { role: "userAdminAnyDatabase", db: "admin" },
    { role: "dbAdminAnyDatabase", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" }
  ],
  mechanisms: ["SCRAM-SHA-256"]
})
    `);

  print("\n2️⃣ CREATE APPLICATION USERS:");
  const appUsers = [
    {
      user: "lmsAppUser",
      database: "lms_primary",
      roles: ["readWrite"],
      description: "Main application user",
    },
    {
      user: "lmsReadOnlyUser",
      database: "lms_primary",
      roles: ["read"],
      description: "Read-only access for reports",
    },
    {
      user: "lmsBackupUser",
      database: "admin",
      roles: ["backup", "restore"],
      description: "Backup and restore operations",
    },
  ];

  appUsers.forEach((userConfig) => {
    print(`\n// ${userConfig.description}`);
    print(`use ${userConfig.database}`);
    print(`db.createUser({
  user: "${userConfig.user}",
  pwd: passwordPrompt(),
  roles: [${userConfig.roles.map((role) => `"${role}"`).join(", ")}],
  mechanisms: ["SCRAM-SHA-256"]
})`);
  });

  print("\n3️⃣ AUTHENTICATION CONNECTION:");
  print(`
// Connect with authentication
mongo "mongodb://lmsAppUser:password@localhost:27017/lms_primary?authSource=lms_primary&authMechanism=SCRAM-SHA-256"

// Or authenticate after connection
use lms_primary
db.auth("lmsAppUser", "password")
    `);
}

/**
 * Password security best practices
 */
function demonstratePasswordSecurity() {
  print("\n🛡️ PASSWORD SECURITY BEST PRACTICES:");

  const securityPractices = [
    {
      practice: "Strong Password Requirements",
      implementation: "Minimum 12 characters, mixed case, numbers, symbols",
      example: "MyStr0ng!P@ssw0rd#2024",
    },
    {
      practice: "Password Rotation",
      implementation: "Change passwords every 90 days",
      example: "Automated rotation scripts or manual updates",
    },
    {
      practice: "Password Storage",
      implementation: "Never store passwords in plain text",
      example: "Use environment variables, password managers, or vaults",
    },
    {
      practice: "Account Lockout",
      implementation: "Lock accounts after failed login attempts",
      example: "MongoDB Atlas automatic lockout after 5 failures",
    },
  ];

  securityPractices.forEach((practice, index) => {
    print(`\n${index + 1}. ${practice.practice}:`);
    print(`   Implementation: ${practice.implementation}`);
    print(`   Example: ${practice.example}`);
  });

  print("\n🔄 PASSWORD ROTATION EXAMPLE:");
  print(`
// Update user password
use admin
db.updateUser("lmsAppUser", {
  pwd: passwordPrompt(),
  mechanisms: ["SCRAM-SHA-256"]
})

// Change own password
db.changeUserPassword("lmsAppUser", passwordPrompt())
    `);
}

// ============================================================================
// 3. X.509 CERTIFICATE AUTHENTICATION
// ============================================================================

print("\n3. X.509 CERTIFICATE AUTHENTICATION");
print("-".repeat(50));

/**
 * Setup x.509 certificate authentication
 */
function setupX509Authentication() {
  print("\n📜 X.509 CERTIFICATE AUTHENTICATION:");

  print("X.509 Certificate Authentication Benefits:");
  print("• Strong cryptographic authentication");
  print("• No password transmission over network");
  print("• Certificate-based user identification");
  print("• Perfect for service-to-service communication");

  print("\n1️⃣ CERTIFICATE AUTHORITY SETUP:");
  print(`
# Create Certificate Authority (CA)
openssl genrsa -out ca-key.pem 4096
openssl req -new -x509 -days 3650 -key ca-key.pem -out ca.pem \\
    -subj "/C=US/ST=CA/L=San Francisco/O=MongoDB/OU=IT/CN=MongoDB CA"
    `);

  print("\n2️⃣ SERVER CERTIFICATE:");
  print(`
# Generate server private key
openssl genrsa -out server-key.pem 4096

# Generate server certificate signing request
openssl req -new -key server-key.pem -out server.csr \\
    -subj "/C=US/ST=CA/L=San Francisco/O=MongoDB/OU=IT/CN=mongodb.example.com"

# Sign server certificate
openssl x509 -req -in server.csr -CA ca.pem -CAkey ca-key.pem \\
    -CAcreateserial -out server.pem -days 365

# Combine server certificate and key
cat server-key.pem server.pem > server-combined.pem
    `);

  print("\n3️⃣ CLIENT CERTIFICATE:");
  print(`
# Generate client private key
openssl genrsa -out client-key.pem 4096

# Generate client certificate signing request
openssl req -new -key client-key.pem -out client.csr \\
    -subj "/C=US/ST=CA/L=San Francisco/O=MongoDB/OU=IT/CN=lmsAppClient"

# Sign client certificate
openssl x509 -req -in client.csr -CA ca.pem -CAkey ca-key.pem \\
    -CAcreateserial -out client.pem -days 365

# Combine client certificate and key
cat client-key.pem client.pem > client-combined.pem
    `);

  print("\n4️⃣ MONGODB CONFIGURATION:");
  print(`
# mongod.conf
net:
  ssl:
    mode: requireSSL
    PEMKeyFile: /path/to/server-combined.pem
    CAFile: /path/to/ca.pem
    allowConnectionsWithoutCertificates: false
    allowInvalidHostnames: false

security:
  authorization: enabled
  clusterAuthMode: x509
    `);

  print("\n5️⃣ CREATE X.509 USER:");
  print(`
// Extract subject from client certificate
openssl x509 -in client.pem -inform PEM -subject -nameopt RFC2253 -noout

// Create user based on certificate subject
use admin
db.createUser({
    user: "C=US,ST=CA,L=San Francisco,O=MongoDB,OU=IT,CN=lmsAppClient",
    roles: [
        { role: "readWrite", db: "lms_primary" }
    ]
})
    `);

  print("\n6️⃣ CLIENT CONNECTION:");
  print(`
// Connect using certificate
mongo --ssl --sslPEMKeyFile client-combined.pem --sslCAFile ca.pem \\
      --authenticationMechanism MONGODB-X509 \\
      --authenticationDatabase '$external' \\
      mongodb://mongodb.example.com:27017/lms_primary
    `);
}

// ============================================================================
// 4. LDAP AUTHENTICATION
// ============================================================================

print("\n4. LDAP AUTHENTICATION");
print("-".repeat(50));

/**
 * Setup LDAP authentication
 */
function setupLDAPAuthentication() {
  print("\n🏢 LDAP AUTHENTICATION SETUP:");

  print("LDAP Authentication Benefits:");
  print("• Centralized user management");
  print("• Integration with existing directory services");
  print("• Single sign-on (SSO) capabilities");
  print("• Enterprise-grade user provisioning");

  print("\n⚠️ NOTE: LDAP authentication requires MongoDB Enterprise");

  print("\n1️⃣ MONGODB CONFIGURATION:");
  print(`
# mongod.conf for LDAP
security:
  authorization: enabled
  ldap:
    servers: "ldap.example.com:389"
    bind:
      method: "simple"
      saslMechanisms: "PLAIN"
      queryUser: "cn=mongodbapp,ou=applications,dc=example,dc=com"
      queryPassword: "ldap_query_password"
    transportSecurity: "none"  # Use "tls" for secure connections
    userToDNMapping:
      - match: "(.+)"
        substitution: "cn={0},ou=users,dc=example,dc=com"
    authz:
      queryTemplate: "(&(objectClass=person)(uid={USER}))"
    `);

  print("\n2️⃣ LDAP USER MAPPING:");
  print(`
// Create external user for LDAP authentication
use admin
db.createUser({
    user: "john.doe@example.com",
    roles: [
        { role: "readWrite", db: "lms_primary" }
    ]
})

// Or use LDAP groups for role mapping
db.createRole({
    role: "lmsUsers",
    privileges: [
        { resource: { db: "lms_primary", collection: "" }, actions: ["find", "insert", "update"] }
    ],
    roles: []
})
    `);

  print("\n3️⃣ LDAP CONNECTION:");
  print(`
// Connect using LDAP credentials
mongo --authenticationMechanism PLAIN \\
      --authenticationDatabase '$external' \\
      --username "john.doe@example.com" \\
      --password "ldap_user_password" \\
      mongodb://mongodb.example.com:27017/lms_primary
    `);

  print("\n4️⃣ LDAP TROUBLESHOOTING:");
  const troubleshooting = [
    "Check LDAP server connectivity",
    "Verify user DN format and mapping",
    "Test LDAP bind credentials",
    "Review MongoDB logs for LDAP errors",
    "Validate LDAP query templates",
  ];

  troubleshooting.forEach((item, index) => {
    print(`   ${index + 1}. ${item}`);
  });
}

// ============================================================================
// 5. AUTHENTICATION MONITORING
// ============================================================================

print("\n5. AUTHENTICATION MONITORING");
print("-".repeat(50));

/**
 * Setup authentication monitoring and auditing
 */
function setupAuthenticationMonitoring() {
  print("\n📊 AUTHENTICATION MONITORING:");

  print("Key Authentication Metrics to Monitor:");
  const monitoringMetrics = [
    {
      metric: "Failed Login Attempts",
      query: "db.adminCommand({ getLog: 'global' })",
      alert: "More than 10 failures per minute",
      action: "Lock account, investigate source",
    },
    {
      metric: "Successful Authentications",
      query: "connectionStatus command logs",
      alert: "Unusual login times or locations",
      action: "Verify legitimate access",
    },
    {
      metric: "Privilege Escalations",
      query: "User role change logs",
      alert: "Unexpected role assignments",
      action: "Review and validate changes",
    },
    {
      metric: "Account Lockouts",
      query: "Authentication failure logs",
      alert: "Excessive lockout events",
      action: "Investigate brute force attempts",
    },
  ];

  monitoringMetrics.forEach((metric, index) => {
    print(`\n${index + 1}. ${metric.metric}:`);
    print(`   Query: ${metric.query}`);
    print(`   Alert: ${metric.alert}`);
    print(`   Action: ${metric.action}`);
  });

  print("\n🔍 AUTHENTICATION AUDIT QUERIES:");
  print(`
// Check current user sessions
db.runCommand({ currentOp: 1, $all: true })

// View authentication events (requires profiling)
db.system.profile.find({
    "command.authenticate": { $exists: true }
}).sort({ ts: -1 })

// Monitor failed authentication attempts
db.adminCommand({ getLog: "global" }).log.forEach(function(line) {
    if (line.match(/Authentication failed/)) {
        print(line);
    }
})
    `);
}

/**
 * Security incident response procedures
 */
function setupIncidentResponse() {
  print("\n🚨 SECURITY INCIDENT RESPONSE:");

  const incidentTypes = [
    {
      incident: "Brute Force Attack",
      detection: "Multiple failed login attempts from same IP",
      response: [
        "Block source IP at firewall level",
        "Lock affected user accounts",
        "Review access logs for patterns",
        "Strengthen password policies",
      ],
    },
    {
      incident: "Compromised Credentials",
      detection: "Unusual access patterns or unauthorized data access",
      response: [
        "Immediately reset compromised passwords",
        "Revoke active sessions",
        "Review audit logs for data access",
        "Notify affected users/stakeholders",
      ],
    },
    {
      incident: "Privilege Escalation",
      detection: "Unauthorized role changes or elevated access",
      response: [
        "Revoke elevated privileges",
        "Audit recent user activities",
        "Review role assignment procedures",
        "Strengthen approval processes",
      ],
    },
  ];

  incidentTypes.forEach((incident, index) => {
    print(`\n${index + 1}. ${incident.incident}:`);
    print(`   Detection: ${incident.detection}`);
    print(`   Response Actions:`);
    incident.response.forEach((action, actionIndex) => {
      print(`      ${actionIndex + 1}. ${action}`);
    });
  });

  print("\n📋 INCIDENT RESPONSE CHECKLIST:");
  print("□ Identify and contain the security incident");
  print("□ Preserve evidence and audit logs");
  print("□ Assess scope of compromise");
  print("□ Reset affected credentials");
  print("□ Review and strengthen security controls");
  print("□ Document incident and lessons learned");
  print("□ Update security procedures as needed");
}

// ============================================================================
// 6. EXECUTION SECTION
// ============================================================================

print("\n6. EXECUTING AUTHENTICATION SETUP");
print("-".repeat(50));

try {
  // Check current authentication status
  checkAuthenticationStatus();

  // Authentication setup guidance
  enableAuthentication();

  // SCRAM authentication
  setupSCRAMAuthentication();
  demonstratePasswordSecurity();

  // X.509 certificate authentication
  setupX509Authentication();

  // LDAP authentication (Enterprise)
  setupLDAPAuthentication();

  // Monitoring and incident response
  setupAuthenticationMonitoring();
  setupIncidentResponse();

  print("\n✅ Authentication setup guidance completed!");
  print("🔐 Multiple authentication methods available");
  print("📊 Monitoring procedures established");
  print("🚨 Incident response procedures defined");

  print("\n🚀 NEXT STEPS:");
  print("1. Choose appropriate authentication method");
  print("2. Create admin user before enabling auth");
  print("3. Set up application-specific users");
  print("4. Configure monitoring and alerting");
  print("5. Test authentication in development environment");
  print("6. Document authentication procedures");
} catch (error) {
  print("❌ Error during authentication setup:");
  print(error.message);
}

print("\n" + "=".repeat(80));
print("AUTHENTICATION COMPLETE");
print("=".repeat(80));
