import { OptimizedImage } from '@/src/components/ui'
import { usePageTitle } from '@/src/hooks/usePageTitle'
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  UserPlus,
  MessageSquare,
  ShieldCheck,
  Award,
  Star,
  BookOpen,
  Clock,
  Flag,
  CheckCircle,
  Users,
  ExternalLink,
  ChevronLeft,
  Flame,
} from 'lucide-react'
import { cn } from '@/src/utils/cn'
import { useAuth } from '@/src/contexts/AuthContext'

export function PublicProfile() {
  usePageTitle('Public Profile')
  const { username } = useParams()
  const navigate = useNavigate()
  const { role: currentUserRole } = useAuth() // To determine perspective

  const [isFollowing, setIsFollowing] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)

  // Mock data based on username parameter
  const isTeacherProfile = username === 'alan-turing'

  const studentProfile = {
    name: 'Budi Santoso',
    username: 'budi-santoso',
    role: 'Siswa',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Budi',
    status: 'Sedang fokus belajar Fisika Kuantum ⚛️',
    mutualClasses: 3,
    stats: {
      bestAnswers: 15,
      reputation: 1250,
      followers: 42,
    },
    interests: ['#Matematika', '#Fisika', '#EditingVideo', '#AI'],
    badges: [
      {
        id: 1,
        name: 'Top Contributor',
        icon: Flame,
        color: 'text-orange-500',
        bg: 'bg-orange-100',
      },
      { id: 2, name: 'Problem Solver', icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-100' },
    ],
    highlightedCertificate: {
      title: 'Kelulusan Bootcamp AI & Machine Learning',
      issuer: 'EduSync Academy',
      date: '15 Okt 2026',
      image:
        'https://images.unsplash.com/photo-1589330694653-ded6df03f754?auto=format&fit=crop&q=80&w=800',
    },
    recentActivity: [
      {
        id: 1,
        action: 'Menjawab pertanyaan',
        topic: 'Cara menghitung limit fungsi trigonometri?',
        time: '2 jam yang lalu',
      },
      { id: 2, action: 'Mendapatkan lencana', topic: 'Problem Solver', time: '1 hari yang lalu' },
      {
        id: 3,
        action: 'Bertanya',
        topic: 'Rekomendasi buku Fisika Dasar untuk pemula?',
        time: '3 hari yang lalu',
      },
    ],
  }

  const teacherProfile = {
    name: 'Dr. Alan Turing, M.Kom',
    username: 'alan-turing',
    role: 'Guru Pengampu',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alan',
    bio: 'Pengajar Ilmu Komputer dengan pengalaman 10+ tahun di industri perangkat lunak. Fokus pada AI dan Algoritma.',
    subjects: ['Matematika Lanjut', 'Ilmu Komputer'],
    isOnline: true,
    officeHours: 'Senin & Rabu, 13:00 - 15:00 WIB',
    rating: 4.9,
    totalReviews: 128,
    links: [
      { title: 'Google Classroom', url: '#' },
      { title: 'Folder Materi Publik (Drive)', url: '#' },
    ],
    recentActivity: [
      {
        id: 1,
        action: 'Mengunggah materi baru',
        topic: 'Modul 4: Neural Networks',
        time: '5 jam yang lalu',
      },
      {
        id: 2,
        action: 'Menjawab pertanyaan',
        topic: 'Penjelasan tentang algoritma Dijkstra',
        time: '1 hari yang lalu',
      },
    ],
  }

  const profile = isTeacherProfile ? teacherProfile : studentProfile

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      {/* Back Navigation */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-medium text-sm"
      >
        <ChevronLeft className="w-4 h-4" /> Kembali
      </button>

      {/* Header Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative">
        {/* Cover Photo */}
        <div
          className={cn(
            'h-32 md:h-48 w-full',
            isTeacherProfile
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
              : 'bg-gradient-to-r from-blue-500 to-indigo-600'
          )}
        ></div>

        {/* Actions Menu */}
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setShowReportModal(true)}
            className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm transition-colors"
            title="Laporkan Pengguna"
          >
            <Flag className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 md:px-8 pb-8">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-12 md:-mt-16 mb-6">
            <div className="relative">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white p-1.5 shadow-lg">
                <OptimizedImage
                  src={profile.avatar}
                  alt={profile.name}
                  className="w-full h-full rounded-full bg-slate-100 object-cover"
                />
              </div>
              {isTeacherProfile && teacherProfile.isOnline && (
                <div
                  className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 border-4 border-white rounded-full"
                  title="Online"
                ></div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
                    {profile.name}
                    {isTeacherProfile && (
                      <span title="Verified Teacher">
                        <ShieldCheck className="w-6 h-6 text-emerald-500" />
                      </span>
                    )}
                  </h1>
                  <p className="text-slate-500 font-medium">@{profile.username}</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsFollowing(!isFollowing)}
                    className={cn(
                      'px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors',
                      isFollowing
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                    )}
                  >
                    {isFollowing ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                    {isFollowing ? 'Mengikuti' : 'Ikuti'}
                  </button>
                  <button
                    className="p-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl transition-colors shadow-sm"
                    title="Kirim Pesan"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </button>
                  {isTeacherProfile && (
                    <button className="px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-sm rounded-xl transition-colors shadow-sm hidden sm:flex items-center gap-2">
                      <BookOpen className="w-4 h-4" /> Lihat Materi
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bio & Status */}
          <div className="max-w-2xl">
            {isTeacherProfile ? (
              <p className="text-slate-700 leading-relaxed">{teacherProfile.bio}</p>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                {studentProfile.status}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="lg:col-span-1 space-y-6">
          {isTeacherProfile ? (
            <>
              {/* Teacher Details */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <h2 className="font-bold text-slate-900">Informasi Akademik</h2>
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-slate-500 mb-1">Mata Pelajaran</div>
                    <div className="flex flex-wrap gap-2">
                      {teacherProfile.subjects.map((sub) => (
                        <span
                          key={sub}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-medium"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-100">
                    <div className="text-slate-500 mb-1 flex items-center gap-1.5">
                      <Clock className="w-4 h-4" /> Office Hours
                    </div>
                    <div className="font-medium text-slate-900">{teacherProfile.officeHours}</div>
                  </div>
                  <div className="pt-3 border-t border-slate-100">
                    <div className="text-slate-500 mb-1 flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-yellow-500" /> Rating Komunitas
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-lg">
                        {teacherProfile.rating}
                      </span>
                      <span className="text-slate-500">({teacherProfile.totalReviews} ulasan)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Official Links */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <h2 className="font-bold text-slate-900">Tautan Resmi</h2>
                <div className="space-y-2">
                  {teacherProfile.links.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      className="flex items-center justify-between p-3 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors text-sm font-medium text-slate-700 group"
                    >
                      {link.title}
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                    </a>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Student Details */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <h2 className="font-bold text-slate-900">Statistik Komunitas</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl text-center">
                    <div className="text-2xl font-black text-slate-900">
                      {studentProfile.stats.bestAnswers}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">
                      Jawaban Terbaik
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl text-center">
                    <div className="text-2xl font-black text-slate-900">
                      {studentProfile.stats.reputation}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase">Reputasi</div>
                  </div>
                </div>

                {currentUserRole === 'student' && studentProfile.mutualClasses > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3 mt-4">
                    <Users className="w-5 h-5 text-blue-600 shrink-0" />
                    <p className="text-xs text-blue-800 font-medium">
                      Berada di{' '}
                      <strong className="font-bold">{studentProfile.mutualClasses} kelas</strong>{' '}
                      yang sama dengan Anda.
                    </p>
                  </div>
                )}
              </div>

              {/* Interests */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <h2 className="font-bold text-slate-900">Minat & Keahlian</h2>
                <div className="flex flex-wrap gap-2">
                  {studentProfile.interests.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 cursor-pointer transition-colors"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Column: Activity & Showcase */}
        <div className="lg:col-span-2 space-y-6">
          {!isTeacherProfile && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" /> Showcase Pencapaian
              </h2>

              {/* Badges */}
              <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
                {studentProfile.badges.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl min-w-[200px]"
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                        badge.bg,
                        badge.color
                      )}
                    >
                      <badge.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{badge.name}</div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Lencana</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Highlighted Certificate */}
              <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white group cursor-pointer">
                <OptimizedImage
                  src={studentProfile.highlightedCertificate.image}
                  alt="Certificate"
                  className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                <div className="relative p-6 flex flex-col h-48 justify-end">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-400/20 text-yellow-400 rounded-lg text-[10px] font-bold uppercase tracking-wider mb-2 w-fit border border-yellow-400/30">
                    <Award className="w-3 h-3" /> Sertifikat Unggulan
                  </div>
                  <h3 className="font-bold text-lg leading-tight mb-1">
                    {studentProfile.highlightedCertificate.title}
                  </h3>
                  <p className="text-sm text-slate-300">
                    {studentProfile.highlightedCertificate.issuer} •{' '}
                    {studentProfile.highlightedCertificate.date}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Activity Feed */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" /> Aktivitas Terakhir
            </h2>

            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {profile.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-blue-600">{activity.action}</span>
                      <span className="text-[10px] font-medium text-slate-400">
                        {activity.time}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 font-medium">{activity.topic}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Flag className="w-5 h-5 text-red-500" /> Laporkan Pengguna
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Mengapa Anda melaporkan profil ini? Laporan Anda akan ditinjau oleh tim admin secara
                anonim.
              </p>
              <div className="space-y-2">
                {[
                  'Foto profil tidak pantas',
                  'Bio mengandung kata kasar/SARA',
                  'Spam atau penipuan',
                  'Lainnya',
                ].map((reason) => (
                  <label
                    key={reason}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="radio"
                      name="report_reason"
                      className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-700">{reason}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  alert('Laporan berhasil dikirim.')
                  setShowReportModal(false)
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
              >
                Kirim Laporan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
