
class FileIOManager {
  
  
  constructor(player) {
    this.player = player;
  }

  importVEQ() {
    const input = makeElement('input', {
      type: 'file',
      accept: '.txt',
      style: 'display:none',
    });
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = VideoEventQueue.parse(text);
        if (parsed && parsed.timedEvents) {
          VideoEventQueue.load(parsed);

          if (this.player.gt) {
            this.player.gt.originalVeqData = parsed;
            this.player.gt.fileTranspose = parsed.metadata?.transpose || 0;
            this.player.gt.userTranspose = 0;

            if (this.player.gt.instruments) {
              this.player.gt.instruments.stopAllNotes();
              this.player.gt.instruments.restoreTrackState([
                { instrument: 'Piano', volume: 5.0, octaveShift: 0 },
                { instrument: 'Vibes', volume: 5.0, octaveShift: 0 },
              ]);
              if (this.player.leftPanelUI) {
                this.player.leftPanelUI.refreshAudioUI();
              }
            }

            this.player.gt.setTranspose(0);

            if (this.player.gt.pianoVisuals) {
              this.player.gt.pianoVisuals.show();
              if (this.player.gt.videoPlayer) {
                const t = this.player.gt.videoPlayer.getAccurateTime().time;
                this.player.gt.pianoVisuals.setTime(t * 1000, 0, true);
              }
            }
          }

          this.player.setStatus(
            `Imported ${parsed.timedEvents.length} events.`,
            '#4f4'
          );
        } else {
          this.player.setStatus('Invalid file format.', '#f55');
        }
      } catch (err) {
        console.error(err);
        this.player.setStatus('Error reading file.', '#f55');
      }
      input.remove();
    };
    document.body.appendChild(input);
    input.click();
  }

  exportVEQ() {
    if (!VideoEventQueue.current || !VideoEventQueue.current.timedEvents) {
      alert('No data to export.');
      return;
    }

    const transposeOffset = this.player?.gt?.transposeOffset || 0;
    const text = VideoEventQueue.serialize(transposeOffset);
    const filename = VideoEventQueue.getExportFilename();

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = makeElement('a', {
      href: url,
      download: filename,
      style: 'display:none',
    });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 100);
  }

  importPlaylist() {
      const input = makeElement('input', {
        type: 'file',
        accept: '.txt,.json',
        style: { display: 'none' },
      });
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          let items = [];
  
          try {
            const json = JSON.parse(text);
            const list = Array.isArray(json) ? json : json.playlist;
            if (Array.isArray(list)) {
              items = list.map((i) => ({
                id: i.id,
                title: i.title || i.id,
                hasPianoRoll: i.hasPianoRoll,
                songSettings: i.songSettings,
                startTime: i.startTime,
                endTime: i.endTime,
              }));
            }
          } catch (err) {
            const lines = text.split(/\r?\n/);
            lines.forEach((l) => {
              const parsed = PlaylistFormat.parseLine(l);
              if (parsed) items.push(parsed);
            });
          }
  
          if (items.length === 0) {
            alert('No videos found in file.');
            return;
          }
  
          if (this.player.playlistManager.playlist.length > 0) {
            UITools.makeDialog({
              title: 'Load Playlist',
              content: `Found ${items.length} videos. How would you like to add them?`,
              width: '350px',
              appendTo: this.player.rootElement,
              buttons: [
                {
                  label: 'Replace',
                  className: 'danger',
                  onClick: (btn, dBox) => {
                    this.player.playlistManager.clear();
                    this.player.playlistManager.addBulk(items, true);
                    dBox.close();
                  },
                },
                {
                  label: 'Append (End)',
                  className: 'primary',
                  onClick: (btn, dBox) => {
                    this.player.playlistManager.addBulk(items, true);
                    dBox.close();
                  },
                },
                {
                  label: 'Prepend (Start)',
                  className: 'primary',
                  onClick: (btn, dBox) => {
                    this.player.playlistManager.addBulk(items, false);
                    dBox.close();
                  },
                },
                { label: 'Cancel', onClick: (btn, dBox) => dBox.close() },
              ],
            });
          } else {
            const count = this.player.playlistManager.addBulk(items, true);
            this.player.setStatus(`Loaded ${count} videos.`, '#4f4');
          }
        } catch (err) {
          console.error(err);
          alert('Error importing playlist.');
        }
        input.remove();
      };
      document.body.appendChild(input);
      input.click();
    }

  async fetchAndLoadPlaylist(url, forcedAddType = null) {
        let fetchUrl = url;
        if (fetchUrl && !fetchUrl.includes('/') && !fetchUrl.includes('.')) {
          fetchUrl = `/playlists/${fetchUrl}.txt`;
        }

        if (
          fetchUrl.includes('.') &&
          !fetchUrl.startsWith('http') &&
          !fetchUrl.startsWith('/')
        ) {
          if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(fetchUrl)) {
            fetchUrl = 'https://' + fetchUrl;
          }
        }

        console.log(`Loading playlist from: ${fetchUrl}`);
        try {
          const res = await fetch(fetchUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const text = await res.text();
          let items = [];

          try {
            const data = JSON.parse(text);
            const list = Array.isArray(data) ? data : data.playlist;
            if (Array.isArray(list)) {
              items = list.map((i) => ({
                id: i.id,
                title: i.title || i.id,
                hasPianoRoll: i.hasPianoRoll,
                songSettings: i.songSettings,
                startTime: i.startTime,
                endTime: i.endTime,
              }));
            }
          } catch (e) {
            const lines = text.split(/\r?\n/);
            lines.forEach((l) => {
              const parsed = PlaylistFormat.parseLine(l);
              if (parsed) items.push(parsed);
            });
          }

          if (items.length > 0) {
            const finishLoad = (addType) => {
              this.player.state.settings.lastPlaylistUrl = fetchUrl;
              
              // Prevent clear() and addBulk() from polluting DB on load
              this.player.state.settings.playlistModified = false;
              this.player._saveSettings();

              this.player._isLoadingPlaylist = true;
              if (addType === 'replace') {
                this.player.playlistManager.clear();
                this.player.playlistManager.addBulk(items, true);
              } else if (addType === 'append') {
                this.player.playlistManager.addBulk(items, true);
              } else if (addType === 'prepend') {
                this.player.playlistManager.addBulk(items, false);
              }
              this.player._isLoadingPlaylist = false;

              this.player.setStatus(`Loaded ${items.length} videos.`, '#4f4');
              if (this.player.playlistSelectorUI) {
                this.player.playlistSelectorUI.markUnmodified(url);
              }
              if (this.player.leftPanel) this.player.leftPanel.open('playlist');
            };

            if (
              forcedAddType === 'replace' ||
              forcedAddType === 'append' ||
              forcedAddType === 'prepend'
            ) {
              finishLoad(forcedAddType);
              return true;
            }

            if (this.player.playlistManager.playlist.length > 0) {
              UITools.makeDialog({
                title: 'Load Playlist',
                content: `Found ${items.length} videos in URL. How would you like to add them?`,
                width: '350px',
                appendTo: this.player.rootElement,
                buttons: [
                  {
                    label: 'Replace',
                    className: 'danger',
                    onClick: (btn, dBox) => {
                      finishLoad('replace');
                      dBox.close();
                    },
                  },
                  {
                    label: 'Append (End)',
                    className: 'primary',
                    onClick: (btn, dBox) => {
                      finishLoad('append');
                      dBox.close();
                    },
                  },
                  {
                    label: 'Prepend (Start)',
                    className: 'primary',
                    onClick: (btn, dBox) => {
                      finishLoad('prepend');
                      dBox.close();
                    },
                  },
                  { label: 'Cancel', onClick: (btn, dBox) => dBox.close() },
                ],
              });
            } else {
              finishLoad('replace');
            }
            return true;
          } else {
            this.player.setStatus('No videos found in URL.', '#fa0');
            return false;
          }
        } catch (err) {
          console.error('Playlist fetch error:', err);
          this.player.setStatus(`Failed: ${err.message}`, '#f55');
          return false;
        }
      }

  async savePlaylistToCloud() {
    if (
      !this.player.playlistManager ||
      this.player.playlistManager.playlist.length === 0
    ) {
      this.player.setStatus('Playlist is empty', '#f55');
      return;
    }
    const data = this.player.playlistManager.playlist.filter(
      (v) => !v.playOnce
    );
    try {
      this.player.setStatus('Saving to cloud...', '#aaa');
      const res = await fetch('save_playlist.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlist: data }),
      });
      const result = await res.json();
      if (result.success && result.id) {
        if (this.player.playlistSelectorUI) {
          this.player.playlistSelectorUI.markUnmodified(result.id);
        }
        if (this.player.leftPanelUI) {
          const input =
            this.player.leftPanelUI.audioContainer?.parentElement?.querySelector(
              'input[placeholder="YouTube URL, ID, or Playlist..."]'
            );
          if (input) input.value = result.id;
        }
        navigator.clipboard.writeText(result.id);
        this.player.setStatus(`Saved! ID: ${result.id} (Copied)`, '#4f4');
      } else {
        this.player.setStatus('Cloud save failed', '#f55');
      }
    } catch (err) {
      console.error(err);
      this.player.setStatus('Error connecting to server', '#f55');
    }
  }

  async processUrlParameters() {
    const params = new URLSearchParams(window.location.search);
    const video = params.get('v') || params.get('video');
    const playlistUrl = params.get('pl') || params.get('playlist');

    if (playlistUrl) {
      await this.fetchAndLoadPlaylist(playlistUrl);
    }

    if (video) {
      const isUrl = video.includes('/') || video.includes('.');
      let title = 'Direct Video';
      if (isUrl) {
        try {
          const parts = video.split('/');
          const file = parts[parts.length - 1];
          title = file.split('?')[0];
        } catch (e) {}
      } else {
        title = `YouTube ${video}`;
      }

      this.player.playlistManager.add(video, decodeURIComponent(title));

      setTimeout(() => {
        const idx = this.player.playlistManager.playlist.findIndex(
          (v) => v.id === video
        );
        if (idx !== -1) {
          this.player.playlistManager._triggerPlay(idx);
        }
      }, 200);
    }
  }

}

