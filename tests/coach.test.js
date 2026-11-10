// coach.js: records, habits and kind words after a hard lesson.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordsOf, habitOf, isHard, goodThing } from '../src/core/coach.js';

process.env.TZ = 'Asia/Yerevan';
const at = (d, h = 17, m = 0) => new Date(2026, 10, d, h, m).getTime() / 1000;
const lesson = (id, ts, o = {}) => ({ id, started_at: ts, duration_sec: 1800, focused_min: 20, longest_focus: 8, avg_attention: 75, pickups: ['x'], ...o });

test('a record needs 3 earlier lessons and must beat all of them', () => {
  const past = [lesson('a', at(1)), lesson('b', at(2), { longest_focus: 12 }), lesson('c', at(3))];
  assert.deepEqual(recordsOf(lesson('d', at(4), { longest_focus: 15 }), past).map((r) => [r.kind, r.value, r.before]), [['focus', 15, 12]]);
  assert.deepEqual(recordsOf(lesson('d', at(4), { longest_focus: 12 }), past), []);
  assert.deepEqual(recordsOf(lesson('d', at(4), { longest_focus: 30 }), past.slice(0, 2)), []);
  // the first lesson without the phone (30 min) is a record too
  assert.deepEqual(recordsOf(lesson('d', at(4), { pickups: [] }), past).map((r) => r.kind), ['nophone']);
});

test('a habit: about the same time 3 days in a row', () => {
  const reps = [lesson('a', at(8, 17, 5)), lesson('b', at(9, 16, 40)), lesson('c', at(10, 17, 20))];
  assert.deepEqual(habitOf(reps, at(10, 20)), { time: '17:00', days: 3 });
  // a gap day breaks it
  assert.equal(habitOf([lesson('a', at(7)), lesson('b', at(9)), lesson('c', at(10))], at(10, 20)), null);
  // very different times are no habit
  assert.equal(habitOf([lesson('a', at(8, 10)), lesson('b', at(9, 17)), lesson('c', at(10, 21))], at(10, 22)), null);
});

test('a hard lesson always gets one real good thing', () => {
  const hard = lesson('h', at(5), { avg_attention: 40, focused_min: 6, longest_focus: 3, pickups: [], duration_sec: 1500 });
  assert.equal(isHard(hard), true);
  assert.match(goodThing(hard)[0], /phone/);
  assert.equal(isHard(lesson('ok', at(5))), false);
  assert.match(goodThing(lesson('x', at(5), { longest_focus: 2, breaks: 0, away_count: 4 }))[0], /came back/);
});
