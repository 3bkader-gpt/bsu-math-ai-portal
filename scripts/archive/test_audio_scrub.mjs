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
      // 1. Switch back to audio tab
      await send('Runtime.evaluate', {
        expression: `(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('بودكاست'));
          if (btn) btn.click();
        })()`
      });
      await new Promise(r => setTimeout(r, 1000));

      // 2. Scrub audio slider directly to 99% (currentTime = duration - 2s)
      const scrubRes = await send('Runtime.evaluate', {
        expression: `(() => {
          const audio = document.querySelector('audio');
          if (audio) {
            audio.currentTime = Math.max(0, audio.duration - 2);
            audio.play().catch(() => {});
            return { duration: audio.duration, currentTime: audio.currentTime };
          }
          return 'no audio element';
        })()`,
        returnByValue: true
      });
      console.log('Scrub result:', scrubRes.result.value);

      // Wait 3.5s for audio to end naturally
      await new Promise(r => setTimeout(r, 3500));

      // 3. Inspect XP and streak
      const state = await send('Runtime.evaluate', {
        expression: `(() => {
          const audio = document.querySelector('audio');
          return {
            ended: audio ? audio.ended : null,
            currentTime: audio ? audio.currentTime : null,
            pillText: document.querySelector('button[title*="نقاطك"]')?.innerText || 'Not found',
            totalXp: localStorage.getItem('bsu_student_xp') || localStorage.getItem('bsu_gamification_xp') || '0',
            streak: localStorage.getItem('bsu_student_streak') || localStorage.getItem('bsu_gamification_streak') || '0'
          };
        })()`,
        returnByValue: true
      });

      console.log('AUDIO_SCRUB_END_STATE:', state.result.value);
      ws.close();
      process.exit(0);
    };
  });
});
