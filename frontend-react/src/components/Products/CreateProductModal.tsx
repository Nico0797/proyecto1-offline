import React, { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { FEATURES } from '../../auth/plan';
import { Product, ProductFulfillmentMode } from '../../types';
import { useBusinessStore } from '../../store/businessStore';
import { useProductStore } from '../../store/productStore';
import { ProGate } from '../ui/ProGate';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CurrencyInput } from '../ui/CurrencyInput';
import { FormAlert } from '../ui/FormAlert';
import { Input } from '../ui/Input';
import { toast } from 'react-hot-toast';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productToEdit?: Product | null;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  productToEdit,
}) => {
  const { activeBusiness } = useBusinessStore();
  const { addProduct, updateProduct } = useProductStore();
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [barcodes, setBarcodes] = useState<string[]>([]);
  const [newBarcode, setNewBarcode] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    price: '',
    cost: '',
    stock: '',
    low_stock_threshold: '5',
    type: 'product' as 'product' | 'service',
    fulfillmentMode: 'resale_stock' as ProductFulfillmentMode,
    unit: 'und',
    image: '',
  });

  useEffect(() => {
    if (productToEdit) {
      setFormData({
        name: productToEdit.name,
        description: productToEdit.description || '',
        sku: productToEdit.sku || '',
        price: productToEdit.price.toString(),
        cost: productToEdit.cost ? productToEdit.cost.toString() : '',
        stock: productToEdit.stock.toString(),
        low_stock_threshold: productToEdit.low_stock_threshold.toString(),
        type: productToEdit.type,
        fulfillmentMode: productToEdit.fulfillment_mode || (productToEdit.type === 'service' ? 'service' : 'resale_stock'),
        unit: productToEdit.unit,
        image: productToEdit.image || '',
      });
      setBarcodes(productToEdit.barcodes || []);
    } else {
      setFormData({
        name: '',
        description: '',
        sku: '',
        price: '',
        cost: '',
        stock: '0',
        low_stock_threshold: '5',
        type: 'product',
        fulfillmentMode: 'resale_stock',
        unit: 'und',
        image: '',
      });
      setBarcodes([]);
    }
    setNewBarcode('');
    setSubmitError(null);
  }, [isOpen, productToEdit]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((current) => ({ ...current, image: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setFormData((current) => ({ ...current, image: '' }));
  };

  const handleAddBarcode = () => {
    const nextBarcode = newBarcode.trim();
    if (!nextBarcode) return;
    if (barcodes.includes(nextBarcode)) {
      alert('Este codigo ya esta en la lista');
      return;
    }
    setBarcodes((current) => [...current, nextBarcode]);
    setNewBarcode('');
  };

  const handleRemoveBarcode = (index: number) => {
    setBarcodes((current) => current.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    setLoading(true);
    setSubmitError(null);

    try {
      const productData = {
        ...formData,
        fulfillment_mode: formData.type === 'service' ? 'service' : formData.fulfillmentMode,
        price: parseFloat(formData.price),
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
        stock: parseFloat(formData.stock) || 0,
        low_stock_threshold: parseFloat(formData.low_stock_threshold) || 0,
        active: true,
        barcodes,
        image: formData.image,
      };

      if (productToEdit) {
        const result = await updateProduct(activeBusiness.id, productToEdit.id, productData);
        if (!result.persisted) {
          setSubmitError('El cambio solo quedó local y no se confirmó en backend. Verifica tu conexión antes de cerrar.');
          return;
        }
        toast.success('Producto actualizado');
      } else {
        const result = await addProduct(activeBusiness.id, productData);
        if (!result.persisted) {
          setSubmitError('El producto solo quedó local y no se confirmó en backend. Verifica tu conexión antes de cerrar.');
          return;
        }
        toast.success('Producto creado');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving product:', error);
      setSubmitError(error?.response?.data?.error || 'No se pudo guardar el producto. Revisa la información e inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={productToEdit ? 'Editar producto' : 'Nuevo producto'}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {submitError ? (
          <FormAlert
            tone="error"
            title="No fue posible guardar el producto"
            message={submitError}
          />
        ) : null}

        <div className="space-y-3 rounded-[22px] border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-800/40">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Imagen</label>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {formData.image ? (
              <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-gray-300 dark:border-gray-700">
                <img src={formData.image} alt="Preview" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute right-0 top-0 rounded-bl-xl bg-red-600 p-1 text-white hover:bg-red-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : null}

            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 dark:text-gray-400"
            />
          </div>
        </div>

        <Input
          label="Nombre"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="Ej: Camiseta talla M"
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</label>
            <select
              className="app-select"
              value={formData.type}
              onChange={(e) => {
                const nextType = e.target.value as 'product' | 'service';
                setFormData({
                  ...formData,
                  type: nextType,
                  fulfillmentMode: nextType === 'service' ? 'service' : formData.fulfillmentMode === 'service' ? 'resale_stock' : formData.fulfillmentMode,
                });
              }}
            >
              <option value="product">Producto</option>
              <option value="service">Servicio</option>
            </select>
          </div>

          <Input
            label="Codigo de barras / SKU"
            value={formData.sku}
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            placeholder="Escanear codigo principal..."
          />
        </div>

        {formData.type === 'product' ? (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Cómo se cumple este producto</label>
            <select
              className="app-select"
              value={formData.fulfillmentMode}
              onChange={(e) => setFormData({ ...formData, fulfillmentMode: e.target.value as ProductFulfillmentMode })}
            >
              <option value="resale_stock">Trabajo con stock terminado</option>
              <option value="make_to_stock">Produzco para tener stock</option>
              <option value="make_to_order">Lo produzco por pedido</option>
            </select>
          </div>
        ) : null}

        <ProGate feature={FEATURES.MULTI_BARCODE}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Codigos de barras adicionales
            </label>
            <div className="mb-2 flex flex-col gap-2 sm:flex-row">
              <Input
                value={newBarcode}
                onChange={(e) => setNewBarcode(e.target.value)}
                placeholder="Escanear o escribir codigo..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddBarcode();
                  }
                }}
              />
              <Button type="button" onClick={handleAddBarcode} variant="secondary" className="w-full sm:w-auto">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {barcodes.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {barcodes.map((code, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    <span>{code}</span>
                    <button type="button" onClick={() => handleRemoveBarcode(idx)} className="ml-1 hover:text-red-400">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </ProGate>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Precio *</label>
            <CurrencyInput
              value={formData.price}
              onChange={(val) => setFormData({ ...formData, price: val ? val.toString() : '' })}
              required
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Costo</label>
            <CurrencyInput
              value={formData.cost}
              onChange={(val) => setFormData({ ...formData, cost: val ? val.toString() : '' })}
              placeholder="0.00"
            />
          </div>
        </div>

        {formData.type === 'product' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Stock actual</label>
              <CurrencyInput
                value={formData.stock}
                onChange={(val) => setFormData({ ...formData, stock: val ? val.toString() : '' })}
                placeholder="0"
                startAdornment="#"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Stock minimo</label>
              <CurrencyInput
                value={formData.low_stock_threshold}
                onChange={(val) => setFormData({ ...formData, low_stock_threshold: val ? val.toString() : '' })}
                placeholder="0"
                startAdornment="#"
              />
            </div>
            <Input
              label="Unidad"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              placeholder="und, kg..."
            />
          </div>
        ) : null}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Descripcion (opcional)</label>
          <textarea
            className="min-h-[112px] w-full resize-none rounded-2xl border border-gray-300 bg-white px-3.5 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 dark:border-gray-800 sm:flex-row sm:justify-end sm:gap-3">
          <Button variant="outline" type="button" onClick={onClose} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
