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
    const logs = [];

    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Console.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 3, method: 'Page.enable' }));
      
      // Hard reload
      setTimeout(() => {
        ws.send(JSON.stringify({ id: 4, method: 'Page.reload', params: { ignoreCache: true } }));
      }, 500);

      // Collect logs for 3 seconds after reload
      setTimeout(() => {
        const hydrationWarns = logs.filter(l => /hydration|mismatch/i.test(l.text || ''));
        const errors = logs.filter(l => l.level === 'error');
        console.log('CONSOLE_CHECK_RESULT:', {
          totalLogs: logs.length,
          hydrationWarnings: hydrationWarns.length,
          errors: errors.map(e => e.text)
        });
        ws.close();
        process.exit(0);
      }, 3500);
    };

    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.method === 'Console.messageAdded') {
        logs.push(data.params.message);
      } else if (data.method === 'Runtime.consoleAPICalled') {
        logs.push({
          level: data.params.type,
          text: (data.params.args || []).map(a => a.value || a.description).join(' ')
        });
      }
    };
  });
});
