import { usePageTitle } from '@/hooks/usePageTitle'

export function TermsOfService() {
  usePageTitle('Ketentuan Layanan')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 md:p-12 shadow-xl border border-slate-200 dark:border-slate-700">
          <div className="text-center mb-8">
            <span className="text-4xl inline-block mb-4">📜</span>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Ketentuan Layanan
            </h1>
            <p className="text-slate-500 dark:text-slate-400">Terakhir diperbarui: April 2026</p>
          </div>

          <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <p className="text-amber-800 dark:text-amber-200 font-medium text-center">
                ⚠️ DRAFT - Halaman ini masih dalam tahap pengembangan.
              </p>
              <p className="text-amber-700 dark:text-amber-300 text-sm text-center mt-2">
                Konten lengkap akan segera tersedia.
              </p>
            </div>

            <section>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                1. Penerimaan Ketentuan
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                Dengan mengakses dan menggunakan layanan EduSync, Anda setuju untuk terikat oleh
                Ketentuan Layanan ini. Jika Anda tidak setuju dengan bagian mana pun dari ketentuan
                ini, Anda tidak boleh menggunakan layanan kami.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                2. Deskripsi Layanan
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                EduSync adalah platform manajemen pembelajaran yang menyediakan layanan untuk
                mengelola kelas, kursus, kuis, tugas, dan komunikasi antara guru dan siswa. Kami
                berhak memodifikasi atau menghentikan layanan sewaktu-waktu.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                3. Akun Pengguna
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                Untuk menggunakan EduSync, Anda harus membuat akun dengan informasi yang akurat dan
                lengkap. Anda bertanggung jawab untuk:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-300 mt-2">
                <li>Menjaga kerahasiaan kata sandi akun Anda</li>
                <li>
                  Menerima penuh tanggung jawab atas semua aktivitas yang terjadi di bawah akun Anda
                </li>
                <li>Menghubungi kami segera jika Anda mencurigai penggunaan yang tidak sah</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                4. Perilaku Pengguna
              </h2>
              <p className="text-slate-600 dark:text-slate-300">Anda setuju untuk TIDAK:</p>
              <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-300 mt-2">
                <li>Melanggar hukum, regulasi, atau hak pihak ketiga</li>
                <li>
                  Mengunggah atau menyebarkan konten yang berbahaya, mengancam, atau tidak pantas
                </li>
                <li>Mencoba mendapatkan akses tidak sah ke sistem atau data pengguna lain</li>
                <li>Menggunakan layanan untuk tujuan komersial tanpa izin</li>
                <li>Mengganggu atau merusak layanan atau infrastruktur kami</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                5. Konten Pengguna
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                Anda mempertahankan kepemilikan atas konten yang Anda buat di EduSync. Dengan
                memposting konten, Anda memberikan kepada kami lisensi untuk menggunakan,
                mereproduksi, dan menampilkan konten tersebut dalam layanan kami.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                6. Pembatasan Tanggung Jawab
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                EduSync tidak bertanggung jawab atas kerugian tidak langsung, insidental, atau
                konsekuensial yang timbul dari penggunaan layanan kami. Layanan disediakan
                "sebagaimana adanya" tanpa jaminan apa pun.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                7. Penghentian Akun
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                Kami berhak menangguhkan atau menghentikan akun Anda jika terjadi pelanggaran
                terhadap Ketentuan Layanan ini tanpa pemberitahuan sebelumnya.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                8. Perubahan Ketentuan
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                Kami dapat merevisi Ketentuan Layanan ini sewaktu-waktu. Penggunaan berkelanjutan
                Anda terhadap EduSync setelah perubahan berarti Anda menerima ketentuan yang telah
                direvisi.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                9. Hukum yang Berlaku
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                Ketentuan Layanan ini akan diatur oleh dan ditafsirkan sesuai dengan hukum Negara
                Republik Indonesia.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              © 2026 EduSync. Semua hak dilindungi.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
