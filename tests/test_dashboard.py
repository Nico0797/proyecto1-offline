import pytest
import json
from datetime import date, timedelta
from backend.main import create_app, db
from backend.models import User, Business, Sale, Customer, Product
from backend.auth import create_token
from backend.config import TestingConfig

@pytest.fixture
def app():
    app = create_app(TestingConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def auth_header(app):
    with app.app_context():
        user = User(
            email="test_dashboard@example.com",
            name="Test Dashboard",
            password_hash="hash",
            email_verified=True
        )
        db.session.add(user)
        db.session.commit()
        
        token = create_token(user.id)
        return {"Authorization": f"Bearer {token}"}

def test_dashboard_endpoint_empty(client, auth_header, app):
    """Test dashboard endpoint with no data"""
    with app.app_context():
        user = User.query.filter_by(email="test_dashboard@example.com").first()
        business = Business(user_id=user.id, name="Test Business")
        db.session.add(business)
        db.session.commit()
        business_id = business.id

    response = client.get(
        f"/api/businesses/{business_id}/dashboard",
        headers=auth_header
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    
    # Verify structure
    assert "projections" in data
    assert "inventory_alerts" in data
    assert "fiados_alerts" in data
    assert "recent_sales" in data
    
    # Verify empty values
    assert data["projections"]["daily_average"] == 0
    assert data["inventory_alerts"]["count"] == 0
    assert data["fiados_alerts"]["count"] == 0
    assert len(data["recent_sales"]) == 0

def test_dashboard_endpoint_with_data(client, auth_header, app):
    """Test dashboard with sales and alerts"""
    with app.app_context():
        user = User.query.filter_by(email="test_dashboard@example.com").first()
        business = Business(user_id=user.id, name="Test Business 2")
        db.session.add(business)
        db.session.commit()
        business_id = business.id
        
        # Create customer
        customer = Customer(business_id=business_id, name="Test Customer")
        db.session.add(customer)
        db.session.commit()
        
        # Create product with low stock
        product = Product(
            business_id=business_id,
            name="Low Stock Product",
            price=100,
            stock=2,
            low_stock_threshold=5
        )
        db.session.add(product)
        
        # Create sales
        today = date.today()
        
        # Recent sale
        sale1 = Sale(
            business_id=business_id,
            customer_id=customer.id,
            sale_date=today,
            total=1000,
            items=[{"product_id": product.id, "qty": 1, "total": 1000}],
            paid=True,
            subtotal=1000
        )
        
        # Unpaid sale (fiado)
        sale2 = Sale(
            business_id=business_id,
            customer_id=customer.id,
            sale_date=today - timedelta(days=1),
            total=500,
            items=[],
            paid=False,
            balance=500,
            subtotal=500
        )
        
        db.session.add(sale1)
        db.session.add(sale2)
        db.session.commit()

    response = client.get(
        f"/api/businesses/{business_id}/dashboard",
        headers=auth_header
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    
    # Verify calculations
    assert data["projections"]["last_30_days"] == 1500
    
    # Verify alerts
    assert data["inventory_alerts"]["count"] == 1
    assert data["inventory_alerts"]["products"][0]["name"] == "Low Stock Product"
    
    assert data["fiados_alerts"]["count"] == 1
    assert data["fiados_alerts"]["total"] == 500
    
def test_dashboard_product_type_check(client, auth_header, app):
    """Test that Product.type column exists and is usable"""
    with app.app_context():
        user = User.query.filter_by(email="test_dashboard@example.com").first()
        business = Business(user_id=user.id, name="Test Business 3")
        db.session.add(business)
        db.session.commit()
        business_id = business.id
        
        # Create product with explicit type
        product = Product(
            business_id=business_id,
            name="Service Product",
            price=100,
            type="service",
            stock=0,
            low_stock_threshold=5
        )
        db.session.add(product)
        db.session.commit()
        
        # Query directly to ensure column exists
        p = Product.query.filter_by(id=product.id).first()
        assert p.type == "service"

    response = client.get(
        f"/api/businesses/{business_id}/dashboard",
        headers=auth_header
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    # Service product with 0 stock should be in alerts
    assert data["inventory_alerts"]["count"] == 1
