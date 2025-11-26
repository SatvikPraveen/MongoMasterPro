# Contributing to MongoMasterPro

Thank you for your interest in contributing to MongoMasterPro! This document provides guidelines and instructions for contributing to the project.

## 🎯 Code of Conduct

- Be respectful and inclusive
- Welcome diverse perspectives and experiences
- Focus on constructive feedback
- Help create a safe and welcoming environment

## 💡 Ways to Contribute

### 1. **Reporting Bugs**

Found a bug? Please report it by opening an issue with:

- **Clear title**: Describe the bug concisely
- **Detailed description**: What happened and what you expected
- **Steps to reproduce**: Clear steps to reproduce the issue
- **Environment info**: OS, MongoDB version, Docker version
- **Screenshots/logs**: If applicable, include error messages

**Example:**
```markdown
## Bug: Data generation fails with analytics events

### Description
Running `make data-full` fails with ValueError about weights

### Steps to Reproduce
1. Run `make start`
2. Run `make data-full`
3. Observe error in terminal

### Expected Behavior
Data should be generated successfully

### Actual Behavior
ValueError: The number of weights does not match the population

### Environment
- OS: macOS 13.2
- MongoDB: 7.0
- Docker: 4.20
```

### 2. **Suggesting Enhancements**

Have an idea for improvement? Open an issue with:

- **Clear description**: What would you like improved?
- **Use case**: Why is this important?
- **Alternative solutions**: Have you considered other approaches?
- **Additional context**: Any relevant information

**Example:**
```markdown
## Enhancement: Add TTL index examples

### Description
Add examples of Time-To-Live (TTL) indexes for session management

### Use Case
This would help users understand automatic data expiration patterns

### Current Behavior
No TTL index examples in Module 02

### Proposed Solution
Add a new script: `02_indexes/ttl_indexes.js`
```

### 3. **Improving Documentation**

- Fix typos or clarify confusing sections
- Add more examples or use cases
- Improve code comments
- Create tutorials or guides
- Update outdated information

### 4. **Adding Learning Modules**

Contribute new MongoDB learning content:

- **New script modules** in `scripts/XX_topic/`
- **New aggregation examples** in `scripts/04_aggregation/`
- **Performance tuning guides** in `scripts/10_performance/`
- **Real-world patterns** in `scripts/11_capstones/`

### 5. **Improving Tests & Validation**

- Add unit tests in `tests/unit/`
- Add integration tests in `tests/integration/`
- Improve performance benchmarks
- Add data validation checks

### 6. **Fixing Issues**

Look for issues tagged with:
- `good first issue` - Great for newcomers
- `help wanted` - Need community help
- `bug` - Known issues to fix
- `documentation` - Docs improvements

## 🔧 Development Setup

### Prerequisites

- Docker & Docker Compose
- Python 3.8+
- Node.js 14+ (for mongosh)
- Git
- 8GB+ RAM
- MongoDB shell (mongosh) locally

### Local Setup

```bash
# 1. Fork and clone your fork
git clone https://github.com/YOUR_USERNAME/MongoMasterPro.git
cd MongoMasterPro

# 2. Create a feature branch
git checkout -b feature/your-feature-name
# or for bug fixes
git checkout -b fix/bug-description

# 3. Install dependencies
make install-deps

# 4. Start MongoDB
make start-rs

# 5. Initialize database
make setup

# 6. Verify setup
make validate
```

### Useful Development Commands

```bash
# Start/stop services
make start           # Start MongoDB
make stop            # Stop MongoDB
make restart         # Restart MongoDB
make logs            # View logs
make shell           # Open MongoDB shell

# Data management
make data-lite       # Generate test data
make data-full       # Generate full dataset
make clean-data      # Clear generated data

# Testing & validation
make test            # Run tests
make validate        # Validate setup
make benchmark       # Run benchmarks

# Utilities
make test-all        # Run comprehensive test suite
make backup          # Create backup
make restore         # Restore from backup
```

## 📝 Development Workflow

### 1. **Create a Feature Branch**

```bash
# For new features
git checkout -b feature/add-time-series-indexes

# For bug fixes
git checkout -b fix/data-import-error

# For documentation
git checkout -b docs/add-aggregation-examples
```

### 2. **Make Your Changes**

Follow the code style guidelines below.

### 3. **Test Your Changes**

```bash
# Test your specific module
mongosh --file scripts/XX_module/your_script.js

# Run validation
make validate

# Run full test suite
make test-all
```

### 4. **Commit Your Changes**

```bash
# Check what changed
git status
git diff

# Stage changes
git add .

# Commit with meaningful message
git commit -m "feat: Add TTL index examples to Module 02"
```

### 5. **Push and Create Pull Request**

```bash
# Push your branch
git push origin feature/your-feature-name

# Create PR on GitHub
# Fill out the PR template with:
# - Clear description of changes
# - Why these changes are needed
# - Any related issues (Fixes #123)
# - Testing performed
```

## 📋 Code Style Guidelines

### JavaScript (MongoDB Scripts)

```javascript
// 1. Use meaningful variable names
const userCollection = db.getCollection('users');
const adminUsers = userCollection.find({ role: 'admin' });

// 2. Add comments for complex logic
// Find active users who haven't logged in for 30 days
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const inactiveUsers = userCollection.find({
  isActive: true,
  lastLoginDate: { $lt: thirtyDaysAgo }
});

// 3. Use consistent formatting
const users = db.users.find(
  { 'profile.status': 'active' },
  { projection: { name: 1, email: 1 } }
).toArray();

// 4. Handle errors gracefully
try {
  db.users.insertOne(userData);
} catch (error) {
  print('Insert failed: ' + error.message);
}

// 5. Add descriptive output
print('\n=== User Analysis ===');
print('Total active users: ' + userCollection.countDocuments({ isActive: true }));
print('Inactive users (30+ days): ' + inactiveUsers.length());
```

### Python (Data Generation)

```python
# 1. Follow PEP 8
def generate_user_data(count: int) -> list:
    """Generate synthetic user data.
    
    Args:
        count: Number of users to generate
        
    Returns:
        List of user documents
    """
    users = []
    for i in range(count):
        user = {
            'name': fake.name(),
            'email': fake.email(),
            'created_at': datetime.datetime.now()
        }
        users.append(user)
    return users

# 2. Use type hints
from typing import List, Dict, Any

def validate_user(user: Dict[str, Any]) -> bool:
    """Validate user document structure."""
    required_fields = ['name', 'email', 'created_at']
    return all(field in user for field in required_fields)

# 3. Add docstrings
import logging

# 4. Use logging instead of print
logger = logging.getLogger(__name__)
logger.info(f'Generated {count} users')
logger.error(f'Validation failed for user: {user_id}')
```

### Markdown (Documentation)

```markdown
# Use clear headings
## For each section
### For subsections

**Bold** for emphasis, `code` for inline code.

Use code blocks with language specification:
​```javascript
// MongoDB script
db.users.find()
​```

Use bullet points:
- Item 1
- Item 2

Use tables for structured info:
| Field | Type | Required |
|-------|------|----------|
| name | String | Yes |
| email | String | Yes |
```

## 🧪 Testing Guidelines

### Creating Tests

1. **Unit Tests** (`tests/unit/`)
   - Test individual functions
   - Mock MongoDB operations
   - Test edge cases

2. **Integration Tests** (`tests/integration/`)
   - Test against real MongoDB
   - Test workflows and pipelines
   - Verify data consistency

### Running Tests

```bash
# Run all tests
make test-all

# Run specific test
mongosh test_file.js

# Run with verbose output
./scripts/utilities/test-runner.sh --verbose

# Check specific module
cd scripts/XX_module
mongosh validate_*.js
```

### Test Template

```javascript
// tests/integration/new_feature_test.js

const mongoUri = 'mongodb://admin:mongomaster123@localhost:27017/learning_platform?authSource=admin';
const client = new MongoClient(mongoUri);

async function testNewFeature() {
  try {
    // Setup
    const db = client.db('learning_platform');
    
    // Test 1: Basic functionality
    print('\n📋 Test 1: Basic functionality');
    const result = await db.users.findOne({ _id: 1 });
    assert(result !== null, 'Should find user');
    print('✅ PASSED');
    
    // Test 2: Error handling
    print('\n📋 Test 2: Error handling');
    try {
      await db.users.insertOne({ /* invalid */ });
      print('❌ FAILED - Should throw error');
    } catch (error) {
      print('✅ PASSED - Correctly threw error');
    }
    
  } finally {
    await client.close();
  }
}

testNewFeature().catch(console.error);
```

## 🎓 Adding Learning Modules

### Module Structure

Each learning module should have:

1. **Main script** - `XX_topic/concept_name.js`
2. **Validation script** - `XX_topic/validate_topic.js`
3. **README** (optional) - `XX_topic/README.md`

### Module Template

```javascript
// scripts/XX_module/new_concept.js
/*
 * Module: XX - Topic Name
 * Concept: Brief description of what this teaches
 * Duration: ~5-10 minutes
 * 
 * Learning Outcomes:
 * - Understand concept A
 * - Apply concept B
 * - Implement pattern C
 */

const mongoUri = 'mongodb://app_user:app_secure_pass@localhost:27017/learning_platform';
const { MongoClient } = require('mongodb');

async function learnNewConcept() {
  const client = new MongoClient(mongoUri);
  
  try {
    console.log('\n=== Learning New Concept ===\n');
    
    const db = client.db('learning_platform');
    const collection = db.collection('users');
    
    // Example 1: Basic operation
    console.log('Example 1: Basic operation');
    const result = await collection.findOne({ role: 'student' });
    console.log('Result:', result);
    console.log('');
    
    // Example 2: Advanced pattern
    console.log('Example 2: Advanced pattern');
    const pipeline = [
      { $match: { isActive: true } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ];
    const grouped = await collection.aggregate(pipeline).toArray();
    console.log('Results:', grouped);
    
  } finally {
    await client.close();
  }
}

learnNewConcept().catch(console.error);
```

### Module Validation Template

```javascript
// scripts/XX_module/validate_topic.js

async function validateModule() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  try {
    // Test 1
    print('\n✓ Test 1: Description');
    results.tests.push({ name: 'Test 1', status: 'PASSED' });
    results.passed++;
    
  } catch (error) {
    results.tests.push({ name: 'Test 1', status: 'FAILED', error: error.message });
    results.failed++;
  }
  
  // Summary
  print(`\n📊 Results: ${results.passed} passed, ${results.failed} failed`);
  return results.failed === 0;
}

validateModule().catch(console.error);
```

## 📚 Documentation Standards

### Commit Messages

Use conventional commit format:

```
type(scope): subject

body

footer
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Code style (formatting, missing semicolons)
- `refactor:` - Code refactoring
- `perf:` - Performance improvement
- `test:` - Adding tests
- `chore:` - Maintenance tasks

**Examples:**
```
feat(aggregation): Add window function examples to Module 04

Add comprehensive examples of $rank, $denseRank, and $lag window
functions with real-world use cases in analytics pipelines.

Fixes #42
```

```
fix(data-generation): Correct analytics event weight distribution

Update event weights from 6 to 12 to match event types defined in
schemas.json, resolving ValueError in data generation.

Fixes #38
```

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Learning module
- [ ] Performance improvement

## Related Issues
Fixes #(issue number)

## Testing Performed
- [ ] Ran `make validate`
- [ ] Ran `make test-all`
- [ ] Tested in Docker
- [ ] Tested with lite dataset
- [ ] Tested with full dataset

## Checklist
- [ ] Code follows style guidelines
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally

## Screenshots (if applicable)
<!-- Add screenshots or logs -->

## Additional Notes
Any additional information reviewers should know
```

## 🐛 Bug Fix Workflow

```bash
# 1. Create fix branch
git checkout -b fix/issue-description

# 2. Reproduce the bug
# Add test that demonstrates the bug

# 3. Fix the issue
# Make minimal changes to fix the bug

# 4. Verify fix
make validate
make test-all

# 5. Commit
git commit -m "fix: Brief description of fix

Longer description of what was wrong and how it's fixed.

Fixes #123"

# 6. Push and create PR
git push origin fix/issue-description
```

## ✨ Feature Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/new-capability

# 2. Implement feature
# Follow code style guidelines
# Add comments and docstrings
# Create tests

# 3. Test thoroughly
make test-all
./scripts/utilities/test-runner.sh --verbose

# 4. Update documentation
# Add to README if necessary
# Add code comments
# Create examples

# 5. Commit changes
git commit -m "feat: Add new capability

Description of what the feature does and why it's useful.
Include any breaking changes or migration notes."

# 6. Push and create PR
git push origin feature/new-capability
```

## 🔍 Code Review Process

### What Reviewers Look For

- **Correctness**: Does the code work as intended?
- **Style**: Does it follow project conventions?
- **Tests**: Are changes well-tested?
- **Documentation**: Is it well-documented?
- **Performance**: Does it have acceptable performance?
- **Security**: Are there security concerns?

### Addressing Review Comments

1. Read feedback carefully
2. Ask clarifying questions if needed
3. Make requested changes
4. Commit with descriptive message
5. Request re-review

## 🚀 Release Process

### Version Numbers

We follow [Semantic Versioning](https://semver.org/):
- `MAJOR` - Breaking changes
- `MINOR` - New features (backward compatible)
- `PATCH` - Bug fixes

### Creating a Release

1. Update version in relevant files
2. Update CHANGELOG
3. Create Git tag
4. Push release

## 📞 Communication

### Getting Help

- **Questions**: Open a discussion or issue
- **Bugs**: Open an issue with details
- **Features**: Discuss in issues before implementing
- **Security**: Email maintainer privately

### Community

- Star the repo if you find it useful
- Share it with others
- Write about your MongoDB journey
- Tag us on social media: [@MongoMasterPro](https://github.com/SatvikPraveen/MongoMasterPro)

## 📖 Additional Resources

- [MongoDB Official Documentation](https://docs.mongodb.com/)
- [MongoDB Aggregation Pipeline Guide](https://docs.mongodb.com/manual/reference/operator/aggregation/)
- [MongoDB Best Practices](https://docs.mongodb.com/manual/administration/production-checklist/)
- [Project README](README.md)
- [Quick Start Guide](QUICK_START.md)

## 🙏 Thank You

Thank you for contributing to MongoMasterPro! Your efforts help make MongoDB learning accessible to everyone.

---

**Questions?** Feel free to open an issue or discussion.

**Ready to contribute?** Pick an issue from our [issue tracker](https://github.com/SatvikPraveen/MongoMasterPro/issues) and start coding!

**Happy Contributing! 🚀**
