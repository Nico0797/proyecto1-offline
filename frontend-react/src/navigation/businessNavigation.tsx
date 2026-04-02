import { FeatureKey, FEATURES } from '../auth/plan';
import { BusinessCommercialSectionKey } from '../config/businessPersonalization';
import { BusinessModuleKey } from '../types';
import {
  Bell,
  Boxes,
  Calculator,
  ClipboardList,
  CreditCard,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  LayoutDashboard,
  ReceiptText,
  Settings,
  ShoppingCart,
  Store,
  Target,
  Truck,
  Users,
  Wallet,
  LucideIcon,
  FlaskConical,
} from 'lucide-react';

export interface NavigationItemDefinition {
  path: string;
  label: string;
  shortLabel?: string;
  description: string;
  icon: LucideIcon;
  permission?: string;
  moduleKey?: BusinessModuleKey;
  commercialSectionKey?: BusinessCommercialSectionKey;
  feature?: FeatureKey;
  mobilePriority?: number;
  allowHide?: boolean;
  allowFavorite?: boolean;
}

export interface NavigationSectionDefinition {
  id: string;
  title: string;
  items: NavigationItemDefinition[];
  collapsible?: boolean;
}

export const BUSINESS_NAVIGATION_SECTIONS: NavigationSectionDefinition[] = [
  {
    id: 'home',
    title: 'Inicio',
    collapsible: false,
    items: [
      {
        path: '/dashboard',
        label: 'Inicio',
        shortLabel: 'Inicio',
        description: 'Qué pasa hoy, qué requiere atención y dónde registrar lo importante.',
        icon: LayoutDashboard,
        mobilePriority: 0,
        allowHide: false,
      },
    ],
  },
  {
    id: 'operations',
    title: 'Operación',
    collapsible: true,
    items: [
      {
        path: '/sales',
        label: 'Ventas',
        shortLabel: 'Ventas',
        description: 'Registra ventas y seguimiento comercial.',
        icon: ShoppingCart,
        permission: 'sales.read',
        moduleKey: 'sales',
        mobilePriority: 1,
      },
      {
        path: '/customers',
        label: 'Clientes',
        shortLabel: 'Clientes',
        description: 'Revisa clientes, historial, saldos y seguimiento comercial.',
        icon: Users,
        permission: 'customers.read',
        moduleKey: 'customers',
        mobilePriority: 2,
      },
      {
        path: '/quotes',
        label: 'Cotizaciones',
        shortLabel: 'Cotiz.',
        description: 'Crea propuestas y conviértelas a venta cuando corresponda.',
        icon: FileText,
        permission: 'quotes.view',
        moduleKey: 'quotes',
        mobilePriority: 4,
      },
      {
        path: '/invoices',
        label: 'Facturas',
        shortLabel: 'Facturas',
        description: 'Emite facturas digitales, descarga PDF y sigue estados de pago desde el negocio activo.',
        icon: FileSpreadsheet,
        permission: 'invoices.view',
        moduleKey: 'sales',
        commercialSectionKey: 'invoices',
        mobilePriority: 5,
      },
      {
        path: '/orders',
        label: 'Pedidos',
        shortLabel: 'Pedidos',
        description: 'Seguimiento de pedidos y compromisos comerciales.',
        icon: Store,
        permission: 'orders.view',
        moduleKey: 'sales',
        commercialSectionKey: 'orders',
        feature: FEATURES.ORDERS,
        mobilePriority: 8,
      },
    ],
  },
  {
    id: 'inventory',
    title: 'Inventario',
    collapsible: true,
    items: [
      {
        path: '/products',
        label: 'Productos',
        shortLabel: 'Productos',
        description: 'Catálogo de lo que vendes, con precios, stock y servicios.',
        icon: Store,
        permission: 'products.read',
        moduleKey: 'products',
        mobilePriority: 3,
      },
      {
        path: '/raw-inventory',
        label: 'Bodega',
        shortLabel: 'Bodega',
        description: 'Materias primas e insumos con stock y costo referencial.',
        icon: Boxes,
        permission: 'raw_inventory.read',
        moduleKey: 'raw_inventory',
        mobilePriority: 5,
      },
      {
        path: '/raw-purchases',
        label: 'Compras',
        shortLabel: 'Compras',
        description: 'Compras de insumos y confirmación de entradas a bodega.',
        icon: ClipboardList,
        permission: 'raw_purchases.read',
        moduleKey: 'raw_inventory',
        mobilePriority: 8,
      },
      {
        path: '/suppliers',
        label: 'Proveedores',
        shortLabel: 'Prov.',
        description: 'Catálogo de proveedores para abastecimiento.',
        icon: Truck,
        permission: 'suppliers.read',
        moduleKey: 'raw_inventory',
        mobilePriority: 9,
      },
      {
        path: '/recipes',
        label: 'Recetas',
        shortLabel: 'Recetas',
        description: 'Relaciona productos con insumos y consumos.',
        icon: FlaskConical,
        permission: 'recipes.read',
        moduleKey: 'raw_inventory',
        mobilePriority: 10,
      },
      {
        path: '/cost-calculator',
        label: 'Calculadora de costos',
        shortLabel: 'Costos',
        description: 'Simula costos sin mover stock ni ventas.',
        icon: Calculator,
        permission: 'recipes.read',
        moduleKey: 'raw_inventory',
        mobilePriority: 11,
      },
    ],
  },
  {
    id: 'finance',
    title: 'Dinero',
    collapsible: true,
    items: [
      {
        path: '/payments',
        label: 'Cobros',
        shortLabel: 'Cobros',
        description: 'Quién te debe, registrar abonos y seguir saldos pendientes.',
        icon: Wallet,
        permission: 'payments.read',
        moduleKey: 'accounts_receivable',
        mobilePriority: 6,
      },
      {
        path: '/invoices/receivables',
        label: 'Cartera facturas',
        shortLabel: 'Cartera',
        description: 'Saldos, vencimientos y recordatorios de cobro basados en facturas emitidas.',
        icon: ReceiptText,
        permission: 'receivables.view',
        moduleKey: 'accounts_receivable',
        commercialSectionKey: 'invoices',
        mobilePriority: 7,
      },
      {
        path: '/expenses',
        label: 'Gastos',
        shortLabel: 'Gastos',
        description: 'Registrar gastos, programar pagos y revisar pendientes por pagar.',
        icon: Wallet,
        permission: 'expenses.read',
        mobilePriority: 13,
      },
      {
        path: '/debts',
        label: 'Deudas',
        shortLabel: 'Deudas',
        description: 'Tarjetas, préstamos y otros pasivos financieros.',
        icon: CreditCard,
        permission: 'debts.view',
        feature: FEATURES.DEBTS,
        mobilePriority: 14,
      },
      {
        path: '/treasury',
        label: 'Caja y bancos',
        shortLabel: 'Caja',
        description: 'Saldos y movimientos reales de caja, bancos y billeteras.',
        icon: Wallet,
        permission: 'treasury.read',
        mobilePriority: 15,
      },
    ],
  },
  {
    id: 'reports',
    title: 'Reportes',
    collapsible: true,
    items: [
      {
        path: '/alerts',
        label: 'Alertas',
        shortLabel: 'Alertas',
        description: 'Lo que requiere atención y las oportunidades más accionables.',
        icon: Bell,
        permission: 'summary.dashboard',
        moduleKey: 'reports',
        feature: FEATURES.ALERTS,
        mobilePriority: 16,
      },
      {
        path: '/reports',
        label: 'Reportes',
        shortLabel: 'Reportes',
        description: 'Resultados, comparativos, rentabilidad y exportaciones.',
        icon: FileBarChart,
        permission: 'summary.dashboard',
        moduleKey: 'reports',
        feature: FEATURES.REPORTS,
        mobilePriority: 17,
      },
      {
        path: '/sales-goals',
        label: 'Metas de ventas',
        shortLabel: 'Metas',
        description: 'Seguimiento de metas comerciales.',
        icon: Target,
        permission: 'sales.read',
        moduleKey: 'sales',
        commercialSectionKey: 'sales_goals',
        feature: FEATURES.REPORTS,
        mobilePriority: 18,
      },
    ],
  },
  {
    id: 'settings',
    title: 'Configuración',
    collapsible: true,
    items: [
      {
        path: '/settings',
        label: 'Configuración',
        shortLabel: 'Config.',
        description: 'Negocio, experiencia de uso, equipo y ajustes clave.',
        icon: Settings,
        mobilePriority: 19,
        allowHide: false,
      },
      {
        path: '/help',
        label: 'Ayuda',
        shortLabel: 'Ayuda',
        description: 'Centro de ayuda y tutoriales.',
        icon: HelpCircle,
        mobilePriority: 20,
      },
    ],
  },
];

export const BUSINESS_NAVIGATION_ITEMS = BUSINESS_NAVIGATION_SECTIONS.flatMap((section) => section.items);

export const getNavigationItemByPath = (path: string) => BUSINESS_NAVIGATION_ITEMS.find((item) => item.path === path) || null;

export const getNavigationItemsByPaths = (paths: string[]) => paths
  .map((path) => getNavigationItemByPath(path))
  .filter((item): item is NavigationItemDefinition => !!item);
