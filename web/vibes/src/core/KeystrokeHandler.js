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
        /* Replaced flex/gap with block display to fix spacing issues */
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
        /* Fix vertical alignment */
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

    // Safe Clear
    while (this.popupElement.firstChild) {
      this.popupElement.firstChild.remove();
    }

    // Append Content (String or Node)
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

    // Force reflow for animation if needed, but adding class usually sufficient
    requestAnimationFrame(() => {
      this.popupElement.classList.add('show');
    });

    if (this.hideTimeout) clearTimeout(this.hideTimeout);
    this.hideTimeout = setTimeout(
      () => this.popupElement.classList.remove('show'),
      3000
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
          event.preventDefault();
          let { commandName, callback, suppressPopup } = this.handlers[key];

          callback(event);

          if (this.showCommand && !suppressPopup) {
            // Build DOM for notification
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
              // Special Key format: (Key) CommandName
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
              // Normal Key format: Highlight the key char within the command name
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

  static deactivate() {
    if (this.listenerAttached && this.handleKeyDown) {
      document.removeEventListener('keydown', this.handleKeyDown, true);
      this.listenerAttached = false;
      this.handleKeyDown = null;
      this.handlers = {};
      if (this.popupElement) {
        this.popupElement.remove();
        this.popupElement = null;
      }
    }
  }

    

  static _doc() {
    return [
      this._doc_overview(),
      this._doc_usage(),
      this._doc_styles()
    ].join('\n\n');
  }

  static _doc_overview() {
    return [
      "### KeystrokeHandler",
      "",
      "A global utility for registering and managing keyboard shortcuts across the application.",
      "It intercepts keydown events, matches them against registered commands, and executes the corresponding callback.",
      "Additionally, it displays a temporary, non-intrusive popup showing the invoked command name."
    ].join('\n');
  }

  static _doc_usage() {
    return [
      "### Usage",
      "",
      "```javascript",
      "// Add a handler with a string command name (first letter is used as key)",
      "KeystrokeHandler.addHandler('Save', (e) => { ... });",
      "",
      "// Or with an options object for more control",
      "KeystrokeHandler.addHandler({",
      "  name: 'Play',",
      "  key: 'p',",
      "  suppressPopup: true",
      "}, (e) => { ... });",
      "```"
    ].join('\n');
  }

  static _doc_styles() {
    return [
      "### Styling & UI",
      "",
      "The handler automatically injects its own CSS to display a sleek, centered overlay whenever a command is triggered.",
      "The popup is transient and fades out automatically after 3 seconds."
    ].join('\n');
  }

}

