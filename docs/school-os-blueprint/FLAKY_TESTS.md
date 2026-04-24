# Flaky Tests Register

Tests listed here are flagged as intermittently failing during cloud-agent runs and are awaiting operator review. **Tests in this register must NOT be disabled, skipped, or `--no-verify`'d** (per Requirement 5.3 and runbook §4 "Failing tests"). The register exists so the agent can report flakiness without bypassing CI; resolution stays with the operator.

When a test passes consistently for 5 consecutive runs after a fix, remove it from the table.

| test_path | first_seen | symptom | escalated_to_user |
|---|---|---|---|
