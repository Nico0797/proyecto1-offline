import React from 'react';
import { Debt } from '../../types/debts';
import { formatCOP } from '../Expenses/helpers';
import { Edit2, Trash2, Calendar, MoreVertical, CreditCard, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface DebtListProps {
  debts: Debt[];
  loading: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canRegisterPayment: boolean;
  onEdit: (debt: Debt) => void;
  onDelete: (id: number) => void;
  onViewDetails: (debt: Debt) => void;
  onRegisterPayment: (debt: Debt) => void;
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
        case 'partial': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
        case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'paid': return 'Pagada';
        case 'partial': return 'Parcial';
        case 'overdue': return 'Vencida';
        default: return 'Pendiente';
    }
};

const getOriginLabel = (debt: Debt) => {
    if (debt.origin_type === 'recurring') return 'Generada desde recurrente';
    return 'Cuenta por pagar manual';
};

export const DebtList: React.FC<DebtListProps> = ({
  debts,
  loading,
  canUpdate,
  canDelete,
  canRegisterPayment,
  onEdit,
  onDelete,
  onViewDetails,
  onRegisterPayment,
}) => {
  if (loading) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
                <div key={i} className="h-48 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />
            ))}
        </div>
    );
  }

  if (debts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mb-4">
          <CreditCard className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No hay deudas registradas</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">Registra tus obligaciones para llevar el control.</p>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
      {debts.map((debt) => {
          const progress = debt.total_amount > 0 
            ? ((debt.total_amount - debt.balance_due) / debt.total_amount) * 100 
            : 0;
            
          return (
            <div
                key={debt.id}
                className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
                <div>
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0 pr-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate text-lg" title={debt.name}>
                                {debt.name}
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                <span className="truncate max-w-[120px]">{debt.creditor_name}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                                <span className="capitalize">{debt.category}</span>
                            </div>
                            <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                                {getOriginLabel(debt)}
                            </div>
                        </div>
                        <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${getStatusColor(debt.status)}`}>
                            {getStatusLabel(debt.status)}
                        </span>
                    </div>

                    <div className="flex items-end justify-between mb-4">
                        <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Saldo Pendiente</div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                                {formatCOP(debt.balance_due)}
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Total Original</div>
                             <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                {formatCOP(debt.total_amount)}
                             </div>
                             <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                                Pagado: {formatCOP(debt.amount_paid || 0)}
                             </div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
                        <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                                debt.status === 'paid' ? 'bg-green-500' : 
                                debt.status === 'overdue' ? 'bg-red-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {debt.due_date && (
                        <div className={`flex items-center gap-2 text-xs mb-4 ${
                            debt.due_date < today && debt.status !== 'paid' 
                                ? 'text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/10 p-2 rounded-lg' 
                                : 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg'
                        }`}>
                            <Calendar className="w-4 h-4" />
                            <span>Vence: {debt.due_date}</span>
                            {debt.due_date < today && debt.status !== 'paid' && (
                                <span className="flex items-center gap-1 ml-auto">
                                    <AlertCircle className="w-3 h-3" /> Vencida
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-gray-100 dark:border-gray-700 mt-auto">
                    {debt.status !== 'paid' && canRegisterPayment ? (
                        <button 
                            onClick={() => onRegisterPayment(debt)}
                            className="col-span-2 flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg py-2 px-3 text-xs font-semibold hover:opacity-90 transition-opacity"
                        >
                            <CreditCard className="w-3.5 h-3.5" />
                            PAGAR
                        </button>
                    ) : (
                        <div className="col-span-2 flex items-center justify-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg py-2 px-3 text-xs font-medium">
                            {debt.status === 'paid' ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5" />
                                PAGADO
                              </>
                            ) : (
                              <>SOLO LECTURA</>
                            )}
                        </div>
                    )}
                    
                    <button 
                        onClick={() => onViewDetails(debt)}
                        className="col-span-1 flex items-center justify-center bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg py-2 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        title="Ver Detalles"
                    >
                        <Clock className="w-4 h-4" />
                    </button>
                    
                    <div className="col-span-1 relative group/menu">
                        {canUpdate || canDelete ? (
                          <>
                            <button className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                <MoreVertical className="w-4 h-4" />
                            </button>
                            <div className="absolute bottom-full right-0 mb-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 hidden group-hover/menu:block z-10">
                                {canUpdate ? (
                                  <button 
                                      onClick={() => onEdit(debt)}
                                      className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                  >
                                      <Edit2 className="w-3 h-3" /> Editar
                                  </button>
                                ) : null}
                                {canDelete ? (
                                  <button 
                                      onClick={() => onDelete(debt.id)}
                                      className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                  >
                                      <Trash2 className="w-3 h-3" /> Eliminar
                                  </button>
                                ) : null}
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-lg">
                            <MoreVertical className="w-4 h-4" />
                          </div>
                        )}
                    </div>
                </div>
            </div>
          );
      })}
    </div>
  );
};
