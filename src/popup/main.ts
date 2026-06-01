export {};

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
  const shortcuts: Record<string, any> = data.shortcuts || {};
  const currentShortcuts = shortcuts[domain] || [];

  const section = document.getElementById('current-site-section');
  const list = document.getElementById('shortcut-list');
  const countEl = document.getElementById('shortcut-count');

  if (section && list && countEl) {
    if (currentShortcuts.length > 0) {
      section.style.display = 'block';
      countEl.textContent = `${currentShortcuts.length} total`;
      list.innerHTML = '';
      currentShortcuts.forEach((s: any) => {
        const item = document.createElement('div');
        item.className = 'shortcut-item';

        const info = document.createElement('div');
        info.className = 'shortcut-info';
        
        const name = document.createElement('div');
        name.className = 'shortcut-name';
        name.textContent = s.label || 'Unnamed Shortcut';

        const keys = document.createElement('div');
        keys.className = 'shortcut-keys';
        keys.textContent = formatKey(s.shortcut);

        info.appendChild(name);
        info.appendChild(keys);

        const actions = document.createElement('div');
        actions.className = 'shortcut-actions';

        const renameBtn = document.createElement('button');
        renameBtn.className = 'action-btn';
        renameBtn.textContent = 'Rename';
        renameBtn.onclick = async () => {
          const newName = prompt('New name for this shortcut:', s.label);
          if (newName !== null && newName.trim() !== '') {
            await updateShortcut(domain, s.id, { label: newName.trim() });
            loadCurrentShortcuts();
          }
        };

        const remapBtn = document.createElement('button');
        remapBtn.className = 'action-btn';
        remapBtn.textContent = 'Remap';
        remapBtn.onclick = async () => {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab?.id) {
            chrome.tabs.sendMessage(tab.id, { action: 'remap-shortcut', id: s.id });
            window.close();
          }
        };

        const delBtn = document.createElement('button');
        delBtn.className = 'action-btn del';
        delBtn.textContent = 'Del';
        delBtn.onclick = async () => {
          await deleteShortcut(domain, s.id);
          loadCurrentShortcuts();
        };

        actions.appendChild(renameBtn);
        actions.appendChild(remapBtn);
        actions.appendChild(delBtn);
        item.appendChild(info);
        item.appendChild(actions);
        list.appendChild(item);
      });
    } else {
      section.style.display = 'none';
    }
  }
}

async function updateShortcut(domain: string, id: string, updates: Partial<any>) {
  const data = await chrome.storage.local.get('shortcuts');
  const shortcuts: Record<string, any> = data.shortcuts || {};
  if (shortcuts[domain]) {
    shortcuts[domain] = shortcuts[domain].map((s: any) => 
      s.id === id ? { ...s, ...updates } : s
    );
    await chrome.storage.local.set({ shortcuts });
  }
}

async function deleteShortcut(domain: string, id: string) {
  const data = await chrome.storage.local.get('shortcuts');
  const shortcuts: Record<string, any> = data.shortcuts || {};
  if (shortcuts[domain]) {
    shortcuts[domain] = shortcuts[domain].filter((s: any) => s.id !== id);
    if (shortcuts[domain].length === 0) delete shortcuts[domain];
    await chrome.storage.local.set({ shortcuts });
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
