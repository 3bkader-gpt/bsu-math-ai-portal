"""Scheduled daily Web Push study reminder runner for BSU Math Portal."""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.db.database import SessionLocal
from app.services.notification_service import send_scheduled_study_reminders

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("send_study_reminders")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Dispatch scheduled daily Web Push study reminders to subscribed students."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Evaluate eligible subscribers without dispatching Web Push requests.",
    )
    args = parser.parse_args()

    with SessionLocal() as db:
        summary = send_scheduled_study_reminders(db, dry_run=args.dry_run)

    logger.info("Scheduled study reminders summary: %s", json.dumps(summary, ensure_ascii=False))
    print(json.dumps(summary, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
