# Architecture Decision Records

Decisions that shape the repository and that are not obvious from the code.
Each record states the context, the decision and its consequences, following
Michael Nygard's ADR format. Records are immutable; supersede rather than edit.

| ID | Title | Status |
|----|-------|--------|
| [0001](0001-two-database-layout.md) | Two databases: strict reference dataset and disposable lab | Accepted |
| [0002](0002-environment-dependent-checks.md) | Environment-dependent checks skip or warn, never fail | Accepted |
| [0003](0003-deterministic-dataset.md) | Dataset generation is deterministic and self-describing | Accepted |
| [0004](0004-experiment-result-format.md) | Experiment results are raw samples with embedded provenance | Accepted |
| [0005](0005-verification-gates.md) | Every script is executed in CI against three MongoDB versions | Accepted |
