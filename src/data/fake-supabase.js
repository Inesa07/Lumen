// fake-supabase.js: a tiny stand-in for Supabase, used only in test mode (?fake=1).
// It imitates the small part of supabase-js that Lumen uses (auth + tables), and keeps its
// "cloud" in localStorage, so tests can sign up, reload, and check that data comes back.
// Add &offline=1 to the address to simulate no internet.

const KEY = 'lumen-fake-cloud';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { users: [], rows: {}, session: null }; } catch { return { users: [], rows: {}, session: null }; } };
const save = (s) => localStorage.setItem(KEY, JSON.stringify(s));
const err = (message) => ({ message });

class Query {
  constructor(state, table, offline) { Object.assign(this, { state, table, offline, op: 'select', filters: [], rangeArgs: null }); }
  select() { this.op = 'select'; return this; }
  order() { return this; }
  range(a, b) { this.rangeArgs = [a, b]; return this; }
  upsert(row) { this.op = 'upsert'; this.row = row; return this; }
  delete() { this.op = 'delete'; return this; }
  eq(col, val) { this.filters.push([col, val]); return this; }
  then(resolve, reject) { return Promise.resolve().then(() => this.run()).then(resolve, reject); }

  run() {
    const s = load();
    if (this.offline) throw new TypeError('Failed to fetch');
    const uid = s.session && s.session.user.id;
    if (!uid) return { data: null, error: err('not signed in') };
    const rows = (s.rows[this.table] ||= []);
    if (this.op === 'select') {
      // Row Level Security, like the real database: only your own rows
      let mine = rows.filter((r) => r.user_id === uid).sort((a, b) => (a.id < b.id ? -1 : 1));
      if (this.rangeArgs) mine = mine.slice(this.rangeArgs[0], this.rangeArgs[1] + 1);
      return { data: mine.map((r) => ({ id: r.id, data: r.data })), error: null };
    }
    if (this.op === 'upsert') {
      if (this.row.user_id !== uid) return { data: null, error: err('new row violates row-level security policy') };
      const i = rows.findIndex((r) => r.user_id === uid && r.id === this.row.id);
      if (i >= 0) rows[i] = this.row; else rows.push(this.row);
    } else if (this.op === 'delete') {
      s.rows[this.table] = rows.filter((r) => !(r.user_id === uid && this.filters.every(([c, v]) => r[c] === v)));
    }
    save(s);
    return { data: null, error: null };
  }
}

export function createFakeClient({ offline = false } = {}) {
  const listeners = new Set();
  const emit = (event, session) => listeners.forEach((fn) => fn(event, session));
  const sessionFor = (u) => ({ access_token: 'fake', user: { id: u.id, email: u.email, user_metadata: u.meta || {} } });
  return {
    fake: true,
    from: (table) => new Query(load(), table, offline),
    rpc: async (name) => {
      const s = load();
      if (name === 'delete_my_account' && s.session) {
        const id = s.session.user.id;
        s.users = s.users.filter((u) => u.id !== id);
        for (const t of Object.keys(s.rows)) s.rows[t] = s.rows[t].filter((r) => r.user_id !== id);
        s.session = null;
        save(s);
      }
      return { data: null, error: null };
    },
    auth: {
      async getSession() { return { data: { session: load().session }, error: null }; },
      onAuthStateChange(fn) { listeners.add(fn); return { data: { subscription: { unsubscribe: () => listeners.delete(fn) } } }; },
      async signUp({ email, password, options }) {
        const s = load();
        if (s.users.some((u) => u.email === email)) return { data: {}, error: err('User already registered') };
        if (!password || password.length < 6) return { data: {}, error: err('Password should be at least 6 characters.') };
        const u = { id: crypto.randomUUID(), email, password, meta: (options && options.data) || {} };
        s.users.push(u); s.session = sessionFor(u); save(s);
        emit('SIGNED_IN', s.session);
        return { data: { user: s.session.user, session: s.session }, error: null };
      },
      async signInWithPassword({ email, password }) {
        const s = load();
        const u = s.users.find((x) => x.email === email && x.password === password);
        if (!u) return { data: {}, error: err('Invalid login credentials') };
        s.session = sessionFor(u); save(s);
        emit('SIGNED_IN', s.session);
        return { data: { user: s.session.user, session: s.session }, error: null };
      },
      async signInWithOAuth() { return { data: {}, error: err('Google sign-in is not available in test mode') }; },
      async resetPasswordForEmail() { return { data: {}, error: null }; },
      async updateUser({ password }) {
        const s = load();
        const u = s.session && s.users.find((x) => x.id === s.session.user.id);
        if (!u) return { data: {}, error: err('not signed in') };
        u.password = password; save(s);
        return { data: { user: s.session.user }, error: null };
      },
      async signOut() { const s = load(); s.session = null; save(s); emit('SIGNED_OUT', null); return { error: null }; },
    },
  };
}
