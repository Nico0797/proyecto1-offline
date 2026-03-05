import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { settingsService, ProfileSettings } from '../../services/settingsService';
import { User, Mail, Phone, Save } from 'lucide-react';

export const ProfileSettingsTab = () => {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState<ProfileSettings>({
    name: '',
    email: '',
    phone: '',
    currency: 'COP'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const profile = settingsService.getProfile();
    setFormData(profile);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await settingsService.updateProfile(formData);
      alert('Perfil actualizado correctamente');
      // Force reload or state update if needed
      window.location.reload(); 
    } catch (error) {
      console.error(error);
      alert('Error al actualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-2xl animate-in fade-in duration-300">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
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
            className="bg-gray-700 border-gray-600 text-white"
            placeholder="Tu nombre"
          />
          <Input
            label="Correo Electrónico"
            name="email"
            value={formData.email}
            onChange={handleChange}
            icon={Mail}
            type="email"
            className="bg-gray-700 border-gray-600 text-white"
            placeholder="tu@email.com"
            disabled // Often email is unique ID
          />
          <Input
            label="Teléfono"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            icon={Phone}
            className="bg-gray-700 border-gray-600 text-white"
            placeholder="+57 300 123 4567"
          />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Moneda Principal</label>
            <select 
                name="currency"
                value={formData.currency}
                onChange={(e) => setFormData({...formData, currency: e.target.value})}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
            >
                <option value="COP">Peso Colombiano (COP)</option>
                <option value="USD">Dólar (USD)</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-700 flex justify-end">
          <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? 'Guardando...' : 'Guardar Cambios'}
            <Save className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </form>
    </div>
  );
};
