import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from './ToastContext';
import { moderationService, Report, ReportStatus, ReportReason, ContentType } from '../services/moderationService';

export type { Report, ReportStatus, ReportReason, ContentType } from '../services/moderationService';

interface ModerationContextType {
  reports: Report[];
  submitReport: (report: Omit<Report, 'id' | 'status' | 'timestamp' | 'reporterId' | 'reporterName'>) => void;
  resolveReport: (reportId: string, status: 'approved' | 'rejected') => void;
  getPendingReports: () => Report[];
}

const ModerationContext = createContext<ModerationContextType | undefined>(undefined);

export function ModerationProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>([]);
  const { toast } = useToast();

  // Load initial reports from service
  useEffect(() => {
    moderationService.fetchReports().then(setReports);
  }, []);

  const submitReport = (reportData: Omit<Report, 'id' | 'status' | 'timestamp' | 'reporterId' | 'reporterName'>) => {
    moderationService.submitReport(reportData, 'current-user', 'Anda').then(newReport => {
      setReports(prev => [newReport, ...prev]);
      toast('Laporan berhasil dikirim. Terima kasih atas bantuan Anda menjaga komunitas ini.', 'success');
    });
  };

  const resolveReport = (reportId: string, status: 'approved' | 'rejected') => {
    moderationService.resolveReport(reportId, status);
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
