// account.js: signing in, creating an account, the account chip in the menu.
// Authentication is done by Supabase Auth: passwords are never stored by Lumen itself.
// (Supabase keeps only a slow, salted HASH of each password - see the notes in docs/AUTH.md.)
'use strict';

const SYNC_TEXT = {
  synced: ['☁️', 'Saved'], saving: ['⏳', 'Saving…'], offline: ['📴', 'Offline · will sync'], local: ['💾', 'On this device'],
};

/** The small account block at the bottom of the menu. */
function renderAccountSlot() {
  const slot = $('#accountSlot');
  if (!slot) return;
  const acc = Lumen.account;
  if (!acc) {
    slot.innerHTML = `<a class="acct guest" href="#/account" title="Save your lessons in the cloud, on every device">
      <span class="ava">👤</span><span class="who"><b>Guest</b><em>Sign in to save everywhere</em></span></a>`;
    return;
  }
  const draw = (st) => {
    const [ic, txt] = SYNC_TEXT[st] || SYNC_TEXT.synced;
    slot.innerHTML = `<a class="acct" href="#/account" title="${esc(acc.email)}">
      <span class="ava">${esc((acc.name || '?')[0].toUpperCase())}</span>
      <span class="who"><b>${esc(acc.name)}</b><em class="sync ${st}">${ic} ${txt}</em></span></a>`;
  };
  draw(Lumen.syncState());
  if (!renderAccountSlot.sub) renderAccountSlot.sub = Lumen.onSync((st) => { if ($('#accountSlot')) draw(st); });
}

function authError(msg) {
  const m = String(msg || '');
  if (/invalid login/i.test(m)) return 'Wrong e-mail or password.';
  if (/already registered/i.test(m)) return 'This e-mail already has an account. Sign in instead.';
  if (/email not confirmed/i.test(m)) return 'Please confirm your e-mail first: open the link we sent you.';
  if (/at least 6/i.test(m) || /password should/i.test(m)) return 'The password needs at least 6 characters.';
  if (/rate limit/i.test(m)) return 'Too many tries. Wait a minute and try again.';
  if (/fetch|network/i.test(m)) return 'No internet connection.';
  return m || 'Something went wrong. Try again.';
}

const backUrl = () => location.origin + location.pathname;

async function viewAccount(mode) {
  closeStream();
  if (mode === 'new-password') return viewNewPassword();
  if (Lumen.account) return viewAccountInfo();
  if (!Lumen.client) {
    app.innerHTML = shell('account', `${pageHead('Account', 'Sign in')}
      <main class="wrap"><div class="authcard card"><h2>No internet</h2><p class="muted">Signing in needs an internet connection.
      You can keep using Lumen as a guest; everything is saved in this browser.</p><a class="btn ghost" href="#/">Continue as guest</a></div></main>`);
    return;
  }
  let tab = mode === 'signup' ? 'signup' : 'signin';
  const settings = await Lumen.authSettings();
  const draw = (msg = '', ok = false) => {
    const up = tab === 'signup';
    app.innerHTML = shell('account', `
    <main class="wrap authwrap">
      <section class="authcard card">
        <div class="authlogo">${LOGO}<b>Lumen</b></div>
        <h1>${up ? 'Create your account' : 'Welcome back 👋'}</h1>
        <p class="muted">${up ? 'Your lessons, cards and notes will be saved in the cloud and appear on every device.'
          : 'Sign in to see your lessons on this device.'}</p>
        <div class="seg authtabs" role="tablist">
          <button type="button" role="tab" class="pillbtn${up ? '' : ' on'}" data-tab="signin" aria-selected="${!up}">Sign in</button>
          <button type="button" role="tab" class="pillbtn${up ? ' on' : ''}" data-tab="signup" aria-selected="${up}">Create account</button>
        </div>
        ${settings.google ? `<button type="button" class="btn ghost google" id="googleBtn">
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            Continue with Google</button>
          <div class="or"><span>or with e-mail</span></div>` : ''}
        <form id="authForm" class="authform" novalidate>
          ${up ? '<label><span>Your name</span><input class="field" id="aName" maxlength="40" autocomplete="name" placeholder="e.g. Ani"></label>' : ''}
          <label><span>E-mail</span><input class="field" id="aEmail" type="email" autocomplete="email" required placeholder="you@example.com"></label>
          <label><span>Password</span><span class="pw"><input class="field" id="aPass" type="password" minlength="6" required
            autocomplete="${up ? 'new-password' : 'current-password'}" placeholder="${up ? 'at least 6 characters' : ''}">
            <button type="button" class="linkbtn" id="showPw" aria-label="Show password">show</button></span></label>
          ${up ? `<label class="check"><input type="checkbox" id="aAge"> <span>I am 13 or older, or a parent / teacher helps me set up Lumen.</span></label>` : ''}
          <div class="authmsg ${ok ? 'ok' : ''}" id="authMsg" role="alert">${msg}</div>
          <button class="btn primary big" type="submit" id="authBtn">${up ? 'Create account' : 'Sign in'}</button>
          ${up ? '' : '<button type="button" class="linkbtn" id="forgot">Forgot your password?</button>'}
        </form>
        <p class="small muted guestline">Not now? <a href="#/">Continue as a guest</a>: everything stays in this browser.</p>
      </section>
    </main>`);
    document.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => { tab = b.dataset.tab; draw(); }; });
    $('#showPw').onclick = () => { const p = $('#aPass'); p.type = p.type === 'password' ? 'text' : 'password'; $('#showPw').textContent = p.type === 'password' ? 'show' : 'hide'; };
    if ($('#googleBtn')) {
      $('#googleBtn').onclick = async () => {
        const { error } = await Lumen.client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: backUrl() } });
        if (error) $('#authMsg').textContent = authError(error.message);
      };
    }
    if ($('#forgot')) {
      $('#forgot').onclick = async () => {
        const email = $('#aEmail').value.trim();
        if (!email) { $('#authMsg').textContent = 'Write your e-mail first, then press "Forgot your password?" again.'; return; }
        const { error } = await Lumen.client.auth.resetPasswordForEmail(email, { redirectTo: backUrl() });
        $('#authMsg').className = `authmsg ${error ? '' : 'ok'}`;
        $('#authMsg').textContent = error ? authError(error.message) : `If ${email} has an account, a link to choose a new password is on its way. Check your inbox.`;
      };
    }
    $('#authForm').onsubmit = async (e) => {
      e.preventDefault();
      const email = $('#aEmail').value.trim(), password = $('#aPass').value;
      const msg = $('#authMsg');
      msg.className = 'authmsg';
      if (!/^\S+@\S+\.\S+$/.test(email)) { msg.textContent = 'Please write a valid e-mail.'; return; }
      if (password.length < 6) { msg.textContent = 'The password needs at least 6 characters.'; return; }
      if (up && !$('#aAge').checked) { msg.textContent = 'Please tick the box above (ask a parent or teacher if you are under 13).'; return; }
      const btn = $('#authBtn');
      btn.disabled = true;
      btn.textContent = up ? 'Creating…' : 'Signing in…';
      const res = up
        ? await Lumen.client.auth.signUp({ email, password, options: { data: { name: $('#aName').value.trim() }, emailRedirectTo: backUrl() } })
        : await Lumen.client.auth.signInWithPassword({ email, password });
      if (res.error) {
        btn.disabled = false;
        btn.textContent = up ? 'Create account' : 'Sign in';
        msg.textContent = authError(res.error.message);
        return;
      }
      if (up && !res.data.session) {          // Supabase sends a confirmation e-mail first
        draw(`📬 Almost done! We sent a link to <b>${esc(email)}</b>. Open it to confirm your e-mail, then you're signed in.`, true);
        return;
      }
      msg.className = 'authmsg ok';
      msg.textContent = 'Signed in! Opening your lessons…';   // main.js reloads with your data
    };
  };
  draw();
}

function viewAccountInfo() {
  const acc = Lumen.account;
  const ov = Lumen.db;
  const n = (c) => ov.list(c).length;
  app.innerHTML = shell('account', `
  ${pageHead('Account', esc(acc.name))}
  <main class="wrap authwrap">
    <section class="authcard card">
      <div class="bigava">${esc((acc.name || '?')[0].toUpperCase())}</div>
      <h1>${esc(acc.name)}</h1>
      <p class="muted">${esc(acc.email)}</p>
      <div class="acctstats">
        <div><b>${n('sessions')}</b><span>lessons</span></div>
        <div><b>${n('reviews')}</b><span>review cards</span></div>
        <div><b>${n('notes')}</b><span>notes</span></div>
      </div>
      <p class="small muted" id="syncLine"></p>
      <div class="btnrow" style="justify-content:center">
        <button class="btn ghost" id="signOut">Sign out</button>
        <a class="btn ghost" href="#/settings">Settings</a>
      </div>
      <details class="danger-zone"><summary>Delete my account</summary>
        <p class="small muted">Deletes your account and every lesson, card, note and chat in it, on all devices. This cannot be undone.
          Tip: Settings → “Download my data” first.</p>
        <button class="btn ghost danger" id="delAcct">Delete my account forever</button></details>
    </section>
  </main>`);
  const syncLine = () => {
    const el = $('#syncLine');
    if (!el) return;
    const [ic, txt] = SYNC_TEXT[Lumen.syncState()] || SYNC_TEXT.synced;
    el.textContent = `${ic} ${txt === 'Saved' ? 'Everything is saved in your account.' : txt}`;
  };
  syncLine();
  const off = Lumen.onSync(syncLine);
  window.addEventListener('hashchange', off, { once: true });
  $('#signOut').onclick = async () => {
    if (Lumen.server.tracker) { toast('Finish or pause your lesson first'); return; }
    await Lumen.db.flush();
    await Lumen.client.auth.signOut();          // main.js reloads as a guest
  };
  $('#delAcct').onclick = async () => {
    if (!confirm('Really delete your account and all its data?')) return;
    const { error } = await Lumen.client.rpc('delete_my_account');
    if (error) { toast(`Could not delete: ${error.message}`); return; }
    await Lumen.wipe().catch(() => {});
    await Lumen.client.auth.signOut();
    history.replaceState(null, '', `${location.pathname}${location.search}#/`);
    location.reload();
  };
}

function viewNewPassword() {
  app.innerHTML = shell('account', `
  <main class="wrap authwrap"><section class="authcard card">
    <div class="authlogo">${LOGO}<b>Lumen</b></div>
    <h1>Choose a new password</h1>
    <form id="pwForm" class="authform">
      <label><span>New password</span><input class="field" id="newPw" type="password" minlength="6" autocomplete="new-password" required></label>
      <div class="authmsg" id="authMsg" role="alert"></div>
      <button class="btn primary big" type="submit">Save password</button>
    </form></section></main>`);
  $('#pwForm').onsubmit = async (e) => {
    e.preventDefault();
    const pw = $('#newPw').value;
    if (pw.length < 6) { $('#authMsg').textContent = 'The password needs at least 6 characters.'; return; }
    const { error } = await Lumen.client.auth.updateUser({ password: pw });
    if (error) { $('#authMsg').textContent = authError(error.message); return; }
    toast('Password changed');
    location.hash = '#/';
  };
}
