import type { KeyCombo, Shortcut, ShortcutMap } from '../types';

document.getElementById('start-binding')?.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://')) {
        alert('Highkey cannot run on browser settings pages.');
        return;
      }
      await chrome.tabs.sendMessage(tab.id, { action: 'toggle-binder' });
      window.close(); // Close popup to let user interact with the page
    }
  } catch (err) {
    console.error('Failed to send toggle-binder message:', err);
    alert('Could not connect to the page. Please refresh the page and try again.');
  }
});

document.getElementById('open-dashboard')?.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/index.html') });
});

document.getElementById('open-settings')?.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/index.html') });
});

async function loadCurrentShortcuts() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;

  const url = new URL(tab.url);
  const domain = url.hostname;
  const data = await chrome.storage.local.get('shortcuts');
  const shortcuts = (data.shortcuts || {}) as ShortcutMap;
  const currentShortcuts = shortcuts[domain] || [];

  const list = document.getElementById('shortcut-list');
  const countEl = document.getElementById('shortcut-count');
  const emptyState = document.getElementById('empty-state');

  if (list && countEl && emptyState) {
    countEl.textContent = `${currentShortcuts.length}`;
    
    if (currentShortcuts.length > 0) {
      emptyState.style.display = 'none';
      list.style.display = 'flex';
      list.innerHTML = '';
      currentShortcuts.forEach(s => {
        const item = document.createElement('div');
        item.className = 'shortcut-item';

        const info = document.createElement('div');
        info.className = 'shortcut-info';
        
        const name = document.createElement('div');
        name.className = 'shortcut-name';
        name.textContent = s.label || 'Unnamed Shortcut';
        name.title = s.label || 'Unnamed Shortcut'; // Tooltip for truncated text

        const keys = document.createElement('div');
        keys.className = 'shortcut-keys';
        
        const formattedKeys = formatKeyParts(s.shortcut);
        formattedKeys.forEach(k => {
          const badge = document.createElement('span');
          badge.className = 'key-badge';
          badge.textContent = k;
          keys.appendChild(badge);
        });

        info.appendChild(name);
        info.appendChild(keys);

        const actions = document.createElement('div');
        actions.className = 'shortcut-actions';

        const renameBtn = document.createElement('button');
        renameBtn.className = 'action-btn';
        renameBtn.dataset.tooltip = 'Rename';
        renameBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
        renameBtn.onclick = async () => {
          const newName = prompt('New name for this shortcut:', s.label);
          if (newName !== null && newName.trim() !== '') {
            await updateShortcut(domain, s.id, { label: newName.trim() });
            loadCurrentShortcuts();
          }
        };

        const remapBtn = document.createElement('button');
        remapBtn.className = 'action-btn';
        remapBtn.dataset.tooltip = 'Remap';
        remapBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7"></circle><circle cx="12" cy="12" r="3"></circle><path d="M12 2v3"></path><path d="M12 19v3"></path><path d="M2 12h3"></path><path d="M19 12h3"></path></svg>';
        remapBtn.onclick = async () => {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab?.id) {
            try {
              await chrome.tabs.sendMessage(tab.id, { action: 'remap-shortcut', id: s.id });
              window.close();
            } catch (e) {
               console.error(e);
               alert('Could not connect to the page. Please refresh the page and try again.');
            }
          }
        };

        const delBtn = document.createElement('button');
        delBtn.className = 'action-btn del';
        delBtn.dataset.tooltip = 'Delete';
        delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
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
      list.style.display = 'none';
      emptyState.style.display = 'block';
    }
  }
}

async function updateShortcut(domain: string, id: string, updates: Partial<Shortcut>) {
  const data = await chrome.storage.local.get('shortcuts');
  const shortcuts = (data.shortcuts || {}) as ShortcutMap;
  if (shortcuts[domain]) {
    shortcuts[domain] = shortcuts[domain].map(s => 
      s.id === id ? { ...s, ...updates } : s
    );
    await chrome.storage.local.set({ shortcuts });
  }
}

async function deleteShortcut(domain: string, id: string) {
  const data = await chrome.storage.local.get('shortcuts');
  const shortcuts = (data.shortcuts || {}) as ShortcutMap;
  if (shortcuts[domain]) {
    shortcuts[domain] = shortcuts[domain].filter(s => s.id !== id);
    if (shortcuts[domain].length === 0) delete shortcuts[domain];
    await chrome.storage.local.set({ shortcuts });
  }
}

function formatKeyParts(sc: KeyCombo): string[] {
  const parts = [];
  if (sc.meta) parts.push('⌘');
  if (sc.ctrl) parts.push('⌃');
  if (sc.alt) parts.push('⌥');
  if (sc.shift) parts.push('⇧');
  parts.push(sc.key.toUpperCase());
  return parts;
}

loadCurrentShortcuts();
