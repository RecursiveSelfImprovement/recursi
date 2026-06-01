
class WelcomeDialogUI {
  
  constructor(player) {
    this.player = player;
    this.dialog = null;
  }

  show() {
      if (this.dialog) {
        this.dialog.setZOnTop();
        return;
      }
  
      const vw = window.innerWidth;
      let dialogWidth;
      if (vw >= 1100) dialogWidth = 820;
      else if (vw >= 800) dialogWidth = 700;
      else if (vw >= 560) dialogWidth = 540;
      else dialogWidth = Math.min(vw - 20, 500);
  
      const isWide = dialogWidth >= 640;
  
      const ua = navigator.userAgent;
      const vendor = navigator.vendor || '';
      let browser = null;
      if (/Edg\//.test(ua)) browser = 'Edge';
      else if (/Firefox\//.test(ua)) browser = 'Firefox';
      else if (/Chrome\//.test(ua) && /Google Inc/.test(vendor))
        browser = 'Chrome';
  
      const ICON_BASE = 'https://recursi.dev/SiteResources/frontPage/';
      const AARDVARK_ICON = ICON_BASE + 'vark.png';
      const BROWSER_ICONS = {
        Chrome: ICON_BASE + 'chrome.png',
        Firefox: ICON_BASE + 'firefox.png',
        Edge: ICON_BASE + 'edge.png',
      };
  
      const wrapper = makeElement('div', {
        style:
          'max-height: 80vh; overflow-y: auto; padding: 14px 18px 18px 18px; color: #eee; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.5; box-sizing: border-box; position: relative;',
      });
  
      const hero = makeElement('div', {
        style: isWide
          ? 'display: grid; grid-template-columns: 200px 1fr; gap: 18px; align-items: center; margin-bottom: 18px; position: relative;'
          : 'display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 18px; position: relative;',
      });
  
      const aardvarkWrap = makeElement('div', {
        style: isWide
          ? 'position: relative; width: 200px; height: 180px; margin-left: -30px; margin-top: -10px; margin-bottom: -10px;'
          : 'position: relative; width: 140px; height: 140px;',
      });
      const aardvarkImg = makeElement('img', {
        src: AARDVARK_ICON,
        alt: 'Aardvark',
        style:
          'width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.6));',
      });
      aardvarkWrap.appendChild(aardvarkImg);
  
      const heroRight = makeElement('div', {
        style: 'display: flex; flex-direction: column; gap: 10px; min-width: 0;',
      });
  
      const titleBlock = makeElement('div', {});
      titleBlock.appendChild(
        makeElement(
          'h2',
          {
            style:
              'margin: 0 0 4px 0; color: #4a90e2; font-size: 22px; line-height: 1.15;',
          },
          'Welcome to Aardvark Playlist!'
        )
      );
      titleBlock.appendChild(
        makeElement(
          'div',
          { style: 'font-size: 13px; color: #aaa;' },
          'Your ad-free, curated YouTube companion.'
        )
      );
      heroRight.appendChild(titleBlock);
  
      const playBtn = makeElement(
        'button',
        {
          className: 'dialog-button primary',
          style:
            'padding: 10px 14px; font-size: 15px; font-weight: bold; text-align: left;',
        },
        '▶ Watch 1-Minute Intro Video'
      );
      playBtn.onclick = () => {
        if (this.dialog) this.dialog.close();
        if (this.player.playlistManager) {
          this.player.playlistManager.add(
            'dQw4w9WgXcQ',
            'Aardvark: 1-Minute Intro',
            true,
            true
          );
          this.player.playlistManager.setCurrentIndex(0);
          this.player._playVideo(this.player.playlistManager.playlist[0], 0);
        }
      };
      heroRight.appendChild(playBtn);
  
      if (browser) {
        const extBtn = makeElement('button', {
          className: 'dialog-button',
          style:
            'padding: 8px 12px; font-weight: bold; display: flex; align-items: center; gap: 10px; text-align: left;',
        });
        extBtn.appendChild(
          makeElement('img', {
            src: BROWSER_ICONS[browser],
            alt: browser,
            style:
              'width: 20px; height: 20px; object-fit: contain; flex-shrink: 0;',
          })
        );
        extBtn.appendChild(
          makeElement('span', {}, `Install Extension for ${browser}`)
        );
        extBtn.onclick = () => {
          window.open(
            '/AardvarkExtension/install.html?browser=' +
              encodeURIComponent(browser),
            '_blank'
          );
        };
        heroRight.appendChild(extBtn);
      }
  
      hero.append(aardvarkWrap, heroRight);
      wrapper.appendChild(hero);
  
      const grid = makeElement('div', {
        style: isWide
          ? 'display: grid; grid-template-columns: 1.3fr 1fr; gap: 14px; align-items: start;'
          : 'display: flex; flex-direction: column; gap: 14px;',
      });
      wrapper.appendChild(grid);
  
      const perksBox = makeElement('div', {
        style:
          'background: #1e1e1e; padding: 14px; border-radius: 6px; border: 1px solid #333; display: flex; flex-direction: column; gap: 10px;',
      });
      perksBox.appendChild(
        makeElement('p', {
          style: 'margin: 0;',
          innerHTML:
            "🤫 <b>Watch Without Ads:</b> Purely within the Terms of Service - YouTube doesn't serve ads when embedded on external sites. A great hack to avoid ads while still getting YouTube's recommendations.",
        })
      );
      perksBox.appendChild(
        makeElement('p', {
          style: 'margin: 0;',
          innerHTML:
            '👪 <b>Curate for Kids:</b> Parents can curate a safe playlist of approved videos so kids never actually go to YouTube at all.',
        })
      );
      perksBox.appendChild(
        makeElement('p', {
          style: 'margin: 0;',
          innerHTML:
            '✨ <b>So much more:</b> Save playlists on your computer, share them with friends, edit them as text files, and the list goes on.',
        })
      );
      grid.appendChild(perksBox);
  
      const rightCol = makeElement('div', {
        style: 'display: flex; flex-direction: column; gap: 12px;',
      });
  
      const glowBox = makeElement('div', {
        style:
          'padding: 12px; border: 1px dashed #4a90e2; background: rgba(74, 144, 226, 0.05); border-radius: 6px; display: flex; align-items: center; gap: 12px;',
      });
      const graphicPlaceholder = makeElement(
        'div',
        {
          style:
            'width: 60px; height: 60px; background: #222; border: 1px solid #444; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 28px; flex-shrink: 0;',
        },
        '🎹'
      );
      const glowText = makeElement('div', {
        style: 'font-size: 12px; flex: 1; min-width: 0;',
      });
      glowText.appendChild(
        makeElement(
          'b',
          { style: 'color: #4a90e2; display: block; margin-bottom: 4px;' },
          'Piano Roll ("GlowTunes")'
        )
      );
      glowText.appendChild(
        makeElement(
          'span',
          {},
          'Click a video with piano in it and watch a 3D piano roll unfold. Play along with an electronic keyboard.'
        )
      );
      glowBox.append(graphicPlaceholder, glowText);
      rightCol.appendChild(glowBox);
  
      const midiRow = makeElement('div', {
        style:
          'display: flex; gap: 10px; align-items: center; background: #1a1a1a; padding: 10px; border-radius: 4px; flex-wrap: wrap;',
      });
      midiRow.appendChild(
        makeElement(
          'span',
          { style: 'flex: 1; min-width: 140px; font-size: 12px;' },
          'Got a MIDI Keyboard? Connect it to play along.'
        )
      );
      const isMidiOn = this.player.state.settings.midiEnabled;
      const midiBtn = makeElement(
        'button',
        {
          className: 'dialog-button',
          style: `padding: 6px 12px; font-weight: bold; background: ${
            isMidiOn ? '#2ecc71' : '#444'
          };`,
        },
        isMidiOn ? '✅ On' : 'Enable'
      );
      midiBtn.onclick = () => {
        localStorage.setItem('aardvark_midi_prompted', 'true');
        if (this.player.midiInputManager) {
          this.player.midiInputManager.setupMidi(true);
          midiBtn.textContent = '✅ On';
          midiBtn.style.background = '#2ecc71';
          this.player.setStatus('MIDI Input Enabled.', '#4f4');
        }
      };
      midiRow.appendChild(midiBtn);
      rightCol.appendChild(midiRow);
  
      const playlistBox = makeElement('div', {
        style:
          'display: flex; flex-direction: column; gap: 6px; background: #1a1a1a; padding: 10px; border-radius: 4px;',
      });
      playlistBox.appendChild(
        makeElement('b', { style: 'font-size: 12px;' }, 'Starter Playlist:')
      );
  
      const playlistRow = makeElement('div', {
        style: 'display: flex; gap: 8px; align-items: center;',
      });
  
      const plSelect = this.player.playlistSelectorUI.createDropdown();
      playlistRow.append(plSelect);
      playlistBox.appendChild(playlistRow);
      rightCol.appendChild(playlistBox);
  
      grid.appendChild(rightCol);
  
      wrapper.appendChild(
        makeElement('p', {
          style:
            'font-size: 11px; color: #888; text-align: center; margin: 14px 0 0 0;',
          innerHTML:
            "Something you don't like about this app? You can use Recursi to improve it <b><i>any way you can imagine</i></b>, even if you don't know how to program.",
        })
      );
  
      this.dialog = UITools.makeDialog({
        env: this.player.env, // Bind to player environment
        title: 'Getting Started',
        content: wrapper,
        width: dialogWidth + 'px',
        appendTo: this.player.rootElement,
        onClose: () => {
          this.dialog = null;
        },
      });
  
      if (
        this.player.playlistManager &&
        this.player.playlistManager.playlist.length === 0 &&
        !this.player.state.settings.lastPlaylistUrl &&
        !this.player.state.settings.playlistModified
      ) {
        this.player._fetchAndLoadPlaylist('/playlists/pianoSongs.txt', 'replace');
      }
    }

}

