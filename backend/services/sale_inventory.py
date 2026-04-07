from __future__ import annotations

from backend.database import db
from backend.models import Product, ProductMovement
from backend.services.business_operational_profile import business_tracks_finished_goods_stock
from backend.services.operational_inventory import consume_recipe_stock, resolve_product_fulfillment_mode


RAW_MATERIAL_FULFILLMENT_MODES = {'sale', 'fulfillment', 'quote_conversion', 'order_conversion'}


def _safe_float(value, default=0.0):
    try:
        return float(value)
    except Exception:
        return float(default)


def _safe_round(value, digits=4):
    return round(_safe_float(value, 0), digits)


def apply_sale_inventory_effects(
    *,
    business,
    sale,
    items,
    actor_user,
    role_snapshot,
    raw_material_consumption_mode: str = 'sale',
):
    total_cost = 0.0
    settings = (business.settings or {}) if isinstance(getattr(business, 'settings', None), dict) else {}
    manual_auto_consume = bool(settings.get('auto_consume_recipes_on_sale'))
    should_track_finished_goods_stock = business_tracks_finished_goods_stock(business)
    raw_material_consumption_mode = str(raw_material_consumption_mode or 'sale').strip().lower() or 'sale'

    for item in items or []:
        if not isinstance(item, dict):
            continue
        product_id = item.get('product_id')
        quantity = _safe_float(item.get('quantity') if item.get('quantity') is not None else item.get('qty'), 0)
        if not product_id or quantity <= 0:
            continue

        product = Product.query.filter_by(id=int(product_id), business_id=business.id).first()
        if not product:
            raise ValueError(f'Producto {product_id} no encontrado')
        fulfillment_mode = resolve_product_fulfillment_mode(
            product=product,
            business=business,
            explicit_mode=item.get('fulfillment_mode'),
        )
        item['fulfillment_mode'] = fulfillment_mode
        inventory_effects = item.get('inventory_effects') if isinstance(item.get('inventory_effects'), dict) else {}
        inventory_effects['fulfillment_mode'] = fulfillment_mode
        inventory_effects.setdefault('finished_goods_stock_decremented', False)
        inventory_effects.setdefault('recipe_consumption_ids', [])
        inventory_effects.setdefault('raw_material_consumed', False)

        if getattr(product, 'type', 'product') == 'product' and should_track_finished_goods_stock and fulfillment_mode in {'make_to_stock', 'resale_stock'}:
            previous_stock = _safe_float(product.stock, 0)
            new_stock = previous_stock - quantity
            product.stock = new_stock
            movement = ProductMovement(
                product_id=product.id,
                business_id=business.id,
                user_id=getattr(actor_user, 'id', None),
                type='out',
                quantity=quantity,
                reason=f'Venta #{sale.id}',
                created_by_name=getattr(actor_user, 'name', None) or sale.created_by_name or 'Sistema',
                created_by_role=role_snapshot,
            )
            db.session.add(movement)
            inventory_effects['finished_goods_stock_decremented'] = True

        total_cost += _safe_float(product.cost, 0) * quantity

        should_consume_on_this_line = fulfillment_mode == 'make_to_order' and (
            raw_material_consumption_mode in RAW_MATERIAL_FULFILLMENT_MODES or manual_auto_consume
        )
        if should_consume_on_this_line:
            if raw_material_consumption_mode == 'quote_conversion':
                consumption_notes = f'Consumo por conversión de cotización en venta #{sale.id}'
                consumption_source_type = 'quote_conversion'
            elif raw_material_consumption_mode == 'order_conversion':
                consumption_notes = f'Consumo por conversión de pedido en venta #{sale.id}'
                consumption_source_type = 'order_conversion'
            elif raw_material_consumption_mode == 'fulfillment':
                consumption_notes = f'Consumo por cumplimiento de venta #{sale.id}'
                consumption_source_type = 'sale_fulfillment'
            elif raw_material_consumption_mode == 'sale':
                consumption_notes = f'Consumo por venta confirmada #{sale.id}'
                consumption_source_type = 'sale'
            else:
                consumption_notes = f'Consumo automático por venta #{sale.id}'
                consumption_source_type = 'sale_auto'
            result = consume_recipe_stock(
                business=business,
                product=product,
                quantity=quantity,
                actor_user=actor_user,
                role_snapshot=role_snapshot,
                notes=consumption_notes,
                related_sale_id=sale.id,
                source_type=consumption_source_type,
                source_document_type='sale',
                source_document_id=sale.id,
            )
            inventory_effects['recipe_consumption_ids'] = [result['recipe_consumption'].id]
            inventory_effects['raw_material_items'] = result['items']
            inventory_effects['raw_material_total_reference_cost'] = result['total_reference_cost']
            inventory_effects['raw_material_consumed'] = True
            inventory_effects['raw_material_source_type'] = consumption_source_type
            if result['total_reference_cost'] > 0:
                total_cost -= _safe_float(product.cost, 0) * quantity
                total_cost += _safe_float(result['total_reference_cost'], 0)

        item['inventory_effects'] = inventory_effects

    sale.items = list(items or [])
    return round(total_cost, 2)
