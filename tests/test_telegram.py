import httpx

from app.config import settings

token = settings.TELEGRAM_BOT_TOKEN
chat_id = settings.TELEGRAM_CHANNEL_ID

with httpx.Client(timeout=30.0) as client:
    r_me = client.get(f"https://api.telegram.org/bot{token}/getMe")
    me_data = r_me.json()
    if me_data.get("ok"):
        bot_user = me_data["result"]["username"]
        print(f"Bot connected: @{bot_user} (ID: {me_data['result']['id']})")
    else:
        print("Failed to get bot info:", me_data)

    msg_url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": "🚀 تم تفعيل وربط سحابة التخزين التابعة لمنصة المحاضرات الجامعية بنجاح!"
    }
    r_msg = client.post(msg_url, json=payload)
    msg_data = r_msg.json()
    if msg_data.get("ok"):
        print(f"Message sent successfully! Message ID: {msg_data['result']['message_id']}")
    else:
        print("Failed to send message:", msg_data)
