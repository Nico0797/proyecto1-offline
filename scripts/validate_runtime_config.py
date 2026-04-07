#!/usr/bin/env python
import json
import os
import sys
from urllib.parse import urlsplit, urlunsplit

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.main import create_app
from backend.runtime import validate_runtime_config


DANGEROUS_FLAGS = (
    "ALLOW_SQLITE_FALLBACK",
    "ALLOW_RUNTIME_SCHEMA_MUTATIONS",
    "ALLOW_STARTUP_DATA_BOOTSTRAP",
)


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


def main() -> int:
    app = create_app()
    validate_runtime_config(app)

    payload = {
        "runtime_env": app.config.get("RUNTIME_ENV"),
        "debug": bool(app.config.get("DEBUG")),
        "database_url": _mask_database_uri(str(app.config.get("SQLALCHEMY_DATABASE_URI") or "")),
        "client_url": app.config.get("CLIENT_URL"),
        "cors_origins": app.config.get("CORS_ORIGINS") or [],
        "dangerous_flags": {flag: bool(app.config.get(flag)) for flag in DANGEROUS_FLAGS},
        "app_static_dir": str(os.getenv("APP_STATIC_DIR") or ""),
        "gunicorn": {
            "workers": app.config.get("GUNICORN_WORKERS"),
            "threads": app.config.get("GUNICORN_THREADS"),
            "timeout": app.config.get("GUNICORN_TIMEOUT"),
            "graceful_timeout": app.config.get("GUNICORN_GRACEFUL_TIMEOUT"),
            "keepalive": app.config.get("GUNICORN_KEEPALIVE"),
        },
    }
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
