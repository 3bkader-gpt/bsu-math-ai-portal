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
      const idbCheck = await send('Runtime.evaluate', {
        expression: `(async () => {
          return new Promise(resolve => {
            const req = indexedDB.open('keyval-store');
            req.onsuccess = () => {
              const db = req.result;
              if (!db.objectStoreNames.contains('keyval')) {
                return resolve({ keys: [], hasProgress: false });
              }
              const tx = db.transaction('keyval', 'readonly');
              const store = tx.objectStore('keyval');
              const allReq = store.getAll();
              allReq.onsuccess = () => {
                const items = allReq.result || [];
                const progressEvents = items.filter(i => JSON.stringify(i).includes('media.progress'));
                resolve({ itemsCount: items.length, progressCount: progressEvents.length, items });
              };
            };
            req.onerror = () => resolve({ error: 'cannot open idb' });
          });
        })()`,
        awaitPromise: true,
        returnByValue: true
      });

      console.log('IDB_ACTIVITY_EVENTS_CHECK:', JSON.stringify(idbCheck.result.value, null, 2));
      ws.close();
      process.exit(0);
    };
  });
});
