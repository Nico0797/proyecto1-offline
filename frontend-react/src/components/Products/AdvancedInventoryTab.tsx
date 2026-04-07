import React, { useState } from 'react';
import { Product } from '../../types';
import { useBusinessStore } from '../../store/businessStore';
import { ProGate } from '../ui/ProGate';
import { FEATURES } from '../../auth/plan';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { 
    ArrowLeft, ArrowRight, Save, History, Search, 
    BarChart2, Boxes, Calculator, PackageCheck, AlertTriangle,
    TrendingUp, DollarSign, RefreshCw, X
} from 'lucide-react';
import api from '../../services/api';
import { useProductStore } from '../../store/productStore';
import { SwipePager } from '../ui/SwipePager';

interface InventoryMovement {
    id: number;
    type: 'in' | 'out' | 'adjustment';
    quantity: number;
    reason: string;
    created_at: string;
    user_name: string;
    created_by_name?: string;
    created_by_role?: string;
}

interface AdvancedInventoryTabProps {
    products: Product[];
}

export const AdvancedInventoryTab: React.FC<AdvancedInventoryTabProps> = ({ products }) => {
    const { activeBusiness } = useBusinessStore();
    const { fetchProducts } = useProductStore();
    const [mode, setMode] = useState<'overview' | 'bulk' | 'valuation' | 'history'>('overview');
    
    // --- History State ---
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [search, setSearch] = useState('');
    const [moveType, setMoveType] = useState<'in' | 'out'>('in');
    const [quantity, setQuantity] = useState<string>('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [movements, setMovements] = useState<InventoryMovement[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // --- Bulk State ---
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [bulkAction, setBulkAction] = useState<'in' | 'out' | 'set'>('in');
    const [bulkQuantity, setBulkQuantity] = useState<string>('');
    const [bulkReason, setBulkReason] = useState('');
    const [showBulkActionsMobile, setShowBulkActionsMobile] = useState(false);

    // --- Helpers ---
    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) || 
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
    );

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: activeBusiness?.currency || 'COP' }).format(amount);
    };

    // --- Load History ---
    const loadHistory = async (productId: number) => {
        if (!activeBusiness) return;
        setLoadingHistory(true);
        try {
            const res = await api.get(`/businesses/${activeBusiness.id}/products/${productId}/movements`);
            setMovements(res.data.movements);
        } catch (error) {
            console.error("Error loading history", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    // --- Handlers ---
    const handleSelectProduct = (product: Product) => {
        setSelectedProduct(product);
        setMoveType('in');
        setQuantity('');
        setReason('');
        loadHistory(product.id);
    };

    const handleSubmitMovement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeBusiness || !selectedProduct) return;
        
        const qty = parseFloat(quantity);
        if (isNaN(qty) || qty <= 0) {
            alert("La cantidad debe ser mayor a 0");
            return;
        }
        if (!reason.trim()) {
            alert("El motivo es obligatorio");
            return;
        }

        setLoading(true);
        try {
            await api.post(`/businesses/${activeBusiness.id}/products/${selectedProduct.id}/movements`, {
                type: moveType,
                quantity: qty,
                reason: reason
            });
            
            await fetchProducts(activeBusiness.id);
            await loadHistory(selectedProduct.id);
            
            setQuantity('');
            setReason('');
            alert("Movimiento registrado correctamente");
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.error || "Error al registrar movimiento");
        } finally {
            setLoading(false);
        }
    };

    const handleBulkSubmit = async () => {
        if (!activeBusiness || selectedIds.length === 0) return;
        
        const qty = parseFloat(bulkQuantity);
        if (isNaN(qty) || qty < 0) {
            alert("Cantidad inválida");
            return;
        }
        if (!bulkReason.trim()) {
            alert("El motivo es obligatorio");
            return;
        }

        if (!confirm(`¿Estás seguro de aplicar este ajuste a ${selectedIds.length} productos?`)) return;

        setLoading(true);
        try {
            const adjustments = selectedIds.map(id => ({
                product_id: id,
                type: bulkAction,
                quantity: qty,
                reason: bulkReason
            }));

            const res = await api.post(`/businesses/${activeBusiness.id}/products/bulk-adjustment`, {
                adjustments
            });

            await fetchProducts(activeBusiness.id);
            setSelectedIds([]);
            setBulkQuantity('');
            setBulkReason('');
            setShowBulkActionsMobile(false);
            alert(`Procesado correctamente. ${res.data.processed_count} productos actualizados.`);
        } catch (error: any) {
            console.error(error);
            alert("Error en actualización masiva");
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const selectAllFiltered = () => {
        if (selectedIds.length === filteredProducts.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredProducts.map(p => p.id));
        }
    };

    // --- Stats Calculation ---
    const totalItems = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const totalCostValue = products.reduce((sum, p) => sum + (p.stock * (p.cost || 0)), 0);
    const totalRetailValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
    const potentialProfit = totalRetailValue - totalCostValue;
    const lowStockCount = products.filter(p => p.stock <= p.low_stock_threshold).length;

    // --- Render Components ---

    const renderOverview = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-white dark:bg-gray-800 p-3 md:p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-500 dark:text-gray-400 text-xs md:text-sm font-medium">Valor Costo</span>
                        <div className="p-1.5 md:p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                            <DollarSign className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                    </div>
                    <div className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white truncate">{formatCurrency(totalCostValue)}</div>
                    <div className="text-[10px] md:text-xs text-gray-400 mt-1 truncate">Inversión total en inventario</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 md:p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-500 dark:text-gray-400 text-xs md:text-sm font-medium">Valor Venta</span>
                        <div className="p-1.5 md:p-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                            <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                    </div>
                    <div className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white truncate">{formatCurrency(totalRetailValue)}</div>
                    <div className="text-[10px] md:text-xs text-gray-400 mt-1 truncate">Ingreso potencial estimado</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 md:p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-500 dark:text-gray-400 text-xs md:text-sm font-medium">Total Unidades</span>
                        <div className="p-1.5 md:p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                            <Boxes className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                    </div>
                    <div className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white truncate">{totalStock}</div>
                    <div className="text-[10px] md:text-xs text-gray-400 mt-1 truncate">En {totalItems} referencias</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 md:p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-500 dark:text-gray-400 text-xs md:text-sm font-medium">Bajo Stock</span>
                        <div className="p-1.5 md:p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                            <AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                    </div>
                    <div className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white truncate">{lowStockCount}</div>
                    <div className="text-[10px] md:text-xs text-gray-400 mt-1 truncate">Productos requieren atención</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Acciones Rápidas</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button 
                            onClick={() => setMode('history')}
                            className="flex flex-row sm:flex-col items-center justify-start sm:justify-center p-4 bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-200 dark:border-gray-600 hover:border-blue-200 dark:hover:border-blue-700 rounded-xl transition-all group min-h-[44px]"
                        >
                            <History className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 mr-3 sm:mr-0 sm:mb-2" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-400">Historial</span>
                        </button>
                        <button 
                            onClick={() => setMode('bulk')}
                            className="flex flex-row sm:flex-col items-center justify-start sm:justify-center p-4 bg-gray-50 dark:bg-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-gray-200 dark:border-gray-600 hover:border-purple-200 dark:hover:border-purple-700 rounded-xl transition-all group min-h-[44px]"
                        >
                            <PackageCheck className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 dark:text-gray-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 mr-3 sm:mr-0 sm:mb-2" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-purple-700 dark:group-hover:text-purple-400">Ajuste Masivo</span>
                        </button>
                        <button 
                            onClick={() => setMode('valuation')}
                            className="flex flex-row sm:flex-col items-center justify-start sm:justify-center p-4 bg-gray-50 dark:bg-gray-700 hover:bg-green-50 dark:hover:bg-green-900/20 border border-gray-200 dark:border-gray-600 hover:border-green-200 dark:hover:border-green-700 rounded-xl transition-all group min-h-[44px]"
                        >
                            <Calculator className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 dark:text-gray-500 group-hover:text-green-600 dark:group-hover:text-green-400 mr-3 sm:mr-0 sm:mb-2" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-green-700 dark:group-hover:text-green-400">Valoración</span>
                        </button>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 relative overflow-hidden">
                    <h3 className="text-xl font-bold mb-2 relative z-10 text-gray-900 dark:text-white">Rentabilidad Proyectada</h3>
                    <div className="text-4xl font-extrabold mb-4 relative z-10 text-gray-900 dark:text-white">{formatCurrency(potentialProfit)}</div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm relative z-10 max-w-xs">
                        Esta es la ganancia bruta estimada si vendes todo tu inventario actual a precio de lista.
                    </p>
                </div>
            </div>
        </div>
    );

    const renderBulk = () => (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col h-[calc(100vh-200px)] md:h-[600px] animate-in fade-in relative">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4 justify-between bg-gray-50 dark:bg-gray-900">
                <div className="flex-1 w-full relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input 
                        placeholder="Filtrar productos..." 
                        value={search} 
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-white dark:bg-gray-800 w-full"
                    />
                </div>
                <div className="flex items-center justify-between md:justify-end gap-2">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-bold text-gray-900 dark:text-white">{selectedIds.length}</span> seleccionados
                    </div>
                    {/* Mobile Toggle Action Button */}
                    <button 
                        onClick={() => setShowBulkActionsMobile(!showBulkActionsMobile)}
                        className="md:hidden p-2 bg-blue-600 text-white rounded-lg shadow-lg"
                    >
                        {showBulkActionsMobile ? <X className="w-5 h-5" /> : <PackageCheck className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative">
                <div className="flex-1 overflow-y-auto border-r border-gray-200 dark:border-gray-700 pb-20 md:pb-0">
                    {/* Desktop Table */}
                    <table className="hidden md:table w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 w-10">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedIds.length > 0 && selectedIds.length === filteredProducts.length}
                                        onChange={selectAllFiltered}
                                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 w-5 h-5 cursor-pointer"
                                    />
                                </th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Producto</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-right">Stock Actual</th>
                                <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-right">Costo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredProducts.map(p => (
                                <tr key={p.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedIds.includes(p.id) ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                                    <td className="px-4 py-3">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.includes(p.id)}
                                            onChange={() => toggleSelection(p.id)}
                                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 w-5 h-5 cursor-pointer"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-gray-900 dark:text-white">{p.name}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{p.sku}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{p.stock}</td>
                                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{formatCurrency(p.cost || 0)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Mobile Card List */}
                    <div className="md:hidden space-y-2 p-2">
                         <div className="flex items-center gap-2 mb-2 px-2">
                             <input 
                                type="checkbox" 
                                checked={selectedIds.length > 0 && selectedIds.length === filteredProducts.length}
                                onChange={selectAllFiltered}
                                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 w-5 h-5 cursor-pointer"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Seleccionar todos</span>
                         </div>
                        {filteredProducts.map(p => (
                            <div 
                                key={p.id}
                                onClick={() => toggleSelection(p.id)}
                                className={`flex items-center p-3 rounded-lg border ${selectedIds.includes(p.id) ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'} shadow-sm`}
                            >
                                <input 
                                    type="checkbox" 
                                    checked={selectedIds.includes(p.id)}
                                    onChange={() => {}} // Handled by parent div click
                                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 w-5 h-5 mr-3 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-gray-900 dark:text-white truncate">{p.name}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{p.sku}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-gray-900 dark:text-white">{p.stock}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Stock</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bulk Actions Sidebar / Bottom Sheet */}
                <div className={`
                    absolute md:relative inset-x-0 bottom-0 z-20 
                    md:w-80 bg-gray-50 dark:bg-gray-900 p-6 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 
                    flex flex-col shadow-2xl md:shadow-none transition-transform duration-300 ease-in-out
                    ${showBulkActionsMobile ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
                    md:flex
                    max-h-[80vh] md:max-h-full overflow-y-auto
                `}>
                    <div className="flex justify-between items-center md:hidden mb-4">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <PackageCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            Acción Masiva
                        </h3>
                        <button onClick={() => setShowBulkActionsMobile(false)} className="p-1">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    <h3 className="hidden md:flex font-bold text-gray-900 dark:text-white mb-4 items-center gap-2">
                        <PackageCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        Acción Masiva
                    </h3>
                    
                    <div className="space-y-4 flex-1">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Ajuste</label>
                            <select 
                                value={bulkAction}
                                onChange={(e) => setBulkAction(e.target.value as any)}
                                className="w-full h-11 rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                            >
                                <option value="in">Agregar Stock (+)</option>
                                <option value="out">Reducir Stock (-)</option>
                                <option value="set">Fijar Stock Exacto (=)</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad</label>
                            <Input 
                                type="number" 
                                value={bulkQuantity}
                                onChange={(e) => setBulkQuantity(e.target.value)}
                                placeholder="0"
                                className="h-11 text-base"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {bulkAction === 'set' ? 'El stock de todos los seleccionados será este valor.' : 'Esta cantidad se sumará/restará a cada producto.'}
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo (Obligatorio)</label>
                            <textarea 
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base p-3"
                                rows={3}
                                value={bulkReason}
                                onChange={(e) => setBulkReason(e.target.value)}
                                placeholder="Ej: Inventario físico anual"
                            />
                        </div>
                    </div>

                    <Button 
                        onClick={handleBulkSubmit} 
                        disabled={selectedIds.length === 0 || loading}
                        className="w-full mt-4 min-h-[44px]"
                    >
                        {loading ? 'Procesando...' : `Aplicar a ${selectedIds.length} items`}
                    </Button>
                </div>
            </div>
            
            {/* Backdrop for mobile drawer */}
            {showBulkActionsMobile && (
                <div 
                    className="fixed inset-0 bg-black/50 z-10 md:hidden"
                    onClick={() => setShowBulkActionsMobile(false)}
                />
            )}
        </div>
    );

    const renderValuation = () => (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden animate-in fade-in flex flex-col h-[calc(100vh-200px)] md:h-auto">
            <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input 
                        placeholder="Buscar..." 
                        value={search} 
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-white dark:bg-gray-800 w-full"
                    />
                </div>
                <div className="text-right w-full md:w-auto">
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Valor Total (Venta)</div>
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(filteredProducts.reduce((s, p) => s + (p.stock * p.price), 0))}</div>
                </div>
            </div>
            
            <div className="flex-1 overflow-auto">
                {/* Desktop Table */}
                <table className="hidden md:table w-full text-left">
                    <thead className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0">
                        <tr>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Producto</th>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-right">Stock</th>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-right">Costo Unit.</th>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-right">Precio Unit.</th>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-right bg-blue-50/30 dark:bg-blue-900/20">Valor Costo</th>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-right bg-green-50/30 dark:bg-green-900/20">Valor Venta</th>
                            <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-right">Margen</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredProducts.map(p => {
                            const valCost = p.stock * (p.cost || 0);
                            const valPrice = p.stock * p.price;
                            const margin = p.price - (p.cost || 0);
                            const marginPercent = p.price > 0 ? (margin / p.price) * 100 : 0;
                            
                            return (
                                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900 dark:text-white">{p.name}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{p.sku}</div>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">{p.stock}</td>
                                    <td className="px-6 py-4 text-right text-gray-500 dark:text-gray-400">{formatCurrency(p.cost || 0)}</td>
                                    <td className="px-6 py-4 text-right text-gray-900 dark:text-white">{formatCurrency(p.price)}</td>
                                    <td className="px-6 py-4 text-right font-medium text-blue-700 dark:text-blue-300 bg-blue-50/30 dark:bg-blue-900/20">{formatCurrency(valCost)}</td>
                                    <td className="px-6 py-4 text-right font-medium text-green-700 dark:text-green-300 bg-green-50/30 dark:bg-green-900/20">{formatCurrency(valPrice)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${marginPercent > 30 ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : marginPercent > 15 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'}`}>
                                            {marginPercent.toFixed(1)}%
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3 p-3">
                    {filteredProducts.map(p => {
                        const valCost = p.stock * (p.cost || 0);
                        const valPrice = p.stock * p.price;
                        const margin = p.price - (p.cost || 0);
                        const marginPercent = p.price > 0 ? (margin / p.price) * 100 : 0;
                        
                        return (
                            <div key={p.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">{p.name}</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{p.sku}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`inline-flex px-2 py-1 rounded text-xs font-bold ${marginPercent > 30 ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : marginPercent > 15 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'}`}>
                                            {marginPercent.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm mt-3">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 dark:text-gray-400">Stock</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{p.stock}</span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-xs text-gray-500 dark:text-gray-400">Precio</span>
                                        <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(p.price)}</span>
                                    </div>
                                    <div className="flex flex-col col-span-2 pt-2 border-t border-gray-100 dark:border-gray-700 mt-1">
                                        <div className="flex justify-between">
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Valor Costo</span>
                                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{formatCurrency(valCost)}</span>
                                        </div>
                                        <div className="flex justify-between mt-1">
                                            <span className="text-xs text-gray-500 dark:text-gray-400">Valor Venta</span>
                                            <span className="text-xs font-medium text-green-600 dark:text-green-400">{formatCurrency(valPrice)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    const renderHistory = () => (
        <div className="flex h-[calc(100vh-200px)] md:h-[600px] flex-col md:flex-row gap-6 animate-in fade-in relative">
            {/* List / Selector */}
            <div className={`
                ${selectedProduct ? 'hidden md:flex' : 'flex'} 
                flex-col w-full md:w-80 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden h-full
            `}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Seleccionar Producto</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input 
                            placeholder="Buscar..." 
                            value={search} 
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 w-full"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {filteredProducts.map(product => (
                        <button
                            key={product.id}
                            onClick={() => handleSelectProduct(product)}
                            className={`w-full text-left p-3 rounded-lg transition-colors flex justify-between items-center min-h-[50px] ${
                                selectedProduct?.id === product.id 
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'
                            }`}
                        >
                            <div className="min-w-0">
                                <div className="font-medium text-gray-900 dark:text-white truncate">{product.name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Stock: {product.stock} {product.unit}</div>
                            </div>
                            <ArrowRight className={`w-4 h-4 ${selectedProduct?.id === product.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                        </button>
                    ))}
                </div>
            </div>

            {/* Detail View */}
            <div className={`
                flex-1 flex-col 
                ${!selectedProduct ? 'hidden md:flex' : 'flex'} 
                bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden h-full
            `}>
                {!selectedProduct ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-8 text-center bg-gray-50/50 dark:bg-gray-900/50">
                        <div className="w-16 h-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center mb-4 shadow-sm">
                            <History className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Historial Individual</h3>
                        <p className="max-w-sm mt-2">Selecciona un producto de la lista para gestionar sus movimientos individuales.</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setSelectedProduct(null)}
                                    className="md:hidden p-2 -ml-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <div className="min-w-0">
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-[150px] sm:max-w-xs">{selectedProduct.name}</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">SKU: {selectedProduct.sku || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <div className="text-sm text-gray-500 dark:text-gray-400">Stock Actual</div>
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">{selectedProduct.stock} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">{selectedProduct.unit}</span></div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                            {/* Action Form */}
                            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <RefreshCw className="w-4 h-4" />
                                    Registrar Movimiento
                                </h4>
                                <form onSubmit={handleSubmitMovement} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                    <div className="md:col-span-3">
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                                        <div className="flex rounded-lg shadow-sm">
                                            <button
                                                type="button"
                                                onClick={() => setMoveType('in')}
                                                className={`flex-1 px-3 py-2 text-sm font-medium rounded-l-lg border transition-all h-11 ${
                                                    moveType === 'in' 
                                                        ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 z-10' 
                                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                Entrada (+)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setMoveType('out')}
                                                className={`flex-1 px-3 py-2 text-sm font-medium rounded-r-lg border-t border-b border-r transition-all h-11 ${
                                                    moveType === 'out' 
                                                        ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 z-10' 
                                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                Salida (-)
                                            </button>
                                        </div>
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Cantidad</label>
                                        <Input 
                                            type="number" 
                                            min="0.01" 
                                            step="any"
                                            value={quantity}
                                            onChange={(e) => setQuantity(e.target.value)}
                                            placeholder="0.00"
                                            required
                                            className="h-11 text-base"
                                        />
                                    </div>
                                    <div className="md:col-span-4">
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Motivo</label>
                                        <Input 
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            placeholder="Ej: Compra, Merma..."
                                            required
                                            className="h-11 text-base"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <Button type="submit" disabled={loading} className="w-full h-11">
                                            {loading ? '...' : <><Save className="w-4 h-4 mr-2" /> Guardar</>}
                                        </Button>
                                    </div>
                                </form>
                            </div>

                            {/* History Table */}
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center justify-between">
                                    <span>Historial de Movimientos</span>
                                    <button 
                                        onClick={() => loadHistory(selectedProduct.id)}
                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-xs normal-case font-normal flex items-center gap-1"
                                    >
                                        <RefreshCw className="w-3 h-3" /> Actualizar
                                    </button>
                                </h4>
                                
                                {loadingHistory ? (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">Cargando historial...</div>
                                ) : movements.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                                        No hay movimientos registrados
                                    </div>
                                ) : (
                                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                <thead className="bg-gray-50 dark:bg-gray-900">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Fecha</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cant.</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[150px]">Motivo</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Usuario</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                    {movements.map((m) => (
                                                        <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                                {new Date(m.created_at).toLocaleDateString()} <span className="text-xs text-gray-400">{new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-md ${
                                                                    m.type === 'in' 
                                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                                                        : m.type === 'out'
                                                                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                                }`}>
                                                                    {m.type === 'in' ? 'Entrada' : m.type === 'out' ? 'Salida' : 'Ajuste'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                                                                {m.type === 'out' ? '-' : '+'}{m.quantity}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                                {m.reason || '-'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                                {m.created_by_name ? (
                                                                    <div className="flex flex-col">
                                                                        <span className="font-medium text-gray-900 dark:text-white">{m.created_by_name}</span>
                                                                        {m.created_by_role && <span className="text-xs text-gray-400">{m.created_by_role}</span>}
                                                                    </div>
                                                                ) : (
                                                                    m.user_name || 'Sistema'
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <ProGate feature={FEATURES.ADVANCED_INVENTORY} mode="block">
            <div className="h-full flex flex-col space-y-6">
                <SwipePager
                    activePageId={mode}
                    onPageChange={(id) => setMode(id as any)}
                    enableSwipe={false} // Disable nested swipe to prevent conflict with parent
                    className="flex-1"
                    pages={[
                        {
                            id: 'overview',
                            title: 'Resumen',
                            icon: BarChart2,
                            content: renderOverview()
                        },
                        {
                            id: 'bulk',
                            title: 'Ajuste Masivo',
                            icon: PackageCheck,
                            content: renderBulk()
                        },
                        {
                            id: 'valuation',
                            title: 'Valoración',
                            icon: Calculator,
                            content: renderValuation()
                        },
                        {
                            id: 'history',
                            title: 'Historial',
                            icon: History,
                            content: renderHistory()
                        }
                    ]}
                />
            </div>
        </ProGate>
    );
};
