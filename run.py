import sys
import uvicorn

sys.stdout.reconfigure(encoding='utf-8')

if __name__ == "__main__":
    print("=" * 60)
    print("Starting Academic Content Pipeline Backend Server")
    print("Swagger API Docs: http://127.0.0.1:8000/docs")
    print("=" * 60)
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False)
