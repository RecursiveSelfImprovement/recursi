class P2PConnector {
    constructor(baseController) {
      this.baseController = baseController;
      this.peerConnection = null;
      this.dataChannel = null;
      this.dialog = null;
      this.hostBeaconInterval = null;
      this.hostPollInterval = null;
      this._hostConnecting = false;

      // Verification & Keep-alive properties
      this.handshakeInterval = null;
      this.heartbeatInterval = null;
      this.lastHeartbeatTime = 0;
      this.isVerified = false;
      this.roomCode = '';
      this.statusLabel = null;
      this.isHostMode = false;
    }

    showDialog() {
      if (this.baseController?.sidePanel) {
        this.baseController.sidePanel.toggle(true);
        const p2pSec = this.baseController.sidePanel.element.querySelector('details:nth-child(3)');
        if (p2pSec) p2pSec.open = true;
      }
    }

    async startWirelessHost(roomCode, statusLabel, isAutoRestart = false) {
      const SIGNAL_BASE = window.location.origin + '/signal';
      this.roomCode = roomCode;
      this.statusLabel = statusLabel;
      this.isHostMode = true;

      // Unique session generation prevents processing stale offers/answers from previous sessions
      if (!isAutoRestart) {
        this.connectionSessionId = Math.random().toString(36).substring(2, 9);
      }

      const mapState = (state) => {
        const s = state.toLowerCase();
        if (s === 'connected' || s === 'completed') return 'Active';
        if (s === 'checking') return 'Analyzing routes';
        if (s === 'disconnected') return 'Disconnected';
        if (s === 'failed') return 'Failed';
        return s;
      };

      if (!isAutoRestart) {
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
        this.updateStatus('Signaling server offline. Retrying soon...', '#ff4444');
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
          this.updateStatus(`[v3.2] Routes: ${mapState(pc.iceConnectionState)}`, '#90a4ae');
          if (pc.iceConnectionState === 'failed') {
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
              this.updateStatus('Transport established. Verifying datachannel...', '#0288d1');
            }
          } else {
            this.updateStatus(`Transport: ${state === 'checking' ? 'Establishing' : state}`, '#90a4ae');
          }
        };

        const channel = pc.createDataChannel('ctrl');
        this.dataChannel = channel;
        this.setupDataChannelEvents(channel, statusLabel);

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
              if (envelope.sid !== this.connectionSessionId) {
                return;
              }
              await pc.setRemoteDescription(envelope.sdp);
              this.updateStatus('Answer received. Negotiating transport...', '#0288d1');
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

    async generateManualOffer(offerTextArea, statusLabel) {
      this.cleanupConnection();
      statusLabel.textContent = 'Preparing Manual Handshake...';
      
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        this.peerConnection = pc;

        const channel = pc.createDataChannel('ctrl');
        this.dataChannel = channel;
        this.setupDataChannelEvents(channel, statusLabel);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await this.waitForIceGathering(pc);

        const bakedOffer = btoa(JSON.stringify(pc.localDescription));
        offerTextArea.value = bakedOffer;
        statusLabel.textContent = 'Copy Offer and paste into the phone app.';
      } catch (err) {
        statusLabel.textContent = 'Manual Init Error: ' + err.message;
      }
    }

    async processManualAnswer(answerBase64, statusLabel) {
      if (!this.peerConnection) {
        statusLabel.textContent = 'Generate an offer first.';
        return;
      }
      try {
        const answerDesc = JSON.parse(atob(answerBase64.trim()));
        await this.peerConnection.setRemoteDescription(answerDesc);
        statusLabel.textContent = 'Processing completed.';
      } catch (err) {
        statusLabel.textContent = 'Error parsing Answer: ' + err.message;
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
          if (pc.iceGatheringState === 'complete') {
            done();
          }
        };
        pc.addEventListener('icegatheringstatechange', checkState);
        // LAN & STUN host candidates gather instantly. Limit waiting to 1000ms.
        setTimeout(done, 1000);
      });
    }

    setupDataChannelEvents(channel, statusLabel) {
      channel.onopen = () => {
        this.updateStatus('[v3.2] Data channel open. Verifying handshake...', '#0288d1');
        this.isVerified = false;
        this.lastHeartbeatTime = Date.now();
        this.logDiag('Data channel opened');
        if (this.isHostMode) {
          this.startHandshakeVerification(channel);
        }
      };

      channel.onclose = () => {
        this.updateStatus('[v3.2] Link closed.', '#ff8800');
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

          // Verbose [P2P Link Rx] console log spam completely removed to clean up the browser console logs as requested

          if (this.showDiagnosticsInline) {
            this.logDiag(`Received: ${payload.type}`);
          }

          if (payload.type === 'h-pong') {
            if (!this.isVerified) {
              this.isVerified = true;
              this.stopHandshakeVerification();
              this.updateStatus('Connected', '#00e676');
              this.logDiag('Handshake verified successfully!');
              channel.send(JSON.stringify({ type: 'h-verified' }));
              this.startHeartbeat(channel);
            }
          } else if (payload.type === 'ping') {
            channel.send(JSON.stringify({ type: 'pong' }));
          } else if (payload.type === 'pong') {
            // Heartbeat update
          } else if (payload.type === 'drag') {
            this.handleRemoteDrag(payload.dx, payload.dy, payload.mode);
          } else if (payload.type === 'zoom') {
            this.handleRemoteZoom(payload.ratio);
          } else if (payload.type === 'perspective') {
            this.handleRemotePerspective(payload.dy);
          } else if (payload.type === 'modeChange') {
            this.handleRemoteModeChange(payload.mode);
          } else if (payload.type === 'sliderSelect') {
            this.handleRemoteSliderSelect(payload.change);
          } else if (payload.type === 'sliderDragStart') {
            this.handleRemoteSliderDragStart(payload.mode);
          } else if (payload.type === 'sliderDragMove') {
            this.handleRemoteSliderDragMove(payload.dy, payload.phoneHeight);
          } else if (payload.type === 'sliderDragEnd') {
            this.handleRemoteSliderDragEnd();
          } else if (payload.type === 'sliderAdjustStart') {
            this.handleRemoteSliderAdjustStart();
          } else if (payload.type === 'sliderAdjust') {
            this.handleRemoteSliderAdjust(payload.ratio);
          }
        } catch (err) {
          console.error('Error handling remote message:', err);
        }
      };
    }

    handleRemoteDrag(dx, dy, mode) {
      const camera = this.baseController.view.camera;
      if (mode === 'rotate') {
        const sensitivity = 0.5;
        TransformView.transform({
          spin: dx * sensitivity,
          tilt: -dy * sensitivity
        }, this.baseController.view);
      } else if (mode === 'pan') {
        const vX = new THREE.Vector3();
        const vY = new THREE.Vector3();
        camera.matrix.extractBasis(vX, vY, new THREE.Vector3());

        const distance = camera.position.distanceTo(this.baseController.view.target);
        const panSpeed = 0.003 * (distance / 3);
        const translation = new THREE.Vector3()
          .addScaledVector(vX, -dx * panSpeed)
          .addScaledVector(vY, dy * panSpeed);

        const tx = (translation.x * 300) / distance;
        const ty = (translation.y * 300) / distance;
        const tz = (translation.z * 300) / distance;

        TransformView.transform({ dx: tx, dy: ty, dz: tz }, this.baseController.view);
      }
    }

    handleRemoteZoom(ratio) {
      const factor = 1 / ratio;
      let ddiag;
      if (factor > 1) {
        ddiag = (factor - 1) * 100;
      } else {
        ddiag = (1 - 1 / factor) * 100;
      }
      ddiag = Math.max(-50, Math.min(50, ddiag));
      TransformView.transform({ ddiag }, this.baseController.view);
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
      if (this.dialog) {
        this.dialog.close();
        this.dialog = null;
      }
    }
  
  updateStatus(text, color) {
      if (this.statusLabel) {
        this.statusLabel.textContent = `Status: ${text}`;
        if (color) this.statusLabel.style.color = color;
      }
      console.log(`[P2PConnector v3.2] Status: ${text}`);
    }

  startHandshakeVerification(channel) {
      if (this.handshakeInterval) clearInterval(this.handshakeInterval);
      this.handshakeInterval = setInterval(() => {
        if (channel && channel.readyState === 'open') {
          try {
            channel.send(JSON.stringify({ type: 'h-ping' }));
          } catch(e) {
            console.warn('Handshake ping send failed:', e);
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
          console.warn('Failed to send heartbeat ping:', e);
          this.handleConnectionFailure();
          return;
        }

        const silentTime = Date.now() - this.lastHeartbeatTime;
        if (silentTime > 7000) {
          console.warn(`Connection silent for ${silentTime}ms. Triggering reconnect.`);
          this.handleConnectionFailure();
        }
      }, 3000);
    }

  handleConnectionFailure() {
      if (this.isHostMode && this.roomCode && this.statusLabel) {
        this.updateStatus('[v3.2] Connection lost. Auto-restarting host sync...', '#ffaa00');
        this.cleanupConnection(true);
        setTimeout(() => {
          if (this.isHostMode) {
            this.startWirelessHost(this.roomCode, this.statusLabel, true);
          }
        }, 1500);
      } else {
        this.updateStatus('[v3.2] Disconnected.', '#ff4444');
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

  handleRemotePerspective(dy) {
      const view = this.baseController.view;
      if (view && view.camera) {
        const sensitivity = 0.15;
        TransformView.transform({ dfov: dy * sensitivity }, view)
          .then((finalValues) => {
            if (window.tableDialog) {
              window.tableDialog.updateValues({
                perspective: finalValues.fov
              });
            }
          })
          .catch((err) => console.error(err));
      }
    }

  handleRemoteModeChange(mode) {
      let toast = document.getElementById('p2p-mode-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'p2p-mode-toast';
        toast.style.cssText = 'position: absolute; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.85); color: #00e676; border: 2px solid #00e676; border-radius: 8px; padding: 12px 24px; font-family: sans-serif; font-weight: bold; font-size: 18px; z-index: 999999; pointer-events: none; transition: opacity 0.3s ease, transform 0.3s ease; box-shadow: 0 4px 15px rgba(0,230,118,0.4); text-transform: uppercase; letter-spacing: 1px;';
        document.body.appendChild(toast);
      }
      toast.textContent = `Mode: ${mode === 'sliders' ? 'Compass' : mode === 'tool' ? 'Tool Settings' : mode}`;
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) scale(1)';
      clearTimeout(toast.timeoutId);
      toast.timeoutId = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) scale(0.9)';
      }, 1500);

      // Instruct the view controller to immediately switch highlighting and output the console logs
      if (typeof ViewControlsManager !== 'undefined' && ViewControlsManager.instance) {
        ViewControlsManager.instance.highlightActiveControlBox(mode === 'sliders' ? 'sliders' : 'tool');
      }
    }

  handleRemoteSliderSelect(change) {
      if (typeof ViewControlsManager !== 'undefined' && ViewControlsManager.instance) {
        ViewControlsManager.instance.selectSliderRelative(change);
      }
    }

  handleRemoteSliderAdjust(ratio) {
      if (typeof ViewControlsManager !== 'undefined' && ViewControlsManager.instance) {
        ViewControlsManager.instance.adjustSelectedSlider(ratio);
      }
    }

  handleRemoteSliderAdjustStart() {
      if (typeof ViewControlsManager !== 'undefined' && ViewControlsManager.instance) {
        ViewControlsManager.instance.startSliderAdjustment();
      }
    }

  renderControls(container) {
      container.innerHTML = '';
      
      const content = document.createElement('div');
      content.style.padding = '12px';
      content.style.display = 'flex';
      content.style.flexDirection = 'column';
      content.style.gap = '10px';
      content.style.color = '#ddd';
      content.style.fontFamily = 'sans-serif';
      content.style.fontSize = '12px';

      const roomRow = document.createElement('div');
      roomRow.style.display = 'flex';
      roomRow.style.justifyContent = 'space-between';
      roomRow.style.alignItems = 'center';

      const roomLabel = document.createElement('span');
      roomLabel.textContent = 'Room Code:';
      roomLabel.style.fontWeight = 'bold';

      const roomInput = document.createElement('input');
      roomInput.type = 'text';
      roomInput.value = '7777';
      roomInput.style.width = '80px';
      roomInput.style.padding = '4px';
      roomInput.style.background = '#222';
      roomInput.style.border = '1px solid #555';
      roomInput.style.color = '#fff';
      roomInput.style.borderRadius = '3px';
      roomInput.style.textAlign = 'center';

      roomRow.appendChild(roomLabel);
      roomRow.appendChild(roomInput);
      content.appendChild(roomRow);

      const connectBtn = document.createElement('button');
      connectBtn.style.padding = '8px';
      connectBtn.style.border = 'none';
      connectBtn.style.borderRadius = '4px';
      connectBtn.style.fontWeight = 'bold';
      connectBtn.style.cursor = 'pointer';
      connectBtn.style.transition = 'all 0.15s';
      this.connectBtn = connectBtn;
      content.appendChild(connectBtn);

      const statusLabel = document.createElement('div');
      statusLabel.style.textAlign = 'center';
      statusLabel.style.fontStyle = 'italic';
      statusLabel.style.color = '#aaa';
      // Restrict status label properties to fully lock height and eliminate layout twitching
      statusLabel.style.height = '18px';
      statusLabel.style.lineHeight = '18px';
      statusLabel.style.overflow = 'hidden';
      statusLabel.style.textOverflow = 'ellipsis';
      statusLabel.style.whiteSpace = 'nowrap';
      this.statusLabel = statusLabel;
      content.appendChild(statusLabel);

      // Dedicated MIDI Controller option block inside the Controller panel
      const midiRow = document.createElement('div');
      midiRow.style.display = 'flex';
      midiRow.style.alignItems = 'center';
      midiRow.style.gap = '8px';
      midiRow.style.marginTop = '6px';
      midiRow.style.paddingTop = '6px';
      midiRow.style.borderTop = '1px solid #444';

      const midiCheckbox = document.createElement('input');
      midiCheckbox.type = 'checkbox';
      midiCheckbox.id = 'midi-controller-toggle';
      midiCheckbox.style.cursor = 'pointer';
      const midiEnabled = localStorage.getItem('midi-controller-enabled') === 'true';
      midiCheckbox.checked = midiEnabled;

      const midiLabel = document.createElement('label');
      midiLabel.htmlFor = 'midi-controller-toggle';
      midiLabel.textContent = 'Enable MIDI Controller';
      midiLabel.style.cursor = 'pointer';
      midiLabel.style.fontSize = '11px';
      midiLabel.style.color = '#bbb';

      midiRow.appendChild(midiCheckbox);
      midiRow.appendChild(midiLabel);
      content.appendChild(midiRow);

      midiCheckbox.onchange = () => {
        const enabled = midiCheckbox.checked;
        localStorage.setItem('midi-controller-enabled', enabled ? 'true' : 'false');
        if (enabled) {
          if (typeof MidiInputHandler !== 'undefined' && typeof MidiInputHandler.init === 'function') {
            MidiInputHandler.init((status) => console.log('MIDI Status:', status));
          }
          if (typeof SliderControl !== 'undefined') {
            SliderControl.allSliders.forEach(slider => {
              if (slider.midiBox) slider.midiBox.style.display = 'block';
            });
          }
        } else {
          if (typeof SliderControl !== 'undefined') {
            SliderControl.allSliders.forEach(slider => {
              if (slider.midiBox) slider.midiBox.style.display = 'none';
            });
          }
        }
      };

      const diagRow = document.createElement('div');
      diagRow.style.display = 'flex';
      diagRow.style.alignItems = 'center';
      diagRow.style.gap = '8px';
      diagRow.style.marginTop = '6px';
      diagRow.style.paddingTop = '6px';
      diagRow.style.borderTop = '1px solid #444';

      const diagCheckbox = document.createElement('input');
      diagCheckbox.type = 'checkbox';
      diagCheckbox.id = 'p2p-diag-toggle-sidebar';
      diagCheckbox.style.cursor = 'pointer';
      diagCheckbox.checked = this.showDiagnosticsInline || false;
      
      const diagLabel = document.createElement('label');
      diagLabel.htmlFor = 'p2p-diag-toggle-sidebar';
      // Omit redundant "inline" text as requested
      diagLabel.textContent = 'Show diagnostics';
      diagLabel.style.cursor = 'pointer';
      diagLabel.style.fontSize = '11px';
      diagLabel.style.color = '#bbb';

      diagRow.appendChild(diagCheckbox);
      diagRow.appendChild(diagLabel);
      content.appendChild(diagRow);

      const diagContainer = document.createElement('div');
      diagContainer.id = 'p2p-diag-container-sidebar';
      diagContainer.style.display = this.showDiagnosticsInline ? 'block' : 'none';
      diagContainer.style.background = '#090a0f';
      diagContainer.style.border = '1px solid #113311';
      diagContainer.style.borderRadius = '4px';
      diagContainer.style.padding = '8px';
      diagContainer.style.fontFamily = 'monospace';
      diagContainer.style.fontSize = '10px';
      diagContainer.style.color = '#00ff66';
      diagContainer.style.lineHeight = '1.4';
      diagContainer.style.marginTop = '8px';
      diagContainer.style.width = '100%';
      diagContainer.style.boxSizing = 'border-box';
      diagContainer.style.height = '120px';
      diagContainer.style.minHeight = '120px';
      diagContainer.style.maxHeight = '120px';
      diagContainer.style.overflowY = 'auto';
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
        line.style.borderBottom = '1px solid #112211';
        line.style.padding = '2px 0';
        line.style.whiteSpace = 'nowrap';
        line.style.overflow = 'hidden';
        line.style.textOverflow = 'ellipsis';
        line.textContent = `[${time}] ${text}`;
        container.appendChild(line);
        container.scrollTop = container.scrollHeight;
      }
    }

  handleRemoteSliderDragStart(mode) {
      if (typeof ViewControlsManager !== 'undefined' && ViewControlsManager.instance) {
        ViewControlsManager.instance.handleSliderDragStart(mode);
      }
    }

  handleRemoteSliderDragMove(dy, phoneHeight) {
      if (typeof ViewControlsManager !== 'undefined' && ViewControlsManager.instance) {
        ViewControlsManager.instance.handleSliderDragMove(dy, phoneHeight);
      }
    }

  handleRemoteSliderDragEnd() {
      if (typeof ViewControlsManager !== 'undefined' && ViewControlsManager.instance) {
        ViewControlsManager.instance.handleSliderDragEnd();
      }
    }
}