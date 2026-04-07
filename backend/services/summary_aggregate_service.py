from __future__ import annotations

import threading
import time
import zlib
from contextlib import contextmanager
from datetime import date, datetime, timedelta

from flask import current_app
from sqlalchemy import func, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError

from backend.database import db
from backend.models import Expense, Payment, Product, Sale, SummaryCacheState, SummaryDailyAggregate
from backend.services.commercial_financials import list_sale_initial_cash_events
from backend.services.response_cache import SharedResponseCache

SUMMARY_CACHE_NAMESPACE = "summary"
DASHBOARD_CACHE_NAMESPACE = "dashboard"

_LOCAL_SINGLEFLIGHT_GUARD = threading.RLock()
_LOCAL_SINGLEFLIGHT_LOCKS: dict[tuple[int, str], threading.RLock] = {}


def _date_range(start_date: date, end_date: date):
    current = start_date
    while current <= end_date:
        yield current
        current += timedelta(days=1)


def _normalize_numeric(value, *, digits: int = 2):
    return round(float(value or 0), digits)


def _utcnow() -> datetime:
    return datetime.utcnow()


def _get_dialect_name() -> str:
    bind = db.session.get_bind()
    return getattr(getattr(bind, "dialect", None), "name", "") if bind is not None else ""


def _normalize_date_bounds(start_date: date | None, end_date: date | None) -> tuple[date | None, date | None]:
    if start_date and end_date and start_date > end_date:
        return end_date, start_date
    return start_date, end_date


def _namespace_lock_key(namespace: str) -> int:
    return int(zlib.crc32(str(namespace or "").encode("utf-8")) & 0x7FFFFFFF)


def _get_local_singleflight_lock(business_id: int, namespace: str) -> threading.RLock:
    composite_key = (int(business_id), str(namespace or ""))
    with _LOCAL_SINGLEFLIGHT_GUARD:
        lock = _LOCAL_SINGLEFLIGHT_LOCKS.get(composite_key)
        if lock is None:
            lock = threading.RLock()
            _LOCAL_SINGLEFLIGHT_LOCKS[composite_key] = lock
        return lock


@contextmanager
def acquire_namespace_singleflight(business_id: int, namespace: str):
    normalized_business_id = int(business_id)
    normalized_namespace = str(namespace or "").strip() or SUMMARY_CACHE_NAMESPACE
    if _get_dialect_name() == "postgresql":
        namespace_key = _namespace_lock_key(normalized_namespace)
        db.session.execute(
            text("SELECT pg_advisory_lock(:business_id, :namespace_key)"),
            {"business_id": normalized_business_id, "namespace_key": namespace_key},
        )
        try:
            yield
        finally:
            db.session.execute(
                text("SELECT pg_advisory_unlock(:business_id, :namespace_key)"),
                {"business_id": normalized_business_id, "namespace_key": namespace_key},
            )
        return

    lock = _get_local_singleflight_lock(normalized_business_id, normalized_namespace)
    lock.acquire()
    try:
        yield
    finally:
        lock.release()


def _get_cache_state(business_id: int, namespace: str) -> SummaryCacheState | None:
    return SummaryCacheState.query.filter(
        SummaryCacheState.business_id == int(business_id),
        SummaryCacheState.namespace == str(namespace or "").strip(),
    ).first()


def get_shared_response_cache() -> SharedResponseCache | None:
    extensions = getattr(current_app, "extensions", None)
    if not isinstance(extensions, dict):
        return None
    cache = extensions.get("shared_response_cache")
    return cache if isinstance(cache, SharedResponseCache) and cache.enabled else None


def _serialize_datetime(value: datetime | None) -> str | None:
    return value.isoformat() if value is not None else None


def get_namespace_state_snapshot(
    business_id: int,
    namespace: str,
    *,
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict[str, object] | None:
    state = _get_cache_state(business_id, namespace)
    if state is None:
        return None
    if start_date is not None or end_date is not None:
        if not _state_intersects_range(state, start_date, end_date) and not _state_covers_range(state, start_date, end_date):
            return {
                "business_id": int(business_id),
                "namespace": str(namespace or "").strip(),
                "dirty": False,
                "last_dirty_at": _serialize_datetime(state.last_dirty_at),
                "last_rebuilt_at": _serialize_datetime(state.last_rebuilt_at),
                "dirty_start_date": state.dirty_start_date.isoformat() if state.dirty_start_date else None,
                "dirty_end_date": state.dirty_end_date.isoformat() if state.dirty_end_date else None,
            }
    return {
        "business_id": int(business_id),
        "namespace": str(namespace or "").strip(),
        "dirty": bool(state.dirty),
        "dirty_since": _serialize_datetime(state.dirty_since),
        "last_dirty_at": _serialize_datetime(state.last_dirty_at),
        "last_rebuilt_at": _serialize_datetime(state.last_rebuilt_at),
        "dirty_start_date": state.dirty_start_date.isoformat() if state.dirty_start_date else None,
        "dirty_end_date": state.dirty_end_date.isoformat() if state.dirty_end_date else None,
    }


def snapshot_is_fresh(snapshot: dict[str, object] | None, state_snapshot: dict[str, object] | None = None) -> bool:
    if not snapshot:
        return False
    fresh_until = float(snapshot.get("fresh_until_epoch") or 0.0)
    if fresh_until <= 0 or fresh_until < time.time():
        return False
    if not state_snapshot or not bool(state_snapshot.get("dirty")):
        return True
    return (snapshot.get("state_last_dirty_at") or None) == (state_snapshot.get("last_dirty_at") or None)


def snapshot_is_servable(snapshot: dict[str, object] | None) -> bool:
    if not snapshot:
        return False
    stale_until = float(snapshot.get("stale_until_epoch") or 0.0)
    return stale_until > time.time()


def build_snapshot_lock_name(namespace: str, business_id: int, cache_key: object) -> str:
    normalized_namespace = str(namespace or "").strip()
    return f"snapshot-build:{normalized_namespace}:{int(business_id)}:{zlib.crc32(str(cache_key).encode('utf-8')) & 0x7FFFFFFF}"


def persist_shared_snapshot(
    namespace: str,
    business_id: int,
    cache_key: object,
    payload: object,
    *,
    state_snapshot: dict[str, object] | None = None,
) -> bool:
    shared_cache = get_shared_response_cache()
    if shared_cache is None:
        return False
    normalized_namespace = str(namespace or "").strip()
    if normalized_namespace == SUMMARY_CACHE_NAMESPACE:
        fresh_ttl = int(current_app.config.get("SHARED_RESPONSE_CACHE_FRESH_TTL_SUMMARY_SECONDS", 15))
        stale_ttl = int(current_app.config.get("SHARED_RESPONSE_CACHE_STALE_TTL_SUMMARY_SECONDS", 120))
    else:
        fresh_ttl = int(current_app.config.get("SHARED_RESPONSE_CACHE_FRESH_TTL_DASHBOARD_SECONDS", 15))
        stale_ttl = int(current_app.config.get("SHARED_RESPONSE_CACHE_STALE_TTL_DASHBOARD_SECONDS", 120))
    metadata = {
        "state_last_dirty_at": (state_snapshot or {}).get("last_dirty_at"),
        "state_dirty": bool((state_snapshot or {}).get("dirty")),
    }
    return shared_cache.set_snapshot(
        normalized_namespace,
        int(business_id),
        cache_key,
        payload,
        fresh_ttl_seconds=fresh_ttl,
        stale_ttl_seconds=stale_ttl,
        metadata=metadata,
    )


def enqueue_namespace_refresh(business_id: int, namespace: str) -> bool:
    shared_cache = get_shared_response_cache()
    if shared_cache is None:
        return False
    return shared_cache.enqueue_refresh(
        {
            "business_id": int(business_id),
            "namespace": str(namespace or "").strip(),
        },
        dedupe_ttl_seconds=float(current_app.config.get("SUMMARY_REFRESH_QUEUE_DEDUPE_TTL_SECONDS", 15) or 15),
    )


def refresh_namespace_snapshots(business_id: int, namespace: str, builder_resolver) -> int:
    shared_cache = get_shared_response_cache()
    if shared_cache is None:
        return 0
    normalized_business_id = int(business_id)
    normalized_namespace = str(namespace or "").strip()
    lock_token = shared_cache.acquire_lock(
        f"namespace-refresh:{normalized_business_id}:{normalized_namespace}",
        ttl_seconds=float(current_app.config.get("SHARED_RESPONSE_CACHE_LOCK_TTL_SECONDS", 60) or 60),
    )
    if lock_token is None:
        return 0
    try:
        cache_keys = shared_cache.list_snapshot_keys(normalized_namespace, normalized_business_id)
        if not cache_keys:
            return 0
        state = get_namespace_state_snapshot(normalized_business_id, normalized_namespace)
        refreshed_count = 0
        for cache_key in cache_keys:
            builder = builder_resolver(normalized_namespace, cache_key)
            if builder is None:
                continue
            payload = builder()
            persist_shared_snapshot(
                normalized_namespace,
                normalized_business_id,
                cache_key,
                payload,
                state_snapshot=state,
            )
            refreshed_count += 1
        if refreshed_count > 0 and state is not None and bool(state.get("dirty")):
            state_row = _get_cache_state(normalized_business_id, normalized_namespace)
            mark_namespace_rebuilt(
                normalized_business_id,
                normalized_namespace,
                dirty_snapshot={"last_dirty_at": state_row.last_dirty_at if state_row is not None else None},
            )
            db.session.commit()
        return refreshed_count
    except Exception:
        db.session.rollback()
        current_app.logger.exception(
            "namespace background refresh failed",
            extra={
                "business_id": normalized_business_id,
                "namespace": normalized_namespace,
            },
        )
        raise
    finally:
        shared_cache.release_lock(f"namespace-refresh:{normalized_business_id}:{normalized_namespace}", lock_token)


def _state_covers_range(state: SummaryCacheState | None, start_date: date | None, end_date: date | None) -> bool:
    if state is None:
        return False
    normalized_start, normalized_end = _normalize_date_bounds(start_date, end_date)
    if normalized_start is None or normalized_end is None:
        return state.dirty_start_date is None and state.dirty_end_date is None
    if state.dirty_start_date is None or state.dirty_end_date is None:
        return False
    return state.dirty_start_date <= normalized_start and state.dirty_end_date >= normalized_end


def _state_intersects_range(state: SummaryCacheState | None, start_date: date | None, end_date: date | None) -> bool:
    if state is None or not bool(state.dirty):
        return False
    normalized_start, normalized_end = _normalize_date_bounds(start_date, end_date)
    if normalized_start is None or normalized_end is None:
        return True
    if state.dirty_start_date is None or state.dirty_end_date is None:
        return True
    return not (state.dirty_end_date < normalized_start or state.dirty_start_date > normalized_end)


def get_namespace_dirty_snapshot(
    business_id: int,
    namespace: str,
    *,
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict | None:
    state = _get_cache_state(business_id, namespace)
    if state is None or not bool(state.dirty):
        return None
    if not _state_intersects_range(state, start_date, end_date):
        return None
    return {
        "business_id": int(business_id),
        "namespace": str(namespace or "").strip(),
        "dirty": True,
        "last_dirty_at": state.last_dirty_at,
        "dirty_since": state.dirty_since,
        "dirty_start_date": state.dirty_start_date,
        "dirty_end_date": state.dirty_end_date,
    }


def should_bypass_local_response_cache(
    business_id: int,
    namespace: str,
    *,
    start_date: date | None = None,
    end_date: date | None = None,
) -> bool:
    return get_namespace_dirty_snapshot(
        business_id,
        namespace,
        start_date=start_date,
        end_date=end_date,
    ) is not None


def mark_namespace_dirty(
    business_id: int,
    namespace: str,
    *,
    start_date: date | None = None,
    end_date: date | None = None,
) -> bool:
    normalized_business_id = int(business_id)
    normalized_namespace = str(namespace or "").strip()
    normalized_start, normalized_end = _normalize_date_bounds(start_date, end_date)
    debounce_seconds = float(current_app.config.get("SUMMARY_CACHE_DIRTY_DEBOUNCE_SECONDS", 2) or 0)
    now = _utcnow()
    state = _get_cache_state(normalized_business_id, normalized_namespace)

    if state is not None and bool(state.dirty):
        within_debounce = bool(state.last_dirty_at) and debounce_seconds > 0 and (now - state.last_dirty_at).total_seconds() < debounce_seconds
        if within_debounce and _state_covers_range(state, normalized_start, normalized_end):
            return False

    if state is None:
        state = SummaryCacheState(
            business_id=normalized_business_id,
            namespace=normalized_namespace,
            dirty=True,
            dirty_since=now,
            last_dirty_at=now,
            dirty_start_date=normalized_start,
            dirty_end_date=normalized_end,
        )
        db.session.add(state)
        db.session.flush()
        return True

    state.dirty = True
    state.dirty_since = state.dirty_since or now
    state.last_dirty_at = now
    if normalized_start is not None:
        state.dirty_start_date = normalized_start if state.dirty_start_date is None else min(state.dirty_start_date, normalized_start)
    if normalized_end is not None:
        state.dirty_end_date = normalized_end if state.dirty_end_date is None else max(state.dirty_end_date, normalized_end)
    db.session.flush()
    return True


def mark_business_payloads_dirty(
    business_id: int,
    affected_dates: list[date] | tuple[date, ...] | set[date] | None = None,
    *,
    namespaces: tuple[str, ...] = (SUMMARY_CACHE_NAMESPACE, DASHBOARD_CACHE_NAMESPACE),
) -> None:
    normalized_dates = sorted({item for item in (affected_dates or []) if item is not None})
    dirty_start_date = normalized_dates[0] if normalized_dates else None
    dirty_end_date = normalized_dates[-1] if normalized_dates else None
    for namespace in namespaces:
        marked = mark_namespace_dirty(
            business_id,
            namespace,
            start_date=dirty_start_date,
            end_date=dirty_end_date,
        )
        if marked:
            enqueue_namespace_refresh(business_id, namespace)


def mark_namespace_rebuilt(
    business_id: int,
    namespace: str,
    *,
    dirty_snapshot: dict | None = None,
) -> None:
    normalized_business_id = int(business_id)
    normalized_namespace = str(namespace or "").strip()
    state = _get_cache_state(normalized_business_id, normalized_namespace)
    if state is None:
        return
    if dirty_snapshot is not None:
        snapshot_last_dirty_at = dirty_snapshot.get("last_dirty_at")
        if bool(state.dirty) and state.last_dirty_at != snapshot_last_dirty_at:
            state.last_rebuilt_at = _utcnow()
            db.session.flush()
            return
    state.dirty = False
    state.dirty_since = None
    state.dirty_start_date = None
    state.dirty_end_date = None
    state.last_rebuilt_at = _utcnow()
    db.session.flush()


def rebuild_namespace_if_dirty(
    business_id: int,
    namespace: str,
    builder,
    *,
    start_date: date | None = None,
    end_date: date | None = None,
) -> tuple[bool, object | None]:
    dirty_snapshot = get_namespace_dirty_snapshot(
        business_id,
        namespace,
        start_date=start_date,
        end_date=end_date,
    )
    if dirty_snapshot is None:
        return False, None

    with acquire_namespace_singleflight(business_id, namespace):
        locked_dirty_snapshot = get_namespace_dirty_snapshot(
            business_id,
            namespace,
            start_date=start_date,
            end_date=end_date,
        )
        if locked_dirty_snapshot is None:
            return False, None

        try:
            payload = builder()
            if namespace != SUMMARY_CACHE_NAMESPACE:
                mark_namespace_rebuilt(
                    business_id,
                    namespace,
                    dirty_snapshot=locked_dirty_snapshot,
                )
            db.session.commit()
            return True, payload
        except Exception:
            db.session.rollback()
            current_app.logger.exception(
                "namespace lazy rebuild failed",
                extra={
                    "business_id": int(business_id),
                    "namespace": str(namespace or "").strip(),
                    "start_date": start_date.isoformat() if start_date else None,
                    "end_date": end_date.isoformat() if end_date else None,
                },
            )
            raise


def _collect_missing_dates(business_id: int, start_date: date, end_date: date) -> list[date]:
    existing_dates = {
        row.summary_date
        for row in SummaryDailyAggregate.query.with_entities(SummaryDailyAggregate.summary_date).filter(
            SummaryDailyAggregate.business_id == business_id,
            SummaryDailyAggregate.summary_date >= start_date,
            SummaryDailyAggregate.summary_date <= end_date,
        ).all()
    }
    return [target_date for target_date in _date_range(start_date, end_date) if target_date not in existing_dates]


def _build_daily_metrics(business_id: int, target_date: date) -> dict:
    sales_stats = db.session.query(
        func.sum(Sale.total),
        func.count(Sale.id),
    ).filter(
        Sale.business_id == business_id,
        Sale.sale_date == target_date,
    ).first()

    sales_total = float(sales_stats[0] or 0)
    sales_count = int(sales_stats[1] or 0)

    total_cost = 0.0
    try:
        total_cost_query = db.session.query(func.sum(Sale.total_cost)).filter(
            Sale.business_id == business_id,
            Sale.sale_date == target_date,
        ).scalar()
        if total_cost_query is not None and float(total_cost_query or 0) > 0:
            total_cost = float(total_cost_query or 0)
        else:
            sales_items = db.session.query(Sale.items).filter(
                Sale.business_id == business_id,
                Sale.sale_date == target_date,
                (Sale.total_cost == 0) | (Sale.total_cost == None),
            ).all()
            if sales_items:
                product_ids = set()
                for (items_json,) in sales_items:
                    if not items_json:
                        continue
                    for item in items_json:
                        product_id = item.get("product_id")
                        if product_id:
                            product_ids.add(product_id)
                products_map = {}
                if product_ids:
                    products = Product.query.filter(Product.id.in_(product_ids)).all()
                    products_map = {product.id: product for product in products}
                for (items_json,) in sales_items:
                    if not items_json:
                        continue
                    for item in items_json:
                        product_id = item.get("product_id")
                        if product_id and product_id in products_map:
                            product = products_map[product_id]
                            if product.cost:
                                qty = float(item.get("qty", 1) or 1)
                                total_cost += float(product.cost or 0) * qty
    except Exception:
        current_app.logger.exception(
            "summary aggregate cost fallback failed",
            extra={"business_id": business_id, "summary_date": target_date.isoformat()},
        )

    expenses_stats = db.session.query(
        func.sum(Expense.amount),
        func.count(Expense.id),
    ).filter(
        Expense.business_id == business_id,
        Expense.expense_date == target_date,
    ).first()
    expenses_total = float((expenses_stats or (0, 0))[0] or 0)
    expenses_count = int((expenses_stats or (0, 0))[1] or 0)

    payments_total = float(
        db.session.query(func.sum(Payment.amount)).filter(
            Payment.business_id == business_id,
            Payment.payment_date == target_date,
        ).scalar()
        or 0
    )

    cash_sales_total = 0.0
    cash_sales_cost = 0.0
    try:
        initial_cash_events = list_sale_initial_cash_events(
            business_id=business_id,
            start_date=target_date,
            end_date=target_date,
        )
        cash_sales_total = float(sum(float(item.get("amount") or 0) for item in initial_cash_events))
        cash_sales_cost = float(sum(float(item.get("realized_cost") or 0) for item in initial_cash_events))
    except Exception:
        current_app.logger.exception(
            "summary aggregate initial sale cash events failed",
            extra={"business_id": business_id, "summary_date": target_date.isoformat()},
        )

    payments_realized_cost = 0.0
    try:
        payments_with_sales = db.session.query(Payment, Sale).join(
            Sale,
            Payment.sale_id == Sale.id,
        ).filter(
            Payment.business_id == business_id,
            Payment.payment_date == target_date,
        ).all()
        for payment, sale in payments_with_sales:
            sale_total = float(sale.total or 0)
            if sale_total <= 0:
                continue
            sale_cost = float(sale.total_cost or 0)
            payments_realized_cost += float(payment.amount or 0) * (sale_cost / sale_total)
    except Exception:
        current_app.logger.exception(
            "summary aggregate payments realized cost failed",
            extra={"business_id": business_id, "summary_date": target_date.isoformat()},
        )

    return {
        "sales_total": _normalize_numeric(sales_total),
        "sales_count": sales_count,
        "total_cost": _normalize_numeric(total_cost),
        "expenses_total": _normalize_numeric(expenses_total),
        "expenses_count": expenses_count,
        "payments_total": _normalize_numeric(payments_total),
        "cash_sales_total": _normalize_numeric(cash_sales_total),
        "cash_sales_cost": _normalize_numeric(cash_sales_cost),
        "payments_realized_cost": _normalize_numeric(payments_realized_cost),
    }


def refresh_summary_aggregate_for_dates(business_id: int, dates: list[date] | tuple[date, ...] | set[date]) -> None:
    normalized_dates = sorted({item for item in dates if item is not None})
    if not normalized_dates:
        return

    existing_rows = SummaryDailyAggregate.query.filter(
        SummaryDailyAggregate.business_id == business_id,
        SummaryDailyAggregate.summary_date.in_(normalized_dates),
    ).all()
    rows_by_date = {row.summary_date: row for row in existing_rows}

    for target_date in normalized_dates:
        metrics = _build_daily_metrics(business_id, target_date)
        row = rows_by_date.get(target_date)
        if row is None:
            row = SummaryDailyAggregate(
                business_id=business_id,
                summary_date=target_date,
            )
            db.session.add(row)
            rows_by_date[target_date] = row
        row.sales_total = metrics["sales_total"]
        row.sales_count = metrics["sales_count"]
        row.total_cost = metrics["total_cost"]
        row.expenses_total = metrics["expenses_total"]
        row.expenses_count = metrics["expenses_count"]
        row.payments_total = metrics["payments_total"]
        row.cash_sales_total = metrics["cash_sales_total"]
        row.cash_sales_cost = metrics["cash_sales_cost"]
        row.payments_realized_cost = metrics["payments_realized_cost"]

    db.session.flush()


def increment_summary_aggregate_metrics(
    business_id: int,
    target_date: date,
    *,
    sales_total: float = 0.0,
    sales_count: int = 0,
    total_cost: float = 0.0,
    expenses_total: float = 0.0,
    expenses_count: int = 0,
    payments_total: float = 0.0,
    cash_sales_total: float = 0.0,
    cash_sales_cost: float = 0.0,
    payments_realized_cost: float = 0.0,
) -> None:
    normalized_metrics = {
        "sales_total": _normalize_numeric(sales_total),
        "sales_count": int(sales_count or 0),
        "total_cost": _normalize_numeric(total_cost),
        "expenses_total": _normalize_numeric(expenses_total),
        "expenses_count": int(expenses_count or 0),
        "payments_total": _normalize_numeric(payments_total),
        "cash_sales_total": _normalize_numeric(cash_sales_total),
        "cash_sales_cost": _normalize_numeric(cash_sales_cost),
        "payments_realized_cost": _normalize_numeric(payments_realized_cost),
    }
    if not any(normalized_metrics.values()):
        return

    bind = db.session.get_bind()
    dialect_name = getattr(getattr(bind, "dialect", None), "name", "") if bind is not None else ""
    if dialect_name == "postgresql":
        insert_stmt = pg_insert(SummaryDailyAggregate).values(
            business_id=business_id,
            summary_date=target_date,
            **normalized_metrics,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        update_values = {
            field_name: getattr(SummaryDailyAggregate.__table__.c, field_name) + field_value
            for field_name, field_value in normalized_metrics.items()
        }
        update_values["updated_at"] = datetime.utcnow()
        db.session.execute(
            insert_stmt.on_conflict_do_update(
                index_elements=["business_id", "summary_date"],
                set_=update_values,
            )
        )
        return

    row = SummaryDailyAggregate.query.filter(
        SummaryDailyAggregate.business_id == business_id,
        SummaryDailyAggregate.summary_date == target_date,
    ).first()
    if row is None:
        pending_row = SummaryDailyAggregate(
            business_id=business_id,
            summary_date=target_date,
        )
        try:
            with db.session.begin_nested():
                db.session.add(pending_row)
                db.session.flush()
            row = pending_row
        except IntegrityError:
            row = SummaryDailyAggregate.query.filter(
                SummaryDailyAggregate.business_id == business_id,
                SummaryDailyAggregate.summary_date == target_date,
            ).first()

    if row is None:
        return

    row.sales_total = _normalize_numeric(float(row.sales_total or 0) + normalized_metrics["sales_total"])
    row.sales_count = int(row.sales_count or 0) + normalized_metrics["sales_count"]
    row.total_cost = _normalize_numeric(float(row.total_cost or 0) + normalized_metrics["total_cost"])
    row.expenses_total = _normalize_numeric(float(row.expenses_total or 0) + normalized_metrics["expenses_total"])
    row.expenses_count = int(row.expenses_count or 0) + normalized_metrics["expenses_count"]
    row.payments_total = _normalize_numeric(float(row.payments_total or 0) + normalized_metrics["payments_total"])
    row.cash_sales_total = _normalize_numeric(float(row.cash_sales_total or 0) + normalized_metrics["cash_sales_total"])
    row.cash_sales_cost = _normalize_numeric(float(row.cash_sales_cost or 0) + normalized_metrics["cash_sales_cost"])
    row.payments_realized_cost = _normalize_numeric(
        float(row.payments_realized_cost or 0) + normalized_metrics["payments_realized_cost"]
    )


def record_sale_summary_aggregate(
    business_id: int,
    target_date: date,
    *,
    sale_total: float,
    sale_cost: float,
    payment_method: str | None,
) -> None:
    normalized_payment_method = str(payment_method or "").strip().lower()
    is_cash_sale = normalized_payment_method == "cash"
    increment_summary_aggregate_metrics(
        business_id,
        target_date,
        sales_total=sale_total,
        sales_count=1,
        total_cost=sale_cost,
        cash_sales_total=sale_total if is_cash_sale else 0.0,
        cash_sales_cost=sale_cost if is_cash_sale else 0.0,
    )


def record_payment_summary_aggregate(
    business_id: int,
    target_date: date,
    *,
    payment_amount: float,
    sale_total: float = 0.0,
    sale_cost: float = 0.0,
    realized_cost: float | None = None,
) -> None:
    computed_realized_cost = realized_cost
    if computed_realized_cost is None:
        computed_realized_cost = 0.0
        if float(sale_total or 0) > 0 and float(sale_cost or 0) > 0:
            computed_realized_cost = float(payment_amount or 0) * (float(sale_cost or 0) / float(sale_total or 0))
    increment_summary_aggregate_metrics(
        business_id,
        target_date,
        payments_total=payment_amount,
        payments_realized_cost=computed_realized_cost,
    )


def record_expense_summary_aggregate(
    business_id: int,
    target_date: date,
    *,
    expense_amount: float,
) -> None:
    increment_summary_aggregate_metrics(
        business_id,
        target_date,
        expenses_total=expense_amount,
        expenses_count=1,
    )


def ensure_summary_aggregate_range_materialized(business_id: int, start_date: date, end_date: date, *, mark_rebuilt: bool = False) -> None:
    dirty_snapshot = get_namespace_dirty_snapshot(
        business_id,
        SUMMARY_CACHE_NAMESPACE,
        start_date=start_date,
        end_date=end_date,
    )
    dates_to_refresh = set(_collect_missing_dates(business_id, start_date, end_date))
    if dirty_snapshot is not None:
        dirty_start_date = dirty_snapshot.get("dirty_start_date") or start_date
        dirty_end_date = dirty_snapshot.get("dirty_end_date") or end_date
        for target_date in _date_range(dirty_start_date, dirty_end_date):
            dates_to_refresh.add(target_date)
    if dates_to_refresh:
        refresh_summary_aggregate_for_dates(business_id, sorted(dates_to_refresh))
    if dirty_snapshot is not None and mark_rebuilt:
        mark_namespace_rebuilt(
            business_id,
            SUMMARY_CACHE_NAMESPACE,
            dirty_snapshot=dirty_snapshot,
        )


def compute_summary_payload_direct(business_id: int, start_date: date, end_date: date) -> dict:
    metrics = {
        "sales_total": 0.0,
        "sales_count": 0,
        "total_cost": 0.0,
        "expenses_total": 0.0,
        "expenses_count": 0,
        "payments_total": 0.0,
        "cash_sales_total": 0.0,
        "cash_sales_cost": 0.0,
        "payments_realized_cost": 0.0,
    }
    for target_date in _date_range(start_date, end_date):
        daily_metrics = _build_daily_metrics(business_id, target_date)
        metrics["sales_total"] += daily_metrics["sales_total"]
        metrics["sales_count"] += daily_metrics["sales_count"]
        metrics["total_cost"] += daily_metrics["total_cost"]
        metrics["expenses_total"] += daily_metrics["expenses_total"]
        metrics["expenses_count"] += daily_metrics["expenses_count"]
        metrics["payments_total"] += daily_metrics["payments_total"]
        metrics["cash_sales_total"] += daily_metrics["cash_sales_total"]
        metrics["cash_sales_cost"] += daily_metrics["cash_sales_cost"]
        metrics["payments_realized_cost"] += daily_metrics["payments_realized_cost"]
    accounts_receivable = float(
        db.session.query(func.sum(Sale.balance)).filter(
            Sale.business_id == business_id,
            Sale.balance > 0,
        ).scalar()
        or 0
    )
    cash_in = float(metrics["cash_sales_total"]) + float(metrics["payments_total"])
    cash_out = float(metrics["expenses_total"])
    total_realized_cost = float(metrics["cash_sales_cost"]) + float(metrics["payments_realized_cost"])
    cash_net = cash_in - cash_out - total_realized_cost
    return {
        "period": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
        },
        "sales": {
            "count": int(metrics["sales_count"]),
            "total": _normalize_numeric(metrics["sales_total"]),
        },
        "expenses": {
            "count": int(metrics["expenses_count"]),
            "total": _normalize_numeric(metrics["expenses_total"]),
        },
        "profit": {
            "gross": _normalize_numeric(float(metrics["sales_total"]) - float(metrics["total_cost"])),
            "net": _normalize_numeric(float(metrics["sales_total"]) - float(metrics["total_cost"]) - float(metrics["expenses_total"])),
        },
        "cash_flow": {
            "in": _normalize_numeric(cash_in),
            "out": _normalize_numeric(cash_out),
            "net": _normalize_numeric(cash_net),
        },
        "accounts_receivable": _normalize_numeric(accounts_receivable),
    }


def build_summary_payload_from_daily_aggregate(business_id: int, start_date: date, end_date: date, *, mark_rebuilt: bool = False) -> dict:
    try:
        ensure_summary_aggregate_range_materialized(business_id, start_date, end_date, mark_rebuilt=mark_rebuilt)
        aggregate = db.session.query(
            func.coalesce(func.sum(SummaryDailyAggregate.sales_total), 0),
            func.coalesce(func.sum(SummaryDailyAggregate.sales_count), 0),
            func.coalesce(func.sum(SummaryDailyAggregate.total_cost), 0),
            func.coalesce(func.sum(SummaryDailyAggregate.expenses_total), 0),
            func.coalesce(func.sum(SummaryDailyAggregate.expenses_count), 0),
            func.coalesce(func.sum(SummaryDailyAggregate.payments_total), 0),
            func.coalesce(func.sum(SummaryDailyAggregate.cash_sales_total), 0),
            func.coalesce(func.sum(SummaryDailyAggregate.cash_sales_cost), 0),
            func.coalesce(func.sum(SummaryDailyAggregate.payments_realized_cost), 0),
        ).filter(
            SummaryDailyAggregate.business_id == business_id,
            SummaryDailyAggregate.summary_date >= start_date,
            SummaryDailyAggregate.summary_date <= end_date,
        ).first()

        accounts_receivable = float(
            db.session.query(func.sum(Sale.balance)).filter(
                Sale.business_id == business_id,
                Sale.balance > 0,
            ).scalar()
            or 0
        )

        sales_total = float((aggregate or (0,) * 9)[0] or 0)
        sales_count = int((aggregate or (0,) * 9)[1] or 0)
        total_cost = float((aggregate or (0,) * 9)[2] or 0)
        expenses_total = float((aggregate or (0,) * 9)[3] or 0)
        expenses_count = int((aggregate or (0,) * 9)[4] or 0)
        payments_total = float((aggregate or (0,) * 9)[5] or 0)
        cash_sales_total = float((aggregate or (0,) * 9)[6] or 0)
        cash_sales_cost = float((aggregate or (0,) * 9)[7] or 0)
        payments_realized_cost = float((aggregate or (0,) * 9)[8] or 0)

        cash_in = cash_sales_total + payments_total
        cash_out = expenses_total
        total_realized_cost = cash_sales_cost + payments_realized_cost
        cash_net = cash_in - cash_out - total_realized_cost

        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
            },
            "sales": {
                "count": sales_count,
                "total": _normalize_numeric(sales_total),
            },
            "expenses": {
                "count": expenses_count,
                "total": _normalize_numeric(expenses_total),
            },
            "profit": {
                "gross": _normalize_numeric(sales_total - total_cost),
                "net": _normalize_numeric(sales_total - total_cost - expenses_total),
            },
            "cash_flow": {
                "in": _normalize_numeric(cash_in),
                "out": _normalize_numeric(cash_out),
                "net": _normalize_numeric(cash_net),
            },
            "accounts_receivable": _normalize_numeric(accounts_receivable),
        }
    except Exception:
        current_app.logger.exception(
            "summary aggregate composition failed; falling back to direct computation",
            extra={
                "business_id": business_id,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
            },
        )
        return compute_summary_payload_direct(business_id, start_date, end_date)
