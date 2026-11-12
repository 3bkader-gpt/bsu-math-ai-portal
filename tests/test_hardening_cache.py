"""Tests for NVMe LRU media cache, Typst PDF HTTP/disk cache, and DB backup/prune hardening."""

from __future__ import annotations

import asyncio
import gzip
import os
import time
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.db.database import SessionLocal
from app.db.models import Lecture, MediaAsset
from app.main import app
from app.services.media_cache import DiskLRUCache
from scripts.db_backup_and_prune import (
    build_pg_dump_env_and_args,
    prune_old_local_backups,
    verify_gzip_nonempty,
)

client = TestClient(app)


def test_disk_lru_cache_evicts_oldest_and_cleans_aborted_parts(tmp_path: Path, monkeypatch):
    monkeypatch.setenv("TEST_LRU_DIR", str(tmp_path))
    monkeypatch.setenv("TEST_LRU_MAX", "100")

    cache = DiskLRUCache(
        env_var="TEST_LRU_DIR",
        linux_default="/nonexistent",
        fallback_subdir="unused",
        max_bytes_env="TEST_LRU_MAX",
        default_max_bytes=100,
    )

    p1 = cache.put_bytes_atomic("a.bin", b"A" * 60)
    os.utime(p1, (1000.0, 1000.0))
    p2 = cache.put_bytes_atomic("b.bin", b"B" * 35)
    os.utime(p2, (2000.0, 2000.0))

    # Touch a.bin so b.bin becomes the oldest (LRU) entry.
    assert cache.get_cached_file("a.bin", expected_size=60) == p1

    # Adding c.bin (35 bytes) pushes total to 130 > 100, so b.bin must be evicted first.
    cache.put_bytes_atomic("c.bin", b"C" * 35)
    assert (tmp_path / "a.bin").exists()
    assert not (tmp_path / "b.bin").exists()
    assert (tmp_path / "c.bin").exists()

    # Partial tee stream must NOT commit corrupt cache files when aborted mid-stream.
    async def _aborting_gen():
        yield b"1234"
        raise asyncio.CancelledError()

    async def _run_abort():
        gen = cache.tee_stream("partial.bin", 10, _aborting_gen())
        assert await gen.__anext__() == b"1234"
        with pytest.raises(asyncio.CancelledError):
            await gen.__anext__()

    asyncio.run(_run_abort())
    assert not (tmp_path / "partial.bin").exists()
    assert list(tmp_path.glob(".*.part")) == []


@pytest.mark.asyncio
async def test_single_flight_background_fill_deduplicates_concurrent_requests(tmp_path: Path, monkeypatch):
    monkeypatch.setenv("TEST_SF_DIR", str(tmp_path))
    monkeypatch.setenv("TEST_SF_MAX", str(1024 * 1024))

    cache = DiskLRUCache(
        env_var="TEST_SF_DIR",
        linux_default="/nonexistent",
        fallback_subdir="unused",
        max_bytes_env="TEST_SF_MAX",
        default_max_bytes=1024 * 1024,
    )

    download_calls = 0

    async def fake_stream():
        nonlocal download_calls
        download_calls += 1
        await asyncio.sleep(0.05)
        yield b"HELLO_"
        yield b"WORLD"

    tasks = [
        cache.schedule_background_fill("msg_42.bin", 11, fake_stream, allow_in_tests=True)
        for _ in range(25)
    ]
    unique_tasks = {t for t in tasks if t is not None}
    assert len(unique_tasks) == 1
    await asyncio.gather(*unique_tasks)

    assert download_calls == 1
    cached = cache.get_cached_file("msg_42.bin", expected_size=11)
    assert cached is not None
    assert cached.read_bytes() == b"HELLO_WORLD"


@pytest.fixture
def isolated_cache_assets(tmp_path: Path, monkeypatch):
    media_dir = tmp_path / "media"
    pdf_dir = tmp_path / "pdf"
    media_dir.mkdir(parents=True, exist_ok=True)
    pdf_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("MEDIA_CACHE_DIR", str(media_dir))
    monkeypatch.setenv("PDF_CACHE_DIR", str(pdf_dir))

    with SessionLocal() as db:
        db.query(MediaAsset).filter(MediaAsset.id.in_([9701, 9702])).delete(synchronize_session=False)
        db.commit()

        lec = db.query(Lecture).first()
        lec_id = lec.id if lec else 1

        audio_asset = MediaAsset(
            id=9701,
            lecture_id=lec_id,
            asset_type="audio",
            title="Test Audio Cache",
            telegram_message_id=97010,
            file_size_bytes=16,
        )
        sg_asset = MediaAsset(
            id=9702,
            lecture_id=lec_id,
            asset_type="study_guide_md",
            title="Test Study Guide Cache",
            content_text="# Title\nSome math $x^2 + y^2 = r^2$",
        )
        db.add_all([audio_asset, sg_asset])
        db.commit()

    yield {"media_dir": media_dir, "pdf_dir": pdf_dir, "audio_id": 9701, "sg_id": 9702}

    with SessionLocal() as db:
        db.query(MediaAsset).filter(MediaAsset.id.in_([9701, 9702])).delete(synchronize_session=False)
        db.commit()


def test_stream_media_cache_miss_then_hit_and_outage_resilience(isolated_cache_assets):
    payload = b"0123456789ABCDEF"

    async def mock_meta(msg_id):
        return {"file_name": "lec.m4a", "file_size": len(payload), "mime_type": "audio/mp4"}

    stream_calls = 0

    async def mock_chunks(msg_id, start=0, end=None, chunk_size=256 * 1024):
        nonlocal stream_calls
        stream_calls += 1
        end = len(payload) - 1 if end is None else end
        yield payload[start:end + 1]

    with patch("app.routes.stream.telethon_streamer.get_file_metadata", side_effect=mock_meta), \
         patch("app.routes.stream.telethon_streamer.stream_media_chunks", side_effect=mock_chunks):
        r1 = client.get(f"/api/stream/{isolated_cache_assets['audio_id']}")
        assert r1.status_code == 200
        assert r1.content == payload
        assert r1.headers.get("X-Media-Cache") == "MISS"
        assert stream_calls == 1

    # Second call (206 Range) must hit NVMe disk even if Telegram is completely down!
    with patch("app.routes.stream.telethon_streamer.get_file_metadata", side_effect=RuntimeError("Telegram FloodWait")), \
         patch("app.routes.stream.telethon_streamer.stream_media_chunks", side_effect=AssertionError("Should not touch Telegram")):
        r2 = client.get(
            f"/api/stream/{isolated_cache_assets['audio_id']}",
            headers={"Range": "bytes=4-9"},
        )
        assert r2.status_code == 206
        assert r2.content == payload[4:10]
        assert r2.headers.get("X-Media-Cache") == "HIT"
        assert r2.headers.get("Content-Range") == "bytes 4-9/16"


def test_study_guide_pdf_cache_headers_etag_and_invalidation(isolated_cache_assets):
    sg_id = isolated_cache_assets["sg_id"]
    fake_pdf_v1 = b"%PDF-1.4\nv1\n%%EOF"
    fake_pdf_v2 = b"%PDF-1.4\nv2\n%%EOF"

    with patch("app.routes.study_guides.markdown_to_typst_pdf", return_value=fake_pdf_v1) as mock_compile:
        r1 = client.get(f"/api/study-guides/{sg_id}/pdf")
        assert r1.status_code == 200
        assert r1.content == fake_pdf_v1
        assert r1.headers.get("Cache-Control") == "public, max-age=86400"
        assert r1.headers.get("X-PDF-Cache") == "MISS"
        etag1 = r1.headers.get("ETag")
        assert etag1
        assert mock_compile.call_count == 1

        # Second request must hit disk cache without invoking Typst compiler.
        r2 = client.get(f"/api/study-guides/{sg_id}/pdf")
        assert r2.status_code == 200
        assert r2.content == fake_pdf_v1
        assert r2.headers.get("X-PDF-Cache") == "HIT"
        assert mock_compile.call_count == 1

        # Conditional request returns 304 Not Modified cleanly.
        r3 = client.get(f"/api/study-guides/{sg_id}/pdf", headers={"If-None-Match": etag1})
        assert r3.status_code == 304
        assert r3.headers.get("Cache-Control") == "public, max-age=86400"
        assert mock_compile.call_count == 1

    # Updating content_text must invalidate the ETag and compile v2 cleanly.
    with SessionLocal() as db:
        asset = db.query(MediaAsset).filter(MediaAsset.id == sg_id).first()
        asset.content_text = "# Updated\nNew derivation"
        db.commit()

    with patch("app.routes.study_guides.markdown_to_typst_pdf", return_value=fake_pdf_v2) as mock_compile_v2:
        r4 = client.get(f"/api/study-guides/{sg_id}/pdf")
        assert r4.status_code == 200
        assert r4.content == fake_pdf_v2
        assert r4.headers.get("X-PDF-Cache") == "MISS"
        assert r4.headers.get("ETag") != etag1
        assert mock_compile_v2.call_count == 1


def test_backup_helpers_hide_password_and_prune_old_archives(tmp_path: Path):
    with patch("scripts.db_backup_and_prune.find_pg_dump_binary", return_value="/usr/bin/pg_dump"):
        args, env = build_pg_dump_env_and_args(
            "postgresql+psycopg2://postgres.abc:SuperSecret%21Pass@aws-1.pooler.supabase.com:5432/postgres"
        )
    assert "SuperSecret" not in " ".join(args)
    assert env["PGPASSWORD"] == "SuperSecret!Pass"
    assert "--schema=public" in args
    assert "5432" in args

    # Create 4 backups: 2 recent, 2 older than 14 days.
    now = time.time()
    for idx, age_days in enumerate((1, 5, 20, 30)):
        p = tmp_path / f"bsu_math_2026010{idx}_030000.sql.gz"
        with gzip.open(p, "wb") as gz:
            gz.write(b"CREATE TABLE t (id int);")
        ts = now - age_days * 86400
        os.utime(p, (ts, ts))
        assert verify_gzip_nonempty(p) > 0

    removed = prune_old_local_backups(tmp_path, retain_days=14, min_keep=3)
    # 4 files total with min_keep=3 -> only oldest 1 (30d) removed.
    assert removed == 1
    assert len(list(tmp_path.glob("bsu_math_*.sql.gz"))) == 3
