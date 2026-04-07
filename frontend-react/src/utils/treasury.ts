import type { TreasuryAccount, TreasuryAccountType } from '../types';

export const TREASURY_ACCOUNT_TYPE_LABELS: Record<string, string> = {
  cash: 'Caja',
  bank: 'Banco',
  checking: 'Cuenta corriente',
  savings: 'Ahorros',
  card: 'Tarjeta',
  wallet: 'Billetera',
  other: 'Otra',
};

export const getTreasuryAccountTypeLabel = (accountType?: TreasuryAccountType | string | null): string => {
  if (!accountType) return 'Sin tipo';
  return TREASURY_ACCOUNT_TYPE_LABELS[String(accountType)] || String(accountType);
};

export const formatTreasuryAccountLabel = (
  account?: Pick<TreasuryAccount, 'name' | 'account_type' | 'current_balance' | 'currency' | 'is_default'> | null,
  showBalance = false
): string => {
  if (!account) return 'Sin cuenta';

  const typeLabel = getTreasuryAccountTypeLabel(account.account_type);
  const defaultLabel = account.is_default ? ' | Principal' : '';
  const balanceLabel = showBalance && typeof account.current_balance === 'number'
    ? ` | ${account.current_balance.toLocaleString('es-CO', { style: 'currency', currency: account.currency || 'COP', maximumFractionDigits: 0 })}`
    : '';

  return `${account.name} | ${typeLabel}${defaultLabel}${balanceLabel}`;
};

export const sortTreasuryAccounts = <T extends Pick<TreasuryAccount, 'is_default' | 'is_active' | 'name'>>(accounts: T[]): T[] => {
  return [...accounts].sort((left, right) => {
    if (Boolean(left.is_default) !== Boolean(right.is_default)) {
      return Number(Boolean(right.is_default)) - Number(Boolean(left.is_default));
    }
    if (Boolean(left.is_active) !== Boolean(right.is_active)) {
      return Number(Boolean(right.is_active)) - Number(Boolean(left.is_active));
    }
    return String(left.name || '').localeCompare(String(right.name || ''), 'es');
  });
};
