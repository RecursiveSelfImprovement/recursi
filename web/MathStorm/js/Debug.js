class Debug {
  constructor() {
    this.logMessages = [];
    this.maxLogLines = 30;
    this.isVisible = false; // Start hidden

    this.speedLabel = makeElement(
      'span',
      { style: { marginLeft: '8px' } },
      '1.00×'
    );
    this.speedInput = makeElement('input', {
      type: 'range',
      min: '0',
      max: '3',
      step: '0.1',
      value: '1',
    });
    this.clearBtn = makeElement('button', {}, 'Clear Board');
    this.clearLogBtn = makeElement(
      'button',
      { style: { marginLeft: '8px' } },
      'Clear Log'
    );
    this.toggleBtn = makeElement(
      'button',
      { style: { marginLeft: '8px', fontSize: '16px' } },
      '▶' // Start with the "show" icon
    );

    // New diagnostic buttons
    this.inspectBtn = makeElement('button', {}, 'Inspect Groups');
    this.spawnBtn = makeElement(
      'button',
      { style: { marginLeft: '8px' } },
      'Spawn Eq'
    );

    const controls = makeElement(
      'div',
      {},
      makeElement(
        'h4',
        { style: { margin: '0 0 6px 0', borderBottom: '1px solid #555' } },
        'Controls'
      ),
      makeElement(
        'div',
        {},
        makeElement('label', {}, 'Speed ', this.speedInput, this.speedLabel)
      ),
      makeElement(
        'div',
        { style: { marginTop: '6px' } },
        this.clearBtn,
        this.clearLogBtn,
        this.toggleBtn
      ),
      // Add new buttons to a new row
      makeElement(
        'div',
        { style: { marginTop: '6px' } },
        this.inspectBtn,
        this.spawnBtn
      )
    );

    this.statusElement = makeElement('div', { id: 'debug-status-content' });
    this.logElement = makeElement('div', { id: 'debug-log-content' });

    const content = makeElement(
      'div',
      {
        style: {
          padding: '16px',
          height: '100%',
          boxSizing: 'border-box',
          overflow: 'auto',
        },
      },
      controls,
      makeElement(
        'h4',
        {
          style: {
            marginTop: '10px',
            marginBottom: '5px',
            borderBottom: '1px solid #555',
          },
        },
        'Live Status'
      ),
      this.statusElement,
      makeElement(
        'h4',
        {
          style: {
            marginTop: '10px',
            marginBottom: '5px',
            borderBottom: '1px solid #555',
          },
        },
        'Event Log'
      ),
      this.logElement
    );

    this.panel = makeElement(
      'div',
      {
        id: 'debug-panel',
        style: {
          position: 'fixed',
          top: '0',
          right: '0',
          width: '400px',
          height: '100vh',
          backgroundColor: 'rgba(40, 40, 60, 0.95)',
          color: 'rgb(204, 204, 204)',
          zIndex: '1000',
          borderLeft: '2px solid rgba(204, 204, 204, 0.3)',
          transition: 'transform 0.3s ease',
          transform: 'translateX(400px)', // Start off-screen
        },
      },
      content
    );

    document.body.appendChild(this.panel);

    // Setup toggle functionality
    this.toggleBtn.onclick = () => this.toggle();

    this.log('Debugger initialized.');
    this.updateStatus({ State: 'Idle' });
    this.engine = null;
  }

  log(message) {
    const timestamp = new Date().toLocaleTimeString();
    this.logMessages.push(`[${timestamp}] ${message}`);

    if (this.logMessages.length > this.maxLogLines) {
      this.logMessages.shift();
    }

    this.logElement.innerHTML = this.logMessages.join('<br>');
    this.logElement.scrollTop = this.logElement.scrollHeight;
  }

  updateStatus(statusObject) {
    let html = '<pre style="margin: 0; font-size: 12px;">';
    for (const key in statusObject) {
      html += `<strong>${key.padEnd(20, ' ')}:</strong> ${statusObject[key]}\n`;
    }
    html += '</pre>';
    this.statusElement.innerHTML = html;
  }

  formatItem(item) {
    if (!item) return 'null';
    if (item.constructor.name === 'PieceGroup') {
      const childrenStr = item.children.map((p) => p.value).join(', ');
      return `[Group: ${childrenStr}]`;
    }
    if (item.constructor.name === 'GamePiece') {
      return `[Piece: ${item.value}]`;
    }
    return 'Unknown';
  }

  attachEngine(engine) {
    this.engine = engine;
    if (typeof this.engine.speedMultiplier === 'number') {
      this.speedInput.value = String(this.engine.speedMultiplier);
      this.speedLabel.textContent = `${this.engine.speedMultiplier.toFixed(
        2
      )}×`;
    }
    this.speedInput.oninput = () => {
      const v = parseFloat(this.speedInput.value);
      if (this.engine?.setSpeed) this.engine.setSpeed(v);
      this.speedLabel.textContent = `${v.toFixed(2)}×`;
    };
    this.clearBtn.onclick = () => this.engine?.clearBoard?.();
    this.clearLogBtn.onclick = () => this.clearLog();

    // Attach new button handlers
    this.spawnBtn.onclick = () => this.engine?.spawnEquation?.();
    this.inspectBtn.onclick = () => this.inspectGroups();
  }

  clearLog() {
    this.logMessages.length = 0;
    this.logElement.innerHTML = '';
    this.log('Log cleared.');
  }

  toggle() {
    this.isVisible = !this.isVisible;
    if (this.isVisible) {
      this.panel.style.transform = 'translateX(0)';
      this.toggleBtn.textContent = '◀';
    } else {
      this.panel.style.transform = 'translateX(400px)';
      this.toggleBtn.textContent = '▶';
    }

    // Update game area width
    if (this.engine && this.engine.updateGameArea) {
      this.engine.updateGameArea();
    }
  }

  getGameAreaWidth() {
      if (this.engine && this.engine.container) {
         return this.isVisible ? this.engine.container.clientWidth - 400 : this.engine.container.clientWidth;
      }
      return this.isVisible ? window.innerWidth - 400 : window.innerWidth;
    }

  inspectGroups() {
      if (!this.engine) {
          this.log('Cannot inspect: GameEngine not attached.');
          return;
      }

      const groups = this.engine.pieces.filter((p) => p.constructor.name === 'PieceGroup');

      if (groups.length === 0) {
          this.log('No groups on screen to inspect.');
          return;
      }

      this.log(`Found ${groups.length} group(s). Opening inspectors...`);

      let cascadeX = 20;
      let cascadeY = 20;

      groups.forEach((group, index) => {
          const groupRect = group.element.getBoundingClientRect();

          let childrenHtml = `
            <table style="width:100%; border-collapse: collapse; font-size: 12px;">
              <thead style="text-align: left;">
                <tr style="background:rgba(255,255,255,0.1);">
                  <th style="padding:4px;">#</th><th style="padding:4px;">Value</th><th style="padding:4px;">Cached Size</th><th style="padding:4px;">Internal Pos</th>
                </tr>
              </thead>
              <tbody>
          `;

          group.children.forEach((child, i) => {
              childrenHtml += `
                <tr style="border-top: 1px solid #555;">
                  <td style="padding:4px;">${i}</td><td style="padding:4px;">${child.value}</td><td style="padding:4px;">${child.width}x${child.height}</td><td style="padding:4px;">${Math.round(child.x)},${Math.round(child.y)}</td>
                </tr>
              `;
          });
          childrenHtml += '</tbody></table>';

          const content = `
            <div style="font-family: monospace; font-size: 13px; color: #222;">
              <h4 style="margin-top:0; border-bottom:1px solid #777;">Group Properties</h4>
              <pre style="margin:0; padding-bottom:10px; border-bottom:1px solid #777;">
Status:       ${group.isSolved ? 'SOLVED' : 'In-Progress'}
Object Pos:   x=${group.x.toFixed(1)}, y=${group.y.toFixed(1)}
Object Size:  w=${group.width}, h=${group.height}
DOM Rect:     x=${groupRect.x.toFixed(1)}, y=${groupRect.y.toFixed(1)}
DOM Size:     w=${groupRect.width}, h=${groupRect.height}</pre>

              <h4 style="margin-top:10px; border-bottom:1px solid #777;">Layout Constants</h4>
              <pre style="margin:0; padding-bottom:10px; border-bottom:1px solid #777;">
PAD_X:        ${group.INTERNAL_PADDING_X || 8}
PAD_Y:        ${group.INTERNAL_PADDING_Y || 6}
GRAB_BAR:     ${group.GRAB_BAR_HEIGHT || 22}
GAP:          ${group.GAP || 4}</pre>
              <h4 style="margin-top:10px;">Children (${group.children.length})</h4>
              ${childrenHtml}
            </div>
          `;

          const box = UITools.makeDialog({
              env: this.env, // Ensure properly contained
              title: `Inspector: Group ${index}`,
              width: '450px',
              height: '500px',
              position: [cascadeX, cascadeY]
          });
          box.contentElement.innerHTML = content;

          cascadeX += 30;
          cascadeY += 30;
      });
    }
}

