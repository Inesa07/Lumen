// cloud.js: keeps your data in your Supabase account AND in this browser.
//
//   DocDB  ──put/remove──▶  CloudAdapter ──▶ IndexedDB cache (instant, works offline)
//                                        └──▶ "outbox" ──upload──▶ Supabase (PostgreSQL)
//
// Every change is saved locally first and written into an OUTBOX (a list of changes not yet uploaded).
// The outbox is uploaded in the background; if the internet is gone, it simply waits and tries again.
// At start-up the cloud copy is downloaded, so the same lessons appear on every device.
// This pattern is called "offline-first" with an "outbox".
import { IndexedDBAdapter } from './db.js';

/** collection in the app -> table in the database (see supabase/migrations/001_init.sql) */
const TABLES = { sessions: 'sessions', todos: 'todos', notes: 'notes', chats: 'chats', reviews: 'reviews', checks: 'checks', kv: 'kv' };
/** kv entries that never leave this device: your AI keys and the draft of a running lesson */
const LOCAL_ONLY_KV = new Set(['ai', 'draft']);
const OUTBOX = '_outbox';
const PAGE = 1000;              // Supabase returns at most 1000 rows per request

const isSynced = (coll, id) => coll in TABLES && !(coll === 'kv' && LOCAL_ONLY_KV.has(id));

export class CloudAdapter {
  /**
   * @param {object} client  supabase-js client (signed in)
   * @param {string} userId
   * @param {(state:string)=>void} [onState]  'synced' | 'saving' | 'offline'
   */
  constructor(client, userId, onState = () => {}) {
    this.client = client;
    this.userId = userId;
    this.local = new IndexedDBAdapter(`lumen-u-${userId}`);    // one cache per account
    this.outbox = new Map();                                   // "coll/id" -> {op, coll, id, doc}
    this.onState = onState;
    this.flushing = null;
    this.retry = null;
    addEventListener('online', () => this.flush());
  }

  async fetchTable(table) {
    const rows = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await this.client.from(table).select('id,data').order('id').range(from, from + PAGE - 1);
      if (error) throw error;
      rows.push(...data);
      if (data.length < PAGE) return rows;
    }
  }

  async loadAll() {
    const cached = await this.local.loadAll();
    for (const { coll, doc } of cached) if (coll === OUTBOX) this.outbox.set(doc.id, doc.change);
    const localRows = cached.filter((r) => r.coll !== OUTBOX);
    try {
      await this.flush();                       // first upload what was changed offline
      if (this.outbox.size) throw new Error('still offline');
      const fresh = [];
      for (const [coll, table] of Object.entries(TABLES)) {
        for (const row of await this.fetchTable(table)) fresh.push({ coll, doc: row.data });
      }
      // the cloud is the truth; keep only the local-only values (AI keys, draft) from the cache
      const keep = localRows.filter((r) => !isSynced(r.coll, r.doc.id));
      await this.local.clear();
      for (const r of [...fresh, ...keep]) await this.local.put(r.coll, r.doc);
      this.onState('synced');
      return [...fresh, ...keep];
    } catch (e) {
      console.warn('Cloud not reachable, using the copy on this device', e);
      this.onState('offline');
      this.scheduleRetry();
      return localRows;
    }
  }

  /** Fresh copies of some collections from the cloud (no local changes are touched). */
  async pull(colls) {
    const out = [];
    for (const coll of colls) {
      if (!TABLES[coll]) continue;
      for (const row of await this.fetchTable(TABLES[coll])) out.push({ coll, doc: row.data });
    }
    return out;
  }

  async put(coll, doc) {
    await this.local.put(coll, doc);
    if (isSynced(coll, doc.id)) this.enqueue({ op: 'put', coll, id: doc.id, doc: structuredClone(doc) });
  }

  async remove(coll, id) {
    await this.local.remove(coll, id);
    if (isSynced(coll, id)) this.enqueue({ op: 'del', coll, id });
  }

  async clear() {
    await this.local.clear();
    this.outbox.clear();
  }

  enqueue(change) {
    const key = `${change.coll}/${change.id}`;
    this.outbox.set(key, change);                       // a newer change replaces an older one
    this.local.put(OUTBOX, { id: key, change }).catch(() => {});
    this.onState('saving');
    clearTimeout(this.soon);
    this.soon = setTimeout(() => this.flush(), 400);    // many quick changes -> one upload round
  }

  /** Upload the outbox, one change after another. Safe to call any time. */
  flush() {
    if (!this.flushing) {
      this.flushing = this._flush().then((ok) => {
        this.flushing = null;
        // changes made while we were uploading: upload them too
        if (ok && this.outbox.size) return this.flush();
        return undefined;
      });
    }
    return this.flushing;
  }

  async _flush() {
    for (const [key, ch] of [...this.outbox]) {
      const table = TABLES[ch.coll];
      const q = this.client.from(table);
      let res;
      try {
        res = ch.op === 'put'
        ? await q.upsert({ user_id: this.userId, id: ch.id, data: ch.doc, updated_at: new Date().toISOString() }, { onConflict: 'user_id,id' })
        : await q.delete().eq('user_id', this.userId).eq('id', ch.id);
      } catch (e) {
        res = { error: e };                              // no internet: fetch() itself failed
      }
      const { error } = res;
      if (error) {
        console.warn('Upload failed, will retry', error);
        this.onState('offline');
        this.scheduleRetry();
        return false;
      }
      if (this.outbox.get(key) === ch) {                 // not changed again meanwhile
        this.outbox.delete(key);
        await this.local.remove(OUTBOX, key);
      }
    }
    this.onState(this.outbox.size ? 'saving' : 'synced');
    return true;
  }

  scheduleRetry() {
    clearTimeout(this.retry);
    this.retry = setTimeout(() => this.flush(), 15000);
  }
}
