class LooperKeystrokeHandler {
  static handlers = {};
  static showCommand = true;
  static listenerAttached = false;
  static popupElement = null;
  static keyDisplayNames = {
    ' ': 'space',
    enter: 'enter',
    escape: 'esc',
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
  };
  static currentMode = null;
  static modes = {};
  static isPaused = false;
  static eventListener = null;

  static _addSingleHandler(
    keystroke,
    commandName,
    callback,
    suppressPopup,
    mode = null
  ) {
    const handler = { commandName, callback, suppressPopup };
    if (mode) {
      if (!this.modes[mode]) this.modes[mode] = {};
      this.modes[mode][keystroke] = handler;
    } else {
      this.handlers[keystroke] = handler;
    }
  }

  static addHandler(command, callback) {
    const mode = typeof command === 'object' ? command.mode : null;

    if (typeof command === 'string') {
      let commandName = command;
      let keystroke = command[0].toLowerCase();
      let ampersandIndex = command.indexOf('&');
      if (ampersandIndex !== -1 && ampersandIndex < command.length - 1) {
        keystroke = command[ampersandIndex + 1].toLowerCase();
      }
      this._addSingleHandler(keystroke, commandName, callback, false, mode);
    } else if (typeof command === 'object') {
      let commandName = command.name;
      let keySpec = command.key.toLowerCase();
      let suppressPopup = command.suppressPopup || false;
      if (keySpec.includes('-')) {
        const [start, end] = keySpec.split('-');
        if (start.length === 1 && end.length === 1) {
          const startCode = start.charCodeAt(0);
          const endCode = end.charCodeAt(0);
          if (
            (start >= '0' &&
              start <= '9' &&
              end >= '0' &&
              end <= '9' &&
              startCode <= endCode) ||
            (start >= 'a' &&
              start <= 'z' &&
              end >= 'a' &&
              end <= 'z' &&
              startCode <= endCode)
          ) {
            for (let code = startCode; code <= endCode; code++) {
              const key = String.fromCharCode(code);
              this._addSingleHandler(
                key,
                commandName,
                callback,
                suppressPopup,
                mode
              );
            }
          }
        }
      } else {
        this._addSingleHandler(
          keySpec,
          commandName,
          callback,
          suppressPopup,
          mode
        );
      }
    }

    if (!this.listenerAttached) {
      this.setStyles();
      this.eventListener = (event) => {
        if (this.isPaused) return;

        let key = event.key.toLowerCase();
        let handlerFound = null;

        if (this.currentMode) {
          if (key === 'escape') {
            this.exitMode();
            this.showPopup('Exited Mode');
            setTimeout(
              () =>
                this.popupElement && this.popupElement.classList.remove('show'),
              1000
            );
            event.preventDefault();
            return;
          }
          if (
            this.modes[this.currentMode] &&
            this.modes[this.currentMode][key]
          ) {
            handlerFound = this.modes[this.currentMode][key];
          }
        } else {
          if (this.handlers[key]) {
            handlerFound = this.handlers[key];
          }
        }

        if (handlerFound) {
          event.preventDefault();
          let { commandName, callback, suppressPopup } = handlerFound;
          callback(event);
          if (this.showCommand && !suppressPopup) {
            let displayText = commandName.replace('&', '');
            let highlighted = false;
            if (
              key.length === 1 &&
              /[a-z0-9]/.test(key) &&
              displayText.toLowerCase().includes(key)
            ) {
              displayText = displayText.replace(
                new RegExp(key, 'i'),
                `<span class="keystroke">${key}</span>`
              );
              highlighted = true;
            }
            if (!highlighted) {
              const displayKey = this.keyDisplayNames[key] || key;
              displayText += ` <span class="special-key">(${displayKey})</span>`;
            }
            this.showPopup(displayText);
          }
        }
      };
      document.addEventListener('keydown', this.eventListener, true);
      this.listenerAttached = true;
    }
  }

  static setStyles() {
    applyCss(
      `
      .keystroke-popup {
        position: fixed; top: 20px; left: 20px; transform: none;
        background-color: rgba(0, 0, 0, 0.6); color: #fff; padding: 5px 12px;
        border-radius: 5px; font-family: Arial, sans-serif; font-size: 16px;
        opacity: 0; transition: transform 0.3s, opacity 0.3s; z-index: 2147483647;
        pointer-events: none; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3); text-transform: lowercase;
      }
      .keystroke-popup.show { transform: scale(1); opacity: 1; }
      .keystroke-popup .keystroke { font-size: 22px; font-weight: bold; position: relative; top: 1px; margin: 0 2px 0 0; }
      .keystroke-popup .special-key { font-style: italic; color: #bbb; margin-right: 5px; }
    `,
      'looperKeystrokeHandlerStyles'
    );
  }

  static showPopup(displayText) {
    if (!this.popupElement || !document.body.contains(this.popupElement)) {
      this.popupElement = makeElement('div', { className: 'keystroke-popup' });
      document.body.appendChild(this.popupElement);
    }
    while (this.popupElement.firstChild) {
      this.popupElement.removeChild(this.popupElement.firstChild);
    }
    const container = document.createDocumentFragment();
    const regex = /<span class="([^"]+)">([^<]+)<\/span>/g;
    let lastIndex = 0;
    let match;

    if (!displayText.includes('<span')) {
      container.textContent = displayText;
    } else {
      while ((match = regex.exec(displayText)) !== null) {
        if (match.index > lastIndex) {
          container.appendChild(
            document.createTextNode(
              displayText.substring(lastIndex, match.index)
            )
          );
        }
        container.appendChild(
          makeElement('span', { className: match[1] }, match[2])
        );
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < displayText.length) {
        container.appendChild(
          document.createTextNode(displayText.substring(lastIndex))
        );
      }
    }
    this.popupElement.appendChild(container);
    this.popupElement.classList.add('show');
    setTimeout(() => this.popupElement.classList.remove('show'), 3000);
  }

  static enterMode(modeName) {
    this.currentMode = modeName;
  }
  static exitMode() {
    this.currentMode = null;
  }
  static pause() {
    this.isPaused = true;
  }
  static resume() {
    this.isPaused = false;
  }
  static destroy() {
    if (this.eventListener) {
      document.removeEventListener('keydown', this.eventListener, true);
      this.eventListener = null;
      this.listenerAttached = false;
    }
    if (this.popupElement) {
      this.popupElement.remove();
      this.popupElement = null;
    }
    this.handlers = {};
    this.modes = {};
    this.currentMode = null;
    this.isPaused = false;
  }

}

