# Load Testing

K6 load testing scripts untuk EduSync LMS.

## Setup

1. Install k6:

   ```bash
   # macOS
   brew install k6

   # Linux (snap)
   sudo snap install k6

   # Linux (apt)
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update && sudo apt-get install k6
   ```

2. Set environment variables:

   ```bash
   export SUPABASE_URL=https://your-project.supabase.co
   export SUPABASE_ANON_KEY=eyJ...
   export TEST_USER_TOKEN=eyJ...  # JWT token user yang valid
   export TEST_QUIZ_ID=uuid-of-quiz  # untuk quiz-flow-load.js
   ```

3. Jalankan test:
   ```bash
   k6 run k6/parent-dashboard-load.js
   k6 run k6/principal-dashboard-load.js
   k6 run k6/bulk-import-stress.js
   k6 run k6/quiz-flow-load.js
   ```

## Scripts

| Script                        | Skenario                              | VUs | Durasi    | Target                      |
| ----------------------------- | ------------------------------------- | --- | --------- | --------------------------- |
| `parent-dashboard-load.js`    | 500 parents membuka dashboard         | 500 | 2 menit   | p95 < 2s, error < 1%        |
| `principal-dashboard-load.js` | 10 principals + 50 admins             | 60  | 1.5 menit | p95 < 3s, error < 1%        |
| `bulk-import-stress.js`       | 5 concurrent bulk imports (200 users) | 5   | 2 menit   | < 30s per batch, error < 5% |
| `quiz-flow-load.js`           | 100 siswa kuis bersamaan              | 100 | ~2 menit  | p95 < 2s, error < 1%        |

## Tips

- Gunakan `--out json=result.json` untuk export hasil ke file JSON
- Gunakan `k6 run --vus 10 --duration 30s script.js` untuk quick test
- Pastikan TEST_USER_TOKEN masih valid (belum expired)
- Untuk stress test bulk import, gunakan token admin
