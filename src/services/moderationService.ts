import { supabase } from '../lib/supabase';

export type ReportStatus = 'pending' | 'approved' | 'rejected';
export type ReportReason = 'ai_generated' | 'inappropriate' | 'spam' | 'harassment' | 'other';
export type ContentType = 'post' | 'comment' | 'assignment' | 'user';

export interface Report {
    id: string;
    contentId: string;
    contentType: ContentType;
    reporterId: string;
    reporterName: string;
    reason: ReportReason;
    description: string;
    status: ReportStatus;
    timestamp: string;
    contentSnippet?: string;
    contentAuthor?: string;
}

/**
 * Moderation service.
 * NOTE: Currently uses mock data matching the original ModerationContext.
 * TODO: Replace with Supabase queries when moderation tables are ready.
 */
export const moderationService = {
    /**
     * Fetch all reports.
     * When DB-backed: query from `content_reports` table.
     */
    async fetchReports(): Promise<Report[]> {
        // Mock data — will be replaced with Supabase query
        return [
            {
                id: 'r1',
                contentId: 'c1',
                contentType: 'comment',
                reporterId: 'u2',
                reporterName: 'Budi Santoso',
                reason: 'ai_generated',
                description: 'Jawaban ini terlihat sangat robotik dan menggunakan frasa yang tidak wajar.',
                status: 'pending',
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
                contentSnippet: 'Secara matematis, ini menggunakan aturan rantai kalkulus...',
                contentAuthor: 'Pak Andi',
            },
            {
                id: 'r2',
                contentId: 'p2',
                contentType: 'post',
                reporterId: 'u3',
                reporterName: 'Rina',
                reason: 'spam',
                description: 'Promosi layanan joki tugas.',
                status: 'pending',
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
                contentSnippet: 'Jasa kerjakan tugas matematika murah meriah...',
                contentAuthor: 'Anonim',
            },
        ];
    },

    /**
     * Submit a new content report.
     */
    async submitReport(report: Omit<Report, 'id' | 'status' | 'timestamp' | 'reporterId' | 'reporterName'>, userId: string, userName: string): Promise<Report> {
        // TODO: Insert into Supabase `content_reports` table
        return {
            ...report,
            id: Math.random().toString(36).substr(2, 9),
            status: 'pending',
            timestamp: new Date().toISOString(),
            reporterId: userId,
            reporterName: userName,
        };
    },

    /**
     * Resolve a report (approve or reject).
     */
    async resolveReport(reportId: string, status: 'approved' | 'rejected'): Promise<void> {
        // TODO: Update in Supabase `content_reports` table
        // await supabase.from('content_reports').update({ status }).eq('id', reportId);
    },
};
