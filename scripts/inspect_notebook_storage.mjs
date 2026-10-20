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
      const storageData = await send('Runtime.evaluate', {
        expression: `(async () => {
          // Check localStorage
          const localKeys = Object.keys(localStorage).filter(k => k.includes('mistake') || k.includes('leitner') || k.includes('notebook'));
          const localObj = {};
          localKeys.forEach(k => localObj[k] = localStorage.getItem(k));

          // Check IndexedDB
          const idbData = await new Promise(res => {
            const req = indexedDB.open('keyval-store');
            req.onsuccess = () => {
              const db = req.result;
              if (!db.objectStoreNames.contains('keyval')) return res({});
              const tx = db.transaction('keyval', 'readonly');
              const store = tx.objectStore('keyval');
              const r = store.getAll();
              const k = store.getAllKeys();
              r.onsuccess = () => {
                k.onsuccess = () => {
                  const map = {};
                  k.result.forEach((key, idx) => map[key] = r.result[idx]);
                  res(map);
                };
              };
            };
            req.onerror = () => res({});
          });

          return { localObj, idbData };
        })()`,
        awaitPromise: true,
        returnByValue: true
      });

      console.log('NOTEBOOK_STORAGE:', JSON.stringify(storageData.result.value, null, 2));
      ws.close();
      process.exit(0);
    };
  });
});
