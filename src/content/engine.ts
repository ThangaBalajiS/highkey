import type { Keybinding, Shortcut } from '../types';
import { getShortcuts } from '../shared/storage';
import { broadcastToTab, getSiteDomain, ownsShortcut } from './frame';

export class ShortcutEngine {
  private shortcuts: Shortcut[] = [];

  constructor() {
    this.loadShortcuts();
    this.handleKeyDown = this.handleKeyDown.bind(this);
    
    // Listen for storage changes to refresh shortcuts without page reload
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.shortcuts) {
        this.loadShortcuts();
      }
    });
  }

  private async loadShortcuts() {
    const domain = getSiteDomain();
    const allShortcuts = await getShortcuts();
    this.shortcuts = allShortcuts[domain] || [];
    console.log(`Highkey: Loaded ${this.shortcuts.length} shortcuts for ${domain}`);
  }

  public start() {
    document.addEventListener('keydown', this.handleKeyDown, true);
  }

  public stop() {
    document.removeEventListener('keydown', this.handleKeyDown, true);
  }

  public runShortcut(combo: Keybinding) {
    const shortcut = this.findLocalShortcut(combo);
    if (shortcut) this.executeShortcut(shortcut);
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (!e.key || this.isUserTyping(e)) return;

    const combo: Keybinding = {
      key: e.key.toLowerCase(),
      ctrl: e.ctrlKey,
      shift: e.shiftKey,
      alt: e.altKey,
      meta: e.metaKey
    };

    const shortcut = this.findLocalShortcut(combo);
    const inThisFrame = shortcut && this.deepQuerySelector(shortcut);
    const inOtherFrame = !inThisFrame && this.shortcuts.some(s => !ownsShortcut(s) && this.matchesCombo(s, combo));
    if (!inThisFrame && !inOtherFrame) return;

    // Has to happen before any await, or the page has already seen the key
    e.preventDefault();
    e.stopPropagation();
    if (e.repeat) return;

    if (inThisFrame) {
      this.executeShortcut(shortcut);
    } else {
      broadcastToTab({ action: 'run-shortcut', combo });
    }
  }

  private findLocalShortcut(combo: Keybinding): Shortcut | undefined {
    return this.shortcuts.find(s => {
      if (!ownsShortcut(s) || !this.matchesCombo(s, combo)) return false;

      if (s.scope === 'domain' || !s.scope) return true;
      return this.matchPath(s.path, window.location.pathname);
    });
  }

  private matchesCombo(s: Shortcut, combo: Keybinding): boolean {
    const sc = s.shortcut;
    return (
      sc.key === combo.key &&
      sc.ctrl === combo.ctrl &&
      sc.shift === combo.shift &&
      sc.alt === combo.alt &&
      sc.meta === combo.meta
    );
  }

  private matchPath(pattern: string | null | undefined, currentPath: string): boolean {
    if (!pattern) return false;
    const regexSource = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '[^/]+');
    const regex = new RegExp(`^${regexSource}$`);
    return regex.test(currentPath);
  }

  private isUserTyping(e: KeyboardEvent): boolean {
    // e.target stops at the shadow host when the listener is on document
    const target = e.composedPath()[0] as HTMLElement;
    const isEditable = target.isContentEditable || 
                     ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
    const hasModifier = e.ctrlKey || e.altKey || e.metaKey;
    return isEditable && !hasModifier;
  }

  private async executeShortcut(shortcut: Shortcut) {
    const element = await this.findWithRetry(shortcut);
    
    if (element) {
      console.log(`Highkey: Executing shortcut for label: ${shortcut.label}`);
      this.provideFeedback(element);
      this.simulateFullClick(element);
    } else {
      console.warn(`Highkey: Element not found: ${shortcut.label}`);
    }
  }

  private async findWithRetry(shortcut: Shortcut, retries = 5, interval = 100): Promise<HTMLElement | null> {
    for (let i = 0; i < retries; i++) {
      const el = this.deepQuerySelector(shortcut);
      if (el && (el.offsetWidth > 0 || el.offsetHeight > 0)) {
        return el;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    return null;
  }

  private deepQuerySelector(shortcut: Shortcut): HTMLElement | null {
    const { selector, innerText } = shortcut;
    
    // 1. Gather all candidates across entire page (including Shadow DOM)
    const allMatching = this.findAllDeep(selector);
    
    if (allMatching.length === 0) return null;

    // 2. If innerText is provided, filter by it
    if (innerText && innerText.trim()) {
      const targetText = innerText.trim().toLowerCase();
      
      // Filter for exact text match first
      const exactMatches = allMatching.filter(el => el.innerText?.trim().toLowerCase() === targetText);
      if (exactMatches.length > 0) {
        return exactMatches.find(el => el.offsetWidth > 0 || el.offsetHeight > 0) || exactMatches[0];
      }
      
      // Then partial text match
      const partialMatches = allMatching.filter(el => el.innerText?.trim().toLowerCase().includes(targetText));
      if (partialMatches.length > 0) {
        return partialMatches.find(el => el.offsetWidth > 0 || el.offsetHeight > 0) || partialMatches[0];
      }
      
      console.warn(`Highkey: Found ${allMatching.length} elements for "${selector}", but none match text "${targetText}".`);
      return null;
    }

    // 3. If no text filter, return the first visible match or just the first match
    if (allMatching.length === 1) return allMatching[0];
    return allMatching.find(el => el.offsetWidth > 0 || el.offsetHeight > 0) || allMatching[0];
  }

  private findAllDeep(selector: string): HTMLElement[] {
    const results: HTMLElement[] = [];
    const roots: (Document | ShadowRoot)[] = [document];
    const visited = new Set<Node>();

    while (roots.length > 0) {
      const root = roots.shift()!;
      if (visited.has(root)) continue;
      visited.add(root);

      try {
        const matches = root.querySelectorAll(selector);
        results.push(...Array.from(matches) as HTMLElement[]);
        
        const all = root.querySelectorAll('*');
        for (const el of Array.from(all)) {
          if (el.shadowRoot) {
            roots.push(el.shadowRoot);
          }
        }
      } catch (e) {
        // Ignore invalid selectors
      }
    }
    
    return results;
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

    deepTarget.focus();

    // Manual Sequence (Best for SPAs)
    if (window.PointerEvent) {
      deepTarget.dispatchEvent(new PointerEvent('pointerdown', { ...eventOptions, pointerId: 1, pointerType: 'mouse' }));
    }
    deepTarget.dispatchEvent(new MouseEvent('mousedown', eventOptions));
    
    const releaseOptions = { ...eventOptions, buttons: 0 };
    if (window.PointerEvent) {
      deepTarget.dispatchEvent(new PointerEvent('pointerup', { ...releaseOptions, pointerId: 1, pointerType: 'mouse' }));
    }
    deepTarget.dispatchEvent(new MouseEvent('mouseup', releaseOptions));
    
    // Also runs default actions, so a second .click() would just click twice
    deepTarget.dispatchEvent(new MouseEvent('click', releaseOptions));
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
