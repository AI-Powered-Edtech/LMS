import {
  AlertTriangle,
  Award,
  Calendar as CalendarIcon,
  CheckCircle,
  Clock,
  Download,
  FileText,
  ImageIcon,
  LayoutTemplate,
  Linkedin,
  Loader2,
  MessageCircle,
  QrCode,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { EmptyState, SkeletonCard } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import { CertificateTemplateList } from "@/features/certificates";
import type { Certificate } from "@/features/gamification";
import { useStudentCertificates } from "@/features/gamification";
import { certificateService } from "@/features/gamification/api/certificateService";
import { useDebounce } from "@/hooks/useDebounce";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useToast } from "@/hooks/useToast";
import { logger } from "@/utils/logger";

export function Certificates() {
  const { t, i18n } = useTranslation();
  const addToast = useToast((s) => s.addToast);
  usePageTitle(t("certificatesPage.pageTitle"));
  const { activeRole, profile, tenantId } = useAuth();
  // SECURITY FIX: Use activeRole (tenant-scoped) instead of global role
  const isTeacher = activeRole === "teacher";
  const navigate = useNavigate();

  const {
    data: certificates = [],
    isLoading,
    isError,
  } = useStudentCertificates();

  const [searchTerm, setSearchTerm] = useState("");
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState<string | null>(null);

  // ⚡ Perf: Debounce search input to avoid re-filtering on every keystroke
  const debouncedSearch = useDebounce(searchTerm, 300);

  const studentName = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
    : t("certificatesPage.studentFallback");

  // ⚡ Perf: Memoize filteredCertificates — was recomputed on every render without useMemo
  const filteredCertificates = useMemo(
    () =>
      certificates.filter((cert) =>
        cert.course_title.toLowerCase().includes(debouncedSearch.toLowerCase()),
      ),
    [certificates, debouncedSearch],
  );

  const highlightedCert = certificates.length > 0 ? certificates[0] : null;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(
      i18n.language === "en" ? "en-US" : "id-ID",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      },
    );

  const handleDownload = async (cert: Certificate, format: "pdf" | "png") => {
    setIsDownloading(cert.id);

    try {
      const blob = await certificateService.generatePdf({
        studentName,
        courseTitle: cert.course_title,
        completionDate: formatDate(cert.issued_at),
        tenantName: t("certificatesPage.issuerName"),
        certificateNumber: cert.certificate_number,
      });

      if (format === "png") {
        // For PNG, open the PDF in a new tab (server only generates PDF)
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${cert.course_title.replace(/\s+/g, "_")}_${t("certificatesPage.fileSuffix")}.pdf`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      }
    } catch (error) {
      if (import.meta.env.DEV)
        logger.error("Error generating certificate:", error);
      addToast({
        type: "error",
        message: t("certificatesPage.toasts.downloadError"),
      });
    } finally {
      setIsDownloading(null);
    }
  };

  const handleShare = (platform: string, cert: Certificate) => {
    const text = t("certificatesPage.shareText").replace(
      "{course}",
      cert.course_title,
    );
    // FIXED: Use env var for certificate verification URL — fallback to current origin
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const url = `${baseUrl}/verify/${cert.certificate_number}`;

    let shareUrl = "";
    if (platform === "linkedin") {
      shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    } else if (platform === "whatsapp") {
      shareUrl = `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`;
    } else if (platform === "twitter") {
      shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    }

    if (shareUrl) {
      window.open(shareUrl, "_blank");
    }
    setShowShareMenu(null);
  };

  // --- Teacher View ---
  if (isTeacher) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 p-4 md:p-8">
        {/* ── Page Header ─────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {t("certificatesPage.teacher.title")}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              {t("certificatesPage.teacher.subtitle")}
            </p>
          </div>
          <button
            onClick={() => navigate("/app/teacher/settings")}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl font-bold flex items-center gap-2 transition-colors self-start md:self-auto"
          >
            <Settings className="w-4 h-4" />{" "}
            {t("certificatesPage.teacher.settings")}
          </button>
        </div>

        {/* ── Penerbitan Massal — Coming Soon Card ─────────────────── */}
        <div className="flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-700/40 dark:bg-amber-900/10">
          <div className="shrink-0 w-10 h-10 bg-amber-100 dark:bg-amber-800/30 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h2 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                {t("certificatesPage.teacher.bulkTitle")}
              </h2>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-400 italic">
              {t("certificatesPage.teacher.bulkDescription")}
            </p>
          </div>
        </div>

        {/* ── Template Sertifikat ──────────────────────────────────── */}
        <section className="bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {t("certificatesPage.teacher.templateTitle")}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("certificatesPage.teacher.templateDescription")}
              </p>
            </div>
          </div>

          {tenantId ? (
            <CertificateTemplateList tenantId={tenantId} />
          ) : (
            <div className="flex items-center justify-center py-10 text-slate-400 dark:text-slate-500 text-sm">
              {t("certificatesPage.teacher.loadingTenant")}
            </div>
          )}
        </section>
      </div>
    );
  }

  // --- Student View ---
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 p-4 md:p-8">
        <SkeletonCard lines={2} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle className="w-14 h-14 text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            {t("certificatesPage.error.title")}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
            {t("certificatesPage.error.description")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {t("certificatesPage.student.title")}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            {t("certificatesPage.student.subtitle")}
          </p>
        </div>
      </div>

      {/* Highlighted Certificate */}
      {highlightedCert && (
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-xl">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-400 via-transparent to-transparent"></div>
          <div className="p-8 md:p-10 flex flex-col md:flex-row gap-8 relative z-10">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-400/20 text-yellow-400 rounded-lg text-xs font-bold uppercase tracking-wider mb-4 border border-yellow-400/30">
                <Award className="w-4 h-4" />{" "}
                {t("certificatesPage.student.latest")}
              </div>
              <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight">
                {highlightedCert.course_title}
              </h2>
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-slate-300">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                  <span>
                    {t("certificatesPage.student.issuedBy")}{" "}
                    <strong className="text-white">
                      {t("certificatesPage.issuerName")}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <CalendarIcon className="w-5 h-5 text-blue-400" />
                  <span>
                    {t("certificatesPage.student.issuedOn")}{" "}
                    <strong className="text-white">
                      {formatDate(highlightedCert.issued_at)}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>{t("certificatesPage.student.courseCompleted")}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handleDownload(highlightedCert, "pdf")}
                  disabled={isDownloading === highlightedCert.id}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-70"
                >
                  {isDownloading === highlightedCert.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <FileText className="w-5 h-5" />
                  )}
                  {t("certificatesPage.actions.downloadPdf")}
                </button>
                <button
                  onClick={() => handleDownload(highlightedCert, "png")}
                  disabled={isDownloading === highlightedCert.id}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold flex items-center gap-2 transition-colors backdrop-blur-sm disabled:opacity-70"
                >
                  <ImageIcon className="w-5 h-5" />
                  {t("certificatesPage.actions.downloadPng")}
                </button>
              </div>
            </div>

            <div className="w-full md:w-1/3 shrink-0 flex flex-col items-center justify-center bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-md">
              {/* TODO: Implement actual QR code generation using qrcode library */}
              <QrCode className="w-32 h-32 text-white opacity-80 mb-4" />
              <div className="text-center">
                <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">
                  {t("certificatesPage.student.officialId")}
                </div>
                <div className="font-mono font-bold text-blue-300">
                  {highlightedCert.certificate_number}
                </div>
              </div>
              <p className="text-xs text-slate-400 text-center mt-4">
                {t("certificatesPage.student.qrHint")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gallery & Filters */}
      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {certificates.length > 0
              ? t("certificatesPage.student.allCertificates")
              : t("certificatesPage.student.certificates")}
          </h2>
          {certificates.length > 0 && (
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={t("certificatesPage.student.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-sm shadow-sm"
              />
            </div>
          )}
        </div>

        {certificates.length === 0 ? (
          <EmptyState
            icon={<Award className="w-16 h-16" />}
            title={t("certificatesPage.empty.title")}
            description={t("certificatesPage.empty.description")}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCertificates.map((cert, index) => (
              <motion.div
                key={
                  cert.id ?? cert.certificate_number ?? cert.course_id ?? index
                }
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col"
              >
                {/* Certificate preview header */}
                <div className="relative h-40 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-400 via-transparent to-transparent"></div>
                  <div className="text-center z-10 px-6">
                    <Award className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                    <p className="text-white font-bold text-sm line-clamp-2">
                      {cert.course_title}
                    </p>
                  </div>
                  <div className="absolute bottom-3 right-3">
                    <span className="px-2 py-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold rounded-lg border border-white/30">
                      {t("certificatesPage.student.courseCompletion")}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-2 line-clamp-2">
                    {cert.course_title}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                    EduSync Academy
                  </p>
                  <p className="text-slate-400 text-xs flex items-center gap-1.5 mb-4">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {formatDate(cert.issued_at)}
                  </p>
                  <p className="text-xs font-mono text-slate-400 mb-4">
                    {cert.certificate_number}
                  </p>

                  <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                    <div className="relative">
                      <button
                        onClick={() =>
                          setShowShareMenu(
                            showShareMenu === cert.id ? null : cert.id,
                          )
                        }
                        className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-transparent hover:border-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        title={t("certificatesPage.actions.share")}
                        aria-label={t(
                          "certificatesPage.actions.shareCertificate",
                        )}
                      >
                        <Share2 className="w-5 h-5" />
                      </button>

                      <AnimatePresence>
                        {showShareMenu === cert.id && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden z-20"
                          >
                            <div className="p-2 space-y-1">
                              <button
                                onClick={() => handleShare("linkedin", cert)}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors"
                              >
                                <Linkedin className="w-4 h-4" /> LinkedIn
                              </button>
                              <button
                                onClick={() => handleShare("whatsapp", cert)}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-green-50 hover:text-green-700 rounded-xl transition-colors"
                              >
                                <MessageCircle className="w-4 h-4" /> WhatsApp
                              </button>
                              <button
                                onClick={() => handleShare("twitter", cert)}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-sky-50 hover:text-sky-700 rounded-xl transition-colors"
                              >
                                <Share2 className="w-4 h-4" /> Twitter / X
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(cert, "png")}
                        disabled={isDownloading === cert.id}
                        className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-transparent hover:border-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        title={t("certificatesPage.actions.downloadPng")}
                        aria-label={t(
                          "certificatesPage.actions.downloadPngAria",
                        )}
                      >
                        <ImageIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDownload(cert, "pdf")}
                        disabled={isDownloading === cert.id}
                        className="px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 hover:bg-blue-50 text-slate-700 dark:text-slate-300 hover:text-blue-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-200 dark:border-slate-700 hover:border-blue-200"
                      >
                        {isDownloading === cert.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        PDF
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {filteredCertificates.length === 0 && certificates.length > 0 && (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 border-dashed">
            <Award className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
              {t("certificatesPage.searchEmpty.title")}
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              {t("certificatesPage.searchEmpty.description")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
