export {};

const BACKEND_URL = 'http://localhost:4000';

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
    fetch(`${BACKEND_URL}/api/shortcuts?domain=${request.domain}`)
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Network response was not ok');
      })
      .then((data) => {
        sendResponse({ count: data.total || 0 });
      })
      .catch((error) => {
        console.warn('Highkey background: Error fetching shortcuts', error);
        sendResponse({ count: 0 });
      });
    return true; // Keep the message channel open for asynchronous sendResponse
  }
});

