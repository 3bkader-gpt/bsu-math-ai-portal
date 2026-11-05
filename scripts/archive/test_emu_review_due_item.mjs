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

    console.log('1. Closing and re-opening Mistake Notebook to reload data...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        // Close modal if open
        const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('إغلاق'));
        if (closeBtn) closeBtn.click();
      })()`,
      returnByValue: true
    });

    await new Promise(r => setTimeout(r, 800));

    // Re-open modal
    await call('Runtime.evaluate', {
      expression: `(() => {
        const nbBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('كراسة الأخطاء'));
        if (nbBtn) nbBtn.click();
      })()`,
      returnByValue: true
    });

    await new Promise(r => setTimeout(r, 1500));

    // Check modal contents
    const contentInfo = await call('Runtime.evaluate', {
      expression: `(() => {
        const modal = document.querySelector('[role=\"dialog\"], .fixed.inset-0, [aria-modal=\"true\"]');
        if (!modal) return { open: false };
        const buttons = Array.from(modal.querySelectorAll('button')).map(b => b.textContent.trim());
        const hasDueItem = !modal.textContent.includes('كراسة أخطائك نظيفة لليوم');
        return {
          open: true,
          hasDueItem,
          buttons,
          textSample: modal.textContent.substring(0, 300)
        };
      })()`,
      returnByValue: true
    });
    console.log('Content info:', contentInfo.result.value);

    ws.close();
    process.exit(0);
  });
});
