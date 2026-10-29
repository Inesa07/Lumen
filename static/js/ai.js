// ai.js: the AI tutor. A chat that looks and feels like a real AI app:
// answers stream in word by word, Markdown + math (KaTeX) + tables + code with a Copy button,
// chats grouped by class in a sidebar, rename / delete, Stop button, suggestions.
'use strict';

// ---------------------------------------------------------------- math (KaTeX, loaded only when needed)
let katexState = 'none';          // none -> loading -> ready / failed
function loadKatex() {
  if (katexState !== 'none') return;
  katexState = 'loading';
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
  document.head.appendChild(css);
  const js = document.createElement('script');
  js.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
  js.onload = () => { katexState = 'ready'; document.querySelectorAll('.tex[data-tex]').forEach(renderTexEl); };
  js.onerror = () => { katexState = 'failed'; };
  document.head.appendChild(js);
}
function renderTexEl(el) {
  try {
    el.innerHTML = window.katex.renderToString(el.dataset.tex, { displayMode: el.classList.contains('block'), throwOnError: false });
    el.removeAttribute('data-tex');
  } catch { /* keep the raw formula */ }
}
function texHTML(tex, block) {
  if (katexState === 'ready') {
    try { return window.katex.renderToString(tex, { displayMode: block, throwOnError: false }); } catch { /* raw below */ }
  }
  loadKatex();
  return `<span class="tex${block ? ' block' : ''}" data-tex="${esc(tex)}">${esc(tex)}</span>`;
}

// ---------------------------------------------------------------- Markdown -> HTML
// Code and math are cut out first (so nothing inside them is touched), the rest is ESCAPED
// (an answer can never inject HTML), then headings, lists, tables, quotes, bold, links.
function md(text) {
  const code = [], math = [];
  let s = String(text || '').replace(/```([\w+-]*)[^\n]*\n?([\s\S]*?)(```|$)/g, (_, lang, body) => {
    code.push({ lang, body: body.replace(/\n$/, '') });
    return `\u0000${code.length - 1}\u0000`;
  });
  const keepMath = (tex, block) => { math.push({ tex: tex.trim(), block }); return `\u0001${math.length - 1}\u0001`; };
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => keepMath(t, true))
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, t) => keepMath(t, true))
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, t) => keepMath(t, false))
    .replace(/\$([^\s$](?:[^$\n]*[^\s$])?)\$/g, (m, t) => (/^\d+([.,]\d+)?$/.test(t) ? m : keepMath(t, false)));
  s = esc(s);
  const inline = (x) => x
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const lines = s.split('\n');
  const out = [];
  let list = null, para = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join('<br>'))}</p>`); para = []; } };
  const flushList = () => {
    if (list) { out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`); list = null; }
  };
  const flush = () => { flushPara(); flushList(); };
  const cells = (row) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const t = line.trim();
    // table: a "| a | b |" row followed by "|---|---|"
    if (t.startsWith('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      flush();
      const head = cells(t);
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(cells(lines[i])); i += 1; }
      i -= 1;
      out.push(`<div class="tablewrap"><table><thead><tr>${head.map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    const ul = line.match(/^\s*[-*•]\s+(.*)/), ol = line.match(/^\s*\d+[.)]\s+(.*)/), h = t.match(/^(#{1,6})\s+(.*)/);
    if (ul || ol) {
      flushPara();
      const tag = ul ? 'ul' : 'ol';
      if (!list || list.tag !== tag) { flushList(); list = { tag, items: [] }; }
      list.items.push((ul || ol)[1]);
      continue;
    }
    if (h) { flush(); out.push(`<h${Math.min(6, h[1].length + 2)}>${inline(h[2])}</h${Math.min(6, h[1].length + 2)}>`); continue; }
    if (/^(-{3,}|\*{3,})$/.test(t)) { flush(); out.push('<hr>'); continue; }
    if (t.startsWith('&gt;')) { flush(); out.push(`<blockquote>${inline(t.replace(/^&gt;\s?/, ''))}</blockquote>`); continue; }
    if (/^[\u0000\u0001]\d+[\u0000\u0001]$/.test(t)) { flush(); out.push(t); continue; }
    if (!t) { flush(); continue; }
    flushList();
    para.push(line);
  }
  flush();
  return out.join('')
    .replace(/\u0000(\d+)\u0000/g, (_, n) => {
      const c = code[Number(n)];
      return `<div class="codeblock"><div class="codebar"><span>${esc(c.lang || 'code')}</span><button type="button" class="copybtn" data-copy-code>Copy</button></div><pre><code>${esc(c.body)}</code></pre></div>`;
    })
    .replace(/\u0001(\d+)\u0001/g, (_, n) => texHTML(math[Number(n)].tex, math[Number(n)].block));
}

async function copyText(text, btn) {
  try { await navigator.clipboard.writeText(text); } catch {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
  }
  if (btn) { const old = btn.textContent; btn.textContent = 'Copied ✓'; setTimeout(() => { btn.textContent = old; }, 1400); }
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-copy-code]');
  if (b) copyText(b.closest('.codeblock').querySelector('code').textContent, b);
});

const AI_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.2 6.3L20.5 10.5l-6.3 2.2L12 19l-2.2-6.3L3.5 10.5l6.3-2.2z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" opacity=".7"/></svg>`;
const SEND_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`;
const STOP_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>`;

// subject -> emoji + colour, so every class folder is easy to recognise
const SUBJECT_ICONS = [[/math|algebra|geometr|calcul|integral/i, '📐'], [/english/i, '📘'], [/russian/i, '📕'], [/armenian/i, '📙'],
  [/histor/i, '🏛️'], [/biolog/i, '🧬'], [/chemi/i, '⚗️'], [/physic/i, '🔭'], [/geograph/i, '🌍'], [/literat|reading/i, '📖'],
  [/comput|program|code|algorithm|operating|data/i, '💻'], [/econom/i, '💰'], [/art|draw/i, '🎨'], [/music/i, '🎵']];
function subjectIcon(name) {
  const hit = SUBJECT_ICONS.find(([re]) => re.test(name || ''));
  return hit ? hit[1] : '📚';
}
function subjectHue(name) {
  let h = 0;
  for (const ch of String(name || '')) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

// suggestion cards: [emoji, text]
function suggestionsFor(opts) {
  if (opts.lesson) {
    return [['🤔', 'Explain the hardest idea of this lesson simply'], ['📝', 'Summarize my sticky notes for this lesson'],
      ['🎯', 'Quiz me with 3 questions on this lesson'], ['🧭', 'What should I study next?']];
  }
  if (opts.cls) {
    return [['💡', `Explain a key idea of ${opts.cls} simply`], ['🎯', `Quiz me with 3 questions on ${opts.cls}`],
      ['✅', 'Check my solution step by step'], ['🗓️', `Make a 1-week study plan for ${opts.cls}`]];
  }
  return [['🧮', 'Explain fractions with a pizza example'], ['🧠', 'How do I remember new words faster?'],
    ['✅', 'Check my solution step by step'], ['🚀', 'Tell me a fun science fact and explain it']];
}

// ---------------------------------------------------------------- one chat
// opts: { chatId, cls, lesson, lesson_id, prefill, compact, onChange(chat), classes:[...] }
function chatBox(container, opts = {}) {
  let chat = null, aiState = null, setup = false, streaming = null, ctrl = null;
  container.innerHTML = `
    <div class="ai-scroll"><div class="thread"></div></div>
    <form class="composer-wrap">
      <div class="composer">
        <textarea rows="1" maxlength="4000" placeholder="${opts.cls ? `Ask anything about ${esc(opts.cls)}…` : 'Ask anything…'}" aria-label="Your question"></textarea>
        <div class="composer-bar">
          <button type="button" class="pillbtn on" data-hint aria-pressed="true" title="The tutor asks guiding questions and gives small hints, so you solve it yourself">🧭 Help me think</button>
          <span class="muted small composer-tip">Enter to send · Shift+Enter new line</span>
          <button type="submit" class="sendbtn" aria-label="Send" disabled>${SEND_ICON}</button>
        </div>
      </div>
      ${opts.compact ? '' : '<div class="muted small ai-disclaimer">AI can make mistakes. Check important facts in your textbook.</div>'}
    </form>`;
  const scroller = container.querySelector('.ai-scroll'), thread = container.querySelector('.thread');
  const form = container.querySelector('form'), ta = form.querySelector('textarea');
  const sendBtn = form.querySelector('.sendbtn'), hintBtn = form.querySelector('[data-hint]');

  const grow = () => { ta.style.height = 'auto'; ta.style.height = `${Math.min(200, ta.scrollHeight)}px`; sendBtn.disabled = !ta.value.trim() && !streaming; };
  ta.addEventListener('input', grow);
  hintBtn.onclick = () => {
    if (hintBtn.dataset.locked) { toast(t('A parent chose: hints only, no full answers')); return; }
    const on = hintBtn.getAttribute('aria-pressed') !== 'true'; hintBtn.setAttribute('aria-pressed', String(on)); hintBtn.classList.toggle('on', on);
  };
  // in Parent mode without "full answers", coaching is always on
  api('/api/parent').then((p) => { if (p.enabled && !p.ai_answers) { hintBtn.dataset.locked = '1'; hintBtn.title = t('A parent chose: hints only, no full answers'); hintBtn.textContent = '🧭 ' + t('Help me think') + ' 🔒'; } }).catch(() => {});

  const atBottom = () => scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80;
  const toBottom = () => { scroller.scrollTop = scroller.scrollHeight; };

  const msgHTML = (m, i) => (m.role === 'user'
    ? `<div class="m-user"><div class="bubble">${esc(m.content).replace(/\n/g, '<br>')}</div></div>`
    : `<div class="m-ai"><div class="avatar">${AI_ICON}</div><div class="m-body"><div class="md">${md(m.content)}</div>
        <div class="m-actions"><button type="button" class="ghostbtn" data-copy-msg="${i}">Copy</button></div></div></div>`);

  const draw = (error = null) => {
    const msgs = chat ? chat.messages : [];
    let html = '';
    if (!msgs.length && !streaming) {
      html += `<div class="ai-empty"><div class="ai-orb"><span class="orb-face">${opts.cls ? subjectIcon(opts.cls) : '✨'}</span></div>
        <h2>${opts.lesson ? `Questions about “${esc(opts.lesson)}”?` : opts.cls ? `What do you want to understand in ${esc(opts.cls)}?` : 'Hi! What do you want to learn today? 👋'}</h2>
        <p class="muted small">${opts.lesson ? 'I know your lesson, your plan and your sticky notes.'
          : 'Ask me anything. There are no silly questions! With 🧭 Help me think I won\'t just tell you the answer: I\'ll help you find it yourself.'}</p>
        <div class="sugs">${suggestionsFor(opts).map(([e, x], i) => `<button type="button" class="sug c${i}" data-sug="${esc(x)}"><span class="sug-e">${e}</span><span>${esc(x)}</span></button>`).join('')}</div></div>`;
    }
    html += msgs.map(msgHTML).join('');
    if (!streaming && msgs.length && msgs[msgs.length - 1].role === 'assistant' && hintBtn.getAttribute('aria-pressed') === 'true') {
      html += `<div class="coach-replies">${[['💡', 'Give me another hint'], ['✅', 'Check my answer: '], ['🤔', "I don't understand, explain it another way"]]
        .map(([e, x]) => `<button type="button" class="coach-btn" data-reply="${esc(x)}">${e} ${esc(t(x.replace(/: $/, '')))}</button>`).join('')}</div>`;
    }
    if (streaming) {
      html += `<div class="m-ai live"><div class="avatar">${AI_ICON}</div><div class="m-body"><div class="md">${streaming.text
        ? md(streaming.text) + '<span class="caret"></span>' : '<div class="thinking"><i></i><i></i><i></i></div>'}</div></div></div>`;
    }
    if (setup) html += setupCard();
    if (error) html += `<div class="m-error">${esc(error)}${/Settings/.test(error) ? ' <a href="#/settings">Open Settings</a>' : ''}</div>`;
    thread.innerHTML = html;
    wire();
  };
  // while streaming, only the last message is redrawn (fast, and text selection elsewhere survives)
  let raf = 0;
  const drawLive = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const live = thread.querySelector('.m-ai.live .md');
      if (!live || !streaming) return;
      const stick = atBottom();
      live.innerHTML = md(streaming.text) + '<span class="caret"></span>';
      if (stick) toBottom();
    });
  };

  const wire = () => {
    thread.querySelectorAll('[data-sug]').forEach((b) => { b.onclick = () => { ta.value = b.dataset.sug; grow(); send(); }; });
    thread.querySelectorAll('[data-reply]').forEach((b) => {
      b.onclick = () => {
        const x = t(b.dataset.reply.replace(/: $/, ''));
        if (/: $/.test(b.dataset.reply)) { ta.value = `${x}: `; grow(); ta.focus(); return; }   // the child types the answer
        ta.value = x; grow(); send();
      };
    });
    thread.querySelectorAll('[data-ctx]').forEach((b) => {
      b.onclick = () => { opts.cls = b.dataset.ctx || null; ta.placeholder = opts.cls ? `Ask anything about ${opts.cls}…` : 'Ask anything…'; draw(); ta.focus(); };
    });
    thread.querySelectorAll('[data-copy-msg]').forEach((b) => { b.onclick = () => copyText(chat.messages[Number(b.dataset.copyMsg)].content, b); });
    const f = thread.querySelector('[data-connect]');
    if (f) {
      f.onsubmit = async (e) => {
        e.preventDefault();
        const key = f.querySelector('input').value.trim();
        const msg = thread.querySelector('.connect-msg');
        if (!key) return;
        msg.textContent = 'Checking the key…';
        try {
          aiState = await api('/api/ai/config', { gemini_key: key });
          setup = false;
          draw();
          toast('✨ Free AI connected! Press Enter to ask.');
          ta.focus();
        } catch (err) { msg.textContent = err.message; }
      };
    }
  };

  const setupCard = () => (aiState && aiState.parent_off ? `<div class="m-setup">
      <b>👪 The AI tutor is switched off</b>
      <span class="small">A parent turned it off in Parent mode. Ask them if you need it. Lumi and everything else still work!</span></div>` : `<div class="m-setup">
      <b>✨ The AI tutor is free with a Lumen account</b>
      <span class="small">Create an account (30 seconds) and ask up to 40 questions every day, no key needed.</span>
      <a class="btn primary" href="#/account" style="align-self:flex-start">Sign in or create an account</a>
      <details class="small"><summary>Or use your own Gemini key</summary>
      <ol class="small"><li>Open <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> and sign in with a personal Google account.</li>
        <li>Press <b>Create API key</b> and copy it. It's free, no card needed.</li><li>Paste it here:</li></ol>
      <form data-connect class="btnrow" style="flex-wrap:nowrap"><input class="field" type="password" placeholder="AIza…" autocomplete="off" aria-label="Gemini API key" style="flex:1">
        <button class="btn primary" type="submit">Connect</button></form>
      <span class="muted small connect-msg">The key stays in this browser.</span></details></div>`);

  const setBusy = (on) => {
    sendBtn.innerHTML = on ? STOP_ICON : SEND_ICON;
    sendBtn.classList.toggle('stop', on);
    sendBtn.setAttribute('aria-label', on ? 'Stop' : 'Send');
    sendBtn.disabled = on ? false : !ta.value.trim();
  };

  const send = async () => {
    const text = ta.value.trim();
    if (!text || streaming) return;
    if (!aiState) aiState = await api('/api/ai/status').catch(() => ({ ready: false }));
    if (!aiState.ready) { setup = true; draw(); toBottom(); return; }       // keep the question, connect first
    ta.value = '';
    grow();
    if (!chat) chat = { id: null, messages: [] };
    chat.messages.push({ role: 'user', content: text });
    streaming = { text: '' };
    setBusy(true);
    draw();
    toBottom();
    ctrl = new AbortController();
    let error = null;
    try {
      // the in-browser server streams the answer piece by piece (like Server-Sent Events did)
      cache.clear();
      await Lumen.server.chatStream({ chat_id: chat.id, message: text, hint: hintBtn.getAttribute('aria-pressed') === 'true',
        class: opts.cls, lesson: opts.lesson, lesson_id: opts.lesson_id }, (ev) => {
        if (ev.chat_id && !chat.id) { chat.id = ev.chat_id; if (opts.onChange) opts.onChange({ id: ev.chat_id, title: ev.title, isNew: true }); }
        if (ev.delta) { streaming.text += ev.delta; drawLive(); }
        if (ev.done) { chat = JSON.parse(JSON.stringify(ev.chat)); }
        if (ev.error) error = ev.error;
      }, ctrl.signal);
      if (ctrl.signal.aborted) throw new DOMException('stopped', 'AbortError');
    } catch (err) {
      if (err.name === 'AbortError') {
        if (streaming.text) chat.messages.push({ role: 'assistant', content: `${streaming.text}\n\n*(stopped)*` });
      } else error = `Something went wrong: ${err.message}`;
    }
    streaming = null;
    ctrl = null;
    setBusy(false);
    const stick = atBottom();
    draw(error);
    if (stick || error) toBottom();
    if (opts.onChange && chat.id) opts.onChange(chat);
    ta.focus();
  };

  form.onsubmit = (e) => {
    e.preventDefault();
    if (streaming && ctrl) { ctrl.abort(); return; }   // the send button is "Stop" while answering
    send();
  };
  ta.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!streaming) send(); } };
  if (opts.prefill) { ta.value = opts.prefill; }
  grow();
  (async () => {
    aiState = await api('/api/ai/status').catch(() => ({ ready: false }));
    setup = !aiState.ready;
    if (opts.chatId) { try { chat = await api(`/api/chats/${opts.chatId}`); } catch { chat = null; } }
    draw();
    toBottom();
  })();
  return { focus: () => ta.focus() };
}

// ---------------------------------------------------------------- floating "Ask AI" pop-up (lesson, class page)
let aiPopChat = null;
function openAIPopup(ctx) {
  let pop = $('#aiPop');
  if (pop) { pop.remove(); return; }                 // second click closes it
  pop = document.createElement('div');
  pop.id = 'aiPop';
  pop.className = 'aipop card';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Ask AI');
  pop.innerHTML = `<div class="aipop-head"><span class="avatar sm">${AI_ICON}</span><b>Ask AI</b><span class="muted small">${esc(ctx.cls || 'General')}${ctx.lesson ? ` · ${esc(ctx.lesson)}` : ''}</span>
      <button class="icon-btn" type="button" data-newpop title="New chat" aria-label="New chat">＋</button>
      <a class="icon-btn" href="#/ai" title="All chats" aria-label="All chats">⤢</a>
      <button class="icon-btn" type="button" data-close aria-label="Close">✕</button></div>
    <div class="aipop-body ai-chat"></div>`;
  document.body.appendChild(pop);
  pop.querySelector('[data-close]').onclick = () => pop.remove();
  const start = (chatId) => chatBox(pop.querySelector('.aipop-body'), { ...ctx, compact: true, chatId,
    onChange: (c) => { aiPopChat = { id: c.id, lesson_id: ctx.lesson_id || null, cls: ctx.cls || null }; } });
  pop.querySelector('[data-newpop]').onclick = () => { aiPopChat = null; start(null).focus(); };
  const same = aiPopChat && aiPopChat.lesson_id === (ctx.lesson_id || null) && aiPopChat.cls === (ctx.cls || null);
  start(same ? aiPopChat.id : null).focus();
}
window.addEventListener('hashchange', () => { const p = $('#aiPop'); if (p) p.remove(); });

// ---------------------------------------------------------------- the "Ask AI" page
let newChatClass = null;          // the class for the next new chat ("+" next to a class in the sidebar)
async function viewAI(chatId = null) {
  const [d, list] = await Promise.all([loadOverview(), api('/api/chats')]);
  let prefill = '';
  try {
    prefill = sessionStorage.getItem('lumen.ask') || '';
    if (prefill) newChatClass = sessionStorage.getItem('lumen.askClass') || null;
    sessionStorage.removeItem('lumen.ask'); sessionStorage.removeItem('lumen.askClass');
  } catch { /* fine */ }
  const ai = list.ai;
  let current = chatId ? list.chats.find((c) => c.id === chatId) : null;
  const classes = d.classes.map((c) => c.name);
  const provider = ai.ready ? (ai.provider === 'lumen' ? 'Lumen AI · free'
    : `${ai.provider === 'claude' ? 'Claude' : ai.provider === 'gemini' ? 'Gemini' : 'Test'} · ${esc(ai.model)}`) : ai.parent_off ? 'Switched off by a parent' : 'Sign in for free AI';

  // Like every AI app: the page itself never scrolls, only the conversation does,
  // so the question box always stays in the same place at the bottom.
  document.documentElement.classList.add('ai-mode');
  window.scrollTo(0, 0);
  app.innerHTML = shell('ai', `
  <main class="ai-layout">
    <aside class="ai-side" aria-label="Your chats">
      <div class="ai-side-top"><b>💬 Chats</b></div>
      <div class="ai-side-tools"><button class="newchat" type="button" id="newChat">＋ New chat</button></div>
      <input class="field ai-search" id="chatSearch" placeholder="Search chats" aria-label="Search chats" autocomplete="off">
      <nav class="ai-groups" id="chatGroups"></nav>
    </aside>
    <section class="ai-main">
      <header class="ai-top">
        <div class="ai-title" id="chatTitle"></div>
        <span class="model-pill${ai.ready ? '' : ' off'}" title="Change in Settings → AI tutor"><i></i>${provider}</span>
      </header>
      <div class="ai-chat" id="chatBox"></div>
    </section>
  </main>`);

  // ---- sidebar: chats grouped by class, most recent group first
  const openFolders = new Set(current && current.class ? [current.class] : []);
  const itemHTML = (c) => `<div class="ai-item${current && c.id === current.id ? ' on' : ''}" data-item="${c.id}">
      <a href="#/ai/${c.id}" title="${esc(c.title)}">${esc(c.title)}</a>
      <span class="ai-item-tools"><button type="button" data-rename="${c.id}" aria-label="Rename" title="Rename">✎</button>
        <button type="button" data-delete="${c.id}" aria-label="Delete" title="Delete">🗑</button></span></div>`;
  const drawGroups = (chats, q = '') => {
    const f = q.trim().toLowerCase();
    const shown = chats.filter((c) => !f || c.title.toLowerCase().includes(f) || (c.class || '').toLowerCase().includes(f));
    const general = shown.filter((c) => !c.class);
    // a class folder appears only after you asked something from that class (class page or lesson)
    const folders = new Map();
    shown.filter((c) => c.class).forEach((c) => { if (!folders.has(c.class)) folders.set(c.class, []); folders.get(c.class).push(c); });
    $('#chatGroups').innerHTML = `
      ${general.length ? `<section class="ai-group"><div class="ai-group-head"><span>💬 My chats</span></div>${general.map(itemHTML).join('')}</section>` : ''}
      ${folders.size ? `<section class="ai-group"><div class="ai-group-head"><span>🎒 From my classes</span></div>
        ${[...folders.entries()].map(([k, items]) => {
          const open = openFolders.has(k) || !!f;
          return `<div class="folder${open ? ' open' : ''}" style="--h:${subjectHue(k)}">
            <button type="button" class="folder-head" data-folder="${esc(k)}" aria-expanded="${open}">
              <span class="folder-ico">${subjectIcon(k)}</span><span class="folder-name">${esc(k)}</span><span class="folder-n">${items.length}</span><span class="folder-arrow">›</span></button>
            ${open ? `<div class="folder-items">${items.map(itemHTML).join('')}</div>` : ''}</div>`;
        }).join('')}</section>` : ''}
      ${!general.length && !folders.size ? `<div class="ai-side-empty">${f ? 'No chats found.' : '<span>🌱</span>Your questions will grow here. Ask in a class or a lesson, and its folder appears too.'}</div>` : ''}`;
    $('#chatGroups').querySelectorAll('[data-folder]').forEach((b) => {
      b.onclick = () => { const k = b.dataset.folder; if (openFolders.has(k)) openFolders.delete(k); else openFolders.add(k); drawGroups(chats, $('#chatSearch').value); };
    });
    $('#chatGroups').querySelectorAll('[data-rename]').forEach((b) => {
      b.onclick = () => {
        const item = b.closest('.ai-item'), c = chats.find((x) => x.id === b.dataset.rename);
        item.innerHTML = `<input class="field rename" value="${esc(c.title)}" maxlength="80" aria-label="Chat name">`;
        const inp = item.querySelector('input');
        inp.focus(); inp.select();
        const done = async (save) => {
          if (save && inp.value.trim()) { await api('/api/chats/rename', { id: c.id, title: inp.value }); c.title = inp.value.trim(); }
          drawGroups(chats, $('#chatSearch').value);
          if (current && current.id === c.id) { current.title = c.title; drawTitle(); }
        };
        inp.onkeydown = (e) => { if (e.key === 'Enter') done(true); if (e.key === 'Escape') done(false); };
        inp.onblur = () => done(true);
      };
    });
    $('#chatGroups').querySelectorAll('[data-delete]').forEach((b) => {
      b.onclick = async () => {
        if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'Delete?'; b.classList.add('sure'); setTimeout(() => { if (b.isConnected) { b.dataset.sure = ''; b.textContent = '🗑'; b.classList.remove('sure'); } }, 3000); return; }
        await api('/api/chats/delete', { id: b.dataset.delete });
        if (current && current.id === b.dataset.delete) { location.hash = '#/ai'; return; }
        const i = chats.findIndex((x) => x.id === b.dataset.delete);
        chats.splice(i, 1);
        drawGroups(chats, $('#chatSearch').value);
      };
    });
  };
  const drawTitle = () => {
    $('#chatTitle').innerHTML = current
      ? `<b>${esc(current.title)}</b>${current.class ? `<span class="chip">${esc(current.class)}</span>` : ''}${current.lesson ? `<span class="muted small">${esc(current.lesson)}</span>` : ''}`
      : '<b>New chat</b>';
  };
  let chats = list.chats;
  drawGroups(chats);
  drawTitle();
  $('#chatSearch').oninput = () => drawGroups(chats, $('#chatSearch').value);

  const opts = current ? { chatId: current.id, cls: current.class, lesson: current.lesson, lesson_id: current.lesson_id }
    : { cls: newChatClass, prefill };
  newChatClass = null;
  const box = chatBox($('#chatBox'), { ...opts,
    onChange: async (c) => {
      if (c.isNew) {
        // the new chat gets its address without reloading the page (replaceState = no "hashchange")
        history.replaceState(null, '', `#/ai/${c.id}`);
        current = { id: c.id, title: c.title, class: opts.cls, lesson: null };
        drawTitle();
      }
      chats = (await api('/api/chats')).chats;
      const me = chats.find((x) => x.id === c.id);
      if (me && current) { current.title = me.title; drawTitle(); }
      drawGroups(chats, $('#chatSearch').value);
    } });
  $('#newChat').onclick = () => { newChatClass = null; if (location.hash === '#/ai') viewAI(); else location.hash = '#/ai'; };
  box.focus();
}

// open the AI page with a question already typed (e.g. from Review)
function askAIAbout(text, cls) {
  try { sessionStorage.setItem('lumen.ask', text); sessionStorage.setItem('lumen.askClass', cls || ''); } catch { /* fine */ }
  location.hash = '#/ai';
}
