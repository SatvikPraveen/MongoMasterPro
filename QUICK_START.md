# Quick Start

Five commands from a clean checkout to a verified environment. Everything
below is also what CI runs, so if it works here it is representative.

## Prerequisites

| Tool | Version | Used for |
|------|---------|----------|
| Docker with Compose v2 | 24+ | MongoDB containers |
| Python | 3.10+ | dataset generator, analysis |
| Node.js | 18+ | driver-based tests, lint |
| `mongosh` (optional) | 2.x | running experiments from the host (`npm i -g mongosh`) |
| Memory | 4 GB free | single node; 8 GB for the sharded cluster |

```bash
pip install -r requirements-dev.txt && npm install   # or: make install-deps
```

## 1. Bring up MongoDB and load everything

```bash
make setup
```

This starts a single-node replica set (`mongo-primary`, port 27017, plus
Mongo Express on 8081), creates the `learning_platform` schema with its
validators and indexes, generates and imports the deterministic `lite`
dataset, validates it against the manifest (38 checks), and builds the
disposable lab database used by modules 01–05.

## 2. Run a module

```bash
make run-module MODULE=01_crud          # every script of one module, in order
make shell                              # mongosh on the lab database
```

Modules live under `scripts/`; each directory is self-contained and ends with
a `validate_*.js` script that asserts what the module taught. The
[learning path](docs/learning_path.md) suggests an order.

## 3. Verify the whole repository

```bash
make matrix          # all 49 module scripts; any error or ✗ fails the run
make test            # Python generator tests + Node driver suites
make lint            # eslint, V8 parse, black/isort/flake8
make ci-local        # all of the above, as CI does it
```

## 4. Run an experiment

```bash
make experiment EXP=E01     # index scan vs collection scan
make experiments            # all six (about five minutes)
make analyze                # tables, figures, experiments/results/REPORT.md
```

Use `DATA_MODE=full make data` first for the dataset the committed baseline
was measured on.

## 5. Other topologies

```bash
make start-rs         # 3-member replica set with authentication (ports 27017-27020)
make start-sharded    # config server + 2 shards + mongos on 27017
make run-module MODULE=07_sharding CONTAINER=mongos
make stop             # stop everything;  make clean  also removes volumes
```

## Where things are

| Path | Contents |
|------|----------|
| `scripts/NN_*/` | learning modules 00–11 and `advanced/` |
| `data/` | generator, vocabulary, data card; `data/generated/` is ignored output |
| `experiments/` | harness, specs, runner, analysis, committed baseline results |
| `docs/research/` | methodology, threats to validity, bibliography, ADRs |
| `docs/cheat_sheets/` | aggregation, indexes, performance, transactions |
| `tests/` | Node driver suites (`unit/`, `integration/`) and Python tests |
| `docker/` | compose files for single node, replica set and sharded cluster |

## If something fails

`docs/troubleshooting.md` covers ports, containers and replica-set state.
`make status` and `make logs` are the first two things to look at.
