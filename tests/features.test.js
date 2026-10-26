import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eyeAspectRatio, headAngles, blendshapeFeatures, greyStd } from '../src/vision/features.js';
import { rng, FakeVision } from '../src/vision/fake.js';

test('EAR of an open eye is bigger than of a closed eye', () => {
  const open = eyeAspectRatio([[0, 0], [3, -3], [7, -3], [10, 0], [7, 3], [3, 3]]);
  const closed = eyeAspectRatio([[0, 0], [3, -0.5], [7, -0.5], [10, 0], [7, 0.5], [3, 0.5]]);
  assert.ok(Math.abs(open - 0.6) < 1e-6);
  assert.ok(closed < 0.15);
});

// build a column-major 4x4 matrix from a 3x3 rotation
const mat = (R) => { const d = new Array(16).fill(0); for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) d[c * 4 + r] = R[r][c]; d[15] = 1; return d; };
const rad = (deg) => (deg * Math.PI) / 180;

test('head angles: identity = looking straight', () => {
  const { yaw, pitch } = headAngles(mat([[1, 0, 0], [0, 1, 0], [0, 0, 1]]));
  assert.ok(Math.abs(yaw) < 1e-9 && Math.abs(pitch) < 1e-9);
});

test('head angles: 30° turn around the vertical axis is yaw = 30', () => {
  const a = rad(30);
  const { yaw, pitch } = headAngles(mat([[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]]));
  assert.ok(Math.abs(yaw - 30) < 1e-6, `yaw ${yaw}`);
  assert.ok(Math.abs(pitch) < 1e-6);
});

test('head angles: 20° nod around the horizontal axis is pitch = 20', () => {
  const a = rad(20);
  const { yaw, pitch } = headAngles(mat([[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]]));
  assert.ok(Math.abs(pitch - 20) < 1e-6, `pitch ${pitch}`);
  assert.ok(Math.abs(yaw) < 1e-6);
});

test('blendshapes are averaged left/right', () => {
  const f = blendshapeFeatures([{ categoryName: 'mouthSmileLeft', score: 0.8 }, { categoryName: 'mouthSmileRight', score: 0.6 }]);
  assert.ok(Math.abs(f.smile - 0.7) < 1e-9);
  assert.equal(f.frown, 0);
});

test('a uniform image has zero contrast (covered camera)', () => {
  assert.equal(greyStd(new Uint8ClampedArray(64 * 48 * 4).fill(40)), 0);
});

test('seeded random numbers repeat, normal() has the right mean', () => {
  const a = rng(1), b = rng(1);
  assert.equal(a.uniform(), b.uniform());
  const r = rng(3); let s = 0; for (let i = 0; i < 20000; i++) s += r.normal(5, 2);
  assert.ok(Math.abs(s / 20000 - 5) < 0.05);
});

test('fake student: phone between minutes 31 and 33.8, no face at minute 22.1', () => {
  const f = new FakeVision({ onSample() {} });
  f.t = 32 * 60; assert.equal(f.sample().phone, true);
  f.t = 22.1 * 60; assert.equal(f.sample().face, false);
  f.t = 5 * 60; const s = f.sample(); assert.equal(s.face, true); assert.ok(s.ear > 0.05);
});

test('edgeEnergy: a sharp pattern has detail, a smooth gradient (hand at the lens) has almost none', async () => {
  const { edgeEnergy } = await import('../src/vision/features.js');
  const w = 64, h = 48, sharp = new Uint8ClampedArray(w * h * 4), smooth = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const i = (y * w + x) * 4;
    const v = ((x >> 2) + (y >> 2)) % 2 ? 200 : 40;          // checkerboard: a room full of edges
    const u = 90 + x * 1.2;                                   // gentle skin-coloured gradient
    sharp.set([v, v, v, 255], i); smooth.set([u, u * 0.8, u * 0.7, 255], i);
  }
  assert.ok(edgeEnergy(sharp, w, h) > 20);
  assert.ok(edgeEnergy(smooth, w, h) < 2);
});
