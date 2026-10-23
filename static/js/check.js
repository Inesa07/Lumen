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
  const state = await api('/api/state');
  if (state.active) { location.hash = state.snapshot.mode === 'check' ? '#/check/run' : '#/session'; return; }
  lastActive = null;
  app.innerHTML = shell('check', `
  <header class="top">
    <div class="head-title"><a class="back" href="#/" aria-label="Back to home">${BACK}</a>
      <div><div class="eyebrow">About 3 minutes</div><div class="h-title">Accuracy check</div></div></div>
  </header>
  <main class="wrap narrow">
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
      <div><button class="btn primary big" id="goCheck">Start the check</button></div>
    </section>
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

async function viewCheckResult(id) {
  closeStream();
  let r;
  try { r = await api(`/api/checks/${encodeURIComponent(id)}`); } catch { location.hash = '#/check'; return; }
  const prof = (await api('/api/profile')).profile;
  const t = r.tuning;
  const when = new Date(r.started_at * 1000).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const n = r.classes.length;
  const rowSum = r.confusion.map((row) => row.reduce((a, b) => a + b, 0));
  const cell = (v, i, j) => {
    const f = rowSum[i] ? v / rowSum[i] : 0;
    const bg = v === 0 ? 'transparent' : i === j ? `color-mix(in srgb, var(--teal) ${Math.round(15 + 60 * f)}%, transparent)` : `color-mix(in srgb, var(--coral) ${Math.round(15 + 60 * f)}%, transparent)`;
    return `<td style="background:${bg}">${v ? `${Math.round(f * 100)}%` : '·'}</td>`;
  };
  const fmt = (k, v) => (k === 'closed' ? v : `×${v}`);
  const names = { side: 'Left / right sensitivity limit', vert: 'Up / down sensitivity limit', closed: 'Eyes-closed threshold' };
  const applied = prof && JSON.stringify(prof) === JSON.stringify(t.suggested);

  app.innerHTML = shell('check', `
  <header class="top">
    <div class="head-title"><a class="back" href="#/" aria-label="Back to home">${BACK}</a>
      <div><div class="eyebrow">Accuracy check · ${esc(when)}${r.profile_used && Object.keys(r.profile_used).length ? ' · personal settings' : ' · default settings'}</div>
      <div class="h-title">How accurate is Lumen for you?</div></div></div>
    <a class="btn primary" href="#/check">Run again</a>
  </header>
  <main class="wrap" style="display:flex;flex-direction:column;gap:24px">
    <section class="stats">
      <div class="card"><span class="eyebrow">Accuracy</span><b>${r.accuracy}%</b><span class="eyebrow">of ${r.n} moments correct</span></div>
      <div class="card"><span class="eyebrow">Balanced accuracy</span><b>${r.balanced_accuracy}%</b><span class="eyebrow">average over the 5 situations</span></div>
      <div class="card"><span class="eyebrow">Yawn</span><b>${r.yawn_detected ? 'Seen' : 'Missed'}</b><span class="eyebrow">open mouth wide step</span></div>
    </section>

    <div class="row">
      <section class="card" style="flex:999 1 560px;min-width:0">
        <h2 class="display" style="font-size:20px">Step by step</h2>
        <div class="list">
          ${r.per_step.map((p) => `<div class="steprow">
              <div class="x"><div>${esc(p.text)}</div><div>${p.acc >= 90 ? 'reliable' : p.mistake ? `often seen as: ${esc(p.mistake)}` : ''}</div></div>
              <div class="bar"><i style="width:${p.acc}%;background:${p.acc >= 90 ? 'var(--teal)' : p.acc >= 60 ? 'var(--accent)' : 'var(--coral)'}"></i></div>
              <b>${p.acc}%</b></div>`).join('')}
        </div>
      </section>
      <section class="card" style="flex:1 1 320px;min-width:0;display:flex;flex-direction:column;gap:14px">
        <h2 class="display" style="font-size:20px;margin:0">Tune Lumen to you</h2>
        ${t.notes.map((x) => `<div class="note">${esc(x)}</div>`).join('')}
        <table class="tune">
          <tr><th></th><th>now</th><th>suggested</th></tr>
          ${['side', 'vert', 'closed'].map((k) => `<tr><td>${names[k]}</td><td>${fmt(k, t.current[k])}</td>
            <td class="${t.suggested[k] !== t.current[k] ? 'chg' : ''}">${fmt(k, t.suggested[k])}</td></tr>`).join('')}
        </table>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn primary" id="applyBtn" ${!t.changed || applied ? 'disabled' : ''}>${applied ? 'Applied' : 'Apply to my profile'}</button>
          ${prof ? '<button class="btn ghost" id="resetBtn">Reset to default</button>' : ''}
        </div>
        <p class="muted" style="margin:0;font-size:13px;line-height:1.5">After applying, <strong>run the check again</strong>. The second run uses new data, so it shows honestly whether the new settings are better (the settings were learned from this run, so judging them on this same run would be too optimistic).</p>
      </section>
    </div>

    <div class="row">
      <section class="card" style="flex:1 1 520px;min-width:0;overflow-x:auto">
        <h2 class="display" style="font-size:20px">Confusion matrix</h2>
        <p class="muted" style="margin:0 0 14px;font-size:14px">Rows: what you were really doing. Columns: what Lumen thought. Green diagonal = correct.</p>
        <table class="cm">
          <tr><th>truth \\ Lumen</th>${r.labels.map((l) => `<th>${esc(l)}</th>`).join('')}</tr>
          ${r.confusion.map((row, i) => `<tr><th>${esc(r.labels[i])}</th>${row.map((v, j) => cell(v, i, j)).join('')}</tr>`).join('')}
        </table>
      </section>
      <section class="card" style="flex:1 1 360px;min-width:0">
        <h2 class="display" style="font-size:20px">Precision and recall</h2>
        <table class="cm pr">
          <tr><th></th><th>recall</th><th>precision</th></tr>
          ${r.per_class.map((c) => `<tr><th>${esc(c.label)}</th><td>${c.recall ?? '–'}%</td><td>${c.precision ?? '–'}%</td></tr>`).join('')}
        </table>
        <p class="muted" style="margin:14px 0 0;font-size:13px;line-height:1.6"><strong>Recall</strong>: when you really looked away, how often Lumen noticed it.<br>
          <strong>Precision</strong>: when Lumen said "looking away", how often it was true. Low precision means false alarms.</p>
      </section>
    </div>

    ${r.diagnostics ? `<section class="card" style="overflow-x:auto">
      <h2 class="display" style="font-size:20px">What the camera measured</h2>
      <p class="muted" style="margin:0 0 14px;font-size:14px;line-height:1.5">Typical (median) values in each step, compared with your normal position.
        <span style="color:var(--accent)">Amber</span> = beyond the limit, so Lumen calls it "looking away".
        ${r.csv ? '<button class="linkbtn" id="csvBtn">Download the raw data (CSV)</button>' : ''}</p>
      <table class="cm diag">
        <tr><th>step</th><th>truth</th><th>face seen</th><th>head turn°<br><small>limit ${r.limits.yaw}</small></th><th>head tilt°<br><small>limit ${r.limits.pitch}</small></th>
          <th>eyes side<br><small>limit ${r.limits.gx}</small></th><th>eyes up/down<br><small>limit ${r.limits.gy}</small></th><th>eyes open</th><th>phone</th></tr>
        ${r.diagnostics.map((d) => `<tr><th>${esc(d.text)}</th><td>${esc(d.expected)}</td><td>${d.face}%</td>
          ${['yaw', 'pitch', 'gx', 'gy'].map((k) => `<td class="${d[k + '_over'] ? 'over' : ''}">${d[k] ?? '–'}</td>`).join('')}
          <td>${d.ear ?? '–'}${d.ear != null ? '%' : ''}</td><td>${d.phone}%</td></tr>`).join('')}
      </table>
    </section>` : ''}
  </main>`);

  const ab = $('#applyBtn');
  if (ab) ab.onclick = async () => {
    await api('/api/profile', { from_check: r.id });
    toast('Saved. Run the check again to verify.');
    ab.textContent = 'Applied'; ab.disabled = true;
  };
  const cb = $('#csvBtn');
  if (cb) cb.onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([r.csv], { type: 'text/csv' }));
    a.download = `lumen-check-${r.id}.csv`;
    a.click();
  };
  const rb = $('#resetBtn');
  if (rb) rb.onclick = async () => { await api('/api/profile', { reset: true }); toast('Back to default settings'); viewCheckResult(id); };
}

