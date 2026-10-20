import http from 'http';

http.get('http://127.0.0.1:9222/json/list', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const list = JSON.parse(body);
    const page = list.find(p => p.url.includes('bsu-math-ai-portal') && p.type === 'page');
    if (!page) {
      console.log('No portal page found:', list);
      process.exit(1);
    }

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            const rawStore = localStorage.getItem('bsu_portal_gamification_state_v1');
            const rawResume = localStorage.getItem('bsu_smart_resume_state');
            return {
              gamificationState: rawStore ? JSON.parse(rawStore) : null,
              smartResume: rawResume ? JSON.parse(rawResume) : null,
            };
          })()`,
          returnByValue: true
        }
      }));
    };

    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.id === 1) {
        console.log('GAMIFICATION_DATA:', JSON.stringify(data.result, null, 2));
        ws.close();
        process.exit(0);
      }
    };
  });
});
