// tracker.js: the "brain" of Lumen (port of tracker.py).
//
// SessionTracker receives raw samples from the camera (one per frame) and turns them into meaning:
//   * attention 0-100      smooth score from where you look (head AND eyes)
//   * looked-away counter  how many times and for how long you looked off-screen
//   * tiredness            PERCLOS, blink rate, yawns, slow eye closures
//   * mood                 facial expression compared with YOUR calm face
//   * break suggestions    with a recommended length you can change
//   * the lesson report
//
// All timing uses the sample timestamps `t` (seconds), never the wall clock,
// so the same code works for the real camera and for the fast simulation.
import { mmss, clamp, pyRound, pyMod, median, Counter } from './util.js';

export const CALIB_SEC = 15;      // first seconds with a visible face: learn this person's "normal"
const TAU = 6.0;                  // attention smoothing time constant (seconds)
const AWAY_MIN_SEC = 1.5;         // a glance shorter than this is not counted as "looked away"
// Deviation that equals 1.0 "unit" of looking away. yaw/pitch in degrees, gx/gy = iris position in the eye.
const LIMITS = { yaw: 20.0, gx: 0.12, pitch: 15.0, gy: 0.025 };
const ANGLES = new Set(['yaw', 'pitch']);
const IRIS_HIDDEN = 0.45;         // eye openness (vs your normal) below which the iris can't be seen
export const PROFILE_VERSION = 5;

export const BREAK_OPTIONS = [5, 10, 15, 20];
const EYE_EVERY = 20 * 60;        // 20-20-20 rule: every 20 minutes...
const EYE_REST_SEC = 20;          // ...look at something far away for 20 seconds
const POSTURE_ALERT_SEC = 60;
const BLINK_LOW_SEC = 120;
// Smart timing: a suggestion waits for a natural pause, but never longer than this (seconds)
const MAX_WAIT = { tired: 60, sliding: 180, long: 180, eyes: 240, rhythm: 30 };
export const MOODS = ['calm', 'happy', 'surprised', 'frown', 'sad', 'tired'];
const MOOD_WINDOW = 1.2;
const BS_KEYS = ['smile', 'frown', 'brow_down', 'brow_up', 'eye_wide', 'jaw', 'cheek'];
const CALIB_KEYS = ['yaw', 'pitch', 'gx', 'gy', 'ear', 'size', 'fy', 'smile', 'lift', 'brow', 'gap'];
const BASE_KEYS = ['yaw', 'pitch', 'gx', 'gy', 'size', 'fy', 'smile', 'lift', 'brow', 'gap'];

export const stateOf = (att) => (att >= 0.7 ? 'Focused' : att >= 0.4 ? 'Drifting' : 'Lost');
const plural = (n) => (n > 1 ? 's' : '');
const has = (v) => v !== null && v !== undefined;
const newBucket = () => ({ sum: 0, n: 0, reasons: new Counter(), mark: false, brk: false, moods: new Counter() });

export class SessionTracker {
  /**
   * @param {string} title
   * @param {object|null} profile  personal thresholds from the accuracy check
   * @param {object} options       {plan_min, eye_rest, posture, blink, rhythm:{study,break}, mood_sens}
   */
  constructor(title, profile = null, options = {}) {
    this.title = title || 'Study session';
    options = options || {};
    this.plan_min = Math.trunc(options.plan_min || 45);
    this.eye_rest_on = options.eye_rest ?? true;
    this.posture_on = options.posture ?? true;
    this.blink_on = options.blink ?? true;
    const r = options.rhythm || null;
    this.rhythm = r ? { study: Math.trunc(r.study), break: Math.trunc(r.break) } : null;
    if (this.rhythm) this.plan_min = this.rhythm.study;
    this.mood_k = { low: 1.35, normal: 1.0, high: 0.7 }[options.mood_sens || 'normal'] ?? 1.0;
    profile = profile || {};
    if (profile.version !== PROFILE_VERSION) profile = {};
    const side = profile.side ?? 1.0, vert = profile.vert ?? 1.0;
    this.limits = { yaw: LIMITS.yaw * side, gx: LIMITS.gx * side, pitch: LIMITS.pitch * vert, gy: LIMITS.gy * vert };
    this.closed_ratio = profile.closed ?? 0.65;
    this.debug = { side: 0, vert: 0, ear_ratio: 1 };
    this.last_face_t = null; this.last_head_side = 0;
    this.absent_since = null;
    this.started_at = Date.now() / 1000;
    this.t0 = null; this.t = 0; this.last_t = null; this.dt = 0;

    this.calib = Object.fromEntries(CALIB_KEYS.map((k) => [k, []]));
    this.face_time = 0;
    this.base = { yaw: 0, pitch: 0, gx: 0.5, gy: 0, ear: 0.28, size: null, fy: null, smile: null, lift: null, brow: null, gap: null };
    this.calibrated = false;

    this.mood_recent = [];          // [t, raw mood]
    this.bs_calib = []; this.bs_base = null;
    this.mood = null;
    this.mood_time = new Counter();
    this.mood_episodes = new Counter();

    this.att = 0.8;
    this.gaze_on = 1.0;
    this.recent_reasons = [];       // [t, reason]

    this.away_since = null; this.away_counted = false; this.away_count = 0; this.away_total = 0; this.away_events = [];

    this.closed_since = null; this.blinks = []; this.long_closures = []; this.closed_hist = [];
    this.yawn_since = null; this.yawn_counted = false; this.yawns = [];
    this.phone_active = false; this.last_phone_t = -1e9; this.pickups = [];
    this.blink_base = null;
    this.fatigue = { level: 'Low', score: 0, perclos: 0, why: [] };
    this.peak_fatigue = 0;

    this.on_time = 0; this.total_time = 0;
    this.minutes = []; this.halves = [];
    this.marks = []; this.mark_notes = {};
    this.notes_mode = false;

    this.study_since_eyes = 0; this.eye_rest = null; this.eye_rests = 0; this.eye_rest_result = null; this.eyes_snooze_until = 0;
    this.low_blink_since = null; this.blink_nudges = []; this.blink_nudge = false;
    this.pending = null; this.pause_since = null;
    this.posture = 'Good'; this.bad_since = null; this.good_since = null;
    this.posture_good = 0; this.posture_bad = 0; this.posture_alerts = []; this.posture_alert = null;

    this.on_break = false; this.break_until = null; this.breaks = [];   // [start, end, planned minutes]
    this.last_break_end = null; this.dismissed_at = null; this.dismissed_kind = null;
    this.suggestion = null; this.next_check = 0; this.break_just_ended = false;
  }

  // ------------------------------------------------------------------ helpers
  get elapsed() { return this.t0 === null ? 0 : this.t - this.t0; }

  _bucket(arr, size) {
    const idx = Math.trunc(Math.floor(this.elapsed / size));
    while (arr.length <= idx) arr.push(newBucket());
    return arr[idx];
  }

  _calibrate(s) {
    if (s.bs && this.bs_calib.length < 600 && !s.phone) {
      this.bs_calib.push(s.bs);                         // your calm face (blendshapes), first ~minute
      if ([40, 150, 600].includes(this.bs_calib.length)) {
        this.bs_base = Object.fromEntries(BS_KEYS.map((k) => [k, median(this.bs_calib.map((c) => c[k]))]));
      }
    }
    if (this.calibrated || !s.face || s.phone) return;
    this.face_time += this.dt;
    for (const k of CALIB_KEYS) if (has(s[k])) this.calib[k].push(s[k]);
    if (this.face_time >= CALIB_SEC && this.calib.ear.length > 20) {
      for (const k of BASE_KEYS) if (this.calib[k].length) this.base[k] = median(this.calib[k]);
      const ears = [...this.calib.ear].sort((a, b) => a - b);
      this.base.ear = ears[Math.trunc(ears.length * 0.75)];   // open-eye level, ignores blinks
      this.calibrated = true;
    }
  }

  // ------------------------------------------------------------------ one sample
  feed(s) {
    const t = s.t;
    if (this.t0 === null) this.t0 = this.last_t = t;
    this.dt = Math.min(Math.max(t - this.last_t, 0), 0.5);
    this.last_t = this.t = t;

    if (this.on_break) {
      this._bucket(this.minutes, 60).brk = true;
      this._bucket(this.halves, 30).brk = true;
      if (t >= this.break_until) this.end_break(true);
      return;
    }

    this._calibrate(s);
    this._eyes_mouth_phone(s);
    let [reason, instant] = this._reason(s);
    if (this.eye_rest !== null) {
      [reason, instant] = this._eye_rest_step(reason);
    } else {
      this.study_since_eyes += this.dt;
      this._away_counter(reason);
      this._posture_step(s, reason);
      this._mood_step(s, reason);
      this._deliver(reason);
    }
    if (reason === 'absent') this.absent_since = this.absent_since ?? t;
    else this.absent_since = null;

    // exponential moving average: attention moves smoothly towards the instant value
    this.att += (1 - Math.exp(-this.dt / TAU)) * (instant - this.att);

    this.recent_reasons.push([t, reason]);
    while (this.recent_reasons.length && t - this.recent_reasons[0][0] > 3) this.recent_reasons.shift();

    this.total_time += this.dt;
    if (['on', 'drowsy', 'notes', 'eyes'].includes(reason)) this.on_time += this.dt;
    for (const [arr, size] of [[this.minutes, 60], [this.halves, 30]]) {
      const b = this._bucket(arr, size);
      b.sum += this.att; b.n += 1; b.reasons.add(reason);
    }

    if (this.blink_base === null && this.calibrated && this.elapsed >= 6 * 60) {
      const n = this.blinks.filter((b) => this.t0 + 60 <= b && b < this.t0 + 6 * 60).length;
      this.blink_base = Math.max(n / 5, 4);
    }
    if (t >= this.next_check) {
      this.next_check = t + 5;
      this._update_fatigue();
      this._check_suggestion();
    }
  }

  _reason(s) {
    if (s.phone) return ['phone', 0];
    if (!s.face) {
      // Face lost right after a big head turn: you turned away, you didn't leave.
      if (this.last_face_t !== null && this.t - this.last_face_t < 3 && this.last_head_side > 0.7) return ['away', 0];
      return ['absent', 0];
    }
    const dev = (k) => {
      if (!has(s[k])) return 0;
      let diff = s[k] - this.base[k];
      if (ANGLES.has(k)) diff = pyMod(diff + 180, 360) - 180;   // 179° and -179° are close
      return Math.abs(diff) / this.limits[k];
    };
    // with (almost) closed eyes the iris is hidden and its "position" is noise
    const eyesOpen = !has(s.ear) || s.ear / this.base.ear >= IRIS_HIDDEN;
    let headSide = dev('yaw'), headVert = dev('pitch');
    this.last_face_t = this.t; this.last_head_side = headSide;
    for (const k of ['yaw', 'pitch', 'gx', 'gy']) this.debug[k] = has(s[k]) ? s[k] - this.base[k] : null;
    const eyeSide = eyesOpen ? dev('gx') : 0;
    const eyeVert = eyesOpen ? dev('gy') : 0;
    const side = Math.max(headSide, eyeSide);
    let vert = Math.max(headVert, eyeVert);
    if (this.notes_mode) { vert = side <= 1 ? 0 : vert; headVert = vert; }
    const d = Math.max(side, vert);
    this.debug.side = side; this.debug.vert = vert;
    // smooth instead of yes/no: d <= 0.5 -> 1.0 (fully on screen), d >= 1.5 -> 0.0
    this.gaze_on = clamp(1.5 - d);

    if (this.notes_mode && Math.max(dev('pitch'), eyeVert) > 1 && side <= 1) return ['notes', 0.85];
    // order matters: 1) head clearly turned  2) eyes closed  3) eyes looking away
    if (Math.max(headSide, headVert) > 1) return ['away', this.gaze_on * 0.3];
    if (this.closed_since !== null && this.t - this.closed_since > 1) return ['drowsy', 0.2];
    if (d > 1) return ['away', this.gaze_on * 0.3];
    const openness = s.ear ? clamp(s.ear / this.base.ear) : 1;
    const alert = openness > 0.8 ? 1 : 0.85;
    return ['on', this.gaze_on * alert];
  }

  // ------------------------------------------------------------------ 20-20-20 eye rest
  _eye_rest_step(reason) {
    const er = this.eye_rest;
    er.elapsed += this.dt;
    if (reason === 'away' || reason === 'absent') er.done += this.dt;
    if (er.done >= EYE_REST_SEC) {
      this.eye_rest = null; this.eye_rests += 1; this.study_since_eyes = 0; this.eye_rest_result = 'done';
    } else if (er.elapsed > 90) {                  // gave up: ask again in 5 minutes
      this.eye_rest = null; this.study_since_eyes = EYE_EVERY - 5 * 60; this.eye_rest_result = 'timeout';
    }
    return ['eyes', this.att];
  }

  start_eye_rest() {
    if (this.on_break || this.eye_rest !== null) return;
    this.eye_rest = { done: 0, elapsed: 0 };
    if (this.suggestion && this.suggestion.kind === 'eyes') this.suggestion = null;
    if (this.pending && this.pending.kind === 'eyes') this.pending = null;
  }

  // ------------------------------------------------------------------ posture
  _posture_step(s, reason) {
    if (!this.posture_on || !this.calibrated || !s.face || s.phone || reason === 'away' || reason === 'notes'
        || !has(s.size) || !this.base.size) return;
    const ratio = s.size / this.base.size;
    const drop = s.fy - this.base.fy;
    const state = ratio > 1.25 ? 'Leaning in' : drop > 0.08 ? 'Slouching' : 'Good';
    if (state === 'Good') {
      this.posture_good += this.dt;
      this.good_since = this.good_since ?? this.t;
      if (this.t - this.good_since > 3) { this.bad_since = null; this.posture = 'Good'; }
      return;
    }
    this.posture_bad += this.dt;
    this.good_since = null;
    this.posture = state;
    if (this.bad_since === null) this.bad_since = this.t;
    const recent = this.posture_alerts.length && this.t - this.posture_alerts.at(-1) < 10 * 60;
    if (this.t - this.bad_since >= POSTURE_ALERT_SEC && !recent) {
      this.posture_alerts.push(this.t); this.posture_alert = state; this.bad_since = null;
    }
  }

  // ------------------------------------------------------------------ mood
  _mood_raw(s, reason) {
    if (!this.calibrated || !s.face || s.phone || !has(s.smile) || !this.base.smile
        || ['away', 'absent', 'phone'].includes(reason)) return null;
    if (reason === 'drowsy') return 'tired';
    const expr = this._expression(s);
    if (expr === 'calm' && this.fatigue.level !== 'Low') return 'tired';
    return expr;
  }

  _expression(s) {
    const b = this.base;
    if (Math.abs(s.yaw - b.yaw) > 20 || Math.abs(s.pitch - b.pitch) > 15) return null;
    const k = this.mood_k;
    const bs = s.bs;
    if (bs && this.bs_base) {
      // expression scores from the neural network, compared with YOUR calm face
      const d = Object.fromEntries(BS_KEYS.map((key) => [key, bs[key] - this.bs_base[key]]));
      if (bs.jaw > 0.55 && d.brow_up < 0.2) return null;          // yawning or talking
      if (d.smile > 0.22 * k) return 'happy';
      if (d.brow_up > 0.30 * k && (d.eye_wide > 0.15 * k || bs.jaw > 0.2)) return 'surprised';
      if (d.frown > 0.12 * k || (d.brow_up > 0.22 * k && d.frown > 0.04 && d.smile < 0.05)) return 'sad';
      if (d.brow_down > 0.22 * k) return 'frown';
      return 'calm';
    }
    // fallback without the expression model: distances between face points
    if (has(s.mar) && s.mar > 0.35) return null;
    const wider = s.smile / b.smile - 1;
    const lift = s.lift - b.lift;
    const brow = s.brow / b.brow - 1;
    const gap = s.gap / b.gap - 1;
    if ((wider > 0.05 * k && lift > 0.006 * k) || wider > 0.09 * k) return 'happy';
    if (lift < -0.012 * k && wider < 0.03 && (brow > 0.03 * k || lift < -0.02 * k)) return 'sad';
    if (brow < -0.06 * k || gap < -0.045 * k) return 'frown';
    return 'calm';
  }

  _mood_step(s, reason) {
    const raw = this._mood_raw(s, reason);
    const t = this.t;
    if (raw !== null) this.mood_recent.push([t, raw]);
    while (this.mood_recent.length && t - this.mood_recent[0][0] > MOOD_WINDOW) this.mood_recent.shift();
    if (!this.mood_recent.length) return;
    const c = new Counter();
    for (const [, m] of this.mood_recent) c.add(m);
    const [top, n] = c.mostCommon(1)[0];
    if (top !== this.mood && n >= 0.5 * this.mood_recent.length) {
      if (this.mood !== null || top !== 'calm') this.mood_episodes.add(top);
      this.mood = top;
    }
    if (raw !== null && this.mood !== null) {
      this.mood_time.add(this.mood, this.dt);
      this._bucket(this.minutes, 60).moods.add(this.mood);
      this._bucket(this.halves, 30).moods.add(this.mood);
    }
  }

  _mood_summary(mins) {
    const total = this.mood_time.values().reduce((a, b) => a + b, 0);
    if (total < 30) return null;
    const pct = Object.fromEntries(MOODS.map((m) => [m, Math.trunc(pyRound(100 * this.mood_time.get(m) / total))]));
    let main = MOODS[0];
    for (const m of MOODS) if (this.mood_time.get(m) > this.mood_time.get(main)) main = m;
    let best = 0, runStart = null, hard = null;
    [...mins, { mood: null }].forEach((m, i) => {
      if (m.mood === 'frown') runStart = runStart ?? i;
      else if (runStart !== null) {
        if (i - runStart > best) { best = i - runStart; hard = [runStart, i]; }
        runStart = null;
      }
    });
    return { pct, main, smiles: this.mood_episodes.get('happy'), frowns: this.mood_episodes.get('frown'),
      hard: hard === null ? null : { from: mmss(hard[0] * 60), to: mmss(hard[1] * 60) } };
  }

  _away_counter(reason) {
    if (reason === 'away') {
      if (this.away_since === null) { this.away_since = this.t; this.away_counted = false; }
      const dur = this.t - this.away_since;
      if (dur >= AWAY_MIN_SEC) {
        if (!this.away_counted) {
          this.away_count += 1; this.away_counted = true;
          this.away_events.push(this.away_since - this.t0);
          this.away_total += dur;                // include the first seconds of this look-away
        } else this.away_total += this.dt;
      }
    } else this.away_since = null;
  }

  _eyes_mouth_phone(s) {
    const t = s.t;
    if (s.face && has(s.ear)) {
      const ratio = s.ear / this.base.ear;
      this.debug.ear_ratio = ratio;
      const closed = ratio < this.closed_ratio;
      this.closed_hist.push([t, ratio < 0.5]);
      while (this.closed_hist.length && t - this.closed_hist[0][0] > 60) this.closed_hist.shift();
      if (closed && this.closed_since === null) this.closed_since = t;
      else if (!closed && this.closed_since !== null) {
        const dur = t - this.closed_since;
        if (dur >= 0.03 && dur <= 0.5) this.blinks.push(t);
        else if (dur > 1) this.long_closures.push(t);
        this.closed_since = null;
      }
      if (s.mar > 0.5) {
        if (this.yawn_since === null) this.yawn_since = t;
        if (!this.yawn_counted && t - this.yawn_since >= 1) { this.yawns.push(t); this.yawn_counted = true; }
      } else if (s.mar < 0.35) { this.yawn_since = null; this.yawn_counted = false; }
    }
    if (s.phone) {
      if (!this.phone_active && t - this.last_phone_t > 5) this.pickups.push(t);
      this.phone_active = true; this.last_phone_t = t;
    } else if (this.phone_active && t - this.last_phone_t > 3) this.phone_active = false;
  }

  // ------------------------------------------------------------------ tiredness
  _update_fatigue() {
    const t = this.t;
    const n = this.closed_hist.length;
    const perclos = n > 50 ? this.closed_hist.filter(([, c]) => c).length / n : 0;
    const rate = this.blink_rate();
    const yawns10 = this.yawns.filter((y) => t - y <= 600).length;
    const slow5 = this.long_closures.filter((c) => t - c <= 300).length;
    const parts = {
      // PERCLOS: % of the last minute with eyes mostly closed. Alert ~2-5%, tired > 12%.
      perclos: clamp((perclos - 0.04) / 0.10, 0, 1.5),
      blinks: this.blink_base && rate !== null ? clamp((rate / this.blink_base - 1) / 0.6, 0, 1.5) : 0,
      yawns: clamp(yawns10 / 2, 0, 1.5),
      closures: clamp(slow5 / 3, 0, 1.5),
    };
    // the strongest sign counts most, the others add a little
    const vals = Object.values(parts).sort((a, b) => b - a);
    const score = vals[0] + 0.25 * vals.slice(1).reduce((a, b) => a + b, 0);
    const why = [];
    if (parts.perclos >= 0.6) why.push(`your eyes were closed ${Math.trunc(pyRound(perclos * 100))}% of the last minute`);
    if (parts.blinks >= 0.6) why.push(`you blink ${rate} times a minute, usually ${Math.trunc(pyRound(this.blink_base))}`);
    if (yawns10) why.push(`you yawned ${yawns10} time${plural(yawns10)}`);
    if (slow5) why.push(`your eyes closed slowly ${slow5} time${plural(slow5)}`);
    const level = score >= 1 ? 'High' : score >= 0.6 ? 'Medium' : 'Low';
    this.fatigue = { level, score: pyRound(score, 2), perclos: Math.trunc(pyRound(perclos * 100)), why };
    this.peak_fatigue = Math.max(this.peak_fatigue, score);
  }

  recommended_minutes() {
    if (this.rhythm) return this.rhythm.break;
    const f = this.fatigue.score;
    let rec = f >= 1.3 ? 15 : f >= 1.0 ? 10 : 5;
    if (this.elapsed > 90 * 60) rec = Math.max(rec, 15);
    return rec;
  }

  // ------------------------------------------------------------------ actions
  note_last_mark(text) {
    if (this.marks.length && text) this.mark_notes[this.marks.length - 1] = String(text).trim().slice(0, 300);
  }

  mark_confusing() {
    this.marks.push(this.t);
    this._bucket(this.minutes, 60).mark = true;
    const recent = this.marks.filter((m) => this.t - m <= 600);
    if (recent.length >= 3 && !this.on_break) {
      this.suggestion = {
        kind: 'confused', action: 'end', title: 'Lots of confusing moments',
        text: `You marked ${recent.length} confusing moments in the last 10 minutes. `
          + 'It may be better to stop here, review them, and come back with fresh eyes.',
      };
    }
  }

  start_break(minutes = 5) {
    if (this.on_break) return;
    minutes = Math.trunc(clamp(minutes, 1, 60));
    this.on_break = true;
    this.break_until = this.t + minutes * 60;
    this.breaks.push([this.t, null, minutes]);
    this.suggestion = null; this.pending = null; this.away_since = null; this.eye_rest = null;
    this.study_since_eyes = 0;                     // a break also rests the eyes
  }

  extend_break(minutes = 5) {
    if (this.on_break) { this.break_until += minutes * 60; this.breaks.at(-1)[2] += minutes; }
  }

  end_break(auto = false) {
    if (!this.on_break) return;
    this.on_break = false;
    this.breaks.at(-1)[1] = this.t;
    this.last_break_end = this.t;
    this.att = Math.max(this.att, 0.75);
    this.closed_hist = []; this.long_closures = [];    // tiredness is measured again from scratch
    this.break_just_ended = auto;
  }

  dismiss() {
    const kind = this.suggestion ? this.suggestion.kind : null;
    this.suggestion = null;
    if (kind === 'eyes') { this.eyes_snooze_until = this.t + 5 * 60; return; }
    this.dismissed_kind = kind;
    this.dismissed_at = this.t;
  }

  set_notes(on) { this.notes_mode = !!on; }

  // ------------------------------------------------------------------ suggestions
  _avg_window(start, end) {
    const vals = [];
    this.halves.forEach((b, i) => { if (start <= i * 30 && i * 30 < end && b.n) vals.push(b.sum / b.n); });
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  _break_candidate() {
    const e = this.elapsed, t = this.t;
    if (e < 3 * 60 || !this.calibrated) return null;
    if (this.dismissed_at !== null && t - this.dismissed_at < 10 * 60) {
      // tiredness is more important: it may interrupt a "Not now" given to another suggestion
      const tiredNow = this.fatigue.score >= 1 && this.dismissed_kind !== 'tired';
      if (!(tiredNow && t - this.dismissed_at >= 3 * 60)) return null;
    }
    if (this.last_break_end !== null && t - this.last_break_end < 10 * 60) return null;

    const last6 = this._avg_window(e - 360, e);
    const last3 = this._avg_window(e - 180, e), prev3 = this._avg_window(e - 360, e - 180);
    const sliding = e >= 6 * 60 && last6 !== null && last3 !== null && prev3 !== null && last6 < 0.65 && last3 < prev3 - 0.05;
    const since = t - (this.last_break_end ?? this.t0);
    const why = () => this.fatigue.why.slice(0, 2).join(', ') || 'several signs of tiredness';

    if (this.rhythm) {
      if (since >= this.rhythm.study * 60) {
        return ['rhythm', 'Time for your break',
          `You planned ${this.rhythm.study} minutes of study and a ${this.rhythm.break}-minute break. `
          + 'Stand up, drink water, look far away.'];
      }
      if (this.fatigue.score >= 1.3) return ['tired', 'You look very tired', `Lumen noticed that ${why()}. Take your break a bit earlier?`];
      return null;
    }
    if (this.fatigue.score >= 1) return ['tired', 'You look tired', `Lumen noticed that ${why()}. Do you want to rest for a bit?`];
    if (sliding) return ['sliding', 'Break suggestion', 'Attention has been sliding for 6 minutes. A short break now usually brings it back.'];
    if (since > this.plan_min * 60) {
      return ['long', 'Planned break',
        `You have studied ${this.plan_min} minutes without a break. That is about when your `
        + 'attention usually starts to drop, so a short break now keeps the next part sharp.'];
    }
    return null;
  }

  breakOptions() {
    return [...new Set([...BREAK_OPTIONS, ...(this.rhythm ? [this.rhythm.break] : [])])].sort((a, b) => a - b);
  }

  _check_suggestion() {
    if (this.on_break || this.eye_rest !== null) return;
    this._check_blink();
    const cur = this.suggestion || this.pending;
    if (cur && cur.kind === 'confused') return;
    const cand = this._break_candidate();
    if (cand) {
      const [kind, title, text] = cand;
      // one suggestion at a time; but a break beats an eye rest, and tiredness beats the rest
      if (cur === null || cur.kind === 'eyes' || (kind === 'tired' && ['sliding', 'long'].includes(cur.kind))) {
        this._offer({ kind, action: 'break', title, text, minutes: this.recommended_minutes(), options: this.breakOptions() });
      }
      return;
    }
    if (cur === null && this.eye_rest_on && this.calibrated && this.study_since_eyes >= EYE_EVERY && this.t >= this.eyes_snooze_until) {
      this._offer({
        kind: 'eyes', action: 'eyes', title: 'Rest your eyes · 20-20-20',
        text: 'You have looked at the screen for 20 minutes. Look at something at least '
          + '6 metres away for 20 seconds. Lumen counts only the seconds you look away.',
      });
    }
  }

  // ------------------------------------------------------------------ smart timing
  _offer(sug) {
    if (this.suggestion !== null) this.suggestion = null;   // an upgrade replaces what is on screen
    sug.since = this.t;
    this.pending = sug;
  }

  _deliver(reason) {
    if (this.pending === null) return;
    if (['away', 'absent', 'notes', 'phone'].includes(reason)) this.pause_since = this.pause_since ?? this.t;
    else this.pause_since = null;
    const natural = (this.pause_since !== null && this.t - this.pause_since >= 1) || this.att < 0.6;
    const waited = this.t - this.pending.since;
    if (natural || waited >= (MAX_WAIT[this.pending.kind] ?? 120)) {
      const sug = this.pending;
      sug.waited = Math.trunc(waited);
      sug.at_pause = !!natural;
      this.pending = null;
      this.suggestion = sug;
    }
  }

  // ------------------------------------------------------------------ blink reminder
  _check_blink() {
    if (!this.blink_on || !this.calibrated || this.elapsed < 3 * 60) return;
    const rate = this.blink_rate();
    if (rate === null) return;
    const lowLimit = this.blink_base ? 0.5 * this.blink_base : 6;
    const reason = this.recent_reasons.length ? this.recent_reasons.at(-1)[1] : 'on';
    if (rate >= lowLimit) { this.low_blink_since = null; return; }
    if (reason !== 'on') return;
    this.low_blink_since = this.low_blink_since ?? this.t;
    const recent = this.blink_nudges.length && this.t - this.blink_nudges.at(-1) < 10 * 60;
    if (this.t - this.low_blink_since >= BLINK_LOW_SEC && !recent) {
      this.blink_nudges.push(this.t); this.blink_nudge = true; this.low_blink_since = null;
    }
  }

  // ------------------------------------------------------------------ live numbers
  blink_rate() {
    if (this.elapsed < 60) return null;
    return this.blinks.filter((b) => this.t - b <= 60).length;
  }

  snapshot() {
    const rc = new Counter();
    for (const [, r] of this.recent_reasons) rc.add(r);
    const reason = rc.top() || 'on';
    const state = this.on_break ? 'On break' : stateOf(this.att);
    let headline, detail;
    if (this.on_break) [headline, detail] = ['Break time', 'Stand up, look far away, drink water. Lumen is paused.'];
    else if (!this.calibrated) [headline, detail] = ['Getting to know you', 'Look at your lesson as usual for 15 seconds so Lumen learns your normal posture.'];
    else if (reason === 'phone') [headline, detail] = ['Phone in hand', 'Attention drops while the phone is out.'];
    else if (reason === 'absent') [headline, detail] = ['Not in frame', "Lumen can't see your face right now."];
    else if (reason === 'away') [headline, detail] = ['Eyes off the screen', 'You are looking away from the lesson.'];
    else if (reason === 'notes') [headline, detail] = ['Taking notes', 'Notes mode: looking down at your notebook is fine.'];
    else if (reason === 'eyes') [headline, detail] = ['Eye rest', 'Look far away, out of a window if you can. Lumen counts the seconds.'];
    else if (reason === 'drowsy') [headline, detail] = ['Eyes are closing', 'Signs of tiredness. A break might help.'];
    else if (state === 'Focused') [headline, detail] = ["You're with the lesson", 'Eyes on screen and steady blinking.'];
    else [headline, detail] = ['Coming back', 'Attention is recovering.'];

    const e = this.elapsed;
    const first = Math.max(0, Math.trunc(Math.floor(e / 30)) - 39);
    const recentHalves = this.halves.slice(first);
    const spark = recentHalves.map((b) => (b.n ? Math.trunc(pyRound(100 * b.sum / b.n)) : null));
    const moodSpark = recentHalves.map((b) => (b.moods.size ? b.moods.top() : null));
    const ended = this.break_just_ended; this.break_just_ended = false;
    const eyeResult = this.eye_rest_result; this.eye_rest_result = null;
    const postureAlert = this.posture_alert; this.posture_alert = null;
    const blinkNudge = this.blink_nudge; this.blink_nudge = false;
    const since = this.t - (this.last_break_end ?? (this.t0 || 0));
    return {
      title: this.title,
      elapsed: Math.trunc(e),
      calibrating: !this.calibrated,
      attention: Math.trunc(pyRound(this.att * 100)),
      state, reason, headline, detail,
      eyes_on: this.total_time ? Math.trunc(pyRound(100 * this.on_time / this.total_time)) : 100,
      away_count: this.away_count,
      away_total: mmss(this.away_total),
      blink_rate: this.blink_rate(),
      blink_base: this.blink_base === null ? null : Math.trunc(pyRound(this.blink_base)),
      yawns: this.yawns.length,
      fatigue: this.fatigue,
      pickups: this.pickups.length,
      last_pickup: this.pickups.length ? mmss(this.pickups.at(-1) - this.t0) : null,
      spark, mood_spark: moodSpark, spark_from: mmss(first * 30), spark_to: mmss(e),
      rhythm: this.rhythm, block: this.breaks.length + 1,
      options: this.breakOptions(),
      suggestion: this.suggestion,
      recommended: this.recommended_minutes(),
      marks: this.marks.length,
      breaks: this.breaks.length,
      on_break: this.on_break,
      break_left: this.on_break ? Math.trunc(this.break_until - this.t) : 0,
      break_ended: ended,
      notes_mode: this.notes_mode,
      plan_min: this.plan_min,
      next_break_in: Math.max(0, Math.trunc(pyRound((this.plan_min * 60 - since) / 60))),
      eye_rest: this.eye_rest === null ? null : { done: Math.trunc(this.eye_rest.done), needed: EYE_REST_SEC },
      eye_rest_result: eyeResult,
      eye_rests: this.eye_rests,
      eyes_in: this.eye_rest_on ? Math.max(0, Math.trunc(pyRound((EYE_EVERY - this.study_since_eyes) / 60))) : null,
      posture: this.posture_on && this.calibrated && this.base.size ? this.posture : null,
      posture_alert: postureAlert,
      blink_nudge: blinkNudge,
      waiting: this.pending ? this.pending.kind : null,
      mood: this.on_break ? null : this.mood,
    };
  }

  // ------------------------------------------------------------------ report
  report() {
    if (this.on_break) this.end_break();
    const mins = this.minutes.map((b) => {
      const mood = b.moods.size ? b.moods.top() : null;
      if (b.n >= 50) {                             // at least ~5 seconds of real (non-break) data
        const a = b.sum / b.n;
        return { att: Math.trunc(pyRound(a * 100)), state: stateOf(a).toLowerCase(), mood, mark: b.mark, brk: b.brk, reasons: b.reasons.toObject() };
      }
      return { att: null, state: b.brk ? 'break' : 'none', mood: null, mark: b.mark, brk: b.brk, reasons: b.reasons.toObject() };
    });
    const valid = mins.filter((m) => m.att !== null).map((m) => m.att);
    const avg = valid.length ? Math.trunc(pyRound(valid.reduce((a, b) => a + b, 0) / valid.length)) : 0;
    // a partial last minute counts only for the part that was recorded
    const full = Math.max(...this.minutes.slice(0, -1).map((b) => b.n), 0) || 600;
    let fm = 0;
    this.minutes.forEach((b, i) => { if (mins[i].state === 'focused') fm += Math.min(1, b.n / full); });
    const focusedMin = Math.trunc(pyRound(fm));
    const breakMin = this.breaks.reduce((acc, [s, e]) => acc + Math.trunc(pyRound(((e ?? this.t) - s) / 60)), 0);

    let longest = 0, run = 0;
    for (const m of mins) {
      run = m.state === 'focused' ? run + 1 : (m.state === 'none' ? run : 0);
      longest = Math.max(longest, run);
    }
    const pg = this.posture_good + this.posture_bad;
    return {
      title: this.title,
      started_at: this.started_at,
      duration_sec: Math.trunc(this.elapsed),
      longest_focus: longest,
      fell_after: SessionTracker._fell(mins),
      avg_attention: avg,
      focused_min: focusedMin,
      breaks: this.breaks.length,
      break_min: breakMin,
      marks: this.marks.length,
      questions: this.marks.map((m, i) => ({ time: mmss(m - this.t0), text: this.mark_notes[i] || '' })),
      eye_rests: this.eye_rests,
      blink_reminders: this.blink_nudges.length,
      posture_alerts: this.posture_alerts.length,
      posture_good_pct: pg > 0 ? Math.trunc(pyRound(100 * this.posture_good / pg)) : null,
      plan_min: this.plan_min,
      rhythm: this.rhythm,
      away_count: this.away_count,
      away_total: mmss(this.away_total),
      pickups: this.pickups.map((p) => mmss(p - this.t0)),
      yawns: this.yawns.length,
      peak_fatigue: this.peak_fatigue >= 1 ? 'High' : this.peak_fatigue >= 0.6 ? 'Medium' : 'Low',
      minutes: mins,
      rewatch: this._rewatch(mins),
      mood: this._mood_summary(mins),
      insights: this._insights(mins),
    };
  }

  _rewatch(mins) {
    const items = [];
    const bad = (m) => m.state === 'lost' || m.state === 'drifting' || m.mark;
    let i = 0;
    const n = mins.length;
    while (i < n) {
      if (bad(mins[i])) {
        let j = i;
        while (j < n && bad(mins[j])) j += 1;
        const run = mins.slice(i, j);
        const marked = run.some((x) => x.mark);
        if (run.some((x) => x.state === 'lost') || marked) items.push(this._describe(i, j, run, marked));
        i = j;
      } else i += 1;
    }
    return items.slice(0, 6);
  }

  _describe(i, j, run, hasMark) {
    const reasons = new Counter();
    for (const x of run) for (const [k, v] of Object.entries(x.reasons)) if (k !== 'on' && k !== 'notes') reasons.add(k, v);
    const top = reasons.top();
    const span = j - i;
    const titles = { phone: 'Phone in hand', away: 'Attention lost, looked away', drowsy: 'Tired, eyes closing', absent: 'Away from the screen' };
    const whys = { phone: `Phone out for about ${span} min`, away: `Eyes off the screen for about ${span} min`,
      drowsy: 'Long eye closures, likely tiredness', absent: 'Your face was out of frame' };
    let title = titles[top] || 'Marked confusing';
    if (hasMark && top) title += ', also marked confusing';
    return { from: mmss(i * 60), to: mmss(j * 60), title, why: whys[top] || "You pressed 'Mark as confusing' here" };
  }

  /** First minute (after the 10th) where a 3-minute window drops below 60% attention. */
  static _fell(mins) {
    const atts = mins.map((m) => m.att);
    for (let k = 10; k < atts.length - 2; k += 1) {
      const w = atts.slice(k, k + 3).filter((a) => a !== null);
      if (w.length && w.reduce((a, b) => a + b, 0) / w.length < 60) return k;
    }
    return null;
  }

  _insights(mins) {
    const out = [];
    const fell = SessionTracker._fell(mins);
    if (fell !== null) {
      out.push(`Attention fell after <strong>about ${fell} minutes</strong>. Next time, take the first break at minute ${Math.max(fell - 2, 5)}.`);
    } else if (mins.length >= 10) out.push('You stayed focused for <strong>most of the lesson</strong>. Keep this rhythm.');
    else out.push('Short session. Lumen gives better advice after <strong>10+ minutes</strong>.');

    if (this.away_count) out.push(`You looked away <strong>${this.away_count} times</strong>, <strong>${mmss(this.away_total)}</strong> in total.`);
    if (this.pickups.length) {
      out.push(`The phone came out <strong>${this.pickups.length} time${plural(this.pickups.length)}</strong>, first at ${mmss(this.pickups[0] - this.t0)}.`);
    } else out.push('<strong>No phone pickups</strong> this session.');
    if (this.peak_fatigue >= 1) out.push('Lumen saw <strong>clear signs of tiredness</strong>. Studying earlier in the day or after sleep may help.');

    const done = this.breaks.filter(([, e]) => e !== null && this.t - e >= 120);
    if (done.length) {
      let good = 0;
      for (const [, e] of done) {
        const k = Math.trunc(Math.floor((e - this.t0) / 60));
        const after = mins.slice(k, k + 3).filter((m) => m.att !== null).map((m) => m.att);
        if (after.length && Math.max(...after) >= 70) good += 1;
      }
      out.push(`<strong>${good} of ${done.length}</strong> breaks brought attention back above 70% within 3 minutes.`);
    } else if (!this.breaks.length && mins.length >= 30) out.push('No breaks this time. Try one when Lumen suggests it and compare the map.');
    const ms = this._mood_summary(mins);
    if (ms && ms.hard) out.push(`You frowned most from <strong>${ms.hard.from} to ${ms.hard.to}</strong>. Maybe that part was hard: it's a good place to start your review.`);
    if (ms && ms.smiles) out.push(`You smiled <strong>${ms.smiles} time${plural(ms.smiles)}</strong> during the lesson.`);
    if (this.marks.length >= 3) out.push(`You marked <strong>${this.marks.length} confusing moments</strong>. Start your review there.`);
    if (this.blink_nudges.length) {
      out.push(`You blinked much less than usual <strong>${this.blink_nudges.length} time${plural(this.blink_nudges.length)}</strong>. Screen staring dries the eyes: blink, and use the eye rests.`);
    }
    if (this.eye_rests) out.push(`You rested your eyes <strong>${this.eye_rests} time${plural(this.eye_rests)}</strong> (20-20-20).`);
    if (this.posture_alerts.length) {
      out.push(`Lumen reminded you about your <strong>posture ${this.posture_alerts.length} time${plural(this.posture_alerts.length)}</strong>. Check your chair and screen height.`);
    }
    return out;
  }
}
