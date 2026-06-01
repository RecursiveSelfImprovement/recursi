class UndoTimelineDialog {
  constructor(app) {
      this.app = app;
      this.records = [];
      this.cards = [];
      this.selectedCardIndex = -1;
      this.selectedItemKey = null;
      this.show();
    }

  async show() {
      if (!this.app.historyManager) {
         this.app.uiManager?.setStatus('History Manager not available.', true);
         return;
      }

      this.records = await this.app.historyManager.getAllRecords();
      this.groupRecordsIntoCards();
      this.render();
    }

  groupRecordsIntoCards() {
      this.cards = [];
      if (this.records.length === 0) return;

      const chronological = [...this.records].sort((a, b) => a.timestamp - b.timestamp);
      let currentCard = null;

      for (const r of chronological) {
        if (!currentCard) {
          currentCard = {
            id: r.id,
            timestamp: r.timestamp,
            endTime: r.timestamp,
            records: [r]
          };
          this.cards.push(currentCard);
        } else {
          const lastRecord = currentCard.records[currentCard.records.length - 1];
          if (Math.abs(r.timestamp - lastRecord.timestamp) <= 15000) {
            currentCard.records.push(r);
            currentCard.endTime = r.timestamp;
          } else {
            currentCard = {
              id: r.id,
              timestamp: r.timestamp,
              endTime: r.timestamp,
              records: [r]
            };
            this.cards.push(currentCard);
          }
        }
      }

      this.cards.sort((a, b) => b.timestamp - a.timestamp);
    }

  computeLineDiff(oldStr, newStr) {
      return DiffHelper.computeLineDiff(oldStr, newStr);
    }

  renderUnifiedDiff(beforeText, afterText) {
      return DiffHelper.renderUnifiedDiff(beforeText, afterText);
    }

  render() {
      const UITools = window.UITools || globalThis.UITools;
      if (!UITools) return;

      if (!document.getElementById('undo-timeline-styles')) {
        const styles = document.createElement('style');
        styles.id = 'undo-timeline-styles';
        styles.textContent = `
          .undo-timeline-container { display: flex; gap: 16px; width: 100%; height: 460px; font-family: system-ui, sans-serif; box-sizing: border-box; }
          .undo-left-panel { flex: 1.1; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; padding-right: 4px; border-right: 1px solid rgba(255,255,255,0.08); }
          .undo-right-panel { flex: 1.2; display: flex; flex-direction: column; gap: 12px; overflow-y: auto; padding-left: 4px; }
          .undo-card { padding: 10px 12px; border-radius: 6px; cursor: pointer; border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.03); transition: all 0.15s ease; display: flex; gap: 12px; }
          .undo-card:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.1); }
          .undo-card.selected { background: rgba(59, 130, 246, 0.08); border-color: rgba(59, 130, 246, 0.3); box-shadow: 0 0 12px rgba(59, 130, 246, 0.05); }
          .undo-card-badge { flex: 0 0 auto; width: 24px; height: 24px; border-radius: 12px; background: #3b82f6; color: white; font-size: 11px; font-weight: bold; display: flex; align-items: center; justify-content: center; }
          .undo-card-content { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
          .undo-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
          .undo-card-title { font-size: 11px; font-weight: bold; color: #f8fafc; text-align: left; }
          .undo-card-time { font-size: 10px; color: #94a3b8; }
          .undo-card-details { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
          .undo-card-file { border: 1px solid rgba(255,255,255,0.05); border-radius: 4px; background: rgba(0, 0, 0, 0.15); overflow: hidden; }
          .undo-card-file-header { padding: 3px 6px; background: rgba(255,255,255,0.03); font-size: 10px; font-family: monospace; color: #38bdf8; word-break: break-all; text-align: left; }
          .undo-card-item { display: flex; justify-content: space-between; align-items: center; padding: 4px 6px; font-size: 10px; border-radius: 3px; cursor: pointer; transition: background 0.12s; }
          .undo-card-item:hover { background: rgba(255,255,255,0.06); }
          .undo-card-item.active { background: rgba(59, 130, 246, 0.25); color: #fff; }
          .undo-stats-pill { font-size: 9px; font-weight: bold; padding: 1px 4px; border-radius: 3px; margin-left: 6px; }
          .undo-stats-pill.add { background: rgba(16, 185, 129, 0.15); color: #34d399; }
          .undo-stats-pill.rem { background: rgba(239, 68, 68, 0.15); color: #f87171; }
          .undo-autoprune-bar { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #94a3b8; margin-top: 10px; }
        `;
        document.head.appendChild(styles);
      }

      this.leftPanel = document.createElement('div');
      this.leftPanel.className = 'undo-left-panel';

      this.rightPanel = document.createElement('div');
      this.rightPanel.className = 'undo-right-panel';

      const mainContainer = document.createElement('div');
      mainContainer.className = 'undo-timeline-container';
      mainContainer.appendChild(this.leftPanel);
      mainContainer.appendChild(this.rightPanel);

      this.renderLeftTimeline();
      this.renderRightSidecar();

      const topBar = document.createElement('div');
      topBar.style.display = 'flex';
      topBar.style.justifyContent = 'space-between';
      topBar.style.alignItems = 'center';
      topBar.style.marginBottom = '8px';

      const desc = document.createElement('div');
      desc.textContent = 'Changes within 15s are grouped. Operations on files not currently open are safely retained in the timeline.';
      desc.style.cssText = 'font-size: 12px; color: #94a3b8; text-align: left;';
      topBar.appendChild(desc);

      const rootContainer = document.createElement('div');
      rootContainer.style.display = 'flex';
      rootContainer.style.flexDirection = 'column';
      rootContainer.style.width = '100%';
      rootContainer.appendChild(topBar);
      rootContainer.appendChild(mainContainer);

      const autoPruneContainer = document.createElement('div');
      autoPruneContainer.className = 'undo-autoprune-bar';
      
      const pruneCheckbox = document.createElement('input');
      pruneCheckbox.type = 'checkbox';
      pruneCheckbox.id = 'undo-autoprune-checkbox';
      pruneCheckbox.checked = localStorage.getItem('vibes-history-autoprune') === 'true';
      pruneCheckbox.addEventListener('change', (e) => {
        const val = e.target.checked;
        localStorage.setItem('vibes-history-autoprune', val ? 'true' : 'false');
        if (val) {
          this.app.historyManager.pruneHistory(10800000).then(() => this.show());
        }
      });
      
      const pruneLabel = document.createElement('label');
      pruneLabel.htmlFor = 'undo-autoprune-checkbox';
      pruneLabel.textContent = 'Automatically prune history older than 3 hours';
      
      autoPruneContainer.appendChild(pruneCheckbox);
      autoPruneContainer.appendChild(pruneLabel);
      rootContainer.appendChild(autoPruneContainer);

      const hasRedo = !!(this.app.historyManager?.lastUndone?.records?.length);

      this.dialog = UITools.makeDialog({
        title: '⏳ Interactive Undo Timeline',
        content: rootContainer,
        width: '800px', 
        buttons: [
          { label: 'Cancel', onClick: () => this.dialog.close() },
          { 
            label: 'Clear History...', 
            className: 'danger',
            onClick: async (e, d) => {
              const clearContent = document.createElement('div');
              clearContent.style.cssText = 'padding: 10px; font-size: 13px; color: #cbd5e1; display: flex; flex-direction: column; gap: 8px;';
              clearContent.textContent = 'Select how much history you want to clear:';
              
              const clearDialog = UITools.makeDialog({
                title: '🧹 Clear History',
                content: clearContent,
                width: '320px',
                buttons: [
                  {
                    label: 'Older than 1 hr',
                    onClick: async () => {
                      const now = Date.now();
                      const records = await this.app.historyManager.getAllRecords();
                      const toDelete = records.filter(r => now - r.timestamp > 3600000).map(r => r.id);
                      if (toDelete.length > 0) await this.app.historyManager.deleteRecords(toDelete);
                      clearDialog.close();
                      this.show();
                    }
                  },
                  {
                    label: 'Older than 3 hrs',
                    onClick: async () => {
                      const now = Date.now();
                      const records = await this.app.historyManager.getAllRecords();
                      const toDelete = records.filter(r => now - r.timestamp > 10800000).map(r => r.id);
                      if (toDelete.length > 0) await this.app.historyManager.deleteRecords(toDelete);
                      clearDialog.close();
                      this.show();
                    }
                  },
                  {
                    label: 'Clear All',
                    className: 'danger',
                    onClick: async () => {
                      await this.app.historyManager.clearHistory();
                      clearDialog.close();
                      this.show();
                    }
                  },
                  { label: 'Cancel' }
                ]
              });
              return false; 
            }
          },
          {
            id: 'redo-last-undo-btn',
            label: 'Redo Last Undo',
            onClick: async (buttonEl, d) => {
              const success = await this.app.historyManager.redoLastUndone();
              if (success) {
                this.records = await this.app.historyManager.getAllRecords();
                this.groupRecordsIntoCards();
                this.selectedCardIndex = -1;
                this.selectedItemKey = null;
                this.renderLeftTimeline();
                this.renderRightSidecar();
                if (buttonEl) {
                  buttonEl.disabled = true;
                  buttonEl.style.opacity = '0.4';
                }
              }
              return false; 
            }
          },
          { 
            label: 'Undo Staged Changes', 
            className: 'primary', 
            onClick: async (e, d) => {
              if (this.selectedCardIndex === -1) {
                this.app.uiManager?.setStatus('No cards selected.', true);
                return false; 
              }
              await this.performUndo();
              d.close();
            }
          }
        ]
      });

      setTimeout(() => {
        const btn = this.dialog.element?.querySelector('#redo-last-undo-btn');
        if (btn) {
          btn.disabled = !hasRedo;
          btn.style.opacity = hasRedo ? '1' : '0.4';
        }
      }, 50);
    }

  renderLeftTimeline() {
      this.leftPanel.innerHTML = '';
      
      if (this.cards.length === 0) {
        this.leftPanel.innerHTML = '<div style="padding:20px; color:#64748b; text-align:center; font-style:italic; font-size:12px;">No grouped changes found.</div>';
        return;
      }

      this.cards.forEach((card, index) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'undo-card' + (this.selectedCardIndex === index ? ' selected' : '');
        
        const badge = document.createElement('div');
        badge.className = 'undo-card-badge';
        badge.textContent = `${this.cards.length - index}`;
        
        const content = document.createElement('div');
        content.className = 'undo-card-content';
        
        const header = document.createElement('div');
        header.className = 'undo-card-header';
        
        const title = document.createElement('div');
        title.className = 'undo-card-title';
        
        const affectedFiles = new Set(card.records.map(r => r.path.split('/').pop()));
        const methodsCount = card.records.filter(r => r.type === 'method').length;
        
        const fileText = this.formatGrammar(affectedFiles.size, 'file', 'files') + ' modified';
        const methodText = methodsCount > 0 ? ` (${this.formatGrammar(methodsCount, 'method patch', 'method patches')})` : '';
        title.textContent = fileText + methodText;
        
        const time = document.createElement('div');
        time.className = 'undo-card-time';
        const d = new Date(card.timestamp);
        time.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        header.appendChild(title);
        header.appendChild(time);
        content.appendChild(header);

        const filesGrouped = {};
        card.records.forEach((r) => {
          if (!filesGrouped[r.path]) {
            filesGrouped[r.path] = {
              path: r.path,
              fileRecords: [],
              classes: {}
            };
          }
          if (r.type === 'file') {
            filesGrouped[r.path].fileRecords.push(r);
          } else if (r.type === 'method') {
            if (!filesGrouped[r.path].classes[r.className]) {
              filesGrouped[r.path].classes[r.className] = [];
            }
            filesGrouped[r.path].classes[r.className].push(r);
          }
        });

        const detailsContainer = document.createElement('div');
        detailsContainer.className = 'undo-card-details';

        let firstRecordKey = null;

        Object.values(filesGrouped).forEach((fileGroup) => {
          const fileEl = document.createElement('div');
          fileEl.className = 'undo-card-file';
          
          const fileHeader = document.createElement('div');
          fileHeader.className = 'undo-card-file-header';
          fileHeader.textContent = fileGroup.path;
          fileEl.appendChild(fileHeader);
          
          fileGroup.fileRecords.forEach((r) => {
            const key = `file::${r.id}`;
            if (!firstRecordKey) firstRecordKey = key;
            
            const stats = this.computeLineDiff(r.oldContent, r.content);
            const isSel = this.selectedCardIndex === index && this.selectedItemKey === key;

            // Reusing shared DiffHelper component row
            const item = DiffHelper.renderRow({
              labelText: `[Whole File ${r.action.toUpperCase()}]`,
              removed: stats.removed,
              added: stats.added,
              isActive: isSel,
              onClick: (e) => {
                e.stopPropagation();
                this.selectedCardIndex = index;
                this.selectedItemKey = key;
                this.renderLeftTimeline();
                this.renderRightSidecar();
              }
            });
            
            fileEl.appendChild(item);
          });
          
          Object.entries(fileGroup.classes).forEach(([className, methods]) => {
            const classEl = document.createElement('div');
            classEl.className = 'undo-hierarchy-class';
            classEl.style.padding = '2px 6px';
            
            const classTitle = document.createElement('div');
            classTitle.className = 'undo-hierarchy-class-title';
            classTitle.style.fontSize = '10px';
            classTitle.textContent = `Class ${className}`;
            classEl.appendChild(classTitle);
            
            methods.forEach((r) => {
              const key = `method::${r.id}`;
              if (!firstRecordKey) firstRecordKey = key;
              
              const stats = this.computeLineDiff(r.oldContent, r.content);
              const isSel = this.selectedCardIndex === index && this.selectedItemKey === key;

              // Reusing shared DiffHelper component row
              const item = DiffHelper.renderRow({
                labelText: `.${r.methodName} [${r.action.toUpperCase()}]`,
                removed: stats.removed,
                added: stats.added,
                isActive: isSel,
                onClick: (e) => {
                  e.stopPropagation();
                  this.selectedCardIndex = index;
                  this.selectedItemKey = key;
                  this.renderLeftTimeline();
                  this.renderRightSidecar();
                }
              });
              
              classEl.appendChild(item);
            });
            
            fileEl.appendChild(classEl);
          });
          
          detailsContainer.appendChild(fileEl);
        });

        content.appendChild(detailsContainer);
        cardEl.appendChild(badge);
        cardEl.appendChild(content);
        
        cardEl.onclick = () => {
          this.selectedCardIndex = index;
          this.selectedItemKey = firstRecordKey; 
          this.renderLeftTimeline();
          this.renderRightSidecar();
        };
        
        this.leftPanel.appendChild(cardEl);
      });
    }

  renderRightSidecar() {
      this.rightPanel.innerHTML = '';
      
      if (this.selectedCardIndex === -1 || !this.cards[this.selectedCardIndex]) {
        this.rightPanel.innerHTML = `
          <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #64748b; font-style: italic; font-size: 13px; text-align: center; border: 1px dashed rgba(255,255,255,0.06); border-radius: 6px; background: rgba(0,0,0,0.1); padding: 20px;">
            <span>Select a change card on the left to view the interactive diff.</span>
          </div>
        `;
        return;
      }

      const card = this.cards[this.selectedCardIndex];
      
      const filesGrouped = [];
      let firstRecordToSelect = null;
      let selectedRecord = null;

      card.records.forEach((r) => {
        let key;
        if (r.type === 'file') {
          key = `file::${r.id}`;
        } else if (r.type === 'method') {
          key = `method::${r.id}`;
        }

        if (!firstRecordToSelect) {
          firstRecordToSelect = { key, record: r };
        }

        if (this.selectedItemKey === key) {
          selectedRecord = r;
        }
      });

      if (!selectedRecord && firstRecordToSelect) {
        this.selectedItemKey = firstRecordToSelect.key;
        selectedRecord = firstRecordToSelect.record;
      }

      const diffTitle = document.createElement('div');
      diffTitle.style.cssText = 'font-weight: bold; font-size: 12px; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px; text-align: left;';
      
      if (selectedRecord) {
        const recordName = selectedRecord.type === 'file' ? selectedRecord.path.split('/').pop() : `${selectedRecord.className}.${selectedRecord.methodName}`;
        diffTitle.textContent = `Interactive Diff Preview: ${recordName}`;
        this.rightPanel.appendChild(diffTitle);

        const diffContainer = this.renderUnifiedDiff(selectedRecord.oldContent, selectedRecord.content);
        this.rightPanel.appendChild(diffContainer);
      } else {
        diffTitle.textContent = 'Interactive Diff Preview';
        this.rightPanel.appendChild(diffTitle);

        const emptyDiff = document.createElement('div');
        emptyDiff.style.cssText = 'flex: 1; min-height: 200px; display: flex; justify-content: center; align-items: center; border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; font-style: italic; color: #64748b; font-size: 12px; background: rgba(0,0,0,0.1);';
        emptyDiff.textContent = 'No modifications found in this card.';
        this.rightPanel.appendChild(emptyDiff);
      }
    }

  async performUndo() {
        if (this.selectedCardIndex === -1) return;
        
        const cardIndex = this.selectedCardIndex;
        const recordsToUndo = [];
        
        for (let c = 0; c <= cardIndex; c++) {
          const cardRecords = [...this.cards[c].records].reverse();
          recordsToUndo.push(...cardRecords);
        }
        
        this.app.historyManager.saveLastUndone(recordsToUndo);
        
        const idsToDelete = [];

        this.app.uiManager?.setStatus(`Undoing ${recordsToUndo.length} actions...`, false);
        
        const CJCP = window.ClientJSClassPatcher || globalThis.ClientJSClassPatcher;

        for (const record of recordsToUndo) {
          const isFileOpen = this.app.editorControllers.has(record.path);
          if (!isFileOpen) {
            continue; 
          }

          if (record.type === 'file') {
            if (record.action === 'create') {
              await this.app.vfs.deleteFile(record.path, { skipHistory: true });
            } else if (record.action === 'update') {
              const content = record.oldContent || '';
              await this.app.vfs.writeFile(record.path, content, { skipHistory: true });
            } else if (record.action === 'delete') {
              const content = record.content || '';
              await this.app.vfs.writeFile(record.path, content, { skipHistory: true });
            }
          } else if (record.type === 'method') {
            let currentContent = '';
            const activeCtrl = this.app.editorControllers.get(record.path);
            if (activeCtrl) {
                currentContent = activeCtrl.getCode();
            } else if (this.app.inMemoryFileStore?.has(record.path)) {
                currentContent = this.app.inMemoryFileStore.get(record.path);
            } else if (this.app.vfs) {
                currentContent = await this.app.vfs.readFile(record.path, { noStaticFetch: true, noIdbPatch: true }) || '';
            }

            const writePromises = [];
            const mockEnv = {
              appRef: this.app,
              readFile: (p) => p === record.path ? currentContent : '',
              writeFile: (p, c) => {
                 if (this.app.vfs) writePromises.push(this.app.vfs.writeFile(p, c, { skipHistory: true }));
                 else if (this.app.inMemoryFileStore) this.app.inMemoryFileStore.set(p, c);
              },
              log: () => {}
            };

            if (record.action === 'create') {
              if (CJCP) {
                 CJCP.deleteMethod(mockEnv, {
                    targetFile: record.path,
                    targetClass: record.className,
                    methodName: record.methodName,
                    managed: false,
                    skipManagedWritePipeline: true
                 });
              }
            } else if (record.action === 'update') {
              if (CJCP) {
                 mockEnv.executingCode = `class Dummy {\n${record.oldContent || ''}\n}`;
                 CJCP.transplant(mockEnv, {
                    method: record.methodName,
                    targetFile: record.path,
                    targetClass: record.className,
                    managed: false,
                    skipManagedWritePipeline: true
                 });
              }
            } else if (record.action === 'delete') {
              if (CJCP) {
                 mockEnv.executingCode = `class Dummy {\n${record.content || ''}\n}`;
                 CJCP.transplant(mockEnv, {
                    method: record.methodName,
                    targetFile: record.path,
                    targetClass: record.className,
                    methodName: record.methodName,
                    managed: false,
                    skipManagedWritePipeline: true
                 });
              }
            }
            
            await Promise.all(writePromises);
          }
          
          const ctrl = this.app.editorControllers.get(record.path);
          if (ctrl) {
             let newCode = '';
             if (this.app.vfs) {
                newCode = await this.app.vfs.readFile(record.path, { noStaticFetch: true, noIdbPatch: true }) || '';
             } else if (this.app.inMemoryFileStore) {
                newCode = this.app.inMemoryFileStore.get(record.path) || '';
             }
             await ctrl.updateCodeAndMetadata(newCode);
             ctrl.markClean();
          }

          idsToDelete.push(record.id);
        }

        if (idsToDelete.length > 0) {
          await this.app.historyManager.deleteRecords(idsToDelete);
        }
        
        const finalUndone = idsToDelete.length;
        const skippedCount = recordsToUndo.length - finalUndone;
        
        if (skippedCount > 0) {
          this.app.uiManager?.setStatus(`Successfully undid ${finalUndone} actions. Skipped ${skippedCount} actions because their target files were not open.`, false, 6000);
        } else {
          this.app.uiManager?.setStatus(`Successfully undid ${finalUndone} actions.`, false, 4000);
        }
      }

  _trimForTooltip(str, maxLines = 8, maxChars = 220) {
        if (!str) return '(none)';
        const lines = String(str).split('\n');
        let trimmed = lines.slice(0, maxLines).join('\n');
        if (lines.length > maxLines) {
          trimmed += `\n... (+${lines.length - maxLines} lines)`;
        }
        if (trimmed.length > maxChars) {
          trimmed = trimmed.substring(0, maxChars) + '...';
        }
        return trimmed;
      }

  formatGrammar(count, singular, plural) {
      return `${count} ${count === 1 ? singular : plural}`;
    }
}