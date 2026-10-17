"""
Test Suite for Phase 1 Lecture PDF Downloads & Attachment Headers
Covers:
- Correct Content-Type for original_pdf and generic pdf
- RFC 6266 / RFC 5987 Content-Disposition attachment header
- Arabic and Unicode filename sanitization and encoding
- Prevention of duplicate extensions (.pdf.pdf)
- Header injection prevention (CR/LF, quotes, path traversal stripped)
- Audio/Video inline playback preservation
- HTTP Range streaming with download=true
- 404 for missing assets or unavailable content
- Local storage boundary security
"""
import pytest
import urllib.parse
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.db.models import MediaAsset, Lecture, Subject
from app.routes.stream import build_pdf_content_disposition
from app.config import settings

client = TestClient(app)

def test_build_pdf_content_disposition():
    # 1. Standard english title
    h1 = build_pdf_content_disposition("lec1.pdf", 1)
    assert 'filename="lec1.pdf"' in h1
    assert "filename*=UTF-8''lec1.pdf" in h1
    assert ".pdf.pdf" not in h1

    # 2. Arabic title
    arabic_title = "كتاب - متجهات الوحدة والمستويات المصاحبة.pdf"
    h2 = build_pdf_content_disposition(arabic_title, 5)
    assert 'attachment;' in h2
    assert 'filename=' in h2
    assert "filename*=UTF-8''" in h2
    assert urllib.parse.quote("كتاب - متجهات الوحدة والمستويات المصاحبة.pdf") in h2
    assert ".pdf.pdf" not in h2

    # 3. Header injection and path traversal attempt
    malicious = "malicious\r\nX-Injected: evil/../../secret.pdf"
    h3 = build_pdf_content_disposition(malicious, 9)
    assert "\r" not in h3
    assert "\n" not in h3
    assert ".." not in h3
    assert "/" not in h3
    assert h3.endswith(".pdf'") or ".pdf" in h3

    # 4. Empty or None title fallback
    h4 = build_pdf_content_disposition("", 42)
    assert 'filename="lecture_42_material.pdf"' in h4

MOCK_TELEGRAM_PDF_BYTES = (
    b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n"
    b"1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n"
    b"2 0 obj\n<</Type/Pages/Count 1/Kids[3 0 R]>>\nendobj\n"
    b"3 0 obj\n<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>\nendobj\n"
    b"xref\n0 4\n0000000000 65535 f \n0000000015 00000 n \n0000000060 00000 n \n0000000111 00000 n \n"
    b"trailer\n<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF"
)

LOCAL_PDF_BYTES = b"%PDF-1.4 dummy pdf content for testing range and download stream"

@pytest.fixture(scope="module")
def setup_pdf_assets():
    """Create isolated test assets in SQLite / Postgres for test coverage."""
    with SessionLocal() as db:
        # Clean up existing test assets
        db.query(MediaAsset).filter(MediaAsset.id.in_([9501, 9502, 9503, 9504, 9505, 9506, 9507])).delete(synchronize_session=False)
        db.commit()

        lec = db.query(Lecture).first()
        lec_id = lec.id if lec else 1

        # Create temporary local dummy PDF file in approved media dir
        test_pdf_file = settings.MEDIA_DIR / "test_approved_lecture.pdf"
        test_pdf_file.write_bytes(LOCAL_PDF_BYTES)

        asset_original_pdf = MediaAsset(
            id=9501,
            lecture_id=lec_id,
            asset_type="original_pdf",
            title="محاضرة الهندسة التفاضلية 1.pdf",
            local_file_path=str(test_pdf_file),
            file_size_bytes=test_pdf_file.stat().st_size
        )
        asset_generic_pdf = MediaAsset(
            id=9502,
            lecture_id=lec_id,
            asset_type="pdf",
            title="generic_book.pdf",
            local_file_path=str(test_pdf_file),
            file_size_bytes=test_pdf_file.stat().st_size
        )
        asset_audio = MediaAsset(
            id=9503,
            lecture_id=lec_id,
            asset_type="audio",
            title="audio_podcast.mp4",
            local_file_path=str(test_pdf_file),
            file_size_bytes=test_pdf_file.stat().st_size
        )
        asset_unapproved_path = MediaAsset(
            id=9504,
            lecture_id=lec_id,
            asset_type="original_pdf",
            title="traversal.pdf",
            local_file_path="C:\\Windows\\System32\\drivers\\etc\\hosts",
            file_size_bytes=100
        )
        asset_telegram_pdf = MediaAsset(
            id=9505,
            lecture_id=lec_id,
            asset_type="original_pdf",
            title="المحاضرة الأولى - فلسفة العلوم والرياضيات.pdf",
            telegram_message_id=88881,
            file_size_bytes=len(MOCK_TELEGRAM_PDF_BYTES)
        )
        # Phantom asset: positive file size but non-existent disk file and no telegram
        asset_missing_storage = MediaAsset(
            id=9506,
            lecture_id=lec_id,
            asset_type="original_pdf",
            title="phantom_file.pdf",
            local_file_path=str(settings.MEDIA_DIR / "non_existent_phantom.pdf"),
            file_size_bytes=5242880,
            telegram_file_id=None,
            telegram_message_id=None
        )
        # Missing storage metadata
        asset_no_metadata = MediaAsset(
            id=9507,
            lecture_id=lec_id,
            asset_type="original_pdf",
            title="no_metadata.pdf",
            local_file_path=None,
            file_size_bytes=None,
            telegram_file_id=None,
            telegram_message_id=None
        )

        db.add_all([
            asset_original_pdf,
            asset_generic_pdf,
            asset_audio,
            asset_unapproved_path,
            asset_telegram_pdf,
            asset_missing_storage,
            asset_no_metadata
        ])
        db.commit()

    yield {
        "lec_id": lec_id,
        "original_pdf_id": 9501,
        "generic_pdf_id": 9502,
        "audio_id": 9503,
        "unapproved_id": 9504,
        "telegram_pdf_id": 9505,
        "missing_storage_id": 9506,
        "no_metadata_id": 9507,
    }

    # Cleanup
    with SessionLocal() as db:
        db.query(MediaAsset).filter(MediaAsset.id.in_([9501, 9502, 9503, 9504, 9505, 9506, 9507])).delete(synchronize_session=False)
        db.commit()
    test_pdf_file = settings.MEDIA_DIR / "test_approved_lecture.pdf"
    if test_pdf_file.exists():
        test_pdf_file.unlink()

def test_original_pdf_download_header_and_bytes(setup_pdf_assets):
    """original_pdf with download=true returns application/pdf, attachment disposition, and valid %PDF- bytes."""
    asset_id = setup_pdf_assets["original_pdf_id"]
    response = client.get(f"/api/stream/{asset_id}?download=true")
    assert response.status_code == 200
    assert response.headers["Content-Type"] == "application/pdf"
    assert "Content-Disposition" in response.headers
    assert response.headers["Content-Disposition"].startswith("attachment;")
    assert "filename*=UTF-8''" in response.headers["Content-Disposition"]
    assert response.content.startswith(b"%PDF-")
    assert response.content == LOCAL_PDF_BYTES

def test_original_pdf_inline_streaming(setup_pdf_assets):
    """original_pdf without download=true streams inline (no Content-Disposition header)."""
    asset_id = setup_pdf_assets["original_pdf_id"]
    response = client.get(f"/api/stream/{asset_id}")
    assert response.status_code == 200
    assert response.headers["Content-Type"] == "application/pdf"
    assert "Content-Disposition" not in response.headers
    assert response.content.startswith(b"%PDF-")

def test_generic_pdf_download_compatibility(setup_pdf_assets):
    """generic pdf asset type also supports download=true."""
    asset_id = setup_pdf_assets["generic_pdf_id"]
    response = client.get(f"/api/stream/{asset_id}?download=true")
    assert response.status_code == 200
    assert response.headers["Content-Type"] == "application/pdf"
    assert "Content-Disposition" in response.headers
    assert 'filename="generic_book.pdf"' in response.headers["Content-Disposition"]
    assert response.content.startswith(b"%PDF-")

def test_audio_streaming_preserves_inline(setup_pdf_assets):
    """audio streaming never adds attachment disposition even if download=true is passed."""
    asset_id = setup_pdf_assets["audio_id"]
    response = client.get(f"/api/stream/{asset_id}?download=true")
    assert response.status_code == 200
    assert response.headers["Content-Type"] == "audio/mp4"
    assert "Content-Disposition" not in response.headers

def test_range_request_with_download_local(setup_pdf_assets):
    """HTTP Range requests (206) with download=true return exact byte slices and start with %PDF-."""
    asset_id = setup_pdf_assets["original_pdf_id"]
    response = client.get(f"/api/stream/{asset_id}?download=true", headers={"Range": "bytes=0-15"})
    assert response.status_code == 206
    assert response.headers["Content-Type"] == "application/pdf"
    assert "Content-Range" in response.headers
    assert response.headers["Content-Range"].startswith("bytes 0-15/")
    assert "Content-Disposition" in response.headers
    assert response.content.startswith(b"%PDF-")
    assert response.content == LOCAL_PDF_BYTES[0:16]

def test_head_request_with_download_local(setup_pdf_assets):
    """HTTP HEAD requests with download=true return metadata headers without body."""
    asset_id = setup_pdf_assets["original_pdf_id"]
    response = client.head(f"/api/stream/{asset_id}?download=true")
    assert response.status_code == 200
    assert response.headers["Content-Type"] == "application/pdf"
    assert "Content-Disposition" in response.headers
    assert response.content == b""

def test_mocked_telegram_pdf_download_bytes(setup_pdf_assets):
    """Mocked Telegram-backed PDF download verifies %PDF- bytes, Content-Type, Content-Disposition, and Arabic filename."""
    from unittest.mock import patch

    async def mock_meta(msg_id):
        if msg_id == 88881:
            return {
                "file_name": "المحاضرة الأولى - فلسفة العلوم والرياضيات.pdf",
                "file_size": len(MOCK_TELEGRAM_PDF_BYTES),
                "mime_type": "application/pdf"
            }
        return None

    async def mock_stream_chunks(msg_id, start=0, end=None, chunk_size=256*1024):
        if end is None or end >= len(MOCK_TELEGRAM_PDF_BYTES):
            end = len(MOCK_TELEGRAM_PDF_BYTES) - 1
        yield MOCK_TELEGRAM_PDF_BYTES[start:end + 1]

    with patch("app.routes.stream.telethon_streamer.get_file_metadata", side_effect=mock_meta), \
         patch("app.routes.stream.telethon_streamer.stream_media_chunks", side_effect=mock_stream_chunks):

        asset_id = setup_pdf_assets["telegram_pdf_id"]
        response = client.get(f"/api/stream/{asset_id}?download=true")

        assert response.status_code == 200
        assert response.headers["Content-Type"] == "application/pdf"
        assert response.headers["Content-Length"] == str(len(MOCK_TELEGRAM_PDF_BYTES))

        # Verify Content-Disposition
        cd = response.headers.get("Content-Disposition", "")
        assert cd.startswith("attachment;")
        assert "filename*=UTF-8''" in cd
        assert "\r" not in cd and "\n" not in cd

        # Verify PDF bytes and magic signature
        assert response.content.startswith(b"%PDF-")
        assert response.content == MOCK_TELEGRAM_PDF_BYTES

def test_mocked_telegram_pdf_range_request_bytes(setup_pdf_assets):
    """Mocked Telegram-backed Range request returns 206, byte range headers, and actual partial PDF bytes."""
    from unittest.mock import patch

    async def mock_meta(msg_id):
        return {
            "file_name": "المحاضرة الأولى - فلسفة العلوم والرياضيات.pdf",
            "file_size": len(MOCK_TELEGRAM_PDF_BYTES),
            "mime_type": "application/pdf"
        }

    async def mock_stream_chunks(msg_id, start=0, end=None, chunk_size=256*1024):
        if end is None or end >= len(MOCK_TELEGRAM_PDF_BYTES):
            end = len(MOCK_TELEGRAM_PDF_BYTES) - 1
        yield MOCK_TELEGRAM_PDF_BYTES[start:end + 1]

    with patch("app.routes.stream.telethon_streamer.get_file_metadata", side_effect=mock_meta), \
         patch("app.routes.stream.telethon_streamer.stream_media_chunks", side_effect=mock_stream_chunks):

        asset_id = setup_pdf_assets["telegram_pdf_id"]
        # Request bytes 0 to 7 (8 bytes)
        response = client.get(f"/api/stream/{asset_id}?download=true", headers={"Range": "bytes=0-7"})

        assert response.status_code == 206
        assert response.headers["Content-Type"] == "application/pdf"
        assert response.headers["Content-Range"] == f"bytes 0-7/{len(MOCK_TELEGRAM_PDF_BYTES)}"
        assert response.headers["Content-Length"] == "8"
        assert "Content-Disposition" in response.headers
        assert response.headers["Content-Disposition"].startswith("attachment;")

        # Check actual partial bytes
        assert response.content == b"%PDF-1.7"
        assert response.content.startswith(b"%PDF-")

def test_mocked_telegram_pdf_head_request(setup_pdf_assets):
    """Mocked Telegram-backed HEAD requests return headers without response body (full and range)."""
    from unittest.mock import patch

    async def mock_meta(msg_id):
        return {
            "file_name": "المحاضرة الأولى - فلسفة العلوم والرياضيات.pdf",
            "file_size": len(MOCK_TELEGRAM_PDF_BYTES),
            "mime_type": "application/pdf"
        }

    with patch("app.routes.stream.telethon_streamer.get_file_metadata", side_effect=mock_meta):
        asset_id = setup_pdf_assets["telegram_pdf_id"]

        # 1. Full HEAD
        resp_full = client.head(f"/api/stream/{asset_id}?download=true")
        assert resp_full.status_code == 200
        assert resp_full.headers["Content-Type"] == "application/pdf"
        assert resp_full.headers["Content-Length"] == str(len(MOCK_TELEGRAM_PDF_BYTES))
        assert "Content-Disposition" in resp_full.headers
        assert resp_full.content == b""

        # 2. Range HEAD
        resp_range = client.head(f"/api/stream/{asset_id}?download=true", headers={"Range": "bytes=0-7"})
        assert resp_range.status_code == 206
        assert resp_range.headers["Content-Type"] == "application/pdf"
        assert resp_range.headers["Content-Range"] == f"bytes 0-7/{len(MOCK_TELEGRAM_PDF_BYTES)}"
        assert resp_range.headers["Content-Length"] == "8"
        assert "Content-Disposition" in resp_range.headers
        assert resp_range.content == b""

def test_unapproved_storage_boundary_blocked(setup_pdf_assets):
    """Files outside approved storage boundaries are rejected with 403."""
    asset_id = setup_pdf_assets["unapproved_id"]
    response = client.get(f"/api/stream/{asset_id}?download=true")
    assert response.status_code == 403

def test_nonexistent_asset_404():
    """Non-existent asset returns 404."""
    response = client.get("/api/stream/99999999?download=true")
    assert response.status_code == 404

def test_lecture_bundle_availability_flags(setup_pdf_assets):
    """Verify backend bundle correctly determines is_available for storage-backed vs phantom assets."""
    lec_id = setup_pdf_assets["lec_id"]
    response = client.get(f"/api/lectures/{lec_id}")
    assert response.status_code == 200
    data = response.json()
    assets_by_id = {a["id"]: a for a in data["assets"]}

    # 1. Telegram-backed asset -> is_available True, has_telegram True
    tg_asset = assets_by_id[setup_pdf_assets["telegram_pdf_id"]]
    assert tg_asset["is_available"] is True
    assert tg_asset["has_telegram"] is True

    # 2. Existing approved local file -> is_available True
    local_asset = assets_by_id[setup_pdf_assets["original_pdf_id"]]
    assert local_asset["is_available"] is True

    # 3. Phantom file with positive file_size_bytes but missing disk file -> is_available False
    phantom_asset = assets_by_id[setup_pdf_assets["missing_storage_id"]]
    assert phantom_asset["file_size_bytes"] == 5242880
    assert phantom_asset["is_available"] is False
    assert phantom_asset["has_telegram"] is False

    # 4. Unapproved storage path -> is_available False
    unapproved_asset = assets_by_id[setup_pdf_assets["unapproved_id"]]
    assert unapproved_asset["is_available"] is False

    # 5. Missing storage metadata -> is_available False
    no_meta_asset = assets_by_id[setup_pdf_assets["no_metadata_id"]]
    assert no_meta_asset["is_available"] is False

def test_frontend_availability_logic_shapes():
    """Verify availability resolution for both direct-Supabase and backend-fallback asset shapes."""
    def is_asset_storage_available(a):
        if isinstance(a.get("is_available"), bool):
            return a["is_available"]
        return bool(a.get("has_telegram") or a.get("telegram_file_id") or a.get("telegram_message_id"))

    # Direct Supabase shape: valid Telegram reference
    sb_valid = {
        "id": 1,
        "asset_type": "original_pdf",
        "has_telegram": True,
        "telegram_file_id": "tg_valid",
        "telegram_message_id": 99,
        "file_size_bytes": 1024,
        "is_available": True
    }
    assert is_asset_storage_available(sb_valid) is True

    # Direct Supabase shape: positive file_size_bytes without Telegram storage
    sb_phantom = {
        "id": 2,
        "asset_type": "original_pdf",
        "has_telegram": False,
        "telegram_file_id": None,
        "telegram_message_id": None,
        "file_size_bytes": 10485760,
        "is_available": False
    }
    assert is_asset_storage_available(sb_phantom) is False

    # Backend fallback shape: is_available False with positive size
    backend_phantom = {
        "id": 3,
        "asset_type": "original_pdf",
        "has_telegram": False,
        "file_size_bytes": 5242880,
        "is_available": False,
        "stream_url": "/api/stream/3"
    }
    assert is_asset_storage_available(backend_phantom) is False

    # Backend fallback shape: is_available True
    backend_valid = {
        "id": 4,
        "asset_type": "original_pdf",
        "has_telegram": True,
        "file_size_bytes": 5242880,
        "is_available": True,
        "stream_url": "/api/stream/4"
    }
    assert is_asset_storage_available(backend_valid) is True

    # Missing storage metadata
    missing_meta = {
        "id": 5,
        "asset_type": "original_pdf",
        "title": "missing.pdf"
    }
    assert is_asset_storage_available(missing_meta) is False

def test_unified_loading_paths_availability_consistency(setup_pdf_assets):
    """
    Verifies that direct-Supabase loading path (with backend availability reconciliation)
    and the backend-fallback loading path yield 100% consistent availability decisions across:
    1. Telegram-backed PDF
    2. Valid approved local-only PDF
    3. Missing local file with positive size metadata (phantom)
    4. Missing storage metadata
    """
    lec_id = setup_pdf_assets["lec_id"]

    # Backend fallback path
    backend_resp = client.get(f"/api/lectures/{lec_id}")
    assert backend_resp.status_code == 200
    backend_assets = {a["id"]: a for a in backend_resp.json()["assets"]}

    # Simulate direct Supabase raw database output for this lecture
    raw_supabase_assets = [
        {
            "id": setup_pdf_assets["telegram_pdf_id"],
            "asset_type": "original_pdf",
            "title": "telegram.pdf",
            "file_size_bytes": 1000,
            "telegram_file_id": "tg_file_id",
            "telegram_message_id": 88881,
            "has_telegram": True,
            "is_available": True
        },
        {
            "id": setup_pdf_assets["original_pdf_id"],
            "asset_type": "original_pdf",
            "title": "local.pdf",
            "file_size_bytes": 2000,
            "telegram_file_id": None,
            "telegram_message_id": None,
            "has_telegram": False,
            "is_available": False
        },
        {
            "id": setup_pdf_assets["missing_storage_id"],
            "asset_type": "original_pdf",
            "title": "phantom.pdf",
            "file_size_bytes": 5242880,
            "telegram_file_id": None,
            "telegram_message_id": None,
            "has_telegram": False,
            "is_available": False
        },
        {
            "id": setup_pdf_assets["no_metadata_id"],
            "asset_type": "original_pdf",
            "title": "empty.pdf",
            "file_size_bytes": None,
            "telegram_file_id": None,
            "telegram_message_id": None,
            "has_telegram": False,
            "is_available": False
        }
    ]

    # Apply reconciliation logic from frontend/src/lib/supabase.ts
    reconciled_supabase_assets = []
    for a in raw_supabase_assets:
        copy_a = dict(a)
        if not copy_a["has_telegram"] and copy_a["id"] in backend_assets:
            copy_a["is_available"] = backend_assets[copy_a["id"]]["is_available"]
        reconciled_supabase_assets.append(copy_a)

    reconciled_by_id = {a["id"]: a for a in reconciled_supabase_assets}

    def is_available_check(a):
        if isinstance(a.get("is_available"), bool):
            return a["is_available"]
        return bool(a.get("has_telegram") or a.get("telegram_file_id") or a.get("telegram_message_id"))

    test_ids = [
        setup_pdf_assets["telegram_pdf_id"],
        setup_pdf_assets["original_pdf_id"],
        setup_pdf_assets["missing_storage_id"],
        setup_pdf_assets["no_metadata_id"]
    ]

    for asset_id in test_ids:
        b_val = is_available_check(backend_assets[asset_id])
        s_val = is_available_check(reconciled_by_id[asset_id])
        assert b_val == s_val, f"Asset #{asset_id} availability mismatch: backend={b_val}, supabase={s_val}"

    # Specific assertions
    # 1. Telegram-backed -> True in both
    assert is_available_check(backend_assets[setup_pdf_assets["telegram_pdf_id"]]) is True
    assert is_available_check(reconciled_by_id[setup_pdf_assets["telegram_pdf_id"]]) is True

    # 2. Valid approved local-only file -> True in both
    assert is_available_check(backend_assets[setup_pdf_assets["original_pdf_id"]]) is True
    assert is_available_check(reconciled_by_id[setup_pdf_assets["original_pdf_id"]]) is True

    # 3. Phantom file with size metadata -> False in both
    assert is_available_check(backend_assets[setup_pdf_assets["missing_storage_id"]]) is False
    assert is_available_check(reconciled_by_id[setup_pdf_assets["missing_storage_id"]]) is False

    # 4. Missing metadata -> False in both
    assert is_available_check(backend_assets[setup_pdf_assets["no_metadata_id"]]) is False
    assert is_available_check(reconciled_by_id[setup_pdf_assets["no_metadata_id"]]) is False
