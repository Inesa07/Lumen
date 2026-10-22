// db.js: where Lumen keeps your data in the browser.
//
// Data is a set of COLLECTIONS ("sessions", "todos", "notes", "chats", "reviews", "kv"),
// each a set of documents with an `id`. Everything is loaded into memory once at start-up,
// so reading is instant; every change is written through to persistent storage.
//
// The storage is an ADAPTER, so the same code works with:
//   * IndexedDBAdapter  - the browser's built-in database (guest mode, works offline)
//   * MemoryAdapter     - for tests
//   * (step 3) a Supabase adapter - your account in the cloud
//
// IndexedDB in one sentence: a key -> value database inside the browser, one per website,
// with asynchronous (Promise-based) reads and writes. Here: key = "collection/id", value = the document.

export class MemoryAdapter {
  constructor(initial = []) { this.rows = new Map(initial.map((d) => [`${d.coll}/${d.doc.id}`, d])); }
  async loadAll() { return [...this.rows.values()]; }
  async put(coll, doc) { this.rows.set(`${coll}/${doc.id}`, { coll, doc: structuredClone(doc) }); }
  async remove(coll, id) { this.rows.delete(`${coll}/${id}`); }
  async clear() { this.rows.clear(); }
}

export class IndexedDBAdapter {
  constructor(name = 'lumen') { this.name = name; this.dbp = null; }

  _open() {
    if (!this.dbp) {
      this.dbp = new Promise((resolve, reject) => {
        const req = indexedDB.open(this.name, 1);
        req.onupgradeneeded = () => req.result.createObjectStore('docs');   // runs once, on first visit
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return this.dbp;
  }

  async _tx(mode, fn) {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('docs', mode);
      const out = fn(tx.objectStore('docs'));
      tx.oncomplete = () => resolve(out && 'result' in out ? out.result : undefined);
      tx.onerror = () => reject(tx.error);
    });
  }

  async loadAll() {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const out = [];
      const req = db.transaction('docs').objectStore('docs').openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur) return resolve(out);
        const key = String(cur.key);
        out.push({ coll: key.slice(0, key.indexOf('/')), doc: cur.value });
        cur.continue();
      };
      req.onerror = () => reject(req.error);
    });
  }

  put(coll, doc) { return this._tx('readwrite', (s) => s.put(doc, `${coll}/${doc.id}`)); }
  remove(coll, id) { return this._tx('readwrite', (s) => s.delete(`${coll}/${id}`)); }
  clear() { return this._tx('readwrite', (s) => s.clear()); }
}

export class DocDB {
  constructor(adapter) {
    this.adapter = adapter;
    this.colls = new Map();          // collection -> Map(id -> doc)
    this.listeners = new Set();
    this.pending = Promise.resolve();
  }

  async open() {
    for (const { coll, doc } of await this.adapter.loadAll()) this._coll(coll).set(doc.id, doc);
    return this;
  }

  _coll(name) {
    if (!this.colls.has(name)) this.colls.set(name, new Map());
    return this.colls.get(name);
  }

  /** All documents of a collection (the objects themselves: call put() after changing one). */
  list(coll) { return [...this._coll(coll).values()]; }
  get(coll, id) { return this._coll(coll).get(id) ?? null; }

  put(coll, doc) {
    if (!doc || !doc.id) throw new Error('document needs an id');
    this._coll(coll).set(doc.id, doc);
    this._write(() => this.adapter.put(coll, doc), coll, doc.id);
    return doc;
  }

  remove(coll, id) {
    this._coll(coll).delete(id);
    this._write(() => this.adapter.remove(coll, id), coll, id);
  }

  /** Single values (settings, profile, AI config) live in the "kv" collection. */
  getValue(key, fallback = null) { const d = this.get('kv', key); return d ? d.value : fallback; }
  setValue(key, value) { return this.put('kv', { id: key, value }).value; }
  removeValue(key) { this.remove('kv', key); }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  /** Writes run one after another (in order); `flush()` waits for all of them. */
  _write(op, coll, id) {
    this.pending = this.pending.then(op).catch((e) => console.error('Saving failed', coll, id, e));
    for (const fn of this.listeners) fn(coll, id);
  }

  flush() { return this.pending; }

  /** Everything, for "Export my data". */
  dump() {
    const out = {};
    for (const [name, m] of this.colls) out[name] = [...m.values()];
    return out;
  }

  async restore(data) {
    for (const [coll, docs] of Object.entries(data || {})) for (const d of docs || []) if (d && d.id) this.put(coll, d);
    await this.flush();
  }
}

export const newId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 10);
