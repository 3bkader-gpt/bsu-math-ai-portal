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
      // 1. Toggle mute to true
      await send('Runtime.evaluate', {
        expression: `(() => {
          localStorage.setItem('bsu_audio_muted', 'true');
          return localStorage.getItem('bsu_audio_muted');
        })()`
      });

      // 2. Reload page
      await send('Page.reload', { ignoreCache: true });
      await new Promise(r => setTimeout(r, 2500));

      // 3. Check if still muted
      const muteCheck = await send('Runtime.evaluate', {
        expression: `(() => {
          return {
            mutedAfterRefresh: localStorage.getItem('bsu_audio_muted')
          };
        })()`,
        returnByValue: true
      });

      console.log('MUTE_PERSISTENCE_RESULT:', muteCheck.result.value);

      // Revert mute
      await send('Runtime.evaluate', {
        expression: `(() => {
          localStorage.removeItem('bsu_audio_muted');
        })()`
      });

      ws.close();
      process.exit(0);
    };
  });
});
