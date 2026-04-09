# EduSync Design System

Panduan lengkap sistem desain EduSync LMS. Semua komponen mendukung dark mode dan menggunakan Bahasa Indonesia untuk teks antarmuka.

---

## Design Tokens

Design tokens didefinisikan sebagai CSS custom properties di `src/styles/tokens.css`. Semua token kompatibel dengan Tailwind CSS v4 dan mendukung dark mode secara otomatis.

### Cara Penggunaan

```css
/* Di file CSS */
.custom-element {
  color: var(--color-primary-600);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}
```

---

## Palet Warna

Setiap kategori warna memiliki skala lengkap 50-950.

### Primary (Blue)

| Token                 | Hex       | Kegunaan                 |
| --------------------- | --------- | ------------------------ |
| `--color-primary-50`  | `#eff6ff` | Background sangat terang |
| `--color-primary-100` | `#dbeafe` | Background terang        |
| `--color-primary-200` | `#bfdbfe` | Border terang            |
| `--color-primary-300` | `#93c5fd` | Hover state              |
| `--color-primary-400` | `#60a5fa` | Icon sekunder            |
| `--color-primary-500` | `#3b82f6` | Warna utama              |
| `--color-primary-600` | `#2563eb` | Tombol, link             |
| `--color-primary-700` | `#1d4ed8` | Hover tombol             |
| `--color-primary-800` | `#1e40af` | Teks tebal               |
| `--color-primary-900` | `#1e3a5f` | Heading gelap            |
| `--color-primary-950` | `#172554` | Background terdalam      |

### Secondary (Purple)

| Token                   | Hex       |
| ----------------------- | --------- |
| `--color-secondary-50`  | `#faf5ff` |
| `--color-secondary-100` | `#f3e8ff` |
| `--color-secondary-200` | `#e9d5ff` |
| `--color-secondary-300` | `#d8b4fe` |
| `--color-secondary-400` | `#c084fc` |
| `--color-secondary-500` | `#a855f7` |
| `--color-secondary-600` | `#9333ea` |
| `--color-secondary-700` | `#7e22ce` |
| `--color-secondary-800` | `#6b21a8` |
| `--color-secondary-900` | `#581c87` |
| `--color-secondary-950` | `#3b0764` |

### Success (Green)

| Token                 | Hex       |
| --------------------- | --------- |
| `--color-success-50`  | `#ecfdf5` |
| `--color-success-100` | `#d1fae5` |
| `--color-success-200` | `#a7f3d0` |
| `--color-success-300` | `#6ee7b7` |
| `--color-success-400` | `#34d399` |
| `--color-success-500` | `#10b981` |
| `--color-success-600` | `#059669` |
| `--color-success-700` | `#047857` |
| `--color-success-800` | `#065f46` |
| `--color-success-900` | `#064e3b` |
| `--color-success-950` | `#022c22` |

### Warning (Amber)

| Token                 | Hex       |
| --------------------- | --------- |
| `--color-warning-50`  | `#fffbeb` |
| `--color-warning-100` | `#fef3c7` |
| `--color-warning-200` | `#fde68a` |
| `--color-warning-300` | `#fcd34d` |
| `--color-warning-400` | `#fbbf24` |
| `--color-warning-500` | `#f59e0b` |
| `--color-warning-600` | `#d97706` |
| `--color-warning-700` | `#b45309` |
| `--color-warning-800` | `#92400e` |
| `--color-warning-900` | `#78350f` |
| `--color-warning-950` | `#451a03` |

### Danger (Red)

| Token                | Hex       |
| -------------------- | --------- |
| `--color-danger-50`  | `#fef2f2` |
| `--color-danger-100` | `#fee2e2` |
| `--color-danger-200` | `#fecaca` |
| `--color-danger-300` | `#fca5a5` |
| `--color-danger-400` | `#f87171` |
| `--color-danger-500` | `#ef4444` |
| `--color-danger-600` | `#dc2626` |
| `--color-danger-700` | `#b91c1c` |
| `--color-danger-800` | `#991b1b` |
| `--color-danger-900` | `#7f1d1d` |
| `--color-danger-950` | `#450a0a` |

### Neutral (Slate)

| Token                 | Hex       |
| --------------------- | --------- |
| `--color-neutral-50`  | `#f8fafc` |
| `--color-neutral-100` | `#f1f5f9` |
| `--color-neutral-200` | `#e2e8f0` |
| `--color-neutral-300` | `#cbd5e1` |
| `--color-neutral-400` | `#94a3b8` |
| `--color-neutral-500` | `#64748b` |
| `--color-neutral-600` | `#475569` |
| `--color-neutral-700` | `#334155` |
| `--color-neutral-800` | `#1e293b` |
| `--color-neutral-900` | `#0f172a` |
| `--color-neutral-950` | `#020617` |

---

## Skala Tipografi

| Token              | Ukuran            | Kegunaan            |
| ------------------ | ----------------- | ------------------- |
| `--text-heading-1` | `2.25rem` (36px)  | Judul halaman utama |
| `--text-heading-2` | `1.875rem` (30px) | Judul seksi         |
| `--text-heading-3` | `1.5rem` (24px)   | Sub-judul           |
| `--text-heading-4` | `1.25rem` (20px)  | Heading card        |
| `--text-body-lg`   | `1.125rem` (18px) | Teks besar          |
| `--text-body`      | `1rem` (16px)     | Teks utama          |
| `--text-body-sm`   | `0.875rem` (14px) | Teks kecil, label   |
| `--text-caption`   | `0.75rem` (12px)  | Caption, meta info  |

---

## Skala Spacing

| Token           | Nilai  | Kegunaan        |
| --------------- | ------ | --------------- |
| `--spacing-xs`  | `4px`  | Gap minimal     |
| `--spacing-sm`  | `8px`  | Padding kecil   |
| `--spacing-md`  | `16px` | Padding standar |
| `--spacing-lg`  | `24px` | Padding card    |
| `--spacing-xl`  | `32px` | Section gap     |
| `--spacing-2xl` | `48px` | Section besar   |
| `--spacing-3xl` | `64px` | Layout gap      |
| `--spacing-4xl` | `96px` | Hero spacing    |

---

## Border Radius

| Token           | Nilai    |
| --------------- | -------- |
| `--radius-sm`   | `4px`    |
| `--radius-md`   | `8px`    |
| `--radius-lg`   | `12px`   |
| `--radius-xl`   | `16px`   |
| `--radius-2xl`  | `24px`   |
| `--radius-full` | `9999px` |

---

## Shadow

| Token         | Kegunaan          |
| ------------- | ----------------- |
| `--shadow-sm` | Card datar, input |
| `--shadow-md` | Dropdown, popover |
| `--shadow-lg` | Modal overlay     |
| `--shadow-xl` | Toast, dialog     |

Dark mode secara otomatis meningkatkan opasitas shadow.

---

## Katalog Komponen

### 1. Button (`src/components/ui/Button.tsx`)

Tombol interaktif dengan beberapa varian.

| Prop        | Tipe                                              | Default     | Keterangan                |
| ----------- | ------------------------------------------------- | ----------- | ------------------------- |
| `variant`   | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'primary'` | Gaya visual               |
| `size`      | `'sm' \| 'md' \| 'lg'`                            | `'md'`      | Ukuran                    |
| `loading`   | `boolean`                                         | `false`     | Tampilkan spinner         |
| `icon`      | `ReactNode`                                       | -           | Ikon di sebelah kiri teks |
| `fullWidth` | `boolean`                                         | `false`     | Lebar penuh               |

```tsx
<Button variant="primary" size="md" loading={false}>
  Simpan
</Button>
```

### 2. Card (`src/components/ui/Card.tsx`)

Container kartu dengan shadow dan border.

| Prop      | Tipe                             | Default |
| --------- | -------------------------------- | ------- |
| `padding` | `'none' \| 'sm' \| 'md' \| 'lg'` | `'md'`  |
| `hover`   | `boolean`                        | `false` |
| `border`  | `boolean`                        | `true`  |

### 3. Input (`src/components/ui/Input.tsx`)

Field input teks dengan label dan validasi error.

| Prop        | Tipe                   | Default |
| ----------- | ---------------------- | ------- |
| `label`     | `string`               | -       |
| `error`     | `string`               | -       |
| `icon`      | `ReactNode`            | -       |
| `inputSize` | `'sm' \| 'md' \| 'lg'` | `'md'`  |

### 4. Select (`src/components/ui/Select.tsx`)

Dropdown select native dengan styling konsisten.

| Prop          | Tipe                               | Default |
| ------------- | ---------------------------------- | ------- |
| `label`       | `string`                           | -       |
| `error`       | `string`                           | -       |
| `options`     | `{value: string, label: string}[]` | (wajib) |
| `placeholder` | `string`                           | -       |
| `selectSize`  | `'sm' \| 'md' \| 'lg'`             | `'md'`  |

```tsx
<Select
  label="Kategori"
  placeholder="Pilih kategori"
  options={[
    { value: 'math', label: 'Matematika' },
    { value: 'science', label: 'IPA' },
  ]}
/>
```

### 5. Modal (`src/components/ui/Modal.tsx`)

Dialog modal dengan backdrop, focus trap, dan Escape key.

| Prop      | Tipe                           | Default |
| --------- | ------------------------------ | ------- |
| `open`    | `boolean`                      | (wajib) |
| `onClose` | `() => void`                   | (wajib) |
| `size`    | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'`  |

Gunakan bersama: `ModalHeader`, `ModalBody`, `ModalFooter`.

### 6. Badge (`src/components/ui/Badge.tsx`)

Label kecil untuk status atau kategori.

| Prop      | Tipe                                                        | Default     |
| --------- | ----------------------------------------------------------- | ----------- |
| `variant` | `'info' \| 'success' \| 'warning' \| 'danger' \| 'neutral'` | `'neutral'` |
| `size`    | `'sm' \| 'md'`                                              | `'sm'`      |
| `icon`    | `ReactNode`                                                 | -           |

### 7. Skeleton (`src/components/ui/Skeleton.tsx`)

Placeholder loading state. Ekspor: `Skeleton`, `SkeletonCard`.

| Prop (Skeleton) | Tipe               | Default |
| --------------- | ------------------ | ------- |
| `width`         | `string \| number` | -       |
| `height`        | `string \| number` | -       |

### 8. Toast (`src/components/ui/Toast.tsx`)

Notifikasi popup otomatis. Gunakan `ToastContainer` di root layout.

Tipe toast: `success`, `error`, `warning`, `info`.

```tsx
// Di root layout
;<ToastContainer />

// Trigger dari mana saja
const { addToast } = useToast()
addToast({
  type: 'success',
  message: 'Berhasil disimpan!',
})
```

Fitur:

- Otomatis hilang setelah 5 detik
- Maksimal 3 toast bersamaan
- Animasi masuk/keluar
- Tombol tutup manual

### 9. Avatar (`src/components/ui/Avatar.tsx`)

Avatar pengguna dengan gambar atau inisial.

| Prop     | Tipe                   | Default |
| -------- | ---------------------- | ------- |
| `src`    | `string`               | -       |
| `name`   | `string`               | (wajib) |
| `size`   | `'sm' \| 'md' \| 'lg'` | `'md'`  |
| `online` | `boolean`              | -       |

Fitur:

- Fallback ke inisial jika gambar gagal dimuat
- Warna background deterministik berdasarkan nama
- Indikator online/offline opsional

```tsx
<Avatar name="Budi Santoso" size="md" online />
```

### 10. Tooltip (`src/components/ui/Tooltip.tsx`)

Tooltip hover dengan arrow.

| Prop       | Tipe                                     | Default |
| ---------- | ---------------------------------------- | ------- |
| `content`  | `string`                                 | (wajib) |
| `position` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` |

```tsx
<Tooltip content="Informasi tambahan" position="top">
  <button>Hover saya</button>
</Tooltip>
```

### 11. Spinner (`src/components/ui/Spinner.tsx`)

Indikator loading berputar (SVG).

| Prop   | Tipe                   | Default |
| ------ | ---------------------- | ------- |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'`  |

Ukuran: sm=16px, md=20px, lg=24px. Warna mengikuti `currentColor`.

### 12. ErrorBoundary (`src/components/ui/ErrorBoundary.tsx`)

React error boundary (class component) untuk menangkap error runtime.

| Prop       | Tipe         | Default    |
| ---------- | ------------ | ---------- |
| `fallback` | `ReactNode`  | UI default |
| `onReset`  | `() => void` | -          |

```tsx
<ErrorBoundary onReset={() => queryClient.clear()}>
  <App />
</ErrorBoundary>
```

### 13. ErrorFallback (`src/components/ui/ErrorFallback.tsx`)

UI fallback error yang bisa digunakan mandiri atau di dalam ErrorBoundary.

| Prop           | Tipe         | Default                        |
| -------------- | ------------ | ------------------------------ |
| `title`        | `string`     | `'Terjadi Kesalahan'`          |
| `description`  | `string`     | `'Maaf, terjadi kesalahan...'` |
| `onRetry`      | `() => void` | -                              |
| `showHomeLink` | `boolean`    | `true`                         |

### 14. Breadcrumb, Tabs, EmptyState

Komponen UI tambahan yang tersedia di `src/components/ui/`.

---

## Dark Mode

Semua komponen mendukung dark mode melalui kelas `dark:` Tailwind. Dark mode aktif ketika:

- Element `<html>` memiliki class `dark`, ATAU
- Element memiliki atribut `data-theme="dark"`

Konvensi warna dark mode:

- Background: `dark:bg-slate-900`
- Border: `dark:border-slate-700/60`
- Teks utama: `dark:text-white`
- Teks sekunder: `dark:text-slate-300` / `dark:text-slate-400`
- Input background: `dark:bg-slate-900`

---

## Contoh Penggunaan

### Form Lengkap

```tsx
import { Input } from '@/src/components/ui/Input'
import { Select } from '@/src/components/ui/Select'
import { Button } from '@/src/components/ui/Button'

function ContohForm() {
  return (
    <form className="space-y-4">
      <Input label="Nama Lengkap" placeholder="Masukkan nama" />
      <Select
        label="Kelas"
        placeholder="Pilih kelas"
        options={[
          { value: '10a', label: 'Kelas 10A' },
          { value: '10b', label: 'Kelas 10B' },
        ]}
      />
      <Button type="submit" fullWidth>
        Simpan
      </Button>
    </form>
  )
}
```

### Error Handling

```tsx
import { ErrorBoundary } from '@/src/components/ui/ErrorBoundary'
import { ErrorFallback } from '@/src/components/ui/ErrorFallback'

// Sebagai boundary
;<ErrorBoundary>
  <KomponenBeresiko />
</ErrorBoundary>

// Sebagai komponen mandiri
{
  hasError && (
    <ErrorFallback
      title="Gagal memuat data"
      description="Periksa koneksi internet Anda."
      onRetry={refetch}
    />
  )
}
```

<!-- Phase 5 Feature Cross-Reference -->

## Feature Module Cross-Reference

EduSync LMS terdiri dari 49 feature module yang saling terintegrasi:

| Feature         | Domain         | Deskripsi                                                                                                                  |
| --------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| administration  | Admin          | Administrasi — Manajemen tenant, konfigurasi modul sekolah, sinkronisasi data                                              |
| ai-tutor        | Learning       | AI Tutor — Asisten belajar berbasis AI yang memberikan penjelasan personal kepada siswa                                    |
| analytics       | Analytics      | Analitik — Dashboard analitik komprehensif untuk guru dan admin                                                            |
| announcements   | Communication  | Pengumuman — Sistem pengumuman sekolah                                                                                     |
| assignments     | Assessment     | Tugas — Manajemen tugas dari pembuatan hingga penilaian                                                                    |
| calendar        | Academic       | Kalender — Kalender akademik terintegrasi dengan jadwal pelajaran, ujian, deadline tugas, dan kegiatan sekolah             |
| classroom       | Academic       | Kelas — Manajemen kelas virtual dan fisik                                                                                  |
| courses         | Academic       | Kursus — Core learning module                                                                                              |
| dashboards      | Analytics      | Dashboard — Dashboard kustom dengan widget builder                                                                         |
| discussions     | Communication  | Diskusi — Forum diskusi per kursus                                                                                         |
| gamification    | Engagement     | Gamifikasi — Sistem gamifikasi lengkap: XP, badge, level, streak counter, dan leaderboard                                  |
| gradebook       | Assessment     | Buku Nilai — Buku nilai digital untuk guru                                                                                 |
| guidance        | Admin          | Panduan — Sistem panduan in-app (tooltip, walkthrough, banner, checkpoint)                                                 |
| lessons         | Learning       | Pelajaran — Konten pelajaran dengan block-based editor                                                                     |
| moderation      | Admin          | Moderasi — Moderasi konten user-generated (diskusi, komentar)                                                              |
| notifications   | Communication  | Notifikasi — Sistem notifikasi real-time dengan bell icon dan panel                                                        |
| onboarding      | Admin          | Onboarding — Wizard onboarding untuk pengguna baru                                                                         |
| progress        | Learning       | Kemajuan Belajar — Tracking progress belajar siswa secara granular per kursus, modul, dan pelajaran                        |
| question-bank   | Assessment     | Bank Soal — Repositori soal yang bisa digunakan ulang di berbagai kuis                                                     |
| quizzes         | Assessment     | Kuis — Sistem kuis komprehensif dengan timer, anti-cheat, autosave, review mode, dan analitik hasil per soal               |
| recommendations | Learning       | Rekomendasi — Engine rekomendasi konten berdasarkan progress, performa, dan pola belajar siswa                             |
| reports         | Analytics      | Laporan — Generator laporan akademik, keuangan (SPP), PPDB, dan custom                                                     |
| storage         | Infrastructure | Penyimpanan — Manajemen file dan media untuk materi pembelajaran                                                           |
| struggle        | Analytics      | Deteksi Kesulitan — Deteksi otomatis siswa yang kesulitan berdasarkan pola belajar, waktu per soal, dan penurunan performa |

Setiap feature module mengikuti arsitektur standar dengan folder: api/, queries/, hooks/, types/, components/, dan **tests**/. Semua feature mendukung dark mode dan skeleton loading screens.
