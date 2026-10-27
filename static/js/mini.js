// mini.js: "Lumen mini", a small always-at-hand window (Safari → File → Add to Dock).
// Lumi, today's focus against the goal, the streak, today's mood, the quest of the day and,
// while a lesson runs, live attention. It refreshes itself, and pulls new lessons from the
// account every few minutes, because this window can stay open all day.
'use strict';

let miniTimer = null, miniPull = 0;
const fmtMin = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 ? `${m % 60}m` : ''}`.trim() : `${m}m`);

function moodRow(mix) {
  const top = Object.entries(mix || {}).filter(([k, v]) => MOOD[k] && v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (!top.length) return `<span class="muted small">${t('No mood data yet')}</span>`;
  return `<div class="mini-moodbar">${top.map(([k, v]) => `<i style="flex:${v};background:${MOOD[k][2]}"></i>`).join('')}</div>
    <div class="mini-moods">${top.map(([k, v]) => `<span>${MOOD[k][0]} ${t(MOOD[k][1])} <b>${Math.round(v)}%</b></span>`).join('')}</div>`;
}

async function viewMini() {
  closeStream();
  focusMode();                                  // no sidebar: the window is small
  document.documentElement.classList.add('mini-mode');
  clearInterval(miniTimer);
  const draw = async () => {
    if (location.hash !== '#/mini') return;
    if (Date.now() - miniPull > 3 * 60000) { miniPull = Date.now(); await Lumen.server.pullCloud().catch(() => {}); }
    let m;
    try { m = await api('/api/mini'); } catch { return; }
    const g = m.goal, L = m.lumi, hol = lumiHoliday({ birthday: L.birthday });
    const mood = Object.keys(m.mood_today || {}).length ? m.mood_today : m.mood_week;
    const moodLabel = Object.keys(m.mood_today || {}).length ? t('Mood today') : t('Mood this week');
    const ring = Math.min(100, g.pct || 0);
    app.innerHTML = `<main class="mini">
      <header class="mini-top"><span class="mini-brand">${LOGO}<b>Lumen</b></span>
        <a class="mini-open" href="#/" title="${t('Open Lumen')}">${t('Open Lumen')} ↗</a></header>
      ${m.active ? `<a class="mini-live" href="#/session"><span class="dot-live"></span>
        <span><b>${t('Studying now')}</b> · ${esc(m.active.class || '')}<br><small>${t('attention')} ${m.active.attention}% · ${t(m.active.state)}</small></span></a>` : ''}
      <section class="mini-lumi">
        ${lumiSVG({ mood: m.active ? (m.active.state === 'Focused' ? 'happy' : 'wait') : restingMood(), stage: L.stage.index, outfit: L.outfit, extra: hol && hol.extra, size: 96 })}
        <div><div class="eyebrow">${t('Lumi · {name}', { name: esc(t(L.stage.name)) })}</div>
          <div class="mini-say">${esc(hol ? hol.line : greetLine({ birthday: L.birthday }))}</div>
          <div class="lightbar"><i style="width:${L.stage.pct}%"></i></div>
          <div class="muted small">🔆 ${t('{n} light', { n: L.light })} · 🏅 ${t('{n} medals', { n: L.medals })}</div></div>
      </section>
      <section class="mini-today">
        <div class="mini-ring" style="--p:${ring}"><b>${ring}%</b></div>
        <div><div class="eyebrow">${t("Today's goal")}</div>
          <div class="mini-big">${fmtMin(g.today)} <span class="muted">/ ${fmtMin(g.goal_min)}</span></div>
          <div class="muted small">${t('focused')} · ${fmtMin(m.today.study_min)} ${t('studied')}</div></div>
        <div class="mini-streak" title="${t('Day streak 🔥')}">🔥<b>${g.streak}</b></div>
      </section>
      <section class="mini-card"><div class="eyebrow">${moodLabel}</div>${moodRow(mood)}</section>
      <section class="mini-card mini-quest${L.quest.done ? ' done' : ''}"><span>${L.quest.icon}</span>
        <div><div class="eyebrow">${t('Quest of the day')}</div><b>${esc(t(L.quest.text))}</b></div>
        <span class="qv">${L.quest.done ? '✓' : `${L.quest.value}/${L.quest.need}`}</span></section>
      <a class="btn primary mini-start" href="${m.active ? '#/session' : '#/'}">▶ ${t(m.active ? 'Back to the lesson' : 'Start a lesson')}</a>
    </main>`;
  };
  await draw();
  // every 5 s while a lesson runs in this window, otherwise every minute
  const tick = async () => { await draw(); clearTimeout(miniTimer); miniTimer = setTimeout(tick, document.querySelector('.mini-live') ? 5000 : 60000); };
  miniTimer = setTimeout(tick, 5000);
  window.addEventListener('focus', draw, { once: true });
}
window.addEventListener('hashchange', () => {
  if (location.hash !== '#/mini') { clearTimeout(miniTimer); document.documentElement.classList.remove('mini-mode'); }
});
