from __future__ import annotations

from datetime import date, datetime, time, timedelta

from flask import g, jsonify, request
from sqlalchemy import func
from sqlalchemy.orm import joinedload

from backend.database import db
from backend.models import Business, Customer, LedgerEntry, Order, Payment, Product, Sale, SalesGoal, TreasuryAccount, User
from backend.services.commercial_financials import create_sale_financial_entries, delete_sale_financial_effects
from backend.services.operational_inventory import clear_sale_origin_links, enrich_line_item_with_operational_mode, reverse_sale_operational_effects
from backend.services.sale_inventory import apply_sale_inventory_effects


ORDER_STATUSES = {"pending", "in_progress", "completed", "cancelled"}


def register_commercial_core_restore_routes(app, *, token_required, module_required, commercial_section_required, permission_required, has_permission, get_current_role_snapshot, refresh_summary_materialized_days):
    def _round(value, digits=2):
        return round(float(value or 0), digits)

    def _parse_date(value, default=None):
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

    def _text(value):
        value = str(value or "").strip()
        return value or None

    def _business_or_404(business_id):
        business = Business.query.get(business_id)
        if not business:
            return None, (jsonify({"error": "Negocio no encontrado"}), 404)
        return business, None

    def _module_enabled(business, module_key):
        try:
            return any(getattr(module, "module_key", None) == module_key and getattr(module, "enabled", True) for module in business.modules.all())
        except Exception:
            return False

    def _next_order_number(business_id):
        prefix = f"ORD-{business_id}-"
        values = [value for (value,) in db.session.query(Order.order_number).filter(Order.order_number.like(f"{prefix}%")).all()]
        max_seq = 0
        for value in values:
            suffix = str(value or "")[len(prefix):]
            if suffix.isdigit():
                max_seq = max(max_seq, int(suffix))
        return f"{prefix}{max_seq + 1:05d}"

    def _normalize_order_items(items_payload, business_id):
        if not isinstance(items_payload, list) or not items_payload:
            raise ValueError("Debes agregar al menos un item al pedido")
        business = Business.query.get(business_id)
        items = []
        subtotal = 0.0
        for index, raw in enumerate(items_payload):
            product_id = raw.get("product_id")
            product = Product.query.filter_by(id=int(product_id), business_id=business_id).first() if product_id not in (None, "") else None
            if product_id not in (None, "") and not product:
                raise ValueError(f"Producto inválido en la línea {index + 1}")
            quantity = float(raw.get("quantity") if raw.get("quantity") is not None else raw.get("qty") or 0)
            unit_price = float(raw.get("unit_price") if raw.get("unit_price") is not None else raw.get("price") or 0)
            if quantity <= 0 or unit_price < 0:
                raise ValueError(f"Valores inválidos en el item {index + 1}")
            name = _text(raw.get("name") or (product.name if product else None))
            if not name:
                raise ValueError(f"El item {index + 1} necesita nombre")
            total = _round(raw.get("total") if raw.get("total") is not None else quantity * unit_price)
            subtotal = _round(subtotal + total)
            item_payload = {"product_id": int(product_id) if product_id not in (None, "") else None, "name": name, "quantity": quantity, "qty": quantity, "unit_price": _round(unit_price), "price": _round(unit_price), "total": total, "fulfillment_mode": raw.get("fulfillment_mode")}
            items.append(enrich_line_item_with_operational_mode(item=item_payload, product=product, business=business))
        return items, subtotal

    def _order_payload(order):
        payload = order.to_dict()
        payload["note"] = order.notes
        payload["notes"] = order.notes
        return payload

    def _find_sale_from_order(order):
        tag = f"Desde pedido {order.order_number} (ID {order.id})"
        return Sale.query.filter(Sale.business_id == order.business_id, Sale.note.like(f"%{tag}%")).first()

    def _create_sale_from_order(business, order, data):
        payment_details = data.get("payment_details") or {}
        sale_date = _parse_date(data.get("sale_date"), default=date.today())
        amount_paid = payment_details.get("amount_paid")
        if amount_paid is None:
            amount_paid = order.total if bool(payment_details.get("paid", True)) else 0
        amount_paid = float(amount_paid or 0)
        if amount_paid < 0 or amount_paid - float(order.total or 0) > 0.01:
            raise ValueError("El monto pagado es inválido")
        balance = _round(max(float(order.total or 0) - amount_paid, 0))
        if balance > 0.01 and not order.customer_id:
            raise ValueError("Las ventas a crédito o parciales requieren cliente")
        current_user = g.current_user
        note_tag = f"Desde pedido {order.order_number} (ID {order.id})"
        extra_note = _text(data.get("note"))
        if extra_note:
            note_tag = f"{note_tag} - {extra_note}"
        treasury_account_id = payment_details.get("treasury_account_id")
        if treasury_account_id not in (None, ""):
            try:
                treasury_account_id = int(treasury_account_id)
            except (TypeError, ValueError):
                raise ValueError("La cuenta de caja seleccionada no es valida")
            if not TreasuryAccount.query.filter_by(id=treasury_account_id, business_id=business.id).first():
                raise ValueError("La cuenta de caja seleccionada no existe")
        else:
            treasury_account_id = None
        role_snapshot = get_current_role_snapshot(current_user, business.id) if current_user else "Sistema"
        sale = Sale(business_id=business.id, customer_id=order.customer_id, user_id=getattr(current_user, "id", None), sale_date=sale_date, items=order.items, subtotal=_round(order.subtotal or 0), discount=_round(order.discount or 0), total=_round(order.total or 0), balance=balance, collected_amount=_round(amount_paid), total_cost=0, treasury_account_id=treasury_account_id if amount_paid > 0.01 else None, payment_method=str(payment_details.get("method") or payment_details.get("payment_method") or "cash"), paid=balance <= 0.01, note=note_tag, created_by_name=getattr(current_user, "name", None) or "Sistema", created_by_role=role_snapshot, updated_by_user_id=getattr(current_user, "id", None))
        db.session.add(sale)
        db.session.flush()
        sale.total_cost = apply_sale_inventory_effects(
            business=business,
            sale=sale,
            items=order.items,
            actor_user=current_user,
            role_snapshot=role_snapshot,
            raw_material_consumption_mode="order_conversion",
        )
        payment = None
        if amount_paid > 0.01 and order.customer_id:
            payment = Payment(business_id=business.id, customer_id=order.customer_id, sale_id=sale.id, payment_date=sale_date, amount=_round(amount_paid), method=sale.payment_method, treasury_account_id=treasury_account_id, note=note_tag, created_by_user_id=getattr(current_user, "id", None), created_by_name=getattr(current_user, "name", None) or "Sistema", created_by_role=role_snapshot, updated_by_user_id=getattr(current_user, "id", None))
            db.session.add(payment)
            db.session.flush()
        if order.customer_id:
            create_sale_financial_entries(
                sale=sale,
                payment=payment,
                payment_note=f"Abono inicial Venta #{sale.id}" if payment is not None else None,
            )
        return sale

    def _goal_payload(goal):
        current_amount = db.session.query(func.coalesce(func.sum(Sale.total), 0.0)).filter(Sale.business_id == goal.business_id, Sale.sale_date >= goal.start_date, Sale.sale_date <= goal.end_date, Sale.user_id == goal.user_id).scalar() or 0.0
        progress_pct = _round((float(current_amount) / float(goal.target_amount or 0) * 100) if float(goal.target_amount or 0) > 0 else 0)
        user = User.query.get(goal.user_id)
        payload = goal.to_dict()
        payload["current_amount"] = _round(current_amount)
        payload["progress_pct"] = progress_pct
        payload["user_name"] = user.name if user else None
        payload["viewers"] = [viewer.id for viewer in goal.viewers.all()]
        if payload.get("status") == "active" and progress_pct >= 100:
            payload["status"] = "completed"
        return payload

    def _receivables_overview(business, customer_id=None):
        settings = dict(business.settings or {})
        default_term_days = int(settings.get("debt_term_days") or 30)
        due_soon_days = int(settings.get("receivables_due_soon_days") or 7)
        term_map = dict(settings.get("receivable_terms_by_sale") or {})
        query = Sale.query.options(joinedload(Sale.customer)).filter(Sale.business_id == business.id, Sale.balance > 0.01)
        if customer_id:
            query = query.filter(Sale.customer_id == customer_id)
        sales = query.order_by(Sale.sale_date.desc(), Sale.id.desc()).all()
        today = date.today()
        receivables = []
        customer_map = {}
        summary = {"total_pending": 0.0, "customers_with_balance": 0, "open_count": 0, "overdue_total": 0.0, "due_soon_total": 0.0, "due_today_total": 0.0, "current_total": 0.0}
        for sale in sales:
            term_days = int(term_map.get(str(sale.id), term_map.get(sale.id, default_term_days)) or default_term_days)
            due_date = (sale.sale_date or today) + timedelta(days=term_days)
            days_until_due = (due_date - today).days
            days_overdue = abs(min(days_until_due, 0))
            pending_balance = _round(sale.balance or 0)
            total_paid = _round((sale.total or 0) - pending_balance)
            if due_date < today:
                status = "overdue"; label = "Vencida"
            elif due_date == today:
                status = "due_today"; label = "Vence hoy"
            elif 0 < days_until_due <= due_soon_days:
                status = "due_soon"; label = "Por vencer"
            else:
                status = "current"; label = "Al día"
            receivable = {"sale_id": sale.id, "customer_id": sale.customer_id, "customer_name": sale.customer.name if sale.customer else "Cliente ocasional", "customer_phone": sale.customer.phone if sale.customer else None, "document_label": f"Venta #{sale.id}", "original_amount": _round(sale.total or 0), "total_paid": total_paid, "pending_balance": pending_balance, "base_date": (sale.sale_date or today).isoformat(), "term_days": term_days, "due_date": due_date.isoformat(), "status": status, "status_label": label, "days_until_due": days_until_due, "days_overdue": days_overdue}
            receivables.append(receivable)
            summary["total_pending"] = _round(summary["total_pending"] + pending_balance)
            summary["open_count"] += 1
            if status == "overdue":
                summary["overdue_total"] = _round(summary["overdue_total"] + pending_balance)
            elif status == "due_today":
                summary["due_today_total"] = _round(summary["due_today_total"] + pending_balance)
            elif status == "due_soon":
                summary["due_soon_total"] = _round(summary["due_soon_total"] + pending_balance)
            else:
                summary["current_total"] = _round(summary["current_total"] + pending_balance)
            if sale.customer_id:
                current = customer_map.get(sale.customer_id) or {"customer_id": sale.customer_id, "customer_name": sale.customer.name if sale.customer else "Cliente ocasional", "customer_phone": sale.customer.phone if sale.customer else None, "total_balance": 0.0, "overdue_balance": 0.0, "due_soon_balance": 0.0, "due_today_balance": 0.0, "current_balance": 0.0, "invoice_count": 0, "oldest_base_date": None, "nearest_due_date": None, "max_days_overdue": 0, "status": "current", "status_label": "Al día"}
                current["total_balance"] = _round(current["total_balance"] + pending_balance)
                current["invoice_count"] += 1
                current["max_days_overdue"] = max(int(current["max_days_overdue"]), days_overdue)
                base_date = receivable["base_date"]
                if not current["oldest_base_date"] or base_date < current["oldest_base_date"]:
                    current["oldest_base_date"] = base_date
                if not current["nearest_due_date"] or receivable["due_date"] < current["nearest_due_date"]:
                    current["nearest_due_date"] = receivable["due_date"]
                current[f"{status}_balance" if status in {"overdue", "due_soon", "due_today", "current"} else "current_balance"] = _round(current.get(f"{status}_balance" if status in {"overdue", "due_soon", "due_today", "current"} else "current_balance", 0) + pending_balance)
                customer_map[sale.customer_id] = current
        customers = []
        for item in customer_map.values():
            if item["overdue_balance"] > 0:
                item["status"] = "overdue"; item["status_label"] = "Vencida"
            elif item["due_today_balance"] > 0:
                item["status"] = "due_today"; item["status_label"] = "Vence hoy"
            elif item["due_soon_balance"] > 0:
                item["status"] = "due_soon"; item["status_label"] = "Por vencer"
            customers.append(item)
        customers.sort(key=lambda item: (-float(item.get("total_balance") or 0), str(item.get("customer_name") or "")))
        summary["customers_with_balance"] = len(customers)
        return {"summary": summary, "customers": customers, "receivables": receivables, "settings": {"default_term_days": default_term_days, "due_soon_days": due_soon_days}}

    @app.route("/api/businesses/<int:business_id>/orders", methods=["GET"])
    @token_required
    @module_required("sales")
    @commercial_section_required("orders")
    @permission_required("orders.view")
    def commercial_core_list_orders(business_id):
        query = Order.query.options(joinedload(Order.customer)).filter(Order.business_id == business_id)
        start_date = _parse_date(request.args.get("start_date"))
        end_date = _parse_date(request.args.get("end_date"))
        if start_date:
            query = query.filter(Order.order_date >= datetime.combine(start_date, time.min))
        if end_date:
            query = query.filter(Order.order_date <= datetime.combine(end_date, time.min))
        return jsonify({"orders": [_order_payload(order) for order in query.order_by(Order.order_date.desc(), Order.id.desc()).all()]})

    @app.route("/api/businesses/<int:business_id>/orders", methods=["POST"])
    @token_required
    @module_required("sales")
    @commercial_section_required("orders")
    @permission_required("orders.manage")
    def commercial_core_create_order(business_id):
        data = request.get_json() or {}
        try:
            items, subtotal = _normalize_order_items(data.get("items"), business_id)
            discount = _round(data.get("discount") or 0)
            total = _round(data.get("total") if data.get("total") is not None else subtotal - discount)
            customer_id = data.get("customer_id")
            if customer_id not in (None, "") and not Customer.query.filter_by(id=int(customer_id), business_id=business_id).first():
                return jsonify({"error": "Cliente no encontrado"}), 404
            order = Order(business_id=business_id, customer_id=int(customer_id) if customer_id not in (None, "") else None, order_number=_next_order_number(business_id), status=str(data.get("status") or "pending").lower(), items=items, subtotal=_round(subtotal), discount=discount, total=total, notes=_text(data.get("note") or data.get("notes")), order_date=datetime.combine(_parse_date(data.get("order_date"), default=date.today()), time.min))
            if order.status not in ORDER_STATUSES:
                order.status = "pending"
            db.session.add(order)
            db.session.commit()
            return jsonify({"order": _order_payload(order)}), 201
        except ValueError as exc:
            db.session.rollback()
            return jsonify({"error": str(exc)}), 400

    @app.route("/api/businesses/<int:business_id>/orders/<int:order_id>", methods=["PUT"])
    @token_required
    @module_required("sales")
    @commercial_section_required("orders")
    @permission_required("orders.manage")
    def commercial_core_update_order(business_id, order_id):
        business, error = _business_or_404(business_id)
        if error:
            return error
        order = Order.query.filter_by(id=order_id, business_id=business_id).first()
        if not order:
            return jsonify({"error": "Pedido no encontrado"}), 404
        data = request.get_json() or {}
        try:
            next_status = str(data.get("status") or order.status).lower()
            if next_status not in ORDER_STATUSES:
                return jsonify({"error": "Estado inválido"}), 400
            linked_sale = _find_sale_from_order(order)
            if order.status == "completed" and next_status not in {"completed", "cancelled"} and linked_sale:
                return jsonify({"error": "El pedido ya fue convertido en venta y no puede cambiar de estado"}), 400
            if _text(data.get("note") or data.get("notes")) is not None:
                order.notes = _text(data.get("note") or data.get("notes"))
            if next_status == "completed" and order.status != "completed":
                sale = linked_sale or _create_sale_from_order(business, order, data)
                order.status = "completed"
                refresh_summary_materialized_days(business_id, sale.sale_date)
                db.session.commit()
                return jsonify({"order": _order_payload(order), "sale": sale.to_dict()})
            if next_status == "cancelled" and order.status == "completed" and linked_sale:
                role_snapshot = get_current_role_snapshot(g.current_user, business_id)
                reverse_sale_operational_effects(
                    business=business,
                    sale=linked_sale,
                    actor_user=g.current_user,
                    role_snapshot=role_snapshot,
                )
                clear_sale_origin_links(sale=linked_sale)
                financial_reversal = delete_sale_financial_effects(sale=linked_sale)
                db.session.delete(linked_sale)
                order.status = "cancelled"
                refresh_summary_materialized_days(business_id, *sorted({linked_sale.sale_date, *(financial_reversal.get("affected_dates") or [])}))
                db.session.commit()
                return jsonify({"order": _order_payload(order)})
            order.status = next_status
            db.session.commit()
            return jsonify({"order": _order_payload(order)})
        except ValueError as exc:
            db.session.rollback()
            return jsonify({"error": str(exc)}), 400

    @app.route("/api/businesses/<int:business_id>/orders/<int:order_id>", methods=["DELETE"])
    @token_required
    @module_required("sales")
    @commercial_section_required("orders")
    @permission_required("orders.manage")
    def commercial_core_delete_order(business_id, order_id):
        order = Order.query.filter_by(id=order_id, business_id=business_id).first()
        if not order:
            return jsonify({"error": "Pedido no encontrado"}), 404
        if _find_sale_from_order(order):
            return jsonify({"error": "No puedes eliminar un pedido convertido en venta"}), 400
        db.session.delete(order)
        db.session.commit()
        return jsonify({"ok": True})

    @app.route("/api/businesses/<int:business_id>/sales-goals", methods=["GET"])
    @token_required
    @module_required("sales")
    @commercial_section_required("sales_goals")
    @permission_required("sales.read")
    def commercial_core_list_sales_goals(business_id):
        business, error = _business_or_404(business_id)
        if error:
            return error
        current_user = g.current_user
        query = SalesGoal.query.filter(SalesGoal.business_id == business_id)
        is_owner = business.user_id == current_user.id
        can_view_all = is_owner or has_permission(current_user, "sales.goals.view_all", business_id) or has_permission(current_user, "sales.goals.manage", business_id) or has_permission(current_user, "*", business_id)
        if not can_view_all:
            query = query.filter((SalesGoal.user_id == current_user.id) | (SalesGoal.viewers.any(User.id == current_user.id)))
        return jsonify({"sales_goals": [_goal_payload(goal) for goal in query.order_by(SalesGoal.end_date.asc(), SalesGoal.id.desc()).all()]})

    @app.route("/api/businesses/<int:business_id>/sales-goals", methods=["POST"])
    @token_required
    @module_required("sales")
    @commercial_section_required("sales_goals")
    @permission_required("sales.goals.manage")
    def commercial_core_create_sales_goal(business_id):
        data = request.get_json() or {}
        title = _text(data.get("title"))
        start_date = _parse_date(data.get("start_date"))
        end_date = _parse_date(data.get("end_date"))
        if not title or not start_date or not end_date or end_date < start_date:
            return jsonify({"error": "Datos inválidos para la meta"}), 400
        assigned_user_id = int(data.get("assigned_user_id") or g.current_user.id)
        if not User.query.get(assigned_user_id):
            return jsonify({"error": "Usuario no encontrado"}), 404
        goal = SalesGoal(user_id=assigned_user_id, business_id=business_id, title=title, description=_text(data.get("description")), target_amount=_round(data.get("target_amount") or 0), start_date=start_date, end_date=end_date, status=str(data.get("status") or "active").lower())
        db.session.add(goal)
        db.session.flush()
        viewer_ids = [int(v) for v in (data.get("viewers") or []) if str(v).strip()]
        goal.viewers = User.query.filter(User.id.in_(viewer_ids)).all() if viewer_ids else []
        db.session.commit()
        return jsonify({"sales_goal": _goal_payload(goal)}), 201

    @app.route("/api/businesses/<int:business_id>/sales-goals/<int:goal_id>", methods=["PUT"])
    @token_required
    @module_required("sales")
    @commercial_section_required("sales_goals")
    @permission_required("sales.goals.manage")
    def commercial_core_update_sales_goal(business_id, goal_id):
        goal = SalesGoal.query.filter_by(id=goal_id, business_id=business_id).first()
        if not goal:
            return jsonify({"error": "Meta no encontrada"}), 404
        data = request.get_json() or {}
        if "title" in data:
            title = _text(data.get("title"))
            if not title:
                return jsonify({"error": "El título es obligatorio"}), 400
            goal.title = title
        if "target_amount" in data:
            goal.target_amount = _round(data.get("target_amount") or 0)
        if "start_date" in data:
            parsed = _parse_date(data.get("start_date"))
            if not parsed:
                return jsonify({"error": "Fecha inicial inválida"}), 400
            goal.start_date = parsed
        if "end_date" in data:
            parsed = _parse_date(data.get("end_date"))
            if not parsed:
                return jsonify({"error": "Fecha final inválida"}), 400
            goal.end_date = parsed
        if goal.end_date < goal.start_date:
            return jsonify({"error": "La fecha final no puede ser anterior a la inicial"}), 400
        if "status" in data:
            goal.status = str(data.get("status") or "active").lower()
        if "assigned_user_id" in data and str(data.get("assigned_user_id") or "").strip():
            assigned_user_id = int(data.get("assigned_user_id"))
            if not User.query.get(assigned_user_id):
                return jsonify({"error": "Usuario no encontrado"}), 404
            goal.user_id = assigned_user_id
        if "viewers" in data:
            viewer_ids = [int(v) for v in (data.get("viewers") or []) if str(v).strip()]
            goal.viewers = User.query.filter(User.id.in_(viewer_ids)).all() if viewer_ids else []
        db.session.commit()
        return jsonify({"sales_goal": _goal_payload(goal)})

    @app.route("/api/businesses/<int:business_id>/sales-goals/<int:goal_id>", methods=["DELETE"])
    @token_required
    @module_required("sales")
    @commercial_section_required("sales_goals")
    @permission_required("sales.goals.manage")
    def commercial_core_delete_sales_goal(business_id, goal_id):
        goal = SalesGoal.query.filter_by(id=goal_id, business_id=business_id).first()
        if not goal:
            return jsonify({"error": "Meta no encontrada"}), 404
        db.session.delete(goal)
        db.session.commit()
        return jsonify({"ok": True})

    @app.route("/api/businesses/<int:business_id>/receivables/overview", methods=["GET"])
    @token_required
    @module_required("accounts_receivable")
    @permission_required("customers.read")
    def commercial_core_receivables_overview(business_id):
        business, error = _business_or_404(business_id)
        if error:
            return error
        return jsonify(_receivables_overview(business, request.args.get("customer_id", type=int)))

    @app.route("/api/businesses/<int:business_id>/receivables/<int:sale_id>/term", methods=["PUT"])
    @token_required
    @module_required("accounts_receivable")
    @permission_required("customers.read")
    def commercial_core_receivable_term(business_id, sale_id):
        business, error = _business_or_404(business_id)
        if error:
            return error
        current_user = g.current_user
        can_manage = business.user_id == current_user.id or has_permission(current_user, "payments.update", business_id) or has_permission(current_user, "business.update", business_id) or has_permission(current_user, "*", business_id)
        if not can_manage:
            return jsonify({"error": "Permiso insuficiente para actualizar el plazo"}), 403
        sale = Sale.query.filter_by(id=sale_id, business_id=business_id).first()
        if not sale:
            return jsonify({"error": "Venta no encontrada"}), 404
        term_days = int((request.get_json() or {}).get("term_days") or 0)
        if term_days < 0:
            return jsonify({"error": "El plazo no puede ser negativo"}), 400
        settings = dict(business.settings or {})
        term_map = dict(settings.get("receivable_terms_by_sale") or {})
        term_map[str(sale.id)] = term_days
        settings["receivable_terms_by_sale"] = term_map
        business.settings = settings
        db.session.commit()
        overview = _receivables_overview(business, sale.customer_id)
        receivable = next((item for item in overview["receivables"] if item["sale_id"] == sale.id), None)
        return jsonify({"sale_id": sale.id, "term_days": term_days, "receivable": receivable})
