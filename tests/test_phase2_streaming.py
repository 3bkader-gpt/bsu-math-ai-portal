"""
Phase 2 Streaming & Media Reliability Automated Test Suite
Covers:
- P0-STR-01: Media Asset ID Collision resolution
- P0-PIP-01: Background media fetcher completion logic
- TEST-ENV-01: Temporary storage isolation and cleanup
- TEST-STR-01: Streaming cancellation & seeking resilience
- TEST-LAT-01: Telegram metadata lookup & caching
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.db.models import MediaAsset, Lecture, Subject

client = TestClient(app)

@pytest.fixture(scope="module")
def setup_colliding_assets():
    """
    Creates two assets where Asset A's telegram_message_id equals Asset B's primary key id.
    Asset A: id=9001, telegram_message_id=9002, content_text="Asset A Content"
    Asset B: id=9002, telegram_message_id=9003, content_text="Asset B Content"
    Asset C: id=9004, telegram_message_id=9005, content_text="Asset C Content"
    """
    with SessionLocal() as db:
        # Clean up any leftover test data
        db.query(MediaAsset).filter(MediaAsset.id.in_([9001, 9002, 9004])).delete(synchronize_session=False)
        db.commit()

        lec = db.query(Lecture).first()
        lec_id = lec.id if lec else 1

        asset_a = MediaAsset(
            id=9001,
            lecture_id=lec_id,
            asset_type="study_guide_md",
            title="Asset A (ID 9001, MSG 9002)",
            content_text="Content of Asset A",
            telegram_message_id=9002
        )
        asset_b = MediaAsset(
            id=9002,
            lecture_id=lec_id,
            asset_type="study_guide_md",
            title="Asset B (ID 9002, MSG 9003)",
            content_text="Content of Asset B",
            telegram_message_id=9003
        )
        asset_c = MediaAsset(
            id=9004,
            lecture_id=lec_id,
            asset_type="study_guide_md",
            title="Asset C (ID 9004, MSG 9005)",
            content_text="Content of Asset C",
            telegram_message_id=9005
        )
        db.add_all([asset_a, asset_b, asset_c])
        db.commit()

    yield

    with SessionLocal() as db:
        db.query(MediaAsset).filter(MediaAsset.id.in_([9001, 9002, 9004])).delete(synchronize_session=False)
        db.commit()


def test_asset_id_collision_resolves_to_primary_key(setup_colliding_assets):
    """
    P0-STR-01: When requesting asset_id 9002, it must unambiguously resolve to
    Asset B (id=9002) and NEVER to Asset A (which has telegram_message_id=9002).
    """
    resp = client.get("/api/stream/9002")
    assert resp.status_code == 200
    assert resp.text == "Content of Asset B"


def test_asset_lookup_by_message_id_explicit(setup_colliding_assets):
    """
    P0-STR-01: When explicitly passing by_message_id=true with 9002,
    it must resolve to Asset A (which has telegram_message_id=9002).
    """
    resp = client.get("/api/stream/9002?by_message_id=true")
    assert resp.status_code == 200
    assert resp.text == "Content of Asset A"


def test_legacy_fallback_when_only_telegram_message_id_matches(setup_colliding_assets):
    """
    P0-STR-01: When requesting an ID that does NOT exist as a primary key (9005),
    it falls back cleanly to the asset with telegram_message_id=9005 (Asset C).
    """
    resp = client.get("/api/stream/9005")
    assert resp.status_code == 200
    assert resp.text == "Content of Asset C"


def test_stream_nonexistent_asset_returns_404(setup_colliding_assets):
    """
    P0-STR-01: A non-existent ID returns 404.
    """
    resp = client.get("/api/stream/99999999")
    assert resp.status_code == 404


# ==============================================================================
# 2. P0-PIP-01 & TEST-ENV-01: Background Media Fetcher & Storage Cleanup Tests
# ==============================================================================
import asyncio
import shutil
from pathlib import Path
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.notebooklm_service import NotebookLMPipeline
from app.config import settings

@pytest.mark.asyncio
async def test_fetch_media_in_background_waits_for_both_assets():
    """
    P0-PIP-01: Verify fetcher does NOT exit when only audio is ready,
    and cleanly terminates when both audio and video are retrieved.
    """
    temp_dir = settings.MEDIA_DIR / "temp" / "test_pipe_both"
    temp_dir.mkdir(parents=True, exist_ok=True)
    audio_file = temp_dir / "audio_overview.m4a"
    video_file = temp_dir / "video_overview.mp4"

    call_count = {"audio": 0, "video": 0}

    async def mock_run_cmd(cmd):
        if "audio" in cmd:
            call_count["audio"] += 1
            audio_file.write_bytes(b"A" * 2000)
            return 0, "audio ready"
        elif "video" in cmd:
            call_count["video"] += 1
            # Simulate video taking 2 attempts to finish after audio
            if call_count["video"] >= 2:
                video_file.write_bytes(b"V" * 3000)
                return 0, "video ready"
            return 1, "video generating"
        return 0, "ok"

    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = None
    mock_db.__enter__ = MagicMock(return_value=mock_db)
    mock_db.__exit__ = MagicMock(return_value=None)
    mock_db.close = MagicMock()

    with patch("app.services.notebooklm_service.run_cmd_async", side_effect=mock_run_cmd), \
         patch("app.services.notebooklm_service.telegram_storage.upload_asset", new_callable=AsyncMock) as mock_upload, \
         patch("asyncio.sleep", new_callable=AsyncMock):

        mock_upload.return_value = {"telegram_file_id": "tg_123", "telegram_message_id": 555, "file_size": 2500}

        await NotebookLMPipeline.fetch_media_in_background(
            lecture_id=777,
            nb_id="test_nb_uuid",
            subject_name="Math",
            temp_dir=temp_dir,
            db_factory=lambda: mock_db
        )

    # Audio completed on attempt 1, video completed on attempt 2
    assert call_count["audio"] >= 1
    assert call_count["video"] >= 2
    # TEST-ENV-01: Temp directory must be automatically purged upon completion
    assert not temp_dir.exists(), "temp_dir should be purged on completion"


@pytest.mark.asyncio
async def test_fetch_media_preserves_audio_if_video_fails_or_times_out():
    """
    P0-PIP-01: If audio succeeds but video fails repeatedly or times out,
    audio remains safely uploaded and committed, and cleanup still occurs.
    """
    temp_dir = settings.MEDIA_DIR / "temp" / "test_pipe_audio_only"
    temp_dir.mkdir(parents=True, exist_ok=True)
    audio_file = temp_dir / "audio_overview.m4a"

    attempts = {"count": 0}

    async def mock_run_cmd(cmd):
        if "audio" in cmd:
            audio_file.write_bytes(b"A" * 2000)
            return 0, "audio ready"
        elif "video" in cmd:
            attempts["count"] += 1
            # Video continuously fails
            return 1, "video generation error"
        return 0, ""

    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = None
    mock_db.__enter__ = MagicMock(return_value=mock_db)
    mock_db.__exit__ = MagicMock(return_value=None)
    mock_db.close = MagicMock()

    with patch("app.services.notebooklm_service.run_cmd_async", side_effect=mock_run_cmd), \
         patch("app.services.notebooklm_service.telegram_storage.upload_asset", new_callable=AsyncMock) as mock_upload, \
         patch("asyncio.sleep", new_callable=AsyncMock):

        mock_upload.return_value = {"telegram_file_id": "tg_audio_only", "telegram_message_id": 777, "file_size": 2000}

        # Run with max 3 attempts to simulate timeout bounded loop
        with patch("builtins.range", return_value=range(3)):
            await NotebookLMPipeline.fetch_media_in_background(
                lecture_id=888,
                nb_id="test_nb_audio_only",
                subject_name="Math",
                temp_dir=temp_dir,
                db_factory=lambda: mock_db
            )

    # Audio was uploaded
    assert mock_upload.called
    # Video attempted
    assert attempts["count"] == 3
    # TEST-ENV-01: Cleanup occurs even on timeout
    assert not temp_dir.exists(), "temp_dir should be purged even when video times out"


# ==============================================================================
# 3. TEST-LAT-01: Telegram Metadata Lookup & Caching Tests
# ==============================================================================
from app.services.telethon_service import telethon_streamer

@pytest.mark.asyncio
async def test_telegram_metadata_caching_eliminates_duplicate_rpcs():
    """
    TEST-LAT-01: Calling get_file_metadata and stream_media_chunks for the same
    message_id reuses the cached Telegram message object, eliminating duplicate RPCs.
    """
    mock_client = MagicMock()
    mock_msg = MagicMock()
    mock_msg.media = True
    mock_msg.file.size = 1024 * 1024
    mock_msg.file.name = "audio.mp4"
    mock_msg.file.mime_type = "audio/mp4"

    mock_client.get_messages = AsyncMock(return_value=mock_msg)
    mock_client.is_connected = MagicMock(return_value=True)

    with patch.object(telethon_streamer, "get_client", new_callable=AsyncMock, return_value=mock_client):
        # Clear cache for isolated test
        telethon_streamer._message_cache.clear()

        # 1. First metadata probe
        meta1 = await telethon_streamer.get_file_metadata(99901)
        assert meta1["file_size"] == 1024 * 1024
        assert mock_client.get_messages.call_count == 1

        # 2. Immediate second metadata probe -> served from cache
        meta2 = await telethon_streamer.get_file_metadata(99901)
        assert meta2["file_size"] == 1024 * 1024
        assert mock_client.get_messages.call_count == 1, "Expected zero additional RPC calls on cache hit"

        # 3. Message lookup inside stream_media_chunks -> also served from cache
        msg_obj = await telethon_streamer.get_message(99901)
        assert msg_obj == mock_msg
        assert mock_client.get_messages.call_count == 1, "Expected cache reuse across streaming pipeline"


# ==============================================================================
# 4. TEST-STR-01: Telethon Streaming Cancellation Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_streaming_cancellation_releases_generator_resources():
    """
    TEST-STR-01: When an async client generator aborts (seeking or disconnect),
    the underlying download_gen.aclose() is invoked cleanly and resources are freed.
    """
    mock_client = MagicMock()
    mock_msg = MagicMock()
    mock_msg.media = True
    mock_msg.file.size = 1024 * 1024
    mock_msg.file.name = "test.mp4"
    mock_msg.file.mime_type = "video/mp4"

    aclose_called = {"val": False}

    async def mock_iter_download(*args, **kwargs):
        try:
            yield b"X" * 1024
            yield b"Y" * 1024
            yield b"Z" * 1024
        finally:
            aclose_called["val"] = True

    mock_client.iter_download = mock_iter_download
    mock_client.get_messages = AsyncMock(return_value=mock_msg)
    mock_client.is_connected = MagicMock(return_value=True)

    with patch.object(telethon_streamer, "get_client", new_callable=AsyncMock, return_value=mock_client):
        telethon_streamer._message_cache.clear()

        gen = telethon_streamer.stream_media_chunks(99902, start=0, end=1024 * 1024 - 1)
        first_chunk = await gen.__anext__()
        assert first_chunk == b"X" * 1024

        # Simulate client closing connection mid-stream (e.g. seeking)
        await gen.aclose()
        assert aclose_called["val"] is True, "aclose() must be invoked on aborted stream"

