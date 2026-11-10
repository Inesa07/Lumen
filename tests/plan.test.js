// plan.js: lesson length by age, short steps, weekends, exam week and holidays.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agePlan, shortSteps, lessonPlan, suggestShortSteps, dayRules, isHoliday } from '../src/core/plan.js';
import { goalInfo } from '../src/core/stats.js';
import { awayOf } from '../src/core/friend.js';

test('younger children get shorter lessons', () => {
  assert.deepEqual(agePlan(7), { study: 15, break: 5 });
  assert.deepEqual(agePlan(12), { study: 30, break: 5 });
  assert.deepEqual(agePlan(15), { study: 40, break: 10 });
  assert.equal(agePlan(null), null);
  assert.deepEqual(shortSteps(8), { study: 10, break: 3 });
});

test('lesson plan: chosen rhythm > short steps > history within the age limit', () => {
  assert.equal(lessonPlan({ rhythm: { study: 20, break: 5 } }, 40, true).plan_min, 20);
  assert.deepEqual(lessonPlan({ short_steps: true, age: 10 }, 40, true).rhythm, { study: 13, break: 3 });
  assert.equal(lessonPlan({ age: 8 }, 45, true).plan_min, 30);     // own history, but at most age + 10 min
  assert.equal(lessonPlan({ age: 8 }, 45, false).plan_min, 20);    // not enough history: the age plan
  assert.equal(lessonPlan({}, 33, true).plan_min, 33);
});

test('short steps are suggested only when focus is usually short, and only once', () => {
  const r = (lf, i) => ({ started_at: 1000 + i, duration_sec: 1200, longest_focus: lf });
  assert.equal(suggestShortSteps([4, 3, 5].map(r)), true);
  assert.equal(suggestShortSteps([4, 12, 15].map(r)), false);
  assert.equal(suggestShortSteps([4, 3, 5].map(r), { short_steps_asked: true }), false);
});

test('weekends are lighter, an exam week bigger, holidays need nothing', () => {
  const st = { daily_goal_min: 60, streak_min: 10, holidays: [['2026-12-28', null]], exam_until: '2026-11-13' };
  assert.equal(dayRules('2026-11-11', st).goal, 75);          // Wednesday in the exam week
  assert.equal(dayRules('2026-11-14', st).goal, 30);          // Saturday after it
  assert.equal(dayRules('2026-11-16', st).goal, 60);          // a normal Monday
  assert.equal(dayRules('2027-01-03', st).holiday, true);
  assert.equal(isHoliday('2026-12-27', st.holidays), false);
});

test('holidays: the streak waits and Lumi does not miss you', () => {
  const at = (d, h = 15) => new Date(2026, 11, d, h).getTime() / 1000;
  const st = { daily_goal_min: 60, streak_min: 10, holidays: [['2026-12-05', '2026-12-08']] };
  const rules = (k) => dayRules(k, st);
  const day = (d) => ({ started_at: at(d), duration_sec: 1800, focused_min: 25 });
  // studied 1-4, holidays 5-8 (nothing), studied again on the 9th
  const sums = [1, 2, 3, 4, 9].map(day);
  const g = goalInfo(sums, 60, at(9, 20), 10, rules);
  assert.equal(g.streak, 5);
  assert.equal(g.freezes, 2, 'no freeze used on holidays (1 at the start + 1 for 5 days)');
  const away = awayOf([1, 2, 3, 4].map(day), at(9, 10), (k) => isHoliday(k, st.holidays));
  assert.equal(away.mood, 'waiting');                          // only the 9th itself counts, not the holidays
  assert.equal(awayOf([], at(6), (k) => isHoliday(k, st.holidays)).mood, 'holiday');
});
