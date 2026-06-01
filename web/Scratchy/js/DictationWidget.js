
class DictationWidget {
  editorBox = null;

  editorContent = null;

  controlBox = null;

  statusDiv = null;

  recognition = null;

  isListening = false;

  modifierHeld = false;

  lastRange = null;

  lastCaretRect = null;

  popupElement = null;

  popupTextElement = null;

  popupSvgPath = null;

  popupSvgConnector = null;

  isPopupVisible = false;

  tokenSerialCounter = 1;

  lastTokens = [];

  pendingPunct = [];

  subscribers = new Set();

  punctMap = {
    period: '.',
    comma: ',',
    'question mark': '?',
    'exclamation point': '!',
    'exclamation mark': '!',
    exclamation: '!',
    'new line': '\n\n',
    newline: '\n\n',
    'new paragraph': '\n\n',
  };

  init() {
    this.isEditing = false;
    this.toggleListenBtn = null;
    this.toggleEditBtn = null;
    this.clearBtn = null;
    this.currentlyHighlighted = [];
    this.boundHandleEditorMouseMove = this.handleEditorMouseMove.bind(this);
    this.boundClearAllHighlights = this.clearAllHighlights.bind(this);
    this.spaceWidth = null;
    this.openQuoteSpans = [];
    this.subscribers = new Set();
    this.staleTimestamp = 0;
    this.applyStyles();
    this.setupUI();
    this.setupRecognition();
    this.setupEventListeners();
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    // Immediately notify with current state
    const content = this.editorContent ? this.editorContent.textContent : '';
    try {
      callback(content);
    } catch (e) {
      console.error(
        'Error in initial DictationWidget subscription notification:',
        e
      );
    }
  }

  unsubscribe(callback) {
    this.subscribers.delete(callback);
  }

  _notifySubscribers() {
    const content = this.editorContent ? this.editorContent.textContent : '';
    if (window.projectApp) {
      // Cache the last content before notifying, so consumers can use it
      // if this notification is part of an "onClose" event.
    }
    for (const callback of this.subscribers) {
      try {
        callback(content);
      } catch (e) {
        console.error('Error in DictationWidget subscriber:', e);
      }
    }
  }

  setupUI() {
    const controlsContainer = makeElement('div', {
      style: {
        padding: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
      },
    });

    this.clearBtn = makeElement(
      'button',
      {
        onclick: () => this.clearContent(),
        style: {
          display: 'none',
          backgroundColor: '#3a1c1c',
          color: '#bd8a8a',
          border: '1px solid #5e2a2a',
          borderRadius: '4px',
          padding: '6px 12px',
          cursor: 'pointer',
          fontWeight: '600',
          transition: 'all 0.2s ease',
        },
        onmouseenter: (e) => {
          e.target.style.backgroundColor = '#4a2c2c';
          e.target.style.color = '#fff';
        },
        onmouseleave: (e) => {
          e.target.style.backgroundColor = '#3a1c1c';
          e.target.style.color = '#bd8a8a';
        },
      },
      'Clear'
    );

    this.toggleListenBtn = makeElement(
      'button',
      {
        onclick: () => this.toggleListening(),
        style: {
          padding: '6px 16px',
          fontWeight: '600',
          borderRadius: '4px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          backgroundColor: '#1b3320',
          border: '1px solid #2e4a32',
          color: '#8abf8e',
        },
        onmouseenter: (e) => {
          if (this.isListening) {
            e.target.style.backgroundColor = '#4a1b1b';
            e.target.style.color = '#fff';
          } else {
            e.target.style.backgroundColor = '#264a2e';
            e.target.style.color = '#fff';
          }
        },
        onmouseleave: (e) => {
          this.updateButtonStates();
        },
      },
      'Start Listening'
    );

    this.statusDiv = makeElement('div', {
      style: {
        fontStyle: 'italic',
        color: 'var(--text-secondary)',
        margin: '0 10px',
        flex: '1',
      },
    });

    this.copyButton = makeElement(
      'button',
      {
        className: 'dictation-copy-btn',
        onclick: (e) => this.copyContent(e),
      },
      'Copy'
    );

    // UPDATED LABEL
    this.magicSendBtn = makeElement(
      'button',
      {
        className: 'dictation-magic-btn',
        onclick: (e) => this.magicSendContent(e),
        style: {
          display: 'none',
          backgroundColor: '#00695c',
          borderColor: '#004d40',
          color: '#ffffff',
          marginLeft: '5px',
          fontWeight: 'bold',
        },
        title: 'Send text directly to Gemini',
      },
      '🚀 Send to Gemini'
    );

    this.toggleEditBtn = makeElement(
      'button',
      { onclick: () => this.toggleEditMode() },
      'Quick Edit'
    );

    const tooltipText = 'Enter Quick Edit mode...';
    this.toggleEditBtn.addEventListener('mouseover', () =>
      GlowingTooltip.show(this.toggleEditBtn, tooltipText, {
        color: [255, 152, 0],
        maxWidth: 350,
      })
    );
    this.toggleEditBtn.addEventListener('mouseout', () =>
      GlowingTooltip.hide()
    );

    controlsContainer.append(
      this.clearBtn,
      this.toggleListenBtn,
      this.statusDiv,
      this.copyButton,
      this.magicSendBtn,
      this.toggleEditBtn
    );

    this.editorContent = makeElement('div', {
      contentEditable: true,
      style: {
        height: '100%',
        outline: 'none',
        whiteSpace: 'pre-wrap',
        fontSize: '1rem',
        lineHeight: '1.5',
        color: 'var(--text-primary)',
        padding: '10px',
        boxSizing: 'border-box',
        flex: '1',
        overflowY: 'auto',
      },
    });

    this.editorContent.addEventListener('input', () => {
      this.staleTimestamp = 0;
      this.updateButtonStates();
      this._notifySubscribers();
    });

    this.element = makeElement(
      'div',
      {
        className: 'superdictate-widget-container',
        style: {
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: 'var(--bg-tertiary)',
        },
      },
      [controlsContainer, this.editorContent]
    );

    this.setupPopupUI();
    this.updateButtonStates();
  }

  setupPopupUI() {
    this.popupTextElement = makeElement('span');
    this.popupElement = makeElement(
      'div',
      { className: 'tentative-popup' },
      this.popupTextElement
    );

    this.popupSvgPath = makeElement('svg:path', {});

    this.popupSvgConnector = makeElement(
      'svg:svg',
      {
        className: 'tentative-popup-connector',
        style: {
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100vw',
          height: '100vh',
          display: 'none', // initially hidden
        },
      },
      this.popupSvgPath
    );

    document.body.appendChild(this.popupElement);
    document.body.appendChild(this.popupSvgConnector);

    this.isPopupVisible = false;
  }

  updatePopup(text) {
    if (text) {
      this.popupTextElement.textContent = text;
      this.showPopup();
    } else {
      this.hidePopup();
    }
  }

  showPopup() {
    if (this.isPopupVisible) return;
    this.isPopupVisible = true;
    // We don't set display block here immediately; positionPopup logic handles display
  }

  hidePopup() {
    if (!this.isPopupVisible) return;
    this.isPopupVisible = false;
    if (this.popupElement) this.popupElement.style.display = 'none';
    if (this.popupSvgConnector) this.popupSvgConnector.style.display = 'none';
  }

  positionPopup(caretRect, editorRect) {
    if (!this.isPopupVisible || !caretRect || !editorRect) return;
    if (this.popupElement.parentElement !== document.body) {
      document.body.appendChild(this.popupElement);
      document.body.appendChild(this.popupSvgConnector);
    }
    this.popupElement.style.display = 'block';
    this.popupSvgConnector.style.display = 'block';
    const popupEl = this.popupElement;
    void popupEl.offsetHeight;
    const pWidth = popupEl.offsetWidth || 260;
    const pHeight = popupEl.offsetHeight || 60;
    const gap = 16;
    let top = caretRect.bottom + gap;
    let left = caretRect.left + caretRect.width / 2 - pWidth / 2;
    const pad = 16;
    if (left < pad) left = pad;
    if (left + pWidth > window.innerWidth - pad) {
      left = window.innerWidth - pad - pWidth;
    }
    top = Math.max(pad, Math.min(top, window.innerHeight - pHeight - pad));
    popupEl.style.position = 'fixed';
    popupEl.style.left = left + 'px';
    popupEl.style.top = top + 'px';
    popupEl.style.transform = 'none';
    requestAnimationFrame(() => {
      const finalPopupRect = popupEl.getBoundingClientRect();
      this.drawPopupConnector(caretRect, finalPopupRect, 'top');
    });
  }

  drawPopupConnector(caretRect, popupRect, anchorSide) {
    if (!this.popupSvgPath) return;

    // Start from the bottom-center of the caret (since we prioritize "below")
    const startX = caretRect.left + caretRect.width / 2;
    const startY = caretRect.bottom;

    let endX, endY;

    // Calculate endpoint on box
    switch (anchorSide) {
      case 'top':
        // Connect to top edge of box, slightly offset to match visual flow
        endX = popupRect.left + popupRect.width / 2;
        endY = popupRect.top;
        break;
      case 'left':
        endX = popupRect.left;
        endY = popupRect.top + popupRect.height / 2;
        break;
      case 'right':
        endX = popupRect.right;
        endY = popupRect.top + popupRect.height / 2;
        break;
      default:
        endX = popupRect.left + popupRect.width / 2;
        endY = popupRect.top;
    }

    // Control Points for smooth Bezier
    let cp1x, cp1y, cp2x, cp2y;
    const tension = 30; // Length of the control handle

    if (anchorSide === 'top') {
      // Drop down, then curve in
      cp1x = startX;
      cp1y = startY + tension;
      cp2x = endX;
      cp2y = endY - tension;
    } else if (anchorSide === 'left') {
      // Curve right to hit left side
      cp1x = startX;
      cp1y = startY + tension; // Down first
      cp2x = endX - tension;
      cp2y = endY; // Then straight in
    } else if (anchorSide === 'right') {
      // Curve left to hit right side
      cp1x = startX;
      cp1y = startY + tension;
      cp2x = endX + tension;
      cp2y = endY;
    } else {
      cp1x = startX;
      cp1y = startY + 20;
      cp2x = endX;
      cp2y = endY - 20;
    }

    this.popupSvgPath.setAttribute(
      'd',
      `M ${startX},${startY} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${endX},${endY}`
    );
  }

  showPopupCentered(editorRect) {
    if (!this.isPopupVisible || !editorRect) return;
    this.popupSvgConnector.style.display = 'none';
    this.popupElement.style.display = 'block';

    const popupEl = this.popupElement;
    void popupEl.offsetHeight;
    const popupRect = popupEl.getBoundingClientRect();

    const targetTop =
      editorRect.top + editorRect.height / 2 - popupRect.height / 2;
    const targetLeft =
      editorRect.left + editorRect.width / 2 - popupRect.width / 2;

    // THE FIX FOR `position: absolute`: Add scroll offsets here as well.
    const finalLeft = targetLeft + window.scrollX;
    const finalTop = targetTop + window.scrollY;

    popupEl.style.transform = `translate(${finalLeft}px, ${finalTop}px)`;
  }

  setupEventListeners() {
    this.editorContent.addEventListener('keyup', () =>
      this.handleCaretActivity()
    );
    this.editorContent.addEventListener('mouseup', () =>
      this.handleCaretActivity()
    );
    this.editorContent.addEventListener('input', () => {
      this.handleCaretActivity();
      this._notifySubscribers();
    });
    this.editorContent.addEventListener('blur', () => this.hidePopup());
    document.addEventListener('selectionchange', () => {
      if (document.activeElement === this.editorContent)
        this.handleCaretActivity();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        this.modifierHeld = true;
        this.updateButtonStates();
      }

      if (this.isEditing) {
        const spaceSpan = this.editorContent.querySelector('.highlight-space');
        if (spaceSpan) {
          if (['.', ',', ';', ':'].includes(e.key)) {
            e.preventDefault();
            this.handleSmartPunctuation(e.key, spaceSpan);
          } else if (e.key === '"') {
            e.preventDefault();
            this.handleSmartQuote(spaceSpan);
          } else if (e.key === 'Shift') {
            e.preventDefault();
            this.handleShiftToggleCase(spaceSpan);
          } else if (e.key === ' ') {
            // Spacebar
            e.preventDefault();
            this.handleClearPunctuation(spaceSpan);
          }
        } else if (e.key === 'Shift') {
          // Handle shift on a single highlighted word
          const wordSpan = this.editorContent.querySelector('.highlight-main');
          if (wordSpan) {
            e.preventDefault();
            this.handleShiftToggleCase(wordSpan, true);
          }
        }
      }

      if (
        this.isListening &&
        !this.isEditing &&
        ['.', ',', '?'].includes(e.key)
      ) {
        e.preventDefault();
        this.addPendingPunctuation(e.key);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        this.modifierHeld = false;
        this.updateButtonStates();
      }
    });
  }

  setupRecognition() {
    const SpeechAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechAPI) {
      this.updateStatus('❌ Speech API not supported.');
      alert('Web Speech API is not supported in this browser.');
      return;
    }
    this.recognition = new SpeechAPI();
    this.recognition.lang = 'en-US';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;

    this.recognition.onresult = (event) => this.handleRecognitionResult(event);

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.stopListening();
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        this.recognition.start();
      }
    };
  }

  startListening() {
    if (!this.recognition || this.isListening) return;
    this.editorContent.focus();
    const sel = window.getSelection();
    sel.selectAllChildren(this.editorContent);
    sel.collapseToEnd();
    this.isListening = true;
    this.recognition.start();
    this.updateButtonStates();
  }

  stopListening() {
    if (!this.recognition || !this.isListening) return;
    this.isListening = false;
    this.recognition.stop();
    this.updatePopup('');
    this.updateButtonStates();
  }

  handleRecognitionResult(event) {
    let interimTranscript = '';
    let finalTranscript = '';
    let anyFinal = false;

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
        anyFinal = true;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    if (interimTranscript) {
      const tokens = this.tokeniseWithSerials(interimTranscript);
      this.lastTokens = tokens;
      const display = this.renderTokens(tokens);
      this.updatePopup(display);

      const editorRect = this.editorContent.getBoundingClientRect();
      if (this.lastCaretRect) {
        this.positionPopup(this.lastCaretRect, editorRect);
      } else {
        this.showPopupCentered(editorRect);
      }
    }

    if (!anyFinal) return;

    // Step A: Parse Command
    const cmdResult = this.parseCommandFromTranscript(finalTranscript);
    const textToProcess = cmdResult.text || '';

    // Step B: Prepare Text
    if (textToProcess.trim()) {
      const finalTokens = this.tokeniseWithSerials(textToProcess);
      const finalDisplay = this.renderTokens(finalTokens);

      const finalSerials = new Set(finalTokens.map((t) => t.serial));
      this.pendingPunct = this.pendingPunct.filter(
        (p) => !finalSerials.has(p.serial)
      );

      const rawNow = !!this.modifierHeld;

      // FIX: Do NOT process transcript here. Pass finalDisplay (raw words) to insertTextAtCursor.
      // insertTextAtCursor handles processing if !rawNow.
      // This prevents \n\n from being stripped by trim() calls in processTranscript logic if called twice.
      this.insertTextAtCursor(finalDisplay, rawNow);
    } else {
      this.pendingPunct = [];
    }

    // Step C: Execute Command (after insertion)
    if (cmdResult.action) {
      requestAnimationFrame(() => {
        cmdResult.action();
      });
    }

    this.updatePopup('');
    this.lastTokens = [];
  }

  processTranscript(rawText) {
    const tokens = rawText.trim().split(/\s+/);
    if (tokens.length === 0 || (tokens.length === 1 && tokens[0] === ''))
      return '';

    let out = '';
    let shouldCapitalizeNextWord = false;

    for (let i = 0; i < tokens.length; i++) {
      const t1 = tokens[i].toLowerCase();
      const t2 = (tokens[i + 1] || '').toLowerCase();
      const twoWordKey = `${t1} ${t2}`;

      let punct = this.punctMap[twoWordKey];
      let consumed = 0;

      if (punct) {
        consumed = 2;
      } else {
        punct = this.punctMap[t1];
        if (punct) consumed = 1;
      }

      if (punct) {
        if (out.endsWith(' ')) out = out.slice(0, -1);
        out += punct;

        if (/[.!?]|\n\n/.test(punct)) shouldCapitalizeNextWord = true;
        if (/[.,!?;:]/.test(punct)) out += ' ';

        i += consumed - 1;
      } else {
        let word = tokens[i];
        if (word.toLowerCase() === 'i') word = 'I';

        if (shouldCapitalizeNextWord) {
          word = word.charAt(0).toUpperCase() + word.slice(1);
          shouldCapitalizeNextWord = false;
        }
        out += word + ' ';
      }
    }

    // FIX: Do not use .trim() because it strips leading/trailing newlines (\n)
    // We only want to strip spaces and tabs from the ends.
    return out.replace(/^[ \t]+/, '').replace(/[ \t]+$/, '');
  }

  insertTextAtCursor(text, isRaw = false) {
    if (!this.editorContent) return;

    // Transform "new line" -> "\n\n" here
    let frag = isRaw ? text : this.processTranscript(text);

    // Guard against empty result, but allow pure newlines
    if (!frag && frag !== '\n' && frag !== '\n\n') return;

    const content = this.editorContent.textContent || '';
    let start = 0;
    if (this.lastRange) {
      const whole = document.createRange();
      whole.selectNodeContents(this.editorContent);
      const beforeR = document.createRange();
      beforeR.setStart(whole.startContainer, whole.startOffset);
      beforeR.setEnd(this.lastRange.startContainer, this.lastRange.startOffset);
      start = beforeR.toString().length;
    } else {
      start = content.length;
    }

    // Context-aware casing (only if text has letters)
    if (/[a-zA-Z0-9]/.test(frag)) {
      if (start === 0 || /[.!?\n]\s*$/.test(content.slice(0, start))) {
        frag = frag.charAt(0).toUpperCase() + frag.slice(1);
      }
    }

    // Context-aware spacing
    const charBefore = content.charAt(start - 1);
    if (!/^[.,;:!?\n]/.test(frag) && charBefore && !/\s/.test(charBefore)) {
      frag = ' ' + frag;
    }

    let end = start;
    if (this.lastRange) {
      const whole2 = document.createRange();
      whole2.selectNodeContents(this.editorContent);
      const afterR = document.createRange();
      afterR.setStart(whole2.startContainer, whole2.startOffset);
      afterR.setEnd(this.lastRange.endContainer, this.lastRange.endOffset);
      end = afterR.toString().length;
    }
    const charAfter = content.charAt(end);
    if (!/[.,;:!?\n]$/.test(frag) && charAfter && !/\s/.test(charAfter)) {
      frag = frag + ' ';
    }

    // Insertion Strategy
    this.editorContent.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();

    let range;
    if (this.lastRange) {
      range = this.lastRange.cloneRange();
    } else {
      range = document.createRange();
      range.selectNodeContents(this.editorContent);
      range.collapse(false);
    }

    range.deleteContents();

    const fragment = document.createDocumentFragment();
    const parts = frag.split('\n');
    let lastInsertedNode = null;

    parts.forEach((part, index) => {
      // Add text part
      if (part.length > 0) {
        const textNode = document.createTextNode(part);
        fragment.appendChild(textNode);
        lastInsertedNode = textNode;
      }
      // Add BR for every newline found (except the end)
      if (index < parts.length - 1) {
        const br = document.createElement('br');
        fragment.appendChild(br);
        lastInsertedNode = br;
      }
    });

    if (fragment.hasChildNodes()) {
      range.insertNode(fragment);

      // Ensure cursor is placed AFTER the inserted content
      if (lastInsertedNode) {
        range.setStartAfter(lastInsertedNode);
        range.collapse(true);
      }

      sel.removeAllRanges();
      sel.addRange(range);
    }

    this.handleCaretActivity();
    this._notifySubscribers();

    requestAnimationFrame(() => {
      this.editorContent.scrollTop = this.editorContent.scrollHeight;
    });
  }

  handleCaretActivity() {
    const sel = window.getSelection();
    if (!sel.rangeCount) {
      this.hidePopup();
      return;
    }
    const range = sel.getRangeAt(0);
    if (!this.editorContent.contains(range.commonAncestorContainer)) {
      this.hidePopup();
      return;
    }

    this.lastRange = range.cloneRange();
    const posRange = range.cloneRange();
    posRange.collapse(true);

    let finalCaretRect = null;

    const rects = posRange.getClientRects();
    if (rects && rects.length > 0) {
      const rawRect = rects[0];
      finalCaretRect = {
        left: rawRect.left,
        top: rawRect.top,
        width: rawRect.width || 8,
        height: rawRect.height || 16,
        right: rawRect.right || rawRect.left + (rawRect.width || 8),
        bottom: rawRect.bottom || rawRect.top + (rawRect.height || 16),
      };
    } else {
      // FALLBACK 1: try boundingClientRect (sometimes works when getClientRects is empty)
      const b = posRange.getBoundingClientRect
        ? posRange.getBoundingClientRect()
        : null;
      if (
        b &&
        (b.width || b.height) &&
        (b.left || b.top || b.right || b.bottom)
      ) {
        finalCaretRect = {
          left: b.left,
          top: b.top,
          width: b.width || 8,
          height: b.height || 16,
          right: b.right || b.left + (b.width || 8),
          bottom: b.bottom || b.top + (b.height || 16),
        };
      } else {
        // FALLBACK 2: inject a tiny marker to measure caret position reliably
        try {
          const marker = document.createElement('span');
          marker.textContent = '\u200B';
          marker.style.display = 'inline-block';
          marker.style.width = '0px';
          marker.style.height = '1em';
          marker.style.verticalAlign = 'baseline';
          marker.style.pointerEvents = 'none';

          const tempRange = posRange.cloneRange();
          tempRange.insertNode(marker);

          const mr = marker.getBoundingClientRect();
          finalCaretRect = {
            left: mr.left,
            top: mr.top,
            width: mr.width || 8,
            height: mr.height || 16,
            right: mr.right || mr.left + (mr.width || 8),
            bottom: mr.bottom || mr.top + (mr.height || 16),
          };

          // remove marker and restore selection
          marker.remove();

          // Restore original selection safely
          sel.removeAllRanges();
          sel.addRange(range);
        } catch (e) {
          // If all else fails, keep null -> we'll use centered mode, but at least we tried hard.
          finalCaretRect = null;
        }
      }
    }

    this.lastCaretRect = finalCaretRect;

    const editorRect = this.editorContent.getBoundingClientRect();
    if (this.lastCaretRect) {
      this.positionPopup(this.lastCaretRect, editorRect);
    } else {
      this.showPopupCentered(editorRect);
    }
  }

  tokeniseWithSerials(asrString) {
    const words = asrString.trim().split(/\s+/).filter(Boolean);
    const prev = this.lastTokens;
    const used = new Set();
    const tokens = [];

    words.forEach((w) => {
      let reusedSerial = null;
      for (let i = 0; i < prev.length; i++) {
        if (!used.has(i) && prev[i].word === w) {
          reusedSerial = prev[i].serial;
          used.add(i);
          break;
        }
      }
      if (reusedSerial === null) reusedSerial = this.tokenSerialCounter++;
      tokens.push({ word: w, serial: reusedSerial });
    });

    return tokens;
  }

  renderTokens(tokens) {
    const punctMap = {};
    this.pendingPunct.forEach((p) => {
      punctMap[p.serial] ||= [];
      punctMap[p.serial].push(p.char);
    });

    const parts = [];
    tokens.forEach((t, idx) => {
      parts.push(t.word);
      if (punctMap[t.serial]) {
        punctMap[t.serial].forEach((ch) => parts.push(ch));
      }
      if (idx < tokens.length - 1) parts.push(' ');
    });
    return parts.join('');
  }

  addPendingPunctuation(char) {
    const interimActive = this.isPopupVisible && this.lastTokens.length;

    if (!interimActive) {
      this.insertTextAtCursor(char, true);
      return;
    }

    const anchor = this.lastTokens[this.lastTokens.length - 1];
    this.pendingPunct.push({ serial: anchor.serial, char });

    const display = this.renderTokens(this.lastTokens);
    this.updatePopup(display);
    this.positionPopup(
      this.lastCaretRect,
      this.editorContent.getBoundingClientRect()
    );
  }

  applyStyles() {
    applyCss(
      `
    .dw-root {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #1e1e2e;
      color: #cdd6f4;
      font-family: 'Segoe UI', sans-serif;
    }
    .dw-toolbar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 10px;
      background: #313244;
      border-bottom: 1px solid #45475a;
      flex-shrink: 0;
    }
    .dw-btn {
      padding: 6px 14px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.2s;
      position: relative;
    }
    .dw-btn:hover {
      transform: translateY(-1px);
      filter: brightness(1.15);
    }
    .dw-btn-listen {
      background: #a6e3a1;
      color: #1e1e2e;
    }
    .dw-btn-listen.listening {
      background: #f38ba8;
      color: #1e1e2e;
      animation: dw-pulse 1.5s ease-in-out infinite;
    }
    @keyframes dw-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(243, 139, 168, 0.5); }
      50% { box-shadow: 0 0 12px 4px rgba(243, 139, 168, 0.3); }
    }
    .dw-btn-copy {
      background: #89b4fa;
      color: #1e1e2e;
    }
    .dw-btn-quickedit {
      background: #f9e2af;
      color: #1e1e2e;
    }
    .dw-btn-clear {
      background: #585b70;
      color: #cdd6f4;
    }
    .dw-btn[title] {
      position: relative;
    }
    .dw-btn::after {
      content: attr(data-tooltip);
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      background: #1e1e2e;
      color: #cdd6f4;
      border: 1px solid #585b70;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 100;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    }
    .dw-btn:hover::after {
      opacity: 1;
    }
    .dw-textarea {
      flex: 1;
      width: 100%;
      background: #1e1e2e;
      color: #cdd6f4;
      border: none;
      padding: 12px;
      font-size: 15px;
      font-family: 'Segoe UI', sans-serif;
      line-height: 1.6;
      resize: none;
      outline: none;
      box-sizing: border-box;
    }
    .dw-textarea::placeholder {
      color: #585b70;
    }
    .dw-status {
      padding: 4px 10px;
      font-size: 12px;
      color: #6c7086;
      background: #313244;
      border-top: 1px solid #45475a;
      flex-shrink: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .dw-footer-link {
      font-size: 12px;
      color: #89b4fa;
      text-decoration: none;
      opacity: 0.8;
      transition: opacity 0.2s;
    }
    .dw-footer-link:hover {
      opacity: 1;
      text-decoration: underline;
    }
    .dw-interim {
      color: #6c7086;
      font-style: italic;
    }
    /* Updated Popup Styles - Black bg, Bright Green border, small radius */
    .tentative-popup {
      position: fixed !important;
      background: #000000;
      border: 2px solid #39ff14; /* Bright Green */
      border-radius: 6px; /* Smaller radius */
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6);
      z-index: 100000 !important;
      padding: 12px 16px;
      min-width: 200px;
      color: #ffffff; /* White text */
      font-size: 16px;
      font-weight: 500;
      line-height: 1.4;
      pointer-events: none;
      white-space: pre-wrap;
    }
    .tentative-popup-connector {
      position: fixed !important;
      pointer-events: none !important;
      z-index: 99999 !important;
    }
    .tentative-popup-connector path {
      stroke: #39ff14; /* Match Bright Green border */
      stroke-width: 2;
      stroke-linecap: round;
      fill: none;
    }
    /* Fix for invisible spaces in Edit Mode */
    .quick-edit-span-space {
      display: inline-block; /* Essential for width to apply */
      vertical-align: middle;
      height: 1em; /* Ensure it holds vertical space */
      /* No width here, width is set inline in JS based on measurement */
    }
    .quick-edit-span-word {
      padding: 1px 0;
      border-radius: 3px;
      cursor: text;
    }
    .highlight-main {
      background-color: rgba(255, 255, 0, 0.3);
      outline: 1px solid rgba(255, 255, 0, 0.6);
    }
    .highlight-context {
      background-color: rgba(255, 255, 0, 0.1);
    }
    .highlight-space {
      background-color: rgba(0, 255, 255, 0.2);
      outline: 1px solid rgba(0, 255, 255, 0.5);
    }
    `,
      'dictation-widget-styles'
    );
  }

  toggleListening() {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  toggleEditMode() {
    if (this.isListening) {
      this.stopListening();
    }

    this.isEditing = !this.isEditing;
    if (this.isEditing) {
      this.spanifyContent();
      this.editorContent.addEventListener(
        'mousemove',
        this.boundHandleEditorMouseMove
      );
      this.editorContent.addEventListener(
        'mouseleave',
        this.boundClearAllHighlights
      );
    } else {
      this.clearAllHighlights();
      this.deSpanifyContent();
      this.editorContent.removeEventListener(
        'mousemove',
        this.boundHandleEditorMouseMove
      );
      this.editorContent.removeEventListener(
        'mouseleave',
        this.boundClearAllHighlights
      );
    }
    this.updateButtonStates();
  }

  spanifyContent() {
    if (!this.spaceWidth) {
      this.getSpaceWidth();
    }

    const text = this.editorContent.textContent;
    this.editorContent.contentEditable = false;
    while (this.editorContent.firstChild) {
      this.editorContent.removeChild(this.editorContent.firstChild);
    }

    const fragment = document.createDocumentFragment();
    const lines = text.split('\n');

    lines.forEach((line, index) => {
      const tokens = line.match(/\S+|\s+/g) || [];
      tokens.forEach((token) => {
        if (/\S/.test(token)) {
          const span = makeElement(
            'span',
            { className: 'quick-edit-span-word' },
            token
          );
          fragment.appendChild(span);
        } else {
          for (let i = 0; i < token.length; i++) {
            const spaceSpan = makeElement(
              'span',
              {
                className: 'quick-edit-span-space',
                style: { width: `${this.spaceWidth}px` },
              },
              '\u200B'
            ); // Zero-width space to force rendering
            fragment.appendChild(spaceSpan);
          }
        }
      });

      if (index < lines.length - 1) {
        fragment.appendChild(makeElement('br'));
      }
    });

    this.editorContent.appendChild(fragment);
  }

  deSpanifyContent() {
    let reconstructedText = '';
    this.editorContent.childNodes.forEach((node) => {
      if (node.nodeName === 'BR') {
        reconstructedText += '\n';
      } else if (
        node.nodeType === Node.ELEMENT_NODE &&
        node.classList.contains('quick-edit-span-space')
      ) {
        reconstructedText += ' ';
      } else {
        reconstructedText += node.textContent;
      }
    });

    this.editorContent.contentEditable = true;
    this.editorContent.textContent = reconstructedText;
    this.editorContent.focus();

    const sel = window.getSelection();
    if (sel) {
      sel.selectAllChildren(this.editorContent);
      sel.collapseToEnd();
    }

    this._notifySubscribers(); // Notify subscribers that content has changed.
  }

  updateButtonStates() {
    if (!this.statusDiv) return;

    const hasText = this.hasContent();

    if (this.clearBtn) {
      this.clearBtn.style.display = hasText ? 'inline-block' : 'none';
      // Reset to muted style
      this.clearBtn.style.backgroundColor = '#3a1c1c';
      this.clearBtn.style.color = '#bd8a8a';
      this.clearBtn.style.borderColor = '#5e2a2a';
    }

    if (this.isListening) {
      this.toggleListenBtn.textContent = 'Stop Listening';
      // Muted Red
      this.toggleListenBtn.style.backgroundColor = '#331b1b';
      this.toggleListenBtn.style.borderColor = '#4a2e2e';
      this.toggleListenBtn.style.color = '#bf8a8a';
      this.toggleListenBtn.style.boxShadow = 'none'; // GlowBox handles the glow now
    } else {
      this.toggleListenBtn.textContent = 'Start Listening';
      // Muted Green
      this.toggleListenBtn.style.backgroundColor = '#1b3320';
      this.toggleListenBtn.style.borderColor = '#2e4a32';
      this.toggleListenBtn.style.color = '#8abf8e';
      this.toggleListenBtn.style.boxShadow = 'none';
    }

    this.toggleListenBtn.disabled = this.isEditing;
    this.toggleEditBtn.textContent = this.isEditing
      ? 'Finish Editing'
      : 'Quick Edit';
    this.toggleEditBtn.disabled = false;

    let status = '🔇 Idle';
    if (this.isEditing) status = '✏️ Editing';
    else if (this.isListening) status = '🎙️ Listening';
    const modText = this.modifierHeld ? ' (Raw Mode)' : '';
    this.statusDiv.textContent = `${status}${modText}`;
  }

  handleEditorMouseMove(e) {
    const target = e.target;
    if (
      !target ||
      (!target.classList.contains('quick-edit-span-word') &&
        !target.classList.contains('quick-edit-span-space'))
    ) {
      this.clearAllHighlights();
      return;
    }

    this.clearAllHighlights();

    const highlight = (el, type) => {
      if (
        el &&
        (el.classList.contains('quick-edit-span-word') ||
          el.classList.contains('quick-edit-span-space'))
      ) {
        el.classList.add(type);
        this.currentlyHighlighted.push(el);
      }
    };

    const targetSpace = this.findTargetSpace(target, e.clientX);

    if (targetSpace) {
      const prevWord = targetSpace.previousElementSibling;
      const nextWord = targetSpace.nextElementSibling;
      highlight(targetSpace, 'highlight-space');
      highlight(prevWord, 'highlight-context');
      highlight(nextWord, 'highlight-context');
    } else if (target.classList.contains('quick-edit-span-word')) {
      highlight(target, 'highlight-main');
    }
  }

  clearAllHighlights() {
    for (const el of this.currentlyHighlighted) {
      el.classList.remove(
        'highlight-main',
        'highlight-context',
        'highlight-space'
      );
    }
    this.currentlyHighlighted = [];
  }

  getSpaceWidth() {
    const measurer = makeElement(
      'span',
      {
        style: {
          position: 'absolute',
          visibility: 'hidden',
          font: window.getComputedStyle(this.editorContent).font,
          'white-space': 'pre',
        },
      },
      ' '
    );

    document.body.appendChild(measurer);
    this.spaceWidth = measurer.getBoundingClientRect().width;
    document.body.removeChild(measurer);
  }

  clearContent() {
    while (this.editorContent.firstChild) {
      this.editorContent.removeChild(this.editorContent.firstChild);
    }
    this.staleTimestamp = 0;
    this.editorContent.focus();
    this.updateButtonStates();
    this._notifySubscribers();
  }

  copyContent(e) {
    if (this.isEditing) this.toggleEditMode();
    const text = this.editorContent.textContent;
    if (!text) return;

    if (window.projectApp && window.projectApp.clipboardSink) {
      try {
        window.projectApp.clipboardSink.receive(text);
        this._showButtonFeedback(e ? e.target : this.copyButton, 'Sent!');
        this.markAsUsed(); // Mark stale
        return;
      } catch (err) {
        console.error(err);
      }
    }

    navigator.clipboard.writeText(text).then(() => {
      let button = e ? e.target : this.copyButton;
      this._showButtonFeedback(button, 'Copied!');
      this.markAsUsed(); // Mark stale
    });
  }

  handleSmartPunctuation(key, spaceSpan) {
    const prevWordSpan = spaceSpan.previousElementSibling;
    const nextWordSpan = spaceSpan.nextElementSibling;

    if (
      prevWordSpan &&
      prevWordSpan.classList.contains('quick-edit-span-word')
    ) {
      let prevText = prevWordSpan.textContent;
      if (/[.,?!;:]$/.test(prevText)) {
        prevText = prevText.slice(0, -1);
      }
      prevWordSpan.textContent = prevText + key;
    }

    if (
      nextWordSpan &&
      nextWordSpan.classList.contains('quick-edit-span-word')
    ) {
      if (key === '.') {
        let nextText = nextWordSpan.textContent;
        if (nextText.length > 0) {
          nextWordSpan.textContent =
            nextText.charAt(0).toUpperCase() + nextText.slice(1);
        }
      }
    }
  }

  handleSmartQuote(spaceSpan) {
    if (this.openQuoteSpans.length > 0) {
      const prevWordSpan = spaceSpan.previousElementSibling;
      if (
        prevWordSpan &&
        prevWordSpan.classList.contains('quick-edit-span-word')
      ) {
        prevWordSpan.textContent = prevWordSpan.textContent + '”';
        this.openQuoteSpans = [];
      }
    } else {
      const nextWordSpan = spaceSpan.nextElementSibling;
      if (
        nextWordSpan &&
        nextWordSpan.classList.contains('quick-edit-span-word')
      ) {
        nextWordSpan.textContent = '“' + nextWordSpan.textContent;
        this.openQuoteSpans.push(nextWordSpan);
      }
    }
  }

  handleShiftToggleCase(targetSpan, isSingleWord = false) {
    let wordToToggle;
    if (isSingleWord) {
      wordToToggle = targetSpan;
    } else {
      wordToToggle = targetSpan.nextElementSibling;
    }

    if (
      wordToToggle &&
      wordToToggle.classList.contains('quick-edit-span-word')
    ) {
      let text = wordToToggle.textContent;
      if (text.length > 0) {
        const firstChar = text.charAt(0);
        if (firstChar === firstChar.toUpperCase()) {
          wordToToggle.textContent = firstChar.toLowerCase() + text.slice(1);
        } else {
          wordToToggle.textContent = firstChar.toUpperCase() + text.slice(1);
        }
      }
    }
  }

  findTargetSpace(target, clientX) {
    if (target.classList.contains('quick-edit-span-space')) {
      return target;
    }
    if (target.classList.contains('quick-edit-span-word')) {
      const rect = target.getBoundingClientRect();
      const relX = (clientX - rect.left) / rect.width;
      if (relX < 0.5) {
        const prev = target.previousElementSibling;
        if (prev && prev.classList.contains('quick-edit-span-space')) {
          return prev;
        }
        return target.nextElementSibling;
      } else {
        const next = target.nextElementSibling;
        if (next && next.classList.contains('quick-edit-span-space')) {
          return next;
        }
        return target.previousElementSibling;
      }
    }
    return null;
  }

  handleClearPunctuation(spaceSpan) {
    const prevWordSpan = spaceSpan.previousElementSibling;
    if (
      prevWordSpan &&
      prevWordSpan.classList.contains('quick-edit-span-word')
    ) {
      prevWordSpan.textContent = prevWordSpan.textContent.replace(
        /[.,?!;:]$/,
        ''
      );
    }
  }

  getElement() {
    return this.element;
  }

  destroy() {
    if (this.isListening) this.stopListening();

    // Popup Cleanup
    if (this.popupElement) this.popupElement.remove();
    if (this.popupSvgConnector) this.popupSvgConnector.remove();

    this.subscribers.clear();

    if (this.element) {
      this.element.remove();
    }

    if (window.projectApp && window.projectApp.superDictateInstance === this) {
    }
  }

  wordToNum = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };

  processCommands(transcript) {
    // Deprecated in favor of parseCommandFromTranscript
    // Kept empty or removed to avoid confusion if called elsewhere
    return false;
  }

  deleteWords(count) {
    this.editorContent.focus();
    const sel = window.getSelection();
    if (!sel.rangeCount) return;

    // Collapse to end of current selection (which is where we just inserted text, if any)
    sel.collapseToEnd();

    // Extend backwards word by word
    for (let i = 0; i < count; i++) {
      if (sel.modify) {
        // 'extend' moves the focus node, keeping the anchor fixed, creating a selection
        sel.modify('extend', 'backward', 'word');
      }
    }

    // Delete the selected range
    const range = sel.getRangeAt(0);
    range.deleteContents();

    this.handleCaretActivity();
    this._notifySubscribers();
  }

  parseCommandFromTranscript(transcript) {
    const clean = transcript.trim();

    // Copy to Clipboard
    let match = clean.match(/^(.*)(?:^|\s)copy to clipboard[\W]*$/i);
    if (match) {
      return {
        text: match[1],
        action: () => this.copyContent(),
      };
    }

    // Quick Edit
    match = clean.match(/^(.*)(?:^|\s)quick edit[\W]*$/i);
    if (match) {
      return {
        text: match[1],
        action: () => this.toggleEditMode(),
      };
    }

    // Delete N Words
    // Regex: Captures text before command in group 1.
    // Handles "delete 5 words" or "delete five words".
    match = clean.match(
      /^(.*)(?:^|\s)delete\s+(?:the\s+last\s+)?(\w+)\s+words?[\W]*$/i
    );
    if (match) {
      const prefix = match[1];
      const amountStr = match[2];
      let count = parseInt(amountStr, 10);
      if (isNaN(count)) {
        count = this.wordToNum[amountStr.toLowerCase()];
      }

      if (count && count >= 1 && count <= 10) {
        return {
          text: prefix,
          action: () => this.deleteWords(count),
        };
      }
    }

    return { text: clean, action: null };
  }

  updateCopyButtonState(sink) {
    // If we have a sink (Teleporter connected), show the magic button
    if (this.magicSendBtn) {
      if (sink && sink.isConnected) {
        this.magicSendBtn.style.display = 'inline-block';
      } else {
        this.magicSendBtn.style.display = 'none';
      }
    }
  }

  _showButtonFeedback(button, tempText) {
    if (!button) return;
    const originalText = button.textContent;
    button.textContent = tempText;
    button.disabled = true;
    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 1500);
  }

  hasContent() {
    if (!this.editorContent) return false;
    // Get text, replace zero-width spaces and non-breaking spaces, then trim
    const cleanText = this.editorContent.textContent
      .replace(/[\u200B\u00A0]/g, '')
      .trim();
    return cleanText.length > 0;
  }

  markAsUsed() {
    this.staleTimestamp = Date.now();
    this._notifySubscribers(); // Trigger guidance update
  }

  magicSendContent(e) {
    if (window.projectApp && window.projectApp.clipboardSink) {
      const text = this.editorContent.textContent;
      if (!text) return;

      // Check for Super Mode (Shift Key)
      const isSuperMode = e && e.shiftKey;

      try {
        // Send object with text and mode flag
        window.projectApp.clipboardSink.receive({
          text: text,
          superMode: isSuperMode,
        });

        this._showButtonFeedback(
          e ? e.target : this.magicSendBtn,
          isSuperMode ? 'Auto-Run!' : 'Sent!'
        );
        this.markAsUsed();

        // Clear content immediately after sending (Standard behavior)
        this.clearContent();
      } catch (err) {
        console.error('Magic Send failed:', err);
      }
    }
  }

  getText() {
    console.log(
      '[DEBUG-PROMPT] getText() called on DictationWidget instance:',
      this
    );

    if (!this.editorContent) {
      console.error('[DEBUG-PROMPT] getText() failed: editorContent is null');
      return '';
    }

    // DEBUG LOGGING
    console.log('[DEBUG-PROMPT] Raw innerHTML:', this.editorContent.innerHTML);
    console.log(
      '[DEBUG-PROMPT] Raw textContent:',
      this.editorContent.textContent
    );
    console.log('[DEBUG-PROMPT] Raw innerText:', this.editorContent.innerText);

    // Robust extraction: clone to avoid modifying live DOM, replace BRs with newlines
    const clone = this.editorContent.cloneNode(true);
    const brs = clone.getElementsByTagName('br');
    // iterate backwards to safely replace
    for (let i = brs.length - 1; i >= 0; i--) {
      brs[i].replaceWith('\n');
    }

    // Replace zero-width spaces if any (from edit mode)
    const rawText = clone.textContent || '';
    const cleanText = rawText.replace(/[\u200B\u00A0]/g, ' ');

    console.log('[DEBUG-PROMPT] Final cleanText length:', cleanText.length);
    console.log('[DEBUG-PROMPT] Final cleanText content:', cleanText);

    return cleanText;
  }

  _createToolbar() {
    const toolbar = makeElement('div', { className: 'dw-toolbar' });

    this._listenBtn = makeElement('button', {
      className: 'dw-btn dw-btn-listen',
      textContent: '🎙️ Start Listening',
      'data-tooltip': 'Start/stop speech-to-text dictation',
      onclick: () => this._toggleListening(),
    });

    this._copyBtn = makeElement('button', {
      className: 'dw-btn dw-btn-copy',
      textContent: '📋 Copy',
      'data-tooltip': 'Copy all text to clipboard',
      onclick: () => this._copyToClipboard(),
    });

    this._quickEditBtn = makeElement('button', {
      className: 'dw-btn dw-btn-quickedit',
      textContent: '✏️ Quick Edit',
      'data-tooltip': 'Fix punctuation, capitalization & spacing',
      onclick: () => this._quickEdit(),
    });

    this._clearBtn = makeElement('button', {
      className: 'dw-btn dw-btn-clear',
      textContent: '🗑️ Clear',
      'data-tooltip': 'Clear all text',
      onclick: () => this._clearText(),
    });

    toolbar.appendChild(this._listenBtn);
    toolbar.appendChild(this._copyBtn);
    toolbar.appendChild(this._quickEditBtn);
    toolbar.appendChild(this._clearBtn);
    return toolbar;
  }

  _createStatusBar() {
    const bar = makeElement('div', { className: 'dw-status' });

    const link = makeElement('a', {
      className: 'dw-footer-link',
      href: '#',
      textContent: 'dictation tips & shortcuts',
      onclick: (e) => {
        e.preventDefault();
        this._showHelpDialog();
      },
    });

    this._statusText = makeElement(
      'span',
      {},
      'Ready — click Start Listening or type directly'
    );
    bar.appendChild(link);
    bar.appendChild(this._statusText);
    return bar;
  }

  _showHelpDialog() {
      const content = makeElement('div', {
        style: {
          padding: '16px',
          fontFamily: "'Segoe UI', sans-serif",
          fontSize: '14px',
          color: '#cdd6f4',
          lineHeight: '1.7',
          background: '#1e1e2e',
        },
      });

      content.innerHTML = `
        <h3 style="margin:0 0 12px; color:#cba6f7; font-size:18px;">Dictation Tips</h3>
        <p><strong style="color:#a6e3a1;">🎙️ Start Listening</strong> - Uses your browser's speech recognition. Speak naturally and it transcribes in real time.</p>
        <p><strong style="color:#89b4fa;">📋 Copy</strong> - Copies everything in the text area to your clipboard.</p>
        <p><strong style="color:#f9e2af;">✏️ Quick Edit</strong> - Fixes capitalization, punctuation, and spacing automatically. Great after dictating!</p>
        <p><strong style="color:#585b70;">🗑️ Clear</strong> - Erases all text.</p>
        <h4 style="margin:16px 0 8px; color:#cba6f7; font-size:15px;">Voice Commands</h4>
        <p>Say <em>"delete last 3 words"</em> to remove words. Say <em>"copy to clipboard"</em> to copy.</p>
        <p>You can also just type directly - the text area is fully editable.</p>
      `;

      UITools.makeDialog({
        env: this.env || this.app?.env || null,
        title: '💡 Dictation Help',
        size: [480, 400],
        contentElement: content,
        noPadding: true,
        buttons: [{ label: 'Got it' }],
      });
    }

  

  
}

