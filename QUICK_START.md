# MongoMasterPro - Quick Start Guide

## Overview
MongoMasterPro is now fully fixed and ready to use. This guide will help you get started in minutes.

## Prerequisites
- Docker & Docker Compose installed
- 4GB+ available RAM (8GB recommended)
- MongoDB Shell (mongosh) installed locally (optional, for direct access)
- Python 3.8+ (for data generation, already included in Docker)

## Installation & Setup (5 minutes)

### Step 1: Start MongoDB
```bash
make start
```
Wait for the services to fully initialize (about 20 seconds).

### Step 2: Initialize the Database
```bash
make setup
```
This will:
- Create all required collections with schemas
- Create necessary indexes
- Set up user roles and authentication
- Generate sample (lite) dataset
- Validate the setup

### Step 3: Verify Everything Works
```bash
make validate
```
Check that all collections were created and have data.

## Common Commands

### Database Management
```bash
make status           # Check MongoDB status
make shell            # Open MongoDB interactive shell
make logs             # View MongoDB logs
make stop             # Stop all containers
make restart          # Restart MongoDB
make clean            # Clean everything (wipes data)
```

### Data Management
```bash
make data-lite        # Generate small dataset (1K users, 100 courses)
make data-full        # Generate large dataset (10K users, 1K courses)
```

### Learning Modules
```bash
# Run specific learning modules
make module-crud          # CRUD operations tutorial
make module-indexes       # Indexing strategies
make module-aggregation   # Aggregation pipelines
```

### Testing & Validation
```bash
make test             # Run integration tests
make benchmark        # Run performance benchmarks
make validate         # Validate current setup
```

## Using MongoDB Shell

### Connect to MongoDB
```bash
# Via Make command
make shell

# Or directly
mongosh mongodb://app_user:app_secure_pass@localhost:27017/learning_platform
```

### Useful Shell Commands
```javascript
// Check collections
db.getCollectionNames()

// Count documents
db.users.countDocuments()
db.courses.countDocuments()
db.enrollments.countDocuments()

// View sample document
db.users.findOne()

// Check indexes
db.users.getIndexes()

// Get collection stats
db.users.stats()
```

## Database Structure

### Collections
- **users** - User accounts and profiles (1K-10K records)
- **courses** - Course catalog (100-1K records)
- **enrollments** - User-course relationships (5K-50K records)
- **reviews** - Course reviews and ratings
- **categories** - Course categorization
- **analytics_events** - User activity tracking

### Databases
- **learning_platform** - Main application database
- **learning_platform_logs** - System and audit logs
- **learning_platform_analytics** - Analytics and metrics

## Default Credentials

### MongoDB Admin
- Username: `admin`
- Password: `mongomaster123`

### Application User
- Username: `app_user`
- Password: `app_secure_pass`
- Permissions: Full read/write on learning_platform database

### Read-Only User
- Username: `readonly_user`
- Password: `readonly_pass`
- Permissions: Read-only on learning_platform database

### Analytics User
- Username: `analytics_user`
- Password: `analytics_pass`
- Permissions: Read learning_platform, write to analytics

## Learning Path

### Week 1-2: Foundations
1. **Module 00: Setup & Environment** - [5 min] Understand the project structure
2. **Module 01: CRUD Operations** - [30 min] Insert, update, query, delete operations
   ```bash
   make module-crud
   ```
3. **Module 02: Indexes** - [30 min] Create and optimize indexes
   ```bash
   make module-indexes
   ```

### Week 3-4: Design Patterns
4. **Module 03: Schema Design** - Embedded vs Referenced data models
5. **Module 04: Aggregation** - Data analysis and reporting
   ```bash
   make module-aggregation
   ```
6. **Module 05: Transactions** - ACID compliance and multi-document operations

### Week 5-6: Scale & Operations
7. **Module 06: Replication** - High availability and failover
8. **Module 07: Sharding** - Horizontal scaling
9. **Module 08: Change Streams** - Real-time data processing

### Week 7-8: Production Ready
10. **Module 09: Security** - Authentication, authorization, encryption
11. **Module 10: Performance** - Profiling, optimization, monitoring
12. **Module 11: Capstones** - Integration projects

## Troubleshooting

### Issue: "MongoDB connection refused"
```bash
# Check if containers are running
docker ps | grep mongo

# Restart MongoDB
make restart

# Check logs
make logs
```

### Issue: "Cannot create collection, already exists"
This is normal on re-runs. The bootstrap script handles this gracefully.

### Issue: "Data generation fails"
```bash
# Check Python is installed
python3 --version

# Reinstall dependencies
cd data/generators
pip3 install -r requirements.txt

# Try again
cd ../..
make data-lite
```

### Issue: "Port 27017 already in use"
```bash
# Stop other MongoDB instances
pkill mongod

# Or use a different port
export MONGO_PORT=27018
make start
```

## Working with MongoDB Compass

### Connection String
```
mongodb://app_user:app_secure_pass@localhost:27017/learning_platform
```

### Steps:
1. Open MongoDB Compass
2. Click "New Connection"
3. Paste the connection string
4. Click "Connect"
5. Browse collections and data

## Docker Container Access

### View container logs
```bash
docker logs mongo-primary -f
```

### Execute command in container
```bash
docker exec mongo-primary mongosh learning_platform < script.js
```

### Shell into container
```bash
docker exec -it mongo-primary bash
```

## Environment Configuration

### Override defaults
```bash
# Create a .env file
cp config/env.example .env

# Edit .env with your settings
nano .env

# Start with custom config
make start
```

## Next Steps

1. ✅ Start MongoDB: `make start`
2. ✅ Initialize database: `make setup`
3. ✅ Run CRUD module: `make module-crud`
4. 📖 Read docs: `docs/learning_path.md`
5. 🚀 Explore modules: `scripts/0X_*/`

## Documentation

- **README.md** - Complete project documentation
- **ISSUES_AND_FIXES.md** - What was wrong and how it was fixed
- **docs/learning_path.md** - Detailed curriculum
- **docs/troubleshooting.md** - Common issues and solutions
- **docs/cheat_sheets/** - Quick reference guides

## Support & Resources

### Verify Installation
```bash
# Full validation
make validate

# Database status
make status

# Test everything
make test
```

### Generate Test Data
```bash
# Quick test (1K users)
make data-lite

# Full test (10K users)
make data-full
```

### Performance Testing
```bash
# Run benchmarks
make benchmark

# Check results
cat docs/results/benchmark_results/
```

## What's Included

✅ Complete MongoDB learning platform
✅ 80+ practical scripts and examples
✅ Real-world e-learning dataset
✅ Replica set configuration
✅ Comprehensive validation suite
✅ Performance benchmarking tools
✅ Security configuration
✅ Docker containerization

## What Was Fixed

- ✅ Database name inconsistencies (unified to `learning_platform`)
- ✅ Field naming conventions (standardized to snake_case)
- ✅ Docker configuration issues
- ✅ Makefile commands
- ✅ Python data generation script
- ✅ Bootstrap script execution
- ✅ Test file configurations
- ✅ All syntax and path errors

## Version Information

- **MongoDB:** 7.0
- **Mongosh:** Latest
- **Docker:** Latest
- **Python:** 3.8+

## Ready to Learn?

Start your MongoDB mastery journey:

```bash
# Get started in 3 commands
make start          # Start MongoDB
make setup          # Initialize database
make shell          # Open MongoDB shell
```

Happy Learning! 🚀

---

For detailed information, see README.md or visit https://github.com/SatvikPraveen/MongoMasterPro

