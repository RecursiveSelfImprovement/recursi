class TouchControllerV3 {
    constructor() {
      this.env = null;
      this.rootElement = null;
      this.svgEl = null;
      this.statusText = null;
      
      this.currentMode = 'rotate';
      
      this.isDragging = false;
      this.isPinching = false;
      this.lastTouchX = 0;
      this.lastTouchY = 0;
      this.lastPinchDist = 0;
      
      this.lastMouseX = 0;
      this.lastMouseY = 0;

      this.peerConnection = null;
      this.dataChannel = null;

      this.clientBeaconInterval = null;
      this.clientPollInterval = null;

      this.onTouchStartHandler = null;
      this.onTouchMoveHandler = null;
      this.onTouchEndHandler = null;
      this.onPointerDownHandler = null;
      this.onPointerMoveHandler = null;
      this.onPointerUpHandler = null;
      this.onResizeHandler = null;
    }

    async run(env) {
      this.env = env;
      const parentElement = env.container;

      applyCss(`
        html, body {
          margin: 0; padding: 0; width: 100%; height: 100%;
          overflow: hidden; background-color: #121212;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          user-select: none; touch-action: none;
        }
      `, 'touchcontroller-style-reset');

      parentElement.style.width = '100%';
      parentElement.style.height = '100%';
      parentElement.style.margin = '0';
      parentElement.style.padding = '0';
      parentElement.style.overflow = 'hidden';
      parentElement.style.background = '#121212';

      this.rootElement = makeElement('div', {
        id: 'touch-app-container',
        style: { width: '100%', height: '100%', position: 'relative', touchAction: 'none' }
      });
      parentElement.appendChild(this.rootElement);

      this._initSVG();
      this._initP2PUI();
      this._initModeSelector();
      this._initDebugLog();
      this._setupEvents();

      this._log('TouchController ready');

      return this;
    }

    _initSVG() {
      // Build SVG container as an absolute background layer
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.style.position = 'absolute';
      svg.style.top = '0';
      svg.style.left = '0';
      svg.style.zIndex = '1'; // Low-layer: beneath our controls
      svg.style.display = 'block';

      const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      gridGroup.setAttribute('opacity', '0.07');
      
      const horizontalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      horizontalLine.setAttribute('x1', '0');
      horizontalLine.setAttribute('y1', '50%');
      horizontalLine.setAttribute('x2', '100%');
      horizontalLine.setAttribute('y2', '50%');
      horizontalLine.setAttribute('stroke', '#ffffff');
      horizontalLine.setAttribute('stroke-width', '1.5');
      horizontalLine.setAttribute('stroke-dasharray', '4,4');

      const verticalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      verticalLine.setAttribute('x1', '50%');
      verticalLine.setAttribute('y1', '0');
      verticalLine.setAttribute('x2', '50%');
      verticalLine.setAttribute('y2', '100%');
      verticalLine.setAttribute('stroke', '#ffffff');
      verticalLine.setAttribute('stroke-width', '1.5');
      verticalLine.setAttribute('stroke-dasharray', '4,4');

      gridGroup.appendChild(horizontalLine);
      gridGroup.appendChild(verticalLine);
      svg.appendChild(gridGroup);

      this.rootElement.appendChild(svg);
      this.svgEl = svg;

      this.statusText = makeElement('div', {
        style: {
          position: 'absolute',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#666666',
          fontFamily: 'monospace',
          fontSize: '12px',
          pointerEvents: 'none',
          userSelect: 'none',
          textAlign: 'center',
          zIndex: '10'
        }
      }, 'Trackpad Ready. Drag to rotate, pinch to zoom.');
      this.rootElement.appendChild(this.statusText);
    }

    _initP2PUI() {
      const p2pPanel = makeElement('div', {
        style: {
          position: 'absolute',
          top: '20px',
          left: '20px',
          right: '20px',
          background: 'rgba(25, 25, 25, 0.85)',
          border: '1px solid #333',
          borderRadius: '8px',
          padding: '10px',
          color: '#ccc',
          fontSize: '12px',
          zIndex: '100',
          boxSizing: 'border-box'
        }
      });

      const header = makeElement('div', {
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
      });

      const title = makeElement('span', {
        style: { fontWeight: 'bold', color: '#00e676' }
      }, 'P2P Controller Sync');

      const statusSpan = makeElement('span', {
        style: { fontSize: '11px', color: '#888' }
      }, 'Offline');

      header.appendChild(title);
      header.appendChild(statusSpan);

      const syncRow = makeElement('div', {
        style: { display: 'flex', gap: '6px', marginTop: '8px' }
      });

      const roomInput = makeElement('input', {
        placeholder: 'Code',
        value: '7777',
        style: {
          width: '60px',
          padding: '5px',
          background: '#1a1a1a',
          border: '1px solid #444',
          color: '#fff',
          borderRadius: '4px',
          textAlign: 'center'
        }
      });

      const connectBtn = makeElement('button', {
        style: {
          flex: '1',
          padding: '5px',
          background: '#00e676',
          color: '#000',
          border: 'none',
          borderRadius: '4px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }
      }, 'Connect');

      syncRow.appendChild(roomInput);
      syncRow.appendChild(connectBtn);

      connectBtn.onclick = () => {
        const code = roomInput.value.trim();
        if (!code) return;
        this._startWirelessClient(code, statusSpan);
      };

      const manualToggle = makeElement('div', {
        style: { marginTop: '6px', color: '#888', cursor: 'pointer', fontSize: '10px', textDecoration: 'underline', textAlign: 'center' }
      }, 'Manual Handshake (Copy-Paste)');

      const manualArea = makeElement('div', {
        style: { display: 'none', marginTop: '6px' }
      });

      const offerArea = makeElement('textarea', {
        placeholder: 'Paste Host Offer...',
        style: { width: '100%', height: '40px', background: '#111', color: '#00e676', fontFamily: 'monospace', fontSize: '9px', boxSizing: 'border-box' }
      });

      const processBtn = makeElement('button', {
        style: { width: '100%', padding: '4px', marginTop: '4px', background: '#333', color: '#fff', border: 'none', borderRadius: '3px' }
      }, 'Process Offer');

      const answerArea = makeElement('textarea', {
        readOnly: true,
        placeholder: 'Answer...',
        style: { width: '100%', height: '40px', background: '#111', color: '#00ffff', fontFamily: 'monospace', fontSize: '9px', boxSizing: 'border-box', marginTop: '4px' }
      });

      manualToggle.onclick = () => {
        manualArea.style.display = manualArea.style.display === 'none' ? 'block' : 'none';
      };

      processBtn.onclick = () => {
        this._processManualOffer(offerArea.value, answerArea, statusSpan);
      };

      manualArea.appendChild(offerArea);
      manualArea.appendChild(processBtn);
      manualArea.appendChild(answerArea);

      p2pPanel.appendChild(header);
      p2pPanel.appendChild(syncRow);
      p2pPanel.appendChild(manualToggle);
      p2pPanel.appendChild(manualArea);

      this.rootElement.appendChild(p2pPanel);
    }

    _initModeSelector() {
      const bar = makeElement('div', {
        style: {
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          right: '20px',
          height: '46px',
          background: 'rgba(25, 25, 25, 0.9)',
          borderRadius: '23px',
          border: '1px solid #333',
          display: 'flex',
          padding: '3px',
          boxSizing: 'border-box',
          zIndex: '100'
        }
      });

      const modes = ['rotate', 'pan', 'paint'];
      this.modeButtons = {};

      modes.forEach((m) => {
        const btn = makeElement('button', {
          style: {
            flex: '1',
            border: 'none',
            background: m === this.currentMode ? '#00e676' : 'transparent',
            color: m === this.currentMode ? '#000' : '#888',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 'bold',
            textTransform: 'capitalize',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }
        }, m);

        btn.onclick = () => {
          this.currentMode = m;
          modes.forEach((otherMode) => {
            const active = otherMode === m;
            this.modeButtons[otherMode].style.background = active ? '#00e676' : 'transparent';
            this.modeButtons[otherMode].style.color = active ? '#000' : '#888';
          });
          if (this.statusText) {
            this.statusText.textContent = `Mode switched to: ${m.toUpperCase()}`;
          }
        };

        this.modeButtons[m] = btn;
        bar.appendChild(btn);
      });

      this.rootElement.appendChild(bar);
    }

    _setupEvents() {
      // CRITICAL FIX: Bind trackpad touch gestures STRICTLY to the background SVG layer
      const pad = this.svgEl; 

      this.onTouchStartHandler = (e) => this._onTouchStart(e);
      this.onTouchMoveHandler = (e) => this._onTouchMove(e);
      this.onTouchEndHandler = (e) => this._onTouchEnd(e);
      this.onResizeHandler = () => this._onResize();

      pad.addEventListener('touchstart', this.onTouchStartHandler, { passive: false });
      pad.addEventListener('touchmove', this.onTouchMoveHandler, { passive: false });
      pad.addEventListener('touchend', this.onTouchEndHandler, { passive: false });
      pad.addEventListener('touchcancel', this.onTouchEndHandler, { passive: false });

      this.onPointerDownHandler = (e) => this._onPointerDown(e);
      this.onPointerMoveHandler = (e) => this._onPointerMove(e);
      this.onPointerUpHandler = (e) => this._onPointerUp(e);

      pad.addEventListener('pointerdown', this.onPointerDownHandler);
      window.addEventListener('pointermove', this.onPointerMoveHandler);
      window.addEventListener('pointerup', this.onPointerUpHandler);

      window.addEventListener('resize', this.onResizeHandler);
    }

    _onTouchStart(e) {
      e.preventDefault();
      
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.lastTouchX = e.touches[0].clientX;
        this.lastTouchY = e.touches[0].clientY;
        this.isPinching = false;
        this.sendDragStart();
      } else if (e.touches.length === 2) {
        this.isDragging = false;
        this.isPinching = true;
        this.lastPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }

    _onTouchMove(e) {
      e.preventDefault();

      if (e.touches.length === 1 && this.isDragging) {
        const touch = e.touches[0];
        const dx = touch.clientX - this.lastTouchX;
        const dy = touch.clientY - this.lastTouchY;

        this.lastTouchX = touch.clientX;
        this.lastTouchY = touch.clientY;

        this.sendDrag(dx, dy);
      } else if (e.touches.length === 2 && this.isPinching) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (this.lastPinchDist > 0) {
          const ratio = dist / this.lastPinchDist;
          this.sendZoom(ratio);
        }
        this.lastPinchDist = dist;
      }
    }

    _onTouchEnd(e) {
      e.preventDefault();
      this.isDragging = false;
      this.isPinching = false;
      this.lastPinchDist = 0;
      this.sendDragRelease();
    }

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
      const SIGNAL_BASE = window.location.origin + '/signal';
      statusLabel.textContent = 'Searching for host...';
      this._log(`--- Connect attempt, room: ${roomCode} ---`);

      if (this.peerConnection) {
        try { this.peerConnection.close(); } catch(e) {}
        this.peerConnection = null;
      }
      if (this.clientBeaconInterval) clearInterval(this.clientBeaconInterval);
      if (this.clientPollInterval) clearInterval(this.clientPollInterval);

      try {
        const pc = new RTCPeerConnection(this._getRTCConfig());
        this.peerConnection = pc;

        pc.oniceconnectionstatechange = () => {
          this._log(`ICE: ${pc.iceConnectionState}`);
          statusLabel.textContent = `ICE: ${pc.iceConnectionState.toUpperCase()}`;
        };

        pc.onconnectionstatechange = () => {
          this._log(`Conn: ${pc.connectionState}`);
          statusLabel.textContent = `Conn: ${pc.connectionState.toUpperCase()}`;
          if (pc.connectionState === 'connected') {
            statusLabel.textContent = 'Connected!';
            statusLabel.style.color = '#00e676';
          }
          if (pc.connectionState === 'failed' || pc.connectionState === 'closed' || pc.connectionState === 'disconnected') {
            statusLabel.textContent = 'Lost connection. Tap Connect to retry.';
            statusLabel.style.color = '#ff8800';
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
            const res = await fetch(`${SIGNAL_BASE}/${hostTopic}`);
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

              await pc.setRemoteDescription(envelope.sdp);
              this._log('Remote desc set. Creating answer...');

              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              this._log('Local desc set. Waiting for ICE...');

              statusLabel.textContent = 'Assembling routes...';
              await this._waitForIceGathering(pc);
              this._log('ICE gathered. Sending answer...');

              const bakedAnswer = encodeURIComponent(JSON.stringify({
                sdp: pc.localDescription
              }));

              fetch(`${SIGNAL_BASE}/${clientTopic}`, { method: 'POST', body: bakedAnswer })
                .then(() => this._log('Answer posted'))
                .catch(e => this._log(`Answer post error: ${e.message}`));

              this.clientBeaconInterval = setInterval(async () => {
                if (this.dataChannel && this.dataChannel.readyState === 'open') {
                  clearInterval(this.clientBeaconInterval);
                  return;
                }
                try {
                  await fetch(`${SIGNAL_BASE}/${clientTopic}`, { method: 'POST', body: bakedAnswer });
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
        const checkState = () => {
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', checkState);
            resolve();
          }
        };
        pc.addEventListener('icegatheringstatechange', checkState);
        setTimeout(resolve, 8000);
      });
    }

    _setupDataChannelEvents(channel, statusLabel) {
      channel.onopen = () => {
        this._log('DATA CHANNEL OPEN - fully connected!');
        statusLabel.textContent = 'Connected';
        statusLabel.style.color = '#00e676';
      };
      channel.onclose = () => {
        this._log('Data channel closed');
        statusLabel.textContent = 'Offline';
        statusLabel.style.color = '#ff8800';
      };
    }

    _onResize() {}

    destroy() {
      if (this.clientBeaconInterval) clearInterval(this.clientBeaconInterval);
      if (this.clientPollInterval) clearInterval(this.clientPollInterval);

      // Clean event listeners from the SVG element
      const pad = this.svgEl;
      if (pad) {
        if (this.onTouchStartHandler) pad.removeEventListener('touchstart', this.onTouchStartHandler);
        if (this.onTouchMoveHandler) pad.removeEventListener('touchmove', this.onTouchMoveHandler);
        if (this.onTouchEndHandler) pad.removeEventListener('touchend', this.onTouchEndHandler);
        if (this.onPointerDownHandler) pad.removeEventListener('pointerdown', this.onPointerDownHandler);
      }
      if (this.onPointerMoveHandler) window.removeEventListener('pointermove', this.onPointerMoveHandler);
      if (this.onPointerUpHandler) window.removeEventListener('pointerup', this.onPointerUpHandler);
      if (this.onResizeHandler) window.removeEventListener('resize', this.onResizeHandler);

      if (this.rootElement && this.rootElement.parentElement) {
        this.rootElement.parentElement.removeChild(this.rootElement);
      }

      this.rootElement = null;
      this.svgEl = null;
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
}