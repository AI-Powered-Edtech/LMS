## Summary

- <one-line description of the change>

## Superbatch context

- **Prio**: <N>
- **Fase**: <F> (e.g. 0, 0.5, 1, ...)
- **Unit**: <M> — <unit title from `SUPERBATCH_CLOUD_AGENT.md` §3>
- **Exit criteria satisfied**: <quote the relevant bullet from the runbook or roadmap>

## Verification

| Gate | Runner | Result | Notes |
|---|---|---|---|
| 1. `tsc --noEmit` | agent | ✅ / ❌ |  |
| 2. `eslint . --max-warnings=0` | agent | ✅ / ❌ |  |
| 3. `vitest run` | agent | ✅ / ❌ |  |
| 4. `cargo test && cargo build --release` | operator | ✅ / ❌ |  |
| 5. Sweep + diff vs baseline | operator | ✅ / ❌ |  |
| 6. Unit-specific E2E | operator | ✅ / ❌ / N/A |  |

Operator output (last 50 lines + exit code):

```
<paste here for any operator-run gate>
```

## Decisions

- Authoritative (no log entry needed): <list, or "none">
- Conservative defaults logged in `DECISIONS_LOG.md`: <list, or "none">

## Test plan

- [ ] <reproducible step a reviewer can run locally>
- [ ] <step that exercises the feature against the real backend>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
