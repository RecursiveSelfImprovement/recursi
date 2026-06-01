// YoloTargetAgent.js — Injected into target pages by Aardvark.
// Listens for RPC commands from the YOLO Controller via WindowMessenger.
// Executes safe, fixed DOM operations. No eval(). No arbitrary code.

class YoloTargetAgent {
  constructor() {
    this.messenger = null;
    this._observers = new Map(); // id -> { listener, element, cleanup }
    this._nextObserverId = 1;
    this._yoloDialog = null;
    this._yoloDialogContent = null;
    this._savedDirHandle = null;
  }

  init() {
    // Client mode: auto-attaches to window.opener
    console.log('[YoloTargetAgent] init() starting. href=' + location.href + ' opener=' + !!window.opener);
this.messenger = new WindowMessenger();
console.log('[YoloTargetAgent] WindowMessenger created. isConnected=' + this.messenger.isConnected);
    this.messenger.on('RPC_REQ', (req) => this._handleRequest(req));
this.messenger.on('AGENT_READY_ACK_DEBUG', (req) => console.log('[YoloTargetAgent] got unexpected AGENT_READY_ACK_DEBUG', req));
    this.messenger.on('connected', () => {
      console.log('[YoloTargetAgent] Connected to controller.');
      this.messenger.send('AGENT_READY', { url: location.href, title: document.title });
    });
    console.log('[YoloTargetAgent] Initialized, waiting for controller handshake...');

    // --- RELAY PATH (for sites that kill window.opener, e.g. Quora) ---
    // Listen for postMessage events forwarded by the isolated-world content script.
    // Responses go back out through the same content script via YOLO_RPC_RES_RELAY.
    window.addEventListener("message", (event) => {
      if (event.source !== window || !event.data) return;
      if (event.data.type === "YOLO_RPC_REQ_RELAY" && event.data.payload) {
        const req = event.data.payload;
        // Wrap _handleRequest so the result goes out via the relay instead of WindowMessenger.
        // _handleRequest normally calls this._sendResult / this._sendError which use this.messenger.send.
        // We temporarily swap the messenger with a relay stub for this one request.
        const realMessenger = this.messenger;
        const relayMessenger = {
          send: (type, payload) => {
            window.postMessage({
              type: "YOLO_RPC_RES_RELAY",
              payload: { rpcType: type, rpcPayload: payload }
            }, "*");
          },
          isConnected: true,
        };
        this.messenger = relayMessenger;
        try {
          this._handleRequest(req);
        } finally {
          this.messenger = realMessenger;
        }
      }
    });

    // Announce ourselves to the content script so background knows which tab we are.
    window.postMessage({ type: "YOLO_AGENT_HELLO", href: location.href }, "*");

    // On COOP pages like Quora, opener-based messenger handshake never completes.
    // So also announce readiness through the relay path at startup.
    window.postMessage({
      __YOLO_RELAY_BRIDGE: true,
      type: "YOLO_RPC_RES_RELAY",
      payload: {
        rpcType: "AGENT_READY",
        rpcPayload: { url: location.href, title: document.title }
      }
    }, "*");

    // --- END RELAY PATH ---
setTimeout(() => {
  console.log('[YoloTargetAgent] 3s later: isConnected=' + this.messenger.isConnected + ' opener=' + !!window.opener + ' href=' + location.href);
}, 3000);
  }

  _handleRequest(req) {
    const id = req.id;
    const action = req.action;
    console.log('[YoloTargetAgent] RPC_REQ:', action, id);

    try {
      let result;
      switch (action) {
        case 'QUERY':           result = this._actionQuery(req); break;
        case 'CLICK':           result = this._actionClick(req); break;
        case 'READ_ATTRIBUTE':  result = this._actionReadAttribute(req); break;
        case 'WRITE_ATTRIBUTE': result = this._actionWriteAttribute(req); break;
        case 'INSERT_HTML':     result = this._actionInsertHtml(req); break;
        case 'GET_TEXT':        result = this._actionGetText(req); break;
        case 'SET_VALUE':       result = this._actionSetValue(req); break;
        case 'OBSERVE_CLICKS':  result = this._actionObserveClicks(req); break;
        case 'UNOBSERVE':       result = this._actionUnobserve(req); break;
        case 'GET_PAGE_INFO':   result = this._actionGetPageInfo(req); break;
        case 'SCROLL_TO':       result = this._actionScrollTo(req); break;
        case 'GET_COMPUTED_STYLE': result = this._actionGetComputedStyle(req); break;
        case 'PICK_ELEMENT':      result = this._actionPickElement(req); break;
        case 'START_AARDVARK':     result = this._actionStartAardvark(req); break;
        case 'ELEMENT_INFO':       result = this._actionElementInfo(req); break;
        case 'SHOW_DIALOG':        result = this._actionShowDialog(req); break;
        case 'UPDATE_DIALOG':      result = this._actionUpdateDialog(req); break;
        case 'CLOSE_DIALOG':       result = this._actionCloseDialog(req); break;
        case 'HIGHLIGHT_ELEMENT':  result = this._actionHighlightElement(req); break;
        case 'CLEAR_HIGHLIGHTS':  result = this._actionClearHighlights(req); break;
        case 'AARDVARK_COMMAND':   result = this._actionAardvarkCommand(req); break;
        case 'FANCY_HIGHLIGHT':    result = this._actionFancyHighlight(req); break;
        case 'MULTI_PICK':         result = this._actionMultiPick(req); break;
        case 'SWAP_ELEMENTS':     result = this._actionSwapElements(req); break;
        case 'CLOSE_WINDOW':       result = this._actionCloseWindow(req); break;
        case 'PICK_DIRECTORY':     this._actionPickDirectory(req, id); return;
        case 'IFRAME_SAVE':        this._actionIframeSave(req, id); return;
        case 'IFRAME_EXTRACT_QUORA_ANSWER_CARD': this._actionIframeExtractQuoraAnswerCard(req, id); return;
        case 'EXTRACT_QUORA_ANSWER_CARD': this._actionExtractQuoraAnswerCard(req, id); return;
        case 'EXECUTE_RECIPE':      result = this._actionExecuteRecipe(req); break;
        case 'IFRAME_EXECUTE_RECIPE': this._actionIframeExecuteRecipe(req, id); return;
        case 'READ_HTML':          result = this._actionReadHtml(req); break;
        case 'PRUNE_QUORA_DOM': result = this._actionPruneQuoraDom(req); break;
        case 'PRUNE_DOM':           result = this._actionPruneDom(req); break;
        case 'PRUNE_QUORA_PROFILE_CARDS': result = this._actionPruneQuoraProfileCards(req); break;
        default:
          this._sendError(id, 'UNKNOWN_ACTION', 'Unknown action: ' + action);
          return;
      }
      if (result !== null) this._sendResult(id, result);
    } catch (e) {
      this._sendError(id, 'EXCEPTION', e.message);
    }
  }

  // ---- Actions ----

  _actionQuery(req) {
    const els = document.querySelectorAll(req.selector);
    const limit = req.limit || 100;
    const results = [];
    for (let i = 0; i < els.length && i < limit; i++) {
      const el = els[i];
      const item = {
        index: i,
        tagName: el.tagName.toLowerCase(),
        id: el.id || null,
        className: el.className || null,
        textContent: (el.textContent || '').slice(0, req.maxText || 500),
      };
      if (req.attributes) {
        item.attributes = {};
        req.attributes.forEach(a => { item.attributes[a] = el.getAttribute(a); });
      }
      if (req.includeHtml) {
        item.outerHTML = el.outerHTML.slice(0, req.maxHtml || 2000);
      }
      results.push(item);
    }
    return { count: els.length, items: results };
  }

  _actionClick(req) {
    const el = this._getOne(req.selector, req.index);
    el.click();
    return { clicked: true, tagName: el.tagName.toLowerCase() };
  }

  _actionReadAttribute(req) {
    const el = this._getOne(req.selector, req.index);
    const value = el.getAttribute(req.attribute);
    return { attribute: req.attribute, value: value };
  }

  _actionWriteAttribute(req) {
    const el = this._getOne(req.selector, req.index);
    el.setAttribute(req.attribute, req.value);
    return { written: true };
  }

  _actionInsertHtml(req) {
    const el = this._getOne(req.selector, req.index);
    const position = req.position || 'beforeend'; // beforebegin, afterbegin, beforeend, afterend
    el.insertAdjacentHTML(position, req.html);
    return { inserted: true, position: position };
  }

  _actionGetText(req) {
    const el = this._getOne(req.selector, req.index);
    let text = req.useInnerText ? el.innerText : el.textContent;
    if (req.regex) {
      const match = text.match(new RegExp(req.regex, req.regexFlags || ''));
      return { matched: !!match, match: match ? match[0] : null, groups: match ? match.slice(1) : [] };
    }
    return { text: (text || '').slice(0, req.maxText || 5000) };
  }

  _actionSetValue(req) {
    const el = this._getOne(req.selector, req.index);
    el.value = req.value;
    // Dispatch input event so frameworks pick it up
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return { set: true };
  }

  _actionObserveClicks(req) {
    const observerId = 'obs_' + (this._nextObserverId++);
    const el = this._getOne(req.selector, req.index);
    const handler = (e) => {
      this.messenger.send('RPC_EVENT', {
        observerId: observerId,
        event: 'click',
        target: { tagName: e.target.tagName.toLowerCase(), id: e.target.id, textContent: (e.target.textContent || '').slice(0, 200) }
      });
    };
    el.addEventListener('click', handler);
    this._observers.set(observerId, { element: el, listener: handler, cleanup: () => el.removeEventListener('click', handler) });
    return { observerId: observerId, watching: true };
  }

  _actionUnobserve(req) {
    const obs = this._observers.get(req.observerId);
    if (!obs) return { error: 'Observer not found' };
    obs.cleanup();
    this._observers.delete(req.observerId);
    return { unobserved: true };
  }

  _actionGetPageInfo(req) {
    return {
      url: location.href,
      title: document.title,
      readyState: document.readyState,
      documentElement: {
        scrollHeight: document.documentElement.scrollHeight,
        scrollWidth: document.documentElement.scrollWidth,
        clientHeight: document.documentElement.clientHeight,
        clientWidth: document.documentElement.clientWidth,
      }
    };
  }

  _actionScrollTo(req) {
    if (req.selector) {
      const el = this._getOne(req.selector, req.index);
      el.scrollIntoView({ behavior: req.behavior || 'smooth', block: req.block || 'center' });
      return { scrolled: true, to: 'element' };
    }
    window.scrollTo({ top: req.y || 0, left: req.x || 0, behavior: req.behavior || 'smooth' });
    return { scrolled: true, to: 'coordinates' };
  }

  _actionGetComputedStyle(req) {
    const el = this._getOne(req.selector, req.index);
    const computed = window.getComputedStyle(el);
    const props = req.properties || ['display', 'visibility', 'color', 'backgroundColor', 'fontSize'];
    const result = {};
    props.forEach(p => { result[p] = computed.getPropertyValue(p); });
    return { styles: result };
  }

  _ensureAardvark() {
    if (window.aardvarkInstance) {
      // Make sure it is active
      if (!window.aardvarkInstance.listenerAttached) {
        window.aardvarkInstance.wakeUp();
      }
      return true;
    }
    if (typeof Aardvark === 'undefined') return false;
    window.aardvarkInstance.init();
    KeystrokeHandler.activate();
    return true;
  }

  _actionStartAardvark(req) {
    const ok = this._ensureAardvark();
    return { started: ok, status: ok ? 'active' : 'aardvark_not_available' };
  }

  _actionPickElement(req) {
    const id = req.id;
    const message = req.message || "Pick an element (hover + press Y)";

    if (!this._ensureAardvark()) {
      this._sendError(id, 'NO_AARDVARK', 'Aardvark not available');
      return null;
    }

    // Register Y key for YOLO pick
    const pickHandler = () => {
      if (window.aardvarkInstance.currentElement) {
        const el = window.aardvarkInstance.currentElement;
        window.aardvarkInstance.actions.flashElement(el, '#00ff41');
        const info = this._buildElementInfo(el);
        KeystrokeHandler.removeHandler('yolo_pick');
        this._sendResult(id, info);
      }
    };

    KeystrokeHandler.addHandler({ name: 'yolo_pick', key: 'y', suppressPopup: false }, pickHandler);
    KeystrokeHandler.showPopup('YOLO: Press Y to pick');

    return null; // async
  }

  _actionElementInfo(req) {
    const el = this._getOne(req.selector, req.index);
    return this._buildElementInfo(el);
  }

  // --- Dialog Management ---

  _actionShowDialog(req) {
    // Close existing YOLO dialog if any
    if (this._yoloDialog) {
      try { this._yoloDialog.close(); } catch(e) {}
    }

    const contentEl = document.createElement('div');
    contentEl.innerHTML = req.html || '<p>YOLO Dialog</p>';
    contentEl.style.cssText = 'font-family: system-ui, sans-serif; font-size: 14px; color: #e0e0e0;';

    this._yoloDialog = new DialogBox({
      title: req.title || 'YOLO',
      content: contentEl,
      width: (req.width || 420) + 'px',
      height: (req.height || 300) + 'px',
      buttons: [],
      position: req.position || null,
    });

    // Exclude from Aardvark selection
    if (this._yoloDialog.element) {
      this._yoloDialog.element.setAttribute('data-style-exclude', '');
    }

    this._yoloDialogContent = contentEl;
    return { shown: true };
  }

  _actionUpdateDialog(req) {
    if (!this._yoloDialog || !this._yoloDialogContent) {
      return { updated: false, error: 'No dialog open' };
    }
    if (req.html) {
      this._yoloDialogContent.innerHTML = req.html;
    }
    if (req.title) {
      const titleEl = this._yoloDialog.element.querySelector('.dialog-title');
      if (titleEl) titleEl.textContent = req.title;
    }
    return { updated: true };
  }

  _actionCloseDialog(req) {
    if (this._yoloDialog) {
      try { this._yoloDialog.close(); } catch(e) {}
      this._yoloDialog = null;
      this._yoloDialogContent = null;
    }
    return { closed: true };
  }

  // --- Visual Actions ---

  _actionHighlightElement(req) {
    const el = this._getOne(req.selector, req.index);
    const color = req.color || '#ff6600';
    const duration = req.duration || 0;
    const pulse = req.pulse !== false;

    if (!document.getElementById('yolo-pulse-styles')) {
      const style = document.createElement('style');
      style.id = 'yolo-pulse-styles';
      style.textContent = '@keyframes yoloPulse { 0% { outline-color: var(--yolo-pulse-color); outline-offset: 0px; } 50% { outline-color: var(--yolo-pulse-dim); outline-offset: 4px; } 100% { outline-color: var(--yolo-pulse-color); outline-offset: 0px; } }';
      document.head.appendChild(style);
    }

    el.dataset.yoloOrigOutline = el.style.outline || '';
    el.dataset.yoloOrigAnimation = el.style.animation || '';
    el.dataset.yoloOrigOutlineOffset = el.style.outlineOffset || '';

    el.style.setProperty('--yolo-pulse-color', color);
    el.style.setProperty('--yolo-pulse-dim', color + '66');
    el.style.outline = '3px solid ' + color;
    el.style.outlineOffset = '2px';

    if (pulse) {
      el.style.animation = 'yoloPulse 1.5s ease-in-out infinite';
    }

    if (duration > 0) {
      setTimeout(() => this._clearHighlight(el), duration);
    }

    return { highlighted: true, tagName: el.tagName.toLowerCase(), selector: req.selector };
  }

  _actionAardvarkCommand(req) {
    if (!this._ensureAardvark()) {
      return { executed: false, error: 'Aardvark not available' };
    }
    const aardvark = window.aardvarkInstance;
    // Select the element first if selector provided
    if (req.selector) {
      const el = this._getOne(req.selector, req.index);
      aardvark.currentElement = el;
      aardvark.overlay.highlightElement(el);
    }
    // Execute the command
    const cmd = req.command;
    if (cmd === 'remove') { aardvark.actions.removeCurrentElement(); }
    else if (cmd === 'isolate') { aardvark.actions.isolateElement(); }
    else if (cmd === 'wider') { aardvark.actions.selectParentElement(); }
    else if (cmd === 'narrower') { aardvark.actions.selectChildElement(); }
    else if (cmd === 'undo') { aardvark.actions.undo(); }
    else if (cmd === 'lock') { aardvark.lockElements(); }
    else if (cmd === 'blocks') { aardvark.actions.toggleBigBlocks(); }
    else { return { executed: false, error: 'Unknown command: ' + cmd }; }
    return { executed: true, command: cmd };
  }

  _buildElementInfo(el) {
    let selector = null;
    if (window.aardvarkInstance && window.aardvarkInstance.actions) {
      selector = window.aardvarkInstance.actions.generateSelector(el);
    }
    const rect = el.getBoundingClientRect();
    const computed = window.getComputedStyle(el);
    return {
      tagName: el.tagName.toLowerCase(),
      id: el.id || null,
      className: (typeof el.className === 'string') ? el.className : null,
      selector: selector,
      textContent: (el.innerText || el.textContent || '').slice(0, 1000),
      outerHTML: el.outerHTML.slice(0, 3000),
      attributes: Array.from(el.attributes).reduce((acc, a) => { acc[a.name] = a.value; return acc; }, {}),
      rect: { top: Math.round(rect.top), left: Math.round(rect.left), width: Math.round(rect.width), height: Math.round(rect.height) },
      computedStyle: { display: computed.display, visibility: computed.visibility, fontSize: computed.fontSize, color: computed.color, backgroundColor: computed.backgroundColor },
      childCount: el.children.length,
      parentTag: el.parentElement ? el.parentElement.tagName.toLowerCase() : null,
    };
  }

  _actionClearHighlights(req) {
    const crawls = document.querySelectorAll('.yolo-crawl-border, .yolo-image-overlay');
    crawls.forEach(el => el.remove());
    const pulsing = document.querySelectorAll('[data-yolo-orig-outline]');
    pulsing.forEach(el => {
      el.style.outline = el.dataset.yoloOrigOutline || '';
      el.style.animation = el.dataset.yoloOrigAnimation || '';
      el.style.outlineOffset = el.dataset.yoloOrigOutlineOffset || '';
      el.style.removeProperty('--yolo-pulse-color');
      el.style.removeProperty('--yolo-pulse-dim');
    });
    const imgPulsing = document.querySelectorAll('[data-yolo-fancy-id]');
    imgPulsing.forEach(el => { el.style.animation = ''; delete el.dataset.yoloFancyId; });
    return { cleared: crawls.length + pulsing.length + imgPulsing.length };
  }

  _actionSwapElements(req) {
    const el1 = this._getOne(req.selector1, req.index1);
    const el2 = this._getOne(req.selector2, req.index2);

    // Animate the swap
    const flash = (el, color) => {
      el.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
      el.style.transform = 'scale(0.9)';
      el.style.opacity = '0.3';
      setTimeout(() => {
        el.style.transform = 'scale(1.05)';
        el.style.opacity = '1';
        el.style.outline = '3px solid ' + color;
        setTimeout(() => {
          el.style.transform = '';
          el.style.outline = '';
          setTimeout(() => { el.style.transition = ''; }, 400);
        }, 600);
      }, 400);
    };

    // Swap innerHTML
    const html1 = el1.innerHTML;
    const html2 = el2.innerHTML;
    el1.innerHTML = html2;
    el2.innerHTML = html1;

    flash(el1, '#00ff41');
    flash(el2, '#6b9fff');

    return {
      swapped: true,
      element1: { tagName: el1.tagName.toLowerCase(), selector: req.selector1 },
      element2: { tagName: el2.tagName.toLowerCase(), selector: req.selector2 },
    };
  }

  _actionReadHtml(req) {
    const el = this._getOne(req.selector, req.index);
    return {
      innerHTML: el.innerHTML.slice(0, req.maxLength || 5000),
      outerHTML: el.outerHTML.slice(0, req.maxLength || 5000),
      tagName: el.tagName.toLowerCase(),
    };
  }

  _ensureFancyStyles() {
    if (document.getElementById('yolo-fancy-styles')) return;
    const style = document.createElement('style');
    style.id = 'yolo-fancy-styles';
    style.textContent = [
      '@keyframes yoloCrawl { 0% { background-position: 0 0, 100% 0, 100% 100%, 0 100%; } 100% { background-position: 200% 0, 100% 200%, -100% 100%, 0 -100%; } }',
      '@keyframes yoloImagePulse { 0% { filter: brightness(1) saturate(1); } 50% { filter: brightness(1.3) saturate(1.5); } 100% { filter: brightness(1) saturate(1); } }',
      '@keyframes yoloOverlayPulse { 0% { opacity: 0.15; } 50% { opacity: 0.35; } 100% { opacity: 0.15; } }',
      '.yolo-crawl-border { position: absolute; pointer-events: none; z-index: 2147483640;',
      '  background-size: 8px 3px, 3px 8px, 8px 3px, 3px 8px;',
      '  background-repeat: repeat-x, repeat-y, repeat-x, repeat-y;',
      '  background-position: top, right, bottom, left;',
      '  animation: yoloCrawl 0.6s linear infinite; }',
      '.yolo-image-overlay { position: absolute; pointer-events: none; z-index: 2147483639; border-radius: 4px; animation: yoloOverlayPulse 1.5s ease-in-out infinite; }',
    ].join('\n');
    document.head.appendChild(style);
  }

  _actionFancyHighlight(req) {
    this._ensureFancyStyles();
    const el = this._getOne(req.selector, req.index);
    const color = req.color || '#00ff41';
    const rect = el.getBoundingClientRect();
    const isImage = el.tagName === 'IMG' || el.tagName === 'PICTURE' || el.tagName === 'VIDEO' || !!el.querySelector('img');

    const border = document.createElement('div');
    border.className = 'yolo-crawl-border';
    border.setAttribute('data-style-exclude', '');
    border.dataset.yoloFancyId = req.fancyId || ('fancy_' + Date.now());
    border.style.top = (rect.top + window.scrollY - 3) + 'px';
    border.style.left = (rect.left + window.scrollX - 3) + 'px';
    border.style.width = (rect.width + 6) + 'px';
    border.style.height = (rect.height + 6) + 'px';
    border.style.backgroundImage = [
      'linear-gradient(90deg, ' + color + ' 50%, transparent 50%)',
      'linear-gradient(0deg, ' + color + ' 50%, transparent 50%)',
      'linear-gradient(90deg, ' + color + ' 50%, transparent 50%)',
      'linear-gradient(0deg, ' + color + ' 50%, transparent 50%)',
    ].join(',');
    document.body.appendChild(border);

    if (isImage) {
      const overlay = document.createElement('div');
      overlay.className = 'yolo-image-overlay';
      overlay.setAttribute('data-style-exclude', '');
      overlay.dataset.yoloFancyId = border.dataset.yoloFancyId;
      overlay.style.top = (rect.top + window.scrollY) + 'px';
      overlay.style.left = (rect.left + window.scrollX) + 'px';
      overlay.style.width = rect.width + 'px';
      overlay.style.height = rect.height + 'px';
      overlay.style.background = color;
      document.body.appendChild(overlay);
      el.style.animation = 'yoloImagePulse 1.5s ease-in-out infinite';
      el.dataset.yoloFancyId = border.dataset.yoloFancyId;
    }

    return { highlighted: true, fancyId: border.dataset.yoloFancyId, isImage: isImage };
  }

  _actionMultiPick(req) {
    const id = req.id;
    const message = req.message || 'Pick elements';

    if (!this._ensureAardvark()) {
      this._sendError(id, 'NO_AARDVARK', 'Aardvark not available');
      return null;
    }
    this._ensureFancyStyles();
    const picked = [];
    const colors = ['#00ff41', '#6b9fff', '#ff6b6b', '#ffd700', '#ff6bff', '#6bffd7'];

    if (this._yoloDialog) { try { this._yoloDialog.close(); } catch(e) {} }
    const contentEl = document.createElement('div');
    contentEl.style.cssText = 'font-family: system-ui, sans-serif; font-size: 14px; color: #e0e0e0; padding: 10px;';
    contentEl.innerHTML = '<div style="text-align:center;"><h3 style="color:#ffd700; margin:0 0 8px 0;">' + message + '</h3><p style="color:#ccc; font-size:13px;">Hover + press <strong style="color:#00ff41;">Y</strong> to pick elements.</p><div id="yolo-pick-list" style="margin:10px 0; text-align:left; max-height:180px; overflow-y:auto;"></div><button id="yolo-send-btn" style="margin-top:10px; padding:8px 24px; background:#ffd700; color:#000; border:none; border-radius:6px; font-weight:bold; font-size:14px; cursor:pointer; width:100%;">Send to YOLO (0 picked)</button></div>';

    this._yoloDialog = new DialogBox({
      title: 'YOLO Pick Mode',
      content: contentEl,
      width: '420px',
      height: '420px',
      buttons: [],
    });
    if (this._yoloDialog.element) this._yoloDialog.element.setAttribute('data-style-exclude', '');
    this._yoloDialogContent = contentEl;

    const listEl = contentEl.querySelector('#yolo-pick-list');
    const sendBtn = contentEl.querySelector('#yolo-send-btn');

    const updateList = () => {
      listEl.innerHTML = picked.map((p, i) => {
        const c = colors[i % colors.length];
        const isImg = p.tagName === 'img';
        const preview = isImg ? '<img src="' + (p.attributes.src || '') + '" style="max-width:40px; max-height:30px; vertical-align:middle; margin-right:6px; border-radius:3px;">' : '';
        const label = isImg ? ((p.attributes.alt || 'image') + '').slice(0, 50) : (p.textContent || '').slice(0, 50).replace(/\n/g, ' ').trim();
        return '<div style="margin:4px 0; font-size:12px;"><span style="color:' + c + ';">●</span> ' + preview + '<span style="color:#aaa;">&lt;' + p.tagName + '&gt; ' + label + '</span></div>';
      }).join('');
      sendBtn.textContent = 'Send to YOLO (' + picked.length + ' picked)';
    };

    const pickHandler = () => {
      if (!window.aardvarkInstance || !window.aardvarkInstance.currentElement) return;
      const el = window.aardvarkInstance.currentElement;
      const info = this._buildElementInfo(el);
      const color = colors[picked.length % colors.length];
      try { this._actionFancyHighlight({ selector: info.selector, color: color, fancyId: 'pick_' + picked.length }); } catch(e) {}
      window.aardvarkInstance.actions.flashElement(el, color);
      picked.push(info);
      updateList();
    };

    KeystrokeHandler.addHandler({ name: 'yolo_pick', key: 'y', suppressPopup: false }, pickHandler);

    sendBtn.onclick = () => {
      KeystrokeHandler.removeHandler('yolo_pick');
      this._sendResult(id, { picked: picked, count: picked.length });
    };

    return null;
  }

  async _actionPickDirectory(req, id) {
    const oldBtn = document.getElementById('yolo-pick-dir-btn');
    if (oldBtn) oldBtn.remove();
    const btn = document.createElement('button');
    btn.id = 'yolo-pick-dir-btn';
    btn.textContent = 'Click here to pick save directory';
    btn.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:2147483647;padding:24px 40px;font-size:20px;font-weight:700;background:#2563eb;color:#fff;border:none;border-radius:16px;cursor:pointer;box-shadow:0 12px 40px rgba(0,0,0,0.5);';
    const self = this;
    btn.onclick = async () => {
      btn.textContent = 'Picking...';
      btn.disabled = true;
      try {
        self._savedDirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        btn.remove();
        const resPayload = { id: id, ok: true, data: { ok: true, dirName: self._savedDirHandle.name } };
        self.messenger.send('RPC_RES', resPayload);
        window.postMessage({ type: 'YOLO_RPC_RES_RELAY', payload: { rpcType: 'RPC_RES', rpcPayload: resPayload } }, '*');
      } catch (e) {
        btn.remove();
        const errPayload = { id: id, ok: false, error: { code: 'PICK_DIR_FAILED', message: e.message } };
        self.messenger.send('RPC_RES', errPayload);
        window.postMessage({ type: 'YOLO_RPC_RES_RELAY', payload: { rpcType: 'RPC_RES', rpcPayload: errPayload } }, '*');
      }
    };
    document.body.appendChild(btn);
  }

  async _actionIframeSave(req, id) {
    const url = req.url;
    const filename = req.filename;
    if (!this._savedDirHandle) {
      this._sendError(id, 'NO_DIR', 'No directory picked yet. Call PICK_DIRECTORY first.');
      return;
    }
    try {
      if (req.skipIfExists) {
        try {
          await this._savedDirHandle.getFileHandle(filename, { create: false });
          this._sendResult(id, { ok: true, skipped: true, filename: filename });
          return;
        } catch (e) { /* file doesn't exist, proceed */ }
      }
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:800px;height:600px;opacity:0;pointer-events:none;';
      iframe.src = url;
      document.body.appendChild(iframe);
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => { iframe.remove(); reject(new Error('iframe timeout 30s')); }, 30000);
        iframe.onload = () => { clearTimeout(timer); resolve(); };
      });
      await new Promise(r => setTimeout(r, req.waitMs || 2500));
      let html = '';
      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        html = doc.documentElement ? doc.documentElement.outerHTML : '';
      } catch (e) {
        iframe.remove();
        this._sendError(id, 'IFRAME_BLOCKED', 'Cannot read iframe: ' + e.message);
        return;
      }
      iframe.remove();
      if (!html || html.length < 200) {
        this._sendError(id, 'TOO_LITTLE_HTML', 'Only got ' + (html || '').length + ' bytes');
        return;
      }
      const fh = await this._savedDirHandle.getFileHandle(filename, { create: true });
      const writable = await fh.createWritable();
      await writable.write('<!doctype html>\n' + html);
      await writable.close();
      const ifrRes = { id: id, ok: true, data: { ok: true, filename: filename, bytes: html.length } };
      this.messenger.send('RPC_RES', ifrRes);
      window.postMessage({ type: 'YOLO_RPC_RES_RELAY', payload: { rpcType: 'RPC_RES', rpcPayload: ifrRes } }, '*');
    } catch (e) {
      this._sendError(id, 'IFRAME_SAVE_FAILED', e.message);
    }
  }

  async _actionExtractQuoraAnswerCard(req, id) {
    try {
      const opts = req || {};
      const card = this._findQuoraAnswerCard();
      if (!card) {
        this._sendError(id, 'NO_QUORA_ANSWER_CARD', 'Could not find Quora answer card on page.');
        return;
      }

      const data = this._extractQuoraAnswerCardData(card, opts);
      const shouldSave = !!opts.saveFiles;
      const returnData = opts.returnData !== false;

      let saved = null;
      if (shouldSave) {
        if (!this._savedDirHandle) {
          this._sendError(id, 'NO_DIR', 'No directory picked yet. Call PICK_DIRECTORY first.');
          return;
        }

        const base = String(opts.filenameBase || data.slug || 'quora-answer')
          .replace(/[^a-zA-Z0-9._-]+/g, '_')
          .replace(/_+/g, '_')
          .slice(0, 180);

        const answerCardFilename = base + '.answerCard.html';
        const jsonFilename = base + '.item.json';
        const fullPageFilename = base + '.page.html';

        const cardFh = await this._savedDirHandle.getFileHandle(answerCardFilename, { create: true });
        const cardWritable = await cardFh.createWritable();
        await cardWritable.write('<!doctype html>\n' + data.answerCardHtml);
        await cardWritable.close();

        const jsonPayload = { ...data };
        if (!returnData) {
          delete jsonPayload.answerCardHtml;
          delete jsonPayload.contentHtml;
        }

        const jsonFh = await this._savedDirHandle.getFileHandle(jsonFilename, { create: true });
        const jsonWritable = await jsonFh.createWritable();
        await jsonWritable.write(JSON.stringify(jsonPayload, null, 2));
        await jsonWritable.close();

        if (opts.includeFullPage) {
          const fullFh = await this._savedDirHandle.getFileHandle(fullPageFilename, { create: true });
          const fullWritable = await fullFh.createWritable();
          await fullWritable.write('<!doctype html>\n' + document.documentElement.outerHTML);
          await fullWritable.close();
        }

        saved = {
          answerCardFilename,
          jsonFilename,
          fullPageFilename: opts.includeFullPage ? fullPageFilename : null,
        };
      }

      const result = returnData
        ? { ...data, saved }
        : {
            ok: true,
            title: data.title,
            questionUrl: data.questionUrl,
            answerUrl: data.answerUrl,
            paragraphCount: data.paragraphCount,
            imageCount: data.imageCount,
            saved,
          };

      this._sendResult(id, result);
    } catch (e) {
      this._sendError(id, 'EXTRACT_QUORA_ANSWER_CARD_FAILED', e.message || String(e));
    }
  }

  _extractQuoraAnswerCardData(card, opts) {
    const contentRoot = this._findQuoraContentRoot(card) || card;
    const titleAnchor =
      card.querySelector('.puppeteer_test_question_title')?.closest('a[href]') ||
      Array.from(card.querySelectorAll('a[href]')).find(a => {
        const href = a.href || '';
        return /quora\.com\//i.test(href) &&
          !/\/answer\//i.test(href) &&
          !/\/profile\//i.test(href) &&
          !/\/topic\//i.test(href);
      });

    const answerAnchor =
      card.querySelector('a.answer_timestamp[href*="/answer/"]') ||
      Array.from(card.querySelectorAll('a[href*="/answer/"]')).find(a => /\/answer\//i.test(a.href || ''));

    const authorAnchor =
      Array.from(card.querySelectorAll('a[href*="/profile/"]')).find(a => {
        const href = a.href || '';
        const text = this._getTextContent(a);
        return /rob-brown-13/i.test(href) || /^rob brown$/i.test(text);
      }) ||
      Array.from(card.querySelectorAll('a[href*="/profile/"]')).find(a => {
        const text = this._getTextContent(a);
        return /^rob brown$/i.test(text);
      }) ||
      Array.from(card.querySelectorAll('a[href*="/profile/"]')).find(a => /\/profile\//i.test(a.href || ''));

    const timestampText = answerAnchor ? this._getTextContent(answerAnchor) : '';
    const title = titleAnchor ? this._getTextContent(titleAnchor) : document.title;
    const questionUrl = titleAnchor ? this._maybeAbsoluteUrl(titleAnchor.getAttribute('href') || titleAnchor.href || '') : '';
    const answerUrl = answerAnchor ? this._maybeAbsoluteUrl(answerAnchor.getAttribute('href') || answerAnchor.href || '') : location.href;
    const author = (authorAnchor ? this._getTextContent(authorAnchor) : '') || 'Rob Brown';
    const authorUrl = authorAnchor ? this._maybeAbsoluteUrl(authorAnchor.getAttribute('href') || authorAnchor.href || '') : '';

    const topics = this._extractQuoraTopics(card);
    const stats = this._extractQuoraStats(card);
    const blocks = this._extractQuoraBlocks(contentRoot);

    const text = blocks
      .filter(block => block.type === 'paragraph')
      .map(block => block.text)
      .join('\n\n');

    const slug = this._slugFromAnswerUrl(answerUrl || questionUrl || location.href);
    const cleanHtml = this._buildCleanAnswerCardHtml({
      title,
      questionUrl,
      answerUrl,
      author,
      authorUrl,
      timestampText,
      topics,
      viewsText: stats.viewsText,
      upvotesText: stats.upvotesText,
      sharesText: stats.sharesText,
      blocks,
    });

    return {
      ok: true,
      pageUrl: location.href,
      pageTitle: document.title,
      title,
      slug,
      questionUrl,
      answerUrl,
      author,
      authorUrl,
      timestampText,
      topics,
      viewsText: stats.viewsText,
      upvotesText: stats.upvotesText,
      sharesText: stats.sharesText,
      paragraphCount: blocks.filter(b => b.type === 'paragraph').length,
      imageCount: blocks.filter(b => b.type === 'image').length,
      blocks,
      text,
      answerCardHtml: cleanHtml,
      contentHtml: contentRoot.innerHTML || '',
    };
  }

  _findQuoraAnswerCard() {
    const answerAnchor =
      document.querySelector('a.answer_timestamp[href*="/answer/"]') ||
      Array.from(document.querySelectorAll('a[href*="/answer/"]')).find(a => /\/answer\//i.test(a.href || ''));

    if (!answerAnchor) return null;

    let node = answerAnchor;
    let best = null;
    let bestScore = -1;

    while (node && node !== document.body) {
      if (node.querySelectorAll) {
        const paragraphs = node.querySelectorAll('p').length;
        const answerLinks = node.querySelectorAll('a[href*="/answer/"]').length;
        const contentImgs = Array.from(node.querySelectorAll('img')).filter(img => this._isLikelyContentImage(img)).length;
        const topicLinks = node.querySelectorAll('a[href*="/topic/"]').length;
        const profileLinks = node.querySelectorAll('a[href*="/profile/"]').length;
        const text = node.innerText || '';
        const hasViews = /\bviews\b/i.test(text);
        const hasQuestion = Array.from(node.querySelectorAll('a[href]')).some(a => {
          const href = a.href || '';
          return /quora\.com\//i.test(href) &&
            !/\/answer\//i.test(href) &&
            !/\/profile\//i.test(href) &&
            !/\/topic\//i.test(href);
        });

        const htmlLen = (node.outerHTML || '').length;
        const textLen = text.trim().length;

        let score = 0;
        score += paragraphs * 24;
        score += contentImgs * 18;
        if (answerLinks > 0) score += 10;
        if (hasQuestion) score += 12;
        if (hasViews) score += 14;
        if (topicLinks > 0) score += 4;
        if (profileLinks > 0) score += 4;

        // Prefer a reasonably tight card, not the whole root/page shell
        if (htmlLen > 120000) score -= 120;
        else if (htmlLen > 80000) score -= 80;
        else if (htmlLen > 50000) score -= 40;

        if (textLen > 12000) score -= 40;
        else if (textLen > 8000) score -= 20;

        // Card should usually have just one answer link for this page
        if (answerLinks > 2) score -= 25;

        if (paragraphs > 0 && score > bestScore) {
          best = node;
          bestScore = score;
        }
      }
      node = node.parentElement;
    }

    return best || answerAnchor.closest('div') || answerAnchor.parentElement;
  }

  _findQuoraContentRoot(card) {
    const candidates = [card, ...Array.from(card.querySelectorAll('div, section, article, span'))];
    let best = null;
    let bestScore = -1;

    for (const el of candidates) {
      if (!el || !el.querySelectorAll) continue;

      const paragraphs = el.querySelectorAll('p').length;
      if (paragraphs === 0) continue;

      const imgs = Array.from(el.querySelectorAll('img')).filter(img => this._isLikelyContentImage(img)).length;
      const textLen = (el.innerText || '').trim().length;
      const text = el.innerText || '';

      let score = 0;
      score += paragraphs * 30;
      score += imgs * 16;
      score += Math.min(textLen, 5000) / 200;

      if (/\bviews\b/i.test(text) && /upvotes?/i.test(text)) score -= 30;
      if (/\bUpvote\b|\bComment\b|\bShare\b/.test(text)) score -= 20;
      if (Array.from(el.querySelectorAll('a[href*="/topic/"]')).length > 0) score -= 12;

      if (score > bestScore) {
        best = el;
        bestScore = score;
      }
    }

    return best || card;
  }

  _extractQuoraBlocks(root) {
    const blocks = [];
    let stop = false;
    let started = false;

    const visit = (node) => {
      if (!node || stop) return;

      if (node.nodeType !== 1) return;

      const tag = node.tagName.toLowerCase();
      const nodeText = this._getTextContent(node);

      if (started && this._isQuoraAfterAnswerBoundary(node, nodeText)) {
        stop = true;
        return;
      }

      if (tag === 'p') {
        const text = this._getTextContent(node);
        if (text) {
          started = true;
          blocks.push({ type: 'paragraph', text });
        }
        return;
      }

      if (tag === 'img') {
        const src = this._maybeAbsoluteUrl(node.getAttribute('src') || node.src || '');
        if (this._isLikelyContentImage(node, src)) {
          started = true;
          blocks.push({
            type: 'image',
            src,
            alt: node.getAttribute('alt') || '',
          });
        }
        return;
      }

      if (tag === 'blockquote') {
        const text = this._getTextContent(node);
        if (text) {
          started = true;
          blocks.push({ type: 'blockquote', text });
        }
        return;
      }

      if (tag === 'ul' || tag === 'ol') {
        const items = Array.from(node.querySelectorAll(':scope > li'))
          .map(li => this._getTextContent(li))
          .filter(Boolean);
        if (items.length) {
          started = true;
          blocks.push({ type: tag === 'ul' ? 'ul' : 'ol', items });
        }
        return;
      }

      for (const child of Array.from(node.childNodes)) {
        visit(child);
        if (stop) break;
      }
    };

    visit(root);

    return this._dedupeAdjacentBlocks(blocks);
  }

  _isQuoraAfterAnswerBoundary(node, text) {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    if (!t) return false;

    const cls = String(node.className || '');
    const aria = String(node.getAttribute && node.getAttribute('aria-label') || '');

    const looksLikeStatsRow =
      /\bviews\b/i.test(t) &&
      (/upvotes?/i.test(t) || /shares?/i.test(t));

    const looksLikeActionBar =
      (/\bUpvote\b/.test(t) && /\bComment\b/.test(t)) ||
      (/\bComment\b/.test(t) && /\bShare\b/.test(t));

    const looksLikeCommentEntry =
      /\bAdd a comment\b/i.test(t) ||
      /\bComments?\b/i.test(t) && /\bSort\b/i.test(t);

    const classSuggestsUi =
      /action_bar|comment|reply|composer|footer/i.test(cls);

    const ariaSuggestsUi =
      /upvote|comment|share|reply/i.test(aria);

    // Only stop on elements that look specifically like UI/footer/comment boundaries,
    // not broad containers that merely contain those words somewhere inside.
    if (looksLikeStatsRow && (classSuggestsUi || ariaSuggestsUi || t.length < 120)) return true;
    if (looksLikeActionBar && (classSuggestsUi || ariaSuggestsUi || t.length < 200)) return true;
    if (looksLikeCommentEntry) return true;

    return false;
  }

  _buildCleanAnswerCardHtml(data) {
    const esc = (s) => String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const topicHtml = (data.topics || [])
      .map(t => '<a class="topic" href="' + esc(t.url) + '">' + esc(t.text) + '</a>')
      .join('');

    const blockHtml = (data.blocks || []).map(block => {
      if (block.type === 'paragraph') {
        return '<p>' + esc(block.text) + '</p>';
      }
      if (block.type === 'image') {
        return '<div class="imgWrap"><img src="' + esc(block.src) + '" alt="' + esc(block.alt || '') + '"></div>';
      }
      if (block.type === 'blockquote') {
        return '<blockquote>' + esc(block.text) + '</blockquote>';
      }
      if (block.type === 'ul') {
        return '<ul>' + block.items.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
      }
      if (block.type === 'ol') {
        return '<ol>' + block.items.map(x => '<li>' + esc(x) + '</li>').join('') + '</ol>';
      }
      return '';
    }).join('\n');

    return [
      '<div class="quora-answer-card-clean">',
      '  <style>',
      '    .quora-answer-card-clean{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#222;background:#fff;border:1px solid #ddd;border-radius:14px;padding:20px;max-width:760px;margin:0 auto;}',
      '    .quora-answer-card-clean .topics{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;}',
      '    .quora-answer-card-clean .topic{font-size:12px;text-decoration:none;color:#444;background:#f1f1f1;border-radius:999px;padding:4px 10px;}',
      '    .quora-answer-card-clean h1{font-size:28px;line-height:1.2;margin:0 0 14px 0;}',
      '    .quora-answer-card-clean .meta{font-size:14px;color:#666;margin-bottom:16px;}',
      '    .quora-answer-card-clean p{margin:0 0 1em 0;}',
      '    .quora-answer-card-clean .imgWrap{margin:0 0 1em 0;}',
      '    .quora-answer-card-clean img{max-width:100%;height:auto;display:block;margin:0 auto;border-radius:8px;}',
      '    .quora-answer-card-clean .stats{font-size:13px;color:#666;border-top:1px solid #eee;padding-top:12px;margin-top:18px;display:flex;gap:18px;flex-wrap:wrap;}',
      '    .quora-answer-card-clean a.mainlink{color:#0a58ca;text-decoration:none;}',
      '  </style>',
      topicHtml ? '  <div class="topics">' + topicHtml + '</div>' : '',
      '  <h1><a class="mainlink" href="' + esc(data.questionUrl) + '">' + esc(data.title) + '</a></h1>',
      '  <div class="meta">By <a class="mainlink" href="' + esc(data.authorUrl) + '">' + esc(data.author) + '</a>' +
      (data.timestampText ? ' · <a class="mainlink" href="' + esc(data.answerUrl) + '">' + esc(data.timestampText) + '</a>' : '') +
      '</div>',
      '  <div class="body">' + blockHtml + '</div>',
      '  <div class="stats">' +
        (data.viewsText ? '<span>' + esc(data.viewsText) + ' views</span>' : '') +
        (data.upvotesText ? '<span>' + esc(data.upvotesText) + ' upvotes</span>' : '') +
        (data.sharesText ? '<span>' + esc(data.sharesText) + ' shares</span>' : '') +
      '</div>',
      '</div>'
    ].filter(Boolean).join('\n');
  }

  _dedupeAdjacentBlocks(blocks) {
    const out = [];
    for (const block of blocks) {
      const prev = out[out.length - 1];
      if (!prev) {
        out.push(block);
        continue;
      }

      if (block.type === 'paragraph' && prev.type === 'paragraph' && block.text === prev.text) continue;
      if (block.type === 'image' && prev.type === 'image' && block.src === prev.src) continue;

      out.push(block);
    }
    return out;
  }

  _extractQuoraTopics(card) {
    return Array.from(card.querySelectorAll('a[href*="/topic/"]'))
      .map(a => ({
        text: this._getTextContent(a),
        url: this._maybeAbsoluteUrl(a.getAttribute('href') || a.href || ''),
      }))
      .filter(x => x.text && x.url);
  }

  _extractQuoraStats(card) {
    const text = card.innerText || '';

    const viewsMatch = text.match(/([\d.,KMB]+)\s*views/i);
    const upvotesMatch = text.match(/View\s+([\d.,KMB]+)\s+upvotes?/i) || text.match(/([\d.,KMB]+)\s+upvotes?/i);
    const sharesMatch = text.match(/View\s+([\d.,KMB]+)\s+shares?/i) || text.match(/([\d.,KMB]+)\s+shares?/i);

    return {
      viewsText: viewsMatch ? viewsMatch[1] : '',
      upvotesText: upvotesMatch ? upvotesMatch[1] : '',
      sharesText: sharesMatch ? sharesMatch[1] : '',
    };
  }

  _isLikelyContentImage(imgOrSrc, explicitSrc) {
    const src = explicitSrc || (imgOrSrc && (imgOrSrc.getAttribute ? imgOrSrc.getAttribute('src') : imgOrSrc.src)) || '';
    const s = String(src || '');
    if (!s) return false;
    if (!/^https?:\/\//i.test(s)) return false;
    if (!/quoracdn\.net|quora\.com/i.test(s)) return false;
    if (/thumb-|profile photo|Profile photo/i.test(s)) return false;
    if (/main-qimg-|main-custom-t-/i.test(s)) return true;
    return false;
  }

  _getTextContent(el) {
    return String((el && (el.innerText || el.textContent)) || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  _maybeAbsoluteUrl(url) {
    try {
      return new URL(url, location.href).toString();
    } catch (e) {
      return String(url || '');
    }
  }

  _slugFromAnswerUrl(url) {
    try {
      const u = new URL(url, location.href);
      const parts = u.pathname.split('/').filter(Boolean);
      const answerIdx = parts.findIndex(x => x.toLowerCase() === 'answer');
      const slug = answerIdx > 0 ? parts[answerIdx - 1] : parts[parts.length - 1] || 'quora-answer';
      return decodeURIComponent(slug).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 180);
    } catch (e) {
      return 'quora-answer';
    }
  }
    async _actionIframeExtractQuoraAnswerCard(req, id) {
    const url = String(req.url || '').replace(/^http:\/\//i, 'https://');
    const waitMs = Number(req.waitMs || 2500);

    if (!url) {
      this._sendErrorRelay(id, 'NO_URL', 'Missing url for IFRAME_EXTRACT_QUORA_ANSWER_CARD.');
      return;
    }

    try {
      const old = document.getElementById('yolo_extract_iframe');
      if (old) old.remove();

      const ifr = document.createElement('iframe');
      ifr.id = 'yolo_extract_iframe';
      ifr.style.position = 'fixed';
      ifr.style.right = '10px';
      ifr.style.bottom = '10px';
      ifr.style.width = '420px';
      ifr.style.height = '320px';
      ifr.style.zIndex = '2147483647';
      ifr.style.background = '#fff';
      ifr.style.border = '2px solid #2563eb';
      ifr.style.borderRadius = '8px';
      ifr.style.boxShadow = '0 8px 30px rgba(0,0,0,0.4)';
      ifr.src = url;
      document.body.appendChild(ifr);

      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('iframe load timeout')), 25000);
        ifr.onload = () => {
          clearTimeout(timer);
          resolve();
        };
        ifr.onerror = () => {
          clearTimeout(timer);
          reject(new Error('iframe load failed'));
        };
      });

      await new Promise(resolve => setTimeout(resolve, waitMs));

      const doc = ifr.contentDocument || (ifr.contentWindow && ifr.contentWindow.document);
      const pageUrl = (ifr.contentWindow && ifr.contentWindow.location && ifr.contentWindow.location.href) || url;
      const pageTitle = (doc && doc.title) || '';
      if (!doc) throw new Error('iframe document unavailable');

      const textOf = (el) => String((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();
      const abs = (u) => {
        try { return new URL(u, pageUrl).toString(); }
        catch (e) { return String(u || ''); }
      };
      const isImg = (src) => {
        const s = String(src || '');
        if (!s) return false;
        if (!/^https?:\/\//i.test(s)) return false;
        if (!/quoracdn\.net|quora\.com/i.test(s)) return false;
        if (/thumb-|profile photo|Profile photo/i.test(s)) return false;
        return /main-qimg-|main-custom-t-/i.test(s);
      };

      const findCard = () => {
        const answerAnchor =
          doc.querySelector('a.answer_timestamp[href*="/answer/"]') ||
          Array.from(doc.querySelectorAll('a[href*="/answer/"]')).find(a => /\/answer\//i.test(a.href || ''));

        if (!answerAnchor) return null;

        let node = answerAnchor;
        let best = null;
        let bestScore = -1;

        while (node && node !== doc.body) {
          if (node.querySelectorAll) {
            const paragraphs = node.querySelectorAll('p').length;
            const contentImgs = Array.from(node.querySelectorAll('img'))
              .filter(img => isImg(img.getAttribute('src') || img.src || '')).length;
            const t = node.innerText || '';
            const htmlLen = (node.outerHTML || '').length;

            let score = 0;
            score += paragraphs * 24;
            score += contentImgs * 18;
            if (/\bviews\b/i.test(t)) score += 14;
            if (Array.from(node.querySelectorAll('a[href*="/topic/"]')).length > 0) score += 4;
            if (htmlLen > 120000) score -= 120;
            else if (htmlLen > 80000) score -= 80;
            else if (htmlLen > 50000) score -= 40;

            if (paragraphs > 0 && score > bestScore) {
              best = node;
              bestScore = score;
            }
          }
          node = node.parentElement;
        }

        return best || answerAnchor.closest('div') || answerAnchor.parentElement;
      };

      const card = findCard();
      if (!card) throw new Error('Could not find Quora answer card in iframe');

      const findContentRoot = () => {
        const candidates = [card, ...Array.from(card.querySelectorAll('div, section, article, span'))];
        let best = null;
        let bestScore = -1;

        for (const el of candidates) {
          if (!el || !el.querySelectorAll) continue;
          const paragraphs = el.querySelectorAll('p').length;
          if (paragraphs === 0) continue;
          const imgs = Array.from(el.querySelectorAll('img'))
            .filter(img => isImg(img.getAttribute('src') || img.src || '')).length;
          const t = el.innerText || '';

          let score = 0;
          score += paragraphs * 30;
          score += imgs * 16;
          if (/\bviews\b/i.test(t) && /upvotes?/i.test(t)) score -= 30;
          if (/\bUpvote\b|\bComment\b|\bShare\b/.test(t)) score -= 20;
          if (Array.from(el.querySelectorAll('a[href*="/topic/"]')).length > 0) score -= 12;

          if (score > bestScore) {
            best = el;
            bestScore = score;
          }
        }

        return best || card;
      };

      const contentRoot = findContentRoot();

      const isBoundary = (node, t) => {
        const cls = String(node.className || '');
        const aria = String((node.getAttribute && node.getAttribute('aria-label')) || '');

        const looksLikeStatsRow = /\bviews\b/i.test(t) && (/upvotes?/i.test(t) || /shares?/i.test(t));
        const looksLikeActionBar = (/\bUpvote\b/.test(t) && /\bComment\b/.test(t)) || (/\bComment\b/.test(t) && /\bShare\b/.test(t));
        const looksLikeCommentEntry = /\bAdd a comment\b/i.test(t) || (/\bComments?\b/i.test(t) && /\bSort\b/i.test(t));
        const classSuggestsUi = /action_bar|comment|reply|composer|footer/i.test(cls);
        const ariaSuggestsUi = /upvote|comment|share|reply/i.test(aria);

        if (looksLikeStatsRow && (classSuggestsUi || ariaSuggestsUi || t.length < 120)) return true;
        if (looksLikeActionBar && (classSuggestsUi || ariaSuggestsUi || t.length < 200)) return true;
        if (looksLikeCommentEntry) return true;

        return false;
      };

      const blocks = [];
      let stop = false;
      let started = false;

      const visit = (node) => {
        if (!node || stop) return;
        if (node.nodeType !== 1) return;

        const tag = node.tagName.toLowerCase();
        const nodeText = textOf(node);

        if (started && isBoundary(node, nodeText)) {
          stop = true;
          return;
        }

        if (tag === 'p') {
          if (nodeText) {
            started = true;
            blocks.push({ type: 'paragraph', text: nodeText });
          }
          return;
        }

        if (tag === 'img') {
          const src = abs(node.getAttribute('src') || node.src || '');
          if (isImg(src)) {
            started = true;
            blocks.push({ type: 'image', src, alt: node.getAttribute('alt') || '' });
          }
          return;
        }

        if (tag === 'blockquote') {
          if (nodeText) {
            started = true;
            blocks.push({ type: 'blockquote', text: nodeText });
          }
          return;
        }

        if (tag === 'ul' || tag === 'ol') {
          const items = Array.from(node.querySelectorAll(':scope > li'))
            .map(li => textOf(li))
            .filter(Boolean);
          if (items.length) {
            started = true;
            blocks.push({ type: tag, items });
          }
          return;
        }

        for (const child of Array.from(node.childNodes)) {
          visit(child);
          if (stop) break;
        }
      };

      visit(contentRoot);

      const deduped = [];
      for (const block of blocks) {
        const prev = deduped[deduped.length - 1];
        if (!prev) {
          deduped.push(block);
          continue;
        }
        if (block.type === 'paragraph' && prev.type === 'paragraph' && block.text === prev.text) continue;
        if (block.type === 'image' && prev.type === 'image' && block.src === prev.src) continue;
        deduped.push(block);
      }

      const titleAnchor =
        (doc.querySelector('.puppeteer_test_question_title') && doc.querySelector('.puppeteer_test_question_title').closest('a[href]')) ||
        Array.from(card.querySelectorAll('a[href]')).find(a => {
          const href = a.href || '';
          return /quora\.com\//i.test(href) &&
            !/\/answer\//i.test(href) &&
            !/\/profile\//i.test(href) &&
            !/\/topic\//i.test(href);
        });

      const answerAnchor =
        card.querySelector('a.answer_timestamp[href*="/answer/"]') ||
        Array.from(card.querySelectorAll('a[href*="/answer/"]')).find(a => /\/answer\//i.test(a.href || ''));

      const authorAnchor =
        Array.from(card.querySelectorAll('a[href*="/profile/"]')).find(a => {
          const href = a.href || '';
          const t = textOf(a);
          return /rob-brown-13/i.test(href) || /^rob brown$/i.test(t);
        }) ||
        Array.from(card.querySelectorAll('a[href*="/profile/"]')).find(a => /\/profile\//i.test(a.href || ''));

      const topics = Array.from(card.querySelectorAll('a[href*="/topic/"]'))
        .map(a => ({ text: textOf(a), url: abs(a.getAttribute('href') || a.href || '') }))
        .filter(x => x.text && x.url);

      const pageText = card.innerText || '';
      const viewsMatch = pageText.match(/([\d.,KMB]+)\s*views/i);
      const upvotesMatch = pageText.match(/View\s+([\d.,KMB]+)\s+upvotes?/i) || pageText.match(/([\d.,KMB]+)\s+upvotes?/i);
      const sharesMatch = pageText.match(/View\s+([\d.,KMB]+)\s+shares?/i) || pageText.match(/([\d.,KMB]+)\s+shares?/i);

      const esc = (s) => String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

      const cleanHtml = [
        '<div class="quora-answer-card-clean">',
        '<style>',
        '.quora-answer-card-clean{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#222;background:#fff;border:1px solid #ddd;border-radius:14px;padding:20px;max-width:760px;margin:0 auto;}',
        '.quora-answer-card-clean .topics{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;}',
        '.quora-answer-card-clean .topic{font-size:12px;text-decoration:none;color:#444;background:#f1f1f1;border-radius:999px;padding:4px 10px;}',
        '.quora-answer-card-clean h1{font-size:28px;line-height:1.2;margin:0 0 14px 0;}',
        '.quora-answer-card-clean .meta{font-size:14px;color:#666;margin-bottom:16px;}',
        '.quora-answer-card-clean p{margin:0 0 1em 0;}',
        '.quora-answer-card-clean .imgWrap{margin:0 0 1em 0;}',
        '.quora-answer-card-clean img{max-width:100%;height:auto;display:block;margin:0 auto;border-radius:8px;}',
        '.quora-answer-card-clean .stats{font-size:13px;color:#666;border-top:1px solid #eee;padding-top:12px;margin-top:18px;display:flex;gap:18px;flex-wrap:wrap;}',
        '.quora-answer-card-clean a.mainlink{color:#0a58ca;text-decoration:none;}',
        '</style>',
        topics.length ? '<div class="topics">' + topics.map(t => '<a class="topic" href="' + esc(t.url) + '">' + esc(t.text) + '</a>').join('') + '</div>' : '',
        '<h1><a class="mainlink" href="' + esc(titleAnchor ? abs(titleAnchor.getAttribute('href') || titleAnchor.href || '') : pageUrl) + '">' + esc(titleAnchor ? textOf(titleAnchor) : pageTitle) + '</a></h1>',
        '<div class="meta">By <a class="mainlink" href="' + esc(authorAnchor ? abs(authorAnchor.getAttribute('href') || authorAnchor.href || '') : 'https://www.quora.com/profile/Rob-Brown-13') + '">' + esc(authorAnchor ? textOf(authorAnchor) : 'Rob Brown') + '</a>' +
          (answerAnchor ? ' · <a class="mainlink" href="' + esc(abs(answerAnchor.getAttribute('href') || answerAnchor.href || '')) + '">' + esc(textOf(answerAnchor)) + '</a>' : '') +
        '</div>',
        '<div class="body">' + deduped.map(block => {
          if (block.type === 'paragraph') return '<p>' + esc(block.text) + '</p>';
          if (block.type === 'image') return '<div class="imgWrap"><img src="' + esc(block.src) + '" alt="' + esc(block.alt || '') + '"></div>';
          if (block.type === 'blockquote') return '<blockquote>' + esc(block.text) + '</blockquote>';
          if (block.type === 'ul') return '<ul>' + block.items.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
          if (block.type === 'ol') return '<ol>' + block.items.map(x => '<li>' + esc(x) + '</li>').join('') + '</ol>';
          return '';
        }).join('') + '</div>',
        '<div class="stats">' +
          (viewsMatch ? '<span>' + esc(viewsMatch[1]) + ' views</span>' : '') +
          (upvotesMatch ? '<span>' + esc(upvotesMatch[1]) + ' upvotes</span>' : '') +
          (sharesMatch ? '<span>' + esc(sharesMatch[1]) + ' shares</span>' : '') +
        '</div>',
        '</div>'
      ].join('');

      const text = deduped.filter(b => b.type === 'paragraph').map(b => b.text).join('\\n\\n');
      const slugMatch = String(pageUrl).split('?')[0].match(/quora\.com\/([^/]+)\/answer\/Rob-Brown-13/i);
      const slug = slugMatch
        ? decodeURIComponent(slugMatch[1]).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 180)
        : 'quora-answer';

     this._sendResultRelay(id, {
        ok: true,
        pageUrl,
        pageTitle,
        title: titleAnchor ? textOf(titleAnchor) : pageTitle,
        slug,
        questionUrl: titleAnchor ? abs(titleAnchor.getAttribute('href') || titleAnchor.href || '') : '',
        answerUrl: answerAnchor ? abs(answerAnchor.getAttribute('href') || answerAnchor.href || '') : pageUrl,
        author: authorAnchor ? textOf(authorAnchor) : 'Rob Brown',
        authorUrl: authorAnchor ? abs(authorAnchor.getAttribute('href') || authorAnchor.href || '') : 'https://www.quora.com/profile/Rob-Brown-13',
        timestampText: answerAnchor ? textOf(answerAnchor) : '',
        topics,
        viewsText: viewsMatch ? viewsMatch[1] : '',
        upvotesText: upvotesMatch ? upvotesMatch[1] : '',
        sharesText: sharesMatch ? sharesMatch[1] : '',
        paragraphCount: deduped.filter(b => b.type === 'paragraph').length,
        imageCount: deduped.filter(b => b.type === 'image').length,
        blocks: deduped,
        text,
        answerCardHtml: cleanHtml,
        contentHtml: contentRoot.innerHTML || ''
      });
      
    } catch (e) {
      this._sendErrorRelay(id, 'IFRAME_EXTRACT_QUORA_ANSWER_CARD_FAILED', e.message || String(e));
    }
  }

  // Prune old Quora profile cards to stop the DOM from growing unbounded.
  _actionPruneQuoraDom(req) {
    const keepCount = Number(req.keepCount) || 12;
    const CARD_SEL = 'div.qu-borderAll.qu-borderColor--raised.qu-boxShadow--small.qu-mb--small.qu-bg--raised';
    const cards = Array.from(document.querySelectorAll(CARD_SEL));
    const contentCards = cards.slice(1);
    const pruneCount = Math.max(0, contentCards.length - keepCount);
    let prunedThisRound = 0;
    for (let i = 0; i < pruneCount; i++) {
      const card = contentCards[i];
      if (card.dataset.yoloPruned === '1') continue;
      const h = card.offsetHeight;
      card.style.minHeight = h + 'px';
      card.style.height = h + 'px';
      card.style.overflow = 'hidden';
      while (card.firstChild) card.removeChild(card.firstChild);
      card.dataset.yoloPruned = '1';
      prunedThisRound++;
    }
    return {
      prunedThisRound: prunedThisRound,
      totalCards: cards.length,
      contentCards: contentCards.length,
      remaining: contentCards.length - pruneCount,
      keepCount: keepCount
    };
  }

  _actionPruneQuoraProfileCards(req) {
    const keepCount = Number(req.keepCount) || 12;
    const CARD_SEL = 'div.qu-borderAll.qu-borderColor--raised.qu-boxShadow--small.qu-mb--small.qu-bg--raised';
    const cards = Array.from(document.querySelectorAll(CARD_SEL));
    const contentCards = cards.slice(1);
    const pruneCount = Math.max(0, contentCards.length - keepCount);
    let removed = 0;
    for (let i = 0; i < pruneCount; i++) {
      const card = contentCards[i];
      try {
        card.parentElement.removeChild(card);
        removed++;
      } catch (e) {
        const h = card.offsetHeight;
        card.style.minHeight = h + 'px';
        card.style.height = h + 'px';
        card.style.overflow = 'hidden';
        while (card.firstChild) card.removeChild(card.firstChild);
        card.dataset.yoloPruned = '1';
        removed++;
      }
    }
    return {
      prunedThisRound: removed,
      removed: removed,
      totalCards: cards.length,
      contentCards: contentCards.length,
      remaining: contentCards.length - removed,
      keepCount: keepCount
    };
  }

  // ---- Helpers ----

  _actionCloseWindow(req) {
    const href = location.href;
    setTimeout(() => {
      try { window.close(); } catch (e) {}
    }, 60);
    return { ok: true, closing: true, href: href };
  }

  _getOne(selector, index) {
    const idx = index || 0;
    const els = document.querySelectorAll(selector);
    if (els.length === 0) throw new Error('No elements match: ' + selector);
    if (idx >= els.length) throw new Error('Index ' + idx + ' out of range, found ' + els.length + ' for: ' + selector);
    return els[idx];
  }

  _sendResult(id, data) {
    this.messenger.send('RPC_RES', { id: id, ok: true, data: data });
  }

  _sendError(id, code, message) {
    console.warn('[YoloTargetAgent] Error:', code, message);
    this.messenger.send('RPC_RES', { id: id, ok: false, error: { code: code, message: message } });
  }

  _sendResultRelay(id, data) {
    const payload = { id: id, ok: true, data: data };
    try { this.messenger.send('RPC_RES', payload); } catch (e) {}
    window.postMessage({ type: 'YOLO_RPC_RES_RELAY', payload: { rpcType: 'RPC_RES', rpcPayload: payload } }, '*');
  }

  _sendErrorRelay(id, code, message) {
    console.warn('[YoloTargetAgent] Error:', code, message);
    const payload = { id: id, ok: false, error: { code: code, message: message } };
    try { this.messenger.send('RPC_RES', payload); } catch (e) {}
    window.postMessage({ type: 'YOLO_RPC_RES_RELAY', payload: { rpcType: 'RPC_RES', rpcPayload: payload } }, '*');
  }

  static _postRelayMessage(type, payload) {
    try {
      window.postMessage({
        __YOLO_RELAY_BRIDGE: true,
        type: type,
        payload: payload || {},
        ts: Date.now()
      }, "*");
      return true;
    } catch (e) {
      console.warn("[YoloTargetAgent] relay bridge post failed:", e);
      return false;
    }
  }

  static _installRelayBridge(...args) {
    if (this._relayBridgeInstalled) return;
    this._relayBridgeInstalled = true;
  
    window.addEventListener("message", (event) => {
      if (!event || event.source !== window) return;
      const msg = event.data;
      if (!msg || !msg.__YOLO_RELAY_BRIDGE || !msg.type) return;
  
      if (msg.type === "YOLO_RPC_REQ_DELIVERY" && msg.payload) {
        const p = msg.payload;
        if (p && p.id && p.action) {
          this._handleRequest({
            id: p.id,
            action: p.action,
            ...p
          });
        }
      }
    });
  }

  static _registerViaRelay(...args) {
    const href = String(location.href || "").split("#")[0];
    try {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: "YOLO_TARGET_REGISTER", href: href }, () => {});
        return true;
      }
    } catch (e) {
      console.warn("[YoloTargetAgent] direct relay registration failed:", e);
    }
    return this._postRelayMessage("YOLO_TARGET_REGISTER", { href: href });
  }

  static _scrollElementByInfo(info, options = {}) {
      // (Restored closure of previously truncated function)
  }

  _parseRecipe(node, recipe) {
    if (!node || !recipe) return null;

    const result = {};
    const textOf = (el) => String((el && (el.innerText || el.textContent)) || '').replace(/\s+/g, ' ').trim();

    for (const [key, rule] of Object.entries(recipe)) {
      // If it's a direct selector rule
      if (rule && typeof rule === 'object' && rule.type) {
        let el = rule.selector ? node.querySelector(rule.selector) : node;
        if (!el && !rule.optional) {
          result[key] = null;
          continue;
        }

        if (rule.type === 'text') {
          result[key] = el ? textOf(el) : null;
        } else if (rule.type === 'attribute') {
          result[key] = el ? (el.getAttribute(rule.attribute) || el[rule.attribute]) : null;
          // Clean URLs automatically if requested
          if (rule.resolveUrl && result[key]) {
             try { result[key] = new URL(result[key], location.href).toString(); } catch(e){}
          }
        } else if (rule.type === 'html') {
          result[key] = el ? el.innerHTML : null;
        } else if (rule.type === 'outerHtml') {
          result[key] = el ? el.outerHTML : null;
        } else if (rule.type === 'list') {
          const els = rule.selector ? Array.from(node.querySelectorAll(rule.selector)) : [];
          result[key] = els.map(childEl => {
            if (rule.schema) return this._parseRecipe(childEl, rule.schema);
            return textOf(childEl); // fallback to raw text if no sub-schema
          });
        } else if (rule.type === 'exists') {
          result[key] = !!el;
        }
      } 
      // If it's a nested schema object
      else if (rule && typeof rule === 'object') {
        result[key] = this._parseRecipe(node, rule);
      }
    }
    return result;
  }

  _actionExecuteRecipe(req) {
    const rootNode = req.rootSelector ? document.querySelector(req.rootSelector) : document.body;
    if (!rootNode) return { error: `Root selector not found: ${req.rootSelector}` };

    const data = this._parseRecipe(rootNode, req.recipe);
    return { data, url: location.href, title: document.title };
  }

  async _actionIframeExecuteRecipe(req, id) {
    const url = req.url;
    const waitMs = req.waitMs || 3000;
    const recipe = req.recipe;

    if (!url || !recipe) {
      if (this._sendErrorRelay) this._sendErrorRelay(id, 'INVALID_ARGS', 'Missing url or recipe.');
      else this._sendError(id, 'INVALID_ARGS', 'Missing url or recipe.');
      return;
    }

    try {
      const old = document.getElementById('yolo_generic_iframe');
      if (old) old.remove();

      const ifr = document.createElement('iframe');
      ifr.id = 'yolo_generic_iframe';
      ifr.style.position = 'fixed';
      ifr.style.right = '10px';
      ifr.style.bottom = '10px';
      ifr.style.width = '420px';
      ifr.style.height = '320px';
      ifr.style.zIndex = '2147483647';
      ifr.style.background = '#fff';
      ifr.style.border = '2px solid #10b981'; // Green border for generic scraper
      ifr.style.borderRadius = '8px';
      ifr.style.boxShadow = '0 8px 30px rgba(0,0,0,0.4)';
      ifr.src = url;
      document.body.appendChild(ifr);

      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('iframe load timeout')), 25000);
        ifr.onload = () => { clearTimeout(timer); resolve(); };
        ifr.onerror = () => { clearTimeout(timer); reject(new Error('iframe load failed')); };
      });

      await new Promise(resolve => setTimeout(resolve, waitMs));

      const doc = ifr.contentDocument || (ifr.contentWindow && ifr.contentWindow.document);
      if (!doc) throw new Error('iframe document unavailable (CORS or blank)');

      const rootNode = req.rootSelector ? doc.querySelector(req.rootSelector) : doc.body;
      const data = rootNode ? this._parseRecipe(rootNode, recipe) : null;

      const pageUrl = (ifr.contentWindow && ifr.contentWindow.location && ifr.contentWindow.location.href) || url;

      if (req.cleanup !== false) {
        ifr.remove();
      }

      const result = { data, url: pageUrl, title: doc.title };

      if (this._sendResultRelay) this._sendResultRelay(id, result);
      else this._sendResult(id, result);

    } catch (e) {
      if (this._sendErrorRelay) this._sendErrorRelay(id, 'IFRAME_EXECUTE_FAILED', e.message || String(e));
      else this._sendError(id, 'IFRAME_EXECUTE_FAILED', e.message || String(e));

      const ifr = document.getElementById('yolo_generic_iframe');
      if (ifr && req.cleanup !== false) ifr.remove();
    }
  }

  _actionPruneDom(req) {
    const keepCount = Number(req.keepCount) || 12;
    const selector = req.selector;
    if (!selector) return { error: 'No selector provided for pruning' };

    const elements = Array.from(document.querySelectorAll(selector));
    // We assume the most recent items are at the end, so we prune from the beginning
    const pruneCount = Math.max(0, elements.length - keepCount);

    let prunedThisRound = 0;
    for (let i = 0; i < pruneCount; i++) {
      const el = elements[i];
      if (el.dataset.yoloPruned === '1') continue;

      const h = el.offsetHeight;
      el.style.minHeight = h + 'px';
      el.style.height = h + 'px';
      el.style.overflow = 'hidden';

      while (el.firstChild) el.removeChild(el.firstChild);
      el.dataset.yoloPruned = '1';
      prunedThisRound++;
    }

    return {
      prunedThisRound: prunedThisRound,
      totalElements: elements.length,
      remaining: elements.length - pruneCount,
      keepCount: keepCount
    };
  }

}