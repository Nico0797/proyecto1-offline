import time

from backend.main import create_app
from backend.services.summary_aggregate_service import refresh_namespace_snapshots


def run_worker() -> int:
    app = create_app()
    with app.app_context():
        shared_cache = app.extensions.get("shared_response_cache")
        builder_resolver = app.extensions.get("summary_refresh_builder_resolver")
        if shared_cache is None or not getattr(shared_cache, "enabled", False):
            app.logger.error("shared response cache is not available; summary refresh worker cannot start")
            return 1
        if not callable(builder_resolver):
            app.logger.error("summary refresh builder resolver is not configured")
            return 1

        poll_seconds = float(app.config.get("SUMMARY_REFRESH_WORKER_POLL_SECONDS", 5) or 5)
        app.logger.info("summary refresh worker started")
        while True:
            job = shared_cache.dequeue_refresh(timeout_seconds=poll_seconds)
            if not job:
                time.sleep(0.05)
                continue
            business_id = int(job.get("business_id") or 0)
            namespace = str(job.get("namespace") or "").strip()
            if business_id <= 0 or not namespace:
                continue
            try:
                refresh_namespace_snapshots(
                    business_id,
                    namespace,
                    builder_resolver,
                )
            except Exception:
                app.logger.exception(
                    "summary refresh worker job failed",
                    extra={
                        "business_id": business_id,
                        "namespace": namespace,
                        "job_id": job.get("job_id"),
                    },
                )


if __name__ == "__main__":
    raise SystemExit(run_worker())
