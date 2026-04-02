import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  ShieldCheck,
  Star,
  Wallet,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { CompactActionGroup, PageBody, PageHeader, PageLayout } from '../components/Layout/PageLayout';
import {
  MobileFilterDrawer,
  MobileSelectField,
  MobileUnifiedPageShell,
  MobileUtilityBar,
  useMobileFilterDraft,
} from '../components/mobile/MobileContentFirst';
import { TreasuryAccountFormModal } from '../components/Treasury/TreasuryAccountFormModal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { TeachingEmptyState } from '../components/ui/TeachingEmptyState';
import { useAccess } from '../hooks/useAccess';
import type { TreasuryAccount } from '../types';
import { useBusinessStore } from '../store/businessStore';
import { useTreasuryStore } from '../store/treasuryStore';
import { formatTreasuryAccountLabel, getTreasuryAccountTypeLabel, sortTreasuryAccounts } from '../utils/treasury';

const formatCurrency = (value?: number | null, currency = 'COP') => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const parsedDate = new Date(isDateOnly ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsedDate.getTime())) return value;
  const dateLabel = parsedDate.toLocaleDateString('es-CO');
  if (isDateOnly) return dateLabel;
  return `${dateLabel} ${parsedDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;
};

const MOVEMENT_SOURCE_LABELS: Record<string, string> = {
  sale_payment: 'Cobro',
  payment: 'Cobro',
  expense: 'Gasto directo',
  manual: 'Gasto directo',
  recurring: 'Recurrente',
  purchase_payment: 'Compra pagada',
  supplier_payment: 'Pago a proveedor',
  debt_payment: 'Pago de obligacion',
  transfer: 'Transferencia interna',
  invoice_payment: 'Cobro de factura',
  invoice_refund: 'Reembolso de factura',
  invoice_reversal: 'Reversion de cobro',
};

export const Treasury = () => {
  const { activeBusiness } = useBusinessStore();
  const { hasPermission } = useAccess();
  const {
    accounts,
    accountsSummary,
    movements,
    loadingAccounts,
    loadingMovements,
    mutatingAccount,
    error,
    fetchAccounts,
    fetchMovements,
    createAccount,
    updateAccount,
  } = useTreasuryStore();

  const canRead = hasPermission('treasury.read');
  const canCreate = hasPermission('treasury.create');
  const canUpdate = hasPermission('treasury.update');
  const currency = activeBusiness?.currency || 'COP';

  const [search, setSearch] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedAccountType, setSelectedAccountType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<TreasuryAccount | null>(null);
  const hasActiveFilters = Boolean(search || selectedAccountId || selectedAccountType || startDate || endDate);

  useEffect(() => {
    if (!activeBusiness || !canRead) return;
    fetchAccounts(activeBusiness.id).catch((fetchError) => {
      console.error('Error loading treasury accounts', fetchError);
    });
  }, [activeBusiness, canRead, fetchAccounts]);

  useEffect(() => {
    if (!activeBusiness || !canRead) return;
    fetchMovements(activeBusiness.id, {
      search: search || undefined,
      account_id: selectedAccountId ? Number(selectedAccountId) : undefined,
      account_type: selectedAccountType || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }).catch((fetchError) => {
      console.error('Error loading treasury movements', fetchError);
    });
  }, [activeBusiness, canRead, endDate, fetchMovements, search, selectedAccountId, selectedAccountType, startDate]);

  const sortedAccounts = useMemo(() => sortTreasuryAccounts(accounts), [accounts]);
  const accountTypeOptions = useMemo(() => {
    const availableTypes = new Set<string>();
    sortedAccounts.forEach((account) => {
      if (account.account_type) availableTypes.add(String(account.account_type));
    });
    return Array.from(availableTypes.values());
  }, [sortedAccounts]);

  const visibleMovements = useMemo(() => movements.slice(0, 50), [movements]);
  const defaultAccount = useMemo(() => sortedAccounts.find((account) => account.is_default), [sortedAccounts]);

  const treasuryFilterSummary = hasActiveFilters
    ? `${selectedAccountId ? 'Cuenta' : 'Filtros'}${selectedAccountType ? ' · Tipo' : ''}${startDate || endDate ? ' · Fechas' : ''}`
    : 'Buscar, cuenta y fechas';
  const mobileTreasuryFilters = useMobileFilterDraft({
    value: { search, selectedAccountId, selectedAccountType, startDate, endDate },
    onApply: (nextValue) => {
      setSearch(nextValue.search);
      setSelectedAccountId(nextValue.selectedAccountId);
      setSelectedAccountType(nextValue.selectedAccountType);
      setStartDate(nextValue.startDate);
      setEndDate(nextValue.endDate);
    },
    createEmptyValue: () => ({
      search: '',
      selectedAccountId: '',
      selectedAccountType: '',
      startDate: '',
      endDate: '',
    }),
  });

  const errorNotice = error ? (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
      {error}
    </div>
  ) : null;

  const handleRefresh = async () => {
    if (!activeBusiness || !canRead) return;
    await Promise.all([
      fetchAccounts(activeBusiness.id),
      fetchMovements(activeBusiness.id, {
        search: search || undefined,
        account_id: selectedAccountId ? Number(selectedAccountId) : undefined,
        account_type: selectedAccountType || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      }),
    ]);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedAccountId('');
    setSelectedAccountType('');
    setStartDate('');
    setEndDate('');
  };

  const treasuryFilterContent = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
      <Input
        label="Buscar"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Descripcion, documento, contraparte"
      />
      <MobileSelectField
        label="Cuenta"
        value={selectedAccountId}
        onChange={setSelectedAccountId}
        options={[
          { value: '', label: 'Todas' },
          ...sortedAccounts.map((account) => ({ value: String(account.id), label: formatTreasuryAccountLabel(account) })),
        ]}
        placeholder="Todas"
        sheetTitle="Filtrar por cuenta"
      />
      <MobileSelectField
        label="Tipo"
        value={selectedAccountType}
        onChange={setSelectedAccountType}
        options={[
          { value: '', label: 'Todos' },
          ...accountTypeOptions.map((accountType) => ({ value: accountType, label: getTreasuryAccountTypeLabel(accountType) })),
        ]}
        placeholder="Todos"
        sheetTitle="Tipo de cuenta"
      />
      <Input label="Desde" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
      <div className="flex flex-col gap-3">
        <Input label="Hasta" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        {hasActiveFilters ? (
          <Button type="button" variant="secondary" onClick={clearFilters} className="w-full">
            Limpiar filtros
          </Button>
        ) : null}
      </div>
    </div>
  );

  const mobileTreasuryFilterContent = (
    <div className="grid grid-cols-1 gap-3">
      <Input
        label="Buscar"
        value={mobileTreasuryFilters.draft.search}
        onChange={(event) => mobileTreasuryFilters.setDraft((current) => ({ ...current, search: event.target.value }))}
        placeholder="Descripcion, documento, contraparte"
      />
      <MobileSelectField
        label="Cuenta"
        value={mobileTreasuryFilters.draft.selectedAccountId}
        onChange={(value) => mobileTreasuryFilters.setDraft((current) => ({ ...current, selectedAccountId: value }))}
        options={[
          { value: '', label: 'Todas' },
          ...sortedAccounts.map((account) => ({ value: String(account.id), label: formatTreasuryAccountLabel(account) })),
        ]}
        placeholder="Todas"
        sheetTitle="Filtrar por cuenta"
      />
      <MobileSelectField
        label="Tipo"
        value={mobileTreasuryFilters.draft.selectedAccountType}
        onChange={(value) => mobileTreasuryFilters.setDraft((current) => ({ ...current, selectedAccountType: value }))}
        options={[
          { value: '', label: 'Todos' },
          ...accountTypeOptions.map((accountType) => ({ value: accountType, label: getTreasuryAccountTypeLabel(accountType) })),
        ]}
        placeholder="Todos"
        sheetTitle="Tipo de cuenta"
      />
      <Input label="Desde" type="date" value={mobileTreasuryFilters.draft.startDate} onChange={(event) => mobileTreasuryFilters.setDraft((current) => ({ ...current, startDate: event.target.value }))} />
      <Input label="Hasta" type="date" value={mobileTreasuryFilters.draft.endDate} onChange={(event) => mobileTreasuryFilters.setDraft((current) => ({ ...current, endDate: event.target.value }))} />
    </div>
  );

  const openCreateModal = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const openEditModal = (account: TreasuryAccount) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  const handleSubmitAccount = async (payload: {
    name: string;
    account_type: string;
    currency?: string | null;
    opening_balance?: number;
    notes?: string | null;
    is_active?: boolean;
    is_default?: boolean;
  }) => {
    if (!activeBusiness) return;
    if (editingAccount) {
      await updateAccount(activeBusiness.id, editingAccount.id, payload);
      toast.success('Cuenta actualizada');
      return;
    }
    await createAccount(activeBusiness.id, payload);
    toast.success('Cuenta creada');
  };

  const handleToggleActive = async (account: TreasuryAccount) => {
    if (!activeBusiness) return;
    const nextActive = !account.is_active;
    try {
      await updateAccount(activeBusiness.id, account.id, {
        name: account.name,
        account_type: account.account_type,
        currency: account.currency,
        opening_balance: account.opening_balance,
        notes: account.notes,
        is_active: nextActive,
        is_default: nextActive ? Boolean(account.is_default) : false,
      });
      toast.success(nextActive ? 'Cuenta activada' : 'Cuenta desactivada');
    } catch (toggleError: any) {
      toast.error(toggleError?.response?.data?.error || 'No se pudo actualizar el estado de la cuenta');
    }
  };

  const handleSetDefault = async (account: TreasuryAccount) => {
    if (!activeBusiness) return;
    try {
      await updateAccount(activeBusiness.id, account.id, {
        name: account.name,
        account_type: account.account_type,
        currency: account.currency,
        opening_balance: account.opening_balance,
        notes: account.notes,
        is_active: true,
        is_default: true,
      });
      toast.success('Cuenta principal actualizada');
    } catch (defaultError: any) {
      toast.error(defaultError?.response?.data?.error || 'No se pudo asignar la cuenta principal');
    }
  };

  if (!activeBusiness) {
    return (
      <TeachingEmptyState
        icon={Wallet}
        title="Selecciona un negocio"
        description="La tesoreria se muestra dentro del contexto de un negocio activo."
      />
    );
  }

  if (!canRead) {
    return (
      <TeachingEmptyState
        icon={Landmark}
        title="Sin acceso a tesoreria"
        description="Necesitas el permiso `treasury.read` para ver cuentas, saldos y movimientos."
      />
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title="Tesoreria"
        description="Administra tus cajas, bancos y billeteras sin perder el rastro historico de ingresos, gastos, cobros y transferencias."
        action={(
          <CompactActionGroup
            collapseLabel="Mas"
            primary={(
              <Button variant="secondary" onClick={handleRefresh} isLoading={loadingAccounts || loadingMovements} className="w-full sm:w-auto">
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </Button>
            )}
            secondary={[
              canCreate ? (
                <Button key="add-account" onClick={openCreateModal} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  Agregar cuenta
                </Button>
              ) : null,
              hasActiveFilters ? (
                <Button key="clear-filters" variant="secondary" onClick={clearFilters} className="w-full sm:w-auto">
                  Limpiar filtros
                </Button>
              ) : null,
            ]}
          />
        )}
      />

      <PageBody className="bg-gray-50 dark:bg-gray-950/40">
        <div className="space-y-6">
          <div className="lg:hidden">
            <MobileUnifiedPageShell
              utilityBar={(
                <MobileUtilityBar>
                  <MobileFilterDrawer summary={treasuryFilterSummary} {...mobileTreasuryFilters.sheetProps}>
                    {mobileTreasuryFilterContent}
                  </MobileFilterDrawer>
                </MobileUtilityBar>
              )}
            >
              {errorNotice}
            </MobileUnifiedPageShell>
          </div>

          <div className="hidden lg:block">{errorNotice}</div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="app-stat-card">
              <div className="text-sm text-gray-500 dark:text-gray-400">Saldo total visible</div>
              <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(accountsSummary?.total_balance, currency)}
              </div>
            </div>
            <div className="app-stat-card">
              <div className="text-sm text-gray-500 dark:text-gray-400">Cuentas activas</div>
              <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {accountsSummary?.active_accounts_count ?? 0}
              </div>
            </div>
            <div className="app-stat-card">
              <div className="text-sm text-gray-500 dark:text-gray-400">Cuenta principal</div>
              <div className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
                {defaultAccount ? defaultAccount.name : 'Sin definir'}
              </div>
            </div>
            <div className="app-stat-card">
              <div className="text-sm text-gray-500 dark:text-gray-400">Movimientos cargados</div>
              <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{movements.length}</div>
            </div>
          </div>

          {accountsSummary?.by_type?.length ? (
            <div className="flex flex-wrap gap-2">
              {accountsSummary.by_type.map((item) => (
                <div
                  key={item.account_type}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-3.5 py-2 text-xs text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                >
                  <span className="font-medium text-gray-900 dark:text-white">
                    {getTreasuryAccountTypeLabel(item.account_type)}
                  </span>
                  <span>{item.accounts_count} cuentas</span>
                  <span>|</span>
                  <span>{formatCurrency(item.total_balance, currency)}</span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="hidden lg:block app-toolbar space-y-3">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Filtros</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
                Ajusta la lista de movimientos sin salir del workspace.
              </div>
            </div>
            {treasuryFilterContent}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <div className="app-surface p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-gray-900 dark:text-white">Cuentas del negocio</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Crea y organiza todas tus cajas, bancos y billeteras.</div>
                </div>
                <Landmark className="h-5 w-5 text-gray-400" />
              </div>

              {loadingAccounts ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                  ))}
                </div>
              ) : sortedAccounts.length === 0 ? (
                <TeachingEmptyState
                  icon={Landmark}
                  title="Todavia no hay cuentas"
                  description="Crea tu primera cuenta para empezar a registrar caja, bancos y otros medios sin perder trazabilidad."
                  primaryActionLabel={canCreate ? 'Crear primera cuenta' : undefined}
                  onPrimaryAction={canCreate ? openCreateModal : undefined}
                />
              ) : (
                <div className="space-y-3">
                  {sortedAccounts.map((account) => {
                    const accountCurrency = account.currency || currency;
                    const historyTotal = account.history_usage?.total || 0;
                    return (
                      <div key={account.id} className="rounded-[22px] border border-gray-200 bg-gray-50 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/40">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="truncate font-semibold text-gray-900 dark:text-white">{account.name}</div>
                              {account.is_default ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                  <ShieldCheck className="h-3 w-3" />
                                  Principal
                                </span>
                              ) : null}
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                  account.is_active
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {account.is_active ? 'Activa' : 'Inactiva'}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {getTreasuryAccountTypeLabel(account.account_type)}
                              {account.payment_method_key ? ` | Vinculada a ${account.payment_method_key}` : ''}
                            </div>
                          </div>
                          {canUpdate ? (
                            <div className="flex shrink-0 flex-wrap justify-end gap-2">
                              {!account.is_default ? (
                                <Button type="button" size="sm" variant="ghost" onClick={() => handleSetDefault(account)} disabled={mutatingAccount}>
                                  <Star className="h-4 w-4" />
                                  Principal
                                </Button>
                              ) : null}
                              <Button type="button" size="sm" variant="ghost" onClick={() => openEditModal(account)}>
                                <Pencil className="h-4 w-4" />
                                Editar
                              </Button>
                              <Button type="button" size="sm" variant="ghost" onClick={() => handleToggleActive(account)} disabled={mutatingAccount}>
                                <Power className="h-4 w-4" />
                                {account.is_active ? 'Desactivar' : 'Activar'}
                              </Button>
                            </div>
                          ) : null}
                        </div>

                        <div className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(account.current_balance, accountCurrency)}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <div>
                            <div>Saldo inicial</div>
                            <div className="mt-1 font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(account.opening_balance, accountCurrency)}
                            </div>
                          </div>
                          <div>
                            <div>Historial</div>
                            <div className="mt-1 font-semibold text-gray-900 dark:text-white">
                              {historyTotal} movimiento(s)
                            </div>
                          </div>
                          <div>
                            <div>Entradas</div>
                            <div className="mt-1 font-semibold text-green-600 dark:text-green-400">
                              {formatCurrency(account.inflows_total, accountCurrency)}
                            </div>
                          </div>
                          <div>
                            <div>Salidas</div>
                            <div className="mt-1 font-semibold text-red-600 dark:text-red-400">
                              {formatCurrency(account.outflows_total, accountCurrency)}
                            </div>
                          </div>
                        </div>

                        {account.notes ? (
                          <div className="mt-3 rounded-2xl bg-white/80 px-3 py-2 text-xs text-gray-600 dark:bg-gray-900/60 dark:text-gray-300">
                            {account.notes}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="app-surface p-5 sm:p-6">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-base font-semibold text-gray-900 dark:text-white">Movimientos recientes</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Entradas y salidas reales con trazabilidad por cuenta.
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Mostrando {visibleMovements.length} de {movements.length}
                </div>
              </div>

              {loadingMovements ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                  ))}
                </div>
              ) : visibleMovements.length === 0 ? (
                <TeachingEmptyState
                  icon={RefreshCw}
                  title="Sin movimientos para este filtro"
                  description="Prueba otro rango, una cuenta diferente o amplia la busqueda para ver actividad de tesoreria."
                />
              ) : (
                <div className="space-y-3">
                  {visibleMovements.map((movement) => {
                    const isIncome = movement.type === 'income' || movement.direction === 'in';
                    return (
                      <div key={movement.id} className="rounded-[22px] border border-gray-200 bg-gray-50 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/40">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div
                                className={`rounded-full p-2 ${
                                  isIncome
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                }`}
                              >
                                {isIncome ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-gray-900 dark:text-white">{movement.description}</div>
                                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                  {formatDateTime(movement.date)}
                                  {movement.source_type ? ` | ${MOVEMENT_SOURCE_LABELS[movement.source_type] || movement.source_type}` : ''}
                                  {movement.payment_method ? ` | ${movement.payment_method}` : ''}
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-gray-500 dark:text-gray-400 md:grid-cols-2">
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Cuenta:</span>{' '}
                                {movement.treasury_account_name
                                  ? `${movement.treasury_account_name} | ${getTreasuryAccountTypeLabel(movement.treasury_account_type)}`
                                  : 'Sin cuenta'}
                              </div>
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Documento:</span>{' '}
                                {movement.document_label || '-'}
                              </div>
                              {(movement.counterparty_account_name || movement.counterparty_name) ? (
                                <div className="md:col-span-2">
                                  <span className="font-medium text-gray-700 dark:text-gray-300">Contraparte:</span>{' '}
                                  {movement.counterparty_account_name
                                    ? `${movement.counterparty_account_name} | ${getTreasuryAccountTypeLabel(movement.counterparty_account_type)}`
                                    : movement.counterparty_name || '-'}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <div className="shrink-0 text-left lg:text-right">
                            <div className={`inline-flex min-w-[140px] items-center justify-center rounded-2xl px-3.5 py-2 text-base font-bold lg:justify-end ${isIncome ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'}`}>
                              {isIncome ? '+' : '-'}
                              {formatCurrency(movement.amount, currency)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </PageBody>

      <TreasuryAccountFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAccount(null);
        }}
        onSubmit={handleSubmitAccount}
        account={editingAccount}
        currency={currency}
        loading={mutatingAccount}
      />
    </PageLayout>
  );
};
