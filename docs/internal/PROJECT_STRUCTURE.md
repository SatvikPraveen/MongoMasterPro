.
├── .env
├── .gitignore
├── config
│   ├── env.example
│   ├── mongodb-rs.conf
│   ├── mongodb.conf
│   └── replica.key
├── data
│   ├── generators
│   │   ├── generate_data.py
│   │   ├── requirements.txt
│   │   └── schemas.json
│   └── seed
│       ├── base_config.json
│       ├── base_courses.json
│       └── base_users.json
├── docker
│   ├── docker-compose.rs.yml
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── init
│       └── bootstrap.js
├── docs
│   ├── cheat_sheets
│   │   ├── aggregation_pipeline.md
│   │   ├── index_strategies.md
│   │   ├── performance_tuning.md
│   │   └── transaction_patterns.md
│   ├── learning_path.md
│   ├── portfolio
│   │   ├── architecture_designs
│   │   │   └── sharded_cluster_architecture.md
│   │   ├── kpi_dashboards
│   │   │   └── real_tiime_anlaytics_dashboard.html
│   │   └── optimization_case_studies
│   │       └── query_optimization_case_study.md
│   ├── results
│   │   ├── benchmark_results
│   │   │   └── crud_operations_benchmark.json
│   │   ├── explain_plans
│   │   │   └── sample_user_query_explain.json
│   │   ├── performance_reports
│   │   │   └── aggregation_performance_report.md
│   │   └── schema_diagrams
│   │       └── elearning_schama_diagram.md
│   ├── roadmap.md
│   └── troubleshooting.md
├── generate_mongo_master_pro.sh
├── LICENSE
├── Makefile
├── PROJECT_STRUCTURE.md
├── README.md
├── scripts
│   ├── 00_setup
│   │   ├── bootstrap.js
│   │   ├── data_models.js
│   │   └── validate_setup.js
│   ├── 01_crud
│   │   ├── bulk_operations.js
│   │   ├── inserts_updates.js
│   │   ├── queries_deletes.js
│   │   └── validate_crud.js
│   ├── 02_indexes
│   │   ├── index_fundamentals.js
│   │   ├── performance_analysis.js
│   │   ├── specialized_indexes.js
│   │   └── validate_indexes.js
│   ├── 03_schema_design
│   │   ├── embedded_models.js
│   │   ├── patterns_guide.md
│   │   ├── referenced_models.js
│   │   ├── schema_migrations.js
│   │   └── validate_schemas.js
│   ├── 04_aggregation
│   │   ├── advanced_stages.js
│   │   ├── geo_text_time.js
│   │   ├── pipeline_fundamentals.js
│   │   ├── validate_aggregation.js
│   │   └── window_functions.js
│   ├── 05_transactions
│   │   ├── error_handling.js
│   │   ├── multi_document_txn.js
│   │   ├── session_management.js
│   │   └── validate_transactions.js
│   ├── 06_replication
│   │   ├── read_preferences.js
│   │   ├── replica_set_ops.js
│   │   ├── validate_replication.js
│   │   └── write_concerns.js
│   ├── 07_sharding
│   │   ├── chunk_mangement.js
│   │   ├── shard_cluster_init.js
│   │   ├── shard_key_strategies.js
│   │   └── validate_sharding.js
│   ├── 08_change_streams
│   │   ├── event_processing.js
│   │   ├── materialized_views.js
│   │   ├── real_time_audit.js
│   │   └── validate_streams.js
│   ├── 09_security
│   │   ├── authentication.js
│   │   ├── authorization_rbac.js
│   │   ├── field_level_security.js
│   │   └── validate_security.js
│   ├── 10_performance
│   │   ├── benchmarking.js
│   │   ├── optimization_tuning.js
│   │   ├── profiling_analysis.js
│   │   └── validate_performance.js
│   └── 11_capstones
│       ├── analytics_dashboard.js
│       ├── integration_validation.js
│       ├── migration_project.js
│       └── multitenant_saas.js
└── tests
    ├── integration
    │   ├── cross_module_validation.js
    │   └── end_to_end_workflow.js
    ├── unit
    │   ├── data_quality_tests.js
    │   └── schema_validation_tests.js
    └── utils
        ├── assertion_library.js
        └── test_helpers.js

35 directories, 90 files
