const contentDiv = document.getElementById('dashboard-content');
const editModal = document.getElementById('edit-modal') as HTMLElement;
const modalLabel = document.getElementById('modal-label') as HTMLInputElement;
const modalSelector = document.getElementById('modal-selector') as HTMLInputElement;
const modalCapture = document.getElementById('modal-capture') as HTMLElement;
const modalSave = document.getElementById('modal-save') as HTMLButtonElement;
const modalCancel = document.getElementById('modal-cancel') as HTMLButtonElement;

let currentEditItem: any = null;
let currentEditDomain: string = '';
let capturedShortcut: any = null;

let expandedDomains: Set<string> = new Set();
let isFirstLoad = true;

async function loadDashboard() {
  const data = await chrome.storage.local.get('shortcuts');
  const shortcuts = data.shortcuts || {};
  
  if (Object.keys(shortcuts).length === 0) {
    if (contentDiv) contentDiv.innerHTML = '<div class="empty-state">No shortcuts found. Start binding!</div>';
    return;
  }

  if (contentDiv) {
    contentDiv.innerHTML = '';
    
    const domains = Object.keys(shortcuts);
    
    // On first load, expand the first domain automatically
    if (isFirstLoad && domains.length > 0) {
      expandedDomains.add(domains[0]);
      isFirstLoad = false;
    }

    for (const [domain, list] of Object.entries(shortcuts)) {
      const domainContainer = document.createElement('div');
      domainContainer.className = `domain-group ${expandedDomains.has(domain) ? 'open' : ''}`;
      
      const domainHeader = document.createElement('div');
      domainHeader.className = 'domain-header';
      domainHeader.textContent = domain;
      domainHeader.onclick = () => {
        if (expandedDomains.has(domain)) {
          expandedDomains.delete(domain);
          domainContainer.classList.remove('open');
        } else {
          expandedDomains.add(domain);
          domainContainer.classList.add('open');
        }
      };
      
      const domainBody = document.createElement('div');
      domainBody.className = 'domain-body';

      const items = (list as any[]).sort((a, b) => b.createdAt - a.createdAt);
      const globalItems = items.filter(i => i.scope === 'domain' || !i.scope);
      const routeItems = items.filter(i => i.scope === 'path');

      // 1. Render Global Section
      if (globalItems.length > 0) {
        const title = document.createElement('div');
        title.className = 'section-title';
        title.textContent = 'Global Shortcuts';
        domainBody.appendChild(title);
        globalItems.forEach(item => domainBody.appendChild(createShortcutRow(domain, item)));
      }

      // 2. Render Route Section
      if (routeItems.length > 0) {
        const title = document.createElement('div');
        title.className = 'section-title';
        title.textContent = 'Route Specific';
        domainBody.appendChild(title);

        const groupedByPath: Record<string, any[]> = {};
        routeItems.forEach(item => {
          if (!groupedByPath[item.path]) groupedByPath[item.path] = [];
          groupedByPath[item.path].push(item);
        });

        for (const [path, subItems] of Object.entries(groupedByPath)) {
          const routeGroup = document.createElement('div');
          routeGroup.className = 'route-group';
          const routeHeader = document.createElement('div');
          routeHeader.className = 'route-header';
          const pathSpan = document.createElement('span');
          pathSpan.className = 'route-path';
          pathSpan.textContent = path;
          
          const editBtn = document.createElement('button');
          editBtn.className = 'btn-sm edit-btn';
          editBtn.textContent = 'Edit Pattern';
          editBtn.onclick = (e) => {
            e.stopPropagation();
            enterPathEditMode(routeHeader, domain, path);
          };

          routeHeader.appendChild(pathSpan);
          routeHeader.appendChild(editBtn);
          routeGroup.appendChild(routeHeader);
          subItems.forEach(item => routeGroup.appendChild(createShortcutRow(domain, item)));
          domainBody.appendChild(routeGroup);
        }
      }

      domainContainer.appendChild(domainHeader);
      domainContainer.appendChild(domainBody);
      contentDiv.appendChild(domainContainer);
    }
  }
}

function createShortcutRow(domain: string, item: any) {
  const container = document.createElement('div');
  container.className = 'shortcut-item';
  
  const main = document.createElement('div');
  main.className = 'shortcut-main';
  
  const info = document.createElement('div');
  info.className = 'shortcut-info';
  
  const key = document.createElement('span');
  key.className = 'key-badge';
  key.textContent = formatShortcut(item.shortcut);
  
  const label = document.createElement('span');
  label.className = 'label-text';
  label.textContent = item.label || 'Unnamed Shortcut';

  info.appendChild(key);
  info.appendChild(label);
  
  const actions = document.createElement('div');
  actions.className = 'action-btns';
  
  const editBtn = document.createElement('button');
  editBtn.className = 'btn-sm edit-btn';
  editBtn.textContent = 'Edit';
  editBtn.onclick = () => openModal(domain, item);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-sm delete-btn';
  deleteBtn.textContent = 'Delete';
  deleteBtn.onclick = () => deleteShortcut(domain, item.id);

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);
  main.appendChild(info);
  main.appendChild(actions);
  container.appendChild(main);

  return container;
}

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
  const data = await chrome.storage.local.get('shortcuts');
  const shortcuts = data.shortcuts || {};
  if (shortcuts[domain]) {
    shortcuts[domain] = shortcuts[domain].map((s: any) => s.id === id ? { ...s, ...updates } : s);
    await chrome.storage.local.set({ shortcuts });
    loadDashboard();
  }
}

function enterPathEditMode(header: HTMLElement, domain: string, oldPath: string) {
  header.innerHTML = '';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'edit-path-input';
  input.value = oldPath;
  const btnGroup = document.createElement('div');
  btnGroup.className = 'action-btns';
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn-sm save-btn';
  saveBtn.textContent = 'Save';
  saveBtn.onclick = () => updatePathPattern(domain, oldPath, input.value);
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn-sm';
  cancelBtn.style.background = '#333';
  cancelBtn.style.color = '#fff';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = () => loadDashboard();
  btnGroup.appendChild(saveBtn);
  btnGroup.appendChild(cancelBtn);
  header.appendChild(input);
  header.appendChild(btnGroup);
  input.focus();
}

async function updatePathPattern(domain: string, oldPath: string, newPath: string) {
  const data = await chrome.storage.local.get('shortcuts');
  const shortcuts = data.shortcuts || {};
  if (shortcuts[domain]) {
    shortcuts[domain] = shortcuts[domain].map((s: any) => s.scope === 'path' && s.path === oldPath ? { ...s, path: newPath } : s);
    await chrome.storage.local.set({ shortcuts });
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
  const data = await chrome.storage.local.get('shortcuts');
  const shortcuts = data.shortcuts || {};
  if (shortcuts[domain]) {
    shortcuts[domain] = shortcuts[domain].filter((s: any) => s.id !== id);
    if (shortcuts[domain].length === 0) delete shortcuts[domain];
    await chrome.storage.local.set({ shortcuts });
    loadDashboard();
  }
}

loadDashboard();
chrome.storage.onChanged.addListener((changes) => {
  if (changes.shortcuts && editModal.style.display !== 'flex') loadDashboard();
});
