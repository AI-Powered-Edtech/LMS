import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { RemedialContent, REMEDIAL_CONTENT_MAP } from '@/src/constants/remedialContent';

// --- Types ---

export type LessonStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed';
export type ModuleStatus = 'locked' | 'active' | 'mastered' | 'needs_review';

export interface LessonProgress {
  lessonId: string;
  moduleId: string;
  status: LessonStatus;
  progress: number;
  score?: number;
  lastAccessed?: Date;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  score: number;
  totalPoints: number;
  percentage: number;
  passed: boolean;
  completedAt: Date;
  answers: Record<string, string>;
}

export interface ModuleData {
  id: string;
  title: string;
  status: ModuleStatus;
  position: { x: number; y: number };
  prerequisiteId?: string;
  minScoreToPass?: number;
}

export interface Achievement {
  id: string;
  title: string;
  icon: 'crown' | 'zap' | 'target' | 'star';
  unlockedAt?: Date;
}

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  dueDate: Date;
  type: 'Tugas' | 'Kuis' | 'Proyek' | 'Review';
  urgent: boolean;
  progress: number;
}

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
  submitQuizAttempt: (quizId: string, attempt: Omit<QuizAttempt, 'id' | 'completedAt'>) => void;
  getModuleStatus: (moduleId: string) => ModuleStatus;
  unlockModule: (moduleId: string) => void;
  getRemedialContent: (quizId: string) => RemedialContent | null;
  addXP: (amount: number) => void;
}

const StudentProgressContext = createContext<StudentProgressContextType | undefined>(undefined);

export function StudentProgressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonProgress>>({});
  const [quizAttempts, setQuizAttempts] = useState<Record<string, QuizAttempt[]>>({});
  const [xp, setXp] = useState(0);
  const [dailyGoal] = useState(50);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all progress data
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const fetchProgress = async () => {
      setLoading(true);
      try {
        // Fetch course modules
        const { data: modulesData } = await supabase
          .from('course_modules')
          .select('id, title, order, course_id')
          .order('order');

        if (modulesData) {
          setModules(modulesData.map((m, i) => ({
            id: m.id,
            title: m.title,
            status: i === 0 ? 'active' : 'locked' as ModuleStatus,
            position: { x: 50, y: i * 20 + 10 },
          })));
        }

        // Fetch lesson progress
        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('lesson_id, completed, completed_at')
          .eq('user_id', user.id);

        if (progressData) {
          const progressMap: Record<string, LessonProgress> = {};
          progressData.forEach(p => {
            progressMap[p.lesson_id] = {
              lessonId: p.lesson_id,
              moduleId: p.lesson_id,
              status: p.completed ? 'completed' : 'in_progress',
              progress: p.completed ? 100 : 50,
              lastAccessed: p.completed_at ? new Date(p.completed_at) : undefined,
            };
          });
          setLessonProgress(progressMap);
        }

        // Fetch quiz attempts
        const { data: attemptsData } = await supabase
          .from('quiz_attempts')
          .select('id, quiz_id, score, answers, created_at')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false });

        if (attemptsData) {
          const attemptsMap: Record<string, QuizAttempt[]> = {};
          attemptsData.forEach(a => {
            const attempt: QuizAttempt = {
              id: a.id,
              quizId: a.quiz_id,
              score: a.score ?? 0,
              totalPoints: 100,
              percentage: a.score ?? 0,
              passed: (a.score ?? 0) >= 70,
              completedAt: new Date(a.created_at),
              answers: a.answers ?? {},
            };
            if (!attemptsMap[a.quiz_id]) attemptsMap[a.quiz_id] = [];
            attemptsMap[a.quiz_id].push(attempt);
          });
          setQuizAttempts(attemptsMap);
        }

        // Fetch XP
        const { data: pointsData } = await supabase
          .from('user_points')
          .select('points')
          .eq('user_id', user.id)
          .maybeSingle();
        setXp(pointsData?.points ?? 0);

        // Fetch badges/achievements
        const { data: badgesData } = await supabase
          .from('user_badges')
          .select('id, earned_at, badges(name, icon)')
          .eq('user_id', user.id);

        if (badgesData) {
          setAchievements(badgesData.map(b => ({
            id: b.id,
            title: (b as any).badges?.name ?? 'Badge',
            icon: ((b as any).badges?.icon as any) ?? 'star',
            unlockedAt: b.earned_at ? new Date(b.earned_at) : undefined,
          })));
        }

        // Fetch assignments with due dates
        const { data: assignmentsData } = await supabase
          .from('assignments')
          .select('id, title, due_date, classes(name)')
          .order('due_date', { ascending: true })
          .limit(10);

        if (assignmentsData) {
          setAssignments(assignmentsData.map(a => ({
            id: a.id,
            title: a.title,
            subject: (a as any).classes?.name ?? '',
            dueDate: a.due_date ? new Date(a.due_date) : new Date(),
            type: 'Tugas' as const,
            urgent: a.due_date ? new Date(a.due_date).getTime() - Date.now() < 86400000 : false,
            progress: 0,
          })));
        }
      } catch (err) {
        console.error('Error fetching student progress:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, [user]);

  const updateLessonProgress = useCallback((lessonId: string, progress: number, status: LessonStatus, score?: number) => {
    if (!user) return;
    const completed = status === 'completed';
    supabase.from('lesson_progress').upsert({
      user_id: user.id,
      lesson_id: lessonId,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    }, { onConflict: 'user_id,lesson_id' }).then(({ error }) => {
      if (error) console.error('Error updating lesson progress:', error);
    });
    setLessonProgress(prev => ({
      ...prev,
      [lessonId]: { lessonId, moduleId: lessonId, status, progress, score: score ?? prev[lessonId]?.score, lastAccessed: new Date() }
    }));
  }, [user]);

  const submitQuizAttempt = useCallback((quizId: string, attemptData: Omit<QuizAttempt, 'id' | 'completedAt'>) => {
    if (!user) return;
    supabase.from('quiz_attempts').insert({
      quiz_id: quizId,
      student_id: user.id,
      score: attemptData.score,
      answers: attemptData.answers,
    }).then(({ error }) => {
      if (error) console.error('Error submitting quiz attempt:', error);
    });
    const newAttempt: QuizAttempt = {
      ...attemptData,
      id: crypto.randomUUID(),
      completedAt: new Date(),
    };
    setQuizAttempts(prev => ({ ...prev, [quizId]: [newAttempt, ...(prev[quizId] || [])] }));
    addXP(attemptData.passed ? 50 : 10);
  }, [user]);

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
    supabase.rpc('add_user_points', { p_user_id: user.id, p_points: amount })
      .then(({ error }) => { if (error) console.error('Error adding XP:', error); });
  }, [user]);

  const value = useMemo(() => ({
    modules, lessonProgress, quizAttempts, xp, dailyGoal, achievements, assignments, loading,
    updateLessonProgress, submitQuizAttempt, getModuleStatus, unlockModule, getRemedialContent, addXP
  }), [modules, lessonProgress, quizAttempts, xp, dailyGoal, achievements, assignments, loading,
    updateLessonProgress, submitQuizAttempt, getModuleStatus, unlockModule, getRemedialContent, addXP]);

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
