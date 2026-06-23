import { VisualSelector } from './selector';
import { ShortcutEngine } from './engine';

console.log('Highkey content script loaded');

const selector = new VisualSelector();
const engine = new ShortcutEngine();

// Start the execution engine immediately
engine.start();

// Check for community shortcuts
function checkCommunityShortcuts() {
  const domain = window.location.hostname;
  chrome.runtime.sendMessage({ action: 'check-shortcuts', domain }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('Highkey: Could not fetch community shortcuts', chrome.runtime.lastError);
      return;
    }
    if (response && response.count > 0) {
      showCommunityNotification(response.count);
    }
  });
}

function showCommunityNotification(count: number) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: oklch(20% 0 0);
    color: white;
    padding: 12px 18px;
    border-radius: 8px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    z-index: 2147483647;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
    transform: translateY(100px);
  `;
  
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
    <span>${count} community shortcuts available!</span>
  `;
  
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.style.transform = 'translateY(0)';
  }, 100);
  
  // Animate out after 5s
  setTimeout(() => {
    toast.style.transform = 'translateY(100px)';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
  
  toast.onclick = () => {
    chrome.runtime.sendMessage({ action: 'open-dashboard' });
  };
}

checkCommunityShortcuts();

let activePreviewBadges: HTMLElement[] = [];
let activePreviewBanner: HTMLElement | null = null;
let activePreviewHighlightedElements: { element: HTMLElement; originalOutline: string; originalOutlineOffset: string }[] = [];

function querySelectorAllDeep(selector: string, root: Document | ShadowRoot = document): Element[] {
  const elements = Array.from(root.querySelectorAll(selector));
  const children = Array.from(root.querySelectorAll('*'));
  for (const child of children) {
    if (child.shadowRoot) {
      elements.push(...querySelectorAllDeep(selector, child.shadowRoot));
    }
  }
  return elements;
}

function showPackagePreview(shortcuts: any[]) {
  clearPackagePreview();

  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #040406;
    color: #fff;
    border: 1.5px solid #00D778;
    padding: 10px 20px;
    border-radius: 20px;
    font-size: 13px;
    font-family: system-ui, -apple-system, sans-serif;
    font-weight: 600;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    z-index: 2147483647;
    display: flex;
    align-items: center;
    gap: 12px;
  `;
  banner.innerHTML = `
    <span style="display: inline-block; width: 8px; height: 8px; background: #00D778; border-radius: 50%; animation: pulse 1s infinite;"></span>
    <span>Previewing Shortcuts Pack...</span>
    <button style="border: 0; background: #222; color: #fff; border-radius: 10px; padding: 2px 8px; cursor: pointer; font-size: 11px; font-weight: bold; margin-left: 8px;">Dismiss</button>
  `;
  
  // Simple pulse animation style injection
  if (!document.getElementById('highkey-preview-pulse')) {
    const style = document.createElement('style');
    style.id = 'highkey-preview-pulse';
    style.textContent = `
      @keyframes pulse {
        0% { opacity: 0.4; }
        50% { opacity: 1; }
        100% { opacity: 0.4; }
      }
    `;
    document.head.appendChild(style);
  }

  banner.querySelector('button')?.addEventListener('click', clearPackagePreview);
  document.body.appendChild(banner);
  activePreviewBanner = banner;

  shortcuts.forEach(s => {
    const elements = querySelectorAllDeep(s.selector);
    const visibleElement = elements.find(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }) || elements[0];

    if (visibleElement && visibleElement instanceof HTMLElement) {
      const rect = visibleElement.getBoundingClientRect();
      
      // Save style and highlight the element with a subtle border outline
      activePreviewHighlightedElements.push({
        element: visibleElement,
        originalOutline: visibleElement.style.outline,
        originalOutlineOffset: visibleElement.style.outlineOffset
      });
      visibleElement.style.outline = '2px solid #00D778';
      visibleElement.style.outlineOffset = '-2px';

      const badge = document.createElement('div');
      const comboText = formatKeyParts(s.shortcut).join(' + ');

      badge.style.cssText = `
        position: absolute;
        z-index: 2147483646;
        background: #00D778;
        color: #040406;
        font-family: monospace;
        font-size: 11px;
        font-weight: 800;
        padding: 3px 6px;
        border-radius: 4px;
        border: 1.5px solid #040406;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        pointer-events: none;
        white-space: nowrap;
        visibility: hidden; /* Hide initially to measure dimensions */
      `;
      badge.textContent = comboText;
      document.body.appendChild(badge);

      // Measure the badge size
      const badgeRect = badge.getBoundingClientRect();
      const badgeW = badgeRect.width || 50;
      const badgeH = badgeRect.height || 20;

      // Determine location
      let top = 0;
      let left = 0;

      // Check if element is big enough to handle the badge inside
      const fitsInside = rect.width >= (badgeW + 8) && rect.height >= (badgeH + 8);

      if (fitsInside) {
        // Show inside the element at the top-left corner
        top = rect.top + window.scrollY + 4;
        left = rect.left + window.scrollX + 4;
      } else {
        // Show outside: above if there's enough space, otherwise below
        if (rect.top > badgeH + 6) {
          top = rect.top + window.scrollY - badgeH - 4;
        } else {
          top = rect.bottom + window.scrollY + 4;
        }
        left = rect.left + window.scrollX;
      }

      // Check client left / screen bounds to prevent going off-screen right or left
      const maxLeft = window.innerWidth - badgeW - 12;
      left = Math.min(left, maxLeft + window.scrollX);
      left = Math.max(12 + window.scrollX, left);

      badge.style.top = `${top}px`;
      badge.style.left = `${left}px`;
      badge.style.visibility = 'visible';

      activePreviewBadges.push(badge);
    }
  });

  // Auto clear after 8 seconds
  setTimeout(clearPackagePreview, 8000);
}

function clearPackagePreview() {
  activePreviewBadges.forEach(b => b.remove());
  activePreviewBadges = [];

  activePreviewHighlightedElements.forEach(item => {
    item.element.style.outline = item.originalOutline;
    item.element.style.outlineOffset = item.originalOutlineOffset;
  });
  activePreviewHighlightedElements = [];

  if (activePreviewBanner) {
    activePreviewBanner.remove();
    activePreviewBanner = null;
  }
}

function formatKeyParts(sc: any): string[] {
  const parts = [];
  if (sc.meta) parts.push('⌘');
  if (sc.ctrl) parts.push('⌃');
  if (sc.alt) parts.push('⌥');
  if (sc.shift) parts.push('⇧');
  parts.push(sc.key.toUpperCase());
  return parts;
}

chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
  console.log('Highkey: Received message:', request.action, request);
  
  if (request.action === 'toggle-binder') {
    console.log('Highkey: Toggling Binder UI...');
    selector.activate();
  }
  if (request.action === 'remap-shortcut') {
    console.log('Highkey: Remapping shortcut:', request.id);
    selector.activate(request.id);
  }
  if (request.action === 'preview-package') {
    console.log('Highkey: Previewing package...');
    showPackagePreview(request.shortcuts);
  }
});
