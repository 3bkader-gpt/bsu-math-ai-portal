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
    for mid in range(1, 11):
        m = await client.get_messages(CHANNEL_ID, ids=mid)
        if m and m.media:
            fname = getattr(m.file, 'name', '') if m.file else ''
            print(f"Msg #{m.id} | {fname} | {m.text[:40] if m.text else ''}")
    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
