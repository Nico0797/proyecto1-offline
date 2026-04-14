# Cuaderno - Main Application
# ============================================
"""
Punto de entrada de la aplicaciÃ³n Flask
"""
import os
import sys
import json
import time
import hashlib
from functools import wraps

# Add parent directory to path to ensure 'backend' package is importable
# This fixes the "ModuleNotFoundError" when running python main.py from backend/ dir
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, date, timedelta, timezone
from flask import Flask, request, jsonify, send_from_directory, g, send_file, render_template, url_for, current_app, has_request_context
from flask_cors import CORS
import jwt # PyJWT for manual token verification
from sqlalchemy import func, or_, and_, case, event, cast, String
from sqlalchemy.orm import joinedload
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
from io import BytesIO
from backend.services.response_cache import LocalTTLCache, SharedResponseCache
try:
    from xhtml2pdf import pisa
    HAS_XHTML2PDF = True
except Exception as e:
    print(f"WARNING: Could not import xhtml2pdf: {e}")
    HAS_XHTML2PDF = False

# PIL for receipt generation (optional)
try:
    from PIL import Image, ImageDraw, ImageFont
    HAS_PIL = True
except Exception:
    HAS_PIL = False
    Image = ImageDraw = ImageFont = None

import textwrap
try:
    from backend.config import get_config
    from backend.database import db, init_db
    from backend.auth import token_required, optional_token, AuthManager, create_token, permission_required, has_permission, _ensure_default_role, _log_audit, bump_user_session_version, is_account_code_activation_required, should_expose_verification_code_in_dev, emit_verification_code_debug, authenticate_request_user
    from backend.account_access import (
        CHECKOUT_PLAN_CODES,
        build_plan_catalog,
        ensure_account_access_allowed,
        get_plan_duration_days,
        grant_manual_account_access,
        normalize_access_plan,
        resolve_account_access,
    )
    from backend.demo_preview import build_account_access_payload, ensure_demo_preview_business, get_preview_session_state, should_block_preview_write, start_preview_session, stop_preview_session
    from backend.bootstrap.startup import log_startup_bootstrap_status
    from backend.routes.financial_restore_routes import register_financial_restore_routes
    from backend.routes.raw_inventory_restore_routes import register_raw_inventory_restore_routes
    from backend.routes.commercial_core_restore_routes import register_commercial_core_restore_routes
    from backend.routes.commercial_quotes_restore_routes import register_commercial_quotes_restore_routes
    from backend.routes.commercial_invoices_restore_routes import register_commercial_invoices_restore_routes
    from backend.services.business_operational_profile import normalize_business_operational_profile
    from backend.services.business_presets import (
        apply_preset_to_business_settings,
        resolve_business_preset_from_settings,
        get_business_preset,
        BUSINESS_PRESETS,
        get_all_presets_for_ui
    )
    from backend.services.operational_inventory import InsufficientRawMaterialsError, clear_sale_origin_links, normalize_fulfillment_mode, register_stock_production, resolve_product_fulfillment_mode, reverse_sale_operational_effects
    from backend.services.sale_inventory import apply_sale_inventory_effects
    from backend.models import User, Business, BusinessModule, BUSINESS_MODULE_DEFAULTS, BUSINESS_MODULE_KEYS, Product, Customer, Sale, Expense, Payment, LedgerEntry, LedgerAllocation, Permission, Role, UserRole, RolePermission, AuditLog, SubscriptionPayment, AppSettings, Order, Invoice, InvoicePayment, RecurringExpense, QuickNote, Reminder, SalesGoal, Banner, FAQ, Debt, DebtPayment, ProductBarcode, ProductMovement, RawMaterial, RawMaterialMovement, Recipe, RecipeConsumption, RecipeConsumptionItem, RecipeItem, SupplierPayable, TeamMember, TeamInvitation, TeamFeedback, TreasuryAccount
    from backend.services.rbac import active_module_keys_from_payload, extract_commercial_sections, extract_operational_profile, list_applicable_role_templates, list_business_permission_definitions, normalize_permission_names, resolve_effective_permissions, serialize_role_definition
    from backend.runtime import build_liveness_payload, build_readiness_result
    from backend.services.commercial_financials import allocate_payment_amount, create_sale_financial_entries, delete_sale_financial_effects, list_sale_initial_cash_events, reverse_payment_allocations
    from backend.services.treasury_flow_service import create_expense_record, resolve_treasury_context
except ImportError:
    import sys, importlib.util
    _BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    _BACK = os.path.dirname(os.path.abspath(__file__))
    def _load(mod_name, filename):
        spec = importlib.util.spec_from_file_location(mod_name, os.path.join(_BACK, filename))
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        sys.modules[mod_name] = module
        return module
    cfg_mod = _load("backend.config", "config.py")
    db_mod = _load("backend.database", "database.py")
    mdl_mod = _load("backend.models", "models.py")
    auth_mod = _load("backend.auth", "auth.py")
    account_access_mod = _load("backend.account_access", "account_access.py")
    demo_preview_mod = _load("backend.demo_preview", "demo_preview.py")
    startup_mod = _load("backend.bootstrap.startup", os.path.join("bootstrap", "startup.py"))
    runtime_mod = _load("backend.runtime", "runtime.py")
    financial_routes_mod = _load("backend.routes.financial_restore_routes", os.path.join("routes", "financial_restore_routes.py"))
    raw_inventory_routes_mod = _load("backend.routes.raw_inventory_restore_routes", os.path.join("routes", "raw_inventory_restore_routes.py"))
    commercial_core_routes_mod = _load("backend.routes.commercial_core_restore_routes", os.path.join("routes", "commercial_core_restore_routes.py"))
    commercial_quotes_routes_mod = _load("backend.routes.commercial_quotes_restore_routes", os.path.join("routes", "commercial_quotes_restore_routes.py"))
    commercial_invoices_routes_mod = _load("backend.routes.commercial_invoices_restore_routes", os.path.join("routes", "commercial_invoices_restore_routes.py"))
    operational_profile_mod = _load("backend.services.business_operational_profile", os.path.join("services", "business_operational_profile.py"))
    business_presets_mod = _load("backend.services.business_presets", os.path.join("services", "business_presets.py"))
    rbac_mod = _load("backend.services.rbac", os.path.join("services", "rbac.py"))
    operational_inventory_mod = _load("backend.services.operational_inventory", os.path.join("services", "operational_inventory.py"))
    sale_inventory_mod = _load("backend.services.sale_inventory", os.path.join("services", "sale_inventory.py"))
    commercial_financials_mod = _load("backend.services.commercial_financials", os.path.join("services", "commercial_financials.py"))
    treasury_flow_mod = _load("backend.services.treasury_flow_service", os.path.join("services", "treasury_flow_service.py"))
    get_config = cfg_mod.get_config
    db = db_mod.db
    init_db = db_mod.init_db
    token_required = auth_mod.token_required
    optional_token = auth_mod.optional_token
    AuthManager = auth_mod.AuthManager
    create_token = auth_mod.create_token
    permission_required = auth_mod.permission_required
    has_permission = auth_mod.has_permission
    _ensure_default_role = auth_mod._ensure_default_role
    _log_audit = auth_mod._log_audit
    bump_user_session_version = auth_mod.bump_user_session_version
    is_account_code_activation_required = auth_mod.is_account_code_activation_required
    should_expose_verification_code_in_dev = auth_mod.should_expose_verification_code_in_dev
    emit_verification_code_debug = auth_mod.emit_verification_code_debug
    authenticate_request_user = auth_mod.authenticate_request_user
    build_plan_catalog = account_access_mod.build_plan_catalog
    CHECKOUT_PLAN_CODES = account_access_mod.CHECKOUT_PLAN_CODES
    ensure_account_access_allowed = account_access_mod.ensure_account_access_allowed
    get_plan_duration_days = account_access_mod.get_plan_duration_days
    grant_manual_account_access = account_access_mod.grant_manual_account_access
    normalize_access_plan = account_access_mod.normalize_access_plan
    resolve_account_access = account_access_mod.resolve_account_access
    build_account_access_payload = demo_preview_mod.build_account_access_payload
    ensure_demo_preview_business = demo_preview_mod.ensure_demo_preview_business
    get_preview_session_state = demo_preview_mod.get_preview_session_state
    should_block_preview_write = demo_preview_mod.should_block_preview_write
    start_preview_session = demo_preview_mod.start_preview_session
    stop_preview_session = demo_preview_mod.stop_preview_session
    normalize_business_operational_profile = operational_profile_mod.normalize_business_operational_profile
    apply_preset_to_business_settings = business_presets_mod.apply_preset_to_business_settings
    resolve_business_preset_from_settings = business_presets_mod.resolve_business_preset_from_settings
    get_business_preset = business_presets_mod.get_business_preset
    BUSINESS_PRESETS = business_presets_mod.BUSINESS_PRESETS
    get_all_presets_for_ui = business_presets_mod.get_all_presets_for_ui
    allocate_payment_amount = commercial_financials_mod.allocate_payment_amount
    create_sale_financial_entries = commercial_financials_mod.create_sale_financial_entries
    delete_sale_financial_effects = commercial_financials_mod.delete_sale_financial_effects
    list_sale_initial_cash_events = commercial_financials_mod.list_sale_initial_cash_events
    reverse_payment_allocations = commercial_financials_mod.reverse_payment_allocations
    create_expense_record = treasury_flow_mod.create_expense_record
    resolve_treasury_context = treasury_flow_mod.resolve_treasury_context
    active_module_keys_from_payload = rbac_mod.active_module_keys_from_payload
    extract_commercial_sections = rbac_mod.extract_commercial_sections
    extract_operational_profile = rbac_mod.extract_operational_profile
    list_applicable_role_templates = rbac_mod.list_applicable_role_templates
    list_business_permission_definitions = rbac_mod.list_business_permission_definitions
    normalize_permission_names = rbac_mod.normalize_permission_names
    resolve_effective_permissions = rbac_mod.resolve_effective_permissions
    serialize_role_definition = rbac_mod.serialize_role_definition
    InsufficientRawMaterialsError = operational_inventory_mod.InsufficientRawMaterialsError
    clear_sale_origin_links = operational_inventory_mod.clear_sale_origin_links
    normalize_fulfillment_mode = operational_inventory_mod.normalize_fulfillment_mode
    register_stock_production = operational_inventory_mod.register_stock_production
    resolve_product_fulfillment_mode = operational_inventory_mod.resolve_product_fulfillment_mode
    reverse_sale_operational_effects = operational_inventory_mod.reverse_sale_operational_effects
    apply_sale_inventory_effects = sale_inventory_mod.apply_sale_inventory_effects
    log_startup_bootstrap_status = startup_mod.log_startup_bootstrap_status
    register_financial_restore_routes = financial_routes_mod.register_financial_restore_routes
    register_raw_inventory_restore_routes = raw_inventory_routes_mod.register_raw_inventory_restore_routes
    register_commercial_core_restore_routes = commercial_core_routes_mod.register_commercial_core_restore_routes
    register_commercial_quotes_restore_routes = commercial_quotes_routes_mod.register_commercial_quotes_restore_routes
    register_commercial_invoices_restore_routes = commercial_invoices_routes_mod.register_commercial_invoices_restore_routes
    User = mdl_mod.User
    Business = mdl_mod.Business
    BusinessModule = mdl_mod.BusinessModule
    BUSINESS_MODULE_DEFAULTS = mdl_mod.BUSINESS_MODULE_DEFAULTS
    BUSINESS_MODULE_KEYS = mdl_mod.BUSINESS_MODULE_KEYS
    Product = mdl_mod.Product
    Customer = mdl_mod.Customer
    Sale = mdl_mod.Sale
    Expense = mdl_mod.Expense
    Payment = mdl_mod.Payment
    LedgerEntry = mdl_mod.LedgerEntry
    LedgerAllocation = mdl_mod.LedgerAllocation
    Permission = mdl_mod.Permission
    Role = mdl_mod.Role
    UserRole = mdl_mod.UserRole
    RolePermission = mdl_mod.RolePermission
    AuditLog = mdl_mod.AuditLog
    SubscriptionPayment = mdl_mod.SubscriptionPayment
    AppSettings = mdl_mod.AppSettings
    Order = mdl_mod.Order
    Invoice = mdl_mod.Invoice
    InvoicePayment = mdl_mod.InvoicePayment
    RecurringExpense = mdl_mod.RecurringExpense
    QuickNote = mdl_mod.QuickNote
    Reminder = mdl_mod.Reminder
    SalesGoal = mdl_mod.SalesGoal
    Banner = mdl_mod.Banner
    FAQ = mdl_mod.FAQ
    Debt = mdl_mod.Debt
    DebtPayment = mdl_mod.DebtPayment
    ProductBarcode = mdl_mod.ProductBarcode
    ProductMovement = mdl_mod.ProductMovement
    RawMaterial = mdl_mod.RawMaterial
    RawMaterialMovement = mdl_mod.RawMaterialMovement
    Recipe = mdl_mod.Recipe
    RecipeConsumption = mdl_mod.RecipeConsumption
    RecipeConsumptionItem = mdl_mod.RecipeConsumptionItem
    RecipeItem = mdl_mod.RecipeItem
    SupplierPayable = mdl_mod.SupplierPayable
    TeamMember = mdl_mod.TeamMember
    TeamInvitation = mdl_mod.TeamInvitation
    TeamFeedback = mdl_mod.TeamFeedback
    TreasuryAccount = mdl_mod.TreasuryAccount

from backend.services.summary_aggregate_service import DASHBOARD_CACHE_NAMESPACE, SUMMARY_CACHE_NAMESPACE, build_snapshot_lock_name, build_summary_payload_from_daily_aggregate, enqueue_namespace_refresh, get_namespace_dirty_snapshot, get_namespace_state_snapshot, mark_business_payloads_dirty, mark_namespace_rebuilt, persist_shared_snapshot, snapshot_is_fresh, snapshot_is_servable
from backend.services.audit_service import present_audit_log, record_audit_event, snapshot_model

def get_current_role_snapshot(user, business_id):
    """
    Obtener el nombre del rol del usuario en el contexto de un negocio.
    Retorna "Propietario", "Admin", o el nombre del rol personalizado.
    """
    if not user:
        return "Desconocido"
    
    # 1. Check Owner
    business = Business.query.get(business_id)
    if business and business.user_id == user.id:
        return "Propietario"
        
    # 2. Check Team Member
    member = TeamMember.query.filter_by(user_id=user.id, business_id=business_id, status='active').first()
    if member and member.role:
        return member.role.name
        
    # 3. Fallback (maybe System Admin?)
    if user.is_admin:
        return "SuperAdmin"
        
    return "Usuario"


AUDIT_SNAPSHOT_KEYS = {
    "business": ["id", "name", "currency", "timezone", "monthly_sales_goal", "settings", "whatsapp_templates"],
    "product": ["id", "name", "description", "type", "sku", "price", "cost", "unit", "stock", "low_stock_threshold", "active"],
    "customer": ["id", "name", "phone", "address", "notes", "active"],
    "sale": ["id", "customer_id", "sale_date", "subtotal", "discount", "total", "balance", "payment_method", "paid", "note"],
    "payment": ["id", "customer_id", "sale_id", "payment_date", "amount", "method", "note"],
    "team_member": ["id", "user_id", "business_id", "role_id", "status"],
    "team_invitation": ["id", "email", "role_id", "business_id", "status", "expires_at"],
}


def _audit_snapshot(entity_type, instance):
    return snapshot_model(instance, AUDIT_SNAPSHOT_KEYS.get(entity_type))


def _audit_source_path(module, entity_id=None):
    if module == "sales":
        return f"/sales/{entity_id}" if entity_id else "/sales"
    if module == "accounts_receivable":
        return f"/payments/{entity_id}" if entity_id else "/payments"
    if module == "customers":
        return f"/customers/{entity_id}" if entity_id else "/customers"
    if module in {"products", "raw_inventory"}:
        return f"/products/{entity_id}" if entity_id else "/products"
    if module == "team":
        return "/settings?section=team"
    if module == "settings":
        return "/settings"
    return None


def _build_audit_metadata(detail=None, source_path=None, **extra):
    metadata = {}
    if detail:
        metadata["detail"] = detail
    if source_path:
        metadata["source_path"] = source_path
    for key, value in extra.items():
        if value is not None:
            metadata[key] = value
    return metadata or None


def _record_business_audit(
    *,
    business_id,
    module,
    entity_type,
    entity_id,
    action,
    summary,
    actor_user=None,
    detail=None,
    metadata=None,
    before=None,
    after=None,
):
    source_path = None
    if isinstance(metadata, dict):
        source_path = metadata.get("source_path")
    if source_path is None:
        source_path = _audit_source_path(module, entity_id)

    normalized_metadata = metadata.copy() if isinstance(metadata, dict) else {}
    if detail and "detail" not in normalized_metadata:
        normalized_metadata["detail"] = detail
    if source_path and "source_path" not in normalized_metadata:
        normalized_metadata["source_path"] = source_path

    record_audit_event(
        business_id=business_id,
        actor_user=actor_user,
        module=module,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        summary=summary,
        metadata=normalized_metadata or None,
        before=before,
        after=after,
        allow_without_plan=True,
        commit=False,
    )


def _user_can_view_business_audit(user, business):
    if not user or not business:
        return False
    if getattr(user, "is_admin", False):
        return True
    if business.user_id == getattr(user, "id", None):
        return True
    return has_permission(user, "business.update", business.id) or has_permission(user, "team.manage", business.id)

def ensure_business_modules_initialized(business_id, auto_commit=True):
    existing_rows = BusinessModule.query.filter_by(business_id=business_id).all()
    existing_map = {row.module_key: row for row in existing_rows}
    created = False

    for module_key, enabled in BUSINESS_MODULE_DEFAULTS.items():
        if module_key in existing_map:
            continue
        row = BusinessModule(
            business_id=business_id,
            module_key=module_key,
            enabled=enabled,
        )
        db.session.add(row)
        existing_map[module_key] = row
        created = True

    if created and auto_commit:
        db.session.commit()

    return existing_map

def serialize_business_modules(module_map):
    modules = []
    for module_key in BUSINESS_MODULE_KEYS:
        row = module_map.get(module_key)
        modules.append({
            "module_key": module_key,
            "enabled": bool(row.enabled) if row else bool(BUSINESS_MODULE_DEFAULTS[module_key]),
            "config": row.config if row else None,
            "updated_at": row.updated_at.isoformat() if row and row.updated_at else None,
        })
    return modules

def get_business_modules(business_id):
    module_map = ensure_business_modules_initialized(business_id)
    return serialize_business_modules(module_map)

def is_module_enabled(business_id, module_key):
    if module_key not in BUSINESS_MODULE_DEFAULTS:
        raise ValueError(f"Invalid module key: {module_key}")
    module_map = ensure_business_modules_initialized(business_id)
    row = module_map.get(module_key)
    if not row:
        return bool(BUSINESS_MODULE_DEFAULTS[module_key])
    return bool(row.enabled)

def ensure_module_enabled(business_id, module_key):
    if module_key not in BUSINESS_MODULE_DEFAULTS:
        return jsonify({"error": "MÃ³dulo invÃ¡lido", "module_key": module_key}), 400
    if is_module_enabled(business_id, module_key):
        return None
    return jsonify({
        "error": "El mÃ³dulo no estÃ¡ habilitado para este negocio",
        "module_key": module_key,
        "enabled": False,
    }), 403

def module_required(module_key):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            business_id = kwargs.get("business_id") or request.args.get("business_id")
            if not business_id and request.is_json:
                data = request.get_json(silent=True) or {}
                if isinstance(data, dict):
                    business_id = data.get("business_id")

            try:
                business_id = int(business_id)
            except (TypeError, ValueError):
                return jsonify({"error": "business_id es requerido"}), 400

            response = ensure_module_enabled(business_id, module_key)
            if response:
                return response

            return f(*args, **kwargs)
        return decorated
    return decorator

def attach_modules_to_business_dict(business, business_dict=None):
    payload = business_dict or business.to_dict()
    payload["settings"] = normalize_business_settings(payload.get("settings"))
    payload["modules"] = get_business_modules(business.id)
    return payload


def _safe_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def _resolve_treasury_account_id(business_id, payment_method=None, treasury_account_id=None):
    return resolve_treasury_context(
        business_id,
        payment_method=payment_method,
        treasury_account_id=treasury_account_id,
        allow_account_autoselect=True,
        require_account=False,
    ).get("treasury_account_id")


def _add_months(base_date, months):
    month_index = (base_date.month - 1) + months
    year = base_date.year + (month_index // 12)
    month = (month_index % 12) + 1
    month_lengths = [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    day = min(base_date.day, month_lengths[month - 1])
    return date(year, month, day)


def _advance_recurring_due_date(recurring_expense, paid_date):
    current_due = recurring_expense.next_due_date or paid_date
    frequency = str(recurring_expense.frequency or "monthly").strip().lower()
    if frequency == "weekly":
        recurring_expense.next_due_date = current_due + timedelta(days=7)
    elif frequency == "biweekly":
        recurring_expense.next_due_date = current_due + timedelta(days=14)
    elif frequency == "annual":
        recurring_expense.next_due_date = _add_months(current_due, 12)
    else:
        recurring_expense.next_due_date = _add_months(current_due, 1)
    return recurring_expense.next_due_date


def _apply_debt_payment(*, debt, amount, payment_date, payment_method, treasury_account_id, note, actor_user, role_snapshot):
    payment = DebtPayment(
        debt_id=debt.id,
        amount=round(float(amount or 0), 2),
        payment_date=payment_date,
        payment_method=payment_method,
        treasury_account_id=treasury_account_id,
        note=note,
    )
    db.session.add(payment)
    db.session.flush()
    debt.balance_due = round(max(0.0, float(debt.balance_due or 0) - float(payment.amount or 0)), 2)
    if debt.balance_due <= 0.01:
        debt.balance_due = 0.0
        debt.status = "paid"
    else:
        debt.status = "partial"
    create_expense_record(
        business_id=debt.business_id,
        expense_date=payment_date,
        category=debt.category or "otros",
        amount=payment.amount,
        description=note or f"Pago deuda {debt.name}",
        source_type="debt_payment",
        payment_method=payment_method,
        treasury_account_id=treasury_account_id,
        debt_id=debt.id,
        debt_payment_id=payment.id,
        actor_user=actor_user,
        role_snapshot=role_snapshot,
    )
    return payment


def _apply_sale_inventory_effects(
    *,
    business,
    sale,
    items,
    actor_user,
    role_snapshot,
):
    return apply_sale_inventory_effects(
        business=business,
        sale=sale,
        items=items,
        actor_user=actor_user,
        role_snapshot=role_snapshot,
        raw_material_consumption_mode="sale",
    )

def get_response_cache():
    extensions = getattr(current_app, "extensions", None)
    if not isinstance(extensions, dict):
        return None
    return extensions.get("local_response_cache")

COMMERCIAL_SECTION_DEFAULTS = {
    "invoices": True,
    "orders": True,
    "sales_goals": True,
}
COMMERCIAL_SECTION_KEYS = tuple(COMMERCIAL_SECTION_DEFAULTS.keys())
INITIAL_SETUP_DEFAULTS = {
    "version": 1,
    "onboarding_profile": {
        "business_category": None,
        "inventory_mode": None,
        "sales_flow": None,
        "home_focus": None,
        "team_mode": None,
        "documents_mode": None,
        "operations_mode": None,
        "operational_model": None,
        "raw_materials_mode": None,
        "recipe_mode": None,
        "selling_mode": None,
        "production_control": None,
    },
    "onboarding_completed": False,
    "onboarding_completed_at": None,
    "initial_modules_applied": [],
    "initial_home_focus": None,
    "initial_dashboard_tab": "hoy",
    "recommended_tutorials": [],
    "simplicity_level": "guided",
    "highlighted_tools": [],
    "hidden_tools": [],
}

def normalize_business_settings(settings):
    normalized_settings = dict(settings or {}) if isinstance(settings, dict) else {}
    normalized_settings["operational_profile"] = normalize_business_operational_profile(
        normalized_settings.get("operational_profile")
    )
    personalization = normalized_settings.get("personalization")
    if not isinstance(personalization, dict):
        personalization = {}
    commercial_sections = personalization.get("commercial_sections")
    normalized_sections = {
        key: bool(enabled)
        for key, enabled in COMMERCIAL_SECTION_DEFAULTS.items()
    }
    if isinstance(commercial_sections, dict):
        for key in COMMERCIAL_SECTION_KEYS:
            if key in commercial_sections:
                normalized_sections[key] = bool(commercial_sections[key])
    personalization["commercial_sections"] = normalized_sections
    normalized_settings["personalization"] = personalization
    initial_setup = normalized_settings.get("initial_setup")
    if not isinstance(initial_setup, dict):
        initial_setup = {}
    initial_profile = initial_setup.get("onboarding_profile")
    if not isinstance(initial_profile, dict):
        initial_profile = {}
    try:
        initial_setup_version = int(initial_setup.get("version") or INITIAL_SETUP_DEFAULTS["version"])
    except Exception:
        initial_setup_version = INITIAL_SETUP_DEFAULTS["version"]
    normalized_initial_setup = {
        "version": initial_setup_version,
        "onboarding_profile": {
            "business_category": initial_profile.get("business_category"),
            "inventory_mode": initial_profile.get("inventory_mode"),
            "sales_flow": initial_profile.get("sales_flow"),
            "home_focus": initial_profile.get("home_focus"),
            "team_mode": initial_profile.get("team_mode"),
            "documents_mode": initial_profile.get("documents_mode"),
            "operations_mode": initial_profile.get("operations_mode"),
            "operational_model": initial_profile.get("operational_model"),
            "raw_materials_mode": initial_profile.get("raw_materials_mode"),
            "recipe_mode": initial_profile.get("recipe_mode"),
            "selling_mode": initial_profile.get("selling_mode"),
            "production_control": initial_profile.get("production_control"),
        },
        "onboarding_completed": bool(initial_setup.get("onboarding_completed")),
        "onboarding_completed_at": initial_setup.get("onboarding_completed_at") or None,
        "initial_modules_applied": [
            module_key
            for module_key in (initial_setup.get("initial_modules_applied") or [])
            if module_key
        ],
        "initial_home_focus": initial_setup.get("initial_home_focus") or None,
        "initial_dashboard_tab": initial_setup.get("initial_dashboard_tab") or INITIAL_SETUP_DEFAULTS["initial_dashboard_tab"],
        "recommended_tutorials": [
            tutorial_id
            for tutorial_id in (initial_setup.get("recommended_tutorials") or [])
            if tutorial_id
        ],
        "simplicity_level": initial_setup.get("simplicity_level") or INITIAL_SETUP_DEFAULTS["simplicity_level"],
        "highlighted_tools": [
            label
            for label in (initial_setup.get("highlighted_tools") or [])
            if label
        ],
        "hidden_tools": [
            label
            for label in (initial_setup.get("hidden_tools") or [])
            if label
        ],
    }
    normalized_settings["initial_setup"] = normalized_initial_setup
    return normalized_settings

def get_business_commercial_sections(business_or_settings):
    settings = business_or_settings.settings if hasattr(business_or_settings, "settings") else business_or_settings
    normalized_settings = normalize_business_settings(settings)
    personalization = normalized_settings.get("personalization") or {}
    commercial_sections = personalization.get("commercial_sections") or {}
    return {
        key: bool(commercial_sections.get(key, COMMERCIAL_SECTION_DEFAULTS[key]))
        for key in COMMERCIAL_SECTION_KEYS
    }

def is_commercial_section_enabled(business, section_key):
    if section_key not in COMMERCIAL_SECTION_DEFAULTS:
        raise ValueError(f"Invalid commercial section key: {section_key}")
    return bool(get_business_commercial_sections(business).get(section_key, COMMERCIAL_SECTION_DEFAULTS[section_key]))

def ensure_commercial_section_enabled(business_id, section_key):
    if section_key not in COMMERCIAL_SECTION_DEFAULTS:
        return jsonify({"error": "SecciÃ³n comercial invÃ¡lida", "section_key": section_key}), 400
    business = Business.query.get(business_id)
    if not business:
        return jsonify({"error": "Negocio no encontrado"}), 404
    if is_commercial_section_enabled(business, section_key):
        return None
    return jsonify({
        "error": "La secciÃ³n comercial no estÃ¡ habilitada para este negocio",
        "section_key": section_key,
        "enabled": False,
    }), 403

def commercial_section_required(section_key):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            business_id = kwargs.get("business_id") or request.args.get("business_id")
            if not business_id and request.is_json:
                data = request.get_json(silent=True) or {}
                if isinstance(data, dict):
                    business_id = data.get("business_id")

            try:
                business_id = int(business_id)
            except (TypeError, ValueError):
                return jsonify({"error": "business_id es requerido"}), 400

            response = ensure_commercial_section_enabled(business_id, section_key)
            if response:
                return response

            return f(*args, **kwargs)
        return decorated
    return decorator

def get_shared_response_cache():
    extensions = getattr(current_app, "extensions", None)
    if not isinstance(extensions, dict):
        return None
    cache = extensions.get("shared_response_cache")
    return cache if isinstance(cache, SharedResponseCache) and cache.enabled else None

AUTH_BOOTSTRAP_CACHE_NAMESPACE = "auth-bootstrap"

def _get_request_query_count() -> int:
    try:
        return int(getattr(g, "_sql_query_count", 0) or 0)
    except Exception:
        return 0

def _get_request_query_time_ms() -> float:
    try:
        return float(getattr(g, "_sql_query_time_ms", 0.0) or 0.0)
    except Exception:
        return 0.0

def _record_profile_stage(profile: dict | None, stage_name: str, started_at: float, *, extra: dict | None = None) -> None:
    if profile is None:
        return
    stages = profile.setdefault("stages", {})
    stage = stages.setdefault(
        stage_name,
        {
            "count": 0,
            "wall_ms": 0.0,
            "queries": 0,
            "sql_time_ms": 0.0,
        },
    )
    stage["count"] = int(stage.get("count") or 0) + 1
    stage["wall_ms"] = round(float(stage.get("wall_ms") or 0.0) + ((time.perf_counter() - started_at) * 1000.0), 3)
    stage["queries"] = int(stage.get("queries") or 0)
    stage["sql_time_ms"] = round(float(stage.get("sql_time_ms") or 0.0), 3)
    if extra:
        for key, value in extra.items():
            stage[key] = value

def _profile_sql_stage(profile: dict | None, stage_name: str, func):
    started_at = time.perf_counter()
    queries_before = _get_request_query_count()
    sql_before = _get_request_query_time_ms()
    result = func()
    if profile is not None:
        stages = profile.setdefault("stages", {})
        stage = stages.setdefault(
            stage_name,
            {
                "count": 0,
                "wall_ms": 0.0,
                "queries": 0,
                "sql_time_ms": 0.0,
            },
        )
        stage["count"] = int(stage.get("count") or 0) + 1
        stage["wall_ms"] = round(float(stage.get("wall_ms") or 0.0) + ((time.perf_counter() - started_at) * 1000.0), 3)
        stage["queries"] = int(stage.get("queries") or 0) + max(_get_request_query_count() - queries_before, 0)
        stage["sql_time_ms"] = round(float(stage.get("sql_time_ms") or 0.0) + max(_get_request_query_time_ms() - sql_before, 0.0), 3)
    return result

def _finalize_profile(profile: dict | None, started_at: float, *, extra: dict | None = None) -> dict | None:
    if profile is None:
        return None
    total_wall_ms = round((time.perf_counter() - started_at) * 1000.0, 3)
    sql_time_ms = round(_get_request_query_time_ms(), 3)
    stages = profile.get("stages") or {}
    instrumented_wall_ms = round(
        sum(float((stage or {}).get("wall_ms") or 0.0) for stage in stages.values()),
        3,
    )
    profile["total_wall_ms"] = total_wall_ms
    profile["query_count"] = _get_request_query_count()
    profile["sql_time_ms"] = sql_time_ms
    profile["python_time_ms"] = round(max(total_wall_ms - sql_time_ms, 0.0), 3)
    profile["instrumented_wall_ms"] = instrumented_wall_ms
    profile["unaccounted_wall_ms"] = round(max(total_wall_ms - instrumented_wall_ms, 0.0), 3)
    if extra:
        profile.update(extra)
    return profile

def _attach_profile_headers(response, profile: dict | None):
    if profile is None:
        return response
    compact_profile = {
        "total_wall_ms": float(profile.get("total_wall_ms") or 0.0),
        "query_count": int(profile.get("query_count") or 0),
        "sql_time_ms": float(profile.get("sql_time_ms") or 0.0),
        "python_time_ms": float(profile.get("python_time_ms") or 0.0),
        "instrumented_wall_ms": float(profile.get("instrumented_wall_ms") or 0.0),
        "unaccounted_wall_ms": float(profile.get("unaccounted_wall_ms") or 0.0),
        "cache": profile.get("cache"),
        "stages": profile.get("stages") or {},
    }
    response.headers["X-Profile-Query-Count"] = str(compact_profile["query_count"])
    response.headers["X-Profile-Sql-Time-Ms"] = str(compact_profile["sql_time_ms"])
    response.headers["X-Profile-Total-Wall-Ms"] = str(compact_profile["total_wall_ms"])
    response.headers["X-Profile-Summary"] = json.dumps(compact_profile, separators=(",", ":"), ensure_ascii=False, default=str)
    return response

def _serialize_modules_without_writes(module_rows_by_business: dict[int, list[BusinessModule]], business_id: int):
    module_rows = module_rows_by_business.get(int(business_id), [])
    module_map = {row.module_key: row for row in module_rows}
    modules = []
    for module_key in BUSINESS_MODULE_KEYS:
        row = module_map.get(module_key)
        modules.append({
            "module_key": module_key,
            "enabled": bool(row.enabled) if row else bool(BUSINESS_MODULE_DEFAULTS[module_key]),
            "config": row.config if row else None,
            "updated_at": row.updated_at.isoformat() if row and row.updated_at else None,
        })
    return modules


def _resolve_business_rbac_metadata(user, business_dict, modules):
    settings = normalize_business_settings(business_dict.get("settings"))
    operational_profile = extract_operational_profile(settings)
    commercial_sections = extract_commercial_sections(settings)
    active_modules = active_module_keys_from_payload(modules)
    access = resolve_account_access(user)
    plan = access.get("plan") or "basic"
    suggested_roles = list_applicable_role_templates(
        plan=plan,
        operational_profile=operational_profile,
        active_modules=active_modules,
        commercial_sections=commercial_sections,
    )
    return {
        "plan": plan,
        "operational_profile": operational_profile,
        "commercial_sections": commercial_sections,
        "active_modules": active_modules,
        "suggested_roles": suggested_roles,
    }


def _ensure_permission_record(permission_name):
    permission = Permission.query.filter_by(name=permission_name).first()
    if permission:
        return permission
    definition = next(
        (item for item in list_business_permission_definitions(include_compatibility=True) if item.get("name") == permission_name),
        None,
    )
    if not definition:
        return None
    permission = Permission(
        name=definition["name"],
        description=definition.get("description", ""),
        category=definition.get("category", "general"),
        scope=definition.get("scope", "business"),
    )
    db.session.add(permission)
    db.session.flush()
    return permission

def _build_default_templates_payload():
    return {
        "collection_message": (
            "Hola {cliente} \n"
            "Te escribo de *{negocio}*.\n\n"
            "SegÃºn mi registro, tienes un saldo pendiente de *${deuda}*.\n"
            "Â¿Me confirmas por favor cuÃ¡ndo puedes realizar el pago?\n\n"
            "Gracias "
        ),
        "sale_message": (
            "Hola {cliente}, gracias por tu compra en *{negocio}*.\n\n"
            "*Detalle:*\n{items}\n"
            "*TOTAL: ${total}*\n"
            "Pagado: ${pagado}\n"
            "Saldo: ${saldo}\n\n"
            "Â¡Esperamos verte pronto! "
        )
    }

def _build_bootstrap_cache_version(user, businesses, memberships, current_member_role_ids):
    parts = [
        f"user:{int(user.id)}",
        f"user_updated:{getattr(user, 'updated_at', None) or ''}",
        f"user_plan:{getattr(user, 'plan', '')}",
        f"user_type:{getattr(user, 'account_type', '')}",
    ]
    for business in sorted(businesses, key=lambda item: int(item.id)):
        parts.append(f"business:{business.id}:{business.updated_at or ''}:{business.user_id}")
    for membership in sorted(memberships, key=lambda item: int(item.business_id)):
        role = getattr(membership, "role", None)
        parts.append(f"member:{membership.business_id}:{membership.updated_at or ''}:{membership.role_id}:{getattr(role, 'name', '')}")
        if role and getattr(role, "permissions", None):
            for role_perm in role.permissions:
                permission = getattr(role_perm, "permission", None)
                parts.append(f"perm:{membership.business_id}:{membership.role_id}:{getattr(permission, 'name', '')}:{getattr(role_perm, 'granted_at', None) or ''}")
    for role_id in sorted({int(role_id) for role_id in current_member_role_ids if role_id}):
        parts.append(f"current_role:{role_id}")
    return hashlib.sha1("|".join(parts).encode("utf-8")).hexdigest()

def _load_business_bootstrap_payload(user, preferred_business_id=None, profile=None):
    normalized_preferred_business_id = int(preferred_business_id or 0)
    owned_businesses = []
    memberships = []
    legacy_business = None
    legacy_role_permissions = []
    legacy_role_name = None
    current_member_role_ids = []
    if getattr(user, "account_type", None) == "personal":
        owned_businesses = _profile_sql_stage(
            profile,
            "bootstrap_owned_businesses_lookup",
            lambda: Business.query.options(joinedload(Business.user)).filter_by(user_id=user.id).all(),
        )
        memberships = _profile_sql_stage(
            profile,
            "bootstrap_membership_lookup",
            lambda: TeamMember.query.options(
                joinedload(TeamMember.role).joinedload(Role.permissions).joinedload(RolePermission.permission),
                joinedload(TeamMember.business).joinedload(Business.user),
            ).filter_by(user_id=user.id, status='active').all(),
        )
    else:
        legacy_user = _profile_sql_stage(
            profile,
            "bootstrap_membership_lookup",
            lambda: User.query.options(
                joinedload(User.roles).joinedload(UserRole.role).joinedload(Role.permissions).joinedload(RolePermission.permission),
                joinedload(User.linked_business).joinedload(Business.user),
            ).filter_by(id=user.id).first(),
        )
        if legacy_user is not None:
            legacy_business = legacy_user.linked_business
            if legacy_user.roles and legacy_user.roles[0].role:
                legacy_role_name = legacy_user.roles[0].role.name
                current_member_role_ids.append(legacy_user.roles[0].role.id)
                legacy_role_permissions = [
                    role_perm.permission.name
                    for role_perm in legacy_user.roles[0].role.permissions
                    if role_perm.permission
                ]

    business_map = {int(business.id): business for business in owned_businesses}
    member_map = {}
    for membership in memberships:
        business = membership.business
        if business is None:
            continue
        business_map[int(business.id)] = business
        member_map[int(business.id)] = membership
        if membership.role_id:
            current_member_role_ids.append(int(membership.role_id))
    if legacy_business is not None:
        business_map[int(legacy_business.id)] = legacy_business

    ordered_businesses = [business_map[business_id] for business_id in sorted(business_map.keys())]
    module_rows = []
    if ordered_businesses:
        business_ids = [int(business.id) for business in ordered_businesses]
        module_rows = _profile_sql_stage(
            profile,
            "bootstrap_modules_lookup",
            lambda: BusinessModule.query.filter(BusinessModule.business_id.in_(business_ids)).all(),
        )
    module_rows_by_business = {}
    for row in module_rows:
        module_rows_by_business.setdefault(int(row.business_id), []).append(row)

    default_templates = _build_default_templates_payload()
    response_data = []
    for business in ordered_businesses:
        business_dict = business.to_dict()
        business_dict["settings"] = normalize_business_settings(business_dict.get("settings"))
        if not business_dict.get("whatsapp_templates"):
            business_dict["whatsapp_templates"] = default_templates
        business_dict["modules"] = _serialize_modules_without_writes(module_rows_by_business, business.id)
        rbac_metadata = _resolve_business_rbac_metadata(user, business_dict, business_dict["modules"])
        if int(business.user_id) == int(user.id):
            business_dict["role"] = "OWNER"
            business_permissions = resolve_effective_permissions(
                plan=rbac_metadata["plan"],
                operational_profile=rbac_metadata["operational_profile"],
                active_modules=rbac_metadata["active_modules"],
                role_name="PROPIETARIO",
                commercial_sections=rbac_metadata["commercial_sections"],
                is_owner=True,
            )
        elif int(business.id) in member_map:
            membership = member_map[int(business.id)]
            business_dict["role"] = membership.role.name if membership.role else "MEMBER"
            business_permissions = resolve_effective_permissions(
                plan=rbac_metadata["plan"],
                operational_profile=rbac_metadata["operational_profile"],
                active_modules=rbac_metadata["active_modules"],
                role_name=membership.role.name if membership.role else None,
                base_permissions=[
                    role_perm.permission.name
                    for role_perm in (membership.role.permissions if membership.role else [])
                    if role_perm.permission
                ],
                commercial_sections=rbac_metadata["commercial_sections"],
            )
        elif legacy_business is not None and int(business.id) == int(legacy_business.id):
            business_dict["role"] = legacy_role_name or "MEMBER"
            business_permissions = resolve_effective_permissions(
                plan=rbac_metadata["plan"],
                operational_profile=rbac_metadata["operational_profile"],
                active_modules=rbac_metadata["active_modules"],
                role_name=legacy_role_name,
                base_permissions=legacy_role_permissions,
                commercial_sections=rbac_metadata["commercial_sections"],
            )
        else:
            business_dict["role"] = "MEMBER"
            business_permissions = resolve_effective_permissions(
                plan=rbac_metadata["plan"],
                operational_profile=rbac_metadata["operational_profile"],
                active_modules=rbac_metadata["active_modules"],
                role_name="MEMBER",
                base_permissions=[],
                commercial_sections=rbac_metadata["commercial_sections"],
            )
        business_dict["plan"] = rbac_metadata["plan"]
        business_dict["permissions"] = business_permissions["effective_permissions"]
        business_dict["permissions_canonical"] = business_permissions["canonical_permissions"]
        business_dict["rbac"] = {
            "plan": rbac_metadata["plan"],
            "suggested_roles": rbac_metadata["suggested_roles"],
            "commercial_sections": rbac_metadata["commercial_sections"],
            "operational_profile": rbac_metadata["operational_profile"],
        }
        response_data.append(business_dict)

    active_business = None
    if normalized_preferred_business_id > 0:
        active_business = next((item for item in response_data if int(item.get("id") or 0) == normalized_preferred_business_id), None)
    if active_business is None and response_data:
        active_business = response_data[0]

    version = _build_bootstrap_cache_version(user, ordered_businesses, memberships, current_member_role_ids)
    return {
        "businesses": response_data,
        "active_business": active_business,
        "cache_version": version,
    }

def _get_business_bootstrap_payload(user, preferred_business_id=None, profile=None):
    normalized_preferred_business_id = int(preferred_business_id or 0)
    shared_cache = get_shared_response_cache()
    cache_key = None
    snapshot = None
    if shared_cache is not None:
        cache_key = {
            "user_id": int(user.id),
            "preferred_business_id": normalized_preferred_business_id,
            "account_type": getattr(user, "account_type", None),
        }
    if shared_cache is not None and cache_key is not None:
        snapshot = shared_cache.get_snapshot(AUTH_BOOTSTRAP_CACHE_NAMESPACE, cache_key)
        if snapshot and float(snapshot.get("fresh_until_epoch") or 0.0) >= time.time():
            cached_payload = snapshot.get("payload")
            if isinstance(cached_payload, dict):
                if profile is not None:
                    profile["cache"] = {"hit": True, "namespace": AUTH_BOOTSTRAP_CACHE_NAMESPACE}
                return cached_payload
    payload = _load_business_bootstrap_payload(user, preferred_business_id=normalized_preferred_business_id, profile=profile)
    if shared_cache is None or cache_key is None:
        if profile is not None:
            profile["cache"] = {"hit": False, "namespace": AUTH_BOOTSTRAP_CACHE_NAMESPACE}
        return payload
    fresh_ttl = int(current_app.config.get("AUTH_BOOTSTRAP_CACHE_FRESH_TTL_SECONDS", 30) or 30)
    stale_ttl = int(current_app.config.get("AUTH_BOOTSTRAP_CACHE_STALE_TTL_SECONDS", 180) or 180)
    shared_cache.set_snapshot(
        AUTH_BOOTSTRAP_CACHE_NAMESPACE,
        normalized_preferred_business_id or int(user.id),
        cache_key,
        payload,
        fresh_ttl_seconds=fresh_ttl,
        stale_ttl_seconds=stale_ttl,
        metadata={"cache_version": payload.get("cache_version")},
    )
    if profile is not None:
        profile["cache"] = {"hit": False, "namespace": AUTH_BOOTSTRAP_CACHE_NAMESPACE}
    return payload

def serialize_sale_list_payload(sale):
    return {
        "id": sale.id,
        "business_id": sale.business_id,
        "customer_id": sale.customer_id,
        "sale_date": sale.sale_date.isoformat() if sale.sale_date else None,
        "items": [],
        "subtotal": sale.subtotal,
        "discount": sale.discount,
        "total": sale.total,
        "balance": sale.balance,
        "collected_amount": sale.collected_amount,
        "total_cost": sale.total_cost,
        "payment_method": sale.payment_method,
        "treasury_account_id": sale.treasury_account_id,
        "treasury_account_name": sale.treasury_account.name if sale.treasury_account else None,
        "treasury_account_type": sale.treasury_account.account_type if sale.treasury_account else None,
        "paid": sale.paid,
        "note": sale.note,
        "customer_name": sale.customer.name if sale.customer else None,
        "created_at": sale.created_at.isoformat() if sale.created_at else None,
        "created_by_name": sale.created_by_name,
        "created_by_role": sale.created_by_role,
        "updated_by_user_id": sale.updated_by_user_id,
    }

def get_payment_allocations_map(payment_ids):
    normalized_payment_ids = [int(payment_id) for payment_id in payment_ids if payment_id is not None]
    if not normalized_payment_ids:
        return {}
    rows = db.session.query(
        LedgerEntry.ref_id,
        LedgerAllocation.amount,
        LedgerEntry.ref_id,
    ).join(
        LedgerAllocation,
        LedgerAllocation.charge_id == LedgerEntry.id,
    ).filter(
        LedgerAllocation.payment_id.in_(
            db.session.query(LedgerEntry.id).filter(
                LedgerEntry.ref_type == "payment",
                LedgerEntry.ref_id.in_(normalized_payment_ids),
            )
        ),
        LedgerEntry.ref_type == "sale",
        LedgerEntry.entry_type == "charge",
    ).all()
    payment_entry_map_rows = db.session.query(LedgerEntry.id, LedgerEntry.ref_id).filter(
        LedgerEntry.ref_type == "payment",
        LedgerEntry.ref_id.in_(normalized_payment_ids),
    ).all()
    payment_entry_to_payment_id = {ledger_entry_id: payment_id for ledger_entry_id, payment_id in payment_entry_map_rows}
    allocation_rows = db.session.query(
        LedgerAllocation.payment_id,
        LedgerEntry.ref_id,
        LedgerAllocation.amount,
    ).join(
        LedgerEntry,
        LedgerAllocation.charge_id == LedgerEntry.id,
    ).filter(
        LedgerAllocation.payment_id.in_(payment_entry_to_payment_id.keys()),
        LedgerEntry.ref_type == "sale",
        LedgerEntry.entry_type == "charge",
    ).order_by(LedgerAllocation.id.asc()).all()
    allocations_map = {payment_id: [] for payment_id in normalized_payment_ids}
    for payment_entry_id, sale_id, amount in allocation_rows:
        payment_id = payment_entry_to_payment_id.get(payment_entry_id)
        if payment_id is None:
            continue
        allocations_map.setdefault(payment_id, []).append({
            "sale_id": sale_id,
            "amount": amount,
        })
    return allocations_map

def serialize_payment_payload(payment, allocations_map=None, include_allocations=False):
    payload = payment.to_dict()
    if not include_allocations:
        return payload
    if allocations_map is None:
        payload["allocations"] = []
        return payload
    payload["allocations"] = allocations_map.get(payment.id, [])
    return payload

def invalidate_business_payloads(business_id, namespaces=("summary", "dashboard")):
    cache = get_response_cache()
    if cache is None:
        return
    normalized_business_id = int(business_id)
    for namespace in namespaces:
        cache.invalidate_namespace(
            namespace,
            lambda key, normalized_business_id=normalized_business_id: isinstance(key, tuple) and len(key) > 0 and key[0] == normalized_business_id,
        )

def build_cached_payload(namespace, cache_key, ttl_seconds, builder):
    cache = get_response_cache()
    if cache is None:
        return builder()
    payload, _ = cache.get_or_set(namespace, cache_key, ttl_seconds, builder)
    return payload

def set_cached_payload(namespace, cache_key, ttl_seconds, payload):
    cache = get_response_cache()
    if cache is None:
        return
    cache.set(namespace, cache_key, payload, ttl_seconds)

def _parse_iso_date(value):
    if not value:
        return None
    return datetime.strptime(str(value), "%Y-%m-%d").date()

def resolve_snapshot_builder(namespace, cache_key):
    normalized_namespace = str(namespace or "").strip()
    if normalized_namespace == SUMMARY_CACHE_NAMESPACE:
        if not isinstance(cache_key, (list, tuple)) or len(cache_key) != 3:
            return None
        business_id, start_date_str, end_date_str = cache_key
        start_date = _parse_iso_date(start_date_str)
        end_date = _parse_iso_date(end_date_str)
        if start_date is None or end_date is None:
            return None
        return lambda business_id=int(business_id), start_date=start_date, end_date=end_date: build_summary_payload_from_daily_aggregate(
            business_id,
            start_date,
            end_date,
        )
    if normalized_namespace != DASHBOARD_CACHE_NAMESPACE:
        return None
    if not isinstance(cache_key, (list, tuple)):
        return None
    if len(cache_key) == 3 and cache_key[2] == "legacy":
        business_id, today_str, _ = cache_key
        today = _parse_iso_date(today_str)
        if today is None:
            return None
        return lambda business_id=int(business_id), today=today: build_legacy_dashboard_payload(business_id, today)
    if len(cache_key) == 2:
        business_id, today_str = cache_key
        today = _parse_iso_date(today_str)
        if today is None:
            return None
        thirty_days_ago = today - timedelta(days=30)
        sixty_days_ago = today - timedelta(days=60)
        return lambda business_id=int(business_id), today=today, thirty_days_ago=thirty_days_ago, sixty_days_ago=sixty_days_ago: build_modern_dashboard_payload(
            business_id,
            today,
            thirty_days_ago,
            sixty_days_ago,
        )
    return None

def build_business_payload(namespace, cache_key, ttl_seconds, builder, *, business_id, start_date=None, end_date=None):
    shared_cache = get_shared_response_cache()
    state_snapshot = get_namespace_state_snapshot(
        business_id,
        namespace,
        start_date=start_date,
        end_date=end_date,
    )
    if shared_cache is None:
        return build_cached_payload(namespace, cache_key, ttl_seconds, builder)

    snapshot = shared_cache.get_snapshot(namespace, cache_key)
    if snapshot_is_fresh(snapshot, state_snapshot):
        payload = snapshot.get("payload")
        set_cached_payload(namespace, cache_key, ttl_seconds, payload)
        return payload
    if snapshot_is_servable(snapshot):
        enqueue_namespace_refresh(business_id, namespace)
        payload = snapshot.get("payload")
        set_cached_payload(namespace, cache_key, ttl_seconds, payload)
        return payload

    lock_name = build_snapshot_lock_name(namespace, business_id, cache_key)
    lock_ttl_seconds = float(current_app.config.get("SHARED_RESPONSE_CACHE_LOCK_TTL_SECONDS", 60) or 60)
    wait_timeout_seconds = float(current_app.config.get("SHARED_RESPONSE_CACHE_WAIT_FOR_SNAPSHOT_SECONDS", 5) or 5)
    lock_token = shared_cache.acquire_lock(lock_name, ttl_seconds=lock_ttl_seconds)
    if lock_token is None:
        waited_snapshot = shared_cache.wait_for_snapshot(
            namespace,
            cache_key,
            timeout_seconds=wait_timeout_seconds,
        )
        if snapshot_is_servable(waited_snapshot):
            payload = waited_snapshot.get("payload")
            set_cached_payload(namespace, cache_key, ttl_seconds, payload)
            return payload
        lock_token = shared_cache.acquire_lock(lock_name, ttl_seconds=lock_ttl_seconds)
        if lock_token is None:
            final_snapshot = shared_cache.wait_for_snapshot(
                namespace,
                cache_key,
                timeout_seconds=wait_timeout_seconds,
            )
            if snapshot_is_servable(final_snapshot):
                payload = final_snapshot.get("payload")
                set_cached_payload(namespace, cache_key, ttl_seconds, payload)
                return payload
            return build_cached_payload(namespace, cache_key, ttl_seconds, builder)

    try:
        latest_snapshot = shared_cache.get_snapshot(namespace, cache_key)
        latest_state = get_namespace_state_snapshot(
            business_id,
            namespace,
            start_date=start_date,
            end_date=end_date,
        )
        if snapshot_is_fresh(latest_snapshot, latest_state) or snapshot_is_servable(latest_snapshot):
            payload = latest_snapshot.get("payload")
            set_cached_payload(namespace, cache_key, ttl_seconds, payload)
            return payload
        builder_func = resolve_snapshot_builder(namespace, cache_key)
        if builder_func is None:
            return build_cached_payload(namespace, cache_key, ttl_seconds, builder)
        payload = builder_func()
        dirty_snapshot = get_namespace_dirty_snapshot(
            business_id,
            namespace,
            start_date=start_date,
            end_date=end_date,
        )
        persist_shared_snapshot(
            namespace,
            business_id,
            cache_key,
            payload,
            state_snapshot=get_namespace_state_snapshot(
                business_id,
                namespace,
                start_date=start_date,
                end_date=end_date,
            ),
        )
        if dirty_snapshot is not None:
            mark_namespace_rebuilt(business_id, namespace, dirty_snapshot=dirty_snapshot)
            db.session.commit()
        set_cached_payload(namespace, cache_key, ttl_seconds, payload)
        return payload
    except Exception:
        db.session.rollback()
        raise
    finally:
        if lock_token is not None:
            shared_cache.release_lock(lock_name, lock_token)

def build_legacy_dashboard_payload(business_id, today):
    sales_stats = db.session.query(
        func.coalesce(func.sum(Sale.total), 0.0),
        func.count(Sale.id),
        func.coalesce(
            func.sum(
                case(
                    (
                        and_(Sale.payment_method == "cash", Sale.paid == True),
                        Sale.total,
                    ),
                    else_=0.0,
                )
            ),
            0.0,
        ),
    ).filter(
        Sale.business_id == business_id,
        Sale.sale_date == today,
    ).first()

    expenses_stats = db.session.query(
        func.coalesce(func.sum(Expense.amount), 0.0),
        func.count(Expense.id),
    ).filter(
        Expense.business_id == business_id,
        Expense.expense_date == today,
    ).first()

    ledger_stats = db.session.query(
        func.coalesce(
            func.sum(
                case(
                    (
                        and_(LedgerEntry.entry_date == today, LedgerEntry.entry_type == "payment"),
                        LedgerEntry.amount,
                    ),
                    else_=0.0,
                )
            ),
            0.0,
        ),
        func.coalesce(
            func.sum(
                case(
                    (LedgerEntry.entry_type == "charge", LedgerEntry.amount),
                    else_=0.0,
                )
            ),
            0.0,
        ),
        func.coalesce(
            func.sum(
                case(
                    (LedgerEntry.entry_type == "payment", LedgerEntry.amount),
                    else_=0.0,
                )
            ),
            0.0,
        ),
    ).filter(
        LedgerEntry.business_id == business_id,
    ).first()

    debt_payments_today = db.session.query(func.coalesce(func.sum(DebtPayment.amount), 0.0)).join(Debt).filter(
        Debt.business_id == business_id,
        DebtPayment.payment_date == today,
    ).scalar() or 0.0

    recent_sales = Sale.query.options(
        joinedload(Sale.customer),
        joinedload(Sale.treasury_account),
    ).filter_by(business_id=business_id).order_by(Sale.sale_date.desc(), Sale.created_at.desc()).limit(10).all()

    sales_total_today = float((sales_stats or (0, 0, 0))[0] or 0)
    sales_count_today = int((sales_stats or (0, 0, 0))[1] or 0)
    sales_cash_today = float((sales_stats or (0, 0, 0))[2] or 0)
    expenses_today = float((expenses_stats or (0, 0))[0] or 0)
    expenses_count_today = int((expenses_stats or (0, 0))[1] or 0)
    ledger_payments_today = float((ledger_stats or (0, 0, 0))[0] or 0)
    total_charges = float((ledger_stats or (0, 0, 0))[1] or 0)
    total_payments = float((ledger_stats or (0, 0, 0))[2] or 0)
    cash_in = sales_cash_today + ledger_payments_today
    cash_out = expenses_today + float(debt_payments_today or 0)
    total_receivable = total_charges - total_payments

    return {
        "summary": {
            "sales": {
                "total": sales_total_today,
                "count": sales_count_today
            },
            "expenses": {
                "total": expenses_today,
                "count": expenses_count_today
            },
            "cash_flow": {
                "in": cash_in,
                "out": cash_out,
                "net": cash_in - cash_out
            },
            "accounts_receivable": total_receivable
        },
        "dashboard": {
            "recent_sales": [sale.to_dict() for sale in recent_sales]
        }
    }

def build_modern_dashboard_payload(business_id, today, thirty_days_ago, sixty_days_ago):
    sales_30_days = db.session.query(func.sum(Sale.total)).filter(
        Sale.business_id == business_id,
        Sale.sale_date >= thirty_days_ago
    ).scalar() or 0

    sales_prev_30 = db.session.query(func.sum(Sale.total)).filter(
        Sale.business_id == business_id,
        Sale.sale_date >= sixty_days_ago,
        Sale.sale_date < thirty_days_ago
    ).scalar() or 0

    growth_rate = 0
    if sales_prev_30 > 0:
        growth_rate = (sales_30_days - sales_prev_30) / sales_prev_30
        projected_next_30 = sales_30_days * (1 + growth_rate)
    else:
        projected_next_30 = sales_30_days

    low_stock_products = Product.query.filter(
        Product.business_id == business_id,
        Product.active == True,
        Product.stock <= Product.low_stock_threshold
    ).order_by(Product.stock).limit(10).all()

    low_stock_alerts = [{
        "id": p.id,
        "name": p.name,
        "sku": p.sku,
        "stock": p.stock,
        "threshold": p.low_stock_threshold,
        "unit": p.unit
    } for p in low_stock_products]

    unpaid_sales = Sale.query.options(joinedload(Sale.customer)).filter(
        Sale.business_id == business_id,
        Sale.paid == False,
        Sale.balance > 0
    ).order_by(Sale.sale_date).limit(10).all()

    fiados_alerts = []
    total_fiados = 0
    for sale in unpaid_sales:
        fiados_alerts.append({
            "id": sale.id,
            "customer_name": sale.customer.name if sale.customer else "Sin cliente",
            "date": sale.sale_date.isoformat(),
            "total": sale.total,
            "balance": sale.balance
        })
        total_fiados += sale.balance

    recent_sales = Sale.query.options(joinedload(Sale.customer)).filter_by(business_id=business_id).order_by(Sale.sale_date.desc()).limit(5).all()

    return {
        "projections": {
            "daily_average": round((sales_30_days / 30) if sales_30_days > 0 else 0, 2),
            "last_30_days": round(sales_30_days, 2),
            "previous_30_days": round(sales_prev_30, 2),
            "projected_next_30": round(projected_next_30, 2),
            "growth_rate": round(growth_rate * 100, 1) if sales_prev_30 > 0 else 0
        },
        "inventory_alerts": {
            "count": len(low_stock_alerts),
            "products": low_stock_alerts
        },
        "fiados_alerts": {
            "count": len(fiados_alerts),
            "total": round(total_fiados, 2),
            "sales": fiados_alerts
        },
        "recent_sales": [{
            "id": s.id,
            "date": s.sale_date.isoformat(),
            "total": s.total,
            "customer_name": s.customer.name if s.customer else "Venta rÃ¡pida"
        } for s in recent_sales]
    }

def refresh_summary_materialized_days(business_id, *affected_dates):
    normalized_dates = sorted({item for item in affected_dates if item is not None})
    if not normalized_dates:
        return
    try:
        mark_business_payloads_dirty(int(business_id), normalized_dates)
    except Exception:
        current_app.logger.exception(
            "summary payload dirty mark failed",
            extra={
                "business_id": int(business_id),
                "affected_dates": [item.isoformat() for item in normalized_dates],
            },
        )

def create_app(config_class=None):
    """Crear aplicaciÃ³n Flask"""
    app = Flask(__name__, static_folder="../frontend", static_url_path="")

    # Cargar configuraciÃ³n
    if config_class:
        app.config.from_object(config_class)
    else:
        app.config.from_object(get_config())

    app.config.setdefault("LOCAL_RESPONSE_CACHE_ENABLED", False)
    app.config.setdefault("LOCAL_RESPONSE_CACHE_TTL_SUMMARY_SECONDS", 5)
    app.config.setdefault("LOCAL_RESPONSE_CACHE_TTL_DASHBOARD_SECONDS", 5)
    app.config.setdefault("SUMMARY_CACHE_DIRTY_DEBOUNCE_SECONDS", 2)
    app.config.setdefault("SHARED_RESPONSE_CACHE_ENABLED", True)
    app.config.setdefault("REDIS_URL", "redis://localhost:6379/0")
    if app.config.get("LOCAL_RESPONSE_CACHE_ENABLED"):
        app.extensions["local_response_cache"] = LocalTTLCache()
    if app.config.get("SHARED_RESPONSE_CACHE_ENABLED"):
        app.extensions["shared_response_cache"] = SharedResponseCache(
            app.config.get("REDIS_URL"),
            prefix=app.config.get("SHARED_RESPONSE_CACHE_PREFIX", "cuaderno"),
        )
    app.extensions["summary_refresh_builder_resolver"] = resolve_snapshot_builder

    # Inicializar extensiones
    init_db(app)
    with app.app_context():
        engine = db.engine
        if not getattr(engine, "_cuaderno_request_sql_profiler_installed", False):
            @event.listens_for(engine, "before_cursor_execute")
            def _before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
                if not has_request_context():
                    return
                context._cuaderno_query_started_at = time.perf_counter()

            @event.listens_for(engine, "after_cursor_execute")
            def _after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
                if not has_request_context():
                    return
                started_at = getattr(context, "_cuaderno_query_started_at", None)
                elapsed_ms = 0.0
                if started_at is not None:
                    elapsed_ms = (time.perf_counter() - started_at) * 1000.0
                g._sql_query_count = int(getattr(g, "_sql_query_count", 0) or 0) + 1
                g._sql_query_time_ms = float(getattr(g, "_sql_query_time_ms", 0.0) or 0.0) + elapsed_ms

            engine._cuaderno_request_sql_profiler_installed = True

    @app.before_request
    def initialize_request_sql_profile():
        g._sql_query_count = 0
        g._sql_query_time_ms = 0.0

    @app.before_request
    def enforce_demo_preview_read_only():
        if not request.path.startswith("/api/"):
            return None

        user, _, _, _ = authenticate_request_user()
        if not user:
            return None

        preview_state = get_preview_session_state(user)
        if not preview_state.get("active"):
            return None

        g.preview_session_state = preview_state
        g.authenticated_user = user

        if should_block_preview_write(request.path, request.method):
            return jsonify({
                "error": "Vista previa interactiva: puedes probar la app, pero los cambios no se persisten. Activa un plan para guardar informaciÃ³n real.",
                "code": "preview_no_persist",
            }), 403

        return None

    # Compress(app) - Removed due to build errors
    
    # Implement Gzip compression manually to avoid Flask-Compress/brotli dependency
    @app.after_request
    def compress_response(response):
        # Skip compression for non-200 responses or already compressed content
        if (response.status_code < 200 or response.status_code >= 300 or 'Content-Encoding' in response.headers):
            return response
            
        # Check if client accepts gzip
        accept_encoding = request.headers.get('Accept-Encoding', '')
        if 'gzip' not in accept_encoding.lower():
            return response
            
        # Check content type
        content_type = response.content_type or ''
        if not any(t in content_type for t in ['text/', 'application/json', 'application/javascript', 'application/xml']):
            return response
            
        # Compress
        import gzip
        from io import BytesIO
        
        # If the response is streaming (e.g. file download), allow reading it
        if response.direct_passthrough:
            response.direct_passthrough = False
            
        gzip_buffer = BytesIO()
        gzip_file = gzip.GzipFile(mode='wb', fileobj=gzip_buffer)
        gzip_file.write(response.data)
        gzip_file.close()
        
        compressed_data = gzip_buffer.getvalue()
        
        # Only use compressed version if it's smaller
        if len(compressed_data) < len(response.data):
            response.data = compressed_data
            response.headers['Content-Encoding'] = 'gzip'
            response.headers['Content-Length'] = len(response.data)
            response.headers['Vary'] = 'Accept-Encoding'
            
        return response
    
    # Normalizar rutas de export y backup a absolutas
    import os as _os
    base_dir = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
    export_dir = app.config.get("EXPORT_DIR", "exports")
    backup_dir = app.config.get("BACKUP_DIR", "backups")
    if not _os.path.isabs(export_dir):
        export_dir = _os.path.join(base_dir, export_dir)
    if not _os.path.isabs(backup_dir):
        backup_dir = _os.path.join(base_dir, backup_dir)
    app.config["EXPORT_DIR"] = export_dir
    app.config["BACKUP_DIR"] = backup_dir
    
    # CORS: incluir orÃ­genes para la app mÃ³vil (Capacitor) para evitar "Failed to fetch"
    cors_origins_env = app.config.get("CORS_ORIGINS", [])
    
    # If wildcard is present, just use that and don't append others
    if "*" in cors_origins_env:
        cors_origins = ["*"]
    else:
        cors_origins = list(cors_origins_env)
        for origin in [
            "capacitor://localhost",
            "https://localhost",
            "http://localhost",
            "http://localhost:5000",
            "http://localhost:8000",
            "http://localhost:5500",
            "http://localhost:5501",
            "http://localhost:5502",
            "http://localhost:5503",
            "http://127.0.0.1:5000",
            "http://127.0.0.1:8000",
            "http://127.0.0.1:5500",
            "http://127.0.0.1:5501",
            "http://127.0.0.1:5502",
            "http://127.0.0.1:5503",
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:5175",
            "http://localhost:5176",
            "https://app.encaja.co",
            "http://app.encaja.co",
        ]:
            if origin not in cors_origins:
                cors_origins.append(origin)
                
    CORS(app, resources={r"/api/*": {"origins": cors_origins}}, supports_credentials=True)

    # ========== STATIC FILES & SPA SERVING ==========
    # Determine static folder (Production: injected via Docker/Env, Dev: fallback)
    static_folder = os.getenv("APP_STATIC_DIR")
    
    if not static_folder:
        # Fallback for local development
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        # Prefer new react build if exists, otherwise legacy
        react_dist = os.path.join(base_dir, "frontend-react", "dist")
        if os.path.exists(react_dist):
            static_folder = react_dist
        else:
            static_folder = os.path.join(base_dir, "frontend")

    app.static_folder = static_folder
    app.static_url_path = ""
    
    print(f"[*] Serving static files from: {static_folder}")

    @app.route("/")
    def serve_index():
        return send_from_directory(app.static_folder, "index.html")

    # @app.route("/<path:path>")
    # def serve_static(path):
    #     # 1. API routes should not be handled here (Flask handles them first usually, but safety check)
    #     if path.startswith("api/"):
    #         return jsonify({"error": "Not found"}), 404
    #         
    #     # 2. Try to serve existing static file
    #     full_path = os.path.join(app.static_folder, path)
    #     if os.path.exists(full_path) and os.path.isfile(full_path):
    #         return send_from_directory(app.static_folder, path)
    #         
    #     # 3. SPA Fallback: Serve index.html for non-API routes
    #     return send_from_directory(app.static_folder, "index.html")

    # Error handlers for JSON responses
    @app.errorhandler(400)
    def bad_request(e):
        if request.path.startswith("/api/") or request.accept_mimetypes.accept_json:
            return jsonify({"error": "Bad request"}), 400
        return e

    @app.errorhandler(404)
    def not_found(e):
        if request.path.startswith("/api/") or request.accept_mimetypes.accept_json:
            return jsonify({"error": "Not found"}), 404
        # For non-API routes, let the catch-all handle it or return default
        return e

    @app.errorhandler(500)
    def internal_error(e):
        import traceback
        tb = traceback.format_exc()
        print(f"INTERNAL SERVER ERROR: {e}\n{tb}")  # Log to console/stderr
        if request.path.startswith("/api/") or request.accept_mimetypes.accept_json:
            # Return detailed error for debugging (remove in production if sensitive)
            return jsonify({"error": "Internal server error", "details": str(e), "traceback": tb}), 500
        return e

    # Crear directorios necesarios
    os.makedirs(app.config.get("EXPORT_DIR"), exist_ok=True)
    os.makedirs(app.config.get("BACKUP_DIR"), exist_ok=True)

    # ========== HEALTH CHECK ==========
    @app.route("/api/health")
    def health_check():
        return jsonify(build_liveness_payload(app))

    @app.route("/api/ready")
    def readiness_check():
        payload, status_code = build_readiness_result(app, db)
        return jsonify(payload), status_code

    @app.route("/api/readiness")
    def readiness_alias():
        payload, status_code = build_readiness_result(app, db)
        return jsonify(payload), status_code

    @app.route("/api/ping")
    def ping():
        return jsonify({"pong": True})

    # ========== SETTINGS ==========
    @app.route("/api/settings", methods=["GET"])
    @optional_token
    def get_settings():
        """Obtener configuraciÃ³n global de la aplicaciÃ³n"""
        try:
            import json
            settings = AppSettings.query.all()
            settings_dict = {}
            for s in settings:
                if s.value:
                    try:
                        settings_dict[s.key] = json.loads(s.value)
                    except:
                        settings_dict[s.key] = s.value
                else:
                    settings_dict[s.key] = None
            return jsonify({"settings": settings_dict})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/settings", methods=["POST"])
    @token_required
    def save_settings():
        """Guardar configuraciÃ³n global (requiere auth)"""
        try:
            import json
            data = request.get_json() or {}
            
            # Verificar permisos de admin
            if not g.current_user.is_admin and not (g.current_user.permissions and g.current_user.permissions.get('admin')):
                return jsonify({"error": "No tienes permisos de administrador"}), 403
            
            for key, value in data.items():
                if value is not None and not isinstance(value, (str, int, float, bool)):
                    value = json.dumps(value)
                
                setting = AppSettings.query.filter_by(key=key).first()
                if setting:
                    setting.value = str(value) if value is not None else None
                else:
                    setting = AppSettings(key=key, value=str(value) if value is not None else None)
                    db.session.add(setting)
            
            db.session.commit()
            return jsonify({"message": "ConfiguraciÃ³n guardada"})
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    # ========== BILLING / CHECKOUT ==========
    def get_usd_cop_rate():
        """Obtiene la tasa de cambio USD -> COP actual"""
        try:
            import requests
            # API gratuita, actualiza una vez al dÃ­a
            resp = requests.get("https://api.exchangerate-api.com/v4/latest/USD", timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                rate = data.get("rates", {}).get("COP", 4200)
                return rate
        except Exception as e:
            print(f"Error obteniendo tasa de cambio: {e}")
        
        # Fallback si falla la API
        return 4200

    @app.route("/api/billing/checkout", methods=["POST"])
    @token_required
    def create_checkout():
        data = request.get_json() or {}
        plan = data.get("plan", "pro_monthly")
        payment_method = (data.get("payment_method") or "card").lower()

        valid_plans = CHECKOUT_PLAN_CODES

        if plan not in valid_plans:
            return jsonify({"error": "Plan invÃ¡lido"}), 400

        if payment_method not in {"nequi", "card", "bancolombia", "pse"}:
            return jsonify({"error": "MÃ©todo de pago invÃ¡lido"}), 400

        pricing_catalog = build_plan_catalog()
        plan_key = normalize_access_plan(plan)
        cycle_key = "monthly"
        if plan.endswith("_quarterly"):
            cycle_key = "quarterly"
        elif plan.endswith("_annual"):
            cycle_key = "annual"

        # Obtener tasa de cambio
        usd_cop_rate = get_usd_cop_rate()
        app.logger.info(f"Using USD/COP Rate: {usd_cop_rate}")

        # Helper to convert to COP
        def to_cop(usd_val):
            val = usd_val * usd_cop_rate
            return int(round(val / 100.0) * 100)

        plan_catalog_entry = ((pricing_catalog.get("plans") or {}).get(plan_key or ""))
        cycle_catalog_entry = ((plan_catalog_entry or {}).get("cycles") or {}).get(cycle_key)
        if not plan_catalog_entry or not cycle_catalog_entry:
            return jsonify({"error": "No se pudo resolver el plan seleccionado"}), 400

        amount = to_cop(float(cycle_catalog_entry.get("total_usd") or 0))
        plan_name = f"{plan_catalog_entry.get('display_name', plan_key)} {cycle_catalog_entry.get('label', cycle_key)}"

        app.logger.info(f"Calculated Price (COP) for {plan}: {amount}")

        wompi_pk = (os.getenv("WOMPI_PUBLIC_KEY") or app.config.get("WOMPI_PUBLIC_KEY") or "").strip()
        wompi_sk = (os.getenv("WOMPI_PRIVATE_KEY") or app.config.get("WOMPI_PRIVATE_KEY") or "").strip()
        wompi_env_var = (os.getenv("WOMPI_ENV") or app.config.get("WOMPI_ENV") or "prod").lower().strip()
        if wompi_pk and "pub_test" in wompi_pk:
            wompi_env = "test"
        else:
            wompi_env = wompi_env_var
        wompi_base = "https://production.wompi.co" if wompi_env == "prod" else "https://sandbox.wompi.co"

        if not wompi_pk:
            return jsonify({"error": "No estÃ¡ configurada la llave pÃºblica de Wompi (WOMPI_PUBLIC_KEY)"}), 500
        if not wompi_sk:
            return jsonify({"error": "No estÃ¡ configurada la llave privada de Wompi (WOMPI_PRIVATE_KEY)"}), 500

        try:
            import requests, uuid

            reference = f"sub-{plan}-{uuid.uuid4().hex[:10]}"
            redirect_url = (os.getenv("MP_SUCCESS_URL") or app.config.get("MP_SUCCESS_URL") or "http://localhost:5000")
            amount_cents = int(amount * 100)

            h = {"Authorization": f"Bearer {wompi_sk}", "Content-Type": "application/json"}

            # Wompi API v1 requires amount in cents to be integer
            # Ensure redirect_url is valid
            if not redirect_url or "localhost" in redirect_url:
                # Fallback for dev environment or missing config
                # In production this should be set to the real domain
                redirect_url = "https://app.encaja.co" 
                
            payload = {
                "name": f"EnCaja {plan_name}",
                "description": f"SuscripciÃ³n {plan_name}",
                "single_use": False,
                "collect_shipping": False,
                "currency": "COP",
                "amount_in_cents": amount_cents,
                "redirect_url": redirect_url
            }
            
            # Log critical info for debugging
            app.logger.info(f"Wompi Env: {wompi_env}, Base: {wompi_base}, Amount: {amount_cents}")
            app.logger.info(f"Wompi Request Payload: {payload}")
            
            try:
                # Disable SSL verification temporarily to bypass potential cert issues in container
                # and use a very robust try-except block to ensure JSON is ALWAYS returned
                presp = requests.post(
                    f"{wompi_base}/v1/payment_links", 
                    json=payload, 
                    headers=h, 
                    timeout=30,
                    verify=False  # CRITICAL: Fix for potential SSL/TLS issues in Railway container
                )
                
                # Check if we got a success status code
                if presp.status_code not in [200, 201]:
                    app.logger.error(f"Wompi Error Status: {presp.status_code}. Body: {presp.text}")
                    return jsonify({
                        "error": f"Error Wompi ({presp.status_code}): {presp.text}",
                        "details": f"Status {presp.status_code}: {presp.text}"
                    }), 502

                pdata = presp.json().get("data")
                
                # Try to get URL directly, or construct it from ID
                if pdata and "url" in pdata:
                    init_point = pdata["url"]
                elif pdata and "id" in pdata:
                    # Fallback: Construct URL using ID
                    init_point = f"https://checkout.wompi.co/l/{pdata['id']}"
                else:
                     app.logger.error(f"Invalid Wompi response format: {presp.text}")
                     return jsonify({
                        "error": f"Respuesta inesperada de Wompi (JSON invÃ¡lido): {presp.text}",
                        "details": f"Wompi respondiÃ³: {presp.text}"
                    }), 502
                
            except Exception as e:
                # Catch-all for ANY error during the request (timeout, connection, ssl, parsing)
                # This ensures we NEVER return a raw 502 to the frontend without details
                error_msg = str(e)
                app.logger.error(f"CRITICAL WOMPI ERROR: {error_msg}")
                import traceback
                app.logger.error(traceback.format_exc())
                
                return jsonify({
                    "error": "Error de conexiÃ³n con pasarela de pago",
                    "details": f"Error interno: {error_msg}"
                }), 502

            checkout = {
                "provider": "wompi",
                "payment_method": payment_method,
                "plan": plan,
                "currency": "COP",
                "amount": amount,
                "init_point": init_point,
                "reference": reference,
                "status": "ready"
            }
            return jsonify({"checkout": checkout})
        except Exception as e:
            app.logger.error("Error inesperado creando pago Wompi: %s", str(e))
            import traceback
            app.logger.error(traceback.format_exc())
            return jsonify({
                "error": "OcurriÃ³ un error al iniciar el pago con Wompi.",
                "details": str(e)
            }), 502

    @app.route("/api/billing/confirm-wompi", methods=["POST"])
    @token_required
    def confirm_wompi_transaction():
        data = request.get_json() or {}
        tx_id = data.get("id")
        
        if not tx_id:
            return jsonify({"error": "Transaction ID required"}), 400

        wompi_pk = os.getenv("WOMPI_PUBLIC_KEY") or app.config.get("WOMPI_PUBLIC_KEY")
        wompi_env_var = (os.getenv("WOMPI_ENV") or app.config.get("WOMPI_ENV") or "prod").lower()
        
        if wompi_pk and "pub_test" in wompi_pk:
            wompi_env = "test"
        else:
            wompi_env = wompi_env_var
            
        wompi_base = "https://production.wompi.co" if wompi_env == "prod" else "https://sandbox.wompi.co"
        
        try:
            import requests
            resp = requests.get(f"{wompi_base}/v1/transactions/{tx_id}")
            if resp.status_code == 404:
                return jsonify({"error": "TransacciÃ³n no encontrada"}), 404
            
            resp.raise_for_status()
            tx_data = resp.json().get("data", {})
            
            status = tx_data.get("status")
            reference = tx_data.get("reference", "") or ""
            amount_in_cents = tx_data.get("amount_in_cents") or 0
            currency = tx_data.get("currency") or "COP"
            payment_method_info = tx_data.get("payment_method") or {}
            payment_method = payment_method_info.get("type")
            
            if status == "APPROVED":
                # Check if it's a card update validation (small amount)
                if "update-card" in reference:
                     # Just log it, maybe store the token if we were doing server-side recurring
                     # For now, we just treat it as success
                     return jsonify({
                        "success": True,
                        "message": "MÃ©todo de pago actualizado correctamente",
                        "type": "update_payment"
                     })

                plan = "pro_monthly" # default
                for candidate in CHECKOUT_PLAN_CODES:
                    if candidate in reference:
                        plan = candidate
                        break
                
                duration_days = get_plan_duration_days(plan)
                
                user = getattr(g, "authenticated_user", None) or g.current_user
                now = datetime.utcnow()
                base_start = now
                if user.membership_end and user.membership_end > now:
                    base_start = user.membership_end
                membership_end = base_start + timedelta(days=duration_days)
                
                resolved_plan = normalize_access_plan(plan) or "basic"
                user.plan = resolved_plan
                user.membership_plan = plan
                user.membership_start = now
                user.membership_end = membership_end
                user.membership_auto_renew = True
                
                payment = SubscriptionPayment(
                    user_id=user.id,
                    plan=plan,
                    amount=(amount_in_cents or 0) / 100.0,
                    currency=currency,
                    payment_method=payment_method,
                    payment_date=now,
                    status="completed",
                    transaction_id=tx_id,
                )
                db.session.add(payment)
                db.session.commit()
                
                return jsonify({
                    "success": True, 
                    "message": f"Pago aprobado. Â¡Ahora tienes {str(resolved_plan).upper()} activo!",
                    "plan": user.plan,
                    "account_access": build_account_access_payload(user, resolve_account_access(user)),
                    "membership": {
                        "plan": user.membership_plan,
                        "start": user.membership_start.isoformat() if user.membership_start else None,
                        "end": user.membership_end.isoformat() if user.membership_end else None,
                        "auto_renew": user.membership_auto_renew,
                    }
                })
            elif status == "DECLINED":
                 return jsonify({"error": "El pago fue rechazado"}), 400
            elif status == "VOIDED":
                 return jsonify({"error": "El pago fue anulado"}), 400
            elif status == "ERROR":
                 return jsonify({"error": "Error en la transacciÃ³n"}), 400
            else:
                 return jsonify({"message": f"Estado del pago: {status}", "status": status})
                 
        except Exception as e:
            return jsonify({"error": f"Error verificando pago: {str(e)}"}), 500

    # ========== BILLING ROUTES ==========
    @app.route("/api/billing/status", methods=["GET"])
    @token_required
    def get_billing_status():
        """Estado de la suscripciÃ³n"""
        user = getattr(g, "authenticated_user", None) or g.current_user
        access = build_account_access_payload(user, resolve_account_access(user))
        
        # Get latest payment for method info
        last_payment = SubscriptionPayment.query.filter_by(user_id=user.id).order_by(SubscriptionPayment.created_at.desc()).first()
        
        method_info = {
            "brand": user.wompi_payment_brand or (last_payment.payment_method if last_payment and last_payment.payment_method else "Card"),
            "last4": user.wompi_payment_last4 or "****",
            "expMonth": 0,
            "expYear": 0
        }
        
        # Get invoices
        payments = SubscriptionPayment.query.filter_by(user_id=user.id).order_by(SubscriptionPayment.created_at.desc()).limit(10).all()
        invoices = []
        for p in payments:
            invoices.append({
                "id": str(p.id),
                "date": p.created_at.isoformat(),
                "amount": p.amount,
                "status": "paid" if p.status == "completed" else p.status,
                "pdfUrl": f"/api/billing/invoices/{p.id}/download"
            })
            
        billing_cycle = "monthly"
        if access.get("membership_plan_code"):
            if "quarterly" in access["membership_plan_code"]:
                billing_cycle = "quarterly"
            elif "annual" in access["membership_plan_code"]:
                billing_cycle = "annual"
        
        return jsonify({
            "plan": access.get("plan") or user.plan,
            "status": "active" if access.get("active") else access.get("status") or "inactive",
            "source": access.get("source"),
            "nextBillingDate": access.get("membership_end"),
            "billingCycle": billing_cycle,
            "paymentMethod": method_info,
            "invoices": invoices,
            "account_access": access,
        })

    @app.route("/api/billing/pricing", methods=["GET"])
    def get_billing_pricing():
        """Retorna catÃ¡logo central de planes"""
        return jsonify(build_plan_catalog())

    @app.route("/api/billing/portal", methods=["POST"])
    @token_required
    def billing_portal():
        """Retorna URL para gestionar suscripciÃ³n"""
        # Al no tener portal externo, retornamos la URL interna
        base_url = os.getenv("APP_URL") or "http://localhost:5173"
        return jsonify({ "url": f"{base_url}/settings/membership" })

    @app.route("/api/billing/wompi-acceptance", methods=["GET"]) 
    @token_required
    def wompi_acceptance():
        pk = (os.getenv("WOMPI_PUBLIC_KEY") or app.config.get("WOMPI_PUBLIC_KEY") or "").strip()
        if not pk:
            return jsonify({"error": "Wompi no configurado"}), 500
        try:
            import requests
            base = "https://production.wompi.co" if (os.getenv("WOMPI_ENV") or app.config.get("WOMPI_ENV") or "prod").lower() == "prod" else "https://sandbox.wompi.co"
            r = requests.get(f"{base}/v1/merchants/{pk}", timeout=20)
            r.raise_for_status()
            data = r.json().get("data", {})
            token = data.get("presigned_acceptance", {}).get("acceptance_token")
            if not token:
                return jsonify({"error": "No acceptance token"}), 502
            return jsonify({"acceptance_token": token})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/billing/save-payment-source", methods=["POST"]) 
    @token_required
    def save_payment_source():
        user = getattr(g, "authenticated_user", None) or g.current_user
        payload = request.get_json() or {}
        token = payload.get("token")
        if not token:
            return jsonify({"error": "Token requerido"}), 400
        try:
            import requests
            # Acceptance token
            pk = (os.getenv("WOMPI_PUBLIC_KEY") or app.config.get("WOMPI_PUBLIC_KEY") or "").strip()
            sk = (os.getenv("WOMPI_PRIVATE_KEY") or app.config.get("WOMPI_PRIVATE_KEY") or "").strip()
            envv = (os.getenv("WOMPI_ENV") or app.config.get("WOMPI_ENV") or "prod").lower()
            base = "https://production.wompi.co" if envv == "prod" else "https://sandbox.wompi.co"
            # Fetch acceptance token
            mresp = requests.get(f"{base}/v1/merchants/{pk}", timeout=20)
            mresp.raise_for_status()
            acceptance_token = (mresp.json().get("data") or {}).get("presigned_acceptance", {}).get("acceptance_token")
            headers = {"Authorization": f"Bearer {sk}", "Content-Type": "application/json"}
            body = {"type": "CARD", "token": token, "customer_email": user.email, "acceptance_token": acceptance_token}
            resp = requests.post(f"{base}/v1/payment_sources", json=body, headers=headers, timeout=30, verify=False)
            if resp.status_code not in [200,201]:
                try:
                    j = resp.json()
                except:
                    j = resp.text
                return jsonify({"error": "Error creando payment source", "details": j}), resp.status_code
            data = resp.json().get("data", {})
            user.wompi_payment_source_id = data.get("id")
            pm = data.get("payment_method", {})
            user.wompi_payment_brand = pm.get("type") or pm.get("extra", {}).get("brand")
            user.wompi_payment_last4 = pm.get("extra", {}).get("last_four") or pm.get("last_four")
            db.session.commit()
            return jsonify({"success": True})
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    @app.route("/api/billing/save-nequi-source", methods=["POST"]) 
    @token_required
    def save_nequi_source():
        user = getattr(g, "authenticated_user", None) or g.current_user
        payload = request.get_json() or {}
        phone = payload.get("phone")
        prefix = payload.get("prefix") or "+57"
        if not phone:
            return jsonify({"error": "TelÃ©fono requerido"}), 400
        try:
            import requests
            pk = (os.getenv("WOMPI_PUBLIC_KEY") or app.config.get("WOMPI_PUBLIC_KEY") or "").strip()
            sk = (os.getenv("WOMPI_PRIVATE_KEY") or app.config.get("WOMPI_PRIVATE_KEY") or "").strip()
            envv = (os.getenv("WOMPI_ENV") or app.config.get("WOMPI_ENV") or "prod").lower()
            base = "https://production.wompi.co" if envv == "prod" else "https://sandbox.wompi.co"
            # Step 1: tokenize NEQUI with public key
            t_headers = {"Authorization": f"Bearer {pk}", "Content-Type": "application/json"}
            t_body = {"phone_number": str(phone)}
            tok_resp = requests.post(f"{base}/v1/tokens/nequi", json=t_body, headers=t_headers, timeout=30)
            if tok_resp.status_code not in [200,201]:
                try:
                    j = tok_resp.json()
                except:
                    j = tok_resp.text
                return jsonify({"error": "Error tokenizando Nequi", "details": j}), tok_resp.status_code
            nequi_token = (tok_resp.json().get("data") or {}).get("id")
            status = (tok_resp.json().get("data") or {}).get("status")
            # If not approved yet, ask client to approve on phone and poll
            if status != "APPROVED":
                return jsonify({"pending": True, "token": nequi_token, "message": "Aprueba la suscripciÃ³n en tu app Nequi"}), 202
            # Step 2: create payment source with acceptance token + nequi token
            mresp = requests.get(f"{base}/v1/merchants/{pk}", timeout=20)
            mresp.raise_for_status()
            acceptance_token = (mresp.json().get("data") or {}).get("presigned_acceptance", {}).get("acceptance_token")
            headers = {"Authorization": f"Bearer {sk}", "Content-Type": "application/json"}
            body = {"type": "NEQUI", "token": nequi_token, "customer_email": user.email, "acceptance_token": acceptance_token}
            resp = requests.post(f"{base}/v1/payment_sources", json=body, headers=headers, timeout=30, verify=False)
            if resp.status_code not in [200,201]:
                try:
                    j = resp.json()
                except:
                    j = resp.text
                return jsonify({"error": "Error creando payment source NEQUI", "details": j}), resp.status_code
            data = resp.json().get("data", {})
            user.wompi_payment_source_id = data.get("id")
            user.wompi_payment_brand = "NEQUI"
            user.wompi_payment_last4 = str(phone)[-4:]
            db.session.commit()
            return jsonify({"success": True})
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    @app.route("/api/billing/save-googlepay-source", methods=["POST"]) 
    @token_required
    def save_googlepay_source():
        user = getattr(g, "authenticated_user", None) or g.current_user
        payload = request.get_json() or {}
        token = payload.get("token")
        if not token:
            return jsonify({"error": "Token requerido"}), 400
        try:
            import requests
            pk = (os.getenv("WOMPI_PUBLIC_KEY") or app.config.get("WOMPI_PUBLIC_KEY") or "").strip()
            sk = (os.getenv("WOMPI_PRIVATE_KEY") or app.config.get("WOMPI_PRIVATE_KEY") or "").strip()
            envv = (os.getenv("WOMPI_ENV") or app.config.get("WOMPI_ENV") or "prod").lower()
            base = "https://production.wompi.co" if envv == "prod" else "https://sandbox.wompi.co"
            mresp = requests.get(f"{base}/v1/merchants/{pk}", timeout=20)
            mresp.raise_for_status()
            acceptance_token = (mresp.json().get("data") or {}).get("presigned_acceptance", {}).get("acceptance_token")
            headers = {"Authorization": f"Bearer {sk}", "Content-Type": "application/json"}
            body = {"type": "GOOGLE_PAY", "token": token, "customer_email": user.email, "acceptance_token": acceptance_token}
            resp = requests.post(f"{base}/v1/payment_sources", json=body, headers=headers, timeout=30, verify=False)
            if resp.status_code not in [200,201]:
                try:
                    j = resp.json()
                except:
                    j = resp.text
                return jsonify({"error": "Error creando payment source GOOGLE_PAY", "details": j}), resp.status_code
            data = resp.json().get("data", {})
            user.wompi_payment_source_id = data.get("id")
            user.wompi_payment_brand = "GOOGLE_PAY"
            user.wompi_payment_last4 = "****"
            db.session.commit()
            return jsonify({"success": True})
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500

    @app.route("/api/billing/check-nequi-token", methods=["POST"]) 
    @token_required
    def check_nequi_token():
        user = getattr(g, "authenticated_user", None) or g.current_user
        payload = request.get_json() or {}
        nequi_token = payload.get("token")
        phone = payload.get("phone")
        if not nequi_token:
            return jsonify({"error": "Token requerido"}), 400
        try:
            import requests
            pk = (os.getenv("WOMPI_PUBLIC_KEY") or app.config.get("WOMPI_PUBLIC_KEY") or "").strip()
            sk = (os.getenv("WOMPI_PRIVATE_KEY") or app.config.get("WOMPI_PRIVATE_KEY") or "").strip()
            envv = (os.getenv("WOMPI_ENV") or app.config.get("WOMPI_ENV") or "prod").lower()
            base = "https://production.wompi.co" if envv == "prod" else "https://sandbox.wompi.co"
            # Query token status
            t_headers = {"Authorization": f"Bearer {pk}"}
            q = requests.get(f"{base}/v1/tokens/nequi/{nequi_token}", headers=t_headers, timeout=20)
            q.raise_for_status()
            status = (q.json().get("data") or {}).get("status")
            if status != "APPROVED":
                return jsonify({"pending": True, "status": status}), 202
            # Create payment source now
            mresp = requests.get(f"{base}/v1/merchants/{pk}", timeout=20)
            mresp.raise_for_status()
            acceptance_token = (mresp.json().get("data") or {}).get("presigned_acceptance", {}).get("acceptance_token")
            headers = {"Authorization": f"Bearer {sk}", "Content-Type": "application/json"}
            body = {"type": "NEQUI", "token": nequi_token, "customer_email": user.email, "acceptance_token": acceptance_token}
            resp = requests.post(f"{base}/v1/payment_sources", json=body, headers=headers, timeout=30, verify=False)
            if resp.status_code not in [200,201]:
                try:
                    j = resp.json()
                except:
                    j = resp.text
                return jsonify({"error": "Error creando payment source NEQUI", "details": j}), resp.status_code
            data = resp.json().get("data", {})
            user.wompi_payment_source_id = data.get("id")
            user.wompi_payment_brand = "NEQUI"
            user.wompi_payment_last4 = (str(phone)[-4:] if phone else "****")
            db.session.commit()
            return jsonify({"success": True})
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500
    @app.route("/api/billing/update-payment-method", methods=["POST"])
    @token_required
    def update_payment_method():
        """Genera link para actualizar mÃ©todo de pago (Cobro de validaciÃ³n)"""
        user = getattr(g, "authenticated_user", None) or g.current_user
        try:
            import requests, uuid, traceback
            # Config Wompi
            wompi_pk = (os.getenv("WOMPI_PUBLIC_KEY") or app.config.get("WOMPI_PUBLIC_KEY") or "").strip()
            wompi_sk = (os.getenv("WOMPI_PRIVATE_KEY") or app.config.get("WOMPI_PRIVATE_KEY") or "").strip()
            wompi_env = "test" if wompi_pk and "pub_test" in wompi_pk else "prod"
            wompi_base = "https://production.wompi.co" if wompi_env == "prod" else "https://sandbox.wompi.co"
            
            if not wompi_pk or not wompi_sk:
                 return jsonify({"error": "Wompi no configurado"}), 500

            reference = f"update-card-{user.id}-{uuid.uuid4().hex[:10]}"
            redirect_url = (os.getenv("MP_SUCCESS_URL") or app.config.get("MP_SUCCESS_URL") or "http://localhost:5000")
            if not redirect_url or "localhost" in redirect_url:
                redirect_url = "https://app.encaja.co"
            
            # Payload para validaciÃ³n (monto pequeÃ±o). Algunos comercios requieren mÃ­nimo >= $2.000 COP.
            payload = {
                "name": "ValidaciÃ³n Tarjeta",
                "description": "ActualizaciÃ³n de mÃ©todo de pago",
                "single_use": False,
                "collect_shipping": False,
                "currency": "COP",
                "amount_in_cents": 200000, # $2.000,00 COP
                "redirect_url": redirect_url,
                "reference": reference
            }
            
            h = {"Authorization": f"Bearer {wompi_sk}", "Content-Type": "application/json"}
            try:
                resp = requests.post(
                    f"{wompi_base}/v1/payment_links",
                    json=payload,
                    headers=h,
                    timeout=30,
                    verify=False  # Alinear con create_checkout para evitar fallas de SSL en contenedores
                )
                if resp.status_code not in [200, 201]:
                    try:
                        j = resp.json()
                    except Exception:
                        j = None
                    app.logger.error(f"Wompi Update Error Status: {resp.status_code}. Body: {resp.text}")
                    return jsonify({
                        "error": f"Error Wompi ({resp.status_code})",
                        "details": j or resp.text
                    }), resp.status_code
                data = resp.json().get("data")
                if data and "url" in data:
                    url = data["url"]
                elif data and "id" in data:
                    url = f"https://checkout.wompi.co/l/{data['id']}"
                else:
                    app.logger.error(f"Invalid Wompi response format (update): {resp.text}")
                    return jsonify({
                        "error": "Respuesta inesperada de Wompi",
                        "details": resp.text
                    }), 502
            except Exception as e:
                app.logger.error(f"CRITICAL WOMPI UPDATE ERROR: {str(e)}")
                app.logger.error(traceback.format_exc())
                return jsonify({
                    "error": "Error de conexiÃ³n con pasarela de pago",
                    "details": str(e)
                }), 502
            
            return jsonify({ "url": url })
        except Exception as e:
            app.logger.error(f"Error creating update payment link: {e}")
            return jsonify({"error": "No se pudo generar el link de actualizaciÃ³n", "details": str(e)}), 500

    @app.route("/api/billing/change-cycle", methods=["POST"])
    @token_required
    def change_billing_cycle():
        """Cambia el ciclo de facturaciÃ³n (Genera nuevo pago)"""
        user = getattr(g, "authenticated_user", None) or g.current_user
        data = request.get_json() or {}
        cycle = data.get("cycle")
        
        if cycle not in ["monthly", "quarterly", "annual"]:
            return jsonify({"error": "Ciclo invÃ¡lido"}), 400
            
        # Determine current plan base (pro or business)
        current_plan_base = "pro"
        if user.plan == "business" or (user.membership_plan and "business" in user.membership_plan):
            current_plan_base = "business"
            
        # Calculate price dynamically
        usd_cop_rate = get_usd_cop_rate()
        def to_cop(usd_val):
            val = usd_val * usd_cop_rate
            return int(round(val / 100.0) * 100)
            
        amount = 0
        plan_name = ""
        plan_code = ""
        
        if current_plan_base == "pro":
            monthly_usd = app.config.get("PRO_MONTHLY_PRICE_USD", 5.99)
            if cycle == "monthly":
                amount = to_cop(monthly_usd)
                plan_name = "Pro Mensual"
                plan_code = "pro_monthly"
            elif cycle == "quarterly":
                discount = app.config.get("PRO_QUARTERLY_DISCOUNT", 0.10)
                amount = to_cop(monthly_usd * 3 * (1 - discount))
                plan_name = "Pro Trimestral"
                plan_code = "pro_quarterly"
            else: # annual
                discount = app.config.get("PRO_ANNUAL_DISCOUNT", 0.30)
                amount = to_cop(monthly_usd * 12 * (1 - discount))
                plan_name = "Pro Anual"
                plan_code = "pro_annual"
        else: # business
            monthly_usd = 12.99
            if cycle == "monthly":
                amount = to_cop(monthly_usd)
                plan_name = "Business Mensual"
                plan_code = "business_monthly"
            elif cycle == "quarterly":
                amount = to_cop(monthly_usd * 3 * (1 - 0.10))
                plan_name = "Business Trimestral"
                plan_code = "business_quarterly"
            else: # annual
                amount = to_cop(monthly_usd * 12 * (1 - 0.15))
                plan_name = "Business Anual"
                plan_code = "business_annual"
        
        try:
            import requests, uuid
            
            # Config Wompi
            wompi_pk = (os.getenv("WOMPI_PUBLIC_KEY") or app.config.get("WOMPI_PUBLIC_KEY") or "").strip()
            wompi_sk = (os.getenv("WOMPI_PRIVATE_KEY") or app.config.get("WOMPI_PRIVATE_KEY") or "").strip()
            wompi_env = "test" if wompi_pk and "pub_test" in wompi_pk else "prod"
            wompi_base = "https://production.wompi.co" if wompi_env == "prod" else "https://sandbox.wompi.co"
            
            reference = f"sub-{plan_code}-{uuid.uuid4().hex[:10]}"
            redirect_url = (os.getenv("MP_SUCCESS_URL") or app.config.get("MP_SUCCESS_URL") or "http://localhost:5000")
            
            payload = {
                "name": f"EnCaja {plan_name}",
                "description": f"Cambio de plan a {plan_name}",
                "single_use": False,
                "collect_shipping": False,
                "currency": "COP",
                "amount_in_cents": int(amount * 100),
                "redirect_url": redirect_url
            }
            
            h = {"Authorization": f"Bearer {wompi_sk}", "Content-Type": "application/json"}
            resp = requests.post(f"{wompi_base}/v1/payment_links", json=payload, headers=h, timeout=30)
            resp.raise_for_status()
            
            data = resp.json().get("data", {})
            url = data.get("url") or f"https://checkout.wompi.co/l/{data.get('id')}"
            
            return jsonify({ "url": url })
            
        except Exception as e:
            app.logger.error(f"Error creating change cycle link: {e}")
            return jsonify({"error": "No se pudo generar el link de pago"}), 500

    @app.route("/api/billing/invoices", methods=["GET"])
    @token_required
    def get_invoices():
        """Lista facturas"""
        user = getattr(g, "authenticated_user", None) or g.current_user
        payments = SubscriptionPayment.query.filter_by(user_id=user.id).order_by(SubscriptionPayment.created_at.desc()).limit(20).all()
        return jsonify([p.to_dict() for p in payments])

    @app.route("/api/billing/invoices/<int:invoice_id>/download", methods=["GET"])
    @token_required
    def download_invoice(invoice_id):
        """Descarga factura PDF"""
        user = getattr(g, "authenticated_user", None) or g.current_user
        payment = SubscriptionPayment.query.filter_by(id=invoice_id, user_id=user.id).first()
        if not payment:
            return jsonify({"error": "Factura no encontrada"}), 404
            
        # Generar PDF simple
        try:
            from xhtml2pdf import pisa
            from io import BytesIO
            
            template = f"""
            <html>
            <head>
                <style>
                    body {{ font-family: Helvetica, sans-serif; padding: 20px; }}
                    h1 {{ color: #333; }}
                    .details {{ margin-top: 20px; }}
                    .row {{ margin-bottom: 10px; }}
                    .label {{ font-weight: bold; }}
                </style>
            </head>
            <body>
                <h1>Factura de SuscripciÃ³n</h1>
                <p>EnCaja App</p>
                <div class="details">
                    <div class="row"><span class="label">Fecha:</span> {payment.created_at.strftime('%Y-%m-%d')}</div>
                    <div class="row"><span class="label">Referencia:</span> {payment.transaction_id}</div>
                    <div class="row"><span class="label">Plan:</span> {payment.plan}</div>
                    <div class="row"><span class="label">Monto:</span> ${payment.amount:,.2f} {payment.currency}</div>
                    <div class="row"><span class="label">Estado:</span> {payment.status}</div>
                    <div class="row"><span class="label">Cliente:</span> {user.name} ({user.email})</div>
                </div>
            </body>
            </html>
            """
            
            pdf_data = BytesIO()
            pisa.CreatePDF(BytesIO(template.encode('utf-8')), pdf_data)
            pdf_data.seek(0)
            
            return send_file(
                pdf_data,
                mimetype='application/pdf',
                as_attachment=True,
                download_name=f'invoice_{invoice_id}.pdf'
            )
        except Exception as e:
             app.logger.error(f"PDF Error: {e}")
             return jsonify({"error": "Error generando PDF"}), 500

    @app.route("/api/billing/cancel", methods=["POST"])
    @token_required
    def cancel_subscription():
        """Cancela renovaciÃ³n"""
        user = getattr(g, "authenticated_user", None) or g.current_user
        user.membership_auto_renew = False
        db.session.commit()
        return jsonify({"success": True, "message": "SuscripciÃ³n cancelada exitosamente"})


    @app.route("/api/upgrade-to-pro", methods=["POST"])
    @token_required
    def upgrade_to_pro():
        user = getattr(g, "authenticated_user", None) or g.current_user
        user.plan = "pro"
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Â¡Ahora tienes Plan PRO!",
            "plan": user.plan
        })

    # ========== AUTH ROUTES ==========
    @app.route("/api/auth/register", methods=["POST"])
    def register():
        data = request.get_json() or {}
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        name = data.get("name", "").strip()
        activation_required = is_account_code_activation_required()
        
        print(f"[DEBUG] Register - name: {name}, email: {email}")

        if not email or not password or not name:
            return jsonify({"error": "Email, password y nombre son requeridos"}), 400

        import re
        if len(password) < 8:
            return jsonify({"error": "La contraseÃ±a debe tener al menos 8 caracteres"}), 400
        if not re.search(r"\d", password):
            return jsonify({"error": "La contraseÃ±a debe contener al menos un nÃºmero"}), 400
        if not re.search(r"[\W_]", password):
            return jsonify({"error": "La contraseÃ±a debe contener al menos un carÃ¡cter especial"}), 400

        user, error = AuthManager.register(email, password, name)
        if error:
            return jsonify({"error": error}), 400

        # In tests, auto-verify and return tokens to keep legacy flows
        if app.config.get("TESTING"):
            user.email_verified = True
            user.email_verification_code = None
            user.email_verification_expires = None
            db.session.commit()
            access_token = create_token(user.id, "access")
            refresh_token = create_token(user.id, "refresh")
            return jsonify({
                "user": user.to_dict(),
                "access_token": access_token,
                "refresh_token": refresh_token,
                "verification_required": False,
                "activation_required": False,
                "account_access": build_account_access_payload(user, resolve_account_access(user)),
            }), 201

        # Return verification code in response for development (when SMTP is not configured)
        # In production, the code is sent via email
        response_data = {
            "user": user.to_dict(),
            "verification_required": activation_required,
            "activation_required": activation_required,
            "message": "Revisa tu correo para el cÃ³digo de verificaciÃ³n",
            "account_access": build_account_access_payload(user, resolve_account_access(user)),
        }
        
        if activation_required and user.email_verification_code:
            emit_verification_code_debug(user.email, user.email_verification_code)

        # Include verification code for development/debugging purposes.
        # Also enable this automatically on localhost so the frontend can show it
        # even when the backend is not being watched in a visible terminal.
        if activation_required and user.email_verification_code and should_expose_verification_code_in_dev():
            response_data["verification_code"] = user.email_verification_code
        
        return jsonify(response_data), 201

    @app.route("/api/auth/verify-email", methods=["POST"])
    def verify_email():
        data = request.get_json() or {}
        email = data.get("email", "").strip().lower()
        code = data.get("code", "").strip()

        if not email or not code:
            return jsonify({"error": "Email y cÃ³digo son requeridos"}), 400

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404

        if user.email_verified:
            return jsonify({"message": "Email ya verificado"})

        if not user.email_verification_code or not user.email_verification_expires:
            return jsonify({"error": "CÃ³digo de verificaciÃ³n no disponible"}), 400

        if user.email_verification_expires < datetime.utcnow():
            return jsonify({"error": "CÃ³digo de verificaciÃ³n expirado"}), 400

        if user.email_verification_code != code:
            return jsonify({"error": "CÃ³digo de verificaciÃ³n invÃ¡lido"}), 400

        user.email_verified = True
        user.email_verification_code = None
        user.email_verification_expires = None
        db.session.commit()
        
        # Generar tokens automÃ¡ticamente tras verificar
        access_token = create_token(user.id, "access")
        refresh_token = create_token(user.id, "refresh")

        return jsonify({
            "message": "Email verificado correctamente",
            "user": user.to_dict(),
            "access_token": access_token,
            "refresh_token": refresh_token,
            "activation_required": is_account_code_activation_required(),
            "account_access": build_account_access_payload(user, resolve_account_access(user)),
        })

    @app.route("/api/auth/login", methods=["POST"])
    def login():
        try:
            profile_started_at = time.perf_counter()
            profile = {"endpoint": "auth.login"}
            # Force JSON parsing or fail gracefully
            if not request.is_json:
                # Try to parse anyway if content-type is missing but body exists
                try:
                    data = request.get_json(force=True)
                except:
                    # Last resort: try form data
                    data = request.form.to_dict()
                    if not data:
                        return jsonify({"error": "Content-Type must be application/json"}), 400
            else:
                data = request.get_json()
                
            data = data or {}
            email = data.get("email", "").strip().lower()
            password = data.get("password", "")
            is_team_login = data.get("is_team_login", False)
            business_name = data.get("business_name")

            if not email or not password:
                return jsonify({"error": "Email y password son requeridos"}), 400

            user, access_token, refresh_token, error = AuthManager.login(
                email, password, is_team_login=is_team_login, business_name=business_name, profile=profile
            )
            
            if error:
                response = jsonify({"error": error})
                return _attach_profile_headers(response, _finalize_profile(profile, profile_started_at)), 401

            # Resolucion de contextos accesibles (Single Identity Phase 1)
            try:
                from backend.membership import get_user_accessible_businesses, resolve_active_context
                accessible_contexts = _profile_sql_stage(
                    profile,
                    "resolve_accessible_contexts",
                    lambda: get_user_accessible_businesses(user),
                )
                
                # Phase 2: Auto-select if only one context
                active_context = None
                if len(accessible_contexts) == 1:
                    ctx = accessible_contexts[0]
                    # Simulate selection
                    active_context, target_user = _profile_sql_stage(
                        profile,
                        "resolve_active_context",
                        lambda: resolve_active_context(user, ctx["business_id"], accessible_contexts=accessible_contexts),
                    )
                    if target_user and target_user.id != user.id:
                        # Identity switch happened (legacy), update token
                        user = target_user
                        token_started_at = time.perf_counter()
                        access_token = create_token(user.id, "access")
                        refresh_token = create_token(user.id, "refresh")
                        _record_profile_stage(profile, "token_session_creation", token_started_at, extra={"identity_switched": True})

            except Exception as e:
                app.logger.error(f"Error resolving contexts: {e}")
                accessible_contexts = []
                active_context = None

            response = _profile_sql_stage(
                profile,
                "serialization_response",
                lambda: jsonify({
                    "user": user.to_dict(),
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "activation_required": is_account_code_activation_required(),
                    "account_access": build_account_access_payload(user, resolve_account_access(user)),
                    "accessible_contexts": accessible_contexts,
                    "active_context": active_context
                }),
            )
            return _attach_profile_headers(response, _finalize_profile(profile, profile_started_at))
        except Exception as e:
            app.logger.error(f"Login error: {str(e)}")
            import traceback
            app.logger.error(traceback.format_exc())
            # Ensure 500 errors are returned as JSON
            return jsonify({"error": "Error interno del servidor", "details": str(e)}), 500

    @app.route("/api/auth/select-context", methods=["POST"])
    @token_required
    def select_context():
        """
        Seleccionar contexto activo.
        Input: { "business_id": 123 }
        Output: { "active_context": {...}, "access_token": "...", "user": {...} }
        """
        try:
            profile_started_at = time.perf_counter()
            profile = {"endpoint": "auth.select_context"}
            data = request.get_json() or {}
            business_id = data.get("business_id")
            
            if not business_id:
                return jsonify({"error": "business_id es requerido"}), 400
                
            from backend.membership import resolve_active_context
            
            # g.current_user es el usuario actual (Personal o ya Legacy)
            # Intentamos resolver desde la identidad actual
            active_context, target_user = _profile_sql_stage(
                profile,
                "roles_permissions_lookup",
                lambda: resolve_active_context(g.current_user, business_id),
            )
            
            if not active_context:
                return jsonify({"error": "No tienes acceso a este negocio"}), 403
                
            response = {
                "active_context": active_context,
                "user": target_user.to_dict()
            }
            
            # Si hubo cambio de identidad (Legacy), generar nuevo token
            if target_user.id != g.current_user.id:
                token_started_at = time.perf_counter()
                new_access_token = create_token(target_user.id, "access")
                new_refresh_token = create_token(target_user.id, "refresh")
                response["access_token"] = new_access_token
                response["refresh_token"] = new_refresh_token
                _record_profile_stage(profile, "token_session_creation", token_started_at, extra={"identity_switched": True})
            
            flask_response = jsonify(response)
            return _attach_profile_headers(flask_response, _finalize_profile(profile, profile_started_at))
            
        except Exception as e:
            app.logger.error(f"Select Context Error: {e}")
            return jsonify({"error": "Error al seleccionar contexto"}), 500

    @app.route("/api/auth/bootstrap", methods=["GET"])
    @token_required
    def auth_bootstrap():
        try:
            profile_started_at = time.perf_counter()
            profile = {"endpoint": "auth.bootstrap"}
            preferred_business_id = request.args.get("business_id") or request.args.get("preferred_business_id")
            payload = _get_business_bootstrap_payload(g.current_user, preferred_business_id=preferred_business_id, profile=profile)
            access_user = getattr(g, "authenticated_user", None) or g.current_user
            account_access = build_account_access_payload(access_user, resolve_account_access(access_user))
            response = jsonify({
                "businesses": payload.get("businesses", []),
                "active_business": payload.get("active_business"),
                "account_access": account_access,
            })
            return _attach_profile_headers(response, _finalize_profile(profile, profile_started_at))
        except Exception as e:
            app.logger.error(f"Auth Bootstrap Error: {e}")
            return jsonify({"error": "Error al construir bootstrap"}), 500

    @app.route("/api/auth/refresh", methods=["POST"])
    def refresh():
        data = request.get_json() or {}
        refresh_token = data.get("refresh_token")

        if not refresh_token:
            return jsonify({"error": "Refresh token requerido"}), 400

        new_token, error = AuthManager.refresh(refresh_token)
        if error:
            return jsonify({"error": error}), 401

        return jsonify({"access_token": new_token})

    @app.route("/api/auth/logout", methods=["POST"])
    @token_required
    def logout():
        user = getattr(g, "authenticated_user", None) or g.current_user
        bump_user_session_version(user.id)
        return jsonify({"success": True, "message": "SesiÃ³n cerrada correctamente"})

    @app.route("/api/auth/change-password", methods=["POST"])
    @token_required
    def change_password():
        data = request.get_json() or {}
        current_password = data.get("current_password", "")
        new_password = data.get("new_password", "")

        if not current_password or not new_password:
            return jsonify({"error": "ContraseÃ±a actual y nueva son requeridas"}), 400

        if len(new_password) < 6:
            return jsonify({"error": "La nueva contraseÃ±a debe tener al menos 6 caracteres"}), 400

        user = getattr(g, "authenticated_user", None) or g.current_user
        if not user.check_password(current_password):
            return jsonify({"error": "La contraseÃ±a actual no es correcta"}), 400

        user.set_password(new_password)
        db.session.commit()
        bump_user_session_version(user.id)

        return jsonify({"message": "ContraseÃ±a actualizada"})

    @app.route("/api/auth/forgot-password", methods=["POST"])
    def forgot_password():
        data = request.get_json() or {}
        email = data.get("email", "").strip().lower()

        if not email:
            return jsonify({"error": "Email requerido"}), 400

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404

        code = AuthManager.generate_email_otp()
        user.reset_password_code = code
        user.reset_password_expires = datetime.utcnow() + timedelta(minutes=10)
        db.session.commit()

        AuthManager.send_password_reset_email(user.email, user.name, code)

        return jsonify({"message": "Te enviamos un cÃ³digo para restablecer tu contraseÃ±a"})

    @app.route("/api/auth/reset-password", methods=["POST"])
    def reset_password():
        data = request.get_json() or {}
        email = data.get("email", "").strip().lower()
        code = data.get("code", "").strip()
        new_password = data.get("new_password", "")

        if not email or not code or not new_password:
            return jsonify({"error": "Email, cÃ³digo y nueva contraseÃ±a son requeridos"}), 400

        if len(new_password) < 6:
            return jsonify({"error": "La nueva contraseÃ±a debe tener al menos 6 caracteres"}), 400

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404

        if not user.reset_password_code or not user.reset_password_expires:
            return jsonify({"error": "CÃ³digo de recuperaciÃ³n no disponible"}), 400

        if user.reset_password_expires < datetime.utcnow():
            return jsonify({"error": "CÃ³digo de recuperaciÃ³n expirado"}), 400

        if user.reset_password_code != code:
            return jsonify({"error": "CÃ³digo de recuperaciÃ³n invÃ¡lido"}), 400

        user.set_password(new_password)
        user.reset_password_code = None
        user.reset_password_expires = None
        db.session.commit()
        bump_user_session_version(user.id)

        return jsonify({"message": "ContraseÃ±a restablecida correctamente"})

    @app.route("/api/auth/me", methods=["GET"])
    @token_required
    def get_current_user():
        user = getattr(g, "authenticated_user", None) or g.current_user
        try:
            from backend.membership import ensure_membership_active
            ensure_membership_active(user)
        except Exception:
            pass
        user_data = user.to_dict()
        # Add permissions
        from backend.auth import has_permission
        user_data['permissions'] = {
            'admin': has_permission(user, 'admin.*'),
            'admin_users': has_permission(user, 'admin.users'),
            'admin_roles': has_permission(user, 'admin.roles'),
            'admin_permissions': has_permission(user, 'admin.permissions'),
            'products': has_permission(user, 'products.*'),
            'products_read': has_permission(user, 'products.read'),
            'products_create': has_permission(user, 'products.create'),
            'clients': has_permission(user, 'clients.*'),
            'clients_read': has_permission(user, 'clients.read'),
            'sales': has_permission(user, 'sales.*'),
            'sales_read': has_permission(user, 'sales.read'),
            'expenses': has_permission(user, 'expenses.*'),
            'expenses_read': has_permission(user, 'expenses.read'),
            'payments': has_permission(user, 'payments.*'),
            'payments_read': has_permission(user, 'payments.read'),
        }
        return jsonify({"user": user_data, "account_access": build_account_access_payload(user, resolve_account_access(user))})

    @app.route("/api/account/access", methods=["GET"])
    @token_required
    def get_account_access():
        user = getattr(g, "authenticated_user", None) or g.current_user
        return jsonify({
            "account_access": build_account_access_payload(user, resolve_account_access(user)),
            "pricing": build_plan_catalog(),
        })

    @app.route("/api/account/preview/start", methods=["POST"])
    @token_required
    def start_account_preview():
        user = getattr(g, "authenticated_user", None) or g.current_user
        access = resolve_account_access(user)
        access_payload = build_account_access_payload(user, access)

        if not access_payload.get("demo_preview_available"):
            return jsonify({
                "error": "La vista previa no estÃƒÂ¡ disponible para esta cuenta.",
                "code": "preview_not_available",
                "account_access": access_payload,
            }), 403

        if access.get("active") or access.get("existing_access"):
            return jsonify({
                "error": "Tu cuenta ya tiene acceso real; no necesita vista previa.",
                "code": "preview_not_available",
                "account_access": access_payload,
            }), 400

        ensure_demo_preview_business()
        start_preview_session(user)
        return jsonify({
            "ok": True,
            "account_access": build_account_access_payload(user, access),
            "pricing": build_plan_catalog(),
        })

    @app.route("/api/account/preview/stop", methods=["POST"])
    @token_required
    def stop_account_preview():
        user = getattr(g, "authenticated_user", None) or g.current_user
        stop_preview_session(user)
        return jsonify({
            "ok": True,
            "account_access": build_account_access_payload(user, resolve_account_access(user)),
            "pricing": build_plan_catalog(),
        })

    @app.route("/api/membership/cancel", methods=["POST"])
    @token_required
    def cancel_membership():
        user = getattr(g, "authenticated_user", None) or g.current_user
        if not getattr(user, "membership_plan", None) or not getattr(user, "membership_end", None):
            return jsonify({"error": "No tienes una membresÃ­a activa"}), 400
        user.membership_auto_renew = False
        db.session.commit()
        return jsonify({
            "success": True,
            "message": "La renovaciÃ³n automÃ¡tica de tu membresÃ­a ha sido cancelada.",
            "membership_auto_renew": user.membership_auto_renew
        })

    # ========== BUSINESS ROUTES ==========
    @app.route("/api/businesses", methods=["GET"])
    @token_required
    def get_businesses():
        try:
            profile_started_at = time.perf_counter()
            profile = {"endpoint": "businesses.list"}
            payload = _get_business_bootstrap_payload(g.current_user, preferred_business_id=request.args.get("preferred_business_id"), profile=profile)
            response = jsonify({"businesses": payload.get("businesses", [])})
            return _attach_profile_headers(response, _finalize_profile(profile, profile_started_at))
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @app.route("/api/businesses", methods=["POST"])
    @token_required
    def create_business():
        data = request.get_json() or {}
        name = data.get("name", "").strip()
        
        if not name:
            return jsonify({"error": "Nombre del negocio es requerido"}), 400

        account_access_allowed, account_access = ensure_account_access_allowed(g.current_user)
        if not account_access_allowed:
            return jsonify({
                "error": "Necesitas un plan activo para configurar tu primer negocio.",
                "account_access": account_access,
            }), 403

        # Verificar lÃ­mite del plan free
        if g.current_user.plan == "free":
            count = Business.query.filter_by(user_id=g.current_user.id).count()
            if count >= 1:
                return jsonify({
                    "error": "Plan gratuito limitado a 1 negocio",
                    "upgrade_url": "/upgrade"
                }), 403

        default_templates = {
            "collection_message": (
                "Hola {cliente} ðŸ˜Š\n"
                "Te escribo de *{negocio}*.\n\n"
                "SegÃºn mi registro, tienes un saldo pendiente de *${deuda}*.\n"
                "Â¿Me confirmas por favor cuÃ¡ndo puedes realizar el pago?\n\n"
                "Gracias ðŸ™Œ"
            ),
            "sale_message": (
                "Hola {cliente}, gracias por tu compra en *{negocio}*.\n\n"
                "*Detalle:*\n{items}\n"
                "*TOTAL: ${total}*\n"
                "Pagado: ${pagado}\n"
                "Saldo: ${saldo}\n\n"
                "Â¡Esperamos verte pronto! ðŸ‘‹"
            )
        }
        business = Business(
            user_id=g.current_user.id,
            name=name,
            currency=data.get("currency", "COP"),
            timezone=data.get("timezone", "America/Bogota"),
            settings=normalize_business_settings(data.get("settings", {})),
            whatsapp_templates=default_templates
        )

        # Apply preset if specified during creation
        business_type = data.get("business_type")
        if business_type:
            try:
                # Apply preset to business settings
                preset_settings = apply_preset_to_business_settings(
                    business.settings or {}, 
                    business_type,
                    apply_modules=True,
                    apply_navigation=True,
                    apply_onboarding=True
                )
                business.settings = normalize_business_settings(preset_settings)
            except Exception as e:
                print(f"Warning: Failed to apply business preset '{business_type}': {e}")

        db.session.add(business)
        db.session.commit()

        return jsonify({"business": attach_modules_to_business_dict(business)}), 201

    @app.route("/api/businesses/presets", methods=["GET"])
    @token_required
    def get_business_presets():
        """Get all available business presets for UI"""
        try:
            presets = get_all_presets_for_ui()
            return jsonify({"presets": presets})
        except Exception as e:
            return jsonify({"error": f"Failed to get presets: {str(e)}"}), 500

    @app.route("/api/businesses/<int:business_id>/team", methods=["GET"])
    @token_required
    @permission_required("team.manage")
    def get_team_members(business_id):
        # 1. Real members
        members = TeamMember.query.filter_by(business_id=business_id).all()
        members_data = [m.to_dict() for m in members]
        
        # 2. Pending invitations
        invitations = TeamInvitation.query.filter_by(business_id=business_id, status="pending").all()
        for inv in invitations:
            members_data.append({
                "id": -inv.id, # Negative ID to distinguish invitations
                "business_id": business_id,
                "user_id": 0,
                "user_name": "",
                "user_email": inv.email,
                "role": inv.role.name if inv.role else "Unknown",
                "role_id": inv.role_id,
                "status": "invited",
                "created_at": inv.created_at.isoformat()
            })
            
        return jsonify({"members": members_data})

    @app.route("/api/businesses/<int:business_id>/team/invite", methods=["POST"])
    @token_required
    @permission_required("team.manage")
    def invite_team_member(business_id):
        data = request.get_json()
        email = data.get("email", "").strip().lower()
        role_id = data.get("role_id")
        
        if not email or not role_id:
            return jsonify({"error": "Email y rol requeridos"}), 400

        # Fix: Ensure role_id is valid integer
        try:
            role_id = int(role_id)
        except ValueError:
            return jsonify({"error": "ID de rol invÃ¡lido"}), 400
            
        # Validar si ya es miembro
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            # Check ownership
            b = Business.query.get(business_id)
            if b.user_id == existing_user.id:
                 return jsonify({"error": "El usuario es el dueÃ±o del negocio"}), 400
                 
            member = TeamMember.query.filter_by(business_id=business_id, user_id=existing_user.id).first()
            if member:
                return jsonify({"error": "El usuario ya es miembro del equipo"}), 400
        
        # Validar si ya hay invitaciÃ³n pendiente
        # Fix: Check expiration too? For now, just check pending status.
        existing_invite = TeamInvitation.query.filter_by(business_id=business_id, email=email, status="pending").first()
        if existing_invite:
             # If exists, maybe we should resend? Or just return error?
             # Let's return error but maybe with a specific code so frontend can handle it (e.g. "Resend?")
             # For now, stick to error.
             return jsonify({"error": "Ya existe una invitaciÃ³n pendiente para este email"}), 400
             
        # Crear invitaciÃ³n
        import secrets
        token = secrets.token_urlsafe(32)
        expires = datetime.utcnow() + timedelta(days=7)
        
        invite = TeamInvitation(
            business_id=business_id,
            email=email,
            role_id=role_id,
            token=token,
            expires_at=expires,
            invited_by=g.current_user.id
        )
        db.session.add(invite)
        db.session.flush()
        _record_business_audit(
            business_id=business_id,
            actor_user=g.current_user,
            module="team",
            entity_type="team_invitation",
            entity_id=invite.id,
            action="invite",
            summary=f"InvitÃ³ a {email} al equipo",
            detail="Se generÃ³ una invitaciÃ³n de equipo para el negocio.",
            metadata=_build_audit_metadata(
                source_path="/settings?section=team",
                email=email,
                role_id=role_id,
                invitation_status=invite.status,
            ),
            after=_audit_snapshot("team_invitation", invite),
        )
        db.session.commit()
        
        # Enviar email (simulado o real)
        email_result = {"success": False}
        invite_url = ""
        
        try:
            # Determine Base URL - prioritize env vars
            client_url = os.getenv("CLIENT_URL") or os.getenv("PUBLIC_BASE_URL") or current_app.config.get("CLIENT_URL", "http://localhost:5173")
            client_url = client_url.rstrip("/")
            invite_url = f"{client_url}/accept-invite?token={token}"
            
            # Obtener nombre del negocio
            business_name = Business.query.get(business_id).name
            
            print(f"[INVITE LOG] Sending invitation to {email} for business {business_name} (ID: {business_id})")
            print(f"[INVITE LOG] Token: {token}")
            print(f"[INVITE LOG] Link: {invite_url}")
            
            email_result = AuthManager.send_invitation_email(email, business_name, invite_url)
            
            # Update invitation status based on email result
            invite.provider = email_result.get("provider")
            invite.send_attempts += 1
            invite.last_sent_at = datetime.utcnow()
            
            if email_result.get("success"):
                invite.delivery_status = "sent"
                if email_result.get("message_id"):
                    invite.message_id = email_result.get("message_id")
                print(f"[INVITE SUCCESS] Email sent to {email}. Message ID: {invite.message_id}")
            else:
                invite.delivery_status = "failed"
                invite.last_email_error = str(email_result.get("error"))
                print(f"[INVITE FAILED] Failed to send invite email: {email_result}")
            
            db.session.commit()
            
        except Exception as e:
            print(f"[INVITE EXCEPTION] Error enviando email: {e}")
            invite.delivery_status = "error"
            invite.last_email_error = str(e)
            db.session.commit()
            import traceback
            traceback.print_exc()
            email_result = {"success": False, "error": str(e)}
        
        is_dev = os.getenv("FLASK_ENV") == "development" or os.getenv("APP_ENV") == "dev"
        
        response_data = {
            "message": "InvitaciÃ³n creada" if email_result.get("success") else "InvitaciÃ³n creada pero fallÃ³ el envÃ­o del correo",
            "invitation": invite.to_dict(), 
            "email_sent": email_result.get("success", False),
            "invite_url": invite_url, # Always return for fallback
            "provider_error": email_result.get("error") if not email_result.get("success") else None
        }
        
        if is_dev:
            response_data["debug_token"] = token
            response_data["email_details"] = email_result
            if email_result.get("dev_url"):
                response_data["dev_url"] = email_result.get("dev_url")
            
        return jsonify(response_data), 200 if email_result.get("success") else 202

    @app.route("/api/roles", methods=["GET"])
    @token_required
    @permission_required("team.manage")
    def get_roles():
        business_id = request.args.get("business_id")
        
        target_business_id = None
        if business_id:
            try:
                target_business_id = int(business_id)
            except ValueError:
                pass
        elif g.current_user.account_type == 'team_member' and g.current_user.linked_business_id:
            target_business_id = g.current_user.linked_business_id
            
        query = Role.query
        
        if target_business_id:
            # Business Context: Custom roles OR System roles (Templates)
            # EXCLUDE Platform Administration roles (SUPERADMIN)
            query = query.filter(
                or_(
                    Role.business_id == target_business_id,
                    and_(Role.is_system == True, Role.name != 'SUPERADMIN')
                )
            )
        else:
            # Global Context: System roles and Global Custom roles
            query = query.filter(or_(Role.is_system == True, Role.business_id == None))
        
        roles = query.all()
        plan = "basic"
        active_modules = set()
        operational_profile = {}
        commercial_sections = {}
        suggested_roles = []
        if target_business_id:
            business = Business.query.get(target_business_id)
            if business:
                business_dict = business.to_dict()
                business_dict["settings"] = normalize_business_settings(business_dict.get("settings"))
                modules = get_business_modules(target_business_id)
                rbac_metadata = _resolve_business_rbac_metadata(g.current_user, business_dict, modules)
                plan = rbac_metadata["plan"]
                active_modules = rbac_metadata["active_modules"]
                operational_profile = rbac_metadata["operational_profile"]
                commercial_sections = rbac_metadata["commercial_sections"]
                suggested_roles = rbac_metadata["suggested_roles"]
        serialized_roles = [
            serialize_role_definition(
                role,
                plan=plan,
                operational_profile=operational_profile,
                active_modules=active_modules,
                commercial_sections=commercial_sections,
            )
            for role in roles
        ]
        return jsonify({
            "roles": serialized_roles,
            "suggested_roles": suggested_roles,
            "rbac": {
                "plan": plan,
                "operational_profile": operational_profile,
                "commercial_sections": commercial_sections,
            },
        })

    @app.route("/api/permissions", methods=["GET"])
    @token_required
    @permission_required("team.manage")
    def get_permissions():
        scope = request.args.get('scope')
        business_id = request.args.get("business_id")
        grouped = {}
        if scope == 'system' and g.current_user.is_admin:
            perms = Permission.query.filter(Permission.scope == 'system').all()
            for permission in perms:
                if permission.category not in grouped:
                    grouped[permission.category] = []
                grouped[permission.category].append(permission.to_dict())
            return jsonify({"permissions": grouped})

        definitions = list_business_permission_definitions(include_compatibility=False)
        if business_id:
            try:
                target_business_id = int(business_id)
            except (TypeError, ValueError):
                target_business_id = None
            if target_business_id:
                business = Business.query.get(target_business_id)
                if business:
                    business_dict = business.to_dict()
                    business_dict["settings"] = normalize_business_settings(business_dict.get("settings"))
                    modules = get_business_modules(target_business_id)
                    rbac_metadata = _resolve_business_rbac_metadata(g.current_user, business_dict, modules)
                    filtered = []
                    for definition in definitions:
                        resolved = resolve_effective_permissions(
                            plan=rbac_metadata["plan"],
                            operational_profile=rbac_metadata["operational_profile"],
                            active_modules=rbac_metadata["active_modules"],
                            base_permissions=[definition["name"]],
                            commercial_sections=rbac_metadata["commercial_sections"],
                        )
                        if definition["name"] in resolved["canonical_permissions"]:
                            filtered.append(definition)
                    definitions = filtered
        for definition in definitions:
            if definition["category"] not in grouped:
                grouped[definition["category"]] = []
            grouped[definition["category"]].append(definition)
        return jsonify({"permissions": grouped})

    @app.route("/api/roles", methods=["POST"])
    @token_required
    @permission_required("team.manage")
    def create_role():
        data = request.get_json() or {}
        name = data.get("name", "").strip().upper()
        description = data.get("description", "")
        permissions = normalize_permission_names(data.get("permissions", []))
        business_id = data.get("business_id")
        
        # Resolve business_id if not provided but context exists
        if not business_id and g.current_user.account_type == 'team_member':
            business_id = g.current_user.linked_business_id

        if not name:
            return jsonify({"error": "Nombre del rol requerido"}), 400

        # Check existing in this context
        query = Role.query.filter_by(name=name)
        if business_id:
            query = query.filter_by(business_id=business_id)
        else:
            query = query.filter_by(business_id=None) # Global?
            
        existing = query.first()
        if existing:
            return jsonify({"error": "El rol ya existe en este contexto"}), 400

        role = Role(name=name, description=description, is_system=False, business_id=business_id)
        db.session.add(role)
        db.session.flush()

        # Add permissions
        for perm_name in permissions:
            perm = _ensure_permission_record(perm_name)
            if perm:
                # Security: Prevent assigning system permissions to business roles
                if business_id and perm.scope == 'system':
                    return jsonify({"error": f"No se pueden asignar permisos de sistema ({perm.name}) a roles de negocio"}), 400
                
                rp = RolePermission(role_id=role.id, permission_id=perm.id)
                db.session.add(rp)

        _log_audit(g.current_user, "create", "role", role.id, None, {"name": name, "permissions": permissions, "business_id": business_id})
        db.session.commit()
        if business_id:
            business = Business.query.get(business_id)
            business_dict = business.to_dict() if business else {"settings": {}}
            business_dict["settings"] = normalize_business_settings(business_dict.get("settings"))
            modules = get_business_modules(business_id)
            rbac_metadata = _resolve_business_rbac_metadata(g.current_user, business_dict, modules)
            return jsonify(
                serialize_role_definition(
                    role,
                    plan=rbac_metadata["plan"],
                    operational_profile=rbac_metadata["operational_profile"],
                    active_modules=rbac_metadata["active_modules"],
                    commercial_sections=rbac_metadata["commercial_sections"],
                )
            ), 201
        return jsonify(role.to_dict()), 201

    @app.route("/api/roles/<int:role_id>", methods=["PUT"])
    @token_required
    @permission_required("team.manage")
    def update_role(role_id):
        role = Role.query.get(role_id)
        if not role:
            return jsonify({"error": "Rol no encontrado"}), 404

        data = request.get_json()
        if not isinstance(data, dict):
            data = {}
        business_id = data.get("business_id")
        if "permissions" in data:
            data["permissions"] = normalize_permission_names(data.get("permissions", []))
        
        # Resolve business_id if not provided
        if not business_id and g.current_user.account_type == 'team_member':
            business_id = g.current_user.linked_business_id
            
        try:
            # HANDLE SYSTEM ROLE OVERRIDE
            if role.is_system:
                if not business_id:
                     return jsonify({"error": "Se requiere contexto de negocio para modificar un rol de sistema"}), 400
                
                print(f"[RBAC] Overriding system role {role.name} for business {business_id}")
                
                # Create new custom role
                new_name = f"{role.name} (Custom)"
                # Check if already exists to avoid duplicates
                existing_custom = Role.query.filter_by(business_id=business_id, name=new_name).first()
                if existing_custom:
                    # If already exists, maybe we should update THAT one instead? 
                    # But the user clicked on the System Role ID.
                    # Let's switch to the existing custom role
                    role = existing_custom
                    print(f"[RBAC] Switched to existing custom role {role.id}")
                else:
                    new_role = Role(
                        name=new_name, 
                        description=role.description, 
                        is_system=False, 
                        business_id=business_id
                    )
                    db.session.add(new_role)
                    db.session.flush() # Get ID
                    
                    # Copy old permissions first? Or just use new ones from payload?
                    # The payload contains the DESIRED permissions. So use them.
                    
                    # Migrate Team Members
                    # Find members of this business who have the OLD role
                    members_to_migrate = TeamMember.query.filter_by(business_id=business_id, role_id=role.id).all()
                    for m in members_to_migrate:
                        m.role_id = new_role.id
                        
                    # Also UserRoles?
                    # UserRoles are for Personal account roles usually, or global admin. 
                    # Team Members use TeamMember table.
                    
                    role = new_role # Switch context to new role
            
            # Update Role (Now it's either a custom role or the new one)
            if "description" in data:
                role.description = data["description"]
            
            if "permissions" in data:
                # Clear existing
                old_perms = RolePermission.query.filter_by(role_id=role.id).all()
                for op in old_perms:
                    db.session.delete(op)
                
                # Add new
                seen_perms = set()
                for perm_name in data["permissions"]:
                    if perm_name in seen_perms:
                        continue
                    seen_perms.add(perm_name)
                    
                    perm = _ensure_permission_record(perm_name)
                    if perm:
                        # Security: Prevent assigning system permissions to business roles
                        if role.business_id and perm.scope == 'system':
                             return jsonify({"error": f"No se pueden asignar permisos de sistema ({perm.name}) a roles de negocio"}), 400

                        rp = RolePermission(role_id=role.id, permission_id=perm.id)
                        db.session.add(rp)

            # Log audit
            safe_data = data.copy() if data else {}
            _log_audit(g.current_user, "update", "role", role.id, None, safe_data)
            
            db.session.commit()
            refreshed_role = Role.query.get(role.id)
            if refreshed_role and role.business_id:
                business = Business.query.get(role.business_id)
                business_dict = business.to_dict() if business else {"settings": {}}
                business_dict["settings"] = normalize_business_settings(business_dict.get("settings"))
                modules = get_business_modules(role.business_id)
                rbac_metadata = _resolve_business_rbac_metadata(g.current_user, business_dict, modules)
                return jsonify(
                    serialize_role_definition(
                        refreshed_role,
                        plan=rbac_metadata["plan"],
                        operational_profile=rbac_metadata["operational_profile"],
                        active_modules=rbac_metadata["active_modules"],
                        commercial_sections=rbac_metadata["commercial_sections"],
                    )
                )
            return jsonify(role.to_dict())
            
        except Exception as e:
            db.session.rollback()
            import traceback
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @app.route("/api/roles/<int:role_id>", methods=["DELETE"])
    @token_required
    @permission_required("team.manage")
    def delete_role(role_id):
        role = Role.query.get(role_id)
        if not role:
            return jsonify({"error": "Rol no encontrado"}), 404

        if role.is_system:
            return jsonify({"error": "No se pueden eliminar roles del sistema"}), 403

        # Check usage
        users_count = UserRole.query.filter_by(role_id=role_id).count()
        team_count = TeamMember.query.filter_by(role_id=role_id).count()
        
        if users_count > 0 or team_count > 0:
            return jsonify({"error": f"El rol estÃ¡ asignado a {users_count + team_count} usuarios/miembros"}), 400

        _log_audit(g.current_user, "delete", "role", role.id, {"name": role.name}, None)
        db.session.delete(role)
        db.session.commit()
        return jsonify({"message": "Rol eliminado"})
        
    @app.route("/api/businesses/<int:business_id>/team/<member_id>", methods=["PUT"])
    @token_required
    @permission_required("team.manage")
    def update_team_member(business_id, member_id):
        data = request.get_json()
        new_role_id = data.get("role_id")
        
        try:
            member_id = int(member_id)
        except ValueError:
            return jsonify({"error": "ID invÃ¡lido"}), 400

        member = TeamMember.query.get(member_id)
        if not member or member.business_id != business_id:
            return jsonify({"error": "Miembro no encontrado"}), 404
            
        if not new_role_id:
            return jsonify({"error": "Rol requerido"}), 400
            
        role = Role.query.get(new_role_id)
        if not role:
            return jsonify({"error": "Rol no vÃ¡lido"}), 400
            
        old_role_name = member.role.name if member.role else "None"
        before_snapshot = _audit_snapshot("team_member", member)
        member.role_id = new_role_id
        _record_business_audit(
            business_id=business_id,
            actor_user=g.current_user,
            module="team",
            entity_type="team_member",
            entity_id=member.id,
            action="assign",
            summary=f"ActualizÃ³ el rol de un miembro del equipo a {role.name}",
            detail=f"El miembro pasÃ³ de {old_role_name} a {role.name}.",
            metadata=_build_audit_metadata(
                source_path="/settings?section=team",
                old_role=old_role_name,
                new_role=role.name,
                member_user_id=member.user_id,
            ),
            before=before_snapshot,
            after=_audit_snapshot("team_member", member),
        )
        
        # Notify user via email
        if member.user and member.user.email:
            try:
                AuthManager._send_brevo_email(
                    member.user.email,
                    "Tu rol ha sido actualizado",
                    f"Hola {member.user.name}, tu rol en el equipo ha sido actualizado a: {role.name}.",
                    None
                )
            except Exception as e:
                print(f"Error sending role update email: {e}")
        
        db.session.commit()
        
        return jsonify(member.to_dict())

    @app.route("/api/businesses/<int:business_id>/team/<member_id>", methods=["DELETE"])
    @token_required
    @permission_required("team.manage")
    def remove_team_member(business_id, member_id):
        print(f"[DEBUG] Removing team member: business_id={business_id}, member_id={member_id}")
        try:
            member_id = int(member_id)
        except ValueError:
            return jsonify({"error": "ID invÃ¡lido"}), 400

        # Handle negative IDs for invitations
        if member_id < 0:
            invite_id = abs(member_id)
            print(f"[DEBUG] Looking for invitation {invite_id}")
            try:
                invite = TeamInvitation.query.get(invite_id)
                if not invite:
                    print(f"[DEBUG] Invitation {invite_id} not found")
                    return jsonify({"error": "InvitaciÃ³n no encontrada"}), 404
                
                if invite.business_id != business_id:
                    print(f"[DEBUG] Invitation {invite_id} belongs to business {invite.business_id}, not {business_id}")
                    return jsonify({"error": "InvitaciÃ³n no encontrada"}), 404
                
                print(f"[DEBUG] Deleting invitation {invite_id}")
                _record_business_audit(
                    business_id=business_id,
                    actor_user=g.current_user,
                    module="team",
                    entity_type="team_invitation",
                    entity_id=invite.id,
                    action="delete",
                    summary=f"CancelÃ³ la invitaciÃ³n de {invite.email}",
                    detail="Se cancelÃ³ una invitaciÃ³n pendiente del equipo.",
                    metadata=_build_audit_metadata(
                        source_path="/settings?section=team",
                        email=invite.email,
                        role_id=invite.role_id,
                    ),
                    before=_audit_snapshot("team_invitation", invite),
                )
                db.session.delete(invite)
                db.session.commit()
                print(f"[DEBUG] Invitation {invite_id} deleted successfully")
                return jsonify({"message": "InvitaciÃ³n cancelada"})
            except Exception as e:
                db.session.rollback()
                print(f"[ERROR] Failed to delete invitation: {e}")
                import traceback
                traceback.print_exc()
                return jsonify({"error": str(e)}), 500
        
        member = TeamMember.query.get(member_id)
        if not member or member.business_id != business_id:
            return jsonify({"error": "Miembro no encontrado"}), 404
            
        before_snapshot = _audit_snapshot("team_member", member)
        _record_business_audit(
            business_id=business_id,
            actor_user=g.current_user,
            module="team",
            entity_type="team_member",
            entity_id=member.id,
            action="delete",
            summary="EliminÃ³ un miembro del equipo",
            detail="Se retirÃ³ a un miembro activo del equipo del negocio.",
            metadata=_build_audit_metadata(
                source_path="/settings?section=team",
                member_user_id=member.user_id,
                role_id=member.role_id,
            ),
            before=before_snapshot,
        )
        db.session.delete(member)
        db.session.commit()
        return jsonify({"message": "Miembro eliminado"})
        
    @app.route("/api/invitations/info", methods=["GET"])
    def get_invitation_info():
        token = request.args.get("token")
        if not token:
            return jsonify({"error": "Token requerido"}), 400
        
        invite = TeamInvitation.query.filter_by(token=token).first()
        if not invite:
            return jsonify({"error": "InvitaciÃ³n no encontrada"}), 404
            
        if invite.status != "pending":
            return jsonify({"error": f"InvitaciÃ³n no vÃ¡lida (Estado: {invite.status})"}), 400
            
        if invite.expires_at < datetime.utcnow():
            invite.status = "expired"
            db.session.commit()
            return jsonify({"error": "La invitaciÃ³n ha expirado"}), 400
            
        business = Business.query.get(invite.business_id)
        
        return jsonify({
            "email": invite.email,
            "business_name": business.name if business else "Desconocido",
            "role_name": invite.role.name if invite.role else "Miembro",
            "inviter_name": invite.inviter.name if invite.inviter else "Sistema"
        })

    @app.route("/api/invitations/register", methods=["POST"])
    def register_via_invitation():
        data = request.get_json()
        token = data.get("token")
        name = data.get("name")
        password = data.get("password")
        
        if not token or not name or not password:
            return jsonify({"error": "Faltan datos requeridos"}), 400
            
        invite = TeamInvitation.query.filter_by(token=token).first()
        if not invite:
            return jsonify({"error": "InvitaciÃ³n no encontrada"}), 404
            
        if invite.status != "pending":
            return jsonify({"error": "InvitaciÃ³n no vÃ¡lida"}), 400
            
        if invite.expires_at < datetime.utcnow():
            return jsonify({"error": "La invitaciÃ³n ha expirado"}), 400

        # Check if TEAM user exists for this business
        existing_team_user = User.query.filter_by(
            email=invite.email.lower(), 
            account_type='team_member',
            linked_business_id=invite.business_id
        ).first()
        
        if existing_team_user:
            return jsonify({"error": "Ya tienes una cuenta de equipo para este negocio. Por favor inicia sesiÃ³n."}), 400
            
        # Create User (Team Member Entity)
        new_user = User(
            email=invite.email.lower(),
            name=name,
            plan="free",
            email_verified=True, # Verified via invite token
            is_active=True,
            account_type='team_member',
            linked_business_id=invite.business_id
        )
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.flush() # Get ID
        
        # Create Team Member
        new_member = TeamMember(
             business_id=invite.business_id,
             user_id=new_user.id,
             role_id=invite.role_id,
             status="active"
        )
        db.session.add(new_member)
        
        invite.status = "accepted"
        
        # Ensure default role (Not needed for team member usually, but safe)
        # _ensure_default_role(new_user) 
        
        db.session.commit()
        
        # Auto Login
        access_token = create_token(new_user.id, "access")
        refresh_token = create_token(new_user.id, "refresh")
        
        return jsonify({
            "message": "Registro exitoso",
            "user": new_user.to_dict(),
            "access_token": access_token,
            "refresh_token": refresh_token
        })

    @app.route("/api/invitations/accept", methods=["POST"])
    @token_required
    def accept_invitation():
        data = request.get_json()
        token = data.get("token")
        
        if not token:
            return jsonify({"error": "Token requerido"}), 400

        invite = TeamInvitation.query.filter_by(token=token).first()
        if not invite:
            return jsonify({"error": "InvitaciÃ³n no encontrada"}), 404
            
        if invite.status == "accepted":
             # Check if user is already a member
             member = TeamMember.query.filter_by(business_id=invite.business_id, user_id=g.current_user.id).first()
             if member:
                  return jsonify({"message": "Ya eres miembro del equipo (invitaciÃ³n ya aceptada)", "business_id": invite.business_id})
             else:
                  return jsonify({"error": "Esta invitaciÃ³n ya fue usada"}), 400

        if invite.status != "pending":
             return jsonify({"error": f"InvitaciÃ³n no vÃ¡lida (Estado: {invite.status})"}), 400
             
        if invite.expires_at < datetime.utcnow():
             invite.status = "expired"
             db.session.commit()
             return jsonify({"error": "La invitaciÃ³n ha expirado"}), 400
            
        # Check email match? Ideally yes, but if user registered with different email?
        # Let's be strict: email must match.
        if invite.email.lower() != g.current_user.email.lower():
             return jsonify({"error": f"Esta invitaciÃ³n fue enviada a {invite.email}, pero tu cuenta es {g.current_user.email}. Por favor inicia sesiÃ³n con la cuenta correcta o regÃ­strate con el correo invitado."}), 403
            
        # Check if already member
        existing_member = TeamMember.query.filter_by(business_id=invite.business_id, user_id=g.current_user.id).first()
        if existing_member:
             invite.status = "accepted"
             db.session.commit()
             return jsonify({"message": "Ya eres miembro del equipo", "business_id": invite.business_id})

        # Crear miembro
        new_member = TeamMember(
             business_id=invite.business_id,
             user_id=g.current_user.id,
             role_id=invite.role_id,
             status="active"
        )
        db.session.add(new_member)
        
        invite.status = "accepted"
        # invite.accepted_at = datetime.utcnow() # If model doesn't support this field, skip it.
        
        db.session.commit()
        
        return jsonify({"message": "InvitaciÃ³n aceptada exitosamente", "business_id": invite.business_id})

    @app.route("/api/businesses/<int:business_id>", methods=["GET"])
    @token_required
    def get_business(business_id):
        member = None
        # 1. Try owner
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        
        # 2. Try member
        if not business:
            member = TeamMember.query.filter_by(user_id=g.current_user.id, business_id=business_id, status='active').first()
            if member:
                business = member.business

        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        if not business.whatsapp_templates:
            business.whatsapp_templates = {
                "collection_message": (
                    "Hola {cliente} ðŸ˜Š\n"
                    "Te escribo de *{negocio}*.\n\n"
                    "SegÃºn mi registro, tienes un saldo pendiente de *${deuda}*.\n"
                    "Â¿Me confirmas por favor cuÃ¡ndo puedes realizar el pago?\n\n"
                    "Gracias ðŸ™Œ"
                ),
                "sale_message": (
                    "Hola {cliente}, gracias por tu compra en *{negocio}*.\n\n"
                    "*Detalle:*\n{items}\n"
                    "*TOTAL: ${total}*\n"
                    "Pagado: ${pagado}\n"
                    "Saldo: ${saldo}\n\n"
                    "Â¡Esperamos verte pronto! ðŸ‘‹"
                )
            }
            # Solo guardar si es owner (evitar errores de permisos de escritura si el miembro no debe)
            if business.user_id == g.current_user.id:
                db.session.commit()
                
        b_dict = business.to_dict()
        if business.user_id == g.current_user.id:
            b_dict['role'] = 'OWNER'
            b_dict['permissions'] = ['*']
        else:
            # Re-fetch member if needed, but we have it from above if we entered branch 2
            # If we entered branch 1 (owner), we are done.
            # Wait, if we are in branch 1, member is None.
            # If we are in branch 2, member is set.
            # But what if I am owner? member is None.
            # What if I am member? business is found via member.
            
            # Logic check:
            # If business.user_id == current_user.id -> Owner.
            # Else -> Member (or error, but we checked existence).
            
            if not member: 
                 # Could be that we found business via ID but we are not owner?
                 # Ah, branch 1 checks user_id=current_user.id.
                 # Branch 2 checks member table.
                 # So if we are here, and not owner, we MUST be member.
                 # BUT, variable 'member' is only set if we entered branch 2.
                 # If we entered branch 1, member is None.
                 # So if business.user_id != g.current_user.id, we must have found it via branch 2, so member is set.
                 pass

        if business.user_id != g.current_user.id and member and member.role:
             b_dict['role'] = member.role.name
             b_dict['permissions'] = [rp.permission.name for rp in member.role.permissions if rp.permission]
        elif business.user_id != g.current_user.id:
             b_dict['role'] = 'MEMBER'
             b_dict['permissions'] = []

        return jsonify({"business": attach_modules_to_business_dict(business, b_dict)})

    @app.route("/api/businesses/<int:business_id>", methods=["PUT"])
    @token_required
    @permission_required("business.update")
    def update_business(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        before_snapshot = _audit_snapshot("business", business)
        data = request.get_json() or {}
        if "name" in data:
            business.name = data["name"].strip()
        if "currency" in data:
            business.currency = data["currency"]
        if "timezone" in data:
            business.timezone = data["timezone"]
        if "settings" in data:
            # Merge settings (preserve existing logo if not provided)
            current_settings = normalize_business_settings(business.settings)
            new_settings = data["settings"]
            # Ensure we don't overwrite the logo if it's not in the new settings but exists in current
            if "logo" in current_settings and "logo" not in new_settings:
                new_settings["logo"] = current_settings["logo"]
            
            # Apply preset if business_type is being changed
            business_type = new_settings.get("personalization", {}).get("business_type")
            if business_type and business_type != current_settings.get("personalization", {}).get("business_type"):
                try:
                    # Apply new preset while preserving some existing settings
                    preset_settings = apply_preset_to_business_settings(
                        new_settings, 
                        business_type,
                        apply_modules=False,  # Don't override modules unless explicitly requested
                        apply_navigation=True,
                        apply_onboarding=True
                    )
                    # Preserve existing modules if not overridden
                    if "modules" in current_settings and "modules" not in preset_settings:
                        preset_settings["modules"] = current_settings["modules"]
                    business.settings = normalize_business_settings(preset_settings)
                except Exception as e:
                    print(f"Warning: Failed to apply business preset '{business_type}': {e}")
                    # Fallback to normal settings update
                    business.settings = normalize_business_settings(new_settings)
            else:
                business.settings = normalize_business_settings(new_settings)

        if "name" in data:
            business.name = data["name"].strip()
        if "currency" in data:
            business.currency = data["currency"]
        if "timezone" in data:
            business.timezone = data["timezone"]
        if "monthly_sales_goal" in data:
            business.monthly_sales_goal = float(data["monthly_sales_goal"] or 0)

        business.updated_at = datetime.utcnow()
        db.session.commit()
        
        after_snapshot = _audit_snapshot("business", business)
        _record_business_audit(
            business.id,
            "business.updated",
            before_snapshot,
            after_snapshot,
            {"updated_fields": list(data.keys())}
        )
        
        return jsonify({"business": attach_modules_to_business_dict(business)})

    @app.route("/api/businesses/<int:business_id>/modules", methods=["GET"])
    @token_required
    def get_business_modules_endpoint(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        if not has_permission(g.current_user, "business.update", business_id):
            return jsonify({"error": "Permiso requerido: business.update"}), 403
        return jsonify({"modules": get_business_modules(business_id)})

    @app.route("/api/businesses/<int:business_id>/modules", methods=["PUT", "PATCH"])
    @token_required
    def update_business_modules_endpoint(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        if not has_permission(g.current_user, "business.update", business_id):
            return jsonify({"error": "Permiso requerido: business.update"}), 403

        data = request.get_json() or {}
        modules_payload = data.get("modules")

        if not isinstance(modules_payload, dict):
            return jsonify({"error": "El payload debe incluir un objeto 'modules' vÃ¡lido"}), 400

        invalid_keys = [key for key in modules_payload.keys() if key not in BUSINESS_MODULE_DEFAULTS]
        if invalid_keys:
            return jsonify({"error": "Se recibieron module_key invÃ¡lidas", "invalid_keys": invalid_keys}), 400

        invalid_values = [key for key, value in modules_payload.items() if not isinstance(value, bool)]
        if invalid_values:
            return jsonify({"error": "Cada mÃ³dulo debe enviarse como boolean", "invalid_keys": invalid_values}), 400

        module_map = ensure_business_modules_initialized(business_id, auto_commit=False)
        before_modules = {module_key: bool(module_row.enabled) for module_key, module_row in module_map.items()}

        for module_key, enabled in modules_payload.items():
            module_row = module_map[module_key]
            module_row.enabled = enabled

        after_modules = {module_key: bool(module_row.enabled) for module_key, module_row in module_map.items()}
        changed_modules = [
            {
                "module_key": module_key,
                "before": before_modules.get(module_key),
                "after": after_modules.get(module_key),
            }
            for module_key in modules_payload.keys()
            if before_modules.get(module_key) != after_modules.get(module_key)
        ]
        _record_business_audit(
            business_id=business_id,
            actor_user=g.current_user,
            module="settings",
            entity_type="business_modules",
            entity_id=business_id,
            action="update",
            summary=f"ActualizÃ³ los mÃ³dulos del negocio {business.name}",
            detail="Se activaron o desactivaron mÃ³dulos del negocio.",
            metadata=_build_audit_metadata(changed_modules=changed_modules),
            before=before_modules,
            after=after_modules,
        )
        db.session.commit()
        return jsonify({"modules": get_business_modules(business_id)})

    @app.route("/api/businesses/<int:business_id>/audit", methods=["GET"])
    @token_required
    def get_business_audit_logs(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        if not _user_can_view_business_audit(g.current_user, business):
            return jsonify({"error": "No tienes permisos para ver la auditorÃ­a del negocio"}), 403

        page = max(request.args.get("page", 1, type=int), 1)
        per_page = min(max(request.args.get("per_page", 20, type=int), 1), 100)
        module = (request.args.get("module") or "").strip()
        action = (request.args.get("action") or "").strip()
        search = (request.args.get("q") or request.args.get("search") or "").strip()

        query = AuditLog.query.filter(AuditLog.business_id == business_id)

        if module:
            query = query.filter(AuditLog.module == module)
        if action:
            query = query.filter(AuditLog.action == action)
        if search:
            pattern = f"%{search}%"
            query = query.filter(
                or_(
                    AuditLog.actor_name.ilike(pattern),
                    AuditLog.actor_role.ilike(pattern),
                    AuditLog.summary.ilike(pattern),
                    AuditLog.entity.ilike(pattern),
                    AuditLog.entity_type.ilike(pattern),
                    cast(AuditLog.metadata_json, String).ilike(pattern),
                    cast(AuditLog.before_json, String).ilike(pattern),
                    cast(AuditLog.after_json, String).ilike(pattern),
                )
            )

        pagination = query.order_by(AuditLog.timestamp.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False,
        )

        return jsonify({
            "logs": [log.to_dict() for log in pagination.items],
            "entries": [present_audit_log(log) for log in pagination.items],
            "total": pagination.total,
            "page": page,
            "per_page": per_page,
            "pages": pagination.pages or 1,
        })

    @app.route("/api/businesses/<int:business_id>/logo", methods=["POST"])
    @token_required
    def upload_logo(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        
        if 'logo' not in request.files:
            return jsonify({"error": "No se encontrÃ³ archivo de imagen"}), 400
        
        file = request.files['logo']
        if file.filename == '':
            return jsonify({"error": "No se selected ningÃºn archivo"}), 400
        
        # Save to assets folder
        import uuid
        ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else 'png'
        filename = f"logo_{business_id}_{uuid.uuid4().hex[:8]}.{ext}"
        filepath = os.path.join('assets', filename)
        file.save(filepath)
        
        # Update business settings with logo path
        before_snapshot = _audit_snapshot("business", business)
        settings = business.settings or {}
        settings['logo'] = '/' + filepath.replace('\\', '/')
        business.settings = settings
        _record_business_audit(
            business_id=business_id,
            actor_user=g.current_user,
            module="settings",
            entity_type="business",
            entity_id=business.id,
            action="update",
            summary=f"ActualizÃ³ el logo del negocio {business.name}",
            detail="Se cambiÃ³ la imagen de logo del negocio.",
            metadata=_build_audit_metadata(changed_fields=["settings.logo"]),
            before=before_snapshot,
            after=_audit_snapshot("business", business),
        )
        db.session.commit()
        
        return jsonify({"logo_url": settings['logo']})

    @app.route("/api/businesses/<int:business_id>", methods=["DELETE"])
    @token_required
    def delete_business(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        db.session.delete(business)
        db.session.commit()
        return jsonify({"ok": True, "deleted_id": business_id})

    # ========== PRODUCT ROUTES ==========
    @app.route("/api/businesses/<int:business_id>/products", methods=["GET"])
    @token_required
    @module_required("products")
    @permission_required('products.read')
    def get_products(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        search = request.args.get("search")
        category = request.args.get("category")

        query = Product.query.filter_by(business_id=business_id)

        if search:
            query = query.filter(Product.name.ilike(f"%{search}%"))

        if category:
            query = query.filter(Product.category == category)

        products = query.order_by(Product.name).all()
        return jsonify({"products": [p.to_dict() for p in products]})

    @app.route("/api/businesses/<int:business_id>/products", methods=["POST"])
    @token_required
    @module_required("products")
    @permission_required('products.create')
    def create_product(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        # Plan FREE: limitar a 5 productos
        if g.current_user.plan == "free":
            product_count = Product.query.filter_by(business_id=business_id).count()
            if product_count >= 5:
                return jsonify({
                    "error": "Tu plan gratuito permite hasta 5 productos. Actualiza a Pro para aÃ±adir mÃ¡s.",
                    "upgrade_url": "/upgrade"
                }), 403

        data = request.get_json() or {}
        name = data.get("name", "").strip()
        price = data.get("price")
        product_type = str(data.get("type", "product") or "product").strip().lower() or "product"

        if not name:
            return jsonify({"error": "Nombre del producto es requerido"}), 400

        try:
            price = float(price) if price else 0
            if price < 0:
                raise ValueError()
        except:
            return jsonify({"error": "Precio debe ser un nÃºmero positivo"}), 400

        product = Product(
            business_id=business_id,
            name=name,
            description=data.get("description", "").strip() or None,
            type=product_type,
            sku=data.get("sku", "").strip() or None,
            price=price,
            cost=data.get("cost"),
            unit=data.get("unit", "und"),
            stock=data.get("stock", 0),
            low_stock_threshold=data.get("low_stock_threshold", 5),
            fulfillment_mode=resolve_product_fulfillment_mode(
                product=None,
                business=business,
                explicit_mode=data.get("fulfillment_mode") or ("service" if product_type == "service" else None),
            ),
            image=data.get("image")
        )

        db.session.add(product)
        db.session.flush()

        # GESTIÃ“N DE BARCODES
        barcodes = data.get("barcodes", [])
        if barcodes and isinstance(barcodes, list) and len(barcodes) > 0:
            # Plan FREE: No permitir mÃºltiples barcodes
            if g.current_user.plan == "free":
                return jsonify({
                    "error": "Tu plan gratuito no soporta mÃºltiples cÃ³digos de barras. Actualiza a Pro.",
                    "upgrade_url": "/upgrade"
                }), 403

            for code in barcodes:
                code = str(code).strip()
                if code:
                    # Verificar duplicados globales
                    if ProductBarcode.query.filter_by(code=code).first():
                        db.session.rollback()
                        return jsonify({"error": f"El cÃ³digo de barras '{code}' ya estÃ¡ asignado a otro producto"}), 400
                    
                    new_barcode = ProductBarcode(product_id=product.id, code=code)
                    db.session.add(new_barcode)

        _record_business_audit(
            business_id=business_id,
            actor_user=g.current_user,
            module="products",
            entity_type="product",
            entity_id=product.id,
            action="create",
            summary=f"CreÃ³ el producto {product.name}",
            detail="Se registrÃ³ un nuevo producto en el catÃ¡logo del negocio.",
            metadata=_build_audit_metadata(
                source_path="/products",
                sku=product.sku,
                product_type=product.type,
            ),
            after=_audit_snapshot("product", product),
        )
        db.session.commit()

        return jsonify({"product": product.to_dict()}), 201

    @app.route("/api/businesses/<int:business_id>/products/<int:product_id>", methods=["GET"])
    @token_required
    @module_required("products")
    def get_product(business_id, product_id):
        product = Product.query.filter_by(id=product_id, business_id=business_id).first()
        if not product:
            return jsonify({"error": "Producto no encontrado"}), 404
        return jsonify({"product": product.to_dict()})

    @app.route("/api/businesses/<int:business_id>/products/<int:product_id>", methods=["PUT"])
    @token_required
    @module_required("products")
    @permission_required('products.update')
    def update_product(business_id, product_id):
        product = Product.query.filter_by(id=product_id, business_id=business_id).first()
        if not product:
            return jsonify({"error": "Producto no encontrado"}), 404

        before_snapshot = _audit_snapshot("product", product)
        data = request.get_json() or {}
        business = Business.query.get(business_id)
        if "name" in data:
            product.name = data["name"]
        if "description" in data:
            product.description = data["description"]
        if "type" in data:
            product.type = data["type"]
        if "sku" in data:
            product.sku = data["sku"].strip() or None
        if "price" in data:
            product.price = float(data["price"])
        if "cost" in data:
            product.cost = float(data["cost"]) if data["cost"] else None
        if "unit" in data:
            product.unit = data["unit"]
        if "stock" in data:
            product.stock = float(data["stock"]) if data["stock"] else 0
        if "low_stock_threshold" in data:
            product.low_stock_threshold = float(data["low_stock_threshold"]) if data["low_stock_threshold"] else 5
        if "active" in data:
            product.active = bool(data["active"])
        if "image" in data:
            product.image = data["image"]
        if "fulfillment_mode" in data or "type" in data:
            requested_fulfillment_mode = data.get("fulfillment_mode") if "fulfillment_mode" in data else None
            normalized_requested_fulfillment_mode = normalize_fulfillment_mode(requested_fulfillment_mode)

            current_app.logger.warning(
                "[products.update] payload fulfillment_mode=%s normalized=%s type=%s product_id=%s business_id=%s",
                requested_fulfillment_mode,
                normalized_requested_fulfillment_mode,
                product.type,
                product.id,
                business_id,
            )

            if "fulfillment_mode" in data and requested_fulfillment_mode not in (None, "") and normalized_requested_fulfillment_mode is None:
                return jsonify({"error": "fulfillment_mode invÃ¡lido"}), 400

            explicit_fulfillment_mode = (
                normalized_requested_fulfillment_mode
                if "fulfillment_mode" in data
                else ("service" if product.type == "service" else product.fulfillment_mode)
            )
            resolved_fulfillment_mode = resolve_product_fulfillment_mode(
                product=product,
                business=business,
                explicit_mode=explicit_fulfillment_mode,
            )
            current_app.logger.warning(
                "[products.update] resolved fulfillment_mode=%s previous=%s product_id=%s",
                resolved_fulfillment_mode,
                product.fulfillment_mode,
                product.id,
            )
            product.fulfillment_mode = resolved_fulfillment_mode
            Product.query.filter_by(id=product.id, business_id=business_id).update(
                {"fulfillment_mode": resolved_fulfillment_mode},
                synchronize_session=False,
            )

        # GESTIÃ“N DE BARCODES
        if "barcodes" in data and isinstance(data["barcodes"], list):
            # Plan FREE: No permitir mÃºltiples barcodes
            if g.current_user.plan == "free" and len(data["barcodes"]) > 0:
                return jsonify({
                    "error": "Tu plan gratuito no soporta mÃºltiples cÃ³digos de barras. Actualiza a Pro.",
                    "upgrade_url": "/upgrade"
                }), 403

            # 1. Eliminar cÃ³digos actuales
            ProductBarcode.query.filter_by(product_id=product.id).delete()

            # 2. Agregar nuevos validando duplicados
            for code in data["barcodes"]:
                code = str(code).strip()
                if code:
                    existing = ProductBarcode.query.filter_by(code=code).first()
                    if existing and existing.product_id != product.id:
                        db.session.rollback()
                        return jsonify({"error": f"El cÃ³digo de barras '{code}' ya estÃ¡ asignado a otro producto"}), 400

                    db.session.add(ProductBarcode(product_id=product.id, code=code))

        _record_business_audit(
            business_id=business_id,
            actor_user=g.current_user,
            module="products",
            entity_type="product",
            entity_id=product.id,
            action="update",
            summary=f"ActualizÃ³ el producto {product.name}",
            detail="Se modificaron datos del producto o sus cÃ³digos de barras.",
            metadata=_build_audit_metadata(
                source_path=f"/products/{product.id}",
                changed_fields=sorted((data or {}).keys()),
            ),
            before=before_snapshot,
            after=_audit_snapshot("product", product),
        )
        db.session.flush()
        db.session.commit()
        db.session.refresh(product)
        current_app.logger.warning(
            "[products.update] persisted fulfillment_mode=%s product_id=%s business_id=%s",
            product.fulfillment_mode,
            product.id,
            business_id,
        )
        return jsonify({"product": product.to_dict()})

    @app.route("/api/businesses/<int:business_id>/products/<int:product_id>", methods=["DELETE"])
    @token_required
    @module_required("products")
    @permission_required('products.delete')
    def delete_product(business_id, product_id):
        product = Product.query.filter_by(id=product_id, business_id=business_id).first()
        if not product:
            return jsonify({"error": "Producto no encontrado"}), 404

        before_snapshot = _audit_snapshot("product", product)
        _record_business_audit(
            business_id=business_id,
            actor_user=g.current_user,
            module="products",
            entity_type="product",
            entity_id=product.id,
            action="delete",
            summary=f"EliminÃ³ el producto {product.name}",
            detail="Se eliminÃ³ un producto del catÃ¡logo del negocio.",
            metadata=_build_audit_metadata(source_path="/products"),
            before=before_snapshot,
        )
        db.session.delete(product)
        db.session.commit()
        return jsonify({"ok": True})

    # ========== INVENTORY MOVEMENTS ROUTES (BUSINESS) ==========
    @app.route("/api/businesses/<int:business_id>/products/<int:product_id>/movements", methods=["GET"])
    @token_required
    @module_required("products")
    @permission_required('products.read')
    def get_product_movements(business_id, product_id):
        product = Product.query.filter_by(id=product_id, business_id=business_id).first()
        if not product:
            return jsonify({"error": "Producto no encontrado"}), 404

        # Business Plan Check (only for detailed history view)
        if g.current_user.plan not in ["business"]:
             return jsonify({
                "error": "El historial detallado es exclusivo para usuarios Business",
                "upgrade_required": True
            }), 403

        limit = request.args.get("limit", 50, type=int)
        movements = product.movements.order_by(ProductMovement.created_at.desc()).limit(limit).all()
        return jsonify({"movements": [m.to_dict() for m in movements]})

    @app.route("/api/businesses/<int:business_id>/products/<int:product_id>/movements", methods=["POST"])
    @token_required
    @module_required("products")
    @permission_required('products.update')
    def create_product_movement(business_id, product_id):
        product = Product.query.filter_by(id=product_id, business_id=business_id).first()
        if not product:
            return jsonify({"error": "Producto no encontrado"}), 404

        # Business Plan Check (only for advanced movements with reasons)
        if g.current_user.plan not in ["business"]:
             return jsonify({
                "error": "Los movimientos avanzados son exclusivos para usuarios Business",
                "upgrade_required": True
            }), 403

        data = request.get_json() or {}
        type_ = data.get("type") # in, out
        
        try:
            quantity = float(data.get("quantity", 0))
            if quantity <= 0:
                raise ValueError()
        except:
             return jsonify({"error": "Cantidad debe ser mayor a 0"}), 400

        reason = (data.get("reason") or "").strip()
        if not reason:
             return jsonify({"error": "El motivo es obligatorio en Business"}), 400

        if type_ not in ["in", "out"]:
            return jsonify({"error": "Tipo de movimiento invÃ¡lido (in/out)"}), 400
        
        # Apply logic
        if type_ == "in":
            product.stock += quantity
        elif type_ == "out":
            # Allow negative stock? User said "Pro... stock actual... ajuste manual". 
            # Business might want strict control.
            # But usually we warn rather than block unless strict mode is on.
            # Let's just update.
            product.stock -= quantity
        
        role_snapshot = get_current_role_snapshot(g.current_user, business_id)

        # Create Movement
        movement = ProductMovement(
            product_id=product.id,
            business_id=business_id,
            user_id=g.current_user.id,
            type=type_,
            quantity=quantity,
            reason=reason,
            created_by_name=g.current_user.name,
            created_by_role=role_snapshot
        )
        
        db.session.add(movement)
        db.session.flush()
        _record_business_audit(
            business_id=business_id,
            actor_user=g.current_user,
            module="raw_inventory",
            entity_type="product_movement",
            entity_id=movement.id,
            action="adjust",
            summary=f"RegistrÃ³ un movimiento de inventario para {product.name}",
            detail=f"Movimiento {type_} por {quantity} {product.unit or 'und'} con motivo: {reason}.",
            metadata=_build_audit_metadata(
                source_path=f"/products/{product.id}",
                product_id=product.id,
                product_name=product.name,
                movement_type=type_,
                quantity=quantity,
                unit=product.unit,
                reason=reason,
                resulting_stock=product.stock,
            ),
            after=movement.to_dict(),
        )
        db.session.commit()
        
        return jsonify({
            "ok": True, 
            "product": product.to_dict(),
            "movement": movement.to_dict()
        }), 201

    @app.route("/api/businesses/<int:business_id>/products/<int:product_id>/production", methods=["POST"])
    @token_required
    @module_required("products")
    @permission_required('products.update')
    def register_product_production(business_id, product_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        module_response = ensure_module_enabled(business_id, "raw_inventory")
        if module_response:
            return module_response
        product = Product.query.filter_by(id=product_id, business_id=business_id).first()
        if not product:
            return jsonify({"error": "Producto no encontrado"}), 404
        data = request.get_json() or {}
        try:
            quantity = float(data.get("quantity") or data.get("quantity_produced") or 0)
        except Exception:
            quantity = 0
        if quantity <= 0:
            return jsonify({"error": "La cantidad producida debe ser mayor a 0"}), 400

        role_snapshot = get_current_role_snapshot(g.current_user, business_id)
        try:
            result = register_stock_production(
                business=business,
                product=product,
                quantity=quantity,
                actor_user=g.current_user,
                role_snapshot=role_snapshot,
                notes=(data.get("notes") or "").strip() or None,
            )
        except InsufficientRawMaterialsError as exc:
            db.session.rollback()
            return jsonify({
                "error": str(exc),
                "code": "INSUFFICIENT_RAW_MATERIALS",
                "product_name": exc.product_name,
                "shortages": exc.shortages,
            }), 400
        except ValueError as exc:
            db.session.rollback()
            return jsonify({"error": str(exc)}), 400

        _record_business_audit(
            business_id=business_id,
            actor_user=g.current_user,
            module="raw_inventory",
            entity_type="recipe_consumption",
            entity_id=result["recipe_consumption"].id,
            action="produce",
            summary=f"RegistrÃ³ producciÃ³n para {product.name}",
            detail=f"Se produjo {quantity} {product.unit or 'und'} de {product.name} consumiendo materias primas y aumentando stock terminado.",
            metadata=_build_audit_metadata(
                source_path=f"/products/{product.id}",
                product_id=product.id,
                quantity=quantity,
                recipe_id=result["recipe"].id,
                recipe_consumption_id=result["recipe_consumption"].id,
            ),
            after={
                "product": result["product"].to_dict(),
                "movement": result["movement"].to_dict(),
                "recipe_consumption": result["recipe_consumption"].to_dict(),
            },
        )
        db.session.commit()

        return jsonify({
            "product": result["product"].to_dict(),
            "movement": result["movement"].to_dict(),
            "recipe_consumption": result["recipe_consumption"].to_dict(),
            "raw_material_items": result["raw_material_items"],
            "previous_stock": result["previous_stock"],
            "new_stock": result["new_stock"],
            "total_reference_cost": result["total_reference_cost"],
        }), 201

    @app.route("/api/businesses/<int:business_id>/products/bulk-adjustment", methods=["POST"])
    @token_required
    @module_required("products")
    @permission_required('products.update')
    def bulk_adjustment(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
            
        data = request.get_json()
        adjustments = data.get("adjustments", []) # List of { product_id, type: 'in'|'out'|'set', quantity, reason }
        
        if not adjustments:
            return jsonify({"error": "No hay ajustes para procesar"}), 400
            
        processed = []
        errors = []
        
        for adj in adjustments:
            try:
                pid = adj.get("product_id")
                type_ = adj.get("type")
                qty = float(adj.get("quantity", 0))
                reason = adj.get("reason", "Ajuste masivo")
                
                product = Product.query.filter_by(id=pid, business_id=business_id).first()
                if not product:
                    errors.append(f"Producto ID {pid} no encontrado")
                    continue
                    
                if qty < 0: 
                    errors.append(f"Cantidad negativa en producto {product.name}")
                    continue
                    
                old_stock = product.stock
                
                if type_ == "set":
                    # Calculate diff
                    diff = qty - old_stock
                    if diff == 0: continue
                    
                    product.stock = qty
                    movement_type = "adjustment"
                    movement_qty = abs(diff)
                    final_reason = f"{reason} (Ajuste de {old_stock} a {qty})"
                elif type_ == "in":
                    product.stock += qty
                    movement_type = "in"
                    movement_qty = qty
                    final_reason = reason
                elif type_ == "out":
                    product.stock -= qty
                    movement_type = "out"
                    movement_qty = qty
                    final_reason = reason
                else:
                    errors.append(f"Tipo desconocido '{type_}' en {product.name}")
                    continue
                    
                movement = ProductMovement(
                    product_id=product.id,
                    business_id=business_id,
                    user_id=g.current_user.id,
                    type=movement_type,
                    quantity=movement_qty,
                    reason=final_reason
                )
                db.session.add(movement)
                processed.append(product.id)
                
            except Exception as e:
                errors.append(f"Error procesando item: {str(e)}")
                
        if processed:
            _record_business_audit(
                business_id=business_id,
                actor_user=g.current_user,
                module="raw_inventory",
                entity_type="inventory_adjustment",
                entity_id=None,
                action="adjust",
                summary=f"EjecutÃ³ un ajuste masivo de inventario sobre {len(processed)} productos",
                detail="Se aplicÃ³ un ajuste masivo de inventario en el negocio.",
                metadata=_build_audit_metadata(
                    source_path="/products",
                    processed_product_ids=processed,
                    errors=errors or None,
                    adjustment_count=len(adjustments),
                ),
                after={"processed_count": len(processed), "errors": errors},
            )
            db.session.commit()
            
        return jsonify({
            "processed_count": len(processed),
            "errors": errors
        })
    @app.route("/api/businesses/<int:business_id>/dashboard", methods=["GET"])
    @token_required
    @permission_required('summary.read')
    def get_dashboard_stats(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        date_str = request.args.get("date")
        if date_str:
            try:
                today = datetime.strptime(date_str, "%Y-%m-%d").date()
            except:
                today = date.today()
        else:
            today = date.today()

        dashboard_cache_key = (business_id, today.isoformat(), "legacy")
        payload = build_business_payload(
            DASHBOARD_CACHE_NAMESPACE,
            dashboard_cache_key,
            current_app.config.get("LOCAL_RESPONSE_CACHE_TTL_DASHBOARD_SECONDS", 5),
            lambda: build_legacy_dashboard_payload(business_id, today),
            business_id=business_id,
        )
        return jsonify(payload)

    @app.route("/api/businesses/<int:business_id>/customers", methods=["GET"])
    @token_required
    @module_required("customers")
    @permission_required('customers.read')
    def get_customers(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        search = request.args.get("search")

        query = Customer.query.filter_by(business_id=business_id)

        if search:
            query = query.filter(Customer.name.ilike(f"%{search}%"))

        customers = query.order_by(Customer.name).all()
        return jsonify({"customers": [c.to_dict() for c in customers]})

    @app.route("/api/businesses/<int:business_id>/customers", methods=["POST"])
    @token_required
    @module_required("customers")
    @permission_required('clients.create')
    def create_customer(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        data = request.get_json() or {}
        name = (data.get("name") or "").strip()

        if not name:
            return jsonify({"error": "Nombre del cliente es requerido"}), 400

        role_snapshot = get_current_role_snapshot(g.current_user, business_id)
        customer = Customer(
            business_id=business_id,
            name=name,
            phone=(data.get("phone") or "").strip() or None,
            address=(data.get("address") or "").strip() or None,
            notes=(data.get("notes") or "").strip() or None,
            active=bool(data.get("active", True)),
            created_by_user_id=g.current_user.id,
            created_by_name=g.current_user.name,
            created_by_role=role_snapshot,
            updated_by_user_id=g.current_user.id,
        )

        db.session.add(customer)
        db.session.flush()
        _record_business_audit(
            business_id=business_id,
            actor_user=g.current_user,
            module="customers",
            entity_type="customer",
            entity_id=customer.id,
            action="create",
            summary=f"CreÃ³ el cliente {customer.name}",
            detail="Se registrÃ³ un nuevo cliente en el negocio.",
            metadata=_build_audit_metadata(
                source_path="/customers",
                phone=customer.phone,
            ),
            after=_audit_snapshot("customer", customer),
        )
        db.session.commit()
        return jsonify({"customer": customer.to_dict()}), 201

    @app.route("/api/businesses/<int:business_id>/customers/debtors", methods=["GET"])
    @token_required
    @module_required("accounts_receivable")
    @permission_required('payments.read')
    def get_debtors(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        customers = Customer.query.filter_by(business_id=business_id).all()
        debtors = []

        for customer in customers:
            charges = db.session.query(db.func.sum(LedgerEntry.amount)).filter(
                LedgerEntry.customer_id == customer.id,
                LedgerEntry.entry_type == "charge"
            ).scalar() or 0

            payments = db.session.query(db.func.sum(LedgerEntry.amount)).filter(
                LedgerEntry.customer_id == customer.id,
                LedgerEntry.entry_type == "payment"
            ).scalar() or 0

            balance = charges - payments

            if balance > 0:
                oldest_charge = LedgerEntry.query.filter_by(
                    customer_id=customer.id,
                    entry_type="charge"
                ).order_by(LedgerEntry.entry_date).first()

                debtors.append({
                    "id": customer.id,
                    "name": customer.name,
                    "phone": customer.phone,
                    "balance": round(balance, 2),
                    "since": oldest_charge.entry_date.isoformat() if oldest_charge else None
                })

        debtors.sort(key=lambda x: x["balance"], reverse=True)

        return jsonify({"debtors": debtors})

    @app.route("/api/businesses/<int:business_id>/customers/<int:customer_id>/whatsapp-collection-message", methods=["GET"])
    @token_required
    @module_required("accounts_receivable")
    @permission_required('clients.read')
    def get_whatsapp_collection_message(business_id, customer_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        customer = Customer.query.filter_by(id=customer_id, business_id=business_id).first()
        if not customer:
            return jsonify({"error": "Cliente no encontrado"}), 404

        # Calculate balance
        charges = db.session.query(db.func.sum(LedgerEntry.amount)).filter(
            LedgerEntry.customer_id == customer_id,
            LedgerEntry.entry_type == "charge"
        ).scalar() or 0

        payments = db.session.query(db.func.sum(LedgerEntry.amount)).filter(
            LedgerEntry.customer_id == customer_id,
            LedgerEntry.entry_type == "payment"
        ).scalar() or 0

        balance = charges - payments
        balance = round(balance, 2)

        # Format money
        try:
            formatted_balance = "{:,.0f}".format(balance).replace(",", ".")
        except:
            formatted_balance = str(balance)

        # Build message
        business_name = business.name or "nosotros"
        
        # Default template if not set
        default_template = (
            "Hola {cliente} ðŸ˜Š\n"
            "Te escribo de *{negocio}*.\n\n"
            "SegÃºn mi registro, tienes un saldo pendiente de *${deuda}*.\n"
            "Â¿Me confirmas por favor cuÃ¡ndo puedes realizar el pago?\n\n"
            "Gracias ðŸ™Œ"
        )
        
        # Get custom template if exists
        templates = business.whatsapp_templates or {}
        template = templates.get("collection_message", default_template)
        
        # Replace variables
        message = template.replace("{cliente}", customer.name)\
                          .replace("{negocio}", business_name)\
                          .replace("{deuda}", formatted_balance)

        return jsonify({
            "message": message,
            "clientName": customer.name,
            "debt": balance
        })

    def _safe_round(value, digits=2):
        return round(float(value or 0), digits)

    def _history_timestamp(value):
        if not value:
            return datetime.min
        if isinstance(value, datetime):
            return value.astimezone(timezone.utc).replace(tzinfo=None) if value.tzinfo else value
        if isinstance(value, date):
            return datetime.combine(value, datetime.min.time())
        raw_value = str(value).strip()
        if not raw_value:
            return datetime.min
        try:
            parsed = datetime.fromisoformat(raw_value.replace("Z", "+00:00"))
            return parsed.astimezone(timezone.utc).replace(tzinfo=None) if parsed.tzinfo else parsed
        except Exception:
            try:
                return datetime.combine(date.fromisoformat(raw_value[:10]), datetime.min.time())
            except Exception:
                return datetime.min

    def _load_customer_commercial_records(business_id, customer_id):
        sales = Sale.query.filter(
            Sale.business_id == business_id,
            Sale.customer_id == customer_id,
        ).order_by(Sale.sale_date.desc(), Sale.id.desc()).all()
        payments = Payment.query.options(
            joinedload(Payment.treasury_account),
        ).filter(
            Payment.business_id == business_id,
            Payment.customer_id == customer_id,
        ).order_by(Payment.payment_date.desc(), Payment.id.desc()).all()
        orders = Order.query.filter(
            Order.business_id == business_id,
            Order.customer_id == customer_id,
        ).order_by(Order.order_date.desc(), Order.id.desc()).all()
        invoices = Invoice.query.options(
            joinedload(Invoice.payments),
        ).filter(
            Invoice.business_id == business_id,
            Invoice.customer_id == customer_id,
        ).order_by(Invoice.issue_date.desc(), Invoice.id.desc()).all()
        invoice_payloads = [invoice.to_dict() for invoice in invoices]
        invoice_payments = []
        for invoice in invoices:
            for payment in invoice.payments or []:
                invoice_payments.append({
                    "invoice_id": invoice.id,
                    "invoice_number": invoice.invoice_number,
                    "payment": payment,
                })
        return {
            "sales": sales,
            "payments": payments,
            "orders": orders,
            "invoices": invoices,
            "invoice_payloads": invoice_payloads,
            "invoice_payments": invoice_payments,
        }

    def _build_customer_commercial_summary(customer, records):
        sales = records["sales"]
        payments = records["payments"]
        orders = records["orders"]
        invoice_payloads = records["invoice_payloads"]
        invoice_payments = records["invoice_payments"]

        active_invoices = [invoice for invoice in invoice_payloads if str(invoice.get("status") or "").lower() != "cancelled"]
        sales_total = _safe_round(sum(float(sale.total or 0) for sale in sales))
        sales_outstanding_balance = _safe_round(sum(float(sale.balance or 0) for sale in sales))
        order_total = _safe_round(sum(float(order.total or 0) for order in orders))
        invoice_total = _safe_round(sum(float(invoice.get("total") or 0) for invoice in active_invoices))
        invoice_outstanding_balance = _safe_round(sum(float(invoice.get("outstanding_balance") or 0) for invoice in active_invoices))
        total_paid_sales = _safe_round(sum(float(payment.amount or 0) for payment in payments))
        total_paid_invoices = _safe_round(sum(float(getattr(item["payment"], "signed_amount", item["payment"].amount or 0) or 0) for item in invoice_payments))
        purchase_documents = []
        for sale in sales:
            purchase_documents.append({
                "date": sale.sale_date.isoformat() if sale.sale_date else None,
                "total": _safe_round(sale.total),
                "type": "sale",
            })
        for invoice in active_invoices:
            purchase_documents.append({
                "date": invoice.get("issue_date"),
                "total": _safe_round(invoice.get("total")),
                "type": "invoice",
            })
        purchase_documents.sort(key=lambda item: (_history_timestamp(item.get("date")), float(item.get("total") or 0)), reverse=True)
        last_purchase = purchase_documents[0] if purchase_documents else None
        total_purchases_value = _safe_round(sales_total + invoice_total)
        total_purchases_count = len(purchase_documents)
        average_ticket = _safe_round(total_purchases_value / total_purchases_count) if total_purchases_count > 0 else 0.0
        outstanding_balance = _safe_round(sales_outstanding_balance + invoice_outstanding_balance)
        total_paid = _safe_round(total_paid_sales + total_paid_invoices)

        last_activity_candidates = [
            *(sale.sale_date.isoformat() if sale.sale_date else None for sale in sales),
            *(payment.payment_date.isoformat() if payment.payment_date else None for payment in payments),
            *(order.order_date.isoformat() if order.order_date else None for order in orders),
            *(invoice.get("issue_date") for invoice in active_invoices),
            *(item["payment"].payment_date.isoformat() if item["payment"].payment_date else None for item in invoice_payments),
        ]
        last_activity_date = None
        for candidate in last_activity_candidates:
            if not candidate:
                continue
            if last_activity_date is None or _history_timestamp(candidate) > _history_timestamp(last_activity_date):
                last_activity_date = candidate

        if outstanding_balance > 0.01:
            customer_status = "with_balance"
            customer_status_label = "Con saldo pendiente"
        elif total_purchases_count == 0 and len(orders) == 0:
            customer_status = "new"
            customer_status_label = "Sin movimientos"
        elif last_activity_date and (_history_timestamp(datetime.utcnow()) - _history_timestamp(last_activity_date)).days <= 90:
            customer_status = "active"
            customer_status_label = "Activo"
        else:
            customer_status = "inactive"
            customer_status_label = "Inactivo"

        return {
            "total_purchases_value": total_purchases_value,
            "total_purchases_count": total_purchases_count,
            "last_purchase_date": last_purchase.get("date") if last_purchase else None,
            "last_purchase_value": _safe_round(last_purchase.get("total") if last_purchase else 0),
            "outstanding_balance": outstanding_balance,
            "sales_outstanding_balance": sales_outstanding_balance,
            "invoice_outstanding_balance": invoice_outstanding_balance,
            "total_paid": total_paid,
            "average_ticket": average_ticket,
            "customer_status": customer_status,
            "customer_status_label": customer_status_label,
            "sales_count": len(sales),
            "sales_total": sales_total,
            "payment_count": len(payments),
            "orders_count": len(orders),
            "orders_total": order_total,
            "last_order_date": orders[0].order_date.isoformat() if orders and orders[0].order_date else None,
            "last_order_value": _safe_round(orders[0].total) if orders else 0.0,
            "invoice_count": len(active_invoices),
            "invoice_total": invoice_total,
            "invoice_payment_count": len(invoice_payments),
            "last_activity_date": last_activity_date,
        }

    def _build_customer_history_entries(customer, records):
        entries = []
        for sale in records["sales"]:
            entries.append({
                "id": f"sale-{sale.id}",
                "entry_type": "sale",
                "date": sale.sale_date.isoformat() if sale.sale_date else None,
                "document_id": sale.id,
                "document_label": f"Venta #{sale.id}",
                "title": f"Venta #{sale.id}",
                "subtitle": "Pagada" if sale.paid else "Con saldo pendiente",
                "amount": _safe_round(sale.total),
                "signed_amount": _safe_round(sale.total),
                "balance": _safe_round(sale.balance),
                "status": "paid" if sale.paid else "pending",
                "note": sale.note,
            })
        for payment in records["payments"]:
            entries.append({
                "id": f"payment-{payment.id}",
                "entry_type": "payment",
                "date": payment.payment_date.isoformat() if payment.payment_date else None,
                "document_id": payment.id,
                "document_label": f"Pago #{payment.id}",
                "title": "Pago recibido",
                "subtitle": payment.method or "Sin mÃ©todo",
                "amount": _safe_round(payment.amount),
                "signed_amount": _safe_round(payment.amount),
                "balance": None,
                "status": "completed",
                "note": payment.note,
                "related_sale_id": payment.sale_id,
                "treasury_account_name": payment.treasury_account.name if payment.treasury_account else None,
            })
        for order in records["orders"]:
            entries.append({
                "id": f"order-{order.id}",
                "entry_type": "order",
                "date": order.order_date.isoformat() if order.order_date else None,
                "document_id": order.id,
                "document_label": order.order_number or f"Pedido #{order.id}",
                "title": order.order_number or f"Pedido #{order.id}",
                "subtitle": order.status,
                "amount": _safe_round(order.total),
                "signed_amount": _safe_round(order.total),
                "balance": None,
                "status": order.status,
                "note": order.notes,
            })
        for invoice in records["invoice_payloads"]:
            entries.append({
                "id": f"invoice-{invoice.get('id')}",
                "entry_type": "invoice",
                "date": invoice.get("issue_date"),
                "document_id": invoice.get("id"),
                "document_label": invoice.get("invoice_number") or f"Factura #{invoice.get('id')}",
                "title": invoice.get("invoice_number") or f"Factura #{invoice.get('id')}",
                "subtitle": invoice.get("status") or "draft",
                "amount": _safe_round(invoice.get("total")),
                "signed_amount": _safe_round(invoice.get("total")),
                "balance": _safe_round(invoice.get("outstanding_balance")),
                "status": invoice.get("status") or "draft",
                "note": invoice.get("notes"),
            })
        for item in records["invoice_payments"]:
            payment = item["payment"]
            event_type = str(payment.event_type or "payment").strip().lower() or "payment"
            entries.append({
                "id": f"invoice-payment-{payment.id}",
                "entry_type": f"invoice_{event_type}",
                "date": payment.payment_date.isoformat() if payment.payment_date else None,
                "document_id": payment.id,
                "document_label": item["invoice_number"] or f"Factura #{item['invoice_id']}",
                "title": item["invoice_number"] or f"Factura #{item['invoice_id']}",
                "subtitle": event_type,
                "amount": _safe_round(payment.amount),
                "signed_amount": _safe_round(getattr(payment, "signed_amount", payment.amount or 0)),
                "balance": None,
                "status": event_type,
                "note": payment.note,
                "related_invoice_id": item["invoice_id"],
            })

        entries.sort(key=lambda item: (_history_timestamp(item.get("date")), str(item.get("id") or "")), reverse=True)
        return entries

    @app.route("/api/businesses/<int:business_id>/customers/<int:customer_id>", methods=["GET"])
    @token_required
    @module_required("customers")
    def get_customer(business_id, customer_id):
        customer = Customer.query.filter_by(id=customer_id, business_id=business_id).first()
        if not customer:
            return jsonify({"error": "Cliente no encontrado"}), 404

        records = _load_customer_commercial_records(business_id, customer_id)
        summary = _build_customer_commercial_summary(customer, records)

        customer_data = customer.to_dict()
        customer_data["balance"] = _safe_round(summary["outstanding_balance"])
        customer_data["sales_balance"] = _safe_round(summary["sales_outstanding_balance"])
        customer_data["invoice_balance"] = _safe_round(summary["invoice_outstanding_balance"])
        customer_data["total_balance"] = _safe_round(summary["outstanding_balance"])
        customer_data.update(summary)
        customer_data["commercial_summary"] = summary

        return jsonify({"customer": customer_data})

    @app.route("/api/businesses/<int:business_id>/customers/<int:customer_id>/history", methods=["GET"])
    @token_required
    @module_required("customers")
    def get_customer_history(business_id, customer_id):
        customer = Customer.query.filter_by(id=customer_id, business_id=business_id).first()
        if not customer:
            return jsonify({"error": "Cliente no encontrado"}), 404

        page = max(int(request.args.get("page") or 1), 1)
        per_page = min(max(int(request.args.get("per_page") or 20), 1), 50)
        records = _load_customer_commercial_records(business_id, customer_id)
        entries = _build_customer_history_entries(customer, records)
        total = len(entries)
        start = (page - 1) * per_page
        end = start + per_page
        paginated_entries = entries[start:end]
        pages = (total + per_page - 1) // per_page if total > 0 else 0

        return jsonify({
            "customer_id": customer_id,
            "history": paginated_entries,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "pages": pages,
                "has_more": end < total,
            },
        })

    @app.route("/api/businesses/<int:business_id>/customers/<int:customer_id>", methods=["PUT"])
    @token_required
    @module_required("customers")
    @permission_required('clients.update')
    def update_customer(business_id, customer_id):
        customer = Customer.query.filter_by(id=customer_id, business_id=business_id).first()
        if not customer:
            return jsonify({"error": "Cliente no encontrado"}), 404

        before_snapshot = _audit_snapshot("customer", customer)
        data = request.get_json() or {}
        if "name" in data:
            customer.name = data["name"].strip()
        if "phone" in data:
            customer.phone = data["phone"].strip() or None
        if "address" in data:
            customer.address = data["address"].strip() or None
        if "notes" in data:
            customer.notes = data["notes"].strip() or None
        if "active" in data:
            customer.active = bool(data["active"])

        customer.updated_by_user_id = g.current_user.id
        _record_business_audit(
            business_id=business_id,
            actor_user=g.current_user,
            module="customers",
            entity_type="customer",
            entity_id=customer.id,
            action="update",
            summary=f"ActualizÃ³ el cliente {customer.name}",
            detail="Se modificaron los datos del cliente.",
            metadata=_build_audit_metadata(
                source_path=f"/customers/{customer.id}",
                changed_fields=sorted((data or {}).keys()),
            ),
            before=before_snapshot,
            after=_audit_snapshot("customer", customer),
        )
        db.session.commit()
        return jsonify({"customer": customer.to_dict()})

    @app.route("/api/businesses/<int:business_id>/customers/<int:customer_id>", methods=["DELETE"])
    @token_required
    @module_required("customers")
    @permission_required('clients.delete')
    def delete_customer(business_id, customer_id):
        customer = Customer.query.filter_by(id=customer_id, business_id=business_id).first()
        if not customer:
            return jsonify({"error": "Cliente no encontrado"}), 404

        before_snapshot = _audit_snapshot("customer", customer)
        _record_business_audit(
            business_id=business_id,
            actor_user=g.current_user,
            module="customers",
            entity_type="customer",
            entity_id=customer.id,
            action="delete",
            summary=f"EliminÃ³ el cliente {customer.name}",
            detail="Se eliminÃ³ el registro del cliente del negocio.",
            metadata=_build_audit_metadata(source_path="/customers"),
            before=before_snapshot,
        )
        db.session.delete(customer)
        db.session.commit()
        return jsonify({"ok": True})
    @app.route("/api/businesses/<int:business_id>/sales", methods=["GET"])
    @token_required
    @module_required("sales")
    @permission_required('sales.read')
    def get_sales(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        # Get date filters
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        search = request.args.get("search")
        status = request.args.get("status")
        include_items = str(request.args.get("include_items", "false")).strip().lower() in {"true", "1", "yes"}

        query = Sale.query.options(
            joinedload(Sale.customer),
            joinedload(Sale.treasury_account),
        ).filter_by(business_id=business_id)

        if start_date:
            try:
                start = datetime.strptime(start_date, "%Y-%m-%d").date()
                query = query.filter(Sale.sale_date >= start)
            except:
                pass

        if end_date:
            try:
                end = datetime.strptime(end_date, "%Y-%m-%d").date()
                query = query.filter(Sale.sale_date <= end)
            except:
                pass

        if search:
            # Search in customer name through customer relationship
            query = query.join(Customer, Sale.customer_id == Customer.id).filter(
                Customer.name.ilike(f"%{search}%")
            )

        if status == 'paid':
            query = query.filter(Sale.paid == True)
        elif status == 'pending':
            query = query.filter(Sale.paid == False)

        sales = query.order_by(Sale.sale_date.desc()).limit(500).all()
        if include_items:
            sales_payload = [sale.to_dict(include_items=True) for sale in sales]
        else:
            sales_payload = [serialize_sale_list_payload(sale) for sale in sales]
        return jsonify({"sales": sales_payload})

    @app.route("/api/businesses/<int:business_id>/sales/<int:sale_id>", methods=["GET"])
    @token_required
    @module_required("sales")
    @permission_required('sales.read')
    def get_sale(business_id, sale_id):
        sale = Sale.query.options(
            joinedload(Sale.customer),
            joinedload(Sale.treasury_account),
        ).filter_by(id=sale_id, business_id=business_id).first()
        if not sale:
            return jsonify({"error": "Venta no encontrada"}), 404
        return jsonify({"sale": sale.to_dict(include_items=True)})

    @app.route("/api/businesses/<int:business_id>/sales", methods=["POST"])
    @token_required
    @module_required("sales")
    @permission_required('sales.create')
    def create_sale(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        # Plan FREE: limitar a 20 ventas (Solo para dueÃ±os, empleados heredan el plan del negocio)
        effective_plan = g.current_user.plan
        if g.current_user.account_type == 'team_member' and business:
            effective_plan = business.user.plan if business.user else 'free'
            
        if effective_plan == "free":
            sales_count = Sale.query.filter_by(business_id=business_id).count()
            if sales_count >= 20:
                return jsonify({
                    "error": "El plan gratuito de este negocio permite hasta 20 ventas. El administrador debe actualizar a Pro para seguir registrando.",
                    "upgrade_url": "/upgrade"
                }), 403

        data = request.get_json() or {}
        items = data.get("items", [])

        if not items:
            return jsonify({"error": "Items de venta son requeridos"}), 400

        # Calculate totals
        subtotal = sum(item.get("total", 0) for item in items)
        discount = float(data.get("discount", 0))
        total = subtotal - discount

        if total <= 0:
            return jsonify({"error": "Total debe ser mayor a 0"}), 400

        payment_method = data.get("payment_method", "cash")
        
        # Handle payment status logic correctly respecting frontend input
        frontend_paid = data.get("paid")
        amount_paid = float(data.get("amount_paid", 0))
        
        if frontend_paid is not None:
            # New logic supporting partial/credit
            if frontend_paid: # Fully paid
                amount_paid = total
                balance = 0
                is_paid = True
            else: # Credit or Partial
                balance = max(0, total - amount_paid)
                is_paid = balance <= 0.01 # Float tolerance
        else:
            # Fallback for old clients/calls
            if payment_method == "credit":
                amount_paid = 0
                balance = total
                is_paid = False
            else:
                amount_paid = total
                balance = 0
                is_paid = True

        try:
            treasury_account_id = (
                _resolve_treasury_account_id(
                    business_id,
                    payment_method=payment_method,
                    treasury_account_id=data.get("treasury_account_id"),
                )
                if amount_paid > 0
                else None
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

        if amount_paid > 0 and treasury_account_id is None:
            return jsonify({"error": "Debes seleccionar o configurar una cuenta de caja para registrar una venta pagada"}), 400

        # Parse sale date
        sale_date = date.today()
        if data.get("sale_date"):
            try:
                sale_date = datetime.strptime(data["sale_date"], "%Y-%m-%d").date()
            except:
                pass

        role_snapshot = get_current_role_snapshot(g.current_user, business_id)

        sale = Sale(
            business_id=business_id,
            user_id=g.current_user.id,
            customer_id=data.get("customer_id"),
            sale_date=sale_date,
            items=items,
            subtotal=subtotal,
            discount=discount,
            total=total,
            balance=balance,
            collected_amount=amount_paid,
            treasury_account_id=treasury_account_id if amount_paid > 0 else None,
            payment_method=payment_method,
            paid=is_paid,
            note=data.get("note", "").strip() or None,
            created_by_name=g.current_user.name,
            created_by_role=role_snapshot,
            updated_by_user_id=g.current_user.id
        )

        try:
            db.session.add(sale)
            db.session.flush()  # Get sale.id
            sale.total_cost = _apply_sale_inventory_effects(
                business=business,
                sale=sale,
                items=items,
                actor_user=g.current_user,
                role_snapshot=role_snapshot,
            )
        except ValueError as exc:
            db.session.rollback()
            return jsonify({"error": str(exc)}), 400
        except Exception as e:
            db.session.rollback()
            print(f"Error applying sale inventory effects: {e}")
            return jsonify({"error": "No fue posible aplicar inventario y consumos de la venta"}), 500
        
        # If not fully paid and customer exists, update Ledger (Accounts Receivable)
        if not is_paid and data.get("customer_id"):
            # 1. Create Charge for the FULL amount
            charge = LedgerEntry(
                business_id=business_id,
                customer_id=data["customer_id"],
                entry_type="charge",
                amount=total,
                entry_date=sale_date,
                note=f"Venta #{sale.id}",
                ref_type="sale",
                ref_id=sale.id
            )
            db.session.add(charge)
            
            # 2. If there was a partial payment, create a Payment entry
            if amount_paid > 0:
                ledger_payment = LedgerEntry(
                    business_id=business_id,
                    customer_id=data["customer_id"],
                    entry_type="payment",
                    amount=amount_paid,
                    entry_date=sale_date,
                    note=f"Abono inicial Venta #{sale.id}",
                    ref_type="sale",
                    ref_id=sale.id
                )
                db.session.add(ledger_payment)

        if amount_paid > 0 and data.get("customer_id"):
            payment = Payment(
                business_id=business_id,
                customer_id=data["customer_id"],
                sale_id=sale.id,
                payment_date=sale_date,
                amount=amount_paid,
                method=payment_method,
                treasury_account_id=treasury_account_id,
                note=data.get("note", "").strip() or None,
                created_by_user_id=g.current_user.id,
                created_by_name=g.current_user.name,
                created_by_role=role_snapshot,
                updated_by_user_id=g.current_user.id,
            )
            db.session.add(payment)

        mark_business_payloads_dirty(business_id, [sale_date])
        _record_business_audit(
            business_id=business_id,
            actor_user=g.current_user,
            module="sales",
            entity_type="sale",
            entity_id=sale.id,
            action="create",
            summary=f"RegistrÃ³ la venta #{sale.id}",
            detail=f"Venta por {total} con mÃ©todo {payment_method}.",
            metadata=_build_audit_metadata(
                source_path=f"/sales/{sale.id}",
                customer_id=sale.customer_id,
                item_count=len(items),
                total=total,
                balance=balance,
                payment_method=payment_method,
            ),
            after=_audit_snapshot("sale", sale),
        )
        db.session.commit()

        # Generate invoice URL
        try:
            s = URLSafeTimedSerializer(app.config["SECRET_KEY"])
            token = s.dumps(sale.id, salt="receipt-view")
            invoice_url = url_for('public_receipt', token=token, _external=True)
        except Exception:
            invoice_url = ""

        return jsonify({
            "sale": sale.to_dict(),
            "invoice_url": invoice_url
        }), 201

    @app.route("/api/businesses/<int:business_id>/sales/<int:sale_id>", methods=["PUT"])
    @token_required
    @module_required("sales")
    @permission_required('sales.update')
    def update_sale(business_id, sale_id):
        sale = Sale.query.filter_by(id=sale_id, business_id=business_id).first()
        if not sale:
            return jsonify({"error": "Venta no encontrada"}), 404

        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        data = request.get_json() or {}
        before_snapshot = _audit_snapshot("sale", sale)
        original_sale_date = sale.sale_date

        note_text = str(sale.note or "")
        if "Desde pedido" in note_text:
            return jsonify({"error": "Las ventas generadas desde pedidos deben corregirse desde el pedido original o eliminarse para reabrirlo."}), 400

        linked_payments = Payment.query.filter_by(business_id=business_id, sale_id=sale.id).order_by(Payment.id.asc()).all()
        linked_payment_ids = {int(payment.id) for payment in linked_payments}
        charge_entry = LedgerEntry.query.filter_by(ref_type="sale", ref_id=sale.id, entry_type="charge").first()
        allocation_payment_ids = set()
        if charge_entry is not None:
            allocations = LedgerAllocation.query.filter_by(charge_id=charge_entry.id).all()
            for allocation in allocations:
                payment_entry = LedgerEntry.query.get(allocation.payment_id)
                if not payment_entry or payment_entry.ref_type != "payment" or payment_entry.ref_id is None:
                    continue
                allocation_payment_ids.add(int(payment_entry.ref_id))

        related_payment_ids = sorted(linked_payment_ids | allocation_payment_ids)
        related_payments = Payment.query.filter(Payment.id.in_(related_payment_ids)).all() if related_payment_ids else []
        total_related_payments = round(sum(float(payment.amount or 0) for payment in related_payments), 2)
        has_external_allocations = any(payment_id not in linked_payment_ids for payment_id in allocation_payment_ids)
        if has_external_allocations or len(related_payment_ids) > 1 or abs(total_related_payments - float(sale.collected_amount or 0)) > 0.01:
            return jsonify({"error": "Esta venta ya tiene cobros o asignaciones relacionadas. Para corregirla primero ajusta o elimina esos cobros desde cartera."}), 400

        items = data.get("items") if data.get("items") is not None else sale.items
        if not isinstance(items, list) or len(items) == 0:
            return jsonify({"error": "Debes mantener al menos un producto o servicio en la venta"}), 400

        subtotal = float(data.get("subtotal") if data.get("subtotal") is not None else sum(float((item or {}).get("total") or 0) for item in items))
        discount = float(data.get("discount") if data.get("discount") is not None else sale.discount or 0)
        total = float(data.get("total") if data.get("total") is not None else max(subtotal - discount, 0))
        if total <= 0:
            return jsonify({"error": "Total invÃ¡lido"}), 400

        sale_date = original_sale_date or date.today()
        if data.get("sale_date"):
            try:
                sale_date = datetime.strptime(data["sale_date"], "%Y-%m-%d").date()
            except Exception:
                return jsonify({"error": "Fecha invÃ¡lida"}), 400

        customer_id = sale.customer_id
        if "customer_id" in data:
            customer_id = data.get("customer_id")
            if customer_id in ("", None):
                customer_id = None

        payment_method = str(data.get("payment_method") or sale.payment_method or "cash")
        raw_paid_amount = data.get("amount_paid") if data.get("amount_paid") is not None else data.get("collected_amount")
        if raw_paid_amount is None:
            raw_paid_amount = sale.collected_amount or 0
        try:
            collected_amount = round(float(raw_paid_amount or 0), 2)
        except (TypeError, ValueError):
            return jsonify({"error": "Monto pagado invÃ¡lido"}), 400

        if data.get("paid") is True:
            collected_amount = round(float(total), 2)
        collected_amount = round(max(0.0, min(float(total), collected_amount)), 2)
        balance = round(max(0.0, float(total) - collected_amount), 2)
        is_paid = balance <= 0.01

        if not is_paid and not customer_id:
            return jsonify({"error": "Para dejar saldo pendiente debes seleccionar un cliente"}), 400

        treasury_account_id = None
        if collected_amount > 0.01:
            try:
                treasury_context = resolve_treasury_context(
                    business_id,
                    treasury_account_id=data.get("treasury_account_id", sale.treasury_account_id),
                    payment_method=payment_method,
                    allow_account_autoselect=True,
                    require_account=True,
                    missing_account_message="Debes seleccionar o configurar una cuenta de caja para registrar una venta pagada",
                )
            except ValueError as exc:
                return jsonify({"error": str(exc)}), 400
            treasury_account_id = treasury_context.get("treasury_account_id")
            payment_method = treasury_context.get("payment_method") or payment_method

        role_snapshot = get_current_role_snapshot(g.current_user, business_id)
        try:
            reverse_sale_operational_effects(
                business=business,
                sale=sale,
                actor_user=g.current_user,
                role_snapshot=role_snapshot,
            )
            financial_cleanup = delete_sale_financial_effects(sale=sale)

            sale.customer_id = customer_id
            sale.items = items
            sale.subtotal = subtotal
            sale.discount = discount
            sale.total = total
            sale.sale_date = sale_date
            sale.payment_method = payment_method
            sale.note = data.get("note") if "note" in data else sale.note
            sale.collected_amount = collected_amount
            sale.balance = 0.0 if is_paid else balance
            sale.paid = is_paid
            sale.treasury_account_id = treasury_account_id if collected_amount > 0.01 else None
            sale.updated_by_user_id = g.current_user.id
            sale.total_cost = apply_sale_inventory_effects(
                business=business,
                sale=sale,
                items=items,
                actor_user=g.current_user,
                role_snapshot=role_snapshot,
            )
        except ValueError as exc:
            db.session.rollback()
            return jsonify({"error": str(exc)}), 400
        except Exception:
            db.session.rollback()
            return jsonify({"error": "No fue posible recalcular inventario y efectos financieros de la venta"}), 500

        payment = None
        if customer_id and collected_amount > 0.01:
            payment = Payment(
                business_id=business_id,
                customer_id=customer_id,
                sale_id=sale.id,
                payment_date=sale_date,
                amount=collected_amount,
                method=payment_method,
                treasury_account_id=treasury_account_id,
                note=(str(sale.note or "").strip() or f"Abono inicial Venta #{sale.id}"),
                created_by_user_id=g.current_user.id,
                created_by_name=g.current_user.name,
                created_by_role=role_snapshot,
                updated_by_user_id=g.current_user.id,
            )
            db.session.add(payment)
            db.session.flush()

        if customer_id:
            create_sale_financial_entries(
                sale=sale,
                payment=payment,
                payment_note=f"Abono inicial Venta #{sale.id}" if payment is not None else None,
            )

        affected_dates = set(financial_cleanup.get("affected_dates") or [])
        if original_sale_date:
            affected_dates.add(original_sale_date)
        if sale.sale_date:
            affected_dates.add(sale.sale_date)
        refresh_summary_materialized_days(business_id, *sorted(affected_dates))
        _record_business_audit(
            business_id=business_id,
            actor_user=g.current_user,
            module="sales",
            entity_type="sale",
            entity_id=sale.id,
            action="update",
            summary=f"ActualizÃ³ la venta #{sale.id}",
            detail="Se recalculÃ³ el cargo preservando pagos y asignaciones existentes.",
            metadata=_build_audit_metadata(
                source_path=f"/sales/{sale.id}",
                changed_fields=sorted((data or {}).keys()),
                total=sale.total,
                balance=sale.balance,
            ),
            before=before_snapshot,
            after=_audit_snapshot("sale", sale),
        )

        db.session.commit()
        return jsonify({"sale": sale.to_dict()})

    @app.route("/api/businesses/<int:business_id>/sales/<int:sale_id>", methods=["DELETE"])
    @token_required
    @module_required("sales")
    @permission_required('sales.delete')
    def delete_sale(business_id, sale_id):
        sale = Sale.query.filter_by(id=sale_id, business_id=business_id).first()
        if not sale:
            return jsonify({"error": "Venta no encontrada"}), 404

        business = Business.query.get(business_id)
        role_snapshot = get_current_role_snapshot(g.current_user, business_id)
        before_snapshot = _audit_snapshot("sale", sale)
        reverse_sale_operational_effects(
            business=business,
            sale=sale,
            actor_user=g.current_user,
            role_snapshot=role_snapshot,
        )
        clear_sale_origin_links(sale=sale)
        financial_cleanup = delete_sale_financial_effects(sale=sale)
        _record_business_audit(
            business_id=business_id,
            actor_user=g.current_user,
            module="sales",
            entity_type="sale",
            entity_id=sale.id,
            action="delete",
            summary=f"EliminÃ³ la venta #{sale.id}",
            detail="Se eliminÃ³ una venta y sus movimientos asociados de cartera.",
            metadata=_build_audit_metadata(
                source_path="/sales",
                customer_id=sale.customer_id,
                total=sale.total,
            ),
            before=before_snapshot,
        )
        db.session.delete(sale)
        affected_dates = set(financial_cleanup.get("affected_dates") or [])
        if sale.sale_date:
            affected_dates.add(sale.sale_date)
        refresh_summary_materialized_days(business_id, *sorted(affected_dates))
        db.session.commit()
        return jsonify({"ok": True})

    @app.route("/api/businesses/<int:business_id>/expenses/<int:expense_id>", methods=["PUT"])
    @token_required
    @permission_required('expenses.update')
    def update_expense(business_id, expense_id):
        expense = Expense.query.filter_by(id=expense_id, business_id=business_id).first()
        if not expense:
            return jsonify({"error": "Gasto no encontrado"}), 404

        if (expense.source_type or "manual") in {"debt_payment", "supplier_payment", "purchase_payment"}:
            return jsonify({"error": "Este gasto se gestiona desde su flujo de origen y no puede editarse manualmente."}), 400

        original_expense_date = expense.expense_date
        data = request.get_json() or {}
        if "amount" in data:
            try:
                next_amount = float(data["amount"])
                if next_amount <= 0:
                    raise ValueError()
                expense.amount = next_amount
            except (TypeError, ValueError):
                return jsonify({"error": "Monto debe ser un nÃºmero positivo"}), 400
        if "category" in data:
            expense.category = data["category"].strip()
        if "description" in data:
            expense.description = data["description"].strip() or None
        if "expense_date" in data:
            try:
                expense.expense_date = datetime.strptime(data["expense_date"], "%Y-%m-%d").date()
            except:
                pass
        if "treasury_account_id" in data or "payment_method" in data:
            try:
                treasury_context = resolve_treasury_context(
                    business_id,
                    treasury_account_id=data.get("treasury_account_id", expense.treasury_account_id),
                    payment_method=data.get("payment_method", expense.payment_method),
                    allow_account_autoselect=True,
                    require_account=False,
                )
            except ValueError as exc:
                return jsonify({"error": str(exc)}), 400
            expense.treasury_account_id = treasury_context.get("treasury_account_id")
            expense.payment_method = treasury_context.get("payment_method")

        expense.updated_by_user_id = g.current_user.id
        refresh_summary_materialized_days(business_id, original_expense_date, expense.expense_date)
        mark_business_payloads_dirty(business_id, [original_expense_date, expense.expense_date])
        db.session.commit()
        return jsonify({"expense": expense.to_dict()})

    @app.route("/api/businesses/<int:business_id>/expenses/<int:expense_id>", methods=["DELETE"])
    @token_required
    @permission_required('expenses.delete')
    def delete_expense(business_id, expense_id):
        expense = Expense.query.filter_by(id=expense_id, business_id=business_id).first()
        if not expense:
            return jsonify({"error": "Gasto no encontrado"}), 404

        if (expense.source_type or "manual") in {"debt_payment", "supplier_payment", "purchase_payment"}:
            return jsonify({"error": "Este gasto se corrige desde su flujo de origen y no puede eliminarse manualmente."}), 400

        affected_expense_date = expense.expense_date
        db.session.delete(expense)
        refresh_summary_materialized_days(business_id, affected_expense_date)
        mark_business_payloads_dirty(business_id, [affected_expense_date])
        db.session.commit()
        return jsonify({"ok": True})

    @app.route("/api/businesses/<int:business_id>/payments", methods=["GET"])
    @token_required
    @module_required("accounts_receivable")
    @permission_required('payments.read')
    def get_payments(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        search = (request.args.get("search") or "").strip()
        include_allocations = str(request.args.get("include_allocations", "false")).strip().lower() in {"true", "1", "yes"}

        query = Payment.query.options(
            joinedload(Payment.customer),
            joinedload(Payment.treasury_account),
        ).filter(
            Payment.business_id == business_id,
        )

        if start_date:
            try:
                start = datetime.strptime(start_date, "%Y-%m-%d").date()
                query = query.filter(Payment.payment_date >= start)
            except:
                pass

        if end_date:
            try:
                end = datetime.strptime(end_date, "%Y-%m-%d").date()
                query = query.filter(Payment.payment_date <= end)
            except:
                pass

        if search:
            query = query.outerjoin(Customer, Payment.customer_id == Customer.id).filter(
                or_(
                    Customer.name.ilike(f"%{search}%"),
                    Payment.note.ilike(f"%{search}%"),
                )
            )

        payments = query.order_by(Payment.payment_date.desc(), Payment.created_at.desc()).all()
        allocations_map = get_payment_allocations_map([payment.id for payment in payments]) if include_allocations else None
        return jsonify({
            "payments": [
                serialize_payment_payload(payment, allocations_map, include_allocations=include_allocations)
                for payment in payments
            ]
        })

    @app.route("/api/businesses/<int:business_id>/payments", methods=["POST"])
    @token_required
    @module_required("accounts_receivable")
    @permission_required('payments.create')
    def create_payment(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        data = request.get_json() or {}
        customer_id = data.get("customer_id")
        amount = data.get("amount")

        if not customer_id:
            return jsonify({"error": "Cliente es requerido"}), 400

        try:
            amount = float(amount)
            if amount <= 0:
                raise ValueError()
        except:
            return jsonify({"error": "Monto debe ser un nÃºmero positivo"}), 400

        payment_date = date.today()
        if data.get("payment_date"):
            try:
                payment_date = datetime.strptime(data["payment_date"], "%Y-%m-%d").date()
            except:
                pass

        role_snapshot = get_current_role_snapshot(g.current_user, business_id)
        try:
            treasury_context = resolve_treasury_context(
                business_id,
                treasury_account_id=data.get("treasury_account_id"),
                payment_method=data.get("method"),
                allow_account_autoselect=True,
                require_account=True,
                missing_account_message="Debes seleccionar o configurar una cuenta de caja para registrar el pago",
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

        payment = Payment(
            business_id=business_id,
            customer_id=customer_id,
            sale_id=data.get("sale_id"),
            payment_date=payment_date,
            amount=amount,
            method=treasury_context.get("payment_method"),
            treasury_account_id=treasury_context.get("treasury_account_id"),
            note=data.get("note", "").strip() or None,
            created_by_user_id=g.current_user.id,
            created_by_name=g.current_user.name,
            created_by_role=role_snapshot,
            updated_by_user_id=g.current_user.id
        )

        db.session.add(payment)
        db.session.flush()

        # Create ledger entry
        ledger_entry = LedgerEntry(
            business_id=business_id,
            customer_id=customer_id,
            entry_type="payment",
            amount=amount,
            entry_date=payment_date,
            note=data.get("note", "").strip() or f"Pago #{payment.id}",
            ref_type="payment",
            ref_id=payment.id
        )
        db.session.add(ledger_entry)
        db.session.flush()

        # --- Auto-allocation Logic ---
        # Automatically apply payment to pending sales (FIFO)
        remaining_payment = amount
        realized_cost_total = 0.0
        
        # Find pending sales for this customer, ordered by date
        pending_sales = Sale.query.filter(
            Sale.business_id == business_id,
            Sale.customer_id == customer_id,
            Sale.paid == False
        ).order_by(Sale.sale_date.asc()).all()
        
        for sale in pending_sales:
            if remaining_payment <= 0.01:
                break
                
            # Calculate amount to pay for this sale
            sale_balance = sale.balance
            
            # Amount we can pay
            amount_to_pay = min(sale_balance, remaining_payment)
            
            if amount_to_pay > 0:
                # Update sale balance
                sale.balance -= amount_to_pay
                sale.collected_amount = round(float(sale.collected_amount or 0) + amount_to_pay, 2)
                sale_total = float(sale.total or 0)
                sale_cost = float(sale.total_cost or 0)
                if sale_total > 0 and sale_cost > 0:
                    realized_cost_total += amount_to_pay * (sale_cost / sale_total)
                remaining_payment -= amount_to_pay
                
                # If balance is effectively zero, mark as paid
                if sale.balance <= 0.01:
                    sale.balance = 0
                    sale.paid = True
                
                # Find associated ledger charge
                charge_entry = LedgerEntry.query.filter_by(
                    business_id=business_id,
                    customer_id=customer_id,
                    ref_type='sale',
                    ref_id=sale.id,
                    entry_type='charge'
                ).first()
                
                # Create allocation record
                if charge_entry:
                    allocation = LedgerAllocation(
                        payment_id=ledger_entry.id,
                        charge_id=charge_entry.id,
                        amount=amount_to_pay
                    )
                    db.session.add(allocation)

        mark_business_payloads_dirty(business_id, [payment_date])
        _record_business_audit(
            business_id=business_id,
            actor_user=g.current_user,
            module="accounts_receivable",
            entity_type="payment",
            entity_id=payment.id,
            action="pay",
            summary=f"RegistrÃ³ el pago #{payment.id}",
            detail=f"Pago por {amount} para el cliente #{customer_id}.",
            metadata=_build_audit_metadata(
                source_path=f"/payments/{payment.id}",
                customer_id=customer_id,
                sale_id=payment.sale_id,
                amount=amount,
                method=payment.method,
            ),
            after=_audit_snapshot("payment", payment),
        )
        db.session.commit()

        return jsonify({"payment": payment.to_dict()}), 201

    @app.route("/api/businesses/<int:business_id>/payments/<int:payment_id>", methods=["PUT"])
    @token_required
    @module_required("accounts_receivable")
    @permission_required('payments.update')
    def update_payment(business_id, payment_id):
        payment = Payment.query.filter_by(id=payment_id, business_id=business_id).first()
        if not payment:
            return jsonify({"error": "Pago no encontrado"}), 404

        before_snapshot = _audit_snapshot("payment", payment)
        original_payment_date = payment.payment_date
        data = request.get_json() or {}
        
        # 1. Handle Amount Change (Complex)
        if "amount" in data and float(data["amount"]) != payment.amount:
            new_amount = float(data["amount"])
            if new_amount <= 0:
                return jsonify({"error": "Monto debe ser positivo"}), 400

            # A. Reverse old allocations
            ledger_entry = LedgerEntry.query.filter_by(ref_type="payment", ref_id=payment.id).first()
            if ledger_entry:
                allocations = LedgerAllocation.query.filter_by(payment_id=ledger_entry.id).all()
                for alloc in allocations:
                    charge = LedgerEntry.query.get(alloc.charge_id)
                    if charge and charge.ref_type == "sale":
                        sale = Sale.query.get(charge.ref_id)
                        if sale:
                            sale.balance += alloc.amount
                            sale.collected_amount = round(max(0.0, float(sale.collected_amount or 0) - alloc.amount), 2)
                            if sale.balance > 0.01:
                                sale.paid = False
                
                # Delete old allocations
                LedgerAllocation.query.filter_by(payment_id=ledger_entry.id).delete()
                
                # Update Ledger Entry
                ledger_entry.amount = new_amount
            
            # Update Payment
            payment.amount = new_amount
            
            # B. Re-allocate new amount (Copy of create_payment logic)
            # Find pending sales for this customer, ordered by date
            # Note: We include sales that might have just been reopened by the reversal above
            remaining_payment = new_amount
            customer_id = payment.customer_id
            
            if ledger_entry:
                pending_sales = Sale.query.filter(
                    Sale.business_id == business_id,
                    Sale.customer_id == customer_id,
                    Sale.paid == False
                ).order_by(Sale.sale_date.asc()).all()
                
                for sale in pending_sales:
                    if remaining_payment <= 0.01:
                        break
                        
                    sale_balance = sale.balance
                    amount_to_pay = min(sale_balance, remaining_payment)
                    
                    if amount_to_pay > 0:
                        sale.balance -= amount_to_pay
                        sale.collected_amount = round(float(sale.collected_amount or 0) + amount_to_pay, 2)
                        remaining_payment -= amount_to_pay
                        
                        if sale.balance <= 0.01:
                            sale.balance = 0
                            sale.paid = True
                        
                        charge_entry = LedgerEntry.query.filter_by(
                            business_id=business_id,
                            customer_id=customer_id,
                            ref_type='sale',
                            ref_id=sale.id,
                            entry_type='charge'
                        ).first()
                        
                        if charge_entry:
                            allocation = LedgerAllocation(
                                payment_id=ledger_entry.id,
                                charge_id=charge_entry.id,
                                amount=amount_to_pay
                            )
                            db.session.add(allocation)

        # 2. Handle Simple Fields
        if "payment_date" in data:
            try:
                new_date = datetime.strptime(data["payment_date"], "%Y-%m-%d").date()
                payment.payment_date = new_date
                # Update ledger entry date too
                ledger_entry = LedgerEntry.query.filter_by(ref_type="payment", ref_id=payment.id).first()
                if ledger_entry:
                    ledger_entry.entry_date = new_date
            except:
                pass

        if "method" in data or "treasury_account_id" in data:
            try:
                resolved_payment_method = data.get("method")
                if resolved_payment_method in (None, "") and "treasury_account_id" not in data:
                    resolved_payment_method = payment.method
                treasury_context = resolve_treasury_context(
                    business_id,
                    treasury_account_id=data.get("treasury_account_id", payment.treasury_account_id),
                    payment_method=resolved_payment_method,
                    allow_account_autoselect=True,
                    require_account=True,
                    missing_account_message="Debes seleccionar o configurar una cuenta de caja para registrar el pago",
                )
            except ValueError as exc:
                return jsonify({"error": str(exc)}), 400
            payment.method = treasury_context.get("payment_method")
            payment.treasury_account_id = treasury_context.get("treasury_account_id")
            
        if "note" in data:
            payment.note = data["note"]
            # Update ledger entry note too
            ledger_entry = LedgerEntry.query.filter_by(ref_type="payment", ref_id=payment.id).first()
            if ledger_entry:
                ledger_entry.note = data["note"]

        refresh_summary_materialized_days(business_id, original_payment_date, payment.payment_date)
        _record_business_audit(
            business_id=business_id,
            actor_user=g.current_user,
            module="accounts_receivable",
            entity_type="payment",
            entity_id=payment.id,
            action="update",
            summary=f"ActualizÃ³ el pago #{payment.id}",
            detail="Se modificaron datos del pago o su asignaciÃ³n de cartera.",
            metadata=_build_audit_metadata(
                source_path=f"/payments/{payment.id}",
                changed_fields=sorted((data or {}).keys()),
            ),
            before=before_snapshot,
            after=_audit_snapshot("payment", payment),
        )
        db.session.commit()
        return jsonify({"payment": payment.to_dict()})

    @app.route("/api/businesses/<int:business_id>/payments/<int:payment_id>", methods=["DELETE"])
    @token_required
    @module_required("accounts_receivable")
    @permission_required('payments.delete')
    def delete_payment(business_id, payment_id):
        payment = Payment.query.filter_by(id=payment_id, business_id=business_id).first()
        if not payment:
            return jsonify({"error": "Pago no encontrado"}), 404

        before_snapshot = _audit_snapshot("payment", payment)
        affected_payment_date = payment.payment_date
        # Reverse allocations
        ledger_entry = LedgerEntry.query.filter_by(ref_type="payment", ref_id=payment.id).first()
        if ledger_entry:
            allocations = LedgerAllocation.query.filter_by(payment_id=ledger_entry.id).all()
            for alloc in allocations:
                # Find the charge (sale) and restore balance
                charge = LedgerEntry.query.get(alloc.charge_id)
                if charge and charge.ref_type == "sale":
                    sale = Sale.query.get(charge.ref_id)
                    if sale:
                        sale.balance += alloc.amount
                        sale.collected_amount = round(max(0.0, float(sale.collected_amount or 0) - alloc.amount), 2)
                        # If balance restored, it might not be paid anymore? 
                        # Actually, if balance > 0, it's not paid.
                        # Floating point tolerance
                        if sale.balance > 0.01:
                            sale.paid = False
            
            affected_payment_date = payment.payment_date
        if ledger_entry:
            LedgerAllocation.query.filter_by(payment_id=ledger_entry.id).delete()
            db.session.delete(ledger_entry)
        _record_business_audit(
            business_id=business_id,
            actor_user=g.current_user,
            module="accounts_receivable",
            entity_type="payment",
            entity_id=payment.id,
            action="delete",
            summary=f"EliminÃ³ el pago #{payment.id}",
            detail="Se eliminÃ³ el pago y se revirtieron sus asignaciones.",
            metadata=_build_audit_metadata(
                source_path="/payments",
                customer_id=payment.customer_id,
                sale_id=payment.sale_id,
                amount=payment.amount,
            ),
            before=before_snapshot,
        )
        db.session.delete(payment)
        mark_business_payloads_dirty(business_id, [affected_payment_date])
        db.session.commit()
        return jsonify({"ok": True})

    # ========== REPORT ROUTES ==========
    @app.route("/api/businesses/<int:business_id>/reports/daily", methods=["GET"])
    @token_required
    @module_required("reports")
    def daily_report(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            member = TeamMember.query.filter_by(user_id=g.current_user.id, business_id=business_id, status='active').first()
            if member:
                business = member.business

        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        today = date.today()
        period = request.args.get("period", "today")

        if period == "week":
            start_date = today - timedelta(days=today.weekday())
            end_date = today
        elif period == "month":
            start_date = today.replace(day=1)
            end_date = today
        else:
            start_date = today
            end_date = today

        if request.args.get("start_date"):
            try:
                start_date = datetime.strptime(request.args.get("start_date"), "%Y-%m-%d").date()
            except:
                pass

        if request.args.get("end_date"):
            try:
                end_date = datetime.strptime(request.args.get("end_date"), "%Y-%m-%d").date()
            except:
                pass

        target_date = start_date

        sales = Sale.query.filter(
            Sale.business_id == business_id,
            Sale.sale_date >= start_date,
            Sale.sale_date <= end_date
        ).all()
        sales_total = sum(s.total for s in sales)
        sales_count = len(sales)

        expenses = Expense.query.filter(
            Expense.business_id == business_id,
            Expense.expense_date >= start_date,
            Expense.expense_date <= end_date
        ).all()
        expenses_total = sum(e.amount for e in expenses)
        expenses_count = len(expenses)

        payments = Payment.query.filter(
            Payment.business_id == business_id,
            Payment.payment_date >= start_date,
            Payment.payment_date <= end_date
        ).all()
        payments_total = sum(p.amount for p in payments)

        cash_in = sum(s.total for s in sales if s.payment_method == "cash") + payments_total
        cash_out = expenses_total

        return jsonify({
            "date": target_date.isoformat(),
            "period": period,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "sales": {
                "count": sales_count,
                "total": sales_total
            },
            "expenses": {
                "count": expenses_count,
                "total": expenses_total
            },
            "payments": {
                "count": len(payments),
                "total": payments_total
            },
            "cash_flow": {
                "in": cash_in,
                "out": cash_out,
                "net": cash_in - cash_out
            }
        })

    @app.route("/api/businesses/<int:business_id>/reports/summary", methods=["GET"])
    @app.route("/api/businesses/<int:business_id>/summary", methods=["GET"])
    @token_required
    @module_required("reports")
    def summary_report(business_id):
        # Check access (Owner or Member)
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            member = TeamMember.query.filter_by(user_id=g.current_user.id, business_id=business_id, status='active').first()
            if member:
                business = member.business
                
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        # Get date range (default: current month)
        today = date.today()
        start_of_month = today.replace(day=1)
        
        # Get period parameter: today, week, month
        period = request.args.get("period", "today")
        
        # Calculate date range based on period
        if period == "week":
            # Get start of week (Monday)
            start_date = today - timedelta(days=today.weekday())
            end_date = today
        elif period == "month":
            # Get start of month
            start_date = today.replace(day=1)
            end_date = today
        else:
            # Default to today
            start_date = today
            end_date = today
        
        # Allow custom date range override
        start_date_param = request.args.get("start_date")
        end_date_param = request.args.get("end_date")

        if start_date_param:
            try:
                start_date = datetime.strptime(start_date_param, "%Y-%m-%d").date()
            except:
                pass

        if end_date_param:
            try:
                end_date = datetime.strptime(end_date_param, "%Y-%m-%d").date()
            except:
                pass
        
        # Use start_date as the start of the period for backward compatibility
        start_of_month = start_date
        today = end_date

        summary_cache_key = (business_id, start_of_month.isoformat(), today.isoformat())
        payload = build_business_payload(
            SUMMARY_CACHE_NAMESPACE,
            summary_cache_key,
            current_app.config.get("LOCAL_RESPONSE_CACHE_TTL_SUMMARY_SECONDS", 5),
            lambda: build_summary_payload_from_daily_aggregate(business_id, start_of_month, today),
            business_id=business_id,
            start_date=start_of_month,
            end_date=today,
        )
        return jsonify(payload)

    @app.route("/api/businesses/<int:business_id>/reports/top-products", methods=["GET"])
    @token_required
    @module_required("reports")
    def top_products(business_id):
        # Check access (Owner or Member)
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            member = TeamMember.query.filter_by(user_id=g.current_user.id, business_id=business_id, status='active').first()
            if member:
                business = member.business
        
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        # Aggregate sales by product
        # Optimize: Fetch only items JSON to avoid full object hydration
        sales_items = db.session.query(Sale.items).filter_by(business_id=business_id).all()
        
        product_stats = {}
        for (items_json,) in sales_items:
            if not items_json: continue
            for item in items_json:
                pid = item.get("product_id")
                name = item.get("name", "Producto")
                qty = item.get("qty", 1)
                total = item.get("total", 0)

                if pid not in product_stats:
                    product_stats[pid] = {"name": name, "qty": 0, "total": 0}
                
                product_stats[pid]["qty"] += qty
                product_stats[pid]["total"] += total

        # Sort and limit
        sorted_products = sorted(product_stats.values(), key=lambda x: x["total"], reverse=True)[:10]

        return jsonify({"top_products": sorted_products})

    # ========== DASHBOARD ROUTES ==========
    def get_dashboard(business_id):
        # Check access (Owner or Member)
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            member = TeamMember.query.filter_by(user_id=g.current_user.id, business_id=business_id, status='active').first()
            if member:
                business = member.business

        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        today = date.today()
        thirty_days_ago = today - timedelta(days=30)
        sixty_days_ago = today - timedelta(days=60)

        dashboard_cache_key = (business_id, today.isoformat())
        payload = build_business_payload(
            DASHBOARD_CACHE_NAMESPACE,
            dashboard_cache_key,
            current_app.config.get("LOCAL_RESPONSE_CACHE_TTL_DASHBOARD_SECONDS", 5),
            lambda: build_modern_dashboard_payload(business_id, today, thirty_days_ago, sixty_days_ago),
            business_id=business_id,
        )
        return jsonify(payload)

    # ========== ANALYTICS ROUTES ==========
    @app.route("/api/businesses/<int:business_id>/analytics/sales-trend", methods=["GET"])
    @token_required
    @module_required("reports")
    def sales_trend(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        
        from datetime import date, timedelta
        from sqlalchemy import func
        
        period = request.args.get("period", "daily")  # daily, weekly, monthly
        days = int(request.args.get("days", 30))
        
        today = date.today()
        start_date = today - timedelta(days=days)
        
        if period == "daily":
            # Group by day
            sales_data = db.session.query(
                func.date(Sale.sale_date).label("date"),
                func.sum(Sale.total).label("total"),
                func.count(Sale.id).label("count")
            ).filter(
                Sale.business_id == business_id,
                Sale.sale_date >= start_date
            ).group_by(func.date(Sale.sale_date)).order_by(func.date(Sale.sale_date)).all()
            
            trend = [{
                "date": str(r.date),
                "total": float(r.total or 0),
                "count": r.count
            } for r in sales_data]
            
        elif period == "weekly":
            # Group by week
            sales_data = db.session.query(
                func.strftime("%Y-W%W", Sale.sale_date).label("week"),
                func.sum(Sale.total).label("total"),
                func.count(Sale.id).label("count")
            ).filter(
                Sale.business_id == business_id,
                Sale.sale_date >= start_date
            ).group_by(func.strftime("%Y-W%W", Sale.sale_date)).order_by(func.strftime("%Y-W%W", Sale.sale_date)).all()
            
            trend = [{
                "date": r.week,
                "total": float(r.total or 0),
                "count": r.count
            } for r in sales_data]
            
        else:  # monthly
            sales_data = db.session.query(
                func.strftime("%Y-%m", Sale.sale_date).label("month"),
                func.sum(Sale.total).label("total"),
                func.count(Sale.id).label("count")
            ).filter(
                Sale.business_id == business_id,
                Sale.sale_date >= start_date
            ).group_by(func.strftime("%Y-%m", Sale.sale_date)).order_by(func.strftime("%Y-%m", Sale.sale_date)).all()
            
            trend = [{
                "date": r.month,
                "total": float(r.total or 0),
                "count": r.count
            } for r in sales_data]
        
        return jsonify({
            "period": period,
            "days": days,
            "trend": trend
        })

    @app.route("/api/businesses/<int:business_id>/quick-notes", methods=["GET"])
    @token_required
    @permission_required('reminders.manage')
    def get_quick_notes(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        notes = QuickNote.query.filter_by(business_id=business_id).order_by(QuickNote.created_at.desc()).limit(20).all()
        return jsonify({"notes": [n.to_dict() for n in notes]})

    @app.route("/api/businesses/<int:business_id>/quick-notes", methods=["POST"])
    @token_required
    @permission_required('reminders.manage')
    def create_quick_note(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        data = request.get_json()
        note_text = data.get("note", "").strip()

        if not note_text:
            return jsonify({"error": "La nota no puede estar vacÃ­a"}), 400
        
        if len(note_text) > 280:
            return jsonify({"error": "La nota es demasiado larga (mÃ¡x 280 caracteres)"}), 400

        note = QuickNote(
            business_id=business_id,
            note=note_text
        )
        db.session.add(note)
        db.session.commit()
        
        return jsonify({"note": note.to_dict()}), 201

    @app.route("/api/businesses/<int:business_id>/quick-notes/<int:note_id>", methods=["DELETE"])
    @token_required
    @permission_required('reminders.manage')
    def delete_quick_note(business_id, note_id):
        note = QuickNote.query.filter_by(id=note_id, business_id=business_id).first()
        if not note:
            return jsonify({"error": "Nota no encontrada"}), 404

        db.session.delete(note)
        db.session.commit()
        return jsonify({"ok": True})

    # ========== REMINDERS ROUTES (FULL) ==========
    @app.route("/api/businesses/<int:business_id>/reminders", methods=["GET"])
    @token_required
    @permission_required('reminders.manage')
    def get_reminders(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        reminders = Reminder.query.filter_by(business_id=business_id).order_by(Reminder.created_at.desc()).all()
        return jsonify({"reminders": [r.to_dict() for r in reminders]})

    @app.route("/api/businesses/<int:business_id>/reminders", methods=["POST"])
    @token_required
    @permission_required('reminders.manage')
    def create_reminder(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        data = request.get_json()
        
        import uuid
        reminder_id = data.get("id") or str(uuid.uuid4())
        
        role_snapshot = get_current_role_snapshot(g.current_user, business_id)
        
        reminder = Reminder(
            id=reminder_id,
            business_id=business_id,
            title=data.get("title", "Sin tÃ­tulo"),
            content=data.get("content", ""),
            priority=data.get("priority", "medium"),
            due_date=data.get("dueDate"),
            due_time=data.get("dueTime"),
            tags=data.get("tags", []),
            status=data.get("status", "active"),
            pinned=data.get("pinned", False),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            created_by_user_id=g.current_user.id,
            created_by_name=g.current_user.name,
            created_by_role=role_snapshot,
            updated_by_user_id=g.current_user.id
        )
        
        db.session.add(reminder)
        db.session.commit()
        
        return jsonify({"reminder": reminder.to_dict()}), 201

    @app.route("/api/businesses/<int:business_id>/reminders/<reminder_id>", methods=["PUT"])
    @token_required
    @permission_required('reminders.manage')
    def update_reminder(business_id, reminder_id):
        reminder = Reminder.query.filter_by(id=reminder_id, business_id=business_id).first()
        if not reminder:
            return jsonify({"error": "Recordatorio no encontrado"}), 404
            
        data = request.get_json()
        
        if "title" in data: reminder.title = data["title"]
        if "content" in data: reminder.content = data["content"]
        if "priority" in data: reminder.priority = data["priority"]
        if "dueDate" in data: reminder.due_date = data["dueDate"]
        if "dueTime" in data: reminder.due_time = data["dueTime"]
        if "tags" in data: reminder.tags = data["tags"]
        if "status" in data: reminder.status = data["status"]
        if "pinned" in data: reminder.pinned = data["pinned"]

        reminder.updated_by_user_id = g.current_user.id
        reminder.updated_at = datetime.utcnow()

        db.session.commit()
        return jsonify({"reminder": reminder.to_dict()})

    @app.route("/api/businesses/<int:business_id>/reminders/<reminder_id>", methods=["DELETE"])
    @token_required
    @permission_required('reminders.manage')
    def delete_reminder(business_id, reminder_id):
        reminder = Reminder.query.filter_by(id=reminder_id, business_id=business_id).first()
        if not reminder:
            return jsonify({"error": "Recordatorio no encontrado"}), 404
            
        db.session.delete(reminder)
        db.session.commit()
        return jsonify({"ok": True})

    @app.route("/api/businesses/<int:business_id>/analytics/comparison", methods=["GET"])
    @token_required
    @module_required("reports")
    def period_comparison(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        
        from datetime import date, timedelta
        from sqlalchemy import func
        
        today = date.today()
        
        # Current period (last 30 days)
        current_start = today - timedelta(days=30)
        current_sales = db.session.query(func.sum(Sale.total)).filter(
            Sale.business_id == business_id,
            Sale.sale_date >= current_start
        ).scalar() or 0
        
        current_expenses = db.session.query(func.sum(Expense.amount)).filter(
            Expense.business_id == business_id,
            Expense.expense_date >= current_start
        ).scalar() or 0
        
        # Previous period (30-60 days ago)
        prev_start = today - timedelta(days=60)
        prev_end = today - timedelta(days=30)
        prev_sales = db.session.query(func.sum(Sale.total)).filter(
            Sale.business_id == business_id,
            Sale.sale_date >= prev_start,
            Sale.sale_date < prev_end
        ).scalar() or 0
        
        prev_expenses = db.session.query(func.sum(Expense.amount)).filter(
            Expense.business_id == business_id,
            Expense.expense_date >= prev_start,
            Expense.expense_date < prev_end
        ).scalar() or 0
        
        # Year ago
        year_ago_start = today - timedelta(days=365)
        year_ago_sales = db.session.query(func.sum(Sale.total)).filter(
            Sale.business_id == business_id,
            Sale.sale_date >= year_ago_start
        ).scalar() or 0
        
        # Calculate growth
        sales_growth = ((current_sales - prev_sales) / prev_sales * 100) if prev_sales > 0 else 0
        expenses_growth = ((current_expenses - prev_expenses) / prev_expenses * 100) if prev_expenses > 0 else 0

        # Monthly Goal Calculation
        current_month_start = date(today.year, today.month, 1)
        # Use existing current_sales if it matches month, but current_sales is last 30 days.
        # We need specific current month sales for goal tracking
        month_sales = db.session.query(func.sum(Sale.total)).filter(
            Sale.business_id == business_id,
            Sale.sale_date >= current_month_start
        ).scalar() or 0
        
        goal_data = {
            "goal": business.monthly_sales_goal or 0,
            "current": float(month_sales),
            "percentage": 0
        }
        
        if goal_data["goal"] > 0:
            goal_data["percentage"] = min(100, round((goal_data["current"] / goal_data["goal"]) * 100, 1))

        # Upcoming recurring expenses
        upcoming_expenses = []
        try:
            today_date = date.today()
            recurring = RecurringExpense.query.filter_by(
                business_id=business_id, 
                is_active=True
            ).all()

            for exp in recurring:
                days_until = 999
                status = "unknown"

                if exp.next_due_date:
                    days_until = (exp.next_due_date - today_date).days
                    if days_until < 0:
                        status = "overdue"
                    elif days_until == 0:
                        status = "due_today"
                    elif days_until <= 7:
                        status = "due_soon"
                else:
                    # Fallback for old records without next_due_date
                    # Check if due in next 7 days or overdue
                    # Simplified logic: use due_day of current month
                    try:
                        due_date = date(today_date.year, today_date.month, exp.due_day)
                    except:
                        due_date = today_date
                    
                    days_until = (due_date - today_date).days
                    
                    # Check if already paid this month
                    is_paid = Expense.query.filter(
                        Expense.business_id == business_id,
                        Expense.expense_date >= current_month_start,
                        Expense.category == exp.category,
                        Expense.amount >= exp.amount * 0.9, 
                        Expense.amount <= exp.amount * 1.1
                    ).first() is not None

                    if not is_paid:
                        if days_until < 0:
                            status = "overdue" # Passed this month and not paid
                        elif days_until == 0:
                            status = "due_today"
                        elif days_until <= 7:
                            status = "due_soon"
                        else:
                             # Check wrap around for next month? No, too complex for fallback.
                             pass

                if status in ["overdue", "due_today", "due_soon"]:
                    upcoming_expenses.append({
                        "id": exp.id,
                        "name": exp.name,
                        "amount": exp.amount,
                        "due_day": exp.due_day,
                        "next_due_date": exp.next_due_date.isoformat() if exp.next_due_date else None,
                        "days_until": abs(days_until),
                        "status": status
                    })
            
            # Sort: Overdue first, then by days
            def sort_key(x):
                if x["status"] == "overdue": return -100 + x["days_until"]
                if x["status"] == "due_today": return -50
                return x["days_until"]

            upcoming_expenses.sort(key=sort_key)
            upcoming_expenses = upcoming_expenses[:5] # Limit to 5
            
        except Exception as e:
            print(f"Error calculating upcoming expenses: {e}")
            import traceback
            traceback.print_exc()
        
        return jsonify({
            "current_period": {
                "start": current_start.isoformat(),
                "end": today.isoformat(),
                "sales": float(current_sales),
                "expenses": float(current_expenses),
                "profit": float(current_sales - current_expenses)
            },
            "monthly_goal": goal_data,
            "upcoming_expenses": upcoming_expenses,
            "previous_period": {
                "start": prev_start.isoformat(),
                "end": prev_end.isoformat(),
                "sales": float(prev_sales),
                "expenses": float(prev_expenses),
                "profit": float(prev_sales - prev_expenses)
            },
            "year_ago_sales": float(year_ago_sales),
            "growth": {
                "sales": round(sales_growth, 1),
                "expenses": round(expenses_growth, 1),
                "profit": round(((current_sales - current_expenses) - (prev_sales - prev_expenses)) / (prev_sales - prev_expenses) * 100, 1) if (prev_sales - prev_expenses) > 0 else 0
            }
        })

    @app.route("/api/businesses/<int:business_id>/analytics/metrics", methods=["GET"])
    @token_required
    @module_required("reports")
    def business_metrics(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        
        from datetime import date, timedelta
        from sqlalchemy import func
        
        today = date.today()
        
        # Total sales all time
        total_sales = db.session.query(func.sum(Sale.total)).filter(
            Sale.business_id == business_id
        ).scalar() or 0
        
        # Total expenses all time
        total_expenses = db.session.query(func.sum(Expense.amount)).filter(
            Expense.business_id == business_id
        ).scalar() or 0
        
        # Total customers
        total_customers = Customer.query.filter_by(business_id=business_id).count()
        
        # Total products
        total_products = Product.query.filter_by(business_id=business_id).count()
        
        # Average sale value
        avg_sale_value = db.session.query(func.avg(Sale.total)).filter(
            Sale.business_id == business_id
        ).scalar() or 0
        
        # Best selling products
        top_products = db.session.query(
            Sale.items,
            func.sum(Sale.total).label("total")
        ).filter(
            Sale.business_id == business_id
        ).all()
        
        # Count sales by payment method
        cash_sales = Sale.query.filter_by(business_id=business_id, payment_method="cash").count()
        transfer_sales = Sale.query.filter_by(business_id=business_id, payment_method="transfer").count()
        credit_sales = Sale.query.filter_by(business_id=business_id, payment_method="credit").count()
        
        # Active customers (with purchases in last 30 days)
        thirty_days_ago = today - timedelta(days=30)
        active_customers = db.session.query(func.count(func.distinct(Sale.customer_id))).filter(
            Sale.business_id == business_id,
            Sale.sale_date >= thirty_days_ago,
            Sale.customer_id != None
        ).scalar() or 0
        
        # Accounts receivable
        accounts_receivable = db.session.query(func.sum(Sale.balance)).filter(
            Sale.business_id == business_id,
            Sale.paid == False
        ).scalar() or 0
        
        return jsonify({
            "totals": {
                "sales": float(total_sales),
                "expenses": float(total_expenses),
                "profit": float(total_sales - total_expenses),
                "customers": total_customers,
                "products": total_products
            },
            "averages": {
                "sale_value": float(avg_sale_value)
            },
            "payment_methods": {
                "cash": cash_sales,
                "transfer": transfer_sales,
                "credit": credit_sales
            },
            "active_customers_30d": active_customers,
            "accounts_receivable": float(accounts_receivable)
        })

    # ========== EXPORT ROUTES ==========
    @app.route("/api/businesses/<int:business_id>/export/sales", methods=["GET"])
    @token_required
    @module_required("reports")
    def export_sales(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        # Plan FREE: sin acceso a exportaciÃ³n
        if g.current_user.plan == "free":
            return jsonify({
                "error": "La exportaciÃ³n estÃ¡ disponible solo en Pro. Actualiza tu plan para usar esta funciÃ³n.",
                "upgrade_url": "/upgrade"
            }), 403

        from backend.services.export import export_sales_excel

        start_date = request.args.get("start_date") or request.args.get("startDate")
        end_date = request.args.get("end_date") or request.args.get("endDate")

        try:
            filepath = export_sales_excel(business_id, start_date, end_date)
            filename = os.path.basename(filepath)
            return jsonify({"download_url": f"/api/download/{filename}"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/businesses/<int:business_id>/export/expenses", methods=["GET"])
    @token_required
    @module_required("reports")
    def export_expenses(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        # Plan FREE: sin acceso a exportaciÃ³n
        if g.current_user.plan == "free":
            return jsonify({
                "error": "La exportaciÃ³n estÃ¡ disponible solo en Pro. Actualiza tu plan para usar esta funciÃ³n.",
                "upgrade_url": "/upgrade"
            }), 403

        from backend.services.export import export_expenses_excel

        start_date = request.args.get("start_date") or request.args.get("startDate")
        end_date = request.args.get("end_date") or request.args.get("endDate")

        try:
            filepath = export_expenses_excel(business_id, start_date, end_date)
            filename = os.path.basename(filepath)
            return jsonify({"download_url": f"/api/download/{filename}"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/businesses/<int:business_id>/export/combined", methods=["GET"])
    @token_required
    @module_required("reports")
    def export_combined(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
            
        if g.current_user.plan == "free":
            return jsonify({
                "error": "La exportaciÃ³n avanzada estÃ¡ disponible solo en Pro.",
                "upgrade_url": "/upgrade"
            }), 403

        from backend.services.export import export_combined_report
        import traceback

        report_type = request.args.get("type", "business_summary")
        start_date = request.args.get("start_date") or request.args.get("startDate")
        end_date = request.args.get("end_date") or request.args.get("endDate")

        try:
            filepath = export_combined_report(business_id, report_type, start_date, end_date)
            # Ensure we only return the filename, not the full path
            filename = os.path.basename(filepath)
            return jsonify({"download_url": f"/api/download/{filename}"})
        except Exception as e:
            print(f"ERROR GENERATING REPORT: {str(e)}")
            traceback.print_exc()
            return jsonify({"error": str(e)}), 500

    @app.route("/api/businesses/<int:business_id>/export/profitability", methods=["GET"])
    @token_required
    @module_required("reports")
    def export_profitability(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            member = TeamMember.query.filter_by(user_id=g.current_user.id, business_id=business_id, status='active').first()
            if member:
                business = member.business

        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        if g.current_user.plan == "free":
            return jsonify({
                "error": "La exportaciÃ³n avanzada estÃ¡ disponible solo en Pro.",
                "upgrade_url": "/upgrade"
            }), 403

        start_date = request.args.get("start_date") or request.args.get("startDate")
        end_date = request.args.get("end_date") or request.args.get("endDate")
        status = request.args.get("status")
        product_query = request.args.get("product_query") or request.args.get("productQuery")
        focus = request.args.get("focus")

        try:
            from backend.services.reports.report_service import ReportExportService, export_profitability_excel

            service = ReportExportService(business_id)
            start, end = service.normalize_dates(start_date, end_date)
            payload = service.build_profitability_payload(
                start,
                end,
                status=status,
                product_query=product_query,
                focus=focus,
            )
            filepath = export_profitability_excel(
                business_id,
                payload["summary"],
                payload["products"],
                payload["sales"],
                payload["alerts"],
                start,
                end,
                filters=payload["filters"],
            )
            return send_file(
                filepath,
                mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                as_attachment=True,
                download_name=os.path.basename(filepath),
            )
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/download/<filename>", methods=["GET"])
    def download_file(filename):
        # Permitir token en query param para descargas directas (fallback)
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        else:
            token = request.args.get('token')
        
        # Validar token (aunque sea simplificado para descarga)
        if not token:
             return jsonify({"error": "Token requerido"}), 401

        try:
            # Verificar firma del token
            # Usar JWT_SECRET_KEY que es la usada para firmar en auth.py, no SECRET_KEY de Flask
            jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
        except Exception as e:
            print(f"Token verification failed: {e}")
            return jsonify({"error": "Token invÃ¡lido o expirado"}), 401

        export_dir = app.config.get("EXPORT_DIR", "exports")
        
        # Ensure export_dir is absolute
        if not os.path.isabs(export_dir):
            export_dir = os.path.join(app.root_path, export_dir)
            
        try:
            return send_from_directory(
                export_dir,
                filename,
                as_attachment=True
            )
        except Exception as e:
            print(f"ERROR DOWNLOADING FILE: {str(e)}")
            return jsonify({"error": "Archivo no encontrado"}), 404

    @app.route("/api/businesses/<int:business_id>/bi/token", methods=["GET"])
    @token_required
    def get_bi_token(business_id):
        # 1. Security Check: Plan Business Only
        if g.current_user.plan != "business":
            return jsonify({
                "error": "El acceso a Business Intelligence es exclusivo del plan Business.",
                "upgrade_url": "/upgrade?plan=business"
            }), 403

        # 2. Security Check: Business Ownership
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        # 3. Generate Token
        from backend.services.pbi_service import pbi_service
        try:
            embed_config = pbi_service.get_embed_params_for_single_report(business_id)
            return jsonify(embed_config)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    # ========== BACKUP ROUTES ==========
    @app.route("/api/businesses/<int:business_id>/backup", methods=["GET"])
    @token_required
    def get_backup(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        # Plan FREE: sin acceso a exportar backup
        if g.current_user.plan == "free":
            return jsonify({
                "error": "La exportaciÃ³n de backup estÃ¡ disponible solo en Pro. Actualiza tu plan para usar esta funciÃ³n.",
                "upgrade_url": "/upgrade"
            }), 403

        from backend.services.export import create_backup_json

        try:
            filepath = create_backup_json(business_id)
            return jsonify({"download_url": f"/api/download/{filepath}"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/api/businesses/<int:business_id>/restore", methods=["POST"])
    @token_required
    def restore_backup(business_id):
        business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        # Plan FREE: sin acceso a importar/restore
        if g.current_user.plan == "free":
            return jsonify({
                "error": "La importaciÃ³n estÃ¡ disponible solo en Pro. Actualiza tu plan para usar esta funciÃ³n.",
                "upgrade_url": "/upgrade"
            }), 403

        data = request.get_json() or {}
        backup_data = data.get("data")

        if not backup_data:
            return jsonify({"error": "Datos de backup requeridos"}), 400

        from backend.services.export import restore_from_backup

        try:
            restore_from_backup(business_id, backup_data)
            return jsonify({"ok": True})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    # ========== ADMIN ROUTES ==========
    @app.route("/api/admin/stats", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_admin_stats():
        """Get admin statistics - focused on users and memberships"""
        # Check if user is admin
        if not g.current_user.is_admin:
            return jsonify({"error": "Unauthorized. Admin access required."}), 403
        
        # User statistics
        total_users = User.query.count()
        free_users = User.query.filter_by(plan="free").count()
        pro_users = User.query.filter_by(plan="pro").count()
        business_users = User.query.filter_by(plan="business").count()
        
        # Activity stats
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        new_users_30d = User.query.filter(User.created_at >= thirty_days_ago).count()
        active_users_30d = User.query.filter(User.last_login >= thirty_days_ago).count()
        
        # Global platform stats
        total_businesses = Business.query.count()
        total_products_global = Product.query.count()
        total_customers_global = Customer.query.count()
        
        # Membership payment statistics
        total_membership_payments = SubscriptionPayment.query.count()
        total_membership_income = db.session.query(db.func.sum(SubscriptionPayment.amount)).filter(
            SubscriptionPayment.status == "completed"
        ).scalar() or 0
        
        # Income growth (Current Month vs Last Month)
        now = datetime.utcnow()
        first_day_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        # Calculate first day of last month
        if now.month == 1:
            first_day_last_month = now.replace(year=now.year-1, month=12, day=1, hour=0, minute=0, second=0)
        else:
            first_day_last_month = now.replace(month=now.month-1, day=1, hour=0, minute=0, second=0)
            
        income_this_month = db.session.query(db.func.sum(SubscriptionPayment.amount)).filter(
            SubscriptionPayment.status == "completed",
            SubscriptionPayment.payment_date >= first_day_this_month
        ).scalar() or 0
        
        income_last_month = db.session.query(db.func.sum(SubscriptionPayment.amount)).filter(
            SubscriptionPayment.status == "completed",
            SubscriptionPayment.payment_date >= first_day_last_month,
            SubscriptionPayment.payment_date < first_day_this_month
        ).scalar() or 0
        
        income_growth = 0
        if income_last_month > 0:
            income_growth = ((income_this_month - income_last_month) / income_last_month) * 100
        
        # Payments by plan type (Pro)
        pro_monthly_payments = SubscriptionPayment.query.filter_by(plan="pro_monthly", status="completed").count()
        pro_quarterly_payments = SubscriptionPayment.query.filter_by(plan="pro_quarterly", status="completed").count()
        pro_annual_payments = SubscriptionPayment.query.filter_by(plan="pro_annual", status="completed").count()
        
        pro_monthly_income = db.session.query(db.func.sum(SubscriptionPayment.amount)).filter(
            SubscriptionPayment.plan == "pro_monthly",
            SubscriptionPayment.status == "completed"
        ).scalar() or 0
        
        pro_quarterly_income = db.session.query(db.func.sum(SubscriptionPayment.amount)).filter(
            SubscriptionPayment.plan == "pro_quarterly",
            SubscriptionPayment.status == "completed"
        ).scalar() or 0

        pro_annual_income = db.session.query(db.func.sum(SubscriptionPayment.amount)).filter(
            SubscriptionPayment.plan == "pro_annual",
            SubscriptionPayment.status == "completed"
        ).scalar() or 0
        
        # Payments by plan type (Business)
        business_monthly_payments = SubscriptionPayment.query.filter_by(plan="business_monthly", status="completed").count()
        business_quarterly_payments = SubscriptionPayment.query.filter_by(plan="business_quarterly", status="completed").count()
        business_annual_payments = SubscriptionPayment.query.filter_by(plan="business_annual", status="completed").count()

        business_monthly_income = db.session.query(db.func.sum(SubscriptionPayment.amount)).filter(
            SubscriptionPayment.plan == "business_monthly",
            SubscriptionPayment.status == "completed"
        ).scalar() or 0
        
        business_quarterly_income = db.session.query(db.func.sum(SubscriptionPayment.amount)).filter(
            SubscriptionPayment.plan == "business_quarterly",
            SubscriptionPayment.status == "completed"
        ).scalar() or 0

        business_annual_income = db.session.query(db.func.sum(SubscriptionPayment.amount)).filter(
            SubscriptionPayment.plan == "business_annual",
            SubscriptionPayment.status == "completed"
        ).scalar() or 0

        return jsonify({
            "total_users": total_users,
            "free_users": free_users,
            "pro_users": pro_users,
            "business_users": business_users,
            "new_users_30d": new_users_30d,
            "active_users_30d": active_users_30d,
            "total_businesses": total_businesses,
            "total_products_global": total_products_global,
            "total_customers_global": total_customers_global,
            "total_membership_payments": total_membership_payments,
            "total_membership_income": total_membership_income,
            "income_this_month": income_this_month,
            "income_growth": income_growth,
            # Pro stats
            "pro_monthly_payments": pro_monthly_payments,
            "pro_quarterly_payments": pro_quarterly_payments,
            "pro_annual_payments": pro_annual_payments,
            "pro_monthly_income": pro_monthly_income,
            "pro_quarterly_income": pro_quarterly_income,
            "pro_annual_income": pro_annual_income,
            # Business stats
            "business_monthly_payments": business_monthly_payments,
            "business_quarterly_payments": business_quarterly_payments,
            "business_annual_payments": business_annual_payments,
            "business_monthly_income": business_monthly_income,
            "business_quarterly_income": business_quarterly_income,
            "business_annual_income": business_annual_income
        })

    def _admin_plan_from_user(user):
        return normalize_access_plan(getattr(user, "membership_plan", None)) or normalize_access_plan(getattr(user, "plan", None)) or "free"

    def _admin_plan_code_from_user(user):
        normalized = _admin_plan_from_user(user)
        membership_plan = str(getattr(user, "membership_plan", "") or "").strip().lower()
        if membership_plan:
            return membership_plan
        if normalized in {"basic", "pro", "business"}:
            return f"{normalized}_manual"
        return None

    def _admin_billing_cycle(plan_code):
        normalized = str(plan_code or "").strip().lower()
        if normalized.endswith("_annual"):
            return "annual"
        if normalized.endswith("_quarterly"):
            return "quarterly"
        if normalized.endswith("_manual"):
            return "manual"
        return "monthly"

    def _admin_payment_monthly_equivalent(amount, billing_cycle):
        value = float(amount or 0)
        if billing_cycle == "annual":
            return value / 12.0
        if billing_cycle == "quarterly":
            return value / 3.0
        return value

    def _build_owner_admin_rows(range_days=30):
        now = datetime.utcnow()
        window_start = now - timedelta(days=max(int(range_days or 30), 1))
        businesses = Business.query.options(joinedload(Business.user)).all()
        if not businesses:
            return []

        business_ids = [business.id for business in businesses]
        owner_ids = list({business.user_id for business in businesses if business.user_id})

        sales_rows = db.session.query(
            Sale.business_id,
            func.count(Sale.id),
            func.coalesce(func.sum(Sale.total), 0),
        ).filter(
            Sale.business_id.in_(business_ids),
            Sale.created_at >= window_start,
        ).group_by(Sale.business_id).all()
        sales_30d = {
            business_id: {
                "count": int(count or 0),
                "total": float(total or 0),
            }
            for business_id, count, total in sales_rows
        }

        audit_count_rows = db.session.query(
            AuditLog.business_id,
            func.count(AuditLog.id),
        ).filter(
            AuditLog.business_id.in_(business_ids),
            AuditLog.timestamp >= window_start,
        ).group_by(AuditLog.business_id).all()
        audit_counts = {business_id: int(count or 0) for business_id, count in audit_count_rows}

        latest_sale_rows = db.session.query(
            Sale.business_id,
            func.max(Sale.created_at),
        ).filter(
            Sale.business_id.in_(business_ids),
        ).group_by(Sale.business_id).all()
        latest_sale_at = {business_id: value for business_id, value in latest_sale_rows}

        latest_audit_rows = db.session.query(
            AuditLog.business_id,
            func.max(AuditLog.timestamp),
        ).filter(
            AuditLog.business_id.in_(business_ids),
        ).group_by(AuditLog.business_id).all()
        latest_audit_at = {business_id: value for business_id, value in latest_audit_rows}

        team_count_rows = db.session.query(
            TeamMember.business_id,
            func.count(TeamMember.id),
        ).filter(
            TeamMember.business_id.in_(business_ids),
        ).group_by(TeamMember.business_id).all()
        team_counts = {business_id: int(count or 0) for business_id, count in team_count_rows}

        payment_rows = SubscriptionPayment.query.filter(
            SubscriptionPayment.user_id.in_(owner_ids),
        ).order_by(
            SubscriptionPayment.user_id.asc(),
            SubscriptionPayment.payment_date.desc(),
            SubscriptionPayment.created_at.desc(),
        ).all()
        payments_by_user = {}
        for payment in payment_rows:
            payments_by_user.setdefault(payment.user_id, []).append(payment)

        total_income_by_user = {}
        latest_completed_by_user = {}
        latest_failed_by_user = {}
        latest_plan_change_by_user = {}
        for user_id, payments in payments_by_user.items():
            completed = [payment for payment in payments if str(payment.status or "").lower() == "completed"]
            failed = [payment for payment in payments if str(payment.status or "").lower() == "failed"]
            total_income_by_user[user_id] = round(sum(float(payment.amount or 0) for payment in completed), 2)
            latest_completed_by_user[user_id] = completed[0] if completed else None
            latest_failed_by_user[user_id] = failed[0] if failed else None
            if len(completed) >= 2:
                current_payment = completed[0]
                previous_payment = completed[1]
                current_plan = normalize_access_plan(current_payment.plan)
                previous_plan = normalize_access_plan(previous_payment.plan)
                direction = None
                plan_rank = {"basic": 1, "pro": 2, "business": 3}
                if current_plan and previous_plan and current_plan != previous_plan:
                    if plan_rank.get(current_plan, 0) > plan_rank.get(previous_plan, 0):
                        direction = "upgrade"
                    elif plan_rank.get(current_plan, 0) < plan_rank.get(previous_plan, 0):
                        direction = "downgrade"
                latest_plan_change_by_user[user_id] = {
                    "current_plan": current_plan,
                    "previous_plan": previous_plan,
                    "changed_at": current_payment.payment_date.isoformat() if current_payment.payment_date else None,
                    "direction": direction,
                }
            else:
                latest_plan_change_by_user[user_id] = None

        rows = []
        for business in businesses:
            owner = business.user
            if not owner:
                continue

            plan = _admin_plan_from_user(owner)
            plan_code = _admin_plan_code_from_user(owner)
            billing_cycle = _admin_billing_cycle(plan_code)
            latest_payment = latest_completed_by_user.get(owner.id)
            failed_payment = latest_failed_by_user.get(owner.id)
            monthly_equivalent = _admin_payment_monthly_equivalent(
                latest_payment.amount if latest_payment else 0,
                billing_cycle,
            )
            arr_equivalent = monthly_equivalent * 12
            last_activity_at = max(
                [value for value in [latest_sale_at.get(business.id), latest_audit_at.get(business.id), owner.last_login] if value],
                default=None,
            )

            risk_flags = []
            if owner.membership_end and owner.membership_end < now:
                risk_flags.append("plan_expired")
            elif owner.membership_end and owner.membership_end <= now + timedelta(days=7):
                risk_flags.append("plan_expiring")
            if plan != "free" and not owner.membership_auto_renew:
                risk_flags.append("auto_renew_off")
            if failed_payment and failed_payment.payment_date and failed_payment.payment_date >= now - timedelta(days=30):
                risk_flags.append("failed_payment")
            if not last_activity_at or last_activity_at < now - timedelta(days=45):
                risk_flags.append("inactive_usage")
            if not owner.last_login or owner.last_login < now - timedelta(days=30):
                risk_flags.append("owner_inactive")

            health_score = 100
            for flag in risk_flags:
                if flag in {"plan_expired", "failed_payment"}:
                    health_score -= 30
                elif flag in {"inactive_usage", "owner_inactive"}:
                    health_score -= 20
                else:
                    health_score -= 10
            if team_counts.get(business.id, 0) > 0:
                health_score += 5
            health_score = max(min(health_score, 100), 10)
            churn_risk = health_score <= 60 or "failed_payment" in risk_flags or "plan_expired" in risk_flags

            if plan == "free":
                lifecycle_status = "free"
            elif "plan_expired" in risk_flags:
                lifecycle_status = "expired"
            elif "failed_payment" in risk_flags:
                lifecycle_status = "expired"
            elif "plan_expiring" in risk_flags:
                lifecycle_status = "expiring_soon"
            elif "auto_renew_off" in risk_flags:
                lifecycle_status = "renewal_off"
            elif billing_cycle == "manual":
                lifecycle_status = "manual"
            else:
                lifecycle_status = "active"

            sales_snapshot = sales_30d.get(business.id, {"count": 0, "total": 0.0})
            latest_payment_payload = latest_payment.to_dict() if latest_payment else None
            rows.append({
                "business_id": business.id,
                "business_name": business.name,
                "owner_id": owner.id,
                "owner_name": owner.name,
                "owner_email": owner.email,
                "plan": plan,
                "membership_plan": plan_code,
                "billing_cycle": billing_cycle,
                "lifecycle_status": lifecycle_status,
                "membership_start": owner.membership_start.isoformat() if owner.membership_start else None,
                "membership_end": owner.membership_end.isoformat() if owner.membership_end else None,
                "membership_auto_renew": bool(owner.membership_auto_renew),
                "monthly_equivalent": round(monthly_equivalent, 2),
                "arr_equivalent": round(arr_equivalent, 2),
                "failed_payment_at": failed_payment.payment_date.isoformat() if failed_payment and failed_payment.payment_date else None,
                "last_activity_at": last_activity_at.isoformat() if last_activity_at else None,
                "sales_total_30d": round(float(sales_snapshot["total"] or 0), 2),
                "sales_count_30d": int(sales_snapshot["count"] or 0),
                "events_30d": int(audit_counts.get(business.id, 0) or 0),
                "health_score": int(health_score),
                "churn_risk": bool(churn_risk),
                "risk_flags": risk_flags,
                "lifetime_membership_income": round(float(total_income_by_user.get(owner.id, 0) or 0), 2),
                "latest_payment": latest_payment_payload,
                "latest_plan_change": latest_plan_change_by_user.get(owner.id),
            })

        return rows

    def _build_admin_support_metrics(rows, *, now=None):
        now = now or datetime.utcnow()
        business_ids = [row["business_id"] for row in rows]
        if not business_ids:
            return {}, {}

        unread_feedback_rows = db.session.query(
            TeamFeedback.business_id,
            func.count(TeamFeedback.id),
        ).filter(
            TeamFeedback.business_id.in_(business_ids),
            TeamFeedback.status == "unread",
        ).group_by(TeamFeedback.business_id).all()
        unread_feedback = {business_id: int(count or 0) for business_id, count in unread_feedback_rows}

        pending_invitation_rows = db.session.query(
            TeamInvitation.business_id,
            func.count(TeamInvitation.id),
        ).filter(
            TeamInvitation.business_id.in_(business_ids),
            TeamInvitation.status == "pending",
            TeamInvitation.expires_at >= now,
        ).group_by(TeamInvitation.business_id).all()
        pending_invitations = {business_id: int(count or 0) for business_id, count in pending_invitation_rows}

        return unread_feedback, pending_invitations

    def _get_owner_control_settings(business):
        settings = normalize_business_settings(business.settings)
        owner_control = settings.get("owner_control")
        if not isinstance(owner_control, dict):
            owner_control = {}
        structured_notes = owner_control.get("structured_notes")
        if not isinstance(structured_notes, list):
            structured_notes = []
        return {
            "admin_status": owner_control.get("admin_status") or "normal",
            "follow_up": bool(owner_control.get("follow_up")),
            "high_priority": bool(owner_control.get("high_priority")),
            "last_reason": owner_control.get("last_reason") or None,
            "updated_at": owner_control.get("updated_at") or None,
            "structured_notes": structured_notes,
        }

    def _save_owner_control_settings(business, owner_control):
        settings = normalize_business_settings(business.settings)
        settings["owner_control"] = owner_control
        business.settings = settings

    def _build_owner_intervention_summary(action, business_name):
        labels = {
            "extend_membership": f"ExtendiÃ³ la membresÃ­a de {business_name}",
            "toggle_auto_renew": f"ActualizÃ³ la renovaciÃ³n automÃ¡tica de {business_name}",
            "set_owner_active": f"ActualizÃ³ el acceso del owner de {business_name}",
            "set_priority": f"ActualizÃ³ la prioridad operativa de {business_name}",
            "add_structured_note": f"RegistrÃ³ una nota estructurada para {business_name}",
        }
        return labels.get(action, f"RegistrÃ³ una intervenciÃ³n owner para {business_name}")

    @app.route("/api/admin/owner-overview", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_owner_overview_admin():
        now = datetime.utcnow()
        rows = _build_owner_admin_rows(range_days=30)
        total_businesses = len(rows)
        active_businesses = sum(1 for row in rows if row["last_activity_at"] and datetime.fromisoformat(row["last_activity_at"]) >= now - timedelta(days=30))
        inactive_businesses_count = max(total_businesses - active_businesses, 0)
        at_risk_rows = [row for row in rows if row["risk_flags"]]
        total_users = User.query.count()
        active_users_30d = User.query.filter(User.last_login != None, User.last_login >= now - timedelta(days=30)).count()
        new_users_7d = User.query.filter(User.created_at >= now - timedelta(days=7)).count()
        new_businesses_30d = Business.query.filter(Business.created_at >= now - timedelta(days=30)).count()
        total_membership_income = float(db.session.query(func.coalesce(func.sum(SubscriptionPayment.amount), 0)).filter(SubscriptionPayment.status == "completed").scalar() or 0)
        paid_rows = [row for row in rows if row["plan"] in {"basic", "pro", "business"}]
        estimated_mrr = round(sum(float(row["monthly_equivalent"] or 0) for row in paid_rows), 2)
        estimated_arr = round(estimated_mrr * 12, 2)
        mrr_unknown_accounts = sum(1 for row in paid_rows if float(row["monthly_equivalent"] or 0) <= 0)
        expiring_soon_count = sum(1 for row in rows if "plan_expiring" in row["risk_flags"])
        expired_count = sum(1 for row in rows if "plan_expired" in row["risk_flags"])
        auto_renew_off_count = sum(1 for row in rows if "auto_renew_off" in row["risk_flags"])
        failed_payments_30d = sum(1 for row in rows if "failed_payment" in row["risk_flags"])
        recent_audit_events_24h = AuditLog.query.filter(AuditLog.timestamp >= now - timedelta(hours=24)).count()
        failed_logins_30d = AuditLog.query.filter(AuditLog.action == "failed_login", AuditLog.timestamp >= now - timedelta(days=30)).count()
        successful_logins_30d = AuditLog.query.filter(AuditLog.action == "login", AuditLog.timestamp >= now - timedelta(days=30)).count()
        total_login_attempts_30d = successful_logins_30d + failed_logins_30d
        login_success_rate = round((successful_logins_30d / total_login_attempts_30d) * 100, 1) if total_login_attempts_30d else 100.0

        current_month_start = datetime(now.year, now.month, 1)
        previous_month_end = current_month_start
        previous_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
        current_income = float(db.session.query(func.coalesce(func.sum(SubscriptionPayment.amount), 0)).filter(SubscriptionPayment.status == "completed", SubscriptionPayment.payment_date >= current_month_start).scalar() or 0)
        previous_income = float(db.session.query(func.coalesce(func.sum(SubscriptionPayment.amount), 0)).filter(SubscriptionPayment.status == "completed", SubscriptionPayment.payment_date >= previous_month_start, SubscriptionPayment.payment_date < previous_month_end).scalar() or 0)
        income_growth = round(((current_income - previous_income) / previous_income) * 100, 1) if previous_income else (100.0 if current_income > 0 else 0.0)

        plan_distribution = {}
        for row in rows:
            plan_distribution[row["plan"]] = int(plan_distribution.get(row["plan"], 0) + 1)

        month_labels = []
        membership_revenue = []
        new_businesses_chart = []
        for offset in range(5, -1, -1):
            month_anchor = (current_month_start - timedelta(days=offset * 30))
            month_start = datetime(month_anchor.year, month_anchor.month, 1)
            if month_start.month == 12:
                next_month = datetime(month_start.year + 1, 1, 1)
            else:
                next_month = datetime(month_start.year, month_start.month + 1, 1)
            month_labels.append(month_start.strftime("%b"))
            month_income = float(db.session.query(func.coalesce(func.sum(SubscriptionPayment.amount), 0)).filter(SubscriptionPayment.status == "completed", SubscriptionPayment.payment_date >= month_start, SubscriptionPayment.payment_date < next_month).scalar() or 0)
            month_new_businesses = Business.query.filter(Business.created_at >= month_start, Business.created_at < next_month).count()
            membership_revenue.append(round(month_income, 2))
            new_businesses_chart.append(int(month_new_businesses))

        if failed_payments_30d > 0:
            health_status = {"status": "critical", "label": "AcciÃ³n requerida"}
        elif expired_count > 0 or expiring_soon_count > 0 or len(at_risk_rows) > 0:
            health_status = {"status": "attention", "label": "Bajo observaciÃ³n"}
        else:
            health_status = {"status": "healthy", "label": "OperaciÃ³n estable"}

        alerts = []
        if failed_payments_30d > 0:
            alerts.append({
                "id": "failed-payments",
                "level": "high",
                "title": "Pagos fallidos recientes",
                "message": f"Hay {failed_payments_30d} cuentas con seÃ±ales de cobro fallido en los Ãºltimos 30 dÃ­as.",
                "cta_label": "Ir a Revenue",
                "cta_to": "/admin/revenue?status=expired",
            })
        if expiring_soon_count > 0:
            alerts.append({
                "id": "expiring-soon",
                "level": "medium",
                "title": "Renovaciones por vencer",
                "message": f"{expiring_soon_count} cuentas necesitan seguimiento antes de vencer.",
                "cta_label": "Abrir Business 360",
                "cta_to": "/admin/businesses?status=at_risk",
            })
        if inactive_businesses_count > 0:
            alerts.append({
                "id": "inactive-adoption",
                "level": "low",
                "title": "AdopciÃ³n inactiva",
                "message": f"{inactive_businesses_count} negocios llevan mÃ¡s de 30 dÃ­as sin actividad visible.",
                "cta_label": "Revisar actividad",
                "cta_to": "/admin/activity",
            })

        recent_activity_logs = AuditLog.query.order_by(AuditLog.timestamp.desc()).limit(12).all()

        return jsonify({
            "generated_at": now.isoformat(),
            "kpis": {
                "total_businesses": total_businesses,
                "active_businesses": active_businesses,
                "inactive_businesses": inactive_businesses_count,
                "at_risk_businesses": len(at_risk_rows),
                "total_users": total_users,
                "active_users_30d": active_users_30d,
                "new_users_7d": new_users_7d,
                "new_businesses_30d": new_businesses_30d,
            },
            "revenue": {
                "income_growth": income_growth,
                "estimated_mrr": estimated_mrr,
                "estimated_arr": estimated_arr,
                "total_membership_income": round(total_membership_income, 2),
                "active_paid_accounts": len(paid_rows),
                "mrr_unknown_accounts": mrr_unknown_accounts,
            },
            "billing": {
                "expiring_soon_count": expiring_soon_count,
                "expired_count": expired_count,
                "auto_renew_off_count": auto_renew_off_count,
                "failed_payments_30d": failed_payments_30d,
            },
            "usage": {
                "recent_audit_events_24h": recent_audit_events_24h,
                "failed_logins_30d": failed_logins_30d,
                "login_success_rate": login_success_rate,
            },
            "health": health_status,
            "plan_distribution": {
                "businesses": plan_distribution,
            },
            "charts": {
                "labels": month_labels,
                "membership_revenue": membership_revenue,
                "new_businesses": new_businesses_chart,
            },
            "alerts": alerts[:4],
            "at_risk_businesses": [
                {
                    "id": row["business_id"],
                    "name": row["business_name"],
                    "owner_email": row["owner_email"],
                    "plan": row["plan"],
                    "risk_level": "high" if any(flag in {"plan_expired", "failed_payment"} for flag in row["risk_flags"]) else "medium",
                    "risk_flags": row["risk_flags"],
                    "last_activity_at": row["last_activity_at"],
                }
                for row in sorted(at_risk_rows, key=lambda item: (0 if "failed_payment" in item["risk_flags"] or "plan_expired" in item["risk_flags"] else 1, item["health_score"]))[:8]
            ],
            "high_value_businesses": [
                {
                    "id": row["business_id"],
                    "name": row["business_name"],
                    "owner_email": row["owner_email"],
                    "plan": row["plan"],
                    "sales_total_30d": row["sales_total_30d"],
                    "sales_total": row["lifetime_membership_income"],
                    "last_activity_at": row["last_activity_at"],
                }
                for row in sorted(rows, key=lambda item: (float(item["sales_total_30d"] or 0), float(item["monthly_equivalent"] or 0)), reverse=True)[:6]
            ],
            "inactive_businesses": [
                {
                    "id": row["business_id"],
                    "name": row["business_name"],
                    "owner_email": row["owner_email"],
                    "plan": row["plan"],
                    "risk_flags": row["risk_flags"],
                    "last_activity_at": row["last_activity_at"],
                }
                for row in sorted(
                    [item for item in rows if "inactive_usage" in item["risk_flags"]],
                    key=lambda item: item["last_activity_at"] or "",
                )[:6]
            ],
            "recent_activity": [
                {
                    "id": log.id,
                    "actor_name": log.actor_name or (log.user.name if log.user else None),
                    "user_email": log.user.email if log.user else None,
                    "action": log.action,
                    "entity": log.entity_type or log.entity,
                    "business_name": Business.query.get(log.business_id).name if log.business_id and Business.query.get(log.business_id) else None,
                    "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                }
                for log in recent_activity_logs
            ],
        })

    @app.route("/api/admin/revenue", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_admin_revenue_center():
        search = (request.args.get("search") or "").strip().lower()
        plan_filter = (request.args.get("plan") or "").strip().lower()
        status_filter = (request.args.get("status") or "").strip().lower()
        range_days = request.args.get("range_days", 30, type=int) or 30
        rows = _build_owner_admin_rows(range_days=range_days)

        if search:
            rows = [
                row for row in rows
                if search in str(row["business_name"] or "").lower()
                or search in str(row["owner_name"] or "").lower()
                or search in str(row["owner_email"] or "").lower()
            ]
        if plan_filter:
            rows = [row for row in rows if str(row["plan"] or "").lower() == plan_filter]
        if status_filter:
            rows = [row for row in rows if str(row["lifecycle_status"] or "").lower() == status_filter]

        plan_distribution = {}
        for row in rows:
            plan_distribution[row["plan"]] = int(plan_distribution.get(row["plan"], 0) + 1)

        active_paid_rows = [row for row in rows if row["plan"] in {"basic", "pro", "business"}]
        response_payload = {
            "summary": {
                "range_days": int(range_days),
                "mrr": round(sum(float(row["monthly_equivalent"] or 0) for row in active_paid_rows), 2),
                "arr": round(sum(float(row["arr_equivalent"] or 0) for row in active_paid_rows), 2),
                "active_paid_accounts": len(active_paid_rows),
                "expiring_soon_count": sum(1 for row in rows if row["lifecycle_status"] == "expiring_soon"),
                "failed_payments_count": sum(1 for row in rows if "failed_payment" in row["risk_flags"]),
                "upgrades_recent": sum(1 for row in rows if (row.get("latest_plan_change") or {}).get("direction") == "upgrade"),
                "downgrades_recent": sum(1 for row in rows if (row.get("latest_plan_change") or {}).get("direction") == "downgrade"),
                "trial_supported": False,
                "trial_accounts": None,
            },
            "plan_distribution": plan_distribution,
            "rows": sorted(rows, key=lambda item: (float(item["monthly_equivalent"] or 0), float(item["sales_total_30d"] or 0)), reverse=True),
            "high_value_accounts": sorted(rows, key=lambda item: (float(item["monthly_equivalent"] or 0), float(item["arr_equivalent"] or 0)), reverse=True)[:6],
            "churn_watchlist": sorted(
                [row for row in rows if row["churn_risk"] or "failed_payment" in row["risk_flags"] or row["lifecycle_status"] in {"expired", "expiring_soon"}],
                key=lambda item: (0 if "failed_payment" in item["risk_flags"] else 1, item["health_score"]),
            )[:6],
            "filters": {
                "plan": ["basic", "pro", "business"],
                "status": ["active", "expiring_soon", "renewal_off", "expired", "manual", "free"],
                "range_days": [30, 60, 90, 180],
            },
        }
        return jsonify(response_payload)

    @app.route("/api/admin/alerts", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_admin_alerts_center():
        now = datetime.utcnow()
        severity_filter = (request.args.get("severity") or "").strip().lower()
        kind_filter = (request.args.get("kind") or "").strip().lower()
        state_filter = (request.args.get("state") or "open").strip().lower()
        business_id_filter = request.args.get("business_id", type=int)
        search = (request.args.get("search") or "").strip().lower()

        rows = _build_owner_admin_rows(range_days=30)
        unread_feedback, pending_invitations = _build_admin_support_metrics(rows, now=now)
        alerts = []
        for row in rows:
            if business_id_filter and row["business_id"] != business_id_filter:
                continue
            if search and search not in str(row["business_name"] or "").lower() and search not in str(row["owner_name"] or "").lower() and search not in str(row["owner_email"] or "").lower():
                continue

            last_activity_at = row.get("last_activity_at")
            base_payload = {
                "business_id": row["business_id"],
                "business_name": row["business_name"],
                "owner_email": row["owner_email"],
                "owner_name": row["owner_name"],
                "plan": row["plan"],
                "last_activity_at": last_activity_at,
                "sales_total_30d": row["sales_total_30d"],
                "sales_count_30d": row["sales_count_30d"],
                "events_30d": row["events_30d"],
                "state": "open",
            }

            if "failed_payment" in row["risk_flags"] or "plan_expired" in row["risk_flags"] or "plan_expiring" in row["risk_flags"]:
                if "failed_payment" in row["risk_flags"] or "plan_expired" in row["risk_flags"]:
                    severity = "high"
                    title = "Cuenta con riesgo de facturaciÃ³n"
                else:
                    severity = "medium"
                    title = "RenovaciÃ³n por atender"
                alerts.append({
                    **base_payload,
                    "id": f"billing-{row['business_id']}",
                    "severity": severity,
                    "kind": "billing",
                    "reason": "Pago fallido, plan vencido o renovaciÃ³n prÃ³xima detectada en la cuenta.",
                    "title": title,
                    "cta_to": f"/admin/businesses?business_id={row['business_id']}",
                    "cta_label": "Abrir Business 360",
                    "created_at": now.isoformat(),
                })

            if "inactive_usage" in row["risk_flags"] or "owner_inactive" in row["risk_flags"]:
                alerts.append({
                    **base_payload,
                    "id": f"adoption-{row['business_id']}",
                    "severity": "medium" if row["sales_count_30d"] > 0 else "low",
                    "kind": "adoption",
                    "reason": "La cuenta muestra baja actividad reciente o el dueÃ±o no ha vuelto a entrar.",
                    "title": "Seguimiento de adopciÃ³n",
                    "cta_to": f"/admin/activity?business_id={row['business_id']}",
                    "cta_label": "Ver actividad",
                    "created_at": now.isoformat(),
                })

            feedback_count = int(unread_feedback.get(row["business_id"], 0) or 0)
            invite_count = int(pending_invitations.get(row["business_id"], 0) or 0)
            if feedback_count > 0 or invite_count > 0:
                alerts.append({
                    **base_payload,
                    "id": f"support-{row['business_id']}",
                    "severity": "medium" if feedback_count > 0 else "low",
                    "kind": "support",
                    "reason": f"{feedback_count} feedback sin leer y {invite_count} invitaciones pendientes requieren revisiÃ³n.",
                    "title": "Pendientes de soporte y equipo",
                    "cta_to": f"/admin/system-health",
                    "cta_label": "Abrir Health Center",
                    "created_at": now.isoformat(),
                })

            if row["churn_risk"]:
                alerts.append({
                    **base_payload,
                    "id": f"churn-{row['business_id']}",
                    "severity": "high" if row["health_score"] <= 40 else "medium",
                    "kind": "churn",
                    "reason": "SeÃ±ales combinadas de baja adopciÃ³n, fricciÃ³n de cobro o deterioro de salud de la cuenta.",
                    "title": "Riesgo de churn",
                    "cta_to": f"/admin/revenue?status={row['lifecycle_status']}",
                    "cta_label": "Ir a Revenue",
                    "created_at": now.isoformat(),
                })

        if severity_filter:
            alerts = [alert for alert in alerts if alert["severity"] == severity_filter]
        if kind_filter:
            alerts = [alert for alert in alerts if alert["kind"] == kind_filter]
        if state_filter:
            alerts = [alert for alert in alerts if alert["state"] == state_filter]

        summary = {
            "high": sum(1 for alert in alerts if alert["severity"] == "high"),
            "medium": sum(1 for alert in alerts if alert["severity"] == "medium"),
            "low": sum(1 for alert in alerts if alert["severity"] == "low"),
            "billing": sum(1 for alert in alerts if alert["kind"] == "billing"),
            "adoption": sum(1 for alert in alerts if alert["kind"] == "adoption"),
            "support": sum(1 for alert in alerts if alert["kind"] == "support"),
            "churn": sum(1 for alert in alerts if alert["kind"] == "churn"),
        }

        return jsonify({
            "alerts": sorted(alerts, key=lambda item: (0 if item["severity"] == "high" else 1 if item["severity"] == "medium" else 2, item["business_name"])),
            "summary": summary,
            "filters": {
                "severity": ["high", "medium", "low"],
                "kind": ["billing", "adoption", "support", "churn"],
                "state": ["open"],
            },
        })

    @app.route("/api/admin/activity", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_admin_activity_center():
        page = request.args.get("page", 1, type=int) or 1
        per_page = request.args.get("per_page", 20, type=int) or 20
        business_id = request.args.get("business_id", type=int)
        action_filter = (request.args.get("action") or "").strip().lower()
        module_filter = (request.args.get("module") or "").strip().lower()
        actor_filter = (request.args.get("actor") or "").strip().lower()

        query = AuditLog.query.options(joinedload(AuditLog.user))
        if business_id:
            query = query.filter(AuditLog.business_id == business_id)
        if action_filter:
            query = query.filter(func.lower(AuditLog.action) == action_filter)
        if module_filter:
            query = query.filter(func.lower(func.coalesce(AuditLog.module, "")) == module_filter)
        if actor_filter:
            actor_pattern = f"%{actor_filter}%"
            query = query.outerjoin(User, AuditLog.user_id == User.id).filter(
                or_(
                    func.lower(func.coalesce(AuditLog.actor_name, "")).like(actor_pattern),
                    func.lower(func.coalesce(User.email, "")).like(actor_pattern),
                    func.lower(func.coalesce(AuditLog.actor_role, "")).like(actor_pattern),
                )
            )

        pagination = query.order_by(AuditLog.timestamp.desc()).paginate(page=page, per_page=per_page, error_out=False)
        business_names = {
            business.id: business.name
            for business in Business.query.filter(Business.id.in_([log.business_id for log in pagination.items if log.business_id])).all()
        } if pagination.items else {}

        action_counts = db.session.query(
            AuditLog.action,
            func.count(AuditLog.id),
        ).group_by(AuditLog.action).order_by(func.count(AuditLog.id).desc()).limit(20).all()
        module_counts = db.session.query(
            AuditLog.module,
            func.count(AuditLog.id),
        ).filter(AuditLog.module != None).group_by(AuditLog.module).order_by(func.count(AuditLog.id).desc()).limit(20).all()

        return jsonify({
            "logs": [
                {
                    "id": log.id,
                    "business_id": log.business_id,
                    "business_name": business_names.get(log.business_id),
                    "user_email": log.user.email if log.user else None,
                    "actor_name": log.actor_name or (log.user.name if log.user else None),
                    "actor_role": log.actor_role,
                    "action": log.action,
                    "entity": log.entity,
                    "entity_type": log.entity_type or log.entity,
                    "entity_id": log.entity_id,
                    "module": log.module,
                    "summary": log.summary,
                    "details": log.to_dict().get("details"),
                    "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                }
                for log in pagination.items
            ],
            "total": pagination.total,
            "page": page,
            "per_page": per_page,
            "pages": pagination.pages,
            "filters": {
                "business_filter_available": True,
                "module_filter_available": True,
                "actor_filter_available": True,
                "actions": [{"value": value, "count": int(count or 0)} for value, count in action_counts if value],
                "modules": [{"value": value, "count": int(count or 0)} for value, count in module_counts if value],
            },
        })

    @app.route("/api/admin/system-health", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_admin_system_health():
        now = datetime.utcnow()
        rows = _build_owner_admin_rows(range_days=30)
        unread_feedback, pending_invitations = _build_admin_support_metrics(rows, now=now)
        failed_logins_30d = AuditLog.query.filter(AuditLog.action == "failed_login", AuditLog.timestamp >= now - timedelta(days=30)).count()
        access_denied_30d = AuditLog.query.filter(AuditLog.action == "access_denied", AuditLog.timestamp >= now - timedelta(days=30)).count()
        unread_feedback_total = sum(unread_feedback.values())
        pending_invitations_total = sum(pending_invitations.values())

        support_issues = []
        for row in rows:
            feedback_count = int(unread_feedback.get(row["business_id"], 0) or 0)
            invite_count = int(pending_invitations.get(row["business_id"], 0) or 0)
            if feedback_count <= 0 and invite_count <= 0 and not row["risk_flags"]:
                continue
            support_issues.append({
                "business_id": row["business_id"],
                "business_name": row["business_name"],
                "owner_email": row["owner_email"],
                "health_score": row["health_score"],
                "risk_flags": row["risk_flags"],
                "unread_feedback": feedback_count,
                "pending_invitations": invite_count,
                "events_30d": row["events_30d"],
                "last_activity_at": row["last_activity_at"],
                "route": f"/admin/businesses?business_id={row['business_id']}",
            })

        if failed_logins_30d > 10 or access_denied_30d > 10:
            status = "critical"
        elif support_issues or unread_feedback_total > 0 or pending_invitations_total > 0:
            status = "attention"
        else:
            status = "healthy"

        return jsonify({
            "summary": {
                "status": status,
                "failed_logins_30d": failed_logins_30d,
                "access_denied_30d": access_denied_30d,
                "unread_feedback_total": unread_feedback_total,
                "pending_invitations_total": pending_invitations_total,
                "accounts_with_recurring_issues": len(support_issues),
                "report_export_telemetry_available": False,
            },
            "support_issues": sorted(support_issues, key=lambda item: (item["health_score"], -item["unread_feedback"], -item["pending_invitations"]))[:12],
            "signals": {
                "security": [
                    {"id": "failed-logins", "label": "Logins fallidos 30d", "value": failed_logins_30d, "severity": "high" if failed_logins_30d > 10 else "medium" if failed_logins_30d > 0 else "low", "route": "/admin/activity?action=failed_login"},
                    {"id": "access-denied", "label": "Accesos denegados 30d", "value": access_denied_30d, "severity": "medium" if access_denied_30d > 0 else "low", "route": "/admin/activity?action=access_denied"},
                ],
                "support": [
                    {"id": "feedback-unread", "label": "Feedback sin leer", "value": unread_feedback_total, "severity": "medium" if unread_feedback_total > 0 else "low", "route": "/admin/alerts?kind=support"},
                    {"id": "pending-invitations", "label": "Invitaciones pendientes", "value": pending_invitations_total, "severity": "medium" if pending_invitations_total > 0 else "low", "route": "/admin/businesses"},
                ],
            },
            "limitations": {
                "exports": "La plataforma aÃºn no expone telemetrÃ­a histÃ³rica detallada de exportaciones; este centro usa seÃ±ales persistidas reales.",
                "sync": "No se inventan estados de sincronizaciÃ³n. Solo se usan auditorÃ­a, feedback, invitaciones y seÃ±ales reales de billing.",
            },
        })

    @app.route("/api/admin/businesses/<int:business_id>/owner-detail", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_admin_business_owner_detail(business_id):
        business = Business.query.options(joinedload(Business.user)).get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404

        row = next((item for item in _build_owner_admin_rows(range_days=30) if item["business_id"] == business_id), None)
        if not row:
            return jsonify({"error": "No se encontrÃ³ contexto owner para este negocio"}), 404

        owner = business.user
        unread_feedback, pending_invitations = _build_admin_support_metrics([row])
        owner_control = _get_owner_control_settings(business)
        feedback_rows = TeamFeedback.query.filter_by(business_id=business_id).order_by(TeamFeedback.created_at.desc()).limit(6).all()
        team_rows = TeamMember.query.filter_by(business_id=business_id).order_by(TeamMember.created_at.desc()).limit(12).all()
        recent_activity_rows = AuditLog.query.filter(AuditLog.business_id == business_id).order_by(AuditLog.timestamp.desc()).limit(8).all()
        intervention_logs = AuditLog.query.filter(
            AuditLog.business_id == business_id,
            AuditLog.module == "owner_control",
        ).order_by(AuditLog.timestamp.desc()).limit(12).all()
        recent_payments = SubscriptionPayment.query.filter(
            SubscriptionPayment.user_id == owner.id
        ).order_by(SubscriptionPayment.payment_date.desc(), SubscriptionPayment.created_at.desc()).limit(6).all() if owner else []
        quick_notes = QuickNote.query.filter_by(business_id=business_id).order_by(QuickNote.created_at.desc()).limit(10).all()

        sales_count = Sale.query.filter_by(business_id=business_id).count()
        sales_total = float(db.session.query(func.coalesce(func.sum(Sale.total), 0)).filter_by(business_id=business_id).scalar() or 0)
        expenses_total = float(db.session.query(func.coalesce(func.sum(Expense.amount), 0)).filter_by(business_id=business_id).scalar() or 0)
        customers_count = Customer.query.filter_by(business_id=business_id).count()
        products_count = Product.query.filter_by(business_id=business_id).count()
        payments_count_30d = Payment.query.filter(Payment.business_id == business_id, Payment.payment_date >= datetime.utcnow().date() - timedelta(days=30)).count()

        risk_level = "high" if any(flag in {"plan_expired", "failed_payment"} for flag in row["risk_flags"]) else "medium" if row["risk_flags"] else "low"

        return jsonify({
            "business": {
                "id": business.id,
                "name": business.name,
                "currency": business.currency,
                "timezone": business.timezone,
                "created_at": business.created_at.isoformat() if business.created_at else None,
                "updated_at": business.updated_at.isoformat() if business.updated_at else None,
                "monthly_sales_goal": business.monthly_sales_goal,
            },
            "owner": {
                "id": owner.id if owner else None,
                "name": owner.name if owner else None,
                "email": owner.email if owner else None,
                "plan": row["plan"],
                "membership_plan": row["membership_plan"],
                "membership_start": row["membership_start"],
                "membership_end": row["membership_end"],
                "membership_auto_renew": bool(owner.membership_auto_renew) if owner else False,
                "lifecycle_status": row["lifecycle_status"],
                "last_login": owner.last_login.isoformat() if owner and owner.last_login else None,
                "is_active": bool(owner.is_active) if owner else False,
            },
            "revenue": {
                "monthly_equivalent": row["monthly_equivalent"],
                "arr_equivalent": row["arr_equivalent"],
                "latest_payment": row["latest_payment"],
                "failed_payment_at": row["failed_payment_at"],
            },
            "metrics": {
                "sales_count": sales_count,
                "sales_total": round(sales_total, 2),
                "sales_count_30d": row["sales_count_30d"],
                "sales_total_30d": row["sales_total_30d"],
                "expenses_total": round(expenses_total, 2),
                "payments_count_30d": payments_count_30d,
                "customers_count": customers_count,
                "products_count": products_count,
                "team_members_count": len(team_rows),
                "pending_invitations": int(pending_invitations.get(business_id, 0) or 0),
                "unread_feedback": int(unread_feedback.get(business_id, 0) or 0),
                "active_modules_count": len([module for module in get_business_modules(business_id) if module.get("enabled")]),
            },
            "risk": {
                "level": risk_level,
                "flags": row["risk_flags"],
                "last_activity_at": row["last_activity_at"],
                "health_score": row["health_score"],
            },
            "quick_actions": [
                {"label": "Abrir Activity", "to": f"/admin/activity?business_id={business_id}", "kind": "activity"},
                {"label": "Abrir Revenue", "to": f"/admin/revenue?search={business.name}", "kind": "revenue"},
                {"label": "Ver alertas", "to": f"/admin/alerts?business_id={business_id}", "kind": "alerts"},
            ],
            "owner_control": owner_control,
            "notes": [note.to_dict() for note in quick_notes],
            "feedback": [item.to_dict() for item in feedback_rows],
            "interventions": [
                {
                    "id": log.id,
                    "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                    "actor_name": log.actor_name or (log.user.name if log.user else None),
                    "actor_email": log.user.email if log.user else None,
                    "summary": log.summary,
                    "reason": (log.metadata_json or {}).get("reason") if isinstance(log.metadata_json, dict) else None,
                    "intervention_type": (log.metadata_json or {}).get("action") if isinstance(log.metadata_json, dict) else None,
                    "before": log.before_json or log.old_value,
                    "after": log.after_json or log.new_value,
                    "metadata": log.metadata_json,
                }
                for log in intervention_logs
            ],
            "team_members": [member.to_dict() for member in team_rows],
            "modules": get_business_modules(business_id),
            "recent_activity": [
                {
                    "id": log.id,
                    "action": log.action,
                    "entity": log.entity_type or log.entity,
                    "summary": log.summary,
                    "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                }
                for log in recent_activity_rows
            ],
            "recent_subscription_payments": [payment.to_dict() for payment in recent_payments],
        })

    @app.route("/api/admin/businesses/<int:business_id>/notes", methods=["POST"])
    @token_required
    @permission_required('admin.*')
    def create_admin_business_note(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        data = request.get_json() or {}
        note_text = str(data.get("note") or "").strip()
        if not note_text:
            return jsonify({"error": "La nota es requerida"}), 400
        if len(note_text) > 280:
            return jsonify({"error": "La nota no puede superar 280 caracteres"}), 400
        note = QuickNote(business_id=business_id, note=note_text)
        db.session.add(note)
        db.session.commit()
        return jsonify({"note": note.to_dict()}), 201

    @app.route("/api/admin/businesses/<int:business_id>/notes/<int:note_id>", methods=["DELETE"])
    @token_required
    @permission_required('admin.*')
    def delete_admin_business_note(business_id, note_id):
        note = QuickNote.query.filter_by(id=note_id, business_id=business_id).first()
        if not note:
            return jsonify({"error": "Nota no encontrada"}), 404
        db.session.delete(note)
        db.session.commit()
        return jsonify({"success": True})

    @app.route("/api/admin/businesses/<int:business_id>/interventions", methods=["POST"])
    @token_required
    @permission_required('admin.*')
    def create_admin_business_intervention(business_id):
        business = Business.query.options(joinedload(Business.user)).get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        owner = business.user
        if not owner:
            return jsonify({"error": "Owner no encontrado"}), 404

        data = request.get_json() or {}
        action = str(data.get("action") or "").strip()
        reason = str(data.get("reason") or "").strip()
        if not action:
            return jsonify({"error": "La acciÃ³n es requerida"}), 400
        if len(reason) < 5:
            return jsonify({"error": "Debes registrar un motivo claro"}), 400

        owner_control = _get_owner_control_settings(business)
        before_snapshot = {
            "membership_end": owner.membership_end.isoformat() if owner.membership_end else None,
            "membership_auto_renew": bool(owner.membership_auto_renew),
            "owner_is_active": bool(owner.is_active),
            "owner_control": owner_control,
        }

        now = datetime.utcnow()
        if action == "extend_membership":
            days = max(int(data.get("days") or 0), 1)
            base_date = owner.membership_end if owner.membership_end and owner.membership_end > now else now
            owner.membership_start = owner.membership_start or now
            owner.membership_end = base_date + timedelta(days=days)
        elif action == "toggle_auto_renew":
            owner.membership_auto_renew = bool(data.get("enabled"))
        elif action == "set_owner_active":
            owner.is_active = bool(data.get("is_active"))
        elif action == "set_priority":
            owner_control["high_priority"] = bool(data.get("high_priority"))
            owner_control["follow_up"] = bool(data.get("follow_up", owner_control.get("follow_up")))
            owner_control["admin_status"] = "priority" if owner_control["high_priority"] else owner_control.get("admin_status") or "normal"
        elif action == "add_structured_note":
            title = str(data.get("title") or "").strip()
            body = str(data.get("body") or "").strip()
            category = str(data.get("category") or "general").strip() or "general"
            if not body:
                return jsonify({"error": "La nota estructurada necesita contenido"}), 400
            notes = list(owner_control.get("structured_notes") or [])
            notes.insert(0, {
                "id": hashlib.sha1(f"{business_id}:{g.current_user.id}:{now.isoformat()}".encode("utf-8")).hexdigest()[:12],
                "title": title or "Nota",
                "body": body,
                "category": category,
                "created_at": now.isoformat(),
                "actor": {"name": g.current_user.name, "email": g.current_user.email},
            })
            owner_control["structured_notes"] = notes[:25]
        else:
            return jsonify({"error": "AcciÃ³n de intervenciÃ³n no soportada"}), 400

        owner_control["last_reason"] = reason
        owner_control["updated_at"] = now.isoformat()
        _save_owner_control_settings(business, owner_control)

        after_snapshot = {
            "membership_end": owner.membership_end.isoformat() if owner.membership_end else None,
            "membership_auto_renew": bool(owner.membership_auto_renew),
            "owner_is_active": bool(owner.is_active),
            "owner_control": owner_control,
        }

        audit_log = AuditLog(
            business_id=business_id,
            user_id=g.current_user.id,
            actor_user_id=g.current_user.id,
            actor_name=g.current_user.name,
            actor_role="admin",
            module="owner_control",
            action="update",
            entity="business",
            entity_type="business",
            entity_id=business_id,
            summary=_build_owner_intervention_summary(action, business.name),
            metadata_json={
                "action": action,
                "reason": reason,
                "payload": {key: value for key, value in data.items() if key != "reason"},
            },
            before_json=before_snapshot,
            after_json=after_snapshot,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )
        db.session.add(audit_log)
        db.session.commit()
        return jsonify({
            "success": True,
            "intervention": {
                "id": audit_log.id,
                "timestamp": audit_log.timestamp.isoformat() if audit_log.timestamp else now.isoformat(),
                "actor_name": g.current_user.name,
                "actor_email": g.current_user.email,
                "summary": audit_log.summary,
                "reason": reason,
                "intervention_type": action,
            },
        }), 201

    @app.route("/api/admin/businesses", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_all_businesses_admin():
        """Get all businesses (admin view) with pagination"""
        page = request.args.get('page', type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '').strip()

        query = Business.query

        if search:
            query = query.filter(Business.name.ilike(f"%{search}%"))

        # Admin should see ALL businesses, not just their own
        if page:
            pagination = query.paginate(page=page, per_page=per_page, error_out=False)
            businesses = pagination.items
            total = pagination.total
            pages = pagination.pages
        else:
            businesses = query.all()
            total = len(businesses)
            pages = 1
            page = 1

        result = []
        for b in businesses:
            sales_count = Sale.query.filter_by(business_id=b.id).count()
            sales_total = db.session.query(db.func.sum(Sale.total)).filter_by(business_id=b.id).scalar() or 0
            expenses_total = db.session.query(db.func.sum(Expense.amount)).filter_by(business_id=b.id).scalar() or 0
            customers_count = Customer.query.filter_by(business_id=b.id).count()
            
            # Get owner name
            owner = User.query.get(b.user_id)
            user_name = owner.name if owner else "Desconocido"
            owner_email = owner.email if owner else ""
            
            result.append({
                "id": b.id, "name": b.name, "currency": b.currency,
                "sales_count": sales_count, "sales_total": sales_total,
                "expenses_total": expenses_total, "customers_count": customers_count,
                "created_at": b.created_at.isoformat() if b.created_at else None,
                "user_name": user_name,
                "owner_email": owner_email
            })
            
        return jsonify({
            "businesses": result,
            "total": total,
            "pages": pages,
            "current_page": page
        })

    # ========== ADMIN GLOBAL DATA ==========
    @app.route("/api/admin/all-customers", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_all_customers_admin():
        """Get all customers from all businesses"""
        customers = db.session.query(
            Customer, Business.name, User.name
        ).join(Business, Customer.business_id == Business.id).join(User, Business.user_id == User.id).all()
        result = []
        for customer, business_name, user_name in customers:
            c = customer.to_dict()
            c['business_name'] = business_name
            c['user_name'] = user_name
            result.append(c)
        return jsonify({"customers": result})

    @app.route("/api/admin/all-products", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_all_products_admin():
        """Get all products from all businesses"""
        products = db.session.query(
            Product, Business.name, User.name
        ).join(Business, Product.business_id == Business.id).join(User, Business.user_id == User.id).all()
        result = []
        for product, business_name, user_name in products:
            p = product.to_dict()
            p['business_name'] = business_name
            p['user_name'] = user_name
            result.append(p)
        return jsonify({"products": result})

    @app.route("/api/admin/analytics", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_analytics_admin():
        """Get global analytics across all businesses"""
        # Total stats
        total_users = User.query.count()
        total_businesses = Business.query.count()
        total_customers = Customer.query.count()
        total_products = Product.query.count()
        total_sales = Sale.query.count()
        
        # Revenue
        total_revenue = db.session.query(db.func.sum(Sale.total)).scalar() or 0
        total_expenses = db.session.query(db.func.sum(Expense.amount)).scalar() or 0
        
        # Recent activity
        recent_sales = Sale.query.order_by(Sale.created_at.desc()).limit(5).all()
        recent_users = User.query.order_by(User.created_at.desc()).limit(5).all()
        
        # Plan distribution
        plan_counts = db.session.query(
            User.plan, db.func.count(User.id)
        ).group_by(User.plan).all()
        
        return jsonify({
            "total_users": total_users,
            "total_businesses": total_businesses,
            "total_customers": total_customers,
            "total_products": total_products,
            "total_sales": total_sales,
            "total_revenue": float(total_revenue),
            "total_expenses": float(total_expenses),
            "net_income": float(total_revenue) - float(total_expenses),
            "recent_sales": [s.to_dict() for s in recent_sales],
            "recent_users": [u.to_dict() for u in recent_users],
            "plan_distribution": {plan: count for plan, count in plan_counts}
        })

    @app.route("/api/admin/customers", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_customers_admin():
        """Get all customers for admin"""
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        search = request.args.get("search", "")
        
        query = Customer.query
        if search:
            query = query.filter(Customer.name.ilike(f"%{search}%") | Customer.email.ilike(f"%{search}%"))
            
        pagination = query.order_by(Customer.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        
        customers = []
        for c in pagination.items:
            c_dict = c.to_dict()
            # Add business name
            business = Business.query.get(c.business_id)
            c_dict['business_name'] = business.name if business else "Unknown"
            customers.append(c_dict)
            
        return jsonify({
            "customers": customers,
            "total": pagination.total,
            "pages": pagination.pages,
            "page": page
        })

    @app.route("/api/admin/products", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_products_admin():
        """Get all products for admin"""
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        search = request.args.get("search", "")
        
        query = Product.query
        if search:
            query = query.filter(Product.name.ilike(f"%{search}%"))
            
        pagination = query.order_by(Product.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        
        products = []
        for p in pagination.items:
            p_dict = p.to_dict()
            # Add business name
            business = Business.query.get(p.business_id)
            p_dict['business_name'] = business.name if business else "Unknown"
            products.append(p_dict)
            
        return jsonify({
            "products": products,
            "total": pagination.total,
            "pages": pagination.pages,
            "page": page
        })

    @app.route("/api/admin/security", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_security_admin():
        """Get security information"""
        # Get recent audit logs related to security
        security_logs = AuditLog.query.filter(
            AuditLog.action.in_(['login', 'logout', 'failed_login', 'password_change', 'permission_denied'])
        ).order_by(AuditLog.timestamp.desc()).limit(20).all()
        
        # Count by action type
        login_attempts = AuditLog.query.filter(
            AuditLog.action.in_(['login', 'failed_login'])
        ).count()
        failed_logins = AuditLog.query.filter(AuditLog.action == 'failed_login').count()
        
        # Active sessions (users with recent activity)
        active_users = User.query.filter(
            User.last_login != None
        ).order_by(User.last_login.desc()).limit(10).all()
        
        return jsonify({
            "security_logs": [log.to_dict() for log in security_logs],
            "login_attempts": login_attempts,
            "failed_logins": failed_logins,
            "success_rate": ((login_attempts - failed_logins) / login_attempts * 100) if login_attempts > 0 else 100,
            "active_users": [u.to_dict() for u in active_users]
        })

    @app.route("/api/admin/domains", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_domains_admin():
        """Get domain configuration"""
        # Get app settings for domains
        custom_domain = AppSettings.query.filter_by(key='custom_domain').first()
        ssl_enabled = AppSettings.query.filter_by(key='ssl_enabled').first()
        domain_verified = AppSettings.query.filter_by(key='domain_verified').first()
        
        return jsonify({
            "domains": [
                {
                    "domain": custom_domain.value if custom_domain else None,
                    "ssl_enabled": ssl_enabled.value == 'true' if ssl_enabled else False,
                    "verified": domain_verified.value == 'true' if domain_verified else False,
                    "status": "active" if (custom_domain and domain_verified and domain_verified.value == 'true') else "pending"
                }
            ],
            "available_tlds": [".app", ".com", ".net", ".org", ".io"]
        })

    @app.route("/api/admin/integrations", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_integrations_admin():
        """Get integrations status"""
        # Get integration settings
        stripe_enabled = AppSettings.query.filter_by(key='stripe_enabled').first()
        paypal_enabled = AppSettings.query.filter_by(key='paypal_enabled').first()
        email_provider = AppSettings.query.filter_by(key='email_provider').first()
        webhook_url = AppSettings.query.filter_by(key='webhook_url').first()
        
        return jsonify({
            "integrations": [
                {
                    "id": "stripe",
                    "name": "Stripe",
                    "enabled": stripe_enabled.value == 'true' if stripe_enabled else False,
                    "status": "connected" if (stripe_enabled and stripe_enabled.value == 'true') else "disconnected",
                    "description": "Procesamiento de pagos"
                },
                {
                    "id": "paypal",
                    "name": "PayPal",
                    "enabled": paypal_enabled.value == 'true' if paypal_enabled else False,
                    "status": "connected" if (paypal_enabled and paypal_enabled.value == 'true') else "disconnected",
                    "description": "Pagos con PayPal"
                },
                {
                    "id": "email",
                    "name": "Email",
                    "enabled": email_provider.value != None if email_provider else False,
                    "status": "connected" if (email_provider and email_provider.value) else "disconnected",
                    "description": f"Proveedor: {email_provider.value if email_provider else 'No configurado'}"
                },
                {
                    "id": "webhooks",
                    "name": "Webhooks",
                    "enabled": webhook_url.value != None if webhook_url else False,
                    "status": "active" if (webhook_url and webhook_url.value) else "inactive",
                    "description": "Notificaciones en tiempo real"
                }
            ]
        })

    @app.route("/api/admin/integrations/<integration_id>", methods=["POST"])
    @token_required
    @permission_required('admin.*')
    def save_integration_config(integration_id):
        """Save integration configuration"""
        data = request.get_json() or {}
        config = data.get('config', {})
        enabled = data.get('enabled', False)
        
        # Map integration IDs to setting keys
        key_mapping = {
            'stripe': 'stripe_enabled',
            'paypal': 'paypal_enabled',
            'email': 'email_provider',
            'webhooks': 'webhook_url'
        }
        
        # Config field mappings
        config_keys = {
            'stripe': ['stripe_api_key', 'stripe_webhook_secret'],
            'paypal': ['paypal_client_id', 'paypal_secret'],
            'email': ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'smtp_from'],
            'webhooks': ['webhook_url', 'webhook_secret']
        }
        
        main_key = key_mapping.get(integration_id)
        if not main_key:
            return jsonify({"error": "IntegraciÃ³n no vÃ¡lida"}), 400
        
        # Save enabled status
        setting = AppSettings.query.filter_by(key=main_key).first()
        if not setting:
            setting = AppSettings(key=main_key, value=str(enabled).lower())
            db.session.add(setting)
        else:
            setting.value = str(enabled).lower()
        
        # Save config fields
        for config_key in config_keys.get(integration_id, []):
            if config_key in config:
                setting_key = f"{integration_id}_{config_key}"
                setting = AppSettings.query.filter_by(key=setting_key).first()
                if not setting:
                    setting = AppSettings(key=setting_key, value=config[config_key])
                    db.session.add(setting)
                else:
                    setting.value = config[config_key]
        
        db.session.commit()
        return jsonify({"ok": True})

    # ========== ADMIN USER MANAGEMENT ==========
    @app.route("/api/admin/users", methods=["GET"])
    @token_required
    @permission_required('admin.users')
    def get_all_users_admin():
        """Get all users for admin management with pagination"""
        page = request.args.get('page', type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '').strip()
        account_type = request.args.get('account_type', '').strip()

        query = User.query

        if account_type:
            query = query.filter(User.account_type == account_type)

        if search:
            query = query.filter(
                db.or_(
                    User.name.ilike(f"%{search}%"),
                    User.email.ilike(f"%{search}%")
                )
            )

        query = query.order_by(User.created_at.desc())

        if page:
            pagination = query.paginate(page=page, per_page=per_page, error_out=False)
            users = pagination.items
            total = pagination.total
            pages = pagination.pages
        else:
            users = query.all()
            total = len(users)
            pages = 1
            page = 1

        result = []
        for u in users:
            user_data = u.to_dict()
            user_data['account_type'] = u.account_type
            
            # Enrich with Business info if team member
            if u.account_type == 'team_member' and u.linked_business_id:
                business = Business.query.get(u.linked_business_id)
                user_data['business_name'] = business.name if business else "Unknown"
                
                # Get Team Member Role
                tm = TeamMember.query.filter_by(user_id=u.id, business_id=u.linked_business_id).first()
                if tm and tm.role:
                    user_data['roles'] = [{'id': tm.role.id, 'name': tm.role.name}]
                else:
                    user_data['roles'] = []
            else:
                # Get system roles for personal accounts
                user_data['roles'] = [ur.role.to_dict() for ur in u.roles]
                
            result.append(user_data)
        
        return jsonify({
            "users": result,
            "total": total,
            "pages": pages,
            "current_page": page
        })

    @app.route("/api/admin/users", methods=["POST"])
    @token_required
    @permission_required('admin.users')
    def create_user_admin():
        """Create a new user (admin only)"""
        try:
            data = request.get_json() or {}
            email = data.get("email", "").strip().lower()
            password = data.get("password", "")
            name = data.get("name", "").strip()
            account_type = data.get("account_type", "personal")
            linked_business_id = data.get("linked_business_id")
            
            print(f"[DEBUG] Creating user - name: {name}, email: {email}, type: {account_type}")
            
            if not email or not password or not name:
                return jsonify({"error": "Email, password y nombre son requeridos"}), 400
            
            # Check for duplicates based on context
            if account_type == 'personal':
                if User.query.filter_by(email=email, account_type='personal').first():
                    return jsonify({"error": "El email ya estÃ¡ en uso como cuenta personal"}), 400
            elif account_type == 'team_member':
                if not linked_business_id:
                    return jsonify({"error": "ID de negocio requerido para cuentas de equipo"}), 400
                if User.query.filter_by(email=email, account_type='team_member', linked_business_id=linked_business_id).first():
                    return jsonify({"error": "El usuario ya existe en este equipo"}), 400
            
            user = User(
                email=email,
                name=name,
                is_admin=data.get("is_admin", False),
                is_active=data.get("is_active", True),
                plan=data.get("plan", "free"),
                account_type=account_type,
                linked_business_id=linked_business_id if account_type == 'team_member' else None,
                email_verified=True # Admin created users are verified
            )
            user.set_password(password)
            db.session.add(user)
            db.session.flush()
            
            # Roles / Team Membership
            role_ids = data.get("role_ids", [])
            # Handle single role_id
            if data.get("role_id"):
                try:
                    rid = int(data.get("role_id"))
                    if rid not in role_ids:
                        role_ids.append(rid)
                except: pass

            if account_type == 'team_member' and linked_business_id:
                # Create TeamMember entry
                # Assuming first role in list is the primary role for team member
                role_id = role_ids[0] if role_ids else None
                if not role_id:
                     return jsonify({"error": "Rol requerido para miembro de equipo"}), 400
                
                tm = TeamMember(
                    business_id=linked_business_id,
                    user_id=user.id,
                    role_id=role_id,
                    status="active"
                )
                db.session.add(tm)
            else:
                # Personal account roles (System roles)
                for role_id in role_ids:
                    try:
                        role = Role.query.get(int(role_id))
                        if role:
                            user_role = UserRole(user_id=user.id, role_id=int(role_id))
                            db.session.add(user_role)
                    except (ValueError, TypeError) as e:
                        print(f"[DEBUG] Error assigning role: {e}")
            
            db.session.commit()
            
            return jsonify({"user": user.to_dict()}), 201
            
        except Exception as e:
            db.session.rollback()
            print(f"[ERROR] Error creating user: {e}")
            return jsonify({"error": "Error al crear usuario", "details": str(e)}), 500

    @app.route("/api/admin/users/<int:user_id>", methods=["GET"])
    @token_required
    @permission_required('admin.users')
    def get_user_admin(user_id):
        """Get user by ID"""
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404
        user_data = user.to_dict()
        user_data['roles'] = [ur.role.to_dict() for ur in user.roles]
        return jsonify({"user": user_data})

    @app.route("/api/admin/users/<int:user_id>", methods=["PUT"])
    @token_required
    @permission_required('admin.users')
    def update_user_admin(user_id):
        """Update user (admin only)"""
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404
        
        data = request.get_json() or {}
        if "email" in data:
            new_email = (data["email"] or "").strip().lower()
            if new_email and new_email != user.email:
                existing = User.query.filter(User.email == new_email, User.id != user_id).first()
                if existing:
                    return jsonify({"error": "El email ya estÃ¡ en uso"}), 400
                user.email = new_email
        if "name" in data:
            user.name = data["name"].strip()
        if "is_admin" in data:
            user.is_admin = bool(data["is_admin"])
        if "is_active" in data:
            user.is_active = bool(data["is_active"])
        if "plan" in data:
            user.plan = data["plan"]
        
        # Update roles if provided - accept both role_ids (array) and role_id (single)
        if "role_ids" in data or "role_id" in data:
            # Remove existing roles
            UserRole.query.filter_by(user_id=user_id).delete()
            
            role_ids = data.get("role_ids", [])
            single_role_id = data.get("role_id")
            if single_role_id:
                try:
                    single_role_id = int(single_role_id)
                    if single_role_id not in role_ids:
                        role_ids.append(single_role_id)
                except (ValueError, TypeError):
                    pass
            
            # Add new roles
            for role_id in role_ids:
                role = Role.query.get(role_id)
                if role:
                    user_role = UserRole(user_id=user_id, role_id=role_id)
                    db.session.add(user_role)
        
        db.session.commit()
        return jsonify({"user": user.to_dict()})

    @app.route("/api/admin/users/<int:user_id>", methods=["DELETE"])
    @token_required
    @permission_required('admin.users')
    def delete_user_admin(user_id):
        """Delete user (admin only)"""
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404
        
        # Prevent deleting yourself
        if user.id == g.current_user.id:
            return jsonify({"error": "No puedes eliminarte a ti mismo"}), 400
        
        db.session.delete(user)
        db.session.commit()
        return jsonify({"ok": True})

    @app.route("/api/admin/users/by-email", methods=["DELETE"])
    @token_required
    @permission_required('admin.users')
    def delete_user_by_email_admin():
        data = request.get_json() or {}
        email = (data.get("email") or "").strip().lower()
        if not email:
            return jsonify({"error": "Email requerido"}), 400
        
        users = User.query.filter_by(email=email).all()
        deleted = 0
        for u in users:
            if u.id == g.current_user.id:
                continue
            db.session.delete(u)
            deleted += 1
        
        db.session.commit()
        return jsonify({"ok": True, "deleted": deleted})

    @app.route("/api/admin/users/<int:user_id>/reset-password", methods=["POST"])
    @token_required
    @permission_required('admin.users')
    def reset_user_password(user_id):
        """Reset user password (admin only)"""
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404
        
        data = request.get_json() or {}
        new_password = data.get("password", "")
        
        if not new_password or len(new_password) < 4:
            return jsonify({"error": "La contraseÃ±a debe tener al menos 4 caracteres"}), 400
        
        user.set_password(new_password)
        db.session.commit()
        return jsonify({"ok": True, "message": "ContraseÃ±a actualizada"})

    @app.route("/api/admin/users/<int:user_id>/grant-access", methods=["POST"])
    @token_required
    @permission_required('admin.users')
    def grant_user_account_access_admin(user_id):
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404

        data = request.get_json() or {}
        plan = data.get("plan")
        duration_days = data.get("duration_days", 30)
        reason = (data.get("reason") or "").strip()

        if not plan:
            return jsonify({"error": "Plan requerido"}), 400
        if not reason or len(reason) < 5:
            return jsonify({"error": "Debes registrar un motivo claro"}), 400

        try:
            previous_snapshot = {
                "plan": user.plan,
                "membership_plan": user.membership_plan,
                "membership_end": user.membership_end.isoformat() if user.membership_end else None,
            }
            grant_payload = grant_manual_account_access(
                user=user,
                plan=plan,
                duration_days=int(duration_days or 0),
                actor_user=g.current_user,
                reason=reason,
            )
            _log_audit(
                g.current_user,
                "grant_account_access",
                "user",
                user.id,
                previous_snapshot,
                {
                    "plan": grant_payload["plan"],
                    "membership_plan": grant_payload["membership_plan"],
                    "membership_end": grant_payload["membership_end"],
                    "reason": reason,
                },
            )
            return jsonify({
                "ok": True,
                "user": user.to_dict(),
                "account_access": build_account_access_payload(user, resolve_account_access(user)),
            })
        except ValueError as exc:
            db.session.rollback()
            return jsonify({"error": str(exc)}), 400
        except Exception as exc:
            db.session.rollback()
            return jsonify({"error": "No se pudo otorgar acceso manual", "details": str(exc)}), 500

    @app.route("/api/admin/users/<int:user_id>/roles", methods=["GET"])
    @token_required
    @permission_required('admin.users')
    def get_user_roles(user_id):
        """Get roles for a user"""
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404
        
        user_roles = UserRole.query.filter_by(user_id=user_id).all()
        resolved_roles = [ur.role.to_dict() for ur in user_roles if ur.role]
        return jsonify({
            "roles": resolved_roles,
            "role_ids": [role["id"] for role in resolved_roles],
        })

    @app.route("/api/admin/users/<int:user_id>/roles", methods=["PUT"])
    @token_required
    @permission_required('admin.users')
    def update_user_roles(user_id):
        """Update roles for a user"""
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "Usuario no encontrado"}), 404
        
        data = request.get_json() or {}
        role_ids = data.get("role_ids", data.get("roles", []))
        
        # Remove existing roles
        UserRole.query.filter_by(user_id=user_id).delete()
        
        # Add new roles
        for role_id in role_ids:
            role = Role.query.get(role_id)
            if role:
                user_role = UserRole(user_id=user_id, role_id=role_id, assigned_by=g.current_user.id)
                db.session.add(user_role)
        
        db.session.commit()
        return jsonify({"ok": True, "message": "Roles actualizados"})

    # ========== ADMIN ROLE MANAGEMENT ==========
    @app.route("/api/admin/roles", methods=["GET"])
    @token_required
    @permission_required('admin.roles')
    def get_all_roles_admin():
        """Get all roles"""
        roles = Role.query.all()
        return jsonify({"roles": [r.to_dict() for r in roles]})

    @app.route("/api/admin/roles", methods=["POST"])
    @token_required
    @permission_required('admin.roles')
    def create_role_admin():
        """Create a new role"""
        data = request.get_json() or {}
        name = data.get("name", "").strip().upper()
        description = data.get("description", "").strip()
        permissions = data.get("permissions", [])
        
        print(f"[DEBUG] Creating role: name={name}, description={description}, permissions={permissions}")
        
        if not name:
            return jsonify({"error": "El nombre del rol es requerido"}), 400
        
        existing = Role.query.filter_by(name=name).first()
        if existing:
            print(f"[DEBUG] Role already exists: {name}")
            return jsonify({"error": "El rol ya existe"}), 400
        
        role = Role(name=name, description=description, is_system=False)
        db.session.add(role)
        db.session.flush()
        print(f"[DEBUG] Role created with id: {role.id}")
        
        # Add permissions - accept both permission names (strings) and IDs (integers)
        permissions = data.get("permissions", [])
        for perm in permissions:
            if isinstance(perm, int):
                # It's an ID
                p = Permission.query.get(perm)
            elif isinstance(perm, str):
                # It's a name
                p = Permission.query.filter_by(name=perm).first()
            else:
                p = None
            
            if p:
                rp = RolePermission(role_id=role.id, permission_id=p.id)
                db.session.add(rp)
        
        db.session.commit()
        return jsonify({"role": role.to_dict()}), 201

    @app.route("/api/admin/roles/<int:role_id>", methods=["GET"])
    @token_required
    @permission_required('admin.roles')
    def get_role_admin(role_id):
        """Get role by ID"""
        role = Role.query.get(role_id)
        if not role:
            return jsonify({"error": "Rol no encontrado"}), 404
        return jsonify({"role": role.to_dict()})

    @app.route("/api/admin/roles/<int:role_id>", methods=["PUT"])
    @token_required
    @permission_required('admin.roles')
    def update_role_admin(role_id):
        """Update role"""
        role = Role.query.get(role_id)
        if not role:
            return jsonify({"error": "Rol no encontrado"}), 404
        
        if role.is_system:
            return jsonify({"error": "No se puede modificar un rol del sistema"}), 400
        
        data = request.get_json() or {}
        if "description" in data:
            role.description = data["description"].strip()
        
        # Update permissions if provided
        if "permissions" in data:
            # Remove existing permissions
            RolePermission.query.filter_by(role_id=role_id).delete()
            # Add new permissions
            for perm_name in data["permissions"]:
                perm = Permission.query.filter_by(name=perm_name).first()
                if perm:
                    rp = RolePermission(role_id=role_id, permission_id=perm.id)
                    db.session.add(rp)
        
        db.session.commit()
        return jsonify({"role": role.to_dict()})

    @app.route("/api/admin/roles/<int:role_id>", methods=["DELETE"])
    @token_required
    @permission_required('admin.roles')
    def delete_role_admin(role_id):
        """Delete role"""
        role = Role.query.get(role_id)
        if not role:
            return jsonify({"error": "Rol no encontrado"}), 404
        
        if role.is_system:
            return jsonify({"error": "No se puede eliminar un rol del sistema"}), 400
        
        db.session.delete(role)
        db.session.commit()
        return jsonify({"ok": True})

    @app.route("/api/admin/roles/<int:role_id>/permissions", methods=["POST"])
    @app.route("/api/admin/roles/<int:role_id>/permissions/bulk", methods=["POST"])
    @token_required
    @permission_required('admin.roles')
    def update_role_permissions(role_id):
        """Update all permissions for a role (bulk replace)"""
        from backend.models import Role, Permission, RolePermission
        
        role = Role.query.get(role_id)
        if not role:
            return jsonify({"error": "Rol no encontrado"}), 404
        
        data = request.get_json() or {}
        permissions = data.get("permissions", [])
        
        if not isinstance(permissions, list):
            return jsonify({"error": "permissions debe ser una lista"}), 400
        
        # Remove all existing permissions
        RolePermission.query.filter_by(role_id=role_id).delete()
        
        # Add new permissions
        for perm_name in permissions:
            perm = Permission.query.filter_by(name=perm_name).first()
            if perm:
                rp = RolePermission(role_id=role_id, permission_id=perm.id)
                db.session.add(rp)
        
        db.session.commit()
        return jsonify({"ok": True})
        """Add permission to role"""
        role = Role.query.get(role_id)
        if not role:
            return jsonify({"error": "Rol no encontrado"}), 404
        
        data = request.get_json() or {}
        permission_name = data.get("permission")
        
        if not permission_name:
            return jsonify({"error": "Nombre del permiso es requerido"}), 400
        
        perm = Permission.query.filter_by(name=permission_name).first()
        if not perm:
            return jsonify({"error": "Permiso no encontrado"}), 404
        
        # Check if already exists
        existing = RolePermission.query.filter_by(role_id=role_id, permission_id=perm.id).first()
        if existing:
            return jsonify({"error": "El permiso ya estÃ¡ asignado al rol"}), 400
        
        rp = RolePermission(role_id=role_id, permission_id=perm.id)
        db.session.add(rp)
        db.session.commit()
        return jsonify({"ok": True})

    @app.route("/api/admin/roles/<int:role_id>/permissions", methods=["DELETE"])
    @token_required
    @permission_required('admin.permissions')
    def remove_permission_from_role(role_id):
        """Remove permission from role"""
        role = Role.query.get(role_id)
        if not role:
            return jsonify({"error": "Rol no encontrado"}), 404
        
        data = request.get_json() or {}
        permission_name = data.get("permission")
        
        if not permission_name:
            return jsonify({"error": "Nombre del permiso es requerido"}), 400
        
        perm = Permission.query.filter_by(name=permission_name).first()
        if not perm:
            return jsonify({"error": "Permiso no encontrado"}), 404
        
        RolePermission.query.filter_by(role_id=role_id, permission_id=perm.id).delete()
        db.session.commit()
        return jsonify({"ok": True})

    @app.route("/api/admin/seed-rbac", methods=["POST"])
    @token_required
    @permission_required('admin.*')
    def reseed_rbac():
        base_permissions = [
            {"name": "admin.*", "description": "Acceso total al panel de administraciÃ³n", "category": "admin"},
            {"name": "admin.users", "description": "Gestionar usuarios", "category": "admin"},
            {"name": "admin.roles", "description": "Gestionar roles", "category": "admin"},
            {"name": "admin.permissions", "description": "Gestionar permisos", "category": "admin"},
            {"name": "products.*", "description": "Acceso completo a productos", "category": "products"},
            {"name": "products.read", "description": "Ver productos", "category": "products"},
            {"name": "products.create", "description": "Crear productos", "category": "products"},
            {"name": "products.update", "description": "Editar productos", "category": "products"},
            {"name": "products.delete", "description": "Eliminar productos", "category": "products"},
            {"name": "clients.*", "description": "Acceso completo a clientes", "category": "clients"},
            {"name": "clients.read", "description": "Ver clientes", "category": "clients"},
            {"name": "clients.create", "description": "Crear clientes", "category": "clients"},
            {"name": "clients.update", "description": "Editar clientes", "category": "clients"},
            {"name": "clients.delete", "description": "Eliminar clientes", "category": "clients"},
            {"name": "sales.*", "description": "Acceso completo a ventas", "category": "sales"},
            {"name": "sales.read", "description": "Ver ventas", "category": "sales"},
            {"name": "sales.create", "description": "Crear ventas", "category": "sales"},
            {"name": "sales.update", "description": "Editar ventas", "category": "sales"},
            {"name": "sales.delete", "description": "Eliminar ventas", "category": "sales"},
            {"name": "payments.*", "description": "Acceso completo a pagos", "category": "payments"},
            {"name": "payments.read", "description": "Ver pagos", "category": "payments"},
            {"name": "payments.create", "description": "Registrar pagos", "category": "payments"},
            {"name": "payments.update", "description": "Editar pagos", "category": "payments"},
            {"name": "payments.delete", "description": "Eliminar pagos", "category": "payments"},
            {"name": "expenses.*", "description": "Acceso completo a gastos", "category": "expenses"},
            {"name": "expenses.read", "description": "Ver gastos", "category": "expenses"},
            {"name": "expenses.create", "description": "Crear gastos", "category": "expenses"},
            {"name": "expenses.update", "description": "Editar gastos", "category": "expenses"},
            {"name": "expenses.delete", "description": "Eliminar gastos", "category": "expenses"},
            {"name": "summary.*", "description": "Acceso completo a resÃºmenes y reportes", "category": "summary"},
            {"name": "summary.dashboard", "description": "Ver dashboard", "category": "summary"},
            {"name": "summary.financial", "description": "Ver estados financieros", "category": "summary"},
            {"name": "export.*", "description": "Acceso completo a exportaciones", "category": "export"},
            {"name": "export.pdf", "description": "Exportar PDF", "category": "export"},
            {"name": "export.excel", "description": "Exportar Excel", "category": "export"},
            {"name": "settings.*", "description": "Acceso completo a configuraciÃ³n", "category": "settings"},
            {"name": "settings.business", "description": "ConfiguraciÃ³n del negocio", "category": "settings"},
        ]

        roles_config = [
            {
                "name": "SUPERADMIN",
                "description": "Administrador supreme con acceso total al sistema",
                "is_system": True,
                "permissions": ["admin.*"],
            },
            {
                "name": "ADMIN",
                "description": "Administrador del negocio con acceso completo",
                "is_system": True,
                "permissions": [
                    "products.*",
                    "clients.*",
                    "sales.*",
                    "payments.*",
                    "expenses.*",
                    "summary.*",
                    "export.*",
                    "settings.*",
                ],
            },
            {
                "name": "VENTAS",
                "description": "Rol para vendedores - acceso a ventas, clientes y productos",
                "is_system": True,
                "permissions": [
                    "products.read",
                    "clients.*",
                    "sales.*",
                    "payments.create",
                    "summary.dashboard",
                ],
            },
            {
                "name": "CONTABILIDAD",
                "description": "Rol para Ã¡rea contable - acceso a reportes y gastos",
                "is_system": True,
                "permissions": [
                    "clients.read",
                    "sales.read",
                    "payments.*",
                    "expenses.*",
                    "summary.*",
                    "export.*",
                ],
            },
            {
                "name": "LECTOR",
                "description": "Solo lectura - puede ver informaciÃ³n sin modificar",
                "is_system": True,
                "permissions": [
                    "products.read",
                    "clients.read",
                    "sales.read",
                    "payments.read",
                    "expenses.read",
                    "summary.dashboard",
                ],
            },
        ]

        try:
            permissions_map = {}
            for perm_data in base_permissions:
                existing_perm = Permission.query.filter_by(name=perm_data["name"]).first()
                if not existing_perm:
                    perm = Permission(
                        name=perm_data["name"],
                        description=perm_data["description"],
                        category=perm_data["category"],
                    )
                    db.session.add(perm)
                    db.session.flush()
                    permissions_map[perm_data["name"]] = perm
                else:
                    permissions_map[perm_data["name"]] = existing_perm

            roles_map = {}
            for role_data in roles_config:
                role_name = role_data["name"]
                perm_names = role_data["permissions"]
                existing_role = Role.query.filter_by(name=role_name).first()
                if not existing_role:
                    role = Role(
                        name=role_name,
                        description=role_data["description"],
                        is_system=role_data["is_system"],
                    )
                    db.session.add(role)
                    db.session.flush()
                else:
                    role = existing_role

                for perm_name in perm_names:
                    perm_obj = permissions_map.get(perm_name)
                    if not perm_obj:
                        continue
                    existing_rp = RolePermission.query.filter_by(
                        role_id=role.id, permission_id=perm_obj.id
                    ).first()
                    if not existing_rp:
                        db.session.add(
                            RolePermission(role_id=role.id, permission_id=perm_obj.id)
                        )

                roles_map[role_name] = role

            db.session.commit()
            return jsonify({"ok": True, "roles": list(roles_map.keys())})
        except Exception as e:
            db.session.rollback()
            print(f"[RBAC] reseed error: {e}")
            return jsonify({"error": "RBAC reseed failed", "detail": str(e)}), 500

    # ========== ADMIN DATA MANAGEMENT ==========
    @app.route("/api/admin/data-stats", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_data_stats():
        """Get database statistics"""
        from backend.models import User, Business, Customer, Product, Sale, Payment, Expense
        
        users = User.query.count()
        businesses = Business.query.count()
        customers = Customer.query.count()
        products = Product.query.count()
        sales = Sale.query.count()
        payments = Payment.query.count()
        expenses = Expense.query.count()
        
        return jsonify({
            "stats": {
                "users": users,
                "businesses": businesses,
                "customers": customers,
                "products": products,
                "sales": sales,
                "payments": payments,
                "expenses": expenses,
                "last_backup": None
            }
        })

    @app.route("/api/admin/export", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def export_data():
        """Export all data"""
        # Plan FREE: sin acceso a exportaciÃ³n
        if g.current_user.plan == "free":
            return jsonify({
                "error": "La exportaciÃ³n estÃ¡ disponible solo en Pro. Actualiza tu plan para usar esta funciÃ³n.",
                "upgrade_url": "/upgrade"
            }), 403
        from backend.models import User, Business, Customer, Product, Sale, Payment, Expense, AuditLog
        import json
        
        format_type = request.args.get('format', 'json')
        
        data = {
            "export_date": datetime.datetime.utcnow().isoformat(),
            "users": [u.to_dict() for u in User.query.all()],
            "businesses": [b.to_dict() for b in Business.query.all()],
            "customers": [c.to_dict() for c in Customer.query.all()],
            "products": [p.to_dict() for p in Product.query.all()],
            "sales": [s.to_dict() for s in Sale.query.all()],
            "payments": [p.to_dict() for p in Payment.query.all()],
            "expenses": [e.to_dict() for e in Expense.query.all()],
            "audit_logs": [a.to_dict() for a in AuditLog.query.limit(1000).all()]
        }
        
        if format_type == 'csv':
            # Simple CSV export for sales
            sales = Sale.query.all()
            csv_data = "id,business_id,customer_id,total,balance,paid,sale_date\n"
            for s in sales:
                csv_data += f"{s.id},{s.business_id},{s.customer_id},{s.total},{s.balance},{s.paid},{s.sale_date}\n"
            
            from flask import Response
            return Response(
                csv_data,
                mimetype="text/csv",
                headers={"Content-disposition": f"attachment; filename=export_{datetime.datetime.now().strftime('%Y%m%d')}.csv"}
            )
        
        return jsonify(data)

    @app.route("/api/admin/import", methods=["POST"])
    @token_required
    @permission_required('admin.*')
    def import_data():
        """Import data from JSON file"""
        # Plan FREE: sin acceso a importaciÃ³n
        if g.current_user.plan == "free":
            return jsonify({
                "error": "La importaciÃ³n estÃ¡ disponible solo en Pro. Actualiza tu plan para usar esta funciÃ³n.",
                "upgrade_url": "/upgrade"
            }), 403
        from backend.models import User, Business, Customer, Product, Sale, Payment, Expense
        
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        try:
            import json
            data = json.load(file)
            
            imported = {"users": 0, "businesses": 0, "customers": 0, "products": 0}
            
            # Import businesses
            if 'businesses' in data:
                for b in data['businesses']:
                    if not Business.query.get(b.get('id')):
                        business = Business(
                            id=b['id'],
                            user_id=b['user_id'],
                            name=b['name'],
                            currency=b.get('currency', 'USD'),
                            timezone=b.get('timezone', 'UTC')
                        )
                        db.session.add(business)
                        imported['businesses'] += 1
            
            # Import customers
            if 'customers' in data:
                for c in data['customers']:
                    if not Customer.query.get(c.get('id')):
                        customer = Customer(
                            id=c['id'],
                            business_id=c['business_id'],
                            name=c['name'],
                            phone=c.get('phone'),
                            address=c.get('address'),
                            notes=c.get('notes'),
                            active=c.get('active', True)
                        )
                        db.session.add(customer)
                        imported['customers'] += 1
            
            # Import products
            if 'products' in data:
                for p in data['products']:
                    if not Product.query.get(p.get('id')):
                        product = Product(
                            id=p['id'],
                            business_id=p['business_id'],
                            name=p['name'],
                            sku=p.get('sku'),
                            price=p.get('price', 0),
                            cost=p.get('cost'),
                            unit=p.get('unit'),
                            stock=p.get('stock', 0),
                            active=p.get('active', True)
                        )
                        db.session.add(product)
                        imported['products'] += 1
            
            db.session.commit()
            return jsonify({"ok": True, "imported": imported})
        
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 400

    # ========== ADMIN PERMISSIONS ==========
    @app.route("/api/admin/permissions", methods=["GET"])
    @token_required
    @permission_required('admin.permissions')
    def get_all_permissions_admin():
        """Get all permissions"""
        permissions = Permission.query.all()
        return jsonify({"permissions": [p.to_dict() for p in permissions]})

    # ========== ADMIN AUDIT LOGS ==========
    @app.route("/api/admin/audit", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_audit_logs():
        """Get audit logs"""
        # Get pagination params
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 50, type=int)
        entity = request.args.get("entity")
        action = request.args.get("action")
        user_id = request.args.get("user_id", type=int)
        
        query = AuditLog.query
        
        if entity:
            query = query.filter(AuditLog.entity == entity)
        if action:
            query = query.filter(AuditLog.action == action)
        if user_id:
            query = query.filter(AuditLog.user_id == user_id)
        
        # Order by most recent
        query = query.order_by(AuditLog.timestamp.desc())
        
        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        
        # Get user info for each log
        logs = []
        for log in pagination.items:
            log_data = log.to_dict()
            if log.user_id:
                user = User.query.get(log.user_id)
                log_data['user_email'] = user.email if user else None
            logs.append(log_data)
        
        return jsonify({
            "logs": logs,
            "total": pagination.total,
            "page": page,
            "per_page": per_page,
            "pages": pagination.pages
        })

    # ========== PUBLIC CONTENT API ==========
    @app.route("/api/banners", methods=["GET"])
    def get_public_banners():
        """Get active banners for public site"""
        banners = Banner.query.filter_by(active=True).order_by(Banner.order.asc()).all()
        return jsonify({"banners": [b.to_dict() for b in banners]})

    @app.route("/api/faqs", methods=["GET"])
    def get_public_faqs():
        """Get active FAQs for public site"""
        faqs = FAQ.query.filter_by(active=True).order_by(FAQ.order.asc()).all()
        return jsonify({"faqs": [f.to_dict() for f in faqs]})
        
    @app.route("/api/prices", methods=["GET"])
    def get_public_prices():
        """Get pricing configuration"""
        config = AppSettings.query.filter_by(key="pricing_config").first()
        if config:
            import json
            return jsonify(json.loads(config.value))
        return jsonify({})

    # ========== ADMIN CONTENT MANAGEMENT ==========
    @app.route("/api/admin/banners", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_admin_banners():
        """Get all banners (admin)"""
        banners = Banner.query.order_by(Banner.order.asc()).all()
        return jsonify({"banners": [b.to_dict() for b in banners]})

    @app.route("/api/admin/banners", methods=["POST"])
    @token_required
    @permission_required('admin.*')
    def create_banner():
        """Create banner"""
        data = request.get_json() or {}
        if not data.get("title") or not data.get("image_url"):
            return jsonify({"error": "TÃ­tulo e imagen son requeridos"}), 400
            
        banner = Banner(
            title=data["title"],
            image_url=data["image_url"],
            link=data.get("link", ""),
            active=data.get("active", True),
            order=data.get("order", 0)
        )
        db.session.add(banner)
        db.session.commit()
        return jsonify({"banner": banner.to_dict()}), 201

    @app.route("/api/admin/banners/<int:banner_id>", methods=["PUT"])
    @token_required
    @permission_required('admin.*')
    def update_banner(banner_id):
        """Update banner"""
        banner = Banner.query.get(banner_id)
        if not banner:
            return jsonify({"error": "Banner no encontrado"}), 404
            
        data = request.get_json() or {}
        if "title" in data: banner.title = data["title"]
        if "image_url" in data: banner.image_url = data["image_url"]
        if "link" in data: banner.link = data["link"]
        if "active" in data: banner.active = bool(data["active"])
        if "order" in data: banner.order = int(data["order"])
        
        db.session.commit()
        return jsonify({"banner": banner.to_dict()})

    @app.route("/api/admin/banners/<int:banner_id>", methods=["DELETE"])
    @token_required
    @permission_required('admin.*')
    def delete_banner(banner_id):
        """Delete banner"""
        banner = Banner.query.get(banner_id)
        if not banner:
            return jsonify({"error": "Banner no encontrado"}), 404
            
        db.session.delete(banner)
        db.session.commit()
        return jsonify({"ok": True})

    @app.route("/api/admin/faqs", methods=["GET"])
    @token_required
    @permission_required('admin.*')
    def get_admin_faqs():
        """Get all FAQs (admin)"""
        faqs = FAQ.query.order_by(FAQ.order.asc()).all()
        return jsonify({"faqs": [f.to_dict() for f in faqs]})

    @app.route("/api/admin/faqs", methods=["POST"])
    @token_required
    @permission_required('admin.*')
    def create_faq():
        """Create FAQ"""
        data = request.get_json() or {}
        if not data.get("question") or not data.get("answer"):
            return jsonify({"error": "Pregunta y respuesta son requeridas"}), 400
            
        faq = FAQ(
            question=data["question"],
            answer=data["answer"],
            active=data.get("active", True),
            order=data.get("order", 0)
        )
        db.session.add(faq)
        db.session.commit()
        return jsonify({"faq": faq.to_dict()}), 201

    @app.route("/api/admin/faqs/<int:faq_id>", methods=["PUT"])
    @token_required
    @permission_required('admin.*')
    def update_faq(faq_id):
        """Update FAQ"""
        faq = FAQ.query.get(faq_id)
        if not faq:
            return jsonify({"error": "FAQ no encontrada"}), 404
            
        data = request.get_json() or {}
        if "question" in data: faq.question = data["question"]
        if "answer" in data: faq.answer = data["answer"]
        if "active" in data: faq.active = bool(data["active"])
        if "order" in data: faq.order = int(data["order"])
        
        db.session.commit()
        return jsonify({"faq": faq.to_dict()})

    @app.route("/api/admin/faqs/<int:faq_id>", methods=["DELETE"])
    @token_required
    @permission_required('admin.*')
    def delete_faq(faq_id):
        """Delete FAQ"""
        faq = FAQ.query.get(faq_id)
        if not faq:
            return jsonify({"error": "FAQ no encontrada"}), 404
            
        db.session.delete(faq)
        db.session.commit()
        return jsonify({"ok": True})

    @app.route("/api/admin/prices", methods=["POST"])
    @token_required
    @permission_required('admin.*')
    def update_prices():
        """Update pricing config"""
        data = request.get_json() or {}
        import json
        
        config = AppSettings.query.filter_by(key="pricing_config").first()
        if not config:
            config = AppSettings(key="pricing_config")
            db.session.add(config)
        
        config.value = json.dumps(data)
        db.session.commit()
        return jsonify({"ok": True})

    # ========== STATIC FILES ==========
    @app.route("/assets/<path:filename>")
    def serve_assets(filename):
        import os
        roots = []
        env_root = os.environ.get("CUADERNO_ROOT")
        if env_root:
            roots.append(env_root)
        roots.append(os.getcwd())
        roots.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        seen = set()
        for root in roots:
            if not root or root in seen:
                continue
            seen.add(root)
            public_assets = os.path.join(root, "public", "assets")
            project_assets = os.path.join(root, "assets")
            frontend_assets = os.path.join(root, "frontend", "assets")
            public_path = os.path.join(public_assets, filename)
            project_path = os.path.join(project_assets, filename)
            frontend_path = os.path.join(frontend_assets, filename)
            if os.path.exists(public_path):
                return send_from_directory(public_assets, filename)
            if os.path.exists(project_path):
                return send_from_directory(project_assets, filename)
            if os.path.exists(frontend_path):
                return send_from_directory(frontend_assets, filename)
        return jsonify({"error": "Not found"}), 404

    @app.route("/public/assets/<path:filename>")
    def serve_public_assets(filename):
        return send_from_directory("../public/assets", filename)

    @app.route("/favicon.ico")
    def favicon():
        import os
        roots = []
        env_root = os.environ.get("CUADERNO_ROOT")
        if env_root:
            roots.append(env_root)
        roots.append(os.getcwd())
        roots.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        seen = set()
        for root in roots:
            if not root or root in seen:
                continue
            seen.add(root)
            public_dir = os.path.join(root, "public")
            root_file = os.path.join(root, "favicon.ico")
            public_file = os.path.join(public_dir, "favicon.ico")
            if os.path.exists(public_file):
                return send_from_directory(public_dir, "favicon.ico")
            if os.path.exists(root_file):
                return send_from_directory(root, "favicon.ico")
        return jsonify({"error": "Not found"}), 404

    @app.route("/api/contact", methods=["POST"])
    def contact():
        data = request.get_json() or {}
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip()
        query_type = (data.get("type") or "").strip()
        message = (data.get("message") or "").strip()
        if not name or not email or not message:
            return jsonify({"error": "Nombre, email y mensaje son requeridos"}), 400
        subject = "[Landing] Nueva consulta"
        body_lines = [
            f"Nombre: {name}",
            f"Email: {email}",
            f"Tipo de consulta: {query_type or 'no especificado'}",
            "",
            message,
        ]
        body = "\n".join(body_lines)
        try:
            from backend.auth import AuthManager
            sent = AuthManager.send_plain_email("encajapp@gmail.com", subject, body)
            if not sent:
                return jsonify({"error": "No se pudo enviar el mensaje, intenta mÃ¡s tarde"}), 500
        except Exception as e:
            print(f"[CONTACT] Error enviando mensaje: {e}")
            return jsonify({"error": "No se pudo enviar el mensaje, intenta mÃ¡s tarde"}), 500
        return jsonify({"success": True})
    
    # ========== PUBLIC CUSTOMER API ==========
    @app.route("/api/public/register", methods=["POST"])
    def public_register():
        """Public registration for customers"""
        try:
            data = request.get_json() or {}
            name = (data.get("name", "") or "").strip()[:100]
            phone = (data.get("phone", "") or "").strip()[:20]
            address = (data.get("address", "") or "").strip()[:200]
            
            if not phone:
                return jsonify({"error": "El celular es requerido"}), 400
            
            # Get first business
            business = Business.query.first()
            if not business:
                return jsonify({"error": "No hay negocios disponibles"}), 400
            
            # Check if customer exists
            existing = Customer.query.filter_by(business_id=business.id, phone=phone).first()
            if existing:
                return jsonify({"success": True, "message": "Cliente ya registrado", "customer_id": existing.id})
            
            # Create new customer
            customer = Customer(
                business_id=business.id,
                name=name or "Cliente",
                phone=phone,
                address=address,
                active=True
            )
            db.session.add(customer)
            db.session.flush()
            _record_business_audit(
                business_id=business.id,
                actor_user=None,
                module="customers",
                entity_type="customer",
                entity_id=customer.id,
                action="create",
                summary=f"Se registrÃ³ el cliente {customer.name}",
                detail="Un cliente fue creado desde el registro pÃºblico.",
                metadata=_build_audit_metadata(
                    source_path="/customers",
                    origin="public_register",
                    phone=customer.phone,
                ),
                after=_audit_snapshot("customer", customer),
            )
            db.session.commit()
            
            return jsonify({"success": True, "message": "Registro exitoso", "customer_id": customer.id})
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": str(e)}), 500
    
    @app.route("/api/public/login", methods=["POST"])
    def public_login():
        """Public login for customers - returns token"""
        try:
            data = request.get_json() or {}
            phone = (data.get("phone", "") or "").strip()
            password = (data.get("password", "") or "")
            
            if not phone or not password:
                return jsonify({"error": "Celular y contraseÃ±a requeridos"}), 400
            
            # Get first business
            business = Business.query.first()
            if not business:
                return jsonify({"error": "No hay negocios disponibles"}), 400
            
            # Find customer
            customer = Customer.query.filter_by(business_id=business.id, phone=phone).first()
            if not customer:
                return jsonify({"error": "Cliente no encontrado"}), 404
            
            # Generate simple token (in production, use proper JWT)
            import base64
            token_data = f"customer_{customer.id}_{business.id}"
            token = base64.b64encode(token_data.encode()).decode()
            
            return jsonify({
                "success": True,
                "token": token,
                "customer_id": customer.id,
                "customer_name": customer.name
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route("/api/public/business")
    def public_business_info():
        """Get public business info for store page"""
        try:
            business = Business.query.first()
            if not business:
                return jsonify({"error": "Negocio no encontrado"}), 404
            
            settings = business.settings or {}
            return jsonify({
                "id": business.id,
                "name": business.name,
                "phone": business.phone or "",
                "address": business.address or "",
                "logo": settings.get("logo", "")
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route("/admin")
    def admin():
        """Legacy admin route - redirect to panel"""
        return send_from_directory("../frontend", "panel.html")

    # Remove legacy static handler if it exists here, as it is handled by the main serve_static
    # The duplicate serve_static at the end of create_app seems redundant or legacy.
    # I will remove it to avoid conflicts with the one defined earlier.

    register_receipt_routes(app)
    register_financial_restore_routes(
        app,
        token_required=token_required,
        permission_required=permission_required,
        has_permission=has_permission,
    )
    register_raw_inventory_restore_routes(
        app,
        token_required=token_required,
        module_required=module_required,
        permission_required=permission_required,
        get_current_role_snapshot=get_current_role_snapshot,
        refresh_summary_materialized_days=refresh_summary_materialized_days,
    )
    register_commercial_core_restore_routes(
        app,
        token_required=token_required,
        module_required=module_required,
        commercial_section_required=commercial_section_required,
        permission_required=permission_required,
        has_permission=has_permission,
        get_current_role_snapshot=get_current_role_snapshot,
        refresh_summary_materialized_days=refresh_summary_materialized_days,
    )
    register_commercial_quotes_restore_routes(
        app,
        token_required=token_required,
        module_required=module_required,
        permission_required=permission_required,
        refresh_summary_materialized_days=refresh_summary_materialized_days,
    )
    register_commercial_invoices_restore_routes(
        app,
        token_required=token_required,
        module_required=module_required,
        commercial_section_required=commercial_section_required,
        permission_required=permission_required,
    )

    existing_endpoints = set(app.view_functions.keys())
    existing_rules = {rule.rule for rule in app.url_map.iter_rules()}
    global_app_instance = globals().get("app")
    if global_app_instance is not None and global_app_instance is not app:
        for rule in global_app_instance.url_map.iter_rules():
            if rule.endpoint == "static":
                continue
            if rule.endpoint in existing_endpoints or rule.rule in existing_rules:
                continue
            view_func = global_app_instance.view_functions.get(rule.endpoint)
            if view_func is None:
                continue
            methods = sorted(method for method in rule.methods if method not in {"HEAD", "OPTIONS"})
            app.add_url_rule(rule.rule, endpoint=rule.endpoint, view_func=view_func, methods=methods)
            existing_endpoints.add(rule.endpoint)
            existing_rules.add(rule.rule)

    log_startup_bootstrap_status(app)

    return app


# ========== BUSINESS PROFILE (RECEIPTS) - Outside create_app ==========
def register_receipt_routes(application):
    """Register receipt routes with the app"""
    from flask import request, jsonify, send_file
    from io import BytesIO
    from datetime import datetime
    
    # PIL for receipt generation (optional)
    try:
        from PIL import Image, ImageDraw, ImageFont
        HAS_PIL = True
    except ImportError:
        HAS_PIL = False
    
    @application.route("/api/business_profile", methods=["GET"])
    def get_business_profile():
        """Get business profile for receipts"""
        try:
            result = db.session.execute(db.text("SELECT * FROM business_profile WHERE id=1")).fetchone()
            if not result:
                db.session.execute(db.text("""
                    INSERT INTO business_profile (id, business_name, phone, tax_id, address, message, updated_at)
                    VALUES (1, '', '', '', '', '', '')
                """))
                db.session.commit()
                result = db.session.execute(db.text("SELECT * FROM business_profile WHERE id=1")).fetchone()
            
            if result:
                return jsonify({
                    "id": result[0], "business_name": result[1] or "",
                    "phone": result[2] or "", "tax_id": result[3] or "",
                    "address": result[4] or "", "message": result[5] or "", "updated_at": result[6] or ""
                })
            return jsonify({"error": "Perfil no encontrado"}), 404
        except Exception as e:
            return jsonify({"id": 1, "business_name": "", "phone": "", "tax_id": "", "address": "", "message": "", "updated_at": ""})

    @application.route("/api/business_profile", methods=["PUT"])
    def update_business_profile():
        data = request.get_json() or {}
        business_name = (data.get("business_name", "") or "")[:120]
        phone = (data.get("phone", "") or "")[:20]
        tax_id = (data.get("tax_id", "") or "")[:20]
        address = (data.get("address", "") or "")[:200]
        message = (data.get("message", "") or "")[:500]
        
        try:
            result = db.session.execute(db.text("SELECT id FROM business_profile WHERE id=1")).fetchone()
            if not result:
                db.session.execute(db.text("""
                    INSERT INTO business_profile (id, business_name, phone, tax_id, address, message, updated_at)
                    VALUES (1, :business_name, :phone, :tax_id, :address, :message, :updated_at)
                """), {"business_name": business_name, "phone": phone, "tax_id": tax_id, "address": address, "message": message, "updated_at": datetime.utcnow().isoformat()})
            else:
                db.session.execute(db.text("""
                    UPDATE business_profile SET business_name=:business_name, phone=:phone, tax_id=:tax_id, address=:address, message=:message, updated_at=:updated_at WHERE id=1
                """), {"business_name": business_name, "phone": phone, "tax_id": tax_id, "address": address, "message": message, "updated_at": datetime.utcnow().isoformat()})
            db.session.commit()
            return jsonify({"success": True})
        except Exception as e:
            try:
                db.session.execute(db.text("""
                    CREATE TABLE IF NOT EXISTS business_profile (id INTEGER PRIMARY KEY CHECK (id=1), business_name TEXT NOT NULL DEFAULT '', phone TEXT DEFAULT '', tax_id TEXT DEFAULT '', address TEXT DEFAULT '', message TEXT DEFAULT '', updated_at TEXT DEFAULT '')
                """))
                db.session.commit()
                return jsonify({"success": True})
            except:
                db.session.rollback()
                return jsonify({"error": str(e)}), 500

    @application.route("/api/receipt", methods=["GET"])
    def get_receipt():
        if not HAS_PIL:
            return jsonify({"error": "PIL/Pillow no estÃ¡ instalado. Instala: pip install Pillow"}), 500
        
        try:
            sale_id = request.args.get("sale_id", type=int)
        except:
            return jsonify({"error": "sale_id invÃ¡lido"}), 400
        
        if not sale_id:
            return jsonify({"error": "sale_id es requerido"}), 400
        
        sale = Sale.query.get(sale_id)
        if not sale:
            return jsonify({"error": "Venta no encontrada"}), 404
        
        customer = Customer.query.get(sale.customer_id) if sale.customer_id else None
        
        profile_data = {"business_name": "Mi Negocio", "phone": "", "tax_id": "", "address": "", "message": ""}
        try:
            result = db.session.execute(db.text("SELECT * FROM business_profile WHERE id=1")).fetchone()
            if result:
                profile_data = {"business_name": result[1] or "Mi Negocio", "phone": result[2] or "", "tax_id": result[3] or "", "address": result[4] or "", "message": result[5] or ""}
        except:
            pass
        
        receipt_number = f"RC-{datetime.now().year}-{sale.id:06d}"
        total = sale.total
        paid = total if sale.paid else 0
        balance = sale.balance or 0
        
        try:
            # Receipt dimensions and styling
            width, height = 450, 500 + (len(sale.items) * 25)
            img = Image.new('RGB', (width, height), color=(250, 250, 252))
            draw = ImageDraw.Draw(img)
            
            # Colors
            primary_color = (41, 128, 185)  # Blue
            secondary_color = (52, 73, 94)  # Dark gray
            accent_color = (46, 204, 113)   # Green
            text_color = (44, 62, 80)        # Dark text
            light_gray = (189, 195, 199)
            white = (255, 255, 255)
            
            # Decorative border
            draw.rectangle([(5, 5), (width-5, height-5)], outline=primary_color, width=3)
            draw.rectangle([(10, 10), (width-10, height-10)], outline=light_gray, width=1)
            
            # Header background
            draw.rectangle([(15, 15), (width-15, 90)], fill=primary_color)
            
            try:
                font_title = ImageFont.truetype("arial.ttf", 22)
                font_header = ImageFont.truetype("arial.ttf", 16)
                font_normal = ImageFont.truetype("arial.ttf", 13)
                font_small = ImageFont.truetype("arial.ttf", 10)
                font_tiny = ImageFont.truetype("arial.ttf", 9)
            except:
                font_title = font_header = font_normal = font_small = font_tiny = ImageFont.load_default()
            
            # Business name in header (white text on blue)
            y = 25
            business_name = profile_data["business_name"] or "RECIBO DE VENTA"
            draw.text((width//2, y), business_name.upper(), fill='white', anchor='mm', font=font_title)
            y += 30
            draw.text((width//2, y), "COMPROBANTE DE PAGO", fill='white', anchor='mm', font=font_header)
            
            # Reset y for content
            y = 110
            
            # Receipt info box
            draw.rectangle([(20, y), (width-20, y+60)], outline=light_gray, width=1)
            y += 15
            draw.text((30, y), f"Recibo #: {receipt_number}", fill=secondary_color, font=font_normal)
            y += 18
            draw.text((30, y), f"Fecha: {sale.sale_date}", fill=secondary_color, font=font_normal)
            y += 18
            draw.text((30, y), f"Hora: {datetime.now().strftime('%H:%M:%S')}", fill=secondary_color, font=font_normal)
            
            # Business info
            y += 25
            if profile_data["tax_id"]:
                draw.text((30, y), f"NIT/RUT: {profile_data['tax_id']}", fill=text_color, font=font_small)
                y += 15
            if profile_data["phone"]:
                draw.text((30, y), f"TelÃ©fono: {profile_data['phone']}", fill=text_color, font=font_small)
                y += 15
            if profile_data["address"]:
                draw.text((30, y), f"DirecciÃ³n: {profile_data['address']}", fill=text_color, font=font_small)
                y += 15
            
            # Separator line
            y += 10
            draw.line([(30, y), (width-30, y)], fill=primary_color, width=2)
            y += 15
            
            # Customer info
            customer_name = customer.name if customer else "Cliente general"
            customer_doc = customer.tax_id if customer and hasattr(customer, 'tax_id') else ""
            draw.text((30, y), f"CLIENTE:", fill=primary_color, font=font_small)
            y += 15
            draw.text((30, y), customer_name, fill=text_color, font=font_normal)
            if customer_doc:
                y += 15
                draw.text((30, y), f"Documento: {customer_doc}", fill=text_color, font=font_small)
            
            # Separator
            y += 20
            draw.line([(30, y), (width-30, y)], fill=light_gray, width=1)
            y += 15
            
            # Items header
            draw.text((35, y), "DESCRIPCIÃ“N", fill=primary_color, font=font_small)
            draw.text((280, y), "CANT.", fill=primary_color, font=font_small)
            draw.text((360, y), "PRECIO", fill=primary_color, font=font_small)
            
            # Items separator
            y += 18
            draw.line([(30, y), (width-30, y)], fill=light_gray, width=1)
            y += 10
            
            for item in sale.items:
                name = item.get("name", "Producto")[:25]
                qty = item.get("qty", 1)
                price = item.get("price", 0)
                item_total = item.get("total", qty * price)
                
                draw.text((35, y), name, fill=text_color, font=font_small)
                draw.text((285, y), str(qty), fill=text_color, font=font_small)
                draw.text((360, y), f"${price:,.0f}", fill=text_color, font=font_small)
                y += 18
                
                # Show subtotal if different from total
                if item_total != price * qty:
                    draw.text((320, y), f"Subtotal: ${item_total:,.0f}", fill=(128, 128, 128), font=font_tiny)
                    y += 15
            
            # Total section
            y += 15
            draw.line([(30, y), (width-30, y)], fill=primary_color, width=2)
            y += 15
            
            # Total box with background
            draw.rectangle([(250, y-5), (width-20, y+55)], fill=(245, 247, 250))
            draw.text((260, y), "SUBTOTAL:", fill=text_color, font=font_normal)
            draw.text((380, y), f"${total:,.0f}", fill=text_color, font=font_normal)
            y += 22
            draw.text((260, y), "TOTAL A PAGAR:", fill=secondary_color, font=font_normal)
            draw.text((380, y), f"${total:,.0f}", fill=secondary_color, font=font_normal)
            y += 22
            
            # Payment status
            if paid > 0:
                draw.text((260, y), f"PAGADO:", fill=accent_color, font=font_normal)
                draw.text((380, y), f"${paid:,.0f}", fill=accent_color, font=font_normal)
            if balance > 0:
                y += 22
                draw.text((260, y), "SALDO PENDIENTE:", fill=(231, 76, 60), font=font_normal)
                draw.text((380, y), f"${balance:,.0f}", fill=(231, 76, 60), font=font_normal)
            
            # Custom message from business
            y += 40
            if profile_data["message"]:
                draw.line([(30, y-10), (width-30, y-10)], fill=light_gray, width=1)
                y += 5
                draw.text((width//2, y), "ðŸ“ MENSAJE", fill=primary_color, anchor='mm', font=font_small)
                y += 18
                # Wrap message text
                import textwrap
                message_lines = textwrap.wrap(profile_data["message"], width=45)
                for line in message_lines:
                    draw.text((30, y), line, fill=(100, 100, 100), font=font_small)
                    y += 14
            
            # Footer
            y = height - 50
            draw.line([(50, y), (width-50, y)], fill=light_gray, width=1)
            y += 10
            draw.text((width//2, y), "Gracias por su compra!", fill=primary_color, anchor='mm', font=font_normal)
            y += 18
            draw.text((width//2, y), f"Sistema de GestiÃ³n - {datetime.now().year}", fill=light_gray, anchor='mm', font=font_tiny)
            
            img_bytes = BytesIO()
            img.save(img_bytes, format='PNG')
            img_bytes.seek(0)
            return send_file(img_bytes, mimetype='image/png', as_attachment=False, download_name=f'recibo_{sale_id}.png')
        except Exception as e:
            return jsonify({"error": f"Error: {str(e)}"}), 500

    @application.route("/api/receipt/link/<int:sale_id>", methods=["GET"])
    @token_required
    def get_receipt_link(sale_id):
        current_user = g.current_user
        try:
            sale = Sale.query.get(sale_id)
            if not sale:
                return jsonify({"error": "Venta no encontrada"}), 404
            
            # Ensure user owns the business of the sale
            business = Business.query.get(sale.business_id)
            if not business or business.user_id != current_user.id:
                return jsonify({"error": "No autorizado"}), 403

            s = URLSafeTimedSerializer(application.config["SECRET_KEY"])
            token = s.dumps(sale.id, salt="receipt-view")
            
            link = url_for('public_receipt', token=token, _external=True)
            path = url_for('public_receipt', token=token, _external=False)
            return jsonify({"url": link, "path": path, "token": token})
        except Exception as e:
            print(f"Error generating receipt link: {e}")
            return jsonify({"error": f"Error interno: {str(e)}"}), 500

    @application.route("/api/public/r/<token>")
    def public_receipt(token):
        s = URLSafeTimedSerializer(application.config["SECRET_KEY"])
        try:
            sale_id = s.loads(token, salt="receipt-view", max_age=86400 * 30) # 30 days valid
        except SignatureExpired:
            return "El enlace del recibo ha expirado.", 404
        except BadSignature:
            return "Enlace invÃ¡lido.", 404
            
        sale = Sale.query.get(sale_id)
        if not sale:
            return "Venta no encontrada", 404
            
        business = Business.query.get(sale.business_id)
        customer = Customer.query.get(sale.customer_id) if sale.customer_id else None
        
        profile_data = {"business_name": business.name, "phone": "", "tax_id": "", "address": "", "message": ""}
        try:
            result = db.session.execute(db.text("SELECT * FROM business_profile WHERE id=1")).fetchone()
            if result:
                profile_data = {
                    "business_name": result[1] or business.name,
                    "phone": result[2] or "", 
                    "tax_id": result[3] or "", 
                    "address": result[4] or "", 
                    "message": result[5] or ""
                }
        except:
            pass
            
        receipt_number = f"RC-{sale.sale_date.year}-{sale.id:06d}"
        
        return render_template('receipt_view.html', 
                               sale=sale, 
                               business=profile_data, 
                               customer=customer, 
                               receipt_number=receipt_number)


# Create app instance
app = create_app()


# Additional route for WhatsApp sharing - get sale by ID
@app.route("/api/sales", methods=["GET"])
def get_sale_for_whatsapp():
    """Get sale data for WhatsApp sharing"""
    from flask import request
    sale_id = request.args.get("id", type=int)
    if not sale_id:
        return jsonify({"error": "id es requerido"}), 400
    
    sale = Sale.query.get(sale_id)
    if not sale:
        return jsonify({"error": "Venta no encontrada"}), 404
    
    return jsonify({
        "sales": [{
            "id": sale.id,
            "total": sale.total,
            "paid": sale.paid,
            "balance": sale.balance,
            "customer_id": sale.customer_id,
            "sale_date": sale.sale_date.isoformat() if sale.sale_date else None
        }]
    })

# ========== DEBTS ROUTES ==========
@app.route("/api/businesses/<int:business_id>/debts", methods=["GET", "POST"])
@token_required
def handle_debts(business_id):
    required_permission = "debts.manage" if request.method == "POST" else "debts.view"
    if not has_permission(g.current_user, required_permission, business_id):
        return jsonify({"error": f"Permiso requerido: {required_permission}"}), 403
    business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
    if not business:
        return jsonify({"error": "Negocio no encontrado"}), 404

    if request.method == "POST":
        data = request.get_json()
        
        # Parse dates
        try:
            start_date = datetime.strptime(data.get("start_date"), "%Y-%m-%d").date() if data.get("start_date") else date.today()
            due_date = datetime.strptime(data.get("due_date"), "%Y-%m-%d").date() if data.get("due_date") else None
        except:
            return jsonify({"error": "Fechas invÃ¡lidas"}), 400
        
        try:
            total_amount = float(data.get("total_amount") or 0)
            initial_payment_amount = float(data.get("initial_payment_amount") or 0)
        except (TypeError, ValueError):
            return jsonify({"error": "Montos invÃ¡lidos"}), 400
        if total_amount <= 0:
            return jsonify({"error": "El monto total debe ser mayor a 0"}), 400
        if initial_payment_amount < 0 or initial_payment_amount - total_amount > 0.01:
            return jsonify({"error": "El pago inicial es invÃ¡lido"}), 400

        treasury_context = None
        if initial_payment_amount > 0:
            try:
                treasury_context = resolve_treasury_context(
                    business_id,
                    treasury_account_id=data.get("treasury_account_id"),
                    payment_method=data.get("payment_method"),
                    allow_account_autoselect=True,
                    require_account=True,
                    missing_account_message="Debes seleccionar o configurar una cuenta de caja para registrar el pago inicial",
                )
            except ValueError as exc:
                return jsonify({"error": str(exc)}), 400

        debt = Debt(
            business_id=business_id,
            name=data.get("name"),
            creditor_name=data.get("creditor_name"),
            category=data.get("category"),
            total_amount=total_amount,
            balance_due=total_amount,
            start_date=start_date,
            due_date=due_date,
            frequency=data.get("frequency"),
            interest_rate=data.get("interest_rate"),
            installments=data.get("installments"),
            estimated_installment=data.get("estimated_installment"),
            status=data.get("status", "pending"),
            notes=data.get("notes"),
            reminder_enabled=data.get("reminder_enabled", False)
        )

        db.session.add(debt)
        db.session.flush()
        payment = None
        if initial_payment_amount > 0:
            payment = _apply_debt_payment(
                debt=debt,
                amount=initial_payment_amount,
                payment_date=start_date,
                payment_method=treasury_context.get("payment_method"),
                treasury_account_id=treasury_context.get("treasury_account_id"),
                note=data.get("initial_payment_note") or f"Pago inicial {debt.name}",
                actor_user=g.current_user,
                role_snapshot=get_current_role_snapshot(g.current_user, business_id),
            )
        mark_business_payloads_dirty(business_id, [start_date])
        db.session.commit()
        payload = {"debt": debt.to_dict()}
        if payment is not None:
            payload["payment"] = payment.to_dict()
        return jsonify(payload), 201

    # GET
    status = request.args.get("status")
    category = request.args.get("category")
    search = request.args.get("search")

    query = Debt.query.filter_by(business_id=business_id)

    if status:
        if status == "active":
            query = query.filter(Debt.status.in_(["pending", "partial", "overdue"]))
        elif status == "overdue":
            query = query.filter(Debt.status == "overdue")
        else:
            query = query.filter(Debt.status == status)
    
    if category:
        query = query.filter(Debt.category == category)
    
    if search:
        query = query.filter(
            (Debt.name.ilike(f"%{search}%")) | 
            (Debt.creditor_name.ilike(f"%{search}%")) |
            (Debt.notes.ilike(f"%{search}%"))
        )

    debts = query.order_by(Debt.due_date.asc()).all()
    return jsonify({"debts": [d.to_dict() for d in debts]})

@app.route("/api/businesses/<int:business_id>/debts/<int:debt_id>", methods=["PUT"])
@token_required
def update_debt(business_id, debt_id):
    if not has_permission(g.current_user, "debts.manage", business_id):
        return jsonify({"error": "Permiso requerido: debts.manage"}), 403
    debt = Debt.query.filter_by(id=debt_id, business_id=business_id).first()
    if not debt:
        return jsonify({"error": "Deuda no encontrada"}), 404

    data = request.get_json()
    
    if "name" in data: debt.name = data["name"]
    if "creditor_name" in data: debt.creditor_name = data["creditor_name"]
    if "category" in data: debt.category = data["category"]
    if "total_amount" in data: debt.total_amount = data["total_amount"]
    if "balance_due" in data: debt.balance_due = data["balance_due"]
    if "frequency" in data: debt.frequency = data["frequency"]
    if "interest_rate" in data: debt.interest_rate = data["interest_rate"]
    if "installments" in data: debt.installments = data["installments"]
    if "estimated_installment" in data: debt.estimated_installment = data["estimated_installment"]
    if "status" in data: debt.status = data["status"]
    if "notes" in data: debt.notes = data["notes"]
    if "reminder_enabled" in data: debt.reminder_enabled = data["reminder_enabled"]
    
    if "start_date" in data:
        try:
            debt.start_date = datetime.strptime(data["start_date"], "%Y-%m-%d").date()
        except: pass
        
    if "due_date" in data:
        try:
            debt.due_date = datetime.strptime(data["due_date"], "%Y-%m-%d").date()
        except: pass

    db.session.commit()
    return jsonify({"debt": debt.to_dict()})

@app.route("/api/businesses/<int:business_id>/debts/<int:debt_id>", methods=["DELETE"])
@token_required
def delete_debt(business_id, debt_id):
    if not has_permission(g.current_user, "debts.manage", business_id):
        return jsonify({"error": "Permiso requerido: debts.manage"}), 403
    debt = Debt.query.filter_by(id=debt_id, business_id=business_id).first()
    if not debt:
        return jsonify({"error": "Deuda no encontrada"}), 404

    db.session.delete(debt)
    db.session.commit()
    return jsonify({"ok": True})

@app.route("/api/businesses/<int:business_id>/debts/<int:debt_id>/payments", methods=["GET", "POST"])
@token_required
def handle_debt_payments(business_id, debt_id):
    required_permission = "debts.manage" if request.method == "POST" else "debts.view"
    if not has_permission(g.current_user, required_permission, business_id):
        return jsonify({"error": f"Permiso requerido: {required_permission}"}), 403
    debt = Debt.query.filter_by(id=debt_id, business_id=business_id).first()
    if not debt:
        return jsonify({"error": "Deuda no encontrada"}), 404

    if request.method == "POST":
        data = request.get_json()
        amount = float(data.get("amount", 0))
        
        if amount <= 0:
            return jsonify({"error": "El monto debe ser mayor a 0"}), 400
        if amount - float(debt.balance_due or 0) > 0.01:
            return jsonify({"error": "El pago no puede superar el saldo pendiente"}), 400

        try:
            payment_date = datetime.strptime(data.get("payment_date"), "%Y-%m-%d").date() if data.get("payment_date") else date.today()
        except:
            return jsonify({"error": "Fecha invÃ¡lida"}), 400

        try:
            treasury_context = resolve_treasury_context(
                business_id,
                treasury_account_id=data.get("treasury_account_id"),
                payment_method=data.get("payment_method"),
                allow_account_autoselect=True,
                require_account=True,
                missing_account_message="Debes seleccionar o configurar una cuenta de caja para registrar el pago",
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

        payment = _apply_debt_payment(
            debt=debt,
            amount=amount,
            payment_date=payment_date,
            payment_method=treasury_context.get("payment_method"),
            treasury_account_id=treasury_context.get("treasury_account_id"),
            note=data.get("note"),
            actor_user=g.current_user,
            role_snapshot=get_current_role_snapshot(g.current_user, business_id),
        )
        mark_business_payloads_dirty(business_id, [payment_date])
        db.session.commit()
        
        return jsonify({
            "payment": payment.to_dict(),
            "debt": debt.to_dict()
        }), 201

    # GET
    payments = DebtPayment.query.filter_by(debt_id=debt_id).order_by(DebtPayment.payment_date.desc()).all()
    return jsonify({"payments": [p.to_dict() for p in payments]})

@app.route("/api/businesses/<int:business_id>/debts/<int:debt_id>/payments/<int:payment_id>", methods=["DELETE"])
@token_required
def delete_debt_payment(business_id, debt_id, payment_id):
    if not has_permission(g.current_user, "debts.manage", business_id):
        return jsonify({"error": "Permiso requerido: debts.manage"}), 403
    debt = Debt.query.filter_by(id=debt_id, business_id=business_id).first()
    if not debt:
        return jsonify({"error": "Deuda no encontrada"}), 404

    payment = DebtPayment.query.filter_by(id=payment_id, debt_id=debt_id).first()
    if not payment:
        return jsonify({"error": "Pago no encontrado"}), 404

    # Revert balance
    debt.balance_due = round(float(debt.balance_due or 0) + float(payment.amount or 0), 2)
    if debt.balance_due <= 0.01:
        debt.balance_due = 0.0
        debt.status = "paid"
    else:
        debt.status = "partial"
    linked_expenses = Expense.query.filter_by(debt_payment_id=payment.id, debt_id=debt.id).all()
    for expense in linked_expenses:
        db.session.delete(expense)

    db.session.delete(payment)
    mark_business_payloads_dirty(business_id, [payment.payment_date])
    db.session.commit()
    return jsonify({"ok": True, "debt": debt.to_dict()})

@app.route("/api/businesses/<int:business_id>/debts/summary", methods=["GET"])
@token_required
def get_debts_summary(business_id):
    if not has_permission(g.current_user, "debts.view", business_id):
        return jsonify({"error": "Permiso requerido: debts.view"}), 403
    business = Business.query.filter_by(id=business_id, user_id=g.current_user.id).first()
    if not business:
        return jsonify({"error": "Negocio no encontrado"}), 404

    debts = Debt.query.filter_by(business_id=business_id).all()
    total_debt = sum(d.balance_due for d in debts if d.status not in ["paid"])
    active_count = len([d for d in debts if d.status not in ["paid"]])

    today = date.today()
    overdue_debts = [d for d in debts if d.due_date and d.due_date < today and d.status not in ["paid"]]
    overdue_total = sum(d.balance_due for d in overdue_debts)

    upcoming = sorted([d for d in debts if d.due_date and d.due_date >= today and d.status not in ["paid"]], key=lambda x: x.due_date)
    next_due = upcoming[0].to_dict() if upcoming else None

    start_of_month = today.replace(day=1)
    payments_this_month = db.session.query(func.sum(DebtPayment.amount)).join(Debt).filter(
        Debt.business_id == business_id,
        DebtPayment.payment_date >= start_of_month
    ).scalar() or 0

    return jsonify({
        "total_debt": total_debt,
        "active_count": active_count,
        "overdue_total": overdue_total,
        "overdue_count": len(overdue_debts),
        "next_due": next_due,
        "paid_this_month": payments_this_month
    })

@app.route("/<path:path>")
def serve_static(path):
    # 1. API routes should not be handled here (Flask handles them first usually, but safety check)
    if path.startswith("api/"):
        return jsonify({"error": "Not found"}), 404
        
    # 2. Try to serve existing static file
    full_path = os.path.join(app.static_folder, path)
    if os.path.exists(full_path) and os.path.isfile(full_path):
        return send_from_directory(app.static_folder, path)
        
    # 3. SPA Fallback: Serve index.html for non-API routes
    return send_from_directory(app.static_folder, "index.html")

@app.route("/api/webhooks/brevo", methods=["POST"])
def brevo_webhook():
    """Handle Brevo webhooks for email delivery status"""
    data = request.get_json() or {}
    print(f"[WEBHOOK] Brevo event received: {data}")
    
    event = data.get("event")
    message_id = data.get("message-id")
    
    if not event or not message_id:
        return jsonify({"ignored": True}), 200
        
    # Find invitation by message_id
    # Note: Brevo might send message-id with angle brackets <...>, so we might need to strip them or search with LIKE
    # stored message_id usually comes from API response which might be without brackets.
    # Let's try exact match first.
    invite = TeamInvitation.query.filter_by(message_id=message_id).first()
    
    if not invite:
        # Try stripping brackets if present
        clean_id = message_id.strip("<>")
        invite = TeamInvitation.query.filter_by(message_id=clean_id).first()
        
    if invite:
        print(f"[WEBHOOK] Updating invite {invite.id} status to {event}")
        invite.delivery_status = event
        db.session.commit()
        return jsonify({"success": True})
        
    return jsonify({"ignored": True, "reason": "Invitation not found"}), 200

# ========== TEAM FEEDBACK ROUTES ==========
@app.route("/api/businesses/<int:business_id>/feedback", methods=["POST"])
@token_required
def create_team_feedback(business_id):
    # Allow any team member (even without permissions) to send feedback
    # But must be member of THIS business
    if g.current_user.account_type == 'team_member':
         # Verify link
         if g.current_user.linked_business_id != business_id:
             return jsonify({"error": "No perteneces a este negocio"}), 403
    elif g.current_user.account_type == 'personal':
         # Owner can also create feedback (test)
         business = Business.query.get(business_id)
         if not business or business.user_id != g.current_user.id:
             return jsonify({"error": "Acceso denegado"}), 403
    
    data = request.get_json() or {}
    subject = data.get("subject", "").strip()
    message = data.get("message", "").strip()
    type_ = data.get("type", "suggestion")
    
    if not subject or not message:
        return jsonify({"error": "Asunto y mensaje requeridos"}), 400
        
    feedback = TeamFeedback(
        business_id=business_id,
        user_id=g.current_user.id,
        type=type_,
        subject=subject,
        message=message
    )
    
    db.session.add(feedback)
    db.session.commit()
    
    # Optional: Notify Owner via Email
    try:
        business = Business.query.get(business_id)
        owner = business.user
        if owner and owner.email:
            AuthManager.send_plain_email(
                owner.email,
                f"Nuevo mensaje de equipo: {subject}",
                f"Has recibido un nuevo mensaje de {g.current_user.name}:\n\n{message}\n\nPuedes verlo en la secciÃ³n de Equipo."
            )
    except Exception as e:
        print(f"Error sending feedback notification: {e}")
        
    return jsonify(feedback.to_dict()), 201

@app.route("/api/businesses/<int:business_id>/feedback", methods=["GET"])
@token_required
@permission_required('team.read')
def get_team_feedback(business_id):
    feedbacks = TeamFeedback.query.filter_by(business_id=business_id).order_by(TeamFeedback.created_at.desc()).all()
    return jsonify({"feedback": [f.to_dict() for f in feedbacks]})

@app.route("/api/businesses/<int:business_id>/analytics/team", methods=["GET"])
@token_required
@module_required("reports")
@permission_required('analytics.view_team')
def team_analytics(business_id):
    business = Business.query.get(business_id)
    if not business: return jsonify({"error": "Negocio no encontrado"}), 404

    start_date_str = request.args.get("start_date")
    end_date_str = request.args.get("end_date")
    
    start_date = None
    end_date = None
    
    try:
        if start_date_str: start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        if end_date_str: end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
    except: return jsonify({"error": "Fecha invÃ¡lida"}), 400

    from backend.services.analytics_layer import AnalyticsLayer
    analytics = AnalyticsLayer(business_id)
    summary = analytics.get_team_performance_summary(start_date, end_date)
    # Obtener detalle para mostrar en UI (limitado a recientes para performance)
    all_activity = analytics.get_team_activity_detail(start_date, end_date)
    recent_activity = all_activity[:200] # Mostrar Ãºltimos 200 en pantalla
    
    return jsonify({
        "summary": summary,
        "recent_activity": recent_activity
    })

@app.route("/api/businesses/<int:business_id>/export/team", methods=["GET"])
@token_required
@module_required("reports")
@permission_required('analytics.view_team')
def export_team_report(business_id):
    business = Business.query.get(business_id)
    if not business: return jsonify({"error": "Negocio no encontrado"}), 404

    start_date_str = request.args.get("start_date")
    end_date_str = request.args.get("end_date")
    
    start_date = None
    end_date = None
    
    try:
        if start_date_str: start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        if end_date_str: end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
    except: return jsonify({"error": "Fecha invÃ¡lida"}), 400

    from backend.services.analytics_layer import AnalyticsLayer
    from backend.services.reports.report_service import export_team_excel

    analytics = AnalyticsLayer(business_id)

    summary_data = analytics.get_team_performance_summary(start_date, end_date)
    detail_data = analytics.get_team_activity_detail(start_date, end_date)

    filepath = export_team_excel(business_id, summary_data, detail_data, start_date, end_date)

    return send_file(
        filepath,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name=os.path.basename(filepath)
    )


if __name__ == "__main__":
    port = int(os.getenv("PORT", str(app.config.get("PORT", 5000))))
    runtime_env = str(
        os.getenv("APP_ENV")
        or os.getenv("FLASK_ENV")
        or app.config.get("RUNTIME_ENV")
        or "development"
    ).strip().lower()
    debug = bool(app.config.get("DEBUG", runtime_env != "production"))
    use_reloader = str(os.getenv("FLASK_USE_RELOADER", "0")).strip().lower() in {"1", "true", "yes", "on"}
    app.run(host="0.0.0.0", port=port, debug=debug, use_reloader=use_reloader)

# CÃ³mo correr en desarrollo para servir frontend y API desde 127.0.0.1:5000
# Windows PowerShell:
#   $env:APP_ENV="dev"
#   python main.py
# Mac/Linux:
#   export APP_ENV=dev
#   python main.py
# Abrir: http://127.0.0.1:5000

