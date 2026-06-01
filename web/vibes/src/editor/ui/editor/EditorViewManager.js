
class EditorViewManager {
  
  constructor(controller) {
    this.controller = controller;
    this.app = controller.app || window._dev_projectEditorInstance;

    this.activeView = 'standard';
    this.activeDocView = 'rendered';
    this.docEditorInstance = null;
    this.viewContainer = null;
    this.editorContainer = null;
    this.structuredViewContainer = null;
    this.docViewContainer = null;
    this.renderedDocView = null;
    this.markdownEditorView = null;
    this.docControls = null;
    this.renderedMarkdownContainer = null;
    this.buttonGlowBox = null;
    this.isWidgetGlowVisible = false;
    this._boundUpdateWidgetGlowBoxState = null;

    // NEW: retry loop state for structured rendering
    this._structuredRetryTimer = null;
    this._structuredRetryCount = 0;

    this.glowColors = {
      standard: '#0088ff',
      structured: '#f39c12',
      docs: '#8433ff',
    };
  }

  createLayout() {
      this.controller.contentPanel.innerHTML = '';
      this.docControls = null;
      this.signatureBtn = null;
      this.docsBtn = null;

      this.editorAreaWrapper = makeElement('div', {
        className: 'editor-area-wrapper',
      });
      this.modeSidebar = makeElement('div', { className: 'editor-mode-sidebar' });

      const isJsFile = this.controller.filePath.endsWith('.js');

      this.codeBtn = makeElement(
        'div',
        {
          className: 'editor-mode-btn code-btn active',
          'data-view': 'code', 
          onclick: () => this.setActiveView('code'), 
          onmouseover: (e) => { if (window.GlowingTooltip) GlowingTooltip.show(e.currentTarget, 'View Code', { color: [0, 136, 255] }); },
          onmouseout: () => { if (window.GlowingTooltip) GlowingTooltip.hide(); }
        },
        'Code'
      );
      this.modeSidebar.append(this.codeBtn);

      if (isJsFile) {
        this.signatureBtn = makeElement(
          'div',
          {
            className: 'editor-mode-btn signature-btn',
            'data-view': 'structured',
            onclick: () => this.setActiveView('structured'),
            style: { display: 'none' },
            onmouseover: (e) => { if (window.GlowingTooltip) GlowingTooltip.show(e.currentTarget, 'View Signatures', { color: [243, 156, 18] }); },
            onmouseout: () => { if (window.GlowingTooltip) GlowingTooltip.hide(); }
          },
          'Signature'
        );
        this.modeSidebar.append(this.signatureBtn);
      }

      this.docsBtn = makeElement(
        'div',
        {
          className: 'editor-mode-btn docs-btn',
          'data-view': 'docs',
          onclick: () => this.setActiveView('docs'),
          style: { display: 'none' },
          onmouseover: (e) => { if (window.GlowingTooltip) GlowingTooltip.show(e.currentTarget, 'View Documentation', { color: [132, 51, 255] }); },
          onmouseout: () => { if (window.GlowingTooltip) GlowingTooltip.hide(); }
        },
        'Docs'
      );
      this.modeSidebar.append(this.docsBtn);

      this.viewContainer = makeElement('div', { className: 'view-container' });
      this.editorContainer = makeElement('div', {
        className: 'editor-view-container',
      });
      this.structuredViewContainer = makeElement('div', {
        className: 'structured-view-container',
        style: { display: 'none' },
      });
      this.docViewContainer = makeElement('div', {
        className: 'doc-view-wrapper',
        style: { display: 'none' },
      });

      this.diffViewContainer = makeElement('div', {
        className: 'diff-view-container',
        style: { display: 'none' },
      });
      this.diffToolbar = makeElement('div', { className: 'diff-toolbar' });
      this.diffEditorHost = makeElement('div', { className: 'diff-editor-host' });
      this.diffViewContainer.append(this.diffToolbar, this.diffEditorHost);

      this.renderedMarkdownContainer = makeElement('div', {
        className: 'doc-view-container',
        style: { display: 'none' },
      });
      this.renderedDocView = makeElement('div', {
        className: 'doc-view-container',
      });
      this.markdownEditorView = makeElement('div', {
        className: 'doc-editor-container',
        style: { display: 'none' },
      });
      this.docViewContainer.append(this.renderedDocView, this.markdownEditorView);
      this.viewContainer.append(
        this.editorContainer,
        this.structuredViewContainer,
        this.docViewContainer,
        this.diffViewContainer,
        this.renderedMarkdownContainer
      );
      this.editorAreaWrapper.append(this.modeSidebar, this.viewContainer);
      this.controller.contentPanel.append(this.editorAreaWrapper);

      this._applyStyles();
      this._updateButtonStates('code'); 
    }

  setActiveView(viewName, forceUpdate = false) {
      if (viewName === 'standard') {
        viewName = 'code';
      }

      if (this.activeView === viewName && !forceUpdate) {
        return;
      }

      if (this.activeView === 'structured' && viewName !== 'structured') {
        this._clearStructuredRetry();
      }

      this.activeView = viewName;

      if (this.app) {
        this.app.lastEditorViewMode = viewName;
        if (typeof this.app._saveSettings === 'function') {
          this.app._saveSettings();
        }
      }

      if (this.editorAreaWrapper) {
        this.editorAreaWrapper.classList.toggle('diff-active', viewName === 'diff');
      }

      this.destroyGlowBoxes();
      this._updateButtonStates(viewName);
      this.updateWidgetGlowBoxState();

      if (this.controller.appContext.onViewModeChange) {
        const glowColorMap = {
          code: this.glowColors.standard,
          structured: this.glowColors.structured,
          docs: this.glowColors.docs
        };
        const glowColor = glowColorMap[viewName] || '#ffffff';
        this.controller.appContext.onViewModeChange(viewName, glowColor);
      }

      if (this.editorContainer) {
        this.editorContainer.style.display = viewName === 'code' ? 'flex' : 'none';
      }

      if (this.structuredViewContainer) {
        this.structuredViewContainer.style.display =
          viewName === 'structured' ? 'flex' : 'none';
      }

      if (this.docViewContainer) {
        this.docViewContainer.style.display = viewName === 'docs' ? 'flex' : 'none';
      }

      if (this.diffViewContainer) {
        this.diffViewContainer.style.display = viewName === 'diff' ? 'flex' : 'none';
      }

      if (this.renderedMarkdownContainer) {
        this.renderedMarkdownContainer.style.display =
          viewName === 'rendered_md' ? 'flex' : 'none';
      }

      if (viewName === 'docs') {
        this.fetchAndRenderDocs();
      } else if (viewName === 'structured') {
        this.renderStructuredView();
      } else if (viewName === 'code') {
        const mainWidget = this.controller.codeMirrorWidgets.get(
          this.controller.segmentOrder[0]
        );

        if (mainWidget?.editor) {
          mainWidget.editor.requestMeasure();
        }
      }
    }

  displaySingleSegment(name, code, mode, onChangeCallback) {
      this.controller.codeMirrorWidgets.clear();
      this.controller.segmentOrder = [];
      this.editorContainer.innerHTML = '';
      try {
        const widget = new CodeMirrorWidget(name, code, mode, onChangeCallback);
        this.controller.codeMirrorWidgets.set(name, widget);
        this.controller.segmentOrder.push(name);
        this.editorContainer.appendChild(widget.getElement());
      } catch (error) {
        console.error(`Error creating CodeMirrorWidget "${name}":`, error);
        this.editorContainer.appendChild(
          makeElement(
            'div',
            { className: 'error-message' },
            `Error creating widget "${name}": ${error.message}`
          )
        );
      }
    }

    async fetchAndRenderDocs() {
    const target = this._getDocsRenderTarget();
    if (!target) {
      console.warn('[EditorViewManager] No docs render target is available.');
      return false;
    }

    target.innerHTML = '<i>Loading documentation...</i>';

    try {
      let docContent = '';

      if (typeof this.controller.docContent === 'string' && this.controller.docContent.trim()) {
        docContent = this.controller.docContent;
      }

      if (!docContent && this.controller.documentationManager) {
        const manager = this.controller.documentationManager;

        if (typeof manager.getCapsuleDocContentForSourcePath === 'function') {
          const sourceCode =
            typeof this.controller.getCode === 'function'
              ? this.controller.getCode()
              : '';

          try {
            const capsuleDocs = await manager.getCapsuleDocContentForSourcePath(
              this.controller.filePath,
              sourceCode,
              4
            );

            if (typeof capsuleDocs === 'string' && capsuleDocs.trim()) {
              docContent = capsuleDocs;
            }
          } catch (error) {
            console.warn('[EditorViewManager] DocumentationManager capsule docs failed:', error);
          }
        }
      }

      if (!docContent && /\.js$/i.test(this.controller.filePath)) {
        const sourceCode =
          typeof this.controller.getCode === 'function'
            ? this.controller.getCode()
            : '';

        if (typeof this.controller._detectCapsuleDocsFromSource === 'function') {
          docContent = this.controller._detectCapsuleDocsFromSource(sourceCode);
        }
      }

      if (!docContent && this.controller.documentationManager) {
        const manager = this.controller.documentationManager;

        if (typeof manager.getDocPath === 'function') {
          const docPath = manager.getDocPath(this.controller.filePath);
          if (docPath) {
            const candidatePaths = [];

            if (String(docPath).startsWith('/')) {
              candidatePaths.push(String(docPath));
            } else {
              candidatePaths.push('/' + String(docPath).replace(/^\/+/, ''));
              candidatePaths.push(
                '/' +
                  String(this.controller.projectName || '').replace(/^\/+/, '') +
                  '/' +
                  String(docPath).replace(/^\/+/, '')
              );
            }

            for (const candidatePath of candidatePaths) {
              const fetched = await this.controller._fetchFileContent(candidatePath);
              const content = this._extractContentFromFetchResult(fetched);
              if (content && content.trim()) {
                docContent = content;
                break;
              }
            }
          }
        }
      }

      if (docContent && docContent.trim()) {
        this.controller.docContent = docContent;
        this.controller.hasDocs = true;
        this.originalDocContent = docContent;
        this._renderMarkdownIntoElement(target, docContent);
        this.updateButtonVisibility();
        return true;
      }

      target.innerHTML = '<i>No documentation found.</i>';
      return false;
    } catch (err) {
      console.error('Error fetching docs:', err);
      target.innerHTML = `<i style="color: red;">Error: ${this._escapeHtml(err.message || String(err))}</i>`;
      return false;
    }
  }

  async refreshDocs() {
    await this.fetchAndRenderDocs();
  }

  renderStructuredView__patch_1777414611781_vf7v3() {
    // Always clear first (existing behavior)
    this.structuredViewContainer.innerHTML = '';

    // If we aren't actually in structured view anymore, don't do anything.
    if (this.activeView !== 'structured') return;

    const mainEditorView = this._getMainEditorView();

    // If editor still isn't ready, retry
    if (!mainEditorView) {
      if (typeof this._scheduleStructuredRetry === 'function') {
        this._scheduleStructuredRetry();
      }
      return;
    }

    // IMPORTANT: parse from the editor's live doc (not controller.getCode())
    const codeText = this._getCodeForParsing();

    // If the doc is temporarily empty during file swap, retry shortly instead of showing nothing.
    if (!codeText || codeText.trim().length === 0) {
      if (typeof this._scheduleStructuredRetry === 'function') {
        this._scheduleStructuredRetry();
      }
      return;
    }

    try {
      // --- Exports ---
      const exportsSection = makeElement('div', {
        className: 'navigator-section',
      });
      exportsSection.append(makeElement('h4', {}, 'Export'));

      const exportList = makeElement('ul', { className: 'navigator-list' });
      const currentExports = Array.isArray(this.controller.exports)
        ? this.controller.exports
        : [];

      if (currentExports.length > 0) {
        currentExports.forEach((exp) => {
          const kindDisplay = (exp.kind || 'Unknown')
            .replace('Declaration', '')
            .toLowerCase();
          exportList.appendChild(
            makeElement('li', { className: 'navigator-item export-item' }, [
              makeElement('span', { className: 'item-main' }, [
                makeElement('strong', {}, exp.name),
                makeElement('span', { className: 'item-meta' }, kindDisplay),
              ]),
            ])
          );
        });
      } else {
        exportList.innerHTML =
          '<li class="navigator-item is-empty">No export found.</li>';
      }
      exportsSection.appendChild(exportList);

      const bottomColumns = makeElement('div', {
        className: 'navigator-columns',
      });

      // --- Imports / Dependencies ---
      const dependenciesSection = makeElement('div', {
        className: 'navigator-section',
      });
      dependenciesSection.append(makeElement('h4', {}, 'Dependencies'));

      const imports = Array.isArray(this.controller.imports)
        ? this.controller.imports
        : [];
      const importList = this._buildImportList(imports, mainEditorView);
      dependenciesSection.append(importList);

      // --- Members with LOC ---
      const membersSection = makeElement('div', {
        className: 'navigator-section',
      });

      const membersHeader = makeElement(
        'div',
        {
          className: 'navigator-header',
          style:
            'display:flex; justify-content:space-between; padding: 4px 10px; font-size:0.8em; color:#888; border-bottom:1px solid #444; margin-bottom:5px; font-weight:bold; text-transform:uppercase;',
        },
        [makeElement('span', {}, 'Member'), makeElement('span', {}, 'LOC')]
      );

      const memberList = makeElement('ul', { className: 'navigator-list' });

      const codeParser = this.controller.codeParser;
      const allMemberDetails =
        codeParser && typeof codeParser.getMemberDetails === 'function'
          ? codeParser.getMemberDetails(codeText)
          : [];

      // --- NEW: SPLIT BACKUPS FROM ACTIVE MEMBERS ---
      const memberDetails = [];
      const patchDetails = [];
      
      allMemberDetails.forEach((detail) => {
        if (detail.name.includes('__patch_') || detail.name.includes('__broken_')) {
          patchDetails.push(detail);
        } else {
          memberDetails.push(detail);
        }
      });

      memberDetails.sort((a, b) => {
        if (a.isPublic && !b.isPublic) return -1;
        if (!a.isPublic && b.isPublic) return 1;
        return a.name.localeCompare(b.name);
      });

      if (memberDetails.length > 0) {
        memberDetails.forEach((detail) => {
          memberList.appendChild(
            makeElement(
              'li',
              {
                className: `navigator-item member-item ${
                  detail.isPublic ? 'is-public' : 'is-private'
                }`,
                onclick: () => {
                  this.setActiveView('code');
                  mainEditorView.dispatch({
                    selection: { anchor: detail.node.start },
                    scrollIntoView: true,
                  });
                  mainEditorView.focus();
                },
                style:
                  'display:flex; justify-content:space-between; align-items:center;',
              },
              [
                makeElement('div', { className: 'item-main' }, [
                  makeElement(
                    'span',
                    { className: 'item-signature' },
                    detail.signature
                  ),
                ]),
                makeElement(
                  'span',
                  {
                    className: 'item-meta',
                    style:
                      'font-family:monospace; font-size:0.85em; color:#aaa; background:rgba(255,255,255,0.08); padding:1px 5px; border-radius:3px; min-width:20px; text-align:center;',
                  },
                  `${detail.lineCount}`
                ),
              ]
            )
          );
        });
      } else {
        memberList.innerHTML =
          '<li class="navigator-item is-empty">No members found.</li>';
      }

      membersSection.append(membersHeader, memberList);
      const sectionsToAppend = [dependenciesSection, membersSection];

      // --- NEW: RENDER BACKUP / SQUASH SECTION ---
      if (patchDetails.length > 0) {
        const patchSection = makeElement('div', { 
            className: 'navigator-section', 
            style: { backgroundColor: 'rgba(239, 83, 80, 0.05)', borderColor: 'rgba(239, 83, 80, 0.2)' } 
        });
        
        const patchHeader = makeElement('div', { 
            className: 'navigator-header', 
            style: 'padding: 4px 10px; font-size:0.8em; color:#ef5350; border-bottom:1px solid rgba(239, 83, 80, 0.2); margin-bottom:5px; font-weight:bold; text-transform:uppercase; display:flex; justify-content:space-between; align-items:center;' 
        });
        patchHeader.appendChild(makeElement('span', {}, 'Local History (Backups)'));
        
        const squashBtn = makeElement('button', { 
            style: { padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ef5350', background: 'rgba(239, 83, 80, 0.1)', color: '#ef5350' },
            onclick: async () => {
                if (!confirm(`Squash ${patchDetails.length} backups? This will permanently delete the old method versions from the file.`)) return;
                
                let targetStructureName = null;
                const exports = this.controller.exports || [];
                if (exports.length > 0) {
                    targetStructureName = exports[0].name;
                } else {
                    targetStructureName = this.controller.filePath.split('/').pop().replace('.js', '');
                }

                // Prepare a surgical update that just deletes all the backup methods
                const deletions = patchDetails.map(d => targetStructureName + '.' + d.name);
                const plan = {
                    file: this.controller.filePath,
                    action: 'update',
                    targetStructureName: targetStructureName,
                    deletions: deletions,
                    replacements: [], additions: [], importAdditions: [], importDeletions: [],
                    _viewMode: 'segments'
                };
                
                const failures = await this.app.actionHandler.applyPastePlans([plan]);
                if (!failures || failures.length === 0) {
                    this.app.uiManager.setStatus(`Squashed ${patchDetails.length} backups successfully.`, false, 3000);
                    // The signature view will auto-re-render because of the code change
                }
            }
        }, 'Squash All');
        patchHeader.appendChild(squashBtn);

        const patchList = makeElement('ul', { className: 'navigator-list' });
        patchDetails.sort((a, b) => b.name.localeCompare(a.name)).forEach((detail) => {
          patchList.appendChild(
            makeElement(
              'li',
              {
                className: 'navigator-item member-item is-private',
                onclick: () => {
                  this.setActiveView('code');
                  mainEditorView.dispatch({
                    selection: { anchor: detail.node.start },
                    scrollIntoView: true,
                  });
                  mainEditorView.focus();
                },
                style: 'display:flex; justify-content:space-between; align-items:center;'
              },
              [
                makeElement('div', { className: 'item-main' }, [
                  makeElement('span', { className: 'item-signature', style: 'color: #ffbbaadd; font-size: 0.85em;' }, detail.signature)
                ]),
                makeElement('span', { className: 'item-meta', style: 'font-family:monospace; font-size:0.85em; color:#aaa; background:rgba(255,255,255,0.08); padding:1px 5px; border-radius:3px; min-width:20px; text-align:center;' }, String(detail.lineCount))
              ]
            )
          );
        });

        patchSection.append(patchHeader, patchList);
        sectionsToAppend.push(patchSection);
      }

      bottomColumns.append(...sectionsToAppend);
      this.structuredViewContainer.append(exportsSection, bottomColumns);

      if (typeof this._clearStructuredRetry === 'function') {
        this._clearStructuredRetry();
      }
    } catch (err) {
      console.error('[EditorViewManager] renderStructuredView failed:', err);
      this.structuredViewContainer.append(
        makeElement('div', { style: 'padding: 12px; color: #f48771; font-family: system-ui, sans-serif; font-size: 12px;' }, 'Signature view is initializing…')
      );
      if (typeof this._scheduleStructuredRetry === 'function') {
        this._scheduleStructuredRetry();
      }
    }
  }

  renderStructuredView() {
      this.structuredViewContainer.innerHTML = '';

      if (this.activeView !== 'structured') return;

      const mainEditorView = this._getMainEditorView();

      if (!mainEditorView) {
        if (typeof this._scheduleStructuredRetry === 'function') {
          this._scheduleStructuredRetry();
        }
        return;
      }

      const codeText = this._getCodeForParsing();

      if (!codeText || codeText.trim().length === 0) {
        if (typeof this._scheduleStructuredRetry === 'function') {
          this._scheduleStructuredRetry();
        }
        return;
      }

      try {
        const content = document.createElement('div');
        content.style.padding = '15px';
        content.style.display = 'flex';
        content.style.flexDirection = 'column';
        content.style.gap = '15px';
        content.style.color = 'var(--text-primary)';
        content.style.maxWidth = '100%';
        content.style.boxSizing = 'border-box';

        // --- AST Analysis ---
        const codeParser = this.controller.codeParser;
        const allMemberDetails = codeParser && typeof codeParser.getMemberDetails === 'function' ? codeParser.getMemberDetails(codeText) : [];

        const memberDetails = [];
        const patchDetails = [];
        allMemberDetails.forEach((detail) => {
          if (detail.name.includes('__patch_') || detail.name.includes('__broken_')) {
            patchDetails.push(detail);
          } else {
            memberDetails.push(detail);
          }
        });
        memberDetails.sort((a, b) => {
          if (a.isPublic && !b.isPublic) return -1;
          if (!a.isPublic && b.isPublic) return 1;
          return a.name.localeCompare(b.name);
        });

        // --- 1. Golden Path Header & Clipboard Utility Bar ---
        const pathHeader = makeElement('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            gap: '10px',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }
        }, [
          makeElement('span', {
            textContent: this.controller.filePath,
            style: {
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: '11px',
              color: '#cbd5e1',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              userSelect: 'all',
              minWidth: '0',
              flex: '1'
            }
          }),
          makeElement('div', { style: { display: 'flex', gap: '6px', flexShrink: '0' } }, [
            makeElement('button', {
              textContent: '📋 Copy Path',
              style: {
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.1)',
                backgroundColor: 'rgba(255,255,255,0.05)',
                color: '#fff'
              },
              onclick: () => {
                navigator.clipboard.writeText(this.controller.filePath)
                  .then(() => this.app.uiManager?.setStatus('Copied file path to clipboard.'))
                  .catch(() => this.app.uiManager?.setStatus('Copy failed.', true));
              }
            }),
            makeElement('button', {
              textContent: '📜 Copy Signatures',
              style: {
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                borderRadius: '4px',
                border: '1px solid rgba(100,180,255,0.2)',
                backgroundColor: 'rgba(30,100,200,0.25)',
                color: '#fff'
              },
              onclick: () => {
                const sigText = memberDetails.map(m => m.signature).join('\n');
                navigator.clipboard.writeText(sigText)
                  .then(() => this.app.uiManager?.setStatus('Copied signatures to clipboard.'))
                  .catch(() => this.app.uiManager?.setStatus('Copy failed.', true));
              }
            })
          ])
        ]);
        content.appendChild(pathHeader);

        // --- 2. Top Info Bar (Export & Collapsible Imports) ---
        const infoBar = makeElement('div', {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '0 2px',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }
        });

        const currentExports = Array.isArray(this.controller.exports) ? this.controller.exports : [];
        const exportNode = currentExports[0];
        if (exportNode) {
          const kindDisplay = (exportNode.kind || 'class').replace('Declaration', '').toLowerCase();
          infoBar.appendChild(makeElement('div', {
            style: { fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'left' }
          }, [
            'Exported: ',
            makeElement('strong', { style: { color: 'var(--accent-teal, #00bfa5)' } }, exportNode.name),
            ` (${kindDisplay})`
          ]));
        }

        const imports = Array.isArray(this.controller.imports) ? this.controller.imports : [];
        if (imports.length > 0) {
          const importsDropdown = makeElement('details', {
            style: {
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              backgroundColor: 'rgba(0,0,0,0.15)',
              overflow: 'hidden',
              maxWidth: '100%',
              boxSizing: 'border-box'
            }
          }, [
            makeElement('summary', {
              textContent: `Imports / Dependencies (${imports.length})`,
              style: {
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '700',
                outline: 'none',
                userSelect: 'none',
                color: '#cbd5e1',
                textAlign: 'left'
              }
            }),
            makeElement('div', {
              style: {
                padding: '10px',
                borderTop: '1px solid var(--border-color)',
                maxHeight: '160px',
                overflowY: 'auto',
                maxWidth: '100%',
                boxSizing: 'border-box'
              }
            }, [
              this._buildImportList(imports, mainEditorView)
            ])
          ]);
          infoBar.appendChild(importsDropdown);
        }
        content.appendChild(infoBar);

        // --- 3. Full-Width Left-Aligned Methods & Properties Section ---
        const membersSection = makeElement('div', {
          className: 'navigator-section',
          style: { width: '100%', marginTop: '10px', maxWidth: '100%', boxSizing: 'border-box' }
        });
        const membersHeader = makeElement('div', {
          className: 'navigator-header',
          style: 'display:flex; justify-content:space-between; padding: 6px 12px; font-size:0.8em; color:#888; border-bottom:1px solid #444; margin-bottom:8px; font-weight:bold; text-transform:uppercase; text-align:left;'
        }, [
          makeElement('span', {}, 'Methods & Properties'),
          makeElement('span', {}, 'LOC')
        ]);
        const memberList = makeElement('ul', {
          className: 'navigator-list',
          style: { width: '100%', listStyle: 'none', padding: '0', margin: '0', maxWidth: '100%', boxSizing: 'border-box' }
        });

        if (memberDetails.length > 0) {
          memberDetails.forEach((detail) => {
            memberList.appendChild(makeElement('li', {
              className: `navigator-item member-item ${detail.isPublic ? 'is-public' : 'is-private'}`,
              onclick: () => {
                this.setActiveView('code');
                const scrollEffect = EditorView.scrollIntoView(detail.node.start, { y: 'start', yMargin: 40 });
                mainEditorView.dispatch({
                  selection: { anchor: detail.node.start, head: detail.node.start },
                  effects: scrollEffect
                });
                mainEditorView.focus();
              },
              style: 'display:flex; justify-content:space-between; align-items:center; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.03); cursor: pointer; text-align: left; width: 100%; box-sizing: border-box; min-width: 0;'
            }, [
              makeElement('div', { className: 'item-main', style: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: '0', flex: '1', textAlign: 'left', justifyContent: 'flex-start' } }, [
                makeElement('span', {
                  className: 'item-indicator',
                  textContent: detail.isPublic ? '●' : '○',
                  style: { color: detail.isPublic ? 'var(--accent-teal, #00bfa5)' : '#64748b', fontSize: '9px', width: '12px', flexShrink: '0', textAlign: 'left' }
                }),
                makeElement('span', { 
                  className: 'item-signature', 
                  style: { fontFamily: 'monospace', fontSize: '12px', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: '1', minWidth: '0', textAlign: 'left' } 
                }, detail.signature)
              ]),
              makeElement('span', { className: 'item-meta', style: { fontFamily: 'monospace', fontSize: '0.85em', color: '#aaa', background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '3px', minWidth: '24px', textAlign: 'center', flexShrink: '0', marginLeft: '10px' } }, `${detail.lineCount}`),
            ]));
          });
        } else {
          memberList.innerHTML = '<li class="navigator-item is-empty" style="padding: 12px; color: #64748b; font-style: italic; text-align: left;">No members found.</li>';
        }
        membersSection.append(membersHeader, memberList);
        content.appendChild(membersSection);

        // --- 4. Backups Section (Full Width, Left-Aligned) ---
        if (patchDetails.length > 0) {
          const patchSection = makeElement('div', {
            className: 'navigator-section',
            style: { width: '100%', marginTop: '15px', backgroundColor: 'rgba(239, 83, 80, 0.05)', borderColor: 'rgba(239, 83, 80, 0.2)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(239, 83, 80, 0.2)', maxWidth: '100%', boxSizing: 'border-box' }
          });
          const patchHeader = makeElement('div', {
            className: 'navigator-header',
            style: 'padding: 4px 0; font-size:0.8em; color:#ef5350; border-bottom:1px solid rgba(239, 83, 80, 0.2); margin-bottom:8px; font-weight:bold; text-transform:uppercase; display:flex; justify-content:space-between; align-items:center; text-align: left;'
          });
          patchHeader.appendChild(makeElement('span', {}, 'Local History (Backups)'));
          
          const squashBtn = makeElement('button', { 
            style: { padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ef5350', background: 'rgba(239, 83, 80, 0.1)', color: '#ef5350' },
            onclick: async () => {
                if (!confirm(`Squash ${patchDetails.length} backups? This will permanently delete the old method versions from the file.`)) return;
                let targetStructureName = exportNode ? exportNode.name : this.controller.filePath.split('/').pop().replace('.js', '');
                const deletions = patchDetails.map(d => targetStructureName + '.' + d.name);
                const plan = {
                    file: this.controller.filePath,
                    action: 'update',
                    targetStructureName: targetStructureName,
                    deletions: deletions,
                    replacements: [], additions: [], importAdditions: [], importDeletions: [],
                    _viewMode: 'segments'
                };
                const failures = await this.app.actionHandler.applyPastePlans([plan]);
                if (!failures || failures.length === 0) {
                    this.app.uiManager.setStatus(`Squashed ${patchDetails.length} backups successfully.`, false, 3000);
                }
            }
          }, 'Squash All');
          patchHeader.appendChild(squashBtn);

          const patchList = makeElement('ul', { className: 'navigator-list', style: { listStyle: 'none', padding: '0', margin: '0', maxWidth: '100%', boxSizing: 'border-box' } });
          patchDetails.sort((a, b) => b.name.localeCompare(a.name)).forEach((detail) => {
            patchList.appendChild(makeElement('li', {
              className: 'navigator-item member-item is-private',
              onclick: () => {
                this.setActiveView('code');
                const scrollEffect = EditorView.scrollIntoView(detail.node.start, { y: 'start', yMargin: 40 });
                mainEditorView.dispatch({
                  selection: { anchor: detail.node.start, head: detail.node.start },
                  effects: scrollEffect
                });
                mainEditorView.focus();
              },
              style: 'display:flex; justify-content:space-between; align-items:center; padding: 6px 8px; border-bottom: 1px solid rgba(255,255,255,0.02); cursor: pointer; text-align: left; width: 100%; box-sizing: border-box; min-width: 0;'
            }, [
              makeElement('div', { className: 'item-main', style: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: '0', flex: '1', textAlign: 'left', justifyContent: 'flex-start' } }, [
                makeElement('span', { className: 'item-signature', style: {color: '#ffbbaadd', fontFamily: 'monospace', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: '1', minWidth: '0', textAlign: 'left' } }, detail.signature)
              ]),
              makeElement('span', { className: 'item-meta', style: { fontFamily: 'monospace', fontSize: '0.85em', color: '#aaa', background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: '3px', minWidth: '20px', textAlign: 'center', flexShrink: '0', marginLeft: '10px' } }, String(detail.lineCount))
            ]));
          });
          patchSection.append(patchHeader, patchList);
          content.appendChild(patchSection);
        }

        this.structuredViewContainer.appendChild(content);

        if (typeof this._clearStructuredRetry === 'function') {
          this._clearStructuredRetry();
        }
      } catch (err) {
        console.error('[EditorViewManager] renderStructuredView failed:', err);
        this.structuredViewContainer.append(
          makeElement('div', { style: 'padding: 12px; color: #f48771; font-family: system-ui, sans-serif; font-size: 12px;' }, 'Signature view is initializing…')
        );
        if (typeof this._scheduleStructuredRetry === 'function') {
          this._scheduleStructuredRetry();
        }
      }
    }

    _setDocView(docViewName) {
    this.activeDocView = docViewName;

    this.renderedDocView.style.display = docViewName === 'rendered' ? 'block' : 'none';
    this.markdownEditorView.style.display = docViewName === 'markdown' ? 'block' : 'none';

    if (docViewName === 'markdown') {
      if (!this.docEditorInstance) {
        this.markdownEditorView.innerHTML = '';

        const cmHistoryFn =
          typeof cmHistory === 'function'
            ? cmHistory
            : typeof history === 'function'
            ? history
            : null;

        const extensions = [
          lineNumbers(),
          cmHistoryFn ? cmHistoryFn() : [],
          keymap.of([
            ...defaultKeymap,
            ...(typeof historyKeymap !== 'undefined' ? historyKeymap : []),
            ...(typeof searchKeymap !== 'undefined' ? searchKeymap : []),
          ]),
          typeof search === 'function' ? search({ top: true }) : [],
          typeof highlightSelectionMatches === 'function' ? highlightSelectionMatches() : [],
          typeof markdown === 'function' ? markdown() : [],
          typeof oneDark !== 'undefined' ? oneDark : [],
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              this.controller.isDocDirty = true;
            }
          }),
        ].flat().filter(Boolean);

        const state = EditorState.create({
          doc: this.controller.docContent || '',
          extensions,
        });

        this.docEditorInstance = new EditorView({
          state,
          parent: this.markdownEditorView,
        });
      }

      this.docEditorInstance.requestMeasure();
      this.docEditorInstance.focus();
    } else if (docViewName === 'rendered') {
      if (this.docEditorInstance) {
        const newMarkdown = this.docEditorInstance.state.doc.toString();
        this.controller.docContent = newMarkdown;
        this.renderedDocView.innerHTML = window.marked.parse(newMarkdown || '<em>Documentation file is empty.</em>');
      }
    }
  }

  _updateButtonStates(activeViewName) {
    const map = {
      code: this.codeBtn,
      structured: this.signatureBtn,
      docs: this.docsBtn,
    };

    // Clear state
    Object.values(map).forEach((btn) => {
      if (!btn) return;
      btn.classList.remove('active');

      // IMPORTANT: remove any legacy inline styling that causes “mystery” looks
      btn.style.borderBottomColor = '';
      btn.style.color = '';
    });

    // Apply state
    const activeBtn = map[activeViewName];
    if (activeBtn) {
      activeBtn.classList.add('active');
    }
  }

  updateDynamicStyles(metadata) {
    this.fileMetadata = metadata || {};

    // Helper: tolerate different metadata field names (we've had a few over time)
    const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);

    const codeSize =
      num(this.fileMetadata.codeSize) ||
      num(this.fileMetadata.code) ||
      num(this.fileMetadata.codeLength) ||
      num(this.fileMetadata.sourceSize) ||
      0;

    const docSize =
      num(this.fileMetadata.docSize) ||
      num(this.fileMetadata.docs) ||
      num(this.fileMetadata.docsSize) ||
      num(this.fileMetadata.documentationSize) ||
      0;

    // Re-enable the "classic" behavior:
    // - Code + Docs get dynamic heights
    // - Signature is NOT forced (it should fit naturally based on CSS)
    //
    // These defaults match the old look where Code was larger than Docs.
    const codeHeight = this._scaleValue(codeSize, 60, 2.0, 140);
    const docsHeight = this._scaleValue(docSize, 60, 2.0, 140);

    if (this.codeBtn) this.codeBtn.style.height = `${codeHeight}px`;
    if (this.docsBtn) this.docsBtn.style.height = `${docsHeight}px`;

    // CRITICAL: Signature should not be constrained by inline height.
    // This matches your "good html" where Signature had no style="height: ..."
    if (this.signatureBtn) this.signatureBtn.style.height = '';

    this.updateButtonVisibility();
  }

  _scaleValue(value, minLength = 60, factor = 2.0, maxLength = 250) {
    // UPDATED: Increased minLength and factor to make buttons larger and more responsive to size.
    if (value <= 0) return minLength;
    const scaled = minLength + Math.sqrt(value) * factor;
    return Math.min(scaled, maxLength);
  }

  destroyGlowBoxes() {
      // OBSOLETE: GlowBox button highlighting is obsolete and has been fully decommissioned.
      // This remains as a safe cleanup method. Glowing tooltips remain supported and are separate.
      this.buttonGlowBox = null;
      this.isWidgetGlowVisible = false;
    }

  getWidgetSegmentElement(treeNode, segmentName) {
    if (!treeNode || !treeNode.visibilityWidget) return null;
    return treeNode.visibilityWidget.getSegmentElement(segmentName);
  }

  handleWidgetVisibilityChange(isVisible) {
    if (isVisible) {
      this.setActiveView(this.activeView, true);
    } else {
      if (this.app.treeViewGlowBox) {
        const targetPath =
          this.app.treeViewGlowBox.targetElement?.closest('[data-widget-path]')
            ?.dataset.widgetPath;
        if (targetPath === this.controller.filePath) {
          this.app.treeViewGlowBox.hide();
        }
      }
    }
  }

  updateAllGlowBoxPositions() {}

  _isWidgetVisible(element, treeNode) {
    if (!element || !element.isConnected || !treeNode || !treeNode.domElement) {
      return false;
    }

    // Check 1: Ancestor collapsed state
    let parent = treeNode.parentNode;
    while (parent) {
      if (parent.type === 'directory' && !parent.isExpanded) {
        return false;
      }
      parent = parent.parentNode;
    }

    // Check 2: Animation-related opacity
    const nodeStyle = window.getComputedStyle(treeNode.domElement);
    if (parseFloat(nodeStyle.opacity) < 0.1) {
      return false;
    }

    // Check 3: CSS display property of the target element itself.
    const elementStyle = window.getComputedStyle(element);
    if (elementStyle.display === 'none') {
      return false;
    }

    // Check 4: Scroll visibility within the tree container
    const treeContainer = this.app.projectFilesManager?.treeContainer;
    if (!treeContainer) {
      return false;
    }
    const containerRect = treeContainer.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    const isVisibleInScroll =
      elementRect.bottom > containerRect.top &&
      elementRect.top < containerRect.bottom &&
      elementRect.right > containerRect.left &&
      elementRect.left < containerRect.right;

    return isVisibleInScroll;
  }

  updateWidgetGlowBoxState() {
    return false;
  }

  _bindWidgetGlowBoxUpdater() {
    this._boundUpdateWidgetGlowBoxState = null;
    this._visibilityManagerSubscriptionActive = false;
    return false;
  }

  _applyStyles() {
    // IMPORTANT:
    // The "classic" editor mode sidebar/button look is owned by AppStyles._getEditorViewStyles().
    // This file should NOT override .editor-mode-sidebar / .editor-mode-btn at all.
    // We remove our old injected tag to undo previous overrides, then re-add only layout/diff CSS.

    const styleId = 'EditorViewManager-Styles';
    const old = document.getElementById(styleId);
    if (old) old.remove();

    const css = `
        .diff-view-container { display: flex; flex-direction: column; height: 100%; background-color: var(--bg-primary); }
        .diff-toolbar { flex-shrink: 0; padding: 8px 12px; background-color: var(--bg-tertiary); border-bottom: 1px solid var(--border-color); display: flex; justify-content: flex-end; gap: 10px; }
        .diff-toolbar button { padding: 6px 14px; font-size: 0.9em; border-radius: 5px; cursor: pointer; border: 1px solid #555; color: var(--text-primary); }
        .diff-toolbar .revert-btn { background-color: #c62828; }
        .diff-toolbar .accept-btn { background-color: #2e7d32; }
        .diff-editor-host { flex-grow: 1; position: relative; overflow: hidden; }
        .diff-editor-host .cm-editor { height: 100%; }
        .editor-area-wrapper.diff-active .editor-mode-sidebar { display: none; }
        .navigator-item.import-item { cursor: pointer; transition: background-color 0.2s ease; }
        .navigator-item.import-item:hover { background-color: var(--bg-hover, #383842); }

        /* Two-column layout for structured view */
        .navigator-columns {
            display: flex;
            gap: 20px;
            margin-top: 15px;
        }
        .navigator-columns .navigator-section {
            flex: 1;
            min-width: 0;
        }
    `;

    const styleElement = makeElement('style', {
      id: styleId,
      textContent: css,
    });
    document.head.appendChild(styleElement);
  }

  async renderDiffView(originalCode, currentCode, onRevert, onAcceptAll) {
      console.log('[EditorViewManager Debug] renderDiffView() invoked.', {
        originalCodeLength: originalCode ? originalCode.length : 0,
        currentCodeLength: currentCode ? currentCode.length : 0
      });

      this.diffToolbar.innerHTML = '';
      this.diffEditorHost.innerHTML = '';

      // 1. Resolve merge view function (demand-fetch if not already cached)
      let mergeViewFn = globalThis.unifiedMergeView || window.unifiedMergeView;
      
      if (typeof mergeViewFn !== 'function') {
        console.log('[EditorViewManager Debug] unifiedMergeView is not loaded. Importing lazily from esm.sh...');
        try {
          const merge = await import("https://esm.sh/@codemirror/merge@6.6.1?external=@codemirror/state,@codemirror/view");
          mergeViewFn = merge.unifiedMergeView;
          globalThis.unifiedMergeView = mergeViewFn;
          window.unifiedMergeView = mergeViewFn;
          console.log('[EditorViewManager Debug] Merge package loaded successfully and cached.');
        } catch (error) {
          console.error('[EditorViewManager Debug] Failed to import @codemirror/merge:', error);
          alert('Could not download or load the diff comparison package from the network.');
          return;
        }
      }

      const revertBtn = makeElement('button', {
        className: 'revert-btn',
        textContent: 'Revert All',
      });
      revertBtn.onclick = onRevert;

      const acceptBtn = makeElement('button', {
        className: 'accept-btn',
        textContent: 'Accept & Return',
      });
      acceptBtn.onclick = onAcceptAll;

      this.diffToolbar.append(revertBtn, acceptBtn);
      console.log('[EditorViewManager Debug] Diff toolbar populated.');

      console.log('[EditorViewManager Debug] Constructing Diff Editor View with self-contained extensions...');
      try {
        // Retrieve the authoritative loaded modules directly from CodeMirrorWidget to prevent global variable undefined errors
        const m = CodeMirrorWidget._modules;
        
        if (!m) {
          throw new Error('CodeMirrorWidget._modules is not initialized. Core packages are missing.');
        }

        const EditorViewClass = m.EditorView || globalThis.EditorView || window.EditorView;
        const EditorStateClass = m.EditorState || globalThis.EditorState || window.EditorState;
        
        const lineNumbersFn = m.lineNumbers || globalThis.lineNumbers || window.lineNumbers;
        const historyFn = m.history || globalThis.cmHistory || window.cmHistory;
        const oneDarkTheme = m.oneDark || globalThis.oneDark || window.oneDark;
        const javascriptFn = m.javascript || globalThis.javascript || window.javascript;

        console.log('[EditorViewManager Debug] Self-contained module resolution:', {
          EditorViewClass: typeof EditorViewClass,
          EditorStateClass: typeof EditorStateClass,
          lineNumbersFn: typeof lineNumbersFn,
          historyFn: typeof historyFn,
          oneDarkTheme: typeof oneDarkTheme,
          javascriptFn: typeof javascriptFn,
          mergeViewFn: typeof mergeViewFn
        });

        if (!EditorViewClass || !EditorStateClass || !mergeViewFn) {
          throw new Error('Core CodeMirror classes or merge functions are missing from both CodeMirrorWidget registry and global scope.');
        }

        const extensions = [
          lineNumbersFn ? lineNumbersFn() : [],
          historyFn ? historyFn() : [],
          oneDarkTheme,
          EditorViewClass.lineWrapping,
          EditorStateClass.readOnly.of(true),
          javascriptFn ? javascriptFn() : [],
          mergeViewFn({ original: originalCode }),
        ].flat().filter(Boolean);

        new EditorViewClass({
          state: EditorStateClass.create({
            doc: currentCode,
            extensions,
          }),
          parent: this.diffEditorHost,
        });
        console.log('[EditorViewManager Debug] Diff EditorView successfully instantiated.');
      } catch (viewError) {
        console.error('[EditorViewManager Debug] Failed to construct Diff EditorView:', viewError);
        throw viewError;
      }

      console.log('[EditorViewManager Debug] Setting active view to "diff"...');
      this.setActiveView('diff');
      console.log('[EditorViewManager Debug] renderDiffView() completed.');
    }

  showStandardView() {
    this.setActiveView('code'); // FIX: Was 'standard'
    if (this.diffEditorHost) {
      this.diffEditorHost.innerHTML = '';
    }
  }

  updateButtonVisibility() {
        if (this.signatureBtn) {
          this.signatureBtn.style.display = this.controller.isStructuredJs
            ? ''
            : 'none';
        }

        const filePath = String(this.controller.filePath || '');
        const isSourceLike =
          /\.(js|mjs|cjs|ts|tsx|jsx|html?|css|json|md|txt|yaml|yml)$/i.test(
            filePath
          );

        if (this.docsBtn) {
          this.docsBtn.style.display = isSourceLike ? '' : 'none';

          const hasDocsNow =
            this.controller.hasDocs ||
            (this.fileMetadata && this.fileMetadata.docSize > 0);

          this.docsBtn.classList.toggle('has-docs', !!hasDocsNow);
          this.docsBtn.classList.toggle('can-create-docs', isSourceLike && !hasDocsNow);
          this.docsBtn.title = hasDocsNow
            ? 'Open documentation sidecar'
            : 'Create/open documentation sidecar';
        }

        const hasDocsCapability = isSourceLike;

        if (
          (this.activeView === 'structured' && !this.controller.isStructuredJs) ||
          (this.activeView === 'docs' && !hasDocsCapability)
        ) {
          this.setActiveView('code');
        }
      }

  _buildImportList(imports, mainEditorView) {
    const importList = makeElement('ul', { className: 'navigator-list' });
    if (imports.length > 0) {
      imports.forEach((imp) => {
        const removeBtn = makeElement('button', {
          className: 'remove-btn',
          textContent: '×',
          title: `Remove import '${imp.symbol}'`,
          onclick: (e) => {
            e.stopPropagation();
            const newImports = imports.filter((i) => i.symbol !== imp.symbol);
            this.controller.applyImportUpdate(newImports);
          },
        });
        const li = makeElement(
          'li',
          {
            className: 'navigator-item import-item',
            title: `Click to open ${imp.source}`,
            onclick: (e) => {
              if (removeBtn.contains(e.target)) return;
              // Logic to open the imported file remains the same
              this.app.tabOrchestrator.openFileByImport(
                imp,
                this.controller.filePath
              );
            },
          },
          [
            makeElement('span', { className: 'item-main' }, [
              makeElement('strong', {}, imp.symbol),
              makeElement(
                'span',
                { className: 'item-meta' },
                ` from '${imp.source}'`
              ),
            ]),
            removeBtn,
          ]
        );
        importList.appendChild(li);
      });
    }

    const addImportFormContainer = makeElement('li', {
      className: 'navigator-item add-import-form',
    });
    const symbolInput = makeElement('input', {
      type: 'text',
      placeholder: 'Add symbol...',
      autocomplete: 'off',
    });
    const addButton = makeElement('button', { textContent: 'Add' });

    // Logic for autocomplete and adding imports remains the same.
    let suggestionsContainer = null;
    const addSelectedImport = (symbolName) => {
      const finalSymbol = (symbolName || symbolInput.value).trim();
      if (!finalSymbol || imports.some((i) => i.symbol === finalSymbol)) return;
      const sourceDir = this.app.symbolMap.get(finalSymbol);
      if (sourceDir !== undefined) {
        const newImports = [...imports, { symbol: finalSymbol, sourceDir }];
        this.controller.applyImportUpdate(newImports);
      } else {
        this.app.uiManager.setStatus(
          `Symbol '${finalSymbol}' not found in project map.`,
          true
        );
      }
    };
    symbolInput.addEventListener('input', () => {
      const query = symbolInput.value.toLowerCase();
      if (suggestionsContainer) {
        suggestionsContainer.remove();
        suggestionsContainer = null;
      }
      if (!query) return;
      const filtered = Array.from(this.app.symbolMap.keys())
        .filter(
          (s) =>
            s.toLowerCase().includes(query) &&
            !imports.some((i) => i.symbol === s)
        )
        .slice(0, 5);
      if (filtered.length > 0) {
        suggestionsContainer = makeElement('ul', {
          className: 'autocomplete-suggestions',
        });
        filtered.forEach((symbol) => {
          const li = makeElement('li', {
            textContent: symbol,
            onclick: () => {
              symbolInput.value = symbol;
              addSelectedImport(symbol);
            },
          });
          suggestionsContainer.appendChild(li);
        });
        addImportFormContainer.appendChild(suggestionsContainer);
      }
    });
    addButton.onclick = () => addSelectedImport();
    addImportFormContainer.append(symbolInput, addButton);
    importList.appendChild(addImportFormContainer);

    return importList;
  }

  _clearStructuredRetry() {
    if (this._structuredRetryTimer) {
      clearTimeout(this._structuredRetryTimer);
      this._structuredRetryTimer = null;
    }
    this._structuredRetryCount = 0;
  }

  _scheduleStructuredRetry() {
    // Avoid runaway loops
    if (this._structuredRetryTimer) return;
    if (this._structuredRetryCount > 25) return; // ~25 * 40ms = ~1s max

    this._structuredRetryCount++;

    this._structuredRetryTimer = setTimeout(() => {
      this._structuredRetryTimer = null;

      // Only retry if we're still on structured view and still mounted
      if (this.activeView !== 'structured') return;
      if (!this.controller?.contentPanel?.isConnected) return;

      this.renderStructuredView();
    }, 40);
  }

  _getMainEditorView() {
      const mainWidget = this.controller?.codeMirrorWidgets?.get(
        this.controller?.segmentOrder?.[0]
      );
      return mainWidget?.editor || null;
    }

  _getCodeForParsing() {
    const ev = this._getMainEditorView();
    if (ev?.state?.doc) return ev.state.doc.toString();

    // Fallbacks (only if editor isn't available for some reason)
    try {
      if (typeof this.controller?.getCode === 'function') {
        const c = this.controller.getCode();
        if (typeof c === 'string') return c;
      }
    } catch (e) {}

    return '';
  }

    triggerSearch(prefill = null) {
      console.log('[EditorViewManager Debug] triggerSearch invoked with prefill:', prefill);

      const view = this._getMainEditorView();
      console.log('[EditorViewManager Debug] Active EditorView instance found:', view);

      if (!view) {
        console.warn('[EditorViewManager Debug] Failed to find active EditorView instance!');
        return false;
      }

      // Try multiple resolution paths
      const openFn = globalThis.openSearchPanel || window.openSearchPanel || window.CodeMirrorGlobals?.openSearchPanel;
      console.log('[EditorViewManager Debug] Resolved openSearchPanel function:', openFn);

      if (typeof openFn === 'function') {
        try {
          console.log('[EditorViewManager Debug] Calling openSearchPanel(view)...');
          openFn(view);
          console.log('[EditorViewManager Debug] openSearchPanel(view) executed successfully.');
        } catch (callError) {
          console.error('[EditorViewManager Debug] Execution error during openSearchPanel(view):', callError);
        }
      } else {
        console.warn('[EditorViewManager Debug] openSearchPanel is not a function. Current type is:', typeof openFn);
        return false;
      }

      requestAnimationFrame(() => {
        const searchInput = this.editorContainer.querySelector('.cm-search input');
        console.log('[EditorViewManager Debug] Attempted to find .cm-search input element:', searchInput);
        if (searchInput) {
          if (prefill) {
            searchInput.value = prefill;
            searchInput.select();
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          }
          searchInput.focus();
        }
      });

      return true;
    }

  closeSearch() {
      const view = this._getMainEditorView();
      if (view) {
        const closeFn = globalThis.closeSearchPanel || window.closeSearchPanel || window.CodeMirrorGlobals?.closeSearchPanel;
        if (typeof closeFn === 'function') {
          closeFn(view);
        }
        view.focus(); // Return focus to code
      }
    }

  isSearchPanelFocused() {
    // Check if focus is currently inside the CM search panel within this editor
    if (!this.editorContainer) return false;
    const active = document.activeElement;
    return (
      active &&
      this.editorContainer.contains(active) &&
      active.closest('.cm-search')
    );
  }

  async saveDocsFromEditor() {
    if (!this.controller?.documentationManager) return false;

    const sourcePath = this.controller.filePath;
    let markdown = this.controller.docContent || '';

    if (this.docEditorInstance?.state?.doc) {
      markdown = this.docEditorInstance.state.doc.toString();
    }

    const ok = await this.controller.documentationManager.replaceDocContent(sourcePath, markdown);
    if (ok) {
      this.controller.docContent = markdown;
      this.controller.hasDocs = markdown.trim().length > 0;
      this.controller.isDocDirty = false;
      this.renderedDocView.innerHTML = window.marked.parse(markdown || '<em>Documentation file is empty.</em>');
      this.controller.app?.projectFilesManager?.setNodeDocStatus?.(sourcePath, this.controller.hasDocs);
    }

    return !!ok;
  }

    

  _getDocsRenderTarget() {
    if (this.renderedDocView) {
      return this.renderedDocView;
    }

    if (this.docViewContent) {
      return this.docViewContent;
    }

    if (this.renderedMarkdownContainer) {
      return this.renderedMarkdownContainer;
    }

    return null;
  }

  _renderMarkdownIntoElement(element, markdownText) {
    const markdown = String(markdownText || '');

    if (typeof marked !== 'undefined' && marked.parse) {
      element.innerHTML = marked.parse(markdown);
      return;
    }

    if (window.marked && typeof window.marked.parse === 'function') {
      element.innerHTML = window.marked.parse(markdown);
      return;
    }

    element.innerHTML =
      '<pre style="white-space: pre-wrap; font-family: system-ui, sans-serif;">' +
      this._escapeHtml(markdown) +
      '</pre>';
  }

  _escapeHtml(value) {
    return String(value ?? '')
      .split('&').join('&amp;')
      .split('<').join('&lt;')
      .split('>').join('&gt;')
      .split('"').join('&quot;')
      .split("'").join('&#39;');
  }

  _extractContentFromFetchResult(value) {
    if (typeof value === 'string') {
      return value;
    }

    if (value && typeof value.content === 'string') {
      return value.content;
    }

    if (value && typeof value.code === 'string') {
      return value.code;
    }

    return '';
  }


  static _doc_overview() {
      return "### EditorViewManager\n\nManages the code editing, signature (structured), and documentation rendering panes within each editor tab.";
    }

  static _doc_views() {
      return [
        "## Multi-Layer Visualization",
        "",
        "- **Signature (Structured) View**: Generates an interactive listing of class Exports, Dependencies (imports), and Methods (including line counts) by traversing the active AST. Clicking a method automatically switches to Code view and scrolls to the selected line.",
        "- **Documentation View**: Resolves the documentation path and renders the markdown file live via marked.js, providing an inline toggle to edit the raw markdown text inside a separate CodeMirror instance.",
        "- **Diff View**: Invokes CodeMirror's `unifiedMergeView` to compare original and proposed source codes side-by-side, allowing users to revert or accept surgical updates visually."
      ].join('\n');
    }

  static _doc() {
      return [
        this._doc_overview(),
        this._doc_views()
      ].join('\n\n');
    }

  static getMarkdown() {
      return this._doc();
    }
}

