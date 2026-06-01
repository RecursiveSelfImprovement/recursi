class HistoryManager {

  constructor(app) {
      this.app = app;
      this.dbName = 'vibes-history-store';
      this.version = 1;
      this.db = null;
      this.lastUndone = null; // Single-use Redo buffer
      this.init();
    }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('history')) {
          const store = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async _addRecord(record) {
    if (!this.db) await this.init();

    const autoPrune = localStorage.getItem('vibes-history-autoprune') === 'true';
    if (autoPrune) {
      this.pruneHistory(10800000).catch(err => console.warn('[HistoryManager] auto-prune failed:', err));
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('history', 'readwrite');
      tx.objectStore('history').add(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async pruneHistory(maxAgeMs) {
    if (!this.db) await this.init();
    const records = await this.getAllRecords();
    const now = Date.now();
    const toDelete = [];
    for (const r of records) {
      if (now - r.timestamp > maxAgeMs) {
        toDelete.push(r.id);
      }
    }
    if (toDelete.length > 0) {
      await this.deleteRecords(toDelete);
      console.log(`[HistoryManager] 🧹 Automatically pruned ${toDelete.length} legacy history records.`);
    }
  }

  async recordMethodChange(options) {
    const { path, className, methodName, content, oldContent, action } = options;
    console.log(`[HistoryManager] 💾 Logging METHOD change: ${className}.${methodName} (${action})`);
    
    await this._addRecord({
      timestamp: Date.now(),
      type: 'method',
      path, 
      className, 
      methodName, 
      content, 
      oldContent,
      action
    });
  }

  async recordFileChange(options) {
      const { path, content, oldContent, action, additions, replacements, deletions } = options;
      console.log(`[HistoryManager] 💾 Logging FILE change: ${path} (${action})`);

      let recordedAnyMethod = false;

      if ((additions && additions.length) || (replacements && replacements.length) || (deletions && deletions.length)) {
        try {
          const CJCP = window.ClientJSClassPatcher || globalThis.ClientJSClassPatcher;
          const className = path.split('/').pop().replace('.js', '');

          for (const m of additions || []) {
            await this.recordMethodChange({
              path,
              className: m.className || className,
              methodName: m.name,
              content: m.code || '',
              oldContent: null,
              action: 'create'
            });
            recordedAnyMethod = true;
          }

          for (const m of replacements || []) {
            let oldCode = m._oldCode || null;
            if (!oldCode && CJCP && oldContent) {
              oldCode = CJCP._findMethodInSource(oldContent, m.name, { className: m.className || className, includeComments: true })?.source || null;
            }
            await this.recordMethodChange({
              path,
              className: m.className || className,
              methodName: m.name,
              content: m.code || '',
              oldContent: oldCode,
              action: 'update'
            });
            recordedAnyMethod = true;
          }

          for (const mName of deletions || []) {
            let oldCode = null;
            let cleanMethodName = mName;
            let cleanClassName = className;
            if (mName.includes('.')) {
              const parts = mName.split('.');
              cleanClassName = parts[0];
              cleanMethodName = parts[1];
            }
            if (CJCP && oldContent) {
              oldCode = CJCP._findMethodInSource(oldContent, cleanMethodName, { className: cleanClassName, includeComments: true })?.source || null;
            }
            await this.recordMethodChange({
              path,
              className: cleanClassName,
              methodName: cleanMethodName,
              content: '',
              oldContent: oldCode,
              action: 'delete'
            });
            recordedAnyMethod = true;
          }
        } catch (err) {
          console.warn('[HistoryManager] Failed to record pre-calculated methods:', err);
        }
      }

      if (!recordedAnyMethod) {
         const acorn = (typeof window !== 'undefined' && window.acorn) || this.app?.codeParser?.acorn;
         const CJCP = window.ClientJSClassPatcher || globalThis.ClientJSClassPatcher;

         if (acorn && CJCP && path.endsWith('.js') && oldContent && content && action === 'update') {
           try {
             const beforeClasses = CJCP._listAllClasses(oldContent);
             const afterClasses = CJCP._listAllClasses(content);
             const allClasses = [...new Set([...beforeClasses, ...afterClasses])];
             
             for (const cls of allClasses) {
               const bMethods = new Set(CJCP._listClassMethods(oldContent, cls) || []);
               const aMethods = new Set(CJCP._listClassMethods(content, cls) || []);
               
               const added = [...aMethods].filter(m => !bMethods.has(m));
               const removed = [...bMethods].filter(m => !aMethods.has(m));
               const replaced = [];

               for (const m of [...aMethods]) {
                 if (!bMethods.has(m)) continue;
                 const bSrc = CJCP._findMethodInSource(oldContent, m, { className: cls, includeComments: true })?.source;
                 const aSrc = CJCP._findMethodInSource(content, m, { className: cls, includeComments: true })?.source;
                 if (bSrc !== aSrc) {
                   replaced.push(m);
                 }
               }

               for (const m of added) {
                 const src = CJCP._findMethodInSource(content, m, { className: cls, includeComments: true })?.source;
                 await this.recordMethodChange({
                   path,
                   className: cls,
                   methodName: m,
                   content: src || '',
                   oldContent: null,
                   action: 'create'
                 });
                 recordedAnyMethod = true;
               }

               for (const m of replaced) {
                 const bSrc = CJCP._findMethodInSource(oldContent, m, { className: cls, includeComments: true })?.source;
                 const aSrc = CJCP._findMethodInSource(content, m, { className: cls, includeComments: true })?.source;
                 await this.recordMethodChange({
                   path,
                   className: cls,
                   methodName: m,
                   content: aSrc || '',
                   oldContent: bSrc || null,
                   action: 'update'
                 });
                 recordedAnyMethod = true;
               }

               for (const m of removed) {
                 const bSrc = CJCP._findMethodInSource(oldContent, m, { className: cls, includeComments: true })?.source;
                 await this.recordMethodChange({
                   path,
                   className: cls,
                   methodName: m,
                   content: '',
                   oldContent: bSrc || null,
                   action: 'delete'
                 });
                 recordedAnyMethod = true;
               }
             }
           } catch (err) {
             console.warn('[HistoryManager] Fallback AST diff failed:', err);
           }
         }
      }
      
      if (!recordedAnyMethod) {
        await this._addRecord({
          timestamp: Date.now(),
          type: 'file',
          path, 
          content, 
          oldContent,
          action
        });
      }
    }

  async getAllRecords() {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('history', 'readonly');
      const request = tx.objectStore('history').getAll();
      request.onsuccess = () => {
        const records = request.result || [];
        records.sort((a, b) => b.timestamp - a.timestamp); // Newest first
        resolve(records);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearHistory() {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('history', 'readwrite');
      tx.objectStore('history').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async exportToMarkdown() {
    const records = await this.getAllRecords();
    if (records.length === 0) {
      this.app?.uiManager?.setStatus('No history to export.', true);
      return;
    }

    let md = '# Vibes History Export\n\n';
    
    for (const r of records) {
      const date = new Date(r.timestamp);
      const timeString = date.toLocaleString();
      md += `## ${timeString} - ${r.action.toUpperCase()} ${r.type.toUpperCase()}\n`;
      md += `**File:** \`${r.path}\`\n`;
      
      if (r.type === 'method') {
        md += `**Class:** \`${r.className}\`\n`;
        md += `**Method:** \`${r.methodName}\`\n`;
      }
      if (r.action === 'delete') {
        md += `*State before deletion:*\n`;
      }
      
      md += `\n\`\`\`javascript\n${r.content}\n\`\`\`\n\n---\n\n`;
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    const d = new Date();
    const mm = d.getMonth() + 1;
    const dd = d.getDate();
    const yy = String(d.getFullYear()).slice(-2);
    let hr = d.getHours();
    const ampm = hr >= 12 ? 'pm' : 'am';
    hr = hr % 12 || 12;
    const min = String(d.getMinutes()).padStart(2, '0');
    
    a.href = url;
    a.download = `archive-${mm}-${dd}-${yy}-${hr}-${min}${ampm}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    await this.clearHistory();
    this.app?.uiManager?.setStatus('History exported to Markdown and database cleared.', false, 4000);
  }

  async deleteRecords(ids) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('history', 'readwrite');
      const store = tx.objectStore('history');
      for (const id of ids) {
        store.delete(id);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  static _doc_overview() {
      return `# HistoryManager

The \`HistoryManager\` is the chronological archiver and database transaction manager for workspace modifications.
It establishes a persistent, reliable audit trail of file-level and method-level modifications inside IndexedDB (\`vibes-history-store\`), fulfilling Vibes Rule 1 (The Prime Directive).`;
    }

  static _doc_transactions() {
      return `## Transaction Auditing and Rollbacks

- **Chronological Logging**: \`recordFileChange\` and \`recordMethodChange\` log every change with an ISO timestamp, action tag (create, update, delete), original contents, and newly written contents.
- **Undo Timeline**: Coordinates with \`UndoTimelineDialog\` to roll back changes step-by-step or to a specific timestamp, precisely reversing method transplants and file writes in VFS.
- **Markdown Export**: Synthesizes the entire database history into a beautifully formatted Markdown report for offline archiving and clears the local database cleanly.`;
    }

  static _doc() {
      return [
        this._doc_HistoryManager(),
        this._doc_overview(),
        this._doc_transactions()
      ].join('\n\n');
    }

  static _doc_HistoryManager() {
      return `# HistoryManager

## Summary

HistoryManager is the chronological archiver and database transaction manager for workspace modifications. It establishes a persistent, reliable audit trail of file-level and method-level modifications inside IndexedDB (\`vibes-history-store\`), fulfilling Vibes Rule 1 (The Prime Directive).`;
    }

  saveLastUndone(records) {
      this.lastUndone = {
        records: JSON.parse(JSON.stringify(records)),
        timestamp: Date.now()
      };
    }

  async redoLastUndone() {
      if (!this.lastUndone || !this.lastUndone.records || this.lastUndone.records.length === 0) {
        this.app?.uiManager?.setStatus('No undone actions available to redo.', true);
        return false;
      }

      const toRedo = this.lastUndone.records;
      this.app?.uiManager?.setStatus(`Redoing ${toRedo.length} actions...`, false);
      
      const reversed = [...toRedo].reverse();
      const CJCP = window.ClientJSClassPatcher || globalThis.ClientJSClassPatcher;

      for (const record of reversed) {
        if (record.type === 'file') {
          if (record.action === 'create') {
            const content = record.content || '';
            await this.app.vfs.writeFile(record.path, content, { skipHistory: true });
          } else if (record.action === 'update') {
            const content = record.content || '';
            await this.app.vfs.writeFile(record.path, content, { skipHistory: true });
          } else if (record.action === 'delete') {
            await this.app.vfs.deleteFile(record.path, { skipHistory: true });
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

          if (record.action === 'create' || record.action === 'update') {
            if (CJCP) {
               mockEnv.executingCode = `class Dummy {\n${record.content || ''}\n}`;
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
               CJCP.deleteMethod(mockEnv, {
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

        await this._addRecord({
          timestamp: Date.now(),
          type: record.type,
          path: record.path,
          className: record.className || null,
          methodName: record.methodName || null,
          content: record.content,
          oldContent: record.oldContent,
          action: record.action
        });
      }

      this.lastUndone = null;
      this.app?.uiManager?.setStatus(`Successfully redid ${toRedo.length} actions.`, false, 4000);
      return true;
    }
}