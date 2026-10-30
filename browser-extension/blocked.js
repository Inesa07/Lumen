// The page a blocked site turns into during a lesson. When the lesson ends it says so and offers the site again.
const q = new URLSearchParams(location.search);
const site = cleanSite(q.get('site')) || 'this site';
const back = /^https?:\/\//.test(q.get('back') || '') ? q.get('back') : `https://${site}/`;
document.documentElement.lang = LANG;

function draw(active) {
  const box = document.getElementById('box'), go = document.getElementById('go');
  box.classList.toggle('done', !active);
  if (active) {
    document.getElementById('h').textContent = t('Back to your lesson!');
    document.getElementById('p').textContent = t('{site} will open again after the lesson.', { site });
    document.getElementById('q').textContent = t('Lumi is studying with you 📖');
    go.textContent = t('Back to Lumen');
    go.onclick = async (e) => {
      e.preventDefault();
      const tabs = await chrome.tabs.query({ url: ['https://inesa07.github.io/Lumen/*', 'http://localhost/*', 'http://127.0.0.1/*'] });
      if (tabs.length) { await chrome.tabs.update(tabs[0].id, { active: true }); await chrome.windows.update(tabs[0].windowId, { focused: true }); window.close(); }
      else location.href = LUMEN_URL;
    };
  } else {
    document.getElementById('h').textContent = t('The lesson is over. You can open it now.');
    document.getElementById('p').textContent = '';
    document.getElementById('q').textContent = '';
    go.textContent = t('Open {site}', { site });
    go.onclick = null;
    go.href = back;
  }
}

async function check() {
  const { state } = await chrome.storage.session.get('state');
  draw(!!(state && state.active));
}
check();
chrome.storage.onChanged.addListener((ch, area) => { if (area === 'session' && ch.state) check(); });
