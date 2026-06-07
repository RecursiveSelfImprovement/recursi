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
      const SIGNAL_BASE = window.location.origin + '/signal';
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

      try {
        await fetch(`${SIGNAL_BASE}/${hostTopic}`, { method: 'POST', body: '' });
        await fetch(`${SIGNAL_BASE}/${clientTopic}`, { method: 'POST', body: '' });
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

        fetch(`${SIGNAL_BASE}/${hostTopic}`, { method: 'POST', body: bakedOffer })
          .catch(e => console.warn('Offer post error:', e));

        this.hostBeaconInterval = setInterval(async () => {
          if (this.dataChannel && this.dataChannel.readyState === 'open' && this.isVerified) {
            clearInterval(this.hostBeaconInterval);
            return;
          }
          try {
            await fetch(`${SIGNAL_BASE}/${hostTopic}`, { method: 'POST', body: bakedOffer });
          } catch(err) {}
        }, 2000);

        this.hostPollInterval = setInterval(async () => {
          if (this.dataChannel && this.dataChannel.readyState === 'open' && this.isVerified) {
            clearInterval(this.hostPollInterval);
            return;
          }
          try {
            const res = await fetch(`${SIGNAL_BASE}/${clientTopic}`);
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
          } else if (payload.type === 'modeChange') {
            this.dispatch('highlightActiveControlBox', payload.mode === 'sliders' ? 'compass' : 'tool');
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
      roomInput.value = '7777';
      roomInput.style.cssText = 'width: 80px; padding: 4px; background: #222; border: 1px solid #555; color: #fff; border-radius: 3px; text-align: center;';

      roomRow.appendChild(roomLabel);
      roomRow.appendChild(roomInput);
      content.appendChild(roomRow);

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
          if (!this.app.midiMapper) {
            this.app.midiMapper = new MidiMapper(this.app.sidePanel.toolSettingsSection, this.app);
          }
          this.app.midiMapper.activate();
        } else {
          if (this.app.midiMapper) {
            this.app.midiMapper.deactivate();
          }
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
      diagLabel.style.fontSize = '11px';
      diagLabel.style.color = '#bbb';

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
  }