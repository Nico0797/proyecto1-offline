import os
import sys

from sqlalchemy import text
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.config import TestingConfig
from backend.database import db
from backend.main import create_app
from backend.models import Business, User
from backend.services.audit_service import record_audit_event


class TestAuditConfig(TestingConfig):
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_ENGINE_OPTIONS = {
        "connect_args": {"check_same_thread": False},
        "poolclass": StaticPool,
    }


def test_record_audit_event_supports_legacy_audit_logs_schema():
    app = create_app(TestAuditConfig)

    with app.app_context():
        db.create_all()

        db.session.execute(text("DROP TABLE audit_logs"))
        db.session.execute(text("""
            CREATE TABLE audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action VARCHAR(50) NOT NULL,
                entity VARCHAR(50) NOT NULL,
                entity_id INTEGER,
                old_value JSON,
                new_value JSON,
                ip_address VARCHAR(45),
                user_agent VARCHAR(255),
                timestamp DATETIME
            )
        """))
        db.session.commit()
        app.extensions.pop("audit_log_columns", None)

        user = User(email="legacy-audit@example.com", name="Legacy Audit User")
        user.set_password("password123")
        user.email_verified = True
        db.session.add(user)
        db.session.flush()

        business = Business(user_id=user.id, name="Legacy Audit Business", currency="COP")
        db.session.add(business)
        db.session.commit()
        user_count_before_audit = User.query.count()

        result = record_audit_event(
            business_id=business.id,
            actor_user=user,
            module="admin",
            entity_type="permission",
            entity_id=None,
            action="access_denied",
            metadata={"permission_required": "products.read", "business_id": business.id},
            before={"business_id": business.id},
            after=None,
            allow_without_plan=True,
            commit=True,
        )

        assert result is True

        row = db.session.execute(
            text("SELECT user_id, action, entity FROM audit_logs")
        ).mappings().one()
        assert row["user_id"] == user.id
        assert row["action"] == "access_denied"
        assert row["entity"] == "permission"

        # The session must remain healthy after writing through the legacy fallback.
        assert User.query.count() == user_count_before_audit
        db.session.remove()
