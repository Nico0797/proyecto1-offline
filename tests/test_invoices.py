import os
import sys
from datetime import date, timedelta
from uuid import uuid4

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import create_app
from backend.auth import create_token
from backend.config import TestingConfig
from backend.database import db
from backend.models import Invoice, InvoicePayment, Payment, Sale, User


@pytest.fixture
def app():
    app = create_app(TestingConfig)

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def auth_token(app):
    with app.app_context():
        user = User(email=f"invoice-{uuid4().hex}@example.com", name="Invoice Tester")
        user.set_password("password123")
        user.email_verified = True
        db.session.add(user)
        db.session.commit()
        return create_token(user.id)


@pytest.fixture
def business_id(client, auth_token):
    response = client.post(
        "/api/businesses",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"name": "Invoice Business", "currency": "COP"},
    )
    return response.get_json()["business"]["id"]


def _headers(token):
    return {"Authorization": f"Bearer {token}"}


def _seed_customer(client, token, business_id):
    response = client.post(
        f"/api/businesses/{business_id}/customers",
        headers=_headers(token),
        json={"name": "Cliente Factura", "phone": "3001234567", "address": "Cra 1 # 2-3"},
    )
    return response.get_json()["customer"]["id"]


def _seed_product(client, token, business_id):
    response = client.post(
        f"/api/businesses/{business_id}/products",
        headers=_headers(token),
        json={"name": "Servicio Premium", "price": 100000},
    )
    return response.get_json()["product"]["id"]


def _create_invoice(client, token, business_id, customer_id, product_id, **overrides):
    payload = {
        "customer_id": customer_id,
        "issue_date": str(date.today()),
        "due_date": str(date.today() + timedelta(days=7)),
        "status": "sent",
        "payment_method": "transfer",
        "notes": "Factura inicial",
        "items": [
            {
                "product_id": product_id,
                "description": "Servicio Premium",
                "quantity": 2,
                "unit_price": 100000,
                "discount": 10000,
                "tax_rate": 19,
            }
        ],
    }
    payload.update(overrides)
    return client.post(
        f"/api/businesses/{business_id}/invoices",
        headers=_headers(token),
        json=payload,
    )


def _register_invoice_payment(client, token, business_id, invoice_id, amount, payment_date=None, payment_method="transfer", note=None):
    return client.post(
        f"/api/businesses/{business_id}/invoices/{invoice_id}/payments",
        headers=_headers(token),
        json={
            "amount": amount,
            "payment_date": payment_date or str(date.today()),
            "payment_method": payment_method,
            "note": note,
        },
    )


def _seed_credit_sale_with_payment(app, business_id, customer_id, *, total=50000, collected_amount=20000, payment_amount=20000):
    with app.app_context():
        sale = Sale(
            business_id=business_id,
            customer_id=customer_id,
            sale_date=date.today(),
            items=[{"name": "Venta a crédito", "qty": 1, "unit_price": total, "total": total}],
            subtotal=total,
            discount=0,
            total=total,
            balance=round(total - collected_amount, 2),
            collected_amount=round(collected_amount, 2),
            payment_method="credit",
            paid=False,
            note="Venta a crédito de prueba",
        )
        db.session.add(sale)
        db.session.flush()

        payment = Payment(
            business_id=business_id,
            customer_id=customer_id,
            sale_id=sale.id,
            payment_date=date.today(),
            amount=round(payment_amount, 2),
            method="cash",
            note="Abono venta",
        )
        db.session.add(payment)
        db.session.commit()
        return sale.id


def test_create_invoice_and_mark_paid(client, auth_token, business_id):
    customer_id = _seed_customer(client, auth_token, business_id)
    product_id = _seed_product(client, auth_token, business_id)

    create_response = _create_invoice(client, auth_token, business_id, customer_id, product_id)

    assert create_response.status_code == 201
    invoice = create_response.get_json()["invoice"]
    assert invoice["status"] == "sent"
    assert invoice["total"] == 226100

    payment_response = client.post(
        f"/api/businesses/{business_id}/invoices/{invoice['id']}/payments",
        headers=_headers(auth_token),
        json={
            "amount": invoice["total"],
            "payment_date": str(date.today()),
            "payment_method": "transfer",
            "note": "Pago completo",
        },
    )

    assert payment_response.status_code == 201
    updated_invoice = payment_response.get_json()["invoice"]
    assert updated_invoice["status"] == "paid"
    assert updated_invoice["outstanding_balance"] == 0
    assert len(updated_invoice["payments"]) == 1


def test_invoice_create_is_idempotent_with_client_operation_id(app, client, auth_token, business_id):
    customer_id = _seed_customer(client, auth_token, business_id)
    product_id = _seed_product(client, auth_token, business_id)
    payload = {
        "customer_id": customer_id,
        "issue_date": str(date.today()),
        "due_date": str(date.today() + timedelta(days=7)),
        "status": "sent",
        "payment_method": "transfer",
        "notes": "Factura offline",
        "client_operation_id": "invoice-create-1",
        "items": [
            {
                "product_id": product_id,
                "description": "Servicio Premium",
                "quantity": 1,
                "unit_price": 100000,
                "discount": 0,
                "tax_rate": 0,
            }
        ],
    }

    first_response = client.post(
        f"/api/businesses/{business_id}/invoices",
        headers=_headers(auth_token),
        json=payload,
    )
    second_response = client.post(
        f"/api/businesses/{business_id}/invoices",
        headers=_headers(auth_token),
        json=payload,
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 201
    assert first_response.get_json()["invoice"]["id"] == second_response.get_json()["invoice"]["id"]

    with app.app_context():
        assert Invoice.query.filter_by(business_id=business_id).count() == 1


def test_duplicate_invoice_creates_draft_copy(client, auth_token, business_id):
    customer_id = _seed_customer(client, auth_token, business_id)
    product_id = _seed_product(client, auth_token, business_id)

    create_response = _create_invoice(
        client,
        auth_token,
        business_id,
        customer_id,
        product_id,
        due_date=str(date.today() + timedelta(days=5)),
        items=[
            {
                "product_id": product_id,
                "description": "Servicio Premium",
                "quantity": 1,
                "unit_price": 100000,
                "discount": 0,
                "tax_rate": 0,
            }
        ],
    )
    invoice_id = create_response.get_json()["invoice"]["id"]

    duplicate_response = client.post(
        f"/api/businesses/{business_id}/invoices/{invoice_id}/duplicate",
        headers=_headers(auth_token),
    )

    assert duplicate_response.status_code == 201
    duplicated = duplicate_response.get_json()["invoice"]
    assert duplicated["status"] == "draft"
    assert duplicated["invoice_number"] != create_response.get_json()["invoice"]["invoice_number"]
    assert duplicated["items"][0]["description"] == "Servicio Premium"


def test_invoice_settings_roundtrip(client, auth_token, business_id):
    get_response = client.get(
        f"/api/businesses/{business_id}/invoice-settings",
        headers=_headers(auth_token),
    )
    assert get_response.status_code == 200
    assert get_response.get_json()["settings"]["prefix"] == "INV"

    update_response = client.put(
        f"/api/businesses/{business_id}/invoice-settings",
        headers=_headers(auth_token),
        json={
            "prefix": "FAC",
            "brand_color": "#1D4ED8",
            "accent_color": "#0F172A",
            "footer_text": "Gracias por tu negocio.",
            "default_notes": "Factura digital compartida desde la app.",
            "default_terms": "Pago a 7 dias.",
        },
    )

    assert update_response.status_code == 200
    settings = update_response.get_json()["settings"]
    assert settings["prefix"] == "FAC"
    assert settings["footer_text"] == "Gracias por tu negocio."


def test_invoice_rejects_invalid_dates_and_item_totals(client, auth_token, business_id):
    customer_id = _seed_customer(client, auth_token, business_id)
    product_id = _seed_product(client, auth_token, business_id)

    invalid_dates_response = _create_invoice(
        client,
        auth_token,
        business_id,
        customer_id,
        product_id,
        issue_date=str(date.today()),
        due_date=str(date.today() - timedelta(days=1)),
    )
    assert invalid_dates_response.status_code == 400
    assert "vencimiento" in invalid_dates_response.get_json()["error"].lower()

    invalid_item_response = _create_invoice(
        client,
        auth_token,
        business_id,
        customer_id,
        product_id,
        items=[
            {
                "product_id": product_id,
                "description": "Servicio Premium",
                "quantity": 1,
                "unit_price": 100000,
                "discount": 120000,
                "tax_rate": 19,
            }
        ],
    )
    assert invalid_item_response.status_code == 400
    assert "descuento" in invalid_item_response.get_json()["error"].lower()


def test_invoice_partial_payment_locks_editing(client, auth_token, business_id):
    customer_id = _seed_customer(client, auth_token, business_id)
    product_id = _seed_product(client, auth_token, business_id)
    invoice = _create_invoice(client, auth_token, business_id, customer_id, product_id).get_json()["invoice"]

    payment_response = client.post(
        f"/api/businesses/{business_id}/invoices/{invoice['id']}/payments",
        headers=_headers(auth_token),
        json={
            "amount": 50000,
            "payment_date": str(date.today()),
            "payment_method": "transfer",
            "note": "Abono inicial",
        },
    )
    assert payment_response.status_code == 201
    updated_invoice = payment_response.get_json()["invoice"]
    assert updated_invoice["status"] == "partial"
    assert updated_invoice["amount_paid"] == 50000
    assert updated_invoice["outstanding_balance"] == 176100

    update_response = client.put(
        f"/api/businesses/{business_id}/invoices/{invoice['id']}",
        headers=_headers(auth_token),
        json={
            "notes": "Intento de editar tras registrar pago",
            "items": [
                {
                    "product_id": product_id,
                    "description": "Servicio Premium ajustado",
                    "quantity": 2,
                    "unit_price": 110000,
                    "discount": 0,
                    "tax_rate": 19,
                }
            ],
        },
    )
    assert update_response.status_code == 400
    assert "no se puede editar" in update_response.get_json()["error"].lower()

    status_response = client.post(
        f"/api/businesses/{business_id}/invoices/{invoice['id']}/status",
        headers=_headers(auth_token),
        json={"status": "sent"},
    )
    assert status_response.status_code == 400
    assert "pagos" in status_response.get_json()["error"].lower()


def test_invoice_payments_require_sent_status_and_block_duplicates(client, auth_token, business_id):
    customer_id = _seed_customer(client, auth_token, business_id)
    product_id = _seed_product(client, auth_token, business_id)
    create_response = _create_invoice(
        client,
        auth_token,
        business_id,
        customer_id,
        product_id,
        status="draft",
    )
    invoice = create_response.get_json()["invoice"]

    draft_payment_response = client.post(
        f"/api/businesses/{business_id}/invoices/{invoice['id']}/payments",
        headers=_headers(auth_token),
        json={
            "amount": 10000,
            "payment_date": str(date.today()),
            "payment_method": "cash",
        },
    )
    assert draft_payment_response.status_code == 400
    assert "enviada" in draft_payment_response.get_json()["error"].lower()

    sent_response = client.post(
        f"/api/businesses/{business_id}/invoices/{invoice['id']}/status",
        headers=_headers(auth_token),
        json={"status": "sent"},
    )
    assert sent_response.status_code == 200

    first_payment_response = client.post(
        f"/api/businesses/{business_id}/invoices/{invoice['id']}/payments",
        headers=_headers(auth_token),
        json={
            "amount": 25000,
            "payment_date": str(date.today()),
            "payment_method": "cash",
            "note": "Caja principal",
        },
    )
    assert first_payment_response.status_code == 201

    duplicate_payment_response = client.post(
        f"/api/businesses/{business_id}/invoices/{invoice['id']}/payments",
        headers=_headers(auth_token),
        json={
            "amount": 25000,
            "payment_date": str(date.today()),
            "payment_method": "cash",
            "note": "Caja principal",
        },
    )
    assert duplicate_payment_response.status_code == 400
    assert "identico" in duplicate_payment_response.get_json()["error"].lower()


def test_invoice_payment_create_is_idempotent_with_client_operation_id(app, client, auth_token, business_id):
    customer_id = _seed_customer(client, auth_token, business_id)
    product_id = _seed_product(client, auth_token, business_id)
    invoice = _create_invoice(client, auth_token, business_id, customer_id, product_id).get_json()["invoice"]

    payload = {
        "amount": invoice["total"],
        "payment_date": str(date.today()),
        "payment_method": "transfer",
        "note": "Pago offline",
        "client_operation_id": "invoice-payment-1",
    }

    first_response = client.post(
        f"/api/businesses/{business_id}/invoices/{invoice['id']}/payments",
        headers=_headers(auth_token),
        json=payload,
    )
    second_response = client.post(
        f"/api/businesses/{business_id}/invoices/{invoice['id']}/payments",
        headers=_headers(auth_token),
        json=payload,
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 201
    assert first_response.get_json()["payment"]["id"] == second_response.get_json()["payment"]["id"]
    assert len(second_response.get_json()["invoice"]["payments"]) == 1
    assert second_response.get_json()["invoice"]["status"] == "paid"

    with app.app_context():
        assert InvoicePayment.query.filter_by(invoice_id=invoice["id"]).count() == 1


def test_invoice_update_detects_conflict_with_newer_server_version(client, auth_token, business_id):
    customer_id = _seed_customer(client, auth_token, business_id)
    product_id = _seed_product(client, auth_token, business_id)
    invoice = _create_invoice(client, auth_token, business_id, customer_id, product_id).get_json()["invoice"]
    stale_updated_at = invoice["updated_at"]

    refresh_response = client.put(
        f"/api/businesses/{business_id}/invoices/{invoice['id']}",
        headers=_headers(auth_token),
        json={
            "customer_id": customer_id,
            "issue_date": invoice["issue_date"],
            "due_date": invoice["due_date"],
            "status": "sent",
            "payment_method": "transfer",
            "notes": "Cambio reciente del servidor",
            "items": [
                {
                    "product_id": product_id,
                    "description": "Servicio Premium",
                    "quantity": 2,
                    "unit_price": 100000,
                    "discount": 5000,
                    "tax_rate": 19,
                }
            ],
        },
    )
    assert refresh_response.status_code == 200

    conflict_response = client.put(
        f"/api/businesses/{business_id}/invoices/{invoice['id']}",
        headers=_headers(auth_token),
        json={
            "customer_id": customer_id,
            "issue_date": invoice["issue_date"],
            "due_date": invoice["due_date"],
            "status": "sent",
            "payment_method": "transfer",
            "notes": "Cambio local offline",
            "expected_updated_at": stale_updated_at,
            "items": [
                {
                    "product_id": product_id,
                    "description": "Servicio Premium",
                    "quantity": 2,
                    "unit_price": 100000,
                    "discount": 10000,
                    "tax_rate": 19,
                }
            ],
        },
    )

    assert conflict_response.status_code == 409
    payload = conflict_response.get_json()
    assert payload["code"] == "invoice_conflict"
    assert payload["conflict"]["actual_updated_at"] != stale_updated_at


def test_invoice_status_update_detects_conflict_with_newer_server_version(client, auth_token, business_id):
    customer_id = _seed_customer(client, auth_token, business_id)
    product_id = _seed_product(client, auth_token, business_id)
    invoice = _create_invoice(client, auth_token, business_id, customer_id, product_id).get_json()["invoice"]
    stale_updated_at = invoice["updated_at"]

    refresh_response = client.put(
        f"/api/businesses/{business_id}/invoices/{invoice['id']}",
        headers=_headers(auth_token),
        json={
            "customer_id": customer_id,
            "issue_date": invoice["issue_date"],
            "due_date": invoice["due_date"],
            "status": "sent",
            "payment_method": "card",
            "notes": "Servidor actualizó el método de pago",
            "items": [
                {
                    "product_id": product_id,
                    "description": "Servicio Premium",
                    "quantity": 2,
                    "unit_price": 100000,
                    "discount": 10000,
                    "tax_rate": 19,
                }
            ],
        },
    )
    assert refresh_response.status_code == 200

    conflict_response = client.post(
        f"/api/businesses/{business_id}/invoices/{invoice['id']}/status",
        headers=_headers(auth_token),
        json={"status": "cancelled", "expected_updated_at": stale_updated_at},
    )

    assert conflict_response.status_code == 409
    payload = conflict_response.get_json()
    assert payload["code"] == "invoice_conflict"
    assert payload["conflict"]["server_invoice_number"] == invoice["invoice_number"]


def test_cancelled_invoice_cannot_be_reopened(client, auth_token, business_id):
    customer_id = _seed_customer(client, auth_token, business_id)
    product_id = _seed_product(client, auth_token, business_id)
    invoice = _create_invoice(client, auth_token, business_id, customer_id, product_id).get_json()["invoice"]

    cancel_response = client.post(
        f"/api/businesses/{business_id}/invoices/{invoice['id']}/status",
        headers=_headers(auth_token),
        json={"status": "cancelled"},
    )
    assert cancel_response.status_code == 200
    assert cancel_response.get_json()["invoice"]["status"] == "cancelled"

    reopen_response = client.post(
        f"/api/businesses/{business_id}/invoices/{invoice['id']}/status",
        headers=_headers(auth_token),
        json={"status": "sent"},
    )
    assert reopen_response.status_code == 400
    assert "no puede reabrirse" in reopen_response.get_json()["error"].lower()


def test_invoice_print_view_supports_long_documents(client, auth_token, business_id):
    customer_id = _seed_customer(client, auth_token, business_id)
    product_id = _seed_product(client, auth_token, business_id)

    settings_response = client.put(
        f"/api/businesses/{business_id}/invoice-settings",
        headers=_headers(auth_token),
        json={
            "prefix": "FAC",
            "brand_color": "#1D4ED8",
            "accent_color": "#0F172A",
            "footer_text": "Documento preparado para impresion.",
            "default_notes": "Gracias por tu compra.",
            "default_terms": "Pago contra entrega.\nSoporte por 30 dias.\nAplican condiciones comerciales.",
        },
    )
    assert settings_response.status_code == 200

    create_response = _create_invoice(
        client,
        auth_token,
        business_id,
        customer_id,
        product_id,
        items=[
            {
                "product_id": product_id,
                "description": f"Servicio extendido #{index + 1}",
                "quantity": 1,
                "unit_price": 10000 + index * 500,
                "discount": 0,
                "tax_rate": 19,
            }
            for index in range(15)
        ],
        notes="Factura con suficientes lineas para validar la vista imprimible.",
    )
    invoice_id = create_response.get_json()["invoice"]["id"]

    print_response = client.get(
        f"/api/businesses/{business_id}/invoices/{invoice_id}/print",
        headers=_headers(auth_token),
    )
    assert print_response.status_code == 200
    html = print_response.get_data(as_text=True)
    assert "Servicio extendido #15" in html
    assert "Pago contra entrega." in html
    assert "Documento preparado para impresion." in html


def test_invoice_whatsapp_share_message_summarizes_cleanly(client, auth_token, business_id):
    customer_id = _seed_customer(client, auth_token, business_id)
    product_id = _seed_product(client, auth_token, business_id)
    create_response = _create_invoice(
        client,
        auth_token,
        business_id,
        customer_id,
        product_id,
        items=[
            {
                "product_id": product_id,
                "description": f"Concepto #{index + 1}",
                "quantity": 1,
                "unit_price": 10000,
                "discount": 0,
                "tax_rate": 0,
            }
            for index in range(6)
        ],
        notes="Enviar con mensaje corto.",
    )
    invoice_id = create_response.get_json()["invoice"]["id"]

    share_response = client.get(
        f"/api/businesses/{business_id}/invoices/{invoice_id}/share/whatsapp",
        headers=_headers(auth_token),
    )
    assert share_response.status_code == 200
    payload = share_response.get_json()
    assert "Saldo pendiente" in payload["message"]
    assert "+2 linea(s) adicional(es)" in payload["message"]
    assert "Notas: Enviar con mensaje corto." in payload["message"]


def test_invoice_receivables_summary_and_filters(client, auth_token, business_id):
    customer_id = _seed_customer(client, auth_token, business_id)
    product_id = _seed_product(client, auth_token, business_id)

    overdue_invoice = _create_invoice(
        client,
        auth_token,
        business_id,
        customer_id,
        product_id,
        issue_date=str(date.today() - timedelta(days=10)),
        due_date=str(date.today() - timedelta(days=3)),
        items=[
            {
                "product_id": product_id,
                "description": "Factura vencida",
                "quantity": 1,
                "unit_price": 100000,
                "discount": 0,
                "tax_rate": 0,
            }
        ],
    ).get_json()["invoice"]

    partial_invoice = _create_invoice(
        client,
        auth_token,
        business_id,
        customer_id,
        product_id,
        due_date=str(date.today() + timedelta(days=5)),
        items=[
            {
                "product_id": product_id,
                "description": "Factura con abono",
                "quantity": 1,
                "unit_price": 100000,
                "discount": 0,
                "tax_rate": 0,
            }
        ],
    ).get_json()["invoice"]
    _register_invoice_payment(client, auth_token, business_id, partial_invoice["id"], 30000, note="Abono parcial")

    unpaid_invoice = _create_invoice(
        client,
        auth_token,
        business_id,
        customer_id,
        product_id,
        due_date=str(date.today() + timedelta(days=2)),
        items=[
            {
                "product_id": product_id,
                "description": "Factura pendiente",
                "quantity": 1,
                "unit_price": 80000,
                "discount": 0,
                "tax_rate": 0,
            }
        ],
    ).get_json()["invoice"]

    paid_invoice = _create_invoice(
        client,
        auth_token,
        business_id,
        customer_id,
        product_id,
        due_date=str(date.today() + timedelta(days=4)),
        items=[
            {
                "product_id": product_id,
                "description": "Factura pagada",
                "quantity": 1,
                "unit_price": 100000,
                "discount": 0,
                "tax_rate": 0,
            }
        ],
    ).get_json()["invoice"]
    _register_invoice_payment(client, auth_token, business_id, paid_invoice["id"], 100000, note="Pago completo")

    cancelled_invoice = _create_invoice(
        client,
        auth_token,
        business_id,
        customer_id,
        product_id,
        due_date=str(date.today() + timedelta(days=4)),
        items=[
            {
                "product_id": product_id,
                "description": "Factura cancelada",
                "quantity": 1,
                "unit_price": 100000,
                "discount": 0,
                "tax_rate": 0,
            }
        ],
    ).get_json()["invoice"]
    cancel_response = client.post(
        f"/api/businesses/{business_id}/invoices/{cancelled_invoice['id']}/status",
        headers=_headers(auth_token),
        json={"status": "cancelled"},
    )
    assert cancel_response.status_code == 200

    overview_response = client.get(
        f"/api/businesses/{business_id}/invoice-receivables",
        headers=_headers(auth_token),
    )
    assert overview_response.status_code == 200
    overview = overview_response.get_json()
    assert overview["summary"]["total_outstanding"] == 250000
    assert overview["summary"]["overdue_total"] == 100000
    assert overview["summary"]["due_soon_total"] == 150000
    assert overview["summary"]["invoiced_total"] == 380000
    assert overview["summary"]["amount_collected_in_range"] == 130000
    assert overview["summary"]["collection_rate"] == pytest.approx(34.21, abs=0.01)
    assert overview["summary"]["customer_count"] == 1
    assert overview["summary"]["unpaid_invoice_count"] == 3
    assert overview["summary"]["overdue_invoice_count"] == 1
    assert overview["summary"]["partial_invoice_count"] == 1
    assert overview["customers"][0]["total_balance"] == 250000
    assert overview["customers"][0]["overdue_balance"] == 100000
    assert overview["customers"][0]["due_soon_balance"] == 150000
    assert overview["customers"][0]["invoice_count"] == 3

    overdue_response = client.get(
        f"/api/businesses/{business_id}/invoice-receivables?status=overdue",
        headers=_headers(auth_token),
    )
    assert overdue_response.status_code == 200
    assert [item["invoice_id"] for item in overdue_response.get_json()["receivables"]] == [overdue_invoice["id"]]

    partial_response = client.get(
        f"/api/businesses/{business_id}/invoice-receivables?status=partial",
        headers=_headers(auth_token),
    )
    assert partial_response.status_code == 200
    assert [item["invoice_id"] for item in partial_response.get_json()["receivables"]] == [partial_invoice["id"]]

    unpaid_response = client.get(
        f"/api/businesses/{business_id}/invoice-receivables?status=unpaid",
        headers=_headers(auth_token),
    )
    assert unpaid_response.status_code == 200
    assert [item["invoice_id"] for item in unpaid_response.get_json()["receivables"]] == [unpaid_invoice["id"]]

    paid_response = client.get(
        f"/api/businesses/{business_id}/invoice-receivables?status=paid",
        headers=_headers(auth_token),
    )
    assert paid_response.status_code == 200
    assert [item["invoice_id"] for item in paid_response.get_json()["receivables"]] == [paid_invoice["id"]]

    cancelled_response = client.get(
        f"/api/businesses/{business_id}/invoice-receivables?status=cancelled",
        headers=_headers(auth_token),
    )
    assert cancelled_response.status_code == 200
    assert [item["invoice_id"] for item in cancelled_response.get_json()["receivables"]] == [cancelled_invoice["id"]]


def test_customer_balance_and_financial_dashboard_include_invoice_accounting_without_double_count(app, client, auth_token, business_id):
    customer_id = _seed_customer(client, auth_token, business_id)
    product_id = _seed_product(client, auth_token, business_id)

    invoice = _create_invoice(
        client,
        auth_token,
        business_id,
        customer_id,
        product_id,
        issue_date=str(date.today() - timedelta(days=10)),
        due_date=str(date.today() - timedelta(days=5)),
        items=[
            {
                "product_id": product_id,
                "description": "Factura integrada",
                "quantity": 1,
                "unit_price": 100000,
                "discount": 0,
                "tax_rate": 0,
            }
        ],
    ).get_json()["invoice"]
    _register_invoice_payment(client, auth_token, business_id, invoice["id"], 40000, note="Cobro factura")

    _seed_credit_sale_with_payment(app, business_id, customer_id, total=50000, collected_amount=20000, payment_amount=20000)

    customer_response = client.get(
        f"/api/businesses/{business_id}/customers/{customer_id}",
        headers=_headers(auth_token),
    )
    assert customer_response.status_code == 200
    customer_payload = customer_response.get_json()["customer"]
    assert customer_payload["sales_balance"] == 30000
    assert customer_payload["invoice_balance"] == 60000
    assert customer_payload["balance"] == 90000

    dashboard_response = client.get(
        f"/api/businesses/{business_id}/reports/financial-dashboard?start_date={date.today().isoformat()}&end_date={date.today().isoformat()}",
        headers=_headers(auth_token),
    )
    assert dashboard_response.status_code == 200
    dashboard = dashboard_response.get_json()
    assert dashboard["summary"]["sales_accounts_receivable"] == 30000
    assert dashboard["summary"]["invoice_accounts_receivable"] == 60000
    assert dashboard["summary"]["accounts_receivable"] == 90000
    assert dashboard["summary"]["invoice_payments_total"] == 40000
    assert dashboard["summary"]["customer_collections_total"] == 60000
    assert dashboard["summary"]["cash_in"] == 60000
    assert any(item["source_type"] == "invoice_payment" and item["amount"] == 40000 for item in dashboard["movements"])


def test_invoice_customer_statement_and_share_routes(client, auth_token, business_id):
    customer_id = _seed_customer(client, auth_token, business_id)
    product_id = _seed_product(client, auth_token, business_id)

    overdue_invoice = _create_invoice(
        client,
        auth_token,
        business_id,
        customer_id,
        product_id,
        issue_date=str(date.today() - timedelta(days=9)),
        due_date=str(date.today() - timedelta(days=2)),
        items=[
            {
                "product_id": product_id,
                "description": "Servicio vencido",
                "quantity": 1,
                "unit_price": 100000,
                "discount": 0,
                "tax_rate": 0,
            }
        ],
    ).get_json()["invoice"]

    partial_invoice = _create_invoice(
        client,
        auth_token,
        business_id,
        customer_id,
        product_id,
        due_date=str(date.today() + timedelta(days=4)),
        items=[
            {
                "product_id": product_id,
                "description": "Servicio con abono",
                "quantity": 1,
                "unit_price": 100000,
                "discount": 0,
                "tax_rate": 0,
            }
        ],
    ).get_json()["invoice"]
    _register_invoice_payment(client, auth_token, business_id, partial_invoice["id"], 30000, note="Abono")

    current_invoice = _create_invoice(
        client,
        auth_token,
        business_id,
        customer_id,
        product_id,
        due_date=str(date.today() + timedelta(days=2)),
        items=[
            {
                "product_id": product_id,
                "description": "Servicio pendiente",
                "quantity": 1,
                "unit_price": 80000,
                "discount": 0,
                "tax_rate": 0,
            }
        ],
    ).get_json()["invoice"]

    paid_invoice = _create_invoice(
        client,
        auth_token,
        business_id,
        customer_id,
        product_id,
        due_date=str(date.today() + timedelta(days=2)),
        items=[
            {
                "product_id": product_id,
                "description": "Servicio pagado",
                "quantity": 1,
                "unit_price": 100000,
                "discount": 0,
                "tax_rate": 0,
            }
        ],
    ).get_json()["invoice"]
    _register_invoice_payment(client, auth_token, business_id, paid_invoice["id"], 100000, note="Pago total")

    cancelled_invoice = _create_invoice(
        client,
        auth_token,
        business_id,
        customer_id,
        product_id,
        due_date=str(date.today() + timedelta(days=3)),
        items=[
            {
                "product_id": product_id,
                "description": "Servicio cancelado",
                "quantity": 1,
                "unit_price": 100000,
                "discount": 0,
                "tax_rate": 0,
            }
        ],
    ).get_json()["invoice"]
    client.post(
        f"/api/businesses/{business_id}/invoices/{cancelled_invoice['id']}/status",
        headers=_headers(auth_token),
        json={"status": "cancelled"},
    )

    statement_response = client.get(
        f"/api/businesses/{business_id}/invoice-receivables/customers/{customer_id}/statement",
        headers=_headers(auth_token),
    )
    assert statement_response.status_code == 200
    statement = statement_response.get_json()
    assert statement["summary"]["invoice_count"] == 5
    assert statement["summary"]["open_count"] == 3
    assert statement["summary"]["overdue_count"] == 1
    assert statement["summary"]["cancelled_count"] == 1
    assert statement["summary"]["total_invoiced"] == 380000
    assert statement["summary"]["total_paid"] == 130000
    assert statement["summary"]["payments_received"] == 130000
    assert statement["summary"]["payment_count"] == 2
    assert statement["summary"]["balance_due"] == 250000
    assert statement["summary"]["overdue_total"] == 100000
    assert {item["invoice_id"] for item in statement["invoices"]} == {
        overdue_invoice["id"],
        partial_invoice["id"],
        current_invoice["id"],
        paid_invoice["id"],
        cancelled_invoice["id"],
    }

    reminder_response = client.get(
        f"/api/businesses/{business_id}/invoices/{overdue_invoice['id']}/share/reminder",
        headers=_headers(auth_token),
    )
    assert reminder_response.status_code == 200
    reminder_payload = reminder_response.get_json()
    assert overdue_invoice["invoice_number"] in reminder_payload["message"]
    assert "Saldo pendiente" in reminder_payload["message"]

    share_response = client.get(
        f"/api/businesses/{business_id}/invoice-receivables/customers/{customer_id}/statement/share/whatsapp",
        headers=_headers(auth_token),
    )
    assert share_response.status_code == 200
    share_payload = share_response.get_json()
    assert "estado de cuenta" in share_payload["message"].lower()
    assert "Saldo pendiente" in share_payload["message"]
    assert current_invoice["invoice_number"] in share_payload["message"]

    print_response = client.get(
        f"/api/businesses/{business_id}/invoice-receivables/customers/{customer_id}/statement/print",
        headers=_headers(auth_token),
    )
    assert print_response.status_code == 200
    html = print_response.get_data(as_text=True)
    assert "Estado de cuenta" in html
    assert "Saldo pendiente" in html
    assert current_invoice["invoice_number"] in html


def test_invoice_payment_posts_to_treasury_movements(client, auth_token, business_id):
    customer_id = _seed_customer(client, auth_token, business_id)
    product_id = _seed_product(client, auth_token, business_id)

    invoice = _create_invoice(
        client,
        auth_token,
        business_id,
        customer_id,
        product_id,
        items=[
            {
                "product_id": product_id,
                "description": "Cobro con tesoreria",
                "quantity": 1,
                "unit_price": 120000,
                "discount": 0,
                "tax_rate": 0,
            }
        ],
    ).get_json()["invoice"]

    payment_response = _register_invoice_payment(
        client,
        auth_token,
        business_id,
        invoice["id"],
        50000,
        payment_method="cash",
        note="Caja principal",
    )
    assert payment_response.status_code == 201
    payment_payload = payment_response.get_json()["payment"]
    assert payment_payload["event_type"] == "payment"
    assert payment_payload["treasury_account_id"] is not None
    assert payment_payload["signed_amount"] == 50000

    movements_response = client.get(
        f"/api/businesses/{business_id}/treasury/movements",
        headers=_headers(auth_token),
    )
    assert movements_response.status_code == 200
    movements = movements_response.get_json()["movements"]
    invoice_movements = [item for item in movements if item["source_type"] == "invoice_payment" and item["document_id"] == payment_payload["id"]]
    assert len(invoice_movements) == 1
    assert invoice_movements[0]["direction"] == "in"
    assert invoice_movements[0]["treasury_account_id"] == payment_payload["treasury_account_id"]
    assert invoice_movements[0]["amount"] == 50000


def test_invoice_refund_and_reversal_restore_receivable_and_allow_cancel(client, auth_token, business_id):
    customer_id = _seed_customer(client, auth_token, business_id)
    product_id = _seed_product(client, auth_token, business_id)

    invoice = _create_invoice(
        client,
        auth_token,
        business_id,
        customer_id,
        product_id,
        items=[
            {
                "product_id": product_id,
                "description": "Factura con ajuste",
                "quantity": 1,
                "unit_price": 100000,
                "discount": 0,
                "tax_rate": 0,
            }
        ],
    ).get_json()["invoice"]

    payment_response = _register_invoice_payment(
        client,
        auth_token,
        business_id,
        invoice["id"],
        100000,
        payment_method="transfer",
        note="Pago original",
    )
    assert payment_response.status_code == 201
    payment = payment_response.get_json()["payment"]

    refund_response = client.post(
        f"/api/businesses/{business_id}/invoices/{invoice['id']}/payments/{payment['id']}/refund",
        headers=_headers(auth_token),
        json={
            "amount": 25000,
            "payment_date": str(date.today()),
            "payment_method": "transfer",
            "note": "Devolucion parcial",
        },
    )
    assert refund_response.status_code == 201
    refunded_invoice = refund_response.get_json()["invoice"]
    assert refunded_invoice["status"] == "partial"
    assert refunded_invoice["amount_paid"] == 75000
    assert refunded_invoice["refunded_amount"] == 25000
    assert refunded_invoice["outstanding_balance"] == 25000

    reversal_response = client.post(
        f"/api/businesses/{business_id}/invoices/{invoice['id']}/payments/{payment['id']}/reverse",
        headers=_headers(auth_token),
        json={
            "amount": 75000,
            "payment_date": str(date.today()),
            "payment_method": "transfer",
            "note": "Reversion del saldo restante",
        },
    )
    assert reversal_response.status_code == 201
    reversed_invoice = reversal_response.get_json()["invoice"]
    assert reversed_invoice["status"] == "sent"
    assert reversed_invoice["amount_paid"] == 0
    assert reversed_invoice["reversed_amount"] == 75000
    assert reversed_invoice["outstanding_balance"] == 100000

    cancel_response = client.post(
        f"/api/businesses/{business_id}/invoices/{invoice['id']}/status",
        headers=_headers(auth_token),
        json={"status": "cancelled"},
    )
    assert cancel_response.status_code == 200
    cancelled_invoice = cancel_response.get_json()["invoice"]
    assert cancelled_invoice["status"] == "cancelled"

    receivables_response = client.get(
        f"/api/businesses/{business_id}/invoice-receivables",
        headers=_headers(auth_token),
    )
    assert receivables_response.status_code == 200
    assert receivables_response.get_json()["summary"]["total_outstanding"] == 0


def test_financial_dashboard_uses_net_invoice_collections_without_double_counting(client, auth_token, business_id):
    customer_id = _seed_customer(client, auth_token, business_id)
    product_id = _seed_product(client, auth_token, business_id)

    invoice = _create_invoice(
        client,
        auth_token,
        business_id,
        customer_id,
        product_id,
        items=[
            {
                "product_id": product_id,
                "description": "Factura dashboard",
                "quantity": 1,
                "unit_price": 150000,
                "discount": 0,
                "tax_rate": 0,
            }
        ],
    ).get_json()["invoice"]

    payment_response = _register_invoice_payment(
        client,
        auth_token,
        business_id,
        invoice["id"],
        150000,
        payment_method="cash",
        note="Cobro total",
    )
    payment = payment_response.get_json()["payment"]

    refund_response = client.post(
        f"/api/businesses/{business_id}/invoices/{invoice['id']}/payments/{payment['id']}/refund",
        headers=_headers(auth_token),
        json={
            "amount": 30000,
            "payment_date": str(date.today()),
            "payment_method": "cash",
            "note": "Ajuste comercial",
        },
    )
    assert refund_response.status_code == 201

    dashboard_response = client.get(
        f"/api/businesses/{business_id}/reports/financial-dashboard?start_date={date.today().isoformat()}&end_date={date.today().isoformat()}",
        headers=_headers(auth_token),
    )
    assert dashboard_response.status_code == 200
    summary = dashboard_response.get_json()["summary"]
    assert summary["invoice_gross_collections_total"] == 150000
    assert summary["invoice_refunds_total"] == 30000
    assert summary["invoice_reversals_total"] == 0
    assert summary["invoice_net_collections_total"] == 120000
    assert summary["invoice_payments_total"] == 120000
    assert summary["cash_in"] == 150000
    assert summary["cash_out"] == 30000
    assert summary["cash_net"] == 120000
