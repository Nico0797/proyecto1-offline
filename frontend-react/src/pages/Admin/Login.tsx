import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import logo from '../../assets/logo.png';

export const AdminLogin = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const step = 1; void step; // 1: Email, 2: Password (optional flow, keeping it simple for now)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, access_token, refresh_token, token } = response.data;
      const useToken = access_token || token;

      if (!useToken) {
        throw new Error('Token de acceso no recibido');
      }

      // Check admin permissions
      const isAdmin = user?.is_admin || user?.permissions?.admin || (user?.roles && user.roles.some((r: any) => ['ADMIN', 'SUPERADMIN', 'ADMINISTRADOR'].includes(r.name)));
      
      if (!isAdmin) {
        throw new Error('No tienes permisos de administrador');
      }

      if (refresh_token) {
        localStorage.setItem('refresh_token', refresh_token);
      }
      
      login(user, useToken);
      navigate('/admin');
    } catch (err: any) {
      const serverError = err.response?.data?.error || err.response?.data?.message;
      setError(serverError || err.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] overflow-hidden relative selection:bg-blue-500/30">
      {/* Animated Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '10s' }} />
      
      {/* Glass Card */}
      <div className="w-full max-w-md relative z-10 mx-4">
        <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Top accent */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />
          
          <div className="flex flex-col items-center mb-10">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center mb-6 shadow-xl border border-white/5 group relative">
              <div className="absolute inset-0 bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <img src={logo} alt="Logo" className="w-12 h-12 object-contain relative z-10" />
              <div className="absolute -bottom-3 -right-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-2 shadow-lg border-4 border-[#0f172a]">
                <Shield size={16} className="text-white" strokeWidth={3} />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight text-center">Admin Access</h1>
            <p className="text-slate-400 text-sm mt-2 font-medium">Gestión Centralizada de Plataforma</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="group relative">
                <input
                  id="email"
                  type="email"
                  placeholder=" "
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="peer w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all pl-11"
                />
                <label 
                  htmlFor="email"
                  className="absolute left-11 top-3.5 text-slate-500 text-sm transition-all peer-focus:-top-2.5 peer-focus:bg-[#0f172a] peer-focus:px-2 peer-focus:text-xs peer-focus:text-blue-400 peer-not-placeholder-shown:-top-2.5 peer-not-placeholder-shown:bg-[#0f172a] peer-not-placeholder-shown:px-2 peer-not-placeholder-shown:text-xs pointer-events-none"
                >
                  Correo Corporativo
                </label>
                <div className="absolute left-4 top-3.5 text-slate-500 peer-focus:text-blue-500 transition-colors">
                  <Shield size={18} />
                </div>
              </div>

              <div className="group relative">
                <input
                  id="password"
                  type="password"
                  placeholder=" "
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="peer w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all pl-11"
                />
                <label 
                  htmlFor="password"
                  className="absolute left-11 top-3.5 text-slate-500 text-sm transition-all peer-focus:-top-2.5 peer-focus:bg-[#0f172a] peer-focus:px-2 peer-focus:text-xs peer-focus:text-blue-400 peer-not-placeholder-shown:-top-2.5 peer-not-placeholder-shown:bg-[#0f172a] peer-not-placeholder-shown:px-2 peer-not-placeholder-shown:text-xs pointer-events-none"
                >
                  Contraseña
                </label>
                <div className="absolute left-4 top-3.5 text-slate-500 peer-focus:text-blue-500 transition-colors">
                  <Lock size={18} />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-3 animate-shake">
                <div className="p-1 bg-red-500/20 rounded-full shrink-0">
                  <Lock size={12} />
                </div>
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
            
            <div className="pt-4 text-center border-t border-white/5">
              <a href="/" className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors py-2 px-4 rounded-lg hover:bg-white/5">
                <ArrowRight size={12} className="rotate-180" />
                Volver a la plataforma
              </a>
            </div>
          </form>
        </div>
        
        {/* Security Badge */}
        <div className="mt-8 flex justify-center">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 rounded-full border border-white/5 backdrop-blur-sm">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span className="text-xs text-slate-400 font-medium">Conexión Segura SSL/TLS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
