class CrossWindowMessenger {
  constructor(config = {}) {
    this.role = config.role || 'client';
    this.name = config.name || 'Messenger';
    this.targetWindow = config.targetWindow || null;
    this.targetOrigin = config.targetOrigin || '*';

    this.handlers = {};
    this.isConnected = false;

    this.heartbeatInterval = null;
    this.checkInterval = null;
    this.discoveryInterval = null; // NEW

    this._boundHandler = this._handleMessage.bind(this);
  }

  init() {
    window.addEventListener('message', this._boundHandler);
    this._startConnectionMonitor();

    if (this.role === 'host') {
      // Host Logic: Active Discovery (Beacon)
      // The Host knows the window exists, so it must initiate if the client doesn't know the opener.
      console.log(`[${this.name}] Host initialized. Starting Beacon...`);
      this._startDiscoveryBeacon();
    } else {
      // Client Logic
      if (window.opener) {
        this.targetWindow = window.opener;
        console.log(`[${this.name}] Opener found. Sending SYN...`);
        this._send('SYN', { from: this.name });
      } else {
        // Passive Mode
        console.warn(
          `[${this.name}] No opener found. Switching to PASSIVE LISTENER mode.`
        );
        this._trigger('status', 'Waiting for Host signal...');
      }
    }
  }

  destroy() {
    window.removeEventListener('message', this._boundHandler);
    clearInterval(this.heartbeatInterval);
    clearInterval(this.checkInterval);
    clearInterval(this.discoveryInterval); // NEW
    this.isConnected = false;
  }

  on(type, fn) {
    this.handlers[type] = fn;
  }

  send(type, payload = {}) {
    this._send('DATA', { type, payload });
  }

  _trigger(type, payload) {
    if (this.handlers[type]) {
      try {
        this.handlers[type](payload);
      } catch (e) {
        console.error(`[${this.name}] Handler error for ${type}:`, e);
      }
    }
  }

  _startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    // Only Host sends active PINGS, Client responds with PONGS
    if (this.role === 'host') {
      this.heartbeatInterval = setInterval(() => {
        this._send('PING');
      }, this.PING_RATE_MS);
    }
  }

  _startConnectionMonitor() {
    if (this.checkInterval) clearInterval(this.checkInterval);

    // We give a grace period at startup
    this.lastPingReceived = Date.now();

    this.checkInterval = setInterval(() => {
      const delta = Date.now() - this.lastPingReceived;
      if (this.isConnected && delta > this.TIMEOUT_MS) {
        this.isConnected = false;
        this._trigger('disconnected', 'Timeout (Heartbeat lost)');
      }
    }, 1000);
  }

  _send(msgType, content) {
    if (!this.targetWindow) {
      console.warn(`[${this.name}] Cannot send ${msgType}: No target window.`);
      return;
    }
    try {
      // console.log(`[${this.name}] >> SEND: ${msgType}`, content || '');
      this.targetWindow.postMessage(
        {
          protocol: 'MVC_CWM_1.0',
          msgType: msgType,
          timestamp: Date.now(),
          content: content,
        },
        this.targetOrigin
      );
    } catch (e) {
      console.error(`[${this.name}] Send failed:`, e);
      this._trigger('error', `Send failed: ${e.message}`);
    }
  }

  _handleMessage(event) {
    const data = event.data;
    if (!data || data.protocol !== 'MVC_CWM_1.0') return;

    // 1. Capture Source (Crucial for Passive Mode)
    if (!this.targetWindow || this.targetWindow !== event.source) {
      this.targetWindow = event.source;
      // console.log(`[${this.name}] Target acquired from event.source`);
    }

    // 2. State Update
    if (!this.isConnected) {
      this.isConnected = true;
      clearInterval(this.discoveryInterval); // Stop shouting
      this._trigger('connected', { origin: event.origin });
    }

    this.lastPingReceived = Date.now();

    // 3. Routing
    switch (data.msgType) {
      case 'SYN':
        // Host said hello. Reply ACK.
        this._send('ACK');
        break;
      case 'ACK':
        // They heard us.
        break;
      case 'PING':
        this._send('PONG');
        break;
      case 'PONG':
        break;
      case 'DATA':
        if (data.content && data.content.type) {
          this._trigger(data.content.type, data.content.payload);
        }
        break;
      case 'DISCONNECT':
        this.isConnected = false;
        this._trigger('disconnected', 'Remote requested disconnect');
        break;
    }
  }

  _startDiscoveryBeacon() {
    if (this.discoveryInterval) clearInterval(this.discoveryInterval);

    // Send a SYN packet every second until connected
    this.discoveryInterval = setInterval(() => {
      if (this.isConnected) {
        clearInterval(this.discoveryInterval);
        return;
      }
      // Only send if we actually have a window reference (Host always should)
      if (this.targetWindow) {
        // console.log(`[${this.name}] Beacon SYN...`);
        // We use * origin for discovery to ensure it hits cross-origin targets
        try {
          this.targetWindow.postMessage(
            {
              protocol: 'MVC_CWM_1.0',
              msgType: 'SYN',
              timestamp: Date.now(),
              content: { from: this.name },
            },
            '*'
          );
        } catch (e) {
          console.warn('Beacon failed', e);
        }
      }
    }, 1000);
  }


  

  
}
