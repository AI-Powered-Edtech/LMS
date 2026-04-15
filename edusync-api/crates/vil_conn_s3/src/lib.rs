use bytes::Bytes;
use minio::s3::{
    builders::ObjectContent,
    creds::StaticProvider,
    http::BaseUrl,
    types::{S3Api, ToStream},
    Client,
};
use std::fmt;
use std::time::Duration;
use tokio_stream::StreamExt;

#[derive(Clone, Debug)]
pub struct S3Config {
    pub bucket: String,
    pub region: String,
    pub access_key: String,
    pub secret_key: String,
    pub endpoint: Option<String>,
    pub path_style: bool,
}

impl Default for S3Config {
    fn default() -> Self {
        Self {
            bucket: String::new(),
            region: "auto".to_string(),
            access_key: String::new(),
            secret_key: String::new(),
            endpoint: None,
            path_style: true,
        }
    }
}

#[derive(Debug, Clone)]
pub struct S3Error(String);

impl fmt::Display for S3Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::error::Error for S3Error {}

#[derive(Clone)]
pub struct S3Connector {
    inner: Client,
    bucket: String,
}

impl S3Connector {
    pub async fn new(config: S3Config) -> Result<Self, S3Error> {
        let endpoint = config
            .endpoint
            .as_deref()
            .unwrap_or("https://s3.amazonaws.com");
        let base_url: BaseUrl = endpoint
            .parse()
            .map_err(|e| S3Error(format!("S3 endpoint tidak valid: {e}")))?;

        let provider: Option<Box<dyn minio::s3::creds::Provider + Send + Sync>> =
            if config.access_key.is_empty() || config.secret_key.is_empty() {
                None
            } else {
                Some(Box::new(StaticProvider::new(
                    &config.access_key,
                    &config.secret_key,
                    None,
                )))
            };

        let inner = Client::new(base_url, provider, None, None)
            .map_err(|e| S3Error(format!("Gagal inisialisasi client S3: {e}")))?;

        Ok(Self {
            inner,
            bucket: config.bucket,
        })
    }

    pub async fn put(
        &self,
        key: &str,
        body: Bytes,
        _content_type: Option<&str>,
    ) -> Result<(), S3Error> {
        self.inner
            .put_object_content(&self.bucket, key, body)
            .send()
            .await
            .map(|_| ())
            .map_err(|e| S3Error(format!("S3 put gagal: {e}")))
    }

    pub async fn get(&self, key: &str) -> Result<Vec<u8>, S3Error> {
        let resp = self
            .inner
            .get_object(&self.bucket, key)
            .send()
            .await
            .map_err(|e| S3Error(format!("S3 get gagal: {e}")))?;

        collect_content(resp.content).await
    }

    pub async fn delete(&self, key: &str) -> Result<(), S3Error> {
        self.inner
            .delete_object(&self.bucket, key)
            .send()
            .await
            .map(|_| ())
            .map_err(|e| S3Error(format!("S3 delete gagal: {e}")))
    }

    pub async fn list(&self, prefix: &str) -> Result<Vec<String>, S3Error> {
        let mut stream = self
            .inner
            .list_objects(&self.bucket)
            .prefix(Some(prefix.to_string()))
            .to_stream()
            .await;

        let mut keys = Vec::new();
        while let Some(page) = stream.next().await {
            let resp = page.map_err(|e| S3Error(format!("S3 list gagal: {e}")))?;
            for entry in resp.contents {
                if entry.is_prefix {
                    continue;
                }
                keys.push(entry.name);
            }
        }

        Ok(keys)
    }

    pub async fn presign_get(&self, key: &str, expires: Duration) -> Result<String, S3Error> {
        self.inner
            .get_presigned_object_url(&self.bucket, key, http::Method::GET)
            .expiry_seconds(expires.as_secs().min(u64::from(u32::MAX)) as u32)
            .send()
            .await
            .map(|resp| resp.url)
            .map_err(|e| S3Error(format!("S3 presign GET gagal: {e}")))
    }

    pub async fn presign_put(&self, key: &str, expires: Duration) -> Result<String, S3Error> {
        self.inner
            .get_presigned_object_url(&self.bucket, key, http::Method::PUT)
            .expiry_seconds(expires.as_secs().min(u64::from(u32::MAX)) as u32)
            .send()
            .await
            .map(|resp| resp.url)
            .map_err(|e| S3Error(format!("S3 presign PUT gagal: {e}")))
    }
}

async fn collect_content(content: ObjectContent) -> Result<Vec<u8>, S3Error> {
    content
        .to_segmented_bytes()
        .await
        .map(|sb| sb.to_bytes().to_vec())
        .map_err(|e| S3Error(format!("S3 read body gagal: {e}")))
}

