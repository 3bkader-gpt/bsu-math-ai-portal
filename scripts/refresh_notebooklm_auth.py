"""Headless Chromium cookie refresh script for NotebookLM account pool."""
import asyncio
import fcntl
import json
import os
import time
from pathlib import Path
from playwright.async_api import async_playwright

ACCOUNTS = [
    ("acc_passplay", "Profile 1", 0, "passplay494@gmail.com"),
    ("acc_ali", "Default", 1, "alisamxn2003@gmail.com"),
    ("acc_mo", "Default", 2, "mo2949042@gmail.com"),
    ("acc_p1", "Default", 3, "pointsone111@gmail.com"),
    ("acc_p2", "Default", 4, "pointstwo222@gmail.com"),
    ("default", "Default", 0, "medo.omar.salama@gmail.com"),
]

PROFILE_DIR = Path(os.getenv("CHROME_PROFILE_DIR", str(Path.home() / ".notebooklm-profile")))
NLM_PROFILES_DIR = Path.home() / ".notebooklm" / "profiles"
STAMP_FILE = Path("/tmp/nlm_refresh.last")


async def _refresh_all():
    for lock_name in ("SingletonLock", "SingletonSocket", "SingletonCookie"):
        target = PROFILE_DIR / lock_name
        try:
            if target.is_symlink() or target.exists():
                target.unlink()
        except OSError:
            pass

    async with async_playwright() as p:
        for profile_name, chrome_prof, u_idx, email in ACCOUNTS:
            print(f"=== Dumping Storage for {profile_name} ({chrome_prof}, /u/{u_idx}/, {email}) ===")
            context = await p.chromium.launch_persistent_context(
                user_data_dir=str(PROFILE_DIR),
                channel="chrome",
                headless=True,
                args=[f"--profile-directory={chrome_prof}"],
            )
            try:
                page = await context.new_page()
                url = f"https://notebooklm.google.com/u/{u_idx}/"
                await page.goto(url, wait_until="networkidle", timeout=25000)
                state = await context.storage_state()
                state["notebooklm"] = {"account": {"authuser": u_idx, "email": email}}
                out_dir = NLM_PROFILES_DIR / profile_name
                out_dir.mkdir(parents=True, exist_ok=True)
                (out_dir / "storage_state.json").write_text(json.dumps(state, indent=2), encoding="utf-8")
                (out_dir / "context.json").write_text(
                    json.dumps({"authuser": u_idx, "email": email}, indent=2),
                    encoding="utf-8",
                )
                print(f"Successfully minted {profile_name}")
            finally:
                await context.close()


def main():
    with open("/tmp/nlm_refresh.lock", "w", encoding="utf-8") as lock_fh:
        fcntl.flock(lock_fh, fcntl.LOCK_EX)
        if not os.getenv("FORCE_REFRESH") and STAMP_FILE.exists() and (time.time() - STAMP_FILE.stat().st_mtime) < 30:
            print("Skipping duplicate refresh (default cookies refreshed <30s ago).")
            return
        asyncio.run(_refresh_all())
        STAMP_FILE.touch()


if __name__ == "__main__":
    main()
