
import pytest
from backend.models import Role
from backend.main import create_app, db
from backend.config import TestingConfig

@pytest.fixture
def app():
    app = create_app(TestingConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

def test_roles_are_unique(app):
    """Test that roles in the database are unique by name"""
    with app.app_context():
        # Roles are auto-seeded by create_app -> init_db
        roles = Role.query.all()
        names = [r.name for r in roles]
        
        # Verify uniqueness
        assert len(names) == len(set(names))
        
        # Ensure no english duplicates
        assert "SELLER" not in names
        assert "FINANCE" not in names
        
        # Ensure standard roles exist
        assert "VENTAS" in names
        assert "CONTABILIDAD" in names

def test_role_standardization(app):
    """Test that we have the expected standard roles"""
    with app.app_context():
        # Verify only Spanish roles exist
        ventas = Role.query.filter_by(name="VENTAS").first()
        seller = Role.query.filter_by(name="SELLER").first()
        
        assert ventas is not None
        assert seller is None
