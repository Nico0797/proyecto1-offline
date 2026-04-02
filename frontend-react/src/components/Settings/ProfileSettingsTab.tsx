import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { settingsService, ProfileSettings } from '../../services/settingsService';
import { Mail, Monitor, Moon, Phone, Save, Sun, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useThemeStore } from '../../store/themeStore';
import { ThemePreference } from '../../utils/theme';
import { cn } from '../../utils/cn';

const THEME_OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof Sun;
}> = [
  {
    value: 'light',
    label: 'Light',
    description: 'Interfaz clara y nítida para el día.',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Menos brillo y mejor contraste nocturno.',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'System',
    description: 'Sigue la preferencia del dispositivo.',
    icon: Monitor,
  },
];

export const ProfileSettingsTab = () => {
  const [formData, setFormData] = useState<ProfileSettings>({
    name: '',
    email: '',
    phone: '',
    currency: 'COP'
  });
  const [loading, setLoading] = useState(false);
  const theme = useThemeStore((state) => state.theme);
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const setTheme = useThemeStore((state) => state.setTheme);

  useEffect(() => {
    const profile = settingsService.getProfile();
    setFormData(profile);
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await settingsService.updateProfile(formData);
      toast.success('Perfil actualizado correctamente');
      window.location.reload(); 
    } catch (error) {
      console.error(error);
      toast.error('Error al actualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-surface max-w-3xl animate-in fade-in space-y-6 p-6 duration-300">
      <h3 className="mb-6 flex items-center gap-2 text-xl font-bold app-text">
        <User className="w-6 h-6 text-blue-500" />
        Información Personal
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Nombre Completo"
            name="name"
            value={formData.name}
            onChange={handleChange}
            icon={User}
            placeholder="Tu nombre"
          />
          <Input
            label="Correo Electrónico"
            name="email"
            value={formData.email}
            onChange={handleChange}
            icon={Mail}
            type="email"
            placeholder="tu@email.com"
            disabled // Often email is unique ID
          />
          <Input
            label="Teléfono"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            icon={Phone}
            placeholder="+57 300 123 4567"
          />
          <div>
            <label className="mb-1 block text-sm font-medium app-text-secondary">Moneda Principal</label>
            <select 
                name="currency"
                value={formData.currency}
                onChange={(e) => setFormData({...formData, currency: e.target.value})}
                className="app-select rounded-lg py-2.5"
            >
                <option value="COP">Peso Colombiano (COP)</option>
                <option value="USD">Dólar (USD)</option>
            </select>
          </div>
        </div>

        <div className="app-muted-panel rounded-2xl p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h4 className="text-base font-semibold app-text">Apariencia</h4>
              <p className="mt-1 text-sm app-text-muted">
                Elige cómo quieres ver la app. Tu selección se guarda en este dispositivo.
              </p>
            </div>
            <span className="app-chip rounded-full px-3 py-1 text-xs font-medium">
              Activo: {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {THEME_OPTIONS.map(({ value, label, description, icon: Icon }) => {
              const isActive = theme === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  aria-pressed={isActive}
                  className={cn(
                    'rounded-2xl border p-4 text-left transition-all',
                    isActive
                      ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-sm dark:border-blue-400/60 dark:bg-blue-500/10 dark:text-blue-100'
                      : 'app-soft-surface app-text-secondary hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'rounded-xl p-2',
                      isActive
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200'
                        : 'bg-gray-100 app-text-muted'
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{label}</div>
                      <div className="mt-1 text-xs app-text-muted">{description}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="app-divider flex justify-end border-t pt-4">
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Cambios'}
            <Save className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </form>
    </div>
  );
};
