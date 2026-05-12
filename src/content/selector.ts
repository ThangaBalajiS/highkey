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

    const label = this.lastElement?.innerText?.trim().slice(0, 50) || 
                  this.lastElement?.getAttribute('aria-label') || 
                  this.lastElement?.getAttribute('title') || 
                  'Unnamed Shortcut';

    const data = await chrome.storage.local.get('shortcuts') || {};
    const shortcuts = data.shortcuts || {};
    
    if (!shortcuts[domain]) shortcuts[domain] = [];
    
    if (this.remappingId) {
      shortcuts[domain] = shortcuts[domain].map((s: any) => 
        s.id === this.remappingId ? { ...s, selector, label, scope, path } : s
      );
    } else {
      shortcuts[domain].push({
        shortcut,
        selector,
        label,
        scope,
        path: scope === 'path' ? path : null,
        id: crypto.randomUUID(),
        createdAt: Date.now()
      });
    }

    await chrome.storage.local.set({ shortcuts });
  }

  private generateResilientSelector(el: HTMLElement): string {
    const testAttrs = ['data-testid', 'data-cy', 'data-qa'];
    for (const attr of testAttrs) {
      const val = el.getAttribute(attr);
      if (val) {
        const selector = `[${attr}="${CSS.escape(val)}"]`;
        if (this.isUnique(selector)) return selector;
      }
    }

    if (el.id && !this.isAutoGenerated(el.id)) {
      const selector = `#${CSS.escape(el.id)}`;
      if (this.isUnique(selector)) return selector;
    }

    const semanticAttrs = ['aria-label', 'role', 'name', 'type', 'placeholder'];
    const tag = el.tagName.toLowerCase();
    
    for (const attr of semanticAttrs) {
      const val = el.getAttribute(attr);
      if (val) {
        const selector = `${tag}[${attr}="${CSS.escape(val)}"]`;
        if (this.isUnique(selector)) return selector;
      }
    }

    return this.getPath(el);
  }

  private isUnique(selector: string): boolean {
    try {
      return document.querySelectorAll(selector).length === 1;
    } catch (e) {
      return false;
    }
  }

  private isAutoGenerated(id: string): boolean {
    const lowercaseId = id.toLowerCase();
    return (
      /[0-9]{5,}/.test(id) || 
      lowercaseId.includes('react-') || 
      lowercaseId.includes(':r') || 
      lowercaseId.includes('radix-') ||
      lowercaseId.includes('headlessui-')
    );
  }

  private getPath(el: HTMLElement): string {
    const path: string[] = [];
    let current: HTMLElement | null = el;

    while (current && current.tagName !== 'BODY') {
      let selector = current.tagName.toLowerCase();
      if (current.id && !this.isAutoGenerated(current.id)) {
        path.unshift(`#${current.id}`);
        break;
      }
      const siblings = Array.from(current.parentElement?.children || []);
      const sameTagSiblings = siblings.filter(s => s.tagName === current?.tagName);
      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
      path.unshift(selector);
      current = current.parentElement;
    }
    return path.join(' > ');
  }
}
