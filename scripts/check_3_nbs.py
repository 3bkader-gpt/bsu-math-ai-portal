import subprocess, json

nbs = [
    ('acc_passplay', '0bdb653f-1a4d-42d8-be9f-72fc7e77b166', 'Lec 4'),
    ('acc_mo', 'f194071d-72f3-4aaf-b909-6e4892d4852e', 'Lec 2'),
    ('acc_p2', 'ff398006-b977-4263-8479-ca705cb92204', 'Lec 6')
]
for prof, nbid, name in nbs:
    cmd = ['/home/abkader/bsu-math-ai-portal/.venv/bin/notebooklm', '-p', prof, 'artifact', 'list', '-n', nbid, '--json']
    p = subprocess.run(cmd, capture_output=True, text=True)
    try:
        arts = json.loads(p.stdout).get('artifacts', [])
        summary = ', '.join([f"{a.get('type')}:{a.get('status')}" for a in arts])
        print(f"=== {name} ({prof}) ===")
        print(f"  {summary or 'No artifacts'}")
    except Exception as e:
        print(f"=== {name} ({prof}) === error: {e}")
