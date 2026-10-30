// The sites blocked during a lesson, until a parent or the child changes the list in the popup.
const DEFAULT_SITES = [
  'youtube.com', 'tiktok.com', 'instagram.com', 'facebook.com', 'x.com', 'twitter.com', 'reddit.com', 'twitch.tv',
  'netflix.com', 'roblox.com', 'discord.com', 'pinterest.com', 'snapchat.com', 'vk.com', 'ok.ru', 'poki.com',
  'crazygames.com', 'miniclip.com', 'friv.com', 'web.telegram.org', 'web.whatsapp.com', 'kick.com', '9gag.com',
];

/** "https://www.YouTube.com/watch?v=1" → "youtube.com"; null when it isn't a domain. */
function cleanSite(s) {
  let d = String(s || '').trim().toLowerCase();
  if (!d) return null;
  d = d.replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0].replace(/:\d+$/, '');
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) ? d : null;
}

// a few words in the child's language (the browser language)
const LANG = (navigator.language || 'en').slice(0, 2);
const WORDS = {
  ru: {
    'Back to your lesson!': 'Возвращайся к уроку!',
    '{site} will open again after the lesson.': '{site} снова откроется после урока.',
    'Lumi is studying with you 📖': 'Луми учится вместе с тобой 📖',
    'Back to Lumen': 'Вернуться в Lumen',
    'The lesson is over. You can open it now.': 'Урок закончился. Теперь можно открыть.',
    'Open {site}': 'Открыть {site}',
    'Lesson running: these sites are blocked': 'Идёт урок: эти сайты заблокированы',
    'No lesson now: everything is open': 'Сейчас нет урока: всё открыто',
    'Blocked during lessons': 'Блокируются во время урока',
    'One site per line': 'Один сайт на строку',
    'Save': 'Сохранить', 'Saved ✓': 'Сохранено ✓', 'Reset': 'По умолчанию',
    'You can change the list after the lesson.': 'Список можно изменить после урока.',
    'Open Lumen': 'Открыть Lumen',
  },
  hy: {
    'Back to your lesson!': 'Վերադարձիր դասին։',
    '{site} will open again after the lesson.': '{site}-ը նորից կբացվի դասից հետո։',
    'Lumi is studying with you 📖': 'Լումին սովորում է քեզ հետ 📖',
    'Back to Lumen': 'Վերադառնալ Lumen',
    'The lesson is over. You can open it now.': 'Դասն ավարտվեց։ Հիմա կարող ես բացել։',
    'Open {site}': 'Բացել {site}',
    'Lesson running: these sites are blocked': 'Դաս է ընթանում՝ այս կայքերը արգելափակված են',
    'No lesson now: everything is open': 'Հիմա դաս չկա՝ ամեն ինչ բաց է',
    'Blocked during lessons': 'Արգելափակվում են դասի ժամանակ',
    'One site per line': 'Մեկ կայք մեկ տողում',
    'Save': 'Պահել', 'Saved ✓': 'Պահված է ✓', 'Reset': 'Լռելյայն',
    'You can change the list after the lesson.': 'Ցանկը կարող ես փոխել դասից հետո։',
    'Open Lumen': 'Բացել Lumen',
  },
};
const t = (en, vars = {}) => (WORDS[LANG] && WORDS[LANG][en] || en).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const LUMEN_URL = 'https://inesa07.github.io/Lumen/';
