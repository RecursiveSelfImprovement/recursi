
class MarkdownWidget {
  constructor({ title = 'New Document', content = '', parent = null } = {}) {
    this.title = title;
    this.content = cleanMarkdown(content);
    this.isMarkdownCanonical = false;
    this.checkboxState = true;
    this.contentVisible = true;

    this.elements = {};

    this.initParsers();
    this.createElements();

    if (parent && parent.appendChild) {
      parent.appendChild(this.elements.mainContainer);
    }
    this.renderMarkdownToHtml();
    this.switchView(this.isMarkdownCanonical);
  }

  initParsers() {
    if (window.markdownit) {
      this.mdParser = window.markdownit({
        html: true,
        breaks: true,
        linkify: true,
        typographer: true,
      });
    } else {
      console.warn('markdown-it not found on window. Ensure it is loaded.');
    }

    if (window.TurndownService) {
      this.turndownService = new window.TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        bulletListMarker: '-',
        emDelimiter: '*',
        hr: '---',
        br: ' ',
      });
      if (window.turndownPluginGfm) {
        this.turndownService.use(window.turndownPluginGfm.gfm);
      }

      // Fenced code blocks: extract language from class on code or pre
      this.turndownService.addRule('cleanCodeBlocks', {
        filter: (node) => {
          if (node.nodeName === 'PRE') {
            return node.querySelector('code') || node.classList.length > 0;
          }
          return false;
        },
        replacement: (content, node) => {
          const codeElement = node.querySelector('code');
          const sourceEl = codeElement || node;
          const className = sourceEl.getAttribute('class') || '';
          const languageMatch = className.match(
            /(?:language|lang|highlight-source)-(\S+)/
          );
          const language = languageMatch ? languageMatch[1] : '';
          const rawText = (codeElement || node).textContent;
          return `\n\n\`\`\`${language}\n${rawText}\n\`\`\`\n\n`;
        },
      });

      // Unwrap divs that are just wrappers (common in LLM output)
      this.turndownService.addRule('unwrapDivs', {
        filter: (node) => {
          if (node.nodeName !== 'DIV') return false;
          // Keep divs that have meaningful classes or roles
          if (node.getAttribute('role')) return false;
          if (
            node.classList.contains('math') ||
            node.classList.contains('highlight')
          )
            return false;
          return true;
        },
        replacement: (content) => {
          return '\n' + content.trim() + '\n';
        },
      });

      // Unwrap spans (common in syntax highlighting and LLM output)
      this.turndownService.addRule('unwrapSpans', {
        filter: 'span',
        replacement: (content) => content,
      });

      // Handle <br> more carefully
      this.turndownService.addRule('lineBreaks', {
        filter: 'br',
        replacement: () => '\n',
      });

      // Handle details/summary (common in some LLM outputs)
      this.turndownService.addRule('detailsSummary', {
        filter: 'details',
        replacement: (content, node) => {
          const summary = node.querySelector('summary');
          const title = summary ? summary.textContent.trim() : 'Details';
          const body = content.replace(title, '').trim();
          return `\n\n**${title}**\n\n${body}\n\n`;
        },
      });

      // Handle figure/figcaption
      this.turndownService.addRule('figures', {
        filter: 'figure',
        replacement: (content, node) => {
          const img = node.querySelector('img');
          const caption = node.querySelector('figcaption');
          if (img) {
            const alt =
              img.getAttribute('alt') ||
              (caption ? caption.textContent.trim() : '');
            const src = img.getAttribute('src') || '';
            return `\n\n![${alt}](${src})\n\n`;
          }
          return '\n\n' + content.trim() + '\n\n';
        },
      });

      this.turndownService.remove([
        'style',
        'script',
        'noscript',
        'meta',
        'link',
      ]);
    } else {
      console.warn('TurndownService not found on window. Ensure it is loaded.');
    }
  }

  createElements() {
    applyCss(
      `
      .markdown-widget-container {
        background: var(--mw-bg, #ffffff);
        border-radius: 10px;
        box-shadow: 0 1px 4px var(--mw-shadow, rgba(0,0,0,0.08)), 0 0 0 1px var(--mw-border, rgba(0,0,0,0.06));
        margin-bottom: 20px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transition: box-shadow 0.2s ease, background 0.2s ease;
      }
      .markdown-widget-container:hover {
        box-shadow: 0 2px 8px var(--mw-shadow-hover, rgba(0,0,0,0.12)), 0 0 0 1px var(--mw-border, rgba(0,0,0,0.08));
      }

      .mw-header {
        background: var(--mw-header-bg, #f6f7f9);
        padding: 8px 14px;
        border-bottom: 1px solid var(--mw-border, rgba(0,0,0,0.06));
        display: flex;
        align-items: center;
        gap: 8px;
        user-select: none;
        transition: background 0.2s ease;
      }

      .mw-drag-handle {
        cursor: grab;
        color: var(--mw-muted, #b0b0b0);
        font-size: 16px;
        padding: 0 2px;
        transition: color 0.15s ease;
        line-height: 1;
      }
      .mw-drag-handle:hover {
        color: var(--mw-text, #333);
      }

      .mw-title {
        flex-grow: 1;
        font-weight: 600;
        font-size: 0.95em;
        color: var(--mw-text, #333);
        outline: none;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        cursor: text;
        padding: 2px 4px;
        border-radius: 4px;
        transition: background 0.15s ease;
      }
      .mw-title:focus {
        background: var(--mw-title-focus-bg, rgba(0,0,0,0.04));
      }

      .mw-controls {
        display: flex;
        gap: 6px;
        align-items: center;
      }

      .mw-btn {
        background: transparent;
        border: 1px solid var(--mw-btn-border, #d0d0d0);
        border-radius: 6px;
        padding: 4px 10px;
        cursor: pointer;
        font-size: 0.8em;
        color: var(--mw-text-secondary, #666);
        transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        white-space: nowrap;
      }
      .mw-btn:hover {
        background: var(--mw-btn-hover-bg, #e8e8e8);
        border-color: var(--mw-btn-hover-border, #bbb);
        color: var(--mw-text, #333);
      }

      .mw-tab-group {
        display: flex;
        border-radius: 7px;
        overflow: hidden;
        border: 1px solid var(--mw-tab-border, #d0d0d0);
        background: var(--mw-tab-track, rgba(0,0,0,0.04));
        flex-shrink: 0;
      }
      .mw-tab {
        padding: 4px 14px;
        font-size: 0.78em;
        font-weight: 500;
        cursor: pointer;
        color: var(--mw-tab-inactive-text, #888);
        background: transparent;
        border: none;
        transition: all 0.18s ease;
        position: relative;
        letter-spacing: 0.01em;
        white-space: nowrap;
        line-height: 1.4;
      }
      .mw-tab:first-child {
        border-right: 1px solid var(--mw-tab-border, #d0d0d0);
      }
      .mw-tab.active {
        background: var(--mw-tab-active-bg, #ffffff);
        color: var(--mw-tab-active-text, #222);
        font-weight: 600;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      }
      .mw-tab:not(.active):hover {
        color: var(--mw-text-secondary, #666);
        background: var(--mw-tab-hover-bg, rgba(0,0,0,0.03));
      }

      .mw-collapse-btn {
        cursor: pointer;
        background: none;
        border: none;
        padding: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--mw-muted, #b0b0b0);
        transition: color 0.15s ease;
        flex-shrink: 0;
      }
      .mw-collapse-btn:hover {
        color: var(--mw-text, #333);
      }
      .mw-collapse-btn svg {
        transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        display: block;
      }
      .mw-collapsed .mw-collapse-btn svg {
        transform: rotate(-90deg);
      }

      .mw-checkbox {
        accent-color: var(--mw-accent, #4a7dff);
        width: 15px;
        height: 15px;
        cursor: pointer;
        flex-shrink: 0;
      }

      .mw-content-area {
        position: relative;
        display: flex;
        flex-direction: column;
      }
      .mw-editor {
        width: 100%;
        min-height: 150px;
        padding: 16px;
        box-sizing: border-box;
        border: none;
        outline: none;
        resize: vertical;
        font-size: 0.95em;
        line-height: 1.65;
        color: var(--mw-text, #333);
        background: transparent;
      }
      .mw-html-view {
        font-family: inherit;
      }
      .mw-html-view img { max-width: 100%; border-radius: 4px; }
      .mw-html-view code {
        background: var(--mw-code-bg, #f0f1f3);
        padding: 2px 5px;
        border-radius: 4px;
        font-size: 0.88em;
        color: var(--mw-code-text, #d63384);
      }
      .mw-html-view pre {
        background: var(--mw-pre-bg, #f4f5f7);
        padding: 14px;
        overflow-x: auto;
        border-radius: 8px;
        border: 1px solid var(--mw-border, rgba(0,0,0,0.06));
      }
      .mw-html-view pre code {
        background: none;
        padding: 0;
        color: var(--mw-text, #333);
      }
      .mw-html-view blockquote {
        border-left: 3px solid var(--mw-accent, #4a7dff);
        margin: 0.5em 0;
        padding: 0.4em 0 0.4em 1em;
        color: var(--mw-text-secondary, #666);
        background: var(--mw-blockquote-bg, rgba(74, 125, 255, 0.04));
        border-radius: 0 6px 6px 0;
      }
      .mw-html-view h1, .mw-html-view h2, .mw-html-view h3,
      .mw-html-view h4, .mw-html-view h5, .mw-html-view h6 {
        color: var(--mw-text, #333);
        margin-top: 1em;
        margin-bottom: 0.4em;
      }
      .mw-html-view a {
        color: var(--mw-accent, #4a7dff);
      }
      .mw-html-view ul, .mw-html-view ol {
        padding-left: 1.5em;
      }
      .mw-html-view table {
        border-collapse: collapse;
        width: 100%;
        margin: 0.6em 0;
      }
      .mw-html-view th, .mw-html-view td {
        border: 1px solid var(--mw-border, rgba(0,0,0,0.1));
        padding: 6px 10px;
        text-align: left;
      }
      .mw-html-view th {
        background: var(--mw-header-bg, #f6f7f9);
        font-weight: 600;
      }

      .mw-md-view {
        font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Consolas', monospace;
        background: var(--mw-md-bg, #fafbfc);
        white-space: pre-wrap;
        font-size: 0.88em;
        line-height: 1.7;
        color: var(--mw-text, #333);
      }
      .mw-hidden { display: none !important; }
      .mw-collapsed .mw-content-area { display: none; }

      /* Copy button */
      .mw-copy-btn {
        background: transparent;
        border: 1px solid var(--mw-btn-border, #d0d0d0);
        border-radius: 6px;
        padding: 4px 10px;
        cursor: pointer;
        font-size: 0.8em;
        color: var(--mw-text-secondary, #666);
        transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        white-space: nowrap;
      }
      .mw-copy-btn:hover {
        background: var(--mw-btn-hover-bg, #e8e8e8);
        border-color: var(--mw-btn-hover-border, #bbb);
        color: var(--mw-text, #333);
      }
      .mw-copy-btn.copied {
        color: #22c55e;
        border-color: #22c55e;
      }

      /* Overflow menu for mobile */
      .mw-overflow-btn {
        display: none;
        background: transparent;
        border: 1px solid var(--mw-btn-border, #d0d0d0);
        border-radius: 6px;
        padding: 4px 8px;
        cursor: pointer;
        font-size: 14px;
        color: var(--mw-text-secondary, #666);
        position: relative;
        flex-shrink: 0;
      }
      .mw-overflow-menu {
        display: none;
        position: absolute;
        top: 100%;
        right: 0;
        margin-top: 4px;
        background: var(--mw-bg, #fff);
        border: 1px solid var(--mw-border, rgba(0,0,0,0.1));
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        padding: 6px;
        z-index: 1000;
        min-width: 140px;
      }
      .mw-overflow-menu.open { display: flex; flex-direction: column; gap: 2px; }
      .mw-overflow-item {
        padding: 8px 12px;
        font-size: 0.85em;
        cursor: pointer;
        border: none;
        background: transparent;
        text-align: left;
        color: var(--mw-text, #333);
        border-radius: 6px;
        white-space: nowrap;
      }
      .mw-overflow-item:hover { background: var(--mw-btn-hover-bg, #e8e8e8); }

      /* Undo toast */
      .mw-undo-toast {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--mw-header-bg, #f6f7f9);
        border: 1px solid var(--mw-border, rgba(0,0,0,0.1));
        border-radius: 8px;
        padding: 10px 16px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        z-index: 100;
        font-size: 0.85em;
        color: var(--mw-text, #333);
        animation: mw-fade-in 0.2s ease;
      }
      .mw-undo-btn {
        background: var(--mw-accent, #4a7dff);
        color: #fff;
        border: none;
        border-radius: 6px;
        padding: 4px 12px;
        cursor: pointer;
        font-size: 0.9em;
        font-weight: 600;
      }
      @keyframes mw-fade-in { from { opacity: 0; transform: translate(-50%,-50%) scale(0.95); } to { opacity: 1; transform: translate(-50%,-50%) scale(1); } }

      @media (max-width: 600px) {
        .mw-header { padding: 6px 10px; gap: 5px; }
        .mw-title { font-size: 0.85em; min-width: 0; }
        .mw-controls .mw-btn,
        .mw-controls .mw-copy-btn { display: none; }
        .mw-controls .mw-tab-group { display: none; }
        .mw-overflow-btn { display: flex; align-items: center; }
      }
    `,
      'markdown-widget-styles'
    );

    this.elements.dragHandle = makeElement('div', {
      className: 'mw-drag-handle',
      title: 'Drag to reorder',
      innerHTML: '&#x2630;',
    });

    this.elements.checkbox = makeElement('input', {
      type: 'checkbox',
      checked: this.checkboxState,
      className: 'mw-checkbox',
      title: 'Select for batch copy/save',
    });
    this.elements.checkbox.addEventListener(
      'change',
      (e) => (this.checkboxState = e.target.checked)
    );

    const chevronSvg = makeElement(
      'svg:svg',
      {
        width: 14,
        height: 14,
        viewBox: '0 0 16 16',
        style: { display: 'block' },
      },
      makeElement('svg:polyline', {
        points: '3,5 8,11 13,5',
        stroke: 'currentColor',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        fill: 'none',
      })
    );
    this.elements.collapseBtn = makeElement(
      'button',
      {
        className: 'mw-collapse-btn',
        title: 'Toggle Collapse',
      },
      chevronSvg
    );
    this.elements.collapseBtn.addEventListener('click', () =>
      this.toggleContentVisibility()
    );

    this.elements.title = makeElement('div', {
      className: 'mw-title',
      contentEditable: true,
      textContent: this.title,
    });
    this.elements.title.addEventListener(
      'blur',
      () => (this.title = this.elements.title.textContent.trim())
    );

    this.elements.tabFormatted = makeElement('div', {
      className: 'mw-tab active',
      textContent: 'Formatted',
    });
    this.elements.tabMarkdown = makeElement('div', {
      className: 'mw-tab',
      textContent: 'Markdown',
    });

    this.elements.tabFormatted.addEventListener('click', () => {
      if (!this.isMarkdownCanonical) return;
      this.content = this.elements.mdEditor.value;
      this.renderMarkdownToHtml();
      this.isMarkdownCanonical = false;
      this.switchView(false);
    });

    this.elements.tabMarkdown.addEventListener('click', () => {
      if (this.isMarkdownCanonical) return;
      this.parseHtmlToMarkdown();
      this.isMarkdownCanonical = true;
      this.switchView(true);
    });

    const tabGroup = makeElement(
      'div',
      { className: 'mw-tab-group' },
      this.elements.tabFormatted,
      this.elements.tabMarkdown
    );

    this.elements.saveBtn = makeElement('button', {
      className: 'mw-btn',
      textContent: 'Save .md',
      title: 'Save individual block',
    });
    this.elements.saveBtn.addEventListener('click', () =>
      this.saveMarkdownFile()
    );

    this.elements.clearBtn = makeElement('button', {
      className: 'mw-btn',
      textContent: 'Clear',
      title: 'Clear content',
    });
    this.elements.clearBtn.addEventListener('click', () => this.clearContent());

    // Copy to clipboard button
    this.elements.copyBtn = makeElement('button', {
      className: 'mw-copy-btn',
      textContent: '📋 Copy',
      title: 'Copy Markdown to clipboard',
    });
    this.elements.copyBtn.addEventListener('click', () => this.copyToClipboard());

    // Overflow menu button for mobile
    this.elements.overflowBtn = makeElement('button', {
      className: 'mw-overflow-btn',
      textContent: '⋮',
      title: 'More actions',
    });
    const overflowMenu = makeElement('div', { className: 'mw-overflow-menu' },
      makeElement('button', { className: 'mw-overflow-item', textContent: 'Formatted', onclick: () => { this.elements.tabFormatted.click(); overflowMenu.classList.remove('open'); } }),
      makeElement('button', { className: 'mw-overflow-item', textContent: 'Markdown', onclick: () => { this.elements.tabMarkdown.click(); overflowMenu.classList.remove('open'); } }),
      makeElement('button', { className: 'mw-overflow-item', textContent: '📋 Copy', onclick: () => { this.copyToClipboard(); overflowMenu.classList.remove('open'); } }),
      makeElement('button', { className: 'mw-overflow-item', textContent: '💾 Save .md', onclick: () => { this.saveMarkdownFile(); overflowMenu.classList.remove('open'); } }),
      makeElement('button', { className: 'mw-overflow-item', textContent: '🗑 Clear', onclick: () => { this.clearContent(); overflowMenu.classList.remove('open'); } }),
    );
    this.elements.overflowBtn.appendChild(overflowMenu);
    this.elements.overflowBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      overflowMenu.classList.toggle('open');
    });
    // Close on outside click
    document.addEventListener('click', () => overflowMenu.classList.remove('open'));

    const controls = makeElement(
      'div',
      { className: 'mw-controls widget-right-controls' },
      this.elements.copyBtn,
      this.elements.clearBtn,
      this.elements.saveBtn,
      tabGroup,
      this.elements.overflowBtn
    );

    const header = makeElement(
      'div',
      { className: 'mw-header' },
      this.elements.dragHandle,
      this.elements.checkbox,
      this.elements.collapseBtn,
      this.elements.title,
      controls
    );

    this.elements.htmlEditor = makeElement('div', {
      className: 'mw-editor mw-html-view',
      contentEditable: true,
    });
    this.elements.htmlEditor.addEventListener('input', () => {
      if (!this.isMarkdownCanonical) this.parseHtmlToMarkdown();
    });

    // Intercept paste to clean HTML before it enters the editor
    this.elements.htmlEditor.addEventListener('paste', (e) => {
      const html = e.clipboardData.getData('text/html');
      const plain = e.clipboardData.getData('text/plain');
      if (html) {
        e.preventDefault();
        // Clean the HTML through a round-trip: HTML -> Markdown -> HTML
        if (this.turndownService && this.mdParser) {
          const md = this.turndownService.turndown(html);
          const cleanHtml = this.mdParser.render(md);
          // Insert at cursor position
          const sel = window.getSelection();
          if (sel.rangeCount) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const temp = document.createElement('div');
            temp.innerHTML = cleanHtml;
            const frag = document.createDocumentFragment();
            while (temp.firstChild) {
              frag.appendChild(temp.firstChild);
            }
            range.insertNode(frag);
            // Move cursor to end of inserted content
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          }
          this.parseHtmlToMarkdown();
        } else {
          // Fallback: insert plain text
          document.execCommand('insertText', false, plain);
        }
      }
    });

    this.elements.mdEditor = makeElement('textarea', {
      className: 'mw-editor mw-md-view',
      value: this.content,
    });
    this.elements.mdEditor.addEventListener('input', () => {
      if (this.isMarkdownCanonical) this.content = this.elements.mdEditor.value;
    });

    this.elements.contentArea = makeElement(
      'div',
      { className: 'mw-content-area' },
      this.elements.htmlEditor,
      this.elements.mdEditor
    );

    this.elements.mainContainer = makeElement(
      'div',
      { className: 'markdown-widget-container' },
      header,
      this.elements.contentArea
    );
  }

  saveMarkdownFile() {
    if (!this.isMarkdownCanonical) {
      this.parseHtmlToMarkdown();
    }
    const mdContent = `# ${this.title}\n\n${this.content}`;
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.title || 'document'}.md`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  }

  copyToClipboard() {
    const data = this.getData();
    const text = data.content || "";
    navigator.clipboard.writeText(text).then(() => {
      const btn = this.elements.copyBtn;
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = "✓ Copied";
        btn.classList.add("copied");
        setTimeout(() => { btn.textContent = orig; btn.classList.remove("copied"); }, 2000);
      }
    });
  }
  clearContent() {
    const prevContent = this.content;
    const prevHtml = this.elements.htmlEditor.innerHTML;
    this.content = '';
    this.elements.mdEditor.value = '';
    this.elements.htmlEditor.innerHTML = '';

    // Show undo toast instead of confirm dialog
    const toast = makeElement("div", { className: "mw-undo-toast" },
      makeElement("span", {}, "Cleared."),
      makeElement("button", {
        className: "mw-undo-btn",
        onclick: () => {
          this.content = prevContent;
          this.elements.mdEditor.value = prevContent;
          this.elements.htmlEditor.innerHTML = prevHtml;
          toast.remove();
        },
      }, "Undo"),
    );
    this.elements.mainContainer.style.position = "relative";
    this.elements.mainContainer.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 8000);
  }

  getElement() {
    return this.elements.mainContainer;
  }

  getDragElement() {
    return this.elements.dragHandle;
  }

  getData() {
    if (!this.isMarkdownCanonical) {
      this.parseHtmlToMarkdown();
    }
    return {
      title: this.title,
      content: this.content,
      checkboxState: this.checkboxState,
    };
  }

  toggleContentVisibility() {
    this.contentVisible = !this.contentVisible;
    if (this.contentVisible) {
      this.elements.mainContainer.classList.remove('mw-collapsed');
    } else {
      this.elements.mainContainer.classList.add('mw-collapsed');
    }
  }

  switchView(isMarkdown) {
    if (isMarkdown) {
      const currentHeight = this.elements.htmlEditor.offsetHeight;
      if (currentHeight > 0) {
        this.lockedHeight = currentHeight;
      }
      this.elements.htmlEditor.classList.add('mw-hidden');
      this.elements.mdEditor.classList.remove('mw-hidden');
      if (this.lockedHeight) {
        this.elements.mdEditor.style.minHeight = this.lockedHeight + 'px';
        this.elements.mdEditor.style.height = this.lockedHeight + 'px';
      }
      this.elements.tabMarkdown.classList.add('active');
      this.elements.tabFormatted.classList.remove('active');
    } else {
      this.elements.mdEditor.classList.add('mw-hidden');
      this.elements.htmlEditor.classList.remove('mw-hidden');
      if (this.lockedHeight) {
        this.elements.htmlEditor.style.minHeight = this.lockedHeight + 'px';
      }
      this.elements.tabFormatted.classList.add('active');
      this.elements.tabMarkdown.classList.remove('active');
    }
  }

  renderMarkdownToHtml() {
    if (this.mdParser) {
      this.elements.htmlEditor.innerHTML = this.mdParser.render(
        this.content || ''
      );
    } else {
      this.elements.htmlEditor.innerHTML = this.content;
    }
  }

  parseHtmlToMarkdown() {
    if (this.turndownService) {
      try {
        this.content = this.turndownService.turndown(
          this.elements.htmlEditor.innerHTML
        );
        this.elements.mdEditor.value = this.content;
      } catch (e) {
        console.error('Error parsing HTML to Markdown', e);
      }
    }
  }
}



