import { execSync } from 'child_process';
try {
  execSync(`sudo -u postgres psql edusync -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"`);
  execSync(`sudo -u postgres psql edusync -c "UPDATE auth.users SET encrypted_password = crypt('password123', gen_salt('bf')) WHERE email IN ('guru.demo@edusync.lms', 'siswa.demo@edusync.lms');"`);
  console.log("Passwords updated to password123.");
} catch (e) {
  console.log("Error:", e.message);
}
