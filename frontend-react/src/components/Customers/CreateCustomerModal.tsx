import React, { useState, useEffect } from 'react';
import { useBusinessStore } from '../../store/businessStore';
import { useCustomerStore } from '../../store/customerStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Customer } from '../../types';

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customerToEdit?: Customer | null;
}

export const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  customerToEdit,
}) => {
  const { activeBusiness } = useBusinessStore();
  const { addCustomer, updateCustomer } = useCustomerStore();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    email: '',
  });

  useEffect(() => {
    if (customerToEdit) {
      setFormData({
        name: customerToEdit.name,
        phone: customerToEdit.phone || '',
        address: customerToEdit.address || '',
        email: customerToEdit.email || '',
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        address: '',
        email: '',
      });
    }
  }, [customerToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // if (!activeBusiness) return; // Removed activeBusiness check
    setLoading(true);
    try {
      const businessId = activeBusiness?.id || 0; // Default to 0 if no business
      const customerData: any = { ...formData };
      
      // Remove email if it's empty, or handle it if backend doesn't support it
      // Based on server.py, the customers table doesn't have an email column
      // We should probably remove it from the payload to avoid potential confusion, 
      // although server.py's post_customer currently ignores extra fields silently.
      // However, if we want to be clean:
      delete customerData.email;

      if (customerToEdit) {
        await updateCustomer(businessId, customerToEdit.id, customerData);
      } else {
        await addCustomer(businessId, customerData);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving customer:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customerToEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Nombre
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            placeholder="Nombre del cliente"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Teléfono
          </label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Número de contacto"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Email (Opcional)
          </label>
          <Input
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="correo@ejemplo.com"
            type="email"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Dirección
          </label>
          <Input
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Dirección física"
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            type="button"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Guardando...' : (customerToEdit ? 'Actualizar' : 'Guardar')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
