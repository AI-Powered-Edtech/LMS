import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function RoleResolver() {
  const { role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      switch (role) {
        case 'admin':
          navigate('/app/admin', { replace: true });
          break;
        case 'teacher':
          navigate('/app/teacher', { replace: true });
          break;
        case 'student':
          navigate('/app/student', { replace: true });
          break;
        default:
          navigate('/unauthorized', { replace: true });
      }
    }
  }, [role, loading, navigate]);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-900">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
    </div>
  );
}
