import httpx
import sys
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

API_TOKEN = "rnd_mNIZQDcLvNEbwc6XjdrmUdm3e6Nd"
SERVICE_ID = "srv-db8e6geq1p3s73ah7kh0"

headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Accept": "application/json",
    "Content-Type": "application/json"
}

import time

for _ in range(30):
    r = httpx.get(f"https://api.render.com/v1/services/{SERVICE_ID}/deploys?limit=1", headers=headers)
    latest = r.json()[0].get("deploy", {})
    status = latest.get("status")
    commit = latest.get("commit", {}).get("id", "")[:7]
    print(f"Deploy {latest.get('id')} ({commit}): {status}")
    if status == "live":
        print("🎉 Deploy is LIVE on Render!")
        break
    elif "fail" in status:
        print("❌ Deploy FAILED!")
        break
    time.sleep(5)

