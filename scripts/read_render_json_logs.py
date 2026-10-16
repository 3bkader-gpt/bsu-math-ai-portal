import subprocess
import json
import sys
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

res = subprocess.run(['render', 'logs', '--resources', 'srv-db8e6geq1p3s73ah7kh0', '--limit', '100', '--output', 'json'], capture_output=True, text=True)
try:
    raw = res.stdout
    decoder = json.JSONDecoder()
    pos = 0
    logs = []
    while pos < len(raw):
        raw_strip = raw[pos:].lstrip()
        if not raw_strip:
            break
        pos += len(raw[pos:]) - len(raw_strip)
        obj, idx = decoder.raw_decode(raw[pos:])
        logs.append(obj)
        pos += idx
    print(f"Total parsed log records: {len(logs)}")
    instances = set()
    for l in logs:
        labels = {x['name']: x['value'] for x in l.get('labels', [])}
        inst = labels.get('instance', 'unknown')
        instances.add(inst)
        msg = l.get('message') or l.get('text') or ''
        ts = l.get('timestamp') or ''
        print(f"[{ts[:19]}] [{inst}] {msg}")
    print("Distinct instances in logs:", instances)

except Exception as e:
    print("JSON Parse error:", e)
    print("Raw output sample:", res.stdout[:300])
