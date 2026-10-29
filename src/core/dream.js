// dream.js: "My dream", a wish the child earns with stars.
//
// How it works:
//   1. The child talks with their parents, then writes the dream in Lumen ("A trip to the zoo 🦁").
//   2. Lumen works out the price in stars by itself: how big the dream is (small / medium / big,
//      decided by the AI tutor or, without AI, by key words) × how many stars THIS child usually
//      collects in a day. So a dream of the same size takes about the same number of days for
//      every child: fair for a child who studies 20 minutes a day and for one who studies 2 hours.
//   3. Stars come from lessons: 10 focused minutes = 1 star, a lesson without the phone = 1,
//      a new personal focus record = 3. At most DAY_CAP stars a day, so studying for hours
//      is never the way to get there faster. Stars are never taken away.
//   4. At 25 %, 50 % and 75 % Lumi changes (see LOOKS); at 100 % the dream comes true.
//
// Like friend.js everything is a pure function of the lessons; only the dream itself is stored.

const DAY = 86400;
export const DAY_CAP = 8;                    // most stars one day can give (not shown to children)
export const DEFAULT_PER_DAY = 5;            // used until a child has a few lessons
export const SIZE_DAYS = { small: 3, medium: 7, big: 21 };
export const MILESTONES = [25, 50, 75, 100];
export const MAX_TEXT = 40;

const pad = (n) => String(n).padStart(2, '0');
const dayKey = (ts) => { const d = new Date(ts * 1000); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

/**
 * Stars of every lesson, oldest first. Parts of one lesson (paused and continued) count as one lesson.
 * @returns {{lesson_id, started_at, day, stars, focus, nophone, record}[]}
 */
export function lessonStars(sessions) {
  const by = new Map();
  for (const r of sessions.filter((x) => x && x.started_at)) {
    const k = r.lesson_id || r.id;
    const a = by.get(k) || { lesson_id: k, started_at: r.started_at, dur: 0, focused: 0, longest: 0, pickups: 0 };
    a.started_at = Math.min(a.started_at, r.started_at);
    a.dur += (r.duration_sec || 0) / 60;
    a.focused += r.focused_min || 0;
    a.longest = Math.max(a.longest, r.longest_focus || 0);
    a.pickups += (r.pickups || []).length;
    by.set(k, a);
  }
  const used = {};                           // stars already given per day (for the daily cap)
  let best = 0, count = 0;
  const out = [];
  for (const a of [...by.values()].sort((x, y) => x.started_at - y.started_at)) {
    const focus = Math.floor(a.focused / 10);
    const nophone = a.dur >= 20 && !a.pickups ? 1 : 0;
    // a record only counts after a few lessons (the first lessons are always "records")
    const record = count >= 3 && best >= 5 && a.longest > best ? 3 : 0;
    best = Math.max(best, a.longest); count += 1;
    const day = dayKey(a.started_at);
    const stars = Math.max(0, Math.min(focus + nophone + record, DAY_CAP - (used[day] || 0)));
    used[day] = (used[day] || 0) + stars;
    out.push({ lesson_id: a.lesson_id, started_at: a.started_at, day, stars, focus, nophone, record });
  }
  return out;
}

/** How many stars this child usually collects per day (last 14 days), between 2 and DAY_CAP. */
export function starsPerDay(list, now = Date.now() / 1000) {
  if (list.length < 3) return DEFAULT_PER_DAY;
  const from = Math.max(list[0].started_at, now - 14 * DAY);
  const recent = list.filter((x) => x.started_at >= from);
  const days = Math.max(3, Math.min(14, Math.ceil((now - from) / DAY)));
  const v = recent.reduce((a, x) => a + x.stars, 0) / days;
  return Math.max(2, Math.min(DAY_CAP, Math.round(v * 10) / 10));
}

/** The price of a dream of this size for this child. */
export function priceOf(size, perDay) {
  return Math.max(5, Math.round((SIZE_DAYS[size] || SIZE_DAYS.medium) * perDay));
}

// Without AI the size comes from key words (English, Russian, Armenian; word starts, lower case).
const WORDS = {
  small: ['movie', 'film', 'cartoon', 'ice cream', 'icecream', 'candy', 'sweet', 'chocolate', 'pizza', 'cake', 'game time', 'hour of', 'stay up', 'sticker', 'choose',
    'фильм', 'мульт', 'морожен', 'конфет', 'сладк', 'шоколад', 'пицц', 'торт', 'час игр', 'выбрать', 'наклейк', 'не спать',
    'ֆիլմ', 'մուլտ', 'պաղպաղակ', 'կոնֆետ', 'շոկոլադ', 'պիցցա', 'տորթ'],
  big: ['zoo', 'trip', 'travel', 'holiday', 'vacation', 'bike', 'bicycle', 'scooter', 'tablet', 'phone', 'console', 'playstation', 'xbox', 'nintendo', 'laptop', 'camp', 'concert', 'water park', 'aquapark', 'amusement', 'disney', 'puppy', 'kitten',
    'зоопарк', 'поездк', 'путешеств', 'отпуск', 'велосипед', 'самокат', 'планшет', 'телефон', 'приставк', 'ноутбук', 'лагер', 'концерт', 'аквапарк', 'парк аттракц', 'щенок', 'котён', 'котен', 'море',
    'կենդանաբանական', 'ճամփորդ', 'հեծանիվ', 'պլանշետ', 'հեռախոս', 'ճամբար', 'համերգ', 'ծով', 'շնիկ'],
};
/** Size of a dream from its words. Anything not recognised is "medium". */
export function guessSize(text) {
  const s = ` ${String(text || '').toLowerCase()} `;
  if (WORDS.big.some((w) => s.includes(w))) return 'big';
  if (WORDS.small.some((w) => s.includes(w))) return 'small';
  return 'medium';
}

/** The question for the AI tutor, and how to read its answer. */
export function sizePrompt(text) {
  return `A child wrote a wish that they want to earn by studying well: "${String(text).slice(0, MAX_TEXT)}".\n`
    + 'How big is this wish for a normal family?\n'
    + 'small = a small treat or choice (choose the family movie, ice cream, an hour of games)\n'
    + 'medium = a small present or outing (a new ball, a book, the cinema, a park day)\n'
    + 'big = a trip or an expensive thing (the zoo, a bike, a game console, a holiday)\n'
    + 'Also choose the ONE emoji that shows this wish best (any emoji, for example 🛹 for a skateboard, 🦄 for a unicorn toy).\n'
    + 'Answer with exactly two lines and nothing else:\nSIZE: small, medium or big\nEMOJI: the emoji';
}
export function readSize(answer) {
  const m = String(answer || '').toLowerCase().match(/\b(small|medium|big)\b/);
  return m ? m[1] : null;
}

// Emoji that never fit a child's dream picture (the AI is asked nicely, this is the safety net).
const NOT_FOR_KIDS = ['🔫', '💣', '🔪', '🗡', '⚔', '🪓', '🍺', '🍻', '🍷', '🍸', '🍹', '🥂', '🥃', '🍾', '🚬', '💊', '💉', '🖕', '🍆', '🍑', '💩', '☠', '💀', '🩸', '🎰', '💰', '💵', '💸'];
/** The emoji from the AI's answer (one emoji, also ones made of several parts like 👩‍🚀), or null. */
export function readEmoji(answer) {
  const line = String(answer || '').split('\n').find((l) => /emoji/i.test(l)) || String(answer || '');
  const m = line.match(/\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier}|\u200D\p{Extended_Pictographic}\uFE0F?)*/u);
  if (!m) return null;
  return NOT_FOR_KIDS.some((x) => m[0].startsWith(x)) ? null : m[0];
}

/** An emoji for a dream when the child did not pick one. */
const EMOJI_WORDS = [
  ['🦁', ['zoo', 'зоопарк', 'կենդանաբանական']], ['⚽', ['ball', 'football', 'мяч', 'футбол', 'գնդակ']],
  ['🎬', ['movie', 'film', 'cinema', 'фильм', 'кино', 'мульт', 'ֆիլմ', 'կինո']], ['🎮', ['game', 'console', 'игр', 'приставк', 'խաղ']],
  ['🍦', ['ice cream', 'морожен', 'պաղպաղակ']], ['🍕', ['pizza', 'пицц', 'պիցցա']], ['🚲', ['bike', 'велосипед', 'հեծանիվ']],
  ['📚', ['book', 'книг', 'գիրք']], ['🎨', ['paint', 'draw', 'рисова', 'краск', 'նկար']], ['🏊', ['swim', 'pool', 'бассейн', 'плава', 'լող']],
  ['🏖️', ['sea', 'beach', 'море', 'пляж', 'ծով']], ['🎡', ['park', 'парк', 'այգի']], ['✈️', ['trip', 'travel', 'поездк', 'путешеств', 'ճամփորդ']],
];
export function guessEmoji(text) {
  const s = String(text || '').toLowerCase();
  const hit = EMOJI_WORDS.find(([, ws]) => ws.some((w) => s.includes(w)));
  return hit ? hit[0] : '⭐';
}

/**
 * How Lumi changes on the way to a dream: a hat that fits the dream.
 * level 1 (25 %): the dream floats next to Lumi; level 2 (50 %): Lumi puts on the hat;
 * level 3 (75 %): hat + a golden glow; level 4 (100 %): party.
 */
export const LOOKS = [
  { id: 'safari', emoji: ['🦁', '🐼', '🐘', '🦒', '🐒', '🐯', '🦓', '🐶', '🐱', '🐴', '🐰', '🐹', '🦜', '🐢', '🐠', '🦄', '🐬'] },
  { id: 'sport', emoji: ['⚽', '🏀', '🏐', '🎾', '🏊', '🚲', '🛴', '⛸️', '🏓', '🥋', '🛹', '🛼', '🏄', '⛷️', '🏂', '🎿', '🥊', '⚾', '🏈', '🤸', '🩰'] },
  { id: 'cinema', emoji: ['🎬', '🍿', '📺', '🎭'] },
  { id: 'gamer', emoji: ['🎮', '🕹️', '💻', '📱', '🎧', '📷', '🤖'] },
  { id: 'artist', emoji: ['🎨', '📚', '✏️', '🎹', '🎸', '🧩', '🧸'] },
  { id: 'chef', emoji: ['🍦', '🍕', '🍰', '🍫', '🍩', '🍔', '🧁'] },
  { id: 'travel', emoji: ['✈️', '🏖️', '🏕️', '🎡', '🎢', '🏰', '⛰️', '🚂', '🗽', '🗼', '🎠', '🚢', '🏝️', '🌊', '🏔️'] },
];
export function lookOf(emoji) {
  const l = LOOKS.find((x) => x.emoji.includes(emoji));
  return l ? l.id : 'party';
}

/**
 * Everything the pages need about the dream.
 * @param {{current?: object, done?: object[]}} saved the stored dreams (kv 'dream')
 */
export function dreamState(sessions, saved = {}, now = Date.now() / 1000) {
  const list = lessonStars(sessions);
  const perDay = starsPerDay(list, now);
  const total = list.reduce((a, x) => a + x.stars, 0);
  const today = list.filter((x) => x.day === dayKey(now)).reduce((a, x) => a + x.stars, 0);
  const cur = saved.current || null;
  let current = null;
  if (cur) {
    const earned = list.filter((x) => x.started_at >= cur.created_at).reduce((a, x) => a + x.stars, 0) + (cur.bonus || 0);
    const pct = Math.min(100, Math.round(100 * earned / cur.need));
    const level = MILESTONES.filter((m) => pct >= m).length;
    const left = Math.max(0, cur.need - earned);
    current = { ...cur, earned: Math.min(earned, cur.need), raw: earned, pct, level, look: lookOf(cur.emoji),
      ready: earned >= cur.need, days_left: left ? Math.max(1, Math.ceil(left / perDay)) : 0,
      news_level: level > (cur.seen_level || 0) ? level : 0 };
  }
  return { current, done: (saved.done || []).slice(-30), per_day: perDay, stars_total: total, stars_today: today,
    sizes: Object.fromEntries(Object.keys(SIZE_DAYS).map((k) => [k, { stars: priceOf(k, perDay), days: SIZE_DAYS[k] }])) };
}
