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
      // 1. Reset audio to 0 and play
      await send('Runtime.evaluate', {
        expression: `(() => {
          const a = document.querySelector('audio');
          if (a) { a.currentTime = 0; a.play().catch(() => {}); }
        })()`
      });
      await new Promise(r => setTimeout(r, 2000));

      // 2. Pause
      await send('Runtime.evaluate', {
        expression: `(() => {
          const a = document.querySelector('audio');
          if (a) a.pause();
        })()`
      });
      await new Promise(r => setTimeout(r, 1000));

      // 3. Resume
      await send('Runtime.evaluate', {
        expression: `(() => {
          const a = document.querySelector('audio');
          if (a) a.play().catch(() => {});
        })()`
      });
      await new Promise(r => setTimeout(r, 2000));

      // 4. Pause again
      await send('Runtime.evaluate', {
        expression: `(() => {
          const a = document.querySelector('audio');
          if (a) a.pause();
        })()`
      });

      // 5. Inspect XP
      const state = await send('Runtime.evaluate', {
        expression: `(() => {
          return {
            pillText: document.querySelector('button[title*="نقاطك"]')?.innerText || 'Not found',
            totalXp: localStorage.getItem('bsu_student_xp') || localStorage.getItem('bsu_gamification_xp') || '0'
          };
        })()`,
        returnByValue: true
      });

      console.log('PAUSE_RESUME_STATE:', state.result.value);
      ws.close();
      process.exit(0);
    };
  });
});
