use uuid::Uuid;

use super::types::TenantMembershipPayload;

pub fn select_active_tenant(
    profile_tenant_id: Option<Uuid>,
    memberships: &[TenantMembershipPayload],
) -> Uuid {
    let fallback = memberships
        .first()
        .map(|m| m.tenant_id)
        .unwrap_or_else(Uuid::nil);

    profile_tenant_id
        .filter(|tenant_id| memberships.iter().any(|m| m.tenant_id == *tenant_id))
        .unwrap_or(fallback)
}

pub fn select_active_role(active_tenant_id: Uuid, memberships: &[TenantMembershipPayload]) -> String {
    memberships
        .iter()
        .find(|m| m.tenant_id == active_tenant_id)
        .map(|m| m.role.clone())
        .or_else(|| memberships.first().map(|m| m.role.clone()))
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn membership(tenant_id: Uuid, role: &str) -> TenantMembershipPayload {
        TenantMembershipPayload {
            tenant_id,
            tenant_name: "Sekolah".to_string(),
            tenant_slug: "sekolah".to_string(),
            tenant_logo: None,
            role: role.to_string(),
            status: "active".to_string(),
            is_active: true,
            joined_at: None,
        }
    }

    #[test]
    fn selects_profile_tenant_when_present() {
        let a = Uuid::new_v4();
        let b = Uuid::new_v4();
        let memberships = vec![membership(a, "teacher"), membership(b, "student")];
        assert_eq!(select_active_tenant(Some(b), &memberships), b);
        assert_eq!(select_active_role(b, &memberships), "student");
    }

    #[test]
    fn falls_back_to_first_membership_when_profile_tenant_missing() {
        let a = Uuid::new_v4();
        let b = Uuid::new_v4();
        let c = Uuid::new_v4();
        let memberships = vec![membership(a, "teacher"), membership(b, "student")];
        assert_eq!(select_active_tenant(Some(c), &memberships), a);
        assert_eq!(select_active_role(a, &memberships), "teacher");
    }
}

