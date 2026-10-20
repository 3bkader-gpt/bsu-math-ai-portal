import http from 'http';

// 1. Get devtools list
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
      // Evaluate session & state
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `(() => {
            return {
              buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(Boolean),
              url: window.location.href
            };
          })()`,
          returnByValue: true
        }
      }));
    };

    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.id === 1) {
        console.log('PORTAL_DATA:', JSON.stringify(data.result, null, 2));
        ws.close();
        process.exit(0);
      }
    };
  });
});
