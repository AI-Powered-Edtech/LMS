import { execSync } from 'child_process';

const teacherEmail = 'guru.demo@edusync.lms';
const studentEmail = 'siswa.demo@edusync.lms';

try {
  execSync(`sudo -u postgres psql edusync -c "INSERT INTO tenants (id, name, slug) VALUES ('00000000-0000-0000-0000-000000000001', 'Default Tenant', 'default') ON CONFLICT DO NOTHING;"`);
  execSync(`sudo -u postgres psql edusync -c "DELETE FROM auth.users WHERE email IN ('${teacherEmail}', '${studentEmail}');"`);
  execSync(`sudo -u postgres psql edusync -c "DELETE FROM users WHERE email IN ('${teacherEmail}', '${studentEmail}');"`);
  console.log("Cleanup done.");
} catch (e) {
  console.error("Cleanup error:", e.message);
}
