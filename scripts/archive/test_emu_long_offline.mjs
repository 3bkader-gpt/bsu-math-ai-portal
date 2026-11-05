import http from 'http';

http.get('http://127.0.0.1:9222/json/list', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', async () => {
    const list = JSON.parse(body);
    const page = list.find(p => p.url.includes('bsu-math-ai-portal') && p.type === 'page');
    if (!page) {
      console.error('No portal page found');
      process.exit(1);
    }

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let reqId = 1;
    function call(method, params = {}) {
      return new Promise((resolve) => {
        const id = reqId++;
        const onMsg = (evt) => {
          const data = JSON.parse(evt.data);
          if (data.id === id) {
            ws.removeEventListener('message', onMsg);
            resolve(data.result);
          }
        };
        ws.addEventListener('message', onMsg);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await call('Network.enable');

    console.log('1. Setting network to OFFLINE on emulator...');
    await call('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0
    });

    const testEventId = 'evt_offline_long_' + Date.now();
    console.log(`2. Emitting offline activity event (ID: ${testEventId})...`);
    await call('Runtime.evaluate', {
      expression: `(() => {
        const bus = window.__GAMIFICATION_CORE__.appEventBus;
        bus.emit('quiz.question_answered', {
          type: 'quiz.question_answered',
          payload: {
            lectureId: 1,
            questionIndex: 0,
            questionHash: 'q_long_off_test',
            questionText: 'سؤال اختبار الأوفلاين الطويل',
            userAnswer: 'صح',
            correctAnswer: 'صح',
            isCorrect: true,
            durationMs: 4000,
            confidence: 'normal'
          },
          meta: {
            id: '${testEventId}',
            timestamp: Date.now(),
            lectureId: 1
          }
        });
      })()`,
      returnByValue: true
    });

    console.log('3. Waiting 190 seconds (over 3 minutes / 9 flush cycles of 20s) in OFFLINE state...');
    // We log every 30 seconds to show live progress
    for (let sec = 30; sec <= 190; sec += 30) {
      await new Promise(r => setTimeout(r, 30000));
      console.log(`   ... elapsed ${sec}s offline`);
    }

    // Inspect Outbox and Dead Letter before reconnect
    console.log('4. Inspecting Outbox & Dead Letter before reconnecting...');
    const queueInspection = await call('Runtime.evaluate', {
      expression: `(async () => {
        // Read directly from indexedDB 'bsu_portal_gamification'
        return new Promise(resolve => {
          const req = indexedDB.open('bsu_portal_gamification');
          req.onsuccess = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('outbox')) {
              return resolve({ noStore: true });
            }
            const tx = db.transaction('outbox', 'readonly');
            const store = tx.objectStore('outbox');
            const getQ = store.get('bsu_gamification_outbox_queue');
            const getD = store.get('bsu_gamification_dead_letter');
            tx.oncomplete = () => {
              resolve({
                outboxCount: (getQ.result || []).length,
                outboxItems: (getQ.result || []).map(i => ({ id: i.id, retryCount: i.retryCount })),
                deadLetterCount: (getD.result || []).length
              });
            };
          };
          req.onerror = () => resolve({ error: req.error });
        });
      })()`,
      awaitPromise: true,
      returnByValue: true
    });
    console.log('Queue state before reconnect:', queueInspection.result.value);

    console.log('5. Restoring network to ONLINE on emulator...');
    await call('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1
    });

    // Wait 10 seconds for auto-flush on reconnect
    console.log('6. Waiting 10 seconds for online sync flush...');
    await new Promise(r => setTimeout(r, 10000));

    // Inspect Outbox after reconnect
    const queueAfter = await call('Runtime.evaluate', {
      expression: `(async () => {
        return new Promise(resolve => {
          const req = indexedDB.open('bsu_portal_gamification');
          req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction('outbox', 'readonly');
            const store = tx.objectStore('outbox');
            const getQ = store.get('bsu_gamification_outbox_queue');
            const getD = store.get('bsu_gamification_dead_letter');
            tx.oncomplete = () => {
              resolve({
                outboxCount: (getQ.result || []).length,
                deadLetterCount: (getD.result || []).length
              });
            };
          };
        });
      })()`,
      awaitPromise: true,
      returnByValue: true
    });
    console.log('Queue state AFTER reconnect:', queueAfter.result.value);

    ws.close();
    process.exit(0);
  });
});
