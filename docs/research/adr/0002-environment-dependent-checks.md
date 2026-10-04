# ADR 0002: Environment-dependent checks skip or warn, never fail

**Status:** Accepted (2026-10-03)

## Context

Validators for sharding, multi-member replication, authentication and
Enterprise-only features (auditing) reported failures when run on the default
single-node, no-auth lab. Real defects were invisible in a wall of expected
failures, and CI had been written to ignore every validator exit code.

## Decision

A check that cannot pass in the current environment must either

1. detect the environment up front and exit 0 with an explicit `SKIPPED`
   notice naming what is required (sharding module, `db.hello().msg !== "isdbgrid"`), or
2. be recorded as a *warning* with the reason appended (secondary-dependent
   replication checks on a single-node set; authentication checks when the
   server runs without `--auth`; Enterprise features).

Failure markers (`✗`, `❌`) are reserved for defects. The module matrix runner
(`scripts/utilities/run_module_matrix.sh`) treats any failure marker, uncaught
exception or non-zero exit as a failure, and CI depends on that.

## Consequences

* The matrix is a trustworthy signal; it went from 22 failing scripts to zero
  without hiding anything.
* Environment-dependent modules are additionally exercised where their
  environment exists: the sharding module runs against a real sharded cluster
  in a dedicated CI job.
