use redis::{aio::ConnectionManager, Client};
use serde::{de::DeserializeOwned, Serialize};
use std::sync::Arc;
use std::time::Duration;

pub mod session;

pub use session::SessionCache;

#[derive(Clone)]
pub struct CacheClient {
    conn: ConnectionManager,
}

impl CacheClient {
    pub async fn new(redis_url: &str) -> anyhow::Result<Self> {
        let client = Client::open(redis_url.to_string())?;
        let conn = ConnectionManager::new(client).await?;
        Ok(Self { conn })
    }

    pub async fn get<T: DeserializeOwned>(&self, key: &str) -> anyhow::Result<Option<T>> {
        let value: Option<String> = self.conn.get(key).await?;
        match value {
            Some(v) => {
                let deserialized: T = serde_json::from_str(&v)?;
                Ok(Some(deserialized))
            }
            None => Ok(None),
        }
    }

    pub async fn set<T: Serialize>(&self, key: &str, value: &T, ttl: Duration) -> anyhow::Result<()> {
        let serialized = serde_json::to_string(value)?;
        self.conn.set_ex(key, serialized, ttl.as_secs() as u64).await?;
        Ok(())
    }

    pub async fn delete(&self, key: &str) -> anyhow::Result<()> {
        self.conn.del(key).await?;
        Ok(())
    }

    pub async fn exists(&self, key: &str) -> bool {
        self.conn.exists(key).await.unwrap_or(false)
    }
}

pub type CacheClientRef = Arc<CacheClient>;

pub fn create_cache_pool(redis_url: &str) -> impl std::future::Future<Output = anyhow::Result<CacheClientRef>> + '_ {
    async move {
        let client = CacheClient::new(redis_url).await?;
        Ok(Arc::new(client))
    }
}