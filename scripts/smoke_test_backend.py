import argparse
import json
import os
import sys
from typing import Any
from urllib.parse import urljoin

import requests

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Smoke test operativo para backend")
    parser.add_argument("--mode", choices=["base-url", "test-client"], default=os.getenv("SMOKE_MODE", "base-url"))
    parser.add_argument("--base-url", default=os.getenv("SMOKE_BASE_URL", "http://127.0.0.1:5000"))
    parser.add_argument("--email", default=os.getenv("SMOKE_EMAIL") or os.getenv("PROFILE_EMAIL") or os.getenv("ADMIN_EMAIL") or "admin@cuaderno.app")
    parser.add_argument("--password", default=os.getenv("SMOKE_PASSWORD") or os.getenv("PROFILE_PASSWORD") or os.getenv("ADMIN_PASSWORD") or "")
    parser.add_argument("--business-id", type=int, default=int(os.getenv("SMOKE_BUSINESS_ID", "0")))
    parser.add_argument("--protected-endpoint", choices=["dashboard", "dashboard-summary"], default=os.getenv("SMOKE_PROTECTED_ENDPOINT", "dashboard"))
    parser.add_argument("--skip-auth", action="store_true")
    parser.add_argument("--skip-readiness", action="store_true")
    parser.add_argument("--timeout", type=float, default=float(os.getenv("SMOKE_TIMEOUT", "15")))
    parser.add_argument("--json", action="store_true")
    return parser.parse_args()


def _headers(token: str | None) -> dict[str, str]:
    if not token:
        return {}
    return {"Authorization": f"Bearer {token}"}


def _json_or_text(response: Any) -> Any:
    try:
        return response.json()
    except Exception:
        return {"text": getattr(response, "text", "")}


def _get_active_business_id(login_payload: dict[str, Any]) -> int:
    active_context = login_payload.get("active_context") or {}
    return int(active_context.get("business_id") or 0)


def _get_accessible_contexts(login_payload: dict[str, Any]) -> list[dict[str, Any]]:
    contexts = login_payload.get("accessible_contexts") or []
    return [ctx for ctx in contexts if isinstance(ctx, dict)]


def _resolve_business_context(requested_business_id: int, login_payload: dict[str, Any]) -> tuple[int, bool, list[dict[str, Any]]]:
    accessible_contexts = _get_accessible_contexts(login_payload)
    active_business_id = _get_active_business_id(login_payload)

    if requested_business_id and requested_business_id > 0:
        needs_selection = active_business_id != requested_business_id
        return requested_business_id, needs_selection, accessible_contexts

    if active_business_id > 0:
        return active_business_id, False, accessible_contexts

    if accessible_contexts:
        candidate = int((accessible_contexts[0] or {}).get("business_id") or 0)
        if candidate > 0:
            return candidate, True, accessible_contexts

    raise RuntimeError(
        "Login exitoso pero el usuario no tiene active_context ni accessible_contexts utilizables. "
        "Usa un usuario con negocio accesible o proporciona credenciales de un owner/member real."
    )


def _protected_path(business_id: int, endpoint_key: str) -> str:
    return f"api/businesses/{business_id}/{endpoint_key}"


def _record_step(results: list[dict[str, Any]], name: str, status_code: int, ok: bool, payload: Any):
    results.append(
        {
            "step": name,
            "ok": ok,
            "status_code": status_code,
            "payload": payload,
        }
    )


def _run_http(args: argparse.Namespace) -> dict[str, Any]:
    results: list[dict[str, Any]] = []
    session = requests.Session()
    base_url = args.base_url.rstrip("/") + "/"

    health_response = session.get(urljoin(base_url, "api/health"), timeout=args.timeout)
    _record_step(results, "health", health_response.status_code, health_response.status_code == 200, _json_or_text(health_response))

    if not args.skip_readiness:
        readiness_response = session.get(urljoin(base_url, "api/ready"), timeout=args.timeout)
        _record_step(results, "readiness", readiness_response.status_code, readiness_response.status_code == 200, _json_or_text(readiness_response))

    business_profile_response = session.get(urljoin(base_url, "api/business_profile"), timeout=args.timeout)
    _record_step(results, "business_profile", business_profile_response.status_code, business_profile_response.status_code == 200, _json_or_text(business_profile_response))

    token = None
    resolved_business_id = args.business_id

    if not args.skip_auth:
        login_response = session.post(
            urljoin(base_url, "api/auth/login"),
            json={"email": args.email, "password": args.password},
            timeout=args.timeout,
        )
        login_payload = _json_or_text(login_response)
        login_ok = login_response.status_code == 200 and isinstance(login_payload, dict) and bool(login_payload.get("access_token"))
        _record_step(results, "login", login_response.status_code, login_ok, login_payload)
        if not login_ok:
            raise RuntimeError(f"Login falló: status={login_response.status_code} payload={login_payload}")

        token = login_payload.get("access_token")
        resolved_business_id, needs_selection, accessible_contexts = _resolve_business_context(args.business_id, login_payload)

        if resolved_business_id and needs_selection:
            selection_response = session.post(
                urljoin(base_url, "api/auth/select-context"),
                json={"business_id": resolved_business_id},
                headers=_headers(token),
                timeout=args.timeout,
            )
            selection_payload = _json_or_text(selection_response)
            selection_ok = selection_response.status_code == 200
            _record_step(results, "select_context", selection_response.status_code, selection_ok, selection_payload)
            if not selection_ok:
                raise RuntimeError(
                    "select-context falló: "
                    f"status={selection_response.status_code} payload={selection_payload} "
                    f"requested_business_id={resolved_business_id} accessible_contexts={accessible_contexts}"
                )
            token = selection_payload.get("access_token") or token

        dashboard_response = session.get(
            urljoin(base_url, _protected_path(resolved_business_id, args.protected_endpoint)),
            headers=_headers(token),
            timeout=args.timeout,
        )
        dashboard_payload = _json_or_text(dashboard_response)
        dashboard_ok = dashboard_response.status_code == 200
        _record_step(results, args.protected_endpoint, dashboard_response.status_code, dashboard_ok, dashboard_payload)
        if not dashboard_ok:
            raise RuntimeError(
                f"{args.protected_endpoint} falló: status={dashboard_response.status_code} "
                f"payload={dashboard_payload} business_id={resolved_business_id}"
            )

    return {
        "mode": "base-url",
        "base_url": args.base_url,
        "business_id": resolved_business_id,
        "results": results,
        "ok": all(item["ok"] for item in results),
    }


def _run_test_client(args: argparse.Namespace) -> dict[str, Any]:
    from backend.main import app

    results: list[dict[str, Any]] = []
    client = app.test_client()

    health_response = client.get("/api/health")
    _record_step(results, "health", health_response.status_code, health_response.status_code == 200, health_response.get_json(silent=True))

    if not args.skip_readiness:
        readiness_response = client.get("/api/ready")
        _record_step(results, "readiness", readiness_response.status_code, readiness_response.status_code == 200, readiness_response.get_json(silent=True))

    business_profile_response = client.get("/api/business_profile")
    _record_step(results, "business_profile", business_profile_response.status_code, business_profile_response.status_code == 200, business_profile_response.get_json(silent=True))

    token = None
    resolved_business_id = args.business_id

    if not args.skip_auth:
        login_response = client.post(
            "/api/auth/login",
            json={"email": args.email, "password": args.password},
        )
        login_payload = login_response.get_json(silent=True) or {}
        login_ok = login_response.status_code == 200 and bool(login_payload.get("access_token"))
        _record_step(results, "login", login_response.status_code, login_ok, login_payload)
        if not login_ok:
            raise RuntimeError(f"Login falló: status={login_response.status_code} payload={login_payload}")

        token = login_payload.get("access_token")
        resolved_business_id, needs_selection, accessible_contexts = _resolve_business_context(args.business_id, login_payload)

        if resolved_business_id and needs_selection:
            selection_response = client.post(
                "/api/auth/select-context",
                json={"business_id": resolved_business_id},
                headers=_headers(token),
            )
            selection_payload = selection_response.get_json(silent=True) or {}
            selection_ok = selection_response.status_code == 200
            _record_step(results, "select_context", selection_response.status_code, selection_ok, selection_payload)
            if not selection_ok:
                raise RuntimeError(
                    "select-context falló: "
                    f"status={selection_response.status_code} payload={selection_payload} "
                    f"requested_business_id={resolved_business_id} accessible_contexts={accessible_contexts}"
                )
            token = selection_payload.get("access_token") or token

        dashboard_response = client.get(
            "/" + _protected_path(resolved_business_id, args.protected_endpoint),
            headers=_headers(token),
        )
        dashboard_payload = dashboard_response.get_json(silent=True) or {}
        dashboard_ok = dashboard_response.status_code == 200
        _record_step(results, args.protected_endpoint, dashboard_response.status_code, dashboard_ok, dashboard_payload)
        if not dashboard_ok:
            raise RuntimeError(
                f"{args.protected_endpoint} falló: status={dashboard_response.status_code} "
                f"payload={dashboard_payload} business_id={resolved_business_id}"
            )

    return {
        "mode": "test-client",
        "business_id": resolved_business_id,
        "results": results,
        "ok": all(item["ok"] for item in results),
    }


def main() -> int:
    args = _parse_args()
    if not args.skip_auth and not args.password:
        raise RuntimeError("Debes proporcionar --password o SMOKE_PASSWORD/ADMIN_PASSWORD para ejecutar el smoke test autenticado.")

    report = _run_http(args) if args.mode == "base-url" else _run_test_client(args)

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print("=== Backend Smoke Test ===")
        print(f"mode={report['mode']}")
        print(f"ok={report['ok']}")
        print(f"business_id={report.get('business_id')}")
        if report.get("base_url"):
            print(f"base_url={report['base_url']}")
        for step in report["results"]:
            print(f"- {step['step']}: status={step['status_code']} ok={step['ok']}")

    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
