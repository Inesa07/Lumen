// plan.js: how long a lesson and a break should be, and how big today's goal is, for THIS child.
//
//   * age: younger children can hold attention for a shorter time (roughly 2-3 minutes per year of age),
//     so a 7-year-old gets 15-minute lessons and a 15-year-old 40-minute ones.
//   * "Short steps": very short study steps with short breaks, for anyone who finds a long focus hard.
//     Nobody is labelled: any child can turn it on, and Lumen only suggests it when focus is often short.
//   * weekends are lighter, an exam week is a bit bigger, and holidays don't count at all
//     (the streak waits, Lumi doesn't miss you).

import { dayKey } from './stats.js';

export const MIN_AGE = 5;
export const MAX_AGE = 99;

/** Study / break minutes that fit an age (null when the age is unknown). */
export function agePlan(age) {
  const a = Number(age);
  if (!Number.isFinite(a) || a < MIN_AGE - 1) return null;
  if (a <= 7) return { study: 15, break: 5 };
  if (a <= 9) return { study: 20, break: 5 };
  if (a <= 11) return { study: 25, break: 5 };
  if (a <= 13) return { study: 30, break: 5 };
  if (a <= 17) return { study: 40, break: 10 };
  return { study: 45, break: 10 };                // adults: a classic 45-minute block
}

/** "Short steps": about half the usual step, never shorter than 8 minutes, with 3-minute breaks. */
export function shortSteps(age) {
  const base = agePlan(age) || { study: 25 };
  return { study: Math.max(8, Math.round(base.study * 0.5)), break: 3 };
}

/**
 * The study / break rhythm for the next lesson.
 * @param {object} st settings: rhythm (chosen by hand), short_steps, age
 * @param {number} historyPlan the personal plan from past lessons (stats.planMinutes)
 * @param {boolean} personal whether historyPlan comes from at least 3 lessons
 * @returns {{plan_min:number, rhythm:object|null}}
 */
export function lessonPlan(st, historyPlan, personal) {
  if (st.rhythm) return { plan_min: st.rhythm.study, rhythm: st.rhythm };
  if (st.short_steps) { const r = shortSteps(st.age); return { plan_min: r.study, rhythm: r }; }
  const a = agePlan(st.age);
  if (!a) return { plan_min: historyPlan, rhythm: null };
  // your own rhythm wins when Lumen knows it, but not much longer than what fits your age
  const plan = personal ? Math.min(historyPlan, a.study + 10) : a.study;
  return { plan_min: Math.max(8, plan), rhythm: null };
}

/**
 * Lumen suggests short steps when the longest focus in recent lessons is usually short.
 * @param {object[]} reports lessons (any order)
 */
export function suggestShortSteps(reports, st = {}) {
  if (st.short_steps || st.rhythm || st.short_steps_asked) return false;
  const recent = [...reports].filter((r) => r && r.duration_sec >= 8 * 60)
    .sort((a, b) => b.started_at - a.started_at).slice(0, 5);
  if (recent.length < 3) return false;
  const runs = recent.map((r) => r.longest_focus || 0).sort((a, b) => a - b);
  return runs[Math.floor(runs.length / 2)] < 6;
}

const isWeekend = (key) => { const [y, m, d] = key.split('-').map(Number); const w = new Date(y, m - 1, d).getDay(); return w === 0 || w === 6; };

/** Is this day (YYYY-MM-DD) inside the holidays? holidays: [[from, to|null], ...] (null = still going) */
export function isHoliday(key, holidays = []) {
  return (holidays || []).some(([from, to]) => key >= from && (!to || key <= to));
}

/**
 * The rules for one day: the goal (focused minutes) and the minimum for the streak.
 *   weekend: half (but not during an exam week) · exam week: +25 % · holidays: nothing needed
 */
export function dayRules(key, st) {
  const goal = st.daily_goal_min ?? 60, min = st.streak_min ?? 10;
  if (isHoliday(key, st.holidays)) return { goal: 0, streak_min: 0, holiday: true, weekend: false, exam: false };
  const exam = !!st.exam_until && key <= st.exam_until;
  if (exam) return { goal: Math.round(goal * 1.25), streak_min: min, holiday: false, weekend: false, exam: true };
  if (isWeekend(key)) return { goal: Math.max(5, Math.round(goal / 2)), streak_min: Math.max(5, Math.round(min / 2)), holiday: false, weekend: true, exam: false };
  return { goal, streak_min: min, holiday: false, weekend: false, exam: false };
}

/** A day-rules function for stats.goalInfo, from the settings. */
export const rulesFrom = (st) => (key) => dayRules(key, st);

/** The date (YYYY-MM-DD) an exam week turned on today ends: 7 days including today. */
export function examUntil(now = Date.now() / 1000) {
  return dayKey(now + 6 * 86400);
}
