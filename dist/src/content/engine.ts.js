export class ShortcutEngine {
	shortcuts = [];
	currentPath = window.location.pathname;
	constructor() {
		this.loadShortcuts();
		this.handleKeyDown = this.handleKeyDown.bind(this);
		this.observeURLChanges();
		// Listen for storage changes to refresh shortcuts without page reload
		chrome.storage.onChanged.addListener((changes, area) => {
			if (area === "local" && changes.shortcuts) {
				this.loadShortcuts();
			}
		});
	}
	async loadShortcuts() {
		const domain = window.location.hostname;
		const data = await chrome.storage.local.get("shortcuts");
		const allShortcuts = data.shortcuts || {};
		this.shortcuts = allShortcuts[domain] || [];
		console.log(`Highkey: Loaded ${this.shortcuts.length} shortcuts for ${domain}`);
	}
	observeURLChanges() {
		// Detect URL changes in SPAs
		let lastPath = window.location.pathname;
		// Check every second as a fallback for internal navigation
		setInterval(() => {
			if (window.location.pathname !== lastPath) {
				lastPath = window.location.pathname;
				this.currentPath = lastPath;
				console.log(`Highkey: URL changed to ${lastPath}`);
			}
		}, 1e3);
		// Also listen to popstate (back/forward)
		window.addEventListener("popstate", () => {
			this.currentPath = window.location.pathname;
		});
	}
	start() {
		document.addEventListener("keydown", this.handleKeyDown, true);
	}
	stop() {
		document.removeEventListener("keydown", this.handleKeyDown, true);
	}
	handleKeyDown(e) {
		if (this.isUserTyping(e)) return;
		const matchedShortcut = this.shortcuts.find((s) => {
			const sc = s.shortcut;
			const keyMatch = sc.key === e.key.toLowerCase() && sc.ctrl === e.ctrlKey && sc.shift === e.shiftKey && sc.alt === e.altKey && sc.meta === e.metaKey;
			if (!keyMatch) return false;
			// 2. Match the scope
			if (s.scope === "domain" || !s.scope) return true;
			// Pattern Matching Logic
			return this.matchPath(s.path, this.currentPath);
		});
		if (matchedShortcut) {
			this.executeShortcut(matchedShortcut, e);
		}
	}
	matchPath(pattern, currentPath) {
		if (!pattern) return false;
		// Escape special characters and convert * to .*
		const regexSource = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]+");
		const regex = new RegExp(`^${regexSource}$`);
		return regex.test(currentPath);
	}
	isUserTyping(e) {
		const target = e.target;
		const isEditable = target.isContentEditable || [
			"INPUT",
			"TEXTAREA",
			"SELECT"
		].includes(target.tagName);
		// Allow shortcuts with modifiers even if in an input (e.g., Ctrl+S)
		const hasModifier = e.ctrlKey || e.altKey || e.metaKey;
		return isEditable && !hasModifier;
	}
	async executeShortcut(shortcut, e) {
		// Retry logic: some SPAs take a moment to render elements (e.g. modals)
		const element = await this.findWithRetry(shortcut.selector);
		if (element) {
			console.log(`Highkey: Executing shortcut for selector: ${shortcut.selector}`);
			e.preventDefault();
			e.stopPropagation();
			this.provideFeedback(element);
			this.simulateFullClick(element);
		} else {
			console.warn(`Highkey: Element not found even after retry: ${shortcut.selector}`);
		}
	}
	async findWithRetry(selector, retries = 5, interval = 100) {
		for (let i = 0; i < retries; i++) {
			const el = this.deepQuerySelector(selector);
			// Ensure the element is visible and not display: none
			if (el && (el.offsetWidth > 0 || el.offsetHeight > 0)) {
				return el;
			}
			await new Promise((resolve) => setTimeout(resolve, interval));
		}
		return null;
	}
	deepQuerySelector(selector, root = document) {
		// 1. Try standard query
		const el = root.querySelector(selector);
		if (el) return el;
		// 2. If not found, recursively search through all Shadow Roots
		const allElements = root.querySelectorAll("*");
		for (const item of Array.from(allElements)) {
			if (item.shadowRoot) {
				const found = this.deepQuerySelector(selector, item.shadowRoot);
				if (found) return found;
			}
		}
		return null;
	}
	simulateFullClick(el) {
		const rect = el.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;
		el.scrollIntoView({
			block: "nearest",
			inline: "nearest"
		});
		// Find the innermost element (Deep Target)
		const deepTarget = document.elementFromPoint(centerX, centerY) || el;
		// Common options for all events
		const eventOptions = {
			bubbles: true,
			cancelable: true,
			view: window,
			detail: 1,
			clientX: centerX,
			clientY: centerY,
			screenX: centerX,
			screenY: centerY,
			ctrlKey: false,
			altKey: false,
			shiftKey: false,
			metaKey: false,
			button: 0,
			buttons: 1,
			which: 1,
			composed: true
		};
		// 1. Focus the target
		deepTarget.focus();
		// 2. Dispatch PointerDown (Critical for modern frameworks like Next.js)
		if (window.PointerEvent) {
			const pointerOptions = {
				...eventOptions,
				pointerId: 1,
				pointerType: "mouse",
				isPrimary: true
			};
			deepTarget.dispatchEvent(new PointerEvent("pointerdown", pointerOptions));
		}
		// 3. Dispatch MouseDown
		deepTarget.dispatchEvent(new MouseEvent("mousedown", eventOptions));
		// 4. Dispatch PointerUp & MouseUp
		if (window.PointerEvent) {
			const pointerOptions = {
				...eventOptions,
				pointerId: 1,
				pointerType: "mouse",
				isPrimary: true,
				buttons: 0
			};
			deepTarget.dispatchEvent(new PointerEvent("pointerup", pointerOptions));
		}
		const mouseUpOptions = {
			...eventOptions,
			buttons: 0
		};
		deepTarget.dispatchEvent(new MouseEvent("mouseup", mouseUpOptions));
		// 5. Dispatch the final Click
		const clickEvent = new MouseEvent("click", mouseUpOptions);
		deepTarget.dispatchEvent(clickEvent);
		// 6. Native Fallback (Only if not already handled by a router)
		// We check if the click was prevented. If NOT prevented, it means
		// the SPA router didn't catch it, so we try the native .click().
		if (!clickEvent.defaultPrevented && typeof deepTarget.click === "function") {
			deepTarget.click();
		}
	}
	provideFeedback(el) {
		const originalTransition = el.style.transition;
		const originalOutline = el.style.outline;
		el.style.transition = "outline 0.1s ease-in-out";
		el.style.outline = "4px solid rgba(0, 215, 120, 0.6)";
		setTimeout(() => {
			el.style.outline = originalOutline;
			setTimeout(() => {
				el.style.transition = originalTransition;
			}, 100);
		}, 200);
	}
}
