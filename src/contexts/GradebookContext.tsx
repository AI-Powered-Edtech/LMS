import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export type Student = {
  id: string;
  name: string;
  nis: string;
  avatarSeed?: string;
};

export type Assignment = {
  id: string;
  title: string;
  type: 'quiz' | 'assignment' | 'project' | 'exam' | 'presentation' | 'offline';
  maxScore: number;
  date: string;
};

export type GradeStatus = 'ungraded' | 'graded' | 'needs_revision';

export type GradeEntry = {
  score: number | null;
  status: GradeStatus;
  feedback?: string;
};

export type GradeData = Record<string, Record<string, GradeEntry>>;

interface GradebookContextType {
  students: Student[];
  assignments: Assignment[];
  grades: GradeData;
  loading: boolean;
  updateGrade: (studentId: string, assignmentId: string, score: number | null, status?: GradeStatus, feedback?: string) => void;
  getStudentGrade: (studentId: string, assignmentId: string) => GradeEntry | null;
  addAssignment: (assignment: Assignment) => void;
  refreshGradebook: () => Promise<void>;
}

const GradebookContext = createContext<GradebookContextType | undefined>(undefined);

export function GradebookProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [grades, setGrades] = useState<GradeData>({});
  const [loading, setLoading] = useState(true);

  const fetchGradebook = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      // Fetch assignments from classes the user teaches or is enrolled in
      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select('id, title, due_date, created_at')
        .order('created_at', { ascending: false });

      if (assignmentsData) {
        setAssignments(assignmentsData.map(a => ({
          id: a.id,
          title: a.title,
          type: 'assignment' as const,
          maxScore: 100,
          date: a.due_date ? new Date(a.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '',
        })));
      }

      // Fetch submissions with grades
      const { data: submissionsData } = await supabase
        .from('assignment_submissions')
        .select('id, assignment_id, student_id, status, grades(score, feedback)')
        .order('submitted_at', { ascending: false });

      // Fetch students (profiles)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('is_active', true);

      if (profilesData) {
        setStudents(profilesData.map(p => ({
          id: p.id,
          name: `${p.first_name} ${p.last_name}`.trim() || p.email,
          nis: p.email.split('@')[0],
        })));
      }

      // Build grades map
      if (submissionsData) {
        const gradeMap: GradeData = {};
        submissionsData.forEach(sub => {
          if (!gradeMap[sub.student_id]) gradeMap[sub.student_id] = {};
          const grade = (sub as any).grades;
          gradeMap[sub.student_id][sub.assignment_id] = {
            score: grade?.score ?? null,
            status: grade ? 'graded' : 'ungraded',
            feedback: grade?.feedback,
          };
        });
        setGrades(gradeMap);
      }
    } catch (err) {
      console.error('Error fetching gradebook:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchGradebook(); }, [fetchGradebook]);

  const updateGrade = useCallback((studentId: string, assignmentId: string, score: number | null, status: GradeStatus = 'graded', feedback?: string) => {
    // Optimistic update
    setGrades(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [assignmentId]: { score, status, feedback } }
    }));
    // Edge function handles the real grading with auth checks
    if (score !== null) {
      supabase.functions.invoke('grade-submission', {
        body: {
          submission_id: assignmentId, // Will need actual submission_id mapping
          score,
          feedback,
        }
      }).catch(err => console.error('Error grading:', err));
    }
  }, []);

  const getStudentGrade = useCallback((studentId: string, assignmentId: string) => {
    return grades[studentId]?.[assignmentId] ?? null;
  }, [grades]);

  const addAssignment = useCallback((assignment: Assignment) => {
    setAssignments(prev => [...prev, assignment]);
  }, []);

  return (
    <GradebookContext.Provider value={{ students, assignments, grades, loading, updateGrade, getStudentGrade, addAssignment, refreshGradebook: fetchGradebook }}>
      {children}
    </GradebookContext.Provider>
  );
}

export function useGradebook() {
  const context = useContext(GradebookContext);
  if (context === undefined) throw new Error('useGradebook must be used within a GradebookProvider');
  return context;
}
