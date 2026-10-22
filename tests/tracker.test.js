// The JavaScript tracker must give EXACTLY the same results as the original Python tracker.
// tests/fixtures/tracker_golden.json was produced by tracker.py on the same simulated lesson.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SessionTracker } from '../src/core/tracker.js';
import { runScenario } from './scenario.js';

const golden = JSON.parse(readFileSync(new URL('./fixtures/tracker_golden.json', import.meta.url)));

function run() {
  const tr = new SessionTracker('Test', null, { plan_min: 25 });
  const snaps = [];
  let i = 0;
  runScenario((s) => {
    tr.feed(s); i += 1;
    // a snapshot every 300 samples (snapshots also reset one-time flags, like in the app); keep every 10th
    if (i % 300 === 0) { const snap = tr.snapshot(); if ((i / 300 - 1) % 10 === 0) snaps.push(snap); }
  }, (name, arg) => (arg === undefined ? tr[name]() : tr[name](arg)));
  const report = tr.report();
  delete report.started_at;
  return { report, snaps };
}

// numbers may differ in the last decimal places only
function close(a, b, path = '') {
  if (typeof a === 'number' && typeof b === 'number') {
    assert.ok(Math.abs(a - b) < 1e-6, `${path}: ${a} != ${b}`);
  } else if (Array.isArray(a)) {
    assert.equal(a.length, b.length, `${path}: length`);
    a.forEach((x, i) => close(x, b[i], `${path}[${i}]`));
  } else if (a && typeof a === 'object') {
    assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort(), `${path}: keys`);
    for (const k of Object.keys(a)) close(a[k], b[k], `${path}.${k}`);
  } else assert.equal(a, b, path);
}

const result = run();

test('lesson report equals the Python tracker', () => close(result.report, golden.report, 'report'));
test('live snapshots equal the Python tracker', () => close(result.snaps, golden.snaps, 'snaps'));

test('the simulated lesson is understood', () => {
  const r = result.report;
  assert.deepEqual(r.pickups, ['31:06']);                 // phone at minute 31
  assert.equal(r.breaks, 1);
  assert.equal(r.questions[0].text, 'What is a determinant?');
  assert.equal(r.peak_fatigue, 'High');                   // tired after minute 38
  assert.deepEqual(r.mood.hard, { from: '8:00', to: '11:00' });   // frowning stretch
});
