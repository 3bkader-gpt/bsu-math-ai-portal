import os
import sys
import httpx
from dotenv import load_dotenv

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

API_KEY = os.getenv("UPTIMEROBOT_API_KEY", "")
TARGET_URL = "https://bsu-math-api.onrender.com/docs"
MONITOR_NAME = "BSU Math API - Render Keepalive"

def setup_monitor():
    print("=" * 60)
    print("🤖 UPTIMEROBOT MONITOR SETUP & VERIFICATION")
    print("=" * 60)

    if not API_KEY:
        print("ℹ️ UPTIMEROBOT_API_KEY is not set in .env.")
        print("To connect UptimeRobot automatically:")
        print("1. Get your Main API Key from https://dashboard.uptimerobot.com/integrations")
        print("2. Add `UPTIMEROBOT_API_KEY=ur123456...` to your .env file")
        print("3. Re-run this script to automatically register the 5-minute HTTP monitor.")
        return

    # Check existing monitors
    try:
        r = httpx.post(
            "https://api.uptimerobot.com/v2/getMonitors",
            data={"api_key": API_KEY, "format": "json"},
            timeout=10
        )
        data = r.json()
        if data.get("stat") != "ok":
            print(f"❌ UptimeRobot API error: {data.get('message')}")
            return

        monitors = data.get("monitors", [])
        existing = next((m for m in monitors if TARGET_URL in m.get("url", "")), None)
        if existing:
            print(f"✅ Monitor already active on UptimeRobot!")
            print(f"   - Name: {existing.get('friendly_name')}")
            print(f"   - URL: {existing.get('url')}")
            print(f"   - Status: {'UP' if existing.get('status') == 2 else 'DOWN'}")
            print(f"   - Interval: {existing.get('interval')} seconds")
            return

        # Create new HTTP monitor
        print(f"Creating new 5-minute monitor for {TARGET_URL}...")
        create_res = httpx.post(
            "https://api.uptimerobot.com/v2/newMonitor",
            data={
                "api_key": API_KEY,
                "format": "json",
                "type": 1,  # HTTP(s)
                "friendly_name": MONITOR_NAME,
                "url": TARGET_URL,
                "interval": 300  # 5 minutes
            },
            timeout=10
        )
        create_data = create_res.json()
        if create_data.get("stat") == "ok":
            print(f"🎉 Successfully created UptimeRobot monitor: {MONITOR_NAME}!")
        else:
            print(f"❌ Failed to create monitor: {create_data.get('message')}")

    except Exception as e:
        print(f"❌ Connection error: {e}")

if __name__ == "__main__":
    setup_monitor()
