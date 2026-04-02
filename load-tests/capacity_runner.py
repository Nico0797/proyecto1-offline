import argparse
import csv
import json
import os
import statistics
import subprocess
import sys
import threading
import time
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import psycopg2
from psycopg2.extras import RealDictCursor

try:
    import psutil
except Exception:
    psutil = None

PROJECT_ROOT = Path(__file__).resolve().parent.parent
VENV_PYTHON = PROJECT_ROOT / ".venv" / "Scripts" / "python.exe"
LOCUST_EXE = PROJECT_ROOT / ".venv" / "Scripts" / "locust.exe"
DEFAULT_USERS = [5, 10, 20, 35, 50, 75, 100, 150, 200]
DEFAULT_SCENARIOS = ["STEADY", "LOGIN"]


def _split_csv_strings(raw_value: str) -> list[str]:
    return [item.strip() for item in str(raw_value or "").split(",") if item.strip()]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--business-id", type=int, default=0)
    parser.add_argument("--users", default=",".join(str(item) for item in DEFAULT_USERS))
    parser.add_argument("--scenarios", default=",".join(DEFAULT_SCENARIOS))
    parser.add_argument("--spawn-rate", type=float, default=5.0)
    parser.add_argument("--run-time", default="2m")
    parser.add_argument("--headless", action="store_true", default=True)
    parser.add_argument("--output-dir", default=str(PROJECT_ROOT / "load-tests" / "results"))
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL", ""))
    parser.add_argument("--backend-pid", type=int, default=0)
    parser.add_argument("--docker-container", default=os.getenv("LOADTEST_DOCKER_CONTAINER", ""))
    parser.add_argument("--docker-containers", default=os.getenv("LOADTEST_DOCKER_CONTAINERS", ""))
    parser.add_argument("--docker-db-container", default=os.getenv("LOADTEST_DOCKER_DB_CONTAINER", ""))
    parser.add_argument("--docker-db-user", default=os.getenv("LOADTEST_DOCKER_DB_USER", "postgres"))
    parser.add_argument("--docker-db-name", default=os.getenv("LOADTEST_DOCKER_DB_NAME", "cuaderno"))
    parser.add_argument("--prepare-fixture", action="store_true")
    parser.add_argument("--allow-create", action="store_true")
    parser.add_argument("--allow-remote-db", action="store_true")
    parser.add_argument("--stop-on-failure", action="store_true")
    return parser.parse_args()


class MetricsSampler:
    def __init__(self, *, database_url: str, backend_pid: int, docker_container: str = "", docker_containers: str = "", docker_db_container: str = "", docker_db_user: str = "postgres", docker_db_name: str = "cuaderno"):
        self.database_url = database_url.strip()
        self.backend_pid = backend_pid
        requested_containers = _split_csv_strings(docker_containers)
        single_container = str(docker_container or "").strip()
        if single_container:
            requested_containers.append(single_container)
        self.docker_containers = list(dict.fromkeys(requested_containers))
        self.docker_db_container = str(docker_db_container or "").strip()
        self.docker_db_user = str(docker_db_user or "postgres").strip() or "postgres"
        self.docker_db_name = str(docker_db_name or "cuaderno").strip() or "cuaderno"
        self.samples: list[dict[str, Any]] = []
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self):
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self):
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5)

    def _run(self):
        process = None
        if self.backend_pid > 0 and psutil is not None:
            try:
                process = psutil.Process(self.backend_pid)
                process.cpu_percent(interval=None)
            except Exception:
                process = None
        conn = None
        if self.database_url:
            try:
                conn = psycopg2.connect(self.database_url)
                conn.autocommit = True
            except Exception:
                conn = None
        while not self._stop_event.is_set():
            sample: dict[str, Any] = {"ts": datetime.now(timezone.utc).isoformat()}
            if process is not None:
                try:
                    sample["backend_cpu_percent"] = process.cpu_percent(interval=None)
                    sample["backend_rss_mb"] = round(process.memory_info().rss / (1024 * 1024), 2)
                    sample["backend_threads"] = process.num_threads()
                except Exception as exc:
                    sample["backend_process_error"] = str(exc)
                    process = None
            if self.docker_containers:
                docker_sample = self._sample_docker_containers()
                if docker_sample:
                    sample.update(docker_sample)
            if conn is not None:
                try:
                    with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                        cursor.execute(self._pg_stat_activity_query())
                        row = cursor.fetchone() or {}
                        sample.update({
                            "db_total_connections": int(row.get("total_connections") or 0),
                            "db_active_connections": int(row.get("active_connections") or 0),
                            "db_waiting_connections": int(row.get("waiting_connections") or 0),
                            "db_longest_active_seconds": float(row.get("longest_active_seconds") or 0.0),
                        })
                except Exception as exc:
                    sample["db_metrics_error"] = str(exc)
                    try:
                        conn.close()
                    except Exception:
                        pass
                    conn = None
            elif self.docker_db_container:
                docker_db_sample = self._sample_docker_db()
                if docker_db_sample:
                    sample.update(docker_db_sample)
            self.samples.append(sample)
            self._stop_event.wait(2.0)
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass

    def _sample_docker_containers(self) -> dict[str, Any]:
        docker_samples: dict[str, dict[str, Any]] = {}
        total_cpu = 0.0
        total_mem_usage_mb = 0.0
        mem_pcts: list[float] = []
        total_pids = 0
        for container_name in self.docker_containers:
            container_sample = self._sample_one_docker_container(container_name)
            if not container_sample:
                continue
            docker_samples[container_name] = container_sample
            total_cpu += float(container_sample.get("cpu_percent") or 0.0)
            total_mem_usage_mb += float(container_sample.get("mem_usage_mb") or 0.0)
            if container_sample.get("mem_percent") is not None:
                mem_pcts.append(float(container_sample.get("mem_percent") or 0.0))
            total_pids += int(container_sample.get("pids") or 0)
        if not docker_samples:
            return {}
        return {
            "docker_containers": docker_samples,
            "docker_container_count": len(docker_samples),
            "docker_cpu_percent": round(total_cpu, 3),
            "docker_mem_usage_mb": round(total_mem_usage_mb, 2),
            "docker_mem_percent": round(max(mem_pcts), 3) if mem_pcts else 0.0,
            "docker_pids": total_pids,
        }

    def _sample_one_docker_container(self, container_name: str) -> dict[str, Any]:
        try:
            process = subprocess.run(
                [
                    "docker",
                    "stats",
                    "--no-stream",
                    "--format",
                    "{{.CPUPerc}}|{{.MemPerc}}|{{.MemUsage}}|{{.PIDs}}",
                    container_name,
                ],
                capture_output=True,
                text=True,
                check=True,
            )
        except Exception as exc:
            return {"error": str(exc)}

        raw = (process.stdout or "").strip()
        if not raw:
            return {}
        parts = raw.split("|")
        if len(parts) != 4:
            return {"raw": raw}
        cpu_raw, mem_pct_raw, mem_usage_raw, pids_raw = parts
        sample: dict[str, Any] = {}

        cpu_match = re.search(r"([0-9]+(?:\.[0-9]+)?)", cpu_raw or "")
        mem_pct_match = re.search(r"([0-9]+(?:\.[0-9]+)?)", mem_pct_raw or "")
        pids_match = re.search(r"([0-9]+)", pids_raw or "")
        mem_usage_match = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*([KMG]i?B)", mem_usage_raw or "", re.IGNORECASE)

        if cpu_match:
            sample["cpu_percent"] = float(cpu_match.group(1))
        if mem_pct_match:
            sample["mem_percent"] = float(mem_pct_match.group(1))
        if pids_match:
            sample["pids"] = int(pids_match.group(1))
        if mem_usage_match:
            value = float(mem_usage_match.group(1))
            unit = mem_usage_match.group(2).lower()
            unit_factor = {
                "kib": 1 / 1024,
                "kb": 1 / 1024,
                "mib": 1,
                "mb": 1,
                "gib": 1024,
                "gb": 1024,
            }.get(unit, 0)
            if unit_factor:
                sample["mem_usage_mb"] = round(value * unit_factor, 2)
        return sample

    def _sample_docker_db(self) -> dict[str, Any]:
        sql = self._pg_stat_activity_query().replace("\n", " ").strip()
        try:
            process = subprocess.run(
                [
                    "docker",
                    "exec",
                    self.docker_db_container,
                    "psql",
                    "-U",
                    self.docker_db_user,
                    "-d",
                    self.docker_db_name,
                    "-t",
                    "-A",
                    "-F",
                    "|",
                    "-c",
                    sql,
                ],
                capture_output=True,
                text=True,
                check=True,
            )
        except Exception as exc:
            return {"db_metrics_error": str(exc)}

        raw = (process.stdout or "").strip()
        if not raw:
            return {}
        parts = [item.strip() for item in raw.split("|")]
        if len(parts) != 4:
            return {"db_metrics_raw": raw}
        total_connections, active_connections, waiting_connections, longest_active_seconds = parts
        return {
            "db_total_connections": int(float(total_connections or 0)),
            "db_active_connections": int(float(active_connections or 0)),
            "db_waiting_connections": int(float(waiting_connections or 0)),
            "db_longest_active_seconds": float(longest_active_seconds or 0.0),
        }

    @staticmethod
    def _pg_stat_activity_query() -> str:
        return """
            SELECT
              count(*) AS total_connections,
              count(*) FILTER (WHERE state = 'active') AS active_connections,
              count(*) FILTER (
                WHERE state = 'active'
                  AND wait_event_type IS NOT NULL
                  AND wait_event_type <> 'Client'
              ) AS waiting_connections,
              COALESCE(max(EXTRACT(EPOCH FROM (clock_timestamp() - query_start))) FILTER (WHERE state = 'active'), 0) AS longest_active_seconds
            FROM pg_stat_activity
            WHERE datname = current_database();
        """


def _parse_csv_summary(stats_csv: Path) -> dict[str, Any]:
    if not stats_csv.exists():
        return {}
    rows = list(csv.DictReader(stats_csv.open("r", encoding="utf-8")))
    aggregated = next((row for row in rows if (row.get("Name") or "").strip() == "Aggregated"), None)
    if not aggregated:
        return {}

    def _num(name: str) -> float:
        raw = aggregated.get(name, "0")
        try:
            return float(raw)
        except Exception:
            return 0.0

    endpoint_rows = [
        row for row in rows
        if (row.get("Name") or "").strip() and (row.get("Name") or "").strip() != "Aggregated"
    ]
    slowest_by_avg = None
    if endpoint_rows:
        slowest_by_avg = max(
            endpoint_rows,
            key=lambda row: float(row.get("Average Response Time") or 0.0),
        )

    summary = {
        "requests": int(_num("Request Count")),
        "failures": int(_num("Failure Count")),
        "median_ms": _num("Median Response Time"),
        "avg_ms": _num("Average Response Time"),
        "min_ms": _num("Min Response Time"),
        "max_ms": _num("Max Response Time"),
        "avg_size": _num("Average Content Size"),
        "rps": _num("Requests/s"),
        "failures_per_sec": _num("Failures/s"),
        "p50_ms": _num("50%"),
        "p95_ms": _num("95%"),
        "p99_ms": _num("99%"),
    }
    if slowest_by_avg is not None:
        summary["slowest_endpoint"] = {
            "name": slowest_by_avg.get("Name"),
            "method": slowest_by_avg.get("Type"),
            "avg_ms": float(slowest_by_avg.get("Average Response Time") or 0.0),
            "p95_ms": float(slowest_by_avg.get("95%") or 0.0),
            "p99_ms": float(slowest_by_avg.get("99%") or 0.0),
            "rps": float(slowest_by_avg.get("Requests/s") or 0.0),
        }
    endpoint_metrics = {}
    for endpoint_name in ("auth.login", "auth.select_context", "auth.bootstrap", "read.dashboard", "read.summary"):
        row = next((item for item in endpoint_rows if (item.get("Name") or "").strip() == endpoint_name), None)
        if row is None:
            endpoint_metrics[endpoint_name] = {
                "avg_ms": 0.0,
                "p95_ms": 0.0,
                "rps": 0.0,
                "failures": 0,
                "requests": 0,
            }
            continue
        endpoint_metrics[endpoint_name] = {
            "avg_ms": float(row.get("Average Response Time") or 0.0),
            "p95_ms": float(row.get("95%") or 0.0),
            "rps": float(row.get("Requests/s") or 0.0),
            "failures": int(float(row.get("Failure Count") or 0.0)),
            "requests": int(float(row.get("Request Count") or 0.0)),
        }
    summary["endpoint_metrics"] = endpoint_metrics
    return summary


def _parse_profile_summary(profile_path: Path) -> dict[str, Any]:
    if not profile_path.exists():
        return {}
    try:
        payload = json.loads(profile_path.read_text(encoding="utf-8"))
        return payload if isinstance(payload, dict) else {}
    except Exception:
        return {}


def _parse_distribution(history_csv: Path) -> dict[str, Any]:
    if not history_csv.exists():
        return {}
    rows = list(csv.DictReader(history_csv.open("r", encoding="utf-8")))
    response_times = []
    total_rps = []
    total_failures = []
    for row in rows:
        try:
            if row.get("Total Average Response Time"):
                response_times.append(float(row["Total Average Response Time"]))
            if row.get("Requests/s"):
                total_rps.append(float(row["Requests/s"]))
            if row.get("Total Failure Count"):
                total_failures.append(float(row["Total Failure Count"]))
        except Exception:
            continue
    if not response_times:
        return {}
    sorted_times = sorted(response_times)
    def _pct(p: float) -> float:
        if not sorted_times:
            return 0.0
        idx = min(len(sorted_times) - 1, max(0, int(round((len(sorted_times) - 1) * p))))
        return sorted_times[idx]
    return {
        "p50_estimated_ms": _pct(0.50),
        "p95_estimated_ms": _pct(0.95),
        "p99_estimated_ms": _pct(0.99),
        "avg_rps_window": statistics.mean(total_rps) if total_rps else 0.0,
        "max_rps_window": max(total_rps) if total_rps else 0.0,
        "final_failure_count": total_failures[-1] if total_failures else 0.0,
    }


def _prepare_fixture(args: argparse.Namespace) -> dict[str, Any]:
    cmd = [
        str(VENV_PYTHON if VENV_PYTHON.exists() else sys.executable),
        str(PROJECT_ROOT / "load-tests" / "prepare_load_fixture.py"),
        "--allow-create",
        "--format",
        "json",
        "--email",
        args.email,
        "--password",
        args.password,
    ]
    if args.allow_remote_db:
        cmd.append("--allow-remote-db")
    env = os.environ.copy()
    if args.database_url:
        env["DATABASE_URL"] = args.database_url
    process = subprocess.run(cmd, cwd=str(PROJECT_ROOT), capture_output=True, text=True, check=True, env=env)
    stdout = (process.stdout or "").strip()
    if not stdout:
        raise RuntimeError("prepare_load_fixture.py no devolvió salida JSON")
    try:
        return json.loads(stdout)
    except json.JSONDecodeError:
        decoder = json.JSONDecoder()
        candidate = None
        for index, char in enumerate(stdout):
            if char != "{":
                continue
            try:
                payload, end_index = decoder.raw_decode(stdout[index:])
                trailing = stdout[index + end_index :].strip()
                if isinstance(payload, dict) and (not trailing or trailing.startswith("PS ")):
                    candidate = payload
            except json.JSONDecodeError:
                continue
        if candidate is not None:
            return candidate
        raise RuntimeError(
            "No fue posible encontrar un payload JSON válido en la salida del fixture. "
            f"stdout_tail={stdout[-1000:]}"
        )


def _run_one(args: argparse.Namespace, *, scenario: str, users: int, output_dir: Path) -> dict[str, Any]:
    prefix = output_dir / f"scenario_{scenario.lower()}_u{users}"
    profile_summary_path = Path(str(prefix) + "_profile_summary.json")
    sampler = MetricsSampler(
        database_url=args.database_url,
        backend_pid=args.backend_pid,
        docker_container=getattr(args, "docker_container", ""),
        docker_containers=getattr(args, "docker_containers", ""),
        docker_db_container=getattr(args, "docker_db_container", ""),
        docker_db_user=getattr(args, "docker_db_user", "postgres"),
        docker_db_name=getattr(args, "docker_db_name", "cuaderno"),
    )
    env = os.environ.copy()
    env.update(
        {
            "LOADTEST_SCENARIO": scenario,
            "LOADTEST_EMAIL": args.email,
            "LOADTEST_PASSWORD": args.password,
            "LOADTEST_BUSINESS_ID": str(args.business_id),
            "LOADTEST_PROFILE_OUTPUT": str(profile_summary_path),
        }
    )
    cmd = [
        str(LOCUST_EXE if LOCUST_EXE.exists() else "locust"),
        "-f",
        str(PROJECT_ROOT / "load-tests" / "locustfile.py"),
        "--host",
        args.base_url.rstrip("/"),
        "--users",
        str(users),
        "--spawn-rate",
        str(args.spawn_rate),
        "--run-time",
        args.run_time,
        "--csv",
        str(prefix),
        "--html",
        str(prefix) + ".html",
        "--headless",
        "--only-summary",
    ]
    started_at = datetime.now(timezone.utc).isoformat()
    sampler.start()
    process = subprocess.run(cmd, cwd=str(PROJECT_ROOT), capture_output=True, text=True, env=env)
    sampler.stop()
    finished_at = datetime.now(timezone.utc).isoformat()

    stats_summary = _parse_csv_summary(Path(str(prefix) + "_stats.csv"))
    distribution = _parse_distribution(Path(str(prefix) + "_stats_history.csv"))
    profile_summary = _parse_profile_summary(profile_summary_path)
    failures = Path(str(prefix) + "_failures.csv")
    failures_count = 0
    if failures.exists():
        try:
            failures_count = max(0, sum(1 for _ in failures.open("r", encoding="utf-8")) - 1)
        except Exception:
            failures_count = 0

    requests_count = int(stats_summary.get("requests") or 0)
    failure_count = int(stats_summary.get("failures") or 0)
    error_rate = (failure_count / requests_count) if requests_count else 0.0

    docker_cpu_peak_percent_by_container: dict[str, float] = {}
    docker_mem_peak_mb_by_container: dict[str, float] = {}
    docker_pids_peak_by_container: dict[str, int] = {}
    for sample in sampler.samples:
        for container_name, container_metrics in ((sample.get("docker_containers") or {}).items()):
            docker_cpu_peak_percent_by_container[container_name] = max(
                docker_cpu_peak_percent_by_container.get(container_name, 0.0),
                float(container_metrics.get("cpu_percent") or 0.0),
            )
            docker_mem_peak_mb_by_container[container_name] = max(
                docker_mem_peak_mb_by_container.get(container_name, 0.0),
                float(container_metrics.get("mem_usage_mb") or 0.0),
            )
            docker_pids_peak_by_container[container_name] = max(
                docker_pids_peak_by_container.get(container_name, 0),
                int(container_metrics.get("pids") or 0),
            )

    metrics_summary = {
        "backend_cpu_peak_percent": max((sample.get("backend_cpu_percent", 0.0) for sample in sampler.samples), default=0.0),
        "backend_rss_peak_mb": max((sample.get("backend_rss_mb", 0.0) for sample in sampler.samples), default=0.0),
        "backend_threads_peak": max((sample.get("backend_threads", 0.0) for sample in sampler.samples), default=0.0),
        "docker_cpu_peak_percent": max((sample.get("docker_cpu_percent", 0.0) for sample in sampler.samples), default=0.0),
        "docker_mem_peak_mb": max((sample.get("docker_mem_usage_mb", 0.0) for sample in sampler.samples), default=0.0),
        "docker_mem_peak_percent": max((sample.get("docker_mem_percent", 0.0) for sample in sampler.samples), default=0.0),
        "docker_pids_peak": max((sample.get("docker_pids", 0.0) for sample in sampler.samples), default=0.0),
        "db_total_connections_peak": max((sample.get("db_total_connections", 0.0) for sample in sampler.samples), default=0.0),
        "db_active_connections_peak": max((sample.get("db_active_connections", 0.0) for sample in sampler.samples), default=0.0),
        "db_waiting_connections_peak": max((sample.get("db_waiting_connections", 0.0) for sample in sampler.samples), default=0.0),
        "db_longest_active_seconds_peak": max((sample.get("db_longest_active_seconds", 0.0) for sample in sampler.samples), default=0.0),
        "docker_cpu_peak_percent_by_container": docker_cpu_peak_percent_by_container,
        "docker_mem_peak_mb_by_container": docker_mem_peak_mb_by_container,
        "docker_pids_peak_by_container": docker_pids_peak_by_container,
    }

    auth_login_endpoint = (stats_summary.get("endpoint_metrics") or {}).get("auth.login") or {}
    auth_login_profile = (profile_summary.get("auth.login") or {}) if isinstance(profile_summary, dict) else {}
    auth_login_avg_ms = float(auth_login_endpoint.get("avg_ms") or 0.0)
    auth_login_wall_ms_avg = float(auth_login_profile.get("wall_time_ms_avg") or 0.0)
    metrics_summary["auth_login_queue_gap_ms_avg"] = round(max(auth_login_avg_ms - auth_login_wall_ms_avg, 0.0), 3)

    report = {
        "scenario": scenario,
        "users": users,
        "started_at": started_at,
        "finished_at": finished_at,
        "command": cmd,
        "exit_code": process.returncode,
        "stdout_tail": process.stdout[-4000:],
        "stderr_tail": process.stderr[-4000:],
        "stats_summary": stats_summary,
        "distribution": distribution,
        "profile_summary": profile_summary,
        "failures_rows": failures_count,
        "error_rate": error_rate,
        "metrics_samples": sampler.samples,
        "metrics_summary": metrics_summary,
        "artifacts": {
            "stats_csv": str(Path(str(prefix) + "_stats.csv")),
            "stats_history_csv": str(Path(str(prefix) + "_stats_history.csv")),
            "failures_csv": str(Path(str(prefix) + "_failures.csv")),
            "profile_summary_json": str(profile_summary_path),
            "report_html": str(Path(str(prefix) + ".html")),
        },
    }
    report["capacity_pass"] = bool(
        process.returncode == 0
        and error_rate < 0.01
        and float(stats_summary.get("p95_ms") or distribution.get("p95_estimated_ms") or 0.0) <= 2500.0
        and float(metrics_summary.get("db_waiting_connections_peak") or 0.0) == 0.0
    )
    return report


def main() -> int:
    args = parse_args()
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    fixture_report = None
    if args.prepare_fixture:
        fixture_report = _prepare_fixture(args)
        if args.business_id <= 0:
            args.business_id = int((fixture_report or {}).get("business", {}).get("id") or 0)

    users_list = [int(item.strip()) for item in str(args.users).split(",") if item.strip()]
    scenarios = [item.strip().upper() for item in str(args.scenarios).split(",") if item.strip()]

    summary = {
        "base_url": args.base_url,
        "business_id": args.business_id,
        "users": users_list,
        "scenarios": scenarios,
        "run_time": args.run_time,
        "spawn_rate": args.spawn_rate,
        "fixture": fixture_report,
        "runs": [],
    }

    for scenario in scenarios:
        for users in users_list:
            run_report = _run_one(args, scenario=scenario, users=users, output_dir=output_dir)
            summary["runs"].append(run_report)
            summary_path = output_dir / "capacity_summary.json"
            summary_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
            if args.stop_on_failure and not run_report.get("capacity_pass"):
                print(json.dumps(summary, indent=2, ensure_ascii=False))
                return 1

    print(json.dumps(summary, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
