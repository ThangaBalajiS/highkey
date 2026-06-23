const BACKEND_URL = 'http://localhost:4000';

chrome.commands.onCommand.addListener((command) => {
  if (command === 'activate-binder') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        chrome.tabs.sendMessage(activeTab.id, { action: 'toggle-binder' });
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'open-dashboard') {
    chrome.runtime.openOptionsPage();
  } else if (request.action === 'check-shortcuts') {
    fetch(`${BACKEND_URL}/api/shortcuts?domain=${request.domain}`)
      .then((response) => {
        if (response.ok) {
          return response.json();
        }
        throw new Error('Network response was not ok');
      })
      .then((shortcuts) => {
        sendResponse({ count: shortcuts.length });
      })
      .catch((error) => {
        console.warn('Highkey background: Error fetching shortcuts', error);
        sendResponse({ count: 0 });
      });
    return true; // Keep the message channel open for asynchronous sendResponse
  }
});

