import asyncio
import logging
import os
import subprocess
import sys
import time
from pathlib import Path

logger = logging.getLogger("notebooklm_client")

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
    Runs silently in-process without touching any OS or Windows system settings.
    """
    if not REFRESH_SCRIPT.exists():
        logger.error(f"Cannot refresh NotebookLM session: script not found at {REFRESH_SCRIPT}")
        return False

    try:
        logger.info(f"🔄 Executing in-process headless refresh via {REFRESH_SCRIPT.name}...")
        proc = subprocess.run(
            [sys.executable, str(REFRESH_SCRIPT)],
            capture_output=True,
            text=True,
            timeout=60,
            check=False
        )
        if proc.returncode == 0:
            logger.info("✅ NotebookLM session refreshed and cookies saved successfully.")
            return True
        else:
            logger.warning(f"⚠️ Refresh script returned code {proc.returncode}. Output: {proc.stdout} {proc.stderr}")
            return False
    except Exception as e:
        logger.error(f"❌ Failed to run headless session refresh: {e}")
        return False

def run_notebooklm_cmd(args: list[str], timeout: int = 1800, max_retries: int = 2) -> tuple[int, str]:
    """
    Executes a NotebookLM CLI command with autonomous in-code auto-reauth and retry.
    Completely isolated within the project lifecycle.
    """
    env = os.environ.copy()
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
