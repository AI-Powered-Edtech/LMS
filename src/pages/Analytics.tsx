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
  CheckCircle,
  Clock,
  Filter,
  ArrowUpDown,
  Eye,
  MousePointerClick,
  FileText,
  Globe,
  Sparkles,
  Bot,
  Send
} from "lucide-react";
import { cn } from "@/src/utils/cn";
import { motion, AnimatePresence } from "motion/react";
// TODO: AI analytics will be routed through backend API (Phase 5)
import { useNotifications } from "@/src/contexts/NotificationContext";
import { fetchStudents, StudentData } from "@/src/services/studentService";

const radarData = [
  { subject: "Matematika", A: 120, B: 110, fullMark: 150 },
  { subject: "Sains", A: 98, B: 130, fullMark: 150 },
  { subject: "Bahasa", A: 86, B: 130, fullMark: 150 },
  { subject: "Sejarah", A: 99, B: 100, fullMark: 150 },
  { subject: "Seni", A: 85, B: 90, fullMark: 150 },
  { subject: "Olahraga", A: 65, B: 85, fullMark: 150 },
];

interface AIInsight {
  riskLevel: "Low" | "Medium" | "High";
  reason: string;
  recommendation: string;
}

export function Analytics() {
  const [filter, setFilter] = useState("Semua");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsights, setAiInsights] = useState<Record<number, AIInsight>>({});
  const [studentData, setStudentData] = useState<StudentData[]>([]);
  const { sendNotification } = useNotifications();

  useEffect(() => {
    fetchStudents().then(setStudentData);
  }, []);

  const filteredStudents = studentData.filter(
    (s) => filter === "Semua" || s.status === filter,
  );

  const handleAnalyzeWithAI = async () => {
    setIsAnalyzing(true);
    try {
      // TODO: Route through backend API in Phase 5
      // POST /api/ai/analyze-students with student data
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert("⚠️ Fitur AI Analytics sedang dalam proses migrasi ke backend API. Akan tersedia di update berikutnya.");
    } catch (error) {
      console.error("AI Analysis failed:", error);
      alert("Gagal melakukan analisis AI.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendMessage = (studentName: string) => {
    alert(`Pesan intervensi dikirim ke ${studentName}`);
    // In a real app, this would open a chat or send a message
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Dasbor Analitik Visual
          </h1>
          <p className="text-slate-500 mt-2">
            Pantau perkembangan siswa secara real-time.
          </p>
        </div>
        <button
          onClick={handleAnalyzeWithAI}
          disabled={isAnalyzing}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white transition-all shadow-md hover:shadow-lg",
            isAnalyzing ? "bg-slate-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
          )}
        >
          {isAnalyzing ? (
            <>
              <Clock className="w-5 h-5 animate-spin" />
              Menganalisis...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Analisis Risiko AI
            </>
          )}
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Radar Chart */}
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-6">
            Skill Gap Analysis
          </h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 150]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  name="Kelas A"
                  dataKey="A"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.5}
                />
                <Radar
                  name="Kelas B"
                  dataKey="B"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.5}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "16px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  }}
                  itemStyle={{ fontWeight: "bold" }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm font-medium text-slate-600">
                Kelas A
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-slate-600">
                Kelas B
              </span>
            </div>
          </div>
        </div>

        {/* Predictive Risk Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">
              Predictive Risk Table
            </h2>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-medium"
              >
                <option value="Semua">Semua Status</option>
                <option value="Aman">Aman</option>
                <option value="Pemantauan">Pemantauan</option>
                <option value="Kritis">Kritis</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left text-slate-500">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-4 font-bold flex items-center gap-2 cursor-pointer hover:text-blue-600"
                  >
                    Nama Siswa <ArrowUpDown className="w-4 h-4" />
                  </th>
                  <th scope="col" className="px-6 py-4 font-bold">
                    Skor Rata-rata
                  </th>
                  <th scope="col" className="px-6 py-4 font-bold">
                    Terakhir Aktif
                  </th>
                  <th scope="col" className="px-6 py-4 font-bold">
                    Status Risiko
                  </th>
                  <th scope="col" className="px-6 py-4 font-bold text-right">
                    Audit Log
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const isKritis = student.status === "Kritis";
                  const isAman = student.status === "Aman";
                  const isPemantauan = student.status === "Pemantauan";
                  const isExpanded = expandedRow === student.id;
                  const insight = aiInsights[student.id];

                  return (
                    <React.Fragment key={student.id}>
                      <tr
                        className={cn(
                          "border-b border-slate-100 hover:bg-slate-50 transition-colors",
                          isKritis && !isExpanded &&
                          "bg-red-50/50 hover:bg-red-50 animate-pulse-slow",
                          isExpanded && "bg-blue-50/30"
                        )}
                      >
                        <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                          {student.name}
                        </td>
                        <td className="px-6 py-4 font-medium">
                          {student.score}%
                        </td>
                        <td className="px-6 py-4 flex items-center gap-2 text-slate-500">
                          <Clock className="w-4 h-4" />
                          {student.lastActive}
                        </td>
                        <td className="px-6 py-4">
                          <div
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-full w-max font-bold text-xs",
                              isAman && "bg-green-100 text-green-700",
                              isPemantauan && "bg-yellow-100 text-yellow-700",
                              isKritis &&
                              "bg-red-100 text-red-700 border border-red-200",
                            )}
                          >
                            {isAman && <CheckCircle className="w-4 h-4" />}
                            {isPemantauan && (
                              <AlertTriangle className="w-4 h-4" />
                            )}
                            {isKritis && (
                              <AlertTriangle className="w-4 h-4 fill-current" />
                            )}
                            {student.status}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setExpandedRow(isExpanded ? null : student.id)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
                              <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3 shadow-sm">
                                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                                    <FileText className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Durasi Baca PDF</p>
                                    <p className="text-lg font-black text-slate-800">{student.readTime}</p>
                                  </div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3 shadow-sm">
                                  <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center shrink-0">
                                    <MousePointerClick className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Interaksi</p>
                                    <p className="text-lg font-black text-slate-800">{student.clicks} Klik</p>
                                  </div>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3 shadow-sm">
                                  <div className="w-10 h-10 bg-slate-200 text-slate-600 rounded-lg flex items-center justify-center shrink-0">
                                    <Globe className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">IP Address Terakhir</p>
                                    <p className="text-sm font-mono font-bold text-slate-700 mt-1">{student.ipAddress}</p>
                                  </div>
                                </div>
                              </div>

                              {insight && (
                                <div className="mt-4 bg-indigo-50 border border-indigo-200 p-4 rounded-xl">
                                  <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                                      <Bot className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-indigo-900 text-sm mb-1">Analisis AI Gemini</h4>
                                      <p className="text-sm text-indigo-800 mb-2">
                                        <strong>Risiko:</strong> {insight.riskLevel}
                                      </p>
                                      <p className="text-sm text-slate-600 mb-2">
                                        {insight.reason}
                                      </p>
                                      <div className="bg-white/50 p-2 rounded-lg border border-indigo-100 text-xs font-medium text-indigo-700">
                                        💡 Rekomendasi: {insight.recommendation}
                                      </div>
                                      <div className="flex gap-2 mt-3">
                                        <button className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors">
                                          Assign Extra Practice
                                        </button>
                                        <button
                                          onClick={() => handleSendMessage(student.name)}
                                          className="text-xs font-bold bg-white border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-1"
                                        >
                                          <Send className="w-3 h-3" />
                                          Send Message
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {isKritis && !insight && (
                                <div className="mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-3">
                                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                  <p><strong>Peringatan Sistem:</strong> Siswa ini tercatat "Hadir" namun memiliki durasi baca dan interaksi yang sangat rendah. Indikasi kemungkinan tidak aktif belajar (idle).</p>
                                </div>
                              )}
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
