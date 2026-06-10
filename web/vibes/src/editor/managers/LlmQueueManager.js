// phase2-managed-migration: internal imports/exports stripped
class LlmQueueManager {
  async processQueue() {
    if (this.queue.length === 0) return;
    if (this.isProcessing) return;

    const batch = [...this.queue];
    this.queue = [];

    const isSuperMode = this._lastOptions && this._lastOptions.superMode;

    if (isSuperMode) {
      this.app.uiManager.setStatus('🚀 Super Mode: Auto-Processing...');
    } else {
      this.app.uiManager.setStatus(`Reviewing ${batch.length} updates...`);
    }

    this.activeDialogInstance = new PasteReviewDialog(
      batch,
      this.app,
      async (approvedPlans) => {
        this.isProcessing = true;
        const failures = await this.app.actionHandler.applyPastePlans(
          approvedPlans
        );

        if (!failures || failures.length === 0) {
          this.activeDialogInstance = null;
          this.isProcessing = false;

          if (this.app.guidanceManager) {
            this.app.guidanceManager.updateState('lastPasteTime', Date.now());
          }

          if (isSuperMode) {
            this._executeSuperModePostActions(approvedPlans);
          } else {
            if (this.queue.length > 0) this.processQueue();
            else this.app.uiManager.setStatus('Updates applied successfully.');
          }
        } else {
          this.isProcessing = false;
        }
        return failures;
      }
    );

    const originalClose = this.activeDialogInstance.dialog.options.onClose;
    this.activeDialogInstance.dialog.options.onClose = () => {
      this.isProcessing = false;
      this.activeDialogInstance = null;
      if (originalClose) originalClose();
      if (this.queue.length > 0) setTimeout(() => this.processQueue(), 50);
    };

    if (isSuperMode) {
      setTimeout(() => {
        const dialogEl = this.activeDialogInstance.dialog.element;
        if (dialogEl) {
          const mergeBtn = dialogEl.querySelector('button.primary');
          if (mergeBtn) {
            this._highlightElementAction(mergeBtn, 'AUTO-MERGE', '#00ff00');
            setTimeout(() => mergeBtn.click(), 1000);
          }
        }
      }, 3000);
    }
  }

  async _executeSuperModePostActions(plans) {
    // 1. Highlight Save Button
    await new Promise((r) => setTimeout(r, 1500));
    const saveBtn =
      this.app.uiManager.ui.saveButton || this.app.uiManager.ui.syncBtn;
    if (saveBtn) {
      this._highlightElementAction(saveBtn, 'AUTO-SAVE', '#ff00ff');
      await new Promise((r) => setTimeout(r, 800)); // Wait for visual to register
      await this.app.actionHandler.handleSaveAllFiles();
    }

    // 2. Close Tabs
    await new Promise((r) => setTimeout(r, 1000));
    this.app.uiManager.setStatus('Super Mode: Cleaning up...');

    const filesToClose = plans
      .map((p) => {
        try {
          return this.app.createPath(p.file).toString();
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);

    for (const path of filesToClose) {
      // Find the TAB element for this path to highlight it before closing
      const controller = this.app.editorControllers.get(path);
      if (controller && controller.tabId) {
        const tabBtn = this.app.tabManager.tabs.get(
          controller.tabId
        )?.buttonElement;
        if (tabBtn) {
          this._highlightElementAction(tabBtn, 'CLOSING...', '#ff4444');
          await new Promise((r) => setTimeout(r, 400)); // Quick flash per tab
        }
        this.app.tabOrchestrator.removeTab(controller.tabId);
      }
    }

    this.app.uiManager.setStatus('Super Mode Complete. 🚀', false, 3000);
  }

  _highlightElementAction(element, label, color = '#00ff00') {
    if (!element) return;

    // 1. Scroll into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // 2. Create Ghost Highlight Overlay
    const rect = element.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.style.position = 'fixed';
    ghost.style.left = rect.left + 'px';
    ghost.style.top = rect.top + 'px';
    ghost.style.width = rect.width + 'px';
    ghost.style.height = rect.height + 'px';
    ghost.style.border = `3px solid ${color}`;
    ghost.style.borderRadius = '4px';
    ghost.style.boxShadow = `0 0 15px ${color}, inset 0 0 10px ${color}`;
    ghost.style.zIndex = '10000';
    ghost.style.pointerEvents = 'none';
    ghost.style.transition = 'all 0.5s ease-out';
    ghost.style.opacity = '0';
    ghost.style.transform = 'scale(1.2)';

    // Label
    const tag = document.createElement('div');
    tag.textContent = label;
    tag.style.position = 'absolute';
    tag.style.bottom = '100%';
    tag.style.left = '50%';
    tag.style.transform = 'translateX(-50%)';
    tag.style.background = color;
    tag.style.color = '#000';
    tag.style.fontWeight = 'bold';
    tag.style.fontSize = '12px';
    tag.style.padding = '2px 6px';
    tag.style.borderRadius = '3px';
    tag.style.whiteSpace = 'nowrap';
    ghost.appendChild(tag);

    document.body.appendChild(ghost);

    // Animate In
    requestAnimationFrame(() => {
      ghost.style.opacity = '1';
      ghost.style.transform = 'scale(1)';
    });

    // Cleanup
    setTimeout(() => {
      ghost.style.opacity = '0';
      ghost.style.transform = 'scale(1.5)';
      setTimeout(() => ghost.remove(), 500);
    }, 1000);
  }

  constructor(app) {
    this.app = app;
  }

  async receive(input, source = 'clipboard', options = {}) {
      const text = typeof input === 'string' ? input : input?.text || '';
      if (!text.trim()) return false;

      if (source !== 'clipboard' && source !== 'retry') {
        this.app.uiManager.triggerRemotePasteEffect();
      }

      const ExecutorClass =
        window.UnifiedProtocolExecutor || globalThis.UnifiedProtocolExecutor;
      const executor = new ExecutorClass(this.app);

      // 1. Check for Whole-File Replace
      const fileReplaceMatch = ExecutorClass.detectFileReplace(text);
      if (fileReplaceMatch) {
        let fileStore = this.app.inMemoryFileStore;
        if (
          !fileStore &&
          typeof executor._buildTemporaryFileStore === 'function'
        ) {
          fileStore = await executor._buildTemporaryFileStore();
        }
        const result = await executor.executeFileReplace(
          fileReplaceMatch,
          fileStore || new Map()
        );
        if (result && result.ok === false) {
          this.showErrorDialog(text, result.error);
          return false;
        }
        return true;
      }

      // 2. Check for run(env) Script
      if (ExecutorClass.detect(text)) {
        const result = await executor.execute(text, options);
        if (result && result.ok === false) {
          const err =
            result.syntaxError ||
            result.executionError ||
            result.error ||
            new Error('Execution failed.');
          this.showErrorDialog(text, err);
          return false;
        }
        if (result === false) {
          this.showErrorDialog(
            text,
            new Error('Execution failed or no valid code block found.')
          );
          return false;
        }
        return true;
      }

      // 3. Fallback / Error
      this.app.uiManager.setStatus(
        'No valid Unified Protocol action found.',
        true
      );
      this.showErrorDialog(
        text,
        new Error(
          'No valid Unified Protocol action detected. If pasting JavaScript code, please wrap your logic inside an "async function run(env) { ... }" execution context, or use a whole-file replacement comment at the top.'
        )
      );
      return false;
    }

  showErrorDialog(text, initialError = null) {
    if (typeof InteractivePasteDiagnosticDialog !== 'undefined') {
      new InteractivePasteDiagnosticDialog(
        this.app,
        text,
        initialError,
        (newText) => {
          this.receive(newText, 'retry');
        }
      );
    } else {
      const textarea = makeElement('textarea', {
        style: {
          width: '100%',
          height: '300px',
          fontFamily: 'monospace',
          background: '#1e1e1e',
          color: '#d4d4d4',
          border: '1px solid #444',
          padding: '10px',
          boxSizing: 'border-box',
        },
      });
      textarea.value = text;

      UITools.makeDialog({
        title: 'Unrecognized Output Syntax',
        content: makeElement('div', {}, [
          makeElement(
            'p',
            { style: { color: '#f44336', marginBottom: '10px' } },
            'The LLM output did not match the Unified Protocol format or had a syntax error. Please fix the syntax and retry:'
          ),
          textarea,
        ]),
        width: '80vw',
        buttons: [
          {
            label: 'Retry',
            className: 'primary',
            onClick: (e, d) => {
              d.close();
              this.receive(textarea.value, 'retry');
            },
          },
          { label: 'Cancel' },
        ],
      });
    }
  }

  static _doc_LlmQueueManager() {
      return `# LlmQueueManager

## Summary

LlmQueueManager is the traffic controller for incoming AI code. Whether text is manually pasted into the browser or received via a drag-and-drop file payload, it flows through this queue. Its job is to prevent the application from being overwhelmed by rapid-fire inputs, batching the LLM's raw text into a single, cohesive payload ready for user review.

The design philosophy is buffered safety. LLM interactions can be chaotic; the user might accidentally paste twice. By debouncing incoming text and routing it through the \`AppProtocolHandler\`'s parser, the manager ensures that the user is presented with one clean \`PasteReviewDialog\` containing all pending changes, rather than a jarring sequence of overlapping popups.

## Core Logic & Philosophy

**Debounced batching.** When \`receive()\` is called, the manager parses the string into update plans and pushes them into an internal \`queue\` array. It then resets a 200ms \`debounceTimer\`. If more code arrives within that window, it is added to the batch. Only when the timer expires does \`processQueue()\` invoke the UI. This allows multiple fragmented LLM outputs to be reviewed as a single logical commit.

**Error interception.** If the parser finds absolutely zero valid protocol blocks in the pasted text, the manager intercepts the flow. Instead of silently failing or opening a blank review dialog, it triggers \`showProtocolErrorDialog\`. This spawns a dedicated CodeMirror modal where the user can manually fix the LLM's broken syntax before pushing it back into the queue.

**Super Mode auto-apply.** If the LLM payload arrives with a \`superMode\` flag, the manager bypasses human review. It spawns the review dialog so the user can visually see what's happening, but uses \`setTimeout\` to automatically click the "Apply" and "Save" buttons on their behalf, enabling a completely hands-free "vibe coding" loop.

## Public API

### Input Handling
- \`receive(input, source, options)\` - The primary entry point. Accepts raw text, parses it, buffers the resulting plans, and starts the debounce timer.

### Execution
- \`async processQueue()\` - Halts the buffering, extracts the batched plans, and spawns the \`PasteReviewDialog\`. Upon user approval, it delegates the actual file modifications to \`AppActionHandler.applyPastePlans\`.`;
    }

  static _doc_overview() {
      return `# LlmQueueManager

The \`LlmQueueManager\` is the traffic controller for incoming AI code modifications.
It acts as a buffer, debouncing and batching incoming text streams to prevent overlapping, chaotic popups, and presenting a unified review dialog to the developer.`;
    }

  static _doc_features() {
      return `## Debouncing, Diagnostics, and Super Mode

- **Debounced Batching**: Debounces incoming payloads. Once the timer expires, it aggregates all staged updates and launches \`PasteReviewDialog\` to let the user inspect the merge plan.
- **Super Mode (Auto-Apply)**: If a payload is flagged as \`superMode\`, the manager bypasses manual review. It displays the changes, highlights the 'Merge' button, auto-saves, closes the files, and triggers a clean runner preview with no manual intervention.
- **Diagnostic Recovery**: If the payload lacks a valid format, it diverts to \`InteractivePasteDiagnosticDialog\` so the user can fix the code block and retry the update instantly.`;
    }

  static _doc() {
      return [
        this._doc_LlmQueueManager(),
        this._doc_overview(),
        this._doc_features()
      ].join('\n\n');
    }

  
}