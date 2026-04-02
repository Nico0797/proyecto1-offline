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

from backend.database import db
from backend.main import create_app, ensure_business_modules_initialized
from backend.models import Business, BusinessModule, Customer, Expense, LedgerEntry, Product, Sale, TreasuryAccount, User

FIXTURE_PREFIX = "QA/LOADTEST"
DEFAULT_EMAIL = "qa.loadtest@cuaderno.local"
DEFAULT_PASSWORD = "qa-loadtest-123"
DEFAULT_BUSINESS_NAME = "QA LOADTEST Business"
DEFAULT_CUSTOMERS = 40
DEFAULT_PRODUCTS = 12
DEFAULT_PENDING_SALES_PER_CUSTOMER = 12
DEFAULT_PAID_SALES_PER_CUSTOMER = 4


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--allow-create", action="store_true")
    parser.add_argument("--allow-remote-db", action="store_true")
    parser.add_argument("--email", default=os.getenv("LOADTEST_EMAIL", DEFAULT_EMAIL))
    parser.add_argument("--password", default=os.getenv("LOADTEST_PASSWORD", DEFAULT_PASSWORD))
    parser.add_argument("--business-name", default=os.getenv("LOADTEST_BUSINESS_NAME", DEFAULT_BUSINESS_NAME))
    parser.add_argument("--customers", type=int, default=int(os.getenv("LOADTEST_CUSTOMERS", str(DEFAULT_CUSTOMERS))))
    parser.add_argument("--products", type=int, default=int(os.getenv("LOADTEST_PRODUCTS", str(DEFAULT_PRODUCTS))))
    parser.add_argument(
        "--pending-sales-per-customer",
        type=int,
        default=int(os.getenv("LOADTEST_PENDING_SALES_PER_CUSTOMER", str(DEFAULT_PENDING_SALES_PER_CUSTOMER))),
    )
    parser.add_argument(
        "--paid-sales-per-customer",
        type=int,
        default=int(os.getenv("LOADTEST_PAID_SALES_PER_CUSTOMER", str(DEFAULT_PAID_SALES_PER_CUSTOMER))),
    )
    parser.add_argument("--format", choices=["text", "json"], default=os.getenv("LOADTEST_FIXTURE_FORMAT", "json"))
    return parser.parse_args()


def _detect_environment(app: Any) -> dict[str, Any]:
    db_uri = app.config.get("SQLALCHEMY_DATABASE_URI", "")
    try:
        url = make_url(db_uri)
        host = url.host
    except Exception:
        host = None
    environment = str(os.getenv("APP_ENV") or os.getenv("FLASK_ENV") or "development").strip().lower()
    is_local_db = host in {None, "", "localhost", "127.0.0.1"}
    return {
        "environment": environment,
        "db_uri": db_uri,
        "db_host": host,
        "is_local_db": is_local_db,
    }


def _guard_creation(app: Any, allow_create: bool, allow_remote_db: bool) -> dict[str, Any]:
    safety = _detect_environment(app)
    if not allow_create:
        raise RuntimeError("El fixture load test requiere --allow-create para mutar la base de datos de forma explícita.")
    if safety["environment"] == "production":
        raise RuntimeError("El fixture load test no se puede ejecutar con APP_ENV/FLASK_ENV=production.")
    if not safety["is_local_db"] and not allow_remote_db:
        raise RuntimeError("La base no parece local. Usa --allow-remote-db solo en un entorno QA controlado.")
    return safety


def _upsert_user(email: str, password: str) -> tuple[User, bool]:
    user = User.query.filter_by(email=email.strip().lower(), account_type="personal").first()
    created = False
    if not user:
        user = User(email=email.strip().lower(), name=f"{FIXTURE_PREFIX} Owner", account_type="personal")
        user.set_password(password)
        user.email_verified = True
        user.is_active = True
        user.plan = "pro"
        db.session.add(user)
        db.session.flush()
        created = True
    user.name = f"{FIXTURE_PREFIX} Owner"
    user.email_verified = True
    user.is_active = True
    user.plan = "pro"
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
            settings={"loadtest_fixture": True, "fixture_prefix": FIXTURE_PREFIX},
            whatsapp_templates={},
        )
        db.session.add(business)
        db.session.flush()
        created = True
    else:
        settings = dict(business.settings or {})
        settings["loadtest_fixture"] = True
        settings["fixture_prefix"] = FIXTURE_PREFIX
        business.settings = settings
        business.currency = "COP"
        business.timezone = "America/Bogota"
    return business, created


def _enable_modules(business_id: int) -> None:
    module_map = ensure_business_modules_initialized(business_id, auto_commit=False)
    for module_key in ("sales", "customers", "products", "accounts_receivable", "reports"):
        row = module_map.get(module_key)
        if row is None:
            row = BusinessModule(business_id=business_id, module_key=module_key, enabled=True)
            db.session.add(row)
        row.enabled = True


def _upsert_treasury_accounts(business_id: int) -> dict[str, TreasuryAccount]:
    accounts: dict[str, TreasuryAccount] = {}
    definitions = [
        ("cash", f"{FIXTURE_PREFIX} Caja", "cash", True),
        ("transfer", f"{FIXTURE_PREFIX} Banco", "bank", False),
    ]
    for payment_method_key, name, account_type, is_default in definitions:
        account = TreasuryAccount.query.filter_by(business_id=business_id, payment_method_key=payment_method_key).first()
        if not account:
            account = TreasuryAccount(
                business_id=business_id,
                name=name,
                account_type=account_type,
                payment_method_key=payment_method_key,
                currency="COP",
                opening_balance=0,
                is_active=True,
                is_default=is_default,
            )
            db.session.add(account)
        account.name = name
        account.account_type = account_type
        account.currency = "COP"
        account.opening_balance = 0
        account.is_active = True
        account.is_default = is_default
        accounts[payment_method_key] = account
    return accounts


def _upsert_customers(business_id: int, user: User, count: int) -> list[Customer]:
    customers: list[Customer] = []
    for idx in range(1, count + 1):
        name = f"{FIXTURE_PREFIX} Customer {idx:04d}"
        customer = Customer.query.filter_by(business_id=business_id, name=name).first()
        if not customer:
            customer = Customer(
                business_id=business_id,
                name=name,
                created_by_user_id=user.id,
                created_by_name=user.name,
                created_by_role="Propietario",
                updated_by_user_id=user.id,
            )
            db.session.add(customer)
        customer.phone = f"300{idx:07d}"[-10:]
        customer.address = f"{FIXTURE_PREFIX} Address {idx:04d}"
        customer.notes = FIXTURE_PREFIX
        customer.active = True
        customer.created_by_user_id = user.id
        customer.created_by_name = user.name
        customer.created_by_role = "Propietario"
        customer.updated_by_user_id = user.id
        customers.append(customer)
    return customers


def _upsert_products(business_id: int, count: int) -> list[Product]:
    products: list[Product] = []
    for idx in range(1, count + 1):
        sku = f"LOADTEST-SKU-{idx:04d}"
        name = f"{FIXTURE_PREFIX} Product {idx:04d}"
        product = Product.query.filter_by(business_id=business_id, sku=sku).first()
        if not product:
            product = Product(
                business_id=business_id,
                sku=sku,
                name=name,
                description=FIXTURE_PREFIX,
                type="product",
                price=12000 + idx * 137,
                cost=7000 + idx * 73,
                unit="und",
                stock=5000,
                low_stock_threshold=10,
                active=True,
            )
            db.session.add(product)
        product.name = name
        product.description = FIXTURE_PREFIX
        product.type = "product"
        product.price = 12000 + idx * 137
        product.cost = 7000 + idx * 73
        product.unit = "und"
        product.stock = max(float(product.stock or 0), 5000)
        product.low_stock_threshold = 10
        product.active = True
        products.append(product)
    return products


def _upsert_sale(
    *,
    business_id: int,
    user_id: int,
    customer: Customer,
    product: Product,
    sale_date: date,
    paid: bool,
    amount_paid: float,
    sale_index: int,
    customer_index: int,
) -> None:
    sale_type = "paid" if paid else "credit"
    note = f"{FIXTURE_PREFIX} {sale_type} sale c{customer_index:04d}-n{sale_index:04d}"
    sale = Sale.query.filter_by(business_id=business_id, note=note).first()
    unit_price = round(float(product.price or 0), 2)
    total = unit_price
    balance = 0.0 if paid else round(max(total - amount_paid, 0), 2)
    if not sale:
        sale = Sale(
            business_id=business_id,
            note=note,
            user_id=user_id,
            customer_id=customer.id,
            sale_date=sale_date,
            items=[{"product_id": product.id, "name": product.name, "qty": 1, "unit_price": unit_price, "total": total}],
            subtotal=total,
            discount=0,
            total=total,
            balance=balance,
            collected_amount=total if paid else amount_paid,
            total_cost=float(product.cost or 0),
            payment_method="cash" if paid else "credit",
            paid=paid,
            created_by_name=f"{FIXTURE_PREFIX} Seeder",
            created_by_role="Propietario",
            updated_by_user_id=user_id,
        )
        db.session.add(sale)
    sale.user_id = user_id
    sale.customer_id = customer.id
    sale.sale_date = sale_date
    sale.items = [{"product_id": product.id, "name": product.name, "qty": 1, "unit_price": unit_price, "total": total}]
    sale.subtotal = total
    sale.discount = 0
    sale.total = total
    sale.balance = balance
    sale.collected_amount = total if paid else amount_paid
    sale.total_cost = float(product.cost or 0)
    sale.payment_method = "cash" if paid else "credit"
    sale.paid = paid
    sale.created_by_name = f"{FIXTURE_PREFIX} Seeder"
    sale.created_by_role = "Propietario"
    sale.updated_by_user_id = user_id
    db.session.flush()

    charge_note = f"{FIXTURE_PREFIX} charge c{customer_index:04d}-n{sale_index:04d}"
    payment_note = f"{FIXTURE_PREFIX} payment c{customer_index:04d}-n{sale_index:04d}"

    charge = LedgerEntry.query.filter_by(business_id=business_id, note=charge_note).first()
    if not charge:
        charge = LedgerEntry(business_id=business_id, note=charge_note)
        db.session.add(charge)
    charge.customer_id = customer.id
    charge.entry_type = "charge"
    charge.amount = total
    charge.entry_date = sale_date
    charge.ref_type = "sale"
    charge.ref_id = sale.id

    payment_entry = LedgerEntry.query.filter_by(business_id=business_id, note=payment_note).first()
    if paid or amount_paid > 0:
        if not payment_entry:
            payment_entry = LedgerEntry(business_id=business_id, note=payment_note)
            db.session.add(payment_entry)
        payment_entry.customer_id = customer.id
        payment_entry.entry_type = "payment"
        payment_entry.amount = total if paid else amount_paid
        payment_entry.entry_date = sale_date
        payment_entry.ref_type = "sale"
        payment_entry.ref_id = sale.id
    elif payment_entry:
        db.session.delete(payment_entry)


def _ensure_dashboard_expense(business_id: int, user: User, expense_date: date) -> Expense:
    description = f"{FIXTURE_PREFIX} expense"
    expense = Expense.query.filter_by(business_id=business_id, description=description).first()
    if not expense:
        expense = Expense(
            business_id=business_id,
            description=description,
            expense_date=expense_date,
            category="qa-loadtest",
            amount=50000,
            source_type="manual",
            payment_method="cash",
            created_by_user_id=user.id,
            created_by_name=user.name,
            created_by_role="Propietario",
            updated_by_user_id=user.id,
        )
        db.session.add(expense)
    expense.expense_date = expense_date
    expense.category = "qa-loadtest"
    expense.amount = 50000
    expense.source_type = "manual"
    expense.payment_method = "cash"
    expense.created_by_user_id = user.id
    expense.created_by_name = user.name
    expense.created_by_role = "Propietario"
    expense.updated_by_user_id = user.id
    return expense


def ensure_load_fixture(
    *,
    allow_create: bool,
    allow_remote_db: bool,
    email: str,
    password: str,
    business_name: str,
    customers_count: int,
    products_count: int,
    pending_sales_per_customer: int,
    paid_sales_per_customer: int,
) -> dict[str, Any]:
    app = create_app()
    safety = _guard_creation(app, allow_create=allow_create, allow_remote_db=allow_remote_db)
    with app.app_context():
        user, user_created = _upsert_user(email=email, password=password)
        business, business_created = _upsert_business(user=user, business_name=business_name)
        _enable_modules(business.id)
        accounts = _upsert_treasury_accounts(business.id)
        customers = _upsert_customers(business.id, user, customers_count)
        products = _upsert_products(business.id, products_count)

        today = date.today()
        for customer_index, customer in enumerate(customers, start=1):
            for sale_index in range(1, paid_sales_per_customer + 1):
                product = products[(customer_index + sale_index - 2) % len(products)]
                sale_date = today - timedelta(days=(sale_index - 1) % 5)
                _upsert_sale(
                    business_id=business.id,
                    user_id=user.id,
                    customer=customer,
                    product=product,
                    sale_date=sale_date,
                    paid=True,
                    amount_paid=float(product.price or 0),
                    sale_index=sale_index,
                    customer_index=customer_index,
                )
            for offset in range(1, pending_sales_per_customer + 1):
                product = products[(customer_index + paid_sales_per_customer + offset - 2) % len(products)]
                sale_index = paid_sales_per_customer + offset
                sale_date = today - timedelta(days=min(offset + 1, 20))
                partial_amount = round(float(product.price or 0) * 0.25, 2) if offset % 3 == 0 else 0.0
                _upsert_sale(
                    business_id=business.id,
                    user_id=user.id,
                    customer=customer,
                    product=product,
                    sale_date=sale_date,
                    paid=False,
                    amount_paid=partial_amount,
                    sale_index=sale_index,
                    customer_index=customer_index,
                )

        _ensure_dashboard_expense(business.id, user, today)
        db.session.commit()

        report = {
            "safety": safety,
            "credentials": {"email": user.email, "password": password},
            "user": {"id": user.id, "email": user.email, "plan": user.plan},
            "business": {"id": business.id, "name": business.name},
            "dataset": {
                "customers": len(customers),
                "products": len(products),
                "paid_sales_per_customer": paid_sales_per_customer,
                "pending_sales_per_customer": pending_sales_per_customer,
                "default_cash_account_id": accounts["cash"].id,
                "default_transfer_account_id": accounts["transfer"].id,
                "customer_ids": [customer.id for customer in customers[:20]],
                "product_ids": [product.id for product in products[:20]],
            },
            "created": {
                "user": user_created,
                "business": business_created,
            },
        }
        return report


def main() -> int:
    args = parse_args()
    report = ensure_load_fixture(
        allow_create=args.allow_create,
        allow_remote_db=args.allow_remote_db,
        email=args.email,
        password=args.password,
        business_name=args.business_name,
        customers_count=max(args.customers, 1),
        products_count=max(args.products, 1),
        pending_sales_per_customer=max(args.pending_sales_per_customer, 0),
        paid_sales_per_customer=max(args.paid_sales_per_customer, 0),
    )
    if args.format == "json":
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(f"business_id={report['business']['id']}")
        print(f"email={report['credentials']['email']}")
        print(f"customers={report['dataset']['customers']}")
        print(f"products={report['dataset']['products']}")
        print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
