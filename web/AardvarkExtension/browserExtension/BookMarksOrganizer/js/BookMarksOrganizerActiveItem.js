class BookMarksOrganizerActiveItem {
  constructor(appContext) {
    this.app = appContext;
    this.isTickProcessing = false;
    this.animInterval = null;
  }

  async activateBookmark(node) {
    if (!node) return;
    const id = String(node.id);

    let freshNode = null;
    try {
      const results = await new Promise((resolve) =>
        chrome.bookmarks.get([id], resolve)
      );
      if (results && results.length > 0) freshNode = results[0];
    } catch (e) {
      this.app.updateStatus(
        'Error: Could not locate bookmark in Chrome.',
        'bad'
      );
      return;
    }

    if (!freshNode) return;

    const originalName = freshNode.title;
    const originalParentId = freshNode.parentId;

    const toolbarId = await this.ensureToolbarId();
    if (!toolbarId) {
      this.app.updateStatus('Error: No Toolbar found.', 'bad');
      return;
    }

    this.app.updateStatus('Activating bookmark...', 'neutral');

    this.app._enqueue(async () => {
      try {
        if (this.app.activeBookmarkId && this.app.activeBookmarkId !== id) {
          await this.restoreBookmark(
            this.app.activeBookmarkId,
            this.app.activeBookmarkOriginalName,
            this.app.activeBookmarkOriginalParentId
          );
        }

        const children = await new Promise((r) =>
          chrome.bookmarks.getChildren(toolbarId, r)
        );
        const emojiPattern = /^[🔴🟢🔵🟡]{3}/u;

        for (const child of children) {
          if (emojiPattern.test(child.title) && child.id !== id) {
            console.log(
              'BMO: Found stray active bookmark, cleaning:',
              child.title
            );

            const cleanTitle =
              child.title.replace(emojiPattern, '').trim() ||
              'Restored Bookmark';
            await new Promise((r) =>
              chrome.bookmarks.update(child.id, { title: cleanTitle }, r)
            );
          }
        }

        if (freshNode.parentId !== toolbarId || freshNode.index !== 0) {
          await this.app._chrome.move(id, { parentId: toolbarId, index: 0 });
        }

        this.app.activeBookmarkId = id;
        this.app.activeBookmarkOriginalName = originalName;
        this.app.activeBookmarkOriginalParentId = originalParentId;

        if (chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({
            bmo_activeBookmark: { id, originalName, originalParentId },
          });
        }

        this.animateActiveBookmark(id);

        await this.app._refreshFromChrome();
        this.app.updateStatus('Activated.', 'good');
      } catch (e) {
        console.error(e);
        this.app.updateStatus('Activation failed: ' + e.message, 'bad');
      }
    });
  }

  async animateActiveBookmark(id) {
    const frames = ['🔴🟢🔵', '🟢🔵🔴', '🔵🔴🟢', '🔴🟢🔵', '🟢🔵🔴', '🔵🔴🟢'];

    const play = async (idx) => {
      if (idx >= frames.length) {
        chrome.bookmarks.update(id, { title: '🔴🟢🔵' });
        return;
      }

      chrome.bookmarks.update(id, { title: frames[idx] }, () => {
        if (!chrome.runtime.lastError) {
          setTimeout(() => play(idx + 1), 300);
        }
      });
    };

    play(0);
  }

  startActiveBookmarkAnimation() {
    if (this.animInterval) clearInterval(this.animInterval);

    this.isTickProcessing = false;
    this.tickActiveBookmark();

    this.animInterval = setInterval(() => {
      this.tickActiveBookmark();
    }, 1000);
  }

  async tickActiveBookmark() {
    if (this.isTickProcessing) return;
    this.isTickProcessing = true;

    try {
      const DUMMY_URL = 'chrome://bookmarks/#bmo-session';
      const TITLE_SUFFIX = ' Organizer Active';
      const FRAMES = ['🔴🟡🟢', '🟢🔴🟡', '🟡🟢🔴'];

      const now = Date.now();
      const frameIndex = Math.floor(now / 1000) % FRAMES.length;
      const targetTitle = `${FRAMES[frameIndex]}${TITLE_SUFFIX}`;

      const children = await new Promise((r) =>
        chrome.bookmarks.getChildren('1', r)
      );

      const candidates = children.filter((bm) => bm.url === DUMMY_URL);

      if (candidates.length === 0) {
        await new Promise((r) =>
          chrome.bookmarks.create(
            {
              parentId: '1',
              index: 0,
              title: targetTitle,
              url: DUMMY_URL,
            },
            r
          )
        );
      } else {
        candidates.sort((a, b) => a.index - b.index);
        const winner = candidates[0];

        if (candidates.length > 1) {
          for (let i = 1; i < candidates.length; i++) {
            chrome.bookmarks.remove(candidates[i].id);
          }
        }

        if (winner.index !== 0) {
          await new Promise((r) =>
            chrome.bookmarks.move(winner.id, { index: 0 }, r)
          );
        }

        if (winner.title !== targetTitle) {
          await new Promise((r) =>
            chrome.bookmarks.update(winner.id, { title: targetTitle }, r)
          );
        }
      }
    } catch (err) {
      console.warn('BMO Animation:', err);
    } finally {
      this.isTickProcessing = false;
    }
  }

  async ensureSingleActiveBookmark() {
    return new Promise((resolve) => {
      chrome.bookmarks.getChildren('1', (children) => {
        const candidates = [];

        children.forEach((bm) => {
          if (bm.title && bm.title.includes('Organizer Active')) {
            candidates.push(bm);
          }
        });

        if (candidates.length === 0) {
          resolve(null);
        } else if (candidates.length === 1) {
          this.app._activeBookmarkId = candidates[0].id;
          resolve(this.app._activeBookmarkId);
        } else {
          console.warn(
            `BMO: Found ${candidates.length} active bookmarks. Cleaning up...`
          );

          const winner = candidates.pop();
          this.app._activeBookmarkId = winner.id;

          candidates.forEach((bm) => {
            chrome.bookmarks.remove(String(bm.id));
          });

          resolve(this.app._activeBookmarkId);
        }
      });
    });
  }

  async updateActiveBookmarkAnimation() {
    const existingId = await this.ensureSingleActiveBookmark();

    const frames = ['🔴🟡🟢', '🟢🔴🟡', '🟡🟢🔴'];
    const now = Date.now();
    const frameIndex = Math.floor(now / 1000) % frames.length;
    const title = `${frames[frameIndex]} Organizer Active`;

    if (existingId) {
      chrome.bookmarks.update(existingId, { title: title });
    } else {
      chrome.bookmarks.create(
        {
          parentId: '1',
          title: title,
          url: 'chrome://bookmarks',
        },
        (bm) => {
          this.app._activeBookmarkId = bm.id;
        }
      );
    }
  }

  async stabilizeActiveBookmark() {
    return new Promise((resolve) => {
      chrome.bookmarks.getChildren('1', (children) => {
        const matches = children.filter(
          (bm) => bm.title && bm.title.includes('Organizer Active')
        );

        let targetId = null;

        if (matches.length === 0) {
          chrome.bookmarks.create(
            {
              parentId: '1',
              index: 0,
              title: '🔴 Organizer Active',
              url: 'chrome://bookmarks',
            },
            (bm) => resolve(bm.id)
          );
          return;
        } else {
          matches.sort((a, b) => a.index - b.index);

          const winner = matches[0];
          targetId = winner.id;

          for (let i = 1; i < matches.length; i++) {
            chrome.bookmarks.remove(matches[i].id);
          }

          if (winner.index !== 0) {
            chrome.bookmarks.move(targetId, { index: 0 }, () =>
              resolve(targetId)
            );
          } else {
            resolve(targetId);
          }
        }
      });
    });
  }

  async restoreBookmark(id, originalName, originalParentId) {
    try {
      const results = await new Promise((r) =>
        chrome.bookmarks.get([String(id)], r)
      );
      if (!results || results.length === 0) return;
      const node = results[0];

      let title = originalName;
      if (!title) {
        const emojiPattern = /^[🔴🟢🔵🟡]{3}\s*/u;
        title = node.title.replace(emojiPattern, '').trim();
        if (!title) title = 'Restored Bookmark';
      }

      if (node.title !== title) {
        await new Promise((r) => chrome.bookmarks.update(id, { title }, r));
      }

      if (originalParentId && node.parentId !== originalParentId) {
        await this.app._chrome.move(id, { parentId: originalParentId });
      }
    } catch (e) {
      console.warn('BMO: Failed to restore bookmark', id, e);
    }
  }

  async ensureToolbarId() {
    const standardId = await new Promise((resolve) => {
      try {
        chrome.bookmarks.get('1', (res) => {
          if (chrome.runtime.lastError || !res || !res.length) resolve(null);
          else resolve('1');
        });
      } catch (e) {
        resolve(null);
      }
    });

    if (standardId) return standardId;

    return new Promise((resolve) => {
      chrome.bookmarks.getTree((tree) => {
        if (
          tree &&
          tree[0] &&
          tree[0].children &&
          tree[0].children.length > 0
        ) {
          resolve(tree[0].children[0].id);
        } else {
          resolve(null);
        }
      });
    });
  }

}

