// ESLint flat config. The repository holds two kinds of JavaScript:
//   * mongosh scripts (scripts/**, docker/init/**, experiments/**) that run with
//     the shell's globals (db, rs, sh, print, ObjectId, ...)
//   * Node modules (tests/**, scripts/utilities/*.mjs)
// The goal is to catch genuine mistakes (undefined identifiers, unreachable
// code, duplicate keys) without imposing a style regime on teaching material.
import globals from "globals";

const mongoshGlobals = {
  db: "writable",
  rs: "readonly",
  sh: "readonly",
  use: "readonly",
  print: "readonly",
  printjson: "readonly",
  load: "readonly",
  sleep: "readonly",
  quit: "readonly",
  arguments: "readonly",
  ObjectId: "readonly",
  ISODate: "readonly",
  NumberInt: "readonly",
  NumberLong: "readonly",
  NumberDecimal: "readonly",
  Decimal128: "readonly",
  Timestamp: "readonly",
  UUID: "readonly",
  BinData: "readonly",
  Mongo: "readonly",
  Code: "readonly",
  DBRef: "readonly",
  MinKey: "readonly",
  MaxKey: "readonly",
  tojson: "readonly",
  EJSON: "readonly",
  cat: "readonly",
  version: "readonly",
  bsonsize: "readonly",
  BSON: "readonly",
};

const relaxedRules = {
  "no-unused-vars": "off",
  "no-empty": ["error", { allowEmptyCatch: true }],
  "no-prototype-builtins": "off",
  "no-useless-escape": "off",
  "no-constant-condition": ["error", { checkLoops: false }],
  "no-inner-declarations": "off",
  "no-redeclare": "off",
  "no-case-declarations": "off",
};

export default [
  {
    ignores: ["node_modules/**", "experiments/results/**", "docs/**", "data/generated/**"],
  },
  {
    files: ["scripts/**/*.js", "docker/init/**/*.js", "experiments/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: { ...globals.node, ...mongoshGlobals },
    },
    rules: {
      "no-undef": "error",
      "no-dupe-keys": "error",
      "no-unreachable": "error",
      ...relaxedRules,
    },
  },
  {
    files: ["experiments/specs/*.js"],
    languageOptions: { globals: { MMP: "readonly" } },
  },
  {
    files: ["tests/**/*.js", "scripts/utilities/*.mjs", "tests/**/*.mjs", "eslint.config.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-undef": "error",
      "no-dupe-keys": "error",
      "no-unreachable": "error",
      ...relaxedRules,
    },
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: { sourceType: "commonjs" },
  },
];
