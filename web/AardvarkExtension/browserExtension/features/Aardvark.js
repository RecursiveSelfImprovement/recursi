class Aardvark {
  constructor() {
    // Core State
    this.currentElement = null;
    this.listenerAttached = false;
    this.globalVarCounter = 1;
    this.mouseMoveHandler = this.elementMouseHandler.bind(this);

    // Sub-modules
    this.overlay = new AardvarkOverlay(this);
    this.actions = new AardvarkActions(this);
    this.styleEditor = new AardvarkStyleEditor(this);

    this.radialMenu = null;
    this._aardvarkContextMenuHandler = null;

    // Configuration
    this.leafElems = { IMG: true, HR: true, BR: true, INPUT: true };

    // Command Definitions
    this.commands = [
      // --- NAVIGATION ---
      {
        command: { name: 'wider', key: 'w', suppressPopup: false },
        description: '&Wider (parent)',
        handler: () => this.actions.selectParentElement(),
      },
      {
        command: { name: 'narrower', key: 'n', suppressPopup: false },
        description: '&Narrower (child)',
        handler: () => this.actions.selectChildElement(),
      },

      // --- EDITING & ACTIONS ---
      {
        command: 'remove',
        description: '&Remove element',
        handler: () => this.actions.removeCurrentElement(),
      },
      {
        command: 'isolate',
        description: '&Isolate element',
        handler: () => this.actions.isolateElement(),
      },
      {
        command: 'undo',
        description: '&Undo action',
        handler: () => this.actions.undo(),
      },

      {
        command: { name: 'text', key: 'e', suppressPopup: false },
        description: '&Edit Text',
        handler: () => this.actions.toggleContentEdit(),
      },
      {
        command: { name: 'style', key: 's', suppressPopup: false },
        description: '&Style editor',
        handler: () => this.styleEditor.openStyleEditor(),
      },

      // --- TOOLS ---
      {
        command: 'view source',
        description: '&View HTML source',
        handler: () => this.actions.viewSource(),
      },
      {
        command: { name: 'selector', key: 't', suppressPopup: false },
        description: 'Copy &Tag Selector',
        handler: () => this.actions.makeSelector(),
      },
      {
        command: { name: 'frame', key: 'f', suppressPopup: false },
        description: '&Frame Linked Page',
        handler: () => this.actions.openLinkInIframe(),
      },
      {
        command: 'lock',
        description: '&Lock/Unlock selection',
        handler: () => this.lockElements(),
      },
      {
        command: 'global',
        description: 'Create &global var',
        handler: () => this.actions.createGlobalReference(),
      },

      // --- LLM / AI ---
      {
        command: { name: 'capture', key: 'm', suppressPopup: false },
        description: '&Model Capture (LLM)',
        handler: () => this.actions.captureForLlm(),
      },
      {
        command: { name: 'clear captures', key: 'x', suppressPopup: false },
        description: 'Clear LLM captures (&X)',
        handler: () => this.actions.clearLlmCaptures(),
      },
      {
        command: 'play',
        description: 'Run WebDiag from &Clipboard',
        handler: () => this.actions.playWebDiagFromClipboard(),
      },

      // --- VISUALS ---
      /*{
        command: 'dark',
        description: 'Toggle &dark mode',
        handler: () => this.actions.dark(),
      },*/
      {
        command: 'blocks',
        description: 'Highlight &Big Blocks',
        handler: () => this.actions.toggleBigBlocks(),
      },

      // --- SYSTEM ---
      {
        command: 'help',
        description: 'Show &help menu',
        handler: () => this.overlay.showHelp(),
      },
      {
        command: { name: 'quit', key: 'Escape', suppressPopup: false },
        description: '&Quit Aardvark',
        handler: () => this.quit(),
      },
      {
        command: { name: 'quit_q', key: 'q', suppressPopup: false },
        description: 'Quit',
        handler: () => this.quit(),
        hidden: true,
      },

      // --- HIDDEN ---
      {
        command: { name: 'fontzy', suppressPopup: true },
        description: 'Apply to &Fontzy',
        handler: () => this.actions.sendToFontzy(),
        hidden: true,
      },
    ];
  }

  init() {
    this.overlay.setStyles();
    this.attachListener();
    this.attachKeyboardHandlers();
    this.attachContextMenuHandler();
    this.overlay.createStatusPanel();

    this.scraperResults = [];
    this.scraperPaused = false;
    this.scraperRunning = false;
    this.scraperLogEl = null;
  }

  attachListener() {
    document.body.addEventListener('mousemove', this.mouseMoveHandler);
    this.listenerAttached = true;
  }

  elementMouseHandler(event) {
    try {
      if (
        this.radialMenu &&
        this.radialMenu.isOpen &&
        this.radialMenu.isOpen()
      ) {
        return;
      }
    } catch (e) {}

    const element = event.target;

    if (
      !element ||
      element.hasAttribute('data-style-exclude') ||
      element.closest('[data-style-exclude]') ||
      element.closest('.aardvark_highlight') ||
      element.closest('.aardvark_infoElement') ||
      element.closest('.aardvark_status') ||
      element.closest('.radial-menu-root')
    ) {
      this.overlay.unselectCurrentElement();
      return;
    }

    try {
      if (this.actions && this.actions.resetTraversalHistory) {
        this.actions.resetTraversalHistory();
      }
    } catch (e) {}

    this.currentElement = element;
    this.overlay.highlightElement(element);
    this.overlay.displayElementInfo(element);
  }

  attachKeyboardHandlers() {
    this.commands.forEach(({ command, handler }) => {
      const key = typeof command === 'string' ? command : command.key;
      if (key) {
        KeystrokeHandler.addHandler(command, handler);
      }
    });
  }

  removeKeyboardHandlers() {
    this.commands.forEach(({ command }) => {
      if (typeof command === 'object') {
        KeystrokeHandler.removeHandler(command.name);
      } else {
        KeystrokeHandler.removeHandler(command);
      }
    });
  }

  lockElements() {
    if (this.listenerAttached) {
      document.body.removeEventListener('mousemove', this.mouseMoveHandler);
      this.listenerAttached = false;
      KeystrokeHandler.showPopup('Selection Locked');
    } else {
      this.attachListener();
      KeystrokeHandler.showPopup('Selection Unlocked');
    }
  }

  quit() {
    if (this.actions && this.actions.pickModeActive) {
      this.actions.quitPickMode();
    }
    if (this.radialMenu) this.radialMenu.close();
    this.removeContextMenuHandler();

    if (this.listenerAttached) {
      document.body.removeEventListener('mousemove', this.mouseMoveHandler);
      this.listenerAttached = false;
    }
    this.removeKeyboardHandlers();

    if (this.overlay) {
      this.overlay.unselectCurrentElement();
      this.overlay.removeStatusPanel();
    }

    const blocks = document.querySelectorAll('.aardvark_block_highlight');
    blocks.forEach((el) => {
      if (el.dataset.aardvarkOriginalOutline) {
        el.style.outline = el.dataset.aardvarkOriginalOutline;
        delete el.dataset.aardvarkOriginalOutline;
      } else {
        el.style.outline = '';
      }
      el.classList.remove('aardvark_block_highlight');
    });

    KeystrokeHandler.deactivate();

    if (this.overlay) {
      this.overlay.showDormantIcon(
        () => this.wakeUp(),
        () => this.fullQuit()
      );
    }
  }

  attachContextMenuHandler() {
    if (this._aardvarkContextMenuHandler) return;
    this._aardvarkContextMenuHandler = (e) => this._onContextMenu(e);
    document.addEventListener(
      'contextmenu',
      this._aardvarkContextMenuHandler,
      true
    );
  }

  removeContextMenuHandler() {
    if (!this._aardvarkContextMenuHandler) return;
    document.removeEventListener(
      'contextmenu',
      this._aardvarkContextMenuHandler,
      true
    );
    this._aardvarkContextMenuHandler = null;
  }

  _onContextMenu(event) {
    try {
      const el = event && event.target ? event.target : null;
      if (!el) return;

      if (
        el.hasAttribute('data-style-exclude') ||
        el.closest('[data-style-exclude]') ||
        el.closest('.aardvark_highlight') ||
        el.closest('.aardvark_infoElement') ||
        el.closest('.aardvark_status') ||
        el.closest('.radial-menu-root')
      ) {
        return;
      }

      this.currentElement = el;
      try {
        if (this.actions && this.actions.resetTraversalHistory) {
          this.actions.resetTraversalHistory();
        }
      } catch (e) {}

      this.overlay.highlightElement(el);
      this.overlay.displayElementInfo(el);

      event.preventDefault();
      event.stopPropagation();
      if (event.stopImmediatePropagation) event.stopImmediatePropagation();

      if (!this.radialMenu) {
        this.radialMenu = new AardvarkRadialMenu(this);
      }

      if (this.radialMenu.isOpen()) {
        this.radialMenu.close();
        return;
      }

      const items = this._buildRadialMenuItems();
      this.radialMenu.openAt(event.clientX, event.clientY, items);
    } catch (e) {
      console.error('[Aardvark] context menu error', e);
    }
  }

  _buildRadialMenuItems() {
    const items = [];

    items.push({
      key: 'W',
      label: 'Wider',
      title: 'Select parent',
      keepOpen: true,
      onClick: () => {
        this.actions.selectParentElement();
        this._refreshRadialMenu();
      },
    });

    const canNarrow =
      this.actions &&
      this.actions.isNarrowerAvailable &&
      this.actions.isNarrowerAvailable();

    if (canNarrow) {
      items.push({
        key: 'N',
        label: 'Narrower',
        title: 'Select child',
        keepOpen: true,
        onClick: () => {
          this.actions.selectChildElement();
          this._refreshRadialMenu();
        },
      });
    }

    items.push({
      key: 'E',
      label: 'Edit',
      title: 'Edit Text Content',
      onClick: () => this.actions.toggleContentEdit(),
    });

    if (this.styleEditor && this.styleEditor.hasPreviousStyles()) {
      items.push({
        key: 'L',
        label: 'Last',
        title: 'Apply previous styles',
        onClick: () => this.styleEditor.applyPreviousStyles(),
      });
    }

    items.push({
      key: 'S',
      label: 'Style',
      title: 'Style editor',
      onClick: () => this.styleEditor.openStyleEditor(),
    });

    items.push({
      key: 'G',
      label: 'Global',
      title: 'Create global var',
      onClick: () => this.actions.createGlobalReference(),
    });

    if (
      this.actions &&
      this.actions.isUndoAvailable &&
      this.actions.isUndoAvailable()
    ) {
      items.push({
        key: 'U',
        label: 'Undo',
        title: 'Undo last action',
        onClick: () => this.actions.undo(),
      });
    }

    items.push({
      key: 'V',
      label: 'View Src',
      title: 'View HTML source',
      onClick: () => this.actions.viewSource(),
    });

    items.push({
      key: 'I',
      label: 'Isolate',
      title: 'Isolate element',
      onClick: () => this.actions.isolateElement(),
    });

    items.push({
      key: 'R',
      label: 'Remove',
      title: 'Remove element',
      onClick: () => this.actions.removeCurrentElement(),
    });

    return items;
  }

  _refreshRadialMenu() {
    try {
      if (this.radialMenu && this.radialMenu.isOpen) {
        const items = this._buildRadialMenuItems();
        this.radialMenu.refresh(items, { animate: false });
      }
    } catch (e) {
      console.error('[Aardvark] refresh error', e);
    }
  }

  _buildRadialItems() {
    return this._buildRadialMenuItems();
  }

  wakeUp() {
    if (this.overlay) this.overlay.removeDormantIcon();

    this.listenerAttached = false;
    this.attachListener();
    this.attachKeyboardHandlers();
    this.attachContextMenuHandler();
    this.overlay.createStatusPanel();

    KeystrokeHandler.activate();
    KeystrokeHandler.showPopup('Aardvark Active');
  }

  fullQuit() {
    if (this.overlay) {
      this.overlay.removeDormantIcon();
    }
    console.log('Aardvark Terminated');
  }

  openDpcScraperDialog() {
    const container = makeElement('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        height: '100%',
        width: '100%',
        padding: '10px',
        boxSizing: 'border-box',
        background: '#222',
      },
    });

    const title = makeElement(
      'h3',
      { style: { margin: '0', color: '#ffd700' } },
      'DPC Map Scraper'
    );

    const configRow = makeElement('div', {
      style: {
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        color: '#ddd',
      },
    });

    configRow.appendChild(makeElement('span', 'Batch:'));
    const countInput = makeElement('input', {
      type: 'number',
      value: '3',
      style: {
        width: '50px',
        background: '#333',
        color: '#fff',
        border: '1px solid #555',
        padding: '4px',
      },
    });
    configRow.appendChild(countInput);

    configRow.appendChild(makeElement('span', 'Delay (s):'));
    const delayInput = makeElement('input', {
      type: 'text',
      value: '1-3',
      style: {
        width: '60px',
        background: '#333',
        color: '#fff',
        border: '1px solid #555',
        padding: '4px',
      },
    });
    configRow.appendChild(delayInput);

    const actionRow = makeElement('div', {
      style: { display: 'flex', gap: '8px' },
    });
    const btnStyle =
      'padding: 6px 12px; cursor: pointer; border: none; border-radius: 4px; font-weight: bold; flex: 1; font-size: 12px;';

    const startBtn = makeElement('button', {
      style: btnStyle + 'background: #007acc; color: white;',
      textContent: 'Start',
      onclick: () => {
        if (this.scraperRunning) return;
        this.runDpcScraper(parseInt(countInput.value) || 3, delayInput.value);
      },
    });

    const pauseBtn = makeElement('button', {
      style: btnStyle + 'background: #d4a000; color: #111;',
      textContent: 'Pause',
      onclick: () => {
        this.scraperPaused = !this.scraperPaused;
        pauseBtn.textContent = this.scraperPaused ? 'Resume' : 'Pause';
        pauseBtn.style.background = this.scraperPaused ? '#28a745' : '#d4a000';
        pauseBtn.style.color = this.scraperPaused ? 'white' : '#111';
        this.logScraper(
          this.scraperPaused ? '--- PAUSED ---' : '--- RESUMED ---'
        );
      },
    });

    const jsonBtn = makeElement('button', {
      style: btnStyle + 'background: #444; color: white;',
      textContent: 'View JSON',
      onclick: () => this.showScraperResults(),
    });

    actionRow.append(startBtn, pauseBtn, jsonBtn);

    const logArea = makeElement('textarea', {
      style: {
        flex: '1',
        width: '100%',
        fontFamily: 'monospace',
        fontSize: '11px',
        background: '#111',
        color: '#0f0',
        border: '1px solid #444',
        padding: '8px',
        boxSizing: 'border-box',
        resize: 'none',
      },
      placeholder: 'Log output...',
      readOnly: true,
    });
    this.scraperLogEl = logArea;

    container.append(title, configRow, actionRow, logArea);

    new DialogBox({
      title: 'DPC Automation',
      content: container,
      width: '400px',
      height: '500px',
      position: [20, 80],
      allowMaximize: true,
      noPadding: true,
    });
  }

  async runDpcScraper(count, delayStr) {
    this.scraperResults = [];
    this.scraperRunning = true;
    this.scraperPaused = false;
    this.logScraper(`Starting batch of ${count}. Delay: ${delayStr}s`);

    const markers = Array.from(document.querySelectorAll('.dpc-marker'));
    if (!markers.length) {
      this.logScraper('Error: No ".dpc-marker" elements found.');
      this.scraperRunning = false;
      return;
    }

    const selected = [];
    const pool = [...markers];
    for (let i = 0; i < count && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      selected.push(pool[idx]);
      pool.splice(idx, 1);
    }

    for (let i = 0; i < selected.length; i++) {
      while (this.scraperPaused) await new Promise((r) => setTimeout(r, 500));

      const marker = selected[i];
      this.logScraper(`--- Item ${i + 1}/${selected.length} ---`);

      const coords = this._getMarkerCoords(marker);

      try {
        marker.click();
      } catch (e) {
        this.logScraper('Error clicking marker: ' + e.message);
        continue;
      }

      await this._scraperWait(delayStr);

      const sidebar = document.querySelector('.ant-drawer-content');
      if (!sidebar) {
        this.logScraper('Sidebar not found.');
        continue;
      }

      const basicData = this._scrapeSidebar(sidebar);

      const record = {
        id: i + 1,
        markerLocation: coords,
        ...basicData,
        fullProfileData: {},
      };

      if (record.profileLink) {
        await this._scraperWait(delayStr);
        this.logScraper('Loading iframe...');

        const iframe = document.createElement('iframe');
        Object.assign(iframe.style, {
          position: 'fixed',
          left: '-9999px',
          width: '1200px',
          height: '1200px',
        });
        iframe.src = record.profileLink;
        document.body.appendChild(iframe);

        await new Promise((r) => setTimeout(r, 3500));

        try {
          const doc = iframe.contentDocument;
          if (doc) {
            record.fullProfileData = this._scrapeProfile(doc);
            this.logScraper('Iframe data captured.');
          } else {
            record.fullProfileData = { error: 'CORS/Access Blocked' };
          }
        } catch (err) {
          this.logScraper('Iframe error: ' + err.message);
          record.fullProfileData = { error: err.message };
        }
        iframe.remove();
      }

      this.scraperResults.push(record);
      this.logScraper(`Record saved. Name: ${record.name}`);

      const closeBtn = sidebar.querySelector('.ant-drawer-close');
      if (closeBtn) {
        try {
          closeBtn.click();
        } catch (e) {}
      } else {
        document.body.click();
      }

      await this._scraperWait(delayStr);
    }

    this.scraperRunning = false;
    this.logScraper('Batch complete.');
    this.showScraperResults();
  }

  logScraper(msg) {
    if (this.scraperLogEl) {
      this.scraperLogEl.value += `[${new Date().toLocaleTimeString()}] ${msg}\n`;
      this.scraperLogEl.scrollTop = this.scraperLogEl.scrollHeight;
    }
    console.log(`[DPC Scraper] ${msg}`);
  }

  async _scraperWait(delayStr) {
    let min = 1,
      max = 1;
    if (typeof delayStr === 'string' && delayStr.includes('-')) {
      const parts = delayStr.split('-').map((s) => parseFloat(s.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        min = Math.min(parts[0], parts[1]);
        max = Math.max(parts[0], parts[1]);
      }
    } else {
      const val = parseFloat(delayStr);
      if (!isNaN(val)) min = max = val;
    }
    const duration = Math.random() * (max - min) + min;
    await new Promise((resolve) => setTimeout(resolve, duration * 1000));
  }

  showScraperResults() {
    const jsonOutput = JSON.stringify(this.scraperResults, null, 2);

    const container = makeElement('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        padding: '0',
      },
    });

    const textArea = makeElement('textarea', {
      style: {
        flex: '1',
        width: '100%',
        fontFamily: 'monospace',
        whiteSpace: 'pre',
        background: '#222',
        color: '#fff',
        border: 'none',
        padding: '10px',
        boxSizing: 'border-box',
        resize: 'none',
        fontSize: '12px',
      },
    });

    textArea.value = jsonOutput;

    const footer = makeElement('div', {
      style: {
        padding: '8px',
        background: '#333',
        textAlign: 'right',
        borderTop: '1px solid #444',
      },
    });

    const copyBtn = makeElement('button', {
      className: 'dialog-button primary',
      style:
        'padding: 6px 15px; cursor: pointer; background: #007acc; color: white; border: none; border-radius: 4px;',
      textContent: 'Copy JSON',
      onclick: () => {
        textArea.select();
        document.execCommand('copy');
        copyBtn.textContent = 'Copied!';
        setTimeout(() => (copyBtn.textContent = 'Copy JSON'), 2000);
      },
    });

    footer.appendChild(copyBtn);
    container.append(textArea, footer);

    new DialogBox({
      title: `Results (${this.scraperResults.length})`,
      width: '600px',
      height: '500px',
      content: container,
      noPadding: true,
      allowMaximize: true,
    });
  }

  _getMarkerCoords(marker) {
    const rect = marker.getBoundingClientRect();
    const markerCenterX = rect.left + rect.width / 2;
    const markerCenterY = rect.top + rect.height / 2;

    let mapContainer = null;
    let curr = marker.parentElement;

    while (curr && curr !== document.body) {
      const style = window.getComputedStyle(curr);
      const w = parseFloat(style.width);
      const h = parseFloat(style.height);

      if (
        (w > 400 && h > 300) ||
        curr.classList.contains('leaflet-container') ||
        curr.classList.contains('gm-style') ||
        curr.id.includes('map')
      ) {
        mapContainer = curr;
        break;
      }
      curr = curr.parentElement;
    }

    if (!mapContainer) mapContainer = document.body;

    const mapRect = mapContainer.getBoundingClientRect();

    const x = markerCenterX - mapRect.left;
    const y = markerCenterY - mapRect.top;

    return {
      x: parseFloat(x.toFixed(2)),
      y: parseFloat(y.toFixed(2)),
    };
  }

  _scrapeSidebar(container) {
    const data = {
      name: 'Unknown',
      tags: [],
      details: {},
      profileLink: null,
    };

    try {
      const h3 = container.querySelector('.PracticeDetails h3');
      data.name = h3
        ? h3.innerText.trim()
        : container.querySelector('.ant-drawer-title')?.innerText.trim() ||
          'Unknown';

      container
        .querySelectorAll('.Tag')
        .forEach((t) => data.tags.push(t.innerText.trim()));

      container.querySelectorAll('.IconItem').forEach((item) => {
        const text = item.innerText.trim();
        const link = item.querySelector('a')?.href;

        if (item.querySelector('.anticon-check-circle'))
          data.details.status = text;
        else if (item.querySelector('.anticon-shop'))
          data.details.address = text;
        else if (item.querySelector('.anticon-phone'))
          data.details.phone = text;
        else if (item.querySelector('.anticon-link'))
          data.details.website = text;
        else if (item.querySelector('.anticon-printer'))
          data.details.fax = text;
        else if (item.querySelector('.anticon-environment') && link)
          data.details.directionsUrl = link;
        else if (item.querySelector('.anticon-user'))
          data.details.doctorName = text;
      });

      container.querySelectorAll('.InfoItem').forEach((item) => {
        const labelEl = item.querySelector('small');
        if (!labelEl) return;

        const label = labelEl.innerText
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_');
        const contentEl = item.querySelector('div[style*="margin-top"]');

        if (contentEl) {
          data.details[label] = this._parseTableOrText(contentEl);
        }
      });

      const links = Array.from(container.querySelectorAll('a'));
      const profLink = links.find((a) =>
        a.innerText.includes('View Full Profile')
      );
      if (profLink) data.profileLink = profLink.href;
    } catch (e) {
      this.logScraper('Error scraping sidebar: ' + e.message);
    }

    return data;
  }

  _scrapeProfile(doc) {
    const profile = {
      metaDescription: '',
      doctorName: '',
      logoUrl: '',
      sections: {},
    };

    try {
      const meta = doc.querySelector('meta[name="description"]');
      if (meta) profile.metaDescription = meta.content;

      const logo =
        doc.querySelector('img.logo') || doc.querySelector('.Header img');
      if (logo) profile.logoUrl = logo.src;

      const personRow = doc.querySelector('.PersonRow');
      if (personRow) {
        const h4 = personRow.querySelector('h4');
        if (h4) profile.doctorName = h4.innerText.trim();
        const spec = personRow.querySelector('p small');
        if (spec) profile.doctorSpecialty = spec.innerText.trim();
      }

      const sections = doc.querySelectorAll('.section');
      sections.forEach((sec) => {
        const titleEl = sec.querySelector('.sectiontitle, h2, h3');
        if (!titleEl) return;

        const title = titleEl.innerText.toLowerCase().trim();
        const infoData = {};
        const infoItems = sec.querySelectorAll('.InfoItem');

        if (infoItems.length > 0) {
          infoItems.forEach((item) => {
            const labelEl = item.querySelector('small');
            if (labelEl) {
              const key = labelEl.innerText.trim();
              const valContainer = item.querySelector(
                'div[style*="margin-top"]'
              );
              if (valContainer) {
                infoData[key] = this._parseTableOrText(valContainer);
              }
            }
          });
          profile.sections[title] = infoData;
        } else {
          const contentEl = sec.querySelector('.sectionitem');
          if (contentEl) {
            profile.sections[title] = contentEl.innerText.trim();
          }
        }
      });

      if (profile.sections['prices and fees']) {
        profile.pricing = profile.sections['prices and fees'];
      }
    } catch (e) {
      profile.error = 'Error parsing profile: ' + e.message;
    }

    return profile;
  }

  _parseTableOrText(element) {
    if (!element) return '';

    const tables = element.querySelectorAll('.table');
    if (tables.length > 0) {
      const results = {};
      tables.forEach((table) => {
        const rows = Array.from(table.children);
        rows.forEach((row) => {
          const els = Array.from(row.querySelectorAll('p, span, b, div'));
          const textNodes = els.filter(
            (e) => e.innerText.trim().length > 0 && e.children.length === 0
          );

          if (textNodes.length >= 2) {
            const k = textNodes[0].innerText.trim().replace(/:$/, '');
            const v = textNodes[textNodes.length - 1].innerText.trim();
            if (k && v) results[k] = v;
          }
        });
      });

      if (Object.keys(results).length > 0) return results;
    }

    return element.innerText.trim();
  }

}

