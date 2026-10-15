import asyncio
import logging
from pathlib import Path
from typing import AsyncGenerator
from telethon import TelegramClient
from telethon.sessions import StringSession
from app.config import settings

logger = logging.getLogger("TelethonStreamService")

class TelethonStreamService:
    def __init__(self):
        self.api_id = settings.TELEGRAM_API_ID
        self.api_hash = settings.TELEGRAM_API_HASH
        self.channel_id = int(settings.TELEGRAM_CHANNEL_ID) if settings.TELEGRAM_CHANNEL_ID else 0
        self.session_str = settings.TELETHON_SESSION_STRING
        self.client: TelegramClient | None = None
        self._lock = asyncio.Lock()

    async def get_client(self) -> TelegramClient:
        async with self._lock:
            if self.client and self.client.is_connected():
                return self.client

            # Priority 1: Persistent Bot Token Authentication (Rock solid, immune to session revocation)
            if settings.TELEGRAM_BOT_TOKEN:
                try:
                    self.client = TelegramClient("telethon_bot_streamer", self.api_id, self.api_hash)
                    await self.client.start(bot_token=settings.TELEGRAM_BOT_TOKEN)
                    logger.info("Telethon bot client connected and authorized successfully via bot token.")
                    return self.client
                except Exception as e:
                    logger.warning(f"Bot token start failed: {e}, falling back to session string...")

            # Priority 2: StringSession fallback
            session = StringSession(self.session_str) if self.session_str else "academic_telethon"
            self.client = TelegramClient(session, self.api_id, self.api_hash)
            await self.client.connect()
            
            if not await self.client.is_user_authorized():
                logger.error("Telethon client is not authorized!")
            else:
                logger.info("Telethon client connected and authorized successfully.")
            return self.client


    async def get_file_metadata(self, message_id: int) -> dict | None:
        """Fetches file metadata (name, size, mime_type) for a message."""
        try:
            client = await self.get_client()
            msg = await client.get_messages(self.channel_id, ids=message_id)
            if not msg or not msg.media or not getattr(msg, 'file', None):
                return None
            return {
                "file_name": getattr(msg.file, 'name', 'media_file'),
                "file_size": msg.file.size,
                "mime_type": msg.file.mime_type
            }
        except Exception as e:
            logger.error(f"Error fetching metadata for msg {message_id}: {e}")
            return None

    async def stream_media_chunks(
        self,
        message_id: int,
        start: int = 0,
        end: int | None = None,
        chunk_size: int = 256 * 1024
    ) -> AsyncGenerator[bytes, None]:
        """
        Streams media chunks directly from Telegram MTProto with HTTP Range support.
        No disk writes - pure in-memory streaming.
        """
        client = await self.get_client()
        msg = await client.get_messages(self.channel_id, ids=message_id)
        if not msg or not msg.media or not getattr(msg, 'file', None):
            raise FileNotFoundError(f"Message #{message_id} has no valid media file in channel.")

        file_size = msg.file.size
        if end is None or end >= file_size:
            end = file_size - 1

        bytes_to_read = end - start + 1

        async for chunk in client.iter_download(msg.media, offset=start, request_size=chunk_size):
            if bytes_to_read <= 0:
                break
            chunk_len = len(chunk)
            if chunk_len > bytes_to_read:
                chunk = chunk[:bytes_to_read]
            bytes_to_read -= len(chunk)
            yield chunk

telethon_streamer = TelethonStreamService()
