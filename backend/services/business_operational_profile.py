from __future__ import annotations

from typing import Any

DEFAULT_BUSINESS_OPERATIONAL_PROFILE: dict[str, Any] = {
    "version": 1,
    "operational_model": None,
    "inventory_model": None,
    "fulfillment_mode": None,
    "production_mode": None,
    "recipe_mode": None,
    "production_control_mode": None,
    "manages_raw_materials": False,
    "tracks_finished_goods_stock": False,
    "uses_raw_inventory": False,
    "uses_recipes": False,
    "controls_production": False,
    "supports_quotes": False,
    "supports_make_to_order": False,
    "consumes_raw_materials_on_production": False,
    "consumes_raw_materials_on_sale": False,
    "consumes_raw_materials_on_quote_conversion": False,
}


def normalize_business_operational_profile(profile: dict[str, Any] | None) -> dict[str, Any]:
    payload = profile if isinstance(profile, dict) else {}
    normalized = dict(DEFAULT_BUSINESS_OPERATIONAL_PROFILE)
    normalized["version"] = int(payload.get("version") or DEFAULT_BUSINESS_OPERATIONAL_PROFILE["version"])
    normalized["operational_model"] = payload.get("operational_model") or None
    normalized["inventory_model"] = payload.get("inventory_model") or None
    normalized["fulfillment_mode"] = payload.get("fulfillment_mode") or None
    normalized["production_mode"] = payload.get("production_mode") or None
    normalized["recipe_mode"] = payload.get("recipe_mode") or None
    normalized["production_control_mode"] = payload.get("production_control_mode") or None
    normalized["manages_raw_materials"] = bool(payload.get("manages_raw_materials"))
    normalized["tracks_finished_goods_stock"] = bool(payload.get("tracks_finished_goods_stock"))
    normalized["uses_raw_inventory"] = bool(payload.get("uses_raw_inventory"))
    normalized["uses_recipes"] = bool(payload.get("uses_recipes"))
    normalized["controls_production"] = bool(payload.get("controls_production"))
    normalized["supports_quotes"] = bool(payload.get("supports_quotes"))
    normalized["supports_make_to_order"] = bool(payload.get("supports_make_to_order"))
    normalized["consumes_raw_materials_on_production"] = bool(payload.get("consumes_raw_materials_on_production"))
    normalized["consumes_raw_materials_on_sale"] = bool(payload.get("consumes_raw_materials_on_sale"))
    normalized["consumes_raw_materials_on_quote_conversion"] = bool(payload.get("consumes_raw_materials_on_quote_conversion"))
    return normalized


def get_business_operational_profile(business_or_settings: Any) -> dict[str, Any]:
    settings = business_or_settings.settings if hasattr(business_or_settings, "settings") else business_or_settings
    if not isinstance(settings, dict):
        return dict(DEFAULT_BUSINESS_OPERATIONAL_PROFILE)
    return normalize_business_operational_profile(settings.get("operational_profile"))


def business_tracks_finished_goods_stock(business_or_settings: Any) -> bool:
    return bool(get_business_operational_profile(business_or_settings).get("tracks_finished_goods_stock"))


def business_manages_raw_materials(business_or_settings: Any) -> bool:
    return bool(get_business_operational_profile(business_or_settings).get("manages_raw_materials"))


def business_should_consume_raw_materials_on_sale(business_or_settings: Any) -> bool:
    profile = get_business_operational_profile(business_or_settings)
    return bool(profile.get("consumes_raw_materials_on_sale"))


def business_should_consume_raw_materials_on_quote_conversion(business_or_settings: Any) -> bool:
    profile = get_business_operational_profile(business_or_settings)
    return bool(profile.get("consumes_raw_materials_on_quote_conversion"))
