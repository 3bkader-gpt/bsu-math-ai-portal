import asyncio
import json
import logging
import os
import subprocess
import sys
import threading
import time
from pathlib import Path

logger = logging.getLogger("notebooklm_client")

_REFRESH_LOCK = threading.Lock()
_COOKIE_SYNC_LOCK = threading.Lock()
_LAST_REFRESH_TS = 0.0

_ROTATING_COOKIE_NAMES = frozenset({
    "__Secure-1PSIDTS",
    "__Secure-3PSIDTS",
    "SIDCC",
    "__Secure-1PSIDCC",
    "__Secure-3PSIDCC",
    "OSID",
    "__Secure-OSID",
})

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
REFRESH_SCRIPT = PROJECT_ROOT / "scripts" / "refresh_notebooklm_auth.py"
if not REFRESH_SCRIPT.exists():
    ALT_SCRIPT = PROJECT_ROOT / "refresh_notebooklm_auth.py"
    if ALT_SCRIPT.exists():
        REFRESH_SCRIPT = ALT_SCRIPT

AUTH_ERROR_PATTERNS = [
    "csrf token not found",
    "csrf",
    "authentication expired",
    "auth token expired",
    "please run 'notebooklm login'",
    "please login",
    "unauthorized",
    "401 client error",
    "401 unauthorized",
    "session expired",
    "credentials expired",
    "could not find active session",
    "invalid credentials",
]

def is_auth_error(text: str) -> bool:
    """Checks if an error message indicates an expired Google NotebookLM session."""
    if not text:
        return False
    lower_text = text.lower()
    return any(pattern in lower_text for pattern in AUTH_ERROR_PATTERNS)

def refresh_session_now() -> bool:
    """
    Executes the headless session refresh script using the active Python interpreter.
    Serialized across threads with a short cooldown to prevent Chrome SingletonLock collisions.
    """
    global _LAST_REFRESH_TS
    if not REFRESH_SCRIPT.exists():
        logger.error(f"Cannot refresh NotebookLM session: script not found at {REFRESH_SCRIPT}")
        return False

    with _REFRESH_LOCK:
        if time.monotonic() - _LAST_REFRESH_TS < 30.0:
            logger.info("Skipping duplicate refresh (completed within last 30s).")
            return True

        try:
            logger.info(f"🔄 Executing in-process headless refresh via {REFRESH_SCRIPT.name}...")
            proc = subprocess.run(
                [sys.executable, str(REFRESH_SCRIPT)],
                capture_output=True,
                text=True,
                timeout=90,
                check=False
            )
            if proc.returncode == 0:
                _LAST_REFRESH_TS = time.monotonic()
                logger.info("✅ NotebookLM session refreshed and cookies saved successfully.")
                return True
            else:
                logger.warning(f"⚠️ Refresh script returned code {proc.returncode}. Output: {proc.stdout} {proc.stderr}")
                return False
        except Exception as e:
            logger.error(f"❌ Failed to run headless session refresh: {e}")
            return False

def _extract_profile_from_args(args: list[str]) -> str:
    """Extracts the target NotebookLM profile name from CLI args (defaults to 'default')."""
    for idx, token in enumerate(args):
        if token in ("-p", "--profile") and idx + 1 < len(args):
            return args[idx + 1]
        if token.startswith("--profile="):
            return token.split("=", 1)[1] or "default"
    return "default"


def _sync_sibling_sid_cookies(source_profile: str) -> None:
    """Propagates rotated session cookies to sibling profiles sharing the exact same Google SID.

    When multiple NotebookLM profiles share one Chrome browser session (same SID),
    RotateCookies updates __Secure-1PSIDTS only in the active profile's storage_state.json,
    which otherwise invalidates sibling profiles until refresh_session_now() runs.
    """
    profiles_root = Path.home() / ".notebooklm" / "profiles"
    src_file = profiles_root / source_profile / "storage_state.json"
    if not src_file.exists():
        return

    with _COOKIE_SYNC_LOCK:
        try:
            src_data = json.loads(src_file.read_text(encoding="utf-8"))
        except Exception:
            return

        src_cookies = src_data.get("cookies", [])
        src_sid = next(
            (c.get("value") for c in src_cookies if c.get("name") == "SID" and c.get("domain") == ".google.com"),
            None,
        ) or next((c.get("value") for c in src_cookies if c.get("name") == "SID"), None)
        if not src_sid:
            return

        fresh_by_key = {
            (c.get("name"), c.get("domain")): c
            for c in src_cookies
            if c.get("name") in _ROTATING_COOKIE_NAMES and c.get("value")
        }
        if not fresh_by_key:
            return

        for prof_dir in profiles_root.iterdir():
            if not prof_dir.is_dir() or prof_dir.name == source_profile:
                continue
            target_file = prof_dir / "storage_state.json"
            if not target_file.exists():
                continue
            try:
                tgt_data = json.loads(target_file.read_text(encoding="utf-8"))
                tgt_cookies = tgt_data.get("cookies", [])
                tgt_sid = next(
                    (c.get("value") for c in tgt_cookies if c.get("name") == "SID" and c.get("domain") == ".google.com"),
                    None,
                ) or next((c.get("value") for c in tgt_cookies if c.get("name") == "SID"), None)
                if tgt_sid != src_sid:
                    continue

                changed = False
                existing_keys = {}
                for idx, cookie in enumerate(tgt_cookies):
                    key = (cookie.get("name"), cookie.get("domain"))
                    existing_keys[key] = idx

                for key, fresh_cookie in fresh_by_key.items():
                    idx = existing_keys.get(key)
                    if idx is not None:
                        if tgt_cookies[idx].get("value") != fresh_cookie.get("value"):
                            tgt_cookies[idx] = dict(fresh_cookie)
                            changed = True
                    else:
                        tgt_cookies.append(dict(fresh_cookie))
                        changed = True

                if changed:
                    tmp_file = target_file.with_suffix(".json.tmp")
                    tmp_file.write_text(json.dumps(tgt_data, indent=2), encoding="utf-8")
                    os.replace(tmp_file, target_file)
            except Exception as exc:
                logger.debug("Sibling cookie sync skipped for %s: %s", prof_dir.name, exc)


def run_notebooklm_cmd(args: list[str], timeout: int = 1800, max_retries: int = 2) -> tuple[int, str]:
    """
    Executes a NotebookLM CLI command with autonomous in-code auto-reauth and retry.
    Completely isolated within the project lifecycle.
    """
    used_profile = _extract_profile_from_args(args)
    env = os.environ.copy()
    bin_dir = str(Path(sys.executable).parent)
    if bin_dir not in env.get("PATH", ""):
        env["PATH"] = f"{bin_dir}:{env.get('PATH', '')}"

    env["NOTEBOOKLM_HEADLESS_REAUTH"] = "1"
    env["NOTEBOOKLM_REFRESH_CMD_MIDSESSION"] = "1"
    env["NOTEBOOKLM_REFRESH_CMD_USE_SHELL"] = "1"
    if REFRESH_SCRIPT.exists():
        env["NOTEBOOKLM_REFRESH_CMD"] = f'"{sys.executable}" "{REFRESH_SCRIPT}"'

    attempt = 0
    while attempt <= max_retries:
        attempt += 1
        try:
            proc = subprocess.run(
                args,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=timeout,
                env=env
            )

            # Check if command succeeded
            if proc.returncode == 0:
                _sync_sibling_sid_cookies(used_profile)
                return 0, proc.stdout

            # Check if failed due to auth/session expiration
            if is_auth_error(proc.stdout):
                logger.warning(
                    f"⚠️ NotebookLM auth issue detected on attempt {attempt}/{max_retries + 1}. Auto-healing..."
                )
                if attempt <= max_retries:
                    refreshed = refresh_session_now()
                    if refreshed:
                        time.sleep(2)
                        continue

            return proc.returncode, proc.stdout

        except subprocess.TimeoutExpired:
            logger.error(f"NotebookLM command timed out after {timeout}s: {' '.join(args)}")
            return 124, f"Command timed out after {timeout} seconds"
        except Exception as e:
            logger.error(f"Unexpected error executing NotebookLM command: {e}")
            return 1, str(e)

    return 1, "Max retries exceeded with auth failures."

async def run_notebooklm_cmd_async(args: list[str], timeout: int = 1800, max_retries: int = 2) -> tuple[int, str]:
    """Asynchronous wrapper around run_notebooklm_cmd for non-blocking execution."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, run_notebooklm_cmd, args, timeout, max_retries)
