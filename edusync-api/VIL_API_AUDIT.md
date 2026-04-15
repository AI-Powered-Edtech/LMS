# VIL API Audit for EduSync Phase 1A

- Audit date: 2026-04-10
- Repo audited: `https://github.com/OceanOS-id/VIL.git`
- Local audit path: `/tmp/vil-audit`
- Repo branch at clone time: default remote HEAD
- Latest public git tag found: `v0.1.2`
- Tag commit checked out for verification: `0f9040f`
- Workspace package version at VIL root: `0.2.1`
- Initial decision target for EduSync Phase 1A: pin dependency to public tag `v0.1.2`
- Cargo resolution blocker found: upstream git workspace contains invalid template manifests under `crates/vil_cli/templates/*`
- Practical compile-safe fallback used in scaffold: published crate `vil_server = "0.2.2"`
- Audit result: API coverage is sufficient to continue Phase 1A
- Stop condition not met: core API presence is well above 50%

## Crate naming

- Correct Cargo package name is `vil_server`
- Incorrect names for this repo/tag: `vil-server`, `vil_server_core` as app dependency root
- Root package path: `/tmp/vil-audit/crates/vil_server/Cargo.toml`
- `vil_server` re-exports the main server API through `vil_server::prelude::*`
- Published crate fallback confirmed on crates.io: `vil_server = "0.2.2"`

## Core symbols present

- `VilApp` exists at `/tmp/vil-audit/crates/vil_server_core/src/vx/app.rs`
- `ServiceProcess` exists at `/tmp/vil-audit/crates/vil_server_core/src/vx/service.rs`
- `AppState` exists at `/tmp/vil-audit/crates/vil_server_core/src/state.rs`
- `ServiceCtx` exists at `/tmp/vil-audit/crates/vil_server_core/src/vx/ctx.rs`
- `ShmSlice` exists at `/tmp/vil-audit/crates/vil_server_core/src/shm_extractor.rs`
- `VilError` exists at `/tmp/vil-audit/crates/vil_server_core/src/error.rs`
- `VilResponse` exists at `/tmp/vil-audit/crates/vil_server_core/src/response.rs`
- These symbols are re-exported by `/tmp/vil-audit/crates/vil_server/src/lib.rs`

## Builder methods verified

- `VilApp::port(u16)` exists
- `VilApp::observer(bool)` exists
- `VilApp::profile(&str)` exists
- `VilApp::service(ServiceProcess)` exists
- `VilApp::mesh(VxMeshConfig)` exists
- `VilApp::state(T)` exists
- `VilApp::run().await` exists and returns `()`

## Auto endpoints verified

- VIL docs and examples confirm auto `GET /health`
- VIL docs and examples confirm auto `GET /ready`
- VIL docs and examples confirm auto `GET /metrics`
- Observer docs confirm `GET /_vil/dashboard/`
- Observer docs also expose `/_vil/api/metrics` and `/_vil/api/health`

## Breaking changes vs requested spec

- Requested dependency name `vil-server` is wrong for the audited tag; correct name is `vil_server`
- Requested direct git-tag dependency is not buildable on this host because Cargo parses invalid workspace template manifests from the upstream repo
- Custom handler state cannot use `State<crate::state::AppState>` directly under `VilApp` in `v0.1.2`
- Reason: VIL router state is fixed to `vil_server::AppState`, and no `FromRef` bridge for user state is provided
- Compatible adaptation: inject EduSync state with `ServiceProcess::state(...)` and extract it using `Extension<Arc<crate::state::AppState>>`
- `VilApp` supports only built-in CORS toggle in this tag, not a custom allowlist `CorsLayer`
- Compatible adaptation: keep EduSync CORS layer implementation in crate code for future use, but runtime continues to rely on VIL built-in CORS behavior in Phase 1A
- `VilApp::run()` initializes tracing internally; custom tracing bootstrap before `.run()` would conflict
- Compatible adaptation: keep `init_sentry()` active and keep JSON tracing helper as documented but not invoked in Phase 1A

## Verification notes

- Pattern A remains viable for handlers via Axum routing functions (`get`, `post`, etc.)
- Pattern B is not required for this phase
- Nginx local verification is intentionally skipped on this host because `nginx` binary is not installed
- Nginx is verified indirectly through `docker-compose config` and documented here per execution agreement
- Docker verification commands should use `docker-compose`, not `docker compose`, on this host

## Conclusion

- Proceed with Phase 1A scaffold
- Use `vil_server = "0.2.2"` for a compile-safe Phase 1A scaffold, while retaining the audited upstream tag note
- Use `VilApp` + `ServiceProcess`
- Use `Extension<Arc<AppState>>` for EduSync DB state in health handlers
- Treat custom CORS wiring as a documented framework limitation for this exact VIL tag
