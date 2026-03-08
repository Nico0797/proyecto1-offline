# Cuaderno - Export Service
# ============================================
"""
Servicios de exportación a Excel y backup/restore
"""
import os
import json
from datetime import datetime, date, timedelta
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from backend.database import db
from backend.models import Business, Product, Customer, Sale, Expense, Payment, LedgerEntry
from flask import current_app
from sqlalchemy import func, desc

# --- Helpers de Estilo ---

def _apply_header_style(ws, headers, color_hex="2563EB"):
    """Aplica estilo profesional a los encabezados"""
    ws.append(headers)
    
    header_fill = PatternFill(start_color=color_hex, end_color=color_hex, fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=11)
    thin_border = Border(
        left=Side(style='thin', color='FFFFFF'),
        right=Side(style='thin', color='FFFFFF'), 
        top=Side(style='thin', color='FFFFFF'), 
        bottom=Side(style='thin', color='FFFFFF')
    )
    
    # Assuming headers are in the last appended row (which is usually row 1 if sheet is empty)
    # But if we added title before, we need to find the header row.
    # For now, let's assume we append headers right after sheet creation or after title.
    # We will use ws.max_row to find the current row.
    
    row_idx = ws.max_row
    for col_idx, cell in enumerate(ws[row_idx], 1):
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thin_border

def _add_title(ws, title, subtitle=None):
    """Agrega título al reporte"""
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=5)
    cell = ws.cell(row=1, column=1, value=title)
    cell.font = Font(bold=True, size=14, color="1F2937")
    cell.alignment = Alignment(horizontal="left")
    
    if subtitle:
        ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=5)
        cell_sub = ws.cell(row=2, column=1, value=subtitle)
        cell_sub.font = Font(italic=True, size=10, color="6B7280")
        ws.append([]) # Spacer

def _auto_adjust_columns(ws):
    """Ajusta el ancho de las columnas automáticamente"""
    from openpyxl.utils import get_column_letter
    
    for i, column in enumerate(ws.columns, 1):
        max_length = 0
        column_letter = get_column_letter(i)
        for cell in column:
            try:
                if cell.value:
                    val_len = len(str(cell.value))
                    if val_len > max_length:
                        max_length = val_len
            except:
                pass
        
        # Ajuste base + padding
        adjusted_width = min(max_length + 4, 50) # Max 50 chars
        ws.column_dimensions[column_letter].width = adjusted_width

def _format_currency(ws, col_idx_list, start_row=2):
    """Formatea columnas como moneda"""
    for row in ws.iter_rows(min_row=start_row):
        for col_idx in col_idx_list:
            # Check bounds
            if col_idx - 1 < len(row):
                cell = row[col_idx - 1] # 0-indexed
                cell.number_format = '"$"#,##0.00'

def _get_filename(prefix, business_id):
    export_dir = current_app.config.get("EXPORT_DIR", "exports")
    
    # Ensure export directory exists
    if not os.path.isabs(export_dir):
        export_dir = os.path.join(current_app.root_path, export_dir)
        
    os.makedirs(export_dir, exist_ok=True)
    filename = f"{prefix}_{business_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return filename, os.path.join(export_dir, filename)

# --- Generadores de Reportes Completos ---

def generate_general_business_report(wb, business_id, start_date, end_date, sale_query, expense_query):
    """REPORTE 1 — REPORTE GENERAL DEL NEGOCIO"""
    
    # --- Hoja 1: Resumen Ejecutivo ---
    ws1 = wb.active
    ws1.title = "Resumen Ejecutivo"
    _add_title(ws1, "Reporte General del Negocio", f"Generado: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    
    # Data gathering
    total_sales = db.session.query(func.sum(Sale.total)).filter(Sale.business_id == business_id)
    sales_count = sale_query.count()
    total_expenses = db.session.query(func.sum(Expense.amount)).filter(Expense.business_id == business_id)
    
    if start_date: 
        total_sales = total_sales.filter(Sale.sale_date >= start_date)
        total_expenses = total_expenses.filter(Expense.expense_date >= start_date)
    if end_date: 
        total_sales = total_sales.filter(Sale.sale_date <= end_date)
        total_expenses = total_expenses.filter(Expense.expense_date <= end_date)
        
    val_sales = total_sales.scalar() or 0
    val_expenses = total_expenses.scalar() or 0
    val_profit = val_sales - val_expenses
    val_margin = (val_profit / val_sales * 100) if val_sales > 0 else 0
    val_ticket = val_sales / sales_count if sales_count > 0 else 0
    
    # Active customers (sales in period)
    active_customers = sale_query.with_entities(Sale.customer_id).distinct().count()
    
    # New customers (created in period - assuming simple logic or all if no date filter on creation)
    # We'll approximate by first sale date if created_at not available or reliable
    new_customers = 0 # Placeholder if we don't have exact created_at filter logic handy
    
    headers = ["Métrica", "Valor", "Detalle"]
    _apply_header_style(ws1, headers, "1E40AF") # Dark Blue
    
    data = [
        ["Ventas Totales", val_sales, "Ingresos brutos"],
        ["Gastos Operativos", val_expenses, "Costos registrados"],
        ["Utilidad Neta", val_profit, "Ventas - Gastos"],
        ["Margen de Ganancia", f"{val_margin:.2f}%", "% Utilidad sobre ventas"],
        ["Nº Transacciones", sales_count, "Tickets generados"],
        ["Ticket Promedio", val_ticket, "Venta promedio"],
        ["Clientes Activos", active_customers, "Clientes con compra en periodo"],
    ]
    
    for row in data:
        ws1.append(row)
        
    _format_currency(ws1, [2], start_row=4) # Only currency rows
    _auto_adjust_columns(ws1)

    # --- Hoja 2: Ventas por día ---
    ws2 = wb.create_sheet("Ventas por Día")
    headers2 = ["Fecha", "Nº Ventas", "Total Vendido", "Promedio por Venta"]
    _apply_header_style(ws2, headers2, "2563EB")
    
    daily_stats = {}
    sales = sale_query.all()
    for s in sales:
        d = s.sale_date
        if d not in daily_stats: daily_stats[d] = {"count": 0, "total": 0}
        daily_stats[d]["count"] += 1
        daily_stats[d]["total"] += s.total
        
    for d in sorted(daily_stats.keys(), reverse=True):
        st = daily_stats[d]
        avg = st["total"] / st["count"] if st["count"] else 0
        ws2.append([d, st["count"], st["total"], avg])
        
    _format_currency(ws2, [3, 4])
    _auto_adjust_columns(ws2)

    # --- Hoja 3: Ventas por cliente ---
    ws3 = wb.create_sheet("Ventas por Cliente")
    headers3 = ["Cliente", "Nº Compras", "Total Comprado", "Ticket Promedio", "Última Compra"]
    _apply_header_style(ws3, headers3, "2563EB")
    
    cust_stats = {}
    for s in sales:
        cid = s.customer_id or "anon"
        cname = s.customer.name if s.customer else "Cliente General"
        if cid not in cust_stats: cust_stats[cid] = {"name": cname, "count": 0, "total": 0, "last": s.sale_date}
        cust_stats[cid]["count"] += 1
        cust_stats[cid]["total"] += s.total
        if s.sale_date > cust_stats[cid]["last"]: cust_stats[cid]["last"] = s.sale_date
        
    for c in sorted(cust_stats.values(), key=lambda x: x["total"], reverse=True):
        avg = c["total"] / c["count"]
        ws3.append([c["name"], c["count"], c["total"], avg, c["last"]])
        
    _format_currency(ws3, [3, 4])
    _auto_adjust_columns(ws3)

    # --- Hoja 4: Productos más vendidos ---
    ws4 = wb.create_sheet("Productos Top")
    headers4 = ["Producto", "Cantidad Vendida", "Ingresos Generados", "Nº Ventas", "Precio Promedio"]
    _apply_header_style(ws4, headers4, "EA580C")
    
    prod_stats = {}
    for s in sales:
        # Handle JSON parsing if items is string
        items_data = s.items
        if isinstance(items_data, str):
            try:
                items_data = json.loads(items_data)
            except:
                items_data = []

        if not items_data or not isinstance(items_data, list):
            continue
            
        for item in items_data:
            if not isinstance(item, dict):
                continue
                
            pid = item.get("product_id") or item.get("name")
            name = item.get("name", "Producto")
            try:
                qty = float(item.get("qty", 0))
                total = float(item.get("total", 0))
            except (ValueError, TypeError):
                qty = 0
                total = 0
            
            if pid not in prod_stats: prod_stats[pid] = {"name": name, "qty": 0, "rev": 0, "tx": 0}
            prod_stats[pid]["qty"] += qty
            prod_stats[pid]["rev"] += total
            prod_stats[pid]["tx"] += 1
            
    for p in sorted(prod_stats.values(), key=lambda x: x["rev"], reverse=True):
        avg_price = p["rev"] / p["qty"] if p["qty"] else 0
        ws4.append([p["name"], p["qty"], p["rev"], p["tx"], avg_price])
        
    _format_currency(ws4, [3, 5])
    _auto_adjust_columns(ws4)

    # --- Hoja 5: Análisis de Gastos ---
    ws5 = wb.create_sheet("Análisis Gastos")
    headers5 = ["Categoría", "Nº Gastos", "Total Gastado", "% del Total"]
    _apply_header_style(ws5, headers5, "DC2626")
    
    expenses = expense_query.all()
    exp_cats = {}
    for e in expenses:
        if e.category not in exp_cats: exp_cats[e.category] = {"count": 0, "total": 0}
        exp_cats[e.category]["count"] += 1
        exp_cats[e.category]["total"] += e.amount
        
    for cat, st in sorted(exp_cats.items(), key=lambda x: x[1]["total"], reverse=True):
        pct = (st["total"] / val_expenses * 100) if val_expenses > 0 else 0
        ws5.append([cat, st["count"], st["total"], f"{pct:.2f}%"])
        
    _format_currency(ws5, [3])
    _auto_adjust_columns(ws5)

    # --- Hoja 6: Balance ---
    ws6 = wb.create_sheet("Balance")
    headers6 = ["Concepto", "Monto", "Detalle"]
    _apply_header_style(ws6, headers6, "10B981") # Emerald

    ws6.append(["Ventas Totales", val_sales, "Ingresos brutos"])
    ws6.append(["Gastos Operativos", val_expenses, "Costos registrados"])
    ws6.append(["Utilidad Neta", val_profit, "Ganancia real"])
    ws6.append(["Margen", f"{val_margin:.2f}%", "Rentabilidad"])

    _format_currency(ws6, [2])
    _auto_adjust_columns(ws6)


def generate_customers_report(wb, business_id):
    """REPORTE 2 — CLIENTES"""
    customers = Customer.query.filter_by(business_id=business_id).all()
    
    # Pre-calc balances and stats
    c_data = []
    for c in customers:
        charges = db.session.query(func.sum(LedgerEntry.amount)).filter(
            LedgerEntry.customer_id == c.id, LedgerEntry.entry_type == "charge"
        ).scalar() or 0
        payments = db.session.query(func.sum(LedgerEntry.amount)).filter(
            LedgerEntry.customer_id == c.id, LedgerEntry.entry_type == "payment"
        ).scalar() or 0
        
        last_sale = Sale.query.filter_by(customer_id=c.id).order_by(Sale.sale_date.desc()).first()
        sales_total = db.session.query(func.sum(Sale.total)).filter(Sale.customer_id == c.id).scalar() or 0
        sales_count = Sale.query.filter_by(customer_id=c.id).count()
        
        c_data.append({
            "obj": c,
            "balance": charges - payments,
            "total_bought": sales_total,
            "count": sales_count,
            "last_buy": last_sale.sale_date if last_sale else None,
            "last_pay": None # Could fetch last payment date too
        })

    # --- Hoja 1: Lista de Clientes ---
    ws1 = wb.active
    ws1.title = "Directorio Clientes"
    headers1 = ["Nombre", "Teléfono", "Email", "Nº Compras", "Total Comprado", "Ticket Promedio", "Última Compra", "Saldo Actual"]
    _apply_header_style(ws1, headers1, "059669")
    
    for d in c_data:
        avg = d["total_bought"] / d["count"] if d["count"] else 0
        ws1.append([
            d["obj"].name, d["obj"].phone, d["obj"].email, 
            d["count"], d["total_bought"], avg, d["last_buy"], d["balance"]
        ])
    _format_currency(ws1, [5, 6, 8])
    _auto_adjust_columns(ws1)

    # --- Hoja 2: Clientes VIP (Ranking) ---
    ws2 = wb.create_sheet("Clientes VIP")
    headers2 = ["Ranking", "Cliente", "Total Comprado", "Nº Compras", "Ticket Promedio"]
    _apply_header_style(ws2, headers2, "7C3AED")
    
    sorted_vip = sorted(c_data, key=lambda x: x["total_bought"], reverse=True)
    for idx, d in enumerate(sorted_vip[:100], 1): # Top 100
        avg = d["total_bought"] / d["count"] if d["count"] else 0
        ws2.append([idx, d["obj"].name, d["total_bought"], d["count"], avg])
        
    _format_currency(ws2, [3, 5])
    _auto_adjust_columns(ws2)

    # --- Hoja 3: Deudores ---
    ws3 = wb.create_sheet("Cartera Vencida")
    headers3 = ["Cliente", "Teléfono", "Saldo Pendiente", "Total Comprado", "Última Compra"]
    _apply_header_style(ws3, headers3, "DC2626")
    
    debtors = [d for d in c_data if d["balance"] > 1] # Filter > $1
    debtors.sort(key=lambda x: x["balance"], reverse=True)
    
    for d in debtors:
        ws3.append([d["obj"].name, d["obj"].phone, d["balance"], d["total_bought"], d["last_buy"]])
        
    _format_currency(ws3, [3, 4])
    _auto_adjust_columns(ws3)


def generate_products_report(wb, business_id, sale_query):
    """REPORTE 3 — PRODUCTOS"""
    products = Product.query.filter_by(business_id=business_id).all()
    
    # Sales stats for products
    p_sales = {}
    sales = sale_query.all()
    for s in sales:
        if not s.items or not isinstance(s.items, list):
            continue
            
        for item in s.items:
            if not isinstance(item, dict):
                continue
                
            pid = item.get("product_id")
            if pid:
                if pid not in p_sales: p_sales[pid] = {"qty": 0, "rev": 0, "tx": 0}
                p_sales[pid]["qty"] += float(item.get("qty", 0))
                p_sales[pid]["rev"] += float(item.get("total", 0))
                p_sales[pid]["tx"] += 1

    # --- Hoja 1: Catálogo Completo ---
    ws1 = wb.active
    ws1.title = "Catálogo"
    headers1 = ["Producto", "Categoría", "Precio", "Costo", "Stock", "Ventas Totales (Periodo)", "Ingresos (Periodo)"]
    _apply_header_style(ws1, headers1, "D97706")
    
    for p in products:
        stats = p_sales.get(p.id, {"qty": 0, "rev": 0})
        ws1.append([p.name, "General", p.price, p.cost, p.stock, stats["qty"], stats["rev"]])
        
    _format_currency(ws1, [3, 4, 7])
    _auto_adjust_columns(ws1)

    # --- Hoja 2: Más Vendidos ---
    ws2 = wb.create_sheet("Más Vendidos")
    headers2 = ["Producto", "Unidades Vendidas", "Ingresos Generados", "Nº Transacciones"]
    _apply_header_style(ws2, headers2, "EA580C")
    
    # Sort by qty
    p_list = []
    for p in products:
        if p.id in p_sales:
            p_list.append({**p_sales[p.id], "name": p.name})
            
    p_list.sort(key=lambda x: x["qty"], reverse=True)
    
    for p in p_list:
        ws2.append([p["name"], p["qty"], p["rev"], p["tx"]])
        
    _format_currency(ws2, [3])
    _auto_adjust_columns(ws2)

    # --- Hoja 3: Bajo Stock ---
    ws3 = wb.create_sheet("Alerta Stock")
    headers3 = ["Producto", "Stock Actual", "Mínimo Requerido", "Estado"]
    _apply_header_style(ws3, headers3, "B91C1C")
    
    low_stock = [p for p in products if p.stock <= p.low_stock_threshold]
    for p in low_stock:
        status = "AGOTADO" if p.stock <= 0 else "BAJO"
        ws3.append([p.name, p.stock, p.low_stock_threshold, status])
        
    _auto_adjust_columns(ws3)


def generate_finance_report(wb, business_id, start_date, end_date, sale_query, expense_query):
    """REPORTE 4 — FINANZAS"""
    
    # --- Hoja 1: Resumen Financiero ---
    ws1 = wb.active
    ws1.title = "Balance Financiero"
    
    sales_total = db.session.query(func.sum(Sale.total)).filter(Sale.business_id == business_id)
    expenses_total = db.session.query(func.sum(Expense.amount)).filter(Expense.business_id == business_id)
    
    if start_date:
        sales_total = sales_total.filter(Sale.sale_date >= start_date)
        expenses_total = expenses_total.filter(Expense.expense_date >= start_date)
    if end_date:
        sales_total = sales_total.filter(Sale.sale_date <= end_date)
        expenses_total = expenses_total.filter(Expense.expense_date <= end_date)
        
    val_sales = sales_total.scalar() or 0
    val_expenses = expenses_total.scalar() or 0
    val_profit = val_sales - val_expenses
    val_margin = (val_profit / val_sales * 100) if val_sales > 0 else 0
    
    headers1 = ["Concepto", "Monto", "%"]
    _apply_header_style(ws1, headers1, "000000")
    
    ws1.append(["Ingresos Totales (Ventas)", val_sales, "100%"])
    ws1.append(["Egresos Totales (Gastos)", val_expenses, f"{(val_expenses/val_sales*100) if val_sales else 0:.1f}%"])
    ws1.append(["Utilidad Neta", val_profit, f"{val_margin:.1f}%"])
    
    _format_currency(ws1, [2])
    _auto_adjust_columns(ws1)

    # --- Hoja 2: Gastos Detallados ---
    ws2 = wb.create_sheet("Gastos Detallados")
    headers2 = ["Fecha", "Categoría", "Descripción", "Monto"]
    _apply_header_style(ws2, headers2, "DC2626")
    
    expenses = expense_query.order_by(Expense.expense_date.desc()).all()
    for e in expenses:
        ws2.append([e.expense_date, e.category, e.description, e.amount])
        
    _format_currency(ws2, [4])
    _auto_adjust_columns(ws2)

    # --- Hoja 3: Flujo de Caja (Simple) ---
    ws3 = wb.create_sheet("Flujo de Caja")
    headers3 = ["Fecha", "Ingresos", "Egresos", "Balance Diario"]
    _apply_header_style(ws3, headers3, "059669")
    
    # Merge dates from sales and expenses
    flow = {}
    sales = sale_query.all()
    for s in sales:
        d = s.sale_date
        if d not in flow: flow[d] = {"in": 0, "out": 0}
        flow[d]["in"] += s.total
        
    for e in expenses:
        d = e.expense_date
        if d not in flow: flow[d] = {"in": 0, "out": 0}
        flow[d]["out"] += e.amount
        
    for d in sorted(flow.keys(), reverse=True):
        f = flow[d]
        ws3.append([d, f["in"], f["out"], f["in"] - f["out"]])
        
    _format_currency(ws3, [2, 3, 4])
    _auto_adjust_columns(ws3)


def export_combined_report(business_id, report_type, start_date=None, end_date=None):
    """Router principal para reportes avanzados"""
    from datetime import datetime as dt
    
    # Parse dates
    start = None
    end = None
    if start_date: 
        try:
            # Handle YYYY-MM-DD
            start = dt.strptime(str(start_date)[:10], "%Y-%m-%d").date()
        except Exception as e:
            print(f"Error parsing start_date: {start_date} -> {e}")
            start = None
                 
    if end_date: 
        try:
            # Handle YYYY-MM-DD
            end = dt.strptime(str(end_date)[:10], "%Y-%m-%d").date()
        except Exception as e:
             print(f"Error parsing end_date: {end_date} -> {e}")
             end = None

    wb = Workbook()
    
    # Remove default sheet if we are going to create specific ones, 
    # but generators usually start with wb.active. 
    # Let's let generators handle wb.active.

    # Base Queries
    sale_query = Sale.query.filter_by(business_id=business_id)
    expense_query = Expense.query.filter_by(business_id=business_id)
    
    if start: 
        sale_query = sale_query.filter(Sale.sale_date >= start)
        expense_query = expense_query.filter(Expense.expense_date >= start)
    if end: 
        sale_query = sale_query.filter(Sale.sale_date <= end)
        expense_query = expense_query.filter(Expense.expense_date <= end)

    filename_prefix = report_type

    if report_type == "general_business":
        generate_general_business_report(wb, business_id, start, end, sale_query, expense_query)
        filename_prefix = "REPORTE_GENERAL"
        
    elif report_type == "customers_full":
        generate_customers_report(wb, business_id)
        filename_prefix = "REPORTE_CLIENTES"
        
    elif report_type == "products_full":
        generate_products_report(wb, business_id, sale_query)
        filename_prefix = "REPORTE_PRODUCTOS"
        
    elif report_type == "finance_full":
        generate_finance_report(wb, business_id, start, end, sale_query, expense_query)
        filename_prefix = "REPORTE_FINANCIERO"
        
    else:
        # Fallback to simple sheet for backward compatibility or error
        # Ensure we have an active sheet to write the error
        if not wb.sheetnames:
            wb.create_sheet("Error")
        ws = wb.active
        ws.append(["Error", "Tipo de reporte no reconocido: " + str(report_type)])
    
    # Clean up empty default sheet if we created others
    if len(wb.sheetnames) > 1 and "Sheet" in wb.sheetnames:
        del wb["Sheet"]
        
    filename, filepath = _get_filename(filename_prefix, business_id)
    wb.save(filepath)
    return filepath

# --- Legacy Wrappers (Optional, to keep existing direct calls working) ---
def export_sales_excel(business_id, start_date=None, end_date=None):
    return export_combined_report(business_id, "general_business", start_date, end_date)

def export_expenses_excel(business_id, start_date=None, end_date=None):
    return export_combined_report(business_id, "finance_full", start_date, end_date)

def export_customers_excel(business_id):
    return export_combined_report(business_id, "customers_full")
