import sys
import httpx

sys.stdout.reconfigure(encoding='utf-8')

print("=" * 60)
print("CHECK 2: HTTP 206 STREAMING TEST FOR AUDIO PODCAST")
print("=" * 60)

# 1. Fetch Differential Geometry lecture bundle
r_lec = httpx.get("http://127.0.0.1:8000/api/lectures/1", timeout=10)
bundle = r_lec.json()
print(f"Lecture Title: {bundle['title']}")
print(f"Total Assets: {len(bundle['assets'])}")

audio_asset = next(a for a in bundle['assets'] if a['asset_type'] == 'audio')
print(f"Audio Asset ID: {audio_asset['id']}")
print(f"Audio Title: {audio_asset['title']}")
print(f"Audio Total Size: {audio_asset['file_size_bytes']:,} bytes ({audio_asset['file_size_bytes'] / (1024*1024):.2f} MB)")
print(f"Stream URL: http://127.0.0.1:8000{audio_asset['stream_url']}")

# 2. Test Range 0-1MB (Initial play)
headers_init = {"Range": "bytes=0-1048575"}
r_chunk1 = httpx.get(f"http://127.0.0.1:8000{audio_asset['stream_url']}", headers=headers_init, timeout=10)
print("\n[Range Test 1: Start 0-1MB]")
print(f"Status: {r_chunk1.status_code} (Expected 206 Partial Content)")
print(f"Content-Range: {r_chunk1.headers.get('content-range')}")
print(f"Content-Type: {r_chunk1.headers.get('content-type')}")
print(f"Accept-Ranges: {r_chunk1.headers.get('accept-ranges')}")
print(f"Bytes received: {len(r_chunk1.content):,} bytes")

# 3. Test Range Seek to 20MB (Fast forward in middle)
headers_seek = {"Range": "bytes=20000000-21048575"}
r_chunk2 = httpx.get(f"http://127.0.0.1:8000{audio_asset['stream_url']}", headers=headers_seek, timeout=10)
print("\n[Range Test 2: Seek to Minute 15 (~20MB mark)]")
print(f"Status: {r_chunk2.status_code} (Expected 206 Partial Content)")
print(f"Content-Range: {r_chunk2.headers.get('content-range')}")
print(f"Bytes received without downloading rest: {len(r_chunk2.content):,} bytes")

# 4. Test Range Seek to Near End (38MB mark)
headers_end = f"bytes={audio_asset['file_size_bytes'] - 500000}-{audio_asset['file_size_bytes'] - 1}"
r_chunk3 = httpx.get(f"http://127.0.0.1:8000{audio_asset['stream_url']}", headers={"Range": headers_end}, timeout=10)
print("\n[Range Test 3: Seek to End (~39MB mark)]")
print(f"Status: {r_chunk3.status_code} (Expected 206 Partial Content)")
print(f"Content-Range: {r_chunk3.headers.get('content-range')}")
print(f"Bytes received: {len(r_chunk3.content):,} bytes")
