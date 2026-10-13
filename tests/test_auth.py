from fastapi.testclient import TestClient
from app.main import app

def test_auth():
    client = TestClient(app)

    # 1. Unauthenticated upload attempt
    r = client.post("/api/upload", data={"subject_id": 1, "lecture_num": 1})
    assert r.status_code == 401
    print("1. Unauthorized upload blocked: OK (HTTP 401)")

    # 2. Login with wrong password
    r = client.post("/api/auth/login", json={"username": "admin", "password": "wrong_password"})
    assert r.status_code == 401
    print("2. Invalid password rejected: OK (HTTP 401)")

    # 3. Login with correct credentials
    r = client.post("/api/auth/login", json={"username": "admin", "password": "admin_academic_2026"})
    assert r.status_code == 200
    token_data = r.json()
    token = token_data["access_token"]
    print("3. Admin Login: OK -> Token issued successfully")

    # 4. Verify session with /api/auth/me
    headers = {"Authorization": f"Bearer {token}"}
    r = client.get("/api/auth/me", headers=headers)
    assert r.status_code == 200
    print("4. Verify Session (/api/auth/me): OK -> Role:", r.json()["role"])

    print("\nALL DATABASE & AUTHENTICATION TESTS PASSED 100%!")

if __name__ == "__main__":
    test_auth()
