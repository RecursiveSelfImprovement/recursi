class P2PConnector {
    constructor(receiver) {
      this.receiver = receiver; // The app delegate (baseController or DrawingApp instance)
      this.peerConnection = null;
      this.dataChannel = null;
      this.hostBeaconInterval = null;
      this.hostPollInterval = null;
      this._hostConnecting = false;

      this.handshakeInterval = null;
      this.heartbeatInterval = null;
      this.lastHeartbeatTime = 0;
      this.isVerified = false;
      this.roomCode = '';
      this.statusLabel = null;
      this.isHostMode = false;
    }

    async startWirelessHost(roomCode, statusLabel, isAutoRestart = false) {
      const SIGNAL_BASE = window.location.hostname.includes('recursi.dev') 
        ? 'https://recursi.dev/TouchController/signal.php' 
        : (window.location.origin + '/signal');
      this.roomCode = roomCode;
      this.statusLabel = statusLabel;
      this.isHostMode = true;

      if (!isAutoRestart) {
        this.connectionSessionId = Math.random().toString(36).substring(2, 9);
        this._hostConnecting = true;
        this.updateStatus('Initializing connection...', '#aaa');
      } else {
        this.updateStatus('Re-advertising host sync...', '#ffa726');
      }

      this.updateButtonState(true);
      this.cleanupConnection(true);

      const hostTopic = `vibes-rotate-${roomCode}-host`;
      const clientTopic = `vibes-rotate-${roomCode}-client`;

      // Added cache-busting timestamps prevent proxy and CDN caching
      try {
        await fetch(`${SIGNAL_BASE}/${hostTopic}?_=${Date.now()}`, { method: 'POST', body: '' });
        await fetch(`${SIGNAL_BASE}/${clientTopic}?_=${Date.now()}`, { method: 'POST', body: '' });
      } catch(e) {
        this.updateStatus('Signaling server offline. Retrying...', '#ff4444');
        this.handleConnectionFailure();
        return;
      }

      if (!isAutoRestart) {
        this.updateStatus('Cleared signaling. Building offer...', '#aaa');
      }
      await new Promise(r => setTimeout(r, 300));

      try {
        const pc = new RTCPeerConnection(this.getRTCConfig());
        this.peerConnection = pc;

        pc.oniceconnectionstatechange = () => {
          const s = pc.iceConnectionState.toLowerCase();
          this.updateStatus(`Routes: ${s}`, '#90a4ae');
          if (s === 'failed') {
            this.updateStatus('Routes failed. Reconnecting...', '#ff4444');
            this.handleConnectionFailure();
          }
        };

        pc.onconnectionstatechange = () => {
          const state = pc.connectionState.toLowerCase();
          if (state === 'failed' || state === 'closed' || state === 'disconnected') {
            this.handleConnectionFailure();
          } else if (state === 'connected') {
            if (!this.isVerified) {
              this.updateStatus('Transport established. Verifying...', '#0288d1');
            }
          }
        };

        const channel = pc.createDataChannel('ctrl');
        this.dataChannel = channel;
        this.setupDataChannelEvents(channel);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await this.waitForIceGathering(pc);

        const bakedOffer = encodeURIComponent(JSON.stringify({
          sdp: pc.localDescription,
          sid: this.connectionSessionId
        }));

        this.updateStatus('Broadcasting host offer...', '#90a4ae');

        // Added cache-busting timestamp
        fetch(`${SIGNAL_BASE}/${hostTopic}?_=${Date.now()}`, { method: 'POST', body: bakedOffer })
          .catch(e => console.warn('Offer post error:', e));

        this.hostBeaconInterval = setInterval(async () => {
          if (this.dataChannel && this.dataChannel.readyState === 'open' && this.isVerified) {
            clearInterval(this.hostBeaconInterval);
            return;
          }
          try {
            await fetch(`${SIGNAL_BASE}/${hostTopic}?_=${Date.now()}`, { method: 'POST', body: bakedOffer });
          } catch(err) {}
        }, 2000);

        this.hostPollInterval = setInterval(async () => {
          if (this.dataChannel && this.dataChannel.readyState === 'open' && this.isVerified) {
            clearInterval(this.hostPollInterval);
            return;
          }
          try {
            const res = await fetch(`${SIGNAL_BASE}/${clientTopic}?_=${Date.now()}`);
            const text = await res.text();
            if (!text || text.trim() === '') return;
            if (!pc.remoteDescription) {
              const envelope = JSON.parse(decodeURIComponent(text));
              if (!envelope.sdp) return;
              if (envelope.sid !== this.connectionSessionId) return;
              await pc.setRemoteDescription(envelope.sdp);
              this.updateStatus('Negotiating transport...', '#0288d1');
              clearInterval(this.hostPollInterval);
            }
          } catch(err) {
            console.warn('Answer poll error:', err);
          }
        }, 1500);

      } catch(err) {
        this.updateStatus('Setup error: ' + err.message, '#ff4444');
        this.handleConnectionFailure();
      }
    }

    waitForIceGathering(pc) {
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
          if (pc.iceGatheringState === 'complete') done();
        };
        pc.addEventListener('icegatheringstatechange', checkState);
        setTimeout(done, 1000);
      });
    }

    setupDataChannelEvents(channel) {
      channel.onopen = () => {
        this.updateStatus('Data channel open. Verifying...', '#0288d1');
        this.isVerified = false;
        this.lastHeartbeatTime = Date.now();
        this.logDiag('Data channel opened');
        if (this.isHostMode) {
          this.startHandshakeVerification(channel);
        }
      };

      channel.onclose = () => {
        this.updateStatus('Link closed.', '#ff8800');
        this.logDiag('Data channel closed');
        this.handleConnectionFailure();
      };

      channel.onerror = (err) => {
        console.warn('Data channel error:', err);
        this.logDiag(`Channel error: ${err.message || err}`);
        this.handleConnectionFailure();
      };

      channel.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          this.lastHeartbeatTime = Date.now();

          if (this.showDiagnosticsInline) {
            this.logDiag(`Received: ${payload.type}`);
          }

          if (payload.type === 'h-pong') {
            if (!this.isVerified) {
              this.isVerified = true;
              this.stopHandshakeVerification();
              this.updateStatus('Connected', '#00e676');
              this.logDiag('Handshake verified!');
              channel.send(JSON.stringify({ type: 'h-verified' }));
              
              // Immediately configure the client layout
              this.sendCapabilities();
              
              this.startHeartbeat(channel);
            }
          } else if (payload.type === 'ping') {
            channel.send(JSON.stringify({ type: 'pong' }));
          } else if (payload.type === 'drag') {
            this.dispatch('handleRemoteDrag', payload.dx, payload.dy, payload.mode);
          } else if (payload.type === 'zoom') {
            this.dispatch('handleRemoteZoom', payload.ratio);
          } else if (payload.type === 'perspective') {
            this.dispatch('handleRemotePerspective', payload.dy);
          } else if (payload.type === 'accudrawZ') {
            this.dispatch('handleRemoteAccudrawZ', payload.dy);
          } else if (payload.type === 'modeChange') {
            if (payload.mode === 'rotate' || payload.mode === 'pan') {
              // It is a View Mode Change! Present a subtle on-screen computer HUD notification
              if (typeof UITools !== 'undefined' && typeof UITools.showHUD === 'function') {
                const label = payload.mode === 'rotate' ? 'Rotate View' : 'Pan View';
                const icon = payload.mode === 'rotate' ? '🔄' : '🖐️';
                UITools.showHUD({
                  id: 'p2p-mode-hud',
                  html: `<div style="padding: 10px 20px; background: rgba(20, 20, 25, 0.95); border: 1.5px solid #00e676; border-radius: 30px; color: #fff; font-family: monospace; font-size: 13px; font-weight: bold; box-shadow: 0 4px 15px rgba(0,0,0,0.4); text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 8px;">
                          <span style="color: #00e676;">${icon}</span> Mode: ${label}
                         </div>`,
                  position: 'bottom',
                  autoClose: 1800
                });
              }
            } else {
              // It is a Control Panel Change! Translate payload accurately (sliders -> compass, tool -> tool)
              this.dispatch('highlightActiveControlBox', payload.mode);
            }
          } else if (payload.type === 'sliderSelect') {
            this.dispatch('selectSliderRelative', payload.change);
          } else if (payload.type === 'sliderDragStart') {
            this.dispatch('handleSliderDragStart', payload.mode);
          } else if (payload.type === 'sliderDragMove') {
            this.dispatch('handleSliderDragMove', payload.dy, payload.phoneHeight);
          } else if (payload.type === 'sliderDragEnd') {
            this.dispatch('handleSliderDragEnd');
          } else if (payload.type === 'sliderAdjustStart') {
            this.dispatch('startSliderAdjustment');
          } else if (payload.type === 'sliderAdjust') {
            this.dispatch('adjustSelectedSlider', payload.ratio);
          } else if (payload.type === 'sliderTap') {
            this.dispatch('handleSliderTap');
          }
        } catch (err) {
          console.error('Error handling remote message:', err);
        }
      };
    }

    dispatch(methodName, ...args) {
      // Self-healing, abstracted delegate dispatcher routing to active view controls or global managers
      if (this.receiver && typeof this.receiver[methodName] === 'function') {
        this.receiver[methodName](...args);
        return;
      }
      if (this.receiver && this.receiver.viewControls && typeof this.receiver.viewControls[methodName] === 'function') {
        this.receiver.viewControls[methodName](...args);
        return;
      }
      if (typeof ViewControlsManager !== 'undefined' && ViewControlsManager.instance && typeof ViewControlsManager.instance[methodName] === 'function') {
        ViewControlsManager.instance[methodName](...args);
        return;
      }
    }

    cleanupConnection(keepAdvertisingState = false) {
      if (this.hostBeaconInterval) clearInterval(this.hostBeaconInterval);
      if (this.hostPollInterval) clearInterval(this.hostPollInterval);
      if (this.handshakeInterval) clearInterval(this.handshakeInterval);
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);

      this.hostBeaconInterval = null;
      this.hostPollInterval = null;
      this.handshakeInterval = null;
      this.heartbeatInterval = null;

      if (this.peerConnection) {
        try { this.peerConnection.close(); } catch(e) {}
        this.peerConnection = null;
      }
      this.dataChannel = null;
      this.isVerified = false;
      this._hostConnecting = false;

      if (!keepAdvertisingState) {
        this.isHostMode = false;
        this.roomCode = '';
        this.updateButtonState(false);
      }
    }

    getRTCConfig() {
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

    destroy() {
      this.cleanupConnection();
    }

    updateStatus(text, color) {
      if (this.statusLabel) {
        this.statusLabel.textContent = `Status: ${text}`;
        if (color) this.statusLabel.style.color = color;
      }
    }

    startHandshakeVerification(channel) {
      if (this.handshakeInterval) clearInterval(this.handshakeInterval);
      this.handshakeInterval = setInterval(() => {
        if (channel && channel.readyState === 'open') {
          try {
            channel.send(JSON.stringify({ type: 'h-ping' }));
          } catch(e) {
            console.warn('Handshake ping failed:', e);
          }
        }
      }, 500);
    }

    stopHandshakeVerification() {
      if (this.handshakeInterval) clearInterval(this.handshakeInterval);
      this.handshakeInterval = null;
    }

    startHeartbeat(channel) {
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
      this.lastHeartbeatTime = Date.now();

      this.heartbeatInterval = setInterval(() => {
        if (!this.isVerified || !this.dataChannel || this.dataChannel.readyState !== 'open') {
          clearInterval(this.heartbeatInterval);
          return;
        }

        try {
          channel.send(JSON.stringify({ type: 'ping' }));
        } catch (e) {
          console.warn('Heartbeat failed:', e);
          this.handleConnectionFailure();
          return;
        }

        const silentTime = Date.now() - this.lastHeartbeatTime;
        if (silentTime > 7000) {
          console.warn('Connection silent. Restarting sync.');
          this.handleConnectionFailure();
        }
      }, 3000);
    }

    handleConnectionFailure() {
      if (this.isHostMode && this.roomCode && this.statusLabel) {
        this.updateStatus('Lost link. Restarting sync...', '#ffaa00');
        this.cleanupConnection(true);
        setTimeout(() => {
          if (this.isHostMode) {
            this.startWirelessHost(this.roomCode, this.statusLabel, true);
          }
        }, 1500);
      } else {
        this.updateStatus('Disconnected.', '#ff4444');
        this.cleanupConnection(false);
      }
    }

    updateButtonState(active) {
      if (!this.connectBtn) return;
      if (active) {
        this.connectBtn.textContent = 'Stop Sync';
        this.connectBtn.style.background = '#e53935';
        this.connectBtn.style.color = '#fff';
      } else {
        this.connectBtn.textContent = 'Start Host Sync';
        this.connectBtn.style.background = '#00e676';
        this.connectBtn.style.color = '#000';
      }
    }

    renderControls(container) {
      container.innerHTML = '';
      
      const content = document.createElement('div');
      content.style.cssText = 'padding: 12px; display: flex; flex-direction: column; gap: 10px; color: #ddd; font-family: sans-serif; font-size: 12px;';

      const roomRow = document.createElement('div');
      roomRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';

      const roomLabel = document.createElement('span');
      roomLabel.textContent = 'Room Code:';
      roomLabel.style.fontWeight = 'bold';

      const roomInput = document.createElement('input');
      roomInput.type = 'text';
      roomInput.value = this.roomCode || localStorage.getItem('drawing-app-p2p-room') || '7777';
      roomInput.style.cssText = 'width: 80px; padding: 4px; background: #222; border: 1px solid #555; color: #fff; border-radius: 3px; text-align: center;';

      roomRow.appendChild(roomLabel);
      roomRow.appendChild(roomInput);
      content.appendChild(roomRow);

      // Embedded QR Code White Card Container
      const qrBox = document.createElement('div');
      qrBox.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; background: #ffffff; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 8px 0;';
      
      const qrContainer = document.createElement('div');
      qrContainer.style.cssText = 'width: 140px; height: 140px; display: flex; align-items: center; justify-content: center; background: #ffffff; box-sizing: border-box; overflow: hidden; cursor: pointer;';
      qrContainer.title = 'Click to enlarge for scanning';
      qrBox.appendChild(qrContainer);

      // Click to open high-contrast, pure-white pop-up dialog
      qrContainer.onclick = (e) => {
        e.preventDefault();
        const room = roomInput.value.trim();
        if (!room) return;
        
        const pairURL = `https://recursi.dev/TouchController/index.html?room=${room}`;
        const activeEnv = this.receiver.env || this.receiver;

        const popup = UITools.makeDialog({
          env: activeEnv,
          title: 'Scan QR Code',
          size: [240, 240],
          position: [window.innerWidth / 2 - 120, window.innerHeight / 2 - 120],
        });

        if (popup && popup.element) {
          popup.element.style.setProperty('background-color', '#ffffff', 'important');
          popup.element.style.setProperty('border', '1px solid #cbd5e1', 'important');
          popup.element.style.setProperty('box-shadow', '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', 'important');
          popup.element.style.setProperty('border-radius', '10px', 'important');
        }

        if (popup && popup.headerElement) {
          popup.headerElement.style.setProperty('background', '#f8fafc', 'important');
          popup.headerElement.style.setProperty('border-bottom', '1px solid #cbd5e1', 'important');
          popup.headerElement.style.setProperty('color', '#1e293b', 'important');
          popup.headerElement.style.setProperty('border-radius', '10px 10px 0 0', 'important');
        }

        if (popup && popup.contentElement) {
          popup.contentElement.style.setProperty('background', '#ffffff', 'important');
          popup.contentElement.style.setProperty('display', 'flex', 'important');
          popup.contentElement.style.setProperty('align-items', 'center', 'important');
          popup.contentElement.style.setProperty('justify-content', 'center', 'important');
          popup.contentElement.style.setProperty('padding', '20px', 'important');
          popup.contentElement.style.setProperty('border-radius', '0 0 10px 10px', 'important');

          const popupQR = document.createElement('div');
          popupQR.style.cssText = 'width: 180px; height: 180px; display: flex; align-items: center; justify-content: center; background: #ffffff;';
          popup.contentElement.appendChild(popupQR);

          if (typeof QRCodeGenerator !== 'undefined') {
            QRCodeGenerator.drawSVG(pairURL, popupQR);
          }
        }
      };

      const qrLinkDisplay = document.createElement('div');
      qrLinkDisplay.style.cssText = 'font-size: 9px; color: #475569; text-align: center; margin-top: 8px; word-break: break-all; width: 100%; font-family: monospace; font-weight: bold;';
      qrBox.appendChild(qrLinkDisplay);
      content.appendChild(qrBox);

      const updateQRCanvas = () => {
        const room = roomInput.value.trim();
        if (!room) return;
        localStorage.setItem('drawing-app-p2p-room', room);
        
        const pairURL = `https://recursi.dev/TouchController/index.html?room=${room}`;
        qrLinkDisplay.textContent = `Pair Link: /?room=${room}`;
        
        if (typeof QRCodeGenerator !== 'undefined') {
          QRCodeGenerator.drawSVG(pairURL, qrContainer);
        } else {
          console.warn("QRCodeGenerator class not defined at runtime");
        }
      };

      roomInput.oninput = () => {
        updateQRCanvas();
        if (this.isHostMode) {
          const room = roomInput.value.trim();
          if (room) this.startWirelessHost(room, this.statusLabel, true);
        }
      };

      const connectBtn = document.createElement('button');
      connectBtn.style.cssText = 'padding: 8px; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; transition: all 0.15s;';
      this.connectBtn = connectBtn;
      content.appendChild(connectBtn);

      const statusLabel = document.createElement('div');
      statusLabel.style.cssText = 'text-align: center; font-style: italic; color: #aaa; height: 18px; line-height: 18px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
      this.statusLabel = statusLabel;
      content.appendChild(statusLabel);

      // Dedicated MIDI Controller option block inside the Controller panel
      const midiRow = document.createElement('div');
      midiRow.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-top: 6px; padding-top: 6px; border-top: 1px solid #444;';

      const midiCheckbox = document.createElement('input');
      midiCheckbox.type = 'checkbox';
      midiCheckbox.id = 'midi-controller-toggle-sidebar';
      midiCheckbox.style.cursor = 'pointer';
      const midiEnabled = localStorage.getItem('midi-controller-enabled') === 'true';
      midiCheckbox.checked = midiEnabled;

      const midiLabel = document.createElement('label');
      midiLabel.htmlFor = 'midi-controller-toggle-sidebar';
      midiLabel.textContent = 'Enable MIDI Controller';
      midiLabel.style.cssText = 'cursor: pointer; font-size: 11px; color: #bbb;';

      midiRow.appendChild(midiCheckbox);
      midiRow.appendChild(midiLabel);
      content.appendChild(midiRow);

      midiCheckbox.onchange = () => {
        const enabled = midiCheckbox.checked;
        localStorage.setItem('midi-controller-enabled', enabled ? 'true' : 'false');
        if (enabled) {
          if (!this.receiver.midiMapper) {
            this.receiver.midiMapper = new MidiMapper(this.receiver.sidePanel.toolSettingsSection, this.receiver);
          }
          this.receiver.midiMapper.activate();
        } else {
          if (this.receiver.midiMapper) {
            this.receiver.midiMapper.deactivate();
          }
        }

        // Dynamically hide/show MIDI assignment controls on all sliders reactively using centralized syncAllDisplay()
        if (typeof SliderControl !== 'undefined' && typeof SliderControl.syncAllDisplay === 'function') {
          SliderControl.syncAllDisplay();
        }
      };

      const diagRow = document.createElement('div');
      diagRow.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-top: 6px; padding-top: 6px; border-top: 1px solid #444;';

      const diagCheckbox = document.createElement('input');
      diagCheckbox.type = 'checkbox';
      diagCheckbox.id = 'p2p-diag-toggle-sidebar';
      diagCheckbox.style.cursor = 'pointer';
      diagCheckbox.checked = this.showDiagnosticsInline || false;
      
      const diagLabel = document.createElement('label');
      diagLabel.htmlFor = 'p2p-diag-toggle-sidebar';
      diagLabel.textContent = 'Show diagnostics';
      diagLabel.style.cssText = 'cursor: pointer; font-size: 11px; color: #bbb;';

      diagRow.appendChild(diagCheckbox);
      diagRow.appendChild(diagLabel);
      content.appendChild(diagRow);

      const diagContainer = document.createElement('div');
      diagContainer.id = 'p2p-diag-container-sidebar';
      diagContainer.style.cssText = `
        display: ${this.showDiagnosticsInline ? 'block' : 'none'};
        background: #090a0f; border: 1px solid #113311; border-radius: 4px; padding: 8px;
        font-family: monospace; font-size: 10px; color: #00ff66; line-height: 1.4;
        margin-top: 8px; width: 100%; box-sizing: border-box; height: 120px; overflow-y: auto;
      `;
      content.appendChild(diagContainer);

      diagCheckbox.onchange = () => {
        diagContainer.style.display = diagCheckbox.checked ? 'block' : 'none';
        this.showDiagnosticsInline = diagCheckbox.checked;
      };

      this.updateButtonState(false);

      connectBtn.onclick = () => {
        if (this.isHostMode || this._hostConnecting) {
          this.cleanupConnection(false);
          this.updateStatus('Stopped Host Sync.', '#ff4444');
          this.logDiag('Stopped host sync session');
        } else {
          const room = roomInput.value.trim();
          if (!room) {
            statusLabel.textContent = 'Enter room code.';
            return;
          }
          this.startWirelessHost(room, statusLabel);
        }
      };

      container.appendChild(content);
      
      // Paint the QR Canvas on load
      updateQRCanvas();

      // AUTO LAUNCH HOST SYNC ON RENDER (so both accuCad and DrawingApp start listening instantly)
      if (!this.isHostMode && !this._hostConnecting) {
        const room = roomInput.value.trim();
        if (room) {
          setTimeout(() => {
            if (!this.isHostMode && !this._hostConnecting) {
              this.startWirelessHost(room, this.statusLabel);
            }
          }, 100);
        }
      }
    }

    logDiag(text) {
      const container = document.getElementById('p2p-diag-container-sidebar');
      if (container) {
        const time = new Date().toLocaleTimeString();
        const line = document.createElement('div');
        line.style.cssText = 'border-bottom: 1px solid #112211; padding: 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
        line.textContent = `[${time}] ${text}`;
        container.appendChild(line);
        container.scrollTop = container.scrollHeight;
      }
    }
  
    

    static drawQRCodeOnCanvas(text, canvas, size = 150) {
      try {
        const matrix = this._generateQRMatrix(text);
        const ctx = canvas.getContext('2d');
        const N = matrix.length;
        const scale = Math.floor(size / N);
        const pad = Math.floor((size - (scale * N)) / 2);
        
        canvas.width = size;
        canvas.height = size;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        
        ctx.fillStyle = '#000000';
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            if (matrix[r][c]) {
              ctx.fillRect(pad + c * scale, pad + r * scale, scale, scale);
            }
          }
        }
      } catch (err) {
        console.error("QR drawing failed offline:", err);
      }
    }

    sendCapabilities() {
      if (!this.dataChannel || this.dataChannel.readyState !== 'open') return;
      
      let config = null;
      if (this.receiver && typeof this.receiver.getP2PCapabilities === 'function') {
        config = this.receiver.getP2PCapabilities();
      } else {
        // Fallback default capabilities
        config = {
          leftTrackpad: {
            title: "Navigation",
            modes: {
              pan: { label: "Pan & Zoom", type: "drag_pinch" },
              rotate: { label: "Rotate Model", type: "drag" }
            }
          },
          rightTrackpad: {
            title: "Transform Settings",
            modes: {
              sliders: { label: "Sliders", type: "sliders" }
            }
          }
        };
      }

      this.dataChannel.send(JSON.stringify({
        type: 'configure',
        config: config
      }));
      this.logDiag('Handshake: Transmitted capabilities schema to client');
    }

  static async drawQRCodeSVG(text, container) {
      try {
        if (typeof QRCodeGenerator !== 'undefined' && typeof QRCodeGenerator.drawSVG === 'function') {
          await QRCodeGenerator.drawSVG(text, container);
        } else {
          container.innerHTML = '<div style="color: #ff5555; font-size: 11px;">QRCodeGenerator not available</div>';
        }
      } catch (err) {
        console.error("QR drawing failed:", err);
      }
    }

  static async downloadQRAsPNG(text, filename = 'qr_code.png') {
      try {
        const canvas = document.createElement('canvas');
        const size = 300;
        
        if (typeof QRCodeGenerator !== 'undefined') {
          await QRCodeGenerator.draw(text, canvas, size);
          
          const link = document.createElement('a');
          link.download = filename;
          link.href = canvas.toDataURL('image/png');
          link.click();
        } else {
          console.error("QRCodeGenerator not initialized.");
        }
      } catch (err) {
        console.error("Failed to export QR code as PNG:", err);
      }
    }
}