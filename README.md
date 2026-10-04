# MongoMasterPro

**A reproducible MongoDB learning and experimentation platform.** Eleven
executable modules verified against three MongoDB versions, a deterministic
and checksummed reference dataset, and a benchmark harness whose results carry
their own provenance and statistics.

[![CI](https://github.com/SatvikPraveen/MongoMasterPro/actions/workflows/ci.yml/badge.svg)](https://github.com/SatvikPraveen/MongoMasterPro/actions/workflows/ci.yml)
[![MongoDB 6.0 | 7.0 | 8.0](https://img.shields.io/badge/MongoDB-6.0%20%7C%207.0%20%7C%208.0-116149)](.github/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Cite](https://img.shields.io/badge/cite-CITATION.cff-informational)](CITATION.cff)

---

## Why this repository exists

Most MongoDB tutorials assert performance and design claims; this project
measures them. Every lesson is a script that runs end to end and finishes with
assertions; every performance statement in the documentation links to an
experiment with a stated hypothesis, raw samples, confidence intervals and the
exact environment and dataset it was measured on.

| Property | How it is guaranteed |
|----------|---------------------|
| Every module script runs | `make matrix` executes all 50 scripts under `scripts/` and fails on any exception or failure marker; CI does this on MongoDB 6.0, 7.0 and 8.0 |
| The dataset is the same for everyone | `generate_data.py` is seeded end to end; identical parameters give byte-identical files, recorded in a manifest with SHA-256 digests |
| Results are interpretable and reproducible | the harness writes raw per-trial samples with server build, topology, host, versions, git commit and dataset manifest; analysis uses rank-based statistics |
| Claims are falsifiable | each experiment states its hypothesis before running; the generated report shows the data and effect sizes |

## Quick start

```bash
git clone https://github.com/SatvikPraveen/MongoMasterPro.git && cd MongoMasterPro
make install-deps        # pip + npm
make setup               # start MongoDB, create schema, generate + import + validate data, build the lab
make run-module MODULE=01_crud
make matrix              # verify everything
```

Requires Docker (Compose v2), Python 3.10+ and Node 18+. The
[quick start](QUICK_START.md) has the details; `make help` lists every target.

## What is inside

```
scripts/                learning modules 00-11 (mongosh), each ending in a validate_*.js
data/                   deterministic dataset generator, vocabulary, data card
experiments/            benchmark harness, six experiments, committed baseline, generated report
docker/                 single node, 3-member replica set with auth, sharded cluster
tests/                  Node driver suites and Python generator tests
docs/research/          methodology, threats to validity, bibliography, decision records
docs/cheat_sheets/      aggregation, indexes, performance, transactions
```

### Learning modules

Each module is a directory of self-contained mongosh scripts that build their
own fixtures, teach by doing, and end with a validator that asserts the
module's claims. The [learning path](docs/learning_path.md) suggests an order
and time budget.

| Module | Topics | Topology |
|--------|--------|----------|
| 00 setup | bootstrap, lab database, reference-dataset validation | any |
| 01 crud | insert/update/replace/delete, bulk writes, upserts, write results | any |
| 02 indexes | single, compound, text, geospatial, TTL, partial, sparse, wildcard; explain and selectivity | any |
| 03 schema design | embedded vs referenced models, `$jsonSchema` validation, schema evolution and migration | any |
| 04 aggregation | pipeline stages, `$lookup`, `$setWindowFields`, geospatial, text, time-series patterns | any |
| 05 transactions | sessions, multi-document ACID, retry and error handling | replica set |
| 06 replication | replica-set operations, read preferences, write concerns | replica set (multi-member recommended) |
| 07 sharding | cluster initialisation, shard-key strategies, chunk management | sharded cluster (`make start-sharded`) |
| 08 change streams | event processing, materialized views, real-time audit | replica set |
| 09 security | authentication, RBAC, field-level security | auth-enabled set recommended (`make start-rs`) |
| 10 performance | profiling, benchmarking, optimisation | any |
| 11 capstones | multi-tenant SaaS, analytics dashboard, migration project, integration validation | any |

Two databases serve two purposes ([ADR 0001](docs/research/adr/0001-two-database-layout.md)):
`learning_platform` holds the strict, validated reference dataset; the
disposable `mongomasterpro` lab and per-module `mmp_*` sandboxes absorb
whatever a lesson writes. Modules that need a topology the current server does
not provide skip explicitly instead of failing
([ADR 0002](docs/research/adr/0002-environment-dependent-checks.md)).

### Reference dataset

A synthetic online-learning platform: users, instructors, categories,
courses, enrollments, reviews and click-stream events, with ObjectId
references, unique compound keys and denormalised counters that are kept
consistent. `lite` is 17 670 documents; `full` is 176 250.

```bash
make data                                   # lite, seed 20251003
DATA_MODE=full DATA_SEED=7 make data        # any mode / seed / scale
make validate-reference                     # 38 checks: schema, indexes, counts, validator
                                            # compliance, referential integrity, counters
```

Output is canonical Extended JSON (types survive `mongoimport`), with
`manifest.json` and `checksums.sha256`. Composition, distributions and
limitations are documented in the [data card](data/DATA_CARD.md).

### Experiments

Six one-factor experiments with a committed baseline on MongoDB 7.0.43 (full
dataset, single-node replica set in Docker on Apple silicon). Medians below;
the [report](experiments/results/REPORT.md) has 95 % bootstrap intervals,
p95, Mann-Whitney U with Holm correction and Cliff's delta for each.

| ID | Question | Result (median) |
|----|----------|-----------------|
| [E01](experiments/specs/E01_index_vs_collscan.js) | Index vs collection scan, 100 000 events | point lookup 1.2 ms vs 20.7 ms (17× faster, 13 vs 100 000 docs examined); 7-day range 27 ms vs 50 ms |
| [E02](experiments/specs/E02_embedded_vs_referenced.js) | One-to-many read: embedded, `$lookup`, two queries | 0.58 ms, 0.77 ms (1.3×), 1.13 ms (1.9×) for a course with 72 enrollments |
| [E03](experiments/specs/E03_bulk_batch_size.js) | Insert throughput vs batch size | 1.5 k docs/s at batch 1 → 35 k at 100 → 148 k at 1 000 → 176 k at 5 000 |
| [E04](experiments/specs/E04_write_concern.js) | Cost of acknowledgement level | `w:1` 0.47 ms; `j:true` 1.08 ms (2.3×); `majority` 1.13 ms on one member |
| [E05](experiments/specs/E05_denormalized_counter.js) | Per-course counts: derive or maintain | denormalised field 3.0 ms; `$group` 23.8 ms; `$lookup` 59.4 ms, for 1 000 courses |
| [E06](experiments/specs/E06_schema_validation_overhead.js) | `$jsonSchema` validation on insert | +23 % (`error`) and +11 % (`warn`) on a 2 000-document insertMany; medium effect |

```bash
make experiment EXP=E01      # or: make experiments
make analyze                 # regenerates summary/, figures/ and REPORT.md from raw/
```

How measurements are taken and what they do not show:
[methodology](docs/research/METHODOLOGY.md) ·
[threats to validity](docs/research/THREATS_TO_VALIDITY.md) ·
[adding an experiment](experiments/README.md).

## Verification

| Gate | Command | What it checks |
|------|---------|----------------|
| Module matrix | `make matrix` | every script under `scripts/` exits 0 with no exception and no failure marker; re-runnable |
| Reference dataset | `make validate-reference` | validators present, expected indexes, counts equal manifest, zero validator violations, no orphans, consistent counters |
| Node suites | `make test-node` | data quality, schema validation, end-to-end workflow, cross-module integration |
| Python tests | `make test-python` | determinism, referential integrity, uniqueness, Extended JSON types, manifest digests |
| Lint | `make lint` | V8 parse of all JavaScript, ESLint with mongosh globals, black/isort/flake8 |
| CI | [ci.yml](.github/workflows/ci.yml) | all of the above on MongoDB 6.0, 7.0 and 8.0, the sharding module on a real sharded cluster, image build, secret scan |

Local result at release 2.0.0 on MongoDB 7.0.43: 50/50 scripts under
`scripts/` (49 module scripts plus the reference-dataset validator), 4/4
sharding scripts through mongos, 4/4 Node suites, 13/13 Python tests,
38/38 reference checks.

## Topologies

| Command | Topology | Use |
|---------|----------|-----|
| `make start` | single-node replica set `mongo-primary` + Mongo Express (8081) | default for modules, tests and the baseline |
| `make start-rs` | primary, two secondaries, arbiter, key-file authentication | modules 05, 06, 08, 09 with real replication |
| `make start-sharded` | config server RS, two shard RSs, `mongos` on 27017 | module 07 and shard-key experiments |

## Documentation

[Documentation index](docs/README.md) ·
[Changelog](CHANGELOG.md) ·
[Decision records](docs/research/adr/) ·
[Roadmap](docs/roadmap.md) ·
[Contributing](CONTRIBUTING.md) ·
[Security](SECURITY.md)

## Citing

If this repository, its dataset or its harness is useful in your work, please
cite it using [CITATION.cff](CITATION.cff) (GitHub renders a "Cite this
repository" button from it).

## License

MIT. Everything in the dataset is synthetic; the default credentials in the
compose files are public and intended for local use only (see
[SECURITY.md](SECURITY.md)).
