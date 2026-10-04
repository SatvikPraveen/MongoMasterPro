#!/usr/bin/env node
// Parse every JavaScript file in the repository with V8 (node --check) so that
// syntax errors are caught without a running MongoDB. mongosh scripts are plain
// JavaScript, so this is a cheap first gate before the database matrix.
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("../../", import.meta.url).pathname;
const SKIP = new Set(["node_modules", ".git", "results"]);

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.(c|m)?js$/.test(entry)) yield full;
  }
}

let failures = 0;
let checked = 0;
for (const file of walk(ROOT)) {
  checked++;
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (err) {
    failures++;
    console.error(`✗ ${relative(ROOT, file)}\n${err.stderr.toString()}`);
  }
}
console.log(`${checked - failures}/${checked} JavaScript files parse cleanly`);
process.exit(failures ? 1 : 0);
