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

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'open-dashboard') {
    chrome.runtime.openOptionsPage();
  }
});
