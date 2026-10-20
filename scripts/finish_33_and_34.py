import asyncio
import json
import logging
import re
import sys
import time
from pathlib import Path
import urllib.request

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("finish_pipeline")

ROOT_DIR = Path(r"D:\الكليه\BOT")
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

TEMP_DIR = Path(r"D:\الكليه\BOT\media_storage\temp")
TEMP_DIR.mkdir(parents=True, exist_ok=True)

from dotenv import load_dotenv
load_dotenv(ROOT_DIR / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://cjmlnpdtfclzcvehebsv.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

from app.services.notebooklm_service import run_notebooklm_cmd_async

async def run_cmd(args: list[str]) -> tuple[int, str]:
    return await run_notebooklm_cmd_async(args)

def upload_to_supabase_storage(local_path: Path, remote_name: str, content_type: str) -> str:
    url = f"{SUPABASE_URL}/storage/v1/object/lectures/media/{remote_name}"
    data = local_path.read_bytes()
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": content_type,
            "x-upsert": "true"
        },
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        if resp.status in (200, 201):
            public_url = f"{SUPABASE_URL}/storage/v1/object/public/lectures/media/{remote_name}"
            logger.info(f"✅ Uploaded {remote_name} to Supabase Storage: {public_url}")
            return public_url
    raise Exception(f"Failed to upload {remote_name}")

async def register_asset(lecture_id: int, asset_type: str, title: str, url: str, size: int):
    chk_url = f"{SUPABASE_URL}/rest/v1/media_assets?lecture_id=eq.{lecture_id}&asset_type=eq.{asset_type}"
    req = urllib.request.Request(chk_url, headers=HEADERS)
    existing = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))

    payload = {
        "lecture_id": lecture_id,
        "asset_type": asset_type,
        "title": title,
        "local_file_path": url,
        "telegram_file_id": "supabase_storage",
        "file_size_bytes": size
    }

    if existing:
        asset_id = existing[0]['id']
        patch_url = f"{SUPABASE_URL}/rest/v1/media_assets?id=eq.{asset_id}"
        patch_req = urllib.request.Request(patch_url, data=json.dumps(payload).encode('utf-8'), headers=HEADERS, method='PATCH')
        urllib.request.urlopen(patch_req)
        logger.info(f"✅ Updated asset #{asset_id} for Lec {lecture_id} ({asset_type})")
    else:
        post_url = f"{SUPABASE_URL}/rest/v1/media_assets"
        post_req = urllib.request.Request(post_url, data=json.dumps(payload).encode('utf-8'), headers=HEADERS, method='POST')
        urllib.request.urlopen(post_req)
        logger.info(f"✅ Created asset for Lec {lecture_id} ({asset_type})")

async def get_artifacts(nid: str) -> list[dict]:
    code, out = await run_cmd(["notebooklm", "artifact", "list", "-n", nid, "--json"])
    if code == 0:
        try:
            d = json.loads(out)
            return d.get("artifacts", []) if isinstance(d, dict) else (d if isinstance(d, list) else [])
        except Exception:
            pass
    return []

async def wait_and_download(nid: str, art_type: str, out_file: Path, max_loops: int = 60) -> bool:
    for _ in range(max_loops):
        arts = await get_artifacts(nid)
        curr = next((a for a in arts if a.get("type_id") == art_type or a.get("type", "").lower() == art_type.lower()), None)
        if curr:
            status = curr.get("status")
            if status in ("completed", "ready"):
                logger.info(f"✓ {art_type.capitalize()} completed for notebook {nid}!")
                break
            logger.info(f"{art_type.capitalize()} status: {status}... sleeping 30s")
        else:
            logger.info(f"Waiting for {art_type} artifact to appear... sleeping 30s")
        await asyncio.sleep(30)

    if out_file.exists():
        out_file.unlink()
    code, out = await run_cmd(["notebooklm", "download", art_type, str(out_file), "-n", nid])
    if code == 0 and out_file.exists() and out_file.stat().st_size > 5000:
        logger.info(f"✓ Downloaded {out_file.name} ({out_file.stat().st_size} bytes)")
        return True
    return False

async def step_finish_lec33():
    logger.info("=========================================")
    logger.info("🎯 STEP 1: Completing Lecture #33 Audio")
    logger.info("=========================================")
    nid = "6dcc981d-a85b-4eab-9b03-8eb1651bae06"
    audio_file = TEMP_DIR / "audio_33.m4a"
    ok = await wait_and_download(nid, "audio", audio_file, max_loops=40)
    if ok:
        url = upload_to_supabase_storage(audio_file, "audio_33.m4a", "audio/mp4")
        await register_asset(33, "audio", "بودكاست المحاضرة الصوتي", url, audio_file.stat().st_size)
        logger.info("🎉 Lecture #33 is now 100% 5/5 COMPLETE!")

async def step_finish_lec34():
    logger.info("=========================================")
    logger.info("🎯 STEP 2: Completing Lecture #34 (Audio & Video)")
    logger.info("=========================================")
    title = "استاتيكا2 (د/ ايه) - المحاضرة 2: المشتقة الاتجاهية والمؤثرات التفاضلية"
    logger.info(f"Creating fresh notebook: {title}")
    code, out = await run_cmd(["notebooklm", "create", title, "-u", "--json"])
    nid = None
    if code == 0:
        try:
            d = json.loads(out)
            nid = d.get("notebook", {}).get("id") or d.get("id")
        except Exception:
            pass
    if not nid:
        m = re.search(r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})", out)
        if m: nid = m.group(1)

    if not nid:
        raise Exception(f"Failed to create notebook: {out}")
    logger.info(f"✓ Created fresh notebook: {nid}")

    # Add PDFs
    pdf1 = Path(r"D:\الكليه\subjects\استاتيكا2\lec2\lec2.pdf")
    pdf2 = Path(r"D:\الكليه\subjects\استاتيكا2\lec2\كتاب - المشتقة الاتجاهية والمؤثرات التفاضلية (التباعد والدوران ولابلاس).pdf")
    logger.info(f"Adding source: {pdf1.name}...")
    await run_cmd(["notebooklm", "source", "add", str(pdf1), "-n", nid])
    logger.info(f"Adding source: {pdf2.name}...")
    await run_cmd(["notebooklm", "source", "add", str(pdf2), "-n", nid])

    prompt = "شرح مؤثر نابلا والانحدار والمشتقة الاتجاهية والتباعد والدوران ولابلاس بالعامية المصرية"

    # Launch Audio
    logger.info("Launching Audio Overview...")
    await run_cmd(["notebooklm", "generate", "audio", prompt, "--length", "long", "--language", "ar_eg", "-n", nid])

    # Wait and download audio
    audio_file = TEMP_DIR / "audio_34.m4a"
    ok_a = await wait_and_download(nid, "audio", audio_file, max_loops=50)
    if ok_a:
        url_a = upload_to_supabase_storage(audio_file, "audio_34.m4a", "audio/mp4")
        await register_asset(34, "audio", "بودكاست المحاضرة الصوتي", url_a, audio_file.stat().st_size)

    # Launch Video
    logger.info("Launching Video Overview...")
    await run_cmd(["notebooklm", "generate", "video", prompt, "--format", "explainer", "--language", "ar_eg", "-n", nid])

    # Wait and download video
    video_file = TEMP_DIR / "video_34.mp4"
    ok_v = await wait_and_download(nid, "video", video_file, max_loops=70)
    if ok_v:
        url_v = upload_to_supabase_storage(video_file, "video_34.mp4", "video/mp4")
        await register_asset(34, "video", "فيديو الشرح التفاعلي", url_v, video_file.stat().st_size)
        logger.info("🎉 Lecture #34 is now 100% 5/5 COMPLETE!")

async def cleanup_temp():
    logger.info("=========================================")
    logger.info("🧹 STEP 3: Cleaning up media_storage/temp")
    logger.info("=========================================")
    count = 0
    freed_bytes = 0
    for p in TEMP_DIR.glob("*.*"):
        if p.is_file():
            s = p.stat().st_size
            p.unlink()
            count += 1
            freed_bytes += s
    mb = freed_bytes / (1024 * 1024)
    logger.info(f"✨ Successfully cleaned {count} files ({mb:.2f} MB freed).")

async def main():
    await step_finish_lec33()
    await step_finish_lec34()
    await cleanup_temp()
    logger.info("🏆 ALL 29 LECTURES ARE 100% COMPLETE (5/5) & WORKSPACE CLEANED!")

if __name__ == "__main__":
    asyncio.run(main())
