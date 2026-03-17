# EduSync Auth & Roles UX Blueprint

Dokumen ini adalah cetak biru (blueprint) komprehensif untuk implementasi UX Autentikasi dan Manajemen Role di EduSync. Blueprint ini memastikan transisi yang mulus antara *public state*, *authenticated state*, dan pemisahan hierarki antarmuka berdasarkan *role* (Admin, Teacher, Student) di lingkungan Multi-Tenant.

---

## 1. Route Structure & Routing Guards

Sistem *routing* harus memisahkan area publik dan privat secara ketat, serta melakukan isolasi tata letak (*layout*) berdasarkan role pengguna.

```text
/ (Root)
├── (Public Layout / Auth Layout)
│   ├── /login                 # Halaman utama login
│   ├── /register              # Pendaftaran akun (jika diaktifkan per tenant)
│   ├── /forgot-password       # Permintaan reset password
│   ├── /reset-password        # Form input password baru (dari link email)
│   └── /invite                # Halaman accept invitation dari email
│
├── (Protected Layout / Dashboard Layout)
│   ├── /onboarding            # Setup profil awal setelah register
│   │
│   ├── /admin                 # [RoleGuard: ADMIN]
│   │   ├── /admin/dashboard
│   │   ├── /admin/users       # Manajemen staff, teacher, student
│   │   ├── /admin/classes     # Manajemen seluruh kelas di tenant
│   │   ├── /admin/billing     # Manajemen langganan
│   │   └── /admin/settings    # Pengaturan tenant (logo, fitur toggle)
│   │
│   ├── /teacher               # [RoleGuard: TEACHER]
│   │   ├── /teacher/dashboard
│   │   ├── /teacher/courses   # Course Builder & class management
│   │   ├── /teacher/gradebook # SpeedGrader, nilai assignment & quiz
│   │   ├── /teacher/questions # Question Bank management
│   │   └── /teacher/reports   # Analytics untuk kelas yang diajar
│   │
│   ├── /student               # [RoleGuard: STUDENT]
│   │   ├── /student/dashboard # Ringkasan deadline, progress, recent activity
│   │   ├── /student/courses   # Kelas yang diikuti
│   │   ├── /student/tasks     # To-Do list (Assignments & Quizzes)
│   │   ├── /student/grades    # Rapot dan feedback
│   │   └── /student/badges    # Gamifikasi, Leaderboard
│   │
│   └── /shared                # [RoleGuard: ALL]
│       ├── /profile           # Edit profil (Avatar, Nama, Password)
│       ├── /messages          # Direct messaging / Forum
│       └── /notifications     # Pusat notifikasi
```

---

## 2. Screen-by-Screen Flow (Auth & Onboarding)

### A. Login Flow (Multi-Tenant Aware)
1. **Screen 1: Tenant Resolver (Opsional)**
   - Jika user mengakses `edusync.app/login`, sistem mungkin meminta `Workspace ID` / `School Code` terlebih dahulu.
   - *Bypass*: Jika user mengakses via subdomain (misal: `sekolah-a.edusync.app`), sistem otomatis membaca *tenant_id* dari URL.
2. **Screen 2: Credentials**
   - Form input: Email & Password.
   - Opsi SSO: "Sign in with Google" / "Sign in with Microsoft" (Sangat umum di ekosistem sekolah).
3. **Screen 3: Post-Login Routing**
   - Mengambil data `user_roles` dan `tenant_id` dari token JWT / Database.
   - *Redirect logic*:
     - Jika Admin $\rightarrow$ `/admin/dashboard`
     - Jika Teacher $\rightarrow$ `/teacher/dashboard`
     - Jika Student $\rightarrow$ `/student/dashboard`

### B. Onboarding Flow (First Time Login)
1. **Screen 1: Welcome & Profile Setup**
   - Upload Avatar, set Nama Lengkap, preferensi bahasa.
2. **Screen 2: Role-Specific Action**
   - **Student:** Input `Class Join Code` untuk otomatis terdaftar ke kelas.
   - **Teacher:** Panduan singkat (Tooltip tour) membuat kelas pertama.
   - **Admin:** Mengisi detail organisasi/sekolah (Nama Sekolah, Logo, Tahun Ajaran).

---

## 3. Sidebar Navigation Structure

Sidebar adalah pusat navigasi utama. Isinya berubah secara dinamis sesuai konteks Role pengguna.

### 🛡️ Admin Sidebar
- **📊 Overview** (Dashboard metrik platform)
- **🏢 Organization** (Detail tenant, departemen)
- **👥 Users** (Students, Teachers, Admins, Invitations)
- **📚 Academic** (Seluruh Course & Class di sekolah)
- **⚙️ Settings** (Feature Toggles, Integrasi SSO, Tema)

### 👩‍🏫 Teacher Sidebar
- **🏠 Home** (Jadwal hari ini, *Action items*)
- **🏫 My Classes** (Daftar kelas aktif yang diajar)
- **📖 Course Builder** (Membuat modul, materi, video)
- **✅ Grading** (SpeedGrader, *Submissions needing review*)
- **🗄️ Question Bank** (Manajemen soal kuis)
- **📈 Analytics** (Laporan performa siswa, *At-risk students*)

### 👨‍🎓 Student Sidebar
- **🧭 Hub** (Pengumuman, jadwal terdekat, *continue learning*)
- **📚 My Learning** (Kelas yang saat ini didaftar)
- **📝 To-Do / Tasks** (Tugas & Kuis yang belum dikerjakan, diurutkan dari *deadline* terdekat)
- **📊 My Grades** (Nilai, umpan balik dari guru)
- **🏆 Achievements** (Badges, Streaks, Leaderboard)

*Di bagian paling bawah dari semua sidebar:*
- **⚙️ Preferences**
- **🚪 Logout** (Menampilkan Mini-Profile: Avatar + Nama + Peran)

---

## 4. React Component Architecture

Arsitektur Frontend harus mendukung isolasi sesi dan pemisahan perbaikan akses yang ketat.

### Contexts
- `AuthContext`: Menyimpan status `user` dari Supabase auth (`session`, `user.id`, `signOut()`, `signIn()`).
- `TenantContext`: Menyimpan informasi organisasi saat ini (`tenant_id`, `tenant_name`, `logo_url`, `theme_colors`).
- `RoleContext`: Menyimpan dan mengelola peran pengguna saat ini (*current active role*) secara terpisah dari TenantContext, memungkinkan *switching* peran dengan cepat (misal dari Teacher ke Admin) tanpa perlu melakukan *reload* keseluruhan sesi institusi.

### HOC / Routing Guards
```tsx
// 1. Authenticated Guard (Mencegah user anonim)
<ProtectedRoute>
  // 2. Tenant Boundary (Mencegah akses cross-tenant jika user punya multi-tenant)
  <TenantGuard>
    // 3. Role-based Guard (Mencegah peretasan URL)
    <RoleRoute allowedRoles={['TEACHER', 'ADMIN']}>
      <DashboardLayout> ... </DashboardLayout>
    </RoleRoute>
  </TenantGuard>
</ProtectedRoute>
```

### Layout Components
- `<AuthLayout>`: *Split screen* (Kiri ilustrasi vektor EduSync, Kanan form putih polos), tanpa header/sidebar.
- `<DashboardLayout>`:
  - `<Sidebar>` (Menerima props `items` berdasarkan *role*).
  - `<Topbar>` (Global Search "Search courses, students...", Breadcrumbs, Notification Bell, Role/Workspace Switcher).
  - `<PageContent>` (Konten utama yang terbungkus dalam `max-w-7xl` untuk keterbacaan).

### State Management & UX Patterns
- **Loading States:** Gunakan *Skeleton Loaders* (bukan sekadar spinner) saat mengambil profil atau metrik *dashboard* awal agar tidak terjadi *layout shift*.
- **Role Switching:** (Khusus jika 1 user memiliki *role* Teacher dan Admin secara bersamaan) $\rightarrow$ Sediakan *dropdown* "Switch View" di Topbar (contoh: "Viewing as: Admin ▼").
- **Permission Boundary (UI Level):**
  Alih-alih menyembunyikan tombol, terkadang lebih baik menonaktifkannya (*disabled*) dengan *tooltip* (misalnya tombol "Delete Class" untuk *Teacher* yang bukan pemilik kelas utama). Gunakan utilitas pembantu seperti `HasPermission({ action: 'delete_class', children })`.

---

## 5. Security & Edge Cases UX

1. **Session Expiry:** Jika token JWT habis, jangan paksa *hard reload* yang menghilangkan input user. Munculkan *Modal Overlay* "Your session has expired. Please log in again to continue." (Sangat penting saat ujian/kuis).
2. **Access Denied (403):** Jangan kembalikan layar putih kosong. Tampilkan komponen `<UnauthorizedView>` yang ramah (Misal: ilustrasi maskot menggaruk kepala + tombol "Return to Dashboard").
3. **Ghost Users:** Siswa yang sudah dikeluarkan (di-deaktivasi) oleh Admin dari Tenant harus segera di-*kick* ke layar *Login* menggunakan pendeteksian koneksi WebSocket (jika memungkinkan) atau pengecekan *middleware/edge-function*.
