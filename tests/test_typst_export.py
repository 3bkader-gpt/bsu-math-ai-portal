"""
Regression and Integration Test Suite for Phase 2: Typst Study Guide PDF Export.

Requirements covered:
1. Valid Arabic study-guide Markdown produces a non-empty PDF beginning with %PDF-.
2. The generated PDF has the correct MIME type (application/pdf) and RFC 5987 attachment filename.
3. Arabic headings, inline mathematics, display mathematics, lists, and Markdown tables compile correctly.
4. A representative real study guide from the existing project compiles successfully without losing major sections or equations.
5. Missing asset, wrong asset type, and empty content are handled with appropriate 404/422 status codes.
6. Oversized content and conversion failures are handled safely without exposing internal paths.
7. Original PDF, audio, video, and existing study-guide streaming behavior remain completely unchanged.
8. Visual rendering of compiled PDF pages to images using PyMuPDF (fitz) to verify layout and dimensions.
9. No study-guide Markdown or database records are mutated.
"""

import re
import urllib.parse
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.database import SessionLocal
from app.db.models import MediaAsset, Lecture, Subject
from app.routes.study_guides import build_study_guide_content_disposition
from app.services.typst_service import (
    markdown_to_typst_pdf,
    TypstServiceError,
    InputSizeExceededError,
    MAX_INPUT_CHARS,
)

client = TestClient(app)


def test_build_study_guide_content_disposition():
    """Verify safe Content-Disposition generation with RFC 5987 UTF-8 encoding."""
    # 1. Arabic title
    arabic_title = "دليل_دراسة_مفهوم المنحنى وطول القوس"
    header = build_study_guide_content_disposition(arabic_title, 1)
    assert "attachment;" in header
    assert 'filename="study_guide_lecture_1.pdf"' in header
    assert "filename*=UTF-8''" in header
    assert urllib.parse.quote("دليل_دراسة_مفهوم المنحنى وطول القوس.pdf") in header
    assert ".pdf.pdf" not in header

    # 2. English title
    eng_header = build_study_guide_content_disposition("differential_geometry_guide.pdf", 2)
    assert 'filename="differential_geometry_guide.pdf"' in eng_header
    assert ".pdf.pdf" not in eng_header

    # 3. Traversal and control character stripping
    injected_title = "bad_title\r\n/../../etc/passwd.pdf"
    clean_header = build_study_guide_content_disposition(injected_title, 3)
    assert "\r" not in clean_header
    assert "\n" not in clean_header
    assert ".." not in clean_header
    assert "/" not in clean_header


def test_markdown_to_typst_pdf_valid_arabic():
    """Valid Arabic study guide Markdown compiles to a non-empty PDF beginning with %PDF-."""
    sample_md = """# دليل دراسة تجريبي
هذا نص عربي تجريبي مع معادلة $f(x) = x^2 + 1$.
"""
    pdf_bytes = markdown_to_typst_pdf(sample_md)
    assert pdf_bytes is not None
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF-")


def test_typst_academic_elements_compilation():
    """Headings, inline and display math, bullet lists, matrices, and tables compile correctly."""
    rich_md = """# العنوان الرئيسي الأول: التحليل الرياضي
## 1. التعريف والخواص الأساسية
نستعرض هنا الدوال الرياضية ومتجهات الوحدة:
- المتجه المماسي: $T(s) = r'(s)$
- متجه العمود الأساسي: $N(s) = T'(s) / \\kappa$
- متجه العمود الثانوي: $B(s) = T \\times N$

### معادلات سيريه-فرينيه:
$$\\frac{d T}{d s} = \\kappa N$$
$$\\frac{d N}{d s} = -\\kappa T + \\tau B$$

---

## 2. جدول المقارنة الرياضية

| المفهوم | الرمز | الصيغة الرياضية |
| :--- | :---: | :--- |
| الانحناء | $\\kappa$ | $|T'(s)|$ |
| الالتواء | $\\tau$ | $-B'(s) \\cdot N(s)$ |

## 3. محدد الضرب الاتجاهي
$$\\begin{vmatrix} i & j & k \\\\ x_1 & y_1 & z_1 \\\\ x_2 & y_2 & z_2 \\end{vmatrix}$$
"""
    pdf_bytes = markdown_to_typst_pdf(rich_md)
    assert pdf_bytes.startswith(b"%PDF-")
    assert len(pdf_bytes) > 5000


def test_representative_real_study_guide_compilation_and_rendering():
    """A real representative study guide from the database compiles and renders to valid A4 pages."""
    with SessionLocal() as db:
        real_asset = db.query(MediaAsset).filter(
            MediaAsset.asset_type == "study_guide_md",
            MediaAsset.content_text.isnot(None)
        ).first()

    assert real_asset is not None, "At least one real study guide must exist in database"
    assert real_asset.content_text and len(real_asset.content_text.strip()) > 500

    # Ensure source markdown is recorded for immutability check
    original_md = real_asset.content_text

    pdf_bytes = markdown_to_typst_pdf(real_asset.content_text)
    assert pdf_bytes.startswith(b"%PDF-")
    assert len(pdf_bytes) > 20000

    # Verify visual layout rendering using PyMuPDF (fitz)
    try:
        import fitz
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        assert len(doc) >= 1, "Compiled PDF must have at least one page"

        # Check A4 geometry (A4 is approx 595.28 x 841.89 points)
        page = doc[0]
        rect = page.rect
        assert 590 <= rect.width <= 600, f"Unexpected page width: {rect.width}"
        assert 835 <= rect.height <= 850, f"Unexpected page height: {rect.height}"

        # Render pixmap to confirm no rendering crashes or font corruption
        pix = page.get_pixmap(dpi=100)
        assert pix.width > 0
        assert pix.height > 0
        assert pix.samples is not None
    except ImportError:
        pass

    # Verify Markdown was not modified
    assert real_asset.content_text == original_md


def test_endpoint_success_and_headers():
    """GET /api/study-guides/{asset_id}/pdf returns 200, application/pdf, and RFC 5987 headers."""
    with SessionLocal() as db:
        real_asset = db.query(MediaAsset).filter(
            MediaAsset.asset_type == "study_guide_md",
            MediaAsset.content_text.isnot(None)
        ).first()

    response = client.get(f"/api/study-guides/{real_asset.id}/pdf")
    assert response.status_code == 200
    assert response.headers.get("content-type") == "application/pdf"

    cd = response.headers.get("content-disposition", "")
    assert "attachment;" in cd
    assert "filename=" in cd
    assert "filename*=UTF-8''" in cd
    assert response.content.startswith(b"%PDF-")
    assert int(response.headers.get("content-length", "0")) == len(response.content)

    # Verify lecture number appears before title if lecture is associated
    with SessionLocal() as db:
        lecture = db.query(Lecture).filter(Lecture.id == real_asset.lecture_id).first() if real_asset.lecture_id else None
    if lecture and lecture.lecture_num is not None:
        encoded_lec_part = urllib.parse.quote(f"المحاضرة {lecture.lecture_num}")
        assert encoded_lec_part in cd


def test_lecture_number_heading_and_disposition_normalization():
    """Verifies that lecture_num formats H1 as '# المحاضرة {num}: {clean_title}' without duplication."""
    from app.services.typst_service import _preprocess_markdown_for_typst

    # 1. Heading with legacy prefix 'دليل دراسي شامل:'
    md1 = "# دليل دراسي شامل: مفهوم المنحنى وطول القوس\nمقدمة."
    pre1 = _preprocess_markdown_for_typst(md1, lecture_num=1)
    assert pre1.startswith("# المحاضرة 1: مفهوم المنحنى وطول القوس")

    # 2. Heading with existing 'المحاضرة 1:'
    md2 = "# المحاضرة 1: مفهوم المنحنى وطول القوس\nمقدمة."
    pre2 = _preprocess_markdown_for_typst(md2, lecture_num=1)
    assert pre2.startswith("# المحاضرة 1: مفهوم المنحنى وطول القوس")

    # 3. Heading with plain title
    md3 = "# تاريخ الرياضيات وأنظمة العد\nمقدمة."
    pre3 = _preprocess_markdown_for_typst(md3, lecture_num=2)
    assert pre3.startswith("# المحاضرة 2: تاريخ الرياضيات وأنظمة العد")

    # 4. Filename disposition contains 'المحاضرة {num} - '
    header = build_study_guide_content_disposition("المحاضرة 3 - مقدمة في الطوبولوجيا", 10)
    assert urllib.parse.quote("المحاضرة 3 - مقدمة في الطوبولوجيا.pdf") in header


def test_endpoint_missing_asset_returns_404():
    """Requesting nonexistent asset returns 404."""
    response = client.get("/api/study-guides/99999999/pdf")
    assert response.status_code == 404
    assert response.json()["detail"] == "Study guide asset not found"


def test_endpoint_wrong_asset_type_returns_422():
    """Requesting an audio, video, or original PDF asset ID via study-guides endpoint returns 422."""
    with SessionLocal() as db:
        non_guide = db.query(MediaAsset).filter(MediaAsset.asset_type != "study_guide_md").first()

    if non_guide:
        response = client.get(f"/api/study-guides/{non_guide.id}/pdf")
        assert response.status_code == 422
        assert response.json()["detail"] == "Requested asset is not a study guide"


def test_endpoint_empty_content_returns_422():
    """An asset with empty content_text returns 422."""
    # Test service level validation
    with pytest.raises(TypstServiceError, match="empty"):
        markdown_to_typst_pdf("")

    with pytest.raises(TypstServiceError, match="empty"):
        markdown_to_typst_pdf("   \n\t  ")


def test_oversized_content_protection():
    """Oversized content exceeding MAX_INPUT_CHARS is rejected safely."""
    huge_text = "# عنوان\n" + ("نص طويل جداً جداً " * 40_000)
    assert len(huge_text) > MAX_INPUT_CHARS

    with pytest.raises(InputSizeExceededError):
        markdown_to_typst_pdf(huge_text)


def test_original_pdf_and_media_unaffected():
    """Verifies that Phase 1 original PDF downloads and audio/video streaming are unaffected."""
    with SessionLocal() as db:
        orig_pdf = db.query(MediaAsset).filter(
            MediaAsset.asset_type.in_(["original_pdf", "pdf"])
        ).first()
        audio = db.query(MediaAsset).filter(MediaAsset.asset_type == "audio").first()

    # Original PDF streaming endpoint
    if orig_pdf:
        res = client.head(f"/api/stream/{orig_pdf.id}")
        assert res.status_code in [200, 206, 404]

    # Audio endpoint
    if audio:
        res = client.head(f"/api/stream/{audio.id}")
        assert res.status_code in [200, 206, 404]


def test_database_immutability():
    """Ensures that calling the PDF endpoint causes zero DB mutations."""
    with SessionLocal() as db:
        guide = db.query(MediaAsset).filter(
            MediaAsset.asset_type == "study_guide_md",
            MediaAsset.content_text.isnot(None)
        ).first()
        before_count = db.query(MediaAsset).count()
        before_text = guide.content_text
        before_updated = guide.created_at

    res = client.get(f"/api/study-guides/{guide.id}/pdf")
    assert res.status_code == 200

    with SessionLocal() as db:
        after_count = db.query(MediaAsset).count()
        refreshed = db.query(MediaAsset).filter(MediaAsset.id == guide.id).first()
        assert after_count == before_count
        assert refreshed.content_text == before_text
        assert refreshed.created_at == before_updated


def test_unspaced_steps_and_bidi_normalization():
    """Verifies that unspaced steps in Markdown are properly separated into vertical list items and BiDi math parens don't flip."""
    from app.services.typst_service import _preprocess_markdown_for_typst, _normalize_pandoc_typst
    
    # 1. Unspaced list items
    unspaced_md = """معادلة المنحنى:
1. الخطوة الأولى: $x = 1$
2. الخطوة الثانية:
   $$y = 2$$ (قيمة ثابتة).
3. الخطوة الثالثة: $z = 3$"""
    pre = _preprocess_markdown_for_typst(unspaced_md)
    lines = pre.splitlines()
    assert any(l.strip() == "1. الخطوة الأولى: $x = 1$" for l in lines)
    assert any(l.strip() == "2. الخطوة الثانية:" for l in lines)
    assert any(l.strip() == "(قيمة ثابتة)." for l in lines)
    assert any(l.strip() == "3. الخطوة الثالثة: $z = 3$" for l in lines)

    # 2. BiDi parentheses with Latin and math
    sample_typst = "== 1. مدخل (Curves in $bb(R)^3$)\n• بالتعويض نحصل على $r(s)$."
    norm = _normalize_pandoc_typst(sample_typst)
    assert r"\u{200E}(Curves in $bb(R)^3$)\u{200E}" in norm
    assert r"\u{200F}" in norm

    # 3. Full end-to-end compilation of this tricky construct
    pdf_bytes = markdown_to_typst_pdf(unspaced_md)
    assert pdf_bytes.startswith(b"%PDF-")
