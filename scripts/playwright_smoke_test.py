import sys
import os
import json
import time
import uuid
import datetime
import zoneinfo
import httpx
import psycopg2
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgresql+psycopg2://", "postgresql://")

def create_playwright_test_student():
    client = httpx.Client(timeout=20)
    test_id = str(uuid.uuid4())
    email = f"playwright.{test_id[:8]}@bsu-math.internal"
    pwd = f"Pass_{test_id[:12]}"
    
    r_admin = client.post(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers={
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
        },
        json={
            "email": email,
            "password": pwd,
            "email_confirm": True,
            "user_metadata": {"nickname": f"بلاي رايت_{test_id[:4]}", "persona": "boys"}
        }
    )
    assert r_admin.status_code in (200, 201), f"Admin creation failed: {r_admin.text}"
    user_data = r_admin.json()
    user_id = user_data.get("id")
    
    r_login = client.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
        json={"email": email, "password": pwd}
    )
    assert r_login.status_code == 200, f"Login failed: {r_login.text}"
    token_data = r_login.json()
    
    session = {
        "access_token": token_data.get("access_token"),
        "refresh_token": token_data.get("refresh_token"),
        "expires_at": int(time.time()) + 3600,
        "expires_in": 3600,
        "token_type": "bearer",
        "user": user_data
    }
    return user_id, session

def run_smoke_test():
    print("\n" + "=" * 65)
    print("🎭 LIVE PLAYWRIGHT SMOKE TEST: MISTAKE NOTEBOOK & LEITNER")
    print("=" * 65)
    
    user_id, session = create_playwright_test_student()
    print(f"Created Playwright Student: {user_id}")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()
        
        # 1. Navigate to homepage and inject authenticated session
        print("\n1. Injecting authenticated session into localStorage...")
        page.goto("http://localhost:4500/")
        page.evaluate(f"""() => {{
            localStorage.setItem('bsu_portal_supabase_auth', JSON.stringify({json.dumps(session)}));
            localStorage.setItem('bsu_persona', 'boys');
            localStorage.setItem('bsu_theme', 'dark');
        }}""")
        page.reload()
        page.wait_for_load_state("networkidle")
        print("  ✅ Logged in successfully on Homepage.")
        
        # 2. Check Mistake Notebook button in Header
        print("\n2. Checking Mistake Notebook button in Header...")
        header_btn = page.locator("button:has-text('كراسة الأخطاء')").first
        assert header_btn.is_visible(), "Header 'كراسة الأخطاء' button should be visible!"
        header_btn.click()
        page.wait_for_timeout(500)
        
        # Modal is open
        modal_title = page.locator("text=كراسة الأخطاء والتكرار المتباعد")
        assert modal_title.is_visible(), "Mistake Notebook modal should open!"
        print("  ✅ Mistake Notebook Modal opened successfully from header.")
        
        # Close modal
        close_btn = page.locator("button:has(svg.lucide-x)").first
        if close_btn.is_visible():
            close_btn.click()
        else:
            page.keyboard.press("Escape")
        page.wait_for_timeout(300)
        
        page.on("console", lambda msg: print(f"  [Browser Console] {msg.text}"))
        page.on("pageerror", lambda err: print(f"  [Browser Error] {err}"))

        # 3. Navigate to Lecture 10 Quiz
        print("\n3. Navigating to Lecture 10 Quiz tab...")
        page.goto("http://localhost:4500/lecture.html?id=10&tab=quiz")
        page.wait_for_timeout(2000)

        # Ensure Quiz Tab is active
        quiz_tab_btn = page.locator("button:has-text('كويز')").first
        if quiz_tab_btn.is_visible():
            quiz_tab_btn.click()
            page.wait_for_timeout(1000)

        # Wait for options inside the quiz container
        option_locator = page.locator("button.active\\:scale-\\[0\\.99\\], button:has(span.w-8), button:has(span.w-9)")
        option_locator.first.wait_for(state="visible", timeout=15000)
        print("  ✅ Quiz questions rendered.")
        
        option_count = option_locator.count()
        print(f"  Found {option_count} quiz options across questions.")
        
        # Click Question 1 option
        print("  Clicking Option on Question 1...")
        option_locator.nth(1).click()
        page.wait_for_timeout(1000)
        
        # Trigger immediate outbox flush via pagehide
        page.evaluate("() => { window.dispatchEvent(new Event('pagehide')); }")
        page.wait_for_timeout(3500)
        
        # 4. Check DB for mistake ingestion
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("SELECT question_text, user_last_mistake, correct_answer, box_level, next_review_date FROM public.mistake_notebook WHERE user_id = %s;", (user_id,))
        rows = cur.fetchall()
        
        print(f"\n4. Checking public.mistake_notebook in DB for user {user_id}...")
        if len(rows) == 0:
            print("  Option was correct! Trying another option on question 2...")
            option_locator.nth(5).click()
            page.wait_for_timeout(1000)
            page.evaluate("() => { window.dispatchEvent(new Event('pagehide')); }")
            page.wait_for_timeout(3500)
            cur.execute("SELECT question_text, user_last_mistake, correct_answer, box_level, next_review_date FROM public.mistake_notebook WHERE user_id = %s;", (user_id,))
            rows = cur.fetchall()

        assert len(rows) > 0, "Mistake must be recorded in DB!"
        row = rows[0]
        print(f"  ✅ Mistake recorded in Notebook: '{row[0][:40]}...'")
        print(f"     Student Mistake: '{row[1]}', Correct Answer: '{row[2]}'")
        print(f"     Box Level: {row[3]}, Due Date: {row[4]}")
        assert row[3] == 1, "Should be placed in Box 1"
        
        # 5. Artificially make the mistake due today to test deliberate review
        print("\n5. Setting due date to today in DB to test review...")
        cur.execute("UPDATE public.mistake_notebook SET next_review_date = CURRENT_DATE WHERE user_id = %s RETURNING question_hash;", (user_id,))
        q_hash = cur.fetchone()[0]
        conn.commit()
        conn.close()

        # Submit valid due review
        print("  Submitting valid due review for mistake...")
        client = httpx.Client(timeout=15)
        valid_resp = client.post(
            f"{SUPABASE_URL}/rest/v1/rpc/submit_mistake_review",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {session['access_token']}",
                "Content-Type": "application/json"
            },
            json={
                "p_question_hash": q_hash,
                "p_is_correct": True,
                "p_duration_ms": 4000
            }
        )
        assert valid_resp.status_code == 200, f"Expected 200 for valid review, got: {valid_resp.text}"
        res_json = valid_resp.json()
        print(f"  ✅ Due review accepted! Box Level: {res_json.get('boxLevel')}, Awarded XP: {res_json.get('awardedXp')}")
        assert res_json.get('boxLevel') == 2, "Box should advance to Box 2"
        assert res_json.get('awardedXp') == 15, "Deliberate review should award 15 XP"
        
        # 6. Verify early review rejection on the same question
        print("\n6. Verifying that premature re-review is rejected by server...")
        early_resp = client.post(
            f"{SUPABASE_URL}/rest/v1/rpc/submit_mistake_review",
            headers={
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": f"Bearer {session['access_token']}",
                "Content-Type": "application/json"
            },
            json={
                "p_question_hash": q_hash,
                "p_is_correct": True,
                "p_duration_ms": 4000
            }
        )
        print(f"  Premature review HTTP status: {early_resp.status_code}")
        assert early_resp.status_code == 400, f"Expected 400 rejection for premature review, got: {early_resp.status_code}"
        print(f"  ✅ Premature review correctly rejected: {early_resp.text}")
        
        browser.close()
    
    print("\n" + "=" * 65)
    print("🎉 ALL PLAYWRIGHT LIVE SMOKE TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 65)

if __name__ == "__main__":
    run_smoke_test()
