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

    console.log('1. Switching to Flashcards tab on emulator...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const flashcardsTabBtn = btns.find(b => b.textContent && (b.textContent.includes('فلاش كاردز') || b.textContent.includes('كروت المراجعة')));
        if (flashcardsTabBtn) {
          flashcardsTabBtn.click();
          return { success: true, text: flashcardsTabBtn.textContent };
        }
        return { success: false };
      })()`,
      returnByValue: true
    });

    await new Promise(r => setTimeout(r, 1200));

    const beforeState = await call('Runtime.evaluate', {
      expression: `(() => {
        const s = JSON.parse(localStorage.getItem('bsu_portal_gamification_state_v1') || '{}');
        return { totalXp: s.totalXp, level: s.level };
      })()`,
      returnByValue: true
    });
    console.log('State BEFORE flipping deck:', beforeState.result.value);

    // Get total cards
    const cardInfo = await call('Runtime.evaluate', {
      expression: `(() => {
        const cardBox = document.querySelector('#flashcard-card-box');
        const nextBtn = document.querySelector('button[aria-label*=\"التالي\"], button:has(svg.lucide-chevron-left)');
        return {
          hasCardBox: !!cardBox,
          hasNextBtn: !!nextBtn
        };
      })()`,
      returnByValue: true
    });
    console.log('Card info:', cardInfo.result.value);

    // Let's flip all cards sequentially
    const result = await call('Runtime.evaluate', {
      expression: `(async () => {
        const logs = [];
        // Find next button: in RTL Next is usually the left chevron button
        for (let i = 0; i < 5; i++) {
          const cardBox = document.querySelector('#flashcard-card-box');
          if (cardBox) {
            cardBox.click(); // flip
            logs.push('Flipped card ' + i);
            await new Promise(r => setTimeout(r, 600));
          }
          // find next button
          const btns = Array.from(document.querySelectorAll('button'));
          // In FlashcardsViewer: handleNext is one of the nav buttons
          const nextBtn = btns.find(b => b.querySelector('svg.lucide-chevron-left') || (b.textContent && b.textContent.includes('التالي')));
          if (nextBtn && i < 4) {
            nextBtn.click();
            logs.push('Clicked Next after card ' + i);
            await new Promise(r => setTimeout(r, 600));
          }
        }
        return logs;
      })()`,
      awaitPromise: true,
      returnByValue: true
    });
    console.log('Flipping sequence:', result.result.value);

    await new Promise(r => setTimeout(r, 2000));

    const afterState = await call('Runtime.evaluate', {
      expression: `(() => {
        const s = JSON.parse(localStorage.getItem('bsu_portal_gamification_state_v1') || '{}');
        return {
          totalXp: s.totalXp,
          level: s.level,
          decksCompletedCount: s.decksCompletedCount
        };
      })()`,
      returnByValue: true
    });
    console.log('State AFTER flipping deck:', afterState.result.value);

    ws.close();
    process.exit(0);
  });
});
