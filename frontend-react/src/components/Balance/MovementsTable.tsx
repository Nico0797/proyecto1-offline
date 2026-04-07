import React from 'react';
import { BalanceMovement } from '../../services/balanceService';
import { ArrowDownLeft, ArrowUpRight, Search, Filter } from 'lucide-react';

interface MovementsTableProps {
  movements: BalanceMovement[];
  loading: boolean;
  currency?: string;
}

export const MovementsTable: React.FC<MovementsTableProps> = ({ movements, loading, currency = 'COP' }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<'all' | 'income' | 'operational_expense' | 'supplier_payment' | 'operational_obligation_payment' | 'financial_debt_payment'>('all');

  const formatCurrency = React.useCallback((value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  }, [currency]);

  const formatDateTime = (value: string) => {
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const parsedDate = new Date(isDateOnly ? `${value}T00:00:00` : value);
    if (Number.isNaN(parsedDate.getTime())) return value;
    const dateLabel = parsedDate.toLocaleDateString('es-CO');
    if (isDateOnly) return dateLabel;
    return `${dateLabel} ${parsedDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const filtered = movements.filter(m => {
    if (filterType === 'income' && m.type !== 'income') return false;
    if (filterType !== 'all' && filterType !== 'income' && m.flow_group !== filterType) return false;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      return m.description.toLowerCase().includes(lower)
        || m.category?.toLowerCase().includes(lower)
        || m.source_label?.toLowerCase().includes(lower);
    }
    return true;
  });

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando movimientos...</div>;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-4 py-4 sm:px-5 sm:py-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-slate-50 via-white to-white dark:from-gray-800 dark:via-gray-800 dark:to-gray-800">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 dark:text-white">Historial de movimientos reales</h3>
              <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2.5 py-0.5 text-xs font-medium">
                {filtered.length} registros
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Muestra el mismo corte del resumen financiero del período.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <div className="relative flex-1 sm:min-w-[220px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por detalle, categoría u origen..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="relative sm:min-w-[210px]">
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as any)}
                className="pl-3 pr-8 py-2 text-sm w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
              >
                <option value="all">Todos los movimientos</option>
                <option value="income">Entradas reales</option>
                <option value="operational_expense">Gasto operativo</option>
                <option value="supplier_payment">Pago a proveedor</option>
                <option value="operational_obligation_payment">Pago obligación operativa</option>
                <option value="financial_debt_payment">Pago deuda financiera</option>
              </select>
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">Origen</th>
              <th className="px-4 py-3 text-right">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.length > 0 ? (
              filtered.map((m, index) => (
                <tr key={`${m.id}-${m.date}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {formatDateTime(m.date)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-full ${m.type === 'income' ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400'}`}>
                        {m.type === 'income' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{m.description}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{m.category || 'Sin categoría'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      m.type === 'income'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : m.flow_group === 'supplier_payment'
                          ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300'
                          : m.flow_group === 'financial_debt_payment'
                            ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                            : m.flow_group === 'operational_obligation_payment'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {m.source_label || (m.type === 'income' ? 'Entrada real' : 'Salida real')}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${m.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {m.type === 'income' ? '+' : '-'}{formatCurrency(m.amount)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No se encontraron movimientos en este periodo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
