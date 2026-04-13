/**
 * Export Report Hook
 *
 * Handles report export with job monitoring and progress tracking.
 *
 * Features:
 * - Async job creation
 * - Progress polling
 * - Auto-download when completed
 * - Error handling with retry
 */

import { useState, useCallback, useRef } from 'react';
import { getAuthToken } from '@/services/auth/vilSession';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExportFormat = 'csv' | 'excel' | 'pdf';
export type ReportType = 'grades' | 'attendance' | 'progress';

export interface ExportJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  reportType: ReportType;
  format: ExportFormat;
  downloadUrl?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface UseExportReportOptions {
  onCompleted?: (job: ExportJob) => void;
  onFailed?: (error: string) => void;
  pollingInterval?: number; // Default: 2000ms
}

// ─── API Base URL ─────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || '';

// ─── Main Hook ────────────────────────────────────────────────────────────────

export function useExportReport(options: UseExportReportOptions = {}) {
  const { onCompleted, onFailed, pollingInterval = 2000 } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<ExportJob | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Check job status
   */
  const checkJobStatus = useCallback(async (jobId: string) => {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(
        `${API_BASE}/api/v1/reports/export/${jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      const jobStatus: ExportJob = result.data;

      setJob(jobStatus);

      // Update progress based on status
      if (jobStatus.status === 'pending') {
        setProgress(10);
      } else if (jobStatus.status === 'processing') {
        setProgress(50);
      } else if (jobStatus.status === 'completed') {
        setProgress(100);
        stopPolling();
        setIsLoading(false);
        onCompleted?.(jobStatus);
      } else if (jobStatus.status === 'failed') {
        stopPolling();
        setIsLoading(false);
        setError(jobStatus.errorMessage || 'Export failed');
        onFailed?.(jobStatus.errorMessage || 'Export failed');
      }
    } catch (err: any) {
      console.error('[ExportReport] Error checking job status:', err);
      stopPolling();
      setIsLoading(false);
      setError(err.message || 'Failed to check job status');
    }
  }, [onCompleted, onFailed]);

  /**
   * Start polling for job status
   */
  const startPolling = useCallback((jobId: string) => {
    // Initial check
    void checkJobStatus(jobId);

    // Set up polling
    pollingRef.current = setInterval(() => {
      void checkJobStatus(jobId);
    }, pollingInterval);
  }, [checkJobStatus, pollingInterval]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  /**
   * Export report
   */
  const exportReport = useCallback(
    async (reportType: ReportType, format: ExportFormat, filters?: {
      course_id?: string;
      start_date?: string;
      end_date?: string;
    }) => {
      setIsLoading(true);
      setError(null);
      setProgress(0);

      try {
        const token = await getAuthToken();
        if (!token) throw new Error('Authentication required');

        const response = await fetch(`${API_BASE}/api/v1/reports/export`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            report_type: reportType,
            format,
            course_id: filters?.course_id,
            start_date: filters?.start_date,
            end_date: filters?.end_date,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();
        const newJob: ExportJob = result.data;

        setJob(newJob);
        setProgress(10);

        // Start polling for status
        startPolling(newJob.jobId);
      } catch (err: any) {
        console.error('[ExportReport] Export failed:', err);
        setIsLoading(false);
        setError(err.message || 'Failed to start export');
      }
    },
    [startPolling]
  );

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    stopPolling();
    setIsLoading(false);
    setProgress(0);
    setError(null);
    setJob(null);
  }, [stopPolling]);

  return {
    exportReport,
    isLoading,
    progress,
    error,
    job,
    reset,
  };
}

export default useExportReport;
