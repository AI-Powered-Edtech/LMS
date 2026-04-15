use sqlx::{Postgres, Transaction};
use uuid::Uuid;

/// Injects per-request RLS context into an active PostgreSQL transaction via `SET LOCAL`.
///
/// Call at the start of any transaction that reads tables protected by RLS policies
/// referencing `current_setting('app.current_user_id')` or `current_setting('app.current_tenant_id')`.
///
/// Uses `set_config(..., is_local := true)` so the settings are automatically cleared
/// when the transaction ends — no cleanup required.
///
/// # Example
///
/// ```text
/// let mut tx = pool.begin().await?;
/// set_rls_context(&mut tx, user_id, tenant_id).await?;
/// // your queries run with RLS context set locally to the transaction
/// tx.commit().await?;
/// ```
pub async fn set_rls_context(
    tx: &mut Transaction<'_, Postgres>,
    user_id: Uuid,
    tenant_id: Uuid,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "SELECT set_config('app.current_user_id', $1, true), \
                set_config('app.current_tenant_id', $2, true)",
    )
    .bind(user_id.to_string())
    .bind(tenant_id.to_string())
    .execute(&mut **tx)
    .await?;
    Ok(())
}
