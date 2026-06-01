class PatchManager {

  constructor(app) {
    this.app = app;
    this.patchStore = null;
    this.patchedFiles = new Set();
  }

  async init() {
    if (typeof VibesPatchStore !== 'undefined') {
      this.patchStore = await VibesPatchStore.open();
      this.app.patchStore = this.patchStore;
      const list = await this.patchStore.listPatchedFiles();
      this.patchedFiles = new Set(list);
      
      // Inject CSS for the patch indicator
      if (!document.getElementById('vibes-patch-styles')) {
        const style = document.createElement('style');
        style.id = 'vibes-patch-styles';
        style.textContent = `
          .tree-node.is-patched .node-name::after {
            content: ' 🩹';
            font-size: 0.9em;
            opacity: 0.9;
          }
        `;
        document.head.appendChild(style);
      }
      // Note: Button injection removed; natively handled by AppUIManager now.
    } else {
      console.warn("VibesPatchStore is not loaded. PatchManager won't work.");
    }
  }

  getPatchMode() {
    if (this.app.localDirectoryStore || this.app.localDirStore || this.app.workspaceFileStores?.size > 0) {
      return 'localdir';
    }
    return 'indexeddb';
  }

  async applyApprovedPlan(plan) {
    // Currently VirtualFileSystem handles routing internally.
  }

  async applyMethodPatch(filePath, className, methodName, source) {
    const mode = this.getPatchMode();
    if (mode === 'localdir') {
       let base = await this.app.vfs.readFile(filePath) || "";
       const CJCP = typeof ClientJSClassPatcher !== 'undefined' ? ClientJSClassPatcher : window.ClientJSClassPatcher;
       let result = base;
       if (CJCP && typeof CJCP.applyMethodSource === 'function') {
         result = CJCP.applyMethodSource(base, className, methodName, source);
       }
       const rootId = '/' + filePath.split('/').filter(Boolean)[0];
       const localStore = this.app.workspaceFileStores?.get(rootId) || this.app.localDirectoryStore || this.app.localDirStore;
       if (localStore && typeof localStore.set === 'function') await localStore.set(filePath, result);
       if (this.app.inMemoryFileStore) this.app.inMemoryFileStore.set(filePath, result);
       this.app.vfs?._afterWrite(filePath, result, 'localdir');
    } else {
       await this.patchStore.setMethodPatch(filePath, methodName, source, { className });
       this.patchedFiles.add(filePath);
       this._refreshTree();
       const reconstructed = await this.app.vfs._reconstructFromPatches(filePath);
       if (reconstructed) {
         if (this.app.inMemoryFileStore) this.app.inMemoryFileStore.set(filePath, reconstructed);
         this.app.vfs?._afterWrite(filePath, reconstructed, 'indexeddb');
       }
    }
  }
  
  async applyFilePatch(filePath, source) {
     const mode = this.getPatchMode();
     if (mode === 'localdir') {
       const rootId = '/' + filePath.split('/').filter(Boolean)[0];
       const localStore = this.app.workspaceFileStores?.get(rootId) || this.app.localDirectoryStore || this.app.localDirStore;
       if (localStore && typeof localStore.set === 'function') await localStore.set(filePath, source);
       if (this.app.inMemoryFileStore) this.app.inMemoryFileStore.set(filePath, source);
       this.app.vfs?._afterWrite(filePath, source, 'localdir');
     } else {
       await this.patchStore.setMethodPatch(filePath, null, source, {});
       this.patchedFiles.add(filePath);
       this._refreshTree();
       const reconstructed = await this.app.vfs._reconstructFromPatches(filePath);
       if (reconstructed) {
         if (this.app.inMemoryFileStore) this.app.inMemoryFileStore.set(filePath, reconstructed);
         this.app.vfs?._afterWrite(filePath, reconstructed, 'indexeddb');
       }
     }
  }

  async revertMethodPatch(filePath, methodName) {
    await this.patchStore.deleteMethodPatch(filePath, methodName);
    await this._refreshAfterRevert(filePath);
  }

  async revertFilePatch(filePath) {
    await this.patchStore.deleteFilePatch(filePath);
    await this._refreshAfterRevert(filePath);
  }

  async revertAll() {
    await this.patchStore.clear();
    window.location.reload();
  }

  async exportPatches() {
    const json = await this.patchStore.exportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vibes-patches-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async importPatches(file) {
    const text = await file.text();
    await this.patchStore.importJson(text);
    window.location.reload();
  }

  async getPatchedFileCount() {
    return this.patchedFiles.size;
  }

  async describePatches() {
    const all = await this.patchStore.getAllPatches();
    let fileCount = new Set(all.map(p => p.filePath)).size;
    let methodCount = all.filter(p => p.methodName).length;
    let totalBytes = all.reduce((sum, p) => sum + (p.source?.length || 0), 0);
    let dates = all.map(p => new Date(p.patchedAt).getTime()).filter(t => !isNaN(t));
    let oldestPatch = dates.length ? new Date(Math.min(...dates)).toISOString() : null;
    let newestPatch = dates.length ? new Date(Math.max(...dates)).toISOString() : null;

    return { fileCount, methodCount, totalBytes, oldestPatch, newestPatch };
  }

  async promoteToLocalDir() {
    if (!window.showDirectoryPicker) {
      alert("File System Access API not supported in this browser.");
      return;
    }
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      const LocalDirectoryStoreClass = typeof LocalDirectoryStore !== 'undefined' ? LocalDirectoryStore : window.LocalDirectoryStore;
      if (!LocalDirectoryStoreClass) {
        throw new Error("LocalDirectoryStore is not loaded.");
      }
      const store = await LocalDirectoryStoreClass.open(dirHandle, dirHandle.name);
      
      const files = await this.patchStore.listPatchedFiles();
      let count = 0;
      for (const filePath of files) {
        const reconstructed = await this.app.vfs._reconstructFromPatches(filePath);
        if (reconstructed) {
           await store.set(filePath, reconstructed);
           count++;
        }
      }
      alert(`Successfully promoted ${count} patched files to local directory: ${dirHandle.name}`);
      
      if (confirm('Do you want to clear the patches from the browser (IndexedDB) now that they are saved to disk?')) {
         await this.patchStore.clear();
      }
      window.location.reload();
    } catch(e) {
      console.error(e);
      alert('Promotion to local dir failed: ' + e.message);
    }
  }

  async _refreshAfterRevert(filePath) {
    const patches = await this.patchStore.getPatchesForFile(filePath);
    if (!patches || Object.keys(patches).length === 0) {
      this.patchedFiles.delete(filePath);
    } else {
      this.patchedFiles.add(filePath);
    }
    this._refreshTree();

    const reconstructed = await this.app.vfs._reconstructFromPatches(filePath);
    let finalSource = reconstructed;
    if (!finalSource) {
      finalSource = await this.app.vfs._fetchStaticFile(filePath, { nullOnMissing: true });
    }
    if (finalSource) {
      if (this.app.inMemoryFileStore) this.app.inMemoryFileStore.set(filePath, finalSource);
      this.app.vfs?._afterWrite(filePath, finalSource, 'indexeddb-revert');
    }
  }

  _refreshTree() {
      const pfm = this.app.projectFilesManager;
      if (pfm) {
        const trees = typeof pfm.getFileTreeViews === 'function' ? pfm.getFileTreeViews() : [];
        for (const tree of trees) {
          if (tree.nodesMap) {
            tree.nodesMap.forEach(n => {
              if (typeof n.updateVisualState === 'function') n.updateVisualState();
            });
          }
        }
      }
    }


  static _doc_overview() {
      return `# PatchManager\n\nThe \`PatchManager\` coordinates write routing and local-storage patch layers.\nIt determines whether the workspace is in local directory mode (writing directly to disk) or browser-only IndexedDB patch mode.`;
    }

  static _doc_patching() {
      return `## Browser Patches & Local Folder Promotion\n\n- **Patch Engine**: In browser-only mode, it writes method-level edits to \`VibesPatchStore\` and reconstructs the files dynamically, marking patched file nodes with a visual band-aid (🩹) in the tree.\n- **Hot Patching**: Leverages \`ClientJSClassPatcher\` to define hot-patched descriptors on running prototypes so changes are immediately active in the workspace without reloads.\n- **Local Promotion**: \`promoteToLocalDir\` prompts the user to select an OS folder, exports all browser-local IndexedDB patches as clean files onto the disk, and clears the browser patch DB.`;
    }

  static _doc() {
      return [
        this._doc_overview(),
        this._doc_patching()
      ].join('\n\n');
    }

  

  static _doc_PatchManager() {
      return `# PatchManager

## Summary

PatchManager coordinates write routing and local-storage patch layers. It determines whether the workspace is in local directory mode (writing directly to disk via File System Access API) or browser-only IndexedDB patch mode.

The philosophy is non-destructive browser-first editing. When a user runs Vibes over read-only baseline files, they can apply method-level patches that are safely saved in browser IndexedDB (\`VibesPatchStore\`). These patches are reconstructed on the fly and can be promoted to clean local disk folders at any time, allowing frictionless project iteration without backend servers.`;
    }
}