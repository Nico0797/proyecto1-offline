import { useState, useEffect } from 'react';
import api from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Store, Check, ShieldCheck, Copy } from 'lucide-react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAccountAccessStore } from '../store/accountAccessStore';

export const Register = () => {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPasswordChecklist, setShowPasswordChecklist] = useState(false);
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    number: false,
    special: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Verification state
  const [verificationCode, setVerificationCode] = useState('');
  const [registeredUser, setRegisteredUser] = useState<{ email: string } | null>(null);
  const [devVerificationCode, setDevVerificationCode] = useState('');

  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    const criteria = {
      length: password.length >= 8,
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    setPasswordCriteria(criteria);
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!passwordCriteria.length || !passwordCriteria.number || !passwordCriteria.special) {
      setError('La contraseña no cumple con los requisitos de seguridad.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);

    try {
      const fullName = `${name} ${surname}`.trim();
      const res = await api.post('/auth/register', { 
        name: fullName, 
        email, 
        password 
      });
      
      const data = res.data;
      const activationRequired = data.activation_required ?? data.verification_required ?? Boolean(data.email_verification_code);
      if (activationRequired) {
        setRegisteredUser({ email });
        setDevVerificationCode(data.verification_code || '');
        setStep('verify');
        
        // Dev convenience: if code is returned in response (dev mode)
        if (data.verification_code) {
          console.log('Dev Code:', data.verification_code);
          // Optional: Auto-fill for dev? No, let user type it or see console.
        }
      } else {
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err: any) {
      const serverError = err.response?.data?.error || err.response?.data?.message;
      setError(serverError || 'Error al registrarse');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const res = await api.post('/auth/verify-email', {
        email: registeredUser?.email || email,
        code: verificationCode
      });
      
      const { user, access_token, refresh_token, token, account_access } = res.data;
      const useToken = access_token || token;
      
      if (useToken) {
        if (refresh_token) {
          localStorage.setItem('refresh_token', refresh_token);
        }
        login(user, useToken);
        useAccountAccessStore.getState().setAccess(account_access || null);
        navigate('/account-access', { replace: true });
      } else {
        setTimeout(() => navigate('/login'), 2000);
      }
      
    } catch (err: any) {
      const serverError = err.response?.data?.error || err.response?.data?.message;
      setError(serverError || 'Código inválido o expirado.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderChecklist = () => (
    <div className={`mt-2 p-3 bg-gray-700/50 rounded-lg text-sm transition-all duration-300 ${showPasswordChecklist ? 'opacity-100 max-h-40' : 'opacity-0 max-h-0 overflow-hidden'}`}>
      <p className="text-gray-300 mb-2 font-medium">La contraseña debe tener:</p>
      <ul className="space-y-1">
        <li className={`flex items-center ${passwordCriteria.length ? 'text-green-400' : 'text-gray-400'}`}>
          {passwordCriteria.length ? <Check className="w-4 h-4 mr-2" /> : <div className="w-4 h-4 mr-2 border border-gray-500 rounded-full" />}
          Mínimo 8 caracteres
        </li>
        <li className={`flex items-center ${passwordCriteria.number ? 'text-green-400' : 'text-gray-400'}`}>
          {passwordCriteria.number ? <Check className="w-4 h-4 mr-2" /> : <div className="w-4 h-4 mr-2 border border-gray-500 rounded-full" />}
          Al menos 1 número
        </li>
        <li className={`flex items-center ${passwordCriteria.special ? 'text-green-400' : 'text-gray-400'}`}>
          {passwordCriteria.special ? <Check className="w-4 h-4 mr-2" /> : <div className="w-4 h-4 mr-2 border border-gray-500 rounded-full" />}
          Al menos 1 carácter especial
        </li>
      </ul>
    </div>
  );

  if (step === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="w-full max-w-md bg-gray-800/50 border border-gray-700 rounded-2xl p-8 shadow-xl backdrop-blur-sm">
          <div className="text-center mb-6">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-400 border border-green-500/20 mb-4">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white">Verificar Email</h1>
            <p className="text-gray-400 mt-2">Hemos enviado un código a {registeredUser?.email || email}</p>
          </div>

          <form onSubmit={handleVerify} className="space-y-6">
            {devVerificationCode && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                  Codigo visible en desarrollo
                </div>
                <div className="mt-2 text-3xl font-bold tracking-[0.28em] text-white">
                  {devVerificationCode}
                </div>
                <p className="mt-2 text-sm text-emerald-100/80">
                  Tambien queda impreso en la consola del backend.
                </p>
                <div className="mt-3 flex justify-center">
                  <Button
                    type="button"
                    variant="secondary"
                    className="gap-2"
                    onClick={async () => {
                      setVerificationCode(devVerificationCode);
                      try {
                        await navigator.clipboard.writeText(devVerificationCode);
                      } catch {
                        // noop
                      }
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Copiar y usar codigo
                  </Button>
                </div>
              </div>
            )}
            <Input
              label="Código de Verificación"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Ingresa el código de 6 dígitos"
              className="text-center text-2xl tracking-widest bg-gray-700 border-gray-600 text-white"
              maxLength={6}
              required
            />

            {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded">{error}</p>}
            
            <Button type="submit" className="w-full py-3 text-lg" isLoading={isLoading}>
              Verificar Cuenta
            </Button>
            
            <Button 
              type="button" 
              variant="secondary" 
              className="w-full mt-2" 
              onClick={() => {
                setStep('register');
                setDevVerificationCode('');
              }}
            >
              Volver
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md bg-gray-800/50 border border-gray-700 rounded-2xl p-8 shadow-xl backdrop-blur-sm">
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-3">
            <Store className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white">Crear Cuenta</h1>
          <p className="text-gray-400">Comienza tu gestión empresarial</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Nombre" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Tu nombre"
              required 
              className="bg-gray-700 border-gray-600 text-white"
            />
            <Input 
              label="Apellido" 
              value={surname} 
              onChange={(e) => setSurname(e.target.value)} 
              placeholder="Tu apellido"
              required
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          
          <Input 
            label="Email" 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="tu@email.com"
            required
            className="bg-gray-700 border-gray-600 text-white"
          />
          
          <div className="relative">
            <Input 
              label="Contraseña" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              onFocus={() => setShowPasswordChecklist(true)}
              placeholder="••••••••"
              required
              className="bg-gray-700 border-gray-600 text-white"
            />
            {renderChecklist()}
          </div>

          <Input 
            label="Verificación de contraseña" 
            type="password" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
            placeholder="Repite tu contraseña"
            required
            className={`bg-gray-700 border-gray-600 text-white ${confirmPassword && password !== confirmPassword ? 'border-red-500 focus:border-red-500' : ''}`}
          />
          {confirmPassword && password !== confirmPassword && (
            <p className="text-red-400 text-xs mt-1">Las contraseñas no coinciden</p>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full py-3 text-lg mt-4 bg-blue-600 hover:bg-blue-700" isLoading={isLoading}>
            Registrarse
          </Button>

          <div className="text-center mt-4">
            <p className="text-gray-400 text-sm">
              ¿Ya tienes cuenta?{' '}
              <Link to={redirect ? `/login?redirect=${redirect}` : "/login"} className="text-blue-400 hover:text-blue-300 font-medium">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
