import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Megaphone, Pin, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import type { Announcement as DBAnnouncement } from "@/features/announcements";
import {
  useAnnouncements,
  useSaveAnnouncement,
  useSubmitRSVP,
} from "@/features/announcements";
import {
  type AnnouncementCardData,
  AnnouncementFeedCard,
} from "@/features/announcements/components/AnnouncementFeedCard";
import { AnnouncementSkeleton } from "@/features/announcements/components/AnnouncementSkeleton";
import { CreateAnnouncementModal } from "@/features/announcements/components/CreateAnnouncementModal";
import { useDebounce } from "@/hooks/useDebounce";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/utils/cn";
import { logger } from "@/utils/logger";

const PAGE_SIZE = 10;

function transformToLocal(data: DBAnnouncement[]): AnnouncementCardData[] {
  return data.map((db) => ({
    ...db,
    author: db.author?.full_name || "Admin",
    date: format(new Date(db.created_at), "dd MMM yyyy", { locale: localeId }),
    time:
      format(new Date(db.created_at), "HH:mm", { locale: localeId }) + " WIB",
    location: db.location || undefined,
    contactPerson: db.contact_person || undefined,
    isRead: false,
    rsvpStatus:
      db.rsvp_status === "yes"
        ? "attending"
        : db.rsvp_status === "no"
          ? "not_attending"
          : "pending",
  }));
}

export function Announcements() {
  usePageTitle("Pengumuman");
  const { user, role, tenantId } = useAuth();
  const { addToast } = useToast();
  const [announcements, setAnnouncements] = useState<AnnouncementCardData[]>(
    [],
  );
  const [searchTerm, setSearchTerm] = useState("");
  // ⚡ Perf: Debounce search term to prevent an API call on every keystroke.
  // Previously, each keystroke triggered useAnnouncements() with the raw searchTerm,
  // causing ~10-15 unnecessary DB round-trips per search.
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [expandedComments, setExpandedComments] = useState<string | null>(null);

  const {
    data: fetchedAnnouncements,
    refetch,
    isLoading,
  } = useAnnouncements({
    search: debouncedSearch || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const saveMutation = useSaveAnnouncement();
  const rsvpMutation = useSubmitRSVP();

  useEffect(() => {
    if (fetchedAnnouncements) {
      const transformed = transformToLocal(fetchedAnnouncements);
      if (page === 0) {
        setAnnouncements(transformed);
      } else {
        setAnnouncements((prev) => [...prev, ...transformed]);
      }
      setHasMore(fetchedAnnouncements.length === PAGE_SIZE);
    }
  }, [fetchedAnnouncements, page]);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    setPage(0);
    void refetch();
  }, [debouncedSearch]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const handleCreateAnnouncement = async (
    formData: {
      title: string;
      content: string;
      target_audience:
        | "all_students"
        | "course_students"
        | "course_staff"
        | "system";
      priority: "normal" | "high" | "low";
      is_pinned: boolean;
      allow_comments: boolean;
      requires_rsvp: boolean;
      location: string;
      contact_person: string;
      course_id: string | null;
    },
    status: "draft" | "published",
  ) => {
    if (!formData.title || !formData.content) {
      addToast({
        message: "Judul dan isi pengumuman wajib diisi.",
        type: "error",
      });
      return;
    }
    try {
      await saveMutation.mutateAsync({
        ...formData,
        tenant_id: tenantId!,
        status,
        created_by: user!.id,
        location: formData.location || null,
        contact_person: formData.contact_person || null,
      });
      addToast({
        message:
          status === "published"
            ? "Pengumuman telah diterbitkan!"
            : "Draf pengumuman disimpan.",
        type: "success",
      });
      setIsCreateModalOpen(false);
      void refetch();
    } catch (err) {
      if (import.meta.env.DEV)
        logger.error("Error creating announcement:", err);
      addToast({ message: "Gagal menyimpan pengumuman.", type: "error" });
    }
  };

  const handleRSVP = async (
    announcementId: string,
    response: "yes" | "no" | "maybe",
  ) => {
    try {
      await rsvpMutation.mutateAsync({ announcementId, response });
      addToast({ message: "Berhasil mengirim RSVP", type: "success" });
      void refetch();
    } catch {
      addToast({ message: "Gagal mengirim RSVP", type: "error" });
    }
  };

  const handleMarkAsRead = (id: string) => {
    setAnnouncements(
      announcements.map((a) => (a.id === id ? { ...a, isRead: true } : a)),
    );
  };

  // ⚡ Perf: Memoize filtered+sorted announcements — only recomputes when
  // announcements, debouncedSearch, or filter change. Previously recomputed
  // on every render (modal toggle, comment expand, etc.).
  const filteredAnnouncements = useMemo(
    () =>
      announcements
        .filter((a) => {
          const matchesSearch =
            a.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            a.content.toLowerCase().includes(debouncedSearch.toLowerCase());
          const matchesFilter =
            filter === "all"
              ? true
              : filter === "unread"
                ? !a.isRead
                : filter === "pinned"
                  ? a.is_pinned
                  : true;
          return matchesSearch && matchesFilter;
        })
        .sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          return 0;
        }),
    [announcements, debouncedSearch, filter],
  );

  // ⚡ Perf: Memoize unread count — previously computed via two separate
  // .filter() calls in JSX (lines 222, 224), iterating the full array twice per render.
  const unreadCount = useMemo(
    () => announcements.filter((a) => !a.isRead).length,
    [announcements],
  );

  if (isLoading && announcements.length === 0) {
    return <AnnouncementSkeleton />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 px-4 md:px-6 lg:px-8 dark:text-white">
      {/* Header */}
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
        {role === "teacher" && (
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
            aria-label="Cari pengumuman"
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700 dark:text-white dark:border-slate-600 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 custom-scrollbar">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-colors",
              filter === "all"
                ? "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900"
                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600",
            )}
          >
            Semua
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={cn(
              "whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2",
              filter === "unread"
                ? "bg-blue-600 text-white"
                : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30",
            )}
          >
            Belum Dibaca
            {unreadCount > 0 && (
              <span className="bg-white/20 px-1.5 py-0.5 rounded-md text-xs">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter("pinned")}
            className={cn(
              "whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2",
              filter === "pinned"
                ? "bg-amber-500 text-white"
                : "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30",
            )}
          >
            <Pin className="w-4 h-4" /> Disematkan
          </button>
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-6">
        {filteredAnnouncements.map((announcement, index) => (
          <AnnouncementFeedCard
            key={announcement.id}
            announcement={announcement}
            index={index}
            role={role}
            isCommentsExpanded={expandedComments === announcement.id}
            onToggleComments={() =>
              setExpandedComments(
                expandedComments === announcement.id ? null : announcement.id,
              )
            }
            onMarkAsRead={handleMarkAsRead}
            onRSVP={handleRSVP}
          />
        ))}

        {filteredAnnouncements.length > 0 && hasMore && (
          <div className="flex justify-center pt-4 pb-10">
            <button
              onClick={() => setPage((prev) => prev + 1)}
              className="px-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm flex items-center gap-2"
            >
              Muat Lebih Banyak
            </button>
          </div>
        )}

        {filteredAnnouncements.length === 0 && (
          <EmptyState
            icon={<Megaphone className="w-8 h-8" />}
            title="Tidak ada pengumuman"
            description="Belum ada pengumuman baru yang sesuai dengan filter atau pencarian Anda."
          />
        )}
      </div>

      <CreateAnnouncementModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateAnnouncement}
        isPending={saveMutation.isPending}
      />
    </div>
  );
}
