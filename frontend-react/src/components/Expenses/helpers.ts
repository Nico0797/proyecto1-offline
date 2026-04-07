import { RecurringExpense } from '../../store/recurringExpenseStore';

export const formatCOP = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const getFrequencyLabel = (frequency: string) => {
  switch (frequency) {
    case 'monthly': return 'Mensual';
    case 'weekly': return 'Semanal';
    case 'biweekly': return 'Quincenal';
    case 'annual': return 'Anual';
    default: return frequency;
  }
};

export const calculateNextDate = (currentDate: Date, frequency: string): Date => {
  const date = new Date(currentDate);
  switch (frequency) {
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 15);
      break;
    case 'annual':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date;
};

export const isOverdue = (dateString?: string) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

export const isDueSoon = (dateString?: string, days = 7) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const future = new Date(today);
  future.setDate(future.getDate() + days);
  
  return date >= today && date <= future;
};

export const getRecurringStatusColor = (expense: RecurringExpense) => {
  if (!expense.is_active) return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
  
  if (expense.next_due_date) {
      if (isOverdue(expense.next_due_date)) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      if (isDueSoon(expense.next_due_date)) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
  }
  
  return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
};

export const getRecurringStatusLabel = (expense: RecurringExpense) => {
    if (!expense.is_active) return 'Inactivo';
    if (expense.next_due_date) {
        if (isOverdue(expense.next_due_date)) return 'Vencido';
        if (isDueSoon(expense.next_due_date)) return 'Por Vencer';
    }
    return 'Al Día';
};
