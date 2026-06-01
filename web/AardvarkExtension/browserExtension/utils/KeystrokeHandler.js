class KeystrokeHandler {
  static handlers = {};
  static showCommand = true;
  static listenerAttached = false;
  static popupElement = null;
  static hideTimeout = null;
  static handleKeyDown = null;

  static setStyles() {
    applyCss(
      `
      .keystroke-popup {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0);
        background-color: rgba(0, 0, 0, 0.85);
        color: #fff;
        padding: 15px 30px;
        border-radius: 8px;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 24px;
        opacity: 0;
        transition: transform 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28), opacity 0.2s;
        z-index: 2147483647;
        pointer-events: none;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
        text-transform: lowercase;
        white-space: pre;
        text-align: center;
        display: block; 
      }
      .keystroke-popup.show {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
      }
      .keystroke-popup .keystroke {
        font-size: 36px;
        font-weight: 700;
        color: #ffd700;
        margin: 0; 
        vertical-align: -2px; 
        line-height: 1;
        display: inline-block;
      }
      .keystroke-popup .special-key {
        font-style: italic;
        color: #bbb;
        font-size: 0.75em;
        margin-right: 8px;
        vertical-align: middle;
      }
    `,
      'keystrokeHandlerStyles'
    );
  }

  static showPopup(content) {
    if (!this.popupElement) {
      this.popupElement = makeElement('div', {
        className: 'keystroke-popup',
      });
      document.body.appendChild(this.popupElement);
    }

    while (this.popupElement.firstChild) {
      this.popupElement.firstChild.remove();
    }

    if (typeof content === 'string') {
      this.popupElement.textContent = content;
    } else if (content instanceof Node) {
      this.popupElement.appendChild(content);
    } else if (Array.isArray(content)) {
      content.forEach((node) => {
        if (typeof node === 'string')
          this.popupElement.appendChild(document.createTextNode(node));
        else if (node instanceof Node) this.popupElement.appendChild(node);
      });
    }

    requestAnimationFrame(() => {
      this.popupElement.classList.add('show');
    });

    if (this.hideTimeout) clearTimeout(this.hideTimeout);
    this.hideTimeout = setTimeout(
      () => this.popupElement.classList.remove('show'),
      1200
    );
  }

  static addHandler(command, callback) {
    let commandName,
      keystroke,
      suppressPopup = false;

    if (typeof command === 'string') {
      commandName = command;
      keystroke = command[0].toLowerCase();
      let ampersandIndex = command.indexOf('&');
      if (ampersandIndex !== -1 && ampersandIndex < command.length - 1) {
        keystroke = command[ampersandIndex + 1].toLowerCase();
      }
    } else if (typeof command === 'object') {
      commandName = command.name;
      keystroke = command.key.toLowerCase();
      suppressPopup = command.suppressPopup || false;
    }

    this.handlers[keystroke] = {
      commandName,
      callback,
      suppressPopup,
    };

    if (!this.listenerAttached) {
      this.setStyles();

      this.handleKeyDown = (event) => {
        // Ignore inputs
        const tag = event.target.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          event.target.isContentEditable
        )
          return;

        let key = event.key.toLowerCase();

        // Normalize special keys
        if (
          [
            'enter',
            ' ',
            'escape',
            'arrowup',
            'arrowdown',
            'arrowleft',
            'arrowright',
          ].includes(key)
        ) {
          key = event.key.toLowerCase();
        }

        if (this.handlers[key]) {
          // Block page
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          let { commandName, callback, suppressPopup } = this.handlers[key];

          callback(event);

          if (this.showCommand && !suppressPopup) {
            const notificationContent = document.createDocumentFragment();
            const specialKeys = [
              'enter',
              ' ',
              'escape',
              'arrowup',
              'arrowdown',
              'arrowleft',
              'arrowright',
            ];

            if (specialKeys.includes(key)) {
              notificationContent.appendChild(
                makeElement(
                  'span',
                  { className: 'special-key' },
                  `(${event.key}) `
                )
              );
              notificationContent.appendChild(
                document.createTextNode(commandName || event.key)
              );
            } else {
              const cleanName = commandName.replace('&', '');
              const lowerName = cleanName.toLowerCase();
              const idx = lowerName.indexOf(key);

              if (idx !== -1) {
                const pre = cleanName.substring(0, idx);
                const match = cleanName.substring(idx, idx + key.length);
                const post = cleanName.substring(idx + key.length);

                if (pre)
                  notificationContent.appendChild(document.createTextNode(pre));
                notificationContent.appendChild(
                  makeElement('span', { className: 'keystroke' }, match)
                );
                if (post)
                  notificationContent.appendChild(
                    document.createTextNode(post)
                  );
              } else {
                notificationContent.appendChild(
                  document.createTextNode(cleanName)
                );
              }
            }

            this.showPopup(notificationContent);
          }
        }
      };

      // Use capture phase to intercept before page
      document.addEventListener('keydown', this.handleKeyDown, true);
      this.listenerAttached = true;
    }
  }

  static removeHandler(commandName) {
    for (let keystroke in this.handlers) {
      if (this.handlers[keystroke].commandName === commandName) {
        delete this.handlers[keystroke];
        break;
      }
    }
  }

  static toggleShowCommand() {
    this.showCommand = !this.showCommand;
  }

  static activate() {
    if (!this.listenerAttached && this.handleKeyDown) {
      document.addEventListener('keydown', this.handleKeyDown, true);
      this.listenerAttached = true;
    }
  }

  static deactivate() {
    if (this.listenerAttached && this.handleKeyDown) {
      document.removeEventListener('keydown', this.handleKeyDown, true);
      this.listenerAttached = false;
      // Note: we don't nullify handleKeyDown so we can re-activate later
      // we also don't clear handlers so 'wake up' works
      if (this.popupElement) {
        this.popupElement.remove();
        this.popupElement = null;
      }
    }
  }

}
