
class Comments {
  constructor() {
    this.container = null;
    this.commentView = null;
    this.userManager = new UserManager();
    this.styles = new CommentStyles();

    this.serverAPI = new MockServerAPI();
    this.apiMode = 'mock';

    this.currentUser = null;
    this.appContainer = null;
    this.isDebugMode = false;
    this.globalSortOrder = 'newest';
    this.topLevelPostBoxContainer = null;
    this.userAccountDialog = new UserAccountDialog(this);
    this.activeReplyController = null;
    this.threadId = 'main';

    this.demoBannerWrapperElement = null;
    this.demoBannerElement = null;
    this.demoBannerTextElement = null;
    this.demoBannerToggleElement = null;
    this.demoBannerPopupOverlay = null;
    this.realCommentThreshold = 3;
    this.hasResolvedInitialApiMode = false;
    this.demoBannerTheme = Math.random() < 0.5 ? 'blueprint' : 'sticky-note';
    this.launchSwagImages = [
      './launch-swag-key-labels.jpg',
      './launch-swag-glowtunes-demo.jpg',
    ];

    this.toolbar = new CommentToolbar(this);
  }

  createPostBox(parentId, onPostCallback, onCancelCallback) {
    const form = makeElement('form', { className: 'comment-post-box' });

    if (this.currentUser) {
      // --- LOGGED IN: Show post box with header ---
      const header = makeElement('div', { className: 'post-box-header' });
      form.appendChild(header);
      this._updatePostBoxHeader(header);

      const commentInput = makeElement('textarea', {
        placeholder: 'Write a comment...',
        required: true,
        className: 'comment-input',
      });

      const buttonContainer = makeElement('div', {
        className: 'post-box-actions',
      });

      const postButton = makeElement(
        'button',
        { type: 'submit', className: 'post-button' },
        'Post'
      );

      buttonContainer.appendChild(postButton);

      if (onCancelCallback) {
        const cancelButton = makeElement(
          'button',
          {
            type: 'button',
            className: 'cancel-button',
            onclick: onCancelCallback,
          },
          'Cancel'
        );
        buttonContainer.appendChild(cancelButton);
      }

      form.append(commentInput, buttonContainer);

      form.onsubmit = async (e) => {
        e.preventDefault();
        postButton.disabled = true;
        postButton.textContent = 'Posting...';

        const postResult = await this.serverAPI.postComment({
          parentId: parentId,
          userId: this.currentUser.id,
          text: commentInput.value,
          threadId: this.threadId,
        });

        if (postResult.success) {
          if (onPostCallback) onPostCallback();
          this.commentView.addComment(postResult.comment, parentId);
        } else {
          alert(`Error posting comment: ${postResult.error}`);
        }

        postButton.disabled = false;
        postButton.textContent = 'Post';
      };
    } else {
      // --- NOT LOGGED IN: Show quick-entry name field + comment box ---
      const nameRow = makeElement('div', {
        className: 'post-box-header',
        style: 'margin-bottom: 8px;',
      });
      const nameInput = makeElement('input', {
        type: 'text',
        className: 'username-input',
        placeholder: 'Pick a display name (3+ letters)',
        required: true,
        pattern: '^[a-zA-Z]{3,}$',
        style: 'flex-grow: 1;',
      });
      nameRow.appendChild(nameInput);
      form.appendChild(nameRow);

      const commentInput = makeElement('textarea', {
        placeholder: 'Write a comment...',
        required: true,
        className: 'comment-input',
      });

      const buttonContainer = makeElement('div', {
        className: 'post-box-actions',
      });

      const postButton = makeElement(
        'button',
        { type: 'submit', className: 'post-button' },
        'Post'
      );

      buttonContainer.appendChild(postButton);

      if (onCancelCallback) {
        const cancelButton = makeElement(
          'button',
          {
            type: 'button',
            className: 'cancel-button',
            onclick: onCancelCallback,
          },
          'Cancel'
        );
        buttonContainer.appendChild(cancelButton);
      }

      form.append(commentInput, buttonContainer);

      form.onsubmit = async (e) => {
        e.preventDefault();
        const displayName = nameInput.value.trim();
        if (!displayName || displayName.length < 3) {
          alert('Please enter a display name with at least 3 letters.');
          return;
        }

        postButton.disabled = true;
        postButton.textContent = 'Posting...';

        // Step 1: Quick-create the user (just a name, no email/password)
        const userResult = await this.serverAPI.getOrCreateUser(displayName);
        if (!userResult.success) {
          alert(`Error creating user: ${userResult.error}`);
          postButton.disabled = false;
          postButton.textContent = 'Post';
          return;
        }

        this.userManager.addUser(userResult.user);
        this.setCurrentUser(userResult.user);

        // Step 2: Post the comment
        const postResult = await this.serverAPI.postComment({
          parentId: parentId,
          userId: this.currentUser.id,
          text: commentInput.value,
          threadId: this.threadId,
        });

        if (postResult.success) {
          if (onPostCallback) onPostCallback();
          this.commentView.addComment(postResult.comment, parentId);
        } else {
          alert(`Error posting comment: ${postResult.error}`);
        }

        postButton.disabled = false;
        postButton.textContent = 'Post';
      };
    }

    return form;
  }

  setCurrentUser(user) {
    const oldUser = this.currentUser;
    this.currentUser = user;

    // NEW: Notify parent app if callback exists
    if (this.onUserChange) {
      this.onUserChange(user);
    }

    // Update Toolbar
    if (this.toolbar) {
      this.toolbar.updateUser();
    }

    if (
      user &&
      oldUser &&
      oldUser.id === user.id &&
      oldUser.displayName !== user.displayName
    ) {
      this.userManager.addUser(user);
      this._updateAllUserDisplays(user.id, user.displayName);
    } else if (user && !oldUser) {
      this.userManager.addUser(user);
    } else if (!user) {
      this.closeAllPopups();
    }

    if (this.topLevelPostBoxContainer) {
      const postBox =
        this.topLevelPostBoxContainer.querySelector('.comment-post-box');
      if (postBox) {
        const header = postBox.querySelector('.post-box-header');
        if (header) {
          if (this.currentUser) {
            this._updatePostBoxHeader(header);
          } else {
            this._showTopLevelPostBox();
          }
        }
      }
    }
  }

  toggleDebugMode(e) {
    const button = e.currentTarget;
    this.isDebugMode = !this.isDebugMode;
    this.appContainer.classList.toggle('debug-mode-active', this.isDebugMode);
    button.classList.toggle('active', this.isDebugMode);
    this.commentView.refreshLayout();
  }

  toggleGlobalSortOrder(e) {
    const button = e.currentTarget;
    this.globalSortOrder =
      this.globalSortOrder === 'newest' ? 'oldest' : 'newest';
    button.textContent = `Sort by: ${
      this.globalSortOrder === 'newest' ? 'Newest' : 'Oldest'
    }`;
    this.commentView.refreshLayout();
  }

  _showTopLevelPostButton() {
    this.topLevelPostBoxContainer.innerHTML = '';
    const postCommentButton = makeElement(
      'button',
      {
        className: 'post-comment-button',
        onclick: () => this._showTopLevelPostBox(),
      },
      'Post a new comment'
    );
    this.topLevelPostBoxContainer.appendChild(postCommentButton);

    // REMOVED: The block that recursively called setActiveReplyController(null)
    // The state management is now the responsibility of the caller (controller.close or init).
  }

  _showTopLevelPostBox() {
    const controller = {
      isTopLevel: true,
      close: () => {
        this._showTopLevelPostButton();
      },
    };
    this.setActiveReplyController(controller);

    this.topLevelPostBoxContainer.innerHTML = '';

    const onCancel = () => {
      controller.close();
    };
    const onPost = () => {
      controller.close();
    };

    const postBox = this.createPostBox(null, onPost, onCancel);
    this.topLevelPostBoxContainer.appendChild(postBox);

    // FIX: Prioritize focusing the username input if it exists (i.e. user not logged in)
    const focusEl =
      postBox.querySelector('.username-input') ||
      postBox.querySelector('.comment-input');
    if (focusEl) focusEl.focus();
  }

  async loadInitialData() {
    console.log(
      `[Comments] Loading initial data for thread: ${this.threadId} using mode: ${this.apiMode}`
    );

    try {
      const userSession = await this.serverAPI.getCurrentUser();

      if (userSession.success && userSession.user) {
        console.log(
          '✅ [Comments] Session restored! Logged in as:',
          userSession.user.displayName
        );
        this.userManager.addUser(userSession.user);
        this.setCurrentUser(userSession.user);
      } else {
        console.log(
          '⚪ [Comments] No active session found on server (Cookie missing or invalid).'
        );
        if (!this.currentUser) {
          this.setCurrentUser(null);
        }
      }
    } catch (e) {
      console.error(
        '❌ [Comments] Session check failed due to network error:',
        e
      );
    }

    const data = await this.serverAPI.getThreadData(this.threadId);

    if (data && data.success) {
      this.userManager.loadUsers(data.users);
      if (this.currentUser) {
        this.userManager.addUser(this.currentUser);
      }
      this.commentView.setData(data.comments);
    } else {
      console.error(
        'Failed to load thread data:',
        data ? data.error : 'Unknown error'
      );
      this.commentView.clear();
    }

    this.updateDemoBanner();
  }

  async switchApiMode(newMode) {
    if (this.apiMode === newMode && this.commentView.rootNodes.length > 0) {
      this.updateDemoBanner();
      return;
    }

    console.log(`Switching API mode to '${newMode}'...`);
    this.apiMode = newMode;
    this.commentView.clear();

    if (newMode === 'live') {
      this.serverAPI = new ServerAPI();
    } else {
      this.serverAPI = new MockServerAPI();
    }

    this.setCurrentUser(null);
    this.updateDemoBanner();

    await this.loadInitialData();
  }

  _updatePostBoxHeader(headerElement) {
    headerElement.innerHTML = '';
    if (!this.currentUser) return;

    let displayText = `Posting as: <span class="rendered-name">${NameRenderer.render(
      this.currentUser.displayName
    )}</span>`;
    if (this.userManager.isDuplicate(this.currentUser.normalizedName)) {
      // THE FIX: Removed the "#" from the suffix display.
      displayText += `<span class="user-name-suffix">${this.currentUser.suffix}</span>`;
    }

    const textEl = makeElement('span', {});
    textEl.innerHTML = displayText;

    const accountButton = makeElement(
      'button',
      {
        className: 'account-button',
        type: 'button',
        onclick: () => this.userAccountDialog.show(),
      },
      'My Account'
    );

    headerElement.append(textEl, accountButton);
  }

  _updateAllUserDisplays(userId, newDisplayName) {
    console.log(
      `Updating all displays for user ${userId} to "${newDisplayName}"`
    );
    const mainHeader =
      this.topLevelPostBoxContainer.querySelector('.post-box-header');
    if (mainHeader && this.currentUser && this.currentUser.id === userId) {
      this._updatePostBoxHeader(mainHeader);
    }

    this.commentView.nodesMap.forEach((node) => {
      if (node.userId === userId && node.domElement && !node.isDeleted) {
        const nameSpanContainer =
          node.domElement.querySelector('.comment-header');
        const nameSpan = nameSpanContainer.querySelector('.user-name');
        if (nameSpan) {
          // Re-render the name part
          nameSpan.innerHTML = NameRenderer.render(newDisplayName);

          // Check if suffix needs to be there and re-add if necessary
          const user = this.userManager.getUserById(userId);
          const suffixSpan =
            nameSpanContainer.querySelector('.user-name-suffix');
          if (this.userManager.isDuplicate(user.normalizedName)) {
            if (suffixSpan) {
              suffixSpan.textContent = user.suffix;
            } else {
              nameSpan.appendChild(
                makeElement(
                  'span',
                  { className: 'user-name-suffix' },
                  user.suffix
                )
              );
            }
          } else {
            if (suffixSpan) suffixSpan.remove();
          }
        }
      }
    });
  }

  closeAllPopups() {
    // Central place to close all types of popups.
    this.commentView.closeAllPopups(); // Closes any open rating panels.
    if (this.userAccountDialog && this.userAccountDialog.dialog) {
      this.userAccountDialog.dialog.close();
      this.userAccountDialog.dialog = null;
    }
  }

  setActiveReplyController(controller) {
    if (
      this.activeReplyController &&
      this.activeReplyController !== controller
    ) {
      this.activeReplyController.close();
    }
    this.activeReplyController = controller;
  }

  applyTheme(themeSettings) {
    if (!themeSettings) return;

    // 1. Apply CSS variables and classes
    const geometryUpdates = this.styles.updateTheme(themeSettings);

    // 2. Apply Geometry settings to the View (Javascript logic)
    if (this.commentView && Object.keys(geometryUpdates).length > 0) {
      let needsRefresh = false;
      for (const [key, value] of Object.entries(geometryUpdates)) {
        if (this.commentView.options[key] !== value) {
          this.commentView.options[key] = value;
          needsRefresh = true;
        }
      }
      if (needsRefresh) {
        this.commentView.refreshLayout();
      }
    }
  }

  async init(targetElement, options = {}) {
    this.container = targetElement;
    this.threadId = options.threadId || 'main';

    this.onUserChange = options.onUserChange || null;
    this.demoBannerTheme =
      options.demoBannerTheme ||
      (Math.random() < 0.5 ? 'blueprint' : 'sticky-note');
    this.launchSwagImages = options.launchSwagImages || this.launchSwagImages;

    if (options.apiMode === 'live') {
      this.apiMode = 'live';
      this.serverAPI = new ServerAPI();
    } else {
      this.apiMode = options.apiMode || 'mock';
      this.serverAPI =
        this.apiMode === 'live' ? new ServerAPI() : new MockServerAPI();
    }

    this.container.classList.add('comments-active');

    this.styles.applyAllStyles();

    const defaults = CommentStyles.defaultSettings;
    const viewOptions = { ...defaults, ...options };
    viewOptions.app = this;

    this.appContainer = makeElement('div', {
      className: 'comments-app-container',
    });

    if (options.showTitle !== false) {
      const title = makeElement(
        'h1',
        { className: 'app-title' },
        'Threaded Comments'
      );
      this.appContainer.appendChild(title);
    }

    const toolbarEl = this.toolbar.render();
    this.appContainer.appendChild(toolbarEl);

    this.demoBannerWrapperElement = this.renderDemoBanner();
    this.appContainer.appendChild(this.demoBannerWrapperElement);

    this.topLevelPostBoxContainer = makeElement('div', {
      className: 'top-level-post-container',
    });
    this._showTopLevelPostButton();

    const commentViewContainer = makeElement('div', {
      className: 'comment-view-container',
    });

    this.appContainer.append(
      this.topLevelPostBoxContainer,
      commentViewContainer
    );
    this.container.appendChild(this.appContainer);

    this.commentView = new CommentThreadView(commentViewContainer, viewOptions);
    this.commentView.setApp(this);

    const resolvedMode = await this._resolveInitialApiMode(this.apiMode);
    if (resolvedMode !== this.apiMode) {
      this.apiMode = resolvedMode;
      this.serverAPI =
        resolvedMode === 'live' ? new ServerAPI() : new MockServerAPI();
    }

    this.updateDemoBanner();
    await this.loadInitialData();
  }

  showAuthDialog() {
    const content = makeElement('div', {
      style: 'display:flex; flex-direction:column; gap:12px; min-width: 300px;',
    });

    const infoText = makeElement('div', {
      style: 'font-size: 13px; color: var(--text-secondary); line-height: 1.5;',
    });
    infoText.textContent =
      'Already have an account with email & password? Sign in below. Otherwise, just type a name in the comment box to jump right in.';
    content.appendChild(infoText);

    const emailInput = makeElement('input', {
      type: 'email',
      placeholder: 'Email Address',
      className: 'username-input',
      required: true,
    });
    const passwordInput = makeElement('input', {
      type: 'password',
      placeholder: 'Password',
      className: 'username-input',
      required: true,
    });

    const actionRow = makeElement('div', {
      style:
        'display:flex; gap: 10px; justify-content: flex-end; margin-top: 10px;',
    });
    const loginBtn = makeElement(
      'button',
      { className: 'post-button' },
      'Sign In'
    );

    const errDiv = makeElement('div', {
      style: 'color: #ff6b6b; font-size: 13px; min-height: 18px;',
    });

    actionRow.append(loginBtn);
    content.append(emailInput, passwordInput, errDiv, actionRow);

    const dialog = new DialogBoxExtended({
      title: 'Sign In to Existing Account',
      content: content,
      buttons: [{ label: 'Cancel', isCloseButton: true }],
    });

    loginBtn.onclick = async () => {
      loginBtn.disabled = true;
      errDiv.textContent = '';
      const res = await this.serverAPI.loginUser(
        emailInput.value,
        passwordInput.value
      );
      if (res.success) {
        this.userManager.addUser(res.user);
        this.setCurrentUser(res.user);
        dialog.close();
      } else {
        errDiv.textContent = res.error;
        loginBtn.disabled = false;
      }
    };

    // Allow pressing Enter to submit
    passwordInput.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        loginBtn.click();
      }
    };
  }

  async _resolveInitialApiMode(preferredMode = 'live') {
    if (preferredMode !== 'live') {
      this.hasResolvedInitialApiMode = true;
      return preferredMode;
    }

    try {
      const probeApi = new ServerAPI();
      const data = await probeApi.getThreadData(this.threadId);

      if (data && data.success) {
        const realRootCommentCount = Array.isArray(data.comments)
          ? data.comments.length
          : 0;
        const resolvedMode =
          realRootCommentCount <= this.realCommentThreshold ? 'mock' : 'live';

        console.log(
          `[Comments] Live thread '${this.threadId}' has ${realRootCommentCount} root comments. Defaulting to '${resolvedMode}'.`
        );

        this.hasResolvedInitialApiMode = true;
        return resolvedMode;
      }

      console.warn(
        '[Comments] Could not inspect live thread during init. Falling back to preferred live mode.',
        data && data.error ? data.error : 'Unknown error'
      );
    } catch (error) {
      console.warn(
        '[Comments] Live mode probe failed during init. Falling back to preferred live mode.',
        error
      );
    }

    this.hasResolvedInitialApiMode = true;
    return 'live';
  }

  renderDemoBanner() {
    const kicker = makeElement(
      'div',
      { className: 'demo-mode-banner-kicker' },
      'Launch Mode'
    );

    const message = makeElement('div', {
      className: 'demo-mode-banner-message',
    });

    const toggleTrack = makeElement(
      'span',
      { className: 'demo-mode-toggle-track' },
      makeElement('span', { className: 'demo-mode-toggle-fill' }),
      makeElement(
        'span',
        { className: 'demo-mode-toggle-label demo-mode-toggle-real' },
        'Real'
      ),
      makeElement(
        'span',
        { className: 'demo-mode-toggle-label demo-mode-toggle-surreal' },
        'Surreal'
      )
    );

    const toggle = makeElement(
      'button',
      {
        type: 'button',
        className: 'demo-mode-banner-toggle',
        onclick: async () => {
          const targetMode = this.apiMode === 'mock' ? 'live' : 'mock';
          toggle.disabled = true;
          await this.switchApiMode(targetMode);
          toggle.disabled = false;
        },
      },
      toggleTrack
    );

    const banner = makeElement(
      'div',
      {
        className: 'demo-mode-banner',
      },
      makeElement(
        'div',
        { className: 'demo-mode-banner-content' },
        kicker,
        message
      ),
      makeElement('div', { className: 'demo-mode-banner-side' }, toggle)
    );

    const wrapper = makeElement(
      'div',
      { className: 'demo-mode-banner-wrapper' },
      banner
    );

    this.demoBannerWrapperElement = wrapper;
    this.demoBannerElement = banner;
    this.demoBannerTextElement = message;
    this.demoBannerToggleElement = toggle;

    this._applyDemoBannerTheme();
    this.updateDemoBanner();
    return wrapper;
  }

  updateDemoBanner() {
    if (
      !this.demoBannerElement ||
      !this.demoBannerTextElement ||
      !this.demoBannerToggleElement
    ) {
      return;
    }

    const isDemoMode = this.apiMode === 'mock';

    this.demoBannerElement.classList.toggle('is-demo-mode', isDemoMode);
    this.demoBannerElement.classList.toggle('is-real-mode', !isDemoMode);

    this.demoBannerToggleElement.setAttribute(
      'aria-pressed',
      String(!isDemoMode)
    );
    this.demoBannerToggleElement.classList.toggle('is-real-mode', !isDemoMode);
    this.demoBannerToggleElement.classList.toggle('is-demo-mode', isDemoMode);

    this.demoBannerTextElement.innerHTML = '';

    const paragraph = makeElement('p', {
      className: 'demo-mode-banner-text',
    });

    if (isDemoMode) {
      paragraph.append(
        'This thread is starting in ',
        makeElement('strong', {}, 'surreal demo mode'),
        ' so the page does not feel empty, but please flip over to ',
        makeElement('strong', {}, 'real mode'),
        ' and leave an actual comment. Helpful early commenters may earn ',
        makeElement(
          'a',
          {
            href: '#',
            className: 'demo-mode-inline-link',
            onclick: (e) => {
              e.preventDefault();
              this.showDemoIncentivesPopup();
            },
          },
          'swag'
        ),
        ' — at least the top 100 will get something.'
      );
    } else {
      paragraph.append(
        'You are viewing the ',
        makeElement('strong', {}, 'real live thread'),
        ' now. Please actually comment here. Helpful early commenters may earn ',
        makeElement(
          'a',
          {
            href: '#',
            className: 'demo-mode-inline-link',
            onclick: (e) => {
              e.preventDefault();
              this.showDemoIncentivesPopup();
            },
          },
          'swag'
        ),
        ' — at least the top 100 will get something.'
      );
    }

    this.demoBannerTextElement.appendChild(paragraph);
  }

  setDemoBannerTheme(themeName) {
    this.demoBannerTheme = themeName || 'blueprint';
    this._applyDemoBannerTheme();
  }

  _applyDemoBannerTheme() {
    if (!this.demoBannerElement) return;

    const themeClasses = ['theme-sticky-note', 'theme-blueprint'];

    this.demoBannerElement.classList.remove(...themeClasses);
    this.demoBannerElement.classList.add(
      `theme-${this.demoBannerTheme || 'blueprint'}`
    );
  }

  showDemoIncentivesPopup() {
    if (this.demoBannerPopupOverlay) {
      this.demoBannerPopupOverlay.remove();
      this.demoBannerPopupOverlay = null;
    }

    const closePopup = () => {
      if (this.demoBannerPopupOverlay) {
        this.demoBannerPopupOverlay.remove();
        this.demoBannerPopupOverlay = null;
      }
    };

    const overlay = makeElement('div', {
      className: 'demo-mode-popup-overlay',
      onclick: (e) => {
        if (e.target === overlay) closePopup();
      },
    });

    const content = makeElement(
      'div',
      { className: 'demo-mode-popup-card' },
      makeElement(
        'div',
        { className: 'demo-mode-popup-header' },
        makeElement(
          'div',
          { className: 'demo-mode-popup-title' },
          'Commenter Rewards'
        ),
        makeElement(
          'button',
          {
            type: 'button',
            className: 'demo-mode-popup-close',
            onclick: closePopup,
          },
          '×'
        )
      ),
      makeElement(
        'div',
        { className: 'demo-mode-popup-body' },
        makeElement(
          'p',
          {},
          'This site is just launching, so I want to reward the people who help shape the culture here early.'
        ),
        makeElement(
          'p',
          {},
          'If you leave thoughtful, constructive, funny, useful, community-building comments, you may get a little thank-you.'
        ),
        makeElement(
          'p',
          {},
          'At least the top 100 commenters will get something. Right now I have lots of colorful silicone piano-key labels for GlowTunes-style music stuff, and I will also have some other physical or digital goodies.'
        ),
        makeElement(
          'p',
          {},
          'If you are not into music, or you are outside the U.S., that is fine — there will be alternate rewards.'
        ),
        makeElement(
          'p',
          {},
          'The detailed rules will live on a separate page, but the rough idea is simple: I want to notice commenters who help make this place smart, welcoming, constructive, and alive. That will probably involve some AI-assisted scoring plus human judgment.'
        ),
        makeElement(
          'div',
          { className: 'demo-mode-popup-list-title' },
          'What kind of comments help?'
        ),
        makeElement(
          'ul',
          { className: 'demo-mode-popup-list' },
          makeElement(
            'li',
            {},
            'Thoughtful feedback that improves the project'
          ),
          makeElement(
            'li',
            {},
            'Constructive disagreement without being a jerk'
          ),
          makeElement('li', {}, 'Funny comments that still add something real'),
          makeElement('li', {}, 'Welcoming early-community energy'),
          makeElement(
            'li',
            {},
            'Observations that help catch bugs, rough spots, or confusion'
          )
        ),
        makeElement(
          'div',
          { className: 'demo-mode-popup-image-row' },
          makeElement('img', {
            className: 'demo-mode-popup-image',
            src: this.launchSwagImages[0],
            alt: 'Colorful silicone piano key labels',
          }),
          makeElement('img', {
            className: 'demo-mode-popup-image',
            src: this.launchSwagImages[1],
            alt: 'GlowTunes keyboard demo',
          })
        ),
        makeElement(
          'div',
          { className: 'demo-mode-popup-footer-note' },
          'Early commenters get extra attention. This is temporary launch chaos, so I am playing it up on purpose.'
        )
      )
    );

    overlay.appendChild(content);
    this.demoBannerPopupOverlay = overlay;
    this.appContainer.appendChild(overlay);
  }


  async run(env) {
      this.env = env;
      this.container = env.container;
      await this.init(this.container);
      
      if (typeof TestHarness !== 'undefined') {
        const harness = new TestHarness(this);
        harness.init();
        window.harness = harness;
      }
      window.commentsApp = this;
      return this;
    }
}

