import { getAuthToken, getUserProfile, clearAuthToken } from '../shared/auth';
import { User } from '../types';
import { BACKEND_URL } from '../shared/config';
import { escapeHtml } from '../shared/html';
import { getShortcuts, saveShortcuts } from '../shared/storage';

async function getExtensionId(): Promise<string> {
  const data = await chrome.storage.local.get('extensionId');
  if (data.extensionId) return data.extensionId as string;
  const newId = crypto.randomUUID();
  await chrome.storage.local.set({ extensionId: newId });
  return newId;
}

const tableBody = document.getElementById('shortcut-table-body');
const statsEl = document.getElementById('shortcut-stats');
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const editModal = document.getElementById('edit-modal') as HTMLElement;
const modalLabel = document.getElementById('modal-label') as HTMLInputElement;
const modalSelector = document.getElementById('modal-selector') as HTMLInputElement;
const modalCapture = document.getElementById('modal-capture') as HTMLElement;
const modalSave = document.getElementById('modal-save') as HTMLButtonElement;
const modalCancel = document.getElementById('modal-cancel') as HTMLButtonElement;

const signInBtn = document.getElementById('sign-in-btn') as HTMLButtonElement;
const signOutLink = document.getElementById('sign-out') as HTMLElement;
const userProfile = document.getElementById('user-profile') as HTMLElement;
const userAvatar = document.getElementById('user-avatar') as HTMLImageElement;
const userName = document.getElementById('user-name') as HTMLElement;

const navShortcuts = document.getElementById('nav-shortcuts') as HTMLElement;
const navCommunity = document.getElementById('nav-community') as HTMLElement;
const viewShortcuts = document.getElementById('view-shortcuts') as HTMLElement;
const viewCommunity = document.getElementById('view-community') as HTMLElement;
const communityList = document.getElementById('community-list') as HTMLElement;
const communityEmpty = document.getElementById('community-empty') as HTMLElement;
const communitySearch = document.getElementById('community-search') as HTMLInputElement;

const navDiscover = document.getElementById('nav-discover') as HTMLElement;
const viewDiscover = document.getElementById('view-discover') as HTMLElement;
const discoverList = document.getElementById('discover-list') as HTMLElement;
const discoverEmpty = document.getElementById('discover-empty') as HTMLElement;
const discoverSearch = document.getElementById('discover-search') as HTMLInputElement;

// Submit Modal Elements
const submitModal = document.getElementById('submit-modal') as HTMLElement;
const submitStepLogin = document.getElementById('submit-step-login') as HTMLElement;
const submitStepSignup = document.getElementById('submit-step-signup') as HTMLElement;
const submitStepShare = document.getElementById('submit-step-share') as HTMLElement;
const submitGmailLoginBtn = document.getElementById('submit-gmail-login-btn') as HTMLButtonElement;
const submitSignupAvatar = document.getElementById('submit-signup-avatar') as HTMLImageElement;
const submitSignupName = document.getElementById('submit-signup-name') as HTMLElement;
const submitSignupEmail = document.getElementById('submit-signup-email') as HTMLElement;
const submitSignupConfirmBtn = document.getElementById('submit-signup-confirm-btn') as HTMLButtonElement;
const submitDomainDisplay = document.getElementById('submit-domain-display') as HTMLElement;
const submitShortcutsList = document.getElementById('submit-shortcuts-list') as HTMLElement;
const submitModalCancel = document.getElementById('submit-modal-cancel') as HTMLButtonElement;
const submitModalShareBtn = document.getElementById('submit-modal-share-btn') as HTMLButtonElement;

let currentUser: User | null = null;
let currentToken: string | null = null;
let currentEditItem: any = null;
let currentEditDomain: string = '';
let capturedShortcut: any = null;
let allShortcuts: { domain: string, shortcut: any }[] = [];
let openDomain: string | null = null;
let communityPacks: any[] = [];

let isSignedUp = false;
let submitDomain = '';
let submitShortcuts: any[] = [];


async function loadDashboard() {
  const shortcutsMap = await getShortcuts();
  
  allShortcuts = [];
  for (const [domain, list] of Object.entries(shortcutsMap)) {
    (list as any[]).forEach(s => {
      allShortcuts.push({ domain, shortcut: s });
    });
  }

  renderTable();
}

function renderTable() {
  if (!tableBody || !statsEl) return;

  const query = searchInput.value.toLowerCase();
  const filtered = allShortcuts.filter(item => {
    const label = (item.shortcut.label || '').toLowerCase();
    const domain = item.domain.toLowerCase();
    const selector = (item.shortcut.selector || '').toLowerCase();
    return label.includes(query) || domain.includes(query) || selector.includes(query);
  });

  tableBody.innerHTML = '';
  
  if (filtered.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="4" class="empty-state">No shortcuts found.</td></tr>';
    statsEl.textContent = 'Showing 0 shortcuts';
    return;
  }

  // Group by domain
  const grouped: Record<string, typeof filtered> = {};
  filtered.forEach(item => {
    if (!grouped[item.domain]) {
      grouped[item.domain] = [];
    }
    grouped[item.domain].push(item);
  });

  const domains = Object.keys(grouped).sort();
  if (!openDomain || !grouped[openDomain]) {
    openDomain = domains[0] || null;
  }

  for (const domain of domains) {
    const items = grouped[domain];
    const isOpen = domain === openDomain;

    const headerRow = document.createElement('tr');
    headerRow.className = `domain-header-row ${isOpen ? 'open' : ''}`;

    const headerTd = document.createElement('td');
    headerTd.colSpan = 4;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'domain-toggle';
    toggle.setAttribute('aria-expanded', `${isOpen}`);
    toggle.onclick = () => {
      openDomain = domain;
      renderTable();
    };

    const title = document.createElement('span');
    title.className = 'domain-title';

    const chevron = document.createElement('span');
    chevron.className = 'domain-chevron';
    chevron.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"></path></svg>';

    const name = document.createElement('span');
    name.className = 'domain-name';
    name.textContent = domain;

    const submitBtn = document.createElement('button');
    submitBtn.className = 'submit-to-library-btn';
    submitBtn.textContent = 'Submit to library';
    submitBtn.type = 'button';
    submitBtn.onclick = (e) => {
      e.stopPropagation(); // Prevent toggling accordion
      openSubmitModal(domain, items.map(x => x.shortcut));
    };

    const count = document.createElement('span');
    count.className = 'domain-count';
    count.textContent = `${items.length} shortcut${items.length === 1 ? '' : 's'}`;

    title.appendChild(chevron);
    title.appendChild(name);
    title.appendChild(submitBtn);
    toggle.appendChild(title);
    toggle.appendChild(count);
    headerTd.appendChild(toggle);
    headerRow.appendChild(headerTd);
    tableBody.appendChild(headerRow);

    items.sort((a, b) => b.shortcut.createdAt - a.shortcut.createdAt).forEach(item => {
      const row = document.createElement('tr');
      row.className = 'domain-shortcut-row';
      row.hidden = !isOpen;
      
      const nameTd = document.createElement('td');
      nameTd.style.fontWeight = '500';
      nameTd.textContent = item.shortcut.label || 'Unnamed Shortcut';
      
      const selectorTd = document.createElement('td');
      const selectorSpan = document.createElement('span');
      selectorSpan.className = 'selector-code';
      selectorSpan.title = item.shortcut.selector;
      selectorSpan.textContent = item.shortcut.selector;
      selectorTd.appendChild(selectorSpan);
      
      const shortcutTd = document.createElement('td');
      const shortcutSpan = document.createElement('span');
      shortcutSpan.className = 'shortcut-badge';
      shortcutSpan.textContent = formatShortcut(item.shortcut.shortcut);
      shortcutTd.appendChild(shortcutSpan);
      
      const actionsTd = document.createElement('td');
      actionsTd.style.fontWeight = '500';
      
      const publishBtn = document.createElement('span');
      publishBtn.style.color = 'var(--success)';
      publishBtn.style.cursor = 'pointer';
      publishBtn.style.marginRight = '12px';
      publishBtn.textContent = 'Publish';
      publishBtn.onclick = () => publishShortcut(item.domain, item.shortcut);
      
      const editBtn = document.createElement('span');
      editBtn.style.color = 'var(--accent)';
      editBtn.style.cursor = 'pointer';
      editBtn.style.marginRight = '12px';
      editBtn.textContent = 'Edit';
      editBtn.onclick = () => openModal(item.domain, item.shortcut);
      
      const delBtn = document.createElement('span');
      delBtn.style.color = 'var(--danger)';
      delBtn.style.cursor = 'pointer';
      delBtn.textContent = 'Delete';
      delBtn.onclick = () => deleteShortcut(item.domain, item.shortcut.id);
      
      actionsTd.appendChild(publishBtn);
      actionsTd.appendChild(editBtn);
      actionsTd.appendChild(delBtn);
      
      row.appendChild(nameTd);
      row.appendChild(selectorTd);
      row.appendChild(shortcutTd);
      row.appendChild(actionsTd);
      
      tableBody.appendChild(row);
    });
  }

  statsEl.textContent = `Showing ${filtered.length} of ${allShortcuts.length} shortcuts`;
}

async function loadCommunity() {
  const domain = openDomain || '';
  if (!domain) return;
  
  if (communityList) {
    communityList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--muted);">Loading packs...</div>';
  }
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/shortcuts?domain=${domain}&extensionId=${await getExtensionId()}`);
    if (response.ok) {
      const data = await response.json();
      communityPacks = data.packs || [];
      renderCommunity();
    }
  } catch (error) {
    console.error('Fetch community error:', error);
  }
}

function renderCommunity() {
  if (!communityList || !communityEmpty) return;

  getExtensionId().then(extensionId => {
    const query = communitySearch.value.toLowerCase();
    const filtered = communityPacks.filter(pack => 
    (pack.author?.name || 'Highkey User').toLowerCase().includes(query) ||
    pack.shortcuts.some((s: any) => 
      s.label.toLowerCase().includes(query) || 
      s.selector.toLowerCase().includes(query)
    )
  );
  
  communityList.innerHTML = '';
  if (filtered.length === 0) {
    communityEmpty.style.display = 'block';
    return;
  }
  
  communityEmpty.style.display = 'none';

  filtered.forEach(pack => {
    const card = document.createElement('div');
    card.style.cssText = `
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 20px;
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;
    
    // Build the shortcuts list HTML for this pack
    const listHtml = pack.shortcuts.map((s: any) => `
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; padding: 4px 0; border-bottom: 1px solid var(--border); margin-bottom: 4px;">
        <span style="font-weight: 500;">${escapeHtml(s.label)}</span>
        <span class="shortcut-badge">${escapeHtml(formatShortcut(s.shortcut))}</span>
      </div>
    `).join('');

    const avatarUrl = escapeHtml(pack.author?.picture || 'https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png');
    const authorName = escapeHtml(pack.author?.name || 'Highkey User');

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${avatarUrl}" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--border);" title="${authorName}" class="author-avatar-img">
          <div>
            <div style="font-weight: 600; font-size: 14px;">${authorName}</div>
            <div style="font-size: 11px; color: var(--muted);">${pack.shortcuts.length} shortcut${pack.shortcuts.length === 1 ? '' : 's'}</div>
          </div>
        </div>
        <div style="font-size: 12px; color: var(--muted); display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
          <span>↑ ${pack.upvotes || 0} upvotes</span>
          <span>↓ ${pack.downloads || 0} downloads</span>
        </div>
      </div>
      
      <div style="display: flex; flex-direction: column; gap: 4px; margin: 4px 0;">
        ${listHtml}
      </div>

      <div style="display: flex; gap: 8px; margin-top: 8px; justify-content: flex-end;">
        ${
          currentUser && pack.authorId === currentUser.id
            ? `<button class="btn-danger unpublish-btn" style="padding: 6px 12px; font-size: 12px; background: transparent; color: var(--danger); border: 1px solid var(--danger);">Unpublish</button>`
            : ''
        }
        ${
          pack.hasReported
            ? `<button class="btn-ghost report-btn active" disabled style="padding: 6px 12px; font-size: 12px;" title="Already Reported">Reported</button>`
            : `<button class="btn-ghost report-btn" style="padding: 6px 12px; font-size: 12px; color: var(--muted);">Report</button>`
        }
        ${
          pack.hasUpvoted
            ? `<button class="btn-ghost upvote-btn active" disabled style="padding: 6px 12px; font-size: 12px;" title="Already Upvoted">Upvoted</button>`
            : `<button class="btn-ghost upvote-btn" style="padding: 6px 12px; font-size: 12px;">Upvote Pack</button>`
        }
        <button class="btn-primary download-btn" style="padding: 6px 16px; font-size: 12px;">Download Pack</button>
      </div>
    `;
    
    card.querySelector('.upvote-btn')?.addEventListener('click', async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/shortcuts/${pack._id}/upvote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ extensionId })
        });
        if (response.ok) {
          const updated = await response.json();
          pack.upvotes = updated.upvotes;
          pack.hasUpvoted = true;
          renderCommunity();
        }
      } catch (e) {
        console.error(e);
      }
    });

    card.querySelector('.report-btn')?.addEventListener('click', async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/shortcuts/${pack._id}/report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ extensionId })
        });
        if (response.ok) {
          pack.hasReported = true;
          alert('Pack reported. Our team will review it.');
          renderCommunity();
        }
      } catch (e) {}
    });

    card.querySelector('.unpublish-btn')?.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to unpublish this pack? This action cannot be undone.')) return;
      if (!currentToken) return;
      try {
        const response = await fetch(`${BACKEND_URL}/api/shortcuts?domain=${pack.domain}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (response.ok) {
          alert('Pack successfully unpublished.');
          loadCommunity();
        } else {
          const err = await response.json();
          alert(`Failed to unpublish: ${err.error}`);
        }
      } catch (e) {}
    });

    card.querySelector('.download-btn')?.addEventListener('click', () => downloadPackage(pack));
    
    communityList.appendChild(card);
  });
  });
}

async function downloadPackage(pack: any) {
  const shortcuts = await getShortcuts();
  
  let addedCount = 0;
  for (const s of pack.shortcuts) {
    if (!shortcuts[pack.domain]) shortcuts[pack.domain] = [];
    
    // Check if already exists
    if (shortcuts[pack.domain].some((item: any) => item.id === s.id)) {
      continue;
    }
    
    const { authorId, upvotes, downloads, author, ...shortcutData } = s;
    shortcuts[pack.domain].push({
      ...shortcutData,
      domain: pack.domain
    });
    addedCount++;
  }
  if (addedCount > 0) {
    await saveShortcuts(shortcuts);
    try {
      const extensionId = await getExtensionId();
      await fetch(`${BACKEND_URL}/api/shortcuts/${pack._id}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extensionId })
      });
    } catch (err) {
      console.warn(err);
    }
    alert(`Successfully downloaded ${addedCount} shortcuts from "${pack.author?.name || 'Highkey User'}"!`);
    loadCommunity();
    loadDashboard();
  } else {
    alert('All shortcuts from this pack are already installed!');
  }
}

// Navigation handling
navShortcuts.onclick = (e) => {
  e.preventDefault();
  navShortcuts.classList.add('active');
  navCommunity.classList.remove('active');
  navDiscover.classList.remove('active');
  viewShortcuts.style.display = 'block';
  viewCommunity.style.display = 'none';
  viewDiscover.style.display = 'none';
};

navCommunity.onclick = (e) => {
  e.preventDefault();
  navCommunity.classList.add('active');
  navShortcuts.classList.remove('active');
  navDiscover.classList.remove('active');
  viewCommunity.style.display = 'block';
  viewShortcuts.style.display = 'none';
  viewDiscover.style.display = 'none';
  loadCommunity();
};

navDiscover.onclick = (e) => {
  e.preventDefault();
  navDiscover.classList.add('active');
  navShortcuts.classList.remove('active');
  navCommunity.classList.remove('active');
  viewDiscover.style.display = 'block';
  viewShortcuts.style.display = 'none';
  viewCommunity.style.display = 'none';
  loadDiscover();
};

let discoverPacks: any[] = [];

async function loadDiscover() {
  if (discoverList) {
    discoverList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--muted); grid-column: 1 / -1;">Loading popular packs...</div>';
  }
  try {
    const response = await fetch(`${BACKEND_URL}/api/shortcuts?extensionId=${await getExtensionId()}`); // No domain filter
    if (response.ok) {
      const data = await response.json();
      discoverPacks = data.packs || [];
      renderDiscover();
    }
  } catch (error) {
    console.error('Fetch discover error:', error);
  }
}

function renderDiscover() {
  if (!discoverList || !discoverEmpty) return;

  getExtensionId().then(extensionId => {
    const query = discoverSearch.value.toLowerCase();
    const filtered = discoverPacks.filter(pack => 
      (pack.name || '').toLowerCase().includes(query) ||
      (pack.domain || '').toLowerCase().includes(query) ||
      (pack.author?.name || 'Highkey User').toLowerCase().includes(query)
    );

    discoverList.innerHTML = '';
    if (filtered.length === 0) {
      discoverEmpty.style.display = 'block';
      return;
    }

    discoverEmpty.style.display = 'none';

    filtered.forEach(pack => {
      const card = document.createElement('div');
      card.style.cssText = `
        background: var(--surface);
        border: 1px solid var(--border);
        padding: 20px;
        border-radius: var(--radius-md);
        display: flex;
        flex-direction: column;
        gap: 12px;
      `;
      
      const avatarUrl = escapeHtml(pack.author?.picture || 'https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_512dp.png');
      const authorName = escapeHtml(pack.author?.name || 'Highkey User');

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <img src="${avatarUrl}" style="width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--border);" title="${authorName}" class="author-avatar-img">
            <div>
              <div style="font-weight: 600; font-size: 14px; max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(pack.name) || `${authorName}'s Pack`}">${escapeHtml(pack.name) || `${authorName}'s Pack`}</div>
              <div style="font-size: 11px; color: var(--muted);">By ${authorName}</div>
            </div>
          </div>
          <div style="font-size: 12px; color: var(--muted); display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
            <span style="background: var(--bg); padding: 2px 6px; border-radius: 4px; font-weight: 500; color: var(--fg); border: 1px solid var(--border); margin-bottom: 2px;">${escapeHtml(pack.domain)}</span>
            <span>↑ ${pack.upvotes || 0} upvotes</span>
            <span>↓ ${pack.downloads || 0} downloads</span>
          </div>
        </div>
        
        <div style="flex: 1;">
          <div style="font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.05em;">${pack.shortcuts.length} Shortcuts</div>
          ${pack.shortcuts.slice(0, 3).map((s: any) => `
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; padding: 4px 0; border-bottom: 1px solid var(--border); margin-bottom: 4px;">
              <span style="font-weight: 500; max-width: 120px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(s.label)}">${escapeHtml(s.label)}</span>
              <span class="shortcut-badge">${escapeHtml(formatShortcut(s.shortcut))}</span>
            </div>
          `).join('')}
          ${pack.shortcuts.length > 3 ? `<div style="font-size: 11px; color: var(--muted); text-align: center; margin-top: 8px;">+ ${pack.shortcuts.length - 3} more</div>` : ''}
        </div>

        <div style="display: flex; gap: 8px; margin-top: 4px;">
          <button class="upvote-btn btn-ghost" style="flex: 1; display: flex; justify-content: center; gap: 4px; align-items: center;" ${pack.hasUpvoted ? 'disabled' : ''}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="${pack.hasUpvoted ? 'fill: currentColor;' : ''}"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
            ${pack.hasUpvoted ? 'Upvoted' : 'Upvote'}
          </button>
          <button class="download-btn btn-primary" style="flex: 1; display: flex; justify-content: center; gap: 4px; align-items: center;" ${pack.hasDownloaded ? 'disabled' : ''}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Install
          </button>
        </div>
      `;

      card.querySelector('.upvote-btn')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget as HTMLButtonElement;
        btn.disabled = true;
        try {
          await fetch(`${BACKEND_URL}/api/shortcuts/${pack._id}/upvote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ extensionId })
          });
          btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="fill: currentColor;"><path d="M12 19V5M5 12l7-7 7 7"/></svg> Upvoted';
          loadDiscover(); // Refresh state
        } catch (err) {
          console.warn(err);
          btn.disabled = false;
        }
      });

      card.querySelector('.download-btn')?.addEventListener('click', () => downloadPackage(pack));
      
      discoverList.appendChild(card);
    });
  });
}

discoverSearch?.addEventListener('input', renderDiscover);

navCommunity.onclick = (e) => {
  e.preventDefault();
  navCommunity.classList.add('active');
  navShortcuts.classList.remove('active');
  viewShortcuts.style.display = 'none';
  viewCommunity.style.display = 'block';
  loadCommunity();
};

communitySearch.addEventListener('input', renderCommunity);

searchInput.addEventListener('input', renderTable);

function openModal(domain: string, item: any) {
  currentEditItem = item;
  currentEditDomain = domain;
  capturedShortcut = { ...item.shortcut };
  
  modalLabel.value = item.label || '';
  modalSelector.value = item.selector;
  modalCapture.textContent = formatShortcut(capturedShortcut);
  modalCapture.classList.remove('active');
  
  editModal.style.display = 'flex';
}

function closeModal() {
  editModal.style.display = 'none';
  currentEditItem = null;
  currentEditDomain = '';
  capturedShortcut = null;
}

modalCapture.onclick = () => {
  modalCapture.classList.add('active');
  modalCapture.textContent = 'Recording... Press keys';
  
  const handleCapture = (e: KeyboardEvent) => {
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
    e.preventDefault();
    e.stopPropagation();
    
    capturedShortcut = {
      key: e.key.toLowerCase(),
      ctrl: e.ctrlKey,
      shift: e.shiftKey,
      alt: e.altKey,
      meta: e.metaKey
    };
    
    modalCapture.textContent = formatShortcut(capturedShortcut);
    modalCapture.classList.remove('active');
    window.removeEventListener('keydown', handleCapture, true);
  };
  
  window.addEventListener('keydown', handleCapture, true);
};

modalSave.onclick = async () => {
  if (!currentEditItem) return;
  
  const updates = {
    label: modalLabel.value,
    selector: modalSelector.value,
    shortcut: capturedShortcut
  };
  
  await updateShortcut(currentEditDomain, currentEditItem.id, updates);
  closeModal();
};

modalCancel.onclick = closeModal;

// Close modal when clicking outside
window.onclick = (event) => {
  if (event.target === editModal) {
    closeModal();
  }
};

async function updateShortcut(domain: string, id: string, updates: any) {
  const shortcuts = await getShortcuts();
  if (shortcuts[domain]) {
    shortcuts[domain] = shortcuts[domain].map((s: any) => s.id === id ? { ...s, ...updates } : s);
    await saveShortcuts(shortcuts);
    loadDashboard();
  }
}

function formatShortcut(sc: any) {
  const parts = [];
  if (sc.meta) parts.push('⌘');
  if (sc.ctrl) parts.push('⌃');
  if (sc.alt) parts.push('⌥');
  if (sc.shift) parts.push('⇧');
  parts.push(sc.key.toUpperCase());
  return parts.join(' + ');
}

async function deleteShortcut(domain: string, id: string) {
  const shortcuts = await getShortcuts();
  if (shortcuts[domain]) {
    shortcuts[domain] = shortcuts[domain].filter((s: any) => s.id !== id);
    if (shortcuts[domain].length === 0) delete shortcuts[domain];
    await saveShortcuts(shortcuts);
    loadDashboard();
  }
}

async function publishShortcut(domain: string, shortcut: any) {
  if (!currentUser || !currentToken) {
    alert('Please sign in to publish shortcuts to the community.');
    return;
  }
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/shortcuts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ domain, shortcut })
    });
    
    if (response.ok) {
      alert(`Successfully published "${shortcut.label}" to the community!`);
    } else {
      const err = await response.json();
      alert(`Failed to publish: ${err.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Publish error:', error);
    alert('Failed to publish. Please try again.');
  }
}

async function handleSignIn(): Promise<boolean> {
  const token = await getAuthToken(true);
  if (token) {
    currentToken = token;
    const profile = await getUserProfile(token);
    if (profile) {
      currentUser = profile;
      updateUserUI();
      return true;
    }
  }
  return false;
}

async function handleSignOut() {
  if (currentToken) {
    await clearAuthToken(currentToken);
  }
  currentUser = null;
  currentToken = null;
  updateUserUI();
}

function updateUserUI() {
  if (currentUser) {
    signInBtn.style.display = 'none';
    userProfile.style.display = 'flex';
    userAvatar.src = currentUser.picture || '';
    userName.textContent = currentUser.name;
  } else {
    signInBtn.style.display = 'flex';
    userProfile.style.display = 'none';
  }
}

signInBtn.onclick = handleSignIn;
signOutLink.onclick = handleSignOut;

// Try silent sign-in on load
getAuthToken(false).then(async (token) => {
  if (token) {
    currentToken = token;
    const profile = await getUserProfile(token);
    if (profile) {
      currentUser = profile;
      updateUserUI();
    }
  }
});

document.getElementById('export-btn')?.addEventListener('click', async () => {
  const shortcuts = await getShortcuts();
  const blob = new Blob([JSON.stringify(shortcuts, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'highkey-shortcuts.json';
  a.click();
});

document.getElementById('import-btn')?.addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (re: any) => {
        try {
          const imported = JSON.parse(re.target.result);
          await saveShortcuts(imported);
          loadDashboard();
        } catch (err) {
          alert('Failed to import shortcuts. Invalid JSON.');
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
});

// Initialize sign up status on load
chrome.storage.sync.get('signedUp').then((data) => {
  isSignedUp = !!data.signedUp;
});

function openSubmitModal(domain: string, shortcuts: any[]) {
  submitDomain = domain;
  submitShortcuts = shortcuts;
  submitDomainDisplay.textContent = domain;
  submitModal.style.display = 'flex';

  if (!currentUser) {
    submitStepLogin.style.display = 'block';
    submitStepSignup.style.display = 'none';
    submitStepShare.style.display = 'none';
    submitModalShareBtn.disabled = true;
  } else if (!isSignedUp) {
    submitStepLogin.style.display = 'none';
    submitStepSignup.style.display = 'block';
    submitStepShare.style.display = 'none';
    submitSignupAvatar.src = currentUser.picture || '';
    submitSignupName.textContent = currentUser.name;
    submitSignupEmail.textContent = currentUser.email;
    submitModalShareBtn.disabled = true;
  } else {
    submitStepLogin.style.display = 'none';
    submitStepSignup.style.display = 'none';
    submitStepShare.style.display = 'block';
    submitDomainDisplay.textContent = submitDomain;

    const packNameInput = document.getElementById('submit-pack-name') as HTMLInputElement;
    if (packNameInput) {
      packNameInput.value = `${submitDomain} Shortcuts`;
    }
    submitModalShareBtn.disabled = false;

    // Populate shortcuts list checkboxes
    submitShortcutsList.innerHTML = '';
    shortcuts.forEach((sc, i) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '8px';
      row.style.padding = '6px';
      row.style.borderRadius = '4px';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `checkbox-publish-${i}`;
      checkbox.checked = true;
      checkbox.dataset.index = i.toString();
      checkbox.style.cursor = 'pointer';

      const label = document.createElement('label');
      label.htmlFor = `checkbox-publish-${i}`;
      label.style.cursor = 'pointer';
      label.style.fontSize = '12px';
      label.style.flex = '1';
      label.style.display = 'flex';
      label.style.justifyContent = 'space-between';
      label.style.alignItems = 'center';

      const shortcutName = document.createElement('span');
      shortcutName.textContent = sc.label || 'Unnamed Shortcut';
      shortcutName.style.fontWeight = '550';

      const shortcutBadge = document.createElement('span');
      shortcutBadge.className = 'shortcut-badge';
      shortcutBadge.textContent = formatShortcut(sc.shortcut);

      label.appendChild(shortcutName);
      label.appendChild(shortcutBadge);
      row.appendChild(checkbox);
      row.appendChild(label);
      submitShortcutsList.appendChild(row);
    });
  }
}

submitModalShareBtn.onclick = async () => {
  const checkboxes = submitShortcutsList.querySelectorAll('input[type="checkbox"]:checked');
  if (checkboxes.length === 0) {
    alert('Please select at least one shortcut to publish.');
    return;
  }

  const selectedShortcuts = [];
  for (let i = 0; i < checkboxes.length; i++) {
    const cb = checkboxes[i] as HTMLInputElement;
    const index = parseInt(cb.dataset.index || '0');
    selectedShortcuts.push(submitShortcuts[index]);
  }

  const packNameInput = document.getElementById('submit-pack-name') as HTMLInputElement;
  const packName = packNameInput ? packNameInput.value.trim() : '';

  try {
    const response = await fetch(`${BACKEND_URL}/api/shortcuts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ domain: submitDomain, name: packName, shortcuts: selectedShortcuts })
    });
    
    submitModalShareBtn.disabled = false;
    submitModalShareBtn.textContent = 'Share to Library';

    if (response.ok) {
      alert(`Successfully published pack to the library!`);
      submitModal.style.display = 'none';
      loadCommunity();
    } else {
      const err = await response.json();
      alert(`Failed to publish: ${err.error || 'Unknown error'}`);
    }
  } catch (e) {
    console.error(e);
    submitModalShareBtn.disabled = false;
    submitModalShareBtn.textContent = 'Share to Library';
    alert('Failed to publish. Please try again.');
  }
};

submitModalCancel.onclick = () => {
  submitModal.style.display = 'none';
};

submitGmailLoginBtn.onclick = async () => {
  const success = await handleSignIn();
  if (success) {
    openSubmitModal(submitDomain, submitShortcuts);
  } else {
    alert('Failed to sign in. Please try again.');
  }
};

submitSignupConfirmBtn.onclick = async () => {
  await chrome.storage.sync.set({ signedUp: true });
  isSignedUp = true;
  openSubmitModal(submitDomain, submitShortcuts);
};

loadDashboard();

// Handle auto-submit parameter if page is loaded with ?submit=domain
const urlParams = new URLSearchParams(window.location.search);
const submitDomainParam = urlParams.get('submit');
if (submitDomainParam) {
  // Remove the query parameter from the URL so it doesn't trigger again on reload
  const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
  window.history.replaceState({ path: newUrl }, '', newUrl);

  getShortcuts().then((shortcuts) => {
    const domainShortcuts = shortcuts[submitDomainParam] || [];
    if (domainShortcuts.length > 0) {
      openSubmitModal(submitDomainParam, domainShortcuts);
    }
  });
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.shortcuts && editModal.style.display !== 'flex') loadDashboard();
});
