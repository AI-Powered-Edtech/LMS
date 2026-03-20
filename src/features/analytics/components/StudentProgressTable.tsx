import { Users } from 'lucide-react';
import { Card, Skeleton, Badge, EmptyState } from '@/src/components/ui';
import { cn } from '@/src/utils/cn';
import { formatTime, formatPct, relativeTime, struggleColor, pctBgColor } from '../utils/formatters';
import type { StudentSignal, EngagementSegment } from '../types';
import { StudentEngagementCard } from './StudentEngagementCard';

interface StudentProgressTableProps {
    data: StudentSignal[];
    isLoading: boolean;
    lessonTitle?: string;
}

export function StudentProgressTable({ data, isLoading, lessonTitle }: StudentProgressTableProps) {
    if (isLoading) {
        return (
            <Card padding="none">
                <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-700/60">
                    <Skeleton className="h-5 w-56" />
                </div>
                <div className="p-4 space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
            </Card>
        );
    }

    if (data.length === 0) {
        return (
            <Card>
                <EmptyState
                    icon={<Users className="h-12 w-12" />}
                    title="Belum ada data siswa"
                    description={
                        lessonTitle
                            ? `Belum ada siswa yang mengakses pelajaran "${lessonTitle}".`
                            : 'Pilih pelajaran untuk melihat data siswa.'
                    }
                />
            </Card>
        );
    }

    return (
        <Card padding="none">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-slate-400">
                        <tr>
                            <th className="px-6 py-3 font-bold">Nama</th>
                            <th className="px-4 py-3 font-bold text-center">Sesi</th>
                            <th className="px-4 py-3 font-bold text-center">Waktu</th>
                            <th className="px-4 py-3 font-bold text-center">Progress</th>
                            <th className="px-4 py-3 font-bold text-center">Video</th>
                            <th className="px-4 py-3 font-bold text-center">Struggle</th>
                            <th className="px-4 py-3 font-bold text-center">Engagement</th>
                            <th className="px-4 py-3 font-bold text-center">Terakhir Aktif</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((student) => {
                            const sc = struggleColor(student.struggle_score);
                            const progressPct = student.blocks_total > 0
                                ? Math.round((student.blocks_viewed / student.blocks_total) * 100)
                                : 0;

                            return (
                                <tr
                                    key={`${student.user_id}-${student.lesson_id}`}
                                    className="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-700/40 dark:hover:bg-slate-800/50"
                                >
                                    <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-100">
                                        {student.student_name}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {student.session_count}
                                    </td>
                                    <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400">
                                        {formatTime(student.total_time_spent)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                                {student.blocks_viewed}/{student.blocks_total}
                                            </span>
                                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                                <div
                                                    className={cn('h-full rounded-full transition-all', pctBgColor(progressPct))}
                                                    style={{ width: `${Math.min(progressPct, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400">
                                        {formatPct(student.max_video_pct)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <Badge
                                            variant={
                                                student.struggle_score >= 5
                                                    ? 'danger'
                                                    : student.struggle_score >= 3
                                                      ? 'warning'
                                                      : 'success'
                                            }
                                            size="sm"
                                        >
                                            {sc.label}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <StudentEngagementCard
                                            score={student.engagement_score}
                                            segment={student.engagement_segment as EngagementSegment | null | undefined}
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-center text-xs text-slate-500 dark:text-slate-400">
                                        {relativeTime(student.last_accessed_at)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
