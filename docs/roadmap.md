# Roadmap

**Current release:** 2.0.0 (October 2026). See `CHANGELOG.md` for what it
contains and `docs/research/adr/` for the decisions behind it.

## Where the project stands

| Area | State |
|------|-------|
| Learning modules 00–11 | 49/49 scripts pass on a fresh MongoDB 7.0 and on re-run; CI exercises 6.0, 7.0 and 8.0 |
| Reference dataset | deterministic, checksummed, validated (38 checks), documented in a data card |
| Experiments | six experiments with committed baseline, generated report and figures |
| Topologies | single node, 3-member replica set with auth, sharded cluster (config RS + 2 shards + mongos) |
| Verification | module matrix, Node suites, Python tests, lint, shellcheck, secret scan, Dependabot |

## Planned

### Measurement depth
- Baselines on a multi-member replica set (`make start-rs`) so E04's
  `majority` level measures replication, not only journaling.
- Cold-cache variants that restart the server between trials.
- A concurrent-load harness (driver-based, configurable client count) for
  throughput-under-load versions of E01 and E05.
- Baselines at larger `--scale` values where collections exceed the
  WiredTiger cache.
- Committed baselines for MongoDB 6.0 and 8.0 alongside 7.0.

### New experiments
- E07 Shard key choice (hashed vs ranged vs compound) and insert hotspots on
  the sharded cluster.
- E08 Covered queries and projection size.
- E09 Read concern (`local` vs `majority`) and read preference latency on a
  replica set.
- E10 Time-series collections vs ordinary collections for the events workload.
- E11 Change-stream delivery latency under write load.

### Modules and documentation
- Module 12: time-series collections and window functions on them.
- Module 13: Queryable Encryption and client-side field-level encryption
  with a local KMS.
- Jupyter notebooks that load `experiments/results/summary/*.csv` for
  interactive exploration.
- Instructor notes per module (learning objectives, common mistakes,
  assessment questions).

### Engineering
- Unify the camelCase lab schema and the snake_case reference schema once the
  modules have per-module fixtures (tracked as a long-term item; see ADR 0001
  for why it was deferred).
- Container image with the Python and Node toolchains preinstalled so
  `make ci-local` needs no host dependencies.

## Contributing to the roadmap

Open an issue with the *experiment proposal* template for new experiments,
or a regular issue for modules and tooling. Items move to "planned" when they
have an owner and a verification criterion.
