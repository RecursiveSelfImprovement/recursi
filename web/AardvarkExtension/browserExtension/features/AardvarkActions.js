class AardvarkActions {
  constructor(aardvark) {
    this.main = aardvark;

    // Local state for actions
    this.undoBuffer = [];
    this.widerStack = [];
    this.llmCaptures = [];

    // Pick mode state
    this.pickModeActive = false;
    this.pickCallback = null;
    this.pickHandler = null;
    this._originalStatusText = null;

    // View Source State
    this.didViewSourceDboxCss = false;
  }

  removeCurrentElement() {
    const el = this.main.currentElement;
    if (el) {
      const nextSibling = el.nextElementSibling;
      const parentElement = el.parentElement;
      const removedElement = el;

      this.undoBuffer.push({
        type: 'remove',
        element: removedElement,
        nextSibling: nextSibling,
        parentElement: parentElement,
      });

      el.remove();
      this.main.currentElement = null;
      this.main.overlay.clearOverlays();
    }
  }

  isolateElement() {
    const el = this.main.currentElement;
    if (el) {
      // If the radial menu is open (e.g., isolate triggered by keystroke), close it so
      // we unfreeze selection and don't leave Aardvark half-paused.
      try {
        if (
          this.main &&
          this.main.radialMenu &&
          this.main.radialMenu.isOpen()
        ) {
          this.main.radialMenu.close();
        }
      } catch (e) {}

      if (el.parentNode !== null) {
        let clone = el.cloneNode(true);

        // Reset positioning on clone to make it viewable in isolation
        clone.style.textAlign = '';
        clone.style.cssFloat = 'none';
        clone.style.position = '';
        clone.style.padding = '20px';
        clone.style.margin = '20px auto';
        clone.style.maxWidth = '800px';

        // Handle Table isolation specifically
        if (clone.tagName === 'TR' || clone.tagName === 'TD') {
          if (clone.tagName === 'TD') {
            clone = makeElement('TR', clone);
          }
          clone = makeElement('TABLE', makeElement('TBODY', clone));
        }

        const undoData = {
          type: 'isolate',
          elements: Array.from(document.body.childNodes).filter(
            (e) =>
              // Filter out Aardvark UI (including radial menu + any excluded UI)
              !e.classList ||
              (!e.classList.contains('aardvark_highlight') &&
                !e.classList.contains('aardvark_infoElement') &&
                !e.classList.contains('aardvark_status') &&
                !e.classList.contains('aardvark-radial') &&
                !(
                  e.getAttribute && e.getAttribute('data-style-exclude') != null
                ))
          ),
          bodyStyles: {
            background: document.body.style.background,
            backgroundColor: document.body.style.backgroundColor,
            backgroundImage: document.body.style.backgroundImage,
            margin: document.body.style.margin,
            textAlign: document.body.style.textAlign,
            overflow: document.body.style.overflow,
          },
        };

        // Clear body
        while (document.body.firstChild) {
          document.body.firstChild.remove();
        }

        // Apply isolation styles
        document.body.style.width = '100%';
        document.body.style.background = 'none';
        document.body.style.backgroundColor = 'white';
        document.body.style.backgroundImage = 'none';
        document.body.style.textAlign = 'center';
        document.body.style.overflow = 'auto';
        document.body.appendChild(clone);

        // Restore Status Panel
        if (this.main.overlay.statusPanel) {
          document.body.appendChild(this.main.overlay.statusPanel);
        }

        this.undoBuffer.push(undoData);
        window.scroll(0, 0);
        this.main.overlay.clearOverlays();
        this.main.currentElement = null;
      }
    }
  }

  undo() {
    if (this.undoBuffer.length === 0) return false;

    const undoData = this.undoBuffer.pop();
    switch (undoData.type) {
      case 'remove':
        if (undoData.nextSibling) {
          undoData.parentElement.insertBefore(
            undoData.element,
            undoData.nextSibling
          );
        } else {
          undoData.parentElement.appendChild(undoData.element);
        }
        break;
      case 'isolate':
        // 1. Wipe current body (the isolated view)
        while (document.body.firstChild) {
          document.body.firstChild.remove();
        }

        // 2. Restore original elements
        // Filter prevents re-appending old UI debris if it was captured
        undoData.elements
          .filter(
            (n) =>
              !(
                n &&
                n.classList &&
                (n.classList.contains('aardvark-radial') ||
                  n.closest?.('.aardvark-radial') ||
                  n.hasAttribute?.('data-style-exclude'))
              )
          )
          .forEach((element) => {
            document.body.appendChild(element);
          });

        // 3. Restore Body Styles
        Object.assign(document.body.style, undoData.bodyStyles);

        // 4. Reset Aardvark UI State
        // The old overlay elements are likely detached/invalid now.
        this.main.overlay.clearOverlays();
        this.main.currentElement = null;

        // 5. Restore Status Panel
        // Use the create method to ensure a fresh, working instance is attached
        this.main.overlay.removeStatusPanel(); // clean old ref
        this.main.overlay.createStatusPanel();

        // 6. Ensure Listener is Active
        if (!this.main.listenerAttached) {
          this.main.attachListener();
        }

        break;
      case 'style':
        if (undoData.element && undoData.originalStyle) {
          Object.assign(undoData.element.style, undoData.originalStyle);
          if (this.main.currentElement === undoData.element) {
            this.main.overlay.highlightElement(this.main.currentElement);
          }
        }
        break;
    }
    return true;
  }

  selectParentElement() {
    if (this.main.currentElement && this.main.currentElement.parentElement) {
      if (this.main.currentElement.tagName === 'BODY') return;
      this.widerStack.push(this.main.currentElement);
      this.main.currentElement = this.main.currentElement.parentElement;
      this.main.overlay.highlightElement(this.main.currentElement);
      this.main.overlay.displayElementInfo(this.main.currentElement);
    }
  }

  selectChildElement() {
    if (this.widerStack.length > 0) {
      this.main.currentElement = this.widerStack.pop();
      this.main.overlay.highlightElement(this.main.currentElement);
      this.main.overlay.displayElementInfo(this.main.currentElement);
    }
  }

  makeSelector() {
    if (this.main.currentElement) {
      var s = this.generateSelector(this.main.currentElement);
      this.createClipboardDialog(s, 140);
    }
  }

  generateSelector(element) {
    if (!(element instanceof Element)) return null;

    const escapeSelector = (selector) =>
      selector.replace(/(:|\.|\[|\]|,|=|@|>)/g, '\\$1');

    const getUniqueSelector = (el) => {
      let selector = el.nodeName.toLowerCase();
      if (el.id) {
        selector += `#${escapeSelector(el.id)}`;
        if (document.querySelectorAll(selector).length === 1) return selector;
      }
      if (el.className && typeof el.className === 'string') {
        let classes = Array.from(el.classList).map(escapeSelector).join('.');
        if (classes) {
          selector += `.${classes}`;
          if (document.querySelectorAll(selector).length === 1) return selector;
        }
      }
      return null;
    };

    const getNthOfType = (el) => {
      let sibling = el;
      let nth = 1;
      while ((sibling = sibling.previousElementSibling)) {
        if (sibling.nodeName.toLowerCase() === el.nodeName.toLowerCase()) nth++;
      }
      return `:nth-of-type(${nth})`;
    };

    let path = [];
    let current = element;

    while (
      current &&
      current.nodeName.toLowerCase() !== 'html' &&
      current.nodeName.toLowerCase() !== 'body'
    ) {
      let unique = getUniqueSelector(current);
      if (unique) {
        path.unshift(unique);
        break;
      } else {
        let nth = getNthOfType(current);
        path.unshift(current.nodeName.toLowerCase() + nth);
        current = current.parentElement;
      }
    }
    return path.join(' > ');
  }

  createClipboardDialog(text = '', height = 100) {
    var initialHeight = height + 100;
    var box = new DialogBox({
      title: 'Selector',
      size: [400, initialHeight],
    });

    var textarea = makeElement('textarea', {
      style: {
        width: '100%',
        height: `${height}px`,
        boxSizing: 'border-box',
        // CHANGED: Improved readability
        fontSize: '13px',
        fontWeight: 'normal',
        color: '#222',
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        fontFamily: 'monospace',
        resize: 'none',
        display: 'block',
        marginBottom: '10px',
        padding: '8px',
      },
    });
    textarea.value = text;

    var copyButton = makeElement(
      'button',
      {
        className: 'dialog-button primary',
        style: {
          width: '100%',
        },
        onclick: () => {
          textarea.select();
          document.execCommand('copy');
          copyButton.textContent = 'Successfully copied!';
          setTimeout(() => {
            copyButton.textContent = 'Copy to Clipboard';
          }, 2000);
        },
      },
      'Copy to Clipboard'
    );

    var container = makeElement(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          padding: '10px',
        },
      },
      textarea,
      copyButton
    );

    box.contentElement.appendChild(container);
    this.main.overlay.setDataStyleExclude(box.element);
  }

  dark() {
    document.body.style.backgroundColor = '#222';
    document.body.style.color = '#ccc';
  }

  viewSource() {
    if (this.main.currentElement) {
      this.showViewSourceBox(this.main.currentElement);
    }
  }

  trimSpaces(s) {
    if (!s) return '';
    return s.trim();
  }

  expandWidth() {
    if (this.main.currentElement) {
      const element = this.main.currentElement;

      const originalStyle = {
        width: element.style.width,
        minWidth: element.style.minWidth,
        maxWidth: element.style.maxWidth,
        boxSizing: element.style.boxSizing,
        display: element.style.display,
      };

      this.undoBuffer.push({
        type: 'style',
        element: element,
        originalStyle: originalStyle,
      });

      const rect = element.getBoundingClientRect();
      const currentWidth = rect.width;
      const newWidth = currentWidth * 1.5;

      const computed = window.getComputedStyle(element);
      if (computed.display === 'inline') {
        element.style.display = 'inline-block';
      }

      element.style.boxSizing = 'border-box';
      element.style.width = `${newWidth}px`;
      element.style.minWidth = `${newWidth}px`;
      element.style.maxWidth = 'none';

      this.main.overlay.highlightElement(element);
      this.main.overlay.displayElementInfo(element);
      KeystrokeHandler.showPopup('Expanded');
    }
  }

  createGlobalReference() {
    if (!this.main.currentElement) return;

    const defaultName = 'g' + this.main.globalVarCounter;

    // Launch the Quick Input UI
    this._showGlobalVarInput(defaultName, (finalName) => {
      if (!finalName) return; // Cancelled

      window[finalName] = this.main.currentElement;

      // Toast confirmation
      try {
        const tag = this.main.currentElement.tagName.toLowerCase();
        this.main.overlay.showToast(`${finalName} = <${tag}>`, 2000);
      } catch (e) {}

      console.log(`[Aardvark] ${finalName} created:`, this.main.currentElement);

      // Only increment counter if they used the default name
      if (finalName === defaultName) {
        this.main.globalVarCounter++;
      }
    });
  }

  sendToFontzy() {
    if (!this.main.currentElement) return;

    // Check if Fontzy is available globally or needs to be instantiated
    // Usually Fontzy is a separate feature. If available:
    if (window.fontzyInstance) {
      window.fontzyInstance.setTarget(this.main.currentElement);
      window.fontzyInstance.open();
    } else {
      KeystrokeHandler.showPopup('Fontzy not active');
    }
  }

  showViewSourceBox(elem) {
    // 1. Inject CSS (Light Theme + Layout Fixes)
    if (!this.didViewSourceDboxCss) {
      applyCss(
        `
      .viewsource { 
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; 
        font-size: 13px; 
        line-height: 1.35;
        /* Allow wrapping while preserving whitespace structure */
        white-space: pre-wrap;
        overflow-wrap: break-word;
        word-wrap: break-word;
      }
      .viewsource div { margin: 0; padding: 0; }
      .viewsource div.vsblock { border-left: 1px solid #ccc; margin-left: 1em; padding-left: 6px; }
      .viewsource div.vsline { margin: 0; }
      .viewsource div.vsindent { margin-left: 1.5em; }

      .viewsource span.tag { color: #800000; font-weight: bold; }
      .viewsource span.pname { color: #ff0000; }
      .viewsource span.pval { color: #0000ff; font-weight: bold; }
      .viewsource span.aname { color: #008000; font-style: italic; font-weight: normal; }
      .viewsource span.aval { color: #000080; font-style: italic; font-weight: normal; }

      /* Toolbar buttons: compact + subtle until selected */
      .aardvark-vs-toolbar button {
        background: transparent !important;
        color: #333 !important;
        border: 1px solid transparent !important;
        box-shadow: none !important;
        font-size: 16px !important;
        padding: 2px 5px !important;
        cursor: pointer;
        min-width: 0 !important;
        border-radius: 6px;
        line-height: 1;
        opacity: 0.75;
      }
      .aardvark-vs-toolbar button:hover { 
        opacity: 1;
        border-color: rgba(0,0,0,0.15) !important;
        background: rgba(255,255,255,0.6) !important;
      }

      /* Active mode button: dramatic highlight WITHOUT changing emoji */
      .aardvark-vs-toolbar button.vs-mode.active {
        opacity: 1 !important;
        background: rgba(0,122,204,0.20) !important;
        border-color: rgba(0,122,204,0.55) !important;
        box-shadow: 0 1px 0 rgba(255,255,255,0.7) inset, 0 1px 3px rgba(0,0,0,0.18) !important;
        transform: translateY(-0.5px);
      }

      /* Copy button: always visible, slightly different hover */
      .aardvark-vs-toolbar button.vs-copy:hover {
        background: rgba(0,200,120,0.18) !important;
        border-color: rgba(0,200,120,0.55) !important;
      }

      .viewsource::-webkit-scrollbar { width: 10px; height: 10px; }
      .viewsource::-webkit-scrollbar-track { background: #f0f0f0; }
      .viewsource::-webkit-scrollbar-thumb { background: #ccc; border-radius: 5px; }
    `,
        'aardvarkViewSourceStyles'
      );
      this.didViewSourceDboxCss = true;
    }

    // 2. Initial size: ALWAYS within viewport
    const margin = 30;
    const initialWidth = Math.min(
      720,
      Math.max(320, window.innerWidth - margin)
    );
    const initialHeight = Math.min(
      620,
      Math.max(220, window.innerHeight - margin)
    );

    let cleanupClamp = null;

    var box = new DialogBox({
      title: 'View Source',
      width: `${initialWidth}px`,
      height: `${initialHeight}px`,
      buttons: [], // No footer
      allowMinimize: false,
      allowMaximize: true,
      onClose: () => {
        try {
          if (cleanupClamp) cleanupClamp();
        } catch (e) {}
      },
    });

    // Force explicit geometry (DialogBox may default to auto height)
    try {
      box.element.style.width = `${initialWidth}px`;
      box.element.style.height = `${initialHeight}px`;
      box.element.style.maxWidth = `calc(100vw - ${margin}px)`;
      box.element.style.maxHeight = `calc(100vh - ${margin}px)`;
      box.element.style.display = 'flex';
      box.element.style.flexDirection = 'column';
    } catch (e) {}

    // Keep it constrained even after resizes / window resize
    cleanupClamp = this._showViewSourceClamp(box, margin);

    // Clean Layout Setup
    box.contentElement.style.padding = '0';
    box.contentElement.style.overflow = 'hidden';
    box.contentElement.style.display = 'flex';
    box.contentElement.style.flexDirection = 'column';
    box.contentElement.style.backgroundColor = '#ffffff';
    box.contentElement.style.flex = '1 1 auto';
    box.contentElement.style.minHeight = '0'; // critical for flex scroll areas

    // ✅ Allow selecting/copying text inside this dialog even if something globally disables it
    box.contentElement.style.userSelect = 'text';
    box.contentElement.style.pointerEvents = 'auto';

    this.main.overlay.setDataStyleExclude(box.element);

    // 3. Content Container (flex child that scrolls)
    var d = makeElement('div', {
      className: 'viewsource',
      style: {
        width: '100%',
        flex: '1 1 auto',
        minHeight: '0',
        overflow: 'auto',
        backgroundColor: '#ffffff',
        color: '#000000',
        padding: '10px',
        boxSizing: 'border-box',
        whiteSpace: 'pre-wrap', // UPDATED: Changed from 'pre' to 'pre-wrap'
        overflowWrap: 'break-word', // UPDATED: Ensure long strings break
        wordWrap: 'break-word', // UPDATED: Fallback
        wordBreak: 'normal',
        userSelect: 'text',
        WebkitUserSelect: 'text',
        MozUserSelect: 'text',
        msUserSelect: 'text',
        cursor: 'text',
        pointerEvents: 'auto',
      },
    });

    // --- VIEW MODES ---
    // 0 = Full (📜)
    // 1 = Snipped (✂️)  <-- NOW TRUNCATES (does not hide)
    // 2 = Skeleton (🦴)
    let viewMode = 0;
    const modes = [
      { icon: '📜', title: 'Full Source' },
      { icon: '✂️', title: 'Snipped (truncate huge attribute values)' },
      { icon: '🦴', title: 'Skeleton Structure' },
    ];

    // Track snip stats per render (used by ✂️ mode)
    this._vsSnipStats = { items: 0, chars: 0 };

    const render = () => {
      // reset stats each render
      this._vsSnipStats = { items: 0, chars: 0 };

      while (d.firstChild) d.removeChild(d.firstChild);
      const sourceTree = this.buildSourceElement(elem, 0, viewMode);
      d.appendChild(sourceTree);

      // If we're in snip mode, report what happened
      if (viewMode === 1) {
        try {
          const st = this._vsSnipStats || { items: 0, chars: 0 };
          this.main.overlay.showToast(
            `Snipped ${st.items} value${st.items === 1 ? '' : 's'} (${
              st.chars
            } chars)`,
            1800
          );
        } catch (e) {}
      }
    };

    render();
    box.contentElement.appendChild(d);

    const copyTextToClipboard = async (text) => {
      const failSafeCopy = (t) => {
        try {
          const ta = document.createElement('textarea');
          ta.value = t;
          ta.setAttribute('readonly', '');
          ta.style.position = 'fixed';
          ta.style.left = '-9999px';
          ta.style.top = '-9999px';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          const ok = document.execCommand && document.execCommand('copy');
          document.body.removeChild(ta);
          return !!ok;
        } catch (e) {
          return false;
        }
      };

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch (e) {}

      return failSafeCopy(text);
    };

    // --- Toolbar (Copy + ONLY the 3 mode emojis) ---
    const toolbar = makeElement('div', {
      className: 'aardvark-vs-toolbar',
      style: {
        position: 'absolute',
        right: '36px',
        top: '0',
        bottom: '0',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        zIndex: '10',
        height: '100%',
      },
      'data-style-exclude': '',
    });

    toolbar.onmousedown = (e) => e.stopPropagation();

    const modeButtons = [];

    const setActiveMode = (idx) => {
      viewMode = idx;
      modeButtons.forEach((b, i) => {
        b.classList.toggle('active', i === idx);
        b.title = modes[i].title;
      });
      render();
    };

    // ✅ Copy icon (📋) — copies whatever is currently shown
    const copyBtn = makeElement(
      'button',
      {
        className: 'vs-copy',
        title: 'Copy visible source to clipboard',
        onclick: async () => {
          try {
            const text = d && d.innerText ? d.innerText : '';
            const ok = await copyTextToClipboard(text);
            if (ok) KeystrokeHandler.showPopup('Copied');
            else KeystrokeHandler.showPopup('Copy failed');
          } catch (e) {
            KeystrokeHandler.showPopup('Copy failed');
            console.error(e);
          }
        },
        style: { fontSize: '16px' },
      },
      '📋'
    );

    toolbar.appendChild(copyBtn);

    for (let i = 0; i < modes.length; i++) {
      const b = makeElement(
        'button',
        {
          className: 'vs-mode',
          title: modes[i].title,
          onclick: () => setActiveMode(i),
          style: { fontSize: '16px' },
        },
        modes[i].icon
      );
      modeButtons.push(b);
    }

    // Initialize active state
    setActiveMode(0);

    toolbar.append(...modeButtons);

    const header = box.element.firstElementChild;
    if (header) {
      if (!header.style.position || header.style.position === 'static') {
        header.style.position = 'relative';
      }
      header.appendChild(toolbar);
    }
  }

  buildSourceElement(node, indent, viewMode) {
    const container = document.createDocumentFragment();

    switch (node.nodeType) {
      case 1: // Element
        {
          if (node.style.display == 'none') break;

          // Mode 2 (Bone): Only elements allowed
          const isSkeleton = viewMode === 2;

          const validChildren = Array.from(node.childNodes).filter((c) => {
            if (!isSkeleton) return true;
            return c.nodeType === 1;
          });

          // One Line logic
          const renderOneLine = isSkeleton
            ? validChildren.length === 0
            : node.childNodes.length === 0 &&
              this.main.leafElems[node.nodeName];

          if (renderOneLine) {
            const wrapper = makeElement('div', { className: 'vsindent' });
            this.appendStartTag(wrapper, node, true, viewMode);
            container.appendChild(wrapper);
          } else {
            let blockWrapper;
            if (indent > 0) {
              blockWrapper = makeElement('div', { className: 'vsblock' });
            } else {
              blockWrapper = container;
            }

            const startLine = makeElement('div', { className: 'vsline' });
            this.appendStartTag(startLine, node, false, viewMode);
            blockWrapper.appendChild(startLine);

            validChildren.forEach((child) => {
              blockWrapper.appendChild(
                this.buildSourceElement(child, indent + 1, viewMode)
              );
            });

            const endLine = makeElement('div', { className: 'vsline' });
            this.appendEndTag(endLine, node);
            blockWrapper.appendChild(endLine);

            if (indent > 0) container.appendChild(blockWrapper);
          }
        }
        break;

      case 3: // Text
        {
          if (viewMode === 2) break; // Bone: No text

          var v = node.nodeValue;
          v = this.trimSpaces(v);
          if (v != '' && v != '\n' && v != '\r\n' && v.charCodeAt(0) != 160) {
            const div = makeElement('div', { className: 'vsindent' });
            div.textContent = v;
            container.appendChild(div);
          }
        }
        break;

      case 4: // CDATA
      case 8: // Comment
        if (viewMode === 0) {
          // Full mode only
          const div = makeElement('div', { className: 'vsindent' });
          div.textContent =
            node.nodeType === 8
              ? '<!--' + node.nodeValue + '-->'
              : '<![CDATA[' + node.nodeValue + ']]>';
          container.appendChild(div);
        }
        break;
    }
    return container;
  }

  appendEndTag(container, node) {
    container.appendChild(document.createTextNode('</'));
    const tagSpan = makeElement('span', { className: 'tag' });
    tagSpan.textContent = node.nodeName.toLowerCase();
    container.appendChild(tagSpan);
    container.appendChild(document.createTextNode('>'));
  }

  appendStartTag(container, node, isOneLine, viewMode) {
    container.appendChild(document.createTextNode('<'));

    const tagSpan = makeElement('span', { className: 'tag' });
    tagSpan.textContent = node.nodeName.toLowerCase();
    container.appendChild(tagSpan);

    for (var i = 0; i < node.attributes.length; i++) {
      const attr = node.attributes.item(i);
      const n = attr.nodeName;

      // MODE LOGIC
      if (viewMode === 2) {
        // Bone: ID, Class only
        if (n !== 'id' && n !== 'class') continue;
      } else if (viewMode === 1) {
        // ✂️ Snipped: DO NOT HIDE everything; only hide event handler attrs.
        if (n && String(n).toLowerCase().startsWith('on')) continue;
      }

      if (attr.nodeValue != null && attr.nodeValue != '') {
        container.appendChild(document.createTextNode(' '));

        const pName = makeElement('span', { className: 'pname' });
        pName.textContent = attr.nodeName;
        container.appendChild(pName);

        // Special handling for style attribute in Full Mode (0)
        if (attr.nodeName === 'style' && viewMode === 0) {
          container.appendChild(document.createTextNode('="'));
          const styleStr = attr.nodeValue;
          const parts = styleStr.split(';');
          let first = true;

          parts.forEach((part) => {
            if (!part.trim()) return;
            if (!first) container.appendChild(document.createTextNode('; '));

            const pair = part.split(':');
            if (pair.length === 2) {
              const aName = makeElement('span', { className: 'aname' });
              aName.textContent = this.trimSpaces(pair[0]);
              container.appendChild(aName);

              container.appendChild(document.createTextNode(': '));

              const aVal = makeElement('span', { className: 'aval' });
              aVal.textContent = this.trimSpaces(pair[1]);
              container.appendChild(aVal);
            } else {
              container.appendChild(document.createTextNode(part));
            }
            first = false;
          });

          if (styleStr.trim().endsWith(';'))
            container.appendChild(document.createTextNode(';'));
          container.appendChild(document.createTextNode('"'));
        } else {
          container.appendChild(document.createTextNode('="'));
          const pVal = makeElement('span', { className: 'pval' });

          // ✅ Full/snipped formatting + snip-mode truncation
          pVal.textContent = this._formatSourceAttrValue(
            attr.nodeName,
            attr.nodeValue,
            viewMode
          );

          container.appendChild(pVal);
          container.appendChild(document.createTextNode('"'));
        }
      }
    }

    const isVoid = this.main.leafElems[node.nodeName];
    if (isVoid) {
      container.appendChild(document.createTextNode(' />'));
    } else {
      container.appendChild(document.createTextNode('>'));
      if (isOneLine) {
        this.appendEndTag(container, node);
      }
    }
  }

  toggleBigBlocks() {
    const existing = document.querySelectorAll('.aardvark_block_highlight');
    if (existing.length > 0) {
      existing.forEach((el) => {
        if (el.dataset.aardvarkOriginalOutline) {
          el.style.outline = el.dataset.aardvarkOriginalOutline;
          delete el.dataset.aardvarkOriginalOutline;
        } else {
          el.style.outline = '';
        }
        el.classList.remove('aardvark_block_highlight');
      });
      KeystrokeHandler.showPopup('Blocks Cleared');
      return;
    }

    // Heuristic Configuration
    const MIN_AREA = 5000; // e.g. 50x100 pixels
    const PARENT_CHILD_RATIO = 0.6; // Child must be < 60% of parent to count parent as a "block container"

    const all = document.querySelectorAll('body *');
    const blocks = [];

    for (let i = 0; i < all.length; i++) {
      const el = all[i];

      // Exclude Aardvark UI
      if (
        el.classList.contains('aardvark_highlight') ||
        el.classList.contains('aardvark_infoElement') ||
        el.classList.contains('aardvark_status') ||
        el.closest('.aardvark_status') ||
        el.closest('.aardvark_highlight')
      )
        continue;

      // Basic visibility/size check
      const rect = el.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) continue;

      const area = rect.width * rect.height;
      if (area < MIN_AREA) continue;

      // Must have children to be considered a structural block (excludes text nodes/leaves)
      if (el.children.length === 0) continue;

      let maxChildArea = 0;
      for (let j = 0; j < el.children.length; j++) {
        const child = el.children[j];
        const cRect = child.getBoundingClientRect();
        // Don't get confused by hidden/zero-size children
        if (cRect.width === 0 || cRect.height === 0) continue;

        const cArea = cRect.width * cRect.height;
        if (cArea > maxChildArea) maxChildArea = cArea;
      }

      // Check for "Big Jump"
      // If the largest child is significantly smaller than the parent,
      // the parent is adding significant structure/space.
      if (maxChildArea < area * PARENT_CHILD_RATIO) {
        blocks.push(el);
      }
    }

    // Visualization
    blocks.forEach((el, index) => {
      // Generate Rainbow Colors
      // Use Golden Angle (137.5) to distribute hues distinctly
      const hue = (index * 137.5) % 360;

      // Contrast adjustments:
      // Darken Yellow (60) and Cyan (180) ranges so they show up on white backgrounds
      let lightness = 50;
      if (hue > 45 && hue < 85) lightness = 35; // Yellows
      if (hue > 160 && hue < 200) lightness = 40; // Cyans

      const color = `hsl(${hue}, 100%, ${lightness}%)`;

      // Save state
      el.dataset.aardvarkOriginalOutline = el.style.outline;

      // Apply
      el.style.outline = `3px solid ${color}`;
      el.classList.add('aardvark_block_highlight');
    });

    KeystrokeHandler.showPopup(`Highlighted ${blocks.length} Blocks`);
  }

  flashElement(element, color) {
    const originalTransition = element.style.transition;
    const originalOutline = element.style.outline;

    // Flash effect
    element.style.transition = 'outline 0.2s ease-in-out';
    element.style.outline = `4px solid ${color}`;

    // Remove after short delay
    setTimeout(() => {
      element.style.outline = originalOutline;
      // Restore transition property after animation clears
      setTimeout(() => {
        element.style.transition = originalTransition;
      }, 200);
    }, 800);
  }

  captureForLlm() {
    if (!this.main.currentElement) return;

    const selector = this.generateSelector(this.main.currentElement);
    if (!selector) {
      KeystrokeHandler.showPopup('Could not generate selector');
      return;
    }

    // Add to basket
    this.llmCaptures.push({
      cmd: 'find',
      css: selector,
      note: `Captured item ${this.llmCaptures.length + 1} (${
        this.main.currentElement.tagName
      })`,
    });

    const payload = [
      ...this.llmCaptures,
      { cmd: 'pulseall', color: 'magenta', count: 2 },
    ];

    const json = JSON.stringify(payload, null, 2);

    // 1. Copy to Clipboard
    navigator.clipboard
      .writeText(json)
      .then(() => {
        KeystrokeHandler.showPopup(
          `Captured! (${this.llmCaptures.length} items)`
        );
      })
      .catch((e) => {
        KeystrokeHandler.showPopup('Clipboard Error');
        console.error(e);
      });

    // 2. Sync to WebDiag via API
    if (window.webDiagInstance && window.webDiagInstance.updateInput) {
      window.webDiagInstance.updateInput(json);
    } else if (window.webDiagInstance && window.webDiagInstance.inputArea) {
      // Fallback
    }
  }

  clearLlmCaptures() {
    this.llmCaptures = [];
    KeystrokeHandler.showPopup('Capture List Cleared');

    if (window.webDiagInstance && window.webDiagInstance.updateInput) {
      window.webDiagInstance.updateInput('');
    }
  }

  async playWebDiagFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (
        !text ||
        (!text.trim().startsWith('[') && !text.trim().startsWith('{'))
      ) {
        KeystrokeHandler.showPopup('Clipboard not JSON');
        return;
      }

      // Check for WebDiag instance
      if (!window.webDiagInstance) {
        // Auto-launch if missing (requires MiscBookmarklets logic or implicit global)
        // We can try to use the global class if available
        if (typeof WebDiagUI !== 'undefined') {
          // Don't necessarily open the dialog, just use the engine?
          // Actually WebDiagUI creates the engine. Let's just use the engine if we can.
        } else {
          KeystrokeHandler.showPopup('WebDiag not loaded');
          return;
        }
      }

      // We can run handle() even if the UI isn't visible
      const wdl = window.webDiagInstance.wdl;

      KeystrokeHandler.showPopup('Running WebDiag...');
      const result = await wdl.handle(text);

      // Feedback
      if (result.startsWith('OK')) {
        const count = result.split('\n')[0].split(' ')[1];
        KeystrokeHandler.showPopup(`Success: ${count} cmds`);
      } else {
        KeystrokeHandler.showPopup('WebDiag Error');
        console.log(result);
      }
    } catch (e) {
      console.error(e);
      KeystrokeHandler.showPopup('Run Failed: ' + e.message);
    }
  }

  startPickMode(message, callback) {
    if (this.pickModeActive) this.quitPickMode();

    this.pickModeActive = true;
    this.pickCallback = callback;

    const label = message || "Select element (Press 'x' or 'Enter')";
    KeystrokeHandler.showPopup(label);

    // Update status panel to show instruction
    if (this.main.overlay.statusPanel) {
      const msgDiv = this.main.overlay.statusPanel.querySelector(
        '.aardvark_status_content div:last-child'
      );
      if (msgDiv) {
        this._originalStatusText = msgDiv.textContent;
        msgDiv.textContent = "PICK MODE: Press 'x' to Select";
        msgDiv.style.color = '#00ff41'; // Matrix Green
      }
    }

    this.pickHandler = () => {
      if (this.main.currentElement && this.pickCallback) {
        const el = this.main.currentElement;
        // Visual flash confirmation
        this.flashElement(el, '#00ff41');
        this.pickCallback(el);
        this.quitPickMode();
      }
    };

    // Register temporary handlers
    KeystrokeHandler.addHandler('x', this.pickHandler);
    KeystrokeHandler.addHandler('Enter', this.pickHandler);
  }

  quitPickMode() {
    if (!this.pickModeActive) return;

    KeystrokeHandler.removeHandler('x');
    KeystrokeHandler.removeHandler('Enter');

    if (this.main.overlay.statusPanel && this._originalStatusText) {
      const msgDiv = this.main.overlay.statusPanel.querySelector(
        '.aardvark_status_content div:last-child'
      );
      if (msgDiv) {
        msgDiv.textContent = this._originalStatusText;
        msgDiv.style.color = '#ffd700';
      }
    }

    this.pickModeActive = false;
    this.pickCallback = null;
    this.pickHandler = null;
    KeystrokeHandler.showPopup('Pick Mode Ended');
  }

  resetTraversalHistory() {
    // Clears the wider/narrower history so "narrower" can't jump back to a prior session.
    this.widerStack = [];
  }

  isUndoAvailable() {
    return !!(this.undoBuffer && this.undoBuffer.length > 0);
  }

  isNarrowerAvailable() {
    return !!(this.widerStack && this.widerStack.length > 0);
  }

  _showGlobalVarInput(defaultValue, callback) {
    // 1. Pause Aardvark Inputs
    this.main.removeKeyboardHandlers();

    // 2. Inject CSS for the box and animation
    if (!document.getElementById('aardvark-global-css')) {
      applyCss(
        `
      @keyframes av-progress-shrink {
        from { width: 100%; }
        to { width: 0%; }
      }
      .av-global-box {
        position: fixed; top: 20%; left: 50%; transform: translateX(-50%);
        width: 220px; background: #222; border: 1px solid #444;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        border-radius: 6px; padding: 0; z-index: 2147483650;
        overflow: hidden; font-family: sans-serif;
      }
      .av-global-input {
        width: 100%; background: transparent; border: none;
        color: #fff; font-size: 18px; font-weight: bold;
        padding: 12px 15px; outline: none; text-align: center;
      }
      .av-global-timer {
        height: 3px; background: #00bcd4; width: 100%;
      }
      .av-global-timer.running {
        animation: av-progress-shrink 4s linear forwards;
      }
    `,
        'aardvark-global-css'
      );
    }

    // 3. Create DOM
    const container = makeElement('div', {
      className: 'av-global-box',
      'data-style-exclude': '',
    });
    const input = makeElement('input', {
      className: 'av-global-input',
      value: defaultValue,
      'data-style-exclude': '',
    });
    const timerBar = makeElement('div', {
      className: 'av-global-timer running',
      'data-style-exclude': '',
    });

    container.appendChild(input);
    container.appendChild(timerBar);
    document.body.appendChild(container);

    input.select();
    input.focus();

    let isClosed = false;
    let timerId = null;

    const close = (resultName) => {
      if (isClosed) return;
      isClosed = true;

      if (timerId) clearTimeout(timerId);
      container.remove();

      // Resume Aardvark Inputs
      this.main.attachKeyboardHandlers();

      if (callback) callback(resultName);
    };

    // 4. Timer Logic (Auto-accept default)
    timerId = setTimeout(() => {
      close(input.value || defaultValue); // Time's up: Save
    }, 4000);

    // 5. Event Handlers
    input.addEventListener('keydown', (e) => {
      e.stopPropagation(); // Stop bubbling

      if (e.key === 'Enter') {
        close(input.value);
      } else if (e.key === 'Escape') {
        close(null); // Cancel
      }
    });

    input.addEventListener('input', () => {
      // Stop the timer if user types
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      // Visually remove the timer bar
      timerBar.style.display = 'none';
      timerBar.classList.remove('running');
    });

    // Handle click outside
    const clickOutside = (e) => {
      if (!container.contains(e.target)) {
        document.removeEventListener('mousedown', clickOutside, true);
        // If clicked outside, we assume accept default/current?
        // Or cancel? Let's accept current to be safe.
        close(input.value);
      }
    };

    // Use timeout to prevent the immediate click that spawned this from closing it
    setTimeout(() => {
      document.addEventListener('mousedown', clickOutside, true);
    }, 100);
  }

  toggleContentEdit() {
    if (!this.main.currentElement) return;
    const el = this.main.currentElement;

    if (el.isContentEditable) {
      // Turn Off
      el.contentEditable = 'false';
      el.blur();
      KeystrokeHandler.showPopup('Edit Mode OFF');
      this.main.overlay.highlightElement(el); // Refresh highlight
    } else {
      // Turn On — make editable then quit Aardvark so keystrokes work normally
      el.contentEditable = 'true';
      el.focus();

      // Visual feedback
      this.flashElement(el, '#00bfff'); // Deep Sky Blue
      KeystrokeHandler.showPopup('Edit Mode ON — Aardvark paused');

      // Quit Aardvark so keyboard works for editing
      this.main.quit();
    }
  }

  updateColor(color) {
    this.main.overlay.highlightElement(this.main.currentElement, color);
  }

  simulateClick() {
    if (this.main.currentElement) {
      const el = this.main.currentElement;

      // Visual feedback
      this.flashElement(el, '#ff00ff'); // Flash Magenta
      KeystrokeHandler.showPopup('Clicking...');

      // "Little time out" to decouple from user input
      setTimeout(() => {
        el.click();
      }, 150);
    }
  }

  _truncateString(str, opts) {
    const o = opts || {};
    const maxLen = typeof o.maxLen === 'number' ? o.maxLen : 180;
    const head = typeof o.head === 'number' ? o.head : 60;
    const tail = typeof o.tail === 'number' ? o.tail : 40;

    if (str == null) return '';
    const s = String(str);

    if (s.length <= maxLen) {
      return { text: s, removed: 0, did: false };
    }

    const h = Math.max(0, Math.min(head, s.length));
    const t = Math.max(0, Math.min(tail, s.length - h));
    const removed = Math.max(0, s.length - (h + t));

    const start = s.slice(0, h);
    const end = t > 0 ? s.slice(s.length - t) : '';

    const out = `${start}...(snipped ${removed} chars)...${end}`;
    return { text: out, removed: removed, did: true };
  }

  openLinkInIframe() {
    if (!this.main.currentElement) return;
    const el = this.main.currentElement;

    // 1. Find URL
    let url = null;
    if (el.tagName === 'A' && el.href) {
      url = el.href;
    } else {
      const childLink = el.querySelector('a[href]');
      if (childLink) url = childLink.href;
    }

    if (!url) {
      KeystrokeHandler.showPopup('No link found in selection');
      return;
    }

    // 2. Build Dialog Content
    const container = makeElement('div', {
      style: 'display: flex; flex-direction: column; height: 100%;',
    });

    const iframe = makeElement('iframe', {
      src: url,
      style: 'flex-grow: 1; border: 1px solid #444; background: #fff;',
    });

    container.appendChild(iframe);

    // 3. Create Dialog
    const box = new DialogBox({
      title: `Browsing: ${url}`,
      content: container,
      width: '800px',
      height: '600px',
      allowMinimize: false,
      buttons: [
        {
          label: 'View DOM',
          className: 'primary',
          onClick: () => {
            try {
              const doc = iframe.contentDocument;
              if (!doc) {
                throw new Error(
                  'Browser blocked access (CORS). Cannot read DOM from different origin.'
                );
              }
              const root = doc.documentElement;
              this.showViewSourceBox(root);
            } catch (e) {
              alert(
                `Scrape Failed: ${e.message}\n\nNote: You can only scrape iframes that share the same origin (domain/protocol/port) as the current page.`
              );
            }
          },
        },
        {
          label: 'Close',
          onClick: (btn, dialog) => {
            dialog.close();
          },
        },
      ],
    });

    this.main.overlay.setDataStyleExclude(box.element);
  }

  programmaticClick() {
    if (this.main.currentElement) {
      // Visual feedback before action
      this.flashElement(this.main.currentElement, '#00ff00');

      // Small timeout to allow visual feedback to register
      setTimeout(() => {
        if (this.main.currentElement) {
          this.main.currentElement.click();
        }
      }, 50);
    }
  }

  _showViewSourceClamp(box, margin = 24) {
    if (!box || !box.element) return () => {};

    const clamp = () => {
      try {
        const maxW = Math.max(260, window.innerWidth - margin);
        const maxH = Math.max(180, window.innerHeight - margin);

        // If the dialog doesn't have an explicit size yet, give it one.
        const curRect = box.element.getBoundingClientRect();
        const curW = curRect.width || 600;
        const curH = curRect.height || 400;

        let w = Math.min(curW, maxW);
        let h = Math.min(curH, maxH);

        // Hard constraints so it can never grow beyond viewport
        box.element.style.maxWidth = `${maxW}px`;
        box.element.style.maxHeight = `${maxH}px`;

        box.element.style.width = `${w}px`;
        box.element.style.height = `${h}px`;

        // Also keep it on-screen
        const r = box.element.getBoundingClientRect();
        const pad = 8;
        let left = r.left;
        let top = r.top;

        if (left < pad) left = pad;
        if (top < pad) top = pad;
        if (left + r.width > window.innerWidth - pad)
          left = Math.max(pad, window.innerWidth - pad - r.width);
        if (top + r.height > window.innerHeight - pad)
          top = Math.max(pad, window.innerHeight - pad - r.height);

        box.element.style.transform = 'none';
        box.element.style.left = `${left}px`;
        box.element.style.top = `${top}px`;
      } catch (e) {}
    };

    clamp();

    const onResize = () => clamp();
    window.addEventListener('resize', onResize);

    // Also clamp after any resize end (covers user drag-resize)
    const mo = new MutationObserver(() => {
      // Throttle-ish: just re-clamp on any style changes
      clamp();
    });
    try {
      mo.observe(box.element, { attributes: true, attributeFilter: ['style'] });
    } catch (e) {}

    return () => {
      try {
        window.removeEventListener('resize', onResize);
      } catch (e) {}
      try {
        mo.disconnect();
      } catch (e) {}
    };
  }

  _tryDecodeURIComponentSafe(s) {
    try {
      return decodeURIComponent(s);
    } catch (e) {
      return s;
    }
  }

  _formatSourceAttrValue(attrName, rawValue, viewMode) {
    if (rawValue == null) return '';

    let v = String(rawValue);

    // If it *looks* URL-encoded, decode for display (common culprit: huge %xx blobs).
    // Only do this for URL-ish attributes to avoid mangling arbitrary strings.
    const n = String(attrName || '').toLowerCase();
    const isUrlish =
      n === 'href' ||
      n === 'src' ||
      n === 'action' ||
      n === 'poster' ||
      n === 'data-src' ||
      n === 'data-href' ||
      n === 'srcset';

    if (isUrlish && v.includes('%')) {
      if (/%[0-9a-fA-F]{2}/.test(v)) {
        v = this._tryDecodeURIComponentSafe(v);
      }
    }

    // Normalize weird whitespace
    v = v.replace(/\u00a0/g, ' ');
    v = v.replace(/\u2028|\u2029/g, '\n');

    // ✂️ Snip mode: truncate huge values instead of hiding attributes
    if (viewMode === 1) {
      // Heuristics: SVG paths + data URLs + giant querystrings deserve aggressive snips
      const isSvgPath = n === 'd' || n === 'points';
      const isDataUrl = v.startsWith('data:');
      const looksHuge = v.length > 220;

      if (isSvgPath || isDataUrl || looksHuge) {
        const t = this._truncateString(v, {
          maxLen: isDataUrl ? 140 : isSvgPath ? 160 : 200,
          head: isDataUrl ? 50 : isSvgPath ? 60 : 70,
          tail: isDataUrl ? 30 : isSvgPath ? 40 : 60,
        });

        if (t && t.did) {
          // accumulate stats for toast
          try {
            if (!this._vsSnipStats) this._vsSnipStats = { items: 0, chars: 0 };
            this._vsSnipStats.items += 1;
            this._vsSnipStats.chars += t.removed || 0;
          } catch (e) {}
          return t.text;
        }
      }
    }

    return v;
  }

}