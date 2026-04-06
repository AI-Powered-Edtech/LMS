# Quick Fixes for Console Errors

## Issues Found in Console Output

### 1. Missing `tenant_memberships` Table ✅ Fixed
**Error:** `Could not find the table 'public.tenant_memberships' in the schema cache`

**Solution:** Migration 039 already created. Run it:
```bash
supabase db push
```

Or manually in Supabase SQL Editor:
```sql
-- Run the migration file
-- File: supabase/migrations/039_create_tenant_memberships.sql
```

---

### 2. CORS Error on Edge Function ✅ Fixed
**Error:** `Access to fetch at '.../recommend-learning-path' has been blocked by CORS policy`

**Solution:** Updated `supabase/functions/_shared/cors.ts` to allow localhost:5173

**To apply:**
1. Deploy the updated edge function:
   ```bash
   supabase functions deploy recommend-learning-path
   ```
2. Or manually set CORS_ORIGIN env var:
   ```bash
   supabase secrets set CORS_ORIGIN=http://localhost:5173
   ```

---

### 3. WebSocket Connection Closed ⚠️ Warning
**Error:** `WebSocket connection to 'wss://...supabase.co/realtime/v1/websocket' failed`

**Cause:** Likely due to:
- Invalid tenant_id (`00000000-0000-0000-0000-00000000000d` looks like placeholder data)
- Network interruption
- Auth token expiry

**Solution:** 
- Ensure you're logged in with a real user account
- Check that tenant_id is valid in your database
- This is non-critical; the app will retry automatically

---

### 4. CSP `frame-ancestors` Warning ℹ️ Info Only
**Warning:** `The Content Security Policy directive 'frame-ancestors' is ignored when delivered via a <meta> element.`

**Cause:** `frame-ancestors` must be set via HTTP headers, not meta tags

**Solution:** Add to Vercel/Netlify headers or `vite.config.ts`:
```javascript
// vite.config.ts
export default defineConfig({
  // ...
  server: {
    headers: {
      'Content-Security-Policy': "frame-ancestors 'self' https://your-domain.com"
    }
  }
})
```

This is non-critical for development.

---

### 5. 404 on `tenant_memberships` ✅ Fixed by Migration 039
**Error:** `Failed to load resource: the server responded with a status of 404`

**Solution:** Same as #1 - run migration 039

---

## Quick Fix Checklist

- [x] CORS headers updated for localhost development
- [ ] Run migration 039: `supabase db push`
- [ ] Deploy edge function: `supabase functions deploy recommend-learning-path`
- [ ] Verify you're logged in with real user account (not placeholder tenant)
- [ ] (Optional) Add CSP headers to Vite config for production

---

## Verification

After applying fixes, reload the page and verify:
1. ✅ No `tenant_memberships` errors
2. ✅ No CORS errors on edge functions
3. ✅ WebSocket connects successfully
4. ✅ All API calls return 200 OK

---

**Date:** April 6, 2026  
**Status:** Fixes ready to deploy
