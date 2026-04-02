from __future__ import annotations

from typing import Any

PLAN_ORDER = ('basic', 'pro', 'business')
MODULE_MIN_PLAN: dict[str, str] = {
    'sales': 'basic',
    'customers': 'basic',
    'products': 'basic',
    'reports': 'basic',
    'accounts_receivable': 'pro',
    'quotes': 'pro',
    'raw_inventory': 'pro',
}

PERMISSION_DEFINITIONS: list[dict[str, Any]] = [
    {'name': 'admin.*', 'description': 'Acceso total al panel de administración', 'category': 'admin', 'scope': 'system', 'visible': False},
    {'name': 'admin.users', 'description': 'Gestionar usuarios', 'category': 'admin', 'scope': 'system', 'visible': False},
    {'name': 'admin.roles', 'description': 'Gestionar roles globales', 'category': 'admin', 'scope': 'system', 'visible': False},
    {'name': 'admin.permissions', 'description': 'Gestionar permisos globales', 'category': 'admin', 'scope': 'system', 'visible': False},
    {'name': 'customers.view', 'description': 'Ver clientes', 'category': 'commercial', 'scope': 'business', 'visible': True, 'requires_modules': ('customers',)},
    {'name': 'customers.create', 'description': 'Crear clientes', 'category': 'commercial', 'scope': 'business', 'visible': True, 'requires_modules': ('customers',)},
    {'name': 'customers.edit', 'description': 'Editar clientes', 'category': 'commercial', 'scope': 'business', 'visible': True, 'requires_modules': ('customers',)},
    {'name': 'customers.delete', 'description': 'Eliminar clientes', 'category': 'commercial', 'scope': 'business', 'visible': True, 'requires_modules': ('customers',)},
    {'name': 'sales.view', 'description': 'Ver ventas', 'category': 'commercial', 'scope': 'business', 'visible': True, 'requires_modules': ('sales',)},
    {'name': 'sales.create', 'description': 'Crear ventas', 'category': 'commercial', 'scope': 'business', 'visible': True, 'requires_modules': ('sales',)},
    {'name': 'sales.edit', 'description': 'Editar ventas', 'category': 'commercial', 'scope': 'business', 'visible': True, 'requires_modules': ('sales',)},
    {'name': 'sales.cancel', 'description': 'Cancelar ventas', 'category': 'commercial', 'scope': 'business', 'visible': True, 'requires_modules': ('sales',)},
    {'name': 'sales.apply_discount', 'description': 'Aplicar descuentos', 'category': 'commercial', 'scope': 'business', 'visible': True, 'requires_modules': ('sales',)},
    {'name': 'sales.change_price', 'description': 'Cambiar precios en venta', 'category': 'commercial', 'scope': 'business', 'visible': True, 'requires_modules': ('sales',)},
    {'name': 'quotes.view', 'description': 'Ver cotizaciones', 'category': 'commercial', 'scope': 'business', 'visible': True, 'requires_modules': ('quotes',), 'requires_quotes': True},
    {'name': 'quotes.create', 'description': 'Crear cotizaciones', 'category': 'commercial', 'scope': 'business', 'visible': True, 'requires_modules': ('quotes',), 'requires_quotes': True},
    {'name': 'quotes.edit', 'description': 'Editar cotizaciones', 'category': 'commercial', 'scope': 'business', 'visible': True, 'requires_modules': ('quotes',), 'requires_quotes': True},
    {'name': 'quotes.approve', 'description': 'Aprobar cotizaciones', 'category': 'commercial', 'scope': 'business', 'visible': True, 'requires_modules': ('quotes',), 'requires_quotes': True},
    {'name': 'quotes.convert_to_sale', 'description': 'Convertir cotizaciones en venta', 'category': 'commercial', 'scope': 'business', 'visible': True, 'requires_modules': ('quotes',), 'requires_quotes': True},
    {'name': 'invoices.view', 'description': 'Ver facturas', 'category': 'commercial', 'scope': 'business', 'visible': True, 'requires_modules': ('sales',), 'requires_commercial_sections': ('invoices',)},
    {'name': 'invoices.create', 'description': 'Crear facturas', 'category': 'commercial', 'scope': 'business', 'visible': True, 'requires_modules': ('sales',), 'requires_commercial_sections': ('invoices',)},
    {'name': 'invoices.edit', 'description': 'Editar facturas y configuración', 'category': 'commercial', 'scope': 'business', 'visible': True, 'requires_modules': ('sales',), 'requires_commercial_sections': ('invoices',)},
    {'name': 'orders.view', 'description': 'Ver pedidos', 'category': 'commercial', 'scope': 'business', 'visible': True, 'requires_modules': ('sales',), 'requires_commercial_sections': ('orders',)},
    {'name': 'orders.manage', 'description': 'Gestionar pedidos', 'category': 'commercial', 'scope': 'business', 'visible': True, 'requires_modules': ('sales',), 'requires_commercial_sections': ('orders',)},
    {'name': 'receivables.view', 'description': 'Ver cartera y cobros', 'category': 'receivables', 'scope': 'business', 'visible': True, 'requires_modules': ('accounts_receivable',)},
    {'name': 'receivables.collect', 'description': 'Registrar cobros', 'category': 'receivables', 'scope': 'business', 'visible': True, 'requires_modules': ('accounts_receivable',)},
    {'name': 'receivables.adjust_terms', 'description': 'Ajustar plazos y condiciones de cobro', 'category': 'receivables', 'scope': 'business', 'visible': True, 'requires_modules': ('accounts_receivable',)},
    {'name': 'receivables.export', 'description': 'Exportar cartera', 'category': 'receivables', 'scope': 'business', 'visible': True, 'requires_modules': ('accounts_receivable',)},
    {'name': 'products.view', 'description': 'Ver productos y servicios', 'category': 'products', 'scope': 'business', 'visible': True, 'requires_modules': ('products',)},
    {'name': 'products.create', 'description': 'Crear productos y servicios', 'category': 'products', 'scope': 'business', 'visible': True, 'requires_modules': ('products',)},
    {'name': 'products.edit', 'description': 'Editar productos y servicios', 'category': 'products', 'scope': 'business', 'visible': True, 'requires_modules': ('products',)},
    {'name': 'products.delete', 'description': 'Eliminar productos y servicios', 'category': 'products', 'scope': 'business', 'visible': True, 'requires_modules': ('products',)},
    {'name': 'products.adjust_stock', 'description': 'Ajustar stock de producto terminado', 'category': 'products', 'scope': 'business', 'visible': True, 'requires_modules': ('products',), 'requires_finished_goods': True},
    {'name': 'products.adjust_cost', 'description': 'Ajustar costo del producto', 'category': 'products', 'scope': 'business', 'visible': True, 'requires_modules': ('products',)},
    {'name': 'production.view', 'description': 'Ver producción', 'category': 'production', 'scope': 'business', 'visible': True, 'requires_production': True},
    {'name': 'production.register', 'description': 'Registrar producción', 'category': 'production', 'scope': 'business', 'visible': True, 'requires_production': True},
    {'name': 'production.cancel', 'description': 'Cancelar producción', 'category': 'production', 'scope': 'business', 'visible': True, 'requires_production': True},
    {'name': 'production.consume_materials', 'description': 'Consumir materiales en producción', 'category': 'production', 'scope': 'business', 'visible': True, 'requires_production': True, 'requires_raw_materials': True},
    {'name': 'raw_inventory.view', 'description': 'Ver bodega y materias primas', 'category': 'raw_inventory', 'scope': 'business', 'visible': True, 'requires_modules': ('raw_inventory',), 'requires_raw_materials': True},
    {'name': 'raw_inventory.adjust', 'description': 'Ajustar bodega y materias primas', 'category': 'raw_inventory', 'scope': 'business', 'visible': True, 'requires_modules': ('raw_inventory',), 'requires_raw_materials': True},
    {'name': 'suppliers.view', 'description': 'Ver proveedores', 'category': 'raw_inventory', 'scope': 'business', 'visible': True, 'requires_modules': ('raw_inventory',), 'requires_raw_materials': True},
    {'name': 'suppliers.create', 'description': 'Crear proveedores', 'category': 'raw_inventory', 'scope': 'business', 'visible': True, 'requires_modules': ('raw_inventory',), 'requires_raw_materials': True},
    {'name': 'suppliers.edit', 'description': 'Editar proveedores', 'category': 'raw_inventory', 'scope': 'business', 'visible': True, 'requires_modules': ('raw_inventory',), 'requires_raw_materials': True},
    {'name': 'suppliers.delete', 'description': 'Eliminar proveedores', 'category': 'raw_inventory', 'scope': 'business', 'visible': True, 'requires_modules': ('raw_inventory',), 'requires_raw_materials': True},
    {'name': 'raw_purchases.view', 'description': 'Ver compras de insumos', 'category': 'raw_inventory', 'scope': 'business', 'visible': True, 'requires_modules': ('raw_inventory',), 'requires_raw_materials': True},
    {'name': 'raw_purchases.create', 'description': 'Crear compras de insumos', 'category': 'raw_inventory', 'scope': 'business', 'visible': True, 'requires_modules': ('raw_inventory',), 'requires_raw_materials': True},
    {'name': 'raw_purchases.edit', 'description': 'Editar compras de insumos', 'category': 'raw_inventory', 'scope': 'business', 'visible': True, 'requires_modules': ('raw_inventory',), 'requires_raw_materials': True},
    {'name': 'raw_purchases.confirm', 'description': 'Confirmar compras de insumos', 'category': 'raw_inventory', 'scope': 'business', 'visible': True, 'requires_modules': ('raw_inventory',), 'requires_raw_materials': True},
    {'name': 'raw_purchases.cancel', 'description': 'Cancelar compras de insumos', 'category': 'raw_inventory', 'scope': 'business', 'visible': True, 'requires_modules': ('raw_inventory',), 'requires_raw_materials': True},
    {'name': 'recipes.view', 'description': 'Ver recetas', 'category': 'raw_inventory', 'scope': 'business', 'visible': True, 'requires_modules': ('raw_inventory',), 'requires_raw_materials': True},
    {'name': 'recipes.create', 'description': 'Crear recetas', 'category': 'raw_inventory', 'scope': 'business', 'visible': True, 'requires_modules': ('raw_inventory',), 'requires_raw_materials': True},
    {'name': 'recipes.edit', 'description': 'Editar recetas', 'category': 'raw_inventory', 'scope': 'business', 'visible': True, 'requires_modules': ('raw_inventory',), 'requires_raw_materials': True},
    {'name': 'recipes.delete', 'description': 'Eliminar recetas', 'category': 'raw_inventory', 'scope': 'business', 'visible': True, 'requires_modules': ('raw_inventory',), 'requires_raw_materials': True},
    {'name': 'supplier_payables.view', 'description': 'Ver cuentas por pagar a proveedores', 'category': 'raw_inventory', 'scope': 'business', 'visible': True, 'requires_modules': ('raw_inventory',), 'requires_raw_materials': True},
    {'name': 'supplier_payables.pay', 'description': 'Pagar cuentas por pagar a proveedores', 'category': 'raw_inventory', 'scope': 'business', 'visible': True, 'requires_modules': ('raw_inventory',), 'requires_raw_materials': True},
    {'name': 'treasury.view', 'description': 'Ver caja y bancos', 'category': 'finance', 'scope': 'business', 'visible': True},
    {'name': 'treasury.manage_accounts', 'description': 'Gestionar cuentas de caja y bancos', 'category': 'finance', 'scope': 'business', 'visible': True},
    {'name': 'treasury.create_movement', 'description': 'Crear movimientos de caja y bancos', 'category': 'finance', 'scope': 'business', 'visible': True},
    {'name': 'treasury.adjust', 'description': 'Ajustar saldos o movimientos de caja y bancos', 'category': 'finance', 'scope': 'business', 'visible': True},
    {'name': 'expenses.view', 'description': 'Ver gastos', 'category': 'finance', 'scope': 'business', 'visible': True},
    {'name': 'expenses.create', 'description': 'Crear gastos', 'category': 'finance', 'scope': 'business', 'visible': True},
    {'name': 'expenses.edit', 'description': 'Editar gastos', 'category': 'finance', 'scope': 'business', 'visible': True},
    {'name': 'expenses.delete', 'description': 'Eliminar gastos', 'category': 'finance', 'scope': 'business', 'visible': True},
    {'name': 'debts.view', 'description': 'Ver deudas y obligaciones financieras', 'category': 'finance', 'scope': 'business', 'visible': True},
    {'name': 'debts.manage', 'description': 'Gestionar deudas y obligaciones financieras', 'category': 'finance', 'scope': 'business', 'visible': True},
    {'name': 'reports.view', 'description': 'Ver reportes operativos', 'category': 'reports', 'scope': 'business', 'visible': True, 'requires_modules': ('reports',)},
    {'name': 'reports.export', 'description': 'Exportar reportes', 'category': 'reports', 'scope': 'business', 'visible': True, 'requires_modules': ('reports',)},
    {'name': 'analytics.view', 'description': 'Ver análisis y paneles avanzados', 'category': 'reports', 'scope': 'business', 'visible': True, 'requires_modules': ('reports',)},
    {'name': 'settings.view', 'description': 'Ver configuración del negocio', 'category': 'settings', 'scope': 'business', 'visible': True},
    {'name': 'settings.edit', 'description': 'Editar configuración del negocio', 'category': 'settings', 'scope': 'business', 'visible': True},
    {'name': 'team.view', 'description': 'Ver equipo y roles', 'category': 'team', 'scope': 'business', 'visible': True, 'min_plan': 'business'},
    {'name': 'team.invite', 'description': 'Invitar miembros al equipo', 'category': 'team', 'scope': 'business', 'visible': True, 'min_plan': 'business'},
    {'name': 'team.edit_roles', 'description': 'Editar roles del equipo', 'category': 'team', 'scope': 'business', 'visible': True, 'min_plan': 'business'},
    {'name': 'team.remove', 'description': 'Retirar miembros del equipo', 'category': 'team', 'scope': 'business', 'visible': True, 'min_plan': 'business'},
    {'name': 'team.manage_team', 'description': 'Administrar integralmente el equipo', 'category': 'team', 'scope': 'business', 'visible': True, 'min_plan': 'business'},
    {'name': 'billing.manage', 'description': 'Gestionar facturación y suscripción', 'category': 'settings', 'scope': 'business', 'visible': True, 'min_plan': 'business'},
    {'name': 'customers.read', 'description': 'Ver clientes', 'category': 'commercial', 'scope': 'business', 'visible': False},
    {'name': 'customers.create', 'description': 'Crear clientes', 'category': 'commercial', 'scope': 'business', 'visible': False},
    {'name': 'customers.update', 'description': 'Editar clientes', 'category': 'commercial', 'scope': 'business', 'visible': False},
    {'name': 'customers.delete', 'description': 'Eliminar clientes', 'category': 'commercial', 'scope': 'business', 'visible': False},
    {'name': 'clients.read', 'description': 'Ver clientes', 'category': 'commercial', 'scope': 'business', 'visible': False},
    {'name': 'clients.create', 'description': 'Crear clientes', 'category': 'commercial', 'scope': 'business', 'visible': False},
    {'name': 'clients.update', 'description': 'Editar clientes', 'category': 'commercial', 'scope': 'business', 'visible': False},
    {'name': 'clients.delete', 'description': 'Eliminar clientes', 'category': 'commercial', 'scope': 'business', 'visible': False},
    {'name': 'sales.read', 'description': 'Ver ventas', 'category': 'commercial', 'scope': 'business', 'visible': False},
    {'name': 'sales.create', 'description': 'Crear ventas', 'category': 'commercial', 'scope': 'business', 'visible': False},
    {'name': 'sales.update', 'description': 'Editar ventas', 'category': 'commercial', 'scope': 'business', 'visible': False},
    {'name': 'sales.delete', 'description': 'Eliminar ventas', 'category': 'commercial', 'scope': 'business', 'visible': False},
    {'name': 'quotes.read', 'description': 'Ver cotizaciones', 'category': 'commercial', 'scope': 'business', 'visible': False},
    {'name': 'quotes.create', 'description': 'Crear cotizaciones', 'category': 'commercial', 'scope': 'business', 'visible': False},
    {'name': 'quotes.update', 'description': 'Editar cotizaciones', 'category': 'commercial', 'scope': 'business', 'visible': False},
    {'name': 'quotes.delete', 'description': 'Eliminar cotizaciones', 'category': 'commercial', 'scope': 'business', 'visible': False},
    {'name': 'quotes.convert', 'description': 'Convertir cotizaciones', 'category': 'commercial', 'scope': 'business', 'visible': False},
    {'name': 'payments.read', 'description': 'Ver cobros', 'category': 'receivables', 'scope': 'business', 'visible': False},
    {'name': 'payments.create', 'description': 'Registrar cobros', 'category': 'receivables', 'scope': 'business', 'visible': False},
    {'name': 'payments.update', 'description': 'Editar cobros', 'category': 'receivables', 'scope': 'business', 'visible': False},
    {'name': 'payments.delete', 'description': 'Eliminar cobros', 'category': 'receivables', 'scope': 'business', 'visible': False},
    {'name': 'products.read', 'description': 'Ver productos', 'category': 'products', 'scope': 'business', 'visible': False},
    {'name': 'products.create', 'description': 'Crear productos', 'category': 'products', 'scope': 'business', 'visible': False},
    {'name': 'products.update', 'description': 'Editar productos', 'category': 'products', 'scope': 'business', 'visible': False},
    {'name': 'products.delete', 'description': 'Eliminar productos', 'category': 'products', 'scope': 'business', 'visible': False},
    {'name': 'raw_inventory.read', 'description': 'Ver bodega', 'category': 'raw_inventory', 'scope': 'business', 'visible': False},
    {'name': 'raw_inventory.create', 'description': 'Crear materias primas', 'category': 'raw_inventory', 'scope': 'business', 'visible': False},
    {'name': 'raw_inventory.update', 'description': 'Editar materias primas', 'category': 'raw_inventory', 'scope': 'business', 'visible': False},
    {'name': 'raw_inventory.delete', 'description': 'Eliminar materias primas', 'category': 'raw_inventory', 'scope': 'business', 'visible': False},
    {'name': 'raw_inventory.movements.create', 'description': 'Registrar movimientos de bodega', 'category': 'raw_inventory', 'scope': 'business', 'visible': False},
    {'name': 'suppliers.read', 'description': 'Ver proveedores', 'category': 'raw_inventory', 'scope': 'business', 'visible': False},
    {'name': 'suppliers.create', 'description': 'Crear proveedores', 'category': 'raw_inventory', 'scope': 'business', 'visible': False},
    {'name': 'suppliers.update', 'description': 'Editar proveedores', 'category': 'raw_inventory', 'scope': 'business', 'visible': False},
    {'name': 'suppliers.delete', 'description': 'Eliminar proveedores', 'category': 'raw_inventory', 'scope': 'business', 'visible': False},
    {'name': 'raw_purchases.read', 'description': 'Ver compras de insumos', 'category': 'raw_inventory', 'scope': 'business', 'visible': False},
    {'name': 'raw_purchases.create', 'description': 'Crear compras de insumos', 'category': 'raw_inventory', 'scope': 'business', 'visible': False},
    {'name': 'raw_purchases.update', 'description': 'Editar compras de insumos', 'category': 'raw_inventory', 'scope': 'business', 'visible': False},
    {'name': 'raw_purchases.confirm', 'description': 'Confirmar compras de insumos', 'category': 'raw_inventory', 'scope': 'business', 'visible': False},
    {'name': 'recipes.read', 'description': 'Ver recetas', 'category': 'raw_inventory', 'scope': 'business', 'visible': False},
    {'name': 'recipes.create', 'description': 'Crear recetas', 'category': 'raw_inventory', 'scope': 'business', 'visible': False},
    {'name': 'recipes.update', 'description': 'Editar recetas', 'category': 'raw_inventory', 'scope': 'business', 'visible': False},
    {'name': 'recipes.delete', 'description': 'Eliminar recetas', 'category': 'raw_inventory', 'scope': 'business', 'visible': False},
    {'name': 'recipes.consume', 'description': 'Consumir recetas', 'category': 'raw_inventory', 'scope': 'business', 'visible': False},
    {'name': 'supplier_payables.read', 'description': 'Ver cuentas por pagar', 'category': 'raw_inventory', 'scope': 'business', 'visible': False},
    {'name': 'supplier_payables.pay', 'description': 'Pagar cuentas por pagar', 'category': 'raw_inventory', 'scope': 'business', 'visible': False},
    {'name': 'treasury.read', 'description': 'Ver caja y bancos', 'category': 'finance', 'scope': 'business', 'visible': False},
    {'name': 'treasury.create', 'description': 'Crear cuentas de caja y bancos', 'category': 'finance', 'scope': 'business', 'visible': False},
    {'name': 'treasury.update', 'description': 'Editar cuentas de caja y bancos', 'category': 'finance', 'scope': 'business', 'visible': False},
    {'name': 'treasury.transfer', 'description': 'Registrar movimientos de caja y bancos', 'category': 'finance', 'scope': 'business', 'visible': False},
    {'name': 'expenses.read', 'description': 'Ver gastos', 'category': 'finance', 'scope': 'business', 'visible': False},
    {'name': 'expenses.create', 'description': 'Crear gastos', 'category': 'finance', 'scope': 'business', 'visible': False},
    {'name': 'expenses.update', 'description': 'Editar gastos', 'category': 'finance', 'scope': 'business', 'visible': False},
    {'name': 'expenses.delete', 'description': 'Eliminar gastos', 'category': 'finance', 'scope': 'business', 'visible': False},
    {'name': 'debts.read', 'description': 'Ver deudas', 'category': 'finance', 'scope': 'business', 'visible': False},
    {'name': 'debts.manage', 'description': 'Gestionar deudas', 'category': 'finance', 'scope': 'business', 'visible': False},
    {'name': 'summary.dashboard', 'description': 'Ver dashboard y reportes', 'category': 'reports', 'scope': 'business', 'visible': False},
    {'name': 'summary.financial', 'description': 'Ver resumen financiero', 'category': 'reports', 'scope': 'business', 'visible': False},
    {'name': 'export.pdf', 'description': 'Exportar PDF', 'category': 'reports', 'scope': 'business', 'visible': False},
    {'name': 'export.excel', 'description': 'Exportar Excel', 'category': 'reports', 'scope': 'business', 'visible': False},
    {'name': 'settings.business', 'description': 'Editar negocio', 'category': 'settings', 'scope': 'business', 'visible': False},
    {'name': 'business.update', 'description': 'Editar negocio', 'category': 'settings', 'scope': 'business', 'visible': False},
    {'name': 'team.read', 'description': 'Ver equipo', 'category': 'team', 'scope': 'business', 'visible': False},
    {'name': 'team.manage', 'description': 'Gestionar equipo', 'category': 'team', 'scope': 'business', 'visible': False},
    {'name': 'reminders.manage', 'description': 'Gestionar recordatorios', 'category': 'reports', 'scope': 'business', 'visible': False},
    {'name': 'sales.goals.view_all', 'description': 'Ver todas las metas', 'category': 'reports', 'scope': 'business', 'visible': False},
    {'name': 'sales.goals.manage', 'description': 'Gestionar metas de ventas', 'category': 'reports', 'scope': 'business', 'visible': False},
    {'name': 'analytics.view_team', 'description': 'Ver analítica de equipo', 'category': 'reports', 'scope': 'business', 'visible': False},
]

CANONICAL_PERMISSION_DEFINITIONS = [item for item in PERMISSION_DEFINITIONS if item.get('visible', True)]
PERMISSION_BY_NAME = {item['name']: item for item in PERMISSION_DEFINITIONS}
CANONICAL_PERMISSION_BY_NAME = {item['name']: item for item in CANONICAL_PERMISSION_DEFINITIONS}
CANONICAL_PERMISSION_NAMES = tuple(item['name'] for item in CANONICAL_PERMISSION_DEFINITIONS)

CANONICAL_ALIASES: dict[str, tuple[str, ...]] = {
    'customers.view': ('customers.read', 'clients.read'),
    'customers.create': ('customers.create', 'clients.create'),
    'customers.edit': ('customers.update', 'clients.update'),
    'customers.delete': ('customers.delete', 'clients.delete'),
    'sales.view': ('sales.read',),
    'sales.create': ('sales.create',),
    'sales.edit': ('sales.update',),
    'sales.cancel': ('sales.delete',),
    'quotes.view': ('quotes.read',),
    'quotes.create': ('quotes.create',),
    'quotes.edit': ('quotes.update',),
    'quotes.convert_to_sale': ('quotes.convert',),
    'invoices.view': (),
    'invoices.create': (),
    'invoices.edit': (),
    'receivables.view': ('payments.read',),
    'receivables.collect': ('payments.create',),
    'receivables.adjust_terms': ('payments.update',),
    'products.view': ('products.read',),
    'products.create': ('products.create',),
    'products.edit': ('products.update',),
    'products.delete': ('products.delete',),
    'raw_inventory.view': ('raw_inventory.read',),
    'raw_inventory.adjust': ('raw_inventory.update', 'raw_inventory.create', 'raw_inventory.delete', 'raw_inventory.movements.create'),
    'suppliers.view': ('suppliers.read',),
    'suppliers.create': ('suppliers.create',),
    'suppliers.edit': ('suppliers.update',),
    'suppliers.delete': ('suppliers.delete',),
    'raw_purchases.view': ('raw_purchases.read',),
    'raw_purchases.create': ('raw_purchases.create',),
    'raw_purchases.edit': ('raw_purchases.update',),
    'raw_purchases.confirm': ('raw_purchases.confirm',),
    'raw_purchases.cancel': ('raw_purchases.update',),
    'recipes.view': ('recipes.read',),
    'recipes.create': ('recipes.create',),
    'recipes.edit': ('recipes.update',),
    'recipes.delete': ('recipes.delete',),
    'production.consume_materials': ('recipes.consume',),
    'supplier_payables.view': ('supplier_payables.read',),
    'supplier_payables.pay': ('supplier_payables.pay',),
    'treasury.view': ('treasury.read',),
    'treasury.manage_accounts': ('treasury.create', 'treasury.update'),
    'treasury.create_movement': ('treasury.transfer',),
    'treasury.adjust': ('treasury.update',),
    'expenses.view': ('expenses.read',),
    'expenses.create': ('expenses.create',),
    'expenses.edit': ('expenses.update',),
    'expenses.delete': ('expenses.delete',),
    'debts.view': ('debts.read',),
    'debts.manage': ('debts.manage',),
    'reports.view': ('summary.dashboard',),
    'reports.export': ('export.pdf', 'export.excel'),
    'analytics.view': ('summary.financial', 'summary.dashboard'),
    'settings.view': ('settings.business',),
    'settings.edit': ('settings.business', 'business.update'),
    'team.view': ('team.read',),
    'team.invite': (),
    'team.edit_roles': (),
    'team.remove': (),
    'team.manage_team': ('team.manage',),
}

LEGACY_TO_CANONICAL: dict[str, tuple[str, ...]] = {
    'customers.read': ('customers.view',),
    'customers.create': ('customers.create',),
    'customers.update': ('customers.edit',),
    'customers.delete': ('customers.delete',),
    'clients.read': ('customers.view',),
    'clients.create': ('customers.create',),
    'clients.update': ('customers.edit',),
    'clients.delete': ('customers.delete',),
    'sales.read': ('sales.view', 'invoices.view'),
    'sales.create': ('sales.create', 'invoices.create'),
    'sales.update': ('sales.edit', 'invoices.edit'),
    'sales.delete': ('sales.cancel',),
    'quotes.read': ('quotes.view',),
    'quotes.create': ('quotes.create',),
    'quotes.update': ('quotes.edit',),
    'quotes.delete': ('quotes.edit',),
    'quotes.convert': ('quotes.convert_to_sale',),
    'payments.read': ('receivables.view',),
    'payments.create': ('receivables.collect',),
    'payments.update': ('receivables.adjust_terms',),
    'payments.delete': ('receivables.collect',),
    'products.read': ('products.view',),
    'products.create': ('products.create',),
    'products.update': ('products.edit',),
    'products.delete': ('products.delete',),
    'raw_inventory.read': ('raw_inventory.view',),
    'raw_inventory.create': ('raw_inventory.adjust',),
    'raw_inventory.update': ('raw_inventory.adjust',),
    'raw_inventory.delete': ('raw_inventory.adjust',),
    'raw_inventory.movements.create': ('raw_inventory.adjust',),
    'suppliers.read': ('suppliers.view',),
    'suppliers.create': ('suppliers.create',),
    'suppliers.update': ('suppliers.edit',),
    'suppliers.delete': ('suppliers.delete',),
    'raw_purchases.read': ('raw_purchases.view',),
    'raw_purchases.create': ('raw_purchases.create',),
    'raw_purchases.update': ('raw_purchases.edit', 'raw_purchases.cancel'),
    'raw_purchases.confirm': ('raw_purchases.confirm',),
    'recipes.read': ('recipes.view',),
    'recipes.create': ('recipes.create',),
    'recipes.update': ('recipes.edit',),
    'recipes.delete': ('recipes.delete',),
    'recipes.consume': ('production.consume_materials',),
    'supplier_payables.read': ('supplier_payables.view',),
    'supplier_payables.pay': ('supplier_payables.pay',),
    'treasury.read': ('treasury.view',),
    'treasury.create': ('treasury.manage_accounts',),
    'treasury.update': ('treasury.manage_accounts', 'treasury.adjust'),
    'treasury.transfer': ('treasury.create_movement',),
    'expenses.read': ('expenses.view',),
    'expenses.create': ('expenses.create',),
    'expenses.update': ('expenses.edit',),
    'expenses.delete': ('expenses.delete',),
    'debts.read': ('debts.view',),
    'debts.manage': ('debts.manage',),
    'summary.dashboard': ('reports.view', 'analytics.view'),
    'summary.financial': ('analytics.view',),
    'export.pdf': ('reports.export',),
    'export.excel': ('reports.export',),
    'settings.business': ('settings.view', 'settings.edit'),
    'business.update': ('settings.edit',),
    'team.read': ('team.view',),
    'team.manage': ('team.invite', 'team.edit_roles', 'team.remove', 'team.manage_team'),
    'reminders.manage': ('analytics.view',),
    'sales.goals.manage': ('reports.view', 'analytics.view'),
    'sales.goals.view_all': ('reports.view', 'analytics.view'),
    'analytics.view_team': ('analytics.view',),
}

WILDCARD_TO_CANONICAL_PREFIXES: dict[str, tuple[str, ...]] = {
    'customers': ('customers',),
    'clients': ('customers',),
    'sales': ('sales',),
    'invoices': ('invoices',),
    'quotes': ('quotes',),
    'payments': ('receivables',),
    'products': ('products',),
    'raw_inventory': ('raw_inventory', 'suppliers', 'raw_purchases', 'recipes', 'supplier_payables', 'production'),
    'suppliers': ('suppliers',),
    'raw_purchases': ('raw_purchases',),
    'recipes': ('recipes', 'production'),
    'supplier_payables': ('supplier_payables',),
    'treasury': ('treasury',),
    'expenses': ('expenses',),
    'debts': ('debts',),
    'summary': ('reports', 'analytics'),
    'reports': ('reports',),
    'export': ('reports',),
    'settings': ('settings',),
    'business': ('settings',),
    'team': ('team',),
}

ROLE_TEMPLATE_DEFINITIONS: list[dict[str, Any]] = [
    {
        'key': 'owner',
        'name': 'PROPIETARIO',
        'description': 'Dueño del negocio con control total operativo y administrativo.',
        'permissions': CANONICAL_PERMISSION_NAMES,
        'min_plan': 'basic',
        'visible_for_models': ('production_fixed_stock', 'production_make_to_order', 'resale_fixed_stock', 'service_no_stock', 'mixed', None),
    },
    {
        'key': 'admin_manager',
        'name': 'ADMINISTRADOR',
        'description': 'Responsable general de la operación y del equipo.',
        'permissions': tuple(name for name in CANONICAL_PERMISSION_NAMES if name != 'billing.manage'),
        'min_plan': 'business',
        'visible_for_models': ('production_fixed_stock', 'production_make_to_order', 'resale_fixed_stock', 'service_no_stock', 'mixed', None),
    },
    {
        'key': 'sales_cashier',
        'name': 'VENTAS / CAJA',
        'description': 'Registra ventas, atiende clientes y cobra.',
        'permissions': (
            'customers.view', 'customers.create', 'customers.edit',
            'sales.view', 'sales.create', 'sales.edit', 'sales.apply_discount',
            'invoices.view', 'invoices.create', 'invoices.edit',
            'receivables.view', 'receivables.collect',
            'products.view',
            'reports.view',
        ),
        'min_plan': 'business',
        'visible_for_models': ('production_fixed_stock', 'resale_fixed_stock', 'service_no_stock', 'mixed', None),
    },
    {
        'key': 'quotes_orders',
        'name': 'COTIZACIONES / PEDIDOS',
        'description': 'Gestiona cotizaciones, pedidos y seguimiento comercial previo a la venta.',
        'permissions': (
            'customers.view', 'customers.create', 'customers.edit',
            'quotes.view', 'quotes.create', 'quotes.edit', 'quotes.approve', 'quotes.convert_to_sale',
            'orders.view', 'orders.manage',
            'products.view',
            'sales.view',
            'reports.view',
        ),
        'min_plan': 'business',
        'visible_for_models': ('production_make_to_order', 'service_no_stock', 'mixed', None),
    },
    {
        'key': 'receivables_collections',
        'name': 'CARTERA / COBROS',
        'description': 'Sigue saldos pendientes, registra cobros y exporta cartera.',
        'permissions': (
            'invoices.view',
            'receivables.view', 'receivables.collect', 'receivables.adjust_terms', 'receivables.export',
            'customers.view',
            'sales.view',
            'reports.view', 'analytics.view',
        ),
        'min_plan': 'business',
        'visible_for_models': ('production_fixed_stock', 'production_make_to_order', 'resale_fixed_stock', 'service_no_stock', 'mixed', None),
    },
    {
        'key': 'finished_goods_inventory',
        'name': 'INVENTARIO PRODUCTO TERMINADO',
        'description': 'Gestiona catálogo, stock y costo de productos terminados.',
        'permissions': (
            'products.view', 'products.create', 'products.edit', 'products.adjust_stock', 'products.adjust_cost',
            'sales.view',
            'reports.view',
        ),
        'min_plan': 'business',
        'visible_for_models': ('production_fixed_stock', 'resale_fixed_stock', 'mixed', None),
    },
    {
        'key': 'raw_warehouse',
        'name': 'BODEGA / MATERIAS PRIMAS',
        'description': 'Controla bodega, recetas, insumos y cuentas por pagar operativas.',
        'permissions': (
            'raw_inventory.view', 'raw_inventory.adjust',
            'suppliers.view', 'suppliers.create', 'suppliers.edit',
            'raw_purchases.view', 'raw_purchases.create', 'raw_purchases.edit', 'raw_purchases.confirm', 'raw_purchases.cancel',
            'recipes.view', 'recipes.create', 'recipes.edit',
            'supplier_payables.view', 'supplier_payables.pay',
            'reports.view',
        ),
        'min_plan': 'business',
        'visible_for_models': ('production_fixed_stock', 'production_make_to_order', 'mixed', None),
    },
    {
        'key': 'production',
        'name': 'PRODUCCIÓN',
        'description': 'Consulta y registra producción con control de materiales.',
        'permissions': (
            'production.view', 'production.register', 'production.cancel', 'production.consume_materials',
            'recipes.view',
            'raw_inventory.view',
            'products.view',
            'orders.view',
            'quotes.view',
            'reports.view',
        ),
        'min_plan': 'business',
        'visible_for_models': ('production_fixed_stock', 'production_make_to_order', 'mixed', None),
    },
    {
        'key': 'purchases',
        'name': 'COMPRAS',
        'description': 'Gestiona compras, proveedores y obligaciones operativas.',
        'permissions': (
            'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.delete',
            'raw_purchases.view', 'raw_purchases.create', 'raw_purchases.edit', 'raw_purchases.confirm', 'raw_purchases.cancel',
            'supplier_payables.view', 'supplier_payables.pay',
            'raw_inventory.view',
            'expenses.view', 'expenses.create',
            'reports.view',
        ),
        'min_plan': 'business',
        'visible_for_models': ('resale_fixed_stock', 'mixed', None),
    },
    {
        'key': 'analyst_read_only',
        'name': 'ANALISTA / SOLO LECTURA',
        'description': 'Consulta información y exporta reportes sin operar movimientos.',
        'permissions': (
            'customers.view', 'sales.view', 'quotes.view', 'invoices.view', 'orders.view', 'receivables.view',
            'products.view', 'production.view', 'raw_inventory.view', 'suppliers.view', 'raw_purchases.view', 'recipes.view', 'supplier_payables.view',
            'treasury.view', 'expenses.view', 'debts.view',
            'reports.view', 'reports.export', 'analytics.view', 'settings.view', 'team.view',
        ),
        'min_plan': 'business',
        'visible_for_models': ('production_fixed_stock', 'production_make_to_order', 'resale_fixed_stock', 'service_no_stock', 'mixed', None),
    },
]

ROLE_TEMPLATE_BY_NAME = {item['name'].upper(): item for item in ROLE_TEMPLATE_DEFINITIONS}
ROLE_TEMPLATE_BY_KEY = {item['key']: item for item in ROLE_TEMPLATE_DEFINITIONS}


def normalize_plan(plan: str | None) -> str:
    if plan == 'business':
        return 'business'
    if plan == 'pro':
        return 'pro'
    return 'basic'


def is_plan_at_least(plan: str | None, minimum_plan: str | None) -> bool:
    if not minimum_plan:
        return True
    return PLAN_ORDER.index(normalize_plan(plan)) >= PLAN_ORDER.index(normalize_plan(minimum_plan))


def list_business_permission_definitions(include_compatibility: bool = False) -> list[dict[str, Any]]:
    source = PERMISSION_DEFINITIONS if include_compatibility else CANONICAL_PERMISSION_DEFINITIONS
    return [dict(item) for item in source]


def list_business_role_templates() -> list[dict[str, Any]]:
    return [dict(item, permissions=list(item.get('permissions') or ())) for item in ROLE_TEMPLATE_DEFINITIONS]


def extract_operational_profile(settings_or_business: Any) -> dict[str, Any]:
    settings = settings_or_business.settings if hasattr(settings_or_business, 'settings') else settings_or_business
    if not isinstance(settings, dict):
        settings = {}
    profile = settings.get('operational_profile') or {}
    if not isinstance(profile, dict):
        profile = {}
    return {
        'operational_model': profile.get('operational_model'),
        'inventory_model': profile.get('inventory_model'),
        'fulfillment_mode': profile.get('fulfillment_mode'),
        'production_mode': profile.get('production_mode'),
        'recipe_mode': profile.get('recipe_mode'),
        'production_control_mode': profile.get('production_control_mode'),
        'manages_raw_materials': bool(profile.get('manages_raw_materials')),
        'tracks_finished_goods_stock': bool(profile.get('tracks_finished_goods_stock')),
        'uses_raw_inventory': bool(profile.get('uses_raw_inventory')),
        'uses_recipes': bool(profile.get('uses_recipes')),
        'controls_production': bool(profile.get('controls_production')),
        'supports_quotes': bool(profile.get('supports_quotes')),
        'supports_make_to_order': bool(profile.get('supports_make_to_order')),
    }


def extract_commercial_sections(settings_or_business: Any) -> dict[str, bool]:
    settings = settings_or_business.settings if hasattr(settings_or_business, 'settings') else settings_or_business
    if not isinstance(settings, dict):
        settings = {}
    personalization = settings.get('personalization') or {}
    if not isinstance(personalization, dict):
        personalization = {}
    sections = personalization.get('commercial_sections') or {}
    if not isinstance(sections, dict):
        sections = {}
    return {
        'orders': bool(sections.get('orders')),
        'invoices': bool(sections.get('invoices')),
        'sales_goals': bool(sections.get('sales_goals')),
    }


def active_module_keys_from_payload(modules: Any) -> set[str]:
    active: set[str] = set()
    if not isinstance(modules, (list, tuple)):
        return active
    for item in modules:
        if isinstance(item, dict) and item.get('enabled') and item.get('module_key'):
            active.add(str(item['module_key']))
    return active


def _canonical_permissions_for_wildcard(prefix: str) -> set[str]:
    targets = WILDCARD_TO_CANONICAL_PREFIXES.get(prefix, (prefix,))
    collected: set[str] = set()
    for target_prefix in targets:
        for name in CANONICAL_PERMISSION_NAMES:
            if name.startswith(f'{target_prefix}.'):
                collected.add(name)
    return collected


def normalize_permission_names(permission_names: Any, keep_unknown: bool = False) -> list[str]:
    collected: set[str] = set()
    for raw_name in permission_names or []:
        if not raw_name:
            continue
        name = str(raw_name).strip()
        if not name:
            continue
        if name == '*':
            collected.add('*')
            continue
        if name.endswith('.*'):
            prefix = name[:-2]
            expanded = _canonical_permissions_for_wildcard(prefix)
            if expanded:
                collected.update(expanded)
                continue
        if name in CANONICAL_PERMISSION_BY_NAME:
            collected.add(name)
            continue
        mapped = LEGACY_TO_CANONICAL.get(name)
        if mapped:
            collected.update(mapped)
            continue
        if keep_unknown:
            collected.add(name)
    return sorted(collected)


def expand_permission_aliases(permission_names: Any, include_compatibility: bool = True) -> list[str]:
    if permission_names and '*' in permission_names:
        return ['*']
    canonical = normalize_permission_names(permission_names, keep_unknown=True)
    expanded = set(canonical)
    if not include_compatibility:
        return sorted(expanded)
    for name in canonical:
        expanded.update(CANONICAL_ALIASES.get(name, ()))
    return sorted(expanded)


def permission_is_applicable(
    permission_name: str,
    *,
    plan: str | None,
    operational_profile: dict[str, Any] | None,
    active_modules: set[str] | None,
    commercial_sections: dict[str, bool] | None,
) -> bool:
    if permission_name == '*':
        return True
    definition = CANONICAL_PERMISSION_BY_NAME.get(permission_name)
    if not definition:
        return True
    if not is_plan_at_least(plan, definition.get('min_plan')):
        return False
    modules = active_modules or set()
    required_modules = tuple(definition.get('requires_modules') or ())
    for module_key in required_modules:
        if module_key not in modules:
            return False
        if not is_plan_at_least(plan, MODULE_MIN_PLAN.get(module_key)):
            return False
    profile = operational_profile or {}
    sections = commercial_sections or {}
    if definition.get('requires_quotes'):
        if 'quotes' not in modules:
            return False
        if not (profile.get('supports_quotes') or profile.get('supports_make_to_order') or profile.get('operational_model') in {'service_no_stock', 'production_make_to_order', 'mixed'}):
            return False
    if definition.get('requires_finished_goods') and not profile.get('tracks_finished_goods_stock'):
        return False
    if definition.get('requires_raw_materials') and not (profile.get('manages_raw_materials') or profile.get('uses_raw_inventory') or profile.get('uses_recipes')):
        return False
    if definition.get('requires_production') and not (profile.get('controls_production') or profile.get('production_mode') in {'to_stock', 'to_order', 'mixed'} or profile.get('operational_model') in {'production_fixed_stock', 'production_make_to_order', 'mixed'}):
        return False
    required_sections = tuple(definition.get('requires_commercial_sections') or ())
    for section_key in required_sections:
        if not sections.get(section_key):
            return False
    return True


def resolve_effective_permissions(
    plan: str | None,
    operational_profile: dict[str, Any] | None,
    active_modules: set[str] | None,
    role_name: str | None = None,
    base_permissions: Any = None,
    overrides: Any = None,
    commercial_sections: dict[str, bool] | None = None,
    is_owner: bool = False,
    is_admin: bool = False,
) -> dict[str, Any]:
    if is_admin or is_owner:
        return {
            'base_permissions': ['*'],
            'effective_permissions': ['*'],
            'canonical_permissions': ['*'],
        }
    template = ROLE_TEMPLATE_BY_NAME.get((role_name or '').upper())
    source_permissions = list(base_permissions or ())
    if not source_permissions and template:
        source_permissions = list(template.get('permissions') or ())
    if overrides:
        source_permissions.extend(list(overrides))
    canonical_permissions = normalize_permission_names(source_permissions, keep_unknown=True)
    applicable_permissions = [
        name
        for name in canonical_permissions
        if permission_is_applicable(
            name,
            plan=plan,
            operational_profile=operational_profile,
            active_modules=active_modules,
            commercial_sections=commercial_sections,
        )
    ]
    return {
        'base_permissions': sorted(set(source_permissions)),
        'canonical_permissions': sorted(set(applicable_permissions)),
        'effective_permissions': expand_permission_aliases(applicable_permissions, include_compatibility=True),
    }


def role_template_is_applicable(
    template: dict[str, Any],
    *,
    plan: str | None,
    operational_profile: dict[str, Any] | None,
    active_modules: set[str] | None,
    commercial_sections: dict[str, bool] | None = None,
) -> bool:
    if not is_plan_at_least(plan, template.get('min_plan')):
        return False
    profile = operational_profile or {}
    model = profile.get('operational_model')
    visible_models = template.get('visible_for_models') or ()
    if visible_models and model not in visible_models:
        return False
    resolved = resolve_effective_permissions(
        plan=plan,
        operational_profile=operational_profile,
        active_modules=active_modules,
        role_name=template.get('name'),
        base_permissions=template.get('permissions') or (),
        commercial_sections=commercial_sections,
    )
    return bool([name for name in resolved['canonical_permissions'] if name != 'settings.view'])


def list_applicable_role_templates(
    *,
    plan: str | None,
    operational_profile: dict[str, Any] | None,
    active_modules: set[str] | None,
    commercial_sections: dict[str, bool] | None = None,
) -> list[dict[str, Any]]:
    applicable = []
    for template in ROLE_TEMPLATE_DEFINITIONS:
        if not role_template_is_applicable(
            template,
            plan=plan,
            operational_profile=operational_profile,
            active_modules=active_modules,
            commercial_sections=commercial_sections,
        ):
            continue
        applicable.append(dict(template, permissions=list(template.get('permissions') or ())))
    return applicable


def serialize_role_definition(
    role: Any,
    *,
    plan: str | None,
    operational_profile: dict[str, Any] | None,
    active_modules: set[str] | None,
    commercial_sections: dict[str, bool] | None = None,
) -> dict[str, Any]:
    raw_permissions = []
    for role_permission in getattr(role, 'permissions', []) or []:
        permission = getattr(role_permission, 'permission', None)
        if permission and getattr(permission, 'name', None):
            raw_permissions.append(permission.name)
    resolved = resolve_effective_permissions(
        plan=plan,
        operational_profile=operational_profile,
        active_modules=active_modules,
        role_name=getattr(role, 'name', None),
        base_permissions=raw_permissions,
        commercial_sections=commercial_sections,
    )
    template = ROLE_TEMPLATE_BY_NAME.get((getattr(role, 'name', '') or '').upper())
    return {
        'id': role.id,
        'name': role.name,
        'description': role.description,
        'is_system': bool(getattr(role, 'is_system', False)),
        'business_id': getattr(role, 'business_id', None),
        'permissions': resolved['canonical_permissions'],
        'effective_permissions': resolved['effective_permissions'],
        'stored_permissions': sorted(set(raw_permissions)),
        'template_key': template.get('key') if template else None,
        'is_suggested': bool(template and role_template_is_applicable(template, plan=plan, operational_profile=operational_profile, active_modules=active_modules, commercial_sections=commercial_sections)),
    }
