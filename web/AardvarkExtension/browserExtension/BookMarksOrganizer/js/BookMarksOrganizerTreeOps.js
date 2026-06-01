class BookMarksOrganizerTreeOps {
  constructor(appContext) {
    this.app = appContext;
  }

  norm(s) {
    return String(s == null ? '' : s).trim();
  }

  isFolder(n) {
    return !!(n && typeof n === 'object' && Array.isArray(n.children));
  }

  walk(rootArray, fn) {
    const walkChildren = (arr, parent) => {
      if (!Array.isArray(arr)) return;
      for (let i = 0; i < arr.length; i++) {
        const node = arr[i];
        fn(node, parent, arr, i);
        if (this.isFolder(node)) {
          walkChildren(node.children, node);
        }
      }
    };
    walkChildren(rootArray, null);
  }

  computeStats(data) {
    const d = data || this.app.data || {};
    const bookmarksRoot = Array.isArray(d.bookmarks) ? d.bookmarks : [];

    let folders = 0;
    let bookmarks = 0;
    let disabled = 0;
    let literalUrls = 0;
    const seenUrl = new Set();
    let duplicateUrlOccurrences = 0;
    let duplicateNameOccurrences = 0;

    const countFolderNameDups = (folderNode) => {
      if (!this.isFolder(folderNode)) return;
      const kids = Array.isArray(folderNode.children)
        ? folderNode.children
        : [];
      const seen = new Set();
      for (const ch of kids) {
        const nm = this.norm(ch && ch.name);
        if (!nm) continue;
        if (seen.has(nm)) duplicateNameOccurrences++;
        else seen.add(nm);
      }
    };

    countFolderNameDups({ children: bookmarksRoot });

    this.walk(bookmarksRoot, (node, parent) => {
      if (!node || typeof node !== 'object') return;

      if (node.enabled === false) disabled++;

      if (this.isFolder(node)) {
        folders++;
        countFolderNameDups(node);
      } else {
        bookmarks++;
      }

      if (typeof node.url === 'string' && node.url.trim()) {
        literalUrls++;
      }

      const url = this.resolveUrl(node);
      if (url) {
        if (seenUrl.has(url)) duplicateUrlOccurrences++;
        else seenUrl.add(url);
      }
    });

    return {
      folders,
      bookmarks,
      disabled,
      literalUrls,
      duplicateUrlOccurrences,
      duplicateNameOccurrences,
    };
  }

  fromChromeTreeToData(treeArr) {
    const normalize = (n) => {
      if (!n || typeof n !== 'object') return null;

      const id = n.id != null ? String(n.id) : '';
      const name = typeof n.title === 'string' ? n.title : n.name || '';
      const url = typeof n.url === 'string' ? n.url : null;
      const dateAdded = n.dateAdded;

      if (Array.isArray(n.children)) {
        return {
          id,
          name,
          enabled: true,
          children: n.children.map(normalize).filter(Boolean),
          dateAdded,
        };
      }

      return {
        id,
        name,
        enabled: true,
        url: url || '',
        dateAdded,
      };
    };

    const roots = Array.isArray(treeArr) ? treeArr : [];
    const mapped = roots.map(normalize).filter(Boolean);

    return {
      note: 'Loaded from Chrome bookmarks',
      bookmarks: mapped,
      longUrls: {},
    };
  }

  isMatch(node) {
    if (!this.app.searchQuery) return true;
    const q = this.app.searchQuery.toLowerCase();

    const name = (node.name || '').toLowerCase();
    if (name.includes(q)) return true;

    if (this.app.searchIncludeUrl) {
      const url = (this.resolveUrl(node) || '').toLowerCase();
      if (url.includes(q)) return true;
    }

    return false;
  }

  subtreeHasMatch(node) {
    if (!node) return false;
    if (this.isMatch(node)) return true;
    if (node.children && Array.isArray(node.children)) {
      return node.children.some((child) => this.subtreeHasMatch(child));
    }
    return false;
  }

  resolveUrl(node) {
    if (!node || typeof node !== 'object') return '';
    return typeof node.url === 'string' ? node.url.trim() : '';
  }

  nodeKey(node) {
    if (!node || typeof node !== 'object') return 'node:unknown';
    if (node.id !== undefined && node.id !== null)
      return `id:${String(node.id)}`;
    const nm = typeof node.name === 'string' ? node.name : '';
    const u =
      typeof node.urlId === 'string'
        ? node.urlId
        : typeof node.url === 'string'
        ? node.url
        : '';
    return `sig:${nm}|${u}|${
      node.children && node.children.length ? node.children.length : 0
    }`;
  }

}

