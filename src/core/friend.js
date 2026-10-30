// friend.js: Lumi the firefly.
//
// One simple rule: every minute you really focus gives Lumi 1 light, and with enough light Lumi grows
// (6 stages). Each new stage also gives Lumi a new outfit. (Stars for the dream are separate: see dream.js.)
// Everything is a pure function of the saved lessons, so nothing extra needs storing except which stage
// was already celebrated and which outfit Lumi wears (kv 'friend').

import { streakRun } from './stats.js';

const DAY = 86400;

/** Lumi's growth stages. `need` = light needed to reach the stage. */
export const STAGES = [
  { need: 0, name: 'Spark', line: 'A tiny spark of light. It just hatched and is curious about everything.' },
  { need: 30, name: 'Little light', line: 'Lumi learned to fly! Short trips only, still a bit wobbly.' },
  { need: 120, name: 'Firefly', line: 'A real firefly now, with strong wings and a warm glow.' },
  { need: 300, name: 'Bright firefly', line: 'Lumi shines so bright that other fireflies come to look.' },
  { need: 600, name: 'Glowing firefly', line: 'A glow you can see from far away, like a little lantern.' },
  { need: 1200, name: 'Star firefly', line: 'Lumi shines like a star. Legend says it can light up a whole night sky.' },
];

/** Outfits: a new stage gives Lumi new clothes. */
export const OUTFITS = [
  { id: 'none', name: 'Just Lumi', stage: 0 },
  { id: 'bow', name: 'Bow', stage: 1 },
  { id: 'scarf', name: 'Cosy scarf', stage: 2 },
  { id: 'flower', name: 'Flower', stage: 2 },
  { id: 'headphones', name: 'Headphones', stage: 3 },
  { id: 'glasses', name: 'Smart glasses', stage: 3 },
  { id: 'cap', name: 'Graduation cap', stage: 4 },
  { id: 'crown', name: 'Crown', stage: 5 },
];

const pad = (n) => String(n).padStart(2, '0');
const dayKey = (ts) => { const d = new Date(ts * 1000); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const dayStart = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d).getTime() / 1000; };
/** Monday of the week, as a day key: lessons in the same week share it. */
const weekKey = (ts) => { const d = new Date(ts * 1000); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dayKey(d.getTime() / 1000); };

/**
 * Numbers about the lessons (for the parent page and the weekly report).
 * @param {object[]} sessions saved lesson reports (paused parts included)
 * @param {object[]} reviews review cards
 * @param {number} streakMin minutes a day must have to count for the streak
 */
export function metrics(sessions, reviews = [], streakMin = 10) {
  const s = sessions.filter((r) => r && r.started_at);
  const finished = s.filter((r) => r.status !== 'paused');
  const studyDay = {};
  const weekFocus = {};
  for (const r of s) {
    const k = dayKey(r.started_at);
    studyDay[k] = (studyDay[k] || 0) + (r.duration_sec || 0) / 60;
    const w = weekKey(r.started_at);
    weekFocus[w] = (weekFocus[w] || 0) + (r.focused_min || 0);
  }
  // best run of days in a row with at least streakMin minutes
  const best = streakRun(Object.keys(studyDay).filter((k) => studyDay[k] >= streakMin)).best;
  // coming back after a pause of 3+ days (any study day counts)
  const all = Object.keys(studyDay).map(dayStart).sort((a, b) => a - b);
  let comebacks = 0;
  for (let i = 1; i < all.length; i += 1) if (Math.round((all[i] - all[i - 1]) / DAY) >= 4) comebacks += 1;
  // weeks that beat the week before (consecutive weeks only)
  const weeks = Object.keys(weekFocus).sort();
  let better = 0;
  for (let i = 1; i < weeks.length; i += 1) {
    const gap = Math.round((dayStart(weeks[i]) - dayStart(weeks[i - 1])) / DAY);
    if (gap === 7 && weekFocus[weeks[i - 1]] > 0 && weekFocus[weeks[i]] > weekFocus[weeks[i - 1]]) better += 1;
  }
  const hour = (r) => new Date(r.started_at * 1000).getHours();
  return {
    lessons: finished.length,
    focused_min: Math.round(s.reduce((a, r) => a + (r.focused_min || 0), 0)),
    longest_focus: s.reduce((a, r) => Math.max(a, r.longest_focus || 0), 0),
    plans_done: s.filter((r) => r.outcome === 'yes').length,
    eye_rests: s.reduce((a, r) => a + (r.eye_rests || 0), 0),
    reviews_got: reviews.reduce((a, c) => a + (c.log || []).filter((l) => l.result === 'got').length, 0),
    best_streak: best,
    phone_free: s.filter((r) => (r.duration_sec || 0) >= 20 * 60 && !(r.pickups || []).length).length,
    early: s.filter((r) => hour(r) >= 5 && hour(r) < 10).length,
    better_weeks: better,
    comebacks,
  };
}

/** Light = 1 per focused minute. That is all, so a child can understand it. */
export function lightOf(m) {
  return m.focused_min;
}

/** Stage index (0..5) for an amount of light, with the progress to the next stage. */
export function stageOf(light) {
  let i = 0;
  while (i + 1 < STAGES.length && light >= STAGES[i + 1].need) i += 1;
  const next = STAGES[i + 1] || null;
  const pct = next ? Math.round(100 * (light - STAGES[i].need) / (next.need - STAGES[i].need)) : 100;
  return { index: i, ...STAGES[i], next: next ? { need: next.need, name: next.name } : null, pct };
}

export function outfitsFor(stageIndex) {
  return OUTFITS.map((o) => ({ ...o, unlocked: stageIndex >= o.stage }));
}

/** A new stage since the user last saw Lumi (with the outfits it brought). */
export function newsSince(saved, stageIndex) {
  const grew = saved && saved.stage != null && stageIndex > saved.stage ? stageIndex : null;
  return { grew, outfits: grew == null ? [] : OUTFITS.filter((o) => o.stage > saved.stage && o.stage <= stageIndex).map((o) => o.name) };
}

/**
 * Lumi's diary: one page per study day, a few kind sentences per lesson, newest day first.
 * Sentences are data ({k: key, n: number…}) so the page can show them in any language.
 */
export function diaryOf(sessions, maxDays = 120) {
  const lessons = new Map();
  for (const r of sessions.filter((x) => x && x.started_at)) {
    const k = r.lesson_id || r.id;
    const a = lessons.get(k) || { id: r.id, title: r.title || 'a lesson', cls: r.class || '', started_at: r.started_at,
      dur: 0, focused: 0, longest: 0, pickups: 0, eyes: 0, questions: 0, fell: null, outcome: null };
    a.dur += (r.duration_sec || 0) / 60; a.focused += r.focused_min || 0; a.longest = Math.max(a.longest, r.longest_focus || 0);
    a.pickups += (r.pickups || []).length; a.eyes += r.eye_rests || 0;
    a.questions += (r.questions || []).filter((q) => q.text).length;
    a.fell = a.fell ?? r.fell_after ?? null; a.outcome = r.outcome ?? a.outcome;
    a.started_at = Math.min(a.started_at, r.started_at); a.id = r.id;
    lessons.set(k, a);
  }
  const days = new Map();
  for (const a of [...lessons.values()].sort((x, y) => x.started_at - y.started_at)) {
    const dur = Math.max(1, Math.round(a.dur));
    const share = a.focused / dur;
    const lines = [{ k: 'open', title: a.title, cls: a.cls, n: dur }];
    lines.push({ k: share >= 0.75 ? 'focus_super' : share >= 0.5 ? 'focus_good' : 'focus_hard' });
    if (a.longest >= 15) lines.push({ k: 'longest', n: a.longest });
    if (a.outcome === 'yes') lines.push({ k: 'plan_all' });
    else if (a.outcome === 'partly') lines.push({ k: 'plan_part' });
    if (dur >= 20 && !a.pickups) lines.push({ k: 'no_phone' });
    else if (a.pickups) lines.push({ k: 'phone', n: a.pickups });
    if (a.eyes) lines.push({ k: 'eyes', n: a.eyes });
    if (a.questions) lines.push({ k: 'questions', n: a.questions });
    if (a.fell && a.fell >= 10 && share < 0.75) lines.push({ k: 'fell', n: a.fell });
    const key = dayKey(a.started_at);
    if (!days.has(key)) days.set(key, { day: key, ts: dayStart(key), lessons: [] });
    days.get(key).lessons.push({ id: a.id, lines: lines.slice(0, 5) });
  }
  return [...days.values()].sort((x, y) => y.ts - x.ts).slice(0, maxDays);
}

/**
 * How long Lumi has been waiting (calendar days since the last lesson day):
 * 0 = studied today (happy), 1 = yesterday (waiting), 2-3 = misses you, 4+ (3 whole days missed) = fell asleep.
 * back = studied today after missing at least one whole day, so Lumi can say "You're back!".
 */
export function awayOf(sessions, now = Date.now() / 1000) {
  const days = [...new Set(sessions.filter((r) => r && r.started_at).map((r) => dayKey(r.started_at)))].sort();
  if (!days.length) return { days: null, mood: 'waiting', back: false };
  const today = dayKey(now);
  const diff = (a, b) => Math.round((dayStart(a) - dayStart(b)) / DAY);
  const last = days[days.length - 1];
  const daysAway = Math.max(0, diff(today, last));
  const before = days.filter((k) => k < today).pop();
  return {
    days: daysAway,
    mood: daysAway === 0 ? 'happy' : daysAway === 1 ? 'waiting' : daysAway <= 3 ? 'missing' : 'asleep',
    back: daysAway === 0 && !!before && diff(today, before) >= 2,
  };
}

export function friendState(sessions, reviews, saved = {}, streakMin = 10) {
  const m = metrics(sessions, reviews, streakMin);
  const light = lightOf(m);
  const stage = stageOf(light);
  const outfits = outfitsFor(stage.index);
  const outfit = outfits.find((o) => o.id === saved.outfit && o.unlocked) ? saved.outfit : 'none';
  return { metrics: m, light, stage, stages: STAGES, outfits, outfit, news: newsSince(saved, stage.index),
    diary: diaryOf(sessions, 7), first_time: saved.stage == null, show_in_lessons: saved.show_in_lessons !== false,
    sound: saved.sound !== false, birthday: saved.birthday || null, away: awayOf(sessions) };
}
