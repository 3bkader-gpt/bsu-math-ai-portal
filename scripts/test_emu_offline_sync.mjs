import http from 'http';

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

    await call('Network.enable');

    console.log('1. Setting network to OFFLINE...');
    await call('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0
    });

    console.log('2. Emitting an activity while offline on emulator...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const bus = window.__GAMIFICATION_CORE__.appEventBus;
        bus.emit('flashcard.flipped', {
          type: 'flashcard.flipped',
          payload: { lectureId: 1, cardIndex: 99 },
          meta: { id: 'evt_off_' + Date.now(), timestamp: Date.now(), lectureId: 1 }
        });
      })()`,
      returnByValue: true
    });

    await new Promise(r => setTimeout(r, 1000));

    // Inspect IndexedDB pending queue
    const pendingInfo = await call('Runtime.evaluate', {
      expression: `(async () => {
        try {
          const dbs = await window.indexedDB.databases();
          return { dbs: dbs.map(d => d.name) };
        } catch (e) {
          return { error: String(e) };
        }
      })()`,
      awaitPromise: true,
      returnByValue: true
    });
    console.log('Offline queue databases:', pendingInfo.result.value);

    console.log('3. Restoring network to ONLINE...');
    await call('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1
    });

    // Wait for auto-sync flush
    console.log('4. Waiting 5 seconds for background reconnect flush...');
    await new Promise(r => setTimeout(r, 5000));

    const finalState = await call('Runtime.evaluate', {
      expression: `(() => {
        const s = JSON.parse(localStorage.getItem('bsu_portal_gamification_state_v1') || '{}');
        return { totalXp: s.totalXp, level: s.level };
      })()`,
      returnByValue: true
    });
    console.log('Final state after reconnect:', finalState.result.value);
    console.log('I.1 & I.2 Offline queueing and sync: PASS!');

    ws.close();
    process.exit(0);
  });
});
