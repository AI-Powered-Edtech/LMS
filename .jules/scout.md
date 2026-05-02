## 2025-05-02 - Fix Coverage Summary Missing
**Learning:** The 'Evidence Collector' CI job requires `json-summary` reporter to be enabled for code coverage in `vitest.config.ts`. Without it, `coverage/coverage-summary.json` is missing and causes the pipeline to fail.
**Action:** When acting as Scout or fixing test-related CI issues, check `vitest.config.ts` to ensure `json-summary` is included in `coverage.reporter`. Added the required configuration to the file.
## 2025-05-02 - Fix Coverage Summary Missing
**Learning:** The 'Evidence Collector' CI job requires `json-summary` reporter to be enabled for code coverage in `vitest.config.ts`. Without it, `coverage/coverage-summary.json` is missing and causes the pipeline to fail.
**Action:** When acting as Scout or fixing test-related CI issues, check `vitest.config.ts` to ensure `json-summary` is included in `coverage.reporter`. Added the required configuration to the file.
