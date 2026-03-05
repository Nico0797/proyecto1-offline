import React, { useState } from 'react';
import { Product } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ArrowRight, Calculator, Check } from 'lucide-react';
import { useProductStore } from '../../store/productStore';
import { useBusinessStore } from '../../store/businessStore';
import { moneyCOP } from './helpers';

interface PricingToolsTabProps {
  products: Product[];
  selectedIds: number[];
  onRefresh: () => void;
}

export const PricingToolsTab: React.FC<PricingToolsTabProps> = ({ products, selectedIds, onRefresh }) => {
  const { activeBusiness } = useBusinessStore();
  const { updateProduct } = useProductStore();
  
  const [adjustmentType, setAdjustmentType] = useState<'percentage' | 'fixed'>('percentage');
  const [adjustmentValue, setAdjustmentValue] = useState<number>(0);
  const [operation, setOperation] = useState<'increase' | 'decrease'>('increase');
  const [rounding, setRounding] = useState<number>(0); // 0 = none, 100 = round to nearest 100
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(true);

  const targetProducts = selectedIds.length > 0 
    ? products.filter(p => selectedIds.includes(p.id)) 
    : products;

  const calculateNewPrice = (currentPrice: number) => {
    let newPrice = currentPrice;
    
    if (adjustmentType === 'percentage') {
      const factor = 1 + (adjustmentValue / 100);
      newPrice = operation === 'increase' ? currentPrice * factor : currentPrice / factor;
      // For decrease with percentage, usually it's price * (1 - pct). But let's stick to simple logic.
      if (operation === 'decrease') {
          newPrice = currentPrice * (1 - (adjustmentValue / 100));
      }
    } else {
      newPrice = operation === 'increase' ? currentPrice + adjustmentValue : currentPrice - adjustmentValue;
    }

    if (rounding > 0) {
      newPrice = Math.round(newPrice / rounding) * rounding;
    }

    return Math.max(0, newPrice);
  };

  const handleApply = async () => {
    if (!activeBusiness) return;
    if (adjustmentValue === 0) return;
    
    setLoading(true);
    try {
      // Process in chunks to avoid overwhelming the server/browser
      const chunkSize = 5;
      for (let i = 0; i < targetProducts.length; i += chunkSize) {
        const chunk = targetProducts.slice(i, i + chunkSize);
        await Promise.all(chunk.map(p => {
            const newPrice = calculateNewPrice(p.price);
            return updateProduct(activeBusiness.id, p.id, { price: newPrice });
        }));
      }
      onRefresh();
      setPreviewMode(true);
      setAdjustmentValue(0);
    } catch (error) {
      console.error(error);
      alert('Hubo un error al actualizar los precios.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6" data-tour="products.pricing.calculator">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            <Calculator className="w-5 h-5 text-blue-500" />
            Configurar Ajuste
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Operación</label>
              <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                <button
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${operation === 'increase' ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                  onClick={() => setOperation('increase')}
                >
                  Aumentar
                </button>
                <button
                  className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${operation === 'decrease' ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                  onClick={() => setOperation('decrease')}
                >
                  Disminuir
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                <select
                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value as 'percentage' | 'fixed')}
                >
                  <option value="percentage">Porcentaje (%)</option>
                  <option value="fixed">Valor Fijo ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor</label>
                <Input
                  type="number"
                  min="0"
                  value={adjustmentValue}
                  onChange={(e) => setAdjustmentValue(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Redondeo</label>
              <select
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={rounding}
                onChange={(e) => setRounding(Number(e.target.value))}
              >
                <option value="0">Sin redondeo</option>
                <option value="10">A la decena (10)</option>
                <option value="50">A 50</option>
                <option value="100">A la centena (100)</option>
                <option value="1000">Al millar (1000)</option>
              </select>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
               <div className="text-xs text-gray-500 mb-2">
                 Se aplicará a {targetProducts.length} productos seleccionados.
               </div>
               <Button 
                 className="w-full"
                 onClick={() => setPreviewMode(false)}
                 disabled={adjustmentValue <= 0}
               >
                 Ver Vista Previa
               </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-full max-h-[600px]">
           <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
             <h3 className="font-semibold text-gray-900 dark:text-white">Vista Previa de Cambios</h3>
             {!previewMode && (
                <Button onClick={handleApply} isLoading={loading} variant="primary">
                  <Check className="w-4 h-4 mr-2" />
                  Confirmar y Aplicar
                </Button>
             )}
           </div>
           
           <div className="overflow-y-auto flex-1 p-0">
             <table className="w-full text-left text-sm">
               <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-medium sticky top-0">
                 <tr>
                   <th className="px-6 py-3">Producto</th>
                   <th className="px-6 py-3 text-right">Precio Actual</th>
                   <th className="px-6 py-3 text-center"><ArrowRight className="w-4 h-4 mx-auto" /></th>
                   <th className="px-6 py-3 text-right">Nuevo Precio</th>
                   <th className="px-6 py-3 text-right">Diferencia</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                 {targetProducts.map(product => {
                   const newPrice = calculateNewPrice(product.price);
                   const diff = newPrice - product.price;
                   
                   return (
                     <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                       <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{product.name}</td>
                       <td className="px-6 py-3 text-right text-gray-500">{moneyCOP(product.price)}</td>
                       <td className="px-6 py-3 text-center"></td>
                       <td className="px-6 py-3 text-right font-bold text-blue-600 dark:text-blue-400">{moneyCOP(newPrice)}</td>
                       <td className={`px-6 py-3 text-right text-xs font-medium ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                         {diff > 0 ? '+' : ''}{moneyCOP(diff)}
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
             {targetProducts.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  Selecciona productos en la pestaña Catálogo para aplicar ajustes masivos.
                </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};
