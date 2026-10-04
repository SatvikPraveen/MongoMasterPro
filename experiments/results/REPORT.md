# Experiment Report

Generated 2026-10-04T01:07:33+00:00 by `experiments/analysis/analyze.py`.

Each experiment lists its hypothesis, the measured levels (median with 95 % bootstrap CI, p95, coefficient of variation), a rank-based comparison of every level against the first (baseline) level, and the environment the run was captured in. Raw per-trial samples are in `raw/`; tidy tables in `summary/`. See `docs/research/METHODOLOGY.md` for the protocol and `docs/research/THREATS_TO_VALIDITY.md` for caveats.

## Contents

- [E01 — Index scan vs collection scan on analytics_events](#e01)
- [E02 — Embedded vs referenced one-to-many reads (course + enrollments)](#e02)
- [E03 — Insert throughput vs insertMany batch size](#e03)
- [E04 — insertOne latency by write concern](#e04)
- [E05 — Enrollment counts per course: derived vs denormalised](#e05)
- [E06 — insertMany latency with and without $jsonSchema validation](#e06)

## E01

**Index scan vs collection scan on analytics_events**  
*Run:* MongoDB 7.0.43 (replica_set), 2026-10-04 01:04:51 UTC

**Hypothesis.** For selective predicates an IXSCAN examines orders of magnitude fewer documents than a COLLSCAN and is correspondingly faster; the advantage shrinks as the predicate matches a larger share of the collection.

**Design.** Independent variable: access path × predicate (user_id equality; timestamp 7-day range). Dependent variable: query latency (ms). 30 trials per level after 5 warm-up iterations, blocked-randomised order, seed 1.
 Controlled: dataset (manifest); same predicates for all levels; cursor fully drained; single client, no concurrency.
 Access paths are forced with hint() in every level so the comparison is between plans, not between planner decisions; the probe records what each plan examined.

![E01](figures/E01_2026-10-04T01-04-51-276Z_mongodb-7.0.43.png)

| level | n | median (ms) | 95 % CI | p95 | CV | probe |
|---|---:|---:|---|---:|---:|---|
| `point_collscan` | 30 | 20.7 | [20.3, 21.1] | 26.3 | 0.10 | collection_size=100000, docsExamined=100000, keysExamined=0, nReturned=13 |
| `point_ixscan` | 30 | 1.22 | [1.00, 1.81] | 2.25 | 0.71 | collection_size=100000, docsExamined=13, keysExamined=13, nReturned=13 |
| `range7d_collscan` | 30 | 49.6 | [49.2, 50.7] | 60.9 | 0.09 | collection_size=100000, docsExamined=100000, keysExamined=0, nReturned=7560 |
| `range7d_ixscan` | 30 | 27.4 | [26.5, 28.0] | 41.3 | 0.19 | collection_size=100000, docsExamined=7560, keysExamined=7560, nReturned=7560 |

Comparison against baseline `point_collscan` (Mann-Whitney U, Holm-adjusted):

| level | median ratio | Cliff's δ | effect | p (Holm) |
|---|---:|---:|---|---:|
| `point_ixscan` | 0.06× | -1.00 | large | 9.06e-11 |
| `range7d_collscan` | 2.40× | +1.00 | large | 9.06e-11 |
| `range7d_ixscan` | 1.32× | +0.93 | large | 6.12e-10 |

<details><summary>Environment</summary>

- Server: MongoDB 7.0.43 (wiredTiger, cache 3.4 GiB), topology replica_set with 1 member(s)
- Server host: Ubuntu 22.04, aarch64, 10 cores, 7934 MB
- Client: mongosh 2.12.0, node v20.20.0, Apple M5
- Repository commit: `f9a195e7b4e6`
- Dataset: generator 2.0.0, parameters {"mode": "full", "reference_date": "2025-01-01T00:00:00+00:00", "scale": 1, "seed": 20251003, "targets": {"analytics_events": 100000, "categories": 50, "courses": 1000, "enrollments": 50000, "instructors": 200, "reviews": 15000, "users": 10000}}
- Raw file: `raw/E01/2026-10-04T01-04-51-276Z_mongodb-7.0.43.json`

</details>

## E02

**Embedded vs referenced one-to-many reads (course + enrollments)**  
*Run:* MongoDB 7.0.43 (replica_set), 2026-10-04 01:04:56 UTC

**Hypothesis.** Reading a course with its enrollments is fastest from a single embedded document, slower with a server-side $lookup, and slowest with two client round trips; the gap is dominated by per-request overhead at this data size rather than by bytes transferred.

**Design.** Independent variable: document model / access pattern. Dependent variable: latency to materialise one course and all its enrollments on the client (ms). 30 trials per level after 5 warm-up iterations, blocked-randomised order, seed 1.
 Controlled: same course ids for all levels; identical enrollment payload; indexes: idx_enrollments_course_status, _id.
 Courses are chosen deterministically: the 20 with the most enrollments, cycled per trial so caches are not primed by one hot document.

![E02](figures/E02_2026-10-04T01-04-56-199Z_mongodb-7.0.43.png)

| level | n | median (ms) | 95 % CI | p95 | CV | probe |
|---|---:|---:|---|---:|---:|---|
| `embedded` | 30 | 0.58 | [0.58, 0.61] | 0.80 | 0.19 | document_bytes=37689, enrollments_in_sample=72 |
| `referenced_lookup` | 30 | 0.77 | [0.74, 0.80] | 0.89 | 0.08 | enrollments_in_sample=72 |
| `referenced_2q` | 30 | 1.13 | [1.09, 1.15] | 1.33 | 0.19 | enrollments_in_sample=72 |

Comparison against baseline `embedded` (Mann-Whitney U, Holm-adjusted):

| level | median ratio | Cliff's δ | effect | p (Holm) |
|---|---:|---:|---|---:|
| `referenced_lookup` | 1.32× | +0.87 | large | 7.77e-09 |
| `referenced_2q` | 1.93× | +0.97 | large | 2.19e-10 |

<details><summary>Environment</summary>

- Server: MongoDB 7.0.43 (wiredTiger, cache 3.4 GiB), topology replica_set with 1 member(s)
- Server host: Ubuntu 22.04, aarch64, 10 cores, 7934 MB
- Client: mongosh 2.12.0, node v20.20.0, Apple M5
- Repository commit: `f9a195e7b4e6`
- Dataset: generator 2.0.0, parameters {"mode": "full", "reference_date": "2025-01-01T00:00:00+00:00", "scale": 1, "seed": 20251003, "targets": {"analytics_events": 100000, "categories": 50, "courses": 1000, "enrollments": 50000, "instructors": 200, "reviews": 15000, "users": 10000}}
- Raw file: `raw/E02/2026-10-04T01-04-56-199Z_mongodb-7.0.43.json`

</details>

## E03

**Insert throughput vs insertMany batch size**  
*Run:* MongoDB 7.0.43 (replica_set), 2026-10-04 01:04:57 UTC

**Hypothesis.** Throughput rises steeply from single-document inserts to batches of a few hundred, then flattens as per-request overhead stops dominating and the server's per-document cost takes over.

**Design.** Independent variable: insertMany batch size. Dependent variable: insert throughput (docs/s). 8 trials per level after 1 warm-up iterations, blocked-randomised order, seed 1.
 Controlled: identical documents every trial; collection dropped before each trial; ordered: false; single client connection.
 Each trial inserts 20000 documents; the returned value is TOTAL / elapsed.

![E03](figures/E03_2026-10-04T01-04-57-388Z_mongodb-7.0.43.png)

| level | n | median (docs/s) | 95 % CI | p95 | CV | probe |
|---|---:|---:|---|---:|---:|---|
| `batch_1` | 8 | 1,497 | [1,406, 1,649] | 1,799 | 0.12 | avg_doc_bytes=95, requests=20000 |
| `batch_10` | 8 | 10,208 | [8,510, 12,552] | 13,691 | 0.24 | avg_doc_bytes=95, requests=2000 |
| `batch_100` | 8 | 34,893 | [28,162, 43,909] | 44,981 | 0.25 | avg_doc_bytes=95, requests=200 |
| `batch_1000` | 8 | 148,438 | [105,731, 154,621] | 160,374 | 0.28 | avg_doc_bytes=95, requests=20 |
| `batch_5000` | 8 | 175,683 | [157,050, 199,267] | 223,893 | 0.16 | avg_doc_bytes=95, requests=4 |

Comparison against baseline `batch_1` (Mann-Whitney U, Holm-adjusted):

| level | median ratio | Cliff's δ | effect | p (Holm) |
|---|---:|---:|---|---:|
| `batch_10` | 6.82× | +1.00 | large | 6.22e-04 |
| `batch_100` | 23.30× | +1.00 | large | 6.22e-04 |
| `batch_1000` | 99.14× | +1.00 | large | 6.22e-04 |
| `batch_5000` | 117.34× | +1.00 | large | 6.22e-04 |

<details><summary>Environment</summary>

- Server: MongoDB 7.0.43 (wiredTiger, cache 3.4 GiB), topology replica_set with 1 member(s)
- Server host: Ubuntu 22.04, aarch64, 10 cores, 7934 MB
- Client: mongosh 2.12.0, node v20.20.0, Apple M5
- Repository commit: `f9a195e7b4e6`
- Dataset: generator 2.0.0, parameters {"mode": "full", "reference_date": "2025-01-01T00:00:00+00:00", "scale": 1, "seed": 20251003, "targets": {"analytics_events": 100000, "categories": 50, "courses": 1000, "enrollments": 50000, "instructors": 200, "reviews": 15000, "users": 10000}}
- Raw file: `raw/E03/2026-10-04T01-04-57-388Z_mongodb-7.0.43.json`

</details>

## E04

**insertOne latency by write concern**  
*Run:* MongoDB 7.0.43 (replica_set), 2026-10-04 01:07:22 UTC

**Hypothesis.** Requiring the journal (j: true) adds a flush latency to every write; on a single-node set w:'majority' behaves like w:1 with journaling because majority commits imply durability on the primary, whereas on a multi-node set it additionally waits for a secondary.

**Design.** Independent variable: write concern. Dependent variable: insertOne latency (ms). 100 trials per level after 10 warm-up iterations, blocked-randomised order, seed 1.
 Controlled: fixed 512-byte payload; same collection; single client, no concurrent load.
 Interpretation depends on environment.topology.members; see docs/research/METHODOLOGY.md.

![E04](figures/E04_2026-10-04T01-07-22-659Z_mongodb-7.0.43.png)

| level | n | median (ms) | 95 % CI | p95 | CV | probe |
|---|---:|---:|---|---:|---:|---|
| `w1` | 100 | 0.47 | [0.45, 0.50] | 0.88 | 0.40 |  |
| `w1_journaled` | 100 | 1.08 | [0.93, 1.17] | 2.21 | 0.49 |  |
| `majority` | 100 | 1.13 | [0.94, 1.27] | 2.26 | 0.46 |  |

Comparison against baseline `w1` (Mann-Whitney U, Holm-adjusted):

| level | median ratio | Cliff's δ | effect | p (Holm) |
|---|---:|---:|---|---:|
| `w1_journaled` | 2.29× | +0.82 | large | 1.23e-23 |
| `majority` | 2.39× | +0.84 | large | 1.34e-24 |

<details><summary>Environment</summary>

- Server: MongoDB 7.0.43 (wiredTiger, cache 3.4 GiB), topology replica_set with 1 member(s)
- Server host: Ubuntu 22.04, aarch64, 10 cores, 7934 MB
- Client: mongosh 2.12.0, node v20.20.0, Apple M5
- Repository commit: `f9a195e7b4e6`
- Dataset: generator 2.0.0, parameters {"mode": "full", "reference_date": "2025-01-01T00:00:00+00:00", "scale": 1, "seed": 20251003, "targets": {"analytics_events": 100000, "categories": 50, "courses": 1000, "enrollments": 50000, "instructors": 200, "reviews": 15000, "users": 10000}}
- Raw file: `raw/E04/2026-10-04T01-07-22-659Z_mongodb-7.0.43.json`

</details>

## E05

**Enrollment counts per course: derived vs denormalised**  
*Run:* MongoDB 7.0.43 (replica_set), 2026-10-04 01:07:25 UTC

**Hypothesis.** Reading a maintained counter is one to two orders of magnitude cheaper than deriving it; among derived forms, a $group over the indexed enrollments collection beats a per-course $lookup because the latter performs one index probe per course.

**Design.** Independent variable: method of obtaining the per-course count. Dependent variable: latency to produce {course_id, count} for all courses (ms). 30 trials per level after 5 warm-up iterations, blocked-randomised order, seed 1.
 Controlled: identical result set (one row per course); indexes from the bootstrap.
 All three levels return a fully materialised array of {_id, count} on the client.

![E05](figures/E05_2026-10-04T01-07-25-263Z_mongodb-7.0.43.png)

| level | n | median (ms) | 95 % CI | p95 | CV | probe |
|---|---:|---:|---|---:|---:|---|
| `group_enrollments` | 30 | 23.8 | [22.8, 24.9] | 28.2 | 0.17 | courses=1000, enrollments=50000 |
| `lookup_per_course` | 30 | 59.4 | [56.8, 63.8] | 89.3 | 0.19 | courses=1000, enrollments=50000 |
| `denormalized_field` | 30 | 2.95 | [2.71, 3.74] | 4.81 | 0.27 | courses=1000, enrollments=50000 |

Comparison against baseline `group_enrollments` (Mann-Whitney U, Holm-adjusted):

| level | median ratio | Cliff's δ | effect | p (Holm) |
|---|---:|---:|---|---:|
| `lookup_per_course` | 2.50× | +1.00 | large | 6.04e-11 |
| `denormalized_field` | 0.12× | -1.00 | large | 6.04e-11 |

<details><summary>Environment</summary>

- Server: MongoDB 7.0.43 (wiredTiger, cache 3.4 GiB), topology replica_set with 1 member(s)
- Server host: Ubuntu 22.04, aarch64, 10 cores, 7934 MB
- Client: mongosh 2.12.0, node v20.20.0, Apple M5
- Repository commit: `f9a195e7b4e6`
- Dataset: generator 2.0.0, parameters {"mode": "full", "reference_date": "2025-01-01T00:00:00+00:00", "scale": 1, "seed": 20251003, "targets": {"analytics_events": 100000, "categories": 50, "courses": 1000, "enrollments": 50000, "instructors": 200, "reviews": 15000, "users": 10000}}
- Raw file: `raw/E05/2026-10-04T01-07-25-263Z_mongodb-7.0.43.json`

</details>

## E06

**insertMany latency with and without $jsonSchema validation**  
*Run:* MongoDB 7.0.43 (replica_set), 2026-10-04 01:07:29 UTC

**Hypothesis.** Schema validation adds a measurable but modest per-document CPU cost; 'warn' and 'error' cost the same when every document is valid because the schema is evaluated either way.

**Design.** Independent variable: collection validation setting. Dependent variable: insertMany latency for 2000 valid documents (ms). 20 trials per level after 2 warm-up iterations, blocked-randomised order, seed 1.
 Controlled: identical documents (users from the reference dataset, _id regenerated); deleteMany before each trial so the collection size is constant; no secondary indexes.

![E06](figures/E06_2026-10-04T01-07-29-675Z_mongodb-7.0.43.png)

| level | n | median (ms) | 95 % CI | p95 | CV | probe |
|---|---:|---:|---|---:|---:|---|
| `no_validator` | 20 | 28.8 | [26.2, 30.9] | 59.1 | 0.55 | avg_doc_bytes=743, documents=2000 |
| `validator_error` | 20 | 35.5 | [29.8, 40.8] | 56.7 | 0.31 | avg_doc_bytes=743, documents=2000 |
| `validator_warn` | 20 | 32.0 | [30.4, 37.2] | 48.4 | 0.21 | avg_doc_bytes=743, documents=2000 |

Comparison against baseline `no_validator` (Mann-Whitney U, Holm-adjusted):

| level | median ratio | Cliff's δ | effect | p (Holm) |
|---|---:|---:|---|---:|
| `validator_error` | 1.23× | +0.46 | medium | 2.66e-02 |
| `validator_warn` | 1.11× | +0.43 | medium | 2.66e-02 |

<details><summary>Environment</summary>

- Server: MongoDB 7.0.43 (wiredTiger, cache 3.4 GiB), topology replica_set with 1 member(s)
- Server host: Ubuntu 22.04, aarch64, 10 cores, 7934 MB
- Client: mongosh 2.12.0, node v20.20.0, Apple M5
- Repository commit: `f9a195e7b4e6`
- Dataset: generator 2.0.0, parameters {"mode": "full", "reference_date": "2025-01-01T00:00:00+00:00", "scale": 1, "seed": 20251003, "targets": {"analytics_events": 100000, "categories": 50, "courses": 1000, "enrollments": 50000, "instructors": 200, "reviews": 15000, "users": 10000}}
- Raw file: `raw/E06/2026-10-04T01-07-29-675Z_mongodb-7.0.43.json`

</details>

