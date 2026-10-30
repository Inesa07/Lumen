// insights.js: the Progress page (statistics + weekly report in one place) and the accuracy check results.
// Each page shows a short summary first; every tile opens a detail page with an explanation (i) and a back arrow.
'use strict';

// ---------------------------------------------------------------- explanations behind every (i)
const INFO = {
  // Progress
  focused: ['Focused time', 'Minutes in which you were really with the lesson (attention 70% or more). <br><b>Why:</b> studying 2 hours while drifting teaches less than 1 focused hour, so this is the number to grow.'],
  studied: ['Studied time', 'All the time a lesson was running, focused or not.'],
  attention: ['Average attention', 'How much of the time your eyes and head were on the lesson, 0–100%. Looking away, the phone and closed eyes lower it. <br><b>Why:</b> one number to compare lessons and weeks.'],
  streak: ['Day streak 🔥', 'Days in a row on which you studied at least the minimum from Settings (10 min by default). <br><b>Why:</b> studying a little every day beats a lot once a week.<br><b>🧊 Freezes:</b> if you miss a day, a freeze is used automatically and the streak stays. You start with one and get one more for every 5 days in a row (at most 2).'],
  week: ['This week', 'The last 7 days compared with the 7 days before: is your focused time growing? <br><b>Why:</b> one week is noisy, but the trend shows whether your habits work.'],
  days: ['Last 14 days', 'Each bar is one day. Grey = time studied, green part = time focused. <br><b>Why:</b> you see which days you studied and how well, at a glance.'],
  time: ['Best time of day', 'Your average attention in the morning, afternoon, evening and night. ★ = your best. <br><b>Why:</b> plan hard subjects for the time your brain works best.'],
  classes: ['Classes', 'How much time each class took, and how much of it you were focused. <br><b>Why:</b> find the subjects where you drift most.'],
  mood: ['Mood', 'Share of time with each facial expression during lessons (calm, happy, frowning…). <br><b>Note:</b> Lumen reads expressions, not feelings: a frown often just means "this is hard".'],
  learned: ['What Lumen learned', 'Personal tips found in all your lessons: when attention drops, how often the phone comes out, which breaks helped.'],
  tasks: ['Plan tasks', 'Tasks you planned before lessons and ticked as done. <br><b>Why:</b> attention is a means; finishing what you planned is the goal.'],
  phoneh: ['Phone pickups / hour', 'How often the phone came out per hour of study. Lower is better.'],
  // Lumi
  lumi: ['Lumi', 'Lumi is your study firefly. It grows from your light (1 light for every focused minute): Spark → Little light → Firefly → Bright → Glowing → Star firefly. <br><b>Why:</b> learning is easier with a friend who notices your effort.'],
  home: ["Lumi's home", 'Choose where Lumi lives: the lake, forest, garden, ocean, sky or space. The whole app gets the same background. Lumi\'s home grows with Lumi: a glass jar, then a lantern, then a little house. In the morning Lumi is at the door, in the day it flies around, in the evening the window glows, and at night Lumi sleeps.'],
  wardrobe: ['Wardrobe', 'Clothes come with <b>light 🔆</b>, not with stars. Every minute you really focus gives Lumi 1 light. At 30, 120, 300, 600 and 1200 light Lumi grows, and each time new clothes open. Under every locked outfit you see how much light is still missing.'],
  light: ['Light 🔆', 'Every minute you are really focused gives Lumi 1 light. With more light Lumi grows, and every new stage brings Lumi new clothes. <br>Light is never taken away. <br><b>Stars ⭐ are different:</b> they come from a good lesson and take you to your dream.'],
  dream: ['My dream', 'Talk with your parents, then write a dream here. Lumen counts how many stars it needs: a bigger dream needs more, and it fits how you usually study, so every dream is reachable. Stars come from lessons: 10 focused minutes = 1, a lesson without the phone = 1, a new focus record = 3. Stars are never taken away. <br><b>Why:</b> a goal you chose yourself is the best reason to start a lesson.'],
  // Accuracy check
  accuracy: ['Accuracy', 'Share of ALL moments where Lumen guessed right what you were doing. <br><b>Careful:</b> most of the check you look at the screen, so a lazy Lumen that always says "on screen" would still score high. That is why there is a second number.'],
  balanced: ['Balanced accuracy', 'How often Lumen was right. Lumen gets a score for each of the 5 situations (looking at the screen, looking away, phone, eyes closed, not in frame), and this is the average, each situation counting the same. <br><b>Why this number:</b> most of the check you just look at the screen, which is easy. Counting every situation equally makes the hard ones count too, so the score is honest.'],
  yawn: ['Yawn', 'Did Lumen notice the "open your mouth wide" step? Yawns are one of the signs of tiredness.'],
  moments: ['Moments', 'Lumen looks at the camera about 10–15 times a second; each look is a "moment". The first 2.5 s of every step are not counted: you need time to hear the instruction and react.'],
  steps: ['Step by step', 'How often Lumen was right during each instruction of the check. <br>🟢 90%+ reliable · 🟡 60–89% · 🔴 below 60%, with what Lumen confused it with. <br><b>Why:</b> shows exactly which action is hard to recognise.'],
  matrix: ['Confusion matrix', '<b>Rows</b> = what you were really doing. <b>Columns</b> = what Lumen thought. <br>The green diagonal = right answers. Red cells = mix-ups, e.g. row "Looking away", column "On screen" = moments Lumen missed. <br><b>Why:</b> shows not only how often Lumen is wrong, but WHAT it confuses.'],
  recall: ['Recall — "did it catch it?"', 'Of all the times something REALLY happened (you really looked away), how many did Lumen notice? <br>Low recall = Lumen misses things.'],
  precision: ['Precision — "can I trust it?"', 'Of all the times Lumen SAID something ("you looked away"), how often was it true? <br>Low precision = false alarms, which annoy users most.'],
  measured: ['What the camera measured (for developers)', 'The raw numbers behind every decision: for each step, the typical (median) value of each measurement, compared with your normal position from the first 15 seconds (0 = normal). <br><b>Amber</b> = beyond the limit, so Lumen says "looking away". <br><b>Why:</b> it explains WHY a step went wrong.'],
  tune: ['Make Lumen fit you', 'Every face is a little different: some people move their eyes more, some have narrower eyes. During the check Lumen watched how YOU look and found where its standard settings do not fit you. <br><b>Why:</b> fewer wrong "you looked away" messages. <br><b>Then run the check again</b>: that is the only honest way to see if it really got better.'],
  mixups: ['Mix-ups', 'What Lumen confuses with what. For example, when you covered the camera, did Lumen think it was a phone? <br><b>Why:</b> shows not only how often Lumen is wrong, but WHAT it mixes up, so we know what to fix.'],
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
          <div><b>${tw.lessons ?? tw.sessions}</b><span>lessons</span></div>
          <div><b>${tw.pickups ?? 0}</b><span>times the phone came out</span>${deltaTxt(tw.pickups, pw.pickups, '', 'down')}</div>
        </div>
      </section>
      <section class="card"><h2 class="display" style="font-size:20px">Day by day</h2>${dayBars(w.days, 160)}
        <p class="muted small" style="margin:12px 0 0">${w.best_day ? `Best day: <strong>${esc(w.best_day.label)} ${esc(w.best_day.date)}</strong>, ${hm(w.best_day.focused_min)} focused.` : ''}</p></section>
      <section class="stats">
        <div class="card"><span class="eyebrow">Breaks</span><b>${tw.breaks}</b><span class="eyebrow">rest helps focus</span></div>
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

  if (sub === 'pr') { location.replace(`${back}/matrix`); return; }   // old link: now part of Mix-ups
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
        <div><b>${d.goal.streak} 🔥${d.goal.freezes ? ` <small title="streak freezes">🧊${d.goal.freezes}</small>` : ''}</b><span>day streak ${info('streak', 'streak')}</span></div>
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
        <div class="steprow">
          <div class="x"><div>Yawn, or open your mouth wide.</div><div>${r.yawn_detected ? 'Lumen noticed the yawn' : 'Lumen missed the yawn'} ${info('yawn')}</div></div>
          <div class="bar"><i style="width:100%;background:${r.yawn_detected ? 'var(--teal)' : 'var(--coral)'}"></i></div>
          <b>${r.yawn_detected ? 'Seen' : 'Missed'}</b></div>
      </div></section>`],
    matrix: () => ['Accuracy check', 'Mix-ups', `${explain('matrix')}
      <section class="card" style="overflow-x:auto"><h2 class="display" style="font-size:18px">Confusion matrix ${info('matrix')}</h2><table class="cm">
        <tr><th>truth \\ Lumen</th>${r.labels.map((l) => `<th>${esc(l)}</th>`).join('')}</tr>
        ${r.confusion.map((row, i) => `<tr><th>${esc(r.labels[i])}</th>${row.map((v, j) => cell(v, i, j)).join('')}</tr>`).join('')}
      </table>
      ${mix && mix.f > 0.05 ? `<p class="muted small" style="margin:14px 0 0">Biggest mix-up: when you were <b>${esc(mix.from)}</b>, Lumen thought <b>${esc(mix.to)}</b> in ${Math.round(mix.f * 100)}% of the moments.</p>` : ''}</section>
      <section class="card"><h2 class="display" style="font-size:18px">The same, counted two ways</h2>
        <div class="pr-explain">${explain('recall')}${explain('precision')}</div>
        <table class="cm pr">
        <tr><th></th><th>recall ${info('recall', 'recall')}<br><small>did it catch it?</small></th><th>precision ${info('precision', 'precision')}<br><small>can I trust it?</small></th></tr>
        ${r.per_class.map((c) => `<tr><th>${esc(c.label)}</th><td>${c.recall ?? '–'}${c.recall != null ? '%' : ''}</td><td>${c.precision ?? '–'}${c.precision != null ? '%' : ''}</td></tr>`).join('')}
      </table>
      <p class="muted small" style="margin:14px 0 0">Recall = the green cell of a <b>row</b> above. Precision looks down a <b>column</b>: of everything Lumen called "Looking away", how much really was.
        Example: a teacher looks for phones. Recall = of the pupils who really had a phone, how many did he catch? Precision = of the pupils he pointed at, how many really had one?</p></section>`],
    measured: () => ['Accuracy check · for developers', 'What the camera measured', `${explain('measured')}
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

  if (sub === 'pr') { location.replace(`${back}/matrix`); return; }   // old link: now part of Mix-ups
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

  // "Make Lumen fit you": say in plain words what changes and why, numbers only for developers
  const fmt = (k, v) => (k === 'closed' ? `${Math.round(v * 100)}%` : `×${v}`);
  const names = { side: 'Left / right limit', vert: 'Up / down limit', closed: 'Eyes-closed limit' };
  const applied = prof && JSON.stringify(prof) === JSON.stringify(t.suggested);
  const plain = [];
  const dir = { side: ['↔️', 'left and right'], vert: ['↕️', 'up and down'] };
  for (const k of ['side', 'vert']) {
    const now = t.current[k], nw = t.suggested[k];
    if (nw > now * 1.05) plain.push([dir[k][0], `While you look at the screen, your eyes move ${dir[k][1]} a bit more than Lumen expected, so sometimes it thought you looked away when you didn't.`, `Lumen will relax a little about ${dir[k][1]} movements.`]);
    else if (nw < now * 0.95) plain.push([dir[k][0], `Sometimes you looked away (${dir[k][1]}) and Lumen didn't notice.`, `Lumen will watch ${dir[k][1]} movements more carefully.`]);
  }
  if (t.suggested.closed < t.current.closed - 0.04) plain.push(['👁️', 'When you look down at your notebook, your eyelids drop a little, so Lumen sometimes thought your eyes were closed.', 'Lumen will say "eyes closed" only when they are really closed.']);
  else if (t.suggested.closed > t.current.closed + 0.04) plain.push(['👁️', 'Sometimes your eyes were closed and Lumen noticed it too late.', 'Lumen will notice closed eyes sooner.']);
  const settings = r.profile_used && Object.keys(r.profile_used).length ? 'your personal settings' : 'standard settings';
  const diff = prev ? r.balanced_accuracy - prev.balanced_accuracy : null;

  app.innerHTML = shell('check', `
  ${pageHead(`Accuracy check · ${esc(when)} · ${settings}`,
    'How accurate is Lumen for you?', '<a class="btn primary" href="#/check">Run again</a>', '#/check')}
  <main class="wrap" style="display:flex;flex-direction:column;gap:20px">
    <section class="card ck-hero">
      <div><span class="eyebrow">Balanced accuracy ${info('balanced', 'balanced accuracy')}</span>
        <div class="ck-big">${r.balanced_accuracy}%</div>
        <div class="muted small">Lumen was right this often (every situation counts the same)</div></div>
      <div class="ck-meter" aria-hidden="true"><i style="width:${r.balanced_accuracy}%"></i></div>
    </section>
    <section class="card inshort">
      <h2 class="display" style="font-size:18px;margin:0 0 10px">In short</h2>
      <p>✅ <b>${reliable} of ${r.per_step.length}</b> steps were recognised reliably (90%+).</p>
      ${worst.filter((s) => s.acc < 90).map((s) => `<p>⚠️ <b>${esc(s.text.replace(/\.$/, ''))}</b>: ${s.acc}%${s.mistake ? `, often seen as “${esc(s.mistake)}”` : ''}.</p>`).join('')}
      ${plain.length ? '<p>🎯 Lumen can fit itself to you better (below).</p>' : '<p>🎯 Lumen already fits you well.</p>'}
    </section>
    ${prev ? `<a class="card cmp-line" href="${back}/compare">
      <span class="muted">Since your last check (${esc(shortDate(prev.started_at))}):</span>
      <b>${prev.balanced_accuracy}% → ${r.balanced_accuracy}%</b> ${arrow(diff, ' pts')}
      <span class="tile-go">›</span></a>` : ''}
    <div class="tiles">
      ${tile(`${back}/steps`, '📋', 'Step by step', 'steps', `${reliable}/${r.per_step.length}`, 'steps reliable')}
      ${tile(`${back}/matrix`, '🔀', 'Mix-ups', 'mixups', mix ? `${Math.round(mix.f * 100)}%` : '–', mix ? `${esc(mix.from)} → seen as ${esc(mix.to)}` : 'no mix-ups')}
    </div>
    <section class="card tunecard">
      <h2 class="display" style="font-size:18px;margin:0">Make Lumen fit you ${info('tune', 'this')}</h2>
      ${plain.length ? `<p class="muted" style="margin:0">Every face is a little different. During the check Lumen noticed:</p>
      ${plain.map(([ic, saw, fix]) => `<div class="fitrow"><span class="fit-ic">${ic}</span><div><div>${saw}</div><div class="fit-fix">→ ${fix}</div></div></div>`).join('')}`
      : '<p style="margin:0">Lumen\'s settings already fit you well. Nothing to change. 🎉</p>'}
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${plain.length ? `<button class="btn primary" id="applyBtn" ${applied ? 'disabled' : ''}>${applied ? 'Done ✓' : 'Yes, fit Lumen to me'}</button>` : ''}
        ${prof ? '<button class="btn ghost" id="resetBtn">Go back to standard settings</button>' : ''}
      </div>
      ${plain.length ? '<p class="muted small" style="margin:0">Then <strong>run the check once more</strong> to see if Lumen really got better.</p>' : ''}
      <details class="devbox"><summary>For developers: the numbers</summary>
        <table class="tune">
          <tr><th></th><th>now</th><th>suggested</th></tr>
          ${['side', 'vert', 'closed'].map((k) => `<tr><td>${names[k]}</td><td>${fmt(k, t.current[k])}</td>
            <td class="${t.suggested[k] !== t.current[k] ? 'chg' : ''}">${fmt(k, t.suggested[k])}</td></tr>`).join('')}
        </table>
        <p class="muted small">×1.18 = allow 18% more movement before "looking away". Eyes-closed limit = how open your eyes must be, compared with normal, to count as open.</p>
      </details>
    </section>
    ${r.diagnostics ? `<a class="devlink" href="${back}/measured">🛠 For developers: what the camera measured ›</a>` : ''}
  </main>`);
  const ab = $('#applyBtn');
  if (ab) ab.onclick = async () => {
    await api('/api/profile', { from_check: r.id });
    toast('Done. Run the check again to see if it got better.');
    ab.textContent = 'Done ✓'; ab.disabled = true;
  };
  const rb = $('#resetBtn');
  if (rb) rb.onclick = async () => { await api('/api/profile', { reset: true }); toast('Back to default settings'); viewCheckResult(id); };
}
