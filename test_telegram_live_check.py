import sys
import httpx
from app.config import settings

sys.stdout.reconfigure(encoding='utf-8')

print("=" * 60)
print("CHECK 3: TELEGRAM BOT API & FILE_ID VERIFICATION")
print("=" * 60)

bot_token = settings.TELEGRAM_BOT_TOKEN
print(f"Bot Token Configured: {bot_token[:10]}...{bot_token[-5:]}")

# 1. Test getMe to confirm Bot identity and auth
url_me = f"https://api.telegram.org/bot{bot_token}/getMe"
r_me = httpx.get(url_me, timeout=10)
print(f"getMe Status: {r_me.status_code}")
res_me = r_me.json()
print(f"Bot Username: @{res_me['result']['username']}")
print(f"Bot Name: {res_me['result']['first_name']}")
print(f"Bot ID: {res_me['result']['id']}")

# 2. Test getFile on the live quiz.md file_id uploaded in earlier phase
file_id = "BQACAgQAAxkDAAMEas0kX3p06nVrK2UO-Lw-pXeep5EAAgUvAAJIu2lSFRNYkxbQNgk9BA"
print(f"\nQuerying Telegram getFile for file_id: {file_id[:20]}...")

url_file = f"https://api.telegram.org/bot{bot_token}/getFile?file_id={file_id}"
r_file = httpx.get(url_file, timeout=10)
print(f"getFile Status: {r_file.status_code}")
res_file = r_file.json()

if res_file.get("ok"):
    file_info = res_file["result"]
    print("Telegram File Metadata Retrieved Successfully! 🎉")
    print(f"  - File ID: {file_info['file_id']}")
    print(f"  - File Path on Telegram Servers: {file_info['file_path']}")
    print(f"  - File Size: {file_info['file_size']} bytes")
    download_url = f"https://api.telegram.org/file/bot{bot_token}/{file_info['file_path']}"
    print(f"  - Direct Download URL: https://api.telegram.org/file/bot{bot_token[:10]}.../{file_info['file_path']}")
    
    # Download sample bytes to confirm download works
    r_dl = httpx.get(download_url, timeout=10)
    print(f"  - Download Test Status: {r_dl.status_code} OK (Downloaded {len(r_dl.content)} bytes)")
    print(f"  - First 100 chars of file:\n{r_dl.text[:100]}...")
else:
    print("getFile failed:", res_file)
