use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AuthError;

pub fn hash_password(plain: &str) -> Result<String, AuthError> {
    let salt = SaltString::generate(&mut OsRng);

    Argon2::default()
        .hash_password(plain.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|error| AuthError::Internal(error.to_string()))
}

pub fn verify_password(plain: &str, hash: &str) -> Result<bool, AuthError> {
    if hash.starts_with("$argon2") {
        let parsed =
            PasswordHash::new(hash).map_err(|error| AuthError::Internal(error.to_string()))?;
        return Ok(Argon2::default()
            .verify_password(plain.as_bytes(), &parsed)
            .is_ok());
    }

    if hash.starts_with("$2b$") || hash.starts_with("$2a$") || hash.starts_with("$2y$") {
        return bcrypt::verify(plain, hash).map_err(|error| AuthError::Internal(error.to_string()));
    }

    Err(AuthError::Internal("Unknown hash format".to_string()))
}

pub async fn maybe_rehash(
    pool: &PgPool,
    user_id: Uuid,
    plain: &str,
    current_hash: &str,
) -> Result<(), AuthError> {
    if current_hash.starts_with("$2b$") || current_hash.starts_with("$2a$") {
        let new_hash = hash_password(plain)?;

        sqlx::query!(
            "UPDATE public.users SET encrypted_password = $1, updated_at = now() WHERE id = $2",
            new_hash,
            user_id
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{hash_password, verify_password};

    #[test]
    fn password_hashes_with_argon2() {
        let hash = hash_password("password123").expect("hash should be generated");
        assert!(hash.starts_with("$argon2"));
    }

    #[test]
    fn password_verifies_with_argon2() {
        let hash = hash_password("password123").expect("hash should be generated");
        assert!(verify_password("password123", &hash).expect("verification should succeed"));
        assert!(!verify_password("wrong-password", &hash).expect("verification should succeed"));
    }
}
