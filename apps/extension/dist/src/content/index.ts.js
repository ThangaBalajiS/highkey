import { VisualSelector } from "/src/content/selector.ts.js";
import { ShortcutEngine } from "/src/content/engine.ts.js";
console.log("Highkey content script loaded");
const selector = new VisualSelector();
const engine = new ShortcutEngine();
// Start the execution engine immediately
engine.start();
// Check for community shortcuts
const BACKEND_URL = "http://localhost:4000";
async function checkCommunityShortcuts() {
	try {
		const domain = window.location.hostname;
		const response = await fetch(`${BACKEND_URL}/api/shortcuts?domain=${domain}`);
		if (response.ok) {
			const communityShortcuts = await response.json();
			if (communityShortcuts.length > 0) {
				showCommunityNotification(communityShortcuts.length);
			}
		}
	} catch (error) {
		console.warn("Highkey: Could not fetch community shortcuts", error);
	}
}
function showCommunityNotification(count) {
	const toast = document.createElement("div");
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
		toast.style.transform = "translateY(0)";
	}, 100);
	// Animate out after 5s
	setTimeout(() => {
		toast.style.transform = "translateY(100px)";
		setTimeout(() => toast.remove(), 300);
	}, 5e3);
	toast.onclick = () => {
		chrome.runtime.sendMessage({ action: "open-dashboard" });
	};
}
checkCommunityShortcuts();
chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
	console.log("Highkey: Received message:", request.action, request);
	if (request.action === "toggle-binder") {
		console.log("Highkey: Toggling Binder UI...");
		selector.activate();
	}
	if (request.action === "remap-shortcut") {
		console.log("Highkey: Remapping shortcut:", request.id);
		selector.activate(request.id);
	}
});
