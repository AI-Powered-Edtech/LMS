import React from 'react';
import { useParams } from 'react-router-dom';
import { useStudentProgress, LessonProgress, QuizAttempt } from '@/src/contexts/StudentProgressContext';
import { 
  Award, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  BookOpen, 
  BarChart2 
} from 'lucide-react';
import { cn } from '@/src/utils/cn';

export function StudentProgress() {
  const { studentId } = useParams();
  const { lessonProgress, quizAttempts, xp, achievements } = useStudentProgress();

  // Mock data for student info
  const studentName = "Andi Wijaya";
  
  const completedLessons = Object.values(lessonProgress).filter(p => p.status === 'completed');
  const totalXP = xp;
  
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-slate-200 rounded-full overflow-hidden shadow-md">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${studentName}`} alt={studentName} className="w-full h-full object-cover" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{studentName}</h1>
          <p className="text-slate-500">Progres Belajar & Pencapaian</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase">Materi Selesai</p>
            <p className="text-2xl font-black text-slate-900">{completedLessons.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-xl flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase">Total XP</p>
            <p className="text-2xl font-black text-slate-900">{totalXP}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase">Pencapaian</p>
            <p className="text-2xl font-black text-slate-900">{achievements.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-600" /> Riwayat Kuis
          </h2>
          <div className="space-y-4">
            {Object.values(quizAttempts).flat().map((attempt: QuizAttempt) => (
              <div key={attempt.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="font-bold text-slate-800">Kuis ID: {attempt.quizId}</p>
                  <p className="text-xs text-slate-500">{attempt.completedAt.toLocaleDateString('id-ID')}</p>
                </div>
                <span className={cn("font-bold px-3 py-1 rounded-full text-sm", attempt.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                  {attempt.score}/{attempt.totalPoints}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" /> Pencapaian
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {achievements.map(ach => (
              <div key={ach.id} className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-center">
                <div className="text-3xl mb-2">
                  {ach.icon === 'crown' ? '👑' : ach.icon === 'zap' ? '⚡' : '🎯'}
                </div>
                <p className="font-bold text-slate-800 text-sm">{ach.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
