
class PlaylistSelectorUI {
  constructor(player) {
    this.player = player;
    this.presets = [
      {
        name: '🎹 Best of GlowTunes (Piano)',
        url: '/playlists/pianoSongs.txt',
      },
      { name: "🎵 Rob's Mixtape", url: '/playlists/robsMixTape.txt' },
      { name: '🧸 Kids Piano Songs', url: '/playlists/kidsPianoSongs.txt' },
    ];
    this.registeredSelects = [];
  }

  getHistory() {
    try {
      return (
        JSON.parse(localStorage.getItem('aardvark_playlist_history')) || []
      );
    } catch (e) {
      return [];
    }
  }

  addHistory(url, name) {
    let history = this.getHistory();
    history = history.filter((h) => h.url !== url);
    history.unshift({ url, name: name || url });
    if (history.length > 10) history = history.slice(0, 10);
    localStorage.setItem('aardvark_playlist_history', JSON.stringify(history));
    this.updateAllDropdowns();
  }

  markModified() {
    if (this.player.state.settings.playlistModified) return;
    this.player.state.settings.playlistModified = true;
    this.player._saveSettings(); // This will now trigger saving yt_playlist in AppStateManager
    this.updateAllDropdowns();
  }

  markUnmodified(url) {
        this.player.state.settings.playlistModified = false;
        this.player.state.settings.lastPlaylistUrl = url;
        this.player._saveSettings();

        // Wipe obsolete custom data in IndexedDB when moving to a predefined preset
        if (this.player.stateManager) {
          this.player.stateManager._savePlaylistToDB(null);
        }
        this.updateAllDropdowns();
      }

  getSavedUserPlaylist() {
        return this.player.state.playlistData || null;
      }

  createDropdown() {
    const select = makeElement('select', {
      style:
        'flex: 1; background:#111; color:#eee; border:1px solid #444; font-size:11px; padding:4px; border-radius:4px;',
      onchange: (e) => {
        const val = e.target.value;
        if (val === '__user__') {
          const saved = this.getSavedUserPlaylist();
          if (saved && saved.playlist) {
            this.player._isLoadingPlaylist = true;
            this.player.playlistManager.clear();
            this.player.playlistManager.addBulk(saved.playlist, true);
            this.player.playlistManager.setCurrentIndex(saved.index || 0);
            this.player._isLoadingPlaylist = false;

            this.player.state.settings.playlistModified = true;
            this.player._saveSettings();
            this.updateAllDropdowns();
            this.player.setStatus('Loaded User Playlist', '#4f4');
          }
        } else if (val) {
          this.player._fetchAndLoadPlaylist(val, 'replace');
        }
      },
    });
    this.registeredSelects.push(select);
    this._populateDropdown(select);
    return select;
  }

  _populateDropdown(select) {
    select.innerHTML = '';

    const isModified = this.player.state.settings.playlistModified;
    const currentUrl = this.player.state.settings.lastPlaylistUrl;
    const savedUser = this.getSavedUserPlaylist();
    const hasSavedUser =
      savedUser && savedUser.playlist && savedUser.playlist.length > 0;
    const hasItems =
      this.player.playlistManager &&
      this.player.playlistManager.playlist.length > 0;

    if (isModified || (!currentUrl && hasItems)) {
      const opt = makeElement(
        'option',
        { value: '__user__' },
        '📌 User Playlist'
      );
      opt.selected = true;
      select.appendChild(opt);
    } else if (hasSavedUser) {
      // Only show as an option if they have a saved user playlist to go back to
      const opt = makeElement(
        'option',
        { value: '__user__' },
        '📌 User Playlist'
      );
      select.appendChild(opt);
    } else if (!currentUrl && !hasItems) {
      const opt = makeElement(
        'option',
        { value: '__user__' },
        '📌 No Playlist Loaded'
      );
      opt.selected = true;
      select.appendChild(opt);
    }

    const history = this.getHistory();

    const optgroupPresets = makeElement('optgroup', {
      label: 'Starter Playlists',
    });
    this.presets.forEach((p) => {
      const opt = makeElement('option', { value: p.url }, p.name);
      if (!isModified && currentUrl === p.url) opt.selected = true;
      optgroupPresets.appendChild(opt);
    });
    select.appendChild(optgroupPresets);

    const historyItems = history.filter(
      (h) => !this.presets.some((p) => p.url === h.url)
    );
    if (historyItems.length > 0) {
      const optgroupHistory = makeElement('optgroup', {
        label: 'Recent Playlists',
      });
      historyItems.forEach((h) => {
        const opt = makeElement('option', { value: h.url }, h.name);
        if (!isModified && currentUrl === h.url) opt.selected = true;
        optgroupHistory.appendChild(opt);
      });
      select.appendChild(optgroupHistory);
    }
  }

  updateAllDropdowns() {
    this.registeredSelects.forEach((select) => {
      if (select.isConnected) {
        this._populateDropdown(select);
      }
    });
    this.registeredSelects = this.registeredSelects.filter(
      (s) => s.isConnected
    );
  }

}

