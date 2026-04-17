# TWA — Trusted Web Activity untuk EduSync LMS

Panduan untuk membungkus PWA EduSync menjadi aplikasi Android yang bisa
dipublikasi ke Google Play Store menggunakan **Trusted Web Activity (TWA)**
via [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap).

---

## What is a TWA?

A Trusted Web Activity is an Android container that renders your installed
PWA full-screen using Chrome Custom Tabs, with the browser chrome hidden once
**Digital Asset Links** verify that the APK/AAB and the web origin are owned
by the same party. The result is an app indistinguishable from a native app on
the Play Store, while the UI, routing, and updates remain 100% your PWA.

### Why TWA instead of a native/React Native rewrite?

- **Single codebase.** We already ship a production-grade PWA (service worker,
  offline shell, push notifications, installable). Rewriting for native would
  cost months and fragment feature parity.
- **Automatic updates.** Pushing a new PWA build = pushing a new app version
  for all users. No Play Store review loop for day-to-day changes.
- **Full web platform.** WebSockets, WebRTC, WebAuthn, service workers,
  IndexedDB — all available, unlike a stripped-down WebView.
- **Small AAB.** The produced `app-release.aab` is typically <2 MB.
- **Play Billing / native integrations** still available through the
  Bubblewrap plugin ecosystem if we need them later.

Trade-off: the user must have Chrome (or another TWA-capable browser) >= 75
installed. In Indonesia that covers essentially all modern Android devices.

---

## Prerequisites

| Tool          | Minimum version | Check                          |
| ------------- | --------------- | ------------------------------ |
| Node.js       | 20.x            | `node --version`               |
| JDK (Temurin) | 17              | `java -version`                |
| Android SDK   | cmdline-tools   | `echo $ANDROID_HOME`           |
| Bubblewrap    | latest          | `bubblewrap --version`         |

`ANDROID_HOME` should point at your SDK root (typically `~/Android/Sdk` on
Linux/macOS, `%LOCALAPPDATA%\Android\Sdk` on Windows). Install the
"Android SDK Command-line Tools (latest)" and a recent Build-Tools via Android
Studio's SDK Manager.

---

## Step-by-step setup

### 1. Run the bootstrap helper

```bash
./scripts/twa-bootstrap.sh
```

The script verifies prerequisites and installs `@bubblewrap/cli` globally if
it's missing. It does **not** run `bubblewrap init` for you — Bubblewrap is
interactive, and you must review every prompt (especially the signing key
step).

You can point it at a non-production domain via:

```bash
EDUSYNC_DOMAIN=staging.edusync.id ./scripts/twa-bootstrap.sh
```

### 2. Initialise the TWA project

In a dedicated working directory outside this repo (the generated Android
project is large and not meant to be committed here):

```bash
mkdir -p ~/edusync-twa && cd ~/edusync-twa
bubblewrap init --manifest=https://app.edusync.id/manifest.webmanifest
```

Recommended answers to the prompts:

- **Application ID / package name:** `id.edusync.lms`
- **Application name:** `EduSync LMS`
- **Launcher name:** `EduSync`
- **Display mode:** `standalone`
- **Orientation:** `default` (or `portrait` to lock)
- **Theme color / background color:** accept values pulled from the manifest.
- **Signing key:** **generate a new keystore**. Bubblewrap will prompt for
  keystore path, alias, and two passwords.
  - Store the `.keystore` file AND both passwords in 1Password / Vault under
    `EduSync / Android signing key`.
  - **Losing this key means we can never publish an update to this app again.**
    Google Play App Signing can mitigate this (recommended — enabled by
    default for new apps); still back up the upload key.

### 3. Build the release bundle

```bash
bubblewrap build
```

Produces `app-release.aab` (Android App Bundle) in the project root. This is
the artifact you upload to the Play Console.

### 4. Upload to Play Console

1. Create the app in [Play Console](https://play.google.com/console/) if it
   doesn't exist. Package name must match step 2 (`id.edusync.lms`).
2. Navigate to **Testing > Internal testing > Create new release**.
3. Upload `app-release.aab`.
4. Fill in release notes and roll out to the internal testers list.

### 5. Retrieve the SHA-256 fingerprint

In Play Console: **Setup > App integrity > App signing**.

Copy the **SHA-256 certificate fingerprint** of the **app signing key**
(not the upload key — Play re-signs uploads). Format:

```
AA:BB:CC:DD:EE:FF:...:99  (32 colon-separated hex pairs)
```

### 6. Populate `assetlinks.json`

```bash
cp public/.well-known/assetlinks.json.template \
   public/.well-known/assetlinks.json
```

Edit `public/.well-known/assetlinks.json`:

- Remove the leading `//` comment block so the file is valid JSON.
- Replace `{{APP_PACKAGE}}` with `id.edusync.lms`.
- Replace `{{SHA256_FINGERPRINT}}` with the value from step 5.

If you have both an upload-key and a separate app-signing key, list both
fingerprints inside the `sha256_cert_fingerprints` array.

### 7. Deploy the frontend

Deploy as usual (see `docs/DEPLOYMENT.md`). The file must be reachable at:

```
https://app.edusync.id/.well-known/assetlinks.json
```

- Served over **HTTPS** with a valid certificate.
- `Content-Type: application/json`.
- **No redirects** (Android will not follow them).
- Status `200 OK`.

### 8. Verify the digital asset link

```bash
curl -fsSL https://app.edusync.id/.well-known/assetlinks.json | jq .
```

You can also use Google's own verifier:

```
https://digitalassetlinks.googleapis.com/v1/statements:list?\
source.web.site=https://app.edusync.id&\
relation=delegate_permission/common.handle_all_urls
```

### 9. Test on device

Install the internal-testing build on a real Android device (the Play Store
tester link, not `adb install`, exercises the same path users will take):

1. Join the internal test track, install EduSync LMS from Play Store.
2. In any app (Gmail, WhatsApp), tap a link like
   `https://app.edusync.id/login`.
3. The link should open directly inside the EduSync app, full-screen,
   **without a Chrome address bar** at the top.

---

## Troubleshooting

### Address bar is visible at the top of the TWA

Digital Asset Links verification failed. Causes:

- `assetlinks.json` is not reachable at the exact path
  `/.well-known/assetlinks.json` (check for trailing slashes, redirects,
  hosting provider 404 fallbacks).
- SHA-256 fingerprint mismatch. Re-copy from Play Console; confirm you used
  the **app signing** key, not the upload key (unless you listed both).
- `package_name` doesn't match the AAB's applicationId.
- JSON is malformed. Run it through `jq .` locally.
- CDN is caching an old version. Purge the `.well-known/` path.

Verify with the Google API call in step 8 — it returns the exact validation
error.

### `bubblewrap init` fails to fetch the manifest

- Is `https://<domain>/manifest.webmanifest` publicly reachable (no Basic
  Auth, no IP allowlist)?
- Check the manifest has `icons` with a `512x512` PNG — required by Play.
- Check `start_url`, `scope`, and `display: "standalone"` are set.

### `bubblewrap build` fails with SDK / licence errors

```bash
# accept SDK licences
yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --licenses
```

Ensure Build-Tools 34.x+ and platform `android-34` are installed.

### Play Console rejects the AAB (signing / version code)

- Every upload must have a strictly increasing `versionCode` in
  `twa-manifest.json`. Bump it and run `bubblewrap update && bubblewrap build`.
- If the signing key changed, Play will reject — you must continue using the
  original upload key. Keep it backed up.

### Push notifications don't arrive inside the TWA

TWAs share the Chrome/browser push channel. Make sure:

- The PWA is installed (TWA counts as installed).
- The user has granted notification permission inside the web flow.
- FCM sender ID in the manifest / backend matches.

---

## Maintenance

- **PWA updates are automatic.** Any deploy to `app.edusync.id` is picked up
  by the TWA on next launch (service worker update lifecycle). No Play Store
  review is required for web changes.
- **TWA container updates** (new Chrome APIs, Play policy changes, bumped
  `targetSdkVersion`) require a new AAB. Plan to run
  `bubblewrap update && bubblewrap build` at least once per quarter, and
  whenever Google announces a new Play `targetSdkVersion` deadline
  (usually August each year).
- **Bump Bubblewrap itself** with `npm i -g @bubblewrap/cli@latest` before
  each container refresh.
- **Rotate / re-verify `assetlinks.json`** if the signing key ever changes
  (e.g. moving to Play App Signing for the first time) — add the new
  fingerprint alongside the old one, deploy, then remove the old one after
  all users have updated.
- **Keep the keystore backup current.** Verify quarterly that the 1Password /
  Vault entry still opens and that the passwords still unlock the keystore:
  ```bash
  keytool -list -v -keystore android.keystore -alias android
  ```

---

## References

- Bubblewrap CLI — https://github.com/GoogleChromeLabs/bubblewrap
- Digital Asset Links — https://developers.google.com/digital-asset-links/v1/getting-started
- Chrome TWA guide — https://developer.chrome.com/docs/android/trusted-web-activity/
- Play Console — https://play.google.com/console/
