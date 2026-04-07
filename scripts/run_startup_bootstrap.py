#!/usr/bin/env python
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.main import create_app
from backend.bootstrap.startup import run_explicit_startup_data_bootstrap


def main() -> int:
    app = create_app()
    ran = run_explicit_startup_data_bootstrap(app)
    if ran:
        print("[BOOTSTRAP] Explicit startup bootstrap completed.")
        return 0
    print("[BOOTSTRAP] Explicit startup bootstrap did not run.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
