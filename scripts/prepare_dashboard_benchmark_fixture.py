import argparse
import json
import os
import sys
from datetime import date, timedelta
from typing import Any

from sqlalchemy.engine import make_url

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.main import create_app, ensure_business_modules_initialized
from backend.database import db
from backend.models import (
    Business,
    Customer,
    Expense,
    Invoice,
    InvoiceItem,
    InvoicePayment,
    LedgerEntry,
    Payment,
    Product,
    Sale,
    TreasuryAccount,
    User,
)

FIXTURE_KEYS = {
    "user_email": "benchmark@cuaderno.local",
    "user_name": "Benchmark Owner",
    "business_name": "Benchmark Dashboard Business",
    "customer_name": "Cliente Benchmark",
    "product_name": "Producto Benchmark",
    "product_sku": "BENCHMARK-DASHBOARD-SKU",
    "treasury_payment_method_key": "benchmark_cash",
    "treasury_account_name": "Caja Benchmark",
    "paid_sale_note": "benchmark-fixture-paid-sale",
    "credit_sale_note": "benchmark-fixture-credit-sale",
    "expense_description": "benchmark-fixture-expense",
    "payment_note": "benchmark-fixture-payment",
    "ledger_charge_note": "benchmark-fixture-ledger-charge",
    "ledger_initial_payment_note": "benchmark-fixture-ledger-initial-payment",
    "ledger_followup_payment_note": "benchmark-fixture-ledger-followup-payment",
    "invoice_number": "BENCHMARK-001",
    "invoice_item_description": "Servicio benchmark dashboard",
    "invoice_payment_note": "benchmark-fixture-invoice-payment",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--allow-create", action="store_true")
    parser.add_argument("--allow-remote-db", action="store_true")
    parser.add_argument("--email", default=os.getenv("BENCHMARK_EMAIL", FIXTURE_KEYS["user_email"]))
    parser.add_argument("--password", default=os.getenv("BENCHMARK_PASSWORD", "benchmark123"))
    parser.add_argument("--user-name", default=os.getenv("BENCHMARK_USER_NAME", FIXTURE_KEYS["user_name"]))
    parser.add_argument("--business-name", default=os.getenv("BENCHMARK_BUSINESS_NAME", FIXTURE_KEYS["business_name"]))
    parser.add_argument("--format", choices=["text", "json"], default=os.getenv("BENCHMARK_FORMAT", "text"))
    return parser.parse_args()


def _detect_environment(app: Any) -> dict[str, Any]:
    db_uri = app.config.get("SQLALCHEMY_DATABASE_URI", "")
    try:
        url = make_url(db_uri)
        host = url.host
    except Exception:
        host = None
    env_values = {
        "FLASK_ENV": os.getenv("FLASK_ENV"),
        "APP_ENV": os.getenv("APP_ENV"),
        "ENV": os.getenv("ENV"),
    }
    environment = next((str(value).strip().lower() for value in env_values.values() if value), "development")
    is_local_db = host in {None, "", "localhost", "127.0.0.1"}
    return {
        "environment": environment,
        "db_uri": db_uri,
        "db_host": host,
        "is_local_db": is_local_db,
        "env_values": env_values,
    }


def _guard_fixture_creation(app: Any, allow_create: bool, allow_remote_db: bool) -> dict[str, Any]:
    safety = _detect_environment(app)
    if not allow_create:
        raise RuntimeError("El fixture benchmark requiere --allow-create para mutar la base de datos de forma explícita.")
    if safety["environment"] == "production":
        raise RuntimeError("El fixture benchmark no se puede ejecutar con FLASK_ENV/APP_ENV=production.")
    if not safety["is_local_db"] and not allow_remote_db:
        raise RuntimeError(
            "La base de datos no parece local. Usa --allow-remote-db solo si confirmas que es un entorno controlado de benchmark."
        )
    return safety


def _upsert_user(email: str, password: str, user_name: str) -> tuple[User, bool]:
    user = User.query.filter_by(email=email.strip().lower(), account_type="personal").first()
    created = False
    if not user:
        user = User(
            email=email.strip().lower(),
            name=user_name,
            email_verified=True,
            is_active=True,
            account_type="personal",
            plan="free",
        )
        user.set_password(password)
        db.session.add(user)
        db.session.flush()
        created = True
    else:
        user.name = user_name
        user.email_verified = True
        user.is_active = True
        user.account_type = "personal"
        user.set_password(password)
    return user, created


def _upsert_business(user: User, business_name: str) -> tuple[Business, bool]:
    business = Business.query.filter_by(user_id=user.id, name=business_name).first()
    created = False
    if not business:
        business = Business(
            user_id=user.id,
            name=business_name,
            currency="COP",
            timezone="America/Bogota",
            settings={
                "benchmark_fixture": True,
                "receivable_terms_by_sale": {},
                "debt_term_days": 30,
                "due_soon_days": 5,
            },
            whatsapp_templates={},
        )
        db.session.add(business)
        db.session.flush()
        created = True
    else:
        settings = dict(business.settings or {})
        settings.setdefault("benchmark_fixture", True)
        settings.setdefault("receivable_terms_by_sale", {})
        settings.setdefault("debt_term_days", 30)
        settings.setdefault("due_soon_days", 5)
        business.settings = settings
    return business, created


def _upsert_treasury_account(business_id: int) -> tuple[TreasuryAccount, bool]:
    account = TreasuryAccount.query.filter_by(
        business_id=business_id,
        payment_method_key=FIXTURE_KEYS["treasury_payment_method_key"],
    ).first()
    created = False
    if not account:
        default_exists = TreasuryAccount.query.filter_by(business_id=business_id, is_default=True).first() is not None
        account = TreasuryAccount(
            business_id=business_id,
            name=FIXTURE_KEYS["treasury_account_name"],
            account_type="cash",
            payment_method_key=FIXTURE_KEYS["treasury_payment_method_key"],
            currency="COP",
            opening_balance=0,
            is_active=True,
            is_default=not default_exists,
        )
        db.session.add(account)
        db.session.flush()
        created = True
    else:
        account.name = FIXTURE_KEYS["treasury_account_name"]
        account.account_type = "cash"
        account.currency = "COP"
        account.is_active = True
    return account, created


def _upsert_customer(business_id: int) -> tuple[Customer, bool]:
    customer = Customer.query.filter_by(business_id=business_id, name=FIXTURE_KEYS["customer_name"]).first()
    created = False
    if not customer:
        customer = Customer(
            business_id=business_id,
            name=FIXTURE_KEYS["customer_name"],
            phone="3000000000",
            address="Benchmark Address",
            active=True,
            created_by_name="Benchmark Fixture",
            created_by_role="Propietario",
        )
        db.session.add(customer)
        db.session.flush()
        created = True
    else:
        customer.phone = "3000000000"
        customer.address = "Benchmark Address"
        customer.active = True
    return customer, created


def _upsert_product(business_id: int) -> tuple[Product, bool]:
    product = Product.query.filter_by(business_id=business_id, sku=FIXTURE_KEYS["product_sku"]).first()
    created = False
    if not product:
        product = Product(
            business_id=business_id,
            name=FIXTURE_KEYS["product_name"],
            description="Producto benchmark para dashboard",
            type="product",
            sku=FIXTURE_KEYS["product_sku"],
            price=120000,
            cost=70000,
            unit="und",
            stock=2,
            low_stock_threshold=5,
            active=True,
        )
        db.session.add(product)
        db.session.flush()
        created = True
    else:
        product.name = FIXTURE_KEYS["product_name"]
        product.description = "Producto benchmark para dashboard"
        product.price = 120000
        product.cost = 70000
        product.stock = 2
        product.low_stock_threshold = 5
        product.active = True
    return product, created


def _build_sale_items(product: Product, quantity: float, unit_price: float) -> list[dict[str, Any]]:
    total = round(quantity * unit_price, 2)
    return [{
        "product_id": product.id,
        "name": product.name,
        "qty": quantity,
        "unit_price": unit_price,
        "total": total,
    }]


def _upsert_sale(
    *,
    business_id: int,
    user_id: int,
    customer_id: int | None,
    product: Product,
    sale_date: date,
    total: float,
    total_cost: float,
    balance: float,
    collected_amount: float,
    payment_method: str,
    paid: bool,
    note: str,
    treasury_account_id: int | None,
) -> tuple[Sale, bool]:
    sale = Sale.query.filter_by(business_id=business_id, note=note).first()
    created = False
    if not sale:
        sale = Sale()
        db.session.add(sale)
        created = True
    sale.business_id = business_id
    sale.note = note
    sale.user_id = user_id
    sale.customer_id = customer_id
    sale.sale_date = sale_date
    sale.items = _build_sale_items(product, 1, total)
    sale.subtotal = total
    sale.discount = 0
    sale.total = total
    sale.balance = balance
    sale.collected_amount = collected_amount
    sale.total_cost = total_cost
    sale.payment_method = payment_method
    sale.treasury_account_id = treasury_account_id
    sale.paid = paid
    sale.created_by_name = "Benchmark Fixture"
    sale.created_by_role = "Propietario"
    sale.updated_by_user_id = user_id
    if created:
        db.session.flush()
    return sale, created


def _upsert_ledger_entry(
    *,
    business_id: int,
    customer_id: int,
    entry_type: str,
    amount: float,
    entry_date: date,
    note: str,
    ref_id: int,
) -> tuple[LedgerEntry, bool]:
    entry = LedgerEntry.query.filter_by(business_id=business_id, note=note).first()
    created = False
    if not entry:
        entry = LedgerEntry()
        db.session.add(entry)
        created = True
    entry.business_id = business_id
    entry.note = note
    entry.customer_id = customer_id
    entry.entry_type = entry_type
    entry.amount = amount
    entry.entry_date = entry_date
    entry.ref_type = "sale"
    entry.ref_id = ref_id
    if created:
        db.session.flush()
    return entry, created


def _upsert_payment(
    *,
    business_id: int,
    customer_id: int,
    sale_id: int,
    payment_date: date,
    amount: float,
    treasury_account_id: int | None,
) -> tuple[Payment, bool]:
    payment = Payment.query.filter_by(business_id=business_id, note=FIXTURE_KEYS["payment_note"]).first()
    created = False
    if not payment:
        payment = Payment()
        db.session.add(payment)
        created = True
    payment.business_id = business_id
    payment.note = FIXTURE_KEYS["payment_note"]
    payment.customer_id = customer_id
    payment.sale_id = sale_id
    payment.payment_date = payment_date
    payment.amount = amount
    payment.method = "transfer"
    payment.treasury_account_id = treasury_account_id
    payment.created_by_name = "Benchmark Fixture"
    payment.created_by_role = "Propietario"
    if created:
        db.session.flush()
    return payment, created


def _upsert_expense(*, business_id: int, expense_date: date, treasury_account_id: int | None) -> tuple[Expense, bool]:
    expense = Expense.query.filter_by(business_id=business_id, description=FIXTURE_KEYS["expense_description"]).first()
    created = False
    if not expense:
        expense = Expense()
        db.session.add(expense)
        created = True
    expense.business_id = business_id
    expense.description = FIXTURE_KEYS["expense_description"]
    expense.expense_date = expense_date
    expense.category = "servicios"
    expense.amount = 40000
    expense.source_type = "manual"
    expense.payment_method = "cash"
    expense.treasury_account_id = treasury_account_id
    expense.created_by_name = "Benchmark Fixture"
    expense.created_by_role = "Propietario"
    if created:
        db.session.flush()
    return expense, created


def _upsert_invoice(*, business_id: int, customer_id: int, created_by: int, issue_date: date, due_date: date) -> tuple[Invoice, bool]:
    invoice = Invoice.query.filter_by(business_id=business_id, invoice_number=FIXTURE_KEYS["invoice_number"]).first()
    created = False
    if not invoice:
        invoice = Invoice()
        db.session.add(invoice)
        created = True
    invoice.business_id = business_id
    invoice.invoice_number = FIXTURE_KEYS["invoice_number"]
    invoice.customer_id = customer_id
    invoice.status = "sent"
    invoice.issue_date = issue_date
    invoice.due_date = due_date
    invoice.currency = "COP"
    invoice.subtotal = 50000
    invoice.discount_total = 0
    invoice.tax_total = 0
    invoice.total = 50000
    invoice.notes = "Factura benchmark"
    invoice.payment_method = "transfer"
    invoice.created_by = created_by
    if created:
        db.session.flush()
    return invoice, created


def _upsert_invoice_item(invoice_id: int, product_id: int) -> tuple[InvoiceItem, bool]:
    item = InvoiceItem.query.filter_by(invoice_id=invoice_id, description=FIXTURE_KEYS["invoice_item_description"]).first()
    created = False
    if not item:
        item = InvoiceItem()
        db.session.add(item)
        created = True
    item.invoice_id = invoice_id
    item.description = FIXTURE_KEYS["invoice_item_description"]
    item.product_id = product_id
    item.quantity = 1
    item.unit_price = 50000
    item.discount = 0
    item.tax_rate = 0
    item.line_total = 50000
    item.sort_order = 1
    if created:
        db.session.flush()
    return item, created


def _upsert_invoice_payment(*, invoice_id: int, created_by: int, payment_date: date, treasury_account_id: int | None) -> tuple[InvoicePayment, bool]:
    payment = InvoicePayment.query.filter_by(invoice_id=invoice_id, note=FIXTURE_KEYS["invoice_payment_note"]).first()
    created = False
    if not payment:
        payment = InvoicePayment()
        db.session.add(payment)
        created = True
    payment.invoice_id = invoice_id
    payment.note = FIXTURE_KEYS["invoice_payment_note"]
    payment.amount = 15000
    payment.payment_date = payment_date
    payment.payment_method = "transfer"
    payment.treasury_account_id = treasury_account_id
    payment.event_type = "payment"
    payment.created_by = created_by
    if created:
        db.session.flush()
    return payment, created


def ensure_dashboard_benchmark_fixture(
    *,
    allow_create: bool,
    allow_remote_db: bool,
    email: str,
    password: str,
    user_name: str,
    business_name: str,
) -> dict[str, Any]:
    app = create_app()
    safety = _guard_fixture_creation(app, allow_create=allow_create, allow_remote_db=allow_remote_db)

    with app.app_context():
        user, user_created = _upsert_user(email=email, password=password, user_name=user_name)
        business, business_created = _upsert_business(user=user, business_name=business_name)
        ensure_business_modules_initialized(business.id)
        treasury_account, treasury_created = _upsert_treasury_account(business.id)
        customer, customer_created = _upsert_customer(business.id)
        product, product_created = _upsert_product(business.id)

        today = date.today()
        days_back_sale = min(5, max(today.day - 1, 0))
        credit_sale_date = today - timedelta(days=days_back_sale)
        credit_payment_date = today - timedelta(days=min(2, max(today.day - 1, 0)))
        invoice_issue_date = today - timedelta(days=min(3, max(today.day - 1, 0)))
        invoice_due_date = today + timedelta(days=3)

        paid_sale, paid_sale_created = _upsert_sale(
            business_id=business.id,
            user_id=user.id,
            customer_id=customer.id,
            product=product,
            sale_date=today,
            total=120000,
            total_cost=70000,
            balance=0,
            collected_amount=120000,
            payment_method="cash",
            paid=True,
            note=FIXTURE_KEYS["paid_sale_note"],
            treasury_account_id=treasury_account.id,
        )
        credit_sale, credit_sale_created = _upsert_sale(
            business_id=business.id,
            user_id=user.id,
            customer_id=customer.id,
            product=product,
            sale_date=credit_sale_date,
            total=80000,
            total_cost=50000,
            balance=30000,
            collected_amount=30000,
            payment_method="credit",
            paid=False,
            note=FIXTURE_KEYS["credit_sale_note"],
            treasury_account_id=treasury_account.id,
        )
        db.session.flush()

        charge_entry, charge_created = _upsert_ledger_entry(
            business_id=business.id,
            customer_id=customer.id,
            entry_type="charge",
            amount=80000,
            entry_date=credit_sale_date,
            note=FIXTURE_KEYS["ledger_charge_note"],
            ref_id=credit_sale.id,
        )
        initial_payment_entry, initial_payment_created = _upsert_ledger_entry(
            business_id=business.id,
            customer_id=customer.id,
            entry_type="payment",
            amount=30000,
            entry_date=credit_sale_date,
            note=FIXTURE_KEYS["ledger_initial_payment_note"],
            ref_id=credit_sale.id,
        )
        followup_payment_entry, followup_payment_created = _upsert_ledger_entry(
            business_id=business.id,
            customer_id=customer.id,
            entry_type="payment",
            amount=20000,
            entry_date=credit_payment_date,
            note=FIXTURE_KEYS["ledger_followup_payment_note"],
            ref_id=credit_sale.id,
        )
        payment_row, payment_created = _upsert_payment(
            business_id=business.id,
            customer_id=customer.id,
            sale_id=credit_sale.id,
            payment_date=credit_payment_date,
            amount=20000,
            treasury_account_id=treasury_account.id,
        )
        expense_row, expense_created = _upsert_expense(
            business_id=business.id,
            expense_date=today,
            treasury_account_id=treasury_account.id,
        )
        invoice, invoice_created = _upsert_invoice(
            business_id=business.id,
            customer_id=customer.id,
            created_by=user.id,
            issue_date=invoice_issue_date,
            due_date=invoice_due_date,
        )
        db.session.flush()
        invoice_item, invoice_item_created = _upsert_invoice_item(invoice.id, product.id)
        invoice_payment, invoice_payment_created = _upsert_invoice_payment(
            invoice_id=invoice.id,
            created_by=user.id,
            payment_date=today,
            treasury_account_id=treasury_account.id,
        )

        db.session.commit()

        return {
            "safety": safety,
            "credentials": {
                "email": user.email,
                "password": password,
            },
            "user": {
                "id": user.id,
                "email": user.email,
                "account_type": user.account_type,
                "email_verified": user.email_verified,
                "is_active": user.is_active,
            },
            "business": {
                "id": business.id,
                "name": business.name,
                "owner_user_id": business.user_id,
            },
            "created": {
                "user": user_created,
                "business": business_created,
                "treasury_account": treasury_created,
                "customer": customer_created,
                "product": product_created,
                "paid_sale": paid_sale_created,
                "credit_sale": credit_sale_created,
                "ledger_charge": charge_created,
                "ledger_initial_payment": initial_payment_created,
                "ledger_followup_payment": followup_payment_created,
                "payment": payment_created,
                "expense": expense_created,
                "invoice": invoice_created,
                "invoice_item": invoice_item_created,
                "invoice_payment": invoice_payment_created,
            },
            "dataset": {
                "treasury_account_id": treasury_account.id,
                "customer_id": customer.id,
                "product_id": product.id,
                "paid_sale_id": paid_sale.id,
                "credit_sale_id": credit_sale.id,
                "payment_id": payment_row.id,
                "expense_id": expense_row.id,
                "invoice_id": invoice.id,
                "invoice_payment_id": invoice_payment.id,
                "dates": {
                    "today": today.isoformat(),
                    "credit_sale_date": credit_sale_date.isoformat(),
                    "credit_payment_date": credit_payment_date.isoformat(),
                    "invoice_issue_date": invoice_issue_date.isoformat(),
                    "invoice_due_date": invoice_due_date.isoformat(),
                },
            },
        }


def _print_report(report: dict[str, Any], output_format: str) -> None:
    if output_format == "json":
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return
    print("=== Dashboard Benchmark Fixture ===")
    print(f"environment={report['safety']['environment']}")
    print(f"db_host={report['safety']['db_host']}")
    print(f"business_id={report['business']['id']}")
    print(f"business_name={report['business']['name']}")
    print(f"email={report['credentials']['email']}")
    print("created=")
    for key, value in report["created"].items():
        print(f"  {key}={value}")
    print(json.dumps(report, indent=2, ensure_ascii=False))


def main() -> int:
    args = parse_args()
    report = ensure_dashboard_benchmark_fixture(
        allow_create=args.allow_create,
        allow_remote_db=args.allow_remote_db,
        email=args.email,
        password=args.password,
        user_name=args.user_name,
        business_name=args.business_name,
    )
    _print_report(report, args.format)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
