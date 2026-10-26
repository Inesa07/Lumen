// Lumi and the achievements: pure rules over the saved lessons.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metrics, evaluate, lightOf, stageOf, friendState, newsSince, outfitsFor } from '../src/core/friend.js';

process.env.TZ = 'Asia/Yerevan';
const at = (y, m, d, h = 15) => new Date(y, m - 1, d, h).getTime() / 1000;
const lesson = (ts, o = {}) => ({ started_at: ts, duration_sec: 30 * 60, focused_min: 20, longest_focus: 8, eye_rests: 1,
  pickups: [], outcome: null, status: 'finished', ...o });

test('no lessons: Spark with 0 light, nothing reached', () => {
  const st = friendState([], []);
  assert.equal(st.light, 0);
  assert.equal(st.stage.name, 'Spark');
  assert.ok(st.achievements.every((a) => a.tier === 0));
  assert.equal(st.outfit, 'none');
});

test('metrics count habits, not just hours', () => {
  const s = [
    lesson(at(2026, 10, 5, 8), { outcome: 'yes' }),             // early, plan done, phone-free
    lesson(at(2026, 10, 6), { pickups: ['03:00'] }),             // phone picked up
    lesson(at(2026, 10, 7), { duration_sec: 10 * 60 }),          // too short for phone-free
    lesson(at(2026, 10, 12), { status: 'paused' }),              // paused part: not a finished lesson
  ];
  const m = metrics(s, [{ log: [{ result: 'got' }, { result: 'again' }] }, { log: [{ result: 'got' }] }]);
  assert.equal(m.lessons, 3);
  assert.equal(m.focused_min, 80);
  assert.equal(m.plans_done, 1);
  assert.equal(m.phone_free, 2);          // lesson 1 and the paused 30-min part
  assert.equal(m.early, 1);
  assert.equal(m.best_streak, 3);         // Oct 5, 6, 7 (the 10-min day still counts: streak_min 10)
  assert.equal(m.comebacks, 1);           // Oct 7 -> Oct 12
  assert.equal(m.reviews_got, 2);
  assert.equal(m.eye_rests, 4);
});

test('better weeks: only a week right after a smaller week', () => {
  const s = [lesson(at(2026, 10, 5)), lesson(at(2026, 10, 12), { focused_min: 40 }), lesson(at(2026, 10, 26), { focused_min: 90 })];
  assert.equal(metrics(s).better_weeks, 1);   // week of Oct 12 beat Oct 5; Oct 26 has a gap week before it
});

test('tiers, light and stages', () => {
  const m = { lessons: 10, focused_min: 100, longest_focus: 0, plans_done: 0, eye_rests: 0, reviews_got: 0,
    best_streak: 0, phone_free: 0, early: 0, better_weeks: 0, comebacks: 0 };
  const ev = evaluate(m);
  const L = ev.find((e) => e.id === 'lessons');
  assert.equal(L.tier, 2); assert.equal(L.next, 50); assert.equal(L.pct, 0);
  const F = ev.find((e) => e.id === 'focus');
  assert.equal(F.tier, 1); assert.equal(F.pct, Math.round(100 * 40 / 240));
  // 100 focused + lessons bronze 10 + silver 25 + focus bronze 10
  assert.equal(lightOf(m, ev), 145);
  assert.equal(stageOf(145).name, 'Firefly');
  assert.equal(stageOf(1200).next, null);
  assert.equal(stageOf(29).pct, 97);
});

test('news: only tiers not yet celebrated; outfits unlock by stage and achievement', () => {
  const ev = evaluate({ lessons: 10, focused_min: 0 });
  assert.deepEqual(newsSince({ seen: { lessons: 1 }, stage: 0 }, ev, 1).tiers.map((t) => [t.id, t.tier]), [['lessons', 2]]);
  assert.equal(newsSince({ seen: { lessons: 1 }, stage: 0 }, ev, 1).grew, 1);
  const o = outfitsFor(1, ev);
  assert.ok(o.find((x) => x.id === 'bow').unlocked);
  assert.ok(o.find((x) => x.id === 'cap').unlocked);
  assert.ok(!o.find((x) => x.id === 'crown').unlocked);
});
