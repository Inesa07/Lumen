// A fixed 55-minute "lesson" used by the tracker tests: the simulated student from fake.js
// plus a few button presses at fixed moments (break, confusing marks, notes mode, "Not now").
import { FakeVision } from '../src/vision/fake.js';

export const ACTIONS = [
  [7 * 60, 'mark_confusing'], [7 * 60 + 1, 'note_last_mark', 'What is a determinant?'],
  [16 * 60, 'set_notes', true], [17 * 60, 'set_notes', false],
  [21 * 60, 'start_break', 5],
  [30 * 60, 'dismiss'],
  [40 * 60, 'mark_confusing'], [40 * 60 + 30, 'mark_confusing'], [41 * 60, 'mark_confusing'],
  [44 * 60, 'start_eye_rest'],
];

/** Calls onSample(sample) for every sample and onAction(name, arg) at the right moments. */
export function runScenario(onSample, onAction, minutes = 55) {
  const fake = new FakeVision({ onSample() {} });
  const queue = [...ACTIONS];
  const dt = 1 / fake.rate;
  const snaps = [];
  while (fake.t < minutes * 60) {
    while (queue.length && queue[0][0] <= fake.t) { const [, name, arg] = queue.shift(); onAction(name, arg); }
    onSample(fake.sample());
    fake.t += dt;
  }
  return snaps;
}
