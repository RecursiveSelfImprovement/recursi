class AppStateManager {

  constructor(player) {
    this.player = player;
  }

  loadState() {
    let settings = {
      instrumentVolume: 50,
      transpose: 0,
      midiEnabled: false,
      keyboardStyle: '3d', // Default to 3D strictly
    };
    let geometry = {};

    try {
      const loadedSettings = JSON.parse(localStorage.getItem('yt_settings'));
      if (loadedSettings) {
        settings = { ...settings, ...loadedSettings };
      }
    } catch (e) {}

    try {
      const loadedGeo = JSON.parse(localStorage.getItem('yt_geometry'));
      if (loadedGeo && Object.keys(loadedGeo).length > 0) geometry = loadedGeo;
    } catch (e) {}

    try {
      const old = JSON.parse(localStorage.getItem('yt_remote_data'));
      if (old) {
        if (old.settings) settings = { ...settings, ...old.settings };
        if (old.geometry && Object.keys(geometry).length === 0) geometry = old.geometry;
        if (old.windowGeo && Object.keys(geometry).length === 0) geometry = old.windowGeo;
        localStorage.removeItem('yt_remote_data');
      }
    } catch (e) {}

    settings.editMode = false;

    // Eliminate "both"
    if (settings.keyboardStyle === 'both') {
      settings.keyboardStyle = '3d';
    }

    return { settings, playlistData: null, geometry };
  }

  saveState() {
    if (this._saveStateTimer) clearTimeout(this._saveStateTimer);
    this._saveStateTimer = setTimeout(() => {
      if (this.player.playlistManager) {
        this.player.state.playlistData = this.player.playlistManager.getData();
        if (this.player.state.settings.playlistModified) {
          // Offload playlist arrays to indexedDB to keep localStorage footprint minimal
          this._savePlaylistToDB(this.player.state.playlistData);
        }
      }
      localStorage.setItem(
        'yt_settings',
        JSON.stringify(this.player.state.settings || {})
      );
    }, 300);
  }

  saveGeometry() {
      if (this._saveGeoTimer) clearTimeout(this._saveGeoTimer);
      this._saveGeoTimer = setTimeout(() => {
        if (
          this.player.gt?.pianoVisuals?.geometrySettings
        ) {
          const gs = this.player.gt.pianoVisuals.geometrySettings;
          this.player.state.geometry = this.player.state.geometry || {};
          
          // Copy all direct numeric/string configuration keys to active state
          Object.keys(gs).forEach((key) => {
            if (typeof gs[key] !== 'function' && typeof gs[key] !== 'object') {
              this.player.state.geometry[key] = gs[key];
            }
          });
        }
        try {
          localStorage.setItem(
            'yt_geometry',
            JSON.stringify(this.player.state.geometry || {})
          );
        } catch (e) {}
        this.saveState();
      }, 300);
    }

  updateSongSettings(updates) {
      if (!this.player.currentPlayItem) return;
      const veqData = window.VideoEventQueueClass?.current;
      const hasNotes =
        veqData &&
        veqData.timedEvents &&
        veqData.timedEvents.some((e) => e.type === 'note');
      if (!hasNotes) return;

      const isCurator = typeof window.openCuratorDiagnostics === 'function' && localStorage.getItem('gt_curator_mode') === 'true';

      if (isCurator) {
        if (!this.player.currentPlayItem.songSettings) {
          this.player.currentPlayItem.songSettings = {};
        }
        Object.assign(this.player.currentPlayItem.songSettings, updates);

        if (typeof window.curatorLog === 'function') {
          window.curatorLog('Scope', `Committed local curation settings directly to playlist item: ${this.player.currentPlayItem.title}`, updates);
        }

        if (this.player.playlistSelectorUI) {
          this.player.playlistSelectorUI.markModified();
        }

        this.saveState();
      } else {
        if (typeof window.curatorLog === 'function') {
          window.curatorLog('Scope', `Session/Global Override applied (Local playlist state preserved)`, updates);
        }
      }
    }

  async _getDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('AardvarkPlaylistDB', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('store')) {
          db.createObjectStore('store');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async loadPlaylistAsync() {
    try {
      const db = await this._getDB();
      const tx = db.transaction('store', 'readonly');
      const store = tx.objectStore('store');
      const req = store.get('current_playlist');
      
      return new Promise((resolve) => {
        req.onsuccess = () => {
          let data = req.result;
          if (!data) {
            // Fallback to local storage migration if never transitioned
            try {
              const localStr = localStorage.getItem('yt_playlist');
              if (localStr) {
                data = JSON.parse(localStr);
                this._savePlaylistToDB(data); // commit to IDB
              }
            } catch (e) {}
          }
          resolve(data);
        };
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      console.error('IDB load failed', e);
      return null;
    }
  }

  async _savePlaylistToDB(data) {
        try {
          const db = await this._getDB();
          const tx = db.transaction('store', 'readwrite');
          const store = tx.objectStore('store');
          if (data === null) {
            store.delete('current_playlist');
          } else {
            store.put(data, 'current_playlist');
          }
        } catch (e) {
          console.error('IDB save failed', e);
        }
      }
}

