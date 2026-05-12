document.getElementById('start-binding')?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { action: 'toggle-binder' });
    window.close(); // Close popup to let user interact with the page
  }
});

document.getElementById('open-dashboard')?.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/index.html') });
});

async function loadCurrentShortcuts() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;

  const url = new URL(tab.url);
  const domain = url.hostname;
  const data = await chrome.storage.local.get('shortcuts');
  const shortcuts = data.shortcuts || {};
  const currentShortcuts = shortcuts[domain] || [];

  if (currentShortcuts.length > 0) {
    const section = document.getElementById('current-site-section');
    const list = document.getElementById('shortcut-list');
    if (section && list) {
      section.style.display = 'block';
      list.innerHTML = '';
      currentShortcuts.forEach((s: any) => {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.justifyContent = 'space-between';
        item.style.padding = '8px';
        item.style.background = '#1e1e1e';
        item.style.borderRadius = '6px';
        item.style.marginBottom = '6px';

        const info = document.createElement('div');
        info.innerHTML = `<span style="color: #00d778; font-family: monospace; font-weight: bold; margin-right: 8px;">${formatKey(s.shortcut)}</span><span style="font-size: 0.8rem; color: #eee;">${s.label}</span>`;
        
        const remapBtn = document.createElement('button');
        remapBtn.textContent = 'Remap';
        remapBtn.style.padding = '4px 8px';
        remapBtn.style.fontSize = '0.7rem';
        remapBtn.style.background = '#333';
        remapBtn.style.color = '#fff';
        remapBtn.style.border = '1px solid #444';
        remapBtn.style.borderRadius = '4px';
        remapBtn.style.cursor = 'pointer';
        
        remapBtn.onclick = () => {
          chrome.tabs.sendMessage(tab.id!, { action: 'remap-shortcut', id: s.id });
          window.close();
        };

        item.appendChild(info);
        item.appendChild(remapBtn);
        list.appendChild(item);
      });
    }
  }
}

function formatKey(sc: any) {
  const parts = [];
  if (sc.meta) parts.push('⌘');
  if (sc.ctrl) parts.push('⌃');
  if (sc.alt) parts.push('⌥');
  if (sc.shift) parts.push('⇧');
  parts.push(sc.key.toUpperCase());
  return parts.join('+');
}

loadCurrentShortcuts();
