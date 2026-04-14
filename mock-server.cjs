const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log('Mock server received:', req.method, req.url);
  next();
});

app.post('/api/v1/internal/rate-limit', (req, res) => {
  res.json({ allowed: true });
});

let lastEmail = 'admin@edusync.dev';

app.post('/api/v1/auth/login', (req, res) => {
  lastEmail = req.body.email || 'admin@edusync.dev';
  let role = 'admin';
  if (lastEmail.includes('student')) role = 'student';
  if (lastEmail.includes('teacher') || lastEmail.includes('guru')) role = 'teacher';
  
  res.json({
    access_token: 'mock-token',
    refresh_token: 'mock-refresh',
    user: { id: 'user-123', email: lastEmail, role: role, email_confirmed_at: new Date().toISOString() }
  });
});

app.get('/api/v1/auth/bootstrap', (req, res) => {
  let role = 'admin';
  if (lastEmail.includes('student')) role = 'student';
  if (lastEmail.includes('teacher') || lastEmail.includes('guru')) role = 'teacher';

  let fullName = 'Admin Demo';
  if (role === 'student') fullName = 'Siswa Demo';
  if (role === 'teacher') fullName = 'Guru Demo';

  res.json({
    user: { id: 'user-123', email: lastEmail, role: role, email_confirmed_at: new Date().toISOString() },
    profile: { id: 'prof-123', full_name: fullName },
    memberships: [
      {
        tenant_id: 'tenant-1',
        tenant_name: 'Sekolah Demo',
        tenant_slug: 'sekolah-demo',
        role: role,
        status: 'active',
        is_active: true
      }
    ],
    default_tenant_id: 'tenant-1'
  });
});

app.get('/rest/v1/users', (req, res) => {
  res.json([{ id: 'user-123', email: 'admin@edusync.dev', role: 'admin', profile_id: 'prof-123' }]);
});

app.get('/rest/v1/user_profiles', (req, res) => {
  res.json([{ id: 'prof-123', full_name: 'Admin Demo' }]);
});

app.get('/rest/v1/courses', (req, res) => {
  res.json([{ id: 'course-1', title: 'Demo Course', description: 'This is a demo course.' }]);
});

app.post('/api/v1/auth/create-tenant', (req, res) => {
  res.json({
    tenant_id: 'tenant-1',
    name: req.body.schoolName || req.body.name,
    slug: 'sekolah-demo'
  });
});

app.get('/api/v1/courses', (req, res) => {
  res.json({
    courses: [{ id: 'course-1', title: 'Demo Course', description: 'This is a demo course.', status: 'published', tenant_id: 'tenant-1' }],
    count: 1
  });
});

app.use((req, res) => {
  res.json({ data: [] });
});

app.listen(8080, '0.0.0.0', () => {
  console.log('Mock server listening on 0.0.0.0:8080');
});
