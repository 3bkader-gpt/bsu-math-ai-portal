import os
import requests
from dotenv import load_dotenv

load_dotenv('.env')

token = os.getenv("SUPABASE_ACCESS_TOKEN")
project_ref = "cjmlnpdtfclzcvehebsv"

if not token:
    print("❌ SUPABASE_ACCESS_TOKEN is missing in .env")
    exit(1)

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

url = f"https://api.supabase.com/v1/projects/{project_ref}/config/auth"

res = requests.get(url, headers=headers)
if res.status_code == 200:
    data = res.json()
    print("Current Supabase Auth Rate Limits:")
    for k, v in data.items():
        if "rate_limit" in k:
            print(f"  - {k}: {v}")
else:
    print(f"❌ Error {res.status_code}: {res.text}")
