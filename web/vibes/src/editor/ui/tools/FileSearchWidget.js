class FileSearchWidget {
  
  constructor(app) {
    this.app = app || window._dev_projectEditorInstance;
    this.element = this.render();
    this.isSearching = false;
    this.abortController = null;
  }

  getElement() {
    return this.element;
  }

  render() {
    const container = makeElement('div', {
      className: 'file-search-widget',
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        height: '400px', // Fixed height for the card content area
      },
    });

    const inputRow = makeElement('div', {
      style: { display: 'flex', gap: '8px' },
    });

    this.searchInput = makeElement('input', {
      type: 'text',
      placeholder: 'Search text in files...',
      style: {
        flex: 1,
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #555',
        backgroundColor: '#1e1e1e',
        color: '#eee',
      },
      onkeydown: (e) => {
        if (e.key === 'Enter') this.runSearch();
      },
    });

    this.searchBtn = makeElement('button', {
      textContent: 'Search',
      className: 'command-btn', // Reuse playground style
      style: { width: 'auto', backgroundColor: '#007acc' },
      onclick: () => this.runSearch(),
    });

    inputRow.append(this.searchInput, this.searchBtn);

    this.statusLine = makeElement('div', {
      style: { fontSize: '0.85em', color: '#aaa', minHeight: '1.2em' },
    });

    this.resultsList = makeElement('ul', {
      style: {
        listStyle: 'none',
        padding: '0',
        margin: '0',
        overflowY: 'auto',
        flex: 1,
        border: '1px solid #444',
        borderRadius: '4px',
        backgroundColor: '#1e1e1e',
      },
    });

    container.append(inputRow, this.statusLine, this.resultsList);
    return container;
  }

  async runSearch() {
    const query = this.searchInput.value.trim();
    if (!query) return;

    if (this.isSearching) {
      // Cancel existing search if running
      if (this.abortController) this.abortController.abort();
    }

    this.isSearching = true;
    this.abortController = new AbortController();
    this.searchBtn.textContent = 'Stop';
    this.searchBtn.style.backgroundColor = '#c62828';
    this.resultsList.innerHTML = '';
    this.statusLine.textContent = 'Gathering file list...';

    try {
      // 1. Get list of files
      const nodesMap = this.app.projectFilesManager?.fileTreeView?.nodesMap;
      if (!nodesMap) {
        throw new Error('File tree not available.');
      }

      const filesToScan = Array.from(nodesMap.values())
        .filter((node) => node.type === 'file')
        .filter((node) => /\.(js|html|css)$/i.test(node.name))
        .map((node) => node.id); // These are Golden Paths

      this.statusLine.textContent = `Scanning ${filesToScan.length} files...`;

      let matchesFound = 0;
      let scannedCount = 0;

      // 2. Scan files (Batching to prevent UI freeze)
      const BATCH_SIZE = 5;

      for (let i = 0; i < filesToScan.length; i += BATCH_SIZE) {
        if (this.abortController.signal.aborted) break;

        const batch = filesToScan.slice(i, i + BATCH_SIZE);
        const promises = batch.map(async (path) => {
          try {
            const pathObj = this.app.createPath(path);
            const result = await this.app.commands.fetchFileContentForApp(
              pathObj,
              ['code']
            );
            const content = result.code || '';

            // Simple case-insensitive check
            if (content.toLowerCase().includes(query.toLowerCase())) {
              return { path, content };
            }
          } catch (e) {
            console.warn(`Search skip: ${path}`, e);
          }
          return null;
        });

        const results = await Promise.all(promises);

        results.forEach((res) => {
          if (res) {
            matchesFound++;
            this._addResult(res.path, res.content, query);
          }
        });

        scannedCount += batch.length;
        this.statusLine.textContent = `Scanning... ${scannedCount}/${filesToScan.length} (${matchesFound} matches)`;

        // Small yield to let UI render
        await new Promise((r) => setTimeout(r, 10));
      }

      this.statusLine.textContent = this.abortController.signal.aborted
        ? `Search stopped. Found ${matchesFound} matches.`
        : `Done. Found ${matchesFound} matches in ${filesToScan.length} files.`;
    } catch (err) {
      this.statusLine.textContent = `Error: ${err.message}`;
    } finally {
      this.isSearching = false;
      this.searchBtn.textContent = 'Search';
      this.searchBtn.style.backgroundColor = '#007acc';
      this.abortController = null;
    }
  }

  _addResult(path, content, query) {
    const li = makeElement('li', {
      style: {
        padding: '8px 12px',
        borderBottom: '1px solid #333',
        cursor: 'pointer',
        transition: 'background 0.2s',
      },
      onclick: () => {
        this.app.tabOrchestrator.openFileInTab({ id: path });
      },
      onmouseover: (e) => (e.currentTarget.style.backgroundColor = '#2a2a2a'),
      onmouseout: (e) =>
        (e.currentTarget.style.backgroundColor = 'transparent'),
    });

    const pathEl = makeElement('div', {
      textContent: path,
      style: {
        color: '#4fc3f7',
        fontWeight: '500',
        marginBottom: '4px',
        fontSize: '0.9em',
      },
    });

    // Find the first occurrence context
    const idx = content.toLowerCase().indexOf(query.toLowerCase());
    let snippet = '';
    if (idx !== -1) {
      const start = Math.max(0, idx - 20);
      const end = Math.min(content.length, idx + query.length + 40);
      snippet = content.substring(start, end).replace(/\n/g, '↵');
      if (start > 0) snippet = '...' + snippet;
      if (end < content.length) snippet = snippet + '...';
    }

    const snippetEl = makeElement('div', {
      textContent: snippet,
      style: { color: '#888', fontSize: '0.85em', fontFamily: 'monospace' },
    });

    li.append(pathEl, snippetEl);
    this.resultsList.appendChild(li);
  }

  static _doc() {
    return [
      this._doc_overview(),
      this._doc_search_execution()
    ].join('\n\n---\n\n');
  }

  static _doc_overview() {
    return `# FileSearchWidget\n\nThe \`FileSearchWidget\` is a global utility that provides fast, plain-text searching across all files currently loaded in the Virtual File System or memory stores.`;
  }

  static _doc_search_execution() {
    return `## Search Execution\n\nIt iterates through the file tree, fetching content asynchronously via the VFS, and performs case-insensitive substring matching. Results are presented in an actionable list, allowing the user to instantly jump to the relevant file and line in the editor.`;
  }

}

