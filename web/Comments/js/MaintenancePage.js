
class MaintenancePage {
  constructor() {
    this.root = document.getElementById('maintenance-root');
    this.api = new ServerAPI();
    this.threadId = 'main';
    this.stats = null;
    this.snapshot = null;
    this.currentSessionUser = null;
    this.selectedParentId = '';
    this.isBusy = false;
    this.randomCounter = 1;
    this.lastStatus = 'Ready.';
    this.allThreads = [];

    this.applyStyles();
    this.render();
    this.refreshAll();
  }

  applyStyles() {
    const css = `
      .maint-wrap { max-width: 1200px; margin: 0 auto; padding: 24px; color: #eef3ff; font-family: system-ui, sans-serif; }
      .maint-header { margin-bottom: 24px; border-bottom: 1px solid #3a4353; padding-bottom: 16px; }
      .maint-card { background: #20242b; border: 1px solid #3a4353; border-radius: 12px; padding: 16px; margin-bottom: 18px; }
      .maint-card h2 { margin: 0 0 14px 0; font-size: 18px; color: #a6b0c3; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #2f3745; padding-bottom: 10px; }
      .maint-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
      .maint-row.column { align-items: flex-start; }
      .maint-label { min-width: 110px; color: #a6b0c3; font-weight: 600; font-size: 14px; }
      .maint-input { padding: 10px; border-radius: 8px; border: 1px solid #3a4353; background: #15171b; color: #eef3ff; min-width: 220px; box-sizing: border-box; }
      .maint-input.grow { flex: 1; }
      .maint-pre { margin: 0; white-space: pre-wrap; word-break: break-word; padding: 12px; border-radius: 8px; border: 1px solid #3a4353; background: #0e1116; color: #cfe3ff; max-height: 420px; overflow: auto; font-family: monospace; font-size: 13px; }
      .maint-textarea { width: 100%; min-height: 110px; padding: 10px; border-radius: 8px; border: 1px solid #3a4353; background: #15171b; color: #eef3ff; box-sizing: border-box; font-family: monospace; font-size: 14px; }
      .maint-button { padding: 9px 12px; border-radius: 8px; border: 1px solid #3a4353; font-weight: 700; cursor: pointer; transition: opacity 0.2s, transform 0.1s; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
      .maint-button:hover { opacity: 0.85; transform: translateY(-1px); }
      .maint-button:active { transform: translateY(0); }
      .maint-user-avatar { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 1px solid #3a4353; }
      .maint-snapshot-row { border-bottom: 1px solid #2f3745; display: flex; gap: 10px; align-items: flex-start; flex-wrap: wrap; padding: 8px 0; }
      .maint-snapshot-info { flex: 1; min-width: 500px; font-family: monospace; white-space: pre-wrap; font-size: 13px; }
      .maint-empty-msg { color: #a6b0c3; font-style: italic; }
      .maint-identity-box { display: flex; align-items: center; gap: 15px; background: #15171b; padding: 12px 16px; border-radius: 8px; border: 1px solid #29c46d; color: #29c46d; font-weight: bold; font-size: 16px; margin-bottom: 20px; }
      .maint-identity-box.anon { border-color: #ff7b72; color: #ff7b72; }
    `;
    applyCss(css, 'maintenance-page-styles');
  }

  render() {
    if (!this.root) return;
    this.root.innerHTML = '';

    const wrap = makeElement('div', { className: 'maint-wrap' });

    // --- Header ---
    const header = makeElement('div', { className: 'maint-header' });
    header.appendChild(
      makeElement(
        'h1',
        { style: 'margin: 0 0 5px 0;' },
        'Live Server Maintenance Lab'
      )
    );
    header.appendChild(
      makeElement(
        'div',
        { style: 'color: #a6b0c3;' },
        'Instantly test user sessions, post to real threads, and manage data.'
      )
    );
    wrap.appendChild(header);

    // --- Active Identity ---
    wrap.appendChild(this.buildIdentityPanel());

    // --- Layout Grid ---
    wrap.appendChild(this.buildGlobalSettingsPanel());
    wrap.appendChild(this.buildUsersPanel());
    wrap.appendChild(this.buildQuickPostPanel());
    wrap.appendChild(this.buildSnapshotPanel());
    wrap.appendChild(this.buildLogPanel());

    this.root.appendChild(wrap);
  }

  buildIdentityPanel() {
    const isAnon = !this.currentSessionUser;

    const box = makeElement('div', {
      className: isAnon ? 'maint-identity-box anon' : 'maint-identity-box',
    });

    if (isAnon) {
      box.appendChild(
        makeElement(
          'span',
          { style: 'flex: 1;' },
          'Current Identity: ANONYMOUS (Not Logged In)'
        )
      );
    } else {
      const u = this.currentSessionUser;
      const name = u.displayName + (u.suffix > 1 ? `#${u.suffix}` : '');
      box.appendChild(
        makeElement(
          'span',
          { style: 'flex: 1;' },
          `Current Identity: ${name} (ID: ${u.id})`
        )
      );

      const logoutBtn = this.makeButton(
        'Become Anonymous (Log Out)',
        () => this.handleLogout(),
        '#ff7b72',
        '#1a0f10'
      );
      box.appendChild(logoutBtn);
    }

    return box;
  }

  buildGlobalSettingsPanel() {
    const section = this.card('Target Server & Threads');

    // API URL
    const row1 = this.row();
    row1.appendChild(this.label('API URL'));
    this.apiInput = makeElement('input', {
      type: 'text',
      value: this.api.baseUrl,
      className: 'maint-input grow',
      onchange: () => {
        this.api.setBaseUrl(this.apiInput.value);
        this.refreshAll();
      },
    });
    row1.appendChild(this.apiInput);
    section.appendChild(row1);

    // Threads Buttons
    const row2 = this.row();
    row2.appendChild(this.label('Available Threads'));
    const threadsContainer = makeElement('div', {
      style: 'display: flex; gap: 8px; flex-wrap: wrap; flex: 1;',
    });

    if (this.allThreads && this.allThreads.length > 0) {
      this.allThreads.forEach((tId) => {
        const isCurrent = tId === this.threadId;
        const btn = this.makeButton(
          tId,
          () => {
            this.threadId = tId;
            this.refreshAll();
          },
          isCurrent ? '#58a6ff' : '#2a2f39',
          isCurrent ? '#08111f' : '#b8c0d9'
        );
        threadsContainer.appendChild(btn);
      });
    } else {
      threadsContainer.appendChild(
        makeElement(
          'span',
          { className: 'maint-empty-msg' },
          'No threads found.'
        )
      );
    }

    // Add new thread manual input
    const newThreadInput = makeElement('input', {
      type: 'text',
      placeholder: 'Type new ID...',
      className: 'maint-input',
      style: 'width: 140px; min-width: 140px;',
    });
    const newThreadBtn = this.makeButton(
      'Go',
      () => {
        if (newThreadInput.value.trim()) {
          this.threadId = newThreadInput.value.trim();
          this.refreshAll();
        }
      },
      '#2a2f39',
      '#eef3ff'
    );

    threadsContainer.appendChild(newThreadInput);
    threadsContainer.appendChild(newThreadBtn);

    row2.appendChild(threadsContainer);
    section.appendChild(row2);

    // Danger Actions
    const row3 = this.row();
    row3.appendChild(this.label('Actions'));
    row3.appendChild(
      this.makeButton('↻ Refresh State', () => this.refreshAll())
    );
    row3.appendChild(
      this.makeButton(
        'Clear Current Thread',
        () => this.handleClearThread(),
        '#ff7b72',
        '#1a0f10'
      )
    );
    row3.appendChild(
      this.makeButton(
        'Delete Last Comment',
        () => this.handleDeleteMostRecent(),
        '#ffd866',
        '#1d1b10'
      )
    );
    section.appendChild(row3);

    return section;
  }

  buildUsersPanel() {
    const section = this.card('User Directory (Click to Assume Identity)');
    this.usersBox = makeElement('div', {
      style: 'display: flex; flex-wrap: wrap; gap: 10px;',
    });

    if (!this.snapshot || !this.snapshot.users || !this.snapshot.users.length) {
      this.usersBox.appendChild(
        makeElement(
          'div',
          { className: 'maint-empty-msg' },
          'No users exist on this server yet. Post a comment to create one automatically.'
        )
      );
    } else {
      const users = [...this.snapshot.users].sort((a, b) => {
        return String(a.displayName || '').localeCompare(
          String(b.displayName || '')
        );
      });

      const currentId = this.currentSessionUser
        ? this.currentSessionUser.id
        : null;

      for (const user of users) {
        const isCurrent = user.id === currentId;
        const btn = makeElement('button', {
          className: 'maint-button',
          style: `
            background: ${isCurrent ? '#29c46d' : '#2a2f39'};
            color: ${isCurrent ? '#08111f' : '#eef3ff'};
            border: 1px solid ${isCurrent ? '#29c46d' : '#3a4353'};
          `,
          title: `ID: ${user.id} | Normalized: ${user.normalizedName}`,
          onclick: () => this.handleAssumeUser(user.id),
        });

        if (user.avatarUrl) {
          btn.appendChild(
            makeElement('img', {
              src: user.avatarUrl,
              alt: '',
              className: 'maint-user-avatar',
            })
          );
        }

        const nameStr =
          user.displayName + (user.suffix > 1 ? `#${user.suffix}` : '');
        btn.appendChild(makeElement('span', {}, nameStr));

        if (isCurrent) {
          btn.appendChild(
            makeElement(
              'span',
              { style: 'font-size: 11px; font-weight: 900; opacity: 0.7;' },
              '★'
            )
          );
        }

        this.usersBox.appendChild(btn);
      }
    }

    section.appendChild(this.usersBox);
    return section;
  }

  buildQuickPostPanel() {
    const section = this.card('Post a Test Comment');

    const row1 = this.row();
    row1.appendChild(this.label('Display Name'));
    this.displayNameInput = makeElement('input', {
      type: 'text',
      placeholder: 'Enter name (will create user if new)',
      value: this.currentSessionUser
        ? this.currentSessionUser.displayName
        : 'TestUser',
      className: 'maint-input grow',
    });
    row1.appendChild(this.displayNameInput);
    section.appendChild(row1);

    const row2 = this.row();
    row2.appendChild(this.label('Reply Parent ID'));
    this.parentIdInput = makeElement('input', {
      type: 'text',
      value: '',
      placeholder: 'Leave blank for top-level, or click "Reply" below',
      className: 'maint-input grow',
    });
    row2.appendChild(this.parentIdInput);
    section.appendChild(row2);

    const row3 = this.row(true);
    row3.appendChild(this.label('Comment Text'));
    const textWrapper = makeElement('div', {
      style: 'flex: 1; display: flex; flex-direction: column; gap: 8px;',
    });

    this.textInput = makeElement('textarea', {
      className: 'maint-textarea',
    });
    this.textInput.value = this.generateBoringText();

    const actionsRow = makeElement('div', {
      style: 'display: flex; gap: 10px; justify-content: flex-end;',
    });
    actionsRow.appendChild(
      this.makeButton(
        'Randomize Text',
        () => this.fillBoringRandomText(),
        '#2a2f39',
        '#eef3ff'
      )
    );
    actionsRow.appendChild(
      this.makeButton(
        'Post Comment',
        () => this.handleQuickPost(),
        '#58a6ff',
        '#08111f'
      )
    );

    textWrapper.appendChild(this.textInput);
    textWrapper.appendChild(actionsRow);
    row3.appendChild(textWrapper);

    section.appendChild(row3);
    return section;
  }

  buildSnapshotPanel() {
    const section = this.card(`Messages in Thread: '${this.threadId}'`);
    this.snapshotBox = makeElement('div');

    if (!this.snapshot || !this.snapshot.comments) {
      this.snapshotBox.appendChild(
        makeElement(
          'div',
          { className: 'maint-empty-msg' },
          'Loading snapshot...'
        )
      );
    } else {
      const flat = [];
      this.flattenComments(this.snapshot.comments, flat, 0);
      if (!flat.length) {
        this.snapshotBox.appendChild(
          makeElement(
            'div',
            { className: 'maint-empty-msg' },
            'This thread is completely empty.'
          )
        );
      } else {
        for (const item of flat) {
          const row = makeElement('div', {
            className: 'maint-snapshot-row',
            style: `padding-left: ${item.depth * 20}px;`,
          });

          const u = this.snapshot.users.find((x) => x.id === item.userId);
          const authorName = u ? u.displayName : item.userId;

          const info = makeElement(
            'div',
            { className: 'maint-snapshot-info' },
            `[ID: ${item.id}]\nUser: ${authorName}\nText: ${item.text || ''}`
          );
          row.appendChild(info);

          row.appendChild(
            this.makeButton(
              'Reply',
              () => {
                this.parentIdInput.value = item.id;
                this.lastStatus = 'Selected parent id ' + item.id;
                this.render();
                this.textInput.focus();
              },
              '#7ee787',
              '#0d1a11'
            )
          );

          row.appendChild(
            this.makeButton(
              'Delete',
              () => this.handleDeleteComment(item.id),
              '#ff7b72',
              '#1a0f10'
            )
          );

          this.snapshotBox.appendChild(row);
        }
      }
    }

    section.appendChild(this.snapshotBox);
    return section;
  }

  buildLogPanel() {
    const section = this.card('Status Log');
    this.statusBox = makeElement(
      'pre',
      {
        className: 'maint-pre',
      },
      this.lastStatus || 'Ready.'
    );
    section.appendChild(this.statusBox);
    return section;
  }

  card(title) {
    const card = makeElement('div', { className: 'maint-card' });
    card.appendChild(makeElement('h2', {}, title));
    return card;
  }

  row(column = false) {
    return makeElement('div', {
      className: column ? 'maint-row column' : 'maint-row',
    });
  }

  label(text) {
    return makeElement('div', { className: 'maint-label' }, text);
  }

  makeButton(label, onClick, bg = '#58a6ff', color = '#08111f') {
    return makeElement(
      'button',
      {
        type: 'button',
        className: 'maint-button',
        style: `background: ${bg}; color: ${color};`,
        onclick: onClick,
      },
      label
    );
  }

  flattenComments(nodes, out, depth) {
    for (const node of nodes || []) {
      out.push({
        id: node.id,
        userId: node.userId,
        text: node.text,
        depth,
      });
      this.flattenComments(node.children || [], out, depth + 1);
    }
  }

  getApiUrl() {
    return (this.apiInput && this.apiInput.value.trim()) || this.api.baseUrl;
  }

  setBusy(flag, message = null) {
    this.isBusy = flag;
    if (message) this.lastStatus = message;
    this.api.setBaseUrl(this.getApiUrl());
    this.render(); // Re-render to show busy state if needed
  }

  generateBoringText() {
    const wordsA = [
      'alpha',
      'beta',
      'gamma',
      'delta',
      'mint',
      'zebra',
      'orbit',
      'paper',
      'lamp',
      'tile',
    ];
    const wordsB = [
      'test',
      'comment',
      'reply',
      'boring',
      'plain',
      'simple',
      'quick',
      'debug',
      'check',
      'note',
    ];
    const wordsC = [
      'one',
      'two',
      'three',
      'four',
      'five',
      'six',
      'seven',
      'eight',
    ];
    const text =
      wordsB[this.randomCounter % wordsB.length] +
      ' ' +
      wordsA[(this.randomCounter + 2) % wordsA.length] +
      ' ' +
      wordsC[(this.randomCounter + 4) % wordsC.length] +
      ' #' +
      this.randomCounter;
    this.randomCounter += 1;
    return text;
  }

  fillBoringRandomText() {
    this.textInput.value = this.generateBoringText();
    this.lastStatus = 'Filled boring random text.';
    this.render();
  }

  async refreshAll() {
    this.setBusy(true, 'Fetching live data from server...');
    try {
      const [statsResult, snapshotResult, currentUserResult, threadsResult] =
        await Promise.all([
          this.api.adminGetThreadStats(this.threadId),
          this.api.getThreadData(this.threadId),
          this.api.getCurrentUser(),
          this.api.adminGetThreads(),
        ]);

      this.stats = statsResult;
      this.snapshot = snapshotResult;
      this.currentSessionUser =
        currentUserResult && currentUserResult.success
          ? currentUserResult.user
          : null;

      this.allThreads =
        threadsResult && threadsResult.success
          ? threadsResult.threads
          : ['main'];

      this.lastStatus = 'Sync complete.';
    } catch (error) {
      this.lastStatus = 'Refresh failed: ' + error.message;
    } finally {
      this.setBusy(false);
    }
  }

  async handleLogout() {
    this.setBusy(true, 'Clearing session...');
    try {
      await this.api.adminLogout();
      this.currentSessionUser = null;
      this.lastStatus = 'Session cleared. You are now anonymous.';
      if (this.displayNameInput) this.displayNameInput.value = '';
      await this.refreshAll();
    } catch (e) {
      this.lastStatus = 'Logout failed: ' + e.message;
      this.setBusy(false);
    }
  }

  async handleQuickPost() {
    const displayName = (this.displayNameInput.value || '').trim();
    const text = (this.textInput.value || '').trim();
    const parentId = (this.parentIdInput.value || '').trim();

    if (!displayName) {
      this.lastStatus = 'ERROR: Display name is required.';
      this.render();
      return;
    }
    if (!text) {
      this.lastStatus = 'ERROR: Comment text is required.';
      this.render();
      return;
    }

    this.setBusy(true, 'Posting to live server...');
    try {
      // 1. Ensure user exists and log them in
      const userResult = await this.api.getOrCreateUser(displayName);
      if (!userResult || !userResult.success || !userResult.user) {
        throw new Error(
          (userResult && userResult.error) || 'Could not get/create user.'
        );
      }

      // 2. Post the comment using their ID
      const postResult = await this.api.postComment({
        parentId: parentId || null,
        userId: userResult.user.id,
        text,
        threadId: this.threadId,
      });

      if (!postResult || !postResult.success) {
        throw new Error(
          (postResult && postResult.error) || 'Could not post comment.'
        );
      }

      this.lastStatus = 'Comment posted successfully.';

      // Reset inputs for next post
      this.textInput.value = '';
      this.parentIdInput.value = '';

      // Fetch latest state immediately
      await this.refreshAll();
    } catch (error) {
      this.lastStatus = 'Quick post failed: ' + error.message;
      this.setBusy(false);
    }
  }

  async handleAssumeUser(userId) {
    this.setBusy(true, 'Authenticating as ' + userId + '...');
    try {
      const result = await this.api.adminAssumeUserSession(userId);
      if (!result || !result.success) {
        throw new Error(
          (result && result.error) || 'Could not assume session.'
        );
      }
      this.currentSessionUser = result.user || null;
      this.lastStatus =
        'Success: You are now acting as ' +
        ((result.user && result.user.displayName) || userId) +
        '.';
      await this.refreshAll();
    } catch (error) {
      this.lastStatus = 'Assume user failed: ' + error.message;
      this.setBusy(false);
    }
  }

  async handleDeleteComment(commentId) {
    this.setBusy(true, 'Deleting comment ' + commentId + '...');
    try {
      const result = await this.api.adminDeleteComment(
        commentId,
        this.threadId
      );
      if (!result || !result.success) {
        throw new Error((result && result.error) || 'Delete failed.');
      }
      this.lastStatus = 'Comment deleted.';
      await this.refreshAll();
    } catch (error) {
      this.lastStatus = 'Delete failed: ' + error.message;
      this.setBusy(false);
    }
  }

  async handleDeleteMostRecent() {
    if (!this.snapshot || !this.snapshot.comments) {
      this.lastStatus = 'Snapshot not loaded yet.';
      this.render();
      return;
    }

    const flat = [];
    this.collectFullCommentRecords(this.snapshot.comments, flat);

    if (!flat.length) {
      this.lastStatus = 'No comments to delete.';
      this.render();
      return;
    }

    // Sort by timestamp descending
    flat.sort((a, b) =>
      String(b.timestamp || '').localeCompare(String(a.timestamp || ''))
    );
    await this.handleDeleteComment(flat[0].id);
  }

  collectFullCommentRecords(nodes, out) {
    for (const node of nodes || []) {
      out.push(node);
      this.collectFullCommentRecords(node.children || [], out);
    }
  }

  async handleClearThread() {
    if (
      !confirm(
        `Are you absolutely sure you want to WIPE all comments in thread '${this.threadId}'?`
      )
    )
      return;

    this.setBusy(true, 'Wiping thread data...');
    try {
      const result = await this.api.clearAllData(this.threadId);
      if (!result || !result.success) {
        throw new Error((result && result.error) || 'Clear failed.');
      }
      this.lastStatus = 'Thread ' + this.threadId + ' wiped clean.';
      await this.refreshAll();
    } catch (error) {
      this.lastStatus = 'Clear failed: ' + error.message;
      this.setBusy(false);
    }
  }


  async run(env) {
      this.env = env;
      this.root = env.container;
      this.applyStyles();
      this.render();
      await this.refreshAll();
      return this;
    }
}

