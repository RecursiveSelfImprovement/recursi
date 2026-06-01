class MultiWidgetPage {
  constructor() {
    this.widgets = [];
    this.widgetContainer = null;
    this.hamburgerMenu = null;
    this.verticalOrderingUI = null;
    this.pageTitle = document.title || 'Markdown Notebook';
  }

  initializePage() {
    this.stylePage();
    this.applyTheme();
    this.createMainWidgetContainer();
    this.createHamburgerMenu();
    this.initializeMarkdownWidgetsFromDOM();
    this.checkForPendingImport();
    this.setupVerticalOrdering();
    this.applyInitialWidgetControlVisibility();
    this.setupDropZone();
    console.log('MultiWidgetPage: Initialization complete.');
  }

  stylePage() {
    applyCss(
      `
      :root {
        --mw-bg: #ffffff;
        --mw-header-bg: #f6f7f9;
        --mw-text: #2a2a2a;
        --mw-text-secondary: #666;
        --mw-muted: #b0b0b0;
        --mw-border: rgba(0, 0, 0, 0.08);
        --mw-shadow: rgba(0, 0, 0, 0.06);
        --mw-shadow-hover: rgba(0, 0, 0, 0.10);
        --mw-btn-border: #d0d0d0;
        --mw-btn-hover-bg: #e8e8e8;
        --mw-btn-hover-border: #bbb;
        --mw-tab-border: #d0d0d0;
        --mw-tab-track: rgba(0, 0, 0, 0.04);
        --mw-tab-active-bg: #ffffff;
        --mw-tab-active-text: #222;
        --mw-tab-inactive-text: #888;
        --mw-tab-hover-bg: rgba(0, 0, 0, 0.03);
        --mw-title-focus-bg: rgba(0, 0, 0, 0.04);
        --mw-accent: #4a7dff;
        --mw-code-bg: #f0f1f3;
        --mw-code-text: #d63384;
        --mw-pre-bg: #f4f5f7;
        --mw-md-bg: #fafbfc;
        --mw-blockquote-bg: rgba(74, 125, 255, 0.04);
        --mw-page-bg: #eef1f5;
        --mw-checkbox-accent: #4a7dff;
      }

      body.dark-mode {
        --mw-bg: #1e1f23;
        --mw-header-bg: #27282d;
        --mw-text: #e0e0e0;
        --mw-text-secondary: #999;
        --mw-muted: #555;
        --mw-border: rgba(255, 255, 255, 0.08);
        --mw-shadow: rgba(0, 0, 0, 0.25);
        --mw-shadow-hover: rgba(0, 0, 0, 0.35);
        --mw-btn-border: #444;
        --mw-btn-hover-bg: #333;
        --mw-btn-hover-border: #555;
        --mw-tab-border: #444;
        --mw-tab-track: rgba(255, 255, 255, 0.04);
        --mw-tab-active-bg: #333;
        --mw-tab-active-text: #e8e8e8;
        --mw-tab-inactive-text: #777;
        --mw-tab-hover-bg: rgba(255, 255, 255, 0.04);
        --mw-title-focus-bg: rgba(255, 255, 255, 0.06);
        --mw-accent: #6b9aff;
        --mw-code-bg: #2a2b30;
        --mw-code-text: #f0a0c0;
        --mw-pre-bg: #25262b;
        --mw-md-bg: #1a1b1f;
        --mw-blockquote-bg: rgba(107, 154, 255, 0.08);
        --mw-page-bg: #131416;
        --mw-checkbox-accent: #6b9aff;
      }

      body {
        font-family: 'DM Sans', 'Segoe UI', system-ui, sans-serif;
        background-color: var(--mw-page-bg);
        color: var(--mw-text);
        margin: 0;
        padding: 0;
        transition: background-color 0.3s ease, color 0.3s ease;
      }

      .hamburger-menu-container {
         position: fixed;
         top: 15px;
         left: 15px;
         z-index: 1001;
      }

      .widget-container {
        max-width: 900px;
        margin: 20px auto;
        padding: 10px;
      }

      body.widget-controls-hidden .widget-right-controls {
         display: none !important;
      }

      .notification-message {
         position: fixed;
         top: -60px;
         left: 50%;
         transform: translateX(-50%);
         color: #fff;
         padding: 10px 25px;
         border-radius: 8px;
         box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
         z-index: 1002;
         transition: top 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease;
         opacity: 0;
         font-size: 0.9em;
         text-align: center;
         min-width: 200px;
         font-weight: 500;
         letter-spacing: 0.01em;
         backdrop-filter: blur(8px);
       }
       .notification-info { background-color: rgba(50, 50, 50, 0.92); }
       .notification-success { background-color: rgba(34, 140, 80, 0.92); }
       .notification-error { background-color: rgba(200, 50, 50, 0.92); }
    `,
      'multiwidget-base-styles'
    );
  }

  createHamburgerMenu() {
    this.hamburgerMenu = new HamburgerMenu({
      size: 28,
      hoverScale: 1.2,
      menuItems: [
        { name: '➕ Add Widget', action: () => this.addMarkdownWidget() },
        { name: '📋 Paste as New Block', action: () => this.pasteAsNewBlock() },
        { name: '💾 Save HTML (live)', action: () => this.saveHtml() },
        { name: '💾 Save HTML (static)', action: () => this.saveStaticHtml() },
        { name: '📄 Save All as .md', action: () => this.saveAllMarkdown() },
        { name: '📋 Copy Selected', action: () => this.copySelectedMarkdown() },
        { name: '✔️ Select All', action: () => this.setAllCheckboxes(true) },
        { name: '❌ Deselect All', action: () => this.setAllCheckboxes(false) },
        { name: '🔽 Collapse All', action: () => this.toggleAllContent(false) },
        { name: '🔼 Expand All', action: () => this.toggleAllContent(true) },
        {
          name: '✏️ Set Page Title...',
          action: () => this.promptSetPageTitle(),
        },
        {
          name: '🔗 Set Server URL...',
          action: () => this.setBaseUrl(),
        },
        {
          name: '🌙 Dark Mode',
          toggle: true,
          isChecked: this.darkMode,
          action: (item) => {
            this.darkMode = item.isChecked;
            this.applyTheme();
            this.showNotification(
              `Switched to ${this.darkMode ? 'dark' : 'light'} mode.`,
              'info'
            );
          },
        },
        {
          name: 'Show Widget Controls',
          toggle: true,
          isChecked: this.showWidgetControls,
          action: (item) => this.toggleWidgetControlsVisibility(item.isChecked),
        },
      ],
    });

    const hamburgerContainer = makeElement(
      'div',
      {
        className: 'hamburger-menu-container',
      },
      this.hamburgerMenu.container
    );

    (this.container || document.body).prepend(hamburgerContainer);
  }

  createMainWidgetContainer() {
    this.widgetContainer = makeElement('div', {
      className: 'widget-container',
    });
    (this.container || document.body).appendChild(this.widgetContainer);
  }

  initializeMarkdownWidgetsFromDOM() {
    const textAreas = document.querySelectorAll('textarea.md-content');
    textAreas.forEach((textArea, index) => {
      const title = textArea.dataset.title || `Document ${index + 1}`;
      const content = textArea.value || '';
      const mdWidget = new MarkdownWidget({ title: title, content: content });
      this.widgetContainer.appendChild(mdWidget.getElement());
      this.widgets.push(mdWidget);
      textArea.remove();
    });

    if (this.widgets.length === 0) {
      this.addMarkdownWidget('Welcome!', 'Start typing your notes here.');
    }
  }

  setupVerticalOrdering() {
    const itemsForOrdering = this.widgets.map((widget) => ({
      element: widget.getElement(),
      dragElement: widget.getDragElement(),
    }));

    this.verticalOrderingUI = new VerticalOrderingUI(
      this.widgetContainer,
      itemsForOrdering,
      false
    );

    this.widgetContainer.addEventListener('vu-drop', (event) => {
      const { item, originalIndex, newIndex } = event.detail;
      const droppedWidget = this.widgets.find(
        (w) => w.getElement() === item.element
      );
      if (!droppedWidget) return;

      const currentInternalIndex = this.widgets.indexOf(droppedWidget);
      if (currentInternalIndex === -1) {
        this.syncWidgetsArrayWithDOM();
        return;
      }

      this.widgets.splice(currentInternalIndex, 1);
      let targetArrayIndex = newIndex;
      this.widgets.splice(targetArrayIndex, 0, droppedWidget);

      this.syncOrderingUIItems();
    });
  }

  syncWidgetsArrayWithDOM() {
    console.warn('Syncing internal widgets array with DOM order.');
    const widgetElementsInDOM = Array.from(
      this.widgetContainer.children
    ).filter((el) => el.matches('.markdown-widget-container'));

    const newWidgetsArray = widgetElementsInDOM
      .map((element) => this.widgets.find((w) => w.getElement() === element))
      .filter((widget) => widget);

    if (newWidgetsArray.length !== widgetElementsInDOM.length) {
      console.error('Mismatch finding widgets during DOM sync!');
    }

    this.widgets = newWidgetsArray;
    console.log('Internal widgets array re-synced from DOM.');
    this.syncOrderingUIItems();
  }

  syncOrderingUIItems() {
    if (!this.verticalOrderingUI) return;
    this.verticalOrderingUI.items = this.widgets.map((widget) => ({
      element: widget.getElement(),
      dragElement: widget.getDragElement(),
    }));
    this.verticalOrderingUI.initializeDragListeners();
  }

  addMarkdownWidget(title = 'New Document', content = '') {
    const newWidget = new MarkdownWidget({ title: title, content: content });
    this.widgetContainer.appendChild(newWidget.getElement());
    this.widgets.push(newWidget);
    newWidget.switchView(false);

    this.syncOrderingUIItems();
    this.applyWidgetControlVisibility(newWidget);
    console.log('Added new widget:', title);
  }

  toggleWidgetControlsVisibility(show) {
    this.showWidgetControls = show;
    this.applyInitialWidgetControlVisibility();
    document.body.dataset.showWidgetControls = this.showWidgetControls;
    this.showNotification(
      `Widget controls ${show ? 'shown' : 'hidden'}.`,
      'info'
    );
  }

  applyInitialWidgetControlVisibility() {
    if (this.showWidgetControls) {
      document.body.classList.remove('widget-controls-hidden');
    } else {
      document.body.classList.add('widget-controls-hidden');
    }
  }

  applyWidgetControlVisibility(widget) {
    // Handled via CSS class on body
  }

  saveHtml() {
    console.log('Saving HTML...');

    const title = this.pageTitle || 'Markdown Notebook';

    let textareaHtml = '';
    this.widgets.forEach((widget) => {
      const data = widget.getData();
      const escapedContent = data.content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const escapedTitle = (data.title || 'Untitled')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;');
      textareaHtml += `\n  <textarea class="md-content" data-title="${escapedTitle}">${escapedContent}</textarea>`;
    });

    const themeAttr = this.darkMode
      ? ' data-theme="dark"'
      : ' data-theme="light"';
    const controlsAttr = ` data-show-widget-controls="${String(
      this.showWidgetControls
    )}"`;

    let baseUrl = this.baseUrl.replace(/\/+$/, '');

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>textarea.md-content{display:none}</style>
  <script type="importmap">
  {
    "imports": {
      "/library/recursi.js": "${baseUrl}/library/recursi.js",
      "../../library/recursi.js": "${baseUrl}/library/recursi.js"
    }
  }
  <\/script>
</head>
<body${themeAttr}${controlsAttr}>${textareaHtml}
  <script type="module">
  async function boot() {
    var libs = [
      "https://cdn.jsdelivr.net/npm/markdown-it/dist/markdown-it.min.js",
      "https://cdn.jsdelivr.net/npm/turndown/dist/turndown.min.js",
      "https://cdn.jsdelivr.net/npm/turndown-plugin-gfm/dist/turndown-plugin-gfm.min.js"
    ];
    for (var i = 0; i < libs.length; i++) {
      await new Promise(function(resolve, reject) {
        var s = document.createElement('script');
        s.src = libs[i];
        s.onload = resolve;
        s.onerror = function() { reject(new Error('Failed: ' + libs[i])); };
        document.head.appendChild(s);
      });
    }
    var mod = await import('${baseUrl}/markdownPage/multiWidgetPage.js');
    new mod.MultiWidgetPage();
  }
  boot().catch(function(e) { console.error('Notebook boot failed:', e); });
  <\/script>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = title.replace(/[^a-zA-Z0-9 _\-]/g, '') + '.html';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 150);
    this.showNotification(
      'Live HTML file saved as ' + title + '.html',
      'success'
    );
  }

  async copySelectedMarkdown() {
    const selectedMarkdowns = this.widgets
      .filter((widget) => widget.getData().checkboxState)
      .map((widget) => {
        const data = widget.getData();
        const title = `# ${data.title}`;
        return `${title}\n\n${data.content}`;
      });

    if (selectedMarkdowns.length === 0) {
      this.showNotification('No widgets selected.', 'info');
      return;
    }
    const finalClipboardText = selectedMarkdowns.join('\n\n---\n\n');
    try {
      await navigator.clipboard.writeText(finalClipboardText);
      this.showNotification(
        `Copied Markdown for ${selectedMarkdowns.length} widget(s).`,
        'success'
      );
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      this.showNotification('Failed to copy to clipboard.', 'error');
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.className = `notification-message notification-${type}`;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.style.top = '15px';
      notification.style.opacity = '1';
    }, 50);
    setTimeout(() => {
      notification.style.top = '-60px';
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 500);
    }, 3500);
  }

  setAllCheckboxes(isChecked) {
    this.widgets.forEach((widget) => {
      widget.checkboxState = isChecked;
      if (widget.elements.checkbox) {
        widget.elements.checkbox.checked = isChecked;
      }
    });
    this.showNotification(
      `${isChecked ? 'Selected' : 'Deselected'} all ${
        this.widgets.length
      } widgets.`,
      'success'
    );
  }

  toggleAllContent(isVisible) {
    this.widgets.forEach((widget) => {
      if (widget.contentVisible !== isVisible) {
        widget.toggleContentVisibility();
      }
    });
    this.showNotification(
      `${isVisible ? 'Expanded' : 'Collapsed'} all ${
        this.widgets.length
      } widgets.`,
      'success'
    );
  }

  saveAllMarkdown() {
    const parts = this.widgets.map((widget) => {
      const data = widget.getData();
      return `# ${data.title}\n\n${data.content}`;
    });
    const combined = parts.join('\n\n---\n\n');
    const blob = new Blob([combined], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename =
      (this.pageTitle || 'notebook').replace(/[^a-zA-Z0-9 _\-]/g, '') + '.md';
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 150);
    this.showNotification('Saved all widgets to ' + filename, 'success');
  }

  applyTheme() {
    if (this.darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    document.body.dataset.theme = this.darkMode ? 'dark' : 'light';
  }

  promptSetPageTitle() {
    // Inline editable title instead of prompt()
    const titleEl = document.querySelector('.mw-page-title-editable');
    if (titleEl) {
      titleEl.focus();
      const sel = window.getSelection();
      sel.selectAllChildren(titleEl);
      return;
    }
    // Fallback: create a temporary editable field in the notification area
    const input = makeElement('input', {
      type: 'text',
      value: this.pageTitle,
      style:
        'font-size:16px; padding:8px 12px; border:2px solid var(--mw-accent,#4a7dff); border-radius:8px; background:var(--mw-bg,#fff); color:var(--mw-text,#333); outline:none; width:300px; max-width:80vw;',
    });
    const apply = () => {
      const val = input.value.trim();
      if (val) {
        this.pageTitle = val;
        document.title = val;
        this.showNotification(`Title: "${val}"`, 'success');
      }
      wrap.remove();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') apply();
      if (e.key === 'Escape') wrap.remove();
    });
    input.addEventListener('blur', apply);
    const wrap = makeElement(
      'div',
      {
        style:
          'position:fixed; top:16px; left:50%; transform:translateX(-50%); z-index:100000; background:var(--mw-bg,#fff); padding:12px 16px; border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.2); border:1px solid var(--mw-border,rgba(0,0,0,0.1));',
      },
      makeElement(
        'div',
        {
          style:
            'font-size:0.8em; color:var(--mw-text-secondary,#666); margin-bottom:6px;',
        },
        'Notebook title:'
      ),
      input
    );
    document.body.appendChild(wrap);
    setTimeout(() => {
      input.focus();
      input.select();
    }, 50);
  }

  initBaseUrl() {
    try {
      const stored = localStorage.getItem('mw-base-url');
      if (stored) {
        this.baseUrl = stored;
        return;
      }
    } catch (e) {
      // localStorage not available
    }
    this.baseUrl = 'https://sniplets.org';
  }

  setBaseUrl() {
    const current = this.baseUrl || 'https://sniplets.org';
    const input = makeElement('input', {
      type: 'text',
      value: current,
      style:
        'font-size:14px; padding:8px 12px; border:2px solid var(--mw-accent,#4a7dff); border-radius:8px; background:var(--mw-bg,#fff); color:var(--mw-text,#333); outline:none; width:400px; max-width:80vw; font-family:monospace;',
    });
    const apply = () => {
      const val = input.value.trim().replace(/\/+$/, '');
      if (val) {
        this.baseUrl = val;
        try {
          localStorage.setItem('mw-base-url', this.baseUrl);
        } catch (e) {}
        this.showNotification('Base URL set to ' + this.baseUrl, 'success');
      }
      wrap.remove();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') apply();
      if (e.key === 'Escape') wrap.remove();
    });
    input.addEventListener('blur', apply);
    const wrap = makeElement(
      'div',
      {
        style:
          'position:fixed; top:16px; left:50%; transform:translateX(-50%); z-index:100000; background:var(--mw-bg,#fff); padding:16px 20px; border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.2); border:1px solid var(--mw-border,rgba(0,0,0,0.1));',
      },
      makeElement(
        'div',
        {
          style:
            'font-size:0.8em; color:var(--mw-text-secondary,#666); margin-bottom:6px;',
        },
        'Base URL for saved notebooks:'
      ),
      input,
      makeElement(
        'div',
        {
          style: 'font-size:0.7em; color:var(--mw-muted,#999); margin-top:6px;',
        },
        'Dev: http://localhost:6002 — Prod: https://sniplets.org'
      )
    );
    document.body.appendChild(wrap);
    setTimeout(() => {
      input.focus();
      input.select();
    }, 50);
  }

  setupDropZone() {
    const prevent = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    document.body.addEventListener('dragover', prevent);
    document.body.addEventListener('dragenter', (e) => {
      prevent(e);
      document.body.style.outline = '3px dashed var(--mw-accent, #4a7dff)';
      document.body.style.outlineOffset = '-6px';
    });
    document.body.addEventListener('dragleave', (e) => {
      if (
        e.target === document.body ||
        !document.body.contains(e.relatedTarget)
      ) {
        document.body.style.outline = '';
        document.body.style.outlineOffset = '';
      }
    });
    document.body.addEventListener('drop', (e) => {
      prevent(e);
      document.body.style.outline = '';
      document.body.style.outlineOffset = '';
      const files = e.dataTransfer.files;
      if (files.length === 0) return;
      const file = files[0];
      if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
        this.showNotification('Please drop an HTML file.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        this.importFromHtml(ev.target.result, file.name);
      };
      reader.readAsText(file);
    });
  }

  importFromHtml(htmlString, filename) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    let sections = [];
    let importTitle = null;

    // Try embedded notebook data first (from static export)
    const dataScript = doc.querySelector(
      'script[type="application/x-notebook-data"]'
    );
    if (dataScript) {
      try {
        const data = JSON.parse(dataScript.textContent);
        if (data.title) importTitle = data.title;
        if (Array.isArray(data.sections)) {
          sections = data.sections
            .filter((s) => s.markdown || s.title)
            .map((s) => ({
              title: s.title || 'Imported',
              content: s.markdown || '',
            }));
        }
      } catch (e) {
        console.warn('Failed to parse notebook data:', e);
      }
    }

    // Fallback: textarea.md-content (from live export)
    if (sections.length === 0) {
      const textareas = doc.querySelectorAll('textarea.md-content');
      if (textareas.length > 0) {
        const docTitle = doc.querySelector('title');
        if (docTitle && docTitle.textContent)
          importTitle = docTitle.textContent;
        textareas.forEach((ta) => {
          sections.push({
            title: ta.dataset.title || 'Imported',
            content: ta.value || ta.textContent || '',
          });
        });
      }
    }

    // Last resort: convert body HTML to markdown as single section
    if (sections.length === 0) {
      const bodyHtml = doc.body ? doc.body.innerHTML : htmlString;
      if (window.TurndownService) {
        const td = new window.TurndownService({
          headingStyle: 'atx',
          codeBlockStyle: 'fenced',
        });
        if (window.turndownPluginGfm) td.use(window.turndownPluginGfm.gfm);
        td.remove(['style', 'script', 'noscript', 'meta', 'link']);
        const md = td.turndown(bodyHtml);
        const title =
          (doc.querySelector('title') || {}).textContent ||
          filename.replace(/\.html?$/i, '');
        importTitle = title;
        sections.push({ title: title, content: md });
      } else {
        this.showNotification('Could not parse the dropped file.', 'error');
        return;
      }
    }

    if (sections.length === 0) {
      this.showNotification('No content found in the dropped file.', 'error');
      return;
    }

    // If there are existing widgets with content, ask replace or append
    const hasExistingContent =
      this.widgets.length > 0 &&
      this.widgets.some((w) => {
        const d = w.getData();
        return d.content && d.content.trim().length > 0;
      });

    if (hasExistingContent) {
      // Auto-append instead of confirm dialog — show undo to replace
      const prevWidgets = [...this.widgets];
      const prevElements = prevWidgets.map((w) => w.getElement());
      this.showNotification(
        `Appended ${sections.length} section(s) from "${filename}". Existing content kept.`,
        'success'
      );
    }

    if (importTitle) {
      this.pageTitle = importTitle;
      document.title = importTitle;
    }

    sections.forEach((section) => {
      this.addMarkdownWidget(section.title, section.content);
    });

    // Scroll to the first new widget
    if (this.widgets.length > 0) {
      setTimeout(() => {
        this.widgets[this.widgets.length - sections.length]
          .getElement()
          .scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
      }, 100);
    }

    this.showNotification(
      `Imported ${sections.length} section(s) from ${filename}`,
      'success'
    );
  }

  saveStaticHtml() {
    console.log('Saving static HTML...');

    const title = this.pageTitle || 'Markdown Notebook';
    const isDark = this.darkMode;

    // Gather all widget data and render markdown to HTML
    const sections = this.widgets.map((widget) => {
      const data = widget.getData();
      let renderedHtml = '';
      if (window.markdownit) {
        const md = window.markdownit({
          html: true,
          breaks: true,
          linkify: true,
          typographer: true,
        });
        renderedHtml = md.render(data.content || '');
      } else {
        renderedHtml =
          '<p>' + (data.content || '').replace(/\n/g, '<br>') + '</p>';
      }
      return {
        title: data.title,
        markdown: data.content,
        html: renderedHtml,
      };
    });

    // Build section HTML
    let sectionsHtml = '';
    sections.forEach((section, i) => {
      const escapedTitle = (section.title || 'Untitled')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      sectionsHtml += `
    <section class="nb-section">
      <h2 class="nb-section-title">${escapedTitle}</h2>
      <div class="nb-section-content">${section.html}</div>
    </section>`;
      if (i < sections.length - 1) {
        sectionsHtml += `\n    <hr class="nb-divider">`;
      }
    });

    // Build the embedded data for re-import
    const notebookData = {
      title: title,
      exportedAt: new Date().toISOString(),
      sections: sections.map((s) => ({
        title: s.title,
        markdown: s.markdown,
      })),
    };
    const escapedJson = JSON.stringify(notebookData)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/<\/script/gi, '<\\/script');

    const bg = isDark ? '#131416' : '#eef1f5';
    const cardBg = isDark ? '#1e1f23' : '#ffffff';
    const textColor = isDark ? '#e0e0e0' : '#2a2a2a';
    const textSecondary = isDark ? '#999' : '#666';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const codeBg = isDark ? '#2a2b30' : '#f0f1f3';
    const codeText = isDark ? '#f0a0c0' : '#d63384';
    const preBg = isDark ? '#25262b' : '#f4f5f7';
    const accent = isDark ? '#6b9aff' : '#4a7dff';
    const headerBg = isDark ? '#27282d' : '#f6f7f9';
    const bqBg = isDark ? 'rgba(107,154,255,0.08)' : 'rgba(74,125,255,0.04)';

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: ${bg};
      color: ${textColor};
      line-height: 1.65;
      padding: 40px 20px 80px;
    }
    .nb-container {
      max-width: 860px;
      margin: 0 auto;
    }
    .nb-page-title {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 2px solid ${borderColor};
      letter-spacing: -0.02em;
    }
    .nb-section {
      background: ${cardBg};
      border-radius: 10px;
      box-shadow: 0 1px 4px ${isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.06)'};
      border: 1px solid ${borderColor};
      overflow: hidden;
      margin-bottom: 24px;
    }
    .nb-section-title {
      font-size: 1.1rem;
      font-weight: 600;
      padding: 12px 20px;
      background: ${headerBg};
      border-bottom: 1px solid ${borderColor};
      margin: 0;
    }
    .nb-section-content {
      padding: 20px;
      font-size: 0.95rem;
    }
    .nb-section-content h1, .nb-section-content h2, .nb-section-content h3,
    .nb-section-content h4, .nb-section-content h5, .nb-section-content h6 {
      margin-top: 1em; margin-bottom: 0.4em; color: ${textColor};
    }
    .nb-section-content h1 { font-size: 1.5rem; }
    .nb-section-content h2 { font-size: 1.25rem; }
    .nb-section-content h3 { font-size: 1.1rem; }
    .nb-section-content p { margin: 0.6em 0; }
    .nb-section-content a { color: ${accent}; }
    .nb-section-content ul, .nb-section-content ol { padding-left: 1.5em; margin: 0.5em 0; }
    .nb-section-content li { margin: 0.3em 0; }
    .nb-section-content code {
      background: ${codeBg}; padding: 2px 5px; border-radius: 4px;
      font-size: 0.88em; color: ${codeText};
      font-family: 'Consolas', 'SF Mono', monospace;
    }
    .nb-section-content pre {
      background: ${preBg}; padding: 14px; overflow-x: auto;
      border-radius: 8px; border: 1px solid ${borderColor}; margin: 0.8em 0;
    }
    .nb-section-content pre code {
      background: none; padding: 0; color: ${textColor};
    }
    .nb-section-content blockquote {
      border-left: 3px solid ${accent}; margin: 0.5em 0;
      padding: 0.4em 0 0.4em 1em; color: ${textSecondary};
      background: ${bqBg}; border-radius: 0 6px 6px 0;
    }
    .nb-section-content table { border-collapse: collapse; width: 100%; margin: 0.6em 0; }
    .nb-section-content th, .nb-section-content td {
      border: 1px solid ${borderColor}; padding: 6px 10px; text-align: left;
    }
    .nb-section-content th { background: ${headerBg}; font-weight: 600; }
    .nb-section-content img { max-width: 100%; border-radius: 4px; }
    .nb-divider {
      border: none; border-top: 1px solid ${borderColor}; margin: 0;
    }
    .nb-footer {
      text-align: center; margin-top: 40px; font-size: 0.8rem; color: ${textSecondary};
    }
  </style>
</head>
<body>
  <div class="nb-container">
    <h1 class="nb-page-title">${title}</h1>${sectionsHtml}
    <div class="nb-footer">Exported from Markdown Notebook</div>
  </div>
  <script type="application/x-notebook-data">${escapedJson}<\/script>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = title.replace(/[^a-zA-Z0-9 _\-]/g, '') + '.html';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 150);
    this.showNotification('Static HTML saved as ' + title + '.html', 'success');
  }

  async pasteAsNewBlock() {
    try {
      const clipboardItems = await navigator.clipboard.read();
      let html = '';
      let plain = '';

      for (const item of clipboardItems) {
        if (item.types.includes('text/html')) {
          const blob = await item.getType('text/html');
          html = await blob.text();
        }
        if (item.types.includes('text/plain')) {
          const blob = await item.getType('text/plain');
          plain = await blob.text();
        }
      }

      let markdown = '';
      if (html && window.TurndownService) {
        const td = new window.TurndownService({
          headingStyle: 'atx',
          codeBlockStyle: 'fenced',
          bulletListMarker: '-',
          emDelimiter: '*',
          hr: '---',
        });
        if (window.turndownPluginGfm) {
          td.use(window.turndownPluginGfm.gfm);
        }
        td.addRule('unwrapSpans', { filter: 'span', replacement: (c) => c });
        td.addRule('unwrapDivs', {
          filter: (node) =>
            node.nodeName === 'DIV' && !node.getAttribute('role'),
          replacement: (c) => '\n' + c.trim() + '\n',
        });
        td.addRule('cleanCodeBlocks', {
          filter: (node) =>
            node.nodeName === 'PRE' &&
            (node.querySelector('code') || node.classList.length > 0),
          replacement: (content, node) => {
            const codeEl = node.querySelector('code') || node;
            const cls = codeEl.getAttribute('class') || '';
            const m = cls.match(/(?:language|lang|highlight-source)-(\S+)/);
            const lang = m ? m[1] : '';
            return `\n\n\`\`\`${lang}\n${codeEl.textContent}\n\`\`\`\n\n`;
          },
        });
        td.remove(['style', 'script', 'noscript', 'meta', 'link']);
        markdown = td.turndown(html);
      } else if (plain) {
        markdown = plain;
      } else {
        this.showNotification('Clipboard is empty.', 'info');
        return;
      }

      // Try to extract a title from the first heading
      let title = 'Pasted Content';
      const headingMatch = markdown.match(/^#\s+(.+)$/m);
      if (headingMatch) {
        title = headingMatch[1].trim();
      }

      this.addMarkdownWidget(title, markdown);

      // Scroll to the new widget
      const lastWidget = this.widgets[this.widgets.length - 1];
      if (lastWidget) {
        setTimeout(() => {
          lastWidget
            .getElement()
            .scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }

      this.showNotification('Pasted as new block.', 'success');
    } catch (err) {
      console.error('Paste as new block failed:', err);
      // Fallback: try the older readText API
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          this.addMarkdownWidget('Pasted Content', text);
          const lastWidget = this.widgets[this.widgets.length - 1];
          if (lastWidget) {
            setTimeout(() => {
              lastWidget
                .getElement()
                .scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          }
          this.showNotification('Pasted as new block (plain text).', 'success');
        } else {
          this.showNotification(
            'Clipboard is empty or access denied.',
            'error'
          );
        }
      } catch (err2) {
        this.showNotification(
          'Clipboard access denied. Try Ctrl+V in a widget instead.',
          'error'
        );
      }
    }
  }

  checkForPendingImport() {
    try {
      const pendingHtml = sessionStorage.getItem('mw-import-html');
      const pendingFilename = sessionStorage.getItem('mw-import-filename');
      if (pendingHtml) {
        sessionStorage.removeItem('mw-import-html');
        sessionStorage.removeItem('mw-import-filename');
        this.importFromHtml(pendingHtml, pendingFilename || 'imported.html');
      }
    } catch (e) {
      // sessionStorage not available
    }
  }

  async run(env) {
    this.env = env;
    this.container = env.container;

    this.showWidgetControls =
      document.body.dataset.showWidgetControls !== 'false';
    const savedTheme = document.body.dataset.theme;
    if (savedTheme) {
      this.darkMode = savedTheme === 'dark';
    } else {
      this.darkMode =
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    this.initBaseUrl();
    console.log('MultiWidgetPage: Initializing V3 Workspace...');
    this.initializePage();
    return this;
  }
}

