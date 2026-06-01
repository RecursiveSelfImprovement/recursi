class BookMarksOrganizerUI {
  constructor(appContext) {
    this.app = appContext;
  }

  updateStatus(message, kind = 'neutral') {
    const msg = Array.isArray(message)
      ? message.filter(Boolean).join(' • ')
      : String(message || '');
    if (this.app.statusEl) this.app.statusEl.textContent = msg;

    if (!this.app.statusEl) return;
    const colors = {
      good: 'rgba(94,240,194,0.9)',
      warn: 'rgba(255,195,80,0.95)',
      bad: 'rgba(255,107,122,0.95)',
      neutral: 'rgba(255,255,255,0.72)',
    };
    this.app.statusEl.style.color = colors[kind] || colors.neutral;
  }

  applyAppStyles() {
    applyCss(this.getUiCss(), 'bmo_app_styles_v3');
    this.applyThemeVars();
  }

  renderTree() {
    this.app.treeEl.innerHTML = '';
    this.closeContextMenu();

    if (this.app.movingNode) {
      this.app.moveBanner.style.display = 'flex';
      this.app.moveBanner.innerHTML = '';
      this.app.moveBanner.appendChild(makeElement('span', {}, `Moving: `));
      this.app.moveBanner.appendChild(
        makeElement(
          'strong',
          { style: { marginLeft: '5px' } },
          this.app.movingNode.name
        )
      );
      this.app.moveBanner.appendChild(
        makeElement(
          'button',
          {
            className: 'bmo-btn-small',
            style: { marginLeft: 'auto' },
            onclick: () => this.app._cancelMove(),
          },
          'Cancel'
        )
      );
      this.app.searchInput.disabled = true;
    } else {
      this.app.moveBanner.style.display = 'none';
      this.app.searchInput.disabled = false;
    }

    if (
      !this.app.data ||
      !Array.isArray(this.app.data.bookmarks) ||
      this.app.data.bookmarks.length === 0
    ) {
      this.app.treeEl.appendChild(
        makeElement(
          'div',
          { className: 'bmo-empty' },
          'No bookmarks array found.'
        )
      );
      return;
    }

    let nodesToRender = this.app.data.bookmarks;
    if (nodesToRender.length === 1 && nodesToRender[0].children) {
      const root = nodesToRender[0];
      const lowName = (root.name || '').toLowerCase();
      if (
        lowName === '' ||
        lowName === 'root' ||
        lowName === '(unnamed folder)'
      ) {
        nodesToRender = root.children;
      }
    }

    const frag = document.createDocumentFragment();
    nodesToRender.forEach((node) => {
      const nodeEl = this.renderNode(node, 0, null);
      if (nodeEl) frag.appendChild(nodeEl);
    });
    this.app.treeEl.appendChild(frag);
  }

  makeNode(node, ctx) {
    const depth = ctx?.depth ?? 0;
    const autoOpen = !!ctx?.autoOpen;

    const isFolder = node && Array.isArray(node.children);
    const name = node && typeof node.name === 'string' ? node.name : '';
    const enabled =
      node && typeof node.enabled === 'boolean' ? node.enabled : true;
    const id = node && node.id != null ? String(node.id) : '';

    let dateDisplay = '';
    if (node) {
      let ts = 0;
      if (this.app.timestampMap && this.app.timestampMap[id]) {
        ts = this.app.timestampMap[id] * 1000;
      } else if (node.dateAdded) {
        ts = node.dateAdded;
      }

      if (ts) {
        const d = new Date(ts);
        const yy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        dateDisplay = `${yy}-${mm}-${dd}`;
      }
    }

    if (isFolder) {
      const kids = node.children || [];
      const folderDetails = makeElement('details', {
        className: 'bmo-folder',
        open: autoOpen && depth <= 1,
      });

      const caret = makeElement('span', { className: 'bmo-caret' }, '▸');

      const titleContent = [
        makeElement(
          'span',
          { className: 'bmo-folder-name' },
          name || '(unnamed folder)'
        ),
        makeElement(
          'span',
          { className: 'bmo-badge' },
          `${kids.length} item${kids.length === 1 ? '' : 's'}`
        ),
      ];

      if (!enabled) {
        titleContent.push(
          makeElement(
            'span',
            {
              className: 'bmo-badge',
              style: {
                borderColor: 'rgba(255,107,122,0.35)',
                color: 'rgba(255,107,122,0.9)',
              },
            },
            'disabled'
          )
        );
      }

      if (dateDisplay) {
        titleContent.push(
          makeElement('span', { className: 'bmo-date-faded' }, dateDisplay)
        );
      }

      const title = makeElement(
        'span',
        { className: 'bmo-folder-title' },
        ...titleContent
      );
      const summary = makeElement(
        'summary',
        { className: 'bmo-summary' },
        caret,
        title
      );

      folderDetails.appendChild(summary);

      const childrenWrap = makeElement('div', { className: 'bmo-node' });
      kids.forEach((kid, idx) => {
        childrenWrap.appendChild(
          this.makeNode(kid, { depth: depth + 1, autoOpen: false, index: idx })
        );
      });
      folderDetails.appendChild(childrenWrap);

      return folderDetails;
    }

    const fullUrl = this.app._resolveUrl(node);
    const isJs = fullUrl.trim().toLowerCase().startsWith('javascript:');

    let urlElContent;

    if (isJs) {
      const byteSize = new Blob([fullUrl]).size;
      const sizeStr = this.prettyBytes(byteSize);
      const safeDisplayCode =
        fullUrl.substring(0, 60).replace(/[\r\n]+/g, ' ') + '...';
      const safeTitle =
        fullUrl.length > 500
          ? fullUrl.substring(0, 500) +
            `\n\n...[${fullUrl.length - 500} more chars]`
          : fullUrl;

      urlElContent = makeElement(
        'div',
        { className: 'bmo-js-row' },
        makeElement('span', { className: 'bmo-js-badge' }, 'JS'),
        makeElement('span', { className: 'bmo-js-size' }, sizeStr),
        makeElement(
          'span',
          { className: 'bmo-js-code', title: safeTitle },
          safeDisplayCode
        )
      );
    } else {
      urlElContent = fullUrl
        ? makeElement(
            'a',
            {
              className: 'bmo-link',
              href: fullUrl,
              target: '_blank',
              rel: 'noreferrer',
            },
            fullUrl
          )
        : makeElement(
            'span',
            { style: { color: 'rgba(255,107,122,0.9)' } },
            '(no url)'
          );
    }

    const leaf = makeElement(
      'div',
      { className: 'bmo-leaf' },
      makeElement(
        'div',
        { className: 'bmo-leaf-name', title: name || '' },
        name || '(unnamed)'
      ),
      makeElement(
        'div',
        {
          className: 'bmo-leaf-url',
          title: isJs ? 'Bookmarklet' : fullUrl || '',
        },
        urlElContent
      ),
      makeElement(
        'div',
        { className: 'bmo-leaf-meta' },
        dateDisplay
          ? makeElement('span', { className: 'bmo-date' }, dateDisplay)
          : null
      )
    );

    const delBtn = makeElement(
      'button',
      {
        className: 'bmo-mini danger',
        title: 'Delete this bookmark',
        onclick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.app._deleteBookmark(node);
        },
      },
      'Del'
    );

    leaf.appendChild(delBtn);

    if (enabled === false) {
      leaf.style.opacity = '0.55';
      leaf.style.borderColor = 'rgba(255,107,122,0.18)';
    }

    return leaf;
  }

  renderStats(stats) {
    if (!this.app.statsBar) return;

    this.app.statsBar.innerHTML = '';

    const pill = (txt, extraStyle = null) =>
      makeElement(
        'span',
        {
          className: 'bmo-stats-item',
          style: extraStyle || null,
        },
        txt
      );

    if (!stats) {
      this.app.statsBar.appendChild(pill('No bookmarks loaded.'));
      return;
    }

    this.app.statsBar.appendChild(pill(`folders: ${stats.folders ?? 0}`));
    this.app.statsBar.appendChild(pill(`bookmarks: ${stats.bookmarks ?? 0}`));

    if (stats.disabled) {
      this.app.statsBar.appendChild(
        pill(`disabled: ${stats.disabled}`, {
          borderColor: 'rgba(255,107,122,0.35)',
          color: 'rgba(255,107,122,0.9)',
        })
      );
    }

    if ((stats.duplicateUrlOccurrences ?? 0) > 0) {
      this.app.statsBar.appendChild(
        pill(`dup URLs: ${stats.duplicateUrlOccurrences}`, {
          borderColor: 'rgba(122,166,255,0.55)',
          color: 'rgba(122,166,255,0.95)',
        })
      );
    }

    if ((stats.duplicateNameOccurrences ?? 0) > 0) {
      this.app.statsBar.appendChild(
        pill(`dup names: ${stats.duplicateNameOccurrences}`, {
          borderColor: 'rgba(94,240,194,0.45)',
          color: 'rgba(94,240,194,0.95)',
        })
      );
    }

    this.app.statsBar.style.display = 'flex';
    this.app.statsBar.style.gap = '10px';
    this.app.statsBar.style.flexWrap = 'wrap';
  }

  renderNode(node, depth, parentRef) {
    const isSearchActive = !!this.app.searchQuery.trim();
    const isMoveMode = !!this.app.movingNode;
    const isFolder = !!(node && node.children && Array.isArray(node.children));
    const isEditing =
      this.app.editingId && String(node.id) === String(this.app.editingId);
    const isActive = String(node.id) === String(this.app.activeBookmarkId);
    const isSelected = String(node.id) === String(this.app.selectedNodeId);

    if (isMoveMode) {
      if (!isFolder) return null;
      if (node === this.app.movingNode) return null;
    } else if (isSearchActive) {
      if (!isFolder && !this.app._isMatch(node)) return null;
    }

    let isOpen = false;
    if (isMoveMode) {
      isOpen = true;
    } else if (isSearchActive && isFolder) {
      if (this.app._subtreeHasMatch(node)) isOpen = true;
    } else if (isFolder) {
      isOpen = !!this.app._folderOpenState.get(this.app._nodeKey(node));
    }

    const container = makeElement('div');
    const key = this.app._nodeKey(node);

    const rowClasses = ['bmo-row'];
    if (isMoveMode) rowClasses.push('move-target');
    if (isActive) rowClasses.push('active-bookmark');
    if (isSelected) rowClasses.push('selected-bookmark');

    const row = makeElement('div', {
      className: rowClasses.join(' '),
      onclick: (e) => {
        if (isMoveMode) {
          e.stopPropagation();
          this.app._completeMove(node);
        } else {
          this.app.selectedNodeId = node.id;
          this.app._renderTree();
        }
      },
    });

    for (let i = 0; i < depth; i++) {
      row.appendChild(makeElement('div', { className: 'bmo-indent' }));
    }

    const twistyChar = isFolder ? (isOpen ? '▼' : '▶') : '';
    const twisty = makeElement('div', { className: 'bmo-twisty' }, twistyChar);
    if (isFolder && !isMoveMode && !isSearchActive) {
      twisty.onclick = (e) => {
        e.stopPropagation();
        this.app._toggleFolder(node);
      };
    }
    row.appendChild(twisty);

    let iconChar = isFolder ? '📁' : '🔖';
    if (isActive) iconChar = '🚀';
    if (isMoveMode) iconChar = '📥';

    row.appendChild(makeElement('div', { className: 'bmo-icon' }, iconChar));

    if (isEditing) {
      const input = makeElement('input', {
        type: 'text',
        className: 'bmo-rename-input',
        value: isActive
          ? this.app.activeBookmarkOriginalName || node.name
          : node.name,
        onclick: (e) => e.stopPropagation(),
        onkeydown: (e) => {
          if (e.key === 'Enter') this.app._saveRename(node, e.target.value);
          if (e.key === 'Escape') this.app._cancelRename();
        },
      });
      setTimeout(() => input.focus(), 50);
      row.appendChild(input);
    } else {
      const displayName = isActive
        ? this.app.activeBookmarkOriginalName || node.name
        : node.name || (isFolder ? '(unnamed folder)' : '(unnamed)');

      const nameEl = makeElement(
        'div',
        {
          className: `bmo-name ${isFolder ? 'folder' : ''}`,
          title: displayName,
        },
        displayName
      );

      if (isMoveMode) {
        nameEl.textContent += ' (Move here)';
        nameEl.style.opacity = '1';
      }

      row.appendChild(nameEl);
    }

    if (!isMoveMode && !isFolder && !isEditing) {
      const content = makeElement('div', { className: 'bmo-content' });
      const rawUrl = this.app._resolveUrl(node) || '';
      const isJs = rawUrl.trim().toLowerCase().startsWith('javascript:');

      if (isJs) {
        const bytes = new Blob([rawUrl]).size;
        const snippet =
          rawUrl.substring(0, 60).replace(/[\r\n]+/g, ' ') +
          (rawUrl.length > 60 ? '...' : '');

        const badgeText = isActive ? 'ACTIVE' : 'JS';
        const badgeClass = isActive
          ? 'bmo-code-badge active'
          : 'bmo-code-badge';

        content.appendChild(
          makeElement(
            'div',
            { className: 'bmo-url-wrap' },
            makeElement('span', { className: badgeClass }, badgeText),
            makeElement(
              'span',
              { className: 'bmo-size-badge' },
              this.prettyBytes(bytes)
            ),
            makeElement(
              'span',
              {
                className: 'bmo-code-snippet',
                title: 'Click to copy',
                onclick: (e) => {
                  e.stopPropagation();
                  this.app._copyTextToClipboard(rawUrl);
                },
              },
              snippet
            )
          )
        );

        if (!isActive) {
          const actBtn = makeElement(
            'button',
            {
              className: 'bmo-mini-btn',
              title: 'Activate: Move to start of Toolbar',
              style: { fontSize: '14px', marginLeft: '5px', opacity: '0.8' },
              onclick: (e) => {
                e.stopPropagation();
                this.app._activateBookmark(node);
              },
            },
            '🚀'
          );
          content.appendChild(actBtn);
        }
      } else {
        content.appendChild(
          makeElement(
            'div',
            { className: 'bmo-url-wrap' },
            makeElement(
              'a',
              { className: 'bmo-link', href: rawUrl, target: '_blank' },
              rawUrl || '(no url)'
            )
          )
        );
      }
      row.appendChild(content);
    }

    if (!isMoveMode && !isEditing) {
      const meta = makeElement('div', { className: 'bmo-meta' });
      if (node.dateAdded) {
        const d = new Date(node.dateAdded);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          '0'
        )}-${String(d.getDate()).padStart(2, '0')}`;
        meta.appendChild(
          makeElement('span', { className: 'bmo-date' }, dateStr)
        );
      }
      const menuBtn = makeElement(
        'button',
        {
          className: 'bmo-menu-btn',
          onclick: (e) => {
            e.stopPropagation();
            this.app._showContextMenu(e, node, parentRef);
          },
        },
        '⋮'
      );
      meta.appendChild(menuBtn);
      row.appendChild(meta);
    }

    container.appendChild(row);

    if (isFolder && isOpen) {
      node.children.forEach((child) => {
        const childEl = this.renderNode(child, depth + 1, node);
        if (childEl) container.appendChild(childEl);
      });
    }

    return container;
  }

  renderShell() {
    this.app.rootEl.innerHTML = '';
    this.app.appEl = makeElement('div', { className: 'bmo-app' });

    const themeSel = makeElement('select', {
      className: 'bmo-select',
      onchange: (e) => this.app._setTheme(e.target.value),
    });
    this.app.themes.forEach((t) => {
      const opt = makeElement('option', { value: t }, t);
      if (t === this.app.currentTheme) opt.selected = true;
      themeSel.appendChild(opt);
    });

    const header = makeElement(
      'div',
      { className: 'bmo-topbar' },
      makeElement(
        'div',
        { className: 'bmo-title' },
        makeElement('h1', {}, 'Bookmark Organizer'),
        makeElement('p', {}, 'Manage, deduplicate, and clean your library.')
      ),
      makeElement(
        'div',
        { className: 'bmo-actions' },
        makeElement(
          'button',
          {
            className: 'bmo-btn bmo-btn-vault',
            title: 'Lock/Unlock Incognito Vault',
            onclick: () => this.app._toggleVault(),
          },
          '🔐 Vault'
        ),
        makeElement(
          'span',
          { style: { fontSize: '12px', opacity: 0.6, marginLeft: '10px' } },
          'Theme:'
        ),
        themeSel,
        makeElement(
          'button',
          {
            className: 'bmo-btn',
            onclick: () => this.app._refreshFromChrome(),
          },
          'Reload'
        ),
        makeElement(
          'button',
          {
            className: 'bmo-btn',
            onclick: () => this.app._openAdvancedActions(),
          },
          'Advanced Tools'
        )
      )
    );

    this.app.searchInput = makeElement('input', {
      type: 'text',
      className: 'bmo-search-input',
      placeholder: 'Search bookmarks...',
      value: this.app.searchQuery,
      oninput: (e) => {
        this.app.searchQuery = e.target.value;
        this.app._renderTree();
      },
    });

    this.app.searchCheck = makeElement('input', {
      type: 'checkbox',
      checked: this.app.searchIncludeUrl,
      onchange: (e) => {
        this.app.searchIncludeUrl = e.target.checked;
        this.app._renderTree();
      },
    });

    const searchRow = makeElement(
      'div',
      { className: 'bmo-search-row' },
      this.app.searchInput,
      makeElement(
        'label',
        { className: 'bmo-search-label' },
        this.app.searchCheck,
        makeElement('span', {}, 'Search URLs/Code')
      )
    );

    this.app.moveBanner = makeElement('div', {
      className: 'bmo-move-banner',
      style: { display: 'none' },
    });
    this.app.statsBar = makeElement(
      'div',
      { className: 'bmo-stats' },
      'Loading stats...'
    );
    this.app.treeEl = makeElement('div', { className: 'bmo-tree' });

    this.app.appEl.appendChild(header);
    this.app.appEl.appendChild(
      makeElement(
        'div',
        { className: 'bmo-panel' },
        this.app.moveBanner,
        searchRow,
        this.app.statsBar,
        this.app.treeEl
      )
    );

    this.app.rootEl.appendChild(this.app.appEl);
  }

  applyThemeVars() {
    const root = document.documentElement;
    const themeMap = {
      Slate: {
        bg: '#0b1020',
        panel: 'rgba(255,255,255,0.03)',
        border: 'rgba(255,255,255,0.08)',
        text: '#e0e6ed',
        dim: '#94a3b8',
        accent: '#38bdf8',
        danger: '#fb7185',
        success: '#34d399',
        warning: '#fbbf24',
        badge: 'rgba(56, 189, 248, 0.15)',
      },
      Paper: {
        bg: '#f8fafc',
        panel: '#ffffff',
        border: '#e2e8f0',
        text: '#334155',
        dim: '#64748b',
        accent: '#0284c7',
        danger: '#ef4444',
        success: '#10b981',
        warning: '#f59e0b',
        badge: 'rgba(2, 132, 199, 0.1)',
      },
      Midnight: {
        bg: '#000000',
        panel: '#111111',
        border: '#333333',
        text: '#ffffff',
        dim: '#888888',
        accent: '#ffffff',
        danger: '#ff0000',
        success: '#00ff00',
        warning: '#ffff00',
        badge: '#333333',
      },
      Terminal: {
        bg: '#0d1117',
        panel: '#161b22',
        border: '#30363d',
        text: '#3fb950',
        dim: '#238636',
        accent: '#2ea043',
        danger: '#da3633',
        success: '#3fb950',
        warning: '#d29922',
        badge: 'rgba(63, 185, 80, 0.2)',
      },
    };

    const t = themeMap[this.app.currentTheme] || themeMap.Slate;

    root.style.setProperty('--bmo-bg', t.bg);
    root.style.setProperty('--bmo-panel', t.panel);
    root.style.setProperty('--bmo-border', t.border);
    root.style.setProperty('--bmo-text', t.text);
    root.style.setProperty('--bmo-dim', t.dim);
    root.style.setProperty('--bmo-accent', t.accent);
    root.style.setProperty('--bmo-danger', t.danger);
    root.style.setProperty('--bmo-success', t.success);
    root.style.setProperty('--bmo-badge-bg', t.badge);
  }

  setTheme(name) {
    if (!this.app.themes.includes(name)) return;
    this.app.currentTheme = name;
    this.applyThemeVars();
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ bmo_theme: name });
    }
  }

  showContextMenu(e, node, parentRef) {
    this.closeContextMenu();

    const menu = makeElement('div', { className: 'bmo-context-menu' });

    menu.appendChild(
      makeElement(
        'div',
        {
          className: 'bmo-menu-item',
          onclick: () => this.app._startRename(node),
        },
        'Rename'
      )
    );

    menu.appendChild(
      makeElement(
        'div',
        {
          className: 'bmo-menu-item',
          onclick: () => this.app._startMove(node),
        },
        'Move...'
      )
    );

    menu.appendChild(
      makeElement(
        'div',
        {
          className: 'bmo-menu-item danger',
          onclick: () => {
            this.app._deleteBookmark(node, parentRef);
          },
        },
        'Delete'
      )
    );

    document.body.appendChild(menu);

    const rect = e.target.getBoundingClientRect();
    menu.style.top = `${rect.bottom + window.scrollY}px`;
    menu.style.left = `${rect.left - 50 + window.scrollX}px`;
  }

  closeContextMenu() {
    const existing = document.querySelector('.bmo-context-menu');
    if (existing) existing.remove();
  }

  getUiCss() {
    return `
  :root {
    --bmo-bg: #0b1020;
    --bmo-panel: rgba(255,255,255,0.06);
    --bmo-border: rgba(255,255,255,0.14);
    --bmo-text: rgba(255,255,255,0.92);
    --bmo-dim: rgba(255,255,255,0.70);
    --bmo-accent: #7aa6ff;
    --bmo-danger: #ff6b7a;
    --bmo-success: #5ef0c2;
    --bmo-badge-bg: rgba(255,255,255,0.1);
    --bmo-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    --bmo-radius: 8px;
    --bmo-select-bg: #2d3342;
    --bmo-font-size: 14px;
    --bmo-row-height: 24px;
  }

  body {
    background: var(--bmo-bg); color: var(--bmo-text); margin: 0; padding: 0;
    font-family: system-ui, -apple-system, sans-serif;
  }

  .bmo-app { max-width: 1400px; margin: 0 auto; padding: 20px; }

  /* Top Bar */
  .bmo-topbar { 
    display: flex; justify-content: space-between; align-items: center; 
    padding-bottom: 20px; border-bottom: 1px solid var(--bmo-border);
    margin-bottom: 20px;
  }
  .bmo-title h1 { font-size: 22px; margin: 0; font-weight: 600; }

  /* Actions */
  .bmo-actions { display: flex; gap: 8px; align-items: center; }
  .bmo-select, .bmo-btn, .bmo-btn-small {
    background: var(--bmo-panel); border: 1px solid var(--bmo-border);
    color: var(--bmo-text); padding: 6px 12px; border-radius: 6px;
    font-size: 13px; cursor: pointer; transition: all 0.2s;
  }
  .bmo-btn:hover, .bmo-btn-small:hover { background: var(--bmo-border); }
  .bmo-btn-vault { border-color: #f57c00; color: #ffb74d; }
  .bmo-btn-vault:hover { background: rgba(245, 124, 0, 0.1); }
  .bmo-btn-small { padding: 2px 8px; font-size: 11px; }

  /* Search Row */
  .bmo-search-row {
    padding: 10px 15px; border-bottom: 1px solid var(--bmo-border);
    display: flex; gap: 15px; align-items: center; justify-content: flex-end;
  }
  .bmo-search-input {
    flex: 0 0 50%; 
    background: rgba(0,0,0,0.2); border: 1px solid var(--bmo-border);
    color: var(--bmo-text); padding: 6px 12px; border-radius: 6px;
    font-size: 14px; outline: none;
  }
  .bmo-search-input:focus { border-color: var(--bmo-accent); }
  .bmo-search-label { font-size: 13px; color: var(--bmo-dim); display: flex; gap: 6px; align-items: center; cursor: pointer; user-select: none; }

  /* Tree */
  .bmo-panel {
    background: var(--bmo-panel); border: 1px solid var(--bmo-border);
    border-radius: var(--bmo-radius); overflow: visible;
  }
  .bmo-tree { padding: 8px 0; }
  
  .bmo-row {
    display: flex; align-items: center; padding: 2px 10px 2px 0;
    height: var(--bmo-row-height); 
    border-bottom: 1px solid transparent;
  }
  .bmo-row:hover { background: rgba(125,125,125,0.05); }

  .bmo-row.active-bookmark {
    background: rgba(94, 240, 194, 0.08);
  }
  .bmo-row.active-bookmark .bmo-name { font-weight: 700; color: #5ef0c2; }
  
  .bmo-row.selected-bookmark {
    background: rgba(94, 240, 194, 0.15);
    border-bottom: 1px solid rgba(94, 240, 194, 0.4);
  }

  .bmo-code-badge.active { background: #5ef0c2; color: #000; animation: pulseBadge 2s infinite; }

  @keyframes pulseBadge {
    0% { opacity: 0.8; }
    50% { opacity: 1; box-shadow: 0 0 5px #5ef0c2; }
    100% { opacity: 0.8; }
  }

  .bmo-row.move-target { cursor: pointer; border-bottom: 1px dashed var(--bmo-border); }
  .bmo-row.move-target:hover { background: var(--bmo-accent); color: #000; }
  .bmo-row.move-target:hover .bmo-icon,
  .bmo-row.move-target:hover .bmo-name { color: #000; }

  .bmo-indent { width: 20px; flex-shrink: 0; }
  .bmo-twisty { width: 20px; text-align: center; cursor: pointer; color: var(--bmo-dim); line-height: var(--bmo-row-height); font-size: 10px; }
  .bmo-icon { width: 24px; text-align: center; font-size: 16px; margin-right: 6px; line-height: var(--bmo-row-height); }

  .bmo-name {
    flex: 1 1 auto; 
    min-width: 50px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    font-size: var(--bmo-font-size); font-weight: 500; padding-right: 15px;
  }
  .bmo-name.folder { color: var(--bmo-accent); }
  
  .bmo-rename-input {
    flex: 1 1 auto; background: #000; color: #fff; border: 1px solid var(--bmo-accent);
    padding: 2px 4px; font-size: 13px; outline: none;
  }

  .bmo-content { flex: 2; min-width: 0; display: flex; align-items: center; gap: 10px; }
  .bmo-url-wrap { flex: 1; min-width: 0; display: flex; align-items: center; font-family: var(--bmo-mono); font-size: 13px; color: var(--bmo-dim); }
  .bmo-link { color: var(--bmo-dim); text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; width: 100%; }
  .bmo-link:hover { color: var(--bmo-accent); text-decoration: underline; }

  .bmo-code-badge { font-size: 10px; font-weight: bold; background: #eab308; color: #000; padding: 1px 4px; border-radius: 3px; margin-right: 6px; }
  .bmo-size-badge { font-size: 10px; border: 1px solid var(--bmo-border); color: var(--bmo-success); padding: 0 4px; border-radius: 3px; margin-right: 6px; }
  .bmo-code-snippet { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.6; cursor: copy; }

  .bmo-meta { flex-shrink: 0; display: flex; align-items: center; justify-content: flex-end; gap: 6px; margin-left: auto; min-width: 110px; }
  .bmo-date { font-size: 11px; color: var(--bmo-dim); opacity: 0.5; margin-right: 4px; }
  .bmo-menu-btn {
    border: none; background: transparent; color: var(--bmo-text);
    opacity: 0.6; cursor: pointer; font-size: 16px; font-weight: bold; padding: 0 6px; flex-shrink: 0;
  }
  .bmo-menu-btn:hover { opacity: 1; color: var(--bmo-accent); }
  .bmo-mini-btn {
    border: none; background: transparent; color: var(--bmo-accent);
    opacity: 0.8; cursor: pointer; padding: 0 4px;
  }
  .bmo-mini-btn:hover { transform: scale(1.2); opacity: 1; }

  .bmo-context-menu {
    position: absolute; width: 140px; background: var(--bmo-select-bg);
    border: 1px solid var(--bmo-border); border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4); z-index: 9999;
    padding: 4px; display: flex; flex-direction: column;
  }
  .bmo-menu-item {
    padding: 8px 12px; font-size: 13px; cursor: pointer; border-radius: 4px; color: var(--bmo-text);
  }
  .bmo-menu-item:hover { background: rgba(255,255,255,0.1); }
  .bmo-menu-item.danger { color: var(--bmo-danger); }
  .bmo-menu-item.danger:hover { background: rgba(255,107,122,0.15); }
  `;
  }

  prettyBytes(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB'];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
      bytes /= 1024;
      i++;
    }
    return bytes.toFixed(1) + ' ' + units[i];
  }

}

