from .excel_utils import add_generated_footer, apply_freeze_filter, autosize_columns, configure_print, prepare_standard_layout, write_empty_state


def _status_tone(value: str) -> str:
    normalized = str(value or "").strip().lower()
    if normalized == "vencido":
        return "danger"
    if normalized in {"por vencer", "vence hoy"}:
        return "warning"
    return "success"



def build_payments_report(service, start_date=None, end_date=None):
    dataset = service.get_payments_dataset(start_date, end_date)
    currency_fmt = service.styles.number_formats["currency"]
    date_fmt = service.styles.number_formats["date"]
    integer_fmt = service.styles.number_formats["integer"]
    cutoff_label = end_date.isoformat() if end_date else "Hoy"

    summary_ws = service.create_sheet("Resumen", tab_color="15803D")
    summary_headers = ["Indicador", "Valor", "Lectura"]
    summary_header_row = prepare_standard_layout(
        summary_ws,
        service.styles,
        title="Reporte de cobros",
        subtitle=f"Cobros ejecutados y cartera al corte {service.period_label(start_date, end_date)}",
        filters=service.build_filter_rows(start_date, end_date, {"Cartera al corte": cutoff_label}),
        kpis=[
            {"label": "Cobros del período", "value": dataset["summary"]["payments_total"], "number_format": currency_fmt},
            {"label": "Clientes con saldo", "value": dataset["summary"]["customers_with_balance"], "number_format": integer_fmt},
            {"label": "Vencido", "value": dataset["summary"]["overdue_total"], "number_format": currency_fmt},
            {"label": "Por vencer", "value": dataset["summary"]["due_soon_total"], "number_format": currency_fmt},
        ],
        table_title="Lectura rápida",
        headers=summary_headers,
    )

    summary_rows = [
        ("Cobros ejecutados", dataset["summary"]["payments_total"], "Monto recibido en el período", currency_fmt),
        ("Clientes con saldo", dataset["summary"]["customers_with_balance"], "Clientes con cartera pendiente al corte", integer_fmt),
        ("Saldo vencido", dataset["summary"]["overdue_total"], "Cartera vencida al corte", currency_fmt),
        ("Saldo por vencer", dataset["summary"]["due_soon_total"], "Cartera próxima a vencer", currency_fmt),
    ]
    row = summary_header_row + 1
    for label, value, note, number_format in summary_rows:
        summary_ws.append([label, value, note])
        service.styles.apply_named(summary_ws.cell(row=row, column=1), "body")
        service.styles.apply_named(summary_ws.cell(row=row, column=2), "body", number_format=number_format)
        service.styles.apply_named(summary_ws.cell(row=row, column=3), "body")
        row += 1
    apply_freeze_filter(summary_ws, summary_header_row, len(summary_headers))
    configure_print(summary_ws, repeat_header_row=summary_header_row)
    autosize_columns(summary_ws, fixed_widths={"A": 26, "B": 18, "C": 42})
    add_generated_footer(summary_ws, service.styles, len(summary_headers), service.business.name)

    detail_headers = ["Cliente", "Fecha de cobro", "Referencia", "Método", "Monto recibido", "Aplicación del cobro", "Usuario"]
    detail_ws = service.create_sheet("Detalle", tab_color="16A34A")
    detail_header_row = prepare_standard_layout(
        detail_ws,
        service.styles,
        title="Detalle de cobros",
        subtitle="Cobros registrados con aplicación visible y consistente",
        filters=service.build_filter_rows(start_date, end_date),
        kpis=[
            {"label": "Cobros del período", "value": dataset["summary"]["payments_total"], "number_format": currency_fmt},
            {"label": "Clientes con saldo", "value": dataset["summary"]["customers_with_balance"], "number_format": integer_fmt},
            {"label": "Cartera vencida", "value": dataset["summary"]["overdue_total"], "number_format": currency_fmt},
        ],
        table_title="Detalle de cobros",
        headers=detail_headers,
    )

    row = detail_header_row + 1
    if not dataset["rows"]:
        write_empty_state(detail_ws, row, "No hay cobros para el período seleccionado.", len(detail_headers), service.styles)
    else:
        for item in dataset["rows"]:
            detail_ws.append([
                item["customer"],
                item["payment_date"],
                item["reference"],
                item["method"],
                item["amount"],
                item["application"],
                item["user"],
            ])
            service.styles.apply_named(detail_ws.cell(row=row, column=1), "body")
            service.styles.apply_named(detail_ws.cell(row=row, column=2), "body", number_format=date_fmt)
            service.styles.apply_named(detail_ws.cell(row=row, column=3), "body")
            service.styles.apply_named(detail_ws.cell(row=row, column=4), "body_center")
            service.styles.apply_named(detail_ws.cell(row=row, column=5), "body", number_format=currency_fmt)
            service.styles.apply_named(detail_ws.cell(row=row, column=6), "body")
            service.styles.apply_named(detail_ws.cell(row=row, column=7), "body")
            row += 1
    apply_freeze_filter(detail_ws, detail_header_row, len(detail_headers))
    configure_print(detail_ws, repeat_header_row=detail_header_row)
    autosize_columns(detail_ws, fixed_widths={"A": 26, "B": 14, "C": 14, "D": 14, "E": 16, "F": 30, "G": 20})
    add_generated_footer(detail_ws, service.styles, len(detail_headers), service.business.name)

    support_headers = ["Cliente", "Referencia", "Fecha venta", "Vencimiento", "Saldo", "Estado"]
    support_ws = service.create_sheet("Soporte", tab_color="65A30D")
    support_header_row = prepare_standard_layout(
        support_ws,
        service.styles,
        title="Soporte de cartera",
        subtitle="Cartera abierta al corte usada para KPIs del reporte",
        filters=service.build_filter_rows(start_date, end_date, {"Corte cartera": cutoff_label}),
        kpis=[
            {"label": "Saldo pendiente", "value": dataset["receivables"]["summary"]["total_pending"], "number_format": currency_fmt},
            {"label": "Ventas abiertas", "value": dataset["receivables"]["summary"]["open_count"], "number_format": integer_fmt},
            {"label": "Clientes con saldo", "value": dataset["receivables"]["summary"]["customers_with_balance"], "number_format": integer_fmt},
        ],
        table_title="Cartera al corte",
        headers=support_headers,
    )

    row = support_header_row + 1
    if not dataset["receivables"]["items"]:
        write_empty_state(support_ws, row, "No hay cartera pendiente al corte del reporte.", len(support_headers), service.styles)
    else:
        for item in dataset["receivables"]["items"]:
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
            service.styles.apply_status(support_ws.cell(row=row, column=6), _status_tone(item["status"]))
            row += 1
    apply_freeze_filter(support_ws, support_header_row, len(support_headers))
    configure_print(support_ws, repeat_header_row=support_header_row)
    autosize_columns(support_ws, fixed_widths={"A": 26, "B": 15, "C": 13, "D": 13, "E": 16, "F": 15})
    add_generated_footer(support_ws, service.styles, len(support_headers), service.business.name)
