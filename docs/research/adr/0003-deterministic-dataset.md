# ADR 0003: Dataset generation is deterministic and self-describing

**Status:** Accepted (2026-10-03)

## Context

The original generator drew from the process-wide RNG and the wall clock,
emitted plain JSON strings for ObjectIds and dates (which the validators
rejected), and produced different data on every run. Benchmark numbers could
not be tied to the data they were measured on.

## Decision

* One seeded `random.Random` and one seeded `Faker` instance supply all
  randomness; ObjectIds and UUIDs are derived from them.
* Timestamps are relative to a fixed `--reference-date`.
* Output is canonical Extended JSON v2 in JSON Lines; `--import` loads the
  identical in-memory documents through PyMongo.
* `manifest.json` records parameters, library versions, counts and SHA-256
  digests; results produced by the experiment harness embed it.
* `tests/python/` enforces byte-identical output for identical parameters, and
  `GENERATOR_VERSION` / `SCHEMA_VERSION` must change when output changes.

## Consequences

* A result file names the exact dataset it ran on; anyone can regenerate it.
* Time-based features (TTL) must use explicit expiry fields rather than the
  document timestamp, because the reference date is in the past (see the
  `expire_at` index in the bootstrap).
* Realism is bounded by Faker and uniform sampling; see the data card's
  limitations section.
