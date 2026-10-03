# Project History

This directory preserves records of earlier phases of MongoMasterPro so that
design decisions can be traced. Nothing here describes the current state of the
repository; for that, see the top-level `README.md`, `CHANGELOG.md` and the
Architecture Decision Records under `docs/research/adr/`.

| Document | Period | Summary |
|----------|--------|---------|
| [2025-01-restoration-issues.md](2025-01-restoration-issues.md) | January 2025 | Catalogue of defects found in the original AI-generated code base and the fixes that were attempted. Several of the "fixes" listed there (notably the database-name and field-name standardisation) were only partially applied, which is what motivated the October 2026 rework recorded in the changelog. |

Earlier status reports (`COMPLETION_REPORT.md`, `PROJECT_STATUS.md`,
`RESTORATION_SUMMARY.md`, `GIT_COMMIT_MESSAGE.md`, `DOCUMENTATION_INDEX.md`,
`PROJECT_STRUCTURE.md`) repeated the same material and claimed a verified state
that the test matrix did not support. They were removed rather than archived;
they remain available in git history before commit `chore: repository hygiene`.
