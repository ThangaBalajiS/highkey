import { getAuthToken, getUserProfile, clearAuthToken } from '../shared/auth';
import { User, CommunityShortcut } from '@highkey/types';

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
let communityShortcuts: CommunityShortcut[] = [];

let isSignedUp = false;
let submitDomain = '';
let submitShortcuts: any[] = [];

const BACKEND_URL = 'http://localhost:4000';

async function loadDashboard() {
  const data = await chrome.storage.sync.get('shortcuts');
  const shortcutsMap: Record<string, any> = data.shortcuts || {};
  
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
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/shortcuts?domain=${domain}`);
    if (response.ok) {
      communityShortcuts = await response.json();
      renderCommunity();
    }
  } catch (error) {
    console.error('Fetch community error:', error);
  }
}

function renderCommunity() {
  if (!communityList || !communityEmpty) return;
  
  const query = communitySearch.value.toLowerCase();
  const filtered = communityShortcuts.filter(s => 
    s.label.toLowerCase().includes(query) || 
    s.selector.toLowerCase().includes(query)
  );
  
  communityList.innerHTML = '';
  if (filtered.length === 0) {
    communityEmpty.style.display = 'block';
    return;
  }
  
  communityEmpty.style.display = 'none';
  filtered.forEach(s => {
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
    
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="font-weight: 600; font-size: 15px;">${s.label}</div>
        <div class="shortcut-badge">${formatShortcut(s.shortcut)}</div>
      </div>
      <div class="selector-code" style="max-width: 100%;" title="${s.selector}">${s.selector}</div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
        <div style="font-size: 12px; color: var(--muted); display: flex; gap: 12px;">
          <span>↑ ${s.upvotes} upvotes</span>
          <span>↓ ${s.downloads} downloads</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-ghost upvote-btn" data-id="${s.id}" style="padding: 4px 8px; font-size: 12px;">Upvote</button>
          <button class="btn-primary download-btn" data-id="${s.id}" style="padding: 4px 12px; font-size: 12px;">Download</button>
        </div>
      </div>
    `;
    
    card.querySelector('.upvote-btn')?.addEventListener('click', () => upvoteShortcut(s.id));
    card.querySelector('.download-btn')?.addEventListener('click', () => downloadShortcut(s));
    
    communityList.appendChild(card);
  });
}

async function upvoteShortcut(id: string) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/shortcuts/${id}/upvote`, { method: 'POST' });
    if (response.ok) {
      loadCommunity();
    }
  } catch (error) {
    console.error('Upvote error:', error);
  }
}

async function downloadShortcut(s: CommunityShortcut) {
  const data = await chrome.storage.sync.get('shortcuts');
  const shortcuts: Record<string, any> = data.shortcuts || {};
  if (!shortcuts[s.domain]) shortcuts[s.domain] = [];
  
  // Check if already exists
  if (shortcuts[s.domain].some((item: any) => item.id === s.id)) {
    alert('You already have this shortcut!');
    return;
  }
  
  const { authorId, upvotes, downloads, ...shortcutData } = s;
  shortcuts[s.domain].push(shortcutData);
  await chrome.storage.sync.set({ shortcuts });
  
  // Track download
  fetch(`${BACKEND_URL}/api/shortcuts/${s.id}/download`, { method: 'POST' }).catch(console.error);
  
  alert(`Successfully downloaded "${s.label}"!`);
  loadDashboard();
}

// Navigation handling
navShortcuts.onclick = (e) => {
  e.preventDefault();
  navShortcuts.classList.add('active');
  navCommunity.classList.remove('active');
  viewShortcuts.style.display = 'block';
  viewCommunity.style.display = 'none';
};

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
  const data = await chrome.storage.sync.get('shortcuts');
  const shortcuts: Record<string, any> = data.shortcuts || {};
  if (shortcuts[domain]) {
    shortcuts[domain] = shortcuts[domain].map((s: any) => s.id === id ? { ...s, ...updates } : s);
    await chrome.storage.sync.set({ shortcuts });
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
  const data = await chrome.storage.sync.get('shortcuts');
  const shortcuts: Record<string, any> = data.shortcuts || {};
  if (shortcuts[domain]) {
    shortcuts[domain] = shortcuts[domain].filter((s: any) => s.id !== id);
    if (shortcuts[domain].length === 0) delete shortcuts[domain];
    await chrome.storage.sync.set({ shortcuts });
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
    alert('Failed to publish. Is the backend server running?');
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
  const data = await chrome.storage.sync.get('shortcuts');
  const blob = new Blob([JSON.stringify(data.shortcuts || {}, null, 2)], { type: 'application/json' });
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
          await chrome.storage.sync.set({ shortcuts: imported });
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
      shortcutBadge.textContent = formatShortcut(sc);

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

  submitModalShareBtn.disabled = true;
  submitModalShareBtn.textContent = 'Publishing...';

  let successCount = 0;
  for (let i = 0; i < checkboxes.length; i++) {
    const cb = checkboxes[i] as HTMLInputElement;
    const index = parseInt(cb.dataset.index || '0');
    const shortcut = submitShortcuts[index];
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/shortcuts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({ domain: submitDomain, shortcut })
      });
      if (response.ok) {
        successCount++;
      }
    } catch (e) {
      console.error(e);
    }
  }

  submitModalShareBtn.disabled = false;
  submitModalShareBtn.textContent = 'Share to Library';

  if (successCount > 0) {
    alert(`Successfully published ${successCount} shortcut(s) to the library!`);
    submitModal.style.display = 'none';
  } else {
    alert('Failed to publish shortcuts. Please try again.');
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
  chrome.storage.sync.get('shortcuts').then((data) => {
    const shortcuts = (data.shortcuts || {}) as Record<string, any>;
    const domainShortcuts = shortcuts[submitDomainParam] || [];
    if (domainShortcuts.length > 0) {
      openSubmitModal(submitDomainParam, domainShortcuts);
    }
  });
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.shortcuts && editModal.style.display !== 'flex') loadDashboard();
});
