// background.js: blocks the listed sites only while Lumen says a lesson is running.
// Blocking = declarativeNetRequest rules that send those sites to blocked.html (Chrome applies them itself,
// nothing is read from the pages). If Lumen stops talking (the tab was closed, the computer slept), the
// sites open again after 90 seconds, so nothing can stay blocked by mistake.
importScripts('sites.js');

const HEARTBEAT_MS = 90 * 1000;

async function getSites() {
  const { sites } = await chrome.storage.local.get('sites');
  return Array.isArray(sites) ? sites : DEFAULT_SITES;
}

async function block(on) {
  const old = await chrome.declarativeNetRequest.getDynamicRules();
  const sites = on ? await getSites() : [];
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: old.map((r) => r.id),
    addRules: sites.map((site, i) => ({
      id: i + 1,
      priority: 1,
      action: { type: 'redirect', redirect: { extensionPath: `/blocked.html?site=${encodeURIComponent(site)}` } },
      condition: { requestDomains: [site], resourceTypes: ['main_frame'] },
    })),
  });
  if (on && sites.length) {
    // tabs that already show a blocked site (YouTube left open) go to the "back to your lesson" page too
    const tabs = await chrome.tabs.query({ url: sites.flatMap((s) => [`*://${s}/*`, `*://*.${s}/*`]) });
    for (const tab of tabs) {
      const host = new URL(tab.url).hostname.replace(/^www\./, '');
      const site = sites.find((s) => host === s || host.endsWith(`.${s}`)) || host;
      chrome.tabs.update(tab.id, { url: chrome.runtime.getURL(`blocked.html?site=${encodeURIComponent(site)}&back=${encodeURIComponent(tab.url)}`) });
    }
  }
}

async function setActive(active) {
  const { state } = await chrome.storage.session.get('state');
  const was = !!(state && state.active);
  await chrome.storage.session.set({ state: { active, until: Date.now() + HEARTBEAT_MS } });
  if (active !== was) await block(active);
  chrome.action.setBadgeText({ text: active ? 'ON' : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#E07A5F' });
}

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (!msg || msg.source !== 'lumen-app' || msg.type !== 'lesson') return false;
  (async () => {
    await setActive(!!msg.active);
    reply({ installed: true, active: !!msg.active, count: (await getSites()).length });
  })();
  return true;   // the reply comes later
});

// the safety net: no message from Lumen for 90 s → open everything again
chrome.alarms.create('watchdog', { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener(async (a) => {
  if (a.name !== 'watchdog') return;
  const { state } = await chrome.storage.session.get('state');
  if (state && state.active && Date.now() > state.until) await setActive(false);
});

// when the browser starts nothing is blocked
chrome.runtime.onStartup.addListener(() => setActive(false));
chrome.runtime.onInstalled.addListener(() => setActive(false));

// the list changed in the popup during a lesson can't happen (the popup locks it), but keep rules in sync anyway
chrome.storage.onChanged.addListener(async (ch, area) => {
  if (area !== 'local' || !ch.sites) return;
  const { state } = await chrome.storage.session.get('state');
  if (state && state.active) await block(true);
});
