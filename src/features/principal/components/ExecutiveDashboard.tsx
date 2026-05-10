// ==========================================================================
// ExecutiveDashboard — Principal Executive Dashboard
// Halaman utama kepala sekolah: adoption metrics, academic performance, ROI
// ==========================================================================

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

import { useExecutiveData, useSurveys } from "../hooks/useExecutiveData";
import { ReportGenerator } from "./ReportGenerator";
import { ReportScheduler } from "./ReportScheduler";

// ── Formatters ─────────────────────────────────────────────────

const fmtNumber = (n: number) =>
  new Intl.NumberFormat("id-ID").format(Math.round(n));

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

const fmtPercent = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n) + "%";

// ── Metric Card ────────────────────────────────────────────────

interface MetricCardProps {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  badgeText?: string;
  badgeVariant?: "success" | "warning" | "info" | "neutral" | "danger";
  color: string;
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  badgeText,
  badgeVariant = "neutral",
  color,
}: MetricCardProps) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <div className={`text-2xl p-2 rounded-xl ${color}`}>{icon}</div>
        {badgeText && (
          <Badge variant={badgeVariant} size="sm">
            {badgeText}
          </Badge>
        )}
      </div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-none">
        {value}
      </p>
      {sub && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>
      )}
    </Card>
  );
}

// ── Skeleton Cards ─────────────────────────────────────────────

function MetricCardsSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i} lines={2} />
      ))}
    </>
  );
}

// ── Trend Chart ────────────────────────────────────────────────

interface TrendChartProps {
  data: Array<{
    month: string;
    active_students: number;
    lesson_completions: number;
    quiz_attempts: number;
  }>;
  isDark: boolean;
}

function TrendChart({ data, isDark }: TrendChartProps) {
  const { t } = useTranslation();
  const gridColor = isDark ? "#334155" : "#e2e8f0";
  const tickColor = isDark ? "#94a3b8" : "#64748b";
  const tooltipBg = isDark ? "#1e293b" : "#ffffff";
  const tooltipBorder = isDark ? "#334155" : "#e2e8f0";
  const tooltipText = isDark ? "#f1f5f9" : "#0f172a";

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 dark:text-slate-500">
        <p className="text-sm">{t("executiveDashboard.trend.empty")}</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: tickColor }}
          axisLine={{ stroke: gridColor }}
          tickLine={{ stroke: gridColor }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: tickColor }}
          axisLine={{ stroke: gridColor }}
          tickLine={{ stroke: gridColor }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            borderRadius: "0.5rem",
            color: tooltipText,
            fontSize: 12,
          }}
          labelStyle={{
            color: isDark ? "#94a3b8" : "#64748b",
            marginBottom: 4,
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: tickColor, paddingTop: 8 }}
          formatter={(value) => {
            const labels: Record<string, string> = {
              active_students: t("executiveDashboard.trend.activeStudents"),
              lesson_completions: t(
                "executiveDashboard.trend.lessonCompletions",
              ),
              quiz_attempts: t("executiveDashboard.trend.quizAttempts"),
            };
            return labels[value] ?? value;
          }}
        />
        <Line
          type="monotone"
          dataKey="active_students"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="lesson_completions"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="quiz_attempts"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── ROI Calculator Card ────────────────────────────────────────

interface ROICardProps {
  paperSheets: number;
  paperCost: number;
  teacherHours: number;
  adoptionScore: number;
}

function ROICard({
  paperSheets,
  paperCost,
  teacherHours,
  adoptionScore,
}: ROICardProps) {
  const { t } = useTranslation();
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">💰</span>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
          {t("executiveDashboard.roi.title")}
        </h3>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30">
          <span className="text-lg mt-0.5">📄</span>
          <div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              ~{fmtNumber(paperSheets)}{" "}
              {t("executiveDashboard.roi.sheetsSaved")}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              {t("executiveDashboard.roi.paperEquivalent").replace(
                "__VALUE__",
                fmtCurrency(paperCost),
              )}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
          <span className="text-lg mt-0.5">⏱️</span>
          <div>
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
              ~{teacherHours.toFixed(1)}{" "}
              {t("executiveDashboard.roi.hoursEfficient")}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {t("executiveDashboard.roi.digitalGrading")}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/30">
          <div>
            <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">
              {t("executiveDashboard.roi.digitalAdoptionScore")}
            </p>
            <p className="text-lg font-bold text-violet-800 dark:text-violet-300">
              {fmtNumber(adoptionScore)}
              <span className="text-sm font-normal text-violet-600 dark:text-violet-400">
                /100
              </span>
            </p>
          </div>
          <div className="w-16 h-16 relative flex items-center justify-center">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke={adoptionScore > 70 ? "#7c3aed" : "#94a3b8"}
                strokeOpacity="0.2"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="#7c3aed"
                strokeWidth="3"
                strokeDasharray={`${adoptionScore} 100`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-xs font-bold text-violet-700 dark:text-violet-300">
              {Math.round(adoptionScore)}%
            </span>
          </div>
        </div>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="text-violet-600 dark:text-violet-400 w-full justify-center"
      >
        {t("executiveDashboard.roi.viewDetail")}
      </Button>
    </Card>
  );
}

// ── Academic Overview Card ─────────────────────────────────────

interface AcademicCardProps {
  avgScore: number;
  totalStudents: number;
  activeStudents: number;
  onViewAnalytics?: () => void;
}

function AcademicCard({
  avgScore,
  totalStudents,
  activeStudents,
  onViewAnalytics,
}: AcademicCardProps) {
  const { t } = useTranslation();
  const passRate = avgScore >= 70 ? Math.min(95, avgScore + 5) : avgScore * 0.8;
  const needsAttention = Math.max(0, totalStudents - activeStudents);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-xl">📊</span>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
          {t("executiveDashboard.academic.title")}
        </h3>
      </div>

      <div className="space-y-4">
        {/* Average Score */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {t("executiveDashboard.academic.avgScore")}
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {fmtNumber(avgScore)}/100
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                avgScore >= 75
                  ? "bg-emerald-500"
                  : avgScore >= 60
                    ? "bg-amber-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${Math.min(100, avgScore)}%` }}
            />
          </div>
        </div>

        {/* Projected Pass Rate */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {t("executiveDashboard.academic.projectedPassRate")}
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {fmtPercent(passRate)}
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, passRate)}%` }}
            />
          </div>
        </div>

        {/* At-risk Students */}
        <div
          className={`flex items-center justify-between p-3 rounded-xl ${
            needsAttention > 0
              ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30"
              : "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30"
          }`}
        >
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("executiveDashboard.academic.needsAttention")}
            </p>
            <p
              className={`text-lg font-bold ${
                needsAttention > 0
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-emerald-700 dark:text-emerald-300"
              }`}
            >
              {fmtNumber(needsAttention)}{" "}
              {t("executiveDashboard.units.students")}
            </p>
          </div>
          {needsAttention > 0 && (
            <button
              onClick={onViewAnalytics}
              className="text-xs text-amber-600 dark:text-amber-400 underline underline-offset-2 hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
            >
              {t("executiveDashboard.academic.viewAnalytics")}
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── Quick Actions ──────────────────────────────────────────────

interface QuickAction {
  icon: string;
  label: string;
  description: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "ghost";
}

function QuickActions({ actions }: { actions: QuickAction[] }) {
  const { t } = useTranslation();
  return (
    <Card>
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4">
        {t("executiveDashboard.quickActions.title")}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className="flex flex-col items-start gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 text-left group"
          >
            <span className="text-2xl">{action.icon}</span>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                {action.label}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {action.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}

// ── Empty State ────────────────────────────────────────────────

function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <span className="text-5xl">📊</span>
      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          {t("executiveDashboard.empty.title")}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
          {t("executiveDashboard.empty.description")}
        </p>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────

export function ExecutiveDashboard() {
  const { t } = useTranslation();
  const { profile, activeTenant } = useAuth();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const isDark = resolvedTheme === "dark";
  const [_showSettingsModal, setShowSettingsModal] = useState(false);
  const [showReportGenerator, setShowReportGenerator] = useState(false);
  const [showReportScheduler, setShowReportScheduler] = useState(false);

  const { overview, monthlyTrend, roiMetrics, settings, isLoading } =
    useExecutiveData();
  const { surveys } = useSurveys();

  const schoolName =
    settings?.school_name ??
    activeTenant?.name ??
    t("executiveDashboard.defaults.school");
  const academicYear =
    settings?.academic_year ?? t("executiveDashboard.defaults.academicYear");

  const userName = profile
    ? `${profile.first_name} ${profile.last_name}`.trim()
    : t("executiveDashboard.defaults.principal");

  // Metric cards data
  const metricCards = useMemo<MetricCardProps[]>(() => {
    if (!overview) return [];

    const studentPct =
      overview.total_students > 0
        ? (overview.active_students / overview.total_students) * 100
        : 0;
    const teacherPct =
      overview.total_teachers > 0
        ? (overview.active_teachers / overview.total_teachers) * 100
        : 0;

    return [
      {
        icon: "🎓",
        label: t("executiveDashboard.metrics.activeStudents"),
        value: fmtNumber(overview.active_students),
        sub: t("executiveDashboard.metrics.studentsSub")
          .replace("__ACTIVE__", fmtNumber(overview.active_students))
          .replace("__TOTAL__", fmtNumber(overview.total_students)),
        badgeText: fmtPercent(studentPct),
        badgeVariant:
          studentPct >= 70
            ? "success"
            : studentPct >= 40
              ? "warning"
              : "neutral",
        color: "bg-blue-50 dark:bg-blue-900/30",
      },
      {
        icon: "👩‍🏫",
        label: t("executiveDashboard.metrics.activeTeachers"),
        value: fmtNumber(overview.active_teachers),
        sub: t("executiveDashboard.metrics.teachersSub")
          .replace("__ACTIVE__", fmtNumber(overview.active_teachers))
          .replace("__TOTAL__", fmtNumber(overview.total_teachers)),
        badgeText: fmtPercent(teacherPct),
        badgeVariant:
          teacherPct >= 70
            ? "success"
            : teacherPct >= 40
              ? "warning"
              : "neutral",
        color: "bg-violet-50 dark:bg-violet-900/30",
      },
      {
        icon: "📚",
        label: t("executiveDashboard.metrics.activeCourses"),
        value: fmtNumber(overview.total_courses),
        sub: t("executiveDashboard.metrics.publishedCourses"),
        badgeText: t("executiveDashboard.badges.active"),
        badgeVariant: overview.total_courses > 0 ? "success" : "neutral",
        color: "bg-emerald-50 dark:bg-emerald-900/30",
      },
      {
        icon: "⭐",
        label: t("executiveDashboard.metrics.avgScore"),
        value: `${fmtNumber(overview.avg_quiz_score)}/100`,
        sub: t("executiveDashboard.metrics.avgQuizScore"),
        badgeText:
          overview.avg_quiz_score >= 75
            ? t("executiveDashboard.badges.good")
            : overview.avg_quiz_score >= 60
              ? t("executiveDashboard.badges.fair")
              : t("executiveDashboard.badges.needsAttention"),
        badgeVariant:
          overview.avg_quiz_score >= 75
            ? "success"
            : overview.avg_quiz_score >= 60
              ? "warning"
              : "danger",
        color: "bg-amber-50 dark:bg-amber-900/30",
      },
    ];
  }, [overview, t]);

  const activeSurveys = surveys.filter((s) => s.status === "active");

  const quickActions: QuickAction[] = [
    {
      icon: "📥",
      label: t("executiveDashboard.quickActions.downloadMonthly"),
      description: t("executiveDashboard.quickActions.pdfExcel"),
      onClick: () => setShowReportGenerator(true),
    },
    {
      icon: "📊",
      label: t("executiveDashboard.quickActions.foundationExport"),
      description: t("executiveDashboard.quickActions.excelCsv"),
      onClick: () => setShowReportGenerator(true),
    },
    {
      icon: "⚙️",
      label: t("executiveDashboard.quickActions.dashboardSettings"),
      description: t("executiveDashboard.quickActions.displayConfig"),
      onClick: () => setShowSettingsModal(true),
    },
    {
      icon: "📋",
      label: t("executiveDashboard.quickActions.scheduleReport"),
      description: t("executiveDashboard.quickActions.autoMonthly"),
      onClick: () => setShowReportScheduler(true),
    },
    {
      icon: "📈",
      label: t("executiveDashboard.quickActions.beforeAfter"),
      description: t("executiveDashboard.quickActions.realImpact"),
      onClick: () => navigate("/app/principal/analytics"),
    },
    {
      icon: "📋",
      label: t("executiveDashboard.quickActions.manageSurvey"),
      description: t("executiveDashboard.quickActions.surveyDesc"),
      onClick: () => navigate("/app/principal/survey"),
    },
  ];

  const hasData =
    overview && (overview.total_students > 0 || overview.total_courses > 0);

  return (
    <div className="min-h-full space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>📊</span>
            <span>{t("executiveDashboard.header.title")}</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {schoolName} — {t("executiveDashboard.header.academicYear")}{" "}
            {academicYear}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info" size="sm">
            {t("executiveDashboard.header.welcome")}, {userName}
          </Badge>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <MetricCardsSkeleton />
        ) : !hasData ? (
          <div className="col-span-2 lg:col-span-4">
            <EmptyState />
          </div>
        ) : (
          metricCards.map((card) => <MetricCard key={card.label} {...card} />)
        )}
      </div>

      {/* ── Trend Chart ── */}
      {(hasData || isLoading) && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {t("executiveDashboard.trend.title")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t("executiveDashboard.trend.subtitle")}
              </p>
            </div>
          </div>
          {isLoading ? (
            <div className="h-64 animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl" />
          ) : (
            <TrendChart data={monthlyTrend} isDark={isDark} />
          )}
        </Card>
      )}

      {/* ── ROI + Academic ── */}
      {(hasData || isLoading) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ROI Card */}
          {isLoading ? (
            <SkeletonCard lines={4} />
          ) : roiMetrics ? (
            <ROICard
              paperSheets={roiMetrics.paper_saved_sheets}
              paperCost={roiMetrics.paper_saved_cost}
              teacherHours={roiMetrics.teacher_time_saved_hours}
              adoptionScore={roiMetrics.digital_adoption_score}
            />
          ) : null}

          {/* Academic Overview */}
          {isLoading ? (
            <SkeletonCard lines={4} />
          ) : overview ? (
            <AcademicCard
              avgScore={overview.avg_quiz_score}
              totalStudents={overview.total_students}
              activeStudents={overview.active_students}
            />
          ) : null}
        </div>
      )}

      {/* ── Feature Shortcuts ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Analytics card */}
        <button
          onClick={() => navigate("/app/principal/analytics")}
          className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 text-left group"
        >
          <span className="text-3xl flex-shrink-0">📈</span>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
              {t("executiveDashboard.shortcuts.analyticsTitle")}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t("executiveDashboard.shortcuts.analyticsDescription")}
            </p>
          </div>
        </button>

        {/* Survey card */}
        <button
          onClick={() => navigate("/app/principal/survey")}
          className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all duration-200 text-left group"
        >
          <span className="text-3xl flex-shrink-0">📋</span>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">
              {t("executiveDashboard.shortcuts.surveyTitle")}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {activeSurveys.length > 0
                ? t("executiveDashboard.shortcuts.activeSurveys").replace(
                    "__COUNT__",
                    String(activeSurveys.length),
                  )
                : t("executiveDashboard.shortcuts.surveyDescription")}
            </p>
          </div>
          {activeSurveys.length > 0 && (
            <Badge
              variant="success"
              size="sm"
              className="flex-shrink-0 ml-auto"
            >
              {activeSurveys.length} {t("executiveDashboard.badges.active")}
            </Badge>
          )}
        </button>
      </div>

      {/* ── Quick Actions ── */}
      <QuickActions actions={quickActions} />

      {/* ── Modals ── */}
      <ReportGenerator
        open={showReportGenerator}
        onClose={() => setShowReportGenerator(false)}
      />
      <ReportScheduler
        open={showReportScheduler}
        onClose={() => setShowReportScheduler(false)}
      />
    </div>
  );
}
