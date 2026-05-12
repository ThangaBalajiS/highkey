import { VisualSelector } from './selector';
import { ShortcutEngine } from './engine';

console.log('Highkey content script loaded');

const selector = new VisualSelector();
const engine = new ShortcutEngine();

// Start the execution engine immediately
engine.start();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggle-binder') {
    console.log('Toggling Binder UI...');
    selector.activate();
  }
  if (request.action === 'remap-shortcut') {
    console.log('Remapping shortcut:', request.id);
    selector.activate(request.id);
  }
});
