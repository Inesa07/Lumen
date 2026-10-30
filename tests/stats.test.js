// stats.js must match stats.py. The fixture holds 10 lessons, review cards and the Python results.
process.env.TZ = 'Asia/Yerevan';          // the fixture was made in this time zone (days start at local midnight)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { overview, weekly, dayPart, goalInfo } from '../src/core/stats.js';

const d = JSON.parse(readFileSync(new URL('./fixtures/stats_golden.json', import.meta.url)));
const norm = (x) => JSON.parse(JSON.stringify(x));     // undefined -> missing, like JSON from Python

test('overview equals stats.py', () => {
  const ov = norm(overview(d.reps, d.now, 60, 10));
  for (const k of ['freezes', 'frozen', 'saved_yesterday']) delete ov.goal[k];   // streak freezes came later, JS only
  assert.deepEqual(ov, d.ov);
});
test('weekly equals stats.py', () => assert.deepEqual(norm(weekly(d.reps, d.revs, d.now)), d.wk));

test('parts of the day', () => {
  assert.equal(dayPart(9), 'Morning');
  assert.equal(dayPart(23), 'Night');
  assert.equal(dayPart(2), 'Night');
});

test('streak: today does not break it before you study', () => {
  const now = new Date(2026, 9, 22, 8, 0).getTime() / 1000;
  const day = (back) => ({ started_at: now - back * 86400, duration_sec: 15 * 60, focused_min: 10 });
  const g = goalInfo([day(1), day(2), day(3)], 60, now, 10);
  assert.equal(g.streak, 3);
  assert.equal(g.streak_today, false);
});

test('streak freeze: a missed day uses a 🧊 instead of burning the streak', async () => {
  const { streakRun } = await import('../src/core/stats.js');
  const now = new Date(2026, 9, 22, 20, 0).getTime() / 1000;
  const k = (back) => { const d = new Date(2026, 9, 22 - back); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  // studied 4 days, missed one (yesterday), studied today: the free freeze saves it
  let r = streakRun([k(5), k(4), k(3), k(2), k(0)], now);
  assert.equal(r.streak, 5); assert.equal(r.freezes, 1);   // used the free one, earned one on day 5 assert.deepEqual(r.frozen, [k(1)]);
  // two missed days and only one freeze: the streak starts again
  r = streakRun([k(6), k(5), k(4), k(1), k(0)], now);
  assert.equal(r.streak, 2); assert.equal(r.best, 3);
  // 5 days in a row earn a second freeze, so two missed days are fine
  r = streakRun([k(8), k(7), k(6), k(5), k(4), k(1), k(0)], now);
  assert.equal(r.streak, 7); assert.equal(r.freezes, 0);
  // today not studied yet: nothing is used for today
  r = streakRun([k(2), k(1)], now);
  assert.equal(r.streak, 2); assert.equal(r.freezes, 1);
});
