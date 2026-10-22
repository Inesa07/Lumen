// stats.js must match stats.py. The fixture holds 10 lessons, review cards and the Python results.
process.env.TZ = 'Asia/Yerevan';          // the fixture was made in this time zone (days start at local midnight)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { overview, weekly, dayPart, goalInfo } from '../src/core/stats.js';

const d = JSON.parse(readFileSync(new URL('./fixtures/stats_golden.json', import.meta.url)));
const norm = (x) => JSON.parse(JSON.stringify(x));     // undefined -> missing, like JSON from Python

test('overview equals stats.py', () => assert.deepEqual(norm(overview(d.reps, d.now, 60, 10)), d.ov));
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
