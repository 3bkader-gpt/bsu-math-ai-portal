import asyncio
from pathlib import Path
from app.services.telegram_storage import telegram_storage

async def main():
    test_file = Path(r"D:\الكليه\subjects\هندسه تفاضلية\lec1\notebooklm_output\quiz.md")
    print(f"Testing upload of {test_file.name} to Telegram...")
    res = await telegram_storage.upload_asset(test_file, "quiz_md", "📝 اختبار تجريبي لمنصة المحاضرات")
    print("Storage mode:", res.get("storage_mode"))
    print("Telegram Message ID:", res.get("telegram_message_id"))
    print("Telegram File ID:", res.get("telegram_file_id"))
    print("File size:", res.get("file_size"))

if __name__ == "__main__":
    asyncio.run(main())
