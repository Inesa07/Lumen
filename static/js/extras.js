// extras.js: class to-do lists and sticky notes, used by several pages.
'use strict';

// ---------------------------------------------------------------- class to-do list
// container: element to draw into; cls: class name
async function todoWidget(container, cls) {
  const draw = async () => {
    const { items } = await api(`/api/todos?class=${encodeURIComponent(cls)}`);
    const open = items.filter((i) => !i.done), done = items.filter((i) => i.done).sort((a, b) => b.done_at - a.done_at);
    container.innerHTML = `
      <form class="taskadd" data-todo-form><input class="field" maxlength="120" placeholder="Add a to-do, e.g. solve exercises 1-10" autocomplete="off" aria-label="New to-do"><button class="btn ghost">Add</button></form>
      <ul class="checks todo">${open.map(row).join('') || '<li class="muted small" style="padding:6px 2px">Nothing to do. Add what you still need to do for this class.</li>'}</ul>
      ${done.length ? `<details class="donelist"><summary>${done.length} done</summary><ul class="checks todo">${done.slice(0, 30).map(row).join('')}</ul></details>` : ''}`;
    container.querySelector('[data-todo-form]').onsubmit = async (e) => {
      e.preventDefault();
      const inp = e.target.querySelector('input');
      if (!inp.value.trim()) return;
      await api('/api/todos', { class: cls, add: inp.value });
      await draw();
      container.querySelector('[data-todo-form] input').focus();
    };
    container.querySelectorAll('[data-todo]').forEach((cb) => {
      cb.onchange = async () => { await api('/api/todos', { id: cb.dataset.todo, done: cb.checked }); setTimeout(draw, 350); };
    });
    container.querySelectorAll('[data-todo-del]').forEach((b) => {
      b.onclick = async () => { await api('/api/todos', { id: b.dataset.todoDel, delete: true }); draw(); };
    });
  };
  const row = (i) => `<li><label><input type="checkbox" data-todo="${i.id}" ${i.done ? 'checked' : ''}><span class="box" aria-hidden="true"></span>
      <span class="txt">${esc(i.text)}</span></label><button type="button" class="icon-btn del" data-todo-del="${i.id}" aria-label="Delete to-do" title="Delete">✕</button></li>`;
  await draw();
}

// ---------------------------------------------------------------- sticky notes
// A "note wall": every note is a small tilted square that shows its first words.
// Click one and it opens big (to read or edit); click outside, press Esc or "Done" and it shrinks back.
// A note left empty disappears by itself, so "+ Note" by mistake leaves nothing behind.
const NOTE_COLORS = ['yellow', 'green', 'blue', 'pink', 'purple'];
const TILT = [-2, 1.5, -1, 2, -1.5, 1];
// opts: { lesson_id, editable, showLesson }
function notesWidget(container, notes, opts = {}) {
  const timers = {};
  let openId = null;
  if (opts.editable) {                 // notes left empty earlier are cleaned up
    notes.filter((n) => !n.text.trim()).forEach((n) => api('/api/notes', { id: n.id, delete: true }).catch(() => {}));
    for (let i = notes.length - 1; i >= 0; i -= 1) if (!notes[i].text.trim()) notes.splice(i, 1);
  }
  const save = (n) => { clearTimeout(timers[n.id]); return api('/api/notes', { id: n.id, text: n.text }).catch(() => {}); };
  const remove = (n) => {
    clearTimeout(timers[n.id]);
    api('/api/notes', { id: n.id, delete: true }).catch(() => {});
    notes.splice(notes.indexOf(n), 1);
  };
  const close = () => {
    const n = notes.find((x) => x.id === openId);
    openId = null;
    if (n && opts.editable) { if (!n.text.trim()) remove(n); else save(n); }
    draw();
  };
  const label = (n) => `${opts.showLesson && n.lesson ? esc(n.lesson) + ' · ' : ''}${n.at ? esc(n.at) : ''}`;
  const mini = (n, i) => `<button type="button" class="mini sticky ${n.color}" data-open="${n.id}" style="--r:${TILT[i % TILT.length]}deg"
      title="${esc(n.text.slice(0, 200))}"><span class="mini-text">${esc(n.text) || '<em>empty</em>'}</span><span class="mini-at">${label(n)}</span></button>`;
  const big = (n) => `<div class="note-open sticky ${n.color}" data-note="${n.id}">
      <div class="sticky-top"><span>${label(n)}</span>
        ${opts.editable ? `<span class="sticky-tools">${NOTE_COLORS.map((c) => `<button type="button" class="dotc ${c}${c === n.color ? ' on' : ''}" data-color="${c}" aria-label="${c} note"></button>`).join('')}
          <button type="button" class="icon-btn del" data-del aria-label="Delete note" title="Delete">🗑</button></span>` : ''}</div>
      ${opts.editable ? `<textarea maxlength="2000" placeholder="Write anything: an idea, a formula, what to ask…" aria-label="Sticky note">${esc(n.text)}</textarea>`
        : `<div class="sticky-text">${esc(n.text) || '<span class="muted">(empty)</span>'}</div>`}
      <div class="note-foot"><span>${opts.editable ? 'Saved automatically' : ''}</span><button type="button" class="note-done" data-done>${opts.editable ? 'Done' : 'Close'}</button></div>
    </div>`;
  const draw = () => {
    const open = notes.find((x) => x.id === openId);
    const rest = notes.filter((x) => x.id !== openId);
    container.innerHTML = (open ? big(open) : '')
      + (rest.length ? `<div class="notewall">${rest.map(mini).join('')}</div>` : '')
      + (!notes.length ? `<p class="muted small" style="margin:0">${opts.editable ? 'No notes yet. Press “+ Note” to write one.' : 'No sticky notes.'}</p>` : '');
    container.querySelectorAll('[data-open]').forEach((b) => {
      b.onclick = (e) => { e.stopPropagation(); if (openId) close(); openId = b.dataset.open; draw(); };
    });
    const el = container.querySelector('.note-open');
    if (!el) return;
    el.querySelector('[data-done]').onclick = (e) => { e.stopPropagation(); close(); };
    if (!opts.editable) return;
    const n = open, ta = el.querySelector('textarea');
    const grow = () => { ta.style.height = 'auto'; ta.style.height = `${Math.min(320, Math.max(90, ta.scrollHeight))}px`; };
    grow();
    ta.oninput = () => {               // autosave 0.6 s after you stop typing
      n.text = ta.value;
      grow();
      clearTimeout(timers[n.id]);
      timers[n.id] = setTimeout(() => save(n), 600);
    };
    ta.onkeydown = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    el.querySelectorAll('[data-color]').forEach((b) => {
      b.onclick = (e) => { e.stopPropagation(); n.color = b.dataset.color; api('/api/notes', { id: n.id, color: n.color }).catch(() => {}); draw(); container.querySelector('.note-open textarea').focus(); };
    });
    el.querySelector('[data-del]').onclick = (e) => { e.stopPropagation(); remove(n); openId = null; draw(); };
  };
  // click anywhere outside the open note: it shrinks back into the wall
  document.addEventListener('mousedown', (e) => {
    if (!openId || !container.isConnected) return;
    if (!e.target.closest('.note-open') && !e.target.closest('[data-open]') && !e.target.closest('#addNote')) close();
  });
  draw();
  return {
    async add() {
      if (openId) close();
      const { note } = await api('/api/notes', { new: true, lesson_id: opts.lesson_id, color: NOTE_COLORS[notes.length % NOTE_COLORS.length] });
      notes.unshift(note);
      openId = note.id;
      draw();
      container.querySelector('.note-open textarea').focus();
    },
  };
}

