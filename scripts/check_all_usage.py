import subprocess, json

for p in ['acc_passplay', 'acc_mo', 'acc_ali', 'acc_p1', 'acc_p2', 'default']:
    cmd = ['/home/abkader/bsu-math-ai-portal/.venv/bin/notebooklm', '-p', p, 'usage', '--json']
    res = subprocess.run(cmd, capture_output=True, text=True)
    try:
        data = json.loads(res.stdout)
        windows = data.get('windows', [])
        fh = windows[0] if len(windows) > 0 else {}
        used = fh.get('used_percent', 'N/A')
        rem = fh.get('remaining_percent', 'N/A')
        reset = fh.get('resets_at', 'N/A')
        print(f"Profile {p:12} | Used: {used:6}% | Remaining: {rem:6}% | Resets: {reset}")
    except Exception as e:
        print(f"Profile {p:12} | Error: {e} | Raw: {res.stdout[:100]}")
