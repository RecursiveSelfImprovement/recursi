class LlmHelper {
  constructor() {
    this.processedElements = new WeakSet();
    this.ui = null;
    this.scanInterval = null;
    this._stateKey =
      '__recursiLlmHelperState_v2:' + location.host + ':' + location.pathname;
    this._state = { v: 2, bySig: {} };
    this._saveTimer = null;
    this._saveDirty = false;
    this.documentMap = { groups: new Map() };
    this.isConnected = false;
    this._isScanning = false;
  }

  init(...args) {
    this.injectStyles();
    this._loadState();
    this._initExtensionBridge();
    this.startLoop();
  }

  injectStyles() {
    const css =
      '.recursi-shim-base { display: block; width: 100%; overflow: hidden; background-color: #1e1e1e; box-sizing: border-box; padding: 12px; margin-bottom: 15px; position: relative; cursor: pointer; z-index: 5; border-radius: 6px; transition: border-color 0.2s; }' +
      '.recursi-code-shim { height: 130px; color: #d4d4d4; font-family: Consolas, "Courier New", monospace; font-size: 13px; line-height: 1.5; white-space: pre; border: 1px solid #007acc; border-left: 6px solid #007acc; }' +
      '.recursi-prompt-shim { height: 60px; color: #e0e0e0; font-family: system-ui, -apple-system, sans-serif; font-size: 14px; line-height: 1.4; white-space: pre-wrap; border: 1px solid rgba(211, 84, 0, 0.3); border-left: 6px solid #d35400; }' +
      '.recursi-cc-indicator { position: absolute; bottom: 0; left: 0; background: #007acc; color: white; font-size: 11px; padding: 3px 6px; border-top-right-radius: 6px; z-index: 10; display: flex; align-items: center; gap: 4px; line-height: 1.2; }' +
      '.recursi-prompt-shim .recursi-cc-indicator { background: #d35400 !important; }' +
      '.recursi-cc-cb { width: 12px; height: 12px; cursor: pointer; accent-color: #fff; margin: 0; }' +
      '.recursi-shim-copy-btn { position: absolute; right: 4px; top: 4px; background: transparent; border: none; color: #007acc; cursor: pointer; opacity: 0.6; padding: 4px; z-index: 20; display: flex; align-items: center; justify-content: center; border-radius: 4px; }' +
      '.recursi-original-decorated { border: 1px solid #007acc !important; border-left: 6px solid #007acc !important; border-radius: 6px !important; display: block !important; position: relative !important; }' +
      '.recursi-original-decorated.prompt-style { border: 1px solid rgba(211, 84, 0, 0.3) !important; border-left: 6px solid #d35400 !important; background: rgba(40, 40, 40, 0.3) !important; }' +
      '.recursi-force-hidden { display: none !important; }' +
      '.recursi-cc-response-group { position: relative !important; background-color: rgba(0, 60, 144, 0.17) !important; outline: 1px solid #09f !important; border-radius: 8px !important; padding: 10px !important; }' +
      '.recursi-cc-copy-btn { position: absolute !important; right: 10px; bottom: 3px; z-index: 50; background: transparent; border: none; cursor: pointer; color: #09f; }' +
      '.recursi-collapse-trigger { position: absolute !important; left: 0; top: 0; bottom: 0; width: 22px; z-index: 100; cursor: pointer; }' +
      '.recursi-collapse-trigger::after { content: ""; position: absolute; left: 3px; top: 5%; bottom: 5%; width: 4px; background-color: #007acc; opacity: 0; border-radius: 2px; transition: opacity 0.2s; }' +
      '.recursi-collapse-trigger:hover::after { opacity: 0.8; }' +
      '.recursi-cc-highlight { border-color: #ffd700 !important; border-left-color: #ffd700 !important; box-shadow: 0 0 30px rgba(255, 215, 0, 0.8) !important; transition: none !important; }';
    applyCss(css, 'LlmHelperStyles');
  }

  startLoop() {
    if (this.scanInterval) clearInterval(this.scanInterval);
    const mo = new MutationObserver((mutations) => {
      const isInternal = mutations.every(
        (m) =>
          m.target.classList &&
          (m.target.classList.contains('recursi-original-decorated') ||
            m.target.classList.contains('recursi-shim-base'))
      );
      if (isInternal) return;
      if (this._scanSoonTimer) clearTimeout(this._scanSoonTimer);
      this._scanSoonTimer = setTimeout(() => this.scan(), 800);
    });
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    this.scanInterval = setInterval(() => this.scan(), 4000);
  }

  scan() {
    if (this._isScanning) return;
    this._isScanning = true;
    try {
      this.scanUserPrompts();
      this.scanResponseGroups();
      this.scanGenericTurns();
      const pres = Array.from(document.querySelectorAll('pre'));
      pres.forEach((pre) => {
        if (pre.classList.contains('recursi-code-shim')) return;
        if (pre.closest('.thought-panel') || pre.closest('ms-thought-chunk'))
          return;
        const container = this.findContainer(pre);
        if (!container || container.classList.contains('recursi-shim-base'))
          return;
        if (!container.dataset.recursiShimmed)
          this.createShim(container, pre, 'code');
        const identity = this.identifyNode('code', container, pre);
        container.dataset.recursiCcSig = identity.sig;
        this._registerBlock(identity, container, pre);
        if (container._recursiShimElement)
          this.updateShimContent(
            container._recursiShimElement,
            pre,
            identity.sig,
            'code',
            false
          );
        const state = this._getOrCreateStateForSig(identity.sig);
        this._applyVisibility(container, container._recursiShimElement, state);
      });
      if (this.ui) this.ui.updateStats();
    } finally {
      this._isScanning = false;
    }
  }

  findContainer(pre) {
    if (
      location.host.includes('chatgpt.com') ||
      location.host.includes('openai.com')
    )
      return pre;
    const msBlock = pre.closest('ms-code-block');
    if (msBlock) return msBlock;
    return pre.closest('.code-block-wrapper') || pre.parentElement;
  }

  createShim(container, sourceElement, type) {
    const isPrompt = type === 'prompt';
    const shim = makeElement('div', {
      className:
        'recursi-shim-base ' +
        (isPrompt ? 'recursi-prompt-shim' : 'recursi-code-shim'),
      onclick: (e) => {
        if (!e.target.closest('button,input')) this.toggleShim(container);
      },
    });
    const indicator = makeElement('div', { className: 'recursi-cc-indicator' });
    if (!isPrompt) {
      const cb = makeElement('input', {
        type: 'checkbox',
        className: 'recursi-cc-cb',
        checked: true,
        onclick: (e) => {
          e.stopPropagation();
          const s = this._getOrCreateStateForSig(
            container.dataset.recursiCcSig
          );
          s.checked = e.target.checked;
          this._saveStateSoon();
        },
      });
      indicator.appendChild(cb);
    }
    const badge = makeElement('span', {}, '...');
    indicator.appendChild(badge);
    shim.appendChild(indicator);
    if (!isPrompt) {
      const copy = makeElement('button', {
        className: 'recursi-shim-copy-btn',
        onclick: (e) => {
          e.stopPropagation();
          this.copyBlock(sourceElement);
        },
      });
      copy.appendChild(this.createCopyIcon(20, 2.5, 'currentColor'));
      shim.appendChild(copy);
    }
    container._recursiShimElement = shim;
    shim._recursiLineBadge = badge;
    container.dataset.recursiShimmed = 'true';
    container.parentElement.insertBefore(shim, container);
    container.classList.add('recursi-original-decorated');
    if (isPrompt) container.classList.add('prompt-style');
    const trigger = makeElement('span', {
      className: 'recursi-collapse-trigger',
      onclick: (e) => {
        e.stopPropagation();
        this.toggleShim(container);
      },
    });
    container.insertBefore(trigger, container.firstChild);
  }

  updateShimContent(shim, sourceElement, sig, type, isLastBlock) {
    let text = sourceElement.textContent || '';
    if (shim._recursiLineBadge)
      shim._recursiLineBadge.textContent =
        type === 'code'
          ? text.split('\n').length + ' lines'
          : this.formatBytes(text.length);
    let textContainer =
      shim.querySelector('.recursi-shim-text') ||
      makeElement('div', { className: 'recursi-shim-text' });
    if (!textContainer.parentElement)
      shim.insertBefore(textContainer, shim.firstChild);
    textContainer.textContent = text.split('\n').slice(0, 5).join('\n');
  }

  toggleShim(container) {
    const s = this._getOrCreateStateForSig(container.dataset.recursiCcSig);
    s.expanded = !s.expanded;
    this._saveStateSoon();
    this._applyVisibility(container, container._recursiShimElement, s);
  }

  _applyVisibility(c, s, st) {
    if (!s) return;
    if (st.expanded) {
      c.classList.remove('recursi-force-hidden');
      s.classList.add('recursi-force-hidden');
    } else {
      c.classList.add('recursi-force-hidden');
      s.classList.remove('recursi-force-hidden');
    }
  }

  copyBlock(sourceElement) {
    const text = sourceElement.textContent || '';
    if (this.isConnected) {
      this._sendToYolo({
        action: 'CODE_DELIVERY',
        code: text,
        meta: { id: 'blk_' + Date.now(), source: 'single_block' }
      });
      if (this.ui) this.ui.flashLogoColor('#00ff00');
      const container = this.findContainer(sourceElement);
      if (container && container._recursiShimElement) {
        this._highlightShim(container._recursiShimElement, 'teleport');
      }
    } else {
      const self = this;
      const container = this.findContainer(sourceElement);
      navigator.clipboard.writeText(text).then(function() {
        if (container && container._recursiShimElement) {
          self._highlightShim(container._recursiShimElement, 'copy');
        }
      });
    }
  }

  identifyNode(type, container, contentElement) {
    let groupNode =
      container.closest('.recursi-cc-response-group') ||
      container.closest('[data-message-author-role]') ||
      container.parentElement;
    let groupId =
      groupNode.dataset.recursiGroupId ||
      'grp_' + this._hashString(groupNode.innerText.slice(0, 100));
    groupNode.dataset.recursiGroupId = groupId;
    let sig =
      groupId +
      '|' +
      type +
      '|' +
      this._hashString(contentElement.textContent.slice(0, 500));
    return { groupId, sig, type, blockId: type + ':' + Date.now() };
  }

  _registerBlock(identity, container, contentElement) {
    let group = this.documentMap.groups.get(identity.groupId);
    if (!group) {
      group = {
        id: identity.groupId,
        role: identity.type === 'prompt' ? 'User' : 'Assistant',
        blocks: new Map(),
        domRef:
          container.closest('.recursi-cc-response-group') ||
          container.parentElement,
      };
      this.documentMap.groups.set(identity.groupId, group);
    }
    group.blocks.set(identity.sig, {
      id: identity.blockId,
      sig: identity.sig,
      text: contentElement.textContent,
      domRef: contentElement,
    });
  }

  _getOrCreateStateForSig(sig) {
    if (!this._state.bySig[sig]) this._state.bySig[sig] = { expanded: false };
    return this._state.bySig[sig];
  }

  _loadState() {
    try {
      const raw = localStorage.getItem(this._stateKey);
      if (raw) this._state = JSON.parse(raw);
    } catch (e) {}
  }

  _saveStateSoon() {
    this._saveDirty = true;
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      if (this._saveDirty)
        localStorage.setItem(this._stateKey, JSON.stringify(this._state));
      this._saveDirty = false;
    }, 1000);
  }

  _hashString(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
    return (h >>> 0).toString(36);
  }

  scanResponseGroups() {
    document
      .querySelectorAll(
        'ms-chat-turn, article[data-message-author-role="assistant"], .agent-turn'
      )
      .forEach((turn) => {
        const target = turn.querySelector('.turn-content') || turn;
        if (
          target.querySelector('pre') &&
          !target.classList.contains('recursi-cc-response-group')
        ) {
          target.classList.add('recursi-cc-response-group');
          this._ensureGroupCopyButton(target);
        }
      });
  }

  _ensureGroupCopyButton(el) {
    if (el.querySelector('.recursi-cc-copy-btn')) return;
    const btn = makeElement('button', {
      className: 'recursi-cc-copy-btn',
      onclick: (e) => {
        e.stopPropagation();
        this.copyResponseGroupCode(el);
      },
    });
    btn.appendChild(this.createCopyIcon(24, 2, 'currentColor'));
    el.appendChild(btn);
    if (this.isConnected) {
      const magic = makeElement('button', {
        className: 'recursi-cc-magic-btn',
        textContent: 'r',
        onclick: (e) => {
          e.stopPropagation();
          this.copyResponseGroupCode(el, 'teleport');
        },
      });
      el.insertBefore(magic, btn);
    }
  }

  copyResponseGroupCode(el, mode) {
    var pres = Array.from(el.querySelectorAll("pre")).filter(
      function(p) { return !p.classList.contains("recursi-code-shim"); }
    );
    var text = pres.map(function(p) { return p.textContent; }).join("\n\n");
    if (mode === "teleport" && this.isConnected) {
      this._sendToYolo({
        action: "CODE_DELIVERY",
        code: text,
        meta: { id: "grp_" + Date.now(), source: "response_group" }
      });
      this._highlightBlocks(pres, "#00ff00");
    } else {
      var self = this;
      navigator.clipboard
        .writeText(text)
        .then(function() { self._highlightBlocks(pres, "#ffd700"); });
    }
  }

  pasteAndRun() {
    navigator.clipboard.readText().then((text) => {
      const area = document.querySelector('textarea, [contenteditable="true"]');
      if (area) {
        if ('value' in area) {
          // Regular textarea
          area.value = text;
          area.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          // contenteditable (e.g. Claude.ai) - must use execCommand or
          // insertText to preserve newlines, not textContent which collapses them
          area.focus();
          const sel = window.getSelection();
          sel.selectAllChildren(area);
          sel.collapseToEnd();
          document.execCommand('insertText', false, text);
        }
      }
    });
  }

  setUI(ui) {
    this.ui = ui;
    this.ui.init();
  }

  scrollToBlock(b) {
    if (b.domRef)
      b.domRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  scrollToGroup(id) {
    const g = this.documentMap.groups.get(id);
    if (g && g.domRef)
      g.domRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  createCopyIcon(s, t, c) {
    return makeElement(
      'svg:svg',
      {
        width: s,
        height: s,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: c,
        'stroke-width': t,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      },
      [
        makeElement('svg:rect', {
          x: 9,
          y: 9,
          width: 13,
          height: 13,
          rx: 2,
          ry: 2,
        }),
        makeElement('svg:path', {
          d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
        }),
      ]
    );
  }

  scanUserPrompts() {
    // Use restrictive selectors to target only the text content within user turns
    // This prevents the orange prompt styling from leaking onto outer layout divs
    const promptSelectors = [
      'div[data-turn-role="User"] ms-prompt-chunk',
      '[data-message-author-role="user"] ms-prompt-chunk',
      '.prose.user-prompt',
      '.user-message-text', // Generic fallback for other platforms
    ];

    const chunks = document.querySelectorAll(promptSelectors.join(', '));

    chunks.forEach((chunk) => {
      if (!chunk.dataset.recursiShimmed) {
        // Ensure we only shim items with actual content
        if (chunk.textContent.trim().length > 0) {
          this.createShim(chunk, chunk, 'prompt');
        }
      }

      // Maintain tracking for identity and state
      if (chunk.dataset.recursiShimmed) {
        const identity = this.identifyNode('prompt', chunk, chunk);
        chunk.dataset.recursiCcSig = identity.sig;
        this._registerBlock(identity, chunk, chunk);

        if (chunk._recursiShimElement) {
          this.updateShimContent(
            chunk._recursiShimElement,
            chunk,
            identity.sig,
            'prompt',
            false
          );
        }

        const state = this._getOrCreateStateForSig(identity.sig);
        if (state.expanded === undefined) state.expanded = false;

        this._applyVisibility(chunk, chunk._recursiShimElement, state);
      }
    });
  }

  formatBytes(c) {
    return c >= 1000 ? (c / 1000).toFixed(1) + 'k' : c + 'b';
  }

  scanGenericTurns() {
    document
      .querySelectorAll('[data-turn-role], ms-chat-turn, div.turn-container')
      .forEach((el) => {
        if (!el.classList.contains('recursi-auto-item'))
          el.classList.add('recursi-auto-item');
      });
  }

  openTeleporter(isLocal) {
    // Legacy: was WindowMessenger popup. Now handled by extension bridge.
    // Connection is automatic via _initExtensionBridge polling.
    console.log("[LlmHelper] openTeleporter called - connection now automatic via extension");
  }

  fillInputWithPrompt(text) {
    const area = document.querySelector('textarea, [contenteditable="true"]');
    if (area) {
      if ('value' in area) area.value = text;
      else area.textContent = text;
      area.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  _highlightBlocks(pres, color) {
    pres.forEach((p) => {
      const c = this.findContainer(p);
      const t =
        c &&
        c._recursiShimElement &&
        !c._recursiShimElement.classList.contains('recursi-force-hidden')
          ? c._recursiShimElement
          : c || p;
      t.classList.add('recursi-cc-highlight');
      setTimeout(() => t.classList.remove('recursi-cc-highlight'), 1000);
    });
  }

  _highlightShim(t, type) {
    if (!t) return;
    t.classList.add('recursi-cc-highlight');
    setTimeout(() => t.classList.remove('recursi-cc-highlight'), 1000);
  }

  setConnectionState(c) {
    this.isConnected = c;
    document.body.classList.toggle('recursi-linked', c);
    if (this.ui) this.ui.setLogoAnimating(c);
    document
      .querySelectorAll('.recursi-cc-response-group')
      .forEach((el) => this._ensureGroupCopyButton(el));
  }

sendTestMessage() {
    this._sendToYolo({ action: "PING" });
    var s1 = "// ReadSomething run(env)\n";
    s1 += "// reads test.js and logs content\n";
    s1 += "var content = FO.readText(env, \"test.js\");\nconsole.log(content);";
    var s2 = "// FixBugInServer run(env)\n";
    s2 += "var VJP = env.VerifiedJsPatchHelper;\nconsole.log(\"patching...\");";
    this._showOutputMirror([
      { type: "code", text: s1 },
      { type: "success", text: "Build completed in 2.3s" },
      { type: "code", text: s2 },
      { type: "warn", text: "Warning: 3 files modified without tests" },
      { type: "error", text: "TypeError: Cannot read property of undefined" },
    ]);
  }

_initExtensionBridge(...args) {
    var self = this;
    var noResponseCount = 0;

    window.addEventListener("message", function(event) {
      if (event.source !== window || !event.data) return;
      var t = event.data.type;
      if (t === "YOLO_STATUS_QUERY_RESPONSE") {
        noResponseCount = 0;
        var resp = event.data.response;
        if (!resp) return;
        if (resp.connected && !self.isConnected) {
          console.info("[YOLO-BRIDGE] Connection established, code:", resp.code);
          self._pairCode = resp.code;
          self.setConnectionState(true);
        } else if (!resp.connected && self.isConnected) {
          console.info("[YOLO-BRIDGE] Connection lost");
          self._pairCode = null;
          self.setConnectionState(false);
          self._autoPairAttempted = false;
        }
        var codes = [];
        if (resp.unpairedYoloTabs) {
          resp.unpairedYoloTabs.forEach(function(tab) { codes.push(tab.code); });
        }
        if (self.ui && self.ui.updatePairingState) {
          self.ui.updatePairingState({
            connected: resp.connected,
            code: resp.code,
            hasUnpaired: codes.length > 0,
            codes: codes
          });
        }
        if (!resp.connected && codes.length === 1 && !self._autoPairAttempted) {
          console.info("[YOLO-BRIDGE] Auto-pairing with single YOLO tab:", codes[0]);
          self._autoPairAttempted = true;
          self._pairWithCode(codes[0]);
        }
      }
      if (t === "LLM_PAIR_REQUEST_RESPONSE") {
        var resp2 = event.data.response;
        if (resp2 && resp2.success) {
          self._pairCode = resp2.code;
          self.setConnectionState(true);
          if (self.ui) {
            self.ui.flashLogoColor("#00ff00");
            self.ui.updatePairingState({ connected: true, code: resp2.code, hasUnpaired: false, codes: [] });
          }
        } else {
          self._autoPairAttempted = false;
          console.warn("[YOLO-BRIDGE] Pair request failed:", resp2);
          if (self.ui) {
            self.ui.flashLogoColor("#ff0000");
            var errMsg = (resp2 && resp2.error === "invalid_code") ? "Invalid Code" : "Pair Failed";
            self.ui.updatePairingState({ error: errMsg });
          }
        }
      }
      if (t === "LLM_TO_YOLO_RESPONSE") {
        var resp3 = event.data.response;
        if (resp3 && resp3.success && self.ui) self.ui.flashLogoColor("#00ff00");
      }
      if (t === "YOLO_RESPONSE") {
        self._handleYoloCommand(event.data.payload);
      }
    });

    this._pairCode = null;
    this._autoPairAttempted = false;
    // Poll - if no response after 5 tries, extension is probably dead
    this._bridgePollTimer = setInterval(function() {
      noResponseCount++;
      if (noResponseCount > 10) {
        // Extension context dead, slow down polling
        clearInterval(self._bridgePollTimer);
        self._bridgePollTimer = setInterval(function() {
          window.postMessage({ type: "YOLO_STATUS_QUERY" }, "*");
        }, 15000);
        if (self.isConnected) {
          self.setConnectionState(false);
          self._autoPairAttempted = false;
        }
        if (self.ui && self.ui.updatePairingState) {
          self.ui.updatePairingState({ connected: false, code: null, hasUnpaired: false, codes: [] });
        }
        return;
      }
      window.postMessage({ type: "YOLO_STATUS_QUERY" }, "*");
    }, 2000);
    // Initial fast polls
    window.postMessage({ type: "YOLO_STATUS_QUERY" }, "*");
    setTimeout(function() { window.postMessage({ type: "YOLO_STATUS_QUERY" }, "*"); }, 500);
    setTimeout(function() { window.postMessage({ type: "YOLO_STATUS_QUERY" }, "*"); }, 1500);
  }

  _handleYoloCommand(payload) {
    if (!payload || !payload.action) return;
    console.log("[LlmHelper] YOLO command:", payload.action);

    switch (payload.action) {
      case "GET_BLOCKS": {
        var blocks = [];
        this.documentMap.groups.forEach(function(group) {
          group.blocks.forEach(function(block) {
            blocks.push({
              sig: block.sig,
              type: group.role === "User" ? "prompt" : "code",
              text: block.text,
              lines: block.text.split("\n").length,
              groupId: group.id
            });
          });
        });
        this._sendToYolo({ action: "BLOCKS_RESULT", blocks: blocks });
        break;
      }

      case "SCAN": {
        this.scan();
        var groupCount = this.documentMap.groups.size;
        var blockCount = 0;
        this.documentMap.groups.forEach(function(g) { blockCount += g.blocks.size; });
        this._sendToYolo({
          action: "SCAN_RESULT",
          groups: groupCount,
          blocks: blockCount,
          url: location.href,
          host: location.host
        });
        break;
      }

      case "GET_PAGE_INFO": {
        var groupCount2 = this.documentMap.groups.size;
        var blockCount2 = 0;
        this.documentMap.groups.forEach(function(g) { blockCount2 += g.blocks.size; });
        this._sendToYolo({
          action: "PAGE_INFO",
          url: location.href,
          host: location.host,
          title: document.title,
          groups: groupCount2,
          blocks: blockCount2,
          connected: this.isConnected
        });
        break;
      }

      case "HIGHLIGHT_BLOCK": {
        var sig = payload.sig;
        if (sig) {
          var found = false;
          this.documentMap.groups.forEach(function(group) {
            var block = group.blocks.get(sig);
            if (block && block.domRef) {
              block.domRef.scrollIntoView({ behavior: "smooth", block: "center" });
              block.domRef.classList.add("recursi-cc-highlight");
              setTimeout(function() {
                block.domRef.classList.remove("recursi-cc-highlight");
              }, 2000);
              found = true;
            }
          });
          this._sendToYolo({ action: "HIGHLIGHT_RESULT", found: found, sig: sig });
        }
        break;
      }

      case "QUERY_DOM": {
        try {
          var els = document.querySelectorAll(payload.selector || "pre");
          var limit = payload.limit || 50;
          var maxText = payload.maxText || 500;
          var results = [];
          for (var i = 0; i < els.length && i < limit; i++) {
            var el = els[i];
            results.push({
              index: i,
              tagName: el.tagName.toLowerCase(),
              text: (el.textContent || "").slice(0, maxText),
              classes: el.className,
              id: el.id || null,
              rect: {
                top: Math.round(el.getBoundingClientRect().top),
                left: Math.round(el.getBoundingClientRect().left),
                width: Math.round(el.getBoundingClientRect().width),
                height: Math.round(el.getBoundingClientRect().height)
              }
            });
          }
          this._sendToYolo({ action: "QUERY_DOM_RESULT", count: els.length, results: results });
        } catch(e) {
          this._sendToYolo({ action: "ERROR", error: e.message });
        }
        break;
      }

      case "SEND_CODE": {
        if (payload.code) {
          this._sendToYolo({
            action: "CODE_DELIVERY",
            code: payload.code,
            meta: payload.meta || {}
          });
        }
        break;
      }

      case "PING": {
        this._sendToYolo({
          action: "PONG",
          url: location.href,
          host: location.host,
          title: document.title
        });
        break;
      }

      case "SHOW_OUTPUT": {
        this._showOutputMirror(payload.entries || [], payload.userTextLength || 0, payload.userTextPreview || "");
        break;
      }

      case "PASTE_ALL_RESPONSE": {
        var pasteText = payload.text || "";
        if (!pasteText) break;
        var area = document.querySelector("textarea, [contenteditable]");
        if (!area) { console.warn("[YOLO-BRIDGE] No chat input"); break; }
        if ("value" in area && area.tagName === "TEXTAREA") {
          area.focus();
          area.value = pasteText;
          area.dispatchEvent(new Event("input", { bubbles: true }));
        } else {
          area.focus();
          var sel = window.getSelection();
          sel.selectAllChildren(area);
          sel.collapseToEnd();
          document.execCommand("insertText", false, pasteText);
        }
        if (this.ui) this.ui.flashLogoColor("#00ff00");
        this._outputEntries = [];
        this._userTextLength = 0;
        this._userTextPreview = "";
        this._refreshOutputDialog();
        break;
      }

      case "FILL_INPUT": {
        var fillText = payload.text || "";
        var fillArea = document.querySelector("textarea, [contenteditable='true'], [contenteditable]");
        if (!fillArea) {
          this._sendToYolo({ action: "FILL_INPUT_RESULT", ok: false, error: "no_input_found" });
          break;
        }
        if ("value" in fillArea && fillArea.tagName === "TEXTAREA") {
          fillArea.focus();
          fillArea.value = fillText;
          fillArea.dispatchEvent(new Event("input", { bubbles: true }));
          fillArea.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          fillArea.focus();
          var sel = window.getSelection();
          sel.selectAllChildren(fillArea);
          sel.collapseToEnd();
          document.execCommand("insertText", false, fillText);
        }
        if (this.ui) this.ui.flashLogoColor("#4fc3f7");
        this._sendToYolo({ action: "FILL_INPUT_RESULT", ok: true, tag: fillArea.tagName.toLowerCase(), chars: fillText.length });
        break;
      }

      case "GET_INPUT_INFO": {
        var candidates = Array.from(document.querySelectorAll("textarea, [contenteditable='true'], [contenteditable]"));
        var infos = candidates.map(function(el) {
          var r = el.getBoundingClientRect();
          return {
            tag: el.tagName.toLowerCase(),
            id: el.id || null,
            classes: el.className || null,
            contenteditable: el.getAttribute("contenteditable"),
            visible: r.width > 0 && r.height > 0,
            rect: { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) },
            textPreview: (el.value || el.textContent || "").slice(0, 80)
          };
        });
        this._sendToYolo({ action: "INPUT_INFO_RESULT", count: infos.length, inputs: infos });
        break;
      }
      default:
        console.warn("[LlmHelper] Unknown YOLO command:", payload.action);
        this._sendToYolo({ action: "UNKNOWN_COMMAND", requested: payload.action });
    }
  }

  _sendToYolo(payload) {
      window.postMessage({
        type: "LLM_TO_YOLO",
        payload: payload
      }, "*");
    }

  _pairWithCode(code) {
    console.log("[LlmHelper] Requesting pair with code:", code);
    window.postMessage({ type: "LLM_PAIR_REQUEST", code: code }, "*");
  }

  _showConnectPrompt(unpairedTabs) {
    // Deprecated: pairing UI is now in the widget
  }

  _updateConnectPrompt(unpairedTabs) {
    // Deprecated: pairing UI is now in the widget
  }

  _hideConnectPrompt(...args) {
    // Deprecated: pairing UI is now in the widget
  }
  handleYoloCommand(payload) {
      console.log("[LlmHelper] Received YOLO Command:", payload);
      if (!payload || !payload.action) return;

      if (payload.action === 'HIGHLIGHT_BLOCK') {
        const sig = payload.sig;
        const status = payload.status;

        const container = document.querySelector(`.recursi-shim-base[data-recursi-cc-sig="${sig}"]`);
        if (container) {
          const color = status === 'success' ? '#00ff00' : '#ff0000';
          container.style.borderColor = color;
          container.style.borderLeftColor = color;
          container.style.boxShadow = `0 0 15px ${color}`;

          setTimeout(() => {
            container.style.boxShadow = 'none';
          }, 2000);

          let badge = container.querySelector('.recursi-yolo-badge');
          if (!badge) {
            badge = document.createElement('div');
            badge.className = 'recursi-yolo-badge';
            badge.style.position = 'absolute';
            badge.style.top = '4px';
            badge.style.right = '35px';
            badge.style.padding = '2px 6px';
            badge.style.borderRadius = '4px';
            badge.style.fontSize = '11px';
            badge.style.fontWeight = 'bold';
            badge.style.zIndex = '20';
            container.appendChild(badge);
          }

          badge.style.backgroundColor = color;
          badge.style.color = '#000';
          badge.textContent = status === 'success' ? '✔ RUN SUCCESS' : '✖ RUN FAILED';
        } else {
          console.warn("[LlmHelper] Could not find block for sig:", sig);
        }
      }
    }

  _showOutputMirror(entries, userTextLength, userTextPreview) {
    this._outputEntries = entries || [];
    this._userTextLength = userTextLength || 0;
    this._userTextPreview = userTextPreview || "";

    if (this._outputDialog && this._outputDialog.element && this._outputDialog.element.parentNode) {
      this._refreshOutputDialog();
      return;
    }

    var container = makeElement("div", {
      style: {
        display: "flex", flexDirection: "column", height: "100%",
        fontFamily: "monospace", fontSize: "11px", color: "#ccc",
      }
    });

    this._outputListEl = makeElement("div", {
      style: {
        flex: "1", overflowY: "auto", padding: "4px",
        minHeight: "0",
      }
    });
    container.appendChild(this._outputListEl);

    var self = this;
    var btnBar = makeElement("div", {
      style: {
        padding: "4px", borderTop: "1px solid #444",
        display: "flex", gap: "4px", background: "#1a1a1a",
      }
    });

    btnBar.appendChild(makeElement("button", {
      textContent: "Paste All",
      style: {
        flex: "1", padding: "6px 8px",
        background: "#4caf50", color: "#fff", border: "none",
        borderRadius: "3px", cursor: "pointer",
        fontFamily: "sans-serif", fontSize: "12px", fontWeight: "bold",
      },
      onclick: function() { self._pasteAllToChat(); },
    }));

    btnBar.appendChild(makeElement("button", {
      textContent: "Clear",
      style: {
        padding: "6px 8px",
        background: "#333", color: "#aaa", border: "1px solid #555",
        borderRadius: "3px", cursor: "pointer",
        fontFamily: "sans-serif", fontSize: "11px",
      },
      onclick: function() {
        self._outputEntries = [];
        self._userTextLength = 0;
        self._userTextPreview = "";
        self._refreshOutputDialog();
      },
    }));
    container.appendChild(btnBar);

    this._outputDialog = new DialogBox({
      title: "Output Queue (" + (this._outputEntries.length + (this._userTextLength > 0 ? 1 : 0)) + ")",
      content: container,
      width: "230px",
      height: "500px",
      position: [8, 60],
      allowMaximize: true,
      buttons: [],
      noPadding: true,
      onClose: function() {
        self._outputDialog = null;
        self._outputListEl = null;
      },
    });

    this._refreshOutputDialog();
  }

  _refreshOutputDialog(...args) {
    var list = this._outputListEl;
    if (!list) return;
    while (list.firstChild) list.removeChild(list.firstChild);

    var entries = this._outputEntries || [];
    var total = entries.length + (this._userTextLength > 0 ? 1 : 0);

    if (this._outputDialog && this._outputDialog.header) {
      var tEl = this._outputDialog.header.querySelector(".dialog-title");
      if (tEl) tEl.textContent = "Output Queue (" + total + ")";
    }

    // User text card (if any)
    if (this._userTextLength > 0) {
      var utLen = this._userTextLength;
      var utPrev = this._userTextPreview || "";
      var utCard = makeElement("div", {
        style: {
          padding: "5px 6px", marginBottom: "3px", borderRadius: "3px",
          background: "#1a2a1a", border: "1px solid #2a4a2a",
        },
      });
      var utRow = makeElement("div", {
        style: { display: "flex", alignItems: "center", gap: "5px" },
      });
      utRow.appendChild(makeElement("span", {
        style: {
          width: "6px", height: "6px", borderRadius: "50%",
          background: "#81c784", display: "inline-block", flexShrink: "0",
        },
      }));
      utRow.appendChild(makeElement("span", {
        textContent: "user text",
        style: {
          flex: "1", fontSize: "11px", fontWeight: "bold", color: "#81c784",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        },
      }));
      var utSz = utLen >= 1000 ? (utLen / 1000).toFixed(1) + "k" : utLen + "c";
      utRow.appendChild(makeElement("span", {
        textContent: utSz,
        style: { fontSize: "9px", color: "#666", flexShrink: "0" },
      }));
      utCard.appendChild(utRow);
      if (utPrev) {
        utCard.appendChild(makeElement("div", {
          textContent: utPrev.length > 40 ? utPrev.substring(0, 40) + "..." : utPrev,
          style: {
            fontSize: "9px", color: "#4a7a4a", fontFamily: "monospace",
            overflow: "hidden", textOverflow: "ellipsis",
            whiteSpace: "nowrap", marginTop: "1px",
          },
        }));
      }
      list.appendChild(utCard);
    }

    if (entries.length === 0 && this._userTextLength === 0) {
      list.appendChild(makeElement("div", {
        textContent: "Waiting for output...",
        style: { color: "#555", padding: "16px 8px", textAlign: "center", fontSize: "11px" },
      }));
      return;
    }

    var tColors = {
      info: "#888", success: "#4caf50",
      error: "#f44336", warn: "#ff9800", code: "#4fc3f7"
    };

    entries.forEach(function(entry) {
      var text = entry.text || "";
      var chars = text.length;
      var numLines = text.split("\n").length;
      var dColor = tColors[entry.type] || "#888";

      var card = makeElement("div", {
        style: {
          padding: "5px 6px", marginBottom: "3px", borderRadius: "3px",
          background: "#222", border: "1px solid #333",
          cursor: "pointer", transition: "border-color 0.15s",
        },
        title: "Click to copy",
      });

      card.onclick = (function(c, t) {
        return function() {
          navigator.clipboard.writeText(t).then(function() {
            c.style.borderColor = "#4caf50";
            setTimeout(function() { c.style.borderColor = "#333"; }, 600);
          });
        };
      })(card, text);

      var row = makeElement("div", {
        style: { display: "flex", alignItems: "center", gap: "5px" },
      });

      row.appendChild(makeElement("span", {
        style: {
          width: "6px", height: "6px", borderRadius: "50%",
          background: dColor, display: "inline-block", flexShrink: "0",
        },
      }));

      // Preview: first meaningful line
      var preview = "";
      var tLines = text.split("\n");
      for (var i = 0; i < tLines.length && i < 5; i++) {
        var tr = tLines[i].trim();
        if (tr) { preview = tr; break; }
      }
      if (preview.length > 28) preview = preview.substring(0, 28) + "...";

      row.appendChild(makeElement("span", {
        textContent: preview || entry.type,
        style: {
          flex: "1", fontSize: "10px", color: "#aaa",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        },
      }));

      var sz = chars >= 1000 ? (chars / 1000).toFixed(1) + "k" : chars + "c";
      sz += " " + numLines + "L";
      row.appendChild(makeElement("span", {
        textContent: sz,
        style: { fontSize: "9px", color: "#666", flexShrink: "0" },
      }));

      card.appendChild(row);
      list.appendChild(card);
    });

    list.scrollTop = list.scrollHeight;
  }

  _pasteAllToChat(...args) {
    // Request YOLO to assemble and send the full text
    this._sendToYolo({ action: "PASTE_ALL_REQUEST" });
    if (this.ui) this.ui.flashLogoColor("#4fc3f7");
  }

}

