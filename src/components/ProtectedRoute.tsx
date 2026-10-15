import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 space-y-3">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <span className="text-xs text-zinc-400">Memverifikasi sesi akun...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{
          from: location.pathname,
          reason: 'Silakan masuk ke akun Anda terlebih dahulu untuk mengakses halaman ini.',
        }}
        replace
      />
    );
  }

  return <>{children}</>;
};
