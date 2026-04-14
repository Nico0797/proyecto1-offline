import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { useBusinessStore } from '../../store/businessStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { isBusinessModuleEnabled } from '../../types';
import { Building2, MapPin, Phone } from 'lucide-react';
import { toast } from 'react-hot-toast';

type BusinessSettingsForm = {
  name: string;
  address: string;
  city: string;
  phone: string;
  logoUrl: string;
  taxId: string;
  invoicePrefix: string;
  autoConsumeRecipesOnSale: boolean;
};

export const BusinessSettingsTab = () => {
  const { activeBusiness, updateBusiness } = useBusinessStore();
  const [formData, setFormData] = useState<BusinessSettingsForm>({
    name: '',
    address: '',
    city: '',
    phone: '',
    logoUrl: '',
    taxId: '',
    invoicePrefix: '',
    autoConsumeRecipesOnSale: false,
  });
  const [loading, setLoading] = useState(false);
  const rawInventoryEnabled = isBusinessModuleEnabled(activeBusiness?.modules, 'raw_inventory');

  useEffect(() => {
    if (activeBusiness) {
      const settings = activeBusiness.settings || {};
      setFormData({
        name: activeBusiness.name || '',
        address: String(settings.address || ''),
        city: String(settings.city || ''),
        phone: String(settings.phone || ''),
        logoUrl: String(settings.logoUrl || settings.logo_url || settings.logo || ''),
        taxId: String(settings.taxId || settings.tax_id || settings.nit || ''),
        invoicePrefix: String(settings.invoicePrefix || settings.invoice_prefix || ''),
        autoConsumeRecipesOnSale: !!settings.auto_consume_recipes_on_sale,
      });
    }
  }, [activeBusiness]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleToggleAutoConsume = () => {
    setFormData((current) => ({
      ...current,
      autoConsumeRecipesOnSale: !current.autoConsumeRecipesOnSale,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    setLoading(true);
    try {
      await updateBusiness(activeBusiness.id, {
        name: formData.name.trim(),
        settings: {
          ...(activeBusiness.settings || {}),
          address: formData.address.trim() || null,
          city: formData.city.trim() || null,
          phone: formData.phone.trim() || null,
          logoUrl: formData.logoUrl.trim() || null,
          taxId: formData.taxId.trim() || null,
          invoicePrefix: formData.invoicePrefix.trim() || null,
          auto_consume_recipes_on_sale: rawInventoryEnabled ? formData.autoConsumeRecipesOnSale : false,
        },
      });
      toast.success('Negocio actualizado correctamente');
    } catch (error) {
      console.error(error);
      toast.error((error as any)?.response?.data?.error || 'Error al actualizar negocio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-surface max-w-3xl animate-in fade-in p-6 duration-300">
      <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
        <Building2 className="w-6 h-6 text-purple-500" />
        Datos del Negocio
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-6" data-tour="settings.business">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <Input
              label="Nombre del Negocio"
              name="name"
              value={formData.name}
              onChange={handleChange}
              icon={Building2}
              placeholder="Ej: Tienda de Pedro"
              required
              className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <Input
            label="Dirección"
            name="address"
            value={formData.address}
            onChange={handleChange}
            icon={MapPin}
            placeholder="Calle 123 #45-67"
          />

          <Input
            label="Ciudad / Municipio"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="Bogotá D.C."
          />

          <Input
            label="Teléfono / WhatsApp de Contacto"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            icon={Phone}
            placeholder="+57 300 000 0000"
          />

          <Input
            label="NIT / RUT (Identificación Fiscal)"
            name="taxId"
            value={formData.taxId}
            onChange={handleChange}
            placeholder="900.123.456-7"
          />
          
          <Input
             label="Prefijo de Facturación (Opcional)"
             name="invoicePrefix"
             value={formData.invoicePrefix}
             onChange={handleChange}
             placeholder="Ej: FE-"
          />
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/40">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">Consumo automático de recetas en ventas</h4>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Si está activo, al crear una venta real el backend intentará consumir automáticamente las materias primas de cada producto con receta activa.
              </p>
              {!rawInventoryEnabled && (
                <p className="mt-2 text-sm text-amber-300">
                  Esta opción requiere que el módulo de inventario bodega esté habilitado.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleToggleAutoConsume}
              disabled={loading || !rawInventoryEnabled}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                formData.autoConsumeRecipesOnSale && rawInventoryEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              } ${loading || !rawInventoryEnabled ? 'opacity-60 cursor-not-allowed' : ''}`}
              aria-pressed={formData.autoConsumeRecipesOnSale}
              aria-label="Cambiar consumo automático de recetas en ventas"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  formData.autoConsumeRecipesOnSale && rawInventoryEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex justify-end border-t border-gray-200 pt-4 dark:border-gray-800">
          <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700">
            {loading ? 'Guardando...' : 'Actualizar Negocio'}
          </Button>
        </div>
      </form>
    </div>
  );
};
