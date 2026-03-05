import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import logo from '../assets/logo.png';

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [serverUrl, setServerUrl] = useState(
    (typeof window !== 'undefined' && localStorage.getItem('API_BASE_URL')) || (import.meta.env.VITE_API_BASE_URL || '')
  );

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
      
      if (refresh_token) {
        localStorage.setItem('refresh_token', refresh_token);
      }
      
      // Artificial delay for smoother UX
      await new Promise(resolve => setTimeout(resolve, 800));
      
      login(user, useToken);
      const params = new URLSearchParams(location.search);
      const redirect = params.get('redirect');
      const safeRedirect = redirect && redirect.startsWith('/') ? redirect : '/dashboard';
      navigate(safeRedirect);
    } catch (err: any) {
      const serverError = err.response?.data?.error || err.response?.data?.message;
      setError(serverError || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-950 text-white">
      {/* Background Effects (Fixed) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-500/5 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-indigo-500/5 blur-[120px]" />
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
                  <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 rounded-full blur-xl opacity-70 group-hover:opacity-100 transition duration-500"></div>
                  <img 
                    src={logo} 
                    alt="EnCaja Logo" 
                    className="h-20 sm:h-28 object-contain relative z-10 drop-shadow-2xl transform transition-transform duration-500 hover:scale-105"
                  />
                </div>
                <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Bienvenido</h1>
                <p className="text-gray-400 text-center text-sm max-w-xs mx-auto">
                  Inicia sesión para continuar
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-300 ml-1">Correo</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-base"
                      placeholder="tu@email.com"
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
                      <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-base"
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

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowServerSettings((s) => !s)}
                  className="text-xs text-gray-400 hover:text-gray-200 underline"
                >
                  {showServerSettings ? 'Ocultar configuración de servidor' : 'Configurar servidor'}
                </button>
              </div>
              {showServerSettings && (
                <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700 space-y-2">
                  <label className="text-xs font-medium text-gray-300">API Base URL</label>
                  <input
                    type="text"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="https://tu-dominio/api"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 outline-none text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setServerUrl('');
                        localStorage.removeItem('API_BASE_URL');
                      }}
                      className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded-lg"
                    >
                      Restablecer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (serverUrl.trim()) {
                          localStorage.setItem('API_BASE_URL', serverUrl.trim());
                        } else {
                          localStorage.removeItem('API_BASE_URL');
                        }
                        alert('Configuración guardada. Reinicia la app para aplicar.');
                      }}
                      className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 rounded-lg"
                    >
                      Guardar
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Emulador Android con backend local: http://10.0.2.2:8001/api
                  </p>
                </div>
              )}

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-900/20 transform transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Iniciando...</span>
                    </>
                  ) : (
                    <>
                      <span>Entrar</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
              
              <div className="mt-6 pt-4 border-t border-gray-800 text-center">
                <Link to="/register" className="block w-full">
                  <button className="w-full py-3 bg-gray-800 hover:bg-gray-750 text-white border border-gray-700 hover:border-gray-600 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2">
                    Crear cuenta gratis
                  </button>
                </Link>
              </div>
            </div>
            
            {/* Footer Links - Outside Card for better visual hierarchy on mobile */}
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
