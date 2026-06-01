
class SvgFileHandler {
  constructor() {
    this.dropOverlay = null;
    this.onFileLoaded = null;
    this.onMergeRequested = null;
  }

  init(body) {
    this.dropOverlay = makeElement(
      'div',
      { className: 'svgh-dropzone-overlay' },
      makeElement(
        'div',
        { className: 'svgh-dropzone-box' },
        makeElement(
          'svg:svg',
          {
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            'stroke-width': '1.5',
          },
          makeElement('svg:path', {
            d: 'M12 16V4m0 0L8 8m4-4l4 4M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4',
          })
        ),
        makeElement('span', 'Drop SVG file here')
      )
    );
    body.appendChild(this.dropOverlay);
    this._setupDragDrop(body);
  }

  _setupDragDrop(body) {
    let dragCounter = 0;

    body.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      if (dragCounter === 1) {
        this.dropOverlay.classList.add('active');
      }
    });

    body.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        this.dropOverlay.classList.remove('active');
      }
    });

    body.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });

    body.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      this.dropOverlay.classList.remove('active');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this._processFile(files[0]);
      }
    });
  }

  openFileDialog() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.svg,image/svg+xml';
    input.onchange = () => {
      if (input.files.length > 0) {
        this._processFile(input.files[0]);
      }
    };
    input.click();
  }

  _processFile(file) {
    if (
      !file.name.toLowerCase().endsWith('.svg') &&
      file.type !== 'image/svg+xml'
    ) {
      if (this.onError) this.onError('Please select an SVG file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'image/svg+xml');
      const error = doc.querySelector('parsererror');
      if (error) {
        if (this.onError)
          this.onError(
            'Invalid SVG file: ' + error.textContent.substring(0, 100)
          );
        return;
      }
      const svgEl = doc.querySelector('svg');
      if (!svgEl) {
        if (this.onError) this.onError('No SVG element found in file.');
        return;
      }
      if (this.onFileLoaded) {
        this.onFileLoaded(svgEl, file.name, content);
      }
    };
    reader.onerror = () => {
      if (this.onError) this.onError('Failed to read file.');
    };
    reader.readAsText(file);
  }

  static mergeSvgs(existing, incoming) {
    const clone = existing.cloneNode(true);
    const existingVb = clone.getAttribute('viewBox');
    const incomingVb = incoming.getAttribute('viewBox');

    let group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const incomingName = incoming.getAttribute('data-name') || 'merged';
    group.setAttribute('id', `merged-${incomingName}-${Date.now()}`);

    for (const child of Array.from(incoming.childNodes)) {
      if (child.nodeType === 1) {
        const tag = child.tagName.toLowerCase();
        if (tag === 'defs' || tag === 'style') {
          clone.insertBefore(child.cloneNode(true), clone.firstChild);
        } else {
          group.appendChild(child.cloneNode(true));
        }
      }
    }

    clone.appendChild(group);

    if (existingVb && incomingVb) {
      const [ex, ey, ew, eh] = existingVb.split(/[\s,]+/).map(Number);
      const [ix, iy, iw, ih] = incomingVb.split(/[\s,]+/).map(Number);
      const nx = Math.min(ex, ix);
      const ny = Math.min(ey, iy);
      const nw = Math.max(ex + ew, ix + iw) - nx;
      const nh = Math.max(ey + eh, iy + ih) - ny;
      clone.setAttribute('viewBox', `${nx} ${ny} ${nw} ${nh}`);
    }

    return clone;
  }
}

