# Cuaderno - Sales Tests
# ============================================
"""
Tests de ventas y reportes
"""
import pytest
import sys
import os
from datetime import date
from sqlalchemy.pool import StaticPool

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import create_app
from backend.config import TestingConfig
from backend.database import db
from backend.models import User, Business, Product, Customer


class TestSalesConfig(TestingConfig):
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_ENGINE_OPTIONS = {
        "connect_args": {"check_same_thread": False},
        "poolclass": StaticPool,
    }


@pytest.fixture
def app():
    """Create application for testing"""
    app = create_app(TestSalesConfig)
    
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture
def auth_token(client):
    """Create user and get auth token"""
    # Register
    response = client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "Password123!",
        "name": "Test User"
    })
    assert response.status_code == 201
    return response.get_json()["access_token"]


@pytest.fixture
def business_id(client, auth_token):
    """Create business and get ID"""
    response = client.post(
        "/api/businesses",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"name": "Test Business", "currency": "COP"}
    )
    return response.get_json()["business"]["id"]


def test_create_product(client, auth_token, business_id):
    """Test creating a product"""
    response = client.post(
        f"/api/businesses/{business_id}/products",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={
            "name": "Test Product",
            "sku": "TP-001",
            "price": 10000,
            "cost": 5000,
            "unit": "und"
        }
    )
    
    assert response.status_code == 201
    data = response.get_json()
    assert data["product"]["name"] == "Test Product"
    assert data["product"]["price"] == 10000


def test_get_products(client, auth_token, business_id):
    """Test getting products"""
    # Create product first
    client.post(
        f"/api/businesses/{business_id}/products",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"name": "Product 1", "price": 10000}
    )
    
    response = client.get(
        f"/api/businesses/{business_id}/products",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert len(data["products"]) == 1


def test_create_customer(client, auth_token, business_id):
    """Test creating a customer"""
    response = client.post(
        f"/api/businesses/{business_id}/customers",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={
            "name": "John Doe",
            "phone": "3001234567",
            "address": "Test Address"
        }
    )
    
    assert response.status_code == 201
    data = response.get_json()
    assert data["customer"]["name"] == "John Doe"


def test_create_sale(client, auth_token, business_id):
    """Test creating a sale"""
    # Create product first
    client.post(
        f"/api/businesses/{business_id}/products",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"name": "Product 1", "price": 10000}
    )
    
    # Create sale
    response = client.post(
        f"/api/businesses/{business_id}/sales",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={
            "sale_date": str(date.today()),
            "items": [{
                "product_id": 1,
                "name": "Product 1",
                "qty": 2,
                "unit_price": 10000,
                "total": 20000
            }],
            "subtotal": 20000,
            "discount": 0,
            "total": 20000,
            "payment_method": "cash"
        }
    )
    
    assert response.status_code == 201
    data = response.get_json()
    assert data["sale"]["total"] == 20000
    assert data["sale"]["paid"] == True


def test_create_credit_sale(client, auth_token, business_id):
    """Test creating a credit (fiado) sale"""
    # Create customer
    client.post(
        f"/api/businesses/{business_id}/customers",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"name": "John Doe", "phone": "3001234567"}
    )
    
    # Create product
    client.post(
        f"/api/businesses/{business_id}/products",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"name": "Product 1", "price": 10000}
    )
    
    # Create credit sale
    response = client.post(
        f"/api/businesses/{business_id}/sales",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={
            "sale_date": str(date.today()),
            "customer_id": 1,
            "items": [{
                "product_id": 1,
                "name": "Product 1",
                "qty": 1,
                "unit_price": 10000,
                "total": 10000
            }],
            "subtotal": 10000,
            "discount": 0,
            "total": 10000,
            "payment_method": "credit"
        }
    )
    
    assert response.status_code == 201
    data = response.get_json()
    assert data["sale"]["paid"] == False  # Credit sale is not paid


def test_sales_list_is_lightweight_by_default_and_detail_is_on_demand(client, auth_token, business_id):
    client.post(
        f"/api/businesses/{business_id}/products",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"name": "Product 1", "price": 10000}
    )

    create_response = client.post(
        f"/api/businesses/{business_id}/sales",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={
            "sale_date": str(date.today()),
            "items": [{
                "product_id": 1,
                "name": "Product 1",
                "qty": 2,
                "unit_price": 10000,
                "total": 20000
            }],
            "subtotal": 20000,
            "discount": 0,
            "total": 20000,
            "payment_method": "cash"
        }
    )
    assert create_response.status_code == 201
    sale_id = create_response.get_json()["sale"]["id"]

    list_response = client.get(
        f"/api/businesses/{business_id}/sales",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert list_response.status_code == 200
    list_data = list_response.get_json()
    listed_sale = next((sale for sale in list_data["sales"] if sale["id"] == sale_id), None)
    assert listed_sale is not None
    assert listed_sale["items"] == []

    expanded_response = client.get(
        f"/api/businesses/{business_id}/sales?include_items=true",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert expanded_response.status_code == 200
    expanded_data = expanded_response.get_json()
    expanded_sale = next((sale for sale in expanded_data["sales"] if sale["id"] == sale_id), None)
    assert expanded_sale is not None
    assert len(expanded_sale["items"]) == 1
    assert expanded_sale["items"][0]["name"] == "Product 1"

    detail_response = client.get(
        f"/api/businesses/{business_id}/sales/{sale_id}",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert detail_response.status_code == 200
    detail_data = detail_response.get_json()
    assert detail_data["sale"]["id"] == sale_id
    assert len(detail_data["sale"]["items"]) == 1
    assert detail_data["sale"]["items"][0]["name"] == "Product 1"


def test_daily_report(client, auth_token, business_id):
    """Test daily report"""
    response = client.get(
        f"/api/businesses/{business_id}/reports/daily",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert "date" in data
    assert "sales" in data
    assert "cash_flow" in data


def test_summary_report(client, auth_token, business_id):
    """Test summary report"""
    response = client.get(
        f"/api/businesses/{business_id}/reports/summary",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    
    assert response.status_code == 200
    data = response.get_json()
    assert "period" in data
    assert "sales" in data
    assert "expenses" in data
    assert "profit" in data


def test_summary_report_preserves_payload_with_credit_sale_payment_and_expense(client, auth_token, business_id):
    today = str(date.today())

    with client.application.app_context():
        customer = Customer(business_id=business_id, name="Summary Customer", phone="3001234567")
        product = Product(business_id=business_id, name="Summary Product", price=10000, cost=4000)
        db.session.add(customer)
        db.session.add(product)
        db.session.commit()
        customer_id = customer.id
        product_id = product.id

    sale_response = client.post(
        f"/api/businesses/{business_id}/sales",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={
            "sale_date": today,
            "customer_id": customer_id,
            "items": [{
                "product_id": product_id,
                "name": "Summary Product",
                "qty": 1,
                "unit_price": 10000,
                "total": 10000,
            }],
            "subtotal": 10000,
            "discount": 0,
            "total": 10000,
            "payment_method": "credit",
            "paid": False,
            "amount_paid": 0,
        }
    )
    assert sale_response.status_code == 201
    sale_id = sale_response.get_json()["sale"]["id"]

    payment_response = client.post(
        f"/api/businesses/{business_id}/payments",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={
            "customer_id": customer_id,
            "sale_id": sale_id,
            "amount": 2000,
            "payment_date": today,
            "method": "cash",
        }
    )
    assert payment_response.status_code == 201

    expense_response = client.post(
        f"/api/businesses/{business_id}/expenses",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={
            "category": "servicios",
            "amount": 500,
            "expense_date": today,
            "description": "summary expense",
        }
    )
    assert expense_response.status_code == 201

    summary_response = client.get(
        f"/api/businesses/{business_id}/reports/summary?start_date={today}&end_date={today}",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert summary_response.status_code == 200

    data = summary_response.get_json()
    assert data["period"] == {"start": today, "end": today}
    assert data["sales"] == {"count": 1, "total": 10000.0}
    assert data["expenses"] == {"count": 1, "total": 500.0}
    assert data["profit"] == {"gross": 6000.0, "net": 5500.0}
    assert data["cash_flow"] == {"in": 2000.0, "out": 500.0, "net": 700.0}
    assert data["accounts_receivable"] == 8000.0
