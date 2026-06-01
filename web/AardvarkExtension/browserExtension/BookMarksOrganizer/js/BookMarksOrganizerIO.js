class BookMarksOrganizerIO {
  constructor(appContext) {
    this.app = appContext;
  }

  exportBookmarks() {
    this.app.updateStatus('Exporting bookmarks...', 'neutral');
    chrome.runtime.sendMessage({ action: 'saveBookmarks' }, () => {
      this.app.updateStatus('Export triggered.', 'good');
    });
  }

  importBookmarks() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      this.app.updateStatus('Reading file...', 'neutral');
      const reader = new FileReader();

      reader.onload = (evt) => {
        const text = evt.target.result;
        this.app.updateStatus(
          'Restoring bookmarks (this may take a moment)...',
          'warn'
        );

        chrome.runtime.sendMessage(
          { action: 'restoreBookmarks', fileContents: text },
          (res) => {
            if (chrome.runtime.lastError) {
              this.app.updateStatus(
                'Error: ' + chrome.runtime.lastError.message,
                'bad'
              );
              return;
            }
            if (res && res.error) {
              this.app.updateStatus('Import failed: ' + res.error, 'bad');
            } else {
              this.app.updateStatus('Import successful!', 'good');
              this.app._refreshFromChrome();
            }
          }
        );
      };

      reader.onerror = () => {
        this.app.updateStatus('Failed to read the file.', 'bad');
      };

      reader.readAsText(file);
    };

    document.body.appendChild(input);
    input.click();
    setTimeout(() => input.remove(), 100);
  }

  toggleVault() {
    chrome.runtime.sendMessage(
      { action: 'checkIncognitoState' },
      (response) => {
        if (chrome.runtime.lastError) return;

        if (response.isOpen) {
          chrome.runtime.sendMessage({ action: 'lockIncognito' }, (res) => {
            if (res && res.success) {
              this.app.updateStatus('Vault Locked.', 'good');
              this.app._refreshFromChrome();
            }
          });
        } else {
          const pwd = prompt('Enter vault password:');
          if (pwd !== null) {
            chrome.runtime.sendMessage(
              { action: 'unlockIncognito', password: pwd },
              (res) => {
                if (res && res.success) {
                  this.app.updateStatus('Vault Unlocked.', 'good');
                  this.app._refreshFromChrome();
                } else {
                  this.app.updateStatus(
                    'Incorrect password or vault not found.',
                    'bad'
                  );
                }
              }
            );
          }
        }
      }
    );
  }

  async copyTextToClipboard(text) {
    const s = String(text ?? '');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(s);
        return true;
      }
    } catch (_) {}

    // Fallback
    try {
      const ta = document.createElement('textarea');
      ta.value = s;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '0';
      ta.style.width = '1px';
      ta.style.height = '1px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return !!ok;
    } catch (_) {}

    return false;
  }

}

