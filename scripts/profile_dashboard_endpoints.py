import argparse
import json
import logging
import os
import statistics
import sys
import time
from contextlib import nullcontext
from datetime import date
from typing import Any
from urllib.parse import urljoin

import requests
from sqlalchemy import event

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

DEFAULT_ENDPOINTS = ["dashboard", "reports-summary", "reports-daily"]


def _default_start_date() -> str:
    today = date.today()
    return today.replace(day=1).isoformat()


def _default_end_date() -> str:
    return date.today().isoformat()


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["test-client", "base-url"], default=os.getenv("PROFILE_MODE", "test-client"))
    parser.add_argument("--business-id", type=int, default=int(os.getenv("PROFILE_BUSINESS_ID", "0")))
    parser.add_argument("--email", default=os.getenv("PROFILE_EMAIL") or os.getenv("ADMIN_EMAIL") or "admin@cuaderno.app")
    parser.add_argument("--password", default=os.getenv("PROFILE_PASSWORD") or os.getenv("ADMIN_PASSWORD") or "admin123")
    parser.add_argument("--token", default=os.getenv("PROFILE_TOKEN"))
    parser.add_argument("--base-url", default=os.getenv("PROFILE_BASE_URL", "http://127.0.0.1:5000"))
    parser.add_argument("--start-date", default=os.getenv("PROFILE_START_DATE", _default_start_date()))
    parser.add_argument("--end-date", default=os.getenv("PROFILE_END_DATE", _default_end_date()))
    parser.add_argument("--repetitions", type=int, default=int(os.getenv("PROFILE_REPETITIONS", "3")))
    parser.add_argument("--warmup", type=int, default=int(os.getenv("PROFILE_WARMUP", "1")))
    parser.add_argument("--timeout", type=float, default=float(os.getenv("PROFILE_TIMEOUT", "30")))
    parser.add_argument("--endpoints", default=os.getenv("PROFILE_ENDPOINTS", ",".join(DEFAULT_ENDPOINTS)))
    parser.add_argument("--skip-select-context", action="store_true")
    parser.add_argument("--disable-query-count", action="store_true")
    parser.add_argument("--ensure-benchmark-fixture", action="store_true")
    parser.add_argument("--benchmark-allow-create", action="store_true")
    parser.add_argument("--benchmark-allow-remote-db", action="store_true")
    parser.add_argument("--benchmark-email", default=os.getenv("BENCHMARK_EMAIL", "benchmark@cuaderno.local"))
    parser.add_argument("--benchmark-password", default=os.getenv("BENCHMARK_PASSWORD", "benchmark123"))
    parser.add_argument("--benchmark-user-name", default=os.getenv("BENCHMARK_USER_NAME", "Benchmark Owner"))
    parser.add_argument("--benchmark-business-name", default=os.getenv("BENCHMARK_BUSINESS_NAME", "Benchmark Dashboard Business"))
    parser.add_argument("--format", choices=["text", "json"], default=os.getenv("PROFILE_FORMAT", "text"))
    parser.add_argument("--output-json", default=os.getenv("PROFILE_OUTPUT_JSON"))
    parser.add_argument("--fail-on-non-200", action="store_true")
    return parser.parse_args()


def _normalize_endpoint_keys(raw_value: str) -> list[str]:
    keys = [item.strip() for item in str(raw_value or "").split(",") if item.strip()]
    if not keys:
        return list(DEFAULT_ENDPOINTS)
    valid_keys = {"dashboard", "reports-summary", "reports-daily", "dashboard-summary", "financial-dashboard"}
    invalid = [item for item in keys if item not in valid_keys]
    if invalid:
        raise ValueError(f"Endpoints inválidos: {', '.join(invalid)}")
    return keys


def _build_endpoint_specs(business_id: int, start_date: str, end_date: str, keys: list[str]) -> list[dict[str, str]]:
    mapping = {
        "dashboard": {
            "label": "dashboard",
            "path": f"/api/businesses/{business_id}/dashboard",
        },
        "reports-summary": {
            "label": "reports-summary",
            "path": f"/api/businesses/{business_id}/reports/summary?start_date={start_date}&end_date={end_date}",
        },
        "reports-daily": {
            "label": "reports-daily",
            "path": f"/api/businesses/{business_id}/reports/daily?start_date={start_date}&end_date={end_date}",
        },
        "dashboard-summary": {
            "label": "dashboard-summary",
            "path": f"/api/businesses/{business_id}/dashboard-summary",
        },
        "financial-dashboard": {
            "label": "financial-dashboard",
            "path": f"/api/businesses/{business_id}/reports/financial-dashboard?start_date={start_date}&end_date={end_date}",
        },
    }
    return [mapping[key] for key in keys]


class QueryCounter:
    def __init__(self, engine: Any):
        self.engine = engine
        self.count = 0

    def _before_cursor_execute(self, conn: Any, cursor: Any, statement: str, parameters: Any, context: Any, executemany: bool) -> None:
        self.count += 1

    def __enter__(self) -> "QueryCounter":
        event.listen(self.engine, "before_cursor_execute", self._before_cursor_execute)
        return self

    def __exit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
        event.remove(self.engine, "before_cursor_execute", self._before_cursor_execute)

    def reset(self) -> None:
        self.count = 0


def _write_output(path: str, payload: dict[str, Any]) -> None:
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=False)
        handle.write("\n")


def _summarize_runs(label: str, path: str, runs: list[dict[str, Any]], query_count_enabled: bool) -> dict[str, Any]:
    elapsed_values = [float(item["elapsed_ms"]) for item in runs]
    statuses = [int(item["status_code"]) for item in runs]
    summary: dict[str, Any] = {
        "label": label,
        "path": path,
        "status_codes": statuses,
        "runs": runs,
        "summary": {
            "avg_elapsed_ms": round(sum(elapsed_values) / len(elapsed_values), 2) if elapsed_values else 0.0,
            "min_elapsed_ms": round(min(elapsed_values), 2) if elapsed_values else 0.0,
            "max_elapsed_ms": round(max(elapsed_values), 2) if elapsed_values else 0.0,
            "median_elapsed_ms": round(statistics.median(elapsed_values), 2) if elapsed_values else 0.0,
            "successful_runs": sum(1 for code in statuses if 200 <= code < 300),
            "total_runs": len(runs),
        },
    }
    if query_count_enabled:
        query_values = [int(item["query_count"]) for item in runs if item.get("query_count") is not None]
        summary["summary"]["avg_query_count"] = round(sum(query_values) / len(query_values), 2) if query_values else None
        summary["summary"]["min_query_count"] = min(query_values) if query_values else None
        summary["summary"]["max_query_count"] = max(query_values) if query_values else None
    else:
        summary["summary"]["avg_query_count"] = None
        summary["summary"]["min_query_count"] = None
        summary["summary"]["max_query_count"] = None
    return summary


def _print_text_report(payload: dict[str, Any]) -> None:
    context = payload["context"]
    print("=== Dashboard Endpoint Profile ===")
    print(f"mode={context['mode']}")
    print(f"business_id={context['business_id']}")
    print(f"authenticated={context['authenticated']}")
    print(f"auth_mode={context['auth_mode']}")
    print(f"active_context_business_id={context.get('active_context_business_id')}")
    print(f"repetitions={context['repetitions']}")
    print(f"warmup={context['warmup']}")
    print(f"query_count_enabled={context['query_count_enabled']}")
    if context.get("base_url"):
        print(f"base_url={context['base_url']}")
    if context.get("start_date"):
        print(f"start_date={context['start_date']}")
    if context.get("end_date"):
        print(f"end_date={context['end_date']}")
    print("---")
    for result in payload["results"]:
        summary = result["summary"]
        print(f"[{result['label']}] {result['path']}")
        print(
            "  "
            f"avg_ms={summary['avg_elapsed_ms']} "
            f"min_ms={summary['min_elapsed_ms']} "
            f"max_ms={summary['max_elapsed_ms']} "
            f"median_ms={summary['median_elapsed_ms']} "
            f"avg_queries={summary.get('avg_query_count')} "
            f"statuses={','.join(str(code) for code in result['status_codes'])}"
        )
        for run in result["runs"]:
            print(
                "    "
                f"run={run['iteration']} "
                f"status={run['status_code']} "
                f"elapsed_ms={run['elapsed_ms']} "
                f"query_count={run.get('query_count')}"
            )
    print("---")
    print(json.dumps(payload, indent=2, ensure_ascii=False))


def _build_headers(token: str | None) -> dict[str, str]:
    if not token:
        return {}
    return {"Authorization": f"Bearer {token}"}


def _maybe_ensure_benchmark_fixture(args: argparse.Namespace) -> dict[str, Any] | None:
    if not args.ensure_benchmark_fixture:
        return None

    from scripts.prepare_dashboard_benchmark_fixture import ensure_dashboard_benchmark_fixture

    report = ensure_dashboard_benchmark_fixture(
        allow_create=args.benchmark_allow_create,
        allow_remote_db=args.benchmark_allow_remote_db,
        email=args.benchmark_email,
        password=args.benchmark_password,
        user_name=args.benchmark_user_name,
        business_name=args.benchmark_business_name,
    )
    args.email = report["credentials"]["email"]
    args.password = report["credentials"]["password"]
    args.business_id = int(report["business"]["id"])
    return report


def _resolve_business_id(requested_business_id: int, active_context_business_id: Any, accessible_contexts: list[dict[str, Any]] | None = None) -> int:
    if requested_business_id and requested_business_id > 0:
        return requested_business_id
    resolved = int(active_context_business_id or 0)
    if resolved <= 0 and accessible_contexts:
        resolved = int((accessible_contexts[0] or {}).get("business_id") or 0)
    if resolved <= 0:
        raise RuntimeError("No fue posible resolver business_id desde el contexto activo. Usa --business-id explícito.")
    return resolved


def _should_select_context(requested_business_id: int, active_context_business_id: Any, skip_select_context: bool) -> bool:
    if skip_select_context:
        return False
    if not requested_business_id or requested_business_id <= 0:
        return False
    return int(active_context_business_id or 0) != int(requested_business_id)


def _resolve_local_business_id(requested_business_id: int, auth: dict[str, Any], business_model: Any, team_member_model: Any) -> int:
    try:
        return _resolve_business_id(
            requested_business_id,
            auth.get("active_context_business_id"),
            auth.get("accessible_contexts") or [],
        )
    except RuntimeError:
        user_id = auth.get("user_id")
        if not user_id:
            raise

        owned_business = business_model.query.filter_by(user_id=user_id).order_by(business_model.id.asc()).first()
        if owned_business:
            return int(owned_business.id)

        membership = team_member_model.query.filter_by(user_id=user_id, status="active").order_by(team_member_model.business_id.asc()).first()
        if membership:
            return int(membership.business_id)
        accessible_ids = [item.get("business_id") for item in (auth.get("accessible_contexts") or []) if item.get("business_id")]
        raise RuntimeError(
            "No fue posible resolver business_id desde el login/contexto. "
            f"user_id={user_id}, accessible_context_business_ids={accessible_ids}. Usa --business-id, --email y --password válidos."
        )


def _authenticate_test_client(client: Any, args: argparse.Namespace) -> dict[str, Any]:
    if args.token:
        return {
            "headers": _build_headers(args.token),
            "auth_mode": "token",
            "authenticated": True,
            "active_context_business_id": None,
            "used_select_context": False,
        }

    response = client.post(
        "/api/auth/login",
        json={
            "email": args.email,
            "password": args.password,
        },
    )
    payload = response.get_json(silent=True) or {}
    access_token = payload.get("access_token")
    active_context = payload.get("active_context") or {}
    accessible_contexts = payload.get("accessible_contexts") or []
    active_context_business_id = active_context.get("business_id")
    used_select_context = False

    if not access_token:
        raise RuntimeError(f"Login falló con status {response.status_code}: {payload}")

    if _should_select_context(args.business_id, active_context_business_id, args.skip_select_context):
        selection = client.post(
            "/api/auth/select-context",
            headers=_build_headers(access_token),
            json={"business_id": args.business_id},
        )
        selection_payload = selection.get_json(silent=True) or {}
        if selection.status_code >= 400:
            raise RuntimeError(f"Select-context falló con status {selection.status_code}: {selection_payload}")
        access_token = selection_payload.get("access_token") or access_token
        active_context = selection_payload.get("active_context") or active_context
        active_context_business_id = active_context.get("business_id")
        used_select_context = True

    return {
        "headers": _build_headers(access_token),
        "auth_mode": "login",
        "authenticated": True,
        "user_id": (payload.get("user") or {}).get("id"),
        "active_context_business_id": active_context_business_id,
        "accessible_contexts": accessible_contexts,
        "used_select_context": used_select_context,
    }


def _authenticate_http(session: requests.Session, args: argparse.Namespace) -> dict[str, Any]:
    if args.token:
        return {
            "headers": _build_headers(args.token),
            "auth_mode": "token",
            "authenticated": True,
            "active_context_business_id": None,
            "used_select_context": False,
        }

    login_response = session.post(
        urljoin(args.base_url.rstrip("/") + "/", "api/auth/login"),
        json={
            "email": args.email,
            "password": args.password,
        },
        timeout=args.timeout,
    )
    payload = login_response.json() if login_response.content else {}
    access_token = payload.get("access_token")
    active_context = payload.get("active_context") or {}
    accessible_contexts = payload.get("accessible_contexts") or []
    active_context_business_id = active_context.get("business_id")
    used_select_context = False

    if not access_token:
        raise RuntimeError(f"Login falló con status {login_response.status_code}: {payload}")

    if _should_select_context(args.business_id, active_context_business_id, args.skip_select_context):
        selection = session.post(
            urljoin(args.base_url.rstrip("/") + "/", "api/auth/select-context"),
            json={"business_id": args.business_id},
            headers=_build_headers(access_token),
            timeout=args.timeout,
        )
        selection_payload = selection.json() if selection.content else {}
        if selection.status_code >= 400:
            raise RuntimeError(f"Select-context falló con status {selection.status_code}: {selection_payload}")
        access_token = selection_payload.get("access_token") or access_token
        active_context = selection_payload.get("active_context") or active_context
        active_context_business_id = active_context.get("business_id")
        used_select_context = True

    return {
        "headers": _build_headers(access_token),
        "auth_mode": "login",
        "authenticated": True,
        "user_id": (payload.get("user") or {}).get("id"),
        "active_context_business_id": active_context_business_id,
        "accessible_contexts": accessible_contexts,
        "used_select_context": used_select_context,
    }


def _measure_local(args: argparse.Namespace, endpoint_keys: list[str]) -> dict[str, Any]:
    from backend.main import create_app
    from backend.models import Business, TeamMember
    from backend.database import db

    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine.Engine").setLevel(logging.WARNING)
    app = create_app()
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine.Engine").setLevel(logging.WARNING)
    query_count_enabled = not args.disable_query_count
    fixture_report = _maybe_ensure_benchmark_fixture(args)

    with app.app_context():
        db.engine.echo = False
        client = app.test_client()
        auth = _authenticate_test_client(client, args)
        resolved_business_id = _resolve_local_business_id(
            args.business_id,
            auth,
            Business,
            TeamMember,
        )
        specs = _build_endpoint_specs(resolved_business_id, args.start_date, args.end_date, endpoint_keys)
        context_manager = QueryCounter(db.engine) if query_count_enabled else nullcontext()
        with context_manager as query_counter:
            results = []
            for spec in specs:
                for _ in range(args.warmup):
                    if query_count_enabled and query_counter is not None:
                        query_counter.reset()
                    client.get(spec["path"], headers=auth["headers"])

                runs = []
                for iteration in range(1, args.repetitions + 1):
                    if query_count_enabled and query_counter is not None:
                        query_counter.reset()
                    started_at = time.perf_counter()
                    response = client.get(spec["path"], headers=auth["headers"])
                    elapsed_ms = round((time.perf_counter() - started_at) * 1000, 2)
                    runs.append(
                        {
                            "iteration": iteration,
                            "status_code": response.status_code,
                            "elapsed_ms": elapsed_ms,
                            "query_count": int(query_counter.count) if query_count_enabled and query_counter is not None else None,
                        }
                    )
                results.append(_summarize_runs(spec["label"], spec["path"], runs, query_count_enabled))

        return {
            "context": {
                "mode": "test-client",
                "base_url": None,
                "business_id": resolved_business_id,
                "start_date": args.start_date,
                "end_date": args.end_date,
                "repetitions": args.repetitions,
                "warmup": args.warmup,
                "authenticated": auth["authenticated"],
                "auth_mode": auth["auth_mode"],
                "active_context_business_id": auth.get("active_context_business_id"),
                "accessible_context_business_ids": [item.get("business_id") for item in (auth.get("accessible_contexts") or [])],
                "used_select_context": auth.get("used_select_context"),
                "query_count_enabled": query_count_enabled,
                "app_factory": "create_app()",
                "benchmark_fixture": fixture_report,
            },
            "results": results,
        }


def _measure_remote(args: argparse.Namespace, endpoint_keys: list[str]) -> dict[str, Any]:
    fixture_report = _maybe_ensure_benchmark_fixture(args)
    session = requests.Session()
    auth = _authenticate_http(session, args)
    resolved_business_id = _resolve_business_id(
        args.business_id,
        auth.get("active_context_business_id"),
        auth.get("accessible_contexts") or [],
    )
    specs = _build_endpoint_specs(resolved_business_id, args.start_date, args.end_date, endpoint_keys)
    results = []
    for spec in specs:
        full_url = urljoin(args.base_url.rstrip("/") + "/", spec["path"].lstrip("/"))
        for _ in range(args.warmup):
            session.get(full_url, headers=auth["headers"], timeout=args.timeout)

        runs = []
        for iteration in range(1, args.repetitions + 1):
            started_at = time.perf_counter()
            response = session.get(full_url, headers=auth["headers"], timeout=args.timeout)
            elapsed_ms = round((time.perf_counter() - started_at) * 1000, 2)
            runs.append(
                {
                    "iteration": iteration,
                    "status_code": response.status_code,
                    "elapsed_ms": elapsed_ms,
                    "query_count": None,
                }
            )
        results.append(_summarize_runs(spec["label"], spec["path"], runs, query_count_enabled=False))

    return {
        "context": {
            "mode": "base-url",
            "base_url": args.base_url,
            "business_id": resolved_business_id,
            "start_date": args.start_date,
            "end_date": args.end_date,
            "repetitions": args.repetitions,
            "warmup": args.warmup,
            "authenticated": auth["authenticated"],
            "auth_mode": auth["auth_mode"],
            "active_context_business_id": auth.get("active_context_business_id"),
            "accessible_context_business_ids": [item.get("business_id") for item in (auth.get("accessible_contexts") or [])],
            "used_select_context": auth.get("used_select_context"),
            "query_count_enabled": False,
            "app_factory": None,
            "benchmark_fixture": fixture_report,
        },
        "results": results,
    }


def main() -> int:
    try:
        args = _parse_args()
        endpoint_keys = _normalize_endpoint_keys(args.endpoints)
        payload = _measure_local(args, endpoint_keys) if args.mode == "test-client" else _measure_remote(args, endpoint_keys)

        if args.output_json:
            _write_output(args.output_json, payload)

        if args.format == "json":
            print(json.dumps(payload, indent=2, ensure_ascii=False))
        else:
            _print_text_report(payload)

        if args.fail_on_non_200:
            non_200 = [run for result in payload["results"] for run in result["runs"] if int(run["status_code"]) >= 400]
            if non_200:
                return 1
        return 0
    except Exception as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
