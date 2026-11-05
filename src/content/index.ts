import { VisualSelector } from './selector';
import { ShortcutEngine } from './engine';

console.log('Highkey content script loaded');

const selector = new VisualSelector();
const engine = new ShortcutEngine();

// Start the execution engine immediately
engine.start();

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log('Highkey: Received message:', request.action, request);
  
  if (request.action === 'toggle-binder') {
    console.log('Highkey: Toggling Binder UI...');
    selector.activate();
    // Tells the background this tab is reachable
    sendResponse({ ok: true });
  }
  if (request.action === 'remap-shortcut') {
    console.log('Highkey: Remapping shortcut:', request.id);
    selector.activate(request.id);
  }
  if (request.action === 'binder-claimed') {
    selector.yieldTo(request.frameId);
  }
  if (request.action === 'run-shortcut') {
    engine.runShortcut(request.combo);
  }
});
