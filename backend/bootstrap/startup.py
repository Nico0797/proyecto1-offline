import os

from backend.database import db
from backend.models import Role, User, UserRole


def _run_bootstrap_writes(app):
    try:
        try:
            from backend.seeds import seed_rbac
            seed_rbac()
        except ImportError as e:
            app.logger.warning("Could not run RBAC seed: %s", e)

        admin_email = os.getenv("ADMIN_EMAIL", "admin@cuaderno.app")
        admin_password = (os.getenv("ADMIN_PASSWORD") or "").strip()
        admin_name = os.getenv("ADMIN_NAME", "Administrador")

        if not admin_password:
            raise RuntimeError("ADMIN_PASSWORD is required when ALLOW_STARTUP_DATA_BOOTSTRAP=true")

        admin_user = User.query.filter_by(email=admin_email.lower()).first()
        if not admin_user:
            admin_user = User(
                email=admin_email.lower(),
                name=admin_name,
                plan="pro",
                is_admin=True,
                email_verified=True,
            )
            admin_user.set_password(admin_password)
            db.session.add(admin_user)
            db.session.flush()
            app.logger.info("Startup admin user created: %s", admin_email)
        else:
            admin_user.is_admin = True
            admin_user.email_verified = True
            admin_user.plan = "pro"
            admin_user.set_password(admin_password)
            app.logger.info("Startup admin user updated: %s", admin_email)

        superadmin_role = Role.query.filter_by(name="SUPERADMIN").first()
        if superadmin_role and admin_user.id:
            existing_role = UserRole.query.filter_by(user_id=admin_user.id, role_id=superadmin_role.id).first()
            if not existing_role:
                user_role = UserRole(user_id=admin_user.id, role_id=superadmin_role.id)
                db.session.add(user_role)
                app.logger.info("Assigned SUPERADMIN role to startup admin: %s", admin_email)

        db.session.commit()
        return True
    except Exception as e:
        db.session.rollback()
        app.logger.warning("Skipping startup seed due to error: %s", e)
        return False


def log_startup_bootstrap_status(app):
    if app.config.get("ALLOW_STARTUP_DATA_BOOTSTRAP", False):
        app.logger.warning(
            "ALLOW_STARTUP_DATA_BOOTSTRAP is enabled, but bootstrap writes do not run during import/startup. "
            "Use scripts/run_startup_bootstrap.py for explicit bootstrap execution."
        )
    else:
        app.logger.info("Startup data bootstrap disabled; no seed/admin writes will run during app startup.")


def run_explicit_startup_data_bootstrap(app):
    if not app.config.get("ALLOW_STARTUP_DATA_BOOTSTRAP", False):
        app.logger.warning(
            "Explicit startup bootstrap aborted because ALLOW_STARTUP_DATA_BOOTSTRAP is false. "
            "Enable the flag intentionally before running bootstrap writes."
        )
        return False

    with app.app_context():
        return _run_bootstrap_writes(app)


def run_startup_data_bootstrap(app):
    log_startup_bootstrap_status(app)
    return False
