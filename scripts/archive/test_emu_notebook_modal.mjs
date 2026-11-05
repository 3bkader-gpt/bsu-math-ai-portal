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

    console.log('1. Switching to Quiz tab...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const quizBtn = btns.find(b => b.textContent && b.textContent.includes('كويز المحاضرة'));
        if (quizBtn) { quizBtn.click(); return 'clicked quiz tab'; }
        return 'quiz tab btn not found';
      })()`,
      returnByValue: true
    });

    await new Promise(r => setTimeout(r, 1200));

    console.log('2. Clicking "كراسة الأخطاء 🧠" button...');
    const clickRes = await call('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const nbBtn = btns.find(b => b.textContent && b.textContent.includes('كراسة الأخطاء'));
        if (nbBtn) {
          nbBtn.click();
          return { clicked: true, text: nbBtn.textContent.trim() };
        }
        return { clicked: false, availableButtons: btns.map(b => b.textContent.trim()) };
      })()`,
      returnByValue: true
    });
    console.log('Click result:', clickRes.result.value);

    await new Promise(r => setTimeout(r, 1500));

    // Inspect if modal is open in DOM
    const modalInfo = await call('Runtime.evaluate', {
      expression: `(() => {
        const modal = document.querySelector('[role=\"dialog\"], .fixed.inset-0, [aria-modal=\"true\"]');
        const modalText = modal ? modal.textContent.trim() : null;
        return {
          isModalOpen: !!modal,
          textSample: modalText ? modalText.substring(0, 150) : null
        };
      })()`,
      returnByValue: true
    });
    console.log('Modal info:', modalInfo.result.value);

    ws.close();
    process.exit(0);
  });
});
