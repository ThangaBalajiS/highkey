import { VisualSelector } from './selector';
import { ShortcutEngine } from './engine';

console.log('Highkey content script loaded');

const selector = new VisualSelector();
const engine = new ShortcutEngine();

// Start the execution engine immediately
engine.start();

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
});
