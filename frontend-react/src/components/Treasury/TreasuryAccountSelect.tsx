import React, { useEffect } from 'react';
import { useTreasuryStore } from '../../store/treasuryStore';
import { formatTreasuryAccountLabel, sortTreasuryAccounts } from '../../utils/treasury';
import { isBackendCapabilitySupported } from '../../config/backendCapabilities';

interface TreasuryAccountSelectProps {
  businessId?: number | null;
  value: number | null;
  onChange: (value: number | null) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  showBalance?: boolean;
}

export const TreasuryAccountSelect: React.FC<TreasuryAccountSelectProps> = ({
  businessId,
  value,
  onChange,
  label = 'Cuenta de tesoreria',
  placeholder = 'Seleccionar cuenta',
  helperText,
  disabled = false,
  required = false,
  showBalance = false,
}) => {
  const { accounts, loadingAccounts, fetchAccounts, businessId: loadedBusinessId } = useTreasuryStore();
  const supportsTreasury = isBackendCapabilitySupported('treasury');

  useEffect(() => {
    if (!supportsTreasury) return;
    if (!businessId) return;
    if (loadedBusinessId === businessId && accounts.length > 0) return;

    fetchAccounts(businessId).catch((error) => {
      console.error('Error loading treasury accounts', error);
    });
  }, [supportsTreasury, businessId, loadedBusinessId, accounts.length, fetchAccounts]);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}{required ? ' *' : ''}
      </label>
      <select
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        value={value ?? ''}
        onChange={(event: React.ChangeEvent<HTMLSelectElement>) => onChange(event.target.value ? Number(event.target.value) : null)}
        disabled={disabled || !businessId || loadingAccounts || !supportsTreasury}
        required={required}
      >
        <option value="">{!supportsTreasury ? 'Tesorería no disponible' : loadingAccounts ? 'Cargando cuentas...' : placeholder}</option>
        {sortTreasuryAccounts(accounts)
          .filter((account) => account.is_active)
          .map((account) => (
            <option key={account.id} value={account.id}>
              {formatTreasuryAccountLabel(account, showBalance)}
            </option>
          ))}
      </select>
      {helperText || !supportsTreasury ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {!supportsTreasury ? 'Este backend no expone cuentas de tesorería. El campo se desactiva para evitar errores 404.' : helperText}
        </p>
      ) : null}
    </div>
  );
};
