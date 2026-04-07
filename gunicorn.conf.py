import os


def _get_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or not str(raw).strip():
        return default
    return int(str(raw).strip())


bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
workers = _get_int("GUNICORN_WORKERS", 2)
threads = _get_int("GUNICORN_THREADS", 2)
timeout = _get_int("GUNICORN_TIMEOUT", 120)
graceful_timeout = _get_int("GUNICORN_GRACEFUL_TIMEOUT", 30)
keepalive = _get_int("GUNICORN_KEEPALIVE", 5)
max_requests = _get_int("GUNICORN_MAX_REQUESTS", 1000)
max_requests_jitter = _get_int("GUNICORN_MAX_REQUESTS_JITTER", 100)
worker_class = "gthread" if threads > 1 else "sync"
accesslog = "-"
errorlog = "-"
loglevel = str(os.getenv("LOG_LEVEL", "info") or "info").lower()
capture_output = True
preload_app = False
