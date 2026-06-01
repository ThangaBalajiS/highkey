export class VisualSelector {
	root;
	shadow;
	highlighter;
	prompt;
	isActive = false;
	isCapturing = false;
	lastElement = null;
	currentSelector = null;
	remappingId = null;
	constructor() {
		this.root = document.createElement("div");
		this.root.id = "highkey-selector-root";
		this.shadow = this.root.attachShadow({ mode: "closed" });
		this.highlighter = document.createElement("div");
		this.highlighter.id = "highlighter";
		this.prompt = document.createElement("div");
		this.prompt.id = "prompt";
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
		this.shadow.querySelector("#cancel-btn")?.addEventListener("click", (e) => {
			e.stopPropagation();
			this.deactivate();
		});
	}
	setupStyles() {
		const style = document.createElement("style");
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
	activate(remappingId = null) {
		if (this.isActive) return;
		this.isActive = true;
		this.isCapturing = false;
		this.remappingId = remappingId;
		document.documentElement.appendChild(this.root);
		document.addEventListener("mousemove", this.handleMouseMove, true);
		document.addEventListener("click", this.handleClick, true);
		console.log("Highkey Selector Activated");
	}
	deactivate() {
		this.isActive = false;
		this.isCapturing = false;
		this.remappingId = null;
		if (document.documentElement.contains(this.root)) {
			document.documentElement.removeChild(this.root);
		}
		document.removeEventListener("mousemove", this.handleMouseMove, true);
		document.removeEventListener("click", this.handleClick, true);
		document.removeEventListener("keydown", this.handleKeyDown, true);
		this.highlighter.style.display = "none";
		this.prompt.style.display = "none";
		this.lastElement = null;
		this.currentSelector = null;
	}
	handleMouseMove(e) {
		if (this.isCapturing) return;
		const target = e.target;
		if (target === this.lastElement) return;
		this.lastElement = target;
		if (target) {
			const rect = target.getBoundingClientRect();
			this.highlighter.style.width = `${rect.width}px`;
			this.highlighter.style.height = `${rect.height}px`;
			this.highlighter.style.top = `${rect.top}px`;
			this.highlighter.style.left = `${rect.left}px`;
			this.highlighter.style.display = "block";
		}
	}
	async handleClick(e) {
		if (this.isCapturing) return;
		e.preventDefault();
		e.stopPropagation();
		const target = e.target;
		if (target) {
			this.lastElement = target;
			this.currentSelector = this.generateResilientSelector(target);
			if (this.remappingId) {
				const data = await chrome.storage.local.get("shortcuts");
				const shortcuts = data.shortcuts || {};
				const domainShortcuts = shortcuts[window.location.hostname] || [];
				const original = domainShortcuts.find((s) => s.id === this.remappingId);
				if (original) {
					await this.saveShortcut(original.shortcut, this.currentSelector, original.scope || "domain");
					this.deactivate();
					return;
				}
			}
			this.startCapturing();
		}
	}
	startCapturing() {
		this.isCapturing = true;
		this.highlighter.style.background = "rgba(0, 215, 120, 0.2)";
		this.highlighter.style.borderColor = "rgb(0, 215, 120)";
		const display = this.shadow.querySelector(".selector-display");
		if (display) display.textContent = this.currentSelector;
		const instruction = this.shadow.querySelector(".instruction");
		if (this.remappingId) {
			if (instruction) instruction.textContent = "Remapping... Press any key to confirm";
		} else {
			if (instruction) instruction.textContent = "Press the key you want to bind...";
		}
		this.prompt.style.display = "block";
		document.addEventListener("keydown", this.handleKeyDown, true);
	}
	async handleKeyDown(e) {
		if ([
			"Control",
			"Shift",
			"Alt",
			"Meta"
		].includes(e.key)) return;
		e.preventDefault();
		e.stopPropagation();
		const scopeToggle = this.shadow.querySelector("#scope-toggle");
		const scope = scopeToggle?.checked ? "domain" : "path";
		let shortcut = null;
		if (this.remappingId) {
			const data = await chrome.storage.local.get("shortcuts");
			const shortcuts = data.shortcuts || {};
			const domainShortcuts = shortcuts[window.location.hostname] || [];
			const original = domainShortcuts.find((s) => s.id === this.remappingId);
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
	generalizePath(path) {
		return path.split("/").map((segment) => {
			if (/[0-9]/.test(segment) && (segment.length > 4 || /^[0-9a-fA-F-]+$/.test(segment))) {
				return "*";
			}
			return segment;
		}).join("/");
	}
	async saveShortcut(shortcut, selector, scope) {
		const domain = window.location.hostname;
		let path = window.location.pathname;
		if (scope === "path") {
			path = this.generalizePath(path);
		}
		const innerText = this.lastElement?.innerText?.trim() || "";
		const label = innerText.slice(0, 50) || this.lastElement?.getAttribute("aria-label") || "Unnamed Shortcut";
		const data = await chrome.storage.local.get("shortcuts") || {};
		const shortcuts = data.shortcuts || {};
		if (!shortcuts[domain]) shortcuts[domain] = [];
		const entry = {
			shortcut,
			selector,
			innerText,
			label,
			scope,
			path: scope === "path" ? path : null,
			id: this.remappingId || crypto.randomUUID(),
			createdAt: Date.now()
		};
		if (this.remappingId) {
			shortcuts[domain] = shortcuts[domain].map((s) => s.id === this.remappingId ? entry : s);
		} else {
			shortcuts[domain].push(entry);
		}
		await chrome.storage.local.set({ shortcuts });
	}
	generateResilientSelector(el) {
		const tag = el.tagName.toLowerCase();
		// 1. Stable Identity Attributes (gh, aria-label, etc.)
		const identityAttrs = [
			"gh",
			"aria-label",
			"data-testid",
			"name",
			"placeholder",
			"title"
		];
		for (const attr of identityAttrs) {
			const val = el.getAttribute(attr);
			if (val) {
				const attrSelector = `${tag}[${attr}="${CSS.escape(val)}"]`;
				if (this.isUnique(attrSelector, el)) return attrSelector;
			}
		}
		// 2. Stable ID
		if (el.id && !this.isAutoGenerated(el.id)) {
			const idSelector = `#${CSS.escape(el.id)}`;
			if (this.isUnique(idSelector, el)) return idSelector;
		}
		// 3. Semantic Role (Very stable in Gmail)
		const role = el.getAttribute("role");
		if (role) {
			const roleSelector = `${tag}[role="${CSS.escape(role)}"]`;
			if (this.isUnique(roleSelector, el)) return roleSelector;
		}
		// 4. Unique Combination of Classes
		const classes = Array.from(el.classList).filter((c) => !this.isTailwindOrHashed(c));
		if (classes.length > 0) {
			const classSelector = `${tag}.${classes.map((c) => CSS.escape(c)).join(".")}`;
			if (this.isUnique(classSelector, el)) return classSelector;
		}
		// 5. Ancestor Anchoring
		let parent = el.parentElement;
		let depth = 0;
		while (parent && parent.tagName !== "BODY" && depth < 3) {
			for (const attr of [
				"gh",
				"aria-label",
				"data-testid",
				"role"
			]) {
				const pVal = parent.getAttribute(attr);
				if (pVal) {
					const anchoredSelector = `[${attr}="${CSS.escape(pVal)}"] ${tag}`;
					if (this.isUnique(anchoredSelector, el)) return anchoredSelector;
				}
			}
			parent = parent.parentElement;
			depth++;
		}
		// 6. Absolute Fallback: Return tag and rely on Text Filtering in the Engine
		return tag;
	}
	isTailwindOrHashed(c) {
		return /^(p|m|w|h|bg|text|flex|grid|border|rounded|opacity|z|top|left|right|bottom|items|justify)-/.test(c) || /[0-9]{4,}/.test(c);
	}
	isUnique(selector, targetEl) {
		try {
			const matches = this.findAllDeep(selector);
			console.log(`[Highkey] Uniqueness check for "${selector}": found ${matches.length} matches.`);
			if (matches.length === 1) {
				if (targetEl && matches[0] !== targetEl) return false;
				return true;
			}
			return false;
		} catch (e) {
			return false;
		}
	}
	findAllDeep(selector) {
		const results = [];
		const search = (root) => {
			const matches = root.querySelectorAll(selector);
			results.push(...Array.from(matches));
			const all = root.querySelectorAll("*");
			for (const el of Array.from(all)) {
				if (el.shadowRoot) search(el.shadowRoot);
			}
		};
		search(document);
		return results;
	}
	isAutoGenerated(id) {
		const lowercaseId = id.toLowerCase();
		return /[0-9]{5,}/.test(id) || id.startsWith(":") || lowercaseId.includes("react-") || lowercaseId.includes(":r") || lowercaseId.includes("radix-") || lowercaseId.includes("headlessui-");
	}
}
