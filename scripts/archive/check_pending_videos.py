import subprocess
import json

nbs = {
    3: "847bae1d-0271-4715-b8a0-45aa281470ff",
    17: "d8ae29c4-61e0-4c54-aef3-55304308e5cf",
    18: "b7a20b69-43be-43ad-8942-0cae3785fe9d",
    21: "0dc08f05-722e-4e89-8cd3-f04e999e5ac3"
}

ready_videos = {}

for lec_id, nb_id in nbs.items():
    res = subprocess.run(["notebooklm", "artifact", "list", "-n", nb_id, "--type", "video", "--json"], capture_output=True, text=True)
    if res.returncode == 0:
        try:
            data = json.loads(res.stdout)
            print(f"=== Lec {lec_id} ({nb_id[:8]}) ===")
            artifacts = data.get("artifacts", [])
            for a in artifacts:
                status = a.get("status")
                print(f"  ID: {a['id']} | Status: {status} | Created: {a.get('created_at')}")
                if status == "completed" and lec_id not in ready_videos:
                    ready_videos[lec_id] = (nb_id, a['id'])
        except Exception as e:
            print(f"JSON parse error for {nb_id}: {e}")
    else:
        print(f"Error listing nb {nb_id}: {res.stderr}")

print("\nReady videos to download and upload:", ready_videos)
