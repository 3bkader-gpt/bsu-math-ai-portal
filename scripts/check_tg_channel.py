import os, sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.stdout.reconfigure(encoding='utf-8')
import asyncio

from telethon import TelegramClient
from telethon.sessions import StringSession
from app.config import settings

async def main():
    client = TelegramClient(StringSession(settings.TELETHON_SESSION_STRING), settings.TELEGRAM_API_ID, settings.TELEGRAM_API_HASH)
    await client.connect()
    if not await client.is_user_authorized():
        print("Telegram not authorized")
        return
    channel_id = int(settings.TELEGRAM_CHANNEL_ID)
    channel = await client.get_entity(channel_id)
    print("Connected to channel:", getattr(channel, "title", str(channel)))

    
    media_messages = []
    async for msg in client.iter_messages(channel, limit=200):
        if msg.media:
            kind = "unknown"
            if msg.voice or msg.audio: kind = "audio"
            elif msg.video: kind = "video"
            elif msg.document: kind = "document"
            media_messages.append({
                "id": msg.id,
                "date": str(msg.date),
                "kind": kind,
                "text": (msg.text or "")[:60].replace("\n", " ")
            })
    print(f"Found {len(media_messages)} media messages in Telegram channel:")
    for m in media_messages[:20]:
        print(f"Msg #{m['id']} | {m['kind']} | {m['text']}")
    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
