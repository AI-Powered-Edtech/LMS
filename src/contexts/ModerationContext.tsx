import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useToast } from './ToastContext';

export type ReportStatus = 'pending' | 'approved' | 'rejected';
export type ReportReason = 'ai_generated' | 'inappropriate' | 'spam' | 'harassment' | 'other';
export type ContentType = 'post' | 'comment' | 'assignment' | 'user';

export interface Report {
  id: string;
  contentId: string;
  contentType: ContentType;
  reporterId: string; // In a real app, this would be the user ID
  reporterName: string;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  timestamp: string;
  contentSnippet?: string; // Preview of the reported content
  contentAuthor?: string;
}

interface ModerationContextType {
  reports: Report[];
  submitReport: (report: Omit<Report, 'id' | 'status' | 'timestamp' | 'reporterId' | 'reporterName'>) => void;
  resolveReport: (reportId: string, status: 'approved' | 'rejected') => void;
  getPendingReports: () => Report[];
}

const ModerationContext = createContext<ModerationContextType | undefined>(undefined);

const INITIAL_REPORTS: Report[] = [
  {
    id: 'r1',
    contentId: 'c1',
    contentType: 'comment',
    reporterId: 'u2',
    reporterName: 'Budi Santoso',
    reason: 'ai_generated',
    description: 'Jawaban ini terlihat sangat robotik dan menggunakan frasa yang tidak wajar.',
    status: 'pending',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    contentSnippet: 'Secara matematis, ini menggunakan aturan rantai kalkulus...',
    contentAuthor: 'Pak Andi'
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
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    contentSnippet: 'Jasa kerjakan tugas matematika murah meriah...',
    contentAuthor: 'Anonim'
  }
];

export function ModerationProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>(INITIAL_REPORTS);
  const { toast } = useToast();

  const submitReport = (reportData: Omit<Report, 'id' | 'status' | 'timestamp' | 'reporterId' | 'reporterName'>) => {
    const newReport: Report = {
      ...reportData,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      timestamp: new Date().toISOString(),
      reporterId: 'current-user', // Mock
      reporterName: 'Anda', // Mock
    };
    
    setReports(prev => [newReport, ...prev]);
    toast('Laporan berhasil dikirim. Terima kasih atas bantuan Anda menjaga komunitas ini.', 'success');
  };

  const resolveReport = (reportId: string, status: 'approved' | 'rejected') => {
    setReports(prev => prev.map(report => 
      report.id === reportId ? { ...report, status } : report
    ));
    
    if (status === 'approved') {
      toast('Laporan disetujui. Konten akan ditindaklanjuti.', 'success');
    } else {
      toast('Laporan ditolak. Konten tetap dipertahankan.', 'info');
    }
  };

  const getPendingReports = () => {
    return reports.filter(r => r.status === 'pending');
  };

  return (
    <ModerationContext.Provider value={{ reports, submitReport, resolveReport, getPendingReports }}>
      {children}
    </ModerationContext.Provider>
  );
}

export function useModeration() {
  const context = useContext(ModerationContext);
  if (context === undefined) {
    throw new Error('useModeration must be used within a ModerationProvider');
  }
  return context;
}
