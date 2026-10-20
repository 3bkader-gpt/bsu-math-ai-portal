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

    console.log('1. Checking current XP before fast answer test...');
    const s0 = await call('Runtime.evaluate', {
      expression: `(() => {
        const s = JSON.parse(localStorage.getItem('bsu_portal_gamification_state_v1') || '{}');
        return { totalXp: s.totalXp, level: s.level };
      })()`,
      returnByValue: true
    });
    console.log('Initial state:', s0.result.value);

    // Test D.3: Answer correctly but in under 3 seconds (durationMs = 1500ms)
    console.log('2. Emitting quiz.question_answered with durationMs = 1500ms (< 3s)...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const bus = window.__GAMIFICATION_CORE__.appEventBus;
        const evt = {
          type: 'quiz.question_answered',
          payload: {
            lectureId: 1,
            questionIndex: 3,
            isCorrect: true,
            durationMs: 1500, // Anti-cheat: less than 3s
            confidence: 'normal'
          },
          meta: {
            id: 'evt_fast_' + Math.random().toString(36).substring(2, 9),
            timestamp: Date.now(),
            lectureId: 1
          }
        };
        bus.emit('quiz.question_answered', evt);
      })()`,
      returnByValue: true
    });

    await new Promise(r => setTimeout(r, 1500));

    const s1 = await call('Runtime.evaluate', {
      expression: `(() => {
        const s = JSON.parse(localStorage.getItem('bsu_portal_gamification_state_v1') || '{}');
        return { totalXp: s.totalXp, level: s.level };
      })()`,
      returnByValue: true
    });
    console.log('State after fast answer (<3s):', s1.result.value);
    const passFast = (s1.result.value.totalXp === s0.result.value.totalXp);
    console.log('D.3 Result (<3s answer awarded 0 XP):', passFast ? 'PASS' : 'FAIL');

    // Test D.5: Complete quiz with 100% perfect score
    console.log('3. Emitting quiz.finished with 100% score (5/5)...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const bus = window.__GAMIFICATION_CORE__.appEventBus;
        const evt = {
          type: 'quiz.finished',
          payload: {
            lectureId: 1,
            score: 5,
            total: 5,
            attempt: 1,
            durationMs: 45000
          },
          meta: {
            id: 'evt_perf_' + Math.random().toString(36).substring(2, 9),
            timestamp: Date.now(),
            lectureId: 1
          }
        };
        bus.emit('quiz.finished', evt);
      })()`,
      returnByValue: true
    });

    await new Promise(r => setTimeout(r, 2000));

    const s2 = await call('Runtime.evaluate', {
      expression: `(() => {
        const s = JSON.parse(localStorage.getItem('bsu_portal_gamification_state_v1') || '{}');
        return {
          totalXp: s.totalXp,
          level: s.level,
          unlockedBadges: s.unlockedBadges
        };
      })()`,
      returnByValue: true
    });
    console.log('State after perfect quiz:', s2.result.value);

    ws.close();
    process.exit(0);
  });
});
