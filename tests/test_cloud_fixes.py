"""Regression tests for Track 2 (NotebookLM cookie sync/pool) & Track 3 (portable upload paths)."""

import json
import os
from pathlib import Path

from app.services import notebooklm_client
from app.services.prompt_service import get_subject_prompt


def test_sync_sibling_sid_cookies_only_syncs_matching_sid(tmp_path, monkeypatch):
    monkeypatch.setattr(Path, "home", lambda: tmp_path)
    profiles = tmp_path / ".notebooklm" / "profiles"

    def write_profile(name: str, sid: str, psidts: str):
        d = profiles / name
        d.mkdir(parents=True, exist_ok=True)
        (d / "storage_state.json").write_text(
            json.dumps(
                {
                    "cookies": [
                        {"name": "SID", "domain": ".google.com", "value": sid},
                        {"name": "__Secure-1PSIDTS", "domain": ".google.com", "value": psidts},
                    ]
                }
            ),
            encoding="utf-8",
        )

    write_profile("default", "SID_SHARED_1", "NEW_PSIDTS_TOKEN")
    write_profile("acc_mo", "SID_SHARED_1", "OLD_PSIDTS_TOKEN")
    write_profile("acc_passplay", "SID_OTHER_2", "PASSPLAY_PSIDTS")

    notebooklm_client._sync_sibling_sid_cookies("default")

    mo_cookies = json.loads((profiles / "acc_mo" / "storage_state.json").read_text(encoding="utf-8"))["cookies"]
    mo_psidts = next(c["value"] for c in mo_cookies if c["name"] == "__Secure-1PSIDTS")
    assert mo_psidts == "NEW_PSIDTS_TOKEN"

    pp_cookies = json.loads((profiles / "acc_passplay" / "storage_state.json").read_text(encoding="utf-8"))["cookies"]
    pp_psidts = next(c["value"] for c in pp_cookies if c["name"] == "__Secure-1PSIDTS")
    assert pp_psidts == "PASSPLAY_PSIDTS"


def test_extract_profile_from_args():
    assert notebooklm_client._extract_profile_from_args(["notebooklm", "list"]) == "default"
    assert notebooklm_client._extract_profile_from_args(["notebooklm", "-p", "acc_mo", "usage"]) == "acc_mo"
    assert notebooklm_client._extract_profile_from_args(["notebooklm", "--profile=acc_p1", "list"]) == "acc_p1"


def test_active_pool_deduplicates_aliased_email(tmp_path, monkeypatch):
    import home_worker

    monkeypatch.setattr(Path, "home", lambda: tmp_path)
    profiles = tmp_path / ".notebooklm" / "profiles"
    (profiles / "default").mkdir(parents=True)
    (profiles / "acc_ali").mkdir(parents=True)
    # Simulate 'default' temporarily falling back to alisamaxn2003@gmail.com
    (profiles / "default" / "context.json").write_text(
        json.dumps({"authuser": 0, "email": "alisamaxn2003@gmail.com"}), encoding="utf-8"
    )
    (profiles / "acc_ali" / "context.json").write_text(
        json.dumps({"authuser": 0, "email": "alisamaxn2003@gmail.com"}), encoding="utf-8"
    )

    active_names = [a["profile"] for a in home_worker._active_pool_accounts()]
    assert "default" in active_names
    assert "acc_ali" not in active_names
    assert any(a["email"] == "alisamaxn2003@gmail.com" for a in home_worker.ACCOUNT_POOL)


def test_get_subject_prompt_finds_portable_prompts_dir():
    prompt_file = get_subject_prompt("ديناميكا 2")
    assert prompt_file is not None
    assert Path(prompt_file).exists()
    assert Path(prompt_file).name == "ديناميكا 2.txt"
