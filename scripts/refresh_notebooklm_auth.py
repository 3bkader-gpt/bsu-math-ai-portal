"""Headless Chromium cookie refresh script for NotebookLM account pool."""
import asyncio
import fcntl
import json
import os
import re
import time
from pathlib import Path
from playwright.async_api import async_playwright

ACCOUNTS = [
    ("acc_passplay", "Profile 1", 0, "passplay494@gmail.com"),
    ("default", "Default", 0, "medo.omar.salama@gmail.com"),
    ("acc_ali", "Default", 1, "alisamaxn2003@gmail.com"),
    ("acc_mo", "Default", 2, "mo2949042@gmail.com"),
    ("acc_p1", "Default", 3, "pointsone111@gmail.com"),
    ("acc_p2", "Default", 4, "pointstwo222@gmail.com"),
]

PROFILE_DIR = Path(os.getenv("CHROME_PROFILE_DIR", str(Path.home() / ".notebooklm-profile")))
NLM_PROFILES_DIR = Path.home() / ".notebooklm" / "profiles"
STAMP_FILE = Path("/tmp/nlm_refresh.last")

_EMAIL_RE = re.compile(r'"([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})"')
_NON_USER_LOCALS = frozenset(
    {
        "abuse", "feedback", "info", "mail-noreply", "googlemail-noreply",
        "no-reply", "noreply", "press", "privacy", "support",
    }
)
_NON_USER_DOMAINS = frozenset({"google.com", "accounts.google.com", "gmail.com"})


def _extract_email_from_html(html: str) -> str | None:
    for match in _EMAIL_RE.finditer(html):
        email = match.group(1)
        local, _, domain = email.partition("@")
        if local.lower() in _NON_USER_LOCALS and domain.lower() in _NON_USER_DOMAINS:
            continue
        return email
    return None


def _atomic_write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    tmp_path.write_text(text, encoding="utf-8")
    os.replace(tmp_path, path)


async def _refresh_chrome_group(p, chrome_prof: str, entries: list[tuple[str, str, int, str]]) -> int:
    """Opens a Chrome profile directory once, probes active Google slots, and writes NLM profiles."""
    print(f"=== Opening Chrome '{chrome_prof}' for {len(entries)} profile(s) ===")
    context = await p.chromium.launch_persistent_context(
        user_data_dir=str(PROFILE_DIR),
        channel="chrome",
        headless=True,
        args=[f"--profile-directory={chrome_prof}"],
    )
    minted = 0
    try:
        page = await context.new_page()
        max_slot = 0 if chrome_prof != "Default" else max(len(entries) + 1, 6)
        discovered: dict[str, int] = {}
        slot0_email: str | None = None

        for idx in range(max_slot + 1):
            url = f"https://notebooklm.google.com/?authuser={idx}"
            await page.goto(url, wait_until="domcontentloaded", timeout=35000)
            await page.wait_for_timeout(3000)
            cur_url = page.url.lower()
            if "accounts.google.com" in cur_url or "/trynow" in cur_url:
                if idx == 0:
                    raise RuntimeError(
                        f"Google login required in Chrome '{chrome_prof}': redirected to {page.url[:90]}"
                    )
                break
            found_email = _extract_email_from_html(await page.content())
            if not found_email:
                if idx == 0:
                    raise RuntimeError(
                        f"Could not detect signed-in email in Chrome '{chrome_prof}' at {page.url[:90]}"
                    )
                break
            norm_email = found_email.lower()
            if idx == 0:
                slot0_email = found_email
            if norm_email in discovered:
                # Google wraps out-of-range authuser indices back to slot 0/existing account
                break
            discovered[norm_email] = idx
            print(f"  Discovered slot authuser={idx} -> {found_email}")

        base_state = await context.storage_state()

        for profile_name, _, _, target_email in entries:
            norm_target = target_email.lower()
            if norm_target in discovered:
                actual_idx = discovered[norm_target]
                actual_email = target_email
            elif profile_name == "default" and slot0_email:
                print(
                    f"  [WARN] Configured default '{target_email}' is not signed into Chrome '{chrome_prof}'; "
                    f"temporarily mapping 'default' -> '{slot0_email}' (authuser=0)"
                )
                actual_idx = 0
                actual_email = slot0_email
            else:
                print(
                    f"  [WARN] Account '{target_email}' ({profile_name}) is NOT signed into Chrome '{chrome_prof}' — skipping"
                )
                continue

            state = dict(base_state)
            state["notebooklm"] = {"account": {"authuser": actual_idx, "email": actual_email}}
            out_dir = NLM_PROFILES_DIR / profile_name
            _atomic_write_text(out_dir / "storage_state.json", json.dumps(state, indent=2))
            _atomic_write_text(
                out_dir / "context.json",
                json.dumps({"authuser": actual_idx, "email": actual_email}, indent=2),
            )
            print(f"Successfully minted {profile_name} ({actual_email}, authuser={actual_idx})")
            minted += 1
    finally:
        await context.close()
    return minted


async def _refresh_all():
    for lock_name in ("SingletonLock", "SingletonSocket", "SingletonCookie"):
        target = PROFILE_DIR / lock_name
        try:
            if target.is_symlink() or target.exists():
                target.unlink()
        except OSError:
            pass

    groups: dict[str, list[tuple[str, str, int, str]]] = {}
    for entry in ACCOUNTS:
        groups.setdefault(entry[1], []).append(entry)

    total_minted = 0
    async with async_playwright() as p:
        for chrome_prof, entries in groups.items():
            total_minted += await _refresh_chrome_group(p, chrome_prof, entries)

    if total_minted == 0:
        raise RuntimeError("No NotebookLM profiles could be minted from Chrome.")


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
