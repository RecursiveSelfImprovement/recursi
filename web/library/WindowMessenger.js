class WindowMessenger {
  constructor(targetWindowOrUrl = null, options = {}) {
    this.debug = options.debug || false;
    this.targetOrigin = options.targetOrigin || '*';
    this.protocolId = options.protocolId || 'MVC_IPC_1.0';

    this.targetWindow = null;
    this.url = null;
    this.isConnected = false;
    this.isHost = false;

    this.handlers = new Map();
    this.outbox = [];

    this.timers = {
      handshake: null,
      heartbeat: null,
    };

    this._boundHandler = this._handleMessage.bind(this);
    window.addEventListener('message', this._boundHandler);

    // Scenario A: Host Mode (URL provided)
    if (typeof targetWindowOrUrl === 'string') {
      this.url = targetWindowOrUrl;
      this.isHost = true;
    }
    // Scenario B: Explicit Target (Window object provided)
    else if (targetWindowOrUrl && typeof targetWindowOrUrl === 'object') {
      this.targetWindow = targetWindowOrUrl;
      this.startHandshake();
    }
    // Scenario C: Passive/Client Mode (Auto-attach)
    else {
      // 1. Popup Child?
      if (window.opener && window.opener !== window) {
        this.targetWindow = window.opener;
      }
      // 2. Iframe Child?
      else if (window.parent && window.parent !== window) {
        this.targetWindow = window.parent;
      }
      // We don't start handshake actively in client mode; we wait for the host (SYN).
    }
  }

  open(windowFeatures = '') {
    if (this.url) {
      if (!this.targetWindow || this.targetWindow.closed) {
        this.targetWindow = window.open(this.url, '_blank', windowFeatures);
        if (!this.targetWindow) {
          console.error('[WindowMessenger] Popup blocked.');
          return false;
        }
      } else {
        this.targetWindow.focus();
      }
    }
    this.startHandshake();
    return true;
  }

  startHandshake() {
    if (this.isConnected) return;

    if (this.timers.handshake) clearInterval(this.timers.handshake);

    this.timers.handshake = setInterval(() => {
      if (this.isConnected) {
        clearInterval(this.timers.handshake);
        return;
      }
      if (this.targetWindow && this.targetWindow.closed) {
        this.disconnect();
        return;
      }
      // Send SYN beacon
      this._post({ type: 'SYN' });
    }, 500);
  }

  send(type, payload = null) {
    if (!this.isConnected) {
      this.outbox.push({ type, payload });
      // If we have a target window but lost connection, try handshaking again
      if (this.targetWindow) this.startHandshake();
      return;
    }
    this._post({ type: 'DATA', name: type, payload });
  }

  sendMessage(content) {
    // If content has a 'type' property, use it as the event name
    if (content && content.type) {
      const { type, ...rest } = content;
      this.send(type, rest); // Send remainder as payload
    } else {
      this.send('message', content);
    }
  }

  on(type, callback) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type).add(callback);
  }

  off(type, callback) {
    if (this.handlers.has(type)) {
      this.handlers.get(type).delete(callback);
    }
  }

  destroy() {
    window.removeEventListener('message', this._boundHandler);
    if (this.timers.handshake) clearInterval(this.timers.handshake);
    if (this.timers.heartbeat) clearInterval(this.timers.heartbeat);
    this.handlers.clear();
    this.isConnected = false;
    this.targetWindow = null;
  }

  disconnect() {
    this.isConnected = false;
    if (this.timers.handshake) clearInterval(this.timers.handshake);
    this._trigger('disconnect');
  }

  _post(message) {
    if (!this.targetWindow) return;
    try {
      const packet = {
        ...message,
        protocol: this.protocolId,
        timestamp: Date.now(),
      };
      this.targetWindow.postMessage(packet, this.targetOrigin);
    } catch (e) {
      console.error('[WindowMessenger] Send failed:', e);
    }
  }

  _handleMessage(event) {
    const data = event.data;
    if (!data || data.protocol !== this.protocolId) return;

    if (!this.targetWindow) {
      this.targetWindow = event.source;
    }

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
        // Emit specific event
        this._trigger(data.name, data.payload);
        // Emit generic 'message' event for legacy support (payload usually includes type)
        this._trigger('message', { type: data.name, ...data.payload });
        break;
    }
  }

  _setConnected() {
    if (!this.isConnected) {
      this.isConnected = true;
      if (this.timers.handshake) clearInterval(this.timers.handshake);
      this._flushOutbox();
      this._trigger('connected');
    }
  }

  _flushOutbox() {
    while (this.outbox.length > 0) {
      const { type, payload } = this.outbox.shift();
      this.send(type, payload);
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


  

  
}
