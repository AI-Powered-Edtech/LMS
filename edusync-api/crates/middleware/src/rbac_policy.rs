//! RBAC policy evaluator — per ADR-001/ADR-002.
//!
//! Loads `rbac_policy.yaml` at boot and provides `role_allows(roles, method,
//! path)` predicate. Runs in **shadow mode** by default: evaluator produces
//! a verdict but the middleware that consumes it only LOGS "would deny"; it
//! does NOT 403 until `shadow_mode: false` is set in the policy file.
//!
//! Policy path resolution order:
//!   1. env `RBAC_POLICY_PATH` (explicit override)
//!   2. `./config/rbac_policy.yaml` (cwd of running binary)
//!   3. `./edusync-api/config/rbac_policy.yaml` (workspace root fallback)
//!
//! Missing/malformed policy → evaluator fails OPEN (allow all) in shadow
//! mode; hard fails in enforce mode. Caller logs this case.

use once_cell::sync::OnceCell;
use serde::Deserialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Deserialize)]
pub struct PolicyEntry {
    pub roles: Vec<String>,
    #[serde(default = "default_scope")]
    pub scope: String,
}

fn default_scope() -> String {
    "tenant".to_string()
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct DefaultPolicy {
    #[serde(default)]
    pub deny_unmatched: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PolicyFile {
    #[serde(default = "default_version")]
    pub version: u32,
    pub policies: HashMap<String, PolicyEntry>,
    #[serde(default)]
    pub default: DefaultPolicy,
    #[serde(default = "default_true")]
    pub shadow_mode: bool,
    /// Path prefixes that hard-enforce (return 403) even when shadow_mode is
    /// true. A3 partial enforce flip lists `finance / audit / counseling /
    /// admin_users` paths here while the rest of the surface stays shadow.
    #[serde(default)]
    pub enforce_paths: Vec<String>,
}

fn default_version() -> u32 {
    1
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Verdict {
    Allow,
    Deny,
    Unmatched,
}

#[derive(Debug)]
pub struct RbacPolicy {
    entries: Vec<CompiledEntry>,
    pub shadow_mode: bool,
    pub deny_unmatched: bool,
    /// Normalised path prefixes (no leading slash) that hard-enforce even in
    /// shadow mode. Match by exact equality OR prefix-with-slash so
    /// `/data/invoices` enforces both `/data/invoices` and `/data/invoices/123`
    /// without accidentally catching `/data/invoices_archive`.
    enforce_path_prefixes: Vec<String>,
}

#[derive(Debug, Clone)]
struct CompiledEntry {
    method: String,
    path_segments: Vec<Segment>,
    roles_lc: Vec<String>,
    #[allow(dead_code)]
    scope: String,
}

#[derive(Debug, Clone)]
enum Segment {
    Literal(String),
    Param, // matches any single non-empty segment
}

static POLICY: OnceCell<RbacPolicy> = OnceCell::new();

impl RbacPolicy {
    pub fn load_default() -> Result<Self, String> {
        let path = resolve_policy_path()?;
        Self::load_from(&path)
    }

    pub fn load_from(path: &Path) -> Result<Self, String> {
        let raw = std::fs::read_to_string(path)
            .map_err(|e| format!("rbac_policy: read {}: {e}", path.display()))?;
        let file: PolicyFile = serde_yaml::from_str(&raw)
            .map_err(|e| format!("rbac_policy: parse {}: {e}", path.display()))?;
        if file.version != 1 {
            return Err(format!(
                "rbac_policy: unsupported version {} (expected 1)",
                file.version
            ));
        }
        let mut entries = Vec::with_capacity(file.policies.len());
        for (key, entry) in file.policies {
            let (method, path_str) = parse_key(&key)
                .ok_or_else(|| format!("rbac_policy: malformed key '{key}'"))?;
            let segments = path_str
                .trim_start_matches('/')
                .split('/')
                .filter(|s| !s.is_empty())
                .map(|s| {
                    if s.starts_with('{') && s.ends_with('}') {
                        Segment::Param
                    } else {
                        Segment::Literal(s.to_string())
                    }
                })
                .collect();
            let roles_lc = entry.roles.iter().map(|r| r.to_ascii_lowercase()).collect();
            entries.push(CompiledEntry {
                method: method.to_ascii_uppercase(),
                path_segments: segments,
                roles_lc,
                scope: entry.scope.clone(),
            });
        }
        let enforce_path_prefixes = file
            .enforce_paths
            .into_iter()
            .map(|p| p.trim_start_matches('/').trim_end_matches('/').to_string())
            .filter(|p| !p.is_empty())
            .collect();
        Ok(Self {
            entries,
            shadow_mode: file.shadow_mode,
            deny_unmatched: file.default.deny_unmatched,
            enforce_path_prefixes,
        })
    }

    /// True when `path` should hard-enforce (403 on Deny) regardless of the
    /// global `shadow_mode` flag. Used by A3 partial enforce flip.
    pub fn is_enforced(&self, path: &str) -> bool {
        let normalised = path
            .split('?')
            .next()
            .unwrap_or("")
            .trim_start_matches('/')
            .trim_end_matches('/');
        self.enforce_path_prefixes.iter().any(|prefix| {
            normalised == prefix || normalised.starts_with(&format!("{prefix}/"))
        })
    }

    /// Evaluate: do any of `user_roles` satisfy the policy for (method, path)?
    ///
    /// Returns:
    ///   - Allow: matched entry AND a role is in the entry's allowed list (or
    ///     "public" listed → always allow).
    ///   - Deny: matched entry AND none of the user's roles are allowed.
    ///   - Unmatched: no entry covers this route.
    ///
    /// Caller decides what to do with each verdict (see middleware).
    pub fn evaluate(&self, user_roles: &[String], method: &str, path: &str) -> Verdict {
        let method_u = method.to_ascii_uppercase();
        let path_segs: Vec<&str> = path
            .trim_start_matches('/')
            .split('?')
            .next()
            .unwrap_or("")
            .split('/')
            .filter(|s| !s.is_empty())
            .collect();

        for entry in &self.entries {
            if entry.method != method_u {
                continue;
            }
            if entry.path_segments.len() != path_segs.len() {
                continue;
            }
            let matched = entry
                .path_segments
                .iter()
                .zip(path_segs.iter())
                .all(|(seg, actual)| match seg {
                    Segment::Literal(l) => l == actual,
                    Segment::Param => !actual.is_empty(),
                });
            if !matched {
                continue;
            }
            // Entry matched; check roles.
            if entry.roles_lc.iter().any(|r| r == "public") {
                return Verdict::Allow;
            }
            let user_lc: Vec<String> = user_roles.iter().map(|r| r.to_ascii_lowercase()).collect();
            if user_lc.iter().any(|ur| entry.roles_lc.iter().any(|er| er == ur)) {
                return Verdict::Allow;
            }
            return Verdict::Deny;
        }
        Verdict::Unmatched
    }
}

fn parse_key(key: &str) -> Option<(String, String)> {
    let mut parts = key.splitn(2, ' ');
    let method = parts.next()?.trim().to_string();
    let path = parts.next()?.trim().to_string();
    if method.is_empty() || path.is_empty() {
        return None;
    }
    Some((method, path))
}

fn resolve_policy_path() -> Result<PathBuf, String> {
    if let Ok(p) = std::env::var("RBAC_POLICY_PATH") {
        let pb = PathBuf::from(p);
        if pb.exists() {
            return Ok(pb);
        }
    }
    let candidates = [
        "config/rbac_policy.yaml",
        "edusync-api/config/rbac_policy.yaml",
        "../config/rbac_policy.yaml",
        "../../config/rbac_policy.yaml",
    ];
    for c in &candidates {
        let pb = PathBuf::from(c);
        if pb.exists() {
            return Ok(pb);
        }
    }
    Err("rbac_policy: file not found (set RBAC_POLICY_PATH or place at edusync-api/config/rbac_policy.yaml)".into())
}

/// Init the global policy. Safe to call multiple times; only first succeeds.
pub fn init() -> Result<&'static RbacPolicy, String> {
    if let Some(p) = POLICY.get() {
        return Ok(p);
    }
    let p = RbacPolicy::load_default()?;
    let _ = POLICY.set(p);
    POLICY.get().ok_or_else(|| "rbac_policy: OnceCell not set".into())
}

/// Get the global policy if loaded, else None. Callers in shadow mode should
/// tolerate absence (e.g. tests) by logging without blocking.
pub fn global() -> Option<&'static RbacPolicy> {
    POLICY.get()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    fn sample_policy() -> &'static str {
        r#"
version: 1
shadow_mode: true
policies:
  "GET /health":                    { roles: [public], scope: public }
  "GET /courses":                   { roles: [teacher, admin, student], scope: tenant }
  "POST /courses":                  { roles: [teacher, admin], scope: tenant }
  "GET /data/gradebook_entries":    { roles: [teacher, wali_kelas, admin], scope: rombel }
  "GET /courses/{id}":              { roles: [student, teacher, admin], scope: tenant }
default:
  deny_unmatched: true
"#
    }

    fn load() -> RbacPolicy {
        let mut f = NamedTempFile::new().unwrap();
        writeln!(f, "{}", sample_policy()).unwrap();
        RbacPolicy::load_from(f.path()).unwrap()
    }

    #[test]
    fn public_allow_no_roles() {
        let p = load();
        assert_eq!(p.evaluate(&[], "GET", "/health"), Verdict::Allow);
    }

    #[test]
    fn teacher_allowed_courses() {
        let p = load();
        assert_eq!(
            p.evaluate(&["teacher".into()], "GET", "/courses"),
            Verdict::Allow
        );
    }

    #[test]
    fn student_denied_post_courses() {
        let p = load();
        assert_eq!(
            p.evaluate(&["student".into()], "POST", "/courses"),
            Verdict::Deny
        );
    }

    #[test]
    fn case_insensitive_role() {
        let p = load();
        assert_eq!(
            p.evaluate(&["TEACHER".into()], "GET", "/courses"),
            Verdict::Allow
        );
    }

    #[test]
    fn param_segment_matches() {
        let p = load();
        assert_eq!(
            p.evaluate(&["student".into()], "GET", "/courses/abc-123"),
            Verdict::Allow
        );
    }

    #[test]
    fn unmatched_route() {
        let p = load();
        assert_eq!(p.evaluate(&[], "GET", "/unknown/endpoint"), Verdict::Unmatched);
    }

    #[test]
    fn method_matters() {
        let p = load();
        // DELETE /courses not in policy
        assert_eq!(
            p.evaluate(&["admin".into()], "DELETE", "/courses"),
            Verdict::Unmatched
        );
    }

    #[test]
    fn query_string_ignored() {
        let p = load();
        assert_eq!(
            p.evaluate(&["teacher".into()], "GET", "/courses?page=1"),
            Verdict::Allow
        );
    }

    #[test]
    fn multi_role_any_allows() {
        let p = load();
        assert_eq!(
            p.evaluate(
                &["student".into(), "wali_kelas".into()],
                "GET",
                "/data/gradebook_entries"
            ),
            Verdict::Allow
        );
    }

    #[test]
    fn shadow_mode_default_true() {
        let p = load();
        assert!(p.shadow_mode);
    }
}
