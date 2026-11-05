import type { KeyCombo, Shortcut, ShortcutMap } from '../types';

const tableBody = document.getElementById('shortcut-table-body');
const statsEl = document.getElementById('shortcut-stats');
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const editModal = document.getElementById('edit-modal') as HTMLElement;
const modalLabel = document.getElementById('modal-label') as HTMLInputElement;
const modalSelector = document.getElementById('modal-selector') as HTMLInputElement;
const modalCapture = document.getElementById('modal-capture') as HTMLElement;
const modalSave = document.getElementById('modal-save') as HTMLButtonElement;
const modalCancel = document.getElementById('modal-cancel') as HTMLButtonElement;

let currentEditItem: Shortcut | null = null;
let currentEditDomain: string = '';
let capturedShortcut: KeyCombo | null = null;
let allShortcuts: { domain: string, shortcut: Shortcut }[] = [];
let openDomain: string | null = null;

async function loadDashboard() {
  const data = await chrome.storage.local.get('shortcuts');
  const shortcutsMap = (data.shortcuts || {}) as ShortcutMap;
  
  allShortcuts = [];
  for (const [domain, list] of Object.entries(shortcutsMap)) {
    list.forEach(s => {
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

    const count = document.createElement('span');
    count.className = 'domain-count';
    count.textContent = `${items.length} shortcut${items.length === 1 ? '' : 's'}`;

    title.appendChild(chevron);
    title.appendChild(name);
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

searchInput.addEventListener('input', renderTable);

function openModal(domain: string, item: Shortcut) {
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
  if (!currentEditItem || !capturedShortcut) return;
  
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

async function updateShortcut(domain: string, id: string, updates: Partial<Shortcut>) {
  const data = await chrome.storage.local.get('shortcuts');
  const shortcuts = (data.shortcuts || {}) as ShortcutMap;
  if (shortcuts[domain]) {
    shortcuts[domain] = shortcuts[domain].map(s => s.id === id ? { ...s, ...updates } : s);
    await chrome.storage.local.set({ shortcuts });
    loadDashboard();
  }
}

function formatShortcut(sc: KeyCombo) {
  const parts = [];
  if (sc.meta) parts.push('⌘');
  if (sc.ctrl) parts.push('⌃');
  if (sc.alt) parts.push('⌥');
  if (sc.shift) parts.push('⇧');
  parts.push(sc.key.toUpperCase());
  return parts.join(' + ');
}

async function deleteShortcut(domain: string, id: string) {
  const data = await chrome.storage.local.get('shortcuts');
  const shortcuts = (data.shortcuts || {}) as ShortcutMap;
  if (shortcuts[domain]) {
    shortcuts[domain] = shortcuts[domain].filter(s => s.id !== id);
    if (shortcuts[domain].length === 0) delete shortcuts[domain];
    await chrome.storage.local.set({ shortcuts });
    loadDashboard();
  }
}

document.getElementById('export-btn')?.addEventListener('click', async () => {
  const data = await chrome.storage.local.get('shortcuts');
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
          await chrome.storage.local.set({ shortcuts: imported });
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

loadDashboard();
chrome.storage.onChanged.addListener((changes) => {
  if (changes.shortcuts && editModal.style.display !== 'flex') loadDashboard();
});
