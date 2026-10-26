// parent.js: Parent mode. A 4-digit PIN opens a parent page with the child's progress and the
// switch for the AI tutor. (Rules and PIN check: LocalServer.parentPost in local-server.js.)
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

function pinInput(id, label) {
  return `<label class="pinlabel"><span class="eyebrow">${label}</span>
    <input class="field pin" id="${id}" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off" placeholder="• • • •"></label>`;
}

function parentSetup() {
  app.innerHTML = shell('parent', `
  ${pageHead('For parents', 'Parent mode', '', '')}
  <main class="wrap" style="display:flex;flex-direction:column;gap:20px;max-width:760px">
    <section class="card parent-intro">
      <div class="parent-pic">${lumiSVG({ mood: 'hello', stage: 3, size: 110 })}</div>
      <div><h2 class="display" style="margin:0 0 8px">Hello, parents! 👋</h2>
        <p style="margin:0 0 8px;line-height:1.6">Parent mode lets you <b>see your child's progress</b> (time, focus, lessons, Lumi's diary) and
          <b>decide whether the AI tutor is allowed</b>. It is protected by a 4-digit PIN.</p>
        <p class="muted small" style="margin:0">When you turn it on, the AI tutor starts switched <b>off</b>. You can allow it any time.</p></div>
    </section>
    <form class="card pinform" id="setForm">
      <h2 class="display" style="font-size:18px;margin:0">Choose a PIN</h2>
      <div class="pinrow">${pinInput('pin1', 'PIN (4 digits)')}${pinInput('pin2', 'Repeat the PIN')}</div>
      <p class="muted small" style="margin:0">Pick something your child does not know. The PIN keeps children from changing things by accident.
        It is not a bank-level lock: someone with full access to this computer could still get around it.</p>
      <div class="error" id="setErr" hidden></div>
      <button class="btn primary" type="submit" style="align-self:flex-start">Turn on Parent mode</button>
    </form>
  </main>`);
  $('#setForm').onsubmit = async (e) => {
    e.preventDefault();
    const a = $('#pin1').value, b = $('#pin2').value;
    const err = (m) => { $('#setErr').hidden = false; $('#setErr').textContent = t(m); };
    if (!/^\d{4}$/.test(a)) return err('The PIN must be 4 digits');
    if (a !== b) return err('The two PINs are different');
    try { await api('/api/parent', { set_pin: a }); } catch (x) { return err(x.message); }
    parentUntil = Date.now() + 10 * 60000; parentPin = a;
    toast(t('Parent mode is on'));
    viewParent();
  };
}

function parentLock() {
  app.innerHTML = shell('parent', `
  ${pageHead('For parents', 'Parent mode', '', '')}
  <main class="wrap" style="display:flex;justify-content:center">
    <form class="card pinform lockcard" id="lockForm">
      ${lumiSVG({ mood: 'rest', stage: 3, size: 90 })}
      <h2 class="display" style="margin:0">Parents only 🔒</h2>
      <p class="muted" style="margin:0">Enter the parent PIN.</p>
      ${pinInput('pin', 'PIN')}
      <div class="error" id="lockErr" hidden></div>
      <button class="btn primary" type="submit">Open</button>
    </form>
  </main>`);
  $('#pin').focus();
  $('#lockForm').onsubmit = async (e) => {
    e.preventDefault();
    const ok = await api('/api/parent', { verify: true, pin: $('#pin').value }).then(() => true).catch(() => false);
    if (!ok) { $('#lockErr').hidden = false; $('#lockErr').textContent = t('Wrong PIN'); $('#pin').value = ''; return; }
    parentUntil = Date.now() + 10 * 60000; parentPin = $('#pin').value;
    viewParent();
  };
}

async function parentDashboard(p) {
  const [d, w, f] = await Promise.all([loadOverview(), api('/api/week'), api('/api/friend')]);
  const tw = w.this;
  const medals = f.achievements.reduce((a, x) => a + x.tier, 0);
  const recent = d.lessons.slice(0, 6);
  const when = (ts) => new Date(ts * 1000).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  app.innerHTML = shell('parent', `
  ${pageHead('For parents · unlocked for 10 minutes', 'Parent view', '<button class="btn ghost" id="lockBtn">🔒 Lock</button>', '')}
  <main class="wrap" style="display:flex;flex-direction:column;gap:20px">
    <section class="stats parent-kpis">
      ${kpi('Studied this week', 'studied', hm(tw.study_min), `${tw.sessions} ${t('lessons')}`)}
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
      <h2 class="display" style="font-size:18px;margin:0">Settings for parents</h2>
      <div class="lset"><div><b>Allow the AI tutor</b>
        <div class="muted small">The AI tutor answers questions about lessons. Questions are sent to Google Gemini through Lumen's server. Lumi never uses AI: its words are written in advance.</div></div>
        <button class="switch${p.ai_allowed ? ' on' : ''}" id="aiSw" role="switch" aria-checked="${p.ai_allowed}" aria-label="Allow the AI tutor"><span></span></button></div>
      <div class="lset"><div><b>Change the PIN</b><div class="muted small">4 new digits.</div></div>
        <form class="btnrow" id="pinChange"><input class="field pin" id="newPin" type="password" inputmode="numeric" maxlength="4" placeholder="• • • •" aria-label="New PIN">
          <button class="btn ghost">Change</button></form></div>
      <div class="lset"><div><b>Turn off Parent mode</b><div class="muted small">Removes the PIN. The AI tutor becomes available again.</div></div>
        <button class="btn ghost" id="offBtn">Turn off</button></div>
    </section>
  </main>`);
  const withPin = async (body) => {
    if (!parentPin || Date.now() > parentUntil) { parentUntil = 0; viewParent(); return null; }
    try { return await api('/api/parent', { ...body, pin: parentPin }); } catch { toast(t('Wrong PIN')); return null; }
  };
  $('#lockBtn').onclick = () => { parentUntil = 0; parentPin = null; viewParent(); };
  $('#aiSw').onclick = async () => {
    const on = $('#aiSw').getAttribute('aria-checked') !== 'true';
    const res = await withPin({ ai_allowed: on });
    if (!res) return;
    $('#aiSw').setAttribute('aria-checked', String(res.ai_allowed));
    $('#aiSw').classList.toggle('on', res.ai_allowed);
    toast(t(res.ai_allowed ? 'The AI tutor is allowed' : 'The AI tutor is switched off'));
  };
  $('#pinChange').onsubmit = async (e) => {
    e.preventDefault();
    const n = $('#newPin').value;
    if (!/^\d{4}$/.test(n)) { toast(t('The PIN must be 4 digits')); return; }
    if (await withPin({ set_pin: n })) { parentPin = n; $('#newPin').value = ''; toast(t('PIN changed')); }
  };
  $('#offBtn').onclick = async () => {
    if (await withPin({ disable: true })) { parentUntil = 0; parentPin = null; toast(t('Parent mode is off')); viewParent(); }
  };
}
