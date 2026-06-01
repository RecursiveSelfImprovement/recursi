class BookMarksOrganizerMutations {
  constructor(appContext) {
    this.app = appContext;
  }

  deleteBookmark(node, parentFolderNode) {
    const id = node && node.id != null ? String(node.id) : '';
    if (!id) {
      this.app.updateStatus('Cannot delete: missing bookmark id.', 'bad');
      return;
    }

    this.app._enqueue(async () => {
      const isFolder = !!(node && Array.isArray(node.children));
      if (isFolder) await this.app._chrome.removeTree(id);
      else await this.app._chrome.remove(id);

      if (this.app.selectedNodeId === id) this.app.selectedNodeId = null;

      await this.app._refreshFromChrome();
      this.app.updateStatus('Deleted in Chrome. Reloaded.', 'good');
    });
  }

  deleteDuplicateUrlsKeepNewest() {
    if (!this.app.data) return;
    this.app._enqueue(async () => {
      const seen = new Set();
      const toRemoveIds = [];

      const walk = (node) => {
        if (!node) return;
        if (node.children) {
          node.children.forEach(walk);
          return;
        }

        const url = this.app._resolveUrl(node);
        if (!url) return;

        if (seen.has(url)) {
          toRemoveIds.push(node.id);
        } else {
          seen.add(url);
        }
      };
      (this.app.data.bookmarks || []).forEach(walk);

      for (const id of toRemoveIds) await this.app._chrome.remove(id);
      await this.app._refreshFromChrome();
      return toRemoveIds.length;
    });
  }

  deleteDuplicateNamesKeepNewestPerFolder() {
    if (!this.app.data) return;
    this.app._enqueue(async () => {
      const toRemoveIds = [];
      const walk = (node) => {
        if (!node.children) return;
        const seen = new Set();
        node.children.forEach((child) => {
          const nm = (child.name || '').trim();
          if (!nm) return;
          if (seen.has(nm)) toRemoveIds.push(child.id);
          else seen.add(nm);
          walk(child);
        });
      };
      (this.app.data.bookmarks || []).forEach(walk);

      for (const id of toRemoveIds) {
        try {
          await this.app._chrome.removeTree(id);
        } catch (e) {
          await this.app._chrome.remove(id);
        }
      }
      await this.app._refreshFromChrome();
      return toRemoveIds.length;
    });
  }

  startRename(node) {
    this.app.editingId = node.id;
    this.app._renderTree();
  }

  cancelRename() {
    this.app.editingId = null;
    this.app._renderTree();
  }

  async saveRename(node, newName) {
    if (!newName || !newName.trim()) {
      this.cancelRename();
      return;
    }

    const id = String(node.id);

    try {
      node.name = newName;
      await new Promise((resolve, reject) => {
        chrome.bookmarks.update(id, { title: newName }, () => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve();
        });
      });

      this.app.updateStatus(`Renamed to "${newName}"`, 'good');
    } catch (e) {
      console.error(e);
      this.app.updateStatus('Rename failed', 'bad');
    }

    this.app.editingId = null;
    this.app._renderTree();
  }

  startMove(node) {
    this.app.movingNode = node;
    this.app._renderTree();
  }

  cancelMove() {
    this.app.movingNode = null;
    this.app._renderTree();
  }

  async completeMove(targetFolderNode) {
    if (!this.app.movingNode || !targetFolderNode) return;

    const moveId = String(this.app.movingNode.id);
    const targetId = String(targetFolderNode.id);

    try {
      if (moveId === this.app.activeBookmarkId) {
        if (this.app.activeBookmarkOriginalName) {
          await new Promise((r) =>
            chrome.bookmarks.update(
              moveId,
              { title: this.app.activeBookmarkOriginalName },
              r
            )
          );
        }
        this.app.activeBookmarkId = null;
        this.app.activeBookmarkOriginalName = null;
        this.app.activeBookmarkOriginalParentId = null;
        chrome.storage.local.remove('bmo_activeBookmark');
      }

      await this.app._chrome.move(moveId, { parentId: targetId, index: 0 });
      this.app.updateStatus(
        `Moved to top of "${targetFolderNode.name}"`,
        'good'
      );

      this.app.movingNode = null;
      await this.app._refreshFromChrome();
    } catch (e) {
      console.error(e);
      this.app.updateStatus('Move failed: ' + e.message, 'bad');
      this.app.movingNode = null;
      this.app._renderTree();
    }
  }

  async scanDuplicates() {
    if (!this.app.data) return { urlDups: 0, nameDups: 0 };

    const seenUrls = new Set();
    let urlDups = 0;

    const walkUrl = (node) => {
      if (node.children) {
        node.children.forEach(walkUrl);
        return;
      }
      const url = this.app._resolveUrl(node);
      if (!url) return;
      if (seenUrls.has(url)) urlDups++;
      else seenUrls.add(url);
    };
    (this.app.data.bookmarks || []).forEach(walkUrl);

    let nameDups = 0;
    const walkName = (node) => {
      if (!node.children) return;
      const seenNames = new Set();
      node.children.forEach((child) => {
        const nm = (child.name || '').trim();
        if (!nm) return;
        if (seenNames.has(nm)) nameDups++;
        else seenNames.add(nm);
        walkName(child);
      });
    };
    (this.app.data.bookmarks || []).forEach(walkName);

    return { urlDups, nameDups };
  }

  async scanForReview(mode) {
    console.log('Starting Scan: ' + mode);

    const getByteSize = (str) => (str ? new Blob([str]).size : 0);
    const getUrl = (n) => n.url || '';

    const roots = this.app.data ? this.app.data.bookmarks : [];
    if (!roots || roots.length === 0) return [];

    const groups = new Map();

    const walk = (node, pathArr) => {
      const currentPathStr = pathArr.join(' › ');

      const makeItem = (n) => ({
        node: n,
        id: n.id,
        name: n.name,
        path: currentPathStr,
        date: n.dateAdded || 0,
        size: getByteSize(getUrl(n)),
      });

      if (node.children) {
        if (mode === 'name') {
          const siblingMap = new Map();
          node.children.forEach((child) => {
            const nm = (child.name || '').trim();
            if (!nm) return;
            if (!siblingMap.has(nm)) siblingMap.set(nm, []);
            siblingMap.get(nm).push(makeItem(child));
          });

          for (const [nm, items] of siblingMap) {
            if (items.length > 1) {
              const key = `${currentPathStr}::${nm}`;
              groups.set(key, items);
            }
          }
        }
        const nextPath = [...pathArr, node.name || ''];
        node.children.forEach((child) => walk(child, nextPath));
      } else {
        const u = getUrl(node);
        const nm = (node.name || '').trim();

        if (u) {
          let key = null;
          if (mode === 'url') key = u;
          else if (mode === 'strict') key = `${u}::${nm}`;

          if (key) {
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(makeItem(node));
          }
        }
      }
    };

    roots.forEach((r) => walk(r, []));

    const result = [];
    for (const [key, items] of groups) {
      if (items.length > 1) result.push({ key, items });
    }
    return result;
  }

  async deleteBookmarksBulk(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    console.log(`Deleting ${ids.length} items...`);

    const promises = ids.map((id) => {
      return new Promise((resolve) => {
        chrome.bookmarks.removeTree(String(id), () => {
          if (chrome.runtime.lastError) {
            chrome.bookmarks.remove(String(id), () => resolve(true));
          } else {
            resolve(true);
          }
        });
      });
    });

    await Promise.all(promises);

    if (this.app._refreshFromChrome) {
      await this.app._refreshFromChrome();
    }
    return ids.length;
  }

}

