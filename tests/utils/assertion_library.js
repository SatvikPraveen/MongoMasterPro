// File: tests/utils/assertion_library.js
// Custom Assertion Library for MongoMasterPro Tests

class AssertionLibrary {
  constructor() {
    this.passedAssertions = 0;
    this.failedAssertions = 0;
    this.assertions = [];
  }

  // Basic Equality Assertions
  assertEqual(actual, expected, message = "") {
    const assertion = {
      type: "assertEqual",
      actual,
      expected,
      message,
      passed: actual === expected,
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(`✅ PASS: ${message || `${actual} === ${expected}`}`);
    } else {
      this.failedAssertions++;
      console.error(
        `❌ FAIL: ${message || `Expected ${expected}, got ${actual}`}`
      );
      console.error(`   Actual: ${JSON.stringify(actual)}`);
      console.error(`   Expected: ${JSON.stringify(expected)}`);
      throw new Error(
        `Assertion failed: ${message || `Expected ${expected}, got ${actual}`}`
      );
    }

    return assertion.passed;
  }

  assertNotEqual(actual, expected, message = "") {
    const assertion = {
      type: "assertNotEqual",
      actual,
      expected,
      message,
      passed: actual !== expected,
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(`✅ PASS: ${message || `${actual} !== ${expected}`}`);
    } else {
      this.failedAssertions++;
      console.error(
        `❌ FAIL: ${message || `Expected ${actual} to not equal ${expected}`}`
      );
      throw new Error(
        `Assertion failed: ${
          message || `Expected ${actual} to not equal ${expected}`
        }`
      );
    }

    return assertion.passed;
  }

  // Deep Equality Assertions
  assertDeepEqual(actual, expected, message = "") {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    const assertion = {
      type: "assertDeepEqual",
      actual,
      expected,
      message,
      passed: actualStr === expectedStr,
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(`✅ PASS: ${message || "Objects are deeply equal"}`);
    } else {
      this.failedAssertions++;
      console.error(`❌ FAIL: ${message || "Objects are not deeply equal"}`);
      console.error(`   Actual: ${actualStr}`);
      console.error(`   Expected: ${expectedStr}`);
      throw new Error(
        `Assertion failed: ${message || "Objects are not deeply equal"}`
      );
    }

    return assertion.passed;
  }

  // Boolean Assertions
  assertTrue(value, message = "") {
    const assertion = {
      type: "assertTrue",
      value,
      message,
      passed: Boolean(value),
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(`✅ PASS: ${message || `Value is truthy: ${value}`}`);
    } else {
      this.failedAssertions++;
      console.error(
        `❌ FAIL: ${message || `Expected truthy value, got: ${value}`}`
      );
      throw new Error(
        `Assertion failed: ${message || `Expected truthy value, got: ${value}`}`
      );
    }

    return assertion.passed;
  }

  assertFalse(value, message = "") {
    const assertion = {
      type: "assertFalse",
      value,
      message,
      passed: !Boolean(value),
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(`✅ PASS: ${message || `Value is falsy: ${value}`}`);
    } else {
      this.failedAssertions++;
      console.error(
        `❌ FAIL: ${message || `Expected falsy value, got: ${value}`}`
      );
      throw new Error(
        `Assertion failed: ${message || `Expected falsy value, got: ${value}`}`
      );
    }

    return assertion.passed;
  }

  // Null/Undefined Assertions
  assertNull(value, message = "") {
    const assertion = {
      type: "assertNull",
      value,
      message,
      passed: value === null,
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(`✅ PASS: ${message || "Value is null"}`);
    } else {
      this.failedAssertions++;
      console.error(`❌ FAIL: ${message || `Expected null, got: ${value}`}`);
      throw new Error(
        `Assertion failed: ${message || `Expected null, got: ${value}`}`
      );
    }

    return assertion.passed;
  }

  assertNotNull(value, message = "") {
    const assertion = {
      type: "assertNotNull",
      value,
      message,
      passed: value !== null,
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(`✅ PASS: ${message || "Value is not null"}`);
    } else {
      this.failedAssertions++;
      console.error(
        `❌ FAIL: ${message || "Expected non-null value, got null"}`
      );
      throw new Error(
        `Assertion failed: ${message || "Expected non-null value, got null"}`
      );
    }

    return assertion.passed;
  }

  assertUndefined(value, message = "") {
    const assertion = {
      type: "assertUndefined",
      value,
      message,
      passed: value === undefined,
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(`✅ PASS: ${message || "Value is undefined"}`);
    } else {
      this.failedAssertions++;
      console.error(
        `❌ FAIL: ${message || `Expected undefined, got: ${value}`}`
      );
      throw new Error(
        `Assertion failed: ${message || `Expected undefined, got: ${value}`}`
      );
    }

    return assertion.passed;
  }

  assertNotUndefined(value, message = "") {
    const assertion = {
      type: "assertNotUndefined",
      value,
      message,
      passed: value !== undefined,
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(`✅ PASS: ${message || "Value is not undefined"}`);
    } else {
      this.failedAssertions++;
      console.error(
        `❌ FAIL: ${message || "Expected defined value, got undefined"}`
      );
      throw new Error(
        `Assertion failed: ${
          message || "Expected defined value, got undefined"
        }`
      );
    }

    return assertion.passed;
  }

  // Numeric Assertions
  assertGreaterThan(actual, expected, message = "") {
    const assertion = {
      type: "assertGreaterThan",
      actual,
      expected,
      message,
      passed: actual > expected,
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(`✅ PASS: ${message || `${actual} > ${expected}`}`);
    } else {
      this.failedAssertions++;
      console.error(
        `❌ FAIL: ${
          message || `Expected ${actual} to be greater than ${expected}`
        }`
      );
      throw new Error(
        `Assertion failed: ${
          message || `Expected ${actual} to be greater than ${expected}`
        }`
      );
    }

    return assertion.passed;
  }

  assertGreaterThanOrEqual(actual, expected, message = "") {
    const assertion = {
      type: "assertGreaterThanOrEqual",
      actual,
      expected,
      message,
      passed: actual >= expected,
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(`✅ PASS: ${message || `${actual} >= ${expected}`}`);
    } else {
      this.failedAssertions++;
      console.error(
        `❌ FAIL: ${message || `Expected ${actual} to be >= ${expected}`}`
      );
      throw new Error(
        `Assertion failed: ${
          message || `Expected ${actual} to be >= ${expected}`
        }`
      );
    }

    return assertion.passed;
  }

  assertLessThan(actual, expected, message = "") {
    const assertion = {
      type: "assertLessThan",
      actual,
      expected,
      message,
      passed: actual < expected,
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(`✅ PASS: ${message || `${actual} < ${expected}`}`);
    } else {
      this.failedAssertions++;
      console.error(
        `❌ FAIL: ${
          message || `Expected ${actual} to be less than ${expected}`
        }`
      );
      throw new Error(
        `Assertion failed: ${
          message || `Expected ${actual} to be less than ${expected}`
        }`
      );
    }

    return assertion.passed;
  }

  assertLessThanOrEqual(actual, expected, message = "") {
    const assertion = {
      type: "assertLessThanOrEqual",
      actual,
      expected,
      message,
      passed: actual <= expected,
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(`✅ PASS: ${message || `${actual} <= ${expected}`}`);
    } else {
      this.failedAssertions++;
      console.error(
        `❌ FAIL: ${message || `Expected ${actual} to be <= ${expected}`}`
      );
      throw new Error(
        `Assertion failed: ${
          message || `Expected ${actual} to be <= ${expected}`
        }`
      );
    }

    return assertion.passed;
  }

  // Array Assertions
  assertArrayLength(array, expectedLength, message = "") {
    const actualLength = Array.isArray(array) ? array.length : null;
    const assertion = {
      type: "assertArrayLength",
      array,
      actualLength,
      expectedLength,
      message,
      passed: actualLength === expectedLength,
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(`✅ PASS: ${message || `Array length is ${expectedLength}`}`);
    } else {
      this.failedAssertions++;
      console.error(
        `❌ FAIL: ${
          message ||
          `Expected array length ${expectedLength}, got ${actualLength}`
        }`
      );
      throw new Error(
        `Assertion failed: ${
          message ||
          `Expected array length ${expectedLength}, got ${actualLength}`
        }`
      );
    }

    return assertion.passed;
  }

  assertArrayContains(array, element, message = "") {
    const contains = Array.isArray(array) && array.includes(element);
    const assertion = {
      type: "assertArrayContains",
      array,
      element,
      message,
      passed: contains,
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(
        `✅ PASS: ${message || `Array contains element: ${element}`}`
      );
    } else {
      this.failedAssertions++;
      console.error(
        `❌ FAIL: ${message || `Expected array to contain: ${element}`}`
      );
      console.error(`   Array: ${JSON.stringify(array)}`);
      throw new Error(
        `Assertion failed: ${
          message || `Expected array to contain: ${element}`
        }`
      );
    }

    return assertion.passed;
  }

  assertArrayNotContains(array, element, message = "") {
    const contains = Array.isArray(array) && array.includes(element);
    const assertion = {
      type: "assertArrayNotContains",
      array,
      element,
      message,
      passed: !contains,
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(
        `✅ PASS: ${message || `Array does not contain element: ${element}`}`
      );
    } else {
      this.failedAssertions++;
      console.error(
        `❌ FAIL: ${message || `Expected array to not contain: ${element}`}`
      );
      console.error(`   Array: ${JSON.stringify(array)}`);
      throw new Error(
        `Assertion failed: ${
          message || `Expected array to not contain: ${element}`
        }`
      );
    }

    return assertion.passed;
  }

  // Object Assertions
  assertHasProperty(object, property, message = "") {
    const hasProperty =
      object && typeof object === "object" && property in object;
    const assertion = {
      type: "assertHasProperty",
      object,
      property,
      message,
      passed: hasProperty,
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(`✅ PASS: ${message || `Object has property: ${property}`}`);
    } else {
      this.failedAssertions++;
      console.error(
        `❌ FAIL: ${message || `Expected object to have property: ${property}`}`
      );
      console.error(`   Object: ${JSON.stringify(object)}`);
      throw new Error(
        `Assertion failed: ${
          message || `Expected object to have property: ${property}`
        }`
      );
    }

    return assertion.passed;
  }

  assertPropertyValue(object, property, expectedValue, message = "") {
    const hasProperty =
      object && typeof object === "object" && property in object;
    const actualValue = hasProperty ? object[property] : undefined;
    const assertion = {
      type: "assertPropertyValue",
      object,
      property,
      actualValue,
      expectedValue,
      message,
      passed: hasProperty && actualValue === expectedValue,
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(
        `✅ PASS: ${
          message || `Property ${property} has value: ${expectedValue}`
        }`
      );
    } else {
      this.failedAssertions++;
      const errorMsg = !hasProperty
        ? `Object does not have property: ${property}`
        : `Expected property ${property} to be ${expectedValue}, got ${actualValue}`;
      console.error(`❌ FAIL: ${message || errorMsg}`);
      throw new Error(`Assertion failed: ${message || errorMsg}`);
    }

    return assertion.passed;
  }

  // Type Assertions
  assertType(value, expectedType, message = "") {
    const actualType = typeof value;
    const assertion = {
      type: "assertType",
      value,
      actualType,
      expectedType,
      message,
      passed: actualType === expectedType,
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(`✅ PASS: ${message || `Value is of type: ${expectedType}`}`);
    } else {
      this.failedAssertions++;
      console.error(
        `❌ FAIL: ${
          message || `Expected type ${expectedType}, got ${actualType}`
        }`
      );
      throw new Error(
        `Assertion failed: ${
          message || `Expected type ${expectedType}, got ${actualType}`
        }`
      );
    }

    return assertion.passed;
  }

  assertInstanceOf(value, expectedClass, message = "") {
    const isInstance = value instanceof expectedClass;
    const assertion = {
      type: "assertInstanceOf",
      value,
      expectedClass: expectedClass.name,
      message,
      passed: isInstance,
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(
        `✅ PASS: ${message || `Value is instance of: ${expectedClass.name}`}`
      );
    } else {
      this.failedAssertions++;
      console.error(
        `❌ FAIL: ${message || `Expected instance of ${expectedClass.name}`}`
      );
      throw new Error(
        `Assertion failed: ${
          message || `Expected instance of ${expectedClass.name}`
        }`
      );
    }

    return assertion.passed;
  }

  // String Assertions
  assertStringContains(string, substring, message = "") {
    const contains = typeof string === "string" && string.includes(substring);
    const assertion = {
      type: "assertStringContains",
      string,
      substring,
      message,
      passed: contains,
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(`✅ PASS: ${message || `String contains: ${substring}`}`);
    } else {
      this.failedAssertions++;
      console.error(
        `❌ FAIL: ${message || `Expected string to contain: ${substring}`}`
      );
      console.error(`   String: "${string}"`);
      throw new Error(
        `Assertion failed: ${
          message || `Expected string to contain: ${substring}`
        }`
      );
    }

    return assertion.passed;
  }

  assertStringMatches(string, pattern, message = "") {
    const matches = typeof string === "string" && pattern.test(string);
    const assertion = {
      type: "assertStringMatches",
      string,
      pattern: pattern.toString(),
      message,
      passed: matches,
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(
        `✅ PASS: ${message || `String matches pattern: ${pattern}`}`
      );
    } else {
      this.failedAssertions++;
      console.error(
        `❌ FAIL: ${message || `Expected string to match pattern: ${pattern}`}`
      );
      console.error(`   String: "${string}"`);
      throw new Error(
        `Assertion failed: ${
          message || `Expected string to match pattern: ${pattern}`
        }`
      );
    }

    return assertion.passed;
  }

  // Error/Exception Assertions
  async assertThrows(asyncFunction, expectedError = null, message = "") {
    let threwError = false;
    let actualError = null;

    try {
      await asyncFunction();
    } catch (error) {
      threwError = true;
      actualError = error;
    }

    const errorMatches = expectedError
      ? actualError &&
        (actualError.message === expectedError ||
          actualError.name === expectedError)
      : threwError;

    const assertion = {
      type: "assertThrows",
      expectedError,
      actualError: actualError ? actualError.message : null,
      message,
      passed: errorMatches,
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(`✅ PASS: ${message || "Function threw expected error"}`);
    } else {
      this.failedAssertions++;
      const errorMsg = !threwError
        ? "Expected function to throw an error"
        : `Expected error "${expectedError}", got "${actualError?.message}"`;
      console.error(`❌ FAIL: ${message || errorMsg}`);
      throw new Error(`Assertion failed: ${message || errorMsg}`);
    }

    return assertion.passed;
  }

  async assertDoesNotThrow(asyncFunction, message = "") {
    let threwError = false;
    let actualError = null;

    try {
      await asyncFunction();
    } catch (error) {
      threwError = true;
      actualError = error;
    }

    const assertion = {
      type: "assertDoesNotThrow",
      actualError: actualError ? actualError.message : null,
      message,
      passed: !threwError,
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(`✅ PASS: ${message || "Function did not throw error"}`);
    } else {
      this.failedAssertions++;
      console.error(
        `❌ FAIL: ${
          message ||
          `Expected function not to throw, but got: ${actualError?.message}`
        }`
      );
      throw new Error(
        `Assertion failed: ${
          message ||
          `Expected function not to throw, but got: ${actualError?.message}`
        }`
      );
    }

    return assertion.passed;
  }

  // MongoDB-specific Assertions
  assertValidObjectId(objectId, message = "") {
    const isValid =
      typeof objectId === "string" && /^[0-9a-fA-F]{24}$/.test(objectId);
    const assertion = {
      type: "assertValidObjectId",
      objectId,
      message,
      passed: isValid,
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(`✅ PASS: ${message || "Valid ObjectId format"}`);
    } else {
      this.failedAssertions++;
      console.error(
        `❌ FAIL: ${message || `Invalid ObjectId format: ${objectId}`}`
      );
      throw new Error(
        `Assertion failed: ${message || `Invalid ObjectId format: ${objectId}`}`
      );
    }

    return assertion.passed;
  }

  assertDocumentExists(document, message = "") {
    const exists = document !== null && document !== undefined;
    const assertion = {
      type: "assertDocumentExists",
      document,
      message,
      passed: exists,
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(`✅ PASS: ${message || "Document exists"}`);
    } else {
      this.failedAssertions++;
      console.error(`❌ FAIL: ${message || "Expected document to exist"}`);
      throw new Error(
        `Assertion failed: ${message || "Expected document to exist"}`
      );
    }

    return assertion.passed;
  }

  assertIndexExists(indexInfo, indexName, message = "") {
    const exists =
      Array.isArray(indexInfo) &&
      indexInfo.some((index) => index.name === indexName);
    const assertion = {
      type: "assertIndexExists",
      indexInfo,
      indexName,
      message,
      passed: exists,
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(`✅ PASS: ${message || `Index exists: ${indexName}`}`);
    } else {
      this.failedAssertions++;
      console.error(
        `❌ FAIL: ${message || `Expected index to exist: ${indexName}`}`
      );
      console.error(
        `   Available indexes: ${indexInfo.map((i) => i.name).join(", ")}`
      );
      throw new Error(
        `Assertion failed: ${
          message || `Expected index to exist: ${indexName}`
        }`
      );
    }

    return assertion.passed;
  }

  // Performance Assertions
  assertExecutionTime(executionTimeMs, maxTimeMs, message = "") {
    const assertion = {
      type: "assertExecutionTime",
      executionTimeMs,
      maxTimeMs,
      message,
      passed: executionTimeMs <= maxTimeMs,
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(
        `✅ PASS: ${
          message || `Execution time ${executionTimeMs}ms <= ${maxTimeMs}ms`
        }`
      );
    } else {
      this.failedAssertions++;
      console.error(
        `❌ FAIL: ${
          message ||
          `Execution time ${executionTimeMs}ms exceeded ${maxTimeMs}ms`
        }`
      );
      throw new Error(
        `Assertion failed: ${
          message ||
          `Execution time ${executionTimeMs}ms exceeded ${maxTimeMs}ms`
        }`
      );
    }

    return assertion.passed;
  }

  // Statistics and Reporting
  getStatistics() {
    const totalAssertions = this.passedAssertions + this.failedAssertions;
    const passRate =
      totalAssertions > 0
        ? ((this.passedAssertions / totalAssertions) * 100).toFixed(2)
        : 0;

    return {
      total: totalAssertions,
      passed: this.passedAssertions,
      failed: this.failedAssertions,
      passRate: `${passRate}%`,
      assertions: this.assertions,
    };
  }

  getSummary() {
    const stats = this.getStatistics();
    const summary = {
      ...stats,
      assertionTypes: {},
      timeline: this.assertions.map((a) => ({
        type: a.type,
        passed: a.passed,
        timestamp: a.timestamp,
      })),
    };

    // Count assertion types
    this.assertions.forEach((assertion) => {
      if (!summary.assertionTypes[assertion.type]) {
        summary.assertionTypes[assertion.type] = { passed: 0, failed: 0 };
      }
      if (assertion.passed) {
        summary.assertionTypes[assertion.type].passed++;
      } else {
        summary.assertionTypes[assertion.type].failed++;
      }
    });

    return summary;
  }

  printSummary() {
    const stats = this.getStatistics();

    console.log("\n" + "=".repeat(60));
    console.log("                ASSERTION SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total Assertions: ${stats.total}`);
    console.log(`✅ Passed: ${stats.passed}`);
    console.log(`❌ Failed: ${stats.failed}`);
    console.log(`📊 Pass Rate: ${stats.passRate}`);
    console.log("=".repeat(60));

    if (stats.failed > 0) {
      console.log("\nFailed Assertions:");
      this.assertions
        .filter((a) => !a.passed)
        .forEach((assertion, index) => {
          console.log(
            `${index + 1}. ${assertion.type}: ${
              assertion.message || "No message"
            }`
          );
        });
    }

    return stats;
  }

  reset() {
    this.passedAssertions = 0;
    this.failedAssertions = 0;
    this.assertions = [];
    console.log("🔄 Assertion library reset");
  }

  // Custom assertion builder
  custom(testFunction, message = "") {
    const result = testFunction();
    const assertion = {
      type: "custom",
      result,
      message,
      passed: Boolean(result),
      timestamp: new Date(),
    };

    this.assertions.push(assertion);

    if (assertion.passed) {
      this.passedAssertions++;
      console.log(`✅ PASS: ${message || "Custom assertion passed"}`);
    } else {
      this.failedAssertions++;
      console.error(`❌ FAIL: ${message || "Custom assertion failed"}`);
      throw new Error(
        `Assertion failed: ${message || "Custom assertion failed"}`
      );
    }

    return assertion.passed;
  }
}

// Export the AssertionLibrary class
module.exports = { AssertionLibrary };

// Export commonly used assertion methods for direct use
module.exports.assert = {
  equal: (actual, expected, message) =>
    new AssertionLibrary().assertEqual(actual, expected, message),
  true: (value, message) => new AssertionLibrary().assertTrue(value, message),
  false: (value, message) => new AssertionLibrary().assertFalse(value, message),
  null: (value, message) => new AssertionLibrary().assertNull(value, message),
  notNull: (value, message) =>
    new AssertionLibrary().assertNotNull(value, message),
};
