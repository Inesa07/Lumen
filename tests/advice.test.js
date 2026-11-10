import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekAdvice, TIPS } from '../src/core/advice.js';

process.env.TZ = 'Asia/Yerevan';
const now = new Date(2026, 10, 14, 21).getTime() / 1000;
const at = (d, h) => new Date(2026, 10, d, h).getTime() / 1000;
const l = (d, h, o = {}) => ({ started_at: at(d, h), duration_sec: 1800, avg_attention: 75, pickups: [], ...o });

test('one advice from the data: a better time of day', () => {
  const a = weekAdvice([l(10, 16, { avg_attention: 82 }), l(11, 15, { avg_attention: 80 }), l(12, 20, { avg_attention: 55 }), l(13, 21, { avg_attention: 60 })], now);
  assert.equal(a.kind, 'time');
  assert.deepEqual(a.vars, { a: 81, b: 58 });
});

test('the phone, a hard class, then a general tip', () => {
  assert.equal(weekAdvice([l(10, 16, { pickups: [1, 2] }), l(11, 16, { pickups: [1] }), l(12, 16, { pickups: [1] })], now).kind, 'phone');
  const hard = weekAdvice([l(10, 16, { feel: 'hard', class: 'Math' }), l(11, 16, { feel: 'hard', class: 'Math' }), l(12, 16)], now);
  assert.equal(hard.kind, 'hard');
  assert.equal(hard.vars.cls, 'Math');
  const tip = weekAdvice([l(12, 16)], now);
  assert.equal(tip.kind, 'tip');
  assert.ok(TIPS.includes(tip.text));
});
