# Experiments

Reproducible micro-benchmarks that turn the repository's teaching claims
("indexes make selective queries fast", "embedding beats joining for
read-mostly one-to-many data") into measured, falsifiable statements with
confidence intervals and recorded provenance.

```
experiments/
├── lib/harness.js        measurement harness (mongosh): timing, blocked-randomised order,
│                         environment capture, descriptive statistics, result files
├── specs/E0x_*.js        one file per experiment: hypothesis, design, levels, operations
├── run.sh                runs one or more specs with mongosh (host or docker exec)
├── analysis/analyze.py   rank-based inferential statistics, figures, REPORT.md
└── results/
    ├── raw/<EXP>/*.json  one file per run: raw per-trial samples + environment + manifest
    ├── summary/*.csv     tidy per-level statistics and pairwise tests
    ├── figures/*.png|svg distribution plots
    └── REPORT.md         generated report (do not edit by hand)
```

## Running

```bash
make start && make bootstrap && make data          # or: DATA_MODE=full make data
make experiment EXP=E01                            # one experiment
make experiments                                   # all of them
make analyze                                       # tables, figures, REPORT.md
```

`experiments/run.sh -h` lists the options (`-t` trials, `-w` warm-up, `-o`
output directory, `-c` container). Results written anywhere other than
`results/raw` are scratch output; the committed baseline lives in `results/`.

## Catalogue

| ID | Question | Independent variable | Dependent variable | Topology |
|----|----------|---------------------|--------------------|----------|
| E01 | How much does an index help point and range predicates? | access path × predicate | query latency (ms) + docsExamined | any |
| E02 | Embedded array, `$lookup`, or two queries for a one-to-many read? | document model | latency to materialise course + enrollments | any |
| E03 | How does insert throughput depend on `insertMany` batch size? | batch size 1…5000 | docs/s | any |
| E04 | What does acknowledgement level cost per write? | `w:1`, `w:1,j:true`, `majority` | insertOne latency | replica set (interpretation depends on member count) |
| E05 | Derive a per-course count or maintain it? | `$group`, `$lookup`, denormalised field | latency for all courses | any |
| E06 | What does `$jsonSchema` validation cost on insert? | none / error / warn | insertMany latency | any |

Each spec states its hypothesis and controls in the file header and in the
result's `experiment.design` block.

## How a measurement is taken

1. `setup()` prepares fixtures from the reference dataset (never mutating it).
2. Every level runs `warmup` iterations that are discarded.
3. For each of `trials` blocks, the levels are executed once each in a
   randomised order (seeded), so time-dependent drift is spread evenly.
4. Each trial is timed with `process.hrtime.bigint()` around the operation,
   including full cursor drain, i.e. end-to-end client-observed latency.
5. After all blocks, an optional `probe()` records explain-plan counters or
   sizes, and the harness writes the result file with the full environment.

Statistics are described in `docs/research/METHODOLOGY.md`; limitations in
`docs/research/THREATS_TO_VALIDITY.md`.

## Adding an experiment

Copy the closest spec, give it the next `E0x` id, and fill in:

* a question and a **falsifiable hypothesis** (what result would refute it?),
* the independent variable and its levels, the dependent variable and unit,
* what is held constant,
* `setup`, `op` (the timed part only), optional `prepare`/`probe`/`cleanup`.

Keep `op()` free of anything that is not the thing being measured (no
printing, no result formatting). Run it with `-t 3` to check it works, then
with the default trial count, then `make analyze` and read the generated
section critically before committing the raw file.
