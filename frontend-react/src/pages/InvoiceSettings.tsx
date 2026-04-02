import { ChangeEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, Palette, Save, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { CompactActionGroup, PageBody, PageHeader, PageLayout } from '../components/Layout/PageLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { InvoiceDocumentPreview } from '../components/Invoices/InvoiceDocumentPreview';
import { buildPreviewInvoice } from '../components/Invoices/invoiceHelpers';
import api from '../services/api';
import { invoicesService } from '../services/invoicesService';
import { useBusinessStore } from '../store/businessStore';
import { InvoiceSettings as InvoiceSettingsType } from '../types';

const DEFAULT_SETTINGS: InvoiceSettingsType = {
  prefix: 'INV',
  brand_color: '#2563EB',
  accent_color: '#0F172A',
  footer_text: 'Gracias por tu confianza.',
  default_notes: 'Gracias por elegirnos.',
  default_terms: 'Pago segun fecha de vencimiento.',
  logo_url: '',
};

export const InvoiceSettings = () => {
  const navigate = useNavigate();
  const { activeBusiness } = useBusinessStore();
  const [settings, setSettings] = useState<InvoiceSettingsType>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeBusiness) return;
    setLoading(true);
    invoicesService.getSettings(activeBusiness.id)
      .then((response) => setSettings({ ...DEFAULT_SETTINGS, ...response }))
      .catch((error: any) => {
        toast.error(error?.response?.data?.error || 'No fue posible cargar la configuracion de facturas');
      })
      .finally(() => setLoading(false));
  }, [activeBusiness]);

  const handleLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!activeBusiness || !event.target.files?.[0]) return;

    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('logo', file);

    try {
      const response = await api.post(`/businesses/${activeBusiness.id}/logo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const nextLogo = response.data?.logo_url || '';
      setSettings((current) => ({ ...current, logo_url: nextLogo }));
      toast.success('Logo cargado correctamente');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'No fue posible subir el logo');
    } finally {
      event.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!activeBusiness) return;
    setSaving(true);
    try {
      const response = await invoicesService.updateSettings(activeBusiness.id, settings);
      setSettings({ ...DEFAULT_SETTINGS, ...response });
      toast.success('Configuracion de facturas actualizada');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'No fue posible guardar la configuracion');
    } finally {
      setSaving(false);
    }
  };

  const previewInvoice = buildPreviewInvoice({
    business: activeBusiness,
    customer: null,
    settings,
    values: {
      invoice_number: `${settings.prefix || 'INV'}-000321`,
      status: 'sent',
      issue_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().split('T')[0],
      currency: activeBusiness?.currency || 'COP',
      notes: settings.default_notes || '',
      items: [
        {
          description: 'Servicio de gestion administrativa',
          quantity: 1,
          unit_price: 180000,
          discount: 10000,
          tax_rate: 19,
          line_total: 202300,
        },
        {
          description: 'Linea manual premium',
          quantity: 2,
          unit_price: 45000,
          discount: 0,
          tax_rate: 0,
          line_total: 90000,
        },
      ],
    },
  });

  return (
    <PageLayout>
      <PageHeader
        title="Ajustes de facturacion"
        description="Define numeracion, branding y textos base para que cada factura salga consistente en web, movil y PDF."
        action={(
          <CompactActionGroup
            collapseLabel="Mas"
            primary={(
              <Button onClick={handleSave} isLoading={saving} className="w-full sm:w-auto">
                <Save className="h-4 w-4" /> Guardar cambios
              </Button>
            )}
            secondary={(
              <Button variant="secondary" onClick={() => navigate('/invoices')} className="w-full sm:w-auto">
                Volver
              </Button>
            )}
          />
        )}
      />

      <PageBody className="app-canvas">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="app-surface rounded-[28px] p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Identidad del documento</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Personaliza lo que ve el cliente sin tocar la arquitectura principal del negocio.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Input
                  label="Prefijo"
                  value={settings.prefix}
                  onChange={(event) => setSettings((current) => ({ ...current, prefix: event.target.value.toUpperCase() }))}
                  placeholder="INV"
                />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Logo</label>
                  <label className="app-muted-panel flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border-dashed text-sm text-gray-600 transition hover:border-blue-400 hover:bg-blue-50 dark:text-gray-300 dark:hover:border-blue-900/50 dark:hover:bg-blue-900/10">
                    <ImagePlus className="h-4 w-4" />
                    Subir logo
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                </div>
                <Input
                  label="URL logo"
                  value={settings.logo_url || ''}
                  onChange={(event) => setSettings((current) => ({ ...current, logo_url: event.target.value }))}
                  placeholder="/assets/logo.png"
                />
                <Input
                  label="Pie de pagina"
                  value={settings.footer_text || ''}
                  onChange={(event) => setSettings((current) => ({ ...current, footer_text: event.target.value }))}
                  placeholder="Gracias por tu confianza."
                />
              </div>
            </div>

            <div className="app-surface rounded-[28px] p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-violet-50 p-3 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300">
                  <Palette className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Paleta y textos base</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Estos ajustes alimentan la vista previa y el documento PDF.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Color principal</label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={settings.brand_color}
                      onChange={(event) => setSettings((current) => ({ ...current, brand_color: event.target.value }))}
                      className="app-field-surface h-11 w-14 rounded-xl p-1"
                    />
                    <Input
                      value={settings.brand_color}
                      onChange={(event) => setSettings((current) => ({ ...current, brand_color: event.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Color de acento</label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={settings.accent_color}
                      onChange={(event) => setSettings((current) => ({ ...current, accent_color: event.target.value }))}
                      className="app-field-surface h-11 w-14 rounded-xl p-1"
                    />
                    <Input
                      value={settings.accent_color}
                      onChange={(event) => setSettings((current) => ({ ...current, accent_color: event.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Notas por defecto</label>
                  <textarea
                    value={settings.default_notes || ''}
                    onChange={(event) => setSettings((current) => ({ ...current, default_notes: event.target.value }))}
                    className="app-textarea min-h-[130px]"
                    placeholder="Gracias por elegirnos."
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Terminos por defecto</label>
                  <textarea
                    value={settings.default_terms || ''}
                    onChange={(event) => setSettings((current) => ({ ...current, default_terms: event.target.value }))}
                    className="app-textarea min-h-[130px]"
                    placeholder="Pago segun fecha de vencimiento."
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Se respetan saltos de linea y textos largos en la vista imprimible y el PDF.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="app-surface rounded-[28px] p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Vista previa en vivo</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {loading ? 'Cargando configuracion...' : 'Asi se vera una factura profesional con estos ajustes.'}
                  </p>
                </div>
              </div>
              <InvoiceDocumentPreview
                business={activeBusiness}
                invoice={previewInvoice}
                settings={settings}
                compact
              />
            </div>
          </div>
        </div>
      </PageBody>
    </PageLayout>
  );
};
