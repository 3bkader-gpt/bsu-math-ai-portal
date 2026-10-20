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

    console.log('1. Clicking reveal button in Mistake Notebook...');
    const revealRes = await call('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const revBtn = btns.find(b => b.textContent && b.textContent.includes('اكشف الحل'));
        if (revBtn) {
          revBtn.click();
          return { clicked: true, text: revBtn.textContent.trim() };
        }
        return { clicked: false };
      })()`,
      returnByValue: true
    });
    console.log('Reveal result:', revealRes.result.value);

    // Wait 4 seconds to satisfy the >=3000ms deliberate review guard
    console.log('2. Waiting 4000ms for deliberate thinking (>=3s)...');
    await new Promise(r => setTimeout(r, 4000));

    console.log('3. Clicking "افتكرتها صح! (ترقية الصندوق)"...');
    const answerRes = await call('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const correctBtn = btns.find(b => b.textContent && b.textContent.includes('افتكرتها صح'));
        if (correctBtn) {
          correctBtn.click();
          return { clicked: true, text: correctBtn.textContent.trim() };
        }
        return { clicked: false, availableButtons: btns.map(b => b.textContent.trim()) };
      })()`,
      returnByValue: true
    });
    console.log('Answer result:', answerRes.result.value);

    // Wait 2s for RPC response
    await new Promise(r => setTimeout(r, 2500));

    // Inspect feedback and box counts
    const modalAfter = await call('Runtime.evaluate', {
      expression: `(() => {
        const modal = document.querySelector('[role=\"dialog\"], .fixed.inset-0, [aria-modal=\"true\"]');
        const s = JSON.parse(localStorage.getItem('bsu_portal_gamification_state_v1') || '{}');
        return {
          totalXp: s.totalXp,
          level: s.level,
          modalTextSample: modal ? modal.textContent.substring(0, 350) : null
        };
      })()`,
      returnByValue: true
    });
    console.log('Modal after review:', modalAfter.result.value);

    ws.close();
    process.exit(0);
  });
});
