class QRGeneratorTool {

    constructor() {
      this.dialog = null;
      this.qrContainer = null;
      this.inputField = null;
      this.sizeSelect = null;
      this.statusEl = null;
      this.downloadBtn = null;
      this.currentCanvas = null;
      this._downloadImg = null;
    }

    open(env) {
      if (this.dialog) return;

      applyCss(`
        .qrgen-body { padding: 10px; display: flex; flex-direction: column; gap: 10px; }
        .qrgen-row { display: flex; gap: 8px; align-items: center; }
        .qrgen-input {
          flex: 1; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 5px;
          font-size: 0.9em; background: #f8fafc; color: #1e293b; font-family: monospace;
        }
        .qrgen-btn {
          padding: 7px 14px; background: #3b82f6; color: white;
          border: none; border-radius: 5px; cursor: pointer; font-weight: 600;
          font-size: 0.85em; white-space: nowrap;
        }
        .qrgen-btn:hover { background: #2563eb; }
        .qrgen-btn.secondary { background: #64748b; }
        .qrgen-btn.secondary:hover { background: #475569; }
        .qrgen-btn:disabled { background: #94a3b8; cursor: default; }
        .qrgen-canvas-wrap {
          display: flex; justify-content: center; align-items: center;
          min-height: 200px; background: #f1f5f9; border-radius: 6px;
          border: 1px dashed #cbd5e1; overflow: hidden;
        }
        .qrgen-canvas-wrap canvas, .qrgen-canvas-wrap img { display: block; }
        .qrgen-status { font-size: 0.8em; color: #64748b; min-height: 1.2em; text-align: center; }
        .qrgen-size-row { display: flex; gap: 8px; align-items: center; font-size: 0.85em; color: #475569; }
        .qrgen-size-row select {
          padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px;
          background: #f8fafc; color: #1e293b; cursor: pointer;
        }
        .qrgen-ecc-row { display: flex; gap: 8px; align-items: center; font-size: 0.85em; color: #475569; }
        .qrgen-ecc-row select {
          padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px;
          background: #f8fafc; color: #1e293b; cursor: pointer;
        }
      `, 'qr-generator-tool-styles');

      this.dialog = UITools.makeDialog({
        env,
        title: '🔲 QR Code Generator',
        size: [400, 460],
        position: [100, 80],
        onClose: () => { this.dialog = null; }
      });

      const body = makeElement('div', { className: 'qrgen-body' });

      this.inputField = makeElement('input', {
        type: 'text',
        className: 'qrgen-input',
        placeholder: 'https://example.com or any text...',
        value: 'https://www.anthropic.com'
      });

      const generateBtn = makeElement('button', {
        className: 'qrgen-btn',
        onclick: () => this.generate()
      }, 'Generate');

      this.sizeSelect = document.createElement('select');
      this.sizeSelect.className = '';
      [128, 200, 256, 300, 400].forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = `${s}×${s}`;
        if (s === 256) opt.selected = true;
        this.sizeSelect.appendChild(opt);
      });

      this.eccSelect = document.createElement('select');
      [
        { label: 'Low (L)', val: 'L' },
        { label: 'Medium (M)', val: 'M' },
        { label: 'High (H)', val: 'H' },
        { label: 'Highest (Q)', val: 'Q' }
      ].forEach(({ label, val }) => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = label;
        if (val === 'M') opt.selected = true;
        this.eccSelect.appendChild(opt);
      });

      this.qrContainer = makeElement('div', { className: 'qrgen-canvas-wrap' },
        makeElement('span', { style: { color: '#94a3b8', fontSize: '0.9em' } }, 'QR code will appear here')
      );

      this.statusEl = makeElement('div', { className: 'qrgen-status' }, '');

      this.downloadBtn = makeElement('button', {
        className: 'qrgen-btn secondary',
        onclick: () => this.download()
      }, '⬇ Download PNG');
      this.downloadBtn.disabled = true;

      const sizeRow = makeElement('div', { className: 'qrgen-size-row' },
        makeElement('span', {}, 'Size:'),
        this.sizeSelect,
        makeElement('span', { style: { marginLeft: '12px' } }, 'ECC:'),
        this.eccSelect
      );

      body.appendChild(makeElement('div', { className: 'qrgen-row' }, this.inputField, generateBtn));
      body.appendChild(sizeRow);
      body.appendChild(this.qrContainer);
      body.appendChild(this.statusEl);
      body.appendChild(this.downloadBtn);

      this.dialog.contentElement.appendChild(body);

      this.inputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.generate();
      });

      setTimeout(() => this.generate(), 150);
    }

    generate() {
      if (!this.inputField) return;
      const text = this.inputField.value.trim();
      if (!text) {
        this.statusEl.textContent = 'Please enter a URL or text.';
        return;
      }

      if (typeof QRCode === 'undefined') {
        this.statusEl.textContent = 'Error: QRCode library not loaded. Check thirdParty CDN in files.json.';
        return;
      }

      const size = parseInt(this.sizeSelect.value, 10) || 256;
      const eccMap = { L: QRCode.CorrectLevel.L, M: QRCode.CorrectLevel.M, H: QRCode.CorrectLevel.H, Q: QRCode.CorrectLevel.Q };
      const ecc = eccMap[this.eccSelect.value] || QRCode.CorrectLevel.M;

      this.qrContainer.innerHTML = '';
      this.currentCanvas = null;
      this._downloadImg = null;
      this.downloadBtn.disabled = true;
      this.statusEl.textContent = 'Generating...';

      try {
        const wrapper = document.createElement('div');
        this.qrContainer.appendChild(wrapper);

        new QRCode(wrapper, {
          text: text,
          width: size,
          height: size,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: ecc
        });

        setTimeout(() => {
          const canvas = wrapper.querySelector('canvas');
          const img = wrapper.querySelector('img');
          const shortText = text.length > 55 ? text.slice(0, 52) + '...' : text;
          if (canvas) {
            this.currentCanvas = canvas;
            this.downloadBtn.disabled = false;
            this.statusEl.textContent = `✓ Ready: "${shortText}"`;
          } else if (img) {
            this._downloadImg = img;
            this.downloadBtn.disabled = false;
            this.statusEl.textContent = `✓ Ready (img): "${shortText}"`;
          } else {
            this.statusEl.textContent = '⚠ Generated but no canvas/img found in DOM.';
          }
        }, 80);

      } catch (err) {
        this.statusEl.textContent = `Error: ${err.message}`;
        console.error('[QRGeneratorTool] generate error:', err);
      }
    }

    download() {
      const text = (this.inputField ? this.inputField.value.trim() : '') || 'qrcode';
      const safeName = text.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40) || 'qrcode';
      const filename = `qr_${safeName}.png`;

      const triggerDownload = (dataURL) => {
        const a = document.createElement('a');
        a.href = dataURL;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        this.statusEl.textContent = `⬇ Saved as "${filename}"`;
      };

      if (this.currentCanvas) {
        triggerDownload(this.currentCanvas.toDataURL('image/png'));
      } else if (this._downloadImg) {
        const img = this._downloadImg;
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = img.naturalWidth || img.width || 256;
        tmpCanvas.height = img.naturalHeight || img.height || 256;
        const ctx = tmpCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        triggerDownload(tmpCanvas.toDataURL('image/png'));
      } else {
        this.statusEl.textContent = 'Nothing to download yet - generate a QR first.';
      }
    }

  }