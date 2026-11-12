"""Automated Supabase PostgreSQL backup and weekly telemetry retention script."""

from __future__ import annotations

import argparse
import gzip
import logging
import os
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urlparse

import httpx
from sqlalchemy import text

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.config import settings
from app.db.database import SessionLocal

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("db_backup_and_prune")

DEFAULT_BACKUP_DIR = "/var/backups/bsu-db"
PRUNE_BATCH_SIZE = 5000


def resolve_backup_dir(override: str | None = None) -> Path:
    if override:
        path = Path(override)
        path.mkdir(parents=True, exist_ok=True)
        return path
    env_dir = os.getenv("DB_BACKUP_DIR", "").strip()
    if env_dir:
        path = Path(env_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path
    if os.name != "nt":
        linux_dir = Path(DEFAULT_BACKUP_DIR)
        linux_dir.mkdir(parents=True, exist_ok=True)
        return linux_dir
    fallback = settings.MEDIA_DIR / "db_backups"
    fallback.mkdir(parents=True, exist_ok=True)
    return fallback


def find_pg_dump_binary() -> str:
    """Finds pg_dump binary, preferring PostgreSQL 17+ to match Supabase PG 17."""
    for candidate in (
        shutil.which("pg_dump"),
        "/usr/lib/postgresql/17/bin/pg_dump",
        "/usr/bin/pg_dump",
    ):
        if candidate and Path(candidate).is_file():
            return candidate
    raise FileNotFoundError("pg_dump not found. Install postgresql-client-17 first.")


def build_pg_dump_env_and_args(database_url: str) -> tuple[list[str], dict[str, str]]:
    """Extracts pg_dump connection flags while keeping the DB password in PGPASSWORD env only."""
    normalized = database_url.strip()
    for prefix in ("postgresql+psycopg2://", "postgresql+asyncpg://", "postgres://"):
        if normalized.startswith(prefix):
            normalized = "postgresql://" + normalized[len(prefix):]
            break

    parsed = urlparse(normalized)
    if parsed.scheme != "postgresql" or not parsed.hostname:
        raise ValueError(f"Backup requires a PostgreSQL DATABASE_URL (got scheme={parsed.scheme!r})")

    dbname = (parsed.path or "/postgres").lstrip("/") or "postgres"
    args = [
        find_pg_dump_binary(),
        "--host",
        parsed.hostname,
        "--port",
        str(parsed.port or 5432),
        "--username",
        unquote(parsed.username or "postgres"),
        "--dbname",
        dbname,
        "--schema=public",
        "--no-owner",
        "--no-acl",
        "--no-privileges",
        "--format=plain",
    ]

    env = os.environ.copy()
    if parsed.password:
        env["PGPASSWORD"] = unquote(parsed.password)
    env.setdefault("PGSSLMODE", "require")
    env.setdefault("PGCONNECT_TIMEOUT", "15")
    return args, env


def verify_gzip_nonempty(gz_path: Path) -> int:
    """Verifies gzip stream integrity and returns decompressed byte count."""
    total_uncompressed = 0
    with gzip.open(gz_path, "rb") as gz:
        while True:
            chunk = gz.read(65536)
            if not chunk:
                break
            total_uncompressed += len(chunk)
    if total_uncompressed <= 0:
        raise RuntimeError(f"Backup archive {gz_path} decompressed to 0 bytes")
    return total_uncompressed


def prune_old_local_backups(backup_dir: Path, retain_days: int = 14, min_keep: int = 3) -> int:
    """Removes local bsu_math_*.sql.gz files older than retain_days while keeping at least min_keep newest backups."""
    backups = sorted(
        (p for p in backup_dir.glob("bsu_math_*.sql.gz") if p.is_file()),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if len(backups) <= min_keep:
        return 0

    cutoff = time.time() - (retain_days * 86400)
    removed = 0
    for old_file in backups[min_keep:]:
        if old_file.stat().st_mtime < cutoff:
            old_file.unlink(missing_ok=True)
            removed += 1
            logger.info("Removed expired local backup: %s", old_file.name)
    return removed


def upload_backup_to_telegram(gz_path: Path, raw_bytes: int) -> bool:
    """Uploads compressed DB backup to the private Telegram archive channel if configured."""
    token = settings.TELEGRAM_BOT_TOKEN
    chat_id = os.getenv("TELEGRAM_BACKUP_CHAT_ID", "").strip() or settings.TELEGRAM_CHANNEL_ID
    if not token or not chat_id:
        logger.info("Telegram credentials not configured; skipping remote backup upload")
        return False

    url = f"https://api.telegram.org/bot{token}/sendDocument"
    gz_kb = gz_path.stat().st_size / 1024.0
    raw_mb = raw_bytes / (1024.0 * 1024.0)
    caption = (
        f"BSU Math DB Backup ({gz_path.name})\n"
        f"Compressed: {gz_kb:.1f} KB | Raw SQL: {raw_mb:.2f} MB"
    )

    with open(gz_path, "rb") as fp:
        with httpx.Client(timeout=120.0) as client:
            resp = client.post(
                url,
                data={"chat_id": chat_id, "caption": caption[:1024]},
                files={"document": (gz_path.name, fp, "application/gzip")},
            )
    payload = resp.json()
    if resp.status_code == 200 and payload.get("ok"):
        msg_id = payload.get("result", {}).get("message_id")
        logger.info("Uploaded backup to Telegram channel %s (msg_id=%s)", chat_id, msg_id)
        return True

    logger.error("Telegram backup upload failed: status=%s body=%s", resp.status_code, payload)
    return False


def run_backup(
    *,
    backup_dir: Path,
    retain_days: int = 14,
    min_keep: int = 3,
    send_telegram: bool = True,
) -> Path:
    """Runs pg_dump, writes gzip archive atomically, verifies integrity, prunes old local archives, and uploads."""
    args, env = build_pg_dump_env_and_args(settings.DATABASE_URL)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    final_path = backup_dir / f"bsu_math_{stamp}.sql.gz"
    part_path = backup_dir / f".bsu_math_{stamp}.sql.gz.part"

    logger.info("Starting pg_dump backup to %s", final_path)
    proc = subprocess.Popen(
        args,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
    )
    assert proc.stdout is not None
    assert proc.stderr is not None

    try:
        with gzip.open(part_path, "wb", compresslevel=6) as gz:
            while True:
                chunk = proc.stdout.read(65536)
                if not chunk:
                    break
                gz.write(chunk)
        stderr_out = proc.stderr.read().decode("utf-8", errors="replace").strip()
        returncode = proc.wait()
        if returncode != 0:
            raise RuntimeError(f"pg_dump exited with code {returncode}: {stderr_out}")

        raw_bytes = verify_gzip_nonempty(part_path)
        os.replace(part_path, final_path)
    finally:
        if part_path.exists():
            part_path.unlink(missing_ok=True)

    gz_bytes = final_path.stat().st_size
    logger.info(
        "Backup succeeded: %s (compressed=%d bytes, raw_sql=%d bytes)",
        final_path,
        gz_bytes,
        raw_bytes,
    )

    prune_old_local_backups(backup_dir, retain_days=retain_days, min_keep=min_keep)
    if send_telegram:
        upload_backup_to_telegram(final_path, raw_bytes)

    return final_path


def run_prune_telemetry(*, days: int = 30, dry_run: bool = False) -> dict[str, int | str]:
    """Deletes activity_events older than `days` in bounded batches based on server_ts."""
    if days < 1:
        raise ValueError("days must be >= 1")

    with SessionLocal() as db:
        dialect = db.bind.dialect.name if db.bind else "unknown"
        if dialect == "postgresql":
            eligible_sql = text(
                "SELECT count(*) FROM activity_events "
                "WHERE server_ts < (now() - (:days * interval '1 day'))"
            )
            eligible = int(db.execute(eligible_sql, {"days": days}).scalar() or 0)
            size_before = str(
                db.execute(text("SELECT pg_size_pretty(pg_database_size(current_database()))")).scalar() or ""
            )
        else:
            eligible_sql = text(
                "SELECT count(*) FROM activity_events "
                "WHERE server_ts < datetime('now', :offset)"
            )
            eligible = int(db.execute(eligible_sql, {"offset": f"-{days} days"}).scalar() or 0)
            size_before = "sqlite"

        deleted_total = 0
        if not dry_run and eligible > 0:
            while True:
                if dialect == "postgresql":
                    del_sql = text(
                        "DELETE FROM activity_events WHERE id IN ("
                        "SELECT id FROM activity_events "
                        "WHERE server_ts < (now() - (:days * interval '1 day')) "
                        "LIMIT :limit)"
                    )
                    res = db.execute(del_sql, {"days": days, "limit": PRUNE_BATCH_SIZE})
                else:
                    del_sql = text(
                        "DELETE FROM activity_events WHERE id IN ("
                        "SELECT id FROM activity_events "
                        "WHERE server_ts < datetime('now', :offset) "
                        "LIMIT :limit)"
                    )
                    res = db.execute(del_sql, {"offset": f"-{days} days", "limit": PRUNE_BATCH_SIZE})
                db.commit()
                batch_deleted = int(res.rowcount or 0)
                deleted_total += batch_deleted
                if batch_deleted < PRUNE_BATCH_SIZE:
                    break

        remaining = int(db.execute(text("SELECT count(*) FROM activity_events")).scalar() or 0)
        size_after = (
            str(db.execute(text("SELECT pg_size_pretty(pg_database_size(current_database()))")).scalar() or "")
            if dialect == "postgresql"
            else "sqlite"
        )

    result = {
        "eligible": eligible,
        "deleted": deleted_total,
        "remaining": remaining,
        "size_before": size_before,
        "size_after": size_after,
        "dry_run": int(dry_run),
    }
    logger.info("Telemetry prune summary (days=%d): %s", days, result)
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="BSU Math Portal DB backup & telemetry retention")
    parser.add_argument("--backup", action="store_true", help="Create compressed PostgreSQL backup")
    parser.add_argument("--backup-dir", default=None, help="Override backup output directory")
    parser.add_argument("--retain-days", type=int, default=14, help="Local backup retention in days")
    parser.add_argument("--no-telegram", action="store_true", help="Skip uploading backup to Telegram")
    parser.add_argument("--prune-telemetry", action="store_true", help="Prune old activity_events rows")
    parser.add_argument("--days", type=int, default=30, help="Delete activity_events older than N days")
    parser.add_argument("--dry-run", action="store_true", help="Report telemetry rows eligible without deleting")
    args = parser.parse_args()

    if not args.backup and not args.prune_telemetry:
        parser.error("Specify at least one action: --backup and/or --prune-telemetry")

    if args.backup:
        bdir = resolve_backup_dir(args.backup_dir)
        run_backup(
            backup_dir=bdir,
            retain_days=args.retain_days,
            send_telegram=not args.no_telegram,
        )

    if args.prune_telemetry:
        run_prune_telemetry(days=args.days, dry_run=args.dry_run)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
