
class CoopManager {
  constructor(player) {
      this.player = player;
      this.webrtc = null;
      this._handshakeInterval = null;
      this._ignoreNextBroadcast = false;
      this._pendingIncomingCommands = [];
    }

  setupComms() {
    window.addEventListener('message', (e) => this.handleMessage(e));

    this.sendMessage('PLAYER_READY');
    this.sendSync();

    this._handshakeInterval = setInterval(() => {
      this.sendMessage('HANDSHAKE', {
        playlistHash: this.computePlaylistHash(),
      });
    }, 5000);
  }

  handleMessage(event) {
      if (!event.data || !event.data.type) return;
      const { type, ...payload } = event.data;

      // Defer processing if the initial playlist or playlistManager has not loaded yet
      if (!this.player._isPlaylistLoaded || !this.player.playlistManager) {
        if (!this._pendingIncomingCommands) this._pendingIncomingCommands = [];
        this._pendingIncomingCommands.push(event.data);
        console.log(`[Bridge] Deferring message type ${type} until playlist and playlistManager are fully loaded.`);
        return;
      }

      switch (type) {
        case 'ADD_VIDEO':
          this.handleRemoteAdd(payload);
          break;
        case 'PLAY_NOW':
          this.handleRemotePlay(payload);
          break;
        case 'FULL_SYNC_REQUEST':
          this.sendSync();
          break;
      }
    }

  handleRemoteAdd(payload) {
      this._handleIncomingVideo(payload);
    }

  handleRemotePlay(payload) {
      this._handleIncomingVideo(payload);
    }

  sendMessage(type, payload = {}) {
    const fullMessage = { type, ...payload };
    window.postMessage(fullMessage, '*');
  }

  sendSync() {
    if (!this.player.playlistManager) return;
    const list = this.player.playlistManager.playlist.map((v) => ({
      id: v.id,
      title: v.title,
      playOnce: !!v.playOnce,
    }));
    this.sendMessage('SYNC_PLAYLIST', { playlist: list });
  }

  computePlaylistHash() {
    if (!this.player.playlistManager || !this.player.playlistManager.playlist)
      return 0;
    const items = this.player.playlistManager.playlist.map(
      (item) => `${item.id}:${item.playOnce ? '1' : '0'}`
    );
    items.sort();
    const str = items.join(',');
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619) | 0;
    }
    return hash >>> 0;
  }

  async initWebRTCHost() {
    if (!this.webrtc) {
      this.webrtc = new WebRTCSync(this._getWebrtcOptions());
    }

    try {
      this.player.updateWebRTCStatus('Generating invite code...', '#aaa');
      const offer = await this.webrtc.initHost();
      await navigator.clipboard.writeText(offer);
      this.player.updateWebRTCStatus(
        'Invite code copied to clipboard! Send it to your friend.',
        '#4a90e2'
      );

      setTimeout(() => {
        const answer = prompt('Paste the answer code from your friend here:');
        if (answer) {
          this.webrtc.acceptAnswer(answer).catch((e) => {
            console.error(e);
            this.player.updateWebRTCStatus('Invalid answer code.', '#f55');
          });
        } else {
          this.player.updateWebRTCStatus('Connection cancelled.', '#888');
        }
      }, 500);
    } catch (e) {
      console.error(e);
      this.player.updateWebRTCStatus('Failed to host room.', '#f55');
    }
  }

  async initWebRTCGuest() {
    if (!this.webrtc) {
      this.webrtc = new WebRTCSync(this._getWebrtcOptions());
    }

    const offer = prompt('Paste the invite code from your friend:');
    if (!offer) return;

    try {
      this.player.updateWebRTCStatus('Connecting...', '#aaa');
      const answer = await this.webrtc.initGuest(offer);
      await navigator.clipboard.writeText(answer);
      this.player.updateWebRTCStatus(
        'Answer copied! Send it back to the host.',
        '#4a90e2'
      );
      alert('Answer code copied to clipboard. Send it back to the host!');
    } catch (e) {
      console.error(e);
      this.player.updateWebRTCStatus('Failed to join room.', '#f55');
    }
  }

  broadcastPeerMessage(data) {
    if (this._ignoreNextBroadcast) {
      this._ignoreNextBroadcast = false;
      return;
    }
    if (this.webrtc && this.webrtc.isConnected) {
      this.webrtc.broadcast(data);
    }
  }

  _getWebrtcOptions() {
    return {
      onConnected: () =>
        this.player.updateWebRTCStatus('Connected to peer!', '#4f4'),
      onDisconnected: () =>
        this.player.updateWebRTCStatus('Peer disconnected.', '#f55'),
      onSyncRequest: (pause) => {
        if (pause && this.player.gt?.videoPlayer)
          this.player.gt.videoPlayer.pause();
        this.player.updateWebRTCStatus(
          'Waiting for peer to catch up...',
          '#fa0'
        );
      },
      onSyncResume: () => {
        if (this.player.gt?.videoPlayer) this.player.gt.videoPlayer.play();
        this.player.updateWebRTCStatus('Connected and in sync.', '#4f4');
      },
      getLocalTime: () => {
        if (!this.player.gt?.videoPlayer) return { time: 0, isPlaying: false };
        return {
          time: this.player.gt.videoPlayer.getCurrentRawTime(),
          isPlaying: this.player.gt.videoPlayer.isPlaying(),
        };
      },
      onPeerMessage: (data) => {
        if (data.type === 'PLAY_VIDEO') {
          const item = data.item;
          if (
            this.player.currentPlayItem &&
            this.player.currentPlayItem.id === item.id
          ) {
            return; // Already playing this video
          }

          this._ignoreNextBroadcast = true; // Prevent reflection loop
          const idx = this.player.playlistManager.playlist.findIndex(
            (v) => v.id === item.id
          );

          if (idx !== -1) {
            this.player.playlistManager._triggerPlay(idx);
          } else {
            const newIdx = this.player.playlistManager.add(
              item.id,
              item.title,
              item.playOnce
            );
            this.player.playlistManager._triggerPlay(newIdx);
          }
          this.player.updateWebRTCStatus(
            `Peer changed video to: ${item.title}`,
            '#4a90e2'
          );
        }
      },
    };
  }

  sendSync() {
    if (!this.player.playlistManager) return;

    // CLEANUP: Host to Guest synchronization was leaving out crucial piano roll data resulting
    // in peers not seeing identical track settings and boundaries when switching videos.
    const list = this.player.playlistManager.playlist.map((v) => ({
      id: v.id,
      title: v.title,
      playOnce: !!v.playOnce,
      hasPianoRoll: !!v.hasPianoRoll,
      songSettings: v.songSettings || undefined,
      startTime: v.startTime,
      endTime: v.endTime,
    }));
    this.sendMessage('SYNC_PLAYLIST', { playlist: list });
  }


  flushPendingIncomingCommands() {
      if (this._pendingIncomingCommands && this._pendingIncomingCommands.length > 0) {
        console.log(`[Bridge] Flushing ${this._pendingIncomingCommands.length} deferred incoming commands.`);
        const cmds = this._pendingIncomingCommands;
        this._pendingIncomingCommands = [];
        cmds.forEach(cmd => {
          const { type, ...payload } = cmd;
          switch (type) {
            case 'ADD_VIDEO':
              this.handleRemoteAdd(payload);
              break;
            case 'PLAY_NOW':
              this.handleRemotePlay(payload);
              break;
            case 'FULL_SYNC_REQUEST':
              this.sendSync();
              break;
          }
        });
      }
    }

  _handleIncomingVideo(payload) {
      const vId = payload.videoId;
      if (!vId) return;
      const vTitle = payload.title || vId;

      console.log(`[Bridge] 📥 Incoming video request: "${vTitle}" (${vId})`);

      if (this.player.playlistManager) {
        let isPlaying = false;
        if (this.player.gt && this.player.gt.videoPlayer) {
          try {
            isPlaying = this.player.gt.videoPlayer.isPlaying();
          } catch (e) {
            isPlaying = false;
          }
        }

        if (!this.player.videoDialog || this.player.videoDialog.element.style.display === 'none') {
          isPlaying = false;
        }

        const forceTop = !isPlaying;

        const addedIndex = this.player.playlistManager.add(
          vId,
          vTitle,
          false,
          forceTop,
          payload.position
        );
        this.sendSync();

        this._pauseExternalVideos();

        if (!payload.title || payload.title === vId) {
          this.player.playlistManager._fetchVideoTitle(vId).then(fetchedTitle => {
            if (fetchedTitle) {
              const item = this.player.playlistManager.playlist.find(v => v.id === vId);
              if (item) {
                item.title = fetchedTitle;
                this.player.playlistManager.renderItems();
                this.sendSync();
              }
            }
          });
        }

        if (!this.player.leftPanel.isOpen) {
          this.player.leftPanel.open('playlist');
        } else {
          const sec = this.player.leftPanel.sections['playlist'];
          if (sec && !sec.element.open) sec.element.open = true;
        }
        this.player._updateDockUI();

        if (!this.player.videoDialog) {
          console.log('[Bridge] Player closed.');
          const forcePlay = (payload.type === 'PLAY_NOW' || payload.playNow);
          if (forcePlay || !isPlaying) {
            console.log('[Bridge] Auto-starting video.');
            this.player.playlistManager._triggerPlay(addedIndex);
            this.player.setStatus(`Bridge: Playing "${vTitle}"`, '#4f4');
          }
        } else {
          if (this.player.videoDialog.element.style.display === 'none') {
            this.player.videoDialog.element.style.display = 'flex';
          }
          this.player.videoDialog.setZOnTop();

          const forcePlay = (payload.type === 'PLAY_NOW' || payload.playNow);
          if (forcePlay || !isPlaying) {
            console.log(`[Bridge] Player Idle or forced. Auto-playing at index ${addedIndex}.`);
            this.player.playlistManager._triggerPlay(addedIndex);
            this.player.setStatus(`Bridge: Playing "${vTitle}"`, '#4f4');
          } else {
            console.log(`[Bridge] Player Busy. Queued next in the list.`);
            this.player.setStatus(`Bridge: Queued "${vTitle}" next`, '#4f4');
            this.player.playlistManager.scrollToIndex(addedIndex);
          }
        }

        // TRANSACTIONAL HANDSHAKE: Send immediate acknowledgment back up the pipeline
        if (payload.msgId) {
          this.sendMessage('APP_ACK', { msgId: payload.msgId });
        }
      }
    }

  _pauseExternalVideos() {
      try {
        const pauseInDoc = (doc) => {
          if (!doc) return;
          const videos = doc.querySelectorAll('video');
          videos.forEach(v => {
            if (v && !v.paused) {
              try {
                v.pause();
                console.log('[Bridge] Paused external playing video:', v);
              } catch (err) {
                console.error('[Bridge] Error pausing video:', err);
              }
            }
          });
        };

        pauseInDoc(document);

        if (window.top && window.top.document) {
          pauseInDoc(window.top.document);
        }

        if (window.parent && window.parent.document) {
          pauseInDoc(window.parent.document);
        }
      } catch (e) {
        console.warn('[Bridge] Could not pause some external videos due to cross-origin restrictions:', e);
      }
    }
}

