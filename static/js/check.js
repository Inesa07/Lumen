'use strict';
// ---------------------------------------------------------------- Accuracy check
function speak(text) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0; u.lang = 'en-US';
    window.speechSynthesis.speak(u);
  } catch { /* no voice: the chime and the big text still work */ }
}

async function viewCheckIntro() {
  closeStream();
  const [state, { checks }] = await Promise.all([api('/api/state'), api('/api/checks')]);
  if (state.active) { location.hash = state.snapshot.mode === 'check' ? '#/check/run' : '#/session'; return; }
  lastActive = null;
  // your earlier checks: newest first, each compared with the one before it
  const history = checks.length ? `<section class="card checklist">
      <div class="block-head"><h2 class="display" style="font-size:20px;margin:0">Your checks</h2>
        <span class="muted small">balanced accuracy ${info('balanced', 'balanced accuracy')}</span></div>
      ${checks.length > 1 ? `<div class="ck-trend" role="img" aria-label="Balanced accuracy of each check, oldest to newest">
        ${checks.slice().reverse().map((c) => `<i style="height:${Math.max(6, c.balanced_accuracy)}%;background:${attColor(c.balanced_accuracy)}" title="${c.balanced_accuracy}%"></i>`).join('')}</div>` : ''}
      ${checks.map((c, i) => {
        const prev = checks[i + 1];
        const diff = prev ? c.balanced_accuracy - prev.balanced_accuracy : null;
        const when = new Date(c.started_at * 1000).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        return `<a class="ck-row" href="#/check/${encodeURIComponent(c.id)}">
          <span class="ck-when">${esc(when)}${i === 0 ? ' <span class="chip">latest</span>' : ''}</span>
          <span class="chip ${c.personal ? 'Focused' : ''}">${c.personal ? 'personal settings' : 'default settings'}</span>
          <b>${c.balanced_accuracy}%</b>
          <span class="ck-diff">${diff == null ? '' : `<span style="color:${diff >= 0 ? 'var(--teal)' : 'var(--coral)'}">${diff >= 0 ? '▲' : '▼'} ${Math.abs(diff)}</span>`}</span>
          <span class="tile-go">›</span></a>`;
      }).join('')}
    </section>` : '';
  app.innerHTML = shell('check', `
  <header class="top">
    <div class="head-title"><a class="back" href="#/" aria-label="Back to home">${BACK}</a>
      <div><div class="eyebrow">About 3 minutes</div><div class="h-title">Accuracy check</div></div></div>
  </header>
  <main class="wrap narrow" style="display:flex;flex-direction:column;gap:20px">
    <section class="card" style="padding:32px;display:flex;flex-direction:column;gap:18px">
      <h1 class="display" style="margin:0;font-size:32px">How accurate is Lumen for you?</h1>
      <p class="muted" style="margin:0;font-size:16px;line-height:1.6">Lumen will ask you to do simple things: look at the screen, look away, pick up your phone, close your eyes.
        Because Lumen knows what you were asked to do, it can count how often it was right. Then it suggests settings tuned to your face, camera and light.</p>
      <ol class="prep">
        <li><b>Sit as you usually study</b>, same place, same light.</li>
        <li><b>Turn the sound on.</b> Instructions are spoken, because you can't read the screen while looking away.</li>
        <li><b>Have your phone nearby.</b></li>
        <li><b>Follow each instruction until the next one.</b> A chime marks every new step.</li>
      </ol>
      <div class="note">Nothing is recorded. Only the numbers (what Lumen predicted at each moment) are saved, so you can see the results.</div>
      <div><button class="btn primary big" id="goCheck">${checks.length ? 'Start a new check' : 'Start the check'}</button></div>
    </section>
    ${history}
  </main>`);
  $('#goCheck').onclick = async () => {
    const b = $('#goCheck');
    b.disabled = true; b.textContent = 'Starting camera…';
    askNotificationPermission();
    speak('Let us start. Look at the screen as you normally do.');
    try {
      await api('/api/check/start', {});
      location.hash = '#/check/run';
    } catch (err) {
      b.disabled = false; b.textContent = 'Start the check';
      const box = document.createElement('div');
      box.className = 'error';
      box.innerHTML = `<strong>Could not start.</strong><br>${esc(err.message)}`;
      b.parentElement.after(box);
    }
  };
}

async function viewCheckRun() {
  const state = await api('/api/state');
  if (!state.active || state.snapshot.mode !== 'check') {
    location.hash = state.last_check ? `#/check/${state.last_check}` : '#/check';
    return;
  }
  focusMode();
  const s = state.snapshot;
  app.innerHTML = `
  <header class="top">
    <div class="head-title"><div><div class="eyebrow">Accuracy check${s.fake ? ' · simulation' : ''}</div>
      <div class="h-title" id="stepNo">Step 1 of ${s.steps}</div></div></div>
    <button class="btn ghost" id="cancelCheck">Cancel</button>
  </header>
  <main class="wrap narrow" style="display:flex;flex-direction:column;gap:20px">
    <div class="progress"><i id="prog"></i></div>
    <section class="card checkrun">
      <div class="countdown" id="left">15</div>
      <h1 id="instr">…</h1>
      <div class="seen">
        <span class="eyebrow">Lumen sees</span>
        <span class="chip" id="seen">…</span>
        <span class="eyebrow" id="expect"></span>
      </div>
    </section>
    <div class="row" style="align-items:center">
      <p class="muted" style="flex:1 1 300px;margin:0;font-size:14px" id="next"></p>
      <div class="cam" style="padding:0;gap:12px"><div class="thumb">${s.fake ? '<span class="eyebrow">simulated</span>' : '<div class="camslot" id="camSlot" aria-label="Camera preview"></div>'}</div></div>
    </div>
  </main>`;

  $('#cancelCheck').onclick = async () => {
    closeStream();
    window.speechSynthesis && window.speechSynthesis.cancel();
    await api('/api/end', {}).catch(() => {});
    location.hash = '#/check';
  };

  let lastStep = -1;
  const draw = (d) => {
    $('#stepNo').textContent = `Step ${d.step + 1} of ${d.steps}`;
    $('#prog').style.width = `${Math.round(d.progress * 100)}%`;
    $('#left').textContent = d.left;
    $('#instr').textContent = d.instruction;
    $('#next').textContent = d.next ? `Next: ${d.next}` : '';
    const seen = $('#seen');
    seen.textContent = d.calibrating ? 'Calibrating…' : d.seen_label;
    const match = d.expected && d.seen === d.expected;
    seen.className = `chip ${d.calibrating || !d.expected ? 'break' : match ? 'Focused' : 'Lost'}`;
    $('#expect').textContent = d.expected ? (match ? 'correct' : `should be: ${d.expected_label}`) : '';
    if (d.step !== lastStep) {
      if (lastStep !== -1) chime();
      lastStep = d.step;
      setTimeout(() => speak(d.instruction), lastStep === 0 ? 1500 : 350);
    }
  };
  draw(s);
  if (stream) stream.close();   // (keeps the camera preview)
  mountCamera($('#camSlot'));
  stream = new LumenEventSource();
  stream.onmessage = (ev) => {
    const d = JSON.parse(ev.data);
    if (d.ended) {
      closeStream();
      speak('Done. Here are your results.');
      location.hash = d.check ? `#/check/${d.check}` : '#/check';
      return;
    }
    draw(d);
  };
}


