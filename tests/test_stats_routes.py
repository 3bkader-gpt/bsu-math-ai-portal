import sys
from fastapi.testclient import TestClient
from app.main import app

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

client = TestClient(app)

def test_stats():
    r_traps = client.get('/api/stats/traps?lecture_id=16')
    print(f'Traps endpoint status: {r_traps.status_code}')
    assert r_traps.status_code == 200
    traps_data = r_traps.json()
    print('Sample traps count:', len(traps_data.get('traps', {})))

    r_hurdles = client.get('/api/stats/cohort-hurdles?limit=5')
    print(f'Hurdles endpoint status: {r_hurdles.status_code}')
    assert r_hurdles.status_code == 200
    hurdles = r_hurdles.json()
    print(f'Hurdles returned count: {len(hurdles)}')
    if hurdles:
        h = hurdles[0]
        print(f"Top hurdle: {h['question_hash']} in {h['subject_name']} ({h['failure_rate_pct']}%)")

    r_mom = client.get('/api/stats/momentum')
    print(f'Momentum endpoint status: {r_mom.status_code}')
    assert r_mom.status_code == 200
    mom_res = r_mom.json()
    mom = mom_res.get('momentum', mom_res)
    print('Momentum lectures count:', len(mom))
    for k, v in list(mom.items())[:3]:
        print(f"  Lec {k}: {v['badge_text']} ({v['weekly_activity_count']} weekly)")

    print('✅ All /api/stats tests passed perfectly!')

if __name__ == '__main__':
    test_stats()
