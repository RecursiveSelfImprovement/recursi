
class TabManager {
  
  constructor(
      mainContainer,
      onTabChange,
      onTabClose,
      appearanceManager = null,
      onCloseAll = null,
      visibilityManager = null,
      onTabDetach = null
    ) {
      if (!mainContainer)
        throw new Error('TabManager requires a main container element.');
      this.mainContainer = mainContainer;
      this.onTabChange = onTabChange;
      this.onTabClose = onTabClose;
      this.onCloseAll = onCloseAll;
      this.onTabDetach = onTabDetach;
      this.onDirtyIndicatorClick = null;
      this.visibilityManager = visibilityManager;
      this.tabs = new Map();
      this.activeTabId = null;
      this.options = {};
      this.closeAllButton = null;

      if (appearanceManager) {
        appearanceManager.subscribe(this.applyAppearanceSettings.bind(this));
      }

      this.tabBarWrapper = makeElement('div', { className: 'tab-bar-wrapper' });
      this.tabButtonsContainer = makeElement('ul', { className: 'tab-buttons' });
      this.tabContentPanelsContainer = makeElement('div', {
        className: 'tab-content-panels',
      });

      if (this.onCloseAll) {
        this.closeAllButton = makeElement(
          'button',
          {
            className: 'tab-close-all-button',
            onclick: () => this.onCloseAll(),
          },
          '❌'
        );
        this.closeAllButton.addEventListener('mouseover', () =>
          GlowingTooltip.show(this.closeAllButton, 'Close all open tabs', {
            color: [211, 47, 47],
          })
        );
        this.closeAllButton.addEventListener('mouseout', () =>
          GlowingTooltip.hide()
        );

        this.tabBarWrapper.append(this.tabButtonsContainer, this.closeAllButton);
      } else {
        this.tabBarWrapper.append(this.tabButtonsContainer);
      }

      this.mainContainer.append(
        this.tabBarWrapper,
        this.tabContentPanelsContainer
      );

      this._updateCloseAllButtonVisibility();

      if (this.visibilityManager) {
        this.visibilityManager.subscribe(this._updateGlowBoxPositions.bind(this));
      }
      this.tabButtonsContainer.addEventListener(
        'scroll',
        this._updateGlowBoxPositions.bind(this),
        { passive: true }
      );
    }

  addTab(title, contentElement, closable = true, id = null, isReadOnly = false) {
      const tabId = id || `tab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      if (this.tabs.has(tabId)) {
        this.setActiveTab(tabId);
        return tabId;
      }

      const tabButton = makeElement('li', {
        className: 'tab-button',
        'data-tab-id': tabId,
        onclick: () => this._handleTabClick(tabId),
      });

      const dirtyIndicator = makeElement('span', { className: 'tab-dirty-indicator' });
      dirtyIndicator.onclick = (e) => {
        e.stopPropagation();
        if (this.onDirtyIndicatorClick) this.onDirtyIndicatorClick(tabId);
      };
      tabButton.appendChild(dirtyIndicator);

      const finalTitle = isReadOnly ? `${title} (Read-Only)` : title;
      const titleSpan = makeElement('span', { className: 'tab-title' }, finalTitle);
      tabButton.appendChild(titleSpan);

      if (closable) {
        const closeButton = makeElement('button', {
          className: 'tab-close-button',
          onclick: (e) => { e.stopPropagation(); this._requestCloseTab(tabId); }
        }, '×');
        tabButton.appendChild(closeButton);
      }

      this.tabButtonsContainer.appendChild(tabButton);

      if (contentElement) {
        contentElement.classList.add('tab-content-panel');
        contentElement.setAttribute('data-tab-id', tabId);
        contentElement.style.display = 'none';
        this.tabContentPanelsContainer.appendChild(contentElement);
      }

      dirtyIndicator.addEventListener('mouseover', () => GlowingTooltip.show(dirtyIndicator, 'Show differences...', { color: [40, 167, 69] }));
      dirtyIndicator.addEventListener('mouseout', () => GlowingTooltip.hide());

      tabButton.addEventListener('mouseover', (e) => {
        if (e.target.classList.contains('tab-dirty-indicator') || e.target.classList.contains('tab-close-button')) return;
        if (window.GlowingTooltip) {
          let tooltipText = `Open and surgically edit the source code of this file.`;
          let tooltipColor = [0, 191, 165]; // Cyan

          if (tabId === 'project-browser-tab') {
            tooltipText = 'Browse and choose a new project from a list of templates and sample projects.';
            tooltipColor = [230, 126, 34]; // Orange
          } else if (tabId === 'build-prompt-tab') {
            tooltipText = 'Compose your prompt instructions, configure system rules, and manage selected code context.';
            tooltipColor = [132, 51, 255]; // Purple
          } else if (tabId === 'output-tab') {
            tooltipText = 'Review, split, and copy compiled prompt payloads and code segments for your LLM.';
            tooltipColor = [40, 167, 69]; // Green
          } else if (tabId === 'playground-tab') {
            tooltipText = 'Experiment with live visual UI components, scripts, and playground test environments.';
            tooltipColor = [243, 156, 18]; // Amber
          }

          GlowingTooltip.show(e.currentTarget, tooltipText, { color: tooltipColor });
        }
      });
      tabButton.addEventListener('mouseout', () => {
        if (window.GlowingTooltip) GlowingTooltip.hide();
      });

      this.tabs.set(tabId, { id: tabId, title, isReadOnly, buttonElement: tabButton, contentElement, dirtyIndicator });
      this._updateCloseAllButtonVisibility();
      return tabId;
    }

  async _requestCloseTab(tabId) {
      if (!this.tabs.has(tabId)) return;

      const tab = this.tabs.get(tabId);
      const closeBtn = tab.buttonElement.querySelector('.tab-close-button');
      if (closeBtn) closeBtn.disabled = true;

      try {
        const canClose = await this.onTabClose(tabId);
        if (canClose) {
          // Handled by parent
        }
      } catch (error) {
        console.error('Error during tab close confirmation:', error);
      } finally {
        if (this.tabs.has(tabId) && closeBtn) {
          closeBtn.disabled = false;
        }
      }
    }

  removeTab(tabId) {
      // Protect the core persistent workspace utility tabs from deletion
      if (tabId === 'project-browser-tab' || tabId === 'build-prompt-tab' || tabId === 'output-tab') {
        return;
      }
      
      const tabToRemove = this.tabs.get(tabId);
      if (!tabToRemove) return;

      if (
        tabToRemove.dirtyIndicator &&
        GlowingTooltip.activeInstance?.options.target === tabToRemove.dirtyIndicator
      ) {
        GlowingTooltip.hide(true);
      }

      tabToRemove.buttonElement.remove();

      if (tabToRemove.contentElement) {
        tabToRemove.contentElement.remove();
      }

      this.tabs.delete(tabId);
      this._updateCloseAllButtonVisibility();

      if (this.visibilityManager) {
        this.visibilityManager.notify();
      }

      if (this.activeTabId === tabId) {
        this.activeTabId = null;
        const nextTabId = Array.from(this.tabs.keys()).pop();
        if (nextTabId) {
          this.setActiveTab(nextTabId);
        } else if (this.onTabChange) {
          this.onTabChange(null);
        }
      }
    }

  setActiveTab(tabId) {
      if (!this.tabs.has(tabId) || tabId === this.activeTabId) return;
      const oldTabId = this.activeTabId;
      
      // Authoritative, safe lookup:
      const app = this.app || window._dev_projectEditorInstance || window.projectApp;
      if (app && oldTabId) {
        const oldController = app.editorControllers?.get ? app.editorControllers.get(oldTabId) : null;
        if (oldController && oldController.viewManager) {
          oldController.viewManager.destroyGlowBoxes();
        }
      }
      
      // Restored original cleanup block:
      if (oldTabId) {
        const currentActiveTab = this.tabs.get(oldTabId);
        if (currentActiveTab) {
          currentActiveTab.buttonElement.classList.remove('active');
          if (currentActiveTab.contentElement) {
            currentActiveTab.contentElement.style.display = 'none';
          }
        }
      }
      
      const tabToActivate = this.tabs.get(tabId);
      tabToActivate.buttonElement.classList.add('active');
      if (tabToActivate.contentElement) {
        tabToActivate.contentElement.style.display = '';
      }
      this.activeTabId = tabId;
      this.onTabChange(tabId, oldTabId);
    }

  _applyStyles() {
      const o = this.options;
      const fullCss = `
        .tab-buttons { list-style: none; padding: 0 5px; margin: 0; display: flex; flex-wrap: nowrap; overflow-x: auto; border-bottom: 1px solid #4a4a4a; flex-shrink: 0; }
        .tab-button { user-select: none; padding: 0 ${
          o.tabHeight / 2.5
        }px; height: ${o.tabHeight}px; cursor: pointer; background-color: ${
        o.tabInactiveBg
      }; border: 1px solid transparent; border-bottom: none; margin-right: 6px; margin-top: 2px; border-radius: ${
        o.tabBorderRadius
      }px ${o.tabBorderRadius}px 0 0; color: ${o.tabTextColor}; font-size: ${
        o.tabFontSize
      }em; position: relative; display: flex; align-items: center; max-width: 220px; white-space: nowrap; transition: all 0.2s; }
        .tab-button .tab-title { flex-grow: 1; overflow: hidden; text-overflow: ellipsis; }
        .tab-button:hover:not(.active) { background-color: ${
          o.tabHoverBg
        }; color: #dfdfdf; }
        .tab-button.active { background-color: ${
          o.tabActiveBg
        }; border-color: #4a4a4a #4a4a4a transparent; border-top: 2px solid ${
        o.tabActiveBorderColor
      }; color: ${
        o.tabActiveTextColor
      }; font-weight: 600; z-index: 2; transform: translateY(1px); }
        .tab-close-button { background: transparent; border: none; color: #cccccc; cursor: pointer; font-size: 1.2em; line-height: 1; border-radius: 50%; flex-shrink: 0; transition: all 0.2s; width: 20px; height: 20px; margin-left: 2px; display: flex; align-items: center; justify-content: center; padding: 0; }
        .tab-close-button:hover:not(:disabled) { background-color: #d32f2f; color: #ffffff; }

        .tab-content-panels { flex-grow: 1; overflow: auto; position: relative; border: 1px solid #4a4a4a; border-top: none; z-index: 1; display: flex; flex-direction: column; }
        .tab-content-panel { flex-grow: 1; box-sizing: border-box; display: flex; flex-direction: column; }
      `;
      applyCss(fullCss, 'TabManagerStyles');
    }

  setTabHasContent(tabId, hasContent, contentElement = null) {
      const tab = this.tabs.get(tabId);
      if (!tab) return;

      if (tab.contentElement) {
        tab.contentElement.remove();
        tab.contentElement = null;
      }

      if (hasContent && contentElement) {
        tab.contentElement = contentElement;
        contentElement.classList.add('tab-content-panel');
        contentElement.setAttribute('data-tab-id', tabId);
        this.tabContentPanelsContainer.appendChild(contentElement);
        contentElement.style.display = this.activeTabId === tabId ? '' : 'none';
      }
    }

  _handleTabClick(tabId) {
      this.setActiveTab(tabId);
    }

  applyAppearanceSettings(allSettings) {
      const tabSettings = {
        tabHeight: allSettings['tabs.height'],
        tabFontSize: allSettings['tabs.fontSize'],
        tabBorderRadius: allSettings['tabs.borderRadius'],
        tabInactiveBg: allSettings['tabs.inactiveBg'],
        tabActiveBg: allSettings['tabs.activeBg'],
        tabHoverBg: allSettings['tabs.hoverBg'],
        tabTextColor: allSettings['tabs.textColor'],
        tabActiveTextColor: allSettings['tabs.activeTextColor'],
        tabDirtyIndicatorColor: allSettings['tabs.dirtyIndicatorColor'],
        tabActiveBorderColor: allSettings['tabs.activeBorderColor'],
      };
      this.options = { ...this.options, ...tabSettings };
      this._applyStyles();
    }

  _loadAppearanceSettings() {
      try {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
      } catch (e) {
        return {};
      }
    }

  closeAllTabs() {
      const allTabIds = Array.from(this.tabs.keys());

      for (const tabId of allTabIds) {
        this.removeTab(tabId);
      }

      this.activeTabId = null;
      if (this.onTabChange) {
        this.onTabChange(null);
      }
    }

  _updateCloseAllButtonVisibility() {
      if (this.closeAllButton) {
        const hasTabs = this.tabs.size > 0;
        this.closeAllButton.style.display = hasTabs ? 'flex' : 'none';
        this.closeAllButton.disabled = !hasTabs;
      }
    }

  updateTabDirtyState(tabId, isDirty) {
      const tab = this.tabs.get(tabId);
      if (!tab) return;
      const shouldShowDirty = isDirty && !tab.isReadOnly;
      tab.buttonElement.classList.toggle('is-dirty', shouldShowDirty);
    }

  _updateGlowBoxPositions() {}

  addTabAtStart(title, contentElement, closable = true, id = null) {
      const tabId = id || `tab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      if (this.tabs.has(tabId)) {
        this.setActiveTab(tabId);
        return tabId;
      }

      const tabButton = makeElement('li', {
        className: 'tab-button',
        'data-tab-id': tabId,
        onclick: () => this._handleTabClick(tabId),
      });

      const dirtyIndicator = makeElement('span', { className: 'tab-dirty-indicator' });
      dirtyIndicator.onclick = (e) => {
        e.stopPropagation();
        if (this.onDirtyIndicatorClick) this.onDirtyIndicatorClick(tabId);
      };
      tabButton.appendChild(dirtyIndicator);

      const titleSpan = makeElement('span', { className: 'tab-title' }, title);
      tabButton.appendChild(titleSpan);

      if (closable) {
        const closeButton = makeElement('button', {
          className: 'tab-close-button',
          onclick: (e) => { e.stopPropagation(); this._requestCloseTab(tabId); }
        }, '×');
        tabButton.appendChild(closeButton);
      }

      this.tabButtonsContainer.prepend(tabButton);

      if (contentElement) {
        contentElement.classList.add('tab-content-panel');
        contentElement.setAttribute('data-tab-id', tabId);
        contentElement.style.display = 'none';
        this.tabContentPanelsContainer.appendChild(contentElement);
      }

      dirtyIndicator.addEventListener('mouseover', () => GlowingTooltip.show(dirtyIndicator, 'Show differences...', { color: [40, 167, 69] }));
      dirtyIndicator.addEventListener('mouseout', () => GlowingTooltip.hide());

      tabButton.addEventListener('mouseover', (e) => {
        if (e.target.classList.contains('tab-dirty-indicator') || e.target.classList.contains('tab-close-button')) return;
        if (window.GlowingTooltip) {
          let tooltipText = `Open and surgically edit the source code of this file.`;
          let tooltipColor = [0, 191, 165];

          if (tabId === 'project-browser-tab') {
            tooltipText = 'Browse and choose a new project from a list of templates and sample projects.';
            tooltipColor = [230, 126, 34];
          } else if (tabId === 'build-prompt-tab') {
            tooltipText = 'Compose your prompt instructions, configure system rules, and manage selected code context.';
            tooltipColor = [132, 51, 255];
          } else if (tabId === 'output-tab') {
            tooltipText = 'Review, split, and copy compiled prompt payloads and code segments for your LLM.';
            tooltipColor = [40, 167, 69];
          } else if (tabId === 'playground-tab') {
            tooltipText = 'Experiment with live visual UI components, scripts, and playground test environments.';
            tooltipColor = [243, 156, 18];
          }

          GlowingTooltip.show(e.currentTarget, tooltipText, { color: tooltipColor });
        }
      });
      tabButton.addEventListener('mouseout', () => {
        if (window.GlowingTooltip) GlowingTooltip.hide();
      });

      this.tabs.set(tabId, { id: tabId, title, buttonElement: tabButton, contentElement, dirtyIndicator });
      this._updateCloseAllButtonVisibility();
      return tabId;
    }

  addTabAfter(title, contentElement, closable = true, id = null, anchorTabId) {
      const tabId = id || `tab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      if (this.tabs.has(tabId)) {
        this.setActiveTab(tabId);
        return tabId;
      }

      const tabButton = makeElement('li', {
        className: 'tab-button',
        'data-tab-id': tabId,
        onclick: () => this._handleTabClick(tabId),
      });

      const dirtyIndicator = makeElement('span', { className: 'tab-dirty-indicator' });
      dirtyIndicator.onclick = (e) => {
        e.stopPropagation();
        if (this.onDirtyIndicatorClick) this.onDirtyIndicatorClick(tabId);
      };
      tabButton.appendChild(dirtyIndicator);

      const titleSpan = makeElement('span', { className: 'tab-title' }, title);
      tabButton.appendChild(titleSpan);

      if (closable) {
        const closeButton = makeElement('button', {
          className: 'tab-close-button',
          onclick: (e) => { e.stopPropagation(); this._requestCloseTab(tabId); }
        }, '×');
        tabButton.appendChild(closeButton);
      }

      if (contentElement) {
        contentElement.classList.add('tab-content-panel');
        contentElement.setAttribute('data-tab-id', tabId);
        contentElement.style.display = 'none';
        this.tabContentPanelsContainer.appendChild(contentElement);
      }

      dirtyIndicator.addEventListener('mouseover', () => GlowingTooltip.show(dirtyIndicator, 'Show differences...', { color: [40, 167, 69] }));
      dirtyIndicator.addEventListener('mouseout', () => GlowingTooltip.hide());

      tabButton.addEventListener('mouseover', (e) => {
        if (e.target.classList.contains('tab-dirty-indicator') || e.target.classList.contains('tab-close-button')) return;
        if (window.GlowingTooltip) {
          let tooltipText = `Open and surgically edit the source code of this file.`;
          let tooltipColor = [0, 191, 165];

          if (tabId === 'project-browser-tab') {
            tooltipText = 'Browse and choose a new project from a list of templates and sample projects.';
            tooltipColor = [230, 126, 34];
          } else if (tabId === 'build-prompt-tab') {
            tooltipText = 'Compose your prompt instructions, configure system rules, and manage selected code context.';
            tooltipColor = [132, 51, 255];
          } else if (tabId === 'output-tab') {
            tooltipText = 'Review, split, and copy compiled prompt payloads and code segments for your LLM.';
            tooltipColor = [40, 167, 69];
          } else if (tabId === 'playground-tab') {
            tooltipText = 'Experiment with live visual UI components, scripts, and playground test environments.';
            tooltipColor = [243, 156, 18];
          }

          GlowingTooltip.show(e.currentTarget, tooltipText, { color: tooltipColor });
        }
      });
      tabButton.addEventListener('mouseout', () => {
        if (window.GlowingTooltip) GlowingTooltip.hide();
      });

      this.tabs.set(tabId, { id: tabId, title, buttonElement: tabButton, contentElement, dirtyIndicator });

      const anchorTab = this.tabs.get(anchorTabId);
      if (anchorTab && anchorTab.buttonElement.parentElement) {
        const anchorNode = anchorTab.buttonElement;
        anchorNode.parentElement.insertBefore(tabButton, anchorNode.nextSibling);
      } else {
        this.tabButtonsContainer.prepend(tabButton);
      }

      this._updateCloseAllButtonVisibility();
      return tabId;
    }

  detachTab(tabId) {
      const tab = this.tabs.get(tabId);
      if (!tab || !this.onTabDetach) return;

      tab.buttonElement.remove();
      if (tab.contentElement && tab.contentElement.parentNode) {
        tab.contentElement.parentNode.removeChild(tab.contentElement);
      }
      if (tab.contentElement) tab.contentElement.style.display = '';

      this.tabs.delete(tabId);
      this._updateCloseAllButtonVisibility();

      if (this.activeTabId === tabId) {
        this.activeTabId = null;
        const nextTabId = Array.from(this.tabs.keys()).pop();
        if (nextTabId) {
          this.setActiveTab(nextTabId);
        } else if (this.onTabChange) {
          this.onTabChange(null);
        }
      }

      this.onTabDetach(tabId);
    }

  static _doc() {
      return [
        this._doc_overview(),
        this._doc_tab_lifecycle(),
        this._doc_dirty_states()
      ].join('\n\n---\n\n');
    }

  static _doc_overview() {
      return `# TabManager\n\nThe \`TabManager\` is responsible for handling the UI and logic associated with open editor tabs in the Vibes environment. It manages creating new tabs, switching between active tabs, and removing tabs when files are closed.`;
    }

  static _doc_tab_lifecycle() {
      return `## Tab Lifecycle\n\nWhen a file is opened, \`TabManager\` creates a new button in the tab bar and associates it with a specific DOM element (the editor container). It triggers lifecycle callbacks to notify the rest of the app when the active tab changes, ensuring the sidebar and other contextual UI elements stay in sync.`;
    }

  static _doc_dirty_states() {
      return `## Dirty States\n\n\`TabManager\` tracks the "dirty" state of each open file. If a file has unsaved modifications, it applies visual indicators (like a colored dot) to the corresponding tab. When the user attempts to close a dirty tab, the orchestrator is notified to prompt for saving before proceeding.`;
    }

}

