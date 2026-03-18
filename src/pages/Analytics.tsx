import React, { useState, useEffect } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  AlertTriangle,
  Clock,
  Filter,
  ArrowUpDown,
  Eye,
  Sparkles,
  RefreshCw,
  Users,
  Activity,
  BookOpen,
  Award,
  Loader2,
  AlertCircle,
  WifiOff,
} from "lucide-react";
import { cn } from "@/src/utils/cn";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/src/contexts/AuthContext";
import { courseService, Course } from "@/src/features/courses";
import { AnalyticsError } from "@/src/services/analyticsService";
import { useTeacherAnalytics, useRefreshCourseStats } from "@/src/features/analytics/queries/analyticsQueries";

export function Analytics() {
  const { activeTenant } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  // Use React Query hooks for analytics data
  const { data, isLoading, error, refetch } = useTeacherAnalytics(selectedCourseId);
  const refreshMutation = useRefreshCourseStats();

  const [filter, setFilter] = useState("Semua");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Load courses for tenant
  useEffect(() => {
    async function loadCourses() {
      if (!activeTenant?.id) return;
      try {
        const result = await courseService.fetchCourses({ tenantId: activeTenant.id, limit: 50 });
        setCourses(result.courses);
        if (result.courses.length > 0) {
          setSelectedCourseId(result.courses[0].id);
        }
      } catch (err) {
        console.error("Failed to load courses", err);
      }
    }
    loadCourses();
  }, [activeTenant?.id]);

  // Handle error state from query
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      if (error instanceof AnalyticsError) {
        switch (error.code) {
          case 'PERMISSION_DENIED':
            setErrorMessage('Anda tidak memiliki akses ke analitik kursus ini. Hanya guru dan admin yang dapat melihat.');
            break;
          case 'RPC_NOT_FOUND':
            setErrorMessage('Konfigurasi analitik belum lengkap. Silakan hubungi administrator sistem.');
            break;
          case 'COURSE_NOT_FOUND':
            setErrorMessage('Kursus tidak ditemukan atau telah dihapus.');
            break;
          case 'TENANT_MISMATCH':
            setErrorMessage('Akses ditolak. Kursus tidak termasuk dalam organisasi Anda.');
            break;
          case 'NETWORK_ERROR':
            setErrorMessage('Koneksi internet bermasalah. Silakan periksa koneksi Anda dan coba lagi.');
            break;
          default:
            setErrorMessage(error.message);
        }
      } else {
        setErrorMessage("Gagal memuat analitik. Pastikan module dan quiz terhubung ke progress.");
      }
    } else {
      setErrorMessage(null);
    }
  }, [error]);

  const handleManualRefresh = async () => {
    if (!selectedCourseId) return;
    try {
      await refreshMutation.mutateAsync(selectedCourseId);
      refetch();
    } catch (err: unknown) {
      console.error("Failed to refresh analytics", err);

      let errorMessage = "Gagal memperbarui data analitik manual.";

      if (err instanceof AnalyticsError) {
        switch (err.code) {
          case 'PERMISSION_DENIED':
            errorMessage = 'Anda tidak memiliki akses untuk memperbarui analitik.';
            break;
          case 'RPC_NOT_FOUND':
            errorMessage = 'Fungsi refresh belum tersedia. Hubungi administrator.';
            break;
          case 'NETWORK_ERROR':
            errorMessage = 'Koneksi internet bermasalah.';
            break;
        }
      }

      alert(errorMessage);
    }
  };

  const handleAnalyzeWithAI = async () => {
    alert("⚠️ Fitur AI Analytics In-Depth sedang dalam pengembangan. Gunakan AI Tutor untuk pertanyaan spesifik.");
  };

  if (!activeTenant) return null;

  const radarData = data?.module_completion.map(m => ({
    subject: m.title.length > 15 ? m.title.substring(0, 15) + '...' : m.title,
    Completion: Math.round(m.completion_rate),
    fullMark: 100
  })) || [];

  const studentsToShow = data?.students.top.concat(data?.students.at_risk || []) || [];

  // Quick status heuristic for UI
  const getStatus = (progress: number, lastActive: string | null) => {
    if (progress < 40) return "Kritis";
    if (progress < 70) return "Pemantauan";
    return "Aman";
  };

  const filteredStudents = studentsToShow.filter((s) => {
    if (filter === "Semua") return true;
    return getStatus(s.progress, s.last_active) === filter;
  });

  // Helper function to format last updated time
  const formatLastUpdated = (timestamp: string | null) => {
    if (!timestamp) return "Belum pernah dihitung";

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    if (diffMinutes < 1) return "Baru saja";
    if (diffMinutes < 60) return `${diffMinutes} menit yang lalu`;
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Learning Analytics Engine
          </h1>
          <p className="text-slate-500 mt-2">
            Pantau perkembangan komprehensif siswa menggunakan data teragregasi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="bg-white border text-sm border-slate-200 text-slate-700 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 p-2.5 shadow-sm"
          >
            {courses.length === 0 && <option value="">Tidak ada kursus</option>}
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>

          <button
            onClick={handleManualRefresh}
            disabled={refreshMutation.isPending || isLoading || !selectedCourseId}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", refreshMutation.isPending && "animate-spin")} />
            Perbarui
          </button>

          <button
            onClick={handleAnalyzeWithAI}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white transition-all shadow-md hover:shadow-lg bg-indigo-600 hover:bg-indigo-700"
          >
            <Sparkles className="w-5 h-5" />
            AI Insight
          </button>
        </div>
      </div>

      {/* Last Updated Info - Show when data is loaded */}
      {data && (
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-4 py-2 rounded-lg">
          <Clock className="w-4 h-4" />
          <span>Terakhir diperbarui: {formatLastUpdated(data.overview.last_calculated_at)}</span>
        </div>
      )}

      {isLoading && !refreshMutation.isPending ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
          <p className="text-slate-500">Memuat data agregasi dari warehouse...</p>
        </div>
      ) : errorMessage ? (
        <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-start gap-4">
          {errorMessage.includes('Koneksi') || errorMessage.includes('internet') ? (
            <WifiOff className="w-6 h-6 shrink-0" />
          ) : errorMessage.includes('akses') || errorMessage.includes('akses') ? (
            <AlertCircle className="w-6 h-6 shrink-0" />
          ) : (
            <AlertTriangle className="w-6 h-6 shrink-0" />
          )}
          <div>
            <h3 className="font-bold">Gagal memuat analitik</h3>
            <p className="text-sm mt-1">{errorMessage}</p>
          </div>
        </div>
      ) : !data ? (
        <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-200">
          <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Pilih kursus untuk melihat data analitik.</p>
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Enrolled</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{data.overview.total_enrolled}</h3>
                <p className="text-xs text-slate-400 mt-1">{data.overview.active_students} aktif berturut-turut</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Rata-rata Progress</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{Math.round(data.overview.avg_progress)}%</h3>
                <p className="text-xs text-slate-400 mt-1">Completion rate {Math.round(data.overview.lesson_completion_rate)}%</p>
              </div>
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Rata-rata Quiz Score</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{Math.round(data.overview.avg_quiz_score)}%</h3>
                <p className="text-xs text-slate-400 mt-1">Pass rate {Math.round(data.overview.quiz_pass_rate)}%</p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Siswa At-Risk</p>
                <h3 className="text-2xl font-bold text-red-600 mt-1">{data.overview.at_risk_count}</h3>
                <p className="text-xs text-slate-400 mt-1">Butuh intervensi segera</p>
              </div>
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Radar Chart for Module Completion */}
            <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                Penyelesaian Modul
              </h2>
              <p className="text-sm text-slate-500 mb-4">Tingkat penyelesaian rata-rata tiap modul dalam kursus ini.</p>

              {radarData.length > 0 ? (
                <div className="h-80 w-full -ml-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: "#64748b", fontSize: 11, fontWeight: 600 }}
                      />
                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={false}
                        axisLine={false}
                      />
                      <Radar
                        name="Completion (%)"
                        dataKey="Completion"
                        stroke="#4f46e5"
                        fill="#4f46e5"
                        fillOpacity={0.4}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                        }}
                        itemStyle={{ fontWeight: "bold" }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center flex-1 justify-center h-64 text-slate-400">
                  <BookOpen className="w-12 h-12 mb-3 opacity-50" />
                  <p>Belum ada data modul</p>
                </div>
              )}
            </div>

            {/* Predictive Risk Table */}
            <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">
                  Daftar Siswa (Top & At-Risk)
                </h2>
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-slate-400" />
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2 font-medium"
                  >
                    <option value="Semua">Semua Status</option>
                    <option value="Aman">Aman</option>
                    <option value="Pemantauan">Pemantauan</option>
                    <option value="Kritis">Kritis</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm text-left text-slate-600">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th scope="col" className="px-6 py-4 font-bold">Nama Siswa</th>
                      <th scope="col" className="px-6 py-4 font-bold text-center">Progress</th>
                      <th scope="col" className="px-6 py-4 font-bold text-center">Terakhir Aktif</th>
                      <th scope="col" className="px-6 py-4 font-bold text-center">Saran Intervensi</th>
                      <th scope="col" className="px-6 py-4 font-bold text-right">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((student) => {
                        const status = getStatus(student.progress, student.last_active);
                        const isKritis = status === "Kritis";
                        const isPemantauan = status === "Pemantauan";
                        const isExpanded = expandedRow === student.student_id;

                        let relativeDate = "-";
                        if (student.last_active) {
                          const diffMs = new Date().getTime() - new Date(student.last_active).getTime();
                          const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
                          if (diffDays === 0) relativeDate = "Hari ini";
                          else if (diffDays === 1) relativeDate = "Kemarin";
                          else relativeDate = `${diffDays} hari lalu`;
                        }

                        return (
                          <React.Fragment key={student.student_id}>
                            <tr
                              className={cn(
                                "border-b border-slate-100 transition-colors",
                                isKritis && !isExpanded ? "bg-red-50/30 hover:bg-red-50/80" : "hover:bg-slate-50"
                              )}
                            >
                              <td className="px-6 py-4 font-semibold text-slate-900">
                                {student.name}
                                {isKritis && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex flex-col items-center">
                                  <span className={cn("font-bold text-base", isKritis ? "text-red-600" : "text-slate-700")}>
                                    {Math.round(student.progress)}%
                                  </span>
                                  <div className="w-16 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                    <div
                                      className={cn("h-full rounded-full", isKritis ? "bg-red-500" : "bg-indigo-500")}
                                      style={{ width: `${student.progress}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={cn(
                                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium",
                                  relativeDate === "-" || relativeDate.includes("hari lalu") && parseInt(relativeDate) > 7
                                    ? "bg-red-100 text-red-700"
                                    : "bg-slate-100 text-slate-600"
                                )}>
                                  <Clock className="w-3.5 h-3.5" />
                                  {relativeDate}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                {isKritis ? (
                                  <span className="text-xs font-medium text-red-600 border border-red-200 bg-red-50 px-2 py-1 rounded">Intervensi Aktif</span>
                                ) : isPemantauan ? (
                                  <span className="text-xs font-medium text-amber-600 border border-amber-200 bg-amber-50 px-2 py-1 rounded">Monitor</span>
                                ) : (
                                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">Aman</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => setExpandedRow(isExpanded ? null : student.student_id)}
                                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                  title="Lihat Detail Log"
                                >
                                  <Eye className="w-5 h-5" />
                                </button>
                              </td>
                            </tr>
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.tr
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="bg-slate-50/80 border-b border-slate-200"
                                >
                                  <td colSpan={5} className="px-6 py-4">
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm shadow-sm flex items-start gap-3">
                                      <AlertTriangle className={cn("w-5 h-5 shrink-0 mt-0.5", isKritis ? "text-red-500" : "text-amber-500")} />
                                      <div>
                                        <p className="font-semibold text-slate-800 mb-1">
                                          Sistem mendeteksi bahwa {student.name} {isKritis ? "sangat tertinggal" : "sedikit tertinggal"} dari target kelas.
                                        </p>
                                        <p className="text-slate-600 mb-3">
                                          Tingkat penyelesaian kursus: {Math.round(student.progress)}%.
                                          Disarankan untuk menghubungi siswa melalui fitur pesan atau melakukan check-in pada sesi berikutnya.
                                        </p>
                                        <button className="text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors">
                                          Kirim Pesan Otomatis (Segera Hadir)
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                </motion.tr>
                              )}
                            </AnimatePresence>
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                          Tidak ada siswa yang sesuai dengan filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
