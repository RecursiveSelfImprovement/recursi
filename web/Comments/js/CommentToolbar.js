
class CommentToolbar {
  constructor(app) {
    this.app = app;
    this.element = null;
    this.userContainer = null;
    this.sliderTrack = null;
  }

  render() {
    this.element = makeElement('div', { className: 'comment-toolbar' });

    // --- Left Section: Controls ---
    const controlsSection = makeElement('div', {
      className: 'toolbar-section controls',
    });

    // 1. Sort Toggle
    const sortBtn = makeElement('button', {
      className: 'toolbar-btn sort-btn',
      title: 'Toggle Sort Order (Newest/Oldest)',
    });
    sortBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M6 12h12M10 18h4" />
        </svg>
        <span class="sort-label">Newest</span>
    `;
    sortBtn.onclick = () => {
      this.app.toggleGlobalSortOrder({ currentTarget: sortBtn }); // Reuse existing logic, mockup event
      const label = sortBtn.querySelector('.sort-label');
      label.textContent =
        this.app.globalSortOrder === 'newest' ? 'Newest' : 'Oldest';
    };
    controlsSection.appendChild(sortBtn);

    // 2. Recency Slider
    const sliderContainer = makeElement('div', {
      className: 'toolbar-slider-group',
      title: 'Adjust Recency (Collapse older comments)',
    });

    // Icon
    sliderContainer.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
    `;

    const sliderInput = makeElement('input', {
      type: 'range',
      min: '0',
      max: '100',
      value: '100',
      className: 'compact-slider',
    });

    sliderInput.oninput = (e) => {
      const val = parseInt(e.target.value);
      this.app.commentView.collapseByRecency(val);
    };

    sliderContainer.appendChild(sliderInput);
    controlsSection.appendChild(sliderContainer);

    // --- Right Section: User ---
    this.userContainer = makeElement('div', {
      className: 'toolbar-section user-section',
      onclick: () => this.app.userAccountDialog.show(),
    });
    this._renderUserContent();

    this.element.append(controlsSection, this.userContainer);
    return this.element;
  }

  updateUser() {
    this._renderUserContent();
  }

  _renderUserContent() {
    if (!this.userContainer) return;
    this.userContainer.innerHTML = '';

    const user = this.app.currentUser;
    this.userContainer.style.display = 'flex';

    if (user) {
      this.userContainer.title = 'Manage Account';
      this.userContainer.onclick = () => this.app.userAccountDialog.show();

      if (user.avatarUrl) {
        const avatar = makeElement('img', {
          src: user.avatarUrl,
          className: 'toolbar-avatar',
        });
        this.userContainer.appendChild(avatar);
      } else {
        const accountText = makeElement(
          'span',
          { className: 'toolbar-username' },
          user.displayName
        );
        this.userContainer.appendChild(accountText);
      }
    } else {
      this.userContainer.title = 'Log in to an existing account';
      this.userContainer.onclick = () => this.app.showAuthDialog();

      const loginText = makeElement(
        'span',
        { className: 'toolbar-login-text' },
        'Sign In'
      );
      this.userContainer.appendChild(loginText);
    }
  }

}

