import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormAlert } from '../ui/FormAlert';
import { Input } from '../ui/Input';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Product, ProductFulfillmentMode } from '../../types';
import { useCategoryStore } from './categoryStore';
import { useProductStore } from '../../store/productStore';
import { useBusinessStore } from '../../store/businessStore';
import { Layers, DollarSign, Info, AlertTriangle, ScanLine, Camera, Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { BarcodeScanner } from '../ui/BarcodeScanner';
import { productLookupService } from '../../services/productLookupService';
import { toast } from 'react-hot-toast';
import { useCamera } from '../../hooks/useCamera';
import { getFulfillmentModeHint, getFulfillmentModeLabel, getFulfillmentModeTone, productTracksFinishedGoodsStock } from './helpers';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product;
  onSuccess: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, product, onSuccess }) => {
  const { activeBusiness } = useBusinessStore();
  const { products, addProduct, updateProduct } = useProductStore();
  const { categories, getCategory, assignCategory } = useCategoryStore();
  const { photo, takePhoto, deletePhoto, setPhoto } = useCamera();

  const [showScanner, setShowScanner] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  
  // Use isLookingUp to prevent warning
  useEffect(() => {
    if (isLookingUp) {
      // Could show a global spinner or disable inputs
    }
  }, [isLookingUp]);

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    type: 'product' | 'service';
    fulfillmentMode: ProductFulfillmentMode;
    sku: string;
    price: number | undefined;
    cost: number | undefined;
    unit: string;
    stock: number;
    low_stock_threshold: number;
    active: boolean;
    categoryId: string;
    image: string;
  }>({
    name: '',
    description: '',
    type: 'product',
    fulfillmentMode: 'resale_stock',
    sku: '',
    price: undefined,
    cost: undefined,
    unit: 'unidad',
    stock: 0,
    low_stock_threshold: 5,
    active: true,
    categoryId: '',
    image: '',
  });

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'price' | 'inventory'>('basic');
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const [barcodes, setBarcodes] = useState<string[]>([]);
  useEffect(() => {
    if (product) {
      const category = getCategory(product.id);
      setFormData({
        name: product.name,
        description: product.description || '',
        type: product.type,
        fulfillmentMode: product.fulfillment_mode || (product.type === 'service' ? 'service' : 'resale_stock'),
        sku: product.sku || '',
        price: product.price,
        cost: product.cost || 0,
        unit: product.unit,
        stock: product.stock,
        low_stock_threshold: product.low_stock_threshold || 5,
        active: product.active,
        categoryId: category?.id || '',
        image: product.image || '',
      });
      if (product.image) {
        setPhoto(product.image);
      }
      setBarcodes(product.barcodes || []);
    } else {
      setFormData({
        name: '',
        description: '',
        type: 'product',
        fulfillmentMode: 'resale_stock',
        sku: '',
        price: undefined,
        cost: undefined,
        unit: 'unidad',
        stock: 0,
        low_stock_threshold: 5,
        active: true,
        categoryId: '',
        image: '',
      });
      deletePhoto();
      setBarcodes([]);
    }
    setSubmitError(null);
  }, [product, isOpen]);

  useEffect(() => {
    if (photo) {
      setFormData(prev => ({ ...prev, image: photo }));
    }
    // Only clear if photo is explicitly null/undefined (e.g. deleted), not if it just hasn't been set yet
    // But we need to handle the case where user clears photo.
    // Let's rely on setPhoto/deletePhoto to update 'photo' state.
    // If 'photo' becomes null, we clear image in formData.
    else if (photo === null) {
        setFormData(prev => ({ ...prev, image: '' }));
    }
  }, [photo]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Update both formData and Camera hook state so UI stays in sync
        setFormData(prev => ({ ...prev, image: result }));
        setPhoto(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;

    setLoading(true);
    setSubmitError(null);
    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        fulfillment_mode: formData.type === 'service' ? 'service' : formData.fulfillmentMode,
        sku: formData.sku,
        price: Number(formData.price),
        cost: Number(formData.cost),
        unit: formData.unit,
        stock: Number(formData.stock),
        low_stock_threshold: Number(formData.low_stock_threshold),
        active: formData.active,
        image: formData.image,
        barcodes: barcodes,
      };

      let productId = product?.id;

      if (product) {
        const result = await updateProduct(activeBusiness.id, product.id, productData);
        if (!result.persisted) {
          setSubmitError('El cambio solo quedó local y no se confirmó en backend. Verifica tu conexión antes de cerrar.');
          return;
        }
        toast.success('Producto actualizado');
      } else {
        // Since addProduct returns void in the store but updates the state, we can't get the ID easily unless the store returns it.
        // For now, let's assume we can't assign category immediately for new products if store doesn't return ID.
        // BUT, looking at productStore.ts:
        // const response = await api.post(...)
        // set((state) => ({ products: [...state.products, response.data.product] }));
        // It doesn't return the product. I might need to refactor the store or just fetch products again.
        // Wait, I can modify the store to return the product. But user said "No romper CRUD actual".
        // I will just execute the addProduct.
        const result = await addProduct(activeBusiness.id, productData);
        if (!result.persisted) {
          setSubmitError('El producto solo quedó local y no se confirmó en backend. Verifica tu conexión antes de cerrar.');
          return;
        }
        if (formData.categoryId) {
          const created = [...products].reverse().find(p => p.name === formData.name && p.sku === formData.sku && p.active === true);
          if (created) {
            assignCategory(created.id, formData.categoryId);
          }
        }
        toast.success('Producto creado');
      }

      // If we have an ID (edit mode), we can assign category.
      // If create mode, we might miss assigning category unless we find the new product.
      // For now, let's just handle category for edit or if we can find it.
      
      if (productId && formData.categoryId) {
          assignCategory(productId, formData.categoryId);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      setSubmitError((error as any)?.response?.data?.error || 'Error al guardar el producto');
    } finally {
      setLoading(false);
    }
  };

  const margin = (formData.price || 0) > 0 ? (((formData.price || 0) - (formData.cost || 0)) / (formData.price || 0)) * 100 : 0;
  const selectedFulfillmentMode = formData.type === 'service' ? 'service' : formData.fulfillmentMode;
  const tracksFinishedGoodsStock = productTracksFinishedGoodsStock({ type: formData.type, fulfillment_mode: selectedFulfillmentMode });

  const handleScan = async (code: string) => {
    setShowScanner(false);
    
    // Si estamos creando un producto nuevo y no tiene nombre, intentar buscarlo
    if (!product && !formData.name) {
      setIsLookingUp(true);
      const toastId = toast.loading('Buscando información del producto...');
      try {
        const info = await productLookupService.lookupByBarcode(code);
        if (info) {
          setFormData(prev => ({ 
            ...prev, 
            sku: code,
            name: info.name, 
            description: info.description || prev.description 
          }));
          toast.success('Producto encontrado', { id: toastId });
        } else {
            setFormData(prev => ({ ...prev, sku: code }));
            toast.error('Producto no encontrado en la base de datos global. Ingresa los datos manualmente.', { id: toastId });
        }
      } catch (e) {
        setFormData(prev => ({ ...prev, sku: code }));
        toast.dismiss(toastId);
      } finally {
        setIsLookingUp(false);
      }
    } else {
        // Solo actualizar SKU si ya estamos editando o ya hay nombre
        setFormData(prev => ({ ...prev, sku: code }));
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={product ? 'Editar Producto' : 'Nuevo Producto'} className="max-w-5xl h-[90vh] flex flex-col" data-tour="products.modal.form">
      <div className="flex flex-col md:flex-row h-full overflow-hidden">
        {/* Sidebar Tabs - Mobile: Top horizontal, Desktop: Left vertical */}
        <div className="app-soft-surface w-full shrink-0 border-b md:w-60 md:border-b-0 md:border-r p-2 md:p-3">
          <div className="grid grid-cols-2 gap-2 md:flex md:flex-col">
          <button
            className={`min-w-0 md:w-full text-left px-3 md:px-4 py-2 md:py-3 rounded-xl transition-all flex items-center justify-center md:justify-start gap-2 md:gap-3 ${
              activeTab === 'basic' 
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium shadow-sm' 
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
            onClick={() => setActiveTab('basic')}
          >
            <div className={`p-1.5 md:p-2 rounded-lg ${activeTab === 'basic' ? 'bg-blue-100 dark:bg-blue-800' : 'app-chip'}`}>
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-sm md:text-base leading-tight text-center md:text-left">Información Básica</span>
          </button>

          <button
            className={`min-w-0 md:w-full text-left px-3 md:px-4 py-2 md:py-3 rounded-xl transition-all flex items-center justify-center md:justify-start gap-2 md:gap-3 ${
              activeTab === 'price' 
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium shadow-sm' 
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
            onClick={() => setActiveTab('price')}
          >
            <div className={`p-1.5 md:p-2 rounded-lg ${activeTab === 'price' ? 'bg-blue-100 dark:bg-blue-800' : 'app-chip'}`}>
              <DollarSign className="w-4 h-4" />
            </div>
            <span className="text-sm md:text-base leading-tight text-center md:text-left">Precios y Costos</span>
          </button>

          {formData.type === 'product' && (
            <button
              className={`min-w-0 col-span-2 md:col-span-1 md:w-full text-left px-3 md:px-4 py-2 md:py-3 rounded-xl transition-all flex items-center justify-center md:justify-start gap-2 md:gap-3 ${
                activeTab === 'inventory' 
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
              onClick={() => setActiveTab('inventory')}
            >
              <div className={`p-1.5 md:p-2 rounded-lg ${activeTab === 'inventory' ? 'bg-blue-100 dark:bg-blue-800' : 'app-chip'}`}>
                <Layers className="w-4 h-4" />
              </div>
              <span className="text-sm md:text-base leading-tight text-center md:text-left">Inventario</span>
            </button>
          )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <form onSubmit={handleSubmit} className="flex h-full flex-col">
            {submitError ? (
              <div className="border-b border-gray-200 px-4 py-4 dark:border-gray-800 md:px-6">
                <FormAlert
                  title="No fue posible guardar el producto"
                  message={submitError}
                  tone="error"
                />
              </div>
            ) : null}
            <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5 custom-scrollbar">
            {activeTab === 'basic' && (
                <div className="space-y-6 animate-fade-in-up">
                <div className="app-soft-surface rounded-2xl px-4 py-3">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Información básica del producto</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Organiza primero la identidad visual y los datos principales para que el registro quede claro desde el inicio.</p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start">
                {/* Left Column - Image */}
                <div className="space-y-4">
                    <div className="app-surface rounded-3xl p-4 shadow-sm">
                    <div className="app-empty-state relative flex min-h-[280px] flex-col items-center justify-center overflow-hidden rounded-2xl border-2 p-5 transition-colors group hover:border-blue-500">
                        {photo ? (
                            <>
                            <img src={photo} alt="Producto" className="absolute inset-0 w-full h-full object-cover rounded-2xl shadow-sm" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                                <button type="button" onClick={() => takePhoto()} className="app-icon-button rounded-full p-2 text-gray-900 transition-transform hover:scale-110">
                                    <Camera className="w-5 h-5" />
                                </button>
                                <button type="button" onClick={deletePhoto} className="p-2 bg-red-500 rounded-full text-white hover:scale-110 transition-transform">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                            </>
                        ) : (
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto">
                                    <ImageIcon className="w-8 h-8" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Imagen del producto</p>
                                    <p className="text-xs text-gray-500 mt-1">Arrastra o selecciona una imagen</p>
                                </div>
                                <div className="flex gap-2 justify-center">
                                    <Button type="button" size="sm" variant="secondary" onClick={() => takePhoto()}>
                                        <Camera className="w-4 h-4 mr-1" /> Cámara
                                    </Button>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <Button type="button" size="sm" variant="outline">
                                            <Upload className="w-4 h-4 mr-1" /> Subir
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
                        <Button type="button" variant="secondary" onClick={() => takePhoto()} className="justify-center">
                            <Camera className="w-4 h-4 mr-1" /> Cámara
                        </Button>
                        <div className="relative">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <Button type="button" variant="outline" className="w-full justify-center">
                                <Upload className="w-4 h-4 mr-1" /> Subir imagen
                            </Button>
                        </div>
                    </div>
                    </div>
                </div>

                {/* Right Column - Form Data */}
                <div className="app-surface space-y-5 rounded-3xl p-5 shadow-sm md:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Item</label>
                            <select
                                className="app-select rounded-xl px-4 py-2.5"
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
                                <option value="product">📦 Producto Físico</option>
                                <option value="service">🛠️ Servicio</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Categoría</label>
                            <select
                                className="app-select rounded-xl px-4 py-2.5"
                                value={formData.categoryId}
                                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                            >
                                <option value="">-- Sin categoría --</option>
                                {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {formData.type === 'product' && (
                      <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cómo se cumple este producto</label>
                          <select
                            className="app-select rounded-xl px-4 py-2.5"
                            value={formData.fulfillmentMode}
                            onChange={(e) => setFormData({ ...formData, fulfillmentMode: e.target.value as ProductFulfillmentMode })}
                          >
                            <option value="resale_stock">Trabajo con stock terminado</option>
                            <option value="make_to_stock">Produzco para tener stock</option>
                            <option value="make_to_order">Lo produzco por pedido</option>
                          </select>
                        </div>
                        <div className={`rounded-xl px-3 py-3 text-sm ${getFulfillmentModeTone({ type: formData.type, fulfillment_mode: selectedFulfillmentMode })}`}>
                          <div className="font-semibold">Modo operativo: {getFulfillmentModeLabel({ type: formData.type, fulfillment_mode: selectedFulfillmentMode })}</div>
                          <p className="mt-1 opacity-90">{getFulfillmentModeHint({ type: formData.type, fulfillment_mode: selectedFulfillmentMode })}</p>
                        </div>
                      </div>
                    )}

                    <Input
                        label="Nombre del Producto"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="Ej. Camiseta Polo Premium"
                        className="text-lg min-h-[52px]"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="relative">
                            <Input
                                label="SKU / Código"
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                placeholder="Ej. POL-001"
                                className="pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowScanner(true)}
                                className="app-icon-button absolute right-2 top-[34px] rounded-lg p-2 text-gray-400 transition-colors hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                            >
                                <ScanLine className="w-5 h-5" />
                            </button>
                        </div>
                        <Input
                            label="Unidad de Medida"
                            value={formData.unit}
                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                            placeholder="Ej. unidad, kg, litro"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Descripción</label>
                        <textarea
                            className="app-textarea h-24 rounded-xl resize-none px-4 py-3"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Detalles adicionales, características, etc."
                        />
                    </div>
                </div>
                </div>
                </div>
            )}

            {activeTab === 'price' && (
                <div className="max-w-2xl mx-auto space-y-8 animate-fade-in-up pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <CurrencyInput
                    label="Precio de Venta"
                    value={formData.price}
                    onChange={(val) => setFormData({ ...formData, price: val })}
                    required
                    min={0}
                    icon={DollarSign}
                    placeholder="0.00"
                    className="text-xl font-semibold"
                    />
                    <CurrencyInput
                    label="Costo de Adquisición"
                    value={formData.cost}
                    onChange={(val) => setFormData({ ...formData, cost: val })}
                    min={0}
                    icon={DollarSign}
                    placeholder="0.00"
                    />
                </div>

                <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 dark:border-blue-800/50 dark:from-blue-900/20 dark:to-indigo-900/20">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 gap-4">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Margen de Ganancia</p>
                        <div className="flex items-baseline gap-2">
                        <h3 className={`text-4xl font-bold tracking-tight ${margin < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {margin.toFixed(1)}%
                        </h3>
                        <span className="text-sm text-gray-500 font-medium">de utilidad</span>
                        </div>
                    </div>
                    <div className="text-left sm:text-right">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Ganancia Neta</p>
                        <p className={`text-2xl font-bold ${margin < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        ${((formData.price || 0) - (formData.cost || 0)).toLocaleString()}
                        </p>
                    </div>
                    </div>
                    
                    <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200 shadow-inner dark:bg-gray-700">
                    <div 
                        className={`h-full transition-all duration-500 ease-out ${margin < 0 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }}
                    />
                    </div>
                </div>
                </div>
            )}

            {activeTab === 'inventory' && (
                <div className="max-w-2xl mx-auto space-y-8 animate-fade-in-up pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="app-soft-surface space-y-4 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                <Layers className="w-5 h-5" />
                            </div>
                            <h3 className="font-medium text-gray-900 dark:text-white">{tracksFinishedGoodsStock ? 'Stock actual' : 'Stock terminado no obligatorio'}</h3>
                        </div>
                        <Input
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })}
                        required
                        min="0"
                        disabled={!tracksFinishedGoodsStock}
                        className="h-auto border-none bg-transparent p-0 text-center text-3xl font-bold tabular-nums focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="0"
                        />
                        <p className="text-xs text-gray-500">{tracksFinishedGoodsStock ? 'Unidades disponibles en inventario terminado' : 'Este modo no depende de un stock fijo de producto terminado como flujo principal.'}</p>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-800/30 dark:bg-amber-900/10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <h3 className="font-medium text-gray-900 dark:text-white">Alerta de Stock</h3>
                        </div>
                        <Input
                        type="number"
                        value={formData.low_stock_threshold}
                        onChange={(e) => setFormData({ ...formData, low_stock_threshold: parseFloat(e.target.value) || 0 })}
                        min="0"
                        disabled={!tracksFinishedGoodsStock}
                        className="h-auto border-none bg-transparent p-0 text-center text-3xl font-bold tabular-nums text-amber-700 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 dark:text-amber-400"
                        placeholder="0"
                        />
                        <p className="text-xs text-amber-600/70 dark:text-amber-500/70">{tracksFinishedGoodsStock ? 'Notificar cuando baje de esta cantidad' : 'La alerta cobra sentido cuando trabajas con stock terminado.'}</p>
                    </div>
                </div>

                <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-900/20 flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                    {tracksFinishedGoodsStock
                      ? 'Usa inventario para definir stock terminado y alertas. En la vista de productos podrás diferenciar entre ajuste manual y registrar producción.'
                      : 'Este producto se cumple sin depender de stock terminado fijo. El mensaje al usuario debe enfocarse en pedido, servicio o cumplimiento, no en reabastecer stock.'}
                    </p>
                </div>
                </div>
            )}
            
            </div>

            <div className="app-page-header app-divider shrink-0 border-t px-4 py-4 md:px-6 md:py-5">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" onClick={onClose} size="lg" className="w-full sm:w-auto">
                Cancelar
                </Button>
                <Button type="submit" isLoading={loading} size="lg" className="w-full px-8 shadow-lg shadow-blue-500/20 sm:w-auto" data-tour="products.modal.confirm">
                {product ? 'Guardar Cambios' : 'Crear Producto'}
                </Button>
              </div>
            </div>
            </form>
        </div>
      </div>
      
      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </Modal>
  );
};
