# ADR 0004: Experiment results are raw samples with embedded provenance

**Status:** Accepted (2026-10-03)

## Context

Benchmark scripts printed aggregates (mean ops/sec) to stdout and discarded
the samples. Nothing recorded the server build, storage engine, topology, host
or dataset, so numbers could not be compared across runs or reproduced.

## Decision

Every experiment writes one JSON document (`mmp-experiment-result/1`) with:

* the hypothesis and design (independent/dependent variable, controls),
* run parameters (trials, warm-up, blocked-randomised order, seed),
* the full environment: server `buildInfo`/`serverStatus`/`hostInfo`/command
  line, topology from `hello()`, client host and tool versions, git commit,
  and the dataset manifest,
* per level: the **raw per-trial samples**, descriptive statistics with a
  bootstrap CI for the median, and an optional probe (e.g. `docsExamined`).

Levels are run in blocked, randomised order so drift is spread across levels.
Inferential statistics (Mann-Whitney U with Holm correction, Cliff's delta)
are computed afterwards by `experiments/analysis/analyze.py`, never in the
shell, so they can be re-run or extended without re-measuring.

## Consequences

* Results are small, diffable and citable; baselines are committed under
  `experiments/results/`.
* Reports are regenerated from raw data, not hand-edited.
* Adding an experiment is a single spec file; the harness and analysis are shared.
