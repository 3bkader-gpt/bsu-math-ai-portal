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
      // 1. Switch to video tab
      const tabSwitch = await send('Runtime.evaluate', {
        expression: `(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('فيديو'));
          if (btn) { btn.click(); return 'clicked'; }
          return 'not found';
        })()`,
        returnByValue: true
      });
      console.log('Switch to video tab:', tabSwitch.result.value);

      // Wait 1.5s for video element
      await new Promise(r => setTimeout(r, 1500));

      // 2. Play video if element exists
      const playRes = await send('Runtime.evaluate', {
        expression: `(() => {
          const vid = document.querySelector('video');
          if (vid) {
            vid.play().catch(e => console.log('play err', e));
            return { duration: vid.duration, paused: vid.paused };
          }
          const iframe = document.querySelector('iframe');
          if (iframe) return { iframeSrc: iframe.src };
          return 'no video or iframe';
        })()`,
        returnByValue: true
      });
      console.log('Video element status:', playRes.result.value);

      // Wait 10 seconds
      await new Promise(r => setTimeout(r, 10000));

      // Pause video
      await send('Runtime.evaluate', {
        expression: `(() => {
          const vid = document.querySelector('video');
          if (vid) vid.pause();
        })()`
      });

      // Check XP & streak
      const state = await send('Runtime.evaluate', {
        expression: `(() => {
          return {
            pillText: document.querySelector('button[title*="نقاطك"]')?.innerText || 'Not found',
            localXp: localStorage.getItem('bsu_student_xp') || localStorage.getItem('bsu_gamification_xp') || '0',
            streak: localStorage.getItem('bsu_student_streak') || localStorage.getItem('bsu_gamification_streak') || '0'
          };
        })()`,
        returnByValue: true
      });

      console.log('VIDEO_10S_STATE:', state.result.value);
      ws.close();
      process.exit(0);
    };
  });
});
