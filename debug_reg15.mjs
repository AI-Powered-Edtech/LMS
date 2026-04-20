import { execSync } from 'child_process';
const teacherEmail = 'guru.demo@edusync.lms';
try {
  execSync(`sudo -u postgres psql edusync -c "INSERT INTO user_roles (user_id, role, tenant_id) VALUES ((SELECT id FROM users WHERE email = '${teacherEmail}'), 'TEACHER', '00000000-0000-0000-0000-000000000001');"`);
  console.log("Success");
} catch(e) {
  console.log("Error:", e.message);
}
