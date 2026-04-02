import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAccess } from '../hooks/useAccess';
import { Loader2 } from 'lucide-react';

export const RequireAdmin = () => {
  const { isAuthenticated, fetchUser } = useAuthStore();
  const { isAdmin } = useAccess();
  
  // If we are authenticated but not admin (yet), we might need to fetch fresh permissions
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    let mounted = true;

    const verifyPermissions = async () => {
      if (isAuthenticated && !isAdmin) {
        setIsChecking(true);
        try {
          await fetchUser();
        } catch (error) {
          console.error("Failed to verify admin permissions", error);
        } finally {
          if (mounted) setIsChecking(false);
        }
      }
    };

    verifyPermissions();
    
    return () => { mounted = false; };
  }, [isAuthenticated]); // Only run once on mount/auth change

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Admin routes don't strictly require active context like user dashboard
  // but they do require admin privileges.

  if (isChecking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-400">Verificando permisos...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
