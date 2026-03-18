import { motion } from 'motion/react';
import {
  Users, Plus, Clock,
  ChevronRight, BookOpen, CheckCircle2, AlertCircle,
  FileText, BarChart3, Settings, PenTool
} from 'lucide-react';
import { cn } from '@/src/utils/cn';
import { useNavigate } from 'react-router-dom';
import { useClassroom } from '@/src/hooks/useClassroomQueries';
import { useAuth } from '@/src/contexts/AuthContext';
import { useAssignments } from '@/src/features/assignments/hooks/useAssignments';
import { navigationItems } from '@/src/config/navigation';

import { Card, Badge, Button, EmptyState, SkeletonCard } from '@/src/components/ui';

export function TeacherDashboard() {
  const { classrooms, activeClassroomId, setActiveClassroomId, loading: classroomsLoading } = useClassroom();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { assignments } = useAssignments();

  // Real pending grading count from assignments
  const pendingGradingCount = assignments.reduce((acc, a) => {
    return acc + (a.studentSubmissions || []).filter(sub => sub.status === 'submitted').length;
  }, 0);

  const alerts = [
    ...(pendingGradingCount > 0
      ? [{ id: 'grading', type: 'grading' as const, message: `${pendingGradingCount} tugas perlu dikoreksi`, urgent: true }]
      : []),
  ];

  const userName = profile ? `${profile.first_name} ${profile.last_name}`.trim() || 'Guru' : 'Guru';

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-20 sm:pb-12">
      {/* Header */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Selamat Datang, {userName}!
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Berikut adalah ringkasan kelas dan tugas Anda hari ini.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button icon={<BookOpen className="w-4 h-4" />} onClick={() => navigate('/teaching/courses')}>
              Kelola Materi
            </Button>
            <Button variant="secondary" icon={<Plus className="w-4 h-4" />} onClick={() => navigate('/creator')}>
              Buat Tugas
            </Button>
          </div>
        </div>
      </Card>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Perlu Perhatian Anda
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map(alert => (
              <Card
                key={alert.id}
                hover
                padding="md"
                className={cn(
                  alert.urgent
                    ? "bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800"
                    : "bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800"
                )}
                onClick={() => alert.type === 'grading' ? navigate('/grader') : navigate('/analytics')}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                    alert.urgent ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                  )}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className={cn("font-bold text-sm", alert.urgent ? "text-orange-900" : "text-blue-900")}>
                      {alert.message}
                    </p>
                    <p className={cn("text-xs mt-1 font-medium", alert.urgent ? "text-orange-700" : "text-blue-700")}>
                      Klik untuk mulai mengoreksi
                    </p>
                  </div>
                  <ChevronRight className={cn("w-5 h-5", alert.urgent ? "text-orange-400" : "text-blue-400")} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Class Overview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            Kelas Aktif
          </h2>
        </div>

        {classroomsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <SkeletonCard key={i} lines={3} />)}
          </div>
        ) : classrooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classrooms.map(classroom => (
              <Card key={classroom.id} padding="none" hover className="overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{classroom.name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{classroom.student_count ?? 0} Siswa</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold">
                      {classroom.name.substring(0, 2).toUpperCase()}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl">
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Siswa</p>
                      <p className="text-lg font-black text-slate-800 dark:text-white">{classroom.student_count ?? 0}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl">
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Status</p>
                      <Badge variant="success" size="sm">Aktif</Badge>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center mt-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<BarChart3 className="w-4 h-4" />}
                    onClick={() => { setActiveClassroomId(classroom.id); navigate('/analytics'); }}
                  >
                    Analytics
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setActiveClassroomId(classroom.id); navigate('/teaching/classes'); }}
                  >
                    Kelola Kelas <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState
              icon={<Users className="w-12 h-12" />}
              title="Belum ada kelas"
              description="Buat kelas pertamamu untuk mulai mengajar."
              action={{ label: "Buat Kelas", onClick: () => navigate('/teaching/classes') }}
            />
          </Card>
        )}
      </div>

      {/* Teaching Tools — top 4 from navigation config */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-500" />
            Peralatan Mengajar
          </h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/teaching')}>
            Lihat Semua <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {navigationItems
            .filter(item => item.location === 'teaching-hub' && item.roles.includes('teacher'))
            .slice(0, 4)
            .map((tool, idx) => {
              const IconComponent = tool.icon;
              return (
                <motion.button
                  key={tool.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => navigate(tool.path)}
                  className="flex items-center gap-4 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", tool.bg, tool.color)}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-400">{tool.name}</span>
                    {tool.description && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-1">{tool.description}</span>
                    )}
                  </div>
                </motion.button>
              );
            })}
        </div>
      </div>

      {/* Recent Activity — placeholder until API available */}
      <Card>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-400" />
          Aktivitas Terbaru
        </h2>
        <EmptyState
          icon={<Clock className="w-10 h-10" />}
          title="Belum ada aktivitas terbaru"
          description="Aktivitas siswa akan muncul di sini saat mereka menyelesaikan tugas dan kuis."
        />
      </Card>
    </div>
  );
}
