import asyncio
import logging
import os
import shutil
from pathlib import Path
import httpx
from app.config import settings

logger = logging.getLogger("telegram_storage")

# Bot API HTTP uploads are hard-capped at 50MB; files above this threshold
# must go through Telethon MTProto (up to 2GB). 45MB keeps a safety margin.
BOT_API_SAFE_LIMIT = 45 * 1024 * 1024

class TelegramStorageService:
    def __init__(self):
        self.bot_token = settings.TELEGRAM_BOT_TOKEN
        self.channel_id = settings.TELEGRAM_CHANNEL_ID
        self.is_configured = bool(self.bot_token and self.channel_id)
        self.api_base = f"https://api.telegram.org/bot{self.bot_token}" if self.bot_token else ""

    async def upload_asset(self, file_path: Path, asset_type: str, caption: str = "") -> dict:
        """
        Uploads a generated asset to the Telegram storage channel.
        Large files (audio/video over the Bot API cap) go through Telethon
        MTProto; everything else uses the Bot API HTTP endpoints.
        Falls back to local file storage if Telegram credentials are not yet set.
        """
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        file_size = file_path.stat().st_size

        # If Telegram is not configured yet, store locally in media_storage
        if not self.is_configured:
            target_dir = settings.MEDIA_DIR / asset_type
            target_dir.mkdir(parents=True, exist_ok=True)
            target_file = target_dir / file_path.name
            shutil.copy2(file_path, target_file)
            return {
                "storage_mode": "local",
                "local_file_path": str(target_file),
                "telegram_file_id": None,
                "telegram_message_id": None,
                "file_size": file_size,
            }

        # Media assets (audio/video) go through Telethon MTProto first:
        # the Bot API HTTP path hard-fails above 50MB (413) and has proved
        # unreliable for large multipart uploads from CI (401 mid-stream).
        # MTProto carries up to 2GB with proper streaming attributes.
        if asset_type in ("audio", "video"):
            from app.services.telethon_service import telethon_streamer
            mtproto_result = await telethon_streamer.upload_to_channel(file_path, caption)
            if mtproto_result:
                return mtproto_result
            logger.warning("MTProto upload failed for %s; trying Bot API fallback", file_path.name)
        # Documents larger than the Bot API cap cannot be carried at all
        elif file_size > BOT_API_SAFE_LIMIT:
            from app.services.telethon_service import telethon_streamer
            mtproto_result = await telethon_streamer.upload_to_channel(file_path, caption)
            if mtproto_result:
                return mtproto_result

        # Telegram upload via Bot API
        endpoint_map = {
            "audio": "sendAudio",
            "video": "sendVideo",
            "pdf": "sendDocument",
            "quiz_md": "sendDocument",
            "study_guide_md": "sendDocument",
            "flashcards_md": "sendDocument",
            "mind_map_json": "sendDocument",
        }
        action = endpoint_map.get(asset_type, "sendDocument")
        url = f"{self.api_base}/{action}"

        field_name = "audio" if action == "sendAudio" else ("video" if action == "sendVideo" else "document")

        last_error = None
        for attempt in range(1, 4):
            try:
                async with httpx.AsyncClient(timeout=300.0) as client:
                    with open(file_path, "rb") as f:
                        files = {field_name: (file_path.name, f)}
                        data = {
                            "chat_id": self.channel_id,
                            "caption": caption[:1024]
                        }
                        response = await client.post(url, data=data, files=files)
                        res_json = response.json()

                        if not res_json.get("ok"):
                            last_error = res_json.get("description")
                            await asyncio.sleep(2 * attempt)
                            continue

                        result = res_json["result"]
                        msg_id = result["message_id"]

                        # Extract file_id
                        file_id = None
                        if "audio" in result:
                            file_id = result["audio"]["file_id"]
                        elif "video" in result:
                            file_id = result["video"]["file_id"]
                        elif "document" in result:
                            file_id = result["document"]["file_id"]

                        return {
                            "storage_mode": "telegram",
                            "local_file_path": str(file_path),
                            "telegram_file_id": file_id,
                            "telegram_message_id": msg_id,
                            "file_size": file_size,
                        }
            except Exception as e:
                last_error = str(e)
                await asyncio.sleep(3 * attempt)

        # Fallback to local on API error or network exception
        target_dir = settings.MEDIA_DIR / asset_type
        target_dir.mkdir(parents=True, exist_ok=True)
        target_file = target_dir / file_path.name
        shutil.copy2(file_path, target_file)
        return {
            "storage_mode": "local_fallback",
            "local_file_path": str(target_file),
            "telegram_file_id": None,
            "telegram_message_id": None,
            "file_size": file_size,
            "warning": last_error
        }

    async def get_direct_download_url(self, file_id: str) -> str | None:
        """
        Retrieves the direct download URL for a file from the Telegram Bot API getFile endpoint.
        Returns https://api.telegram.org/file/bot<token>/<file_path> or None if not available.
        """
        if not self.is_configured or not file_id:
            return None

        url = f"{self.api_base}/getFile?file_id={file_id}"
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    if data.get("ok"):
                        file_path = data.get("result", {}).get("file_path")
                        if file_path:
                            return f"https://api.telegram.org/file/bot{self.bot_token}/{file_path}"
        except Exception:
            return None
        return None

    async def stream_file_bytes(self, file_id: str, range_header: str | None = None):
        """
        Streams file bytes from Telegram Bot API internally without exposing the bot token to the client.
        Returns a tuple of (httpx.Response, httpx.AsyncClient) or (None, None).
        Caller must close both response and client when done.
        """
        download_url = await self.get_direct_download_url(file_id)
        if not download_url:
            return None, None

        headers = {}
        if range_header:
            headers["Range"] = range_header

        client = httpx.AsyncClient(timeout=120.0)
        try:
            req = client.build_request("GET", download_url, headers=headers)
            response = await client.send(req, stream=True)
            return response, client
        except Exception:
            await client.aclose()
            return None, None

telegram_storage = TelegramStorageService()
