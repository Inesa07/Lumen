// router.js: which page to show for the part of the URL after "#" (loaded last).
'use strict';

// Where did you come from? Used for the back arrow on pages you opened from a link.
const PAGE_NAMES = { '#/': 'Home', '#/lumi': 'Lumi', '#/parent': 'Parent mode', '#/review': 'Review', '#/classes': 'Classes', '#/ai': 'Ask AI', '#/stats': 'Progress',
  '#/week': 'Weekly report', '#/history': 'History', '#/check': 'Accuracy check', '#/settings': 'Settings', '#/account': 'Account' };
let prevHash = null, curHash = null, viaMenu = false;
document.addEventListener('click', (e) => { if (e.target.closest('#sidebar nav a')) viaMenu = true; }, true);
let fromInfo = null;                 // decided at the moment you navigate (pages draw later)
function cameFrom() { return fromInfo; }
function computeFrom() {
  if (viaMenu || !prevHash || prevHash === curHash || prevHash.startsWith('#/session') || prevHash.startsWith('#/check/run')) return null;
  const key = prevHash.startsWith('#/class/') ? null : prevHash.split('?')[0];
  const name = PAGE_NAMES[key] || (prevHash.startsWith('#/class/') ? decodeURIComponent(prevHash.slice(8))
    : prevHash.startsWith('#/report/') ? 'the report' : prevHash.startsWith('#/ai/') ? 'Ask AI' : 'the previous page');
  return { hash: prevHash, name };
}

function route() {
  const h = decodeURIComponent(location.hash || '#/');
  window.scrollTo(0, 0);
  closeStream();     // leaving a page: stop its live data and camera preview
  document.documentElement.classList.remove('ai-mode');   // only the AI page locks the page scroll
  if (h.startsWith('#/session')) return viewSession();
  if (h.startsWith('#/report/')) return viewReport(h.slice('#/report/'.length));
  if (h === '#/classes') return viewClasses();
  if (h.startsWith('#/class/')) return viewClass(h.slice('#/class/'.length));
  if (h.startsWith('#/start/')) return viewHome(h.slice('#/start/'.length));
  if (h === '#/stats') return viewProgress();
  if (h.startsWith('#/stats/')) return viewProgress(h.slice('#/stats/'.length));
  if (h === '#/lumi') return viewLumi();
  if (h === '#/parent') return viewParent();
  if (h === '#/review') return viewReview();
  if (h === '#/ai') return viewAI();
  if (h.startsWith('#/ai/')) return viewAI(h.slice('#/ai/'.length));
  if (h === '#/settings') return viewSettings();
  if (h === '#/account') return viewAccount();
  if (h.startsWith('#/account/')) return viewAccount(h.slice('#/account/'.length));
  if (h === '#/week') { location.replace('#/stats/week'); return undefined; }
  if (h === '#/history') return viewHistory();
  if (h === '#/check') return viewCheckIntro();
  if (h === '#/check/run') return viewCheckRun();
  if (h.startsWith('#/check/')) { const [cid, sub] = h.slice('#/check/'.length).split('/'); return viewCheckResult(cid, sub || ''); }
  return viewHome();
}

window.addEventListener('hashchange', (e) => {
  prevHash = new URL(e.oldURL).hash || '#/';
  curHash = location.hash || '#/';
  fromInfo = computeFrom();
  route();
  viaMenu = false;
});
window.addEventListener('resize', () => { if (!layoutEl().classList.contains('focus')) applyNav(); });
document.addEventListener('keydown', (e) => {
  if (/INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;                 // keep Cmd+C, Cmd+R etc. working
  if ((e.key === 'c' || e.key === 'C') && $('#markBtn')) { e.preventDefault(); $('#markBtn').click(); }
  if ((e.key === 'n' || e.key === 'N') && $('#notesBtn')) { e.preventDefault(); $('#notesBtn').click(); }
  if (e.key === 'm' || e.key === 'M') toggleNav();
  if (e.key === 'Escape' && document.body.classList.contains('nav-open')) toggleNav(true);
});
route();
