// main.js: starts Lumen in the browser.
//   1. open your data (IndexedDB in this browser; your account later)
//   2. start the in-browser "server" (tracker, camera, AI, stores)
//   3. load the page scripts (static/js/*.js), which talk to that server
//
// Test mode: add ?fake=1 to the address (a simulated student instead of the camera, separate test data).
// ?speed=60 makes the simulated time run 60x faster.
import { DocDB, IndexedDBAdapter } from './data/db.js';
import { LocalServer, LocalEventSource } from './server/local-server.js';

const PAGE_SCRIPTS = ['core', 'extras', 'ai', 'session', 'check', 'pages', 'router'];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Could not load ${src}`));
    document.body.appendChild(s);
  });
}

async function boot() {
  const params = new URLSearchParams(location.search);
  const fake = params.has('fake');
  const speed = Number(params.get('speed')) || 30;
  const adapter = new IndexedDBAdapter(fake ? 'lumen-test' : 'lumen');
  const db = await new DocDB(adapter).open();
  const server = new LocalServer({ db, fake, speed });

  window.Lumen = {
    db, server, fake, account: null,
    /** Delete everything stored on this device. */
    async wipe() { await adapter.clear(); },
  };
  window.LumenEventSource = class extends LocalEventSource { constructor() { super(server); } };

  for (const name of PAGE_SCRIPTS) await loadScript(`static/js/${name}.js`);
  document.getElementById('boot').remove();
}

boot().catch((e) => {
  console.error(e);
  document.getElementById('boot').innerHTML = `<div><b><span>◎</span> Lumen</b>
    Lumen could not start in this browser: ${String(e.message || e).replace(/</g, '&lt;')}<br>
    Try the newest Chrome, Edge, Safari or Firefox. Private windows may block storage.</div>`;
});
