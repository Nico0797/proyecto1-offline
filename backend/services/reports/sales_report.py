from .excel_utils import add_generated_footer, apply_freeze_filter, autosize_columns, configure_print, prepare_standard_layout, write_empty_state


def _status_tone(value: str) -> str:
    normalized = str(value or "").strip().lower()
    if normalized == "pagada":
        return "success"
    if normalized == "parcial":
        return "warning"
    return "danger"


def build_sales_report(service, start_date=None, end_date=None):
    dataset = service.get_sales_dataset(start_date, end_date)
    currency_fmt = service.styles.number_formats["currency"]
    date_fmt = service.styles.number_formats["date"]
    integer_fmt = service.styles.number_formats["integer"]

    summary_ws = service.create_sheet("Resumen", tab_color="2563EB")
    summary_headers = ["Indicador", "Valor", "Lectura"]
    summary_header_row = prepare_standard_layout(
        summary_ws,
        service.styles,
        title="Reporte de ventas",
        subtitle=f"Resumen ejecutivo del período {service.period_label(start_date, end_date)}",
        filters=service.build_filter_rows(start_date, end_date),
        kpis=[
            {"label": "Ventas totales", "value": dataset["summary"]["sales_total"], "number_format": currency_fmt},
            {"label": "Ventas cobradas", "value": dataset["summary"]["sales_collected"], "number_format": currency_fmt},
            {"label": "Saldo pendiente", "value": dataset["summary"]["sales_pending"], "number_format": currency_fmt},
            {"label": "Ticket promedio", "value": dataset["summary"]["average_ticket"], "number_format": currency_fmt},
            {"label": "Número de ventas", "value": dataset["summary"]["sales_count"], "number_format": integer_fmt},
        ],
        table_title="Lectura rápida",
        headers=summary_headers,
    )

    summary_rows = [
        ("Período", service.period_label(start_date, end_date), "Rango aplicado en la exportación", None),
        ("Ventas registradas", dataset["summary"]["sales_count"], "Cantidad de ventas en el período", integer_fmt),
        ("Monto vendido", dataset["summary"]["sales_total"], "Facturación bruta del período", currency_fmt),
        ("Monto cobrado", dataset["summary"]["sales_collected"], "Efectivamente cobrado según backend", currency_fmt),
        ("Saldo pendiente", dataset["summary"]["sales_pending"], "Cartera pendiente originada por ventas", currency_fmt),
    ]
    summary_row = summary_header_row + 1
    for label, value, note, number_format in summary_rows:
        summary_ws.append([label, value, note])
        summary_ws.cell(row=summary_row, column=1).number_format = "General"
        service.styles.apply_named(summary_ws.cell(row=summary_row, column=1), "body")
        service.styles.apply_named(summary_ws.cell(row=summary_row, column=2), "body", number_format=number_format)
        service.styles.apply_named(summary_ws.cell(row=summary_row, column=3), "body")
        summary_row += 1
    apply_freeze_filter(summary_ws, summary_header_row, len(summary_headers))
    configure_print(summary_ws, repeat_header_row=summary_header_row)
    autosize_columns(summary_ws, fixed_widths={"A": 28, "B": 18, "C": 42})
    add_generated_footer(summary_ws, service.styles, len(summary_headers), service.business.name)

    detail_headers = ["Fecha", "Número", "Cliente", "Estado", "Total", "Cobrado", "Saldo pendiente", "Método de pago", "Vendedor"]
    detail_ws = service.create_sheet("Detalle", tab_color="1D4ED8")
    detail_header_row = prepare_standard_layout(
        detail_ws,
        service.styles,
        title="Detalle de ventas",
        subtitle="Listado transaccional listo para negocio real",
        filters=service.build_filter_rows(start_date, end_date),
        kpis=[
            {"label": "Ventas totales", "value": dataset["summary"]["sales_total"], "number_format": currency_fmt},
            {"label": "Ventas cobradas", "value": dataset["summary"]["sales_collected"], "number_format": currency_fmt},
            {"label": "Saldo pendiente", "value": dataset["summary"]["sales_pending"], "number_format": currency_fmt},
        ],
        table_title="Detalle de ventas",
        headers=detail_headers,
    )

    row = detail_header_row + 1
    if not dataset["rows"]:
        write_empty_state(detail_ws, row, "No hay ventas en el período seleccionado.", len(detail_headers), service.styles)
    else:
        for item in dataset["rows"]:
            detail_ws.append([
                item["date"],
                item["reference"],
                item["customer"],
                item["status"],
                item["total"],
                item["collected"],
                item["pending"],
                item["payment_method"],
                item["seller"],
            ])
            service.styles.apply_named(detail_ws.cell(row=row, column=1), "body", number_format=date_fmt)
            service.styles.apply_named(detail_ws.cell(row=row, column=2), "body")
            service.styles.apply_named(detail_ws.cell(row=row, column=3), "body")
            service.styles.apply_status(detail_ws.cell(row=row, column=4), _status_tone(item["status"]))
            service.styles.apply_named(detail_ws.cell(row=row, column=5), "body", number_format=currency_fmt)
            service.styles.apply_named(detail_ws.cell(row=row, column=6), "body", number_format=currency_fmt)
            service.styles.apply_named(detail_ws.cell(row=row, column=7), "body", number_format=currency_fmt)
            service.styles.apply_named(detail_ws.cell(row=row, column=8), "body_center")
            service.styles.apply_named(detail_ws.cell(row=row, column=9), "body")
            row += 1
    apply_freeze_filter(detail_ws, detail_header_row, len(detail_headers))
    configure_print(detail_ws, repeat_header_row=detail_header_row)
    autosize_columns(detail_ws, fixed_widths={"A": 13, "B": 14, "C": 28, "D": 14, "E": 15, "F": 15, "G": 17, "H": 18, "I": 20})
    add_generated_footer(detail_ws, service.styles, len(detail_headers), service.business.name)
