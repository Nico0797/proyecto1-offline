"""
Business Presets Engine - Fuente única de verdad para experiencias de negocio
Une business_type, operational_profile, modules y navegación en presets coherentes.
"""
from __future__ import annotations
from typing import Any, Dict, List, Optional, Set
from dataclasses import dataclass, field
from enum import Enum

# Importar del sistema existente
from backend.services.business_operational_profile import (
    DEFAULT_BUSINESS_OPERATIONAL_PROFILE,
    normalize_business_operational_profile,
)

# Tipos base que ya existen en el proyecto
class BusinessTypeKey(Enum):
    SIMPLE_STORE = "simple_store"
    SERVICES = "services"
    PRODUCTION = "production"
    WHOLESALE = "wholesale"

class BusinessOperationalModel(Enum):
    PRODUCTION_FIXED_STOCK = "production_fixed_stock"
    PRODUCTION_MAKE_TO_ORDER = "production_make_to_order"
    RESALE_FIXED_STOCK = "resale_fixed_stock"
    SERVICE_NO_STOCK = "service_no_stock"
    MIXED = "mixed"

class BusinessFulfillmentMode(Enum):
    STOCK = "stock"
    MAKE_TO_ORDER = "make_to_order"
    HYBRID = "hybrid"
    SERVICE = "service"

# Módulos técnicos disponibles (del BUSINESS_MODULE_DEFAULTS existente)
AVAILABLE_MODULES = {
    "sales": True,
    "customers": True,
    "products": True,
    "accounts_receivable": True,
    "reports": True,
    "quotes": False,
    "raw_inventory": False,
}

# Secciones comerciales (del COMMERCIAL_SECTION_DEFAULTS existente)
COMMERCIAL_SECTIONS = {
    "invoices": True,
    "orders": True,
    "sales_goals": True,
}

@dataclass
class BusinessPresetDefinition:
    """Definición completa de un preset de negocio"""
    key: BusinessTypeKey
    name: str
    short_description: str
    long_description: str
    
    # Perfil operacional (se mapea a business.settings.operational_profile)
    operational_model: BusinessOperationalModel
    inventory_model: Optional[str] = None
    fulfillment_mode: Optional[BusinessFulfillmentMode] = None
    production_mode: Optional[str] = None
    recipe_mode: Optional[str] = None
    production_control_mode: Optional[str] = None
    
    # Flags derivados del perfil operacional
    manages_raw_materials: bool = False
    tracks_finished_goods_stock: bool = False
    uses_raw_inventory: bool = False
    uses_recipes: bool = False
    controls_production: bool = False
    supports_quotes: bool = False
    supports_make_to_order: bool = False
    consumes_raw_materials_on_production: bool = False
    consumes_raw_materials_on_sale: bool = False
    consumes_raw_materials_on_quote_conversion: bool = False
    
    # Módulos técnicos recomendados
    recommended_modules: List[str] = field(default_factory=list)
    
    # Secciones comerciales visibles
    commercial_sections: Dict[str, bool] = field(default_factory=dict)
    
    # Navegación prioritaria
    recommended_menu_paths: List[str] = field(default_factory=list)
    favorite_paths: List[str] = field(default_factory=list)
    hidden_paths: List[str] = field(default_factory=list)
    prioritized_path: Optional[str] = None
    
    # Configuración de onboarding
    suggested_home_focus: Optional[str] = None
    suggested_dashboard_tab: Optional[str] = None
    simplicity_level: str = "guided"
    recommended_tutorials: List[str] = field(default_factory=list)
    
    # Restricciones y compatibilidades
    incompatible_modules: Set[str] = field(default_factory=set)
    required_features: Set[str] = field(default_factory=set)

# Definiciones de presets reales basadas en la arquitectura existente
BUSINESS_PRESETS: Dict[BusinessTypeKey, BusinessPresetDefinition] = {
    BusinessTypeKey.SIMPLE_STORE: BusinessPresetDefinition(
        key=BusinessTypeKey.SIMPLE_STORE,
        name="Tienda simple",
        short_description="Para negocios que venden rápido y quieren ver solo lo esencial.",
        long_description="Prioriza registrar ventas, llevar gastos del día, controlar clientes frecuentes, manejar productos y consultar reportes sin saturar la navegación.",
        
        # Perfil operacional: reventa simple
        operational_model=BusinessOperationalModel.RESALE_FIXED_STOCK,
        inventory_model="finished_goods",
        fulfillment_mode=BusinessFulfillmentMode.STOCK,
        
        # Flags derivados
        tracks_finished_goods_stock=True,
        manages_raw_materials=False,
        uses_raw_inventory=False,
        uses_recipes=False,
        controls_production=False,
        supports_quotes=False,
        supports_make_to_order=False,
        
        # Módulos técnicos
        recommended_modules=["sales", "customers", "products", "reports"],
        
        # Secciones comerciales
        commercial_sections={"invoices": True, "orders": False, "sales_goals": False},
        
        # Navegación
        recommended_menu_paths=[
            "/dashboard", "/sales", "/expenses", "/products", 
            "/customers", "/alerts", "/reports"
        ],
        favorite_paths=["/sales", "/products"],
        prioritized_path="/sales",
        
        # Onboarding
        suggested_home_focus="sales",
        suggested_dashboard_tab="hoy",
        simplicity_level="simple",
        recommended_tutorials=["first_sale", "basic_expenses"],
        
        # Restricciones
        incompatible_modules={"raw_inventory"},
    ),
    
    BusinessTypeKey.SERVICES: BusinessPresetDefinition(
        key=BusinessTypeKey.SERVICES,
        name="Encargos o servicios",
        short_description="Para negocios que cotizan, convierten propuestas y cobran después.",
        long_description="Da prioridad al flujo comercial desde la cotización hasta el cobro, sin perder de vista los gastos operativos del negocio.",
        
        # Perfil operacional: servicios sin stock
        operational_model=BusinessOperationalModel.SERVICE_NO_STOCK,
        inventory_model="none",
        fulfillment_mode=BusinessFulfillmentMode.SERVICE,
        
        # Flags derivados
        tracks_finished_goods_stock=False,
        manages_raw_materials=False,
        uses_raw_inventory=False,
        uses_recipes=False,
        controls_production=False,
        supports_quotes=True,
        supports_make_to_order=True,
        
        # Módulos técnicos
        recommended_modules=["sales", "customers", "accounts_receivable", "quotes", "reports"],
        
        # Secciones comerciales
        commercial_sections={"invoices": True, "orders": True, "sales_goals": False},
        
        # Navegación
        recommended_menu_paths=[
            "/dashboard", "/quotes", "/sales", "/expenses", "/payments", 
            "/customers", "/alerts", "/reports"
        ],
        favorite_paths=["/quotes", "/payments"],
        prioritized_path="/quotes",
        
        # Onboarding
        suggested_home_focus="collections",
        suggested_dashboard_tab="balance",
        simplicity_level="guided",
        recommended_tutorials=["first_quote", "quote_to_sale", "payment_registration"],
        
        # Restricciones
        incompatible_modules={"raw_inventory"},
        required_features={"quotes"},
    ),
    
    BusinessTypeKey.PRODUCTION: BusinessPresetDefinition(
        key=BusinessTypeKey.PRODUCTION,
        name="Producción, restaurante o repostería",
        short_description="Para negocios que trabajan con insumos, recetas y control de costos.",
        long_description="Activa el flujo de bodega para materias primas, compras, gastos operativos, recetas y calculadora de costos, sin crear módulos nuevos.",
        
        # Perfil operacional: producción con materias primas
        operational_model=BusinessOperationalModel.PRODUCTION_MAKE_TO_ORDER,
        inventory_model="mixed",
        fulfillment_mode=BusinessFulfillmentMode.MAKE_TO_ORDER,
        production_mode="to_order",
        recipe_mode="fixed",
        production_control_mode="enabled",
        
        # Flags derivados
        tracks_finished_goods_stock=True,
        manages_raw_materials=True,
        uses_raw_inventory=True,
        uses_recipes=True,
        controls_production=True,
        supports_quotes=True,
        supports_make_to_order=True,
        consumes_raw_materials_on_production=True,
        consumes_raw_materials_on_quote_conversion=True,
        
        # Módulos técnicos
        recommended_modules=["sales", "products", "raw_inventory", "reports"],
        
        # Secciones comerciales
        commercial_sections={"invoices": False, "orders": True, "sales_goals": False},
        
        # Navegación
        recommended_menu_paths=[
            "/dashboard", "/sales", "/raw-inventory", "/raw-purchases", 
            "/expenses", "/recipes", "/cost-calculator", "/alerts", "/reports"
        ],
        favorite_paths=["/raw-inventory", "/recipes"],
        prioritized_path="/raw-inventory",
        
        # Onboarding
        suggested_home_focus="products",
        suggested_dashboard_tab="analiticas",
        simplicity_level="guided",
        recommended_tutorials=["raw_materials", "recipes", "cost_calculation"],
        
        # Restricciones
        required_features={"raw_inventory"},
    ),
    
    BusinessTypeKey.WHOLESALE: BusinessPresetDefinition(
        key=BusinessTypeKey.WHOLESALE,
        name="Mayorista o distribuidor",
        short_description="Para negocios con catálogo amplio, clientes recurrentes y cartera activa.",
        long_description="Enfoca la navegación en ventas, cartera, gastos recurrentes y reportes, dejando bodega avanzada solo si realmente la necesitas.",
        
        # Perfil operacional: reventa con cartera activa
        operational_model=BusinessOperationalModel.RESALE_FIXED_STOCK,
        inventory_model="finished_goods",
        fulfillment_mode=BusinessFulfillmentMode.STOCK,
        
        # Flags derivados
        tracks_finished_goods_stock=True,
        manages_raw_materials=False,
        uses_raw_inventory=False,
        uses_recipes=False,
        controls_production=False,
        supports_quotes=False,
        supports_make_to_order=False,
        
        # Módulos técnicos
        recommended_modules=["sales", "customers", "products", "accounts_receivable", "reports"],
        
        # Secciones comerciales
        commercial_sections={"invoices": True, "orders": True, "sales_goals": True},
        
        # Navegación
        recommended_menu_paths=[
            "/dashboard", "/sales", "/customers", "/payments", "/expenses", 
            "/products", "/alerts", "/reports"
        ],
        favorite_paths=["/sales", "/payments"],
        prioritized_path="/customers",
        
        # Onboarding
        suggested_home_focus="collections",
        suggested_dashboard_tab="balance",
        simplicity_level="guided",
        recommended_tutorials=["customer_management", "credit_sales", "payment_followup"],
        
        # Restricciones
        incompatible_modules={"raw_inventory"},
    ),
}

def get_business_preset(business_type: str) -> Optional[BusinessPresetDefinition]:
    """Obtener definición de preset por tipo de negocio"""
    try:
        type_key = BusinessTypeKey(business_type)
        return BUSINESS_PRESETS.get(type_key)
    except ValueError:
        return None

def resolve_business_preset_from_settings(settings: Dict[str, Any]) -> BusinessPresetDefinition:
    """
    Resolver el preset aplicable basado en settings existentes.
    Prioridad: business_type explícito > operational_profile > inferencia.
    """
    if not isinstance(settings, dict):
        settings = {}
    
    # 1. Buscar business_type explícito en personalization
    personalization = settings.get("personalization", {})
    explicit_business_type = personalization.get("business_type")
    if explicit_business_type:
        preset = get_business_preset(explicit_business_type)
        if preset:
            return preset
    
    # 2. Inferir desde operational_profile
    operational_profile = settings.get("operational_profile", {})
    operational_model = operational_profile.get("operational_model")
    fulfillment_mode = operational_profile.get("fulfillment_mode")
    
    if operational_model:
        if operational_model == "service_no_stock":
            return BUSINESS_PRESETS[BusinessTypeKey.SERVICES]
        elif operational_model in ["production_fixed_stock", "production_make_to_order"]:
            # Verificar si usa materias primas
            manages_raw_materials = operational_profile.get("manages_raw_materials", False)
            if manages_raw_materials:
                return BUSINESS_PRESETS[BusinessTypeKey.PRODUCTION]
            else:
                return BUSINESS_PRESETS[BusinessTypeKey.SERVICES]  # Producción simple sin raw materials
        elif operational_model == "resale_fixed_stock":
            # Diferenciar simple vs wholesale por módulos activos
            modules = settings.get("modules", {})
            has_accounts_receivable = modules.get("accounts_receivable", False)
            if has_accounts_receivable:
                return BUSINESS_PRESETS[BusinessTypeKey.WHOLESALE]
            else:
                return BUSINESS_PRESETS[BusinessTypeKey.SIMPLE_STORE]
    
    # 3. Inferir desde módulos activos (fallback legacy)
    modules = settings.get("modules", {})
    if modules.get("raw_inventory", False):
        return BUSINESS_PRESETS[BusinessTypeKey.PRODUCTION]
    elif modules.get("quotes", False):
        return BUSINESS_PRESETS[BusinessTypeKey.SERVICES]
    elif modules.get("accounts_receivable", False):
        return BUSINESS_PRESETS[BusinessTypeKey.WHOLESALE]
    
    # 4. Default: simple_store
    return BUSINESS_PRESETS[BusinessTypeKey.SIMPLE_STORE]

def build_operational_profile_from_preset(preset: BusinessPresetDefinition) -> Dict[str, Any]:
    """Construir operational_profile completo desde preset"""
    profile = dict(DEFAULT_BUSINESS_OPERATIONAL_PROFILE)
    
    profile.update({
        "operational_model": preset.operational_model.value,
        "inventory_model": preset.inventory_model,
        "fulfillment_mode": preset.fulfillment_mode.value if preset.fulfillment_mode else None,
        "production_mode": preset.production_mode,
        "recipe_mode": preset.recipe_mode,
        "production_control_mode": preset.production_control_mode,
        "manages_raw_materials": preset.manages_raw_materials,
        "tracks_finished_goods_stock": preset.tracks_finished_goods_stock,
        "uses_raw_inventory": preset.uses_raw_inventory,
        "uses_recipes": preset.uses_recipes,
        "controls_production": preset.controls_production,
        "supports_quotes": preset.supports_quotes,
        "supports_make_to_order": preset.supports_make_to_order,
        "consumes_raw_materials_on_production": preset.consumes_raw_materials_on_production,
        "consumes_raw_materials_on_sale": preset.consumes_raw_materials_on_sale,
        "consumes_raw_materials_on_quote_conversion": preset.consumes_raw_materials_on_quote_conversion,
    })
    
    return normalize_business_operational_profile(profile)

def build_personalization_from_preset(preset: BusinessPresetDefinition) -> Dict[str, Any]:
    """Construir personalization completo desde preset"""
    return {
        "business_type": preset.key.value,
        "visibility_mode": "basic" if preset.simplicity_level == "simple" else "advanced",
        "navigation_defaults": {
            "business_type": preset.key.value,
            "favorite_paths": preset.favorite_paths,
            "hidden_paths": preset.hidden_paths,
            "prioritized_path": preset.prioritized_path,
            "last_applied_at": None,  # Se llenará en runtime
        },
        "commercial_sections": preset.commercial_sections,
        "onboarding": {
            "completed": False,
            "skipped": False,
            "last_updated_at": None,
            "answers": {},  # Se llenará si hay onboarding
            "suggested_business_type": preset.key.value,
            "suggested_modules": preset.recommended_modules,
            "applied_modules_once": False,
        },
    }

def build_initial_setup_from_preset(preset: BusinessPresetDefinition) -> Dict[str, Any]:
    """Construir initial_setup completo desde preset"""
    return {
        "version": 1,
        "onboarding_profile": {
            "business_category": "production" if preset.manages_raw_materials else "services" if preset.operational_model == BusinessOperationalModel.SERVICE_NO_STOCK.value else "products",
            "inventory_mode": "yes" if preset.tracks_finished_goods_stock else "no",
            "sales_flow": "quotes_invoices" if preset.supports_quotes else "immediate",
            "home_focus": preset.suggested_home_focus or "sales",
            "team_mode": "solo",
            "documents_mode": "simple_receipts",
            "operations_mode": "production" if preset.controls_production else "resale",
            "operational_model": preset.operational_model.value,
            "raw_materials_mode": "yes" if preset.manages_raw_materials else "no",
            "recipe_mode": preset.recipe_mode or "none",
            "selling_mode": "by_order" if preset.supports_make_to_order else "stock",
            "production_control": preset.production_control_mode or "no",
            "guidance_mode": "guided" if preset.simplicity_level == "guided" else "express",
        },
        "onboarding_completed": False,
        "onboarding_completed_at": None,
        "initial_modules_applied": preset.recommended_modules,
        "initial_home_focus": preset.suggested_home_focus,
        "initial_dashboard_tab": preset.suggested_dashboard_tab or "hoy",
        "recommended_tutorials": preset.recommended_tutorials,
        "simplicity_level": preset.simplicity_level,
        "highlighted_tools": preset.favorite_paths,
        "hidden_tools": preset.hidden_paths,
    }

def apply_preset_to_business_settings(
    existing_settings: Dict[str, Any], 
    business_type: str,
    apply_modules: bool = True,
    apply_navigation: bool = True,
    apply_onboarding: bool = True
) -> Dict[str, Any]:
    """
    Aplicar un preset a los settings de un negocio.
    Compatible con normalize_business_settings() del main.py
    """
    base_settings = dict(existing_settings) if isinstance(existing_settings, dict) else {}
    
    # Obtener preset
    preset = get_business_preset(business_type)
    if not preset:
        raise ValueError(f"Business type '{business_type}' not found in presets")
    
    # Construir componentes del preset
    operational_profile = build_operational_profile_from_preset(preset)
    personalization = build_personalization_from_preset(preset)
    initial_setup = build_initial_setup_from_preset(preset)
    
    # Aplicar a settings
    base_settings["operational_profile"] = operational_profile
    
    if apply_onboarding:
        base_settings["personalization"] = personalization
        base_settings["initial_setup"] = initial_setup
    
    # Mantener módulos existentes si no se especifica lo contrario
    if apply_modules and "modules" not in base_settings:
        base_settings["modules"] = {
            module_key: module_key in preset.recommended_modules
            for module_key in AVAILABLE_MODULES.keys()
        }
    
    return base_settings

def get_preset_compatibility_check(business_type: str, current_modules: Dict[str, bool]) -> Dict[str, Any]:
    """
    Verificar compatibilidad de un preset con módulos actuales.
    Útil para cambios de preset en negocios existentes.
    """
    preset = get_business_preset(business_type)
    if not preset:
        return {"compatible": False, "errors": [f"Invalid business type: {business_type}"]}
    
    issues = []
    warnings = []
    
    # Verificar módulos incompatibles
    for incompatible_module in preset.incompatible_modules:
        if current_modules.get(incompatible_module, False):
            issues.append(f"Module '{incompatible_module}' is incompatible with {preset.name}")
    
    # Verificar features requeridas
    for required_feature in preset.required_features:
        if not current_modules.get(required_feature, False):
            warnings.append(f"Feature '{required_feature}' is recommended for {preset.name}")
    
    # Verificar cambios de módulos recomendados
    missing_recommended = [
        module for module in preset.recommended_modules
        if not current_modules.get(module, False)
    ]
    extra_modules = [
        module for module, enabled in current_modules.items()
        if enabled and module not in preset.recommended_modules and module not in preset.incompatible_modules
    ]
    
    if missing_recommended:
        warnings.append(f"Recommended modules missing: {', '.join(missing_recommended)}")
    
    if extra_modules:
        warnings.append(f"Extra modules enabled: {', '.join(extra_modules)}")
    
    return {
        "compatible": len(issues) == 0,
        "preset": preset.key.value,
        "preset_name": preset.name,
        "issues": issues,
        "warnings": warnings,
        "recommended_modules": preset.recommended_modules,
        "missing_recommended": missing_recommended,
        "extra_modules": extra_modules,
    }

# Helper functions para integración con código existente
def get_all_presets_for_ui() -> List[Dict[str, Any]]:
    """Obtener todos los presets en formato UI-friendly"""
    return [
        {
            "key": preset.key.value,
            "name": preset.name,
            "short_description": preset.short_description,
            "long_description": preset.long_description,
            "recommended_modules": preset.recommended_modules,
            "recommended_menu_paths": preset.recommended_menu_paths,
            "operational_model": preset.operational_model.value,
            "fulfillment_mode": preset.fulfillment_mode.value if preset.fulfillment_mode else None,
            "manages_raw_materials": preset.manages_raw_materials,
            "tracks_finished_goods_stock": preset.tracks_finished_goods_stock,
        }
        for preset in BUSINESS_PRESETS.values()
    ]

def infer_business_type_from_modules(modules: Dict[str, bool]) -> str:
    """Inferir business_type desde módulos actuales (fallback para negocios legacy)"""
    if modules.get("raw_inventory", False):
        return BusinessTypeKey.PRODUCTION.value
    elif modules.get("quotes", False):
        return BusinessTypeKey.SERVICES.value
    elif modules.get("accounts_receivable", False):
        return BusinessTypeKey.WHOLESALE.value
    else:
        return BusinessTypeKey.SIMPLE_STORE.value
