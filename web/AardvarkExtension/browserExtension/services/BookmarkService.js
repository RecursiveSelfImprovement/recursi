class BookmarkService {
  constructor() {
    this.currentGreenCircleState = {
      emoji: '⚪️',
      code: '',
    };
    this.maxBookmarks = 13;
    this.toolbarId = '1';
    this.isCleaning = false;
    this.autoOrganize = false;
  }

  init() {
    chrome.storage.local.get(['bmo_auto_organize'], (res) => {
      this.autoOrganize = !!res.bmo_auto_organize;
      if (this.autoOrganize) {
        this.ensureToolbarId().then((id) => this.mergeDuplicateFolders(id));
      }
    });

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.bmo_auto_organize) {
        this.autoOrganize = !!changes.bmo_auto_organize.newValue;
      }
    });

    chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
      if (this.isCleaning || !this.autoOrganize) return;
      await this.onBookmarkCreated(id, bookmark);
      if (this.toolbarId) {
        await this.mergeDuplicateFolders(this.toolbarId);
      }
    });

    chrome.bookmarks.onMoved.addListener(async (id, moveInfo) => {
      if (this.isCleaning || !this.autoOrganize) return;
      await this.onBookmarkMoved(id, moveInfo);
      if (this.toolbarId) {
        await this.mergeDuplicateFolders(this.toolbarId);
      }
    });

    chrome.bookmarks.onChanged.addListener(async (id, changeInfo) => {
      if (this.isCleaning || !this.autoOrganize) return;
      if (this.toolbarId) {
        await this.mergeDuplicateFolders(this.toolbarId);
      }
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Async response
    });
  }

  async onBookmarkCreated(id, bookmark) {
    if (bookmark.parentId) {
      await this.manageToolbarOverflow();
      await this.handleDuplicates(bookmark, bookmark.parentId);
      await this.moveBookmarkToTop(bookmark);
    }
  }

  async onBookmarkMoved(id, moveInfo) {
    if (moveInfo.parentId === this.toolbarId) {
      await this.manageToolbarOverflow();
    }
  }

  handleMessage(request, sender, sendResponse) {
    const action = request && request.action;

    if (action === 'updateAutoOrganize') {
      this.autoOrganize = request.value;
      if (this.autoOrganize && this.toolbarId) {
        this.mergeDuplicateFolders(this.toolbarId);
      }
      sendResponse({ success: true });
      return;
    }

    if (action === 'checkIncognitoState') {
      chrome.bookmarks.search({ title: 'Incognito' }, (results) => {
        const isOpen = results.some((r) => !r.url);
        sendResponse({ isOpen });
      });
      return true;
    }

    if (action === 'lockIncognito') {
      this._lockIncognito().then(() => sendResponse({ success: true }));
      return true;
    }

    if (action === 'unlockIncognito') {
      if (request.password === 'asdf') {
        this._unlockIncognito().then((success) => sendResponse({ success }));
      } else {
        setTimeout(() => sendResponse({ success: false }), 500);
      }
      return true;
    }

    if (action === 'saveBookmarks') {
      this.saveBookmarksToJson();
      return;
    }

    if (action === 'restoreBookmarks') {
      this.restoreBookmarksFromJson(request.fileContents)
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          console.error('Error in restoreBookmarksFromJson:', error);
          sendResponse({ error: error.message });
        });
      return;
    }

    if (action === 'getBookmarksJson') {
      this._exportBookmarksJsonString()
        .then((jsonString) => sendResponse({ success: true, jsonString }))
        .catch((error) => {
          console.error('Error exporting bookmarks json:', error);
          sendResponse({ success: false, error: error.message });
        });
      return;
    }

    if (action === 'applyBookmarksJson') {
      this._applyBookmarksJsonInput(
        request.jsonString || request.json || request.data
      )
        .then(() => sendResponse({ success: true }))
        .catch((error) => {
          console.error('Error applying bookmarks json:', error);
          sendResponse({ success: false, error: error.message });
        });
      return;
    }

    if (action === 'updateGreenCircleBookmark' || action === 'addBookmark') {
      const url = request.url || request.code;
      this.handleAddBookmark('🟢', url, 0)
        .then((newBookmark) =>
          sendResponse({
            status: 'Bookmark updated successfully',
            bookmark: newBookmark,
          })
        )
        .catch((error) => {
          console.error('Error updating bookmark:', error);
          sendResponse({
            status: 'Error updating bookmark',
            error: error.message,
          });
        });
      return;
    }
  }

  async handleDuplicates(newNode, parentId, isNewNodeInParent = true) {
    if (newNode.title === '\uD83D\uDFE2') return;

    await this.ensureToolbarId();

    const bookmarks = await this.getBookmarks(parentId);

    const oldVersionsFolder = await this._ensureFolderOnToolbar('oldVersions');
    if (!oldVersionsFolder) {
      this.showNotification(
        'oldVersions folder not found and could not be created'
      );
      return;
    }

    if (isNewNodeInParent) {
      bookmarks.forEach((node) => {
        if (
          node.title === newNode.title &&
          node.id !== newNode.id &&
          this._normTitle(node.title) !== 'overflow' &&
          this._normTitle(node.title) !== 'oldversions'
        ) {
          chrome.bookmarks.move(node.id, { parentId: oldVersionsFolder.id });
          this.showNotification(
            'Moved ' + node.title + ' to oldVersions folder'
          );
        }
      });
    }

    for (let node of bookmarks) {
      if (!node.url) {
        await this.handleDuplicates(newNode, node.id, false);
      }
    }
  }

  async manageToolbarOverflow() {
    await this.ensureToolbarId();

    let toolbar = [];
    try {
      toolbar = await this.getBookmarks(this.toolbarId);
    } catch (e) {
      console.error(
        'manageToolbarOverflow: unable to read toolbar children:',
        e
      );
      this.showNotification('Unable to read bookmarks toolbar');
      return;
    }

    let overflowFolder =
      this._findFolderByTitle(toolbar, 'overflow') ||
      this._findFolderByTitle(toolbar, 'Overflow');

    if (!overflowFolder) {
      overflowFolder = await this._ensureFolderOnToolbar('overflow');
      if (!overflowFolder) {
        this.showNotification(
          'Overflow folder not found and could not be created'
        );
        return;
      }
    }

    const bookmarks = toolbar.filter(
      (node) => !!node.url && node.title !== '\uD83D\uDFE2'
    );

    for (let i = this.maxBookmarks - 1; i < bookmarks.length; i++) {
      const b = bookmarks[i];
      if (!b || !b.id) continue;
      if (b.parentId === overflowFolder.id) continue;

      await chrome.bookmarks.move(b.id, {
        parentId: overflowFolder.id,
        index: 0,
      });
      this.showNotification(`Moved ${b.title} to overflow folder`);
    }
  }

  async moveBookmarkToTop(bookmark) {
    const folder = await this.getBookmarks(bookmark.parentId);
    if (folder.length > 1 && folder[folder.length - 1].id === bookmark.id) {
      await chrome.bookmarks.move(bookmark.id, {
        parentId: bookmark.parentId,
        index: 0,
      });
    }
  }

  async handleAddBookmark(name, url, position) {
    let emoji = '🟢';
    let bookmarkletCode = url;

    if (name === '🟢' || name === '⚪️') {
      if (!url || url.trim() === '') {
        bookmarkletCode = "javascript:alert('nothin...');";
        emoji = '⚪️';
      } else {
        bookmarkletCode = url;
      }

      if (
        this.currentGreenCircleState.emoji === emoji &&
        this.currentGreenCircleState.code === bookmarkletCode
      ) {
        return;
      }

      this.currentGreenCircleState.emoji = emoji;
      this.currentGreenCircleState.code = bookmarkletCode;
    }

    const bookmarks = await chrome.bookmarks.search({ title: emoji });

    if (bookmarks.length > 0) {
      for (const bookmark of bookmarks) {
        try {
          await chrome.bookmarks.remove(bookmark.id);
        } catch (error) {
          console.error('Error removing existing bookmark:', error);
        }
      }
    }

    const bookmarkData = {
      parentId: this.toolbarId,
      title: emoji,
      url: bookmarkletCode,
      index: 0,
    };

    return new Promise((resolve, reject) => {
      chrome.bookmarks.create(bookmarkData, (newBookmark) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(newBookmark);
        }
      });
    });
  }

  async saveBookmarksToJson() {
    try {
      const bookmarks = await chrome.bookmarks.getTree();
      const { processedNode, longUrl } = this.processBookmarkNode(bookmarks[0]);

      const bookmarksJson = JSON.stringify(
        {
          bookmarks: [processedNode],
          longUrls: longUrl,
        },
        null,
        2
      );

      const dataUrl =
        'data:application/json;charset=utf-8,' +
        encodeURIComponent(bookmarksJson);

      chrome.downloads.download(
        {
          url: dataUrl,
          filename: 'bookmarks.json',
          saveAs: true,
        },
        (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error('Error saving file:', chrome.runtime.lastError);
            this.showNotification('Error saving bookmarks. Please try again.');
          } else {
            this.monitorDownload(downloadId);
          }
        }
      );
    } catch (error) {
      console.error('Error saving bookmarks:', error);
      this.showNotification('Error saving bookmarks. Please try again.');
    }
  }

  monitorDownload(downloadId) {
    const listener = (delta) => {
      if (
        delta.id === downloadId &&
        delta.state &&
        delta.state.current === 'complete'
      ) {
        chrome.downloads.search({ id: downloadId }, (downloads) => {
          if (downloads && downloads[0]) {
            this.showNotification(
              `Bookmarks saved to ${downloads[0].filename}`
            );
          } else {
            this.showNotification('Bookmarks saved successfully');
          }
        });
        chrome.downloads.onChanged.removeListener(listener);
      }
    };
    chrome.downloads.onChanged.addListener(listener);
  }

  async restoreBookmarksFromJson(jsonContents) {
    try {
      const data = JSON.parse(jsonContents);
      if (!data.bookmarks || !Array.isArray(data.bookmarks) || !data.longUrls) {
        throw new Error('Invalid JSON structure');
      }

      const [bookmarkTreeNode] = await chrome.bookmarks.getTree();
      const bookmarkBarId = bookmarkTreeNode.children[0].id;
      const otherBookmarksId = bookmarkTreeNode.children[1].id;

      this.toolbarId = bookmarkBarId;

      for (let folderId of [bookmarkBarId, otherBookmarksId]) {
        const children = await this.getBookmarks(folderId);
        for (let child of children) {
          await chrome.bookmarks.removeTree(child.id);
        }
      }

      const timestampMap = {};

      for (let rootFolder of data.bookmarks[0].children) {
        if (rootFolder.name === 'Bookmarks Bar') {
          for (let node of rootFolder.children) {
            await this.restoreBookmarkNode(
              node,
              data.longUrls,
              bookmarkBarId,
              timestampMap
            );
          }
        } else if (rootFolder.name === 'Other Bookmarks') {
          for (let node of rootFolder.children) {
            await this.restoreBookmarkNode(
              node,
              data.longUrls,
              otherBookmarksId,
              timestampMap
            );
          }
        }
      }

      await chrome.storage.local.set({ bookmarkTimestamps: timestampMap });
      this.showNotification('Bookmarks restored successfully');
    } catch (err) {
      console.error('Error restoring bookmarks:', err);
      this.showNotification(`Error restoring bookmarks: ${err.message}`);
      throw err;
    }
  }

  async restoreBookmarkNode(node, longUrls, parentId, timestampMap) {
    if (node.enabled === false) return;

    let url = node.url;
    if (node.urlId && longUrls[node.urlId]) {
      url = longUrls[node.urlId];
    }

    try {
      let createdNode;
      if (url) {
        createdNode = await chrome.bookmarks.create({
          parentId,
          title: node.name,
          url,
        });
      } else {
        createdNode = await chrome.bookmarks.create({
          parentId,
          title: node.name,
        });
        if (node.children && node.children.length > 0) {
          for (let child of node.children) {
            await this.restoreBookmarkNode(
              child,
              longUrls,
              createdNode.id,
              timestampMap
            );
          }
        }
      }

      if (node.dateAdded && timestampMap) {
        timestampMap[createdNode.id] = node.dateAdded;
      }
    } catch (err) {
      throw new Error(`Failed to restore ${node.name}: ${err.message}`);
    }
  }

  async getBookmarks(id) {
    return new Promise((resolve, reject) => {
      chrome.bookmarks.getChildren(id, (results) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(Array.isArray(results) ? results : []);
      });
    });
  }

  showNotification(message) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'images/icon48.png',
      title: 'Bookmark Manager',
      message: message,
      silent: true,
    });
  }

  generateUID() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  processBookmarkNode(node) {
    let processedNode = {
      name: node.title,
      enabled: true,
      id: node.id,
      dateAdded: node.dateAdded ? Math.floor(node.dateAdded / 1000) : undefined,
    };

    if (node.url) {
      if (node.url.length > 100) {
        const uid = this.generateUID();
        processedNode.urlId = uid;
        return { processedNode, longUrl: { [uid]: node.url } };
      } else {
        processedNode.url = node.url;
      }
    }

    if (node.children) {
      processedNode.children = [];
      let longUrls = {};
      for (let child of node.children) {
        const { processedNode: childNode, longUrl } =
          this.processBookmarkNode(child);
        processedNode.children.push(childNode);
        if (longUrl) {
          Object.assign(longUrls, longUrl);
        }
      }
      return { processedNode, longUrl: longUrls };
    }

    return { processedNode };
  }

  async _getBookmarkBarIdFromTree() {
    try {
      const [root] = await chrome.bookmarks.getTree();
      if (!root || !root.children || !root.children.length) return null;

      const bar = root.children[0];
      return bar && bar.id ? bar.id : null;
    } catch (e) {
      console.error('Error getting bookmark tree:', e);
      return null;
    }
  }

  async ensureToolbarId() {
    if (!this.toolbarId || typeof this.toolbarId !== 'string') {
      const id = await this._getBookmarkBarIdFromTree();
      if (id) this.toolbarId = id;
      return this.toolbarId;
    }

    try {
      await this.getBookmarks(this.toolbarId);
      return this.toolbarId;
    } catch (e) {
      const id = await this._getBookmarkBarIdFromTree();
      if (id) this.toolbarId = id;
      return this.toolbarId;
    }
  }

  _normTitle(s) {
    return String(s || '')
      .trim()
      .toLowerCase();
  }

  _findFolderByTitle(children, wantedTitleLower) {
    if (!Array.isArray(children)) return null;
    const want = this._normTitle(wantedTitleLower);

    const matches = children.filter(
      (n) => !n.url && this._normTitle(n.title) === want
    );

    return matches.length ? matches[0] : null;
  }

  async _ensureFolderOnToolbar(folderTitle) {
    await this.ensureToolbarId();
    const kids = await this.getBookmarks(this.toolbarId);

    const existing = this._findFolderByTitle(kids, folderTitle);
    if (existing) return existing;

    try {
      const created = await chrome.bookmarks.create({
        parentId: this.toolbarId,
        title: folderTitle,
      });
      return created;
    } catch (e) {
      console.error(`Failed to create folder "${folderTitle}" on toolbar:`, e);
      return null;
    }
  }

  async _exportBookmarksJsonString() {
    const bookmarks = await chrome.bookmarks.getTree();
    const root = bookmarks && bookmarks[0];
    if (!root) throw new Error('Unable to read bookmark tree');

    const { processedNode, longUrl } = this.processBookmarkNode(root);

    const payload = {
      bookmarks: [processedNode],
      longUrls: longUrl || {},
    };

    return JSON.stringify(payload, null, 2);
  }

  async _applyBookmarksJsonInput(input) {
    let jsonString = '';

    if (typeof input === 'string') {
      jsonString = input;
    } else if (input && typeof input === 'object') {
      jsonString = JSON.stringify(input);
    } else {
      throw new Error('applyBookmarksJson: missing json input');
    }

    await this.restoreBookmarksFromJson(jsonString);
  }

  async mergeDuplicateFolders(parentId) {
    if (this.isCleaning || !parentId) return;
    this.isCleaning = true;

    try {
      const children = await this.getBookmarks(parentId);
      const byName = new Map();

      for (const node of children) {
        if (!node.url) {
          const name = this._normTitle(node.title);
          if (name) {
            if (!byName.has(name)) byName.set(name, []);
            byName.get(name).push(node);
          }
        }
      }

      for (const [name, folders] of byName) {
        if (folders.length > 1) {
          const keeper = folders[0];
          console.log(
            `Merging ${folders.length} duplicate folders named '${name}'`
          );

          for (let i = 1; i < folders.length; i++) {
            const dupe = folders[i];

            try {
              const dupeContents = await this.getBookmarks(dupe.id);
              for (const item of dupeContents) {
                try {
                  await chrome.bookmarks.move(item.id, { parentId: keeper.id });
                } catch (moveErr) {
                  console.warn(
                    `[BookmarkService] Could not move item ${item.id}:`,
                    moveErr.message
                  );
                }
              }

              try {
                await chrome.bookmarks.removeTree(dupe.id);
              } catch (remErr) {
                console.warn(
                  `[BookmarkService] Could not remove dupe folder ${dupe.id}:`,
                  remErr.message
                );
              }
            } catch (readErr) {
              console.warn(
                `[BookmarkService] Could not read dupe folder ${dupe.id}:`,
                readErr.message
              );
            }
          }
        }
      }
    } catch (e) {
      if (
        e &&
        e.message &&
        !e.message.toLowerCase().includes("can't find bookmark for id")
      ) {
        console.error('Error merging duplicate folders:', e);
      }
    } finally {
      this.isCleaning = false;
    }
  }

  async _lockIncognito() {
    const results = await chrome.bookmarks.search({ title: 'Incognito' });
    const folder = results.find((r) => !r.url);
    if (!folder) return;

    try {
      const subTree = await chrome.bookmarks.getSubTree(folder.id);
      const serialized = JSON.stringify(subTree[0]);
      await chrome.storage.local.set({ incognito_vault_data: serialized });
      await chrome.bookmarks.removeTree(folder.id);
    } catch (e) {
      console.error('Failed to lock incognito', e);
    }
  }

  async _unlockIncognito() {
    try {
      const data = await chrome.storage.local.get(['incognito_vault_data']);
      if (!data.incognito_vault_data) return false;

      const rootData = JSON.parse(data.incognito_vault_data);
      const toolbarId = await this.ensureToolbarId();

      const results = await chrome.bookmarks.search({ title: 'Incognito' });
      if (results.some((r) => !r.url)) return true;

      await this._rebuildSubtree(rootData, toolbarId);
      return true;
    } catch (e) {
      console.error('Failed to unlock incognito', e);
      return false;
    }
  }

  async _rebuildSubtree(nodeData, parentId) {
    let created;
    if (nodeData.url) {
      created = await chrome.bookmarks.create({
        parentId,
        title: nodeData.title,
        url: nodeData.url,
      });
    } else {
      created = await chrome.bookmarks.create({
        parentId,
        title: nodeData.title || 'Incognito',
      });
      if (nodeData.children && nodeData.children.length > 0) {
        for (const child of nodeData.children) {
          await this._rebuildSubtree(child, created.id);
        }
      }
    }
    return created;
  }

}

