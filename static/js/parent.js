// parent.js: Parent mode. What it adds on top of the normal pages:
//   1) the AI tutor switch (only a parent can turn the AI on or off),
//   2) a weekly progress report for the parent, sent by email,
//   3) a PIN, so a child cannot change these by accident.
// Rules and the PIN check live in LocalServer.parentPost (local-server.js).
'use strict';

let parentUntil = 0;                         // unlocked until this time (ms); locks again after 10 minutes
let parentPin = null;                        // kept in memory only while unlocked (to confirm changes)

async function viewParent() {
  closeStream();
  const p = await api('/api/parent');
  if (!p.enabled) return parentSetup();
  if (Date.now() > parentUntil) { parentPin = null; return parentLock(); }
  return parentDashboard(p);
}

// ---------------------------------------------------------------- PIN: four boxes, one digit each
function pinBoxes(id, label) {
  return `<fieldset class="pinbox" id="${id}"><legend class="eyebrow">${t(label)}</legend>
    <div class="pin-cells">${[0, 1, 2, 3].map((i) => `<input class="pin-cell" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="1"
      autocomplete="off" aria-label="${t('Digit {n}', { n: i + 1 })}" data-i="${i}">`).join('')}</div></fieldset>`;
}
/** Typing moves to the next box, Backspace goes back, pasting "1234" fills all four. */
function wirePin(id, onFull) {
  const cells = [...document.querySelectorAll(`#${id} .pin-cell`)];
  cells.forEach((c, i) => {
    c.oninput = () => {
      c.value = c.value.replace(/\D/g, '').slice(-1);
      if (c.value && i < 3) cells[i + 1].focus();
      if (cells.every((x) => x.value) && onFull) onFull();
    };
    c.onkeydown = (e) => {
      if (e.key === 'Backspace' && !c.value && i > 0) { cells[i - 1].focus(); cells[i - 1].value = ''; e.preventDefault(); }
      if (e.key === 'ArrowLeft' && i > 0) cells[i - 1].focus();
      if (e.key === 'ArrowRight' && i < 3) cells[i + 1].focus();
    };
    c.onpaste = (e) => {
      const d = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 4);
      if (!d) return;
      e.preventDefault();
      d.split('').forEach((ch, k) => { if (cells[k]) cells[k].value = ch; });
      cells[Math.min(3, d.length)].focus();
      if (d.length === 4 && onFull) onFull();
    };
  });
}
const pinValue = (id) => [...document.querySelectorAll(`#${id} .pin-cell`)].map((c) => c.value).join('');
function pinClear(id, shake = false) {
  const box = $(`#${id}`);
  box.querySelectorAll('.pin-cell').forEach((c) => { c.value = ''; });
  if (shake) { box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); }
  box.querySelector('.pin-cell').focus();
}

// ---------------------------------------------------------------- first visit: what parent mode is
function parentSetup() {
  app.innerHTML = shell('parent', `
  ${pageHead('For parents', 'Parent mode', '', '')}
  <main class="wrap parent-wrap">
    <section class="card parent-hero">
      <div class="parent-pic">${lumiSVG({ mood: 'hello', stage: 3, size: 96 })}</div>
      <div><h2 class="display">Hello, parents! 👋</h2>
        <p>Your child sees their own progress on the normal pages. Parent mode adds the things only <b>you</b> should control.</p></div>
    </section>
    <div class="parent-feats">
      <div class="card pfeat"><span class="pfeat-ic">🤖</span><b>AI tutor: your decision</b>
        <span class="muted small">The AI tutor is off until you allow it. Only you can switch it on or off.</span></div>
      <div class="card pfeat"><span class="pfeat-ic">📧</span><b>Weekly report by email</b>
        <span class="muted small">A short summary for you: time studied, focus, phone, Lumi's diary. Without opening the app.</span></div>
      <div class="card pfeat"><span class="pfeat-ic">🔒</span><b>Protected by a PIN</b>
        <span class="muted small">Your child can't change these settings or read your page by accident.</span></div>
    </div>
    <form class="card pinform" id="setForm">
      <h2 class="display" style="font-size:20px;margin:0">Choose a 4-digit PIN</h2>
      <div class="pinrow">${pinBoxes('pin1', 'PIN')}${pinBoxes('pin2', 'Repeat the PIN')}</div>
      <p class="muted small" style="margin:0">Pick a number your child doesn't know. The PIN stops changes by accident; it is not a bank-level lock.</p>
      <div class="error" id="setErr" hidden></div>
      <button class="btn primary big" type="submit" style="align-self:flex-start">Turn on Parent mode</button>
    </form>
  </main>`);
  wirePin('pin1', () => $('#pin2 .pin-cell').focus());
  wirePin('pin2');
  $('#pin1 .pin-cell').focus();
  $('#setForm').onsubmit = async (e) => {
    e.preventDefault();
    const a = pinValue('pin1'), b = pinValue('pin2');
    const err = (m) => { $('#setErr').hidden = false; $('#setErr').textContent = t(m); };
    if (!/^\d{4}$/.test(a)) return err('The PIN must be 4 digits');
    if (a !== b) { pinClear('pin2', true); return err('The two PINs are different'); }
    try { await api('/api/parent', { set_pin: a }); } catch (x) { return err(x.message); }
    parentUntil = Date.now() + 10 * 60000; parentPin = a;
    toast(t('Parent mode is on'));
    viewParent();
  };
}

// ---------------------------------------------------------------- locked
function parentLock() {
  app.innerHTML = shell('parent', `
  ${pageHead('For parents', 'Parent mode', '', '')}
  <main class="wrap" style="display:flex;justify-content:center">
    <form class="card pinform lockcard" id="lockForm">
      ${lumiSVG({ mood: 'rest', stage: 3, size: 90 })}
      <h2 class="display" style="margin:0">Parents only 🔒</h2>
      <p class="muted" style="margin:0">Enter the parent PIN.</p>
      ${pinBoxes('pin', 'PIN')}
      <div class="error" id="lockErr" hidden></div>
    </form>
  </main>`);
  const tryPin = async () => {
    const pin = pinValue('pin');
    const ok = await api('/api/parent', { verify: true, pin }).then(() => true).catch(() => false);
    if (!ok) { $('#lockErr').hidden = false; $('#lockErr').textContent = t('Wrong PIN'); pinClear('pin', true); return; }
    parentUntil = Date.now() + 10 * 60000; parentPin = pin;
    viewParent();
  };
  wirePin('pin', tryPin);                    // opens as soon as the 4th digit is typed
  $('#pin .pin-cell').focus();
  $('#lockForm').onsubmit = (e) => { e.preventDefault(); tryPin(); };
}

// ---------------------------------------------------------------- the weekly report (text)
function weeklyReportText(w, f, d) {
  const tw = w.this;
  const L = [];
  L.push(`${t('Lumen weekly report')} · ${w.from} – ${w.to}`, '');
  L.push(`📚 ${t('Studied')}: ${hm(tw.study_min)} (${tw.lessons ?? tw.sessions} ${tUnit('lesson', tw.lessons ?? tw.sessions)})`);
  L.push(`🎯 ${t('Really focused')}: ${hm(tw.focused_min)}${w.change_pct == null ? '' : ` (${w.change_pct >= 0 ? '+' : ''}${w.change_pct}% ${t('vs last week')})`}`);
  L.push(`👀 ${t('Average attention')}: ${tw.avg == null ? '–' : `${tw.avg}%`}`);
  L.push(`📱 ${t('Phone came out')}: ${tw.pickups ?? 0} ${tUnit('time', tw.pickups ?? 0)}`);
  L.push(`🔥 ${t('Best streak')}: ${f.metrics.best_streak} · 🏅 ${f.achievements.reduce((a, x) => a + x.tier, 0)} ${t('medals')} · Lumi: ${t(f.stage.name)}`);
  if (w.best_day) L.push(`⭐ ${t('Best day')}: ${w.best_day.label} ${w.best_day.date}, ${hm(w.best_day.focused_min)}`);
  if (w.classes.length) { L.push('', `${t('By class')}:`); w.classes.slice(0, 6).forEach((c) => L.push(`  • ${c.name}: ${hm(c.study_min)}, ${hm(c.focused_min)} ${t('focused')}`)); }
  const recent = f.diary.slice(0, 3);
  if (recent.length) {
    L.push('', `📔 ${t("Lumi's diary")}:`);
    recent.forEach((day) => {
      const date = new Date(day.ts * 1000).toLocaleDateString(LOCALE(), { weekday: 'long', day: 'numeric', month: 'long' });
      day.lessons.forEach((l) => L.push(`  ${date}: ${l.lines.map((x) => t(DIARY[x.k], { n: x.n, title: x.title || '', cls: x.cls ? ` (${x.cls})` : '' })).join(' ')}`));
    });
  }
  L.push('', t('Sent from Lumen, a study coach. The camera is analysed on the device; no video leaves it.'));
  return L.join('\n');
}

// ---------------------------------------------------------------- unlocked: the parent page
async function parentDashboard(p) {
  const [d, w, f, priv] = await Promise.all([loadOverview(), api('/api/week'), api('/api/friend'),
    api('/api/parent', { verify: true, pin: parentPin }).catch(() => ({}))]);
  const tw = w.this;
  const medals = f.achievements.reduce((a, x) => a + x.tier, 0);
  const recent = d.lessons.slice(0, 6);
  const when = (ts) => new Date(ts * 1000).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  app.innerHTML = shell('parent', `
  ${pageHead('For parents · locks again after 10 minutes', 'Parent view', '<button class="btn ghost" id="lockBtn">🔒 Lock</button>', '')}
  <main class="wrap" style="display:flex;flex-direction:column;gap:20px">
    <section class="card parent-controls">
      <h2 class="display" style="font-size:18px;margin:0">Your controls</h2>
      <div class="lset"><div><b>🤖 Allow the AI tutor</b>
        <div class="muted small">The AI tutor answers questions about lessons. Questions are sent to Google Gemini through Lumen's server. Lumi never uses AI: its words are written in advance.</div></div>
        <button class="switch${p.ai_allowed ? ' on' : ''}" id="aiSw" role="switch" aria-checked="${p.ai_allowed}" aria-label="Allow the AI tutor"><span></span></button></div>
      <div class="lset"><div><b>📧 Weekly report by email</b>
        <div class="muted small">Your email app opens with this week's report ready to send. Save your address once.</div></div>
        <form class="mailrow" id="mailForm"><input class="field" id="pEmail" type="email" placeholder="parent@example.com" value="${esc(priv.email || '')}" aria-label="Parent email">
          <button class="btn primary" type="submit">Send report</button></form></div>
    </section>
    <section class="stats parent-kpis">
      ${kpi('Studied this week', 'studied', hm(tw.study_min), `${tw.lessons ?? tw.sessions} ${tUnit('lesson', tw.lessons ?? tw.sessions)}`)}
      ${kpi('Focused this week', 'focused', hm(tw.focused_min), w.change_pct == null ? t('first week with data') : `${w.change_pct >= 0 ? '▲' : '▼'} ${Math.abs(w.change_pct)}% ${t('vs last week')}`)}
      ${kpi('Average attention', 'attention', tw.avg == null ? '–' : `${tw.avg}%`, t('this week'))}
      ${kpi('Phone came out', 'phoneh', tw.pickups ?? 0, t('times this week'))}
    </section>
    <section class="card">
      <div class="block-head"><h2 class="display" style="font-size:18px;margin:0">Last 14 days</h2><span class="muted small">${t('grey = studied, colour = focused')}</span></div>
      ${dayBars(d.days, 120)}
    </section>
    <div class="row">
      <section class="card grow" style="gap:10px">
        <h2 class="display" style="font-size:18px;margin:0">Recent lessons</h2>
        ${recent.length ? `<div class="parent-lessons">${recent.map((l) => `<a class="plesson" href="#/report/${encodeURIComponent(l.last_id)}">
          <span class="muted small">${esc(when(l.last_at))}</span><b>${esc(l.title)}</b><span class="muted small">${esc(l.class || '')}</span>
          <span class="small">${hm(l.study_min)} · ${l.study_min ? Math.round(100 * l.focused_min / l.study_min) : 0}% ${t('focused')}</span></a>`).join('')}</div>`
          : `<p class="empty">${t('No lessons yet.')}</p>`}
      </section>
      <section class="card side parent-lumi">
        ${lumiSVG({ mood: 'happy', stage: f.stage.index, outfit: f.outfit, size: 110 })}
        <b>${t('Lumi · {name}', { name: esc(t(f.stage.name)) })}</b>
        <span class="muted small">🔆 ${f.light} ${t('light')} · 🏅 ${medals} ${t('medals')} · 🗺️ ${f.metrics.quests_done} ${t('quests')}</span>
        <span class="small">${t('Best streak')}: ${f.metrics.best_streak} · ${t('Lessons')}: ${f.metrics.lessons}</span>
      </section>
    </div>
    <section class="card">
      <h2 class="display" style="font-size:18px;margin:0 0 12px">Lumi's diary</h2>
      ${f.diary.length ? f.diary.slice(0, 3).map(diaryDayHTML).join('') : `<p class="empty">${t('The diary starts after the first lesson.')}</p>`}
    </section>
    <section class="card parent-controls">
      <h2 class="display" style="font-size:18px;margin:0">PIN</h2>
      <div class="lset"><div><b>Change the PIN</b><div class="muted small">4 new digits.</div></div>
        <form class="pinchange" id="pinChange">${pinBoxes('newPin', 'New PIN')}<button class="btn ghost">Change</button></form></div>
      <div class="lset"><div><b>Turn off Parent mode</b><div class="muted small">Removes the PIN. The AI tutor becomes available again.</div></div>
        <button class="btn ghost" id="offBtn">Turn off</button></div>
    </section>
  </main>`);
  const withPin = async (body) => {
    if (!parentPin || Date.now() > parentUntil) { parentUntil = 0; viewParent(); return null; }
    try { return await api('/api/parent', { ...body, pin: parentPin }); } catch { toast(t('Wrong PIN')); return null; }
  };
  wirePin('newPin');
  $('#lockBtn').onclick = () => { parentUntil = 0; parentPin = null; viewParent(); };
  $('#aiSw').onclick = async () => {
    const on = $('#aiSw').getAttribute('aria-checked') !== 'true';
    const res = await withPin({ ai_allowed: on });
    if (!res) return;
    $('#aiSw').setAttribute('aria-checked', String(res.ai_allowed));
    $('#aiSw').classList.toggle('on', res.ai_allowed);
    toast(t(res.ai_allowed ? 'The AI tutor is allowed' : 'The AI tutor is switched off'));
  };
  $('#mailForm').onsubmit = async (e) => {
    e.preventDefault();
    const to = $('#pEmail').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) { toast(t('Please enter an email address')); return; }
    if (to !== (priv.email || '')) { await withPin({ email: to }); priv.email = to; }
    const subject = `${t('Lumen weekly report')} · ${w.from} – ${w.to}`;
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(weeklyReportText(w, f, d))}`;
  };
  $('#pinChange').onsubmit = async (e) => {
    e.preventDefault();
    const n = pinValue('newPin');
    if (!/^\d{4}$/.test(n)) { toast(t('The PIN must be 4 digits')); return; }
    if (await withPin({ set_pin: n })) { parentPin = n; pinClear('newPin'); toast(t('PIN changed')); }
  };
  $('#offBtn').onclick = async () => {
    if (await withPin({ disable: true })) { parentUntil = 0; parentPin = null; toast(t('Parent mode is off')); viewParent(); }
  };
}
