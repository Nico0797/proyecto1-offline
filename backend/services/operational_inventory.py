from __future__ import annotations

import re
from typing import Any

from backend.database import db
from backend.models import Order, Product, ProductMovement, Quote, RawMaterial, RawMaterialMovement, Recipe, RecipeConsumption, RecipeConsumptionItem, RecipeItem
from backend.services.business_operational_profile import get_business_operational_profile

FULFILLMENT_MODES = {"make_to_stock", "make_to_order", "resale_stock", "service"}
QUOTE_SALE_NOTE_PATTERN = re.compile(r"Desde cotización .* \(ID (?P<quote_id>\d+)\)")
ORDER_SALE_NOTE_PATTERN = re.compile(r"Desde pedido .* \(ID (?P<order_id>\d+)\)")


class InsufficientRawMaterialsError(ValueError):
    def __init__(self, product_name: str, shortages: list[dict[str, Any]]):
        self.product_name = product_name
        self.shortages = shortages
        first_shortage = shortages[0] if shortages else {}
        super().__init__(
            f"No hay suficiente materia prima para {product_name}: {first_shortage.get('raw_material_name', 'insumo desconocido')} requiere {first_shortage.get('required_quantity', 0)} {first_shortage.get('raw_material_unit', '')} y solo hay {first_shortage.get('available_stock', 0)}"
        )


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return float(default)


def _safe_round(value: Any, digits: int = 4) -> float:
    return round(_safe_float(value, 0.0), digits)


def normalize_fulfillment_mode(value: Any) -> str | None:
    normalized = str(value or "").strip().lower()
    return normalized if normalized in FULFILLMENT_MODES else None


def default_product_fulfillment_mode(*, business=None, product_type: str | None = None) -> str:
    normalized_type = str(product_type or "product").strip().lower() or "product"
    if normalized_type == "service":
        return "service"
    profile = get_business_operational_profile(business)
    operational_model = str(profile.get("operational_model") or "").strip().lower()
    if operational_model == "production_fixed_stock":
        return "make_to_stock"
    if operational_model == "production_make_to_order":
        return "make_to_order"
    if operational_model == "resale_fixed_stock":
        return "resale_stock"
    if operational_model == "service_no_stock":
        return "service"
    business_fulfillment = str(profile.get("fulfillment_mode") or "").strip().lower()
    if business_fulfillment == "make_to_order":
        return "make_to_order"
    if business_fulfillment in {"stock", "hybrid"}:
        return "make_to_stock" if bool(profile.get("uses_recipes")) else "resale_stock"
    if bool(profile.get("uses_recipes")):
        return "make_to_stock"
    return "resale_stock"


def resolve_product_fulfillment_mode(*, product: Product | None = None, business=None, explicit_mode: Any = None) -> str:
    normalized_explicit = normalize_fulfillment_mode(explicit_mode)
    if normalized_explicit:
        return normalized_explicit
    normalized_product = normalize_fulfillment_mode(getattr(product, "fulfillment_mode", None))
    if normalized_product:
        return normalized_product
    return default_product_fulfillment_mode(business=business, product_type=getattr(product, "type", None))


def enrich_line_item_with_operational_mode(*, item: dict[str, Any], product: Product | None, business) -> dict[str, Any]:
    payload = dict(item or {})
    payload["fulfillment_mode"] = resolve_product_fulfillment_mode(
        product=product,
        business=business,
        explicit_mode=payload.get("fulfillment_mode"),
    )
    quantity = payload.get("quantity") if payload.get("quantity") is not None else payload.get("qty")
    if quantity is not None:
        normalized_quantity = _safe_float(quantity, 0)
        payload["quantity"] = normalized_quantity
        payload["qty"] = normalized_quantity
    return payload


def get_active_recipe_for_product(*, business_id: int, product_id: int) -> Recipe | None:
    return (
        Recipe.query
        .filter_by(business_id=business_id, product_id=product_id, is_active=True)
        .order_by(Recipe.updated_at.desc(), Recipe.id.desc())
        .first()
    )


def _build_recipe_requirements(*, business_id: int, recipe: Recipe, quantity: float) -> tuple[list[dict[str, Any]], float]:
    requirements: list[dict[str, Any]] = []
    total_reference_cost = 0.0
    recipe_items = recipe.items.order_by(RecipeItem.sort_order.asc(), RecipeItem.id.asc()).all()
    if not recipe_items:
        raise ValueError(f"La receta {recipe.name} no tiene insumos configurados")
    for recipe_item in recipe_items:
        material = RawMaterial.query.filter_by(id=recipe_item.raw_material_id, business_id=business_id).first()
        if not material:
            raise ValueError(f"Materia prima {recipe_item.raw_material_id} no encontrada")
        required_quantity = _safe_round(_safe_float(recipe_item.quantity_required, 0) * quantity)
        available_stock = _safe_float(material.current_stock, 0)
        shortage = _safe_round(max(required_quantity - available_stock, 0))
        requirements.append({
            "raw_material_id": material.id,
            "raw_material_name": material.name,
            "raw_material_unit": material.unit,
            "required_quantity": required_quantity,
            "available_stock": _safe_round(available_stock),
            "shortage": shortage,
            "reference_cost": _safe_round(material.reference_cost, 4) if material.reference_cost is not None else None,
        })
        total_reference_cost += required_quantity * _safe_float(material.reference_cost, 0)
    return requirements, _safe_round(total_reference_cost)


def list_material_requirements_for_items(*, business, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    requirements: list[dict[str, Any]] = []
    for raw_item in items or []:
        product_id = raw_item.get("product_id")
        quantity = _safe_float(raw_item.get("quantity") if raw_item.get("quantity") is not None else raw_item.get("qty"), 0)
        if not product_id or quantity <= 0:
            continue
        product = Product.query.filter_by(id=int(product_id), business_id=business.id).first()
        if not product:
            continue
        fulfillment_mode = resolve_product_fulfillment_mode(product=product, business=business, explicit_mode=raw_item.get("fulfillment_mode"))
        requirement = {
            "product_id": product.id,
            "product_name": product.name,
            "quantity": quantity,
            "fulfillment_mode": fulfillment_mode,
            "requires_recipe": fulfillment_mode in {"make_to_stock", "make_to_order"},
            "recipe_id": None,
            "recipe_name": None,
            "materials": [],
        }
        if fulfillment_mode not in {"make_to_stock", "make_to_order"}:
            requirements.append(requirement)
            continue
        recipe = get_active_recipe_for_product(business_id=business.id, product_id=product.id)
        if not recipe:
            requirement["missing_recipe"] = True
            requirements.append(requirement)
            continue
        materials, total_reference_cost = _build_recipe_requirements(business_id=business.id, recipe=recipe, quantity=quantity)
        requirement["recipe_id"] = recipe.id
        requirement["recipe_name"] = recipe.name
        requirement["materials"] = materials
        requirement["total_reference_cost"] = total_reference_cost
        requirements.append(requirement)
    return requirements


def consume_recipe_stock(
    *,
    business,
    product: Product,
    quantity: float,
    actor_user,
    role_snapshot: str,
    notes: str | None = None,
    related_sale_id: int | None = None,
) -> dict[str, Any]:
    if quantity <= 0:
        raise ValueError("La cantidad debe ser mayor a 0")
    recipe = get_active_recipe_for_product(business_id=business.id, product_id=product.id)
    if not recipe:
        raise ValueError(f"El producto {product.name} necesita una receta activa")
    requirements, total_reference_cost = _build_recipe_requirements(business_id=business.id, recipe=recipe, quantity=quantity)
    shortages = [item for item in requirements if _safe_float(item.get("shortage"), 0) > 0]
    if shortages:
        raise InsufficientRawMaterialsError(product.name, shortages)
    consumption = RecipeConsumption(
        business_id=business.id,
        recipe_id=recipe.id,
        product_id=product.id,
        related_sale_id=related_sale_id,
        quantity_produced_or_sold=_safe_round(quantity),
        notes=notes,
        created_by=getattr(actor_user, "id", None),
        created_by_name=getattr(actor_user, "name", None) or "Sistema",
        created_by_role=role_snapshot,
    )
    db.session.add(consumption)
    db.session.flush()
    consumption_item_payloads: list[dict[str, Any]] = []
    for requirement in requirements:
        material = RawMaterial.query.filter_by(id=requirement["raw_material_id"], business_id=business.id).first()
        if not material:
            raise ValueError(f"Materia prima {requirement['raw_material_id']} no encontrada")
        previous_stock = _safe_float(material.current_stock, 0)
        quantity_consumed = _safe_round(requirement["required_quantity"])
        new_stock = _safe_round(previous_stock - quantity_consumed)
        material.current_stock = new_stock
        movement = RawMaterialMovement(
            raw_material_id=material.id,
            business_id=business.id,
            created_by=getattr(actor_user, "id", None),
            recipe_consumption_id=consumption.id,
            movement_type="out",
            quantity=quantity_consumed,
            previous_stock=_safe_round(previous_stock),
            new_stock=new_stock,
            reference_cost=material.reference_cost,
            notes=notes,
            created_by_name=getattr(actor_user, "name", None) or "Sistema",
            created_by_role=role_snapshot,
        )
        db.session.add(movement)
        db.session.flush()
        consumption_item = RecipeConsumptionItem(
            recipe_consumption_id=consumption.id,
            raw_material_id=material.id,
            quantity_consumed=quantity_consumed,
            previous_stock=_safe_round(previous_stock),
            new_stock=new_stock,
            raw_material_movement_id=movement.id,
        )
        db.session.add(consumption_item)
        consumption_item_payloads.append({
            "recipe_consumption_item_id": consumption_item.id,
            "raw_material_id": material.id,
            "raw_material_name": material.name,
            "raw_material_unit": material.unit,
            "quantity_consumed": quantity_consumed,
            "previous_stock": _safe_round(previous_stock),
            "new_stock": new_stock,
            "raw_material_movement_id": movement.id,
        })
    return {
        "recipe": recipe,
        "recipe_consumption": consumption,
        "items": consumption_item_payloads,
        "total_reference_cost": total_reference_cost,
    }


def register_stock_production(*, business, product: Product, quantity: float, actor_user, role_snapshot: str, notes: str | None = None) -> dict[str, Any]:
    fulfillment_mode = resolve_product_fulfillment_mode(product=product, business=business)
    if fulfillment_mode != "make_to_stock":
        raise ValueError(f"{product.name} no está configurado para producir a stock")
    if str(product.type or "product").strip().lower() != "product":
        raise ValueError("Solo puedes registrar producción sobre productos físicos")
    consumption_note = notes or f"Producción registrada para {product.name}"
    result = consume_recipe_stock(
        business=business,
        product=product,
        quantity=quantity,
        actor_user=actor_user,
        role_snapshot=role_snapshot,
        notes=consumption_note,
    )
    previous_stock = _safe_float(product.stock, 0)
    new_stock = _safe_round(previous_stock + quantity)
    product.stock = new_stock
    movement = ProductMovement(
        product_id=product.id,
        business_id=business.id,
        user_id=getattr(actor_user, "id", None),
        type="in",
        quantity=_safe_round(quantity),
        reason=consumption_note,
        created_by_name=getattr(actor_user, "name", None) or "Sistema",
        created_by_role=role_snapshot,
    )
    db.session.add(movement)
    return {
        "product": product,
        "movement": movement,
        "recipe_consumption": result["recipe_consumption"],
        "recipe": result["recipe"],
        "raw_material_items": result["items"],
        "previous_stock": _safe_round(previous_stock),
        "new_stock": new_stock,
        "total_reference_cost": result["total_reference_cost"],
    }


def reverse_sale_operational_effects(*, business, sale, actor_user, role_snapshot: str) -> dict[str, Any]:
    sale_items = [dict(item or {}) for item in (sale.items or [])]
    reversed_consumption_ids: list[int] = []
    reversed_product_ids: list[int] = []
    for item in sale_items:
        product_id = item.get("product_id")
        quantity = _safe_float(item.get("quantity") if item.get("quantity") is not None else item.get("qty"), 0)
        if not product_id or quantity <= 0:
            continue
        product = Product.query.filter_by(id=int(product_id), business_id=business.id).first()
        if not product:
            continue
        inventory_effects = item.get("inventory_effects") if isinstance(item.get("inventory_effects"), dict) else {}
        if bool(inventory_effects.get("finished_goods_stock_decremented")):
            previous_stock = _safe_float(product.stock, 0)
            new_stock = _safe_round(previous_stock + quantity)
            product.stock = new_stock
            reversed_product_ids.append(product.id)
            db.session.add(ProductMovement(
                product_id=product.id,
                business_id=business.id,
                user_id=getattr(actor_user, "id", None),
                type="in",
                quantity=_safe_round(quantity),
                reason=f"Reversión de venta #{sale.id}",
                created_by_name=getattr(actor_user, "name", None) or sale.created_by_name or "Sistema",
                created_by_role=role_snapshot,
            ))
        consumption_ids = [int(value) for value in (inventory_effects.get("recipe_consumption_ids") or []) if value not in (None, "")]
        for consumption_id in consumption_ids:
            consumption = RecipeConsumption.query.filter_by(id=consumption_id, business_id=business.id).first()
            if not consumption:
                continue
            for consumption_item in consumption.items.order_by(RecipeConsumptionItem.id.asc()).all():
                material = RawMaterial.query.filter_by(id=consumption_item.raw_material_id, business_id=business.id).first()
                if not material:
                    continue
                previous_stock = _safe_float(material.current_stock, 0)
                new_stock = _safe_round(previous_stock + _safe_float(consumption_item.quantity_consumed, 0))
                material.current_stock = new_stock
                db.session.add(RawMaterialMovement(
                    raw_material_id=material.id,
                    business_id=business.id,
                    created_by=getattr(actor_user, "id", None),
                    recipe_consumption_id=consumption.id,
                    movement_type="in",
                    quantity=_safe_round(consumption_item.quantity_consumed),
                    previous_stock=_safe_round(previous_stock),
                    new_stock=new_stock,
                    reference_cost=material.reference_cost,
                    notes=f"Reversión de consumo de venta #{sale.id}",
                    created_by_name=getattr(actor_user, "name", None) or sale.created_by_name or "Sistema",
                    created_by_role=role_snapshot,
                ))
            reversed_consumption_ids.append(consumption.id)
            consumption.related_sale_id = None
            note_suffix = f"Revertido por cancelación o eliminación de venta #{sale.id}"
            consumption.notes = f"{consumption.notes} | {note_suffix}" if consumption.notes else note_suffix
        inventory_effects["reversed_at"] = True
        item["inventory_effects"] = inventory_effects
    sale.items = sale_items
    return {
        "reversed_product_ids": reversed_product_ids,
        "reversed_recipe_consumption_ids": reversed_consumption_ids,
    }


def clear_sale_origin_links(*, sale) -> dict[str, Any]:
    cleared_quote_ids: list[int] = []
    cleared_order_ids: list[int] = []
    quote_matches = Quote.query.filter_by(business_id=sale.business_id, converted_sale_id=sale.id).all()
    for quote in quote_matches:
        quote.converted_sale_id = None
        quote.converted_at = None
        if str(quote.status or "").strip().lower() == "converted":
            quote.status = "approved"
        cleared_quote_ids.append(quote.id)
    note = str(sale.note or "")
    order_match = ORDER_SALE_NOTE_PATTERN.search(note)
    if order_match:
        order_id = int(order_match.group("order_id"))
        order = Order.query.filter_by(id=order_id, business_id=sale.business_id).first()
        if order:
            order.status = "pending"
            cleared_order_ids.append(order.id)
    return {
        "quote_ids": cleared_quote_ids,
        "order_ids": cleared_order_ids,
    }
