from decimal import Decimal, ROUND_HALF_UP

PLAN_ORDER = ('basic', 'pro', 'business')
PAID_PLAN_ORDER = ('basic', 'pro', 'business')
BILLING_CYCLE_ORDER = ('monthly', 'quarterly', 'annual')
LEGACY_BASIC_ALIASES = {'free', 'basic', None, ''}

BILLING_CYCLES = {
    'monthly': {
        'label': 'Mensual',
        'months': 1,
        'discount': Decimal('0.00'),
        'discount_label': None,
    },
    'quarterly': {
        'label': 'Trimestral',
        'months': 3,
        'discount': Decimal('0.10'),
        'discount_label': '-10%',
    },
    'annual': {
        'label': 'Anual',
        'months': 12,
        'discount': Decimal('0.15'),
        'discount_label': '-15%',
    },
}

PLAN_DEFINITIONS = {
    'basic': {
        'display_name': 'Básica',
        'monthly_price_usd': Decimal('5.99'),
        'tagline': 'Para vender y organizar lo esencial de tu negocio',
        'short_description': 'Operación simple con ventas, clientes, productos, reportes y alertas esenciales.',
        'highlight': 'Operación esencial',
        'cta_label': 'Empezar con Básica',
        'badge': None,
        'recommended_for': [
            'Tienda simple',
            'Negocios que quieren empezar ordenados sin complejidad adicional',
        ],
        'features': [
            'Ventas',
            'Clientes',
            'Productos',
            'Dashboard esencial',
            'Reportes básicos',
            'Exportaciones básicas',
            'Onboarding básico',
            'Alertas básicas',
            'Configuración básica del negocio',
        ],
    },
    'pro': {
        'display_name': 'Pro',
        'monthly_price_usd': Decimal('12.99'),
        'tagline': 'Para controlar costos, cartera, compras y ganancias reales',
        'short_description': 'Control operativo y rentabilidad real para negocios en crecimiento.',
        'highlight': 'Control y rentabilidad',
        'cta_label': 'Elegir Pro',
        'badge': 'Recomendado',
        'recommended_for': [
            'Encargos o servicios',
            'Producción, restaurante o repostería',
            'Mayoristas o distribuidores sin operación fuerte de equipo',
        ],
        'features': [
            'Todo lo de Básica',
            'Cotizaciones',
            'Cuentas por cobrar',
            'Inventario bodega / materias primas',
            'Proveedores',
            'Compras de insumos',
            'Cuentas por pagar a proveedores',
            'Recetas',
            'Calculadora de costos',
            'Rentabilidad',
            'Reportes avanzados',
            'Alertas avanzadas',
            'Personalización ampliada del menú y dashboard',
        ],
    },
    'business': {
        'display_name': 'Business',
        'monthly_price_usd': Decimal('24.99'),
        'tagline': 'Para operar con equipo, permisos, auditoría y control empresarial',
        'short_description': 'La capa empresarial para equipos, trazabilidad y control interno avanzado.',
        'highlight': 'Equipo y auditoría',
        'cta_label': 'Elegir Business',
        'badge': 'Empresarial',
        'recommended_for': [
            'Operaciones con equipo',
            'Negocios que requieren permisos, auditoría y trazabilidad por usuario',
        ],
        'features': [
            'Todo lo de Pro',
            'Empleados / equipo',
            'Sincronización total del equipo',
            'Roles y permisos',
            'Auditoría',
            'Trazabilidad por usuario',
            'Controles internos más avanzados',
            'Inventario más avanzado',
            'Operación multiusuario empresarial',
        ],
    },
}

PLAN_MIN_MODULES = {
    'sales': 'basic',
    'customers': 'basic',
    'products': 'basic',
    'reports': 'basic',
    'accounts_receivable': 'pro',
    'quotes': 'pro',
    'raw_inventory': 'pro',
}

BUSINESS_TYPE_PLAN_RECOMMENDATIONS = {
    'simple_store': 'basic',
    'services': 'pro',
    'production': 'pro',
    'wholesale': 'pro',
}

LEGACY_FREE_LIMITS = {
    'businesses': 1,
    'customers': 5,
    'products': 5,
    'sales': 20,
}


def _round_money(value: Decimal) -> Decimal:
    return value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def normalize_plan(plan: str | None) -> str:
    if plan in LEGACY_BASIC_ALIASES:
        return 'basic'
    if plan == 'business':
        return 'business'
    if plan == 'pro':
        return 'pro'
    return 'basic'


def is_legacy_free_plan(plan: str | None) -> bool:
    return (plan or '').strip().lower() == 'free'


def is_paid_plan(plan: str | None) -> bool:
    return normalize_plan(plan) in {'pro', 'business'}


def get_plan_rank(plan: str | None) -> int:
    normalized = normalize_plan(plan)
    return PLAN_ORDER.index(normalized)


def is_plan_at_least(plan: str | None, minimum_plan: str) -> bool:
    return get_plan_rank(plan) >= get_plan_rank(minimum_plan)


def can_access_module(plan: str | None, module_key: str) -> bool:
    minimum_plan = PLAN_MIN_MODULES.get(module_key, 'basic')
    return is_plan_at_least(plan, minimum_plan)


def get_cycle_price(plan_key: str, cycle: str) -> Decimal:
    base_monthly = PLAN_DEFINITIONS[plan_key]['monthly_price_usd']
    cycle_config = BILLING_CYCLES[cycle]
    months = Decimal(str(cycle_config['months']))
    discount = cycle_config['discount']
    total = base_monthly * months * (Decimal('1.00') - discount)
    return _round_money(total)


def get_cycle_monthly_equivalent(plan_key: str, cycle: str) -> Decimal:
    total = get_cycle_price(plan_key, cycle)
    months = Decimal(str(BILLING_CYCLES[cycle]['months']))
    return _round_money(total / months)


def get_checkout_plan_codes() -> set[str]:
    return {f'{plan}_{cycle}' for plan in PAID_PLAN_ORDER for cycle in BILLING_CYCLE_ORDER}


def parse_plan_code(plan_code: str) -> tuple[str, str] | tuple[None, None]:
    if not plan_code or '_' not in plan_code:
        return None, None
    plan_key, cycle = plan_code.split('_', 1)
    if plan_key not in PAID_PLAN_ORDER or cycle not in BILLING_CYCLE_ORDER:
        return None, None
    return plan_key, cycle


def get_plan_display_name(plan: str | None) -> str:
    return PLAN_DEFINITIONS[normalize_plan(plan)]['display_name']


def get_membership_catalog() -> dict:
    plans = {}
    for plan_key in PLAN_ORDER:
        definition = PLAN_DEFINITIONS[plan_key]
        cycles = {}
        for cycle in BILLING_CYCLE_ORDER:
            total = get_cycle_price(plan_key, cycle)
            equivalent = get_cycle_monthly_equivalent(plan_key, cycle)
            cycle_config = BILLING_CYCLES[cycle]
            monthly_total = definition['monthly_price_usd'] * Decimal(str(cycle_config['months']))
            savings = _round_money(monthly_total - total)
            cycles[cycle] = {
                'cycle': cycle,
                'label': cycle_config['label'],
                'months': cycle_config['months'],
                'discount_percent': int(cycle_config['discount'] * 100),
                'discount_label': cycle_config['discount_label'],
                'total_usd': float(total),
                'monthly_equivalent_usd': float(equivalent),
                'savings_usd': float(savings),
                'checkout_plan_code': f'{plan_key}_{cycle}',
            }
        plans[plan_key] = {
            'key': plan_key,
            'display_name': definition['display_name'],
            'tagline': definition['tagline'],
            'short_description': definition['short_description'],
            'highlight': definition['highlight'],
            'cta_label': definition['cta_label'],
            'badge': definition['badge'],
            'monthly_price_usd': float(_round_money(definition['monthly_price_usd'])),
            'features': definition['features'],
            'recommended_for': definition['recommended_for'],
            'cycles': cycles,
        }

    return {
        'currency': 'USD',
        'display_currency': 'USD',
        'legacy_aliases': {
            'free': 'basic',
        },
        'plan_order': list(PLAN_ORDER),
        'cycle_order': list(BILLING_CYCLE_ORDER),
        'plans': plans,
        'module_minimum_plan': PLAN_MIN_MODULES,
        'business_type_recommended_plan': BUSINESS_TYPE_PLAN_RECOMMENDATIONS,
    }
