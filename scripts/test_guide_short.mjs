import http from 'http';

http.get('http://127.0.0.1:9222/json/list', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', async () => {
    const list = JSON.parse(body);
    const page = list.find(p => p.url.includes('bsu-math-ai-portal') && p.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);

    const send = (method, params = {}) => new Promise(resolve => {
      const id = Math.floor(Math.random() * 100000);
      const onMsg = (evt) => {
        const d = JSON.parse(evt.data);
        if (d.id === id) {
          ws.removeEventListener('message', onMsg);
          resolve(d.result);
        }
      };
      ws.addEventListener('message', onMsg);
      ws.send(JSON.stringify({ id, method, params }));
    });

    ws.onopen = async () => {
      // 1. Switch to guide tab
      const tabRes = await send('Runtime.evaluate', {
        expression: `(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('الدليل') || b.textContent.includes('ملخص') || b.textContent.includes('شرح')));
          if (btn) { btn.click(); return btn.textContent.trim(); }
          return 'not found';
        })()`,
        returnByValue: true
      });
      console.log('Opened guide tab:', tabRes.result.value);

      // Wait 5 seconds (<60s)
      await new Promise(r => setTimeout(r, 5000));

      // Switch away to audio tab
      await send('Runtime.evaluate', {
        expression: `(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('بودكاست'));
          if (btn) btn.click();
        })()`
      });
      await new Promise(r => setTimeout(r, 1000));

      // Inspect XP
      const state = await send('Runtime.evaluate', {
        expression: `(() => {
          return {
            pillText: document.querySelector('button[title*="نقاطك"]')?.innerText || 'Not found',
            totalXp: localStorage.getItem('bsu_student_xp') || localStorage.getItem('bsu_gamification_xp') || '0'
          };
        })()`,
        returnByValue: true
      });

      console.log('GUIDE_SHORT_STAY_STATE:', state.result.value);
      ws.close();
      process.exit(0);
    };
  });
});
