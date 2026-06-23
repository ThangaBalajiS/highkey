export {};

const BACKEND_URL = 'http://localhost:4000';

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
  const data = await chrome.storage.sync.get('shortcuts');
  const shortcuts: Record<string, any> = data.shortcuts || {};
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
      currentShortcuts.forEach((s: any) => {
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

    const shareContainer = document.getElementById('share-dropdown-container');
    if (shareContainer) {
      shareContainer.style.display = currentShortcuts.length > 0 ? 'inline-block' : 'none';
    }

    loadCommunityShortcuts(domain, currentShortcuts.map((s: any) => s.id));
  }
}

async function updateShortcut(domain: string, id: string, updates: Partial<any>) {
  const data = await chrome.storage.sync.get('shortcuts');
  const shortcuts: Record<string, any> = data.shortcuts || {};
  if (shortcuts[domain]) {
    shortcuts[domain] = shortcuts[domain].map((s: any) => 
      s.id === id ? { ...s, ...updates } : s
    );
    await chrome.storage.sync.set({ shortcuts });
  }
}

async function deleteShortcut(domain: string, id: string) {
  const data = await chrome.storage.sync.get('shortcuts');
  const shortcuts: Record<string, any> = data.shortcuts || {};
  if (shortcuts[domain]) {
    shortcuts[domain] = shortcuts[domain].filter((s: any) => s.id !== id);
    if (shortcuts[domain].length === 0) delete shortcuts[domain];
    await chrome.storage.sync.set({ shortcuts });
  }
}

function formatKeyParts(sc: any): string[] {
  const parts = [];
  if (sc.meta) parts.push('⌘');
  if (sc.ctrl) parts.push('⌃');
  if (sc.alt) parts.push('⌥');
  if (sc.shift) parts.push('⇧');
  parts.push(sc.key.toUpperCase());
  return parts;
}

const shareBtn = document.getElementById('share-btn');
const shareMenu = document.getElementById('share-dropdown-menu');
const submitToLibOption = document.getElementById('submit-to-library-option');

shareBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (shareMenu) {
    shareMenu.style.display = shareMenu.style.display === 'block' ? 'none' : 'block';
  }
});

document.addEventListener('click', () => {
  if (shareMenu) shareMenu.style.display = 'none';
});

submitToLibOption?.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;
  const url = new URL(tab.url);
  const domain = url.hostname;
  chrome.tabs.create({ url: chrome.runtime.getURL(`src/dashboard/index.html?submit=${encodeURIComponent(domain)}`) });
});

// Tabs toggle setup
const tabActive = document.getElementById('tab-active');
const tabLibrary = document.getElementById('tab-library');
const viewActive = document.getElementById('view-active');
const viewLibrary = document.getElementById('view-library');

tabActive?.addEventListener('click', () => {
  tabActive.classList.add('active');
  tabLibrary?.classList.remove('active');
  if (viewActive) viewActive.style.display = 'flex';
  if (viewLibrary) viewLibrary.style.display = 'none';
});

tabLibrary?.addEventListener('click', () => {
  tabLibrary.classList.add('active');
  tabActive?.classList.remove('active');
  if (viewLibrary) viewLibrary.style.display = 'flex';
  if (viewActive) viewActive.style.display = 'none';
});

loadCurrentShortcuts();

async function loadCommunityShortcuts(domain: string, localShortcutIds: string[]) {
  const commSection = document.getElementById('community-site-section');
  const commList = document.getElementById('community-shortcut-list');
  const commCount = document.getElementById('community-count');
  const commEmptyState = document.getElementById('community-empty-state');

  if (!commSection || !commList || !commCount) return;

  try {
    const response = await fetch(`${BACKEND_URL}/api/shortcuts?domain=${domain}`);
    if (!response.ok) {
      if (commEmptyState) commEmptyState.style.display = 'block';
      commCount.textContent = '0';
      commList.innerHTML = '';
      return;
    }

    const packages: any[] = await response.json();

    const badgeEl = document.getElementById('library-badge');
    if (badgeEl) {
      if (packages.length > 0) {
        badgeEl.textContent = `${packages.length}`;
        badgeEl.style.display = 'inline-block';
      } else {
        badgeEl.style.display = 'none';
      }
    }

    if (packages.length === 0) {
      if (commEmptyState) commEmptyState.style.display = 'block';
      commCount.textContent = '0';
      commList.innerHTML = '';
      return;
    }

    if (commEmptyState) commEmptyState.style.display = 'none';
    commCount.textContent = `${packages.length}`;
    commList.innerHTML = '';

    packages.forEach((pack) => {
      const item = document.createElement('div');
      item.className = 'pack-item';

      const avatarUrl = pack.author?.picture || 'https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png';
      const authorName = pack.author?.name || 'Highkey User';

      // Left part: profile image + name + meta
      const authorInfo = document.createElement('div');
      authorInfo.className = 'pack-author-info';

      const avatar = document.createElement('img');
      avatar.className = 'pack-avatar';
      avatar.src = avatarUrl;
      avatar.title = authorName; // Hover to show name

      const details = document.createElement('div');
      details.className = 'pack-details';

      const title = document.createElement('div');
      title.className = 'pack-title';
      title.textContent = `${authorName}'s Pack`;
      title.title = `${authorName}'s Pack`;

      const meta = document.createElement('div');
      meta.className = 'pack-meta';
      meta.textContent = `${pack.shortcuts.length} shortcut${pack.shortcuts.length === 1 ? '' : 's'}`;

      details.appendChild(title);
      details.appendChild(meta);

      authorInfo.appendChild(avatar);
      authorInfo.appendChild(details);

      // Right part: actions (Upvote button, downloads count, download button, preview button)
      const actions = document.createElement('div');
      actions.className = 'pack-actions';

      // Upvote Button
      const upvoteBtn = document.createElement('button');
      upvoteBtn.className = 'pack-action-btn';
      upvoteBtn.title = 'Upvote Pack';
      upvoteBtn.innerHTML = `
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
        <span>${pack.upvotes || 0}</span>
      `;
      upvoteBtn.onclick = async (e) => {
        e.stopPropagation();
        try {
          const res = await fetch(`${BACKEND_URL}/api/shortcuts/${pack._id}/upvote`, { method: 'POST' });
          if (res.ok) {
            pack.upvotes = (pack.upvotes || 0) + 1;
            const countSpan = upvoteBtn.querySelector('span');
            if (countSpan) countSpan.textContent = `${pack.upvotes}`;
            upvoteBtn.classList.add('active');
          }
        } catch (err) {
          console.error('Failed to upvote pack:', pack._id, err);
        }
      };

      // Number of downloads text
      const dlCount = document.createElement('span');
      dlCount.className = 'pack-meta';
      dlCount.style.marginRight = '2px';
      dlCount.textContent = `${pack.downloads || 0} dls`;

      // Download Button itself
      const dlBtn = document.createElement('button');
      dlBtn.className = 'pack-action-btn';
      dlBtn.title = 'Download/Install Pack';
      dlBtn.innerHTML = `
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
      `;

      // Check if all shortcuts are already installed
      const isInstalled = pack.shortcuts.every((s: any) => localShortcutIds.includes(s.id));
      if (isInstalled) {
        dlBtn.classList.add('active');
        dlBtn.title = 'Already Installed';
        dlBtn.disabled = true;
        dlBtn.innerHTML = `
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        `;
      } else {
        dlBtn.onclick = async (e) => {
          e.stopPropagation();
          await addCommunityPackage(domain, pack, localShortcutIds);
          loadCurrentShortcuts(); // refresh lists to update active shortcuts and active state
        };
      }

      // Preview Button
      const previewBtn = document.createElement('button');
      previewBtn.className = 'pack-action-btn';
      previewBtn.title = 'Preview shortcuts on webpage';
      previewBtn.innerHTML = `
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
        <span>Preview</span>
      `;
      previewBtn.onclick = async (e) => {
        e.stopPropagation();
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab?.id) {
            await chrome.tabs.sendMessage(tab.id, {
              action: 'preview-package',
              shortcuts: pack.shortcuts
            });
            window.close(); // Close popup so preview overlay is immediately fully visible
          }
        } catch (err) {
          console.error('Failed to send preview-package message:', err);
          alert('Could not preview. Make sure you are on a webpage that has loaded the extension.');
        }
      };

      actions.appendChild(upvoteBtn);
      actions.appendChild(dlCount);
      actions.appendChild(dlBtn);
      actions.appendChild(previewBtn);

      item.appendChild(authorInfo);
      item.appendChild(actions);
      commList.appendChild(item);
    });
  } catch (error) {
    console.error('Error loading community shortcuts in popup:', error);
    if (commEmptyState) commEmptyState.style.display = 'block';
  }
}

async function addCommunityPackage(domain: string, pack: any, localShortcutIds: string[]) {
  const data = await chrome.storage.sync.get('shortcuts');
  const shortcuts: Record<string, any> = data.shortcuts || {};
  if (!shortcuts[domain]) {
    shortcuts[domain] = [];
  }

  let addedCount = 0;
  for (const item of pack.shortcuts) {
    if (!localShortcutIds.includes(item.id)) {
      const newShortcut = {
        shortcut: item.shortcut,
        selector: item.selector,
        innerText: item.innerText || "",
        label: item.label,
        scope: item.scope,
        path: item.path || null,
        id: item.id,
        createdAt: Date.now()
      };
      shortcuts[domain].push(newShortcut);
      addedCount++;
    }
  }

  if (addedCount > 0) {
    await chrome.storage.sync.set({ shortcuts });
    try {
      await fetch(`${BACKEND_URL}/api/shortcuts/${pack._id}/download`, { method: 'POST' });
    } catch (err) {
      console.warn('Failed to increment download counter:', err);
    }
    alert(`Successfully added ${addedCount} shortcuts from "${pack.author?.name || 'Highkey User'}"!`);
  }
}
