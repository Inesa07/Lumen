// Lumen widget for Übersicht (https://tracesof.net/uebersicht): Lumi and today's study summary
// on the Mac desktop. No Xcode needed.
//
// Setup: Lumen → Settings → Mac widget → "Connect widget", then paste the two values below.
// The key is private: anyone with it can see this summary (nothing else).
const LUMEN_WIDGET_URL = "PASTE_URL_HERE";
const LUMEN_WIDGET_KEY = "PASTE_KEY_HERE";

// Übersicht runs this shell command and gives its output to render(). -m 10: give up after 10 s.
export const command = `curl -s -m 10 -H "Authorization: Bearer ${LUMEN_WIDGET_KEY}" "${LUMEN_WIDGET_URL}"`;
export const refreshFrequency = 5 * 60 * 1000;     // every 5 minutes

const LUMI = `<svg class="lumi m-happy" width="84" height="84" viewBox="0 0 120 120" role="img" aria-label="Lumi the firefly"> <defs> <radialGradient id="lg3g"><stop offset="0" stop-color="#FFF4A8" stop-opacity=".9"/><stop offset=".45" stop-color="#E9F56A" stop-opacity=".35"/><stop offset="1" stop-color="#E9F56A" stop-opacity="0"/></radialGradient> <radialGradient id="lg3t" cx=".5" cy=".4"><stop offset="0" stop-color="#FFFBD0"/><stop offset=".6" stop-color="#F4E84E"/><stop offset="1" stop-color="#A9DB3A"/></radialGradient> <linearGradient id="lg3b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7B68C8"/><stop offset="1" stop-color="#5A4AA6"/></linearGradient> </defs> <circle class="glow" cx="60" cy="80" r="45" fill="url(#lg3g)"/> <g class="spks" fill="#FFE98A"><path class="spk" style="animation-delay:0s" d="M18 26l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2z"/><path class="spk" style="animation-delay:0.4s" d="M100 22l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2z"/><path class="spk" style="animation-delay:0.8s" d="M12 74l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2z"/></g> <g class="lumi-body" style="transform:scale(0.88)"> <g class="float"> <ellipse class="wing wl" cx="40" cy="58" rx="17" ry="11"/> <ellipse class="wing wr" cx="80" cy="58" rx="17" ry="11"/> <ellipse class="tail" cx="60" cy="84" rx="17" ry="15" fill="url(#lg3t)"/> <path class="stripe" d="M45 80q15 6 30 0" /> <path class="ant" d="M52 32q-6-12-12-14M68 32q6-12 12-14"/> <circle class="tip" cx="40" cy="18" r="3.2"/><circle class="tip" cx="80" cy="18" r="3.2"/> <circle cx="60" cy="50" r="23" fill="url(#lg3b)"/> <ellipse cx="60" cy="58" rx="13" ry="9" fill="#8F7FD8" opacity=".55"/> <circle class="cheek" cx="45" cy="57" r="4"/><circle class="cheek" cx="75" cy="57" r="4"/> <g class="eyes-open"><ellipse cx="51" cy="48" rx="5.5" ry="6.5" fill="#fff"/><ellipse cx="69" cy="48" rx="5.5" ry="6.5" fill="#fff"/> <g class="pupils"><circle cx="52" cy="49" r="3.2" fill="#241A4A"/><circle cx="70" cy="49" r="3.2" fill="#241A4A"/> <circle cx="53.2" cy="47.4" r="1.1" fill="#fff"/><circle cx="71.2" cy="47.4" r="1.1" fill="#fff"/></g> <g class="lids"><rect x="44" y="40" width="14" height="7" rx="3" fill="#6F5DBD"/><rect x="62" y="40" width="14" height="7" rx="3" fill="#6F5DBD"/></g></g> <g class="eyes-happy" fill="none" stroke="#241A4A" stroke-width="2.6" stroke-linecap="round"><path d="M46 49q5-6 10 0M64 49q5-6 10 0"/></g> <path class="mouth smile" d="M54 59q6 5 12 0" fill="none" stroke="#241A4A" stroke-width="2.4" stroke-linecap="round"/> <path class="mouth grin" d="M52 57q8 11 16 0z" fill="#241A4A"/> <ellipse class="mouth yawn" cx="60" cy="60" rx="3.6" ry="4.4" fill="#241A4A"/> </g> </g> </svg>`;

const today = () => { const d = new Date(), p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const fmt = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`);

export const className = `
  top: 40px; right: 40px; width: 300px;     /* place on the desktop: change these numbers to move the widget */
  font-family: -apple-system, "SF Pro Text", Inter, sans-serif; color: #EEF3FF;
  .card { background: rgba(12, 20, 40, .82); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
          border: 1px solid rgba(255,255,255,.12); border-radius: 22px; padding: 16px; box-shadow: 0 10px 30px rgba(0,0,0,.35); }
  .row { display: flex; align-items: center; gap: 12px; }
  .lumi svg { display: block; }
  .muted { color: #A3B2CF; font-size: 12px; }
  .big { font-size: 24px; font-weight: 700; }
  .bar { height: 7px; border-radius: 99px; background: rgba(255,255,255,.12); overflow: hidden; margin: 6px 0 2px; }
  .bar i { display: block; height: 100%; border-radius: inherit; }
  .sep { height: 1px; background: rgba(255,255,255,.1); margin: 12px 0; }
  .moods { display: flex; gap: 10px; font-size: 12px; margin-top: 4px; }
  .live { background: rgba(76,201,176,.2); border-radius: 12px; padding: 6px 10px; font-size: 12px; margin-bottom: 10px; }
  .err { font-size: 12px; color: #FFB4A0; }
`;

export const render = ({ output, error }) => {
  let s = null;
  try { s = JSON.parse(output); } catch (e) { /* not JSON */ }
  if (error || !s || s.error) {
    return <div className="card"><b>Lumen</b><div className="err">{(s && s.error) || "No connection to Lumen yet. Check the URL and key at the top of index.jsx."}</div></div>;
  }
  const L = s.labels || {};
  const fresh = s.day === today();                    // yesterday's numbers don't count for today
  const g = fresh ? s.goal : { ...s.goal, today: 0, pct: 0 };
  return (
    <div className="card">
      {fresh && s.active && <div className="live">● {L.studying} · {s.active.cls} · {s.active.attention}%</div>}
      <div className="row">
        <div className="lumi" dangerouslySetInnerHTML={{ __html: LUMI }} />
        <div style={{ flex: 1 }}>
          <div className="muted">Lumi · {s.lumi.stage}</div>
          <div className="bar"><i style={{ width: `${s.lumi.pct}%`, background: "linear-gradient(90deg,#F4E84E,#A9DB3A)" }} /></div>
          <div className="muted">🔆 {s.lumi.light} · 🏅 {s.lumi.medals}</div>
        </div>
      </div>
      <div className="sep" />
      <div className="row">
        <div style={{ flex: 1 }}>
          <div className="muted">{L.goal}</div>
          <div className="big">{fmt(g.today)} <span className="muted">/ {fmt(g.goal_min)}</span></div>
          <div className="bar"><i style={{ width: `${g.pct}%`, background: "#F2B544" }} /></div>
        </div>
        <div style={{ textAlign: "center", fontSize: 22 }}>🔥<div style={{ fontSize: 16, fontWeight: 700 }}>{g.streak}</div></div>
      </div>
      {fresh && s.mood && s.mood.length > 0 && (<div>
        <div className="sep" /><div className="muted">{L.mood}</div>
        <div className="bar" style={{ display: "flex", gap: 2, background: "transparent" }}>
          {s.mood.map((m) => <i key={m.label} style={{ flex: m.pct, background: m.color }} />)}</div>
        <div className="moods">{s.mood.map((m) => <span key={m.label}>{m.emoji} {m.pct}%</span>)}</div>
      </div>)}
      <div className="sep" />
      <div className="row" style={{ fontSize: 13 }}>
        <span style={{ fontSize: 20 }}>{s.quest.icon}</span>
        <span style={{ flex: 1 }}>{fresh ? s.quest.text : L.none}</span>
        <b>{fresh && s.quest.done ? "✓" : fresh ? `${s.quest.value}/${s.quest.need}` : ""}</b>
      </div>
    </div>
  );
};
