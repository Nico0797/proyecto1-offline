import os
import sys
from pathlib import Path

from werkzeug.serving import run_simple

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.main import app


def _read_bool(name: str, default: bool = False) -> bool:
    value = str(os.getenv(name, "")).strip().lower()
    if not value:
        return default
    return value in {"1", "true", "yes", "on"}


if __name__ == "__main__":
    port = int(os.getenv("PORT", str(app.config.get("PORT", 5000))))
    debug = bool(app.config.get("DEBUG", True))
    run_simple(
        hostname="0.0.0.0",
        port=port,
        application=app,
        use_reloader=_read_bool("FLASK_USE_RELOADER", False),
        use_debugger=False,
        threaded=True,
    )
