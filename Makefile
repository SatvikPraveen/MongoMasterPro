# Location: `/Makefile`

.PHONY: help start stop restart setup clean data-lite data-full validate test benchmark logs shell

# Default target
help: ## Show this help message
	@echo "MongoMasterPro - MongoDB Learning Platform"
	@echo ""
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Docker operations
start: ## Start MongoDB containers
	@echo "🚀 Starting MongoDB containers..."
	docker-compose -f docker/docker-compose.yml up -d
	@echo "⏳ Waiting for MongoDB to be ready..."
	sleep 10
	@echo "✅ MongoDB is ready!"

start-rs: ## Start MongoDB with replica set
	@echo "🚀 Starting MongoDB replica set..."
	docker-compose -f docker/docker-compose.rs.yml up -d
	@echo "⏳ Waiting for replica set to be ready..."
	sleep 15
	@echo "✅ MongoDB replica set is ready!"

stop: ## Stop MongoDB containers
	@echo "🛑 Stopping MongoDB containers..."
	docker-compose -f docker/docker-compose.yml down
	docker-compose -f docker/docker-compose.rs.yml down

restart: ## Restart MongoDB containers
	@echo "🔄 Restarting MongoDB..."
	$(MAKE) stop
	$(MAKE) start

# Setup and initialization
setup: ## Initialize database with base configuration
	@echo "⚙️ Setting up MongoMasterPro..."
	docker exec mongo-primary mongosh --file /docker-entrypoint-initdb.d/bootstrap.js
	$(MAKE) data-lite
	$(MAKE) validate
	@echo "✅ Setup complete!"

setup-rs: ## Setup with replica set
	@echo "⚙️ Setting up MongoMasterPro with replica set..."
	$(MAKE) start-rs
	sleep 5
	docker exec mongo-rs-primary mongosh --eval "rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'mongo-rs-primary:27017'}, {_id: 1, host: 'mongo-rs-secondary1:27017'}, {_id: 2, host: 'mongo-rs-secondary2:27017'}]})"
	sleep 10
	docker exec mongo-rs-primary mongosh --file /docker-entrypoint-initdb.d/bootstrap.js
	$(MAKE) data-lite
	@echo "✅ Replica set setup complete!"

# Data generation
data-lite: ## Generate lite dataset (5K records)
	@echo "📊 Generating lite dataset..."
	cd data/generators && python generate_data.py --mode lite
	$(MAKE) import-data
	@echo "✅ Lite dataset generated!"

data-full: ## Generate full dataset (50K+ records)
	@echo "📊 Generating full dataset (this may take a while)..."
	cd data/generators && python generate_data.py --mode full
	$(MAKE) import-data
	@echo "✅ Full dataset generated!"

import-data: ## Import generated data to MongoDB
	@echo "📥 Importing data to MongoDB..."
	docker exec mongo-primary mongosh learning_platform --file /app/scripts/00_setup/data_modes.js

# Validation and testing
validate: ## Validate MongoDB setup and data
	@echo "🔍 Validating setup..."
	docker exec mongo-primary mongosh --file /app/scripts/00_setup/validate_setup.js

test: ## Run all tests
	@echo "🧪 Running all tests..."
	docker exec mongo-primary mongosh --file /app/tests/integration/end_to_end_workflow.js
	@echo "✅ All tests passed!"

test-module: ## Test specific module (usage: make test-module MODULE=01_crud)
	@echo "🧪 Testing module: $(MODULE)..."
	docker exec mongo-primary mongosh --file /app/scripts/$(MODULE)/validate_*.js

benchmark: ## Run performance benchmarks
	@echo "📊 Running performance benchmarks..."
	docker exec mongo-primary mongosh --file /app/scripts/10_performance/benchmarking.js
	@echo "📋 Results saved to docs/results/benchmark_results/"

# Development utilities
shell: ## Open MongoDB shell
	@echo "🖥️ Opening MongoDB shell..."
	docker exec -it mongo-primary mongosh

shell-rs: ## Open MongoDB shell (replica set primary)
	@echo "🖥️ Opening MongoDB shell (replica set)..."
	docker exec -it mongo-rs-primary mongosh

logs: ## Show MongoDB logs
	docker-compose -f docker/docker-compose.yml logs -f

logs-rs: ## Show replica set logs
	docker-compose -f docker/docker-compose.rs.yml logs -f

# Cleanup
clean: ## Clean up containers and volumes
	@echo "🧹 Cleaning up..."
	docker-compose -f docker/docker-compose.yml down -v
	docker-compose -f docker/docker-compose.rs.yml down -v
	docker volume prune -f
	@echo "✅ Cleanup complete!"

clean-data: ## Clean generated data files
	@echo "🧹 Cleaning generated data..."
	rm -rf data/generated/*
	rm -f data/generators/*.json
	@echo "✅ Data cleaned!"

# Learning modules shortcuts
module-crud: ## Run CRUD operations module
	docker exec mongo-primary mongosh --file /app/scripts/01_crud/inserts_updates.js
	docker exec mongo-primary mongosh --file /app/scripts/01_crud/queries_deletes.js

module-indexes: ## Run indexes module
	docker exec mongo-primary mongosh --file /app/scripts/02_indexes/index_fundamentals.js
	docker exec mongo-primary mongosh --file /app/scripts/02_indexes/specialized_indexes.js

module-aggregation: ## Run aggregation module
	docker exec mongo-primary mongosh --file /app/scripts/04_aggregation/pipeline_fundamentals.js
	docker exec mongo-primary mongosh --file /app/scripts/04_aggregation/advanced_stages.js

module-transactions: ## Run transactions module (requires replica set)
	$(MAKE) setup-rs
	docker exec mongo-rs-primary mongosh --file /app/scripts/05_transactions/multi_document_txn.js

# Portfolio generation
portfolio: ## Generate portfolio artifacts
	@echo "🎨 Generating portfolio artifacts..."
	docker exec mongo-primary mongosh --file /app/scripts/11_capstones/analytics_dashboard.js
	docker exec mongo-primary mongosh --file /app/scripts/11_capstones/integration_validation.js
	@echo "✅ Portfolio artifacts generated!"

# Status check
status: ## Check MongoDB status
	@echo "📊 MongoDB Status:"
	@docker ps --filter "name=mongo" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
	@echo ""
	@echo "🗄️ Database Status:"
	@docker exec mongo-primary mongosh --quiet --eval "db.adminCommand('ismaster')" 2>/dev/null || echo "❌ MongoDB not accessible"

# Installation helpers
install-deps: ## Install Python dependencies for data generators
	@echo "📦 Installing Python dependencies..."
	cd data/generators && pip install -r requirements.txt
	@echo "✅ Dependencies installed!"

# Quick start for new users
quickstart: ## Complete setup for new users
	@echo "🎯 MongoMasterPro Quick Start"
	@echo "=============================="
	$(MAKE) start
	$(MAKE) setup
	@echo ""
	@echo "✅ Quick start complete!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Run 'make module-crud' to start with CRUD operations"
	@echo "  2. Check 'make help' for all available commands"
	@echo "  3. Open 'make shell' to explore MongoDB interactively"
