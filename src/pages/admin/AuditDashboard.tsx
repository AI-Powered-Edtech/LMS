import React, { useState, useEffect, useCallback } from 'react';
import { FileText, RefreshCw, Filter, ChevronDown, Shield, UserMinus, UserPlus, Mail, KeyRound, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/src/utils/cn';
import { supabase } from '@/src/lib/supabase';

interface AuditLog {
  log_id: string;
  actor_id: string;
  actor_name: string;
  actor_email: string;
  action: string;
  target_type: string;
  target_id: string | null;
  target_name: string;
  details: Record<string, any>;
  created_at: string;
  total_count: number;
}

const ACTION_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  ROLE_CHANGED: { icon: <Shield className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', label: 'Role Diubah' },
  USER_DEACTIVATED: { icon: <UserMinus className="w-4 h-4" />, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'User Dinonaktifkan' },
  USER_ACTIVATED: { icon: <UserPlus className="w-4 h-4" />, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'User Diaktifkan' },
  INVITATION_SENT: { icon: <Mail className="w-4 h-4" />, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', label: 'Undangan Terkirim' },
  PASSWORD_RESET: { icon: <KeyRound className="w-4 h-4" />, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Reset Password' },
};

const DEFAULT_ACTION_CONFIG = { icon: <FileText className="w-4 h-4" />, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', label: 'Aktivitas' };

const ACTION_OPTIONS = [
  { value: '', label: 'Semua Aktivitas' },
  { value: 'ROLE_CHANGED', label: 'Role Diubah' },
  { value: 'USER_DEACTIVATED', label: 'User Dinonaktifkan' },
  { value: 'USER_ACTIVATED', label: 'User Diaktifkan' },
  { value: 'INVITATION_SENT', label: 'Undangan Terkirim' },
  { value: 'PASSWORD_RESET', label: 'Reset Password' },
];

export function AuditDashboard() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const PAGE_SIZE = 30;

  const fetchLogs = useCallback(async (newCursor?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_audit_logs', {
        p_action: actionFilter || null,
        p_cursor: newCursor || null,
        p_limit: PAGE_SIZE,
      });

      if (error) throw error;

      const results = (data ?? []) as AuditLog[];

      if (newCursor) {
        setLogs(prev => [...prev, ...results]);
      } else {
        setLogs(results);
      }

      if (results.length > 0) {
        setTotalCount(results[0].total_count);
        setCursor(results[results.length - 1].created_at);
        setHasMore(results.length === PAGE_SIZE);
      } else {
        if (!newCursor) setTotalCount(0);
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter]);

  useEffect(() => {
    setCursor(null);
    fetchLogs();
  }, [actionFilter]);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Baru saja';
    if (mins < 60) return `${mins} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    if (days < 7) return `${days} hari lalu`;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderDetails = (log: AuditLog) => {
    const d = log.details;
    if (!d || Object.keys(d).length === 0) return null;

    if (log.action === 'ROLE_CHANGED' && d.old_role && d.new_role) {
      return (
        <div className="flex items-center gap-1.5 text-xs mt-1">
          <span className="px-1.5 py-0.5 bg-slate-100 rounded font-medium">{d.old_role}</span>
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">{d.new_role}</span>
        </div>
      );
    }

    if (d.is_active !== undefined) {
      return (
        <span className={cn('text-xs font-medium mt-1 inline-block', d.is_active ? 'text-green-600' : 'text-red-600')}>
          Status → {d.is_active ? 'Aktif' : 'Nonaktif'}
        </span>
      );
    }

    return null;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0] || '').join('').toUpperCase().slice(0, 2) || '??';
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600" />
            Audit Log
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Riwayat semua aktivitas admin dalam sekolah Anda.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock className="w-4 h-4" />
          <span>{totalCount} total entri</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 appearance-none"
            >
              {ACTION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <button
            onClick={() => { setCursor(null); fetchLogs(); }}
            className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Log Timeline */}
        <div className="divide-y divide-slate-100">
          {loading && logs.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
              Memuat audit log...
            </div>
          ) : logs.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-400">
              <FileText className="w-8 h-8 mx-auto mb-3 text-slate-300" />
              <p className="font-medium text-slate-500">Belum ada aktivitas</p>
              <p className="text-sm mt-1">Audit log akan muncul saat admin melakukan perubahan.</p>
            </div>
          ) : logs.map(log => {
            const cfg = ACTION_CONFIG[log.action] || DEFAULT_ACTION_CONFIG;
            return (
              <div key={log.log_id} className="px-6 py-4 hover:bg-slate-50/50 transition-colors flex items-start gap-4">
                {/* Icon */}
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border', cfg.bg, cfg.color)}>
                  {cfg.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {cfg.label}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        <span className="font-medium text-slate-700">{log.actor_name}</span>
                        {log.target_name && (
                          <> → <span className="font-medium text-slate-700">{log.target_name}</span></>
                        )}
                      </p>
                      {renderDetails(log)}
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">{formatTime(log.created_at)}</span>
                  </div>
                </div>

                {/* Actor avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  {getInitials(log.actor_name)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="p-4 border-t border-slate-100 text-center">
            <button
              onClick={() => fetchLogs(cursor || undefined)}
              disabled={loading}
              className="px-6 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? 'Memuat...' : 'Muat Lebih Banyak'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
