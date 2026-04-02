from __future__ import annotations

from datetime import date, datetime, time
from html import escape
from io import BytesIO

from flask import g, jsonify, request, send_file
from sqlalchemy.orm import joinedload

from backend.database import db
from backend.models import (
    Business,
    Customer,
    Invoice,
    InvoiceItem,
    InvoicePayment,
    InvoiceSettings,
    LedgerEntry,
    Order,
    Payment,
    Product,
    Quote,
    QuoteItem,
    Sale,
    SalesGoal,
    TreasuryAccount,
)
from backend.services.reports.report_service import ReportExportService

try:
    from xhtml2pdf import pisa

    HAS_XHTML2PDF = True
except Exception:
    pisa = None
    HAS_XHTML2PDF = False


QUOTE_ALLOWED_STATUSES = {"draft", "sent", "approved", "rejected", "expired", "converted"}
INVOICE_ALLOWED_BASE_STATUSES = {"draft", "sent", "cancelled"}
ORDER_ALLOWED_STATUSES = {"pending", "in_progress", "completed", "cancelled"}


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


def _normalize_text(value):
    normalized = str(value or "").strip()
    return normalized or None


def _safe_round(value, digits=2):
    return round(float(value or 0), digits)


def _currency_label(value, currency="COP"):
    return f"{currency} {_safe_round(value):,.2f}"


def _as_html_response(html: str):
    return html, 200, {"Content-Type": "text/html; charset=utf-8"}


def _html_to_pdf_response(html: str, filename: str):
    if not HAS_XHTML2PDF:
        return jsonify({"error": "La generación PDF no está disponible en este entorno"}), 503
    pdf_stream = BytesIO()
    result = pisa.CreatePDF(html, dest=pdf_stream, encoding="utf-8")
    if result.err:
        return jsonify({"error": "No fue posible generar el PDF"}), 500
    pdf_stream.seek(0)
    return send_file(
        pdf_stream,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename,
    )


def _build_document_html(*, title: str, business: Business, number_label: str, customer_name: str, customer_meta: list[str], meta_rows: list[tuple[str, str]], items: list[dict], totals: list[tuple[str, float]], notes: str | None = None, terms: str | None = None, footer_text: str | None = None, brand_color: str = "#2563EB", accent_color: str = "#0F172A", logo_url: str | None = None):
    item_rows = "".join(
        f"<tr><td>{escape(str(item.get('description') or ''))}</td><td style='text-align:right'>{escape(str(item.get('quantity_label') or item.get('quantity') or ''))}</td><td style='text-align:right'>{escape(str(item.get('unit_price_label') or ''))}</td><td style='text-align:right'>{escape(str(item.get('line_total_label') or ''))}</td></tr>"
        for item in items
    )
    meta_html = "".join(
        f"<div style='margin-bottom:6px'><strong>{escape(label)}:</strong> {escape(value)}</div>"
        for label, value in meta_rows
        if value not in (None, "")
    )
    totals_html = "".join(
        f"<div style='display:flex;justify-content:space-between;margin-bottom:6px'><span>{escape(label)}</span><strong>{escape(_currency_label(value, business.currency or 'COP'))}</strong></div>"
        for label, value in totals
    )
    customer_meta_html = "".join(f"<div>{escape(line)}</div>" for line in customer_meta if line)
    logo_html = f"<img src='{escape(logo_url)}' alt='Logo' style='max-height:56px;max-width:180px;object-fit:contain' />" if logo_url else ""
    notes_html = f"<div style='margin-top:20px'><h3 style='margin:0 0 8px;color:{escape(accent_color)}'>Notas</h3><div>{escape(notes).replace(chr(10), '<br/>')}</div></div>" if notes else ""
    terms_html = f"<div style='margin-top:16px'><h3 style='margin:0 0 8px;color:{escape(accent_color)}'>Términos</h3><div>{escape(terms).replace(chr(10), '<br/>')}</div></div>" if terms else ""
    footer_html = footer_text or f"Documento generado desde {business.name}"
    return f"""
<!DOCTYPE html>
<html lang='es'>
<head>
  <meta charset='utf-8' />
  <title>{escape(title)} {escape(number_label)}</title>
  <style>
    body {{ font-family: Arial, sans-serif; color: #111827; margin: 28px; }}
    .header {{ display:flex; justify-content:space-between; align-items:flex-start; gap:24px; border-bottom:3px solid {escape(brand_color)}; padding-bottom:16px; }}
    .badge {{ display:inline-block; padding:6px 10px; border-radius:999px; background:{escape(brand_color)}; color:#fff; font-size:12px; font-weight:bold; }}
    table {{ width:100%; border-collapse:collapse; margin-top:18px; }}
    th, td {{ border-bottom:1px solid #E5E7EB; padding:10px 8px; font-size:14px; }}
    th {{ text-align:left; color:#6B7280; background:#F9FAFB; }}
    .grid {{ display:grid; grid-template-columns: 1.2fr 1fr; gap:24px; margin-top:20px; }}
    .card {{ border:1px solid #E5E7EB; border-radius:16px; padding:16px; }}
    .footer {{ margin-top:24px; font-size:12px; color:#6B7280; border-top:1px solid #E5E7EB; padding-top:12px; }}
  </style>
</head>
<body>
  <div class='header'>
    <div>
      <div style='display:flex;align-items:center;gap:16px'>{logo_html}<div><h1 style='margin:0;color:{escape(accent_color)}'>{escape(title)}</h1><div style='margin-top:8px' class='badge'>{escape(number_label)}</div></div></div>
      <div style='margin-top:14px'><strong>{escape(business.name or 'Negocio')}</strong></div>
    </div>
    <div style='min-width:260px'>{meta_html}</div>
  </div>
  <div class='grid'>
    <div class='card'>
      <h3 style='margin:0 0 10px;color:{escape(accent_color)}'>Cliente</h3>
      <div style='font-weight:bold'>{escape(customer_name or 'Cliente ocasional')}</div>
      <div style='margin-top:6px;color:#4B5563'>{customer_meta_html}</div>
    </div>
    <div class='card'>
      <h3 style='margin:0 0 10px;color:{escape(accent_color)}'>Resumen</h3>
      {totals_html}
    </div>
  </div>
  <table>
    <thead>
      <tr><th>Descripción</th><th style='text-align:right'>Cant.</th><th style='text-align:right'>Precio</th><th style='text-align:right'>Total</th></tr>
    </thead>
    <tbody>{item_rows}</tbody>
  </table>
  {notes_html}
  {terms_html}
  <div class='footer'>{escape(footer_html)}</div>
</body>
</html>
"""


def _next_number(existing_values: list[str], prefix: str, digits: int = 6):
    max_sequence = 0
    prefix_token = f"{prefix}-"
    for raw_value in existing_values:
        value = str(raw_value or "").strip()
        if not value.startswith(prefix_token):
            continue
        suffix = value[len(prefix_token):]
        if suffix.isdigit():
            max_sequence = max(max_sequence, int(suffix))
    return f"{prefix}-{max_sequence + 1:0{digits}d}"


def _next_quote_code(business_id: int):
    existing = [value for (value,) in db.session.query(Quote.quote_code).filter(Quote.business_id == business_id).all()]
    return _next_number(existing, "COT")


def _next_invoice_number(business_id: int, prefix: str):
    existing = [value for (value,) in db.session.query(Invoice.invoice_number).filter(Invoice.business_id == business_id).all()]
    return _next_number(existing, prefix or "INV")


def _next_order_number(business_id: int):
    prefix = f"ORD-{business_id}"
    existing = [value for (value,) in db.session.query(Order.order_number).filter(Order.order_number.like(f"{prefix}-%")).all()]
    return _next_number(existing, prefix, digits=5)


def _ensure_invoice_settings(business_id: int):
    settings = InvoiceSettings.query.filter_by(business_id=business_id).first()
    if settings:
        return settings
    settings = InvoiceSettings(
        business_id=business_id,
        prefix="INV",
        brand_color="#2563EB",
        accent_color="#0F172A",
        footer_text="Gracias por tu confianza.",
        default_notes="Gracias por elegirnos.",
        default_terms="Pago según fecha de vencimiento.",
    )
    db.session.add(settings)
    db.session.flush()
    return settings


def _normalize_order_items(items_payload, business_id: int):
    if not isinstance(items_payload, list) or len(items_payload) == 0:
        raise ValueError("Debes agregar al menos un item al pedido")
    normalized = []
    subtotal = 0.0
    for index, raw_item in enumerate(items_payload):
        product_id = raw_item.get("product_id")
        product = None
        if product_id not in (None, ""):
            product = Product.query.filter_by(id=int(product_id), business_id=business_id).first()
            if not product:
                raise ValueError(f"Producto inválido en la línea {index + 1}")
        quantity = float(raw_item.get("quantity") if raw_item.get("quantity") is not None else raw_item.get("qty") or 0)
        unit_price = float(raw_item.get("unit_price") if raw_item.get("unit_price") is not None else raw_item.get("price") or 0)
        if quantity <= 0:
            raise ValueError(f"La cantidad del item {index + 1} debe ser mayor a 0")
        if unit_price < 0:
            raise ValueError(f"El precio del item {index + 1} no puede ser negativo")
        name = _normalize_text(raw_item.get("name") or (product.name if product else None))
        if not name:
            raise ValueError(f"El item {index + 1} necesita nombre")
        total = _safe_round(raw_item.get("total") if raw_item.get("total") is not None else quantity * unit_price)
        subtotal = _safe_round(subtotal + total)
        normalized.append({
            "product_id": int(product_id) if product_id not in (None, "") else None,
            "name": name,
            "quantity": quantity,
            "qty": quantity,
            "unit_price": _safe_round(unit_price),
            "price": _safe_round(unit_price),
            "total": total,
        })
    return normalized, subtotal


def _build_order_payload(order: Order):
    items = []
    for raw_item in order.items or []:
        quantity = float(raw_item.get("quantity") if raw_item.get("quantity") is not None else raw_item.get("qty") or 0)
        unit_price = float(raw_item.get("unit_price") if raw_item.get("unit_price") is not None else raw_item.get("price") or 0)
        items.append({
            "product_id": raw_item.get("product_id"),
            "name": raw_item.get("name") or "Producto",
            "quantity": quantity,
            "qty": quantity,
            "unit_price": _safe_round(unit_price),
            "price": _safe_round(unit_price),
            "total": _safe_round(raw_item.get("total") if raw_item.get("total") is not None else quantity * unit_price),
        })
    payload = order.to_dict()
    payload["items"] = items
    payload["note"] = order.notes
    payload["notes"] = order.notes
    return payload


def _find_sale_from_order(order: Order):
    note_tag = f"Desde pedido {order.order_number} (ID {order.id})"
    return Sale.query.filter(Sale.business_id == order.business_id, Sale.note.like(f"%{note_tag}%")).first()


def _build_sale_from_line_items(*, business_id: int, customer_id: int | None, items: list[dict], subtotal: float, discount: float, total: float, sale_date: date, payment_method: str, paid_amount: float, note_tag: str, current_user, get_current_role_snapshot, accounts_receivable_enabled: bool, treasury_account_id: int | None = None):
    if paid_amount < 0:
        raise ValueError("El monto pagado no puede ser negativo")
    if paid_amount - total > 0.01:
        raise ValueError("El monto pagado no puede superar el total")
    balance = _safe_round(max(total - paid_amount, 0))
    is_paid = balance <= 0.01
    if balance > 0.01 and not customer_id:
        raise ValueError("Las ventas a crédito o parciales requieren cliente")
    if balance > 0.01 and not accounts_receivable_enabled:
        raise ValueError("El módulo accounts_receivable no está habilitado para este negocio")

    total_cost = 0.0
    for item in items:
        product_id = item.get("product_id")
        quantity = float(item.get("quantity") if item.get("quantity") is not None else item.get("qty") or 0)
        if product_id:
            product = Product.query.filter_by(id=int(product_id), business_id=business_id).first()
            if product:
                if getattr(product, "type", "product") == "product":
                    product.stock = float(product.stock or 0) - quantity
                total_cost += float(product.cost or 0) * quantity

    user_id = getattr(current_user, "id", None)
    user_name = getattr(current_user, "name", None) or "Sistema"
    role_snapshot = get_current_role_snapshot(current_user, business_id) if current_user else "Sistema"

    sale = Sale(
        business_id=business_id,
        customer_id=customer_id,
        user_id=user_id,
        sale_date=sale_date,
        items=items,
        subtotal=_safe_round(subtotal),
        discount=_safe_round(discount),
        total=_safe_round(total),
        balance=balance,
        collected_amount=_safe_round(paid_amount),
        total_cost=_safe_round(total_cost),
        treasury_account_id=treasury_account_id if paid_amount > 0.01 else None,
        payment_method=payment_method or "cash",
        paid=is_paid,
        note=note_tag,
        created_by_name=user_name,
        created_by_role=role_snapshot,
        updated_by_user_id=user_id,
    )
    db.session.add(sale)
    db.session.flush()

    if balance > 0.01 and customer_id:
        charge = LedgerEntry(
            business_id=business_id,
            customer_id=customer_id,
            entry_type="charge",
            amount=_safe_round(total),
            entry_date=sale_date,
            note=f"Venta #{sale.id}",
            ref_type="sale",
            ref_id=sale.id,
        )
        db.session.add(charge)
        if paid_amount > 0.01:
            ledger_payment = LedgerEntry(
                business_id=business_id,
                customer_id=customer_id,
                entry_type="payment",
                amount=_safe_round(paid_amount),
                entry_date=sale_date,
                note=f"Abono inicial Venta #{sale.id}",
                ref_type="sale",
                ref_id=sale.id,
            )
            db.session.add(ledger_payment)

    if paid_amount > 0.01 and customer_id:
        payment = Payment(
            business_id=business_id,
            customer_id=customer_id,
            sale_id=sale.id,
            payment_date=sale_date,
            amount=_safe_round(paid_amount),
            method=payment_method or "cash",
            treasury_account_id=treasury_account_id,
            note=note_tag,
            created_by_user_id=user_id,
            created_by_name=user_name,
            created_by_role=role_snapshot,
            updated_by_user_id=user_id,
        )
        db.session.add(payment)

    return sale


def _normalize_quote_items(items_payload, business_id: int):
    if not isinstance(items_payload, list) or len(items_payload) == 0:
        raise ValueError("Debes agregar al menos un item a la cotización")
    normalized = []
    subtotal = 0.0
    for index, raw_item in enumerate(items_payload):
        product_id = raw_item.get("product_id")
        product = None
        if product_id not in (None, ""):
            product = Product.query.filter_by(id=int(product_id), business_id=business_id).first()
            if not product:
                raise ValueError(f"Producto inválido en la línea {index + 1}")
        quantity = float(raw_item.get("quantity") or 0)
        unit_price = float(raw_item.get("unit_price") or 0)
        if quantity <= 0:
            raise ValueError(f"La cantidad del item {index + 1} debe ser mayor a 0")
        if unit_price < 0:
            raise ValueError(f"El precio del item {index + 1} no puede ser negativo")
        description = _normalize_text(raw_item.get("description") or (product.name if product else None))
        if not description:
            raise ValueError(f"La descripción del item {index + 1} es obligatoria")
        line_subtotal = _safe_round(quantity * unit_price)
        subtotal = _safe_round(subtotal + line_subtotal)
        normalized.append({
            "product_id": int(product_id) if product_id not in (None, "") else None,
            "description": description,
            "quantity": quantity,
            "unit_price": _safe_round(unit_price),
            "subtotal": line_subtotal,
            "sort_order": int(raw_item.get("sort_order") if raw_item.get("sort_order") is not None else index),
        })
    return normalized, subtotal


def _build_quote_html(quote_payload: dict, business: Business):
    items = [
        {
            "description": item.get("description"),
            "quantity": item.get("quantity"),
            "quantity_label": str(item.get("quantity") or 0),
            "unit_price_label": _currency_label(item.get("unit_price") or 0, invoice_payload.get("currency") or business.currency or "COP"),
            "line_total_label": _currency_label(item.get("line_total") or 0, invoice_payload.get("currency") or business.currency or "COP"),
        }
        for item in invoice_payload.get("items") or []
    ]
    customer_meta = []
    if invoice_payload.get("customer_phone"):
        customer_meta.append(str(invoice_payload.get("customer_phone")))
    if invoice_payload.get("customer_address"):
        customer_meta.append(str(invoice_payload.get("customer_address")))
    return _build_document_html(
        title="Factura",
        business=business,
        number_label=invoice_payload.get("invoice_number") or "INV",
        customer_name=invoice_payload.get("customer_name") or "Cliente ocasional",
        customer_meta=customer_meta,
        meta_rows=[
            ("Emisión", str(invoice_payload.get("issue_date") or "")),
            ("Vence", str(invoice_payload.get("due_date") or "")),
            ("Estado", str(invoice_payload.get("status") or "")),
            ("Método", str(invoice_payload.get("payment_method") or "Por definir")),
        ],
        items=items,
        totals=[
            ("Subtotal", invoice_payload.get("subtotal") or 0),
            ("Descuento", invoice_payload.get("discount_total") or 0),
            ("Impuestos", invoice_payload.get("tax_total") or 0),
            ("Total", invoice_payload.get("total") or 0),
            ("Pagado", invoice_payload.get("amount_paid") or 0),
            ("Saldo", invoice_payload.get("outstanding_balance") or 0),
        ],
        notes=invoice_payload.get("notes") or settings.default_notes,
        terms=settings.default_terms,
        footer_text=settings.footer_text,
        brand_color=settings.brand_color,
        accent_color=settings.accent_color,
        logo_url=settings.logo_url,
    )


def _invoice_share_message(business: Business, invoice_payload: dict):
    return (
        f"Hola, te compartimos la factura {invoice_payload.get('invoice_number')} de {business.name}.\n"
        f"Total: {_currency_label(invoice_payload.get('total') or 0, invoice_payload.get('currency') or business.currency or 'COP')}\n"
        f"Vencimiento: {invoice_payload.get('due_date') or 'Sin fecha'}\n"
        f"Quedamos atentos a cualquier inquietud."
    )


def _invoice_reminder_message(business: Business, invoice_payload: dict):
    balance = _currency_label(invoice_payload.get("outstanding_balance") or 0, invoice_payload.get("currency") or business.currency or "COP")
    due_date = invoice_payload.get("due_date") or "sin fecha de vencimiento"
    return (
        f"Hola, te escribimos desde {business.name} para recordarte la factura {invoice_payload.get('invoice_number')}.\n"
        f"Saldo pendiente: {balance}.\n"
        f"Fecha de vencimiento: {due_date}.\n"
        f"Si ya realizaste el pago, por favor ignora este mensaje."
    )


def _statement_share_message(business: Business, statement: dict):
    summary = statement.get("summary") or {}
    customer = statement.get("customer") or {}
    return (
        f"Hola {customer.get('name') or ''}, te compartimos tu estado de cuenta con {business.name}.\n"
        f"Facturado: {_currency_label(summary.get('total_invoiced') or 0, business.currency or 'COP')}\n"
        f"Pagado: {_currency_label(summary.get('total_paid') or 0, business.currency or 'COP')}\n"
        f"Saldo pendiente: {_currency_label(summary.get('balance_due') or 0, business.currency or 'COP')}\n"
        f"Quedamos atentos para ayudarte con el seguimiento."
    )


def register_commercial_restore_routes(application, *, token_required, module_required, permission_required, has_permission, get_current_role_snapshot, refresh_summary_materialized_days):
    pass
