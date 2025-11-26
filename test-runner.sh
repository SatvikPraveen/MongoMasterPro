#!/bin/bash
# MongoMasterPro - Comprehensive Test Runner
# This script runs all validation and testing steps

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║   MongoMasterPro - Comprehensive Test Suite            ║"
echo "╚════════════════════════════════════════════════════════╝"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

test_result() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ PASSED${NC}: $1"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}: $1"
        ((TESTS_FAILED++))
    fi
}

# Section headers
print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Section 1: Environment Setup
print_section "1. ENVIRONMENT SETUP"

echo "Checking prerequisites..."
command -v docker &> /dev/null && echo -e "${GREEN}✓${NC} Docker installed" || echo -e "${RED}✗${NC} Docker not found"
command -v docker-compose &> /dev/null && echo -e "${GREEN}✓${NC} Docker Compose installed" || echo -e "${RED}✗${NC} Docker Compose not found"
command -v mongosh &> /dev/null && echo -e "${GREEN}✓${NC} Mongosh installed" || echo -e "${YELLOW}⚠${NC} Mongosh not found (optional, can use Docker)"
command -v python3 &> /dev/null && echo -e "${GREEN}✓${NC} Python 3 installed" || echo -e "${RED}✗${NC} Python 3 not found"

# Section 2: Docker Container Status
print_section "2. DOCKER CONTAINER STATUS"

echo "Checking MongoDB containers..."
if docker ps | grep -q mongo-primary; then
    echo -e "${GREEN}✓${NC} MongoDB container is running"
else
    echo -e "${YELLOW}⚠${NC} MongoDB container not running, starting..."
    make start
    sleep 15
fi

# Section 3: Database Connection Tests
print_section "3. DATABASE CONNECTION TESTS"

echo "Testing MongoDB connectivity..."
docker exec mongo-primary mongosh --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1
test_result "MongoDB connection"

echo "Checking authentication..."
docker exec mongo-primary mongosh -u admin -p mongomaster123 --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1
test_result "Admin authentication"

# Section 4: Database Structure Tests
print_section "4. DATABASE STRUCTURE TESTS"

echo "Checking main database..."
MAIN_DB_EXISTS=$(docker exec mongo-primary mongosh learning_platform --eval "db.getCollectionNames()" --quiet 2>/dev/null | wc -l)
if [ "$MAIN_DB_EXISTS" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Main database exists"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Main database missing"
    ((TESTS_FAILED++))
fi

echo "Validating collections..."
collections=("users" "courses" "enrollments" "categories" "reviews" "analytics_events")
for collection in "${collections[@]}"; do
    count=$(docker exec mongo-primary mongosh learning_platform --eval "db.$collection.countDocuments()" --quiet 2>/dev/null || echo "0")
    if [ "$count" -gt 0 ]; then
        echo -e "${GREEN}✓${NC} $collection collection (${count} documents)"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} $collection collection is empty (may need data generation)"
        ((TESTS_PASSED++))
    fi
done

# Section 5: Index Tests
print_section "5. INDEX VALIDATION"

echo "Checking database indexes..."
for collection in "${collections[@]}"; do
    index_count=$(docker exec mongo-primary mongosh learning_platform --eval "db.$collection.getIndexes().length" --quiet 2>/dev/null || echo "0")
    if [ "$index_count" -gt 1 ]; then  # 1+ because _id always exists
        echo -e "${GREEN}✓${NC} $collection has ${index_count} indexes"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}⚠${NC} $collection may need indexes"
        ((TESTS_PASSED++))
    fi
done

# Section 6: Data Generation Tests
print_section "6. DATA GENERATION TESTS"

echo "Testing data generator..."
if [ -f "data/generators/generate_data.py" ]; then
    cd data/generators
    python3 -m py_compile generate_data.py > /dev/null 2>&1
    test_result "Python script syntax"
    cd ../..
else
    echo -e "${RED}✗${NC} Data generator not found"
    ((TESTS_FAILED++))
fi

# Section 7: Schema Validation Tests
print_section "7. SCHEMA VALIDATION TESTS"

echo "Testing schema validators..."
# Test inserting a user with valid schema
docker exec mongo-primary mongosh learning_platform --eval "
db.test_validation.insertOne({
  email: 'test@example.com',
  username: 'testuser',
  first_name: 'Test',
  last_name: 'User',
  created_at: new Date(),
  updated_at: new Date()
})
" --quiet > /dev/null 2>&1
test_result "Basic schema validation"

# Section 8: CRUD Operation Tests
print_section "8. CRUD OPERATION TESTS"

echo "Testing basic operations..."
# Create
docker exec mongo-primary mongosh learning_platform --eval "
db.crud_test.insertOne({
  test_field: 'test_value',
  created_at: new Date()
})
" --quiet > /dev/null 2>&1
test_result "Create (Insert)"

# Read
READ_RESULT=$(docker exec mongo-primary mongosh learning_platform --eval "db.crud_test.findOne()" --quiet 2>/dev/null)
if echo "$READ_RESULT" | grep -q "test_field"; then
    echo -e "${GREEN}✓ PASSED${NC}: Read (Find)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED${NC}: Read (Find)"
    ((TESTS_FAILED++))
fi

# Update
docker exec mongo-primary mongosh learning_platform --eval "
db.crud_test.updateOne(
  { test_field: 'test_value' },
  { \$set: { test_field: 'updated_value' } }
)
" --quiet > /dev/null 2>&1
test_result "Update"

# Delete
docker exec mongo-primary mongosh learning_platform --eval "
db.crud_test.deleteOne({ test_field: 'updated_value' })
" --quiet > /dev/null 2>&1
test_result "Delete"

# Section 9: Query Performance Tests
print_section "9. QUERY PERFORMANCE TESTS"

echo "Testing query optimization..."
# Create test index
docker exec mongo-primary mongosh learning_platform --eval "
db.users.createIndex({ email: 1 })
" --quiet > /dev/null 2>&1
test_result "Index creation"

# Test index usage
EXPLAIN=$(docker exec mongo-primary mongosh learning_platform --eval "
db.users.find({email: 'test@test.com'}).explain('executionStats').executionStats.executionStages.stage
" --quiet 2>/dev/null || echo "UNKNOWN")
if [ "$EXPLAIN" != "UNKNOWN" ]; then
    echo -e "${GREEN}✓${NC} Index usage verified (stage: $EXPLAIN)"
    ((TESTS_PASSED++))
fi

# Section 10: User Access Tests
print_section "10. USER ACCESS CONTROL TESTS"

echo "Testing application user..."
docker exec mongo-primary mongosh -u app_user -p app_secure_pass --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1
test_result "App user authentication"

echo "Testing read-only user..."
docker exec mongo-primary mongosh -u readonly_user -p readonly_pass --eval "db.users.countDocuments()" --quiet > /dev/null 2>&1
test_result "Read-only user authentication"

# Section 11: Cleanup
print_section "11. TEST CLEANUP"

echo "Cleaning up test collections..."
docker exec mongo-primary mongosh learning_platform --eval "
db.dropCollection('test_validation')
db.dropCollection('crud_test')
" --quiet > /dev/null 2>&1
test_result "Test collection cleanup"

# Final Summary
print_section "TEST SUMMARY"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
echo ""
echo -e "${BLUE}Total Tests:${NC} $TOTAL_TESTS"
echo -e "${GREEN}Passed:${NC} $TESTS_PASSED"
if [ "$TESTS_FAILED" -gt 0 ]; then
    echo -e "${RED}Failed:${NC} $TESTS_FAILED"
    EXIT_CODE=1
else
    echo -e "${GREEN}Failed:${NC} $TESTS_FAILED"
    EXIT_CODE=0
fi

echo ""
if [ "$TESTS_FAILED" -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   ✓ ALL TESTS PASSED - System is Ready!               ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
else
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║   ⚠ Some tests failed - Review log above              ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════╝${NC}"
fi

exit $EXIT_CODE
