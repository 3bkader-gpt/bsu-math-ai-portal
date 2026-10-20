import http from 'http';

http.get('http://127.0.0.1:9222/json/list', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const list = JSON.parse(body);
    const page = list.find(p => p.url.includes('bsu-math-ai-portal') && p.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            return {
              pillText: document.querySelector('button[title*="نقاطك"]')?.innerText || 'Not found',
              pendingCount: localStorage.getItem('bsu_gamification_pending') || '0',
              localXp: localStorage.getItem('bsu_student_xp') || localStorage.getItem('bsu_gamification_xp') || '0',
              streak: localStorage.getItem('bsu_student_streak') || localStorage.getItem('bsu_gamification_streak') || '0'
            };
          })()`,
          returnByValue: true
        }
      }));
    };

    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.id === 1) {
        console.log('PODCAST_10S_CHECK:', data.result.result.value);
        ws.close();
        process.exit(0);
      }
    };
  });
});
