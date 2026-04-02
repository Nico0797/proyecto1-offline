import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Sparkles, Building2 } from 'lucide-react';

export const TeamLogin = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Send businessName along with credentials to indicate team context
      const response = await api.post('/auth/login', { 
        email, 
        password,
        business_name: businessName,
        is_team_login: true 
      });
      const { user, access_token, refresh_token, token, accessible_contexts, active_context } = response.data;
      const useToken = access_token || token;
      
      if (!useToken) {
        throw new Error('Token de acceso no recibido');
      }
      
      if (refresh_token) {
        localStorage.setItem('refresh_token', refresh_token);
      }
      
      // Artificial delay for smoother UX
      await new Promise(resolve => setTimeout(resolve, 800));
      
      login(user, useToken, active_context, accessible_contexts);
      
      // In team login, we expect to be in that context, so active_context should be there
      // or at least accessible_contexts should have it.
      navigate('/dashboard', { replace: true });
      
    } catch (err: any) {
      const serverError = err.response?.data?.error || err.response?.data?.message;
      setError(serverError || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-950 text-white">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-indigo-500/5 blur-[120px]" />
        <div className="absolute top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-blue-500/5 blur-[120px]" />
      </div>

      {/* Scrollable Container */}
      <div className="relative h-full w-full overflow-y-auto overflow-x-hidden z-10 custom-scrollbar">
        <div className="min-h-full flex flex-col items-center justify-center p-4 py-8 sm:p-6">
          
          {/* Card Container */}
          <div className="w-full max-w-md perspective-1000">
            <div className="bg-gray-900/80 border border-gray-800/60 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl animate-fade-in-up">
              
              {/* Header */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative group mb-3">
                    <div className="absolute -inset-4 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 rounded-full blur-xl opacity-70 group-hover:opacity-100 transition duration-500"></div>
                    <div className="relative z-10 bg-gray-800 p-3 rounded-2xl border border-gray-700 shadow-lg">
                        <Building2 className="w-10 h-10 text-indigo-400" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Acceso a Equipo</h1>
                <p className="text-gray-400 text-center text-sm max-w-xs mx-auto">
                  Ingresa con tu cuenta de empresa
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Business Name Field */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300 ml-1">Empresa</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Building2 className="h-5 w-5 text-gray-500 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-base"
                      placeholder="Nombre de la empresa"
                      required
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300 ml-1">Correo Corporativo</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-base"
                      placeholder="nombre@empresa.com"
                      required
                    />
                  </div>
                </div>
                
                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-sm font-medium text-gray-300">Contraseña</label>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-base"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 animate-fade-in">
                    <Sparkles className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-900/20 transform transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <>
                      <span>Ingresar al Equipo</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
              
              <div className="mt-6 pt-4 border-t border-gray-800 text-center">
                <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-center gap-2">
                   <span>← Volver al login principal</span>
                </Link>
              </div>
            </div>
            
            {/* Footer Links */}
            <div className="mt-8 text-center text-xs text-gray-500 flex justify-center gap-6 pb-4">
              <Link to="/privacy" className="hover:text-gray-300 transition-colors p-2">Privacidad</Link>
              <Link to="/terms" className="hover:text-gray-300 transition-colors p-2">Términos</Link>
              <Link to="/help" className="hover:text-gray-300 transition-colors p-2">Ayuda</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
