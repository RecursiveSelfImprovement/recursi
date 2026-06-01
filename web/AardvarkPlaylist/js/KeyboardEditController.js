
class KeyboardEditController {
  constructor(player) {
    this.player = player;
    this._keystrokeDisplay = null;
    this._keystrokeTimer = null;
  }

  setupGlobalSyncKeys() {
    window.addEventListener(
      'keydown',
      (e) => {
        if (
          e.target.tagName === 'INPUT' ||
          e.target.tagName === 'TEXTAREA' ||
          e.target.isContentEditable
        )
          return;

        // Purely display the global keystroke HUD (Logic is handled by KeyCommandHandler now)
        const isModifierOnly = [
          'Shift',
          'Control',
          'Alt',
          'Meta',
          'CapsLock',
        ].includes(e.key);
        if (!isModifierOnly) {
          let keyName = e.key === ' ' ? 'Space' : e.key;
          if (keyName.length === 1) keyName = keyName.toUpperCase();

          const mods = [];
          if (e.ctrlKey) mods.push('Ctrl');
          if (e.metaKey) mods.push('Meta');
          if (e.altKey) mods.push('Alt');
          if (e.shiftKey && keyName.length > 1) mods.push('Shift');
          const fullKey =
            mods.length > 0 ? `${mods.join(' + ')} + ${keyName}` : keyName;
          this.showKeystroke(fullKey);
        }
      },
      true
    );
  }

  showKeystroke(keyStr) {
    if (!this.player.videoDialog || !this.player.videoDialog.header) return;

    if (!this._keystrokeDisplay) {
      this._keystrokeDisplay = makeElement('div', {
        style: {
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.85)',
          border: '1px solid #333',
          color: '#4f4',
          padding: '2px 10px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 'bold',
          pointerEvents: 'none',
          fontFamily: 'monospace',
          zIndex: '10',
          opacity: '0',
          transition: 'opacity 0.2s',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
        },
      });
      this.player.videoDialog.header.style.position = 'relative';
      this.player.videoDialog.header.appendChild(this._keystrokeDisplay);
    }

    this._keystrokeDisplay.textContent = keyStr;
    this._keystrokeDisplay.style.opacity = '1';

    if (this._keystrokeTimer) clearTimeout(this._keystrokeTimer);
    this._keystrokeTimer = setTimeout(() => {
      if (this._keystrokeDisplay) {
        this._keystrokeDisplay.style.opacity = '0';
      }
    }, 3000);
  }

  setupEditKeys() {
    // Global UI focus dropping: Automatically un-focuses sliders and buttons after you click them.
    window.addEventListener('mouseup', (e) => {
      if (
        e.target &&
        ['INPUT', 'BUTTON', 'SELECT'].includes(e.target.tagName)
      ) {
        if (e.target.type !== 'text' && e.target.type !== 'number') {
          e.target.blur();
        }
      }
    });

    window.addEventListener('keydown', (e) => {
      const tag = e.target?.tagName;
      const type = e.target?.type;
      const isTextInput =
        tag === 'INPUT' &&
        ['text', 'number', 'password', 'email', 'search', 'url'].includes(type);
      if (isTextInput || tag === 'TEXTAREA' || e.target?.isContentEditable) {
        return;
      }

      const player = this.player.gt;
      if (!player) return;

      const key = e.key.toLowerCase();

      if (key === 's') {
        e.preventDefault();
        this.player._triggerSync();
      } else if (key === 'z' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.player._triggerUndo();
      } else if (key === 'p') {
        e.preventDefault();
        if (player.videoPlayer?.isPlaying()) player.pause();
        else player.play();
      } else if (key === 'b') {
        e.preventDefault();
        const curr = player.videoPlayer?.getCurrentRawTime() || 0;
        player.seekTo(Math.max(0, curr - 10));
      } else if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        const dur = player.videoPlayer?.getDuration() || 0;
        if (dur > 0) player.seekTo((dur * parseInt(e.key) * 10) / 100);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        this.player._triggerDelete();
      }
    });
  }

}

