from __future__ import annotations

from datetime import date, datetime
from html import escape
from io import BytesIO

from flask import g, jsonify, request, send_file
from sqlalchemy.orm import joinedload

from backend.database import db
from backend.models import Business, Customer, LedgerEntry, Payment, Product, Quote, QuoteItem, Sale, TreasuryAccount
from backend.services.commercial_financials import create_sale_financial_entries
from backend.services.operational_inventory import enrich_line_item_with_operational_mode
from backend.services.sale_inventory import apply_sale_inventory_effects

try:
    from xhtml2pdf import pisa
    HAS_XHTML2PDF = True
except Exception:
    pisa = None
    HAS_XHTML2PDF = False


QUOTE_STATUSES = {"draft", "sent", "approved", "rejected", "expired", "converted"}


def register_commercial_quotes_restore_routes(app, *, token_required, module_required, permission_required, refresh_summary_materialized_days):
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

    def _next_quote_code(business_id):
        prefix = "COT-"
        values = [value for (value,) in db.session.query(Quote.quote_code).filter(Quote.business_id == business_id).all()]
        max_seq = 0
        for value in values:
            raw = str(value or "")
            if not raw.startswith(prefix):
                continue
            suffix = raw[len(prefix):]
            if suffix.isdigit():
                max_seq = max(max_seq, int(suffix))
        return f"{prefix}{max_seq + 1:06d}"

    def _module_enabled(business, module_key):
        try:
            return any(getattr(module, "module_key", None) == module_key and getattr(module, "enabled", True) for module in business.modules.all())
        except Exception:
            return False

    def _normalize_items(items_payload, business_id):
        if not isinstance(items_payload, list) or not items_payload:
            raise ValueError("Debes agregar al menos un item a la cotización")
        business = Business.query.get(business_id)
        items = []
        subtotal = 0.0
        for index, raw in enumerate(items_payload):
            product_id = raw.get("product_id")
            product = Product.query.filter_by(id=int(product_id), business_id=business_id).first() if product_id not in (None, "") else None
            if product_id not in (None, "") and not product:
                raise ValueError(f"Producto inválido en la línea {index + 1}")
            quantity = float(raw.get("quantity") or 0)
            unit_price = float(raw.get("unit_price") or 0)
            if quantity <= 0 or unit_price < 0:
                raise ValueError(f"Valores inválidos en el item {index + 1}")
            description = _text(raw.get("description") or (product.name if product else None))
            if not description:
                raise ValueError(f"La descripción del item {index + 1} es obligatoria")
            line_subtotal = _round(quantity * unit_price)
            subtotal = _round(subtotal + line_subtotal)
            item_payload = {"product_id": int(product_id) if product_id not in (None, "") else None, "description": description, "quantity": quantity, "unit_price": _round(unit_price), "subtotal": line_subtotal, "sort_order": int(raw.get("sort_order") if raw.get("sort_order") is not None else index), "fulfillment_mode": raw.get("fulfillment_mode")}
            items.append(enrich_line_item_with_operational_mode(item=item_payload, product=product, business=business))
        return items, subtotal

    def _assign_quote_items(quote, items):
        quote.items = [QuoteItem(product_id=item["product_id"], description=item["description"], quantity=item["quantity"], unit_price=item["unit_price"], subtotal=item["subtotal"], fulfillment_mode=item.get("fulfillment_mode"), sort_order=item["sort_order"]) for item in items]

    def _quote_html(quote, business):
        rows = "".join(
            f"<tr><td>{escape(str(item.description or ''))}</td><td style='text-align:right'>{escape(str(item.quantity or 0))}</td><td style='text-align:right'>{escape(str(item.unit_price or 0))}</td><td style='text-align:right'>{escape(str(item.subtotal or 0))}</td></tr>"
            for item in quote.items
        )
        return f"""
<!DOCTYPE html>
<html lang='es'>
<head>
  <meta charset='utf-8' />
  <title>Cotización {escape(quote.quote_code)}</title>
  <style>
    body {{ font-family: Arial, sans-serif; color:#111827; margin:28px; }}
    table {{ width:100%; border-collapse:collapse; margin-top:18px; }}
    th, td {{ border-bottom:1px solid #E5E7EB; padding:10px 8px; font-size:14px; }}
    th {{ text-align:left; color:#6B7280; background:#F9FAFB; }}
  </style>
</head>
<body>
  <h1>Cotización {escape(quote.quote_code)}</h1>
  <div><strong>{escape(business.name or 'Negocio')}</strong></div>
  <div style='margin-top:10px'><strong>Cliente:</strong> {escape(quote.customer.name if quote.customer else 'Cliente ocasional')}</div>
  <div><strong>Emisión:</strong> {escape(quote.issue_date.isoformat() if quote.issue_date else '')}</div>
  <div><strong>Vencimiento:</strong> {escape(quote.expiry_date.isoformat() if quote.expiry_date else '')}</div>
  <div><strong>Estado:</strong> {escape(quote.status or '')}</div>
  <table><thead><tr><th>Descripción</th><th style='text-align:right'>Cant.</th><th style='text-align:right'>Precio</th><th style='text-align:right'>Total</th></tr></thead><tbody>{rows}</tbody></table>
  <div style='margin-top:18px'><strong>Subtotal:</strong> {escape(str(_round(quote.subtotal or 0)))}</div>
  <div><strong>Descuento:</strong> {escape(str(_round(quote.discount or 0)))}</div>
  <div><strong>Total:</strong> {escape(str(_round(quote.total or 0)))}</div>
  <div style='margin-top:18px'><strong>Notas:</strong> {escape(quote.notes or '')}</div>
  <div><strong>Términos:</strong> {escape(quote.terms or '')}</div>
</body>
</html>
"""

    def _pdf_response(html, filename):
        if not HAS_XHTML2PDF:
            return jsonify({"error": "La generación PDF no está disponible en este entorno"}), 503
        stream = BytesIO()
        result = pisa.CreatePDF(html, dest=stream, encoding="utf-8")
        if result.err:
            return jsonify({"error": "No fue posible generar el PDF"}), 500
        stream.seek(0)
        return send_file(stream, mimetype="application/pdf", as_attachment=True, download_name=filename)

    @app.route("/api/businesses/<int:business_id>/quotes", methods=["GET"])
    @token_required
    @module_required("quotes")
    @permission_required("quotes.view")
    def commercial_quotes_list(business_id):
        query = Quote.query.options(joinedload(Quote.customer), joinedload(Quote.items)).filter(Quote.business_id == business_id)
        status = str(request.args.get("status") or "").strip().lower()
        search = str(request.args.get("search") or "").strip().lower()
        customer_id = request.args.get("customer_id", type=int)
        start_date = _parse_date(request.args.get("start_date"))
        end_date = _parse_date(request.args.get("end_date"))
        if customer_id:
            query = query.filter(Quote.customer_id == customer_id)
        if start_date:
            query = query.filter(Quote.issue_date >= start_date)
        if end_date:
            query = query.filter(Quote.issue_date <= end_date)
        quotes = []
        for quote in query.order_by(Quote.issue_date.desc(), Quote.id.desc()).all():
            payload = quote.to_dict()
            if status and status != "all" and str(payload.get("status") or "").lower() != status:
                continue
            if search:
                haystack = " ".join([str(payload.get("quote_code") or ""), str(payload.get("customer_name") or ""), str(payload.get("notes") or "")]).lower()
                if search not in haystack:
                    continue
            quotes.append(payload)
        return jsonify({"quotes": quotes})

    @app.route("/api/businesses/<int:business_id>/quotes/<int:quote_id>", methods=["GET"])
    @token_required
    @module_required("quotes")
    @permission_required("quotes.view")
    def commercial_quotes_get(business_id, quote_id):
        quote = Quote.query.options(joinedload(Quote.customer), joinedload(Quote.items)).filter_by(id=quote_id, business_id=business_id).first()
        if not quote:
            return jsonify({"error": "Cotización no encontrada"}), 404
        return jsonify({"quote": quote.to_dict()})

    @app.route("/api/businesses/<int:business_id>/quotes", methods=["POST"])
    @token_required
    @module_required("quotes")
    @permission_required("quotes.create")
    def commercial_quotes_create(business_id):
        data = request.get_json() or {}
        try:
            items, subtotal = _normalize_items(data.get("items"), business_id)
            discount = _round(data.get("discount") or 0)
            if discount < 0 or discount - subtotal > 0.01:
                return jsonify({"error": "El descuento no puede superar el subtotal"}), 400
            total = _round(subtotal - discount)
            customer_id = data.get("customer_id")
            if customer_id not in (None, "") and not Customer.query.filter_by(id=int(customer_id), business_id=business_id).first():
                return jsonify({"error": "Cliente no encontrado"}), 404
            quote = Quote(business_id=business_id, customer_id=int(customer_id) if customer_id not in (None, "") else None, quote_code=_next_quote_code(business_id), status=str(data.get("status") or "draft").lower(), issue_date=_parse_date(data.get("issue_date"), default=date.today()), expiry_date=_parse_date(data.get("expiry_date")), subtotal=subtotal, discount=discount, total=total, notes=_text(data.get("notes")), terms=_text(data.get("terms")), created_by=getattr(g.current_user, "id", None))
            if quote.status not in QUOTE_STATUSES:
                quote.status = "draft"
            _assign_quote_items(quote, items)
            db.session.add(quote)
            db.session.commit()
            return jsonify({"quote": quote.to_dict()}), 201
        except ValueError as exc:
            db.session.rollback()
            return jsonify({"error": str(exc)}), 400

    @app.route("/api/businesses/<int:business_id>/quotes/<int:quote_id>", methods=["PUT"])
    @token_required
    @module_required("quotes")
    @permission_required("quotes.edit")
    def commercial_quotes_update(business_id, quote_id):
        quote = Quote.query.options(joinedload(Quote.items)).filter_by(id=quote_id, business_id=business_id).first()
        if not quote:
            return jsonify({"error": "Cotización no encontrada"}), 404
        if quote.converted_sale_id:
            return jsonify({"error": "La cotización ya fue convertida y no puede editarse"}), 400
        data = request.get_json() or {}
        try:
            items, subtotal = _normalize_items(data.get("items"), business_id)
            discount = _round(data.get("discount") or 0)
            if discount < 0 or discount - subtotal > 0.01:
                return jsonify({"error": "El descuento no puede superar el subtotal"}), 400
            customer_id = data.get("customer_id")
            if customer_id not in (None, "") and not Customer.query.filter_by(id=int(customer_id), business_id=business_id).first():
                return jsonify({"error": "Cliente no encontrado"}), 404
            quote.customer_id = int(customer_id) if customer_id not in (None, "") else None
            quote.status = str(data.get("status") or quote.status or "draft").lower()
            if quote.status not in QUOTE_STATUSES:
                quote.status = "draft"
            quote.issue_date = _parse_date(data.get("issue_date"), default=quote.issue_date or date.today())
            quote.expiry_date = _parse_date(data.get("expiry_date"), default=quote.expiry_date)
            quote.subtotal = subtotal
            quote.discount = discount
            quote.total = _round(subtotal - discount)
            quote.notes = _text(data.get("notes"))
            quote.terms = _text(data.get("terms"))
            _assign_quote_items(quote, items)
            db.session.commit()
            return jsonify({"quote": quote.to_dict()})
        except ValueError as exc:
            db.session.rollback()
            return jsonify({"error": str(exc)}), 400

    @app.route("/api/businesses/<int:business_id>/quotes/<int:quote_id>", methods=["DELETE"])
    @token_required
    @module_required("quotes")
    @permission_required("quotes.delete")
    def commercial_quotes_delete(business_id, quote_id):
        quote = Quote.query.filter_by(id=quote_id, business_id=business_id).first()
        if not quote:
            return jsonify({"error": "Cotización no encontrada"}), 404
        if quote.converted_sale_id:
            return jsonify({"error": "No puedes eliminar una cotización ya convertida"}), 400
        db.session.delete(quote)
        db.session.commit()
        return jsonify({"ok": True})

    @app.route("/api/businesses/<int:business_id>/quotes/<int:quote_id>/status", methods=["POST"])
    @token_required
    @module_required("quotes")
    @permission_required("quotes.edit")
    def commercial_quotes_status(business_id, quote_id):
        quote = Quote.query.filter_by(id=quote_id, business_id=business_id).first()
        if not quote:
            return jsonify({"error": "Cotización no encontrada"}), 404
        status = str((request.get_json() or {}).get("status") or "").lower().strip()
        if status not in QUOTE_STATUSES:
            return jsonify({"error": "Estado inválido"}), 400
        if quote.converted_sale_id and status != "converted":
            return jsonify({"error": "La cotización ya fue convertida"}), 400
        quote.status = status
        db.session.commit()
        return jsonify({"quote": quote.to_dict()})

    @app.route("/api/businesses/<int:business_id>/quotes/<int:quote_id>/convert-to-sale", methods=["POST"])
    @token_required
    @module_required("quotes")
    @permission_required("quotes.convert_to_sale")
    def commercial_quotes_convert_to_sale(business_id, quote_id):
        business = Business.query.get(business_id)
        quote = Quote.query.options(joinedload(Quote.items), joinedload(Quote.customer)).filter_by(id=quote_id, business_id=business_id).first()
        if not business:
            return jsonify({"error": "Negocio no encontrado"}), 404
        if not quote:
            return jsonify({"error": "Cotización no encontrada"}), 404
        if quote.converted_sale_id:
            sale = Sale.query.get(quote.converted_sale_id)
            return jsonify({"quote": quote.to_dict(), "sale": sale.to_dict() if sale else None})
        data = request.get_json() or {}
        sale_date = _parse_date(data.get("sale_date"), default=date.today())
        paid_amount = data.get("amount_paid")
        if paid_amount is None:
            paid_amount = quote.total if bool(data.get("paid", True)) else 0
        paid_amount = float(paid_amount or 0)
        if paid_amount < 0 or paid_amount - float(quote.total or 0) > 0.01:
            return jsonify({"error": "El monto pagado es inválido"}), 400
        balance = _round(max(float(quote.total or 0) - paid_amount, 0))
        if balance > 0.01 and not quote.customer_id:
            return jsonify({"error": "Las ventas a crédito o parciales requieren cliente"}), 400
        if balance > 0.01 and not _module_enabled(business, "accounts_receivable"):
            return jsonify({"error": "El módulo accounts_receivable no está habilitado para este negocio"}), 400
        items = []
        for item in quote.items:
            items.append({"product_id": item.product_id, "name": item.description, "quantity": item.quantity, "qty": item.quantity, "unit_price": _round(item.unit_price), "price": _round(item.unit_price), "total": _round(item.subtotal), "fulfillment_mode": item.fulfillment_mode})
        current_user = g.current_user
        note_tag = f"Desde cotización {quote.quote_code} (ID {quote.id})"
        extra_note = _text(data.get("note"))
        if extra_note:
            note_tag = f"{note_tag} - {extra_note}"
        treasury_account_id = data.get("treasury_account_id")
        if treasury_account_id not in (None, ""):
            try:
                treasury_account_id = int(treasury_account_id)
            except (TypeError, ValueError):
                return jsonify({"error": "La cuenta de caja seleccionada no es valida"}), 400
            if not TreasuryAccount.query.filter_by(id=treasury_account_id, business_id=business_id).first():
                return jsonify({"error": "La cuenta de caja seleccionada no existe"}), 400
        else:
            treasury_account_id = None
        role_snapshot = "Sistema"
        sale = Sale(business_id=business_id, customer_id=quote.customer_id, user_id=getattr(current_user, "id", None), sale_date=sale_date, items=items, subtotal=_round(quote.subtotal or 0), discount=_round(quote.discount or 0), total=_round(quote.total or 0), balance=balance, collected_amount=_round(paid_amount), total_cost=0, treasury_account_id=treasury_account_id if paid_amount > 0.01 else None, payment_method=str(data.get("payment_method") or "cash"), paid=balance <= 0.01, note=note_tag, created_by_name=getattr(current_user, "name", None) or "Sistema", created_by_role=role_snapshot, updated_by_user_id=getattr(current_user, "id", None))
        db.session.add(sale)
        db.session.flush()
        sale.total_cost = apply_sale_inventory_effects(
            business=business,
            sale=sale,
            items=items,
            actor_user=current_user,
            role_snapshot=role_snapshot,
            raw_material_consumption_mode="quote_conversion",
        )
        payment = None
        if paid_amount > 0.01 and quote.customer_id:
            payment = Payment(business_id=business_id, customer_id=quote.customer_id, sale_id=sale.id, payment_date=sale_date, amount=_round(paid_amount), method=sale.payment_method, treasury_account_id=treasury_account_id, note=note_tag, created_by_user_id=getattr(current_user, "id", None), created_by_name=getattr(current_user, "name", None) or "Sistema", created_by_role="Sistema", updated_by_user_id=getattr(current_user, "id", None))
            db.session.add(payment)
            db.session.flush()
        if quote.customer_id:
            create_sale_financial_entries(
                sale=sale,
                payment=payment,
                payment_note=f"Abono inicial Venta #{sale.id}" if payment is not None else None,
            )
        quote.status = "converted"
        quote.converted_sale_id = sale.id
        quote.converted_at = datetime.utcnow()
        refresh_summary_materialized_days(business_id, sale.sale_date)
        db.session.commit()
        return jsonify({"quote": quote.to_dict(), "sale": sale.to_dict()})

    @app.route("/api/businesses/<int:business_id>/quotes/<int:quote_id>/print", methods=["GET"])
    @token_required
    @module_required("quotes")
    @permission_required("quotes.view")
    def commercial_quotes_print(business_id, quote_id):
        business = Business.query.get(business_id)
        quote = Quote.query.options(joinedload(Quote.customer), joinedload(Quote.items)).filter_by(id=quote_id, business_id=business_id).first()
        if not business or not quote:
            return jsonify({"error": "Cotización no encontrada"}), 404
        return _quote_html(quote, business), 200, {"Content-Type": "text/html; charset=utf-8"}

    @app.route("/api/businesses/<int:business_id>/quotes/<int:quote_id>/pdf", methods=["GET"])
    @token_required
    @module_required("quotes")
    @permission_required("quotes.view")
    def commercial_quotes_pdf(business_id, quote_id):
        business = Business.query.get(business_id)
        quote = Quote.query.options(joinedload(Quote.customer), joinedload(Quote.items)).filter_by(id=quote_id, business_id=business_id).first()
        if not business or not quote:
            return jsonify({"error": "Cotización no encontrada"}), 404
        return _pdf_response(_quote_html(quote, business), f"quote-{quote.quote_code}.pdf")
