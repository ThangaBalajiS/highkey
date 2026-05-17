export class ShortcutEngine {
  private shortcuts: any[] = [];
  private currentPath: string = window.location.pathname;

  constructor() {
    this.loadShortcuts();
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.observeURLChanges();
    
    // Listen for storage changes to refresh shortcuts without page reload
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.shortcuts) {
        this.loadShortcuts();
      }
    });
  }

  private async loadShortcuts() {
    const domain = window.location.hostname;
    const data = await chrome.storage.local.get('shortcuts');
    const allShortcuts = data.shortcuts || {};
    this.shortcuts = allShortcuts[domain] || [];
    console.log(`Highkey: Loaded ${this.shortcuts.length} shortcuts for ${domain}`);
  }

  private observeURLChanges() {
    let lastPath = window.location.pathname;
    setInterval(() => {
      if (window.location.pathname !== lastPath) {
        lastPath = window.location.pathname;
        this.currentPath = lastPath;
        console.log(`Highkey: URL changed to ${lastPath}`);
      }
    }, 1000);

    window.addEventListener('popstate', () => {
      this.currentPath = window.location.pathname;
    });
  }

  public start() {
    document.addEventListener('keydown', this.handleKeyDown, true);
  }

  public stop() {
    document.removeEventListener('keydown', this.handleKeyDown, true);
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (this.isUserTyping(e)) return;

    const matchedShortcut = this.shortcuts.find(s => {
      const sc = s.shortcut;
      
      const keyMatch = (
        sc.key === e.key.toLowerCase() &&
        sc.ctrl === e.ctrlKey &&
        sc.shift === e.shiftKey &&
        sc.alt === e.altKey &&
        sc.meta === e.metaKey
      );

      if (!keyMatch) return false;

      if (s.scope === 'domain' || !s.scope) return true;
      return this.matchPath(s.path, this.currentPath);
    });

    if (matchedShortcut) {
      this.executeShortcut(matchedShortcut, e);
    }
  }

  private matchPath(pattern: string, currentPath: string): boolean {
    if (!pattern) return false;
    const regexSource = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '[^/]+');
    const regex = new RegExp(`^${regexSource}$`);
    return regex.test(currentPath);
  }

  private isUserTyping(e: KeyboardEvent): boolean {
    const target = e.target as HTMLElement;
    const isEditable = target.isContentEditable || 
                     ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
    const hasModifier = e.ctrlKey || e.altKey || e.metaKey;
    return isEditable && !hasModifier;
  }

  private async executeShortcut(shortcut: any, e: KeyboardEvent) {
    const element = await this.findWithRetry(shortcut);
    
    if (element) {
      console.log(`Highkey: Executing shortcut for label: ${shortcut.label}`);
      e.preventDefault();
      e.stopPropagation();
      this.provideFeedback(element);
      this.simulateFullClick(element);
    } else {
      console.warn(`Highkey: Element not found: ${shortcut.label}`);
    }
  }

  private async findWithRetry(shortcut: any, retries = 5, interval = 100): Promise<HTMLElement | null> {
    for (let i = 0; i < retries; i++) {
      const el = this.deepQuerySelector(shortcut);
      if (el && (el.offsetWidth > 0 || el.offsetHeight > 0)) {
        return el;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    return null;
  }

  private deepQuerySelector(shortcut: any): HTMLElement | null {
    const { selector, innerText } = shortcut;
    
    // 1. Gather all candidates across entire page (including Shadow DOM)
    const allMatching = this.findAllDeep(selector);
    
    if (allMatching.length === 0) return null;

    // 2. Exact match check: Does any candidate match both selector AND text perfectly?
    if (innerText && innerText.trim()) {
      const targetText = innerText.trim().toLowerCase();
      
      const bestMatch = allMatching.find(el => el.innerText?.trim().toLowerCase() === targetText);
      if (bestMatch) return bestMatch;
      
      const partialMatch = allMatching.find(el => el.innerText?.trim().toLowerCase().includes(targetText));
      if (partialMatch) return partialMatch;
      
      // If we have text but NONE of the candidates match that text, 
      // we DON'T just click the first one (that causes mis-clicks like hitting the logo).
      console.warn(`Highkey: Found ${allMatching.length} elements for "${selector}", but none match the text "${targetText}".`);
      return null;
    }

    // 3. If no text filter, and it's truly unique, return it.
    if (allMatching.length === 1) return allMatching[0];

    // 4. Fallback: Return the first visible one ONLY if we have no better options
    return allMatching.find(el => el.offsetWidth > 0 || el.offsetHeight > 0) || null;
  }

  private findAllDeep(selector: string, root: Document | ShadowRoot = document): HTMLElement[] {
    let elements = Array.from(root.querySelectorAll(selector)) as HTMLElement[];
    
    // Recurse into all shadow roots
    const all = root.querySelectorAll('*');
    for (const el of Array.from(all)) {
      if (el.shadowRoot) {
        elements = [...elements, ...this.findAllDeep(selector, el.shadowRoot)];
      }
    }
    
    return elements;
  }

  private async simulateFullClick(el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const deepTarget = (document.elementFromPoint(centerX, centerY) as HTMLElement) || el;

    const eventOptions: any = {
      bubbles: true,
      cancelable: true,
      view: window,
      detail: 1,
      clientX: centerX,
      clientY: centerY,
      button: 0,
      buttons: 1,
      which: 1,
      composed: true,
      ctrlKey: false, altKey: false, shiftKey: false, metaKey: false
    };

    // Store state before attempt
    const initialUrl = window.location.href;

    deepTarget.focus();
    
    // Attempt 1: Manual Sequence (Best for SPAs)
    if (window.PointerEvent) {
      deepTarget.dispatchEvent(new PointerEvent('pointerdown', { ...eventOptions, pointerId: 1, pointerType: 'mouse' }));
    }
    deepTarget.dispatchEvent(new MouseEvent('mousedown', eventOptions));
    
    const releaseOptions = { ...eventOptions, buttons: 0 };
    if (window.PointerEvent) {
      deepTarget.dispatchEvent(new PointerEvent('pointerup', { ...releaseOptions, pointerId: 1, pointerType: 'mouse' }));
    }
    deepTarget.dispatchEvent(new MouseEvent('mouseup', releaseOptions));
    
    const clickEvent = new MouseEvent('click', releaseOptions);
    const wasPrevented = !deepTarget.dispatchEvent(clickEvent);

    // Smart Check: Did Attempt 1 work?
    // 1. Was it explicitly prevented by a router?
    // 2. Did the URL change immediately?
    if (wasPrevented || window.location.href !== initialUrl) {
      console.log('Highkey: Click handled by manual sequence.');
      return;
    }

    // Attempt 2: Fallback to native .click()
    // We wrap this in a tiny timeout to let Attempt 1's handlers finish processing
    setTimeout(() => {
      if (window.location.href === initialUrl && typeof deepTarget.click === 'function') {
        console.log('Highkey: Manual sequence ignored, falling back to native .click()');
        deepTarget.click();
      }
    }, 10);
  }

  private provideFeedback(el: HTMLElement) {
    const originalTransition = el.style.transition;
    const originalOutline = el.style.outline;
    el.style.transition = 'outline 0.1s ease-in-out';
    el.style.outline = '4px solid rgba(0, 215, 120, 0.6)';
    setTimeout(() => {
      el.style.outline = originalOutline;
      setTimeout(() => { el.style.transition = originalTransition; }, 100);
    }, 200);
  }
}
