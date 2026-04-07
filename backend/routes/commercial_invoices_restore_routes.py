from __future__ import annotations

from datetime import date, datetime
from html import escape
from io import BytesIO

from flask import jsonify, request, send_file
from sqlalchemy.orm import joinedload

from backend.database import db
from backend.models import Business, Customer, Invoice, InvoiceItem, InvoicePayment, InvoiceSettings, TreasuryAccount

try:
    from xhtml2pdf import pisa
    HAS_XHTML2PDF = True
except Exception:
    pisa = None
    HAS_XHTML2PDF = False


INVOICE_BASE_STATUSES = {"draft", "sent", "cancelled"}


def register_commercial_invoices_restore_routes(app, *, token_required, module_required, commercial_section_required, permission_required):
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

    def _ensure_settings(business_id):
        settings = InvoiceSettings.query.filter_by(business_id=business_id).first()
        if settings:
            return settings
        settings = InvoiceSettings(business_id=business_id, prefix="INV", brand_color="#2563EB", accent_color="#0F172A", footer_text="Gracias por tu confianza.", default_notes="Gracias por elegirnos.", default_terms="Pago según fecha de vencimiento.")
        db.session.add(settings)
        db.session.flush()
        return settings

    def _next_invoice_number(business_id, prefix):
        token = f"{prefix}-"
        values = [value for (value,) in db.session.query(Invoice.invoice_number).filter(Invoice.business_id == business_id).all()]
        max_seq = 0
        for value in values:
            raw = str(value or "")
            if not raw.startswith(token):
                continue
            suffix = raw[len(token):]
            if suffix.isdigit():
                max_seq = max(max_seq, int(suffix))
        return f"{token}{max_seq + 1:06d}"

    def _normalize_items(items_payload, business_id):
        if not isinstance(items_payload, list) or not items_payload:
            raise ValueError("Debes agregar al menos un item a la factura")
        items = []
        subtotal = discount_total = tax_total = total = 0.0
        for index, raw in enumerate(items_payload):
            description = _text(raw.get("description"))
            quantity = float(raw.get("quantity") or 0)
            unit_price = float(raw.get("unit_price") or 0)
            discount = float(raw.get("discount") or 0)
            tax_rate = float(raw.get("tax_rate") or 0)
            if not description or quantity <= 0 or unit_price < 0 or discount < 0 or tax_rate < 0:
                raise ValueError(f"Valores inválidos en el item {index + 1}")
            line_subtotal = _round(quantity * unit_price)
            if discount - line_subtotal > 0.01:
                raise ValueError(f"El descuento del item {index + 1} no puede superar el subtotal")
            taxable = _round(max(line_subtotal - discount, 0))
            tax_amount = _round(taxable * (tax_rate / 100))
            line_total = _round(taxable + tax_amount)
            subtotal = _round(subtotal + line_subtotal)
            discount_total = _round(discount_total + discount)
            tax_total = _round(tax_total + tax_amount)
            total = _round(total + line_total)
            items.append({"product_id": raw.get("product_id"), "description": description, "quantity": quantity, "unit_price": _round(unit_price), "discount": _round(discount), "tax_rate": _round(tax_rate), "line_total": line_total, "sort_order": int(raw.get("sort_order") if raw.get("sort_order") is not None else index)})
        return items, {"subtotal": subtotal, "discount_total": discount_total, "tax_total": tax_total, "total": total}

    def _assign_items(invoice, items):
        invoice.items = [InvoiceItem(product_id=item.get("product_id"), description=item["description"], quantity=item["quantity"], unit_price=item["unit_price"], discount=item["discount"], tax_rate=item["tax_rate"], line_total=item["line_total"], sort_order=item["sort_order"]) for item in items]

    def _invoice_query(business_id):
        return Invoice.query.options(joinedload(Invoice.customer), joinedload(Invoice.items), joinedload(Invoice.payments)).filter(Invoice.business_id == business_id)

    def _editable(invoice):
        if invoice.status == "cancelled":
            raise ValueError("La factura cancelada no puede editarse")
        if _round(sum(float(getattr(payment, "signed_amount", payment.amount or 0) or 0) for payment in (invoice.payments or []))) > 0.01:
            raise ValueError("La factura tiene pagos registrados y ya no puede editarse")

    def _serialize_receivable(payload):
        due_date = _parse_date(payload.get("due_date"))
        today = date.today()
        days_until_due = (due_date - today).days if due_date else None
        status = str(payload.get("status") or "draft").lower()
        return {"invoice_id": int(payload.get("id")), "business_id": int(payload.get("business_id")), "customer_id": payload.get("customer_id"), "customer_name": payload.get("customer_name") or "Cliente ocasional", "customer_phone": payload.get("customer_phone"), "invoice_number": payload.get("invoice_number"), "issue_date": payload.get("issue_date"), "due_date": payload.get("due_date"), "currency": payload.get("currency") or "COP", "total": _round(payload.get("total") or 0), "paid_amount": _round(payload.get("amount_paid") or 0), "gross_collected_amount": _round(payload.get("gross_collected_amount") or 0), "refunded_amount": _round(payload.get("refunded_amount") or 0), "reversed_amount": _round(payload.get("reversed_amount") or 0), "balance_due": _round(payload.get("outstanding_balance") or 0), "status": status, "status_base": str(payload.get("status_base") or payload.get("status") or "draft").lower(), "is_overdue": bool(payload.get("is_overdue")), "days_overdue": abs(min(days_until_due or 0, 0)) if status == "overdue" and days_until_due is not None else 0, "days_until_due": days_until_due, "payment_method": payload.get("payment_method"), "notes": payload.get("notes"), "can_collect": str(payload.get("status_base") or payload.get("status") or "draft").lower() != "draft" and status not in {"paid", "cancelled"} and float(payload.get("outstanding_balance") or 0) > 0.01}

    def _receivables_overview(payloads, status=None, search=None, customer_id=None, start_date=None, end_date=None):
        items = []
        needle = str(search or "").strip().lower()
        for payload in payloads:
            row = _serialize_receivable(payload)
            if customer_id and row.get("customer_id") != customer_id:
                continue
            issue_date = str(row.get("issue_date") or "")
            if start_date and issue_date and issue_date < start_date:
                continue
            if end_date and issue_date and issue_date > end_date:
                continue
            if needle:
                haystack = " ".join([str(row.get("invoice_number") or ""), str(row.get("customer_name") or ""), str(row.get("notes") or "")]).lower()
                if needle not in haystack:
                    continue
            normalized_status = str(status or "all").lower()
            if normalized_status == "all":
                if row.get("status_base") == "draft":
                    continue
            elif normalized_status == "unpaid":
                if not (row.get("status_base") != "draft" and float(row.get("paid_amount") or 0) <= 0.01 and float(row.get("balance_due") or 0) > 0.01 and row.get("status") == "sent"):
                    continue
            elif row.get("status") != normalized_status:
                continue
            items.append(row)
        items.sort(key=lambda item: (0 if item.get("status") == "overdue" else 1 if item.get("status") == "partial" else 2 if item.get("status") == "sent" else 3, str(item.get("due_date") or ""), str(item.get("invoice_number") or "")))
        summary = {"total_outstanding": 0.0, "overdue_total": 0.0, "due_today_total": 0.0, "due_soon_total": 0.0, "current_total": 0.0, "invoiced_total": 0.0, "amount_collected_in_range": 0.0, "gross_collected_in_range": 0.0, "refunded_total_in_range": 0.0, "reversed_total_in_range": 0.0, "collection_rate": 0.0, "average_days_to_collect": None, "customer_count": 0, "unpaid_invoice_count": 0, "overdue_invoice_count": 0, "partial_invoice_count": 0, "total_invoice_count": 0}
        customers_map = {}
        for item in items:
            balance = float(item.get("balance_due") or 0)
            if item.get("status") != "cancelled" and balance > 0.01:
                summary["total_outstanding"] = _round(summary["total_outstanding"] + balance)
                summary["unpaid_invoice_count"] += 1
                if item.get("days_until_due") == 0:
                    summary["due_today_total"] = _round(summary["due_today_total"] + balance)
                elif item.get("days_until_due") is not None and 0 < int(item.get("days_until_due")) <= 5:
                    summary["due_soon_total"] = _round(summary["due_soon_total"] + balance)
                elif int(item.get("days_overdue") or 0) <= 0:
                    summary["current_total"] = _round(summary["current_total"] + balance)
            if item.get("status") == "overdue":
                summary["overdue_total"] = _round(summary["overdue_total"] + balance)
                summary["overdue_invoice_count"] += 1
            if item.get("status") == "partial":
                summary["partial_invoice_count"] += 1
            if item.get("status_base") not in {"draft", "cancelled"}:
                summary["invoiced_total"] = _round(summary["invoiced_total"] + float(item.get("total") or 0))
            summary["amount_collected_in_range"] = _round(summary["amount_collected_in_range"] + float(item.get("paid_amount") or 0))
            summary["gross_collected_in_range"] = _round(summary["gross_collected_in_range"] + float(item.get("gross_collected_amount") or 0))
            summary["refunded_total_in_range"] = _round(summary["refunded_total_in_range"] + float(item.get("refunded_amount") or 0))
            summary["reversed_total_in_range"] = _round(summary["reversed_total_in_range"] + float(item.get("reversed_amount") or 0))
            summary["total_invoice_count"] += 1
            if item.get("customer_id") and item.get("status") != "cancelled" and balance > 0.01:
                current = customers_map.get(item["customer_id"]) or {"customer_id": item["customer_id"], "customer_name": item.get("customer_name") or "Cliente ocasional", "customer_phone": item.get("customer_phone"), "total_balance": 0.0, "overdue_balance": 0.0, "due_soon_balance": 0.0, "due_today_balance": 0.0, "current_balance": 0.0, "invoice_count": 0, "nearest_due_date": None, "max_days_overdue": 0, "status": "current", "status_label": "Al día"}
                current["total_balance"] = _round(current["total_balance"] + balance)
                current["invoice_count"] += 1
                current["max_days_overdue"] = max(int(current["max_days_overdue"]), int(item.get("days_overdue") or 0))
                if item.get("due_date") and (not current["nearest_due_date"] or item.get("due_date") < current["nearest_due_date"]):
                    current["nearest_due_date"] = item.get("due_date")
                if item.get("status") == "overdue":
                    current["overdue_balance"] = _round(current["overdue_balance"] + balance)
                elif item.get("days_until_due") == 0:
                    current["due_today_balance"] = _round(current["due_today_balance"] + balance)
                elif item.get("days_until_due") is not None and 0 < int(item.get("days_until_due")) <= 5:
                    current["due_soon_balance"] = _round(current["due_soon_balance"] + balance)
                else:
                    current["current_balance"] = _round(current["current_balance"] + balance)
                customers_map[item["customer_id"]] = current
        customers = []
        for customer in customers_map.values():
            if customer["overdue_balance"] > 0:
                customer["status"] = "overdue"; customer["status_label"] = "Vencida"
            elif customer["due_today_balance"] > 0:
                customer["status"] = "due_today"; customer["status_label"] = "Vence hoy"
            elif customer["due_soon_balance"] > 0:
                customer["status"] = "due_soon"; customer["status_label"] = "Por vencer"
            customers.append(customer)
        customers.sort(key=lambda item: (-float(item.get("total_balance") or 0), str(item.get("customer_name") or "")))
        summary["customer_count"] = len(customers)
        summary["collection_rate"] = _round((summary["amount_collected_in_range"] / summary["invoiced_total"] * 100) if summary["invoiced_total"] > 0 else 0)
        return {"summary": summary, "customers": customers, "receivables": items}

    def _statement(payloads, customer, start_date=None, end_date=None):
        invoices = []
        payments = []
        summary = {"invoice_count": 0, "open_count": 0, "overdue_count": 0, "cancelled_count": 0, "total_invoiced": 0.0, "total_paid": 0.0, "payments_received": 0.0, "gross_payments_received": 0.0, "refunded_total": 0.0, "reversed_total": 0.0, "payment_count": 0, "balance_due": 0.0, "overdue_total": 0.0}
        for payload in payloads:
            if payload.get("customer_id") != customer.id:
                continue
            issue_date = str(payload.get("issue_date") or "")
            if start_date and issue_date and issue_date < start_date:
                continue
            if end_date and issue_date and issue_date > end_date:
                continue
            row = _serialize_receivable(payload)
            invoices.append(row)
            if row.get("status_base") != "draft":
                summary["invoice_count"] += 1
            if row.get("status") == "cancelled":
                summary["cancelled_count"] += 1
            else:
                summary["total_invoiced"] = _round(summary["total_invoiced"] + float(row.get("total") or 0))
                summary["total_paid"] = _round(summary["total_paid"] + float(row.get("paid_amount") or 0))
                summary["balance_due"] = _round(summary["balance_due"] + float(row.get("balance_due") or 0))
                if float(row.get("balance_due") or 0) > 0.01 and row.get("status") != "paid":
                    summary["open_count"] += 1
                if row.get("status") == "overdue":
                    summary["overdue_count"] += 1
                    summary["overdue_total"] = _round(summary["overdue_total"] + float(row.get("balance_due") or 0))
            for payment in payload.get("payments") or []:
                payment_date = str(payment.get("payment_date") or "")
                if start_date and payment_date and payment_date < start_date:
                    continue
                if end_date and payment_date and payment_date > end_date:
                    continue
                entry = dict(payment)
                entry["invoice_number"] = payload.get("invoice_number")
                entry["invoice_id"] = payload.get("id")
                payments.append(entry)
                amount = float(entry.get("amount") or 0)
                signed_amount = float(entry.get("signed_amount") if entry.get("signed_amount") is not None else amount)
                summary["payments_received"] = _round(summary["payments_received"] + signed_amount)
                if entry.get("event_type") == "payment":
                    summary["gross_payments_received"] = _round(summary["gross_payments_received"] + amount)
                elif entry.get("event_type") == "refund":
                    summary["refunded_total"] = _round(summary["refunded_total"] + amount)
                elif entry.get("event_type") == "reversal":
                    summary["reversed_total"] = _round(summary["reversed_total"] + amount)
        payments.sort(key=lambda item: (str(item.get("payment_date") or ""), int(item.get("id") or 0)), reverse=True)
        summary["payment_count"] = len(payments)
        invoices.sort(key=lambda item: (str(item.get("issue_date") or ""), int(item.get("invoice_id") or 0)), reverse=True)
        return {"business_id": customer.business_id, "customer": customer.to_dict(), "summary": summary, "invoices": invoices, "payments": payments, "date_range": {"start_date": start_date, "end_date": end_date}}

    def _html_invoice(invoice, business, settings):
        rows = "".join(f"<tr><td>{escape(str(item.description or ''))}</td><td style='text-align:right'>{escape(str(item.quantity or 0))}</td><td style='text-align:right'>{escape(str(item.unit_price or 0))}</td><td style='text-align:right'>{escape(str(item.line_total or 0))}</td></tr>" for item in invoice.items)
        return f"""
<!DOCTYPE html><html lang='es'><head><meta charset='utf-8' /><title>Factura {escape(invoice.invoice_number)}</title><style>body{{font-family:Arial,sans-serif;color:#111827;margin:28px}} table{{width:100%;border-collapse:collapse;margin-top:18px}} th,td{{border-bottom:1px solid #E5E7EB;padding:10px 8px;font-size:14px}} th{{text-align:left;color:#6B7280;background:#F9FAFB}}</style></head><body><h1>Factura {escape(invoice.invoice_number)}</h1><div><strong>{escape(business.name or 'Negocio')}</strong></div><div style='margin-top:10px'><strong>Cliente:</strong> {escape(invoice.customer.name if invoice.customer else 'Cliente ocasional')}</div><div><strong>Emisión:</strong> {escape(invoice.issue_date.isoformat() if invoice.issue_date else '')}</div><div><strong>Vence:</strong> {escape(invoice.due_date.isoformat() if invoice.due_date else '')}</div><div><strong>Estado:</strong> {escape(invoice.to_dict().get('status') or '')}</div><table><thead><tr><th>Descripción</th><th style='text-align:right'>Cant.</th><th style='text-align:right'>Precio</th><th style='text-align:right'>Total</th></tr></thead><tbody>{rows}</tbody></table><div style='margin-top:18px'><strong>Total:</strong> {escape(str(_round(invoice.total or 0)))}</div><div><strong>Pagado:</strong> {escape(str(_round(invoice.to_dict().get('amount_paid') or 0)))}</div><div><strong>Saldo:</strong> {escape(str(_round(invoice.to_dict().get('outstanding_balance') or 0)))}</div><div style='margin-top:18px'><strong>Notas:</strong> {escape(invoice.notes or settings.default_notes or '')}</div></body></html>
"""

    def _html_statement(business, statement):
        invoices_html = "".join(f"<tr><td>{escape(str(item.get('invoice_number') or ''))}</td><td>{escape(str(item.get('issue_date') or ''))}</td><td>{escape(str(item.get('due_date') or ''))}</td><td style='text-align:right'>{escape(str(item.get('total') or 0))}</td><td style='text-align:right'>{escape(str(item.get('paid_amount') or 0))}</td><td style='text-align:right'>{escape(str(item.get('balance_due') or 0))}</td></tr>" for item in statement.get('invoices') or [])
        payments_html = "".join(f"<tr><td>{escape(str(item.get('payment_date') or ''))}</td><td>{escape(str(item.get('invoice_number') or ''))}</td><td>{escape(str(item.get('event_type') or 'payment'))}</td><td style='text-align:right'>{escape(str(item.get('signed_amount') if item.get('signed_amount') is not None else item.get('amount') or 0))}</td></tr>" for item in statement.get('payments') or [])
        customer = statement.get('customer') or {}
        return f"""
<!DOCTYPE html><html lang='es'><head><meta charset='utf-8' /><title>Estado de cuenta</title><style>body{{font-family:Arial,sans-serif;color:#111827;margin:28px}} table{{width:100%;border-collapse:collapse;margin-top:18px}} th,td{{border-bottom:1px solid #E5E7EB;padding:10px 8px;font-size:14px}} th{{text-align:left;color:#6B7280;background:#F9FAFB}}</style></head><body><h1>Estado de cuenta</h1><div><strong>{escape(business.name or 'Negocio')}</strong></div><div style='margin-top:10px'><strong>Cliente:</strong> {escape(str(customer.get('name') or 'Cliente'))}</div><h2>Facturas</h2><table><thead><tr><th>Factura</th><th>Emisión</th><th>Vence</th><th style='text-align:right'>Total</th><th style='text-align:right'>Pagado</th><th style='text-align:right'>Saldo</th></tr></thead><tbody>{invoices_html}</tbody></table><h2 style='margin-top:18px'>Pagos</h2><table><thead><tr><th>Fecha</th><th>Factura</th><th>Evento</th><th style='text-align:right'>Monto</th></tr></thead><tbody>{payments_html}</tbody></table></body></html>
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

    @app.route("/api/businesses/<int:business_id>/invoice-settings", methods=["GET"])
    @token_required
    @module_required("sales")
    @commercial_section_required("invoices")
    @permission_required("invoices.view")
    def commercial_invoices_settings_get(business_id):
        settings = _ensure_settings(business_id)
        return jsonify({"settings": settings.to_dict()})

    @app.route("/api/businesses/<int:business_id>/invoice-settings", methods=["PUT"])
    @token_required
    @module_required("sales")
    @commercial_section_required("invoices")
    @permission_required("invoices.edit")
    def commercial_invoices_settings_put(business_id):
        settings = _ensure_settings(business_id)
        data = request.get_json() or {}
        for field in ["prefix", "logo_url", "brand_color", "accent_color", "footer_text", "default_notes", "default_terms"]:
            if field in data:
                setattr(settings, field, _text(data.get(field)) if field in {"logo_url", "footer_text", "default_notes", "default_terms"} else (data.get(field) or getattr(settings, field)))
        settings.prefix = settings.prefix or "INV"
        db.session.commit()
        return jsonify({"settings": settings.to_dict()})

    @app.route("/api/businesses/<int:business_id>/invoices", methods=["GET"])
    @token_required
    @module_required("sales")
    @commercial_section_required("invoices")
    @permission_required("invoices.view")
    def commercial_invoices_list(business_id):
        status = str(request.args.get("status") or "").strip().lower()
        search = str(request.args.get("search") or "").strip().lower()
        customer_id = request.args.get("customer_id", type=int)
        start_date = _parse_date(request.args.get("start_date"))
        end_date = _parse_date(request.args.get("end_date"))
        invoices = []
        for invoice in _invoice_query(business_id).order_by(Invoice.issue_date.desc(), Invoice.id.desc()).all():
            payload = invoice.to_dict()
            if customer_id and payload.get("customer_id") != customer_id:
                continue
            if start_date and _parse_date(payload.get("issue_date")) and _parse_date(payload.get("issue_date")) < start_date:
                continue
            if end_date and _parse_date(payload.get("issue_date")) and _parse_date(payload.get("issue_date")) > end_date:
                continue
            if status and status != "all" and str(payload.get("status") or "").lower() != status:
                continue
            if search:
                haystack = " ".join([str(payload.get("invoice_number") or ""), str(payload.get("customer_name") or ""), str(payload.get("notes") or "")]).lower()
                if search not in haystack:
                    continue
            invoices.append(payload)
        return jsonify({"invoices": invoices})

    @app.route("/api/businesses/<int:business_id>/invoices/<int:invoice_id>", methods=["GET"])
    @token_required
    @module_required("sales")
    @commercial_section_required("invoices")
    @permission_required("invoices.view")
    def commercial_invoices_get(business_id, invoice_id):
        invoice = _invoice_query(business_id).filter(Invoice.id == invoice_id).first()
        if not invoice:
            return jsonify({"error": "Factura no encontrada"}), 404
        return jsonify({"invoice": invoice.to_dict()})

    @app.route("/api/businesses/<int:business_id>/invoices", methods=["POST"])
    @token_required
    @module_required("sales")
    @commercial_section_required("invoices")
    @permission_required("invoices.create")
    def commercial_invoices_create(business_id):
        settings = _ensure_settings(business_id)
        data = request.get_json() or {}
        try:
            items, totals = _normalize_items(data.get("items"), business_id)
            customer_id = data.get("customer_id")
            if customer_id not in (None, "") and not Customer.query.filter_by(id=int(customer_id), business_id=business_id).first():
                return jsonify({"error": "Cliente no encontrado"}), 404
            invoice = Invoice(business_id=business_id, customer_id=int(customer_id) if customer_id not in (None, "") else None, invoice_number=_next_invoice_number(business_id, settings.prefix or "INV"), status=str(data.get("status") or "draft").lower(), issue_date=_parse_date(data.get("issue_date"), default=date.today()), due_date=_parse_date(data.get("due_date")), currency=str(data.get("currency") or "COP"), subtotal=totals["subtotal"], discount_total=totals["discount_total"], tax_total=totals["tax_total"], total=totals["total"], notes=_text(data.get("notes")), payment_method=_text(data.get("payment_method")), created_by=None)
            if invoice.status not in INVOICE_BASE_STATUSES:
                invoice.status = "draft"
            if invoice.status == "sent":
                invoice.sent_at = datetime.utcnow()
            _assign_items(invoice, items)
            db.session.add(invoice)
            db.session.commit()
            return jsonify({"invoice": invoice.to_dict()}), 201
        except ValueError as exc:
            db.session.rollback()
            return jsonify({"error": str(exc)}), 400

    @app.route("/api/businesses/<int:business_id>/invoices/<int:invoice_id>", methods=["PUT"])
    @token_required
    @module_required("sales")
    @commercial_section_required("invoices")
    @permission_required("invoices.edit")
    def commercial_invoices_update(business_id, invoice_id):
        invoice = _invoice_query(business_id).filter(Invoice.id == invoice_id).first()
        if not invoice:
            return jsonify({"error": "Factura no encontrada"}), 404
        data = request.get_json() or {}
        try:
            _editable(invoice)
            items, totals = _normalize_items(data.get("items"), business_id)
            customer_id = data.get("customer_id")
            if customer_id not in (None, "") and not Customer.query.filter_by(id=int(customer_id), business_id=business_id).first():
                return jsonify({"error": "Cliente no encontrado"}), 404
            invoice.customer_id = int(customer_id) if customer_id not in (None, "") else None
            invoice.status = str(data.get("status") or invoice.status or "draft").lower()
            if invoice.status not in INVOICE_BASE_STATUSES:
                invoice.status = "draft"
            invoice.issue_date = _parse_date(data.get("issue_date"), default=invoice.issue_date or date.today())
            invoice.due_date = _parse_date(data.get("due_date"), default=invoice.due_date)
            invoice.currency = str(data.get("currency") or invoice.currency or "COP")
            invoice.subtotal = totals["subtotal"]
            invoice.discount_total = totals["discount_total"]
            invoice.tax_total = totals["tax_total"]
            invoice.total = totals["total"]
            invoice.notes = _text(data.get("notes"))
            invoice.payment_method = _text(data.get("payment_method"))
            if invoice.status == "sent" and not invoice.sent_at:
                invoice.sent_at = datetime.utcnow()
            _assign_items(invoice, items)
            db.session.commit()
            return jsonify({"invoice": invoice.to_dict()})
        except ValueError as exc:
            db.session.rollback()
            return jsonify({"error": str(exc)}), 400

    @app.route("/api/businesses/<int:business_id>/invoices/<int:invoice_id>/duplicate", methods=["POST"])
    @token_required
    @module_required("sales")
    @commercial_section_required("invoices")
    @permission_required("invoices.create")
    def commercial_invoices_duplicate(business_id, invoice_id):
        settings = _ensure_settings(business_id)
        source = _invoice_query(business_id).filter(Invoice.id == invoice_id).first()
        if not source:
            return jsonify({"error": "Factura no encontrada"}), 404
        invoice = Invoice(business_id=business_id, customer_id=source.customer_id, invoice_number=_next_invoice_number(business_id, settings.prefix or "INV"), status="draft", issue_date=date.today(), due_date=source.due_date, currency=source.currency, subtotal=source.subtotal, discount_total=source.discount_total, tax_total=source.tax_total, total=source.total, notes=source.notes, payment_method=source.payment_method, created_by=None)
        _assign_items(invoice, [{"product_id": item.product_id, "description": item.description, "quantity": item.quantity, "unit_price": item.unit_price, "discount": item.discount, "tax_rate": item.tax_rate, "line_total": item.line_total, "sort_order": item.sort_order or 0} for item in source.items])
        db.session.add(invoice)
        db.session.commit()
        return jsonify({"invoice": invoice.to_dict()}), 201

    @app.route("/api/businesses/<int:business_id>/invoices/<int:invoice_id>/status", methods=["POST"])
    @token_required
    @module_required("sales")
    @commercial_section_required("invoices")
    @permission_required("invoices.edit")
    def commercial_invoices_status(business_id, invoice_id):
        invoice = _invoice_query(business_id).filter(Invoice.id == invoice_id).first()
        if not invoice:
            return jsonify({"error": "Factura no encontrada"}), 404
        status = str((request.get_json() or {}).get("status") or "").strip().lower()
        if status not in INVOICE_BASE_STATUSES:
            return jsonify({"error": "Estado inválido"}), 400
        if status == "cancelled" and _round(sum(float(getattr(payment, "signed_amount", payment.amount or 0) or 0) for payment in (invoice.payments or []))) > 0.01:
            return jsonify({"error": "No puedes cancelar una factura con pagos registrados"}), 400
        invoice.status = status
        if status == "sent" and not invoice.sent_at:
            invoice.sent_at = datetime.utcnow()
        if status == "cancelled":
            invoice.cancelled_at = datetime.utcnow()
        else:
            invoice.cancelled_at = None
        db.session.commit()
        return jsonify({"invoice": invoice.to_dict()})

    @app.route("/api/businesses/<int:business_id>/invoices/<int:invoice_id>/payments", methods=["POST"])
    @token_required
    @module_required("sales")
    @commercial_section_required("invoices")
    @permission_required("receivables.collect")
    def commercial_invoices_payment_create(business_id, invoice_id):
        invoice = _invoice_query(business_id).filter(Invoice.id == invoice_id).first()
        if not invoice:
            return jsonify({"error": "Factura no encontrada"}), 404
        if invoice.status == "draft":
            return jsonify({"error": "No puedes registrar pagos en una factura en borrador"}), 400
        if invoice.status == "cancelled":
            return jsonify({"error": "No puedes registrar pagos en una factura cancelada"}), 400
        data = request.get_json() or {}
        payload = invoice.to_dict()
        outstanding = float(payload.get("outstanding_balance") or 0)
        amount = float(data.get("amount") or outstanding)
        if amount <= 0 or amount - outstanding > 0.01:
            return jsonify({"error": "Monto inválido para el pago"}), 400
        treasury_account_id = data.get("treasury_account_id")
        if treasury_account_id not in (None, "") and not TreasuryAccount.query.filter_by(id=int(treasury_account_id), business_id=business_id).first():
            return jsonify({"error": "Cuenta de tesorería no encontrada"}), 404
        payment = InvoicePayment(invoice_id=invoice.id, amount=_round(amount), payment_date=_parse_date(data.get("payment_date"), default=date.today()), payment_method=_text(data.get("payment_method")) or invoice.payment_method or "cash", treasury_account_id=int(treasury_account_id) if treasury_account_id not in (None, "") else None, event_type="payment", note=_text(data.get("note")), created_by=None)
        db.session.add(payment)
        db.session.flush()
        refreshed = _invoice_query(business_id).filter(Invoice.id == invoice_id).first()
        refreshed_payload = refreshed.to_dict()
        if float(refreshed_payload.get("outstanding_balance") or 0) <= 0.01:
            refreshed.paid_at = datetime.utcnow()
        if not refreshed.sent_at and refreshed.status == "sent":
            refreshed.sent_at = datetime.utcnow()
        db.session.commit()
        return jsonify({"invoice": refreshed.to_dict(), "payment": payment.to_dict()}), 201

    def _create_payment_adjustment(business_id, invoice_id, payment_id, action):
        invoice = _invoice_query(business_id).filter(Invoice.id == invoice_id).first()
        if not invoice:
            return jsonify({"error": "Factura no encontrada"}), 404
        if action not in {"refund", "reverse"}:
            return jsonify({"error": "Acción inválida"}), 400
        source = InvoicePayment.query.filter_by(id=payment_id, invoice_id=invoice_id).first()
        if not source or str(source.event_type or "payment") != "payment":
            return jsonify({"error": "Pago base no encontrado"}), 404
        already_adjusted = _round(sum(float(adjustment.amount or 0) for adjustment in (source.adjustments or [])))
        available = _round(max(float(source.amount or 0) - already_adjusted, 0))
        data = request.get_json() or {}
        amount = float(data.get("amount") or available)
        if amount <= 0 or amount - available > 0.01:
            return jsonify({"error": "Monto inválido para el ajuste"}), 400
        treasury_account_id = data.get("treasury_account_id")
        if treasury_account_id not in (None, "") and not TreasuryAccount.query.filter_by(id=int(treasury_account_id), business_id=business_id).first():
            return jsonify({"error": "Cuenta de tesorería no encontrada"}), 404
        event_type = "reversal" if action == "reverse" else "refund"
        payment = InvoicePayment(invoice_id=invoice_id, amount=_round(amount), payment_date=_parse_date(data.get("payment_date"), default=date.today()), payment_method=_text(data.get("payment_method")) or source.payment_method, treasury_account_id=int(treasury_account_id) if treasury_account_id not in (None, "") else None, event_type=event_type, source_payment_id=source.id, note=_text(data.get("note")), created_by=None)
        db.session.add(payment)
        db.session.commit()
        refreshed = _invoice_query(business_id).filter(Invoice.id == invoice_id).first()
        return jsonify({"invoice": refreshed.to_dict(), "payment": payment.to_dict()}), 201

    @app.route("/api/businesses/<int:business_id>/invoices/<int:invoice_id>/payments/<int:payment_id>/reverse", methods=["POST"])
    @token_required
    @module_required("sales")
    @commercial_section_required("invoices")
    @permission_required("receivables.collect")
    def commercial_invoices_payment_reverse(business_id, invoice_id, payment_id):
        return _create_payment_adjustment(business_id, invoice_id, payment_id, "reverse")

    @app.route("/api/businesses/<int:business_id>/invoices/<int:invoice_id>/payments/<int:payment_id>/refund", methods=["POST"])
    @token_required
    @module_required("sales")
    @commercial_section_required("invoices")
    @permission_required("receivables.collect")
    def commercial_invoices_payment_refund(business_id, invoice_id, payment_id):
        return _create_payment_adjustment(business_id, invoice_id, payment_id, "refund")

    @app.route("/api/businesses/<int:business_id>/invoices/<int:invoice_id>/print", methods=["GET"])
    @token_required
    @module_required("sales")
    @commercial_section_required("invoices")
    @permission_required("invoices.view")
    def commercial_invoices_print(business_id, invoice_id):
        business = Business.query.get(business_id)
        invoice = _invoice_query(business_id).filter(Invoice.id == invoice_id).first()
        if not business or not invoice:
            return jsonify({"error": "Factura no encontrada"}), 404
        settings = _ensure_settings(business_id)
        return _html_invoice(invoice, business, settings), 200, {"Content-Type": "text/html; charset=utf-8"}

    @app.route("/api/businesses/<int:business_id>/invoices/<int:invoice_id>/pdf", methods=["GET"])
    @token_required
    @module_required("sales")
    @commercial_section_required("invoices")
    @permission_required("invoices.view")
    def commercial_invoices_pdf(business_id, invoice_id):
        business = Business.query.get(business_id)
        invoice = _invoice_query(business_id).filter(Invoice.id == invoice_id).first()
        if not business or not invoice:
            return jsonify({"error": "Factura no encontrada"}), 404
        settings = _ensure_settings(business_id)
        return _pdf_response(_html_invoice(invoice, business, settings), f"invoice-{invoice.invoice_number}.pdf")

    @app.route("/api/businesses/<int:business_id>/invoices/<int:invoice_id>/share/whatsapp", methods=["GET"])
    @token_required
    @module_required("sales")
    @commercial_section_required("invoices")
    @permission_required("invoices.view")
    def commercial_invoices_share_whatsapp(business_id, invoice_id):
        business = Business.query.get(business_id)
        invoice = _invoice_query(business_id).filter(Invoice.id == invoice_id).first()
        if not business or not invoice:
            return jsonify({"error": "Factura no encontrada"}), 404
        payload = invoice.to_dict()
        message = f"Hola, te compartimos la factura {payload.get('invoice_number')} de {business.name}.\nTotal: {payload.get('currency')} {payload.get('total')}\nVencimiento: {payload.get('due_date') or 'Sin fecha'}"
        return jsonify({"message": message, "phone": payload.get("customer_phone")})

    @app.route("/api/businesses/<int:business_id>/invoices/<int:invoice_id>/share/reminder", methods=["GET"])
    @token_required
    @module_required("sales")
    @commercial_section_required("invoices")
    @permission_required("receivables.view")
    def commercial_invoices_share_reminder(business_id, invoice_id):
        invoice = _invoice_query(business_id).filter(Invoice.id == invoice_id).first()
        if not invoice:
            return jsonify({"error": "Factura no encontrada"}), 404
        receivable = _serialize_receivable(invoice.to_dict())
        message = f"Hola, te recordamos la factura {receivable.get('invoice_number')}.\nSaldo pendiente: {receivable.get('currency')} {receivable.get('balance_due')}\nVencimiento: {receivable.get('due_date') or 'Sin fecha'}"
        return jsonify({"message": message, "phone": receivable.get("customer_phone"), "invoice": receivable})

    @app.route("/api/businesses/<int:business_id>/invoice-receivables", methods=["GET"])
    @token_required
    @module_required("sales")
    @commercial_section_required("invoices")
    @permission_required("receivables.view")
    def commercial_invoice_receivables(business_id):
        payloads = [invoice.to_dict() for invoice in _invoice_query(business_id).order_by(Invoice.issue_date.desc(), Invoice.id.desc()).all()]
        return jsonify(_receivables_overview(payloads, status=request.args.get("status"), search=request.args.get("search"), customer_id=request.args.get("customer_id", type=int), start_date=request.args.get("start_date"), end_date=request.args.get("end_date")))

    @app.route("/api/businesses/<int:business_id>/invoice-receivables/customers/<int:customer_id>/statement", methods=["GET"])
    @token_required
    @module_required("sales")
    @commercial_section_required("invoices")
    @permission_required("receivables.view")
    def commercial_invoice_receivables_statement(business_id, customer_id):
        customer = Customer.query.filter_by(id=customer_id, business_id=business_id).first()
        if not customer:
            return jsonify({"error": "Cliente no encontrado"}), 404
        payloads = [invoice.to_dict() for invoice in _invoice_query(business_id).order_by(Invoice.issue_date.desc(), Invoice.id.desc()).all()]
        return jsonify(_statement(payloads, customer, request.args.get("start_date"), request.args.get("end_date")))

    @app.route("/api/businesses/<int:business_id>/invoice-receivables/customers/<int:customer_id>/statement/print", methods=["GET"])
    @token_required
    @module_required("sales")
    @commercial_section_required("invoices")
    @permission_required("receivables.view")
    def commercial_invoice_receivables_statement_print(business_id, customer_id):
        business = Business.query.get(business_id)
        customer = Customer.query.filter_by(id=customer_id, business_id=business_id).first()
        if not business or not customer:
            return jsonify({"error": "Cliente no encontrado"}), 404
        payloads = [invoice.to_dict() for invoice in _invoice_query(business_id).order_by(Invoice.issue_date.desc(), Invoice.id.desc()).all()]
        statement = _statement(payloads, customer, request.args.get("start_date"), request.args.get("end_date"))
        return _html_statement(business, statement), 200, {"Content-Type": "text/html; charset=utf-8"}

    @app.route("/api/businesses/<int:business_id>/invoice-receivables/customers/<int:customer_id>/statement/share/whatsapp", methods=["GET"])
    @token_required
    @module_required("sales")
    @commercial_section_required("invoices")
    @permission_required("receivables.view")
    def commercial_invoice_receivables_statement_share(business_id, customer_id):
        business = Business.query.get(business_id)
        customer = Customer.query.filter_by(id=customer_id, business_id=business_id).first()
        if not business or not customer:
            return jsonify({"error": "Cliente no encontrado"}), 404
        payloads = [invoice.to_dict() for invoice in _invoice_query(business_id).order_by(Invoice.issue_date.desc(), Invoice.id.desc()).all()]
        statement = _statement(payloads, customer, request.args.get("start_date"), request.args.get("end_date"))
        message = f"Hola {customer.name or ''}, te compartimos tu estado de cuenta con {business.name}.\nFacturado: {statement['summary']['total_invoiced']}\nPagado: {statement['summary']['total_paid']}\nSaldo pendiente: {statement['summary']['balance_due']}"
        return jsonify({"message": message, "phone": customer.phone, "statement": statement})
