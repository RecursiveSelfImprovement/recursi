
class TestHarness {
  constructor(commentsApp) {
    this.app = commentsApp;
    this.settingsManager = new HarnessSettingsManager(this.app);
    this.container = null;
    this.userSwitcherDisplay = null;
    // Set the callback that allows the settings manager to trigger a UI update
    this.settingsManager.onUpdateCallback = () =>
      this._updateAllSettingControls();
  }

  init() {
    this.settingsManager.load();
    this.settingsManager.apply();

    this.container = this.app.appContainer;
    const topLevelPostBox = this.container.querySelector(
      '.top-level-post-container'
    );

    const controls = this._createControls();
    this.container.insertBefore(controls, topLevelPostBox);
    this._applyHarnessStyles();

    // Expose global hook for external activation
    console.log(
      'Comments Settings available via console: window.openCommentSettings()'
    );

    const initialApiMode = this.settingsManager.get('apiMode');
    this.app.switchApiMode(initialApiMode).then(() => {
      this.updateUserDisplay();
    });
  }

  _applyStyles() {
    const css = `
        .test-harness-container {
            border: 1px dashed var(--h-harness-border-color, var(--border-color));
            background-color: var(--h-harness-bg-color, transparent);
            padding: 10px;
            margin-bottom: 20px;
            border-radius: 6px;
        }
        .harness-fieldset {
            border: 1px solid var(--h-harness-border-color, var(--border-color));
            border-radius: 4px;
            margin-top: 10px;
            padding: 10px 15px;
        }
        .harness-fieldset h4 {
            margin: 15px 0 5px;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 4px;
            color: var(--text-tertiary);
        }
        .harness-fieldset legend {
            padding: 0 5px;
            font-size: 12px;
            color: var(--text-tertiary);
            cursor: pointer;
        }
        .harness-fieldset-content {
            max-height: 1500px;
            overflow: hidden;
            transition: max-height 0.4s ease-out, opacity 0.4s ease-out;
            opacity: 1;
        }
         .harness-fieldset.is-collapsed .harness-fieldset-content {
            max-height: 0;
            opacity: 0;
            padding-top: 0;
            padding-bottom: 0;
            margin-top: 0;
         }
        .slider-control {
            display: grid;
            grid-template-columns: 140px 1fr 40px;
            align-items: center;
            gap: 10px;
            font-size: 13px;
            margin-top: 8px;
        }
        .slider-control label {
            text-align: right;
        }
        .slider-control input[type=range] {
            flex-grow: 1;
        }
        .slider-control span {
            width: 25px;
            font-family: var(--font-mono);
        }
        .import-export-container {
            margin-top: 15px;
        }
        .settings-json-area {
            width: 100%;
            min-height: 100px;
            font-family: var(--font-mono);
            font-size: 12px;
            background-color: var(--bg-tertiary);
            color: var(--text-secondary);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            box-sizing: border-box;
            padding: 8px;
            resize: vertical;
        }
        .import-export-container .button-group {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
    `;
    applyCss(css, 'test-harness-styles');
  }

  _createControls() {
    const bar = makeElement('div', { className: 'user-switcher-bar' });
    this.userSwitcherDisplay = makeElement('span', {}, 'Posting as: Anonymous');

    const apiModeButton = makeElement('button', {
      className: 'api-mode-button rebuild-button',
      onclick: (e) => this.toggleApiMode(e),
    });
    this.updateApiModeButton(
      apiModeButton,
      this.settingsManager.get('apiMode')
    );

    const threadInput = makeElement('input', {
      type: 'text',
      className: 'thread-id-input',
      value: this.app.threadId,
      placeholder: 'Thread ID',
      style: {
        width: '80px',
        padding: '4px',
        marginLeft: '5px',
        border: '1px solid #555',
        borderRadius: '4px',
        backgroundColor: '#333',
        color: '#ccc',
      },
    });

    const threadButton = makeElement(
      'button',
      {
        onclick: () => {
          const newId = threadInput.value.trim() || 'main';
          if (newId !== this.app.threadId) {
            this.app.threadId = newId;
            this.app.loadInitialData();
            console.log(`Switched to thread: ${newId}`);
          }
        },
      },
      'Load Thread'
    );

    const settingsButton = makeElement(
      'button',
      {
        onclick: () => this.showSettingsDialog(),
      },
      '⚙ Settings'
    );

    const debugModeButton = makeElement(
      'button',
      {
        className: 'debug-toggle-button',
        onclick: (e) => this.app.toggleDebugMode(e),
      },
      'Debug Mode'
    );

    const sortButton = makeElement(
      'button',
      {
        className: 'global-sort-button',
        onclick: (e) => this.app.toggleGlobalSortOrder(e),
      },
      'Sort by: Newest'
    );

    const collapseButton = makeElement(
      'button',
      { onclick: () => this.randomlyCollapseComments() },
      'Collapse Random'
    );

    const rebuildButton = makeElement(
      'button',
      { className: 'rebuild-button', onclick: () => this.rebuildAndSeedData() },
      '⟳ Rebuild & Seed'
    );

    const switchButton = makeElement(
      'button',
      { onclick: () => this.showUserSwitcherDialog() },
      'Switch / Create User'
    );

    bar.append(
      this.userSwitcherDisplay,
      apiModeButton,
      threadInput,
      threadButton,
      sortButton,
      debugModeButton,
      settingsButton,
      collapseButton,
      rebuildButton,
      switchButton
    );

    const container = makeElement('div', {
      className: 'test-harness-container',
    });
    container.append(bar);

    const collapseContainer = makeElement('div', {
      className: 'slider-control',
      style: { marginTop: '10px' },
    });
    const collapseLabel = makeElement(
      'label',
      { htmlFor: 'collapse-by-age-slider' },
      'Visible (Newest %):'
    );
    const collapseValue = makeElement('span', {}, '100%');
    const collapseSlider = makeElement('input', {
      type: 'range',
      id: 'collapse-by-age-slider',
      min: 0,
      max: 100,
      step: 1,
      value: 100,
    });

    collapseSlider.oninput = () => {
      const percentile = parseInt(collapseSlider.value, 10);
      collapseValue.textContent = `${percentile}%`;
    };

    collapseSlider.onchange = () => {
      const percentile = parseInt(collapseSlider.value, 10);
      this.collapseCommentsByAge(percentile);
    };

    collapseContainer.append(collapseLabel, collapseSlider, collapseValue);
    container.append(collapseContainer);

    return container;
  }

  _createGeometryControls() {
    const fieldset = makeElement('fieldset', {
      className: 'harness-fieldset is-collapsed',
    });
    const legend = makeElement('legend', {}, 'Geometry Controls ▼');
    const content = makeElement('div', {
      className: 'harness-fieldset-content',
    });

    legend.onclick = () => {
      fieldset.classList.toggle('is-collapsed');
      legend.textContent = fieldset.classList.contains('is-collapsed')
        ? 'Geometry Controls ▼'
        : 'Geometry Controls ▲';
    };

    const createSlider = (label, min, max, step, value, callback) => {
      const id = `slider-${label.replace(/\s+/g, '-')}`;
      const container = makeElement('div', { className: 'slider-control' });
      const labelEl = makeElement('label', { htmlFor: id }, `${label}: `);
      const valueEl = makeElement('span', {}, value);
      const inputEl = makeElement('input', {
        type: 'range',
        id,
        min,
        max,
        step,
        value,
      });

      inputEl.oninput = () => {
        valueEl.textContent = inputEl.value;
        callback(parseFloat(inputEl.value));
      };
      container.append(labelEl, inputEl, valueEl);
      return container;
    };

    const options = this.app.commentView.options;

    content.appendChild(
      createSlider('Indentation', 10, 60, 1, options.indentation, (val) => {
        this.app.commentView.options.indentation = val;
        this.app.commentView.refreshLayout();
      })
    );
    content.appendChild(
      createSlider('Line Width', 1, 10, 0.5, options.lineWidth, (val) => {
        this.app.commentView.options.lineWidth = val;
        this.app.commentView.refreshLayout();
      })
    );

    fieldset.append(legend, content);
    return fieldset;
  }

  showUserSwitcherDialog() {
    const content = makeElement('div', { id: 'user-dialog-content' });
    const userList = makeElement('div', { className: 'user-list' });
    let dialog; // Declare here to be in scope for loginAs helper

    const loginAs = async (displayName) => {
      // This helper now handles both switching and creating by calling the API,
      // which will establish a server session in 'live' mode.
      const result = await this.app.serverAPI.getOrCreateUser(displayName);
      if (result.success && result.user) {
        this.app.userManager.addUser(result.user);
        this.app.setCurrentUser(result.user);
        this.updateUserDisplay();
        if (dialog) dialog.close();
      } else {
        alert(
          `Failed to log in as '${displayName}': ${
            result.error || 'Unknown error'
          }`
        );
      }
    };

    this.app.userManager.getAllUsers().forEach((user) => {
      let buttonLabel = user.displayName;
      if (this.app.userManager.isDuplicate(user.normalizedName)) {
        buttonLabel += user.suffix;
      }
      const btn = makeElement(
        'button',
        {
          onclick: () => loginAs(user.displayName),
        },
        buttonLabel
      );
      userList.appendChild(btn);
    });

    const form = makeElement('form', { className: 'create-user-form' });
    const nameInput = makeElement('input', {
      type: 'text',
      placeholder: 'Enter new name (letters only, 3+)',
      pattern: '^[a-zA-Z]{3,}$', // Match server validation
      required: true,
    });
    const createButton = makeElement(
      'button',
      { type: 'submit' },
      'Create & Use'
    );

    form.append(nameInput, createButton);
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (nameInput.checkValidity()) {
        createButton.disabled = true;
        createButton.textContent = 'Creating...';
        await loginAs(nameInput.value.trim());
        // Re-enable button in case of failure
        createButton.disabled = false;
        createButton.textContent = 'Create & Use';
      }
    };

    content.append(makeElement('h3', {}, 'Select a user:'), userList, form);

    dialog = new DialogBoxExtended({
      title: 'User Selection',
      content: content,
      buttons: [{ label: 'Close' }],
    });

    setTimeout(() => nameInput.focus(), 50);
  }

  updateUserDisplay() {
    if (!this.userSwitcherDisplay) return;
    const user = this.app.currentUser;
    const apiMode = this.app.apiMode || 'mock';

    if (user) {
      let displayText = `[${apiMode.toUpperCase()}] Posting as: ${
        user.displayName
      }`;
      if (this.app.userManager.isDuplicate(user.normalizedName))
        displayText += user.suffix;
      this.userSwitcherDisplay.textContent = displayText;
    } else {
      this.userSwitcherDisplay.textContent = `[${apiMode.toUpperCase()}] Anonymous`;
    }
  }

  _createImportExportPanel() {
    const container = makeElement('div', {
      className: 'import-export-container',
    });
    const header = makeElement('h4', {}, 'Import / Export');

    const textarea = makeElement('textarea', {
      className: 'settings-json-area',
      placeholder:
        'Paste settings JSON here and click Import, or click Export.',
    });

    const buttonGroup = makeElement('div', { className: 'button-group' });

    // Checkbox for Diff Export
    const exportDiffLabel = makeElement('label', {
      style:
        'font-size: 12px; color: var(--text-secondary); display: flex; align-items: center; gap: 5px; cursor: pointer;',
    });
    const exportDiffCheck = makeElement('input', {
      type: 'checkbox',
      checked: true,
    });
    exportDiffLabel.append(
      exportDiffCheck,
      makeElement('span', {}, 'Export only changes (diff)')
    );

    const exportButton = makeElement('button', {}, 'Export JSON');
    exportButton.onclick = () => {
      let data;
      if (exportDiffCheck.checked) {
        data = this.settingsManager.getChangedSettings();
        if (Object.keys(data).length === 0) {
          textarea.value = '// No settings have been changed from defaults.';
          return;
        }
      } else {
        data = this.settingsManager.settings;
      }
      textarea.value = JSON.stringify(data, null, 2);
      textarea.select();
    };

    const importButton = makeElement('button', {}, 'Import JSON');
    importButton.onclick = () => {
      if (textarea.value.trim() === '' || textarea.value.startsWith('//')) {
        alert('Text area is empty or contains a comment.');
        return;
      }
      this.settingsManager.importSettings(textarea.value);
    };

    buttonGroup.append(exportButton, importButton);
    container.append(header, exportDiffLabel, textarea, buttonGroup);
    return container;
  }

  async rebuildAndSeedData() {
    const threadId = this.app.threadId;

    if (this.app.apiMode !== 'live') {
      await this.app.serverAPI.rebuildAndSeed();
      await this.app.loadInitialData();
      this.updateUserDisplay();
      return;
    }

    if (
      !window.confirm(
        `This will wipe data for thread '${threadId}' on the LIVE server and replace it with sample comments. Are you sure?`
      )
    ) {
      return;
    }

    console.log(`Starting LIVE server seed process for thread: ${threadId}...`);

    try {
      console.log('Step 1: Clearing thread data...');
      const clearResult = await this.app.serverAPI.clearAllData(threadId);
      if (!clearResult.success) throw new Error(clearResult.error);

      console.log('Step 2: Parsing sample comments file...');
      const posts = await this._parseSampleComments();

      // Pre-calculate IDs on the client side to ensure relationships are valid
      // before they even reach the server.
      posts.forEach((p) => {
        // Generate a unique ID for every post
        p.liveId = `seed-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;
      });

      console.log('Step 3: Creating users on server (Sequential)...');
      const uniqueUsernames = [...new Set(posts.map((p) => p.user))];
      const userMap = new Map();

      // FIX: Run sequentially to prevent File Write Race Condition on PHP server
      // (Parallel requests were overwriting the users.txt file)
      for (const name of uniqueUsernames) {
        const res = await this.app.serverAPI.getOrCreateUser(name);
        if (res.success) {
          userMap.set(res.user.displayName, res.user.id);
        } else {
          console.error(`Failed to create user ${name}:`, res.error);
        }
      }

      console.log('Step 4: Posting comments...');
      // Sort by time to ensure mostly chronological order in file (good practice)
      posts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      for (const post of posts) {
        const userId = userMap.get(post.user);
        if (!userId) {
          console.warn(
            `Could not find user ID for "${post.user}", skipping comment.`
          );
          continue;
        }

        // Map the integer parent ID (from text file) to the new GUID (liveId)
        let parentLiveId = null;
        if (post.parentId) {
          const parentPost = posts.find((p) => p.id === post.parentId);
          if (parentPost) {
            parentLiveId = parentPost.liveId;
          } else {
            console.warn(
              `Parent post ${post.parentId} not found for ${post.id}`
            );
          }
        }

        const result = await this.app.serverAPI.adminSeedComment({
          id: post.liveId, // Send our pre-generated ID
          userId: userId,
          parentId: parentLiveId, // Send the pre-calculated parent GUID
          text: post.text,
          timestamp: post.timestamp,
          threadId: threadId,
        });

        if (!result.success) {
          console.error(`Failed to seed comment ${post.id}:`, result.error);
        }
      }

      console.log('Step 5: Seeding complete. Reloading data from server...');
      await this.app.loadInitialData();
      this.updateUserDisplay();
      alert(
        `Live server thread '${threadId}' has been successfully re-seeded.`
      );
    } catch (error) {
      alert(`An error occurred during the seeding process: ${error.message}`);
      console.error('Seeding process failed:', error);
    }
  }

  async toggleApiMode(e) {
    const button = e.currentTarget;
    const currentMode = this.settingsManager.get('apiMode');
    const newMode = currentMode === 'mock' ? 'live' : 'mock';

    this.settingsManager.set('apiMode', newMode, true); // noApply = true
    this.updateApiModeButton(button, newMode);

    await this.app.switchApiMode(newMode);
    this.updateUserDisplay();
  }

  updateApiModeButton(button, mode) {
    if (!button) return;
    if (mode === 'live') {
      button.textContent = 'API: LIVE';
      button.style.color = '#ff6b6b';
      button.style.borderColor = '#ff6b6b';
    } else {
      button.textContent = 'API: Mock';
      button.style.color = 'var(--accent-gold)';
      button.style.borderColor = 'var(--accent-gold)';
    }
  }

  _applyHarnessStyles() {
    const css = `
        .test-harness-container {
            border: 1px dashed var(--h-harness-border-color, var(--border-color));
            background-color: var(--h-harness-bg-color, transparent);
            padding: 10px;
            margin-bottom: 20px;
            border-radius: 6px;
        }
        .harness-dialog-content {
            display: flex;
            flex-direction: column;
            gap: 5px;
            min-width: 450px;
        }
        .harness-dialog-content h4 {
            margin: 15px 0 5px;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 4px;
            color: var(--text-tertiary);
        }
        .slider-control {
            display: grid;
            grid-template-columns: 160px 1fr 50px;
            align-items: center;
            gap: 10px;
            font-size: 13px;
        }
        .slider-control label {
            text-align: right;
        }
        .slider-control input[type=range] {
            flex-grow: 1;
        }
        .slider-control span {
            width: 35px;
            font-family: var(--font-mono);
            text-align: right;
            padding-right: 5px;
        }
        .import-export-container {
            margin-top: 15px;
        }
        .settings-json-area {
            width: 100%;
            min-height: 100px;
            font-family: var(--font-mono);
            font-size: 12px;
            background-color: var(--bg-tertiary);
            color: var(--text-secondary);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            box-sizing: border-box;
            padding: 8px;
            resize: vertical;
        }
        .import-export-container .button-group {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
    `;
    applyCss(css, 'test-harness-styles');
  }

  _createSliderControl(key, label, min, max, step) {
    const id = `slider-${key}`;
    const container = makeElement('div', { className: 'slider-control' });
    const labelEl = makeElement('label', { htmlFor: id }, `${label}: `);
    const valueEl = makeElement('span', {}, this.settingsManager.get(key));
    const inputEl = makeElement('input', {
      type: 'range',
      id,
      min,
      max,
      step,
      value: this.settingsManager.get(key),
      'data-setting-key': key,
    });
    inputEl.oninput = () => {
      valueEl.textContent = inputEl.value;
      this.settingsManager.set(key, parseFloat(inputEl.value));
    };
    container.append(labelEl, inputEl, valueEl);
    return container;
  }

  _createColorControl(key, label) {
    const id = `color-${key}`;
    const container = makeElement('div', { className: 'slider-control' });
    const labelEl = makeElement('label', { htmlFor: id }, `${label}: `);
    const inputEl = makeElement('input', {
      type: 'color',
      id,
      value: this.settingsManager.get(key),
      'data-setting-key': key,
    });
    inputEl.oninput = () => this.settingsManager.set(key, inputEl.value);
    container.append(labelEl, inputEl, makeElement('span')); // Placeholder for alignment
    return container;
  }

  _createSelectControl(key, label, options) {
    const id = `select-${key}`;
    const container = makeElement('div', { className: 'slider-control' });
    const labelEl = makeElement('label', { htmlFor: id }, `${label}: `);
    const selectEl = makeElement('select', { id, 'data-setting-key': key });
    options.forEach((opt) => {
      const optionEl = makeElement('option', { value: opt.value }, opt.label);
      if (this.settingsManager.get(key) === opt.value) {
        optionEl.selected = true;
      }
      selectEl.appendChild(optionEl);
    });
    selectEl.onchange = () => this.settingsManager.set(key, selectEl.value);
    container.append(labelEl, selectEl, makeElement('span')); // Placeholder for alignment
    return container;
  }

  _updateAllSettingControls() {
    const controls = document.querySelectorAll('[data-setting-key]');
    controls.forEach((control) => {
      const key = control.dataset.settingKey;
      if (this.settingsManager.settings.hasOwnProperty(key)) {
        const value = this.settingsManager.get(key);
        if (control.type === 'range') {
          control.value = value;
          const valueEl = control.nextElementSibling;
          if (valueEl && valueEl.tagName === 'SPAN') {
            valueEl.textContent = value;
          }
        } else if (control.type === 'color' || control.tagName === 'SELECT') {
          control.value = value;
        }
      }
    });
  }

  async _parseSampleComments() {
    const response = await fetch('/Comments/sampleComments.txt');
    if (!response.ok) {
      throw new Error(
        `Failed to fetch sample comments: ${response.statusText}`
      );
    }
    const text = await response.text();
    const posts = [];
    const blocks = text
      .split(
        '======================================================================'
      )
      .filter((b) => b.trim());

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      const post = {};
      const contentLines = [];
      let inContent = false;

      for (const line of lines) {
        if (
          line.startsWith(
            '----------------------------------------------------------------------'
          )
        ) {
          inContent = true;
          continue;
        }

        if (inContent) {
          contentLines.push(line);
        } else {
          const [key, ...valueParts] = line.split(':');
          const value = valueParts.join(':').trim();
          if (key === 'POST ID') post.id = value;
          else if (key === 'USER') post.user = value;
          else if (key === 'DATE')
            post.timestamp = new Date(value).toISOString();
          else if (key === 'REPLY TO')
            post.parentId = value === 'none' ? null : value;
        }
      }
      post.text = contentLines.join('\n').trim();
      posts.push(post);
    }
    return posts;
  }

  randomlyCollapseComments() {
    const nodes = this.app.commentView.nodesMap;
    if (nodes.size === 0) return;

    let collapsedCount = 0;
    nodes.forEach((node) => {
      if (node.isTemporary || node.isDeleted) {
        node.setCollapsed(false);
        return;
      }

      const shouldCollapse = Math.random() < 0.4;
      node.setCollapsed(shouldCollapse);
      if (shouldCollapse) collapsedCount++;
    });

    this.app.commentView.refreshLayout();

    console.log(`[TestHarness] Collapsed ${collapsedCount} comments.`);
  }

  collapseCommentsByAge(percentile) {
    const view = this.app.commentView;
    if (!view || view.nodesMap.size === 0) return;

    // Get all valid nodes and sort them by timestamp, newest first.
    const allNodes = Array.from(view.nodesMap.values());
    const sortedNodes = allNodes
      .filter((node) => !node.isTemporary && !node.isDeleted)
      .sort((a, b) => b.timestamp - a.timestamp);

    const totalNodes = sortedNodes.length;
    if (totalNodes === 0) return;

    // Calculate the number of newest comments to keep expanded.
    const countToKeepExpanded = Math.round(totalNodes * (percentile / 100));

    // Apply collapsed state based on position in the sorted list.
    sortedNodes.forEach((node, index) => {
      const shouldBeCollapsed = index >= countToKeepExpanded;
      node.setCollapsed(shouldBeCollapsed);
    });

    // Trigger a single layout refresh to show the changes.
    view.refreshLayout();
  }

  showSettingsDialog() {
    new DialogBoxExtended({
      title: 'Comments System Settings',
      content: this._createCombinedSettingsContent(),
      buttons: [{ label: 'Close', isCloseButton: true }],
      draggable: true,
      resizable: true,
      width: '500px',
    });
  }

  static showSettings(appInstance) {
    const harness = new TestHarness(appInstance);
    // Load settings but don't init the full toolbar
    harness.settingsManager.load();
    harness.settingsManager.apply();
    harness.showSettingsDialog();
  }

  _createColorWithOpacityControl(colorKey, opacityKey, label) {
    const container = makeElement('div', {
      className: 'slider-control',
      style: 'grid-template-columns: 140px 40px 1fr 40px;',
    });

    const labelEl = makeElement(
      'label',
      { htmlFor: `color-${colorKey}` },
      `${label}: `
    );

    const colorInput = makeElement('input', {
      type: 'color',
      id: `color-${colorKey}`,
      value: this.settingsManager.get(colorKey),
      'data-setting-key': colorKey,
      style:
        'width: 100%; height: 25px; padding: 0; border: none; cursor: pointer;',
    });
    colorInput.oninput = () =>
      this.settingsManager.set(colorKey, colorInput.value);

    const opacityInput = makeElement('input', {
      type: 'range',
      min: 0,
      max: 1,
      step: 0.05,
      value: this.settingsManager.get(opacityKey),
      'data-setting-key': opacityKey,
    });

    const opacityValue = makeElement(
      'span',
      {},
      this.settingsManager.get(opacityKey)
    );

    opacityInput.oninput = () => {
      opacityValue.textContent = opacityInput.value;
      this.settingsManager.set(opacityKey, parseFloat(opacityInput.value));
    };

    container.append(labelEl, colorInput, opacityInput, opacityValue);
    return container;
  }

  static applySettings(appInstance, settings) {
    const defaults = HarnessSettingsManager.defaults;
    // Merge provided settings over defaults to ensure complete object
    const finalSettings = { ...defaults, ...settings };
    appInstance.applyTheme(finalSettings);
  }

  _createCombinedSettingsContent() {
    const content = makeElement('div', { className: 'harness-dialog-content' });

    // --- THEME PRESETS ---
    const themesSection = makeElement('div', { style: 'margin-bottom: 15px;' });
    themesSection.appendChild(
      makeElement('h4', { style: 'margin-top: 0;' }, 'Theme Presets')
    );

    const themesRow = makeElement('div', {
      style: 'display: flex; flex-wrap: wrap; gap: 8px;',
    });

    const themes = this._getThemePresets();

    themes.forEach((theme) => {
      const swatch = makeElement('div', {
        style: `width: 16px; height: 16px; border-radius: 3px; border: 1px solid rgba(255,255,255,0.2); background: linear-gradient(135deg, ${theme.preview[0]} 50%, ${theme.preview[1]} 50%); flex-shrink: 0;`,
      });
      const btn = makeElement(
        'button',
        {
          style:
            'display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-secondary); border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.2s;',
          onclick: () => {
            this.settingsManager.importSettings(JSON.stringify(theme.settings));
          },
        },
        swatch,
        theme.name
      );
      btn.onmouseenter = () => {
        btn.style.borderColor = 'var(--accent-blue)';
        btn.style.color = 'var(--text-primary)';
      };
      btn.onmouseleave = () => {
        btn.style.borderColor = 'var(--border-color)';
        btn.style.color = 'var(--text-secondary)';
      };
      themesRow.appendChild(btn);
    });

    themesSection.appendChild(themesRow);
    content.appendChild(themesSection);

    // --- TABS ---
    const tabs = makeElement('div', {
      style:
        'display: flex; border-bottom: 1px solid var(--border-color); margin-bottom: 15px;',
    });

    const createTab = (label, active) => {
      const btn = makeElement(
        'button',
        {
          style: `padding: 8px 15px; background: ${
            active ? 'var(--bg-tertiary)' : 'transparent'
          }; border: none; border-bottom: 2px solid ${
            active ? 'var(--accent-gold)' : 'transparent'
          }; color: var(--text-primary); cursor: pointer;`,
        },
        label
      );
      return btn;
    };

    const layoutPanel = makeElement('div', {});
    const appearancePanel = makeElement('div', { style: 'display: none;' });

    const layoutTab = createTab('Layout & Geometry', true);
    const appearanceTab = createTab('Appearance & Colors', false);

    layoutTab.onclick = () => {
      layoutPanel.style.display = 'block';
      appearancePanel.style.display = 'none';
      layoutTab.style.borderBottomColor = 'var(--accent-gold)';
      layoutTab.style.background = 'var(--bg-tertiary)';
      appearanceTab.style.borderBottomColor = 'transparent';
      appearanceTab.style.background = 'transparent';
    };

    appearanceTab.onclick = () => {
      layoutPanel.style.display = 'none';
      appearancePanel.style.display = 'block';
      appearanceTab.style.borderBottomColor = 'var(--accent-gold)';
      appearanceTab.style.background = 'var(--bg-tertiary)';
      layoutTab.style.borderBottomColor = 'transparent';
      layoutTab.style.background = 'transparent';
    };

    tabs.append(layoutTab, appearanceTab);

    // --- Layout Content ---
    layoutPanel.append(makeElement('h4', {}, 'Thread Lines'));
    layoutPanel.append(
      this._createSliderControl('indentation', 'Indentation', 10, 60, 1)
    );
    layoutPanel.append(
      this._createSliderControl('lineWidth', 'Line Width', 1, 10, 0.5)
    );
    layoutPanel.append(
      this._createSliderControl('lineRadius', 'Line Corner Radius', 0, 20, 1)
    );
    layoutPanel.append(
      this._createSliderControl(
        'lineConnectionPointYOffset',
        'Branch Y Offset',
        0,
        50,
        1
      )
    );
    layoutPanel.append(
      this._createSliderControl(
        'lineConnectionPointXOffset',
        'Branch Horiz. Offset',
        -20,
        40,
        1
      )
    );
    layoutPanel.append(
      this._createSliderControl(
        'lineEndpointOffset',
        'Branch Endpoint Gap',
        -20,
        20,
        1
      )
    );

    layoutPanel.append(makeElement('h4', {}, 'Arrow & Connectors'));
    layoutPanel.append(
      this._createSliderControl('arrowSize', 'Arrow Size', 10, 32, 1)
    );
    layoutPanel.append(
      this._createSliderControl(
        'arrowVerticalOffset',
        'Arrow Vert. Offset',
        -15,
        15,
        1
      )
    );
    layoutPanel.append(
      this._createSliderControl(
        'arrowShadowWidth',
        'Arrow Shadow Width',
        1,
        15,
        1
      )
    );
    layoutPanel.append(
      this._createColorControl('arrowShadowColor', 'Arrow Shadow Color')
    );

    layoutPanel.append(
      this._createSliderControl(
        'headerLineWidth',
        'Header Line Width',
        1,
        5,
        0.5
      )
    );
    layoutPanel.append(
      this._createSliderControl(
        'headerLineVerticalOffset',
        'Header Line Offset',
        -10,
        10,
        1
      )
    );

    layoutPanel.append(makeElement('h4', {}, 'Elements'));
    layoutPanel.append(
      this._createSliderControl('verticalPadding', 'Vertical Padding', 0, 40, 1)
    );
    layoutPanel.append(
      this._createSliderControl(
        'commentContentMarginLeft',
        'Box Left Margin',
        0,
        30,
        1
      )
    );
    layoutPanel.append(
      this._createSliderControl(
        'avatarMarginTop',
        'Avatar Top Margin',
        0,
        20,
        1
      )
    );
    layoutPanel.append(
      this._createSliderControl(
        'avatarMarginRight',
        'Avatar Side Margin',
        0,
        20,
        1
      )
    );

    layoutPanel.append(makeElement('h4', {}, 'Animation'));
    layoutPanel.append(
      this._createSliderControl(
        'animationDuration',
        'Duration (ms)',
        0,
        1000,
        50
      )
    );

    // --- Appearance Content ---
    appearancePanel.append(makeElement('h4', {}, 'Text & Fonts'));
    appearancePanel.append(
      this._createSliderControl('fontSizeComment', 'Comment Font', 10, 24, 1)
    );
    appearancePanel.append(
      this._createSliderControl('fontSizeHeader', 'Header Font', 10, 24, 1)
    );
    appearancePanel.append(
      this._createSliderControl(
        'fontSizeTimestamp',
        'Timestamp Font',
        10,
        24,
        1
      )
    );
    appearancePanel.append(
      this._createSelectControl('timestampFormat', 'Timestamp', [
        { value: 'relative', label: 'Relative (e.g., 5m ago)' },
        { value: 'full', label: 'Full (e.g., yesterday at 14:30)' },
        { value: 'iso', label: 'ISO 8601' },
      ])
    );

    appearancePanel.append(
      makeElement('h4', {}, 'Backgrounds (Color + Opacity)')
    );
    appearancePanel.append(
      this._createColorWithOpacityControl(
        'bodyPostBoxBgHex',
        'bodyPostBoxBgOpacity',
        'Body / Post Box'
      )
    );
    appearancePanel.append(
      this._createColorWithOpacityControl(
        'mainPanelBgHex',
        'mainPanelBgOpacity',
        'Main Panel'
      )
    );
    appearancePanel.append(
      this._createColorWithOpacityControl(
        'inputsAvatarsBgHex',
        'inputsAvatarsBgOpacity',
        'Inputs / Avatars'
      )
    );
    appearancePanel.append(
      this._createColorWithOpacityControl(
        'ratingPanelBgHex',
        'ratingPanelBgOpacity',
        'Rating Panel'
      )
    );
    appearancePanel.append(
      this._createColorWithOpacityControl(
        'harnessBgHex',
        'harnessBgOpacity',
        'Harness Panel'
      )
    );
    appearancePanel.append(
      this._createColorWithOpacityControl(
        'genericCommentBgHex',
        'genericCommentBgOpacity',
        'Generic Comment'
      )
    );
    appearancePanel.append(
      this._createColorWithOpacityControl(
        'myCommentBgHex',
        'myCommentBgOpacity',
        'My Comment'
      )
    );

    appearancePanel.append(makeElement('h4', {}, 'Colors'));
    appearancePanel.append(
      this._createColorControl('headerLineColor', 'Header Connector')
    );
    appearancePanel.append(
      this._createColorControl('textColorPrimary', 'Text Primary')
    );
    appearancePanel.append(
      this._createColorControl('textColorSecondary', 'Text Secondary')
    );
    appearancePanel.append(
      this._createColorControl('textColorTertiary', 'Text Tertiary')
    );
    appearancePanel.append(
      this._createColorControl('usernameColor', 'Username Color')
    );
    appearancePanel.append(this._createColorControl('accentColor', 'Accent'));
    appearancePanel.append(
      this._createColorControl('buttonTextColor', 'Button Text')
    );
    appearancePanel.append(
      this._createColorControl('lineColor', 'Thread Lines')
    );

    appearancePanel.append(
      this._createColorControl('ratingPanelBorderColor', 'Rating Panel Border')
    );
    appearancePanel.append(
      this._createColorControl('ratingPanelGlowColor', 'Rating Glow')
    );
    appearancePanel.append(
      this._createColorControl('harnessBorderColor', 'Harness Border')
    );

    content.append(tabs, layoutPanel, appearancePanel);

    content.append(
      makeElement('hr', {
        style:
          'border: 0; border-top: 1px solid var(--border-color); margin: 20px 0;',
      })
    );
    content.append(this._createImportExportPanel());

    const resetButton = makeElement(
      'button',
      {
        className: 'rebuild-button',
        style: { marginTop: '15px', alignSelf: 'flex-start' },
        onclick: () => {
          if (window.confirm('Reset all settings to defaults?')) {
            this.settingsManager.reset();
          }
        },
      },
      'Reset All Settings'
    );
    content.append(resetButton);

    return content;
  }

  _getThemePresets() {
    return [
      {
        name: 'Default (Red & Black)',
        preview: ['#1f0000', '#000000'],
        settings: {},
      },
      {
        name: 'Midnight Blue',
        preview: ['#0a1628', '#1a2744'],
        settings: {
          mainPanelBgHex: '#0a1628',
          mainPanelBgOpacity: 0.85,
          bodyPostBoxBgHex: '#0d1117',
          genericCommentBgHex: '#1a2744',
          genericCommentBgOpacity: 0.7,
          myCommentBgHex: '#1e4976',
          myCommentBgOpacity: 0.2,
          inputsAvatarsBgHex: '#1a2744',
          harnessBgHex: '#0d1117',
          lineColor: '#2d4a7a',
          headerLineColor: '#4a90d9',
          accentColor: '#58a6ff',
          usernameColor: '#79c0ff',
          textColorPrimary: '#c9d1d9',
          textColorSecondary: '#8b949e',
          textColorTertiary: '#6e7681',
          arrowShadowColor: '#0a1628',
          harnessBorderColor: '#2d4a7a',
          ratingPanelBgHex: '#0d1117',
          ratingPanelBorderColor: '#2d4a7a',
          ratingPanelGlowColor: '#1f6feb',
        },
      },
      {
        name: 'Forest',
        preview: ['#0b1a0b', '#1a2e1a'],
        settings: {
          mainPanelBgHex: '#0b1a0b',
          mainPanelBgOpacity: 0.8,
          bodyPostBoxBgHex: '#111b11',
          genericCommentBgHex: '#1a2e1a',
          genericCommentBgOpacity: 0.65,
          myCommentBgHex: '#2d5a2d',
          myCommentBgOpacity: 0.15,
          inputsAvatarsBgHex: '#1a2e1a',
          harnessBgHex: '#111b11',
          lineColor: '#3a5a3a',
          headerLineColor: '#66bb6a',
          accentColor: '#4caf50',
          usernameColor: '#81c784',
          textColorPrimary: '#c8e6c9',
          textColorSecondary: '#a5d6a7',
          textColorTertiary: '#6d8f6d',
          arrowShadowColor: '#0b1a0b',
          harnessBorderColor: '#3a5a3a',
          ratingPanelBgHex: '#111b11',
          ratingPanelBorderColor: '#3a5a3a',
          ratingPanelGlowColor: '#388e3c',
        },
      },
      {
        name: 'Warm Sand',
        preview: ['#2a2118', '#3d3228'],
        settings: {
          mainPanelBgHex: '#2a2118',
          mainPanelBgOpacity: 0.85,
          bodyPostBoxBgHex: '#1e1814',
          genericCommentBgHex: '#3d3228',
          genericCommentBgOpacity: 0.6,
          myCommentBgHex: '#8d6e3f',
          myCommentBgOpacity: 0.15,
          inputsAvatarsBgHex: '#3d3228',
          harnessBgHex: '#1e1814',
          lineColor: '#6b5a48',
          headerLineColor: '#d4a76a',
          accentColor: '#e6a23c',
          usernameColor: '#f0c674',
          textColorPrimary: '#e8ddd0',
          textColorSecondary: '#bfb0a0',
          textColorTertiary: '#8a7d70',
          arrowShadowColor: '#2a2118',
          harnessBorderColor: '#6b5a48',
          ratingPanelBgHex: '#1e1814',
          ratingPanelBorderColor: '#6b5a48',
          ratingPanelGlowColor: '#c88a2e',
        },
      },
      {
        name: 'Cyberpunk',
        preview: ['#0d0221', '#1a0a3e'],
        settings: {
          mainPanelBgHex: '#0d0221',
          mainPanelBgOpacity: 0.9,
          bodyPostBoxBgHex: '#080114',
          genericCommentBgHex: '#1a0a3e',
          genericCommentBgOpacity: 0.7,
          myCommentBgHex: '#6c2bd9',
          myCommentBgOpacity: 0.15,
          inputsAvatarsBgHex: '#1a0a3e',
          harnessBgHex: '#080114',
          lineColor: '#6c2bd9',
          headerLineColor: '#ff2cf1',
          accentColor: '#bf5af2',
          usernameColor: '#ff6ac1',
          textColorPrimary: '#e4d0ff',
          textColorSecondary: '#b89ce0',
          textColorTertiary: '#7a5da0',
          arrowShadowColor: '#0d0221',
          harnessBorderColor: '#6c2bd9',
          ratingPanelBgHex: '#080114',
          ratingPanelBorderColor: '#6c2bd9',
          ratingPanelGlowColor: '#ff2cf1',
        },
      },
      {
        name: 'Light Mode',
        preview: ['#ffffff', '#f5f5f5'],
        settings: {
          mainPanelBgHex: '#ffffff',
          mainPanelBgOpacity: 1,
          bodyPostBoxBgHex: '#f0f2f5',
          genericCommentBgHex: '#f5f5f5',
          genericCommentBgOpacity: 0.9,
          myCommentBgHex: '#dbeafe',
          myCommentBgOpacity: 0.6,
          inputsAvatarsBgHex: '#e8e8e8',
          harnessBgHex: '#f9f9f9',
          harnessBgOpacity: 1,
          lineColor: '#c0c0c0',
          headerLineColor: '#2196f3',
          accentColor: '#1976d2',
          usernameColor: '#1565c0',
          textColorPrimary: '#1c1e21',
          textColorSecondary: '#4b5563',
          textColorTertiary: '#9ca3af',
          buttonTextColor: '#ffffff',
          arrowShadowColor: '#ffffff',
          harnessBorderColor: '#d0d0d0',
          ratingPanelBgHex: '#ffffff',
          ratingPanelBgOpacity: 1,
          ratingPanelBorderColor: '#d0d0d0',
          ratingPanelGlowColor: '#2196f3',
        },
      },
    ];
  }

}

