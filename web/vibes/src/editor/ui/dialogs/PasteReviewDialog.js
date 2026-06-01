
class PasteReviewDialog {
  
  constructor(plans, app, onApply) {
      this.plans = Array.isArray(plans) ? plans : [plans];
      this.app = app;
      this.onApply = onApply;
      this.editorMap = new Map();

      // Track active selection
      this.selectedPlanIndex = 0;
      this.selectedItemKey = null; // e.g. 'method::0' or 'import' or 'full'

      if (typeof CodeParser !== 'undefined') {
        this.codeParser = new CodeParser(window.acorn);
      }

      this.render();
      this._loadOriginalContexts();
    }

  render() {
      const handleProcessClick = () => this._handleProcess();

      // Inject unified styles to match the timeline dialog look
      if (!document.getElementById('paste-review-overhaul-styles')) {
        const styles = document.createElement('style');
        styles.id = 'paste-review-overhaul-styles';
        styles.textContent = `
          .review-layout-container { display: flex; gap: 16px; width: 100%; height: 480px; box-sizing: border-box; }
          .review-left-panel { flex: 1.1; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; padding-right: 4px; border-right: 1px solid rgba(255,255,255,0.08); }
          .review-right-panel { flex: 1.2; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; padding-left: 4px; }
          
          .review-card { padding: 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.03); display: flex; flex-direction: column; gap: 8px; }
          .review-card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
          .review-card-badge { width: 24px; height: 24px; border-radius: 4px; color: white; font-weight: bold; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
          
          .review-card-details { display: flex; flex-direction: column; gap: 4px; margin-top: 4px; }
          .review-card-item { display: flex; justify-content: space-between; align-items: center; padding: 4px 6px; font-size: 11px; border-radius: 4px; cursor: pointer; transition: background 0.12s; }
          .review-card-item:hover { background: rgba(255,255,255,0.06); }
          .review-card-item.active { background: rgba(59, 130, 246, 0.25); color: #fff; }
          
          .review-stats-pill { font-size: 9px; font-weight: bold; padding: 1px 4px; border-radius: 3px; margin-left: 6px; display: inline-block; }
          .review-stats-pill.add { background: rgba(16, 185, 129, 0.15); color: #34d399; }
          .review-stats-pill.rem { background: rgba(239, 68, 68, 0.15); color: #f87171; }
          
          .review-item-remove-btn { background: none; border: none; color: #ef5350; cursor: pointer; padding: 0 4px; font-size: 11px; opacity: 0.6; transition: opacity 0.15s; }
          .review-item-remove-btn:hover { opacity: 1; }
        `;
        document.head.appendChild(styles);
      }

      this.processBtn = makeElement('button', {
        className: 'process-btn',
        textContent: 'Process Changes',
        style: {
          padding: '8px 20px',
          fontSize: '1em',
          fontWeight: '600',
          backgroundColor: '#005f9e',
          color: '#ffffff',
          border: '1px solid #007acc',
          borderRadius: '4px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        },
        onmouseenter: (e) => {
          if (!e.target.disabled) {
            e.target.style.backgroundColor = '#007acc';
            e.target.style.borderColor = '#3399ff';
          }
        },
        onmouseleave: (e) => {
          if (!e.target.disabled) {
            e.target.style.backgroundColor = '#005f9e';
            e.target.style.borderColor = '#007acc';
          }
        },
        onclick: handleProcessClick,
      });

      const topBar = makeElement(
        'div',
        {
          style: {
            padding: '10px 15px',
            borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))',
            backgroundColor: 'var(--bg-tertiary, #161920)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            marginBottom: '8px'
          },
        },
        [
          makeElement('span', {
            textContent: `${this.plans.length} file(s) pending review`,
            style: { color: 'var(--text-secondary, #94a3b8)', fontWeight: '500' },
          }),
          this.processBtn,
        ]
      );

      this.leftPanel = makeElement('div', { className: 'review-left-panel' });
      this.rightPanel = makeElement('div', { className: 'review-right-panel' });

      const mainLayout = makeElement('div', { className: 'review-layout-container' }, [
        this.leftPanel,
        this.rightPanel
      ]);

      const layoutWrapper = makeElement(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            height: 'auto',
            maxHeight: '90vh',
            overflow: 'hidden',
            padding: '0 15px 15px 15px'
          },
        },
        [topBar, mainLayout]
      );

      const leftCoord = Math.max(10, Math.round(window.innerWidth * 0.05));
      const topCoord = Math.max(10, Math.round(window.innerHeight * 0.05));

      this.dialog = UITools.makeDialog({
        title: `🔍 Interactive Paste Review`,
        content: layoutWrapper,
        width: '850px',
        height: 'auto',
        position: [leftCoord, topCoord],
        buttons: []
      });
    }

  _validateAllPaths() {
      if (!this.processBtn) return;
      let hasErrors = false;
      this.plans.forEach((plan) => {
        if (plan.error) hasErrors = true;
      });

      if (hasErrors) {
        this.processBtn.disabled = true;
        this.processBtn.style.opacity = '0.5';
        this.processBtn.style.cursor = 'not-allowed';
        this.processBtn.textContent = 'Fix Errors to Process';
      } else {
        this.processBtn.disabled = false;
        this.processBtn.style.opacity = '1';
        this.processBtn.style.cursor = 'pointer';
        this.processBtn.textContent = 'Process Changes';
      }
    }

  renderStack() {
      this.leftPanel.innerHTML = '';
      
      if (this.plans.length === 0) {
        this.leftPanel.textContent = 'No changes to review.';
        this._renderRightSidecar();
        return;
      }

      this.plans.forEach((plan, planIndex) => {
        const card = this._createFileCard(plan, planIndex);
        this.leftPanel.appendChild(card);
      });

      this._validateAllPaths();
      this._renderRightSidecar();
    }

  _createFileCard(plan, planIndex) {
      const card = makeElement('div', { className: 'review-card' });

      const header = makeElement('div', { className: 'review-card-header' });

      let statusColor = '#3b82f6';
      let statusChar = 'M';
      if (plan.error) {
        statusColor = '#ef5350';
        statusChar = '!';
      } else if (plan.action === 'create' || plan.action === 'createFile') {
        statusColor = '#10b981';
        statusChar = '+';
      }

      const badge = makeElement('div', {
        className: 'review-card-badge',
        textContent: statusChar,
        style: { backgroundColor: statusColor }
      });

      const pathInput = makeElement('input', {
        value: plan.file || '',
        placeholder: 'Target File Path',
        style: {
          flex: 1,
          padding: '4px 8px',
          borderRadius: '4px',
          border: `1px solid ${plan.error ? '#ef5350' : 'var(--border-color, rgba(255,255,255,0.08))'}`,
          background: plan.error ? 'rgba(239, 83, 80, 0.1)' : 'var(--bg-primary, #0f1115)',
          color: 'var(--text-primary, #cbd5e1)',
          fontSize: '11px',
          minWidth: '100px',
        },
      });

      pathInput.addEventListener('input', (e) => {
        plan.file = e.target.value.trim();
        const resolved = this.app.protocolHandler._resolveTargetFile(plan.file);

        if (!resolved && plan.action === 'update') {
          plan.error = `File not found in project: ${plan.file}`;
          pathInput.style.borderColor = '#ef5350';
          pathInput.style.backgroundColor = 'rgba(239, 83, 80, 0.1)';
        } else {
          plan.error = plan.parseError ? `Syntax Error: ${plan.parseError}` : null;
          if (resolved) plan.file = resolved;
          pathInput.style.borderColor = 'var(--border-color, rgba(255,255,255,0.08))';
          pathInput.style.backgroundColor = 'var(--bg-primary, #0f1115)';
        }
        this._validateAllPaths();
      });

      header.append(badge, pathInput);
      card.appendChild(header);

      this._renderStrictWarningsBanner(plan, card);

      const detailsContainer = makeElement('div', { className: 'review-card-details' });

      // Whole File replacement/overwrite item
      if (plan.action === 'create' || plan.action === 'replaceFile') {
        const key = `full::${planIndex}`;
        const isSel = this.selectedPlanIndex === planIndex && this.selectedItemKey === key;
        
        // Reusing shared DiffHelper component row
        const item = DiffHelper.renderRow({
          labelText: '[Whole File Overwrite]',
          removed: 0,
          added: plan.content?.split('\n').length || 0,
          isActive: isSel,
          onClick: () => {
            this.selectedPlanIndex = planIndex;
            this.selectedItemKey = key;
            this.renderStack();
          }
        });
        
        detailsContainer.appendChild(item);
      }

      // Imports item
      const impAdd = plan.importAdditions?.length || 0;
      const impDel = plan.importDeletions?.length || 0;
      if (impAdd > 0 || impDel > 0) {
        const key = `imports::${planIndex}`;
        const isSel = this.selectedPlanIndex === planIndex && this.selectedItemKey === key;

        // Reusing shared DiffHelper component row
        const item = DiffHelper.renderRow({
          labelText: '[Module Imports]',
          removed: impDel,
          added: impAdd,
          isActive: isSel,
          onClick: () => {
            this.selectedPlanIndex = planIndex;
            this.selectedItemKey = key;
            this.renderStack();
          }
        });

        detailsContainer.appendChild(item);
      }

      // Individual Method items
      const methods = [...(plan.replacements || []), ...(plan.additions || [])];
      methods.forEach((method, idx) => {
        const isRepl = plan.replacements?.includes(method);
        const actionLabel = isRepl ? 'UPDATE' : 'ADD';
        const key = `${isRepl ? 'replacement' : 'addition'}::${idx}::${planIndex}`;
        const isSel = this.selectedPlanIndex === planIndex && this.selectedItemKey === key;

        const stats = method._diffStats || { added: method.code.split('\n').length, removed: 0 };

        // Reusing shared DiffHelper component row with full discard options
        const item = DiffHelper.renderRow({
          labelText: `.${method.name.split('.').pop()} [${actionLabel}]`,
          removed: stats.removed,
          added: stats.added,
          isActive: isSel,
          onClick: () => {
            this.selectedPlanIndex = planIndex;
            this.selectedItemKey = key;
            this.renderStack();
          },
          onRemove: () => {
            if (plan.replacements) plan.replacements = plan.replacements.filter((m) => m !== method);
            if (plan.additions) plan.additions = plan.additions.filter((m) => m !== method);
            
            if (this.selectedItemKey === key) {
              this.selectedItemKey = 'full';
            }
            this.renderStack();
          }
        });

        detailsContainer.appendChild(item);
      });

      card.appendChild(detailsContainer);
      return card;
    }

  _renderRawBody(plan, container, editorRefs) {
      const rawContainer = makeElement('div', {
        style: {
          height: '400px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          resize: 'vertical',
          overflow: 'hidden',
          flexShrink: 0,
        },
      });

      setTimeout(() => {
        const content =
          plan.action === 'create' || plan.action === 'replaceFile'
            ? plan.content || ''
            : plan.rawBody || '';
        const editor = new CodeMirrorWidget(
          `raw_${Date.now()}`,
          content,
          this._getMode(plan.file)
        );
        rawContainer.appendChild(editor.getElement());
        editorRefs.rawEditor = editor;
      }, 0);

      container.appendChild(rawContainer);
    }

  _createSection(title, type = '', infoHtml = '') {
    const wrapper = makeElement('div', {
      style: { display: 'flex', flexDirection: 'column', gap: '8px' },
    });
    const header = makeElement('div', {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '4px',
      },
    });
    header.appendChild(
      makeElement('span', {
        textContent: title,
        style: {
          fontWeight: 'bold',
          color: 'var(--accent-color)',
          marginRight: '8px',
        },
      })
    );
    if (type)
      header.appendChild(
        makeElement('span', {
          textContent: type,
          style: { fontSize: '0.85em', color: '#888' },
        })
      );
    if (infoHtml)
      header.appendChild(
        makeElement('span', {
          innerHTML: infoHtml,
          style: { marginLeft: '10px', fontSize: '0.85em' },
        })
      );
    wrapper.appendChild(header);
    return wrapper;
  }

  _syncAllEditors() {
    this.editorMap.forEach((refs, plan) => {
      if (plan._viewMode === 'raw') {
        if (refs.rawEditor) {
          const val = refs.rawEditor.getText();
          if (plan.action === 'create' || plan.action === 'replaceFile')
            plan.content = val;
          else plan.rawBody = val;
        }
      } else {
        if (refs.contentEditor) plan.content = refs.contentEditor.getText();
        refs.segments.forEach((item) => {
          item.data.code = item.segment.getText();
        });
      }
    });
  }

  _getMode(filename) {
    if (!filename) return 'javascript';
    if (filename.endsWith('.css')) return 'css';
    if (filename.endsWith('.html')) return 'htmlmixed';
    if (filename.endsWith('.json')) return 'json';
    if (filename.endsWith('.md')) return 'markdown';
    return 'javascript';
  }

  _calculateLineDiff(oldStr, newStr) {
    if (!oldStr)
      return { added: newStr ? newStr.split('\n').length : 0, removed: 0 };
    if (!newStr)
      return { added: 0, removed: oldStr ? oldStr.split('\n').length : 0 };

    const oldLines = oldStr
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const newLines = newStr
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (oldLines.length > 1000 || newLines.length > 1000) {
      return {
        added: Math.max(0, newLines.length - oldLines.length),
        removed: Math.max(0, oldLines.length - newLines.length),
      };
    }

    const dp = Array.from({ length: oldLines.length + 1 }, () =>
      new Array(newLines.length + 1).fill(0)
    );
    for (let i = 1; i <= oldLines.length; i++) {
      for (let j = 1; j <= newLines.length; j++) {
        if (oldLines[i - 1] === newLines[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const lcs = dp[oldLines.length][newLines.length];
    return {
      added: newLines.length - lcs,
      removed: oldLines.length - lcs,
    };
  }

  async _loadOriginalContexts() {
      for (const [planIndex, plan] of this.plans.entries()) {
        if (!plan.file) continue;
        try {
          const content = await this._pasteReviewReadOriginalContent(plan.file);
          if (content) {
            plan._originalContent = content;

            // Generate AST comparison and calculate line-level stats
            if (this.codeParser) {
              const methods = [...(plan.replacements || []), ...(plan.additions || [])];
              for (const method of methods) {
                const oldMethodCode = this.codeParser.extractFullMethodSource(
                  plan._originalContent,
                  method.name
                );
                method._oldCode = oldMethodCode;
                if (oldMethodCode) {
                  method._diffStats = DiffHelper.computeLineDiff(oldMethodCode, method.code);
                } else {
                  method._diffStats = { added: method.code.split('\n').length, removed: 0 };
                }
              }
            }
          }
        } catch (error) {
          console.warn("Failed to load original context for " + plan.file, error);
        }
      }

      // Initialize default active selection
      if (this.plans.length > 0) {
        this.selectedPlanIndex = 0;
        const plan = this.plans[0];
        if (plan.replacements?.length > 0) {
          this.selectedItemKey = `replacement::0::0`;
        } else if (plan.additions?.length > 0) {
          this.selectedItemKey = `addition::0::0`;
        } else if (plan.importAdditions?.length > 0 || plan.importDeletions?.length > 0) {
          this.selectedItemKey = `imports::0`;
        } else {
          this.selectedItemKey = `full::0`;
        }
      }

      this.renderStack();
    }

  async _handleProcess() {
      const btn = this.processBtn;
      const originalText = btn.textContent;
      btn.textContent = 'Applying...';
      btn.disabled = true;
      btn.style.opacity = '0.7';
      btn.style.cursor = 'not-allowed';

      try {
        if (this.plans) {
          this.plans.forEach((plan) => {
            if (plan.replacements) {
              plan.replacements = plan.replacements.filter((m) => !m.isUnchanged);
            }
          });
        }

        const remainingPlans = await Promise.resolve(this.onApply(this.plans));

        const fixMessages = this.plans.map(p => p._requestFixMessage).filter(Boolean);
        if (fixMessages.length > 0 && this.app && this.app.llmQueueManager) {
          this.app.llmQueueManager.receive(fixMessages.join('\n\n'), 'auto');
          if (this.app.uiManager) this.app.uiManager.setStatus('Sent strict code fix request to LLM.', false, 4000);
        }

        if (Array.isArray(remainingPlans) && remainingPlans.length > 0) {
          this.plans = remainingPlans;
          this.renderStack();
          btn.textContent = `Retry Remaining (${remainingPlans.length})`;
          btn.disabled = false;
          btn.style.opacity = '1';
          btn.style.cursor = 'pointer';
        } else {
          this.dialog.close();
        }
      } catch (e) {
        console.error('Paste application failed:', e);
        btn.textContent = 'Error: ' + (e?.message || String(e));
        btn.style.backgroundColor = '#ef5350';
        btn.style.borderColor = '#d32f2f';

        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = originalText;
          btn.style.backgroundColor = '#005f9e';
          btn.style.borderColor = '#007acc';
          btn.style.opacity = '1';
          btn.style.cursor = 'pointer';
        }, 3000);
      }
    }

  _renderParsedBody(plan, container, editorRefs) {
      if (plan.importAdditions && plan.importAdditions.length > 0) {
        const impSection = this._createSection('Imports (Additions)');
        const list = makeElement('div', {
          style: { display: 'flex', flexDirection: 'column', gap: '5px' },
        });

        plan.importAdditions.forEach((imp, idx) => {
          const row = makeElement('div', {
            style: { display: 'flex', gap: '5px', alignItems: 'center' },
          });
          row.appendChild(
            makeElement('input', {
              value: imp.symbol || '',
              placeholder: 'Symbol',
              style: {
                width: '120px',
                padding: '4px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
              },
              onchange: (e) => (imp.symbol = e.target.value),
            })
          );
          row.appendChild(
            makeElement('span', { textContent: 'from', style: { color: '#888' } })
          );
          row.appendChild(
            makeElement('input', {
              value: imp.path || '',
              placeholder: 'Path',
              style: {
                flex: 1,
                padding: '4px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
              },
              onchange: (e) => (imp.path = e.target.value),
            })
          );
          row.appendChild(
            makeElement('button', {
              textContent: '×',
              style: {
                background: '#ef5350',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                width: '24px',
              },
              onclick: () => {
                plan.importAdditions.splice(idx, 1);
                this.renderStack();
              },
            })
          );
          list.appendChild(row);
        });
        impSection.appendChild(list);
        container.appendChild(impSection);
      }

      if (
        (plan.action === 'create' || plan.action === 'replaceFile') &&
        plan.content
      ) {
        const fullSection = this._createSection('Full File Content');
        const editorHost = makeElement('div', {
          style: {
            height: '400px',
            border: '1px solid var(--border-color)',
            resize: 'vertical',
            overflow: 'hidden',
            flexShrink: 0,
          },
        });
        setTimeout(() => {
          const ed = new CodeMirrorWidget(
            'full_content',
            plan.content,
            this._getMode(plan.file)
          );
          editorHost.appendChild(ed.getElement());
          editorRefs.contentEditor = ed;
        }, 0);
        fullSection.appendChild(editorHost);
        container.appendChild(fullSection);
      }

      const methods = [...(plan.replacements || []), ...(plan.additions || [])];
      if (methods.length > 0) {
        methods.forEach((method, idx) => {
          const type = plan.replacements?.includes(method) ? 'Replace' : 'Add';
          const label = method.name || 'Anonymous Block';
          const newLines = method.code.split('\n').length;
          let info = `<span style="color:#888">${newLines} lines</span>`;
          if (method._diffStats) {
            info += ` <span style="color:#66bb6a; font-weight:bold">(+${method._diffStats.added})</span>`;
            info += ` <span style="color:#ef5350; font-weight:bold">(-${method._diffStats.removed})</span>`;
          }
          if (method.isUnchanged) {
            info += ` <span style="background:#444; color:#ccc; padding:2px 6px; border-radius:4px; font-size:0.9em; margin-left:8px;">No Change Detected</span>`;
          }

          const section = this._createSection(label, `(${type})`, info);
          if (method.isUnchanged) section.style.opacity = '0.7';

          const methodControls = makeElement('div', {
            style: { marginLeft: 'auto', display: 'flex', gap: '10px' },
          });
          const diffBtn = makeElement('button', {
            textContent: 'View Diff',
            style: {
              color: '#42a5f5',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.9em',
            },
          });
          const removeBtn = makeElement('button', {
            textContent: 'Remove',
            style: {
              color: '#ef5350',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.9em',
            },
            onclick: () => {
              if (plan.replacements)
                plan.replacements = plan.replacements.filter((m) => m !== method);
              if (plan.additions)
                plan.additions = plan.additions.filter((m) => m !== method);
              this.renderStack();
            },
          });

          methodControls.append(diffBtn, removeBtn);
          section.firstChild.appendChild(methodControls);

          const editorHost = makeElement('div', {
            style: {
              height: '300px',
              border: '1px solid var(--border-color)',
              resize: 'vertical',
              overflow: 'hidden',
              flexShrink: 0,
            },
          });
          const diffHost = makeElement('div', {
            style: {
              display: 'none',
              height: '300px',
              border: '1px solid var(--border-color)',
              resize: 'vertical',
              overflow: 'hidden',
              flexShrink: 0,
            },
          });

          let isDiffVisible = false;
          let diffEditorInstance = null;

          diffBtn.onclick = () => {
            isDiffVisible = !isDiffVisible;
            diffBtn.textContent = isDiffVisible ? 'Hide Diff' : 'View Diff';
            if (isDiffVisible) {
              editorHost.style.display = 'none';
              diffHost.style.display = 'block';
              if (!diffHost.hasChildNodes()) {
                const extensions = [
                  lineNumbers(),
                  history(),
                  EditorView.lineWrapping,
                  javascript(),
                  oneDark,
                  unifiedMergeView({
                    original:
                      method._oldCode || '// No previous version found in file',
                  }),
                ];
                diffEditorInstance = new EditorView({
                  state: EditorState.create({ doc: method.code, extensions }),
                  parent: diffHost,
                });

                if (!editorRefs.diffEditors) editorRefs.diffEditors = [];
                editorRefs.diffEditors.push(diffEditorInstance);
              }
            } else {
              editorHost.style.display = 'block';
              diffHost.style.display = 'none';
            }
          };

          setTimeout(() => {
            const ed = new CodeMirrorWidget(
              `method_${idx}`,
              method.code,
              'javascript'
            );
            editorHost.appendChild(ed.getElement());
            editorRefs.segments.push({ segment: ed, data: method });
          }, 0);

          section.append(editorHost, diffHost);
          container.appendChild(section);
        });
      }
    }

    static _doc_PasteReviewDialog() {
    return {
      "generatedBy": "MigrateOwnedSidecarDocsToCapsulesV2",
      "migratedAt": "2026-04-29T05:02:29.361Z",
      "sourcePath": "/vibes/src/editor/ui/dialogs/PasteReviewDialog_js.md",
      "ownerPath": "/vibes/src/editor/ui/dialogs/PasteReviewDialog.js",
      "ownerClass": "PasteReviewDialog",
      "migrationStatus": "sidecar-embedded-sidecar-deleted",
      "visibilityRole": "documentation",
      "note": "Migrated from legacy *_js.md sidecar into the managed JS capsule. This method is documentation payload, not runtime code. Prompt visibility docsLevel should control inclusion.",
      "content": "# PasteReviewDialog\n\n## Summary\n\nPasteReviewDialog is the gatekeeper for AI-generated code. When the LLM outputs a `recursi(...)` protocol block, the system doesn't blindly apply it to the codebase. Instead, this dialog intercepts the parsed update plan and presents it to the user. It breaks down exactly which methods are being added, replaced, or deleted, providing inline diffs to ensure the AI hasn't hallucinated or destroyed existing logic.\n\nThe philosophy is \"trust but verify.\" The dialog makes it easy to accept perfect code, but provides the granular tools needed to scrutinize suspicious edits. It calculates diffs, strips out regurgitated (unchanged) methods to save the user time, and even lets the user manually edit the target file path if the AI got confused.\n\n## Core Logic & Philosophy\n\n**Deep context comparison.** Before rendering, `_loadOriginalContexts` fetches the current state of the target file. It extracts the AST of both the original code and the AI's proposed code, running them through a formatter (Prettier). If the formatted strings match, it flags the method as `isUnchanged`. This prevents the user from reviewing code the LLM pointlessly repeated.\n\n**Dual viewing modes.** The dialog supports toggling between a \"Raw\" view (the exact text the LLM generated) and a \"Parsed\" view. The parsed view breaks the payload into discrete sections: Imports, Full File Content, and individual Method Replacements/Additions. Each method has a \"View Diff\" button that spawns a CodeMirror `unifiedMergeView` showing the exact line-level changes.\n\n**Granular rejection.** The user isn't forced to accept the whole payload. The parsed view includes \"Remove\" buttons next to every individual method and import. If the AI wrote three good methods and one bad one, the user can surgically strip the bad one from the plan before clicking \"Process Changes.\"\n\n## Public API\n\n### Lifecycle\n- `constructor(plans, app, onApply)` — Initializes the dialog with an array of parsed update plans. Kicks off the async process of fetching original code for diffing.\n- `render()` — Builds the outer dialog shell and triggers the stack rendering.\n- `renderStack()` — Evaluates the plans, builds the individual file review cards, and injects the CodeMirror diff viewers."
};
  }

  async _pasteReviewReadOriginalContent(filePath) {
      const path = this._pasteReviewNormalizePath(filePath);
      if (!path) return null;
      
      const openEditorContent = this._pasteReviewReadFromOpenTab(path);
      if (typeof openEditorContent === "string") return openEditorContent;

      const vfs = await this._pasteReviewGetVfs();
      if (vfs && typeof vfs.readFile === "function") {
        try {
          const content = await vfs.readFile(path, { nullOnMissing: true });
          if (typeof content === "string") return content;
        } catch (error) {
          this._pasteReviewLogReadFallback("vfs.readFile", path, error);
        }
      }

      if (this.app?.commands && typeof this.app.commands.fetchFileContentForApp === "function") {
        try {
          const content = await this.app.commands.fetchFileContentForApp(path);
          if (typeof content === "string") return content;
          if (content && typeof content.code === "string") return content.code;
        } catch (error) {
          this._pasteReviewLogReadFallback("commands.fetchFileContentForApp", path, error);
        }
      }

      return null;
    }

  _pasteReviewReadFromOpenTab(filePath) {
      const path = this._pasteReviewNormalizePath(filePath);
      if (!path || !this.app?.tabOrchestrator) return null;
      try {
        const controller = this.app.tabOrchestrator.getControllerForPath(path);
        if (controller && typeof controller.getCode === "function") {
          const content = controller.getCode();
          if (typeof content === "string") return content;
        }
      } catch (error) {
        this._pasteReviewLogReadFallback("tabOrchestrator.getControllerForPath", path, error);
      }
      return null;
    }

  async _pasteReviewGetVfs() {
      if (!this.app) return null;
      if (typeof this.app.refreshVirtualFileSystemStores === "function") {
        return await this.app.refreshVirtualFileSystemStores();
      }
      return this.app.vfs || null;
    }

  _pasteReviewNormalizePath(path) {
      if (path && typeof path.toString === "function" && typeof path !== "string") {
        path = path.toString();
      }
      if (typeof path !== "string") return "";
      let key = path.trim();
      if (!key) return "";
      
      const queryIndex = key.indexOf("?");
      if (queryIndex >= 0) key = key.slice(0, queryIndex);
      const hashIndex = key.indexOf("#");
      if (hashIndex >= 0) key = key.slice(0, hashIndex);
      while (key.includes("//")) {
        key = key.split("//").join("/");
      }
      if (!key.startsWith("/")) key = "/" + key;
      return key;
    }

  _pasteReviewLogReadFallback(operation, path, error) {
      const message = error && error.message ? error.message : String(error);
      if (this.app && typeof this.app.logFileOp === "function") {
        this.app.logFileOp("debug", "PasteReviewDialog VFS read fallback", {
          operation,
          path,
          error: message
        });
      }
    }

  _renderStrictWarningsBanner(plan, card) {
      const strictWarnings = (plan.managed?.warnings || []).filter(w => typeof w === 'string' && w.startsWith('[STRICT_VIOLATION:'));
      if (strictWarnings.length === 0) return;

      const warnContainer = makeElement('div', {
        style: { padding: '10px', backgroundColor: 'rgba(255, 152, 0, 0.15)', borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.08))', fontSize: '0.9em' }
      });
      warnContainer.innerHTML = '<strong style="color:#ffb74d">Strict Code Rule Violations:</strong><ul style="margin:6px 0;padding-left:20px;color:#ffe0b2">' +
        strictWarnings.map(w => '<li>' + w.split('] ')[1] + '</li>').join('') + '</ul>';

      const btnGroup = makeElement('div', { style: { display: 'flex', gap: '8px', marginTop: '8px' } });

      const allowFixBtn = makeElement('button', {
        textContent: 'Allow & Request Fix',
        style: { padding: '4px 8px', background: '#ffa000', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
        onclick: () => {
          plan._requestFixMessage = `The user allowed the changes in ${plan.file}, but requested you fix the following strict code violations:\n` + strictWarnings.map(w => `- ${w.split('] ')[1]}`).join('\n');
          warnContainer.style.display = 'none';
          plan.managed.warnings = plan.managed.warnings.filter(w => !w.startsWith('[STRICT_VIOLATION:'));
        }
      });

      btnGroup.append(allowFixBtn);
      warnContainer.appendChild(btnGroup);
      card.appendChild(warnContainer);
    }


  _createStatsPills(removed, added) {
      const statsSpan = makeElement('span', { style: { display: 'inline-flex', gap: '4px' } });
      if (added > 0) {
        statsSpan.appendChild(makeElement('span', { className: 'review-stats-pill add', textContent: `+${added}` }));
      }
      if (removed > 0) {
        statsSpan.appendChild(makeElement('span', { className: 'review-stats-pill rem', textContent: `-${removed}` }));
      }
      return statsSpan;
    }

  _renderRightSidecar() {
      this.rightPanel.innerHTML = '';

      if (this.plans.length === 0 || !this.plans[this.selectedPlanIndex]) {
        this.rightPanel.innerHTML = `
          <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #64748b; font-style: italic; font-size: 13px; text-align: center; border: 1px dashed rgba(255,255,255,0.06); border-radius: 6px; background: rgba(0,0,0,0.1); padding: 20px;">
            <span>Select an updated method on the left to view the interactive diff.</span>
          </div>
        `;
        return;
      }

      const plan = this.plans[this.selectedPlanIndex];
      const keyParts = String(this.selectedItemKey || '').split('::');
      const kind = keyParts[0];
      const index = parseInt(keyParts[1]);

      let titleText = 'Interactive Diff Preview';
      let originalContent = '';
      let newContent = '';

      if (kind === 'replacement' || kind === 'addition') {
        const method = kind === 'replacement' ? plan.replacements[index] : plan.additions[index];
        if (method) {
          titleText = `Diff: .${method.name.split('.').pop()}`;
          originalContent = method._oldCode || '';
          newContent = method.code || '';
        }
      } else if (kind === 'imports') {
        titleText = 'Diff: Module Imports';
        originalContent = (plan.importDeletions || []).map(i => `import { ${i.symbol} } from '${i.source}';`).join('\n');
        newContent = (plan.importAdditions || []).map(i => `import { ${i.symbol} } from '${i.source}';`).join('\n');
      } else {
        // Full file overwrite or default fallback
        titleText = `Diff: ${plan.file?.split('/').pop() || 'Full File'}`;
        originalContent = plan._originalContent || '';
        newContent = plan.content || plan.rawBody || '';
      }

      const titleNode = makeElement('div', {
        textContent: titleText.toUpperCase(),
        style: { fontWeight: 'bold', fontSize: '11px', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '4px', textAlign: 'left' }
      });
      this.rightPanel.appendChild(titleNode);

      const diffContainer = DiffHelper.renderUnifiedDiff(originalContent, newContent);
      this.rightPanel.appendChild(diffContainer);
    }
}

