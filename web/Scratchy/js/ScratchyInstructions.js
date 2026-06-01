
class ScratchyInstructions {
  constructor(app) {
    this._app = app;
  }

  buildInstructionsTab() {
      const app = this._app;
      app.instructionsArea.innerHTML = '';

      const editorHost = makeElement('div', {
        className: 'scratchy-instructions-editor',
      });
      app.instructionsArea.appendChild(editorHost);

      requestAnimationFrame(() => {
        app.instructionsEditor = new CodeMirrorWidget({
          host: editorHost,
          content: app.instructionsText,
          mode: 'markdown',
          wrap: true,
          onChange: (newText) => {
            app.instructionsText = newText;
          }
        });
      });
    }

  makeTab(id, label) {
    const app = this._app;
    const tab = makeElement(
      'button',
      {
        className: 'scratchy-tab ' + (app.activeTab === id ? 'active' : ''),
        onclick: () => this.switchTab(id),
      },
      label
    );
    tab.dataset.tabId = id;
    return tab;
  }

  switchTab(tabId) {
    const app = this._app;
    app.activeTab = tabId;
    const tabs = app.appRoot.querySelectorAll('.scratchy-tab');
    tabs.forEach((t) =>
      t.classList.toggle('active', t.dataset.tabId === tabId)
    );

    const mainLayout = app.appRoot.querySelector('.scratchy-main');
    if (tabId === 'files') {
      mainLayout.style.display = 'flex';
      app.instructionsArea.style.display = 'none';
    } else if (tabId === 'instructions') {
      mainLayout.style.display = 'none';
      app.instructionsArea.style.display = 'flex';
    }
  }
}

