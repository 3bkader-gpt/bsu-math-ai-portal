import asyncio
import sys
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from telethon import TelegramClient
from telethon.sessions import StringSession

import os
from dotenv import load_dotenv
load_dotenv()

API_ID = int(os.getenv("TELEGRAM_API_ID", "23966686"))
API_HASH = os.getenv("TELEGRAM_API_HASH", "")
CHANNEL_ID = int(os.getenv("TELEGRAM_CHANNEL_ID", "-1004453609138"))
SESSION_STR = os.getenv("TELETHON_SESSION_STRING", "")

async def main():
    client = TelegramClient(StringSession(SESSION_STR), API_ID, API_HASH)
    await client.connect()
    entity = await client.get_entity(CHANNEL_ID)
    print("Searching channel messages...")
    async for msg in client.iter_messages(entity, limit=200):
        text = msg.text or ""
        fname = getattr(msg.file, 'name', '') if msg.file else ''
        if "تفاضلية" in text or "تفاضليه" in text or "هندسة" in text or "هندسه" in text or "quiz" in fname.lower():
            print(f"Msg #{msg.id} | File: {fname} | Caption: {text.replace(chr(10), ' ')[:70]}")
    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
