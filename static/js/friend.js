// friend.js: Lumi the firefly. Draws Lumi (SVG), picks its mood from what the camera sees,
// shows it in lessons and on Home, and runs the Lumi page with its wardrobe and achievements.
// The rules (light, stages, achievements) live in src/core/friend.js.
'use strict';

// ---------------------------------------------------------------- drawing
// Lumi is one SVG. Its mood is a CSS class (m-happy, m-wait, m-sleepy, m-rest, m-party, m-hello):
// the class decides which eyes and mouth are visible and how it moves (static/style.css, "Lumi").
const STAGE_SCALE = [0.6, 0.7, 0.8, 0.88, 0.95, 1];
let lumiSeq = 0;

function lumiSVG({ mood = 'happy', stage = 0, outfit = 'none', extra = null, size = 120, locked = false, label = 'Lumi the firefly', dream = null } = {}) {
  // on the way to a dream (static/js/dream.js): 25 % the dream floats next to Lumi, 50 % a dream hat, 75 % a golden glow
  const dl = dream && !locked ? dream.level || 0 : 0;
  const dreamHat = dl >= 2 ? (DREAM_HATS[dream.look] || DREAM_HATS.party) : '';
  if (dreamHat && ['cap', 'crown', 'headphones', 'glasses', 'bow', 'flower'].includes(outfit)) outfit = 'none';
  if (dreamHat && (extra === 'santa' || extra === 'party')) extra = extra === 'santa' ? 'snow' : null;
  const hat = ['cap', 'crown', 'headphones'].includes(outfit) || !!dreamHat;   // holiday hats only when the head is free
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
  ${dl >= 3 ? `<circle class="dreamglow" cx="60" cy="66" r="50" fill="none" stroke="#FFD84A" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/>` : ''}
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
      ${dreamHat}
      ${extra === 'santa' && !hat ? '<g><path d="M40 33q20-26 40 0z" fill="#E53935"/><path d="M62 12q14 2 18 14" fill="none" stroke="#E53935" stroke-width="6" stroke-linecap="round"/><circle cx="81" cy="27" r="4.5" fill="#fff"/><rect x="37" y="29" width="46" height="7" rx="3.5" fill="#fff"/></g>' : ''}
      ${extra === 'party' && !hat ? '<g><path d="M50 30l10-24 10 24z" fill="#5AA9FF"/><path d="M53 23l14 0M56 15l8 0" stroke="#F2C14E" stroke-width="2.4"/><circle cx="60" cy="6" r="3.5" fill="#F06BA8"/></g>' : ''}
    </g>
  </g>
  ${dl >= 1 ? `<text class="dreamfloat" x="101" y="34" font-size="20" text-anchor="middle">${esc(dream.emoji || '⭐')}</text>` : ''}
  ${dl >= 4 ? '<g class="snow">' + [[14, 20, '#F06BA8'], [104, 52, '#5AA9FF'], [20, 90, '#F2C14E'], [100, 100, '#3FCF8E'], [30, 8, '#9B8CFF']].map(([x, y, c], i) => `<rect x="${x}" y="${y}" width="4" height="6" rx="1" fill="${c}" style="animation-delay:${i * 0.5}s"/>`).join('') + '</g>' : ''}
  ${extra === 'pumpkin' ? '<g transform="translate(96 98)"><ellipse rx="11" ry="9" fill="#FF8A2A"/><ellipse rx="5" ry="9" fill="#FF9F45"/><path d="M0-8q1-6 5-7" stroke="#3E8E41" stroke-width="2.5" fill="none"/><path d="M-5-2l2 2-2 1zM5-2l-2 2 2 1zM-4 3q4 3 8 0" fill="#5A2A00" stroke="#5A2A00" stroke-width="1"/></g>' : ''}
  ${extra === 'heart' ? '<path class="heartfloat" d="M98 30c-4-6-13-2-10 5l10 10 10-10c3-7-6-11-10-5z" fill="#F06BA8"/>' : ''}
  ${extra === 'flowers' ? `<g transform="translate(98 100)">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="3.6" ry="6" fill="#FFB3D1" transform="rotate(${a}) translate(0 -6)"/>`).join('')}<circle r="3.4" fill="#F2C14E"/><path d="M0 8v14" stroke="#3E8E41" stroke-width="2.5"/></g>` : ''}
  ${extra === 'santa' || extra === 'snow' ? '<g class="snow" fill="#fff">' + [[14, 20], [104, 40], [20, 90], [100, 100], [60, 8]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="2" style="animation-delay:${i * 0.6}s"/>`).join('') + '</g>' : ''}
  ${extra === 'party' ? '<g class="snow">' + [[14, 20, '#F06BA8'], [104, 40, '#5AA9FF'], [20, 90, '#F2C14E'], [100, 100, '#3FCF8E'], [96, 12, '#9B8CFF']].map(([x, y, c], i) => `<rect x="${x}" y="${y}" width="4" height="6" rx="1" fill="${c}" style="animation-delay:${i * 0.5}s"/>`).join('') + '</g>' : ''}
</svg>`;
}

// Dream hats (one per kind of dream, see LOOKS in src/core/dream.js). Drawn on Lumi's head (centre 60,50, r 23).
const DREAM_HATS = {
  safari: '<g><ellipse cx="60" cy="31" rx="28" ry="5.5" fill="#C9A86A"/><path d="M42 31q0-18 18-18t18 18z" fill="#DCC189"/><path d="M42.5 28.5h35" stroke="#7A5C30" stroke-width="3.2"/><circle cx="60" cy="14.5" r="2.2" fill="#B8955A"/></g>',
  sport: '<g><path d="M38 37q22-12 44 0l-.8 5.5q-21-11-42.4 0z" fill="#E53935"/><path d="M80 37.5l9 3-7 4z" fill="#E53935"/><path d="M40 39.6q20-9.6 40 0" stroke="#fff" stroke-width="1.4" fill="none"/></g>',
  cinema: '<g><rect x="42" y="42" width="16" height="12" rx="3" fill="#E53935" fill-opacity=".7" stroke="#241A4A" stroke-width="2"/><rect x="62" y="42" width="16" height="12" rx="3" fill="#2F7FE0" fill-opacity=".7" stroke="#241A4A" stroke-width="2"/><path d="M58 47h4M42 46l-5-2M78 46l5-2" stroke="#241A4A" stroke-width="2"/></g>',
  gamer: '<g><path d="M37 50q0-28 23-28t23 28" fill="none" stroke="#2E9E5B" stroke-width="4"/><rect x="32" y="44" width="9" height="14" rx="4" fill="#3FCF8E"/><rect x="79" y="44" width="9" height="14" rx="4" fill="#3FCF8E"/><path d="M36 57q1 9 13 9" fill="none" stroke="#2E9E5B" stroke-width="2.4"/><circle cx="50" cy="66" r="2.6" fill="#2E9E5B"/></g>',
  artist: '<g><ellipse cx="57" cy="30" rx="21" ry="8" fill="#E5484D" transform="rotate(-12 57 30)"/><path d="M55 22.5l1-5" stroke="#B83238" stroke-width="3" stroke-linecap="round"/></g>',
  chef: '<g><rect x="46" y="22" width="28" height="9" rx="2" fill="#fff" stroke="#E2E2EA"/><circle cx="50" cy="17" r="8" fill="#fff"/><circle cx="60" cy="12.5" r="9.5" fill="#fff"/><circle cx="70" cy="17" r="8" fill="#fff"/></g>',
  travel: '<g><ellipse cx="60" cy="30" rx="30" ry="6" fill="#E9C46A"/><path d="M45 30q0-15 15-15t15 15z" fill="#F4D58D"/><path d="M45.5 26.5q14.5 4 29 0" stroke="#E76F51" stroke-width="3.4" fill="none"/></g>',
  party: '<g><path d="M50 30l10-24 10 24z" fill="#9B8CFF"/><path d="M53 23l14 0M56 15l8 0" stroke="#FFD84A" stroke-width="2.4"/><circle cx="60" cy="6" r="3.5" fill="#F06BA8"/></g>',
};

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
/** Lumi's lines in the chosen language (falls back to English). */
const lines = (key) => (LUMI_I18N[LANG] && LUMI_I18N[LANG][key]) || LUMI_LINES[key];
const timeLines = (key) => (TIME_I18N[LANG] && TIME_I18N[LANG][key]) || TIME_LINES[key];

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
  const h = lumiHolidayEn(f, d);
  if (h && HOLIDAY_I18N[LANG] && HOLIDAY_I18N[LANG][h.id]) h.line = HOLIDAY_I18N[LANG][h.id];
  return h;
}
function lumiHolidayEn(f, d) {
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
  return pick(timeLines(lumiTime()));
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
    $('#lumiBtn').innerHTML = lumiSVG({ mood: face, stage: f.stage.index, outfit: f.outfit, extra: hol && hol.extra, size: 84, dream: f.dream });
  }
  // the first words of a late lesson: a gentle bedtime reminder, once
  if (!lumiLive.bedtime && key === 'happy' && new Date().getHours() >= 22) {
    lumiLive.bedtime = true;
    lumiSay();
    $('#lumiBubble').textContent = pick(timeLines('night'));
    lumiLive.said = now; lumiLive.key = key;
    return;
  }
  if (key !== lumiLive.key || now - lumiLive.said > 90000) {
    lumiSay();
    $('#lumiBubble').textContent = key === 'happy' && hol && Math.random() < 0.3 ? hol.line : pick(lines(key));
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
  const [nameEn, emo, col] = JOURNEY[Math.min(JOURNEY.length - 1, Math.max(0, (d.block || 1) - 1))];
  if (d.on_break) {
    el.style.setProperty('--jc', '#E57A2E');
    el.innerHTML = `<div class="journey-head"><b>${t('🔥 Lumi rests by the campfire')}</b><span class="muted small">${t('the next trip starts after the break')}</span></div>`;
    return;
  }
  const plan = d.plan_min || 45;
  const pct = Math.max(2, Math.min(100, Math.round(100 * (1 - (d.next_break_in ?? plan) / plan))));
  el.style.setProperty('--jc', col);
  const name = t(nameEn);
  const html = `<div class="journey-head"><b>${t("{emo} Lumi's journey: {name}", { emo, name })}</b><span class="muted small">${d.next_break_in > 0 ? t('trip {a} · {b} min to the next stop', { a: d.block || 1, b: d.next_break_in }) : t('trip {a} · time for a stop!', { a: d.block || 1 })}</span></div>
    <div class="journey-track"><div class="journey-path"><i style="width:${pct}%"></i></div>
      <div class="journey-lumi" style="left:${pct}%">${lumiSVG({ mood: 'happy', stage: f.stage.index, outfit: f.outfit, size: 40 })}</div>
      <span class="journey-flag" title="break">🏕️</span></div>`;
  if (el.dataset.k !== `${name}|${pct}`) { el.dataset.k = `${name}|${pct}`; el.innerHTML = html; }
}
// a new lesson page starts fresh (new outfit, new stage)
window.addEventListener('hashchange', () => { lumiLive.info = null; });

// ---------------------------------------------------------------- Lumi on Home
function questLine(q) {
  return `<div class="questline${q.done ? ' done' : ''}"><span>${q.icon}</span><span><b>${t('Quest:')}</b> ${esc(t(q.text))}</span>
    <span class="qv">${q.done ? '✓' : `${q.value}/${q.need}`}</span></div>`;
}
function lumiHomeCard(f, g = null) {
  const hol = lumiHoliday(f);
  const line = f.first_time ? t("Hi! I'm Lumi, your study firefly. Focus to give me light and I will grow!")
    : hol ? hol.line
    : lumiTime() === 'night' ? pick(timeLines('night'))
    : f.stage.next ? t('{n} more light and I become a {name}!', { n: f.stage.next.need - f.light, name: `<b>${esc(t(f.stage.next.name))}</b>` }) : t('I am a Star firefly! Thank you for all the light ✨');
  return `<a class="card lumicard" href="#/lumi">
    <div class="lumicard-pic">${lumiSVG({ mood: restingMood(), stage: f.stage.index, outfit: f.outfit, extra: hol && hol.extra, size: 92, dream: f.dream })}</div>
    <div class="lumicard-txt"><div class="eyebrow">${t('Lumi · {name}', { name: esc(t(f.stage.name)) })}</div>
      <div class="lumicard-line">${line}</div>
      <div class="lightbar" aria-label="Light ${f.light}"><i style="width:${f.stage.pct}%"></i></div>
      <div class="muted small">🔆 ${t('{n} light', { n: f.light })}${f.achievements.some((a) => a.tier) ? ` · 🏅 ${t('{n} medals', { n: f.achievements.reduce((a, x) => a + x.tier, 0) })}` : ''}</div>
      ${g ? `<div class="todayline"><span>🎯 ${t('Today')}: <b>${hm(g.today)}</b> / ${hm(g.goal_min)}</span><span>🔥 ${g.streak === 1 ? t('1 day in a row') : t('{n} days in a row', { n: g.streak })}</span></div>
        <div class="lightbar goalbar"><i style="width:${g.pct}%"></i></div>` : ''}
      ${questLine(f.quest)}${f.dream ? dreamLine(f.dream) : ''}</div>
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

/** How to unlock an outfit, in the chosen language. */
function outfitHow(o, stages = []) {
  if (o.stage != null) return t('Reach stage “{name}”', { name: t((stages[o.stage] || {}).name || '') });
  const a = { lessons: 'Learner', deep: 'Deep diver', review: 'Memory master', streak: 'Day by day', eyes: 'Eye care' }[o.ach[0]];
  return `${t(a || o.ach[0])} · ${t(['', 'Bronze', 'Silver', 'Gold'][o.ach[1]])}`;
}

// ---------------------------------------------------------------- medals
const MEDAL = ['var(--track)', '#CD7F32', '#C3CCD6', '#F2C14E'];
// metal colours: light, middle, dark (for the shine) and the ribbon colours
const METAL = {
  1: ['#F3C08C', '#C07A3A', '#7A4419', '#C0392B', '#2E86DE'],
  2: ['#FFFFFF', '#C9D1DA', '#808A96', '#2E86DE', '#E8EEF5'],
  3: ['#FFF4B0', '#F2C14E', '#A87A08', '#E74C3C', '#F7DC6F'],
};
let medalSeq = 0;
/** A real medal: ribbon + metal disc with the achievement's picture. Not earned = grey and faded. */
function medalSVG(tier, icon, earned, size = 64, label = '') {
  const id = `md${medalSeq += 1}`;
  const [l, m, d, r1, r2] = earned ? METAL[tier] : ['#5A6070', '#454B5A', '#2E3340', '#3A3F4C', '#4A505E'];
  return `<svg class="medal${earned ? ' won' : ''}" width="${size}" height="${Math.round(size * 1.3)}" viewBox="0 0 100 130" role="img" aria-label="${esc(label)}">
    <defs><radialGradient id="${id}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${l}"/><stop offset=".55" stop-color="${m}"/><stop offset="1" stop-color="${d}"/></radialGradient></defs>
    <path d="M28 0h20l12 48H40z" fill="${r1}"/><path d="M52 0h20L60 48H40z" fill="${r2}"/><path d="M38 40h24v12H38z" fill="${d}"/>
    <circle cx="50" cy="88" r="38" fill="url(#${id})" stroke="${d}" stroke-width="3"/>
    <circle cx="50" cy="88" r="29" fill="none" stroke="${l}" stroke-opacity=".7" stroke-width="2" stroke-dasharray="3 3"/>
    <text x="50" y="99" text-anchor="middle" font-size="30" style="${earned ? '' : 'filter:grayscale(1);opacity:.45'}">${icon}</text>
    ${earned ? '' : '<g transform="translate(70 112)"><circle r="11" fill="#1B202B" stroke="#3A4152"/><rect x="-5" y="-2" width="10" height="8" rx="1.5" fill="#A3AABB"/><path d="M-3-2v-3a3 3 0 0 1 6 0v3" fill="none" stroke="#A3AABB" stroke-width="1.6"/></g>'}
  </svg>`;
}
function medalsSection(f, medals) {
  // the shelf shows the best medal of each achievement, gold first
  const won = f.achievements.filter((a) => a.tier).map((a) => ({ a, k: a.tier })).sort((x, y) => y.k - x.k);
  const tierName = ['', 'Bronze', 'Silver', 'Gold'];
  return `<section class="card medalcase">
      <div class="block-head"><h2 class="display" style="font-size:18px;margin:0">🏅 ${t('My medals')} ${info('ach', 'achievements')}</h2>
        <span class="muted small">${t('🏅 {a} of {b} medals', { a: medals, b: f.achievements.length * 3 })}</span></div>
      <div class="shelf">${won.length ? won.map(({ a, k }) => `<div class="shelf-item" title="${esc(t(a.name))} · ${t(tierName[k])}">
          ${medalSVG(k, a.icon, true, 62, `${t(a.name)} · ${t(tierName[k])}`)}<span>${esc(t(a.name))}</span></div>`).join('')
        : `<p class="muted" style="margin:0">${t('No medals yet. Your first one is very close: finish a lesson!')}</p>`}</div>
      <h3 class="ach-h">${t('All medals')}</h3>
      <div class="achgrid">${f.achievements.map((a) => `<div class="ach t${a.tier}">
        <div class="ach-body"><div class="ach-top"><b>${a.icon} ${esc(t(a.name))}</b></div>
          <div class="muted small">${esc(t(a.what))}</div>
          <div class="ach-medals">${[1, 2, 3].map((k) => `<div class="ach-m${a.tier >= k ? ' won' : ''}">${medalSVG(k, a.icon, a.tier >= k, 44, `${t(a.name)} · ${t(tierName[k])}`)}
            <span>${a.tiers[k - 1]}</span></div>`).join('')}</div>
          ${a.next !== null ? `<div class="achbar"><i style="width:${a.pct}%"></i></div>
            <div class="small">${t('{a} / {b} {unit} · next: {tier}', { a: a.value, b: a.next, unit: esc(tUnit(a.unit, a.next)), tier: t(tierName[a.tier + 1]) })} <span class="muted">${t('(+{n} light)', { n: [10, 25, 60][a.tier] })}</span></div>`
          : `<div class="small" style="color:var(--c-yellow)">${t('★ Gold! All done.')}</div>`}
        </div></div>`).join('')}</div>
    </section>`;
}

// ---------------------------------------------------------------- the Lumi page
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
  ${pageHead(t('{a} light · {b} medals', { a: f.light, b: medals }), 'Lumi', '', '')}
  <main class="wrap" style="display:flex;flex-direction:column;gap:22px">
    <section class="card lumi-hero tod-${lumiTime()}">
      <div class="lumi-stage-pic" id="lumiBig">
        ${friends ? `<div class="lumi-friends" aria-hidden="true">${Array.from({ length: friends }, (_, i) => `<i style="--h:${[160, 300, 30][i]};--t:${7 + i * 2}s;--dl:-${i * 2.3}s"></i>`).join('')}</div>` : ''}
        ${lumiSVG({ mood: lumiTime() === 'night' ? 'sleepy' : 'happy', stage: f.stage.index, outfit: f.outfit, extra: hol && hol.extra, size: 220, dream: f.dream })}</div>
      <div class="lumi-hero-txt">
        <div class="eyebrow">${t('Stage {a} of {b}', { a: f.stage.index + 1, b: f.stages.length })} ${info('lumi', 'Lumi')}</div>
        <h1 class="display">${esc(t(f.stage.name))}</h1>
        <p class="muted">${esc(t(f.stage.line))}${friends ? ` ${friends === 1 ? t('A friend firefly came to fly with Lumi!') : t('{n} friend fireflies came to fly with Lumi!', { n: friends })}` : ''}</p>
        <div class="lightbar big"><i style="width:${f.stage.pct}%"></i></div>
        <div class="small">🔆 ${f.stage.next ? t('{a} / {b} light to {name}', { a: `<b>${f.light}</b>`, b: f.stage.next.need, name: `<b>${esc(t(f.stage.next.name))}</b>` }) : t('{n} light. Lumi is fully grown!', { n: `<b>${f.light}</b>` })} ${info('light', 'light')}</div>
        <div class="lumi-say">💬 ${esc(f.first_time ? pick(lines('hello')) : greetLine(f))}</div>
      </div>
    </section>

    ${dreamSection()}

    <section class="card questcard${f.quest.done ? ' done' : ''}">
      <div class="quest-ic">${f.quest.icon}</div>
      <div style="flex:1"><div class="eyebrow">Quest of the day ${info('quest', 'quest')}</div><b>${esc(t(f.quest.text))}</b>
        <div class="achbar"><i style="width:${Math.round(100 * f.quest.value / f.quest.need)}%"></i></div>
        <div class="muted small">${f.quest.done ? t('Done! +15 light ✨ A new quest comes tomorrow.') : t('{a} / {b} {unit} · +15 light', { a: f.quest.value, b: f.quest.need, unit: esc(tUnit(f.quest.unit, f.quest.need)) })}</div></div>
    </section>

${medalsSection(f, medals)}

    <section class="card diarycard">
      <div class="block-head"><h2 class="display" style="font-size:18px;margin:0">📔 Lumi's diary</h2><span class="muted small">${t('Lumi writes a few lines after every lesson')}</span></div>
      ${diaryBook(f)}
    </section>

    <section class="card">
      <h2 class="display" style="font-size:18px;margin:0 0 14px">How Lumi grows</h2>
      <div class="stagepath">${f.stages.map((s, i) => `<div class="stagestep${i === f.stage.index ? ' now' : ''}${i > f.stage.index ? ' later' : ''}">
        ${lumiSVG({ mood: i <= f.stage.index ? 'happy' : 'rest', stage: i, size: 64, locked: i > f.stage.index, label: s.name })}
        <b>${i > f.stage.index ? '?' : esc(t(s.name))}</b><span class="muted small">${t('{n} light', { n: s.need })}</span></div>`).join('')}</div>
    </section>

    <section class="card">
      <div class="block-head"><h2 class="display" style="font-size:18px;margin:0">Wardrobe</h2><span class="muted small">tap to dress Lumi</span></div>
      <div class="wardrobe">${f.outfits.map((o) => `<button type="button" class="outfit${o.id === f.outfit ? ' on' : ''}" data-outfit="${o.id}" ${o.unlocked ? '' : 'disabled'} aria-pressed="${o.id === f.outfit}">
        ${lumiSVG({ mood: 'happy', stage: Math.max(2, f.stage.index), outfit: o.id, size: 70, locked: !o.unlocked, label: o.name })}
        <b>${esc(t(o.name))}</b><span class="muted small">${o.unlocked ? (o.id === f.outfit ? t('wearing') : '&nbsp;') : `🔒 ${esc(outfitHow(o, f.stages))}`}</span></button>`).join('')}</div>
    </section>

    <section class="card lumi-settings">
      <h2 class="display" style="font-size:18px;margin:0">Lumi's settings</h2>
      <div class="lset"><div><b>Lumi in lessons</b><div class="muted small">Lumi sits in the corner, cheers you on and travels with you.</div></div>
        <button class="switch${f.show_in_lessons ? ' on' : ''}" id="lumiShow" role="switch" aria-checked="${f.show_in_lessons}" aria-label="Show Lumi in lessons"><span></span></button></div>
      <div class="lset"><div><b>Sounds</b><div class="muted small">A soft “ding” for medals, growing and quests. Turn off in a classroom or library.</div></div>
        <button class="switch${f.sound ? ' on' : ''}" id="lumiSoundSw" role="switch" aria-checked="${f.sound}" aria-label="Lumi sounds"><span></span></button></div>
      <div class="lset"><div><b>Birthday party 🎂</b><div class="muted small">Optional. Lumi celebrates with you. Only the month and day are saved, never the year.</div></div>
        <div class="bday"><select class="field" id="bdM" aria-label="Birthday month"><option value="">month</option>${MONTHS.map((m, i) => `<option value="${String(i + 1).padStart(2, '0')}"${bm === String(i + 1).padStart(2, '0') ? ' selected' : ''}>${new Date(2026, i, 1).toLocaleDateString(LOCALE(), { month: 'long' })}</option>`).join('')}</select>
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
  wireDiary(f);
  drawDream();
  lumiNews(f);
  if (typeof pushWidget === 'function') pushWidget();
}

// ---------------------------------------------------------------- celebrations
// After a lesson (and on Home / Lumi) new medals, a new stage and a finished quest are celebrated once.
async function lumiNews(given = null) {
  const f = given || await api('/api/friend').catch(() => null);
  if (!f || $('#lumiParty') || location.hash === '#/mini') return;   // not in the small window
  const { tiers, grew, quest } = f.news;
  if (!f.first_time && !tiers.length && grew == null && !quest) { dreamNews(); return; }
  const box = document.createElement('div');
  box.id = 'lumiParty';
  box.className = 'lumi-party';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  const tierName = ['', 'Bronze', 'Silver', 'Gold'];
  const list = (quest ? `<li><span class="ach-medal sm" style="--m:var(--c-green)">${quest.icon}</span><b>${t('Quest done!')}</b> · ${t('(+{n} light)', { n: 15 })}</li>` : '')
    + tiers.slice(0, 5).map((m) => `<li>${medalSVG(m.tier, m.icon, true, 30)}<b>${esc(t(m.name))}</b> · ${t(tierName[m.tier])}</li>`).join('')
    + (tiers.length > 5 ? `<li class="muted">…and ${tiers.length - 5} more</li>` : '');
  const title = t(f.first_time ? 'Meet Lumi!' : grew != null ? 'Lumi grew into a {name}!'
    : tiers.length > 1 ? 'New medals!' : tiers.length ? 'New medal!' : 'Quest complete!', { name: grew != null ? esc(t(f.stages[grew].name)) : '' });
  const text = f.first_time
    ? t("I'm a little firefly. Every minute you really focus gives me light, and with enough light I grow. Good habits win medals that give extra light!")
      + (tiers.length ? t(' You already earned {n} medals:', { n: tiers.length }) : '')
    : grew != null ? esc(t(f.stages[grew].line)) : t(tiers.length ? 'Each medal gives Lumi extra light ✨' : 'You did the quest of the day. Lumi glows a little brighter!');
  box.innerHTML = `<div class="card lumi-party-card">
    <div class="confetti" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--d:${(i % 6) * 0.15}s;--c:${['var(--c-yellow)', 'var(--c-pink)', 'var(--c-blue)', 'var(--c-green)', 'var(--c-violet)', 'var(--c-orange)'][i % 6]}"></i>`).join('')}</div>
    ${lumiSVG({ mood: 'party', stage: f.stage.index, outfit: f.outfit, size: 150, dream: f.dream })}
    <h2 class="display">${title}</h2><p>${text}</p>
    ${list ? `<ul class="partylist">${list}</ul>` : ''}
    <button class="btn primary big" id="partyOk">${t(f.first_time ? "Let's go! ✨" : 'Yay! ✨')}</button></div>`;
  document.body.appendChild(box);
  lumiSound(grew != null ? 'grow' : tiers.length ? 'medal' : 'quest', f);
  const close = async () => { box.remove(); await api('/api/friend', { seen: true }).catch(() => {}); dreamNews(); };
  $('#partyOk').onclick = close;
  $('#partyOk').focus();
  box.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}


// ---------------------------------------------------------------- Lumi's diary
// Lumi's diary sentences. The default lesson name ("Study session") is not repeated in the text,
// and "once" / "N times" have their own sentences so the diary reads like a real diary.
const DIARY = {
  open_plain: 'We had a {n}-minute lesson.',
  open_cls: 'We had a {n}-minute {cls} lesson.',
  open_title: 'We studied {title} for {n} minutes.',
  open_title_cls: 'We studied {title} in {cls} for {n} minutes.',
  focus_super: 'You were really focused, and I glowed the whole time! ✨',
  focus_good: 'You stayed focused for most of the lesson.',
  focus_hard: "Focusing was hard this time, and that's okay. Tomorrow is a new chance! 🌱",
  longest: 'Your longest focus streak was {n} minutes in a row.',
  plan_all: 'You finished everything you planned. 🎯',
  plan_part: 'You finished part of your plan. A good start!',
  no_phone: "And you didn't touch your phone at all. 📵",
  phone_1: 'You picked up the phone once.',
  phone: 'You picked up the phone {n} times.',
  eyes_1: 'We rested our eyes together once. 👀',
  eyes: 'We rested our eyes together {n} times. 👀',
  fell: 'Your attention started to drop after about {n} minutes, so a short break around then could help.',
};
const DEFAULT_TITLES = new Set(['', 'study session', 'a lesson', 'lesson']);
/** One diary sentence as text. bold = wrap the lesson name in <b> (for the page; not for email). */
function diarySentence(x, bold = true) {
  let k = x.k;
  if (k === 'questions') return '';                      // old data: questions were removed from Lumen
  if (k === 'open') {
    const named = !DEFAULT_TITLES.has(String(x.title || '').trim().toLowerCase());
    const cls = x.cls && x.cls !== 'Other' ? x.cls : '';
    k = named ? (cls ? 'open_title_cls' : 'open_title') : (cls ? 'open_cls' : 'open_plain');
  }
  if ((k === 'phone' || k === 'eyes') && x.n === 1) k += '_1';
  const name = `“${x.title || ''}”`;
  return t(DIARY[k], { n: x.n, cls: bold ? esc(x.cls || '') : (x.cls || ''), title: bold ? `<b>${esc(name)}</b>` : name });
}
function diaryDayHTML(day) {
  const date = new Date(day.ts * 1000).toLocaleDateString(LOCALE(), { weekday: 'long', day: 'numeric', month: 'long' });
  return `<article class="diary-day"><h3>${esc(date)}</h3>${day.lessons.map((l) => `<p>${l.lines.map((x) => diarySentence(x)).filter(Boolean).join(' ')}</p>`).join('')}</article>`;
}
function diaryBook(f) {
  if (!f.diary.length) return `<p class="empty">${t('The diary starts after the first lesson.')}</p>`;
  return `<div class="diary-book"><div class="diary-page" id="diaryPage">${diaryDayHTML(f.diary[0])}</div>
    <div class="diary-nav"><button class="btn ghost" id="diaryOlder" ${f.diary.length > 1 ? '' : 'disabled'}>← ${t('Older')}</button>
      <span class="muted small" id="diaryPos">${f.diary.length} / ${f.diary.length}</span>
      <button class="btn ghost" id="diaryNewer" disabled>${t('Newer')} →</button></div></div>`;
}
function wireDiary(f) {
  let i = 0;
  const go = (k) => {
    i = Math.max(0, Math.min(f.diary.length - 1, i + k));
    const pg = $('#diaryPage');
    pg.classList.remove('turn'); void pg.offsetWidth; pg.classList.add('turn');
    pg.innerHTML = diaryDayHTML(f.diary[i]);
    // the list is newest first (i = 0), but pages are numbered in time order: the newest day is N / N
    $('#diaryPos').textContent = `${f.diary.length - i} / ${f.diary.length}`;
    $('#diaryOlder').disabled = i >= f.diary.length - 1;
    $('#diaryNewer').disabled = i === 0;
  };
  if ($('#diaryOlder')) { $('#diaryOlder').onclick = () => go(1); $('#diaryNewer').onclick = () => go(-1); }
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
