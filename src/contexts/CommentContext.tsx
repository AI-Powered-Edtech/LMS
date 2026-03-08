import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export type Comment = {
  id: string;
  author: string;
  text: string;
  time: string;
  author_id?: string;
};

interface CommentContextType {
  comments: Record<string, Comment[]>;
  loading: boolean;
  addComment: (threadId: string, text: string) => Promise<void>;
  getComments: (threadId: string) => Comment[];
  setInitialComments: (assignmentId: string, studentId: string, initialComments: Comment[]) => void;
  refreshComments: (threadId: string) => Promise<void>;
}

const CommentContext = createContext<CommentContextType | undefined>(undefined);

export function CommentProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [loading, setLoading] = useState(false);

  const fetchComments = useCallback(async (threadId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('discussion_posts')
        .select('id, content, created_at, author_id, profiles!discussion_posts_author_id_fkey(first_name, last_name)')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) {
        setComments(prev => ({
          ...prev,
          [threadId]: data.map(d => ({
            id: d.id,
            author: `${(d as any).profiles?.first_name ?? ''} ${(d as any).profiles?.last_name ?? ''}`.trim() || 'Unknown',
            text: d.content,
            time: new Date(d.created_at).toLocaleString('id-ID'),
            author_id: d.author_id,
          })),
        }));
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addComment = useCallback(async (threadId: string, text: string) => {
    if (!user) return;
    const { data, error } = await supabase.from('discussion_posts').insert({
      thread_id: threadId,
      author_id: user.id,
      content: text,
    }).select('id, created_at').single();

    if (error) { console.error('Error adding comment:', error); return; }

    // Optimistic update
    const newComment: Comment = {
      id: data.id,
      author: `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'You',
      text,
      time: new Date(data.created_at).toLocaleString('id-ID'),
      author_id: user.id,
    };
    setComments(prev => ({
      ...prev,
      [threadId]: [...(prev[threadId] || []), newComment],
    }));
  }, [user, profile]);

  const getComments = useCallback((threadId: string) => {
    return comments[threadId] || [];
  }, [comments]);

  const setInitialComments = useCallback((assignmentId: string, studentId: string, initialComments: Comment[]) => {
    const key = `${assignmentId}-${studentId}`;
    setComments(prev => ({ ...prev, [key]: initialComments }));
  }, []);

  const value = useMemo(() => ({
    comments, loading, addComment, getComments, setInitialComments,
    refreshComments: fetchComments,
  }), [comments, loading, addComment, getComments, setInitialComments, fetchComments]);

  return (
    <CommentContext.Provider value={value}>
      {children}
    </CommentContext.Provider>
  );
}

export function useComments() {
  const context = useContext(CommentContext);
  if (context === undefined) throw new Error('useComments must be used within a CommentProvider');
  return context;
}
