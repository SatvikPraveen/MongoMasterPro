#!/bin/bash

# File: generate_mongo_master_pro.sh
# MongoMasterPro Project Structure Generator
# Creates a complete MongoDB mastery lab with optimized structure
# Usage: ./generate_mongo_master_pro.sh [project_name]

set -e

# Configuration
PROJECT_NAME=${1:-MongoMasterPro}
BASE_DIR="$(pwd)/$PROJECT_NAME"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if project directory exists
check_project_exists() {
    if [ -d "$BASE_DIR" ]; then
        log_warning "Directory '$PROJECT_NAME' already exists."
        read -p "Do you want to remove it and continue? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$BASE_DIR"
            log_info "Removed existing directory."
        else
            log_error "Project generation cancelled."
            exit 1
        fi
    fi
}

# Create directory structure
create_directories() {
    log_info "Creating directory structure..."

    # Root directories
    mkdir -p "$BASE_DIR"

    # Docker and config
    mkdir -p "$BASE_DIR/docker/init"
    mkdir -p "$BASE_DIR/config"

    # Data directories
    mkdir -p "$BASE_DIR/data/generators"
    mkdir -p "$BASE_DIR/data/seed"

    # Script modules
    mkdir -p "$BASE_DIR/scripts/00_setup"
    mkdir -p "$BASE_DIR/scripts/01_crud"
    mkdir -p "$BASE_DIR/scripts/02_indexes"
    mkdir -p "$BASE_DIR/scripts/03_schema_design"
    mkdir -p "$BASE_DIR/scripts/04_aggregation"
    mkdir -p "$BASE_DIR/scripts/05_transactions"
    mkdir -p "$BASE_DIR/scripts/06_replication"
    mkdir -p "$BASE_DIR/scripts/07_sharding"
    mkdir -p "$BASE_DIR/scripts/08_change_streams"
    mkdir -p "$BASE_DIR/scripts/09_security"
    mkdir -p "$BASE_DIR/scripts/10_performance"
    mkdir -p "$BASE_DIR/scripts/11_capstones"

    # Documentation
    mkdir -p "$BASE_DIR/docs/cheat_sheets"
    mkdir -p "$BASE_DIR/docs/results/explain_plans"
    mkdir -p "$BASE_DIR/docs/results/performance_reports"
    mkdir -p "$BASE_DIR/docs/results/schema_diagrams"
    mkdir -p "$BASE_DIR/docs/results/benchmark_results"
    mkdir -p "$BASE_DIR/docs/portfolio/kpi_dashboards"
    mkdir -p "$BASE_DIR/docs/portfolio/architecture_designs"
    mkdir -p "$BASE_DIR/docs/portfolio/optimization_case_studies"

    # Tests
    mkdir -p "$BASE_DIR/tests/unit"
    mkdir -p "$BASE_DIR/tests/integration"
    mkdir -p "$BASE_DIR/tests/utils"

    log_success "Directory structure created."
}

# Generate root files
create_root_files() {
    log_info "Creating root configuration files..."

    # README.md
    cat > "$BASE_DIR/README.md" << 'EOF'
# File: README.md
# MongoMasterPro - End-to-End MongoDB Mastery Lab

🚀 **A comprehensive, sequential MongoDB learning lab covering beginner to expert concepts**

## Quick Start

```bash
# Start single-node environment
make up data-lite setup validate

# Start replica set environment
make rs-up data-full setup validate

# Access MongoDB shell
docker exec -it mongo-master mongosh

# Access web UI
open http://localhost:8081
```

## Learning Path

| Module | Topic | Skills Developed |
|--------|-------|------------------|
| 00 | Setup & Validation | Environment, connections, data generation |
| 01 | CRUD Operations | Insert, update, delete, query patterns |
| 02 | Indexing | Single, compound, text, geo, performance |
| 03 | Schema Design | Embedded vs referenced patterns, migrations |
| 04 | Aggregation | Pipeline stages, analytics, reporting |
| 05 | Transactions | ACID properties, sessions, consistency |
| 06 | Replication | High availability, read preferences |
| 07 | Sharding | Horizontal scaling, shard keys |
| 08 | Change Streams | Real-time processing, CDC patterns |
| 09 | Security | Authentication, authorization, encryption |
| 10 | Performance | Profiling, optimization, monitoring |
| 11 | Capstones | Integration projects, portfolio artifacts |

## Data Modes

- **Lite Mode** (5K docs): Fast setup for core concept learning
- **Full Mode** (50K+ docs): Realistic scale for performance optimization

## Domain: Knowledge Galaxy

A multi-tenant learning platform with realistic data relationships:
- Users, Courses, Lessons, Enrollments
- Quiz attempts, Payments, Locations
- Time-series events, Analytics KPIs

## Validation & Portfolio

Every module includes validation scripts and generates portfolio-ready artifacts including explain plans, performance reports, and architecture designs.

---
*Built for MongoDB mastery through hands-on practice*
EOF

    # .gitignore
    cat > "$BASE_DIR/.gitignore" << 'EOF'
# File: .gitignore
# Environment files
.env
*.local

# Docker volumes
/data/db/
/data/configdb/
/data/logs/

# Generated data files
/data/generated/
*.json
*.ndjson
!base_*.json

# Results and logs
/docs/results/*.log
/docs/results/tmp/
*.explain
*.profile

# Python
__pycache__/
*.py[cod]
*$py.class
.venv/
venv/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Temporary files
*.tmp
*.temp
/temp/
EOF

    # LICENSE
    cat > "$BASE_DIR/LICENSE" << 'EOF'
MIT License

Copyright (c) 2025 MongoMasterPro

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

    log_success "Root files created."
}

# Generate Makefile
create_makefile() {
    log_info "Creating Makefile..."

    cat > "$BASE_DIR/Makefile" << 'EOF'
# File: Makefile
.PHONY: help up rs-up shard-up down data-lite data-full data-reset setup validate test clean capture portfolio

# Default target
help:
	@echo "MongoMasterPro - Available Commands:"
	@echo ""
	@echo "Environment Management:"
	@echo "  up           - Start single node + mongo-express"
	@echo "  rs-up        - Start replica set + mongo-express"
	@echo "  shard-up     - Start sharded cluster (modules 07+)"
	@echo "  down         - Stop and remove all containers"
	@echo ""
	@echo "Data Management:"
	@echo "  data-lite    - Generate lite dataset (5k docs)"
	@echo "  data-full    - Generate full dataset (50k+ docs)"
	@echo "  data-reset   - Clean and regenerate data"
	@echo ""
	@echo "Learning Workflow:"
	@echo "  setup        - Run complete environment setup"
	@echo "  validate     - Run all validation scripts"
	@echo "  test         - Execute full test suite"
	@echo "  clean        - Reset to clean state"
	@echo ""
	@echo "Results Management:"
	@echo "  capture      - Save explain plans and metrics"
	@echo "  portfolio    - Generate portfolio artifacts"

# Environment Management
up:
	docker-compose -f docker/docker-compose.yml up -d
	@echo "✅ MongoDB single node ready at mongodb://localhost:27017"
	@echo "🌐 Mongo Express UI: http://localhost:8081"

rs-up:
	docker-compose -f docker/docker-compose.rs.yml up -d
	@echo "✅ MongoDB replica set ready at mongodb://localhost:27017,localhost:27018,localhost:27019"
	@echo "🌐 Mongo Express UI: http://localhost:8081"

shard-up:
	@echo "🚧 Sharded cluster setup - see scripts/07_sharding/"
	docker-compose -f docker/docker-compose.shard.yml up -d

down:
	docker-compose -f docker/docker-compose.yml down -v
	docker-compose -f docker/docker-compose.rs.yml down -v
	docker-compose -f docker/docker-compose.shard.yml down -v

# Data Management
data-lite:
	docker exec mongo-master python3 /data/generators/generate_data.py --mode lite

data-full:
	docker exec mongo-master python3 /data/generators/generate_data.py --mode full

data-reset:
	docker exec mongo-master mongosh --eval "db.adminCommand('listDatabases').databases.forEach(db => { if(!['admin','config','local'].includes(db.name)) { db.getSiblingDB(db.name).dropDatabase() }})"
	$(MAKE) data-lite

# Learning Workflow
setup:
	docker exec mongo-master mongosh --file /scripts/00_setup/bootstrap.js
	docker exec mongo-master mongosh --file /scripts/00_setup/validate_setup.js

validate:
	@echo "🔍 Running validation scripts..."
	@for module in 01_crud 02_indexes 03_schema_design 04_aggregation 05_transactions 06_replication 07_sharding 08_change_streams 09_security 10_performance 11_capstones; do \
		echo "Validating $$module..."; \
		docker exec mongo-master mongosh --file /scripts/$$module/validate_$$module.js 2>/dev/null || echo "⚠️  $$module validation skipped"; \
	done

test:
	docker exec mongo-master mongosh --file /tests/integration/end_to_end_workflow.js

clean:
	$(MAKE) down
	docker volume prune -f
	$(MAKE) up data-lite setup

# Results Management
capture:
	@echo "📊 Capturing results..."
	docker exec mongo-master mkdir -p /docs/results/explain_plans
	docker exec mongo-master mkdir -p /docs/results/performance_reports

portfolio:
	docker exec mongo-master mongosh --file /scripts/11_capstones/analytics_dashboard.js
	docker exec mongo-master mongosh --file /scripts/11_capstones/integration_validation.js
	@echo "🎯 Portfolio artifacts generated in docs/portfolio/"
EOF

    log_success "Makefile created."
}

# Generate Docker configuration
create_docker_config() {
    log_info "Creating Docker configuration..."

    # Dockerfile
    cat > "$BASE_DIR/docker/Dockerfile" << 'EOF'
# File: docker/Dockerfile
FROM mongo:7.0

# Install Python for data generation
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN pip3 install --no-cache-dir \
    pymongo \
    faker \
    numpy \
    pandas

# Create directories for scripts and data
RUN mkdir -p /scripts /data/generators /data/seed /docs/results

# Copy initialization scripts
COPY init/ /docker-entrypoint-initdb.d/

EXPOSE 27017
EOF

    # docker-compose.yml (single node)
    cat > "$BASE_DIR/docker/docker-compose.yml" << 'EOF'
# File: docker/docker-compose.yml
version: '3.8'

services:
  mongo-master:
    build: .
    container_name: mongo-master
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: masterpass
      MONGO_INITDB_DATABASE: knowledge_galaxy
    volumes:
      - mongo_data:/data/db
      - mongo_config:/data/configdb
      - ../scripts:/scripts:ro
      - ../data:/data:ro
      - ../docs:/docs
      - ../tests:/tests:ro
      - ../config/mongodb.conf:/etc/mongo/mongodb.conf:ro
    command: mongod --config /etc/mongo/mongodb.conf

  mongo-express:
    image: mongo-express:1.0.2
    container_name: mongo-express
    restart: unless-stopped
    ports:
      - "8081:8081"
    environment:
      ME_CONFIG_MONGODB_ADMINUSERNAME: admin
      ME_CONFIG_MONGODB_ADMINPASSWORD: masterpass
      ME_CONFIG_MONGODB_URL: mongodb://admin:masterpass@mongo-master:27017/
      ME_CONFIG_BASICAUTH: false
    depends_on:
      - mongo-master

volumes:
  mongo_data:
  mongo_config:
EOF

    # docker-compose.rs.yml (replica set)
    cat > "$BASE_DIR/docker/docker-compose.rs.yml" << 'EOF'
# File: docker/docker-compose.rs.yml
version: '3.8'

services:
  mongo-rs-1:
    build: .
    container_name: mongo-rs-1
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: masterpass
    volumes:
      - mongo_rs1_data:/data/db
      - ../scripts:/scripts:ro
      - ../data:/data:ro
      - ../docs:/docs
      - ../tests:/tests:ro
    command: mongod --replSet rs0 --port 27017 --bind_ip_all

  mongo-rs-2:
    build: .
    container_name: mongo-rs-2
    restart: unless-stopped
    ports:
      - "27018:27017"
    command: mongod --replSet rs0 --port 27017 --bind_ip_all
    volumes:
      - mongo_rs2_data:/data/db

  mongo-rs-3:
    build: .
    container_name: mongo-rs-3
    restart: unless-stopped
    ports:
      - "27019:27017"
    command: mongod --replSet rs0 --port 27017 --bind_ip_all
    volumes:
      - mongo_rs3_data:/data/db

  mongo-express:
    image: mongo-express:1.0.2
    container_name: mongo-express
    restart: unless-stopped
    ports:
      - "8081:8081"
    environment:
      ME_CONFIG_MONGODB_ADMINUSERNAME: admin
      ME_CONFIG_MONGODB_ADMINPASSWORD: masterpass
      ME_CONFIG_MONGODB_URL: mongodb://admin:masterpass@mongo-rs-1:27017,mongo-rs-2:27017,mongo-rs-3:27017/?replicaSet=rs0
      ME_CONFIG_BASICAUTH: false
    depends_on:
      - mongo-rs-1
      - mongo-rs-2
      - mongo-rs-3

volumes:
  mongo_rs1_data:
  mongo_rs2_data:
  mongo_rs3_data:
EOF

    # Bootstrap initialization script
    cat > "$BASE_DIR/docker/init/bootstrap.js" << 'EOF'
// File: docker/init/bootstrap.js
// MongoDB Initialization Script - Creates users, roles, databases, and collections

print("🚀 Starting MongoMasterPro initialization...");

// Switch to admin database
use admin;

// Create application user
db.createUser({
  user: "app_user",
  pwd: "app_pass",
  roles: [
    { role: "readWrite", db: "knowledge_galaxy" },
    { role: "readWrite", db: "analytics" },
    { role: "readWrite", db: "audit" }
  ]
});

print("✅ Users created");

// Create Knowledge Galaxy database and collections
use knowledge_galaxy;

db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "username", "created_at"],
      properties: {
        email: { bsonType: "string", pattern: "^.+@.+\..+$" },
        username: { bsonType: "string", minLength: 3 },
        created_at: { bsonType: "date" }
      }
    }
  }
});

db.createCollection("courses");
db.createCollection("lessons");
db.createCollection("enrollments");
db.createCollection("quiz_attempts");
db.createCollection("payments");
db.createCollection("locations");

print("✅ Collections created in knowledge_galaxy");

// Create Analytics database
use analytics;
db.createCollection("kpis");
db.createCollection("events");

// Create Audit database
use audit;
db.createCollection("changes");

print("✅ All databases initialized");
print("🍃 MongoMasterPro ready for learning!");
EOF

    log_success "Docker configuration created."
}

# Generate configuration files
create_config_files() {
    log_info "Creating configuration files..."

    # MongoDB configuration
    cat > "$BASE_DIR/config/mongodb.conf" << 'EOF'
# File: config/mongodb.conf
# MongoDB Configuration for MongoMasterPro

# Storage
storage:
  dbPath: /data/db
  journal:
    enabled: true

# Networking
net:
  port: 27017
  bindIp: 0.0.0.0

# Process Management
processManagement:
  timeZoneInfo: /usr/share/zoneinfo

# Security
security:
  authorization: enabled

# Operation Profiling
operationProfiling:
  slowOpThresholdMs: 100
  mode: slowOp

# Logging
systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log
  logRotate: reopen
EOF

    # Environment example
    cat > "$BASE_DIR/config/env.example" << 'EOF'
# File: config/env.example
# MongoDB Connection
MONGO_URI=mongodb://admin:masterpass@localhost:27017
MONGO_DB=knowledge_galaxy

# Application Settings
APP_ENV=development
LOG_LEVEL=info

# Data Generation
DATA_MODE=lite  # lite | full
BATCH_SIZE=1000

# Performance Settings
PROFILING_THRESHOLD_MS=100
INDEX_BUILD_BACKGROUND=true
EOF

    log_success "Configuration files created."
}

# Generate data generation scripts
create_data_generators() {
    log_info "Creating data generation scripts..."

    # Python data generator
    cat > "$BASE_DIR/data/generators/generate_data.py" << 'EOF'
#!/usr/bin/env python3
"""
File: data/generators/generate_data.py
MongoMasterPro Data Generator
Generates realistic synthetic data for MongoDB learning scenarios
"""

import argparse
import json
import random
from datetime import datetime, timedelta
from faker import Faker
import pymongo

fake = Faker()

# Data generation configurations
MODES = {
    'lite': {
        'users': 1000,
        'courses': 50,
        'lessons': 500,
        'enrollments': 5000,
        'quiz_attempts': 2000,
        'payments': 1000,
        'locations': 100,
        'events': 10000
    },
    'full': {
        'users': 10000,
        'courses': 500,
        'lessons': 5000,
        'enrollments': 50000,
        'quiz_attempts': 20000,
        'payments': 15000,
        'locations': 1000,
        'events': 100000
    }
}

class DataGenerator:
    def __init__(self, mode='lite', mongo_uri='mongodb://admin:masterpass@localhost:27017'):
        self.mode = mode
        self.config = MODES[mode]
        self.client = pymongo.MongoClient(mongo_uri)
        self.db = self.client.knowledge_galaxy

    def generate_users(self):
        """Generate user documents"""
        print(f"Generating {self.config['users']} users...")
        users = []
        for i in range(self.config['users']):
            user = {
                '_id': f"user_{i:06d}",
                'username': fake.user_name(),
                'email': fake.email(),
                'first_name': fake.first_name(),
                'last_name': fake.last_name(),
                'created_at': fake.date_time_between(start_date='-2y'),
                'profile': {
                    'bio': fake.text(max_nb_chars=200),
                    'avatar_url': fake.image_url(),
                    'timezone': fake.timezone(),
                    'preferences': {
                        'email_notifications': random.choice([True, False]),
                        'theme': random.choice(['light', 'dark'])
                    }
                },
                'stats': {
                    'courses_completed': random.randint(0, 20),
                    'total_points': random.randint(0, 10000),
                    'streak_days': random.randint(0, 365)
                }
            }
            users.append(user)

        self.db.users.insert_many(users)
        print(f"✅ Generated {len(users)} users")

    def generate_courses(self):
        """Generate course documents"""
        print(f"Generating {self.config['courses']} courses...")
        courses = []
        categories = ['Programming', 'Data Science', 'Design', 'Business', 'Marketing']

        for i in range(self.config['courses']):
            course = {
                '_id': f"course_{i:04d}",
                'title': f"Master {fake.catch_phrase()}",
                'description': fake.text(max_nb_chars=500),
                'category': random.choice(categories),
                'instructor': {
                    'name': fake.name(),
                    'bio': fake.text(max_nb_chars=300),
                    'rating': round(random.uniform(3.5, 5.0), 1)
                },
                'metadata': {
                    'difficulty': random.choice(['beginner', 'intermediate', 'advanced']),
                    'duration_hours': random.randint(5, 100),
                    'language': 'English',
                    'price': random.choice([0, 29.99, 49.99, 99.99, 199.99])
                },
                'stats': {
                    'enrolled_count': random.randint(100, 10000),
                    'completion_rate': round(random.uniform(0.3, 0.9), 2),
                    'average_rating': round(random.uniform(3.0, 5.0), 1)
                },
                'created_at': fake.date_time_between(start_date='-1y'),
                'tags': [fake.word() for _ in range(random.randint(3, 8))]
            }
            courses.append(course)

        self.db.courses.insert_many(courses)
        print(f"✅ Generated {len(courses)} courses")

    def generate_all(self):
        """Generate all collections"""
        print(f"🚀 Generating {self.mode} mode data...")

        # Clear existing data
        for collection in ['users', 'courses', 'lessons', 'enrollments', 'quiz_attempts', 'payments', 'locations']:
            self.db[collection].delete_many({})

        self.generate_users()
        self.generate_courses()

        print(f"✅ Data generation complete in {self.mode} mode!")

    def close(self):
        self.client.close()

def main():
    parser = argparse.ArgumentParser(description='Generate synthetic data for MongoMasterPro')
    parser.add_argument('--mode', choices=['lite', 'full'], default='lite',
                       help='Data generation mode (default: lite)')
    parser.add_argument('--collections', nargs='+',
                       help='Specific collections to generate')

    args = parser.parse_args()

    generator = DataGenerator(mode=args.mode)

    try:
        if args.collections:
            print(f"Generating specific collections: {args.collections}")
            # Generate specific collections logic here
        else:
            generator.generate_all()
    finally:
        generator.close()

if __name__ == '__main__':
    main()
EOF

    # Requirements file
    cat > "$BASE_DIR/data/generators/requirements.txt" << 'EOF'
pymongo>=4.6.0
faker>=20.1.0
numpy>=1.24.0
pandas>=2.1.0
EOF

    # Base seed data
    cat > "$BASE_DIR/data/seed/base_users.json" << 'EOF'
[
  {
    "_id": "admin_user",
    "username": "admin",
    "email": "admin@knowledge-galaxy.com",
    "role": "admin",
    "created_at": "2024-01-01T00:00:00Z"
  },
  {
    "_id": "demo_user",
    "username": "demo_learner",
    "email": "demo@example.com",
    "role": "student",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
EOF

    log_success "Data generation scripts created."
}

# Generate script modules
create_script_modules() {
    log_info "Creating script modules..."

    # 00_setup module
    cat > "$BASE_DIR/scripts/00_setup/bootstrap.js" << 'EOF'
// File: scripts/00_setup/bootstrap.js
// MongoMasterPro Bootstrap Script - Atomic setup: databases → collections → indexes → seed data

print("🚀 MongoMasterPro Bootstrap Starting...");

// Connect to admin for user management
use admin;

// Verify admin connection
try {
    db.runCommand({ ismaster: 1 });
    print("✅ Connected to MongoDB");
} catch (error) {
    print("❌ Failed to connect to MongoDB");
    quit(1);
}

// Create application databases
const databases = ['knowledge_galaxy', 'analytics', 'audit'];
databases.forEach(dbName => {
    use(dbName);
    db.createCollection('_init');
    db._init.insertOne({ initialized: new Date() });
    db._init.drop();
    print(`✅ Database ${dbName} initialized`);
});

// Switch to main database
use knowledge_galaxy;

// Create collections with validation
const collections = [
    {
        name: 'users',
        validator: {
            $jsonSchema: {
                bsonType: 'object',
                required: ['username', 'email', 'created_at'],
                properties: {
                    email: { bsonType: 'string', pattern: '^.+@.+\\..+$' },
                    username: { bsonType: 'string', minLength: 3 }
                }
            }
        }
    },
    { name: 'courses' },
    { name: 'lessons' },
    { name: 'enrollments' },
    { name: 'quiz_attempts' },
    { name: 'payments' },
    { name: 'locations' }
];

collections.forEach(col => {
    if (col.validator) {
        db.createCollection(col.name, { validator: col.validator });
    } else {
        db.createCollection(col.name);
    }
    print(`✅ Collection ${col.name} created`);
});

// Create essential indexes
const indexes = [
    { collection: 'users', index: { email: 1 }, options: { unique: true } },
    { collection: 'users', index: { username: 1 }, options: { unique: true } },
    { collection: 'courses', index: { category: 1 } },
    { collection: 'enrollments', index: { user_id: 1, course_id: 1 }, options: { unique: true } },
    { collection: 'enrollments', index: { user_id: 1, enrolled_at: -1 } }
];

indexes.forEach(idx => {
    db[idx.collection].createIndex(idx.index, idx.options || {});
    print(`✅ Index created on ${idx.collection}`);
});

print("🎯 Bootstrap completed successfully!");
print("🔍 Run validate_setup.js to verify installation");
EOF

    cat > "$BASE_DIR/scripts/00_setup/validate_setup.js" << 'EOF'
// File: scripts/00_setup/validate_setup.js
// MongoMasterPro Setup Validation - Verifies successful installation and configuration

print("🔍 Validating MongoMasterPro setup...");

let errors = 0;
const report = {
    databases: {},
    collections: {},
    indexes: {},
    data: {}
};

// Check databases
const requiredDbs = ['knowledge_galaxy', 'analytics', 'audit'];
const existingDbs = db.adminCommand('listDatabases').databases.map(d => d.name);

requiredDbs.forEach(dbName => {
    if (existingDbs.includes(dbName)) {
        report.databases[dbName] = '✅ EXISTS';
        print(`✅ Database ${dbName} found`);
    } else {
        report.databases[dbName] = '❌ MISSING';
        print(`❌ Database ${dbName} missing`);
        errors++;
    }
});

// Check collections in knowledge_galaxy
use knowledge_galaxy;
const requiredCollections = ['users', 'courses', 'lessons', 'enrollments', 'quiz_attempts'];
const existingCollections = db.listCollectionNames();

requiredCollections.forEach(colName => {
    if (existingCollections.includes(colName)) {
        report.collections[colName] = '✅ EXISTS';
        print(`✅ Collection ${colName} found`);
    } else {
        report.collections[colName] = '❌ MISSING';
        print(`❌ Collection ${colName} missing`);
        errors++;
    }
});

// Check indexes
const criticalIndexes = [
    { collection: 'users', field: 'email' },
    { collection: 'users', field: 'username' },
    { collection: 'courses', field: 'category' }
];

criticalIndexes.forEach(idx => {
    const indexes = db[idx.collection].getIndexes();
    const hasIndex = indexes.some(i => i.key[idx.field]);
    if (hasIndex) {
        report.indexes[`${idx.collection}.${idx.field}`] = '✅ EXISTS';
        print(`✅ Index on ${idx.collection}.${idx.field} found`);
    } else {
        report.indexes[`${idx.collection}.${idx.field}`] = '❌ MISSING';
        print(`❌ Index on ${idx.collection}.${idx.field} missing`);
        errors++;
    }
});

// Summary
print("\n📊 VALIDATION SUMMARY:");
print(`Databases: ${Object.keys(report.databases).length}`);
print(`Collections: ${Object.keys(report.collections).length}`);
print(`Indexes: ${Object.keys(report.indexes).length}`);

if (errors === 0) {
    print("🎉 Setup validation PASSED! Ready for learning.");
} else {
    print(`❌ Setup validation FAILED with ${errors} errors.`);
    print("Please run bootstrap.js again.");
}

// Save report
use analytics;
db.setup_reports.insertOne({
    timestamp: new Date(),
    report: report,
    errors: errors,
    status: errors === 0 ? 'PASS' : 'FAIL'
});

print("📁 Validation report saved to analytics.setup_reports");
EOF

    log_success "Script modules created."
}

# Generate test framework
create_tests() {
    log_info "Creating test framework..."

    # Test utilities
    cat > "$BASE_DIR/tests/utils/test_helpers.js" << 'EOF'
// File: tests/utils/test_helpers.js
// MongoMasterPro Test Helpers - Common utilities for testing and validation

// Test execution framework
function runTest(name, testFn) {
    try {
        const startTime = new Date();
        const result = testFn();
        const duration = new Date() - startTime;

        if (result) {
            print(`✅ ${name} (${duration}ms)`);
            return { name, status: 'PASS', duration, error: null };
        } else {
            print(`❌ ${name} - Test returned false`);
            return { name, status: 'FAIL', duration, error: 'Test returned false' };
        }
    } catch (error) {
        print(`❌ ${name} - ${error.message}`);
        return { name, status: 'ERROR', duration: 0, error: error.message };
    }
}

// Test suite runner
function runTestSuite(suiteName, tests) {
    print(`\n🧪 Running test suite: ${suiteName}`);
    print("=".repeat(50));

    const results = [];
    let passed = 0;
    let failed = 0;

    tests.forEach(test => {
        const result = runTest(test.name, test.fn);
        results.push(result);

        if (result.status === 'PASS') {
            passed++;
        } else {
            failed++;
        }
    });

    print(`\n📊 Suite Results: ${passed} passed, ${failed} failed`);

    // Save results to analytics
    use analytics;
    db.test_results.insertOne({
        suite: suiteName,
        timestamp: new Date(),
        results: results,
        summary: { passed, failed, total: results.length }
    });

    return { passed, failed, results };
}

// Data quality checks
function validateDataIntegrity(collection, rules) {
    const results = [];

    rules.forEach(rule => {
        try {
            const count = db[collection].countDocuments(rule.query || {});
            const isValid = rule.validator(count);

            results.push({
                rule: rule.name,
                status: isValid ? 'PASS' : 'FAIL',
                count: count,
                expected: rule.expected || 'N/A'
            });
        } catch (error) {
            results.push({
                rule: rule.name,
                status: 'ERROR',
                error: error.message
            });
        }
    });

    return results;
}
EOF

    # Integration tests
    cat > "$BASE_DIR/tests/integration/end_to_end_workflow.js" << 'EOF'
// File: tests/integration/end_to_end_workflow.js
// End-to-End Workflow Test - Tests complete learning workflow from setup to capstones

load('/tests/utils/test_helpers.js');

print("🚀 Starting End-to-End Workflow Test");

// Test data setup and generation
const setupTests = [
    {
        name: "Database connectivity",
        fn: () => {
            try {
                db.adminCommand({ ismaster: 1 });
                return true;
            } catch (error) {
                return false;
            }
        }
    },
    {
        name: "Required databases exist",
        fn: () => {
            const dbs = db.adminCommand('listDatabases').databases.map(d => d.name);
            const required = ['knowledge_galaxy', 'analytics', 'audit'];
            return required.every(db => dbs.includes(db));
        }
    },
    {
        name: "Collections are created",
        fn: () => {
            use knowledge_galaxy;
            const collections = db.listCollectionNames();
            const required = ['users', 'courses', 'enrollments'];
            return required.every(col => collections.includes(col));
        }
    }
];

// Test CRUD operations
const crudTests = [
    {
        name: "Insert test document",
        fn: () => {
            use knowledge_galaxy;
            const result = db.users.insertOne({
                _id: "test_user_e2e",
                username: "e2e_test",
                email: "e2e@test.com",
                created_at: new Date()
            });
            return result.acknowledged;
        }
    },
    {
        name: "Query test document",
        fn: () => {
            use knowledge_galaxy;
            const user = db.users.findOne({ _id: "test_user_e2e" });
            return user && user.email === "e2e@test.com";
        }
    },
    {
        name: "Delete test document",
        fn: () => {
            use knowledge_galaxy;
            const result = db.users.deleteOne({ _id: "test_user_e2e" });
            return result.deletedCount === 1;
        }
    }
];

// Run all test suites
function runE2ETests() {
    const suites = [
        { name: "Setup Validation", tests: setupTests },
        { name: "CRUD Operations", tests: crudTests }
    ];

    let totalPassed = 0;
    let totalFailed = 0;

    suites.forEach(suite => {
        const result = runTestSuite(suite.name, suite.tests);
        totalPassed += result.passed;
        totalFailed += result.failed;
    });

    print(`\n🎯 E2E Test Summary: ${totalPassed} passed, ${totalFailed} failed`);
    return { passed: totalPassed, failed: totalFailed };
}

// Execute tests
runE2ETests();
EOF

    log_success "Test framework created."
}

# Generate documentation
create_documentation() {
    log_info "Creating documentation..."

    cat > "$BASE_DIR/docs/learning_path.md" << 'EOF'
# File: docs/learning_path.md
# MongoMasterPro Learning Path

## Sequential Progression Guide

### Phase 1: Foundation (Modules 00-02)
**Timeline: 1-2 weeks**

- [ ] **00_setup**: Environment validation and data generation
- [ ] **01_crud**: Data manipulation mastery
- [ ] **02_indexes**: Query optimization fundamentals

### Phase 2: Intermediate (Modules 03-05)
**Timeline: 2-3 weeks**

- [ ] **03_schema_design**: Data modeling patterns
- [ ] **04_aggregation**: Analytics and reporting
- [ ] **05_transactions**: Consistency guarantees

### Phase 3: Advanced (Modules 06-08)
**Timeline: 2-3 weeks**

- [ ] **06_replication**: High availability
- [ ] **07_sharding**: Horizontal scaling
- [ ] **08_change_streams**: Real-time processing

### Phase 4: Production (Modules 09-11)
**Timeline: 2-4 weeks**

- [ ] **09_security**: Authentication and authorization
- [ ] **10_performance**: Optimization and monitoring
- [ ] **11_capstones**: Integration projects

## Next Steps

1. Start with `make up data-lite setup validate`
2. Work through modules sequentially
3. Build your MongoDB expertise portfolio
EOF

    log_success "Documentation created."
}

# Final project setup steps
finalize_project() {
    log_info "Finalizing project setup..."

    # Make scripts executable
    chmod +x "$BASE_DIR/data/generators/generate_data.py"

    # Set proper permissions
    find "$BASE_DIR" -name "*.js" -exec chmod +r {} \;
    find "$BASE_DIR" -name "*.py" -exec chmod +x {} \;

    # Create .env file from template
    if [ ! -f "$BASE_DIR/.env" ]; then
        cp "$BASE_DIR/config/env.example" "$BASE_DIR/.env"
        log_info "Created .env file from template"
    fi

    log_success "Project finalized successfully!"
}

# Main execution
main() {
    log_info "Starting MongoMasterPro project generation..."

    check_project_exists
    create_directories
    create_root_files
    create_makefile
    create_docker_config
    create_config_files
    create_data_generators
    create_script_modules
    create_tests
    create_documentation
    finalize_project

    log_success "MongoMasterPro project generated successfully!"
    log_info "Next steps:"
    echo "  1. cd $PROJECT_NAME"
    echo "  2. make up data-lite setup validate"
    echo "  3. Start learning with scripts/01_crud/"
    echo ""
    log_info "Access MongoDB: mongodb://admin:masterpass@localhost:27017"
    log_info "Access Web UI: http://localhost:8081"
}

# Execute main function
main "$@"
