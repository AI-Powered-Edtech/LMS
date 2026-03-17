import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Users,
  BookOpen,
  GraduationCap,
  FileCheck,
  ClipboardCheck,
  Activity,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Loader2,
  LayoutGrid,
  Clock,
  BarChart,
  PieChart
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { cn } from '@/src/utils/cn';
import { useTenant } from '@/src/contexts/TenantContext';
import {
  analyticsService,
  TenantAnalyticsData,
  CourseEngagement,
  ActivityTimePoint
} from '@/src/services/analyticsService';

// Color palette for charts
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: string;
  bgColor: string;
}

function MetricCard({ title, value, icon: Icon, trend, color, bgColor }: MetricCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', bgColor)}>
          <Icon className={cn('w-6 h-6', color)} />
        </div>
        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 text-sm font-medium',
              trend.isPositive ? 'text-emerald-600' : 'text-red-600'
            )}
          >
            <TrendingUp className={cn('w-4 h-4', !trend.isPositive && 'rotate-180')} />
            <span>{trend.value}%</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <p className="text-3xl font-bold text-slate-900 mt-1">
          {typeof value === 'number' ? value.toLocaleString('id-ID') : value}
        </p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      <p className="mt-4 text-slate-500 font-medium">Memuat data analitik...</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
        <BarChart3 className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">Belum Ada Data</h3>
      <p className="mt-2 text-slate-500 text-center max-w-md">
        Data analitik akan muncul setelah ada aktivitas pembelajaran di platform.
        Pastikan siswa telah enroll dan menyelesaikan lesson.
      </p>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">Terjadi Kesalahan</h3>
      <p className="mt-2 text-slate-500 text-center max-w-md">{message}</p>
      <button
        onClick={onRetry}
        className="mt-6 px-6 py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Coba Lagi
      </button>
    </div>
  );
}

interface ActivityTimelineChartProps {
  data: ActivityTimePoint[];
}

function ActivityTimelineChart({ data }: ActivityTimelineChartProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <Activity className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Aktivitas Waktu</h3>
          <p className="text-sm text-slate-500">Aktivitas pembelajaran 14 hari terakhir</p>
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#94A3B8"
              fontSize={12}
            />
            <YAxis stroke="#94A3B8" fontSize={12} />
            <Tooltip
              labelFormatter={formatDate}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="lessonCompletions"
              name="Lesson Selesai"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ fill: '#3B82F6', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="quizAttempts"
              name="Quiz Dicoba"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ fill: '#10B981', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="assignmentSubmissions"
              name="Tugas Dikumpulkan"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={{ fill: '#F59E0B', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface CourseEngagementChartProps {
  data: CourseEngagement[];
}

function CourseEngagementChart({ data }: CourseEngagementChartProps) {
  const chartData = data.slice(0, 6).map((course) => ({
    name: course.courseName.length > 20 
      ? course.courseName.substring(0, 20) + '...' 
      : course.courseName,
    students: course.enrolled,
    active: course.activeStudents,
    progress: course.avgProgress
  }));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Engagement per Kursus</h3>
          <p className="text-sm text-slate-500">Perbandingan enrollment dan aktivitas</p>
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis type="number" stroke="#94A3B8" fontSize={12} />
            <YAxis
              dataKey="name"
              type="category"
              width={120}
              stroke="#94A3B8"
              fontSize={11}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />
            <Legend />
            <Bar dataKey="students" name="Terenroll" fill="#3B82F6" radius={[0, 4, 4, 0]} />
            <Bar dataKey="active" name="Aktif" fill="#10B981" radius={[0, 4, 4, 0]} />
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface StudentParticipationChartProps {
  totalEnrolled: number;
  activeStudents: number;
}

function StudentParticipationChart({ totalEnrolled, activeStudents }: StudentParticipationChartProps) {
  const inactiveStudents = Math.max(0, totalEnrolled - activeStudents);
  
  const data = [
    { name: 'Aktif', value: activeStudents, color: '#10B981' },
    { name: 'Tidak Aktif', value: inactiveStudents, color: '#94A3B8' }
  ];

  const participationRate = totalEnrolled > 0 
    ? Math.round((activeStudents / totalEnrolled) * 100) 
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
          <Users className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Partisipasi Siswa</h3>
          <p className="text-sm text-slate-500">Rasio siswa aktif vs total</p>
        </div>
      </div>
      <div className="h-72 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
      <div className="text-center mt-4">
        <p className="text-2xl font-bold text-slate-900">{participationRate}%</p>
        <p className="text-sm text-slate-500">Tingkat Partisipasi</p>
      </div>
    </div>
  );
}

export function AdminAnalyticsDashboard() {
  const { tenant } = useTenant();
  const [data, setData] = useState<TenantAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAnalytics = useCallback(async () => {
    if (!tenant?.id) return;

    try {
      setError(null);
      const analyticsData = await analyticsService.getTenantAnalytics(tenant.id);
      setData(analyticsData);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setError(err instanceof Error ? err.message : 'Gagal memuat data analitik. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [tenant?.id]);

  useEffect(() => {
    if (tenant?.id) {
      loadAnalytics();
    }
  }, [tenant?.id, loadAnalytics]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadAnalytics();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <LoadingState />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <ErrorState message={error} onRetry={handleRefresh} />
      </div>
    );
  }

  // Empty state - no data
  if (!data || (data.overview.totalCourses === 0 && data.overview.totalEnrolled === 0)) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <EmptyState />
      </div>
    );
  }

  const { overview, activityMetrics, courseEngagement, activityTimeline } = data;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            Dashboard Analitik
          </h1>
          <p className="text-slate-500 mt-1">
            Pantau aktivitas pembelajaran di seluruh organisasi
          </p>
        </div>
        <div className="flex items-center gap-3">
          {overview.lastRefreshedAt && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Clock className="w-4 h-4" />
              <span>Update: {new Date(overview.lastRefreshedAt).toLocaleString('id-ID')}</span>
            </div>
          )}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            {isRefreshing ? 'Memperbarui...' : 'Perbarui'}
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Total Siswa Terenroll"
          value={overview.totalEnrolled}
          icon={Users}
          color="text-blue-600"
          bgColor="bg-blue-100"
        />
        <MetricCard
          title="Siswa Aktif (7 Hari)"
          value={overview.activeStudents}
          icon={Activity}
          color="text-emerald-600"
          bgColor="bg-emerald-100"
        />
        <MetricCard
          title="Total Kursus"
          value={overview.totalCourses}
          icon={BookOpen}
          color="text-purple-600"
          bgColor="bg-purple-100"
        />
        <MetricCard
          title="Kursus Berjalan"
          value={overview.coursesRunning}
          icon={GraduationCap}
          color="text-amber-600"
          bgColor="bg-amber-100"
        />
        <MetricCard
          title="Tugas Dikumpulkan"
          value={activityMetrics.assignmentSubmissions}
          icon={FileCheck}
          color="text-cyan-600"
          bgColor="bg-cyan-100"
        />
        <MetricCard
          title="Quiz Dicoba"
          value={activityMetrics.quizAttempts}
          icon={ClipboardCheck}
          color="text-rose-600"
          bgColor="bg-rose-100"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityTimelineChart data={activityTimeline} />
        <CourseEngagementChart data={courseEngagement} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StudentParticipationChart
          totalEnrolled={overview.totalEnrolled}
          activeStudents={overview.activeStudents}
        />
        
        {/* Summary Stats */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Ringkasan</h3>
              <p className="text-sm text-slate-500">Metrik tambahan</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span className="text-slate-700">Rata-rata Progres</span>
              </div>
              <span className="text-xl font-bold text-slate-900">{overview.avgProgress}%</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <BarChart className="w-5 h-5 text-emerald-600" />
                <span className="text-slate-700">Rata-rata Quiz Score</span>
              </div>
              <span className="text-xl font-bold text-slate-900">{overview.avgQuizScore}%</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-purple-600" />
                <span className="text-slate-700">Total Event (30 Hari)</span>
              </div>
              <span className="text-xl font-bold text-slate-900">{activityMetrics.totalEvents.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <FileCheck className="w-5 h-5 text-amber-600" />
                <span className="text-slate-700">Lesson Selesai</span>
              </div>
              <span className="text-xl font-bold text-slate-900">{activityMetrics.lessonCompletions.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
