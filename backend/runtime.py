import logging
import os
import sys
import uuid
from datetime import datetime
from urllib.parse import urlsplit, urlunsplit

from flask import g, request
from sqlalchemy import text

from backend.config import is_production_like_env


_WEAK_SECRET_VALUES = {
    "",
    "change-me",
    "changeme",
    "dev-secret-key-change-me",
    "jwt-secret-key-change-me",
    "your-super-secret-key-change-in-production",
    "your-jwt-secret-key-change-in-production",
    "secret",
    "default",
    "password",
    "admin123",
}

_LOCAL_CLIENT_URLS = {
    "http://localhost",
    "http://localhost:5000",
    "http://localhost:5173",
    "http://127.0.0.1",
    "http://127.0.0.1:5000",
    "http://127.0.0.1:5173",
}

_LOCAL_CORS_ORIGINS = {
    "http://localhost",
    "http://localhost:5000",
    "http://localhost:5173",
    "http://127.0.0.1",
    "http://127.0.0.1:5000",
    "http://127.0.0.1:5173",
}


def _mask_database_uri(database_uri: str) -> str:
    if not database_uri:
        return ""
    try:
        parsed = urlsplit(database_uri)
        if parsed.password is None:
            return database_uri
        netloc = parsed.netloc.replace(f":{parsed.password}", ":***", 1)
        return urlunsplit((parsed.scheme, netloc, parsed.path, parsed.query, parsed.fragment))
    except Exception:
        return database_uri


def _is_weak_secret(value: str) -> bool:
    normalized = str(value or "").strip()
    return normalized.lower() in _WEAK_SECRET_VALUES or len(normalized) < 16


def configure_logging(app):
    if app.extensions.get("runtime_logging_configured"):
        return

    level_name = str(app.config.get("LOG_LEVEL", "INFO") or "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)
    formatter = logging.Formatter("%(asctime)s %(levelname)s [%(name)s] %(message)s")

    gunicorn_logger = logging.getLogger("gunicorn.error")
    if gunicorn_logger.handlers:
        app.logger.handlers = gunicorn_logger.handlers
        app.logger.setLevel(gunicorn_logger.level or level)
    else:
        if not app.logger.handlers:
            handler = logging.StreamHandler(sys.stdout)
            handler.setFormatter(formatter)
            app.logger.addHandler(handler)
        else:
            for handler in app.logger.handlers:
                handler.setFormatter(formatter)
        app.logger.setLevel(level)

    app.logger.propagate = False
    logging.getLogger().setLevel(level)
    logging.getLogger("werkzeug").setLevel(level)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    app.extensions["runtime_logging_configured"] = True


def register_request_context(app):
    if app.extensions.get("runtime_request_context_registered"):
        return

    @app.before_request
    def _assign_request_id():
        g.request_id = request.headers.get("X-Request-Id") or uuid.uuid4().hex[:12]

    @app.after_request
    def _append_request_id(response):
        request_id = getattr(g, "request_id", None)
        if request_id:
            response.headers["X-Request-Id"] = request_id
        return response

    app.extensions["runtime_request_context_registered"] = True


def validate_runtime_config(app):
    env = str(app.config.get("RUNTIME_ENV") or os.getenv("FLASK_ENV") or "development").strip().lower()
    production_like = is_production_like_env(env)
    errors = []
    warnings = []

    secret_key = str(app.config.get("SECRET_KEY") or "").strip()
    jwt_secret_key = str(app.config.get("JWT_SECRET_KEY") or "").strip()
    client_url = str(app.config.get("CLIENT_URL") or "").strip()
    cors_origins = [item for item in (app.config.get("CORS_ORIGINS") or []) if str(item).strip()]
    database_uri = str(app.config.get("SQLALCHEMY_DATABASE_URI") or "").strip()
    static_dir = str(os.getenv("APP_STATIC_DIR") or "").strip()

    if not secret_key:
        errors.append("SECRET_KEY is required.")
    elif production_like and _is_weak_secret(secret_key):
        errors.append("SECRET_KEY must be explicitly set to a strong non-default value in staging/production.")
    elif _is_weak_secret(secret_key):
        warnings.append("SECRET_KEY is using a weak or default local value.")

    if not jwt_secret_key:
        errors.append("JWT_SECRET_KEY is required.")
    elif production_like and _is_weak_secret(jwt_secret_key):
        errors.append("JWT_SECRET_KEY must be explicitly set to a strong non-default value in staging/production.")
    elif _is_weak_secret(jwt_secret_key):
        warnings.append("JWT_SECRET_KEY is using a weak or default local value.")

    if secret_key and jwt_secret_key and secret_key == jwt_secret_key:
        warnings.append("SECRET_KEY and JWT_SECRET_KEY should not reuse the same value.")

    if not database_uri:
        errors.append("SQLALCHEMY_DATABASE_URI resolved to an empty value.")
    elif production_like and database_uri.startswith("sqlite:"):
        errors.append("SQLite fallback is not allowed in staging/production.")

    if production_like:
        if app.config.get("DEBUG"):
            errors.append("DEBUG must be false in staging/production.")
        if not client_url or client_url in _LOCAL_CLIENT_URLS:
            errors.append("CLIENT_URL must be explicitly set to a non-local value in staging/production.")
        if not cors_origins:
            errors.append("CORS_ORIGINS must be explicitly configured in staging/production.")
        elif "*" in cors_origins:
            errors.append("CORS_ORIGINS cannot contain '*' in staging/production when credentials are enabled.")
        elif set(cors_origins).issubset(_LOCAL_CORS_ORIGINS):
            errors.append("CORS_ORIGINS still points only to local origins; set the real allowed origins for staging/production.")

    dangerous_flags = (
        "ALLOW_SQLITE_FALLBACK",
        "ALLOW_RUNTIME_SCHEMA_MUTATIONS",
        "ALLOW_STARTUP_DATA_BOOTSTRAP",
    )
    for flag_name in dangerous_flags:
        if app.config.get(flag_name):
            message = f"{flag_name} is enabled."
            if production_like:
                errors.append(f"{message} Disable it before starting staging/production.")
            else:
                warnings.append(message)

    if static_dir:
        if not os.path.isdir(static_dir):
            message = f"APP_STATIC_DIR points to a missing directory: {static_dir}"
            if production_like:
                errors.append(message)
            else:
                warnings.append(message)

    if app.config.get("ALLOW_STARTUP_DATA_BOOTSTRAP"):
        admin_password = str(os.getenv("ADMIN_PASSWORD") or "").strip()
        if not admin_password or admin_password.lower() == "admin123":
            warnings.append("ALLOW_STARTUP_DATA_BOOTSTRAP is enabled with a weak ADMIN_PASSWORD value.")

    for warning in warnings:
        app.logger.warning(warning)

    if errors:
        raise RuntimeError("Invalid runtime configuration:\n- " + "\n- ".join(errors))


def log_startup_summary(app, static_folder: str | None = None):
    app.logger.info(
        "Startup checks passed env=%s debug=%s database=%s port=%s workers=%s threads=%s",
        app.config.get("RUNTIME_ENV"),
        app.config.get("DEBUG"),
        _mask_database_uri(str(app.config.get("SQLALCHEMY_DATABASE_URI") or "")),
        app.config.get("PORT"),
        app.config.get("GUNICORN_WORKERS"),
        app.config.get("GUNICORN_THREADS"),
    )
    app.logger.info(
        "Runtime flags sqlite_fallback=%s startup_bootstrap=%s runtime_schema_mutations=%s",
        app.config.get("ALLOW_SQLITE_FALLBACK"),
        app.config.get("ALLOW_STARTUP_DATA_BOOTSTRAP"),
        app.config.get("ALLOW_RUNTIME_SCHEMA_MUTATIONS"),
    )
    if static_folder:
        app.logger.info("Static assets path=%s exists=%s", static_folder, os.path.isdir(static_folder))


def build_liveness_payload(app):
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "service": "backend.main",
        "port": int(app.config.get("PORT") or os.getenv("PORT") or 5000),
        "env": str(app.config.get("RUNTIME_ENV") or os.getenv("FLASK_ENV") or "development"),
    }


def build_readiness_result(app, db):
    checks = {}
    errors = []

    try:
        db.session.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:
        db.session.rollback()
        checks["database"] = "error"
        errors.append(f"database: {exc}")

    payload = {
        "status": "ready" if not errors else "not_ready",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "backend.main",
        "version": "1.0.0",
        "env": str(app.config.get("RUNTIME_ENV") or os.getenv("FLASK_ENV") or "development"),
        "checks": checks,
    }
    if errors and app.config.get("EXPOSE_ERROR_DETAILS"):
        payload["details"] = errors
    return payload, (200 if not errors else 503)
