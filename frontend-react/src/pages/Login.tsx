import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import logo from '../assets/logo.png';

export const Login = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
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
      navigate('/dashboard');
    } catch (err: any) {
      const serverError = err.response?.data?.error || err.response?.data?.message;
      setError(serverError || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-500/5 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-indigo-500/5 blur-[120px]" />
      </div>

      <div className="w-full max-w-lg relative z-10 perspective-1000">
        <div className="bg-gray-900/60 border border-gray-800/60 rounded-3xl p-8 sm:p-12 shadow-2xl backdrop-blur-xl animate-fade-in-up">
          
          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative group mb-0">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 rounded-full blur-xl opacity-70 group-hover:opacity-100 transition duration-500"></div>
              <img 
                src={logo} 
                alt="EnCaja Logo" 
                className="w-full h-80 object-contain relative z-10 drop-shadow-2xl transform transition-transform duration-500 hover:scale-110"
              />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight -mt-0">Bienvenido de nuevo</h1>
            <p className="text-gray-400 text-center max-w-xs mx-auto">
              Ingresa tus credenciales para acceder a tu panel de control
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 ml-1">Correo Electrónico</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                  placeholder="tu@email.com"
                  required
                />
              </div>
            </div>
            
            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-medium text-gray-300">Contraseña</label>
                <a href="#" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
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
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 animate-fade-in">
                <Sparkles className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-900/20 transform transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <span>Entrar ahora</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-gray-800 text-center">
            <p className="text-gray-400 mb-4">¿Aún no tienes una cuenta?</p>
            <Link to="/register" className="block w-full">
              <button className="w-full py-3.5 bg-gray-800 hover:bg-gray-750 text-white border border-gray-700 hover:border-gray-600 rounded-xl font-medium transition-all flex items-center justify-center gap-2">
                Crear cuenta gratis
              </button>
            </Link>
          </div>
        </div>
        
        {/* Footer Links */}
        <div className="mt-8 text-center text-sm text-gray-500 flex justify-center gap-6">
          <Link to="/privacy" className="hover:text-gray-300 transition-colors">Privacidad</Link>
          <Link to="/terms" className="hover:text-gray-300 transition-colors">Términos</Link>
          <Link to="/help" className="hover:text-gray-300 transition-colors">Ayuda</Link>
        </div>
      </div>
    </div>
  );
};
