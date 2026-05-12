import { VisualSelector } from "/src/content/selector.ts.js";
import { ShortcutEngine } from "/src/content/engine.ts.js";
console.log("Highkey content script loaded");
const selector = new VisualSelector();
const engine = new ShortcutEngine();
// Start the execution engine immediately
engine.start();
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === "toggle-binder") {
		console.log("Toggling Binder UI...");
		selector.activate();
	}
	if (request.action === "remap-shortcut") {
		console.log("Remapping shortcut:", request.id);
		selector.activate(request.id);
	}
});
