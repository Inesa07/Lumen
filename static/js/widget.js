// widget.js: data for the macOS widget (see supabase/functions/widget and the macos-widget folder).
//
// The widget can't run Lumen's code, so the browser does the maths and keeps a small summary in the
// cloud table "widget". It is pushed when Lumen or Lumen mini is open (at most once a minute, and only
// when something changed), and only after you pressed "Connect widget" on this account.
'use strict';

const WIDGET_FN = `${'https://mvonovmjnxkyrmdewnxm.supabase.co'}/functions/v1/widget`;
const MOOD_HEX = { calm: '#8A93AB', happy: '#F2C14E', surprised: '#3FCF8E', frown: '#B07CFF', sad: '#5AA9FF', tired: '#FF8A70' };
const widgetFlag = () => (Lumen.user ? `lumen.widget.${Lumen.user.id}` : null);
let widgetLast = { at: 0, json: '' };

/** The summary the widget shows. */
async function widgetSummary() {
  const m = await api('/api/mini');
  const pad = (n) => String(n).padStart(2, '0'), d = new Date();
  const mood = Object.keys(m.mood_today || {}).length ? m.mood_today : {};
  // holiday lines in the chosen language (the widget picks the one for its own date)
  const holidays = {};
  for (const [md, bd] of [['01-01', '01-01'], ['06-01'], ['12-25'], ['10-31'], ['02-14'], ['03-08']]) {
    const [mo, da] = md.split('-').map(Number);
    const h = lumiHoliday(bd ? { birthday: bd } : null, new Date(2026, mo - 1, da));
    if (h) holidays[h.id] = h.line;
  }
  const dr = m.dream;
  return {
    v: 2,
    birthday: m.lumi.birthday || null,
    last_lesson_at: m.last_lesson_at,
    dream: dr ? { emoji: dr.emoji, text: dr.text, earned: dr.earned, need: dr.need, pct: dr.pct, level: dr.level, look: dr.look, ready: dr.ready } : null,
    holidays,
    day: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    goal: { today: m.goal.today, goal_min: m.goal.goal_min, pct: Math.min(100, m.goal.pct || 0), streak: m.goal.streak },
    study_min: m.today.study_min, lessons: m.today.lessons,
    mood: Object.entries(mood).filter(([k, v]) => MOOD[k] && v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([k, v]) => ({ emoji: MOOD[k][0], label: t(MOOD[k][1]), pct: Math.round(v), color: MOOD_HEX[k] })),
    lumi: { stage: t(m.lumi.stage.name), light: m.lumi.light, medals: m.lumi.medals, pct: m.lumi.stage.pct,
      next: m.lumi.stage.next ? m.lumi.stage.next.need : null },
    quest: { icon: m.lumi.quest.icon, text: t(m.lumi.quest.text), value: m.lumi.quest.value, need: m.lumi.quest.need, done: m.lumi.quest.done },
    active: m.active ? { cls: m.active.class || '', attention: m.active.attention } : null,
    labels: { goal: t("Today's goal"), streak: t('Day streak 🔥'), quest: t('Quest of the day'), focused: t('focused'), mood: t('Mood today'),
      none: t("Let's start today's first lesson!"), studying: t('Studying now'),
      morning: t('Lumi is waking up'), day: t('Lumi is flying around'), evening: t('Lumi is getting cosy'), night: t('Lumi is sleeping'),
      happy: t('Happy: you studied today! ✨'), missing: t('Lumi misses you. A short lesson? 🌙'), waiting: t("Waiting for today's lesson"),
      night_missing: t('Lumi misses you. See you tomorrow! 🌙'), night_waiting: t('Sleep well! See you tomorrow 🌙'),
      dream: t('My dream'), dream_ready: t('All stars collected! 🎉'), no_dream: t('Write your dream on the Lumi page 🎁'),
      sunny: t('Sunny'), clear: t('Clear'), cloudy: t('Cloudy'), rain: t('Rain'), snow: t('Snow'), fog: t('Fog'), storm: t('Storm') },
  };
}

/** Send the summary to the cloud, if the widget is connected (force: ignore the 1-minute limit). */
async function pushWidget(force = false) {
  try {
    if (!Lumen.user || !Lumen.client || !localStorage.getItem(widgetFlag())) return;
    if (!force && Date.now() - widgetLast.at < 60000) return;
    const summary = await widgetSummary();
    const json = JSON.stringify(summary);
    if (json === widgetLast.json && !force) return;
    const { error } = await Lumen.client.from('widget').upsert({ user_id: Lumen.user.id, summary, updated_at: new Date().toISOString() });
    if (!error) widgetLast = { at: Date.now(), json };
  } catch { /* the widget just shows older data */ }
}
setInterval(() => pushWidget(), 120000);

function randomKey() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function sha256hex(text) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/** Make a new widget key (an old one stops working). Returns the key; it is shown once. */
async function connectWidget() {
  const key = randomKey();
  const summary = await widgetSummary();
  const { error } = await Lumen.client.from('widget').upsert({ user_id: Lumen.user.id, token_hash: await sha256hex(key), summary, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  localStorage.setItem(widgetFlag(), '1');
  widgetLast = { at: Date.now(), json: JSON.stringify(summary) };
  return key;
}
async function disconnectWidget() {
  await Lumen.client.from('widget').delete().eq('user_id', Lumen.user.id);
  localStorage.removeItem(widgetFlag());
}

/** The "Mac widget" card in Settings. */
function widgetCard() {
  const on = Lumen.user && localStorage.getItem(widgetFlag());
  return `<section class="card widgetcard" id="widgetCard">
    <div class="setrow" style="padding:0;border:0;background:none">
      <div><h2 style="margin:0 0 4px;font-size:17px">🖥️ ${t('Mac widget')}</h2>
        <p class="muted small" style="margin:0">${t('Lumi, today\'s goal, streak, mood and quest on your Mac desktop. Needs a free Lumen account and the free Übersicht app (or the Xcode widget).')}</p></div>
      ${!Lumen.user || Lumen.fake && !Lumen.client ? `<a class="btn ghost" href="#/account">${t('Sign in')}</a>`
        : `<div class="btnrow">${on ? `<button class="btn ghost" id="wDisc">${t('Disconnect')}</button>` : ''}<button class="btn primary" id="wConn">${t(on ? 'New key' : 'Connect widget')}</button></div>`}
    </div>
    <div id="wOut" hidden></div>
  </section>`;
}
function wireWidgetCard() {
  const c = $('#wConn'), d = $('#wDisc');
  if (c) c.onclick = async () => {
    c.disabled = true;
    try {
      const key = await connectWidget();
      const out = $('#wOut');
      out.hidden = false;
      out.innerHTML = `<div class="wkeys"><p class="small" style="margin:0"><b>${t('Paste these two values at the top of the widget file (index.jsx).')}</b> ${t('The key is shown only once. Keep it private: it shows your summary.')}</p>
        <label class="eyebrow">LUMEN_WIDGET_URL</label><div class="wkey"><code>${WIDGET_FN}</code><button class="btn ghost small-btn" data-copy="${WIDGET_FN}">${t('Copy')}</button></div>
        <label class="eyebrow">LUMEN_WIDGET_KEY</label><div class="wkey"><code>${key}</code><button class="btn ghost small-btn" data-copy="${key}">${t('Copy')}</button></div></div>`;
      out.querySelectorAll('[data-copy]').forEach((b) => { b.onclick = async () => { await navigator.clipboard.writeText(b.dataset.copy); toast(t('Copied')); }; });
      c.textContent = t('New key');
    } catch (e) {
      toast(/widget|relation|schema/i.test(e.message) ? t('The widget table is not set up yet (run 004_widget.sql in Supabase).') : e.message);
    }
    c.disabled = false;
  };
  if (d) d.onclick = async () => { await disconnectWidget(); toast(t('Widget disconnected')); $('#widgetCard').outerHTML = widgetCard(); wireWidgetCard(); };
}
