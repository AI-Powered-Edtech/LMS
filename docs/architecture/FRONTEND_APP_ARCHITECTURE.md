# EduSync Frontend Application Architecture

Dokumen ini mendefinisikan standar **Arsitektur Sistem Frontend** untuk proyek EduSync. Arsitektur ini dirancang untuk LMS *SaaS multi-tenant* skala produksi yang mengedepankan performa tinggi, pemisahan *concern* yang bersih (*separation of concerns*), skalabilitas tim, dan meminimalisir *technical debt* seiring bertumbuhnya fitur.

---

## 1. Folder Structure & Feature-Based Architecture

EduSync tidak menggunakan struktur rata (flat structure) di mana semua komponen bercampur di satu folder. Kami menggunakan **Feature-Driven Architecture**. Kode dikelompokkan berdasarkan **domain fungsionalitas**, bukan sekadar jenis file (seperti "semua *components* di satu tempat, semua *hooks* di tempat lain").

```text
src/
├── app/                  # Inisialisasi Aplikasi & Konfigurasi Global
│   ├── App.tsx           # Entry point utama
│   ├── router.tsx        # Definisi rute dengan React Router v6 (Data API pattern)
│   └── providers.tsx     # Kompilasi semua global context providers
│
├── features/             # (CORE) Modul Fitur Independen
│   ├── auth/             # Login, Register, Password Reset
│   ├── courses/          # Course Builder, Detail Kelas, Silabus
│   ├── assignments/      # Pembuatan, Pengumpulan tugas
│   ├── quizzes/          # Quiz Builder, Quiz Engine Player, Autosave
│   ├── gradebook/        # SpeedGrader, Rubrik, Rapot
│   ├── analytics/        # Grafik, Tabel Performa Siswa
│   └── gamification/     # Badges, Streaks, Leaderboard
│   │
│   └── (Struktur internal setiap fitur)
│       ├── api/          # Layer service spesifik memanggil API external (Supabase)
│       ├── queries/      # React Query hooks (queries, mutations, invalidations)
│       ├── components/   # Komponen UI spesifik untuk fitur ini
│       ├── hooks/        # Custom hooks spesifik (misal: useQuizTimer)
│       ├── store/        # Zustand slice spesifik (jika kompleks)
│       └── utils/        # Helper function
│
├── components/           # Komponen UI Global / Shared
│   ├── ui/               # Base design system (Button, Input, Modal, dll - shadcn/ui)
│   ├── layout/           # AuthLayout, DashboardLayout, Sidebar, Topbar
│   └── guards/           # ProtectedRoute, RoleRoute, TenantGuard
│
├── contexts/             # Konteks Global
│   ├── AuthContext.tsx
│   ├── TenantContext.tsx
│   └── RoleContext.tsx
│
├── services/             # Konfigurasi Layer API Global
│   ├── supabase/         # Inisialisasi Supabase Client & Realtime config
│   └── realtime.ts       # Global WebSocket event bus (channel subscription)
│
├── hooks/                # Custom Hooks Global (Bukan spesifik fitur)
│   ├── useDebounce.ts
│   └── useLocalStorage.ts
│
├── utils/                # Fungsi Utilitas Murni
│   ├── formatters.ts     # Format tanggal, angka, mata uang
│   └── permissions.ts    # RBAC helper functions
│
└── types/                # Definisi Type Global (Database Enum, Base Models)
```

---

## 2. State Management Architecture

LMS memiliki status (*state*) yang kompleks mulai dari profil pengguna hingga status *timer* ujian. EduSync membagi tanggung jawab *state* ini menggunakan alat yang tepat untuk pekerjaannya:

| Tipe State | Penjelasan | Alat yang Digunakan |
| :--- | :--- | :--- |
| **Global Auth & Core** | Identitas, Tenant, Role. Berubah jarang, diakses di mana-mana. | `React Context` (`AuthContext`, `TenantContext`) |
| **Server Data State** | Data dari database (List tugas, Kelas, Nilai). Butuh *caching*, *polling*, dan invalidasi. | `@tanstack/react-query` (React Query) |
| **Complex UI / Feature State** | Status Quiz Player, Course Builder Drag & Drop, Multi-step form. | `Zustand` (Slices per fitur) |
| **Local UI State** | Status *dropdown* terbuka, input form sederhana. | `useState` / `useReducer` |

---

## 3. Data Fetching & API Layer

Kami memisahkan logika pemanggilan Supabase (API) dari komponen UI untuk memudahkan penulisan *unit test*, *caching*, dan standarisasi penanganan galat (*error handling*).

### Pattern Pemanggilan Data
1. **Service Layer (`/features/courses/api`)**: Murni melakukan RPC atau *query builder* Supabase.
   ```typescript
   export async function getTeacherCourses(teacherId: string) {
     const { data, error } = await supabase.rpc('get_teacher_courses', { p_teacher_id: teacherId });
     if (error) throw new Error(error.message);
     return data;
   }
   ```
2. **React Query Layer (`/features/courses/queries`)**: Membungkus Service Layer dengan kapabilitas *caching* dan *loading state*.
   ```typescript
   export const useTeacherCourses = (teacherId: string) => {
     return useQuery({
       queryKey: ['courses', 'teacher', teacherId],
       queryFn: () => getTeacherCourses(teacherId),
       staleTime: 5 * 60 * 1000, // 5 Menit
     });
   };
   ```
3. **UI Component (`/features/courses/components`)**: Menggunakan *hook* dengan bersih.
   ```tsx
   function CourseList() {
     const { data: courses, isLoading, error } = useTeacherCourses(user.id);
     if (isLoading) return <CourseSkeleton />;
     if (error) return <ErrorMessage error={error} />;
     return <Grid>{courses.map(renderCourse)}</Grid>;
   }
   ```

---

## 4. UI Design System (Shadcn/UI + Tailwind)

Sistem Desain dibangun di atas komponen dasar primitif yang dapat disesuaikan (shadcn/ui), bukan *component library* raksasa (seperti MUI atau AntD) agar ukuran *bundle* tetap kecil dan *styling* bisa sepenuhnya diatur via **Tailwind CSS**.

### Komponen Wajib (Core Primitives):
1. **Forms**: `Input`, `Select`, `Checkbox`, `RadioGroup`, `Switch`, `Form`.
2. **Navigation**: `Button`, `Tabs`, `DropdownMenu`, `Breadcrumb`.
3. **Feedback**: `Toast` (Sonner), `Alert`, `Modal` (Dialog), `Skeleton`, `Badge`.
4. **Data Display**: `Table` (menggunakan `@tanstack/react-table`), `Card`, `Avatar`, `Tooltip`.

---

## 5. Realtime Architecture (Supabase Realtime)

Beberapa area aplikasi tidak bisa mengandalkan pembaruan konvensional (*polling*). Diperlukan sinkronisasi WebSocket untuk fitur kritikal.

### Channel Subscription Standard
- **Pusat Notifikasi**: Setiap user (*student* atau *teacher*) berlangganan ke _channel_ `user_notifications:[user_id]`.
- **Quiz Autosave**: EduSync _tidak_ mengirim event autosave lewat Websocket, melainkan HTTPS (RPC), **tetapi** Guru bisa *subscribe* ke _channel_ kelas untuk melihat status "Sedang Mengerjakan" dari murid (Presence).
- **Implementasi**: Sentralisasikan langganan di dalam `services/realtime.service.ts` menggunakan pola `useEffect` di tingkat akar (root provider).

---

## 6. Performance & UX Optimization Strategies

1. **Pre-fetching di SpeedGrader**:
   Saat Guru menilai murid ke-1, React Query akan memanggil data murid ke-2 di latar belakang.
   ```typescript
   const queryClient = useQueryClient();
   // Dipanggil saat komponen SpeedGrader dirender
   queryClient.prefetchQuery({ queryKey: ['submission', nextStudentId], ... });
   ```
2. **Optimistic Updates**:
   Untuk tombol kecil dengan interaksi instan (seperti "*Mark Lesson as Complete*" atau "*Like Comment*"), perbarui UI sebelum server membalas (menciptakan ilusi 0ms *latency*).
   ```typescript
   useMutation({
     mutationFn: markAsComplete,
     onMutate: async () => {
        // Modifikasi cache lokal secara instan
        queryClient.setQueryData(['lesson_progress'], newData);
     },
   })
   ```
3. **Suspense & Error Boundaries**:
   Seluruh aplikasi dibungkus dengan `<ErrorBoundary>` global, lalu setiap fitur utama memiliki `<ErrorBoundary>` lokal. Jika modul *Quiz* rusak/crash, ia tidak akan membuat seluruh halaman *Dashboard* berubah menjadi layar putih (*White Screen of Death*), melainkan menampilkan komponen ramah (*Friendly fallback*).

---

## 7. Client-Side Permission Strategy

Daripada mengotori file UI dengan if-else yang panjang berdasarkan peran (role), gunakan utilitas terpusat:
`src/utils/permissions.ts`

```typescript
export const RolePermissions = {
  canEditCourse: (userRole: string, isCourseOwner: boolean) => 
    userRole === 'ADMIN' || (userRole === 'TEACHER' && isCourseOwner),
  
  canGrade: (userRole: string) => 
    ['ADMIN', 'TEACHER'].includes(userRole),
};

// Di dalam Komponen
<Button 
  disabled={!RolePermissions.canEditCourse(currentRole, isOwner)}
  title="Only class owners can edit this course"
>
  Edit Course
</Button>
```

---

## 8. Ringkasan Migrasi yang Disarankan (Refactor Plan)
Jika *codebase* EduSync saat ini menggunakan pendekatan `<Routes>` raksasa di `App.tsx` dengan komponen halaman (*Pages*) yang mencampur logika API dan UI secara bebas:
1. Pindahkan definisi *Route* ke `src/app/router.tsx` menggunakan arsitektur pemuatan data dari React Router v6.
2. Buat hierarki folder `features/` dan tarik perlahan komponen dari `src/pages` ke dalam struktur fitur (`features/gradebook`, `features/quizzes`).
3. Pisahkan *side-effects* (pemanggilan Supabase) ke *layer api/queries* menggunakan React Query untuk mengelola *caching* secara terpusat.
