// safety.js: notices when a child writes something that sounds like they are not okay
// (very sad or wanting to hurt themselves, someone hurting them, bullying, danger).
// The AI answers kindly and points to a trusted adult; the parent sees a gentle note in Parent mode.
// It is a simple word list in English, Russian and Armenian: it will miss things and sometimes see
// something that isn't there, so the parent note never shows the words, only the topic, and asks to talk.

const RULES = [
  ['sad', [
    /\b(kill|hurt|cut) (my ?self|myself)\b/iu, /\bsuicid/iu, /\bwant to die\b/iu, /\bdon'?t want to (live|be alive)\b/iu, /\bno reason to live\b/iu,
    /\bhate my life\b/iu, /\bnobody (loves|cares about) me\b/iu,
    /убить себя/iu, /покончить с собой/iu, /суицид/iu, /хочу умереть/iu, /не хочу жить/iu, /порезать себя/iu, /ненавижу свою жизнь/iu, /никому не нужен|никому не нужна/iu,
    /ինքնասպան/iu, /ուզում եմ մեռնել/iu, /չեմ ուզում ապրել/iu, /ինձ վնասել/iu,
  ]],
  ['hurt', [
    /\b(he|she|they|my (dad|mom|father|mother|brother|sister|uncle|teacher|coach)) (hits|beats|hurts|touches) me\b/iu, /\bsomeone (hits|beats|hurts|touches) me\b/iu,
    /меня бь[её]т/iu, /меня трога(ет|ют)/iu, /меня обижа(ет|ют) дома/iu,
    /ինձ ծեծում/iu, /ինձ խփում/iu,
  ]],
  ['bullying', [
    /\b(bully|bullies|bullying|laughs? at|picks? on) me\b/iu, /\bi'?m (being )?bullied\b/iu,
    /меня травят/iu, /надо мной издева/iu, /меня гнобят/iu, /буллинг/iu,
    /ինձ ծաղրում են/iu, /բուլինգ/iu,
  ]],
  ['danger', [
    /\b(stranger|someone online) (wants|asked) (to meet|me to meet|for my (address|photo|photos))\b/iu, /\brun away from home\b/iu,
    /\bsend (him|her|them) (nude|naked) (pics|photos)\b/iu,
    /незнаком\w+ (хочет|просит) встретиться/iu, /сбежать из дома/iu, /просит (мои )?фото/iu,
    /տնից փախչել/iu, /անծանոթը ուզում է հանդիպել/iu,
  ]],
];

/** The topic of a worrying message, or null. */
export function concernOf(text) {
  const s = String(text || '');
  for (const [kind, res] of RULES) if (res.some((re) => re.test(s))) return kind;
  return null;
}

/** For the AI: what to do when a child seems not okay (added to every question in Lumen). */
export const SAFETY = `CHILD SAFETY: the student is a child or a teenager.
- Never give information that could help someone hurt themselves or others, and nothing sexual, violent or frightening.
- If the student says they feel very sad, want to hurt themselves, are being hurt, bullied, or are in danger: stop the lesson topic.
  Answer warmly and simply: say you are glad they told you, that it is not their fault, and that they should talk to a trusted
  adult right now (a parent, a teacher, the school counsellor). If they might be in danger, tell them to call the local emergency
  number. Don't ask for details, don't promise to keep secrets, don't diagnose.
- If an adult online asks them to meet, for photos or for secrets: tell them not to answer and to show it to a parent.`;
