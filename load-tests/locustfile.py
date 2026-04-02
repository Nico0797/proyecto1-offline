import os
import random
import requests
import json
import time
import uuid
from typing import Any

from locust import HttpUser, between, task, events


def _float_env(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or not str(raw).strip():
        return default
    return float(str(raw).strip())


def _int_env(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or not str(raw).strip():
        return default
    return int(str(raw).strip())


SCENARIO = str(os.getenv("LOADTEST_SCENARIO", "A") or "A").strip().upper()
EMAIL = str(os.getenv("LOADTEST_EMAIL", "") or "").strip()
PASSWORD = str(os.getenv("LOADTEST_PASSWORD", "") or "").strip()
BUSINESS_ID = _int_env("LOADTEST_BUSINESS_ID", 0)
READ_SEARCH_TERM = str(os.getenv("LOADTEST_SEARCH_TERM", "QA/LOADTEST Customer") or "QA/LOADTEST Customer").strip()
PROFILE_OUTPUT_PATH = str(os.getenv("LOADTEST_PROFILE_OUTPUT", "") or "").strip()
PROFILE_SAMPLES: dict[str, list[dict[str, Any]]] = {}


def _percentile(values: list[float], ratio: float) -> float:
    if not values:
        return 0.0
    sorted_values = sorted(values)
    index = min(len(sorted_values) - 1, max(0, int(round((len(sorted_values) - 1) * ratio))))
    return float(sorted_values[index])


def _record_profile_sample(metric_name: str, response) -> None:
    if response is None:
        return
    headers = getattr(response, "headers", {}) or {}
    try:
        query_count = int(float(headers.get("X-Profile-Query-Count") or 0))
        sql_time_ms = float(headers.get("X-Profile-Sql-Time-Ms") or 0.0)
        total_wall_ms = float(headers.get("X-Profile-Total-Wall-Ms") or 0.0)
    except Exception:
        return
    sample = {
        "query_count": query_count,
        "sql_time_ms": sql_time_ms,
        "total_wall_ms": total_wall_ms,
    }
    summary_header = headers.get("X-Profile-Summary")
    if summary_header:
        try:
            payload = json.loads(summary_header)
            if isinstance(payload, dict):
                sample["cache"] = payload.get("cache")
                sample["stages"] = payload.get("stages")
                sample["python_time_ms"] = float(payload.get("python_time_ms") or 0.0)
                sample["instrumented_wall_ms"] = float(payload.get("instrumented_wall_ms") or 0.0)
                sample["unaccounted_wall_ms"] = float(payload.get("unaccounted_wall_ms") or 0.0)
        except Exception:
            pass
    PROFILE_SAMPLES.setdefault(metric_name, []).append(sample)


@events.quitting.add_listener
def _persist_profile_summary(environment, **kwargs):
    if not PROFILE_OUTPUT_PATH:
        return
    summary: dict[str, Any] = {}
    for metric_name, samples in PROFILE_SAMPLES.items():
        query_counts = [float(item.get("query_count") or 0.0) for item in samples]
        sql_times = [float(item.get("sql_time_ms") or 0.0) for item in samples]
        wall_times = [float(item.get("total_wall_ms") or 0.0) for item in samples]
        python_times = [float(item.get("python_time_ms") or 0.0) for item in samples]
        instrumented_wall_times = [float(item.get("instrumented_wall_ms") or 0.0) for item in samples]
        unaccounted_wall_times = [float(item.get("unaccounted_wall_ms") or 0.0) for item in samples]
        cache_hits = sum(1 for item in samples if isinstance(item.get("cache"), dict) and item["cache"].get("hit") is True)
        stage_names = sorted({
            str(stage_name)
            for item in samples
            for stage_name in ((item.get("stages") or {}).keys())
        })
        stage_metrics: dict[str, Any] = {}
        for stage_name in stage_names:
            stage_samples = []
            stage_queries = []
            stage_sql_times = []
            stage_wall_times = []
            stage_python_times = []
            for item in samples:
                stage_payload = (item.get("stages") or {}).get(stage_name) or {}
                if not stage_payload:
                    continue
                wall_ms = float(stage_payload.get("wall_ms") or 0.0)
                sql_ms = float(stage_payload.get("sql_time_ms") or 0.0)
                stage_samples.append(stage_payload)
                stage_queries.append(float(stage_payload.get("queries") or 0.0))
                stage_sql_times.append(sql_ms)
                stage_wall_times.append(wall_ms)
                stage_python_times.append(max(wall_ms - sql_ms, 0.0))
            stage_metrics[stage_name] = {
                "samples": len(stage_samples),
                "wall_ms_avg": round(sum(stage_wall_times) / len(stage_wall_times), 3) if stage_wall_times else 0.0,
                "wall_ms_p95": round(_percentile(stage_wall_times, 0.95), 3) if stage_wall_times else 0.0,
                "sql_time_ms_avg": round(sum(stage_sql_times) / len(stage_sql_times), 3) if stage_sql_times else 0.0,
                "sql_time_ms_p95": round(_percentile(stage_sql_times, 0.95), 3) if stage_sql_times else 0.0,
                "python_time_ms_avg": round(sum(stage_python_times) / len(stage_python_times), 3) if stage_python_times else 0.0,
                "python_time_ms_p95": round(_percentile(stage_python_times, 0.95), 3) if stage_python_times else 0.0,
                "query_count_avg": round(sum(stage_queries) / len(stage_queries), 3) if stage_queries else 0.0,
                "query_count_p95": round(_percentile(stage_queries, 0.95), 3) if stage_queries else 0.0,
            }
        summary[metric_name] = {
            "samples": len(samples),
            "query_count_avg": round(sum(query_counts) / len(query_counts), 3) if query_counts else 0.0,
            "query_count_p95": round(_percentile(query_counts, 0.95), 3) if query_counts else 0.0,
            "sql_time_ms_avg": round(sum(sql_times) / len(sql_times), 3) if sql_times else 0.0,
            "sql_time_ms_p95": round(_percentile(sql_times, 0.95), 3) if sql_times else 0.0,
            "wall_time_ms_avg": round(sum(wall_times) / len(wall_times), 3) if wall_times else 0.0,
            "wall_time_ms_p95": round(_percentile(wall_times, 0.95), 3) if wall_times else 0.0,
            "python_time_ms_avg": round(sum(python_times) / len(python_times), 3) if python_times else 0.0,
            "python_time_ms_p95": round(_percentile(python_times, 0.95), 3) if python_times else 0.0,
            "instrumented_wall_ms_avg": round(sum(instrumented_wall_times) / len(instrumented_wall_times), 3) if instrumented_wall_times else 0.0,
            "instrumented_wall_ms_p95": round(_percentile(instrumented_wall_times, 0.95), 3) if instrumented_wall_times else 0.0,
            "unaccounted_wall_ms_avg": round(sum(unaccounted_wall_times) / len(unaccounted_wall_times), 3) if unaccounted_wall_times else 0.0,
            "unaccounted_wall_ms_p95": round(_percentile(unaccounted_wall_times, 0.95), 3) if unaccounted_wall_times else 0.0,
            "cache_hit_count": cache_hits,
            "stage_metrics": stage_metrics,
        }
    with open(PROFILE_OUTPUT_PATH, "w", encoding="utf-8") as output_file:
        json.dump(summary, output_file, indent=2, ensure_ascii=False)


SCENARIO_CONFIG = {
    "STEADY": {
        "weights": {
            "dashboard": 24,
            "summary": 16,
            "customers": 14,
            "sales": 12,
            "products": 8,
            "payments": 6,
            "create_sale": 10,
            "create_payment": 5,
            "create_expense": 3,
            "create_customer": 2,
        },
        "think_min": _float_env("LOADTEST_THINK_MIN", 0.8),
        "think_max": _float_env("LOADTEST_THINK_MAX", 2.8),
        "credit_ratio": 0.35,
        "auth_ratio": 0.0,
        "bootstrap_login": True,
        "bootstrap_reference_data": False,
    },
    "LOGIN": {
        "weights": {
            "auth_cycle": 100,
        },
        "think_min": _float_env("LOADTEST_THINK_MIN", 0.2),
        "think_max": _float_env("LOADTEST_THINK_MAX", 0.8),
        "credit_ratio": 0.0,
        "auth_ratio": 1.0,
        "bootstrap_login": False,
        "bootstrap_reference_data": False,
    },
    "A": {
        "weights": {
            "business_profile": 12,
            "dashboard": 38,
            "customers": 24,
            "sales": 18,
            "products": 8,
        },
        "think_min": _float_env("LOADTEST_THINK_MIN", 1.5),
        "think_max": _float_env("LOADTEST_THINK_MAX", 4.0),
        "credit_ratio": 0.15,
        "auth_ratio": 0.0,
        "bootstrap_login": True,
        "bootstrap_reference_data": True,
    },
    "B": {
        "weights": {
            "auth_cycle": 5,
            "dashboard": 20,
            "customers": 15,
            "sales": 15,
            "products": 10,
            "create_sale": 15,
            "create_customer": 8,
            "create_payment": 7,
            "create_expense": 5,
        },
        "think_min": _float_env("LOADTEST_THINK_MIN", 0.8),
        "think_max": _float_env("LOADTEST_THINK_MAX", 2.5),
        "credit_ratio": 0.35,
        "auth_ratio": 0.05,
        "bootstrap_login": True,
        "bootstrap_reference_data": True,
    },
    "C": {
        "weights": {
            "auth_cycle": 5,
            "dashboard": 15,
            "customers": 10,
            "sales": 10,
            "products": 5,
            "create_sale": 30,
            "create_payment": 15,
            "create_expense": 10,
        },
        "think_min": _float_env("LOADTEST_THINK_MIN", 0.2),
        "think_max": _float_env("LOADTEST_THINK_MAX", 1.2),
        "credit_ratio": 0.55,
        "auth_ratio": 0.05,
        "bootstrap_login": True,
        "bootstrap_reference_data": True,
    },
    "D": {
        "weights": {
            "dashboard": 20,
            "summary": 15,
            "customers": 10,
            "sales": 10,
            "create_sale": 20,
            "payments": 5,
            "create_payment": 5,
            "create_expense": 10,
            "business_profile": 3,
            "products": 2,
        },
        "think_min": _float_env("LOADTEST_THINK_MIN", 0.8),
        "think_max": _float_env("LOADTEST_THINK_MAX", 2.8),
        "credit_ratio": 0.35,
        "auth_ratio": 0.02,
        "bootstrap_login": True,
        "bootstrap_reference_data": False,
    },
}

CONFIG = SCENARIO_CONFIG.get(SCENARIO, SCENARIO_CONFIG["A"])


class CuadernoUser(HttpUser):
    wait_time = between(CONFIG["think_min"], CONFIG["think_max"])

    def on_start(self):
        if not EMAIL or not PASSWORD:
            raise RuntimeError("LOADTEST_EMAIL y LOADTEST_PASSWORD son requeridos para locust.")
        self.token = ""
        self.business_id = BUSINESS_ID
        self.customer_ids: list[int] = []
        self.product_payloads: list[dict[str, Any]] = []
        if bool(CONFIG.get("bootstrap_login", True)):
            self._bootstrap_login_cycle()
        if bool(CONFIG.get("bootstrap_reference_data", True)):
            self._bootstrap_refresh_reference_data()

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    def _bootstrap_session(self) -> requests.Session:
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        return session

    def _bootstrap_login_cycle(self):
        session = self._bootstrap_session()
        response = session.post(
            f"{self.host}/api/auth/login",
            json={"email": EMAIL, "password": PASSWORD},
            timeout=30,
        )
        _record_profile_sample("auth.login", response)
        payload = response.json() if response.content else {}
        token = payload.get("access_token") if isinstance(payload, dict) else None
        if response.status_code != 200 or not token:
            raise RuntimeError(f"bootstrap login failed status={response.status_code} payload={payload}")
        self.token = token
        active_context = payload.get("active_context") or {}
        accessible_contexts = payload.get("accessible_contexts") or []
        active_business_id = int(active_context.get("business_id") or 0)
        if self.business_id <= 0:
            if active_business_id > 0:
                self.business_id = active_business_id
            elif accessible_contexts:
                self.business_id = int((accessible_contexts[0] or {}).get("business_id") or 0)
        if self.business_id <= 0:
            raise RuntimeError("No fue posible resolver business_id desde bootstrap login.")
        if active_business_id != self.business_id:
            select_response = session.post(
                f"{self.host}/api/auth/select-context",
                json={"business_id": self.business_id},
                headers=self._headers(),
                timeout=30,
            )
            _record_profile_sample("auth.select_context", select_response)
            select_payload = select_response.json() if select_response.content else {}
            if select_response.status_code != 200:
                raise RuntimeError(
                    f"bootstrap select-context failed status={select_response.status_code} payload={select_payload}"
                )
            self.token = (select_payload or {}).get("access_token") or self.token
        bootstrap_response = session.get(
            f"{self.host}/api/auth/bootstrap",
            params={"business_id": self.business_id},
            headers=self._headers(),
            timeout=30,
        )
        _record_profile_sample("auth.bootstrap", bootstrap_response)
        if bootstrap_response.status_code != 200:
            raise RuntimeError(
                f"bootstrap auth/bootstrap failed status={bootstrap_response.status_code} payload={bootstrap_response.text[:300]}"
            )

    def _bootstrap_refresh_reference_data(self):
        if self.business_id <= 0 or not self.token:
            return
        session = self._bootstrap_session()
        headers = self._headers()
        customers_response = session.get(
            f"{self.host}/api/businesses/{self.business_id}/customers",
            headers=headers,
            timeout=30,
        )
        if customers_response.status_code == 200:
            payload = customers_response.json() or {}
            self.customer_ids = [int(item["id"]) for item in payload.get("customers", []) if item.get("id")]
        products_response = session.get(
            f"{self.host}/api/businesses/{self.business_id}/products",
            headers=headers,
            timeout=30,
        )
        if products_response.status_code == 200:
            payload = products_response.json() or {}
            self.product_payloads = [item for item in payload.get("products", []) if item.get("id")]

    def _login_cycle(self):
        with self.client.post(
            "/api/auth/login",
            json={"email": EMAIL, "password": PASSWORD},
            name="auth.login",
            catch_response=True,
        ) as response:
            _record_profile_sample("auth.login", response)
            payload = response.json() if response.content else {}
            token = payload.get("access_token") if isinstance(payload, dict) else None
            if response.status_code != 200 or not token:
                response.failure(f"login failed status={response.status_code} payload={payload}")
                return
            self.token = token
            active_context = payload.get("active_context") or {}
            accessible_contexts = payload.get("accessible_contexts") or []
            active_business_id = int(active_context.get("business_id") or 0)
            if self.business_id <= 0:
                if active_business_id > 0:
                    self.business_id = active_business_id
                elif accessible_contexts:
                    self.business_id = int((accessible_contexts[0] or {}).get("business_id") or 0)
            if self.business_id <= 0:
                response.failure("No fue posible resolver business_id desde login.")
                return
            if active_business_id != self.business_id:
                with self.client.post(
                    "/api/auth/select-context",
                    json={"business_id": self.business_id},
                    headers=self._headers(),
                    name="auth.select_context",
                    catch_response=True,
                ) as select_response:
                    _record_profile_sample("auth.select_context", select_response)
                    select_payload = select_response.json() if select_response.content else {}
                    if select_response.status_code != 200:
                        select_response.failure(
                            f"select-context failed status={select_response.status_code} payload={select_payload}"
                        )
                        return
                    self.token = (select_payload or {}).get("access_token") or self.token
            with self.client.get(
                "/api/auth/bootstrap",
                params={"business_id": self.business_id},
                headers=self._headers(),
                name="auth.bootstrap",
                catch_response=True,
            ) as bootstrap_response:
                _record_profile_sample("auth.bootstrap", bootstrap_response)
                if bootstrap_response.status_code != 200:
                    bootstrap_response.failure(
                        f"auth bootstrap failed status={bootstrap_response.status_code} body={bootstrap_response.text[:300]}"
                    )
                    return
                bootstrap_response.success()
            response.success()

    def _refresh_reference_data(self):
        if self.business_id <= 0 or not self.token:
            return
        customers_response = self.client.get(
            f"/api/businesses/{self.business_id}/customers",
            headers=self._headers(),
            name="setup.customers",
        )
        if customers_response.status_code == 200:
            payload = customers_response.json() or {}
            self.customer_ids = [int(item["id"]) for item in payload.get("customers", []) if item.get("id")]
        products_response = self.client.get(
            f"/api/businesses/{self.business_id}/products",
            headers=self._headers(),
            name="setup.products",
        )
        if products_response.status_code == 200:
            payload = products_response.json() or {}
            self.product_payloads = [item for item in payload.get("products", []) if item.get("id")]

    def _choose_customer_id(self) -> int | None:
        if not self.customer_ids:
            self._refresh_reference_data()
        if not self.customer_ids:
            return None
        return random.choice(self.customer_ids)

    def _choose_product(self) -> dict[str, Any] | None:
        if not self.product_payloads:
            self._refresh_reference_data()
        if not self.product_payloads:
            return None
        return random.choice(self.product_payloads)

    def _do_business_profile(self):
        self.client.get("/api/business_profile", name="read.business_profile")

    def _do_dashboard(self):
        self.client.get(
            f"/api/businesses/{self.business_id}/dashboard",
            headers=self._headers(),
            name="read.dashboard",
        )

    def _do_summary(self):
        today = time.strftime("%Y-%m-%d")
        self.client.get(
            f"/api/businesses/{self.business_id}/summary",
            params={"start_date": today, "end_date": today},
            headers=self._headers(),
            name="read.summary",
        )

    def _do_customers(self):
        params = {}
        if random.random() < 0.25:
            params["search"] = READ_SEARCH_TERM
        self.client.get(
            f"/api/businesses/{self.business_id}/customers",
            params=params,
            headers=self._headers(),
            name="read.customers",
        )

    def _do_sales(self):
        params = {"include_items": "false"}
        if random.random() < 0.2:
            params["status"] = "pending"
        self.client.get(
            f"/api/businesses/{self.business_id}/sales",
            params=params,
            headers=self._headers(),
            name="read.sales",
        )

    def _do_products(self):
        self.client.get(
            f"/api/businesses/{self.business_id}/products",
            headers=self._headers(),
            name="read.products",
        )

    def _do_payments(self):
        params = {"include_allocations": "false"}
        if random.random() < 0.2:
            params["search"] = READ_SEARCH_TERM
        self.client.get(
            f"/api/businesses/{self.business_id}/payments",
            params=params,
            headers=self._headers(),
            name="read.payments",
        )

    def _do_create_customer(self):
        suffix = uuid.uuid4().hex[:10]
        payload = {
            "name": f"{READ_SEARCH_TERM} Created {suffix}",
            "phone": f"310{random.randint(1000000, 9999999)}",
            "address": f"{READ_SEARCH_TERM} Address {suffix}",
            "notes": "loadtest",
        }
        with self.client.post(
            f"/api/businesses/{self.business_id}/customers",
            json=payload,
            headers=self._headers(),
            name="write.customer",
            catch_response=True,
        ) as response:
            if response.status_code != 201:
                response.failure(f"create customer failed status={response.status_code} body={response.text[:300]}")
                return
            body = response.json() or {}
            customer = body.get("customer") or {}
            customer_id = customer.get("id")
            if customer_id:
                self.customer_ids.append(int(customer_id))
            response.success()

    def _do_create_sale(self):
        product = self._choose_product()
        if not product:
            return
        customer_id = self._choose_customer_id()
        paid = random.random() >= CONFIG["credit_ratio"]
        qty = 1
        unit_price = round(float(product.get("price") or 0), 2)
        total = round(unit_price * qty, 2)
        amount_paid = total if paid else round(total * random.choice([0, 0.25, 0.5]), 2)
        payload = {
            "customer_id": customer_id,
            "sale_date": time.strftime("%Y-%m-%d"),
            "payment_method": "cash" if paid else "credit",
            "paid": paid,
            "amount_paid": amount_paid,
            "note": f"loadtest-sale-{uuid.uuid4().hex[:10]}",
            "items": [
                {
                    "product_id": int(product["id"]),
                    "name": product.get("name") or f"Product {product['id']}",
                    "qty": qty,
                    "unit_price": unit_price,
                    "total": total,
                }
            ],
        }
        with self.client.post(
            f"/api/businesses/{self.business_id}/sales",
            json=payload,
            headers=self._headers(),
            name="write.sale",
            catch_response=True,
        ) as response:
            if response.status_code != 201:
                response.failure(f"create sale failed status={response.status_code} body={response.text[:300]}")
                return
            response.success()

    def _do_create_payment(self):
        customer_id = self._choose_customer_id()
        if not customer_id:
            return
        payload = {
            "customer_id": customer_id,
            "amount": round(random.uniform(5000, 25000), 2),
            "payment_date": time.strftime("%Y-%m-%d"),
            "method": random.choice(["cash", "transfer"]),
            "note": f"loadtest-payment-{uuid.uuid4().hex[:10]}",
        }
        with self.client.post(
            f"/api/businesses/{self.business_id}/payments",
            json=payload,
            headers=self._headers(),
            name="write.payment",
            catch_response=True,
        ) as response:
            if response.status_code != 201:
                response.failure(f"create payment failed status={response.status_code} body={response.text[:300]}")
                return
            response.success()

    def _do_create_expense(self):
        payload = {
            "category": random.choice(["servicios", "insumos", "transportes", "otros"]),
            "amount": round(random.uniform(3000, 18000), 2),
            "expense_date": time.strftime("%Y-%m-%d"),
            "description": f"loadtest-expense-{uuid.uuid4().hex[:10]}",
        }
        with self.client.post(
            f"/api/businesses/{self.business_id}/expenses",
            json=payload,
            headers=self._headers(),
            name="write.expense",
            catch_response=True,
        ) as response:
            if response.status_code != 201:
                response.failure(f"create expense failed status={response.status_code} body={response.text[:300]}")
                return
            response.success()

    def _execute_operation(self, operation: str):
        if operation == "auth_cycle":
            self._login_cycle()
            return
        if operation == "business_profile":
            self._do_business_profile()
            return
        if operation == "dashboard":
            self._do_dashboard()
            return
        if operation == "summary":
            self._do_summary()
            return
        if operation == "customers":
            self._do_customers()
            return
        if operation == "sales":
            self._do_sales()
            return
        if operation == "products":
            self._do_products()
            return
        if operation == "payments":
            self._do_payments()
            return
        if operation == "create_customer":
            self._do_create_customer()
            return
        if operation == "create_sale":
            self._do_create_sale()
            return
        if operation == "create_payment":
            self._do_create_payment()
            return
        if operation == "create_expense":
            self._do_create_expense()
            return
        raise RuntimeError(f"Operación no soportada: {operation}")

    @task
    def workload(self):
        operations = list(CONFIG["weights"].keys())
        weights = list(CONFIG["weights"].values())
        operation = random.choices(operations, weights=weights, k=1)[0]
        self._execute_operation(operation)
