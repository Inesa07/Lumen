// friend.js: Lumi the firefly. Draws Lumi (SVG), picks its mood from what the camera sees,
// shows it in lessons and on Home, and runs the Lumi page with its wardrobe and achievements.
// The rules (light, stages, achievements) live in src/core/friend.js.
'use strict';

// ---------------------------------------------------------------- drawing
// Lumi is one SVG. Its mood is a CSS class (m-happy, m-wait, m-sleepy, m-rest, m-party, m-hello):
// the class decides which eyes and mouth are visible and how it moves (static/style.css, "Lumi").
const STAGE_SCALE = [0.6, 0.7, 0.8, 0.88, 0.95, 1];
let lumiSeq = 0;

function lumiSVG({ mood = 'happy', stage = 0, outfit = 'none', size = 120, locked = false, label = 'Lumi the firefly' } = {}) {
  const id = `lg${lumiSeq += 1}`;                         // unique gradient ids per drawing
  const sc = STAGE_SCALE[Math.max(0, Math.min(5, stage))];
  const glowR = 30 + stage * 5;
  const sparkles = [[18, 30], [100, 26], [12, 78], [106, 70], [30, 108], [92, 104]].slice(0, stage)
    .map(([x, y], i) => `<path class="spk" style="animation-delay:${i * 0.4}s" d="M${x} ${y - 4}l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2z"/>`).join('');
  const tip = stage >= 5
    ? (x, y) => `<path class="tip" d="M${x} ${y - 5}l1.5 3.4 3.7.4-2.8 2.4.9 3.6-3.3-1.9-3.3 1.9.9-3.6-2.8-2.4 3.7-.4z"/>`
    : (x, y) => `<circle class="tip" cx="${x}" cy="${y}" r="3.2"/>`;
  return `<svg class="lumi m-${mood}${locked ? ' locked' : ''}" width="${size}" height="${size}" viewBox="0 0 120 120" role="img" aria-label="${esc(label)}">
  <defs>
    <radialGradient id="${id}g"><stop offset="0" stop-color="#FFF4A8" stop-opacity=".9"/><stop offset=".45" stop-color="#E9F56A" stop-opacity=".35"/><stop offset="1" stop-color="#E9F56A" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}t" cx=".5" cy=".4"><stop offset="0" stop-color="#FFFBD0"/><stop offset=".6" stop-color="#F4E84E"/><stop offset="1" stop-color="#A9DB3A"/></radialGradient>
    <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7B68C8"/><stop offset="1" stop-color="#5A4AA6"/></linearGradient>
  </defs>
  <circle class="glow" cx="60" cy="80" r="${glowR}" fill="url(#${id}g)"/>
  <g class="spks" fill="#FFE98A">${sparkles}</g>
  <g class="lumi-body" style="transform:scale(${sc})">
    <g class="float">
      <ellipse class="wing wl" cx="40" cy="58" rx="17" ry="11"/>
      <ellipse class="wing wr" cx="80" cy="58" rx="17" ry="11"/>
      <ellipse class="tail" cx="60" cy="84" rx="17" ry="15" fill="url(#${id}t)"/>
      <path class="stripe" d="M45 80q15 6 30 0" />
      ${outfit === 'scarf' ? '<path d="M41 68q19 9 38 0l1 6q-20 10-40 0z" fill="#F06BA8"/><path d="M70 72l4 12 5-2-3-11z" fill="#D9468A"/>' : ''}
      <path class="ant" d="M52 32q-6-12-12-14M68 32q6-12 12-14"/>
      ${tip(40, 18)}${tip(80, 18)}
      <circle cx="60" cy="50" r="23" fill="url(#${id}b)"/>
      <ellipse cx="60" cy="58" rx="13" ry="9" fill="#8F7FD8" opacity=".55"/>
      <circle class="cheek" cx="45" cy="57" r="4"/><circle class="cheek" cx="75" cy="57" r="4"/>
      <g class="eyes-open"><ellipse cx="51" cy="48" rx="5.5" ry="6.5" fill="#fff"/><ellipse cx="69" cy="48" rx="5.5" ry="6.5" fill="#fff"/>
        <g class="pupils"><circle cx="52" cy="49" r="3.2" fill="#241A4A"/><circle cx="70" cy="49" r="3.2" fill="#241A4A"/>
        <circle cx="53.2" cy="47.4" r="1.1" fill="#fff"/><circle cx="71.2" cy="47.4" r="1.1" fill="#fff"/></g>
        <g class="lids"><rect x="44" y="40" width="14" height="7" rx="3" fill="#6F5DBD"/><rect x="62" y="40" width="14" height="7" rx="3" fill="#6F5DBD"/></g></g>
      <g class="eyes-happy" fill="none" stroke="#241A4A" stroke-width="2.6" stroke-linecap="round"><path d="M46 49q5-6 10 0M64 49q5-6 10 0"/></g>
      <path class="mouth smile" d="M54 59q6 5 12 0" fill="none" stroke="#241A4A" stroke-width="2.4" stroke-linecap="round"/>
      <path class="mouth grin" d="M52 57q8 11 16 0z" fill="#241A4A"/>
      <ellipse class="mouth yawn" cx="60" cy="60" rx="3.6" ry="4.4" fill="#241A4A"/>
      ${outfit === 'glasses' ? '<g fill="none" stroke="#241A4A" stroke-width="2"><circle cx="51" cy="48" r="8"/><circle cx="69" cy="48" r="8"/><path d="M59 48h2"/></g>' : ''}
      ${outfit === 'bow' ? '<g transform="translate(74 30) rotate(20)"><path d="M0 0l-9-6v12zM0 0l9-6v12z" fill="#F06BA8"/><circle r="2.6" fill="#D9468A"/></g>' : ''}
      ${outfit === 'cap' ? '<g><path d="M38 30l22-9 22 9-22 9z" fill="#2B2440"/><path d="M47 33v7q13 6 26 0v-7l-13 6z" fill="#3A3157"/><path d="M80 30v10" stroke="#F2C14E" stroke-width="2"/><circle cx="80" cy="41" r="2" fill="#F2C14E"/></g>' : ''}
      ${outfit === 'headphones' ? '<g><path d="M37 50q0-28 23-28t23 28" fill="none" stroke="#2F7FE0" stroke-width="4"/><rect x="32" y="44" width="9" height="14" rx="4" fill="#5AA9FF"/><rect x="79" y="44" width="9" height="14" rx="4" fill="#5AA9FF"/></g>' : ''}
      ${outfit === 'flower' ? `<g transform="translate(78 31)">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="3.2" ry="5.4" fill="#FF9FC6" transform="rotate(${a}) translate(0 -5)"/>`).join('')}<circle r="3" fill="#F2C14E"/></g>` : ''}
      ${outfit === 'crown' ? '<path d="M45 30l4-11 6 7 5-10 5 10 6-7 4 11z" fill="#F2C14E" stroke="#C99A12" stroke-width="1"/>' : ''}
    </g>
  </g>
</svg>`;
}

// ---------------------------------------------------------------- moods and words
// Lumi only says pre-written lines: friendly, short, never blaming. (No free AI chat for children.)
const LUMI_LINES = {
  hello: ["Hi! I'm Lumi ✨ Shall we learn something?", 'Ready when you are. I glow while you learn!', 'Hello again! I missed you 🌟'],
  calib: ['Look at your lesson for a few seconds, I am getting to know you 👀'],
  happy: ["You're doing great! I'm glowing brighter ✨", 'Every focused minute gives me light 🔆', 'Nice and focused!',
    'I love learning with you.', 'Look how bright I am! That is your focus.'],
  notes: ['Writing notes? Great idea ✍️', 'Notes help your brain remember 🧠'],
  wait: ["Hey, I'm here 👋", "Come back when you're ready, I'll wait.", 'The lesson is waiting for you too 📖'],
  phone: ['Psst… the phone can wait 📵', "I'll keep your place. Put the phone down when you're ready."],
  absent: ["I can't see you… I'll wait right here 🌙"],
  sleepy: ['*yawn*… Tired? A short break helps 😴', 'My light is getting sleepy. Maybe stretch a little?'],
  rest: ['Break time! Stretch and drink some water 💧', 'Look far away, out of the window 🌳', 'Rest well, I am resting too.'],
  eyes: ["Let's look far away together for 20 seconds 🌳"],
  party: ['Yay, eyes rested! ✨'],
};
const LINE_FACE = { hello: 'hello', calib: 'happy', happy: 'happy', notes: 'happy', wait: 'wait', phone: 'wait', absent: 'wait', sleepy: 'sleepy', rest: 'rest', eyes: 'rest', party: 'party' };
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Which mood fits this moment of the lesson (from the live snapshot). */
function lumiMoodOf(d) {
  if (d.on_break) return 'rest';
  if (d.eye_rest) return 'eyes';
  if (d.calibrating) return 'calib';
  if (d.reason === 'phone') return 'phone';
  if (d.reason === 'absent') return 'absent';
  if (d.reason === 'away') return 'wait';
  if (d.reason === 'drowsy') return 'sleepy';
  if (d.reason === 'notes') return 'notes';
  return 'happy';
}

// ---------------------------------------------------------------- Lumi in a lesson
const lumiLive = { info: null, key: '', said: 0, partyUntil: 0, hidden: false };

async function lumiLesson(d) {
  const appEl = $('#app');
  if (!appEl) return;
  if (!lumiLive.info) {
    lumiLive.info = { loading: true };
    lumiLive.info = await api('/api/friend').catch(() => ({ show_in_lessons: false }));
  }
  const f = lumiLive.info;
  if (f.loading || !f.show_in_lessons) return;
  let dock = $('#lumiDock');
  if (!dock) {
    dock = document.createElement('div');
    dock.id = 'lumiDock';
    dock.className = 'lumi-dock';
    dock.innerHTML = '<div class="lumi-bubble" id="lumiBubble" role="status" aria-live="polite"></div><button class="lumi-btn" id="lumiBtn" type="button" aria-label="Lumi: hide or show what I say"></button>';
    appEl.appendChild(dock);
    $('#lumiBtn').onclick = () => { lumiLive.hidden = !lumiLive.hidden; $('#lumiBubble').hidden = lumiLive.hidden; };
    lumiLive.key = '';
  }
  const now = Date.now();
  if (d.eye_rest_result === 'done') lumiLive.partyUntil = now + 5000;
  const key = now < lumiLive.partyUntil ? 'party' : lumiMoodOf(d);
  const face = LINE_FACE[key];
  // redraw only when the mood changes; a new line on mood change, or every 90 s while happy
  if (key !== lumiLive.key) {
    $('#lumiBtn').innerHTML = lumiSVG({ mood: face, stage: f.stage.index, outfit: f.outfit, size: 84 });
  }
  if (key !== lumiLive.key || now - lumiLive.said > 90000) {
    $('#lumiBubble').textContent = pick(LUMI_LINES[key]);
    lumiLive.said = now;
  }
  lumiLive.key = key;
}
// a new lesson page starts fresh (new outfit, new stage)
window.addEventListener('hashchange', () => { lumiLive.info = null; });

// ---------------------------------------------------------------- Lumi on Home
function lumiHomeCard(f) {
  const line = f.first_time ? "Hi! I'm Lumi, your study firefly. Focus to give me light and I will grow!"
    : f.stage.next ? `${f.stage.next.need - f.light} more light and I become a <b>${esc(f.stage.next.name)}</b>!` : 'I am a Star firefly! Thank you for all the light ✨';
  return `<a class="card lumicard" href="#/lumi">
    <div class="lumicard-pic">${lumiSVG({ mood: 'hello', stage: f.stage.index, outfit: f.outfit, size: 92 })}</div>
    <div class="lumicard-txt"><div class="eyebrow">Lumi · ${esc(f.stage.name)}</div>
      <div class="lumicard-line">${line}</div>
      <div class="lightbar" aria-label="Light ${f.light}"><i style="width:${f.stage.pct}%"></i></div>
      <div class="muted small">🔆 ${f.light} light${f.achievements.some((a) => a.tier) ? ` · 🏅 ${f.achievements.reduce((a, x) => a + x.tier, 0)} medals` : ''}</div></div>
    <span class="chev">›</span></a>`;
}

// ---------------------------------------------------------------- the Lumi page
const MEDAL = ['var(--track)', '#CD7F32', '#C3CCD6', '#F2C14E'];

async function viewLumi() {
  closeStream();
  const f = await api('/api/friend');
  const medals = f.achievements.reduce((a, x) => a + x.tier, 0);
  app.innerHTML = shell('lumi', `
  ${pageHead(`${f.light} light · ${medals} medal${medals === 1 ? '' : 's'}`, 'Lumi', '', '')}
  <main class="wrap" style="display:flex;flex-direction:column;gap:22px">
    <section class="card lumi-hero">
      <div class="lumi-stage-pic" id="lumiBig">${lumiSVG({ mood: 'happy', stage: f.stage.index, outfit: f.outfit, size: 220 })}</div>
      <div class="lumi-hero-txt">
        <div class="eyebrow">Stage ${f.stage.index + 1} of ${f.stages.length} ${info('lumi', 'Lumi')}</div>
        <h1 class="display">${esc(f.stage.name)}</h1>
        <p class="muted">${esc(f.stage.line)}</p>
        <div class="lightbar big"><i style="width:${f.stage.pct}%"></i></div>
        <div class="small">${f.stage.next ? `🔆 <b>${f.light}</b> / ${f.stage.next.need} light to <b>${esc(f.stage.next.name)}</b>` : `🔆 <b>${f.light}</b> light. Lumi is fully grown!`} ${info('light', 'light')}</div>
        <div class="lumi-say">💬 ${esc(pick(f.first_time ? LUMI_LINES.hello : LUMI_LINES.happy))}</div>
      </div>
    </section>

    <section class="card">
      <h2 class="display" style="font-size:18px;margin:0 0 14px">How Lumi grows</h2>
      <div class="stagepath">${f.stages.map((s, i) => `<div class="stagestep${i === f.stage.index ? ' now' : ''}${i > f.stage.index ? ' later' : ''}">
        ${lumiSVG({ mood: i <= f.stage.index ? 'happy' : 'rest', stage: i, size: 64, locked: i > f.stage.index, label: s.name })}
        <b>${i > f.stage.index ? '?' : esc(s.name)}</b><span class="muted small">${s.need} light</span></div>`).join('')}</div>
    </section>

    <section class="card">
      <div class="block-head"><h2 class="display" style="font-size:18px;margin:0">Wardrobe</h2><span class="muted small">tap to dress Lumi</span></div>
      <div class="wardrobe">${f.outfits.map((o) => `<button type="button" class="outfit${o.id === f.outfit ? ' on' : ''}" data-outfit="${o.id}" ${o.unlocked ? '' : 'disabled'} aria-pressed="${o.id === f.outfit}">
        ${lumiSVG({ mood: 'happy', stage: Math.max(2, f.stage.index), outfit: o.id, size: 70, locked: !o.unlocked, label: o.name })}
        <b>${esc(o.name)}</b><span class="muted small">${o.unlocked ? (o.id === f.outfit ? 'wearing' : '&nbsp;') : `🔒 ${esc(o.how)}`}</span></button>`).join('')}</div>
    </section>

    <section class="card">
      <div class="block-head"><h2 class="display" style="font-size:18px;margin:0">Achievements ${info('ach', 'achievements')}</h2><span class="muted small">🏅 ${medals} of ${f.achievements.length * 3} medals</span></div>
      <div class="achgrid">${f.achievements.map((a) => `<div class="ach t${a.tier}">
        <div class="ach-medal" style="--m:${MEDAL[a.tier]}">${a.icon}</div>
        <div class="ach-body"><div class="ach-top"><b>${esc(a.name)}</b><span class="ach-dots">${[1, 2, 3].map((k) => `<i class="${a.tier >= k ? 'on' : ''}" style="--m:${MEDAL[k]}"></i>`).join('')}</span></div>
          <div class="muted small">${esc(a.what)}</div>
          ${a.next !== null ? `<div class="achbar"><i style="width:${a.pct}%"></i></div>
            <div class="small">${a.value} / ${a.next} ${esc(a.unit)}${a.next === 1 ? '' : 's'} · next: ${['Bronze', 'Silver', 'Gold'][a.tier]} <span class="muted">(+${[10, 25, 60][a.tier]} light)</span></div>`
          : '<div class="small" style="color:var(--c-yellow)">★ Gold! All done.</div>'}
        </div></div>`).join('')}</div>
    </section>

    <section class="card" style="display:flex;align-items:center;justify-content:space-between;gap:14px">
      <div><h2 style="margin:0 0 4px;font-size:16px">Lumi in lessons</h2><div class="muted small">Lumi sits in the corner of the lesson and cheers you on.</div></div>
      <button class="switch${f.show_in_lessons ? ' on' : ''}" id="lumiShow" role="switch" aria-checked="${f.show_in_lessons}" aria-label="Show Lumi in lessons"><span></span></button>
    </section>
  </main>`);
  document.querySelectorAll('[data-outfit]').forEach((b) => {
    b.onclick = async () => { await api('/api/friend', { outfit: b.dataset.outfit }); viewLumi(); };
  });
  $('#lumiShow').onclick = async () => {
    const on = $('#lumiShow').getAttribute('aria-checked') !== 'true';
    $('#lumiShow').setAttribute('aria-checked', String(on));
    $('#lumiShow').classList.toggle('on', on);
    await api('/api/friend', { show_in_lessons: on });
    toast(on ? 'Lumi will join your lessons ✨' : 'Lumi will wait on the Lumi page');
  };
  lumiNews(f);
}

// ---------------------------------------------------------------- celebrations
// After a lesson (and on Home / Lumi) new medals and a new stage are celebrated once.
async function lumiNews(given = null) {
  const f = given || await api('/api/friend').catch(() => null);
  if (!f || $('#lumiParty')) return;
  const { tiers, grew } = f.news;
  if (!f.first_time && !tiers.length && grew == null) return;
  const box = document.createElement('div');
  box.id = 'lumiParty';
  box.className = 'lumi-party';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  const tierName = ['', 'Bronze', 'Silver', 'Gold'];
  const list = tiers.slice(0, 5).map((t) => `<li><span class="ach-medal sm" style="--m:${MEDAL[t.tier]}">${t.icon}</span><b>${esc(t.name)}</b> · ${tierName[t.tier]}</li>`).join('')
    + (tiers.length > 5 ? `<li class="muted">…and ${tiers.length - 5} more</li>` : '');
  const title = f.first_time ? 'Meet Lumi!' : grew != null ? `Lumi grew into a ${esc(f.stages[grew].name)}!` : tiers.length === 1 ? 'New medal!' : 'New medals!';
  const text = f.first_time
    ? "I'm a little firefly. Every minute you really focus gives me light, and with enough light I grow. Good habits win medals that give extra light!"
      + (tiers.length ? ` You already earned ${tiers.length} medal${tiers.length === 1 ? '' : 's'}:` : '')
    : grew != null ? esc(f.stages[grew].line) : 'Each medal gives Lumi extra light ✨';
  box.innerHTML = `<div class="card lumi-party-card">
    <div class="confetti" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--d:${(i % 6) * 0.15}s;--c:${['var(--c-yellow)', 'var(--c-pink)', 'var(--c-blue)', 'var(--c-green)', 'var(--c-violet)', 'var(--c-orange)'][i % 6]}"></i>`).join('')}</div>
    ${lumiSVG({ mood: 'party', stage: f.stage.index, outfit: f.outfit, size: 150 })}
    <h2 class="display">${title}</h2><p>${text}</p>
    ${list ? `<ul class="partylist">${list}</ul>` : ''}
    <button class="btn primary big" id="partyOk">${f.first_time ? "Let's go! ✨" : 'Yay! ✨'}</button></div>`;
  document.body.appendChild(box);
  const close = async () => { box.remove(); await api('/api/friend', { seen: true }).catch(() => {}); };
  $('#partyOk').onclick = close;
  $('#partyOk').focus();
  box.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}
