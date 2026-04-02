import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useBusinessStore } from '../store/businessStore';
import api from '../services/api';
import { Building2, User, ArrowRight, Loader2, LogOut } from 'lucide-react';
import logo from '../assets/logo.png';
import { AccessibleContext } from '../types';

export const ContextSelection = () => {
  const navigate = useNavigate();
  const { accessibleContexts, activeContext, logout, selectContext, login, user } = useAuthStore();
  const fetchAuthBootstrap = useBusinessStore((state) => state.fetchAuthBootstrap);
  const [isLoading, setIsLoading] = useState<number | null>(null);
  const [error, setError] = useState('');

  // If already active context, go to dashboard
  React.useEffect(() => {
    if (activeContext) {
      navigate('/dashboard');
    }
  }, [activeContext, navigate]);

  // If no contexts, something is wrong
  if (!accessibleContexts || accessibleContexts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold mb-2">No se encontraron negocios</h2>
          <p className="text-gray-400 mb-6">Parece que tu cuenta no tiene negocios asociados.</p>
          <button 
            onClick={() => { logout(); navigate('/login'); }}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  const handleSelectContext = async (context: AccessibleContext) => {
    setIsLoading(context.business_id);
    setError('');

    try {
      // Call backend to select context
      const response = await api.post('/auth/select-context', { 
        business_id: context.business_id 
      });

      const { active_context, access_token, refresh_token, user: updatedUser } = response.data;

      // Update store
      if (active_context) {
        // If identity switch happened (legacy), update token and user
        if (access_token) {
          // We use login to update everything at once
          login(updatedUser || user!, access_token, active_context, accessibleContexts);
          if (refresh_token) {
            localStorage.setItem('refresh_token', refresh_token);
          }
        } else {
            // Just context switch
            selectContext(active_context);
        }

        await fetchAuthBootstrap(active_context.business_id);
        
        navigate('/dashboard', { replace: true });
      } else {
        setError('No se pudo establecer el contexto activo');
        setIsLoading(null);
      }
    } catch (err: any) {
      console.error('Error selecting context:', err);
      setError(err.response?.data?.error || 'Error al seleccionar el negocio');
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-500/5 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-indigo-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <img 
              src={logo} 
              alt="EnCaja Logo" 
              className="h-16 mx-auto mb-4 object-contain drop-shadow-2xl"
            />
            <h1 className="text-2xl font-bold mb-2">Selecciona un Negocio</h1>
            <p className="text-gray-400">
              Hola, <span className="text-white font-medium">{user?.name}</span>. ¿Dónde quieres trabajar hoy?
            </p>
          </div>

          {/* Context List */}
          <div className="space-y-3 mb-8">
            {accessibleContexts.map((ctx) => (
              <button
                key={ctx.business_id}
                onClick={() => handleSelectContext(ctx)}
                disabled={isLoading !== null}
                className="w-full group relative bg-gray-900/60 hover:bg-gray-800/80 border border-gray-800 hover:border-blue-500/50 rounded-xl p-4 transition-all duration-300 text-left flex items-center gap-4 hover:shadow-lg hover:shadow-blue-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 active:scale-[0.99]"
              >
                {/* Icon Box */}
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  ctx.context_type === 'owned' 
                    ? 'bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20' 
                    : 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20'
                }`}>
                  {ctx.context_type === 'owned' ? <Building2 className="w-6 h-6" /> : <User className="w-6 h-6" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate group-hover:text-blue-100 transition-colors">
                    {ctx.business_name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span className="capitalize">{ctx.role}</span>
                    {ctx.context_type === 'legacy_team' && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Legacy
                      </span>
                    )}
                  </div>
                </div>

                {/* Arrow / Loader */}
                <div className="text-gray-600 group-hover:text-blue-400 transition-colors">
                  {isLoading === ctx.business_id ? (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  ) : (
                    <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-center text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-center">
            <button 
              onClick={() => { logout(); navigate('/login'); }}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors px-4 py-2 rounded-lg hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 active:scale-[0.99]"
            >
              <LogOut className="w-4 h-4" />
              <span>Usar otra cuenta</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
