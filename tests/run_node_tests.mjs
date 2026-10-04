#!/usr/bin/env node
// Runner for the Node-driver based test suites under tests/unit and
// tests/integration. Each suite exports a class with runAllTests(); the runner
// executes them sequentially, prints a summary and exits non-zero on failure.
//
//   MONGODB_URI=mongodb://localhost:27017 node tests/run_node_tests.mjs [unit|integration]
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const SUITES = {
  unit: [
    ["Data quality", "./unit/data_quality_tests.js", "DataQualityTests"],
    ["Schema validation", "./unit/schema_validation_tests.js", "SchemaValidationTests"],
  ],
  integration: [
    ["End-to-end workflow", "./integration/end_to_end_workflow.js", "EndToEndWorkflowTests"],
    ["Cross-module validation", "./integration/cross_module_validation.js", "CrossModuleValidationTests"],
  ],
};

const selected = process.argv[2] ? [process.argv[2]] : Object.keys(SUITES);
const results = [];
for (const group of selected) {
  if (!SUITES[group]) {
    console.error(`Unknown suite group "${group}". Choose: ${Object.keys(SUITES).join(", ")}`);
    process.exit(2);
  }
  for (const [label, file, className] of SUITES[group]) {
    const started = Date.now();
    try {
      const mod = require(file);
      await new mod[className]().runAllTests();
      results.push({ label, ok: true, ms: Date.now() - started });
    } catch (err) {
      results.push({ label, ok: false, ms: Date.now() - started, error: err.message });
    }
  }
}

console.log("\n" + "=".repeat(60));
console.log("NODE TEST SUMMARY");
console.log("=".repeat(60));
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label.padEnd(28)} ${r.ms} ms${r.error ? "  — " + r.error : ""}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`${results.length - failed}/${results.length} suites passed`);
process.exit(failed ? 1 : 0);
