from .excel_utils import add_generated_footer, apply_freeze_filter, autosize_columns, configure_print, prepare_standard_layout, write_empty_state


def _status_tone(value: str) -> str:
    normalized = str(value or "").strip().lower()
    if normalized in {"pagado", "ejecutado", "registrado"}:
        return "success"
    if normalized in {"parcial", "vence hoy", "por vencer"}:
        return "warning"
    if normalized in {"pendiente", "vencido"}:
        return "danger"
    return "info"


def build_expenses_report(service, start_date=None, end_date=None):
    dataset = service.classify_expenses(start_date, end_date)
    currency_fmt = service.styles.number_formats["currency"]
    date_fmt = service.styles.number_formats["date"]

    summary_ws = service.create_sheet("Resumen", tab_color="B91C1C")
    summary_headers = ["Indicador", "Valor", "Lectura"]
    summary_header_row = prepare_standard_layout(
        summary_ws,
        service.styles,
        title="Reporte de gastos",
        subtitle=f"Gastos ejecutados y compromisos operativos para {service.period_label(start_date, end_date)}",
        filters=service.build_filter_rows(start_date, end_date),
        kpis=[
            {"label": "Gasto total", "value": dataset["summary"]["expenses_total"], "number_format": currency_fmt},
            {"label": "Gasto operativo", "value": dataset["summary"]["operational_expense_total"], "number_format": currency_fmt},
            {"label": "Programados o pendientes", "value": dataset["summary"]["scheduled_or_pending_total"], "number_format": currency_fmt},
        ],
        table_title="Lectura rápida",
        headers=summary_headers,
    )

    summary_rows = [
        ("Gasto operativo ejecutado", dataset["totals"]["operational_expense"], "Gastos y compras pagadas ya ejecutadas"),
        ("Pagos a proveedores", dataset["totals"]["supplier_payment"], "Pagos reales a cuentas por pagar de proveedores"),
        ("Obligaciones operativas", dataset["totals"]["operational_obligation_payment"], "Pagos reales de obligaciones operativas"),
        ("Deuda financiera pagada", dataset["totals"]["financial_debt_payment"], "Pagos reales de deuda financiera"),
        ("Pendiente operativo", dataset["payables_summary"]["total_debt"], "Saldo pendiente de obligaciones operativas"),
    ]
    row = summary_header_row + 1
    for label, value, note in summary_rows:
        summary_ws.append([label, value, note])
        service.styles.apply_named(summary_ws.cell(row=row, column=1), "body")
        service.styles.apply_named(summary_ws.cell(row=row, column=2), "body", number_format=currency_fmt)
        service.styles.apply_named(summary_ws.cell(row=row, column=3), "body")
        row += 1
    apply_freeze_filter(summary_ws, summary_header_row, len(summary_headers))
    configure_print(summary_ws, repeat_header_row=summary_header_row)
    autosize_columns(summary_ws, fixed_widths={"A": 30, "B": 18, "C": 44})
    add_generated_footer(summary_ws, service.styles, len(summary_headers), service.business.name)

    detail_headers = ["Fecha", "Categoría", "Descripción", "Método", "Monto", "Proveedor", "Comprobante", "Estado"]
    detail_ws = service.create_sheet("Detalle", tab_color="DC2626")
    detail_header_row = prepare_standard_layout(
        detail_ws,
        service.styles,
        title="Detalle de gastos",
        subtitle="Detalle financiero limpio y reusable para operación real",
        filters=service.build_filter_rows(start_date, end_date),
        kpis=[
            {"label": "Gasto total", "value": dataset["summary"]["expenses_total"], "number_format": currency_fmt},
            {"label": "Gasto operativo", "value": dataset["summary"]["operational_expense_total"], "number_format": currency_fmt},
            {"label": "Pendiente operativo", "value": dataset["payables_summary"]["total_debt"], "number_format": currency_fmt},
        ],
        table_title="Detalle de gastos",
        headers=detail_headers,
    )

    row = detail_header_row + 1
    if not dataset["rows"]:
        write_empty_state(detail_ws, row, "No hay gastos para el período seleccionado.", len(detail_headers), service.styles)
    else:
        for item in dataset["rows"]:
            detail_ws.append([
                item["date"],
                item["category"],
                item["description"],
                item["method"],
                item["amount"],
                item["provider"],
                item["receipt"],
                item["status"],
            ])
            service.styles.apply_named(detail_ws.cell(row=row, column=1), "body", number_format=date_fmt)
            service.styles.apply_named(detail_ws.cell(row=row, column=2), "body")
            service.styles.apply_named(detail_ws.cell(row=row, column=3), "body")
            service.styles.apply_named(detail_ws.cell(row=row, column=4), "body_center")
            service.styles.apply_named(detail_ws.cell(row=row, column=5), "body", number_format=currency_fmt)
            service.styles.apply_named(detail_ws.cell(row=row, column=6), "body")
            service.styles.apply_named(detail_ws.cell(row=row, column=7), "body")
            service.styles.apply_status(detail_ws.cell(row=row, column=8), _status_tone(item["status"]))
            row += 1
    apply_freeze_filter(detail_ws, detail_header_row, len(detail_headers))
    configure_print(detail_ws, repeat_header_row=detail_header_row)
    autosize_columns(detail_ws, fixed_widths={"A": 13, "B": 18, "C": 30, "D": 16, "E": 14, "F": 24, "G": 22, "H": 15})
    add_generated_footer(detail_ws, service.styles, len(detail_headers), service.business.name)

    support_headers = ["Categoría", "Registros", "Monto total"]
    support_ws = service.create_sheet("Soporte", tab_color="F59E0B")
    support_header_row = prepare_standard_layout(
        support_ws,
        service.styles,
        title="Soporte de categorías de gasto",
        subtitle="Agrupación de gasto operativo para lectura rápida",
        filters=service.build_filter_rows(start_date, end_date),
        kpis=[
            {"label": "Categorías activas", "value": len(dataset["categories"]), "number_format": service.styles.number_formats["integer"]},
            {"label": "Pagos a proveedores", "value": dataset["totals"]["supplier_payment"], "number_format": currency_fmt},
            {"label": "Deuda financiera pagada", "value": dataset["totals"]["financial_debt_payment"], "number_format": currency_fmt},
        ],
        table_title="Resumen por categoría",
        headers=support_headers,
    )

    row = support_header_row + 1
    if not dataset["categories"]:
        write_empty_state(support_ws, row, "No hay categorías operativas para mostrar en este período.", len(support_headers), service.styles)
    else:
        for category, values in sorted(dataset["categories"].items(), key=lambda item: item[1]["total"], reverse=True):
            support_ws.append([category, values["count"], round(float(values["total"] or 0), 2)])
            service.styles.apply_named(support_ws.cell(row=row, column=1), "body")
            service.styles.apply_named(support_ws.cell(row=row, column=2), "body_center")
            service.styles.apply_named(support_ws.cell(row=row, column=3), "body", number_format=currency_fmt)
            row += 1
    apply_freeze_filter(support_ws, support_header_row, len(support_headers))
    configure_print(support_ws, repeat_header_row=support_header_row)
    autosize_columns(support_ws, fixed_widths={"A": 24, "B": 14, "C": 16})
    add_generated_footer(support_ws, service.styles, len(support_headers), service.business.name)
