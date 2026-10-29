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
// places.js: where Lumi lives. One drawing for each place (meadow, space, ocean, forest, sky, garden,
// city), used in three spots: the Lumi page (big, with Lumi's home), the page background (only the land,
// soft) and the Mac widget (a copy of this file is put into desktop-widget/lumen.widget/index.jsx by
// `npm run widget`). So this file is plain JavaScript that only builds SVG text: no page, no DOM.
//
// The picture follows the real time of day (morning, day, evening, night), the season, the weather,
// and how big Lumi is: Lumi's home is a glass jar, then a lantern, then a little house.

const PLACES = [
  ['fireflies', 'Meadow', '🌌'], ['forest', 'Forest', '🌲'], ['blossom', 'Garden', '🌸'], ['ocean', 'Ocean', '🐠'],
  ['city', 'City', '🏙️'], ['clouds', 'Sky', '🎈'], ['space', 'Space', '✨'],
];
const OUTDOOR = ['fireflies', 'forest', 'blossom', 'city', 'clouds'];

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

// sky colours: [top, bottom] for each place and time
const SKY_COL = {
  morning: ['#FFC9A0', '#AFDCFF'], day: ['#5DB7FF', '#CDEBFF'], evening: ['#FF8F6B', '#6A5AAE'], night: ['#0A1330', '#2B3A78'],
};
function skyColors(place, tod) {
  if (place === 'space') return ['#05030F', '#1C1145'];
  if (place === 'ocean') return { morning: ['#2E8FC8', '#0B3E6B'], day: ['#3AA6E0', '#0C4A80'], evening: ['#2C6A9E', '#0A2F55'], night: ['#0B2546', '#030C1C'] }[tod];
  if (place === 'fireflies' && tod === 'day') return ['#7CC4FF', '#E2F3FF'];
  return SKY_COL[tod];
}

// ---------------------------------------------------------------- small drawings
const pine = (x, y, h, c, snow) => `<path d="M${f1(x)} ${f1(y - h)}L${f1(x - h * 0.32)} ${f1(y - h * 0.35)}L${f1(x - h * 0.18)} ${f1(y - h * 0.38)}L${f1(x - h * 0.4)} ${f1(y)}L${f1(x + h * 0.4)} ${f1(y)}L${f1(x + h * 0.18)} ${f1(y - h * 0.38)}L${f1(x + h * 0.32)} ${f1(y - h * 0.35)}Z" fill="${c}"/>`
  + (snow ? `<path d="M${f1(x)} ${f1(y - h)}L${f1(x - h * 0.14)} ${f1(y - h * 0.7)}L${f1(x + h * 0.14)} ${f1(y - h * 0.7)}Z" fill="#F4F8FF"/>` : '');
const roundTree = (x, y, h, leaf, trunk = '#6B4A2E') => `<rect x="${f1(x - h * 0.05)}" y="${f1(y - h * 0.45)}" width="${f1(h * 0.1)}" height="${f1(h * 0.45)}" fill="${trunk}"/>`
  + `<circle cx="${f1(x)}" cy="${f1(y - h * 0.62)}" r="${f1(h * 0.3)}" fill="${leaf}"/><circle cx="${f1(x - h * 0.2)}" cy="${f1(y - h * 0.5)}" r="${f1(h * 0.22)}" fill="${leaf}"/><circle cx="${f1(x + h * 0.2)}" cy="${f1(y - h * 0.5)}" r="${f1(h * 0.22)}" fill="${leaf}"/>`;
const flower = (x, y, s, c, k) => `<g class="pl-sway" style="animation-delay:-${f1(plRnd(k, 9) * 4)}s;transform-origin:${f1(x)}px ${f1(y)}px"><path d="M${f1(x)} ${f1(y)}V${f1(y - s * 2.2)}" stroke="#3E8E41" stroke-width="${f1(s * 0.25)}"/>`
  + [0, 72, 144, 216, 288].map((a) => `<ellipse cx="${f1(x)}" cy="${f1(y - s * 2.2 - s * 0.55)}" rx="${f1(s * 0.38)}" ry="${f1(s * 0.6)}" fill="${c}" transform="rotate(${a} ${f1(x)} ${f1(y - s * 2.2)})"/>`).join('')
  + `<circle cx="${f1(x)}" cy="${f1(y - s * 2.2)}" r="${f1(s * 0.35)}" fill="#FFD84A"/></g>`;
const tulip = (x, y, s, c, k) => `<g class="pl-sway" style="animation-delay:-${f1(plRnd(k, 8) * 4)}s;transform-origin:${f1(x)}px ${f1(y)}px"><path d="M${f1(x)} ${f1(y)}V${f1(y - s * 2.4)}" stroke="#3E8E41" stroke-width="${f1(s * 0.25)}"/>`
  + `<path d="M${f1(x - s * 0.6)} ${f1(y - s * 2.9)}Q${f1(x - s * 0.6)} ${f1(y - s * 2.1)} ${f1(x)} ${f1(y - s * 2.1)}Q${f1(x + s * 0.6)} ${f1(y - s * 2.1)} ${f1(x + s * 0.6)} ${f1(y - s * 2.9)}L${f1(x + s * 0.3)} ${f1(y - s * 2.6)}L${f1(x)} ${f1(y - s * 3)}L${f1(x - s * 0.3)} ${f1(y - s * 2.6)}Z" fill="${c}"/></g>`;
const cloudShape = (x, y, s, c = '#fff', o = 0.95) => `<g opacity="${o}" fill="${c}"><ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(s * 1.6)}" ry="${f1(s * 0.5)}"/><circle cx="${f1(x - s * 0.6)}" cy="${f1(y - s * 0.25)}" r="${f1(s * 0.5)}"/><circle cx="${f1(x + s * 0.1)}" cy="${f1(y - s * 0.5)}" r="${f1(s * 0.7)}"/><circle cx="${f1(x + s * 0.8)}" cy="${f1(y - s * 0.2)}" r="${f1(s * 0.45)}"/></g>`;
const fish = (x, y, s, c, k) => `<g class="pl-swim" style="animation-duration:${f1(14 + plRnd(k, 3) * 12)}s;animation-delay:-${f1(plRnd(k, 4) * 20)}s"><g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s)})"><ellipse rx="7" ry="4" fill="${c}"/><path d="M6 0L11 -4L11 4Z" fill="${c}"/><circle cx="-4" cy="-1" r="1" fill="#1A1A2E"/></g></g>`;
const balloon = (x, y, s, a, b, k) => `<g class="pl-bob" style="animation-delay:-${f1(plRnd(k, 5) * 5)}s"><g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s)})"><path d="M0 -14C-9 -14 -12 -7 -12 -2C-12 5 -5 9 -2 13H2C5 9 12 5 12 -2C12 -7 9 -14 0 -14Z" fill="${a}"/><path d="M0 -14C-4 -14 -5 -6 -5 -2C-5 5 -2 9 -1 13H1C2 9 5 5 5 -2C5 -6 4 -14 0 -14Z" fill="${b}"/><path d="M-2 13L-2 18M2 13L2 18" stroke="#5B4636" stroke-width=".6"/><rect x="-3" y="18" width="6" height="4" rx="1" fill="#9A6B3F"/></g></g>`;
const building = (x, w, h, gy, c, lit, k) => {
  let win = '';
  for (let yy = gy - h + 6; yy < gy - 6; yy += 8) for (let xx = x + 4; xx < x + w - 5; xx += 7) {
    const on = lit && plRnd(k * 31 + xx, yy) > 0.45;
    win += `<rect x="${f1(xx)}" y="${f1(yy)}" width="3.5" height="4" fill="${on ? '#FFD983' : 'rgba(255,255,255,.12)'}"/>`;
  }
  return `<rect x="${f1(x)}" y="${f1(gy - h)}" width="${f1(w)}" height="${f1(h)}" fill="${c}"/>${win}`;
};

// ---------------------------------------------------------------- the land of each place (no sky)
/**
 * @param {string} place  one of PLACES
 * @param {{w:number,h:number,tod:string,season:string,gy?:number,soft?:boolean}} o  gy = ground line
 */
function placeLand(place, o) {
  const { w, h, tod, season } = o;
  const gy = o.gy ?? h * 0.8;
  const n = (base) => Math.max(1, Math.round(base * w / 400));      // more things on a wider picture
  const night = tod === 'night' || tod === 'evening';
  const winter = season === 'winter', autumn = season === 'autumn';
  let s = '';
  if (place === 'forest') {
    const far = winter ? '#9FB2C2' : night ? '#1E3A33' : '#4E8A6A', mid = winter ? '#6F8C83' : night ? '#173027' : '#2F6B4A', near = night ? '#10241C' : '#1F5236';
    for (let i = 0; i < n(14); i++) s += pine(i * w / n(14) + plRnd(i, 1) * 20, gy - 10, 30 + plRnd(i, 2) * 20, far, winter);
    s += `<rect y="${f1(gy - 12)}" width="${w}" height="${f1(h)}" fill="${far}"/>`;
    for (let i = 0; i < n(9); i++) {
      const x = i * w / n(9) + plRnd(i, 3) * 30;
      s += autumn && i % 2 ? roundTree(x, gy - 2, 48 + plRnd(i, 4) * 18, ['#E8913A', '#D9622B', '#F2B544'][i % 3], '#5A3B22') : pine(x, gy - 2, 44 + plRnd(i, 4) * 22, mid, winter);
    }
    s += `<path d="M0 ${f1(gy - 4)}Q${f1(w * 0.3)} ${f1(gy - 12)} ${f1(w * 0.55)} ${f1(gy - 5)}T${w} ${f1(gy - 6)}V${h}H0Z" fill="${winter ? '#EEF4FB' : night ? '#13281E' : '#3D7A3F'}"/>`;
    s += pine(w * 0.06, gy + 4, 78, near, winter) + pine(w * 0.94, gy + 4, 84, near, winter);
    for (let i = 0; i < n(4); i++) {                                  // mushrooms
      const x = w * (0.18 + plRnd(i, 5) * 0.4), y = gy + 2 + plRnd(i, 6) * 8;
      s += `<rect x="${f1(x - 1)}" y="${f1(y - 5)}" width="2" height="5" fill="#F3E9D2"/><path d="M${f1(x - 4)} ${f1(y - 5)}Q${f1(x)} ${f1(y - 11)} ${f1(x + 4)} ${f1(y - 5)}Z" fill="#E5484D"/><circle cx="${f1(x - 1)}" cy="${f1(y - 7)}" r=".8" fill="#fff"/>`;
    }
    if (night) for (let i = 0; i < n(10); i++) s += `<circle class="pl-glow" cx="${f1(plRnd(i, 7) * w)}" cy="${f1(gy - 10 - plRnd(i, 8) * 50)}" r="1.6" fill="#C8F27A" style="animation-delay:-${f1(plRnd(i, 9) * 3)}s"/>`;
  } else if (place === 'blossom') {
    s += `<path d="M0 ${f1(gy - 14)}Q${f1(w * 0.25)} ${f1(gy - 30)} ${f1(w * 0.5)} ${f1(gy - 16)}T${w} ${f1(gy - 20)}V${h}H0Z" fill="${night ? '#2E5A3A' : '#8FD27A'}"/>`;
    // cherry trees
    for (const [x, sc] of [[w * 0.12, 1], [w * 0.88, 0.85]]) {
      s += `<path d="M${f1(x)} ${f1(gy)}C${f1(x - 2)} ${f1(gy - 30 * sc)} ${f1(x + 4)} ${f1(gy - 40 * sc)} ${f1(x)} ${f1(gy - 55 * sc)}" stroke="#6B4A3A" stroke-width="${f1(5 * sc)}" fill="none"/>`;
      for (let i = 0; i < 9; i++) s += `<circle cx="${f1(x + (plRnd(i, x) - 0.5) * 56 * sc)}" cy="${f1(gy - 55 * sc + (plRnd(i, x + 1) - 0.5) * 30 * sc)}" r="${f1((10 + plRnd(i, x + 2) * 8) * sc)}" fill="${['#FFB7D0', '#FF9EC2', '#FFD1E1'][i % 3]}" opacity="${night ? 0.7 : 0.95}"/>`;
    }
    s += `<path d="M0 ${f1(gy - 2)}Q${f1(w * 0.5)} ${f1(gy - 10)} ${w} ${f1(gy - 2)}V${h}H0Z" fill="${night ? '#24492E' : '#6CC06A'}"/>`;
    // little fence
    for (let x = w * 0.28; x < w * 0.5; x += 7) s += `<rect x="${f1(x)}" y="${f1(gy - 13)}" width="3" height="12" rx="1" fill="#FFF6EA" opacity=".9"/>`;
    s += `<rect x="${f1(w * 0.28)}" y="${f1(gy - 10)}" width="${f1(w * 0.22)}" height="2" fill="#FFF6EA" opacity=".9"/>`;
    const cols = ['#FF6B9A', '#FFD84A', '#9B8CFF', '#FF8A5C', '#FFFFFF', '#5AA9FF'];
    for (let i = 0; i < n(26); i++) {
      const x = plRnd(i, 11) * w, y = gy + 2 + plRnd(i, 12) * (h - gy - 4);
      s += i % 3 ? flower(x, y, 3.6 + plRnd(i, 13) * 2, cols[i % cols.length], i) : tulip(x, y, 3.8 + plRnd(i, 13) * 1.8, cols[(i + 2) % cols.length], i);
    }
    if (!night) for (let i = 0; i < n(3); i++) s += `<g class="pl-flutter" style="animation-delay:-${f1(i * 2.7)}s"><text x="${f1(w * (0.3 + i * 0.2))}" y="${f1(gy - 40 - i * 8)}" font-size="9">🦋</text></g>`;
    for (let i = 0; i < n(8); i++) s += `<ellipse class="pl-petal" cx="${f1(plRnd(i, 14) * w)}" cy="-6" rx="2.2" ry="1.4" fill="#FFB7D0" style="animation-delay:-${f1(plRnd(i, 15) * 10)}s;animation-duration:${f1(8 + plRnd(i, 16) * 6)}s"/>`;
  } else if (place === 'ocean') {
    for (let i = 0; i < n(4); i++) s += `<path class="pl-ray" d="M${f1(w * (0.1 + i * 0.25))} 0L${f1(w * (0.05 + i * 0.25))} ${f1(gy)}L${f1(w * (0.16 + i * 0.25))} ${f1(gy)}L${f1(w * (0.15 + i * 0.25))} 0Z" fill="rgba(200,240,255,.10)" style="animation-delay:-${i * 2}s"/>`;
    s += `<path d="M0 ${f1(gy)}Q${f1(w * 0.3)} ${f1(gy - 8)} ${f1(w * 0.6)} ${f1(gy - 2)}T${w} ${f1(gy - 4)}V${h}H0Z" fill="${night ? '#5C5A4A' : '#E8D3A0'}"/>`;
    for (let i = 0; i < n(7); i++) {                                  // seaweed
      const x = plRnd(i, 21) * w, hh = 26 + plRnd(i, 22) * 34;
      s += `<path class="pl-sway" style="transform-origin:${f1(x)}px ${f1(gy)}px;animation-delay:-${f1(plRnd(i, 23) * 4)}s" d="M${f1(x)} ${f1(gy)}C${f1(x - 6)} ${f1(gy - hh * 0.3)} ${f1(x + 6)} ${f1(gy - hh * 0.6)} ${f1(x)} ${f1(gy - hh)}" stroke="${i % 2 ? '#2FA36B' : '#4CC98A'}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    }
    for (let i = 0; i < n(3); i++) {                                  // coral
      const x = w * (0.2 + i * 0.3) + plRnd(i, 24) * 20, c = ['#FF7A8A', '#FFA45B', '#C77DFF'][i % 3];
      s += `<path d="M${f1(x)} ${f1(gy)}V${f1(gy - 14)}M${f1(x)} ${f1(gy - 8)}L${f1(x - 6)} ${f1(gy - 16)}M${f1(x)} ${f1(gy - 10)}L${f1(x + 6)} ${f1(gy - 19)}M${f1(x - 6)} ${f1(gy - 16)}L${f1(x - 8)} ${f1(gy - 21)}" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;
    }
    s += `<text x="${f1(w * 0.42)}" y="${f1(gy + 8)}" font-size="9">⭐</text><ellipse cx="${f1(w * 0.84)}" cy="${f1(gy + 2)}" rx="12" ry="6" fill="#7C8794"/>`;
    for (let i = 0; i < n(5); i++) s += fish(plRnd(i, 25) * w, 18 + plRnd(i, 26) * (gy - 50), 0.7 + plRnd(i, 27) * 0.6, ['#FFB347', '#FF6B6B', '#5AD1FF', '#FFE066', '#B48CFF'][i % 5], i);
    for (let i = 0; i < n(10); i++) s += `<circle class="pl-bubble" cx="${f1(plRnd(i, 28) * w)}" cy="${f1(gy)}" r="${f1(1.2 + plRnd(i, 29) * 2)}" fill="none" stroke="rgba(220,245,255,.6)" stroke-width=".8" style="animation-delay:-${f1(plRnd(i, 30) * 8)}s;animation-duration:${f1(6 + plRnd(i, 31) * 6)}s"/>`;
  } else if (place === 'city') {
    const lit = night, far = night ? '#2A3358' : '#9DB2CC', near = night ? '#1B2140' : '#5F7593';
    let x = -10, k = 0;
    while (x < w) { const bw = 20 + plRnd(k, 41) * 26; s += building(x, bw, 40 + plRnd(k, 42) * 50, gy - 6, far, lit, k + 100); x += bw + 2; k += 1; }
    x = -6; k = 0;
    while (x < w) { const bw = 26 + plRnd(k, 43) * 30; s += building(x, bw, 24 + plRnd(k, 44) * 44, gy, near, lit, k); x += bw + 6; k += 1; }
    s += `<rect y="${f1(gy)}" width="${w}" height="${f1(h - gy)}" fill="${night ? '#22263A' : '#6E7480'}"/><rect y="${f1(gy)}" width="${w}" height="3" fill="${night ? '#3A3F57' : '#A7ADB8'}"/>`;
    for (let i = 0; i < n(3); i++) {                                  // street lamps
      const lx = w * (0.15 + i * 0.35);
      s += `<rect x="${f1(lx)}" y="${f1(gy - 30)}" width="2" height="30" fill="#2F3447"/><path d="M${f1(lx - 3)} ${f1(gy - 30)}h8l-2 -4h-4z" fill="#2F3447"/>`
        + (night ? `<circle class="pl-glow" cx="${f1(lx + 1)}" cy="${f1(gy - 28)}" r="7" fill="rgba(255,217,131,.35)"/><circle cx="${f1(lx + 1)}" cy="${f1(gy - 29)}" r="2" fill="#FFD983"/>` : '');
    }
    s += roundTree(w * 0.05, gy, 34, autumn ? '#E8913A' : winter ? '#C7D3DE' : '#3E8E41');
  } else if (place === 'clouds') {
    for (let i = 0; i < n(4); i++) s += `<g class="pl-drift" style="animation-duration:${f1(60 + plRnd(i, 51) * 40)}s;animation-delay:-${f1(plRnd(i, 52) * 60)}s">${cloudShape(plRnd(i, 53) * w, 20 + plRnd(i, 54) * 40, 10 + plRnd(i, 55) * 8, '#fff', night ? 0.35 : 0.85)}</g>`;
    s += balloon(w * 0.18, 44, 1.1, '#E8505B', '#FFD166', 1) + balloon(w * 0.82, 30, 0.8, '#3A86FF', '#F1F5FF', 2);
    if (!night) s += `<path d="M${f1(w * 0.55)} 30q3 -3 6 0q3 -3 6 0M${f1(w * 0.6)} 40q2 -2 4 0q2 -2 4 0" stroke="rgba(30,40,60,.6)" stroke-width="1" fill="none"/>`;
    // the big cloud Lumi's home stands on
    s += `<g fill="${night ? '#B9C4DD' : '#FFFFFF'}"><ellipse cx="${f1(w * 0.5)}" cy="${f1(gy + 14)}" rx="${f1(w * 0.62)}" ry="26"/>`
      + Array.from({ length: n(9) }, (_, i) => `<circle cx="${f1(i * w / (n(9) - 1))}" cy="${f1(gy + 2 + plRnd(i, 56) * 6)}" r="${f1(16 + plRnd(i, 57) * 12)}"/>`).join('') + '</g>';
  } else if (place === 'space') {
    s += `<circle cx="${f1(w * 0.82)}" cy="30" r="16" fill="#E9A15B"/><ellipse cx="${f1(w * 0.82)}" cy="30" rx="27" ry="6" fill="none" stroke="#F6D49A" stroke-width="2" transform="rotate(-18 ${f1(w * 0.82)} 30)"/>`;
    s += `<circle cx="${f1(w * 0.14)}" cy="26" r="7" fill="#9BB7FF"/><circle cx="${f1(w * 0.14 - 2)}" cy="24" r="2" fill="#7A97E8"/>`;
    s += `<path class="pl-shoot" d="M${f1(w * 0.3)} 18l26 8" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>`;
    // Lumi's own little planet
    s += `<ellipse cx="${f1(w * 0.5)}" cy="${f1(gy + h * 0.55)}" rx="${f1(w * 0.7)}" ry="${f1(h * 0.6)}" fill="#5B4B9E"/>`
      + `<ellipse cx="${f1(w * 0.5)}" cy="${f1(gy + h * 0.55)}" rx="${f1(w * 0.7)}" ry="${f1(h * 0.6)}" fill="none" stroke="#8D7FE0" stroke-width="2"/>`;
    for (let i = 0; i < n(5); i++) s += `<ellipse cx="${f1(w * (0.1 + plRnd(i, 61) * 0.8))}" cy="${f1(gy + 6 + plRnd(i, 62) * (h - gy - 8))}" rx="${f1(4 + plRnd(i, 63) * 5)}" ry="${f1(2 + plRnd(i, 64) * 2)}" fill="#4A3C86"/>`;
  } else {                                                             // fireflies: a meadow
    s += `<path d="M0 ${f1(gy - 16)}Q${f1(w * 0.35)} ${f1(gy - 30)} ${f1(w * 0.7)} ${f1(gy - 14)}T${w} ${f1(gy - 18)}V${h}H0Z" fill="${night ? '#1A3A2C' : '#7FBF6A'}"/>`;
    s += `<path d="M0 ${f1(gy - 2)}Q${f1(w * 0.5)} ${f1(gy - 10)} ${w} ${f1(gy - 2)}V${h}H0Z" fill="${night ? '#14301F' : '#5DA857'}"/>`;
    for (let i = 0; i < n(60); i++) {
      const x = plRnd(i, 71) * w, hh = 6 + plRnd(i, 72) * 12, y = gy + plRnd(i, 73) * (h - gy);
      s += `<path class="pl-sway" style="transform-origin:${f1(x)}px ${f1(y)}px;animation-delay:-${f1(plRnd(i, 74) * 4)}s" d="M${f1(x)} ${f1(y)}q${f1(-2 + plRnd(i, 75) * 4)} ${f1(-hh / 2)} ${f1(-1 + plRnd(i, 76) * 4)} ${f1(-hh)}" stroke="${night ? '#2A5A3C' : '#3E8E41'}" stroke-width="1.4" fill="none"/>`;
    }
    for (let i = 0; i < n(6); i++) s += `<circle cx="${f1(plRnd(i, 77) * w)}" cy="${f1(gy + 4 + plRnd(i, 78) * (h - gy - 6))}" r="2" fill="${night ? '#E8E8C8' : '#FFFFFF'}"/>`;
    const many = night ? n(26) : n(6);
    for (let i = 0; i < many; i++) s += `<circle class="pl-glow" cx="${f1(plRnd(i, 79) * w)}" cy="${f1(gy - 4 - plRnd(i, 80) * (gy * 0.6))}" r="${f1(1.4 + plRnd(i, 81))}" fill="#F4F07A" style="animation-delay:-${f1(plRnd(i, 82) * 3)}s"/>`;
  }
  if (winter && OUTDOOR.includes(place) && place !== 'clouds' && place !== 'forest') {
    s += `<path d="M0 ${f1(gy)}Q${f1(w * 0.5)} ${f1(gy - 5)} ${w} ${f1(gy)}V${f1(gy + 6)}H0Z" fill="#F4F8FF" opacity=".95"/>`;
  }
  if (autumn && ['fireflies', 'blossom', 'city'].includes(place)) {
    for (let i = 0; i < n(6); i++) s += `<text class="pl-leaf" x="${f1(plRnd(i, 91) * w)}" y="-6" font-size="7" style="animation-delay:-${f1(plRnd(i, 92) * 9)}s">${i % 2 ? '🍂' : '🍁'}</text>`;
  }
  return s;
}

// ---------------------------------------------------------------- sky
function placeSky(place, o) {
  const { w, h, tod } = o;
  const [a, b] = skyColors(place, tod);
  const id = `pls${o.id || ''}`;
  let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`
    + `<rect width="${w}" height="${h}" fill="url(#${id})"/>`;
  const night = tod === 'night';
  if (place === 'space' || (night && place !== 'ocean')) {
    for (let i = 0; i < Math.round(40 * w / 400); i++) s += `<circle class="pl-twinkle" cx="${f1(plRnd(i, 101) * w)}" cy="${f1(plRnd(i, 102) * h * 0.6)}" r="${f1(0.4 + plRnd(i, 103) * 0.9)}" fill="#fff" style="animation-delay:-${f1(plRnd(i, 104) * 3)}s"/>`;
  }
  if (place === 'space') {
    s += `<defs><radialGradient id="${id}n"><stop offset="0" stop-color="#C77DFF" stop-opacity=".28"/><stop offset="1" stop-color="#C77DFF" stop-opacity="0"/></radialGradient></defs>`
      + `<ellipse cx="${f1(w * 0.38)}" cy="${f1(h * 0.32)}" rx="${f1(w * 0.32)}" ry="${f1(h * 0.22)}" fill="url(#${id}n)"/>`;
  } else if (place === 'ocean') s += `<path d="M0 6Q${f1(w * 0.25)} 2 ${f1(w * 0.5)} 6T${w} 6" stroke="rgba(255,255,255,.35)" stroke-width="1.5" fill="none"/>`;
  else if (night) s += `<circle cx="${f1(w * 0.86)}" cy="22" r="10" fill="#F6F1C7"/><circle cx="${f1(w * 0.86 + 4)}" cy="19" r="9" fill="${a}"/>`;
  else {
    const sx = tod === 'morning' ? w * 0.14 : tod === 'evening' ? w * 0.84 : w * 0.78, sy = tod === 'day' ? 22 : 44;
    s += `<circle cx="${f1(sx)}" cy="${sy}" r="22" fill="#FFE9A0" opacity=".35"/><circle cx="${f1(sx)}" cy="${sy}" r="11" fill="${tod === 'evening' ? '#FFB36B' : '#FFE27A'}"/>`;
  }
  return s;
}

// ---------------------------------------------------------------- weather
function placeWeather(place, kind, o) {
  if (!kind || !OUTDOOR.includes(place)) return '';
  const { w, h } = o;
  let s = '';
  if (['cloudy', 'rain', 'snow', 'storm', 'fog'].includes(kind)) s += `<rect width="${w}" height="${h}" fill="rgba(90,100,125,.32)"/>`;
  if (kind !== 'clear') for (let i = 0; i < (kind === 'partly' ? 2 : 4); i++) s += `<g class="pl-drift" style="animation-duration:${f1(70 + plRnd(i, 111) * 40)}s;animation-delay:-${f1(plRnd(i, 112) * 70)}s">${cloudShape(plRnd(i, 113) * w, 14 + plRnd(i, 114) * 24, 12 + plRnd(i, 115) * 6, kind === 'partly' ? '#fff' : '#C9D0DC', 0.9)}</g>`;
  if (kind === 'rain' || kind === 'storm') for (let i = 0; i < Math.round(40 * w / 400); i++) s += `<path class="pl-rain" d="M${f1(plRnd(i, 116) * w)} -10l-2 10" stroke="rgba(210,230,255,.75)" stroke-width="1" style="animation-delay:-${f1(plRnd(i, 117))}s"/>`;
  if (kind === 'storm') s += `<rect class="pl-flash" width="${w}" height="${h}" fill="#fff" opacity="0"/>`;
  if (kind === 'snow') for (let i = 0; i < Math.round(30 * w / 400); i++) s += `<circle class="pl-snow" cx="${f1(plRnd(i, 118) * w)}" cy="-6" r="${f1(1 + plRnd(i, 119) * 1.4)}" fill="#fff" style="animation-delay:-${f1(plRnd(i, 120) * 7)}s;animation-duration:${f1(5 + plRnd(i, 121) * 5)}s"/>`;
  if (kind === 'fog') s += `<rect y="${f1(h * 0.35)}" width="${w}" height="${f1(h * 0.65)}" fill="rgba(235,240,248,.6)"/>`;
  return s;
}

// ---------------------------------------------------------------- Lumi's home
const HOME_COL = {
  forest: ['#8A5A35', '#3E7A4A'], blossom: ['#FFF4E8', '#F06BA8'], ocean: ['#F7D9C4', '#FF7A8A'], city: ['#C86B4A', '#4A5578'],
  clouds: ['#FFFFFF', '#5AA9FF'], space: ['#E6E9F5', '#8E5CF7'], fireflies: ['#E9D3A8', '#B5833F'],
};
/** The home grows with Lumi: a jar (stages 1-2), a lantern (3-4), a little house (5-6). lit = a warm window. */
function placeHome(place, stage, lit, x, y) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(1.25)">${homeShape(place, stage, lit)}</g>`;
}
function homeShape(place, stage, lit) {
  const x = 0, y = 0;
  const [wall, roof] = HOME_COL[place] || HOME_COL.fireflies;
  const glow = lit ? `<circle class="pl-glow" cx="0" cy="-16" r="18" fill="rgba(255,220,120,.35)"/>` : '';
  if (stage <= 1) {
    return `<g transform="translate(${f1(x)} ${f1(y)})">${glow}<rect x="-11" y="-30" width="22" height="30" rx="7" fill="rgba(220,240,255,.28)" stroke="rgba(255,255,255,.8)" stroke-width="1.4"/>`
      + `<rect x="-9" y="-35" width="18" height="6" rx="2" fill="${roof}"/><path d="M-9 -27q9 3 18 0" stroke="rgba(255,255,255,.6)" stroke-width="1" fill="none"/>`
      + `<rect x="-7" y="-25" width="2.5" height="18" rx="1.2" fill="rgba(255,255,255,.55)"/></g>`;
  }
  if (stage <= 3) {
    return `<g transform="translate(${f1(x)} ${f1(y)})">${glow}<path d="M-4 -46q4 -6 8 0" stroke="#3B3B4F" stroke-width="2" fill="none"/>`
      + `<path d="M-12 -38h24l-4 -6h-16z" fill="${roof}"/><rect x="-11" y="-38" width="22" height="32" rx="3" fill="${lit ? '#FFE08A' : '#FFF1C4'}" fill-opacity=".72" stroke="#3B3B4F" stroke-width="2"/>`
      + `<path d="M-3.5 -38v32M3.5 -38v32" stroke="#3B3B4F" stroke-width="1.4"/><rect x="-13" y="-7" width="26" height="7" rx="2" fill="${roof}"/></g>`;
  }
  const dome = place === 'space';
  return `<g transform="translate(${f1(x)} ${f1(y)})">${glow}`
    + (dome
      ? `<path d="M-26 0V-14A26 26 0 0 1 26 -14V0Z" fill="${wall}" stroke="#B9BFD6" stroke-width="1.5"/><path d="M0 -40v-10" stroke="#B9BFD6" stroke-width="2"/><circle cx="0" cy="-51" r="2.5" fill="#FF6B9A"/>`
      : `<rect x="20" y="-46" width="6" height="14" fill="#6B4A3A"/><rect x="-22" y="-28" width="44" height="28" rx="2" fill="${wall}"/><path d="M-28 -26L0 -48L28 -26Z" fill="${roof}"/>`)
    + `<rect x="-17" y="-16" width="10" height="16" rx="5" fill="${dome ? '#B9BFD6' : '#6B4A3A'}"/><circle cx="-9" cy="-8" r="1" fill="#FFD84A"/>`
    + `<circle cx="9" cy="-15" r="7" fill="${lit ? '#FFD983' : '#BFD9F2'}" stroke="${dome ? '#B9BFD6' : '#6B4A3A'}" stroke-width="2"/><path d="M2 -15h14M9 -22v14" stroke="${dome ? '#B9BFD6' : '#6B4A3A'}" stroke-width="1.2"/></g>`;
}
const PLACE_LUMI = 54;
const homeTop = (stage) => 1.25 * (stage <= 1 ? 32 : stage <= 3 ? 44 : 46);

// ---------------------------------------------------------------- animations (inside the SVG, so the widget gets them too)
const PLACE_CSS = `<style>
.pl-sway{animation:plSway 4s ease-in-out infinite}@keyframes plSway{50%{transform:rotate(5deg)}}
.pl-glow{animation:plGlow 3s ease-in-out infinite}@keyframes plGlow{50%{opacity:.35}}
.pl-twinkle{animation:plTw 3s ease-in-out infinite}@keyframes plTw{50%{opacity:.25}}
.pl-swim{animation:plSwim linear infinite}@keyframes plSwim{from{transform:translateX(110%)}to{transform:translateX(-110%)}}
.pl-bubble{animation:plBub linear infinite}@keyframes plBub{from{transform:translateY(0);opacity:.9}to{transform:translateY(-180px);opacity:0}}
.pl-ray{animation:plGlow 7s ease-in-out infinite}
.pl-drift{animation:plDrift linear infinite}@keyframes plDrift{from{transform:translateX(-30%)}to{transform:translateX(130%)}}
.pl-bob{animation:plBob 5s ease-in-out infinite}@keyframes plBob{50%{transform:translateY(-5px)}}
.pl-flutter{animation:plFl 9s ease-in-out infinite}@keyframes plFl{25%{transform:translate(30px,-12px)}50%{transform:translate(60px,4px)}75%{transform:translate(25px,10px)}}
.pl-petal,.pl-leaf{animation:plFall 10s linear infinite}@keyframes plFall{from{transform:translate(0,0) rotate(0)}to{transform:translate(18px,200px) rotate(360deg)}}
.pl-rain{animation:plRain .7s linear infinite}@keyframes plRain{to{transform:translate(-8px,200px)}}
.pl-snow{animation:plSnow linear infinite}@keyframes plSnow{to{transform:translate(12px,200px)}}
.pl-flash{animation:plFlash 7s infinite}@keyframes plFlash{0%,93%,97%,100%{opacity:0}94%,96%{opacity:.5}}
.pl-shoot{animation:plShoot 6s ease-in infinite;opacity:0}@keyframes plShoot{0%,80%{opacity:0;transform:translate(0,0)}85%{opacity:1}100%{opacity:0;transform:translate(60px,20px)}}
.pl-fly{animation:plFly 16s ease-in-out infinite}
@keyframes plFly{0%,100%{transform:translate(0,0)}25%{transform:translate(70px,-14px)}50%{transform:translate(140px,6px)}75%{transform:translate(60px,14px)}}
.pl-hop{animation:plBob 2.6s ease-in-out infinite}
.pl-zzz{animation:plZzz 3s ease-in-out infinite}@keyframes plZzz{0%{opacity:0;transform:translate(0,4px)}40%{opacity:1}100%{opacity:0;transform:translate(8px,-12px)}}
.still .pl-sway,.still .pl-glow,.still .pl-twinkle,.still .pl-swim,.still .pl-bubble,.still .pl-ray,.still .pl-drift,.still .pl-bob,.still .pl-flutter,.still .pl-petal,.still .pl-leaf,.still .pl-rain,.still .pl-snow,.still .pl-flash,.still .pl-shoot,.still .pl-fly,.still .pl-hop,.still .pl-zzz{animation:none}
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
  const w = o.w || 400, h = o.h || 160, gy = h * 0.8;
  const tod = o.tod || 'day', stage = o.stage || 0, season = o.season || 'summer';
  const lit = tod === 'evening' || tod === 'night';
  const hx = w * 0.66;
  const opt = { w, h, tod, season, gy, id: o.id || 'a' };
  // where Lumi is: flying around in the day, at the door in the morning and evening, inside at night
  const L = PLACE_LUMI;                                             // Lumi's size in the picture
  let lumi = '';
  if (o.lumi) {
    if (tod === 'day') lumi = `<g class="pl-fly"><g transform="translate(${f1(w * 0.12)} ${f1(gy - 88)})">${o.lumi}</g></g>`;
    else if (tod === 'night') {
      const s = stage <= 3 ? 0.5 : 0;                                // a house hides Lumi: only z z z
      lumi = (s ? `<g transform="translate(${f1(hx - L * s / 2)} ${f1(gy - homeTop(stage) * 0.55 - L * s / 2)}) scale(${s})">${o.lumi}</g>` : '')
        + `<text class="pl-zzz" x="${f1(hx + 14)}" y="${f1(gy - homeTop(stage) - 4)}" font-size="10" font-weight="700" fill="#DDE6FF">z z z</text>`;
    } else lumi = `<g class="pl-hop"><g transform="translate(${f1(hx - 52 - L / 2)} ${f1(gy - L + 6)})">${o.lumi}</g></g>`;
  }
  return `<svg class="place-svg place-${o.place}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMax slice" role="img" aria-label="${o.label || 'Lumi\'s home'}">`
    + PLACE_CSS + placeSky(o.place, opt) + placeLand(o.place, opt) + placeWeather(o.place, o.weather, opt)
    + (tod === 'night' && stage <= 3 ? lumi + placeHome(o.place, stage, lit, hx, gy) : placeHome(o.place, stage, lit, hx, gy) + lumi)
    + '</svg>';
}

/** Only the land, for the page background (no sky: the page has its own colours). */
function placeLandSVG(place, tod, season) {
  const w = 1440, h = 220;
  return `<svg class="place-land" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${PLACE_CSS}${placeLand(place, { w, h, tod, season, gy: h * 0.72 })}</svg>`;
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
