// Lumi: light from focused minutes, stages, outfits by stage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metrics, lightOf, stageOf, friendState, newsSince, outfitsFor } from '../src/core/friend.js';

process.env.TZ = 'Asia/Yerevan';
const at = (y, m, d, h = 15) => new Date(y, m - 1, d, h).getTime() / 1000;
const lesson = (ts, o = {}) => ({ started_at: ts, duration_sec: 30 * 60, focused_min: 20, longest_focus: 8, eye_rests: 1,
  pickups: [], outcome: null, status: 'finished', ...o });

test('no lessons: Spark with 0 light', () => {
  const st = friendState([], []);
  assert.equal(st.light, 0);
  assert.equal(st.stage.name, 'Spark');
  assert.equal(st.outfit, 'none');
  assert.equal(st.first_time, true);
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

test('light is the focused minutes; stages; outfits come with stages', () => {
  assert.equal(lightOf({ focused_min: 145 }), 145);
  assert.equal(stageOf(145).name, 'Firefly');
  assert.equal(stageOf(1200).next, null);
  assert.equal(stageOf(29).pct, 97);
  const o = outfitsFor(2);
  assert.ok(o.find((x) => x.id === 'bow').unlocked && o.find((x) => x.id === 'scarf').unlocked);
  assert.ok(!o.find((x) => x.id === 'crown').unlocked);
  const n = newsSince({ stage: 1 }, 3);
  assert.equal(n.grew, 3);
  assert.deepEqual(n.outfits, ['Cosy scarf', 'Flower', 'Headphones', 'Smart glasses']);
  assert.equal(newsSince({ stage: 3 }, 3).grew, null);
  const st = friendState([lesson(at(2026, 10, 5), { focused_min: 40 })], [], { stage: 0, outfit: 'bow' });
  assert.equal(st.light, 40); assert.equal(st.stage.index, 1); assert.equal(st.outfit, 'bow');
});

test('diary: a page per day, kind sentences from the lesson', async () => {
  const { diaryOf } = await import('../src/core/friend.js');
  const d = diaryOf([
    lesson(at(2026, 10, 5), { id: 'a', title: 'Fractions', class: 'Math', focused_min: 26, longest_focus: 18, outcome: 'yes', eye_rests: 2 }),
    lesson(at(2026, 10, 6), { id: 'b', title: 'Verbs', focused_min: 8, pickups: ['01:00', '09:00'], fell_after: 12, eye_rests: 0 }),
  ]);
  assert.equal(d.length, 2);
  assert.equal(d[0].day, '2026-10-06');                      // newest first
  const keys = (i) => d[i].lessons[0].lines.map((l) => l.k);
  assert.deepEqual(keys(1), ['open', 'focus_super', 'longest', 'plan_all', 'no_phone']);
  assert.deepEqual(keys(0), ['open', 'focus_hard', 'phone', 'fell']);
  assert.equal(d[0].lessons[0].lines[2].n, 2);
});

test('Lumi misses you after a missed day, falls asleep after 3, and is happy when you are back', async () => {
  const { awayOf } = await import('../src/core/friend.js');
  const now = new Date(2026, 9, 22, 18).getTime() / 1000;
  const at = (back) => ({ started_at: new Date(2026, 9, 22 - back, 15).getTime() / 1000 });
  assert.equal(awayOf([], now).mood, 'waiting');
  assert.equal(awayOf([at(0)], now).mood, 'happy');
  assert.equal(awayOf([at(1)], now).mood, 'waiting');
  assert.equal(awayOf([at(2)], now).mood, 'missing');
  assert.equal(awayOf([at(3)], now).mood, 'missing');
  assert.equal(awayOf([at(4)], now).mood, 'asleep');
  assert.equal(awayOf([at(5), at(0)], now).back, true);
  assert.equal(awayOf([at(1), at(0)], now).back, false);
});
