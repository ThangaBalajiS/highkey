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
        <div class="prompt-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3z"></path><path d="M6 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3z"></path></svg>
          Target selected!
        </div>
        <p class="instruction">Press the key you want to bind...</p>
        <div class="selector-display"></div>
        <div class="scope-options">
          <label class="checkbox-container">
            <input type="checkbox" id="scope-toggle" checked>
            <span class="checkmark"></span>
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
      :host {
        --bg: oklch(100% 0 0);
        --surface: oklch(98% 0 0);
        --fg: oklch(20% 0 0);
        --muted: oklch(50% 0 0);
        --border: oklch(90% 0 0);
        --accent: oklch(60% 0.15 250);
        --radius-md: 12px;
        --radius-sm: 6px;
        --font-mono: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      }

      #highlighter {
        position: fixed;
        pointer-events: none;
        background: oklch(60% 0.15 250 / 0.1);
        border: 2px solid var(--accent);
        border-radius: 4px;
        z-index: 2147483647;
        transition: all 0.15s cubic-bezier(0.2, 0.8, 0.2, 1);
        display: none;
      }

      #prompt {
        position: fixed;
        top: 32px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--bg);
        color: var(--fg);
        padding: 24px;
        border-radius: var(--radius-md);
        box-shadow: 0 20px 50px oklch(0% 0 0 / 0.15);
        z-index: 2147483647;
        display: none;
        pointer-events: auto;
        font-family: system-ui, -apple-system, sans-serif;
        text-align: center;
        width: 320px;
        border: 1px solid var(--border);
        box-sizing: border-box;
      }

      .prompt-header {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-weight: 700;
        font-size: 16px;
        color: var(--fg);
        margin-bottom: 8px;
      }
      
      .prompt-header svg {
        color: var(--accent);
      }

      .instruction { 
        font-size: 13px; 
        color: var(--muted); 
        margin: 0 0 20px 0;
      }

      .selector-display { 
        font-family: var(--font-mono); 
        font-size: 11px; 
        background: var(--surface); 
        padding: 10px; 
        border-radius: var(--radius-sm); 
        margin-bottom: 20px;
        word-break: break-all;
        color: var(--muted);
        border: 1px solid var(--border);
        text-align: left;
      }

      .scope-options {
        margin-bottom: 24px;
        display: flex;
        justify-content: center;
      }

      .checkbox-container {
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        font-size: 13px;
        color: var(--fg);
        font-weight: 500;
        user-select: none;
      }

      .checkbox-container input {
        display: none;
      }

      .checkmark {
        width: 18px;
        height: 18px;
        background-color: var(--surface);
        border: 1px solid var(--border);
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .checkbox-container:hover .checkmark {
        border-color: var(--accent);
      }

      .checkbox-container input:checked + .checkmark {
        background-color: var(--accent);
        border-color: var(--accent);
      }

      .checkmark:after {
        content: "";
        display: none;
        width: 5px;
        height: 9px;
        border: solid white;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
        margin-bottom: 2px;
      }

      .checkbox-container input:checked + .checkmark:after {
        display: block;
      }

      .button-group {
        display: flex;
        justify-content: center;
      }
      
      button {
        background: none;
        color: var(--muted);
        border: 1px solid var(--border);
        padding: 10px 20px;
        border-radius: var(--radius-sm);
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.2s;
        width: 100%;
      }
      
      button:hover { 
        background: var(--surface);
        color: var(--fg);
        border-color: var(--muted);
      }
    `;
    this.shadow.appendChild(style);
  }

  public activate(remappingId: string | null = null) {
    if (this.isActive) {
      console.log('Highkey: Selector already active');
      return;
    }
    
    this.isActive = true;
    this.isCapturing = false;
    this.remappingId = remappingId;
    
    // Ensure root has basic styles to not interfere with the page
    this.root.style.position = 'fixed';
    this.root.style.top = '0';
    this.root.style.left = '0';
    this.root.style.width = '100%';
    this.root.style.height = '100%';
    this.root.style.pointerEvents = 'none';
    this.root.style.zIndex = '2147483647';
    this.root.style.display = 'block';

    const target = document.body || document.documentElement;
    target.appendChild(this.root);
    
    document.addEventListener('mousemove', this.handleMouseMove, true);
    document.addEventListener('click', this.handleClick, true);
    
    console.log('Highkey: Selector Activated', { remappingId });
  }

  public deactivate() {
    console.log('Highkey: Deactivating Selector');
    this.isActive = false;
    this.isCapturing = false;
    this.remappingId = null;
    if (this.root.parentElement) {
      this.root.parentElement.removeChild(this.root);
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
    if (this.isCapturing || !this.isActive) return;
    const target = e.target as HTMLElement;
    if (!target || target === this.lastElement) return;
    
    // Don't highlight our own UI
    if (this.root.contains(target)) return;

    this.lastElement = target;
    const rect = target.getBoundingClientRect();
    
    this.highlighter.style.width = `${rect.width}px`;
    this.highlighter.style.height = `${rect.height}px`;
    this.highlighter.style.top = `${rect.top}px`;
    this.highlighter.style.left = `${rect.left}px`;
    this.highlighter.style.display = 'block';
  }

  private async handleClick(e: MouseEvent) {
    if (this.isCapturing || !this.isActive) return;
    
    // Don't intercept clicks on our own UI (like the cancel button)
    const path = e.composedPath();
    if (path.includes(this.root)) return;

    e.preventDefault();
    e.stopPropagation();

    const target = e.target as HTMLElement;
    if (target) {
      console.log('Highkey: Element selected', target);
      this.lastElement = target;
      
      // Optimization: Discover all shadow roots once before starting selector generation
      this.refreshShadowRoots();
      
      this.currentSelector = this.generateResilientSelector(target);
      console.log('Highkey: Generated selector:', this.currentSelector);
      
      if (this.remappingId) {
        const data = await chrome.storage.sync.get('shortcuts');
        const shortcuts: any = data.shortcuts || {};
        const domainShortcuts = shortcuts[window.location.hostname] || [];
        const original = domainShortcuts.find((s: any) => s.id === this.remappingId);
        
        if (original) {
          await this.saveShortcut(original.shortcut, this.currentSelector, original.scope || 'domain');
          this.deactivate();
          return;
        }
      }
      
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
      const data = await chrome.storage.sync.get('shortcuts');
      const shortcuts: any = data.shortcuts || {};
      const domainShortcuts = shortcuts[window.location.hostname] || [];
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

    const data = await chrome.storage.sync.get('shortcuts');
    const shortcuts: any = data.shortcuts || {};

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

    await chrome.storage.sync.set({ shortcuts });
    }

  private generateResilientSelector(el: HTMLElement): string {
    const tag = el.tagName.toLowerCase();

    // 1. Stable Identity Attributes
    const identityAttrs = ['gh', 'aria-label', 'data-testid', 'name', 'placeholder', 'title', 'alt'];
    for (const attr of identityAttrs) {
      const val = el.getAttribute(attr);
      if (val) {
        const attrSelector = `${tag}[${attr}="${CSS.escape(val)}"]`;
        if (this.isUnique(attrSelector, el)) return attrSelector;
      }
    }

    if (tag === 'a') {
      for (const hrefSelector of this.getStableHrefSelectors(el)) {
        if (this.isUnique(hrefSelector, el)) return hrefSelector;
      }
    }

    // 2. Stable ID
    if (el.id && !this.isAutoGenerated(el.id)) {
      const idSelector = `#${CSS.escape(el.id)}`;
      if (this.isUnique(idSelector, el)) return idSelector;
    }

    // 3. Unique Combination of Classes
    const classes = Array.from(el.classList).filter(c => !this.isTailwindOrHashed(c));
    if (classes.length > 0) {
      // Try each class individually first
      for (const c of classes) {
        const classSelector = `${tag}.${CSS.escape(c)}`;
        if (this.isUnique(classSelector, el)) return classSelector;
      }
      // Try combination
      const combinedSelector = `${tag}.${classes.map(c => CSS.escape(c)).join('.')}`;
      if (this.isUnique(combinedSelector, el)) return combinedSelector;
    }

    // 4. Semantic Role
    const role = el.getAttribute('role');
    if (role) {
      const roleSelector = `${tag}[role="${CSS.escape(role)}"]`;
      if (this.isUnique(roleSelector, el)) return roleSelector;
    }

    // 5. Ancestor Anchoring (Enhanced)
    let parent = el.parentElement;
    let depth = 0;
    while (parent && parent.tagName !== 'BODY' && depth < 5) {
      const parentSelector = this.getSimplifiedSelector(parent);
      if (parentSelector && parentSelector !== parent.tagName.toLowerCase()) {
        const anchoredSelector = `${parentSelector} ${tag}`;
        if (this.isUnique(anchoredSelector, el)) return anchoredSelector;
        
        // Try direct child
        const directSelector = `${parentSelector} > ${tag}`;
        if (this.isUnique(directSelector, el)) return directSelector;
      }
      parent = parent.parentElement;
      depth++;
    }

    // 6. Nth-of-type fallback
    const nthSelector = this.getNthOfTypeSelector(el);
    if (nthSelector && this.isUnique(nthSelector, el)) return nthSelector;

    // 7. Structural fallback. Never return just "div", "a", etc. after the
    // uniqueness checks above failed; those broad selectors cause mis-clicks.
    return this.buildStructuralSelector(el);
  }

  private getSimplifiedSelector(el: HTMLElement): string | null {
    if (el.id && !this.isAutoGenerated(el.id)) return `#${CSS.escape(el.id)}`;
    
    const tag = el.tagName.toLowerCase();
    const importantAttrs = ['data-testid', 'aria-label', 'gh', 'role'];
    for (const attr of importantAttrs) {
      const val = el.getAttribute(attr);
      if (val) return `${tag}[${attr}="${CSS.escape(val)}"]`;
    }

    const classes = Array.from(el.classList).filter(c => !this.isTailwindOrHashed(c));
    if (classes.length > 0) return `${tag}.${CSS.escape(classes[0])}`;

    return null;
  }

  private getStableHrefSelectors(el: HTMLElement): string[] {
    const href = el.getAttribute('href');
    if (!href) return [];

    let url: URL;
    try {
      url = new URL(href, window.location.href);
    } catch {
      return [];
    }

    const segments = url.pathname.split('/').filter(Boolean);
    const stableTail = [...segments].reverse().find(segment => !this.isDynamicPathSegment(segment));
    if (!stableTail) return [];

    const suffix = `/${stableTail}`;
    const selectors = [
      `a[href$="${CSS.escape(suffix)}"]`,
      `a[href$="${CSS.escape(`${suffix}/`)}"]`
    ];

    if (url.search) {
      selectors.push(`a[href*="${CSS.escape(`${suffix}?`)}"]`);
    }

    return selectors;
  }

  private isDynamicPathSegment(segment: string): boolean {
    const decoded = decodeURIComponent(segment);
    return (
      /^[0-9]+$/.test(decoded) ||
      /^[0-9a-f]{8,}$/i.test(decoded) ||
      /^[0-9a-f-]{12,}$/i.test(decoded) ||
      /[0-9]/.test(decoded) && decoded.length > 8 ||
      decoded.includes(':')
    );
  }

  private getNthOfTypeSelector(el: HTMLElement): string | null {
    const tag = el.tagName.toLowerCase();
    const parent = el.parentElement;
    if (!parent) return null;

    const siblings = Array.from(parent.children).filter(s => s.tagName === el.tagName);
    if (siblings.length <= 1) return null;

    const index = siblings.indexOf(el) + 1;
    return `${tag}:nth-of-type(${index})`;
  }

  private buildStructuralSelector(el: HTMLElement): string {
    const parts: string[] = [];
    let current: HTMLElement | null = el;

    while (current && current.tagName !== 'HTML') {
      const segment = this.getStructuralSegment(current);
      parts.unshift(segment);

      const candidate = parts.join(' > ');
      if (this.isUnique(candidate, el)) return candidate;

      current = current.parentElement;
    }

    return parts.join(' > ');
  }

  private getStructuralSegment(el: HTMLElement): string {
    const tag = el.tagName.toLowerCase();
    const parent = el.parentElement;
    if (!parent) return tag;

    const sameTagSiblings = Array.from(parent.children).filter(
      sibling => sibling.tagName === el.tagName
    );

    if (sameTagSiblings.length === 1) return tag;

    return `${tag}:nth-of-type(${sameTagSiblings.indexOf(el) + 1})`;
  }

  private isTailwindOrHashed(c: string): boolean {
    return /^(p|m|w|h|bg|text|flex|grid|border|rounded|opacity|z|top|left|right|bottom|items|justify|overflow|pointer|cursor|select|animate)-/.test(c) || 
           /[0-9]{4,}/.test(c);
  }

  private cachedShadowRoots: (Document | ShadowRoot)[] = [document];

  private refreshShadowRoots() {
    this.cachedShadowRoots = [document];
    const queue: (Document | ShadowRoot)[] = [document];
    const visited = new Set<Node>();

    while (queue.length > 0) {
      const root = queue.shift()!;
      if (visited.has(root)) continue;
      visited.add(root);

      try {
        const all = root.querySelectorAll('*');
        for (const el of Array.from(all)) {
          if (el.shadowRoot) {
            this.cachedShadowRoots.push(el.shadowRoot);
            queue.push(el.shadowRoot);
          }
        }
      } catch (e) {
        // Ignore restricted shadow roots
      }
    }
  }

  private isUnique(selector: string, targetEl?: HTMLElement): boolean {
    try {
      const matches = this.findAllDeep(selector);
      console.log(`[Highkey] Uniqueness check for "${selector}": found ${matches.length} matches.`);
      if (matches.length === 1) {
        const isTarget = !targetEl || matches[0] === targetEl;
        if (!isTarget) {
          console.warn(`[Highkey] Selector "${selector}" matched one element, but not the clicked target.`);
        }
        return isTarget;
      }
      return false;
    } catch {
      return false;
    }
  }

  private findAllDeep(selector: string): HTMLElement[] {
    const results: HTMLElement[] = [];
    for (const root of this.cachedShadowRoots) {
      try {
        const matches = root.querySelectorAll(selector);
        results.push(...Array.from(matches) as HTMLElement[]);
      } catch (e) {
        // Ignore invalid selectors
      }
    }
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
