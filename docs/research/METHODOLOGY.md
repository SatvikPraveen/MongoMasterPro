# Experimental Methodology

This document defines how performance claims in MongoMasterPro are measured,
analysed and reported. It applies to everything under `experiments/` and to
the performance figures quoted in the README. The approach follows the
recommendations of Hoefler & Belli (2015) and Raasveldt et al. (2018) on
benchmarking rigour and of Fleming & Wallace (1986) on summarising results.

## 1. Questions, hypotheses and designs

Every experiment is a one-factor design: one independent variable with a
small number of discrete *levels*, one dependent variable, everything else
held constant. The spec file states a falsifiable hypothesis before the
experiment is run; the report shows whether the data supported it. We prefer
several small, clearly interpretable experiments over one large factorial.

## 2. Dataset

All experiments read the reference dataset described in `data/DATA_CARD.md`.
It is regenerated deterministically from a seed; the result file embeds the
manifest (parameters and SHA-256 digests) so a figure can always be traced to
its data. Experiments that need their own fixtures derive them from the
reference dataset at setup time in the scratch database `mmp_experiments`
and remove them afterwards. The reference dataset itself is never modified.

## 3. Measurement

* **Clock.** `process.hrtime.bigint()` in the client (mongosh on Node.js),
  wrapped tightly around the operation. The timed region includes sending the
  command, server execution, and draining the cursor, i.e. the latency an
  application would observe for that operation on that client.
* **Warm-up.** Each level executes `warmup` iterations whose timings are
  discarded, so that plan-cache population, WiredTiger cache residency and
  JIT effects in the client are not attributed to the first level measured.
* **Order.** Trials are organised in blocks; within a block every level runs
  once in a randomised order drawn from a seeded PRNG. This spreads drift
  (checkpoints, background compaction, thermal throttling) across levels
  instead of confounding it with whichever level ran last.
* **Sample size.** Default 30 trials per level (fewer for operations that
  take seconds, more for sub-millisecond ones); the count is recorded.
* **Concurrency.** One client, one connection, no concurrent load. These are
  latency experiments, not throughput-under-load experiments; see the threats
  document for what that excludes.
* **Probes.** Where the mechanism matters, the harness records
  `explain("executionStats")` counters (`docsExamined`, `keysExamined`,
  `nReturned`) or document sizes alongside the timings, so the explanation of
  a latency difference can be checked rather than assumed.

## 4. Environment capture

Each result file records: server version, git version, storage engine,
WiredTiger cache size, journaling setting, parsed command line; topology
(standalone / replica set / sharded, member count); server host OS, CPU
architecture, core count and memory; client host, mongosh and Node versions;
repository commit; dataset manifest. Reports print the salient subset and
link the raw file.

## 5. Statistics

Latency samples are right-skewed with occasional outliers, so the analysis is
distribution-free:

* **Location:** the median, with a 95 % percentile-bootstrap confidence
  interval (B = 2000 in the analysis, B = 1000 in the shell preview). Means
  and standard deviations are reported for completeness but are not used for
  conclusions. Tail behaviour is reported as p95.
* **Comparison:** every level is compared with the first (baseline) level by
  a two-sided Mann-Whitney U test. Within an experiment the p-values are
  Holm-adjusted for the number of comparisons.
* **Effect size:** Cliff's delta (the probability that a sample from one
  level exceeds one from the other, minus the reverse) with the conventional
  labels negligible / small / medium / large, and the ratio of medians, which
  is the practically meaningful quantity.
* **Dispersion:** the coefficient of variation is printed so that an unstable
  measurement is visible; a CV above about 0.3 on a sub-millisecond operation
  usually indicates interference and the run should be repeated.

Significance without a meaningful effect size is not reported as a finding.

## 6. Reporting

`experiments/analysis/analyze.py` regenerates `experiments/results/REPORT.md`,
the CSV summaries and the figures from the raw files. Reports are never
edited by hand. Figures show the full distribution (box plot plus jittered
points) rather than a bar of the mean, and switch to a log axis only when the
spread across levels exceeds 50×.

## 7. Reproducing a result

```bash
git checkout <commit from the result's environment.repository.git_commit>
make start bootstrap                         # MongoDB version per the result
DATA_MODE=<mode> DATA_SEED=<seed> make data  # parameters per the result's dataset block
make experiment EXP=<id>
make analyze
```

Differences from the committed baseline are expected across hardware; the
*ordering* of levels and the *magnitude* of ratios should be stable. If they
are not, that is itself a result worth recording.

## References

See `docs/research/BIBLIOGRAPHY.md`, in particular Hoefler & Belli (2015),
Raasveldt et al. (2018), Fleming & Wallace (1986), Mytkowicz et al. (2009)
and Kalibera & Jones (2013).
