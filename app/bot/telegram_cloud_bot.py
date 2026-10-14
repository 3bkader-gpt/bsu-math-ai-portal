import asyncio
import json
import logging
import os
import re
import sys
from pathlib import Path
import httpx
from dotenv import dotenv_values

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger("TelegramCloudBot")

env_path = Path(__file__).resolve().parent.parent.parent / ".env"
env_vars = dotenv_values(env_path) if env_path.exists() else os.environ

BOT_TOKEN = env_vars.get("TELEGRAM_BOT_TOKEN")
GITHUB_TOKEN = env_vars.get("GITHUB_PAT") or os.environ.get("GITHUB_PAT", "")
GITHUB_REPO = "3bkader-gpt/bsu-math-ai-portal"
TELEGRAM_API = f"https://api.telegram.org/bot{BOT_TOKEN}"

SUBJECTS = [
    "ديناميكا 2",
    "معادلات تفاضلية",
    "هندسه تفاضلية",
    "فلسفه وتاريخ رياضيات",
    "نظريه عدد ومنطق",
    "تعليم ورياده اعمال",
    "استاتيكا2",
    "اداره معرفه",
    "كهربيه مغناطيسية وتيار متردد",
    "تدريس مصغر",
    "تكنولوجيا والتحول الرقمي"
]

# In-memory pending uploads: {user_id: {"file_id": ..., "file_name": ...}}
PENDING_UPLOADS = {}

async def send_msg(chat_id: int | str, text: str, reply_markup: dict | None = None):
    url = f"{TELEGRAM_API}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown"
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    async with httpx.AsyncClient(timeout=10.0) as client:
        await client.post(url, json=payload)

async def trigger_github_workflow(subject: str, lecture_num: int, title: str, doctor: str, pdf_url: str, notify_chat_id: str):
    url = f"https://api.github.com/repos/{GITHUB_REPO}/actions/workflows/process_lecture.yml/dispatches"
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }
    payload = {
        "ref": "main",
        "inputs": {
            "subject": subject,
            "lecture_num": str(lecture_num),
            "title": title or "",
            "doctor": doctor or "",
            "pdf_url": pdf_url,
            "notify_chat_id": str(notify_chat_id)
        }
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(url, headers=headers, json=payload)
        if resp.status_code == 204:
            logger.info("Successfully triggered GitHub Actions workflow!")
            return True
        else:
            logger.error(f"GitHub API Error: {resp.status_code} - {resp.text}")
            return False

async def get_telegram_file_url(file_id: str) -> str:
    url = f"{TELEGRAM_API}/getFile?file_id={file_id}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url)
        data = resp.json()
        if data.get("ok"):
            file_path = data["result"]["file_path"]
            return f"https://api.telegram.org/file/bot{BOT_TOKEN}/{file_path}"
    raise RuntimeError("Failed to resolve file URL from Telegram")

def parse_caption_info(caption: str):
    sub = None
    for s in SUBJECTS:
        if s in caption:
            sub = s
            break
    
    num = None
    num_match = re.search(r'(\d+)', caption)
    if num_match:
        num = int(num_match.group(1))

    doc = None
    doc_match = re.search(r'(د[./\s]+[\u0621-\u064A]+(?:\s+[\u0621-\u064A]+)?)', caption)
    if doc_match:
        doc = doc_match.group(1).strip()

    return sub, num, doc

async def handle_update(update: dict):
    msg = update.get("message")
    if not msg:
        return

    chat_id = msg["chat"]["id"]
    text = msg.get("text", "")
    caption = msg.get("caption", "")
    doc = msg.get("document")

    # 1. Start Command
    if text == "/start":
        welcome = (
            "👋 **أهلاً بك في بوت الرفع السحابي الذكي لكلية التربية رياضيات!**\n\n"
            "📲 **طريقة الاستخدام:**\n"
            "فقط أرسل أو اعمل فورورد لأي ملف PDF لمحاضرة جديدة من الواتساب هنا، واكتب في الكابشن مثلاً:\n"
            "`ديناميكا 4 د/ مروة`\n\n"
            "السيرفر السحابي هيستلم الملف فوراً ويشغل خط الإنتاج الكامل (كويز، تلخيص، بودكاست مصري، خريطة مفاهيم) ويرفعه للموقع للطلاب 100% بدون أي حاجة لفتح الكمبيوتر! 🚀"
        )
        await send_msg(chat_id, welcome)
        return

    # 2. Document (PDF) received
    if doc:
        mime = doc.get("mime_type", "")
        file_name = doc.get("file_name", "lecture.pdf")
        if not (mime == "application/pdf" or file_name.lower().endswith(".pdf")):
            await send_msg(chat_id, "⚠️ يرجى إرسال ملف بصيغة PDF صالحة.")
            return

        file_id = doc["file_id"]
        sub, num, doctor = parse_caption_info(caption)

        if sub and num:
            # Auto-trigger directly!
            await send_msg(chat_id, f"⏳ **جاري تحضير الرابط السحابي وإطلاق المعالجة لـ {sub} (محاضرة {num})...**")
            try:
                pdf_url = await get_telegram_file_url(file_id)
                ok = await trigger_github_workflow(
                    subject=sub,
                    lecture_num=num,
                    title="",
                    doctor=doctor or "",
                    pdf_url=pdf_url,
                    notify_chat_id=str(chat_id)
                )
                if ok:
                    msg_ok = (
                        f"🚀 **تم إطلاق خط الإنتاج السحابي بنجاح!**\n\n"
                        f"📚 **المادة:** {sub}\n"
                        f"📌 **المحاضرة:** {num}\n"
                        f"👨‍🏫 **الدكتور:** {doctor or 'عام'}\n\n"
                        f"⚡ المعالجة تعمل الآن بالكامل على سيرفرات GitHub السحابية.\n"
                        f"تقدر تقفل موبايلك والكمبيوتر، وهيوصلك إشعار هنا فور اكتمالها ورفعها للموقع! 🫡"
                    )
                    await send_msg(chat_id, msg_ok)
                else:
                    await send_msg(chat_id, "❌ حدث خطأ أثناء تشغيل السيرفر السحابي. يرجى المحاولة لاحقاً.")
            except Exception as e:
                await send_msg(chat_id, f"❌ خطأ: {e}")
        else:
            # Store pending and ask for subject
            PENDING_UPLOADS[chat_id] = {
                "file_id": file_id,
                "file_name": file_name,
                "caption": caption
            }
            keyboard = {
                "keyboard": [
                    [{"text": "ديناميكا 2"}, {"text": "معادلات تفاضلية"}],
                    [{"text": "هندسه تفاضلية"}, {"text": "فلسفه وتاريخ رياضيات"}],
                    [{"text": "نظريه عدد ومنطق"}, {"text": "تعليم ورياده اعمال"}],
                    [{"text": "استاتيكا2"}, {"text": "اداره معرفه"}],
                    [{"text": "كهربيه مغناطيسية وتيار متردد"}]
                ],
                "one_time_keyboard": True,
                "resize_keyboard": True
            }
            await send_msg(chat_id, "📄 **تم استلام ملف المحاضرة!**\nيرجى اختيار المادة من الأزرار بالأسفل، أو كتابة اسم المادة ورقمها (مثال: `ديناميكا 4 د/ مروة`):", reply_markup=keyboard)
        return

    # 3. User responds with subject name
    if chat_id in PENDING_UPLOADS:
        pending = PENDING_UPLOADS[chat_id]
        sub, num, doctor = parse_caption_info(text)

        if text in SUBJECTS:
            sub = text

        if not sub:
            await send_msg(chat_id, "⚠️ لم يتم التعرف على اسم المادة. يرجى اختيار مادة صالحة من الأزرار.")
            return

        if not num:
            pending["subject"] = sub
            await send_msg(chat_id, f"📌 تم تحديد مادة **{sub}**.\nاكتب الآن رقم المحاضرة (مثال: `4` أو `4 د/ مروة`):")
            return

        # Both sub and num known!
        file_id = pending["file_id"]
        del PENDING_UPLOADS[chat_id]

        await send_msg(chat_id, f"⏳ **جاري إطلاق خط الإنتاج السحابي لـ {sub} (المحاضرة {num})...**")
        try:
            pdf_url = await get_telegram_file_url(file_id)
            ok = await trigger_github_workflow(
                subject=sub,
                lecture_num=num,
                title="",
                doctor=doctor or "",
                pdf_url=pdf_url,
                notify_chat_id=str(chat_id)
            )
            if ok:
                msg_ok = (
                    f"🚀 **تم إطلاق خط الإنتاج السحابي بنجاح!**\n\n"
                    f"📚 **المادة:** {sub}\n"
                    f"📌 **المحاضرة:** {num}\n"
                    f"👨‍🏫 **الدكتور:** {doctor or 'عام'}\n\n"
                    f"⚡ المعالجة تعمل الآن بالكامل على سيرفرات GitHub السحابية.\n"
                    f"تقدر تقفل جهازك وموبايلك، وهيوصلك إشعار هنا فور اكتمالها ورفعها للموقع! 🫡"
                )
                await send_msg(chat_id, msg_ok, reply_markup={"remove_keyboard": True})
            else:
                await send_msg(chat_id, "❌ حدث خطأ في التواصل مع سيرفر GitHub.", reply_markup={"remove_keyboard": True})
        except Exception as e:
            await send_msg(chat_id, f"❌ خطأ: {e}", reply_markup={"remove_keyboard": True})

async def poll_telegram():
    logger.info("Starting Telegram Cloud Bot Poller...")
    offset = 0
    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            try:
                resp = await client.get(f"{TELEGRAM_API}/getUpdates", params={"offset": offset, "timeout": 20})
                data = resp.json()
                if data.get("ok"):
                    for update in data.get("result", []):
                        offset = update["update_id"] + 1
                        asyncio.create_task(handle_update(update))
            except Exception as e:
                logger.warning(f"Polling update error: {e}")
                await asyncio.sleep(3)

if __name__ == "__main__":
    if not BOT_TOKEN:
        print("Error: TELEGRAM_BOT_TOKEN not configured!")
        sys.exit(1)
    asyncio.run(poll_telegram())
