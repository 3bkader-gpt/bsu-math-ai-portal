import http from 'http';
import { execFileSync } from 'child_process';
import crypto from 'crypto';

function queryDbForEvent(testEventId) {
  const out = execFileSync('python', ['scripts/check_event_in_db.py', testEventId], {
    cwd: process.cwd(),
    encoding: 'utf-8',
    shell: true
  });
  return out.trim();
}

http.get('http://127.0.0.1:9222/json/list', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', async () => {
    const list = JSON.parse(body);
    let page = list.find(p => p.url.includes('bsu-math-ai-portal') && p.type === 'page');
    if (!page) {
      console.error('No portal page found, please ensure portal is open on port 9222');
      process.exit(1);
    }

    const testEventId = crypto.randomUUID();
    console.log(`\n==================================================`);
    console.log(`[Strict Keepalive Verification] Target UUID: ${testEventId}`);
    console.log(`==================================================\n`);

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

    // Step 1: Ensure fresh portal environment
    console.log('Step 1: Navigating to portal to ensure fresh environment...');
    await call('Page.navigate', { url: 'https://bsu-math-ai-portal.pages.dev/' });
    await new Promise(r => setTimeout(r, 4000));

    // Step 2: Inject test event into 'bsu_gamification_outbox_queue' in IndexedDB
    console.log('Step 2: Injecting event into bsu_gamification_outbox_queue in IndexedDB...');
    const injectRes = await call('Runtime.evaluate', {
      expression: `(async () => {
        return new Promise((resolve, reject) => {
          const req = indexedDB.open('bsu_portal_gamification', 1);
          req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction(['outbox'], 'readwrite');
            const store = tx.objectStore('outbox');
            
            // Read existing queue
            const getReq = store.get('bsu_gamification_outbox_queue');
            getReq.onsuccess = () => {
              const queue = getReq.result || [];
              const testItem = {
                id: '${testEventId}',
                type: 'study_guide.read',
                lectureId: 1,
                payload: { lectureId: 1, dwellSec: 60 },
                clientTs: new Date().toISOString(),
                retryCount: 0,
                enqueuedAt: Date.now()
              };
              queue.push(testItem);
              const putReq = store.put(queue, 'bsu_gamification_outbox_queue');
              putReq.onsuccess = () => {
                resolve({ queueLength: queue.length, injectedId: testItem.id });
              };
              putReq.onerror = () => reject(putReq.error);
            };
            getReq.onerror = () => reject(getReq.error);
          };
          req.onerror = () => reject(req.error);
        });
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    console.log('IndexedDB state:', injectRes.result.value);
    const queueLength = injectRes.result.value?.queueLength || 0;
    if (queueLength < 1) {
      console.error('FAILED: queueLength is not >= 1 before exit!');
      process.exit(1);
    }
    console.log(`✅ CONFIRMED: outbox queueLength = ${queueLength} in IndexedDB.`);

    // Step 3: Query Supabase database BEFORE exit
    console.log('Step 3: Checking Supabase activity_events BEFORE page exit...');
    const dbBefore = queryDbForEvent(testEventId);
    console.log(`DB Status BEFORE exit: ${dbBefore}`);
    if (dbBefore !== 'NOT_FOUND_IN_DB') {
      console.error('FAILED: Event already exists in DB before exit! Invalid test condition.');
      process.exit(1);
    }
    console.log('✅ CONFIRMED: Event is strictly NOT present in activity_events before exit.');

    // Step 4: Dispatch pagehide / visibilitychange event and immediately navigate away
    console.log('Step 4: Dispatching pagehide (triggers flushOutboxKeepalive) and immediately navigating away...');
    await call('Runtime.evaluate', {
      expression: `(async () => {
        // Dispatch pagehide
        window.dispatchEvent(new Event('pagehide'));
        // Wait 150ms for the synchronous/microtask keepalive dispatch to hit the browser network queue
        await new Promise(r => setTimeout(r, 150));
        return true;
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    await call('Page.navigate', { url: 'about:blank' });
    ws.close();

    // Step 5: Wait 4 seconds for keepalive HTTP request to complete on the network
    console.log('Step 5: Waiting 4 seconds for keepalive payload ingestion...');
    await new Promise(r => setTimeout(r, 4000));

    // Step 6: Query Supabase database AFTER exit
    console.log('Step 6: Checking Supabase activity_events AFTER page exit...');
    const dbAfter = queryDbForEvent(testEventId);
    console.log(`DB Status AFTER exit: ${dbAfter}`);

    if (dbAfter === 'FOUND_IN_DB') {
      console.log(`\n======================================================================`);
      console.log(`🎉 PROOF COMPLETE: Event was NOT in DB before exit, and IS in DB after exit!`);
      console.log(`The keepalive flush successfully delivered the event during page termination!`);
      console.log(`======================================================================\n`);
      process.exit(0);
    } else {
      console.error(`\n❌ FAILED: Event was NOT delivered to DB during page exit!\n`);
      process.exit(1);
    }
  });
});
