//! Phase 5A — Storage URL utilities: bucket validation, path sanitisation,
//! and S3 key construction.

use uuid::Uuid;
// DEPENDENCY: uuid = { version = "1", features = ["v4", "serde"] }  (workspace)

/// Allowed storage bucket names.
///
/// These map to path prefixes inside the single S3 bucket, mirroring the
/// Supabase Storage buckets used in the legacy architecture.
pub const ALLOWED_BUCKETS: &[&str] = &[
    "course-images",
    "assignment-submissions",
    "video-captions",
    "certificates",
    "course-videos",
    "course-files",
    "avatars",
];

/// Per-bucket maximum upload size in bytes.
pub fn max_bytes_for_bucket(bucket: &str) -> u64 {
    match bucket {
        "course-videos" => 500 * 1024 * 1024,         // 500 MB
        "assignment-submissions" => 20 * 1024 * 1024, // 20 MB
        "course-images" => 5 * 1024 * 1024,           // 5 MB
        "certificates" => 5 * 1024 * 1024,            // 5 MB
        "video-captions" => 1 * 1024 * 1024,          // 1 MB
        "course-files" => 50 * 1024 * 1024,           // 50 MB
        "avatars" => 2 * 1024 * 1024,                 // 2 MB
        _ => 10 * 1024 * 1024,                        // 10 MB default
    }
}

/// Returns `true` when `bucket` is in the allowed list.
pub fn validate_bucket(bucket: &str) -> bool {
    ALLOWED_BUCKETS.contains(&bucket)
}

/// Sanitise an object path supplied by the client.
///
/// Rejects:
/// - Paths containing `..` (directory traversal)
/// - Absolute paths starting with `/`
/// - Empty paths
/// - Paths containing null bytes
///
/// Returns `Some(path)` when the path is acceptable, `None` otherwise.
pub fn sanitize_path(path: &str) -> Option<String> {
    if path.is_empty() {
        return None;
    }
    if path.contains("..") || path.starts_with('/') || path.contains('\0') {
        return None;
    }
    Some(path.to_string())
}

/// Build the full S3 object key.
///
/// Layout: `{bucket}/{tenant_id}/{user_path}`
///
/// Tenant isolation is achieved by inserting the tenant UUID as the second
/// path component so no cross-tenant reads are possible at the S3 level.
pub fn build_s3_key(bucket: &str, tenant_id: &Uuid, path: &str) -> String {
    format!("{}/{}/{}", bucket, tenant_id, path)
}

/// Strip the bucket + tenant prefix from a full S3 key, recovering the
/// user-visible relative path.  Returns `None` if the key does not match.
pub fn strip_s3_prefix<'a>(key: &'a str, bucket: &str, tenant_id: &Uuid) -> Option<&'a str> {
    let prefix = format!("{}/{}/", bucket, tenant_id);
    key.strip_prefix(prefix.as_str())
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    #[test]
    fn test_validate_bucket_known() {
        assert!(validate_bucket("course-images"));
        assert!(validate_bucket("course-videos"));
        assert!(!validate_bucket("unknown-bucket"));
        assert!(!validate_bucket(""));
    }

    #[test]
    fn test_sanitize_path_traversal() {
        assert!(sanitize_path("../etc/passwd").is_none());
        assert!(sanitize_path("/absolute").is_none());
        assert!(sanitize_path("").is_none());
        assert!(sanitize_path("foo/bar.jpg").is_some());
        assert!(sanitize_path("uuid/file.pdf").is_some());
    }

    #[test]
    fn test_build_s3_key() {
        let tenant = Uuid::nil();
        let key = build_s3_key("course-images", &tenant, "thumb.jpg");
        assert!(key.starts_with("course-images/"));
        assert!(key.ends_with("/thumb.jpg"));
    }
}
