from fastapi.testclient import TestClient
from app.main import app

def test_all():
    client = TestClient(app)

    # 1. Health check
    r = client.get("/")
    assert r.status_code == 200
    print("1. Health check: OK ->", r.json())

    # 2. Subjects
    r = client.get("/api/subjects")
    assert r.status_code == 200
    subjects = r.json()
    print("2. Subjects list: OK -> Found", len(subjects), "subjects")

    # 3. Find Differential Geometry
    diff_sub = next(s for s in subjects if s["name"] == "هندسه تفاضلية")
    r = client.get(f"/api/subjects/{diff_sub['id']}/lectures")
    assert r.status_code == 200
    lectures = r.json()
    print("3. Differential Geometry lectures: OK -> Found", len(lectures), "lectures")

    # 4. Lecture bundle
    lec_id = lectures[0]["id"]
    r = client.get(f"/api/lectures/{lec_id}")
    assert r.status_code == 200
    bundle = r.json()
    print("4. Lecture bundle: OK -> Assets count:", len(bundle["assets"]))

    # 5. Media streaming with Range (HTTP 206)
    audio_asset = next(a for a in bundle["assets"] if a["asset_type"] == "audio")
    r = client.get(f"/api/stream/{audio_asset['id']}", headers={"Range": "bytes=0-1048575"})
    assert r.status_code == 206
    print("5. HTTP Range 206 Audio Streaming: OK!")
    print("   Content-Range:", r.headers.get("content-range"))
    print("   Bytes delivered:", len(r.content), "bytes")

    # 6. Quiz text stream
    quiz_asset = next(a for a in bundle["assets"] if a["asset_type"] == "quiz_md")
    r = client.get(f"/api/stream/{quiz_asset['id']}")
    assert r.status_code == 200
    print("6. Interactive Quiz retrieval: OK -> Length:", len(r.text), "chars")

    print("\nALL PHASE 1 TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    test_all()
