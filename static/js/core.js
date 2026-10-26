// core.js: helpers shared by every page (loaded first).
'use strict';

const $ = (sel) => document.querySelector(sel);

// ---- look: a background scene + an accent colour (chosen in the 🎨 popover or in Settings)
// Each scene is a colour theme (CSS variables in style.css) plus a few things moving slowly
// behind the page: fireflies, stars, bubbles, leaves, clouds or petals.
const SCENES = [
  ['fireflies', 'Fireflies', '🌌'], ['space', 'Space', '✨'], ['ocean', 'Ocean', '🐠'],
  ['forest', 'Forest', '🌲'], ['clouds', 'Sky', '🎈'], ['blossom', 'Blossom', '🌸'],
];
const OLD_THEME = { midnight: 'space', graphite: 'space', plum: 'space', aurora: 'space', paper: 'clouds', sky: 'clouds',
  mint: 'clouds', sunny: 'clouds', lavender: 'blossom' };
const ACCENTS = [['#F2B544', 'Amber'], ['#4CC9B0', 'Mint'], ['#FF8A70', 'Coral'], ['#9B8CFF', 'Violet'], ['#5AA9FF', 'Sky'], ['#F06BA8', 'Rose']];
let LOOK = { theme: 'fireflies', accent: '#F2B544', motion: true };

// the moving things of each scene: how many, and the CSS class that animates them
const SCENE_BITS = {
  fireflies: [['ff', 22]], space: [['star', 70], ['shoot', 3]], ocean: [['bubble', 20], ['ray', 4]],
  forest: [['ff green', 14], ['leaf', 9]], blossom: [['petal', 18]],     // clouds: see skySceneHTML
};
const rnd = (k, m) => { const v = Math.sin(k * 12.9898 + m * 78.233) * 43758.5453; return v - Math.floor(v); };   // stable pseudo-random 0..1

// The sky scene is drawn in SVG: fluffy clouds (shapes blurred and torn by a noise filter) in a far
// and a near layer, and hot-air balloons. Near things are bigger and move faster (parallax).
function cloudSVG(k, w) {
  const blobs = Array.from({ length: 6 }, (_, i) => {
    const x = 40 + i * 42 + rnd(k, i + 10) * 20, r = 34 + rnd(k, i + 20) * 30 - Math.abs(i - 2.5) * 6;
    return [x, 120 - r * 0.55, r];
  });
  return `<svg class="cloud-svg" width="${w}" viewBox="0 0 340 170" aria-hidden="true">
    <defs><filter id="cf${k}" x="-20%" y="-30%" width="140%" height="160%">
      <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="4" seed="${k * 7}"/>
      <feDisplacementMap in="SourceGraphic" scale="38"/><feGaussianBlur stdDeviation="2.2"/></filter>
      <linearGradient id="cg${k}" x1="0" y1="0" x2="0" y2="1"><stop offset=".35" stop-color="#FFFFFF"/><stop offset="1" stop-color="#CADBEE"/></linearGradient></defs>
    <g filter="url(#cf${k})">
      <ellipse cx="170" cy="130" rx="150" ry="26" fill="#C3D4E8"/>
      ${blobs.map(([x, y, r]) => `<circle cx="${x.toFixed(0)}" cy="${(y + 8).toFixed(0)}" r="${r.toFixed(0)}" fill="#C9D9EC"/>`).join('')}
      ${blobs.map(([x, y, r]) => `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(r * 0.94).toFixed(0)}" fill="url(#cg${k})"/>`).join('')}
    </g></svg>`;
}
function balloonSVG(k, w, colors) {
  const [a, b] = colors;
  const gores = Array.from({ length: 6 }, (_, i) => `<path d="M${16 + i * 13} 6 Q${10 + i * 13} 50 ${30 + i * 8} 92 L${36 + i * 8} 92 Q${26 + i * 13} 50 ${29 + i * 13} 6Z" fill="${i % 2 ? b : a}"/>`).join('');
  return `<svg class="balloon-svg" width="${w}" viewBox="0 0 100 150" aria-hidden="true">
    <defs><clipPath id="bc${k}"><path d="M50 4C22 4 6 24 6 46c0 22 18 36 28 48 4 5 6 8 7 12h18c1-4 3-7 7-12 10-12 28-26 28-48C94 24 78 4 50 4Z"/></clipPath>
      <radialGradient id="bh${k}" cx=".32" cy=".28" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></radialGradient></defs>
    <g clip-path="url(#bc${k})"><rect width="100" height="110" fill="${a}"/>${gores}<rect y="88" width="100" height="22" fill="${b}"/><rect width="100" height="110" fill="url(#bh${k})"/></g>
    <path d="M41 106L43 124M59 106L57 124M46 106L46 124M54 106L54 124" stroke="#5B4636" stroke-width="1.1"/>
    <rect x="41" y="123" width="18" height="14" rx="2.5" fill="#9A6B3F"/><rect x="41" y="123" width="18" height="4" rx="2" fill="#7A522E"/>
  </svg>`;
}
const BALLOONS = [['#E8505B', '#FFD166'], ['#3A86FF', '#F1F5FF'], ['#8E5CF7', '#FF9F1C'], ['#2EC4B6', '#FF6B9A']];
function skySceneHTML() {
  const far = Array.from({ length: 5 }, (_, i) => {
    const k = i + 1;
    return `<div class="sky-cloud far" style="--y:${(4 + rnd(k, 1) * 40).toFixed(1)}vh;--d:${(200 + rnd(k, 2) * 120).toFixed(0)}s;--dl:-${(rnd(k, 3) * 300).toFixed(0)}s">${cloudSVG(k, 170 + rnd(k, 4) * 90)}</div>`;
  }).join('');
  const near = Array.from({ length: 5 }, (_, i) => {
    const k = i + 11;
    return `<div class="sky-cloud near" style="--y:${(20 + rnd(k, 1) * 62).toFixed(1)}vh;--d:${(110 + rnd(k, 2) * 80).toFixed(0)}s;--dl:-${(rnd(k, 3) * 190).toFixed(0)}s">${cloudSVG(k, 300 + rnd(k, 4) * 160)}</div>`;
  }).join('');
  const balloons = BALLOONS.slice(0, 3).map((c, i) => {
    const k = i + 31;
    const near2 = i === 0;
    return `<div class="sky-balloon${near2 ? ' near' : ''}" style="--y:${(10 + rnd(k, 1) * 50).toFixed(1)}vh;--d:${(near2 ? 150 : 230 + rnd(k, 2) * 80).toFixed(0)}s;--dl:-${(rnd(k, 3) * 220).toFixed(0)}s">
      <div class="bob" style="--b:${(5 + rnd(k, 4) * 4).toFixed(1)}s">${balloonSVG(k, near2 ? 74 : 36 + rnd(k, 5) * 16, c)}</div></div>`;
  }).join('');
  // a loose flock: each bird is a silhouette with three wing frames (up, glide, down)
  const WING = {
    up: 'M20 11.2C17.4 9.2 14.6 5.6 10.4 1.4C11.6 6.4 15 10.4 19.4 12.8ZM20 11.2C22.6 9.2 25.4 5.6 29.6 1.4C28.4 6.4 25 10.4 20.6 12.8Z',
    mid: 'M20 11.2C16.4 7.2 10.6 6.4 2.6 8.6C8.8 9.6 14.6 11.8 19.4 13.2ZM20 11.2C23.6 7.2 29.4 6.4 37.4 8.6C31.2 9.6 25.4 11.8 20.6 13.2Z',
    down: 'M20 11.6C16.8 12.4 12.6 14.8 8.4 18.6C13 16.6 16.6 14.2 19.6 12.8ZM20 11.6C23.2 12.4 27.4 14.8 31.6 18.6C27 16.6 23.4 14.2 20.4 12.8Z',
  };
  const flock = [[0, 0, 1], [-34, 14, 0.9], [-30, -16, 0.85], [-70, 26, 0.8], [-64, -6, 0.75], [-98, 34, 0.7]];
  const birds = flock.map(([x, y, sc], i) => `<div class="bird" style="left:${x}px;top:${y}px;--sc:${sc};--fl:${(4.2 + rnd(i + 61, 1) * 1.6).toFixed(2)}s;--fd:-${(rnd(i + 61, 2) * 4).toFixed(2)}s;--bd:-${(rnd(i + 61, 3) * 3).toFixed(2)}s">
    <svg width="40" height="20" viewBox="0 0 40 20" aria-hidden="true"><g fill="rgba(34,44,64,.78)">
      <ellipse cx="20" cy="12" rx="2.3" ry="1.5"/><path d="M18 12.2L15.6 12.9L16.3 11.7Z"/>
      <path class="w-up" d="${WING.up}"/><path class="w-mid" d="${WING.mid}"/><path class="w-down" d="${WING.down}"/></g></svg></div>`).join('');
  return `<div class="sky-sun"></div>${far}<div class="bird-flock">${birds}</div>${balloons}${near}`;   // order = depth
}

function drawScene() {
  let el = document.getElementById('sceneBg');
  if (el && el.dataset.scene === LOOK.theme) { el.classList.toggle('still', !LOOK.motion); return; }
  if (!el) {
    el = document.createElement('div');
    el.id = 'sceneBg'; el.setAttribute('aria-hidden', 'true');
    document.body.prepend(el);
  }
  el.dataset.scene = LOOK.theme;
  el.className = `scene-bg scene-${LOOK.theme}${LOOK.motion ? '' : ' still'}`;   // "still": the picture stays, nothing moves
  if (LOOK.theme === 'clouds') { el.innerHTML = skySceneHTML(); return; }
  let k = 0;
  el.innerHTML = (SCENE_BITS[LOOK.theme] || []).map(([cls, n]) => Array.from({ length: n }, () => {
    k += 1;
    const r = (m) => rnd(k, m);
    return `<i class="${cls}" style="--x:${(r(1) * 100).toFixed(1)}vw;--y:${(r(2) * 100).toFixed(1)}vh;--d:${(8 + r(3) * 14).toFixed(1)}s;--dl:-${(r(4) * 20).toFixed(1)}s;--s:${(0.6 + r(5) * 0.9).toFixed(2)}"></i>`;
  }).join('')).join('');
}
function applyTheme(theme, accent, motion) {
  const root = document.documentElement;
  theme = OLD_THEME[theme] || theme;
  if (theme && !SCENES.some(([key]) => key === theme)) theme = 'fireflies';
  LOOK = { theme: theme || LOOK.theme, accent: accent || LOOK.accent, motion: typeof motion === 'boolean' ? motion : LOOK.motion };
  root.dataset.theme = LOOK.theme;
  root.style.setProperty('--accent', LOOK.accent);
  drawScene();
  try { localStorage.setItem('lumen.look', JSON.stringify(LOOK)); } catch { /* fine */ }
  // mark the chosen buttons everywhere (sidebar popover + Settings) without redrawing the page
  document.querySelectorAll('[data-look-theme]').forEach((b) => {
    b.classList.toggle('on', b.dataset.lookTheme === LOOK.theme); b.setAttribute('aria-pressed', String(b.dataset.lookTheme === LOOK.theme));
  });
  document.querySelectorAll('[data-look-accent]').forEach((b) => {
    b.classList.toggle('on', b.dataset.lookAccent === LOOK.accent); b.setAttribute('aria-pressed', String(b.dataset.lookAccent === LOOK.accent));
  });
  document.querySelectorAll('[data-look-motion]').forEach((b) => { b.classList.toggle('on', LOOK.motion); b.setAttribute('aria-checked', String(LOOK.motion)); });
}
// Change the look: instantly on screen, then tell the server in the background (no waiting, no redraw).
function setLook(part) {
  applyTheme(part.theme, part.accent, part.motion);
  api('/api/settings', part).catch(() => {});
}
// one click handler for every look button on the page (event delegation)
document.addEventListener('click', (e) => {
  const th = e.target.closest('[data-look-theme]'), a = e.target.closest('[data-look-accent]'), m = e.target.closest('[data-look-motion]');
  if (th) setLook({ theme: th.dataset.lookTheme });
  if (a) setLook({ accent: a.dataset.lookAccent });
  if (m) setLook({ motion: !LOOK.motion });
});
function themeSwatches(small = false) {
  return `<div class="scenes${small ? ' compact' : ''}">${SCENES.map(([key, name, emo]) => `<button type="button" class="scene-opt${LOOK.theme === key ? ' on' : ''}" data-look-theme="${key}" aria-pressed="${LOOK.theme === key}" title="${name}">
      <span class="scene-dot prev-${key}">${emo}</span><span class="scene-name">${name}</span></button>`).join('')}</div>`;
}
function motionSwitch() {
  return `<button type="button" class="motion-sw${LOOK.motion ? ' on' : ''}" data-look-motion role="switch" aria-checked="${LOOK.motion}"><span class="switch${LOOK.motion ? ' on' : ''}"><span></span></span><span>Moving background</span></button>`;
}
function langButtons() {
  return `<div class="langs" data-noi18n>${LANGS.map(([k, name]) => `<button type="button" class="langbtn${k === LANG ? ' on' : ''}" data-lang="${k}" aria-pressed="${k === LANG}">${name}</button>`).join('')}</div>`;
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-lang]'); if (b && b.dataset.lang !== LANG) setLang(b.dataset.lang); });
function accentSwatches() {
  return `<div class="accents">${ACCENTS.map(([hex, name]) => `<button type="button" class="acc${LOOK.accent === hex ? ' on' : ''}" data-look-accent="${hex}" style="--c:${hex}" aria-pressed="${LOOK.accent === hex}" title="${name}" aria-label="${name}"><span></span></button>`).join('')}</div>`;
}
// apply the remembered look immediately (no flash of the default colours), then sync with the server
try { const look = JSON.parse(localStorage.getItem('lumen.look') || 'null'); applyTheme(look ? look.theme : 'fireflies', look ? look.accent : null, look ? look.motion : true); } catch { applyTheme('fireflies'); }
api('/api/settings').then((st) => applyTheme(st.theme, st.accent, st.motion)).catch(() => {});

// ---- mood (facial expression)
const MOOD = {
  calm: ['😌', 'Calm', 'var(--slate)'],
  happy: ['😊', 'Happy', '#F2C14E'],          // fixed colours: never the same as each other or the accent
  surprised: ['😮', 'Surprised', '#3FCF8E'],
  frown: ['🤨', 'Frowning', '#B07CFF'],
  sad: ['😟', 'Sad', '#5AA9FF'],
  tired: ['😴', 'Tired', 'var(--coral)'],
};
const app = $('#app');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** "3:06" -> "3 min 6 sec", "0:35" -> "35 seconds" (in the chosen language) */
function awayWords(m) {
  const [mm, ss] = String(m || '0:00').split(':').map(Number);
  const total = (mm || 0) * 60 + (ss || 0);
  if (!total) return t('never looked away');
  const span = total < 60 ? t('{s} seconds', { s: total }) : ss ? t('{m} min {s} sec', { m: mm, s: ss }) : t('{m} min', { m: mm });
  return t('{d} away from the screen', { d: span });
}
const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
const C = 2 * Math.PI * 88;     // ring circumference
let stream = null;              // EventSource for the live session / check

// Small cache for GET requests: going back to a page you just saw is instant.
// Anything you change (every POST) clears it, so you never see old numbers after an action.
const cache = new Map();
function cachedGet(path, maxAgeMs = 15000) {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < maxAgeMs) return hit.promise;
  const promise = api(path).catch((err) => { cache.delete(path); throw err; });
  cache.set(path, { at: Date.now(), promise });
  return promise;
}

// Web version: there is no HTTP server for the app. The "server" runs inside this tab
// (src/server/local-server.js) and answers the same paths, so the pages work as before.
async function api(path, body) {
  if (body !== undefined) cache.clear();
  const { status, data } = await Lumen.server.request(path, body);
  if (status >= 400) throw new Error(data.error || `Error ${status}`);
  return JSON.parse(JSON.stringify(data));     // a copy, like data that came over the network
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._h);
  toast._h = setTimeout(() => t.classList.remove('show'), 2400);
}

function closeStream() {
  if (stream) { stream.close(); stream = null; }
  // take the camera picture off the page (the camera itself keeps running for the lesson)
  const v = Lumen.server.video;
  if (v.parentNode) v.parentNode.removeChild(v);
}

function closeStreamPreview() {
  const v = Lumen.server.video;
  if (v.parentNode) v.parentNode.removeChild(v);
}

/** Put the live camera picture into a placeholder element (session and accuracy check pages). */
function mountCamera(slot) {
  if (!slot) return;
  const v = Lumen.server.video;
  slot.appendChild(v);
  if (v.srcObject && v.paused) v.play().catch(() => {});
}

// ---- formatting
function hm(min) {
  min = Math.round(min || 0);
  const h = Math.floor(min / 60), m = min % 60;
  return h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}
function ago(ts) {
  const d = new Date(ts * 1000), now = new Date();
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86400000);
  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (diff === 0) return `today, ${time}`;
  if (diff === 1) return `yesterday, ${time}`;
  if (diff < 7) return `${d.toLocaleDateString(undefined, { weekday: 'long' })}, ${time}`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 22 ? 'Good evening' : 'Good night';
}
const attColor = (a) => (a == null ? 'var(--bar)' : a >= 70 ? 'var(--teal)' : a >= 40 ? 'var(--drift)' : 'var(--coral)');

// ---- icons
const ICON = {
  logo: `<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="12" fill="none" stroke="var(--accent)" stroke-width="2.5"/><circle cx="14" cy="14" r="5" fill="var(--accent)"/></svg>`,
  back: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text)" stroke-width="2" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>`,
  lock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,
  home: `<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>`,
  classes: `<path d="M4 5h11a3 3 0 0 1 3 3v11H7a3 3 0 0 1-3-3z"/><path d="M18 8h2v11"/><path d="M8 9h6M8 13h4"/>`,
  stats: `<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>`,
  history: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`,
  check: `<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>`,
  review: `<rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/><path d="M7 12h6M7 16h4"/>`,
  settings: `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>`,
  ai: `<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>`,
  week: `<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>`,
  play: `<path d="M8 5v14l11-7z"/>`,
  lumi: `<circle cx="12" cy="9" r="4"/><ellipse cx="12" cy="17" rx="3.5" ry="3.5"/><path d="M10 5.5L8 2M14 5.5L16 2"/><path d="M8.5 12.5C5 12 3 10 3.5 8M15.5 12.5C19 12 21 10 20.5 8"/>`,
};
const icon = (name, color = 'currentColor', size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;
const BACK = ICON.back;
const LOCK = ICON.lock;
const LOGO = ICON.logo;

// ---- the left sidebar
// It is drawn ONCE and never re-created when you change pages: only the highlighted item
// changes. Re-drawing it on every click is what made it jump before.
let lastActive = null;
const NAV = [
  ['home', '#/', 'Home'],
  ['lumi', '#/lumi', 'Lumi'],
  ['review', '#/review', 'Review'],
  ['classes', '#/classes', 'Classes'],
  ['ai', '#/ai', 'Ask AI'],
  ['stats', '#/stats', 'Progress'],
  ['history', '#/history', 'History'],
  ['check', '#/check', 'Accuracy check'],
  ['settings', '#/settings', 'Settings'],
];
let reviewBadge = 0;
let hasReviewCards = false;     // Review shows in the menu only once there are saved questions
let pausedBadge = 0;
const COLLAPSE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/><path d="M20 4v16"/></svg>`;
const isSmall = () => window.matchMedia('(max-width: 900px)').matches;
const layoutEl = () => $('#layout');

function buildSidebar() {
  const side = $('#sidebar');
  if (side.dataset.built) return;
  side.dataset.built = '1';
  side.innerHTML = `
    <div class="side-head"><a class="brand" href="#/">${LOGO}<span>Lumen</span></a>
      <button class="icon-btn" id="hideNav" type="button" aria-label="Hide menu (M)" title="Hide menu (M)">${COLLAPSE}</button></div>
    <nav>${NAV.map(([key, href, label]) => `<a href="${href}" data-nav="${key}">${icon(key)}<span>${label}</span>${key === 'review' ? '<em class="badge" id="reviewBadge" hidden></em>' : ''}${key === 'classes' ? '<em class="badge soft" id="pausedBadge" hidden title="paused lessons"></em>' : ''}</a>`).join('')}</nav>
    <div class="side-foot"><div id="livePill"></div><div id="accountSlot"></div>
      <div class="lookwrap"><button class="pill lookbtn" id="lookBtn" type="button" aria-expanded="false" aria-controls="lookPop">🎨 Colours</button>
        <div class="lookpop card" id="lookPop" hidden><div class="eyebrow">Background</div>${themeSwatches(true)}
          <div class="eyebrow" style="margin-top:12px">Accent</div>${accentSwatches()}
          <div style="margin-top:10px">${motionSwitch()}</div>
          <div class="eyebrow" style="margin-top:12px">Language</div>${langButtons()}</div></div>
      <a class="pill parentlink" href="#/parent">👪 Parents</a>
      <div class="pill" title="The camera is analysed inside your browser. Video never leaves your device.">${LOCK}Video stays on your device</div></div>`;
  $('#lookBtn').onclick = (e) => {
    e.stopPropagation();
    const pop = $('#lookPop');
    pop.hidden = !pop.hidden;
    $('#lookBtn').setAttribute('aria-expanded', String(!pop.hidden));
  };
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.lookwrap')) { $('#lookPop').hidden = true; $('#lookBtn').setAttribute('aria-expanded', 'false'); }
  });
  $('#hideNav').onclick = () => toggleNav(true);
  $('#menuBtn').onclick = () => toggleNav(false);
  $('#backdrop').onclick = () => toggleNav(true);
  side.addEventListener('click', (e) => { if (isSmall() && e.target.closest('nav a')) toggleNav(true); });
  if (typeof renderAccountSlot === 'function') renderAccountSlot();
}

function navHidden() {
  if (isSmall()) return !document.body.classList.contains('nav-open');     // phones: closed until opened
  try { return localStorage.getItem('lumen.navHidden') === '1'; } catch { return false; }
}

function applyNav() {
  const hidden = navHidden();
  layoutEl().classList.toggle('nav-hidden', hidden);
  $('#menuBtn').setAttribute('aria-expanded', String(!hidden));
}

function toggleNav(hide) {
  if (layoutEl().classList.contains('focus')) return;
  if (isSmall()) {
    document.body.classList.toggle('nav-open', hide === undefined ? undefined : !hide);
  } else {
    const h = hide === undefined ? !navHidden() : hide;
    try { localStorage.setItem('lumen.navHidden', h ? '1' : '0'); } catch { /* not saved, that's fine */ }
  }
  applyNav();
}

// Pages call shell(): it updates the (already drawn) sidebar and returns the page HTML unchanged.
function shell(current, content, active = lastActive) {
  buildSidebar();
  layoutEl().classList.remove('focus');
  document.body.classList.remove('nav-open');
  document.querySelectorAll('#sidebar [data-nav]').forEach((a) => {
    const on = a.dataset.nav === current;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const rv = document.querySelector('#sidebar [data-nav="review"]');
  if (rv) rv.hidden = !hasReviewCards && current !== 'review';
  const badge = $('#reviewBadge');
  badge.hidden = !reviewBadge;
  badge.textContent = reviewBadge;
  const pb = $('#pausedBadge');
  pb.hidden = !pausedBadge;
  pb.textContent = pausedBadge;
  $('#livePill').innerHTML = active
    ? `<a class="live" href="${active.mode === 'check' ? '#/check/run' : '#/session'}">
         <span class="dot-live"></span><span><b>${active.mode === 'check' ? 'Accuracy check' : 'Studying now'}</b>
         <small>${esc(active.class ? `${active.class} · ` : '')}${esc(active.title || '')}</small></span></a>`
    : '';
  applyNav();
  return content;
}

// The live session and the running check use the whole screen (no menu).
function focusMode() {
  layoutEl().classList.add('focus');
  document.body.classList.remove('nav-open');
}

// ---- tiny charts (inline SVG / HTML, no libraries)
function ring(value, color, label) {
  const dash = (C * Math.max(0, Math.min(100, value)) / 100).toFixed(1);
  return `<svg class="ring" width="200" height="200" viewBox="0 0 200 200" role="img" aria-label="${label} ${value}">
    <circle cx="100" cy="100" r="88" fill="none" stroke="var(--track)" stroke-width="14"/>
    <circle class="val" cx="100" cy="100" r="88" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round"
      stroke-dasharray="${dash} ${C.toFixed(1)}" transform="rotate(-90 100 100)"/>
    <text class="num" x="100" y="104" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="52" font-weight="600" fill="var(--text)">${value}</text>
    <text x="100" y="132" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" fill="var(--muted)">${label}</text></svg>`;
}

// vertical bars: study time (grey) with the focused part (teal) inside
function dayBars(days, height = 150) {
  const max = Math.max(30, ...days.map((d) => d.study_min));
  return `<div class="daybars" style="height:${height}px" role="img" aria-label="Study and focused minutes per day">
    ${days.map((d, i) => `<div title="${esc(d.date)}: ${hm(d.study_min)} studied, ${hm(d.focused_min)} focused">
      <div class="col"><i class="study" style="height:${(100 * d.study_min / max).toFixed(1)}%">
        <i class="focus" style="height:${d.study_min ? (100 * d.focused_min / d.study_min).toFixed(1) : 0}%"></i></i></div>
      <span class="${i === days.length - 1 ? 'today' : ''}">${esc(d.label)}</span></div>`).join('')}
  </div>`;
}

// horizontal bars with a label and a value
function hbars(rows) {
  return `<div class="hbars">${rows.map((r) => `<div class="hb">
      <span class="lbl">${r.label}</span>
      <div class="track"><i style="width:${Math.max(0, Math.min(100, r.pct))}%;background:${r.color || 'var(--teal)'}"></i></div>
      <b>${r.value}</b></div>`).join('')}</div>`;
}

// little attention trend: one bar per session
function trend(values, height = 36) {
  if (!values.length) return '';
  return `<div class="trend" style="height:${height}px" role="img" aria-label="Average attention per session">
    ${values.map((v) => `<i style="height:${Math.max(6, v)}%;background:${attColor(v)}" title="${v}%"></i>`).join('')}</div>`;
}

function statusChip(l) {
  if (l.status === 'paused') return `<span class="chip break">Paused${l.parts > 1 ? ` · part ${l.parts}` : ''}</span>`;
  return `<span class="chip Focused">Done</span>`;
}

// (The Python version needed a "ping" to notice a closed tab. In the browser, closing the tab
// pauses the lesson directly: see "pagehide" in local-server.js.)

// ---------------------------------------------------------------- (i) explanations
// info('key') draws a small (i) button. Clicking it opens a short explanation: what this is and why it matters.
// The texts live in INFO (static/js/insights.js); a plain string can be passed instead of a key.
function info(key, label = '') {
  return `<button type="button" class="info" data-info="${esc(key)}" aria-label="What is ${esc(label || 'this')}?">i</button>`;
}
(() => {
  let pop = null, owner = null;
  const close = () => { if (pop) pop.remove(); pop = null; if (owner) owner.setAttribute('aria-expanded', 'false'); owner = null; };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-info]');
    if (!b) { if (pop && !e.target.closest('.infopop')) close(); return; }
    e.preventDefault(); e.stopPropagation();
    if (owner === b) { close(); return; }
    close();
    const raw = (typeof INFO !== 'undefined' && INFO[b.dataset.info]) || [null, esc(b.dataset.info)];
    const entry = [raw[0] && t(raw[0]), t(raw[1])];
    pop = document.createElement('div');
    pop.className = 'infopop';
    pop.setAttribute('role', 'dialog');
    pop.innerHTML = `${entry[0] ? `<b>${entry[0]}</b>` : ''}<div>${entry[1]}</div>`;
    document.body.appendChild(pop);
    owner = b;
    b.setAttribute('aria-expanded', 'true');
    const r = b.getBoundingClientRect(), w = pop.offsetWidth;
    const left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), window.innerWidth - w - 12);
    const below = r.bottom + 8 + pop.offsetHeight < window.innerHeight;
    pop.style.left = `${left + window.scrollX}px`;
    pop.style.top = `${(below ? r.bottom + 8 : r.top - pop.offsetHeight - 8) + window.scrollY}px`;
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  window.addEventListener('hashchange', close);
  window.addEventListener('resize', close);
})();
