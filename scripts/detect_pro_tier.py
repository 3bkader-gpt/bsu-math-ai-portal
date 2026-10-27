import subprocess, json

profiles = ['default', 'acc_passplay', 'acc_mo', 'acc_ali', 'acc_p1', 'acc_p2', 'acc_p4']

print("=" * 85)
print("🔍 Checking Google AI / NotebookLM Tier Across All Profiles")
print("=" * 85)

for p in profiles:
    cmd = ['/home/abkader/bsu-math-ai-portal/.venv/bin/notebooklm', '-p', p, 'usage', '--categories', '--json']
    res = subprocess.run(cmd, capture_output=True, text=True)
    try:
        data = json.loads(res.stdout)
        actions = data.get('actions', [])
        audio_c = next((a.get('estimated_cost_percent') for a in actions if a.get('code') == 1), None)
        video_c = next((a.get('estimated_cost_percent') for a in actions if a.get('code') == 2), None)
        cine_c = next((a.get('estimated_cost_percent') for a in actions if a.get('code') == 3), None)
        deferred_cap = next((a.get('remaining_deferred_artifact_generations') for a in actions if a.get('code') == 1), None)
        
        # In Google AI Pro: Audio cost is ~9.8% and deferred capacity is 6. In Free: Audio cost is ~39.2% and deferred is 3.
        is_pro = (audio_c is not None and audio_c < 15.0)
        status_label = "🌟 Google AI PRO (Tier 4x)" if is_pro else "🆓 Free (Standard Tier)"
        
        print(f"Profile: {p:12} -> {status_label}")
        print(f"   Audio Cost: {audio_c}% | Video Cost: {video_c:.2f}% | Max Parallel/Deferred: {deferred_cap}")
    except Exception as e:
        print(f"Profile: {p:12} -> Error reading usage: {e}")
print("=" * 85)
