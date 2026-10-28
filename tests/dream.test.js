// "My dream": stars from lessons, a fair price, milestones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lessonStars, starsPerDay, priceOf, guessSize, guessEmoji, readSize, lookOf, dreamState, DAY_CAP, DEFAULT_PER_DAY } from '../src/core/dream.js';

process.env.TZ = 'Asia/Yerevan';
const at = (y, m, d, h = 15) => new Date(y, m - 1, d, h).getTime() / 1000;
const lesson = (ts, o = {}) => ({ id: `s${ts}`, started_at: ts, duration_sec: 30 * 60, focused_min: 20, longest_focus: 8, pickups: [], ...o });

test('stars: 10 focused minutes = 1, no phone = 1, a new record = 3', () => {
  const s = [
    lesson(at(2026, 10, 1)),                                      // 2 + 1
    lesson(at(2026, 10, 2), { pickups: ['01:00'] }),              // 2
    lesson(at(2026, 10, 3), { duration_sec: 10 * 60, focused_min: 9 }),   // 0 (too short for phone-free)
    lesson(at(2026, 10, 4), { longest_focus: 15 }),               // 2 + 1 + 3 (record after 3 lessons)
  ];
  assert.deepEqual(lessonStars(s).map((x) => x.stars), [3, 2, 0, 6]);
});

test('paused parts of one lesson count once, and a day gives at most DAY_CAP stars', () => {
  const parts = [lesson(at(2026, 10, 1, 10), { lesson_id: 'L', focused_min: 15, duration_sec: 15 * 60 }),
    lesson(at(2026, 10, 1, 11), { lesson_id: 'L', focused_min: 15, duration_sec: 15 * 60 })];
  assert.deepEqual(lessonStars(parts).map((x) => x.stars), [4]);            // 30 focused min = 3, + no phone
  const many = Array.from({ length: 5 }, (_, i) => lesson(at(2026, 10, 2, 9 + i), { focused_min: 30 }));
  assert.equal(lessonStars(many).reduce((a, x) => a + x.stars, 0), DAY_CAP);
});

test('price depends on the size and on how many stars this child collects', () => {
  assert.equal(starsPerDay([]), DEFAULT_PER_DAY);
  assert.equal(priceOf('medium', 6), 42);
  assert.equal(priceOf('small', 2), 6);
  assert.equal(priceOf('big', 2), 42);
  const now = at(2026, 10, 15, 20);
  const daily = Array.from({ length: 14 }, (_, i) => lesson(at(2026, 10, 2 + i), { pickups: ['x'] }));   // 2 stars a day
  assert.equal(starsPerDay(lessonStars(daily), now), 2);
});

test('size and emoji from the words (English, Russian, Armenian)', () => {
  assert.equal(guessSize('Поход в зоопарк'), 'big');
  assert.equal(guessSize('Choose the family movie'), 'small');
  assert.equal(guessSize('новый мяч'), 'medium');
  assert.equal(guessSize('Մորեմ պաղպաղակ'), 'small');
  assert.equal(guessEmoji('Поход в зоопарк'), '🦁');
  assert.equal(readSize('Big.'), 'big');
  assert.equal(readSize('I think it is'), null);
  assert.equal(lookOf('🦁'), 'safari');
  assert.equal(lookOf('🦄'), 'party');
});

test('dream progress counts only lessons after the dream was written', () => {
  const created = at(2026, 10, 10, 12);
  const s = [lesson(at(2026, 10, 9)), lesson(at(2026, 10, 10)), lesson(at(2026, 10, 11))];
  const d = dreamState(s, { current: { id: 'd1', text: 'Zoo', emoji: '🦁', need: 12, created_at: created } }, at(2026, 10, 11, 20));
  assert.equal(d.current.earned, 6);
  assert.equal(d.current.pct, 50);
  assert.equal(d.current.level, 2);
  assert.equal(d.current.look, 'safari');
  assert.equal(d.current.ready, false);
  assert.equal(d.current.news_level, 2);
  const done = dreamState(s, { current: { id: 'd1', text: 'Zoo', emoji: '🦁', need: 6, created_at: created, seen_level: 4 } });
  assert.equal(done.current.ready, true);
  assert.equal(done.current.news_level, 0);
});
