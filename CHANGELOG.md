# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [2.0.0] — 2026-10-03

A ground-up rework toward a reproducible, verifiable platform. The 1.x line
contained teaching material of which 22 of 55 scripts failed on MongoDB 7.0
and a CI pipeline that could not fail; this release makes every claim
checkable.

### Added
- Deterministic, checksummed reference dataset generator with manifest,
  Extended JSON output, PyMongo import and a data card (`data/DATA_CARD.md`).
- `scripts/00_setup/validate_reference.js`: schema, index, count, validator
  compliance, referential integrity and counter-consistency checks (38 checks).
- Experiment harness (`experiments/`): six experiments (E01–E06), blocked
  randomised trials, environment provenance, rank-based analysis with
  bootstrap CIs, Mann-Whitney U, Holm correction and Cliff's delta,
  generated figures and report; committed baseline on MongoDB 7.0.
- Sharded cluster compose file (`docker/docker-compose.sharded.yml`) and a CI
  job that runs the sharding module through mongos.
- Module matrix runner (`scripts/utilities/run_module_matrix.sh`), Node test
  runner, V8 syntax gate, ESLint configuration with mongosh globals, Python
  test suite (13 tests), black/isort/flake8 configuration.
- Multi-version CI (MongoDB 6.0, 7.0, 8.0), Dependabot, issue and PR templates.
- Research documentation: methodology, threats to validity, annotated
  bibliography, five architecture decision records, `CITATION.cff`,
  `SECURITY.md`, this changelog.
- Makefile rewritten around the new layout (`make setup`, `make matrix`,
  `make experiments`, `make analyze`, `make ci-local`).

### Changed
- Two-database layout formalised (ADR 0001): `learning_platform` is the
  strict reference dataset; `mongomasterpro` is the disposable lab for
  modules 01–05; modules 06–11 use `mmp_<module>` sandboxes.
- Environment-dependent checks (sharding, multi-member replication,
  authentication, Enterprise features) skip or warn instead of failing (ADR 0002).
- `analytics_events` TTL index moved from `timestamp` to an opt-in
  `expire_at` field so the reference dataset is not expired on import.
- Dependencies pinned exactly; unused packages removed.
- Internal status reports consolidated into `docs/history/`.

### Fixed
- 49/49 module scripts now run cleanly on a fresh MongoDB 7.0 single-node
  replica set and again on re-run; 4/4 Node suites pass. Fixes include
  invalid window operators (`$rowNumber`, `$percentRank`, arithmetic inside
  `$setWindowFields` output), `$geoWithin` inside `$expr`, legacy shell APIs
  (`getSessionId`, `Object.bsonsize`, `Timestamp.getTimestamp`), blocking
  change-stream cursors, an un-awaited async insert that truncated the shell
  data generator, string multiplication (`"=" * 50`) in 203 places,
  non-idempotent fixtures, and explain-plan assumptions that did not hold
  across versions.
- Duplicate `docker/init/bootstrap.js` removed; filename typos corrected.

## [1.0.0] — 2025-01

Initial public version: eleven learning modules, Docker environments, Python
data generator and documentation. See `docs/history/` for the restoration
notes of that period.
