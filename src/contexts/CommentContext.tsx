import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { commentService, CommentData } from '../services/commentService';

export type Comment = CommentData;

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
      const data = await commentService.fetchComments(threadId);
      setComments(prev => ({ ...prev, [threadId]: data }));
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addComment = useCallback(async (threadId: string, text: string) => {
    if (!user) return;
    try {
      const data = await commentService.addComment(threadId, user.id, text);
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
    } catch (err) {
      console.error('Error adding comment:', err);
    }
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
