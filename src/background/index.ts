export {};

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

chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.action === 'broadcast' && sender.tab?.id) {
    chrome.tabs.sendMessage(sender.tab.id, request.message).catch(() => {});
  }
});
