
class AdminTestPage {
  constructor(container) {
    this.container =
      typeof container === 'string'
        ? document.getElementById(container)
        : container;

    if (!this.container) {
      // Fallback if instantiated with no arguments or a missing ID
      this.container =
        document.getElementById('admin-test-root') || document.body;
    }

    this.api = new ServerAPI();

    this.commentsApp = new Comments();
    this.currentThreadId = 'main';

    this.allThreads = [];
    this.allUsers = [];
    this.currentAdminUser = null;

    this.applyStyles();
    this.render();
    this.initSystem();
  }

  applyStyles() {
    const css = `
      .admin-layout {
        display: grid;
        grid-template-columns: 320px 1fr;
        height: 100vh;
        width: 100vw;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: #0e1116;
        color: #eef3ff;
      }

      .admin-sidebar {
        background: #15171b;
        border-right: 1px solid #2f3745;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
      }

      .admin-header {
        padding: 20px;
        border-bottom: 1px solid #2f3745;
        background: #1e2128;
      }
      .admin-header h1 {
        margin: 0 0 5px 0;
        font-size: 18px;
        color: #4da3ff;
      }
      .admin-header p {
        margin: 0;
        font-size: 12px;
        color: #8b949e;
      }

      .admin-section {
        padding: 20px;
        border-bottom: 1px solid #2f3745;
      }
      .admin-section h2 {
        margin: 0 0 15px 0;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #a6b0c3;
      }

      .admin-btn {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 10px 12px;
        margin-bottom: 8px;
        border-radius: 8px;
        border: 1px solid #3a4353;
        background: #20242b;
        color: #eef3ff;
        cursor: pointer;
        text-align: left;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.15s ease;
      }
      .admin-btn:hover {
        background: #2a2f39;
        border-color: #4da3ff;
      }
      .admin-btn.active {
        background: #4da3ff;
        color: #08111f;
        border-color: #4da3ff;
      }
      .admin-btn.anon {
        background: #ff7b72;
        color: #0e1116;
        border-color: #ff7b72;
      }
      
      .admin-user-avatar {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        object-fit: cover;
        background: #0e1116;
      }

      .admin-main-area {
        overflow-y: auto;
        padding: 40px;
        background: #0e1116;
      }
      
      /* Target the actual comments app to constrain its width */
      .admin-main-area .comments-app-container {
        margin: 0 auto;
      }
    `;
    applyCss(css, 'admin-test-page-styles');
  }

  render() {
    this.container.innerHTML = '';

    const layout = makeElement('div', { className: 'admin-layout' });

    // Sidebar
    this.sidebar = makeElement('div', { className: 'admin-sidebar' });

    // Sidebar Header
    const header = makeElement('div', { className: 'admin-header' });
    header.appendChild(makeElement('h1', {}, 'Live Server Admin'));
    header.appendChild(makeElement('p', {}, 'God-mode testing interface.'));

    // Status / Current Identity
    this.identitySection = makeElement('div', { className: 'admin-section' });

    // Threads
    this.threadsSection = makeElement('div', { className: 'admin-section' });

    // Users
    this.usersSection = makeElement('div', { className: 'admin-section' });

    this.sidebar.append(
      header,
      this.identitySection,
      this.threadsSection,
      this.usersSection
    );

    // Main Comment Area
    this.mainArea = makeElement('div', { className: 'admin-main-area' });

    layout.append(this.sidebar, this.mainArea);
    this.container.appendChild(layout);
  }

  async initSystem() {
    // 1. Mount the real Comments component into the main area
    await this.commentsApp.init(this.mainArea, {
      threadId: this.currentThreadId,
      apiMode: 'live',
      // We hook into the Comments app so if you create a user in the post box, the sidebar updates!
      onUserChange: (user) => {
        this.currentAdminUser = user;
        this.refreshData(); // Fetch the updated user list
      },
    });

    // 2. Fetch the initial data for the sidebar
    await this.refreshData();
  }

  async refreshData() {
    try {
      // Get all threads
      const threadsRes = await this.api.adminGetThreads();
      this.allThreads = threadsRes.success ? threadsRes.threads : ['main'];

      // Get all users (we can cheat and use getThreadData to grab the user DB quickly)
      const dataRes = await this.api.getThreadData('main');
      if (dataRes.success && dataRes.users) {
        this.allUsers = dataRes.users.sort((a, b) =>
          a.displayName.localeCompare(b.displayName)
        );
      }

      // Check who we are right now on the server
      const userRes = await this.api.getCurrentUser();
      this.currentAdminUser = userRes && userRes.success ? userRes.user : null;

      this.updateSidebarUI();
    } catch (e) {
      console.error('Error fetching admin data:', e);
    }
  }

  updateSidebarUI() {
    // --- Update Identity Section ---
    this.identitySection.innerHTML = '';
    this.identitySection.appendChild(makeElement('h2', {}, 'Current Session'));

    if (this.currentAdminUser) {
      const u = this.currentAdminUser;
      const name = u.displayName + (u.suffix > 1 ? `#${u.suffix}` : '');
      const btn = makeElement(
        'button',
        {
          className: 'admin-btn anon',
          onclick: () => this.handleLogout(),
        },
        `Log Out (${name})`
      );
      this.identitySection.appendChild(btn);
    } else {
      const btn = makeElement(
        'button',
        {
          className: 'admin-btn active',
          style: 'cursor: default; background: #2f3745; border-color: #2f3745;',
        },
        'Anonymous (Not Logged In)'
      );
      this.identitySection.appendChild(btn);
    }

    // --- Update Threads Section ---
    this.threadsSection.innerHTML = '';
    this.threadsSection.appendChild(makeElement('h2', {}, 'Active Threads'));

    this.allThreads.forEach((tId) => {
      const isCurrent = tId === this.currentThreadId;
      const btn = makeElement(
        'button',
        {
          className: `admin-btn ${isCurrent ? 'active' : ''}`,
          onclick: () => this.switchThread(tId),
        },
        `# ${tId}`
      );
      this.threadsSection.appendChild(btn);
    });

    // Add manual thread input to easily jump to a new thread
    const newThreadInput = makeElement('input', {
      type: 'text',
      placeholder: 'Type ID and hit Enter...',
      style:
        'width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #3a4353; background: #15171b; color: #fff; box-sizing: border-box; margin-top: 10px;',
      onkeydown: (e) => {
        if (e.key === 'Enter' && newThreadInput.value.trim()) {
          this.switchThread(newThreadInput.value.trim());
        }
      },
    });

    // WIPE THREAD BUTTON
    const wipeBtn = makeElement(
      'button',
      {
        className: 'admin-btn anon',
        style: 'margin-top: 15px; justify-content: center; font-weight: bold;',
        onclick: () => this.handleClearThread(),
      },
      `⚠ Wipe Thread: ${this.currentThreadId}`
    );

    this.threadsSection.append(newThreadInput, wipeBtn);

    // --- Update Users Section ---
    this.usersSection.innerHTML = '';
    this.usersSection.appendChild(makeElement('h2', {}, 'All Users'));

    if (this.allUsers.length === 0) {
      this.usersSection.appendChild(
        makeElement(
          'p',
          { style: 'font-size: 12px; color: #8b949e;' },
          'No users exist yet. Post a comment to create one.'
        )
      );
    }

    this.allUsers.forEach((user) => {
      const isCurrent =
        this.currentAdminUser && this.currentAdminUser.id === user.id;
      const name =
        user.displayName + (user.suffix > 1 ? `#${user.suffix}` : '');

      const btn = makeElement('button', {
        className: `admin-btn ${isCurrent ? 'active' : ''}`,
        onclick: () => this.assumeUser(user.id),
      });

      if (user.avatarUrl) {
        btn.appendChild(
          makeElement('img', {
            src: user.avatarUrl,
            className: 'admin-user-avatar',
          })
        );
      } else {
        // Placeholder avatar circle
        btn.appendChild(
          makeElement(
            'div',
            {
              className: 'admin-user-avatar',
              style:
                'background: #3a4353; display: flex; align-items: center; justify-content: center; font-size: 10px;',
            },
            name[0].toUpperCase()
          )
        );
      }

      btn.appendChild(makeElement('span', {}, name));
      this.usersSection.appendChild(btn);
    });
  }

  switchThread(threadId) {
    if (this.currentThreadId === threadId) return;
    console.log(`[AdminTest] Switching thread to: ${threadId}`);

    this.currentThreadId = threadId;

    // Instruct the real Comments app to load the new thread
    this.commentsApp.threadId = threadId;
    this.commentsApp.commentView.clear();
    this.commentsApp.loadInitialData();

    // Refresh Sidebar to highlight correct thread
    this.refreshData();
  }

  async assumeUser(userId) {
    console.log(`[AdminTest] Assuming user session for: ${userId}`);

    try {
      const res = await this.api.adminAssumeUserSession(userId);
      if (res.success && res.user) {
        // Tell the real Comments app who we are now
        this.commentsApp.setCurrentUser(res.user);
        // Refresh the thread data so the UI reflects ownership (e.g. "Edit" buttons appear on our comments)
        this.commentsApp.loadInitialData();
        // Update sidebar
        this.refreshData();
      } else {
        alert('Failed to switch user: ' + (res.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Error switching user.');
      console.error(e);
    }
  }

  async handleLogout() {
    console.log(`[AdminTest] Logging out...`);
    try {
      await this.api.adminLogout();
      // Tell the real Comments app we are anonymous
      this.commentsApp.setCurrentUser(null);
      this.commentsApp.loadInitialData();
      // Update sidebar
      this.refreshData();
    } catch (e) {
      console.error('Error logging out:', e);
    }
  }

  async handleClearThread() {
    if (
      !confirm(
        `Are you absolutely sure you want to WIPE all comments in thread '${this.currentThreadId}'? This cannot be undone.`
      )
    ) {
      return;
    }

    console.log(
      `[AdminTest] Wiping thread data for: ${this.currentThreadId}...`
    );
    try {
      const result = await this.api.clearAllData(this.currentThreadId);
      if (!result || !result.success) {
        throw new Error((result && result.error) || 'Clear failed.');
      }

      // Refresh UI
      this.commentsApp.commentView.clear();
      this.commentsApp.loadInitialData();
      this.refreshData();

      console.log(`[AdminTest] Thread '${this.currentThreadId}' wiped clean.`);
    } catch (error) {
      alert(`Clear failed: ${error.message}`);
    }
  }


  async run(env) {
      this.env = env;
      this.container = env.container;
      this.applyStyles();
      this.render();
      await this.initSystem();
      return this;
    }
}

