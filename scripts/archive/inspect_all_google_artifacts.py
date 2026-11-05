import subprocess, json

accounts = [
    ("default", "Subj 5 Lec 6", "e096b451-8d65-423f-a7b5-bb1527aece4e"),
    ("acc_passplay", "Subj 5 Lec 1", "6885dac6-68c0-47fb-896b-246d322fd62b"),
    ("acc_ali", "Subj 5 Lec 2", "a6e723f7-f5c0-4ac6-82e3-f53294031136"),
    ("acc_mo", "Subj 3 Lec 6", "fe4e1bbb-20fe-4547-9a94-d0a014c0c6b5"),
    ("acc_mo", "Subj 5 Lec 3", "84c20ce6-e91b-4393-9c86-1df55db0011a"),
    ("acc_p1", "Subj 3 Lec 7", "b55d45de-0985-408d-8fb4-b8e7ae35b67d"),
    ("acc_p1", "Subj 5 Lec 4", "06974602-a1f7-45e3-9ef4-7db3df9fe430"),
    ("acc_p2", "Subj 3 Lec 9", "9f781e24-e890-4467-b50d-c63e476f24a9"),
]

print("=== CHECKING GOOGLE NOTEBOOKLM STATUS ACROSS ALL 6 ACCOUNTS ===")
for prof, label, nbid in accounts:
    cmd = [
        "/home/abkader/bsu-math-ai-portal/.venv/bin/notebooklm",
        "-p", prof, "artifact", "list", "-n", nbid, "--json"
    ]
    p = subprocess.run(cmd, capture_output=True, text=True)
    try:
        data = json.loads(p.stdout)
        arts = data.get("artifacts", [])
        completed = [f"{a.get('type')}:{a.get('title')[:30]}" for a in arts if a.get("status") == "completed"]
        pending = [a.get("type") for a in arts if a.get("status") == "pending"]
        print(f"[{prof}] {label} (NB {nbid[:8]}):")
        print(f"    Completed: {completed if completed else 'None'}")
        print(f"    Pending:   {pending if pending else 'None'}")
    except Exception as e:
        print(f"[{prof}] {label}: error listing artifacts ({e})")
