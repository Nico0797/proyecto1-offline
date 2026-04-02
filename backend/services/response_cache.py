import threading
import time
import hashlib
import json
import uuid
from typing import Any, Callable

try:
    import redis
except Exception:
    redis = None


class LocalTTLCache:
    def __init__(self):
        self._entries: dict[tuple[str, Any], tuple[float, Any]] = {}
        self._inflight: dict[tuple[str, Any], threading.Event] = {}
        self._generations: dict[tuple[str, Any], int] = {}
        self._lock = threading.RLock()

    def get(self, namespace: str, key: Any) -> Any:
        composite_key = (namespace, key)
        now = time.monotonic()
        with self._lock:
            entry = self._entries.get(composite_key)
            if entry is None:
                return None
            expires_at, value = entry
            if expires_at <= now:
                self._entries.pop(composite_key, None)
                return None
            return value

    def set(self, namespace: str, key: Any, value: Any, ttl_seconds: float) -> None:
        ttl = max(float(ttl_seconds or 0), 0.0)
        if ttl <= 0:
            return
        composite_key = (namespace, key)
        expires_at = time.monotonic() + ttl
        with self._lock:
            self._entries[composite_key] = (expires_at, value)

    def get_or_set(self, namespace: str, key: Any, ttl_seconds: float, builder: Callable[[], Any]) -> tuple[Any, bool]:
        ttl = max(float(ttl_seconds or 0), 0.0)
        composite_key = (namespace, key)
        build_event = None
        build_generation = 0
        while True:
            now = time.monotonic()
            with self._lock:
                entry = self._entries.get(composite_key)
                if entry is not None:
                    expires_at, value = entry
                    if expires_at > now:
                        return value, True
                    self._entries.pop(composite_key, None)
                inflight_event = self._inflight.get(composite_key)
                if inflight_event is None:
                    build_event = threading.Event()
                    self._inflight[composite_key] = build_event
                    build_generation = self._generations.get(composite_key, 0)
                    break
            inflight_event.wait()

        try:
            value = builder()
            if ttl > 0:
                expires_at = time.monotonic() + ttl
                with self._lock:
                    current_generation = self._generations.get(composite_key, 0)
                    if current_generation == build_generation:
                        self._entries[composite_key] = (expires_at, value)
            return value, False
        finally:
            with self._lock:
                if build_event is not None and self._inflight.get(composite_key) is build_event:
                    self._inflight.pop(composite_key, None)
                    build_event.set()

    def invalidate_namespace(self, namespace: str, predicate: Callable[[Any], bool] | None = None) -> None:
        with self._lock:
            keys_to_delete = []
            candidate_keys = set(self._entries.keys()) | set(self._inflight.keys()) | set(self._generations.keys())
            for cached_namespace, cache_key in candidate_keys:
                if cached_namespace != namespace:
                    continue
                if predicate is not None and not predicate(cache_key):
                    continue
                keys_to_delete.append((cached_namespace, cache_key))
            for composite_key in keys_to_delete:
                self._entries.pop(composite_key, None)
                self._generations[composite_key] = self._generations.get(composite_key, 0) + 1

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()
            self._generations.clear()


class SharedResponseCache:
    def __init__(self, redis_url: str, *, prefix: str = "cuaderno"):
        self.prefix = str(prefix or "cuaderno").strip() or "cuaderno"
        self.redis_url = str(redis_url or "").strip()
        self._redis = None
        if self.redis_url and redis is not None:
            self._redis = redis.Redis.from_url(self.redis_url, decode_responses=True)

    @property
    def enabled(self) -> bool:
        return self._redis is not None

    def ping(self) -> bool:
        if not self.enabled:
            return False
        try:
            return bool(self._redis.ping())
        except Exception:
            return False

    def _normalize_key(self, key: Any) -> str:
        return json.dumps(key, separators=(",", ":"), sort_keys=True, ensure_ascii=False, default=str)

    def _deserialize_key(self, value: str) -> Any:
        return json.loads(value)

    def _snapshot_digest(self, namespace: str, key: Any) -> str:
        normalized = f"{namespace}:{self._normalize_key(key)}"
        return hashlib.sha1(normalized.encode("utf-8")).hexdigest()

    def _snapshot_key(self, namespace: str, key: Any) -> str:
        return f"{self.prefix}:snapshot:{namespace}:{self._snapshot_digest(namespace, key)}"

    def _snapshot_index_key(self, namespace: str, business_id: int) -> str:
        return f"{self.prefix}:snapshot-index:{namespace}:{int(business_id)}"

    def _lock_key(self, name: str) -> str:
        return f"{self.prefix}:lock:{name}"

    def _queue_key(self) -> str:
        return f"{self.prefix}:refresh-queue"

    def _dedupe_key(self, job_id: str) -> str:
        return f"{self.prefix}:refresh-dedupe:{job_id}"

    def get_snapshot(self, namespace: str, key: Any) -> dict[str, Any] | None:
        if not self.enabled:
            return None
        try:
            raw_value = self._redis.get(self._snapshot_key(namespace, key))
            if not raw_value:
                return None
            payload = json.loads(raw_value)
            if not isinstance(payload, dict):
                return None
            return payload
        except Exception:
            return None

    def set_snapshot(
        self,
        namespace: str,
        business_id: int,
        key: Any,
        payload: Any,
        *,
        fresh_ttl_seconds: float,
        stale_ttl_seconds: float,
        metadata: dict[str, Any] | None = None,
    ) -> bool:
        if not self.enabled:
            return False
        fresh_ttl = max(int(float(fresh_ttl_seconds or 0)), 1)
        stale_ttl = max(int(float(stale_ttl_seconds or 0)), fresh_ttl)
        now = time.time()
        snapshot_payload = {
            "namespace": str(namespace or "").strip(),
            "business_id": int(business_id),
            "cache_key": key,
            "payload": payload,
            "stored_at_epoch": now,
            "fresh_until_epoch": now + fresh_ttl,
            "stale_until_epoch": now + stale_ttl,
        }
        if metadata:
            snapshot_payload.update(metadata)
        try:
            serialized_key = self._normalize_key(key)
            pipe = self._redis.pipeline()
            pipe.set(
                self._snapshot_key(namespace, key),
                json.dumps(snapshot_payload, separators=(",", ":"), ensure_ascii=False, default=str),
                ex=stale_ttl,
            )
            pipe.sadd(self._snapshot_index_key(namespace, business_id), serialized_key)
            pipe.execute()
            return True
        except Exception:
            return False

    def list_snapshot_keys(self, namespace: str, business_id: int) -> list[Any]:
        if not self.enabled:
            return []
        try:
            members = self._redis.smembers(self._snapshot_index_key(namespace, business_id)) or []
            return [self._deserialize_key(item) for item in members]
        except Exception:
            return []

    def enqueue_refresh(self, job: dict[str, Any], *, dedupe_ttl_seconds: float = 15.0) -> bool:
        if not self.enabled:
            return False
        serialized_job = json.dumps(job, separators=(",", ":"), ensure_ascii=False, sort_keys=True, default=str)
        job_id = hashlib.sha1(serialized_job.encode("utf-8")).hexdigest()
        try:
            created = self._redis.set(self._dedupe_key(job_id), "1", ex=max(int(float(dedupe_ttl_seconds or 0)), 1), nx=True)
            if not created:
                return False
            payload = dict(job)
            payload["job_id"] = job_id
            self._redis.lpush(self._queue_key(), json.dumps(payload, separators=(",", ":"), ensure_ascii=False, default=str))
            return True
        except Exception:
            return False

    def dequeue_refresh(self, timeout_seconds: float = 5.0) -> dict[str, Any] | None:
        if not self.enabled:
            return None
        try:
            result = self._redis.brpop(self._queue_key(), timeout=max(int(float(timeout_seconds or 0)), 1))
            if not result:
                return None
            _, raw_payload = result
            payload = json.loads(raw_payload)
            return payload if isinstance(payload, dict) else None
        except Exception:
            return None

    def acquire_lock(self, name: str, *, ttl_seconds: float = 30.0, token: str | None = None) -> str | None:
        if not self.enabled:
            return None
        normalized_token = token or uuid.uuid4().hex
        try:
            acquired = self._redis.set(
                self._lock_key(name),
                normalized_token,
                ex=max(int(float(ttl_seconds or 0)), 1),
                nx=True,
            )
            return normalized_token if acquired else None
        except Exception:
            return None

    def release_lock(self, name: str, token: str | None) -> bool:
        if not self.enabled or not token:
            return False
        try:
            result = self._redis.eval(
                "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
                1,
                self._lock_key(name),
                token,
            )
            return bool(result)
        except Exception:
            return False

    def wait_for_snapshot(self, namespace: str, key: Any, *, timeout_seconds: float = 5.0, poll_interval_seconds: float = 0.1) -> dict[str, Any] | None:
        deadline = time.monotonic() + max(float(timeout_seconds or 0), 0.0)
        while time.monotonic() < deadline:
            snapshot = self.get_snapshot(namespace, key)
            if snapshot is not None:
                return snapshot
            time.sleep(max(float(poll_interval_seconds or 0), 0.01))
        return None
