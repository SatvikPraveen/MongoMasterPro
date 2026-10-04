# Annotated Bibliography

Sources that inform the design of the modules, the dataset and the
experimental methodology. Entries are grouped by topic; each note says what
the repository takes from the source.

## Benchmarking methodology

* Fleming, P. J., & Wallace, J. J. (1986). How not to lie with statistics: the correct way to summarize benchmark results. *Communications of the ACM*, 29(3), 218–221.
  — Why ratios of medians are reported rather than arithmetic means of ratios.
* Mytkowicz, T., Diwan, A., Hauswirth, M., & Sweeney, P. F. (2009). Producing wrong data without doing anything obviously wrong! *ASPLOS XIV*, 265–276.
  — Measurement bias from environment factors; motivates randomised ordering and environment capture.
* Kalibera, T., & Jones, R. (2013). Rigorous benchmarking in reasonable time. *ISMM 2013*, 63–74.
  — Warm-up, repetition levels and confidence intervals for latency measurements.
* Hoefler, T., & Belli, R. (2015). Scientific benchmarking of parallel computing systems: twelve ways to tell the masses when reporting performance results. *SC '15*, Article 73.
  — The reporting rules the methodology document follows (report all data, state the environment, use appropriate statistics).
* Raasveldt, M., Holanda, P., Gubner, T., & Mühleisen, H. (2018). Fair benchmarking considered difficult: common pitfalls in database performance testing. *DBTest '18*, Article 2.
  — Database-specific pitfalls: cold vs warm cache, non-reproducible data, apples-to-oranges configurations.
* Cooper, B. F., Silberstein, A., Tam, E., Ramakrishnan, R., & Sears, R. (2010). Benchmarking cloud serving systems with YCSB. *SoCC '10*, 143–154.
  — Workload-mix framing; the experiments here are deliberately narrower than YCSB.
* Kamsky, A. (2019). Adapting TPC-C benchmark to measure performance of multi-document transactions in MongoDB. *PVLDB*, 12(12), 2254–2262.
  — How transactional workloads are measured on MongoDB; context for the transactions module.

## MongoDB internals and consistency

* Schultz, W., Avitabile, T., & Cabral, A. (2019). Tunable consistency in MongoDB. *PVLDB*, 12(12), 2071–2081.
  — Read/write concern semantics that E04 and the replication module demonstrate.
* Tyulenev, M., Schwerin, A., Kamsky, A., Tan, R., Cabral, A., & Mulrow, J. (2019). Implementation of cluster-wide logical clock and causal consistency in MongoDB. *SIGMOD '19*, 636–650.
  — Causal consistency and sessions, used in the session-management lesson.
* Zhou, S., & Mu, S. (2021). Fault-tolerant replication with pull-based consensus in MongoDB. *NSDI '21*, 687–703.
  — Why MongoDB replication differs from textbook Raft; informs the replica-set module.
* Ongaro, D., & Ousterhout, J. (2014). In search of an understandable consensus algorithm. *USENIX ATC '14*, 305–319.
  — Background for elections, terms and majority commit.
* Kingsbury, K. (2020). *Jepsen: MongoDB 4.2.6*. https://jepsen.io/analyses/mongodb-4.2.6
  — Concrete anomalies under default write/read concerns; motivates the module's emphasis on `majority`.
* MongoDB, Inc. *MongoDB Manual* (version-specific). https://www.mongodb.com/docs/manual/
  — Authoritative reference for operators, `$setWindowFields`, `$jsonSchema`, TTL and sharding behaviour cited in script comments.

## Data modelling

* Kleppmann, M. (2017). *Designing Data-Intensive Applications*. O'Reilly.
  — Document vs relational trade-offs; framing for E02 and E05.
* Stonebraker, M., & Cattell, R. (2011). 10 rules for scalable performance in "simple operation" datastores. *Communications of the ACM*, 54(6), 72–80.
  — Denormalisation and sharding-key guidance reflected in the capstones.
* Bradshaw, S., Brazil, E., & Chodorow, K. (2019). *MongoDB: The Definitive Guide* (3rd ed.). O'Reilly.
  — Schema design patterns used across modules 03 and 11.

## Distributed systems foundations

* Gilbert, S., & Lynch, N. (2002). Brewer's conjecture and the feasibility of consistent, available, partition-tolerant web services. *ACM SIGACT News*, 33(2), 51–59.
* Abadi, D. (2012). Consistency tradeoffs in modern distributed database system design: CAP is only part of the story. *IEEE Computer*, 45(2), 37–42.
  — PACELC, the latency/consistency trade-off that E04 measures directly.
* Herlihy, M. P., & Wing, J. M. (1990). Linearizability: a correctness condition for concurrent objects. *ACM TOPLAS*, 12(3), 463–492.

## Datasets and research practice

* Gebru, T., Morgenstern, J., Vecchione, B., Vaughan, J. W., Wallach, H., Daumé III, H., & Crawford, K. (2021). Datasheets for datasets. *Communications of the ACM*, 64(12), 86–92.
  — Template for `data/DATA_CARD.md`.
* Wohlin, C., Runeson, P., Höst, M., Ohlsson, M. C., Regnell, B., & Wesslén, A. (2012). *Experimentation in Software Engineering*. Springer.
  — Threat-to-validity categories used in `THREATS_TO_VALIDITY.md`.
* Nygard, M. (2011). *Documenting architecture decisions*. https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions
  — ADR format used under `docs/research/adr/`.
* Druskat, S., et al. (2021). *Citation File Format (CFF)*, version 1.2.0. https://citation-file-format.github.io/
  — `CITATION.cff`.
