// Lumen widget for Übersicht (https://tracesof.net/uebersicht): Lumi lives on the Mac desktop.
// No Xcode needed.
//
// What it shows:
//   • Lumi's little world: morning Lumi wakes up, in the day it flies around, in the evening it gets
//     cosy, at night it sleeps. The sky has the same time of day and weather as outside (wttr.in),
//     and the seasons and holidays change it (autumn leaves, snow, a Santa hat…).
//   • Lumi's mood: happy after a lesson today, missing you after 2 days without lessons.
//   • The dream and its stars (Lumi wears the dream hat from 50 %).
//
// Setup: Lumen → Settings → Mac widget → "Connect widget", then paste the two values below.
// The key is private: anyone with it can see this summary (nothing else).
const LUMEN_WIDGET_URL = "PASTE_URL_HERE";
const LUMEN_WIDGET_KEY = "PASTE_KEY_HERE";
// "large": Lumi's world + dream + today; "small": Lumi's world + dream only.
const SIZE = "large";

import { run } from "uebersicht";

// What a click on the widget opens: the Lumen app from the Dock if you installed it, otherwise the website.
const OPEN_LUMEN = `open -a "Lumen" 2>/dev/null || open "https://inesa07.github.io/Lumen/#/"`;

// Übersicht runs this shell command and gives its output to render().
// Line 1: the weather (asked every 30 minutes at most, your city is found from your internet address);
// the rest: Lumen's summary. -m: give up after a few seconds.
const WEATHER = "/tmp/lumen-weather.txt";
export const command = `
if [ ! -s ${WEATHER} ] || [ -n "$(find ${WEATHER} -mmin +30 2>/dev/null)" ]; then
  curl -s -m 6 "https://wttr.in/?format=%C|%t|%S|%s" 2>/dev/null | head -c 200 > ${WEATHER}.new && mv ${WEATHER}.new ${WEATHER}
fi
head -1 ${WEATHER} 2>/dev/null; echo
curl -s -m 10 -H "Authorization: Bearer ${LUMEN_WIDGET_KEY}" "${LUMEN_WIDGET_URL}"`;
export const refreshFrequency = 5 * 60 * 1000;     // every 5 minutes

// ---------------------------------------------------------------- weather, time of day, season, holiday
function readWeather(line) {
  const [cond = "", temp = "", rise = "", set = ""] = String(line || "").split("|");
  if (!/[a-z]/i.test(cond) || /unknown|error|<|sorry/i.test(cond)) return null;
  const c = cond.toLowerCase();
  const kind = /thunder/.test(c) ? "storm" : /snow|sleet|blizzard|ice pellets/.test(c) ? "snow"
    : /rain|drizzle|shower/.test(c) ? "rain" : /fog|mist|haze/.test(c) ? "fog"
    : /overcast|cloudy/.test(c) && !/partly/.test(c) ? "cloudy" : /partly/.test(c) ? "partly" : "clear";
  const mins = (t) => { const m = /(\d+):(\d+)/.exec(t || ""); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
  return { kind, temp: temp.replace(/^\+/, "").replace(/\s/g, ""), rise: mins(rise), set: mins(set) };
}

function timeOfDay(now, w) {
  const m = now.getHours() * 60 + now.getMinutes();
  const rise = (w && w.rise) || 6 * 60, set = (w && w.set) || 19 * 60;
  if (m < rise - 30 || m >= Math.max(set + 90, 21 * 60)) return "night";
  if (m < rise + 150) return "morning";
  if (m < set - 60) return "day";
  return "evening";
}

const seasonOf = (now) => ["winter", "winter", "spring", "spring", "spring", "summer", "summer", "summer", "autumn", "autumn", "autumn", "winter"][now.getMonth()];

function holidayOf(now, birthday) {
  const p = (n) => String(n).padStart(2, "0");
  const md = `${p(now.getMonth() + 1)}-${p(now.getDate())}`;
  const between = (a, b) => (a <= b ? md >= a && md <= b : md >= a || md <= b);
  if (birthday === md) return { id: "birthday", extra: "party" };
  if (md === "06-01") return { id: "children", extra: "party" };
  if (between("12-20", "01-07")) return { id: "newyear", extra: "santa" };
  if (between("10-24", "11-01")) return { id: "halloween", extra: "pumpkin" };
  if (between("02-13", "02-14")) return { id: "valentine", extra: "heart" };
  if (between("03-07", "03-08")) return { id: "spring", extra: "flowers" };
  return null;
}

// ---------------------------------------------------------------- Lumi (the same firefly as in the app)
const HATS = {
  safari: '<ellipse cx="60" cy="31" rx="28" ry="5.5" fill="#C9A86A"/><path d="M42 31q0-18 18-18t18 18z" fill="#DCC189"/><path d="M42.5 28.5h35" stroke="#7A5C30" stroke-width="3.2"/>',
  sport: '<path d="M38 37q22-12 44 0l-.8 5.5q-21-11-42.4 0z" fill="#E53935"/><path d="M80 37.5l9 3-7 4z" fill="#E53935"/>',
  cinema: '<rect x="42" y="42" width="16" height="12" rx="3" fill="#E53935" fill-opacity=".7" stroke="#241A4A" stroke-width="2"/><rect x="62" y="42" width="16" height="12" rx="3" fill="#2F7FE0" fill-opacity=".7" stroke="#241A4A" stroke-width="2"/><path d="M58 47h4" stroke="#241A4A" stroke-width="2"/>',
  gamer: '<path d="M37 50q0-28 23-28t23 28" fill="none" stroke="#2E9E5B" stroke-width="4"/><rect x="32" y="44" width="9" height="14" rx="4" fill="#3FCF8E"/><rect x="79" y="44" width="9" height="14" rx="4" fill="#3FCF8E"/>',
  artist: '<ellipse cx="57" cy="30" rx="21" ry="8" fill="#E5484D" transform="rotate(-12 57 30)"/><path d="M55 22.5l1-5" stroke="#B83238" stroke-width="3" stroke-linecap="round"/>',
  chef: '<rect x="46" y="22" width="28" height="9" rx="2" fill="#fff"/><circle cx="50" cy="17" r="8" fill="#fff"/><circle cx="60" cy="12.5" r="9.5" fill="#fff"/><circle cx="70" cy="17" r="8" fill="#fff"/>',
  travel: '<ellipse cx="60" cy="30" rx="30" ry="6" fill="#E9C46A"/><path d="M45 30q0-15 15-15t15 15z" fill="#F4D58D"/><path d="M45.5 26.5q14.5 4 29 0" stroke="#E76F51" stroke-width="3.4" fill="none"/>',
  party: '<path d="M50 30l10-24 10 24z" fill="#9B8CFF"/><path d="M53 23l14 0M56 15l8 0" stroke="#FFD84A" stroke-width="2.4"/><circle cx="60" cy="6" r="3.5" fill="#F06BA8"/>',
  santa: '<path d="M40 33q20-26 40 0z" fill="#E53935"/><path d="M62 12q14 2 18 14" fill="none" stroke="#E53935" stroke-width="6" stroke-linecap="round"/><circle cx="81" cy="27" r="4.5" fill="#fff"/><rect x="37" y="29" width="46" height="7" rx="3.5" fill="#fff"/>',
  scarf: '<path d="M41 68q19 9 38 0l1 6q-20 10-40 0z" fill="#F06BA8"/><path d="M70 72l4 12 5-2-3-11z" fill="#D9468A"/>',
};

/** state: wake | fly | cosy | sleep; mood: happy | missing | waiting */
function lumiSVG({ state, mood, hat, extra, dreamEmoji, gold, cold }) {
  const asleep = state === "sleep";
  const eyes = asleep
    ? '<path d="M46 50q5 4 10 0M64 50q5 4 10 0" fill="none" stroke="#241A4A" stroke-width="2.6" stroke-linecap="round"/>'
    : mood === "happy"
      ? '<path d="M46 49q5-6 10 0M64 49q5-6 10 0" fill="none" stroke="#241A4A" stroke-width="2.6" stroke-linecap="round"/>'
      : `<g class="w-blink"><ellipse cx="51" cy="48" rx="5.5" ry="6.5" fill="#fff"/><ellipse cx="69" cy="48" rx="5.5" ry="6.5" fill="#fff"/>
         <circle cx="${mood === "missing" ? 50 : 52}" cy="${mood === "missing" ? 47 : 49}" r="3.2" fill="#241A4A"/><circle cx="${mood === "missing" ? 68 : 70}" cy="${mood === "missing" ? 47 : 49}" r="3.2" fill="#241A4A"/>
         <circle cx="53.2" cy="47.4" r="1.1" fill="#fff"/><circle cx="71.2" cy="47.4" r="1.1" fill="#fff"/>
         ${state === "wake" ? '<rect x="44" y="40" width="14" height="6" rx="3" fill="#6F5DBD"/><rect x="62" y="40" width="14" height="6" rx="3" fill="#6F5DBD"/>' : ""}</g>`;
  const mouth = asleep ? '<ellipse cx="60" cy="60" rx="2.6" ry="2" fill="#241A4A"/>'
    : mood === "happy" ? '<path d="M52 57q8 11 16 0z" fill="#241A4A"/>'
    : mood === "missing" ? '<path d="M55 61q5-2 10 0" fill="none" stroke="#241A4A" stroke-width="2.4" stroke-linecap="round"/>'
    : state === "wake" ? '<ellipse class="w-yawn" cx="60" cy="60" rx="3.6" ry="4.4" fill="#241A4A"/>'
    : '<path d="M54 59q6 5 12 0" fill="none" stroke="#241A4A" stroke-width="2.4" stroke-linecap="round"/>';
  const head = hat ? HATS[hat] || "" : extra === "santa" ? HATS.santa : extra === "party" ? HATS.party : "";
  return `<svg width="${PLACE_LUMI}" height="${PLACE_LUMI}" viewBox="0 0 120 120" class="w-lumi ${state}">
  <defs><radialGradient id="wg"><stop offset="0" stop-color="#FFF4A8" stop-opacity=".95"/><stop offset=".5" stop-color="#E9F56A" stop-opacity=".35"/><stop offset="1" stop-color="#E9F56A" stop-opacity="0"/></radialGradient>
  <radialGradient id="wt" cx=".5" cy=".4"><stop offset="0" stop-color="#FFFBD0"/><stop offset=".6" stop-color="#F4E84E"/><stop offset="1" stop-color="#A9DB3A"/></radialGradient>
  <linearGradient id="wb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7B68C8"/><stop offset="1" stop-color="#5A4AA6"/></linearGradient></defs>
  <circle class="w-glow" cx="60" cy="80" r="${asleep ? 30 : 44}" fill="url(#wg)"/>
  ${gold ? '<circle cx="60" cy="66" r="50" fill="none" stroke="#FFD84A" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round" class="w-spin"/>' : ""}
  <g class="w-body">
    <ellipse class="w-wing l" cx="40" cy="58" rx="17" ry="11" fill="#DDEBFF" fill-opacity=".8"/><ellipse class="w-wing r" cx="80" cy="58" rx="17" ry="11" fill="#DDEBFF" fill-opacity=".8"/>
    <ellipse cx="60" cy="84" rx="17" ry="15" fill="url(#wt)"/><path d="M45 80q15 6 30 0" fill="none" stroke="#C9B93A" stroke-width="2"/>
    ${cold && !hat ? HATS.scarf : ""}
    <path d="M52 32q-6-12-12-14M68 32q6-12 12-14" fill="none" stroke="#5A4AA6" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="40" cy="18" r="3.2" fill="#F4E84E"/><circle cx="80" cy="18" r="3.2" fill="#F4E84E"/>
    <circle cx="60" cy="50" r="23" fill="url(#wb)"/><ellipse cx="60" cy="58" rx="13" ry="9" fill="#8F7FD8" opacity=".55"/>
    <circle cx="45" cy="57" r="4" fill="#FF9FC6" opacity=".7"/><circle cx="75" cy="57" r="4" fill="#FF9FC6" opacity=".7"/>
    ${eyes}${mouth}${head}
  </g>
  ${dreamEmoji ? `<text class="w-float" x="103" y="34" font-size="20" text-anchor="middle">${dreamEmoji}</text>` : ""}
  ${extra === "pumpkin" ? '<g transform="translate(98 100)"><ellipse rx="11" ry="9" fill="#FF8A2A"/><ellipse rx="5" ry="9" fill="#FF9F45"/><path d="M0-8q1-6 5-7" stroke="#3E8E41" stroke-width="2.5" fill="none"/></g>' : ""}
  ${extra === "heart" ? '<path class="w-float" d="M98 30c-4-6-13-2-10 5l10 10 10-10c3-7-6-11-10-5z" fill="#F06BA8"/>' : ""}
  ${extra === "flowers" ? `<g transform="translate(98 100)">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="3.6" ry="6" fill="#FFB3D1" transform="rotate(${a}) translate(0 -6)"/>`).join("")}<circle r="3.4" fill="#F2C14E"/></g>` : ""}
</svg>`;
}

// ---------------------------------------------------------------- the place where Lumi lives
// The same drawing as in the Lumen app (static/js/places.js), copied here by `npm run widget`.
// <places>
// places.js: where Lumi lives. One illustration for each place (meadow, forest, garden, ocean, sky,
// space), used on the Lumi page (big, with Lumi's home) and in the Mac widget (a copy of this file is
// put into desktop-widget/lumen.widget/index.jsx by `npm run widget`). So this file is plain JavaScript
// that only builds SVG text: no page, no DOM.
//
// The picture follows the real time of day (morning, day, evening, night), the season, the weather,
// and how big Lumi is: Lumi's home is a glass jar, then a lantern, then a little house.
// Depth comes from layers: far things are smaller, paler and bluer (like real air), near things are
// bigger, darker and sharper. Every shape has a light side and a shadow side.

const PLACES = [
  ['fireflies', 'Lake', '🏞️'], ['forest', 'Forest', '🌲'], ['blossom', 'Garden', '🌸'], ['ocean', 'Ocean', '🐠'],
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
    blur(id, std) {
      if (seen.has(id)) return;
      seen.add(id);
      list.push(`<filter id="${P}${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${std}"/></filter>`);
    },
    // a painted edge: noise moves the outline a little, like a brush
    paint(id, scale, freq, seed) {
      if (seen.has(id)) return;
      seen.add(id);
      list.push(`<filter id="${P}${id}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="${seed}"/><feDisplacementMap in="SourceGraphic" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/></filter>`);
    },
    // paper grain over the picture
    grain(id) {
      if (seen.has(id)) return;
      seen.add(id);
      list.push(`<filter id="${P}${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="5"/><feColorMatrix type="saturate" values="0"/></filter>`);
    },
    // water: stretched noise that wobbles reflections sideways
    ripple(id) {
      if (seen.has(id)) return;
      seen.add(id);
      list.push(`<filter id="${P}${id}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".004 .12" numOctaves="2" seed="9"/><feDisplacementMap in="SourceGraphic" scale="6" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation=".6"/></filter>`);
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

// ---------------------------------------------------------------- painted places (lake, forest, garden, sky islands)
// A softer, storybook-painting look: misty air, light rays, far layers blurred (like a camera that
// focuses on the front), glowing specks in the air. Painted in daylight colours; evening and night are
// a colour wash on top, and the glowing things are drawn after the wash so they stay bright.
const PAINTED = ['fireflies', 'forest', 'blossom', 'clouds'];
// colour wash per time of day: [top colour, opacity], [middle], [bottom]
const WASH = {
  morning: [['#FFB38A', 0.18], ['#FFD2B0', 0.1], ['#FFB38A', 0.06]],
  day: null,
  evening: [['#4A3E9A', 0.55], ['#FF8A5C', 0.32], ['#3A2440', 0.38]],
  night: [['#030820', 0.8], ['#0A1640', 0.66], ['#050C26', 0.7]],
};

/** Points along a quadratic curve (for moss on a branch, vines, …). */
function quadPts(x0, y0, cx, cy, x1, y1, n) {
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) / n, u = 1 - t;
    return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1];
  });
}
/** A soft blob of foliage: a dark under-layer and a lit top made of overlapping balls. */
function foliage(x, y, r, dark, mid, light, k, n = 7) {
  let s = '';
  for (let i = 0; i < n; i++) { const a = plRnd(k, i) * 6.28, d = plRnd(k, i + 20) * r * 0.7; s += `<circle cx="${f1(x + Math.cos(a) * d)}" cy="${f1(y + Math.sin(a) * d * 0.6 + r * 0.12)}" r="${f1(r * (0.42 + plRnd(k, i + 40) * 0.25))}" fill="${dark}"/>`; }
  for (let i = 0; i < n; i++) { const a = plRnd(k, i + 60) * 6.28, d = plRnd(k, i + 80) * r * 0.6; s += `<circle cx="${f1(x + Math.cos(a) * d - r * 0.08)}" cy="${f1(y + Math.sin(a) * d * 0.55 - r * 0.1)}" r="${f1(r * (0.3 + plRnd(k, i + 100) * 0.18))}" fill="${mid}"/>`; }
  for (let i = 0; i < 3; i++) s += `<circle cx="${f1(x - r * 0.3 + plRnd(k, i + 120) * r * 0.5)}" cy="${f1(y - r * 0.35 + plRnd(k, i + 130) * r * 0.2)}" r="${f1(r * 0.14)}" fill="${light}" opacity=".85"/>`;
  return s;
}
/** A cluster of small flowers with leaves under them. */
function flowerBush(x, y, s, col, light, k) {
  let p = '';
  for (let i = 0; i < 5; i++) p += `<ellipse cx="${f1(x + (plRnd(k, i) - 0.5) * s * 3)}" cy="${f1(y - plRnd(k, i + 5) * s * 0.6)}" rx="${f1(s * 0.9)}" ry="${f1(s * 0.4)}" fill="#3E6B2E" transform="rotate(${f1((plRnd(k, i + 9) - 0.5) * 50)} ${f1(x)} ${f1(y)})"/>`;
  for (let i = 0; i < 7; i++) {
    const fx = x + (plRnd(k, i + 14) - 0.5) * s * 3, fy = y - s * 0.6 - plRnd(k, i + 21) * s * 1.4, r = s * (0.32 + plRnd(k, i + 28) * 0.2);
    p += `<circle cx="${f1(fx)}" cy="${f1(fy)}" r="${f1(r)}" fill="${col}"/><circle cx="${f1(fx - r * 0.3)}" cy="${f1(fy - r * 0.3)}" r="${f1(r * 0.45)}" fill="${light}"/>`;
  }
  return `<g class="pl-sway" style="transform-origin:${f1(x)}px ${f1(y)}px;animation-delay:-${f1(plRnd(k, 40) * 4)}s">${p}</g>`;
}
/** A big old tree: a twisted trunk with roots and bark lines. */
function oldTrunk(x, y, top, wd, D, k, col = ['#6A5A6E', '#3E3346', '#2A2232']) {
  const g = D.lin(`tr${k}`, [[0, col[0]], [0.55, col[1]], [1, col[2]]], 1, 0);
  const lean = (plRnd(k, 1) - 0.5) * wd * 1.2;
  let s = `<path d="M${f1(x - wd * 1.6)} ${f1(y)}Q${f1(x - wd * 0.7)} ${f1(y - wd * 0.6)} ${f1(x - wd * 0.55)} ${f1(y - wd * 1.6)}C${f1(x - wd * 0.8)} ${f1(y - (y - top) * 0.5)} ${f1(x - wd * 0.2 + lean)} ${f1(top + (y - top) * 0.3)} ${f1(x - wd * 0.35 + lean)} ${f1(top)}`
    + `L${f1(x + wd * 0.45 + lean)} ${f1(top)}C${f1(x + wd * 0.35 + lean)} ${f1(top + (y - top) * 0.3)} ${f1(x + wd * 0.85)} ${f1(y - (y - top) * 0.5)} ${f1(x + wd * 0.6)} ${f1(y - wd * 1.6)}Q${f1(x + wd * 0.8)} ${f1(y - wd * 0.6)} ${f1(x + wd * 1.8)} ${f1(y)}Z" fill="${g}"/>`;
  for (let i = 0; i < 4; i++) { const bx = x - wd * 0.3 + i * wd * 0.22 + lean * 0.4; s += `<path d="M${f1(bx)} ${f1(y - wd)}Q${f1(bx + (plRnd(k, i + 3) - 0.5) * wd * 0.6)} ${f1((y + top) / 2)} ${f1(bx + lean * 0.5)} ${f1(top + 6)}" stroke="${col[2]}" stroke-width=".9" fill="none" opacity=".55"/>`; }
  s += `<path d="M${f1(x - wd * 0.45)} ${f1(y - wd * 1.2)}C${f1(x - wd * 0.6)} ${f1((y + top) / 2)} ${f1(x - wd * 0.2 + lean)} ${f1(top + (y - top) * 0.3)} ${f1(x - wd * 0.28 + lean)} ${f1(top + 4)}" stroke="#A89AB0" stroke-width="1.6" fill="none" opacity=".45"/>`;
  return s;
}
function moss(pts, k, sz = 3.2) {
  return pts.map(([x, y], i) => `<ellipse cx="${f1(x)}" cy="${f1(y - 1)}" rx="${f1(sz * (1 + plRnd(k, i) * 0.8))}" ry="${f1(sz * 0.6)}" fill="#7E9A2E"/><ellipse cx="${f1(x - 0.6)}" cy="${f1(y - 2)}" rx="${f1(sz * (0.7 + plRnd(k, i + 30) * 0.6))}" ry="${f1(sz * 0.42)}" fill="#C6D84A"/>`
    + (plRnd(k, i + 60) > 0.6 ? `<circle cx="${f1(x + 1)}" cy="${f1(y - 3)}" r="1" fill="#FF8A3C"/>` : '')).join('');
}
function vines(pts, k, len = 30) {
  return pts.map(([x, y], i) => {
    const l = len * (0.5 + plRnd(k, i) * 0.8);
    return `<path class="pl-sway" style="transform-origin:${f1(x)}px ${f1(y)}px;animation-delay:-${f1(plRnd(k, i + 9) * 4)}s;animation-duration:6s" d="M${f1(x)} ${f1(y)}q${f1((plRnd(k, i + 3) - 0.5) * 6)} ${f1(l / 2)} ${f1((plRnd(k, i + 5) - 0.5) * 4)} ${f1(l)}" stroke="#5E7A3A" stroke-width=".9" fill="none" opacity=".85"/>`;
  }).join('');
}
function motes(w, h, n, k, col = '#FFF6C0') {
  let s = '';
  for (let i = 0; i < n; i++) s += `<circle class="pl-glow" cx="${f1(plRnd(i, k) * w)}" cy="${f1(h * 0.1 + plRnd(i, k + 1) * h * 0.75)}" r="${f1(0.6 + plRnd(i, k + 2) * 1.1)}" fill="${col}" style="animation-delay:-${f1(plRnd(i, k + 3) * 3)}s"/>`;
  return s;
}
function lightRays(w, h, D, x0, n = 3) {
  const g = D.lin('lr', [[0, '#FFF4C2', 0.55], [1, '#FFF4C2', 0]]);
  return `<g filter="url(#${D.id('b3')})">` + Array.from({ length: n }, (_, i) => {
    const x = w * (x0 + i * 0.13);
    return `<path class="pl-ray" d="M${f1(x)} -4L${f1(x + w * 0.05)} -4L${f1(x - w * 0.12)} ${f1(h * 0.85)}L${f1(x - w * 0.2)} ${f1(h * 0.85)}Z" fill="${g}" style="animation-delay:-${i * 2}s"/>`;
  }).join('') + '</g>';
}
function birdsWhite(w, n, k) {
  return Array.from({ length: n }, (_, i) => bird(w * (0.12 + plRnd(i, k) * 0.35), 18 + plRnd(i, k + 1) * 30, 0.6 + plRnd(i, k + 2) * 0.4, i + k, '#FFFFFF')).join('');
}
function stone(x, y, r, k) {
  return `<ellipse cx="${f1(x)}" cy="${f1(y + r * 0.15)}" rx="${f1(r * 1.25)}" ry="${f1(r * 0.55)}" fill="#6E6672"/><ellipse cx="${f1(x - r * 0.15)}" cy="${f1(y - r * 0.05)}" rx="${f1(r * 1.05)}" ry="${f1(r * 0.48)}" fill="#B9AEB4"/><ellipse cx="${f1(x - r * 0.4)}" cy="${f1(y - r * 0.2)}" rx="${f1(r * 0.45)}" ry="${f1(r * 0.2)}" fill="#E6DCDE" opacity=".8"/>`;
}


/** A natural ridge line: a few big peaks, then made rough by halving the segments again and again. */
function ridge(w, base, height, seed, peaks = 3, rough = 0.42, levels = 6) {
  let pts = [[-10, base - height * 0.2]];
  for (let i = 0; i < peaks; i++) {
    const x = (i + 0.3 + plRnd(seed, i) * 0.4) * w / peaks;
    pts.push([x - w / peaks * 0.3, base - height * (0.35 + plRnd(seed, i + 10) * 0.2)], [x, base - height * (0.75 + plRnd(seed, i + 20) * 0.25)]);
  }
  pts.push([w + 10, base - height * 0.3]);
  let amp = height * rough;
  for (let l = 0; l < levels; l++) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      out.push([(x0 + x1) / 2 + (plRnd(seed + l * 7, i) - 0.5) * (x1 - x0) * 0.2, (y0 + y1) / 2 + (plRnd(seed + l * 13, i + 50) - 0.5) * amp], [x1, y1]);
    }
    pts = out; amp *= 0.5;
  }
  return pts;
}
/** A mountain range: rock with sunlit and shadow faces, gullies, snow on the high parts. */
function range(w, base, height, seed, col, dark, light, snowLine, D, k) {
  const pts = ridge(w, base, height, seed);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f1(x)} ${f1(y)}`).join('');
  let s = `<path d="${line}L${f1(w + 10)} ${f1(base + 2)}L-10 ${f1(base + 2)}Z" fill="${D.lin(`mt${k}`, [[0, light], [0.55, col], [1, dark]])}"/>`;
  // shadow faces: under every high point, the side away from the sun is darker (a soft wedge, clipped to the rock)
  const clip = D.id(`mc${k}`);
  let faces = '';
  pts.forEach(([x, y], i) => {
    const win = pts.slice(Math.max(0, i - 7), i + 8);
    if (base - y < height * 0.35 || win.some((p) => p[1] < y)) return;
    const dh = base - y;
    faces += `<path d="M${f1(x)} ${f1(y)}L${f1(x + dh * 1.1)} ${f1(base)}L${f1(x + dh * 0.12)} ${f1(base)}Z" fill="${dark}" opacity=".42"/>`
      + `<path d="M${f1(x)} ${f1(y)}L${f1(x - dh * 0.25)} ${f1(base)}L${f1(x - dh * 0.9)} ${f1(base)}Z" fill="#FFFFFF" opacity=".12"/>`;
  });
  s += `<clipPath id="${clip}"><path d="${line}L${f1(w + 10)} ${f1(base + 2)}L-10 ${f1(base + 2)}Z"/></clipPath><g clip-path="url(#${clip})"><g filter="url(#${D.id('b1')})">${faces}</g></g>`;
  // snow: a band under the ridge, only where the ridge is above the snow line, with a ragged lower edge
  if (snowLine != null) {
    let snow = '', open = false;
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i];
      if (y < snowLine) {
        const depth = Math.min(snowLine - y, height * 0.22) * (0.6 + plRnd(seed, i + 300) * 0.6);
        snow += `${open ? 'L' : 'M'}${f1(x)} ${f1(y)}`; open = true;
        pts[i].snowY = y + depth;
      } else if (open) { snow += `L${f1(x)} ${f1(y)}`; snow += pts.slice(0, i).reverse().filter((p) => p.snowY).map((p) => `L${f1(p[0])} ${f1(p.snowY)}`).join('') + 'Z'; pts.forEach((p) => { delete p.snowY; }); open = false; }
    }
    if (snow) s += `<path d="${snow}" fill="#F7FAFF" opacity=".95"/>`;
  }
  return s;
}
/** A dense tree line: many firs of different sizes in two rows, darker at the foot. */
function treeLine(w, base, k, back, front, dark) {
  let s = `<rect x="-5" y="${f1(base - 4)}" width="${f1(w + 10)}" height="6" fill="${back}"/>`;
  const row = (count, hmin, hmax, c1, c2, off) => {
    const xs = Array.from({ length: count }, (_, i) => (i + plRnd(k + off, i)) * w / count).sort((a, b) => a - b);
    return xs.map((x, i) => fir(x, base + 1, hmin + plRnd(k + off, i + 100) * (hmax - hmin), c1, c2, false)).join('');
  };
  s += row(Math.round(46 * w / 400), 7, 15, back, mix(back, dark, 0.35), 1);
  s += row(Math.round(36 * w / 400), 9, 20, front, dark, 2);
  return s;
}
/** A big tree in front: a tapering trunk with roots, branches reaching up into a full, lit crown. */
function bigTree(x, y, hh, D, k, side = 1) {
  const g = D.lin(`bt${k}`, [[0, '#7A6A5E'], [0.5, '#5A4A40'], [1, '#3A2E28']], 1, 0);
  const tw = hh * 0.07;
  let s = `<path d="M${f1(x - tw * 2.2)} ${f1(y)}Q${f1(x - tw * 0.9)} ${f1(y - tw)} ${f1(x - tw * 0.8)} ${f1(y - hh * 0.3)}Q${f1(x - tw * 0.5)} ${f1(y - hh * 0.6)} ${f1(x - tw * 0.25 + side * tw)} ${f1(y - hh * 0.85)}`
    + `L${f1(x + tw * 0.35 + side * tw)} ${f1(y - hh * 0.85)}Q${f1(x + tw * 0.7)} ${f1(y - hh * 0.6)} ${f1(x + tw * 0.9)} ${f1(y - hh * 0.3)}Q${f1(x + tw)} ${f1(y - tw)} ${f1(x + tw * 2.4)} ${f1(y)}Z" fill="${g}"/>`;
  // branches
  [[-0.55, 0.5, -1], [-0.68, 0.62, 1], [-0.45, 0.38, 1]].forEach(([dy, len, dir], i) => {
    const bx = x + side * tw * 0.4, by = y + dy * hh;
    s += `<path d="M${f1(bx)} ${f1(by)}Q${f1(bx + dir * hh * len * 0.4)} ${f1(by - hh * 0.12)} ${f1(bx + dir * hh * len * 0.75)} ${f1(by - hh * 0.22)}" stroke="#4A3C34" stroke-width="${f1(tw * (0.7 - i * 0.12))}" stroke-linecap="round" fill="none"/>`;
  });
  s += `<path d="M${f1(x - tw * 0.55)} ${f1(y - hh * 0.05)}Q${f1(x - tw * 0.4)} ${f1(y - hh * 0.5)} ${f1(x - tw * 0.05 + side * tw)} ${f1(y - hh * 0.82)}" stroke="#A89480" stroke-width="${f1(tw * 0.28)}" opacity=".45" fill="none"/>`;
  // the crown: many leaf clusters, dark inside, lit on top
  const cx = x + side * hh * 0.12, cy = y - hh * 0.92, R = hh * 0.42;
  for (let i = 0; i < 16; i++) { const a = plRnd(k, i) * 6.28, d = Math.sqrt(plRnd(k, i + 20)) * R; s += foliage(cx + Math.cos(a) * d * 1.25, cy + Math.sin(a) * d * 0.7, R * (0.32 + plRnd(k, i + 40) * 0.16), '#3E6A34', '#5E8E44', '#9CC45E', k * 50 + i, 6); }
  for (let i = 0; i < 6; i++) { const a = -2.4 + plRnd(k, i + 60) * 1.6, d = R * (0.55 + plRnd(k, i + 70) * 0.35); s += foliage(cx + Math.cos(a) * d * 1.1, cy + Math.sin(a) * d * 0.7, R * 0.24, '#5E8E44', '#86B456', '#C8E27A', k * 50 + 30 + i, 5); }
  return s;
}

// ---- storybook shapes: big, smooth, simple forms with soft gradients (like a picture book), no noise
/** One smooth mountain: a lit face, a shaded face, a snow cap with a soft wavy edge. */
function peak(x, base, top, wL, wR, col, shadeCol, snow, D, k) {
  const hh = base - top;
  const shape = `M${f1(x - wL)} ${f1(base)}Q${f1(x - wL * 0.38)} ${f1(base - hh * 0.32)} ${f1(x - 3)} ${f1(top + 2)}Q${f1(x)} ${f1(top - 1.5)} ${f1(x + 3)} ${f1(top + 2)}Q${f1(x + wR * 0.38)} ${f1(base - hh * 0.36)} ${f1(x + wR)} ${f1(base)}Z`;
  const id = D.id(`pk${k}`);
  let s = `<clipPath id="${id}"><path d="${shape}"/></clipPath><path d="${shape}" fill="${col}"/>`;
  s += `<g clip-path="url(#${id})"><path d="M${f1(x + 1)} ${f1(top)}Q${f1(x + wR * 0.08)} ${f1(top + hh * 0.45)} ${f1(x - wL * 0.06)} ${f1(base + 2)}H${f1(x + wR + 4)}V${f1(top)}Z" fill="${shadeCol}"/>`;
  if (snow) {
    const sy = top + hh * 0.3;
    s += `<path d="M${f1(x - wL)} ${f1(top - 4)}H${f1(x + wR)}V${f1(sy)}Q${f1(x + wR * 0.25)} ${f1(sy - hh * 0.06)} ${f1(x + wR * 0.12)} ${f1(sy + hh * 0.05)}Q${f1(x)} ${f1(sy - hh * 0.08)} ${f1(x - wL * 0.12)} ${f1(sy + hh * 0.06)}Q${f1(x - wL * 0.25)} ${f1(sy - hh * 0.04)} ${f1(x - wL)} ${f1(sy + hh * 0.02)}Z" fill="#FBFDFF"/>`
      + `<path d="M${f1(x + 1)} ${f1(top)}Q${f1(x + wR * 0.08)} ${f1(top + hh * 0.45)} ${f1(x - wL * 0.06)} ${f1(base + 2)}H${f1(x + wR + 4)}V${f1(top)}Z" fill="#B9C9E8" opacity=".55" clip-path="none"/>`;
  }
  return s + '</g>';
}
/** A row of smooth mountains across the picture. */
function peaks(w, base, hmin, hmax, count, col, shadeCol, snow, D, k) {
  let s = '';
  for (let i = 0; i < count; i++) {
    const x = (i + 0.2 + plRnd(k, i) * 0.6) * w / count, hh = hmin + plRnd(k, i + 10) * (hmax - hmin);
    const wd = w / count * (0.75 + plRnd(k, i + 20) * 0.5);
    s += peak(x, base, base - hh, wd, wd * (0.9 + plRnd(k, i + 30) * 0.4), col, shadeCol, snow && hh > hmin + (hmax - hmin) * 0.35, D, `${k}_${i}`);
  }
  return s;
}
/** A slender storybook fir: one tall shape with soft, slightly curved sides, lit on the left. */
function slimFir(x, base, hh, light, darkC) {
  const wd = hh * 0.26;
  return `<path d="M${f1(x)} ${f1(base - hh)}Q${f1(x - wd * 0.35)} ${f1(base - hh * 0.45)} ${f1(x - wd)} ${f1(base)}H${f1(x)}Z" fill="${light}"/>`
    + `<path d="M${f1(x)} ${f1(base - hh)}Q${f1(x + wd * 0.35)} ${f1(base - hh * 0.45)} ${f1(x + wd)} ${f1(base)}H${f1(x)}Z" fill="${darkC}"/>`;
}
/** A grove of firs of different heights (tall in the middle), overlapping. */
function grove(cx, base, spread, count, hmin, hmax, light, darkC, k) {
  const trees = Array.from({ length: count }, (_, i) => {
    const t = (i + plRnd(k, i)) / count, x = cx + (t - 0.5) * spread;
    const mid = 1 - Math.abs(t - 0.5) * 1.4;
    return [x, hmin + (hmax - hmin) * Math.max(0.15, mid) * (0.7 + plRnd(k, i + 40) * 0.5)];
  }).sort((a, b) => b[1] - a[1]);
  return trees.map(([x, hh]) => slimFir(x, base, hh, light, darkC)).join('');
}
/** A round storybook tree: a slim trunk and one soft crown with a gradient (light top left). */
function roundTree(x, base, hh, D, k, c = ['#9CCB6A', '#5E9A48', '#3E7438']) {
  const r = hh * 0.36, cy = base - hh + r;
  const g = D.rad(`rt${k}`, [[0, c[0]], [0.6, c[1]], [1, c[2]]], 0.35, 0.3, 0.8);
  return `<path d="M${f1(x - hh * 0.03)} ${f1(base)}L${f1(x - hh * 0.015)} ${f1(cy)}H${f1(x + hh * 0.015)}L${f1(x + hh * 0.03)} ${f1(base)}Z" fill="#5A4636"/>`
    + `<path d="M${f1(x)} ${f1(cy + r * 0.2)}L${f1(x - r * 0.35)} ${f1(cy - r * 0.2)}M${f1(x)} ${f1(cy + r * 0.35)}L${f1(x + r * 0.4)} ${f1(cy - r * 0.05)}" stroke="#5A4636" stroke-width="${f1(hh * 0.012 + 0.4)}"/>`
    + `<path d="M${f1(x - r)} ${f1(cy + r * 0.15)}C${f1(x - r * 1.1)} ${f1(cy - r * 0.7)} ${f1(x - r * 0.4)} ${f1(cy - r * 1.15)} ${f1(x + r * 0.1)} ${f1(cy - r * 1.05)}C${f1(x + r * 0.8)} ${f1(cy - r * 1.05)} ${f1(x + r * 1.15)} ${f1(cy - r * 0.4)} ${f1(x + r)} ${f1(cy + r * 0.2)}C${f1(x + r * 0.9)} ${f1(cy + r * 0.8)} ${f1(x - r * 0.85)} ${f1(cy + r * 0.85)} ${f1(x - r)} ${f1(cy + r * 0.15)}Z" fill="${g}"/>`
    + `<ellipse cx="${f1(x - r * 0.35)}" cy="${f1(cy - r * 0.45)}" rx="${f1(r * 0.32)}" ry="${f1(r * 0.2)}" fill="#FFFFFF" opacity=".18"/>`;
}
const mistBand = (w, y, hh, D, k, op = 0.7) => `<rect y="${f1(y - hh / 2)}" width="${w}" height="${f1(hh)}" fill="${D.lin(`mist${k}`, [[0, '#FFFFFF', 0], [0.5, '#FFFFFF', op], [1, '#FFFFFF', 0]])}"/>`;

// ---- little life in the pictures
function duck(x, y, s, k, col = '#FFFFFF') {
  return `<g class="pl-paddle" style="animation-delay:-${f1(plRnd(k, 1) * 20)}s"><g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s)})">`
    + `<ellipse cx="0" cy="1.6" rx="6.5" ry="1" fill="#FFFFFF" opacity=".35"/><path d="M-5 0Q-5 -4 0 -3.6Q4 -3.6 5 -1.4Q5.4 0 4 .4H-4Q-5 .4 -5 0Z" fill="${col}"/>`
    + `<path d="M-1 -2.4Q1 -3.4 3 -2.2" stroke="#D8D2C8" stroke-width=".7" fill="none"/><circle cx="-4" cy="-4.6" r="2" fill="${col}"/><path d="M-5.8 -4.6l-2 .5l2 .6z" fill="#FF9F2A"/><circle cx="-4.4" cy="-5" r=".4" fill="#222"/></g></g>`;
}
function boat(x, y, s, D) {
  return `<g class="pl-bob" style="animation-duration:4s"><g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s)})">`
    + `<ellipse cx="0" cy="3" rx="16" ry="1.6" fill="#FFFFFF" opacity=".3"/><path d="M-15 -3H15Q12 3 8 3H-8Q-12 3 -15 -3Z" fill="${D.lin('boat', [[0, '#C98A52'], [1, '#7A4A28']])}"/>`
    + `<path d="M-15 -3H15" stroke="#EAC08E" stroke-width="1.2"/><path d="M-4 -3L-12 4M6 -3L14 5" stroke="#8A5A32" stroke-width=".9"/><path d="M-12 4l-3 1.4l1 .9z" fill="#8A5A32"/></g></g>`;
}
function pier(x, y, len, D) {
  let s = '';
  for (let i = 0; i < 4; i++) s += `<rect x="${f1(x + 2 + i * len / 4)}" y="${f1(y - 1)}" width="1.6" height="${f1(7 + i)}" fill="#5E3E26"/>`;
  s += `<path d="M${f1(x - 4)} ${f1(y + 3)}L${f1(x + len)} ${f1(y - 1)}L${f1(x + len)} ${f1(y - 3)}L${f1(x - 4)} ${f1(y + 1)}Z" fill="${D.lin('pier', [[0, '#D9A46E'], [1, '#9C6A3E']])}"/>`;
  for (let i = 1; i < 9; i++) s += `<path d="M${f1(x - 4 + i * (len + 4) / 9)} ${f1(y + 3 - i * 4 / 9)}v-2" stroke="#8A5A32" stroke-width=".4"/>`;
  return s;
}
function deer(x, y, s, flip = 1) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s * flip)} ${f1(s)})">`
    + `<path d="M-9 -9Q-10 -14 -4 -14H6Q10 -14 11 -11L14 -16Q15 -19 17 -18L18 -14Q17 -11 14 -9L12 -6Q11 -4 10 -4V0H8.6L8 -4H-4L-5 0H-6.4L-7 -4Q-9 -6 -9 -9Z" fill="#B07A4E"/>`
    + `<path d="M-4 -14H6Q9 -14 10 -12Q4 -11 -4 -12Z" fill="#C99A6A"/><path d="M14 -16l-2 -5M14 -16l1 -6M12 -20l-2 -2M15 -21l2 -2" stroke="#7A5232" stroke-width=".8" stroke-linecap="round"/>`
    + `<circle cx="16" cy="-15.6" r=".6" fill="#2A1A10"/><path d="M-9 -11l-2 -1" stroke="#B07A4E" stroke-width="1.6" stroke-linecap="round"/>`
    + `<circle cx="-2" cy="-11" r=".6" fill="#F4E6D0"/><circle cx="2" cy="-12" r=".6" fill="#F4E6D0"/><circle cx="0" cy="-10" r=".5" fill="#F4E6D0"/></g>`;
}
function rabbit(x, y, s, k) {
  return `<g class="pl-hopsmall" style="animation-delay:-${f1(plRnd(k, 2) * 6)}s"><g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s)})">`
    + `<ellipse cx="0" cy="-3" rx="4.6" ry="3.4" fill="#C9B8A6"/><circle cx="4" cy="-6" r="2.4" fill="#C9B8A6"/>`
    + `<path d="M3.4 -8Q2.6 -13 4 -13Q4.8 -11 4.4 -8Z" fill="#C9B8A6"/><path d="M4.6 -8Q5 -12.6 6.2 -12.4Q6.4 -10.4 5.4 -8Z" fill="#B8A694"/>`
    + `<circle cx="-4.4" cy="-3.6" r="1.4" fill="#FFFFFF"/><circle cx="4.9" cy="-6.4" r=".45" fill="#222"/><ellipse cx="0" cy="0" rx="4" ry=".7" fill="#000" opacity=".12"/></g></g>`;
}
function owl(x, y, s) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s)})"><ellipse cx="0" cy="0" rx="4.4" ry="5.6" fill="#8A6A4E"/><ellipse cx="0" cy="1.4" rx="3" ry="3.6" fill="#C9AE88"/>`
    + `<circle cx="-1.8" cy="-2.6" r="1.7" fill="#FFF4C8"/><circle cx="1.8" cy="-2.6" r="1.7" fill="#FFF4C8"/><circle class="pl-blink" cx="-1.8" cy="-2.6" r=".8" fill="#222"/><circle class="pl-blink" cx="1.8" cy="-2.6" r=".8" fill="#222"/>`
    + `<path d="M-.6 -1.4L0 -.4L.6 -1.4Z" fill="#FF9F2A"/><path d="M-4 -5L-3 -7L-2 -5.4M4 -5L3 -7L2 -5.4" fill="#8A6A4E"/></g>`;
}
function woodBridge(x, y, wd, D) {
  let s = `<path d="M${f1(x - wd / 2)} ${f1(y)}Q${f1(x)} ${f1(y - wd * 0.28)} ${f1(x + wd / 2)} ${f1(y)}" stroke="${D.lin('brg', [[0, '#C98A52'], [1, '#8A5A32']], 1, 0)}" stroke-width="3.4" fill="none"/>`;
  for (let i = 0; i <= 6; i++) { const t = i / 6, bx = x - wd / 2 + t * wd, by = y - Math.sin(t * Math.PI) * wd * 0.14 - 1; s += `<path d="M${f1(bx)} ${f1(by)}v-6" stroke="#7A4A28" stroke-width=".9"/>`; }
  s += `<path d="M${f1(x - wd / 2)} ${f1(y - 6)}Q${f1(x)} ${f1(y - 6 - wd * 0.28)} ${f1(x + wd / 2)} ${f1(y - 6)}" stroke="#A8703E" stroke-width="1.2" fill="none"/>`;
  return s;
}
function aurora(w, top, D) {
  const g = D.lin('aur', [[0, '#5CFFB0', 0], [0.4, '#5CFFB0', 0.55], [0.75, '#A07CFF', 0.45], [1, '#A07CFF', 0]], 0, 1);
  return `<g filter="url(#${D.id('b3')})" class="pl-aurora">${[0, 1, 2].map((i) => `<path d="M-20 ${f1(top + 20 + i * 6)}C${f1(w * 0.25)} ${f1(top - 5 + i * 8)} ${f1(w * 0.55)} ${f1(top + 30 - i * 4)} ${f1(w + 20)} ${f1(top + 6 + i * 5)}L${f1(w + 20)} ${f1(top + 30 + i * 5)}C${f1(w * 0.55)} ${f1(top + 52 - i * 4)} ${f1(w * 0.25)} ${f1(top + 22 + i * 8)} -20 ${f1(top + 44 + i * 6)}Z" fill="${g}" opacity="${0.8 - i * 0.2}"/>`).join('')}</g>`;
}
function rainbow(cx, cy, r, op = 0.35) {
  return ['#FF5C5C', '#FFA94D', '#FFE066', '#69DB7C', '#4DABF7', '#9775FA'].map((c, i) => `<path d="M${f1(cx - r + i * 2.2)} ${f1(cy)}A${f1(r - i * 2.2)} ${f1(r - i * 2.2)} 0 0 1 ${f1(cx + r - i * 2.2)} ${f1(cy)}" stroke="${c}" stroke-width="2.4" fill="none" opacity="${op}"/>`).join('');
}

/** The painted picture of a place, without Lumi and the home. Returns {art, glow}. */
function paintedPlace(place, o, D) {
  const { w, h, tod } = o;
  const gy = h * 0.8, dusk = tod === 'evening' || tod === 'night';
  const n = (b) => Math.max(1, Math.round(b * w / 400));
  D.blur('b1', 0.7); D.blur('b2', 1.6); D.blur('b3', 3);
  let art = '', glow = '';
  const B = (lvl, inner) => `<g filter="url(#${D.id(lvl)})">${inner}</g>`;

  if (place === 'forest') {
    // ---- the fairy forest: giant mossy trees arching over a clearing, sun rays through blue-green mist,
    // bright flowers, a pond in front. Edges are made uneven by a noise filter, so shapes look painted.
    D.paint('pt1', 3, 0.04, 3); D.paint('pt2', 5, 0.025, 7); D.paint('pt3', 2.2, 0.09, 11);
    const P1 = D.id('pt1'), P2 = D.id('pt2'), P3 = D.id('pt3');
    art += `<rect width="${w}" height="${h}" fill="${D.lin('ffsky', [[0, '#A9DCE3'], [0.45, '#D4EEE4'], [0.75, '#BFE0CC'], [1, '#8FBF9E']])}"/>`;
    // far: misty trunks and arches, pale teal, soft
    let far = '';
    for (let i = 0; i < n(6); i++) {
      const x = (i + 0.4 + plRnd(i, 1) * 0.4) * w / n(6), wd = 6 + plRnd(i, 2) * 6;
      far += `<path d="M${f1(x - wd * 1.6)} ${f1(gy)}C${f1(x - wd)} ${f1(gy * 0.7)} ${f1(x - wd * 1.3)} ${f1(gy * 0.35)} ${f1(x - wd * 0.6)} -6H${f1(x + wd * 0.6)}C${f1(x + wd * 1.4)} ${f1(gy * 0.35)} ${f1(x + wd)} ${f1(gy * 0.7)} ${f1(x + wd * 1.7)} ${f1(gy)}Z" fill="#9CC7C6"/>`
        + `<path d="M${f1(x)} ${f1(gy * (0.3 + plRnd(i, 3) * 0.15))}C${f1(x + 25)} ${f1(gy * 0.12)} ${f1(x + 55)} ${f1(gy * 0.18)} ${f1(x + 80)} ${f1(gy * 0.36)}" stroke="#9CC7C6" stroke-width="${f1(4 + plRnd(i, 4) * 3)}" fill="none"/>`;
    }
    for (let i = 0; i < n(10); i++) far += `<ellipse cx="${f1(plRnd(i, 5) * w)}" cy="${f1(plRnd(i, 6) * gy * 0.45)}" rx="${f1(22 + plRnd(i, 7) * 18)}" ry="${f1(10 + plRnd(i, 8) * 8)}" fill="#B6D9C6" opacity=".9"/>`;
    art += `<g filter="url(#${D.id('b3')})"><g filter="url(#${P2})">${far}</g></g>`;
    // middle: big purple-grey trunks with mossy arms, a little soft
    const limb = (x0, y0, c1x, c1y, c2x, c2y, x1, y1, w0, w1, col) => {
      // a branch with a width that changes from w0 to w1 along a curve (drawn as a filled band)
      const pts = [], N = 18;
      for (let i = 0; i <= N; i++) {
        const t = i / N, u = 1 - t;
        const x = u * u * u * x0 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x1, y = u * u * u * y0 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y1;
        const dx = 3 * u * u * (c1x - x0) + 6 * u * t * (c2x - c1x) + 3 * t * t * (x1 - c2x), dy = 3 * u * u * (c1y - y0) + 6 * u * t * (c2y - c1y) + 3 * t * t * (y1 - c2y);
        const L = Math.hypot(dx, dy) || 1, wd = (w0 + (w1 - w0) * t) / 2;
        pts.push([x, y, -dy / L * wd, dx / L * wd]);
      }
      const top = pts.map(([x, y, nx, ny]) => [x + nx, y + ny]), bot = pts.map(([x, y, nx, ny]) => [x - nx, y - ny]).reverse();
      return { d: `M${[...top, ...bot].map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L')}Z`, upper: pts.map(([x, y, nx, ny]) => (ny < 0 ? [x + nx, y + ny] : [x - nx, y - ny])), col };
    };
    // a carpet of moss along the top of a branch: a wavy band, darker underneath, lit on top, with tiny flowers
    const mossStrip = (pts, th, k) => {
      const up = pts.map(([x, y], i) => [x, y - th * (0.6 + plRnd(k, i) * 0.8)]);
      const band = `M${pts.map(([x, y]) => `${f1(x)} ${f1(y + th * 0.25)}`).join('L')}L${up.reverse().map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L')}Z`;
      let m = `<path d="${band}" fill="#7E8E2C"/>`;
      const up2 = pts.map(([x, y], i) => `${f1(x)} ${f1(y - th * (0.55 + plRnd(k, i + 50) * 0.7))}`);
      m += `<path d="M${pts.map(([x, y]) => `${f1(x)} ${f1(y - th * 0.15)}`).join('L')}L${up2.reverse().join('L')}Z" fill="${D.lin(`ms${k}`, [[0, '#E2D85A'], [1, '#A9B23A']])}"/>`;
      pts.forEach(([x, y], i) => {
        if (plRnd(k, i + 90) > 0.5) m += `<circle cx="${f1(x)}" cy="${f1(y - th * 0.9)}" r="${f1(th * 0.22)}" fill="#F08A3C"/><circle cx="${f1(x + th * 0.3)}" cy="${f1(y - th * 1.05)}" r="${f1(th * 0.16)}" fill="#FF6A4C"/>`;
        if (plRnd(k, i + 120) > 0.6) m += `<circle cx="${f1(x - th * 0.3)}" cy="${f1(y - th * 0.8)}" r="${f1(th * 0.14)}" fill="#FFF3A0"/>`;
      });
      return m;
    };
    const mossOn = (pts, sz, k, bright = true) => pts.map(([x, y], i) => {
      const r = sz * (0.8 + plRnd(k, i) * 0.7);
      return `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(r * 1.5)}" ry="${f1(r * 0.75)}" fill="${bright ? '#8E9C2E' : '#7E8E52'}"/>`
        + `<ellipse cx="${f1(x - r * 0.2)}" cy="${f1(y - r * 0.3)}" rx="${f1(r * 1.1)}" ry="${f1(r * 0.5)}" fill="${bright ? '#D6CF4A' : '#A9B474'}"/>`
        + (bright && plRnd(k, i + 40) > 0.55 ? `<circle cx="${f1(x + r * 0.5)}" cy="${f1(y - r * 0.6)}" r="${f1(r * 0.35)}" fill="#F08A3C"/><circle cx="${f1(x + r * 0.1)}" cy="${f1(y - r * 0.8)}" r="${f1(r * 0.25)}" fill="#FF6A4C"/>` : '');
    }).join('');
    const drips = (pts, k, len) => pts.filter((_, i) => i % 2).map(([x, y], i) => {
      const l = len * (0.4 + plRnd(k, i) * 0.9);
      return `<path d="M${f1(x - 1.2)} ${f1(y)}Q${f1(x - 0.6)} ${f1(y + l * 0.6)} ${f1(x + 0.3)} ${f1(y + l)}Q${f1(x + 0.6)} ${f1(y + l * 0.5)} ${f1(x + 1.2)} ${f1(y)}Z" fill="#7E8A3A" opacity=".85"/>`;
    }).join('');
    let mid = '';
    for (const [x, k] of [[w * 0.36, 1], [w * 0.62, 2], [w * 0.8, 3]]) {
      const tw = 9 + plRnd(k, 9) * 4;
      mid += `<path d="M${f1(x - tw * 2)} ${f1(gy - 2)}C${f1(x - tw)} ${f1(gy - 10)} ${f1(x - tw * 1.2)} ${f1(gy * 0.5)} ${f1(x - tw * 0.4)} -6H${f1(x + tw * 0.6)}C${f1(x + tw * 1.3)} ${f1(gy * 0.5)} ${f1(x + tw)} ${f1(gy - 10)} ${f1(x + tw * 2.2)} ${f1(gy - 2)}Z" fill="${D.lin(`mtk${k}`, [[0, '#8A8C9A'], [1, '#5C5E70']], 1, 0)}"/>`;
      const a = limb(x, gy * 0.42, x + 30, gy * 0.18, x + 70, gy * 0.12, x + 110, gy * 0.26, 9, 3, '#6E6E80');
      mid += `<path d="${a.d}" fill="#6E6E80"/>` + mossStrip(a.upper, 4.5, k * 10).replace(/#E2D85A/g, '#C9CC7E').replace(/#A9B23A/g, '#9AA66A').replace(/#7E8E2C/g, '#7E8A62');
    }
    art += `<g filter="url(#${D.id('b1')})"><g filter="url(#${P1})">${mid}</g></g>`;
    // the canopy: masses of golden-green leaves along the top, some hanging down
    let canopy = '';
    for (let i = 0; i < n(14); i++) {
      const x = plRnd(i, 140) * w, y = -6 + plRnd(i, 141) * 22;
      canopy += foliage(x, y, 14 + plRnd(i, 142) * 10, '#6E8A34', '#A9B840', '#E6DA6A', i + 143, 7);
    }
    art += `<g filter="url(#${P1})">${canopy}</g>`;
    // sun rays from the top right through the leaves
    const rg = D.lin('frays', [[0, '#FFF2B4', 0.6], [1, '#FFF2B4', 0]]);
    art += `<g filter="url(#${D.id('b3')})">${[0, 1, 2, 3].map((i) => `<path class="pl-ray" d="M${f1(w * (0.66 + i * 0.09))} -6L${f1(w * (0.7 + i * 0.09))} -6L${f1(w * (0.42 + i * 0.07))} ${f1(gy + 6)}L${f1(w * (0.36 + i * 0.07))} ${f1(gy + 6)}Z" fill="${rg}" style="animation-delay:-${i * 1.7}s"/>`).join('')}</g>`;
    // the mossy ground and flower bank
    art += `<g filter="url(#${P1})"><path d="${hillPath(w, h, gy - 4, 6, 91, 4)}" fill="${D.lin('fbank', [[0, '#A9B94E'], [0.35, '#6E9640'], [1, '#2E4A2A']])}"/></g>`;
    // the big tree in front (left): buttress roots, a huge arm arching over everything, moss and hanging moss
    const tx = w * 0.07, tw = 20;
    let front = `<path d="M${f1(tx - tw * 2.6)} ${f1(gy + 10)}C${f1(tx - tw * 1.6)} ${f1(gy - 2)} ${f1(tx - tw * 1.1)} ${f1(gy - 30)} ${f1(tx - tw * 0.8)} ${f1(gy * 0.55)}C${f1(tx - tw * 0.7)} ${f1(gy * 0.3)} ${f1(tx - tw * 0.3)} ${f1(gy * 0.1)} ${f1(tx - tw * 0.2)} -8H${f1(tx + tw * 0.9)}C${f1(tx + tw * 0.8)} ${f1(gy * 0.2)} ${f1(tx + tw * 0.9)} ${f1(gy * 0.45)} ${f1(tx + tw * 1.1)} ${f1(gy * 0.6)}C${f1(tx + tw * 1.3)} ${f1(gy - 26)} ${f1(tx + tw * 2)} ${f1(gy - 4)} ${f1(tx + tw * 3.2)} ${f1(gy + 10)}Z" fill="${D.lin('ftk', [[0, '#6A5A70'], [0.5, '#4A3C52'], [1, '#2E2436']], 1, 0)}"/>`;
    front += `<path d="M${f1(tx - tw * 0.4)} ${f1(gy - 6)}C${f1(tx - tw * 0.5)} ${f1(gy * 0.5)} ${f1(tx - tw * 0.2)} ${f1(gy * 0.2)} ${f1(tx)} -6" stroke="#9C8AA4" stroke-width="2" fill="none" opacity=".45"/>`;
    const arm = limb(tx + tw * 0.6, gy * 0.42, w * 0.3, gy * 0.02, w * 0.62, gy * 0.18, w * 1.04, gy * 0.02, 17, 7, '#4E4058');
    const arm2 = limb(tx + tw * 0.4, gy * 0.2, w * 0.18, gy * -0.08, w * 0.3, gy * -0.02, w * 0.42, -6, 10, 6, '#4E4058');
    front += `<path d="${arm2.d}" fill="#4A3C54"/><path d="${arm.d}" fill="${D.lin('farm', [[0, '#5E4E68'], [1, '#3A2E44']])}"/>`;
    front += drips(arm.upper.map(([x, y], i) => [x, y + 14 - i * 0.3]), 31, 26) + mossStrip(arm.upper, 9, 32) + mossStrip(arm2.upper, 6.5, 33)
      + mossStrip([[tx + tw * 0.7, gy * 0.5], [tx + tw * 0.9, gy * 0.55], [tx + tw * 1.05, gy * 0.62], [tx + tw * 1.15, gy * 0.7]], 5, 34);
    art += `<g filter="url(#${P3})">${front}</g>`;
    // the right tree
    const rx = w * 0.97;
    art += `<g filter="url(#${P3})"><path d="M${f1(rx - 34)} ${f1(gy + 10)}C${f1(rx - 18)} ${f1(gy - 4)} ${f1(rx - 14)} ${f1(gy * 0.5)} ${f1(rx - 10)} -8H${f1(w + 10)}V${f1(gy + 10)}Z" fill="${D.lin('frk', [[0, '#5A4A62'], [1, '#2E2436']], 1, 0)}"/>${mossStrip([[rx - 10, gy * 0.3], [rx - 11, gy * 0.42], [rx - 12, gy * 0.55], [rx - 14, gy * 0.68], [rx - 17, gy * 0.8]], 6, 35)}</g>`;
    // flower beds along the bank: big bright blossoms
    const bloom = (x, y, sz, petal, centre, k) => {
      let b = `<path d="M${f1(x)} ${f1(y)}V${f1(y - sz * 2.4)}" stroke="#3E6E2E" stroke-width="${f1(sz * 0.18)}"/><path d="M${f1(x)} ${f1(y - sz * 0.6)}q${f1(sz * 1.4)} ${f1(-sz * 0.4)} ${f1(sz * 1.8)} ${f1(-sz * 1.4)}q${f1(-sz * 1.2)} 0 ${f1(-sz * 1.8)} ${f1(sz * 0.9)}z" fill="#4E8A3A"/>`;
      for (let i = 0; i < 7; i++) b += `<ellipse cx="${f1(x)}" cy="${f1(y - sz * 2.4 - sz * 0.6)}" rx="${f1(sz * 0.32)}" ry="${f1(sz * 0.66)}" fill="${petal}" transform="rotate(${f1(i * 51.4 + plRnd(k, i) * 10)} ${f1(x)} ${f1(y - sz * 2.4)})"/>`;
      return `<g class="pl-sway" style="transform-origin:${f1(x)}px ${f1(y)}px;animation-delay:-${f1(plRnd(k, 9) * 4)}s">${b}<circle cx="${f1(x)}" cy="${f1(y - sz * 2.4)}" r="${f1(sz * 0.3)}" fill="${centre}"/></g>`;
    };
    const fl = [['#E84FB0', '#FFD84A'], ['#B85CE8', '#FFE27A'], ['#FF7A3C', '#FFE27A'], ['#E8434F', '#FFD0A0'], ['#FFC93C', '#C2621E']];
    for (let i = 0; i < n(16); i++) {
      const x = w * (0.12 + plRnd(i, 40) * 0.8), y = gy + 1 + plRnd(i, 41) * 8;
      art += i % 3 ? flowerBush(x, y, 2.6 + plRnd(i, 42) * 1.4, fl[i % 5][0], '#FFD6EE', i + 50) : bloom(x, y, 3 + plRnd(i, 43) * 1.6, fl[i % 5][0], fl[i % 5][1], i + 60);
    }
    // big leafy plants and bushes along the bank
    const leafFan = (x, y, sz, c1, c2, k) => `<g class="pl-sway" style="transform-origin:${f1(x)}px ${f1(y)}px;animation-delay:-${f1(plRnd(k, 1) * 4)}s">`
      + [-1.1, -0.6, -0.15, 0.3, 0.8, 1.2].map((a, i) => { const tx2 = x + Math.sin(a) * sz * 2.2, ty2 = y - Math.cos(a) * sz * 2; return `<path d="M${f1(x)} ${f1(y)}Q${f1(x + Math.sin(a) * sz * 0.6 - sz * 0.5)} ${f1(y - Math.cos(a) * sz * 1.3)} ${f1(tx2)} ${f1(ty2)}Q${f1(x + Math.sin(a) * sz * 0.9 + sz * 0.5)} ${f1(y - Math.cos(a) * sz)} ${f1(x)} ${f1(y)}Z" fill="${i % 2 ? c1 : c2}"/>`; }).join('') + '</g>';
    art += `<g filter="url(#${P1})">${[0.16, 0.3, 0.55, 0.74, 0.86].map((fx, i) => foliage(w * fx, gy - 2, 9 + plRnd(i, 150) * 5, '#2E5A34', '#3E7440', '#6E9A4A', i + 151, 6)).join('')}</g>`;
    art += leafFan(w * 0.21, gy + 4, 5, '#3E7A4A', '#5E9A58', 1) + leafFan(w * 0.9, gy + 3, 6, '#3E7A4A', '#5E9A58', 2) + leafFan(w * 0.58, gy + 2, 4, '#4E8A50', '#6EAA60', 3);
    // the pond in front: dark teal water with the light and the flowers reflected in it, stones
    const pond = `M0 ${f1(gy + 10)}Q${f1(w * 0.2)} ${f1(gy + 6)} ${f1(w * 0.42)} ${f1(gy + 11)}Q${f1(w * 0.56)} ${f1(gy + 15)} ${f1(w * 0.5)} ${f1(h)}H0Z`;
    art += `<path d="${pond}" fill="${D.lin('fpond', [[0, '#8FC2B0'], [0.4, '#4E8A80'], [1, '#2A4E4A']])}"/>`;
    art += `<g opacity=".55" filter="url(#${D.id('b2')})">${[0, 1, 2, 3, 4].map((i) => `<rect x="${f1(w * (0.05 + i * 0.09))}" y="${f1(gy + 12 + plRnd(i, 70) * 6)}" width="${f1(6 + plRnd(i, 71) * 8)}" height="${f1(10 + plRnd(i, 72) * 8)}" fill="${fl[i % 5][0]}" opacity=".5"/>`).join('')}<rect x="${f1(w * 0.3)}" y="${f1(gy + 12)}" width="${f1(w * 0.14)}" height="20" fill="#FFF2B4" opacity=".55"/></g>`;
    for (let i = 0; i < n(5); i++) art += `<path class="pl-ray" d="M${f1(w * (0.04 + plRnd(i, 73) * 0.4))} ${f1(gy + 14 + plRnd(i, 74) * 14)}h${f1(8 + plRnd(i, 75) * 14)}" stroke="#E6FFF6" stroke-width=".8" opacity=".7"/>`;
    art += stone(w * 0.12, gy + 22, 7, 1) + stone(w * 0.27, gy + 16, 5, 2) + stone(w * 0.4, gy + 26, 6.5, 3);
    // dark roots and leaves in front, like looking out from the bushes
    art += `<g filter="url(#${D.id('b1')})"><path d="M-6 ${f1(h)}C${f1(w * 0.04)} ${f1(h - 18)} ${f1(w * 0.1)} ${f1(h - 12)} ${f1(w * 0.18)} ${f1(h - 2)}L${f1(w * 0.2)} ${f1(h + 4)}Z" fill="#1E2A24"/><path d="M${f1(w + 6)} ${f1(h)}C${f1(w * 0.95)} ${f1(h - 22)} ${f1(w * 0.88)} ${f1(h - 10)} ${f1(w * 0.8)} ${f1(h - 1)}L${f1(w * 0.78)} ${f1(h + 4)}Z" fill="#1E2A24"/>`
      + `<path d="M${f1(w * 0.9)} ${f1(h + 2)}q4 -16 14 -22q-4 12 -6 24z" fill="#24382A"/></g>`;
    // white birds in the light, butterflies, glowing specks
    art += Array.from({ length: n(7) }, (_, i) => bird(w * (0.14 + plRnd(i, 76) * 0.22), 14 + plRnd(i, 77) * 34, 0.7 + plRnd(i, 78) * 0.5, i + 79, '#FFFFFF')).join('');
    for (let i = 0; i < n(5); i++) art += butterfly(w * (0.22 + plRnd(i, 80) * 0.6), gy - 6 - plRnd(i, 81) * 36, 0.5, '#FFFFFF', '#E6F6FF', i + 82);
    glow += motes(w, h, dusk ? n(36) : n(22), 85, dusk ? '#E8FF9A' : '#FFF6C0');
    if (dusk) {
      for (let i = 0; i < n(5); i++) {
        const x = w * (0.1 + plRnd(i, 86) * 0.8), y = gy + 2 + plRnd(i, 87) * 6;
        glow += `<circle class="pl-glow" cx="${f1(x)}" cy="${f1(y - 4)}" r="6" fill="${D.rad('fgm', [[0, '#7FF0FF', 0.6], [1, '#7FF0FF', 0]])}"/><path d="M${f1(x - 0.8)} ${f1(y)}V${f1(y - 3)}H${f1(x + 0.8)}V${f1(y)}Z" fill="#DFF6FF"/><path d="M${f1(x - 3)} ${f1(y - 3)}Q${f1(x)} ${f1(y - 7.5)} ${f1(x + 3)} ${f1(y - 3)}Z" fill="#7FF0FF"/>`;
      }
    }
    art += `<rect width="${w}" height="${h}" filter="url(#${D.id('grain')})" opacity=".08"/>`;
    D.grain('grain');
  } else if (place === 'blossom') {
    art += `<rect width="${w}" height="${h}" fill="${D.lin('gsky', [[0, '#A9D6F5'], [0.55, '#FBE3EC'], [1, '#FFF1E2']])}"/>`;
    let far = '';
    for (let i = 0; i < n(8); i++) { const x = plRnd(i, 1) * w; far += foliage(x, gy - 26 - plRnd(i, 2) * 6, 14 + plRnd(i, 3) * 6, '#F3B9CD', '#F9CFDD', '#FFE8F0', i + 3, 6); }
    art += B('b3', `<path d="${hillPath(w, h, gy - 22, 8, 71, 4)}" fill="#B9DDB0"/>` + far);
    art += B('b1', `<path d="${hillPath(w, h, gy - 8, 6, 73, 3)}" fill="#9CCB86"/>` + Array.from({ length: n(5) }, (_, i) => foliage(plRnd(i, 9) * w, gy - 12, 9, '#7FB868', '#94C878', '#C6E6A6', i + 10, 5)).join(''));
    art += lightRays(w, h, D, 0.62, 2);
    art += `<path d="${hillPath(w, h, gy + 1, 5, 75, 3)}" fill="${D.lin('ggr', [[0, '#8FCB72'], [1, '#4E8A3E']])}"/>`;
    // a small pond with water lilies, a stone path
    art += `<ellipse cx="${f1(w * 0.36)}" cy="${f1(gy + 14)}" rx="${f1(w * 0.12)}" ry="9" fill="${D.lin('pond', [[0, '#BFE6EF'], [1, '#6FB2C4']])}"/><path d="M${f1(w * 0.28)} ${f1(gy + 12)}h22" stroke="#FFFFFF" stroke-width="1" opacity=".6"/>`
      + [[0.31, 12], [0.4, 16], [0.36, 10]].map(([fx, dy], i) => `<ellipse cx="${f1(w * fx)}" cy="${f1(gy + dy)}" rx="3.4" ry="1.6" fill="#5FA052"/>${i === 1 ? `<circle cx="${f1(w * fx)}" cy="${f1(gy + dy - 1)}" r="1.4" fill="#FFB7D0"/>` : ''}`).join('');
    for (let i = 0; i < 5; i++) art += `<ellipse cx="${f1(w * (0.6 - i * 0.012))}" cy="${f1(gy + 6 + i * 6)}" rx="${f1(4 + i)}" ry="${f1(1.6 + i * 0.3)}" fill="#E3D6C6"/><ellipse cx="${f1(w * (0.6 - i * 0.012) - 1)}" cy="${f1(gy + 5.5 + i * 6)}" rx="${f1(2.4 + i * 0.6)}" ry="${f1(0.8 + i * 0.2)}" fill="#F4ECE2"/>`;
    // two big cherry trees: dark branches and clouds of blossom (soft under-layer, crisp highlights)
    const cherry = (x, sc, k) => {
      let c = `<path d="M${f1(x - 4 * sc)} ${f1(gy + 4)}C${f1(x - 2 * sc)} ${f1(gy - 30 * sc)} ${f1(x + 6 * sc)} ${f1(gy - 40 * sc)} ${f1(x)} ${f1(gy - 62 * sc)}M${f1(x + 1 * sc)} ${f1(gy - 40 * sc)}Q${f1(x - 18 * sc)} ${f1(gy - 52 * sc)} ${f1(x - 30 * sc)} ${f1(gy - 58 * sc)}M${f1(x + 2 * sc)} ${f1(gy - 46 * sc)}Q${f1(x + 20 * sc)} ${f1(gy - 56 * sc)} ${f1(x + 32 * sc)} ${f1(gy - 66 * sc)}" stroke="${D.lin('cb', [[0, '#6A4A52'], [1, '#3E2A32']])}" stroke-width="${f1(4.6 * sc)}" stroke-linecap="round" fill="none"/>`;
      c += B('b1', foliage(x - 20 * sc, gy - 66 * sc, 22 * sc, '#E48AAE', '#F4A9C6', '#FFD6E6', k, 9) + foliage(x + 18 * sc, gy - 72 * sc, 24 * sc, '#E48AAE', '#F4A9C6', '#FFD6E6', k + 1, 9));
      c += foliage(x - 2 * sc, gy - 78 * sc, 20 * sc, '#EC98BA', '#FFB8D2', '#FFE6F0', k + 2, 8);
      for (let i = 0; i < 18; i++) c += `<circle cx="${f1(x + (plRnd(k, i) - 0.5) * 80 * sc)}" cy="${f1(gy - 70 * sc + (plRnd(k, i + 30) - 0.5) * 34 * sc)}" r="${f1(1.1 * sc)}" fill="#FFFFFF" opacity=".9"/>`;
      return c;
    };
    art += cherry(w * 0.1, 1.1, 81) + cherry(w * 0.9, 0.95, 85);
    const cols = [['#FF5C8A', '#FFC0D2'], ['#FFC93C', '#FFF0A8'], ['#9B7BFF', '#D8C8FF'], ['#FF8A4C', '#FFD0B0'], ['#FFFFFF', '#FFFFFF']];
    for (let i = 0; i < n(11); i++) {
      const x = plRnd(i, 90) * w, y = gy + 6 + plRnd(i, 91) * (h - gy - 8);
      if ((x > w * 0.24 && x < w * 0.48 && y < gy + 24) || Math.abs(x - w * 0.58) < w * 0.05) continue;
      art += flowerBush(x, y, 2.8 + plRnd(i, 92) * 1.6, ...cols[i % cols.length], i + 95);
    }
    art += `<g class="pl-swing" style="transform-origin:${f1(w * 0.1 + 14)}px ${f1(gy - 58)}px"><path d="M${f1(w * 0.1 + 9)} ${f1(gy - 58)}V${f1(gy - 16)}M${f1(w * 0.1 + 19)} ${f1(gy - 58)}V${f1(gy - 16)}" stroke="#8A6A4E" stroke-width=".8"/><rect x="${f1(w * 0.1 + 7)}" y="${f1(gy - 17)}" width="14" height="2.4" rx="1" fill="#C98A52"/></g>`
      + rabbit(w * 0.7, gy + 10, 1, 2);
    art += butterfly(w * 0.42, gy - 44, 0.8, '#FFB13C', '#FF7A3C', 1) + butterfly(w * 0.74, gy - 58, 0.7, '#FFFFFF', '#CFE8FF', 2);
    for (let i = 0; i < n(12); i++) art += `<path class="pl-petal" d="M${f1(plRnd(i, 96) * w)} -6q2 -2.4 4 0q-2 2.4 -4 0z" fill="#FFC2D8" style="animation-delay:-${f1(plRnd(i, 97) * 10)}s;animation-duration:${f1(9 + plRnd(i, 98) * 6)}s"/>`;
    glow += motes(w, h, dusk ? n(18) : n(8), 99, dusk ? '#FFE8A0' : '#FFFFFF');
  } else if (place === 'clouds') {
    art += `<rect width="${w}" height="${h}" fill="${D.lin('csky', [[0, '#6FB6F2'], [0.6, '#BFE0FA'], [1, '#FCE8D6']])}"/>`;
    art += B('b3', cloud(w * 0.2, 40, 18, '#FFFFFF', '#D6E6F6', 0.8) + cloud(w * 0.75, 30, 22, '#FFFFFF', '#D6E6F6', 0.7) + cloud(w * 0.5, 70, 26, '#FFF6EE', '#E8D8E6', 0.6));
    // far floating islands
    const island = (x, y, wd, k, blur) => {
      const top = `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(wd)}" ry="${f1(wd * 0.18)}" fill="#7FBF5E"/><ellipse cx="${f1(x - wd * 0.15)}" cy="${f1(y - wd * 0.05)}" rx="${f1(wd * 0.7)}" ry="${f1(wd * 0.1)}" fill="#A6D877"/>`;
      const rock = `<path d="M${f1(x - wd)} ${f1(y)}Q${f1(x - wd * 0.6)} ${f1(y + wd * 0.5)} ${f1(x)} ${f1(y + wd * 0.9)}Q${f1(x + wd * 0.6)} ${f1(y + wd * 0.5)} ${f1(x + wd)} ${f1(y)}Z" fill="${D.lin(`rk${k}`, [[0, '#B58E6E'], [1, '#6E5466']])}"/>`;
      const tree = foliage(x + wd * 0.3, y - wd * 0.25, wd * 0.28, '#5E9E4E', '#7FBF5E', '#B9E08A', k, 6);
      const fall = `<path d="M${f1(x - wd * 0.5)} ${f1(y + 2)}V${f1(y + wd * 1.4)}" stroke="#E8F6FF" stroke-width="${f1(wd * 0.06)}" opacity=".7"/>`;
      return blur ? B(blur, rock + top + tree + fall) : rock + top + tree + fall;
    };
    art += island(w * 0.16, 58, 22, 1, 'b2') + island(w * 0.86, 44, 18, 2, 'b2');
    if (!dusk) art += rainbow(w * 0.5, gy - 6, w * 0.3, 0.32);
    art += balloon(w * 0.3, 30, 1.1, '#E8505B', '#FFD166', 1) + balloon(w * 0.7, 24, 0.75, '#3A86FF', '#F1F5FF', 2);
    art += birdsWhite(w, 4, 110);
    // the island Lumi lives on, resting on a soft cloud sea
    art += `<path d="M${f1(w * 0.22)} ${f1(gy + 2)}Q${f1(w * 0.3)} ${f1(h + 30)} ${f1(w * 0.55)} ${f1(h + 40)}Q${f1(w * 0.82)} ${f1(h + 30)} ${f1(w * 0.92)} ${f1(gy + 2)}Z" fill="${D.lin('mrk', [[0, '#C29A78'], [0.6, '#8A6A70'], [1, '#5A4660']])}"/>`
      + `<path d="M${f1(w * 0.5)} ${f1(gy + 6)}V${f1(h)}" stroke="#E8F6FF" stroke-width="3" opacity=".75"/>`
      + `<ellipse cx="${f1(w * 0.57)}" cy="${f1(gy + 2)}" rx="${f1(w * 0.36)}" ry="7" fill="#6FB050"/><ellipse cx="${f1(w * 0.55)}" cy="${f1(gy)}" rx="${f1(w * 0.32)}" ry="5" fill="#9AD06C"/>`;
    for (let i = 0; i < n(6); i++) art += flowerBush(w * (0.28 + plRnd(i, 112) * 0.58), gy + 1, 2.2, ...[['#FF5C8A', '#FFC0D2'], ['#FFC93C', '#FFF0A8'], ['#FFFFFF', '#FFFFFF']][i % 3], i + 113);
    const bot = `<g fill="#FFFFFF">${Array.from({ length: n(12) + 1 }, (_, i) => `<circle cx="${f1(i * w / n(12))}" cy="${f1(h + 4 - plRnd(i, 114) * 8)}" r="${f1(14 + plRnd(i, 115) * 10)}"/>`).join('')}</g>`;
    art += `<g opacity=".95">${bot}</g>`;
    glow += motes(w, h, dusk ? n(14) : n(6), 116, '#FFFFFF');
  } else {                                                             // fireflies: a lake under the mountains
    art += `<rect width="${w}" height="${h}" fill="${D.lin('lsky', [[0, '#6FB3EC'], [0.45, '#CFE8F6'], [0.6, '#FBE6D2']])}"/>`
      + (tod === 'day' || tod === 'morning' ? `<circle cx="${f1(w * 0.78)}" cy="26" r="38" fill="${D.rad('lsun', [[0, '#FFF3B0', 0.75], [1, '#FFF3B0', 0]])}"/><circle cx="${f1(w * 0.78)}" cy="26" r="9" fill="#FFF0A0"/>` : '');
    const lake = h * 0.58;
    // realistic mountains: rough ridges, rock gradient, shadow faces, snow; edges roughened like paint
    D.paint('lp1', 4, 0.05, 21); D.paint('lp2', 2.5, 0.12, 23);
    const far = `<g filter="url(#${D.id('b1')})"><g filter="url(#${D.id('lp1')})">${range(w, lake, 76, 7, '#AEB8D2', '#7E8AAE', '#E4E8F4', lake - 46, D, 1)}</g></g>`
      + mistBand(w, lake - 14, 26, D, 'a', 0.5)
      + `<g filter="url(#${D.id('lp1')})">${range(w, lake, 46, 19, '#6E7F9E', '#4A5878', '#A9B6CE', lake - 38, D, 2)}</g>`
      + mistBand(w, lake - 4, 12, D, 'b', 0.4);
    const trees = `<g filter="url(#${D.id('lp2')})">${treeLine(w, lake + 1, 31, '#4E6E5E', '#2E4E40', '#1E3A2E')}</g>`;
    art += far + trees;
    // the lake: sky colours, a blurred upside-down copy of the mountains, light streaks
    art += `<rect y="${f1(lake)}" width="${w}" height="${f1(gy - lake + 4)}" fill="${D.lin('lake', [[0, '#BFDDEE'], [1, '#6FA6C4']])}"/>`;
    art += `<g opacity=".38" filter="url(#${D.id('b2')})" transform="translate(0 ${f1(lake * 2 + 2)}) scale(1 -1)">${far}${trees}</g>`;
    for (let i = 0; i < n(6); i++) art += `<path class="pl-ray" d="M${f1(plRnd(i, 8) * w)} ${f1(lake + 4 + plRnd(i, 9) * (gy - lake - 6))}h${f1(10 + plRnd(i, 10) * 20)}" stroke="#FFFFFF" stroke-width=".8" opacity=".6" style="animation-delay:-${i}s"/>`;
    art += B('b3', `<rect y="${f1(lake - 4)}" width="${w}" height="8" fill="#FFFFFF" opacity=".35"/>`);
    if (tod !== 'night') for (let i = 0; i < 9; i++) art += `<path class="pl-ray" d="M${f1(w * 0.78 - 6 + plRnd(i, 130) * 12)} ${f1(lake + 3 + i * 3.2)}h${f1(4 + plRnd(i, 131) * 8)}" stroke="#FFF6C8" stroke-width="1.1" opacity=".75" style="animation-delay:-${f1(plRnd(i, 132) * 3)}s"/>`;
    art += duck(w * 0.55, lake + 12, 1.1, 1) + duck(w * 0.6, lake + 16, 0.8, 2, '#E9DCC8') + duck(w * 0.63, lake + 14, 0.75, 3, '#E9DCC8');
    art += [[0.12, 8], [0.17, 12], [0.9, 10]].map(([fx, dy], i) => `<ellipse cx="${f1(w * fx)}" cy="${f1(lake + dy + 14)}" rx="4.2" ry="1.6" fill="#4E9A52"/><path d="M${f1(w * fx)} ${f1(lake + dy + 14)}l3 -1" stroke="#7FBF72" stroke-width=".5"/>${i === 1 ? `<circle cx="${f1(w * fx + 1)}" cy="${f1(lake + dy + 13)}" r="1.5" fill="#FFB7D0"/><circle cx="${f1(w * fx + 1)}" cy="${f1(lake + dy + 13)}" r=".6" fill="#FFE27A"/>` : ''}`).join('');
    art += pier(w * 0.36, gy + 2, w * 0.1, D) + boat(w * 0.47, gy - 6, 0.85, D);
    // the shore in front
    art += `<path d="${hillPath(w, h, gy + 2, 6, 81, 3)}" fill="${D.lin('shore', [[0, '#8DBE62'], [1, '#3E6E32']])}"/>`;
    art += stone(w * 0.2, gy + 4, 6, 1) + stone(w * 0.27, gy + 8, 4, 2) + stone(w * 0.88, gy + 6, 5, 3);
    for (let i = 0; i < n(7); i++) {                                 // reeds with cattails
      const x = w * (0.02 + plRnd(i, 82) * 0.3), y = gy + 4 + plRnd(i, 83) * 6, hh = 18 + plRnd(i, 84) * 10;
      art += `<g class="pl-sway" style="transform-origin:${f1(x)}px ${f1(y)}px;animation-delay:-${f1(plRnd(i, 85) * 4)}s"><path d="M${f1(x)} ${f1(y)}Q${f1(x + 2)} ${f1(y - hh / 2)} ${f1(x + 1)} ${f1(y - hh)}" stroke="#4E7A38" stroke-width="1.2" fill="none"/><rect x="${f1(x - 0.4)}" y="${f1(y - hh - 1)}" width="2.6" height="6" rx="1.3" fill="#7A5232"/><path d="M${f1(x)} ${f1(y)}q-5 -8 -7 -14" stroke="#5E8A42" stroke-width="1" fill="none"/></g>`;
    }
    const cols = [['#FFFFFF', '#FFFFFF'], ['#FFC93C', '#FFF0A8'], ['#B064E8', '#E0B8FF'], ['#FF8A9A', '#FFD0D8']];
    for (let i = 0; i < n(8); i++) art += flowerBush(w * (0.35 + plRnd(i, 86) * 0.6), gy + 6 + plRnd(i, 87) * (h - gy - 8), 2.4 + plRnd(i, 88) * 1.2, ...cols[i % cols.length], i + 89);
    art += birdsWhite(w, 3, 120);
    if (tod === 'night') glow += `<g clip-path="url(#${D.id('auclip')})">${aurora(w, 2, D)}</g><clipPath id="${D.id('auclip')}"><rect width="${w}" height="${f1(lake - 50)}"/></clipPath>`;
    glow += motes(w, h * 0.95, dusk ? n(36) : n(8), 121, dusk ? '#F4F07A' : '#FFFFFF');
    if (dusk) glow += Array.from({ length: n(14) }, (_, i) => `<circle class="pl-glow" cx="${f1(plRnd(i, 125) * w)}" cy="${f1(lake + 6 + plRnd(i, 126) * (gy - lake))}" r="1.2" fill="#F4F07A" opacity=".5" style="animation-delay:-${f1(plRnd(i, 127) * 3)}s"/>`).join('');
  }
  const wash = WASH[tod];
  if (wash) art += `<rect width="${w}" height="${h}" fill="${D.lin('wash', [[0, ...wash[0]], [0.55, ...wash[1]], [1, ...wash[2]]])}"/>`;
  if (tod === 'night') {
    art += Array.from({ length: Math.round(40 * w / 400) }, (_, i) => `<circle class="pl-twinkle" cx="${f1(plRnd(i, 140) * w)}" cy="${f1(plRnd(i, 141) * h * 0.45)}" r="${f1(0.35 + plRnd(i, 142) * 0.8)}" fill="#fff" style="animation-delay:-${f1(plRnd(i, 143) * 3)}s"/>`).join('')
      + `<circle cx="${f1(w * 0.86)}" cy="22" r="20" fill="${D.rad('pmg', [[0, '#F6F1C7', 0.3], [1, '#F6F1C7', 0]])}"/><circle cx="${f1(w * 0.86)}" cy="22" r="8.5" fill="#F6F1C7"/><circle cx="${f1(w * 0.86 - 2)}" cy="20" r="2" fill="#E2DCB0"/>`;
  }
  return { art, glow };
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
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${homeScale(stage)})">${homeShape(place, stage, lit, D, tod)}</g>`;
}
function homeShape(place, stage, lit, D, tod) {
  const [wall, wall2, roof, roof2] = (HOME_COL[place] || HOME_COL.fireflies).map((c) => shade(c, tod === 'night' ? 'evening' : tod));
  const glow = lit ? `<circle class="pl-glow" cx="0" cy="-18" r="26" fill="${D.rad('hg', [[0, '#FFD983', 0.55], [1, '#FFD983', 0]])}"/>` : '';
  const shadow = `<ellipse cx="0" cy="1" rx="${stage <= 1 ? 11 : stage <= 3 ? 16 : 32}" ry="2.6" fill="#000" opacity=".18"/>`;
  if (stage <= 1) {                                                   // a little glass jar: cork, twine bow, a leaf, a glow inside
    return `${shadow}${glow}`
      + `<path d="M-8 -22Q-11 -21 -11 -16V-5Q-11 0 -6 0H6Q11 0 11 -5V-16Q11 -21 8 -22Z" fill="${D.lin('jar', [[0, '#FFFFFF', 0.5], [0.35, '#DDF1FF', 0.16], [0.75, '#DDF1FF', 0.1], [1, '#FFFFFF', 0.42]], 1, 0)}" stroke="rgba(255,255,255,.9)" stroke-width=".9"/>`
      + `<ellipse cx="0" cy="-1.8" rx="8.6" ry="1.6" fill="#FFFFFF" opacity=".35"/>`
      + `<circle cx="0" cy="-10" r="${lit ? 7 : 4.5}" fill="${D.rad('jl', [[0, '#FFFBD0'], [0.4, '#F4E84E', 0.7], [1, '#F4E84E', 0]])}" class="pl-glow"/>`
      + `<circle cx="-2.5" cy="-12" r=".8" fill="#FFF6B0"/><circle cx="2.8" cy="-7" r=".7" fill="#FFF6B0"/><circle cx="1" cy="-14.5" r=".6" fill="#FFF6B0"/>`
      + `<path d="M-8.6 -22.4Q0 -24.4 8.6 -22.4V-20.6Q0 -22.6 -8.6 -20.6Z" fill="#FFFFFF" opacity=".75"/>`
      + `<path d="M-6.2 -28.5Q-6.6 -23 -5.8 -22.6H5.8Q6.6 -23 6.2 -28.5Q0 -30 -6.2 -28.5Z" fill="${D.lin('cork', [[0, '#D9AE78'], [1, '#9C7038']])}"/><path d="M-4 -27.5v4M0 -28v4.4M4 -27.5v4" stroke="#8A6030" stroke-width=".5" opacity=".6"/>`
      + `<path d="M-8.4 -21.2Q0 -19.4 8.4 -21.2" stroke="#C49A6C" stroke-width="1.4" fill="none"/><path d="M5 -20.4q4 -1.6 3.6 1.8q-2.4 .4 -3.6 -1.8zM5 -20.4q2.6 2.6 .6 4.4q-1.6 -1.6 -.6 -4.4z" fill="#C49A6C"/>`
      + `<path d="M-5 -28.6q-3.6 -4.2 -.4 -6.4q2.4 2.6 .4 6.4z" fill="#6FB050"/><path d="M-5 -28.6q-1.2 -3 -.6 -5.4" stroke="#3E7A32" stroke-width=".5" fill="none"/>`
      + `<path d="M-8 -17V-5.5" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" opacity=".8"/><path d="M-5.4 -17.5V-14" stroke="#FFFFFF" stroke-width="1" stroke-linecap="round" opacity=".6"/>`;
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
const homeScale = (stage) => (stage <= 1 ? 1 : stage <= 3 ? 1.1 : 1.25);
const homeTop = (stage) => homeScale(stage) * (stage <= 1 ? 34 : stage <= 3 ? 47 : 50);

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
.pl-paddle{animation:plPaddle 30s ease-in-out infinite}@keyframes plPaddle{50%{transform:translateX(-40px)}}
.pl-hopsmall{animation:plHopS 6s ease-in-out infinite}@keyframes plHopS{0%,80%,100%{transform:translate(0,0)}85%{transform:translate(3px,-4px)}90%{transform:translate(6px,0)}}
.pl-blink{animation:plBlink 5s infinite;transform-box:fill-box;transform-origin:center}@keyframes plBlink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
.pl-aurora{animation:plAur 9s ease-in-out infinite}@keyframes plAur{50%{opacity:.6;transform:translateX(-12px)}}
.pl-swing{animation:plSwing 4s ease-in-out infinite}@keyframes plSwing{0%,100%{transform:rotate(6deg)}50%{transform:rotate(-6deg)}}
.pl-zzz{animation:plZzz 3s ease-in-out infinite}@keyframes plZzz{0%{opacity:0;transform:translate(0,4px)}40%{opacity:1}100%{opacity:0;transform:translate(8px,-12px)}}
.still .pl-sway,.still .pl-glow,.still .pl-twinkle,.still .pl-swim,.still .pl-bubble,.still .pl-ray,.still .pl-drift,.still .pl-bob,.still .pl-glide,.still .pl-flutter,.still .pl-wing,.still .pl-petal,.still .pl-leaf,.still .pl-rain,.still .pl-snow,.still .pl-flash,.still .pl-shoot,.still .pl-smoke,.still .pl-fly,.still .pl-hop,.still .pl-zzz,.still .pl-paddle,.still .pl-hopsmall,.still .pl-blink,.still .pl-aurora,.still .pl-swing{animation:none}
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
  let sky, land, glow = '';
  if (PAINTED.includes(place)) { const p = paintedPlace(place, opt, D); sky = ''; land = p.art; glow = p.glow; }
  else { sky = placeSky(place, opt, D); land = placeLand(place, opt, D); }
  const weather = placeWeather(place, o.weather, opt);
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
    + PLACE_CSS + D.html() + sky + land + weather + glow
    + (tod === 'night' && stage <= 3 ? lumi + home : home + lumi)
    + '</svg>';
}
// </places>

// ---------------------------------------------------------------- styles
export const className = `
  top: 40px; right: 40px; width: 320px;     /* place on the desktop: change these numbers to move the widget */
  font-family: -apple-system, "SF Pro Rounded", "SF Pro Text", Inter, sans-serif; color: #fff;
  -webkit-font-smoothing: antialiased;
  /* glass: a light see-through layer, a bright rim, a soft shine and a shadow under it */
  .card { position: relative; cursor: pointer; overflow: hidden; border-radius: 28px; padding: 9px;
          background: linear-gradient(150deg, rgba(255,255,255,.34) 0%, rgba(255,255,255,.14) 45%, rgba(255,255,255,.08) 100%);
          backdrop-filter: blur(30px) saturate(170%); -webkit-backdrop-filter: blur(30px) saturate(170%);
          border: 1px solid rgba(255,255,255,.5);
          box-shadow: 0 18px 40px rgba(10,30,60,.28), 0 2px 6px rgba(10,30,60,.18), inset 0 1px 0 rgba(255,255,255,.75), inset 0 -1px 1px rgba(255,255,255,.25);
          transition: transform .2s ease, box-shadow .2s ease; }
  .card:before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
          background: radial-gradient(120% 60% at 10% 0%, rgba(255,255,255,.45), rgba(255,255,255,0) 55%),
                      radial-gradient(80% 50% at 100% 100%, rgba(140,200,255,.18), rgba(140,200,255,0) 60%); }
  .card:hover { transform: translateY(-2px) scale(1.015); box-shadow: 0 24px 50px rgba(10,30,60,.32), 0 2px 6px rgba(10,30,60,.18), inset 0 1px 0 rgba(255,255,255,.8); }
  .world { position: relative; height: 150px; border-radius: 20px; overflow: hidden;
           box-shadow: inset 0 0 0 1px rgba(255,255,255,.45), 0 6px 16px rgba(10,30,60,.18); }
  .world > * { position: absolute; }
  .world .shine { inset: 0; z-index: 4; pointer-events: none; border-radius: inherit;
           background: linear-gradient(170deg, rgba(255,255,255,.38) 0%, rgba(255,255,255,.08) 28%, rgba(255,255,255,0) 45%); }
  .info { position: relative; padding: 11px 7px 3px; text-shadow: 0 1px 2px rgba(0,20,50,.28); }
  .muted { color: rgba(255,255,255,.82); font-size: 12px; }
  .status { font-size: 14px; font-weight: 700; letter-spacing: .1px; }
  .glass { background: rgba(255,255,255,.18); border: 1px solid rgba(255,255,255,.35); border-radius: 16px;
           box-shadow: inset 0 1px 0 rgba(255,255,255,.45); }
  .dream { padding: 9px 11px 8px; margin-top: 10px; }
  .bar { height: 9px; border-radius: 99px; background: rgba(255,255,255,.25); overflow: hidden; margin: 7px 0 1px;
         box-shadow: inset 0 1px 2px rgba(0,20,50,.2); }
  .bar i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #FFE27A, #FFB347 60%, #FF8F5A);
           box-shadow: 0 0 10px rgba(255,200,90,.8), inset 0 1px 0 rgba(255,255,255,.6); }
  .row { display: flex; align-items: center; gap: 8px; }
  .chips { display: flex; gap: 6px; margin-top: 8px; }
  .chip { flex: 1; text-align: center; font-size: 12px; font-weight: 600; padding: 6px 0; border-radius: 12px; }
  .live { position: relative; background: rgba(76,201,176,.35); border: 1px solid rgba(255,255,255,.4); border-radius: 12px; padding: 5px 10px; font-size: 12px; margin-bottom: 8px; }
  .err { font-size: 12px; color: #FFE1D6; }
  .temp { right: 9px; top: 8px; z-index: 5; font-size: 12px; font-weight: 700; padding: 4px 9px; border-radius: 99px; color: #fff;
          background: rgba(255,255,255,.28); border: 1px solid rgba(255,255,255,.5); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          text-shadow: 0 1px 2px rgba(0,20,50,.35); }
  .zzz { font-weight: 700; color: #DDE6FF; }
`;

const ANIM = `<style>
.w-scene{position:absolute;inset:0}.w-scene svg{width:100%;height:100%;display:block}
.w-lumi .w-wing{transform-box:fill-box}
.w-lumi .w-wing.l{transform-origin:right center;animation:wwl .25s ease-in-out infinite alternate}
.w-lumi .w-wing.r{transform-origin:left center;animation:wwr .25s ease-in-out infinite alternate}
.w-lumi.sleep .w-wing,.w-lumi.cosy .w-wing{animation-duration:1.6s}
@keyframes wwl{from{transform:rotate(-22deg)}to{transform:rotate(-4deg)}}@keyframes wwr{from{transform:rotate(22deg)}to{transform:rotate(4deg)}}
.w-lumi .w-glow{animation:wgl 3s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes wgl{50%{opacity:.7;transform:scale(.92)}}
.w-lumi .w-blink{animation:wbl 5s infinite;transform-box:fill-box;transform-origin:center}@keyframes wbl{0%,94%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}
.w-lumi .w-yawn{animation:wyw 3s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes wyw{50%{transform:scaleY(1.5)}}
.w-lumi .w-float{animation:wfo 2.6s ease-in-out infinite}@keyframes wfo{50%{transform:translateY(-4px)}}
.w-lumi .w-spin{animation:wsp 14s linear infinite;transform-box:fill-box;transform-origin:center}@keyframes wsp{to{transform:rotate(360deg)}}
</style>`;

// Words used when the summary comes from an older Lumen (it sends its own words in your language).
const DEFAULT_LABELS = {
  studying: "Studying now", morning: "Lumi is waking up", day: "Lumi is flying around", evening: "Lumi is getting cosy", night: "Lumi is sleeping",
  happy: "Happy: you studied today! ✨", missing: "Lumi misses you. A short lesson? 🌙", waiting: "Waiting for today's lesson",
  night_missing: "Lumi misses you. See you tomorrow! 🌙", night_waiting: "Sleep well! See you tomorrow 🌙",
  dream: "My dream", dream_ready: "All stars collected! 🎉", no_dream: "Write your dream on the Lumi page 🎁",
  sunny: "Sunny", clear: "Clear", cloudy: "Cloudy", rain: "Rain", snow: "Snow", fog: "Fog", storm: "Storm",
  update: "Open Lumen once to update the widget",
};

const today = () => { const d = new Date(), p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const fmt = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`);
const WEATHER_ICON = { clear: { day: "☀️", night: "🌙" }, partly: { day: "⛅", night: "☁️" }, cloudy: "☁️", rain: "🌧️", snow: "🌨️", fog: "🌫️", storm: "⛈️" };

export const render = ({ output, error }) => {
  const text = String(output || "");
  const nl = text.indexOf("\n");
  const w = readWeather(nl >= 0 ? text.slice(0, nl) : "");
  let s = null;
  try { s = JSON.parse(nl >= 0 ? text.slice(nl + 1) : text); } catch (e) { /* not JSON */ }
  if (error || !s || s.error) {
    return <div className="card" onClick={() => run(OPEN_LUMEN)}><b>Lumen</b><div className="err">{(s && s.error) || "No connection to Lumen yet. Check the URL and key at the top of index.jsx."}</div></div>;
  }
  const L = { ...DEFAULT_LABELS, ...(s.labels || {}) };
  const old = !s.v || s.v < 2;                        // made by an older Lumen: no dream yet
  const now = new Date();
  const fresh = s.day === today();                    // yesterday's numbers don't count for today
  const tod = timeOfDay(now, w);
  const season = seasonOf(now);
  const holiday = holidayOf(now, s.birthday);
  const studiedToday = fresh && (s.lessons > 0 || (s.study_min || 0) > 0);
  const last = s.last_lesson_at ? s.last_lesson_at * 1000 : null;
  const mood = studiedToday ? "happy" : last && now - last > 2 * 86400000 ? "missing" : "waiting";
  const state = { morning: "wake", day: "fly", evening: "cosy", night: "sleep" }[tod];
  const d = s.dream;
  const lumi = lumiSVG({
    state, mood, extra: holiday && holiday.extra,
    hat: d && d.level >= 2 ? d.look : null, dreamEmoji: d && d.level >= 1 ? d.emoji : null, gold: d && d.level >= 3,
    cold: season === "winter" || (w && w.kind === "snow"),
  });
  const icon = w ? (typeof WEATHER_ICON[w.kind] === "string" ? WEATHER_ICON[w.kind] : WEATHER_ICON[w.kind][tod === "night" ? "night" : "day"]) : null;
  const weatherWord = w ? L[w.kind === "partly" ? "cloudy" : w.kind === "clear" ? (tod === "night" ? "clear" : "sunny") : w.kind] || "" : "";
  const holidayLine = holiday && s.holidays ? s.holidays[holiday.id] : null;
  const g = s.goal ? (fresh ? s.goal : { ...s.goal, today: 0, pct: 0 }) : null;
  return (
    <div className="card" onClick={() => run(OPEN_LUMEN)} title="Open Lumen">
      <div dangerouslySetInnerHTML={{ __html: ANIM }} />
      {fresh && s.active && <div className="live">● {L.studying} · {s.active.cls} · {s.active.attention}%</div>}
      <div className="world">
        <div className="w-scene" dangerouslySetInnerHTML={{ __html: placeScene({ place: s.place || "fireflies", tod, stage: s.stage_index ?? 2,
          season, weather: w && w.kind, lumi, w: 350, h: 160, id: "w" }) }} />
        <div className="shine" />
        {w && <div className="temp">{icon} {w.temp} {weatherWord}</div>}
      </div>
      <div className="info">
        <div className="status">{L[tod]}</div>
        <div className="muted">{(tod === "night" && mood !== "happy" && L[`night_${mood}`]) || L[mood]}</div>
        {holidayLine && <div className="muted" style={{ marginTop: 2 }}>{holidayLine}</div>}
        {d ? (<div className="glass dream">
          <div className="row"><span style={{ fontSize: 24 }}>{d.emoji}</span>
            <span style={{ flex: 1, minWidth: 0 }}><div className="muted" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".5px" }}>{L.dream}</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.text}</div></span>
            <b style={{ fontSize: 13 }}>⭐ {d.earned}/{d.need}</b></div>
          <div className="bar"><i style={{ width: `${d.pct}%` }} /></div>
          {d.ready && <div className="muted">{L.dream_ready}</div>}
        </div>) : <div className="glass dream muted">{old ? L.update : L.no_dream}</div>}
        {SIZE === "large" && g && (<div className="chips">
          <span className="chip glass">🎯 {fmt(g.today)}</span><span className="chip glass">🔥 {g.streak}</span>
          <span className="chip glass">🔆 {s.lumi.light}</span><span className="chip glass">⭐ {(s.stars && s.stars.total) || 0}</span>
        </div>)}
      </div>
    </div>
  );
};
