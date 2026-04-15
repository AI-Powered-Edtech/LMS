/// Role hierarchy — higher index = more privilege.
/// Unknown roles never pass permission checks.
const ROLE_ORDER: &[&str] = &["student", "parent", "teacher", "principal", "admin"];

pub mod roles {
    pub const STUDENT: &str = "student";
    pub const PARENT: &str = "parent";
    pub const TEACHER: &str = "teacher";
    pub const PRINCIPAL: &str = "principal";
    pub const ADMIN: &str = "admin";
}

/// Returns `true` if `user_role` has at least the privilege level of `required_role`.
///
/// Case-insensitive. `admin` passes every check; an unknown role always fails.
///
/// ```
/// use edusync_middleware::rbac::role_has_permission;
///
/// assert!(role_has_permission("admin", "student"));
/// assert!(!role_has_permission("student", "teacher"));
/// ```
pub fn role_has_permission(user_role: &str, required_role: &str) -> bool {
    let user_level = ROLE_ORDER
        .iter()
        .position(|&r| r.eq_ignore_ascii_case(user_role));
    let req_level = ROLE_ORDER
        .iter()
        .position(|&r| r.eq_ignore_ascii_case(required_role));
    match (user_level, req_level) {
        (Some(u), Some(r)) => u >= r,
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn admin_passes_all() {
        for role in ROLE_ORDER {
            assert!(role_has_permission("admin", role), "admin should pass {role}");
        }
    }

    #[test]
    fn student_limited() {
        assert!(role_has_permission("student", "student"));
        assert!(!role_has_permission("student", "teacher"));
        assert!(!role_has_permission("student", "admin"));
    }

    #[test]
    fn teacher_passes_teacher_and_below() {
        assert!(role_has_permission("teacher", "student"));
        assert!(role_has_permission("teacher", "teacher"));
        assert!(!role_has_permission("teacher", "admin"));
    }

    #[test]
    fn case_insensitive() {
        assert!(role_has_permission("ADMIN", "admin"));
        assert!(role_has_permission("TEACHER", "student"));
        assert!(!role_has_permission("STUDENT", "TEACHER"));
    }

    #[test]
    fn unknown_role_fails() {
        assert!(!role_has_permission("superuser", "student"));
        assert!(!role_has_permission("teacher", "superuser"));
    }
}
