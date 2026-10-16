import subprocess
import json
import sys
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

notebooks = [
    ('39eb27b3-63a2-4610-b17c-b45598a94ed5', 'Lec 10'),
    ('eda89137-c466-4878-a9b7-5734817a6da0', 'Lec 11'),
    ('d8ae29c4-61e0-4c54-aef3-55304308e5cf', 'Lec 17'),
    ('b7a20b69-43be-43ad-8942-0cae3785fe9d', 'Lec 18'),
    ('8a201dde-a2d1-4fe1-8c92-5ae268997e30', 'Lec 20'),
    ('0dc08f05-722e-4e89-8cd3-f04e999e5ac3', 'Lec 21'),
    ('847bae1d-0271-4715-b8a0-45aa281470ff', 'Lec 3')
]

for nid, name in notebooks:
    cmd = ['notebooklm', 'artifact', 'list', '-n', nid, '--json']
    res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
    try:
        arts = json.loads(res.stdout)
        items = arts if isinstance(arts, list) else arts.get('artifacts', [])
        summary = [f"{a.get('type')}: {a.get('status')}" for a in items]
        print(f"{name} ({nid[:8]}): {', '.join(summary)}")
    except Exception as e:
        print(f"{name} raw output: {res.stdout.strip()}")
