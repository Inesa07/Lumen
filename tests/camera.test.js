// The newer camera logic: distance to the screen, head tilt, a "normal" position that follows slow
// movement, and no fake blinks when the head is turned.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distanceCm, irisPixels, headAngles, greyMean } from '../src/vision/features.js';
import { SessionTracker } from '../src/core/tracker.js';

test('distance from the iris size: a smaller iris means a farther face', () => {
  // 640 px wide picture, 63° field of view -> focal length ~522 px; 11.7 mm iris at 50 cm -> ~12.2 px
  const near = distanceCm(24.4, 640), far = distanceCm(12.2, 640);
  assert.ok(Math.abs(far - 50) < 1, `far ${far}`);
  assert.ok(Math.abs(near - 25) < 1, `near ${near}`);
  assert.equal(distanceCm(null, 640), null);
});

test('iris pixels use the larger eye and the larger of its two diameters', () => {
  const lm = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  const put = (i, x, y) => { lm[i] = { x, y }; };
  // left iris 10 px wide, 8 px tall; right iris 12 px wide (in a 100 x 100 picture)
  put(469, 0.30, 0.5); put(471, 0.40, 0.5); put(470, 0.35, 0.46); put(472, 0.35, 0.54);
  put(474, 0.60, 0.5); put(476, 0.72, 0.5); put(475, 0.66, 0.47); put(477, 0.66, 0.53);
  assert.ok(Math.abs(irisPixels(lm, 100, 100) - 12) < 1e-9);
});

test('head roll is read from the rotation matrix', () => {
  const a = 20 * Math.PI / 180;
  // rotation about the z axis (roll), column-major 4x4
  const m = [Math.cos(a), Math.sin(a), 0, 0, -Math.sin(a), Math.cos(a), 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const { roll, yaw, pitch } = headAngles(m);
  assert.ok(Math.abs(roll - 20) < 1e-9 && Math.abs(yaw) < 1e-9 && Math.abs(pitch) < 1e-9);
});

test('brightness of a picture', () => {
  assert.equal(greyMean(new Uint8ClampedArray([10, 10, 10, 255, 30, 30, 30, 255])), 20);
});

/** A calm student sitting at `cm`, sampled 10 times a second for `sec` seconds starting at t0. */
function feed(tr, from, sec, o = {}) {
  for (let t = from; t < from + sec; t += 0.1) {
    tr.feed({ t, face: true, phone: false, ear: 0.3, mar: 0.05, yaw: 0, pitch: 0, gx: 0.5, gy: 0, size: 0.2, fy: 0.5,
      dist_cm: 55, roll: 0, smile: 0.6, lift: 0, brow: 0.3, gap: 0.36, bs: null, ...o });
  }
  return from + sec;
}

test('sitting too close for 30 seconds: Lumi reminds, the report tells how often', () => {
  const tr = new SessionTracker('T', null, { plan_min: 60, eye_rest: false });
  let t = feed(tr, 0, 30);
  assert.equal(tr.snapshot().distance_cm, 55);
  t = feed(tr, t, 20, { dist_cm: 33 });
  assert.equal(tr.snapshot().posture, 'Too close');
  assert.equal(tr.posture_alerts.length, 0);
  t = feed(tr, t, 15, { dist_cm: 33 });
  const snap = tr.snapshot();
  assert.equal(snap.posture_alert, 'Too close');
  t = feed(tr, t, 60);
  const r = tr.report();
  assert.ok(r.too_close_pct > 20 && r.too_close_pct < 50, `too_close_pct ${r.too_close_pct}`);
  assert.ok(r.insights.some((x) => x.includes('closer than 40 cm')));
});

test('a tilted head is noticed after a minute', () => {
  const tr = new SessionTracker('T', null, { plan_min: 60, eye_rest: false });
  let t = feed(tr, 0, 30);
  t = feed(tr, t, 65, { roll: 25 });
  assert.equal(tr.posture_alerts.length, 1);
  assert.equal(tr.snapshot().posture, 'Tilted');
});

test('the normal position follows a slow change, but not a look away', () => {
  const tr = new SessionTracker('T', null, { plan_min: 60, eye_rest: false });
  let t = feed(tr, 0, 20);
  // the student slowly turns the laptop: 8° in 4 minutes, always looking at the screen
  for (let i = 0; i < 2400; i += 1) feed(tr, t + i * 0.1, 0.1, { yaw: (8 * i) / 2400 });
  t += 240;
  assert.ok(tr.base.yaw > 3.5, `base yaw ${tr.base.yaw}`);   // follows with a lag of ~2 minutes
  assert.equal(tr.snapshot().reason, 'on');
  // a real look away does not move the normal position
  const before = tr.base.yaw;
  feed(tr, t, 20, { yaw: 40 });
  assert.ok(Math.abs(tr.base.yaw - before) < 0.01);
});

test('with the head turned to the side, a narrow eye is not counted as a blink', () => {
  const tr = new SessionTracker('T', null, { plan_min: 60, eye_rest: false });
  let t = feed(tr, 0, 20);
  const blinks = tr.blinks.length;
  for (let i = 0; i < 10; i += 1) { t = feed(tr, t, 0.2, { yaw: 35, ear: 0.12 }); t = feed(tr, t, 1, { yaw: 35, ear: 0.3 }); }
  assert.equal(tr.blinks.length, blinks);
  // the same narrow eye looking at the screen is a blink
  for (let i = 0; i < 3; i += 1) { t = feed(tr, t, 0.2, { ear: 0.12 }); t = feed(tr, t, 1); }
  assert.equal(tr.blinks.length, blinks + 3);
});
