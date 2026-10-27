import subprocess, json

profiles = ['acc_passplay', 'acc_ali', 'acc_p1', 'acc_p2', 'acc_mo', 'default']
for p in profiles:
    cmd = ['/home/abkader/bsu-math-ai-portal/.venv/bin/notebooklm', '-p', p, 'list', '--json']
    res = subprocess.run(cmd, capture_output=True, text=True)
    try:
        data = json.loads(res.stdout)
        nbs = data.get('notebooks', [])
        print(f"=== Profile: {p} ({len(nbs)} notebooks) ===")
        for nb in nbs[:3]:
            nbid = nb['id']
            title = nb.get('title', '')
            cmd2 = ['/home/abkader/bsu-math-ai-portal/.venv/bin/notebooklm', '-p', p, 'artifact', 'list', '-n', nbid, '--json']
            res2 = subprocess.run(cmd2, capture_output=True, text=True)
            arts = json.loads(res2.stdout).get('artifacts', [])
            art_str = ', '.join([f"{a.get('type')}:{a.get('status')}" for a in arts])
            print(f"  NB {nbid[:8]} ({title[:25]}): [{art_str}]")
    except Exception as e:
        print(f"{p}: error {e}")
