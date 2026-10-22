// stores.js: class to-do lists, sticky notes, AI chats and review cards (port of store.py and reviews.py).
// Every store works on one collection of the DocDB.
import { newId } from './db.js';

const now = () => Date.now() / 1000;
const DAY = 86400;

// ---------------------------------------------------------------- class to-do lists
export class TodoStore {
  constructor(db) { this.db = db; }

  list(cls = null) {
    return this.db.list('todos').filter((i) => cls === null || cls === undefined || i.class === cls);
  }

  add(cls, text) {
    text = String(text ?? '').trim().slice(0, 120);
    if (!text) return null;
    return this.db.put('todos', { id: newId(), class: String(cls || 'Other').slice(0, 60), text, done: false, created: now(), done_at: null });
  }

  update(id, { done = null, text = null } = {}) {
    const i = this.db.get('todos', id);
    if (!i) return null;
    if (done !== null && done !== undefined) { i.done = !!done; i.done_at = done ? now() : null; }
    if (text !== null && text !== undefined && String(text).trim()) i.text = String(text).trim().slice(0, 120);
    return this.db.put('todos', i);
  }

  delete(id) { this.db.remove('todos', id); }

  /** open to-dos per class, for the Classes page */
  counts() {
    const out = {};
    for (const i of this.db.list('todos')) if (!i.done) out[i.class] = (out[i.class] || 0) + 1;
    return out;
  }
}

// ---------------------------------------------------------------- sticky notes
export const NOTE_COLORS = ['yellow', 'green', 'blue', 'pink', 'purple'];

export class NoteStore {
  constructor(db) { this.db = db; }

  list({ lessonId = null, cls = null } = {}) {
    return this.db.list('notes').filter((n) => (!lessonId || n.lesson_id === lessonId) && (!cls || n.class === cls));
  }

  add(lessonId, cls, title, at, color = 'yellow') {
    return this.db.put('notes', { id: newId(), lesson_id: lessonId, class: cls, lesson: title, at, text: '',
      color: NOTE_COLORS.includes(color) ? color : 'yellow', created: now(), updated: now() });
  }

  update(id, { text = null, color = null } = {}) {
    const n = this.db.get('notes', id);
    if (!n) return null;
    if (text !== null && text !== undefined) n.text = String(text).slice(0, 2000);
    if (NOTE_COLORS.includes(color)) n.color = color;
    n.updated = now();
    return this.db.put('notes', n);
  }

  delete(id) { this.db.remove('notes', id); }
}

// ---------------------------------------------------------------- AI chats
export class ChatStore {
  constructor(db) { this.db = db; }

  list() {
    return this.db.list('chats').sort((a, b) => b.updated - a.updated).map((c) => ({
      id: c.id, title: c.title, class: c.class, lesson: c.lesson, lesson_id: c.lesson_id, updated: c.updated, count: c.messages.length,
    }));
  }

  get(id) { return this.db.get('chats', id); }

  create({ cls = null, lesson = null, lessonId = null } = {}) {
    return this.db.put('chats', { id: newId(), title: 'New question', class: cls, lesson, lesson_id: lessonId,
      created: now(), updated: now(), messages: [] });
  }

  append(id, role, content) {
    const c = this.get(id);
    if (!c) return null;
    c.messages.push({ role, content, t: now() });
    if (role === 'user' && c.title === 'New question') c.title = content.trim().replace(/\n/g, ' ').slice(0, 70);
    c.updated = now();
    return this.db.put('chats', c);
  }

  rename(id, title) {
    title = String(title).trim().slice(0, 80);
    const c = this.get(id);
    if (!c || !title) return false;
    c.title = title;
    this.db.put('chats', c);
    return true;
  }

  delete(id) { this.db.remove('chats', id); }
}

// ---------------------------------------------------------------- review cards (spaced repetition)
// Lumen brings a question back after 1 day, then 3 days, then 7 days.
//   "Got it"         -> next, longer interval (after the 7-day review it is learned)
//   "Still unclear"  -> back to the start: again tomorrow
export const INTERVALS_DAYS = [1, 3, 7];

export class ReviewStore {
  constructor(db) { this.db = db; }

  load() { return this.db.list('reviews'); }
  get(id) { return this.db.get('reviews', id); }

  /** Questions with text from a finished/paused session become review cards. */
  addFromReport(rep) {
    const t = now();
    for (const q of rep.questions || []) {
      if (!q.text) continue;
      this.db.put('reviews', { id: newId(), session_id: rep.id, class: rep.class || 'Other', title: rep.title || '',
        time: q.time, text: q.text, created: t, stage: 0, due: t + INTERVALS_DAYS[0] * DAY, done: false, log: [] });
    }
  }

  addManual(cls, text) {
    text = String(text ?? '').trim().slice(0, 300);
    if (!text) return null;
    const t = now();
    return this.db.put('reviews', { id: newId(), session_id: null, class: String(cls || 'Other').slice(0, 60), title: '',
      time: '', text, created: t, stage: 0, due: t, done: false, log: [] });
  }

  setAnswer(id, answer, source = 'me') {
    const it = this.get(id);
    if (!it) return null;
    it.answer = String(answer).trim().slice(0, 4000);
    it.answer_source = source;
    return this.db.put('reviews', it);
  }

  answer(id, result) {
    const it = this.get(id);
    if (!it) return null;
    const t = now();
    it.log.push({ at: t, result });
    if (result === 'got') {
      it.stage += 1;
      if (it.stage >= INTERVALS_DAYS.length) it.done = true;
      else it.due = t + INTERVALS_DAYS[it.stage] * DAY;
    } else {
      it.stage = 0;
      it.due = t + INTERVALS_DAYS[0] * DAY;
    }
    return this.db.put('reviews', it);
  }

  delete(id) { this.db.remove('reviews', id); }

  overview(at = now()) {
    const items = this.load();
    const active = items.filter((it) => !it.done);
    const due = active.filter((it) => it.due <= at).sort((a, b) => a.due - b.due);
    const upcoming = active.filter((it) => it.due > at).sort((a, b) => a.due - b.due);
    const lastAt = (it) => (it.log.length ? it.log.at(-1).at : 0);
    const learned = items.filter((it) => it.done).sort((a, b) => lastAt(b) - lastAt(a));
    const day = (ts) => new Date(ts * 1000).toDateString();
    const days = new Set(items.flatMap((it) => it.log.map((e) => day(e.at))));
    const today = day(at);
    let streak = 0, d = days.has(today) ? at : at - DAY;
    while (days.has(day(d))) { streak += 1; d -= DAY; }
    return {
      due, upcoming, learned: learned.slice(0, 30), done: learned.length, total: items.length, intervals: INTERVALS_DAYS,
      reviewed_today: items.reduce((a, it) => a + it.log.filter((e) => day(e.at) === today).length, 0),
      streak, next_due: upcoming.length ? upcoming[0].due : null,
    };
  }
}
