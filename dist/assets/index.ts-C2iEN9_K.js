(function(){var e=class{root;shadow;highlighter;prompt;isActive=!1;isCapturing=!1;lastElement=null;currentSelector=null;remappingId=null;constructor(){this.root=document.createElement(`div`),this.root.id=`highkey-selector-root`,this.shadow=this.root.attachShadow({mode:`closed`}),this.highlighter=document.createElement(`div`),this.highlighter.id=`highlighter`,this.prompt=document.createElement(`div`),this.prompt.id=`prompt`,this.prompt.innerHTML=`
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
    `,this.setupStyles(),this.shadow.appendChild(this.highlighter),this.shadow.appendChild(this.prompt),this.handleMouseMove=this.handleMouseMove.bind(this),this.handleClick=this.handleClick.bind(this),this.handleKeyDown=this.handleKeyDown.bind(this),this.shadow.querySelector(`#cancel-btn`)?.addEventListener(`click`,e=>{e.stopPropagation(),this.deactivate()})}setupStyles(){let e=document.createElement(`style`);e.textContent=`
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
    `,this.shadow.appendChild(e)}activate(e=null){this.isActive||(this.isActive=!0,this.isCapturing=!1,this.remappingId=e,document.documentElement.appendChild(this.root),document.addEventListener(`mousemove`,this.handleMouseMove,!0),document.addEventListener(`click`,this.handleClick,!0),console.log(`Highkey Selector Activated`))}deactivate(){this.isActive=!1,this.isCapturing=!1,this.remappingId=null,document.documentElement.contains(this.root)&&document.documentElement.removeChild(this.root),document.removeEventListener(`mousemove`,this.handleMouseMove,!0),document.removeEventListener(`click`,this.handleClick,!0),document.removeEventListener(`keydown`,this.handleKeyDown,!0),this.highlighter.style.display=`none`,this.prompt.style.display=`none`,this.lastElement=null,this.currentSelector=null}handleMouseMove(e){if(this.isCapturing)return;let t=e.target;if(t!==this.lastElement&&(this.lastElement=t,t)){let e=t.getBoundingClientRect();this.highlighter.style.width=`${e.width}px`,this.highlighter.style.height=`${e.height}px`,this.highlighter.style.top=`${e.top}px`,this.highlighter.style.left=`${e.left}px`,this.highlighter.style.display=`block`}}handleClick(e){if(this.isCapturing)return;e.preventDefault(),e.stopPropagation();let t=e.target;t&&(this.currentSelector=this.generateResilientSelector(t),this.startCapturing())}startCapturing(){this.isCapturing=!0,this.highlighter.style.background=`rgba(0, 215, 120, 0.2)`,this.highlighter.style.borderColor=`rgb(0, 215, 120)`;let e=this.shadow.querySelector(`.selector-display`);e&&(e.textContent=this.currentSelector);let t=this.shadow.querySelector(`.instruction`);this.remappingId?t&&(t.textContent=`Remapping... Press any key to confirm`):t&&(t.textContent=`Press the key you want to bind...`),this.prompt.style.display=`block`,document.addEventListener(`keydown`,this.handleKeyDown,!0)}async handleKeyDown(e){if([`Control`,`Shift`,`Alt`,`Meta`].includes(e.key))return;e.preventDefault(),e.stopPropagation();let t=this.shadow.querySelector(`#scope-toggle`)?.checked?`domain`:`path`,n=null;this.remappingId&&(n=(((await chrome.storage.local.get(`shortcuts`)).shortcuts||{})[window.location.hostname]||[]).find(e=>e.id===this.remappingId)?.shortcut),n||={key:e.key.toLowerCase(),ctrl:e.ctrlKey,shift:e.shiftKey,alt:e.altKey,meta:e.metaKey},this.currentSelector&&(await this.saveShortcut(n,this.currentSelector,t),this.deactivate())}generalizePath(e){return e.split(`/`).map(e=>/[0-9]/.test(e)&&(e.length>4||/^[0-9a-fA-F-]+$/.test(e))?`*`:e).join(`/`)}async saveShortcut(e,t,n){let r=window.location.hostname,i=window.location.pathname;n===`path`&&(i=this.generalizePath(i));let a=this.lastElement?.innerText?.trim()||``,o=a.slice(0,50)||this.lastElement?.getAttribute(`aria-label`)||`Unnamed Shortcut`,s=(await chrome.storage.local.get(`shortcuts`)||{}).shortcuts||{};s[r]||(s[r]=[]);let c={shortcut:e,selector:t,innerText:a,label:o,scope:n,path:n===`path`?i:null,id:this.remappingId||crypto.randomUUID(),createdAt:Date.now()};this.remappingId?s[r]=s[r].map(e=>e.id===this.remappingId?c:e):s[r].push(c),await chrome.storage.local.set({shortcuts:s})}generateResilientSelector(e){let t=e.tagName.toLowerCase();for(let n of[`gh`,`aria-label`,`data-testid`,`name`,`placeholder`,`title`]){let r=e.getAttribute(n);if(r){let i=`${t}[${n}="${CSS.escape(r)}"]`;if(this.isUnique(i,e))return i}}if(e.id&&!this.isAutoGenerated(e.id)){let t=`#${CSS.escape(e.id)}`;if(this.isUnique(t,e))return t}let n=e.getAttribute(`role`);if(n){let r=`${t}[role="${CSS.escape(n)}"]`;if(this.isUnique(r,e))return r}let r=Array.from(e.classList).filter(e=>!this.isTailwindOrHashed(e));if(r.length>0){let n=`${t}.${r.map(e=>CSS.escape(e)).join(`.`)}`;if(this.isUnique(n,e))return n}let i=e.parentElement,a=0;for(;i&&i.tagName!==`BODY`&&a<3;){for(let n of[`gh`,`aria-label`,`data-testid`,`role`]){let r=i.getAttribute(n);if(r){let i=`[${n}="${CSS.escape(r)}"] ${t}`;if(this.isUnique(i,e))return i}}i=i.parentElement,a++}return t}isTailwindOrHashed(e){return/^(p|m|w|h|bg|text|flex|grid|border|rounded|opacity|z|top|left|right|bottom|items|justify)-/.test(e)||/[0-9]{4,}/.test(e)}isUnique(e,t){try{let n=this.findAllDeep(e);return console.log(`[Highkey] Uniqueness check for "${e}": found ${n.length} matches.`),n.length===1?!(t&&n[0]!==t):!1}catch{return!1}}findAllDeep(e){let t=[],n=r=>{let i=r.querySelectorAll(e);t.push(...Array.from(i));let a=r.querySelectorAll(`*`);for(let e of Array.from(a))e.shadowRoot&&n(e.shadowRoot)};return n(document),t}isAutoGenerated(e){let t=e.toLowerCase();return/[0-9]{5,}/.test(e)||e.startsWith(`:`)||t.includes(`react-`)||t.includes(`:r`)||t.includes(`radix-`)||t.includes(`headlessui-`)}},t=class{shortcuts=[];currentPath=window.location.pathname;constructor(){this.loadShortcuts(),this.handleKeyDown=this.handleKeyDown.bind(this),this.observeURLChanges(),chrome.storage.onChanged.addListener((e,t)=>{t===`local`&&e.shortcuts&&this.loadShortcuts()})}async loadShortcuts(){let e=window.location.hostname,t=(await chrome.storage.local.get(`shortcuts`)).shortcuts||{};this.shortcuts=t[e]||[],console.log(`Highkey: Loaded ${this.shortcuts.length} shortcuts for ${e}`)}observeURLChanges(){let e=window.location.pathname;setInterval(()=>{window.location.pathname!==e&&(e=window.location.pathname,this.currentPath=e,console.log(`Highkey: URL changed to ${e}`))},1e3),window.addEventListener(`popstate`,()=>{this.currentPath=window.location.pathname})}start(){document.addEventListener(`keydown`,this.handleKeyDown,!0)}stop(){document.removeEventListener(`keydown`,this.handleKeyDown,!0)}handleKeyDown(e){if(this.isUserTyping(e))return;let t=this.shortcuts.find(t=>{let n=t.shortcut;return n.key===e.key.toLowerCase()&&n.ctrl===e.ctrlKey&&n.shift===e.shiftKey&&n.alt===e.altKey&&n.meta===e.metaKey?t.scope===`domain`||!t.scope?!0:this.matchPath(t.path,this.currentPath):!1});t&&this.executeShortcut(t,e)}matchPath(e,t){if(!e)return!1;let n=e.replace(/[.+^${}()|[\]\\]/g,`\\$&`).replace(/\*/g,`[^/]+`);return RegExp(`^${n}$`).test(t)}isUserTyping(e){let t=e.target,n=t.isContentEditable||[`INPUT`,`TEXTAREA`,`SELECT`].includes(t.tagName),r=e.ctrlKey||e.altKey||e.metaKey;return n&&!r}async executeShortcut(e,t){let n=await this.findWithRetry(e);n?(console.log(`Highkey: Executing shortcut for label: ${e.label}`),t.preventDefault(),t.stopPropagation(),this.provideFeedback(n),this.simulateFullClick(n)):console.warn(`Highkey: Element not found: ${e.label}`)}async findWithRetry(e,t=5,n=100){for(let r=0;r<t;r++){let t=this.deepQuerySelector(e);if(t&&(t.offsetWidth>0||t.offsetHeight>0))return t;await new Promise(e=>setTimeout(e,n))}return null}deepQuerySelector(e){let{selector:t,innerText:n}=e,r=this.findAllDeep(t);if(r.length===0)return null;if(n&&n.trim()){let e=n.trim().toLowerCase();return r.find(t=>t.innerText?.trim().toLowerCase()===e)||r.find(t=>t.innerText?.trim().toLowerCase().includes(e))||(console.warn(`Highkey: Found ${r.length} elements for "${t}", but none match the text "${e}".`),null)}return r.length===1?r[0]:r.find(e=>e.offsetWidth>0||e.offsetHeight>0)||null}findAllDeep(e,t=document){let n=Array.from(t.querySelectorAll(e)),r=t.querySelectorAll(`*`);for(let t of Array.from(r))t.shadowRoot&&(n=[...n,...this.findAllDeep(e,t.shadowRoot)]);return n}async simulateFullClick(e){let t=e.getBoundingClientRect(),n=t.left+t.width/2,r=t.top+t.height/2;e.scrollIntoView({block:`nearest`,inline:`nearest`});let i=document.elementFromPoint(n,r)||e,a={bubbles:!0,cancelable:!0,view:window,detail:1,clientX:n,clientY:r,button:0,buttons:1,which:1,composed:!0,ctrlKey:!1,altKey:!1,shiftKey:!1,metaKey:!1},o=window.location.href;i.focus(),window.PointerEvent&&i.dispatchEvent(new PointerEvent(`pointerdown`,{...a,pointerId:1,pointerType:`mouse`})),i.dispatchEvent(new MouseEvent(`mousedown`,a));let s={...a,buttons:0};window.PointerEvent&&i.dispatchEvent(new PointerEvent(`pointerup`,{...s,pointerId:1,pointerType:`mouse`})),i.dispatchEvent(new MouseEvent(`mouseup`,s));let c=new MouseEvent(`click`,s);if(!i.dispatchEvent(c)||window.location.href!==o){console.log(`Highkey: Click handled by manual sequence.`);return}setTimeout(()=>{window.location.href===o&&typeof i.click==`function`&&(console.log(`Highkey: Manual sequence ignored, falling back to native .click()`),i.click())},10)}provideFeedback(e){let t=e.style.transition,n=e.style.outline;e.style.transition=`outline 0.1s ease-in-out`,e.style.outline=`4px solid rgba(0, 215, 120, 0.6)`,setTimeout(()=>{e.style.outline=n,setTimeout(()=>{e.style.transition=t},100)},200)}};console.log(`Highkey content script loaded`);var n=new e;new t().start(),chrome.runtime.onMessage.addListener((e,t,r)=>{e.action===`toggle-binder`&&(console.log(`Toggling Binder UI...`),n.activate()),e.action===`remap-shortcut`&&(console.log(`Remapping shortcut:`,e.id),n.activate(e.id))});})()
