import asyncio
import sys
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from telethon import TelegramClient

API_ID = 23966686
API_HASH = "0ba67a50ec826a4bbb5eb6a80c369bfc"
CHANNEL_ID = -1004453609138

async def main():
    client = TelegramClient("academic_telethon", API_ID, API_HASH)
    await client.connect()
    if not await client.is_user_authorized():
        print("User not authorized in academic_telethon.session")
        return
    
    entity = await client.get_entity(CHANNEL_ID)
    print(f"Connected to channel: {entity.title} (ID: {CHANNEL_ID})")
    
    messages = await client.get_messages(entity, limit=20)
    print(f"Fetched {len(messages)} recent messages from channel:")
    media_count = 0
    for m in messages:
        if m.media:
            media_count += 1
            filename = getattr(m.file, 'name', 'unnamed') if m.file else 'unnamed'
            size_mb = (m.file.size / (1024 * 1024)) if m.file and m.file.size else 0
            caption = (m.text or "").replace("\n", " ")[:40]
            print(f"  [Msg #{m.id}] {type(m.media).__name__} | File: {filename} ({size_mb:.2f} MB) | Caption: {caption}")
    print(f"Total media messages found in sample: {media_count}")
    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
