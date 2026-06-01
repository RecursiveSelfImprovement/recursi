class InteractivePasteDiagnosticDialog {
  constructor(app, initialText, initialError, onRetry) {
    this.app = app;
    this.text = initialText || '';
    this.initialError = initialError;
    this.onRetry = onRetry;

    this.dialog = null;
    this.codeMirrorWidget = null;
    this.statusBanner = null;
    this.retryBtn = null;
    this.debounceTimer = null;

    this.initUI();
  }

  initUI() {
    this.statusBanner = makeElement(
      'div',
      {
        className: 'diagnostic-banner',
        style: {
          padding: '12px 16px',
          fontWeight: '600',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'rgba(239, 83, 80, 0.1)',
          color: '#ffcdd2',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transition: 'background-color 0.3s, color 0.3s',
        },
      },
      'Checking syntax...'
    );

    const editorHost = makeElement('div', {
      style: {
        height: '450px',
        borderBottom: '1px solid var(--border-color)',
        overflow: 'hidden',
      },
    });

    this.retryBtn = makeElement('button', {
      className: 'primary',
      textContent: 'Fix Errors to Retry',
      disabled: true,
      style: {
        padding: '8px 16px',
        fontWeight: 'bold',
        transition: 'all 0.2s',
      },
      onclick: () => this.handleRetry(),
    });

    const content = makeElement(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: 'var(--bg-primary)',
        },
      },
      [this.statusBanner, editorHost]
    );

    this.dialog = UITools.makeDialog({
      title: '⚠️ Paste Diagnostic',
      contentElement: content,
      width: '800px',
      noPadding: true,
      buttons: [
        this.retryBtn,
        { label: 'Cancel', onClick: (e, d) => d.close() },
      ],
    });

    setTimeout(() => {
      this.codeMirrorWidget = new CodeMirrorWidget(
        'diagnostic_editor',
        this.text,
        'javascript',
        () => this.handleCodeChange()
      );
      editorHost.appendChild(this.codeMirrorWidget.getElement());

      if (this.initialError) {
        this.setInvalid(this.initialError, true);
        this._hasValidatedOnce = true;
      } else {
        this.validate();
      }
    }, 50);
  }

  handleCodeChange() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.validate(), 300);
  }

  validate() {
      if (!this.codeMirrorWidget) return;
      const text = this.codeMirrorWidget.getValue();
      const acorn = window.acorn;

      if (!acorn) {
        this.setInvalid(
          { message: 'AST Parser (acorn) is not available.' },
          !this._hasValidatedOnce
        );
        this._hasValidatedOnce = true;
        return;
      }

      try {
        const trimmed = text.trim();

        const fileReplaceMatch = /^\/\/\s*(\/?[\w.\/ -]+\.[a-zA-Z0-9]+)/.exec(
          trimmed
        );
        if (fileReplaceMatch) {
          const lines = trimmed.split('\n');
          const isJs = fileReplaceMatch[1].endsWith('.js');

          if (isJs) {
            const codePart = lines.slice(1).join('\n');
            acorn.parse(codePart, {
              ecmaVersion: 'latest',
              sourceType: 'module',
              locations: true,
            });
          }

          this.setValid('Valid Whole-File Paste format. Ready to process.');
          return;
        }

        try {
          acorn.parse(text, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            locations: true,
          });
        } catch (parseErr) {
          if (parseErr.message.includes('super')) {
            const fixedText = text.replace(
              /(class\s+[\w$]+)\s*\{/g,
              '$1 extends Object {'
            );
            acorn.parse(fixedText, {
              ecmaVersion: 'latest',
              sourceType: 'module',
              locations: true,
            });
          } else {
            throw parseErr;
          }
        }

        if (!/\bfunction\s+run\s*\(/.test(text)) {
          throw {
            message:
              "Missing 'async function run(env)' entry point. Please wrap your script in a run(env) function.",
            loc: { line: 1, column: 0 },
          };
        }

        this.setValid('Syntax looks good! Ready to process.');
      } catch (err) {
        this.setInvalid(err, !this._hasValidatedOnce);
      }
      this._hasValidatedOnce = true;
    }

  setValid(message) {
    this.statusBanner.style.backgroundColor = 'rgba(102, 187, 106, 0.1)';
    this.statusBanner.style.color = '#81c784';
    this.statusBanner.innerHTML = `<span>✅</span> ${message}`;

    this.retryBtn.disabled = false;
    this.retryBtn.textContent = 'Retry';
    this.retryBtn.style.opacity = '1';
    this.retryBtn.style.cursor = 'pointer';
  }

  setInvalid(err, shouldScroll = false) {
    let locStr = '';
    if (err.loc) {
      locStr = ` (Line ${err.loc.line}, Col ${err.loc.column})`;
    } else if (err.lineNumber) {
      locStr = ` (Line ${err.lineNumber})`;
    }

    this.statusBanner.style.backgroundColor = 'rgba(239, 83, 80, 0.15)';
    this.statusBanner.style.color = '#ef9a9a';
    this.statusBanner.innerHTML = `<span>❌</span> <strong>Error:</strong> ${err.message}${locStr}`;

    this.retryBtn.disabled = true;
    this.retryBtn.textContent = 'Fix Errors to Retry';
    this.retryBtn.style.opacity = '0.5';
    this.retryBtn.style.cursor = 'not-allowed';

    if (shouldScroll) {
      this._scrollToError(err);
    }
  }

  _scrollToError(err) {
    if (!err.loc || !this.codeMirrorWidget || !this.codeMirrorWidget.editor)
      return;
    if (typeof window.EditorView === 'undefined') return;

    try {
      const text = this.codeMirrorWidget.getValue();
      const lines = text.split('\n');

      let pos = 0;
      const targetLine = Math.min(err.loc.line, lines.length);

      for (let i = 0; i < targetLine - 1; i++) {
        pos += lines[i].length + 1;
      }
      pos += err.loc.column || 0;

      pos = Math.min(pos, text.length);

      this.codeMirrorWidget.editor.dispatch({
        selection: { anchor: pos, head: pos },
        effects: window.EditorView.scrollIntoView(pos, { y: 'center' }),
      });

      this.codeMirrorWidget.editor.focus();
    } catch (e) {
      console.warn('Could not scroll to error location:', e);
    }
  }

  handleRetry() {
    if (this.onRetry) {
      this.onRetry(this.codeMirrorWidget.getValue());
    }
    this.dialog.close();
  }
}