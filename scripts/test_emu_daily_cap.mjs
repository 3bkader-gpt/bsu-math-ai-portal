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

    console.log('1. Checking current daily XP earned...');
    const s0 = await call('Runtime.evaluate', {
      expression: `(() => {
        const s = JSON.parse(localStorage.getItem('bsu_portal_gamification_state_v1') || '{}');
        return { totalXp: s.totalXp, dailyXp: s.dailyXpEarned };
      })()`,
      returnByValue: true
    });
    console.log('Current state:', s0.result.value);

    // Let's set daily XP close to 400 (e.g. 390) and emit an event worth 25 XP
    console.log('2. Emitting events to reach 400 XP cap...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const bus = window.__GAMIFICATION_CORE__.appEventBus;
        // Ingest quiz finished event with large score
        bus.emit('quiz.finished', {
          type: 'quiz.finished',
          payload: { lectureId: 2, score: 10, total: 10, attempt: 1, durationMs: 60000 },
          meta: { id: 'evt_cap1_' + Date.now(), timestamp: Date.now(), lectureId: 2 }
        });
        bus.emit('quiz.finished', {
          type: 'quiz.finished',
          payload: { lectureId: 3, score: 10, total: 10, attempt: 1, durationMs: 60000 },
          meta: { id: 'evt_cap2_' + Date.now(), timestamp: Date.now(), lectureId: 3 }
        });
        bus.emit('quiz.finished', {
          type: 'quiz.finished',
          payload: { lectureId: 4, score: 10, total: 10, attempt: 1, durationMs: 60000 },
          meta: { id: 'evt_cap3_' + Date.now(), timestamp: Date.now(), lectureId: 4 }
        });
      })()`,
      returnByValue: true
    });

    await new Promise(r => setTimeout(r, 2000));

    const s1 = await call('Runtime.evaluate', {
      expression: `(() => {
        const s = JSON.parse(localStorage.getItem('bsu_portal_gamification_state_v1') || '{}');
        return { totalXp: s.totalXp, dailyXp: s.dailyXpEarned };
      })()`,
      returnByValue: true
    });
    console.log('State at/near cap:', s1.result.value);

    // Now emit another event when at cap (400 XP)
    console.log('3. Emitting event AFTER cap is reached...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const bus = window.__GAMIFICATION_CORE__.appEventBus;
        bus.emit('media.completed', {
          type: 'media.completed',
          payload: { lectureId: 5, kind: 'video', durationSec: 1000 },
          meta: { id: 'evt_after_cap_' + Date.now(), timestamp: Date.now(), lectureId: 5 }
        });
      })()`,
      returnByValue: true
    });

    await new Promise(r => setTimeout(r, 1500));

    const s2 = await call('Runtime.evaluate', {
      expression: `(() => {
        const s = JSON.parse(localStorage.getItem('bsu_portal_gamification_state_v1') || '{}');
        return { totalXp: s.totalXp, dailyXp: s.dailyXpEarned };
      })()`,
      returnByValue: true
    });
    console.log('State after attempt past cap:', s2.result.value);
    const passCap = (s2.result.value.dailyXp <= 400 && s2.result.value.dailyXp === s1.result.value.dailyXp);
    console.log('F.3 Daily Cap 400 XP Enforced:', passCap ? 'PASS (0 XP awarded after cap)' : 'Check');

    ws.close();
    process.exit(0);
  });
});
