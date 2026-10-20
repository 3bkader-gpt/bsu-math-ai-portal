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

    console.log('1. Switching to Study Guide tab...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        // Find tab button for guide
        const btns = Array.from(document.querySelectorAll('button'));
        const guideBtn = btns.find(b => b.textContent && b.textContent.includes('الدليل'));
        if (guideBtn) guideBtn.click();
        return { clicked: !!guideBtn, text: guideBtn ? guideBtn.textContent : null };
      })()`,
      returnByValue: true
    });

    // Check state before
    const beforeState = await call('Runtime.evaluate', {
      expression: `(() => {
        const s = JSON.parse(localStorage.getItem('bsu_portal_gamification_state_v1') || '{}');
        return { xp: s.totalXp, level: s.level };
      })()`,
      returnByValue: true
    });
    console.log('State before Guide reading:', beforeState.result.value);

    // Let's trigger the 60s dwell event by letting the timer run or checking if trackStudyGuideRead emits
    console.log('2. Emitting study_guide reading (60s dwell)...');
    const dwellRes = await call('Runtime.evaluate', {
      expression: `(() => {
        // Dispatch custom study guide read event directly via the app window/telemetry
        if (window.__bsu_telemetry && window.__bsu_telemetry.trackStudyGuideRead) {
          window.__bsu_telemetry.trackStudyGuideRead(1, 60);
          return 'dispatched via window.__bsu_telemetry';
        }
        // or trigger the event via window CustomEvent if configured, or wait
        return 'no global telemetry exposed';
      })()`,
      returnByValue: true
    });
    console.log('Dwell res:', dwellRes.result.value);

    // Wait 2s
    await new Promise(r => setTimeout(r, 2000));

    // Check state after
    const afterGuideState = await call('Runtime.evaluate', {
      expression: `(() => {
        const s = JSON.parse(localStorage.getItem('bsu_portal_gamification_state_v1') || '{}');
        return { xp: s.totalXp, level: s.level };
      })()`,
      returnByValue: true
    });
    console.log('State after Guide reading:', afterGuideState.result.value);

    // Now let's switch to Flashcards tab (بطاقات الاستذكار)
    console.log('3. Switching to Flashcards tab...');
    await call('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const cardsBtn = btns.find(b => b.textContent && b.textContent.includes('بطاقات'));
        if (cardsBtn) cardsBtn.click();
        return { clicked: !!cardsBtn, text: cardsBtn ? cardsBtn.textContent : null };
      })()`,
      returnByValue: true
    });

    await new Promise(r => setTimeout(r, 1000));

    // Flip all flashcards in the deck
    console.log('4. Flipping all cards in deck...');
    const flipRes = await call('Runtime.evaluate', {
      expression: `(() => {
        // Find flashcard container and flip buttons
        const flipBtn = document.querySelector('button[aria-label*=\"اقلب\"], button:has(svg), .flashcard');
        const nextBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent && (b.textContent.includes('التالي') || b.textContent.includes('السابق')));
        return { hasFlip: !!flipBtn, nextCount: nextBtns.length };
      })()`,
      returnByValue: true
    });
    console.log('Flip buttons found:', flipRes.result.value);

    ws.close();
    process.exit(0);
  });
});
