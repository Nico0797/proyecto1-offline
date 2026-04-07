const CANONICAL_PERMISSION_ALIASES: Record<string, string[]> = {
  'customers.view': ['customers.read', 'clients.read'],
  'customers.create': ['customers.create', 'clients.create'],
  'customers.edit': ['customers.update', 'clients.update'],
  'customers.delete': ['customers.delete', 'clients.delete'],
  'sales.view': ['sales.read'],
  'sales.create': ['sales.create'],
  'sales.edit': ['sales.update'],
  'sales.cancel': ['sales.delete'],
  'quotes.view': ['quotes.read'],
  'quotes.create': ['quotes.create'],
  'quotes.edit': ['quotes.update', 'quotes.delete'],
  'quotes.convert_to_sale': ['quotes.convert'],
  'receivables.view': ['payments.read'],
  'receivables.collect': ['payments.create', 'payments.delete'],
  'receivables.adjust_terms': ['payments.update'],
  'products.view': ['products.read'],
  'products.create': ['products.create'],
  'products.edit': ['products.update'],
  'products.delete': ['products.delete'],
  'raw_inventory.view': ['raw_inventory.read'],
  'raw_inventory.adjust': ['raw_inventory.create', 'raw_inventory.update', 'raw_inventory.delete', 'raw_inventory.movements.create'],
  'suppliers.view': ['suppliers.read'],
  'suppliers.create': ['suppliers.create'],
  'suppliers.edit': ['suppliers.update'],
  'suppliers.delete': ['suppliers.delete'],
  'raw_purchases.view': ['raw_purchases.read'],
  'raw_purchases.create': ['raw_purchases.create'],
  'raw_purchases.edit': ['raw_purchases.update'],
  'raw_purchases.confirm': ['raw_purchases.confirm'],
  'raw_purchases.cancel': ['raw_purchases.update'],
  'recipes.view': ['recipes.read'],
  'recipes.create': ['recipes.create'],
  'recipes.edit': ['recipes.update'],
  'recipes.delete': ['recipes.delete'],
  'production.consume_materials': ['recipes.consume'],
  'supplier_payables.view': ['supplier_payables.read'],
  'supplier_payables.pay': ['supplier_payables.pay'],
  'treasury.view': ['treasury.read'],
  'treasury.manage_accounts': ['treasury.create', 'treasury.update'],
  'treasury.create_movement': ['treasury.transfer'],
  'treasury.adjust': ['treasury.update'],
  'expenses.view': ['expenses.read'],
  'expenses.create': ['expenses.create'],
  'expenses.edit': ['expenses.update'],
  'expenses.delete': ['expenses.delete'],
  'debts.view': ['debts.read'],
  'debts.manage': ['debts.manage'],
  'reports.view': ['summary.dashboard'],
  'reports.export': ['export.pdf', 'export.excel'],
  'analytics.view': ['summary.financial', 'summary.dashboard', 'reminders.manage', 'analytics.view_team'],
  'settings.view': ['settings.business'],
  'settings.edit': ['settings.business', 'business.update'],
  'team.view': ['team.read'],
  'team.manage_team': ['team.manage'],
};

const LEGACY_TO_CANONICAL: Record<string, string[]> = {
  'customers.read': ['customers.view'],
  'customers.create': ['customers.create'],
  'customers.update': ['customers.edit'],
  'customers.delete': ['customers.delete'],
  'clients.read': ['customers.view'],
  'clients.create': ['customers.create'],
  'clients.update': ['customers.edit'],
  'clients.delete': ['customers.delete'],
  'sales.read': ['sales.view', 'invoices.view'],
  'sales.create': ['sales.create', 'invoices.create'],
  'sales.update': ['sales.edit', 'invoices.edit'],
  'sales.delete': ['sales.cancel'],
  'quotes.read': ['quotes.view'],
  'quotes.create': ['quotes.create'],
  'quotes.update': ['quotes.edit'],
  'quotes.delete': ['quotes.edit'],
  'quotes.convert': ['quotes.convert_to_sale'],
  'payments.read': ['receivables.view'],
  'payments.create': ['receivables.collect'],
  'payments.update': ['receivables.adjust_terms'],
  'payments.delete': ['receivables.collect'],
  'products.read': ['products.view'],
  'products.create': ['products.create'],
  'products.update': ['products.edit'],
  'products.delete': ['products.delete'],
  'raw_inventory.read': ['raw_inventory.view'],
  'raw_inventory.create': ['raw_inventory.adjust'],
  'raw_inventory.update': ['raw_inventory.adjust'],
  'raw_inventory.delete': ['raw_inventory.adjust'],
  'raw_inventory.movements.create': ['raw_inventory.adjust'],
  'suppliers.read': ['suppliers.view'],
  'suppliers.create': ['suppliers.create'],
  'suppliers.update': ['suppliers.edit'],
  'suppliers.delete': ['suppliers.delete'],
  'raw_purchases.read': ['raw_purchases.view'],
  'raw_purchases.create': ['raw_purchases.create'],
  'raw_purchases.update': ['raw_purchases.edit', 'raw_purchases.cancel'],
  'raw_purchases.confirm': ['raw_purchases.confirm'],
  'recipes.read': ['recipes.view'],
  'recipes.create': ['recipes.create'],
  'recipes.update': ['recipes.edit'],
  'recipes.delete': ['recipes.delete'],
  'recipes.consume': ['production.consume_materials'],
  'supplier_payables.read': ['supplier_payables.view'],
  'supplier_payables.pay': ['supplier_payables.pay'],
  'treasury.read': ['treasury.view'],
  'treasury.create': ['treasury.manage_accounts'],
  'treasury.update': ['treasury.manage_accounts', 'treasury.adjust'],
  'treasury.transfer': ['treasury.create_movement'],
  'expenses.read': ['expenses.view'],
  'expenses.create': ['expenses.create'],
  'expenses.update': ['expenses.edit'],
  'expenses.delete': ['expenses.delete'],
  'debts.read': ['debts.view'],
  'debts.manage': ['debts.manage'],
  'summary.dashboard': ['reports.view', 'analytics.view'],
  'summary.financial': ['analytics.view'],
  'export.pdf': ['reports.export'],
  'export.excel': ['reports.export'],
  'settings.business': ['settings.view', 'settings.edit'],
  'business.update': ['settings.edit'],
  'team.read': ['team.view'],
  'team.manage': ['team.invite', 'team.edit_roles', 'team.remove', 'team.manage_team'],
  'reminders.manage': ['analytics.view'],
  'sales.goals.manage': ['reports.view', 'analytics.view'],
  'sales.goals.view_all': ['reports.view', 'analytics.view'],
  'analytics.view_team': ['analytics.view'],
};

const unique = (values: Array<string | null | undefined>) => Array.from(new Set(values.filter(Boolean) as string[]));

export const expandPermissionCandidates = (permission?: string | null): string[] => {
  const normalized = String(permission || '').trim();
  if (!normalized) return [];
  if (normalized === '*' || normalized === 'admin.*') return [normalized];

  const directCanonical = LEGACY_TO_CANONICAL[normalized] || [];
  const directAliases = CANONICAL_PERMISSION_ALIASES[normalized] || [];
  const nestedAliases = directCanonical.flatMap((item) => CANONICAL_PERMISSION_ALIASES[item] || []);

  return unique([normalized, ...directCanonical, ...directAliases, ...nestedAliases]);
};

export const hasPermissionMatch = (
  grantedPermissions: Array<string | null | undefined> | null | undefined,
  requestedPermission?: string | null,
): boolean => {
  if (!requestedPermission) return true;

  const granted = unique(grantedPermissions || []);
  if (granted.includes('*') || granted.includes('admin.*')) return true;

  const candidates = expandPermissionCandidates(requestedPermission);
  if (candidates.some((candidate) => granted.includes(candidate))) {
    return true;
  }

  const scopes = unique(
    candidates
      .filter((candidate) => !candidate.endsWith('.*'))
      .map((candidate) => candidate.split('.')[0]),
  );

  return scopes.some((scope) => granted.includes(`${scope}.*`));
};
