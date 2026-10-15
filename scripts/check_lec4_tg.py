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
    for mid in range(1, 11):
        m = await client.get_messages(CHANNEL_ID, ids=mid)
        if m and m.media:
            fname = getattr(m.file, 'name', '') if m.file else ''
            print(f"Msg #{m.id} | {fname} | {m.text[:40] if m.text else ''}")
    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
