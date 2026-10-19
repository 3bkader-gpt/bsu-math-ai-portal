import sys
import time
import re
from pathlib import Path
import subprocess

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

TEMP_DIR = Path(r"D:\الكليه\BOT\media_storage\temp")
UPLOAD_SCRIPT = Path(r"D:\الكليه\BOT\scripts\upload_single_media.js")

PROCESSED_FILE = Path(r"D:\الكليه\BOT\media_storage\processed_uploads.txt")

def get_processed() -> set[str]:
    if PROCESSED_FILE.exists():
        return set(PROCESSED_FILE.read_text(encoding="utf-8").splitlines())
    return set()

def mark_processed(filename: str):
    with open(PROCESSED_FILE, "a", encoding="utf-8") as f:
        f.write(f"{filename}\n")

def main():
    print("🚀 Auto Upload Daemon started for newly generated media...")
    processed = get_processed()

    # Pre-mark known completed ones
    pre_done = {
        "audio_28.m4a", "video_28.mp4",
        "audio_29.m4a", "video_29.mp4",
        "audio_30.m4a"
    }
    for f in pre_done:
        if f not in processed:
            mark_processed(f)
            processed.add(f)

    while True:
        try:
            for p in sorted(TEMP_DIR.glob("*.*")):
                if p.name in processed:
                    continue

                # Match patterns like video_30.mp4 or audio_31.m4a
                m = re.match(r"^(video|audio)_(\d+)\.(mp4|m4a)$", p.name)
                if not m:
                    continue

                asset_type = m.group(1)
                lec_id = int(m.group(2))

                # Only auto-upload new batch lectures (28 to 35)
                if lec_id < 28 or lec_id > 35:
                    continue

                # Ensure file is completely written (size stable for 5s)
                initial_size = p.stat().st_size
                if initial_size < 10000:
                    continue

                time.sleep(5)
                if p.stat().st_size != initial_size:
                    # Still downloading
                    continue

                title = "فيديو الشرح التفاعلي" if asset_type == "video" else "بودكاست المحاضرة الصوتي"
                print(f"📦 Detected new file: {p.name} ({initial_size} bytes). Uploading for Lec #{lec_id}...")

                cmd = ["node", str(UPLOAD_SCRIPT), p.name, str(lec_id), asset_type, title]
                res = subprocess.run(cmd, capture_output=True, text=True)
                print(res.stdout)
                if res.returncode == 0:
                    print(f"✅ Successfully uploaded and registered: {p.name}")
                    mark_processed(p.name)
                    processed.add(p.name)
                else:
                    print(f"❌ Failed upload: {res.stderr}")

        except Exception as e:
            print(f"Daemon error: {e}")

        time.sleep(15)

if __name__ == "__main__":
    main()
