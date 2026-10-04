# MongoMasterPro — task runner
#
# Two databases, two purposes (see docs/research/adr/0001-two-database-layout.md):
#   learning_platform  strict snake_case reference dataset (bootstrap + generator)
#   mongomasterpro     disposable camelCase lab for modules 01-05 (scripts/00_setup)
#   mmp_*              per-module sandboxes for modules 06-11
#
# Run `make help` for the target list.

SHELL := /bin/bash
.DEFAULT_GOAL := help

# ---- configuration (override on the command line or in the environment) ----
COMPOSE          ?= docker compose
COMPOSE_SINGLE   ?= docker/docker-compose.yml
COMPOSE_RS       ?= docker/docker-compose.rs.yml
COMPOSE_SHARDED  ?= docker/docker-compose.sharded.yml
CONTAINER        ?= mongo-primary
MONGOS_CONTAINER ?= mongos
MONGO_URI        ?= mongodb://localhost:27017/?directConnection=true
PYTHON           ?= python3
DATA_MODE        ?= lite
DATA_SCALE       ?= 1.0
DATA_SEED        ?= 20251003
MONGO_IMAGES     ?= mongo:6.0 mongo:7.0 mongo:8.0
EXP              ?= all
MODULE           ?= 01_crud

MONGOSH_IN := docker exec $(CONTAINER) mongosh --quiet

.PHONY: help start start-rs start-sharded stop clean status logs shell \
        bootstrap lab-setup setup data validate-reference validate matrix \
        test test-node test-python lint lint-js lint-python format \
        experiment experiments analyze module run-module install-deps ci-local

help: ## Show this help
	@echo "MongoMasterPro"; echo
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ---- environment -------------------------------------------------------------
start: ## Start a single-node replica set (mongo-primary) and mongo-express
	$(COMPOSE) -f $(COMPOSE_SINGLE) up -d
	@$(MAKE) --no-print-directory wait

start-rs: ## Start the 3-member replica set with authentication
	$(COMPOSE) -f $(COMPOSE_RS) up -d
	@sleep 8
	docker exec mongo-rs-primary mongosh --quiet --eval \
	  "try { rs.status() } catch (e) { rs.initiate({_id:'rs0',members:[{_id:0,host:'mongo-rs-primary:27017'},{_id:1,host:'mongo-rs-secondary1:27017'},{_id:2,host:'mongo-rs-secondary2:27017'}]}) }"

start-sharded: ## Start a sharded cluster (config RS, two shard RSs, mongos)
	$(COMPOSE) -f $(COMPOSE_SHARDED) up -d
	@echo "waiting for cluster initialisation (mongos healthcheck)..."
	@for i in $$(seq 1 60); do \
	  if docker exec $(MONGOS_CONTAINER) mongosh --quiet --eval 'db.adminCommand({listShards:1}).shards.length' 2>/dev/null | grep -q '^2$$'; then echo "sharded cluster ready"; exit 0; fi; sleep 2; done; \
	  echo "sharded cluster did not come up"; exit 1

wait: ## Wait until mongo-primary answers and is a writable primary
	@for i in $$(seq 1 60); do \
	  if $(MONGOSH_IN) --eval 'db.hello().isWritablePrimary' 2>/dev/null | grep -q true; then echo "mongo-primary is ready"; exit 0; fi; sleep 2; done; \
	  echo "mongo-primary did not become primary"; exit 1

stop: ## Stop every compose stack
	-$(COMPOSE) -f $(COMPOSE_SINGLE) down
	-$(COMPOSE) -f $(COMPOSE_RS) down
	-$(COMPOSE) -f $(COMPOSE_SHARDED) down

clean: ## Stop stacks and delete their volumes
	-$(COMPOSE) -f $(COMPOSE_SINGLE) down -v
	-$(COMPOSE) -f $(COMPOSE_RS) down -v
	-$(COMPOSE) -f $(COMPOSE_SHARDED) down -v

status: ## Show container status
	@docker ps --filter "name=mongo" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

logs: ## Tail mongo-primary logs
	$(COMPOSE) -f $(COMPOSE_SINGLE) logs -f

shell: ## Open mongosh on the lab database
	docker exec -it $(CONTAINER) mongosh mongomasterpro

# ---- data ---------------------------------------------------------------------
bootstrap: ## Create learning_platform schema, validators, indexes, users and roles
	$(MONGOSH_IN) --file /app/docker/init/00_bootstrap.js

lab-setup: ## (Re)create the disposable lab database used by modules 01-05
	$(MONGOSH_IN) --file /app/scripts/00_setup/bootstrap.js
	$(MONGOSH_IN) --file /app/scripts/00_setup/data_models.js

data: ## Generate the reference dataset (DATA_MODE, DATA_SCALE, DATA_SEED) and import it
	$(PYTHON) data/generators/generate_data.py --mode $(DATA_MODE) --scale $(DATA_SCALE) \
	  --seed $(DATA_SEED) --out data/generated --import "$(MONGO_URI)"

validate-reference: ## Verify learning_platform against schema and manifest
	$(MONGOSH_IN) --file /app/scripts/00_setup/validate_reference.js

validate: ## Verify the lab database
	$(MONGOSH_IN) --file /app/scripts/00_setup/validate_setup.js

setup: start bootstrap data validate-reference lab-setup validate ## Full local setup from zero
	@echo "setup complete: reference dataset in learning_platform, lab in mongomasterpro"

# ---- verification ------------------------------------------------------------
matrix: ## Run every module script against mongo-primary; fail on any error
	scripts/utilities/run_module_matrix.sh -c $(CONTAINER) -o results/module-matrix

test-node: ## Run the Node driver test suites
	MONGODB_URI="$(MONGO_URI)" node tests/run_node_tests.mjs

test-python: ## Run the dataset generator tests
	$(PYTHON) -m pytest -q

test: test-python test-node ## Run all test suites (needs a running mongo-primary)

lint-js: ## Parse and lint every JavaScript file
	node scripts/utilities/check_syntax.mjs
	npx eslint .

lint-python: ## Check Python formatting and style
	$(PYTHON) -m black --check data/generators tests/python experiments/analysis
	$(PYTHON) -m isort --check-only data/generators tests/python experiments/analysis
	$(PYTHON) -m flake8 data/generators tests/python experiments/analysis

lint: lint-js lint-python ## Run all linters

format: ## Auto-format Python sources
	$(PYTHON) -m black data/generators tests/python experiments/analysis
	$(PYTHON) -m isort data/generators tests/python experiments/analysis

ci-local: lint test-python matrix test-node validate-reference ## What CI runs, locally

# ---- experiments ---------------------------------------------------------------
experiment: ## Run one experiment: make experiment EXP=E01
	experiments/run.sh -u "$(MONGO_URI)" $(EXP)

experiments: ## Run every experiment
	experiments/run.sh -u "$(MONGO_URI)" all

analyze: ## Aggregate raw results into tables, figures and REPORT.md
	$(PYTHON) experiments/analysis/analyze.py

# ---- modules --------------------------------------------------------------------
run-module: ## Run every script of one module: make run-module MODULE=04_aggregation
	@for f in scripts/$(MODULE)/*.js; do echo "== $$f"; $(MONGOSH_IN) --file /app/$$f || exit 1; done

module: run-module ## Alias for run-module

# ---- tooling ----------------------------------------------------------------------
install-deps: ## Install Python and Node dependencies
	$(PYTHON) -m pip install -r requirements-dev.txt
	npm install
