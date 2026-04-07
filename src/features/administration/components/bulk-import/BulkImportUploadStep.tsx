import { ChevronRight, Download, FileText } from 'lucide-react'

import { cn } from '@/utils/cn'

const TEMPLATE_CSV = `email,nama_lengkap,peran,nis,nomor_hp
siswa@sekolah.sch.id,Ahmad Rizki,siswa,12345,08123456789
guru@sekolah.sch.id,Bu Ratna Dewi,guru,,08987654321
admin@sekolah.sch.id,Pak Budi Santoso,admin,,
`

const MAX_FILE_SIZE_MB = 5

interface BulkImportUploadStepProps {
  onNext: () => void
}

export function BulkImportUploadStep({ onNext }: BulkImportUploadStepProps) {
  const downloadTemplate = () => {
    const blob = new Blob(['\uFEFF' + TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_import_pengguna.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Format File CSV
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
          Download template di bawah dan isi sesuai format berikut:
        </p>
        <div className="overflow-x-auto">
          <table className="text-xs w-full border-collapse">
            <thead>
              <tr className="bg-blue-100 dark:bg-blue-900/40">
                {['Kolom', 'Keterangan', 'Contoh', 'Wajib'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 py-2 font-semibold text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-blue-700 dark:text-blue-400">
              {[
                ['email', 'Alamat email pengguna', 'siswa@sekolah.sch.id', 'Ya'],
                ['nama_lengkap', 'Nama lengkap', 'Ahmad Rizki', 'Ya'],
                ['peran', 'siswa / guru / admin', 'siswa', 'Ya'],
                ['nis', 'Nomor Induk Siswa (opsional)', '12345', 'Tidak'],
                ['nomor_hp', 'Nomor HP (opsional)', '08123456789', 'Tidak'],
              ].map(([col, desc, ex, req]) => (
                <tr key={col} className="border border-blue-200 dark:border-blue-700">
                  <td className="px-3 py-1.5 font-mono font-semibold">{col}</td>
                  <td className="px-3 py-1.5">{desc}</td>
                  <td className="px-3 py-1.5 font-mono">{ex}</td>
                  <td className="px-3 py-1.5">
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-xs font-medium',
                        req === 'Ya'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      )}
                    >
                      {req}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <p className="text-sm text-amber-700 dark:text-amber-400">
          <strong>Catatan:</strong> File harus dalam format UTF-8 agar nama dengan huruf khusus (é,
          ñ, dll) terbaca dengan benar. Ukuran maksimum file adalah {MAX_FILE_SIZE_MB}MB.
        </p>
      </div>

      <button
        onClick={downloadTemplate}
        className="w-full flex items-center justify-center gap-3 py-3.5 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold rounded-xl transition-all"
      >
        <Download className="w-5 h-5" />
        Unduh Template CSV
      </button>

      <button
        onClick={onNext}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
      >
        Saya sudah punya file, lanjut upload
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
