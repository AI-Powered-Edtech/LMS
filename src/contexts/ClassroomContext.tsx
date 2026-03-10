import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { classroomService, Classroom } from '../services/classroomService';

export type { Classroom } from '../services/classroomService';

interface ClassroomContextType {
  classrooms: Classroom[];
  activeClassroomId: string | null;
  loading: boolean;
  error: string | null;
  setActiveClassroomId: (id: string) => void;
  addClassroom: (name: string) => Promise<void>;
  updateClassroom: (id: string, name: string) => Promise<void>;
  joinClassroom: (joinCode: string) => Promise<void>;
  refreshClassrooms: () => Promise<void>;
}

const ClassroomContext = createContext<ClassroomContextType | undefined>(undefined);

export function ClassroomProvider({ children }: { children: ReactNode }) {
  const { user, role, tenantId } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [activeClassroomId, setActiveClassroomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClassrooms = useCallback(async () => {
    if (!user || !tenantId) { setClassrooms([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await classroomService.fetchClassrooms(user.id, role, tenantId);
      setClassrooms(data);
      if (data.length > 0 && !activeClassroomId) {
        setActiveClassroomId(data[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching classrooms:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, role, tenantId]);

  useEffect(() => { fetchClassrooms(); }, [fetchClassrooms]);

  // Realtime subscription — delegated to service
  useEffect(() => {
    if (!user) return;
    return classroomService.subscribeToChanges(() => fetchClassrooms());
  }, [user, fetchClassrooms]);

  const addClassroom = useCallback(async (name: string) => {
    if (!user || !tenantId) return;
    await classroomService.createClassroom(user.id, name, tenantId);
    await fetchClassrooms();
  }, [user, fetchClassrooms]);

  const updateClassroom = useCallback(async (id: string, name: string) => {
    await classroomService.updateClassroom(id, name);
    await fetchClassrooms();
  }, [fetchClassrooms]);

  const joinClassroom = useCallback(async (joinCode: string) => {
    if (!user || !tenantId) return;
    await classroomService.joinClassroom(user.id, joinCode, tenantId);
    await fetchClassrooms();
  }, [user, fetchClassrooms]);

  return (
    <ClassroomContext.Provider value={{
      classrooms, activeClassroomId, loading, error,
      setActiveClassroomId, addClassroom, updateClassroom, joinClassroom,
      refreshClassrooms: fetchClassrooms,
    }}>
      {children}
    </ClassroomContext.Provider>
  );
}

export function useClassroom() {
  const context = useContext(ClassroomContext);
  if (context === undefined) throw new Error('useClassroom must be used within a ClassroomProvider');
  return context;
}
