# EduSync LMS — Release Process

This document describes how releases are cut, versioned, and shipped for EduSync
LMS (frontend + VIL Rust backend). It complements [deploy-checklist.md](./deploy-checklist.md)
(pre-deploy verification) and the root [CHANGELOG.md](../CHANGELOG.md)
(human-readable history of user-visible changes).

Release notes MUST be written in English first (Play Store listing requirement),
with Indonesian as a secondary translation when applicable.

---

## Branching Model

- `main` is the production branch. Every commit on `main` is expected to be
  production-deployable.
- All work lands via pull requests targeting `main` (squash-merge preferred).
- A release is cut by creating a `release/v1.x.y` branch from `main` at the
  release commit, then tagging that commit with `vX.Y.Z`.
- Hotfixes branch off the latest released tag as `hotfix/v1.x.z`, merge back
  into `main` after the release ships, and are tagged as a new patch.

---

## Versioning — SemVer

We follow [Semantic Versioning 2.0.0](https://semver.org/):

| Bump  | When to use                                                        |
| ----- | ------------------------------------------------------------------ |
| Major | Breaking API change (frontend contract, public REST/WS endpoints). |
| Minor | New backwards-compatible features (new screens, new endpoints).    |
| Patch | Backwards-compatible bug fixes, docs, refactors, chores.           |

Pre-release suffixes (`-rc.1`, `-beta.2`) are allowed for staging drops.

---

## Release Steps

1. **Freeze** — Confirm all intended PRs are merged to `main` and CI is green.
2. **Update `CHANGELOG.md`** — Promote the `## [Unreleased]` section to a new
   dated version header (`## [1.2.3] — YYYY-MM-DD`) and re-create an empty
   `## [Unreleased]` block above it.
3. **Bump versions**
   - `package.json` (`version` field)
   - `edusync-api/Cargo.toml` workspace `[workspace.package] version`
   - Commit as `chore(release): v1.2.3`.
4. **Tag** — Create an annotated tag from `main`:
   ```bash
   git tag -a v1.2.3 -m "Release 1.2.3"
   git push origin v1.2.3
   ```
5. **GitHub Release** — release-drafter (see
   [`.github/release-drafter.yml`](../.github/release-drafter.yml)) auto-drafts
   the release notes from merged PR labels. Review, polish to English (primary) +
   Indonesian (secondary), and publish.
6. **Deploy**
   - Frontend — build and ship to CDN via `pnpm run deploy:puter` (or the CDN's
     equivalent publish hook).
   - Backend — orchestrator-driven tag deploy (e.g. `argocd app sync` or the
     configured CD runner) pointing at `vX.Y.Z`.
7. **Monitor** — Watch Sentry (errors, crash-free rate) and Grafana (latency,
   error rate, saturation) for at least **1 hour** post-deploy. Sign off in the
   release channel.
8. **Announce** — Post the release summary in `#engineering` and in the
   schools' WhatsApp groups (English first, Indonesian translation below).

---

## Rollback

- **Do not force-push.** Roll forward: `git revert` the offending commits on
  `main`, bump a new patch version (e.g. `v1.2.4`), tag, and redeploy.
- If the regression is data-layer, coordinate with on-call + follow
  [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md).

---

## Hotfix Process

1. Branch from the latest released tag:
   ```bash
   git checkout -b hotfix/v1.2.4 v1.2.3
   ```
2. Land the minimum viable fix plus a regression test.
3. Merge the hotfix branch to `main` via PR once the release is shipped, so
   `main` does not fall behind.
4. Tag `v1.2.4` and follow the standard release steps from step 5 onward.

---

## Related

- [CHANGELOG.md](../CHANGELOG.md) — user-facing change history
- [docs/deploy-checklist.md](./deploy-checklist.md) — pre-deploy verification
- [docs/DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md) — incident and rollback playbook
- [docs/SLO_SLI.md](./SLO_SLI.md) — post-deploy monitoring targets
