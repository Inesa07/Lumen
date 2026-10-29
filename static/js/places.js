// places.js: where Lumi lives. One illustration for each place (meadow, forest, garden, ocean, sky,
// space), used on the Lumi page (big, with Lumi's home) and in the Mac widget (a copy of this file is
// put into desktop-widget/lumen.widget/index.jsx by `npm run widget`). So this file is plain JavaScript
// that only builds SVG text: no page, no DOM.
//
// The picture follows the real time of day (morning, day, evening, night), the season, the weather,
// and how big Lumi is: Lumi's home is a glass jar, then a lantern, then a little house.
// Depth comes from layers: far things are smaller, paler and bluer (like real air), near things are
// bigger, darker and sharper. Every shape has a light side and a shadow side.
'use strict';

const PLACES = [
  ['fireflies', 'Meadow', '🌌'], ['forest', 'Forest', '🌲'], ['blossom', 'Garden', '🌸'], ['ocean', 'Ocean', '🐠'],
  ['clouds', 'Sky', '🎈'], ['space', 'Space', '✨'],
];
const OUTDOOR = ['fireflies', 'forest', 'blossom', 'clouds'];

const plRnd = (k, m) => { const v = Math.sin(k * 127.1 + m * 311.7) * 43758.5453; return v - Math.floor(v); };
const f1 = (n) => (Math.round(n * 10) / 10).toString();

/** Time of day from the clock (and from sunrise / sunset in minutes, when the widget knows them). */
function placeTime(d = new Date(), rise = 6 * 60, set = 19 * 60) {
  const m = d.getHours() * 60 + d.getMinutes();
  if (m < rise - 30 || m >= Math.max(set + 90, 21 * 60)) return 'night';
  if (m < rise + 150) return 'morning';
  if (m < set - 60) return 'day';
  return 'evening';
}
const placeSeason = (d = new Date()) => ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'][d.getMonth()];

// ---------------------------------------------------------------- colour helpers
/** Mix two #rrggbb colours (t = 0 → a, 1 → b). Used to make far layers paler ("air") and night darker. */
function mix(a, b, t) {
  const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}
const NIGHT = { morning: 0.05, day: 0, evening: 0.35, night: 0.62 };
const shade = (c, tod) => mix(c, '#0B1430', NIGHT[tod] || 0);          // the same colour at this time of day

const SKY_COL = {
  morning: ['#7FB6EA', '#FFD9B8', '#FFB98A'], day: ['#4FA8F0', '#BFE3FF', '#E6F5FF'],
  evening: ['#3E3F8F', '#FF9A7A', '#FFC48A'], night: ['#060B22', '#1B2558', '#2C3A72'],
};
function skyColors(place, tod) {
  if (place === 'space') return ['#04020C', '#120A33', '#1E1150'];
  if (place === 'ocean') return { morning: ['#5CC2F0', '#1F7FC0', '#0A3F70'], day: ['#6FD0FF', '#2390D6', '#0B4A82'],
    evening: ['#4A86C2', '#1C5A92', '#0A2D55'], night: ['#123A66', '#0A2346', '#03101F'] }[tod];
  return SKY_COL[tod];
}

// Each picture gets its own gradient ids (two pictures on one page must not share them).
function defsMaker(P) {
  const list = [], seen = new Set();
  return {
    lin(id, stops, x2 = 0, y2 = 1) {
      if (seen.has(id)) return `url(#${P}${id})`;
      seen.add(id);
      list.push(`<linearGradient id="${P}${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`);
      return `url(#${P}${id})`;
    },
    rad(id, stops, cx = 0.5, cy = 0.5, r = 0.5) {
      if (seen.has(id)) return `url(#${P}${id})`;
      seen.add(id);
      list.push(`<radialGradient id="${P}${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`);
      return `url(#${P}${id})`;
    },
    id: (x) => `${P}${x}`,
    html: () => `<defs>${list.join('')}</defs>`,
  };
}

/** A smooth hill line across the picture: y around `base`, waves up to `amp`. Returns a closed path. */
function hillPath(w, h, base, amp, seed, bumps = 4) {
  const pts = [];
  for (let i = 0; i <= bumps; i++) pts.push([i * w / bumps, base - plRnd(seed, i) * amp]);
  let d = `M0 ${f1(h)}L0 ${f1(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    d += `C${f1(x0 + (x1 - x0) * 0.5)} ${f1(y0)} ${f1(x0 + (x1 - x0) * 0.5)} ${f1(y1)} ${f1(x1)} ${f1(y1)}`;
  }
  return `${d}L${f1(w)} ${f1(h)}Z`;
}

// ---------------------------------------------------------------- small drawings
/** A fir tree in tiers, light on the left, shadow on the right. */
function fir(x, y, hh, col, dark, snow) {
  let s = `<rect x="${f1(x - hh * 0.04)}" y="${f1(y - hh * 0.16)}" width="${f1(hh * 0.08)}" height="${f1(hh * 0.18)}" fill="${dark}"/>`;
  for (let t = 0; t < 3; t++) {
    const top = y - hh + t * hh * 0.24, bot = y - hh * 0.12 - (2 - t) * hh * 0.14, half = hh * (0.18 + t * 0.09);
    s += `<path d="M${f1(x)} ${f1(top)}Q${f1(x - half * 0.5)} ${f1(top + (bot - top) * 0.6)} ${f1(x - half)} ${f1(bot)}Q${f1(x)} ${f1(bot + hh * 0.04)} ${f1(x)} ${f1(bot + hh * 0.03)}Z" fill="${col}"/>`
      + `<path d="M${f1(x)} ${f1(top)}Q${f1(x + half * 0.5)} ${f1(top + (bot - top) * 0.6)} ${f1(x + half)} ${f1(bot)}Q${f1(x)} ${f1(bot + hh * 0.04)} ${f1(x)} ${f1(bot + hh * 0.03)}Z" fill="${dark}"/>`;
    if (snow) s += `<path d="M${f1(x)} ${f1(top)}Q${f1(x - half * 0.3)} ${f1(top + (bot - top) * 0.35)} ${f1(x - half * 0.55)} ${f1(top + (bot - top) * 0.5)}Q${f1(x)} ${f1(top + (bot - top) * 0.42)} ${f1(x + half * 0.55)} ${f1(top + (bot - top) * 0.5)}Q${f1(x + half * 0.3)} ${f1(top + (bot - top) * 0.35)} ${f1(x)} ${f1(top)}Z" fill="#F4F8FF"/>`;
  }
  return s;
}
/** A round leafy tree: a trunk and a crown of overlapping balls, lit from the top left. */
function leafy(x, y, hh, col, dark, light, trunk = '#6B4A2E', k = 0) {
  const r = hh * 0.26;
  let s = `<path d="M${f1(x - hh * 0.04)} ${f1(y)}L${f1(x - hh * 0.02)} ${f1(y - hh * 0.5)}L${f1(x + hh * 0.02)} ${f1(y - hh * 0.5)}L${f1(x + hh * 0.05)} ${f1(y)}Z" fill="${trunk}"/>`;
  const balls = [[0, -0.66, 1], [-0.55, -0.5, 0.78], [0.55, -0.52, 0.8], [-0.25, -0.86, 0.72], [0.3, -0.84, 0.7]];
  s += balls.map(([dx, dy, sc]) => `<circle cx="${f1(x + dx * r)}" cy="${f1(y + dy * hh)}" r="${f1(r * sc)}" fill="${dark}"/>`).join('');
  s += balls.map(([dx, dy, sc]) => `<circle cx="${f1(x + dx * r - r * 0.12)}" cy="${f1(y + dy * hh - r * 0.12)}" r="${f1(r * sc * 0.82)}" fill="${col}"/>`).join('');
  s += `<circle cx="${f1(x - r * 0.35)}" cy="${f1(y - hh * 0.82)}" r="${f1(r * 0.35)}" fill="${light}" opacity=".7"/>`;
  return s;
}
/** A soft cloud: bottom in shadow, top lit. */
function cloud(x, y, sc, top = '#FFFFFF', bottom = '#C9D8EC', op = 1) {
  const b = [[-1.5, 0.1, 0.55], [-0.75, -0.25, 0.75], [0.15, -0.45, 0.9], [0.95, -0.2, 0.7], [1.6, 0.1, 0.5]];
  return `<g opacity="${op}"><ellipse cx="${f1(x)}" cy="${f1(y + sc * 0.3)}" rx="${f1(sc * 2.1)}" ry="${f1(sc * 0.45)}" fill="${bottom}"/>`
    + b.map(([dx, dy, r]) => `<circle cx="${f1(x + dx * sc)}" cy="${f1(y + dy * sc + sc * 0.08)}" r="${f1(r * sc)}" fill="${bottom}"/>`).join('')
    + b.map(([dx, dy, r]) => `<circle cx="${f1(x + dx * sc - sc * 0.06)}" cy="${f1(y + dy * sc - sc * 0.04)}" r="${f1(r * sc * 0.9)}" fill="${top}"/>`).join('') + '</g>';
}
/** A clump of grass blades (filled, tapered leaves). */
function tuft(x, y, s, col, dark, k) {
  let p = '';
  const n = 4 + Math.floor(plRnd(k, 1) * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / (n - 1) - 0.5) * 1.1 + (plRnd(k, i + 2) - 0.5) * 0.3, len = s * (0.7 + plRnd(k, i + 9) * 0.6);
    const tx = x + Math.sin(a) * len, ty = y - Math.cos(a) * len;
    p += `<path d="M${f1(x - s * 0.08)} ${f1(y)}Q${f1(x + Math.sin(a) * len * 0.4 - s * 0.06)} ${f1(y - len * 0.5)} ${f1(tx)} ${f1(ty)}Q${f1(x + Math.sin(a) * len * 0.4 + s * 0.08)} ${f1(y - len * 0.5)} ${f1(x + s * 0.08)} ${f1(y)}Z" fill="${i % 2 ? dark : col}"/>`;
  }
  return `<g class="pl-sway" style="transform-origin:${f1(x)}px ${f1(y)}px;animation-delay:-${f1(plRnd(k, 30) * 4)}s">${p}</g>`;
}
function daisy(x, y, s, petal, k) {
  return `<g class="pl-sway" style="transform-origin:${f1(x)}px ${f1(y)}px;animation-delay:-${f1(plRnd(k, 31) * 4)}s"><path d="M${f1(x)} ${f1(y)}Q${f1(x - s * 0.3)} ${f1(y - s * 1.2)} ${f1(x)} ${f1(y - s * 2.2)}" stroke="#3F8A3C" stroke-width="${f1(s * 0.18)}" fill="none"/>`
    + `<ellipse cx="${f1(x - s * 0.4)}" cy="${f1(y - s * 0.9)}" rx="${f1(s * 0.42)}" ry="${f1(s * 0.16)}" fill="#4E9E46" transform="rotate(-30 ${f1(x - s * 0.4)} ${f1(y - s * 0.9)})"/>`
    + Array.from({ length: 8 }, (_, i) => `<ellipse cx="${f1(x)}" cy="${f1(y - s * 2.2 - s * 0.42)}" rx="${f1(s * 0.17)}" ry="${f1(s * 0.42)}" fill="${petal}" transform="rotate(${i * 45} ${f1(x)} ${f1(y - s * 2.2)})"/>`).join('')
    + `<circle cx="${f1(x)}" cy="${f1(y - s * 2.2)}" r="${f1(s * 0.26)}" fill="#FFC93C"/><circle cx="${f1(x - s * 0.07)}" cy="${f1(y - s * 2.27)}" r="${f1(s * 0.1)}" fill="#FFE68A"/></g>`;
}
function tulip(x, y, s, col, dark, k) {
  return `<g class="pl-sway" style="transform-origin:${f1(x)}px ${f1(y)}px;animation-delay:-${f1(plRnd(k, 32) * 4)}s"><path d="M${f1(x)} ${f1(y)}V${f1(y - s * 2.3)}" stroke="#3F8A3C" stroke-width="${f1(s * 0.18)}"/>`
    + `<path d="M${f1(x)} ${f1(y - s * 0.2)}Q${f1(x + s * 0.9)} ${f1(y - s * 0.9)} ${f1(x + s * 0.5)} ${f1(y - s * 1.7)}Q${f1(x + s * 0.3)} ${f1(y - s * 0.9)} ${f1(x)} ${f1(y - s * 0.5)}Z" fill="#4E9E46"/>`
    + `<path d="M${f1(x - s * 0.55)} ${f1(y - s * 3)}Q${f1(x - s * 0.6)} ${f1(y - s * 2.1)} ${f1(x)} ${f1(y - s * 2.1)}Q${f1(x + s * 0.6)} ${f1(y - s * 2.1)} ${f1(x + s * 0.55)} ${f1(y - s * 3)}L${f1(x + s * 0.28)} ${f1(y - s * 2.62)}L${f1(x)} ${f1(y - s * 3.1)}L${f1(x - s * 0.28)} ${f1(y - s * 2.62)}Z" fill="${col}"/>`
    + `<path d="M${f1(x)} ${f1(y - s * 3.1)}L${f1(x + s * 0.28)} ${f1(y - s * 2.62)}L${f1(x + s * 0.55)} ${f1(y - s * 3)}Q${f1(x + s * 0.6)} ${f1(y - s * 2.1)} ${f1(x)} ${f1(y - s * 2.1)}Z" fill="${dark}"/></g>`;
}
function butterfly(x, y, s, a, b, k) {
  return `<g class="pl-flutter" style="animation-delay:-${f1(plRnd(k, 33) * 9)}s"><g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s)})">`
    + `<g class="pl-wing"><path d="M0 0C-3 -6 -9 -6 -8 -1C-8 2 -3 2 0 0Z" fill="${a}"/><path d="M0 0C-3 3 -7 6 -5 7C-3 8 -1 4 0 0Z" fill="${b}"/>`
    + `<path d="M0 0C3 -6 9 -6 8 -1C8 2 3 2 0 0Z" fill="${a}"/><path d="M0 0C3 3 7 6 5 7C3 8 1 4 0 0Z" fill="${b}"/></g>`
    + `<rect x="-.6" y="-3" width="1.2" height="7" rx=".6" fill="#3B2A1A"/></g></g>`;
}
function fish(x, y, s, a, b, k, D) {
  const id = `fi${k}`;
  const body = D.lin(id, [[0, a], [1, b]]);
  return `<g class="pl-swim" style="animation-duration:${f1(16 + plRnd(k, 3) * 14)}s;animation-delay:-${f1(plRnd(k, 4) * 24)}s"><g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s)})">`
    + `<path d="M7 0L13 -5Q12 0 13 5Z" fill="${b}"/><path d="M-9 0C-6 -6 4 -7 8 0C4 7 -6 6 -9 0Z" fill="${body}"/>`
    + `<path d="M-1 -5C1 -2 1 2 -1 5" stroke="#FFFFFF" stroke-width="1.6" fill="none" opacity=".8"/><path d="M-1 -5.5L3 -9L4 -4Z" fill="${b}"/>`
    + `<circle cx="-5" cy="-1" r="1.4" fill="#fff"/><circle cx="-5.3" cy="-1" r=".8" fill="#1A1A2E"/></g></g>`;
}
function balloon(x, y, s, a, b, k) {
  const g = Array.from({ length: 5 }, (_, i) => `<path d="M${f1(-10 + i * 5)} -13Q${f1(-12 + i * 6)} 0 ${f1(-3 + i * 1.5)} 12L${f1(-1 + i * 1.5)} 12Q${f1(-8 + i * 6)} 0 ${f1(-5 + i * 5)} -13Z" fill="${i % 2 ? b : a}"/>`).join('');
  return `<g class="pl-bob" style="animation-delay:-${f1(plRnd(k, 5) * 5)}s"><g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s)})">`
    + `<clipPath id="bc${k}"><path d="M0 -15C-10 -15 -13 -7 -13 -2C-13 5 -5 9 -2 13H2C5 9 13 5 13 -2C13 -7 10 -15 0 -15Z"/></clipPath>`
    + `<g clip-path="url(#bc${k})"><rect x="-14" y="-16" width="28" height="30" fill="${a}"/>${g}<ellipse cx="-5" cy="-8" rx="5" ry="6" fill="#fff" opacity=".28"/></g>`
    + `<path d="M-2 13L-2.5 18M2 13L2.5 18" stroke="#5B4636" stroke-width=".6"/><rect x="-3.2" y="18" width="6.4" height="4.2" rx="1" fill="#9A6B3F"/><rect x="-3.2" y="18" width="6.4" height="1.3" fill="#7A522E"/></g></g>`;
}
function bird(x, y, s, k, col) {
  return `<g class="pl-glide" style="animation-delay:-${f1(plRnd(k, 6) * 12)}s"><path transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s)})" d="M-6 -1Q-3 -4 0 0Q3 -4 6 -1Q3 -2.4 0 1.2Q-3 -2.4 -6 -1Z" fill="${col}"/></g>`;
}
function starPath(x, y, r, col) {
  let d = '';
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; d += `${i ? 'L' : 'M'}${f1(x + Math.cos(a) * rr)} ${f1(y + Math.sin(a) * rr)}`; }
  return `<path d="${d}Z" fill="${col}" stroke-linejoin="round"/>`;
}

// ---------------------------------------------------------------- the land of each place
function placeLand(place, o, D) {
  const { w, h, tod, season } = o;
  const gy = o.gy ?? h * 0.8;
  const n = (base) => Math.max(1, Math.round(base * w / 400));      // more things on a wider picture
  const night = tod === 'night', dusk = tod === 'evening' || night;
  const winter = season === 'winter', autumn = season === 'autumn', spring = season === 'spring';
  const S = (c) => shade(c, tod);
  const air = (c, t) => S(mix(c, skyColors(place, tod)[2], t));     // far = paler, towards the sky colour
  let s = '';

  if (place === 'fireflies') {
    // far hills with little trees, a middle hill, the near meadow
    const g0 = winter ? '#DCE6F0' : '#6FA866', g1 = winter ? '#E8EFF6' : '#5C9E4F', g2 = winter ? '#F2F6FB' : '#4C9142';
    s += `<path d="${hillPath(w, h, gy - 34, 14, 3, 5)}" fill="${air(g0, 0.55)}"/>`;
    for (let i = 0; i < n(9); i++) { const x = plRnd(i, 41) * w; s += leafy(x, gy - 30 - plRnd(i, 42) * 6, 14 + plRnd(i, 43) * 6, air('#3E7A3A', 0.5), air('#2E5E2C', 0.5), air('#6FAF5A', 0.5)); }
    s += `<path d="${hillPath(w, h, gy - 14, 12, 7, 4)}" fill="${D.lin('m1', [[0, S(g1)], [1, S(mix(g1, '#1E4A20', 0.3))]])}"/>`;
    s += `<path d="${hillPath(w, h, gy + 2, 8, 11, 3)}" fill="${D.lin('m2', [[0, S(g2)], [1, S(mix(g2, '#173D1A', 0.45))]])}"/>`;
    if (!winter) {
      for (let i = 0; i < n(16); i++) s += tuft(plRnd(i, 44) * w, gy + 4 + plRnd(i, 45) * (h - gy - 2), 6 + plRnd(i, 46) * 6, S('#5FAE4E'), S('#3D7E35'), i);
      const pet = spring ? ['#FFFFFF', '#FFD1E6', '#FFFFFF'] : ['#FFFFFF', '#FFF3B0', '#FFFFFF'];
      for (let i = 0; i < n(12); i++) s += daisy(plRnd(i, 47) * w, gy + 6 + plRnd(i, 48) * (h - gy - 6), 2.8 + plRnd(i, 49) * 1.6, S(pet[i % 3]), i);
      for (let i = 0; i < n(5); i++) { const x = plRnd(i, 50) * w, y = gy + 2 + plRnd(i, 51) * 10; s += `<circle cx="${f1(x)}" cy="${f1(y - 7)}" r="3.4" fill="${S('#F1F4FA')}" opacity=".85"/><path d="M${f1(x)} ${f1(y)}V${f1(y - 6)}" stroke="${S('#6E9B5E')}" stroke-width=".7"/>`; }
    }
    s += `<path d="${hillPath(w, h, h - 6, 6, 13, 6)}" fill="${S(winter ? '#E4ECF5' : '#2F6B2C')}" opacity=".9"/>`;
    const many = dusk ? n(24) : n(5);
    for (let i = 0; i < many; i++) s += `<circle class="pl-glow" cx="${f1(plRnd(i, 52) * w)}" cy="${f1(gy - 2 - plRnd(i, 53) * gy * 0.6)}" r="${f1(2.6 + plRnd(i, 54) * 2)}" fill="${D.rad('ff', [[0, '#FFFBB0'], [0.35, '#F4F07A', 0.9], [1, '#F4F07A', 0]])}" style="animation-delay:-${f1(plRnd(i, 55) * 3)}s"/>`;
  } else if (place === 'forest') {
    const fCol = winter ? ['#8FA9A4', '#6E8B86'] : ['#3E8A5E', '#2C6B47'];
    // four layers of trees, from hazy far ones to big near ones
    [[0.62, 22, 16, 30], [0.42, 30, 12, 20], [0.2, 40, 9, 8]].forEach(([haze, size, count, base], L) => {
      s += `<path d="${hillPath(w, h, gy - base, 6, 20 + L, 5)}" fill="${air(fCol[1], haze)}"/>`;
      for (let i = 0; i < n(count); i++) {
        const x = (i + plRnd(i, 60 + L) * 0.8) * w / n(count), y = gy - base + 3 + plRnd(i, 61 + L) * 4, hh = size + plRnd(i, 62 + L) * size * 0.5;
        s += autumn && (i + L) % 3 === 1
          ? leafy(x, y, hh * 0.9, air(['#E8913A', '#D9622B', '#F2B544'][i % 3], haze), air(['#B8641F', '#A8431A', '#C98A1E'][i % 3], haze), air('#FFD27A', haze), air('#5A3B22', haze))
          : fir(x, y, hh, air(fCol[0], haze), air(fCol[1], haze), winter);
      }
    });
    if (tod === 'day' || tod === 'morning') for (let i = 0; i < 3; i++) s += `<path class="pl-ray" d="M${f1(w * (0.55 + i * 0.12))} 0L${f1(w * (0.35 + i * 0.12))} ${f1(gy)}L${f1(w * (0.42 + i * 0.12))} ${f1(gy)}L${f1(w * (0.6 + i * 0.12))} 0Z" fill="#FFF6D0" opacity=".12" style="animation-delay:-${i * 2}s"/>`;
    const gr = winter ? '#EEF4FB' : '#3E7F3C';
    s += `<path d="${hillPath(w, h, gy + 2, 6, 27, 3)}" fill="${D.lin('f1', [[0, S(gr)], [1, S(mix(gr, '#123018', 0.45))]])}"/>`;
    if (!winter) {
      for (let i = 0; i < n(6); i++) {                               // ferns
        const x = plRnd(i, 63) * w, y = gy + 6 + plRnd(i, 64) * 14;
        s += `<g class="pl-sway" style="transform-origin:${f1(x)}px ${f1(y)}px;animation-delay:-${f1(plRnd(i, 65) * 4)}s">${[-0.9, -0.3, 0.3, 0.9].map((a) => `<path d="M${f1(x)} ${f1(y)}Q${f1(x + a * 8)} ${f1(y - 10)} ${f1(x + a * 14)} ${f1(y - 6)}" stroke="${S('#4E9E46')}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-dasharray="1.5 1"/>`).join('')}</g>`;
      }
      for (let i = 0; i < n(4); i++) {                               // mushrooms
        const x = w * (0.08 + plRnd(i, 66) * 0.45), y = gy + 8 + plRnd(i, 67) * 10, sz = 1 + plRnd(i, 68) * 0.5;
        s += `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(sz)})"><path d="M-1.6 0L-1.2 -6H1.2L1.6 0Z" fill="${S('#F3E9D2')}"/><path d="M-6 -5.5Q0 -13 6 -5.5Q0 -4 -6 -5.5Z" fill="${S('#E5484D')}"/><path d="M0 -12.2Q4 -10 6 -5.5Q3 -5 2 -5.4Z" fill="${S('#B8323A')}"/><circle cx="-2.5" cy="-8" r="1" fill="#fff"/><circle cx="1" cy="-10" r=".8" fill="#fff"/></g>`;
      }
    }
    if (autumn) for (let i = 0; i < n(10); i++) s += `<ellipse cx="${f1(plRnd(i, 69) * w)}" cy="${f1(gy + 4 + plRnd(i, 70) * (h - gy - 4))}" rx="2" ry="1.1" fill="${S(['#E8913A', '#D9622B', '#F2B544'][i % 3])}"/>`;
    s += fir(w * 0.04, h + 8, 120, S(winter ? '#5F7C77' : '#1F5A3A'), S(winter ? '#4A6560' : '#16462C'), winter)
      + fir(w * 0.97, h + 8, 132, S(winter ? '#5F7C77' : '#1F5A3A'), S(winter ? '#4A6560' : '#16462C'), winter);
    if (dusk) for (let i = 0; i < n(12); i++) s += `<circle class="pl-glow" cx="${f1(plRnd(i, 71) * w)}" cy="${f1(gy - 6 - plRnd(i, 72) * 50)}" r="2.6" fill="${D.rad('ffg', [[0, '#F2FFB8'], [0.4, '#C8F27A', 0.9], [1, '#C8F27A', 0]])}" style="animation-delay:-${f1(plRnd(i, 73) * 3)}s"/>`;
  } else if (place === 'blossom') {
    const g0 = '#9BD58A', g1 = '#79C46A';
    s += `<path d="${hillPath(w, h, gy - 30, 10, 31, 4)}" fill="${air(g0, 0.45)}"/>`;
    for (let i = 0; i < n(7); i++) { const x = plRnd(i, 80) * w; s += leafy(x, gy - 26, 12 + plRnd(i, 81) * 5, air('#6DBA5E', 0.4), air('#4E9E46', 0.4), air('#B6E39A', 0.4)); }
    // cherry trees: a dark trunk with branches and clouds of blossom in three pinks
    const cherry = (x, y, sc, k) => {
      let c = `<path d="M${f1(x - 3 * sc)} ${f1(y)}Q${f1(x - 1 * sc)} ${f1(y - 20 * sc)} ${f1(x)} ${f1(y - 34 * sc)}M${f1(x)} ${f1(y - 26 * sc)}Q${f1(x - 10 * sc)} ${f1(y - 34 * sc)} ${f1(x - 16 * sc)} ${f1(y - 40 * sc)}M${f1(x)} ${f1(y - 30 * sc)}Q${f1(x + 10 * sc)} ${f1(y - 36 * sc)} ${f1(x + 15 * sc)} ${f1(y - 44 * sc)}" stroke="${S('#5A3B32')}" stroke-width="${f1(3.4 * sc)}" stroke-linecap="round" fill="none"/>`;
      const blob = [[-16, -44, 11], [-4, -52, 13], [10, -50, 12], [18, -42, 10], [-22, -36, 9], [2, -40, 11], [-10, -36, 9], [12, -34, 8]];
      c += blob.map(([dx, dy, r]) => `<circle cx="${f1(x + dx * sc)}" cy="${f1(y + dy * sc + 2 * sc)}" r="${f1(r * sc)}" fill="${S('#E98AB0')}"/>`).join('');
      c += blob.map(([dx, dy, r]) => `<circle cx="${f1(x + dx * sc - 1.5 * sc)}" cy="${f1(y + dy * sc - 1 * sc)}" r="${f1(r * sc * 0.82)}" fill="${S('#FFB7D0')}"/>`).join('');
      c += blob.slice(0, 5).map(([dx, dy, r]) => `<circle cx="${f1(x + dx * sc - 3 * sc)}" cy="${f1(y + dy * sc - 3 * sc)}" r="${f1(r * sc * 0.35)}" fill="${S('#FFE3EE')}"/>`).join('');
      for (let i = 0; i < 10; i++) c += `<circle cx="${f1(x + (plRnd(k, i) - 0.5) * 40 * sc)}" cy="${f1(y - 34 * sc + (plRnd(k, i + 20) - 0.5) * 24 * sc)}" r="${f1(1.2 * sc)}" fill="#FFFFFF" opacity=".85"/>`;
      return c;
    };
    s += cherry(w * 0.13, gy - 2, 1.25, 1) + cherry(w * 0.9, gy - 4, 1.05, 2);
    s += `<path d="${hillPath(w, h, gy + 1, 6, 35, 3)}" fill="${D.lin('g1', [[0, S(g1)], [1, S(mix(g1, '#2E6A2C', 0.4))]])}"/>`;
    // a path to the house
    s += `<path d="M${f1(w * 0.66 - 8)} ${f1(gy + 2)}Q${f1(w * 0.6)} ${f1(gy + 16)} ${f1(w * 0.5)} ${f1(h)}H${f1(w * 0.62)}Q${f1(w * 0.68)} ${f1(gy + 16)} ${f1(w * 0.66 + 8)} ${f1(gy + 2)}Z" fill="${S('#EAD7B0')}"/>`;
    // white fence with shadows
    const fx0 = w * 0.25, fx1 = w * 0.5;
    s += `<rect x="${f1(fx0)}" y="${f1(gy - 9)}" width="${f1(fx1 - fx0)}" height="2.2" fill="${S('#FFFFFF')}"/><rect x="${f1(fx0)}" y="${f1(gy - 4)}" width="${f1(fx1 - fx0)}" height="2.2" fill="${S('#FFFFFF')}"/>`;
    for (let x = fx0; x <= fx1; x += 7) s += `<path d="M${f1(x)} ${f1(gy + 1)}V${f1(gy - 12)}L${f1(x + 1.6)} ${f1(gy - 14)}L${f1(x + 3.2)} ${f1(gy - 12)}V${f1(gy + 1)}Z" fill="${S('#FFFFFF')}"/><rect x="${f1(x + 2.2)}" y="${f1(gy - 12)}" width="1" height="13" fill="${S('#D9D2C8')}"/>`;
    const cols = [['#FF5C8A', '#D63A6A'], ['#FFC93C', '#E0A21A'], ['#9B7BFF', '#7556DB'], ['#FF8A4C', '#DB6528'], ['#FF6B6B', '#D44848']];
    for (let i = 0; i < n(22); i++) {
      const x = plRnd(i, 82) * w, y = gy + 6 + plRnd(i, 83) * (h - gy - 6);
      if (Math.abs(x - w * 0.58) < w * 0.07) continue;               // not on the path
      const [c, d] = cols[i % cols.length];
      s += i % 3 === 0 ? daisy(x, y, 3.6 + plRnd(i, 84) * 1.6, S('#FFFFFF'), i) : tulip(x, y, 4.6 + plRnd(i, 85) * 1.8, S(c), S(d), i);
    }
    for (let i = 0; i < n(6); i++) {                                 // lavender
      const x = plRnd(i, 86) * w, y = gy + 4 + plRnd(i, 87) * 10;
      s += `<g class="pl-sway" style="transform-origin:${f1(x)}px ${f1(y)}px;animation-delay:-${f1(plRnd(i, 88) * 4)}s"><path d="M${f1(x)} ${f1(y)}V${f1(y - 12)}" stroke="#4E8A45" stroke-width=".8"/>${[0, 1, 2, 3].map((j) => `<ellipse cx="${f1(x)}" cy="${f1(y - 12 + j * 2.2)}" rx="1.4" ry="1.2" fill="${S('#A07BE0')}"/>`).join('')}</g>`;
    }
    if (!dusk) s += butterfly(w * 0.36, gy - 40, 0.9, '#FFB13C', '#FF7A3C', 1) + butterfly(w * 0.78, gy - 54, 0.75, '#7FD3FF', '#4AA6F0', 2);
    for (let i = 0; i < n(9); i++) s += `<path class="pl-petal" d="M${f1(plRnd(i, 89) * w)} -6q2 -2 4 0q-2 2 -4 0z" fill="#FFB7D0" style="animation-delay:-${f1(plRnd(i, 90) * 10)}s;animation-duration:${f1(9 + plRnd(i, 91) * 6)}s"/>`;
  } else if (place === 'ocean') {
    // light from the surface, far rocks in the blue haze, sand, plants, fish
    for (let i = 0; i < n(4); i++) s += `<path class="pl-ray" d="M${f1(w * (0.08 + i * 0.26))} 0L${f1(w * (0.02 + i * 0.26))} ${f1(gy)}L${f1(w * (0.14 + i * 0.26))} ${f1(gy)}L${f1(w * (0.15 + i * 0.26))} 0Z" fill="${D.lin('ray', [[0, '#E8FBFF', 0.32], [1, '#E8FBFF', 0]])}" style="animation-delay:-${i * 2}s"/>`;
    s += `<path d="${hillPath(w, h, gy - 22, 18, 41, 5)}" fill="${air('#2A6C95', 0.45)}"/>`;
    for (let i = 0; i < n(5); i++) {                                 // tall kelp far away
      const x = plRnd(i, 92) * w, hh = 50 + plRnd(i, 93) * 30;
      s += `<path class="pl-sway" style="transform-origin:${f1(x)}px ${f1(gy - 10)}px;animation-delay:-${f1(plRnd(i, 94) * 4)}s" d="M${f1(x)} ${f1(gy - 10)}C${f1(x - 8)} ${f1(gy - 10 - hh * 0.3)} ${f1(x + 8)} ${f1(gy - 10 - hh * 0.6)} ${f1(x)} ${f1(gy - 10 - hh)}" stroke="${air('#2E8B6A', 0.5)}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    }
    const sand = '#E9D3A2';
    s += `<path d="${hillPath(w, h, gy + 1, 7, 43, 4)}" fill="${D.lin('sa', [[0, S(sand)], [1, S(mix(sand, '#8C6E3E', 0.45))]])}"/>`;
    for (let i = 0; i < n(6); i++) { const x = plRnd(i, 95) * w, y = gy + 8 + plRnd(i, 96) * (h - gy - 10); s += `<path d="M${f1(x - 10)} ${f1(y)}q5 -2 10 0t10 0" stroke="${S('#CDB27E')}" stroke-width="1" fill="none"/>`; }
    // rocks
    for (const [x, r] of [[w * 0.86, 13], [w * 0.08, 10]]) s += `<ellipse cx="${f1(x)}" cy="${f1(gy + 4)}" rx="${f1(r * 1.4)}" ry="${f1(r * 0.8)}" fill="${S('#5F6F80')}"/><ellipse cx="${f1(x - r * 0.3)}" cy="${f1(gy + 1)}" rx="${f1(r * 0.9)}" ry="${f1(r * 0.45)}" fill="${S('#7C8DA0')}"/>`;
    // seaweed: tapered leaves on a stem
    for (let i = 0; i < n(7); i++) {
      const x = plRnd(i, 97) * w, hh = 26 + plRnd(i, 98) * 30, c = i % 2 ? '#2FA36B' : '#4CC98A';
      let leaves = '';
      for (let j = 1; j < 5; j++) { const yy = gy - hh * j / 5, side = j % 2 ? -1 : 1; leaves += `<path d="M${f1(x)} ${f1(yy)}q${f1(side * 7)} ${f1(-3)} ${f1(side * 9)} ${f1(-9)}q${f1(-side * 6)} 2 ${f1(-side * 9)} 9z" fill="${S(c)}"/>`; }
      s += `<g class="pl-sway" style="transform-origin:${f1(x)}px ${f1(gy)}px;animation-delay:-${f1(plRnd(i, 99) * 4)}s"><path d="M${f1(x)} ${f1(gy + 2)}C${f1(x - 5)} ${f1(gy - hh * 0.3)} ${f1(x + 5)} ${f1(gy - hh * 0.6)} ${f1(x)} ${f1(gy - hh)}" stroke="${S(c)}" stroke-width="2" fill="none"/>${leaves}</g>`;
    }
    // coral: branching shapes with a light side
    for (let i = 0; i < n(3); i++) {
      const x = w * (0.22 + i * 0.28) + plRnd(i, 100) * 18, [c, d] = [['#FF7A8A', '#D9506A'], ['#FFA45B', '#DB7A30'], ['#C77DFF', '#9A52D6']][i % 3];
      const br = `M${f1(x)} ${f1(gy + 2)}V${f1(gy - 12)}M${f1(x)} ${f1(gy - 5)}Q${f1(x - 7)} ${f1(gy - 8)} ${f1(x - 8)} ${f1(gy - 18)}M${f1(x)} ${f1(gy - 8)}Q${f1(x + 7)} ${f1(gy - 10)} ${f1(x + 7)} ${f1(gy - 21)}M${f1(x - 8)} ${f1(gy - 13)}L${f1(x - 12)} ${f1(gy - 17)}`;
      s += `<path d="${br}" stroke="${S(d)}" stroke-width="4.4" stroke-linecap="round" fill="none"/><path d="${br}" stroke="${S(c)}" stroke-width="2.6" stroke-linecap="round" fill="none"/>`;
    }
    s += starPath(w * 0.44, gy + 9, 4.5, S('#FF8A4C')) + `<path d="M${f1(w * 0.75)} ${f1(gy + 10)}a4 4 0 0 1 8 0z" fill="${S('#FFE2D0')}"/><path d="M${f1(w * 0.75 + 2)} ${f1(gy + 10)}v-3M${f1(w * 0.75 + 4)} ${f1(gy + 10)}v-4M${f1(w * 0.75 + 6)} ${f1(gy + 10)}v-3" stroke="${S('#E8B9A0')}" stroke-width=".6"/>`;
    const fc = [['#FFC24B', '#FF8A2A'], ['#FF7A7A', '#E04848'], ['#6FE0FF', '#2EA8E0'], ['#FFE87A', '#F2B544'], ['#C9A2FF', '#8E5CF7']];
    for (let i = 0; i < n(6); i++) s += fish(plRnd(i, 101) * w, 18 + plRnd(i, 102) * (gy - 54), 0.6 + plRnd(i, 103) * 0.5, S(fc[i % 5][0]), S(fc[i % 5][1]), i, D);
    for (let i = 0; i < n(12); i++) s += `<circle class="pl-bubble" cx="${f1(plRnd(i, 104) * w)}" cy="${f1(gy)}" r="${f1(1.2 + plRnd(i, 105) * 2)}" fill="rgba(255,255,255,.12)" stroke="rgba(230,250,255,.7)" stroke-width=".7" style="animation-delay:-${f1(plRnd(i, 106) * 8)}s;animation-duration:${f1(6 + plRnd(i, 107) * 6)}s"/>`;
  } else if (place === 'clouds') {
    const top = night ? '#C4CDE6' : tod === 'evening' ? '#FFE3D2' : '#FFFFFF', bot = night ? '#7E8BB0' : tod === 'evening' ? '#C99AB5' : '#BCD0EA';
    for (let i = 0; i < n(3); i++) s += `<g class="pl-drift" style="animation-duration:${f1(80 + plRnd(i, 110) * 50)}s;animation-delay:-${f1(plRnd(i, 111) * 80)}s">${cloud(plRnd(i, 112) * w, 26 + plRnd(i, 113) * 30, 7 + plRnd(i, 114) * 4, top, bot, 0.55)}</g>`;
    s += balloon(w * 0.17, 46, 1.25, '#E8505B', '#FFD166', 1) + balloon(w * 0.84, 34, 0.85, '#3A86FF', '#F1F5FF', 2) + balloon(w * 0.45, 22, 0.55, '#8E5CF7', '#FF9F1C', 3);
    if (!night) for (let i = 0; i < 4; i++) s += bird(w * (0.55 + i * 0.035), 30 + (i % 2) * 6 + i, 0.8 - i * 0.08, i, 'rgba(40,50,70,.7)');
    // the big cloud Lumi's home stands on: a shadow layer and a lit layer
    const bumps = n(10);
    const layer = (dy, col, sc) => `<g fill="${col}"><rect x="0" y="${f1(gy + 6 + dy)}" width="${w}" height="${f1(h)}"/>`
      + Array.from({ length: bumps + 1 }, (_, i) => `<circle cx="${f1(i * w / bumps + (plRnd(i, 115) - 0.5) * 10)}" cy="${f1(gy + 6 + dy + plRnd(i, 116) * 4)}" r="${f1((15 + plRnd(i, 117) * 10) * sc)}"/>`).join('') + '</g>';
    s += layer(6, bot, 1.05) + layer(0, top, 1) + layer(16, mix(bot, top, 0.4), 0.9);
  } else if (place === 'space') {
    // a ringed planet, a moon, a comet, and Lumi's own little planet
    const px = w * 0.82;
    s += `<ellipse cx="${f1(px)}" cy="32" rx="34" ry="8" fill="none" stroke="#E9C88E" stroke-width="2.4" opacity=".55" transform="rotate(-16 ${f1(px)} 32)"/>`;
    s += `<circle cx="${f1(px)}" cy="32" r="17" fill="${D.rad('pl', [[0, '#FFD9A0'], [0.6, '#E59A52'], [1, '#9A5A2A']], 0.35, 0.3, 0.75)}"/>`
      + `<path d="M${f1(px - 16)} 28q16 -4 32 0M${f1(px - 16)} 35q16 -4 32 0" stroke="#C97A3E" stroke-width="2" fill="none" opacity=".5"/>`;
    s += `<path d="M${f1(px - 34 * Math.cos(0.28))} ${f1(32 + 34 * Math.sin(0.28))}A34 8 -16 0 0 ${f1(px + 34 * Math.cos(0.28))} ${f1(32 - 34 * Math.sin(0.28))}" fill="none" stroke="#F6DFAE" stroke-width="2.4"/>`;
    const mx = w * 0.13;
    s += `<circle cx="${f1(mx)}" cy="28" r="9" fill="${D.rad('mo', [[0, '#E6ECFF'], [1, '#8A9AD0']], 0.35, 0.3, 0.8)}"/><circle cx="${f1(mx - 3)}" cy="26" r="2" fill="#9AA8D8"/><circle cx="${f1(mx + 3)}" cy="31" r="1.4" fill="#9AA8D8"/>`;
    s += `<g class="pl-shoot"><path d="M${f1(w * 0.3)} 16l30 9" stroke="${D.lin('cm', [[0, '#FFFFFF', 0], [1, '#FFFFFF', 0.9]], 1, 0)}" stroke-width="1.6" stroke-linecap="round"/><circle cx="${f1(w * 0.3 + 30)}" cy="25" r="1.6" fill="#fff"/></g>`;
    const R = w * 0.9, cy = gy + R * 0.42 + 6;
    s += `<ellipse cx="${f1(w * 0.5)}" cy="${f1(cy)}" rx="${f1(R * 0.78)}" ry="${f1(R * 0.45)}" fill="#8D7FE0" opacity=".18"/>`
      + `<ellipse cx="${f1(w * 0.5)}" cy="${f1(cy + 2)}" rx="${f1(R * 0.74)}" ry="${f1(R * 0.42)}" fill="${D.lin('lp', [[0, '#7A69CF'], [0.3, '#5B4B9E'], [1, '#2E2560']])}"/>`;
    for (let i = 0; i < n(6); i++) {
      const x = w * (0.08 + plRnd(i, 120) * 0.84), y = gy + 8 + plRnd(i, 121) * (h - gy - 8), r = 4 + plRnd(i, 122) * 5;
      s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(r)}" ry="${f1(r * 0.4)}" fill="#3F3380"/><path d="M${f1(x - r)} ${f1(y)}a${f1(r)} ${f1(r * 0.4)} 0 0 0 ${f1(r * 2)} 0" stroke="#9A8CE8" stroke-width=".8" fill="none"/>`;
    }
    for (let i = 0; i < n(4); i++) {                                 // glowing crystals
      const x = w * (0.1 + plRnd(i, 123) * 0.8), y = gy + 6 + plRnd(i, 124) * 8;
      s += `<path class="pl-glow" d="M${f1(x)} ${f1(y)}l-2.4 -5l2.4 -6l2.4 6z" fill="${['#7FE7FF', '#FF9EE0', '#B6FF9E', '#FFE27A'][i % 4]}" style="animation-delay:-${i}s"/>`;
    }
  }
  if (winter && ['fireflies', 'blossom'].includes(place)) s += `<path d="${hillPath(w, h, gy + 4, 4, 51, 4)}" fill="#F4F8FF" opacity=".85"/>`;
  if (autumn && ['fireflies', 'blossom'].includes(place)) {
    for (let i = 0; i < n(6); i++) s += `<path class="pl-leaf" d="M${f1(plRnd(i, 130) * w)} -6q3 -3 6 0q-3 3 -6 0z" fill="${['#E8913A', '#D9622B', '#F2B544'][i % 3]}" style="animation-delay:-${f1(plRnd(i, 131) * 9)}s"/>`;
  }
  return s;
}

// ---------------------------------------------------------------- sky
function placeSky(place, o, D) {
  const { w, h, tod } = o;
  const [a, b, c] = skyColors(place, tod);
  let s = `<rect width="${w}" height="${h}" fill="${D.lin('sky', [[0, a], [0.62, b], [1, c]])}"/>`;
  const night = tod === 'night';
  if (place === 'space') {
    s += `<ellipse cx="${f1(w * 0.32)}" cy="${f1(h * 0.35)}" rx="${f1(w * 0.34)}" ry="${f1(h * 0.24)}" fill="${D.rad('n1', [[0, '#C77DFF', 0.32], [1, '#C77DFF', 0]])}"/>`
      + `<ellipse cx="${f1(w * 0.62)}" cy="${f1(h * 0.22)}" rx="${f1(w * 0.26)}" ry="${f1(h * 0.18)}" fill="${D.rad('n2', [[0, '#4FC3F7', 0.22], [1, '#4FC3F7', 0]])}"/>`;
  }
  if (place === 'space' || (night && place !== 'ocean')) {
    for (let i = 0; i < Math.round(48 * w / 400); i++) s += `<circle class="pl-twinkle" cx="${f1(plRnd(i, 140) * w)}" cy="${f1(plRnd(i, 141) * h * 0.62)}" r="${f1(0.35 + plRnd(i, 142) * 0.9)}" fill="#fff" style="animation-delay:-${f1(plRnd(i, 143) * 3)}s"/>`;
    for (let i = 0; i < 3; i++) { const x = plRnd(i, 144) * w, y = 8 + plRnd(i, 145) * h * 0.35; s += `<path class="pl-twinkle" d="M${f1(x)} ${f1(y - 3)}L${f1(x + 0.6)} ${f1(y - 0.6)}L${f1(x + 3)} ${f1(y)}L${f1(x + 0.6)} ${f1(y + 0.6)}L${f1(x)} ${f1(y + 3)}L${f1(x - 0.6)} ${f1(y + 0.6)}L${f1(x - 3)} ${f1(y)}L${f1(x - 0.6)} ${f1(y - 0.6)}Z" fill="#fff"/>`; }
  }
  if (place === 'ocean') {
    s += `<path d="M0 7Q${f1(w * 0.12)} 3 ${f1(w * 0.25)} 7T${f1(w * 0.5)} 7T${f1(w * 0.75)} 7T${w} 7" stroke="rgba(255,255,255,.45)" stroke-width="1.4" fill="none"/>`
      + `<path class="pl-ray" d="M0 14Q${f1(w * 0.2)} 10 ${f1(w * 0.4)} 15T${w} 13" stroke="rgba(255,255,255,.18)" stroke-width="3" fill="none"/>`;
  } else if (place !== 'space') {
    if (night) {
      s += `<circle cx="${f1(w * 0.86)}" cy="24" r="22" fill="${D.rad('moonglow', [[0, '#F6F1C7', 0.35], [1, '#F6F1C7', 0]])}"/>`
        + `<mask id="${D.id('mm')}"><rect width="${w}" height="${h}" fill="#fff"/><circle cx="${f1(w * 0.86 + 4.5)}" cy="20.5" r="9" fill="#000"/></mask>`
        + `<circle cx="${f1(w * 0.86)}" cy="24" r="10" fill="#F6F1C7" mask="url(#${D.id('mm')})"/>`;
    } else {
      const sx = tod === 'morning' ? w * 0.16 : tod === 'evening' ? w * 0.82 : w * 0.8, sy = tod === 'day' ? 26 : 52;
      s += `<circle cx="${f1(sx)}" cy="${sy}" r="40" fill="${D.rad('sun', [[0, tod === 'evening' ? '#FFB36B' : '#FFF3B0', 0.6], [1, '#FFF3B0', 0]])}"/>`
        + `<circle cx="${f1(sx)}" cy="${sy}" r="11" fill="${tod === 'evening' ? '#FFB36B' : '#FFE27A'}"/><circle cx="${f1(sx - 3)}" cy="${sy - 3}" r="5" fill="#FFF6C8" opacity=".6"/>`;
      if (place !== 'clouds') {
        const top = tod === 'evening' ? '#FFE3D2' : '#FFFFFF', bot = tod === 'evening' ? '#D79AB0' : '#CFE0F2';
        for (let i = 0; i < Math.round(3 * w / 400); i++) s += `<g class="pl-drift" style="animation-duration:${f1(90 + plRnd(i, 146) * 60)}s;animation-delay:-${f1(plRnd(i, 147) * 90)}s">${cloud(plRnd(i, 148) * w, 18 + plRnd(i, 149) * 22, 6 + plRnd(i, 150) * 4, top, bot, 0.9)}</g>`;
      }
    }
  }
  return s;
}

// ---------------------------------------------------------------- weather
function placeWeather(place, kind, o) {
  if (!kind || !OUTDOOR.includes(place)) return '';
  const { w, h } = o;
  let s = '';
  if (['cloudy', 'rain', 'snow', 'storm', 'fog'].includes(kind)) s += `<rect width="${w}" height="${h}" fill="rgba(90,100,125,.3)"/>`;
  if (kind !== 'clear') for (let i = 0; i < (kind === 'partly' ? 2 : 4); i++) s += `<g class="pl-drift" style="animation-duration:${f1(70 + plRnd(i, 151) * 40)}s;animation-delay:-${f1(plRnd(i, 152) * 70)}s">${cloud(plRnd(i, 153) * w, 16 + plRnd(i, 154) * 20, 8 + plRnd(i, 155) * 4, kind === 'partly' ? '#FFFFFF' : '#D3D9E4', kind === 'partly' ? '#CFE0F2' : '#9AA4B6', 0.95)}</g>`;
  if (kind === 'rain' || kind === 'storm') for (let i = 0; i < Math.round(40 * w / 400); i++) s += `<path class="pl-rain" d="M${f1(plRnd(i, 156) * w)} -10l-2 10" stroke="rgba(210,230,255,.75)" stroke-width="1" style="animation-delay:-${f1(plRnd(i, 157))}s"/>`;
  if (kind === 'storm') s += `<rect class="pl-flash" width="${w}" height="${h}" fill="#fff" opacity="0"/>`;
  if (kind === 'snow') for (let i = 0; i < Math.round(30 * w / 400); i++) s += `<circle class="pl-snow" cx="${f1(plRnd(i, 158) * w)}" cy="-6" r="${f1(1 + plRnd(i, 159) * 1.4)}" fill="#fff" style="animation-delay:-${f1(plRnd(i, 160) * 7)}s;animation-duration:${f1(5 + plRnd(i, 161) * 5)}s"/>`;
  if (kind === 'fog') s += `<rect y="${f1(h * 0.35)}" width="${w}" height="${f1(h * 0.65)}" fill="rgba(235,240,248,.6)"/>`;
  return s;
}

// ---------------------------------------------------------------- Lumi's home
const HOME_COL = {               // wall, wall shadow, roof, roof shadow
  forest: ['#C9935E', '#A06E40', '#4E8A55', '#3A6B40'], blossom: ['#FFF6EC', '#E9D8C6', '#F07AA8', '#C9578A'],
  ocean: ['#FFE2CF', '#E9BFA4', '#FF7A8A', '#D9506A'], clouds: ['#FFFFFF', '#DCE6F3', '#5AA9FF', '#3A86E0'],
  space: ['#EEF1FA', '#C9CFE6', '#8E5CF7', '#6A3FD0'], fireflies: ['#F2DDB2', '#D6BC8A', '#B5833F', '#8F6328'],
};
/** The home grows with Lumi: a jar (stages 1-2), a lantern (3-4), a little house (5-6). lit = a warm window. */
function placeHome(place, stage, lit, x, y, D, tod) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(1.25)">${homeShape(place, stage, lit, D, tod)}</g>`;
}
function homeShape(place, stage, lit, D, tod) {
  const [wall, wall2, roof, roof2] = (HOME_COL[place] || HOME_COL.fireflies).map((c) => shade(c, tod === 'night' ? 'evening' : tod));
  const glow = lit ? `<circle class="pl-glow" cx="0" cy="-18" r="26" fill="${D.rad('hg', [[0, '#FFD983', 0.55], [1, '#FFD983', 0]])}"/>` : '';
  const shadow = `<ellipse cx="0" cy="1" rx="${stage <= 1 ? 14 : stage <= 3 ? 16 : 32}" ry="3" fill="#000" opacity=".18"/>`;
  if (stage <= 1) {                                                   // a glass jar with a cork and a ribbon
    return `${shadow}${glow}<path d="M-11 -26Q-13 -26 -13 -22V-6Q-13 0 -7 0H7Q13 0 13 -6V-22Q13 -26 11 -26Z" fill="${D.lin('jar', [[0, '#FFFFFF', 0.45], [0.5, '#D8EEFF', 0.18], [1, '#FFFFFF', 0.4]], 1, 0)}" stroke="rgba(255,255,255,.85)" stroke-width="1.2"/>`
      + (lit ? `<circle cx="0" cy="-12" r="6" fill="${D.rad('jl', [[0, '#FFF6B0'], [1, '#FFD34D', 0]])}"/>` : '')
      + `<rect x="-9" y="-33" width="18" height="8" rx="2" fill="${D.lin('cork', [[0, '#C99A62'], [1, '#8F6630']])}"/><rect x="-10.5" y="-27" width="21" height="3" rx="1.5" fill="${roof}"/>`
      + `<path d="M8 -26q5 2 3 7" stroke="${roof}" stroke-width="1.4" fill="none"/>`
      + `<path d="M-9 -22V-6" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" opacity=".7"/><path d="M-5.5 -22V-17" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" opacity=".55"/>`;
  }
  if (stage <= 3) {                                                   // a lantern: dark frame, warm glass
    const pane = D.lin('pane', [[0, lit ? '#FFF2B0' : '#FFF7DA'], [1, lit ? '#FFC24B' : '#F1DFA8']]);
    return `${shadow}${glow}<path d="M-4 -47q4 -7 8 0" stroke="#2F2F42" stroke-width="2" fill="none"/>`
      + `<path d="M-13 -38h26l-5 -7h-16z" fill="#3A3A52"/><path d="M0 -45h8l5 7H0z" fill="#2A2A3E"/>`
      + `<rect x="-11" y="-38" width="22" height="32" rx="2" fill="${pane}" fill-opacity="${lit ? 0.95 : 0.75}"/>`
      + (lit ? `<ellipse cx="0" cy="-20" rx="5" ry="7" fill="${D.rad('fl', [[0, '#FFFFFF'], [0.5, '#FFE27A'], [1, '#FF9F2A', 0]])}"/>` : '')
      + `<rect x="-11" y="-38" width="22" height="32" rx="2" fill="none" stroke="#2F2F42" stroke-width="2.4"/><path d="M-3.6 -38v32M3.6 -38v32" stroke="#2F2F42" stroke-width="1.4"/>`
      + `<path d="M-9 -35v26" stroke="#fff" stroke-width="1.2" opacity=".55"/><rect x="-14" y="-7" width="28" height="7" rx="2" fill="#3A3A52"/><rect x="0" y="-7" width="14" height="7" rx="2" fill="#2A2A3E"/>`;
  }
  if (place === 'space') {                                            // a dome with a blinking antenna
    return `${shadow}${glow}<path d="M-28 0V-12A28 28 0 0 1 28 -12V0Z" fill="${D.lin('dome', [[0, wall], [1, wall2]], 1, 0)}"/>`
      + `<path d="M-28 -12A28 28 0 0 1 0 -40" stroke="#FFFFFF" stroke-width="2" fill="none" opacity=".7"/><rect x="-30" y="-3" width="60" height="4" rx="2" fill="#9AA2C2"/>`
      + `<path d="M6 -39l4 -12" stroke="#9AA2C2" stroke-width="2"/><circle class="pl-glow" cx="10.5" cy="-52" r="2.6" fill="#FF6B9A"/>`
      + `<path d="M-18 0V-14a5 5 0 0 1 10 0V0Z" fill="#8790B4"/><circle cx="10" cy="-17" r="7" fill="${lit ? '#FFD983' : '#9FD0F2'}" stroke="#9AA2C2" stroke-width="2.4"/>`;
  }
  const tiles = Array.from({ length: 4 }, (_, i) => `<path d="M${f1(-24 + i * 3)} ${f1(-29 - i * 4.5)}H${f1(24 - i * 3)}" stroke="${roof2}" stroke-width="1" opacity=".6"/>`).join('');
  return `${shadow}${glow}<rect x="18" y="-50" width="7" height="16" fill="${shade('#7A5A48', tod)}"/><rect x="17" y="-52" width="9" height="3" fill="${shade('#5E4436', tod)}"/>`
    + (lit ? [0, 1, 2].map((i) => `<circle class="pl-smoke" cx="21.5" cy="-54" r="${2 + i}" fill="#E8EAF0" opacity=".6" style="animation-delay:-${i}s"/>`).join('') : '')
    + `<rect x="-22" y="-28" width="44" height="28" fill="${D.lin('wall', [[0, wall], [0.7, wall], [1, wall2]], 1, 0)}"/>`
    + `<path d="M-29 -26L0 -50L29 -26Z" fill="${roof}"/><path d="M0 -50L29 -26H10Z" fill="${roof2}"/>${tiles}`
    + `<path d="M-30 -25.5L0 -51L30 -25.5" stroke="${roof2}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
    + `<path d="M-17 0V-12a5 5 0 0 1 10 0V0Z" fill="${shade('#7A4E30', tod)}"/><circle cx="-9" cy="-6" r="1" fill="#FFD84A"/>`
    + `<circle cx="9" cy="-15" r="7.5" fill="${lit ? D.rad('win', [[0, '#FFF2B0'], [1, '#FFC24B']]) : '#BFDDF5'}" stroke="${shade('#7A4E30', tod)}" stroke-width="2"/><path d="M1.5 -15h15M9 -22.5v15" stroke="${shade('#7A4E30', tod)}" stroke-width="1.3"/>`
    + `<rect x="0" y="-6.5" width="18" height="4" rx="1" fill="${shade('#8A5A35', tod)}"/><circle cx="4" cy="-8" r="1.8" fill="#FF6B9A"/><circle cx="9" cy="-8.4" r="1.8" fill="#FFC93C"/><circle cx="14" cy="-8" r="1.8" fill="#FF6B9A"/>`;
}
const PLACE_LUMI = 54;
const homeTop = (stage) => 1.25 * (stage <= 1 ? 33 : stage <= 3 ? 47 : 50);

// ---------------------------------------------------------------- animations (inside the SVG, so the widget gets them too)
const PLACE_CSS = `<style>
.pl-sway{animation:plSway 4s ease-in-out infinite}@keyframes plSway{50%{transform:rotate(4deg)}}
.pl-glow{animation:plGlow 3s ease-in-out infinite}@keyframes plGlow{50%{opacity:.4}}
.pl-twinkle{animation:plTw 3s ease-in-out infinite}@keyframes plTw{50%{opacity:.25}}
.pl-swim{animation:plSwim linear infinite}@keyframes plSwim{from{transform:translateX(110%)}to{transform:translateX(-110%)}}
.pl-bubble{animation:plBub linear infinite}@keyframes plBub{from{transform:translateY(0);opacity:.9}to{transform:translateY(-180px);opacity:0}}
.pl-ray{animation:plRay 7s ease-in-out infinite}@keyframes plRay{50%{opacity:.45}}
.pl-drift{animation:plDrift linear infinite}@keyframes plDrift{from{transform:translateX(-30%)}to{transform:translateX(130%)}}
.pl-bob{animation:plBob 5s ease-in-out infinite}@keyframes plBob{50%{transform:translateY(-5px)}}
.pl-glide{animation:plGlide 14s linear infinite}@keyframes plGlide{from{transform:translateX(-60px)}to{transform:translateX(120px)}}
.pl-flutter{animation:plFl 9s ease-in-out infinite}@keyframes plFl{25%{transform:translate(30px,-12px)}50%{transform:translate(60px,4px)}75%{transform:translate(25px,10px)}}
.pl-wing{animation:plWing .3s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:center}@keyframes plWing{to{transform:scaleX(.45)}}
.pl-petal,.pl-leaf{animation:plFall 10s linear infinite}@keyframes plFall{from{transform:translate(0,0) rotate(0)}to{transform:translate(18px,200px) rotate(360deg)}}
.pl-rain{animation:plRain .7s linear infinite}@keyframes plRain{to{transform:translate(-8px,200px)}}
.pl-snow{animation:plSnow linear infinite}@keyframes plSnow{to{transform:translate(12px,200px)}}
.pl-flash{animation:plFlash 7s infinite}@keyframes plFlash{0%,93%,97%,100%{opacity:0}94%,96%{opacity:.5}}
.pl-shoot{animation:plShoot 6s ease-in infinite;opacity:0}@keyframes plShoot{0%,80%{opacity:0;transform:translate(0,0)}85%{opacity:1}100%{opacity:0;transform:translate(60px,20px)}}
.pl-smoke{animation:plSmoke 3s ease-out infinite}@keyframes plSmoke{from{transform:translate(0,0);opacity:.6}to{transform:translate(6px,-16px);opacity:0}}
.pl-fly{animation:plFly 16s ease-in-out infinite}
@keyframes plFly{0%,100%{transform:translate(0,0)}25%{transform:translate(70px,-14px)}50%{transform:translate(140px,6px)}75%{transform:translate(60px,14px)}}
.pl-hop{animation:plBob 2.6s ease-in-out infinite}
.pl-zzz{animation:plZzz 3s ease-in-out infinite}@keyframes plZzz{0%{opacity:0;transform:translate(0,4px)}40%{opacity:1}100%{opacity:0;transform:translate(8px,-12px)}}
.still .pl-sway,.still .pl-glow,.still .pl-twinkle,.still .pl-swim,.still .pl-bubble,.still .pl-ray,.still .pl-drift,.still .pl-bob,.still .pl-glide,.still .pl-flutter,.still .pl-wing,.still .pl-petal,.still .pl-leaf,.still .pl-rain,.still .pl-snow,.still .pl-flash,.still .pl-shoot,.still .pl-smoke,.still .pl-fly,.still .pl-hop,.still .pl-zzz{animation:none}
</style>`;

/**
 * The whole picture of Lumi's place: sky, land, weather, home, and Lumi.
 * @param {object} o
 * @param {string} o.place      where Lumi lives
 * @param {string} o.tod        morning | day | evening | night
 * @param {number} o.stage      Lumi's stage 0..5 (the home grows)
 * @param {string} [o.season]   winter | spring | summer | autumn
 * @param {string} [o.weather]  clear | partly | cloudy | rain | snow | fog | storm (outdoor places only)
 * @param {string} [o.lumi]     Lumi's own <svg>, PLACE_LUMI units big (drawn by the page or the widget)
 * @param {number} [o.w=400] [o.h=160]
 */
function placeScene(o) {
  const place = PLACES.some(([k]) => k === o.place) ? o.place : 'fireflies';
  const w = o.w || 400, h = o.h || 160, gy = h * 0.8;
  const tod = o.tod || 'day', stage = o.stage || 0, season = o.season || 'summer';
  const lit = tod === 'evening' || tod === 'night';
  const hx = w * 0.66;
  const P = `pl${o.id || 'a'}`;
  const D = defsMaker(P);
  const opt = { w, h, tod, season, gy };
  const sky = placeSky(place, opt, D), land = placeLand(place, opt, D), weather = placeWeather(place, o.weather, opt);
  const home = placeHome(place, stage, lit, hx, gy + 2, D, tod);
  // where Lumi is: flying around in the day, at the door in the morning and evening, inside at night
  const L = PLACE_LUMI;
  let lumi = '';
  if (o.lumi) {
    if (tod === 'day') lumi = `<g class="pl-fly"><g transform="translate(${f1(w * 0.12)} ${f1(gy - 88)})">${o.lumi}</g></g>`;
    else if (tod === 'night') {
      const s = stage <= 3 ? 0.5 : 0;                                // a house hides Lumi: only z z z
      lumi = (s ? `<g transform="translate(${f1(hx - L * s / 2)} ${f1(gy - homeTop(stage) * 0.55 - L * s / 2)}) scale(${s})">${o.lumi}</g>` : '')
        + `<text class="pl-zzz" x="${f1(hx + 16)}" y="${f1(gy - homeTop(stage) - 2)}" font-size="10" font-weight="700" fill="#DDE6FF">z z z</text>`;
    } else lumi = `<g class="pl-hop"><g transform="translate(${f1(hx - 54 - L / 2)} ${f1(gy - L + 6)})">${o.lumi}</g></g>`;
  }
  return `<svg class="place-svg place-${place}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMax slice" role="img" aria-label="${o.label || 'Lumi\'s home'}">`
    + PLACE_CSS + D.html() + sky + land + weather
    + (tod === 'night' && stage <= 3 ? lumi + home : home + lumi)
    + '</svg>';
}
