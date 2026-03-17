import React, { useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';

export function WorkspaceSelector() {
  const { memberships, activeTenant, setActiveTenant, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (activeTenant) {
      navigate('/app');
    }
  }, [activeTenant, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (memberships.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-xl p-8 border border-slate-700 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">No Workspace Access</h2>
          <p className="text-slate-400 mb-6">
            Your account is not associated with any active workspaces. Please contact your administrator.
          </p>
          <button
            onClick={() => signOut()}
            className="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Select Workspace</h1>
          <p className="text-slate-400">
            Choose an organization to continue
          </p>
        </div>

        <div className="space-y-4">
          {memberships.map((membership) => (
            <button
              key={membership.tenant_id}
              onClick={() => setActiveTenant(membership.tenant_id)}
              className="w-full text-left bg-slate-800 hover:bg-slate-700 hover:border-blue-500 border border-slate-700 rounded-xl p-6 transition-all duration-200 group flex items-center justify-between"
            >
              <div>
                <h3 className="text-xl font-semibold text-white group-hover:text-blue-400 transition-colors">
                  {membership.tenant_name}
                </h3>
                <p className="text-slate-400 mt-1 capitalize">
                  Role: {membership.role}
                </p>
              </div>
              <div className="h-10 w-10 bg-slate-700 rounded-full flex items-center justify-center group-hover:bg-blue-500/20 group-hover:text-blue-400 text-slate-400 transition-colors">
                →
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => signOut()}
            className="text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center space-x-2 mx-auto"
          >
            <LogOut size={16} />
            <span>Sign out instead</span>
          </button>
        </div>
      </div>
    </div>
  );
}
