import subprocess, json

tasks = [
    ('acc_mo', 'Subj 3 Lec 6'),
    ('acc_p1', 'Subj 3 Lec 7'),
    ('acc_p2', 'Subj 3 Lec 9'),
    ('acc_ali', 'Subj 5 Lec 2')
]

for prof, name in tasks:
    cmd = [
        '/home/abkader/bsu-math-ai-portal/.venv/bin/notebooklm',
        '-p', prof, 'list', '--json'
    ]
    p = subprocess.run(cmd, capture_output=True, text=True)
    try:
        data = json.loads(p.stdout)
        nbs = data.get('notebooks', [])
        print(f"=== {prof} ({name}) ===")
        for nb in nbs[:2]:
            nbid = nb['id']
            title = nb['title']
            p2 = subprocess.run([
                '/home/abkader/bsu-math-ai-portal/.venv/bin/notebooklm',
                '-p', prof, 'artifact', 'list', '-n', nbid, '--json'
            ], capture_output=True, text=True)
            try:
                arts = json.loads(p2.stdout).get('artifacts', [])
                art_summary = ', '.join([f"{a.get('type')}:{a.get('status')}" for a in arts])
                print(f"  NB {nbid[:8]} ({title[:25]}): [{art_summary}]")
            except Exception as e:
                print(f"  NB {nbid[:8]}: error listing artifacts")
    except Exception as e:
        print(f"{prof}: error listing notebooks: {e}")
