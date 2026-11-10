// advice.js: ONE useful piece of advice for the parent each week, found in this week's lessons.
// A short report with one concrete step is read; a long report with ten numbers is not.
//
// Each rule looks for something real in the data. The first one that fits wins; when nothing stands out,
// a general research-based tip (a different one each week) is used.
// Texts are English templates with {placeholders}; the page translates them.

const DAY = 86400;
const hourOf = (ts) => new Date(ts * 1000).getHours();

/** Research-based tips for parents, one per week in turn. */
export const TIPS = [
  'Praise the effort ("you kept going"), not the grade. Children who hear this try harder next time.',
  'Homework at the same time every day becomes a habit, and habits need less willpower than decisions.',
  'Keep the phone in another room during homework. Even a silent phone on the desk pulls attention.',
  'Short breaks every 20–30 minutes help children remember more than one long session.',
  'Ask "what did you find interesting today?" instead of "did you do your homework?".',
  'Sleep is when the brain saves what was learned. A regular bedtime helps more than an extra hour of study.',
  'Let your child explain one thing they learned to you. Explaining is one of the best ways to remember.',
  'A small, tidy place for homework, always the same, helps the brain switch into "study mode".',
];

/**
 * @param {object[]} reports all lessons
 * @returns {{text:string, vars:object, kind:string}}
 */
export function weekAdvice(reports, now = Date.now() / 1000) {
  const week = reports.filter((r) => r && r.started_at >= now - 7 * DAY && (r.duration_sec || 0) >= 5 * 60);
  const hours = week.reduce((a, r) => a + r.duration_sec, 0) / 3600;

  if (week.length >= 3) {
    // 1) a clearly better time of day
    const early = week.filter((r) => hourOf(r.started_at) < 18), late = week.filter((r) => hourOf(r.started_at) >= 18);
    const avg = (rs) => rs.reduce((a, r) => a + (r.avg_attention || 0) * r.duration_sec, 0) / Math.max(1, rs.reduce((a, r) => a + r.duration_sec, 0));
    if (early.length >= 2 && late.length >= 2 && avg(early) - avg(late) >= 12) {
      return { kind: 'time', text: 'Your child focuses much better before 18:00 ({a}% vs {b}% attention). If you can, plan homework earlier.', vars: { a: Math.round(avg(early)), b: Math.round(avg(late)) } };
    }
    // 2) the phone
    const pickups = week.reduce((a, r) => a + (r.pickups || []).length, 0);
    if (hours && pickups / hours >= 2) {
      return { kind: 'phone', text: 'The phone came out {n} times this week. Try keeping it in another room during homework.', vars: { n: pickups } };
    }
    // 3) a class that felt hard
    const hard = {};
    for (const r of week) if (r.feel === 'hard') hard[r.class || 'Other'] = (hard[r.class || 'Other'] || 0) + 1;
    const [cls, n] = Object.entries(hard).sort((a, b) => b[1] - a[1])[0] || [];
    if (n >= 2) return { kind: 'hard', text: '{cls} felt hard {n} times this week. A short talk about it, or a little extra help, could make a big difference.', vars: { cls, n } };
    // 4) sitting too close
    const close = week.filter((r) => (r.too_close_pct || 0) >= 30).length;
    if (close >= 2) return { kind: 'eyes', text: 'Your child often sits too close to the screen. Moving the laptop a little further away helps the eyes.', vars: {} };
    // 5) long lessons without breaks
    const noBreak = week.filter((r) => r.duration_sec >= 50 * 60 && !(r.breaks > 0)).length;
    if (noBreak >= 2) return { kind: 'breaks', text: 'Some lessons were long without a break. A 5-minute break every 25–30 minutes keeps attention fresh.', vars: {} };
  }
  const n = Math.floor(now / (7 * DAY)) % TIPS.length;
  return { kind: 'tip', text: TIPS[n], vars: {} };
}
