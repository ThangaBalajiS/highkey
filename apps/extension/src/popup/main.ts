export {};

async function getExtensionId(): Promise<string> {
  const data = await chrome.storage.local.get('extensionId');
  if (data.extensionId) return data.extensionId as string;
  const newId = crypto.randomUUID();
  await chrome.storage.local.set({ extensionId: newId });
  return newId;
}

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

  const extensionId = await getExtensionId();

  if (commList) {
    commList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--muted);">Loading community packs...</div>';
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/shortcuts?domain=${domain}`);
    if (!response.ok) {
      if (commEmptyState) commEmptyState.style.display = 'block';
      commCount.textContent = '0';
      commList.innerHTML = '';
      return;
    }

    const data = await response.json();
    const packages: any[] = data.packs || [];
    const totalCount = data.total || 0;

    const badgeEl = document.getElementById('library-badge');
    if (badgeEl) {
      if (totalCount > 0) {
        badgeEl.textContent = `${totalCount}`;
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
    commCount.textContent = `${totalCount}`;
    commList.innerHTML = '';

    packages.forEach((pack) => {
      const item = document.createElement('div');
      item.className = 'pack-item';

      const avatarUrl = pack.author?.picture || 'https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png';
      const authorName = pack.author?.name || 'Highkey User';

      // --- Header Row ---
      const header = document.createElement('div');
      header.className = 'pack-item-header';

      const authorInfo = document.createElement('div');
      authorInfo.className = 'pack-author-info';

      const avatar = document.createElement('img');
      avatar.className = 'pack-avatar';
      avatar.src = avatarUrl;
      avatar.title = authorName; 

      const details = document.createElement('div');
      details.className = 'pack-details';

      const title = document.createElement('div');
      title.className = 'pack-title';
      title.textContent = pack.name || `${authorName}'s Pack`;
      title.title = pack.name || `${authorName}'s Pack`;

      const meta = document.createElement('div');
      meta.className = 'pack-meta';
      meta.textContent = `By ${authorName} • ${pack.shortcuts.length} shortcut${pack.shortcuts.length === 1 ? '' : 's'} • ${pack.downloads || 0} downloads`;

      details.appendChild(title);
      details.appendChild(meta);
      authorInfo.appendChild(avatar);
      authorInfo.appendChild(details);

      const topActions = document.createElement('div');
      topActions.style.display = 'flex';
      topActions.style.gap = '6px';

      const previewBtn = document.createElement('button');
      previewBtn.className = 'pack-action-btn';
      previewBtn.title = 'Preview shortcuts on webpage';
      previewBtn.style.padding = '4px 6px';
      previewBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
      previewBtn.onclick = async (e) => {
        e.stopPropagation();
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab?.id) {
            await chrome.tabs.sendMessage(tab.id, {
              action: 'preview-package',
              shortcuts: pack.shortcuts
            });
            window.close();
          }
        } catch (err) {
          console.error('Preview error:', err);
          alert('Could not preview. Ensure the extension is loaded on this page.');
        }
      };

      const reportBtn = document.createElement('button');
      reportBtn.className = 'pack-action-btn';
      reportBtn.title = 'Report Inappropriate Pack';
      reportBtn.style.padding = '4px 6px';
      reportBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>`;
      const isReported = pack.reportedBy && pack.reportedBy.includes(extensionId);
      if (isReported) {
        reportBtn.classList.add('active');
        reportBtn.disabled = true;
        reportBtn.title = 'Already Reported';
      } else {
        reportBtn.onclick = async (e) => {
          e.stopPropagation();
          try {
            const res = await fetch(`${BACKEND_URL}/api/shortcuts/${pack._id}/report`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ extensionId })
            });
            if (res.ok) {
              reportBtn.classList.add('active');
              reportBtn.disabled = true;
              reportBtn.title = 'Already Reported';
              alert('Pack reported. Our team will review it.');
            }
          } catch (err) {}
        };
      }

      topActions.appendChild(previewBtn);
      topActions.appendChild(reportBtn);
      header.appendChild(authorInfo);
      header.appendChild(topActions);

      // --- Footer Row ---
      const footer = document.createElement('div');
      footer.className = 'pack-item-footer';

      const upvoteBtn = document.createElement('button');
      upvoteBtn.className = 'pack-action-btn';
      upvoteBtn.title = 'Upvote Pack';
      upvoteBtn.style.flex = '1';
      upvoteBtn.style.justifyContent = 'center';
      upvoteBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
        <span>${pack.upvotes || 0}</span>
      `;
      const isUpvoted = pack.upvotedBy && pack.upvotedBy.includes(extensionId);
      if (isUpvoted) {
        upvoteBtn.classList.add('active');
        upvoteBtn.disabled = true;
        upvoteBtn.title = 'Already Upvoted';
      } else {
        upvoteBtn.onclick = async (e) => {
          e.stopPropagation();
          try {
            const res = await fetch(`${BACKEND_URL}/api/shortcuts/${pack._id}/upvote`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ extensionId })
            });
            if (res.ok) {
              pack.upvotes = (pack.upvotes || 0) + 1;
              const countSpan = upvoteBtn.querySelector('span');
              if (countSpan) countSpan.textContent = `${pack.upvotes}`;
              upvoteBtn.classList.add('active');
              upvoteBtn.disabled = true;
              upvoteBtn.title = 'Already Upvoted';
            }
          } catch (err) {
            console.error('Failed to upvote pack:', pack._id, err);
          }
        };
      }

      const dlBtn = document.createElement('button');
      dlBtn.className = 'pack-action-btn';
      dlBtn.title = 'Install Pack';
      dlBtn.style.flex = '1.5';
      dlBtn.style.justifyContent = 'center';
      dlBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
        <span>Install Pack</span>
      `;

      const isInstalled = pack.shortcuts.every((s: any) => localShortcutIds.includes(s.id));
      if (isInstalled) {
        dlBtn.classList.add('active');
        dlBtn.title = 'Already Installed';
        dlBtn.disabled = true;
        dlBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          <span>Installed</span>
        `;
      } else {
        dlBtn.style.background = 'var(--fg)';
        dlBtn.style.color = 'var(--bg)';
        dlBtn.style.borderColor = 'var(--fg)';
        dlBtn.onmouseenter = () => { dlBtn.style.opacity = '0.9'; };
        dlBtn.onmouseleave = () => { dlBtn.style.opacity = '1'; };
        dlBtn.onclick = async (e) => {
          e.stopPropagation();
          await addCommunityPackage(domain, pack, localShortcutIds, extensionId);
          loadCurrentShortcuts(); // refresh lists to update active shortcuts and active state
        };
      }

      footer.appendChild(upvoteBtn);
      footer.appendChild(dlBtn);

      item.appendChild(header);
      item.appendChild(footer);
      commList.appendChild(item);
    });
  } catch (error) {
    console.error('Error loading community shortcuts in popup:', error);
    if (commEmptyState) commEmptyState.style.display = 'block';
  }
}

async function addCommunityPackage(domain: string, pack: any, localShortcutIds: string[], extensionId: string) {
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
      await fetch(`${BACKEND_URL}/api/shortcuts/${pack._id}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extensionId })
      });
    } catch (err) {
      console.warn('Failed to increment download counter:', err);
    }
    alert(`Successfully added ${addedCount} shortcuts from "${pack.author?.name || 'Highkey User'}"!`);
  }
}
