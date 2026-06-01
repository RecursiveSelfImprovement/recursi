class WebRTCSync {
  constructor(callbacks = {}) {
    this.peerConnection = null;
    this.dataChannel = null;
    this.isConnected = false;

    // Settings
    this.toleranceSeconds = 2.0;
    this.syncInterval = null;
    this.isHost = false;

    // Callbacks
    this.onConnected = callbacks.onConnected || (() => {});
    this.onDisconnected = callbacks.onDisconnected || (() => {});
    this.onSyncRequest = callbacks.onSyncRequest || (() => {}); // Fired when we need to pause to wait
    this.onSyncResume = callbacks.onSyncResume || (() => {}); // Fired when peer caught up
    this.getLocalTime =
      callbacks.getLocalTime || (() => ({ time: 0, isPlaying: false }));
    this.onPeerMessage = callbacks.onPeerMessage || (() => {});

    this.remoteState = { time: 0, isPlaying: false, lastUpdate: 0 };
    this.isWaitingForPeer = false;
  }

  initHost() {
    this.isHost = true;
    this._setupPeerConnection();

    this.dataChannel = this.peerConnection.createDataChannel('syncChannel', {
      reliable: false,
    });
    this._setupDataChannel();

    return this.peerConnection
      .createOffer()
      .then((offer) => this.peerConnection.setLocalDescription(offer))
      .then(() => JSON.stringify(this.peerConnection.localDescription));
  }

  acceptAnswer(answerJson) {
    try {
      const answer = JSON.parse(answerJson);
      return this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    } catch (e) {
      return Promise.reject(e);
    }
  }

  initGuest(offerJson) {
    this.isHost = false;
    this._setupPeerConnection();

    // Guest listens for the datachannel created by Host
    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this._setupDataChannel();
    };

    try {
      const offer = JSON.parse(offerJson);
      return this.peerConnection
        .setRemoteDescription(new RTCSessionDescription(offer))
        .then(() => this.peerConnection.createAnswer())
        .then((answer) => this.peerConnection.setLocalDescription(answer))
        .then(() => JSON.stringify(this.peerConnection.localDescription));
    } catch (e) {
      return Promise.reject(e);
    }
  }

  _setupPeerConnection() {
    // Using public STUN server to traverse simple NAT
    const configuration = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    };
    this.peerConnection = new RTCPeerConnection(configuration);

    // We could handle ICE candidates here, but for "copy paste" signaling,
    // we usually wait for ICE gathering to complete before returning the JSON.
    // For production, we'd use a websocket signaling server.
    // For this foundation, we assume the promise caller waits for gathering,
    // or we just rely on local network for the bare minimum test.
  }

  _setupDataChannel() {
    this.dataChannel.onopen = () => {
      console.log('[WebRTC] Data Channel Opened');
      this.isConnected = true;
      this.onConnected();
      this._startSyncLoop();
    };

    this.dataChannel.onclose = () => {
      console.log('[WebRTC] Data Channel Closed');
      this.isConnected = false;
      this._stopSyncLoop();
      this.onDisconnected();
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'sync') {
          this._handleRemoteSync(data);
        } else {
          this.onPeerMessage(data);
        }
      } catch (e) {}
    };
  }

  _startSyncLoop() {
    if (this.syncInterval) clearInterval(this.syncInterval);

    this.syncInterval = setInterval(() => {
      if (
        !this.isConnected ||
        !this.dataChannel ||
        this.dataChannel.readyState !== 'open'
      )
        return;

      const local = this.getLocalTime();

      // Broadcast our state
      this.dataChannel.send(
        JSON.stringify({
          type: 'sync',
          time: local.time,
          isPlaying: local.isPlaying,
          timestamp: Date.now(),
        })
      );

      // Check Tolerance if both are supposed to be playing
      this._evaluateTolerance(local);
    }, 500); // 2Hz broadcast
  }

  _stopSyncLoop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  _handleRemoteSync(data) {
    this.remoteState = {
      time: data.time,
      isPlaying: data.isPlaying,
      lastUpdate: Date.now(),
    };
  }

  _evaluateTolerance(local) {
    // If we haven't heard from them in 3 seconds, don't stall ourselves indefinitely
    if (Date.now() - this.remoteState.lastUpdate > 3000) {
      if (this.isWaitingForPeer) {
        this.isWaitingForPeer = false;
        this.onSyncResume(); // Assume they dropped, keep playing
      }
      return;
    }

    // Only enforce sync if WE are playing
    if (!local.isPlaying) return;

    // If they are paused, we don't necessarily pause unless they are far behind.
    // Actually, if it's a strict watch party, if one pauses, both pause.
    // For now, let's just stick to the requested Tolerance logic.

    // Calculate expected remote time based on latency since last update
    const timeSinceUpdate = (Date.now() - this.remoteState.lastUpdate) / 1000.0;
    const expectedRemoteTime = this.remoteState.isPlaying
      ? this.remoteState.time + timeSinceUpdate
      : this.remoteState.time;

    const delta = local.time - expectedRemoteTime;

    if (delta > this.toleranceSeconds) {
      // We are too far ahead! Pause.
      if (!this.isWaitingForPeer) {
        console.log(
          `[WebRTC] Peer is ${delta.toFixed(2)}s behind. Pausing to wait.`
        );
        this.isWaitingForPeer = true;
        this.onSyncRequest(true); // true = please pause and show UI
      }
    } else if (delta < this.toleranceSeconds * 0.5) {
      // They caught up
      if (this.isWaitingForPeer) {
        console.log(`[WebRTC] Peer caught up. Resuming.`);
        this.isWaitingForPeer = false;
        this.onSyncResume();
      }
    }
  }

  broadcast(data) {
    if (
      this.isConnected &&
      this.dataChannel &&
      this.dataChannel.readyState === 'open'
    ) {
      this.dataChannel.send(JSON.stringify(data));
    }
  }

}

