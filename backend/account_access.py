from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from flask import current_app

from backend.database import db
from backend.models import Business, SubscriptionPayment, TeamMember, User


PLAN_ORDER = ("basic", "pro", "business")
CHECKOUT_PLAN_CODES = {
    "basic_monthly",
    "basic_quarterly",
    "basic_annual",
    "pro_monthly",
    "pro_quarterly",
    "pro_annual",
    "business_monthly",
    "business_quarterly",
    "business_annual",
}
MANUAL_PLAN_CODES = {
    "basic_manual",
    "pro_manual",
    "business_manual",
}


def normalize_access_plan(plan: str | None) -> str | None:
    normalized = str(plan or "").strip().lower()
    if not normalized or normalized == "free":
        return None
    if normalized.startswith("business"):
        return "business"
    if normalized.startswith("pro"):
        return "pro"
    if normalized.startswith("basic"):
        return "basic"
    return None


def get_pricing_configuration() -> dict[str, Any]:
    basic_monthly = float(current_app.config.get("BASIC_MONTHLY_PRICE_USD", 2.99) or 2.99)
    basic_quarterly_discount = float(current_app.config.get("BASIC_QUARTERLY_DISCOUNT", 0.10) or 0.10)
    basic_annual_discount = float(current_app.config.get("BASIC_ANNUAL_DISCOUNT", 0.15) or 0.15)

    pro_monthly = float(current_app.config.get("PRO_MONTHLY_PRICE_USD", 5.99) or 5.99)
    pro_quarterly_discount = float(current_app.config.get("PRO_QUARTERLY_DISCOUNT", 0.10) or 0.10)
    pro_annual_discount = float(current_app.config.get("PRO_ANNUAL_DISCOUNT", 0.30) or 0.30)

    business_monthly = float(current_app.config.get("BUSINESS_MONTHLY_PRICE_USD", 12.99) or 12.99)
    business_quarterly_discount = float(current_app.config.get("BUSINESS_QUARTERLY_DISCOUNT", 0.10) or 0.10)
    business_annual_discount = float(current_app.config.get("BUSINESS_ANNUAL_DISCOUNT", 0.15) or 0.15)

    return {
        "basic": {
            "monthly_usd": basic_monthly,
            "quarterly_discount": basic_quarterly_discount,
            "annual_discount": basic_annual_discount,
            "display_name": "Básica",
            "tagline": "Empieza sin enredos con una tienda simple y clara.",
            "short_description": "Para ventas rápidas, catálogo ligero y control diario simple.",
            "highlight": "Entra directo con una base lista para vender.",
            "cta_label": "Elegir Básica",
            "badge": None,
            "features": [
                "Preset directo de tienda simple",
                "Ventas, productos, clientes y resumen",
                "Menos menús visibles al arrancar",
                "Ideal para comenzar sin complejidad",
            ],
            "recommended_for": [
                "Tiendas pequeñas",
                "Negocios que recién empiezan",
                "Operaciones simples sin equipo",
            ],
        },
        "pro": {
            "monthly_usd": pro_monthly,
            "quarterly_discount": pro_quarterly_discount,
            "annual_discount": pro_annual_discount,
            "display_name": "Pro",
            "tagline": "Configura una operación más flexible desde el primer día.",
            "short_description": "Desbloquea el cuestionario inicial y módulos para una operación más comercial.",
            "highlight": "Ideal cuando necesitas cobrar, cotizar o personalizar mejor la experiencia.",
            "cta_label": "Elegir Pro",
            "badge": "Más elegido",
            "features": [
                "Cuestionario inicial guiado",
                "Cobros, reportes y personalización inicial",
                "Mejor ajuste para ventas con seguimiento",
                "Cambios posteriores desde Personalización",
            ],
            "recommended_for": [
                "Negocios en crecimiento",
                "Servicios y ventas con seguimiento",
                "Operaciones con más control comercial",
            ],
        },
        "business": {
            "monthly_usd": business_monthly,
            "quarterly_discount": business_quarterly_discount,
            "annual_discount": business_annual_discount,
            "display_name": "Business",
            "tagline": "Para operaciones más completas, con equipos o procesos avanzados.",
            "short_description": "Incluye el cuestionario completo y está pensado para una operación más profunda.",
            "highlight": "Más contexto inicial para equipos, producción y operación avanzada.",
            "cta_label": "Elegir Business",
            "badge": "Escala",
            "features": [
                "Cuestionario inicial completo",
                "Mejor ajuste para equipos y procesos avanzados",
                "Ideal para producción, inventario o roles",
                "Listo para una operación más estructurada",
            ],
            "recommended_for": [
                "Negocios con equipo",
                "Operaciones con producción o abastecimiento",
                "Empresas que necesitan más estructura",
            ],
        },
    }


def build_plan_catalog() -> dict[str, Any]:
    config = get_pricing_configuration()

    def cycle_payload(plan_key: str, cycle_key: str, months: int, total_usd: float, discount_percent: float) -> dict[str, Any]:
        monthly_equivalent = total_usd / months if months else total_usd
        base_total = config[plan_key]["monthly_usd"] * months
        savings = max(base_total - total_usd, 0.0)
        label = {
            "monthly": "Mensual",
            "quarterly": "Trimestral",
            "annual": "Anual",
        }[cycle_key]
        return {
            "cycle": cycle_key,
            "label": label,
            "months": months,
            "discount_percent": round(discount_percent * 100, 2),
            "discount_label": None if discount_percent <= 0 else f"Ahorra {int(round(discount_percent * 100))}%",
            "total_usd": round(total_usd, 2),
            "monthly_equivalent_usd": round(monthly_equivalent, 2),
            "savings_usd": round(savings, 2),
            "checkout_plan_code": f"{plan_key}_{cycle_key}",
        }

    plans: dict[str, Any] = {}
    for plan_key in PLAN_ORDER:
        monthly_usd = float(config[plan_key]["monthly_usd"])
        quarterly_discount = float(config[plan_key]["quarterly_discount"])
        annual_discount = float(config[plan_key]["annual_discount"])
        cycles = {
            "monthly": cycle_payload(plan_key, "monthly", 1, monthly_usd, 0.0),
            "quarterly": cycle_payload(plan_key, "quarterly", 3, monthly_usd * 3 * (1 - quarterly_discount), quarterly_discount),
            "annual": cycle_payload(plan_key, "annual", 12, monthly_usd * 12 * (1 - annual_discount), annual_discount),
        }
        plans[plan_key] = {
            "key": plan_key,
            "display_name": config[plan_key]["display_name"],
            "tagline": config[plan_key]["tagline"],
            "short_description": config[plan_key]["short_description"],
            "highlight": config[plan_key]["highlight"],
            "cta_label": config[plan_key]["cta_label"],
            "badge": config[plan_key]["badge"],
            "monthly_price_usd": round(monthly_usd, 2),
            "features": list(config[plan_key]["features"]),
            "recommended_for": list(config[plan_key]["recommended_for"]),
            "cycles": cycles,
        }

    return {
        "currency": "USD",
        "display_currency": "USD",
        "legacy_aliases": {
            "free": "basic",
            "basic": "basic",
            "pro": "pro",
            "business": "business",
        },
        "plan_order": list(PLAN_ORDER),
        "cycle_order": ["monthly", "quarterly", "annual"],
        "plans": plans,
        "module_minimum_plan": {
            "sales": "basic",
            "customers": "basic",
            "products": "basic",
            "reports": "basic",
            "accounts_receivable": "pro",
            "quotes": "pro",
            "raw_inventory": "pro",
        },
        "business_type_recommended_plan": {
            "simple_store": "basic",
            "services": "pro",
            "wholesale": "pro",
            "production": "business",
        },
    }


def get_plan_duration_days(plan_code: str) -> int:
    normalized = str(plan_code or "").strip().lower()
    if normalized.endswith("_quarterly"):
        return 90
    if normalized.endswith("_annual"):
        return 365
    if normalized.endswith("_manual"):
        return 30
    return 30


def resolve_account_access(user: User | None) -> dict[str, Any]:
    if not user:
        return {
            "required": True,
            "active": False,
            "status": "inactive",
            "plan": None,
            "plan_code": None,
            "has_access": False,
            "requires_onboarding": False,
            "onboarding_flow": "basic",
            "source": "none",
            "checkout_required": True,
            "manual_grant": False,
            "existing_access": False,
            "onboarding_mode": "blocked",
        }

    if getattr(user, "is_admin", False):
        return {
            "required": False,
            "active": True,
            "status": "active",
            "plan": normalize_access_plan(getattr(user, "plan", None)) or "business",
            "plan_code": normalize_access_plan(getattr(user, "plan", None)) or "business",
            "has_access": True,
            "requires_onboarding": True,
            "onboarding_flow": "business",
            "source": "admin",
            "checkout_required": False,
            "manual_grant": True,
            "existing_access": True,
            "onboarding_mode": "questionnaire_business",
            "membership_plan_code": getattr(user, "membership_plan", None),
            "membership_end": getattr(user, "membership_end", None).isoformat() if getattr(user, "membership_end", None) else None,
        }

    existing_owned_business = (
        db.session.query(Business.id).filter(Business.user_id == user.id).limit(1).first() is not None
    )
    existing_team_membership = (
        db.session.query(TeamMember.id).filter(TeamMember.user_id == user.id, TeamMember.status == "active").limit(1).first() is not None
    )
    linked_legacy_access = bool(getattr(user, "account_type", None) == "team_member" and getattr(user, "linked_business_id", None))
    existing_access = bool(existing_owned_business or existing_team_membership or linked_legacy_access)

    membership_plan_code = str(getattr(user, "membership_plan", None) or "").strip().lower() or None
    normalized_plan = normalize_access_plan(membership_plan_code or getattr(user, "plan", None))
    membership_end = getattr(user, "membership_end", None)
    now = datetime.utcnow()
    manual_grant = bool(membership_plan_code and membership_plan_code.endswith("_manual"))
    has_current_membership_window = bool(normalized_plan and membership_end and membership_end >= now)

    if existing_access:
        active = True
        source = "existing_access"
        if has_current_membership_window:
            source = "manual" if manual_grant else "subscription"
        status = "active"
    elif has_current_membership_window:
        active = True
        source = "manual" if manual_grant else "subscription"
        status = "active"
    else:
        active = False
        source = "manual_expired" if manual_grant else ("expired" if membership_end else "none")
        status = "expired" if membership_end else "inactive"

    effective_plan = normalized_plan
    if active and not effective_plan:
        effective_plan = "basic"

    onboarding_mode = "blocked"
    if active:
        if effective_plan == "basic":
            onboarding_mode = "simple_store"
        elif effective_plan == "business":
            onboarding_mode = "questionnaire_business"
        else:
            onboarding_mode = "questionnaire_pro"
    onboarding_flow = "basic"
    requires_onboarding = False
    if active:
        if effective_plan == "business":
            onboarding_flow = "business"
            requires_onboarding = True
        elif effective_plan == "pro":
            onboarding_flow = "pro"
            requires_onboarding = True

    latest_payment = (
        SubscriptionPayment.query.filter_by(user_id=user.id, status="completed")
        .order_by(SubscriptionPayment.payment_date.desc(), SubscriptionPayment.id.desc())
        .first()
    )

    return {
        "required": not existing_access,
        "active": active,
        "status": status,
        "plan": effective_plan,
        "plan_code": effective_plan,
        "has_access": active or existing_access,
        "requires_onboarding": requires_onboarding,
        "onboarding_flow": onboarding_flow,
        "source": source,
        "checkout_required": not active and not existing_access,
        "manual_grant": manual_grant,
        "existing_access": existing_access,
        "onboarding_mode": onboarding_mode,
        "membership_plan_code": membership_plan_code,
        "membership_start": getattr(user, "membership_start", None).isoformat() if getattr(user, "membership_start", None) else None,
        "membership_end": membership_end.isoformat() if membership_end else None,
        "latest_payment": latest_payment.to_dict() if latest_payment else None,
    }


def ensure_account_access_allowed(user: User | None) -> tuple[bool, dict[str, Any]]:
    access = resolve_account_access(user)
    allowed = bool(access.get("active") or access.get("existing_access"))
    return allowed, access


def grant_manual_account_access(*, user: User, plan: str, duration_days: int, actor_user: User | None = None, reason: str | None = None) -> dict[str, Any]:
    normalized_plan = normalize_access_plan(plan)
    if normalized_plan not in PLAN_ORDER:
        raise ValueError("Plan inválido")

    duration_days = max(int(duration_days or 0), 1)
    now = datetime.utcnow()
    membership_end = now + timedelta(days=duration_days)

    user.plan = normalized_plan
    user.membership_plan = f"{normalized_plan}_manual"
    user.membership_start = now
    user.membership_end = membership_end
    user.membership_auto_renew = False

    db.session.commit()

    return {
        "plan": normalized_plan,
        "membership_plan": user.membership_plan,
        "membership_start": now.isoformat(),
        "membership_end": membership_end.isoformat(),
        "source": "manual",
        "actor_user_id": actor_user.id if actor_user else None,
        "reason": reason,
    }
