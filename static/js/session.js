'use strict';
// ---------------------------------------------------------------- Session
// Sound + system notification, so a suggestion reaches you even while the lesson is in another tab.
let audioCtx = null;
function chime() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    [660, 880].forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      const t = audioCtx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g).connect(audioCtx.destination);
      o.start(t); o.stop(t + 0.55);
    });
  } catch { /* sound is optional */ }
}
function notify(title, body) {
  chime();
  if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
    const n = new Notification(title, { body, tag: 'lumen', silent: true });
    n.onclick = () => { window.focus(); n.close(); };
  }
}
function askNotificationPermission() {
  try {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();   // unlock audio on a click
  } catch { /* ignore */ }
}

const ui = { sugKey: null, chosen: 5, manual: false, last: null, wasOnBreak: false };

async function viewSession() {
  const state = await api('/api/state');
  if (!state.active) { location.hash = '#/'; return; }
  if (state.snapshot.mode === 'check') { location.hash = '#/check/run'; return; }
  const s = state.snapshot;
  focusMode();
  Object.assign(ui, { sugKey: null, chosen: s.recommended || 5, manual: false, last: s, wasOnBreak: s.on_break });

  app.innerHTML = `
  <header class="top">
    <div class="head-title">
      <a class="back" href="#/" aria-label="Home (the session keeps running)">${BACK}</a>
      <div><div class="eyebrow">${esc(s.class || 'Study session')}${s.part > 1 ? ` · part ${s.part}` : ''}${s.fake ? ' · simulation' : ''}</div><div class="h-title">${esc(s.title)}</div>
        </div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <div class="plan" id="planInfo"></div>
      <div class="timer"><span class="dot"></span><span id="clock">0:00</span></div>
      <button class="btn ghost" id="breakBtn">Take a break</button>
      <button class="btn ghost" id="pauseBtn" title="Stop for now and continue this lesson later">Pause · continue later</button>
      <button class="btn primary" id="endBtn">Finish lesson</button>
    </div>
  </header>
  <main class="wrap row">
    <div class="grow">
      <section class="card hero-card" id="heroCard">
        <div id="ringBox">${ring(0, 'var(--accent)', 'attention')}</div>
        <div class="txt">
          <div class="chiprow"><span class="chip Focused" id="chip">Focused</span><span class="moodchip" id="moodChip" hidden></span></div>
          <h1 id="headline">…</h1>
          <p id="detail"></p>
        </div>
      </section>
      <section class="card breakbox" id="breakCard" hidden>
        <span class="chip break">On break</span>
        <div class="count" id="breakLeft">5:00</div>
        <p class="muted" style="margin:0">Stand up, look far away, drink water. Lumen is paused and will ring when the break is over.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
          <button class="btn ghost" id="breakMore">+5 min</button>
          <button class="btn primary" id="breakEnd">Back to lesson</button>
        </div>
      </section>
      <section class="card">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:14px">
          <h2 style="margin:0">Attention, last 20 minutes</h2>
          <span class="eyebrow">dashed line = break threshold</span>
        </div>
        <svg viewBox="0 0 600 140" width="100%" height="140" preserveAspectRatio="none" role="img" aria-label="Attention over the last 20 minutes">
          <line x1="0" y1="${135 - 65 * 1.25}" x2="600" y2="${135 - 65 * 1.25}" stroke="var(--line-2)" stroke-width="1.5" stroke-dasharray="6 6"/>
          <polyline id="spark" points="" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
        </svg>
        <div class="moodline" id="moodLine" aria-label="Mood over the last 20 minutes"></div>
        <div class="axis" style="margin-top:6px"><span id="sparkFrom">0:00</span><span class="muted small">lower strip: mood</span><span id="sparkTo">0:00</span></div>
      </section>
      <section class="signals">
        <div class="signal"><small>Eyes on screen</small><div class="v" id="sEyes">–</div><small id="nEyes">this session</small></div>
        <div class="signal"><small>Looked away</small><div class="v" id="sAway">0</div><small id="nAway">0:00 in total</small></div>
        <div class="signal"><small>Blinks per minute</small><div class="v" id="sBlink">–</div><small id="nBlink">measuring…</small></div>
        <div class="signal"><small>Tiredness</small><div class="v" id="sTired">Low</div><small id="nTired">eyes closed 0%</small></div>
        <div class="signal"><small>Phone pickups</small><div class="v" id="sPhone">0</div><small id="nPhone">none yet</small></div>
        <div class="signal" id="moodSig" title="Facial expression compared with your calm face. Lumen sees expressions, not feelings."><small>Mood</small><div class="v" id="sMood">–</div><small id="nMood">learning your face…</small></div>
        <div class="signal" id="postureSig" hidden><small>Posture</small><div class="v" id="sPost">Good</div><small id="nPost">sitting well</small></div>
      </section>
    </div>
    <aside class="side">
      <section class="card plancard" id="planCard">
        <div class="block-head" style="margin-bottom:10px"><h2 style="margin:0;font-size:16px">🎯 Session plan</h2><span class="muted small" id="planCount"></span></div>
        <ul class="checks" id="taskChecks"></ul>
        <form class="taskadd" id="liveTaskForm" style="margin-top:10px"><input class="field" id="liveTask" maxlength="120" placeholder="Add a task…" autocomplete="off" aria-label="New task"><button class="btn ghost">Add</button></form>
      </section>
      <section class="card stickies">
        <div class="block-head" style="margin-bottom:10px"><h2 style="margin:0;font-size:16px">📝 Sticky notes</h2><button class="btn ghost small-btn" id="addNote" type="button">+ Note</button></div>
        <div class="notegrid" id="noteGrid"></div>
      </section>
      <section class="card eyecard" id="eyeCard" hidden>
        <div class="t">${icon('check', 'var(--teal)', 18)}<span>Eye rest · 20-20-20</span></div>
        <div class="eyecount"><b id="eyeDone">0</b><span>/ 20 s</span></div>
        <div class="progress"><i id="eyeProg" style="background:var(--teal)"></i></div>
        <p class="muted small" style="margin:0">Look at something far away. Lumen counts only while you look away from the screen.</p>
      </section>
      <section class="card suggest" id="suggest" hidden>
        <div class="t"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" aria-hidden="true"><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><path d="M6 2v3M10 2v3M14 2v3"/></svg><span id="sugTitle">Break suggestion</span></div>
        <p id="sugText"></p>
        <div id="sugChooser">
          <div class="eyebrow" style="color:var(--accent-text);margin-bottom:8px">How long?</div>
          <div class="durations" id="durations" role="radiogroup" aria-label="Break length"></div>
        </div>
        <div class="btns"><button class="btn primary" id="sugYes">Start break</button><button class="btn ghost" id="sugNo">Not now</button></div>
      </section>
      <section class="card" style="display:flex;flex-direction:column;gap:12px">
        <h2 style="margin:0">Lost the thread?</h2>
        <p class="muted" style="margin:0;font-size:14px;line-height:1.5">Mark this moment as confusing. It goes to your lesson report so you can revisit it.</p>
        <button class="markbtn" id="markBtn">Mark as confusing · C</button>
        <form class="noteform" id="noteForm" hidden>
          <label class="eyebrow" for="noteText">What was confusing? (optional, Enter to save)</label>
          <input class="field" id="noteText" maxlength="300" placeholder="e.g. why det(AB) = det(A)·det(B)" autocomplete="off">
          <div class="btnrow"><button class="btn primary" type="submit">Save question</button><button class="btn ghost" type="button" id="noteSkip">Skip</button></div>
        </form>
        <div class="eyebrow">Marked so far: <strong id="marks" style="color:var(--text)">0</strong> · questions go to <a href="#/review">Review</a></div>
      </section>
      <section class="card" style="display:flex;align-items:center;justify-content:space-between;gap:14px">
        <div><h2 style="margin:0 0 4px">Taking notes?</h2>
          <div class="eyebrow">Looking down at a notebook won't count as distracted · N</div></div>
        <button class="switch" id="notesBtn" role="switch" aria-checked="false" aria-label="Notes mode"><span></span></button>
      </section>
      <section class="card cam">
        <div class="thumb" id="thumb">${s.fake ? '<span class="eyebrow">simulated</span>' : '<div class="camslot" id="camSlot" aria-label="Your camera preview"></div>'}</div>
        <div class="txt">The camera is analysed inside this browser. No video leaves your computer, only the attention numbers are saved.<br>
          ${s.fake ? '' : '<button class="linkbtn" id="hideCam">Hide preview</button>'}</div>
      </section>
    </aside>
  </main>
  <button class="ai-fab" id="aiFab" type="button" title="Ask the AI tutor about this lesson">${icon('ai', 'currentColor', 18)} Ask AI</button>`;

  // plan: add tasks during the lesson (they also go to the class to-do list)
  $('#liveTaskForm').onsubmit = async (e) => {
    e.preventDefault();
    const v = $('#liveTask').value.trim();
    if (!v) return;
    $('#liveTask').value = '';
    const res = await api('/api/task', { add: v }).catch(() => null);
    if (res && res.ok) drawTasks(res.tasks);
  };
  // sticky notes of this lesson (all its parts)
  api(`/api/notes?lesson=${encodeURIComponent(s.lesson_id)}`).then(({ notes }) => {
    const w = notesWidget($('#noteGrid'), notes, { editable: true, lesson_id: s.lesson_id });
    $('#addNote').onclick = () => w.add();
  }).catch(() => {});
  $('#aiFab').onclick = () => openAIPopup({ cls: s.class, lesson: s.title, lesson_id: s.lesson_id });

  const send = (type, extra = {}) => api('/api/action', { type, ...extra }).catch(() => {});
  $('#markBtn').onclick = () => {
    send('mark');
    $('#noteForm').hidden = false;
    $('#noteText').value = '';
    $('#noteText').focus();
  };
  const closeNote = () => { $('#noteForm').hidden = true; $('#noteText').blur(); };
  $('#noteForm').onsubmit = (e) => {
    e.preventDefault();
    const text = $('#noteText').value.trim();
    if (text) { send('mark_note', { text }); toast('Question saved. Lumen will ask you about it tomorrow.'); }
    else toast('Marked as confusing');
    closeNote();
  };
  $('#noteSkip').onclick = () => { toast('Marked as confusing'); closeNote(); };
  $('#noteText').onkeydown = (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeNote(); } };
  $('#breakEnd').onclick = () => { send('break_end'); toast('Welcome back'); };
  $('#breakMore').onclick = () => { send('break_extend', { minutes: 5 }); toast('+5 minutes'); };
  $('#breakBtn').onclick = () => { ui.manual = true; ui.chosen = ui.last.recommended || 5; render(ui.last); };
  $('#sugNo').onclick = () => {
    if (ui.manual) { ui.manual = false; render(ui.last); } else send('dismiss');
  };
  $('#sugYes').onclick = () => {
    const sug = ui.last.suggestion;
    if (!ui.manual && sug && sug.action === 'end') return endLesson();
    if (!ui.manual && sug && sug.action === 'eyes') { speakSoft('Look far away for twenty seconds.'); return send('eyes_start'); }
    ui.manual = false;
    send('break_start', { minutes: ui.chosen });
  };
  $('#notesBtn').onclick = () => send('notes', { on: !ui.last.notes_mode });
  $('#endBtn').onclick = () => endLesson(false);
  $('#pauseBtn').onclick = () => endLesson(true);
  const hide = $('#hideCam');
  if (hide) hide.onclick = () => { closeStreamPreview(); $('#thumb').innerHTML = '<span class="eyebrow">hidden</span>'; hide.remove(); };
  mountCamera($('#camSlot'));

  drawTasks(s.tasks || []);
  render(s);
  if (stream) stream.close();   // (keeps the camera preview)
  stream = new LumenEventSource();
  stream.onmessage = (ev) => {
    const d = JSON.parse(ev.data);
    if (d.ended) {
      closeStream();
      if (d.status === 'paused') { toast('Lesson paused. Continue it any time from Home.'); location.hash = '#/'; }
      else if (d.report) location.hash = `#/report/${d.report}`;
      return;
    }
    render(d);
  };
}

function renderDurations(options, recommended) {
  const box = $('#durations');
  const key = `${options}|${recommended}|${ui.chosen}`;
  if (box.dataset.key === key) return;          // unchanged: don't rebuild (keeps clicks reliable)
  box.dataset.key = key;
  box.innerHTML = options.map((m) => `<button class="dur${m === ui.chosen ? ' on' : ''}" role="radio" aria-checked="${m === ui.chosen}" data-m="${m}">
      <b>${m}</b> min${m === recommended ? '<small>recommended</small>' : ''}</button>`).join('');
  box.querySelectorAll('.dur').forEach((b) => {
    b.onclick = () => { ui.chosen = Number(b.dataset.m); renderDurations(options, recommended); updateYes(); };
  });
}
function updateYes() {
  const sug = ui.last.suggestion;
  const a = !ui.manual && sug ? sug.action : 'break';
  $('#sugYes').textContent = a === 'end' ? 'End and review' : a === 'eyes' ? 'Start 20 seconds' : `Start ${ui.chosen}-min break`;
}

function speakSoft(text) {
  try { const u = new SpeechSynthesisUtterance(text); u.rate = 1; window.speechSynthesis.speak(u); } catch { /* optional */ }
}

function render(d) {
  if (!$('#clock')) return;
  ui.last = d;
  $('#clock').textContent = mmss(d.elapsed);

  // break screen, and a ring when the break is over
  $('#heroCard').hidden = d.on_break;
  $('#breakCard').hidden = !d.on_break;
  $('#breakBtn').hidden = d.on_break;
  $('#breakLeft').textContent = mmss(d.break_left);
  if (d.break_ended) { notify('Break is over', 'Time to get back to your lesson.'); toast('Break is over. Welcome back!'); }
  if (d.on_break) ui.manual = false;

  // personal plan: next break and next eye rest
  const plan = [];
  if (d.rhythm && !d.on_break) plan.push(`⏱ ${d.rhythm.study}+${d.rhythm.break} · block ${d.block}`);
  if (!d.on_break) plan.push(d.next_break_in > 0 ? `break in ${d.rhythm ? '' : '~'}${d.next_break_in} min` : 'break due');
  if (!d.on_break && d.eyes_in != null && !d.eye_rest) plan.push(`eye rest ~${d.eyes_in} min`);
  $('#planInfo').textContent = plan.join(' · ');
  $('#planInfo').title = d.rhythm ? `Your rhythm: ${d.rhythm.study} min study, ${d.rhythm.break} min break`
    : `Automatic break plan: every ${d.plan_min} minutes, earlier if you get tired`;
  // mood: chip next to the state, badge on the camera, strip under the attention chart
  const mo = MOOD[d.mood];
  $('#moodChip').hidden = !mo;
  if (mo) $('#moodChip').textContent = `${mo[0]} ${mo[1]}`;
  const thumb = $('#thumb');
  if (thumb) {
    let badge = thumb.querySelector('.moodbadge');
    if (!badge) { badge = document.createElement('span'); badge.className = 'moodbadge'; thumb.appendChild(badge); }
    badge.textContent = mo ? mo[0] : '';
    badge.hidden = !mo;
  }
  const ml = d.mood_spark || [];
  const key = ml.join(',');
  if ($('#moodLine').dataset.key !== key) {
    $('#moodLine').dataset.key = key;
    $('#moodLine').innerHTML = Array.from({ length: 40 }, (_, i) => {
      const m = ml[i];
      return `<i style="background:${m ? MOOD[m][2] : 'var(--track)'};opacity:${i < ml.length ? 1 : 0.35}" title="${m ? MOOD[m][1] : ''}"></i>`;
    }).join('');
  }

  // 20-20-20 eye rest in progress
  $('#eyeCard').hidden = !d.eye_rest;
  if (d.eye_rest) {
    $('#eyeDone').textContent = d.eye_rest.done;
    $('#eyeProg').style.width = `${Math.min(100, 100 * d.eye_rest.done / d.eye_rest.needed)}%`;
  }
  if (d.eye_rest_result === 'done') { chime(); toast('Eyes rested. Back to the lesson!'); speakSoft('Done. Back to the lesson.'); }
  if (d.eye_rest_result === 'timeout') toast('Eye rest skipped. Lumen will ask again in 5 minutes.');

  // mood (facial expression)
  const mood = MOOD[d.mood];
  $('#sMood').textContent = mood ? mood[0] : '–';
  $('#nMood').textContent = mood ? mood[1] : d.on_break ? 'on a break' : d.calibrating ? 'learning your face…' : 'face not readable';

  // posture
  $('#postureSig').hidden = !d.posture;
  if (d.posture) {
    $('#sPost').textContent = d.posture;
    $('#sPost').style.color = d.posture === 'Good' ? '' : 'var(--accent)';
    $('#nPost').textContent = d.posture === 'Good' ? 'sitting well' : d.posture === 'Leaning in' ? 'too close to the screen' : 'head lower than usual';
  }
  if (d.blink_nudge) {
    notify('Remember to blink', 'You have been blinking much less than usual. Blink slowly a few times.');
    toast('👀 Remember to blink: a few slow blinks keep your eyes moist.');
  }
  if (d.posture_alert) {
    const tip = d.posture_alert === 'Leaning in' ? 'You have been leaning towards the screen for a minute. Sit back a little.'
      : 'You have been slouching for a minute. Straighten your back and lift your head.';
    notify('Posture check', tip);
    toast(tip);
  }

  const ringColor = d.attention >= 70 ? 'var(--accent)' : d.attention >= 40 ? 'var(--drift)' : 'var(--coral)';
  const val = $('#ringBox circle.val');
  val.setAttribute('stroke-dasharray', `${(C * d.attention / 100).toFixed(1)} ${C.toFixed(1)}`);
  val.setAttribute('stroke', ringColor);
  $('#ringBox text.num').textContent = d.attention;

  const chip = $('#chip');
  chip.className = `chip ${d.calibrating ? 'break' : d.state}`;
  chip.textContent = d.calibrating ? 'Calibrating' : d.state;
  $('#headline').textContent = d.headline;
  $('#detail').textContent = d.detail;

  const pts = d.spark.map((v, i) => (v == null ? null : `${(i / 39 * 600).toFixed(1)},${(135 - v * 1.25).toFixed(1)}`)).filter(Boolean);
  $('#spark').setAttribute('points', pts.join(' '));
  $('#sparkFrom').textContent = d.spark_from;
  $('#sparkTo').textContent = d.spark_to;

  $('#sEyes').textContent = `${d.eyes_on}%`;
  $('#nEyes').textContent = d.eyes_on >= 80 ? 'steady' : 'often looking away';
  $('#nEyes').style.color = d.eyes_on >= 80 ? 'var(--teal)' : 'var(--accent)';
  $('#sAway').textContent = d.away_count;
  $('#nAway').textContent = `${d.away_total} in total`;
  $('#sBlink').textContent = d.blink_rate ?? '–';
  const nb = $('#nBlink');
  if (d.blink_rate == null) { nb.textContent = 'measuring…'; nb.style.color = ''; }
  else if (d.blink_base != null && d.blink_rate > d.blink_base * 1.3) { nb.textContent = `rising, usually ${d.blink_base}`; nb.style.color = 'var(--accent)'; }
  else { nb.textContent = d.blink_base != null ? `normal for you (${d.blink_base})` : 'learning your normal…'; nb.style.color = ''; }
  const f = d.fatigue;
  $('#sTired').textContent = f.level;
  $('#sTired').style.color = f.level === 'High' ? 'var(--coral)' : f.level === 'Medium' ? 'var(--accent)' : '';
  $('#nTired').textContent = `eyes closed ${f.perclos}% · ${d.yawns} yawn${d.yawns === 1 ? '' : 's'}`;
  $('#sPhone').textContent = d.pickups;
  $('#nPhone').textContent = d.last_pickup ? `last at ${d.last_pickup}` : 'none yet';
  $('#nPhone').style.color = d.last_pickup ? 'var(--coral)' : '';
  $('#marks').textContent = d.marks;

  const nbtn = $('#notesBtn');
  nbtn.setAttribute('aria-checked', String(d.notes_mode));
  nbtn.classList.toggle('on', d.notes_mode);

  // suggestion card: from the server, or opened by "Take a break"
  const sug = d.suggestion;
  const show = !d.on_break && (ui.manual || !!sug);
  $('#suggest').hidden = !show;
  if (!show) { ui.sugKey = null; return setTitle(d); }

  if (ui.manual) {
    $('#sugTitle').textContent = 'Take a break';
    $('#sugText').textContent = d.fatigue.level !== 'Low'
      ? `Good idea: Lumen sees ${d.fatigue.level.toLowerCase()} tiredness. Lumen will pause and ring when the break is over.`
      : 'Lumen will pause and ring when the break is over.';
    $('#sugChooser').hidden = false;
    $('#sugNo').textContent = 'Cancel';
    renderDurations(d.options, d.recommended);
  } else {
    const key = `${sug.kind}|${sug.text}`;
    if (key !== ui.sugKey) {                 // a new suggestion just arrived
      ui.sugKey = key;
      ui.chosen = sug.minutes || 5;
      notify(sug.title, sug.text);
    }
    $('#sugTitle').textContent = sug.title;
    $('#sugText').textContent = sug.text + (sug.at_pause && sug.waited > 3 ? ' (Lumen waited for a pause so it wouldn\'t interrupt you.)' : '');
    $('#sugChooser').hidden = sug.action !== 'break';
    $('#sugNo').textContent = sug.action === 'end' ? 'Keep going' : 'Not now';
    if (sug.action === 'break') renderDurations(sug.options || d.options, sug.minutes);
  }
  updateYes();
  setTitle(d);
}

function setTitle(d) {
  document.title = d.on_break ? `Break ${mmss(d.break_left)} · Lumen`
    : d.suggestion ? '● Break? · Lumen' : `${d.attention} · ${d.state} · Lumen`;
}

// ---- session plan: tick tasks as you do them
let tasksState = [];
function drawTasks(tasks) {
  tasksState = tasks.map((t) => ({ ...t }));
  const ul = $('#taskChecks');
  ul.innerHTML = tasksState.map((t, i) => `<li><label><input type="checkbox" data-task="${i}" ${t.done ? 'checked' : ''}>
      <span class="box" aria-hidden="true"></span><span class="txt">${esc(t.text)}</span></label></li>`).join('');
  ul.querySelectorAll('[data-task]').forEach((cb) => {
    cb.onchange = () => {
      const i = Number(cb.dataset.task);
      tasksState[i].done = cb.checked;
      api('/api/task', { index: i, done: cb.checked }).catch(() => {});
      countTasks();
      if (cb.checked && tasksState.every((t) => t.done)) { chime(); toast('🎯 Whole plan done! Great work.'); }
    };
  });
  countTasks();
}
function countTasks() {
  const n = tasksState.filter((t) => t.done).length;
  $('#planCount').textContent = tasksState.length ? `${n} of ${tasksState.length} done` : 'no tasks yet';
}

// "Finish lesson" with a plan: tick what you did, then save
function askTasks() {
  return new Promise((resolve) => {
    const box = document.createElement('div');
    box.className = 'modal-wrap';
    box.innerHTML = `<div class="modal card" role="dialog" aria-modal="true" aria-labelledby="mTitle">
      <div class="eyebrow">🎯 Session plan</div>
      <h2 id="mTitle">What did you get done?</h2>
      <ul class="checks">${tasksState.map((t, i) => `<li><label><input type="checkbox" data-m="${i}" ${t.done ? 'checked' : ''}>
        <span class="box" aria-hidden="true"></span><span class="txt">${esc(t.text)}</span></label></li>`).join('')}</ul>
      <div class="btnrow" style="margin-top:8px"><button class="btn primary" data-o="save">Save and finish</button>
        <button class="btn ghost" data-o="cancel">Back to the lesson</button></div></div>`;
    document.body.appendChild(box);
    box.querySelector('[data-o="save"]').focus();
    box.querySelector('[data-o="save"]').onclick = () => {
      const flags = [...box.querySelectorAll('[data-m]')].map((cb) => cb.checked);
      box.remove();
      resolve(flags);
    };
    box.querySelector('[data-o="cancel"]').onclick = () => { box.remove(); resolve(null); };
  });
}

async function endLesson(pause) {
  let done = null;
  if (!pause && tasksState.length) {
    done = await askTasks();
    if (done === null) return;               // back to the lesson
  }
  const btn = $(pause ? '#pauseBtn' : '#endBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
  closeStream();
  try {
    const rep = await api('/api/end', { pause, done });
    if (rep.discarded) { toast('Too short to save (under 20 seconds).'); location.hash = '#/'; return; }
    if (pause) { toast('Paused. Continue this lesson any time from Home.'); location.hash = '#/'; return; }
    location.hash = `#/report/${rep.id}`;
  } catch {
    location.hash = '#/';
  }
}


