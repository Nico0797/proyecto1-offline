# Cuaderno - Export Service
# ============================================
"""
Servicios de exportación a Excel y backup/restore
"""
import os
import json
from datetime import datetime
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill
from backend.database import db
from backend.models import Business, Product, Customer, Sale, Expense, Payment, LedgerEntry


def export_sales_excel(business_id, start_date=None, end_date=None):
    """Exportar ventas a Excel"""
    from datetime import datetime as dt

    query = Sale.query.filter_by(business_id=business_id)

    if start_date:
        try:
            start = dt.strptime(start_date, "%Y-%m-%d").date()
            query = query.filter(Sale.sale_date >= start)
        except:
            pass

    if end_date:
        try:
            end = dt.strptime(end_date, "%Y-%m-%d").date()
            query = query.filter(Sale.sale_date <= end)
        except:
            pass

    sales = query.order_by(Sale.sale_date.desc()).all()

    # Create workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Ventas"

    # Headers
    headers = ["Fecha", "ID", "Cliente", "Items", "Subtotal", "Descuento", "Total", "Método", "Pagado", "Nota"]
    ws.append(headers)

    # Style headers
    header_fill = PatternFill(start_color="2A6DFD", end_color="2A6DFD", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")
    for cell in ws[1]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")

    # Get customers for name lookup
    customers = {c.id: c.name for c in Customer.query.filter_by(business_id=business_id).all()}

    # Add data
    for sale in sales:
        items_count = len(sale.items)
        customer_name = customers.get(sale.customer_id, "Sin cliente")

        ws.append([
            sale.sale_date.isoformat() if sale.sale_date else "",
            sale.id,
            customer_name,
            items_count,
            sale.subtotal,
            sale.discount,
            sale.total,
            sale.payment_method,
            "Sí" if sale.paid else "No",
            sale.note or ""
        ])

    # Auto-adjust column widths
    for column in ws.columns:
        max_length = 0
        column_letter = column[0].column_letter
        for cell in column:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        adjusted_width = min(max_length + 2, 50)
        ws.column_dimensions[column_letter].width = adjusted_width

    # Save file
    export_dir = os.getenv("EXPORT_DIR", "exports")
    os.makedirs(export_dir, exist_ok=True)
    
    filename = f"ventas_{business_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    filepath = os.path.join(export_dir, filename)
    
    wb.save(filepath)
    return filename


def export_expenses_excel(business_id, start_date=None, end_date=None):
    """Exportar gastos a Excel"""
    from datetime import datetime as dt

    query = Expense.query.filter_by(business_id=business_id)

    if start_date:
        try:
            start = dt.strptime(start_date, "%Y-%m-%d").date()
            query = query.filter(Expense.expense_date >= start)
        except:
            pass

    if end_date:
        try:
            end = dt.strptime(end_date, "%Y-%m-%d").date()
            query = query.filter(Expense.expense_date <= end)
        except:
            pass

    expenses = query.order_by(Expense.expense_date.desc()).all()

    # Create workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Gastos"

    # Headers
    headers = ["Fecha", "ID", "Categoría", "Monto", "Descripción"]
    ws.append(headers)

    # Style headers
    header_fill = PatternFill(start_color="22C55E", end_color="22C55E", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")
    for cell in ws[1]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")

    # Add data
    for expense in expenses:
        ws.append([
            expense.expense_date.isoformat() if expense.expense_date else "",
            expense.id,
            expense.category,
            expense.amount,
            expense.description or ""
        ])

    # Auto-adjust column widths
    for column in ws.columns:
        max_length = 0
        column_letter = column[0].column_letter
        for cell in column:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        adjusted_width = min(max_length + 2, 50)
        ws.column_dimensions[column_letter].width = adjusted_width

    # Save file
    export_dir = os.getenv("EXPORT_DIR", "exports")
    os.makedirs(export_dir, exist_ok=True)
    
    filename = f"gastos_{business_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    filepath = os.path.join(export_dir, filename)
    
    wb.save(filepath)
    return filename


def export_customers_excel(business_id):
    """Exportar clientes a Excel"""
    customers = Customer.query.filter_by(business_id=business_id).all()

    # Get balances
    customer_data = []
    for customer in customers:
        charges = db.session.query(db.func.sum(LedgerEntry.amount)).filter(
            LedgerEntry.customer_id == customer.id,
            LedgerEntry.entry_type == "charge"
        ).scalar() or 0

        payments = db.session.query(db.func.sum(LedgerEntry.amount)).filter(
            LedgerEntry.customer_id == customer.id,
            LedgerEntry.entry_type == "payment"
        ).scalar() or 0

        balance = charges - payments

        customer_data.append({
            "name": customer.name,
            "phone": customer.phone,
            "address": customer.address,
            "notes": customer.notes,
            "balance": balance,
            "active": customer.active
        })

    # Create workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Clientes"

    # Headers
    headers = ["Nombre", "Teléfono", "Dirección", "Notas", "Saldo", "Activo"]
    ws.append(headers)

    # Style headers
    header_fill = PatternFill(start_color="F59E0B", end_color="F59E0B", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")
    for cell in ws[1]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center")

    # Add data
    for c in customer_data:
        ws.append([
            c["name"],
            c["phone"] or "",
            c["address"] or "",
            c["notes"] or "",
            c["balance"],
            "Sí" if c["active"] else "No"
        ])

    # Auto-adjust column widths
    for column in ws.columns:
        max_length = 0
        column_letter = column[0].column_letter
        for cell in column:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        adjusted_width = min(max_length + 2, 50)
        ws.column_dimensions[column_letter].width = adjusted_width

    # Save file
    export_dir = os.getenv("EXPORT_DIR", "exports")
    os.makedirs(export_dir, exist_ok=True)
    
    filename = f"clientes_{business_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    filepath = os.path.join(export_dir, filename)
    
    wb.save(filepath)
    return filename


def create_backup_json(business_id):
    """Crear backup JSON del negocio"""
    business = Business.query.get(business_id)
    if not business:
        raise ValueError("Negocio no encontrado")

    backup = {
        "version": "1.0",
        "created_at": datetime.utcnow().isoformat(),
        "business": business.to_dict(),
        "products": [p.to_dict() for p in Product.query.filter_by(business_id=business_id).all()],
        "customers": [c.to_dict() for c in Customer.query.filter_by(business_id=business_id).all()],
        "sales": [s.to_dict() for s in Sale.query.filter_by(business_id=business_id).all()],
        "expenses": [e.to_dict() for e in Expense.query.filter_by(business_id=business_id).all()],
        "payments": [p.to_dict() for p in Payment.query.filter_by(business_id=business_id).all()],
    }

    # Save file
    backup_dir = os.getenv("BACKUP_DIR", "backups")
    os.makedirs(backup_dir, exist_ok=True)
    
    filename = f"backup_{business_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    filepath = os.path.join(backup_dir, filename)
    
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(backup, f, indent=2, ensure_ascii=False)

    return filename


def restore_from_backup(business_id, backup_data):
    """Restaurar desde backup JSON"""
    # Validate backup structure
    if "version" not in backup_data:
        raise ValueError("Backup inválido: falta versión")

    # Clear existing data
    Payment.query.filter_by(business_id=business_id).delete()
    Expense.query.filter_by(business_id=business_id).delete()
    Sale.query.filter_by(business_id=business_id).delete()
    Customer.query.filter_by(business_id=business_id).delete()
    Product.query.filter_by(business_id=business_id).delete()
    db.session.commit()

    # Restore products
    products_map = {}  # old_id -> new_id
    if "products" in backup_data:
        for p in backup_data["products"]:
            old_id = p.pop("id", None)
            product = Product(business_id=business_id, **p)
            db.session.add(product)
            db.session.flush()
            if old_id:
                products_map[old_id] = product.id

    # Restore customers
    customers_map = {}
    if "customers" in backup_data:
        for c in backup_data["customers"]:
            old_id = c.pop("id", None)
            customer = Customer(business_id=business_id, **c)
            db.session.add(customer)
            db.session.flush()
            if old_id:
                customers_map[old_id] = customer.id

    # Restore sales
    if "sales" in backup_data:
        for s in backup_data["sales"]:
            s.pop("id", None)
            if s.get("customer_id") and s["customer_id"] in customers_map:
                s["customer_id"] = customers_map[s["customer_id"]]
            # Remap product IDs in items
            if "items" in s:
                for item in s["items"]:
                    if item.get("product_id") in products_map:
                        item["product_id"] = products_map[item["product_id"]]
            sale = Sale(business_id=business_id, **s)
            db.session.add(sale)

    # Restore expenses
    if "expenses" in backup_data:
        for e in backup_data["expenses"]:
            e.pop("id", None)
            expense = Expense(business_id=business_id, **e)
            db.session.add(expense)

    db.session.commit()
