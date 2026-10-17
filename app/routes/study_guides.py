"""FastAPI router for Academic Study Guide operations and PDF export."""

import logging
import re
import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import MediaAsset, Lecture
from app.services.typst_service import (
    markdown_to_typst_pdf,
    TypstServiceError,
    InputSizeExceededError,
    MAX_INPUT_CHARS
)

logger = logging.getLogger("study_guides_router")

router = APIRouter(prefix="/api/study-guides", tags=["Study Guides"])


def build_study_guide_content_disposition(title: str | None, lecture_id: int | None = None) -> str:
    """
    Constructs an RFC 6266 / RFC 5987 compliant Content-Disposition header value
    for study guide PDF downloads, ensuring safe ASCII fallback and full UTF-8 Arabic title support.
    """
    raw_title = (title or "").strip()
    # Strip CR, LF, nulls, control characters, double quotes, slashes, and backslashes
    cleaned = re.sub(r'[\r\n\x00"\\/]', '', raw_title).strip()
    # Remove existing trailing .pdf extension if present
    cleaned = re.sub(r'\.pdf$', '', cleaned, flags=re.IGNORECASE).strip()
    # Eliminate any directory traversal dots
    cleaned = re.sub(r'\.{2,}', '', cleaned).strip()

    if not cleaned:
        cleaned = f"study_guide_lecture_{lecture_id or 'file'}"

    final_unicode_name = f"{cleaned}.pdf"

    # ASCII-safe fallback for older clients
    ascii_clean = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', cleaned).strip('._')
    ascii_clean = re.sub(r'_+', '_', ascii_clean).strip('._')
    if not ascii_clean or len(ascii_clean) < 3 or ascii_clean.isdigit():
        ascii_clean = f"study_guide_lecture_{lecture_id or 'file'}"
    ascii_filename = f"{ascii_clean}.pdf"

    # RFC 5987 percent-encoding for UTF-8
    encoded_filename = urllib.parse.quote(final_unicode_name, encoding='utf-8')

    return f'attachment; filename="{ascii_filename}"; filename*=UTF-8\'\'{encoded_filename}'


@router.get("/{asset_id}/pdf")
async def download_study_guide_pdf(
    asset_id: int,
    db: Session = Depends(get_db)
):
    """
    Compiles an AI-generated study guide asset (`study_guide_md`) into an academic PDF
    using Typst on the backend and returns the compiled PDF as a downloadable attachment.
    """
    # 1. Look up the asset in the database
    asset = db.query(MediaAsset).filter(MediaAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Study guide asset not found")

    # 2. Verify asset type is study_guide_md
    if asset.asset_type != "study_guide_md":
        raise HTTPException(status_code=422, detail="Requested asset is not a study guide")

    # 3. Verify usable content_text exists
    content_text = asset.content_text
    if not content_text or not content_text.strip():
        raise HTTPException(status_code=422, detail="Study guide content is empty")

    # 4. Check maximum input length
    if len(content_text) > MAX_INPUT_CHARS:
        raise HTTPException(status_code=422, detail="Study guide content exceeds maximum allowed size")

    # 5. Fetch associated lecture to create a descriptive filename and resolve lecture number
    lecture = db.query(Lecture).filter(Lecture.id == asset.lecture_id).first() if asset.lecture_id else None
    lecture_num = lecture.lecture_num if lecture else None

    raw_title = lecture.title if (lecture and lecture.title) else (asset.title or "دليل_الدراسة")
    clean_title = re.sub(r'^(المحاضرة|محاضرة)\s*\d+\s*[:\-]\s*', '', raw_title).strip()
    clean_title = re.sub(r'^(الدليل|دليل)\s+(الدراسي|الدراسة|دراسي|دراسة)?\s*(الشامل|شامل)?\s*[:\-]?\s*', '', clean_title).strip()

    if lecture_num is not None:
        title_for_file = f"المحاضرة {lecture_num} - {clean_title}"
    else:
        title_for_file = clean_title or f"study_guide_lecture_{asset.lecture_id}"

    disposition = build_study_guide_content_disposition(title_for_file, asset.lecture_id)

    # 6. Compile Markdown to Typst PDF with lecture number in document title
    try:
        pdf_bytes = markdown_to_typst_pdf(content_text, lecture_num=lecture_num)
    except InputSizeExceededError:
        raise HTTPException(status_code=422, detail="Study guide content exceeds maximum allowed size")
    except TypstServiceError as e:
        logger.error(f"Error generating PDF for study guide asset {asset_id}: {e}")
        # Never expose compiler internals or filesystem paths to clients
        raise HTTPException(status_code=500, detail="Failed to compile study guide PDF")
    except Exception as e:
        logger.error(f"Unexpected error compiling study guide {asset_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="An error occurred while generating the study guide PDF")

    # 7. Return PDF response with headers
    headers = {
        "Content-Disposition": disposition,
        "Content-Length": str(len(pdf_bytes)),
    }

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers=headers
    )
