from __future__ import annotations

import argparse
import os
import sys
from datetime import date, datetime, time, timedelta
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import create_app
from backend.database import db
from backend.models import (
    BUSINESS_MODULE_KEYS,
    Business,
    BusinessModule,
    Customer,
    Debt,
    DebtPayment,
    Expense,
    Invoice,
    InvoiceItem,
    InvoicePayment,
    InvoiceSettings,
    Order,
    Payment,
    Product,
    QuickNote,
    Quote,
    QuoteItem,
    RawMaterial,
    RawMaterialMovement,
    RawPurchase,
    RawPurchaseItem,
    Recipe,
    RecipeConsumption,
    RecipeConsumptionItem,
    RecipeItem,
    RecurringExpense,
    Reminder,
    Sale,
    SalesGoal,
    Supplier,
    SupplierPayable,
    SupplierPayment,
    TreasuryAccount,
    User,
)

DEMO_ROLE = "Seed Demo"
DEFAULT_EMAIL = "encajapp45@gmail.com"
DEFAULT_BUSINESS_NAME = "Demo EnCaja"


def r2(value: float | int | None, digits: int = 2) -> float:
    return round(float(value or 0), digits)


def deep_merge(base: dict[str, Any], patch: dict[str, Any]) -> dict[str, Any]:
    result = dict(base or {})
    for key, value in (patch or {}).items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    return result


def ensure_user(email: str) -> User:
    user = User.query.filter_by(email=email, account_type="personal").order_by(User.id.asc()).first()
    if not user:
        raise ValueError(f"No existe una cuenta personal con email {email}")
    return user


def ensure_business(user: User, business_name: str | None) -> Business:
    business = None
    if business_name:
        business = Business.query.filter_by(user_id=user.id, name=business_name).first()
    if business is None:
        business = Business.query.filter_by(user_id=user.id).order_by(Business.id.asc()).first()
    if business is None:
        business = Business(
            user_id=user.id,
            name=business_name or DEFAULT_BUSINESS_NAME,
            currency="COP",
            timezone="America/Bogota",
            monthly_sales_goal=18500000,
            whatsapp_templates={},
            settings={},
        )
        db.session.add(business)
        db.session.flush()
    business.currency = business.currency or "COP"
    business.timezone = business.timezone or "America/Bogota"
    business.monthly_sales_goal = float(business.monthly_sales_goal or 18500000)
    business.whatsapp_templates = deep_merge(
        business.whatsapp_templates or {},
        {
            "sale_message": "Hola {customer_name}, te compartimos el resumen de tu compra demo.",
            "collection_message": "Hola {customer_name}, te recordamos tu saldo pendiente demo.",
        },
    )
    business.settings = deep_merge(
        business.settings or {},
        {
            "debt_term_days": 21,
            "receivables_due_soon_days": 5,
            "personalization": {
                "commercial_sections": {
                    "orders": True,
                    "invoices": True,
                    "sales_goals": True,
                }
            },
            "initial_setup": {
                "onboarding_completed": True,
                "highlighted_tools": ["Ventas", "Clientes", "Productos", "Cobros", "Gastos", "Bodega"],
                "simplicity_level": "guided",
            },
        },
    )
    return business


def ensure_modules(business: Business) -> None:
    existing = {row.module_key: row for row in BusinessModule.query.filter_by(business_id=business.id).all()}
    for module_key in BUSINESS_MODULE_KEYS:
        row = existing.get(module_key)
        if row:
            row.enabled = True
        else:
            db.session.add(BusinessModule(business_id=business.id, module_key=module_key, enabled=True, config=None))


def ensure_accounts(business: Business) -> dict[str, TreasuryAccount]:
    specs = [
        {"key": "cash", "name": "Caja principal demo", "type": "cash", "opening": 850000, "default": True},
        {"key": "transfer", "name": "Cuenta bancaria demo", "type": "bank", "opening": 4300000, "default": False},
        {"key": "nequi", "name": "Billetera Nequi demo", "type": "wallet", "opening": 620000, "default": False},
    ]
    existing = {row.payment_method_key or row.name.lower(): row for row in TreasuryAccount.query.filter_by(business_id=business.id).all()}
    accounts: dict[str, TreasuryAccount] = {}
    for spec in specs:
        account = existing.get(spec["key"])
        if not account:
            account = TreasuryAccount(
                business_id=business.id,
                name=spec["name"],
                account_type=spec["type"],
                payment_method_key=spec["key"],
                currency="COP",
                opening_balance=spec["opening"],
                is_default=spec["default"],
                is_active=True,
                notes="Seed demo",
            )
            db.session.add(account)
            db.session.flush()
        else:
            account.name = spec["name"]
            account.account_type = spec["type"]
            account.currency = "COP"
            account.opening_balance = spec["opening"]
            account.is_default = spec["default"]
            account.is_active = True
        accounts[spec["key"]] = account
    return accounts


def ensure_products(business: Business) -> dict[str, Product]:
    specs = [
        ("LATTE-DEMO", "Latte vainilla", "product", 13000, 5200, "und", 28, 8, "Cafe especial con leche cremosa.", "resale_stock"),
        ("CAPPU-DEMO", "Cappuccino doble", "product", 11500, 4300, "und", 31, 8, "Bebida estrella.", "resale_stock"),
        ("CROI-DEMO", "Croissant mantequilla", "product", 7900, 2800, "und", 18, 6, "Ideal para desayunos.", "resale_stock"),
        ("SAND-DEMO", "Sandwich pavo y queso", "product", 16800, 7200, "und", 11, 5, "Almuerzo rapido.", "resale_stock"),
        ("BOWL-DEMO", "Bowl de frutas premium", "product", 14900, 6100, "und", 9, 4, "Opcion fresca.", "resale_stock"),
        ("POST-DEMO", "Torta de chocolate", "product", 9200, 3100, "und", 15, 5, "Alta rotacion.", "resale_stock"),
        ("GRANO-DEMO", "Cafe en grano 340g", "product", 28500, 13200, "und", 20, 6, "Producto retail.", "resale_stock"),
        ("CATER-DEMO", "Servicio coffee break", "service", 180000, 72000, "serv", 0, 0, "Servicio corporativo.", "service"),
    ]
    existing = {row.sku: row for row in Product.query.filter_by(business_id=business.id).all() if row.sku}
    products: dict[str, Product] = {}
    for sku, name, type_, price, cost, unit, stock, threshold, description, fulfillment_mode in specs:
        product = existing.get(sku)
        if not product:
            product = Product(business_id=business.id, sku=sku)
            db.session.add(product)
        product.name = name
        product.description = description
        product.type = type_
        product.price = price
        product.cost = cost
        product.unit = unit
        product.stock = stock
        product.low_stock_threshold = threshold
        product.fulfillment_mode = fulfillment_mode
        product.active = True
        db.session.flush()
        products[sku] = product
    return products


def ensure_customers(business: Business) -> dict[str, Customer]:
    specs = [
        ("Ana Gomez Demo", "3001234567", "Cra 9 #74-20", "Compra semanal para oficina."),
        ("Carlos Ruiz Demo", "3015559081", "Cl 45 #18-22", "Cliente fiel de desayunos."),
        ("Studio Norte Demo", "3208891144", "Parque de la 93", "Empresa que compra coffee breaks."),
        ("Laura Mendoza Demo", "3157001133", "Cl 120 #7-18", "Prefiere pedidos por WhatsApp."),
        ("Restaurante La Plaza Demo", "3182224455", "Zona G", "Compra cafe en grano y postres."),
    ]
    existing = {row.name: row for row in Customer.query.filter_by(business_id=business.id).all()}
    customers: dict[str, Customer] = {}
    for name, phone, address, notes in specs:
        customer = existing.get(name)
        if not customer:
            customer = Customer(business_id=business.id, name=name)
            db.session.add(customer)
            db.session.flush()
        customer.phone = phone
        customer.address = address
        customer.notes = notes
        customer.active = True
        customer.created_by_name = "Demo"
        customer.created_by_role = DEMO_ROLE
        customers[name] = customer
    return customers


def sale_items(products: dict[str, Product], items: list[tuple[str, float]]) -> tuple[list[dict[str, Any]], float, float]:
    payload: list[dict[str, Any]] = []
    subtotal = 0.0
    total_cost = 0.0
    for sku, qty in items:
        product = products[sku]
        line_total = r2(float(product.price or 0) * qty)
        line_cost = r2(float(product.cost or 0) * qty)
        payload.append({
            "product_id": product.id,
            "name": product.name,
            "qty": qty,
            "unit_price": r2(product.price),
            "total": line_total,
            "cost_total": line_cost,
        })
        subtotal += line_total
        total_cost += line_cost
    return payload, r2(subtotal), r2(total_cost)


def ensure_sales_and_payments(business: Business, owner: User, customers: dict[str, Customer], products: dict[str, Product], accounts: dict[str, TreasuryAccount]) -> list[Sale]:
    specs = [
        {"days_ago": 1, "customer": "Ana Gomez Demo", "account": "cash", "note": "Seed demo combo mañana", "payment_method": "cash", "paid_amount": 30100, "items": [("LATTE-DEMO", 1), ("CROI-DEMO", 1), ("POST-DEMO", 1)]},
        {"days_ago": 3, "customer": "Laura Mendoza Demo", "account": "transfer", "note": "Seed demo brunch parcial", "payment_method": "credit", "paid_amount": 18000, "items": [("SAND-DEMO", 1), ("BOWL-DEMO", 1)]},
        {"days_ago": 5, "customer": "Studio Norte Demo", "account": "transfer", "note": "Seed demo coffee break corporativo", "payment_method": "credit", "paid_amount": 90000, "items": [("CATER-DEMO", 1)]},
        {"days_ago": 9, "customer": None, "account": "cash", "note": "Seed demo mostrador", "payment_method": "cash", "paid_amount": 32400, "items": [("LATTE-DEMO", 1), ("CAPPU-DEMO", 1), ("CROI-DEMO", 1)]},
        {"days_ago": 12, "customer": "Restaurante La Plaza Demo", "account": "nequi", "note": "Seed demo cafe retail", "payment_method": "transfer", "paid_amount": 57000, "items": [("GRANO-DEMO", 2)]},
    ]
    sales: list[Sale] = []
    for spec in specs:
        items, subtotal, total_cost = sale_items(products, spec["items"])
        sale_date = date.today() - timedelta(days=int(spec["days_ago"]))
        sale = Sale.query.filter_by(business_id=business.id, sale_date=sale_date, note=spec["note"]).first()
        if not sale:
            sale = Sale(business_id=business.id, sale_date=sale_date, note=spec["note"])
            db.session.add(sale)
        customer = customers.get(spec["customer"]) if spec["customer"] else None
        account = accounts.get(spec["account"])
        total = subtotal
        paid_amount = r2(spec["paid_amount"])
        sale.user_id = owner.id
        sale.customer_id = customer.id if customer else None
        sale.items = items
        sale.subtotal = subtotal
        sale.discount = 0.0
        sale.total = total
        sale.balance = r2(max(total - paid_amount, 0))
        sale.collected_amount = paid_amount
        sale.total_cost = total_cost
        sale.payment_method = spec["payment_method"]
        sale.treasury_account_id = account.id if account else None
        sale.paid = sale.balance <= 0
        sale.created_by_name = "Demo"
        sale.created_by_role = DEMO_ROLE
        db.session.flush()
        sales.append(sale)
        if customer and paid_amount > 0:
            payment = Payment.query.filter_by(business_id=business.id, sale_id=sale.id, payment_date=sale.sale_date, note=f"Abono inicial {spec['note']}").first()
            if not payment:
                payment = Payment(business_id=business.id, sale_id=sale.id, payment_date=sale.sale_date, note=f"Abono inicial {spec['note']}")
                db.session.add(payment)
            payment.customer_id = customer.id
            payment.amount = paid_amount
            payment.method = spec["payment_method"] if spec["payment_method"] != "credit" else "transfer"
            payment.treasury_account_id = account.id if account else None
            payment.created_by_name = "Demo"
            payment.created_by_role = DEMO_ROLE
    return sales


def ensure_orders(business: Business, customers: dict[str, Customer], products: dict[str, Product]) -> None:
    specs = [
        ("ORD-DEMO-001", "pending", "Ana Gomez Demo", 0, "Pedido pendiente de oficina", [("LATTE-DEMO", 6), ("CROI-DEMO", 6)]),
        ("ORD-DEMO-002", "in_progress", "Studio Norte Demo", 1, "Pedido corporativo en preparación", [("CATER-DEMO", 1), ("GRANO-DEMO", 2)]),
    ]
    for order_number, status, customer_name, days_ago, notes, items_spec in specs:
        items, subtotal, _ = sale_items(products, items_spec)
        order = Order.query.filter_by(order_number=order_number).first()
        if not order:
            order = Order(order_number=order_number)
            db.session.add(order)
        order.business_id = business.id
        order.customer_id = customers[customer_name].id
        order.status = status
        order.items = items
        order.subtotal = subtotal
        order.discount = 0.0
        order.total = subtotal
        order.notes = notes
        order.order_date = datetime.combine(date.today() - timedelta(days=days_ago), time(hour=10))


def ensure_quotes(business: Business, owner: User, customers: dict[str, Customer], products: dict[str, Product]) -> None:
    specs = [
        ("COT-DEMO-001", "sent", "Studio Norte Demo", 2, 10, "Propuesta para evento empresarial", [("CATER-DEMO", 1), ("GRANO-DEMO", 3)]),
        ("COT-DEMO-002", "draft", "Carlos Ruiz Demo", 0, 7, "Cotización de combo familiar", [("POST-DEMO", 4), ("CAPPU-DEMO", 2)]),
    ]
    for quote_code, status, customer_name, days_ago, expiry_days, notes, items_spec in specs:
        issue_date = date.today() - timedelta(days=days_ago)
        items, subtotal, _ = sale_items(products, items_spec)
        quote = Quote.query.filter_by(business_id=business.id, quote_code=quote_code).first()
        if not quote:
            quote = Quote(business_id=business.id, quote_code=quote_code)
            db.session.add(quote)
        quote.customer_id = customers[customer_name].id
        quote.status = status
        quote.issue_date = issue_date
        quote.expiry_date = issue_date + timedelta(days=expiry_days)
        quote.subtotal = subtotal
        quote.discount = 0.0
        quote.total = subtotal
        quote.notes = notes
        quote.terms = "Validez limitada."
        quote.created_by = owner.id
        db.session.flush()
        QuoteItem.query.filter_by(quote_id=quote.id).delete()
        for index, item in enumerate(items):
            db.session.add(QuoteItem(
                quote_id=quote.id,
                product_id=item["product_id"],
                description=item["name"],
                quantity=item["qty"],
                unit_price=item["unit_price"],
                subtotal=item["total"],
                fulfillment_mode=None,
                sort_order=index,
            ))


def ensure_invoices(business: Business, owner: User, customers: dict[str, Customer], products: dict[str, Product], accounts: dict[str, TreasuryAccount]) -> None:
    settings = InvoiceSettings.query.filter_by(business_id=business.id).first()
    if not settings:
        settings = InvoiceSettings(business_id=business.id)
        db.session.add(settings)
    settings.prefix = "FACDEMO"
    settings.brand_color = "#2563EB"
    settings.accent_color = "#0F172A"
    settings.footer_text = "Demo funcional EnCaja"
    settings.default_notes = "Factura de ejemplo"
    settings.default_terms = "Pago dentro del plazo acordado"
    specs = [
        ("FACDEMO-001", "sent", "Ana Gomez Demo", 6, 21, "credit", [("SAND-DEMO", 2), ("POST-DEMO", 2)], 18000),
        ("FACDEMO-002", "paid", "Restaurante La Plaza Demo", 10, 15, "transfer", [("GRANO-DEMO", 4)], 114000),
    ]
    for number, status, customer_name, days_ago, term_days, payment_method, items_spec, amount_paid in specs:
        issue_date = date.today() - timedelta(days=days_ago)
        due_date = issue_date + timedelta(days=term_days)
        items, subtotal, _ = sale_items(products, items_spec)
        invoice = Invoice.query.filter_by(business_id=business.id, invoice_number=number).first()
        if not invoice:
            invoice = Invoice(business_id=business.id, invoice_number=number)
            db.session.add(invoice)
        invoice.customer_id = customers[customer_name].id
        invoice.status = status
        invoice.issue_date = issue_date
        invoice.due_date = due_date
        invoice.currency = "COP"
        invoice.subtotal = subtotal
        invoice.discount_total = 0.0
        invoice.tax_total = 0.0
        invoice.total = subtotal
        invoice.notes = "Factura de ejemplo para explorar la funcionalidad"
        invoice.payment_method = payment_method
        invoice.created_by = owner.id
        invoice.paid_at = datetime.combine(issue_date + timedelta(days=1), time(hour=14)) if status == "paid" else None
        db.session.flush()
        InvoiceItem.query.filter_by(invoice_id=invoice.id).delete()
        for index, item in enumerate(items):
            db.session.add(InvoiceItem(
                invoice_id=invoice.id,
                product_id=item["product_id"],
                description=item["name"],
                quantity=item["qty"],
                unit_price=item["unit_price"],
                discount=0.0,
                tax_rate=0.0,
                line_total=item["total"],
                sort_order=index,
            ))
        if amount_paid > 0:
            payment = InvoicePayment.query.filter_by(invoice_id=invoice.id, event_type="payment", note=f"Pago demo {number}").first()
            if not payment:
                db.session.add(InvoicePayment(
                    invoice_id=invoice.id,
                    amount=r2(amount_paid),
                    payment_date=issue_date + timedelta(days=1),
                    payment_method="transfer",
                    treasury_account_id=accounts["transfer"].id,
                    event_type="payment",
                    note=f"Pago demo {number}",
                    created_by=owner.id,
                ))


def ensure_raw_materials(business: Business) -> dict[str, RawMaterial]:
    specs = [
        ("RAW-CAFE-DEMO", "Cafe en grano premium", "kg", 18, 4, 42000, "Base para bebidas calientes."),
        ("RAW-LECHE-DEMO", "Leche entera", "lt", 30, 8, 4500, "Insumo principal."),
        ("RAW-CHOC-DEMO", "Chocolate premium", "kg", 8, 2, 28000, "Usado en postres."),
        ("RAW-FRUTA-DEMO", "Mix de frutas", "kg", 14, 5, 16000, "Insumo para bowls."),
        ("RAW-EMPA-DEMO", "Empaques compostables", "und", 180, 40, 950, "Vasos y tapas."),
    ]
    existing = {row.sku: row for row in RawMaterial.query.filter_by(business_id=business.id).all() if row.sku}
    materials: dict[str, RawMaterial] = {}
    for sku, name, unit, current_stock, minimum_stock, reference_cost, notes in specs:
        material = existing.get(sku)
        if not material:
            material = RawMaterial(business_id=business.id, sku=sku)
            db.session.add(material)
        material.name = name
        material.unit = unit
        material.current_stock = float(material.current_stock or current_stock)
        material.minimum_stock = minimum_stock
        material.reference_cost = reference_cost
        material.notes = notes
        material.is_active = True
        db.session.flush()
        materials[sku] = material
    return materials


def ensure_suppliers(business: Business) -> dict[str, Supplier]:
    specs = [
        ("Cafe Premium SAS Demo", "Mariana Soto", "3007001122", "compras@cafepremium.demo", "Proveedor de cafe y cacao."),
        ("Fresh Market Demo", "Jorge Perez", "3205551188", "pedidos@freshmarket.demo", "Proveedor de lacteos y frutas."),
        ("Pack&Go Demo", "Liliana Diaz", "3108882233", "ventas@packgo.demo", "Proveedor de empaques."),
    ]
    existing = {row.name: row for row in Supplier.query.filter_by(business_id=business.id).all()}
    suppliers: dict[str, Supplier] = {}
    for name, contact, phone, email, notes in specs:
        supplier = existing.get(name)
        if not supplier:
            supplier = Supplier(business_id=business.id, name=name)
            db.session.add(supplier)
        supplier.contact_name = contact
        supplier.phone = phone
        supplier.email = email
        supplier.notes = notes
        supplier.is_active = True
        db.session.flush()
        suppliers[name] = supplier
    return suppliers


def create_stock_movement(owner: User, business: Business, material: RawMaterial, purchase: RawPurchase | None, consumption: RecipeConsumption | None, movement_type: str, quantity: float, previous_stock: float, new_stock: float, reference_cost: float, notes: str) -> RawMaterialMovement:
    movement = RawMaterialMovement(
        raw_material_id=material.id,
        business_id=business.id,
        created_by=owner.id,
        raw_purchase_id=purchase.id if purchase else None,
        recipe_consumption_id=consumption.id if consumption else None,
        movement_type=movement_type,
        quantity=quantity,
        previous_stock=previous_stock,
        new_stock=new_stock,
        reference_cost=reference_cost,
        notes=notes,
        created_by_name="Demo",
        created_by_role=DEMO_ROLE,
    )
    db.session.add(movement)
    db.session.flush()
    return movement


def ensure_raw_purchases(business: Business, owner: User, suppliers: dict[str, Supplier], materials: dict[str, RawMaterial], accounts: dict[str, TreasuryAccount]) -> None:
    specs = [
        {"number": "COMP-DEMO-001", "supplier": "Fresh Market Demo", "days_ago": 8, "items": [("RAW-LECHE-DEMO", 24, 4300), ("RAW-FRUTA-DEMO", 10, 15000)], "flow": "cash", "account": "transfer", "notes": "Compra demo de lacteos y frutas", "paid_amount": 0},
        {"number": "COMP-DEMO-002", "supplier": "Pack&Go Demo", "days_ago": 4, "items": [("RAW-EMPA-DEMO", 250, 880)], "flow": "payable", "account": "cash", "notes": "Compra demo de empaques a credito", "paid_amount": 90000},
    ]
    for spec in specs:
        if RawPurchase.query.filter_by(business_id=business.id, purchase_number=spec["number"]).first():
            continue
        purchase_date = date.today() - timedelta(days=spec["days_ago"])
        purchase = RawPurchase(
            business_id=business.id,
            supplier_id=suppliers[spec["supplier"]].id,
            purchase_number=spec["number"],
            status="confirmed",
            purchase_date=purchase_date,
            subtotal=0,
            total=0,
            notes=spec["notes"],
            created_by=owner.id,
        )
        db.session.add(purchase)
        db.session.flush()
        total = 0.0
        for sku, quantity, unit_cost in spec["items"]:
            material = materials[sku]
            subtotal = r2(quantity * unit_cost)
            total += subtotal
            db.session.add(RawPurchaseItem(raw_purchase_id=purchase.id, raw_material_id=material.id, description=material.name, quantity=quantity, unit_cost=unit_cost, subtotal=subtotal))
            previous_stock = float(material.current_stock or 0)
            new_stock = previous_stock + float(quantity)
            material.current_stock = new_stock
            material.reference_cost = unit_cost
            create_stock_movement(owner, business, material, purchase, None, "in", quantity, previous_stock, new_stock, unit_cost, f"Ingreso por {spec['number']}")
        purchase.subtotal = r2(total)
        purchase.total = r2(total)
        if spec["flow"] == "cash":
            db.session.add(Expense(
                business_id=business.id,
                expense_date=purchase_date,
                category="Insumos",
                amount=r2(total),
                description=f"Pago de compra {spec['number']}",
                source_type="purchase_payment",
                payment_method=spec["account"],
                treasury_account_id=accounts[spec["account"]].id,
                raw_purchase_id=purchase.id,
                created_by_name="Demo",
                created_by_role=DEMO_ROLE,
            ))
        else:
            paid_amount = r2(spec["paid_amount"])
            payable = SupplierPayable(
                business_id=business.id,
                supplier_id=purchase.supplier_id,
                raw_purchase_id=purchase.id,
                amount_total=r2(total),
                amount_paid=paid_amount,
                balance_due=r2(max(total - paid_amount, 0)),
                status="partial" if paid_amount > 0 else "pending",
                due_date=purchase_date + timedelta(days=15),
                notes=f"Cuenta por pagar generada por {spec['number']}",
            )
            db.session.add(payable)
            db.session.flush()
            if paid_amount > 0:
                supplier_payment = SupplierPayment(
                    business_id=business.id,
                    supplier_id=purchase.supplier_id,
                    supplier_payable_id=payable.id,
                    amount=paid_amount,
                    payment_date=purchase_date + timedelta(days=2),
                    method=spec["account"],
                    treasury_account_id=accounts[spec["account"]].id,
                    reference=f"Pago parcial {spec['number']}",
                    notes="Abono inicial compra demo",
                    created_by=owner.id,
                    created_by_name="Demo",
                    created_by_role=DEMO_ROLE,
                )
                db.session.add(supplier_payment)
                db.session.flush()
                db.session.add(Expense(
                    business_id=business.id,
                    expense_date=supplier_payment.payment_date,
                    category="Proveedores",
                    amount=paid_amount,
                    description=f"Abono proveedor {spec['number']}",
                    source_type="supplier_payment",
                    payment_method=spec["account"],
                    treasury_account_id=accounts[spec["account"]].id,
                    raw_purchase_id=purchase.id,
                    supplier_payable_id=payable.id,
                    supplier_payment_id=supplier_payment.id,
                    created_by_name="Demo",
                    created_by_role=DEMO_ROLE,
                ))


def ensure_recipe_and_consumption(business: Business, owner: User, products: dict[str, Product], materials: dict[str, RawMaterial]) -> None:
    recipe = Recipe.query.filter_by(business_id=business.id, name="Receta demo latte vainilla").first()
    if not recipe:
        recipe = Recipe(business_id=business.id, product_id=products["LATTE-DEMO"].id, name="Receta demo latte vainilla")
        db.session.add(recipe)
        db.session.flush()
    recipe.product_id = products["LATTE-DEMO"].id
    recipe.notes = "Receta de ejemplo"
    recipe.is_active = True
    RecipeItem.query.filter_by(recipe_id=recipe.id).delete()
    recipe_items = [
        (materials["RAW-CAFE-DEMO"], 0.03, "Cafe por taza"),
        (materials["RAW-LECHE-DEMO"], 0.25, "Leche por taza"),
        (materials["RAW-EMPA-DEMO"], 1, "Vaso y tapa"),
    ]
    for index, (material, quantity_required, notes) in enumerate(recipe_items):
        db.session.add(RecipeItem(recipe_id=recipe.id, raw_material_id=material.id, quantity_required=quantity_required, notes=notes, sort_order=index))


def ensure_expenses(business: Business, accounts: dict[str, TreasuryAccount]) -> None:
    specs = [
        (1, "Nomina", 420000, "Pago turno tarde baristas", "transfer"),
        (2, "Servicios", 165000, "Energia y agua del local", "transfer"),
        (4, "Marketing", 98000, "Campaña de Instagram weekend brunch", "nequi"),
        (6, "Insumos", 248000, "Compra adicional de leche y frutas", "cash"),
        (10, "Arriendo", 2500000, "Canon mensual del local principal", "transfer"),
    ]
    for days_ago, category, amount, description, account_key in specs:
        expense_date = date.today() - timedelta(days=days_ago)
        expense = Expense.query.filter_by(business_id=business.id, expense_date=expense_date, category=category, description=description).first()
        if not expense:
            expense = Expense(business_id=business.id, expense_date=expense_date, category=category, description=description)
            db.session.add(expense)
        expense.amount = amount
        expense.source_type = "manual"
        expense.payment_method = account_key
        expense.treasury_account_id = accounts[account_key].id
        expense.created_by_name = "Demo"
        expense.created_by_role = DEMO_ROLE


def ensure_recurring_expenses(business: Business) -> None:
    specs = [
        ("Internet local demo", 129000, 5, "monthly", "Servicios", "cash", None),
        ("Software y suscripciones demo", 89000, 12, "monthly", "Tecnologia", "cash", None),
        ("Leasing cafetera demo", 560000, 18, "monthly", "Prestamos", "payable", "Financiera Café Equipos"),
    ]
    existing = {row.name: row for row in RecurringExpense.query.filter_by(business_id=business.id).all()}
    for name, amount, due_day, frequency, category, flow, creditor_name in specs:
        recurring = existing.get(name)
        if not recurring:
            recurring = RecurringExpense(business_id=business.id, name=name)
            db.session.add(recurring)
        recurring.amount = amount
        recurring.due_day = due_day
        recurring.frequency = frequency
        recurring.next_due_date = date.today().replace(day=min(due_day, 28)) + timedelta(days=30)
        recurring.category = category
        recurring.payment_flow = flow
        recurring.creditor_name = creditor_name
        recurring.is_active = True


def ensure_debts(business: Business, accounts: dict[str, TreasuryAccount]) -> None:
    today = date.today()
    debt = Debt.query.filter_by(business_id=business.id, name="Credito horno industrial demo").first()
    if not debt:
        debt = Debt(business_id=business.id, name="Credito horno industrial demo")
        db.session.add(debt)
    debt.creditor_name = "Banco Aliado Demo"
    debt.category = "Prestamos"
    debt.total_amount = 6800000
    debt.balance_due = 2140000
    debt.start_date = today - timedelta(days=120)
    debt.due_date = today + timedelta(days=9)
    debt.frequency = "monthly"
    debt.installments = 12
    debt.estimated_installment = 580000
    debt.status = "partial"
    debt.origin_type = "manual"
    debt.notes = "Financia ampliacion de linea premium"
    debt.reminder_enabled = True
    db.session.flush()
    payment = DebtPayment.query.filter_by(debt_id=debt.id, amount=466000).first()
    if not payment:
        payment = DebtPayment(debt_id=debt.id, amount=466000, payment_date=today - timedelta(days=21), payment_method="transfer", treasury_account_id=accounts["transfer"].id, note="Abono demo registrado")
        db.session.add(payment)
        db.session.flush()
    if not Expense.query.filter_by(business_id=business.id, debt_payment_id=payment.id).first():
        db.session.add(Expense(
            business_id=business.id,
            expense_date=payment.payment_date,
            category="Prestamos",
            amount=payment.amount,
            description="Abono demo a deuda financiera",
            source_type="debt_payment",
            payment_method=payment.payment_method,
            treasury_account_id=payment.treasury_account_id,
            debt_id=debt.id,
            debt_payment_id=payment.id,
            created_by_name="Demo",
            created_by_role=DEMO_ROLE,
        ))


def ensure_reminders_notes_goals(business: Business, owner: User) -> None:
    for note_text in [
        "Revisar el desempeño de ventas corporativas esta semana.",
        "Validar productos con stock bajo y rotación lenta.",
    ]:
        if not QuickNote.query.filter_by(business_id=business.id, note=note_text).first():
            db.session.add(QuickNote(business_id=business.id, note=note_text))
    today = date.today()
    reminders = [
        ("Confirmar pedido Studio Norte", "Revisar si el cliente amplía el coffee break del jueves.", 1, "high", True),
        ("Revisar stock de croissants", "Producto de alta rotación en la tarde; validar reposición.", 2, "medium", False),
        ("Actualizar promoción de cafe en grano", "Medir si el bundle con postre mejora el ticket promedio.", 4, "medium", False),
    ]
    for title, content, due_in_days, priority, pinned in reminders:
        reminder = Reminder.query.filter_by(business_id=business.id, title=title).first()
        if not reminder:
            reminder = Reminder(business_id=business.id, title=title)
            db.session.add(reminder)
        reminder.content = content
        reminder.priority = priority
        reminder.due_date = (today + timedelta(days=due_in_days)).isoformat()
        reminder.due_time = "09:00"
        reminder.tags = ["demo", "seed"]
        reminder.status = "active"
        reminder.pinned = pinned
        reminder.created_by_name = "Demo"
        reminder.created_by_role = DEMO_ROLE
    goal = SalesGoal.query.filter_by(business_id=business.id, title="Meta mensual demo").first()
    start_date = today.replace(day=1)
    end_date = (start_date + timedelta(days=32)).replace(day=1) - timedelta(days=1)
    if not goal:
        goal = SalesGoal(business_id=business.id, title="Meta mensual demo", user_id=owner.id)
        db.session.add(goal)
    goal.description = "Mantener ritmo de ventas y mejorar ticket promedio del canal corporativo"
    goal.target_amount = 18500000
    goal.start_date = start_date
    goal.end_date = end_date
    goal.status = "active"


def seed_account_demo(email: str, business_name: str | None) -> tuple[User, Business]:
    user = ensure_user(email)
    business = ensure_business(user, business_name)
    ensure_modules(business)
    accounts = ensure_accounts(business)
    products = ensure_products(business)
    customers = ensure_customers(business)
    ensure_sales_and_payments(business, user, customers, products, accounts)
    ensure_orders(business, customers, products)
    ensure_quotes(business, user, customers, products)
    ensure_invoices(business, user, customers, products, accounts)
    materials = ensure_raw_materials(business)
    suppliers = ensure_suppliers(business)
    ensure_raw_purchases(business, user, suppliers, materials, accounts)
    ensure_recipe_and_consumption(business, user, products, materials)
    ensure_expenses(business, accounts)
    ensure_recurring_expenses(business)
    ensure_debts(business, accounts)
    ensure_reminders_notes_goals(business, user)
    db.session.commit()
    return user, business


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", default=DEFAULT_EMAIL)
    parser.add_argument("--business-name", default=None)
    args = parser.parse_args()
    app = create_app()
    with app.app_context():
        user, business = seed_account_demo(args.email, args.business_name)
        print(f"OK demo cargada en {user.email} | negocio {business.name} | business_id={business.id}")


if __name__ == "__main__":
    main()
