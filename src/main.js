// main.js: starts Lumen in the browser.
//   1. find out who you are: signed in to your account, or a guest
//   2. open your data: account -> this device's copy + your Supabase cloud; guest -> this browser only
//   3. start the in-browser "server" (tracker, camera, AI, stores)
//   4. load the page scripts (static/js/*.js), which talk to that server
//
// Test mode: ?fake=1 (a simulated student instead of the camera, a fake cloud, separate test data).
// ?speed=60 makes simulated time run 60x faster; &offline=1 simulates no internet.
import { DocDB, IndexedDBAdapter } from './data/db.js';
import { CloudAdapter } from './data/cloud.js';
import { LocalServer, LocalEventSource } from './server/local-server.js';
import { SUPABASE_URL, SUPABASE_KEY, SUPABASE_JS } from './config.js';

const PAGE_SCRIPTS = ['core', 'extras', 'ai', 'session', 'check', 'pages', 'account', 'router'];
const params = new URLSearchParams(location.search);
const fake = params.has('fake');
const speed = Number(params.get('speed')) || 30;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Could not load ${src}`));
    document.body.appendChild(s);
  });
}

/** The Supabase client, or null when the library can't be loaded (no internet). */
async function makeClient() {
  if (fake) {
    const { createFakeClient } = await import('./data/fake-supabase.js');
    return createFakeClient({ offline: params.has('offline') });
  }
  try {
    const { createClient } = await import(SUPABASE_JS);
    // PKCE: after "Sign in with Google" or an e-mail link, the browser comes back with ?code=...
    // and supabase-js swaps it for a session (safer than putting the token in the address).
    return createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true } });
  } catch (e) {
    console.warn('Supabase library not available (offline?)', e);
    return null;
  }
}

/** Offline and the library didn't load: read the remembered login so your own copy still opens. */
function rememberedUser() {
  try {
    const ref = new URL(SUPABASE_URL).hostname.split('.')[0];
    const tok = JSON.parse(localStorage.getItem(`sb-${ref}-auth-token`) || 'null');
    const u = tok && (tok.user || (tok.currentSession && tok.currentSession.user));
    return u ? { id: u.id, email: u.email, user_metadata: u.user_metadata || {} } : null;
  } catch { return null; }
}

/** Guest data found when you sign in: move it into your account (once, if you agree). */
async function offerGuestMove(db) {
  const guest = new IndexedDBAdapter(fake ? 'lumen-test' : 'lumen');
  const rows = (await guest.loadAll()).filter((r) => !(r.coll === 'kv' && r.doc.id === 'draft'));
  const lessons = rows.filter((r) => r.coll === 'sessions').length;
  if (!rows.length) return;
  const what = lessons ? `${lessons} lesson${lessons > 1 ? 's' : ''} and your other data` : 'your notes, to-dos and settings';
  if (window.confirm(`This browser has ${what} from guest mode.\n\nMove it into your account, so it's saved in the cloud?`)) {
    for (const { coll, doc } of rows) if (!db.get(coll, doc.id)) db.put(coll, doc);
    await db.flush();
  }
  await guest.clear();
}

async function boot() {
  const client = await makeClient();
  let user = null;
  if (client) {
    const { data } = await client.auth.getSession();
    user = data.session ? data.session.user : null;
  } else {
    user = rememberedUser();
  }

  const syncListeners = new Set();
  let syncState = user ? 'saving' : 'local';
  const setSync = (st) => { syncState = st; syncListeners.forEach((fn) => fn(st)); };
  const adapter = user && client ? new CloudAdapter(client, user.id, setSync)
    : user ? new IndexedDBAdapter(`lumen-u-${user.id}`)               // offline: this device's copy of your account
      : new IndexedDBAdapter(fake ? 'lumen-test' : 'lumen');            // guest
  if (user && !client) setSync('offline');
  const db = await new DocDB(adapter).open();
  if (user && client && !localStorage.getItem(`lumen.moved.${user.id}`)) {
    localStorage.setItem(`lumen.moved.${user.id}`, '1');
    await offerGuestMove(db);
  }
  const server = new LocalServer({ db, fake, speed });

  window.Lumen = {
    db, server, fake, client, user,
    account: user ? {
      email: user.email,
      name: (user.user_metadata && (user.user_metadata.name || user.user_metadata.full_name)) || (user.email || '').split('@')[0],
      text: `Signed in as <b>${(user.email || '').replace(/</g, '&lt;')}</b>. Your lessons are saved in your account (the cloud) and on this device, so they appear on every computer where you sign in.`,
    } : null,
    syncState: () => syncState,
    /** Which sign-in methods are switched on in Supabase (Authentication → Sign In / Providers). */
    async authSettings() {
      if (fake || !client) return { google: false };
      try {
        const r = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } });
        const j = await r.json();
        return { google: !!(j.external && j.external.google) };
      } catch { return { google: false }; }
    },
    onSync(fn) { syncListeners.add(fn); return () => syncListeners.delete(fn); },
    /** Delete everything stored for the current user (or guest) on this device and in the cloud. */
    async wipe() {
      if (user && client) {
        for (const coll of ['sessions', 'todos', 'notes', 'chats', 'reviews', 'checks', 'kv']) {
          for (const d of db.list(coll)) db.remove(coll, d.id);
        }
        await db.flush();
        if (adapter.flush) await adapter.flush();
      }
      await adapter.clear();
    },
  };
  window.LumenEventSource = class extends LocalEventSource { constructor() { super(server); } };

  if (client) {
    client.auth.onAuthStateChange((event, session) => {
      const id = session ? session.user.id : null;
      if (event === 'PASSWORD_RECOVERY') { location.hash = '#/account/new-password'; return; }
      // signed in or out as somebody else: start again with that person's data
      if ((event === 'SIGNED_IN' || event === 'SIGNED_OUT') && id !== (user ? user.id : null)) {
        setTimeout(() => {
          history.replaceState(null, '', `${location.pathname}${location.search.replace(/[?&]code=[^&]*/, '')}#/`);
          location.reload();
        }, 50);
      }
    });
  }

  for (const name of PAGE_SCRIPTS) await loadScript(`static/js/${name}.js`);
  document.getElementById('boot').remove();
}

boot().catch((e) => {
  console.error(e);
  document.getElementById('boot').innerHTML = `<div><b><span>◎</span> Lumen</b>
    Lumen could not start in this browser: ${String(e.message || e).replace(/</g, '&lt;')}<br>
    Try the newest Chrome, Edge, Safari or Firefox. Private windows may block storage.</div>`;
});
