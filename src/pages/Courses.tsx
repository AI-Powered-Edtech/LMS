import {
  BookOpen,
  ChevronDown,
  Clock,
  Download,
  FileText,
  Layers,
  LayoutList,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { AssignCourseModal } from "@/components/Classroom/AssignCourseModal";
import { useAuth } from "@/contexts/AuthContext";
import { Course, courseService } from "@/features/courses";
import { useInfiniteCoursesQuery } from "@/features/courses/queries/courseQueries";
import { useDebounce } from "@/hooks/useDebounce";
import { useRoleBasedPath } from "@/hooks/useRoleBasedPath";
import { useToast } from "@/hooks/useToast";
import { defaultCsvFilename, exportCsv } from "@/shared/utils/export-table";
import { cn } from "@/utils/cn";
import { logger } from "@/utils/logger";

// Gradient palette rotated per card index
const CARD_GRADIENTS = [
  "from-indigo-500 via-indigo-600 to-purple-600",
  "from-blue-500 via-cyan-500 to-teal-500",
  "from-rose-500 via-pink-500 to-fuchsia-600",
  "from-amber-500 via-orange-500 to-red-500",
  "from-emerald-500 via-teal-500 to-cyan-600",
  "from-violet-500 via-purple-600 to-indigo-600",
];

// M-10: Deterministic gradient based on course.id to prevent flicker on search filter
function getCourseGradient(courseId: string, gradients: string[]): string {
  const hash = courseId
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
}

// Modal animation keyframes (extracted as const supaya tidak re-create per render)
const MODAL_INITIAL = { opacity: 0, scale: 0.9, y: 20 } as const;
const MODAL_ANIMATE = { opacity: 1, scale: 1, y: 0 } as const;
const MODAL_EXIT = { opacity: 0, scale: 0.95, y: 10 } as const;

export const Courses: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const getPath = useRoleBasedPath();
  const { user, activeTenant } = useAuth();
  const addToast = useToast((s) => s.addToast);

  useEffect(() => {
    document.title = t("courses.pageTitle");
    return () => {
      document.title = "EduSync";
    };
  }, [t]);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Create Course Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newLevel, setNewLevel] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Assign Class Modal State
  const [assignModal, setAssignModal] = useState<{
    isOpen: boolean;
    courseId: string;
    courseTitle: string;
  }>({
    isOpen: false,
    courseId: "",
    courseTitle: "",
  });

  // M-2: Escape key handler via useEffect so document receives the event
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isModalOpen) {
        if (
          newTitle.trim() ||
          newDescription.trim() ||
          newSubject.trim() ||
          newLevel.trim()
        ) {
          if (!window.confirm(t("courses.create.unsavedConfirm"))) return;
        }
        setIsModalOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, newDescription, newLevel, newSubject, newTitle, t]);

  // P2 fix: focus trap untuk modal create-course (a11y)
  const modalDialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isModalOpen) return;
    const root = modalDialogRef.current;
    if (!root) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const selector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusable = () =>
      Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
        (el) => !el.hasAttribute("aria-hidden") && el.offsetParent !== null,
      );
    // Auto-focus elemen pertama (biasanya field Judul)
    requestAnimationFrame(() => {
      const focusables = getFocusable();
      focusables[0]?.focus();
    });
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusables = getFocusable();
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleTab);
    return () => {
      document.removeEventListener("keydown", handleTab);
      previouslyFocused?.focus?.();
    };
  }, [isModalOpen, newDescription, newLevel, newSubject, newTitle, t]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteCoursesQuery(debouncedSearch);

  const courses = useMemo(
    () => data?.pages.flatMap((p) => p.courses) ?? [],
    [data?.pages]
  );

  // Sentinel for IntersectionObserver — triggers loading the next page
  const sentinelRef = useRef<HTMLDivElement>(null);

  // M-18: Stable ref for the load-more callback — prevents observer recreation on dep changes
  const loadMoreRef = useRef<() => void>(() => {});
  loadMoreRef.current = () => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  };

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreRef.current();
      },
      { rootMargin: "200px", threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []); // stable — uses ref internally

  // Server-side search covers title. Client-side filter covers description
  // (the service only does ilike on title, so we locally filter description as well)
  const filteredCourses = useMemo(() => {
    if (!debouncedSearch) return courses;

    // Hoist static invariant search string operation outside the loop
    const query = debouncedSearch.toLowerCase();

    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        (c.description ?? "").toLowerCase().includes(query)
    );
  }, [courses, debouncedSearch]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant?.id || !user?.id || !newTitle.trim()) return;

    try {
      setIsCreating(true);
      const newCourse = await courseService.createCourse({
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        subject: newSubject.trim() || null,
        level: newLevel.trim() || null,
        tenant_id: activeTenant.id,
        created_by: user.id,
      });
      if (!newCourse?.id) {
        throw new Error(t("courses.toasts.createError"));
      }

      setIsModalOpen(false);
      addToast({
        type: "success",
        message: t("courses.toasts.createSuccess").replace(
          "{title}",
          newCourse.title,
        ),
      });
      const targetPath = `${getPath("/app/teacher/course-builder", "/app/admin/course-builder")}?courseId=${newCourse.id}`;
      if (import.meta.env.DEV)
        logger.debug("Navigating to targetPath:", targetPath);
      void navigate(targetPath);
    } catch (err: unknown) {
      if (import.meta.env.DEV) logger.error("Failed to create course:", err);
      addToast({
        type: "error",
        message:
          err instanceof Error ? err.message : t("courses.toasts.createError"),
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleExportCsv = () => {
    try {
      const rows = filteredCourses.map((c) => ({
        [t("courses.csv.title")]: c.title,
        [t("courses.csv.subject")]: c.subject ?? "",
        [t("courses.csv.level")]: c.level ?? "",
        [t("courses.csv.description")]: c.description ?? "",
        [t("courses.csv.modules")]: c.modules?.length ?? c.module_count ?? 0,
        [t("courses.csv.updatedAt")]: c.updated_at ?? "",
      }));
      exportCsv(defaultCsvFilename("courses"), rows);
      addToast({ type: "success", message: t("courses.toasts.exportSuccess") });
    } catch (err) {
      addToast({
        type: "warning",
        message:
          err instanceof Error ? err.message : t("courses.toasts.exportError"),
      });
    }
  };

  const openModal = () => {
    setNewTitle("");
    setNewDescription("");
    setNewSubject("");
    setNewLevel("");
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto min-h-screen">
      {/* Header */}
      <div className="bg-white/50 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-gray-700/50 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-2">
            {t("courses.title")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-base max-w-2xl">
            {t("courses.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredCourses.length === 0}
            data-testid="courses-export-csv"
            aria-label={t("courses.actions.exportCsv")}
            className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span>{t("courses.actions.exportCsv")}</span>
          </button>
          <button
            onClick={openModal}
            className="group relative flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/30 active:scale-95 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <Plus className="w-5 h-5" />
            <span>{t("courses.actions.createNew")}</span>
          </button>
        </div>
      </div>

      {/* Search bar */}
      {!isLoading && !isError && courses.length > 0 && (
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
          {/* L-4: type="search" for proper semantics and browser UX (clear button, etc.) */}
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("courses.searchPlaceholder")}
            aria-label={t("courses.searchAria")}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm font-medium shadow-sm"
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white/30 dark:bg-gray-800/20 backdrop-blur-sm rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {t("courses.loading")}
          </p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-8 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-3xl max-w-md w-full shadow-xl">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <RefreshCw className="w-8 h-8" />
            </div>
            <p className="text-xl font-bold mb-3">{t("courses.errorTitle")}</p>
            <p className="text-sm opacity-80 mb-6">
              {t("courses.errorDescription")}
            </p>
            <button
              onClick={() => refetch()}
              className="flex items-center justify-center w-full space-x-2 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg hover:shadow-red-500/20"
            >
              <span>{t("courses.actions.reload")}</span>
            </button>
          </div>
        </div>
      ) : filteredCourses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-32 bg-white/50 dark:bg-gray-800/30 backdrop-blur-md rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl"
        >
          {/* Illustration-like stacked icon */}
          <div className="relative mb-8">
            <div className="w-28 h-28 bg-gradient-to-tr from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 rounded-3xl flex items-center justify-center rotate-6 shadow-lg">
              <BookOpen className="w-14 h-14 text-indigo-400 dark:text-indigo-500" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-tr from-yellow-400 to-orange-400 rounded-xl flex items-center justify-center shadow-md -rotate-6">
              <Plus className="w-5 h-5 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
            {search ? t("courses.empty.searchTitle") : t("courses.empty.title")}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm mb-8 text-base">
            {search
              ? t("courses.empty.searchDescription").replace("{query}", search)
              : t("courses.empty.description")}
          </p>
          {!search && (
            <button
              onClick={openModal}
              className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 transition-all hover:-translate-y-1 active:scale-95"
            >
              {t("courses.actions.createFirst")}
            </button>
          )}
        </motion.div>
      ) : (
        <div
          data-testid="course-grid"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence>
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                // M-10: deterministic gradient by course.id — no flicker on search filter
                gradientClass={getCourseGradient(course.id, CARD_GRADIENTS)}
                onNavigate={() =>
                  navigate(
                    `${getPath("/app/teacher/course-builder", "/app/admin/course-builder")}?courseId=${course.id}`,
                  )
                }
                onAssign={() =>
                  setAssignModal({
                    isOpen: true,
                    courseId: course.id,
                    courseTitle: course.title,
                  })
                }
              />
            ))}
          </AnimatePresence>

          {/* Sentinel — triggers loading next page when scrolled into view */}
          <div ref={sentinelRef} className="col-span-full h-1" />

          {/* Loading more indicator */}
          {isFetchingNextPage && (
            <div className="col-span-full flex justify-center items-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <span className="ml-2 text-sm text-slate-500">
                {t("courses.loadingMore")}
              </span>
            </div>
          )}

          {/* End of list */}
          {!hasNextPage && filteredCourses.length > 0 && (
            <p className="col-span-full text-center text-sm text-slate-400 py-4">
              {t("courses.allShown").replace(
                "{count}",
                String(filteredCourses.length),
              )}
            </p>
          )}
        </div>
      )}

      {/* Create Course Modal */}
      <AnimatePresence>
        {isModalOpen && (
          // M-3: Click outside the modal panel closes it
          <div
            role="presentation"
            className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-md"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                if (
                  newTitle.trim() ||
                  newDescription.trim() ||
                  newSubject.trim() ||
                  newLevel.trim()
                ) {
                  if (!window.confirm(t("courses.create.unsavedConfirm")))
                    return;
                }
                setIsModalOpen(false);
              }
            }}
          >
            <motion.div
              ref={modalDialogRef}
              initial={MODAL_INITIAL}
              animate={MODAL_ANIMATE}
              exit={MODAL_EXIT}
              role="dialog"
              aria-modal="true"
              aria-label={t("courses.create.title")}
              className="bg-white dark:bg-gray-800 rounded-[2rem] w-full max-w-2xl p-0 shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden relative flex flex-col max-h-[90vh]"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

              <div className="px-8 pt-8 pb-6 border-b border-gray-100 dark:border-gray-700/50">
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                      {t("courses.create.title")}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
                      {t("courses.create.description")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-y-auto px-8 py-6 custom-scrollbar">
                <form
                  id="create-course-form"
                  onSubmit={handleCreateCourse}
                  className="space-y-6"
                >
                  {/* Judul Materi */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      {t("courses.create.titleLabel")}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={255}
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-4 py-3.5 border border-gray-200 dark:border-gray-600/80 rounded-xl bg-gray-50/50 dark:bg-gray-700/30 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-base shadow-sm"
                      placeholder={t("courses.create.titlePlaceholder")}
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Mata Pelajaran */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                        <BookOpen className="w-4 h-4 text-gray-400" />
                        {t("courses.create.subjectLabel")}
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          maxLength={100}
                          value={newSubject}
                          onChange={(e) => setNewSubject(e.target.value)}
                          className="w-full pl-4 pr-10 py-3.5 border border-gray-200 dark:border-gray-600/80 rounded-xl bg-gray-50/50 dark:bg-gray-700/30 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium shadow-sm"
                          placeholder={t("courses.create.subjectPlaceholder")}
                        />
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Tingkat / Level */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                        <LayoutList className="w-4 h-4 text-gray-400" />
                        {t("courses.create.levelLabel")}
                      </label>
                      <div className="relative">
                        <select
                          value={newLevel}
                          onChange={(e) => setNewLevel(e.target.value)}
                          className="w-full pl-4 pr-10 py-3.5 border border-gray-200 dark:border-gray-600/80 rounded-xl bg-gray-50/50 dark:bg-gray-700/30 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium appearance-none shadow-sm cursor-pointer"
                        >
                          <option value="">
                            {t("courses.create.levelPlaceholder")}
                          </option>
                          <option value="SD / Sederajat">
                            {t("courses.levels.elementary")}
                          </option>
                          <option value="SMP / Sederajat">
                            {t("courses.levels.middle")}
                          </option>
                          <option value="SMA / SMK / Sederajat">
                            {t("courses.levels.high")}
                          </option>
                          <option value="Perguruan Tinggi">
                            {t("courses.levels.college")}
                          </option>
                          <option value="Umum / Profesional">
                            {t("courses.levels.generalProfessional")}
                          </option>
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Deskripsi */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      {t("courses.create.shortDescriptionLabel")}
                    </label>
                    <textarea
                      rows={3}
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      className="w-full px-4 py-3.5 border border-gray-200 dark:border-gray-600/80 rounded-xl bg-gray-50/50 dark:bg-gray-700/30 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-gray-700 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium resize-none shadow-sm"
                      placeholder={t(
                        "courses.create.shortDescriptionPlaceholder",
                      )}
                    />
                  </div>
                </form>
              </div>

              <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 flex gap-3 justify-end items-center mt-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (
                      newTitle.trim() ||
                      newDescription.trim() ||
                      newSubject.trim() ||
                      newLevel.trim()
                    ) {
                      if (!window.confirm(t("courses.create.unsavedConfirm")))
                        return;
                    }
                    setIsModalOpen(false);
                  }}
                  className="px-6 py-2.5 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  disabled={isCreating}
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  form="create-course-form"
                  disabled={isCreating || !newTitle.trim()}
                  className="flex items-center justify-center px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {t("courses.create.saving")}
                    </>
                  ) : (
                    t("courses.create.submit")
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assign Course Modal */}
      <AssignCourseModal
        isOpen={assignModal.isOpen}
        onClose={() => setAssignModal((prev) => ({ ...prev, isOpen: false }))}
        courseId={assignModal.courseId}
        courseTitle={assignModal.courseTitle}
      />
    </div>
  );
};

// ─── Course Card ────────────────────────────────────────────────────────────

interface CourseCardProps {
  course: Course;
  gradientClass: string;
  onNavigate: () => void;
  onAssign: () => void;
}

function CourseCard({
  course,
  gradientClass,
  onNavigate,
  onAssign,
}: CourseCardProps) {
  const { t, i18n } = useTranslation();
  const moduleCount = course.modules?.length ?? course.module_count ?? null;

  return (
    <div
      role="button"
      tabIndex={0}
      // L-1: ARIA label for screen readers
      aria-label={t("courses.card.openAria").replace("{title}", course.title)}
      className={cn(
        "group cursor-pointer bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700/60",
        "overflow-hidden shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 dark:hover:shadow-indigo-900/20",
        "transition-all duration-300 hover:-translate-y-1",
      )}
      onClick={onNavigate}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onNavigate()}
    >
      {/* Thumbnail / gradient header */}
      <div
        className={cn(
          "h-40 bg-gradient-to-br relative p-6 flex flex-col justify-end overflow-hidden",
          gradientClass,
        )}
      >
        {/* decorative blobs */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-black/10 rounded-full -ml-10 -mb-10 blur-xl" />

        {/* Module count badge */}
        {moduleCount !== null && (
          <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-bold">
            <Layers className="w-3.5 h-3.5" />
            {t("courses.card.moduleCount").replace(
              "{count}",
              String(moduleCount),
            )}
          </div>
        )}

        <h3 className="text-white font-black text-xl relative z-10 leading-tight line-clamp-2 drop-shadow-sm">
          {course.title}
        </h3>
      </div>

      {/* Body */}
      <div className="p-5">
        <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-4 leading-relaxed min-h-[2.5rem]">
          {course.description || (
            <span className="italic text-slate-400 dark:text-slate-500 text-xs">
              {t("courses.card.noDescription")}
            </span>
          )}
        </p>

        {/* Assigned classes tags */}
        {course.assigned_classes && course.assigned_classes.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {course.assigned_classes.map((ac) => (
              <span
                key={ac.class_id}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800"
              >
                {ac.class?.name || t("courses.card.classFallback")}
              </span>
            ))}
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700/60">
          <div className="flex items-center text-gray-400 dark:text-gray-500 text-xs font-medium gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {/* M-1: Guard against null updated_at to avoid "Invalid Date" */}
            <span>
              {course.updated_at
                ? new Date(course.updated_at).toLocaleDateString(
                    i18n.language === "en" ? "en-US" : "id-ID",
                    {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    },
                  )
                : "-"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* L-2: aria-label for assistive technology */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAssign();
              }}
              aria-label={t("courses.card.assignToClass")}
              className="p-2 bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title={t("courses.card.assignToClass")}
            >
              <Users className="w-4 h-4" />
            </button>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
              {t("courses.card.edit")}
              <span aria-hidden="true">→</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
