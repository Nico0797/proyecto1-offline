# Cuaderno - Sales Tests
# ============================================
"""
Tests de ventas y reportes
"""
import pytest
import sys
import os
from datetime import date

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import create_app
from backend.database import db
from backend.models import User, Business, Product, Customer


@pytest.fixture
def app():
    """Create application for testing"""
    app = create_app()
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture
def auth_token(client):
    """Create user and get auth token"""
    # Register
    client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User"
    })
    
    # Login
    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "password123"
    })
    
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
