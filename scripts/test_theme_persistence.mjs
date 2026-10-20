import http from 'http';

http.get('http://127.0.0.1:9222/json/list', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', async () => {
    const list = JSON.parse(body);
    const page = list.find(p => p.url.includes('bsu-math-ai-portal') && p.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);

    const send = (method, params = {}) => new Promise((resolve) => {
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
      // Step 1: Change to girls and light
      await send('Runtime.evaluate', {
        expression: `(() => {
          localStorage.setItem('bsu_portal_persona', 'girls');
          localStorage.setItem('bsu_portal_mode', 'light');
          document.documentElement.setAttribute('data-persona', 'girls');
          document.documentElement.setAttribute('data-mode', 'light');
          window.dispatchEvent(new CustomEvent('bsu_theme_changed', { detail: { persona: 'girls', mode: 'light' } }));
          return { persona: localStorage.getItem('bsu_portal_persona'), mode: localStorage.getItem('bsu_portal_mode') };
        })()`,
        returnByValue: true
      });

      // Step 2: Hard reload
      await send('Page.reload', { ignoreCache: true });
      await new Promise(r => setTimeout(r, 2500));

      // Step 3: Check after reload
      const checkResult = await send('Runtime.evaluate', {
        expression: `(() => {
          return {
            storedPersona: localStorage.getItem('bsu_portal_persona'),
            storedMode: localStorage.getItem('bsu_portal_mode'),
            attrPersona: document.documentElement.getAttribute('data-persona'),
            attrMode: document.documentElement.getAttribute('data-mode')
          };
        })()`,
        returnByValue: true
      });

      console.log('THEME_PERSISTENCE_CHECK:', checkResult.result.value);

      // Step 4: Revert back to boys / dark
      await send('Runtime.evaluate', {
        expression: `(() => {
          localStorage.setItem('bsu_portal_persona', 'boys');
          localStorage.setItem('bsu_portal_mode', 'dark');
          document.documentElement.setAttribute('data-persona', 'boys');
          document.documentElement.setAttribute('data-mode', 'dark');
          window.dispatchEvent(new CustomEvent('bsu_theme_changed', { detail: { persona: 'boys', mode: 'dark' } }));
        })()`
      });

      ws.close();
      process.exit(0);
    };
  });
});
