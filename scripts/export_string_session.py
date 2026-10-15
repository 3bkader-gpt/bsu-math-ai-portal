import asyncio
from telethon import TelegramClient
from telethon.sessions import StringSession

API_ID = 23966686
API_HASH = "0ba67a50ec826a4bbb5eb6a80c369bfc"

async def main():
    client = TelegramClient("academic_telethon", API_ID, API_HASH)
    await client.connect()
    if not await client.is_user_authorized():
        print("Not authorized")
        return
    s = StringSession.save(client.session)
    print("---STRING_SESSION_START---")
    print(s)
    print("---STRING_SESSION_END---")
    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
