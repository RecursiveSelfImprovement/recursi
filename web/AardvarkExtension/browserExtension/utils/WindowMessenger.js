class WindowMessenger {
  constructor(targetWindowOrUrl = null, options = {}) {
    this.targetOrigin = options.targetOrigin || '*';
    this.protocolId = options.protocolId || 'MVC_IPC_1.0';
    this.targetWindow = null;
    this.url = null;
    this.isConnected = false;
    this.handlers = new Map();
    this.outbox = [];
    this.timers = { handshake: null };

    this._boundHandler = this._handleMessage.bind(this);
    window.addEventListener('message', this._boundHandler);

    if (typeof targetWindowOrUrl === 'string') {
      this.url = targetWindowOrUrl;
    } else if (targetWindowOrUrl && typeof targetWindowOrUrl === 'object') {
      this.targetWindow = targetWindowOrUrl;
      this.startHandshake();
    }
  }

  open(windowFeatures = '') {
    if (this.url) {
      if (!this.targetWindow || this.targetWindow.closed) {
        this.targetWindow = window.open(this.url, '_blank', windowFeatures);
      } else {
        this.targetWindow.focus();
      }
    }
    this.startHandshake();
    return !!this.targetWindow;
  }

  startHandshake() {
    if (this.isConnected) return;
    if (this.timers.handshake) clearInterval(this.timers.handshake);
    this.timers.handshake = setInterval(() => {
      if (this.isConnected) {
        clearInterval(this.timers.handshake);
        return;
      }
      this._post({ type: 'SYN' });
    }, 500);
  }

  send(type, payload = null) {
    if (!this.isConnected) {
      this.outbox.push({ type, payload });
      return;
    }
    this._post({ type: 'DATA', name: type, payload });
  }

  on(type, callback) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(callback);
  }

  _post(message) {
    if (!this.targetWindow) return;
    try {
      const packet = {
        ...message,
        protocol: this.protocolId,
        timestamp: Date.now(),
      };
      console.log('[WindowMessenger EXT] postMessage type=' + packet.type + ' targetOrigin=' + this.targetOrigin + ' hasTarget=' + !!this.targetWindow);
this.targetWindow.postMessage(packet, this.targetOrigin);
    } catch (e) {
      console.error('[WindowMessenger] Send failed:', e);
    }
  }

  _handleMessage(event) {
    const data = event.data;
    if (!data || data.protocol !== this.protocolId) return;
    if (!this.targetWindow) this.targetWindow = event.source;
    if (this.targetWindow !== event.source) return;

    switch (data.type) {
      case 'SYN':
        this._post({ type: 'ACK' });
        this._setConnected();
        break;
      case 'ACK':
        this._setConnected();
        break;
      case 'DATA':
        this._trigger(data.name, data.payload);
        break;
    }
  }

  _setConnected() {
    if (!this.isConnected) {
      this.isConnected = true;
      if (this.timers.handshake) clearInterval(this.timers.handshake);
      while (this.outbox.length > 0) {
        const { type, payload } = this.outbox.shift();
        this.send(type, payload);
      }
      console.log('[WindowMessenger EXT] connected. Flushing outbox size=' + this.outbox.length);
this._trigger('connected');
    }
  }

  _trigger(eventName, data) {
    if (this.handlers.has(eventName)) {
      this.handlers.get(eventName).forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(e);
        }
      });
    }
  }

  destroy() {
    window.removeEventListener('message', this._boundHandler);
    if (this.timers.handshake) clearInterval(this.timers.handshake);
  }

}