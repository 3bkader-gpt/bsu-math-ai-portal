"""Local NVMe LRU Disk Cache for Telegram media and compiled Typst PDFs."""

from __future__ import annotations

import asyncio
import logging
import os
import time
import uuid
from pathlib import Path
from typing import AsyncGenerator, Callable

from app.config import settings

logger = logging.getLogger("media_cache")

DEFAULT_MEDIA_CACHE_MAX_BYTES = 15 * 1024 * 1024 * 1024  # 15 GB
DEFAULT_PDF_CACHE_MAX_BYTES = 1 * 1024 * 1024 * 1024     # 1 GB
STALE_PART_MAX_AGE_SECONDS = 7200                        # 2 hours


def _parse_int_env(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        val = int(raw)
        return val if val > 0 else default
    except ValueError:
        return default


def resolve_cache_dir(env_var: str, linux_default: str, fallback: Path) -> Path:
    """Resolves a writable cache directory from env override, Linux system path, or app fallback."""
    override = os.getenv(env_var, "").strip()
    if override:
        target = Path(override)
        target.mkdir(parents=True, exist_ok=True)
        return target

    if os.name != "nt":
        linux_path = Path(linux_default)
        try:
            linux_path.mkdir(parents=True, exist_ok=True)
            if os.access(linux_path, os.W_OK):
                return linux_path
        except OSError:
            pass

    fallback.mkdir(parents=True, exist_ok=True)
    return fallback


class DiskLRUCache:
    """Bounded local disk cache with atomic writes, single-flight background fill, and LRU eviction."""

    def __init__(
        self,
        env_var: str,
        linux_default: str,
        fallback_subdir: str,
        max_bytes_env: str,
        default_max_bytes: int,
    ):
        self.env_var = env_var
        self.linux_default = linux_default
        self.fallback_subdir = fallback_subdir
        self.max_bytes_env = max_bytes_env
        self.default_max_bytes = default_max_bytes
        self._inflight_tasks: dict[str, asyncio.Task] = {}
        self._active_part_keys: set[str] = set()
        self._evict_lock = asyncio.Lock()

    @property
    def base_dir(self) -> Path:
        return resolve_cache_dir(
            self.env_var,
            self.linux_default,
            settings.MEDIA_DIR / self.fallback_subdir,
        )

    @property
    def max_bytes(self) -> int:
        return _parse_int_env(self.max_bytes_env, self.default_max_bytes)

    def _safe_key(self, key: str) -> str:
        # Prevent directory traversal in cache keys.
        return Path(key).name

    def path_for(self, key: str) -> Path:
        return self.base_dir / self._safe_key(key)

    def get_cached_file(self, key: str, expected_size: int | None = None) -> Path | None:
        """Returns cached path on hit (updating mtime for LRU), or None on miss/corruption."""
        safe = self._safe_key(key)
        target = self.path_for(safe)
        if not target.is_file():
            return None

        try:
            size = target.stat().st_size
        except OSError:
            return None

        if size <= 0 or (expected_size is not None and size != expected_size):
            logger.warning(
                "Invalid cache entry %s (actual=%s expected=%s), removing",
                target,
                size,
                expected_size,
            )
            try:
                target.unlink(missing_ok=True)
            except OSError:
                pass
            return None

        try:
            os.utime(target, None)
        except OSError:
            pass
        return target

    def put_bytes_atomic(self, key: str, data: bytes, prefix_cleanup: str | None = None) -> Path:
        """Atomically writes bytes to cache, optionally removes stale versions with the same prefix, and evicts LRU."""
        safe = self._safe_key(key)
        cache_dir = self.base_dir
        target = cache_dir / safe
        part_path = cache_dir / f".{safe}.{uuid.uuid4().hex}.part"

        try:
            with open(part_path, "wb") as f:
                f.write(data)
                f.flush()
            os.replace(part_path, target)
        finally:
            if part_path.exists():
                part_path.unlink(missing_ok=True)

        if prefix_cleanup:
            for existing in cache_dir.iterdir():
                if existing.name == safe or existing.name.startswith("."):
                    continue
                if existing.name.startswith(prefix_cleanup) and existing.is_file():
                    try:
                        existing.unlink(missing_ok=True)
                    except OSError:
                        pass

        self.evict_lru_sync(exclude={safe})
        return target

    def evict_lru_sync(self, exclude: set[str] | None = None) -> None:
        """Enforces max_bytes cap by deleting least-recently-used files and cleaning stale .part files."""
        cache_dir = self.base_dir
        limit = self.max_bytes
        protected = exclude or set()
        now = time.time()

        entries: list[tuple[float, int, Path]] = []
        total_size = 0

        try:
            items = list(cache_dir.iterdir())
        except OSError:
            return

        for entry in items:
            if not entry.is_file():
                continue
            if entry.name.startswith(".") and ".part" in entry.name:
                try:
                    if now - entry.stat().st_mtime > STALE_PART_MAX_AGE_SECONDS:
                        entry.unlink(missing_ok=True)
                except OSError:
                    pass
                continue
            if entry.name.startswith("."):
                continue
            try:
                st = entry.stat()
            except OSError:
                continue
            entries.append((st.st_mtime, st.st_size, entry))
            total_size += st.st_size

        if total_size <= limit:
            return

        # Oldest mtime first.
        entries.sort(key=lambda item: item[0])
        for _, file_size, path in entries:
            if total_size <= limit:
                break
            if path.name in protected:
                continue
            try:
                path.unlink(missing_ok=True)
                total_size -= file_size
                logger.info("LRU cache evicted %s (%d bytes freed)", path.name, file_size)
            except OSError as exc:
                logger.warning("Failed to evict %s: %s", path, exc)

    async def tee_stream(
        self,
        key: str,
        expected_size: int,
        source_gen: AsyncGenerator[bytes, None],
    ) -> AsyncGenerator[bytes, None]:
        """Yields chunks from source_gen while atomically caching complete downloads on disk."""
        safe = self._safe_key(key)
        cache_dir = self.base_dir
        target = cache_dir / safe

        should_record = safe not in self._active_part_keys and not target.exists()
        part_path: Path | None = None
        fp = None
        written = 0
        completed = False

        if should_record:
            self._active_part_keys.add(safe)
            part_path = cache_dir / f".{safe}.{uuid.uuid4().hex}.part"
            try:
                fp = open(part_path, "wb")
            except OSError as exc:
                logger.warning("Unable to open temp cache file %s: %s", part_path, exc)
                self._active_part_keys.discard(safe)
                part_path = None
                fp = None

        try:
            async for chunk in source_gen:
                if fp is not None:
                    fp.write(chunk)
                    written += len(chunk)
                yield chunk
            completed = True
        finally:
            if hasattr(source_gen, "aclose"):
                try:
                    await source_gen.aclose()
                except Exception:
                    pass

            if fp is not None:
                try:
                    fp.flush()
                    fp.close()
                except OSError:
                    pass

            if part_path is not None:
                try:
                    if completed and written == expected_size and expected_size > 0:
                        os.replace(part_path, target)
                        async with self._evict_lock:
                            self.evict_lru_sync(exclude={safe})
                        logger.info("Cached media asset %s (%d bytes)", safe, written)
                    else:
                        part_path.unlink(missing_ok=True)
                except OSError as exc:
                    logger.warning("Cache commit failed for %s: %s", safe, exc)
                    try:
                        part_path.unlink(missing_ok=True)
                    except OSError:
                        pass
                finally:
                    self._active_part_keys.discard(safe)

    def schedule_background_fill(
        self,
        key: str,
        expected_size: int,
        stream_factory: Callable[[], AsyncGenerator[bytes, None]],
        *,
        allow_in_tests: bool = False,
    ) -> asyncio.Task | None:
        """Schedules one deduplicated background download for key (skipped under pytest unless allow_in_tests=True)."""
        if not allow_in_tests and "PYTEST_CURRENT_TEST" in os.environ:
            if os.getenv("MEDIA_CACHE_BACKGROUND_FILL", "").strip() != "1":
                return None

        safe = self._safe_key(key)
        cache_dir = self.base_dir
        inflight_id = f"{cache_dir}:{safe}"

        if self.get_cached_file(safe, expected_size=expected_size) is not None:
            return None

        existing = self._inflight_tasks.get(inflight_id)
        if existing is not None and not existing.done():
            return existing

        async def _runner() -> None:
            if safe in self._active_part_keys:
                return
            self._active_part_keys.add(safe)
            part_path = cache_dir / f".{safe}.{uuid.uuid4().hex}.part"
            target = cache_dir / safe
            written = 0
            gen = None
            try:
                gen = stream_factory()
                with open(part_path, "wb") as f:
                    async for chunk in gen:
                        f.write(chunk)
                        written += len(chunk)
                    f.flush()
                if written == expected_size and expected_size > 0:
                    os.replace(part_path, target)
                    async with self._evict_lock:
                        self.evict_lru_sync(exclude={safe})
                    logger.info("Background-cached %s (%d bytes)", safe, written)
                else:
                    logger.warning(
                        "Background cache incomplete for %s (wrote=%d expected=%d)",
                        safe,
                        written,
                        expected_size,
                    )
            except Exception as exc:
                logger.warning("Background cache fill failed for %s: %s", safe, exc)
            finally:
                if gen is not None and hasattr(gen, "aclose"):
                    try:
                        await gen.aclose()
                    except Exception:
                        pass
                if part_path.exists():
                    try:
                        part_path.unlink(missing_ok=True)
                    except OSError:
                        pass
                self._active_part_keys.discard(safe)
                self._inflight_tasks.pop(inflight_id, None)

        try:
            task = asyncio.create_task(_runner(), name=f"cache-fill-{safe}")
        except RuntimeError:
            return None

        self._inflight_tasks[inflight_id] = task
        return task


media_disk_cache = DiskLRUCache(
    env_var="MEDIA_CACHE_DIR",
    linux_default="/var/cache/bsu-media",
    fallback_subdir="cache",
    max_bytes_env="MEDIA_CACHE_MAX_BYTES",
    default_max_bytes=DEFAULT_MEDIA_CACHE_MAX_BYTES,
)

pdf_disk_cache = DiskLRUCache(
    env_var="PDF_CACHE_DIR",
    linux_default="/var/cache/bsu-pdf",
    fallback_subdir="pdf_cache",
    max_bytes_env="PDF_CACHE_MAX_BYTES",
    default_max_bytes=DEFAULT_PDF_CACHE_MAX_BYTES,
)
