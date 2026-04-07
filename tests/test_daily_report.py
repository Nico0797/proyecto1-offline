import pytest
import json
from datetime import date
from backend.main import create_app, db
from backend.models import User, Business, Expense
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
            email="test@example.com",
            name="Test User",
            password_hash="hash",
            email_verified=True
        )
        db.session.add(user)
        db.session.commit()
        
        token = create_token(user.id)
        return {"Authorization": f"Bearer {token}"}

def test_daily_report_empty(client, auth_header, app):
    """Test daily report with empty database"""
    with app.app_context():
        user = User.query.filter_by(email="test@example.com").first()
        business = Business(user_id=user.id, name="Test Business")
        db.session.add(business)
        db.session.commit()
        business_id = business.id

    response = client.get(
        f"/api/businesses/{business_id}/reports/daily",
        headers=auth_header
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    
    # Check structure
    assert "expenses" in data
    assert "count" in data["expenses"]
    assert "total" in data["expenses"]
    
    # Check values
    assert data["expenses"]["count"] == 0
    assert data["expenses"]["total"] == 0

def test_daily_report_with_data(client, auth_header, app):
    """Test daily report with expenses"""
    with app.app_context():
        user = User.query.filter_by(email="test@example.com").first()
        business = Business(user_id=user.id, name="Test Business 2")
        db.session.add(business)
        db.session.commit()
        business_id = business.id
        
        # Add expense
        expense = Expense(
            business_id=business_id,
            expense_date=date.today(),
            category="Test",
            amount=100.0,
            description="Test expense"
        )
        db.session.add(expense)
        db.session.commit()

    response = client.get(
        f"/api/businesses/{business_id}/reports/daily",
        headers=auth_header
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    
    assert data["expenses"]["count"] == 1
    assert data["expenses"]["total"] == 100.0
