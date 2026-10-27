// pages.js: Home, Classes, one Class, Statistics, History and the lesson Report.
'use strict';

async function loadOverview() {
  const data = await cachedGet('/api/overview');
  lastActive = data.active;
  reviewBadge = data.reviews_due || 0;
  hasReviewCards = (data.reviews_due || 0) + (data.reviews_total || 0) > 0;
  pausedBadge = (data.paused || []).length;
  return data;
}

function pageHead(eyebrow, title, actions = '', back = null) {
  // No fixed "back" target? If you came here from a link on another page (not from the menu),
  // show an arrow that returns to that page.
  const from = !back && cameFrom();
  return `<header class="top">
    <div class="head-title">${back ? `<a class="back" href="${back}" aria-label="Back">${BACK}</a>`
      : from ? `<a class="back" href="${from.hash}" aria-label="Back to ${from.name}" title="Back to ${from.name}">${BACK}</a>` : ''}
      <div><div class="eyebrow">${eyebrow}</div><h1 class="h-title">${title}</h1></div></div>
    <div class="actions">${actions}</div>
  </header>`;
}

async function continueLesson(lessonId, btn) {
  if (btn) { btn.disabled = true; btn.textContent = 'Starting camera…'; }
  askNotificationPermission();
  try {
    await api('/api/start', { continue_id: lessonId });
    location.hash = '#/session';
  } catch (err) {
    if (btn) { btn.disabled = false; btn.textContent = 'Continue'; }
    toast(`Could not start: ${err.message}`);
  }
}

async function finishLesson(lessonId) {
  await api('/api/lesson/finish', { lesson_id: lessonId });
  toast('Lesson marked as done');
  route();
}

function pausedCard(l) {
  return `<article class="card resume">
    <div class="resume-top"><span class="cls">${esc(l.class)}</span>${statusChip(l)}</div>
    <h3>${esc(l.title)}</h3>
    <p class="muted">${hm(l.study_min)} so far · ${l.avg_attention ?? '–'}% attention · paused ${esc(ago(l.last_at))}${l.auto_paused ? ` (${esc(l.auto_paused)})` : ''}</p>
    <div class="btnrow">
      <button class="btn primary" data-continue="${esc(l.lesson_id)}">${icon('play', 'var(--accent-ink)', 16)} Continue</button>
      <button class="btn ghost" data-done="${esc(l.lesson_id)}">Mark as done</button>
    </div>
  </article>`;
}

function wireLessonButtons(root = document) {
  root.querySelectorAll('[data-continue]').forEach((b) => { b.onclick = () => continueLesson(b.dataset.continue, b); });
  root.querySelectorAll('[data-done]').forEach((b) => { b.onclick = () => finishLesson(b.dataset.done); });
}

// ---------------------------------------------------------------- Home
async function viewHome(prefillClass = '') {
  closeStream();
  const [d, lumi] = await Promise.all([loadOverview(), api('/api/friend').catch(() => null)]);
  const t = d.totals;
  const week = d.days.slice(-7);
  const classNames = d.classes.map((c) => c.name);

  const g = d.goal;
  const today = t.today_study ? `<strong>${hm(t.today_focused)}</strong> focused of ${hm(t.today_study)} studied today` : "Let's start today's first lesson!";
  app.innerHTML = shell('home', `
  <main class="wrap home">
    <header class="home-hero">
      <div class="eyebrow">${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      <h1>${greeting()}! <span class="wave" aria-hidden="true">👋</span></h1>
      <p class="muted">${today}${d.paused.length ? ` · <a href="#/classes">${d.paused.length} paused lesson${d.paused.length === 1 ? '' : 's'} →</a>` : ''}</p>
    </header>

    <div class="home-grid">
      <section class="card startcard">
        <div class="start-head">
          <div class="start-ico">${icon('play', 'var(--accent-ink)', 22)}</div>
          <div><h2>Start a study session</h2>
            <p class="muted">Choose a class and a lesson. Lumen follows your attention and suggests breaks.</p></div>
        </div>
        <form id="startForm" class="start-row">
          <label><span class="eyebrow">Class</span>
            <div class="combo"><input class="field" id="cls" maxlength="60" placeholder="Choose or type, e.g. Math" value="${esc(prefillClass)}" autocomplete="off"
              role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="clsList">
              <button type="button" class="combo-arrow" id="clsArrow" tabindex="-1" aria-label="Show classes">▾</button>
              <ul class="combo-list card" id="clsList" role="listbox" hidden></ul></div></label>
          <label><span class="eyebrow">Lesson</span>
            <input class="field" id="title" maxlength="80" placeholder="e.g. Lecture 5: eigenvalues" autocomplete="off"></label>
          <button class="btn primary big startbtn" id="startBtn" type="submit">${icon('play', 'var(--accent-ink)', 16)} Start</button>
        </form>
        ${classNames.length ? `<div class="quick"><span class="eyebrow">Recent:</span>${classNames.slice(0, 5).map((c) => `<button type="button" class="tagbtn" data-cls="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}

        <details class="options" id="moreOpts">
          <summary><span class="opt-pill">⏱ Lesson timing <b id="rhySum">Auto</b></span>
            <span class="opt-more">Change <span class="chev">›</span></span></summary>
          <div class="options-body">
            <div class="rhythmbox"><span class="eyebrow">⏱ How long to study before a break</span>
              <div class="rhythms" role="radiogroup" aria-label="Study rhythm">${RHYTHMS.map(([v, l, sub]) => `<button type="button" class="rhy" role="radio" data-rhythm="${v}"><b>${l}</b><small>${sub}</small></button>`).join('')}</div>
              <div class="rhycustom" id="rhyCustom" hidden><input class="field" type="number" id="rhyStudy" min="5" max="240" value="45" aria-label="Study minutes"><span>min study, then</span>
                <input class="field" type="number" id="rhyBreak" min="1" max="60" value="10" aria-label="Break minutes"><span>min break</span></div>
              <p class="planline" id="planLine">${icon('history', 'var(--teal)', 16)} ${d.plan_personal
                ? `Auto: a break every <strong>${d.plan_min} minutes</strong>, a little before your attention usually drops.`
                : `Auto: a break every <strong>${d.plan_min} minutes</strong>, earlier if you look tired.`}${d.settings.eye_rest ? ' Eye rest every 20 minutes.' : ''}</p>
            </div>
          </div>
        </details>
      </section>

      <aside class="todaycol">
        ${lumi ? lumiHomeCard(lumi, g) : ''}
      </aside>
    </div>
  </main>`);

  wireLessonButtons();
  drawDraft();
  if (lumi) lumiNews(lumi);
  document.querySelectorAll('[data-cls]').forEach((b) => { b.onclick = () => { $('#cls').value = b.dataset.cls; showClassTodos(); $('#title').focus(); }; });
  classCombo($('#cls'), $('#clsList'), classNames, () => { showClassTodos(); $('#title').focus(); });
  setupRhythm(d.settings.rhythm);
  let todoTimer;
  $('#cls').oninput = () => { clearTimeout(todoTimer); todoTimer = setTimeout(showClassTodos, 300); };
  showClassTodos();
  if (prefillClass) $('#title').focus();
  $('#startForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#startBtn');
    btn.disabled = true;
    btn.textContent = 'Starting camera…';
    askNotificationPermission();
    // the first start downloads the face model (~4 MB): show what is happening
    const progress = setInterval(() => {
      const st = Lumen.server.cameraStatus;
      if (st && st.stage !== 'ready' && st.stage !== 'error') btn.textContent = st.text;
    }, 250);
    try {
      addTypedTask();
      await api('/api/start', { class: $('#cls').value.trim() || 'Other', title: $('#title').value.trim() || 'Study session',
        tasks: draftTasks, rhythm: chosenRhythm() });
      draftTasks = [];
      clearInterval(progress);
      location.hash = '#/session';
    } catch (err) {
      clearInterval(progress);
      btn.disabled = false;
      btn.textContent = 'Start studying';
      const box = document.createElement('div');
      box.className = 'error';
      box.innerHTML = `<strong>Could not start the camera.</strong><br>${esc(err.message)}<br>
        Allow the camera for this site: click the camera / 🔒 icon in the address bar. On a Mac, also check
        System Settings → Privacy &amp; Security → Camera → your browser is allowed.`;
      $('#startForm').after(box);
    }
  });
}

// ---------------------------------------------------------------- Classes
async function viewClasses() {
  closeStream();
  const d = await loadOverview();
  app.innerHTML = shell('classes', `
  ${pageHead(`${d.classes.length} class${d.classes.length === 1 ? '' : 'es'} · ${d.totals.lessons} lessons`, 'Classes', '<a class="btn primary" href="#/">New session</a>')}
  <main class="wrap">
    ${d.paused.length ? `<section class="block"><div class="block-head"><h2>Paused lessons</h2></div>
      <div class="grid3">${d.paused.map(pausedCard).join('')}</div></section>` : ''}
    <section class="block">
      <div class="block-head"><h2>All classes</h2></div>
      ${d.classes.length ? `<div class="grid3">${d.classes.map((c) => `<a class="card classcard" href="#/class/${encodeURIComponent(c.name)}">
          <div class="resume-top"><h3>${esc(c.name)}</h3>${c.paused ? `<span class="chip break">${c.paused} paused</span>` : ''}</div>
          <div class="kpis small3"><div><b>${hm(c.study_min)}</b><span>studied</span></div>
            <div><b>${c.study_min ? Math.round(100 * c.focused_min / c.study_min) : 0}%</b><span>focused</span></div>
            <div><b>${c.lessons}</b><span>lesson${c.lessons === 1 ? '' : 's'}</span></div></div>
          ${trend(c.trend)}
          <p class="muted small" style="margin:0">Last studied ${esc(ago(c.last_at))}</p></a>`).join('')}</div>`
        : '<p class="empty">No classes yet. Start a session and give it a class name, for example "Linear algebra".</p>'}
    </section>
  </main>`);
  wireLessonButtons();
}

async function viewClass(name) {
  closeStream();
  const d = await loadOverview();
  const c = d.classes.find((x) => x.name === name);
  if (!c) { location.hash = '#/classes'; return; }
  const ls = d.lessons.filter((l) => l.class === name);
  const sess = d.sessions.filter((s) => s.class === name).slice().reverse();
  app.innerHTML = shell('classes', `
  ${pageHead(`Class · last studied ${esc(ago(c.last_at))}`, esc(name),
    `<a class="btn primary" href="#/start/${encodeURIComponent(name)}">Start a lesson</a>`, '#/classes')}
  <main class="wrap" style="display:flex;flex-direction:column;gap:24px">
    <section class="stats">
      <div class="card"><span class="eyebrow">Time studied</span><b>${hm(c.study_min)}</b></div>
      <div class="card"><span class="eyebrow">Focused</span><b>${hm(c.focused_min)}</b><span class="eyebrow">${c.study_min ? Math.round(100 * c.focused_min / c.study_min) : 0}% of the time</span></div>
      <div class="card"><span class="eyebrow">Average attention</span><b>${c.avg_attention ?? '–'}%</b></div>
      <div class="card"><span class="eyebrow">Lessons</span><b>${c.lessons}</b>${c.paused ? `<span class="eyebrow">${c.paused} paused</span>` : ''}</div>
    </section>
    <div class="row" style="align-items:flex-start">
      <section class="card" style="flex:1 1 420px;min-width:0">
        <div class="block-head"><h2 class="display" style="font-size:20px;margin:0">✅ To-do</h2><span class="muted small">${(d.todo_open || {})[name] || 0} open</span></div>
        <p class="muted small" style="margin:0 0 12px">Everything you still need to do for this class. Tasks from your lesson plans land here too.</p>
        <div id="todoBox"></div>
      </section>
      <section class="card" style="flex:1 1 420px;min-width:0">
        <div class="block-head"><h2 class="display" style="font-size:20px;margin:0">📝 Sticky notes</h2>
          <button class="btn ghost" type="button" id="classAI">${icon('ai', 'currentColor', 16)} Ask AI about ${esc(name)}</button></div>
        <div class="notegrid wide" id="classNotes"><p class="muted small">Loading…</p></div>
      </section>
    </div>
    <section class="card">
      <h2 class="display" style="font-size:20px">Attention per session</h2>
      <p class="muted small" style="margin:0 0 12px">Oldest on the left. Are you getting better at staying with this subject?</p>
      ${trend(sess.map((s) => s.avg_attention), 120)}
    </section>
    <section class="card">
      <h2 class="display" style="font-size:20px">Lessons</h2>
      <div class="list">${ls.map((l) => `<div class="lesson">
          <div class="x"><div>${esc(l.title)} ${statusChip(l)}</div>
            <div>${l.parts} part${l.parts === 1 ? '' : 's'} · ${hm(l.study_min)} · ${l.avg_attention ?? '–'}% attention · ${esc(ago(l.last_at))}</div></div>
          <div class="btnrow">
            ${l.status === 'paused' ? `<button class="btn primary" data-continue="${esc(l.lesson_id)}">Continue</button>` : ''}
            <a class="btn ghost" href="#/report/${esc(l.last_id)}">Report</a></div></div>`).join('')}</div>
    </section>
  </main>`);
  todoWidget($('#todoBox'), name);
  api(`/api/notes?class=${encodeURIComponent(name)}`).then(({ notes }) => notesWidget($('#classNotes'), notes.slice().reverse(), { showLesson: true }));
  $('#classAI').onclick = () => openAIPopup({ cls: name });
  wireLessonButtons();
}

// ---------------------------------------------------------------- Statistics

// mood: one stacked bar + legend with percentages
function moodCard(mood, title) {
  const pct = mood.pct || mood;
  const keys = Object.keys(MOOD).filter((k) => pct[k]);
  const main = keys.slice().sort((a, b) => pct[b] - pct[a])[0];
  return `<section class="card">
    <div class="block-head"><h2 class="display" style="font-size:20px;margin:0">${title}</h2>
      ${main ? `<span class="chip">${MOOD[main][0]} mostly ${MOOD[main][1].toLowerCase()}</span>` : ''}</div>
    <div class="moodbar" role="img" aria-label="Share of time in each mood">${keys.map((k) => `<i style="flex:${pct[k]};background:${MOOD[k][2]}" title="${MOOD[k][1]} ${pct[k]}%"></i>`).join('')}</div>
    <div class="legend" style="margin-top:12px">${keys.map((k) => `<span><i style="background:${MOOD[k][2]}"></i>${MOOD[k][0]} ${MOOD[k][1]} <strong>${pct[k]}%</strong></span>`).join('')}</div>
    ${mood.pct ? `<p class="muted small" style="margin:12px 0 0">${mood.smiles ? `You smiled ${mood.smiles} time${mood.smiles === 1 ? '' : 's'}. ` : ''}${mood.hard ? `Most frowning: ${mood.hard.from}–${mood.hard.to} (often a hard part). ` : ''}Lumen reads facial expressions, not feelings: a frown often just means effort.</p>`
      : '<p class="muted small" style="margin:12px 0 0">From facial expressions in all your sessions. Lumen reads expressions, not feelings.</p>'}
  </section>`;
}

// ---------------------------------------------------------------- History
async function viewHistory() {
  closeStream();
  const d = await loadOverview();
  const groups = [];
  d.sessions.forEach((s) => {
    const key = new Date(s.started_at * 1000).toDateString();
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push(g = { key, ts: s.started_at, items: [] });
    g.items.push(s);
  });
  app.innerHTML = shell('history', `
  ${pageHead(`${d.sessions.length} sessions`, 'History')}
  <main class="wrap" style="display:flex;flex-direction:column;gap:24px">
    ${groups.length ? groups.map((g) => `<section class="block">
      <div class="block-head"><h2>${new Date(g.ts * 1000).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
        <span class="muted small">${hm(g.items.reduce((a, s) => a + s.duration_sec, 0) / 60)} studied</span></div>
      <div class="list">${g.items.map((s) => `<a class="hist" href="#/report/${esc(s.id)}">
          <span class="time">${new Date(s.started_at * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
          <span class="x"><span class="cls">${esc(s.class)}</span> ${esc(s.title)}${s.part > 1 ? ` <span class="muted">· part ${s.part}</span>` : ''}
            <small>${hm(s.duration_sec / 60)} · ${s.away_count} look-aways · ${s.pickups} phone${s.status === 'paused' ? ' · paused' : ''}${s.tasks_total ? ` · 🎯 ${s.tasks_done}/${s.tasks_total} tasks` : ''}</small></span>
          <b style="color:${attColor(s.avg_attention)}">${s.avg_attention}%</b></a>`).join('')}</div>
    </section>`).join('') : '<p class="empty">No sessions yet.</p>'}
  </main>`);
}

// ---------------------------------------------------------------- Report (one sitting)
async function viewReport(id) {
  closeStream();
  let r, d;
  try { [r, d] = await Promise.all([api(`/api/sessions/${encodeURIComponent(id)}`), loadOverview()]); } catch { location.hash = '#/'; return; }
  const dur = r.duration_sec;
  const lesson = d.lessons.find((l) => l.lesson_id === (r.lesson_id || r.id));
  const canContinue = lesson && lesson.status === 'paused' && lesson.last_id === r.id;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => mmss(dur >= 600 ? Math.round(dur * f / 60) * 60 : Math.round(dur * f)));
  const parts = lesson && lesson.parts > 1
    ? `<div class="parts">${lesson.part_ids.map((pid, i) => `<a class="${pid === r.id ? 'on' : ''}" href="#/report/${esc(pid)}">Part ${i + 1}</a>`).join('')}</div>` : '';

  app.innerHTML = shell('history', `
  ${pageHead(`${esc(r.class || 'Other')} · ${esc(ago(r.started_at))}${r.part > 1 ? ` · part ${r.part}` : ''}`, esc(r.title),
    canContinue ? `<button class="btn primary" data-continue="${esc(lesson.lesson_id)}">${icon('play', 'var(--accent-ink)', 16)} Continue lesson</button>` : '<a class="btn primary" href="#/">New session</a>',
    r.class ? `#/class/${encodeURIComponent(r.class)}` : '#/history')}
  <main class="wrap" style="display:flex;flex-direction:column;gap:24px">
    ${parts}
    ${(r.tasks || []).length ? `<section class="card plancard">
      <div class="block-head" style="margin-bottom:10px"><h2 class="display" style="font-size:18px;margin:0">🎯 Session plan</h2>
        <span class="chip ${r.outcome === 'yes' ? 'Focused' : r.outcome === 'partly' ? 'break' : r.outcome === 'no' ? 'Lost' : 'break'}">${r.tasks.filter((t) => t.done).length} of ${r.tasks.length} done</span></div>
      <ul class="checks readonly">${r.tasks.map((t) => `<li class="${t.done ? 'done' : ''}"><span class="box">${t.done ? '✓' : ''}</span>${esc(t.text)}</li>`).join('')}</ul>
    </section>` : r.intention ? `<div class="intent-box"><span class="eyebrow">🎯 Intention</span><strong>${esc(r.intention)}</strong></div>` : ''}
    ${r.status === 'paused' ? `<div class="banner"><span><strong>Paused${r.auto_paused ? ` automatically (${esc(r.auto_paused)})` : ''}.</strong> Continue this lesson any time, today or another day.</span>
      ${canContinue ? `<button class="btn ghost" data-done="${esc(lesson.lesson_id)}">Mark as done</button>` : ''}</div>` : ''}
    <section class="stats">
      <div class="card"><span class="eyebrow">Duration</span><b>${Math.max(1, Math.round(dur / 60))} min</b></div>
      <div class="card"><span class="eyebrow">Average attention</span><b>${r.avg_attention}%</b></div>
      <div class="card"><span class="eyebrow">Focused</span><b>${hm(r.focused_min)}</b><span class="eyebrow">longest streak ${r.longest_focus ?? 0} min</span></div>
      <div class="card"><span class="eyebrow">Looked away</span><b>${r.away_count ?? 0} ${tUnit('time', r.away_count ?? 0)}</b><span class="eyebrow">${awayWords(r.away_total)}</span></div>
      <div class="card"><span class="eyebrow">Breaks</span><b>${r.breaks}</b>${r.break_min ? `<span class="eyebrow">${r.break_min} min resting</span>` : ''}</div>
    </section>
    <section class="card" style="padding:28px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:12px;margin-bottom:6px">
        <h2 class="display" style="margin:0;font-size:24px">Attention map</h2>
        <div class="legend">
          <span><i style="background:var(--teal)"></i>focused</span><span><i style="background:var(--slate)"></i>drifting</span>
          <span><i style="background:var(--coral)"></i>lost</span><span><i style="background:var(--accent-soft);border:1px dashed var(--accent-line)"></i>break</span>
        </div>
      </div>
      <p class="muted" style="margin:0 0 18px;font-size:14px">Each block is one minute of the lesson.</p>
      <div class="map" role="img" aria-label="Attention for each minute of the lesson">
        ${r.minutes.map((m, i) => `<i class="${m.state}${m.mark ? ' mark' : ''}" title="${mmss(i * 60)} · ${m.att == null ? m.state : m.att + '%'}"></i>`).join('')}
      </div>
      <div class="axis">${ticks.map((x) => `<span>${x}</span>`).join('')}</div>
      ${r.mood ? `<div class="moodstrip" role="img" aria-label="Mood for each minute">
        ${r.minutes.map((m, i) => `<i style="background:${m.mood ? MOOD[m.mood][2] : 'var(--track)'}" title="${mmss(i * 60)} · ${m.mood ? MOOD[m.mood][1] : 'no reading'}"></i>`).join('')}</div>
        <p class="muted small" style="margin:6px 0 0">Lower strip: mood in each minute</p>` : ''}
    </section>
    ${r.mood ? moodCard(r.mood, 'Mood during the lesson') : ''}
    <section class="card" id="repNotes" hidden><h2 class="display" style="font-size:20px">📝 Sticky notes</h2><div class="notegrid wide" id="repNoteGrid"></div></section>
    <section class="card" style="display:flex;flex-direction:column;gap:14px">
      <h2 class="display" style="font-size:20px;margin:0">What Lumen noticed</h2>
      ${r.insights.map((x) => `<div class="note">${x}</div>`).join('')}
    </section>
  </main>`);
  wireLessonButtons();
  api(`/api/notes?lesson=${encodeURIComponent(r.lesson_id || r.id)}`).then(({ notes }) => {
    if (!notes.length || !$('#repNotes')) return;
    $('#repNotes').hidden = false;
    notesWidget($('#repNoteGrid'), notes, {});
  }).catch(() => {});
  lumiNews();                           // new medals or a new stage after this lesson
}

function goalRing(g) {
  const r = 30, c = 2 * Math.PI * r, pct = Math.min(100, g.pct || 0);
  return `<svg width="76" height="76" viewBox="0 0 76 76" role="img" aria-label="Daily goal ${pct}%">
    <circle cx="38" cy="38" r="${r}" fill="none" stroke="var(--track)" stroke-width="8"/>
    <circle cx="38" cy="38" r="${r}" fill="none" stroke="${g.reached ? 'var(--teal)' : 'var(--accent)'}" stroke-width="8" stroke-linecap="round"
      stroke-dasharray="${(c * pct / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 38 38)"/>
    <text x="38" y="43" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="16" font-weight="600" fill="var(--text)">${pct}%</text></svg>`;
}

// ---------------------------------------------------------------- Review (spaced repetition)
function dueText(ts) {
  const days = Math.round((ts * 1000 - Date.now()) / 86400000);
  return days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
}

let reviewFilter = 'all';
const stageDots = (q, n) => `<span class="stagedots" title="Step ${Math.min(q.stage + 1, n)} of ${n}">${
  Array.from({ length: n }, (_, i) => `<i class="${i < q.stage || q.done ? 'on' : i === q.stage ? 'now' : ''}"></i>`).join('')}</span>`;

async function viewReview() {
  closeStream();
  const rv = await api('/api/reviews');
  const n = rv.intervals.length;
  const all = [...rv.due, ...rv.upcoming, ...rv.learned];
  const classes = [...new Set(all.map((q) => q.class))];
  if (reviewFilter !== 'all' && !classes.includes(reviewFilter)) reviewFilter = 'all';
  const pick = (list) => list.filter((q) => reviewFilter === 'all' || q.class === reviewFilter);
  const due = pick(rv.due), up = pick(rv.upcoming), learned = pick(rv.learned);
  const pct = rv.total ? Math.round((rv.done / rv.total) * 100) : 0;
  const R = 46, C = 2 * Math.PI * R;

  const tile = (q, kind) => `<article class="qtile ${kind}" style="--h:${subjectHue(q.class)}" data-open="${esc(q.id)}" tabindex="0" role="button"
      aria-label="Practise: ${esc(q.text)}">
      <div class="qtile-top"><span class="qchip">${subjectIcon(q.class)} ${esc(q.class)}</span>
        <button class="qdel" data-del="${esc(q.id)}" title="Delete this card" aria-label="Delete">✕</button></div>
      <h3>${esc(q.text)}</h3>
      <div class="qtile-foot">
        ${kind === 'learned' ? '<span class="qwhen good">🏆 Learned</span>'
          : kind === 'due' ? '<span class="qwhen hot">● Ready now</span>' : `<span class="qwhen">🗓 ${dueText(q.due)}</span>`}
        ${stageDots(q, n)}
        <span class="qans ${q.answer ? 'has' : ''}" title="${q.answer ? 'Has an answer' : 'No answer yet'}">${q.answer ? (q.answer_source === 'ai' ? '✨' : '✍️') : ''}</span>
      </div></article>`;

  const section = (title, sub, list, kind, open = true) => list.length ? `<section class="rv-sec">
      <div class="rv-sec-head"><h2>${title} <span class="count">${list.length}</span></h2>${sub}</div>
      <div class="qgrid">${list.map((q) => tile(q, kind)).join('')}</div></section>` : '';

  app.innerHTML = shell('review', `
  ${pageHead('Spaced repetition · flashcards', 'Review', `<button class="btn ghost" id="addQ">＋ Add a card</button>`)}
  <main class="wrap rv">
    <section class="rv-hero card">
      <div class="rv-ring">
        <svg viewBox="0 0 110 110" aria-hidden="true"><circle cx="55" cy="55" r="${R}" class="trk"/>
          <circle cx="55" cy="55" r="${R}" class="val" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}"/></svg>
        <div><b>${rv.done}</b><span>of ${rv.total} learned</span></div>
      </div>
      <div class="rv-hero-main">
        ${rv.due.length ? `<h2>${rv.due.length} card${rv.due.length > 1 ? 's are' : ' is'} waiting for you</h2>
            <p class="muted">About ${Math.max(1, Math.round(rv.due.length * 0.5))} min. Try to remember the answer before you flip the card.</p>
            <button class="btn teal big" id="startDue">▶ Start review</button>`
          : rv.total ? `<h2>All caught up! 🎉</h2>
            <p class="muted">${rv.next_due ? `Next card comes back <b>${dueText(rv.next_due)}</b>.` : 'Every card is learned.'} Want to practise anyway?</p>
            ${rv.upcoming.length ? '<button class="btn ghost big" id="startEarly">🔁 Practise early</button>' : ''}`
          : `<h2>Your flashcards live here</h2>
            <p class="muted">Add a card with something you want to remember. Lumen brings it back right before you'd forget it.</p>`}
      </div>
      <div class="rv-stats">
        <div><b>🔥 ${rv.streak}</b><span>day${rv.streak === 1 ? '' : 's'} in a row</span></div>
        <div><b>${rv.reviewed_today}</b><span>reviewed today</span></div>
        <div><b>${rv.upcoming.length}</b><span>coming later</span></div>
      </div>
    </section>

    <form class="rv-add card" id="addForm" hidden>
      <div class="combo"><input class="field" id="addCls" maxlength="60" placeholder="Class, e.g. Math" autocomplete="off"
        role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="addClsList" value="${reviewFilter !== 'all' ? esc(reviewFilter) : ''}">
        <button type="button" class="combo-arrow" tabindex="-1" aria-label="Show classes">▾</button>
        <ul class="combo-list card" id="addClsList" role="listbox" hidden></ul></div>
      <input class="field grow" id="addText" maxlength="300" placeholder="Question, e.g. What is a derivative?" required>
      <button class="btn teal">Add</button>
    </form>

    ${classes.length > 1 ? `<div class="rv-filter" role="tablist">
      ${['all', ...classes].map((c) => `<button role="tab" class="fchip ${c === reviewFilter ? 'on' : ''}" data-f="${esc(c)}" aria-selected="${c === reviewFilter}">
        ${c === 'all' ? '✨ All' : `${subjectIcon(c)} ${esc(c)}`}</button>`).join('')}</div>` : ''}

    ${section('Ready now', '<span class="muted small">Tap a card to practise it</span>', due, 'due')}
    ${section('Coming up', '<span class="muted small">You can practise these early</span>', up, 'later')}
    ${learned.length ? `<details class="rv-sec rv-learned"><summary><h2>Learned 🏆 <span class="count">${learned.length}</span></h2></summary>
      <div class="qgrid">${learned.map((q) => tile(q, 'learned')).join('')}</div></details>` : ''}

    <section class="rv-how">
      <div class="how-step"><i>1</i><span>Add a card</span></div><span class="how-arrow">→</span>
      <div class="how-step"><i>1d</i><span>See it again tomorrow</span></div><span class="how-arrow">→</span>
      <div class="how-step"><i>3d</i><span>then in 3 days</span></div><span class="how-arrow">→</span>
      <div class="how-step"><i>7d</i><span>then in a week</span></div><span class="how-arrow">→</span>
      <div class="how-step"><i>🏆</i><span>Learned! "Still unclear" restarts it.</span></div>
    </section>
  </main>`);

  const byId = (id) => all.find((q) => q.id === id);
  $('#addQ').onclick = () => { const f = $('#addForm'); f.hidden = !f.hidden; if (!f.hidden) $(reviewFilter === 'all' ? '#addCls' : '#addText').focus(); };
  classCombo($('#addCls'), $('#addClsList'), classes, () => $('#addText').focus());
  $('#addForm').onsubmit = async (e) => {
    e.preventDefault();
    const text = $('#addText').value.trim();
    if (!text) return;
    await api('/api/review', { add: text, class: $('#addCls').value.trim() || 'Other' });
    toast('Card added — it is ready to practise');
    viewReview();
  };
  document.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => { reviewFilter = b.dataset.f; viewReview(); }; });
  document.querySelectorAll('[data-del]').forEach((b) => {
    b.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm('Delete this card?')) return;
      await api('/api/review', { id: b.dataset.del, delete: true }); toast('Card deleted'); viewReview();
    };
  });
  document.querySelectorAll('[data-open]').forEach((t) => {
    const go = () => practise([byId(t.dataset.open)], n);
    t.onclick = go;
    t.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
  });
  if ($('#startDue')) $('#startDue').onclick = () => practise(due.length ? due : rv.due, n);
  if ($('#startEarly')) $('#startEarly').onclick = () => practise(rv.upcoming.slice(0, 10), n);
}

// Flashcard practice: question on the front, your try + the answer on the back.
function practise(deck, n) {
  deck = deck.filter(Boolean);
  if (!deck.length) return;
  let i = 0, flipped = false;
  const score = { got: 0, again: 0 };
  const box = document.createElement('div');
  box.className = 'flash-overlay';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  document.body.appendChild(box);
  const close = () => { document.removeEventListener('keydown', keys); box.remove(); viewReview(); };

  const answerHtml = (q) => q.answer
    ? `<div class="fl-answer md">${md(q.answer)}</div>
       <div class="fl-src">${q.answer_source === 'ai' ? '✨ Explained by the AI tutor' : '✍️ Your answer'} ·
         <button class="linkbtn" data-act="edit">edit</button>${q.answer_source === 'ai' ? '' : ' · <button class="linkbtn" data-act="explain">ask AI instead</button>'}</div>`
    : `<div class="fl-empty"><p>This card has no answer yet.</p>
         <div class="btnrow"><button class="btn teal" data-act="explain">✨ Explain with AI</button>
         <button class="btn ghost" data-act="edit">✍️ Write it myself</button></div></div>`;

  const draw = () => {
    if (i >= deck.length) return finish();
    const q = deck[i];
    box.innerHTML = `<div class="flash" style="--h:${subjectHue(q.class)}">
      <div class="fl-top">
        <div class="fl-progress"><span style="width:${(i / deck.length) * 100}%"></span></div>
        <span class="muted small">${i + 1} / ${deck.length}</span>
        <button class="icon-btn" data-act="close" aria-label="Close">✕</button></div>
      <div class="fl-card ${flipped ? 'flipped' : ''}">
        <div class="fl-face fl-front">
          <div class="fl-meta"><span class="qchip">${subjectIcon(q.class)} ${esc(q.class)}</span>${stageDots(q, n)}</div>
          <h2 class="fl-q">${esc(q.text)}</h2>
          ${q.title ? `<p class="muted small">From “${esc(q.title)}”${q.time ? ` at ${esc(q.time)}` : ''}</p>` : ''}
          <textarea class="field fl-try" id="flTry" rows="3" placeholder="Try to answer in your own words first (optional)…">${esc(q._try || '')}</textarea>
          <button class="btn teal big" data-act="flip">Show answer <kbd>Space</kbd></button>
        </div>
        <div class="fl-face fl-back">
          <div class="fl-meta"><span class="qchip">${subjectIcon(q.class)} ${esc(q.class)}</span>${stageDots(q, n)}</div>
          <h3 class="fl-q small">${esc(q.text)}</h3>
          ${q._try ? `<div class="fl-try-shown"><span class="muted small">You wrote</span><p>${esc(q._try)}</p></div>` : ''}
          <div id="flAns">${answerHtml(q)}</div>
          <p class="fl-ask">How did it go?</p>
          <div class="fl-grade">
            <button class="grade again" data-act="again"><b>😕 Still unclear</b><span>back tomorrow · <kbd>1</kbd></span></button>
            <button class="grade got" data-act="got"><b>😊 Got it</b><span>${q.stage + 1 >= n ? 'learned 🏆' : `next in ${[1, 3, 7][q.stage + 1] || 7} days`} · <kbd>2</kbd></span></button>
          </div>
          <button class="linkbtn fl-chat" data-act="chat">💬 Talk it through with the AI tutor</button>
        </div>
      </div></div>`;
  };

  const editAnswer = (q) => {
    $('#flAns').innerHTML = `<textarea class="field" id="flEdit" rows="5" placeholder="Write the answer in your own words…">${esc(q.answer || q._try || '')}</textarea>
      <div class="btnrow"><button class="btn teal" data-act="save">Save answer</button><button class="btn ghost" data-act="cancel">Cancel</button></div>`;
    $('#flEdit').focus();
  };

  const grade = async (result) => {
    const q = deck[i];
    const res = await api('/api/review', { id: q.id, result });
    score[result] += 1;
    if (result === 'got' && res.item && res.item.done) toast('🏆 Learned! This card is done.');
    i += 1; flipped = false; draw();
  };

  const finish = () => {
    const total = score.got + score.again;
    box.innerHTML = `<div class="flash done-card">
      <div class="fl-big">${score.again === 0 ? '🌟' : '💪'}</div>
      <h2>${score.again === 0 ? 'Perfect round!' : 'Nice work!'}</h2>
      <p class="muted">You reviewed ${total} card${total === 1 ? '' : 's'}.</p>
      <div class="fl-score"><div class="got"><b>${score.got}</b><span>😊 got it</span></div>
        <div class="again"><b>${score.again}</b><span>😕 still unclear</span></div></div>
      ${score.again ? '<p class="small muted">The unclear ones come back tomorrow. Try “Explain with AI” on them.</p>' : ''}
      <button class="btn teal big" data-act="close">Done</button></div>`;
  };

  box.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (e.target === box) return close();
    if (!b) return;
    const q = deck[i];
    const act = b.dataset.act;
    if (act === 'close') close();
    else if (act === 'flip') { q._try = ($('#flTry') || {}).value || ''; flipped = true; draw(); }
    else if (act === 'got' || act === 'again') grade(act);
    else if (act === 'edit') editAnswer(q);
    else if (act === 'cancel') $('#flAns').innerHTML = answerHtml(q);
    else if (act === 'save') {
      const text = $('#flEdit').value.trim();
      if (!text) return;
      const res = await api('/api/review', { id: q.id, answer: text });
      Object.assign(q, res.item); $('#flAns').innerHTML = answerHtml(q); toast('Answer saved on the card');
    } else if (act === 'explain') {
      $('#flAns').innerHTML = '<div class="fl-thinking"><span class="typing"><i></i><i></i><i></i></span> The AI tutor is writing an explanation…</div>';
      try {
        const res = await api('/api/review', { id: q.id, explain: true });
        if (res.error) throw new Error(res.error);
        Object.assign(q, res.item);
        $('#flAns').innerHTML = answerHtml(q);
      } catch (err) {
        $('#flAns').innerHTML = `<div class="fl-empty"><p>Couldn't reach the AI tutor${err.message ? `: ${esc(err.message)}` : ''}.</p>
          <p class="small muted">Connect one in <a href="#/settings">Settings → AI tutor</a>, or write the answer yourself.</p>
          <button class="btn ghost" data-act="edit">✍️ Write it myself</button></div>`;
      }
    } else if (act === 'chat') {
      document.removeEventListener('keydown', keys); box.remove();
      askAIAbout(`I'm reviewing this ${q.class} question and it's still unclear: ${q.text}`, q.class);
    }
  });

  const keys = (e) => {
    if (!document.body.contains(box)) return document.removeEventListener('keydown', keys);
    if (e.key === 'Escape') { e.preventDefault(); return close(); }
    const typing = /TEXTAREA|INPUT/.test((document.activeElement || {}).tagName);
    if (typing) return;
    if (!flipped && (e.key === ' ' || e.key === 'Enter') && i < deck.length) { e.preventDefault(); box.querySelector('[data-act=flip]').click(); }
    else if (flipped && e.key === '1') grade('again');
    else if (flipped && e.key === '2') grade('got');
  };
  document.addEventListener('keydown', keys);
  draw();
}

// ---------------------------------------------------------------- Settings
async function viewSettings() {
  closeStream();
  const [d, prof, ai] = await Promise.all([loadOverview(), cachedGet('/api/profile'), api('/api/ai/status')]);
  const st = d.settings;
  app.innerHTML = shell('settings', `
  ${pageHead('Lumen', 'Settings')}
  <main class="wrap narrow" style="display:flex;flex-direction:column;gap:20px">
    <section class="card">
      <h2 style="margin:0 0 4px;font-size:17px">Appearance</h2>
      <p class="muted small" style="margin:0 0 12px">Background scene</p>
      ${themeSwatches()}
      <div class="look-row"><div><p class="muted small" style="margin:0 0 8px">Accent colour</p>${accentSwatches()}</div>${motionSwitch()}</div>
    </section>
    <section class="card setrow">
      <div><h2 style="margin:0 0 4px;font-size:17px">Language</h2><p class="muted small" style="margin:0">Menu, Home, lessons and Lumi. Other pages are being translated step by step.</p></div>
      ${langButtons()}
    </section>
    <a class="card setrow" href="#/mini" style="text-decoration:none;color:var(--text)">
      <div><h2 style="margin:0 0 4px;font-size:17px">🪟 Lumen mini</h2><p class="muted small" style="margin:0">A small window with Lumi, today's focus and mood. On a Mac: open it in Safari, then File → Add to Dock.</p></div><span class="chev">›</span></a>
    <a class="card setrow parentrow" href="#/parent" style="text-decoration:none;color:var(--text)">
      <div><h2 style="margin:0 0 4px;font-size:17px">👪 Parent mode</h2><p class="muted small" style="margin:0">See your child's progress and decide about the AI tutor. Protected by a PIN.</p></div><span class="chev">›</span></a>
    <section class="card setrow">
      <div><h2>Daily goal</h2><p class="muted small">Minutes of <strong>focused</strong> study per day, the ring on Home.</p></div>
      <form id="goalForm" class="btnrow"><input class="field" id="goal" type="number" min="10" max="600" step="5" value="${st.daily_goal_min}" style="width:110px">
        <span class="muted">min</span><button class="btn primary" type="submit">Save</button></form>
    </section>
    <section class="card setrow">
      <div><h2>🔥 Streak</h2><p class="muted small">A day counts for your streak when you study at least this many minutes. Small and regular beats big and rare.</p></div>
      <form id="streakForm" class="btnrow"><input class="field" id="streakMin" type="number" min="1" max="120" step="1" value="${st.streak_min}" style="width:110px">
        <span class="muted">min</span><button class="btn primary" type="submit">Save</button></form>
    </section>
    <section class="card setrow">
      <div><h2>😊 Mood sensitivity</h2><p class="muted small">How big a change in your face counts as happy, sad or frowning. If Lumen says "Calm" all the time, choose High; if it changes too often, choose Low.</p></div>
      <div class="seg" role="radiogroup" aria-label="Mood sensitivity">${['low', 'normal', 'high'].map((v) => `<button type="button" class="pillbtn${st.mood_sens === v ? ' on' : ''}" data-mood-sens="${v}" role="radio" aria-checked="${st.mood_sens === v}">${v[0].toUpperCase() + v.slice(1)}</button>`).join('')}</div>
    </section>
    <section class="card" id="aiSet">
      <h2 style="margin:0 0 4px;font-size:17px">✨ AI tutor</h2>
      <p class="muted small" style="margin:0 0 14px">${ai.ready
        ? (ai.provider === 'lumen'
          ? `✨ <strong>Lumen AI is on</strong>, free with your account (up to ${ai.usage ? ai.usage.limit : 40} questions a day${ai.usage ? `, ${ai.usage.used} used today` : ''}). You don't need a key. The options below are only if you want to use your own.`
          : `Connected: <strong>${ai.provider === 'claude' ? 'Claude' : ai.provider === 'gemini' ? 'Gemini (your key)' : 'test mode'}</strong> · ${esc(ai.model)}${ai.key_hint ? ` · key ${esc(ai.key_hint)}` : ''}`)
        : '<a href="#/account">Sign in</a> to use the free Lumen AI tutor, or connect your own key below.'}</p>
      <form id="geminiForm" class="note" style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">
        <b>Option 1 · Your own Gemini key (free)</b>
        <span class="small muted">Free, no credit card. Open <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a>,
          sign in with Google, press <b>Create API key</b>, copy it and paste it here. There is a free daily limit (plenty for studying).
          Google's terms require the account owner to be 18+, so a parent or teacher can create the key once.</span>
        ${ai.gemini_hint ? `<span class="small">✅ Key saved: ${esc(ai.gemini_hint)}${ai.provider === 'gemini' ? ` · model ${esc(ai.model)}` : ' (Claude key is used first)'}</span>` : ''}
        <div class="btnrow" style="flex-wrap:nowrap"><input class="field" id="geminiKey" type="password" autocomplete="off" style="flex:1"
          placeholder="${ai.gemini_hint ? 'paste a new key to replace it' : 'AIza…'}"><button class="btn primary" type="submit">Connect</button>
          ${ai.gemini_hint ? '<button class="btn ghost" type="button" id="geminiDel">Remove</button>' : ''}</div>
        <span class="small muted" id="geminiMsg"></span>
      </form>
      <form id="aiKeyForm" class="note" style="display:flex;flex-direction:column;gap:10px">
        <b>Option 2 · Claude API (paid)</b>
        <span class="small muted">Create an API key at console.anthropic.com (pay per use, a question costs well under a cent with Haiku).</span>
        <div class="btnrow" style="flex-wrap:nowrap"><input class="field" id="aiKey" type="password" autocomplete="off" style="flex:1" placeholder="${ai.key_hint ? 'key saved · paste a new one to replace it' : 'sk-ant-…'}">
        <select class="field" id="aiModel" style="max-width:240px">
          ${[['claude-haiku-5-5', 'Haiku: fast, cheapest'], ['claude-sonnet-5-5', 'Sonnet: smarter'], ['claude-opus-5-5', 'Opus: smartest, most expensive']]
            .map(([v, l]) => `<option value="${v}" ${ai.model === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="btnrow"><button class="btn primary" type="submit">Save</button>${ai.key_hint ? '<button class="btn ghost" type="button" id="aiKeyDel">Remove key</button>' : ''}</div>
      </form>
      <p class="small muted" style="margin:12px 0 0">🔒 Keys are saved only in this browser, on this device. They are never sent to Lumen, only to Google or Anthropic when you ask a question.</p>
    </section>
    <section class="card setrow">
      <div><h2>Eye rest (20-20-20)</h2><p class="muted small">Every 20 minutes, look 6 metres away for 20 seconds. Lumen checks with the camera.</p></div>
      <button class="switch${st.eye_rest ? ' on' : ''}" data-set="eye_rest" role="switch" aria-checked="${st.eye_rest}" aria-label="Eye rest"><span></span></button>
    </section>
    <section class="card setrow">
      <div><h2>Posture reminders</h2><p class="muted small">A gentle reminder after a minute of leaning towards the screen or slouching.</p></div>
      <button class="switch${st.posture ? ' on' : ''}" data-set="posture" role="switch" aria-checked="${st.posture}" aria-label="Posture reminders"><span></span></button>
    </section>
    <section class="card setrow">
      <div><h2>Blink reminders</h2><p class="muted small">When you blink much less than usual for 2 minutes (screen staring dries the eyes), Lumen reminds you.</p></div>
      <button class="switch${st.blink ? ' on' : ''}" data-set="blink" role="switch" aria-checked="${st.blink}" aria-label="Blink reminders"><span></span></button>
    </section>
    <section class="card setrow">
      <div><h2>Smart timing</h2><p class="muted small">Break and eye-rest suggestions wait for a natural pause (you look away or attention dips) instead of interrupting a focused moment. Tiredness waits at most 1 minute, others at most 3–4.</p></div>
    </section>
    <section class="card setrow">
      <div><h2>Break plan</h2><p class="muted small">${d.plan_personal
        ? `Every <strong>${d.plan_min} minutes</strong>, learned from when your attention usually drops.`
        : `Every <strong>${d.plan_min} minutes</strong> for now. After 3 sessions of 15+ minutes Lumen learns your own rhythm.`}</p></div>
    </section>
    <section class="card setrow">
      <div><h2>Detection settings</h2><p class="muted small">${prof.profile ? 'Personal thresholds from your accuracy check are in use.' : 'Default thresholds are in use.'}</p></div>
      <div class="btnrow"><a class="btn ghost" href="#/check">Accuracy check</a>${prof.profile ? '<button class="btn ghost" id="resetProf">Reset</button>' : ''}</div>
    </section>
    <section class="card" id="dataSet">
      <h2 style="margin:0 0 4px;font-size:17px">🗂️ Your data</h2>
      <p class="muted small" style="margin:0 0 14px">${Lumen.account ? Lumen.account.text : 'Guest mode: your lessons are saved in this browser on this device. Download a copy to keep it safe or move it to another computer.'}</p>
      <div class="btnrow">
        <button class="btn ghost" type="button" id="exportBtn">⬇ Download my data</button>
        <label class="btn ghost" for="importFile" style="cursor:pointer">⬆ Load from a file</label>
        <input type="file" id="importFile" accept="application/json,.json" hidden>
        <button class="btn ghost danger" type="button" id="wipeBtn">Delete everything</button>
      </div>
      <span class="small muted" id="dataMsg"></span>
    </section>
  </main>`);
  $('#exportBtn').onclick = async () => {
    const data = await api('/api/export');
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lumen-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  $('#importFile').onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const res = await api('/api/import', JSON.parse(await f.text()));
      $('#dataMsg').textContent = `Loaded: ${res.counts.sessions || 0} lessons, ${res.counts.reviews || 0} review cards, ${res.counts.todos || 0} to-dos.`;
      toast('Data loaded');
    } catch (err) { $('#dataMsg').textContent = `Could not load this file: ${err.message}`; }
  };
  $('#wipeBtn').onclick = async () => {
    if (!confirm('Delete all lessons, notes, to-dos, chats and review cards on this device? This cannot be undone.')) return;
    await Lumen.wipe();
    location.hash = '#/';
    location.reload();
  };
  document.querySelectorAll('[data-mood-sens]').forEach((b) => {
    b.onclick = async () => {
      await api('/api/settings', { mood_sens: b.dataset.moodSens });
      document.querySelectorAll('[data-mood-sens]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); });
      toast('Mood sensitivity saved (from the next session)');
    };
  });
  $('#streakForm').onsubmit = async (e) => {
    e.preventDefault();
    await api('/api/settings', { streak_min: Number($('#streakMin').value) });
    toast('Streak rule saved');
  };
  $('#aiKeyForm').onsubmit = async (e) => {
    e.preventDefault();
    const body = { model: $('#aiModel').value };
    if ($('#aiKey').value.trim()) body.api_key = $('#aiKey').value.trim();
    await api('/api/ai/config', body);
    toast('AI tutor saved');
    viewSettings();
  };
  $('#geminiForm').onsubmit = async (e) => {
    e.preventDefault();
    const key = $('#geminiKey').value.trim();
    if (!key) return;
    $('#geminiMsg').textContent = 'Checking the key with Google…';
    try { await api('/api/ai/config', { gemini_key: key }); toast('✨ Free AI connected'); viewSettings(); }
    catch (err) { $('#geminiMsg').textContent = err.message; }
  };
  if ($('#geminiDel')) $('#geminiDel').onclick = async () => { await api('/api/ai/config', { gemini_key: '' }); toast('Gemini key removed'); viewSettings(); };
  if ($('#ollamaCheck')) $('#ollamaCheck').onclick = () => viewSettings();
  const pollPull = async () => {
    const st = await api('/api/ai/status').catch(() => null);
    if (!st || !$('#pullBtn')) return;
    const p = st.pull || {};
    if (p.state === 'running') {
      $('#pullBtn').disabled = true; $('#pullBar').hidden = false;
      $('#pullBar i').style.width = `${p.pct}%`; $('#pullTxt').textContent = `Downloading ${p.model}… ${p.pct}%`;
      setTimeout(pollPull, 1000);
    } else if (p.state === 'error') { $('#pullBtn').disabled = false; $('#pullTxt').textContent = p.error; }
    else if (st.ready) { toast('Free AI is ready!'); viewSettings(); }
  };
  if ($('#pullBtn')) {
    $('#pullBtn').onclick = async () => { await api('/api/ai/pull', {}); pollPull(); };
    if ((ai.pull || {}).state === 'running') pollPull();
  }
  if ($('#aiKeyDel')) $('#aiKeyDel').onclick = async () => { await api('/api/ai/config', { api_key: '' }); toast('Key removed'); viewSettings(); };
  $('#goalForm').onsubmit = async (e) => {
    e.preventDefault();
    await api('/api/settings', { daily_goal_min: Number($('#goal').value) });
    toast('Daily goal saved');
  };
  document.querySelectorAll('[data-set]').forEach((b) => {
    b.onclick = async () => {
      const on = !b.classList.contains('on');
      await api('/api/settings', { [b.dataset.set]: on });
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
      toast(`${b.getAttribute('aria-label')} ${on ? 'on' : 'off'} (from the next session)`);
    };
  });
  const rp = $('#resetProf');
  if (rp) rp.onclick = async () => { await api('/api/profile', { reset: true }); toast('Back to default thresholds'); viewSettings(); };
}

// ---------------------------------------------------------------- Weekly report

// ---- the session plan (task list) on the start form
let draftTasks = [];          // [{text, todo_id?}]
function addTypedTask() {
  const inp = $('#taskInput');
  if (!inp) return;
  const v = inp.value.trim();
  if (v && draftTasks.length < 8) { draftTasks.push({ text: v }); inp.value = ''; drawDraft(); }
}
function updateOptionSummary() {
  if ($('#planSum')) $('#planSum').textContent = draftTasks.length ? `${draftTasks.length} task${draftTasks.length === 1 ? '' : 's'}` : 'no tasks';
  if ($('#rhySum')) { const r = chosenRhythm(); $('#rhySum').textContent = r ? `${r.study} + ${r.break}` : 'Auto'; }
}
function drawDraft() {
  updateOptionSummary();
  const ul = $('#taskList');
  if (!ul) return;
  ul.innerHTML = draftTasks.map((t, i) => `<li><span>${esc(t.text)}</span><button type="button" class="icon-btn" data-rm="${i}" aria-label="Remove task">✕</button></li>`).join('');
  ul.querySelectorAll('[data-rm]').forEach((b) => { b.onclick = () => { draftTasks.splice(Number(b.dataset.rm), 1); drawDraft(); showClassTodos(); }; });
}
// open to-dos of the class you typed: one click puts them in this session's plan
async function showClassTodos() {
  const box = $('#fromTodo');
  if (!box) return;
  const cls = $('#cls').value.trim();
  if (!cls) { box.hidden = true; return; }
  let items = [];
  try { items = (await api(`/api/todos?class=${encodeURIComponent(cls)}`)).items.filter((i) => !i.done); } catch { /* fine */ }
  items = items.filter((i) => !draftTasks.some((t) => t.todo_id === i.id));
  box.hidden = !items.length;
  box.innerHTML = `<span class="eyebrow">From your ${esc(cls)} to-do:</span>${items.slice(0, 8).map((i) => `<button type="button" class="tagbtn" data-todo-pick="${i.id}">+ ${esc(i.text)}</button>`).join('')}`;
  box.querySelectorAll('[data-todo-pick]').forEach((b) => {
    b.onclick = () => {
      const it = items.find((x) => x.id === b.dataset.todoPick);
      if (draftTasks.length < 8) draftTasks.push({ text: it.text, todo_id: it.id });
      drawDraft();
      showClassTodos();
    };
  });
}

// ---------------------------------------------------------------- class picker (combobox)
// Click the field: your classes + common school subjects. Type: the list filters. Or just type a new name.
const SUBJECTS = ['Math', 'Algebra', 'Geometry', 'English', 'Russian', 'Armenian', 'History', 'Armenian history', 'Biology',
  'Chemistry', 'Physics', 'Geography', 'Literature', 'Computer science', 'Programming', 'Economics', 'Art', 'Music'];
function classCombo(input, list, mine, onPick) {
  let items = [], active = -1;
  const draw = () => {
    const q = input.value.trim().toLowerCase();
    const match = (c) => !q || c.toLowerCase().includes(q);
    const own = mine.filter(match);
    const lower = mine.map((c) => c.toLowerCase());
    const common = SUBJECTS.filter((c) => match(c) && !lower.includes(c.toLowerCase()));
    items = [...own, ...common];
    active = Math.min(active, items.length - 1);
    let i = -1;
    const opt = (c) => { i += 1; return `<li role="option" id="clsOpt${i}" data-i="${i}" aria-selected="${i === active}" class="${i === active ? 'on' : ''}">${esc(c)}</li>`; };
    list.innerHTML = (own.length ? `<li class="combo-group" role="presentation">Your classes</li>${own.map(opt).join('')}` : '')
      + (common.length ? `<li class="combo-group" role="presentation">Subjects</li>${common.map(opt).join('')}` : '')
      + (!items.length ? `<li class="combo-group" role="presentation">New class: “${esc(input.value.trim())}”</li>` : '');
    input.setAttribute('aria-activedescendant', active >= 0 ? `clsOpt${active}` : '');
    const on = list.querySelector('.on');
    if (on) on.scrollIntoView({ block: 'nearest' });
  };
  const open = () => { list.hidden = false; input.setAttribute('aria-expanded', 'true'); draw(); };
  const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); active = -1; };
  const pick = (i) => { input.value = items[i]; close(); onPick(items[i]); };
  input.addEventListener('focus', open);
  input.addEventListener('click', open);
  input.addEventListener('input', () => { active = -1; open(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (list.hidden) open(); active = Math.min(items.length - 1, active + 1); draw(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); draw(); }
    else if (e.key === 'Enter' && !list.hidden && active >= 0) { e.preventDefault(); pick(active); }
    else if (e.key === 'Escape' || e.key === 'Tab') close();
  });
  list.addEventListener('mousedown', (e) => {       // mousedown: before the input loses focus
    const li = e.target.closest('[data-i]');
    if (li) { e.preventDefault(); pick(Number(li.dataset.i)); }
  });
  const arrow = input.parentElement.querySelector('.combo-arrow');
  if (arrow) arrow.onclick = () => { if (list.hidden) { input.focus(); open(); } else close(); };
  document.addEventListener('click', (e) => { if (!e.target.closest('.combo')) close(); });
}

// ---------------------------------------------------------------- study rhythm (your own study / break blocks)
const RHYTHMS = [['auto', 'Auto', 'Lumen decides'], ['25+5', '25 + 5', 'Pomodoro'], ['50+10', '50 + 10', 'classic'],
  ['60+10', '60 + 10', '1 hour'], ['90+15', '90 + 15', 'deep work'], ['custom', 'Custom', 'your numbers']];
let rhythmChoice = 'auto';
function setupRhythm(saved) {
  if (saved) {
    const key = `${saved.study}+${saved.break}`;
    rhythmChoice = RHYTHMS.some(([v]) => v === key) ? key : 'custom';
    if (rhythmChoice === 'custom') { $('#rhyStudy').value = saved.study; $('#rhyBreak').value = saved.break; }
  } else rhythmChoice = 'auto';
  const draw = () => {
    document.querySelectorAll('[data-rhythm]').forEach((b) => {
      const on = b.dataset.rhythm === rhythmChoice;
      b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on));
    });
    $('#rhyCustom').hidden = rhythmChoice !== 'custom';
    updateOptionSummary();
    const pl = $('#planLine');
    if (pl) {
      if (!pl.dataset.auto) pl.dataset.auto = pl.innerHTML;
      const r = chosenRhythm();
      pl.innerHTML = r ? `${icon('history', 'var(--teal)', 16)} Your rhythm: <strong>${r.study} min study, then a ${r.break}-min break</strong>. Lumen reminds you on time.`
        : pl.dataset.auto;
    }
  };
  ['#rhyStudy', '#rhyBreak'].forEach((sel) => { $(sel).oninput = draw; });
  document.querySelectorAll('[data-rhythm]').forEach((b) => { b.onclick = () => { rhythmChoice = b.dataset.rhythm; draw(); }; });
  draw();
}
function chosenRhythm() {
  if (rhythmChoice === 'auto') return null;
  if (rhythmChoice === 'custom') return { study: Number($('#rhyStudy').value), break: Number($('#rhyBreak').value) };
  const [study, brk] = rhythmChoice.split('+').map(Number);
  return { study, break: brk };
}
