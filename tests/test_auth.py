# Cuaderno - Auth Tests
# ============================================
"""
Tests de autenticación
"""
import pytest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import create_app
from backend.database import db
from backend.models import User


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


def test_health_check(client):
    """Test health check endpoint"""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "ok"


def test_ping(client):
    """Test ping endpoint"""
    response = client.get("/api/ping")
    assert response.status_code == 200
    data = response.get_json()
    assert data["pong"] == True


def test_register_user(client):
    """Test user registration"""
    response = client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User"
    })
    
    assert response.status_code == 201
    data = response.get_json()
    assert "user" in data
    assert "access_token" in data
    assert data["user"]["email"] == "test@example.com"
    assert data["user"]["name"] == "Test User"


def test_register_duplicate_email(client):
    """Test registration with duplicate email"""
    # First registration
    client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User"
    })
    
    # Second registration (should fail)
    response = client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User 2"
    })
    
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data


def test_register_invalid_data(client):
    """Test registration with invalid data"""
    # Missing fields
    response = client.post("/api/auth/register", json={
        "email": "test@example.com"
    })
    assert response.status_code == 400
    
    # Password too short
    response = client.post("/api/auth/register", json={
        "email": "test2@example.com",
        "password": "123",
        "name": "Test"
    })
    assert response.status_code == 400


def test_login_success(client):
    """Test successful login"""
    # Register first
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
    
    assert response.status_code == 200
    data = response.get_json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_login_invalid_credentials(client):
    """Test login with invalid credentials"""
    # Register first
    client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User"
    })
    
    # Wrong password
    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    
    # Non-existent user
    response = client.post("/api/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "password123"
    })
    assert response.status_code == 401


def test_refresh_token(client):
    """Test token refresh"""
    # Register and login
    client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "password123",
        "name": "Test User"
    })
    
    login_response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "password123"
    })
    refresh_token = login_response.get_json()["refresh_token"]
    
    # Refresh
    response = client.post("/api/auth/refresh", json={
        "refresh_token": refresh_token
    })
    
    assert response.status_code == 200
    data = response.get_json()
    assert "access_token" in data
