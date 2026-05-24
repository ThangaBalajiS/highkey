export class VisualSelector {
  private root: HTMLElement;
  private shadow: ShadowRoot;
  private highlighter: HTMLElement;
  private prompt: HTMLElement;
  private isActive: boolean = false;
  private isCapturing: boolean = false;
  private lastElement: HTMLElement | null = null;
  private currentSelector: string | null = null;
  private remappingId: string | null = null;

  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'highkey-selector-root';
    this.shadow = this.root.attachShadow({ mode: 'closed' });

    this.highlighter = document.createElement('div');
    this.highlighter.id = 'highlighter';
    
    this.prompt = document.createElement('div');
    this.prompt.id = 'prompt';
    this.prompt.innerHTML = `
      <div class="prompt-content">
        <p>Target selected!</p>
        <p class="instruction">Press the key you want to bind...</p>
        <div class="selector-display"></div>
        <div class="scope-options">
          <label>
            <input type="checkbox" id="scope-toggle" checked>
            Apply to entire site
          </label>
        </div>
        <div class="button-group">
          <button id="cancel-btn">Cancel</button>
        </div>
      </div>
    `;

    this.setupStyles();
    this.shadow.appendChild(this.highlighter);
    this.shadow.appendChild(this.prompt);

    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    
    this.shadow.querySelector('#cancel-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deactivate();
    });
  }

  private setupStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #highlighter {
        position: fixed;
        pointer-events: none;
        background: rgba(0, 120, 215, 0.2);
        border: 2px solid rgb(0, 120, 215);
        border-radius: 4px;
        z-index: 2147483647;
        transition: all 0.1s ease-out;
        display: none;
      }

      #prompt {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #1e1e1e;
        color: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        z-index: 2147483647;
        display: none;
        font-family: system-ui, -apple-system, sans-serif;
        text-align: center;
        min-width: 280px;
        border: 1px solid #333;
      }

      .prompt-content p { margin: 0 0 10px 0; }
      .instruction { font-size: 0.9em; color: #aaa; }
      .selector-display { 
        font-family: monospace; 
        font-size: 0.8em; 
        background: #000; 
        padding: 8px; 
        border-radius: 6px; 
        margin-bottom: 15px;
        word-break: break-all;
        color: #00d778;
        border: 1px solid #222;
      }

      .scope-options {
        margin-bottom: 15px;
        font-size: 0.9em;
        color: #ccc;
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .scope-options label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
      }

      .button-group {
        display: flex;
        justify-content: center;
        gap: 10px;
      }
      
      button {
        background: #333;
        color: white;
        border: 1px solid #444;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9em;
      }
      button:hover { background: #444; }
    `;
    this.shadow.appendChild(style);
  }

  public activate(remappingId: string | null = null) {
    if (this.isActive) return;
    this.isActive = true;
    this.isCapturing = false;
    this.remappingId = remappingId;
    
    document.documentElement.appendChild(this.root);
    document.addEventListener('mousemove', this.handleMouseMove, true);
    document.addEventListener('click', this.handleClick, true);
    console.log('Highkey Selector Activated');
  }

  public deactivate() {
    this.isActive = false;
    this.isCapturing = false;
    this.remappingId = null;
    if (document.documentElement.contains(this.root)) {
      document.documentElement.removeChild(this.root);
    }
    document.removeEventListener('mousemove', this.handleMouseMove, true);
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('keydown', this.handleKeyDown, true);
    this.highlighter.style.display = 'none';
    this.prompt.style.display = 'none';
    this.lastElement = null;
    this.currentSelector = null;
  }

  private handleMouseMove(e: MouseEvent) {
    if (this.isCapturing) return;
    const target = e.target as HTMLElement;
    if (target === this.lastElement) return;
    this.lastElement = target;

    if (target) {
      const rect = target.getBoundingClientRect();
      this.highlighter.style.width = `${rect.width}px`;
      this.highlighter.style.height = `${rect.height}px`;
      this.highlighter.style.top = `${rect.top}px`;
      this.highlighter.style.left = `${rect.left}px`;
      this.highlighter.style.display = 'block';
    }
  }

  private handleClick(e: MouseEvent) {
    if (this.isCapturing) return;
    e.preventDefault();
    e.stopPropagation();

    const target = e.target as HTMLElement;
    if (target) {
      this.currentSelector = this.generateResilientSelector(target);
      this.startCapturing();
    }
  }

  private startCapturing() {
    this.isCapturing = true;
    this.highlighter.style.background = 'rgba(0, 215, 120, 0.2)';
    this.highlighter.style.borderColor = 'rgb(0, 215, 120)';
    
    const display = this.shadow.querySelector('.selector-display');
    if (display) display.textContent = this.currentSelector;
    
    const instruction = this.shadow.querySelector('.instruction');
    if (this.remappingId) {
      if (instruction) instruction.textContent = 'Remapping... Press any key to confirm';
    } else {
      if (instruction) instruction.textContent = 'Press the key you want to bind...';
    }

    this.prompt.style.display = 'block';
    document.addEventListener('keydown', this.handleKeyDown, true);
  }

  private async handleKeyDown(e: KeyboardEvent) {
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

    e.preventDefault();
    e.stopPropagation();

    const scopeToggle = this.shadow.querySelector('#scope-toggle') as HTMLInputElement;
    const scope = scopeToggle?.checked ? 'domain' : 'path';

    let shortcut = null;
    if (this.remappingId) {
      const data = await chrome.storage.local.get('shortcuts');
      const domainShortcuts = data.shortcuts[window.location.hostname] || [];
      const original = domainShortcuts.find((s: any) => s.id === this.remappingId);
      shortcut = original?.shortcut;
    }

    if (!shortcut) {
      shortcut = {
        key: e.key.toLowerCase(),
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey
      };
    }

    if (this.currentSelector) {
      await this.saveShortcut(shortcut, this.currentSelector, scope);
      this.deactivate();
    }
  }

  private generalizePath(path: string): string {
    return path.split('/').map(segment => {
      if (/[0-9]/.test(segment) && (segment.length > 4 || /^[0-9a-fA-F-]+$/.test(segment))) {
        return '*';
      }
      return segment;
    }).join('/');
  }

  private async saveShortcut(shortcut: any, selector: string, scope: 'domain' | 'path') {
    const domain = window.location.hostname;
    let path = window.location.pathname;
    
    if (scope === 'path') {
      path = this.generalizePath(path);
    }

    const innerText = this.lastElement?.innerText?.trim() || '';
    const label = innerText.slice(0, 50) || 
                  this.lastElement?.getAttribute('aria-label') || 
                  'Unnamed Shortcut';

    const data = await chrome.storage.local.get('shortcuts') || {};
    const shortcuts = data.shortcuts || {};
    
    if (!shortcuts[domain]) shortcuts[domain] = [];
    
    const entry = {
      shortcut,
      selector,
      innerText,
      label,
      scope,
      path: scope === 'path' ? path : null,
      id: this.remappingId || crypto.randomUUID(),
      createdAt: Date.now()
    };

    if (this.remappingId) {
      shortcuts[domain] = shortcuts[domain].map((s: any) => s.id === this.remappingId ? entry : s);
    } else {
      shortcuts[domain].push(entry);
    }

    await chrome.storage.local.set({ shortcuts });
  }

  private generateResilientSelector(el: HTMLElement): string {
    const tag = el.tagName.toLowerCase();

    // 1. Stable Identity Attributes (gh, aria-label, etc.)
    const identityAttrs = ['gh', 'aria-label', 'data-testid', 'name', 'placeholder', 'title'];
    for (const attr of identityAttrs) {
      const val = el.getAttribute(attr);
      if (val) {
        const attrSelector = `${tag}[${attr}="${CSS.escape(val)}"]`;
        if (this.isUnique(attrSelector, el)) return attrSelector;
      }
    }

    // 2. Stable ID
    if (el.id && !this.isAutoGenerated(el.id)) {
      const idSelector = `#${CSS.escape(el.id)}`;
      if (this.isUnique(idSelector, el)) return idSelector;
    }

    // 3. Semantic Role (Very stable in Gmail)
    const role = el.getAttribute('role');
    if (role) {
      const roleSelector = `${tag}[role="${CSS.escape(role)}"]`;
      if (this.isUnique(roleSelector, el)) return roleSelector;
    }

    // 4. Unique Combination of Classes
    const classes = Array.from(el.classList).filter(c => !this.isTailwindOrHashed(c));
    if (classes.length > 0) {
      const classSelector = `${tag}.${classes.map(c => CSS.escape(c)).join('.')}`;
      if (this.isUnique(classSelector, el)) return classSelector;
    }

    // 5. Ancestor Anchoring
    let parent = el.parentElement;
    let depth = 0;
    while (parent && parent.tagName !== 'BODY' && depth < 3) {
      for (const attr of ['gh', 'aria-label', 'data-testid', 'role']) {
        const pVal = parent.getAttribute(attr);
        if (pVal) {
          const anchoredSelector = `[${attr}="${CSS.escape(pVal)}"] ${tag}`;
          if (this.isUnique(anchoredSelector, el)) return anchoredSelector;
        }
      }
      parent = parent.parentElement;
      depth++;
    }

    // 6. Absolute Fallback: Return tag and rely on Text Filtering in the Engine
    return tag;
  }

  private isTailwindOrHashed(c: string): boolean {
    return /^(p|m|w|h|bg|text|flex|grid|border|rounded|opacity|z|top|left|right|bottom|items|justify)-/.test(c) || 
           /[0-9]{4,}/.test(c);
  }

  private isUnique(selector: string, targetEl?: HTMLElement): boolean {
    try {
      const matches = this.findAllDeep(selector);
      console.log(`[Highkey] Uniqueness check for "${selector}": found ${matches.length} matches.`);
      
      if (matches.length === 1) {
        if (targetEl && matches[0] !== targetEl) return false;
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  private findAllDeep(selector: string): HTMLElement[] {
    const results: HTMLElement[] = [];
    const search = (root: Document | ShadowRoot) => {
      const matches = root.querySelectorAll(selector);
      results.push(...Array.from(matches) as HTMLElement[]);
      const all = root.querySelectorAll('*');
      for (const el of Array.from(all)) {
        if (el.shadowRoot) search(el.shadowRoot);
      }
    };
    search(document);
    return results;
  }

  private isAutoGenerated(id: string): boolean {
    const lowercaseId = id.toLowerCase();
    return (
      /[0-9]{5,}/.test(id) || 
      id.startsWith(':') || // Catch Gmail's dynamic IDs
      lowercaseId.includes('react-') || 
      lowercaseId.includes(':r') || 
      lowercaseId.includes('radix-') ||
      lowercaseId.includes('headlessui-')
    );
  }
}
