// insights.js: the Progress page (statistics + weekly report in one place) and the accuracy check results.
// Each page shows a short summary first; every tile opens a detail page with an explanation (i) and a back arrow.
'use strict';

// ---------------------------------------------------------------- explanations behind every (i)
const INFO = {
  // Progress
  focused: ['Focused time', 'Minutes in which you were really with the lesson (attention 70% or more). <br><b>Why:</b> studying 2 hours while drifting teaches less than 1 focused hour, so this is the number to grow.'],
  studied: ['Studied time', 'All the time a lesson was running, focused or not.'],
  attention: ['Average attention', 'How much of the time your eyes and head were on the lesson, 0–100%. Looking away, the phone and closed eyes lower it. <br><b>Why:</b> one number to compare lessons and weeks.'],
  streak: ['Day streak 🔥', 'Days in a row on which you studied at least the minimum from Settings (10 min by default). <br><b>Why:</b> studying a little every day beats a lot once a week.'],
  week: ['This week', 'The last 7 days compared with the 7 days before: is your focused time growing? <br><b>Why:</b> one week is noisy, but the trend shows whether your habits work.'],
  days: ['Last 14 days', 'Each bar is one day. Grey = time studied, green part = time focused. <br><b>Why:</b> you see which days you studied and how well, at a glance.'],
  time: ['Best time of day', 'Your average attention in the morning, afternoon, evening and night. ★ = your best. <br><b>Why:</b> plan hard subjects for the time your brain works best.'],
  classes: ['Classes', 'How much time each class took, and how much of it you were focused. <br><b>Why:</b> find the subjects where you drift most.'],
  mood: ['Mood', 'Share of time with each facial expression during lessons (calm, happy, frowning…). <br><b>Note:</b> Lumen reads expressions, not feelings: a frown often just means "this is hard".'],
  learned: ['What Lumen learned', 'Personal tips found in all your lessons: when attention drops, how often the phone comes out, which breaks helped.'],
  tasks: ['Plan tasks', 'Tasks you planned before lessons and ticked as done. <br><b>Why:</b> attention is a means; finishing what you planned is the goal.'],
  phoneh: ['Phone pickups / hour', 'How often the phone came out per hour of study. Lower is better.'],
  // Accuracy check
  accuracy: ['Accuracy', 'Share of ALL moments where Lumen guessed right what you were doing. <br><b>Careful:</b> most of the check you look at the screen, so a lazy Lumen that always says "on screen" would still score high. That is why there is a second number.'],
  balanced: ['Balanced accuracy', 'The average over the 5 situations (on screen, looking away, phone, eyes closed, not in frame), each counting the same. <br><b>Why:</b> it is the honest number: a situation Lumen is bad at pulls it down even if that situation is short.'],
  yawn: ['Yawn', 'Did Lumen notice the "open your mouth wide" step? Yawns are one of the signs of tiredness.'],
  moments: ['Moments', 'Lumen looks at the camera about 10–15 times a second; each look is a "moment". The first 2.5 s of every step are not counted: you need time to hear the instruction and react.'],
  steps: ['Step by step', 'How often Lumen was right during each instruction of the check. <br>🟢 90%+ reliable · 🟡 60–89% · 🔴 below 60%, with what Lumen confused it with. <br><b>Why:</b> shows exactly which action is hard to recognise.'],
  matrix: ['Confusion matrix', '<b>Rows</b> = what you were really doing. <b>Columns</b> = what Lumen thought. <br>The green diagonal = right answers. Red cells = mix-ups, e.g. row "Looking away", column "On screen" = moments Lumen missed. <br><b>Why:</b> shows not only how often Lumen is wrong, but WHAT it confuses.'],
  recall: ['Recall — "did it catch it?"', 'Of all the times something REALLY happened (you really looked away), how many did Lumen notice? <br>Low recall = Lumen misses things.'],
  precision: ['Precision — "can I trust it?"', 'Of all the times Lumen SAID something ("you looked away"), how often was it true? <br>Low precision = false alarms, which annoy users most.'],
  measured: ['What the camera measured', 'The raw numbers behind every decision: for each step, the typical (median) value of each measurement, compared with your normal position from the first 15 seconds (0 = normal). <br><b>Amber</b> = beyond the limit, so Lumen says "looking away". <br><b>Why:</b> it explains WHY a step went wrong.'],
  tune: ['Tune Lumen to you', 'Everybody sits, looks and blinks differently. From this check Lumen suggests personal limits that keep false alarms under 3% while catching as many real look-aways as possible. <br><b>After applying, run the check again:</b> limits learned from this run always look good on this same run (that is called overfitting).'],
  c_truth: ['Truth', 'What the instruction asked you to do: the right answer for this step.'],
  c_face: ['Face seen', 'In how many moments of the step the camera found your face.'],
  c_yaw: ['Head turn (degrees)', 'How far your head turned left or right from your normal position. Above the limit = looking away.'],
  c_pitch: ['Head tilt (degrees)', 'How far your head tilted up or down from your normal position.'],
  c_gx: ['Eyes side', 'How far your pupils moved left or right inside the eye, while the head can stay still.'],
  c_gy: ['Eyes up/down', 'How far your pupils moved up or down. Ignored when the eyes are almost closed (the pupil is hidden, the number is noise).'],
  c_ear: ['Eyes open', 'How open your eyes were compared with your normal (100%). Below your "eyes closed" limit (65% by default) = closed. Looking down lowers it too: the eyelids follow the eyes.'],
  c_phone: ['Phone', 'In how many moments the phone detector saw a phone.'],
};

// ---------------------------------------------------------------- small building blocks
const tile = (href, icon, title, infoKey, value, hint, extra = '') => `
  <a class="tile card" href="${href}">
    <div class="tile-top"><span class="tile-ic">${icon}</span><span class="tile-t">${title}</span>${info(infoKey, title)}<span class="tile-go">›</span></div>
    <div class="tile-v">${value}</div>
    <div class="tile-h">${hint}</div>${extra}
  </a>`;
const explain = (key) => `<div class="explain"><b>${INFO[key][0]}</b><div>${INFO[key][1]}</div></div>`;
const kpi = (label, key, value, sub = '') => `<div class="card"><span class="eyebrow">${label} ${info(key, label)}</span><b>${value}</b><span class="eyebrow">${sub}</span></div>`;
const deltaTxt = (a, b, unit = '', better = 'up') => {
  if (a == null || b == null || b === 0) return '<span class="muted small">no data last week</span>';
  const diff = a - b, good = better === 'up' ? diff >= 0 : diff <= 0;
  return `<span class="small" style="color:${good ? 'var(--teal)' : 'var(--coral)'}">${diff >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(diff * 10) / 10)}${unit} vs last week</span>`;
};

// ---------------------------------------------------------------- Progress (was: Statistics + Weekly report)
async function viewProgress(sub = '') {
  closeStream();
  const [d, w] = await Promise.all([loadOverview(), api('/api/week')]);
  const t = d.totals, tw = w.this, pw = w.prev;
  const back = '#/stats';
  const maxClass = Math.max(1, ...d.classes.map((c) => c.study_min));
  const best = d.time_of_day.find((x) => x.name === d.best_time);
  const it = d.intentions;

  if (!t.sessions) {
    app.innerHTML = shell('stats', `${pageHead('Your progress', 'Progress')}
      <main class="wrap"><p class="empty">Your progress appears after your first lesson. 🌱</p></main>`);
    return;
  }

  const pages = {
    week: () => [`${esc(w.from)} – ${esc(w.to)}`, 'This week', `
      ${explain('week')}
      <section class="card weekhero">
        <div><div class="eyebrow">Focused study this week ${info('focused', 'focused time')}</div>
          <div class="display huge">${hm(tw.focused_min)}</div>
          <div>${w.change_pct == null ? '<span class="muted small">First week with data</span>'
            : `<span style="color:${w.change_pct >= 0 ? 'var(--teal)' : 'var(--coral)'}">${w.change_pct >= 0 ? '▲' : '▼'} ${Math.abs(w.change_pct)}%</span> <span class="muted small">vs last week (${hm(pw.focused_min)})</span>`}</div></div>
        <div class="weekkpis">
          <div><b>${hm(tw.study_min)}</b><span>studied</span>${deltaTxt(tw.study_min, pw.study_min, ' min')}</div>
          <div><b>${tw.avg ?? '–'}${tw.avg != null ? '%' : ''}</b><span>average attention</span>${deltaTxt(tw.avg, pw.avg, ' pts')}</div>
          <div><b>${tw.sessions}</b><span>lessons</span></div>
          <div><b>${tw.pickups_h ?? '–'}</b><span>phone pickups / hour</span>${deltaTxt(tw.pickups_h, pw.pickups_h, '', 'down')}</div>
        </div>
      </section>
      <section class="card"><h2 class="display" style="font-size:20px">Day by day</h2>${dayBars(w.days, 160)}
        <p class="muted small" style="margin:12px 0 0">${w.best_day ? `Best day: <strong>${esc(w.best_day.label)} ${esc(w.best_day.date)}</strong>, ${hm(w.best_day.focused_min)} focused.` : ''}</p></section>
      <section class="stats">
        <div class="card"><span class="eyebrow">Questions written</span><b>${w.questions_new}</b><span class="eyebrow">${w.reviews_understood} understood on review</span></div>
        <div class="card"><span class="eyebrow">Eye rests</span><b>${tw.eye_rests}</b><span class="eyebrow">20-20-20</span></div>
        <div class="card"><span class="eyebrow">Posture reminders</span><b>${tw.posture_alerts}</b>${deltaTxt(tw.posture_alerts, pw.posture_alerts, '', 'down')}</div>
        <div class="card"><span class="eyebrow">Longest focus</span><b>${tw.longest_focus} min</b>${deltaTxt(tw.longest_focus, pw.longest_focus, ' min')}</div>
      </section>
      <button class="btn ghost" id="printBtn" style="align-self:flex-start">Save as PDF</button>`],
    days: () => ['Two weeks', 'Last 14 days', `${explain('days')}
      <section class="card"><div class="block-head"><span></span>
        <div class="legend"><span><i style="background:var(--bar)"></i>studied</span><span><i style="background:var(--teal)"></i>focused</span></div></div>
        ${dayBars(d.days, 220)}</section>`],
    time: () => ['When you focus best', 'Best time of day', `${explain('time')}
      <section class="card">${hbars(d.time_of_day.map((x) => ({ label: x.name, pct: x.avg ?? 0, color: attColor(x.avg),
        value: x.avg == null ? '–' : `${x.avg}%${x.name === d.best_time ? ' ★' : ''}` })))}
        <p class="muted small" style="margin:14px 0 0">Based on ${d.time_of_day.reduce((a, x) => a + x.minutes, 0)} minutes of lessons. A part of the day needs at least 10 minutes to be compared.</p></section>`],
    classes: () => ['Time and focus per class', 'Classes', `${explain('classes')}
      <section class="card"><p class="muted small" style="margin:0 0 14px">Bar = time studied. Number = share of it you were focused.</p>
        ${hbars(d.classes.map((c) => ({ label: esc(c.name), pct: 100 * c.study_min / maxClass,
          value: `${c.study_min ? Math.round(100 * c.focused_min / c.study_min) : 0}%`, color: 'var(--accent)' })))}</section>`],
    mood: () => ['Facial expressions', 'Mood', `${explain('mood')}${d.mood ? moodCard(d.mood, 'Mood while studying') : '<p class="empty">No mood data yet.</p>'}`],
    learned: () => ['Personal tips', 'What Lumen learned', `${explain('learned')}
      <div class="grid2">${d.insights.map((x) => `<div class="note">${x}</div>`).join('')}</div>`],
  };

  if (pages[sub]) {
    const [eyebrow, title, body] = pages[sub]();
    app.innerHTML = shell('stats', `${pageHead(eyebrow, title, '', back)}
      <main class="wrap detail" style="display:flex;flex-direction:column;gap:20px">${body}</main>`);
    if ($('#printBtn')) $('#printBtn').onclick = () => window.print();
    return;
  }

  const mainMood = d.mood ? Object.keys(d.mood).sort((a, b) => d.mood[b] - d.mood[a])[0] : null;
  const last7 = w.days.map((x) => x.focused_min);
  const max7 = Math.max(1, ...last7);
  app.innerHTML = shell('stats', `
  ${pageHead(`${t.sessions} lessons · ${hm(t.all_study)} studied`, 'Progress')}
  <main class="wrap" style="display:flex;flex-direction:column;gap:20px">
    <section class="card prog-hero">
      <div>
        <div class="eyebrow">Focused this week ${info('focused', 'focused time')}</div>
        <div class="display huge">${hm(tw.focused_min)}</div>
        <div>${w.change_pct == null ? '<span class="muted small">first week with data</span>'
          : `<span style="color:${w.change_pct >= 0 ? 'var(--teal)' : 'var(--coral)'}">${w.change_pct >= 0 ? '▲' : '▼'} ${Math.abs(w.change_pct)}%</span> <span class="muted small">vs last week</span>`}</div>
      </div>
      <div class="hero-kpis">
        <div><b>${t.week_avg ?? '–'}${t.week_avg != null ? '%' : ''}</b><span>attention ${info('attention', 'attention')}</span></div>
        <div><b>${d.goal.streak} 🔥</b><span>day streak ${info('streak', 'streak')}</span></div>
        <div><b>${it.tasks_total ? `${Math.round(100 * it.tasks_done / it.tasks_total)}%` : '–'}</b><span>tasks done ${info('tasks', 'tasks')}</span></div>
      </div>
    </section>
    <div class="tiles">
      ${tile('#/stats/week', '📅', 'This week', 'week', hm(tw.focused_min), `${tw.sessions} lessons · ${hm(tw.study_min)} studied`,
        `<div class="mini-bars">${last7.map((v) => `<i style="height:${Math.max(4, (100 * v) / max7)}%"></i>`).join('')}</div>`)}
      ${tile('#/stats/days', '📈', 'Last 14 days', 'days', `${hm(d.days.reduce((a, x) => a + x.focused_min, 0))}`, 'focused in two weeks')}
      ${tile('#/stats/time', '🕐', 'Best time of day', 'time', best ? `${best.name}` : '–', best ? `average attention ${best.avg}%` : 'needs 10+ minutes in a part of the day')}
      ${tile('#/stats/classes', '📚', 'Classes', 'classes', `${d.classes.length}`, d.classes[0] ? `most recent: ${esc(d.classes[0].name)}` : '')}
      ${tile('#/stats/mood', '😊', 'Mood', 'mood', mainMood ? `${MOOD[mainMood][0]} ${MOOD[mainMood][1]}` : '–', mainMood ? `mostly, ${d.mood[mainMood]}% of the time` : 'no data yet')}
      ${tile('#/stats/learned', '💡', 'What Lumen learned', 'learned', `${d.insights.length} tips`, d.insights[0] ? d.insights[0].replace(/<[^>]+>/g, '').slice(0, 70) + '…' : '')}
    </div>
  </main>`);
}

// ---------------------------------------------------------------- Accuracy check results
const CHECK_LABEL = { on: 'On screen', away: 'Looking away', phone: 'Phone', closed: 'Eyes closed', absent: 'Not in frame' };

async function viewCheckResult(id, sub = '') {
  closeStream();
  let r;
  try { r = await api(`/api/checks/${encodeURIComponent(id)}`); } catch { location.hash = '#/check'; return; }
  const prof = (await api('/api/profile')).profile;
  // the check before this one, to compare with
  const { checks } = await api('/api/checks');
  const older = checks.filter((c) => c.started_at < r.started_at);
  const prev = older.length ? await api(`/api/checks/${encodeURIComponent(older[0].id)}`).catch(() => null) : null;
  const t = r.tuning;
  const back = `#/check/${encodeURIComponent(id)}`;
  const shortDate = (ts) => new Date(ts * 1000).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const arrow = (diff, unit = '') => (diff == null ? '<span class="muted">–</span>' : diff === 0 ? '<span class="muted">same</span>'
    : `<span style="color:${diff > 0 ? 'var(--teal)' : 'var(--coral)'}">${diff > 0 ? '▲' : '▼'} ${Math.abs(diff)}${unit}</span>`);
  const prevStep = (text) => (prev ? (prev.per_step.find((s) => s.text === text) || {}).acc : undefined);
  const prevClass = (cls) => (prev ? (prev.per_class.find((c) => c.cls === cls) || {}).recall : undefined);
  const stepChanges = prev ? r.per_step.map((s) => ({ text: s.text, now: s.acc, before: prevStep(s.text) }))
    .filter((x) => x.before != null).map((x) => ({ ...x, diff: x.now - x.before })) : [];
  const bestUp = stepChanges.slice().sort((a, b) => b.diff - a.diff)[0];
  const worstDown = stepChanges.slice().sort((a, b) => a.diff - b.diff)[0];
  const when = new Date(r.started_at * 1000).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const rowSum = r.confusion.map((row) => row.reduce((a, b) => a + b, 0));

  // the biggest mix-up (largest off-diagonal share)
  let mix = null;
  r.confusion.forEach((row, i) => row.forEach((v, j) => {
    if (i !== j && rowSum[i]) { const f = v / rowSum[i]; if (!mix || f > mix.f) mix = { f, from: r.labels[i], to: r.labels[j] }; }
  }));
  const weakest = r.per_class.filter((c) => c.recall != null).sort((a, b) => a.recall - b.recall)[0];
  const reliable = r.per_step.filter((s) => s.acc >= 90).length;
  const worst = r.per_step.slice().sort((a, b) => a.acc - b.acc).slice(0, 2);
  const overCount = (r.diagnostics || []).reduce((a, dg) => a + ['yaw', 'pitch', 'gx', 'gy'].filter((k) => dg[`${k}_over`]).length, 0);

  const cell = (v, i, j) => {
    const f = rowSum[i] ? v / rowSum[i] : 0;
    const bg = v === 0 ? 'transparent' : i === j ? `color-mix(in srgb, var(--teal) ${Math.round(15 + 60 * f)}%, transparent)` : `color-mix(in srgb, var(--coral) ${Math.round(15 + 60 * f)}%, transparent)`;
    return `<td style="background:${bg}">${v ? `${Math.round(f * 100)}%` : '·'}</td>`;
  };

  const pages = {
    compare: () => ['Accuracy check', 'Compared with the previous check', prev ? `
      <div class="explain"><b>Why compare?</b><div>The only honest way to know if new settings (or better light, another seat) helped: run the check again and compare with the run before. <br>
        Previous: <b>${esc(shortDate(prev.started_at))}</b> (${prev.profile_used && Object.keys(prev.profile_used).length ? 'personal' : 'default'} settings) → this one: <b>${esc(shortDate(r.started_at))}</b> (${r.profile_used && Object.keys(r.profile_used).length ? 'personal' : 'default'} settings).</div></div>
      <section class="stats">
        <div class="card"><span class="eyebrow">Balanced accuracy ${info('balanced')}</span><b>${prev.balanced_accuracy}% → ${r.balanced_accuracy}%</b><span class="eyebrow">${arrow(r.balanced_accuracy - prev.balanced_accuracy, ' pts')}</span></div>
        <div class="card"><span class="eyebrow">Accuracy ${info('accuracy')}</span><b>${prev.accuracy}% → ${r.accuracy}%</b><span class="eyebrow">${arrow(r.accuracy - prev.accuracy, ' pts')}</span></div>
      </section>
      <section class="card" style="overflow-x:auto"><h2 class="display" style="font-size:18px">Each situation: recall ${info('recall', 'recall')}</h2>
        <table class="cm cmp"><tr><th></th><th>before</th><th>now</th><th>change</th></tr>
        ${r.per_class.map((c) => { const b = prevClass(c.cls); return `<tr><th>${esc(c.label)}</th><td>${b ?? '–'}${b != null ? '%' : ''}</td><td>${c.recall ?? '–'}${c.recall != null ? '%' : ''}</td>
          <td>${b != null && c.recall != null ? arrow(c.recall - b, ' pts') : '–'}</td></tr>`; }).join('')}</table></section>
      <section class="card" style="overflow-x:auto"><h2 class="display" style="font-size:18px">Each step ${info('steps', 'steps')}</h2>
        <table class="cm cmp"><tr><th>step</th><th>before</th><th>now</th><th>change</th></tr>
        ${stepChanges.map((x) => `<tr><th>${esc(x.text)}</th><td>${x.before}%</td><td>${x.now}%</td><td>${arrow(x.diff, ' pts')}</td></tr>`).join('')}</table></section>`
      : '<p class="empty">This is your first check: run another one to compare.</p>'],
    steps: () => ['Accuracy check', 'Step by step', `${explain('steps')}
      <section class="card"><div class="list">
        ${r.per_step.map((p) => `<div class="steprow">
          <div class="x"><div>${esc(p.text)}</div><div>${p.acc >= 90 ? 'reliable' : p.mistake ? `often seen as: ${esc(p.mistake)}` : ''}</div></div>
          <div class="bar"><i style="width:${p.acc}%;background:${p.acc >= 90 ? 'var(--teal)' : p.acc >= 60 ? 'var(--accent)' : 'var(--coral)'}"></i></div>
          <b>${p.acc}%</b></div>`).join('')}
      </div></section>`],
    matrix: () => ['Accuracy check', 'Confusion matrix', `${explain('matrix')}
      <section class="card" style="overflow-x:auto"><table class="cm">
        <tr><th>truth \\ Lumen</th>${r.labels.map((l) => `<th>${esc(l)}</th>`).join('')}</tr>
        ${r.confusion.map((row, i) => `<tr><th>${esc(r.labels[i])}</th>${row.map((v, j) => cell(v, i, j)).join('')}</tr>`).join('')}
      </table>
      ${mix && mix.f > 0.05 ? `<p class="muted small" style="margin:14px 0 0">Biggest mix-up: when you were <b>${esc(mix.from)}</b>, Lumen thought <b>${esc(mix.to)}</b> in ${Math.round(mix.f * 100)}% of the moments.</p>` : ''}</section>`],
    pr: () => ['Accuracy check', 'Precision and recall', `${explain('recall')}${explain('precision')}
      <section class="card"><table class="cm pr">
        <tr><th></th><th>recall ${info('recall', 'recall')}</th><th>precision ${info('precision', 'precision')}</th></tr>
        ${r.per_class.map((c) => `<tr><th>${esc(c.label)}</th><td>${c.recall ?? '–'}${c.recall != null ? '%' : ''}</td><td>${c.precision ?? '–'}${c.precision != null ? '%' : ''}</td></tr>`).join('')}
      </table>
      <p class="muted small" style="margin:14px 0 0">Example: a teacher looks for phones. Recall = of the pupils who really had a phone, how many did he catch? Precision = of the pupils he pointed at, how many really had one?</p></section>`],
    measured: () => ['Accuracy check', 'What the camera measured', `${explain('measured')}
      <section class="card" style="overflow-x:auto"><table class="cm diag">
        <tr><th>step</th><th>truth ${info('c_truth')}</th><th>face seen ${info('c_face')}</th>
          <th>head turn° ${info('c_yaw')}<br><small>limit ${r.limits.yaw}</small></th><th>head tilt° ${info('c_pitch')}<br><small>limit ${r.limits.pitch}</small></th>
          <th>eyes side ${info('c_gx')}<br><small>limit ${r.limits.gx}</small></th><th>eyes up/down ${info('c_gy')}<br><small>limit ${r.limits.gy}</small></th>
          <th>eyes open ${info('c_ear')}</th><th>phone ${info('c_phone')}</th></tr>
        ${(r.diagnostics || []).map((dg) => `<tr><th>${esc(dg.text)}</th><td>${esc(dg.expected)}</td><td>${dg.face}%</td>
          ${['yaw', 'pitch', 'gx', 'gy'].map((k) => `<td class="${dg[`${k}_over`] ? 'over' : ''}">${dg[k] ?? '–'}</td>`).join('')}
          <td>${dg.ear ?? '–'}${dg.ear != null ? '%' : ''}</td><td>${dg.phone}%</td></tr>`).join('')}
      </table>
      ${r.csv ? '<button class="linkbtn" id="csvBtn" style="margin-top:14px">Download the raw data (CSV)</button>' : ''}</section>`],
  };

  if (pages[sub]) {
    const [eyebrow, title, body] = pages[sub]();
    app.innerHTML = shell('check', `${pageHead(`${eyebrow} · ${esc(when)}`, title, '', back)}
      <main class="wrap detail" style="display:flex;flex-direction:column;gap:20px">${body}</main>`);
    const cb = $('#csvBtn');
    if (cb) cb.onclick = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([r.csv], { type: 'text/csv' }));
      a.download = `lumen-check-${r.id}.csv`;
      a.click();
    };
    return;
  }

  const fmt = (k, v) => (k === 'closed' ? v : `×${v}`);
  const names = { side: 'Left / right limit', vert: 'Up / down limit', closed: 'Eyes-closed limit' };
  const applied = prof && JSON.stringify(prof) === JSON.stringify(t.suggested);
  app.innerHTML = shell('check', `
  ${pageHead(`Accuracy check · ${esc(when)}${r.profile_used && Object.keys(r.profile_used).length ? ' · personal settings' : ' · default settings'}`,
    'How accurate is Lumen for you?', '<a class="btn primary" href="#/check">Run again</a>', '#/check')}
  <main class="wrap" style="display:flex;flex-direction:column;gap:20px">
    <section class="stats">
      ${kpi('Balanced accuracy', 'balanced', `${r.balanced_accuracy}%`, 'the honest score: 5 situations equally')}
      ${kpi('Accuracy', 'accuracy', `${r.accuracy}%`, `of ${r.n} moments ${info('moments', 'moments')}`)}
      ${kpi('Yawn', 'yawn', r.yawn_detected ? 'Seen' : 'Missed', 'open mouth wide step')}
    </section>
    <section class="card inshort">
      <h2 class="display" style="font-size:18px;margin:0 0 10px">In short</h2>
      <p>✅ <b>${reliable} of ${r.per_step.length}</b> steps were recognised reliably (90%+).</p>
      ${worst.filter((s) => s.acc < 90).map((s) => `<p>⚠️ <b>${esc(s.text.replace(/\.$/, ''))}</b>: ${s.acc}%${s.mistake ? `, often seen as “${esc(s.mistake)}”` : ''}.</p>`).join('')}
      ${t.changed ? '<p>🎯 Lumen found personal limits that should fit you better (below).</p>' : '<p>🎯 Your current limits already fit you well.</p>'}
    </section>
    ${prev ? `<section class="card cmpcard">
      <div class="block-head"><h2 class="display" style="font-size:18px;margin:0">Compared with your previous check</h2>
        <a class="more" href="${back}/compare">Details ›</a></div>
      <div class="cmp-row">
        <div><span class="eyebrow">Balanced accuracy</span><b>${prev.balanced_accuracy}% → ${r.balanced_accuracy}%</b>${arrow(r.balanced_accuracy - prev.balanced_accuracy, ' pts')}</div>
        ${bestUp && bestUp.diff > 0 ? `<div><span class="eyebrow">Improved most</span><b class="small-b">${esc(bestUp.text.replace(/\.$/, ''))}</b>${arrow(bestUp.diff, ' pts')}</div>` : ''}
        ${worstDown && worstDown.diff < 0 ? `<div><span class="eyebrow">Got worse</span><b class="small-b">${esc(worstDown.text.replace(/\.$/, ''))}</b>${arrow(worstDown.diff, ' pts')}</div>` : ''}
      </div>
      <p class="muted small" style="margin:0">Previous check: ${esc(shortDate(prev.started_at))}, ${prev.profile_used && Object.keys(prev.profile_used).length ? 'personal' : 'default'} settings.</p>
    </section>` : ''}
    <div class="tiles">
      ${tile(`${back}/steps`, '📋', 'Step by step', 'steps', `${reliable}/${r.per_step.length}`, 'steps reliable')}
      ${tile(`${back}/matrix`, '🔀', 'Confusion matrix', 'matrix', mix ? `${Math.round(mix.f * 100)}%` : '–', mix ? `${esc(mix.from)} → seen as ${esc(mix.to)}` : 'no mix-ups')}
      ${tile(`${back}/pr`, '🎯', 'Precision & recall', 'recall', weakest ? `${weakest.recall}%` : '–', weakest ? `weakest recall: ${esc(weakest.label)}` : '')}
      ${r.diagnostics ? tile(`${back}/measured`, '📏', 'What the camera measured', 'measured', `${overCount}`, 'values beyond the limits (amber)') : ''}
    </div>
    <section class="card tunecard">
      <div class="block-head"><h2 class="display" style="font-size:18px;margin:0">Tune Lumen to you ${info('tune', 'tuning')}</h2></div>
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
      <p class="muted small" style="margin:0">After applying, <strong>run the check again</strong> to see honestly whether it got better.</p>
    </section>
  </main>`);
  const ab = $('#applyBtn');
  if (ab) ab.onclick = async () => {
    await api('/api/profile', { from_check: r.id });
    toast('Saved. Run the check again to verify.');
    ab.textContent = 'Applied'; ab.disabled = true;
  };
  const rb = $('#resetBtn');
  if (rb) rb.onclick = async () => { await api('/api/profile', { reset: true }); toast('Back to default settings'); viewCheckResult(id); };
}
