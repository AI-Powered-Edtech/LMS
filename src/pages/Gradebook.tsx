import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  Download,
  MoreVertical,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  Edit2,
  Save,
  X,
  Plus,
  Users
} from "lucide-react";
import { cn } from "@/src/utils/cn";
import { useGradebook, Assignment } from "@/src/hooks/useGradebookQueries";
import { EmptyState } from "@/src/components/ui";

export function Gradebook() {
  const { students, assignments, grades, updateGrade, addAssignment } = useGradebook();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCell, setEditingCell] = useState<{ studentId: string, assignmentId: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState<Partial<Assignment>>({
    title: "",
    type: "assignment",
    maxScore: 100,
    date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  });

  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAssignment.title && newAssignment.type && newAssignment.maxScore) {
      const id = `a${Date.now()}`;
      addAssignment({
        id,
        title: newAssignment.title,
        type: newAssignment.type as any,
        maxScore: Number(newAssignment.maxScore),
        date: newAssignment.date || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
      });
      setIsAddModalOpen(false);
      setNewAssignment({
        title: "",
        type: "assignment",
        maxScore: 100,
        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
      });
    }
  };

  // Memoize student calculations to prevent recalculation on every render
  const studentStats = useMemo(() => {
    const stats: Record<string, { avg: number, total: number }> = {};
    let allAverages: number[] = [];
    let highestScore = 0;
    let lowestScore = 100; // Assuming 100 is max, will be updated
    let highestStudent = "-";
    let lowestStudent = "-";

    students.forEach(student => {
      const studentGrades = grades[student.id];
      let avg = 0;
      let total = 0;

      if (studentGrades) {
        const scores = Object.values(studentGrades)
          .map(entry => entry.score)
          .filter((score): score is number => score !== null);

        if (scores.length > 0) {
          total = scores.reduce((a, b) => a + b, 0);
          avg = Math.round(total / scores.length);
        }
      }

      stats[student.id] = { avg, total };

      if (avg > 0) {
        allAverages.push(avg);
      }
    });

    if (allAverages.length > 0) {
      highestScore = Math.max(...allAverages);
      lowestScore = Math.min(...allAverages);

      highestStudent = students.find(s => stats[s.id]?.avg === highestScore)?.name || "-";
      lowestStudent = students.find(s => stats[s.id]?.avg === lowestScore)?.name || "-";
    } else {
      lowestScore = 0;
    }

    const classAverage = allAverages.length > 0
      ? Math.round(allAverages.reduce((a, b) => a + b, 0) / allAverages.length)
      : 0;

    return {
      stats,
      classAverage,
      highestScore,
      lowestScore,
      highestStudent,
      lowestStudent
    };
  }, [students, grades]);

  const { classAverage, highestScore, lowestScore, highestStudent, lowestStudent, stats } = studentStats;

  const filteredStudents = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return students.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.nis.includes(query)
    );
  }, [students, searchQuery]);

  const getGradeColor = (score: number | null) => {
    if (score === null || score === 0) return "text-slate-400";
    if (score >= 85) return "text-green-600 font-bold";
    if (score >= 70) return "text-blue-600 font-bold";
    if (score >= 60) return "text-yellow-600 font-bold";
    return "text-red-600 font-bold";
  };

  const getGradeBg = (score: number | null) => {
    if (score === null || score === 0) return "bg-slate-50 dark:bg-slate-800/50";
    if (score >= 85) return "bg-green-50 dark:bg-green-900/20";
    if (score >= 70) return "bg-blue-50 dark:bg-blue-900/20";
    if (score >= 60) return "bg-yellow-50 dark:bg-yellow-900/20";
    return "bg-red-50 dark:bg-red-900/20";
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'quiz': return 'Auto-grade';
      case 'assignment': return 'Tugas';
      case 'project': return 'Proyek';
      case 'exam': return 'Ujian';
      case 'presentation': return 'Presentasi';
      case 'offline': return 'Offline';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'quiz': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'exam': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'project': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'presentation': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'offline': return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const handleCellClick = (studentId: string, assignmentId: string, currentScore: number | null) => {
    setEditingCell({ studentId, assignmentId });
    setEditValue(currentScore !== null ? currentScore.toString() : "");
  };

  const handleSaveEdit = () => {
    if (editingCell) {
      const numValue = editValue === "" ? null : parseInt(editValue, 10);
      if (numValue === null || (!isNaN(numValue) && numValue >= 0 && numValue <= 100)) {
        updateGrade(editingCell.studentId as any, editingCell.assignmentId, numValue);
      }
      setEditingCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <Link to="/teacher-dashboard" className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </Link>
            Buku Nilai
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 ml-2 sm:ml-11 text-sm sm:text-base">
            Kelola dan pantau nilai siswa
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 flex items-center gap-2 text-sm sm:text-base shadow-sm shadow-blue-200 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Tambah Kolom</span>
          </button>
          <button className="px-3 sm:px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-sm sm:text-base shadow-sm transition-all">
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filter</span>
          </button>
          <button className="px-3 sm:px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-sm sm:text-base shadow-sm transition-all">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Ekspor CSV</span>
          </button>
        </div>
      </div>

      {/* Add Assignment Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tambah Kolom Nilai</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddAssignment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Judul Tugas/Aktivitas</label>
                <input
                  type="text"
                  required
                  value={newAssignment.title}
                  onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  placeholder="Contoh: Ujian Harian 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipe Aktivitas</label>
                <select
                  value={newAssignment.type}
                  onChange={(e) => setNewAssignment({ ...newAssignment, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="assignment">Tugas (Assignment)</option>
                  <option value="quiz">Kuis (Quiz)</option>
                  <option value="project">Proyek (Project)</option>
                  <option value="exam">Ujian (Exam)</option>
                  <option value="presentation">Presentasi (Presentation)</option>
                  <option value="offline">Aktivitas Offline (Offline)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Skor Maksimal</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newAssignment.maxScore}
                    onChange={(e) => setNewAssignment({ ...newAssignment, maxScore: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanggal</label>
                  <input
                    type="text"
                    value={newAssignment.date}
                    onChange={(e) => setNewAssignment({ ...newAssignment, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    placeholder="Contoh: 12 Okt"
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm">Rata-rata Kelas</span>
            <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-200">{classAverage}%</div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm">Tertinggi</span>
            <div className="w-8 h-8 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-200">{highestScore}</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{highestStudent}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm">Terendah</span>
            <div className="w-8 h-8 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-200">{lowestScore}</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{lowestStudent}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm">Raport</span>
            <div className="w-8 h-8 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-200">0</div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Belum digenerate</p>
        </div>
      </div>

      {/* Main Gradebook Table Area */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden flex flex-col">

        {/* Toolbar */}
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari siswa atau NIS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-colors text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">Tampilkan:</span>
            <select className="text-sm border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 focus:ring-blue-500 py-1.5 pl-3 pr-8 text-slate-900 dark:text-white">
              <option>Semua Tugas</option>
              <option>Kuis Saja</option>
              <option>Esai Saja</option>
              <option>Proyek Saja</option>
            </select>
          </div>
        </div>

        {/* Table Container - Horizontal Scroll for many assignments */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <th className="p-4 font-bold text-slate-700 dark:text-slate-400 text-sm sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] w-64">
                  Siswa
                </th>
                <th className="p-4 font-bold text-slate-700 dark:text-slate-400 text-sm text-center w-24">
                  Total Skor
                </th>
                <th className="p-4 font-bold text-slate-700 dark:text-slate-400 text-sm text-center w-24">
                  Rata-rata
                </th>
                {assignments.map(assignment => (
                  <th key={assignment.id} className="p-4 font-bold text-slate-700 dark:text-slate-400 text-sm text-center min-w-[140px]">
                    <div className="flex flex-col items-center">
                      <span className="truncate w-full" title={assignment.title}>{assignment.title}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-normal mt-0.5">{assignment.date} • {assignment.maxScore} pts</span>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full mt-1", getTypeColor(assignment.type))}>
                        {getTypeLabel(assignment.type)}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="p-4 w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredStudents.map(student => {
                const studentStat = stats[student.id];
                const avg = studentStat?.avg ?? 0;
                const total = studentStat?.total ?? 0;
                return (
                  <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors group">
                    <td className="p-4 sticky left-0 bg-white dark:bg-slate-800 group-hover:bg-slate-50/50 dark:group-hover:bg-slate-700/30 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`} alt={student.name} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{student.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{student.nis}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-300">
                      {total}
                    </td>
                    <td className="p-4 text-center">
                      <span className={cn("inline-flex items-center justify-center w-12 h-8 rounded-lg text-sm font-bold", getGradeBg(avg), getGradeColor(avg))}>
                        {avg}%
                      </span>
                    </td>
                    {assignments.map(assignment => {
                      const score = grades[student.id]?.[assignment.id] ?? null;
                      const isEditing = editingCell?.studentId === (student.id as any) && editingCell?.assignmentId === assignment.id;

                      return (
                        <td key={assignment.id} className="p-4 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-16 px-2 py-1 text-center border-2 border-blue-500 rounded-md text-sm focus:outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                              />
                              <button onClick={handleSaveEdit} className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded">
                                <Save className="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditingCell(null)} className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div
                              className="relative group/cell inline-flex items-center justify-center w-16 h-8 rounded-md cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                              onClick={() => handleCellClick(student.id as any, assignment.id, score?.score ?? null)}
                            >
                              {score && score.score !== null ? (
                                <span className={cn("text-sm", getGradeColor(score.score))}>{score.score}</span>
                              ) : (
                                <span className="text-sm text-slate-300 dark:text-slate-600">-</span>
                              )}
                              <div className="absolute inset-0 bg-slate-200/50 dark:bg-slate-600/50 rounded-md opacity-0 group-hover/cell:opacity-100 flex items-center justify-center transition-opacity">
                                <Edit2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-4 text-right">
                      <button className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={assignments.length + 4} className="p-8">
                    <EmptyState
                      icon={<Users className="w-12 h-12" />}
                      title="Belum ada siswa"
                      description="Siswa akan muncul setelah mereka bergabung ke kelas."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
