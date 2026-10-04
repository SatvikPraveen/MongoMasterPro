# ADR 0001: Two databases — strict reference dataset and disposable lab

**Status:** Accepted (2026-10-03)

## Context

The repository had grown two incompatible generations of schema. The Docker
bootstrap and the Python generator produced a `snake_case` schema with strict
JSON Schema validators in `learning_platform`. The learning modules (01–05)
self-seed `camelCase` documents and had been pointed at the same database by a
partial rename, so the validators rejected their inserts and 22 of 55 scripts
failed on MongoDB 7.0. Modules 06–11 used a third set of names (`lms_*`).

Rewriting ~50 000 lines of teaching material to one field convention was
judged riskier than the inconsistency it would remove, and the two styles are
in any case both common in the field.

## Decision

Three tiers, each with a single purpose:

| Database | Convention | Owner | Lifecycle |
|----------|-----------|-------|-----------|
| `learning_platform` | `snake_case`, strict validators, ObjectId references | `docker/init/00_bootstrap.js` + `data/generators/generate_data.py` | Reference dataset; experiments and capstones read it; never mutated by lessons |
| `mongomasterpro` (+ `mmp_logs`, `mmp_analytics`) | `camelCase`, lighter validators | `scripts/00_setup/bootstrap.js` + `data_models.js` | Disposable lab for modules 01–05; dropped and recreated on every bootstrap |
| `mmp_<module>` | module-defined | each module 06–11 | Per-module sandbox; self-seeded and reset by the module |

## Consequences

* Every module script runs green against a fresh server (49/49, re-runnable).
* Experiments cite a dataset whose schema and digests are fixed by the manifest.
* The two conventions are documented side by side, which is itself a lesson in
  schema governance; the data card lists this as a known duality.
* Scripts must never write to `learning_platform` except through the generator
  import path; `validate_reference.js` detects drift.
