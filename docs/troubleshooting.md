# MongoMasterPro Troubleshooting Guide

**Location:** `docs/troubleshooting.md`

## Quick Diagnosis Commands

```bash
# Check Docker status
docker ps
docker-compose ps

# Check MongoDB logs
docker logs mongomaster_mongo_1
docker logs mongomaster_mongo_2
docker logs mongomaster_mongo_3

# Test MongoDB connection
mongo --host localhost:27017 --eval "db.runCommand('hello')"

# Check replica set status
mongo --host localhost:27017 --eval "rs.status()"
```

## Common Issues & Solutions

### 1. Docker Environment Issues

#### Problem: Docker containers won't start

**Error Messages:**

```
Error starting userland proxy: listen tcp 0.0.0.0:27017: bind: address already in use
Cannot start service mongo: driver failed programming external connectivity
```

**Solution:**

```bash
# Stop any running MongoDB processes
sudo systemctl stop mongod
pkill mongod

# Kill processes using MongoDB ports
sudo lsof -ti:27017 | xargs sudo kill -9
sudo lsof -ti:27018 | xargs sudo kill -9
sudo lsof -ti:27019 | xargs sudo kill -9

# Restart Docker services
docker-compose down -v
docker-compose up -d
```

#### Problem: Docker compose file not found

**Error:** `docker-compose.yml not found`

**Solution:**

```bash
# Ensure you're in the project root
cd /path/to/MongoMasterPro
ls -la docker-compose.yml

# If file is missing, use the replica set version
cp docker/docker-compose.rs.yml docker-compose.yml
```

#### Problem: Permission denied errors

**Error:** `Permission denied` when accessing Docker

**Solution:**

```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER
newgrp docker

# On macOS/Windows, restart Docker Desktop
```

### 2. MongoDB Connection Issues

#### Problem: Connection timeout or refused

**Error Messages:**

```
MongoNetworkError: failed to connect to server
connection attempt failed: SocketException
```

**Diagnosis:**

```bash
# Check if MongoDB is listening
netstat -tlnp | grep :27017

# Test basic connectivity
telnet localhost 27017

# Check Docker network
docker network ls
docker network inspect mongomaster_default
```

**Solution:**

```bash
# Restart MongoDB containers
docker-compose restart mongo1 mongo2 mongo3

# Check container health
docker exec -it mongomaster_mongo1_1 mongo --eval "db.runCommand('ping')"

# Verify replica set initialization
docker exec -it mongomaster_mongo1_1 mongo --eval "rs.status().ok"
```

#### Problem: Replica set not initialized

**Error:** `not master and slaveOk=false`

**Solution:**

```bash
# Connect to primary and initialize replica set
docker exec -it mongomaster_mongo1_1 mongo

# In mongo shell:
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27017" },
    { _id: 1, host: "mongo2:27017" },
    { _id: 2, host: "mongo3:27017" }
  ]
})

# Wait for initialization and check status
rs.status()
```

### 3. Data Loading Issues

#### Problem: Bootstrap script fails

**Error:** `Cannot read property of undefined`

**Solution:**

```bash
# Check if databases exist
docker exec -it mongomaster_mongo1_1 mongo --eval "show dbs"

# Run bootstrap script with verbose output
docker exec -it mongomaster_mongo1_1 mongo /scripts/bootstrap.js --verbose

# Check for specific collection issues
docker exec -it mongomaster_mongo1_1 mongo --eval "
use elearning;
db.getCollectionNames();
db.users.countDocuments();
"
```

#### Problem: Data generation script fails

**Error:** `Python dependencies not found`

**Solution:**

```bash
# Install Python dependencies
cd data/generators
pip install -r requirements.txt

# Or use Docker to run Python scripts
docker run --rm -v $(pwd):/app python:3.9 sh -c "
cd /app/data/generators &&
pip install -r requirements.txt &&
python generate_data.py --mode lite
"
```

### 4. Performance Issues

#### Problem: Slow query performance

**Symptoms:** Queries taking > 1000ms

**Diagnosis:**

```javascript
// Enable profiler in mongo shell
db.setProfilingLevel(2, { slowms: 100 });

// Check slow operations
db.system.profile.find().limit(5).sort({ ts: -1 }).pretty();

// Analyze specific query
db.collection.find({ query }).explain("executionStats");
```

**Solution:**

```javascript
// Create missing indexes
db.collection.createIndex({ field: 1 });

// Check index usage
db.collection.getIndexes();

// Optimize query patterns
db.collection.find({}).hint({ index_name: 1 });
```

#### Problem: High memory usage

**Symptoms:** Docker containers using excessive RAM

**Solution:**

```bash
# Check MongoDB memory stats
docker exec -it mongomaster_mongo1_1 mongo --eval "
db.runCommand({ serverStatus: 1 }).mem
"

# Limit memory in docker-compose.yml
services:
  mongo1:
    deploy:
      resources:
        limits:
          memory: 2G
```

### 5. Index Issues

#### Problem: Index creation fails

**Error:** `Index build failed`

**Solution:**

```javascript
// Check for conflicting indexes
db.collection.getIndexes();

// Drop conflicting index
db.collection.dropIndex("index_name");

// Recreate with correct specification
db.collection.createIndex({ field: 1 }, { background: true, name: "field_1" });
```

#### Problem: Index not being used

**Diagnosis:**

```javascript
// Check query plan
db.collection.find({ query }).explain("executionStats");

// Look for "IXSCAN" vs "COLLSCAN" in winningPlan
```

**Solution:**

```javascript
// Force index usage
db.collection.find({ query }).hint({ index_field: 1 });

// Rewrite query to match index
// Instead of: db.users.find({name: /john/i})
// Use: db.users.find({name_lower: "john"})
```

### 6. Aggregation Pipeline Issues

#### Problem: Pipeline exceeds memory limit

**Error:** `Exceeded memory limit for $group`

**Solution:**

```javascript
// Add allowDiskUse option
db.collection.aggregate([{ $group: { _id: "$field", count: { $sum: 1 } } }], {
  allowDiskUse: true,
});

// Or optimize with indexes
db.collection.createIndex({ field: 1 });
```

#### Problem: $lookup performance issues

**Solution:**

```javascript
// Ensure foreign collection is indexed
db.foreign_collection.createIndex({ foreign_field: 1 })

// Use $match before $lookup to reduce dataset
db.collection.aggregate([
  { $match: { date: { $gte: new Date("2024-01-01") } } },
  { $lookup: { ... } }
])
```

### 7. Transaction Issues

#### Problem: WriteConflict errors

**Error:** `WriteConflict error: this operation conflicted with another operation`

**Solution:**

```javascript
// Implement retry logic
function retryTransaction(session, txnFunc, maxRetries = 3) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return txnFunc(session);
    } catch (error) {
      if (
        error.hasErrorLabel("TransientTransactionError") &&
        retries < maxRetries - 1
      ) {
        retries++;
        continue;
      }
      throw error;
    }
  }
}
```

#### Problem: Transaction timeout

**Solution:**

```javascript
// Increase transaction timeout
session.startTransaction({
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" },
  maxTimeMS: 30000, // 30 seconds
});
```

### 8. Security Issues

#### Problem: Authentication failures

**Error:** `Authentication failed`

**Solution:**

```bash
# Check user creation
docker exec -it mongomaster_mongo1_1 mongo admin --eval "
db.system.users.find({}, {user:1, db:1, roles:1})
"

# Recreate admin user
docker exec -it mongomaster_mongo1_1 mongo admin --eval "
db.createUser({
  user: 'admin',
  pwd: 'password',
  roles: ['root']
})
"
```

#### Problem: Authorization errors

**Error:** `not authorized on database`

**Solution:**

```javascript
// Check user roles
db.runCommand({ usersInfo: "username" });

// Grant additional roles
db.grantRolesToUser("username", [{ role: "readWrite", db: "database_name" }]);
```

### 9. Sharding Issues

#### Problem: Shard key immutability error

**Error:** `Cannot update shard key field`

**Solution:**

```javascript
// Use $unset and $set in separate operations
db.collection.updateOne(
  { _id: ObjectId("...") },
  { $unset: { shard_key: "" } }
);

db.collection.updateOne(
  { _id: ObjectId("...") },
  { $set: { shard_key: "new_value" } }
);
```

### 10. Change Streams Issues

#### Problem: Change stream disconnections

**Solution:**

```javascript
// Implement reconnection logic
function watchWithReconnect(collection) {
  let changeStream = collection.watch();

  changeStream.on("error", (error) => {
    console.error("Change stream error:", error);
    setTimeout(() => {
      changeStream = watchWithReconnect(collection);
    }, 1000);
  });

  return changeStream;
}
```

## Environment-Specific Issues

### macOS Issues

#### Problem: Docker Desktop memory limits

**Solution:**

```bash
# Increase Docker Desktop memory allocation
# Docker Desktop → Preferences → Resources → Memory: 8GB+
```

#### Problem: File permission issues

**Solution:**

```bash
# Use Docker's file sharing settings
# Docker Desktop → Preferences → File Sharing
# Add project directory path
```

### Windows Issues

#### Problem: Line ending issues in scripts

**Solution:**

```bash
# Convert line endings
dos2unix scripts/**/*.js
# Or in Git:
git config core.autocrlf true
```

#### Problem: WSL2 integration issues

**Solution:**

```bash
# Enable WSL2 integration
# Docker Desktop → Settings → Resources → WSL Integration
# Enable integration with your WSL2 distro
```

### Linux Issues

#### Problem: Docker daemon not running

**Solution:**

```bash
# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Check status
sudo systemctl status docker
```

## Log Analysis

### MongoDB Logs

```bash
# View recent MongoDB logs
docker logs --tail 100 mongomaster_mongo1_1

# Follow logs in real-time
docker logs -f mongomaster_mongo1_1

# Search for specific errors
docker logs mongomaster_mongo1_1 2>&1 | grep -i "error\|exception\|failed"
```

### Application Logs

```bash
# Enable verbose logging in MongoDB
docker exec -it mongomaster_mongo1_1 mongo --eval "
db.adminCommand({
  setParameter: 1,
  logComponentVerbosity: {
    query: { verbosity: 2 }
  }
})
"
```

## Performance Monitoring

### Real-time Monitoring

```javascript
// Monitor current operations
db.currentOp();

// Monitor database statistics
db.stats();

// Monitor collection statistics
db.collection.stats();
```

### Profiler Analysis

```javascript
// Enable profiler for slow operations
db.setProfilingLevel(1, { slowms: 100 });

// Analyze profile data
db.system.profile.aggregate([
  {
    $group: {
      _id: "$ns",
      count: { $sum: 1 },
      avgDuration: { $avg: "$millis" },
    },
  },
  { $sort: { avgDuration: -1 } },
]);
```

## Emergency Recovery

### Data Recovery

```bash
# Create backup before recovery
docker exec mongomaster_mongo1_1 mongodump --host localhost:27017 --out /backup

# Restore from backup
docker exec mongomaster_mongo1_1 mongorestore --host localhost:27017 /backup
```

### Cluster Recovery

```bash
# Force replica set reconfiguration
docker exec -it mongomaster_mongo1_1 mongo --eval "
cfg = rs.conf();
cfg.version++;
rs.reconfig(cfg, {force: true});
"
```

## Getting Help

### Community Resources

- MongoDB Community Forums
- Stack Overflow (tag: mongodb)
- MongoDB University
- GitHub Issues for this project

### Professional Support

- MongoDB Atlas Support
- MongoDB Professional Services
- MongoDB Training and Certification

### Project-Specific Help

```bash
# Generate system report
node scripts/generate_system_report.js

# Run comprehensive validation
node scripts/validate_all.js

# Check project health
make health-check
```

Remember: When in doubt, check the logs first, then verify your environment setup, and finally consult the MongoDB documentation for specific error messages.
