import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from app.config import settings
from app.db.database import get_db
from app.db.models import MediaAsset
from app.services.telegram_storage import telegram_storage

router = APIRouter(prefix="/api", tags=["Media Streaming"])

CHUNK_SIZE = 1024 * 1024  # 1MB chunk

def is_safe_path(p: Path) -> bool:
    """Verifies that the requested file path resides strictly within approved storage boundaries."""
    try:
        resolved = p.resolve()
        media_resolved = settings.MEDIA_DIR.resolve()
        college_resolved = settings.COLLEGE_DIR.resolve()
        return (media_resolved == resolved or media_resolved in resolved.parents or
                college_resolved == resolved or college_resolved in resolved.parents)
    except Exception:
        return False

def range_stream_file(file_path: Path, start: int, end: int):
    with open(file_path, "rb") as f:
        f.seek(start)
        bytes_to_read = end - start + 1
        while bytes_to_read > 0:
            chunk = f.read(min(CHUNK_SIZE, bytes_to_read))
            if not chunk:
                break
            bytes_to_read -= len(chunk)
            yield chunk

@router.get("/stream/{asset_id}")
async def stream_media_asset(asset_id: int, request: Request, db: Session = Depends(get_db)):
    """
    Streams media assets (Audio, Video, PDF, Markdown) with HTTP Range support (206)
    allowing smooth seeking in HTML5 audio and video players.
    """
    asset = db.query(MediaAsset).filter(MediaAsset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # 1. If content_text is cached in database, return text directly
    if asset.content_text:
        return Response(content=asset.content_text, media_type="text/plain; charset=utf-8")

    # 2. If telegram_file_id is available, redirect (307) immediately to Telegram's global CDN
    if asset.telegram_file_id:
        tg_url = await telegram_storage.get_direct_download_url(asset.telegram_file_id)
        if tg_url:
            return Response(status_code=307, headers={"Location": tg_url})

    local_path = Path(asset.local_file_path) if asset.local_file_path else None

    # Validate path safety
    if local_path and not is_safe_path(local_path):
        raise HTTPException(status_code=403, detail="Access to specified file path is forbidden")

    # If it's markdown or json on disk, serve as text
    if asset.asset_type in {"quiz_md", "study_guide_md", "flashcards_md", "mind_map_json"}:
        if local_path and local_path.exists():
            with open(local_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            return Response(content=content, media_type="text/plain; charset=utf-8")

    # 3. Fallback to local file streaming only if Telegram is unavailable
    if local_path and local_path.exists():
        file_size = local_path.stat().st_size
        range_header = request.headers.get("Range")

        media_types = {
            "audio": "audio/mp4",
            "video": "video/mp4",
            "pdf": "application/pdf"
        }
        content_type = media_types.get(asset.asset_type, "application/octet-stream")

        if range_header:
            # Parse Range: bytes=start-end
            range_val = range_header.strip().replace("bytes=", "")
            parts = range_val.split("-")
            start = int(parts[0]) if parts[0] else 0
            end = int(parts[1]) if len(parts) > 1 and parts[1] else file_size - 1

            if start >= file_size:
                raise HTTPException(status_code=416, detail="Requested Range Not Satisfiable")

            headers = {
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(end - start + 1),
                "Content-Type": content_type
            }
            return StreamingResponse(
                range_stream_file(local_path, start, end),
                status_code=206,
                headers=headers
            )
        else:
            return FileResponse(
                path=str(local_path),
                media_type=content_type,
                headers={"Accept-Ranges": "bytes"}
            )

    # If only telegram_file_id is available, redirect to direct Telegram download URL
    if asset.telegram_file_id:
        tg_url = await telegram_storage.get_direct_download_url(asset.telegram_file_id)
        if tg_url:
            return Response(status_code=307, headers={"Location": tg_url})

    raise HTTPException(status_code=404, detail="Media file content is unavailable")
