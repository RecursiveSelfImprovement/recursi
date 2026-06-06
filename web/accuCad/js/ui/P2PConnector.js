class P2PConnector {
    constructor(baseController) {
      this.baseController = baseController;
      this.peerConnection = null;
      this.dataChannel = null;
      this.dialog = null;
      this.hostBeaconInterval = null;
      this.hostPollInterval = null;
      this._hostConnecting = false;
    }

    showDialog() {
      if (this.dialog) {
        this.dialog.close();
        this.dialog = null;
      }

      const hostContainer = this.baseController?.domElement?.parentElement || document.body;
      const parentWidth = hostContainer.clientWidth || window.innerWidth;

      const content = document.createElement('div');
      content.style.padding = '12px';
      content.style.display = 'flex';
      content.style.flexDirection = 'column';
      content.style.gap = '10px';
      content.style.color = '#ddd';
      content.style.fontFamily = 'sans-serif';
      content.style.fontSize = '12px';

      // Room input
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

      // QR Code / Phone instructions
      const instructionDiv = document.createElement('div');
      instructionDiv.style.textAlign = 'center';
      instructionDiv.style.border = '1px solid #444';
      instructionDiv.style.padding = '8px';
      instructionDiv.style.borderRadius = '5px';
      instructionDiv.style.background = 'rgba(0,0,0,0.2)';

      const instText = document.createElement('div');
      instText.textContent = 'Scan QR code with phone camera:';
      instText.style.marginBottom = '6px';
      instText.style.fontSize = '11px';

      const touchUrl = window.location.origin + '/PeerToPeerRotation/touch.html';
      const qrImg = document.createElement('img');
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(touchUrl)}`;
      qrImg.style.width = '120px';
      qrImg.style.height = '120px';
      qrImg.style.display = 'block';
      qrImg.style.margin = '0 auto';
      qrImg.style.background = '#fff';
      qrImg.style.padding = '4px';
      qrImg.style.borderRadius = '4px';

      const urlText = document.createElement('div');
      urlText.style.fontSize = '9px';
      urlText.style.wordBreak = 'break-all';
      urlText.style.marginTop = '6px';
      urlText.style.color = '#88c';
      urlText.textContent = touchUrl;

      instructionDiv.appendChild(instText);
      instructionDiv.appendChild(qrImg);
      instructionDiv.appendChild(urlText);
      content.appendChild(instructionDiv);

      // Connect button
      const connectBtn = document.createElement('button');
      connectBtn.textContent = 'Start Host Sync';
      connectBtn.style.padding = '8px';
      connectBtn.style.background = '#00e676';
      connectBtn.style.color = '#000';
      connectBtn.style.border = 'none';
      connectBtn.style.borderRadius = '4px';
      connectBtn.style.fontWeight = 'bold';
      connectBtn.style.cursor = 'pointer';
      connectBtn.style.transition = 'all 0.15s';
      connectBtn.onmouseover = () => connectBtn.style.background = '#00c853';
      connectBtn.onmouseout = () => connectBtn.style.background = '#00e676';

      content.appendChild(connectBtn);

      // Status label
      const statusLabel = document.createElement('div');
      statusLabel.textContent = 'Status: Disconnected';
      statusLabel.style.textAlign = 'center';
      statusLabel.style.fontStyle = 'italic';
      statusLabel.style.color = '#aaa';
      content.appendChild(statusLabel);

      connectBtn.onclick = () => {
        const room = roomInput.value.trim();
        if (!room) {
          statusLabel.textContent = 'Enter room code.';
          return;
        }
        this.startWirelessHost(room, statusLabel);
      };

      // Manual Handshake section
      const manualToggle = document.createElement('div');
      manualToggle.textContent = 'Manual Handshake (Copy-Paste)';
      manualToggle.style.color = '#888';
      manualToggle.style.cursor = 'pointer';
      manualToggle.style.fontSize = '10px';
      manualToggle.style.textDecoration = 'underline';
      manualToggle.style.textAlign = 'center';
      manualToggle.style.marginTop = '6px';
      content.appendChild(manualToggle);

      const manualArea = document.createElement('div');
      manualArea.style.display = 'none';
      manualArea.style.flexDirection = 'column';
      manualArea.style.gap = '6px';
      manualArea.style.marginTop = '4px';

      const offerArea = document.createElement('textarea');
      offerArea.readOnly = true;
      offerArea.placeholder = 'Generating offer...';
      offerArea.style.width = '100%';
      offerArea.style.height = '45px';
      offerArea.style.background = '#111';
      offerArea.style.color = '#00e676';
      offerArea.style.fontFamily = 'monospace';
      offerArea.style.fontSize = '9px';
      offerArea.style.border = '1px solid #333';
      offerArea.style.borderRadius = '3px';
      offerArea.style.boxSizing = 'border-box';

      const copyOfferBtn = document.createElement('button');
      copyOfferBtn.textContent = 'Copy Offer';
      copyOfferBtn.style.padding = '4px';
      copyOfferBtn.style.background = '#333';
      copyOfferBtn.style.color = '#fff';
      copyOfferBtn.style.border = 'none';
      copyOfferBtn.style.borderRadius = '3px';
      copyOfferBtn.style.cursor = 'pointer';

      const answerArea = document.createElement('textarea');
      answerArea.placeholder = 'Paste Phone Answer here...';
      answerArea.style.width = '100%';
      answerArea.style.height = '45px';
      answerArea.style.background = '#111';
      answerArea.style.color = '#00ffff';
      answerArea.style.fontFamily = 'monospace';
      answerArea.style.fontSize = '9px';
      answerArea.style.border = '1px solid #333';
      answerArea.style.borderRadius = '3px';
      answerArea.style.boxSizing = 'border-box';

      const processAnswerBtn = document.createElement('button');
      processAnswerBtn.textContent = 'Process Answer';
      processAnswerBtn.style.padding = '4px';
      processAnswerBtn.style.background = '#00b0ff';
      processAnswerBtn.style.color = '#fff';
      processAnswerBtn.style.border = 'none';
      processAnswerBtn.style.borderRadius = '3px';
      processAnswerBtn.style.cursor = 'pointer';

      manualArea.appendChild(offerArea);
      manualArea.appendChild(copyOfferBtn);
      manualArea.appendChild(answerArea);
      manualArea.appendChild(processAnswerBtn);
      content.appendChild(manualArea);

      manualToggle.onclick = () => {
        if (manualArea.style.display === 'none') {
          manualArea.style.display = 'flex';
          manualToggle.textContent = 'Hide Manual Handshake';
          this.generateManualOffer(offerArea, statusLabel);
        } else {
          manualArea.style.display = 'none';
          manualToggle.textContent = 'Manual Handshake (Copy-Paste)';
        }
      };

      copyOfferBtn.onclick = () => {
        offerArea.select();
        document.execCommand('copy');
        statusLabel.textContent = 'Offer copied to clipboard.';
      };

      processAnswerBtn.onclick = () => {
        this.processManualAnswer(answerArea.value, statusLabel);
      };

      this.dialog = UITools.makeDialog({
        title: 'Phone Rotation Sync',
        width: '240px',
        height: 'auto',
        content: content,
        position: [parentWidth - 280, 240],
        transparent: true,
        appendTo: hostContainer,
        onClose: () => {
          this.dialog = null;
        }
      });
    }

    async startWirelessHost(roomCode, statusLabel) {
      const SIGNAL_BASE = window.location.origin + '/signal';

      if (this._hostConnecting) {
        statusLabel.textContent = 'Already connecting, please wait...';
        return;
      }
      this._hostConnecting = true;
      statusLabel.textContent = 'Initializing connection...';

      this.cleanupConnection();

      const hostTopic = `vibes-rotate-${roomCode}-host`;
      const clientTopic = `vibes-rotate-${roomCode}-client`;

      try {
        await fetch(`${SIGNAL_BASE}/${hostTopic}`, { method: 'POST', body: '' });
        await fetch(`${SIGNAL_BASE}/${clientTopic}`, { method: 'POST', body: '' });
      } catch(e) {}

      statusLabel.textContent = 'Cleared. Building offer...';
      await new Promise(r => setTimeout(r, 300));

      try {
        const pc = new RTCPeerConnection(this.getRTCConfig());
        this.peerConnection = pc;

        pc.oniceconnectionstatechange = () => {
          console.log('ICE:', pc.iceConnectionState);
          statusLabel.textContent = `ICE: ${pc.iceConnectionState.toUpperCase()}`;
          if (pc.iceConnectionState === 'failed') {
            statusLabel.textContent = 'ICE Failed.';
            this._hostConnecting = false;
          }
        };

        pc.onconnectionstatechange = () => {
          console.log('Conn:', pc.connectionState);
          statusLabel.textContent = `Conn: ${pc.connectionState.toUpperCase()}`;
          if (pc.connectionState === 'connected') {
            statusLabel.textContent = 'Linked Successfully!';
            statusLabel.style.color = '#00e676';
            this._hostConnecting = false;
          }
          if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            this._hostConnecting = false;
          }
        };

        const channel = pc.createDataChannel('ctrl');
        this.dataChannel = channel;
        this.setupDataChannelEvents(channel, statusLabel);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await this.waitForIceGathering(pc);

        const bakedOffer = encodeURIComponent(JSON.stringify({
          sdp: pc.localDescription
        }));

        statusLabel.textContent = 'Broadcasting host beacon...';

        fetch(`${SIGNAL_BASE}/${hostTopic}`, { method: 'POST', body: bakedOffer })
          .catch(e => console.warn('Offer post error:', e));

        this.hostBeaconInterval = setInterval(async () => {
          if (this.dataChannel && this.dataChannel.readyState === 'open') {
            clearInterval(this.hostBeaconInterval);
            return;
          }
          try {
            await fetch(`${SIGNAL_BASE}/${hostTopic}`, { method: 'POST', body: bakedOffer });
          } catch(err) {}
        }, 2000);

        this.hostPollInterval = setInterval(async () => {
          if (this.dataChannel && this.dataChannel.readyState === 'open') {
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
              await pc.setRemoteDescription(envelope.sdp);
              statusLabel.textContent = 'Answer received. Linking...';
              clearInterval(this.hostPollInterval);
            }
          } catch(err) {
            console.warn('Answer poll error:', err);
          }
        }, 1500);

      } catch(err) {
        statusLabel.textContent = 'Error: ' + err.message;
        this._hostConnecting = false;
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

    setupDataChannelEvents(channel, statusLabel) {
      channel.onopen = () => {
        statusLabel.textContent = 'Linked to phone successfully.';
        statusLabel.style.color = '#00e676';
      };
      channel.onclose = () => {
        statusLabel.textContent = 'Link closed.';
        statusLabel.style.color = '#ff8800';
      };
      channel.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === 'drag') {
            this.handleRemoteDrag(payload.dx, payload.dy, payload.mode);
          } else if (payload.type === 'zoom') {
            this.handleRemoteZoom(payload.ratio);
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

    cleanupConnection() {
      if (this.hostBeaconInterval) clearInterval(this.hostBeaconInterval);
      if (this.hostPollInterval) clearInterval(this.hostPollInterval);
      if (this.peerConnection) {
        try { this.peerConnection.close(); } catch(e) {}
        this.peerConnection = null;
      }
      this.dataChannel = null;
      this._hostConnecting = false;
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
  }