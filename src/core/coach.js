// coach.js: what Lumi says after a lesson. Everything is counted from the lessons themselves,
// the child never has to type anything.
//
//   * personal records: the longest focus, the most focused minutes, the longest lesson without the phone
//   * a habit: studying at about the same time several days in a row
//   * kind words after a hard lesson: never a scolding, always one real good thing from that lesson

import { dayKey } from './stats.js';

const focusedShare = (r) => (r.duration_sec ? (r.focused_min || 0) * 60 / r.duration_sec : 0);
const phoneFree = (r) => ((r.pickups || []).length ? 0 : Math.floor((r.duration_sec || 0) / 60));

/**
 * New personal records in this lesson, compared with all the lessons before it.
 * Only after 3 earlier lessons (a "record" in the first lesson means nothing), and only meaningful sizes.
 * @returns {{kind:string, value:number, before:number}[]}
 */
export function recordsOf(rep, past) {
  const before = past.filter((r) => r && r.id !== rep.id && r.started_at < rep.started_at && (r.duration_sec || 0) >= 5 * 60);
  if (before.length < 3) return [];
  const out = [];
  const check = (kind, value, prev, min) => { if (value >= min && value > prev) out.push({ kind, value, before: prev }); };
  check('focus', rep.longest_focus || 0, Math.max(0, ...before.map((r) => r.longest_focus || 0)), 5);
  check('focused', rep.focused_min || 0, Math.max(0, ...before.map((r) => r.focused_min || 0)), 10);
  check('nophone', phoneFree(rep), Math.max(0, ...before.map(phoneFree)), 15);
  return out;
}

/**
 * A study habit: the first lesson of the day started at about the same time (within 45 minutes)
 * on at least 3 days in a row, ending today. Returns the usual time ("17:00") and the number of days.
 */
export function habitOf(reports, now = Date.now() / 1000) {
  const firstOfDay = {};
  for (const r of reports) {
    if (!r || !r.started_at || (r.duration_sec || 0) < 5 * 60) continue;
    const k = dayKey(r.started_at);
    if (!firstOfDay[k] || r.started_at < firstOfDay[k]) firstOfDay[k] = r.started_at;
  }
  const minutesOfDay = (ts) => { const d = new Date(ts * 1000); return d.getHours() * 60 + d.getMinutes(); };
  const days = [];
  for (let i = 0; i < 14; i += 1) {
    const k = dayKey(now - i * 86400);
    if (!firstOfDay[k]) break;
    days.push(minutesOfDay(firstOfDay[k]));
  }
  if (days.length < 3) return null;
  // the longest run (from today back) whose times all lie within 45 minutes of each other
  let n = 0, lo = Infinity, hi = -Infinity;
  for (const m of days) {
    lo = Math.min(lo, m); hi = Math.max(hi, m);
    if (hi - lo > 45) break;
    n += 1;
  }
  if (n < 3) return null;
  const avg = days.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const rounded = Math.round(avg / 15) * 15;
  return { time: `${String(Math.floor(rounded / 60) % 24).padStart(2, '0')}:${String(rounded % 60).padStart(2, '0')}`, days: n };
}

/** A hard lesson: attention mostly low. Nothing to scold, so Lumi finds one real good thing in it. */
export function isHard(rep) {
  return (rep.duration_sec || 0) >= 5 * 60 && ((rep.avg_attention ?? 100) < 55 || focusedShare(rep) < 0.4);
}

/**
 * One true good thing about a lesson, as [text, values] for the translator.
 * Ordered from the most to the least specific.
 */
export function goodThing(rep) {
  const mins = Math.max(1, Math.round((rep.duration_sec || 0) / 60));
  if (!(rep.pickups || []).length && mins >= 10) return ['You didn\'t touch your phone for the whole {n} minutes. That takes real strength!', { n: mins }];
  if ((rep.longest_focus || 0) >= 5) return ['You still had {n} minutes in a row of real focus.', { n: rep.longest_focus }];
  if ((rep.breaks || 0) > 0) return ['You took a break when you needed it. That is smart, not lazy.', {}];
  if ((rep.away_count || 0) > 0) return ['Every time you got distracted, you came back. Coming back is the most important skill.', {}];
  return ['You sat down and started. On hard days, that is the biggest step.', { n: mins }];
}

/** Everything Lumi says on the lesson report. */
export function lessonWords(rep, all, now = Date.now() / 1000) {
  const past = all.filter((r) => r.id !== rep.id);
  return {
    records: rep.records || recordsOf(rep, past),
    hard: isHard(rep),
    good: goodThing(rep),
    habit: habitOf(all, now),
  };
}
