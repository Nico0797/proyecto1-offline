import pytest
from uuid import uuid4
from sqlalchemy import text

from backend.auth import create_token
from backend.config import TestingConfig
from backend.database import db
from backend.main import create_app
from backend.models import (
    Business,
    BusinessModule,
    Customer,
    Debt,
    DebtPayment,
    Expense,
    LedgerAllocation,
    LedgerEntry,
    Payment,
    Product,
    RawMaterial,
    RawPurchase,
    RecurringExpense,
    Sale,
    Supplier,
    SupplierPayable,
    SupplierPayment,
    TreasuryAccount,
    User,
)


@pytest.fixture
def treasury_env():
    app = create_app(TestingConfig)
    ctx = app.app_context()
    ctx.push()
    db.create_all()

    user = User(
        email=f"treasury.qa.{uuid4().hex}@example.com",
        name="Treasury QA",
        password_hash="hash",
        email_verified=True,
        plan="pro",
    )
    db.session.add(user)
    db.session.flush()

    business = Business(user_id=user.id, name="Treasury QA Business", currency="COP")
    db.session.add(business)
    db.session.flush()

    for module_key, enabled in {
        "sales": True,
        "customers": True,
        "products": True,
        "accounts_receivable": True,
        "reports": True,
        "raw_inventory": True,
        "treasury": True,
    }.items():
        db.session.add(BusinessModule(business_id=business.id, module_key=module_key, enabled=enabled))

    cash_account = TreasuryAccount(
        business_id=business.id,
        name="Caja QA",
        account_type="cash",
        payment_method_key="cash",
        currency="COP",
        opening_balance=0,
        is_active=True,
        is_default=True,
    )
    bank_account = TreasuryAccount(
        business_id=business.id,
        name="Banco QA",
        account_type="bank",
        payment_method_key="transfer",
        currency="COP",
        opening_balance=0,
        is_active=True,
        is_default=False,
    )
    wallet_account = TreasuryAccount(
        business_id=business.id,
        name="Nequi QA",
        account_type="wallet",
        payment_method_key="nequi",
        currency="COP",
        opening_balance=0,
        is_active=True,
        is_default=False,
    )
    inactive_account = TreasuryAccount(
        business_id=business.id,
        name="Cuenta Inactiva QA",
        account_type="other",
        payment_method_key="other",
        currency="COP",
        opening_balance=0,
        is_active=False,
        is_default=False,
    )
    customer = Customer(
        business_id=business.id,
        name="Cliente QA",
        created_by_user_id=user.id,
        created_by_name=user.name,
        created_by_role="Propietario",
        updated_by_user_id=user.id,
    )
    product = Product(
        business_id=business.id,
        name="Producto QA",
        type="product",
        sku="QA-001",
        price=100,
        cost=40,
        unit="und",
        stock=100,
    )
    supplier = Supplier(
        business_id=business.id,
        name="Proveedor QA",
        is_active=True,
    )
    raw_material = RawMaterial(
        business_id=business.id,
        name="Harina QA",
        unit="kg",
        current_stock=10,
        minimum_stock=0,
        reference_cost=8,
        is_active=True,
    )

    db.session.add_all([
        cash_account,
        bank_account,
        wallet_account,
        inactive_account,
        customer,
        product,
        supplier,
        raw_material,
    ])
    db.session.commit()

    token = create_token(user.id)

    env = {
        "app": app,
        "client": app.test_client(),
        "headers": {"Authorization": f"Bearer {token}"},
        "user_id": user.id,
        "business_id": business.id,
        "customer_id": customer.id,
        "product_id": product.id,
        "supplier_id": supplier.id,
        "raw_material_id": raw_material.id,
        "cash_account_id": cash_account.id,
        "bank_account_id": bank_account.id,
        "wallet_account_id": wallet_account.id,
        "inactive_account_id": inactive_account.id,
    }

    yield env

    db.session.remove()
    table_names = [table.name for table in reversed(db.metadata.sorted_tables)]
    if table_names:
        db.session.execute(
            text(
                "TRUNCATE TABLE " + ", ".join(f'\"{table_name}\"' for table_name in table_names) + " RESTART IDENTITY CASCADE"
            )
        )
        db.session.commit()
    ctx.pop()


def business_path(env, suffix: str) -> str:
    return f"/api/businesses/{env['business_id']}{suffix}"


def payload_json(response):
    return response.get_json() or {}


def create_sale_request(env, *, total: float, paid: bool, note: str, sale_date: str, treasury_account_id=None, amount_paid=None):
    payload = {
        "customer_id": env["customer_id"],
        "sale_date": sale_date,
        "payment_method": "cash" if paid else "credit",
        "paid": paid,
        "amount_paid": total if paid else float(amount_paid or 0),
        "note": note,
        "items": [
            {
                "product_id": env["product_id"],
                "name": "Producto QA",
                "qty": 1,
                "unit_price": total,
                "total": total,
            }
        ],
    }
    if treasury_account_id is not None:
        payload["treasury_account_id"] = treasury_account_id
    response = env["client"].post(
        business_path(env, "/sales"),
        headers=env["headers"],
        json=payload,
    )
    return response, payload_json(response)


def create_credit_sale(env, *, total: float, note: str, sale_date: str):
    response, data = create_sale_request(env, total=total, paid=False, note=note, sale_date=sale_date)
    assert response.status_code == 201, data
    return data["sale"]


def create_payment_request(env, *, amount: float, payment_date: str, treasury_account_id=None, note: str = "Pago QA"):
    payload = {
        "customer_id": env["customer_id"],
        "amount": amount,
        "payment_date": payment_date,
        "note": note,
    }
    if treasury_account_id is not None:
        payload["treasury_account_id"] = treasury_account_id
    response = env["client"].post(
        business_path(env, "/payments"),
        headers=env["headers"],
        json=payload,
    )
    return response, payload_json(response)


def create_raw_purchase_request(env, *, purchase_date: str, quantity: float, unit_cost: float, notes: str):
    payload = {
        "supplier_id": env["supplier_id"],
        "purchase_date": purchase_date,
        "notes": notes,
        "items": [
            {
                "raw_material_id": env["raw_material_id"],
                "quantity": quantity,
                "unit_cost": unit_cost,
            }
        ],
    }
    response = env["client"].post(
        business_path(env, "/raw-purchases"),
        headers=env["headers"],
        json=payload,
    )
    return response, payload_json(response)


def create_raw_purchase(env, *, purchase_date: str, quantity: float, unit_cost: float, notes: str):
    response, data = create_raw_purchase_request(env, purchase_date=purchase_date, quantity=quantity, unit_cost=unit_cost, notes=notes)
    assert response.status_code == 201, data
    return data["raw_purchase"]


def confirm_raw_purchase_request(env, purchase_id: int, payload: dict):
    response = env["client"].post(
        business_path(env, f"/raw-purchases/{purchase_id}/confirm"),
        headers=env["headers"],
        json=payload,
    )
    return response, payload_json(response)


def create_recurring_expense(env, *, name: str, amount: float, due_day: int, next_due_date: str, category: str = "servicios"):
    response = env["client"].post(
        business_path(env, "/recurring-expenses"),
        headers=env["headers"],
        json={
            "name": name,
            "amount": amount,
            "due_day": due_day,
            "next_due_date": next_due_date,
            "frequency": "monthly",
            "category": category,
            "payment_flow": "cash",
        },
    )
    data = payload_json(response)
    assert response.status_code == 201, data
    return data["recurring_expense"]


def create_debt_request(env, payload: dict):
    response = env["client"].post(
        business_path(env, "/debts"),
        headers=env["headers"],
        json=payload,
    )
    return response, payload_json(response)


def create_debt(env, *, total_amount: float, start_date: str, due_date: str, name: str, initial_payment_amount=None, treasury_account_id=None):
    payload = {
        "scope": "operational",
        "category": "otros",
        "name": name,
        "creditor_name": "Acreedor QA",
        "total_amount": total_amount,
        "start_date": start_date,
        "due_date": due_date,
    }
    if initial_payment_amount is not None:
        payload["initial_payment_amount"] = initial_payment_amount
        payload["initial_payment_note"] = f"Pago inicial {name}"
    if treasury_account_id is not None:
        payload["treasury_account_id"] = treasury_account_id
    response, data = create_debt_request(env, payload)
    assert response.status_code == 201, data
    return data


def linked_expenses(**filters):
    return Expense.query.filter_by(**filters).order_by(Expense.id.asc()).all()


def test_sale_paid_with_treasury_account(treasury_env):
    response, data = create_sale_request(
        treasury_env,
        total=120,
        paid=True,
        note="Venta tesoreria 1",
        sale_date="2026-03-01",
        treasury_account_id=treasury_env["cash_account_id"],
    )

    assert response.status_code == 201, data
    sale_id = data["sale"]["id"]
    sale = db.session.get(Sale, sale_id)

    assert data["sale"]["treasury_account_id"] == treasury_env["cash_account_id"]
    assert data["sale"]["payment_method"] == "cash"
    assert sale.treasury_account_id == treasury_env["cash_account_id"]
    assert sale.collected_amount == pytest.approx(120)
    assert sale.balance == pytest.approx(0)
    assert sale.paid is True


def test_payment_created_with_treasury_account(treasury_env):
    sale = create_credit_sale(treasury_env, total=100, note="Venta credito pago 1", sale_date="2026-03-02")
    response, data = create_payment_request(
        treasury_env,
        amount=60,
        payment_date="2026-03-03",
        treasury_account_id=treasury_env["bank_account_id"],
        note="Cobro parcial 1",
    )

    assert response.status_code == 201, data
    payment = db.session.get(Payment, data["payment"]["id"])
    refreshed_sale = db.session.get(Sale, sale["id"])
    payment_ledger = LedgerEntry.query.filter_by(ref_type="payment", ref_id=payment.id).first()
    allocations = LedgerAllocation.query.filter_by(payment_id=payment_ledger.id).all()

    assert data["payment"]["treasury_account_id"] == treasury_env["bank_account_id"]
    assert data["payment"]["method"] == "transfer"
    assert payment.treasury_account_id == treasury_env["bank_account_id"]
    assert refreshed_sale.collected_amount == pytest.approx(60)
    assert refreshed_sale.balance == pytest.approx(40)
    assert refreshed_sale.paid is False
    assert len(allocations) == 1
    assert allocations[0].amount == pytest.approx(60)


def test_payment_update_reallocates_and_changes_account(treasury_env):
    sale_one = create_credit_sale(treasury_env, total=100, note="Venta credito realloc 1", sale_date="2026-03-04")
    sale_two = create_credit_sale(treasury_env, total=70, note="Venta credito realloc 2", sale_date="2026-03-05")
    create_response, create_data = create_payment_request(
        treasury_env,
        amount=150,
        payment_date="2026-03-06",
        treasury_account_id=treasury_env["bank_account_id"],
        note="Cobro a reasignar",
    )
    assert create_response.status_code == 201, create_data

    payment_id = create_data["payment"]["id"]
    update_response = treasury_env["client"].put(
        business_path(treasury_env, f"/payments/{payment_id}"),
        headers=treasury_env["headers"],
        json={
            "amount": 60,
            "treasury_account_id": treasury_env["wallet_account_id"],
            "note": "Cobro reasignado",
        },
    )
    update_data = payload_json(update_response)

    assert update_response.status_code == 200, update_data
    payment = db.session.get(Payment, payment_id)
    sale_one_refreshed = db.session.get(Sale, sale_one["id"])
    sale_two_refreshed = db.session.get(Sale, sale_two["id"])
    ledger_entry = LedgerEntry.query.filter_by(ref_type="payment", ref_id=payment_id).first()
    allocations = LedgerAllocation.query.filter_by(payment_id=ledger_entry.id).order_by(LedgerAllocation.id.asc()).all()

    assert update_data["payment"]["treasury_account_id"] == treasury_env["wallet_account_id"]
    assert update_data["payment"]["method"] == "nequi"
    assert payment.treasury_account_id == treasury_env["wallet_account_id"]
    assert payment.amount == pytest.approx(60)
    assert len(allocations) == 1
    assert sale_one_refreshed.collected_amount == pytest.approx(60)
    assert sale_one_refreshed.balance == pytest.approx(40)
    assert sale_one_refreshed.paid is False
    assert sale_two_refreshed.collected_amount == pytest.approx(0)
    assert sale_two_refreshed.balance == pytest.approx(70)
    assert sale_two_refreshed.paid is False


def test_payment_delete_recalculates_collected_amount(treasury_env):
    sale = create_credit_sale(treasury_env, total=90, note="Venta credito delete", sale_date="2026-03-07")
    create_response, create_data = create_payment_request(
        treasury_env,
        amount=40,
        payment_date="2026-03-08",
        treasury_account_id=treasury_env["bank_account_id"],
        note="Cobro para borrar",
    )
    assert create_response.status_code == 201, create_data

    payment_id = create_data["payment"]["id"]
    delete_response = treasury_env["client"].delete(
        business_path(treasury_env, f"/payments/{payment_id}"),
        headers=treasury_env["headers"],
    )
    delete_data = payload_json(delete_response)

    assert delete_response.status_code == 200, delete_data
    sale_refreshed = db.session.get(Sale, sale["id"])
    assert db.session.get(Payment, payment_id) is None
    assert LedgerEntry.query.filter_by(ref_type="payment", ref_id=payment_id).first() is None
    assert sale_refreshed.collected_amount == pytest.approx(0)
    assert sale_refreshed.balance == pytest.approx(90)
    assert sale_refreshed.paid is False


def test_payment_list_includes_allocations(treasury_env):
    sale = create_credit_sale(treasury_env, total=100, note="Venta allocation list", sale_date="2026-03-08")
    create_response, create_data = create_payment_request(
        treasury_env,
        amount=35,
        payment_date="2026-03-09",
        treasury_account_id=treasury_env["cash_account_id"],
        note="Cobro con allocaciones",
    )
    assert create_response.status_code == 201, create_data

    response = treasury_env["client"].get(
        business_path(treasury_env, "/payments"),
        headers=treasury_env["headers"],
    )
    data = payload_json(response)

    assert response.status_code == 200, data
    listed_payment = next((item for item in data["payments"] if item["id"] == create_data["payment"]["id"]), None)
    assert listed_payment is not None
    assert "allocations" not in listed_payment

    expanded_response = treasury_env["client"].get(
        business_path(treasury_env, "/payments?include_allocations=true"),
        headers=treasury_env["headers"],
    )
    expanded_data = payload_json(expanded_response)

    assert expanded_response.status_code == 200, expanded_data
    expanded_payment = next((item for item in expanded_data["payments"] if item["id"] == create_data["payment"]["id"]), None)
    assert expanded_payment is not None
    assert expanded_payment["allocations"] == [{"sale_id": sale["id"], "amount": pytest.approx(35)}]


def test_sale_update_recalculates_charge_and_preserves_allocations(treasury_env):
    sale = create_credit_sale(treasury_env, total=100, note="Venta update sale", sale_date="2026-03-10")
    payment_response, payment_data = create_payment_request(
        treasury_env,
        amount=40,
        payment_date="2026-03-11",
        treasury_account_id=treasury_env["bank_account_id"],
        note="Cobro previo a edición",
    )
    assert payment_response.status_code == 201, payment_data

    update_response = treasury_env["client"].put(
        business_path(treasury_env, f"/sales/{sale['id']}"),
        headers=treasury_env["headers"],
        json={
            "items": [{
                "product_id": treasury_env["product_id"],
                "name": "Producto QA",
                "qty": 1,
                "unit_price": 120,
                "total": 120,
            }],
            "subtotal": 120,
            "discount": 0,
            "total": 120,
            "sale_date": "2026-03-09",
            "note": "Venta editada offline-safe",
            "payment_method": "credit",
            "paid": False,
            "amount_paid": 0,
        },
    )
    update_data = payload_json(update_response)

    assert update_response.status_code == 200, update_data
    refreshed_sale = db.session.get(Sale, sale["id"])
    payment = db.session.get(Payment, payment_data["payment"]["id"])
    payment_ledger = LedgerEntry.query.filter_by(ref_type="payment", ref_id=payment.id).first()
    allocations = LedgerAllocation.query.filter_by(payment_id=payment_ledger.id).all()
    charge_entry = LedgerEntry.query.filter_by(ref_type="sale", ref_id=sale["id"], entry_type="charge").first()

    assert refreshed_sale.total == pytest.approx(120)
    assert refreshed_sale.collected_amount == pytest.approx(40)
    assert refreshed_sale.balance == pytest.approx(80)
    assert refreshed_sale.paid is False
    assert charge_entry.amount == pytest.approx(120)
    assert len(allocations) == 1
    assert allocations[0].amount == pytest.approx(40)


def test_sale_delete_reallocates_existing_customer_payments(treasury_env):
    sale_one = create_credit_sale(treasury_env, total=100, note="Venta delete realloc 1", sale_date="2026-03-12")
    sale_two = create_credit_sale(treasury_env, total=70, note="Venta delete realloc 2", sale_date="2026-03-13")
    payment_response, payment_data = create_payment_request(
        treasury_env,
        amount=60,
        payment_date="2026-03-14",
        treasury_account_id=treasury_env["bank_account_id"],
        note="Cobro antes de borrar venta",
    )
    assert payment_response.status_code == 201, payment_data

    delete_response = treasury_env["client"].delete(
        business_path(treasury_env, f"/sales/{sale_one['id']}"),
        headers=treasury_env["headers"],
    )
    delete_data = payload_json(delete_response)

    assert delete_response.status_code == 200, delete_data
    assert db.session.get(Sale, sale_one["id"]) is None

    remaining_sale = db.session.get(Sale, sale_two["id"])
    payment = db.session.get(Payment, payment_data["payment"]["id"])
    payment_ledger = LedgerEntry.query.filter_by(ref_type="payment", ref_id=payment.id).first()
    allocations = LedgerAllocation.query.filter_by(payment_id=payment_ledger.id).all()

    assert remaining_sale.collected_amount == pytest.approx(60)
    assert remaining_sale.balance == pytest.approx(10)
    assert remaining_sale.paid is False
    assert payment.sale_id is None
    assert len(allocations) == 1
    assert allocations[0].amount == pytest.approx(60)


def test_manual_expense_paid_with_treasury_account(treasury_env):
    response = treasury_env["client"].post(
        business_path(treasury_env, "/expenses"),
        headers=treasury_env["headers"],
        json={
            "expense_date": "2026-03-09",
            "category": "servicios",
            "amount": 55,
            "description": "Gasto manual QA",
            "treasury_account_id": treasury_env["bank_account_id"],
        },
    )
    data = payload_json(response)

    assert response.status_code == 201, data
    expense = db.session.get(Expense, data["expense"]["id"])
    assert data["expense"]["treasury_account_id"] == treasury_env["bank_account_id"]
    assert data["expense"]["payment_method"] == "transfer"
    assert expense.source_type == "manual"
    assert expense.treasury_account_id == treasury_env["bank_account_id"]


def test_recurring_expense_executed_paid_with_treasury_account(treasury_env):
    recurring = create_recurring_expense(
        treasury_env,
        name="Internet QA",
        amount=120,
        due_day=10,
        next_due_date="2026-03-10",
    )
    response = treasury_env["client"].post(
        business_path(treasury_env, f"/recurring-expenses/{recurring['id']}/mark-paid"),
        headers=treasury_env["headers"],
        json={
            "expense_date": "2026-03-10",
            "description": "Pago recurrente QA",
            "treasury_account_id": treasury_env["wallet_account_id"],
        },
    )
    data = payload_json(response)

    assert response.status_code == 201, data
    expense = db.session.get(Expense, data["expense"]["id"])
    recurring_refreshed = db.session.get(RecurringExpense, recurring["id"])

    assert data["expense"]["treasury_account_id"] == treasury_env["wallet_account_id"]
    assert data["expense"]["payment_method"] == "nequi"
    assert expense.source_type == "recurring"
    assert expense.recurring_expense_id == recurring["id"]
    assert recurring_refreshed.next_due_date.isoformat() == "2026-04-10"


def test_raw_purchase_paid_with_treasury_account(treasury_env):
    purchase = create_raw_purchase(
        treasury_env,
        purchase_date="2026-03-11",
        quantity=5,
        unit_cost=12,
        notes="Compra contado QA",
    )
    response, data = confirm_raw_purchase_request(
        treasury_env,
        purchase["id"],
        {
            "financial_flow": "cash",
            "treasury_account_id": treasury_env["bank_account_id"],
        },
    )

    assert response.status_code == 200, data
    raw_purchase = db.session.get(RawPurchase, purchase["id"])
    purchase_expenses = linked_expenses(raw_purchase_id=purchase["id"], source_type="purchase_payment")
    payable = SupplierPayable.query.filter_by(raw_purchase_id=purchase["id"]).first()

    assert data["raw_purchase"]["financial_flow"] == "cash"
    assert data["raw_purchase"]["purchase_treasury_account_id"] == treasury_env["bank_account_id"]
    assert raw_purchase.status == "confirmed"
    assert payable is None
    assert len(purchase_expenses) == 1
    assert purchase_expenses[0].treasury_account_id == treasury_env["bank_account_id"]
    assert purchase_expenses[0].source_type == "purchase_payment"


def test_raw_purchase_credit_has_no_immediate_cash_impact(treasury_env):
    purchase = create_raw_purchase(
        treasury_env,
        purchase_date="2026-03-12",
        quantity=4,
        unit_cost=15,
        notes="Compra credito QA",
    )
    response, data = confirm_raw_purchase_request(
        treasury_env,
        purchase["id"],
        {"financial_flow": "payable"},
    )

    assert response.status_code == 200, data
    raw_purchase = db.session.get(RawPurchase, purchase["id"])
    payable = SupplierPayable.query.filter_by(raw_purchase_id=purchase["id"]).first()
    purchase_expenses = linked_expenses(raw_purchase_id=purchase["id"], source_type="purchase_payment")

    assert data["raw_purchase"]["financial_flow"] == "payable"
    assert data["raw_purchase"]["purchase_treasury_account_id"] is None
    assert raw_purchase.status == "confirmed"
    assert payable is not None
    assert payable.balance_due == pytest.approx(raw_purchase.total)
    assert len(purchase_expenses) == 0


def test_supplier_payment_with_treasury_account(treasury_env):
    purchase = create_raw_purchase(
        treasury_env,
        purchase_date="2026-03-13",
        quantity=6,
        unit_cost=10,
        notes="Compra proveedor QA",
    )
    confirm_response, confirm_data = confirm_raw_purchase_request(
        treasury_env,
        purchase["id"],
        {"financial_flow": "payable"},
    )
    assert confirm_response.status_code == 200, confirm_data
    payable_id = confirm_data["raw_purchase"]["supplier_payable_id"]

    response = treasury_env["client"].post(
        business_path(treasury_env, f"/supplier-payables/{payable_id}/payments"),
        headers=treasury_env["headers"],
        json={
            "amount": 25,
            "payment_date": "2026-03-14",
            "treasury_account_id": treasury_env["wallet_account_id"],
            "notes": "Pago proveedor QA",
        },
    )
    data = payload_json(response)

    assert response.status_code == 201, data
    payment = db.session.get(SupplierPayment, data["payment"]["id"])
    payable = db.session.get(SupplierPayable, payable_id)
    supplier_expenses = linked_expenses(supplier_payment_id=payment.id, source_type="supplier_payment")

    assert data["payment"]["treasury_account_id"] == treasury_env["wallet_account_id"]
    assert data["payment"]["method"] == "nequi"
    assert payment.treasury_account_id == treasury_env["wallet_account_id"]
    assert payable.amount_paid == pytest.approx(25)
    assert payable.balance_due == pytest.approx(purchase["total"] - 25)
    assert payable.status == "partial"
    assert len(supplier_expenses) == 1
    assert supplier_expenses[0].treasury_account_id == treasury_env["wallet_account_id"]
    assert supplier_expenses[0].supplier_payable_id == payable_id


def test_debt_with_initial_payment_and_treasury_account(treasury_env):
    data = create_debt(
        treasury_env,
        total_amount=200,
        start_date="2026-03-15",
        due_date="2026-03-30",
        name="Deuda inicial QA",
        initial_payment_amount=80,
        treasury_account_id=treasury_env["bank_account_id"],
    )

    debt = db.session.get(Debt, data["debt"]["id"])
    payment = db.session.get(DebtPayment, data["payment"]["id"])
    debt_expenses = linked_expenses(debt_id=debt.id, debt_payment_id=payment.id, source_type="debt_payment")

    assert data["payment"]["treasury_account_id"] == treasury_env["bank_account_id"]
    assert data["payment"]["payment_method"] == "transfer"
    assert payment.treasury_account_id == treasury_env["bank_account_id"]
    assert debt.balance_due == pytest.approx(120)
    assert debt.status == "partial"
    assert len(debt_expenses) == 1
    assert debt_expenses[0].treasury_account_id == treasury_env["bank_account_id"]


def test_debt_payment_with_treasury_account(treasury_env):
    debt_data = create_debt(
        treasury_env,
        total_amount=180,
        start_date="2026-03-16",
        due_date="2026-03-31",
        name="Deuda posterior QA",
    )
    debt_id = debt_data["debt"]["id"]

    response = treasury_env["client"].post(
        business_path(treasury_env, f"/debts/{debt_id}/payments"),
        headers=treasury_env["headers"],
        json={
            "amount": 50,
            "payment_date": "2026-03-17",
            "treasury_account_id": treasury_env["wallet_account_id"],
            "note": "Pago deuda QA",
        },
    )
    data = payload_json(response)

    assert response.status_code == 201, data
    payment = db.session.get(DebtPayment, data["payment"]["id"])
    debt = db.session.get(Debt, debt_id)
    debt_expenses = linked_expenses(debt_id=debt_id, debt_payment_id=payment.id, source_type="debt_payment")

    assert data["payment"]["treasury_account_id"] == treasury_env["wallet_account_id"]
    assert data["payment"]["payment_method"] == "nequi"
    assert payment.treasury_account_id == treasury_env["wallet_account_id"]
    assert debt.balance_due == pytest.approx(130)
    assert debt.status == "partial"
    assert len(debt_expenses) == 1
    assert debt_expenses[0].treasury_account_id == treasury_env["wallet_account_id"]


def test_invalid_treasury_account_returns_400_without_500s(treasury_env):
    invalid_account_id = 999999

    sale_response, sale_data = create_sale_request(
        treasury_env,
        total=110,
        paid=True,
        note="Venta cuenta invalida",
        sale_date="2026-03-18",
        treasury_account_id=invalid_account_id,
    )
    assert sale_response.status_code == 400, sale_data
    assert "error" in sale_data

    payment_response, payment_data = create_payment_request(
        treasury_env,
        amount=30,
        payment_date="2026-03-18",
        treasury_account_id=invalid_account_id,
        note="Cobro cuenta invalida",
    )
    assert payment_response.status_code == 400, payment_data
    assert "error" in payment_data

    expense_response = treasury_env["client"].post(
        business_path(treasury_env, "/expenses"),
        headers=treasury_env["headers"],
        json={
            "expense_date": "2026-03-18",
            "category": "servicios",
            "amount": 44,
            "treasury_account_id": invalid_account_id,
        },
    )
    expense_data = payload_json(expense_response)
    assert expense_response.status_code == 400, expense_data
    assert "error" in expense_data

    purchase = create_raw_purchase(
        treasury_env,
        purchase_date="2026-03-18",
        quantity=2,
        unit_cost=20,
        notes="Compra invalida QA",
    )
    confirm_response, confirm_data = confirm_raw_purchase_request(
        treasury_env,
        purchase["id"],
        {"financial_flow": "cash", "treasury_account_id": invalid_account_id},
    )
    assert confirm_response.status_code == 400, confirm_data
    assert "error" in confirm_data

    payable_purchase = create_raw_purchase(
        treasury_env,
        purchase_date="2026-03-19",
        quantity=3,
        unit_cost=10,
        notes="Compra payable invalida QA",
    )
    payable_confirm_response, payable_confirm_data = confirm_raw_purchase_request(
        treasury_env,
        payable_purchase["id"],
        {"financial_flow": "payable"},
    )
    assert payable_confirm_response.status_code == 200, payable_confirm_data
    payable_id = payable_confirm_data["raw_purchase"]["supplier_payable_id"]

    supplier_payment_response = treasury_env["client"].post(
        business_path(treasury_env, f"/supplier-payables/{payable_id}/payments"),
        headers=treasury_env["headers"],
        json={
            "amount": 10,
            "payment_date": "2026-03-19",
            "treasury_account_id": invalid_account_id,
        },
    )
    supplier_payment_data = payload_json(supplier_payment_response)
    assert supplier_payment_response.status_code == 400, supplier_payment_data
    assert "error" in supplier_payment_data

    debt_response, debt_data = create_debt_request(
        treasury_env,
        {
            "scope": "operational",
            "category": "otros",
            "name": "Deuda invalida QA",
            "creditor_name": "Acreedor QA",
            "total_amount": 100,
            "start_date": "2026-03-20",
            "due_date": "2026-03-30",
            "initial_payment_amount": 20,
            "treasury_account_id": invalid_account_id,
        },
    )
    assert debt_response.status_code == 400, debt_data
    assert "error" in debt_data

    valid_debt = create_debt(
        treasury_env,
        total_amount=140,
        start_date="2026-03-20",
        due_date="2026-03-30",
        name="Deuda valida QA",
    )
    debt_payment_response = treasury_env["client"].post(
        business_path(treasury_env, f"/debts/{valid_debt['debt']['id']}/payments"),
        headers=treasury_env["headers"],
        json={
            "amount": 20,
            "payment_date": "2026-03-21",
            "treasury_account_id": invalid_account_id,
        },
    )
    debt_payment_data = payload_json(debt_payment_response)
    assert debt_payment_response.status_code == 400, debt_payment_data
    assert "error" in debt_payment_data


def test_treasury_account_create_and_promote_default(treasury_env):
    response = treasury_env["client"].post(
        business_path(treasury_env, "/treasury/accounts"),
        headers=treasury_env["headers"],
        json={
            "name": "Banco Occidente QA",
            "account_type": "checking",
            "currency": "COP",
            "opening_balance": 125000,
            "notes": "Cuenta operativa principal",
            "is_active": True,
            "is_default": False,
        },
    )
    data = payload_json(response)
    assert response.status_code == 201, data

    created_id = data["account"]["id"]
    created_account = db.session.get(TreasuryAccount, created_id)
    assert created_account is not None
    assert created_account.name == "Banco Occidente QA"
    assert created_account.account_type == "checking"
    assert created_account.is_default is False

    promote_response = treasury_env["client"].put(
        business_path(treasury_env, f"/treasury/accounts/{created_id}"),
        headers=treasury_env["headers"],
        json={
            "name": "Banco Occidente QA",
            "account_type": "checking",
            "currency": "COP",
            "opening_balance": 125000,
            "notes": "Cuenta operativa principal",
            "is_active": True,
            "is_default": True,
        },
    )
    promote_data = payload_json(promote_response)
    assert promote_response.status_code == 200, promote_data

    db.session.refresh(created_account)
    previous_default = db.session.get(TreasuryAccount, treasury_env["cash_account_id"])
    assert created_account.is_default is True
    assert previous_default is not None
    assert previous_default.is_default is False


def test_treasury_account_deactivate_preserves_history_and_reassigns_default(treasury_env):
    sale_response, sale_data = create_sale_request(
        treasury_env,
        total=95,
        paid=True,
        note="Venta banco QA",
        sale_date="2026-03-21",
        treasury_account_id=treasury_env["bank_account_id"],
    )
    assert sale_response.status_code == 201, sale_data

    update_response = treasury_env["client"].put(
        business_path(treasury_env, f"/treasury/accounts/{treasury_env['cash_account_id']}"),
        headers=treasury_env["headers"],
        json={
          "name": "Caja QA",
          "account_type": "cash",
          "currency": "COP",
          "opening_balance": 0,
          "notes": None,
          "is_active": False,
          "is_default": False,
        },
    )
    update_data = payload_json(update_response)
    assert update_response.status_code == 200, update_data

    cash_account = db.session.get(TreasuryAccount, treasury_env["cash_account_id"])
    bank_account = db.session.get(TreasuryAccount, treasury_env["bank_account_id"])
    assert cash_account is not None and cash_account.is_active is False
    assert cash_account.is_default is False
    assert bank_account is not None and bank_account.is_default is True

    visible_response = treasury_env["client"].get(
        business_path(treasury_env, "/treasury/accounts"),
        headers=treasury_env["headers"],
    )
    visible_data = payload_json(visible_response)
    assert visible_response.status_code == 200, visible_data
    visible_ids = {account["id"] for account in visible_data["accounts"]}
    assert treasury_env["cash_account_id"] not in visible_ids

    all_response = treasury_env["client"].get(
        business_path(treasury_env, "/treasury/accounts?include_inactive=1"),
        headers=treasury_env["headers"],
    )
    all_data = payload_json(all_response)
    assert all_response.status_code == 200, all_data
    inactive_account = next(account for account in all_data["accounts"] if account["id"] == treasury_env["cash_account_id"])
    assert inactive_account["is_active"] is False
    assert "history_usage" in inactive_account

    movements_response = treasury_env["client"].get(
        business_path(treasury_env, f"/treasury/movements?account_id={treasury_env['bank_account_id']}"),
        headers=treasury_env["headers"],
    )
    movements_data = payload_json(movements_response)
    assert movements_response.status_code == 200, movements_data
    assert any(movement.get("treasury_account_id") == treasury_env["bank_account_id"] for movement in movements_data["movements"])


def test_treasury_account_duplicate_name_is_rejected(treasury_env):
    response = treasury_env["client"].post(
        business_path(treasury_env, "/treasury/accounts"),
        headers=treasury_env["headers"],
        json={
            "name": "Caja QA",
            "account_type": "cash",
            "currency": "COP",
            "opening_balance": 0,
            "is_active": True,
        },
    )
    data = payload_json(response)
    assert response.status_code == 400, data
    assert "error" in data


def test_financial_dashboard_uses_real_cash_events_and_period_reference(treasury_env):
    sale_response, sale_data = create_sale_request(
        treasury_env,
        total=100,
        paid=False,
        amount_paid=40,
        note="Venta parcial caja",
        sale_date="2026-03-05",
        treasury_account_id=treasury_env["cash_account_id"],
    )
    assert sale_response.status_code == 201, sale_data
    sale_id = sale_data["sale"]["id"]

    payment_response, payment_data = create_payment_request(
        treasury_env,
        amount=60,
        payment_date="2026-03-10",
        treasury_account_id=treasury_env["bank_account_id"],
        note="Cobro saldo venta parcial",
    )
    assert payment_response.status_code == 201, payment_data

    expense_response = treasury_env["client"].post(
        business_path(treasury_env, "/expenses"),
        headers=treasury_env["headers"],
        json={
            "expense_date": "2026-03-12",
            "category": "servicios",
            "amount": 25,
            "description": "Gasto caja periodo",
            "treasury_account_id": treasury_env["cash_account_id"],
        },
    )
    expense_data = payload_json(expense_response)
    assert expense_response.status_code == 201, expense_data

    dashboard_response = treasury_env["client"].get(
        business_path(treasury_env, "/reports/financial-dashboard?start_date=2026-03-01&end_date=2026-03-15"),
        headers=treasury_env["headers"],
    )
    dashboard_data = payload_json(dashboard_response)
    assert dashboard_response.status_code == 200, dashboard_data

    summary = dashboard_data["summary"]
    assert summary["cash_sales_total"] == pytest.approx(40)
    assert summary["payments_total"] == pytest.approx(60)
    assert summary["cash_in"] == pytest.approx(100)
    assert summary["cash_out"] == pytest.approx(25)
    assert summary["cash_net"] == pytest.approx(75)
    assert summary["accounts_receivable"] == pytest.approx(0)

    sale_movement = next(item for item in dashboard_data["movements"] if item["source_type"] == "sale_payment")
    payment_movement = next(item for item in dashboard_data["movements"] if item["source_type"] == "customer_payment")

    assert sale_movement["amount"] == pytest.approx(40)
    assert sale_movement["date"] == "2026-03-05"
    assert payment_movement["amount"] == pytest.approx(60)
    assert payment_movement["date"] == "2026-03-10"

    sale = db.session.get(Sale, sale_id)
    assert sale.collected_amount == pytest.approx(100)
    assert sale.balance == pytest.approx(0)

    reference_response = treasury_env["client"].get(
        business_path(treasury_env, "/reports/financial-dashboard?start_date=2026-03-01&end_date=2026-03-06"),
        headers=treasury_env["headers"],
    )
    reference_data = payload_json(reference_response)
    assert reference_response.status_code == 200, reference_data
    assert reference_data["summary"]["accounts_receivable"] == pytest.approx(60)
