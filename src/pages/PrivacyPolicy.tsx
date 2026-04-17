import { usePageTitle } from "@/hooks/usePageTitle";

export function PrivacyPolicy() {
  usePageTitle("Kebijakan Privasi");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 md:p-12 shadow-xl border border-slate-200 dark:border-slate-700">
          <div className="text-center mb-8">
            <span className="text-4xl inline-block mb-4">🔒</span>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Kebijakan Privasi
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Terakhir diperbarui: April 2026
            </p>
          </div>

          <div className="prose prose-slate dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                1. Pendahuluan
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                EduSync sangat memperhatikan privasi pengguna. Kebijakan Privasi
                ini menjelaskan bagaimana kami mengumpulkan, menggunakan,
                mengungkapkan, dan mengamankan informasi pribadi Anda saat
                menggunakan layanan kami.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                2. Informasi yang Kami Kumpulkan
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                Kami mengumpulkan informasi yang Anda berikan secara langsung,
                seperti:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-300 mt-2">
                <li>Nama dan informasi profil</li>
                <li>Alamat email dan nomor telepon</li>
                <li>Data pembelajaran (progress, nilai, aktivitas)</li>
                <li>Data otentikasi melalui OAuth (Google)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                3. Penggunaan Informasi
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                Informasi yang kami kumpulkan digunakan untuk:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-300 mt-2">
                <li>Menyediakan dan meningkatkan layanan EduSync</li>
                <li>Mempersonalisasi pengalaman belajar</li>
                <li>Mengirim komunikasi terkait akun dan pembelajaran</li>
                <li>Keamanan dan pencegahan penyalahgunaan</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                4. Keamanan Data
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                Kami menggunakan langkah-langkah keamanan yang sesuai untuk
                melindungi informasi pribadi Anda, termasuk enkripsi data, akses
                terbatas, dan pemantauan keamanan berkala.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                5. Hak Pengguna
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                Anda memiliki hak untuk mengakses, memperbaiki, atau menghapus
                data pribadi Anda. Untuk menggunakan hak ini, silakan hubungi
                kami melalui pengaturan akun atau email dukungan.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                6. Perubahan Kebijakan
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                Kami dapat memperbarui kebijakan privasi ini sewaktu-waktu.
                Perubahan signifikan akan diinformasikan melalui email atau
                notifikasi dalam aplikasi.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                7. Kepatuhan UU Perlindungan Data Pribadi (UU PDP)
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                Sesuai dengan Undang-Undang Pelindungan Data Pribadi (UU PDP)
                yang berlaku di Indonesia, EduSync telah menunjuk Data
                Protection Officer (DPO) untuk memastikan kepatuhan terhadap
                regulasi privasi. Anda berhak untuk meminta salinan data
                pribadi, mengajukan penghapusan (Right to Erasure), atau menarik
                persetujuan pemrosesan data kapan saja.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                8. Hubungi Kami & DPO
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                Jika Anda memiliki pertanyaan tentang kebijakan privasi ini atau
                ingin menggunakan hak Anda berdasarkan UU PDP, silakan hubungi
                Data Protection Officer kami melalui email di{" "}
                <a
                  href="mailto:dpo@edusync.id"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  dpo@edusync.id
                </a>{" "}
                atau tim dukungan kami di{" "}
                <a
                  href="mailto:support@edusync.id"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  support@edusync.id
                </a>
                .
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
  );
}
