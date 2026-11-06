import { BACKEND_URL } from '../shared/config';

const COMMUNITY_DOMAINS_MAX_AGE = 6 * 60 * 60 * 1000;

interface CommunityDomains {
  counts: Record<string, number>;
  fetchedAt: number;
}

// Fetches the whole list so the server never learns which sites someone visits
async function getCommunityDomains(): Promise<Record<string, number>> {
  const data = await chrome.storage.local.get('communityDomains');
  const cached = data.communityDomains as CommunityDomains | undefined;
  if (cached && Date.now() - cached.fetchedAt < COMMUNITY_DOMAINS_MAX_AGE) return cached.counts;

  let counts = cached?.counts || {};
  try {
    const response = await fetch(`${BACKEND_URL}/api/shortcuts/domains`);
    if (response.ok) counts = (await response.json()).domains;
  } catch (error) {
    console.warn('Highkey background: Error fetching community domains', error);
  }

  // Saved even after a failure, so an outage doesn't mean a request per page
  await chrome.storage.local.set({ communityDomains: { counts, fetchedAt: Date.now() } });
  return counts;
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'activate-binder') {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id) {
      try {
        await chrome.tabs.sendMessage(activeTab.id, { action: 'toggle-binder' });
      } catch {
        // No content script in this tab. Per-tab badges clear on navigation.
        chrome.action.setBadgeText({ tabId: activeTab.id, text: '!' });
        chrome.action.setTitle({
          tabId: activeTab.id,
          title: "Highkey can't reach this tab. Refresh the page and try again. Browser pages aren't supported."
        });
      }
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'broadcast' && sender.tab?.id) {
    chrome.tabs.sendMessage(sender.tab.id, request.message).catch(() => {});
  } else if (request.action === 'open-dashboard') {
    chrome.runtime.openOptionsPage();
  } else if (request.action === 'check-shortcuts') {
    getCommunityDomains().then((counts) => {
      sendResponse({ count: Number(counts[request.domain]) || 0 });
    });
    return true; // Keep the message channel open for asynchronous sendResponse
  }
});

