import os
import logging
from pathlib import Path

logger = logging.getLogger("stream_router")

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from app.config import settings
from app.db.database import get_db
from app.db.models import MediaAsset
from app.services.telegram_storage import telegram_storage
from app.services.telethon_service import telethon_streamer

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

@router.api_route("/stream/{asset_id}", methods=["GET", "HEAD"])
async def stream_media_asset(
    asset_id: int,
    request: Request,
    by_message_id: bool = False,
    db: Session = Depends(get_db)
):
    """
    Streams media assets (Audio, Video, PDF, Markdown) with HTTP Range support (206)
    and HTTP HEAD probe support for HTML5 audio and video players.

    Lookup Resolution Strategy (P0-STR-01):
    1. If `by_message_id=True`, resolves strictly by `telegram_message_id`.
    2. Otherwise, resolves primarily by primary key `MediaAsset.id`.
    3. If no asset matches primary key `MediaAsset.id`, falls back to `telegram_message_id`
       to maintain backward compatibility with legacy scripts.
    Eliminates collision risks where an asset's primary key matches another asset's message ID.
    """
    if by_message_id:
        asset = db.query(MediaAsset).filter(MediaAsset.telegram_message_id == asset_id).first()
    else:
        # Primary lookup: Primary key ID (standard for frontend and API consumers)
        asset = db.query(MediaAsset).filter(MediaAsset.id == asset_id).first()
        # Fallback lookup: Only if primary key yields no match, check telegram_message_id
        if not asset:
            asset = db.query(MediaAsset).filter(MediaAsset.telegram_message_id == asset_id).first()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")


    is_head = request.method == "HEAD"

    # 1. If content_text is cached in database, return text directly
    if asset.content_text:
        headers = {"Content-Length": str(len(asset.content_text.encode('utf-8')))}
        return Response(content=b"" if is_head else asset.content_text.encode('utf-8'), media_type="text/plain; charset=utf-8", headers=headers)

    local_path = Path(asset.local_file_path) if asset.local_file_path else None

    # If it's markdown or json on disk, serve as text
    if asset.asset_type in {"quiz_md", "study_guide_md", "flashcards_md", "mind_map_json"}:
        if local_path and local_path.exists() and is_safe_path(local_path):
            with open(local_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            headers = {"Content-Length": str(len(content.encode('utf-8')))}
            return Response(content=b"" if is_head else content.encode('utf-8'), media_type="text/plain; charset=utf-8", headers=headers)

    media_types = {
        "audio": "audio/mp4",
        "video": "video/mp4",
        "pdf": "application/pdf"
    }
    content_type = media_types.get(asset.asset_type, "application/octet-stream")

    # 2. Primary Cloud Streaming: If telegram_message_id is available, stream via Telethon MTProto
    if asset.telegram_message_id:
        try:
            meta = await telethon_streamer.get_file_metadata(asset.telegram_message_id)
            if meta and meta.get("file_size"):
                file_size = meta["file_size"]
                range_header = request.headers.get("Range")

                if range_header:
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
                    if is_head:
                        return Response(status_code=206, headers=headers, media_type=content_type)

                    return StreamingResponse(
                        telethon_streamer.stream_media_chunks(asset.telegram_message_id, start, end),
                        status_code=206,
                        headers=headers
                    )
                else:
                    headers = {
                        "Content-Length": str(file_size),
                        "Accept-Ranges": "bytes",
                        "Content-Type": content_type
                    }
                    if is_head:
                        return Response(status_code=200, headers=headers, media_type=content_type)

                    return StreamingResponse(
                        telethon_streamer.stream_media_chunks(asset.telegram_message_id, 0, file_size - 1),
                        headers=headers
                    )
        except Exception as e:
            logger.error(f"Telethon streaming exception for msg {asset.telegram_message_id} (Asset #{asset.id}): {e}", exc_info=True)



    # 3. Fallback to local file streaming if present on disk
    if local_path and local_path.exists():
        if not is_safe_path(local_path):
            raise HTTPException(status_code=403, detail="Access to specified file path is forbidden")
        file_size = local_path.stat().st_size
        range_header = request.headers.get("Range")

        if range_header:
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
            if is_head:
                return Response(status_code=206, headers=headers, media_type=content_type)

            return StreamingResponse(
                range_stream_file(local_path, start, end),
                status_code=206,
                headers=headers
            )
        else:
            headers = {
                "Content-Length": str(file_size),
                "Accept-Ranges": "bytes",
                "Content-Type": content_type
            }
            if is_head:
                return Response(status_code=200, headers=headers, media_type=content_type)

            return FileResponse(
                path=str(local_path),
                media_type=content_type,
                headers={"Accept-Ranges": "bytes"}
            )


    # 4. Fallback: Telegram Bot API direct proxy streaming (Never expose bot token in client redirects!)
    if asset.telegram_file_id:
        proxy_resp, proxy_client = await telegram_storage.stream_file_bytes(
            asset.telegram_file_id,
            request.headers.get("Range")
        )
        if proxy_resp and proxy_client:
            if proxy_resp.status_code in (200, 206):
                resp_headers = {
                    "Accept-Ranges": "bytes",
                    "Content-Type": content_type
                }
                if "content-length" in proxy_resp.headers:
                    resp_headers["Content-Length"] = proxy_resp.headers["content-length"]
                if "content-range" in proxy_resp.headers:
                    resp_headers["Content-Range"] = proxy_resp.headers["content-range"]

                if is_head:
                    await proxy_resp.aclose()
                    await proxy_client.aclose()
                    return Response(status_code=proxy_resp.status_code, headers=resp_headers, media_type=content_type)

                async def proxy_generator():
                    try:
                        async for chunk in proxy_resp.aiter_bytes(chunk_size=CHUNK_SIZE):
                            yield chunk
                    finally:
                        await proxy_resp.aclose()
                        await proxy_client.aclose()

                return StreamingResponse(
                    proxy_generator(),
                    status_code=proxy_resp.status_code,
                    headers=resp_headers,
                    media_type=content_type
                )
            else:
                await proxy_resp.aclose()
                await proxy_client.aclose()

    raise HTTPException(status_code=404, detail="Media file content is unavailable")
