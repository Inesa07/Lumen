// stats.js: turns saved lesson reports into the numbers for the Home, Classes, Stats and
// History pages (port of stats.py).
//
// Vocabulary
//   class  = a subject or course you study, e.g. "Linear algebra"
//   lesson = one lecture / video of that class; it can take several sittings
//   part   = one sitting (one camera session). Pause today, continue tomorrow = part 2.
import { pyRound, median } from './util.js';

const DAY = 86400;
const DAY_PARTS = [['Morning', 5, 12], ['Afternoon', 12, 17], ['Evening', 17, 22], ['Night', 22, 29]];

const local = (ts) => new Date(ts * 1000);
export function dayKey(ts) {
  const d = local(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const weekday = (ts) => local(ts).toLocaleDateString('en-US', { weekday: 'short' });
const dayMonth = (ts) => {
  const d = local(ts);
  return `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleDateString('en-US', { month: 'short' })}`;
};
/** Midnight (local time) of the day that contains `ts`, in seconds. */
export function startOfDay(ts) {
  const d = local(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime() / 1000;
}
const sum = (arr, f = (x) => x) => arr.reduce((a, x) => a + f(x), 0);
const groupBy = (arr, key) => {
  const m = new Map();
  for (const x of arr) { const k = key(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); }
  return m;
};

export function dayPart(hour) {
  const h = hour >= 5 ? hour : hour + 24;
  for (const [name, a, b] of DAY_PARTS) if (a <= h && h < b) return name;
  return 'Night';
}

export const classOf = (r) => r.class || 'Other';

/** Small version of one report, for lists. */
export function summary(r) {
  const tasks = r.tasks || [];
  return {
    id: r.id, class: classOf(r), title: r.title,
    lesson_id: r.lesson_id || r.id, part: r.part ?? 1,
    status: r.status || 'finished', auto_paused: r.auto_paused ?? null,
    started_at: r.started_at, duration_sec: r.duration_sec,
    avg_attention: r.avg_attention, focused_min: r.focused_min || 0,
    away_count: r.away_count || 0, pickups: (r.pickups || []).length,
    breaks: r.breaks || 0, marks: r.marks || 0,
    rewatch: (r.rewatch || []).length, longest_focus: r.longest_focus || 0,
    intention: r.intention || '', outcome: r.outcome ?? null,
    tasks_total: tasks.length, tasks_done: tasks.filter((t) => t.done).length,
    mood: (r.mood || {}).pct ?? null,
  };
}

/** Average mood shares over many sessions, weighted by how long each session was. */
export function moodMix(sums) {
  const acc = {};
  let totalSec = 0;
  for (const s of sums) {
    if (!s.mood) continue;
    totalSec += s.duration_sec;
    for (const [k, v] of Object.entries(s.mood)) acc[k] = (acc[k] || 0) + v * s.duration_sec;
  }
  if (!totalSec) return null;
  return Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, Math.trunc(pyRound(v / totalSec))]));
}

export function weightedAvg(items) {
  const total = sum(items, (i) => i.duration_sec);
  if (!total) return null;
  return Math.trunc(pyRound(sum(items, (i) => i.avg_attention * i.duration_sec) / total));
}

/** Group parts into lessons. A lesson's status is the status of its latest part. */
export function lessons(sums) {
  const out = [];
  for (const [lid, parts] of groupBy(sums, (s) => s.lesson_id)) {
    parts.sort((a, b) => a.started_at - b.started_at);
    const last = parts.at(-1);
    out.push({
      lesson_id: lid, class: last.class, title: last.title,
      parts: parts.length, status: last.status, auto_paused: last.auto_paused,
      last_id: last.id, first_at: parts[0].started_at, last_at: last.started_at,
      study_min: pyRound(sum(parts, (p) => p.duration_sec) / 60),
      focused_min: sum(parts, (p) => p.focused_min),
      avg_attention: weightedAvg(parts),
      part_ids: parts.map((p) => p.id),
    });
  }
  return out.sort((a, b) => b.last_at - a.last_at);
}

export function classes(sums, lessonsList) {
  const out = [];
  for (const [name, items] of groupBy(sums, (s) => s.class)) {
    items.sort((a, b) => a.started_at - b.started_at);
    const ls = lessonsList.filter((l) => l.class === name);
    out.push({
      name, sessions: items.length, lessons: ls.length,
      paused: ls.filter((l) => l.status === 'paused').length,
      study_min: pyRound(sum(items, (i) => i.duration_sec) / 60),
      focused_min: sum(items, (i) => i.focused_min),
      avg_attention: weightedAvg(items),
      last_at: items.at(-1).started_at,
      trend: items.slice(-12).map((i) => i.avg_attention),
    });
  }
  return out.sort((a, b) => b.last_at - a.last_at);
}

/**
 * Daily goal progress and the streak.
 * Streak = days in a row on which you studied at least `streakMin` minutes (showing up counts).
 */
export function goalInfo(sums, goalMin, now, streakMin = 10) {
  const perDay = {}, studyDay = {};
  for (const s of sums) {
    const k = dayKey(s.started_at);
    perDay[k] = (perDay[k] || 0) + s.focused_min;
    studyDay[k] = (studyDay[k] || 0) + s.duration_sec / 60;
  }
  const today = dayKey(now);
  const reached = (k) => (studyDay[k] || 0) >= streakMin;
  let streak = 0, back = reached(today) ? 0 : 1;          // today isn't over yet: the streak can continue
  while (reached(dayKey(now - back * DAY))) { streak += 1; back += 1; }

  let best = 0, run = 0;
  const keys = Object.keys(perDay);
  if (keys.length) {
    const first = Math.min(...keys.map((k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d).getTime() / 1000; }));
    for (let d = first; d <= now; d += DAY) { run = reached(dayKey(d)) ? run + 1 : 0; best = Math.max(best, run); }
  }
  const done = perDay[today] || 0;
  return {
    streak_min: streakMin, today_study: Math.trunc(studyDay[today] || 0), streak_today: reached(today),
    goal_min: goalMin, today: done, pct: goalMin ? Math.min(100, Math.trunc(pyRound(100 * done / goalMin))) : 0,
    reached: done >= goalMin, streak, best_streak: Math.max(best, streak),
  };
}

/** Personal break interval: a little before the minute your attention usually drops. */
export function planMinutes(reports) {
  const drops = reports.map((r) => r.fell_after).filter((x) => x);
  if (drops.length < 3) return [45, false];
  return [Math.max(15, Math.trunc(median(drops)) - 2), true];
}

export function overview(reports, now = Date.now() / 1000, goalMin = 60, streakMin = 10) {
  const sums = reports.map(summary).sort((a, b) => b.started_at - a.started_at);
  const ls = lessons(sums);
  const cls = classes(sums, ls);
  const today0 = startOfDay(now);
  const week0 = today0 - 6 * DAY;
  const total = (items, key) => sum(items, (i) => i[key]);
  const today = sums.filter((s) => s.started_at >= today0);
  const week = sums.filter((s) => s.started_at >= week0);

  const days = [];
  for (let back = 13; back >= 0; back -= 1) {
    const d0 = today0 - back * DAY;
    const items = sums.filter((s) => d0 <= s.started_at && s.started_at < d0 + DAY);
    days.push({ label: weekday(d0), date: dayMonth(d0), study_min: pyRound(total(items, 'duration_sec') / 60),
      focused_min: total(items, 'focused_min'), avg: weightedAvg(items) });
  }

  // time of day: which part of the day you focus best
  const parts = Object.fromEntries(DAY_PARTS.map(([n]) => [n, { sum: 0, n: 0, focused: 0 }]));
  for (const r of reports) {
    (r.minutes || []).forEach((m, i) => {
      if (m.att === null || m.att === undefined) return;
      const p = parts[dayPart(local(r.started_at + 60 * i).getHours())];
      p.sum += m.att; p.n += 1; p.focused += m.state === 'focused' ? 1 : 0;
    });
  }
  const tod = DAY_PARTS.map(([name]) => {
    const p = parts[name];
    return { name, minutes: p.n, avg: p.n ? Math.trunc(pyRound(p.sum / p.n)) : null,
      focused_pct: p.n ? Math.trunc(pyRound(100 * p.focused / p.n)) : null };
  });
  let best = null;
  for (const t of tod) if (t.minutes >= 10 && (best === null || t.avg > best.avg)) best = t;

  const drops = reports.map((r) => r.fell_after).filter((x) => x);
  const typicalDrop = drops.length ? Math.trunc(median(drops)) : null;
  const studyHours = total(sums, 'duration_sec') / 3600 || 1;
  const insights = [];
  if (best) insights.push(`You focus best in the <strong>${best.name.toLowerCase()}</strong> (average attention ${best.avg}%).`);
  if (typicalDrop) {
    insights.push(`Your attention usually drops after <strong>about ${typicalDrop} minutes</strong>. Plan a break every ${Math.max(typicalDrop - 5, 10)} minutes.`);
  }
  const longest = Math.max(0, ...sums.map((s) => s.longest_focus));
  if (longest) insights.push(`Your longest focus streak: <strong>${longest} minutes</strong> without drifting.`);
  if (sums.length) {
    insights.push(`You pick up your phone <strong>${(total(sums, 'pickups') / studyHours).toFixed(1)} times per hour</strong> `
      + `and look away <strong>${(total(sums, 'away_count') / studyHours).toFixed(0)} times per hour</strong>.`);
  }

  // intentions: how often you did what you planned, and does attention matter?
  const judged = sums.filter((s) => s.intention && s.outcome);
  const byOut = Object.fromEntries(['yes', 'partly', 'no'].map((o) => [o, judged.filter((s) => s.outcome === o)]));
  const intentions = {
    judged: judged.length, yes: byOut.yes.length, partly: byOut.partly.length, no: byOut.no.length,
    rate: judged.length ? Math.trunc(pyRound(100 * byOut.yes.length / judged.length)) : null,
    att_yes: weightedAvg(byOut.yes), att_no: weightedAvg([...byOut.no, ...byOut.partly]),
    tasks_total: total(sums, 'tasks_total'), tasks_done: total(sums, 'tasks_done'),
  };
  if (judged.length >= 3) {
    let line = `You completed your intention in <strong>${intentions.yes} of ${judged.length}</strong> sessions.`;
    if (intentions.att_yes !== null && intentions.att_no !== null) {
      line += ` Average attention was <strong>${intentions.att_yes}%</strong> when you made it and <strong>${intentions.att_no}%</strong> when you didn't.`;
    }
    insights.push(line);
  }
  const [plan, personal] = planMinutes(reports);
  return {
    mood: moodMix(sums), intentions,
    goal: goalInfo(sums, goalMin, now, streakMin),
    plan_min: plan, plan_personal: personal,
    sessions: sums, lessons: ls, paused: ls.filter((l) => l.status === 'paused'), classes: cls,
    totals: {
      today_focused: total(today, 'focused_min'), today_study: pyRound(total(today, 'duration_sec') / 60), today_avg: weightedAvg(today),
      week_focused: total(week, 'focused_min'), week_study: pyRound(total(week, 'duration_sec') / 60), week_avg: weightedAvg(week),
      all_focused: total(sums, 'focused_min'), all_study: pyRound(total(sums, 'duration_sec') / 60), all_avg: weightedAvg(sums),
      sessions: sums.length, lessons: ls.length, longest_focus: longest,
    },
    days, time_of_day: tod, best_time: best ? best.name : null, typical_drop: typicalDrop, insights,
  };
}

/** This week (last 7 days) compared with the 7 days before. */
export function weekly(reports, reviewItems, now = Date.now() / 1000) {
  const today0 = startOfDay(now);
  const w0 = today0 - 6 * DAY, p0 = today0 - 13 * DAY;
  const thisWeek = reports.filter((r) => r.started_at >= w0);
  const prev = reports.filter((r) => p0 <= r.started_at && r.started_at < w0);
  const totals = (rs) => {
    const sm = rs.map(summary);
    const hours = sum(sm, (s) => s.duration_sec) / 3600;
    return {
      sessions: sm.length, study_min: pyRound(hours * 60), focused_min: sum(sm, (s) => s.focused_min), avg: weightedAvg(sm),
      pickups_h: hours ? pyRound(sum(sm, (s) => s.pickups) / hours, 1) : null,
      away_h: hours ? pyRound(sum(sm, (s) => s.away_count) / hours) : null,
      eye_rests: sum(rs, (r) => r.eye_rests || 0), posture_alerts: sum(rs, (r) => r.posture_alerts || 0),
      breaks: sum(rs, (r) => r.breaks || 0), longest_focus: Math.max(0, ...sm.map((s) => s.longest_focus)),
    };
  };
  const t = totals(thisWeek), p = totals(prev);
  const change = p.focused_min ? Math.trunc(pyRound(100 * (t.focused_min - p.focused_min) / p.focused_min)) : null;
  const days = [];
  for (let back = 6; back >= 0; back -= 1) {
    const d0 = today0 - back * DAY;
    const rs = thisWeek.filter((r) => d0 <= r.started_at && r.started_at < d0 + DAY).map(summary);
    days.push({ label: weekday(d0), date: dayMonth(d0), study_min: pyRound(sum(rs, (s) => s.duration_sec) / 60),
      focused_min: sum(rs, (s) => s.focused_min), avg: weightedAvg(rs) });
  }
  let bestDay = null;
  if (days.some((d) => d.focused_min)) for (const d of days) if (!bestDay || d.focused_min > bestDay.focused_min) bestDay = d;
  const byClass = new Map();
  for (const r of thisWeek) {
    const k = classOf(r);
    const c = byClass.get(k) || { study_min: 0, focused_min: 0 };
    c.study_min += pyRound(r.duration_sec / 60); c.focused_min += r.focused_min || 0;
    byClass.set(k, c);
  }
  const classesList = [...byClass].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.study_min - a.study_min);
  const qNew = reviewItems.filter((q) => q.created >= w0);
  const answers = reviewItems.flatMap((q) => q.log || []).filter((a) => a.at >= w0);
  return {
    from: dayMonth(w0), to: dayMonth(now), this: t, prev: p, change_pct: change, days, best_day: bestDay, classes: classesList,
    questions_new: qNew.length, reviews_done: answers.length, reviews_understood: answers.filter((a) => a.result === 'got').length,
  };
}
