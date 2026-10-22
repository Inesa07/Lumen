// fake.js: a simulated student, for testing Lumen without a camera (open any page with ?fake=1).
// Port of FakeWorker (vision.py). `speed` = simulated seconds per real second.
//
// Script (minutes): 12-14.6 turns head away, 19-20 glances aside with the EYES only,
// 22 leaves the frame, 31-33.8 phone, after 38 gets tired (more blinks, slow eye closures, yawns),
// 46-48 looks away again. Expressions: short smiles, frowning at 8-11 and 34-36, sad at 28-29.5.

/** Small seeded random generator (mulberry32), so every test run behaves the same. */
export function rng(seed = 7) {
  let a = seed >>> 0;
  const uniform = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Box-Muller: two uniform numbers -> one normally distributed number
  const normal = (mu = 0, sd = 1) => mu + sd * Math.sqrt(-2 * Math.log(uniform() + 1e-12)) * Math.cos(2 * Math.PI * uniform());
  const exponential = (scale) => -scale * Math.log(1 - uniform());
  return { uniform, normal, exponential };
}

export class FakeVision {
  constructor({ onSample, onStatus = () => {}, speed = 30, rate = 10 }) {
    Object.assign(this, { onSample, onStatus, speed, rate });
    this.r = rng(7);
    this.t = 0;
    this.nextBlink = 3; this.blinkUntil = -1; this.drift = 0;
    this.lastLandmarks = null;
    this.delegate = 'fake';
    this.fpsMeasured = rate;
  }

  async start() {
    this.onStatus({ stage: 'ready', text: 'Fake student (test mode)', delegate: 'fake', phone: true });
    const dt = 1 / this.rate;
    this.timer = setInterval(() => {
      for (let i = 0; i < Math.max(1, Math.floor(this.speed)); i += 1) { this.onSample(this.sample()); this.t += dt; }
    }, dt * 1000);
  }

  sample() {
    const { r, t } = this;
    const m = t / 60;
    const headAway = (m >= 12 && m < 14.6) || (m >= 46.2 && m < 47.9) || m % 9 > 8.75;
    const eyesAway = (m >= 19 && m < 20.2) || m % 4 > 3.9;
    const phone = m >= 31.1 && m < 33.8;
    const tired = m > 38;
    if (t >= this.nextBlink) {
      this.blinkUntil = t + (tired ? 0.3 : 0.15);
      const staring = m >= 15 && m < 19.5;
      this.nextBlink = t + 0.4 + r.exponential(tired ? 2 : staring ? 14 : 3.6);
    }
    let ear = t < this.blinkUntil ? 0.08 : 0.29 + r.normal(0, 0.01);
    if (tired && m % 3 > 2.9) ear = 0.09;
    if (tired) ear -= 0.04;
    const mar = tired && m % 6 < 0.05 ? 0.75 : 0.05;
    this.drift = 0.95 * this.drift + r.normal(0, 0.012);
    const yaw = (headAway ? 35 : 0) + this.drift * 80;
    const gx = 0.5 + (eyesAway ? 0.22 : 0) + r.normal(0, 0.015);
    const gy = (phone ? 0.12 : 0) + r.normal(0, 0.01);
    const pitch = (phone ? -22 : 0) + r.normal(0, 1.2);
    const face = !(m >= 22 && m < 22.3);
    const size = 0.2 * (m >= 50 && m < 52.5 ? 1.35 : 1) + r.normal(0, 0.003);
    const fy = 0.52 + (m >= 24 && m < 27 ? 0.11 : 0) + r.normal(0, 0.005);
    const smiling = m % 7 > 6.6 || (m >= 41 && m < 41.6);
    const frowning = (m >= 8 && m < 11) || (m >= 34 && m < 36);
    const sad = m >= 28 && m < 29.5;
    const smile = 0.62 * (smiling ? 1.16 : 1) + r.normal(0, 0.006);
    const lift = (smiling ? 0.03 : sad ? -0.03 : 0) + r.normal(0, 0.003);
    const brow = 0.3 * (frowning ? 0.86 : sad ? 1.08 : 1) + r.normal(0, 0.004);
    const gap = 0.36 * (frowning ? 0.9 : 1) + r.normal(0, 0.004);
    const bs = {
      smile: (smiling ? 0.75 : 0.04) + Math.abs(r.normal(0, 0.02)),
      frown: (sad ? 0.3 : 0.02) + Math.abs(r.normal(0, 0.01)),
      brow_down: (frowning ? 0.55 : 0.05) + Math.abs(r.normal(0, 0.02)),
      brow_up: (sad ? 0.35 : 0.05) + Math.abs(r.normal(0, 0.02)),
      eye_wide: 0.05, jaw: 0.02, cheek: smiling ? 0.3 : 0.05,
    };
    const s = { t, face, phone, bs: face ? bs : null };
    const vals = { ear, mar, yaw, pitch, gx, gy, size, fy, smile, lift, brow, gap };
    for (const [k, v] of Object.entries(vals)) s[k] = face ? v : null;
    return s;
  }

  stop() { clearInterval(this.timer); }
}
