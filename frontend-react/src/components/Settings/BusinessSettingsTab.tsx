import React, { useState, useEffect } from 'react';
import { useBusinessStore } from '../../store/businessStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { settingsService, BusinessSettings } from '../../services/settingsService';
import { Building2, MapPin, Phone } from 'lucide-react';

export const BusinessSettingsTab = () => {
  const { activeBusiness } = useBusinessStore();
  const [formData, setFormData] = useState<BusinessSettings>({
    name: '',
    address: '',
    city: '',
    phone: '',
    logoUrl: '',
    taxId: '',
    invoicePrefix: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeBusiness) {
      const data = settingsService.getBusiness(activeBusiness);
      setFormData(data);
    }
  }, [activeBusiness]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    setLoading(true);
    try {
      await settingsService.updateBusiness(activeBusiness.id, formData);
      alert('Negocio actualizado correctamente');
    } catch (error) {
      console.error(error);
      alert('Error al actualizar negocio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-3xl animate-in fade-in duration-300">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Building2 className="w-6 h-6 text-purple-500" />
        Datos del Negocio
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Input
              label="Nombre del Negocio"
              name="name"
              value={formData.name}
              onChange={handleChange}
              icon={Building2}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Ej: Tienda de Pedro"
              required
            />
          </div>

          <Input
            label="Dirección"
            name="address"
            value={formData.address}
            onChange={handleChange}
            icon={MapPin}
            className="bg-gray-700 border-gray-600 text-white"
            placeholder="Calle 123 #45-67"
          />

          <Input
            label="Ciudad / Municipio"
            name="city"
            value={formData.city}
            onChange={handleChange}
            className="bg-gray-700 border-gray-600 text-white"
            placeholder="Bogotá D.C."
          />

          <Input
            label="Teléfono / WhatsApp de Contacto"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            icon={Phone}
            className="bg-gray-700 border-gray-600 text-white"
            placeholder="+57 300 000 0000"
          />

          <Input
            label="NIT / RUT (Identificación Fiscal)"
            name="taxId"
            value={formData.taxId}
            onChange={handleChange}
            className="bg-gray-700 border-gray-600 text-white"
            placeholder="900.123.456-7"
          />
          
          <Input
             label="Prefijo de Facturación (Opcional)"
             name="invoicePrefix"
             value={formData.invoicePrefix}
             onChange={handleChange}
             className="bg-gray-700 border-gray-600 text-white"
             placeholder="Ej: FE-"
          />
        </div>

        <div className="pt-4 border-t border-gray-700 flex justify-end">
          <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700">
            {loading ? 'Guardando...' : 'Actualizar Negocio'}
          </Button>
        </div>
      </form>
    </div>
  );
};
