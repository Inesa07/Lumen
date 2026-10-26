// friend.js: Lumi the firefly and the achievements that make it grow.
//
// Everything here is a pure function of the saved lessons and review cards, so Lumi's growth
// needs no extra storage: it is recomputed from your history (and survives export / import).
// Only two small things are stored (kv 'friend'): which achievements you have already seen
// celebrated, and which outfit Lumi wears.
//
// It is a tiny "rules engine": each achievement is a rule (a metric + target numbers);
// after every lesson all rules are checked again and new tiers are celebrated.

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

/** Light rewards for reaching tier 1, 2, 3 of an achievement (bronze, silver, gold). */
export const TIER_REWARD = [10, 25, 60];
export const TIER_NAME = ['Bronze', 'Silver', 'Gold'];

/**
 * The achievements. `metric` names a number from metrics(); `tiers` are the targets.
 * They reward good habits (planning, eye rests, reviewing, coming back), not just hours,
 * and never compare you with other people.
 */
export const ACHIEVEMENTS = [
  { id: 'lessons', icon: '📚', name: 'Learner', metric: 'lessons', tiers: [1, 10, 50], unit: 'lesson',
    what: 'Finish lessons with Lumi.' },
  { id: 'focus', icon: '🔆', name: 'Light collector', metric: 'focused_min', tiers: [60, 300, 1000], unit: 'focused minute',
    what: 'Minutes in which you were really with the lesson.' },
  { id: 'deep', icon: '🎧', name: 'Deep diver', metric: 'longest_focus', tiers: [10, 20, 35], unit: 'minute', single: true,
    what: 'Stay focused without a pause for a long time, in one lesson.' },
  { id: 'plan', icon: '🎯', name: 'Planner', metric: 'plans_done', tiers: [1, 10, 30], unit: 'lesson',
    what: 'Plan tasks before a lesson and finish all of them.' },
  { id: 'eyes', icon: '👀', name: 'Eye care', metric: 'eye_rests', tiers: [3, 20, 75], unit: 'eye rest',
    what: 'Rest your eyes when Lumen asks (look far away for 20 seconds).' },
  { id: 'review', icon: '🧠', name: 'Memory master', metric: 'reviews_got', tiers: [5, 30, 100], unit: 'card',
    what: 'Answer review cards you remembered ("Got it").' },
  { id: 'streak', icon: '🔥', name: 'Day by day', metric: 'best_streak', tiers: [3, 7, 21], unit: 'day', single: true,
    what: 'Study several days in a row (your best run counts, so a missed day never takes it away).' },
  { id: 'phonefree', icon: '📵', name: 'Phone-free', metric: 'phone_free', tiers: [1, 10, 30], unit: 'lesson',
    what: 'Lessons of 20+ minutes without picking up the phone.' },
  { id: 'early', icon: '🌅', name: 'Early bird', metric: 'early', tiers: [1, 5, 20], unit: 'lesson',
    what: 'Start a lesson in the morning, before 10:00.' },
  { id: 'grow', icon: '📈', name: 'Growing', metric: 'better_weeks', tiers: [1, 4, 10], unit: 'week',
    what: 'A week with more focused time than the week before.' },
  { id: 'comeback', icon: '🤗', name: 'Welcome back', metric: 'comebacks', tiers: [1, 3, 6], unit: 'time',
    what: 'Come back to studying after a pause of 3 days or more. Coming back is a skill too!' },
];

/** Outfits Lumi can wear, and how to unlock each one. */
export const OUTFITS = [
  { id: 'none', name: 'Just Lumi', how: 'always' },
  { id: 'bow', name: 'Bow', stage: 1, how: 'Reach stage “Little light”' },
  { id: 'cap', name: 'Graduation cap', ach: ['lessons', 2], how: 'Learner · Silver' },
  { id: 'headphones', name: 'Headphones', ach: ['deep', 1], how: 'Deep diver · Bronze' },
  { id: 'glasses', name: 'Smart glasses', ach: ['review', 2], how: 'Memory master · Silver' },
  { id: 'scarf', name: 'Cosy scarf', ach: ['streak', 2], how: 'Day by day · Silver' },
  { id: 'flower', name: 'Flower', ach: ['eyes', 1], how: 'Eye care · Bronze' },
  { id: 'crown', name: 'Crown', stage: 5, how: 'Reach stage “Star firefly”' },
];

const pad = (n) => String(n).padStart(2, '0');
const dayKey = (ts) => { const d = new Date(ts * 1000); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const dayStart = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d).getTime() / 1000; };
/** Monday of the week, as a day key: lessons in the same week share it. */
const weekKey = (ts) => { const d = new Date(ts * 1000); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dayKey(d.getTime() / 1000); };

/**
 * All the numbers the achievements look at.
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
  const days = Object.keys(studyDay).filter((k) => studyDay[k] >= streakMin).map(dayStart).sort((a, b) => a - b);
  let best = 0, run = 0, prev = null;
  for (const d of days) {
    run = prev !== null && Math.round((d - prev) / DAY) === 1 ? run + 1 : 1;
    best = Math.max(best, run); prev = d;
  }
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

/** For each achievement: reached tier (0 = none, 1..3), progress to the next one. */
export function evaluate(m) {
  return ACHIEVEMENTS.map((a) => {
    const value = m[a.metric] || 0;
    const tier = a.tiers.filter((t) => value >= t).length;
    const next = tier < a.tiers.length ? a.tiers[tier] : null;
    const from = tier ? a.tiers[tier - 1] : 0;
    const pct = next === null ? 100 : Math.max(0, Math.min(100, Math.round(100 * (value - from) / (next - from))));
    return { id: a.id, icon: a.icon, name: a.name, what: a.what, unit: a.unit, single: !!a.single,
      tiers: a.tiers, value, tier, next, pct };
  });
}

/** Light = 1 per focused minute + the rewards of every tier reached. */
export function lightOf(m, evals) {
  return m.focused_min + evals.reduce((a, e) => a + TIER_REWARD.slice(0, e.tier).reduce((x, y) => x + y, 0), 0);
}

/** Stage index (0..5) for an amount of light, with the progress to the next stage. */
export function stageOf(light) {
  let i = 0;
  while (i + 1 < STAGES.length && light >= STAGES[i + 1].need) i += 1;
  const next = STAGES[i + 1] || null;
  const pct = next ? Math.round(100 * (light - STAGES[i].need) / (next.need - STAGES[i].need)) : 100;
  return { index: i, ...STAGES[i], next: next ? { need: next.need, name: next.name } : null, pct };
}

export function outfitsFor(stageIndex, evals) {
  const tierOf = Object.fromEntries(evals.map((e) => [e.id, e.tier]));
  return OUTFITS.map((o) => ({ ...o,
    unlocked: o.id === 'none' || (o.stage != null ? stageIndex >= o.stage : (tierOf[o.ach[0]] || 0) >= o.ach[1]) }));
}

/**
 * What changed since the user last saw Lumi: new achievement tiers and a new stage.
 * @param {{seen?: object, stage?: number}} saved what was already celebrated
 */
export function newsSince(saved, evals, stageIndex) {
  const seen = (saved && saved.seen) || {};
  const tiers = evals.filter((e) => e.tier > (seen[e.id] || 0)).map((e) => ({ id: e.id, icon: e.icon, name: e.name, tier: e.tier }));
  const grew = saved && saved.stage != null && stageIndex > saved.stage ? stageIndex : null;
  return { tiers, grew };
}

/** Everything the pages need about Lumi, in one object. */
export function friendState(sessions, reviews, saved = {}, streakMin = 10) {
  const m = metrics(sessions, reviews, streakMin);
  const evals = evaluate(m);
  const light = lightOf(m, evals);
  const stage = stageOf(light);
  const outfits = outfitsFor(stage.index, evals);
  const outfit = outfits.find((o) => o.id === saved.outfit && o.unlocked) ? saved.outfit : 'none';
  return { metrics: m, achievements: evals, light, stage, stages: STAGES, outfits, outfit,
    news: newsSince(saved, evals, stage.index), first_time: !saved.seen, show_in_lessons: saved.show_in_lessons !== false };
}
