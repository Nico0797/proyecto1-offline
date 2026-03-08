import React, { useEffect, useState } from 'react';
import { useBusinessStore } from '../store/businessStore';
import { useDebtStore } from '../store/debtStore';
import { PageLayout, PageHeader, PageBody } from '../components/Layout/PageLayout';
import { DebtSummary } from '../components/Debts/DebtSummary';
import { DebtList } from '../components/Debts/DebtList';
import { DebtFormModal } from '../components/Debts/DebtFormModal';
import { DebtPaymentModal } from '../components/Debts/DebtPaymentModal';
import { DebtDetails } from '../components/Debts/DebtDetails';
import { UpcomingDebts } from '../components/Debts/UpcomingDebts';
import { Debt } from '../types/debts';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const Debts: React.FC = () => {
  const { activeBusiness } = useBusinessStore();
  const { debts, summary, loading, fetchDebts, fetchSummary, deleteDebt } = useDebtStore();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | undefined>(undefined);
  
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    category: ''
  });

  useEffect(() => {
    if (activeBusiness) {
      fetchDebts(activeBusiness.id, filters);
      fetchSummary(activeBusiness.id);
    }
  }, [activeBusiness, filters]); 

  const handleEdit = (debt: Debt) => {
    setSelectedDebt(debt);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!activeBusiness) return;
    if (window.confirm('¿Estás seguro de eliminar esta deuda?')) {
      await deleteDebt(activeBusiness.id, id);
    }
  };

  const handlePayment = (debt: Debt) => {
    setSelectedDebt(debt);
    setIsPaymentOpen(true);
  };

  const handleDetails = (debt: Debt) => {
    setSelectedDebt(debt);
    setIsDetailsOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedDebt(undefined);
  };

  return (
    <PageLayout>
      <PageHeader 
        title="Deudas y Cuentas por Pagar" 
        description="Gestiona tus obligaciones financieras de forma fácil"
        action={
            <Button onClick={() => setIsFormOpen(true)} className="shadow-lg shadow-blue-500/20">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Deuda
            </Button>
        }
      />
      
      <PageBody>
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Summary Cards */}
            <DebtSummary summary={summary} />

            {/* Upcoming Payments Block */}
            <UpcomingDebts debts={debts} loading={loading} />

            {/* Toolbar / Filters */}
            <div className="sticky top-0 z-10 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur py-2 -mx-4 px-4 md:static md:bg-transparent md:p-0 md:backdrop-filter-none">
                <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text"
                            placeholder="Buscar proveedor..." 
                            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        />
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                        <select 
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm min-w-[140px]"
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        >
                            <option value="">Todos los estados</option>
                            <option value="active">Activas</option>
                            <option value="pending">Pendientes</option>
                            <option value="overdue">Vencidas</option>
                            <option value="paid">Pagadas</option>
                        </select>
                        <select 
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm min-w-[150px]"
                            value={filters.category}
                            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                        >
                            <option value="">Todas las categorías</option>
                            <option value="proveedores">Proveedores</option>
                            <option value="tarjetas">Tarjetas</option>
                            <option value="prestamos">Préstamos</option>
                            <option value="servicios">Servicios</option>
                            <option value="impuestos">Impuestos</option>
                            <option value="arriendo">Arriendo</option>
                            <option value="nomina">Nómina</option>
                            <option value="otros">Otros</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* List */}
            <DebtList 
                debts={debts} 
                loading={loading} 
                onEdit={handleEdit} 
                onDelete={handleDelete}
                onViewDetails={handleDetails}
                onRegisterPayment={handlePayment}
            />
        </div>

        {/* Modals */}
        <DebtFormModal 
            isOpen={isFormOpen} 
            onClose={handleCloseForm} 
            debtToEdit={selectedDebt} 
        />
        
        {selectedDebt && (
            <>
                <DebtPaymentModal 
                    isOpen={isPaymentOpen} 
                    onClose={() => setIsPaymentOpen(false)} 
                    debt={selectedDebt} 
                />
                <DebtDetails
                    isOpen={isDetailsOpen}
                    onClose={() => setIsDetailsOpen(false)}
                    debt={selectedDebt}
                    onEdit={handleEdit}
                />
            </>
        )}
      </PageBody>
    </PageLayout>
  );
};
