# JWT Private Key Rotation — 2026-05-07

## Insiden

`edusync-api/jwt-private.pem` ter-commit ke public repo (`AI-Powered-Edtech/LMS`). Blob teridentifikasi di:

- 2 commits: `30538c8868b...`, `d4b454e5ca8...`
- Sudah dihapus dari working tree via commit `25c5b2733 fix(security): remove exposed JWT private key`
- BUT blob tetap ada di pack history sampai `git filter-repo` dijalankan.

## Tindakan yang sudah dilakukan (commit ini)

1. ✅ Generate new RSA-2048 keypair ke `/tmp/edusync-jwt-new/`
2. ✅ Run `git filter-repo --path edusync-api/jwt-private.pem --invert-paths --force`
3. ✅ Force-push `main` ke origin (history rewrite)
4. ✅ Stale agent branches dihapus (juga membawa blob yang bocor di branch tersebut)

## Tindakan WAJIB oleh operator (deployment side)

### A. Replace key di production server

```bash
# Backup old key (untuk rollback dalam 24 jam, lalu shred):
mv /etc/edusync/jwt-private.pem /etc/edusync/jwt-private.pem.OLD-2026-05-07

# Install new key:
scp /tmp/edusync-jwt-new/jwt-private.pem  user@prod:/etc/edusync/jwt-private.pem
scp /tmp/edusync-jwt-new/jwt-public.pem   user@prod:/etc/edusync/jwt-public.pem
chmod 600 /etc/edusync/jwt-private.pem
chown edusync:edusync /etc/edusync/jwt-*.pem

# Restart API:
systemctl restart edusync-api
```

### B. Invalidate semua refresh token

```sql
-- Connect to prod DB:
DELETE FROM public.refresh_tokens;
-- atau:
UPDATE public.refresh_tokens SET revoked_at = NOW() WHERE revoked_at IS NULL;
```

Semua user akan logout secara paksa. Komunikasikan via banner + email 24 jam sebelumnya kalau bisa.

### C. Rotate environment secrets terkait

Kalau JWT key dipakai sebagai HMAC secret di tempat lain (cek `.env.production`):

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`  
- `LTI_RSA_PRIVATE_KEY` (kalau pakai key sama)

Generate baru semua, rolling restart.

### D. Notifikasi downstream

Kalau ada platform LTI yang verify token via JWKS endpoint EduSync:

- Update `LTI_RSA_PUBLIC_KEY` di registrasi platform partner
- Delay 1 hari untuk propagation

### E. Audit log review

```sql
SELECT created_at, user_id, action, ip_address 
FROM public.app_audit_logs 
WHERE created_at > '2026-04-01' 
  AND action IN ('login', 'token_refresh', 'admin_login')
ORDER BY created_at DESC LIMIT 1000;
```

Cari aktivitas mencurigakan dari IP non-trusted dalam window setelah leak occurred.

## Verifikasi

```bash
git rev-list --objects --all | grep jwt-private  # harus kosong
curl -i https://api.edusync.example/api/v1/health  # harus 200
```

## Lesson learned

- `.gitignore` `*.pem` (dengan whitelist `!**/jwt-public.pem`) sudah di-add di commit `1f11f9612` cleanup
- Pre-commit hook untuk detect `BEGIN PRIVATE KEY` patterns: TODO follow-up
