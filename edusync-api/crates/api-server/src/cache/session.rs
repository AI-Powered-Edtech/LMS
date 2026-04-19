use serde::{Deserialize, Serialize};
use std::time::Duration;

use super::CacheClient;

const SESSION_TTL: Duration = Duration::from_secs(24 * 60 * 60);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedSession {
    pub user_id: String,
    pub tenant_id: String,
    pub role: String,
    pub email: String,
    pub created_at: i64,
    pub expires_at: i64,
}

pub struct SessionCache {
    cache: CacheClient,
}

impl SessionCache {
    pub fn new(cache: CacheClient) -> Self {
        Self { cache }
    }

    pub async fn get(&self, session_id: &str) -> anyhow::Result<Option<CachedSession>> {
        let key = format!("session:{}", session_id);
        self.cache.get(&key).await
    }

    pub async fn set(&self, session_id: &str, session: &CachedSession) -> anyhow::Result<()> {
        let key = format!("session:{}", session_id);
        self.cache.set(&key, session, SESSION_TTL).await
    }

    pub async fn delete(&self, session_id: &str) -> anyhow::Result<()> {
        let key = format!("session:{}", session_id);
        self.cache.delete(&key).await
    }

    pub async fn exists(&self, session_id: &str) -> bool {
        let key = format!("session:{}", session_id);
        self.cache.exists(&key).await
    }
}