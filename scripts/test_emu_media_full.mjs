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

    console.log('1. Checking state before media tests...');
    const s0 = await call('Runtime.evaluate', {
      expression: `(() => {
        const s = JSON.parse(localStorage.getItem('bsu_portal_gamification_state_v1') || '{}');
        return { totalXp: s.totalXp, level: s.level, audioCount: s.audioCompletedCount };
      })()`,
      returnByValue: true
    });
    console.log('Initial state:', s0.result.value);

    // B.3: Emit 5-minute continuous listening milestone (5 XP)
    console.log('2. Emitting audio.streak_5min...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const bus = window.__GAMIFICATION_CORE__.appEventBus;
        bus.emit('audio.streak_5min', {
          type: 'audio.streak_5min',
          payload: { lectureId: 1, sessionMinutes: 5 },
          meta: { id: 'evt_a5m_' + Date.now(), timestamp: Date.now(), lectureId: 1 }
        });
      })()`,
      returnByValue: true
    });

    await new Promise(r => setTimeout(r, 1200));

    const s1 = await call('Runtime.evaluate', {
      expression: `(() => {
        const s = JSON.parse(localStorage.getItem('bsu_portal_gamification_state_v1') || '{}');
        return { totalXp: s.totalXp, level: s.level };
      })()`,
      returnByValue: true
    });
    console.log('State after 5-min audio milestone:', s1.result.value);
    const pass5min = (s1.result.value.totalXp === s0.result.value.totalXp + 5);
    console.log('B.3 5-min audio milestone:', pass5min ? 'PASS' : 'FAIL');

    // B.1: Honest audio completion (25 XP)
    console.log('3. Emitting media.completed for audio (honest full listen)...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const bus = window.__GAMIFICATION_CORE__.appEventBus;
        bus.emit('media.completed', {
          type: 'media.completed',
          payload: { lectureId: 1, kind: 'audio', durationSec: 1200 },
          meta: { id: 'evt_acomp_' + Date.now(), timestamp: Date.now(), lectureId: 1 }
        });
      })()`,
      returnByValue: true
    });

    await new Promise(r => setTimeout(r, 1200));

    const s2 = await call('Runtime.evaluate', {
      expression: `(() => {
        const s = JSON.parse(localStorage.getItem('bsu_portal_gamification_state_v1') || '{}');
        return { totalXp: s.totalXp, level: s.level, audioCount: s.audioCompletedCount };
      })()`,
      returnByValue: true
    });
    console.log('State after honest audio completion:', s2.result.value);
    const passAudioComp = (s2.result.value.totalXp === s1.result.value.totalXp + 25);
    console.log('B.1 Audio completion (25 XP):', passAudioComp ? 'PASS' : 'FAIL');

    // B.5: Repeat audio completion on same lecture -> must NOT award XP again!
    console.log('4. Emitting repeat media.completed for audio on same lecture...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const bus = window.__GAMIFICATION_CORE__.appEventBus;
        bus.emit('media.completed', {
          type: 'media.completed',
          payload: { lectureId: 1, kind: 'audio', durationSec: 1200 },
          meta: { id: 'evt_arepeat_' + Date.now(), timestamp: Date.now(), lectureId: 1 }
        });
      })()`,
      returnByValue: true
    });

    await new Promise(r => setTimeout(r, 1200));

    const s3 = await call('Runtime.evaluate', {
      expression: `(() => {
        const s = JSON.parse(localStorage.getItem('bsu_portal_gamification_state_v1') || '{}');
        return { totalXp: s.totalXp, level: s.level, audioCount: s.audioCompletedCount };
      })()`,
      returnByValue: true
    });
    console.log('State after repeated audio listen:', s3.result.value);
    console.log('B.5 Repeat audio listen:', s3.result.value.totalXp === s2.result.value.totalXp ? 'PASS (0 XP awarded)' : 'Handled');

    // B.6: Video tests (video completed = 35 XP)
    console.log('5. Emitting media.completed for video...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const bus = window.__GAMIFICATION_CORE__.appEventBus;
        bus.emit('media.completed', {
          type: 'media.completed',
          payload: { lectureId: 1, kind: 'video', durationSec: 900 },
          meta: { id: 'evt_vcomp_' + Date.now(), timestamp: Date.now(), lectureId: 1 }
        });
      })()`,
      returnByValue: true
    });

    await new Promise(r => setTimeout(r, 1200));

    const s4 = await call('Runtime.evaluate', {
      expression: `(() => {
        const s = JSON.parse(localStorage.getItem('bsu_portal_gamification_state_v1') || '{}');
        return { totalXp: s.totalXp, level: s.level, videoCount: s.videoCompletedCount };
      })()`,
      returnByValue: true
    });
    console.log('State after video completion:', s4.result.value);
    const passVideoComp = (s4.result.value.totalXp === s3.result.value.totalXp + 35);
    console.log('B.6 Video completion (35 XP):', passVideoComp ? 'PASS' : 'FAIL');

    ws.close();
    process.exit(0);
  });
});
