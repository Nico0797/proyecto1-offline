import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import logo from '../../assets/logo.png';

export const AdminLogin = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

      // Check admin permissions
      const isAdmin = user?.is_admin || user?.permissions?.admin || (user?.roles && user.roles.some((r: any) => r.name === 'ADMIN'));
      
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
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10 pointer-events-none"></div>
      
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-slate-800/50 rounded-2xl flex items-center justify-center mb-4 border border-slate-700 shadow-lg group">
            <img src={logo} alt="Logo" className="w-12 h-12 object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
            <div className="absolute -bottom-2 -right-2 bg-blue-600 rounded-full p-1.5 shadow-lg border-2 border-slate-900">
              <Shield size={14} className="text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Panel Administrativo</h1>
          <p className="text-slate-400 text-sm mt-1">Acceso restringido a personal autorizado</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            id="email"
            type="email"
            label="Correo Electrónico"
            placeholder="admin@encaja.co"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-slate-800 border-slate-700 text-white focus:border-blue-500"
          />
          <Input
            id="password"
            type="password"
            label="Contraseña"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-slate-800 border-slate-700 text-white focus:border-blue-500"
          />

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center flex items-center justify-center gap-2">
              <Lock size={14} />
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20" 
            isLoading={isLoading}
          >
            Ingresar al Panel
          </Button>
          
          <div className="text-center mt-4">
            <a href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              ← Volver a la aplicación principal
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};
