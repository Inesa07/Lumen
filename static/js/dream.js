// dream.js: "My dream" on the Lumi page. The child talks with their parents, writes the dream,
// Lumen works out how many stars it needs, and lessons bring the stars. On the way Lumi changes
// (25 %, 50 %, 75 %), and at 100 % the dream comes true. Rules: src/core/dream.js.
'use strict';

const DREAM_EMOJI = ['🦁', '⚽', '🎬', '🎮', '🍦', '🍕', '🚲', '📚', '🎨', '🏊', '🏖️', '🎡', '✈️', '🧸', '🐶', '🎹', '🍰', '🏕️', '🛴', '🎢', '🧩', '🍿', '🎸', '⭐'];
const DREAM_DRAFT = 'lumen.dreamdraft';
const dreamDraft = {
  get() { try { return JSON.parse(localStorage.getItem(DREAM_DRAFT)) || {}; } catch { return {}; } },
  set(v) { try { localStorage.setItem(DREAM_DRAFT, JSON.stringify(v)); } catch { /* fine */ } },
  clear() { try { localStorage.removeItem(DREAM_DRAFT); } catch { /* fine */ } },
};

/** "about a week", "about 3 days"… for a number of days. */
function dreamDays(n) {
  if (n <= 1) return t('about a day');
  if (n >= 6 && n <= 8) return t('about a week');
  if (n >= 13 && n <= 16) return t('about 2 weeks');
  if (n >= 19 && n <= 23) return t('about 3 weeks');
  return t('about {n} {unit}', { n, unit: tUnit('day', n) });
}

const DREAM_NEXT = [
  'At 25% your dream comes to visit Lumi!',
  'At 50% Lumi puts on a dream hat!',
  'At 75% Lumi starts to glow gold!',
  'Almost there! Just a few more stars.',
];

/** A small line for Home and the parent page. */
function dreamLine(d) {
  if (!d) return '';
  return `<div class="dreamline"><span class="dl-e">${esc(d.emoji)}</span><span class="dl-t" title="${t('My dream')}">${esc(d.text)}</span>
    <span class="dl-v">⭐ ${d.earned}/${d.need}</span></div><div class="lightbar dreambar"><i style="width:${d.pct}%"></i></div>`;
}

/** The path to the dream: milestones, Lumi on the way, the dream at the end. */
function dreamPath(d, f) {
  const stops = [25, 50, 75].map((m, i) => `<div class="dp-stop${d.pct >= m ? ' on' : ''}" style="left:${m}%">
    <span>${['🎈', '🎩', '✨'][i]}</span><em>${m}%</em></div>`).join('');
  return `<div class="dreampath" aria-label="${t('{a} of {b} stars', { a: d.earned, b: d.need })}">
    <div class="dp-line"><i style="width:${d.pct}%"></i></div>${stops}
    <div class="dp-lumi" style="left:${Math.min(d.pct, 96)}%">${lumiSVG({ mood: d.ready ? 'party' : 'happy', stage: Math.max(2, f.stage.index), outfit: f.outfit, size: 64, dream: d })}</div>
    <div class="dp-goal">${esc(d.emoji)}</div></div>`;
}

function dreamShelf(done) {
  if (!done.length) return '';
  return `<div class="dreamshelf"><div class="eyebrow">${t('Dreams that came true')}</div><div class="ds-list">
    ${done.slice().reverse().map((x) => `<span class="ds-item" title="${esc(new Date(x.done_at * 1000).toLocaleDateString(LOCALE(), { day: 'numeric', month: 'long' }))}">${esc(x.emoji)} ${esc(x.text)} ✓</span>`).join('')}</div></div>`;
}

/** The dream card on the Lumi page (drawn into #dreamCard). */
function dreamSection() {
  return '<section class="card dreamcard" id="dreamCard" aria-live="polite"></section>';
}

async function drawDream(state = null) {
  const box = $('#dreamCard');
  if (!box) return;
  const dr = state && state.dr ? state.dr : await api('/api/dream');
  const f = lumiLive.info || await api('/api/friend');
  const mode = state && state.mode ? state.mode : dr.current ? 'show' : 'empty';
  const head = `<div class="block-head"><h2 class="display" style="font-size:18px;margin:0">🎁 ${t('My dream')} ${info('dream', 'My dream')}</h2></div>`;

  if (mode === 'empty') {
    box.innerHTML = `${head}
      <div class="dream-empty"><div class="de-pic">🎁</div><div>
        <p>${t('Talk with your mom or dad about something you really want. Then write it here, and the stars from your lessons will take you there!')}</p>
        <p class="muted small">${t('For example: a new ball, a trip to the zoo, choosing the family movie, an hour of games on the weekend.')}</p>
        <button class="btn primary" id="dreamNew">✍️ ${t('Write my dream')}</button></div></div>
      ${dreamShelf(dr.done)}`;
    $('#dreamNew').onclick = () => drawDream({ dr, mode: 'write' });
    return;
  }

  if (mode === 'write') {
    const dft = dreamDraft.get();
    box.innerHTML = `${head}
      <form class="dream-form" id="dreamForm">
        <label class="small" for="dreamText"><b>${t('What is your dream?')}</b></label>
        <input class="field" id="dreamText" maxlength="40" autocomplete="off" placeholder="${t('A trip to the zoo')}" value="${esc(dft.text || '')}">
        <div class="small muted">${t('Pick a picture')}</div>
        <div class="emoji-pick" role="radiogroup" aria-label="${t('Pick a picture')}"><button type="button" class="ep auto${dft.emoji ? '' : ' on'}" data-e="" role="radio" aria-checked="${!dft.emoji}" title="${t('Lumi finds a picture for any dream')}">✨ ${t('Lumi picks')}</button>${DREAM_EMOJI.map((e) => `<button type="button" class="ep${e === dft.emoji ? ' on' : ''}" data-e="${e}" role="radio" aria-checked="${e === dft.emoji}">${e}</button>`).join('')}</div>
        <div class="row" style="gap:10px"><button class="btn primary" type="submit">⭐ ${t('How many stars?')}</button>
          <button class="btn ghost" type="button" id="dreamCancel">${t('Cancel')}</button></div>
        <div class="err small" id="dreamErr" hidden></div>
      </form>`;
    let emoji = dft.emoji || '';
    box.querySelectorAll('.ep').forEach((b) => {
      b.onclick = () => {
        emoji = b.dataset.e;
        box.querySelectorAll('.ep').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); });
      };
    });
    $('#dreamCancel').onclick = () => drawDream({ dr, mode: 'empty' });
    $('#dreamText').focus();
    $('#dreamForm').onsubmit = async (e) => {
      e.preventDefault();
      const text = $('#dreamText').value.trim();
      if (!text) { $('#dreamErr').hidden = false; $('#dreamErr').textContent = t('Write your dream first'); return; }
      const btn = $('#dreamForm button[type=submit]');
      btn.disabled = true; btn.textContent = t('Lumi is counting…');
      try {
        const price = await api('/api/dream', { price: text });
        dreamDraft.set({ text, emoji });                 // a picture Lumi chose is chosen again next time
        drawDream({ dr, mode: 'price', price, text, emoji: emoji || price.emoji, auto: !emoji });
      } catch (x) { btn.disabled = false; btn.textContent = `⭐ ${t('How many stars?')}`; $('#dreamErr').hidden = false; $('#dreamErr').textContent = x.message; }
    };
    return;
  }

  if (mode === 'price' || mode === 'notyet') {
    const { price, text, emoji } = state;
    box.innerHTML = `${head}
      <div class="dream-price">
        <div class="dp-pic"><div class="dp-big">${esc(emoji)}</div>${state.auto ? `<div class="muted small">✨ ${t('Lumi chose it')}</div>` : ''}</div>
        <div class="dp-txt"><div class="display" style="font-size:22px">${esc(text)}</div>
          <div class="dp-need">${t('This dream needs {n}', { n: `<b>${price.stars} ⭐</b>` })}</div>
          <div class="muted small">${t('That is {days} if you study like you usually do.', { days: dreamDays(price.days) })}</div>
          ${price.carry ? `<div class="small">🎁 ${t('You already have {n} ⭐ from before!', { n: price.carry })}</div>` : ''}</div>
      </div>
      ${mode === 'price' ? `<div class="lumi-ask">${lumiSVG({ mood: 'hello', stage: Math.max(2, f.stage.index), outfit: f.outfit, size: 70 })}
        <div class="bubble-txt"><b>${t('Do your mom or dad know about this dream? 😊')}</b>
          <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn primary" id="dreamYes">✅ ${t('Yes, we agreed!')}</button>
          <button class="btn ghost" id="dreamNo">${t('Not yet')}</button>
          <button class="btn ghost" id="dreamEdit">✏️ ${t('Change')}</button></div></div></div>`
        : `<div class="lumi-ask">${lumiSVG({ mood: 'happy', stage: Math.max(2, f.stage.index), outfit: f.outfit, size: 70 })}
        <div class="bubble-txt"><b>${t('Tell them first, and then come back! I saved your dream here.')}</b>
          <div class="row" style="gap:8px;margin-top:10px"><button class="btn primary" id="dreamYes">✅ ${t('Now they know!')}</button></div></div></div>`}`;
    $('#dreamYes').onclick = async () => {
      try {
        const res = await api('/api/dream', { create: { text, emoji, size: price.size }, told: true });
        dreamDraft.clear();
        lumiLive.info = await api('/api/friend');
        lumiSound('quest');
        toast(t('Your dream is saved! Let’s collect stars ✨'));
        if (typeof pushWidget === 'function') pushWidget(true);   // the Mac widget shows the dream
        drawDream({ dr: res, mode: 'show' });
        drawLumiHome();
      } catch (x) { toast(x.message); }
    };
    if ($('#dreamNo')) $('#dreamNo').onclick = () => drawDream({ ...state, mode: 'notyet' });
    if ($('#dreamEdit')) $('#dreamEdit').onclick = () => drawDream({ dr, mode: 'write' });
    return;
  }

  // mode 'show' (and 'remove': asking before changing the dream)
  const d = dr.current;
  box.innerHTML = `${head}
    <div class="dream-show">
      <div class="dp-big">${esc(d.emoji)}</div>
      <div class="dp-txt"><div class="display" style="font-size:22px">${esc(d.text)}</div>
        <div class="dp-need"><b>⭐ ${d.earned} / ${d.need}</b> · ${d.ready ? t('all stars collected!') : t('{days} more', { days: dreamDays(d.days_left) })}</div></div>
    </div>
    ${dreamPath(d, f)}
    ${d.ready ? `<div class="dream-ready"><b>🎉 ${t('All stars collected! Go to your mom or dad: your dream comes true!')}</b>
        <button class="btn primary big" id="dreamDone">🎁 ${t('My dream came true!')}</button></div>`
      : `<div class="dream-next">💡 ${t(DREAM_NEXT[Math.min(d.level, 3)])}</div>`}
    <div class="dream-how"><span>⏱️ ${t('10 focused minutes')} = <b>1 ⭐</b></span><span>📵 ${t('A lesson without the phone')} = <b>1 ⭐</b></span>
      <span>🏆 ${t('A new focus record')} = <b>3 ⭐</b></span></div>
    ${mode === 'remove' ? `<div class="dream-remove"><b>${t('Change your dream?')}</b> <span class="muted small">${t('Your {n} ⭐ stay with you for the next dream.', { n: d.earned })}</span>
        <div class="row" style="gap:8px;margin-top:8px"><button class="btn ghost" id="dreamRemoveYes">${t('Yes, write a new one')}</button><button class="btn primary" id="dreamRemoveNo">${t('Keep this dream')}</button></div></div>`
      : `<button class="linkbtn small" id="dreamRemove">${t('Change my dream')}</button>`}
    ${dreamShelf(dr.done)}`;
  if ($('#dreamDone')) $('#dreamDone').onclick = async () => {
    const res = await api('/api/dream', { fulfilled: true });
    if (typeof pushWidget === 'function') pushWidget(true);
    lumiLive.info = await api('/api/friend');
    dreamParty({ title: t('Hooray! Your dream came true! 🎉'), text: t('“{text}” is on your shelf of dreams now. What will you dream about next?', { text: esc(d.text) }), d: { ...d, level: 4 } }, f);
    drawDream({ dr: res, mode: 'empty' });
  };
  if ($('#dreamRemove')) $('#dreamRemove').onclick = () => drawDream({ dr, mode: 'remove' });
  if ($('#dreamRemoveNo')) $('#dreamRemoveNo').onclick = () => drawDream({ dr, mode: 'show' });
  if ($('#dreamRemoveYes')) $('#dreamRemoveYes').onclick = async () => {
    const res = await api('/api/dream', { remove: true });
    if (typeof pushWidget === 'function') pushWidget(true);
    lumiLive.info = await api('/api/friend');
    drawDream({ dr: res, mode: 'write' });
  };
}

// ---------------------------------------------------------------- milestone celebrations
const DREAM_NEWS = [null,
  ['The dream came to visit!', 'Look, {emoji} is flying next to Lumi. You are a quarter of the way there!'],
  ['Lumi put on the dream hat!', 'Halfway to “{text}”! Lumi is getting ready for the dream.'],
  ['Lumi glows gold!', 'Three quarters done. Your dream is very close!'],
  ['All stars collected! 🎉', 'Go to your mom or dad: “{text}” comes true! Then press “My dream came true!” on the Lumi page.'],
];

function dreamParty({ title, text, d }, f) {
  if ($('#lumiParty')) return;
  const box = document.createElement('div');
  box.id = 'lumiParty';
  box.className = 'lumi-party';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.innerHTML = `<div class="card lumi-party-card">
    <div class="confetti" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--d:${(i % 6) * 0.15}s;--c:${['var(--c-yellow)', 'var(--c-pink)', 'var(--c-blue)', 'var(--c-green)', 'var(--c-violet)', 'var(--c-orange)'][i % 6]}"></i>`).join('')}</div>
    ${lumiSVG({ mood: 'party', stage: Math.max(2, f.stage.index), outfit: f.outfit, size: 150, dream: d })}
    <h2 class="display">${title}</h2><p>${text}</p>
    <button class="btn primary big" id="partyOk">${t('Yay! ✨')}</button></div>`;
  document.body.appendChild(box);
  lumiSound('grow', f);
  const close = () => box.remove();
  $('#partyOk').onclick = close;
  $('#partyOk').focus();
  box.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

/** Celebrate a milestone once (called when Lumi's own news are done). */
async function dreamNews() {
  if ($('#lumiParty') || location.hash === '#/mini') return;
  const f = await api('/api/friend').catch(() => null);
  const d = f && f.dream;
  if (!d || !d.news_level) return;
  const [title, text] = DREAM_NEWS[d.news_level];
  await api('/api/dream', { seen_level: d.level }).catch(() => {});
  f.dream = { ...d, news_level: 0, seen_level: d.level };
  dreamParty({ title: t(title), text: t(text, { emoji: esc(d.emoji), text: esc(d.text) }), d }, f);
}
