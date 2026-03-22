import { useState, useEffect } from 'react'
import {
  Megaphone,
  Calendar as CalendarIcon,
  User,
  Plus,
  Search,
  Pin,
  Paperclip,
  MessageSquare,
  CheckCircle2,
  Clock,
  MapPin,
  Users,
  Send,
  Eye,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/src/utils/cn'
import { useAuth } from '@/src/contexts/AuthContext'
import type { Announcement as DBAnnouncement } from '@/src/features/announcements'
import { useToast } from '@/src/contexts/ToastContext'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { CommentSection } from '@/src/components/Social/CommentSection'
import { useAnnouncements, useSaveAnnouncement, useSubmitRSVP } from '@/src/features/announcements'
import { AnnouncementSkeleton } from '@/src/features/announcements/components/AnnouncementSkeleton'

// Removed Comment interface as we use the real discussionService now

interface Attachment {
  name: string
  type: 'pdf' | 'image' | 'doc'
  size: string
}

// Map DB Announcement to UI Announcement or use DB directly
interface Announcement extends Omit<
  DBAnnouncement,
  'id' | 'author' | 'contact_person' | 'location'
> {
  id: string
  author: string
  date: string
  time?: string
  location?: string
  contactPerson?: string
  isRead: boolean // We'll compute this or track in notifications
  attachments?: Attachment[]
  readCount?: { read: number; total: number }
  // Comments handled by CommentSection
  rsvpStatus?: 'attending' | 'not_attending' | 'pending'
}

export function Announcements() {
  const { user, role, tenantId } = useAuth()
  const { toast } = useToast()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all') // all, unread, pinned
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const PAGE_SIZE = 10
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Use React Query hooks
  const {
    data: fetchedAnnouncements,
    refetch,
    isLoading,
  } = useAnnouncements({
    search: searchTerm || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })

  const saveMutation = useSaveAnnouncement()
  const rsvpMutation = useSubmitRSVP()

  // Transform fetched data to local Announcement type
  const transformToLocalAnnouncement = (data: DBAnnouncement[]): Announcement[] => {
    return data.map((db) => ({
      ...db,
      author: db.author?.full_name || 'Admin',
      date: format(new Date(db.created_at), 'dd MMM yyyy', { locale: localeId }),
      time: format(new Date(db.created_at), 'HH:mm', { locale: localeId }) + ' WIB',
      location: db.location || undefined,
      contactPerson: db.contact_person || undefined,
      isRead: false, // Default unread; no backend read-tracking available yet
      rsvpStatus:
        db.rsvp_status === 'yes'
          ? 'attending'
          : db.rsvp_status === 'no'
            ? 'not_attending'
            : 'pending',
    }))
  }

  // Update announcements when fetched data changes
  useEffect(() => {
    if (fetchedAnnouncements) {
      const transformed = transformToLocalAnnouncement(fetchedAnnouncements)
      if (page === 0) {
        setAnnouncements(transformed)
      } else {
        setAnnouncements((prev) => [...prev, ...transformed])
      }
      setHasMore(fetchedAnnouncements.length === PAGE_SIZE)
    }
  }, [fetchedAnnouncements, page])

  // Reset to first page when search changes
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    setPage(0)
    refetch()
  }, [searchTerm])
  /* eslint-enable react-hooks/exhaustive-deps */

  // Creation form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target_audience: 'all_students' as
      | 'all_students'
      | 'course_students'
      | 'course_staff'
      | 'system',
    priority: 'normal' as 'normal' | 'high' | 'low',
    is_pinned: false,
    allow_comments: true,
    requires_rsvp: false,
    location: '',
    contact_person: '',
    course_id: null as string | null,
  })

  const handleCreateAnnouncement = async (status: 'draft' | 'published') => {
    if (!formData.title || !formData.content) {
      toast('Judul dan isi pengumuman wajib diisi.', 'error')
      return
    }

    try {
      await saveMutation.mutateAsync({
        ...formData,
        tenant_id: tenantId!,
        status,
        created_by: user!.id,
        location: formData.location || null,
        contact_person: formData.contact_person || null,
      })

      toast(
        status === 'published' ? 'Pengumuman telah diterbitkan!' : 'Draf pengumuman disimpan.',
        'success'
      )

      setIsCreateModalOpen(false)
      // Reset form
      setFormData({
        title: '',
        content: '',
        target_audience: 'all_students',
        priority: 'normal',
        is_pinned: false,
        allow_comments: true,
        requires_rsvp: false,
        location: '',
        contact_person: '',
        course_id: null,
      })
      refetch()
    } catch (err) {
      console.error('Error creating announcement:', err)
      toast('Gagal menyimpan pengumuman.', 'error')
    }
  }

  // RSVP Handler
  const handleRSVP = async (announcementId: string, response: 'yes' | 'no' | 'maybe') => {
    try {
      await rsvpMutation.mutateAsync({ announcementId, response })
      toast('Berhasil mengirim RSVP', 'success')
      refetch() // Refresh to show new status
    } catch {
      toast('Gagal mengirim RSVP', 'error')
    }
  }
  const [expandedComments, setExpandedComments] = useState<string | null>(null)

  const handleMarkAsRead = (id: string) => {
    setAnnouncements(announcements.map((a) => (a.id === id ? { ...a, isRead: true } : a)))
  }

  const filteredAnnouncements = announcements
    .filter((a) => {
      const matchesSearch =
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.content.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter =
        filter === 'all'
          ? true
          : filter === 'unread'
            ? !a.isRead
            : filter === 'pinned'
              ? a.is_pinned
              : true
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      // Pinned always on top
      if (a.is_pinned && !b.is_pinned) return -1
      if (!a.is_pinned && b.is_pinned) return 1
      return 0
    })

  if (isLoading && announcements.length === 0) {
    return <AnnouncementSkeleton />
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 px-4 md:px-6 lg:px-8 dark:text-white">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-blue-600" />
            Pengumuman
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Informasi penting, jadwal, dan pembaruan dari sekolah.
          </p>
        </div>
        {role === 'teacher' && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 transition-colors shadow-sm shadow-blue-200"
          >
            <Plus className="w-5 h-5" />
            Buat Pengumuman
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari pengumuman..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700 dark:text-white dark:border-slate-600 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 custom-scrollbar">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-colors',
              filter === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            Semua
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={cn(
              'whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2',
              filter === 'unread'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            )}
          >
            Belum Dibaca
            {announcements.filter((a) => !a.isRead).length > 0 && (
              <span className="bg-white/20 px-1.5 py-0.5 rounded-md text-xs">
                {announcements.filter((a) => !a.isRead).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter('pinned')}
            className={cn(
              'whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2',
              filter === 'pinned'
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
            )}
          >
            <Pin className="w-4 h-4" /> Disematkan
          </button>
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-6">
        {filteredAnnouncements.map((announcement, index) => (
          <motion.div
            key={announcement.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              'bg-white dark:bg-slate-800 rounded-3xl border transition-all duration-300 hover:shadow-md relative overflow-hidden group',
              !announcement.isRead
                ? 'border-blue-200 dark:border-blue-700 shadow-sm'
                : 'border-slate-200 dark:border-slate-700',
              announcement.is_pinned &&
                'border-amber-200 dark:border-amber-700 ring-1 ring-amber-100 dark:ring-amber-900/30'
            )}
          >
            {/* Unread Indicator */}
            {!announcement.isRead && (
              <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
            )}

            <div className="p-6 sm:p-8">
              {/* Header: Badges & Pin */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  {announcement.is_pinned && (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full uppercase tracking-wider">
                      <Pin className="w-3.5 h-3.5" /> Penting
                    </span>
                  )}
                  {announcement.target_audience && (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                      <Users className="w-3.5 h-3.5" />{' '}
                      {announcement.target_audience.replace('_', ' ')}
                    </span>
                  )}
                  {announcement.priority === 'high' && !announcement.is_pinned && (
                    <span className="px-3 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full uppercase tracking-wider">
                      Darurat
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4" />
                    {announcement.date}
                  </span>
                </div>
              </div>

              {/* Title & Content */}
              <h2
                className={cn(
                  'text-2xl font-bold mb-4',
                  !announcement.isRead
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-800 dark:text-slate-200'
                )}
              >
                {announcement.title}
              </h2>

              <div className="prose prose-slate dark:prose-invert max-w-none mb-6">
                <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-300 leading-relaxed">
                  {announcement.content}
                </p>
              </div>

              {/* Metadata Grid (Time, Location, Contact) */}
              {(announcement.time || announcement.location || announcement.contactPerson) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-600">
                  {announcement.time && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Waktu
                        </p>
                        <p className="text-sm font-medium text-slate-700">{announcement.time}</p>
                      </div>
                    </div>
                  )}
                  {announcement.location && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Lokasi
                        </p>
                        <p className="text-sm font-medium text-slate-700">
                          {announcement.location}
                        </p>
                      </div>
                    </div>
                  )}
                  {announcement.contactPerson && (
                    <div className="flex items-start gap-3 sm:col-span-2">
                      <User className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Kontak Person
                        </p>
                        <p className="text-sm font-medium text-slate-700">
                          {announcement.contactPerson}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Attachments */}
              {announcement.attachments && announcement.attachments.length > 0 && (
                <div className="mb-6 space-y-2">
                  <p className="text-sm font-bold text-slate-700">Lampiran:</p>
                  <div className="flex flex-wrap gap-3">
                    {announcement.attachments.map((file, i) => (
                      <a
                        key={i}
                        href="#"
                        className="flex items-center gap-3 p-3 pr-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all group"
                      >
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Paperclip className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                            {file.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {file.size} • {file.type.toUpperCase()}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* RSVP / Confirmation Section */}
              {announcement.requires_rsvp && role === 'student' && (
                <div className="mb-6 p-5 bg-blue-50 border border-blue-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-blue-900">Konfirmasi Kehadiran / Pemahaman</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Mohon konfirmasi apakah Anda telah membaca dan memahami pengumuman ini.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {announcement.rsvpStatus === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleRSVP(announcement.id, 'yes')}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                        >
                          Saya Mengerti
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 text-sm font-bold rounded-xl">
                        <CheckCircle2 className="w-5 h-5" />
                        Telah Dikonfirmasi
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Footer: Author, Read Receipts, Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${announcement.author}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {announcement.author}
                    </p>
                    {role === 'teacher' && announcement.readCount && (
                      <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                        <Eye className="w-3.5 h-3.5" /> Dibaca oleh {announcement.readCount.read}/
                        {announcement.readCount.total}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {announcement.allow_comments && (
                    <button
                      onClick={() =>
                        setExpandedComments(
                          expandedComments === announcement.id ? null : announcement.id
                        )
                      }
                      className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-bold rounded-xl transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Diskusi
                    </button>
                  )}

                  {!announcement.isRead && role === 'student' && !announcement.requires_rsvp && (
                    <button
                      onClick={() => handleMarkAsRead(announcement.id)}
                      className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-bold rounded-xl transition-colors flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Tandai Dibaca
                    </button>
                  )}
                </div>
              </div>

              {/* Comments Section (Expandable) */}
              <AnimatePresence>
                {expandedComments === announcement.id && announcement.allow_comments && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-6 pt-6 border-t border-slate-100">
                      <CommentSection entityId={announcement.id} entityType="announcement" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}

        {filteredAnnouncements.length > 0 && hasMore && (
          <div className="flex justify-center pt-4 pb-10">
            <button
              onClick={() => setPage((prev) => prev + 1)}
              className="px-8 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"
            >
              Muat Lebih Banyak
            </button>
          </div>
        )}

        {filteredAnnouncements.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Megaphone className="w-10 h-10 text-slate-300 dark:text-slate-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">
              Tidak ada pengumuman
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Belum ada pengumuman baru yang sesuai dengan filter atau pencarian Anda.
            </p>
          </div>
        )}
      </div>

      {/* Create Announcement Modal (Mock UI for Teachers) */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700 shrink-0">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Buat Pengumuman Baru
                </h2>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Judul Pengumuman</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Contoh: Libur Nasional Idul Fitri"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Isi Pengumuman</label>
                  <textarea
                    rows={5}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Tuliskan detail pengumuman di sini..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Target Penerima</label>
                    <select
                      value={formData.target_audience}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          target_audience: e.target.value as typeof formData.target_audience,
                        })
                      }
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      <option value="all_students">Semua Siswa</option>
                      <option value="course_students">Siswa Kursus Tertentu</option>
                      <option value="course_staff">Hanya Staf Kursus</option>
                      <option value="system">Sistem (Admin Saja)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Prioritas</label>
                    <select
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          priority: e.target.value as typeof formData.priority,
                        })
                      }
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      <option value="normal">Normal</option>
                      <option value="high">Tinggi (Darurat)</option>
                      <option value="low">Rendah</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Lokasi (Opsional)</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Contoh: Aula Serbaguna"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">
                      Narahubung (Opsional)
                    </label>
                    <input
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      placeholder="Contoh: Ibu Rina (0812...)"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-3 border-t border-slate-100 pt-6">
                  <label className="text-sm font-bold text-slate-700">Pengaturan Tambahan</label>

                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.is_pinned}
                      onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="font-bold text-slate-800 text-sm">Sematkan di Atas (Pin)</p>
                      <p className="text-xs text-slate-500">
                        Pengumuman akan selalu muncul di urutan pertama.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.allow_comments}
                      onChange={(e) =>
                        setFormData({ ...formData, allow_comments: e.target.checked })
                      }
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="font-bold text-slate-800 text-sm">Izinkan Komentar</p>
                      <p className="text-xs text-slate-500">
                        Siswa dan staf dapat berdiskusi di kolom komentar.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.requires_rsvp}
                      onChange={(e) =>
                        setFormData({ ...formData, requires_rsvp: e.target.checked })
                      }
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="font-bold text-slate-800 text-sm">Wajib Konfirmasi (RSVP)</p>
                      <p className="text-xs text-slate-500">
                        Penerima harus memberikan respon (ya/tidak).
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-700 shrink-0 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                <button className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold text-sm px-4 py-2 rounded-xl hover:bg-slate-200 transition-colors">
                  <Paperclip className="w-4 h-4" /> Tambah Lampiran
                </button>
                <div className="flex gap-3">
                  <button
                    disabled={saveMutation.isPending}
                    onClick={() => handleCreateAnnouncement('draft')}
                    className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Simpan Draf
                  </button>
                  <button
                    disabled={saveMutation.isPending}
                    onClick={() => handleCreateAnnouncement('published')}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm shadow-blue-200 flex items-center gap-2 disabled:opacity-50"
                  >
                    {saveMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Terbitkan
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
