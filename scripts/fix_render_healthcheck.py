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

r = httpx.patch(
    f"https://api.render.com/v1/services/{SERVICE_ID}",
    headers=headers,
    json={"serviceDetails": {"healthCheckPath": ""}}
)
print("PATCH status:", r.status_code)
details = r.json().get("serviceDetails", {})
print("New healthCheckPath:", repr(details.get("healthCheckPath")))
