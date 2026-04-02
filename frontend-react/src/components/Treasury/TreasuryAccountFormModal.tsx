import React, { useEffect, useMemo, useState } from 'react';
import { Landmark, ShieldCheck } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { TreasuryAccount } from '../../types';
import { getTreasuryAccountTypeLabel } from '../../utils/treasury';

const ACCOUNT_TYPE_OPTIONS = ['cash', 'bank', 'checking', 'savings', 'wallet', 'card', 'other'] as const;

interface TreasuryAccountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    account_type: string;
    currency?: string | null;
    opening_balance?: number;
    notes?: string | null;
    is_active?: boolean;
    is_default?: boolean;
  }) => Promise<void>;
  account?: TreasuryAccount | null;
  currency?: string;
  loading?: boolean;
}

export const TreasuryAccountFormModal: React.FC<TreasuryAccountFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  account,
  currency = 'COP',
  loading = false,
}) => {
  const isEditing = Boolean(account);
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<string>('cash');
  const [accountCurrency, setAccountCurrency] = useState(currency);
  const [openingBalance, setOpeningBalance] = useState('0');
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(account?.name || '');
    setAccountType(account?.account_type || 'cash');
    setAccountCurrency(account?.currency || currency || 'COP');
    setOpeningBalance(String(account?.opening_balance ?? 0));
    setNotes(account?.notes || '');
    setIsActive(account?.is_active ?? true);
    setIsDefault(Boolean(account?.is_default));
    setError(null);
  }, [account, currency, isOpen]);

  const usageTotal = account?.history_usage?.total || 0;
  const historyHint = useMemo(() => {
    if (!usageTotal) return null;
    return `Esta cuenta ya tiene ${usageTotal} movimiento(s) vinculados. Si no la quieres seguir usando, desactivala en lugar de intentar reemplazar su historial.`;
  }, [usageTotal]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      await onSubmit({
        name: name.trim(),
        account_type: accountType,
        currency: accountCurrency.trim().toUpperCase() || currency,
        opening_balance: Number(openingBalance || 0),
        notes: notes.trim() || null,
        is_active: isActive,
        is_default: isDefault,
      });
      onClose();
    } catch (submitError: any) {
      setError(submitError?.response?.data?.error || submitError?.message || 'No se pudo guardar la cuenta');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar cuenta de tesoreria' : 'Nueva cuenta de tesoreria'}
      maxWidth="max-w-2xl"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Nombre de la cuenta"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Caja principal, Banco Davivienda..."
            required
            autoFocus
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold tracking-tight app-text-secondary">Tipo de cuenta</label>
            <select className="app-select" value={accountType} onChange={(event) => setAccountType(event.target.value)}>
              {ACCOUNT_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {getTreasuryAccountTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Moneda"
            value={accountCurrency}
            onChange={(event) => setAccountCurrency(event.target.value.toUpperCase())}
            placeholder={currency}
            maxLength={10}
          />
          <Input
            label="Saldo inicial"
            type="number"
            step="0.01"
            value={openingBalance}
            onChange={(event) => setOpeningBalance(event.target.value)}
            placeholder="0"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold tracking-tight app-text-secondary">Notas</label>
            <textarea
              className="app-field-surface min-h-[112px] w-full rounded-2xl px-3.5 py-3 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Describe para que usas esta cuenta o como la identificas dentro del negocio."
            />
            {account?.payment_method_key ? (
              <p className="text-xs text-amber-600 dark:text-amber-300">
                Esta cuenta ya esta conectada al metodo heredado `{account.payment_method_key}` para mantener compatibilidad historica.
              </p>
            ) : null}
          </div>

          <div className="rounded-[24px] border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <Landmark className="h-4 w-4 text-blue-500" />
              Estado de la cuenta
            </div>
            <div className="mt-4 space-y-3">
              <label className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm dark:border-gray-700 dark:bg-gray-800/50">
                <input type="checkbox" className="mt-1" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
                <span>
                  <span className="font-medium text-gray-900 dark:text-white">Cuenta activa</span>
                  <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">Las cuentas inactivas conservan su historia, pero dejan de aparecer en formularios nuevos.</span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm dark:border-gray-700 dark:bg-gray-800/50">
                <input type="checkbox" className="mt-1" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} />
                <span>
                  <span className="inline-flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    Cuenta principal
                  </span>
                  <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">La cuenta principal se muestra primero y sirve como referencia por defecto dentro del negocio.</span>
                </span>
              </label>
            </div>
          </div>
        </div>

        {historyHint ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-200">
            {historyHint}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button type="submit" isLoading={loading} className="w-full sm:w-auto">
            {isEditing ? 'Guardar cambios' : 'Crear cuenta'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
