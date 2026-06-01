class PopupController {
  constructor() {
        this.PROD_URL = 'https://recursi.dev/AardvarkPlaylist/';
        this.DEV_URL = 'http://localhost:7102/AardvarkPlaylist/';

        this.elements = {
          devModeToggle: document.getElementById('devModeToggle'),
          autoOrganizeToggle: document.getElementById('autoOrganizeToggle'),
          openAppBtn: document.getElementById('openOrganizer'),
          openBookmarkOrganizerBtn: document.getElementById(
            'openInternalOrganizer'
          ),
          statusConsole: document.getElementById('statusConsole'),

          // LLM Auto Toggles
          llmAutoChatgpt: document.getElementById('llmAutoChatgpt'),
          llmAutoClaude: document.getElementById('llmAutoClaude'),
          llmAutoStudio: document.getElementById('llmAutoStudio'),
          llmAutoGrok: document.getElementById('llmAutoGrok'),
        };
      }

  init() {
    this.log('Controller initializing...');
    this.bindEvents();
    this.loadSettings();
  }

  log(msg, type = 'ok') {
    if (!this.elements.statusConsole) return;
    const line = document.createElement('div');
    line.className = 'log-' + type;
    const time = new Date().toLocaleTimeString().split(' ')[0];
    line.textContent = `[${time}] ${msg}`;
    this.elements.statusConsole.appendChild(line);
    this.elements.statusConsole.scrollTop =
      this.elements.statusConsole.scrollHeight;
  }

  bindEvents() {
    if (this.elements.devModeToggle) {
      this.elements.devModeToggle.addEventListener('change', (e) => {
        this.saveSetting('bmo_dev_mode', e.target.checked);
      });
    }

    if (this.elements.autoOrganizeToggle) {
      this.elements.autoOrganizeToggle.addEventListener('change', (e) => {
        this.saveSetting('bmo_auto_organize', e.target.checked);
        chrome.runtime.sendMessage(
          { action: 'updateAutoOrganize', value: e.target.checked },
          () => {
            if (chrome.runtime.lastError) {
            }
          }
        );
      });
    }

    // Bind LLM Toggles
    const llmToggles = [
      { el: this.elements.llmAutoChatgpt, key: 'llm_auto_chatgpt' },
      { el: this.elements.llmAutoClaude, key: 'llm_auto_claude' },
      { el: this.elements.llmAutoStudio, key: 'llm_auto_studio' },
      { el: this.elements.llmAutoGrok, key: 'llm_auto_grok' },
    ];

    llmToggles.forEach((t) => {
      if (t.el) {
        t.el.addEventListener('change', (e) => {
          this.saveSetting(t.key, e.target.checked);
        });
      }
    });

    if (this.elements.openAppBtn) {
      this.elements.openAppBtn.addEventListener('click', () => {
        const isDev = this.elements.devModeToggle
          ? this.elements.devModeToggle.checked
          : false;
        const url = (isDev ? this.DEV_URL : this.PROD_URL) + 'index.html';
        this.log('Opening: ' + url, 'ok');
        chrome.tabs.create({ url: url });
      });
    }

    if (this.elements.openBookmarkOrganizerBtn) {
      this.elements.openBookmarkOrganizerBtn.addEventListener('click', () => {
        const url = chrome.runtime.getURL('BookMarksOrganizer/index.html');
        this.log('Opening Organizer', 'ok');
        chrome.tabs.create({ url: url });
      });
    }
  }

  loadSettings() {
    if (!chrome.storage || !chrome.storage.local) {
      this.log('Storage API unavailable', 'err');
      return;
    }

    const keys = [
      'bmo_dev_mode',
      'bmo_auto_organize',
      'llm_auto_chatgpt',
      'llm_auto_claude',
      'llm_auto_studio',
      'llm_auto_grok',
    ];

    chrome.storage.local.get(keys, (res) => {
      if (chrome.runtime.lastError) return;

      if (this.elements.devModeToggle)
        this.elements.devModeToggle.checked = !!res.bmo_dev_mode;
      if (this.elements.autoOrganizeToggle)
        this.elements.autoOrganizeToggle.checked = !!res.bmo_auto_organize;
      if (this.elements.llmAutoChatgpt)
        this.elements.llmAutoChatgpt.checked = !!res.llm_auto_chatgpt;
      if (this.elements.llmAutoClaude)
        this.elements.llmAutoClaude.checked = !!res.llm_auto_claude;
      if (this.elements.llmAutoStudio)
        this.elements.llmAutoStudio.checked = !!res.llm_auto_studio;
      if (this.elements.llmAutoGrok)
        this.elements.llmAutoGrok.checked = !!res.llm_auto_grok;

      this.log('Ready.', 'ok');
    });
  }

  saveSetting(key, value) {
    if (!chrome.storage || !chrome.storage.local) return;
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        this.log('Save Error: ' + chrome.runtime.lastError.message, 'err');
      }
    });
  }

  async injectScript(file, name) {
    this.log('Injecting ' + name + '...', 'warn');

    // Get active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab) {
      this.log('No active tab found', 'err');
      return;
    }

    // Guard against system pages
    if (
      tab.url.startsWith('chrome://') ||
      tab.url.startsWith('edge://') ||
      tab.url.startsWith('about:')
    ) {
      this.log('Cannot run on system pages.', 'err');
      return;
    }

    // Send to Background
    chrome.runtime.sendMessage(
      {
        action: 'injectScript',
        tabId: tab.id,
        className: name, // Just send the class name, background handles the files
      },
      (response) => {
        if (chrome.runtime.lastError) {
          this.log('Error: ' + chrome.runtime.lastError.message, 'err');
          return;
        }

        if (response && response.success) {
          this.log(name + ' started!', 'ok');
          // Optional: Close popup to let user see the tool
          setTimeout(() => window.close(), 1200);
        } else {
          this.log('Failed: ' + (response.error || 'Unknown error'), 'err');
        }
      }
    );
  }

}

