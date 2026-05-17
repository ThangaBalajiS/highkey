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

    // Level 1: Tag Name only
    if (this.isUnique(tag, el)) return tag;

    // Level 2: Semantic Attributes (id, aria-label, test-id, name)
    if (el.id && !this.isAutoGenerated(el.id)) {
      const idSelector = `#${CSS.escape(el.id)}`;
      if (this.isUnique(idSelector, el)) return idSelector;
    }

    const stableAttrs = ['data-testid', 'data-cy', 'aria-label', 'name', 'placeholder', 'type'];
    for (const attr of stableAttrs) {
      const val = el.getAttribute(attr);
      if (val) {
        const attrSelector = `${tag}[${attr}="${CSS.escape(val)}"]`;
        if (this.isUnique(attrSelector, el)) return attrSelector;
      }
    }

    // Level 3: Unique Class
    const classes = Array.from(el.classList).filter(c => !this.isTailwindOrHashed(c));
    for (const cls of classes) {
      const classSelector = `${tag}.${CSS.escape(cls)}`;
      if (this.isUnique(classSelector, el)) return classSelector;
    }

    // Level 4: Parent Anchoring (Single step)
    let parent = el.parentElement;
    while (parent && parent.tagName !== 'BODY') {
      // Try parent ID
      if (parent.id && !this.isAutoGenerated(parent.id)) {
        const anchoredSelector = `#${CSS.escape(parent.id)} ${tag}`;
        if (this.isUnique(anchoredSelector, el)) return anchoredSelector;
      }
      
      // Try parent semantic attr
      for (const attr of stableAttrs) {
        const val = parent.getAttribute(attr);
        if (val) {
          const anchoredSelector = `${parent.tagName.toLowerCase()}[${attr}="${CSS.escape(val)}"] ${tag}`;
          if (this.isUnique(anchoredSelector, el)) return anchoredSelector;
        }
      }

      parent = parent.parentElement;
    }

    // Level 5: Best Attempt (Smallest attribute or just tag)
    const firstAttr = stableAttrs.find(a => el.getAttribute(a));
    if (firstAttr) {
      const candidate = `${tag}[${firstAttr}="${CSS.escape(el.getAttribute(firstAttr)!)}"]`;
      if (this.isUnique(candidate, el)) return candidate;
    }

    // Final fallback: build an anchored structural selector instead of returning
    // a broad tag (e.g. "a") that can match hundreds of elements.
    return this.buildStructuralSelector(el);
  }

  private buildStructuralSelector(el: HTMLElement): string {
    const parts: string[] = [];
    let current: HTMLElement | null = el;
    let depth = 0;

    while (current && current.tagName !== 'HTML' && depth < 8) {
      const tag = current.tagName.toLowerCase();
      const siblings = current.parentElement
        ? Array.from(current.parentElement.children).filter(
            (child) => (child as HTMLElement).tagName === current!.tagName
          )
        : [current];

      const index = siblings.indexOf(current) + 1;
      const segment = siblings.length > 1 ? `${tag}:nth-of-type(${index})` : tag;
      parts.unshift(segment);

      const candidate = parts.join(' > ');
      if (this.isUnique(candidate, el)) return candidate;

      current = current.parentElement;
      depth++;
    }

    // Last resort keeps deterministic behavior without returning just "a".
    return parts.join(' > ') || el.tagName.toLowerCase();
  }

  private isTailwindOrHashed(c: string): boolean {
    return /^(p|m|w|h|bg|text|flex|grid|border|rounded|opacity|z|top|left|right|bottom|items|justify)-/.test(c) || 
           /[0-9]{4,}/.test(c);
  }

  private isUnique(selector: string, targetEl?: HTMLElement): boolean {
    try {
      const matches = this.findAllDeep(selector);
      
      console.log(`[Highkey] Uniqueness check for "${selector}": found ${matches.length} matches.`);
      
      // If we only found 1, is it the one the user actually clicked?
      if (matches.length === 1) {
        if (targetEl && matches[0] !== targetEl) {
          console.warn(`[Highkey] Collision! Found 1 match for "${selector}" but it's not the target element.`);
          return false;
        }
        return true;
      }
      
      return false;
    } catch (e) {
      console.error(`[Highkey] Error during uniqueness check:`, e);
      return false;
    }
  }

  private findAllDeep(selector: string): HTMLElement[] {
    const results: HTMLElement[] = [];
    
    const search = (root: Document | ShadowRoot) => {
      // 1. Find all in current root
      const matches = root.querySelectorAll(selector);
      results.push(...Array.from(matches) as HTMLElement[]);
      
      // 2. Find all shadow hosts in current root and recurse
      const all = root.querySelectorAll('*');
      for (const el of Array.from(all)) {
        if (el.shadowRoot) {
          search(el.shadowRoot);
        }
      }
    };

    search(document);
    return results;
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
}
