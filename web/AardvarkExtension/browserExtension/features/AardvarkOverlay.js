class AardvarkOverlay {
  constructor(aardvark) {
    this.main = aardvark; // Reference to the main Aardvark controller
    this.hoverElement = null;
    this.infoElement = null;
    this.statusPanel = null;
    this._aardvarkToastEl = null;
    this._aardvarkToastTimer = null;
  }

  setStyles() {
    applyCss(
      `
      .aardvark_highlight {
        position: absolute;
        background-color: rgba(255, 255, 224, 0.12);
        border: 2px solid red;
        color: black;
        pointer-events: none;
        transition: all 0.1s;
        z-index: 2000000000;
      }
      .aardvark_infoElement {
        position: absolute;
        background-color: rgba(255, 255, 224, 0.8);
        border: 1px solid black;
        padding: 3px 5px;
        font-size: 12px;
        font-weight: bold;
        font-family: Arial, sans-serif;
        z-index: 2000000000;
        pointer-events: none;
        transition: top 0.1s, left 0.1s;
        color: black;
      }
      .aardvark_infoElement.below {
        border-top: none;
        border-top-left-radius: 0;
        border-top-right-radius: 0;
        border-bottom-left-radius: 5px;
        border-bottom-right-radius: 5px;
      }
      .aardvark_infoElement.above {
        border-radius: 5px;
      }
      .aardvark_status {
        position: fixed;
        /* Lowered position so image has room above */
        top: 100px;
        right: 40px;
        background-color: rgba(0, 0, 0, 0.85);
        color: #fff;
        padding: 10px 25px;
        border-radius: 8px;
        font-family: 'Segoe UI', Arial, sans-serif;
        z-index: 2000000010;
        cursor: pointer;
        box-shadow: 0 5px 15px rgba(0,0,0,0.5);
        border: 1px solid rgba(255,255,255,0.15);
        transition: transform 0.2s, background-color 0.2s, opacity 1s;
        overflow: visible !important;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
      .aardvark_status:hover {
        transform: scale(1.02);
        background-color: rgba(20, 20, 20, 0.95);
      }
      .aardvark_status_img {
        position: absolute;
        width: 125px; /* 50% scale */
        height: auto;
        top: -88px;
        right: -10px; /* Slight offset to look casual */
        z-index: -1;
        pointer-events: none;
        filter: drop-shadow(0px -2px 3px rgba(0,0,0,0.3));
      }
      .aardvark_status_content {
        position: relative;
        z-index: 2;
      }
      /* Help Styles */
      .help-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px;
        background: #1e1e1e;
        color: #ddd;
      }
      .help-row {
        display: flex;
        align-items: center;
        border-bottom: 1px solid #333;
        padding-bottom: 4px;
      }
      .help-row:last-child {
        border-bottom: none;
      }
      .help-key {
        font-weight: bold;
        color: #4fc1ff;
        background: #2d2d2d;
        padding: 2px 8px;
        border-radius: 4px;
        min-width: 60px;
        text-align: center;
        margin-right: 15px;
        font-family: monospace;
        font-size: 1.1em;
      }
      .help-desc {
        font-size: 0.95em;
      }

      /* Make sure the browser menu never wins inside excluded UI */
      [data-style-exclude]{
        -webkit-user-select: none;
        user-select: none;
      }
    `,
      'aardvarkStyles'
    );
  }

  displayElementInfo(element) {
    if (!this.infoElement) {
      this.infoElement = makeElement('div', {
        className: 'aardvark_infoElement',
        'data-style-exclude': '',
      });
      document.body.appendChild(this.infoElement);
    }
    let content = '';
    if (element.id) {
      content +=
        '#' +
        element.id.substring(0, 20) +
        (element.id.length > 20 ? '...' : '') +
        ' ';
    }
    if (element.className && typeof element.className === 'string') {
      content +=
        '.' +
        element.className.split(' ')[0].substring(0, 20) +
        (element.className.length > 20 ? '...' : '');
    }
    content = element.tagName.toLowerCase() + ' ' + content;
    this.infoElement.textContent = content;
    this.positionInfoElement(element);
  }

  positionInfoElement(element) {
    if (!this.infoElement) return;

    let rect = element.getBoundingClientRect();
    let tabHeight = this.infoElement.offsetHeight;
    let pageHeight = window.innerHeight;
    let pageYOffset = window.pageYOffset;

    let topPosition = rect.bottom + pageYOffset;
    let leftPosition = rect.left + window.pageXOffset;

    let isBelow = true;

    // 1. Determine Vertical Position
    if (topPosition + tabHeight > pageHeight + pageYOffset - 5) {
      topPosition = rect.top + pageYOffset - tabHeight;
      isBelow = false;
    }

    // 2. Adjust Left Position for Rounded Corners
    // The yellow tab hits the Left edge. If that corner is rounded,
    // we must nudge the tab right so it connects to the box.
    try {
      const style = window.getComputedStyle(element);
      let radiusStr = isBelow
        ? style.borderBottomLeftRadius
        : style.borderTopLeftRadius;
      let radius = parseInt(radiusStr) || 0;

      // Don't push it halfway across the screen if it's a pill shape (50%)
      // Cap the offset at a reasonable visual connection point (e.g., 25px)
      if (radius > 25) radius = 25;

      // Apply offset
      leftPosition += radius;
    } catch (e) {}

    Object.assign(this.infoElement.style, {
      top: topPosition + 'px',
      left: leftPosition + 'px',
    });

    this.infoElement.classList.toggle('below', isBelow);
    this.infoElement.classList.toggle('above', !isBelow);
  }

  highlightElement(element) {
    if (!element) return;

    var rect = element.getBoundingClientRect();
    if (!this.hoverElement) {
      this.hoverElement = makeElement('div', {
        className: 'aardvark_highlight',
        'data-style-exclude': '',
      });
      document.body.appendChild(this.hoverElement);
    }

    // Copy rounded corners
    // We use getComputedStyle. It is relatively cheap for single element access.
    try {
      const style = window.getComputedStyle(element);
      this.hoverElement.style.borderRadius = style.borderRadius;
    } catch (e) {
      this.hoverElement.style.borderRadius = '0';
    }

    Object.assign(this.hoverElement.style, {
      top: rect.top + window.pageYOffset + 'px',
      left: rect.left + window.pageXOffset + 'px',
      width: rect.width + 'px',
      height: rect.height + 'px',
    });
  }

  clearOverlays() {
    if (this.hoverElement) {
      this.hoverElement.remove();
      this.hoverElement = null;
    }
    if (this.infoElement) {
      this.infoElement.remove();
      this.infoElement = null;
    }
  }

  unselectCurrentElement() {
    this.clearOverlays();
    if (this.main) {
      this.main.currentElement = null;
    }
  }

  createStatusPanel() {
    if (this.statusPanel) return;

    // 1. Calculate Cache-Bust URL (Changes every 3 days)
    const bust = Math.floor(Date.now() / 1000 / (3 * 24 * 60 * 60));
    const src = 'https://karmatics.com/aardvark/vark.png?v=' + bust;

    // 2. Pre-load to check dimensions ("The Handshake")
    const img = new Image();
    img.style.position = 'absolute';
    img.style.left = '-9999px';
    img.style.visibility = 'hidden';

    img.onload = () => {
      // Clean up test image from memory/DOM if attached
      img.remove();

      // Logic Gate
      if (img.width === 249 && img.height === 184) {
        this._renderStandardPanel(src);
      } else {
        this._renderAnnouncement(img, src);
      }
    };

    img.onerror = () => {
      console.warn('Aardvark: Could not contact HQ (Image load failed).');
      // Per instruction: Do not display box if image fails.
    };

    img.src = src;
    // Note: We don't append img to body, loading in memory is sufficient for dimensions
    // in most modern browsers, but some require it to be in DOM to get dimensions reliably?
    // Actually, standard Image() works in memory.
  }

  removeStatusPanel() {
    if (this.statusPanel) {
      this.statusPanel.remove();
      this.statusPanel = null;
    }
  }

  showHelp() {
    if (this.helpBox) {
      this.helpBox.setZOnTop();
      return;
    }

    const container = makeElement('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: '6px 12px',
        fontSize: '13px',
        fontFamily: 'Segoe UI, sans-serif',
        color: '#e0e0e0',
        padding: '10px',
      },
    });

    // Populate commands
    this.main.commands.forEach((cmd) => {
      if (cmd.hidden) return;

      let keyLabel = '';
      if (typeof cmd.command === 'object') {
        keyLabel = cmd.command.key || '';
      } else {
        // Legacy string commands
        keyLabel = cmd.command.charAt(0);
      }

      // Capitalize for display
      keyLabel = keyLabel.toUpperCase();

      const keyEl = makeElement(
        'div',
        {
          style: {
            textAlign: 'right',
            fontWeight: 'bold',
            color: '#00bfa5',
            fontFamily: 'monospace',
            background: 'rgba(255,255,255,0.05)',
            padding: '2px 6px',
            borderRadius: '4px',
            minWidth: '20px',
            display: 'inline-block',
          },
        },
        keyLabel
      );

      const descEl = makeElement('div', {
        style: { display: 'flex', alignItems: 'center' },
        innerHTML: cmd.description.replace('&', ''),
      });

      container.appendChild(keyEl);
      container.appendChild(descEl);
    });

    this.helpBox = new DialogBox({
      title: 'Aardvark Commands',
      content: container,
      width: '320px',
      // Important: Ensure onClose cleans up the reference
      onClose: () => {
        this.helpBox = null;
      },
    });

    // Ensure the help box itself isn't selectable by Aardvark
    this.setDataStyleExclude(this.helpBox.element);
  }

  setDataStyleExclude(element) {
    if (element) {
      element.setAttribute('data-style-exclude', '');
    }
  }

  showToast(msg, ms = 2200) {
    try {
      if (!this._aardvarkToastEl || !this._aardvarkToastEl.isConnected) {
        const el = document.createElement('div');
        el.setAttribute('data-style-exclude', '');
        Object.assign(el.style, {
          position: 'fixed',
          right: '18px',
          bottom: '18px',
          zIndex: 2147483647,
          padding: '10px 12px',
          borderRadius: '10px',
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          fontSize: '12px',
          lineHeight: '1.25',
          color: 'rgba(255,255,255,0.95)',
          background: 'rgba(0,0,0,0.78)',
          border: '1px solid rgba(255,255,255,0.18)',
          boxShadow: '0 10px 26px rgba(0,0,0,0.45)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          maxWidth: '46vw',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          opacity: '0',
          transform: 'translateY(6px)',
          transition: 'opacity 160ms ease, transform 160ms ease',
          pointerEvents: 'none',
        });
        document.body.appendChild(el);
        this._aardvarkToastEl = el;
      }

      const el = this._aardvarkToastEl;
      el.textContent = String(msg || '');

      requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });

      if (this._aardvarkToastTimer) clearTimeout(this._aardvarkToastTimer);
      this._aardvarkToastTimer = setTimeout(() => {
        try {
          el.style.opacity = '0';
          el.style.transform = 'translateY(6px)';
        } catch (e) {}
      }, ms);
    } catch (e) {}
  }

  calculateSmartPosition(rect, dialogWidth, dialogHeight, padding = 20) {
    // Returns [left, top]
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaces = [
      {
        name: 'top',
        area: rect.top * vw,
        fits: rect.top >= dialogHeight + padding,
        x: rect.left + rect.width / 2 - dialogWidth / 2,
        y: rect.top - dialogHeight - padding,
      },
      {
        name: 'bottom',
        area: (vh - rect.bottom) * vw,
        fits: vh - rect.bottom >= dialogHeight + padding,
        x: rect.left + rect.width / 2 - dialogWidth / 2,
        y: rect.bottom + padding,
      },
      {
        name: 'left',
        area: rect.left * vh,
        fits: rect.left >= dialogWidth + padding,
        x: rect.left - dialogWidth - padding,
        y: rect.top + rect.height / 2 - dialogHeight / 2,
      },
      {
        name: 'right',
        area: (vw - rect.right) * vh,
        fits: vw - rect.right >= dialogWidth + padding,
        x: rect.right + padding,
        y: rect.top + rect.height / 2 - dialogHeight / 2,
      },
    ];

    // Sort by: Fits first, then Area descending
    spaces.sort((a, b) => {
      if (a.fits && !b.fits) return -1;
      if (!a.fits && b.fits) return 1;
      return b.area - a.area;
    });

    return [spaces[0].x, spaces[0].y];
  }

  showDormantIcon(onWake, onFullQuit) {
    this.removeDormantIcon();

    const iconSize = 32;

    const container = makeElement('div', {
      className: 'aardvark-dormant-icon',
      'data-style-exclude': '',
      title: 'Click to wake Aardvark',
      style: {
        position: 'fixed',
        top: '10px',
        right: '10px',
        width: `${iconSize}px`,
        height: `${iconSize}px`,
        zIndex: 2000000010,
        cursor: 'pointer',
        opacity: '0.4',
        transition: 'opacity 0.2s, transform 0.2s',
        background:
          'url(https://karmatics.com/aardvark/img/aardvarksmall.png) no-repeat center center',
        backgroundSize: 'contain',
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
      },
      onmouseover: function () {
        this.style.opacity = '1';
        this.style.transform = 'scale(1.1)';
      },
      onmouseout: function () {
        this.style.opacity = '0.4';
        this.style.transform = 'scale(1)';
      },
      onclick: (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (onWake) onWake();
      },
    });

    // The "X" Close Button (appears on hover)
    const closeBtn = makeElement(
      'div',
      {
        style: {
          position: 'absolute',
          top: '-6px',
          right: '-6px',
          width: '16px',
          height: '16px',
          background: '#d32f2f',
          color: 'white',
          borderRadius: '50%',
          fontSize: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
          opacity: '0',
          transition: 'opacity 0.2s',
        },
        onclick: (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (onFullQuit) onFullQuit();
        },
      },
      '✕'
    );

    container.addEventListener('mouseenter', () => {
      closeBtn.style.opacity = '1';
    });
    container.addEventListener('mouseleave', () => {
      closeBtn.style.opacity = '0';
    });

    container.appendChild(closeBtn);
    document.body.appendChild(container);
    this._dormantIcon = container;
  }

  removeDormantIcon() {
    if (this._dormantIcon) {
      this._dormantIcon.remove();
      this._dormantIcon = null;
    }
  }

  _renderStandardPanel(src) {
    const aardvarkImg = makeElement('img', {
      src: src,
      className: 'aardvark_status_img',
      alt: 'Aardvark',
    });

    const msg = makeElement(
      'div',
      { className: 'aardvark_status_content' },
      makeElement(
        'div',
        {
          style: {
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#fff',
            marginBottom: '2px',
          },
        },
        'Aardvark'
      ),
      // UPDATED TEXT per request
      makeElement(
        'div',
        { style: { fontSize: '13px', color: '#ffd700', fontStyle: 'italic' } },
        'Right-click for menu'
      )
    );

    this.statusPanel = makeElement(
      'div',
      {
        className: 'aardvark_status',
        'data-style-exclude': '',
        onclick: () => this.showHelp(),
      },
      aardvarkImg,
      msg
    );

    document.body.appendChild(this.statusPanel);

    setTimeout(() => {
      if (this.statusPanel) {
        this.statusPanel.style.opacity = '0';
        setTimeout(() => {
          if (this.statusPanel) {
            this.statusPanel.remove();
            this.statusPanel = null;
          }
        }, 1000);
      }
    }, 10000);
  }

  _renderAnnouncement(originalImg, src) {
    // Protocol: Map Width to Action
    // This allows the server to change the message/link just by resizing the image
    const width = originalImg.width;
    let config = {
      title: 'Message from Aardvark',
      text: 'We have an update for you.',
      btnLabel: 'Learn More',
      url: 'https://karmatics.com/aardvark',
    };

    // Proof of Concept Table
    switch (width) {
      case 300: // Update
        config.title = 'Update Available';
        config.text =
          'A new version of the Aardvark bookmarklet is available. Please update to get the latest features.';
        config.btnLabel = 'Get Update';
        config.url = 'https://karmatics.com/aardvark';
        break;
      case 301: // Product Launch
        config.title = 'New Product: Fontzy';
        config.text =
          'We are launching Fontzy, the ultimate typography tool. Try the beta today!';
        config.btnLabel = 'Try Fontzy';
        config.url = 'https://karmatics.com/fontzy'; // Placeholder
        break;
      case 302: // Survey
        config.title = 'We need your feedback';
        config.text =
          'How are you using Aardvark? Take our 1-minute survey to help us decide what to build next.';
        config.btnLabel = 'Take Survey';
        config.url = 'https://karmatics.com/survey';
        break;
      case 303: // Alert
        config.title = 'Important Notice';
        config.text =
          'We are changing our hosting provider. Please ensure you have the latest bookmarklet code.';
        config.btnLabel = 'Read Notice';
        config.url = 'https://karmatics.com/blog/update';
        break;
      case 304: // Soft Message (No Link)
        config.title = 'Did you know?';
        config.text =
          "You can press 'M' to capture elements for LLM analysis. Give it a try!";
        config.btnLabel = 'Close';
        config.url = null;
        break;
      default:
        // If dimension is weird (not standard 249, but not in our table),
        // we default to a generic "Visit Site" message.
        config.text = 'Check out the latest news at Karmatics.';
        break;
    }

    // Build Dialog Content
    const container = makeElement('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '15px',
        padding: '10px',
      },
    });

    // Display the image larger (1.5x roughly, or max width)
    // The image itself conveys the message visually.
    const displayImg = makeElement('img', {
      src: src,
      style: {
        maxWidth: '100%',
        height: 'auto',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        // If it's the standard aspect ratio but bigger, it looks fine.
        // If you upload a banner, this handles it gracefully.
      },
    });

    const textBlock = makeElement(
      'div',
      {
        style: {
          fontSize: '15px',
          lineHeight: '1.4',
          textAlign: 'center',
          color: '#ddd',
        },
      },
      config.text
    );

    container.appendChild(displayImg);
    container.appendChild(textBlock);

    // Button Logic
    const buttons = [];
    if (config.url) {
      buttons.push({
        label: config.btnLabel,
        className: 'primary',
        onClick: () => {
          window.open(config.url, '_blank');
          return true; // Close dialog
        },
      });
    }
    buttons.push({ label: 'Dismiss' });

    // Show Dialog
    new DialogBox({
      title: config.title,
      size: [450, 'auto'], // Dynamic height
      contentElement: container,
      buttons: buttons,
    });
  }

}