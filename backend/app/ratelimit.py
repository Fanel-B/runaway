import threading
import time
from collections import deque


class RateLimited(Exception):
    def __init__(self, scope: str, retry_after: int):
        super().__init__(scope)
        self.scope = scope
        self.retry_after = retry_after


class SlidingWindowLimiter:
    """In-memory sliding window, per client and global.

    Kept in the process: it resets on restart and is not shared between
    several workers. That is enough for one instance; several instances
    would need a shared store (Redis, database).
    """

    def __init__(self, per_key: int, global_limit: int, window_seconds: int, clock=time.monotonic):
        self.per_key = per_key
        self.global_limit = global_limit
        self.window = window_seconds
        self.clock = clock
        self._hits: dict[str, deque[float]] = {}
        self._all: deque[float] = deque()
        self._lock = threading.Lock()

    def _prune(self, hits: deque[float], now: float) -> None:
        while hits and hits[0] <= now - self.window:
            hits.popleft()

    def acquire(self, key: str):
        """Reserve one slot or raise RateLimited. Returns a function that gives the slot back."""
        with self._lock:
            now = self.clock()
            self._prune(self._all, now)
            hits = self._hits.setdefault(key, deque())
            self._prune(hits, now)
            if len(hits) >= self.per_key:
                raise RateLimited("client", self._retry_after(hits, now))
            if len(self._all) >= self.global_limit:
                raise RateLimited("global", self._retry_after(self._all, now))
            hits.append(now)
            self._all.append(now)
            self._forget_idle(now)

        def release() -> None:
            with self._lock:
                for queue in (self._hits.get(key), self._all):
                    if queue and now in queue:
                        queue.remove(now)
        return release

    def _retry_after(self, hits: deque[float], now: float) -> int:
        return max(1, int(hits[0] + self.window - now) + 1)

    def _forget_idle(self, now: float) -> None:
        # Clients whose window is over are forgotten at the next creation (or on restart).
        for key in [k for k, v in self._hits.items() if not v or v[-1] <= now - self.window]:
            del self._hits[key]
