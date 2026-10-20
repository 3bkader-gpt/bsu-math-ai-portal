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

    console.log('1. Checking current state...');
    const s0 = await call('Runtime.evaluate', {
      expression: `(() => {
        const s = JSON.parse(localStorage.getItem('bsu_portal_gamification_state_v1') || '{}');
        return { totalXp: s.totalXp, level: s.level };
      })()`,
      returnByValue: true
    });
    console.log('Initial state:', s0.result.value);

    console.log('2. Emitting study_guide.read via window.__GAMIFICATION_CORE__.appEventBus...');
    const emitRes = await call('Runtime.evaluate', {
      expression: `(() => {
        if (!window.__GAMIFICATION_CORE__) return 'No __GAMIFICATION_CORE__';
        const bus = window.__GAMIFICATION_CORE__.appEventBus;
        const evt = {
          type: 'study_guide.read',
          payload: { lectureId: 1, dwellSec: 60 },
          meta: {
            id: 'evt_' + Math.random().toString(36).substring(2, 9),
            timestamp: Date.now(),
            lectureId: 1
          }
        };
        bus.emit('study_guide.read', evt);
        return { emitted: true };
      })()`,
      returnByValue: true
    });
    console.log('Emit result:', emitRes.result.value);

    await new Promise(r => setTimeout(r, 2000));

    const s1 = await call('Runtime.evaluate', {
      expression: `(() => {
        const s = JSON.parse(localStorage.getItem('bsu_portal_gamification_state_v1') || '{}');
        return { totalXp: s.totalXp, level: s.level };
      })()`,
      returnByValue: true
    });
    console.log('State after study_guide.read:', s1.result.value);

    ws.close();
    process.exit(0);
  });
});
