# ADR 0005: Every script is executed in CI against three MongoDB versions

**Status:** Accepted (2026-10-03)

## Context

The previous pipeline ran a handful of validators with `|| echo` after each,
so it could not fail. Its own documentation claimed a verified state that a
fresh checkout did not reproduce.

## Decision

CI consists of independent gates, each of which fails the build:

1. **lint** — V8 parse of every JavaScript file, ESLint with mongosh globals,
   black/isort/flake8, shellcheck, compose file validation;
2. **python-tests** — generator unit tests plus a cross-process determinism check;
3. **modules** (matrix over MongoDB 6.0, 7.0, 8.0) — bootstrap, generate and
   import the lite dataset, validate it against schema and manifest, run every
   module script through the matrix runner, run the Node suites, smoke-run the
   experiment harness; logs are uploaded as artifacts;
4. **sharded** — bring up the compose sharded cluster and run the sharding
   module through mongos;
5. **docker-image** and **security** (gitleaks).

`make ci-local` runs the same gates against a local container.

## Consequences

* Compatibility claims in the README are backed by the matrix, not asserted.
* A new MongoDB major version is a one-line change to the matrix.
