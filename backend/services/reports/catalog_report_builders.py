from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import joinedload

from backend.database import db
from backend.models import Customer, Payment, Product, ProductMovement, Sale

from .excel_utils import (
    add_generated_footer,
    apply_freeze_filter,
    autosize_columns,
    configure_print,
    prepare_standard_layout,
    write_empty_state,
)


def _customer_status_tone(value: str) -> str:
    normalized = str(value or "").strip().lower()
    if normalized in {"vencido", "deuda"}:
        return "danger"
    if normalized in {"por vencer", "vence hoy"}:
        return "warning"
    if normalized in {"a favor", "al día", "sin saldo"}:
        return "success"
    return "info"


def _inventory_tone(value: str) -> str:
    normalized = str(value or "").strip().lower()
    if normalized == "agotado":
        return "danger"
    if normalized == "bajo":
        return "warning"
    return "success"


def _aging_bucket(reference_date, due_date):
    if not due_date or due_date >= reference_date:
        return "Al día"
    days_overdue = (reference_date - due_date).days
    if days_overdue <= 30:
        return "1-30 días"
    if days_overdue <= 60:
        return "31-60 días"
    if days_overdue <= 90:
        return "61-90 días"
    return "+90 días"


def _aging_tone(bucket: str) -> str:
    if bucket == "+90 días":
        return "danger"
    if bucket in {"31-60 días", "61-90 días", "1-30 días"}:
        return "warning"
    return "success"


def build_general_business_report(service, start_date=None, end_date=None):
    sales_dataset = service.get_sales_dataset(start_date, end_date)
    expenses_dataset = service.classify_expenses(start_date, end_date)
    payments_dataset = service.get_payments_dataset(start_date, end_date)
    receivables_snapshot = service.build_receivables_snapshot(reference_date=end_date or date.today())
    currency_fmt = service.styles.number_formats["currency"]
    date_fmt = service.styles.number_formats["date"]
    integer_fmt = service.styles.number_formats["integer"]

    sales_query = Sale.query.options(joinedload(Sale.customer)).filter(Sale.business_id == service.business_id)
    if start_date:
        sales_query = sales_query.filter(Sale.sale_date >= start_date)
    if end_date:
        sales_query = sales_query.filter(Sale.sale_date <= end_date)
    sales = sales_query.order_by(Sale.sale_date.desc(), Sale.id.desc()).all()

    daily_map = {}
    product_map = {}
    customer_map = {}
    for sale in sales:
        sale_key = sale.sale_date
        daily_map.setdefault(sale_key, {"sales_total": 0.0, "sales_count": 0, "collected": 0.0, "pending": 0.0})
        daily_map[sale_key]["sales_total"] += float(sale.total or 0)
        daily_map[sale_key]["sales_count"] += 1
        daily_map[sale_key]["collected"] += float(sale.collected_amount or 0)
        daily_map[sale_key]["pending"] += float(sale.balance or 0)

        customer_name = sale.customer.name if sale.customer and sale.customer.name else "Cliente casual"
        customer_bucket = customer_map.setdefault(customer_name, {"sales_count": 0, "total": 0.0, "pending": 0.0, "last_sale": None})
        customer_bucket["sales_count"] += 1
        customer_bucket["total"] += float(sale.total or 0)
        customer_bucket["pending"] += float(sale.balance or 0)
        customer_bucket["last_sale"] = max(customer_bucket["last_sale"], sale.sale_date) if customer_bucket["last_sale"] else sale.sale_date

        for item in sale.items or []:
            if not isinstance(item, dict):
                continue
            name = item.get("name") or f"Producto {item.get('product_id') or '-'}"
            bucket = product_map.setdefault(name, {"quantity": 0.0, "total": 0.0, "sales_count": 0})
            bucket["quantity"] += float(item.get("qty") or 0)
            bucket["total"] += float(item.get("total") or 0)
            bucket["sales_count"] += 1

    expense_by_date = {}
    for row in expenses_dataset["rows"]:
        expense_key = row["date"]
        expense_by_date[expense_key] = expense_by_date.get(expense_key, 0.0) + float(row["amount"] or 0)

    summary_ws = service.create_sheet("Resumen", tab_color="1D4ED8")
    summary_headers = ["Indicador", "Valor", "Lectura"]
    summary_header_row = prepare_standard_layout(
        summary_ws,
        service.styles,
        title="Reporte general del negocio",
        subtitle=f"Generado con nuevo motor OpenPyXL para el período {service.period_label(start_date, end_date)}",
        filters=service.build_filter_rows(start_date, end_date),
        kpis=[
            {"label": "Ventas", "value": sales_dataset["summary"]["sales_total"], "number_format": currency_fmt},
            {"label": "Cobrado", "value": sales_dataset["summary"]["sales_collected"], "number_format": currency_fmt},
            {"label": "Gastos", "value": expenses_dataset["summary"]["expenses_total"], "number_format": currency_fmt},
            {"label": "Cobros", "value": payments_dataset["summary"]["payments_total"], "number_format": currency_fmt},
            {"label": "Por cobrar", "value": receivables_snapshot["summary"]["total_pending"], "number_format": currency_fmt},
        ],
        table_title="Lectura ejecutiva",
        headers=summary_headers,
    )
    row = summary_header_row + 1
    net_result = round(float(sales_dataset["summary"]["sales_total"] or 0) - float(expenses_dataset["summary"]["expenses_total"] or 0), 2)
    summary_rows = [
        ("Ventas registradas", sales_dataset["summary"]["sales_count"], "Cantidad de ventas del período", integer_fmt),
        ("Ticket promedio", sales_dataset["summary"]["average_ticket"], "Promedio por venta", currency_fmt),
        ("Gasto programado / pendiente", expenses_dataset["summary"]["scheduled_or_pending_total"], "Compromisos pendientes o programados", currency_fmt),
        ("Clientes con saldo", receivables_snapshot["summary"]["customers_with_balance"], "Clientes con cartera abierta", integer_fmt),
        ("Resultado bruto ventas-gastos", net_result, "Ventas del período menos gastos del período", currency_fmt),
    ]
    for label, value, note, number_format in summary_rows:
        summary_ws.append([label, value, note])
        service.styles.apply_named(summary_ws.cell(row=row, column=1), "body")
        service.styles.apply_named(summary_ws.cell(row=row, column=2), "body", number_format=number_format)
        service.styles.apply_named(summary_ws.cell(row=row, column=3), "body")
        row += 1
    apply_freeze_filter(summary_ws, summary_header_row, len(summary_headers))
    configure_print(summary_ws, repeat_header_row=summary_header_row)
    autosize_columns(summary_ws, fixed_widths={"A": 30, "B": 18, "C": 46})
    add_generated_footer(summary_ws, service.styles, len(summary_headers), service.business.name)

    detail_ws = service.create_sheet("Detalle", tab_color="2563EB")
    detail_headers = ["Fecha", "Ventas", "# ventas", "Cobrado", "Saldo pendiente", "Gastos", "Resultado" ]
    detail_header_row = prepare_standard_layout(
        detail_ws,
        service.styles,
        title="Detalle diario del negocio",
        subtitle="Vista consolidada por día para validar operación real",
        filters=service.build_filter_rows(start_date, end_date),
        kpis=[
            {"label": "Ventas", "value": sales_dataset["summary"]["sales_total"], "number_format": currency_fmt},
            {"label": "Gastos", "value": expenses_dataset["summary"]["expenses_total"], "number_format": currency_fmt},
            {"label": "Cobros", "value": payments_dataset["summary"]["payments_total"], "number_format": currency_fmt},
        ],
        table_title="Detalle diario",
        headers=detail_headers,
    )
    row = detail_header_row + 1
    ordered_days = sorted(set(list(daily_map.keys()) + list(expense_by_date.keys())), reverse=True)
    if not ordered_days:
        write_empty_state(detail_ws, row, "No hay información operativa en el período seleccionado.", len(detail_headers), service.styles)
    else:
        for day in ordered_days:
            sales_info = daily_map.get(day, {"sales_total": 0.0, "sales_count": 0, "collected": 0.0, "pending": 0.0})
            expenses_total = round(float(expense_by_date.get(day, 0.0) or 0.0), 2)
            result = round(float(sales_info["sales_total"] or 0) - expenses_total, 2)
            detail_ws.append([
                day,
                round(float(sales_info["sales_total"] or 0), 2),
                int(sales_info["sales_count"] or 0),
                round(float(sales_info["collected"] or 0), 2),
                round(float(sales_info["pending"] or 0), 2),
                expenses_total,
                result,
            ])
            service.styles.apply_named(detail_ws.cell(row=row, column=1), "body", number_format=date_fmt)
            service.styles.apply_named(detail_ws.cell(row=row, column=2), "body", number_format=currency_fmt)
            service.styles.apply_named(detail_ws.cell(row=row, column=3), "body_center", number_format=integer_fmt)
            service.styles.apply_named(detail_ws.cell(row=row, column=4), "body", number_format=currency_fmt)
            service.styles.apply_named(detail_ws.cell(row=row, column=5), "body", number_format=currency_fmt)
            service.styles.apply_named(detail_ws.cell(row=row, column=6), "body", number_format=currency_fmt)
            service.styles.apply_named(detail_ws.cell(row=row, column=7), "body", number_format=currency_fmt)
            row += 1
    apply_freeze_filter(detail_ws, detail_header_row, len(detail_headers))
    configure_print(detail_ws, repeat_header_row=detail_header_row)
    autosize_columns(detail_ws, fixed_widths={"A": 13, "B": 16, "C": 10, "D": 16, "E": 16, "F": 14, "G": 16})
    add_generated_footer(detail_ws, service.styles, len(detail_headers), service.business.name)

    support_ws = service.create_sheet("Soporte", tab_color="60A5FA")
    support_headers = ["Tipo", "Nombre / referencia", "Dato principal", "Dato secundario", "Dato terciario"]
    support_header_row = prepare_standard_layout(
        support_ws,
        service.styles,
        title="Soporte general del negocio",
        subtitle="Top clientes y productos del período para trazabilidad rápida",
        filters=service.build_filter_rows(start_date, end_date),
        kpis=[
            {"label": "Clientes activos", "value": len(customer_map), "number_format": integer_fmt},
            {"label": "Productos movidos", "value": len(product_map), "number_format": integer_fmt},
            {"label": "Cartera abierta", "value": receivables_snapshot["summary"]["open_count"], "number_format": integer_fmt},
        ],
        table_title="Top clientes y productos",
        headers=support_headers,
    )
    row = support_header_row + 1
    combined_rows = []
    for customer_name, data in sorted(customer_map.items(), key=lambda item: item[1]["total"], reverse=True)[:10]:
        combined_rows.append(["Cliente", customer_name, round(data["total"], 2), int(data["sales_count"]), round(data["pending"], 2)])
    for product_name, data in sorted(product_map.items(), key=lambda item: item[1]["total"], reverse=True)[:10]:
        combined_rows.append(["Producto", product_name, round(data["total"], 2), round(data["quantity"], 2), int(data["sales_count"] or 0)])
    if not combined_rows:
        write_empty_state(support_ws, row, "No hay soporte adicional para el período seleccionado.", len(support_headers), service.styles)
    else:
        for item in combined_rows:
            support_ws.append(item)
            service.styles.apply_named(support_ws.cell(row=row, column=1), "body_center")
            service.styles.apply_named(support_ws.cell(row=row, column=2), "body")
            service.styles.apply_named(support_ws.cell(row=row, column=3), "body", number_format=currency_fmt)
            service.styles.apply_named(support_ws.cell(row=row, column=4), "body_center")
            service.styles.apply_named(support_ws.cell(row=row, column=5), "body", number_format=currency_fmt if item[0] == "Cliente" else integer_fmt)
            row += 1
    apply_freeze_filter(support_ws, support_header_row, len(support_headers))
    configure_print(support_ws, repeat_header_row=support_header_row)
    autosize_columns(support_ws, fixed_widths={"A": 12, "B": 28, "C": 16, "D": 16, "E": 16})
    add_generated_footer(support_ws, service.styles, len(support_headers), service.business.name)



def build_customers_report(service, start_date=None, end_date=None):
    reference_date = end_date or date.today()
    receivables = service.build_receivables_snapshot(reference_date=reference_date)
    currency_fmt = service.styles.number_formats["currency"]
    date_fmt = service.styles.number_formats["date"]
    integer_fmt = service.styles.number_formats["integer"]
    _, due_soon_days, _ = service._get_receivables_settings()

    customers = Customer.query.filter(Customer.business_id == service.business_id).order_by(Customer.name.asc(), Customer.id.asc()).all()
    customer_stats = []
    for customer in customers:
        sales_query = Sale.query.filter(Sale.business_id == service.business_id, Sale.customer_id == customer.id)
        payments_query = Payment.query.filter(Payment.business_id == service.business_id, Payment.customer_id == customer.id)
        if start_date:
            sales_query = sales_query.filter(Sale.sale_date >= start_date)
            payments_query = payments_query.filter(Payment.payment_date >= start_date)
        if end_date:
            sales_query = sales_query.filter(Sale.sale_date <= end_date)
            payments_query = payments_query.filter(Payment.payment_date <= end_date)
        sales = sales_query.order_by(Sale.sale_date.desc(), Sale.id.desc()).all()
        payments = payments_query.order_by(Payment.payment_date.desc(), Payment.id.desc()).all()
        open_sales = (
            Sale.query
            .filter(
                Sale.business_id == service.business_id,
                Sale.customer_id == customer.id,
                Sale.sale_date <= reference_date,
                Sale.balance > 0,
            )
            .order_by(Sale.sale_date.desc(), Sale.id.desc())
            .all()
        )
        total_sold = round(sum(float(item.total or 0) for item in sales), 2)
        total_collected = round(sum(float(item.amount or 0) for item in payments), 2)
        balance = round(sum(float(item.balance or 0) for item in open_sales if float(item.balance or 0) > 0), 2)
        status = "Sin saldo"
        if balance > 0:
            overdue = any(
                sale_due_date and sale_due_date < reference_date
                for sale_due_date in [service.resolve_sale_due_date(item) for item in open_sales]
            )
            due_soon = any(
                sale_due_date and sale_due_date > reference_date and (sale_due_date - reference_date).days <= due_soon_days
                for sale_due_date in [service.resolve_sale_due_date(item) for item in open_sales]
            )
            status = "Vencido" if overdue else ("Por vencer" if due_soon else "Al día")
        elif total_collected > total_sold and total_collected > 0:
            status = "A favor"
        customer_stats.append({
            "name": customer.name or f"Cliente #{customer.id}",
            "phone": customer.phone or "-",
            "sales_count": len(sales),
            "total_sold": total_sold,
            "total_collected": total_collected,
            "balance": balance,
            "last_sale": sales[0].sale_date if sales else None,
            "last_payment": payments[0].payment_date if payments else None,
            "status": status,
            "notes": customer.notes or "",
        })

    summary_ws = service.create_sheet("Resumen", tab_color="7C3AED")
    summary_headers = ["Indicador", "Valor", "Lectura"]
    summary_header_row = prepare_standard_layout(
        summary_ws,
        service.styles,
        title="Reporte de clientes 360°",
        subtitle=f"Clientes, ventas y cartera al corte {service.period_label(start_date, end_date)}",
        filters=service.build_filter_rows(start_date, end_date, {"Corte cartera": reference_date.isoformat()}),
        kpis=[
            {"label": "Clientes", "value": len(customer_stats), "number_format": integer_fmt},
            {"label": "Clientes con saldo", "value": receivables["summary"]["customers_with_balance"], "number_format": integer_fmt},
            {"label": "Cartera pendiente", "value": receivables["summary"]["total_pending"], "number_format": currency_fmt},
            {"label": "Cartera vencida", "value": receivables["summary"]["overdue_total"], "number_format": currency_fmt},
        ],
        table_title="Lectura rápida",
        headers=summary_headers,
    )
    row = summary_header_row + 1
    for label, value, note, number_format in [
        ("Clientes con ventas", sum(1 for item in customer_stats if item["sales_count"] > 0), "Clientes con movimiento en el período", integer_fmt),
        ("Ventas acumuladas", round(sum(item["total_sold"] for item in customer_stats), 2), "Ventas registradas para clientes identificados", currency_fmt),
        ("Cobros acumulados", round(sum(item["total_collected"] for item in customer_stats), 2), "Cobros del período asociados a clientes", currency_fmt),
        ("Saldo por vencer", receivables["summary"]["due_soon_total"], "Cartera próxima a vencer al corte", currency_fmt),
    ]:
        summary_ws.append([label, value, note])
        service.styles.apply_named(summary_ws.cell(row=row, column=1), "body")
        service.styles.apply_named(summary_ws.cell(row=row, column=2), "body", number_format=number_format)
        service.styles.apply_named(summary_ws.cell(row=row, column=3), "body")
        row += 1
    apply_freeze_filter(summary_ws, summary_header_row, len(summary_headers))
    configure_print(summary_ws, repeat_header_row=summary_header_row)
    autosize_columns(summary_ws, fixed_widths={"A": 28, "B": 18, "C": 44})
    add_generated_footer(summary_ws, service.styles, len(summary_headers), service.business.name)

    detail_ws = service.create_sheet("Detalle", tab_color="8B5CF6")
    detail_headers = ["Cliente", "Teléfono", "Estado", "Ventas #", "Total vendido", "Total cobrado", "Saldo", "Última venta", "Último pago"]
    detail_header_row = prepare_standard_layout(
        detail_ws,
        service.styles,
        title="Detalle de clientes",
        subtitle="Ficha operativa de clientes con cartera y ventas del período",
        filters=service.build_filter_rows(start_date, end_date),
        kpis=[
            {"label": "Clientes", "value": len(customer_stats), "number_format": integer_fmt},
            {"label": "Cartera pendiente", "value": receivables["summary"]["total_pending"], "number_format": currency_fmt},
            {"label": "Vencido", "value": receivables["summary"]["overdue_total"], "number_format": currency_fmt},
        ],
        table_title="Detalle de clientes",
        headers=detail_headers,
    )
    row = detail_header_row + 1
    if not customer_stats:
        write_empty_state(detail_ws, row, "No hay clientes registrados para este negocio.", len(detail_headers), service.styles)
    else:
        for item in sorted(customer_stats, key=lambda entry: (entry["balance"], entry["total_sold"]), reverse=True):
            detail_ws.append([
                item["name"],
                item["phone"],
                item["status"],
                item["sales_count"],
                item["total_sold"],
                item["total_collected"],
                item["balance"],
                item["last_sale"],
                item["last_payment"],
            ])
            service.styles.apply_named(detail_ws.cell(row=row, column=1), "body")
            service.styles.apply_named(detail_ws.cell(row=row, column=2), "body")
            service.styles.apply_status(detail_ws.cell(row=row, column=3), _customer_status_tone(item["status"]))
            service.styles.apply_named(detail_ws.cell(row=row, column=4), "body_center", number_format=integer_fmt)
            service.styles.apply_named(detail_ws.cell(row=row, column=5), "body", number_format=currency_fmt)
            service.styles.apply_named(detail_ws.cell(row=row, column=6), "body", number_format=currency_fmt)
            service.styles.apply_named(detail_ws.cell(row=row, column=7), "body", number_format=currency_fmt)
            service.styles.apply_named(detail_ws.cell(row=row, column=8), "body", number_format=date_fmt)
            service.styles.apply_named(detail_ws.cell(row=row, column=9), "body", number_format=date_fmt)
            row += 1
    apply_freeze_filter(detail_ws, detail_header_row, len(detail_headers))
    configure_print(detail_ws, repeat_header_row=detail_header_row)
    autosize_columns(detail_ws, fixed_widths={"A": 28, "B": 16, "C": 15, "D": 10, "E": 16, "F": 16, "G": 16, "H": 13, "I": 13})
    add_generated_footer(detail_ws, service.styles, len(detail_headers), service.business.name)

    support_ws = service.create_sheet("Soporte", tab_color="A78BFA")
    support_headers = ["Cliente", "Referencia", "Fecha venta", "Vencimiento", "Saldo", "Estado"]
    support_header_row = prepare_standard_layout(
        support_ws,
        service.styles,
        title="Soporte de cartera",
        subtitle="Ventas abiertas que explican la cartera al corte",
        filters=service.build_filter_rows(start_date, end_date, {"Corte cartera": reference_date.isoformat()}),
        kpis=[
            {"label": "Ventas abiertas", "value": receivables["summary"]["open_count"], "number_format": integer_fmt},
            {"label": "Clientes con saldo", "value": receivables["summary"]["customers_with_balance"], "number_format": integer_fmt},
            {"label": "Saldo pendiente", "value": receivables["summary"]["total_pending"], "number_format": currency_fmt},
        ],
        table_title="Detalle de cartera",
        headers=support_headers,
    )
    row = support_header_row + 1
    if not receivables["items"]:
        write_empty_state(support_ws, row, "No hay cartera pendiente al corte del reporte.", len(support_headers), service.styles)
    else:
        for item in receivables["items"]:
            support_ws.append([
                item["customer_name"],
                item["reference"],
                item["sale_date"],
                item["due_date"],
                item["balance"],
                item["status"],
            ])
            service.styles.apply_named(support_ws.cell(row=row, column=1), "body")
            service.styles.apply_named(support_ws.cell(row=row, column=2), "body")
            service.styles.apply_named(support_ws.cell(row=row, column=3), "body", number_format=date_fmt)
            service.styles.apply_named(support_ws.cell(row=row, column=4), "body", number_format=date_fmt)
            service.styles.apply_named(support_ws.cell(row=row, column=5), "body", number_format=currency_fmt)
            service.styles.apply_status(support_ws.cell(row=row, column=6), _customer_status_tone(item["status"]))
            row += 1
    apply_freeze_filter(support_ws, support_header_row, len(support_headers))
    configure_print(support_ws, repeat_header_row=support_header_row)
    autosize_columns(support_ws, fixed_widths={"A": 26, "B": 15, "C": 13, "D": 13, "E": 16, "F": 15})
    add_generated_footer(support_ws, service.styles, len(support_headers), service.business.name)



def build_inventory_report(service, start_date=None, end_date=None):
    currency_fmt = service.styles.number_formats["currency"]
    date_fmt = service.styles.number_formats["date"]
    integer_fmt = service.styles.number_formats["integer"]
    products = Product.query.filter(Product.business_id == service.business_id).order_by(Product.name.asc(), Product.id.asc()).all()
    movements_query = ProductMovement.query.options(joinedload(ProductMovement.product)).filter(ProductMovement.business_id == service.business_id)
    if start_date:
        movements_query = movements_query.filter(func.date(ProductMovement.created_at) >= start_date)
    if end_date:
        movements_query = movements_query.filter(func.date(ProductMovement.created_at) <= end_date)
    movements = movements_query.order_by(ProductMovement.created_at.desc(), ProductMovement.id.desc()).limit(500).all()

    total_stock_units = round(sum(float(item.stock or 0) for item in products), 2)
    inventory_cost_total = round(sum(float(item.cost or 0) * float(item.stock or 0) for item in products), 2)
    inventory_sales_total = round(sum(float(item.price or 0) * float(item.stock or 0) for item in products), 2)
    low_stock_count = sum(1 for item in products if float(item.stock or 0) <= float(item.low_stock_threshold or 0))

    summary_ws = service.create_sheet("Resumen", tab_color="D97706")
    summary_headers = ["Indicador", "Valor", "Lectura"]
    summary_header_row = prepare_standard_layout(
        summary_ws,
        service.styles,
        title="Catálogo y rotación",
        subtitle=f"Estado del catálogo y trazabilidad de movimientos para {service.period_label(start_date, end_date)}",
        filters=service.build_filter_rows(start_date, end_date),
        kpis=[
            {"label": "Productos", "value": len(products), "number_format": integer_fmt},
            {"label": "Stock total", "value": total_stock_units, "number_format": integer_fmt},
            {"label": "Valor inventario", "value": inventory_cost_total, "number_format": currency_fmt},
            {"label": "Venta potencial", "value": inventory_sales_total, "number_format": currency_fmt},
        ],
        table_title="Lectura rápida",
        headers=summary_headers,
    )
    row = summary_header_row + 1
    for label, value, note, number_format in [
        ("Productos con stock bajo", low_stock_count, "Stock menor o igual al umbral configurado", integer_fmt),
        ("Costo promedio por producto", round(inventory_cost_total / len(products), 2) if products else 0, "Promedio simple para lectura rápida", currency_fmt),
        ("Precio promedio por producto", round(sum(float(item.price or 0) for item in products) / len(products), 2) if products else 0, "Promedio del catálogo actual", currency_fmt),
    ]:
        summary_ws.append([label, value, note])
        service.styles.apply_named(summary_ws.cell(row=row, column=1), "body")
        service.styles.apply_named(summary_ws.cell(row=row, column=2), "body", number_format=number_format)
        service.styles.apply_named(summary_ws.cell(row=row, column=3), "body")
        row += 1
    apply_freeze_filter(summary_ws, summary_header_row, len(summary_headers))
    configure_print(summary_ws, repeat_header_row=summary_header_row)
    autosize_columns(summary_ws, fixed_widths={"A": 30, "B": 18, "C": 44})
    add_generated_footer(summary_ws, service.styles, len(summary_headers), service.business.name)

    detail_ws = service.create_sheet("Detalle", tab_color="F59E0B")
    detail_headers = ["Producto", "Tipo", "SKU", "Precio", "Costo", "Stock", "Umbral", "Estado", "Valor costo", "Valor venta"]
    detail_header_row = prepare_standard_layout(
        detail_ws,
        service.styles,
        title="Detalle de catálogo",
        subtitle="Catálogo actual con valorización y alertas de stock",
        filters=service.build_filter_rows(start_date, end_date),
        kpis=[
            {"label": "Valor inventario", "value": inventory_cost_total, "number_format": currency_fmt},
            {"label": "Venta potencial", "value": inventory_sales_total, "number_format": currency_fmt},
            {"label": "Productos bajos", "value": low_stock_count, "number_format": integer_fmt},
        ],
        table_title="Detalle del catálogo",
        headers=detail_headers,
    )
    row = detail_header_row + 1
    if not products:
        write_empty_state(detail_ws, row, "No hay productos registrados para este negocio.", len(detail_headers), service.styles)
    else:
        for product in products:
            stock = round(float(product.stock or 0), 2)
            threshold = round(float(product.low_stock_threshold or 0), 2)
            status = "OK"
            if stock <= 0:
                status = "Agotado"
            elif stock <= threshold:
                status = "Bajo"
            cost_value = round(float(product.cost or 0) * stock, 2)
            sale_value = round(float(product.price or 0) * stock, 2)
            detail_ws.append([
                product.name,
                product.type,
                product.sku or "-",
                float(product.price or 0),
                float(product.cost or 0),
                stock,
                threshold,
                status,
                cost_value,
                sale_value,
            ])
            service.styles.apply_named(detail_ws.cell(row=row, column=1), "body")
            service.styles.apply_named(detail_ws.cell(row=row, column=2), "body_center")
            service.styles.apply_named(detail_ws.cell(row=row, column=3), "body")
            service.styles.apply_named(detail_ws.cell(row=row, column=4), "body", number_format=currency_fmt)
            service.styles.apply_named(detail_ws.cell(row=row, column=5), "body", number_format=currency_fmt)
            service.styles.apply_named(detail_ws.cell(row=row, column=6), "body_center", number_format=integer_fmt)
            service.styles.apply_named(detail_ws.cell(row=row, column=7), "body_center", number_format=integer_fmt)
            service.styles.apply_status(detail_ws.cell(row=row, column=8), _inventory_tone(status))
            service.styles.apply_named(detail_ws.cell(row=row, column=9), "body", number_format=currency_fmt)
            service.styles.apply_named(detail_ws.cell(row=row, column=10), "body", number_format=currency_fmt)
            row += 1
    apply_freeze_filter(detail_ws, detail_header_row, len(detail_headers))
    configure_print(detail_ws, repeat_header_row=detail_header_row)
    autosize_columns(detail_ws, fixed_widths={"A": 28, "B": 12, "C": 16, "D": 14, "E": 14, "F": 10, "G": 10, "H": 12, "I": 16, "J": 16})
    add_generated_footer(detail_ws, service.styles, len(detail_headers), service.business.name)

    support_ws = service.create_sheet("Soporte", tab_color="FDBA74")
    support_headers = ["Fecha", "Producto", "Movimiento", "Cantidad", "Motivo", "Usuario"]
    support_header_row = prepare_standard_layout(
        support_ws,
        service.styles,
        title="Soporte de movimientos",
        subtitle="Últimos movimientos de inventario incluidos en el rango del reporte",
        filters=service.build_filter_rows(start_date, end_date),
        kpis=[
            {"label": "Movimientos", "value": len(movements), "number_format": integer_fmt},
            {"label": "Productos", "value": len(products), "number_format": integer_fmt},
            {"label": "Stock bajo", "value": low_stock_count, "number_format": integer_fmt},
        ],
        table_title="Movimientos recientes",
        headers=support_headers,
    )
    row = support_header_row + 1
    if not movements:
        write_empty_state(support_ws, row, "No hay movimientos de inventario en el rango seleccionado.", len(support_headers), service.styles)
    else:
        for movement in movements:
            support_ws.append([
                movement.created_at,
                movement.product.name if movement.product else f"Producto #{movement.product_id}",
                movement.type,
                float(movement.quantity or 0),
                movement.reason or "-",
                movement.created_by_name or (movement.user.name if movement.user else "Sistema"),
            ])
            service.styles.apply_named(support_ws.cell(row=row, column=1), "body", number_format=service.styles.number_formats["datetime"])
            service.styles.apply_named(support_ws.cell(row=row, column=2), "body")
            service.styles.apply_named(support_ws.cell(row=row, column=3), "body_center")
            service.styles.apply_named(support_ws.cell(row=row, column=4), "body_center", number_format=integer_fmt)
            service.styles.apply_named(support_ws.cell(row=row, column=5), "body")
            service.styles.apply_named(support_ws.cell(row=row, column=6), "body")
            row += 1
    apply_freeze_filter(support_ws, support_header_row, len(support_headers))
    configure_print(support_ws, repeat_header_row=support_header_row)
    autosize_columns(support_ws, fixed_widths={"A": 18, "B": 28, "C": 14, "D": 10, "E": 28, "F": 20})
    add_generated_footer(support_ws, service.styles, len(support_headers), service.business.name)



def build_aged_receivables_report(service, start_date=None, end_date=None):
    reference_date = end_date or date.today()
    receivables = service.build_receivables_snapshot(reference_date=reference_date)
    currency_fmt = service.styles.number_formats["currency"]
    date_fmt = service.styles.number_formats["date"]
    integer_fmt = service.styles.number_formats["integer"]

    buckets_by_customer = {}
    detail_rows = []
    for item in receivables["items"]:
        bucket = _aging_bucket(reference_date, item.get("due_date"))
        customer_name = item.get("customer_name") or "Cliente casual"
        customer_bucket = buckets_by_customer.setdefault(customer_name, {
            "current": 0.0,
            "1-30": 0.0,
            "31-60": 0.0,
            "61-90": 0.0,
            "+90": 0.0,
            "total": 0.0,
        })
        amount = round(float(item.get("balance") or 0), 2)
        if bucket == "Al día":
            customer_bucket["current"] += amount
        elif bucket == "1-30 días":
            customer_bucket["1-30"] += amount
        elif bucket == "31-60 días":
            customer_bucket["31-60"] += amount
        elif bucket == "61-90 días":
            customer_bucket["61-90"] += amount
        else:
            customer_bucket["+90"] += amount
        customer_bucket["total"] += amount
        detail_rows.append({
            **item,
            "bucket": bucket,
        })

    summary_totals = {
        "current": round(sum(item["current"] for item in buckets_by_customer.values()), 2),
        "1-30": round(sum(item["1-30"] for item in buckets_by_customer.values()), 2),
        "31-60": round(sum(item["31-60"] for item in buckets_by_customer.values()), 2),
        "61-90": round(sum(item["61-90"] for item in buckets_by_customer.values()), 2),
        "+90": round(sum(item["+90"] for item in buckets_by_customer.values()), 2),
        "total": round(sum(item["total"] for item in buckets_by_customer.values()), 2),
    }

    summary_ws = service.create_sheet("Resumen", tab_color="DC2626")
    summary_headers = ["Indicador", "Valor", "Lectura"]
    summary_header_row = prepare_standard_layout(
        summary_ws,
        service.styles,
        title="Cartera por edades",
        subtitle=f"Envejecimiento de cartera al corte {reference_date.isoformat()} con nuevo motor OpenPyXL",
        filters=service.build_filter_rows(start_date, end_date, {"Corte cartera": reference_date.isoformat()}),
        kpis=[
            {"label": "Cartera total", "value": summary_totals["total"], "number_format": currency_fmt},
            {"label": "Al día", "value": summary_totals["current"], "number_format": currency_fmt},
            {"label": "1-30 días", "value": summary_totals["1-30"], "number_format": currency_fmt},
            {"label": "+90 días", "value": summary_totals["+90"], "number_format": currency_fmt},
        ],
        table_title="Lectura rápida",
        headers=summary_headers,
    )
    row = summary_header_row + 1
    for label, value, note in [
        ("Clientes con saldo", receivables["summary"]["customers_with_balance"], "Clientes con cartera abierta al corte"),
        ("Ventas abiertas", receivables["summary"]["open_count"], "Ventas que componen la cartera"),
        ("Cartera vencida", receivables["summary"]["overdue_total"], "Monto vencido usando fecha de vencimiento"),
        ("Cartera por vencer", receivables["summary"]["due_soon_total"], "Monto que vence pronto"),
    ]:
        summary_ws.append([label, value, note])
        number_format = integer_fmt if label in {"Clientes con saldo", "Ventas abiertas"} else currency_fmt
        service.styles.apply_named(summary_ws.cell(row=row, column=1), "body")
        service.styles.apply_named(summary_ws.cell(row=row, column=2), "body", number_format=number_format)
        service.styles.apply_named(summary_ws.cell(row=row, column=3), "body")
        row += 1
    apply_freeze_filter(summary_ws, summary_header_row, len(summary_headers))
    configure_print(summary_ws, repeat_header_row=summary_header_row)
    autosize_columns(summary_ws, fixed_widths={"A": 28, "B": 18, "C": 46})
    add_generated_footer(summary_ws, service.styles, len(summary_headers), service.business.name)

    detail_ws = service.create_sheet("Detalle", tab_color="EF4444")
    detail_headers = ["Cliente", "Al día", "1-30 días", "31-60 días", "61-90 días", "+90 días", "Total"]
    detail_header_row = prepare_standard_layout(
        detail_ws,
        service.styles,
        title="Detalle por cliente",
        subtitle="Agrupación de saldos por antigüedad usando fechas de vencimiento vigentes",
        filters=service.build_filter_rows(start_date, end_date, {"Corte cartera": reference_date.isoformat()}),
        kpis=[
            {"label": "Cartera total", "value": summary_totals["total"], "number_format": currency_fmt},
            {"label": "Clientes con saldo", "value": receivables["summary"]["customers_with_balance"], "number_format": integer_fmt},
            {"label": "Vencido", "value": receivables["summary"]["overdue_total"], "number_format": currency_fmt},
        ],
        table_title="Cartera por cliente",
        headers=detail_headers,
    )
    row = detail_header_row + 1
    if not buckets_by_customer:
        write_empty_state(detail_ws, row, "No hay cartera pendiente para clasificar por edades.", len(detail_headers), service.styles)
    else:
        for customer_name, bucket in sorted(buckets_by_customer.items(), key=lambda item: item[1]["total"], reverse=True):
            detail_ws.append([
                customer_name,
                bucket["current"],
                bucket["1-30"],
                bucket["31-60"],
                bucket["61-90"],
                bucket["+90"],
                bucket["total"],
            ])
            service.styles.apply_named(detail_ws.cell(row=row, column=1), "body")
            for col in range(2, 8):
                service.styles.apply_named(detail_ws.cell(row=row, column=col), "body", number_format=currency_fmt)
            row += 1
    apply_freeze_filter(detail_ws, detail_header_row, len(detail_headers))
    configure_print(detail_ws, repeat_header_row=detail_header_row)
    autosize_columns(detail_ws, fixed_widths={"A": 28, "B": 14, "C": 14, "D": 14, "E": 14, "F": 14, "G": 16})
    add_generated_footer(detail_ws, service.styles, len(detail_headers), service.business.name)

    support_ws = service.create_sheet("Soporte", tab_color="FCA5A5")
    support_headers = ["Cliente", "Referencia", "Fecha venta", "Vencimiento", "Saldo", "Estado", "Bucket"]
    support_header_row = prepare_standard_layout(
        support_ws,
        service.styles,
        title="Soporte de cartera abierta",
        subtitle="Ventas abiertas clasificadas por bucket de antigüedad",
        filters=service.build_filter_rows(start_date, end_date, {"Corte cartera": reference_date.isoformat()}),
        kpis=[
            {"label": "Ventas abiertas", "value": receivables["summary"]["open_count"], "number_format": integer_fmt},
            {"label": "Al día", "value": summary_totals["current"], "number_format": currency_fmt},
            {"label": "+90 días", "value": summary_totals["+90"], "number_format": currency_fmt},
        ],
        table_title="Detalle abierto",
        headers=support_headers,
    )
    row = support_header_row + 1
    if not detail_rows:
        write_empty_state(support_ws, row, "No hay ventas abiertas para soportar la cartera por edades.", len(support_headers), service.styles)
    else:
        for item in sorted(detail_rows, key=lambda entry: (entry["bucket"], entry.get("balance") or 0), reverse=True):
            support_ws.append([
                item["customer_name"],
                item["reference"],
                item["sale_date"],
                item["due_date"],
                item["balance"],
                item["status"],
                item["bucket"],
            ])
            service.styles.apply_named(support_ws.cell(row=row, column=1), "body")
            service.styles.apply_named(support_ws.cell(row=row, column=2), "body")
            service.styles.apply_named(support_ws.cell(row=row, column=3), "body", number_format=date_fmt)
            service.styles.apply_named(support_ws.cell(row=row, column=4), "body", number_format=date_fmt)
            service.styles.apply_named(support_ws.cell(row=row, column=5), "body", number_format=currency_fmt)
            service.styles.apply_status(support_ws.cell(row=row, column=6), _customer_status_tone(item["status"]))
            service.styles.apply_status(support_ws.cell(row=row, column=7), _aging_tone(item["bucket"]))
            row += 1
    apply_freeze_filter(support_ws, support_header_row, len(support_headers))
    configure_print(support_ws, repeat_header_row=support_header_row)
    autosize_columns(support_ws, fixed_widths={"A": 26, "B": 15, "C": 13, "D": 13, "E": 16, "F": 15, "G": 14})
    add_generated_footer(support_ws, service.styles, len(support_headers), service.business.name)



def build_profitability_payload_report(service, summary_data, products_data, sales_data, alerts_data, start_date=None, end_date=None, filters=None):
    currency_fmt = service.styles.number_formats["currency"]
    date_fmt = service.styles.number_formats["date"]
    integer_fmt = service.styles.number_formats["integer"]
    percentage_fmt = service.styles.number_formats["percentage"]
    filters = filters or {}

    summary_ws = service.create_sheet("Resumen", tab_color="059669")
    summary_headers = ["Indicador", "Valor", "Contexto"]
    summary_header_row = prepare_standard_layout(
        summary_ws,
        service.styles,
        title="Rentabilidad real",
        subtitle=f"Generado con nuevo motor OpenPyXL para {service.period_label(start_date, end_date)}",
        filters=service.build_filter_rows(start_date, end_date, {
            "Estado": filters.get("status") or "all",
            "Producto": filters.get("product_query") or "No aplica",
            "Foco": filters.get("focus") or "overview",
        }),
        kpis=[
            {"label": "Ventas totales", "value": summary_data.get("revenue_total"), "number_format": currency_fmt},
            {"label": "Ventas costeadas", "value": summary_data.get("costed_revenue_total"), "number_format": currency_fmt},
            {"label": "Margen bruto", "value": summary_data.get("gross_margin_total"), "number_format": currency_fmt},
            {"label": "Ventas completas", "value": summary_data.get("complete_sales_count"), "number_format": integer_fmt},
            {"label": "Productos con advertencia", "value": summary_data.get("products_with_issues_count"), "number_format": integer_fmt},
        ],
        table_title="Lectura rápida",
        headers=summary_headers,
    )
    row = summary_header_row + 1
    summary_rows = [
        ("Periodo", service.period_label(start_date, end_date), "Rango exportado", None),
        ("Costo consumido", summary_data.get("consumed_cost_total"), "Costo real consumido en ventas completas", currency_fmt),
        ("Margen % estimado", (summary_data.get("margin_percent") or 0) / 100 if summary_data.get("margin_percent") is not None else None, "Solo cuando el costo es confiable", percentage_fmt),
        ("Ventas incompletas", summary_data.get("incomplete_sales_count"), "Costo parcial o faltante", integer_fmt),
        ("Ventas sin consumo", summary_data.get("no_consumption_sales_count"), "Sin consumo relacionado", integer_fmt),
        ("Ventas sin costo base", summary_data.get("missing_cost_sales_count"), "Sin costo base suficiente", integer_fmt),
    ]
    for label, value, note, number_format in summary_rows:
        summary_ws.append([label, value if value is not None else "No estimable", note])
        service.styles.apply_named(summary_ws.cell(row=row, column=1), "body")
        service.styles.apply_named(summary_ws.cell(row=row, column=2), "body", number_format=number_format)
        service.styles.apply_named(summary_ws.cell(row=row, column=3), "body")
        row += 1
    apply_freeze_filter(summary_ws, summary_header_row, len(summary_headers))
    configure_print(summary_ws, repeat_header_row=summary_header_row)
    autosize_columns(summary_ws, fixed_widths={"A": 30, "B": 18, "C": 46})
    add_generated_footer(summary_ws, service.styles, len(summary_headers), service.business.name)

    products_ws = service.create_sheet("Productos", tab_color="2563EB")
    product_headers = ["Producto", "Estado", "Mensaje", "Cantidad", "Ventas", "Ventas costeadas", "Costo consumido", "Margen", "Margen %", "# ventas"]
    product_header_row = prepare_standard_layout(
        products_ws,
        service.styles,
        title="Detalle por productos",
        subtitle="Productos con costeo confiable e incidencias separadas explícitamente",
        filters=service.build_filter_rows(start_date, end_date),
        kpis=[
            {"label": "Productos", "value": len(products_data.get("items", [])), "number_format": integer_fmt},
            {"label": "Con advertencia", "value": products_data.get("incomplete_items_count", 0) + products_data.get("missing_cost_items_count", 0) + products_data.get("no_consumption_items_count", 0), "number_format": integer_fmt},
            {"label": "Top margen", "value": len(products_data.get("top_margin_items", [])), "number_format": integer_fmt},
        ],
        table_title="Productos",
        headers=product_headers,
    )
    row = product_header_row + 1
    if not products_data.get("items"):
        write_empty_state(products_ws, row, "No hay productos de rentabilidad para el rango seleccionado.", len(product_headers), service.styles)
    else:
        for item in products_data.get("items", []):
            margin_pct = item.get("estimated_margin_percent")
            products_ws.append([
                item.get("product_name"),
                item.get("cost_status_label") or item.get("cost_status"),
                item.get("cost_status_message"),
                item.get("quantity_sold"),
                item.get("revenue_total"),
                item.get("costed_revenue_total"),
                item.get("consumed_cost_total"),
                item.get("estimated_gross_margin"),
                (margin_pct or 0) / 100 if margin_pct is not None else None,
                item.get("sales_count"),
            ])
            service.styles.apply_named(products_ws.cell(row=row, column=1), "body")
            service.styles.apply_status(products_ws.cell(row=row, column=2), "success" if item.get("cost_status") == "complete" else ("danger" if item.get("cost_status") in {"missing_cost", "no_consumption"} else "warning"))
            service.styles.apply_named(products_ws.cell(row=row, column=3), "body")
            service.styles.apply_named(products_ws.cell(row=row, column=4), "body_center", number_format=integer_fmt)
            for col in [5, 6, 7, 8]:
                service.styles.apply_named(products_ws.cell(row=row, column=col), "body", number_format=currency_fmt)
            service.styles.apply_named(products_ws.cell(row=row, column=9), "body", number_format=percentage_fmt)
            service.styles.apply_named(products_ws.cell(row=row, column=10), "body_center", number_format=integer_fmt)
            row += 1
    apply_freeze_filter(products_ws, product_header_row, len(product_headers))
    configure_print(products_ws, repeat_header_row=product_header_row)
    autosize_columns(products_ws, fixed_widths={"A": 26, "B": 18, "C": 36, "D": 10, "E": 15, "F": 15, "G": 15, "H": 15, "I": 12, "J": 10})
    add_generated_footer(products_ws, service.styles, len(product_headers), service.business.name)

    sales_ws = service.create_sheet("Ventas", tab_color="7C3AED")
    sales_headers = ["Venta", "Fecha", "Cliente", "Estado", "Mensaje", "Método", "Total", "Costo", "Costo parcial", "Margen", "Margen %"]
    sales_header_row = prepare_standard_layout(
        sales_ws,
        service.styles,
        title="Detalle por ventas",
        subtitle="Ventas con estado de confiabilidad explícito según costeo backend",
        filters=service.build_filter_rows(start_date, end_date),
        kpis=[
            {"label": "Ventas", "value": summary_data.get("sales_count"), "number_format": integer_fmt},
            {"label": "Completas", "value": summary_data.get("complete_sales_count"), "number_format": integer_fmt},
            {"label": "Con advertencia", "value": summary_data.get("incomplete_sales_count", 0) + summary_data.get("no_consumption_sales_count", 0) + summary_data.get("missing_cost_sales_count", 0), "number_format": integer_fmt},
        ],
        table_title="Ventas",
        headers=sales_headers,
    )
    row = sales_header_row + 1
    if not sales_data.get("items"):
        write_empty_state(sales_ws, row, "No hay ventas de rentabilidad para el rango seleccionado.", len(sales_headers), service.styles)
    else:
        for item in sales_data.get("items", []):
            margin_pct = item.get("estimated_margin_percent")
            sales_ws.append([
                f"Venta #{item.get('sale_id')}",
                item.get("sale_date"),
                item.get("customer_name") or "Cliente casual",
                item.get("cost_status_label") or item.get("cost_status"),
                item.get("cost_status_message"),
                item.get("payment_method"),
                item.get("sale_total"),
                item.get("consumed_cost_total"),
                item.get("partial_consumed_cost_total"),
                item.get("estimated_gross_margin"),
                (margin_pct or 0) / 100 if margin_pct is not None else None,
            ])
            service.styles.apply_named(sales_ws.cell(row=row, column=1), "body")
            service.styles.apply_named(sales_ws.cell(row=row, column=2), "body", number_format=date_fmt)
            service.styles.apply_named(sales_ws.cell(row=row, column=3), "body")
            service.styles.apply_status(sales_ws.cell(row=row, column=4), "success" if item.get("cost_status") == "complete" else ("danger" if item.get("cost_status") in {"missing_cost", "no_consumption"} else "warning"))
            service.styles.apply_named(sales_ws.cell(row=row, column=5), "body")
            service.styles.apply_named(sales_ws.cell(row=row, column=6), "body_center")
            for col in [7, 8, 9, 10]:
                service.styles.apply_named(sales_ws.cell(row=row, column=col), "body", number_format=currency_fmt)
            service.styles.apply_named(sales_ws.cell(row=row, column=11), "body", number_format=percentage_fmt)
            row += 1
    apply_freeze_filter(sales_ws, sales_header_row, len(sales_headers))
    configure_print(sales_ws, repeat_header_row=sales_header_row)
    autosize_columns(sales_ws, fixed_widths={"A": 14, "B": 13, "C": 26, "D": 18, "E": 36, "F": 14, "G": 15, "H": 15, "I": 15, "J": 15, "K": 12})
    add_generated_footer(sales_ws, service.styles, len(sales_headers), service.business.name)

    alerts_ws = service.create_sheet("Alertas", tab_color="D97706")
    alert_headers = ["Nivel", "Código", "Título", "Mensaje", "Casos"]
    alert_header_row = prepare_standard_layout(
        alerts_ws,
        service.styles,
        title="Alertas de rentabilidad",
        subtitle="Hallazgos accionables expuestos por el backend actual",
        filters=service.build_filter_rows(start_date, end_date),
        kpis=[
            {"label": "Alertas", "value": len(alerts_data.get("alerts", [])), "number_format": integer_fmt},
            {"label": "Productos con advertencia", "value": summary_data.get("products_with_issues_count"), "number_format": integer_fmt},
            {"label": "Ventas incompletas", "value": summary_data.get("incomplete_sales_count"), "number_format": integer_fmt},
        ],
        table_title="Alertas",
        headers=alert_headers,
    )
    row = alert_header_row + 1
    if not alerts_data.get("alerts"):
        write_empty_state(alerts_ws, row, "No hay alertas de rentabilidad para los filtros aplicados.", len(alert_headers), service.styles)
    else:
        for alert in alerts_data.get("alerts", []):
            alerts_ws.append([
                alert.get("level"),
                alert.get("code"),
                alert.get("title"),
                alert.get("message"),
                alert.get("count"),
            ])
            service.styles.apply_status(alerts_ws.cell(row=row, column=1), "danger" if alert.get("level") == "danger" else "warning")
            service.styles.apply_named(alerts_ws.cell(row=row, column=2), "body")
            service.styles.apply_named(alerts_ws.cell(row=row, column=3), "body")
            service.styles.apply_named(alerts_ws.cell(row=row, column=4), "body")
            service.styles.apply_named(alerts_ws.cell(row=row, column=5), "body_center", number_format=integer_fmt)
            row += 1
    apply_freeze_filter(alerts_ws, alert_header_row, len(alert_headers))
    configure_print(alerts_ws, repeat_header_row=alert_header_row)
    autosize_columns(alerts_ws, fixed_widths={"A": 12, "B": 18, "C": 28, "D": 44, "E": 10})
    add_generated_footer(alerts_ws, service.styles, len(alert_headers), service.business.name)

    support_ws = service.create_sheet("Soporte", tab_color="DC2626")
    support_headers = ["Tipo", "Referencia", "Estado", "Mensaje", "Monto", "Margen", "Fecha"]
    support_header_row = prepare_standard_layout(
        support_ws,
        service.styles,
        title="Casos con advertencia",
        subtitle="Concentrado de productos y ventas que requieren revisión",
        filters=service.build_filter_rows(start_date, end_date),
        kpis=[
            {"label": "Productos issue", "value": len(products_data.get("incomplete_items", [])), "number_format": integer_fmt},
            {"label": "Ventas issue", "value": len(sales_data.get("no_consumption_items", [])) + len(sales_data.get("incomplete_items", [])), "number_format": integer_fmt},
            {"label": "Sin costo", "value": len(products_data.get("missing_cost_items", [])) + len(sales_data.get("missing_cost_items", [])), "number_format": integer_fmt},
        ],
        table_title="Incidencias",
        headers=support_headers,
    )
    row = support_header_row + 1
    issue_rows = []
    for item in products_data.get("incomplete_items", []):
        issue_rows.append(["Producto", item.get("product_name"), item.get("cost_status_label") or item.get("cost_status"), item.get("cost_status_message"), item.get("revenue_total"), item.get("estimated_margin_percent"), None])
    for item in sales_data.get("no_consumption_items", []) + sales_data.get("incomplete_items", []):
        issue_rows.append(["Venta", f"Venta #{item.get('sale_id')}", item.get("cost_status_label") or item.get("cost_status"), item.get("cost_status_message"), item.get("sale_total"), item.get("estimated_margin_percent"), item.get("sale_date")])
    if not issue_rows:
        write_empty_state(support_ws, row, "No hay casos con advertencia para el rango seleccionado.", len(support_headers), service.styles)
    else:
        for item in issue_rows:
            support_ws.append(item)
            service.styles.apply_named(support_ws.cell(row=row, column=1), "body_center")
            service.styles.apply_status(support_ws.cell(row=row, column=3), "danger" if str(item[2] or "").lower() in {"sin costo base", "sin consumo"} else "warning")
            service.styles.apply_named(support_ws.cell(row=row, column=2), "body")
            service.styles.apply_named(support_ws.cell(row=row, column=4), "body")
            service.styles.apply_named(support_ws.cell(row=row, column=5), "body", number_format=currency_fmt)
            service.styles.apply_named(support_ws.cell(row=row, column=6), "body", number_format=percentage_fmt)
            service.styles.apply_named(support_ws.cell(row=row, column=7), "body", number_format=date_fmt)
            row += 1
    apply_freeze_filter(support_ws, support_header_row, len(support_headers))
    configure_print(support_ws, repeat_header_row=support_header_row)
    autosize_columns(support_ws, fixed_widths={"A": 12, "B": 22, "C": 18, "D": 40, "E": 15, "F": 12, "G": 13})
    add_generated_footer(support_ws, service.styles, len(support_headers), service.business.name)


def build_team_report(service, summary_data, detail_data, start_date=None, end_date=None):
    currency_fmt = service.styles.number_formats["currency"]
    integer_fmt = service.styles.number_formats["integer"]
    datetime_fmt = service.styles.number_formats["datetime"]

    summary_ws = service.create_sheet("Resumen", tab_color="1D4ED8")
    summary_headers = [
        "ID",
        "Nombre",
        "Rol",
        "Ventas #",
        "Ventas",
        "Recaudos #",
        "Recaudos",
        "Gastos #",
        "Gastos",
        "Clientes nuevos",
        "Mov. inv.",
        "Recordatorios",
    ]
    summary_header_row = prepare_standard_layout(
        summary_ws,
        service.styles,
        title="Reporte de equipo",
        subtitle=f"Gestión del equipo generada con nuevo motor OpenPyXL para el período {service.period_label(start_date, end_date)}",
        filters=service.build_filter_rows(start_date, end_date),
        kpis=[
            {"label": "Integrantes con actividad", "value": len(summary_data or []), "number_format": integer_fmt},
            {"label": "Ventas del equipo", "value": round(sum(float(item.get("sales_total") or 0) for item in (summary_data or [])), 2), "number_format": currency_fmt},
            {"label": "Recaudos del equipo", "value": round(sum(float(item.get("payments_total") or 0) for item in (summary_data or [])), 2), "number_format": currency_fmt},
        ],
        table_title="Resumen por integrante",
        headers=summary_headers,
    )
    row = summary_header_row + 1
    if not summary_data:
        write_empty_state(summary_ws, row, "No hay actividad del equipo para el rango seleccionado.", len(summary_headers), service.styles)
    else:
        ordered_summary = sorted(summary_data, key=lambda item: (float(item.get("sales_total") or 0), float(item.get("payments_total") or 0), item.get("name") or ""), reverse=True)
        for item in ordered_summary:
            summary_ws.append([
                item.get("user_id"),
                item.get("name") or "Desconocido",
                item.get("role") or "-",
                int(item.get("sales_count") or 0),
                round(float(item.get("sales_total") or 0), 2),
                int(item.get("payments_count") or 0),
                round(float(item.get("payments_total") or 0), 2),
                int(item.get("expenses_count") or 0),
                round(float(item.get("expenses_total") or 0), 2),
                int(item.get("customers_created") or 0),
                int(item.get("movements_count") or 0),
                int(item.get("reminders_created") or 0),
            ])
            service.styles.apply_named(summary_ws.cell(row=row, column=1), "body_center", number_format=integer_fmt)
            service.styles.apply_named(summary_ws.cell(row=row, column=2), "body")
            service.styles.apply_named(summary_ws.cell(row=row, column=3), "body")
            service.styles.apply_named(summary_ws.cell(row=row, column=4), "body_center", number_format=integer_fmt)
            service.styles.apply_named(summary_ws.cell(row=row, column=5), "body", number_format=currency_fmt)
            service.styles.apply_named(summary_ws.cell(row=row, column=6), "body_center", number_format=integer_fmt)
            service.styles.apply_named(summary_ws.cell(row=row, column=7), "body", number_format=currency_fmt)
            service.styles.apply_named(summary_ws.cell(row=row, column=8), "body_center", number_format=integer_fmt)
            service.styles.apply_named(summary_ws.cell(row=row, column=9), "body", number_format=currency_fmt)
            service.styles.apply_named(summary_ws.cell(row=row, column=10), "body_center", number_format=integer_fmt)
            service.styles.apply_named(summary_ws.cell(row=row, column=11), "body_center", number_format=integer_fmt)
            service.styles.apply_named(summary_ws.cell(row=row, column=12), "body_center", number_format=integer_fmt)
            row += 1
    apply_freeze_filter(summary_ws, summary_header_row, len(summary_headers))
    configure_print(summary_ws, repeat_header_row=summary_header_row)
    autosize_columns(summary_ws, fixed_widths={"A": 10, "B": 26, "C": 20, "D": 10, "E": 14, "F": 10, "G": 14, "H": 10, "I": 14, "J": 14, "K": 12, "L": 14})
    add_generated_footer(summary_ws, service.styles, len(summary_headers), service.business.name)

    detail_ws = service.create_sheet("Detalle", tab_color="2563EB")
    detail_headers = ["Fecha", "Empleado", "Rol", "Acción", "Referencia", "Valor", "Detalle"]
    detail_header_row = prepare_standard_layout(
        detail_ws,
        service.styles,
        title="Actividad del equipo",
        subtitle="Log cronológico consolidado desde ventas, pagos, gastos, clientes, inventario y recordatorios",
        filters=service.build_filter_rows(start_date, end_date),
        kpis=[
            {"label": "Actividades", "value": len(detail_data or []), "number_format": integer_fmt},
            {"label": "Ventas", "value": sum(1 for item in (detail_data or []) if str(item.get("action") or "").lower() == "venta"), "number_format": integer_fmt},
            {"label": "Recaudos", "value": sum(1 for item in (detail_data or []) if str(item.get("action") or "").lower() == "recaudo"), "number_format": integer_fmt},
        ],
        table_title="Detalle de actividad",
        headers=detail_headers,
    )
    row = detail_header_row + 1
    if not detail_data:
        write_empty_state(detail_ws, row, "No hay detalle de actividad del equipo para el rango seleccionado.", len(detail_headers), service.styles)
    else:
        for item in detail_data:
            detail_ws.append([
                item.get("date"),
                item.get("user_name") or "Desconocido",
                item.get("user_role") or "-",
                item.get("action") or "-",
                item.get("reference") or "-",
                round(float(item.get("amount") or 0), 2),
                item.get("detail") or "-",
            ])
            service.styles.apply_named(detail_ws.cell(row=row, column=1), "body", number_format=datetime_fmt)
            service.styles.apply_named(detail_ws.cell(row=row, column=2), "body")
            service.styles.apply_named(detail_ws.cell(row=row, column=3), "body")
            service.styles.apply_named(detail_ws.cell(row=row, column=4), "body")
            service.styles.apply_named(detail_ws.cell(row=row, column=5), "body")
            service.styles.apply_named(detail_ws.cell(row=row, column=6), "body", number_format=currency_fmt)
            service.styles.apply_named(detail_ws.cell(row=row, column=7), "body")
            row += 1
    apply_freeze_filter(detail_ws, detail_header_row, len(detail_headers))
    configure_print(detail_ws, repeat_header_row=detail_header_row)
    autosize_columns(detail_ws, fixed_widths={"A": 18, "B": 22, "C": 18, "D": 20, "E": 18, "F": 14, "G": 38})
    add_generated_footer(detail_ws, service.styles, len(detail_headers), service.business.name)
