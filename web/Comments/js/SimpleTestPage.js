class SimpleTestPage {
  constructor() {
    this.root = document.getElementById('simpletest-root');
    this.defaultBaseUrl = 'https://recursi.dev/commentsApi/simpletest.php';
    this.render();
  }

  render() {
    this.root.innerHTML = '';

    const title = this.make('h1', {}, 'Simple Cross-Origin PHP Probe');

    const note = this.make(
      'div',
      {
        style:
          'color:#a6b0c3; margin-bottom:16px; line-height:1.5;'
      },
      'This page does not touch the comments system. It only talks to simpletest.php and reads/writes a plain text file.'
    );

    const panel = this.make('div', {
      style:
        'background:#20242b; border:1px solid #3a4353; border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:14px;'
    });

    const urlRow = this.make('div', {
      style: 'display:flex; align-items:center; gap:12px;'
    });
    urlRow.appendChild(this.make('label', { style: 'min-width:90px; color:#a6b0c3;' }, 'API URL'));

    this.apiInput = this.make('input', {
      type: 'text',
      value: this.defaultBaseUrl,
      style:
        'flex:1; padding:10px; border-radius:8px; border:1px solid #3a4353; background:#15171b; color:#eef3ff; font-family:monospace;'
    });
    urlRow.appendChild(this.apiInput);

    const buttonRow = this.make('div', {
      style: 'display:flex; gap:10px; flex-wrap:wrap;'
    });

    this.pingBtn = this.makeButton('Ping', () => this.handlePing());
    this.readBtn = this.makeButton('Read File', () => this.handleRead());
    this.appendBtn = this.makeButton('Append Timestamp', () => this.handleAppend());
    this.writeBtn = this.makeButton('Overwrite File', () => this.handleWrite());

    buttonRow.append(this.pingBtn, this.readBtn, this.appendBtn, this.writeBtn);

    this.editor = this.make('textarea', {
      style:
        'width:100%; min-height:140px; padding:12px; border-radius:8px; border:1px solid #3a4353; background:#15171b; color:#eef3ff; font-family:monospace; box-sizing:border-box;',
      placeholder: 'Text to write or append...'
    });
    this.editor.value = 'Hello from localhost at ' + new Date().toISOString() + '\n';

    this.output = this.make('pre', {
      style:
        'margin:0; min-height:220px; max-height:500px; overflow:auto; padding:12px; border-radius:8px; border:1px solid #3a4353; background:#0e1116; color:#cfe3ff; white-space:pre-wrap; word-break:break-word;'
    }, 'Ready.');

    panel.append(urlRow, buttonRow, this.editor, this.output);
    this.root.append(title, note, panel);
  }

  make(tag, attrs = {}, text = null) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined) continue;
      el.setAttribute(key, value);
    }
    if (text !== null) el.textContent = text;
    return el;
  }

  makeButton(label, onclick) {
    const btn = this.make('button', {
      type: 'button',
      style:
        'padding:10px 14px; border-radius:8px; border:1px solid #3a4353; background:#58a6ff; color:#08111f; font-weight:700; cursor:pointer;'
    }, label);
    btn.addEventListener('click', onclick);
    return btn;
  }

  getBaseUrl() {
    return this.apiInput.value.trim() || this.defaultBaseUrl;
  }

  async request(url, options = {}) {
    this.output.textContent = 'Requesting...\n' + url;

    const response = await fetch(url, options);
    const rawText = await response.text();

    let parsed = null;
    try {
      parsed = JSON.parse(rawText);
    } catch (error) {}

    this.output.textContent =
      'URL:\n' + url + '\n\n' +
      'Status: ' + response.status + ' ' + response.statusText + '\n\n' +
      'Raw response:\n' + rawText + '\n\n' +
      'Parsed:\n' + JSON.stringify(parsed, null, 2);

    return { response, rawText, parsed };
  }

  async handlePing() {
    const url = this.getBaseUrl() + '?action=ping&_cacheBust=' + Date.now();
    await this.request(url);
  }

  async handleRead() {
    const url = this.getBaseUrl() + '?action=read&_cacheBust=' + Date.now();
    const result = await this.request(url);
    if (result.parsed && result.parsed.success && typeof result.parsed.text === 'string') {
      this.editor.value = result.parsed.text;
    }
  }

  async handleWrite() {
    const url = this.getBaseUrl() + '?action=write&_cacheBust=' + Date.now();
    await this.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: this.editor.value
      })
    });
  }

  async handleAppend() {
    const url = this.getBaseUrl() + '?action=append&_cacheBust=' + Date.now();
    const line = 'Appended from localhost at ' + new Date().toISOString() + '\n';
    await this.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: line
      })
    });
  }


  async run(env) {
      this.env = env;
      this.root = env.container;
      this.render();
      return this;
    }
}

