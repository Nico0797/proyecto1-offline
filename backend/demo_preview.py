from __future__ import annotations

import json
import secrets
from datetime import date, datetime, timedelta
from typing import Any

from flask import request

from backend.database import db
from backend.models import (
    AppSettings,
    Business,
    BusinessModule,
    Customer,
    Debt,
    DebtPayment,
    Expense,
    Payment,
    Product,
    Reminder,
    Sale,
    SalesGoal,
    TreasuryAccount,
    User,
)


DEMO_PREVIEW_HEADER = "X-Demo-Preview"
DEMO_PREVIEW_KEY_PREFIX = "demo_preview_session:"
DEMO_PREVIEW_OWNER_KEY = "demo_preview_owner_id"
DEMO_PREVIEW_BUSINESS_KEY = "demo_preview_business_id"
DEMO_PREVIEW_OWNER_EMAIL = "demo-preview@encaja.local"
DEMO_PREVIEW_BUSINESS_NAME = "Aurora Market Demo"
DEMO_PREVIEW_ROLE_NAME = "Vista previa"

PREVIEW_WRITE_ALLOWLIST_PREFIXES = (
    "/api/account/preview/",
    "/api/auth/logout",
    "/api/auth/refresh",
    "/api/billing/checkout",
    "/api/billing/confirm-wompi",
    "/api/billing/pricing",
    "/api/billing/status",
    "/api/billing/portal",
    "/api/billing/wompi-acceptance",
)


def _setting_value(key: str) -> str | None:
    row = AppSettings.query.filter_by(key=key).first()
    return row.value if row else None


def _write_setting(key: str, value: str | None) -> None:
    row = AppSettings.query.filter_by(key=key).first()
    if row:
        row.value = value
        return
    db.session.add(AppSettings(key=key, value=value))


def _preview_session_key(user_id: int) -> str:
    return f"{DEMO_PREVIEW_KEY_PREFIX}{int(user_id)}"


def _build_demo_settings() -> dict[str, Any]:
    return {
        "debt_term_days": 21,
        "receivables_due_soon_days": 5,
        "personalization": {
            "commercial_sections": {
                "invoices": True,
                "orders": True,
                "sales_goals": True,
            },
        },
        "initial_setup": {
            "version": 1,
            "onboarding_profile": {
                "business_category": "simple_store",
                "inventory_mode": "catalog_with_stock",
                "sales_flow": "counter_and_whatsapp",
                "home_focus": "sales_and_cash",
                "team_mode": "owner_only",
                "documents_mode": "quotes_and_invoices",
                "operations_mode": "daily_control",
            },
            "onboarding_completed": True,
            "onboarding_completed_at": datetime.utcnow().isoformat(),
            "initial_modules_applied": [
                "sales",
                "customers",
                "products",
                "accounts_receivable",
                "reports",
                "quotes",
                "raw_inventory",
            ],
            "initial_home_focus": "sales_and_cash",
            "initial_dashboard_tab": "hoy",
            "recommended_tutorials": [],
            "simplicity_level": "guided",
            "highlighted_tools": ["Ventas", "Clientes", "Productos", "Cobros", "Reportes"],
            "hidden_tools": [],
        },
    }


def _ensure_demo_owner() -> User:
    owner_id = _setting_value(DEMO_PREVIEW_OWNER_KEY)
    owner = None
    if owner_id:
        try:
            owner = User.query.get(int(owner_id))
        except (TypeError, ValueError):
            owner = None
    if owner is None:
        owner = User.query.filter_by(email=DEMO_PREVIEW_OWNER_EMAIL, account_type="personal").first()
    if owner is None:
        owner = User(
            email=DEMO_PREVIEW_OWNER_EMAIL,
            name="Equipo Demo EnCaja",
            plan="business",
            account_type="personal",
            email_verified=True,
            is_active=True,
            membership_plan="business_manual",
            membership_start=datetime.utcnow(),
            membership_end=datetime.utcnow() + timedelta(days=3650),
            membership_auto_renew=False,
        )
        owner.set_password(secrets.token_urlsafe(24))
        db.session.add(owner)
        db.session.flush()
    else:
        owner.plan = "business"
        owner.email_verified = True
        owner.is_active = True
        owner.membership_plan = "business_manual"
        owner.membership_start = owner.membership_start or datetime.utcnow()
        owner.membership_end = owner.membership_end or (datetime.utcnow() + timedelta(days=3650))
        owner.membership_auto_renew = False
    _write_setting(DEMO_PREVIEW_OWNER_KEY, str(owner.id))
    return owner


def _ensure_demo_business(owner: User) -> Business:
    business_id = _setting_value(DEMO_PREVIEW_BUSINESS_KEY)
    business = None
    if business_id:
        try:
            business = Business.query.get(int(business_id))
        except (TypeError, ValueError):
            business = None
    if business is None:
        business = Business.query.filter_by(user_id=owner.id, name=DEMO_PREVIEW_BUSINESS_NAME).first()
    if business is None:
        business = Business(
            user_id=owner.id,
            name=DEMO_PREVIEW_BUSINESS_NAME,
            currency="COP",
            timezone="America/Bogota",
            monthly_sales_goal=18500000,
            whatsapp_templates={
                "sale_message": "Hola {customer_name}, te compartimos el resumen de tu compra en Aurora Market Demo.",
                "collection_message": "Hola {customer_name}, este es un recordatorio amistoso de tu saldo pendiente en Aurora Market Demo.",
            },
            settings=_build_demo_settings(),
        )
        db.session.add(business)
        db.session.flush()
    else:
        business.currency = business.currency or "COP"
        business.timezone = business.timezone or "America/Bogota"
        business.monthly_sales_goal = business.monthly_sales_goal or 18500000
        business.settings = _build_demo_settings()
        business.whatsapp_templates = business.whatsapp_templates or {
            "sale_message": "Hola {customer_name}, te compartimos el resumen de tu compra en Aurora Market Demo.",
            "collection_message": "Hola {customer_name}, este es un recordatorio amistoso de tu saldo pendiente en Aurora Market Demo.",
        }
    _write_setting(DEMO_PREVIEW_BUSINESS_KEY, str(business.id))
    return business


def _ensure_demo_modules(business: Business) -> None:
    existing = {
        row.module_key: row
        for row in BusinessModule.query.filter_by(business_id=business.id).all()
    }
    for module_key in (
        "sales",
        "customers",
        "products",
        "accounts_receivable",
        "reports",
        "quotes",
        "raw_inventory",
    ):
        row = existing.get(module_key)
        if row:
            row.enabled = True
        else:
            db.session.add(
                BusinessModule(
                    business_id=business.id,
                    module_key=module_key,
                    enabled=True,
                    config=None,
                )
            )


def _ensure_demo_accounts(business: Business) -> dict[str, TreasuryAccount]:
    existing = {
        row.payment_method_key or row.name.lower(): row
        for row in TreasuryAccount.query.filter_by(business_id=business.id).all()
    }
    account_specs = [
        {
            "key": "cash",
            "name": "Caja principal",
            "account_type": "cash",
            "opening_balance": 1250000,
            "is_default": True,
        },
        {
            "key": "transfer",
            "name": "Bancolombia negocios",
            "account_type": "bank",
            "opening_balance": 4800000,
            "is_default": False,
        },
        {
            "key": "nequi",
            "name": "Billetera Nequi",
            "account_type": "wallet",
            "opening_balance": 740000,
            "is_default": False,
        },
    ]
    accounts: dict[str, TreasuryAccount] = {}
    for spec in account_specs:
        account = existing.get(spec["key"])
        if account is None:
            account = TreasuryAccount(
                business_id=business.id,
                name=spec["name"],
                account_type=spec["account_type"],
                payment_method_key=spec["key"],
                currency="COP",
                opening_balance=spec["opening_balance"],
                is_default=spec["is_default"],
                is_active=True,
                notes="Cuenta de demostracion para vista previa.",
            )
            db.session.add(account)
            db.session.flush()
        else:
            account.name = spec["name"]
            account.account_type = spec["account_type"]
            account.currency = "COP"
            account.opening_balance = spec["opening_balance"]
            account.is_default = spec["is_default"]
            account.is_active = True
        accounts[spec["key"]] = account
    return accounts


def _ensure_demo_products(business: Business) -> dict[str, Product]:
    product_specs = [
        ("LATTE", "Latte vainilla", "product", 13000, 5200, "und", 38, 8, "Cafe especial con leche cremosa."),
        ("CAPPU", "Cappuccino doble", "product", 11500, 4300, "und", 41, 8, "Bebida estrella de la manana."),
        ("CROI", "Croissant mantequilla", "product", 7900, 2800, "und", 16, 6, "Acompana desayunos y combos."),
        ("SAND", "Sandwich pavo y queso", "product", 16800, 7200, "und", 12, 5, "Ideal para almuerzo rapido."),
        ("BOWL", "Bowl de frutas premium", "product", 14900, 6100, "und", 9, 4, "Opcion fresca y saludable."),
        ("POST", "Torta de chocolate", "product", 9200, 3100, "und", 14, 5, "Alta rotacion en tardes."),
        ("GRANO", "Cafe en grano 340g", "product", 28500, 13200, "und", 22, 6, "Ticket alto para venta retail."),
        ("CATER", "Servicio coffee break", "service", 180000, 72000, "serv", 0, 0, "Servicio empresarial recurrente."),
    ]
    existing = {row.sku: row for row in Product.query.filter_by(business_id=business.id).all() if row.sku}
    products: dict[str, Product] = {}
    for sku, name, type_, price, cost, unit, stock, threshold, description in product_specs:
        product = existing.get(sku)
        if product is None:
            product = Product(
                business_id=business.id,
                sku=sku,
                name=name,
                description=description,
                type=type_,
                price=price,
                cost=cost,
                unit=unit,
                stock=stock,
                low_stock_threshold=threshold,
                active=True,
            )
            db.session.add(product)
            db.session.flush()
        else:
            product.name = name
            product.description = description
            product.type = type_
            product.price = price
            product.cost = cost
            product.unit = unit
            product.stock = stock
            product.low_stock_threshold = threshold
            product.active = True
        products[sku] = product
    return products


def _ensure_demo_customers(business: Business) -> dict[str, Customer]:
    customer_specs = [
        ("Ana Gomez", "3001234567", "Cra 9 #74-20", "Compra semanal para oficina."),
        ("Carlos Ruiz", "3015559081", "Cl 45 #18-22", "Cliente fiel de desayunos."),
        ("Studio Norte", "3208891144", "Parque de la 93", "Empresa que compra coffee breaks."),
        ("Laura Mendoza", "3157001133", "Cl 120 #7-18", "Prefiere pedidos por WhatsApp."),
        ("Restaurante La Plaza", "3182224455", "Zona G", "Compra cafe en grano y postres."),
    ]
    existing = {row.name: row for row in Customer.query.filter_by(business_id=business.id).all()}
    customers: dict[str, Customer] = {}
    for name, phone, address, notes in customer_specs:
        customer = existing.get(name)
        if customer is None:
            customer = Customer(
                business_id=business.id,
                name=name,
                phone=phone,
                address=address,
                notes=notes,
                active=True,
                created_by_name="Demo",
                created_by_role=DEMO_PREVIEW_ROLE_NAME,
            )
            db.session.add(customer)
            db.session.flush()
        else:
            customer.phone = phone
            customer.address = address
            customer.notes = notes
            customer.active = True
        customers[name] = customer
    return customers


def _upsert_sale(
    business: Business,
    owner: User,
    customer: Customer | None,
    account: TreasuryAccount | None,
    *,
    sale_date: date,
    note: str,
    items: list[dict[str, Any]],
    subtotal: float,
    discount: float,
    total: float,
    paid_amount: float,
    payment_method: str,
) -> Sale:
    balance = round(max(total - paid_amount, 0), 2)
    total_cost = round(sum(float(item.get("cost_total") or 0) for item in items), 2)

    sale = Sale.query.filter_by(
        business_id=business.id,
        sale_date=sale_date,
        note=note,
    ).first()
    if sale is None:
        sale = Sale(
            business_id=business.id,
            user_id=owner.id,
            customer_id=customer.id if customer else None,
            sale_date=sale_date,
            items=items,
            subtotal=subtotal,
            discount=discount,
            total=total,
            balance=balance,
            collected_amount=paid_amount,
            total_cost=total_cost,
            payment_method=payment_method,
            treasury_account_id=account.id if account else None,
            paid=balance <= 0,
            note=note,
            created_by_name="Demo",
            created_by_role=DEMO_PREVIEW_ROLE_NAME,
        )
        db.session.add(sale)
    else:
        sale.customer_id = customer.id if customer else None

    sale.items = items
    sale.subtotal = subtotal
    sale.discount = discount
    sale.total = total
    sale.balance = balance
    sale.collected_amount = paid_amount
    sale.total_cost = total_cost
    sale.payment_method = payment_method
    sale.treasury_account_id = account.id if account else None
    sale.paid = balance <= 0
    sale.created_by_name = "Demo"
    sale.created_by_role = DEMO_PREVIEW_ROLE_NAME
    return sale


def _upsert_payment(
    business: Business,
    customer: Customer,
    sale: Sale,
    account: TreasuryAccount | None,
    *,
    payment_date: date,
    amount: float,
    note: str,
    method: str,
) -> Payment:
    payment = Payment.query.filter_by(
        business_id=business.id,
        sale_id=sale.id,
        payment_date=payment_date,
        note=note,
    ).first()
    if payment is None:
        payment = Payment(
            business_id=business.id,
            customer_id=customer.id,
            sale_id=sale.id,
            payment_date=payment_date,
            amount=amount,
            note=note,
            method=method,
            treasury_account_id=account.id if account else None,
            created_by_name="Demo",
            created_by_role=DEMO_PREVIEW_ROLE_NAME,
        )
        db.session.add(payment)
    else:
        payment.customer_id = customer.id
        payment.amount = amount
        payment.method = method
        payment.treasury_account_id = account.id if account else None
        payment.note = note
    return payment


def _ensure_demo_sales(
    business: Business,
    owner: User,
    customers: dict[str, Customer],
    products: dict[str, Product],
    accounts: dict[str, TreasuryAccount],
) -> None:
    today = date.today()
    sales_specs = [
        {
            "days_ago": 1,
            "customer": "Ana Gomez",
            "account": "cash",
            "note": "Demo morning combo",
            "payment_method": "cash",
            "paid_amount": 30100,
            "items": [
                {"sku": "LATTE", "qty": 1},
                {"sku": "CROI", "qty": 1},
                {"sku": "POST", "qty": 1},
            ],
        },
        {
            "days_ago": 2,
            "customer": "Carlos Ruiz",
            "account": "nequi",
            "note": "Demo afternoon visit",
            "payment_method": "transfer",
            "paid_amount": 11500,
            "items": [{"sku": "CAPPU", "qty": 1}],
        },
        {
            "days_ago": 3,
            "customer": "Laura Mendoza",
            "account": "transfer",
            "note": "Demo pending brunch",
            "payment_method": "credit",
            "paid_amount": 18000,
            "items": [
                {"sku": "SAND", "qty": 1},
                {"sku": "BOWL", "qty": 1},
            ],
        },
        {
            "days_ago": 5,
            "customer": "Restaurante La Plaza",
            "account": "transfer",
            "note": "Demo wholesale beans",
            "payment_method": "transfer",
            "paid_amount": 28500,
            "items": [{"sku": "GRANO", "qty": 1}],
        },
        {
            "days_ago": 7,
            "customer": "Studio Norte",
            "account": "transfer",
            "note": "Demo corporate coffee break",
            "payment_method": "credit",
            "paid_amount": 90000,
            "items": [{"sku": "CATER", "qty": 1}],
        },
        {
            "days_ago": 9,
            "customer": None,
            "account": "cash",
            "note": "Demo walk-in breakfast",
            "payment_method": "cash",
            "paid_amount": 32400,
            "items": [
                {"sku": "LATTE", "qty": 1},
                {"sku": "CAPPU", "qty": 1},
                {"sku": "CROI", "qty": 1},
            ],
        },
        {
            "days_ago": 12,
            "customer": "Ana Gomez",
            "account": "cash",
            "note": "Demo second office order",
            "payment_method": "cash",
            "paid_amount": 26000,
            "items": [{"sku": "SAND", "qty": 1}, {"sku": "POST", "qty": 1}],
        },
        {
            "days_ago": 14,
            "customer": "Carlos Ruiz",
            "account": "nequi",
            "note": "Demo pending sweets",
            "payment_method": "credit",
            "paid_amount": 5000,
            "items": [{"sku": "POST", "qty": 2}, {"sku": "CAPPU", "qty": 1}],
        },
        {
            "days_ago": 18,
            "customer": "Studio Norte",
            "account": "transfer",
            "note": "Demo recurring office restock",
            "payment_method": "transfer",
            "paid_amount": 57000,
            "items": [{"sku": "GRANO", "qty": 2}],
        },
    ]

    for spec in sales_specs:
        sale_items: list[dict[str, Any]] = []
        subtotal = 0.0
        for item_spec in spec["items"]:
            product = products[item_spec["sku"]]
            qty = float(item_spec["qty"])
            line_total = round(float(product.price or 0) * qty, 2)
            line_cost = round(float(product.cost or 0) * qty, 2)
            subtotal += line_total
            sale_items.append(
                {
                    "product_id": product.id,
                    "name": product.name,
                    "qty": qty,
                    "unit_price": float(product.price or 0),
                    "total": line_total,
                    "cost_total": line_cost,
                }
            )

        total = round(subtotal, 2)
        sale = _upsert_sale(
            business,
            owner,
            customers.get(spec["customer"]) if spec["customer"] else None,
            accounts.get(spec["account"]),
            sale_date=today - timedelta(days=int(spec["days_ago"])),
            note=spec["note"],
            items=sale_items,
            subtotal=round(subtotal, 2),
            discount=0.0,
            total=total,
            paid_amount=round(float(spec["paid_amount"]), 2),
            payment_method=spec["payment_method"],
        )

        if sale.customer_id and sale.collected_amount and sale.collected_amount > 0:
            _upsert_payment(
                business,
                customers[spec["customer"]],
                sale,
                accounts.get(spec["account"]),
                payment_date=sale.sale_date,
                amount=sale.collected_amount,
                note=f"Abono inicial {spec['note']}",
                method=spec["payment_method"] if spec["payment_method"] != "credit" else "transfer",
            )


def _ensure_demo_expenses(business: Business, accounts: dict[str, TreasuryAccount]) -> None:
    today = date.today()
    expense_specs = [
        (1, "Nomina", 420000, "Pago turno tarde baristas", "transfer"),
        (2, "Servicios", 165000, "Energia y agua del local", "transfer"),
        (4, "Marketing", 98000, "Campana de Instagram weekend brunch", "nequi"),
        (6, "Insumos", 248000, "Compra adicional de leche y frutas", "cash"),
        (10, "Arriendo", 2500000, "Canon mensual local principal", "transfer"),
    ]
    for days_ago, category, amount, description, account_key in expense_specs:
        expense_date = today - timedelta(days=days_ago)
        expense = Expense.query.filter_by(
            business_id=business.id,
            expense_date=expense_date,
            category=category,
            description=description,
        ).first()
        if expense is None:
            expense = Expense(
                business_id=business.id,
                expense_date=expense_date,
                category=category,
                amount=amount,
                description=description,
                payment_method=account_key,
                treasury_account_id=accounts[account_key].id,
                source_type="manual",
                created_by_name="Demo",
                created_by_role=DEMO_PREVIEW_ROLE_NAME,
            )
            db.session.add(expense)
        else:
            expense.amount = amount
            expense.payment_method = account_key
            expense.treasury_account_id = accounts[account_key].id


def _ensure_demo_reminders(business: Business) -> None:
    reminder_specs = [
        ("Confirmar pedido Studio Norte", "Revisar si el cliente amplia el coffee break del jueves.", 1, "high", True),
        ("Revisar stock de croissants", "El producto rota rapido en la tarde; validar reposicion.", 2, "medium", False),
        ("Actualizar promocion de cafe en grano", "Medir si el bundle con postre mejora ticket promedio.", 4, "medium", False),
    ]
    today = date.today()
    for title, content, due_in_days, priority, pinned in reminder_specs:
        reminder = Reminder.query.filter_by(business_id=business.id, title=title).first()
        if reminder is None:
            reminder = Reminder(
                business_id=business.id,
                title=title,
                content=content,
                priority=priority,
                due_date=(today + timedelta(days=due_in_days)).isoformat(),
                due_time="09:00",
                tags=["demo", "preview"],
                status="active",
                pinned=pinned,
                created_by_name="Demo",
                created_by_role=DEMO_PREVIEW_ROLE_NAME,
            )
            db.session.add(reminder)
        else:
            reminder.content = content
            reminder.priority = priority
            reminder.due_date = (today + timedelta(days=due_in_days)).isoformat()
            reminder.pinned = pinned
            reminder.status = "active"


def _ensure_demo_sales_goal(business: Business, owner: User) -> None:
    goal = SalesGoal.query.filter_by(business_id=business.id, title="Meta mensual demo").first()
    start_date = date.today().replace(day=1)
    end_date = (start_date + timedelta(days=32)).replace(day=1) - timedelta(days=1)
    if goal is None:
        goal = SalesGoal(
            user_id=owner.id,
            business_id=business.id,
            title="Meta mensual demo",
            description="Mantener ritmo de ventas y mejorar ticket promedio del canal corporativo.",
            target_amount=18500000,
            start_date=start_date,
            end_date=end_date,
            status="active",
        )
        db.session.add(goal)
        return
    goal.target_amount = 18500000
    goal.start_date = start_date
    goal.end_date = end_date
    goal.status = "active"


def _ensure_demo_debts(business: Business, accounts: dict[str, TreasuryAccount]) -> None:
    today = date.today()
    debt_specs = [
        {
            "name": "Credito horno industrial",
            "creditor_name": "Banco Aliado",
            "category": "Prestamos",
            "total_amount": 6800000,
            "balance_due": 2140000,
            "due_date": today + timedelta(days=9),
            "estimated_installment": 580000,
            "status": "partial",
            "note": "Financia ampliacion de linea premium.",
            "payment": 466000,
        },
        {
            "name": "Cuenta proveedor empaques",
            "creditor_name": "Pack&Go SAS",
            "category": "Proveedores",
            "total_amount": 1240000,
            "balance_due": 1240000,
            "due_date": today + timedelta(days=4),
            "estimated_installment": 1240000,
            "status": "pending",
            "note": "Pago pendiente de vasos y sleeves compostables.",
            "payment": 0,
        },
    ]
    for spec in debt_specs:
        debt = Debt.query.filter_by(business_id=business.id, name=spec["name"]).first()
        if debt is None:
            debt = Debt(
                business_id=business.id,
                name=spec["name"],
                creditor_name=spec["creditor_name"],
                category=spec["category"],
                total_amount=spec["total_amount"],
                balance_due=spec["balance_due"],
                start_date=today - timedelta(days=120),
                due_date=spec["due_date"],
                frequency="monthly",
                installments=12,
                estimated_installment=spec["estimated_installment"],
                status=spec["status"],
                notes=spec["note"],
                reminder_enabled=True,
            )
            db.session.add(debt)
            db.session.flush()
        else:
            debt.creditor_name = spec["creditor_name"]
            debt.category = spec["category"]
            debt.total_amount = spec["total_amount"]
            debt.balance_due = spec["balance_due"]
            debt.due_date = spec["due_date"]
            debt.estimated_installment = spec["estimated_installment"]
            debt.status = spec["status"]
            debt.notes = spec["note"]
            debt.reminder_enabled = True

        if spec["payment"] > 0:
            payment = DebtPayment.query.filter_by(
                debt_id=debt.id,
                amount=spec["payment"],
            ).first()
            if payment is None:
                payment = DebtPayment(
                    debt_id=debt.id,
                    amount=spec["payment"],
                    payment_date=today - timedelta(days=21),
                    payment_method="transfer",
                    treasury_account_id=accounts["transfer"].id,
                    note="Abono demo registrado para mostrar seguimiento.",
                )
                db.session.add(payment)


def ensure_demo_preview_business() -> tuple[User, Business]:
    try:
        owner = _ensure_demo_owner()
        business = _ensure_demo_business(owner)
        _ensure_demo_modules(business)
        accounts = _ensure_demo_accounts(business)
        products = _ensure_demo_products(business)
        customers = _ensure_demo_customers(business)
        _ensure_demo_sales(business, owner, customers, products, accounts)
        _ensure_demo_expenses(business, accounts)
        _ensure_demo_reminders(business)
        _ensure_demo_sales_goal(business, owner)
        _ensure_demo_debts(business, accounts)
        db.session.commit()
        return owner, business
    except Exception:
        db.session.rollback()
        raise


def get_preview_session_state(user: User | None) -> dict[str, Any]:
    if not user or not getattr(user, "id", None):
        return {"active": False}
    raw_value = _setting_value(_preview_session_key(user.id))
    if not raw_value:
        return {"active": False}
    try:
        payload = json.loads(raw_value)
        if not isinstance(payload, dict):
            return {"active": False}
        if payload.get("active"):
            from backend.account_access import resolve_account_access

            access = resolve_account_access(user)
            if access.get("active") or access.get("existing_access"):
                return stop_preview_session(user)
        return payload
    except json.JSONDecodeError:
        return {"active": False}


def set_preview_session_state(user: User, *, active: bool, business_id: int | None = None) -> dict[str, Any]:
    payload = {
        "active": bool(active),
        "demo_business_id": int(business_id) if business_id else None,
        "updated_at": datetime.utcnow().isoformat(),
    }
    _write_setting(_preview_session_key(user.id), json.dumps(payload))
    db.session.commit()
    return payload


def start_preview_session(user: User) -> dict[str, Any]:
    _, business = ensure_demo_preview_business()
    return set_preview_session_state(user, active=True, business_id=business.id)


def stop_preview_session(user: User) -> dict[str, Any]:
    return set_preview_session_state(user, active=False, business_id=None)


def build_account_access_payload(user: User | None, base_access: dict[str, Any] | None = None) -> dict[str, Any]:
    if user is None:
        access = dict(base_access or {})
        access.setdefault("demo_preview_available", False)
        access.setdefault("demo_preview_active", False)
        access.setdefault("demo_business_id", None)
        access.setdefault("demo_business_name", None)
        return access

    if base_access is None:
        from backend.account_access import resolve_account_access

        access = dict(resolve_account_access(user))
    else:
        access = dict(base_access)

    has_real_access = bool(access.get("active") or access.get("existing_access"))
    preview_state = get_preview_session_state(user)
    preview_active = bool(preview_state.get("active")) and not has_real_access

    demo_business_id = None
    demo_business_name = None
    if preview_active:
        _, demo_business = ensure_demo_preview_business()
        demo_business_id = int(demo_business.id)
        demo_business_name = demo_business.name
    elif has_real_access and preview_state.get("active"):
        stop_preview_session(user)

    access["demo_preview_available"] = bool(
        not has_real_access
        and not getattr(user, "is_admin", False)
        and getattr(user, "account_type", "personal") != "team_member"
    )
    access["demo_preview_active"] = preview_active
    access["demo_business_id"] = demo_business_id
    access["demo_business_name"] = demo_business_name
    return access


def is_demo_preview_requested() -> bool:
    value = request.headers.get(DEMO_PREVIEW_HEADER)
    return str(value or "").strip().lower() in {"1", "true", "yes", "preview"}


def resolve_effective_user(user: User | None) -> tuple[User | None, dict[str, Any] | None]:
    if user is None:
        return None, None
    preview_state = get_preview_session_state(user)
    if not preview_state.get("active") or not is_demo_preview_requested():
        return user, None

    demo_owner, demo_business = ensure_demo_preview_business()
    return demo_owner, {
        "mode": "demo_preview",
        "actual_user_id": int(user.id),
        "demo_owner_user_id": int(demo_owner.id),
        "demo_business_id": int(demo_business.id),
        "demo_business_name": demo_business.name,
    }


def should_block_preview_write(path: str, method: str) -> bool:
    normalized_method = str(method or "").upper()
    if normalized_method in {"GET", "HEAD", "OPTIONS"}:
        return False
    normalized_path = str(path or "")
    return not any(normalized_path.startswith(prefix) for prefix in PREVIEW_WRITE_ALLOWLIST_PREFIXES)
