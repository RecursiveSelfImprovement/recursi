class LlmHelperUI {
  constructor(helper) {
    this.helper = helper;
    this.widget = null;
    this.dialog = null;
    this.isManagerOpen = false;
  }

  init(...args) {
    this.injectStyles();
    this.createWidget();
  }

  injectStyles(...args) {
    var css = [
      ".recursi-cc-copy-btn:active, .recursi-cc-magic-btn:active, .recursi-btn-clicked {",
      "  transform: scale(0.9) !important; filter: brightness(1.5) !important;",
      "}",
      ".recursi-cc-magic-btn {",
      "  display: none; position: absolute !important; right: 45px !important;",
      "  bottom: 3px !important; z-index: 50 !important;",
      "  background-color: rgba(0,77,64,0.5) !important; color: #69f0ae !important;",
      "  border: 1px solid rgba(0,105,92,0.6) !important; border-radius: 4px !important;",
      "  font-family: Courier New, monospace !important; font-weight: 900 !important;",
      "  font-size: 24px !important; line-height: 24px !important; padding: 0 !important;",
      "  text-align: center !important; width: 28px !important; height: 28px !important;",
      "  cursor: pointer !important; align-items: center !important;",
      "  justify-content: center !important; box-shadow: 0 2px 5px rgba(0,0,0,0.3) !important;",
      "  transition: all 0.2s ease !important;",
      "}",
      ".recursi-cc-magic-btn:hover {",
      "  background-color: rgba(0,105,92,0.9) !important; color: #fff !important;",
      "  transform: scale(1.1); box-shadow: 0 0 8px #69f0ae !important;",
      "}",
      "body.recursi-linked .recursi-cc-magic-btn {",
      "  display: flex !important;",
      "  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);",
      "}",
      "@keyframes popIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }",
      ".recursi-logo-letter.teleporting {",
      "  animation: recursi-bounce 0.6s infinite alternate cubic-bezier(0.455, 0.03, 0.515, 0.95);",
      "  animation-delay: calc(var(--letter-index) * 0.1s);",
      "}",
      "@keyframes recursi-bounce {",
      "  to { transform: translateY(-4px) scale(1.1); filter: brightness(1.2) drop-shadow(0 2px 4px rgba(0,255,0,0.3)); }",
      "}",
      "/* Pairing UI */",
      ".recursi-pair-section { display: flex; align-items: center; gap: 6px; }",
      ".recursi-pair-dot {",
      "  width: 8px; height: 8px; border-radius: 50%; display: inline-block;",
      "  transition: background 0.3s, box-shadow 0.3s;",
      "}",
      ".recursi-pair-dot.searching {",
      "  background: #ff9800; animation: dot-pulse 1.5s infinite;",
      "}",
      ".recursi-pair-dot.connected {",
      "  background: #4caf50; box-shadow: 0 0 8px #4caf50;",
      "}",
      ".recursi-pair-dot.idle { background: #555; }",
      "@keyframes dot-pulse {",
      "  0%, 100% { opacity: 1; box-shadow: 0 0 4px #ff9800; }",
      "  50% { opacity: 0.4; box-shadow: none; }",
      "}",
      ".recursi-pair-input {",
      "  width: 36px; background: #111; color: #fff; border: 1px solid #444;",
      "  border-radius: 3px; padding: 2px 4px; font-family: monospace;",
      "  font-size: 12px; text-transform: uppercase; letter-spacing: 1px;",
      "  text-align: center; outline: none;",
      "}",
      ".recursi-pair-input:focus { border-color: #4fc3f7; box-shadow: 0 0 4px rgba(79,195,247,0.3); }",
      ".recursi-pair-label {",
      "  font-size: 10px; color: #888; font-family: sans-serif; white-space: nowrap;",
      "}",
      ".recursi-pair-label.connected { color: #4caf50; }",
      ".recursi-pair-code {",
      "  font-size: 11px; color: #4fc3f7; font-weight: bold; letter-spacing: 1px;",
      "  cursor: pointer; font-family: monospace;",
      "}",
      ".recursi-pair-code:hover { color: #fff; }",
      "/* Connected glow on widget */",
      ".recursi-widget.paired {",
      "  border-color: #4caf50 !important;",
      "  box-shadow: 0 4px 12px rgba(0,0,0,0.4), 0 0 12px rgba(76,175,80,0.3) !important;",
      "}",
      ".recursi-widget.searching-yolo {",
      "  border-color: #ff9800 !important;",
      "  box-shadow: 0 4px 12px rgba(0,0,0,0.4), 0 0 8px rgba(255,152,0,0.2) !important;",
      "}",
    ].join("\n");
    applyCss(css, "LlmHelperUIStyles");
  }

  createWidget() {
    if (typeof GlowBox !== 'undefined') {
      this.glow = new GlowBox({ color: '#00ff00', zIndex: 2147483647 });
    }

    let pos = { top: '10px', left: '10px' };
    try {
      const saved = localStorage.getItem('recursi_widget_pos');
      if (saved) pos = JSON.parse(saved);
    } catch (e) {}

    this.widget = makeElement('div', {
      className: 'recursi-widget',
      style: {
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: '2147483647',
        background: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '4px',
        padding: '5px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        fontFamily: 'Courier New, monospace',
        userSelect: 'none',
        cursor: 'move',
        transition: 'opacity 0.2s',
        opacity: '0.9',
      },
      onmouseenter: (e) => (e.currentTarget.style.opacity = '1'),
      onmouseleave: (e) => (e.currentTarget.style.opacity = '0.9'),
    });

    const createLetter = (char, color, index) => {
      return makeElement(
        'span',
        {
          className: 'recursi-logo-letter',
          style: {
            color: color,
            fontWeight: 'bold',
            fontSize: '14px',
            lineHeight: '1',
            '--letter-index': index,
          },
        },
        char
      );
    };

    const logoContainer = makeElement('div', {
      className: 'recursi-logo-container',
      style: {
        display: 'flex',
        marginRight: '4px',
        pointerEvents: 'auto',
        cursor: 'pointer',
        letterSpacing: '-1px',
        transition: 'filter 0.2s',
      },
      title:
        'Left Click: Localhost | Right Click: Prod | (When connected: Send Test)',
      onclick: (e) => {
        e.stopPropagation();
        if (this.helper.isConnected) {
          this.helper.sendTestMessage();
          return;
        }
        const rect = logoContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        this.helper.openTeleporter(x < rect.width / 2);
      },
    });

    const letters = [
      ['r', '#4caf50'],
      ['e', '#4fc3f7'],
      ['c', '#4fc3f7'],
      ['u', '#4fc3f7'],
      ['r', '#4fc3f7'],
      ['s', '#4caf50'],
      ['i', '#4caf50'],
    ];
    letters.forEach(([char, color], index) =>
      logoContainer.appendChild(createLetter(char, color, index))
    );

    const btnStyle = {
      background: '#333',
      border: '1px solid #555',
      color: '#ddd',
      borderRadius: '3px',
      padding: '3px 8px',
      fontSize: '11px',
      cursor: 'pointer',
      fontFamily: 'sans-serif',
      fontWeight: '500',
      transition: 'background 0.1s',
    };

    const mgrBtn = makeElement('button', {
      textContent: 'Manager',
      onclick: (e) => {
        e.stopPropagation();
        this.openManager();
      },
    });
    Object.assign(mgrBtn.style, btnStyle);

    const pasteBtn = makeElement('button', {
      textContent: 'Paste',
      onclick: (e) => {
        e.stopPropagation();
        this.helper.pasteAndRun();
      },
    });
    Object.assign(pasteBtn.style, btnStyle, {
      background: '#2e7d32',
      borderColor: '#1b5e20',
      color: '#fff',
      fontWeight: 'bold',
    });

    this.widget.appendChild(logoContainer);
    this.widget.appendChild(mgrBtn);
    this.widget.appendChild(pasteBtn);
    // --- Pairing Section ---
    var pairSection = makeElement("div", { className: "recursi-pair-section" });
    var pairDot = makeElement("span", { className: "recursi-pair-dot idle" });
    var helperRef = this.helper;
    var pairInput = makeElement("input", {
      className: "recursi-pair-input",
      type: "text",
      maxLength: 3,
      placeholder: "code",
      onclick: function(e) { e.stopPropagation(); },
      onmousedown: function(e) { e.stopPropagation(); },
      onkeydown: function(e) { e.stopPropagation(); },
      oninput: function(e) {
        var val = e.target.value.trim();
        if (val.length >= 3) {
          console.info("[YOLO-BRIDGE] Auto-submitting pair code:", val);
          helperRef._pairWithCode(val);
          e.target.value = "";
        }
      },
      onkeypress: function(e) {
        if (e.key === "Enter") {
          var val = e.target.value.trim();
          if (val.length > 0) {
            console.info("[YOLO-BRIDGE] Enter key pair attempt:", val);
            helperRef._pairWithCode(val);
            e.target.value = "";
          }
          e.preventDefault();
        }
      },
    });
    var pairCode = makeElement("span", {
      className: "recursi-pair-code",
      style: { display: "none" },
    });
    var pairLabel = makeElement("span", {
      className: "recursi-pair-label",
      textContent: "no YOLO",
    });
    pairSection.appendChild(pairDot);
    pairSection.appendChild(pairInput);
    pairSection.appendChild(pairCode);
    pairSection.appendChild(pairLabel);
    this.widget.appendChild(pairSection);

    let isDragging = false;
    let offset = { x: 0, y: 0 };
    this.widget.addEventListener('mousedown', (e) => {
      if (
        e.target.tagName === 'BUTTON' ||
        e.target.tagName === 'INPUT' ||
        e.target.closest('.recursi-logo-container')
      )
        return;
      isDragging = true;
      const rect = this.widget.getBoundingClientRect();
      offset.x = e.clientX - rect.left;
      offset.y = e.clientY - rect.top;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      this.widget.style.left = `${e.clientX - offset.x}px`;
      this.widget.style.top = `${e.clientY - offset.y}px`;
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        localStorage.setItem(
          'recursi_widget_pos',
          JSON.stringify({
            top: this.widget.style.top,
            left: this.widget.style.left,
          })
        );
      }
    });

    document.body.appendChild(this.widget);
  }

  updateStats() {
    if (this.isManagerOpen && this.dialog) this.refreshManagerContent();
  }

  addLog(msg) {
    console.log('[Recursi]', msg);
  }

  openManager() {
    if (this.isManagerOpen && this.dialog) {
      this.dialog.bringToFront();
      return;
    }
    this.isManagerOpen = true;
    this.dialog = new DialogBox({
      title: 'Block Manager',
      size: [450, 600],
      position: [window.innerWidth - 470, 50],
      onClose: () => {
        this.isManagerOpen = false;
        this.dialog = null;
      },
    });
    const content = makeElement('div', {
      className: 'recursi-cc-manager-list',
      id: 'recursi-cc-list-root',
    });
    this.dialog.contentElement.style.padding = '0';
    this.dialog.contentElement.style.overflow = 'hidden';
    this.dialog.contentElement.appendChild(content);
    this.refreshManagerContent();
  }

  refreshManagerContent() {
    if (!this.dialog) return;
    const root = this.dialog.contentElement.querySelector(
      '#recursi-cc-list-root'
    );
    if (!root) return;

    const getFilename = (text) => {
      const match = text.match(/target:\s*["']([^"']+)["']/);
      return match ? match[1] : null;
    };

    const scrollTop = root.scrollTop;
    while (root.firstChild) root.removeChild(root.firstChild);

    let groups = Array.from(this.helper.documentMap.groups.values()).filter(
      (g) => g.domRef && g.domRef.isConnected
    );

    groups.sort((a, b) => {
      const rectA = a.domRef.getBoundingClientRect();
      const rectB = b.domRef.getBoundingClientRect();
      if (Math.abs(rectA.top - rectB.top) > 5) return rectA.top - rectB.top;
      const pos = a.domRef.compareDocumentPosition(b.domRef);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });

    groups.forEach((group) => {
      const isUser = group.role === 'User';
      if (isUser) {
        const block = group.blocks.values().next().value;
        if (!block) return;
        const row = makeElement(
          'div',
          {
            className: 'recursi-cc-group-item role-User',
            title: 'Scroll to Prompt',
            onclick: () => this.helper.scrollToBlock(block),
          },
          [
            makeElement(
              'span',
              {
                style: {
                  fontWeight: 'bold',
                  color: '#e67e22',
                  fontSize: '9px',
                },
              },
              'User'
            ),
            makeElement(
              'span',
              {
                style: {
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: '#999',
                  fontSize: '10px',
                },
              },
              block.text.replace(/\s+/g, ' ').substring(0, 80)
            ),
            makeElement(
              'span',
              {
                className: 'recursi-cc-meta',
                style: { fontSize: '10px', opacity: 0.75 },
              },
              `${block.text.length} B`
            ),
          ]
        );
        root.appendChild(row);
        return;
      }

      const blocks = Array.from(group.blocks.values()).sort((a, b) => {
        const aIdx = parseInt(a.id.split(':')[1] || 0);
        const bIdx = parseInt(b.id.split(':')[1] || 0);
        return aIdx - bIdx;
      });

      if (blocks.length === 0) return;

      const filenameDisplay = makeElement(
        'span',
        {
          style: {
            marginLeft: '12px',
            color: '#4db6ac',
            fontStyle: 'italic',
            fontSize: '10px',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          },
        },
        ''
      );
      const copyBtn = makeElement('button', {
        className: 'recursi-cc-mgr-copy',
        title: 'Copy code blocks',
        onclick: (e) => {
          e.stopPropagation();
          this.helper.copyGroup(group.id);
        },
      });
      copyBtn.textContent = '📋';

      const header = makeElement(
        'div',
        {
          className: 'recursi-cc-group-header',
          onclick: () => this.helper.scrollToGroup(group.id),
        },
        [
          makeElement('span', {}, 'Assistant'),
          filenameDisplay,
          makeElement(
            'span',
            { style: { opacity: 0.5, fontWeight: 'normal' } },
            `${blocks.length} items`
          ),
          copyBtn,
        ]
      );

      const body = makeElement('div', { className: 'recursi-cc-group-body' });
      blocks.forEach((block) => {
        const state = this.helper._getOrCreateStateForSig(block.sig);
        const filename = getFilename(block.text);
        const checkbox = makeElement('input', {
          type: 'checkbox',
          checked: !state.grabbed,
          onclick: (e) => {
            e.stopPropagation();
            state.grabbed = !e.target.checked;
            this.helper._saveStateSoon();
            this.updateStats();
          },
        });

        const row = makeElement(
          'div',
          {
            className: `recursi-cc-block-row ${
              state.grabbed ? 'is-grabbed' : ''
            }`,
            onmouseenter: () => {
              if (filename) filenameDisplay.textContent = filename;
            },
            onmouseleave: () => {
              filenameDisplay.textContent = '';
            },
            onclick: (e) => {
              if (e.target !== checkbox) this.helper.scrollToBlock(block);
            },
          },
          [
            checkbox,
            makeElement(
              'span',
              { className: 'recursi-cc-tag tag-code' },
              'CODE'
            ),
            makeElement(
              'span',
              {
                style: {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: '1',
                },
              },
              filename
                ? filename
                : block.text.substring(0, 40).replace(/\n/g, ' ')
            ),
            makeElement(
              'span',
              { className: 'recursi-cc-meta' },
              `${(block.text.match(/\n/g) || []).length + 1} L`
            ),
          ]
        );
        body.appendChild(row);
      });

      root.appendChild(
        makeElement(
          'div',
          { className: 'recursi-cc-group-item role-Assistant' },
          [header, body]
        )
      );
    });
    root.scrollTop = scrollTop;
  }

  setLogoAnimating(isAnimating) {
    if (!this.widget) return;
    this.widget.querySelectorAll('.recursi-logo-letter').forEach((l) => {
      if (isAnimating) l.classList.add('teleporting');
      else l.classList.remove('teleporting');
    });
  }

  flashLogoColor(color) {
    if (!this.widget) return;
    const logo = this.widget.querySelector('.recursi-logo-container');
    if (logo) {
      const old = logo.style.filter;
      logo.style.filter = `drop-shadow(0 0 5px ${color}) brightness(2)`;
      setTimeout(() => {
        logo.style.filter = old;
      }, 200);
    }
  }

  updatePairingState(state) {
    if (!this.widget) return;
    var dot = this.widget.querySelector(".recursi-pair-dot");
    var label = this.widget.querySelector(".recursi-pair-label");
    var input = this.widget.querySelector(".recursi-pair-input");
    var codeEl = this.widget.querySelector(".recursi-pair-code");

    if (state.error) {
      // Show error feedback
      console.warn("[YOLO-BRIDGE] Pair error:", state.error);
      if (dot) { dot.className = "recursi-pair-dot idle"; }
      if (label) {
        label.className = "recursi-pair-label";
        label.textContent = state.error;
        label.style.color = "#f44336";
        setTimeout(function() { label.style.color = ""; label.textContent = "no YOLO"; }, 3000);
      }
      if (input) {
        input.style.display = "inline";
        input.style.borderColor = "#f44336";
        setTimeout(function() { input.style.borderColor = "#444"; }, 3000);
      }
      return;
    }

    if (state.connected) {
      console.info("[YOLO-BRIDGE] Connected with code:", state.code);
      this.widget.classList.add("paired");
      this.widget.classList.remove("searching-yolo");
      if (dot) { dot.className = "recursi-pair-dot connected"; }
      if (label) { label.className = "recursi-pair-label connected"; label.textContent = state.code || "linked"; }
      if (input) { input.style.display = "none"; }
      if (codeEl) { codeEl.textContent = state.code || ""; codeEl.style.display = "inline"; }
    } else if (state.hasUnpaired) {
      this.widget.classList.remove("paired");
      this.widget.classList.add("searching-yolo");
      if (dot) { dot.className = "recursi-pair-dot searching"; }
      if (label) {
        label.className = "recursi-pair-label";
        if (state.codes && state.codes.length === 1) {
          label.textContent = "connecting...";
        } else {
          label.textContent = state.codes ? state.codes.length + " YOLOs" : "YOLO found";
        }
      }
      if (input) {
        if (state.codes && state.codes.length === 1) {
          input.style.display = "none";
        } else {
          input.style.display = "inline";
          input.style.width = "44px";
          input.style.fontSize = "13px";
          input.style.fontWeight = "bold";
          input.style.border = "1px solid #ff9800";
          input.placeholder = "code";
        }
      }
      if (codeEl) { codeEl.style.display = "none"; }
    } else {
      this.widget.classList.remove("paired");
      this.widget.classList.remove("searching-yolo");
      if (dot) { dot.className = "recursi-pair-dot idle"; }
      if (label) { label.className = "recursi-pair-label"; label.textContent = "no YOLO"; }
      if (input) {
        input.style.display = "inline";
        input.style.width = "44px";
        input.style.fontSize = "13px";
        input.style.fontWeight = "bold";
        input.style.border = "1px solid #444";
        input.placeholder = "code";
      }
      if (codeEl) { codeEl.style.display = "none"; }
    }
  }

}

