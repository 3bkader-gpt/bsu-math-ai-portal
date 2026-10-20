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
      // 1. Switch to Quiz tab
      const tabClick = await send('Runtime.evaluate', {
        expression: `(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('كويز') || b.textContent.includes('اختبار')));
          if (btn) { btn.click(); return 'quiz tab clicked'; }
          return 'quiz button not found';
        })()`,
        returnByValue: true
      });
      console.log('Tab click:', tabClick.result.value);

      await new Promise(r => setTimeout(r, 1500));

      // 2. Inspect quiz question 1
      const quizInfo = await send('Runtime.evaluate', {
        expression: `(() => {
          const optButtons = Array.from(document.querySelectorAll('button')).filter(b => b.getAttribute('data-quiz-option') !== null || b.className.includes('quiz-opt'));
          return {
            optionsCount: optButtons.length,
            firstQuestionOptions: optButtons.slice(0, 4).map(b => b.innerText)
          };
        })()`,
        returnByValue: true
      });
      console.log('Quiz Info:', quizInfo.result.value);

      ws.close();
      process.exit(0);
    };
  });
});
