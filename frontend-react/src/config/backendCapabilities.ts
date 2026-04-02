export type BackendCapability =
  | 'raw_inventory'
  | 'raw_purchases'
  | 'suppliers'
  | 'recipes'
  | 'supplier_payables'
  | 'profitability'
  | 'invoices'
  | 'treasury'
  | 'recurring_expenses';

const SUPPORTED_BACKEND_CAPABILITIES: Record<BackendCapability, boolean> = {
  raw_inventory: true,
  raw_purchases: true,
  suppliers: true,
  recipes: true,
  supplier_payables: true,
  profitability: false,
  invoices: true,
  treasury: true,
  recurring_expenses: true,
};

const PATH_CAPABILITY_MAP: Array<{ matcher: RegExp; capability: BackendCapability }> = [
  { matcher: /^\/raw-inventory(?:\/|$)/, capability: 'raw_inventory' },
  { matcher: /^\/raw-purchases(?:\/|$)/, capability: 'raw_purchases' },
  { matcher: /^\/suppliers(?:\/|$)/, capability: 'suppliers' },
  { matcher: /^\/supplier-payables(?:\/|$)/, capability: 'supplier_payables' },
  { matcher: /^\/recipes(?:\/|$)/, capability: 'recipes' },
  { matcher: /^\/cost-calculator(?:\/|$)/, capability: 'recipes' },
  { matcher: /^\/invoices(?:\/|$)/, capability: 'invoices' },
  { matcher: /^\/treasury(?:\/|$)/, capability: 'treasury' },
];

export const isBackendCapabilitySupported = (capability: BackendCapability) => SUPPORTED_BACKEND_CAPABILITIES[capability];

export const getBackendCapabilityLabel = (capability: BackendCapability) => {
  switch (capability) {
    case 'raw_inventory':
      return 'Bodega';
    case 'raw_purchases':
      return 'Compras';
    case 'suppliers':
      return 'Proveedores';
    case 'recipes':
      return 'Recetas';
    case 'supplier_payables':
      return 'Cuentas por pagar a proveedores';
    case 'profitability':
      return 'Rentabilidad';
    case 'invoices':
      return 'Facturas';
    case 'treasury':
      return 'Tesorería';
    case 'recurring_expenses':
      return 'Gastos recurrentes';
    default:
      return 'Funcionalidad';
  }
};

export const getBackendCapabilitySupportMessage = (capability: BackendCapability) => {
  switch (capability) {
    case 'profitability':
      return 'Esta vista todavía no está expuesta por el backend real actual. La ocultamos para evitar errores 404 y mostrar solo lo que sí está soportado.';
    case 'invoices':
      return 'El módulo de facturas está disponible en el backend actual.';
    case 'treasury':
      return 'El backend real actual no expone cuentas ni movimientos de tesorería. La UI se protege para evitar llamadas inválidas.';
    default:
      return 'Esta funcionalidad aún no está expuesta por el backend real actual. La UI se protege para evitar errores 404 y no simular soporte inexistente.';
  }
};

export const getCapabilityForPath = (path: string): BackendCapability | null => {
  const match = PATH_CAPABILITY_MAP.find((entry) => entry.matcher.test(path));
  return match?.capability || null;
};

export const isBackendPathSupported = (path: string) => {
  const capability = getCapabilityForPath(path);
  return capability ? isBackendCapabilitySupported(capability) : true;
};
