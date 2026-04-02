import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ArrowRight, User, Lock, Mail } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

export const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuthStore();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'register'>('loading');
  const [message, setMessage] = useState('Procesando invitación...');
  const [inviteInfo, setInviteInfo] = useState<any>(null);
  
  // Form states
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('El enlace de invitación no es válido o ha expirado.');
      return;
    }

    if (isAuthenticated) {
        // If already logged in, just accept directly
        acceptInvitation();
    } else {
        // If not logged in, fetch info and show register form
        fetchInviteInfo();
    }
  }, [token, isAuthenticated]);

  const fetchInviteInfo = async () => {
      try {
          const res = await api.get(`/invitations/info?token=${token}`);
          setInviteInfo(res.data);
          setStatus('register');
      } catch (err: any) {
          console.error('Error fetching invite info:', err);
          setStatus('error');
          setMessage(err.response?.data?.error || 'Error al validar la invitación.');
      }
  };

  const acceptInvitation = async () => {
    try {
      await api.post('/invitations/accept', { token });
      setStatus('success');
      setMessage('¡Te has unido al equipo correctamente!');
    } catch (err: any) {
      console.error('Error accepting invite:', err);
      setStatus('error');
      const errorMsg = err.response?.data?.error || 'Error al aceptar la invitación.';
      
      // Handle specific error: "Already a member"
      if (errorMsg.includes('ya es miembro')) {
          setStatus('success'); // Treat as success
          setMessage('Ya eres parte de este equipo.');
      } else {
          setMessage(errorMsg);
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name || !password) return;
      
      setIsSubmitting(true);
      try {
          const res = await api.post('/invitations/register', {
              token,
              name,
              password
          });
          
          // Auto login
          if (res.data.access_token && res.data.user) {
              login(res.data.user, res.data.access_token);
              // Wait a bit for state update then redirect
              setStatus('success');
              setMessage('¡Cuenta creada y unida al equipo!');
              setTimeout(() => {
                  navigate('/dashboard');
              }, 1500);
          }
      } catch (err: any) {
          console.error('Registration error:', err);
          // If user exists, suggest login
          if (err.response?.data?.error?.includes('ya existe')) {
              setMessage('Este correo ya está registrado. Por favor inicia sesión.');
              setStatus('error'); // Or show login button
          } else {
              setMessage(err.response?.data?.error || 'Error al registrar.');
              setStatus('error');
          }
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center items-center p-4 text-white relative isolate">
       {/* Background Effects */}
       <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md bg-gray-900/90 border border-gray-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center">
          {status === 'loading' && (
            <div className="flex flex-col items-center py-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
                <Loader2 className="w-16 h-16 text-blue-500 animate-spin relative z-10" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Uniendo al equipo...</h2>
              <p className="text-gray-400">Por favor espera un momento.</p>
            </div>
          )}

          {status === 'register' && inviteInfo && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/20">
                      <User className="w-8 h-8 text-white" />
                  </div>
                  
                  <h2 className="text-2xl font-bold text-white mb-2">Crear tu cuenta</h2>
                  <p className="text-gray-400 mb-6 text-sm">
                      Has sido invitado a unirte a <span className="text-white font-semibold">{inviteInfo.business_name}</span> como <span className="text-blue-400">{inviteInfo.role_name}</span>.
                  </p>

                  <form onSubmit={handleRegister} className="space-y-4 text-left">
                      <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1">Correo Electrónico</label>
                          <div className="relative">
                              <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                              <input 
                                  type="email" 
                                  value={inviteInfo.email} 
                                  disabled 
                                  className="w-full bg-gray-950/50 border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-gray-400 cursor-not-allowed focus:outline-none"
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1">Nombre Completo</label>
                          <div className="relative">
                              <User className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                              <input 
                                  type="text" 
                                  value={name}
                                  onChange={(e) => setName(e.target.value)}
                                  placeholder="Ej. Juan Pérez"
                                  required
                                  className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-600"
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1">Contraseña</label>
                          <div className="relative">
                              <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                              <input 
                                  type="password" 
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  placeholder="Mínimo 6 caracteres"
                                  required
                                  minLength={6}
                                  className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-600"
                              />
                          </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-900/20 transform transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Creando cuenta...</span>
                            </>
                        ) : (
                            <>
                                <span>Unirse al equipo</span>
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                      </button>
                      
                      <div className="text-center pt-2">
                          <button 
                              type="button"
                              onClick={() => {
                                  const redirectUrl = `/accept-invite?token=${token}`;
                                  navigate(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
                              }}
                              className="text-xs text-gray-500 hover:text-white transition-colors"
                          >
                              ¿Ya tienes cuenta? Inicia sesión
                          </button>
                      </div>
                  </form>
              </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center py-8 animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 border border-green-500/20">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">¡Bienvenido!</h2>
              <p className="text-gray-400 mb-8">{message}</p>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-900/20 transform transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                Ir al Dashboard
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center py-8">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                <XCircle className="w-10 h-10 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Algo salió mal</h2>
              <p className="text-gray-400 mb-8 max-w-xs mx-auto">{message}</p>
              
              {message.includes('ya existe') ? (
                  <button
                    onClick={() => {
                        const redirectUrl = `/accept-invite?token=${token}`;
                        navigate(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
                    }}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-900/20"
                  >
                    Iniciar Sesión
                  </button>
              ) : (
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors border border-gray-700"
                  >
                    Volver al inicio
                  </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
