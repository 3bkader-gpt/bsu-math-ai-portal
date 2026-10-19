import sys
import time
import subprocess
import httpx
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

RENDER_API_TOKEN = "rnd_mNIZQDcLvNEbwc6XjdrmUdm3e6Nd"
RENDER_SERVICE_ID = "srv-db8e6geq1p3s73ah7kh0"
CLOUDFLARE_PROJECT = "bsu-math-ai-portal"

PAGES_URL = "https://bsu-math-ai-portal.pages.dev"
RENDER_URL = "https://bsu-math-api.onrender.com"

def step_header(title: str):
    print("\n" + "=" * 60)
    print(f"🚀 {title}")
    print("=" * 60)

def verify_cloudflare_pages():
    step_header("Step 1: Cloudflare Pages Deployment (Wrangler CLI)")
    try:
        cmd = "npx wrangler pages deployment list --project-name " + CLOUDFLARE_PROJECT
        res = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            cwd=str(Path(__file__).parent.parent)
        )
        if res.returncode == 0:
            lines = res.stdout.strip().splitlines()
            for line in lines[:10]:
                print("  " + line)
            print("✅ Cloudflare Pages deployment verified via Wrangler CLI.")
            return True
        else:
            print(f"⚠️ Wrangler check returned: {res.stderr}")
            return False
    except Exception as e:
        print(f"⚠️ Wrangler error: {e}")
        return False

def verify_render_deploy():
    step_header("Step 2: Render Backend Deploy & Live Poll")
    headers = {
        "Authorization": f"Bearer {RENDER_API_TOKEN}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

    try:
        # Check latest deploy
        r = httpx.get(f"https://api.render.com/v1/services/{RENDER_SERVICE_ID}/deploys?limit=1", headers=headers, timeout=15)
        if r.status_code == 200:
            latest = r.json()[0].get("deploy", {})
            status = latest.get("status")
            commit_id = latest.get("commit", {}).get("id", "")[:7]
            deploy_id = latest.get("id")
            print(f"Latest Render Deploy #{deploy_id} (Commit: {commit_id}): Status = {status}")

            # If not live, poll up to 60s
            if status != "live":
                print("Polling until Render deploy is live...")
                for i in range(12):
                    time.sleep(5)
                    r_poll = httpx.get(f"https://api.render.com/v1/services/{RENDER_SERVICE_ID}/deploys/{deploy_id}", headers=headers, timeout=15)
                    curr_status = r_poll.json().get("status")
                    print(f"  Attempt {i+1}: {curr_status}")
                    if curr_status == "live":
                        print("🎉 Render Backend is LIVE!")
                        return True
                    elif "fail" in str(curr_status).lower():
                        print("❌ Render Deploy failed!")
                        return False
            else:
                print("✅ Render Backend is currently LIVE.")
                return True
    except Exception as e:
        print(f"⚠️ Render check error: {e}")
    return False

def run_post_deploy_tests():
    step_header("Step 3: Post-Deploy End-to-End Live Verification")
    client = httpx.Client(timeout=20, follow_redirects=True)
    all_passed = True

    # 1. Cloudflare Pages Root
    try:
        r_home = client.get(PAGES_URL)
        if r_home.status_code == 200:
            print(f"✅ [Cloudflare Pages] Root (200 OK) - Length: {len(r_home.text)} bytes")
        else:
            print(f"❌ [Cloudflare Pages] Root failed with status {r_home.status_code}")
            all_passed = False
    except Exception as e:
        print(f"❌ [Cloudflare Pages] Root ping failed: {e}")
        all_passed = False

    # 2. Cloudflare Pages Lecture View
    try:
        r_lec = client.get(f"{PAGES_URL}/lecture?id=28")
        if r_lec.status_code == 200:
            print(f"✅ [Cloudflare Pages] Lecture Page (/lecture?id=28) (200 OK)")
        else:
            print(f"❌ [Cloudflare Pages] Lecture page returned {r_lec.status_code}")
            all_passed = False
    except Exception as e:
        print(f"❌ [Cloudflare Pages] Lecture page failed: {e}")
        all_passed = False

    # 3. Render Backend Health
    try:
        r_health = client.get(f"{RENDER_URL}/")
        if r_health.status_code == 200:
            print(f"✅ [Render Backend] / (200 OK) - Status: {r_health.json().get('status', 'online')}")
        else:
            print(f"❌ [Render Backend] / failed with status {r_health.status_code}")
            all_passed = False
    except Exception as e:
        print(f"❌ [Render Backend] / failed: {e}")
        all_passed = False

    # 4. Render API Lecture Bundle
    try:
        r_api = client.get(f"{RENDER_URL}/api/lectures/28")
        if r_api.status_code == 200:
            data = r_api.json()
            assets = data.get("assets", [])
            print(f"✅ [Render API] /api/lectures/28 (200 OK) - Assets Count: {len(assets)}")
        else:
            print(f"❌ [Render API] /api/lectures/28 returned {r_api.status_code}")
            all_passed = False
    except Exception as e:
        print(f"❌ [Render API] failed: {e}")
        all_passed = False

    # 5. Direct Supabase Storage CDN Media Check
    try:
        media_url = "https://cjmlnpdtfclzcvehebsv.supabase.co/storage/v1/object/public/lectures/media/audio_28.m4a"
        r_media = client.head(media_url)
        if r_media.status_code == 200:
            size_mb = int(r_media.headers.get("content-length", 0)) / (1024 * 1024)
            print(f"✅ [Supabase Storage CDN] Media Stream audio_28.m4a (200 OK) - Size: {size_mb:.2f} MB")
        else:
            print(f"❌ [Supabase Storage CDN] Media failed: {r_media.status_code}")
            all_passed = False
    except Exception as e:
        print(f"❌ [Supabase Storage CDN] failed: {e}")
        all_passed = False

    return all_passed

def main():
    print("=================================================================")
    print("🌟 MULTI-CLOUD DEPLOY & LIVE PRODUCTION QUALITY GATE 🌟")
    print("=================================================================")
    
    cf_ok = verify_cloudflare_pages()
    render_ok = verify_render_deploy()
    tests_ok = run_post_deploy_tests()

    print("\n" + "=" * 60)
    print("📊 DEPLOYMENT & VERIFICATION SUMMARY:")
    print(f"  • Cloudflare Pages (Wrangler): {'✅ VERIFIED' if cf_ok else '⚠️ REVIEW'}")
    print(f"  • Render Backend:             {'✅ LIVE' if render_ok else '⚠️ REVIEW'}")
    print(f"  • Post-Deploy E2E Tests:      {'✅ ALL PASSED (5/5)' if tests_ok else '❌ FAILED'}")
    print("=================================================================")

    if not tests_ok:
        sys.exit(1)

if __name__ == "__main__":
    main()
