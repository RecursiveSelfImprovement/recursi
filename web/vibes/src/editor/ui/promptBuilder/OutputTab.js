class OutputTab {
  constructor(app) {
      this.app = app;
      this.ui = {};
      this.codeSegment = null;
      this.partSegments = [];

      this.splitEnabled = false;
      this.sizeUnit = 'chars';
      this.maxSize = 20000;
      this.maxParts = 12;
      this.minPartSizeRatio = 0.55;
      this.preferBoundaries = 'paragraphs';
      this.originalText = '';

      // NEW: Track state for guidance
      this.hasCopied = false;

      // OBSOLETE: GlowBox button highlighting is obsolete and has been fully decommissioned.
      this.copyBtnGlow = null;

      this.element = this._createElement();
    }

  _createElement() {
        this.ui.copyButtonComponent = new SplitButton({
          label: 'Copy to Clipboard',
          tooltip: 'Copy current output',
          mainBtnClass: 'copy-btn',
          mainAction: (e) => this._copyContent(e, false),
          dropdownItems: [
            {
              label: 'Copy + Protocol Tips',
              onClick: (e) => this._copyContent(e, true),
            },
          ],
        });

        this.ui.copyButton = this.ui.copyButtonComponent.element;
        if (this.ui.copyButtonComponent.mainBtn) {
          this.ui.copyButtonComponent.mainBtn.classList.add('output-btn');
          this.ui.copyButtonComponent.mainBtn.addEventListener('mouseover', (e) => {
              if (window.GlowingTooltip) GlowingTooltip.show(e.currentTarget, 'Copy output to clipboard', { color: [100, 255, 100] });
          });
          this.ui.copyButtonComponent.mainBtn.addEventListener('mouseout', () => {
              if (window.GlowingTooltip) GlowingTooltip.hide();
          });
        }

        this.ui.magicSendBtn = makeElement(
          'button',
          {
            className: 'output-btn magic-btn',
            onclick: (e) => this._magicSend(e),
            style: {
              display: 'none',
              backgroundColor: '#00695c',
              borderColor: '#004d40',
              color: '#fff',
              fontWeight: '600',
              marginLeft: '10px',
              padding: '8px 16px',
            },
            onmouseover: (e) => {
                if (window.GlowingTooltip) GlowingTooltip.show(e.currentTarget, 'Send directly to AI', { color: [255, 150, 50] });
            },
            onmouseout: () => {
                if (window.GlowingTooltip) GlowingTooltip.hide();
            }
          },
          '🚀 Send to Gemini'
        );

        this.ui.clearButton = makeElement(
          'button',
          {
            className: 'output-btn clear-btn',
            onclick: () => this._clearContent(),
            onmouseover: (e) => {
                if (window.GlowingTooltip) GlowingTooltip.show(e.currentTarget, 'Clear output', { color: [255, 100, 100] });
            },
            onmouseout: () => {
                if (window.GlowingTooltip) GlowingTooltip.hide();
            }
          },
          'Clear'
        );

        this.ui.splitToggleBtn = makeElement(
          'button',
          {
            className: 'output-btn split-btn',
            onclick: () => this._onSplitToggleClicked(),
            title: 'Split output',
            onmouseover: (e) => {
                if (window.GlowingTooltip) GlowingTooltip.show(e.currentTarget, 'Split output into smaller chunks', { color: [255, 180, 50] });
            },
            onmouseout: () => {
                if (window.GlowingTooltip) GlowingTooltip.hide();
            }
          },
          'Split'
        );

        this.ui.sizeUnitSelect = makeElement('select', { onchange: () => {} }, [
          makeElement('option', { value: 'chars', selected: true }, 'Chars'),
        ]);
        this.ui.maxSizeInput = makeElement('input', {
          type: 'number',
          value: this.maxSize,
        });
        this.ui.maxPartsInput = makeElement('input', {
          type: 'number',
          value: this.maxParts,
        });
        this.ui.boundarySelect = makeElement('select', {}, [
          makeElement('option', { value: 'paragraphs' }, '¶ Para'),
        ]);
        this.ui.resplitBtn = makeElement(
          'button',
          {
            className: 'output-btn resplit-btn',
            onclick: () => this._applySplitWithCurrentSettings(),
          },
          '↻'
        );

        this.ui.splitOptions = makeElement(
          'div',
          { className: 'split-options', style: { display: 'none' } },
          [
            this.ui.maxSizeInput,
            this.ui.maxPartsInput,
            this.ui.boundarySelect,
            this.ui.resplitBtn,
          ]
        );

        const headerBar = makeElement('div', { className: 'output-header-bar' }, [
          makeElement('div', { style: 'display:flex; align-items:center' }, [
            this.ui.copyButton,
            this.ui.magicSendBtn,
          ]),
          makeElement('div', { className: 'output-tools-group' }, [
            this.ui.splitOptions,
            this.ui.splitToggleBtn,
            this.ui.clearButton,
          ]),
        ]);

        this.ui.editorHost = makeElement('div', {
          className: 'output-editor-host resizable',
        });
        this.ui.partsHost = makeElement('div', {
          className: 'output-parts-host',
          style: { display: 'none' },
        });

        const container = makeElement(
          'div',
          { className: 'output-tab-container' },
          [
            makeElement(
              'style',
              `
                    .output-tab-container { display: flex; flex-direction: column; height: 100%; padding: 10px 15px; box-sizing: border-box; gap: 10px; overflow: hidden; }
                    .output-header-bar { flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; gap: 15px; min-height: 40px; }
                    .output-tools-group { display: flex; align-items: center; gap: 8px; }
                    .output-editor-host { flex-grow: 1; min-height: 0; border: 1px solid var(--border-color); border-radius: 4px; overflow: hidden; display: flex; flex-direction: column; }
                    .output-editor-host .cm-editor { height: 100%; }
                    .output-parts-host { flex-grow: 1; min-height: 0; overflow-y: auto; display: grid; grid-auto-rows: minmax(160px, auto); gap: 12px; padding-right: 5px; }
                    .output-btn { flex-shrink: 0; padding: 6px 14px; font-size: 0.9em; font-weight: 500; border-radius: 4px; border: 1px solid #555; cursor: pointer; transition: all 0.2s ease; color: white; background-color: #3c3c3c; }
                    .output-btn.clear-btn { color: #ffcccc; border-color: #702b2b; }
                    .output-btn.clear-btn:hover:not(:disabled) { background-color: #5c1e1e; border-color: #a03535; }
                    .output-btn.split-btn { background-color: #333; border-color: var(--accent-orange); color: var(--accent-orange); }
                    .split-options { display: flex; gap: 6px; }
                `
            ),
            headerBar,
            this.ui.editorHost,
            this.ui.partsHost,
          ]
        );

        this.codeMirrorWidget = new CodeMirrorWidget('output', '', 'markdown');
        this.codeMirrorWidget.setReadOnly(false);
        this.ui.editorHost.appendChild(this.codeMirrorWidget.getElement());

        this.updateCopyButtonState();

        return container;
    }

  getElement() {
    return this.element;
  }

  setContent(text) {
      console.log(
        '[OutputTab Debug] setContent() called. Text length:',
        text ? text.length : 0
      );
      this.originalText = text;
      this.hasCopied = false;
      this._renderSingle(text);
      if (this.ui.copyButton) {
        this.ui.copyButton.disabled = false;
      }
      this.updateCopyButtonState();
    }

  _copyContent(e, injectTips = false) {
      let text = this.codeMirrorWidget ? this.codeMirrorWidget.getText() : '';
      if (!text) return;

      if (injectTips && this.app.promptInjector) {
        text = this.app.promptInjector.inject(text);
        this.app.uiManager.setStatus('Hints appended to clipboard content.');
      }

      const flashBtn = (btn, label, color, ms = 1500) => {
        if (!btn) return;
        const orig = btn.textContent;
        const origColor = btn.style.color;
        btn.textContent = label;
        btn.style.color = color;
        setTimeout(() => {
          btn.textContent = orig;
          btn.style.color = origColor;
        }, ms);
      };

      const mainBtn = this.ui?.copyButtonComponent?.mainBtn;

      if (this.app.clipboardSink) {
        try {
          this.app.clipboardSink.receive(text);
          this.app.actionHandler._showButtonFeedback(mainBtn, 'Sent!');
        } catch (err) {
          console.error('Sink error:', err);
        }
      } else if (this.app.actionHandler?.handleTextExport) {
        this.app.actionHandler.handleTextExport(text, mainBtn);
      } else {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            this.app.uiManager?.setStatus('Copied to clipboard.');
            flashBtn(mainBtn, '✓ Copied!', '#6ff0a0');
          })
          .catch(() => {
            this.app.uiManager?.setStatus('Copy failed.', true);
            flashBtn(mainBtn, '✗ Failed', '#ff7777');
          });
      }
      this.hasCopied = true;
    }

  _clearContent() {
      this.originalText = '';
      if (this.codeMirrorWidget) this.codeMirrorWidget.setText('');
      this.partSegments = [];
      this.ui.partsHost.innerHTML = '';
      this._toggleSplitUI(false);
      this._renderSingle('');
    }

  _onSplitToggleClicked() {
    if (this.splitEnabled) {
      this._unsplit();
    } else {
      this._openSplitDialog();
    }
  }

  _unsplit() {
      this.partSegments = [];
      this.ui.partsHost.innerHTML = '';
      this._toggleSplitUI(false);
      if (this.codeMirrorWidget) {
        this.codeMirrorWidget.setText(this.originalText || '');
      }
      this.app.uiManager?.setStatus?.('Output restored to a single view.', false);
    }

  _openSplitDialog() {
    // Nice dialog to choose size, count, boundary preference BEFORE splitting
    const sizeInput = makeElement('input', {
      type: 'number',
      min: 1000,
      step: 500,
      value: this.maxSize,
      style: { width: '10ch' },
    });
    const countInput = makeElement('input', {
      type: 'number',
      min: 2,
      step: 1,
      value: this.maxParts,
      style: { width: '8ch' },
    });
    const boundarySel = makeElement('select', {}, [
      makeElement(
        'option',
        {
          value: 'paragraphs',
          selected: this.preferBoundaries === 'paragraphs',
        },
        'Prefer paragraphs'
      ),
      makeElement(
        'option',
        { value: 'sentences', selected: this.preferBoundaries === 'sentences' },
        'Prefer sentences'
      ),
      makeElement(
        'option',
        { value: 'lines', selected: this.preferBoundaries === 'lines' },
        'Prefer line breaks'
      ),
    ]);

    const content = makeElement(
      'div',
      { style: { display: 'grid', gap: '10px' } },
      [
        makeElement('label', {}, ['Max characters per part: ', sizeInput]),
        makeElement('label', {}, ['Max number of parts: ', countInput]),
        makeElement('label', {}, ['Boundary preference: ', boundarySel]),
        makeElement(
          'p',
          { style: { fontSize: '0.9em', color: 'var(--text-secondary)' } },
          'We’ll keep parts paste-friendly and add a short footer prompting for the next part.'
        ),
      ]
    );

    UITools.makeDialog({
      title: 'Split Output',
      content,
      buttons: [
        {
          label: 'Split',
          className: 'primary',
          onClick: () => {
            const size = Math.max(1000, parseInt(sizeInput.value || 0, 10));
            const parts = Math.max(2, parseInt(countInput.value || 0, 10));
            this.maxSize = Number.isFinite(size) ? size : this.maxSize;
            this.maxParts = Number.isFinite(parts) ? parts : this.maxParts;
            this.preferBoundaries = boundarySel.value || 'paragraphs';
            this._applySplitWithCurrentSettings();
          },
        },
        { label: 'Cancel' },
      ],
    });
  }

  _applySplitWithCurrentSettings() {
    if (!this.originalText) {
      this.app.uiManager?.setStatus?.('No output to split.', true);
      return;
    }

    // Strict per-part enforcement: do NOT inflate maxSize. Instead, increase maxParts if needed.
    const textLen = this.originalText.length;
    const requiredParts = Math.max(
      1,
      Math.ceil(textLen / Math.max(1, this.maxSize))
    );
    const MAX_AUTO_PARTS = 50;
    if (requiredParts > this.maxParts) {
      this.maxParts = Math.min(requiredParts, MAX_AUTO_PARTS);
      if (requiredParts > MAX_AUTO_PARTS) {
        this.app.uiManager?.setStatus?.(
          `Output is very large; using ${MAX_AUTO_PARTS} parts at ~${this.maxSize} chars each.`,
          false
        );
      }
      if (this.ui.maxPartsInput) this.ui.maxPartsInput.value = this.maxParts;
    }

    this.splitEnabled = true;
    this.ui.splitOptions.style.display = '';
    this.ui.splitToggleBtn.textContent = 'Unsplit';
    this.ui.splitToggleBtn.setAttribute('aria-pressed', 'true');
    const parts = this._smartSplitText(this.originalText, {
      maxSize: this.maxSize,
      maxParts: this.maxParts,
      minPartSize: Math.floor(this.maxSize * this.minPartSizeRatio),
      prefer: this.preferBoundaries, // 'paragraphs' | 'sentences' | 'lines'
    });
    this._renderParts(parts);
  }

  _toggleSplitUI(enable) {
    this.splitEnabled = !!enable;
    const isOn = this.splitEnabled;

    this.ui.splitToggleBtn.textContent = isOn ? 'Unsplit' : 'Split';
    this.ui.splitToggleBtn.setAttribute(
      'aria-pressed',
      isOn ? 'true' : 'false'
    );
    this.ui.splitToggleBtn.title = isOn
      ? 'Return to a single combined output'
      : 'Split the output into parts';
    this.ui.splitOptions.style.display = isOn ? '' : 'none';

    if (isOn) {
      this.ui.editorHost.style.display = 'none';
      this.ui.partsHost.style.display = '';
      this.ui.copyButton.style.display = 'none'; // per-part copy only in split mode
    } else {
      this.ui.editorHost.style.display = '';
      this.ui.partsHost.style.display = 'none';
      this.ui.copyButton.style.display = ''; // single copy in unsplit mode
    }
  }

  _renderSingle(text) {
      console.log('[OutputTab Debug] _renderSingle() called.');
      this._toggleSplitUI(false);

      const cmIsReady = typeof EditorView !== 'undefined';
      console.log(
        "[OutputTab Debug] cmIsReady (typeof EditorView !== 'undefined') =",
        cmIsReady
      );

      let isPlainFallback = false;
      if (this.codeMirrorWidget) {
        isPlainFallback = !!this.codeMirrorWidget._usingPlainFallback;
      }
      console.log(
        '[OutputTab Debug] Current this.codeMirrorWidget exists?',
        !!this.codeMirrorWidget,
        'isPlainFallback?',
        isPlainFallback
      );

      const needsRebuild = !this.codeMirrorWidget || (isPlainFallback && cmIsReady);
      console.log('[OutputTab Debug] needsRebuild evaluated to:', needsRebuild);

      if (needsRebuild) {
        console.log(
          '[OutputTab Debug] Creating NEW CodeMirrorWidget to replace fallback...'
        );
        if (this.codeMirrorWidget && this.codeMirrorWidget.getElement().parentElement) {
          console.log('[OutputTab Debug] Removing old widget from DOM.');
          this.codeMirrorWidget.getElement().remove();
        }

        this.codeMirrorWidget = new CodeMirrorWidget('output', text || '', 'markdown');
        this.codeMirrorWidget.setReadOnly(false);

        this.ui.editorHost.innerHTML = '';
        this.ui.editorHost.appendChild(this.codeMirrorWidget.getElement());
        console.log(
          '[OutputTab Debug] Appended new CodeMirrorWidget to ui.editorHost.'
        );
      } else {
        console.log(
          '[OutputTab Debug] Reusing existing widget. Calling setText().'
        );
        if (this.codeMirrorWidget) {
          this.codeMirrorWidget.setText(text || '');

          if (
            this.codeMirrorWidget.editor &&
            typeof this.codeMirrorWidget.editor.requestMeasure === 'function'
          ) {
            console.log(
              '[OutputTab Debug] Requesting CodeMirror requestMeasure().'
            );
            this.codeMirrorWidget.editor.requestMeasure();
          }
        }
      }
    }

  _renderParts(parts) {
    this._toggleSplitUI(true);
    this.partSegments = [];
    this.ui.partsHost.innerHTML = '';

    const total = parts.length;
    parts.forEach((content, idx) => {
      const partNum = idx + 1;
      const charCount = typeof content === 'string' ? content.length : 0;

      const copyBtn = makeElement(
        'button',
        {
          className: 'output-btn copy-btn part-copy-btn',
          onclick: (e) => this._copyPart(e, idx),
        },
        'Copy to Clipboard'
      );
      const header = makeElement('div', { className: 'part-card-header' }, [
        makeElement(
          'span',
          { className: 'part-title' },
          `Part ${partNum} of ${total}`
        ),
        copyBtn,
        makeElement('span', { className: 'part-meta' }, `${charCount} chars`),
      ]);

      const editorWrap = makeElement('div', {
        className: 'part-editor resizable',
      });
      const seg = new CodeMirrorWidget(
        `output-part-${partNum}`,
        content,
        'markdown'
      );
      seg.setReadOnly(false);
      editorWrap.appendChild(seg.getElement());
      this.partSegments.push(seg);

      const card = makeElement('div', { className: 'part-card' }, [
        header,
        editorWrap,
      ]);
      this.ui.partsHost.appendChild(card);
    });
  }

  _copyPart(e, index) {
    const seg = this.partSegments[index];
    const text = seg ? seg.getText() : '';
    if (!text) return;

    if (this.app.actionHandler && this.app.actionHandler.handleTextExport) {
      this.app.actionHandler.handleTextExport(text, e?.target);
    }
  }

  _getNiceFooter(partIndex, totalParts) {
    // Gentle wording, short, copy-safe
    return `\n\n— Partial ${partIndex}/${totalParts}. Split to keep it paste-friendly. Please acknowledge and ask for the next part. —`;
  }

  _smartSplitText(text, { maxSize, maxParts, minPartSize, prefer }) {
    if (!text) return [''];

    // 1) Parse into semantic units
    const units = this._parseUnits(text); // [{type:'header'|'code'|'prose', text}, ...]

    // 2) Pack units under the hard limit; oversized units are subdivided on demand
    let parts = this._packUnits(units, { maxSize, minPartSize, prefer });

    // 3) Respect soft maxParts without violating maxSize
    if (parts.length > maxParts) {
      // Attempt reflow by merging adjacent parts where it fits
      const reflow = [];
      let bucket = '';
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const limit = maxSize; // safe; we add footers later
        if (!bucket) {
          bucket = p;
        } else if (bucket.length + p.length <= limit) {
          bucket += p;
        } else {
          reflow.push(bucket);
          bucket = p;
        }
      }
      if (bucket) reflow.push(bucket);
      parts = reflow;
    }

    // 4) Append polite footers (fit under maxSize)
    const n = parts.length;
    if (n > 1) {
      for (let i = 0; i < n - 1; i++) {
        const footer = this._getNiceFooter(i + 1, n);
        if (parts[i].length + footer.length <= maxSize) {
          parts[i] += footer;
        } else {
          const trimBy = parts[i].length + footer.length - maxSize;
          parts[i] =
            parts[i].slice(0, Math.max(0, parts[i].length - trimBy - 1)) +
            '…' +
            footer;
        }
      }
    }

    // 5) FINAL ASSERT: guarantee every part <= maxSize
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].length > maxSize) {
        parts[i] = parts[i].slice(0, Math.max(0, maxSize - 1)) + '…';
      }
    }

    return parts;
  }

  _parseUnits(text) {
    // Non-recursive, single pass over pre-scanned fences.
    // We build:
    //   - lead: filename/section lines *before* the opening fence (no fence in lead)
    //   - code: body text (without opening fence), and we carry the exact opening fence line
    //            so splits can be re-wrapped as standalone fenced blocks.
    //   - prose: everything else between fences.
    const units = [];
    const fences = this._scanFences(text); // [{openIdx, openLineEnd, bodyStart, fenceEnd}]
    let pos = 0;

    const headerLineRe =
      /^(#{1,6}\s+\.?\/?[\w./-]+.*|\/\/\s*recursi\s+(file|full\s+file):.*|=+\s.*?=+\s*)$/;

    for (let k = 0; k < fences.length; k++) {
      const f = fences[k];

      // Determine leadStart by scanning backward from the opening fence
      let leadStart = f.openIdx;
      {
        let scan = f.openIdx;
        let safety = 0;
        const MAX_SCAN_LINES = 500;
        const MAX_LEAD_BACK = 100_000;
        while (
          scan > 0 &&
          safety < MAX_SCAN_LINES &&
          f.openIdx - scan < MAX_LEAD_BACK
        ) {
          const prevNL = text.lastIndexOf('\n', scan - 1);
          const lineStart = prevNL === -1 ? 0 : prevNL + 1;
          const line = text.slice(lineStart, scan);
          const trimmed = line.trim();
          const isBlank = trimmed === '';
          const isHeader = headerLineRe.test(trimmed);
          const isComment = trimmed.startsWith('//') || trimmed.startsWith('#');
          if (isBlank || isHeader || isComment) {
            if (lineStart === scan) break; // no progress safeguard
            leadStart = lineStart;
            scan = lineStart;
            safety++;
            continue;
          }
          break;
        }
      }

      // Emit prose before this (everything not part of this section)
      if (leadStart > pos) {
        units.push({ type: 'prose', text: text.slice(pos, leadStart) });
      }

      // LEAD: headers/comments/blank lines PRIOR to the opening fence (no fence included)
      const leadText = text.slice(leadStart, f.openIdx);
      if (leadText) {
        units.push({ type: 'lead', text: leadText });
      }

      // CODE: we carry the opening fence line separately for precise re-wrapping on splits
      const fenceOpenLineEnd =
        f.openLineEnd === -1 ? f.openIdx + 3 : f.openLineEnd + 1;
      const fenceOpen = text.slice(f.openIdx, fenceOpenLineEnd); // e.g. "```js\n"
      const bodyAndClose = text.slice(f.bodyStart, f.fenceEnd); // body + closing ```
      units.push({ type: 'code', body: bodyAndClose, fenceOpen });

      pos = f.fenceEnd;
    }

    // Tail prose after last fence
    if (pos < text.length) {
      units.push({ type: 'prose', text: text.slice(pos) });
    }

    // Merge consecutive prose for cleanliness
    const merged = [];
    for (const u of units) {
      const last = merged[merged.length - 1];
      if (last && last.type === 'prose' && u.type === 'prose')
        last.text += u.text;
      else merged.push(u);
    }
    return merged;
  }

  _packUnits(units, { maxSize, minPartSize, prefer }) {
    // Packing rules:
    //  - LEAD always starts a new part (so a part begins with filename/section lines).
    //  - CODE is appended as a fenced block (fenceOpen + body + closing ```).
    //    If it must split, each piece becomes its own fully-fenced block using the same opening fence line.
    //  - PROSE is appended/paginated as needed.
    const parts = [];
    let cur = '';

    const flush = () => {
      if (cur) {
        parts.push(cur);
        cur = '';
      }
    };

    const tryAppend = (chunk) => {
      if (!chunk) return;
      if (!cur) {
        cur = chunk;
        return;
      }
      if (cur.length + chunk.length <= maxSize) {
        cur += chunk;
      } else {
        flush();
        cur = chunk;
      }
    };

    for (let i = 0; i < units.length; i++) {
      const u = units[i];

      if (u.type === 'lead') {
        // Always begin a fresh part on a LEAD.
        flush();
        cur =
          u.text.length <= maxSize
            ? u.text
            : u.text.slice(0, Math.max(0, maxSize - 1)) + '…';
        continue;
      }

      if (u.type === 'code') {
        // Wrap body with fences; split if needed with function-aware strategy.
        const fencedBlocks = this._splitAndFenceCode(
          u.body,
          u.fenceOpen,
          maxSize,
          minPartSize,
          prefer
        );
        for (const block of fencedBlocks) {
          tryAppend(block);
        }
        continue;
      }

      if (u.type === 'prose') {
        if (u.text.length <= maxSize) {
          tryAppend(u.text);
        } else {
          const prosePieces = this._splitProseUnit(
            u.text,
            maxSize,
            minPartSize,
            prefer
          );
          for (const p of prosePieces) tryAppend(p);
        }
        continue;
      }
    }

    flush();
    return parts;
  }

  _splitCodeUnit(codeText, maxSize, minPartSize, prefer) {
    // 1) function/method/class boundaries inside block
    const fnBoundaries = this._computeFunctionBoundaries(codeText);
    let chunks = [codeText];
    if (fnBoundaries.length > 2) {
      // includes 0 and end
      chunks = this._sliceByBoundaries(codeText, fnBoundaries);
    }

    // 2) Ensure each chunk <= maxSize; if not, soft-split strictly
    const out = [];
    for (const c of chunks) {
      if (c.length <= maxSize) {
        out.push(c);
      } else {
        out.push(
          ...this._softSplitStrict(
            c,
            maxSize,
            Math.max(0, maxSize - 100),
            minPartSize,
            prefer
          )
        );
      }
    }
    return out;
  }

  _splitProseUnit(text, maxSize, minPartSize, prefer) {
    const pieces = [];

    // Try paragraph-level split first
    const paragraphs = text.split(/\n{2,}/);
    const pack = (arr) => {
      let buf = '';
      for (const para of arr) {
        const candidate = buf ? buf + '\n\n' + para : para;
        if (candidate.length <= maxSize) {
          buf = candidate;
        } else {
          if (buf) pieces.push(buf);
          if (para.length <= maxSize) {
            buf = para;
          } else {
            // paragraph itself is too big -> sentence/line soft splits
            const sentencePieces = this._softSplitStrict(
              para,
              maxSize,
              Math.max(0, maxSize - 100),
              minPartSize,
              prefer
            );
            for (const sp of sentencePieces) {
              if (sp.length <= maxSize) pieces.push(sp);
              else pieces.push(sp.slice(0, Math.max(0, maxSize - 1)) + '…');
            }
            buf = '';
          }
        }
      }
      if (buf) pieces.push(buf);
    };

    pack(paragraphs);
    return pieces.length ? pieces : [text];
  }

  _softSplitStrict(text, maxSize, hardLimitNonLast, minPartSize, prefer) {
    const out = [];
    let idx = 0;

    const pickCut = (from, to) => {
      const windowStart = Math.max(from, to - 800);
      const windowText = text.slice(windowStart, to);

      const candidates = [];
      const pushIf = (rel, add = 0) => {
        if (rel !== -1) candidates.push(windowStart + rel + add);
      };

      if (prefer === 'paragraphs') {
        pushIf(windowText.lastIndexOf('\n```'), 1);
        pushIf(windowText.lastIndexOf('\n\n'), 2);
        pushIf(windowText.lastIndexOf('\n#'), 1);
      }
      if (prefer === 'sentences' || prefer === 'paragraphs') {
        const marks = [
          '. ',
          '? ',
          '! ',
          '." ',
          '?" ',
          '!" ',
          '). ',
          '.” ',
          '?” ',
          '!” ',
        ];
        let best = -1,
          bestLen = 0;
        for (const m of marks) {
          const p = windowText.lastIndexOf(m);
          if (p > best) {
            best = p;
            bestLen = m.length;
          }
        }
        pushIf(best, bestLen);
      }
      if (prefer === 'lines' || prefer === 'paragraphs') {
        pushIf(windowText.lastIndexOf('\n'), 1);
      }
      pushIf(windowText.lastIndexOf(' '), 1);

      if (candidates.length) {
        candidates.sort((a, b) => b - a);
        for (const c of candidates) {
          if (c - from >= Math.min(minPartSize, maxSize * 0.4)) return c;
        }
        return candidates[0];
      }
      return to; // hard cut
    };

    while (idx < text.length) {
      const remaining = text.length - idx;
      if (remaining <= maxSize) {
        out.push(text.slice(idx));
        break;
      }
      const to = idx + maxSize; // max raw window
      const cut = pickCut(idx, to);
      const piece = text.slice(idx, cut);
      if (hardLimitNonLast && piece.length > hardLimitNonLast) {
        // ensure non-last pieces leave room for footer later by trimming minimally
        const trimmed = piece.slice(0, Math.max(0, hardLimitNonLast - 1)) + '…';
        out.push(trimmed);
        idx = cut; // move to chosen cut to avoid overlap
      } else {
        out.push(piece);
        idx = cut;
      }
    }
    return out;
  }

  _computeFileBoundaries(text) {
    const patterns = [
      /\n\/\/\s*recursi\s+file:/g,
      /\n\/\/\s*recursi\s+full\s+file:/g,
      /\n\/\*\s*file.*?\*\//gi,
      /\n```/g,
      /\n=+\s.*?=+\n/g, // === file ===
      /\n#+\s+[^\n]+\n/g, // markdown headings
    ];
    const hits = new Set();
    for (const re of patterns) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) {
        hits.add(m.index + 1); // +1 to land after the preceding newline
      }
    }

    // Also consider obvious "import ..." lines at BOL as file starts (JS-heavy outputs)
    const importRe = /^\s*import\s+.+?from\s+['"].+?['"];?/gm;
    let m;
    while ((m = importRe.exec(text)) !== null) {
      hits.add(m.index);
    }

    const list = Array.from(hits).sort((a, b) => a - b);
    if (!list.length || list[0] !== 0) list.unshift(0);
    if (list[list.length - 1] !== text.length) list.push(text.length);
    return list;
  }

  _computeFunctionBoundaries(text) {
    const boundaries = new Set([0]); // include start

    const regs = [
      /(^|\n)\s*function\s+[a-zA-Z_$][\w$]*\s*\(/g, // function foo(
      /(^|\n)\s*(async\s+)?[a-zA-Z_$][\w$]*\s*\([^)]*\)\s*\{/g, // methodLikeName(...) {
      /(^|\n)\s*class\s+[A-Z_$][\w$]*/g, // class Foo
      /(^|\n)\s*constructor\s*\(/g, // constructor(
      /(^|\n)\s*static\s+[a-zA-Z_$][\w$]*\s*\(/g, // static method(
    ];
    for (const re of regs) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) {
        const startOfLine = text.lastIndexOf('\n', m.index) + 1;
        boundaries.add(startOfLine);
      }
    }

    const sorted = Array.from(boundaries).sort((a, b) => a - b);
    if (sorted[sorted.length - 1] !== text.length) sorted.push(text.length);
    return sorted;
  }

  _sliceByBoundaries(text, boundaries) {
    const out = [];
    for (let i = 0; i < boundaries.length - 1; i++) {
      const s = boundaries[i];
      const e = boundaries[i + 1];
      if (e > s) out.push(text.slice(s, e));
    }
    return out;
  }

  _isFileHeaderChunk(text) {
    if (!text) return false;
    const head = text.slice(0, 200); // inspect a small prefix
    return (
      // Markdown-ish file headings produced by the builder/LLM
      /^#{1,6}\s+\.?\/?[\w./-]+/m.test(head) || // "### ./path/to/file.js"
      /^=+\s.+?=+\s*$/m.test(head) || // "=== file ==="
      // Recursi markers
      /^\/\/\s*recursi\s+(file|full\s+file):/im.test(head) ||
      // Code fence followed immediately by a filename heading (block header style)
      (/^```/.test(head) && /#\s+\.?\/?[\w./-]+/m.test(text)) ||
      // Common JS file prelude
      /^\s*import\s+.+?from\s+['"].+?['"];?/m.test(head)
    );
  }

  _scanFences(text) {
    // Deterministic scanner: always advances; never loops forever.
    const out = [];
    let searchFrom = 0;
    const MAX_FENCES = 5000;
    let guard = 0;

    while (searchFrom < text.length && guard < MAX_FENCES) {
      guard++;
      const openIdx = text.indexOf('```', searchFrom);
      if (openIdx === -1) break;

      const openLineEnd = text.indexOf('\n', openIdx);
      const bodyStart = openLineEnd === -1 ? openIdx + 3 : openLineEnd + 1;
      const closeIdx = text.indexOf('```', bodyStart);
      const fenceEnd = closeIdx === -1 ? text.length : closeIdx + 3;

      out.push({ openIdx, openLineEnd, bodyStart, fenceEnd });
      searchFrom = fenceEnd > searchFrom ? fenceEnd : searchFrom + 3;
    }

    return out;
  }

  _splitAndFenceCode(
    bodyPlusCloseTicks,
    fenceOpen,
    maxSize,
    minPartSize,
    prefer
  ) {
    // bodyPlusCloseTicks already includes the closing ``` from the original block.
    // We first strip the trailing closing fence to get the *pure* body,
    // then split the body by functions/soft rules, and finally wrap EACH piece:
    //   fenceOpen + piece + "\n```"
    let pureBody = bodyPlusCloseTicks;
    // Remove the last closing ``` safely (only the final one at the end of this block)
    const lastTicks = pureBody.lastIndexOf('```');
    if (lastTicks !== -1 && lastTicks >= pureBody.length - 4) {
      pureBody = pureBody.slice(0, lastTicks);
    }

    // Split body smartly
    const fnBoundaries = this._computeFunctionBoundaries(pureBody);
    let chunks = [pureBody];
    if (fnBoundaries.length > 2) {
      chunks = this._sliceByBoundaries(pureBody, fnBoundaries);
    }

    // Ensure each chunk fits; if not, soft-split strictly
    const bodies = [];
    for (const c of chunks) {
      if (c.length <= maxSize) bodies.push(c);
      else
        bodies.push(
          ...this._softSplitStrict(
            c,
            maxSize,
            Math.max(0, maxSize - 100),
            minPartSize,
            prefer
          )
        );
    }

    // Now fence each body piece. Account for fence overhead in size budgeting.
    const closing = '\n```';
    const fenceOverhead = fenceOpen.length + closing.length;
    const out = [];
    for (let piece of bodies) {
      // If piece + overhead still exceeds max, hard trim to fit as a last resort
      if (piece.length + fenceOverhead > maxSize) {
        const allowed = Math.max(0, maxSize - fenceOverhead - 1);
        piece = piece.slice(0, allowed) + '…';
      }
      out.push(fenceOpen + piece + closing);
    }
    return out;
  }

  updateCopyButtonState() {
      if (this.ui.copyButtonComponent) {
        const hasContent = !!(this.codeMirrorWidget && this.codeMirrorWidget.getText());
        this.ui.copyButtonComponent.setDisabled(!hasContent);
      }

      if (this.app.clipboardSink && this.app.clipboardSink.isConnected) {
        if (this.ui.magicSendBtn) {
          this.ui.magicSendBtn.style.display = 'inline-block';
          this.ui.magicSendBtn.textContent = '🚀 Send to Gemini';
        }
      } else {
        if (this.ui.magicSendBtn) {
          this.ui.magicSendBtn.style.display = 'none';
        }
      }
    }

  updateGuidance() {}

  hideGlows() {}

  

  

  static _doc() {
    return [
      this._doc_overview(),
      this._doc_smart_splitting(),
      this._doc_magic_send(),
    ].join('\n\n---\n\n');
  }

  static _doc_overview() {
    return `# OutputTab\n\nThe \`OutputTab\` provides the UI for reviewing the generated response from the LLM. It acts as the staging ground before code is parsed and applied to the workspace.`;
  }

  static _doc_smart_splitting() {
    return `## Smart Splitting\n\nWhen dealing with massive responses that exceed clipboard or UI limits, the tab employs a smart splitting algorithm. It parses the generated code and splits it safely at class or method boundaries, preventing syntax errors that would occur if code blocks were arbitrarily chopped in half.`;
  }

  static _doc_magic_send() {
    return `## Magic Send\n\nInstead of relying on the OS clipboard, \`OutputTab\` features a "Magic Send" integration. It routes the LLM's raw response directly into the \`LlmQueueManager\` (or an active \`ClipboardCatcherWidget\`), instantly triggering the unified write protocol and opening the visual diff review dialog.`;
  }
}