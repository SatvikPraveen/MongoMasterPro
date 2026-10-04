## Summary

<!-- What changes and why. Link the issue or ADR if there is one. -->

## Verification

- [ ] `make lint` passes
- [ ] `make test-python` passes
- [ ] `make matrix` passes against MongoDB 7.0 (paste the final `module matrix: N/N` line)
- [ ] If a module was changed: it was run against the topology it targets
- [ ] If the dataset or bootstrap schema changed: `GENERATOR_VERSION` / `SCHEMA_VERSION` bumped, `data/DATA_CARD.md` and `CHANGELOG.md` updated
- [ ] If an experiment was added or changed: hypothesis and design are stated in the spec; `make analyze` regenerates the report cleanly

## Notes for the reviewer

<!-- Anything non-obvious: trade-offs, follow-ups, things you are unsure about. -->
