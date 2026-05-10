/**
 * Konten bantuan in-app per halaman.
 * Digunakan oleh usePageHelp dan HelpButton.
 */

export interface HelpItem {
  /** Path yang cocok (exact atau prefix) */
  path: string;
  /** Apakah kecocokan dilakukan dengan startsWith (prefix) atau exact */
  matchType: "exact" | "prefix";
  title: string;
  description: string;
  tips: string[];
}

export const helpContent: HelpItem[] = [
  // ── Student ────────────────────────────────────────────────────────────────
  {
    path: "/app/student/dashboard",
    matchType: "exact",
    title: "Dasbor Siswa",
    description:
      "Halaman utama yang menampilkan ringkasan aktivitas belajar Anda.",
    tips: [
      'Lihat tugas yang mendekati tenggat waktu di kartu "Tugas Mendatang".',
      "Pantau progres kursus Anda melalui indikator persentase di setiap kartu.",
      "Klik notifikasi bel untuk melihat pengumuman dan pembaruan terbaru.",
    ],
  },
  {
    path: "/app/student/courses",
    matchType: "prefix",
    title: "Kursus Saya",
    description: "Daftar semua kursus yang Anda ikuti beserta progres belajar.",
    tips: [
      "Klik kartu kursus untuk membuka materi pelajaran dan mulai belajar.",
      'Gunakan tombol "Lanjutkan" untuk melanjutkan pelajaran terakhir yang Anda buka.',
      "Tanda hijau menunjukkan pelajaran yang sudah selesai Anda pelajari.",
    ],
  },
  {
    path: "/assignments",
    matchType: "prefix",
    title: "Tugas",
    description: "Daftar semua tugas yang diberikan oleh guru Anda.",
    tips: [
      "Filter tugas berdasarkan status: Belum Dikerjakan, Sedang Dikerjakan, atau Selesai.",
      "Perhatikan ikon kalender merah — tugas tersebut mendekati tenggat waktu.",
      'Klik "Kerjakan Tugas" untuk membuka formulir pengiriman tugas.',
    ],
  },
  {
    path: "/app/student/profile",
    matchType: "prefix",
    title: "Profil Saya",
    description: "Kelola informasi akun dan preferensi belajar Anda.",
    tips: [
      "Perbarui foto profil dengan mengklik ikon kamera pada gambar profil.",
      "Ubah kata sandi secara berkala untuk menjaga keamanan akun Anda.",
      "Aktifkan notifikasi push agar tidak melewatkan pengumuman penting.",
    ],
  },

  // ── Teacher ────────────────────────────────────────────────────────────────
  {
    path: "/app/teacher/dashboard",
    matchType: "exact",
    title: "Dasbor Guru",
    description: "Ringkasan aktivitas kelas dan kinerja siswa Anda.",
    tips: [
      "Pilih kelas aktif di panel kiri untuk melihat data spesifik kelas tersebut.",
      'Kartu "Perlu Dinilai" menampilkan tugas yang menunggu penilaian Anda.',
      "Grafik progres menunjukkan distribusi nilai dan keterlibatan siswa.",
    ],
  },
  {
    path: "/app/teacher/gradebook",
    matchType: "prefix",
    title: "Buku Nilai",
    description: "Kelola dan lacak nilai seluruh siswa di kelas Anda.",
    tips: [
      "Klik nama siswa untuk melihat detail riwayat penilaian dan tugas.",
      "Gunakan filter kolom untuk mengurutkan nilai secara naik atau turun.",
      'Ekspor data nilai ke CSV dengan tombol "Unduh" di sudut kanan atas.',
    ],
  },
  {
    path: "/app/teacher/analytics",
    matchType: "prefix",
    title: "Analitik Pembelajaran",
    description: "Data mendalam tentang keterlibatan dan perkembangan siswa.",
    tips: [
      "Gunakan selektor rentang tanggal untuk menganalisis periode tertentu.",
      'Grafik "Kesulitan" menandai topik yang banyak siswa temukan sulit.',
      "Klik titik data pada grafik untuk melihat detail per siswa.",
    ],
  },
  {
    path: "/app/teacher/course-builder",
    matchType: "prefix",
    title: "Pembuat Kursus",
    description: "Buat dan kelola konten kursus untuk siswa Anda.",
    tips: [
      "Seret dan lepas blok konten untuk mengatur urutan pelajaran.",
      "Gunakan pratinjau untuk melihat tampilan pelajaran dari sudut pandang siswa.",
      "Simpan secara berkala — perubahan tidak tersimpan otomatis.",
    ],
  },
];
