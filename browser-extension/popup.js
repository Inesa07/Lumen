// The popup: is a lesson running, and the list of sites blocked during lessons (locked while a lesson runs).
const $ = (id) => document.getElementById(id);
$('lbl').textContent = t('Blocked during lessons');
$('save').textContent = t('Save');
$('reset').textContent = t('Reset');
$('open').textContent = t('Open Lumen');
$('open').href = LUMEN_URL;
$('list').placeholder = t('One site per line');

async function load() {
  const [{ sites }, { state }] = await Promise.all([chrome.storage.local.get('sites'), chrome.storage.session.get('state')]);
  const active = !!(state && state.active);
  $('st').textContent = active ? t('Lesson running: these sites are blocked') : t('No lesson now: everything is open');
  $('st').classList.toggle('on', active);
  $('list').value = (Array.isArray(sites) ? sites : DEFAULT_SITES).join('\n');
  for (const id of ['list', 'save', 'reset']) $(id).disabled = active;
  $('hint').textContent = active ? t('You can change the list after the lesson.') : '';
}
$('save').onclick = async () => {
  const sites = [...new Set($('list').value.split(/[\n,]+/).map(cleanSite).filter(Boolean))];
  await chrome.storage.local.set({ sites });
  $('list').value = sites.join('\n');
  $('save').textContent = t('Saved ✓');
  setTimeout(() => { $('save').textContent = t('Save'); }, 1500);
};
$('reset').onclick = async () => { await chrome.storage.local.remove('sites'); load(); };
load();
