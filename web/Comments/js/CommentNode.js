
class CommentNode {
  constructor(data, view, parent = null) {
    this.id = data.id;
    this.userId = data.userId;
    this.text = data.text;
    this.timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
    this.isTemporary = data.isTemporary || false;
    this.isDeleted = data.isDeleted || false;
    this.isCollapsed = data.isCollapsed || false;

    this.children = (data.children || []).map(
      (childData) => new CommentNode(childData, view, this)
    );

    this.view = view;
    this.parent = parent;
    this.isExpanded = data.isExpanded !== undefined ? data.isExpanded : true;

    this.shortId = this.id.substring(this.id.length - 6).toUpperCase();
    this.indentLeveL = -1;

    this.domElement = null;
    this.contentElement = null;
    this.replyBoxContainer = null;
    this.ratingPanel = null;
    this.debugInfoElement = null;
    this.textPreviewElement = null;

    this.currentX = 0;
    this.currentY = 0;
    this.currentOpacity = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.targetOpacity = 0;
  }

  render() {
    if (this.domElement) return this.domElement;

    if (this.isTemporary) {
      return this.renderTemporaryReplyBox();
    }

    this.domElement = makeElement('div', {
      className: `comment-node`,
      'data-node-id': this.id,
    });

    // Add click handler to expand the comment if it's collapsed.
    this.domElement.onclick = () => {
      if (this.isCollapsed) {
        this.setCollapsed(false);
        this.view.refreshLayout();
      }
    };

    this.domElement.classList.toggle('is-deleted', this.isDeleted);
    this.domElement.classList.toggle('is-collapsed', this.isCollapsed);

    const currentUser = this.view.options.app.currentUser;
    if (currentUser && this.userId === currentUser.id) {
      this.domElement.classList.add('is-own-comment');
    }

    this.toggleElement = makeElement('span', { className: 'node-toggle' });
    if (this.children.length > 0) {
      this.updateToggleIcon();
      this.toggleElement.onclick = (e) => {
        e.stopPropagation(); // Prevents this click from bubbling up to the main element
        this.toggleExpandCollapse();
      };
    }

    const user = this.view.options.app.userManager.getUserById(this.userId);
    const commentBody = makeElement('div', {
      className: 'comment-content-wrapper',
    });

    if (user && user.avatarUrl) {
      const avatar = makeElement('img', {
        className: 'comment-avatar',
        src: user.avatarUrl,
        alt: `${user.displayName}'s avatar`,
      });
      avatar.onclick = () => {
        /* ... (avatar click logic unchanged) ... */
      };
      commentBody.appendChild(avatar);
    }

    const header = makeElement('div', { className: 'comment-header' });
    const headerContent = makeElement('div', {
      className: 'comment-header-content',
    });

    if (user && !this.isDeleted) {
      const nameSpan = makeElement('span', { className: 'user-name' });
      nameSpan.innerHTML = NameRenderer.render(user.displayName);
      headerContent.appendChild(nameSpan);
      if (this.view.options.app.userManager.isDuplicate(user.normalizedName)) {
        nameSpan.appendChild(
          makeElement('span', { className: 'user-name-suffix' }, user.suffix)
        );
      }
    } else if (!this.isDeleted) {
      headerContent.textContent = 'Unknown User';
    }

    headerContent.appendChild(
      makeElement(
        'span',
        { className: 'comment-timestamp' },
        this.formatTimestamp()
      )
    );

    this.textPreviewElement = makeElement('span', {
      className: 'comment-text-preview',
    });
    this.updateTextPreview();
    headerContent.appendChild(this.textPreviewElement);

    this.debugInfoElement = makeElement('span', {
      className: 'comment-debug-info',
    });
    headerContent.appendChild(this.debugInfoElement);

    const textContent = this.isDeleted ? '[message deleted]' : this.text;
    const text = makeElement('div', { className: 'comment-text' }, textContent);
    const actions = makeElement('div', { className: 'comment-actions' });

    if (!this.isDeleted) {
      const replyButton = makeElement(
        'button',
        { onclick: () => this.showReplyBox() },
        'Reply'
      );
      const rateButton = makeElement(
        'button',
        { onclick: (e) => this.toggleRatingPanel(e.currentTarget) },
        'Rate'
      );
      rateButton.closePanelCallback = () => {
        this.ratingPanel = null;
        this.domElement.classList.remove('is-rating');
      };
      actions.append(replyButton, rateButton);
      if (currentUser && this.userId === currentUser.id) {
        const editButton = makeElement(
          'button',
          { className: 'edit-button' },
          'Edit'
        );
        const deleteButton = makeElement(
          'button',
          { className: 'delete-button', onclick: () => this.handleDelete() },
          'Delete'
        );
        actions.append(editButton, deleteButton);
      }
    }

    const connector = makeElement('div', { className: 'header-connector' });
    header.append(headerContent, connector, actions);

    commentBody.append(header, text);
    this.domElement.append(this.toggleElement, commentBody);
    this.updateVisualState();
    return this.domElement;
  }

  showReplyBox() {
    const app = this.view.options.app;
    const tempReplyId = `temp-reply-${this.id}`;

    const controller = {
      isTopLevel: false,
      nodeId: this.id,
      close: () => {
        this.removeChild(tempReplyId);
        this.view.refreshLayout();
      },
    };

    if (
      app.activeReplyController &&
      app.activeReplyController.nodeId === this.id
    ) {
      app.setActiveReplyController(null);
      return;
    }

    app.setActiveReplyController(controller);

    const currentUser = app.currentUser;
    const tempReplyNode = new CommentNode(
      {
        id: tempReplyId,
        userId: currentUser ? currentUser.id : null,
        isTemporary: true,
        timestamp: new Date(),
      },
      this.view,
      this
    );

    tempReplyNode.render();
    this.view.treeElement.appendChild(tempReplyNode.domElement);

    tempReplyNode.currentOpacity = 0;
    tempReplyNode.currentX = this.currentX;
    tempReplyNode.currentY = this.currentY;
    tempReplyNode.updateStyle();

    this.view._registerNodeAndChildren(tempReplyNode);
    this.children.push(tempReplyNode);

    this.updateVisualState();
    this.updateToggleIcon();

    const onLayoutComplete = () => {
      if (tempReplyNode.domElement) {
        tempReplyNode.domElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    };

    if (!this.isExpanded && this.children.length > 0) {
      this.toggleExpandCollapse(onLayoutComplete);
    } else {
      this.view.refreshLayout(onLayoutComplete);
    }
  }

  updateToggleIcon() {
    if (!this.toggleElement) return;

    this.toggleElement.innerHTML = '';
    if (this.children.length === 0) return;

    const pathData = 'M 5 3 L 13 10 L 5 17'; // Made arrow slightly larger

    const shadowPath = makeElement('svg:path', {
      d: pathData,
      stroke: 'var(--bg-secondary)', // Use background color to create a cutout effect
      'stroke-width': 7,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      fill: 'none',
    });

    const foregroundPath = makeElement('svg:path', {
      d: pathData,
      stroke: 'currentColor',
      'stroke-width': 3,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      fill: 'none',
    });

    const svg = makeElement('svg:svg', { viewBox: '0 0 20 20' }, [
      shadowPath,
      foregroundPath,
    ]);
    this.toggleElement.appendChild(svg);
  }

  updateStyle() {
    if (!this.domElement) return;
    this.domElement.style.transform = `translate(${this.currentX}px, ${this.currentY}px)`;
    this.domElement.style.opacity = this.currentOpacity;
    this.domElement.style.pointerEvents =
      this.currentOpacity > 0.1 ? 'auto' : 'none';
    this.domElement.style.width = `calc(100% - ${this.currentX}px)`;
  }

  toggleExpandCollapse(onComplete) {
    if (this.children.length === 0) {
      if (onComplete) onComplete();
      return;
    }
    this.isExpanded = !this.isExpanded;
    this.updateVisualState();
    this.view.handleExpansionChange(this, onComplete);
  }

  updateVisualState() {
    if (!this.domElement) return;
    this.domElement.classList.toggle('is-expanded', this.isExpanded);
    this.domElement.classList.toggle('has-children', this.children.length > 0);
  }

  getConnectionPoint() {
    const connectionY =
      this.currentY + this.view.options.lineConnectionPointYOffset;
    const connectionX =
      this.currentX + this.view.options.lineConnectionPointXOffset;

    if (isNaN(connectionX) || isNaN(connectionY)) {
      return null;
    }
    return { x: connectionX, y: connectionY };
  }

  formatTimestamp() {
    const format = this.view.options.timestampFormat || 'relative';

    if (format === 'iso') {
      return this.timestamp.toISOString();
    }

    const formatTime = (date) => {
      const timeFormat = { hour: 'numeric', minute: '2-digit', hour12: true };
      return date
        .toLocaleTimeString('en-us', timeFormat)
        .toLowerCase()
        .replace(' am', 'a')
        .replace(' pm', 'p');
    };

    if (format === 'full') {
      const fullFormat = { year: 'numeric', month: 'short', day: 'numeric' };
      return `${this.timestamp
        .toLocaleDateString('en-us', fullFormat)
        .toLowerCase()} at ${formatTime(this.timestamp)}`;
    }

    const now = new Date();
    const diffSeconds = (now - this.timestamp) / 1000;
    if (diffSeconds < 60) return 'just now';
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;

    const isToday = now.toDateString() === this.timestamp.toDateString();
    if (isToday) return `today at ${formatTime(this.timestamp)}`;

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      yesterday.toDateString() === this.timestamp.toDateString();
    if (isYesterday) return `yesterday at ${formatTime(this.timestamp)}`;

    const diffDays = diffSeconds / (60 * 60 * 24);
    if (diffDays < 7) {
      const dayFormat = { weekday: 'long' };
      return `${this.timestamp
        .toLocaleDateString('en-us', dayFormat)
        .toLowerCase()} at ${formatTime(this.timestamp)}`;
    }

    const isThisYear = now.getFullYear() === this.timestamp.getFullYear();
    if (isThisYear) {
      const monthDayFormat = { month: 'short', day: 'numeric' };
      return `${this.timestamp
        .toLocaleDateString('en-us', monthDayFormat)
        .toLowerCase()} at ${formatTime(this.timestamp)}`;
    }

    const fullFormat = { year: 'numeric', month: 'short', day: 'numeric' };
    return `${this.timestamp
      .toLocaleDateString('en-us', fullFormat)
      .toLowerCase()} at ${formatTime(this.timestamp)}`;
  }

  toggleRatingPanel(buttonElement) {
    if (this.ratingPanel) {
      this.domElement.classList.remove('is-rating');
      this.ratingPanel.hide();
      this.ratingPanel = null;
    } else {
      this.view.options.app.closeAllPopups();
      this.domElement.classList.add('is-rating');
      this.ratingPanel = new RatingPanel(buttonElement, this);
      this.view.registerPopup(this);
    }
  }

  sortChildren() {
    // --- CORRECTED: Swapped sort logic to match user expectation ---
    if (this.childSortOrder === 'newest') {
      this.children.sort((a, b) => b.timestamp - a.timestamp);
    } else {
      this.children.sort((a, b) => a.timestamp - b.timestamp);
    }
  }

  toggleChildSortOrder() {
    this.childSortOrder =
      this.childSortOrder === 'newest' ? 'oldest' : 'newest';
    if (this.sortButton) {
      // --- CORRECTED: Clearer button text ---
      this.sortButton.textContent = `Sort by: ${
        this.childSortOrder === 'newest' ? 'Newest' : 'Oldest'
      }`;
    }
    this.sortChildren();
    this.view.refreshLayout();
  }

  async handleDelete() {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    // 1. Get references
    const app = this.view.options.app;
    const threadId = app.threadId; // Ensure we have the current thread ID
    const currentUser = app.currentUser;

    if (!currentUser || currentUser.id !== this.userId) {
      alert('You can only delete your own comments.');
      return;
    }

    // 2. Optimistic UI update (optional, but let's wait for server for safety)
    // or just call server:

    try {
      const result = await app.serverAPI.deleteComment(
        this.id,
        currentUser.id,
        threadId
      );

      if (result.success) {
        // 3. Logic: If we have children, redact. If not, remove.
        if (this.children.length > 0) {
          this.isDeleted = true;
          this.text = '[message deleted]';

          const oldElement = this.domElement;
          this.domElement = null; // Force re-render
          const newElement = this.render();
          if (oldElement && oldElement.parentNode) {
            oldElement.parentNode.replaceChild(newElement, oldElement);
          }
          this.view.refreshLayout();
        } else {
          if (this.parent) {
            this.parent.removeChild(this.id);
          } else {
            this.view.removeRootNode(this.id);
          }
          this.view.refreshLayout();
        }
      } else {
        alert(`Delete failed: ${result.error}`);
      }
    } catch (e) {
      console.error('Delete error:', e);
      alert('An error occurred while deleting.');
    }
  }

  isDeleted = false;

  renderTemporaryReplyBox() {
    this.domElement = makeElement('div', {
      className: 'comment-node is-temporary-reply',
      'data-node-id': this.id,
    });
    this.toggleElement = makeElement('span', { className: 'node-toggle' });

    const app = this.view.options.app;

    const onCancel = () => {
      app.setActiveReplyController(null);
      this.parent.removeChild(this.id);
      this.view.refreshLayout();
    };

    const onPost = () => {
      app.setActiveReplyController(null);
      this.parent.removeChild(this.id);
    };

    const postBox = app.createPostBox(this.parent.id, onPost, onCancel);
    postBox.classList.add('reply-box');

    const contentWrapper = makeElement('div', {
      className: 'comment-content-wrapper',
    });
    contentWrapper.appendChild(postBox);

    this.domElement.append(this.toggleElement, contentWrapper);

    setTimeout(() => {
      // FIX: Prioritize username input
      const focusEl =
        postBox.querySelector('.username-input') ||
        postBox.querySelector('.comment-input');
      if (focusEl) focusEl.focus();
    }, 50);

    return this.domElement;
  }

  removeChild(childId) {
    const childIndex = this.children.findIndex((c) => c.id === childId);
    if (childIndex > -1) {
      const [removedNode] = this.children.splice(childIndex, 1);
      this.view._unregisterNode(removedNode);
    }
    this.updateVisualState();
    this.updateToggleIcon();
  }

  isTemporary = false;

  setCollapsed(isCollapsed) {
    if (this.isCollapsed === isCollapsed || !this.domElement) return;
    this.isCollapsed = isCollapsed;
    this.domElement.classList.toggle('is-collapsed', this.isCollapsed);
  }

  updateTextPreview() {
    if (!this.textPreviewElement) return;
    if (this.isDeleted) {
      this.textPreviewElement.textContent = '';
      return;
    }
    const previewText = this.text.replace(/\n/g, ' ').trim();
    this.textPreviewElement.textContent = ` - ${previewText}`;
  }

}

