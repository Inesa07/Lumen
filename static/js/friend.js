// friend.js: Lumi the firefly. Draws Lumi (SVG), picks its mood from what the camera sees,
// shows it in lessons and on Home, and runs the Lumi page with its wardrobe and achievements.
// The rules (light, stages, achievements) live in src/core/friend.js.
'use strict';

// ---------------------------------------------------------------- drawing
// Lumi is one SVG. Its mood is a CSS class (m-happy, m-wait, m-sleepy, m-rest, m-party, m-hello):
// the class decides which eyes and mouth are visible and how it moves (static/style.css, "Lumi").
const STAGE_SCALE = [0.6, 0.7, 0.8, 0.88, 0.95, 1];
let lumiSeq = 0;

function lumiSVG({ mood = 'happy', stage = 0, outfit = 'none', extra = null, size = 120, locked = false, label = 'Lumi the firefly' } = {}) {
  const hat = ['cap', 'crown', 'headphones'].includes(outfit);   // holiday hats only when the head is free
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
      ${extra === 'santa' && !hat ? '<g><path d="M40 33q20-26 40 0z" fill="#E53935"/><path d="M62 12q14 2 18 14" fill="none" stroke="#E53935" stroke-width="6" stroke-linecap="round"/><circle cx="81" cy="27" r="4.5" fill="#fff"/><rect x="37" y="29" width="46" height="7" rx="3.5" fill="#fff"/></g>' : ''}
      ${extra === 'party' && !hat ? '<g><path d="M50 30l10-24 10 24z" fill="#5AA9FF"/><path d="M53 23l14 0M56 15l8 0" stroke="#F2C14E" stroke-width="2.4"/><circle cx="60" cy="6" r="3.5" fill="#F06BA8"/></g>' : ''}
    </g>
  </g>
  ${extra === 'pumpkin' ? '<g transform="translate(96 98)"><ellipse rx="11" ry="9" fill="#FF8A2A"/><ellipse rx="5" ry="9" fill="#FF9F45"/><path d="M0-8q1-6 5-7" stroke="#3E8E41" stroke-width="2.5" fill="none"/><path d="M-5-2l2 2-2 1zM5-2l-2 2 2 1zM-4 3q4 3 8 0" fill="#5A2A00" stroke="#5A2A00" stroke-width="1"/></g>' : ''}
  ${extra === 'heart' ? '<path class="heartfloat" d="M98 30c-4-6-13-2-10 5l10 10 10-10c3-7-6-11-10-5z" fill="#F06BA8"/>' : ''}
  ${extra === 'flowers' ? `<g transform="translate(98 100)">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="3.6" ry="6" fill="#FFB3D1" transform="rotate(${a}) translate(0 -6)"/>`).join('')}<circle r="3.4" fill="#F2C14E"/><path d="M0 8v14" stroke="#3E8E41" stroke-width="2.5"/></g>` : ''}
  ${extra === 'santa' || extra === 'snow' ? '<g class="snow" fill="#fff">' + [[14, 20], [104, 40], [20, 90], [100, 100], [60, 8]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="2" style="animation-delay:${i * 0.6}s"/>`).join('') + '</g>' : ''}
  ${extra === 'party' ? '<g class="snow">' + [[14, 20, '#F06BA8'], [104, 40, '#5AA9FF'], [20, 90, '#F2C14E'], [100, 100, '#3FCF8E'], [96, 12, '#9B8CFF']].map(([x, y, c], i) => `<rect x="${x}" y="${y}" width="4" height="6" rx="1" fill="${c}" style="animation-delay:${i * 0.5}s"/>`).join('') + '</g>' : ''}
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

// ---------------------------------------------------------------- time of day and holidays
function lumiTime(d = new Date()) {
  const h = d.getHours();
  return h >= 5 && h < 11 ? 'morning' : h < 17 ? 'day' : h < 21 ? 'evening' : 'night';
}
const TIME_LINES = {
  morning: ['Good morning! I drank some dew and I am ready ☀️', 'Morning brains learn fast. Shall we?', 'Rise and shine! ✨'],
  day: ['Hi! A good time to learn something new 📖', 'I saved some light for you today 🔆'],
  evening: ['Good evening! My light is extra cosy now 🌆', 'A little learning before the stars come out?'],
  night: ["It's late… Sleep helps your brain keep what you learned 🌙", "I'm getting sleepy. Shall we continue tomorrow? 💤"],
};
/** A holiday Lumi celebrates today: an accessory and a line. */
function lumiHoliday(f, d = new Date()) {
  const md = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const between = (a, b) => (a <= b ? md >= a && md <= b : md >= a || md <= b);
  if (f && f.birthday === md) return { id: 'birthday', extra: 'party', line: 'Happy birthday!! 🎂 Today I glow just for you!' };
  if (md === '06-01') return { id: 'children', extra: 'party', line: "Happy Children's Day! 🎈" };
  if (between('12-20', '01-07')) return { id: 'newyear', extra: 'santa', line: 'Happy New Year! ❄️ May it be full of light!' };
  if (between('10-24', '11-01')) return { id: 'halloween', extra: 'pumpkin', line: 'Boo! 🎃 Happy Halloween! Even pumpkins love to learn.' };
  if (between('02-13', '02-14')) return { id: 'valentine', extra: 'heart', line: 'I love learning with you 💖' };
  if (between('03-07', '03-08')) return { id: 'spring', extra: 'flowers', line: 'Spring flowers for you! 🌷' };
  return null;
}
/** Lumi's mood outside lessons: sleepy at night, waving otherwise. */
const restingMood = () => (lumiTime() === 'night' ? 'sleepy' : 'hello');
function greetLine(f) {
  const hol = lumiHoliday(f);
  if (hol) return hol.line;
  return pick(TIME_LINES[lumiTime()]);
}

// ---------------------------------------------------------------- sounds (soft, can be turned off)
let lumiAudio = null;
function lumiSound(kind, f = lumiLive.info) {
  if (!f || f.sound === false) return;
  try {
    lumiAudio = lumiAudio || new (window.AudioContext || window.webkitAudioContext)();
    const notes = { medal: [523, 659, 784, 1047], grow: [392, 523, 659, 784, 1047, 1319], quest: [659, 988], light: [1568] }[kind] || [880];
    const vol = kind === 'light' ? 0.035 : 0.12, step = kind === 'grow' ? 0.11 : 0.13;
    notes.forEach((fr, i) => {
      const o = lumiAudio.createOscillator(), g = lumiAudio.createGain();
      o.type = kind === 'light' ? 'sine' : 'triangle'; o.frequency.value = fr;
      const t = lumiAudio.currentTime + i * step;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      o.connect(g).connect(lumiAudio.destination);
      o.start(t); o.stop(t + 0.5);
    });
  } catch { /* sound is optional */ }
}

// ---------------------------------------------------------------- Lumi in a lesson
const lumiLive = { info: null, key: '', said: 0, partyUntil: 0, hidden: false, focused: null, gained: 0, bedtime: false };
const JOURNEY = [['Forest', '🌲', '#2E7D4F'], ['Mountains', '⛰️', '#6B6F8E'], ['Sea', '🌊', '#2F7FE0'], ['Desert', '🏜️', '#C98A3A'], ['Clouds', '☁️', '#7FA7D9'], ['Stars', '✨', '#6D4FC8']];

async function lumiLesson(d) {
  const appEl = $('#app');
  if (!appEl) return;
  if (!lumiLive.info) {
    lumiLive.info = { loading: true };
    lumiLive.info = await api('/api/friend').catch(() => ({ show_in_lessons: false }));
    Object.assign(lumiLive, { focused: null, gained: 0, bedtime: false, key: '' });
  }
  const f = lumiLive.info;
  if (f.loading || !f.show_in_lessons) return;
  const hol = lumiHoliday(f);
  let dock = $('#lumiDock');
  if (!dock) {
    dock = document.createElement('div');
    dock.id = 'lumiDock';
    dock.className = 'lumi-dock';
    dock.innerHTML = `<div class="lumi-bubble" id="lumiBubble" role="status" aria-live="polite"></div>
      <div class="lumi-me"><button class="lumi-btn" id="lumiBtn" type="button" aria-label="Lumi: say it again"></button>
      <span class="lumi-gain" id="lumiGain" title="Light Lumi got in this lesson" hidden></span></div>`;
    appEl.appendChild(dock);
    // tap Lumi: hear the last line again; long words can be switched off on the Lumi page
    $('#lumiBtn').onclick = () => { lumiSay(); };
    lumiLive.key = '';
  }
  lumiJourney(d);
  const now = Date.now();
  // +1 light for every completed focused minute
  if (typeof d.focused_live === 'number') {
    if (lumiLive.focused !== null && d.focused_live > lumiLive.focused) {
      const n = d.focused_live - lumiLive.focused;
      lumiLive.gained += n;
      const plus = document.createElement('span');
      plus.className = 'plusone';
      plus.textContent = `+${n} 🔆`;
      dock.querySelector('.lumi-me').appendChild(plus);
      setTimeout(() => plus.remove(), 1800);
      lumiSound('light', f);
    }
    lumiLive.focused = d.focused_live;
    const g = $('#lumiGain');
    g.hidden = !lumiLive.gained;
    g.textContent = `🔆 +${lumiLive.gained}`;
  }
  if (d.eye_rest_result === 'done') { lumiLive.partyUntil = now + 5000; }
  let key = now < lumiLive.partyUntil ? 'party' : lumiMoodOf(d);
  const face = LINE_FACE[key];
  if (key !== lumiLive.key) {
    $('#lumiBtn').innerHTML = lumiSVG({ mood: face, stage: f.stage.index, outfit: f.outfit, extra: hol && hol.extra, size: 84 });
  }
  // the first words of a late lesson: a gentle bedtime reminder, once
  if (!lumiLive.bedtime && key === 'happy' && new Date().getHours() >= 22) {
    lumiLive.bedtime = true;
    lumiSay();
    $('#lumiBubble').textContent = pick(TIME_LINES.night);
    lumiLive.said = now; lumiLive.key = key;
    return;
  }
  if (key !== lumiLive.key || now - lumiLive.said > 90000) {
    lumiSay();
    $('#lumiBubble').textContent = key === 'happy' && hol && Math.random() < 0.3 ? hol.line : pick(LUMI_LINES[key]);
    lumiLive.said = now;
  }
  lumiLive.key = key;
}

/** Show the speech bubble for 8 seconds (unless the child hid Lumi's words). */
function lumiSay() {
  const b = $('#lumiBubble');
  if (!b) return;
  b.hidden = lumiLive.hidden;
  b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  clearTimeout(lumiLive.bubbleTimer);
  lumiLive.bubbleTimer = setTimeout(() => { b.hidden = true; }, 8000);
}

/** Each study block is a trip: Lumi flies through a landscape towards the next break. */
function lumiJourney(d) {
  const hero = $('#heroCard');
  if (!hero) return;
  let el = $('#journey');
  if (!el) {
    el = document.createElement('section');
    el.id = 'journey';
    el.className = 'card journey';
    ($('#breakCard') || hero).after(el);
  }
  const f = lumiLive.info;
  const [name, emo, col] = JOURNEY[Math.min(JOURNEY.length - 1, Math.max(0, (d.block || 1) - 1))];
  if (d.on_break) {
    el.style.setProperty('--jc', '#E57A2E');
    el.innerHTML = `<div class="journey-head"><b>🔥 Lumi rests by the campfire</b><span class="muted small">the next trip starts after the break</span></div>`;
    return;
  }
  const plan = d.plan_min || 45;
  const pct = Math.max(2, Math.min(100, Math.round(100 * (1 - (d.next_break_in ?? plan) / plan))));
  el.style.setProperty('--jc', col);
  const html = `<div class="journey-head"><b>${emo} Lumi's journey: ${name}</b><span class="muted small">trip ${d.block || 1} · ${d.next_break_in > 0 ? `${d.next_break_in} min to the next stop` : 'time for a stop!'}</span></div>
    <div class="journey-track"><div class="journey-path"><i style="width:${pct}%"></i></div>
      <div class="journey-lumi" style="left:${pct}%">${lumiSVG({ mood: 'happy', stage: f.stage.index, outfit: f.outfit, size: 40 })}</div>
      <span class="journey-flag" title="break">🏕️</span></div>`;
  if (el.dataset.k !== `${name}|${pct}`) { el.dataset.k = `${name}|${pct}`; el.innerHTML = html; }
}
// a new lesson page starts fresh (new outfit, new stage)
window.addEventListener('hashchange', () => { lumiLive.info = null; });

// ---------------------------------------------------------------- Lumi on Home
function questLine(q) {
  return `<div class="questline${q.done ? ' done' : ''}"><span>${q.icon}</span><span><b>Quest:</b> ${esc(q.text)}</span>
    <span class="qv">${q.done ? '✓' : `${q.value}/${q.need}`}</span></div>`;
}
function lumiHomeCard(f) {
  const hol = lumiHoliday(f);
  const line = f.first_time ? "Hi! I'm Lumi, your study firefly. Focus to give me light and I will grow!"
    : hol ? hol.line
    : lumiTime() === 'night' ? pick(TIME_LINES.night)
    : f.stage.next ? `${f.stage.next.need - f.light} more light and I become a <b>${esc(f.stage.next.name)}</b>!` : 'I am a Star firefly! Thank you for all the light ✨';
  return `<a class="card lumicard" href="#/lumi">
    <div class="lumicard-pic">${lumiSVG({ mood: restingMood(), stage: f.stage.index, outfit: f.outfit, extra: hol && hol.extra, size: 92 })}</div>
    <div class="lumicard-txt"><div class="eyebrow">Lumi · ${esc(f.stage.name)}</div>
      <div class="lumicard-line">${line}</div>
      <div class="lightbar" aria-label="Light ${f.light}"><i style="width:${f.stage.pct}%"></i></div>
      <div class="muted small">🔆 ${f.light} light${f.achievements.some((a) => a.tier) ? ` · 🏅 ${f.achievements.reduce((a, x) => a + x.tier, 0)} medals` : ''}</div>
      ${questLine(f.quest)}</div>
    <span class="chev">›</span></a>`;
}

// ---------------------------------------------------------------- the star sky
// FNV-1a + a final "avalanche" mix, so similar ids (L1, L2…) land far apart on the sky
const hash = (str) => {
  let h = 2166136261;
  for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
};
function skySVG(stars) {
  const W = 1000, H = 300;
  // weeks go left to right like a timeline across the sky; inside its column a week's lessons
  // are scattered and joined into a small constellation
  const wk = (ts) => { const d = new Date(ts * 1000); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); };
  const weeks = [...new Set(stars.map((s) => wk(s.started_at)))].sort((a, b) => a - b);
  const col = (W - 170) / Math.max(weeks.length, 6);
  const pts = stars.map((s) => {
    const wi = weeks.indexOf(wk(s.started_at));
    return { ...s, x: 40 + wi * col + (hash(`${s.lesson_id}x`) % Math.max(1, Math.round(col * 0.85))),
      y: 26 + (hash(`${s.lesson_id}y`) % (H - 52)), r: 1.6 + Math.min(4.4, s.focused_min / 12) };
  });
  const lines = [];
  for (let i = 1; i < pts.length; i += 1) if (wk(pts[i].started_at) === wk(pts[i - 1].started_at)) lines.push(`M${pts[i - 1].x} ${pts[i - 1].y}L${pts[i].x} ${pts[i].y}`);
  const date = (ts) => new Date(ts * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `<svg class="sky" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${stars.length} stars, one for every lesson">
    ${Array.from({ length: 70 }, (_, i) => { const h = hash(`bg${i}`); return `<circle cx="${h % W}" cy="${(h >>> 10) % H}" r="${0.4 + (h % 7) / 10}" fill="#fff" opacity="${0.15 + (h % 30) / 100}"/>`; }).join('')}
    <circle cx="${W - 70}" cy="54" r="26" fill="#FFF6C8" opacity=".9"/><circle cx="${W - 58}" cy="46" r="24" fill="#1A1440" opacity=".92"/>
    <path d="${lines.join('')}" stroke="rgba(255,240,180,.25)" stroke-width="1" fill="none"/>
    ${pts.map((p, i) => `<a href="#/report/${encodeURIComponent(p.id)}"><g class="star" style="animation-delay:${(i % 9) * 0.35}s">
      <circle cx="${p.x}" cy="${p.y}" r="${p.r * 3}" fill="${p.att >= 80 ? '#FFE27A' : '#CFE3FF'}" opacity=".15"/>
      <circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="${p.att >= 80 ? '#FFE27A' : '#EAF2FF'}"/>
      <title>${esc(p.title)}${p.cls ? ` · ${esc(p.cls)}` : ''} · ${date(p.started_at)} · ${p.focused_min} min focused</title></g></a>`).join('')}
  </svg>`;
}

// ---------------------------------------------------------------- the Lumi page
const MEDAL = ['var(--track)', '#CD7F32', '#C3CCD6', '#F2C14E'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

async function viewLumi() {
  closeStream();
  const f = await api('/api/friend');
  lumiLive.info = f;
  const medals = f.achievements.reduce((a, x) => a + x.tier, 0);
  const hol = lumiHoliday(f);
  const friends = Math.max(0, f.stage.index - 2);
  const [bm, bd] = (f.birthday || '-').split('-');
  app.innerHTML = shell('lumi', `
  ${pageHead(`${f.light} light · ${medals} medal${medals === 1 ? '' : 's'}`, 'Lumi', '', '')}
  <main class="wrap" style="display:flex;flex-direction:column;gap:22px">
    <section class="card lumi-hero tod-${lumiTime()}">
      <div class="lumi-stage-pic" id="lumiBig">
        ${friends ? `<div class="lumi-friends" aria-hidden="true">${Array.from({ length: friends }, (_, i) => `<i style="--h:${[160, 300, 30][i]};--t:${7 + i * 2}s;--dl:-${i * 2.3}s"></i>`).join('')}</div>` : ''}
        ${lumiSVG({ mood: lumiTime() === 'night' ? 'sleepy' : 'happy', stage: f.stage.index, outfit: f.outfit, extra: hol && hol.extra, size: 220 })}</div>
      <div class="lumi-hero-txt">
        <div class="eyebrow">Stage ${f.stage.index + 1} of ${f.stages.length} ${info('lumi', 'Lumi')}</div>
        <h1 class="display">${esc(f.stage.name)}</h1>
        <p class="muted">${esc(f.stage.line)}${friends ? ` ${friends === 1 ? 'A friend firefly' : `${friends} friend fireflies`} came to fly with Lumi!` : ''}</p>
        <div class="lightbar big"><i style="width:${f.stage.pct}%"></i></div>
        <div class="small">${f.stage.next ? `🔆 <b>${f.light}</b> / ${f.stage.next.need} light to <b>${esc(f.stage.next.name)}</b>` : `🔆 <b>${f.light}</b> light. Lumi is fully grown!`} ${info('light', 'light')}</div>
        <div class="lumi-say">💬 ${esc(f.first_time ? pick(LUMI_LINES.hello) : greetLine(f))}</div>
      </div>
    </section>

    <section class="card questcard${f.quest.done ? ' done' : ''}">
      <div class="quest-ic">${f.quest.icon}</div>
      <div style="flex:1"><div class="eyebrow">Quest of the day ${info('quest', 'quest')}</div><b>${esc(f.quest.text)}</b>
        <div class="achbar"><i style="width:${Math.round(100 * f.quest.value / f.quest.need)}%"></i></div>
        <div class="muted small">${f.quest.done ? 'Done! +15 light ✨ A new quest comes tomorrow.' : `${f.quest.value} / ${f.quest.need} ${esc(f.quest.unit)} · +15 light`}</div></div>
    </section>

    <section class="card skycard">
      <div class="sky-head"><h2 class="display" style="font-size:18px;margin:0">Lumi's sky</h2>
        <span class="small">${f.sky.length ? `${f.sky.length} star${f.sky.length === 1 ? '' : 's'}: one for every lesson` : 'Your first lesson lights the first star ✨'} ${info('sky', 'sky')}</span></div>
      ${skySVG(f.sky)}
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

    <section class="card lumi-settings">
      <h2 class="display" style="font-size:18px;margin:0">Lumi's settings</h2>
      <div class="lset"><div><b>Lumi in lessons</b><div class="muted small">Lumi sits in the corner, cheers you on and travels with you.</div></div>
        <button class="switch${f.show_in_lessons ? ' on' : ''}" id="lumiShow" role="switch" aria-checked="${f.show_in_lessons}" aria-label="Show Lumi in lessons"><span></span></button></div>
      <div class="lset"><div><b>Sounds</b><div class="muted small">A soft “ding” for medals, growing and quests. Turn off in a classroom or library.</div></div>
        <button class="switch${f.sound ? ' on' : ''}" id="lumiSoundSw" role="switch" aria-checked="${f.sound}" aria-label="Lumi sounds"><span></span></button></div>
      <div class="lset"><div><b>Birthday party 🎂</b><div class="muted small">Optional. Lumi celebrates with you. Only the month and day are saved, never the year.</div></div>
        <div class="bday"><select class="field" id="bdM" aria-label="Birthday month"><option value="">month</option>${MONTHS.map((m, i) => `<option value="${String(i + 1).padStart(2, '0')}"${bm === String(i + 1).padStart(2, '0') ? ' selected' : ''}>${m}</option>`).join('')}</select>
          <select class="field" id="bdD" aria-label="Birthday day"><option value="">day</option>${Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map((v) => `<option${bd === v ? ' selected' : ''}>${v}</option>`).join('')}</select></div></div>
    </section>
  </main>`);
  document.querySelectorAll('[data-outfit]').forEach((b) => {
    b.onclick = async () => { await api('/api/friend', { outfit: b.dataset.outfit }); viewLumi(); };
  });
  const sw = (sel, key, msgOn, msgOff) => {
    $(sel).onclick = async () => {
      const on = $(sel).getAttribute('aria-checked') !== 'true';
      $(sel).setAttribute('aria-checked', String(on));
      $(sel).classList.toggle('on', on);
      lumiLive.info = await api('/api/friend', { [key]: on });
      toast(on ? msgOn : msgOff);
      if (key === 'sound' && on) lumiSound('quest');
    };
  };
  sw('#lumiShow', 'show_in_lessons', 'Lumi will join your lessons ✨', 'Lumi will wait on the Lumi page');
  sw('#lumiSoundSw', 'sound', 'Sounds on 🔔', 'Sounds off 🔕');
  const saveBday = async () => {
    const m = $('#bdM').value, d = $('#bdD').value;
    if (!!m !== !!d) return;                     // wait until both are chosen (or both cleared)
    await api('/api/friend', { birthday: m && d ? `${m}-${d}` : null });
    toast(m && d ? 'Lumi wrote it down 🎂' : 'Birthday removed');
  };
  $('#bdM').onchange = saveBday; $('#bdD').onchange = saveBday;
  lumiNews(f);
}

// ---------------------------------------------------------------- celebrations
// After a lesson (and on Home / Lumi) new medals, a new stage and a finished quest are celebrated once.
async function lumiNews(given = null) {
  const f = given || await api('/api/friend').catch(() => null);
  if (!f || $('#lumiParty')) return;
  const { tiers, grew, quest } = f.news;
  if (!f.first_time && !tiers.length && grew == null && !quest) return;
  const box = document.createElement('div');
  box.id = 'lumiParty';
  box.className = 'lumi-party';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  const tierName = ['', 'Bronze', 'Silver', 'Gold'];
  const list = (quest ? `<li><span class="ach-medal sm" style="--m:var(--c-green)">${quest.icon}</span><b>Quest done!</b> · +15 light</li>` : '')
    + tiers.slice(0, 5).map((t) => `<li><span class="ach-medal sm" style="--m:${MEDAL[t.tier]}">${t.icon}</span><b>${esc(t.name)}</b> · ${tierName[t.tier]}</li>`).join('')
    + (tiers.length > 5 ? `<li class="muted">…and ${tiers.length - 5} more</li>` : '');
  const title = f.first_time ? 'Meet Lumi!' : grew != null ? `Lumi grew into a ${esc(f.stages[grew].name)}!`
    : tiers.length > 1 ? 'New medals!' : tiers.length ? 'New medal!' : 'Quest complete!';
  const text = f.first_time
    ? "I'm a little firefly. Every minute you really focus gives me light, and with enough light I grow. Good habits win medals that give extra light!"
      + (tiers.length ? ` You already earned ${tiers.length} medal${tiers.length === 1 ? '' : 's'}:` : '')
    : grew != null ? esc(f.stages[grew].line) : tiers.length ? 'Each medal gives Lumi extra light ✨' : 'You did the quest of the day. Lumi glows a little brighter!';
  box.innerHTML = `<div class="card lumi-party-card">
    <div class="confetti" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--d:${(i % 6) * 0.15}s;--c:${['var(--c-yellow)', 'var(--c-pink)', 'var(--c-blue)', 'var(--c-green)', 'var(--c-violet)', 'var(--c-orange)'][i % 6]}"></i>`).join('')}</div>
    ${lumiSVG({ mood: 'party', stage: f.stage.index, outfit: f.outfit, size: 150 })}
    <h2 class="display">${title}</h2><p>${text}</p>
    ${list ? `<ul class="partylist">${list}</ul>` : ''}
    <button class="btn primary big" id="partyOk">${f.first_time ? "Let's go! ✨" : 'Yay! ✨'}</button></div>`;
  document.body.appendChild(box);
  lumiSound(grew != null ? 'grow' : tiers.length ? 'medal' : 'quest', f);
  const close = async () => { box.remove(); await api('/api/friend', { seen: true }).catch(() => {}); };
  $('#partyOk').onclick = close;
  $('#partyOk').focus();
  box.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

// ---------------------------------------------------------------- Lumi on empty pages
// Any "empty" message on any page gets a small Lumi next to it (one observer for the whole app).
(() => {
  const root = document.getElementById('app');
  if (!root) return;
  const decorate = () => root.querySelectorAll('p.empty:not(.with-lumi)').forEach((p) => {
    p.classList.add('with-lumi');
    p.insertAdjacentHTML('afterbegin', `<span class="empty-lumi">${lumiSVG({ mood: 'hello', stage: 2, size: 76 })}</span>`);
  });
  new MutationObserver(decorate).observe(root, { childList: true, subtree: true });
})();
