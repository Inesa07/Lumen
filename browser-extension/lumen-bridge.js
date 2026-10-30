// lumen-bridge.js: runs on the Lumen page. Lumen posts {source:'lumen-app', type:'lesson', active} when a lesson
// starts, ends or pauses for a break (and every 20 s while it runs); this passes it to background.js and tells
// Lumen back that the extension is installed and how many sites are blocked.
document.documentElement.dataset.lumenFocus = '1';
window.addEventListener('message', (e) => {
  if (e.source !== window || !e.data || e.data.source !== 'lumen-app') return;
  chrome.runtime.sendMessage(e.data, (st) => {
    if (chrome.runtime.lastError || !st) return;
    window.postMessage({ source: 'lumen-focus', ...st }, location.origin);
  });
});
