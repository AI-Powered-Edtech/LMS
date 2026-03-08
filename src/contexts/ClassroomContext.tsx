import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface Classroom {
  id: string;
  name: string;
  course_id?: string;
  teacher_id: string;
  join_code: string;
  max_students?: number;
  created_at: string;
  teacher_name?: string;
  student_count?: number;
}

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
  const { user, role } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [activeClassroomId, setActiveClassroomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClassrooms = useCallback(async () => {
    if (!user) { setClassrooms([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      let data: any[] = [];
      if (role === 'teacher') {
        const { data: classes, error: err } = await supabase
          .from('classes')
          .select('*')
          .eq('teacher_id', user.id)
          .order('created_at', { ascending: false });
        if (err) throw err;
        data = classes ?? [];
      } else if (role === 'admin') {
        const { data: classes, error: err } = await supabase
          .from('classes')
          .select('*')
          .order('created_at', { ascending: false });
        if (err) throw err;
        data = classes ?? [];
      } else {
        // Student: fetch enrolled classes
        const { data: enrollments, error: err } = await supabase
          .from('enrollments')
          .select('class_id, classes(*)')
          .eq('student_id', user.id)
          .eq('status', 'ACTIVE');
        if (err) throw err;
        data = enrollments?.map((e: any) => e.classes).filter(Boolean) ?? [];
      }
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
  }, [user, role]);

  useEffect(() => { fetchClassrooms(); }, [fetchClassrooms]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('classrooms-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, () => {
        fetchClassrooms();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, () => {
        fetchClassrooms();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchClassrooms]);

  const addClassroom = useCallback(async (name: string) => {
    if (!user) return;
    const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { error: err } = await supabase.from('classes').insert({
      name,
      teacher_id: user.id,
      join_code: joinCode,
    });
    if (err) throw err;
    await fetchClassrooms();
  }, [user, fetchClassrooms]);

  const updateClassroom = useCallback(async (id: string, name: string) => {
    const { error: err } = await supabase
      .from('classes')
      .update({ name })
      .eq('id', id);
    if (err) throw err;
    await fetchClassrooms();
  }, [fetchClassrooms]);

  const joinClassroom = useCallback(async (joinCode: string) => {
    if (!user) return;
    const { data: cls, error: findErr } = await supabase
      .from('classes')
      .select('id')
      .eq('join_code', joinCode.toUpperCase())
      .single();
    if (findErr || !cls) throw new Error('Kode kelas tidak ditemukan');
    const { error: enrollErr } = await supabase.from('enrollments').insert({
      class_id: cls.id,
      student_id: user.id,
      status: 'ACTIVE',
    });
    if (enrollErr) {
      if (enrollErr.code === '23505') throw new Error('Kamu sudah terdaftar di kelas ini');
      throw enrollErr;
    }
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
