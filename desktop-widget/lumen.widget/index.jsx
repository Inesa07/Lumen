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
  return `<svg width="76" height="76" viewBox="0 0 120 120" class="w-lumi ${state}">
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

// ---------------------------------------------------------------- the little world around Lumi
const SKY = {
  morning: ["#FFD3A6", "#A9D8FF"], day: ["#6EC1FF", "#CFEBFF"], evening: ["#FF9A76", "#6C5BA8"], night: ["#0B1430", "#2A3770"],
};
const GROUND = { spring: "#7CCB6B", summer: "#4FA64A", autumn: "#D98B3A", winter: "#EAF2FF" };
const rnd = (i, m) => { const x = Math.sin(i * 127.1 + m * 311.7) * 43758.5453; return x - Math.floor(x); };

function sceneHTML({ tod, season, w, holiday }) {
  const [top, bottom] = SKY[tod];
  const grey = w && ["cloudy", "rain", "snow", "storm", "fog"].includes(w.kind);
  const night = tod === "night";
  let h = `<div class="w-sky" style="background:linear-gradient(180deg,${top},${bottom})"></div>`;
  if (grey) h += `<div class="w-grey"></div>`;
  if (night) h += Array.from({ length: 22 }, (_, i) => `<i class="w-star" style="left:${rnd(i, 1) * 100}%;top:${rnd(i, 2) * 55}%;animation-delay:${rnd(i, 3) * 3}s"></i>`).join("");
  if (!grey) h += night ? `<div class="w-moon"></div>` : `<div class="w-sun${tod === "evening" ? " low" : tod === "morning" ? " rise" : ""}"></div>`;
  const clouds = !w || w.kind === "clear" ? 1 : w.kind === "partly" ? 3 : 5;
  h += Array.from({ length: clouds }, (_, i) => `<div class="w-cloud${grey ? " dark" : ""}" style="top:${8 + rnd(i, 4) * 34}%;animation-duration:${40 + rnd(i, 5) * 40}s;animation-delay:-${rnd(i, 6) * 60}s;transform:scale(${0.7 + rnd(i, 7) * 0.6})"></div>`).join("");
  if (w && (w.kind === "rain" || w.kind === "storm")) h += Array.from({ length: 34 }, (_, i) => `<i class="w-drop" style="left:${rnd(i, 8) * 100}%;animation-delay:${rnd(i, 9)}s"></i>`).join("");
  if (w && w.kind === "storm") h += `<div class="w-flash"></div>`;
  const snowing = (w && w.kind === "snow") || (!w && season === "winter");
  if (snowing) h += Array.from({ length: 26 }, (_, i) => `<i class="w-flake" style="left:${rnd(i, 10) * 100}%;animation-delay:${rnd(i, 11) * 6}s;animation-duration:${5 + rnd(i, 12) * 5}s"></i>`).join("");
  if (w && w.kind === "fog") h += `<div class="w-fog"></div>`;
  // the season, falling or flying
  const bits = { autumn: ["🍂", "🍁"], spring: ["🌸"], summer: night || tod === "evening" ? [] : ["🦋"], winter: [] }[season];
  if (!(w && (w.kind === "rain" || w.kind === "storm"))) {
    h += bits.map((b, i) => [0, 1, 2].map((k) => `<span class="w-leaf${season === "summer" ? " fly" : ""}" style="left:${rnd(i * 3 + k, 13) * 90}%;animation-delay:-${rnd(i * 3 + k, 14) * 9}s">${b}</span>`).join("")).join("");
  }
  if (night || tod === "evening") h += Array.from({ length: 5 }, (_, i) => `<i class="w-firefly" style="left:${10 + rnd(i, 15) * 80}%;top:${45 + rnd(i, 16) * 35}%;animation-delay:-${rnd(i, 17) * 4}s"></i>`).join("");
  h += `<svg class="w-hill" viewBox="0 0 340 40" preserveAspectRatio="none"><path d="M0 40V22Q60 4 140 16T340 12V40z" fill="${GROUND[season]}"/><path d="M0 40V30Q90 18 200 28T340 26V40z" fill="${GROUND[season]}" opacity=".7" style="filter:brightness(.85)"/></svg>`;
  if (holiday && holiday.id === "newyear") h += `<span class="w-tree">🎄</span>`;
  return h;
}

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
.w-scene{position:absolute;inset:0}.w-scene>*{position:absolute}
.w-sky{inset:0}.w-grey{inset:0;background:linear-gradient(180deg,rgba(90,100,120,.55),rgba(140,150,170,.25))}
.w-star{position:absolute;width:2px;height:2px;border-radius:50%;background:#fff;animation:wtw 3s ease-in-out infinite}
@keyframes wtw{50%{opacity:.25}}
.w-sun{right:34px;top:16px;width:34px;height:34px;border-radius:50%;background:radial-gradient(#FFF6C2,#FFD34D);box-shadow:0 0 30px 10px rgba(255,214,90,.55)}
.w-sun.rise{top:58px;right:auto;left:30px}.w-sun.low{top:70px;background:radial-gradient(#FFE3A0,#FF8E4D);box-shadow:0 0 30px 12px rgba(255,140,80,.5)}
.w-moon{right:30px;top:14px;width:26px;height:26px;border-radius:50%;box-shadow:-7px 3px 0 0 #F6F1C7;transform:rotate(-20deg)}
.w-cloud{left:-90px;width:70px;height:22px;border-radius:20px;background:#fff;opacity:.9;animation:wcl linear infinite}
.w-cloud:before,.w-cloud:after{content:"";position:absolute;background:inherit;border-radius:50%}
.w-cloud:before{width:30px;height:30px;left:10px;top:-14px}.w-cloud:after{width:38px;height:38px;left:28px;top:-20px}
.w-cloud.dark{background:#B9C2D0}
@keyframes wcl{to{left:110%}}
.w-drop{position:absolute;top:-10px;width:1.5px;height:12px;background:rgba(200,225,255,.8);animation:wdr .7s linear infinite}
@keyframes wdr{to{transform:translateY(170px)}}
.w-flake{position:absolute;top:-8px;width:5px;height:5px;border-radius:50%;background:#fff;animation:wfl linear infinite}
@keyframes wfl{to{transform:translate(14px,165px)}}
.w-fog{left:0;right:0;bottom:0;height:70%;background:linear-gradient(0deg,rgba(235,240,248,.85),rgba(235,240,248,0))}
.w-flash{inset:0;background:#fff;opacity:0;animation:wfa 7s infinite}@keyframes wfa{0%,93%,97%,100%{opacity:0}94%,96%{opacity:.55}}
.w-leaf{position:absolute;top:-20px;font-size:13px;animation:wlf 9s linear infinite}
@keyframes wlf{0%{transform:translate(0,0) rotate(0)}50%{transform:translate(20px,85px) rotate(180deg)}100%{transform:translate(-6px,175px) rotate(360deg)}}
.w-leaf.fly{top:40%;animation:wbf 9s ease-in-out infinite}
@keyframes wbf{0%,100%{transform:translate(0,0)}25%{transform:translate(40px,-20px)}50%{transform:translate(80px,6px)}75%{transform:translate(30px,18px)}}
.w-firefly{position:absolute;width:4px;height:4px;border-radius:50%;background:#F4F38A;box-shadow:0 0 8px 3px rgba(244,243,138,.7);animation:wff 4s ease-in-out infinite}
@keyframes wff{0%,100%{transform:translate(0,0);opacity:.3}50%{transform:translate(12px,-10px);opacity:1}}
.w-hill{left:0;right:0;bottom:0;width:100%;height:34px}
.w-tree{right:24px;bottom:14px;font-size:30px}
.w-lumi-pos{z-index:2}
.w-lumi-pos.sleep{left:50%;bottom:4px;margin-left:-38px}
.w-lumi-pos.wake{left:40%;bottom:10px;animation:wwk 3s ease-in-out infinite}
@keyframes wwk{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-6px) scale(1.04,0.97)}}
.w-lumi-pos.fly{left:0;top:16px;animation:wfy 16s ease-in-out infinite}
@keyframes wfy{0%{transform:translate(20px,20px)}25%{transform:translate(120px,-6px) rotate(6deg)}50%{transform:translate(220px,26px)}75%{transform:translate(110px,40px) rotate(-6deg)}100%{transform:translate(20px,20px)}}
.w-lumi-pos.cosy{left:44%;top:46px;animation:wcs 5s ease-in-out infinite}
@keyframes wcs{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
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
.w-zzz{left:calc(50% + 26px);bottom:62px;z-index:3;font-size:13px;animation:wzz 3s ease-in-out infinite}
@keyframes wzz{0%{opacity:0;transform:translate(0,6px)}40%{opacity:1}100%{opacity:0;transform:translate(10px,-14px)}}
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
        <div className="w-scene" dangerouslySetInnerHTML={{ __html: sceneHTML({ tod, season, w, holiday }) }} />
        <div className={`w-lumi-pos ${state}`} dangerouslySetInnerHTML={{ __html: lumi }} />
        {state === "sleep" && <div className="w-zzz zzz">z z z</div>}
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
