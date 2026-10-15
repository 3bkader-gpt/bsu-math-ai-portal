import asyncio
import sys
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from telethon import TelegramClient
from telethon.sessions import StringSession

API_ID = 23966686
API_HASH = "0ba67a50ec826a4bbb5eb6a80c369bfc"
CHANNEL_ID = -1004453609138
SESSION_STR = "1BJWap1wBu67_sQPEvGKlkbPdSoKebLWw2LSx3aqpvEuFlg6W2YM_FBMECbwKoBeZvmOfHmb2IrgRX8zUdAJGL--3JlV8EsyAmwl_q0PAt3V9pafsX350j8q0FXXUJIp3_yH8MerFnG0fP0d-Lt65D6F9yP_G1p84WPXZRibOTEH2KU5aER9ZzKC9_MtIQF5ZuSDzVDvN_uuBcyXtFgZ2jK5ejEE7qbGMIqSiyEz6qyyLP4UFwppqqtJHXmBavSN6xJpweXF5xBPVIXtXtmrKgv0w8ib2deiZS3vcJ6WIXhZvAUztDcewzTevqD0XpeM1KeStLkON4sVFWgx-Xz3k10qnjCSa5GY="

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
