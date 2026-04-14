import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormAlert } from '../ui/FormAlert';
import { Input } from '../ui/Input';
import { useBusinessStore } from '../../store/businessStore';
import { useCustomerStore } from '../../store/customerStore';
import { Customer } from '../../types';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingCustomer?: Customer | null;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingCustomer,
}) => {
  const { activeBusiness } = useBusinessStore();
  const { addCustomer, updateCustomer } = useCustomerStore();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (editingCustomer) {
      setFormData({
        name: editingCustomer.name,
        phone: editingCustomer.phone || '',
        email: editingCustomer.email || '',
        address: editingCustomer.address || '',
        notes: '', // Notes might not be in the basic customer object yet, or handled separately
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
      });
    }
    setSubmitError(null);
  }, [editingCustomer, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;

    setLoading(true);
    setSubmitError(null);
    try {
      if (editingCustomer) {
        await updateCustomer(activeBusiness.id, editingCustomer.id, formData);
      } else {
        await addCustomer(activeBusiness.id, formData);
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      setSubmitError(error?.response?.data?.error || 'No se pudo guardar el cliente. Revisa la información e inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
      data-tour="customers.modal.form"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {submitError ? (
          <FormAlert
            tone="error"
            title="No fue posible guardar el cliente"
            message={submitError}
          />
        ) : null}

        <Input
          label="Nombre Completo"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Teléfono"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="300 123 4567"
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="cliente@ejemplo.com"
          />
        </div>
        <Input
          label="Dirección"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Calle 123 # 45-67"
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Notas Internas</label>
          <textarea
            className="min-h-[112px] w-full resize-none rounded-2xl border border-gray-300 bg-white px-3.5 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Preferencias, detalles adicionales..."
          />
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 dark:border-gray-800 sm:flex-row sm:justify-end sm:gap-3">
          <Button type="button" variant="ghost" onClick={onClose} className="w-full sm:w-auto">Cancelar</Button>
          <Button
            type="submit"
            isLoading={loading}
            className="w-full sm:w-auto"
            data-tour={editingCustomer ? 'customers.modal.update' : 'customers.modal.create'}
          >
            {editingCustomer ? 'Guardar Cambios' : 'Crear Cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
