import React, { useState } from 'react';
import { TrendingDown, Calendar, RefreshCw, AlertTriangle, DollarSign, ChevronDown } from 'lucide-react';
import { Expense, SupplierPayable } from '../../types';
import { RecurringExpense } from '../../store/recurringExpenseStore';
import { DebtsSummary } from '../../types/debts';
import { formatCOP, isDueSoon, isOverdue } from './helpers';

interface ExpensesKpisProps {
  expenses: Expense[];
  recurringExpenses: RecurringExpense[];
  debtsSummary?: DebtsSummary | null;
  supplierPayables?: SupplierPayable[];
}

export const ExpensesKpis: React.FC<ExpensesKpisProps> = ({ expenses, recurringExpenses, debtsSummary, supplierPayables = [] }) => {
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const expenseCount = expenses.length;
  const [open, setOpen] = useState(false);

  const manualCashOut = expenses
    .filter((expense) => (expense.source_type || 'manual') === 'manual')
    .reduce((sum, expense) => sum + expense.amount, 0);
  const recurringCashOut = expenses
    .filter((expense) => expense.source_type === 'recurring')
    .reduce((sum, expense) => sum + expense.amount, 0);
  const purchaseCashOut = expenses
    .filter((expense) => expense.source_type === 'purchase_payment')
    .reduce((sum, expense) => sum + expense.amount, 0);
  const operationalDebtPaymentCashOut = expenses
    .filter((expense) => expense.source_type === 'debt_payment' && expense.debt_scope !== 'financial')
    .reduce((sum, expense) => sum + expense.amount, 0);
  const supplierPaymentCashOut = expenses
    .filter((expense) => expense.source_type === 'supplier_payment')
    .reduce((sum, expense) => sum + expense.amount, 0);
  const financialDebtPaymentCashOut = expenses
    .filter((expense) => expense.source_type === 'debt_payment' && expense.debt_scope === 'financial')
    .reduce((sum, expense) => sum + expense.amount, 0);

  const activeRecurring = recurringExpenses.filter((r) => r.is_active).length;
  const upcomingRecurring = recurringExpenses.filter((r) => r.is_active && isDueSoon(r.next_due_date)).length;
  const overdueRecurring = recurringExpenses.filter((r) => r.is_active && isOverdue(r.next_due_date)).length;

  const openSupplierPayables = supplierPayables.filter((payable) => payable.status !== 'paid' && Number(payable.balance_due || 0) > 0);
  const supplierOverduePayables = openSupplierPayables.filter((payable) => payable.due_date && new Date(payable.due_date).getTime() < new Date(new Date().setHours(0, 0, 0, 0)).getTime());
  const supplierDueSoonPayables = openSupplierPayables.filter((payable) => {
    if (!payable.due_date) return false;
    const diff = Math.ceil((new Date(payable.due_date).getTime() - new Date(new Date().setHours(0, 0, 0, 0)).getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 7;
  });

  const overduePayables = Number(debtsSummary?.overdue_count || 0) + supplierOverduePayables.length;
  const totalPayables = Number(debtsSummary?.total_debt || 0) + openSupplierPayables.reduce((sum, payable) => sum + Number(payable.balance_due || 0), 0);
  const dueSoonPayables = Number(debtsSummary?.due_today_total || 0)
    + Number(debtsSummary?.due_soon_total || 0)
    + supplierDueSoonPayables.reduce((sum, payable) => sum + Number(payable.balance_due || 0), 0);

  const items = [
    {
      label: 'Caja impactada',
      value: formatCOP(totalExpenses),
      sub: `${expenseCount} movimiento(s)`,
      icon: TrendingDown,
      tone: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/30',
    },
    {
      label: 'Gasto directo',
      value: formatCOP(manualCashOut),
      sub: 'Sin obligación previa',
      icon: DollarSign,
      tone: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Recurrente ejecutado',
      value: formatCOP(recurringCashOut),
      sub: 'Programado y ya pagado',
      icon: RefreshCw,
      tone: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      label: 'Compra pagada',
      value: formatCOP(purchaseCashOut),
      sub: 'Compra liquidada al confirmar',
      icon: DollarSign,
      tone: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    },
    {
      label: 'Pago operativo',
      value: formatCOP(operationalDebtPaymentCashOut + supplierPaymentCashOut),
      sub: 'Abonos a por pagar y proveedores',
      icon: DollarSign,
      tone: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      label: 'Pago deuda financiera',
      value: formatCOP(financialDebtPaymentCashOut),
      sub: 'Salida aplicada a pasivos financieros',
      icon: DollarSign,
      tone: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      label: 'Obligaciones pendientes',
      value: formatCOP(totalPayables),
      sub: `${dueSoonPayables > 0 ? formatCOP(dueSoonPayables) : formatCOP(0)} por vencer · ${overduePayables} vencida(s)`,
      icon: AlertTriangle,
      tone: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      label: 'Programadas',
      value: `${activeRecurring}`,
      sub: `${upcomingRecurring} por vencer · ${overdueRecurring} vencida(s)`,
      icon: Calendar,
      tone: 'text-gray-600 dark:text-gray-400',
      bg: 'bg-gray-100 dark:bg-gray-700',
    },
  ];

  return (
    <>
      <div className="md:hidden mb-2">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur border border-gray-200 dark:border-gray-700 text-left shadow-sm"
        >
          <div className="flex items-center gap-2">
            <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">Resumen operativo</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">{formatCOP(totalExpenses)}</div>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="grid grid-cols-2 gap-2 mb-2 md:hidden">
          {items.map((item, index) => (
            <div key={index} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur p-2 rounded-2xl border border-gray-200 dark:border-gray-700 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded-lg ${item.bg} ${item.tone}`}>
                  <item.icon className="w-3 h-3" />
                </div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">{item.label}</span>
              </div>
              <div className="text-[11px] font-bold text-gray-900 dark:text-white">{item.value}</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">{item.sub}</div>
            </div>
          ))}
        </div>
      )}

      <div className="hidden md:grid md:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
        {items.map((item, index) => (
          <div key={index} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur md:backdrop-blur-0 p-1.5 md:p-3 rounded-full md:rounded-xl shadow-none md:shadow-sm border border-gray-200 dark:border-gray-700 flex items-center md:flex-col justify-between">
            <div className="flex items-center gap-2 mb-1">
              <div className={`p-1 rounded-lg ${item.bg} ${item.tone}`}>
                <item.icon className="w-3 h-3 md:w-4 md:h-4" />
              </div>
              <span className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-gray-400">{item.label}</span>
            </div>
            <div className="text-xs md:text-lg font-bold text-gray-900 dark:text-white truncate md:mt-1" title={item.value}>{item.value}</div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 md:mt-1 text-center">{item.sub}</div>
          </div>
        ))}
      </div>
    </>
  );
};
