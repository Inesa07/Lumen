// blocker.js: talks to the "Lumen Focus" browser extension (browser-extension/ in the repo).
// While a lesson runs (and not during a break), Lumen says so every 20 seconds; the extension blocks
// YouTube, games and social sites until it hears that the lesson ended (or hears nothing for 90 s).
// Nothing about the lesson is sent anywhere: the message only goes from this page to the extension.
let focusExt = { installed: false, active: false, count: 0 };
const focusInstalled = () => focusExt.installed || document.documentElement.dataset.lumenFocus === '1';

(function lessonToExtension() {
  let last = null, lastSent = 0;
  const say = (active) => { window.postMessage({ source: 'lumen-app', type: 'lesson', active }, location.origin); lastSent = Date.now(); };
  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data || e.data.source !== 'lumen-focus') return;
    const was = focusExt.active;
    focusExt = { installed: true, active: !!e.data.active, count: e.data.count || 0 };
    if (focusExt.active && !was) toast(t('🚫 YouTube, games and social sites are blocked until the lesson ends'));
  });
  setInterval(() => {
    const tr = Lumen.server && Lumen.server.tracker;
    const active = !!tr && !tr.on_break;
    if (active !== last || (active && Date.now() - lastSent > 20000)) { last = active; say(active); }
  }, 1000);
})();

/** The "Block distracting sites" card in Settings. */
function focusCard() {
  const on = focusInstalled();
  return `<section class="card focuscard" id="focusCard">
    <div class="setrow" style="padding:0;border:0;background:none">
      <div><h2 style="margin:0 0 4px;font-size:17px">🚫 ${t('Block distracting sites')}</h2>
        <p class="muted small" style="margin:0">${t('During a lesson YouTube, games and social sites don\'t open. After the lesson everything works again. A free extension for Chrome or Edge on a computer.')}</p></div>
      ${on ? `<span class="pill ok">✓ ${t('Installed')}</span>` : `<a class="btn primary" href="static/lumen-focus.zip" download>${t('Download')}</a>`}
    </div>
    ${on ? `<p class="muted small" style="margin:10px 0 0">${t('To change the list of sites, click the Lumen Focus icon next to the address bar.')}</p>` : `
    <ol class="small focussteps">
      <li>${t('Download the file and unzip it (double-click).')}</li>
      <li>${t('In Chrome open <b>chrome://extensions</b> (in Edge: <b>edge://extensions</b>).')}</li>
      <li>${t('Turn on <b>Developer mode</b> (top right).')}</li>
      <li>${t('Press <b>Load unpacked</b> and choose the unzipped <b>lumen-focus</b> folder.')}</li>
      <li>${t('Reload this page. Done!')}</li>
    </ol>`}
  </section>`;
}
