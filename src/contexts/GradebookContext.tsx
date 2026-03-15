import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { gradebookService, GradeStatus, GradeEntry, GradeData, GradebookStudent, GradebookAssignment } from '../services/gradebookService';

export type { GradeStatus, GradeEntry, GradeData } from '../services/gradebookService';
export type Student = GradebookStudent;
export type Assignment = GradebookAssignment;

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
  const { user, tenantId } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [grades, setGrades] = useState<GradeData>({});
  const [loading, setLoading] = useState(true);

  const fetchGradebook = useCallback(async () => {
    if (!user || !tenantId) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await gradebookService.fetchGradebook(tenantId);
      setAssignments(data.assignments);
      setStudents(data.students);
      setGrades(data.grades);
    } catch (err) {
      console.error('Error fetching gradebook:', err);
    } finally {
      setLoading(false);
    }
  }, [user, tenantId]);

  useEffect(() => { fetchGradebook(); }, [fetchGradebook]);

  const updateGrade = useCallback((studentId: string, assignmentId: string, score: number | null, status: GradeStatus = 'graded', feedback?: string) => {
    // Optimistic update
    setGrades(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [assignmentId]: { score, status, feedback } }
    }));
    // Database handles the real grading - tenantId required for isolation
    if (score !== null && tenantId) {
      gradebookService.submitGrade(assignmentId, studentId, score, feedback, tenantId)
        .catch(err => console.error('Error grading:', err));
    }
  }, [tenantId]);

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
