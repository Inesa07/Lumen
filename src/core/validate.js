// validate.js: "How accurate is Lumen for ME?" (port of validate.py)
//
// A guided 3-minute experiment. Lumen tells you what to do ("look at the screen", "look to the side
// with your eyes only", "pick up your phone"...). Because we KNOW what you were asked to do at every
// second, that is the ground truth. We compare it with what Lumen predicted and compute accuracy,
// balanced accuracy, precision / recall per class, a confusion matrix, accuracy per step,
// and better personal thresholds learned from the raw numbers we recorded.
import { SessionTracker, PROFILE_VERSION } from './tracker.js';
import { pyRound } from './util.js';
import { rng } from '../vision/fake.js';

export const CLASSES = ['on', 'away', 'phone', 'closed', 'absent'];
const LABEL = { on: 'On screen', away: 'Looking away', phone: 'Phone', closed: 'Eyes closed', absent: 'Not in frame', null: 'Getting ready' };
const label = (c) => LABEL[c ?? 'null'];
// Seconds ignored at the start of each step (the voice needs ~1.5 s, you need ~1 s to react)
const REACTION = 2.5;
const TAIL = 0.5;

// [seconds, expected class or null = not scored, instruction, group used for tuning]
export const STEPS = [
  [15, null, 'Look at the screen as you normally do. Lumen is learning your normal position.', 'calib'],
  [20, 'on', 'Read something on the screen: let your eyes move over the text as usual.', 'on'],
  [10, 'away', 'Turn your head to the side, look at the wall.', 'side'],
  [10, 'on', 'Look back at the screen.', 'on'],
  [10, 'away', 'Keep your head still. Look to the side with your eyes only.', 'side_eyes'],
  [10, 'on', 'Look back at the screen.', 'on'],
  [10, 'away', 'Look down at your desk, as if reading a notebook.', 'down'],
  [10, 'on', 'Look back at the screen.', 'on'],
  [12, 'phone', 'Pick up your phone and look at it.', 'phone'],
  [10, 'on', 'Put the phone away. Look at the screen.', 'on'],
  [8, 'closed', 'Close your eyes and keep them closed.', 'closed'],
  [11, 'on', 'Open your eyes. Look at the screen and blink normally.', 'on'],
  [8, 'absent', 'Cover the camera with your hand.', 'absent'],
  [10, 'on', 'Take your hand away. Look at the screen.', 'on'],
  [6, null, 'Yawn, or open your mouth wide.', 'yawn'],
  [5, null, 'Done! Look at the screen.', 'end'],
];
const TOTAL = STEPS.reduce((a, s) => a + s[0], 0);
const STARTS = STEPS.map((_, i) => STEPS.slice(0, i).reduce((a, s) => a + s[0], 0));

const predictedClass = (reason) => ({ on: 'on', notes: 'on', away: 'away', phone: 'phone', drowsy: 'closed', absent: 'absent' }[reason]);
export function stepAt(elapsed) {
  for (let i = 0; i < STARTS.length; i += 1) if (elapsed < STARTS[i] + STEPS[i][0]) return i;
  return null;
}
const pct = (x) => (x === null || x === undefined ? null : Math.trunc(pyRound(100 * x)));
const r4 = (x) => pyRound(x, 4);

export const CSV_HEADER = ['time_s', 'step', 'group', 'truth', 'predicted', 'face', 'phone',
  'yaw_dev_deg', 'pitch_dev_deg', 'gx_dev', 'gy_dev', 'eye_open_ratio'];

export class ValidationRun {
  constructor(profile = null) {
    this.tracker = new SessionTracker('Accuracy check', profile);
    this.profile = profile && profile.version === PROFILE_VERSION ? profile : {};
    this.rows = []; this.raw = {}; this.diag = {}; this.csv_rows = [];
    this.yawns_before = 0; this.finished = false; this.last_pred = null;
    this.started_at = Date.now() / 1000;
  }

  feed(s) {
    const tr = this.tracker;
    tr.feed(s);
    if (this.finished) return;
    const e = tr.elapsed;
    const i = stepAt(e);
    if (i === null) { this.finished = true; return; }
    const [, expected, , group] = STEPS[i];
    const reason = tr.recent_reasons.length ? tr.recent_reasons.at(-1)[1] : 'on';
    this.last_pred = predictedClass(reason);
    const into = e - STARTS[i];
    if (group === 'yawn' && into < 0.1) this.yawns_before = tr.yawns.length;
    if (into < REACTION || into > STEPS[i][0] - TAIL) return;

    const dbg = tr.debug;
    const meas = { face: s.face, phone: s.phone,
      yaw: s.face ? dbg.yaw ?? null : null, pitch: s.face ? dbg.pitch ?? null : null,
      gx: s.face ? dbg.gx ?? null : null, gy: s.face ? dbg.gy ?? null : null,
      ear: s.face ? dbg.ear_ratio : null };
    (this.diag[i] ||= []).push(meas);
    this.csv_rows.push([pyRound(e, 2), i, group, expected || '', this.last_pred,
      ...['face', 'phone', 'yaw', 'pitch', 'gx', 'gy', 'ear'].map((k) => (meas[k] === null ? '' : r4(Number(meas[k]))))]);
    if (s.face && !s.phone) (this.raw[group] ||= []).push([dbg.side, dbg.vert, dbg.ear_ratio]);
    if (expected !== null) this.rows.push([i, expected, this.last_pred]);
  }

  snapshot() {
    const tr = this.tracker;
    const e = tr.elapsed;
    let i = stepAt(e);
    if (i === null) i = STEPS.length - 1;
    return {
      mode: 'check', step: i, steps: STEPS.length,
      instruction: STEPS[i][2], expected: STEPS[i][1], expected_label: label(STEPS[i][1]),
      left: Math.trunc(Math.max(0, STARTS[i] + STEPS[i][0] - e)) + 1,
      next: i + 1 < STEPS.length ? STEPS[i + 1][2] : null,
      progress: Math.min(1, e / TOTAL),
      seen: this.last_pred, seen_label: LABEL[this.last_pred] || '…',
      calibrating: !tr.calibrated, finished: this.finished,
    };
  }

  results() {
    const idx = Object.fromEntries(CLASSES.map((c, k) => [c, k]));
    const cm = CLASSES.map(() => CLASSES.map(() => 0));
    for (const [, exp, pred] of this.rows) cm[idx[exp]][idx[pred]] += 1;
    const perClass = [], recalls = [];
    for (const c of CLASSES) {
      const k = idx[c];
      const tp = cm[k][k];
      const support = cm[k].reduce((a, b) => a + b, 0);
      const predN = cm.reduce((a, row) => a + row[k], 0);
      const recall = support ? tp / support : null;
      const precision = predN ? tp / predN : null;
      if (recall !== null) recalls.push(recall);
      perClass.push({ cls: c, label: label(c), support, recall: pct(recall), precision: pct(precision) });
    }
    const correct = this.rows.filter(([, e, p]) => e === p).length;
    const perStep = [];
    STEPS.forEach(([, exp, text], i) => {
      const rs = this.rows.filter((r) => r[0] === i);
      if (exp === null || !rs.length) return;
      const ok = rs.filter((r) => r[1] === r[2]).length;
      const wrong = rs.filter((r) => r[1] !== r[2]).map((r) => r[2]);
      let mostWrong = null, best = 0;
      for (const w of new Set(wrong)) { const n = wrong.filter((x) => x === w).length; if (n > best) { best = n; mostWrong = w; } }
      perStep.push({ text, expected: label(exp), acc: pct(ok / rs.length), mistake: mostWrong ? label(mostWrong) : null });
    });
    const lim = this.tracker.limits;
    const med = (vals) => { const v = vals.filter((x) => x !== null && x !== undefined).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
    const diagnostics = [];
    STEPS.forEach(([, exp, text, group], i) => {
      const ms = this.diag[i];
      if (!ms || group === 'calib') return;
      const row = { text, expected: exp ? label(exp) : '–',
        face: pct(ms.filter((m) => m.face).length / ms.length), phone: pct(ms.filter((m) => m.phone).length / ms.length) };
      for (const k of ['yaw', 'pitch', 'gx', 'gy']) {
        const v = med(ms.map((m) => (m[k] !== null ? Math.abs(m[k]) : null)));
        row[k] = v === null ? null : pyRound(v, k === 'gx' || k === 'gy' ? 3 : 1);
        row[`${k}_over`] = v !== null && v > lim[k];
      }
      const e = med(ms.map((m) => m.ear));
      row.ear = e === null ? null : pct(e);
      diagnostics.push(row);
    });
    return {
      started_at: this.started_at, n: this.rows.length,
      accuracy: this.rows.length ? pct(correct / this.rows.length) : 0,
      balanced_accuracy: recalls.length ? pct(recalls.reduce((a, b) => a + b, 0) / recalls.length) : 0,
      classes: CLASSES, labels: CLASSES.map(label), confusion: cm,
      per_class: perClass, per_step: perStep,
      yawn_detected: this.tracker.yawns.length > this.yawns_before,
      diagnostics,
      limits: Object.fromEntries(Object.entries(lim).map(([k, v]) => [k, pyRound(v, 3)])),
      profile_used: this.profile,
      tuning: this.tuning(),
    };
  }

  /** Find thresholds that separate YOUR 'on screen' numbers from YOUR 'away' numbers. */
  tuning() {
    const on = this.raw.on || [];
    const cur = { side: this.profile.side ?? 1.0, vert: this.profile.vert ?? 1.0, closed: this.profile.closed ?? 0.65 };
    const out = { current: cur, suggested: { ...cur }, notes: [] };
    const bestThreshold = (neg, pos) => {
      if (neg.length < 20 || pos.length < 10) return [null, null];
      const cands = [...new Set([...neg, ...pos].map((v) => pyRound(v, 3)).filter((v) => v >= 0.3 && v <= 3))].sort((a, b) => a - b);
      // at most 3% false alarms while you really look at the screen; inside that, catch most look-aways
      let best = -1, bestT = null, fallback = -1, fallbackT = null;
      for (const t of cands) {
        const tnr = neg.filter((v) => v < t).length / neg.length;
        const tpr = pos.filter((v) => v >= t).length / pos.length;
        const score = (tnr + tpr) / 2;
        if (tnr >= 0.97 && score > best) { best = score; bestT = t; }
        if (score + 0.001 * tnr > fallback) { fallback = score + 0.001 * tnr; fallbackT = t; }
      }
      return bestT !== null ? [bestT, best] : [fallbackT, fallback];
    };
    const sidePos = ['side', 'side_eyes'].flatMap((g) => (this.raw[g] || []).map((r) => r[0]));
    const vertPos = (this.raw.down || []).map((r) => r[1]);
    for (const [key, neg, pos, name] of [['side', on.map((r) => r[0]), sidePos, 'left/right'], ['vert', on.map((r) => r[1]), vertPos, 'up/down']]) {
      const [t] = bestThreshold(neg, pos);
      if (t === null) continue;
      const nw = pyRound(Math.min(2, Math.max(0.3, cur[key] * t)), 2);
      out.suggested[key] = nw;
      if (nw > cur[key] * 1.05) out.notes.push(`Lumen is too strict ${name}: it should allow a bit more movement (×${nw}).`);
      else if (nw < cur[key] * 0.95) out.notes.push(`Lumen misses some ${name} looks: it should be more sensitive (×${nw}).`);
    }
    const onEar = on.map((r) => r[2]).sort((a, b) => a - b);
    const closedEar = (this.raw.closed || []).map((r) => r[2]).sort((a, b) => a - b);
    if (onEar.length > 20 && closedEar.length > 10) {
      const openMed = onEar[Math.floor(onEar.length / 2)];
      const closedMed = closedEar[Math.floor(closedEar.length / 2)];
      const c = pyRound(Math.min(0.8, Math.max(0.5, (openMed + closedMed) / 2)), 2);
      out.suggested.closed = c;
      if (Math.abs(c - cur.closed) > 0.04) out.notes.push(`Eye-closed threshold adjusted to your eyes: ${c} (was ${cur.closed}).`);
    }
    if (!out.notes.length) out.notes.push('Your current settings already fit you well.');
    out.changed = JSON.stringify(out.suggested) !== JSON.stringify(cur);
    out.suggested.version = PROFILE_VERSION;
    return out;
  }
}

/** Simulated person who follows the check's instructions (with human imperfections), for ?fake=1. */
export class FakeFollower {
  constructor({ onSample, onStatus = () => {}, speed = 30, rate = 10 }) {
    Object.assign(this, { onSample, onStatus, speed, rate });
    this.r = rng(3); this.t = 0; this.nextBlink = 2; this.blinkUntil = -1; this.drift = 0;
    this.delegate = 'fake'; this.fpsMeasured = rate; this.lastLandmarks = null;
  }

  async start() {
    this.onStatus({ stage: 'ready', text: 'Fake student (test mode)', delegate: 'fake', phone: true });
    const dt = 1 / this.rate;
    this.timer = setInterval(() => {
      for (let k = 0; k < Math.max(1, Math.floor(this.speed)); k += 1) { this.onSample(this.sample()); this.t += dt; }
    }, dt * 1000);
  }

  sample() {
    const { r, t } = this;
    const i = stepAt(Math.max(0, t - 2));           // hears the voice, then reacts: ~2 s late
    const group = i !== null ? STEPS[i][3] : 'end';
    if (t >= this.nextBlink) { this.blinkUntil = t + 0.15; this.nextBlink = t + 0.4 + r.exponential(3.5); }
    this.drift = 0.95 * this.drift + r.normal(0, 0.012);
    let s = { t, face: true, phone: false, ear: 0.29 + r.normal(0, 0.01), mar: 0.05, yaw: this.drift * 80,
      pitch: r.normal(0, 1.2), gx: 0.5 + r.normal(0, 0.015), gy: r.normal(0, 0.01), size: 0.2, fy: 0.52, bs: null };
    if (t < this.blinkUntil) s.ear = 0.08;
    if (group === 'side') s.yaw += 32;
    else if (group === 'side_eyes') s.gx += 0.13 + r.normal(0, 0.02);
    else if (group === 'down') { s.pitch -= 16; s.gy += 0.035; s.ear -= 0.08; }
    else if (group === 'phone') { s.phone = r.uniform() > 0.15; s.pitch -= 20; }
    else if (group === 'closed') { s.ear = 0.12 + r.normal(0, 0.01); s.gx += r.normal(0, 0.2); s.gy += r.normal(0, 0.1); }
    else if (group === 'absent') s = { t, face: false, phone: false, ear: null, mar: null, yaw: null, pitch: null, gx: null, gy: null, size: null, fy: null, bs: null };
    else if (group === 'yawn') s.mar = 0.8;
    return s;
  }

  stop() { clearInterval(this.timer); }
}
