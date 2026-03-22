import { OptimizedImage } from '@/src/components/ui'
import { usePageTitle } from '@/src/hooks/usePageTitle'
import { useState } from 'react'
import {
  FileText,
  Edit3,
  CheckCircle,
  FileSignature,
  Send,
  Search,
  FileDown,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/src/utils/cn'
import { motion, AnimatePresence } from 'motion/react'

const templates = [
  {
    id: 'sk',
    name: 'Surat Keputusan (SK)',
    icon: FileSignature,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    id: 'aktif',
    name: 'Surat Keterangan Aktif',
    icon: FileText,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    id: 'panggilan',
    name: 'Surat Panggilan Ortu',
    icon: AlertCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
]

const steps = ['Draft', 'Review Waka', 'TTD Kepsek', 'Terbit']

export function DocumentManager() {
  usePageTitle('Document Manager')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [nisn, setNisn] = useState('')
  const [studentData, setStudentData] = useState<Record<string, unknown> | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [content, setContent] = useState('')

  const handleAutocomplete = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setNisn(val)
    if (val === '12345') {
      setStudentData({
        name: 'Budi Santoso',
        className: 'XII IPA 1',
        address: 'Jl. Merdeka No. 10',
      })
      setContent(
        `SURAT KETERANGAN AKTIF\n\nYang bertanda tangan di bawah ini menerangkan bahwa:\n\nNama: Budi Santoso\nNISN: 12345\nKelas: XII IPA 1\nAlamat: Jl. Merdeka No. 10\n\nAdalah benar siswa aktif di sekolah ini pada tahun ajaran berjalan.`
      )
    } else {
      setStudentData(null)
      setContent('')
    }
  }

  const advanceStep = () => {
    if (currentStep < steps.length - 1) setCurrentStep((s) => s + 1)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Manajemen Surat & Dokumen
          </h1>
          <p className="text-slate-500 mt-2">Smart Document Editor dengan Approval Berjenjang.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 flex-1 min-h-0">
        {/* Left Column: Templates & Autocomplete */}
        <div className="lg:col-span-1 space-y-6 flex flex-col">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Template Surat</h2>
            <div className="grid gap-3">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-2xl border transition-all text-left',
                    selectedTemplate === t.id
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                  )}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      t.bg
                    )}
                  >
                    <t.icon className={cn('w-5 h-5', t.color)} />
                  </div>
                  <span className="font-bold text-slate-700">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex-1">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Placeholder Autocomplete</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Cari NISN Siswa (Ketik: 12345)
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={nisn}
                    onChange={handleAutocomplete}
                    placeholder="Masukkan NISN..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              <AnimatePresence>
                {studentData && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-green-50 border border-green-200 rounded-2xl p-4 overflow-hidden"
                  >
                    <div className="flex items-center gap-2 text-green-700 font-bold mb-3">
                      <CheckCircle className="w-5 h-5" /> Data Ditemukan
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Nama:</span>
                        <span className="font-bold text-slate-900">
                          {String(studentData.name ?? '')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Kelas:</span>
                        <span className="font-bold text-slate-900">
                          {String(studentData.className ?? '')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Alamat:</span>
                        <span className="font-bold text-slate-900 truncate max-w-[150px]">
                          {String(studentData.address ?? '')}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right Column: Editor & Workflow */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          {/* Approval Stepper */}
          <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50/50 overflow-x-auto">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Approval Workflow</h2>
            <div className="flex items-center justify-between relative min-w-[400px] px-4 md:px-0 pb-6 md:pb-0">
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 rounded-full" />
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
              />

              {steps.map((step, index) => {
                const isCompleted = index <= currentStep
                const isActive = index === currentStep
                return (
                  <div key={step} className="relative flex flex-col items-center gap-2 z-10">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-500 border-2',
                        isCompleted
                          ? 'bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-200'
                          : 'bg-white border-slate-300 text-slate-400'
                      )}
                    >
                      {isCompleted ? <CheckCircle className="w-4 h-4" /> : index + 1}
                    </div>
                    <span
                      className={cn(
                        'text-xs font-bold absolute -bottom-6 whitespace-nowrap',
                        isActive ? 'text-blue-600' : 'text-slate-500'
                      )}
                    >
                      {step}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Smart Editor */}
          <div className="flex-1 p-6 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-4">
              <Edit3 className="w-5 h-5 text-slate-400" />
              <h3 className="font-bold text-slate-700">Rich Text Editor</h3>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Pilih template atau ketik surat di sini..."
              className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-2xl p-6 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none font-serif text-slate-800 leading-relaxed"
            />

            {/* Digital Signature Preview */}
            <AnimatePresence>
              {currentStep >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white rounded-xl border border-slate-200 flex items-center justify-center shadow-sm">
                      <OptimizedImage
                        src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=EduSyncSignature"
                        alt="QR"
                        className="w-12 h-12 opacity-80"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-500">
                        Ditandatangani secara elektronik oleh:
                      </p>
                      <p className="text-xl font-black text-slate-900 font-serif italic mt-1">
                        Dr. H. Ahmad Dahlan, M.Pd.
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Kepala Sekolah • {new Date().toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center border-4 border-white shadow-sm">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3 md:gap-4">
              {currentStep < steps.length - 1 ? (
                <button
                  onClick={advanceStep}
                  disabled={!content}
                  className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  {currentStep === 0
                    ? 'Kirim ke Reviewer'
                    : currentStep === 1
                      ? 'Setujui & Lanjut TTD'
                      : 'Terbitkan Dokumen'}
                  <Send className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => alert('Dokumen berhasil diunduh dan didistribusikan!')}
                  className="w-full sm:w-auto px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm shadow-green-200"
                >
                  <FileDown className="w-5 h-5" />
                  Unduh & Distribusikan PDF
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
