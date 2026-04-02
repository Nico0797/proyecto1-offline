from __future__ import annotations

from datetime import date, datetime

from flask import g, jsonify, request
from sqlalchemy import func, or_
from sqlalchemy.orm import joinedload

from backend.database import db
from backend.models import (
    Business,
    Expense,
    Product,
    RawMaterial,
    RawMaterialMovement,
    RawPurchase,
    RawPurchaseItem,
    Recipe,
    RecipeConsumption,
    RecipeConsumptionItem,
    RecipeItem,
    Supplier,
    SupplierPayable,
    SupplierPayment,
    TreasuryAccount,
)


def _parse_date(value, *, default=None):
    if value in (None, ""):
        return default
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()
    except Exception:
        return default


def _safe_round(value, digits=4):
    return round(float(value or 0), digits)


def _normalize_text(value):
    normalized = str(value or "").strip()
    return normalized or None


def _build_supplier_summary(payables):
    if not payables:
        return {
            "supplier_id": 0,
            "supplier_name": "Proveedor",
            "total_amount": 0,
            "amount_paid": 0,
            "balance_due": 0,
            "pending_count": 0,
        }
    supplier_id = payables[0].supplier_id
    supplier_name = payables[0].supplier.name if payables[0].supplier else "Proveedor"
    total_amount = _safe_round(sum(float(item.amount_total or 0) for item in payables), 2)
    amount_paid = _safe_round(sum(float(item.amount_paid or 0) for item in payables), 2)
    balance_due = _safe_round(sum(float(item.balance_due or 0) for item in payables), 2)
    pending_count = len([item for item in payables if item.status != "paid"])
    return {
        "supplier_id": supplier_id,
        "supplier_name": supplier_name,
        "total_amount": total_amount,
        "amount_paid": amount_paid,
        "balance_due": balance_due,
        "pending_count": pending_count,
    }


def _build_supplier_payload(supplier: Supplier):
    purchases = supplier.purchases.order_by(RawPurchase.purchase_date.desc(), RawPurchase.id.desc()).all()
    payables = supplier.payables.filter(SupplierPayable.status.in_(["pending", "partial"])).all()
    payload = supplier.to_dict()
    payload.update({
        "purchases_count": len(purchases),
        "confirmed_purchases_count": len([purchase for purchase in purchases if purchase.status == "confirmed"]),
        "last_purchase_date": purchases[0].purchase_date.isoformat() if purchases else None,
        "pending_payables_count": len(payables),
        "pending_payables_balance": _safe_round(sum(float(item.balance_due or 0) for item in payables), 2),
    })
    return payload


def _build_material_payload(material: RawMaterial):
    return material.to_dict()


def _get_latest_confirmed_purchase_cost(business_id: int, raw_material_id: int):
    item = (
        RawPurchaseItem.query
        .join(RawPurchase, RawPurchase.id == RawPurchaseItem.raw_purchase_id)
        .filter(
            RawPurchase.business_id == business_id,
            RawPurchase.status == "confirmed",
            RawPurchaseItem.raw_material_id == raw_material_id,
        )
        .order_by(RawPurchase.purchase_date.desc(), RawPurchase.id.desc(), RawPurchaseItem.id.desc())
        .first()
    )
    if not item:
        return None
    return {
        "cost": _safe_round(item.unit_cost),
        "purchase_id": item.raw_purchase_id,
        "purchase_number": item.raw_purchase.purchase_number if item.raw_purchase else None,
        "purchase_date": item.raw_purchase.purchase_date.isoformat() if item.raw_purchase and item.raw_purchase.purchase_date else None,
    }


def _recipe_costing_from_recipe(recipe: Recipe):
    items = recipe.items.order_by(RecipeItem.sort_order.asc(), RecipeItem.id.asc()).all()
    costing_items = []
    available_total = 0.0
    complete_total = 0.0
    missing_count = 0
    available_count = 0
    for item in items:
        material = item.raw_material
        latest_purchase = _get_latest_confirmed_purchase_cost(recipe.business_id, item.raw_material_id)
        cost_base = None
        cost_source = "missing"
        cost_source_label = "Sin costo base"
        purchase_id = None
        purchase_number = None
        purchase_date = None
        if latest_purchase:
            cost_base = float(latest_purchase["cost"])
            cost_source = "latest_confirmed_purchase"
            cost_source_label = "Última compra confirmada"
            purchase_id = latest_purchase["purchase_id"]
            purchase_number = latest_purchase["purchase_number"]
            purchase_date = latest_purchase["purchase_date"]
        elif material and material.reference_cost is not None:
            cost_base = float(material.reference_cost)
            cost_source = "reference_cost"
            cost_source_label = "Costo referencial actual"
        line_cost = _safe_round(float(item.quantity_required or 0) * float(cost_base or 0), 4) if cost_base is not None else None
        if cost_base is not None:
            available_count += 1
            available_total += float(line_cost or 0)
            complete_total += float(line_cost or 0)
        else:
            missing_count += 1
        costing_items.append({
            "raw_material_id": item.raw_material_id,
            "raw_material_name": material.name if material else None,
            "raw_material_unit": material.unit if material else None,
            "quantity_required": _safe_round(item.quantity_required),
            "cost_base": _safe_round(cost_base, 4) if cost_base is not None else None,
            "cost_source": cost_source,
            "cost_source_label": cost_source_label,
            "line_cost": line_cost,
            "is_cost_available": cost_base is not None,
            "purchase_id": purchase_id,
            "purchase_number": purchase_number,
            "purchase_date": purchase_date,
        })
    is_complete = missing_count == 0 and len(items) > 0
    if not items:
        cost_status = "missing_cost"
        cost_status_label = "Sin insumos"
        cost_status_message = "La receta no tiene insumos configurados todavía."
    elif is_complete:
        cost_status = "complete"
        cost_status_label = "Costo completo"
        cost_status_message = "Todos los insumos tienen costo base disponible."
    elif available_count == 0:
        cost_status = "missing_cost"
        cost_status_label = "Sin costos base"
        cost_status_message = "Ningún insumo tiene costo base disponible actualmente."
    else:
        cost_status = "incomplete"
        cost_status_label = "Costo parcial"
        cost_status_message = "Faltan costos base en parte de los insumos de la receta."
    theoretical_total_cost = _safe_round(complete_total, 4) if is_complete else None
    partial_total_cost = _safe_round(available_total, 4) if available_count > 0 and not is_complete else None
    theoretical_unit_cost = _safe_round(complete_total, 4) if is_complete else None
    return {
        "recipe_id": recipe.id,
        "recipe_name": recipe.name,
        "product_id": recipe.product_id,
        "product_name": recipe.product.name if recipe.product else None,
        "cost_rule": "latest_purchase_then_reference",
        "cost_rule_label": "Última compra confirmada o costo referencial",
        "recipe_yield_units": 1,
        "theoretical_total_cost": theoretical_total_cost,
        "partial_theoretical_total_cost": partial_total_cost,
        "theoretical_unit_cost": theoretical_unit_cost,
        "is_cost_complete": is_complete,
        "cost_status": cost_status,
        "cost_status_label": cost_status_label,
        "cost_status_message": cost_status_message,
        "missing_cost_items_count": missing_count,
        "available_cost_items_count": available_count,
        "items_count": len(costing_items),
        "items": costing_items,
    }


def _simulate_costing(business_id: int, payload):
    quantity_base = float(payload.get("quantity_base") or payload.get("quantity_produced") or 1)
    if quantity_base <= 0:
        raise ValueError("La cantidad base debe ser mayor a 0")
    items_payload = payload.get("items") or []
    if not isinstance(items_payload, list) or len(items_payload) == 0:
        raise ValueError("Debes agregar al menos una materia prima")

    simulation_items = []
    materials_subtotal = 0.0
    partial_materials_subtotal = 0.0
    available_items = 0
    missing_items = 0
    for raw_item in items_payload:
        raw_material_id = int(raw_item.get("raw_material_id") or 0)
        quantity_required = float(raw_item.get("quantity_required") or 0)
        if raw_material_id <= 0 or quantity_required <= 0:
            raise ValueError("Cada materia prima debe tener identificación y cantidad mayor a 0")
        material = RawMaterial.query.filter_by(id=raw_material_id, business_id=business_id).first()
        if not material:
            raise ValueError(f"Materia prima {raw_material_id} no encontrada")
        latest_purchase = _get_latest_confirmed_purchase_cost(business_id, raw_material_id)
        manual_override = raw_item.get("manual_cost_override")
        cost_base = None
        cost_source = "missing"
        cost_source_label = "Sin costo base"
        purchase_id = None
        purchase_number = None
        purchase_date = None
        if manual_override not in (None, ""):
            cost_base = float(manual_override)
            cost_source = "manual_override"
            cost_source_label = "Costo manual"
        elif latest_purchase:
            cost_base = float(latest_purchase["cost"])
            cost_source = "latest_confirmed_purchase"
            cost_source_label = "Última compra confirmada"
            purchase_id = latest_purchase["purchase_id"]
            purchase_number = latest_purchase["purchase_number"]
            purchase_date = latest_purchase["purchase_date"]
        elif material.reference_cost is not None:
            cost_base = float(material.reference_cost)
            cost_source = "reference_cost"
            cost_source_label = "Costo referencial actual"
        line_cost = _safe_round(quantity_required * float(cost_base or 0), 4) if cost_base is not None else None
        if cost_base is not None:
            available_items += 1
            partial_materials_subtotal += float(line_cost or 0)
            materials_subtotal += float(line_cost or 0)
        else:
            missing_items += 1
        simulation_items.append({
            "raw_material_id": raw_material_id,
            "raw_material_name": material.name,
            "raw_material_unit": material.unit,
            "quantity_required": _safe_round(quantity_required),
            "manual_cost_override": _safe_round(manual_override, 4) if manual_override not in (None, "") else None,
            "cost_base": _safe_round(cost_base, 4) if cost_base is not None else None,
            "cost_source": cost_source,
            "cost_source_label": cost_source_label,
            "line_cost": line_cost,
            "is_cost_available": cost_base is not None,
            "purchase_id": purchase_id,
            "purchase_number": purchase_number,
            "purchase_date": purchase_date,
            "notes": _normalize_text(raw_item.get("notes")),
        })
    packaging_cost = float(payload.get("packaging_cost") or 0)
    labor_cost = float(payload.get("labor_cost") or 0)
    overhead_cost = float(payload.get("overhead_cost") or 0)
    other_cost = float(payload.get("other_cost") or 0)
    extras_subtotal = _safe_round(packaging_cost + labor_cost + overhead_cost + other_cost, 4)
    is_complete = missing_items == 0 and len(simulation_items) > 0
    total_cost = _safe_round(materials_subtotal + extras_subtotal, 4) if is_complete else None
    partial_total_cost = _safe_round(partial_materials_subtotal + extras_subtotal, 4) if not is_complete and (available_items > 0 or extras_subtotal > 0) else None
    cost_per_unit = _safe_round(total_cost / quantity_base, 4) if total_cost is not None else None
    partial_cost_per_unit = _safe_round(partial_total_cost / quantity_base, 4) if partial_total_cost is not None and quantity_base > 0 and not is_complete else None
    minimum_sale_price = cost_per_unit if cost_per_unit is not None else partial_cost_per_unit
    target_margin_percent = payload.get("target_margin_percent")
    target_margin_percent = float(target_margin_percent) if target_margin_percent not in (None, "") else None
    target_sale_price = payload.get("target_sale_price")
    target_sale_price = float(target_sale_price) if target_sale_price not in (None, "") else None
    suggested_sale_price = None
    estimated_profit_amount = None
    estimated_margin_percent = None
    base_unit_cost = cost_per_unit if cost_per_unit is not None else partial_cost_per_unit
    if target_sale_price is not None:
        suggested_sale_price = _safe_round(target_sale_price, 4)
    elif target_margin_percent is not None and base_unit_cost is not None and target_margin_percent < 100:
        suggested_sale_price = _safe_round(base_unit_cost / max(1 - (target_margin_percent / 100), 0.0001), 4)
    elif minimum_sale_price is not None:
        suggested_sale_price = _safe_round(minimum_sale_price, 4)
    if suggested_sale_price is not None and base_unit_cost is not None:
        estimated_profit_amount = _safe_round(suggested_sale_price - base_unit_cost, 4)
        estimated_margin_percent = _safe_round((estimated_profit_amount / suggested_sale_price) * 100, 2) if suggested_sale_price > 0 else None
    if not simulation_items:
        cost_status = "missing_cost"
        cost_status_label = "Sin insumos"
        cost_status_message = "Agrega materias primas para calcular el costo."
    elif is_complete:
        cost_status = "complete"
        cost_status_label = "Costo completo"
        cost_status_message = "Todos los insumos tienen costo base disponible para estimar el costo total."
    elif available_items == 0:
        cost_status = "missing_cost"
        cost_status_label = "Sin costos base"
        cost_status_message = "No hay costos base disponibles para estimar este producto."
    else:
        cost_status = "incomplete"
        cost_status_label = "Costo parcial"
        cost_status_message = "Faltan costos base en parte de las materias primas seleccionadas."
    product_id = int(payload.get("product_id") or 0) or None
    product_name = _normalize_text(payload.get("product_name"))
    if product_id:
        product = Product.query.filter_by(id=product_id, business_id=business_id).first()
        if not product:
            raise ValueError("Producto no encontrado")
        product_name = product.name
    return {
        "product_id": product_id,
        "product_name": product_name,
        "quantity_base": _safe_round(quantity_base),
        "cost_rule": "latest_purchase_then_reference",
        "cost_rule_label": "Última compra confirmada o costo referencial",
        "materials_subtotal": _safe_round(materials_subtotal, 4) if is_complete else None,
        "partial_materials_subtotal": _safe_round(partial_materials_subtotal, 4) if not is_complete and available_items > 0 else None,
        "extras_subtotal": _safe_round(extras_subtotal, 4),
        "packaging_cost": _safe_round(packaging_cost, 4),
        "labor_cost": _safe_round(labor_cost, 4),
        "overhead_cost": _safe_round(overhead_cost, 4),
        "other_cost": _safe_round(other_cost, 4),
        "total_cost": total_cost,
        "partial_total_cost": partial_total_cost,
        "cost_per_unit": cost_per_unit,
        "partial_cost_per_unit": partial_cost_per_unit,
        "minimum_sale_price": minimum_sale_price,
        "target_margin_percent": _safe_round(target_margin_percent, 2) if target_margin_percent is not None else None,
        "target_sale_price": _safe_round(target_sale_price, 4) if target_sale_price is not None else None,
        "suggested_sale_price": suggested_sale_price,
        "estimated_profit_amount": estimated_profit_amount,
        "estimated_margin_percent": estimated_margin_percent,
        "is_cost_complete": is_complete,
        "cost_status": cost_status,
        "cost_status_label": cost_status_label,
        "cost_status_message": cost_status_message,
        "missing_cost_items_count": missing_items,
        "available_cost_items_count": available_items,
        "items_count": len(simulation_items),
        "items": simulation_items,
    }


def _generate_purchase_number(business_id: int, purchase_date_value: date):
    prefix = f"CMP-{purchase_date_value.strftime('%Y%m%d')}"
    like_pattern = f"{prefix}-%"
    existing_numbers = [
        purchase.purchase_number
        for purchase in RawPurchase.query.filter(
            RawPurchase.business_id == business_id,
            RawPurchase.purchase_number.like(like_pattern),
        ).all()
        if purchase.purchase_number
    ]
    sequence = 1
    while f"{prefix}-{sequence:03d}" in existing_numbers:
        sequence += 1
    return f"{prefix}-{sequence:03d}"


def _apply_recipe_items(recipe: Recipe, items_payload):
    RecipeItem.query.filter_by(recipe_id=recipe.id).delete()
    for index, item in enumerate(items_payload or []):
        db.session.add(RecipeItem(
            recipe_id=recipe.id,
            raw_material_id=int(item.get("raw_material_id") or 0),
            quantity_required=float(item.get("quantity_required") or 0),
            notes=_normalize_text(item.get("notes")),
            sort_order=int(item.get("sort_order") if item.get("sort_order") is not None else index),
        ))


def _update_supplier_payable_status(payable: SupplierPayable):
    payable.amount_total = _safe_round(payable.amount_total, 2)
    payable.amount_paid = _safe_round(payable.amount_paid, 2)
    payable.balance_due = _safe_round(max(float(payable.amount_total or 0) - float(payable.amount_paid or 0), 0), 2)
    if payable.balance_due <= 0.009:
        payable.balance_due = 0.0
        payable.status = "paid"
    elif float(payable.amount_paid or 0) > 0:
        payable.status = "partial"
    else:
        payable.status = "pending"


def register_raw_inventory_restore_routes(
    application,
    *,
    token_required,
    module_required,
    permission_required,
    get_current_role_snapshot,
    refresh_summary_materialized_days,
):
    @application.route("/api/businesses/<int:business_id>/raw-materials", methods=["GET"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("raw_inventory.read")
    def list_raw_materials(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        search = str(request.args.get("search") or "").strip().lower()
        include_inactive = str(request.args.get("include_inactive", "")).strip().lower() in {"1", "true", "yes"}
        low_stock_only = str(request.args.get("low_stock_only", "")).strip().lower() in {"1", "true", "yes"}
        query = RawMaterial.query.filter(RawMaterial.business_id == business_id)
        if not include_inactive:
            query = query.filter(RawMaterial.is_active.is_(True))
        if search:
            query = query.filter(
                or_(
                    RawMaterial.name.ilike(f"%{search}%"),
                    RawMaterial.sku.ilike(f"%{search}%"),
                    RawMaterial.notes.ilike(f"%{search}%"),
                )
            )
        if low_stock_only:
            query = query.filter(RawMaterial.current_stock <= RawMaterial.minimum_stock)
        materials = query.order_by(RawMaterial.name.asc()).all()
        return jsonify({"raw_materials": [_build_material_payload(material) for material in materials]})

    @application.route("/api/businesses/<int:business_id>/raw-materials", methods=["POST"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("raw_inventory.create")
    def create_raw_material(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        data = request.get_json() or {}
        name = str(data.get("name") or "").strip()
        unit = str(data.get("unit") or "").strip()
        if not name:
            return jsonify({"error": "El nombre es obligatorio"}), 400
        if not unit:
            return jsonify({"error": "La unidad es obligatoria"}), 400
        duplicate = RawMaterial.query.filter(
            RawMaterial.business_id == business_id,
            func.lower(RawMaterial.name) == name.lower(),
        ).first()
        if duplicate:
            return jsonify({"error": "Ya existe una materia prima con ese nombre"}), 400
        material = RawMaterial(
            business_id=business_id,
            name=name,
            sku=_normalize_text(data.get("sku")),
            unit=unit,
            current_stock=float(data.get("current_stock") or 0),
            minimum_stock=float(data.get("minimum_stock") or 0),
            reference_cost=float(data.get("reference_cost")) if data.get("reference_cost") not in (None, "") else None,
            notes=_normalize_text(data.get("notes")),
            is_active=bool(data.get("is_active", True)),
        )
        db.session.add(material)
        db.session.commit()
        return jsonify({"raw_material": material.to_dict()}), 201

    @application.route("/api/businesses/<int:business_id>/raw-materials/<int:material_id>", methods=["GET"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("raw_inventory.read")
    def get_raw_material(business_id, material_id):
        material = RawMaterial.query.filter_by(id=material_id, business_id=business_id).first()
        if not material:
            return jsonify({"error": "Materia prima no encontrada"}), 404
        return jsonify({"raw_material": material.to_dict()})

    @application.route("/api/businesses/<int:business_id>/raw-materials/<int:material_id>", methods=["PUT"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("raw_inventory.update")
    def update_raw_material(business_id, material_id):
        material = RawMaterial.query.filter_by(id=material_id, business_id=business_id).first()
        if not material:
            return jsonify({"error": "Materia prima no encontrada"}), 404
        data = request.get_json() or {}
        name = str(data.get("name") or material.name).strip()
        unit = str(data.get("unit") or material.unit).strip()
        if not name:
            return jsonify({"error": "El nombre es obligatorio"}), 400
        if not unit:
            return jsonify({"error": "La unidad es obligatoria"}), 400
        duplicate = RawMaterial.query.filter(
            RawMaterial.business_id == business_id,
            RawMaterial.id != material_id,
            func.lower(RawMaterial.name) == name.lower(),
        ).first()
        if duplicate:
            return jsonify({"error": "Ya existe una materia prima con ese nombre"}), 400
        material.name = name
        material.sku = _normalize_text(data.get("sku")) if "sku" in data else material.sku
        material.unit = unit
        if "current_stock" in data and data.get("current_stock") not in (None, ""):
            material.current_stock = float(data.get("current_stock"))
        if "minimum_stock" in data:
            material.minimum_stock = float(data.get("minimum_stock") or 0)
        if "reference_cost" in data:
            material.reference_cost = float(data.get("reference_cost")) if data.get("reference_cost") not in (None, "") else None
        if "notes" in data:
            material.notes = _normalize_text(data.get("notes"))
        if "is_active" in data:
            material.is_active = bool(data.get("is_active"))
        db.session.commit()
        return jsonify({"raw_material": material.to_dict()})

    @application.route("/api/businesses/<int:business_id>/raw-materials/<int:material_id>", methods=["DELETE"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("raw_inventory.delete")
    def deactivate_raw_material(business_id, material_id):
        material = RawMaterial.query.filter_by(id=material_id, business_id=business_id).first()
        if not material:
            return jsonify({"error": "Materia prima no encontrada"}), 404
        material.is_active = False
        db.session.commit()
        return jsonify({"raw_material": material.to_dict()})

    @application.route("/api/businesses/<int:business_id>/raw-materials/<int:material_id>/movements", methods=["GET"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("raw_inventory.read")
    def list_raw_material_movements(business_id, material_id):
        material = RawMaterial.query.filter_by(id=material_id, business_id=business_id).first()
        if not material:
            return jsonify({"error": "Materia prima no encontrada"}), 404
        movement_type = str(request.args.get("movement_type") or "").strip().lower()
        query = material.movements
        if movement_type in {"in", "out", "adjustment"}:
            query = query.filter(RawMaterialMovement.movement_type == movement_type)
        movements = query.order_by(RawMaterialMovement.created_at.desc(), RawMaterialMovement.id.desc()).all()
        return jsonify({"raw_material": material.to_dict(), "movements": [movement.to_dict() for movement in movements]})

    @application.route("/api/businesses/<int:business_id>/raw-materials/<int:material_id>/movements", methods=["POST"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("raw_inventory.movements.create")
    def create_raw_material_movement(business_id, material_id):
        material = RawMaterial.query.filter_by(id=material_id, business_id=business_id).first()
        if not material:
            return jsonify({"error": "Materia prima no encontrada"}), 404
        data = request.get_json() or {}
        movement_type = str(data.get("movement_type") or "").strip().lower()
        if movement_type not in {"in", "out", "adjustment"}:
            return jsonify({"error": "Tipo de movimiento inválido"}), 400
        previous_stock = float(material.current_stock or 0)
        quantity = float(data.get("quantity") or 0)
        if movement_type == "adjustment":
            if data.get("target_stock") in (None, ""):
                return jsonify({"error": "Debes indicar el stock objetivo para un ajuste"}), 400
            target_stock = float(data.get("target_stock") or 0)
            quantity = abs(target_stock - previous_stock)
            new_stock = target_stock
        else:
            if quantity <= 0:
                return jsonify({"error": "La cantidad debe ser mayor a 0"}), 400
            new_stock = previous_stock + quantity if movement_type == "in" else previous_stock - quantity
        material.current_stock = new_stock
        if data.get("reference_cost") not in (None, ""):
            material.reference_cost = float(data.get("reference_cost"))
        role_snapshot = get_current_role_snapshot(g.current_user, business_id)
        movement = RawMaterialMovement(
            raw_material_id=material.id,
            business_id=business_id,
            created_by=g.current_user.id,
            movement_type=movement_type,
            quantity=_safe_round(quantity),
            previous_stock=_safe_round(previous_stock),
            new_stock=_safe_round(new_stock),
            reference_cost=float(data.get("reference_cost")) if data.get("reference_cost") not in (None, "") else material.reference_cost,
            notes=_normalize_text(data.get("notes")),
            created_by_name=g.current_user.name,
            created_by_role=role_snapshot,
        )
        db.session.add(movement)
        db.session.commit()
        return jsonify({"raw_material": material.to_dict(), "movement": movement.to_dict()}), 201

    @application.route("/api/businesses/<int:business_id>/suppliers", methods=["GET"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("suppliers.read")
    def list_suppliers(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        search = str(request.args.get("search") or "").strip().lower()
        include_inactive = str(request.args.get("include_inactive", "")).strip().lower() in {"1", "true", "yes"}
        query = Supplier.query.filter(Supplier.business_id == business_id)
        if not include_inactive:
            query = query.filter(Supplier.is_active.is_(True))
        if search:
            query = query.filter(
                or_(
                    Supplier.name.ilike(f"%{search}%"),
                    Supplier.contact_name.ilike(f"%{search}%"),
                    Supplier.phone.ilike(f"%{search}%"),
                    Supplier.email.ilike(f"%{search}%"),
                )
            )
        suppliers = query.order_by(Supplier.name.asc()).all()
        return jsonify({"suppliers": [_build_supplier_payload(supplier) for supplier in suppliers]})

    @application.route("/api/businesses/<int:business_id>/suppliers", methods=["POST"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("suppliers.create")
    def create_supplier(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        data = request.get_json() or {}
        name = str(data.get("name") or "").strip()
        if not name:
            return jsonify({"error": "El nombre es obligatorio"}), 400
        duplicate = Supplier.query.filter(
            Supplier.business_id == business_id,
            func.lower(Supplier.name) == name.lower(),
        ).first()
        if duplicate:
            return jsonify({"error": "Ya existe un proveedor con ese nombre"}), 400
        supplier = Supplier(
            business_id=business_id,
            name=name,
            contact_name=_normalize_text(data.get("contact_name")),
            phone=_normalize_text(data.get("phone")),
            email=_normalize_text(data.get("email")),
            notes=_normalize_text(data.get("notes")),
            is_active=bool(data.get("is_active", True)),
        )
        db.session.add(supplier)
        db.session.commit()
        return jsonify({"supplier": _build_supplier_payload(supplier)}), 201

    @application.route("/api/businesses/<int:business_id>/suppliers/<int:supplier_id>", methods=["GET"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("suppliers.read")
    def get_supplier(business_id, supplier_id):
        supplier = Supplier.query.filter_by(id=supplier_id, business_id=business_id).first()
        if not supplier:
            return jsonify({"error": "Proveedor no encontrado"}), 404
        return jsonify({"supplier": _build_supplier_payload(supplier)})

    @application.route("/api/businesses/<int:business_id>/suppliers/<int:supplier_id>", methods=["PUT"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("suppliers.update")
    def update_supplier(business_id, supplier_id):
        supplier = Supplier.query.filter_by(id=supplier_id, business_id=business_id).first()
        if not supplier:
            return jsonify({"error": "Proveedor no encontrado"}), 404
        data = request.get_json() or {}
        name = str(data.get("name") or supplier.name).strip()
        if not name:
            return jsonify({"error": "El nombre es obligatorio"}), 400
        duplicate = Supplier.query.filter(
            Supplier.business_id == business_id,
            Supplier.id != supplier_id,
            func.lower(Supplier.name) == name.lower(),
        ).first()
        if duplicate:
            return jsonify({"error": "Ya existe un proveedor con ese nombre"}), 400
        supplier.name = name
        if "contact_name" in data:
            supplier.contact_name = _normalize_text(data.get("contact_name"))
        if "phone" in data:
            supplier.phone = _normalize_text(data.get("phone"))
        if "email" in data:
            supplier.email = _normalize_text(data.get("email"))
        if "notes" in data:
            supplier.notes = _normalize_text(data.get("notes"))
        if "is_active" in data:
            supplier.is_active = bool(data.get("is_active"))
        db.session.commit()
        return jsonify({"supplier": _build_supplier_payload(supplier)})

    @application.route("/api/businesses/<int:business_id>/suppliers/<int:supplier_id>", methods=["DELETE"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("suppliers.delete")
    def deactivate_supplier(business_id, supplier_id):
        supplier = Supplier.query.filter_by(id=supplier_id, business_id=business_id).first()
        if not supplier:
            return jsonify({"error": "Proveedor no encontrado"}), 404
        supplier.is_active = False
        db.session.commit()
        return jsonify({"supplier": _build_supplier_payload(supplier)})

    @application.route("/api/businesses/<int:business_id>/raw-purchases", methods=["GET"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("raw_purchases.read")
    def list_raw_purchases(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        status = str(request.args.get("status") or "").strip().lower()
        search = str(request.args.get("search") or "").strip().lower()
        supplier_id = request.args.get("supplier_id", type=int)
        query = RawPurchase.query.options(joinedload(RawPurchase.supplier)).filter(RawPurchase.business_id == business_id)
        if status in {"draft", "confirmed", "cancelled"}:
            query = query.filter(RawPurchase.status == status)
        if supplier_id:
            query = query.filter(RawPurchase.supplier_id == supplier_id)
        purchases = query.order_by(RawPurchase.purchase_date.desc(), RawPurchase.created_at.desc()).all()
        payloads = [purchase.to_dict(include_items=False) for purchase in purchases]
        if search:
            payloads = [
                payload for payload in payloads
                if search in str(payload.get("purchase_number") or "").lower()
                or search in str(payload.get("supplier_name") or "").lower()
                or search in str(payload.get("notes") or "").lower()
            ]
        return jsonify({"raw_purchases": payloads})

    @application.route("/api/businesses/<int:business_id>/raw-purchases", methods=["POST"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("raw_purchases.create")
    def create_raw_purchase(business_id):
        business = Business.query.get(business_id)
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        data = request.get_json() or {}
        purchase_date_value = _parse_date(data.get("purchase_date"))
        if not purchase_date_value:
            return jsonify({"error": "La fecha de compra es obligatoria"}), 400
        items_payload = data.get("items") or []
        if not isinstance(items_payload, list) or len(items_payload) == 0:
            return jsonify({"error": "Debes agregar al menos un ítem"}), 400
        supplier_id = int(data.get("supplier_id") or 0) or None
        if supplier_id and not Supplier.query.filter_by(id=supplier_id, business_id=business_id).first():
            return jsonify({"error": "Proveedor no encontrado"}), 400
        purchase_number = _normalize_text(data.get("purchase_number")) or _generate_purchase_number(business_id, purchase_date_value)
        duplicate = RawPurchase.query.filter_by(business_id=business_id, purchase_number=purchase_number).first()
        if duplicate:
            return jsonify({"error": "Ya existe una compra con ese número"}), 400
        subtotal = 0.0
        normalized_items = []
        seen_materials = set()
        for raw_item in items_payload:
            raw_material_id = int(raw_item.get("raw_material_id") or 0)
            quantity = float(raw_item.get("quantity") or 0)
            unit_cost = float(raw_item.get("unit_cost") or 0)
            if raw_material_id <= 0 or quantity <= 0 or unit_cost < 0:
                return jsonify({"error": "Cada ítem debe tener materia prima, cantidad mayor a 0 y costo válido"}), 400
            if raw_material_id in seen_materials:
                return jsonify({"error": "No puedes repetir la misma materia prima dentro de una compra"}), 400
            material = RawMaterial.query.filter_by(id=raw_material_id, business_id=business_id).first()
            if not material:
                return jsonify({"error": f"Materia prima {raw_material_id} no encontrada"}), 400
            seen_materials.add(raw_material_id)
            item_subtotal = _safe_round(quantity * unit_cost, 4)
            subtotal += item_subtotal
            normalized_items.append({
                "raw_material_id": raw_material_id,
                "description": _normalize_text(raw_item.get("description")),
                "quantity": quantity,
                "unit_cost": unit_cost,
                "subtotal": item_subtotal,
            })
        purchase = RawPurchase(
            business_id=business_id,
            supplier_id=supplier_id,
            purchase_number=purchase_number,
            status="draft",
            purchase_date=purchase_date_value,
            subtotal=_safe_round(subtotal, 4),
            total=_safe_round(subtotal, 4),
            notes=_normalize_text(data.get("notes")),
            created_by=g.current_user.id,
        )
        db.session.add(purchase)
        db.session.flush()
        for item in normalized_items:
            db.session.add(RawPurchaseItem(raw_purchase_id=purchase.id, **item))
        db.session.commit()
        return jsonify({"raw_purchase": purchase.to_dict()}), 201

    @application.route("/api/businesses/<int:business_id>/raw-purchases/<int:purchase_id>", methods=["GET"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("raw_purchases.read")
    def get_raw_purchase(business_id, purchase_id):
        purchase = RawPurchase.query.filter_by(id=purchase_id, business_id=business_id).first()
        if not purchase:
            return jsonify({"error": "Compra no encontrada"}), 404
        return jsonify({"raw_purchase": purchase.to_dict()})

    @application.route("/api/businesses/<int:business_id>/raw-purchases/<int:purchase_id>", methods=["PUT"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("raw_purchases.update")
    def update_raw_purchase(business_id, purchase_id):
        purchase = RawPurchase.query.filter_by(id=purchase_id, business_id=business_id).first()
        if not purchase:
            return jsonify({"error": "Compra no encontrada"}), 404
        if purchase.status != "draft":
            return jsonify({"error": "Solo puedes editar compras en borrador"}), 400
        data = request.get_json() or {}
        purchase_date_value = _parse_date(data.get("purchase_date"), default=purchase.purchase_date)
        if not purchase_date_value:
            return jsonify({"error": "La fecha de compra es obligatoria"}), 400
        items_payload = data.get("items") or []
        if not isinstance(items_payload, list) or len(items_payload) == 0:
            return jsonify({"error": "Debes agregar al menos un ítem"}), 400
        supplier_id = int(data.get("supplier_id") or 0) or None
        if supplier_id and not Supplier.query.filter_by(id=supplier_id, business_id=business_id).first():
            return jsonify({"error": "Proveedor no encontrado"}), 400
        purchase_number = _normalize_text(data.get("purchase_number")) or purchase.purchase_number
        duplicate = RawPurchase.query.filter(
            RawPurchase.business_id == business_id,
            RawPurchase.id != purchase_id,
            RawPurchase.purchase_number == purchase_number,
        ).first()
        if duplicate:
            return jsonify({"error": "Ya existe una compra con ese número"}), 400
        subtotal = 0.0
        normalized_items = []
        seen_materials = set()
        for raw_item in items_payload:
            raw_material_id = int(raw_item.get("raw_material_id") or 0)
            quantity = float(raw_item.get("quantity") or 0)
            unit_cost = float(raw_item.get("unit_cost") or 0)
            if raw_material_id <= 0 or quantity <= 0 or unit_cost < 0:
                return jsonify({"error": "Cada ítem debe tener materia prima, cantidad mayor a 0 y costo válido"}), 400
            if raw_material_id in seen_materials:
                return jsonify({"error": "No puedes repetir la misma materia prima dentro de una compra"}), 400
            material = RawMaterial.query.filter_by(id=raw_material_id, business_id=business_id).first()
            if not material:
                return jsonify({"error": f"Materia prima {raw_material_id} no encontrada"}), 400
            seen_materials.add(raw_material_id)
            item_subtotal = _safe_round(quantity * unit_cost, 4)
            subtotal += item_subtotal
            normalized_items.append({
                "raw_material_id": raw_material_id,
                "description": _normalize_text(raw_item.get("description")),
                "quantity": quantity,
                "unit_cost": unit_cost,
                "subtotal": item_subtotal,
            })
        purchase.supplier_id = supplier_id
        purchase.purchase_number = purchase_number
        purchase.purchase_date = purchase_date_value
        purchase.notes = _normalize_text(data.get("notes"))
        purchase.subtotal = _safe_round(subtotal, 4)
        purchase.total = _safe_round(subtotal, 4)
        RawPurchaseItem.query.filter_by(raw_purchase_id=purchase.id).delete()
        for item in normalized_items:
            db.session.add(RawPurchaseItem(raw_purchase_id=purchase.id, **item))
        db.session.commit()
        return jsonify({"raw_purchase": purchase.to_dict()})

    @application.route("/api/businesses/<int:business_id>/raw-purchases/<int:purchase_id>", methods=["DELETE"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("raw_purchases.update")
    def cancel_raw_purchase(business_id, purchase_id):
        purchase = RawPurchase.query.filter_by(id=purchase_id, business_id=business_id).first()
        if not purchase:
            return jsonify({"error": "Compra no encontrada"}), 404
        if purchase.status != "draft":
            return jsonify({"error": "Solo puedes cancelar compras en borrador"}), 400
        purchase.status = "cancelled"
        db.session.commit()
        return jsonify({"raw_purchase": purchase.to_dict()})

    @application.route("/api/businesses/<int:business_id>/raw-purchases/<int:purchase_id>/confirm", methods=["POST"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("raw_purchases.confirm")
    def confirm_raw_purchase(business_id, purchase_id):
        purchase = RawPurchase.query.filter_by(id=purchase_id, business_id=business_id).first()
        if not purchase:
            return jsonify({"error": "Compra no encontrada"}), 404
        if purchase.status != "draft":
            return jsonify({"error": "La compra ya fue procesada"}), 400
        data = request.get_json() or {}
        financial_flow = str(data.get("financial_flow") or ("payable" if purchase.supplier_id else "cash")).strip().lower()
        if financial_flow not in {"cash", "payable"}:
            return jsonify({"error": "Flujo financiero inválido"}), 400
        if financial_flow == "payable" and not purchase.supplier_id:
            return jsonify({"error": "Asocia un proveedor para confirmar la compra como por pagar"}), 400
        treasury_account_id = int(data.get("treasury_account_id") or 0) or None
        if treasury_account_id and not TreasuryAccount.query.filter_by(id=treasury_account_id, business_id=business_id).first():
            return jsonify({"error": "Cuenta de tesorería no encontrada"}), 400
        role_snapshot = get_current_role_snapshot(g.current_user, business_id)
        purchase_items = purchase.items.order_by(RawPurchaseItem.id.asc()).all()
        for item in purchase_items:
            material = RawMaterial.query.filter_by(id=item.raw_material_id, business_id=business_id).first()
            if not material:
                return jsonify({"error": f"Materia prima {item.raw_material_id} no encontrada"}), 400
            previous_stock = float(material.current_stock or 0)
            new_stock = previous_stock + float(item.quantity or 0)
            material.current_stock = new_stock
            material.reference_cost = float(item.unit_cost or 0)
            movement = RawMaterialMovement(
                raw_material_id=material.id,
                business_id=business_id,
                created_by=g.current_user.id,
                raw_purchase_id=purchase.id,
                movement_type="in",
                quantity=_safe_round(item.quantity),
                previous_stock=_safe_round(previous_stock),
                new_stock=_safe_round(new_stock),
                reference_cost=float(item.unit_cost or 0),
                notes=purchase.notes or f"Compra {purchase.purchase_number}",
                created_by_name=g.current_user.name,
                created_by_role=role_snapshot,
            )
            db.session.add(movement)
        purchase.status = "confirmed"
        if financial_flow == "cash":
            expense = Expense(
                business_id=business_id,
                expense_date=purchase.purchase_date,
                category="inventario",
                amount=float(purchase.total or 0),
                description=purchase.notes or f"Compra {purchase.purchase_number}",
                source_type="purchase_payment",
                payment_method=_normalize_text(data.get("payment_method")) or "cash",
                treasury_account_id=treasury_account_id,
                raw_purchase_id=purchase.id,
                created_by_user_id=g.current_user.id,
                created_by_name=g.current_user.name,
                created_by_role=role_snapshot,
                updated_by_user_id=g.current_user.id,
            )
            db.session.add(expense)
        else:
            payable = SupplierPayable(
                business_id=business_id,
                supplier_id=purchase.supplier_id,
                raw_purchase_id=purchase.id,
                amount_total=_safe_round(purchase.total, 2),
                amount_paid=0,
                balance_due=_safe_round(purchase.total, 2),
                status="pending",
                due_date=None,
                notes=purchase.notes,
            )
            db.session.add(payable)
        db.session.commit()
        refresh_summary_materialized_days(business_id, purchase.purchase_date)
        return jsonify({"raw_purchase": purchase.to_dict()})

    @application.route("/api/businesses/<int:business_id>/supplier-payables/<int:payable_id>", methods=["GET"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("supplier_payables.read")
    def get_supplier_payable_detail(business_id, payable_id):
        payable = SupplierPayable.query.filter_by(id=payable_id, business_id=business_id).first()
        if not payable:
            return jsonify({"error": "Cuenta por pagar no encontrada"}), 404
        return jsonify({"supplier_payable": payable.to_dict(include_payments=True)})

    @application.route("/api/businesses/<int:business_id>/suppliers/<int:supplier_id>/payables", methods=["GET"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("supplier_payables.read")
    def get_supplier_payables_by_supplier(business_id, supplier_id):
        supplier = Supplier.query.filter_by(id=supplier_id, business_id=business_id).first()
        if not supplier:
            return jsonify({"error": "Proveedor no encontrado"}), 404
        status = str(request.args.get("status") or "").strip().lower()
        query = SupplierPayable.query.filter(
            SupplierPayable.business_id == business_id,
            SupplierPayable.supplier_id == supplier_id,
        )
        if status in {"pending", "partial", "paid"}:
            query = query.filter(SupplierPayable.status == status)
        payables = query.order_by(SupplierPayable.created_at.desc()).all()
        return jsonify({
            "supplier": _build_supplier_payload(supplier),
            "supplier_payables": [payable.to_dict(include_payments=False) for payable in payables],
            "summary": _build_supplier_summary(payables),
        })

    @application.route("/api/businesses/<int:business_id>/supplier-payables/<int:payable_id>/payments", methods=["GET"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("supplier_payables.read")
    def list_supplier_payable_payments(business_id, payable_id):
        payable = SupplierPayable.query.filter_by(id=payable_id, business_id=business_id).first()
        if not payable:
            return jsonify({"error": "Cuenta por pagar no encontrada"}), 404
        payments = payable.payments.order_by(SupplierPayment.payment_date.desc(), SupplierPayment.id.desc()).all()
        return jsonify({"supplier_payable": payable.to_dict(include_payments=True), "payments": [payment.to_dict() for payment in payments]})

    @application.route("/api/businesses/<int:business_id>/supplier-payables/<int:payable_id>/payments", methods=["POST"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("supplier_payables.pay")
    def add_supplier_payable_payment(business_id, payable_id):
        payable = SupplierPayable.query.filter_by(id=payable_id, business_id=business_id).first()
        if not payable:
            return jsonify({"error": "Cuenta por pagar no encontrada"}), 404
        data = request.get_json() or {}
        amount = float(data.get("amount") or 0)
        if amount <= 0:
            return jsonify({"error": "El monto debe ser mayor a 0"}), 400
        if amount - float(payable.balance_due or 0) > 0.009:
            return jsonify({"error": "El pago no puede superar el saldo pendiente"}), 400
        payment_date_value = _parse_date(data.get("payment_date"), default=date.today())
        treasury_account_id = int(data.get("treasury_account_id") or 0) or None
        if treasury_account_id and not TreasuryAccount.query.filter_by(id=treasury_account_id, business_id=business_id).first():
            return jsonify({"error": "Cuenta de tesorería no encontrada"}), 400
        role_snapshot = get_current_role_snapshot(g.current_user, business_id)
        payment = SupplierPayment(
            business_id=business_id,
            supplier_id=payable.supplier_id,
            supplier_payable_id=payable.id,
            amount=_safe_round(amount, 2),
            payment_date=payment_date_value,
            method=_normalize_text(data.get("method")) or "cash",
            treasury_account_id=treasury_account_id,
            reference=_normalize_text(data.get("reference")),
            notes=_normalize_text(data.get("notes")),
            created_by=g.current_user.id,
            created_by_name=g.current_user.name,
            created_by_role=role_snapshot,
        )
        db.session.add(payment)
        db.session.flush()
        payable.amount_paid = _safe_round(float(payable.amount_paid or 0) + float(payment.amount or 0), 2)
        _update_supplier_payable_status(payable)
        expense = Expense(
            business_id=business_id,
            expense_date=payment_date_value,
            category="inventario",
            amount=_safe_round(payment.amount, 2),
            description=payment.notes or payment.reference or f"Pago proveedor {payable.supplier.name if payable.supplier else payable.supplier_id}",
            source_type="supplier_payment",
            payment_method=payment.method,
            treasury_account_id=treasury_account_id,
            supplier_payable_id=payable.id,
            supplier_payment_id=payment.id,
            created_by_user_id=g.current_user.id,
            created_by_name=g.current_user.name,
            created_by_role=role_snapshot,
            updated_by_user_id=g.current_user.id,
        )
        db.session.add(expense)
        db.session.commit()
        refresh_summary_materialized_days(business_id, payment_date_value)
        return jsonify({"payment": payment.to_dict(), "supplier_payable": payable.to_dict(include_payments=True)}), 201

    @application.route("/api/businesses/<int:business_id>/recipes/references", methods=["GET"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("recipes.read")
    def get_recipe_references(business_id):
        products = Product.query.filter_by(business_id=business_id, active=True).order_by(Product.name.asc()).all()
        raw_materials = RawMaterial.query.filter_by(business_id=business_id, is_active=True).order_by(RawMaterial.name.asc()).all()
        return jsonify({"products": [product.to_dict() for product in products], "raw_materials": [material.to_dict() for material in raw_materials]})

    @application.route("/api/businesses/<int:business_id>/recipes", methods=["GET"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("recipes.read")
    def list_recipes(business_id):
        search = str(request.args.get("search") or "").strip().lower()
        product_id = request.args.get("product_id", type=int)
        include_inactive = str(request.args.get("include_inactive", "")).strip().lower() in {"1", "true", "yes"}
        query = Recipe.query.options(joinedload(Recipe.product)).filter(Recipe.business_id == business_id)
        if not include_inactive:
            query = query.filter(Recipe.is_active.is_(True))
        if product_id:
            query = query.filter(Recipe.product_id == product_id)
        recipes = query.order_by(Recipe.updated_at.desc(), Recipe.id.desc()).all()
        payloads = [recipe.to_dict(include_items=False, include_summary=True) for recipe in recipes]
        if search:
            payloads = [
                payload for payload in payloads
                if search in str(payload.get("name") or "").lower()
                or search in str(payload.get("product_name") or "").lower()
                or search in str(payload.get("notes") or "").lower()
            ]
        return jsonify({"recipes": payloads})

    @application.route("/api/businesses/<int:business_id>/recipes", methods=["POST"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("recipes.create")
    def create_recipe(business_id):
        data = request.get_json() or {}
        product_id = int(data.get("product_id") or 0)
        name = str(data.get("name") or "").strip()
        items_payload = data.get("items") or []
        product = Product.query.filter_by(id=product_id, business_id=business_id).first()
        if not product:
            return jsonify({"error": "Producto no encontrado"}), 400
        if not name:
            return jsonify({"error": "El nombre de la receta es obligatorio"}), 400
        if not isinstance(items_payload, list) or len(items_payload) == 0:
            return jsonify({"error": "Debes agregar al menos un insumo"}), 400
        material_ids = []
        for raw_item in items_payload:
            raw_material_id = int(raw_item.get("raw_material_id") or 0)
            quantity_required = float(raw_item.get("quantity_required") or 0)
            if raw_material_id <= 0 or quantity_required <= 0:
                return jsonify({"error": "Cada insumo debe tener materia prima y cantidad mayor a 0"}), 400
            if raw_material_id in material_ids:
                return jsonify({"error": "No puedes repetir la misma materia prima en una receta"}), 400
            if not RawMaterial.query.filter_by(id=raw_material_id, business_id=business_id).first():
                return jsonify({"error": f"Materia prima {raw_material_id} no encontrada"}), 400
            material_ids.append(raw_material_id)
        recipe = Recipe(
            business_id=business_id,
            product_id=product_id,
            name=name,
            notes=_normalize_text(data.get("notes")),
            is_active=bool(data.get("is_active", True)),
        )
        db.session.add(recipe)
        db.session.flush()
        _apply_recipe_items(recipe, items_payload)
        db.session.commit()
        return jsonify({"recipe": recipe.to_dict()}), 201

    @application.route("/api/businesses/<int:business_id>/recipes/<int:recipe_id>", methods=["GET"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("recipes.read")
    def get_recipe_detail(business_id, recipe_id):
        recipe = Recipe.query.filter_by(id=recipe_id, business_id=business_id).first()
        if not recipe:
            return jsonify({"error": "Receta no encontrada"}), 404
        recent_consumptions = recipe.consumptions.order_by(RecipeConsumption.created_at.desc(), RecipeConsumption.id.desc()).limit(10).all()
        return jsonify({"recipe": recipe.to_dict(), "recent_consumptions": [consumption.to_dict() for consumption in recent_consumptions]})

    @application.route("/api/businesses/<int:business_id>/recipes/<int:recipe_id>", methods=["PUT"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("recipes.update")
    def update_recipe(business_id, recipe_id):
        recipe = Recipe.query.filter_by(id=recipe_id, business_id=business_id).first()
        if not recipe:
            return jsonify({"error": "Receta no encontrada"}), 404
        data = request.get_json() or {}
        product_id = int(data.get("product_id") or recipe.product_id)
        product = Product.query.filter_by(id=product_id, business_id=business_id).first()
        if not product:
            return jsonify({"error": "Producto no encontrado"}), 400
        name = str(data.get("name") or recipe.name).strip()
        if not name:
            return jsonify({"error": "El nombre de la receta es obligatorio"}), 400
        recipe.product_id = product_id
        recipe.name = name
        if "notes" in data:
            recipe.notes = _normalize_text(data.get("notes"))
        if "is_active" in data:
            recipe.is_active = bool(data.get("is_active"))
        if "items" in data:
            if recipe.consumptions.count() > 0:
                return jsonify({"error": "No puedes cambiar los insumos de una receta con historial. Crea una nueva versión segura desde la calculadora."}), 400
            items_payload = data.get("items") or []
            if not isinstance(items_payload, list) or len(items_payload) == 0:
                return jsonify({"error": "Debes agregar al menos un insumo"}), 400
            material_ids = []
            for raw_item in items_payload:
                raw_material_id = int(raw_item.get("raw_material_id") or 0)
                quantity_required = float(raw_item.get("quantity_required") or 0)
                if raw_material_id <= 0 or quantity_required <= 0:
                    return jsonify({"error": "Cada insumo debe tener materia prima y cantidad mayor a 0"}), 400
                if raw_material_id in material_ids:
                    return jsonify({"error": "No puedes repetir la misma materia prima en una receta"}), 400
                if not RawMaterial.query.filter_by(id=raw_material_id, business_id=business_id).first():
                    return jsonify({"error": f"Materia prima {raw_material_id} no encontrada"}), 400
                material_ids.append(raw_material_id)
            _apply_recipe_items(recipe, items_payload)
        db.session.commit()
        return jsonify({"recipe": recipe.to_dict()})

    @application.route("/api/businesses/<int:business_id>/recipes/<int:recipe_id>", methods=["DELETE"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("recipes.delete")
    def deactivate_recipe(business_id, recipe_id):
        recipe = Recipe.query.filter_by(id=recipe_id, business_id=business_id).first()
        if not recipe:
            return jsonify({"error": "Receta no encontrada"}), 404
        recipe.is_active = False
        db.session.commit()
        return jsonify({"recipe": recipe.to_dict()})

    @application.route("/api/businesses/<int:business_id>/recipes/<int:recipe_id>/costing", methods=["GET"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("recipes.read")
    def get_recipe_costing(business_id, recipe_id):
        recipe = Recipe.query.filter_by(id=recipe_id, business_id=business_id).first()
        if not recipe:
            return jsonify({"error": "Receta no encontrada"}), 404
        return jsonify({"costing": _recipe_costing_from_recipe(recipe)})

    @application.route("/api/businesses/<int:business_id>/recipes/<int:recipe_id>/consume", methods=["POST"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("recipes.consume")
    def consume_recipe(business_id, recipe_id):
        recipe = Recipe.query.filter_by(id=recipe_id, business_id=business_id).first()
        if not recipe:
            return jsonify({"error": "Receta no encontrada"}), 404
        if not recipe.is_active:
            return jsonify({"error": "La receta está inactiva"}), 400
        data = request.get_json() or {}
        quantity_produced_or_sold = float(data.get("quantity_produced_or_sold") or 0)
        if quantity_produced_or_sold <= 0:
            return jsonify({"error": "La cantidad debe ser mayor a 0"}), 400
        role_snapshot = get_current_role_snapshot(g.current_user, business_id)
        consumption = RecipeConsumption(
            business_id=business_id,
            recipe_id=recipe.id,
            product_id=recipe.product_id,
            quantity_produced_or_sold=_safe_round(quantity_produced_or_sold),
            notes=_normalize_text(data.get("notes")),
            created_by=g.current_user.id,
            created_by_name=g.current_user.name,
            created_by_role=role_snapshot,
        )
        db.session.add(consumption)
        db.session.flush()
        recipe_items = recipe.items.order_by(RecipeItem.sort_order.asc(), RecipeItem.id.asc()).all()
        for recipe_item in recipe_items:
            material = RawMaterial.query.filter_by(id=recipe_item.raw_material_id, business_id=business_id).first()
            if not material:
                db.session.rollback()
                return jsonify({"error": f"Materia prima {recipe_item.raw_material_id} no encontrada"}), 400
            quantity_consumed = _safe_round(float(recipe_item.quantity_required or 0) * quantity_produced_or_sold, 4)
            previous_stock = float(material.current_stock or 0)
            new_stock = previous_stock - quantity_consumed
            material.current_stock = new_stock
            movement = RawMaterialMovement(
                raw_material_id=material.id,
                business_id=business_id,
                created_by=g.current_user.id,
                recipe_consumption_id=consumption.id,
                movement_type="out",
                quantity=quantity_consumed,
                previous_stock=_safe_round(previous_stock),
                new_stock=_safe_round(new_stock),
                reference_cost=material.reference_cost,
                notes=consumption.notes or f"Consumo receta {recipe.name}",
                created_by_name=g.current_user.name,
                created_by_role=role_snapshot,
            )
            db.session.add(movement)
            db.session.flush()
            db.session.add(RecipeConsumptionItem(
                recipe_consumption_id=consumption.id,
                raw_material_id=material.id,
                quantity_consumed=quantity_consumed,
                previous_stock=_safe_round(previous_stock),
                new_stock=_safe_round(new_stock),
                raw_material_movement_id=movement.id,
            ))
        db.session.commit()
        return jsonify({"recipe_consumption": consumption.to_dict()}), 201

    @application.route("/api/businesses/<int:business_id>/recipes/<int:recipe_id>/consumptions", methods=["GET"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("recipes.read")
    def list_recipe_consumptions(business_id, recipe_id):
        recipe = Recipe.query.filter_by(id=recipe_id, business_id=business_id).first()
        if not recipe:
            return jsonify({"error": "Receta no encontrada"}), 404
        consumptions = recipe.consumptions.order_by(RecipeConsumption.created_at.desc(), RecipeConsumption.id.desc()).all()
        return jsonify({"recipe": recipe.to_dict(), "consumptions": [consumption.to_dict() for consumption in consumptions]})

    @application.route("/api/businesses/<int:business_id>/recipe-consumptions/<int:consumption_id>", methods=["GET"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("recipes.read")
    def get_recipe_consumption(business_id, consumption_id):
        consumption = RecipeConsumption.query.filter_by(id=consumption_id, business_id=business_id).first()
        if not consumption:
            return jsonify({"error": "Consumo no encontrado"}), 404
        return jsonify({"recipe_consumption": consumption.to_dict()})

    @application.route("/api/businesses/<int:business_id>/cost-calculator/simulate", methods=["POST"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("recipes.read")
    def simulate_cost_calculator(business_id):
        try:
            simulation = _simulate_costing(business_id, request.get_json() or {})
        except ValueError as error:
            return jsonify({"error": str(error)}), 400
        return jsonify({"simulation": simulation})

    @application.route("/api/businesses/<int:business_id>/cost-calculator/save-as-recipe", methods=["POST"])
    @token_required
    @module_required("raw_inventory")
    @permission_required("recipes.create")
    def save_cost_calculator_as_recipe(business_id):
        data = request.get_json() or {}
        try:
            simulation = _simulate_costing(business_id, data)
        except ValueError as error:
            return jsonify({"error": str(error)}), 400
        product_id = int(data.get("product_id") or 0)
        if not product_id:
            return jsonify({"error": "Debes seleccionar un producto existente para guardar el costeo"}), 400
        product = Product.query.filter_by(id=product_id, business_id=business_id).first()
        if not product:
            return jsonify({"error": "Producto no encontrado"}), 400
        recipe_name = str(data.get("recipe_name") or product.name or "").strip()
        if not recipe_name:
            return jsonify({"error": "Debes indicar un nombre de receta"}), 400
        items_payload = []
        for index, item in enumerate(data.get("items") or []):
            raw_material_id = int(item.get("raw_material_id") or 0)
            quantity_required = float(item.get("quantity_required") or 0)
            if raw_material_id <= 0 or quantity_required <= 0:
                return jsonify({"error": "Todos los insumos deben tener materia prima y cantidad mayor a 0"}), 400
            items_payload.append({
                "raw_material_id": raw_material_id,
                "quantity_required": quantity_required,
                "notes": _normalize_text(item.get("notes")),
                "sort_order": index,
            })
        save_mode = str(data.get("save_mode") or "create").strip().lower() or "create"
        if save_mode not in {"create", "update_existing", "create_new_version"}:
            return jsonify({"error": "Modo de guardado inválido"}), 400
        target_recipe = None
        replaced_historical_recipe = False
        recipe_scope_message = None
        if save_mode == "update_existing":
            recipe_id = int(data.get("recipe_id") or 0)
            target_recipe = Recipe.query.filter_by(id=recipe_id, business_id=business_id).first()
            if not target_recipe:
                return jsonify({"error": "Receta no encontrada"}), 404
            if target_recipe.consumptions.count() > 0:
                return jsonify({"error": "La receta seleccionada ya tiene historial. Usa crear nueva versión segura."}), 400
            target_recipe.product_id = product_id
            target_recipe.name = recipe_name
            target_recipe.notes = _normalize_text(data.get("recipe_notes"))
            target_recipe.is_active = bool(data.get("is_active", True))
            _apply_recipe_items(target_recipe, items_payload)
        else:
            if save_mode == "create_new_version":
                base_recipe_id = int(data.get("recipe_id") or 0)
                base_recipe = Recipe.query.filter_by(id=base_recipe_id, business_id=business_id).first() if base_recipe_id else None
                replaced_historical_recipe = bool(base_recipe and base_recipe.consumptions.count() > 0)
                if base_recipe and data.get("deactivate_existing_recipe"):
                    base_recipe.is_active = False
                    recipe_scope_message = "La receta anterior quedó inactiva y se creó una nueva versión segura."
            target_recipe = Recipe(
                business_id=business_id,
                product_id=product_id,
                name=recipe_name,
                notes=_normalize_text(data.get("recipe_notes")),
                is_active=bool(data.get("is_active", True)),
            )
            db.session.add(target_recipe)
            db.session.flush()
            _apply_recipe_items(target_recipe, items_payload)
        updated_product_fields = {}
        if bool(data.get("update_product_cost")) and simulation.get("cost_per_unit") is not None:
            product.cost = float(simulation.get("cost_per_unit") or 0)
            updated_product_fields["cost"] = _safe_round(product.cost, 4)
        if bool(data.get("update_product_sale_price")) and simulation.get("suggested_sale_price") is not None:
            product.price = float(simulation.get("suggested_sale_price") or 0)
            updated_product_fields["price"] = _safe_round(product.price, 4)
        db.session.commit()
        return jsonify({
            "recipe": target_recipe.to_dict() if target_recipe else None,
            "simulation": simulation,
            "save_mode": save_mode,
            "replaced_historical_recipe": replaced_historical_recipe,
            "product_updated": len(updated_product_fields) > 0,
            "updated_product_fields": updated_product_fields or None,
            "recipe_scope_message": recipe_scope_message,
        })
