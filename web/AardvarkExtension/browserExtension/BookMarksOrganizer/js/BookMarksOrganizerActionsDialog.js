class BookMarksOrganizerActionsDialog {
  constructor() {
    this._dlg = null;
    this._app = null;
    this._scanResults = null;
  }

  open(app) {
    this._app = app;
    this._ensureCss();

    if (this._dlg) {
      try {
        this._dlg.setZOnTop?.();
      } catch (_) {}
      return;
    }

    // Width is large, but height is 'auto' so CSS can constrain it
    const safeWidth = Math.min(900, window.innerWidth - 40);

    const initialContent = this._buildLandingUi();

    this._dlg = new DialogBox({
      title: 'Cleanup Manager',
      width: safeWidth,
      height: 'auto',
      closeOnEscape: true,
      content: initialContent,
      onClose: () => {
        this._dlg = null;
        this._scanResults = null;
      },
    });
  }

  _ensureCss() {
    applyCss(
      `
    /* 
       STRICT LAYOUT CONTROL 
       Forces the content to stay within 70% of viewport height.
    */
    .bmo-dlg-layout { 
      display: flex; 
      flex-direction: column; 
      height: 70vh; 
      max-height: 600px; 
      overflow: hidden; 
      color: #eee; 
      font-family: sans-serif; 
    }
    
    .bmo-loading-state { display: flex; align-items: center; justify-content: center; height: 100%; font-size: 18px; color: #888; }
    
    /* Scrollable areas */
    .bmo-opt-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; padding: 0 20px; overflow-y: auto; }
    
    .bmo-rev-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; background: rgba(0,0,0,0.2); border-bottom: 1px solid rgba(255,255,255,0.1); flex-shrink: 0; }
    
    .bmo-rev-list { 
      flex: 1; 
      overflow-y: auto; 
      overflow-x: hidden; 
      min-height: 0; 
      padding: 10px; 
      background: rgba(0,0,0,0.1); 
    }
    
    /* Rows */
    .bmo-grp { margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; overflow: hidden; max-width: 100%; }
    .bmo-grp-head { background: rgba(255,255,255,0.05); padding: 8px 12px; font-family: monospace; font-size: 12px; color: #5ef0c2; border-bottom: 1px solid rgba(255,255,255,0.05); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    
    .bmo-item { display: flex; align-items: center; padding: 6px 10px; gap: 10px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.02); max-width: 100%; }
    .bmo-item.will-delete { background: rgba(255, 107, 122, 0.08); }
    .bmo-item.keep { background: rgba(94, 240, 194, 0.03); }
    
    .bmo-chk { transform: scale(1.2); cursor: pointer; flex-shrink: 0; }
    .bmo-type-icon { font-size: 16px; width: 20px; text-align: center; flex-shrink: 0; }
    
    .bmo-info { flex: 1; min-width: 0; }
    .bmo-path { font-size: 10px; color: #777; margin-bottom: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bmo-main-text { font-size: 13px; color: #ddd; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bmo-meta { display: flex; flex-direction: column; align-items: flex-end; font-size: 11px; color: #666; min-width: 70px; flex-shrink: 0; }
    
    .bmo-footer { padding: 15px; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid rgba(255,255,255,0.1); background: #222; flex-shrink: 0; }
    
    /* Buttons & Cards */
    .bmo-opt-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; text-align: center; }
    .bmo-opt-card:hover { background: rgba(255,255,255,0.1); border-color: #5ef0c2; transform: translateY(-2px); }
    .bmo-opt-icon { font-size: 28px; margin-bottom: 10px; }
    .bmo-opt-title { font-weight: 600; font-size: 14px; margin-bottom: 6px; color: #fff; }
    .bmo-opt-desc { font-size: 11px; color: #aaa; line-height: 1.3; }
    
    .bmo-btn-small { padding: 4px 8px; font-size: 11px; cursor: pointer; background: transparent; border: 1px solid #555; color: #aaa; border-radius: 4px; }
    .bmo-btn { padding: 8px 16px; cursor: pointer; background: #333; color: #eee; border: 1px solid #555; border-radius: 4px; }
    .bmo-btn-danger { padding: 8px 16px; cursor: pointer; background: rgba(255, 107, 122, 0.2); color: #ff6b7a; border: 1px solid #ff6b7a; border-radius: 4px; }
    .bmo-btn-danger:hover { background: rgba(255, 107, 122, 0.3); }
    .bmo-btn-danger:disabled { opacity: 0.5; cursor: default; }
  `,
      'bmo_adv_dialog_css_fix'
    );
  }

  _buildUi() {
    const container = makeElement('div', { className: 'bmo-adv-col' });

    // --- 1. Duplicate URLs Card ---
    const urlCard = makeElement(
      'div',
      { className: 'bmo-adv-card' },
      makeElement('div', { className: 'bmo-adv-h' }, 'Duplicate URLs'),
      makeElement(
        'div',
        { className: 'bmo-adv-p' },
        'Find bookmarks that point to the exact same URL. Keep the first one found, delete others.'
      ),
      makeElement(
        'div',
        { className: 'bmo-adv-res', id: 'url-res' },
        'Status: Ready to scan.'
      )
    );

    const btnScanUrl = makeElement(
      'button',
      {
        className: 'bmo-btn',
        onclick: async () => {
          const resEl = urlCard.querySelector('#url-res');
          resEl.textContent = 'Scanning...';
          const stats = await this._app._scanDuplicates();
          if (stats.urlDups > 0) {
            resEl.textContent = `Found ${stats.urlDups} duplicate URLs.`;
            resEl.style.color = '#ff6b7a';
            btnDelUrl.style.display = 'inline-block'; // Show delete button
          } else {
            resEl.textContent = 'No duplicates found.';
            resEl.style.color = '#5ef0c2';
            btnDelUrl.style.display = 'none';
          }
        },
      },
      'Scan for Duplicates'
    );

    const btnDelUrl = makeElement(
      'button',
      {
        className: 'bmo-btn',
        style: {
          display: 'none',
          marginLeft: '10px',
          borderColor: '#ff6b7a',
          color: '#ff6b7a',
        },
        onclick: async () => {
          await this._app._deleteDuplicateUrlsKeepNewest();
          urlCard.querySelector('#url-res').textContent = 'Cleanup complete.';
          btnDelUrl.style.display = 'none';
        },
      },
      'Clean Up'
    );

    urlCard.appendChild(btnScanUrl);
    urlCard.appendChild(btnDelUrl);

    // --- 2. Duplicate Names Card ---
    const nameCard = makeElement(
      'div',
      { className: 'bmo-adv-card' },
      makeElement(
        'div',
        { className: 'bmo-adv-h' },
        'Duplicate Names (Per Folder)'
      ),
      makeElement(
        'div',
        { className: 'bmo-adv-p' },
        'Find items in the SAME folder with the same name. Useful for cleaning up accidental multi-imports.'
      ),
      makeElement(
        'div',
        { className: 'bmo-adv-res', id: 'name-res' },
        'Status: Ready to scan.'
      )
    );

    const btnScanName = makeElement(
      'button',
      {
        className: 'bmo-btn',
        onclick: async () => {
          const resEl = nameCard.querySelector('#name-res');
          resEl.textContent = 'Scanning...';
          const stats = await this._app._scanDuplicates();
          if (stats.nameDups > 0) {
            resEl.textContent = `Found ${stats.nameDups} items with duplicate names in same folders.`;
            resEl.style.color = '#ff6b7a';
            btnDelName.style.display = 'inline-block';
          } else {
            resEl.textContent = 'No name collisions found.';
            resEl.style.color = '#5ef0c2';
            btnDelName.style.display = 'none';
          }
        },
      },
      'Scan for Duplicates'
    );

    const btnDelName = makeElement(
      'button',
      {
        className: 'bmo-btn',
        style: {
          display: 'none',
          marginLeft: '10px',
          borderColor: '#ff6b7a',
          color: '#ff6b7a',
        },
        onclick: async () => {
          await this._app._deleteDuplicateNamesKeepNewestPerFolder();
          nameCard.querySelector('#name-res').textContent = 'Cleanup complete.';
          btnDelName.style.display = 'none';
        },
      },
      'Clean Up'
    );

    nameCard.appendChild(btnScanName);
    nameCard.appendChild(btnDelName);

    container.appendChild(urlCard);
    container.appendChild(nameCard);
    return container;
  }

  _showMenu() {
    const body = this._buildMenuUi();
    if (this._dlg.setContent) this._dlg.setContent(body);
  }

  _buildMenuUi() {
    const layout = makeElement('div', { className: 'bmo-dlg-layout' });

    layout.appendChild(
      makeElement(
        'div',
        { style: { textAlign: 'center', marginTop: '30px' } },
        makeElement(
          'h2',
          { style: { margin: 0, fontSize: '20px' } },
          'Cleanup Wizard'
        )
      )
    );

    const grid = makeElement('div', { className: 'bmo-opt-grid' });

    // Card 1: URLs
    grid.appendChild(
      makeElement(
        'div',
        {
          className: 'bmo-opt-card',
          onclick: () => this._launchReview('url'),
        },
        makeElement('div', { className: 'bmo-opt-icon' }, '🔗'),
        makeElement('div', { className: 'bmo-opt-title' }, 'Duplicate URLs'),
        makeElement(
          'div',
          { className: 'bmo-opt-desc' },
          'Find items pointing to the same address. Groups global duplicates together.'
        )
      )
    );

    // Card 2: Names
    grid.appendChild(
      makeElement(
        'div',
        {
          className: 'bmo-opt-card',
          onclick: () => this._launchReview('name'),
        },
        makeElement('div', { className: 'bmo-opt-icon' }, '📂'),
        makeElement('div', { className: 'bmo-opt-title' }, 'Duplicate Names'),
        makeElement(
          'div',
          { className: 'bmo-opt-desc' },
          'Find items with the same name inside the same folder.'
        )
      )
    );

    layout.appendChild(grid);
    return layout;
  }

  async _launchReview(mode) {
    // Loading Screen
    if (this._dlg.setContent) {
      this._dlg.setContent(
        makeElement(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '300px',
              fontSize: '16px',
              color: '#aaa',
            },
          },
          'Scanning library...'
        )
      );
    }

    const groups = await this._app.scanForReview(mode);

    if (groups.length === 0) {
      this._app.updateStatus('No duplicates found.', 'good');
      this._showMenu();
      return;
    }

    this._renderReviewUi(groups, mode);
  }

  _renderReviewUi(groups, mode) {
    const layout = makeElement('div', { className: 'bmo-dlg-layout' });

    let totalDupCount = 0;
    groups.forEach((g) => (totalDupCount += g.items.length - 1));

    const header = makeElement(
      'div',
      { className: 'bmo-rev-header' },
      makeElement(
        'div',
        {},
        makeElement(
          'strong',
          { style: { fontSize: '15px' } },
          `Review: ${mode.toUpperCase()}`
        ),
        makeElement(
          'div',
          { className: 'bmo-rev-stats' },
          `Found ${groups.length} groups (${totalDupCount} duplicates)`
        )
      ),
      makeElement(
        'button',
        {
          className: 'bmo-btn-small',
          onclick: () => this._updateContent(this._buildLandingUi()),
        },
        'Back'
      )
    );

    const list = makeElement('div', { className: 'bmo-rev-list' });
    const checkboxes = [];

    groups.forEach((group) => {
      group.items.sort((a, b) => (b.date || 0) - (a.date || 0));
      const groupEl = makeElement('div', { className: 'bmo-grp' });

      let fullLabel = group.key;
      if (mode === 'name' && fullLabel.includes('::'))
        fullLabel = fullLabel.split('::')[1];

      groupEl.appendChild(
        makeElement(
          'div',
          {
            className: 'bmo-grp-head',
            title: this._safeLabel(fullLabel, 300),
          },
          this._safeLabel(fullLabel, 100)
        )
      );

      group.items.forEach((item, index) => {
        const isDelete = index > 0;
        const isFolder = !item.node.url;

        const chk = makeElement('input', {
          type: 'checkbox',
          className: 'bmo-chk',
          checked: isDelete,
        });
        chk.dataset.id = item.id;
        checkboxes.push(chk);

        const d = item.date ? new Date(item.date) : null;
        const dateStr = d
          ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
              2,
              '0'
            )}-${String(d.getDate()).padStart(2, '0')}`
          : '';

        const row = makeElement(
          'div',
          { className: `bmo-item ${isDelete ? 'will-delete' : 'keep'}` },
          chk,
          makeElement(
            'div',
            {
              className: 'bmo-type-icon',
              title: isFolder ? 'Folder' : 'Bookmark',
            },
            isFolder ? '📁' : '🔗'
          ),
          makeElement(
            'div',
            { className: 'bmo-info' },
            makeElement(
              'div',
              { className: 'bmo-path' },
              this._safeLabel(item.path || 'Root', 60)
            ),
            makeElement(
              'div',
              { className: 'bmo-main-text', title: item.name },
              item.name
            )
          ),
          makeElement(
            'div',
            { className: 'bmo-meta' },
            makeElement('span', {}, dateStr)
          )
        );

        row.onclick = (e) => {
          if (e.target !== chk) {
            chk.checked = !chk.checked;
            chk.dispatchEvent(new Event('change'));
          }
        };
        chk.onchange = () => {
          row.className = `bmo-item ${chk.checked ? 'will-delete' : 'keep'}`;
          this._updateDeleteBtn(footer, checkboxes);
        };
        groupEl.appendChild(row);
      });
      list.appendChild(groupEl);
    });

    const footer = makeElement('div', { className: 'bmo-footer' });
    this._createFooterControls(footer, checkboxes);

    layout.appendChild(header);
    layout.appendChild(list);
    layout.appendChild(footer);

    this._updateContent(layout);
    this._updateDeleteBtn(footer, checkboxes);
  }

  _updateDeleteCount(layout) {
    const checked = layout.querySelectorAll('.bmo-chk:checked');
    const btn = layout.querySelector('.bmo-footer button');
    if (btn) btn.textContent = `Delete ${checked.length} Items`;
  }

  async _executeDelete(checkboxes) {
    const idsToDelete = checkboxes
      .filter((c) => c.checked)
      .map((c) => c.dataset.id);
    if (idsToDelete.length === 0) return;

    this._updateContent(
      makeElement(
        'div',
        {
          className: 'bmo-loading-state',
          style: { height: '300px' },
        },
        `Deleting ${idsToDelete.length} items...`
      )
    );

    await this._app.deleteBookmarksBulk(idsToDelete);

    this._app.updateStatus('Cleanup complete.', 'good');
    this._dlg.close();
  }

  _buildLandingUi() {
    const layout = makeElement('div', { className: 'bmo-dlg-layout' });

    layout.appendChild(
      makeElement(
        'div',
        {
          style: { textAlign: 'center', marginBottom: '20px', flexShrink: 0 },
        },
        makeElement(
          'h2',
          { style: { margin: '0 0 5px 0', fontSize: '18px', color: '#fff' } },
          'Advanced Tools'
        ),
        makeElement(
          'div',
          { style: { color: '#aaa', fontSize: '13px' } },
          'Select a tool or scan mode below.'
        )
      )
    );

    const grid = makeElement('div', { className: 'bmo-opt-grid' });

    grid.appendChild(
      this._createOptionCard(
        '🔗',
        'Duplicate URLs',
        'Finds identical links globally.',
        () => this._runScan('url')
      )
    );

    grid.appendChild(
      this._createOptionCard(
        '🎯',
        'Strict Match',
        'Matches only if Name AND URL are identical.',
        () => this._runScan('strict')
      )
    );

    grid.appendChild(
      this._createOptionCard(
        '📂',
        'Name Duplicates',
        'Finds items with the same Name inside the same Folder.',
        () => this._runScan('name')
      )
    );

    grid.appendChild(
      this._createOptionCard(
        '💾',
        'Export JSON',
        'Save a complete backup of your bookmarks tree.',
        () => {
          this._app.exportBookmarks();
          this._dlg.close();
        }
      )
    );

    grid.appendChild(
      this._createOptionCard(
        '📥',
        'Import JSON',
        'Restore bookmarks from backup. (WARNING: Overwrites current)',
        () => {
          this._app.importBookmarks();
          this._dlg.close();
        }
      )
    );

    layout.appendChild(grid);
    return layout;
  }

  _createOptionCard(icon, title, desc, onClick) {
    return makeElement(
      'div',
      {
        className: 'bmo-opt-card',
        onclick: onClick,
      },
      makeElement('div', { className: 'bmo-opt-icon' }, icon),
      makeElement('div', { className: 'bmo-opt-title' }, title),
      makeElement('div', { className: 'bmo-opt-desc' }, desc)
    );
  }

  async _runScan(mode) {
    this._updateContent(
      makeElement(
        'div',
        {
          className: 'bmo-loading-state',
          style: { height: '300px' },
        },
        'Scanning library...'
      )
    );

    // Give UI a moment to render
    await new Promise((r) => setTimeout(r, 50));

    // Check if Engine is ready
    if (typeof this._app.scanForReview !== 'function') {
      this._app.updateStatus('Error: Core logic not found.', 'bad');
      this._dlg.close();
      return;
    }

    const groups = await this._app.scanForReview(mode);

    if (!groups || groups.length === 0) {
      this._app.updateStatus('No duplicates found.', 'good');
      this._updateContent(this._buildLandingUi());
      return;
    }

    this._scanResults = groups;
    this._renderReviewUi(groups, mode);
  }

  _createFooterControls(container, checkboxes) {
    const btnCancel = makeElement(
      'button',
      {
        className: 'bmo-btn',
        onclick: () => this._updateContent(this._buildLandingUi()),
      },
      'Cancel'
    );
    const btnDelete = makeElement(
      'button',
      {
        className: 'bmo-btn-danger',
        onclick: () => this._executeDelete(checkboxes),
      },
      'Delete Selected'
    );
    container.appendChild(btnCancel);
    container.appendChild(btnDelete);
  }

  _updateDeleteBtn(footer, checkboxes) {
    const count = checkboxes.filter((c) => c.checked).length;
    const btn = footer.querySelector('.bmo-btn-danger');
    if (btn) {
      btn.textContent = count > 0 ? `Delete ${count} Items` : `Delete Selected`;
      btn.style.opacity = count > 0 ? '1' : '0.5';
      btn.disabled = count === 0;
    }
  }

  _updateContent(newElement) {
    if (!this._dlg) return;

    // Find the container reliably
    let container = this._dlg.contentElement || this._dlg.body;
    if (!container && this._dlg.element) {
      container =
        this._dlg.element.querySelector('.dialog-content') || this._dlg.element;
    }

    if (container) {
      container.innerHTML = '';
      container.appendChild(newElement);
    }
  }

  _safeLabel(str, maxLen = 100) {
    if (!str) return '';
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen) + '...';
  }

}

