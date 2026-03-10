import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Users, Target, Plus, Clock,
  ChevronRight, BookOpen, CheckCircle2, AlertCircle,
  FileText, BarChart3, Settings
} from 'lucide-react';
import { cn } from '@/src/utils/cn';
import { useNavigate } from 'react-router-dom';
import { useClassroom } from '@/src/contexts/ClassroomContext';
import { useAuth } from '@/src/contexts/AuthContext';

const alerts = [
  { id: 1, type: 'grading', message: '15 tugas Writing dari kelas 9A perlu dikoreksi', urgent: true },
  { id: 2, type: 'insight', message: '60% siswa kelas 8B lemah di Vocabulary', urgent: false },
];

export function TeacherDashboard() {
  const { classrooms, activeClassroomId, setActiveClassroomId } = useClassroom();
  const { role } = useAuth();
  const navigate = useNavigate();

  const activeClassroom = classrooms.find(c => c.id === activeClassroomId);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-20 sm:pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Selamat Datang, Bu Rina! 👋</h1>
          <p className="text-slate-500 mt-1">Berikut adalah ringkasan kelas dan tugas Anda hari ini.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/teaching/courses')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            <BookOpen className="w-4 h-4" />
            Kelola Materi
          </button>
          <button
            onClick={() => navigate('/creator')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Buat Tugas
          </button>
          <button
            onClick={() => alert('Fitur Buat Kelas akan segera hadir!')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            <Users className="w-4 h-4" />
            Buat Kelas
          </button>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Perlu Perhatian Anda
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-2xl border transition-colors cursor-pointer group",
                  alert.urgent ? "bg-orange-50 border-orange-200 hover:bg-orange-100" : "bg-blue-50 border-blue-200 hover:bg-blue-100"
                )}
                onClick={() => alert.type === 'grading' ? navigate('/grader') : navigate('/analytics')}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  alert.urgent ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                )}>
                  {alert.type === 'grading' ? <FileText className="w-5 h-5" /> : <BarChart3 className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className={cn("font-bold text-sm", alert.urgent ? "text-orange-900" : "text-blue-900")}>
                    {alert.message}
                  </p>
                  <p className={cn("text-xs mt-1 font-medium", alert.urgent ? "text-orange-700" : "text-blue-700")}>
                    {alert.type === 'grading' ? 'Klik untuk mulai mengoreksi' : 'Klik untuk melihat detail analytics'}
                  </p>
                </div>
                <ChevronRight className={cn("w-5 h-5 transition-transform group-hover:translate-x-1", alert.urgent ? "text-orange-400" : "text-blue-400")} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Class Overview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            Kelas Aktif
          </h2>
          <button className="text-sm font-bold text-blue-600 hover:text-blue-700">Lihat Semua</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classrooms.map(classroom => (
            <div key={classroom.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              <div className="p-6 border-b border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{classroom.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">35 Siswa</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                    {classroom.name.substring(0, 2).toUpperCase()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-slate-50 p-3 rounded-2xl">
                    <p className="text-xs text-slate-500 font-medium mb-1">Rata-rata Kelas</p>
                    <p className="text-lg font-black text-slate-800">85%</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl">
                    <p className="text-xs text-slate-500 font-medium mb-1">Tugas Aktif</p>
                    <p className="text-lg font-black text-slate-800">2</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 flex justify-between items-center mt-auto">
                <button
                  onClick={() => {
                    setActiveClassroomId(classroom.id);
                    navigate('/analytics');
                  }}
                  className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1"
                >
                  <BarChart3 className="w-4 h-4" /> Analytics
                </button>
                <button
                  onClick={() => {
                    setActiveClassroomId(classroom.id);
                    navigate('/assignments');
                  }}
                  className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
                >
                  Kelola Kelas <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-400" />
          Aktivitas Terbaru
        </h2>
        <div className="space-y-6">
          {[
            { id: 1, student: 'Budi Santoso', action: 'menyelesaikan tugas Reading', time: '10 menit yang lalu', type: 'complete' },
            { id: 2, student: 'Siti Aminah', action: 'mengirimkan essay Writing', time: '1 jam yang lalu', type: 'submit' },
            { id: 3, student: 'Andi Wijaya', action: 'bergabung ke kelas 9A', time: 'Kemarin', type: 'join' },
          ].map(activity => (
            <div key={activity.id} className="flex gap-4 items-start">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                activity.type === 'complete' ? "bg-green-100 text-green-600" :
                  activity.type === 'submit' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
              )}>
                {activity.type === 'complete' ? <CheckCircle2 className="w-5 h-5" /> :
                  activity.type === 'submit' ? <FileText className="w-5 h-5" /> : <Users className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-sm text-slate-900">
                  <span className="font-bold">{activity.student}</span> {activity.action}
                </p>
                <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
