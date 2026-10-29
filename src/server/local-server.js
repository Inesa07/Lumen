// local-server.js: the Lumen "server", running inside the browser tab (port of server.py).
//
// The Python version was a real HTTP server on your Mac:
//     browser  --HTTP-->  server.py  ->  tracker.py  <-  vision.py (camera)
// In the web version there is no server for the camera at all: everything runs in the tab, and the
// pages talk to this object instead of making HTTP requests. The same paths ("/api/start", ...)
// are kept, so the page code barely changed:
//     page  --request("/api/start")-->  LocalServer  ->  SessionTracker  <-  CameraVision
// Saved data goes to the DocDB (IndexedDB now, your Supabase account later).
import { SessionTracker, PROFILE_VERSION } from '../core/tracker.js';
import { mmss } from '../core/util.js';
import * as stats from '../core/stats.js';
import { friendState } from '../core/friend.js';
import { dreamState, lessonStars, guessSize, guessEmoji, priceOf, sizePrompt, readSize, readEmoji, SIZE_DAYS, MAX_TEXT } from '../core/dream.js';
import { ValidationRun, FakeFollower, CSV_HEADER } from '../core/validate.js';
import { Tutor, AIError, lessonContext } from '../core/ai.js';
import { TodoStore, NoteStore, ChatStore, ReviewStore } from '../data/stores.js';
import { CameraVision } from '../vision/camera.js';
import { FakeVision } from '../vision/fake.js';

export const DEFAULT_SETTINGS = { daily_goal_min: 60, streak_min: 10, rhythm: null, mood_sens: 'normal', eye_rest: true, posture: true, blink: true,
  theme: 'fireflies', accent: '#F2B544', motion: true };
// background scenes (older theme names are mapped to the closest scene in the browser)
const THEMES = ['fireflies', 'space', 'ocean', 'forest', 'clouds', 'blossom', 'city'];
const ACCENTS = ['#F2B544', '#4CC9B0', '#FF8A70', '#9B8CFF', '#5AA9FF', '#F06BA8'];
const ABSENT_SEC = 10 * 60;           // nobody in front of the camera for 10 minutes -> pause
const DRAFT_EVERY_MS = 20000;         // a running lesson is saved as a draft every 20 s (crash / closed tab)

const pad = (n) => String(n).padStart(2, '0');
function newSessionId() {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-`
    + crypto.randomUUID().slice(0, 4);
}
const intOr = (v, d) => (Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : d);

export function cleanRhythm(r) {
  if (!r || typeof r !== 'object') return null;
  const study = Number.parseInt(r.study, 10), brk = Number.parseInt(r.break, 10);
  if (!Number.isFinite(study) || !Number.isFinite(brk)) return null;
  if (!(study >= 5 && study <= 240 && brk >= 1 && brk <= 60)) return null;
  return { study, break: brk };
}

export function cleanTasks(tasks) {
  if (!Array.isArray(tasks)) return [];
  const out = [];
  for (const t of tasks.slice(0, 8)) {
    const isObj = t && typeof t === 'object';
    const text = String(isObj ? t.text ?? '' : t).trim().slice(0, 120);
    if (!text) continue;
    const item = { text, done: isObj ? !!t.done : false };
    if (isObj && t.todo_id) item.todo_id = String(t.todo_id).slice(0, 20);
    out.push(item);
  }
  return out;
}

/** A fake EventSource: pages "subscribe" to live numbers exactly like they did to /api/stream. */
export class LocalEventSource {
  constructor(server) {
    this.onmessage = null;
    this.onerror = null;
    this._unsub = server.subscribe((payload) => { if (this.onmessage) this.onmessage({ data: JSON.stringify(payload) }); });
  }
  close() { if (this._unsub) this._unsub(); this._unsub = null; }
}

export class LocalServer {
  /**
   * @param {object} o
   * @param {import('../data/db.js').DocDB} o.db
   * @param {boolean} [o.fake]   simulated student instead of the camera
   * @param {number} [o.speed]   simulation speed (simulated seconds per real second)
   * @param {object} [o.cloudAI] how to reach the shared AI tutor when signed in (see core/ai.js)
   */
  constructor({ db, fake = false, speed = 30, cloudAI = null }) {
    Object.assign(this, { db, fake, speed });
    this.todos = new TodoStore(db);
    this.notes = new NoteStore(db);
    this.chats = new ChatStore(db);
    this.reviews = new ReviewStore(db);
    this.tutor = new Tutor(db, { fake, cloud: cloudAI });
    this.tutor.blocked = () => !this.parentInfo().ai_allowed;
    this.tracker = null; this.check = null; this.worker = null;
    this.sessionId = null; this.checkId = null;
    this.lastReportId = null; this.lastCheckId = null; this.lastStatus = null;
    this.meta = {};
    this.subscribers = new Set();
    this.video = document.createElement('video');      // the camera picture, shown by the session page
    this.video.className = 'cam-video';
    this.video.muted = true; this.video.playsInline = true;
    this.recoverDraft();
    setInterval(() => this.watchdog(), 5000);
    setInterval(() => this.saveDraft(), DRAFT_EVERY_MS);
    // closing the tab or the browser: keep the lesson as "paused", you can continue it later
    addEventListener('pagehide', () => { if (this.tracker) this.end({ status: 'paused', auto: 'tab closed' }); });
  }

  // ------------------------------------------------------------------ settings & profile
  settings() { return { ...DEFAULT_SETTINGS, ...(this.db.getValue('settings') || {}) }; }

  saveSettings(nw) {
    const cur = this.settings();
    if ('daily_goal_min' in nw) cur.daily_goal_min = Math.min(600, Math.max(10, intOr(nw.daily_goal_min, 60)));
    if ('streak_min' in nw) cur.streak_min = Math.min(120, Math.max(1, intOr(nw.streak_min, 10)));
    for (const k of ['eye_rest', 'posture', 'blink']) if (k in nw) cur[k] = !!nw[k];
    if ('rhythm' in nw) cur.rhythm = cleanRhythm(nw.rhythm);
    if (['low', 'normal', 'high'].includes(nw.mood_sens)) cur.mood_sens = nw.mood_sens;
    if (THEMES.includes(nw.theme)) cur.theme = nw.theme;
    if (typeof nw.motion === 'boolean') cur.motion = nw.motion;
    if (ACCENTS.includes(String(nw.accent || '').toUpperCase())) cur.accent = String(nw.accent).toUpperCase();
    this.db.setValue('settings', cur);
    return cur;
  }

  profile() {
    const p = this.db.getValue('profile');
    return p && p.version === PROFILE_VERSION ? p : null;
  }

  reports() { return this.db.list('sessions'); }

  // ------------------------------------------------------------------ camera
  async startWorker(feed, FakeCls) {
    this.cameraStatus = null;
    const opts = { onSample: feed, onStatus: (st) => { this.cameraStatus = st; } };
    this.worker = this.fake ? new FakeCls({ ...opts, speed: this.speed }) : new CameraVision(opts);
    try {
      await this.worker.start(this.video);
      return null;
    } catch (e) {
      console.error(e);
      this.stopWorker();
      this.tracker = this.check = null;
      const msg = e && e.name === 'NotAllowedError'
        ? 'Camera permission was denied. Allow the camera for this site (the camera icon in the address bar) and try again.'
        : e && e.name === 'NotFoundError' ? 'No camera was found on this computer.'
          : `Camera did not start: ${e && e.message ? e.message : e}`;
      return { ok: false, error: msg };
    }
  }

  stopWorker() {
    const w = this.worker;
    this.worker = null;
    if (w) w.stop();
  }

  // ------------------------------------------------------------------ session
  linkTodos(cls, tasks) {
    const known = new Map(this.todos.list().map((i) => [i.id, i]));
    for (const t of tasks) {
      const item = known.get(t.todo_id);
      if (!item) { const it = this.todos.add(cls, t.text); t.todo_id = it.id; } else t.done = item.done;
    }
    return tasks;
  }

  async start(cls, title, continueId = null, tasks = null, rhythm = 'default') {
    if (this.tracker || this.check) return { ok: true, id: this.sessionId, already: true };
    this.sessionId = newSessionId();
    let meta = { class: cls || 'Other', title: title || 'Study session', lesson_id: this.sessionId, part: 1, tasks: cleanTasks(tasks) };
    if (continueId) {                                 // next part of a paused lesson
      const parts = this.reports().filter((r) => (r.lesson_id || r.id) === continueId);
      if (parts.length) {
        const last = parts.reduce((a, b) => (b.started_at > a.started_at ? b : a));
        meta = { class: last.class || 'Other', title: last.title, lesson_id: continueId,
          part: Math.max(...parts.map((r) => r.part || 1)) + 1,
          tasks: cleanTasks(tasks).length ? cleanTasks(tasks) : (last.tasks || []).map((t) => ({ ...t })) };
      }
    }
    meta.tasks = this.linkTodos(meta.class, meta.tasks);
    this.meta = meta;
    let st = this.settings();
    if (rhythm !== 'default') {                       // chosen on the start form: remember it for next time
      const r = cleanRhythm(rhythm);
      if (JSON.stringify(r) !== JSON.stringify(st.rhythm)) st = this.saveSettings({ rhythm: r });
    }
    const [plan] = stats.planMinutes(this.reports());
    const tr = new SessionTracker(meta.title, this.profile(), {
      plan_min: plan, eye_rest: st.eye_rest, posture: st.posture, blink: st.blink, rhythm: st.rhythm, mood_sens: st.mood_sens });
    this.tracker = tr;
    const err = await this.startWorker((s) => { if (this.tracker === tr) tr.feed(s); }, FakeVision);
    return err || { ok: true, id: this.sessionId };
  }

  async startCheck() {
    if (this.tracker || this.check) return { ok: false, error: 'Finish the running session first.' };
    const run = new ValidationRun(this.profile());
    this.check = run;
    this.checkId = newSessionId();
    const err = await this.startWorker((s) => { if (this.check === run) run.feed(s); }, FakeFollower);
    return err || { ok: true, id: this.checkId };
  }

  finishCheck(save = true) {
    this.stopWorker();
    if (!this.check) return null;
    let res = null;
    if (save) {
      try {
        res = this.check.results();
      } catch (e) {
        console.error(e);
        this.check = null;
        return null;
      }
      res.id = this.checkId;
      res.csv = [CSV_HEADER, ...this.check.csv_rows].map((r) => r.join(',')).join('\n');
      this.db.put('checks', res);
      this.lastCheckId = this.checkId;
    }
    this.check = null;
    return res;
  }

  setTask(index, done) {
    const tasks = this.meta.tasks || [];
    if (!this.tracker || !(index >= 0 && index < tasks.length)) return false;
    tasks[index].done = !!done;
    if (tasks[index].todo_id) this.todos.update(tasks[index].todo_id, { done: !!done });
    return true;
  }

  addTask(text) {
    if (!this.tracker) return null;
    const tasks = (this.meta.tasks ||= []);
    text = String(text).trim().slice(0, 120);
    if (!text || tasks.length >= 12) return null;
    const item = this.todos.add(this.meta.class, text);
    tasks.push({ text: item.text, done: false, todo_id: item.id });
    return tasks;
  }

  /** Build the report of the running lesson (without stopping it). */
  buildReport(status, auto, doneFlags) {
    const rep = this.tracker.report();
    Object.assign(rep, structuredClone(this.meta));
    rep.id = this.sessionId;
    rep.status = status;
    rep.auto_paused = auto;
    const tasks = (this.meta.tasks || []).map((t) => ({ ...t }));
    if (Array.isArray(doneFlags)) {                   // final ticks from the "Finish" dialog
      tasks.forEach((t, i) => {
        if (i >= doneFlags.length) return;
        t.done = !!doneFlags[i];
        if (t.todo_id) this.todos.update(t.todo_id, { done: t.done });
      });
    }
    rep.tasks = tasks;
    rep.intention = tasks.map((t) => t.text).join('; ');
    const nDone = tasks.filter((t) => t.done).length;
    rep.outcome = !tasks.length || status === 'paused' ? null : nDone === tasks.length ? 'yes' : nDone ? 'partly' : 'no';
    return rep;
  }

  /** Stop the camera and save the report. status: 'finished' or 'paused' (continue later). */
  end({ status = 'finished', auto = null, doneFlags = null } = {}) {
    if (this.check) { this.finishCheck(false); return null; }
    this.stopWorker();
    if (!this.tracker) return null;
    const rep = this.buildReport(status, auto, doneFlags);
    this.db.removeValue('draft');
    if (rep.duration_sec < 20 && !auto) {             // an accidental start: don't keep it
      this.tracker = null;
      return { id: null, discarded: true };
    }
    this.db.put('sessions', rep);
    this.tracker = null;
    this.lastReportId = this.sessionId;
    this.lastStatus = status;
    try { this.reviews.addFromReport(rep); } catch (e) { console.error(e); }
    return rep;
  }

  saveDraft() {
    if (!this.tracker || this.tracker.on_break) return;
    try {
      this.db.setValue('draft', this.buildReport('paused', 'tab closed', null));
    } catch (e) { console.warn('draft not saved', e); }
  }

  /** A lesson that was running when the tab crashed or closed is kept as "paused". */
  recoverDraft() {
    const d = this.db.getValue('draft');
    if (!d) return;
    this.db.removeValue('draft');
    if (d.duration_sec >= 20 && !this.db.get('sessions', d.id)) {
      this.db.put('sessions', d);
      try { this.reviews.addFromReport(d); } catch (e) { console.error(e); }
    }
  }

  watchdog() {
    const tr = this.tracker;
    if (tr && !tr.on_break && tr.absent_since !== null && tr.t - tr.absent_since > ABSENT_SEC) {
      this.end({ status: 'paused', auto: 'you left' });
    }
  }

  action(kind, body) {
    const tr = this.tracker;
    if (!tr) return false;
    const minutes = typeof body.minutes === 'number' ? Math.trunc(body.minutes) : 5;
    if (kind === 'mark') tr.mark_confusing();
    else if (kind === 'mark_note') tr.note_last_mark(String(body.text ?? ''));
    else if (kind === 'eyes_start') tr.start_eye_rest();
    else if (kind === 'break_start') tr.start_break(minutes);
    else if (kind === 'break_extend') tr.extend_break(minutes);
    else if (kind === 'break_end') tr.end_break();
    else if (kind === 'dismiss') tr.dismiss();
    else if (kind === 'notes') tr.set_notes(!!body.on);
    return true;
  }

  snapshot() {
    if (this.check) {
      if (this.check.finished) { this.finishCheck(); return null; }
      return { ...this.check.snapshot(), fake: this.fake, camera: this.cameraInfo() };
    }
    if (!this.tracker) return null;
    const snap = this.tracker.snapshot();
    snap.mode = 'session';
    Object.assign(snap, { class: this.meta.class, part: this.meta.part || 1, lesson_id: this.meta.lesson_id, tasks: this.meta.tasks || [] });
    snap.camera_error = this.cameraStatus && this.cameraStatus.stage === 'error' ? this.cameraStatus.text : null;
    snap.fake = this.fake;
    snap.camera = this.cameraInfo();
    // completed focused minutes of this lesson so far (for Lumi's "+1 light")
    snap.focused_live = this.tracker.minutes.slice(0, -1).filter((m) => m.n >= 50 && m.sum / m.n >= 0.7).length;
    return snap;
  }

  cameraInfo() {
    const w = this.worker;
    return w ? { fps: w.fpsMeasured, delegate: w.delegate } : null;
  }

  overview() {
    const st = this.settings();
    const data = stats.overview(this.reports(), Date.now() / 1000, st.daily_goal_min, st.streak_min);
    data.todo_open = this.todos.counts();
    const rv = this.reviews.overview();
    Object.assign(data, { settings: st, reviews_due: rv.due.length, reviews_total: rv.total - rv.done });
    const checks = this.db.list('checks').sort((a, b) => b.started_at - a.started_at);
    const c = checks[0];
    const snap = this.snapshot();
    Object.assign(data, {
      last_check: c ? { id: c.id, accuracy: c.accuracy, balanced_accuracy: c.balanced_accuracy, started_at: c.started_at } : null,
      profile: this.profile(),
      active: snap ? { mode: snap.mode, title: snap.title, class: snap.class, elapsed: snap.elapsed } : null,
    });
    return data;
  }

  finishLesson(lessonId) {
    const parts = this.reports().filter((r) => (r.lesson_id || r.id) === lessonId);
    if (!parts.length) return false;
    const last = parts.reduce((a, b) => (b.started_at > a.started_at ? b : a));
    last.status = 'finished';
    this.db.put('sessions', last);
    return true;
  }

  // ------------------------------------------------------------------ live stream (was Server-Sent Events)
  subscribe(cb) {
    const tick = () => {
      const snap = this.snapshot();
      cb(snap !== null ? snap : { ended: true, report: this.lastReportId, check: this.lastCheckId, status: this.lastStatus });
      if (snap === null) stop();
    };
    const id = setInterval(tick, 500);
    const stop = () => { clearInterval(id); this.subscribers.delete(stop); };
    this.subscribers.add(stop);
    setTimeout(tick, 0);
    return stop;
  }

  // ------------------------------------------------------------------ AI tutor
  chatContext(chat) {
    const tasks = chat.class ? this.todos.list(chat.class).filter((t) => !t.done) : [];
    const notes = chat.lesson_id ? this.notes.list({ lessonId: chat.lesson_id }) : [];
    const questions = chat.lesson_id
      ? this.reports().filter((r) => r.lesson_id === chat.lesson_id).flatMap((r) => (r.questions || []).map((q) => q.text)) : [];
    return lessonContext(chat.class, chat.lesson, tasks, notes, questions);
  }

  openChat(body) {
    let chat = body.chat_id ? this.chats.get(String(body.chat_id)) : null;
    if (!chat) chat = this.chats.create({ cls: body.class || null, lesson: body.lesson || null, lessonId: body.lesson_id || null });
    return chat;
  }

  /**
   * The answer arrives piece by piece. onEvent gets the same events the Python server sent:
   * {chat_id,title}, {delta}, {done, chat} or {error}. Abort the signal to stop (the part so far is kept).
   */
  async chatStream(body, onEvent, signal) {
    const text = String(body.message ?? '').trim().slice(0, 4000);
    if (!text) { onEvent({ error: 'empty question' }); return; }
    let chat = this.openChat(body);
    chat = this.chats.append(chat.id, 'user', text);
    const ctx = this.chatContext(chat);
    const parts = [];
    try {
      onEvent({ chat_id: chat.id, title: chat.title });
      for await (const piece of this.tutor.askStream(chat.messages, ctx, !!body.hint, signal)) {
        parts.push(piece);
        onEvent({ delta: piece });
      }
      if (signal && signal.aborted) throw new DOMException('stopped', 'AbortError');
      const answer = parts.join('').trim() || '(empty answer)';
      onEvent({ done: true, chat: this.chats.append(chat.id, 'assistant', answer) });
    } catch (e) {
      if (e && e.name === 'AbortError') {             // Stop pressed
        if (parts.length) this.chats.append(chat.id, 'assistant', `${parts.join('').trim()}\n\n*(stopped)*`);
        return;
      }
      onEvent({ error: e instanceof AIError ? e.message : `${e && e.name}: ${e && e.message}` });
    }
  }

  async askAI(body) {
    const text = String(body.message ?? '').trim().slice(0, 4000);
    if (!text) return [{ error: 'empty question' }, 400];
    let chat = this.openChat(body);
    chat = this.chats.append(chat.id, 'user', text);
    try {
      const answer = await this.tutor.ask(chat.messages, this.chatContext(chat), !!body.hint);
      return [{ chat: this.chats.append(chat.id, 'assistant', answer) }, 200];
    } catch (e) {
      return [{ error: e.message, chat: this.chats.get(chat.id) }, e instanceof AIError ? 502 : 500];
    }
  }

  // ------------------------------------------------------------------ "HTTP" routing
  /** Same paths as server.py. Returns {status, data}. */
  async request(path, body) {
    const url = new URL(path, 'http://lumen.local');
    const p = url.pathname;
    const q = Object.fromEntries(url.searchParams);
    const ok = (data, status = 200) => ({ status, data });
    try {
      if (body === undefined) return ok(...[].concat(await this.get(p, q)));
      return ok(...[].concat(await this.post(p, body || {})));
    } catch (e) {
      console.error(p, e);
      return ok({ error: `${e.name}: ${e.message}` }, 500);
    }
  }

  get(p, q) {
    if (p === '/api/todos') return { items: this.todos.list(q.class ?? null) };
    if (p === '/api/notes') return { notes: this.notes.list({ lessonId: q.lesson || null, cls: q.class || null }) };
    if (p === '/api/chats') return { chats: this.chats.list(), ai: this.tutor.status() };
    if (p.startsWith('/api/chats/')) { const c = this.chats.get(p.split('/').at(-1)); return c ? [c] : [{ error: 'not found' }, 404]; }
    if (p === '/api/ai/status') return this.tutor.status();
    if (p === '/api/state') {
      return { active: this.tracker !== null || this.check !== null, snapshot: this.snapshot(), last_report: this.lastReportId, last_check: this.lastCheckId };
    }
    if (p === '/api/overview' || p === '/api/sessions') return this.overview();
    if (p.startsWith('/api/sessions/')) { const r = this.db.get('sessions', p.split('/').at(-1)); return r ? [r] : [{ error: 'not found' }, 404]; }
    if (p === '/api/checks') {
      // every saved accuracy check, newest first (small summaries, for the list and comparisons)
      const list = this.db.list('checks').sort((x, y) => y.started_at - x.started_at).map((c) => ({
        id: c.id, started_at: c.started_at, accuracy: c.accuracy, balanced_accuracy: c.balanced_accuracy, n: c.n,
        personal: !!(c.profile_used && Object.keys(c.profile_used).length) }));
      return { checks: list };
    }
    if (p.startsWith('/api/checks/')) { const c = this.db.get('checks', p.split('/').at(-1)); return c ? [c] : [{ error: 'not found' }, 404]; }
    if (p === '/api/profile') return { profile: this.profile() };
    if (p === '/api/reviews') return this.reviews.overview();
    if (p === '/api/week') {
      const w = stats.weekly(this.reports(), this.reviews.load());
      // easier numbers for the page: lessons (paused parts of one lesson count once) and phone pickups as a count
      const now = Date.now() / 1000, d0 = new Date(); d0.setHours(0, 0, 0, 0);
      const from = d0.getTime() / 1000 - 6 * 86400, prevFrom = from - 7 * 86400;
      const span = (a, b) => this.reports().filter((r) => r.started_at >= a && r.started_at < b);
      const count = (rs) => ({ lessons: new Set(rs.map((r) => r.lesson_id || r.id)).size,
        pickups: rs.reduce((n, r) => n + (r.pickups || []).length, 0) });
      Object.assign(w.this, count(span(from, now + 1)));
      Object.assign(w.prev, count(span(prevFrom, from)));
      return w;
    }
    if (p === '/api/settings') return this.settings();
    if (p === '/api/friend') return this.friend();
    if (p === '/api/parent') return this.parentInfo();
    if (p === '/api/dream') return this.dream();
    if (p === '/api/stars') {                       // the stars of one lesson (for its report)
      const one = lessonStars(this.reports()).find((x) => x.lesson_id === q.lesson);
      return one || { stars: 0, focus: 0, nophone: 0, record: 0 };
    }
    if (p === '/api/mini') return this.mini();
    if (p === '/api/export') return { app: 'lumen', version: 1, exported_at: Date.now() / 1000, data: this.exportData() };
    return [{ error: 'not found' }, 404];
  }

  // ------------------------------------------------------------------ Lumen mini (the small window)
  mini() {
    const st = this.settings(), reps = this.reports(), now = Date.now() / 1000;
    const today0 = stats.startOfDay(now);
    const sums = reps.map(stats.summary);
    const todaySums = sums.filter((s) => s.started_at >= today0);
    const f = this.friend();
    const snap = this.snapshot();
    return {
      goal: stats.goalInfo(sums, st.daily_goal_min, now, st.streak_min),
      today: { study_min: Math.round(todaySums.reduce((a, s) => a + s.duration_sec, 0) / 60),
        focused_min: todaySums.reduce((a, s) => a + (s.focused_min || 0), 0), lessons: new Set(todaySums.map((s) => s.lesson_id)).size },
      mood_today: stats.moodMix(todaySums), mood_week: stats.moodMix(sums.filter((s) => s.started_at >= today0 - 6 * 86400)),
      dream: this.dream().current,
      last_lesson_at: reps.reduce((a, r) => Math.max(a, (r.started_at || 0) + (r.duration_sec || 0)), 0) || null,
      lumi: { stage: f.stage, light: f.light, outfit: f.outfit, birthday: f.birthday },
      stars: (() => { const d = this.dream(); return { total: d.stars_total, today: d.stars_today }; })(),
      active: snap && snap.mode === 'session' ? { title: snap.title, class: snap.class, attention: snap.attention, state: snap.state, reason: snap.reason, elapsed: snap.elapsed } : null,
    };
  }

  /** Re-read lessons and Lumi's data from the cloud (signed-in accounts), unless a lesson runs here. */
  async pullCloud() {
    const ad = this.db.adapter;
    if (!ad || typeof ad.pull !== 'function' || this.tracker || this.check) return false;
    try {
      for (const { coll, doc } of await ad.pull(['sessions', 'kv', 'reviews'])) this.db._coll(coll).set(doc.id, doc);
      return true;
    } catch { return false; }
  }

  // ------------------------------------------------------------------ parent mode
  // A 4-digit PIN (stored only as a salted SHA-256 hash) protects the parent page and the
  // AI tutor switch. It keeps children from changing it by accident; it is not a bank vault:
  // someone with full access to the computer and browser tools could still get around it.
  parentInfo() {
    const p = this.db.getValue('parent') || {};
    return { enabled: !!p.hash, ai_allowed: p.hash ? !!p.ai_allowed : true };
  }

  async pinHash(pin, salt) {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${pin}`));
    return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async pinOk(pin) {
    const p = this.db.getValue('parent') || {};
    return !!p.hash && (await this.pinHash(String(pin ?? ''), p.salt)) === p.hash;
  }

  /** body: {set_pin, pin?} | {verify, pin} | {pin, ai_allowed} | {pin, disable} */
  async parentPost(body) {
    const p = this.db.getValue('parent') || {};
    if (body.set_pin !== undefined) {
      if (p.hash && !(await this.pinOk(body.pin))) return [{ error: 'Wrong PIN' }, 403];
      if (!/^\d{4}$/.test(String(body.set_pin))) return [{ error: 'The PIN must be 4 digits' }, 400];
      const salt = [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, '0')).join('');
      this.db.setValue('parent', { ...p, hash: await this.pinHash(String(body.set_pin), salt), salt,
        ai_allowed: p.hash ? !!p.ai_allowed : false });       // new parent mode: the AI tutor starts switched off
      return this.parentInfo();
    }
    if (!(await this.pinOk(body.pin))) return [{ ok: false, error: 'Wrong PIN' }, 403];
    if (body.verify) return { ok: true, email: p.email || '' };
    if (typeof body.email === 'string') {
      const e = body.email.trim().slice(0, 120);
      if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return [{ error: 'Not an email address' }, 400];
      this.db.setValue('parent', { ...p, email: e });
      return this.parentInfo();
    }
    if (body.disable) { this.db.setValue('parent', {}); return this.parentInfo(); }
    if (typeof body.ai_allowed === 'boolean') this.db.setValue('parent', { ...p, ai_allowed: body.ai_allowed });
    return this.parentInfo();
  }

  // ------------------------------------------------------------------ Lumi the firefly (see core/friend.js)
  friend() {
    const f = friendState(this.reports(), this.reviews.load(), this.db.getValue('friend') || {}, this.settings().streak_min);
    f.dream = this.dream().current;                  // Lumi dresses up on the way to a dream
    return f;
  }

  /** body: {outfit} | {seen: true} (news celebrated) | {show_in_lessons} */
  saveFriend(body) {
    const saved = { ...(this.db.getValue('friend') || {}) };
    const st = this.friend();
    if (body.seen) {
      saved.stage = st.stage.index;
    }
    if (typeof body.sound === 'boolean') saved.sound = body.sound;
    // birthday: only month and day ("MM-DD"), never the year, so no age is stored
    if ('birthday' in body) saved.birthday = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(body.birthday || '') ? body.birthday : null;
    if (body.outfit && st.outfits.some((o) => o.id === body.outfit && o.unlocked)) saved.outfit = body.outfit;
    if (typeof body.show_in_lessons === 'boolean') saved.show_in_lessons = body.show_in_lessons;
    this.db.setValue('friend', saved);
    return this.friend();
  }

  // ------------------------------------------------------------------ My dream (see core/dream.js)
  dream() {
    return dreamState(this.reports(), this.db.getValue('dream') || {});
  }

  /**
   * How big a dream is and which emoji shows it: asks the AI tutor when it may answer (it can pick any
   * emoji, not only the ones in the picker), otherwise key words.
   */
  async dreamSize(text) {
    const st = this.tutor.status();
    if (st.ready && st.provider !== 'test') {
      try {
        const answer = await this.tutor.ask([{ role: 'user', content: sizePrompt(text) }]);
        const size = readSize(answer);
        if (size) return { size, emoji: readEmoji(answer) || guessEmoji(text), by: 'ai' };
      } catch { /* no AI now: use the words */ }
    }
    return { size: guessSize(text), emoji: guessEmoji(text), by: 'words' };
  }

  /**
   * body: {price: text} → the price, before saving | {create: {text, emoji, size}, told: true}
   *     | {seen_level: n} | {fulfilled: true} | {remove: true} | {pin, need} (parent changes the price)
   */
  async dreamPost(body) {
    const saved = { done: [], ...(this.db.getValue('dream') || {}) };
    const st = this.dream();
    const clean = (x) => String(x ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
    if (body.price !== undefined) {
      const text = clean(body.price);
      if (!text) return [{ error: 'Write your dream first' }, 400];
      const { size, emoji, by } = await this.dreamSize(text);
      return { size, by, stars: priceOf(size, st.per_day), carry: saved.carry || 0, days: SIZE_DAYS[size], emoji };
    }
    if (body.create) {
      if (st.current) return [{ error: 'You already have a dream' }, 400];
      if (body.told !== true) return [{ error: 'Tell your parents first' }, 400];
      const text = clean(body.create.text);
      if (!text) return [{ error: 'Write your dream first' }, 400];
      const size = SIZE_DAYS[body.create.size] ? body.create.size : (await this.dreamSize(text)).size;
      const emoji = String(body.create.emoji || '').slice(0, 8) || guessEmoji(text);
      saved.current = { id: `d${Date.now().toString(36)}`, text, emoji, size, need: priceOf(size, st.per_day),
        bonus: saved.carry || 0, created_at: Date.now() / 1000, seen_level: 0 };
      delete saved.carry;
      this.db.setValue('dream', saved);
      return this.dream();
    }
    if (!saved.current) return [{ error: 'No dream yet' }, 400];
    if (body.seen_level !== undefined) saved.current.seen_level = Math.max(0, Math.min(4, Number(body.seen_level) || 0));
    if (body.fulfilled) {
      if (!st.current.ready) return [{ error: 'Not enough stars yet' }, 400];
      const { id, text, emoji, need, created_at } = saved.current;
      saved.done = [...saved.done, { id, text, emoji, need, created_at, done_at: Date.now() / 1000 }].slice(-30);
      if (st.current.raw > need) saved.carry = st.current.raw - need;       // extra stars go to the next dream
      delete saved.current;
    }
    if (body.remove) {                                                      // stars are never lost
      if (st.current.raw > 0) saved.carry = st.current.raw;
      delete saved.current;
    }
    if (body.need !== undefined) {
      if (!(await this.pinOk(body.pin))) return [{ error: 'Wrong PIN' }, 403];
      saved.current.need = Math.max(1, Math.min(999, Math.round(Number(body.need) || saved.current.need)));
    }
    this.db.setValue('dream', saved);
    return this.dream();
  }

  exportData() {
    const all = this.db.dump();
    delete all.kv;                                   // settings are exported, AI keys and drafts are not
    all.settings = [{ id: 'settings', value: this.settings() }];
    return all;
  }

  async post(p, body) {
    if (p === '/api/start') {
      const res = await this.start(String(body.class ?? '').slice(0, 60).trim(), String(body.title ?? '').slice(0, 80).trim(),
        body.continue_id, body.tasks, body.rhythm ?? 'default');
      return [res, res.ok ? 200 : 500];
    }
    if (p === '/api/action') {
      const kinds = ['mark', 'mark_note', 'eyes_start', 'break_start', 'break_extend', 'break_end', 'dismiss', 'notes'];
      if (!kinds.includes(body.type)) return [{ error: 'unknown action' }, 400];
      return { ok: this.action(body.type, body) };
    }
    if (p === '/api/task') {
      if (body.add) { const tasks = this.addTask(body.add); return { ok: tasks !== null, tasks: tasks || [] }; }
      return { ok: this.setTask(intOr(body.index, -1), body.done) };
    }
    if (p === '/api/todos') {
      if (body.add) return { item: this.todos.add(body.class, body.add) };
      if (body.delete) { this.todos.delete(String(body.id)); return { ok: true }; }
      return { item: this.todos.update(String(body.id), { done: body.done ?? null, text: body.text ?? null }) };
    }
    if (p === '/api/notes') {
      if (body.new) {
        const snap = this.snapshot() || {};
        const lessonId = body.lesson_id || snap.lesson_id;
        if (!lessonId) return [{ error: 'no lesson' }, 400];
        return { note: this.notes.add(lessonId, body.class || snap.class, body.lesson || snap.title,
          snap.lesson_id === lessonId ? mmss(snap.elapsed || 0) : null, body.color) };
      }
      if (body.delete) { this.notes.delete(String(body.id)); return { ok: true }; }
      return { note: this.notes.update(String(body.id), { text: body.text ?? null, color: body.color ?? null }) };
    }
    if (p === '/api/ai/config') {
      try {
        return await this.tutor.save({ api_key: body.api_key ?? null, model: body.model ?? null, gemini_key: body.gemini_key ?? null });
      } catch (e) {
        if (e instanceof AIError) return [{ error: e.message }, 400];
        throw e;
      }
    }
    if (p === '/api/chat') {
      if (body.external) {
        const chat = this.openChat(body);
        return { chat: this.chats.append(chat.id, 'user', String(body.message ?? '').slice(0, 4000)) };
      }
      return this.askAI(body);
    }
    if (p === '/api/chat/answer') {
      const text = String(body.content ?? '').trim().slice(0, 20000);
      const chat = text ? this.chats.append(String(body.chat_id), 'assistant', text) : null;
      return [{ chat }, chat ? 200 : 400];
    }
    if (p === '/api/chats/rename') return { ok: this.chats.rename(String(body.id), String(body.title ?? '')) };
    if (p === '/api/chats/delete') { this.chats.delete(String(body.id)); return { ok: true }; }
    if (p === '/api/review') return this.reviewAction(body);
    if (p === '/api/settings') return this.saveSettings(body);
    if (p === '/api/friend') return this.saveFriend(body);
    if (p === '/api/parent') return this.parentPost(body);
    if (p === '/api/dream') return this.dreamPost(body);
    if (p === '/api/ping') return { ok: true };
    if (p === '/api/check/start') { const res = await this.startCheck(); return [res, res.ok ? 200 : 500]; }
    if (p === '/api/profile') {
      if (body.reset) { this.db.removeValue('profile'); return { ok: true, profile: null }; }
      const c = this.db.get('checks', String(body.from_check ?? ''));
      if (!c) return [{ error: 'check not found' }, 404];
      const prof = c.tuning.suggested;
      this.db.setValue('profile', prof);
      return { ok: true, profile: prof };
    }
    if (p === '/api/lesson/finish') return { ok: this.finishLesson(String(body.lesson_id ?? '')) };
    if (p === '/api/end') {
      const rep = this.end({ status: body.pause ? 'paused' : 'finished', doneFlags: body.done });
      return rep || { ok: true, cancelled: true };
    }
    if (p === '/api/import') {
      const data = body && body.data;
      if (!data || typeof data !== 'object') return [{ error: 'This file is not a Lumen export.' }, 400];
      const settings = data.settings && data.settings[0] && data.settings[0].value;
      const rest = { ...data };
      delete rest.settings;
      delete rest.kv;
      await this.db.restore(rest);
      if (settings) this.saveSettings(settings);
      return { ok: true, counts: Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, (v || []).length])) };
    }
    return [{ error: 'not found' }, 404];
  }

  async reviewAction(body) {
    const rid = String(body.id ?? '');
    if (body.add) return { item: this.reviews.addManual(body.class, body.add) };
    if ('answer' in body) return { item: this.reviews.setAnswer(rid, body.answer, 'me') };
    if (body.explain) {
      const q = this.reviews.get(rid);
      if (!q) return [{ error: 'not found' }, 404];
      const prompt = `I'm studying ${q.class}${q.title ? `, lesson "${q.title}"` : ''}. I didn't understand this: ${q.text}\n\n`
        + 'Explain it clearly in at most 150 words, with one small example. It will be the back of my flashcard.';
      try {
        const text = await this.tutor.ask([{ role: 'user', content: prompt }]);
        return { item: this.reviews.setAnswer(rid, text, 'ai') };
      } catch (e) {
        if (e instanceof AIError) return [{ error: e.message }, 502];
        throw e;
      }
    }
    if (body.delete) { this.reviews.delete(rid); return { ok: true }; }
    const item = this.reviews.answer(rid, body.result === 'got' ? 'got' : 'again');
    return { ok: item !== null, item };
  }
}
