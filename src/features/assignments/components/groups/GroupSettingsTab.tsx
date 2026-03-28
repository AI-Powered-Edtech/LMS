interface Props {
  onSave: () => void
}

export function GroupSettingsTab({ onSave }: Props) {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm max-w-3xl">
      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">
        Pengaturan Tugas Kelompok
      </h3>
      <div className="space-y-6">
        <div className="space-y-3">
          <label htmlFor="group-method" className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Metode Pembagian Kelompok
          </label>
          <select
            id="group-method"
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
          >
            <option>Otomatis (Acak)</option>
            <option>Sinkronisasi dari Google Classroom (Kelompok Siswa)</option>
            <option>Pilih Manual</option>
            <option>Siswa Memilih Sendiri</option>
          </select>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Opsi Kolaborasi Dokumen
          </p>
          <div className="p-4 border border-slate-200 dark:border-slate-600 rounded-xl space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="radio" name="doc_collab" className="mt-1 w-4 h-4 text-indigo-600" defaultChecked />
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  Satu Dokumen per Kelompok
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sistem akan membuat salinan template untuk setiap kelompok.
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="radio" name="doc_collab" className="mt-1 w-4 h-4 text-indigo-600" />
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">Folder Bersama</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Buat folder Google Drive khusus untuk tiap kelompok.
                </p>
              </div>
            </label>
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Penilaian Sejawat</p>
          <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
              defaultChecked
            />
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                Wajibkan Penilaian Antar Anggota
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Siswa harus menilai kontribusi anggota kelompoknya sebelum tugas dianggap selesai.
              </p>
            </div>
          </label>
        </div>
        <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button
            onClick={onSave}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm"
          >
            Simpan Pengaturan
          </button>
        </div>
      </div>
    </div>
  )
}
