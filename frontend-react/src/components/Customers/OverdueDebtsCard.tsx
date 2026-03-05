import React, { useState, useEffect } from 'react';
import { Customer } from '../../types';
import { Calendar, Clock, AlertTriangle, Send, Check, Settings, Save, X, User } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useCustomerStore } from '../../store/customerStore';
import { useBusinessStore } from '../../store/businessStore';
import api from '../../services/api';

interface OverdueDebtsCardProps {
    customers: Customer[];
    sales: any[]; // Deprecated, we use customer fields now
    onSelectCustomer: (c: Customer) => void;
    businessName: string;
}

export const OverdueDebtsCard: React.FC<OverdueDebtsCardProps> = ({ customers, onSelectCustomer }) => {
    const { debtTermDays, setDebtTermDays, fetchCustomers } = useCustomerStore();
    const { activeBusiness } = useBusinessStore();
    const [filter, setFilter] = useState<'all' | 'overdue'>('overdue');
    const [isEditingTerm, setIsEditingTerm] = useState(false);
    const [tempTerm, setTempTerm] = useState(debtTermDays.toString());
    
    // WhatsApp Modal State
    const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
    const [selectedForWhatsapp, setSelectedForWhatsapp] = useState<Customer | null>(null);
    const [whatsappMessage, setWhatsappMessage] = useState('');
    // Edición de gracia por cliente
    const [editingGraceId, setEditingGraceId] = useState<number | null>(null);
    const [graceUntil, setGraceUntil] = useState<string>('');

    useEffect(() => {
        setTempTerm(debtTermDays.toString());
    }, [debtTermDays]);

    const handleSaveTerm = async () => {
        const days = parseInt(tempTerm);
        if (isNaN(days) || days < 1 || days > 365) {
            alert('Por favor ingresa un número de días válido (1-365)');
            return;
        }

        try {
            if (activeBusiness?.id) {
                const biz = await api.get(`/businesses/${activeBusiness.id}`);
                const currentSettings = biz.data.business?.settings || {};
                const newSettings = { ...currentSettings, debt_term_days: days };
                await api.put(`/businesses/${activeBusiness.id}`, { settings: newSettings });
            } else {
            }
            setDebtTermDays(days);
            setIsEditingTerm(false);
            // Refresh customers to update overdue status based on new term
            if (activeBusiness?.id) {
                fetchCustomers(activeBusiness.id);
            } else {
                fetchCustomers(0);
            }
        } catch (error) {
            console.error('Error saving term:', error);
            alert('Error al guardar la configuración');
        }
    };

    const prepareWhatsApp = (customer: Customer) => {
        if (!customer.phone) {
            alert('Este cliente no tiene teléfono registrado');
            return;
        }

        const msg = `Hola ${customer.name}, te escribo para recordarte que tienes un saldo pendiente de $${customer.balance.toLocaleString()}. Han pasado ${customer.days_since_oldest} días desde el último cargo (${customer.oldest_due_date}). ¿Me confirmas cuándo puedes ponerte al día? Gracias.`;
        
        setWhatsappMessage(msg);
        setSelectedForWhatsapp(customer);
        setWhatsappModalOpen(true);
    };

    const sendWhatsApp = () => {
        if (!selectedForWhatsapp || !selectedForWhatsapp.phone) return;
        
        let phone = selectedForWhatsapp.phone.replace(/\D/g, '');
        if (!phone.startsWith('57') && phone.length === 10) {
            phone = '57' + phone;
        }
        
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(whatsappMessage)}`;
        window.open(url, '_blank');
        setWhatsappModalOpen(false);
    };

    const openGraceEditor = async (customerId: number) => {
        if (!activeBusiness?.id) return;
        try {
            const biz = await api.get(`/businesses/${activeBusiness.id}`);
            const overrides = biz.data.business?.settings?.debt_overrides || {};
            const ov = overrides?.[String(customerId)] || overrides?.[customerId];
            const val = ov?.grace_until || new Date().toISOString().split('T')[0];
            setGraceUntil(val);
            setEditingGraceId(customerId);
        } catch {
            setGraceUntil(new Date().toISOString().split('T')[0]);
            setEditingGraceId(customerId);
        }
    };

    const saveGrace = async () => {
        if (!activeBusiness?.id || !editingGraceId) return;
        try {
            const biz = await api.get(`/businesses/${activeBusiness.id}`);
            const settings = biz.data.business?.settings || {};
            const overrides = settings.debt_overrides || {};
            const key = String(editingGraceId);
            overrides[key] = { ...(overrides[key] || {}), grace_until: graceUntil };
            const newSettings = { ...settings, debt_overrides: overrides };
            await api.put(`/businesses/${activeBusiness.id}`, { settings: newSettings });
            setEditingGraceId(null);
            // Refrescar lista para recalcular is_overdue
            fetchCustomers(activeBusiness.id);
        } catch (e) {
            console.error('Error saving grace date', e);
            alert('No se pudo guardar la fecha de gracia');
        }
    };

    const cancelGrace = () => {
        setEditingGraceId(null);
        setGraceUntil('');
    };

    const sortedList = React.useMemo(() => {
        let list = customers.filter(c => c.balance > 0);
        
        if (filter === 'overdue') {
            // Filter by is_overdue flag from backend OR manual check if needed
            // Backend returns is_overdue based on stored term. 
            // If we just changed term locally but didn't refresh, it might be stale.
            // But we call fetchCustomers on save, so it should be fine.
            list = list.filter(c => c.is_overdue);
        }

        return list.sort((a, b) => (b.days_since_oldest || 0) - (a.days_since_oldest || 0));
    }, [customers, filter]);

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm">
            {/* Header & Config */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        Dinero Pendiente
                    </h3>
                    <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                        <button 
                            onClick={() => setFilter('overdue')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filter === 'overdue' ? 'bg-white dark:bg-gray-600 shadow text-red-600' : 'text-gray-500'}`}
                        >
                            Vencidas
                        </button>
                        <button 
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${filter === 'all' ? 'bg-white dark:bg-gray-600 shadow text-blue-600' : 'text-gray-500'}`}
                        >
                            Todos
                        </button>
                    </div>
                </div>

                {/* Term Config Panel */}
                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Settings className="w-4 h-4" />
                        <span>Plazo vencimiento:</span>
                        {isEditingTerm ? (
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="number" 
                                    value={tempTerm} 
                                    onChange={e => setTempTerm(e.target.value)}
                                    className="w-16 h-7 text-center p-1"
                                />
                                <span className="text-xs">días</span>
                            </div>
                        ) : (
                            <span className="font-bold text-gray-900 dark:text-white">{debtTermDays} días</span>
                        )}
                    </div>
                    <div>
                        {isEditingTerm ? (
                            <div className="flex gap-2">
                                <Button size="sm" onClick={handleSaveTerm} className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700">
                                    <Save className="w-3 h-3 mr-1" /> Guardar
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setIsEditingTerm(false)} className="h-7 px-2 text-xs">
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                        ) : (
                            <Button size="sm" variant="ghost" onClick={() => setIsEditingTerm(true)} className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                Editar plazo
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {sortedList.map((customer) => (
                    <div 
                        key={customer.id} 
                        className={`border rounded-xl p-4 transition-all hover:shadow-md ${
                            customer.is_overdue 
                            ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' 
                            : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div onClick={() => onSelectCustomer(customer)} className="cursor-pointer">
                                <h4 className="font-bold text-gray-900 dark:text-white hover:underline decoration-blue-500">
                                    {customer.name}
                                </h4>
                                <div className="flex flex-col gap-0.5 mt-1">
                                    {customer.oldest_due_date && (
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            Desde: {customer.oldest_due_date}
                                        </p>
                                    )}
                                    {customer.days_since_oldest !== undefined && (
                                        <p className={`text-xs font-medium flex items-center gap-1 ${
                                            customer.is_overdue ? 'text-red-600' : 'text-yellow-600'
                                        }`}>
                                            <Clock className="w-3 h-3" />
                                            {customer.days_since_oldest} días antigüedad
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`font-bold text-lg ${
                                    customer.is_overdue ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
                                }`}>
                                    ${customer.balance.toLocaleString()}
                                </p>
                                {customer.is_overdue && (
                                    <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
                                        VENCIDA
                                    </span>
                                )}
                            </div>
                        </div>

                        {editingGraceId === customer.id && (
                            <div className="mt-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-gray-600 dark:text-gray-300">No marcar como vencido hasta</span>
                                    <Input type="date" value={graceUntil} onChange={(e) => setGraceUntil(e.target.value)} className="w-44 h-8" />
                                    <Button size="sm" className="h-8" onClick={(e) => { e.stopPropagation(); saveGrace(); }}>Guardar</Button>
                                    <Button size="sm" variant="ghost" className="h-8" onClick={(e) => { e.stopPropagation(); cancelGrace(); }}>Cancelar</Button>
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 mt-3">
                            {customer.is_overdue && (
                                <Button 
                                    size="sm" 
                                    className="flex-1 bg-green-500 hover:bg-green-600 text-white border-none h-8 text-xs"
                                    onClick={() => prepareWhatsApp(customer)}
                                >
                                    <Send className="w-3 h-3 mr-2" />
                                    Enviar recordatorio
                                </Button>
                            )}
                            <Button 
                                size="sm" 
                                variant="secondary" 
                                className="h-8 w-8 p-0 flex items-center justify-center"
                                onClick={(e) => { e.stopPropagation(); openGraceEditor(customer.id); }}
                                title="Editar plazo (gracia)"
                            >
                                <Settings className="w-4 h-4 text-gray-500" />
                            </Button>
                            <Button 
                                size="sm" 
                                variant="secondary" 
                                className={`h-8 w-8 p-0 flex items-center justify-center ${!customer.is_overdue ? 'w-full flex-1' : ''}`}
                                onClick={() => onSelectCustomer(customer)}
                            >
                                <User className="w-4 h-4 text-gray-500" />
                                {!customer.is_overdue && <span className="ml-2 text-xs">Ver detalle</span>}
                            </Button>
                        </div>
                    </div>
                ))}

                {sortedList.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-3">
                            <Check className="w-6 h-6 text-green-500" />
                        </div>
                        <p className="text-sm">
                            {filter === 'overdue' ? 'No hay deudas vencidas' : 'No hay cuentas por cobrar'}
                        </p>
                    </div>
                )}
            </div>

            {/* WhatsApp Preview Modal */}
            {whatsappModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Send className="w-5 h-5 text-green-500" />
                                Vista Previa del Mensaje
                            </h3>
                            <button onClick={() => setWhatsappModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Mensaje a enviar:
                            </label>
                            <textarea 
                                className="w-full h-32 p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                value={whatsappMessage}
                                onChange={e => setWhatsappMessage(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button variant="secondary" className="flex-1" onClick={() => setWhatsappModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button className="flex-1 bg-green-500 hover:bg-green-600 text-white" onClick={sendWhatsApp}>
                                <Send className="w-4 h-4 mr-2" />
                                Enviar WhatsApp
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
