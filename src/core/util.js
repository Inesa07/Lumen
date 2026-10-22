// util.js: small helpers that behave exactly like their Python versions,
// so the JavaScript tracker gives the same numbers as the original Python one.

/** "m:ss" from seconds */
export function mmss(sec) {
  const s = Math.trunc(Math.max(0, sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));

/** Python's round(): halves go to the EVEN number (2.5 -> 2, 3.5 -> 4), "banker's rounding". */
export function pyRound(x, digits = 0) {
  const f = 10 ** digits;
  const v = x * f;
  const r = Math.round(v);
  const isHalf = Math.abs(v % 1) === 0.5;
  const out = isHalf && r % 2 !== 0 ? r - 1 : r;
  return out / f;
}

/** Python's % : the result has the sign of the divisor (-10 % 360 = 350, not -10). */
export const pyMod = (a, b) => ((a % b) + b) % b;

/** statistics.median */
export function median(values) {
  const v = [...values].sort((a, b) => a - b);
  const n = v.length;
  if (!n) throw new Error('median of empty list');
  return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
}

/** collections.Counter: counts things; mostCommon() keeps first-seen order for ties, like Python. */
export class Counter {
  constructor(obj) {
    this.m = new Map();
    if (obj) for (const [k, v] of Object.entries(obj)) this.m.set(k, v);
  }
  add(k, n = 1) { this.m.set(k, (this.m.get(k) || 0) + n); }
  get(k) { return this.m.get(k) || 0; }
  get size() { return this.m.size; }
  values() { return [...this.m.values()]; }
  mostCommon(n) {
    const arr = [...this.m.entries()].sort((a, b) => b[1] - a[1]);   // Array.sort is stable
    return n === undefined ? arr : arr.slice(0, n);
  }
  top() { const mc = this.mostCommon(1); return mc.length ? mc[0][0] : null; }
  toObject() { return Object.fromEntries(this.m); }
  update(obj) { for (const [k, v] of Object.entries(obj)) this.add(k, v); }
}
