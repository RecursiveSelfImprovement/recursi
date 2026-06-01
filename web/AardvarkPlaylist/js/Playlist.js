
class Playlist {
  

  constructor(containerElement, callbacks = {}) {
      this.container = containerElement;
      this.onPlayCallback = callbacks.onPlay || (() => {});
      this.onPlaylistChange = callbacks.onPlaylistChange || (() => {});

      this.onLoadUrl = callbacks.onLoadUrl || (() => {});
      this.onCloudSave = callbacks.onCloudSave || (() => {});
      this.onImportFile = callbacks.onImportFile || (() => {});

      this.initialUrl = callbacks.initialUrl || '';
      this.playlistSelectorUI = callbacks.playlistSelectorUI || null;

      this.playlist = [];
      this.currentIndex = -1;
      this.veqCache = {};
      this._searchQuery = ''; // State tracking for real-time list filtering

      this._render();
    }

  load(data) {
    if (!data) return;
    if (Array.isArray(data.playlist)) this.playlist = data.playlist;
    if (typeof data.index === 'number') this.currentIndex = data.index;
    this.renderItems();
  }

  getData() {
    return {
      playlist: this.playlist.filter((v) => !v.playOnce),
      index: this.currentIndex,
    };
  }

  add(id, title, playOnce = false, forceTop = false, position = null) {
      const cleanId = id.trim();
      const existingIndex = this.playlist.findIndex((v) => v.id === cleanId);

      if (existingIndex !== -1) {
        const existing = this.playlist[existingIndex];
        if (!playOnce && existing.playOnce) {
          existing.playOnce = false;
          this.renderItems();
          this.onPlaylistChange();
        }
        if ((position === 'top' || forceTop) && existingIndex !== 0) {
          this.playlist.splice(existingIndex, 1);
          this.playlist.unshift(existing);
          if (this.currentIndex === existingIndex) {
            this.currentIndex = 0;
          } else if (
            this.currentIndex >= 0 &&
            this.currentIndex < existingIndex
          ) {
            this.currentIndex++;
          }
          this.renderItems();
          this.onPlaylistChange();
          return 0;
        }
        return existingIndex;
      }

      const item = {
        id: cleanId,
        title: title || 'Unknown Video',
        playOnce: !!playOnce,
      };

      let insertIndex;
      if (position === 'top' || forceTop) {
        insertIndex = 0;
      } else if (
        position === 'next' ||
        (this.playlist.length > 0 &&
          this.currentIndex >= 0 &&
          this.currentIndex < this.playlist.length)
      ) {
        // Insert immediately AFTER current video
        insertIndex = this.currentIndex + 1;
      } else {
        // Top of list if nothing is playing
        insertIndex = 0;
      }

      this.playlist.splice(insertIndex, 0, item);

      if (insertIndex <= this.currentIndex) {
        this.currentIndex++;
      }

      this.renderItems();
      this.onPlaylistChange();

      return insertIndex;
    }

  remove(index) {
    if (index < 0 || index >= this.playlist.length) return;
    this.playlist.splice(index, 1);

    if (index < this.currentIndex) {
      this.currentIndex--;
    } else if (index === this.currentIndex) {
      if (this.currentIndex >= this.playlist.length) {
        this.currentIndex = this.playlist.length - 1;
      }
    }
    this.renderItems();
    this.onPlaylistChange();
  }

  move(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this.playlist.length) return;

    [this.playlist[index], this.playlist[newIndex]] = [
      this.playlist[newIndex],
      this.playlist[index],
    ];

    if (this.currentIndex === index) this.currentIndex = newIndex;
    else if (this.currentIndex === newIndex) this.currentIndex = index;

    this.renderItems();
    this.onPlaylistChange();
  }

  shuffle() {
    if (this.playlist.length < 2) return;
    const currentVideo = this.playlist[this.currentIndex];

    // Smart Shuffle: Separate into "With Piano Roll" and "Without"
    const withPR = [];
    const withoutPR = [];

    this.playlist.forEach((v) => {
      if (v.hasPianoRoll) withPR.push(v);
      else withoutPR.push(v);
    });

    const shuffleArray = (arr) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    };

    shuffleArray(withPR);
    shuffleArray(withoutPR);

    // Recombine prioritizing PR videos first
    this.playlist = [...withPR, ...withoutPR];

    if (currentVideo) {
      this.currentIndex = this.playlist.findIndex(
        (v) => v.id === currentVideo.id
      );
    }
    this.renderItems();
    this.scrollToCurrent();
    this.onPlaylistChange();
  }

  clear() {
    this.playlist = [];
    this.currentIndex = -1;
    this.renderItems();
    this.onPlaylistChange();
  }

  setCurrentIndex(index) {
    this.currentIndex = index;
    this.renderItems();
    this.scrollToCurrent();
  }

  playNext() {
      const q = this._searchQuery || '';
      if (q) {
        const filtered = this.getFilteredIndices();
        if (filtered.length === 0) return false;

        const currentPos = filtered.indexOf(this.currentIndex);
        if (currentPos !== -1 && currentPos < filtered.length - 1) {
          this._triggerPlay(filtered[currentPos + 1]);
          return true;
        } else if (filtered.length > 0) {
          // Loop back to start of search filtered subset
          this._triggerPlay(filtered[0]);
          return true;
        }
        return false;
      }

      // Normal non-filtered sequential playback
      if (this.currentIndex < this.playlist.length - 1) {
        this._triggerPlay(this.currentIndex + 1);
        return true;
      } else if (this.playlist.length > 0) {
        this._triggerPlay(0);
        return true;
      }
      return false;
    }

  _triggerPlay(index) {
    if (index >= 0 && index < this.playlist.length) {
      const item = this.playlist[index];
      this.setCurrentIndex(index);
      this.onPlayCallback(item, index);

      // If item is set to play only once (temporary), remove it after triggering play
      if (item.playOnce) {
        this.remove(index);
      }
    }
  }

  _render() {
    this._injectStyles();
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.height = '100%';

    this.toolbar = makeElement('div', { className: 'pl-toolbar' });
    this.container.appendChild(this.toolbar);
    this._renderToolbar();

    this.listElement = makeElement('div', { className: 'playlist-container' });
    this.container.appendChild(this.listElement);
    this.renderItems();
  }

  _renderToolbar() {
      this.toolbar.innerHTML = '';
      this.toolbar.style.flexDirection = 'column';
      this.toolbar.style.gap = '6px';

      const topRow = makeElement('div', {
        style: 'display:flex; gap:6px; width:100%; align-items:center;',
      });

      if (this.playlistSelectorUI) {
        const plSelect = this.playlistSelectorUI.createDropdown();
        topRow.appendChild(plSelect);
      }

      // Trimmed down the sort select width and changed label to a simple "Sort..."
      const sortSelect = makeElement('select', {
        style: 'background:#111; color:#ccc; border:1px solid #444; font-size:10px; padding:4px; border-radius:4px; cursor:pointer; max-width:62px; flex:0 0 62px;',
      });

      [
        { v: '', l: 'Sort...' },
        { v: 'shuffle', l: '🔀 Shuffle' },
        { v: 'sort_1', l: 'Sort: Title' },
        { v: 'sort_2', l: 'Sort: Song' },
      ].forEach((opt) => {
        sortSelect.appendChild(makeElement('option', { value: opt.v }, opt.l));
      });

      sortSelect.onchange = (e) => {
        const v = e.target.value;
        if (v === 'shuffle') this.shuffle();
        else if (v === 'sort_1') this._sortPlaylist(true);
        else if (v === 'sort_2') this._sortPlaylist(false);
        e.target.value = ''; // Reset selector
      };
      topRow.appendChild(sortSelect);

      // Trimmed down padding and size of the Backup Manager button so it fits without hanging off
      const fileBtn = makeElement('button', {
        className: 'dialog-button',
        title: 'Import / Export & Backup Manager (Playlists & Piano Rolls)',
        style: 'padding: 4px 6px; font-size: 12px; display:flex; align-items:center; justify-content:center; flex: 0 0 24px; height: 21px;',
        onclick: () => this.openImportExportDialog(),
      }, '📂');
      topRow.appendChild(fileBtn);

      const urlRow = makeElement('div', {
        style: 'display:flex; gap:6px; width:100%; align-items:center;',
      });

      const urlInput = makeElement('input', {
        placeholder: 'YouTube URL, ID, or Playlist...',
        value: this.initialUrl,
        style: 'flex:1; font-size:10px; background:#000; color:#fff; border:1px solid #444; padding:4px 6px; border-radius:4px;',
        onkeydown: (e) => {
          e.stopPropagation();
        }
      });

      const executeLoad = async (text) => {
        if (!text) return;
        let trimmed = text.trim();

        if (trimmed.includes('.') && !trimmed.startsWith('http') && !trimmed.includes(' ')) {
          if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed)) {
            trimmed = 'https://' + trimmed;
          }
        }

        const lines = trimmed.split(/\r?\n/).filter((l) => l.trim());

        if (lines.length > 1) {
          let count = 0;
          lines.forEach((l) => {
            const parts = l.trim().split(' ');
            const videoId = this._parseYoutubeId(parts[0]);
            if (videoId) {
              this.add(videoId, parts.slice(1).join(' ') || videoId);
              count++;
            }
          });
          return;
        }

        const id = this._parseYoutubeId(trimmed);

        if (trimmed.endsWith('.json') || trimmed.endsWith('.txt') || trimmed.includes('/playlists/') || trimmed.startsWith('http')) {
          this.onLoadUrl(trimmed);
        } else if (id) {
          loadBtn.textContent = '...';
          const title = await this._fetchVideoTitle(id);
          this.add(id, title || 'Video ' + id);
          loadBtn.textContent = 'Load';
        } else {
          this.onLoadUrl(trimmed);
        }
      };

      urlInput.onkeydown = (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          executeLoad(urlInput.value);
          urlInput.value = '';
        }
      };

      const loadBtn = makeElement('button', {
        className: 'dialog-button primary',
        onclick: () => {
          if (urlInput.value) {
            executeLoad(urlInput.value);
            urlInput.value = '';
          }
        },
      }, 'Load');

      const pasteBtn = makeElement('button', {
        className: 'dialog-button',
        title: 'Paste and Load',
        style: 'padding: 4px; font-size: 12px; display: flex; align-items: center; justify-content: center;',
        onclick: async () => {
          try {
            const text = await navigator.clipboard.readText();
            if (!text) return;
            urlInput.value = text;
            loadBtn.style.transform = 'scale(1.05)';
            loadBtn.style.filter = 'brightness(1.5)';
            setTimeout(() => {
              loadBtn.style.transform = 'scale(1)';
              loadBtn.style.filter = 'none';
              executeLoad(text);
              urlInput.value = '';
            }, 400);
          } catch (e) {
            alert('Could not read clipboard. Please use Ctrl+V in the text box.');
          }
        },
      }, '📋');

      urlRow.append(pasteBtn, urlInput, loadBtn);

      const searchInput = makeElement('input', {
        placeholder: '🔍 Search / Jump to song...',
        value: this._searchQuery,
        style: 'width:100%; font-size:10px; background:#000; color:#fff; border:1px solid #444; padding:4px 6px; border-radius:4px;',
        onkeydown: (e) => {
          e.stopPropagation();
        },
        oninput: (e) => {
          this._searchQuery = e.target.value.toLowerCase().trim();
          this.renderItems();

          if (this._searchQuery) {
            const idx = this.playlist.findIndex(v => (v.title || '').toLowerCase().includes(this._searchQuery) || v.id.toLowerCase().includes(this._searchQuery));
            let isPlaying = false;
            const player = window.projectApp;
            if (player && player.gt && player.gt.videoPlayer) {
              isPlaying = player.gt.videoPlayer.isPlaying();
            }
            if (!isPlaying && idx !== -1 && idx !== this.currentIndex) {
              this._triggerPlay(idx);
            }
          }
        }
      });

      this.toolbar.append(topRow, urlRow, searchInput);
    }

  renderItems() {
      if (this.playlist.length === 0) {
        this.listElement.innerHTML = '';
        this.listElement.appendChild(
          makeElement(
            'div',
            {
              style: { padding: '20px', color: '#999', textAlign: 'center' },
            },
            'No videos. Paste URL or drop file.'
          )
        );
        return;
      }

      if (
        this.listElement.firstChild &&
        !this.listElement.firstChild.classList?.contains('pl-item')
      ) {
        this.listElement.innerHTML = '';
      }

      const existingNodes = Array.from(this.listElement.children);
      const q = this._searchQuery || '';

      // Check if video is actually playing right now
      let isPlaying = false;
      const player = window.projectApp;
      if (player && player.gt && player.gt.videoPlayer) {
        isPlaying = player.gt.videoPlayer.isPlaying();
      }

      this.playlist.forEach((vid, index) => {
        const isActive = index === this.currentIndex;
        const isTemp = !!vid.playOnce;
        const isUrl = vid.id.includes('/') || vid.id.includes('.');

        // Filter: Hide elements that don't match, unless they are currently playing
        let matchesSearch = true;
        if (q) {
          const titleMatch = (vid.title || '').toLowerCase().includes(q);
          const idMatch = vid.id.toLowerCase().includes(q);
          matchesSearch = titleMatch || idMatch;
        }

        const shouldShow = matchesSearch || (isActive && isPlaying);

        let node = existingNodes[index];

        if (node && node.dataset.id === vid.id) {
          node.className = `pl-item ${isActive ? 'active' : ''} ${
            isTemp ? 'is-temp' : ''
          }`;
          node.style.display = shouldShow ? 'flex' : 'none';
          const titleEl = node.querySelector('.pl-title');
          if (titleEl && !node.querySelector('.pl-title-input')) {
            const hasPR = vid.hasPianoRoll ? '🎹 ' : '';
            titleEl.textContent = hasPR + vid.title + (isTemp ? ' (Temp)' : '');
            titleEl.style.color = isTemp ? '#ff8800' : '';
          }
          return;
        }

        let thumbUrl, hqThumbUrl;
        let thumbStyle = {};

        const isValidYtId = vid.id && vid.id.length === 11 && !vid.id.includes('/') && !vid.id.includes('.');

        if (isValidYtId) {
          thumbUrl = `https://img.youtube.com/vi/${vid.id}/mqdefault.jpg`;
          hqThumbUrl = `https://img.youtube.com/vi/${vid.id}/hqdefault.jpg`;
        } else {
          thumbUrl =
            'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
          hqThumbUrl = thumbUrl;
          thumbStyle = {
            background: '#333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          };
        }

        const row = makeElement('div', {
          className: `pl-item ${isActive ? 'active' : ''} ${
            isTemp ? 'is-temp' : ''
          }`,
          style: {
            display: shouldShow ? 'flex' : 'none',
          }
        });
        row.dataset.id = vid.id;

        const inner = makeElement(
          'div',
          {
            className: 'pl-item-inner',
            onmouseenter: (e) => {
              if (this.isDragging) return;
              const card = this.hoverCard;
              if (!card) return;

              card.querySelector('#hc-img').src = hqThumbUrl;
              card.querySelector('#hc-title').textContent = vid.title;
              card.querySelector('#hc-id').textContent = `ID: ${vid.id}`;

              card.style.display = 'flex';
              const rect = row.getBoundingClientRect();
              let left = rect.right + 10;
              let top = rect.top - 50;

              if (left + 320 > window.innerWidth) left = rect.left - 330;
              if (top + 250 > window.innerHeight) top = window.innerHeight - 260;
              if (top < 10) top = 10;

              card.style.left = `${left}px`;
              card.style.top = `${top}px`;

              clearTimeout(this._hoverTimer);
              this._hoverTimer = setTimeout(
                () => card.classList.add('show'),
                100
              );
            },
            onmouseleave: (e) => {
              clearTimeout(this._hoverTimer);
              if (this.hoverCard) this.hoverCard.classList.remove('show');
            },
            onclick: (e) => {
              if (
                e.target.closest('button') ||
                e.target.closest('.pl-handle') ||
                e.target.tagName === 'INPUT'
              )
                return;
              this._triggerPlay(index);
            },
          },
          [
            makeElement('div', {
              className: 'pl-handle',
              innerHTML: '⋮⋮',
              onmousedown: (e) => this._handleDragStart(e, index, row),
            }),
            makeElement('img', {
              src: thumbUrl,
              className: 'pl-thumb',
              style: thumbStyle,
              onerror: (e) => {
                e.target.src = '';
                e.target.style.background = '#333';
              },
            }),
            makeElement(
              'div',
              { className: 'pl-info' },
              makeElement(
                'div',
                {
                  className: 'pl-title',
                  style: isTemp ? { color: '#ff8800' } : {},
                },
                (vid.hasPianoRoll ? '🎹 ' : '') +
                  vid.title +
                  (isTemp ? ' (Temp)' : '')
              )
            ),
            makeElement('div', { className: 'pl-controls' }, [
              this._makeBtn(
                '⏱️',
                'Set Start/End',
                () => this._toggleTimeEditor(index, row),
                'time'
              ),
              this._makeBtn(
                '✎',
                'Rename',
                () => this._startRename(index, inner),
                'edit'
              ),
              this._makeBtn('×', 'Remove', () => this.remove(index), 'del'),
            ]),
          ]
        );

        if (isUrl) {
          const img = inner.querySelector('img');
          img.style.backgroundImage =
            'linear-gradient(45deg, #444 25%, #333 25%, #333 50%, #444 50%, #444 75%, #333 75%, #333 100%)';
          img.style.backgroundSize = '10px 10px';
        }

        row.appendChild(inner);

        if (existingNodes[index]) {
          this.listElement.replaceChild(row, existingNodes[index]);
          existingNodes[index] = row;
        } else {
          this.listElement.appendChild(row);
          existingNodes.push(row);
        }
      });

      while (this.listElement.children.length > this.playlist.length) {
        this.listElement.removeChild(this.listElement.lastChild);
      }
    }

  _makeBtn(label, title, onClick, extraClass = '') {
    return makeElement(
      'button',
      {
        className: `pl-btn ${extraClass}`,
        title: title,
        onclick: (e) => {
          e.stopPropagation();
          onClick();
        },
      },
      label
    );
  }

  scrollToCurrent() {
      setTimeout(() => {
        const active = this.listElement.querySelector('.active');
        if (active) {
          active.scrollIntoView({ behavior: 'auto', block: 'nearest' });
        }
      }, 50);
    }

  _parseYoutubeId(text) {
    if (!text) return null;
    const trimmed = text.trim();

    // Check for common video file extensions
    if (/\.(mp4|webm|ogg|mov)$/i.test(trimmed)) {
      return trimmed;
    }

    if (trimmed.length === 11) return trimmed;
    if (trimmed.includes('v=')) return trimmed.split('v=')[1].split('&')[0];
    if (trimmed.includes('youtu.be/'))
      return trimmed.split('youtu.be/')[1].split('?')[0];
    if (trimmed.includes('/shorts/'))
      return trimmed.split('/shorts/')[1].split('?')[0];

    // If it looks like a full URL but not a specific video file,
    // we might accept it if the user pasted it, assuming HTML5 player handles it.
    if (trimmed.startsWith('http') && trimmed.includes('/')) {
      return trimmed;
    }

    return null;
  }

  async _fetchVideoTitle(videoId) {
    try {
      const response = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      if (response.ok) {
        const data = await response.json();
        return data.title || null;
      }
    } catch (e) {
      console.warn('Could not fetch video title:', e);
    }
    return null;
  }

  _injectStyles() {
    const css = `
    .pl-toolbar { padding: 10px; background: #1a1a1a; border-bottom: 1px solid #333; display: flex; gap: 5px; flex-wrap: wrap; }
    .playlist-container { flex: 1; overflow-y: auto; padding: 0; background: #111; position: relative; }
    
    .pl-item {
      display: flex; flex-direction: column; 
      padding: 0; border-bottom: 1px solid #222;
      background: #111; position: relative;
    }
    .pl-item-inner {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 10px; cursor: pointer; transition: background 0.1s;
      height: 50px; box-sizing: border-box; width: 100%;
      position: relative;
    }
    .pl-item-inner:hover { background: #1f1f1f; }
    .pl-item.active .pl-item-inner { background: #2a2a2a; border-left: 3px solid #4a90e2; padding-left: 7px; }
    .pl-item.is-temp .pl-item-inner { border-left: 3px solid #ff8800; background: #1f1a10; padding-left: 7px; }
    
    .pl-handle {
        width: 20px; 
        height: 100%;
        display: flex; 
        align-items: center; 
        justify-content: center; 
        cursor: grab; 
        color: #555; 
        font-size: 16px; 
        font-weight: bold;
        user-select: none;
        flex-shrink: 0;
        margin-right: -4px;
    }
    .pl-handle:hover { color: #aaa; }
    .pl-handle:active { cursor: grabbing; color: #fff; }

    .pl-ghost {
        position: fixed;
        z-index: 2147483647; 
        background: #2a2a2a;
        box-shadow: 0 8px 20px rgba(0,0,0,0.6);
        border: 1px solid #4a90e2;
        opacity: 0.95;
        pointer-events: none; 
        display: flex; 
        align-items: center; 
        gap: 10px;
        padding: 0;
        box-sizing: border-box;
        border-radius: 4px;
        transform: scale(1.02); 
    }
    .pl-ghost .pl-handle { cursor: grabbing; color: #fff; }

    .pl-gap {
        background: rgba(255,255,255,0.03);
        border: 1px dashed #444;
        border-radius: 4px;
        box-sizing: border-box;
        margin: 2px 0;
    }

    .pl-thumb {
      width: 64px; height: 36px; object-fit: cover;
      background: #000; border-radius: 3px; flex-shrink: 0;
    }
    
    .pl-info {
      flex: 1; overflow: hidden; display: flex; flex-direction: column; justify-content: center;
      min-width: 0;
    }
    .pl-title {
      font-size: 12px; color: #ccc; white-space: nowrap; 
      overflow: hidden; text-overflow: ellipsis; font-weight: 500;
      padding-right: 4px;
    }
    .pl-item.active .pl-title { color: #4a90e2; font-weight: 700; }
    
    .pl-controls {
      display: flex; gap: 2px;
      opacity: 0; transition: opacity 0.2s;
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: linear-gradient(to right, transparent, #1f1f1f 25%);
      padding-left: 20px;
      z-index: 2;
    }
    .pl-item-inner:hover .pl-controls { opacity: 1; }
    .pl-item.active .pl-controls { background: linear-gradient(to right, transparent, #2a2a2a 25%); }
    .pl-item.is-temp .pl-controls { background: linear-gradient(to right, transparent, #1f1a10 25%); }
    
    .pl-btn {
      background: #333; color: #aaa; border: 1px solid #444;
      width: 20px; height: 20px; font-size: 10px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      padding: 0; border-radius: 3px;
    }
    .pl-btn:hover { background: #555; color: #fff; }
    .pl-btn.del:hover { background: #822; border-color: #a44; }

    /* HOVER CARD */
    .pl-hover-card {
        position: fixed;
        z-index: 2147483647;
        background: #1e1e1e;
        border: 1px solid #444;
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.8);
        width: 320px;
        pointer-events: none;
        opacity: 0;
        visibility: hidden;
        transform: scale(0.95) translateX(-10px);
        transition: opacity 0.2s, transform 0.2s, visibility 0.2s;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
    .pl-hover-card.show {
        opacity: 1;
        visibility: visible;
        transform: scale(1) translateX(0);
    }
    .pl-hover-card img {
        width: 100%;
        height: auto;
        aspect-ratio: 16/9;
        object-fit: cover;
        background: #000;
    }
    .pl-hover-card .hc-info {
        padding: 12px;
    }
    .pl-hover-card .hc-title {
        font-size: 14px;
        font-weight: bold;
        color: #fff;
        line-height: 1.4;
        margin-bottom: 8px;
    }
    .pl-hover-card .hc-id {
        font-size: 11px;
        color: #888;
        font-family: monospace;
    }
  `;
    applyCss(css, 'playlist-styles');

    // Create global hover card if it doesn't exist
    if (!document.getElementById('global-pl-hover-card')) {
      this.hoverCard = makeElement(
        'div',
        { id: 'global-pl-hover-card', className: 'pl-hover-card' },
        [
          makeElement('img', { id: 'hc-img', src: '' }),
          makeElement('div', { className: 'hc-info' }, [
            makeElement('div', { id: 'hc-title', className: 'hc-title' }),
            makeElement('div', { id: 'hc-id', className: 'hc-id' }),
          ]),
        ]
      );
      document.body.appendChild(this.hoverCard);
    } else {
      this.hoverCard = document.getElementById('global-pl-hover-card');
    }
  }

  _handleDragStart(e, index, itemRow) {
    if (e.button !== 0) return; // Only left mouse
    e.preventDefault(); // Prevent text selection

    this.isDragging = true;
    this.dragStartIndex = index;
    this.draggedItem = itemRow;

    // 1. Calculate Offsets
    const rect = itemRow.getBoundingClientRect();
    this.dragOffsetX = e.clientX - rect.left;
    this.dragOffsetY = e.clientY - rect.top;

    // 2. Create the Ghost (The thing you drag)
    this.ghost = itemRow.cloneNode(true);
    this.ghost.classList.add('pl-ghost');
    this.ghost.classList.remove('active'); // Remove active highlight from ghost usually looks better

    // Set explicit dimensions for fixed positioning
    this.ghost.style.width = `${rect.width}px`;
    this.ghost.style.height = `${rect.height}px`;
    this.ghost.style.left = `${rect.left}px`;
    this.ghost.style.top = `${rect.top}px`;

    document.body.appendChild(this.ghost);

    // 3. Create the Gap (The placeholder in the list)
    this.gap = makeElement('div', { className: 'pl-gap' });
    this.gap.style.height = `${rect.height}px`;

    // 4. Swap Logic: Replace item with gap in DOM
    itemRow.parentNode.insertBefore(this.gap, itemRow);
    itemRow.style.display = 'none';

    // 5. Global Listeners
    this._boundDragMove = (ev) => this._handleDragMove(ev);
    this._boundDragEnd = (ev) => this._handleDragEnd(ev);

    window.addEventListener('mousemove', this._boundDragMove);
    window.addEventListener('mouseup', this._boundDragEnd);
  }

  _handleDragMove(e) {
    if (!this.ghost) return;

    // 1. Move Ghost
    const top = e.clientY - this.dragOffsetY;
    const left = e.clientX - this.dragOffsetX;

    // Constrain horizontally slightly just to keep it near cursor, but allow free movement
    this.ghost.style.top = `${top}px`;
    this.ghost.style.left = `${left}px`;

    // 2. Move Gap (Snapping Logic)
    // Get all potential siblings (excluding the hidden item and the ghost)
    const siblings = Array.from(this.listElement.children).filter(
      (el) =>
        el !== this.ghost &&
        el.style.display !== 'none' &&
        !el.classList.contains('pl-gap')
    );

    const ghostMidY = top + this.ghost.offsetHeight / 2;
    let insertBeforeElement = null;

    // Find the first element whose middle is below the ghost's middle
    for (const sibling of siblings) {
      const sibRect = sibling.getBoundingClientRect();
      const sibMidY = sibRect.top + sibRect.height / 2;
      if (ghostMidY < sibMidY) {
        insertBeforeElement = sibling;
        break;
      }
    }

    // DOM Move
    if (insertBeforeElement) {
      if (this.gap.nextElementSibling !== insertBeforeElement) {
        this.listElement.insertBefore(this.gap, insertBeforeElement);
      }
    } else {
      // If no sibling found below, append to end
      this.listElement.appendChild(this.gap);
    }
  }

  _handleDragEnd(e) {
    window.removeEventListener('mousemove', this._boundDragMove);
    window.removeEventListener('mouseup', this._boundDragEnd);

    if (!this.gap || !this.ghost) return;

    // 1. Calculate New Index
    const siblings = Array.from(this.listElement.children);
    const visibleSiblings = siblings.filter(
      (el) => el.style.display !== 'none'
    );
    const newIndex = visibleSiblings.indexOf(this.gap);

    // 2. Animate Ghost to Gap
    const gapRect = this.gap.getBoundingClientRect();
    this.ghost.style.transition =
      'top 0.2s cubic-bezier(0.2, 0, 0.2, 1), left 0.2s cubic-bezier(0.2, 0, 0.2, 1)';
    this.ghost.style.top = `${gapRect.top}px`;
    this.ghost.style.left = `${gapRect.left}px`;

    // 3. Commit Change after animation
    setTimeout(() => {
      // Cleanup DOM
      if (this.ghost) this.ghost.remove();
      if (this.gap) this.gap.remove();
      // Temporarily show original until render overwrites, prevents flicker
      if (this.draggedItem) this.draggedItem.style.display = '';

      // Update Array
      if (newIndex !== -1 && newIndex !== this.dragStartIndex) {
        const item = this.playlist[this.dragStartIndex];

        // Remove from old
        this.playlist.splice(this.dragStartIndex, 1);

        // Insert at new
        this.playlist.splice(newIndex, 0, item);

        // Fix current index pointer
        if (this.currentIndex === this.dragStartIndex) {
          this.currentIndex = newIndex;
        } else if (
          this.currentIndex > this.dragStartIndex &&
          this.currentIndex <= newIndex
        ) {
          this.currentIndex--;
        } else if (
          this.currentIndex < this.dragStartIndex &&
          this.currentIndex >= newIndex
        ) {
          this.currentIndex++;
        }

        this.onPlaylistChange();
      }

      // Full Re-render to sanitize DOM
      this.renderItems();

      this.ghost = null;
      this.gap = null;
      this.isDragging = false;
      this.draggedItem = null;
    }, 200);
  }

  addBulk(items, append = true) {
    let addedCount = 0;
    const cleanItems = items
      .filter((i) => i && i.id)
      .map((i) => ({
        id: i.id.trim(),
        title: i.title || 'Unknown Video',
        playOnce: !!i.playOnce,
        hasPianoRoll: i.hasPianoRoll,
        songSettings: i.songSettings
          ? JSON.parse(JSON.stringify(i.songSettings))
          : undefined,
        startTime: i.startTime !== undefined ? i.startTime : undefined,
        endTime: i.endTime !== undefined ? i.endTime : undefined,
      }));

    cleanItems.forEach((item) => {
      const existing = this.playlist.find((v) => v.id === item.id);
      if (!existing) {
        if (append) {
          this.playlist.push(item);
        } else {
          this.playlist.unshift(item);
          if (this.currentIndex >= 0) this.currentIndex++;
        }
        addedCount++;
      }
    });

    if (addedCount > 0) {
      this.renderItems();
      this.onPlaylistChange();
    }
    return addedCount;
  }

  _startRename(index, row) {
    const titleEl = row.querySelector('.pl-title');
    const item = this.playlist[index];
    const currentTitle = item.title;

    const input = makeElement('input', {
      type: 'text',
      value: currentTitle,
      className: 'pl-title-input',
      style: {
        width: '100%',
        background: '#000',
        color: '#fff',
        border: '1px solid #4a90e2',
        padding: '2px 4px',
        fontSize: '12px',
        boxSizing: 'border-box',
      },
      onclick: (e) => e.stopPropagation(),
      onkeydown: (e) => {
        if (e.key === 'Enter') {
          input.blur();
        } else if (e.key === 'Escape') {
          input.value = currentTitle;
          input.blur();
        }
      },
      onblur: () => {
        const newTitle = input.value.trim();
        if (newTitle && newTitle !== currentTitle) {
          item.title = newTitle;
          this.onPlaylistChange();
        }
        input.classList.remove('pl-title-input'); // Allow it to be overwritten
        this.renderItems();
      },
    });

    titleEl.innerHTML = '';
    titleEl.appendChild(input);
    setTimeout(() => {
      input.focus();
      input.select(); // Highlight all text for instant overwrite
    }, 10);
  }

  _sortPlaylist(byFirstPart) {
    this.playlist.sort((a, b) => {
      const getParts = (title) => {
        const parts = title.split('-');
        if (parts.length > 1) {
          return [parts[0].trim(), parts.slice(1).join('-').trim()];
        }
        return [title.trim(), title.trim()];
      };
      const pA = getParts(a.title);
      const pB = getParts(b.title);

      const valA = byFirstPart ? pA[0] : pA[1];
      const valB = byFirstPart ? pB[0] : pB[1];
      return valA.localeCompare(valB);
    });
    this.renderItems();
    this.onPlaylistChange();
  }

  _toggleTimeEditor(index, row) {
    let editor = row.querySelector('.pl-time-editor');
    if (editor) {
      editor.remove();
      return;
    }
    const item = this.playlist[index];

    editor = makeElement('div', {
      className: 'pl-time-editor',
      style: {
        width: '100%',
        padding: '8px 10px',
        background: '#181818',
        boxSizing: 'border-box',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        fontSize: '11px',
        borderTop: '1px solid #222',
      },
      // Prevent clicks inside the editor from triggering the video to play
      onclick: (e) => e.stopPropagation(),
    });

    const handleKeydown = (e) => {
      if (e.key === 'Enter') {
        e.target.blur(); // Force onchange to fire and save the value
        editor.remove();
      } else if (e.key === 'Escape') {
        editor.remove();
      }
    };

    const startInput = makeElement('input', {
      type: 'number',
      placeholder: '0.0',
      value: item.startTime !== undefined ? item.startTime : '',
      style: {
        width: '60px',
        background: '#111',
        color: '#fff',
        border: '1px solid #444',
        padding: '4px',
      },
      onchange: (e) => {
        const val = parseFloat(e.target.value);
        if (isNaN(val)) {
          delete item.startTime;
        } else {
          item.startTime = val;
        }
        this.onPlaylistChange();
      },
      onkeydown: handleKeydown,
    });

    const endInput = makeElement('input', {
      type: 'number',
      placeholder: 'max',
      value: item.endTime !== undefined ? item.endTime : '',
      style: {
        width: '60px',
        background: '#111',
        color: '#fff',
        border: '1px solid #444',
        padding: '4px',
      },
      onchange: (e) => {
        const val = parseFloat(e.target.value);
        if (isNaN(val)) {
          delete item.endTime;
        } else {
          item.endTime = val;
        }
        this.onPlaylistChange();
      },
      onkeydown: handleKeydown,
    });

    editor.append(
      makeElement('span', { style: { color: '#888' } }, 'Start (s):'),
      startInput,
      makeElement(
        'span',
        { style: { color: '#888', marginLeft: '10px' } },
        'End (s):'
      ),
      endInput,
      makeElement(
        'button',
        {
          className: 'pl-btn',
          title: 'Close Editor',
          style: {
            marginLeft: 'auto',
            width: '24px',
            height: '24px',
            fontSize: '12px',
          },
          onclick: (e) => {
            e.stopPropagation();
            editor.remove();
          },
        },
        '✕'
      )
    );

    row.appendChild(editor);

    // Auto-focus the start input when opened
    setTimeout(() => startInput.focus(), 10);
  }

  _handleSaveFile() {
    const lines = this.playlist
      .filter((v) => !v.playOnce)
      .map((v) => PlaylistFormat.serializeLine(v));

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = makeElement('a', {
      href: url,
      download: 'playlist.txt',
      style: { display: 'none' },
    });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  scrollToIndex(index) {
      setTimeout(() => {
        const nodes = this.listElement.children;
        if (nodes[index]) {
          nodes[index].scrollIntoView({ behavior: 'auto', block: 'nearest' });
        }
      }, 50);
    }


  openPlaylistActionsDialog() {
      const container = makeElement('div', {
        style: 'display:flex; flex-direction:column; gap:12px; padding:10px; background:#1e1e1e; color:#eee;',
      });

      const sortSelect = makeElement('select', {
        style: 'width:100%; background:#111; color:#ccc; border:1px solid #444; font-size:11px; padding:6px 10px; border-radius:4px; cursor:pointer;',
      });

      [
        { v: '', l: 'Sort / Shuffle Playlist...' },
        { v: 'shuffle', l: '🔀 Shuffle' },
        { v: 'sort_1', l: 'Sort: Title (1st Part)' },
        { v: 'sort_2', l: 'Sort: Song (2nd Part)' },
      ].forEach((opt) => {
        sortSelect.appendChild(makeElement('option', { value: opt.v }, opt.l));
      });

      sortSelect.onchange = (e) => {
        const v = e.target.value;
        if (v === 'shuffle') this.shuffle();
        else if (v === 'sort_1') this._sortPlaylist(true);
        else if (v === 'sort_2') this._sortPlaylist(false);
        dlg.close();
      };

      const btnRow = makeElement('div', {
        style: 'display:grid; grid-template-columns:1fr 1fr; gap:8px;',
      });

      const makeActBtn = (label, cb, className = '') => {
        return makeElement('button', {
          className: 'dialog-button ' + className,
          style: 'padding:8px 12px; font-weight:bold; font-size:11px;',
          onclick: () => {
            cb();
            dlg.close();
          }
        }, label);
      };

      btnRow.append(
        makeActBtn('☁️ Save Cloud', () => this.onCloudSave(), 'primary'),
        makeActBtn('📥 Import File', () => this.onImportFile()),
        makeActBtn('💾 Export File', () => this._handleSaveFile()),
        makeActBtn('🗑 Clear All', () => {
          if (confirm('Clear all videos?')) this.clear();
        }, 'danger')
      );

      container.append(
        makeElement('div', { style: 'font-size:11px; color:#888; text-transform:uppercase; font-weight:bold;' }, 'Organize'),
        sortSelect,
        makeElement('div', { style: 'font-size:11px; color:#888; text-transform:uppercase; font-weight:bold; margin-top:5px;' }, 'Backup & Storage'),
        btnRow
      );

      const dlg = UITools.makeDialog({
        title: 'Playlist Options',
        content: container,
        width: '320px',
        appendTo: this.player.rootElement,
      });
    }

  getFilteredIndices() {
      const q = this._searchQuery || '';
      const indices = [];

      let isPlaying = false;
      const player = window.projectApp;
      if (player && player.gt && player.gt.videoPlayer) {
        isPlaying = player.gt.videoPlayer.isPlaying();
      }

      this.playlist.forEach((vid, index) => {
        const isActive = index === this.currentIndex;
        let matchesSearch = true;
        if (q) {
          const titleMatch = (vid.title || '').toLowerCase().includes(q);
          const idMatch = vid.id.toLowerCase().includes(q);
          matchesSearch = titleMatch || idMatch;
        }

        // Include in the effective playing list if it matches the search OR if it is the currently playing item
        if (matchesSearch || (isActive && isPlaying)) {
          indices.push(index);
        }
      });
      return indices;
    }

  openImportExportDialog() {
      const player = window.projectApp;
      if (!player) {
        console.error("openImportExportDialog: projectApp not found");
        return;
      }

      const container = makeElement('div', {
        style: 'display:flex; flex-direction:column; gap:16px; padding:15px; background:#1e1e1e; color:#eee; font-family:sans-serif;',
      });

      const createGroup = (title, elements) => {
        const g = makeElement('div', {
          style: 'border:1px solid #333; padding:12px; border-radius:8px; background:rgba(0,0,0,0.15); display:flex; flex-direction:column; gap:8px;',
        });
        g.append(
          makeElement('div', { style: 'font-size:11px; color:#4a90e2; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;' }, title),
          ...elements
        );
        return g;
      };

      const makeActBtn = (label, cb, className = '') => {
        return makeElement('button', {
          className: 'dialog-button ' + className,
          style: 'padding:8px 12px; font-weight:bold; font-size:12px; display:flex; align-items:center; justify-content:center; gap:6px;',
          onclick: () => {
            cb();
            dlg.close();
          }
        }, label);
      };

      // --- PLAYLIST BACKUP ---
      const playlistGroup = createGroup('📜 Playlist File Operations', [
        makeElement('div', { style: 'display:grid; grid-template-columns:1fr 1fr; gap:8px;' }, [
          makeActBtn('📤 Import Playlist', () => this.onImportFile()),
          makeActBtn('📥 Export Playlist', () => this._handleSaveFile()),
        ]),
        makeActBtn('☁️ Save Playlist to Cloud', () => this.onCloudSave(), 'primary'),
        makeActBtn('🗑 Clear Entire Playlist', () => {
          if (confirm('Are you sure you want to clear all videos from the playlist?')) this.clear();
        }, 'danger')
      ]);

      // --- PIANO ROLL BACKUP ---
      const pianoRollGroup = createGroup('🎹 Piano Roll (.txt VEQ) Operations', [
        makeElement('div', { style: 'display:grid; grid-template-columns:1fr 1fr; gap:8px;' }, [
          makeActBtn('📤 Import Piano Roll', () => {
            if (player && player.fileIOManager) player.fileIOManager.importVEQ();
          }),
          makeActBtn('📥 Export Piano Roll', () => {
            if (player && player.fileIOManager) player.fileIOManager.exportVEQ();
          }),
        ]),
        makeElement('div', { style: 'display:grid; grid-template-columns:1fr 1fr; gap:8px;' }, [
          makeActBtn('✏️ Open Text Editor', () => {
            if (player && player.advancedToolsUI) player.advancedToolsUI.openTextEditor();
          }, 'primary'),
          makeActBtn('📁 Save to Local Folder', () => {
            if (player && player.advancedToolsUI) player.advancedToolsUI.savePianoRollToFolder();
          }),
        ])
      ]);

      container.append(playlistGroup, pianoRollGroup);

      const dlg = UITools.makeDialog({
        title: 'Import / Export & Backup Manager',
        content: container,
        width: '420px',
        appendTo: player.rootElement,
      });
    }
}

