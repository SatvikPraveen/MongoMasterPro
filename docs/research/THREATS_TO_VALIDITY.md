# Threats to Validity

What the experiments in this repository can and cannot tell you, organised in
the usual categories (Wohlin et al., 2012).

## Construct validity — are we measuring the right thing?

* **Client-observed latency, single connection.** The timed region includes
  network round trip and cursor drain in mongosh. This is the right quantity
  for "how long does this operation take an application", but it is not
  server CPU time and it is not throughput under concurrency. Driver-level
  differences (Node.js BSON deserialisation) are included.
* **mongosh overhead.** mongosh executes synchronous-looking calls through an
  async rewriter; its per-call overhead is in the tens of microseconds and
  affects all levels equally, but it bounds how small a difference can be
  resolved. Sub-0.2 ms differences should not be interpreted.
* **Explain counters are from a separate execution.** `probe()` runs explain
  after the timed trials; on a stable plan cache this reports the same plan,
  but it is not the plan of any particular timed trial.

## Internal validity — could something else explain the difference?

* **Shared hardware.** The baseline was captured on a developer laptop with a
  containerised server; background activity on the host adds noise. Blocked
  randomised ordering spreads such noise across levels; the reported CV shows
  how much there was. The committed baseline is a *reference point*, not a
  precision measurement.
* **Cache state.** Warm-up iterations put the working set in the WiredTiger
  cache; all levels therefore measure the warm case. Cold-cache behaviour
  (where index-versus-scan differences are far larger) is out of scope.
* **Container I/O.** Journaled writes (`j: true`) depend on the fsync path of
  Docker's storage driver, which differs from bare metal. E04 ratios are
  indicative of mechanism, not of production latency.
* **Single-node replica set.** `w: "majority"` on one member is satisfied by
  the primary alone; E04's majority level measures journaling, not
  replication. The topology is recorded in every result so the two cases are
  not confused. Re-run on `make start-rs` for the multi-member case.
* **Dataset scale.** The committed baseline uses the `full` dataset (100 000
  events, 50 000 enrollments), which fits in cache many times over. Ratios
  such as E01's range scan will change at scales where the collection exceeds
  cache; use `--scale` to explore that.

## External validity — does it generalise?

* **Synthetic data with uniform access.** Popularity, temporal and user
  distributions are flat (see the data card). Real workloads have hot keys and
  seasonality, which mostly *increase* the benefit of indexes and
  denormalisation, so the measured advantages are conservative in direction
  but not in magnitude.
* **One document shape per collection.** Results for `$lookup` and embedding
  depend on document and array sizes; the probe records them so readers can
  judge applicability.
* **Versions.** The baseline is MongoDB 7.0 on WiredTiger. CI smoke-runs the
  harness on 6.0, 7.0 and 8.0 but only the 7.0 run is committed as baseline;
  query-planner changes between versions can shift results.

## Conclusion validity — are the statistics appropriate?

* Rank-based tests are robust to skew but have less power than parametric
  tests for small n; with 30 trials, medium effects are detectable, small
  ones may not be. Non-significance is therefore not evidence of equality.
* Holm correction is applied within an experiment, not across the whole
  report; readers comparing across experiments should keep that in mind.
* Bootstrap intervals for the median are approximate for n < 20 (used in
  E03, where each trial inserts 20 000 documents and takes seconds).

## What would strengthen the evidence

* Repeating the baseline on a dedicated machine and on native (non-container)
  storage, and committing those runs alongside.
* A concurrent-load variant of E01/E05 using a driver-based load generator.
* Cold-cache variants that restart the server between trials.
* Larger `--scale` values so that collections exceed cache.
