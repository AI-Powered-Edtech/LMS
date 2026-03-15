import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { RemedialContent, REMEDIAL_CONTENT_MAP } from '@/src/constants/remedialContent';
import {
  studentProgressService,
  LessonStatus, ModuleStatus,
  LessonProgress, QuizAttempt, ModuleData,
  AchievementData, AssignmentData,
} from '../services/studentProgressService';

// Re-export types for backward compatibility
export type { LessonStatus, ModuleStatus, LessonProgress, QuizAttempt, ModuleData } from '../services/studentProgressService';
export type Achievement = AchievementData & { icon: 'crown' | 'zap' | 'target' | 'star' };
export type Assignment = AssignmentData;

interface StudentProgressContextType {
  modules: ModuleData[];
  lessonProgress: Record<string, LessonProgress>;
  quizAttempts: Record<string, QuizAttempt[]>;
  xp: number;
  dailyGoal: number;
  achievements: Achievement[];
  assignments: Assignment[];
  loading: boolean;
  updateLessonProgress: (lessonId: string, progress: number, status: LessonStatus, score?: number) => void;
  getModuleStatus: (moduleId: string) => ModuleStatus;
  unlockModule: (moduleId: string) => void;
  getRemedialContent: (quizId: string) => RemedialContent | null;
  addXP: (amount: number) => void;
}

const StudentProgressContext = createContext<StudentProgressContextType | undefined>(undefined);

export function StudentProgressProvider({ children }: { children: ReactNode }) {
  const { user, tenantId } = useAuth();
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonProgress>>({});
  const [quizAttempts, setQuizAttempts] = useState<Record<string, QuizAttempt[]>>({});
  const [xp, setXp] = useState(0);
  const [dailyGoal] = useState(50);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all progress data via service
  useEffect(() => {
    if (!user || !tenantId) { setLoading(false); return; }

    const fetchAll = async () => {
      setLoading(true);

      // Each call is wrapped individually so one RLS failure doesn't cascade
      try { setModules(await studentProgressService.fetchModules(tenantId)); }
      catch (err) { console.warn('[StudentProgress] modules fetch failed:', err); }

      try { setLessonProgress(await studentProgressService.fetchLessonProgress(user.id, tenantId)); }
      catch (err) { console.warn('[StudentProgress] lesson progress fetch failed:', err); }

      try { setQuizAttempts(await studentProgressService.fetchQuizAttempts(user.id, tenantId)); }
      catch (err) { console.warn('[StudentProgress] quiz attempts fetch failed:', err); }

      try { setXp(await studentProgressService.fetchXP(user.id, tenantId)); }
      catch (err) { console.warn('[StudentProgress] XP fetch failed:', err); }

      try {
        const badges = await studentProgressService.fetchAchievements(user.id, tenantId);
        setAchievements(badges.map(b => ({ ...b, icon: b.icon as Achievement['icon'] })));
      } catch (err) { console.warn('[StudentProgress] achievements fetch failed:', err); }

      try { setAssignments(await studentProgressService.fetchAssignments(tenantId)); }
      catch (err) { console.warn('[StudentProgress] assignments fetch failed:', err); }

      setLoading(false);
    };

    fetchAll();
  }, [user, tenantId]);

  const updateLessonProgress = useCallback((lessonId: string, progress: number, status: LessonStatus, score?: number) => {
    if (!user || !tenantId) return;
    const completed = status === 'completed';
    studentProgressService.updateLessonProgress(user.id, lessonId, completed, tenantId);
    setLessonProgress(prev => ({
      ...prev,
      [lessonId]: { lessonId, moduleId: lessonId, status, progress, score: score ?? prev[lessonId]?.score, lastAccessed: new Date() }
    }));
  }, [user, tenantId]);

  const unlockModule = useCallback((moduleId: string) => {
    setModules(prev => prev.map(m => m.id === moduleId ? { ...m, status: 'active' } : m));
  }, []);

  const getModuleStatus = useCallback((moduleId: string): ModuleStatus => {
    return modules.find(m => m.id === moduleId)?.status || 'locked';
  }, [modules]);

  const getRemedialContent = useCallback((quizId: string): RemedialContent | null => {
    return REMEDIAL_CONTENT_MAP[quizId] || null;
  }, []);

  const addXP = useCallback((amount: number) => {
    if (!user) return;
    setXp(prev => prev + amount);
    studentProgressService.addXP(user.id, amount);
  }, [user]);

  const value = useMemo(() => ({
    modules, lessonProgress, quizAttempts, xp, dailyGoal, achievements, assignments, loading,
    updateLessonProgress, getModuleStatus, unlockModule, getRemedialContent, addXP
  }), [modules, lessonProgress, quizAttempts, xp, dailyGoal, achievements, assignments, loading,
    updateLessonProgress, getModuleStatus, unlockModule, getRemedialContent, addXP]);

  return (
    <StudentProgressContext.Provider value={value}>
      {children}
    </StudentProgressContext.Provider>
  );
}

export function useStudentProgress() {
  const context = useContext(StudentProgressContext);
  if (context === undefined) throw new Error('useStudentProgress must be used within a StudentProgressProvider');
  return context;
}
