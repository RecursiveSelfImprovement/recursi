class TouchController {
    constructor() {
      this.env = null;
      this.rootElement = null;
      this.trackpadView = null;
      this.trackpadControls = null;
      this.statusText = null;
      
      this.viewMode = 'rotate'; // 'rotate' | 'pan'
      this.controlMode = 'sliders'; // 'sliders' | 'paint'
      this.currentMode = 'rotate'; // Explicit mode parameter preventing runtime crashes
      
      this.viewDragging = false;
      this.viewPinching = false;
      this.viewThreeFingerDragging = false;
      this.viewFourFingerDragging = false; // 4-finger drag state
      this.viewLastX = 0;
      this.viewLastY = 0;
      this.viewLastPinchDist = 0;
      this.viewLastThreeFingerY = 0;
      this.viewLastFourFingerY = 0; // 4-finger tracking position
      this.viewLastTapTime = 0;
      this.viewLastTapX = 0;
      this.viewLastTapY = 0;

      this.viewVelocityX = 0;
      this.viewVelocityY = 0;
      this.viewVelocityZ = 0; // 4-finger sliding velocity
      this.viewInertiaFrameId = null;
      this.viewInertiaZFrameId = null; // 4-finger inertia frame
      
      this.ctrlDragging = false;
      this.ctrlLastX = 0;
      this.ctrlLastY = 0;
      this.ctrlLastTapTime = 0;
      this.ctrlLastTapX = 0;
      this.ctrlLastTapY = 0;
      this.ctrlTouchStartX = 0;
      this.ctrlTouchStartY = 0;
      this.ctrlGestureLock = null; 
      this.ctrlSliderSelectAccumulator = 0;
      this.ctrlLastAdjustmentTime = 0;

      this.peerConnection = null;
      this.dataChannel = null;

      this.clientBeaconInterval = null;
      this.clientPollInterval = null;
      this.heartbeatInterval = null;
      this.lastHeartbeatTime = 0;
      this.isVerified = false;
      this.roomCode = '';

      this.onTouchStartHandler = null;
      this.onTouchMoveHandler = null;
      this.onTouchEndHandler = null;
      this.onCtrlTouchStartHandler = null;
      this.onCtrlTouchMoveHandler = null;
      this.onCtrlTouchEndHandler = null;
      this.onResizeHandler = null;

      this.longPressTimeout = null;
      this.ctrlGestureStartX = 0;
    }

    async run(env) {
      this.env = env;
      const parentElement = env.container;

      this._initStyles();

      const statusSpan = makeElement('span', {
        style: { fontSize: '11px', color: '#888' }
      }, 'Offline');

      this._initUI(parentElement, statusSpan);
      this._setupEvents();

      setTimeout(() => {
        this._updateTrackpadLabels();
      }, 100);

      // Start the P2P connection card expanded on page load so the user can instantly pair
      this.setPanelExpanded(true);

      this._log('TouchController initialized');

      // AUTOMATIC HANDSHAKE TRIGGER IF ROOM PARAMETER OR SAVED ROOM EXISTS
      const params = new URLSearchParams(window.location.search);
      let room = params.get('room') || params.get('roomCode');
      
      if (!room) {
        // Fallback to cached room
        room = localStorage.getItem('p2p-client-room') || '7777';
      } else {
        // Cache URL room code
        localStorage.setItem('p2p-client-room', room);
      }

      if (room) {
        this._log(`Auto-connecting to room: ${room}`);
        const roomInput = this.rootElement.querySelector('input[placeholder="Code"]');
        if (roomInput) {
          roomInput.value = room;
        }
        setTimeout(() => {
          this._startWirelessClient(room, statusSpan);
        }, 400);
      }

      return this;
    }


    _setupEvents() {
      // 1. View trackpad listeners
      this.onTouchStartHandler = (e) => this._onViewTouchStart(e);
      this.onTouchMoveHandler = (e) => this._onViewTouchMove(e);
      this.onTouchEndHandler = (e) => this._onViewTouchEnd(e);

      this.trackpadView.addEventListener('touchstart', this.onTouchStartHandler, { passive: false });
      this.trackpadView.addEventListener('touchmove', this.onTouchMoveHandler, { passive: false });
      this.trackpadView.addEventListener('touchend', this.onTouchEndHandler, { passive: false });
      this.trackpadView.addEventListener('touchcancel', this.onTouchEndHandler, { passive: false });

      // 2. Controls trackpad listeners
      this.onCtrlTouchStartHandler = (e) => this._onCtrlTouchStart(e);
      this.onCtrlTouchMoveHandler = (e) => this._onCtrlTouchMove(e);
      this.onCtrlTouchEndHandler = (e) => this._onCtrlTouchEnd(e);

      this.trackpadControls.addEventListener('touchstart', this.onCtrlTouchStartHandler, { passive: false });
      this.trackpadControls.addEventListener('touchmove', this.onCtrlTouchMoveHandler, { passive: false });
      this.trackpadControls.addEventListener('touchend', this.onCtrlTouchEndHandler, { passive: false });
      this.trackpadControls.addEventListener('touchcancel', this.onCtrlTouchEndHandler, { passive: false });

      this.onResizeHandler = () => this._onResize();
      window.addEventListener('resize', this.onResizeHandler);
    }

    _onTouchStart() {}

    _onTouchMove() {}

    _onTouchEnd() {}

    _onPointerDown(e) {
      if (e.pointerType === 'touch') return;
      e.preventDefault();
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.sendDragStart();
    }

    _onPointerMove(e) {
      if (!this.isDragging || e.pointerType === 'touch') return;
      
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      this.sendDrag(dx, dy);
    }

    _onPointerUp(e) {
      if (e.pointerType === 'touch') return;
      this.isDragging = false;
      this.sendDragRelease();
    }

    sendDragStart() {
      if (this.dataChannel && this.dataChannel.readyState === 'open') {
        this.dataChannel.send(JSON.stringify({
          type: 'dragStart',
          mode: this.currentMode
        }));
      }
    }

    sendDrag(dx, dy) {
      if (this.dataChannel && this.dataChannel.readyState === 'open') {
        this.dataChannel.send(JSON.stringify({
          type: 'drag',
          dx: dx,
          dy: dy,
          mode: this.currentMode
        }));
      }
      if (this.statusText) {
        this.statusText.textContent = `${this.currentMode.toUpperCase()} active: dx=${Math.round(dx)}, dy=${Math.round(dy)}`;
      }
    }

    sendZoom(ratio) {
      if (this.dataChannel && this.dataChannel.readyState === 'open') {
        this.dataChannel.send(JSON.stringify({
          type: 'zoom',
          ratio: ratio
        }));
      }
      if (this.statusText) {
        this.statusText.textContent = `Zooming: scale=${ratio.toFixed(2)}`;
      }
    }

    sendDragRelease() {
      if (this.dataChannel && this.dataChannel.readyState === 'open') {
        this.dataChannel.send(JSON.stringify({
          type: 'dragEnd',
          mode: this.currentMode
        }));
      }
      if (this.statusText) {
        this.statusText.textContent = 'Drag surface ready.';
      }
    }

    async _startWirelessClient(roomCode, statusLabel) {
      const SIGNAL_BASE = window.location.hostname.includes('recursi.dev') 
        ? 'https://recursi.dev/TouchController/signal.php' 
        : (window.location.origin + '/signal');
      this.roomCode = roomCode;
      statusLabel.textContent = 'Searching for host...';
      statusLabel.style.color = '#90a4ae';
      this._log(`--- Connect attempt [v3.2], room: ${roomCode} ---`);

      this._cleanupConnection();
      this._updateButtonState(true);

      try {
        const pc = new RTCPeerConnection(this._getRTCConfig());
        this.peerConnection = pc;

        pc.oniceconnectionstatechange = () => {
          this._log(`ICE: ${pc.iceConnectionState}`);
        };

        pc.onconnectionstatechange = () => {
          const state = pc.connectionState.toLowerCase();
          this._log(`Conn state change: ${state}`);
          if (state === 'failed' || state === 'closed' || state === 'disconnected') {
            statusLabel.textContent = '[v3.2] Disconnected. Retrying...';
            statusLabel.style.color = '#ffa726';
            this._cleanupConnection();
            setTimeout(() => {
              this._startWirelessClient(roomCode, statusLabel);
            }, 1500);
          } else if (state === 'connected') {
            if (!this.isVerified) {
              statusLabel.textContent = '[v3.2] Transport established. Verifying...';
              statusLabel.style.color = '#0288d1';
            }
          } else {
            statusLabel.textContent = `[v3.2] Transport: ${state === 'checking' ? 'Establishing' : state}`;
            statusLabel.style.color = '#90a4ae';
          }
        };

        pc.ondatachannel = (e) => {
          this._log('Data channel received from host');
          this.dataChannel = e.channel;
          this._setupDataChannelEvents(this.dataChannel, statusLabel);
        };

        const hostTopic = `vibes-rotate-${roomCode}-host`;
        const clientTopic = `vibes-rotate-${roomCode}-client`;

        this._log(`Polling: ${SIGNAL_BASE}/${hostTopic}`);
        let isOfferProcessed = false;
        let pollCount = 0;

        this.clientPollInterval = setInterval(async () => {
          if (isOfferProcessed) {
            clearInterval(this.clientPollInterval);
            return;
          }
          pollCount++;
          this._log(`Poll #${pollCount}...`);

          try {
            // Added cache-busting timestamp on client GET poll
            const res = await fetch(`${SIGNAL_BASE}/${hostTopic}?_=${Date.now()}`);
            if (!res.ok) {
              statusLabel.textContent = 'Signaling server unreachable.';
              statusLabel.style.color = '#ff4444';
              return;
            }
            const text = await res.text();
            this._log(`Got ${text.length} chars`);

            if (!text || text.trim() === '') {
              this._log('Empty - no offer yet');
              return;
            }

            if (!pc.remoteDescription) {
              let envelope;
              try {
                envelope = JSON.parse(decodeURIComponent(text));
              } catch(e) {
                this._log(`Parse error: ${e.message}`);
                return;
              }

              if (!envelope.sdp) {
                this._log('No SDP in envelope, skipping');
                return;
              }

              isOfferProcessed = true;
              clearInterval(this.clientPollInterval);
              this._log('Offer accepted! Setting remote description...');

              this.connectionSessionId = envelope.sid || '';

              await pc.setRemoteDescription(envelope.sdp);
              this._log('Remote desc set. Creating answer...');

              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              this._log('Local desc set. Waiting for ICE...');

              statusLabel.textContent = 'Assembling routes...';
              statusLabel.style.color = '#ffa726';
              await this._waitForIceGathering(pc);
              this._log('ICE gathered. Sending answer...');

              const bakedAnswer = encodeURIComponent(JSON.stringify({
                sdp: pc.localDescription,
                sid: this.connectionSessionId
              }));

              // Added cache-busting timestamp on client POST answer
              fetch(`${SIGNAL_BASE}/${clientTopic}?_=${Date.now()}`, { method: 'POST', body: bakedAnswer })
                .then(() => this._log('Answer posted'))
                .catch(e => this._log(`Answer post error: ${e.message}`));

              this.clientBeaconInterval = setInterval(async () => {
                if (this.dataChannel && this.dataChannel.readyState === 'open' && this.isVerified) {
                  clearInterval(this.clientBeaconInterval);
                  return;
                }
                try {
                  // Added cache-busting timestamp on client answer beacon
                  await fetch(`${SIGNAL_BASE}/${clientTopic}?_=${Date.now()}`, { method: 'POST', body: bakedAnswer });
                  this._log('Answer beacon sent');
                } catch(err) {
                  this._log(`Answer beacon error: ${err.message}`);
                }
              }, 2000);
            }

          } catch(err) {
            this._log(`Poll error: ${err.message}`);
          }
        }, 1500);

      } catch(err) {
        this._log(`Fatal: ${err.message}`);
        statusLabel.textContent = 'Client Error: ' + err.message;
        statusLabel.style.color = '#ff4444';
      }
    }

    async _processManualOffer(offerBase64, answerTextArea, statusLabel) {
      if (this.peerConnection) return;
      statusLabel.textContent = 'Parsing manual offer...';
      
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        this.peerConnection = pc;

        pc.ondatachannel = (e) => {
          this.dataChannel = e.channel;
          this._setupDataChannelEvents(this.dataChannel, statusLabel);
        };

        const offerDesc = JSON.parse(atob(offerBase64.trim()));
        await pc.setRemoteDescription(offerDesc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await this._waitForIceGathering(pc);

        const bakedAnswer = btoa(JSON.stringify(pc.localDescription));
        answerTextArea.value = bakedAnswer;
        statusLabel.textContent = 'Handshake formulated.';
      } catch (err) {
        statusLabel.textContent = 'Error parsing Offer: ' + err.message;
      }
    }

    _waitForIceGathering(pc) {
      return new Promise((resolve) => {
        if (pc.iceGatheringState === 'complete') { resolve(); return; }
        let resolved = false;
        const done = () => {
          if (resolved) return;
          resolved = true;
          pc.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        };
        const checkState = () => {
          if (pc.iceGatheringState === 'complete') {
            done();
          }
        };
        pc.addEventListener('icegatheringstatechange', checkState);
        setTimeout(done, 1000); // Limit waiting to 1000ms.
      });
    }

    _setupDataChannelEvents(channel, statusLabel) {
      channel.onopen = () => {
        this.isVerified = false;
        this.lastHeartbeatTime = Date.now();
        this._log('Data channel open. Awaiting handshake...');
        statusLabel.textContent = 'Awaiting handshake...';
        statusLabel.style.color = '#0288d1';
        
        const welcomeStatus = document.getElementById('p2p-welcome-pairing-status');
        if (welcomeStatus) {
          welcomeStatus.textContent = 'Verifying Handshake Routes...';
          welcomeStatus.style.color = '#0288d1';
        }
      };

      channel.onclose = () => {
        this._log('Data channel closed');
        statusLabel.textContent = 'Disconnected. Retrying...';
        statusLabel.style.color = '#ffa726';
        this._cleanupConnection();
        setTimeout(() => {
          this._startWirelessClient(this.roomCode || '7777', statusLabel);
        }, 1500);
      };

      channel.onerror = (err) => {
        this._log(`Data channel error: ${err.message}`);
        this._cleanupConnection();
      };

      channel.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          this.lastHeartbeatTime = Date.now();

          if (payload.type === 'h-ping') {
            channel.send(JSON.stringify({ type: 'h-pong' }));
            if (!this.isVerified) {
              statusLabel.textContent = 'Handshaking...';
              statusLabel.style.color = '#0288d1';
            }
          } else if (payload.type === 'h-verified') {
            this.isVerified = true;
            this._log('Handshake verified. Connected successfully!');
            statusLabel.textContent = 'Connected';
            statusLabel.style.color = '#00e676';
            this._startHeartbeat(channel, statusLabel);
            
            // Auto collapse ONLY upon verified linkage
            this.setPanelExpanded(false);
          } else if (payload.type === 'configure') {
            this._applyAppConfiguration(payload.config);
          } else if (payload.type === 'ping') {
            channel.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (err) {
          console.error('Error handling channel frame:', err);
        }
      };
    }

    _onResize() {
      if (this.p2pExpanded) {
        this.setPanelExpanded(true);
      }
    }

    destroy() {
      if (this.clientBeaconInterval) clearInterval(this.clientBeaconInterval);
      if (this.clientPollInterval) clearInterval(this.clientPollInterval);

      if (this.trackpadView) {
        if (this.onTouchStartHandler) this.trackpadView.removeEventListener('touchstart', this.onTouchStartHandler);
        if (this.onTouchMoveHandler) this.trackpadView.removeEventListener('touchmove', this.onTouchMoveHandler);
        if (this.onTouchEndHandler) this.trackpadView.removeEventListener('touchend', this.onTouchEndHandler);
      }

      if (this.trackpadControls) {
        if (this.onCtrlTouchStartHandler) this.trackpadControls.removeEventListener('touchstart', this.onCtrlTouchStartHandler);
        if (this.onCtrlTouchMoveHandler) this.trackpadControls.removeEventListener('touchmove', this.onCtrlTouchMoveHandler);
        if (this.onCtrlTouchEndHandler) this.trackpadControls.removeEventListener('touchend', this.onCtrlTouchEndHandler);
      }

      if (this.onResizeHandler) window.removeEventListener('resize', this.onResizeHandler);

      if (this.rootElement && this.rootElement.parentElement) {
        this.rootElement.parentElement.removeChild(this.rootElement);
      }

      this.rootElement = null;
      this.trackpadView = null;
      this.trackpadControls = null;
      this.statusText = null;
    }
  
  _initDebugLog() {
      // Small toggle button in top-right corner
      const toggleBtn = makeElement('div', {
        style: {
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '28px',
          height: '28px',
          background: 'rgba(0,0,0,0.7)',
          border: '1px solid #444',
          borderRadius: '50%',
          color: '#00e676',
          fontSize: '14px',
          textAlign: 'center',
          lineHeight: '28px',
          zIndex: '300',
          cursor: 'pointer',
          userSelect: 'none'
        }
      }, '📋');

      // Log panel - bottom third of screen, transparent enough to see through
      const log = makeElement('div', {
        style: {
          position: 'absolute',
          bottom: '70px',
          left: '0',
          right: '0',
          height: '30%',
          background: 'rgba(0,0,0,0.55)',
          borderTop: '1px solid #333',
          padding: '6px',
          overflowY: 'scroll',
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#00e676',
          zIndex: '200',
          boxSizing: 'border-box',
          pointerEvents: 'auto',
          display: 'none'
        }
      });

      toggleBtn.onclick = () => {
        log.style.display = log.style.display === 'none' ? 'block' : 'none';
      };

      this.rootElement.appendChild(log);
      this.rootElement.appendChild(toggleBtn);
      this.debugLog = log;
    }

  _log(msg) {
      const ts = new Date().toLocaleTimeString();
      const line = makeElement('div', {}, `${ts} ${msg}`);
      if (this.debugLog) {
        this.debugLog.appendChild(line);
        this.debugLog.scrollTop = this.debugLog.scrollHeight;
      }
      console.log('[TouchController]', msg);
    }

  _getRTCConfig() {
      return {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ]
      };
    }

  _cleanupConnection() {
      if (this.clientBeaconInterval) clearInterval(this.clientBeaconInterval);
      if (this.clientPollInterval) clearInterval(this.clientPollInterval);
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);

      this.clientBeaconInterval = null;
      this.clientPollInterval = null;
      this.heartbeatInterval = null;

      if (this.peerConnection) {
        try { this.peerConnection.close(); } catch(e) {}
        this.peerConnection = null;
      }
      this.dataChannel = null;
      this.isVerified = false;
      this._updateButtonState(false);
      
      // Keep panel visible and reset to default offline instructions
      this.appConfig = null;
      if (this.connectionWelcome) {
        this.connectionWelcome.style.display = 'flex';
        const welcomeStatus = document.getElementById('p2p-welcome-pairing-status');
        if (welcomeStatus) {
          welcomeStatus.textContent = 'Awaiting Host Synchronization...';
          welcomeStatus.style.color = '#ffa726';
          welcomeStatus.style.border = '1px solid rgba(255,167,38,0.2)';
          welcomeStatus.style.background = 'rgba(255,167,38,0.08)';
        }
      }
      if (this.trackpadView) {
        this.trackpadView.style.display = 'none';
      }
      if (this.trackpadControls) {
        this.trackpadControls.style.display = 'none';
      }

      this.setPanelExpanded(true);
    }

  _startHeartbeat(channel, statusLabel) {
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
      this.lastHeartbeatTime = Date.now();

      this.heartbeatInterval = setInterval(() => {
        if (!this.isVerified || !this.dataChannel || this.dataChannel.readyState !== 'open') {
          clearInterval(this.heartbeatInterval);
          return;
        }

        const silentTime = Date.now() - this.lastHeartbeatTime;
        if (silentTime > 7000) {
          this._log(`Silence detected (${silentTime}ms). Reconnecting...`);
          statusLabel.textContent = 'Lost connection. Retrying...';
          statusLabel.style.color = '#ffa726';
          this._cleanupConnection();
          clearInterval(this.heartbeatInterval);
          setTimeout(() => {
            this._startWirelessClient(this.roomCode || '7777', statusLabel);
          }, 1500);
        }
      }, 3000);
    }

  _updateButtonState(active) {
      if (!this.connectBtn) return;
      if (active) {
        this.connectBtn.textContent = 'Disconnect';
        this.connectBtn.style.background = '#e53935';
        this.connectBtn.style.color = '#fff';
      } else {
        this.connectBtn.textContent = 'Connect';
        this.connectBtn.style.background = '#00e676';
        this.connectBtn.style.color = '#000';
      }
    }

  _initStyles() {
      const css = `
        html, body {
          margin: 0; padding: 0; width: 100%; height: 100%;
          overflow: hidden; background-color: #121212;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          user-select: none; touch-action: none;
        }
        #touch-app-container {
          display: flex;
          flex-direction: column; /* Portrait: stack Controls on top, View on bottom */
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          padding: 8px;
          gap: 8px;
          background-color: #121212;
          position: relative;
        }
        .trackpad-view, .trackpad-controls {
          flex: 1;
          position: relative;
          background: #1e1e1e;
          border: 1px solid #333;
          border-radius: 8px;
          overflow: hidden;
          touch-action: none;
        }
        .trackpad-view svg, .trackpad-controls svg {
          width: 100%;
          height: 100%;
          display: block;
        }
        .status-text {
          position: absolute;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          color: #888888;
          font-family: monospace;
          font-size: 11px;
          pointer-events: none;
          text-align: center;
          white-space: nowrap;
          text-transform: uppercase;
          letter-spacing: 1px;
          background: rgba(0,0,0,0.4);
          padding: 4px 8px;
          border-radius: 4px;
        }
        .p2p-panel-card {
          position: absolute;
          top: 12px;
          left: 12px;
          z-index: 500;
          background: rgba(25, 25, 25, 0.95);
          border: 1.5px solid #333;
          border-radius: 8px;
          padding: 10px;
          color: #ccc;
          font-size: 11px;
          box-sizing: border-box;
          transition: all 0.2s ease-in-out;
          box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        }
        
        /* LANDSCAPE SPECIFIC SIDE-BY-SIDE LAYOUT */
        @media (orientation: landscape) {
          #touch-app-container {
            flex-direction: row-reverse; /* View on Left, Controls on Right */
          }
        }
      `;
      applyCss(css, 'touchcontroller-v3-css');
    }

  _initUI(parentElement, statusLabel) {
      this.rootElement = makeElement('div', { id: 'touch-app-container' });

      // View Trackpad (camera manipulation) - HIDDEN BY DEFAULT
      this.trackpadView = makeElement('div', { className: 'trackpad-view', style: { display: 'none' } });
      const svgView = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const gridGroupView = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      gridGroupView.setAttribute('opacity', '0.07');
      
      const horizontalLineV = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      horizontalLineV.setAttribute('x1', '0'); horizontalLineV.setAttribute('y1', '50%');
      horizontalLineV.setAttribute('x2', '100%'); horizontalLineV.setAttribute('y2', '50%');
      horizontalLineV.setAttribute('stroke', '#ffffff'); horizontalLineV.setAttribute('stroke-width', '1.5');
      horizontalLineV.setAttribute('stroke-dasharray', '4,4');

      const verticalLineV = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      verticalLineV.setAttribute('x1', '50%'); verticalLineV.setAttribute('y1', '0');
      verticalLineV.setAttribute('x2', '50%'); verticalLineV.setAttribute('y2', '100%');
      verticalLineV.setAttribute('stroke', '#ffffff'); verticalLineV.setAttribute('stroke-width', '1.5');
      verticalLineV.setAttribute('stroke-dasharray', '4,4');

      gridGroupView.appendChild(horizontalLineV);
      gridGroupView.appendChild(verticalLineV);
      svgView.appendChild(gridGroupView);
      this.trackpadView.appendChild(svgView);

      this.viewStatusText = makeElement('div', { className: 'status-text' }, 'VIEW: ROTATE');
      this.trackpadView.appendChild(this.viewStatusText);

      // Controls Trackpad (manipulating sliders/parameters) - HIDDEN BY DEFAULT
      this.trackpadControls = makeElement('div', { className: 'trackpad-controls', style: { display: 'none' } });
      const svgCtrl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const gridGroupCtrl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      gridGroupCtrl.setAttribute('opacity', '0.07');
      
      const horizontalLineC = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      horizontalLineC.setAttribute('x1', '0'); horizontalLineC.setAttribute('y1', '50%');
      horizontalLineC.setAttribute('x2', '100%'); horizontalLineC.setAttribute('y2', '50%');
      horizontalLineC.setAttribute('stroke', '#ffffff'); horizontalLineC.setAttribute('stroke-width', '1.5');
      horizontalLineC.setAttribute('stroke-dasharray', '4,4');

      const verticalLineC = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      verticalLineC.setAttribute('x1', '50%'); verticalLineC.setAttribute('y1', '0');
      verticalLineC.setAttribute('x2', '50%'); verticalLineC.setAttribute('y2', '100%');
      verticalLineC.setAttribute('stroke', '#ffffff'); verticalLineC.setAttribute('stroke-width', '1.5');
      verticalLineC.setAttribute('stroke-dasharray', '4,4');

      gridGroupCtrl.appendChild(horizontalLineC);
      gridGroupCtrl.appendChild(verticalLineC);
      svgCtrl.appendChild(gridGroupCtrl);
      this.trackpadControls.appendChild(svgCtrl);

      this.ctrlStatusText = makeElement('div', { className: 'status-text' }, 'CONTROLS: COMPASS');
      this.trackpadControls.appendChild(this.ctrlStatusText);

      // Connection instructions welcome card - SHOWN BY DEFAULT
      this.connectionWelcome = makeElement('div', {
        id: 'p2p-connection-welcome-card',
        style: {
          position: 'absolute',
          top: '55%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: '#e0e0e0',
          fontFamily: 'sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          padding: '24px',
          background: 'rgba(25, 25, 25, 0.95)',
          borderRadius: '10px',
          border: '1px dashed #444',
          zIndex: '100',
          width: '85%',
          maxWidth: '310px',
          boxSizing: 'border-box',
          boxShadow: '0 10px 30px rgba(0,0,0,0.6)'
        }
      }, [
        makeElement('div', { style: { fontSize: '18px', fontWeight: 'bold', color: '#00e676', letterSpacing: '0.5px' } }, 'Touch Controller'),
        makeElement('div', { style: { fontSize: '12px', color: '#888', lineHeight: '1.4', margin: '4px 0 10px' } }, 'Scan the QR code displayed in your web app to pair instantly, or input the matching Room Code manually above.'),
        makeElement('div', { id: 'p2p-welcome-pairing-status', style: { fontSize: '11px', color: '#ffa726', fontWeight: 'bold', background: 'rgba(255,167,38,0.08)', padding: '6px 12px', borderRadius: '4px', border: '1px solid rgba(255,167,38,0.2)' } }, 'Awaiting Host Synchronization...')
      ]);

      // Assemble layout
      this.rootElement.appendChild(this.connectionWelcome);
      this.rootElement.appendChild(this.trackpadControls);
      this.rootElement.appendChild(this.trackpadView);

      // Floating expandable connection panel
      this.p2pPanel = makeElement('div', { className: 'p2p-panel-card' });
      
      this.p2pTriggerBtn = makeElement('button', {
        style: {
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          border: 'none',
          background: 'transparent',
          color: '#00e676',
          fontFamily: 'monospace',
          fontSize: '11px',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: '510'
        },
        onclick: (e) => {
          e.stopPropagation();
          this.setPanelExpanded(!this.p2pExpanded);
        }
      }, 'P2P');

      // Dedicated close button solves random click-closing issue on touchscreens
      this.p2pCloseBtn = makeElement('button', {
        style: {
          position: 'absolute',
          top: '6px',
          right: '6px',
          width: '24px',
          height: '24px',
          border: 'none',
          background: 'transparent',
          color: '#e53935',
          fontFamily: 'monospace',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: '520'
        },
        onclick: (e) => {
          e.stopPropagation();
          this.setPanelExpanded(false);
        }
      }, '✕');

      this.p2pPanelContents = makeElement('div', {
        style: { display: 'none', marginTop: '30px', flexDirection: 'column', gap: '8px' }
      });

      const header = makeElement('div', {
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }
      });
      const title = makeElement('span', { style: { fontWeight: 'bold', color: '#00e676', fontSize: '11px' } }, 'P2P Link (v3.2)');
      header.appendChild(title);
      header.appendChild(statusLabel);

      const syncRow = makeElement('div', { style: { display: 'flex', gap: '6px' } });
      const roomInput = makeElement('input', {
        placeholder: 'Code',
        value: '7777',
        style: {
          width: '50px',
          padding: '4px',
          background: '#1a1a1a',
          border: '1px solid #444',
          color: '#fff',
          borderRadius: '4px',
          textAlign: 'center',
          fontSize: '11px'
        }
      });
      const connectBtn = makeElement('button', {
        style: {
          flex: '1',
          padding: '4px',
          border: 'none',
          borderRadius: '4px',
          fontWeight: 'bold',
          cursor: 'pointer',
          fontSize: '11px',
          transition: 'all 0.15s'
        }
      });
      this.connectBtn = connectBtn;
      this._updateButtonState(false);

      syncRow.appendChild(roomInput);
      syncRow.appendChild(connectBtn);

      const reloadBtn = makeElement('button', {
        style: {
          width: '100%',
          padding: '4px',
          background: '#333',
          color: '#ccc',
          border: '1px solid #444',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }
      }, 'Reload App');

      this.p2pPanelContents.appendChild(header);
      this.p2pPanelContents.appendChild(syncRow);
      this.p2pPanelContents.appendChild(reloadBtn);

      this.debugLog = makeElement('div', {
        style: {
          background: 'rgba(10, 10, 10, 0.9)',
          padding: '6px',
          overflowY: 'scroll',
          fontFamily: 'monospace',
          fontSize: '9px',
          color: '#00e676',
          boxSizing: 'border-box',
          display: 'none'
        }
      });

      this.p2pPanel.appendChild(this.p2pTriggerBtn);
      this.p2pPanel.appendChild(this.p2pCloseBtn);
      this.p2pPanel.appendChild(this.p2pPanelContents);
      this.p2pPanel.appendChild(this.debugLog);

      this.rootElement.appendChild(this.p2pPanel);

      const fullscreenBtn = makeElement('div', {
        style: {
          position: 'absolute',
          top: '12px',
          right: '12px',
          width: '36px',
          height: '36px',
          background: 'rgba(25,25,25,0.85)',
          border: '1.5px solid #333',
          borderRadius: '50%',
          color: '#00e676',
          fontSize: '18px',
          textAlign: 'center',
          lineHeight: '34px',
          zIndex: '300',
          cursor: 'pointer',
          userSelect: 'none',
          boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
          boxSizing: 'border-box'
        }
      }, '⛶');

      fullscreenBtn.onclick = () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen()
            .then(() => { fullscreenBtn.textContent = '✕'; })
            .catch((err) => { console.warn("Fullscreen failed:", err); });
        } else {
          document.exitFullscreen();
          fullscreenBtn.textContent = '⛶';
        }
      };

      this.rootElement.appendChild(fullscreenBtn);
      parentElement.appendChild(this.rootElement);

      this.p2pExpanded = false;
      this.setPanelExpanded(false);

      connectBtn.onclick = () => {
        if (this.peerConnection || this.clientPollInterval) {
          this._cleanupConnection();
          statusLabel.textContent = 'Offline';
          statusLabel.style.color = '#888';
        } else {
          const code = roomInput.value.trim();
          if (!code) return;
          localStorage.setItem('p2p-client-room', code); // Cache manually connected code
          this._startWirelessClient(code, statusLabel);
        }
      };

      reloadBtn.onclick = () => {
        const url = new URL(window.location.href);
        url.searchParams.set('t', Date.now().toString());
        window.location.replace(url.toString());
      };
    }

  _applyModeChange() {
      const modes = ['rotate', 'pan', 'sliders'];
      modes.forEach((m) => {
        const active = m === this.currentMode;
        if (this.modeButtons[m]) {
          this.modeButtons[m].style.background = active ? '#00e676' : 'transparent';
          this.modeButtons[m].style.color = active ? '#000' : '#888';
        }
      });

      if (this.statusText) {
        this.statusText.textContent = `Mode toggled: ${this.currentMode.toUpperCase()}`;
      }

      if (this.dataChannel && this.dataChannel.readyState === 'open') {
        this.dataChannel.send(JSON.stringify({
          type: 'modeChange',
          mode: this.currentMode
        }));
      }
    }

  _onViewTouchStart(e) {
      e.preventDefault();
      
      this.viewVelocityX = 0;
      this.viewVelocityY = 0;
      this.viewVelocityZ = 0;
      this._stopViewInertia();
      this._stopViewInertiaZ();

      if (e.touches.length === 1) {
        const now = Date.now();
        const DOUBLE_TAP_THRESHOLD = 220;
        const clientX = e.touches[0].clientX;
        const clientY = e.touches[0].clientY;
        const tapDist = Math.hypot(clientX - this.viewLastTapX, clientY - this.viewLastTapY);

        if (this.viewLastTapTime && (now - this.viewLastTapTime < DOUBLE_TAP_THRESHOLD) && tapDist < 30) {
          // Double Tap: Toggle modes dynamically using keys from handshake schema
          if (this.appConfig && this.appConfig.leftTrackpad && this.appConfig.leftTrackpad.modes) {
            const keys = Object.keys(this.appConfig.leftTrackpad.modes);
            if (keys.length > 1) {
              const currentIdx = keys.indexOf(this.viewMode);
              const nextIdx = (currentIdx + 1) % keys.length;
              this.viewMode = keys[nextIdx];
              this.currentMode = this.viewMode;
              this._updateTrackpadLabels();
              
              if (this.dataChannel && this.dataChannel.readyState === 'open') {
                this.dataChannel.send(JSON.stringify({
                  type: 'modeChange',
                  mode: this.viewMode
                }));
              }
            }
          } else {
            // Default fallback
            this.viewMode = this.viewMode === 'rotate' ? 'pan' : 'rotate';
            this.currentMode = this.viewMode;
            this._updateTrackpadLabels();
          }
          
          this.viewLastTapTime = 0;
          this.viewDragging = false;
          return;
        }
        this.viewLastTapTime = now;
        this.viewLastTapX = clientX;
        this.viewLastTapY = clientY;

        this.viewDragging = true;
        this.viewLastX = clientX;
        this.viewLastY = clientY;
        
        this.viewPinching = false;
        this.viewThreeFingerDragging = false;
        this.viewFourFingerDragging = false;

        if (this.dataChannel && this.dataChannel.readyState === 'open') {
          this.dataChannel.send(JSON.stringify({
            type: 'dragStart',
            mode: this.viewMode
          }));
        }
      } else if (e.touches.length === 2) {
        this.viewDragging = false;
        this.viewPinching = true;
        this.viewThreeFingerDragging = false;
        this.viewFourFingerDragging = false;
        this.viewLastPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      } else if (e.touches.length === 3) {
        this.viewDragging = false;
        this.viewPinching = false;
        this.viewThreeFingerDragging = true;
        this.viewFourFingerDragging = false;
        this.viewLastThreeFingerY = (e.touches[0].clientY + e.touches[1].clientY + e.touches[2].clientY) / 3;
      } else if (e.touches.length === 4) {
        this.viewDragging = false;
        this.viewPinching = false;
        this.viewThreeFingerDragging = false;
        this.viewFourFingerDragging = true;
        this.viewLastFourFingerY = (e.touches[0].clientY + e.touches[1].clientY + e.touches[2].clientY + e.touches[3].clientY) / 4;
      }
    }

  _onViewTouchMove(e) {
      e.preventDefault();
      if (e.touches.length === 1 && this.viewDragging) {
        const touch = e.touches[0];
        const dx = (touch.clientX - this.viewLastX) * 1.5;
        const dy = (touch.clientY - this.viewLastY) * 1.5;
        this.viewLastX = touch.clientX;
        this.viewLastY = touch.clientY;

        const decay = 0.7;
        this.viewVelocityX = this.viewVelocityX * (1 - decay) + dx * decay;
        this.viewVelocityY = this.viewVelocityY * (1 - decay) + dy * decay;

        if (this.dataChannel && this.dataChannel.readyState === 'open') {
          this.dataChannel.send(JSON.stringify({
            type: 'drag',
            dx: dx,
            dy: dy,
            mode: this.viewMode
          }));
        }
      } else if (e.touches.length === 2 && this.viewPinching) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (this.viewLastPinchDist > 0) {
          const ratio = dist / this.viewLastPinchDist;
          if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify({
              type: 'zoom',
              ratio: ratio
            }));
          }
        }
        this.viewLastPinchDist = dist;
      } else if (e.touches.length === 3 && this.viewThreeFingerDragging) {
        const currentY = (e.touches[0].clientY + e.touches[1].clientY + e.touches[2].clientY) / 3;
        const dy = currentY - this.viewLastThreeFingerY;
        this.viewLastThreeFingerY = currentY;

        if (this.dataChannel && this.dataChannel.readyState === 'open') {
          this.dataChannel.send(JSON.stringify({
            type: 'perspective',
            dy: dy
          }));
        }
      } else if (e.touches.length === 4 && this.viewFourFingerDragging) {
        const currentY = (e.touches[0].clientY + e.touches[1].clientY + e.touches[2].clientY + e.touches[3].clientY) / 4;
        const dy = currentY - this.viewLastFourFingerY;
        this.viewLastFourFingerY = currentY;

        const decay = 0.7;
        this.viewVelocityZ = this.viewVelocityZ * (1 - decay) + dy * decay;

        if (this.dataChannel && this.dataChannel.readyState === 'open') {
          this.dataChannel.send(JSON.stringify({
            type: 'accudrawZ',
            dy: dy
          }));
        }
      }
    }

  _onViewTouchEnd(e) {
      e.preventDefault();
      
      const wasFourFinger = this.viewFourFingerDragging;

      this.viewDragging = false;
      this.viewPinching = false;
      this.viewThreeFingerDragging = false;
      this.viewFourFingerDragging = false;
      this.viewLastPinchDist = 0;

      if (wasFourFinger && Math.abs(this.viewVelocityZ) > 0.5) {
        this._startViewInertiaZ();
      } else if (Math.hypot(this.viewVelocityX, this.viewVelocityY) > 0.5) {
        this._startViewInertia();
      } else {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
          this.dataChannel.send(JSON.stringify({
            type: 'dragEnd',
            mode: this.viewMode
          }));
        }
      }
    }

  _onCtrlTouchStart(e) {
      e.preventDefault();
      if (e.touches.length === 1) {
        const now = Date.now();
        const DOUBLE_TAP_THRESHOLD = 220;
        const clientX = e.touches[0].clientX;
        const clientY = e.touches[0].clientY;
        const tapDist = Math.hypot(clientX - this.ctrlLastTapX, clientY - this.ctrlLastTapY);

        const wasRecentlyAdjusting = (now - this.ctrlLastAdjustmentTime < 600);

        if (this.ctrlLastTapTime && (now - this.ctrlLastTapTime < DOUBLE_TAP_THRESHOLD) && tapDist < 30 && !wasRecentlyAdjusting) {
          // Double Tap: Toggle modes dynamically using keys from handshake schema
          if (this.appConfig && this.appConfig.rightTrackpad && this.appConfig.rightTrackpad.modes) {
            const keys = Object.keys(this.appConfig.rightTrackpad.modes);
            if (keys.length > 1) {
              const currentIdx = keys.indexOf(this.controlMode);
              const nextIdx = (currentIdx + 1) % keys.length;
              this.controlMode = keys[nextIdx];
              this.currentMode = this.controlMode;
              this._updateTrackpadLabels();
              
              if (this.dataChannel && this.dataChannel.readyState === 'open') {
                this.dataChannel.send(JSON.stringify({
                  type: 'modeChange',
                  mode: this.controlMode
                }));
              }
            }
          } else {
            // Default fallback
            this.controlMode = this.controlMode === 'sliders' ? 'tool' : 'sliders';
            this.currentMode = this.controlMode;
            this._updateTrackpadLabels();
          }

          this.ctrlLastTapTime = 0;
          this.ctrlDragging = false;
          return;
        }
        this.ctrlLastTapTime = now;
        this.ctrlLastTapX = clientX;
        this.ctrlLastTapY = clientY;

        this.ctrlDragging = true;
        this.ctrlLastX = clientX;
        this.ctrlLastY = clientY;

        this.ctrlTouchStartX = clientX;
        this.ctrlTouchStartY = clientY;
        this.ctrlTouchStartTime = now;
        this.ctrlGestureLock = null;

        if (this.controlMode === 'sliders' || this.controlMode === 'tool') {
          if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify({
              type: 'sliderDragStart',
              mode: this.controlMode
            }));
          }
        } else if (this.controlMode === 'paint') {
          if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify({
              type: 'dragStart',
              mode: 'paint'
            }));
          }
        }
      }
    }

  _onCtrlTouchMove(e) {
      e.preventDefault();
      if (e.touches.length === 1 && this.ctrlDragging) {
        const touch = e.touches[0];
        
        if (this.controlMode === 'sliders' || this.controlMode === 'tool') {
          const totalDx = touch.clientX - this.ctrlTouchStartX;
          const totalDy = touch.clientY - this.ctrlTouchStartY;

          if (this.ctrlGestureLock === null) {
            const threshold = 10;
            if (Math.hypot(totalDx, totalDy) > threshold) {
              if (Math.abs(totalDy) > Math.abs(totalDx)) {
                this.ctrlGestureLock = 'vertical';
                this.ctrlLastY = touch.clientY;
              } else {
                this.ctrlGestureLock = 'horizontal';
                this.ctrlGestureStartX = touch.clientX;
                if (this.dataChannel && this.dataChannel.readyState === 'open') {
                  this.dataChannel.send(JSON.stringify({
                    type: 'sliderAdjustStart'
                  }));
                }
              }
            }
          } else {
            if (this.ctrlGestureLock === 'vertical') {
              // Send the continuous relative movement from the starting finger touchdown point smoothly.
              // (No more discrete resetting steps or grid thresholds on the mobile client side!)
              const continuousDy = touch.clientY - this.ctrlTouchStartY;
              
              if (this.dataChannel && this.dataChannel.readyState === 'open') {
                this.dataChannel.send(JSON.stringify({
                  type: 'sliderDragMove',
                  dy: continuousDy,
                  phoneHeight: this.trackpadControls.clientHeight || 300
                }));
              }
            } else if (this.ctrlGestureLock === 'horizontal') {
              const trackpadWidth = this.trackpadControls.clientWidth || 250;
              const sensitivityFactor = 1.333;
              const offsetRatio = ((touch.clientX - this.ctrlGestureStartX) / trackpadWidth) * sensitivityFactor;

              this.ctrlLastAdjustmentTime = Date.now();

              if (this.dataChannel && this.dataChannel.readyState === 'open') {
                this.dataChannel.send(JSON.stringify({
                  type: 'sliderAdjust',
                  ratio: offsetRatio
                }));
              }
            }
          }
        } else if (this.controlMode === 'paint') {
          const dx = touch.clientX - this.ctrlLastX;
          const dy = touch.clientY - this.ctrlLastY;
          this.ctrlLastX = touch.clientX;
          this.ctrlLastY = touch.clientY;

          if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify({
              type: 'drag',
              dx: dx,
              dy: dy,
              mode: 'paint'
            }));
          }
        }
      }
    }

  _onCtrlTouchEnd(e) {
      e.preventDefault();
      
      const now = Date.now();
      const duration = now - (this.ctrlTouchStartTime || 0);
      const isTap = (this.ctrlGestureLock === null) && (duration < 250);

      this.ctrlDragging = false;
      this.ctrlGestureLock = null;

      if (this.controlMode === 'sliders' || this.controlMode === 'tool') {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
          if (isTap) {
            this.dataChannel.send(JSON.stringify({
              type: 'sliderTap'
            }));
          } else {
            this.dataChannel.send(JSON.stringify({
              type: 'sliderDragEnd'
            }));
          }
        }
      } else if (this.controlMode === 'paint') {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
          this.dataChannel.send(JSON.stringify({
            type: 'dragEnd',
            mode: 'paint'
          }));
        }
      }
    }

  _updateTrackpadLabels() {
      let viewLabel = `VIEW: ${this.viewMode.toUpperCase()}`;
      let ctrlLabel = `CONTROLS: ${this.controlMode.toUpperCase()}`;

      if (this.appConfig) {
        if (this.appConfig.leftTrackpad && this.appConfig.leftTrackpad.modes && this.appConfig.leftTrackpad.modes[this.viewMode]) {
          const modeObj = this.appConfig.leftTrackpad.modes[this.viewMode];
          viewLabel = `${this.appConfig.leftTrackpad.title.toUpperCase()}: ${modeObj.label.toUpperCase()}`;
        }
        if (this.appConfig.rightTrackpad && this.appConfig.rightTrackpad.modes && this.appConfig.rightTrackpad.modes[this.controlMode]) {
          const modeObj = this.appConfig.rightTrackpad.modes[this.controlMode];
          ctrlLabel = `${this.appConfig.rightTrackpad.title.toUpperCase()}: ${modeObj.label.toUpperCase()}`;
        }
      }

      if (this.viewStatusText) {
        this.viewStatusText.textContent = viewLabel;
      }
      if (this.ctrlStatusText) {
        this.ctrlStatusText.textContent = ctrlLabel;
      }
    }

  setPanelExpanded(expanded) {
      this.p2pExpanded = expanded;
      const isLandscape = window.innerWidth > window.innerHeight;
      
      if (expanded) {
        this.p2pPanel.style.borderRadius = '8px';
        this.p2pPanel.style.padding = '10px';
        this.p2pPanel.style.background = 'rgba(25, 25, 25, 0.98)';
        this.p2pPanel.style.border = '1.5px solid #333';
        this.p2pPanelContents.style.display = 'flex';
        
        // Hide trigger btn entirely, display the close "X" btn
        this.p2pTriggerBtn.style.display = 'none';
        this.p2pCloseBtn.style.display = 'flex';

        if (isLandscape) {
          this.p2pPanel.style.width = '450px';
          this.p2pPanel.style.height = '180px';
          this.p2pPanel.style.display = 'flex';
          this.p2pPanel.style.flexDirection = 'row';
          this.p2pPanelContents.style.width = '200px';
          this.debugLog.style.width = '220px';
          this.debugLog.style.height = '100%';
          this.debugLog.style.borderLeft = '1px solid #444';
          this.debugLog.style.borderTop = 'none';
          this.debugLog.style.display = 'block';
        } else {
          this.p2pPanel.style.width = '240px';
          this.p2pPanel.style.height = '300px';
          this.p2pPanel.style.display = 'flex';
          this.p2pPanel.style.flexDirection = 'column';
          this.p2pPanelContents.style.width = '100%';
          this.debugLog.style.width = '100%';
          this.debugLog.style.height = '130px';
          this.debugLog.style.borderLeft = 'none';
          this.debugLog.style.borderTop = '1px solid #444';
          this.debugLog.style.display = 'block';
        }
      } else {
        this.p2pPanel.style.width = '42px';
        this.p2pPanel.style.height = '42px';
        this.p2pPanel.style.borderRadius = '50%';
        this.p2pPanel.style.padding = '0';
        this.p2pPanel.style.background = 'rgba(20, 20, 20, 0.85)';
        this.p2pPanel.style.border = this.isVerified ? '2.5px solid #00e676' : '2.5px solid #ffa726';
        this.p2pPanelContents.style.display = 'none';
        this.debugLog.style.display = 'none';
        
        // Show trigger btn, hide close "✕" btn
        this.p2pTriggerBtn.style.display = 'flex';
        this.p2pTriggerBtn.textContent = 'P2P';
        this.p2pTriggerBtn.style.width = '100%';
        this.p2pTriggerBtn.style.height = '100%';
        this.p2pTriggerBtn.style.top = '0';
        this.p2pTriggerBtn.style.left = '0';
        this.p2pTriggerBtn.style.right = 'auto';
        
        this.p2pCloseBtn.style.display = 'none';
      }
    }

  _startViewInertia() {
      this._stopViewInertia();

      const friction = 0.95; // Smooth deceleration (loses 5% velocity per frame)
      let vx = this.viewVelocityX;
      let vy = this.viewVelocityY;

      const step = () => {
        vx *= friction;
        vy *= friction;

        // Halt simulation once velocity decays below threshold
        if (Math.hypot(vx, vy) < 0.1) {
          this.viewInertiaFrameId = null;
          if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify({
              type: 'dragEnd',
              mode: this.viewMode
            }));
          }
          return;
        }

        if (this.dataChannel && this.dataChannel.readyState === 'open') {
          this.dataChannel.send(JSON.stringify({
            type: 'drag',
            dx: vx,
            dy: vy,
            mode: this.viewMode
          }));
        }

        this.viewInertiaFrameId = requestAnimationFrame(step);
      };

      this.viewInertiaFrameId = requestAnimationFrame(step);
    }

  _stopViewInertia() {
      if (this.viewInertiaFrameId) {
        cancelAnimationFrame(this.viewInertiaFrameId);
        this.viewInertiaFrameId = null;
      }
    }

  _applyAppConfiguration(config) {
      this.appConfig = config;
      
      // Hide Pairing screen, show responsive trackpads
      if (this.connectionWelcome) {
        this.connectionWelcome.style.display = 'none';
      }
      if (this.trackpadView) {
        this.trackpadView.style.display = 'block';
      }
      if (this.trackpadControls) {
        this.trackpadControls.style.display = 'block';
      }

      // Automatically initialize parameters list based on config payload
      if (config.leftTrackpad && config.leftTrackpad.modes) {
        const keys = Object.keys(config.leftTrackpad.modes);
        if (keys.length > 0) this.viewMode = keys[0];
      }
      if (config.rightTrackpad && config.rightTrackpad.modes) {
        const keys = Object.keys(config.rightTrackpad.modes);
        if (keys.length > 0) this.controlMode = keys[0];
      }
      this.currentMode = this.viewMode;
      this._updateTrackpadLabels();
      this._log('Capabilities schema successfully updated.');
    }

  _startViewInertiaZ() {
      this._stopViewInertiaZ();

      const friction = 0.95;
      let vz = this.viewVelocityZ;

      const step = () => {
        vz *= friction;

        if (Math.abs(vz) < 0.1) {
          this.viewInertiaZFrameId = null;
          return;
        }

        if (this.dataChannel && this.dataChannel.readyState === 'open') {
          this.dataChannel.send(JSON.stringify({
            type: 'accudrawZ',
            dy: vz
          }));
        }

        this.viewInertiaZFrameId = requestAnimationFrame(step);
      };

      this.viewInertiaZFrameId = requestAnimationFrame(step);
    }

  _stopViewInertiaZ() {
      if (this.viewInertiaZFrameId) {
        cancelAnimationFrame(this.viewInertiaZFrameId);
        this.viewInertiaZFrameId = null;
      }
    }
}