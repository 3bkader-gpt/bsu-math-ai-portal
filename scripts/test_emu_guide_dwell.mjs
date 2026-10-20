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

    console.log('1. Switching to Study Guide tab...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const guideBtn = btns.find(b => b.textContent && b.textContent.includes('الدليل'));
        if (guideBtn) guideBtn.click();
        return { clicked: !!guideBtn };
      })()`,
      returnByValue: true
    });

    await new Promise(r => setTimeout(r, 1000));

    // Inspect initial XP
    const beforeState = await call('Runtime.evaluate', {
      expression: `(() => {
        const s = JSON.parse(localStorage.getItem('bsu_portal_gamification_state_v1') || '{}');
        return { totalXp: s.totalXp, level: s.level };
      })()`,
      returnByValue: true
    });
    console.log('Before dwell:', beforeState.result.value);

    // Let's trigger trackStudyGuideRead(1, 60)
    console.log('2. Emitting study guide 60s dwell event...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        // Dispatch study_guide.read event into event bus directly or via app
        const appEvent = {
          type: 'study_guide.read',
          payload: { lectureId: 1, dwellSeconds: 60 },
          meta: { timestamp: Date.now(), sessionId: sessionStorage.getItem('bsu_session_id') || 'sess_test' }
        };
        // Emit via window event bus or storage
        window.dispatchEvent(new CustomEvent('bsu:app-event', { detail: appEvent }));
      })()`,
      returnByValue: true
    });

    await new Promise(r => setTimeout(r, 2000));

    const afterState = await call('Runtime.evaluate', {
      expression: `(() => {
        const s = JSON.parse(localStorage.getItem('bsu_portal_gamification_state_v1') || '{}');
        return { totalXp: s.totalXp, level: s.level };
      })()`,
      returnByValue: true
    });
    console.log('After dwell:', afterState.result.value);

    ws.close();
    process.exit(0);
  });
});
