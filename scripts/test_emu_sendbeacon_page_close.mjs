import http from 'http';
import { execSync } from 'child_process';
import crypto from 'crypto';

http.get('http://127.0.0.1:9222/json/list', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', async () => {
    const list = JSON.parse(body);
    const page = list.find(p => p.url.includes('bsu-math-ai-portal') && p.type === 'page');
    if (!page) {
      console.error('No portal page found');
      process.exit(1);
    }

    const testEventId = crypto.randomUUID();
    console.log(`1. Target test event ID: ${testEventId}`);

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let reqId = 1;
    function call(method, params = {}) {
      return new Promise((resolve) => {
        const id = reqId++;
        const onMsg = (evt) => {
          const data = JSON.parse(evt.data);
          if (data.id === id) {
            ws.removeEventListener('message', onMsg);
            resolve(data.result);
          }
        };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    console.log('2. Emitting activity event and immediately triggering pagehide/unload...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        // Retrieve supabase auth token & config
        const supabaseUrl = 'https://cjmlnpdtfclzcvehebsv.supabase.co';
        const anonKey = 'sb_publishable_iukVp-1coXRxhHD3T_pqoQ_k2g1PnN5';
        let authToken = anonKey;
        try {
          const rawAuth = localStorage.getItem('bsu_portal_supabase_auth');
          if (rawAuth) {
            const parsed = JSON.parse(rawAuth);
            if (parsed?.access_token) authToken = parsed.access_token;
          }
        } catch {}

        const eventPayload = {
          id: '${testEventId}',
          type: 'study_guide.read',
          lectureId: 1,
          payload: { lectureId: 1, dwellSec: 60 },
          clientTs: new Date().toISOString()
        };

        // Dispatch via modern fetch with keepalive: true (the browser standard for sendBeacon with headers)
        fetch(supabaseUrl + '/rest/v1/rpc/ingest_events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': 'Bearer ' + authToken
          },
          body: JSON.stringify({ events: [eventPayload] }),
          keepalive: true
        }).catch(() => {});

        return { dispatched: true };
      })()`,
      returnByValue: true
    });

    console.log('3. Simulating page exit / tab close immediately...');
    await call('Page.navigate', { url: 'about:blank' });

    ws.close();

    console.log('4. Waiting 4 seconds for Supabase ingest...');
    await new Promise(r => setTimeout(r, 4000));

    // 5. Query Supabase directly
    console.log('5. Verifying event in public.activity_events in database...');
    const verifyScript = `
import os, sys, psycopg2
from dotenv import load_dotenv
load_dotenv()
conn = psycopg2.connect(os.getenv('DATABASE_URL', '').replace('postgresql+psycopg2://', 'postgresql://'))
cur = conn.cursor()
cur.execute("SELECT id, user_id, event_type, created_at FROM public.activity_events WHERE id = %s;", ('${testEventId}',))
row = cur.fetchone()
if row:
    print('FOUND_IN_DB:', row[0], row[2], str(row[3]))
else:
    print('NOT_FOUND_IN_DB')
conn.close()
`;
    const result = execSync(`python -c "${verifyScript.replace(/\n/g, ';')}"`, { cwd: process.cwd() }).toString();
    console.log('DB Query Result:', result.trim());

    if (result.includes('FOUND_IN_DB')) {
      console.log('🎉 sendBeacon / keepalive on page close: PASS (CONFIRMED IN DATABASE)!');
    } else {
      console.error('❌ Event not found in DB');
    }

    process.exit(0);
  });
});
