from .excel_utils import add_generated_footer, apply_freeze_filter, autosize_columns, configure_print, prepare_standard_layout, write_empty_state


def _movement_tone(item):
    if item.get("movement_type") == "income":
        return "success"
    if str(item.get("scope") or "").strip().lower() == "financiero":
        return "danger"
    return "warning"



def build_cash_report(service, start_date=None, end_date=None):
    dataset = service.build_cash_dataset(start_date, end_date)
    currency_fmt = service.styles.number_formats["currency"]
    date_fmt = service.styles.number_formats["date"]

    summary_ws = service.create_sheet("Resumen", tab_color="0F766E")
    summary_headers = ["Indicador", "Valor", "Lectura"]
    summary_header_row = prepare_standard_layout(
        summary_ws,
        service.styles,
        title="Reporte de caja y financiero",
        subtitle=f"Separación profesional de caja real, cartera y obligaciones para {service.period_label(start_date, end_date)}",
        filters=service.build_filter_rows(start_date, end_date),
        kpis=[
            {"label": "Entradas reales", "value": dataset["summary"]["cash_in"], "number_format": currency_fmt},
            {"label": "Salidas reales", "value": dataset["summary"]["cash_out"], "number_format": currency_fmt},
            {"label": "Flujo neto", "value": dataset["summary"]["cash_net"], "number_format": currency_fmt},
            {"label": "Cartera / por cobrar", "value": dataset["summary"]["accounts_receivable"], "number_format": currency_fmt},
            {"label": "Por pagar total", "value": dataset["summary"]["accounts_payable"], "number_format": currency_fmt},
        ],
        table_title="Resumen simple",
        headers=summary_headers,
    )

    summary_rows = [
        ("Entradas reales", dataset["summary"]["cash_in"], "Cobros ejecutados y abonos iniciales efectivamente recibidos"),
        ("Salidas reales", dataset["summary"]["cash_out"], "Solo egresos ya ejecutados"),
        ("Flujo neto real", dataset["summary"]["cash_net"], "Entradas reales menos salidas reales"),
        ("Cartera pendiente", dataset["summary"]["accounts_receivable"], "Saldo pendiente por cobrar al corte"),
        ("Cartera vencida", dataset["summary"]["receivables_overdue_total"], "Monto vencido por cobrar"),
        ("Por pagar operativo", dataset["summary"]["operational_payables_total"], "Obligaciones operativas aún no ejecutadas"),
        ("Deuda financiera pendiente", dataset["summary"]["financial_debt_total"], "Pasivos financieros aún no cancelados"),
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
    autosize_columns(summary_ws, fixed_widths={"A": 30, "B": 18, "C": 46})
    add_generated_footer(summary_ws, service.styles, len(summary_headers), service.business.name)

    financial_headers = ["Concepto", "Monto", "Tipo"]
    financial_ws = service.create_sheet("Detalle financiero", tab_color="0D9488")
    financial_header_row = prepare_standard_layout(
        financial_ws,
        service.styles,
        title="Detalle financiero",
        subtitle="Separación de egresos reales y pendientes sin mezclar conceptos",
        filters=service.build_filter_rows(start_date, end_date),
        kpis=[
            {"label": "Gasto operativo", "value": dataset["summary"]["operational_expense_total"], "number_format": currency_fmt},
            {"label": "Pagos a proveedores", "value": dataset["summary"]["supplier_payments_total"], "number_format": currency_fmt},
            {"label": "Pagos operativos", "value": dataset["summary"]["operational_obligation_payments_total"], "number_format": currency_fmt},
            {"label": "Pagos financieros", "value": dataset["summary"]["financial_debt_payments_total"], "number_format": currency_fmt},
        ],
        table_title="Detalle financiero",
        headers=financial_headers,
    )

    row = financial_header_row + 1
    financial_rows = [
        ("Gasto operativo ejecutado", dataset["summary"]["operational_expense_total"], "Salida real"),
        ("Pagos a proveedores", dataset["summary"]["supplier_payments_total"], "Salida real"),
        ("Pagos de obligaciones operativas", dataset["summary"]["operational_obligation_payments_total"], "Salida real"),
        ("Pagos de deuda financiera", dataset["summary"]["financial_debt_payments_total"], "Salida real"),
        ("Por pagar operativo", dataset["summary"]["operational_payables_total"], "Pendiente"),
        ("Deuda financiera pendiente", dataset["summary"]["financial_debt_total"], "Pendiente"),
    ]
    for concept, amount, value_type in financial_rows:
        financial_ws.append([concept, amount, value_type])
        service.styles.apply_named(financial_ws.cell(row=row, column=1), "body")
        service.styles.apply_named(financial_ws.cell(row=row, column=2), "body", number_format=currency_fmt)
        service.styles.apply_status(financial_ws.cell(row=row, column=3), "warning" if value_type == "Pendiente" else "success")
        row += 1
    apply_freeze_filter(financial_ws, financial_header_row, len(financial_headers))
    configure_print(financial_ws, repeat_header_row=financial_header_row)
    autosize_columns(financial_ws, fixed_widths={"A": 34, "B": 18, "C": 14})
    add_generated_footer(financial_ws, service.styles, len(financial_headers), service.business.name)

    receivables_headers = ["Cliente", "Referencia", "Fecha venta", "Vencimiento", "Saldo", "Estado"]
    receivables_ws = service.create_sheet("Cartera", tab_color="0EA5E9")
    receivables_header_row = prepare_standard_layout(
        receivables_ws,
        service.styles,
        title="Cartera / por cobrar",
        subtitle="Saldos abiertos al corte usados por el resumen financiero",
        filters=service.build_filter_rows(start_date, end_date, {"Corte cartera": end_date.isoformat() if end_date else "Hoy"}),
        kpis=[
            {"label": "Por cobrar", "value": dataset["summary"]["accounts_receivable"], "number_format": currency_fmt},
            {"label": "Vencido", "value": dataset["summary"]["receivables_overdue_total"], "number_format": currency_fmt},
            {"label": "Por vencer", "value": dataset["summary"]["receivables_due_soon_total"], "number_format": currency_fmt},
        ],
        table_title="Detalle de cartera",
        headers=receivables_headers,
    )

    row = receivables_header_row + 1
    if not dataset["receivables"]["items"]:
        write_empty_state(receivables_ws, row, "No hay cartera pendiente al corte del reporte.", len(receivables_headers), service.styles)
    else:
        for item in dataset["receivables"]["items"]:
            receivables_ws.append([
                item["customer_name"],
                item["reference"],
                item["sale_date"],
                item["due_date"],
                item["balance"],
                item["status"],
            ])
            service.styles.apply_named(receivables_ws.cell(row=row, column=1), "body")
            service.styles.apply_named(receivables_ws.cell(row=row, column=2), "body")
            service.styles.apply_named(receivables_ws.cell(row=row, column=3), "body", number_format=date_fmt)
            service.styles.apply_named(receivables_ws.cell(row=row, column=4), "body", number_format=date_fmt)
            service.styles.apply_named(receivables_ws.cell(row=row, column=5), "body", number_format=currency_fmt)
            service.styles.apply_status(receivables_ws.cell(row=row, column=6), "danger" if item["status"] == "Vencido" else ("warning" if item["status"] in {"Por vencer", "Vence hoy"} else "success"))
            row += 1
    apply_freeze_filter(receivables_ws, receivables_header_row, len(receivables_headers))
    configure_print(receivables_ws, repeat_header_row=receivables_header_row)
    autosize_columns(receivables_ws, fixed_widths={"A": 26, "B": 15, "C": 13, "D": 13, "E": 16, "F": 15})
    add_generated_footer(receivables_ws, service.styles, len(receivables_headers), service.business.name)

    movement_headers = ["Fecha", "Descripción", "Movimiento", "Categoría", "Monto", "Ámbito", "Cuenta / medio"]
    movement_ws = service.create_sheet("Entradas y salidas", tab_color="0284C7")
    movement_header_row = prepare_standard_layout(
        movement_ws,
        service.styles,
        title="Entradas y salidas reales",
        subtitle="Movimientos reales de caja sin mezclar devengo con ejecución",
        filters=service.build_filter_rows(start_date, end_date),
        kpis=[
            {"label": "Entradas reales", "value": dataset["summary"]["cash_in"], "number_format": currency_fmt},
            {"label": "Salidas reales", "value": dataset["summary"]["cash_out"], "number_format": currency_fmt},
            {"label": "Flujo neto", "value": dataset["summary"]["cash_net"], "number_format": currency_fmt},
        ],
        table_title="Detalle de movimientos",
        headers=movement_headers,
    )

    row = movement_header_row + 1
    if not dataset["movements"]:
        write_empty_state(movement_ws, row, "No hay movimientos reales de caja para el período seleccionado.", len(movement_headers), service.styles)
    else:
        for item in dataset["movements"]:
            movement_ws.append([
                item["date"],
                item["description"],
                "Entrada" if item["movement_type"] == "income" else "Salida",
                item["source_label"],
                item["amount"],
                item["scope"],
                item["account"],
            ])
            service.styles.apply_named(movement_ws.cell(row=row, column=1), "body", number_format=date_fmt)
            service.styles.apply_named(movement_ws.cell(row=row, column=2), "body")
            service.styles.apply_status(movement_ws.cell(row=row, column=3), _movement_tone(item))
            service.styles.apply_named(movement_ws.cell(row=row, column=4), "body")
            service.styles.apply_named(movement_ws.cell(row=row, column=5), "body", number_format=currency_fmt)
            service.styles.apply_named(movement_ws.cell(row=row, column=6), "body_center")
            service.styles.apply_named(movement_ws.cell(row=row, column=7), "body")
            row += 1
    apply_freeze_filter(movement_ws, movement_header_row, len(movement_headers))
    configure_print(movement_ws, repeat_header_row=movement_header_row)
    autosize_columns(movement_ws, fixed_widths={"A": 13, "B": 34, "C": 12, "D": 28, "E": 15, "F": 14, "G": 20})
    add_generated_footer(movement_ws, service.styles, len(movement_headers), service.business.name)
