class TemperatureVote {
  async run(env) {
      if (!env || !env.container) {
        throw new Error("[TemperatureVote] Requires an environment container.");
      }
      this.env = env;
      const targetElement = env.container;

      // Reset DOM state
      targetElement.innerHTML = '';

      // Initialize state variables
      this.totalVoterCount = 11; // Default total size (includes user)
      this.userHasVoted = false;
      this.userTemp = 72.0;
      this.isDragging = false;
      this.hoveredVoterId = null;

      // Generate randomized initial other voters
      this.generateVoters();

      // Apply updated CSS styles
      this.setupStyles();

      // Render the structural layout
      this.renderLayout(targetElement);

      // Attach mouse & touch tracking on the thermostat SVG
      this.setupThermostatInteraction();

      // First layout computation
      this.update();
    }

  setupStyles() {
      applyCss(`
        body, html {
          margin: 0 !important;
          padding: 0 !important;
          background-color: #0f172a !important;
          overflow-x: hidden;
        }

        .tv-app-container {
          background-color: #0f172a;
          color: #f8fafc;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 12px; /* Tighter padding to save vertical space */
          min-height: 100vh;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .tv-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          align-items: stretch;
        }

        @media (min-width: 1024px) {
          .tv-grid {
            grid-template-columns: 1fr 310px; /* Compress right column slightly */
          }
        }

        .tv-card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 10px;
          padding: 12px; /* Compressed card padding */
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
        }

        .tv-card-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: #f8fafc;
          border-bottom: 1px solid #334155;
          padding-bottom: 6px;
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .tv-thermostat-pane {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
        }

        .tv-svg-wrap {
          position: relative;
          width: 100%;
          max-width: 480px; /* Expanded for greater visibility */
          aspect-ratio: 1;
          margin: 0 auto;
        }

        .tv-thermostat-svg {
          width: 100%;
          height: 100%;
          display: block;
          user-select: none;
        }

        .tv-tooltip {
          position: absolute;
          background: rgba(15, 23, 42, 0.95);
          border: 1.5px solid #3b82f6;
          border-radius: 6px;
          padding: 5px 8px;
          font-size: 0.72rem;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.12s ease, transform 0.12s ease;
          z-index: 100;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
          color: #f8fafc;
          width: 140px;
        }

        .tv-voters-panel {
          height: 100%;
          display: flex;
          flex-direction: column;
          max-height: 520px; /* Constrain max height to save screen space */
        }

        .tv-voters-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex-grow: 1;
          overflow-y: auto;
          overflow-x: hidden !important; /* Strictly lock horizontal overflow to stop jiggling */
          padding-right: 2px;
          box-sizing: border-box;
        }

        .tv-voter-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #182235;
          border: 1px solid #273549;
          border-radius: 6px;
          padding: 4px 8px;
          box-sizing: border-box;
          width: 100% !important;
          overflow: hidden !important;
          transition: all 0.1s ease;
        }

        .tv-voter-item.tv-active {
          border-color: #3b82f6;
          background: #1e2e4a;
        }

        .tv-voter-info {
          display: flex;
          align-items: center;
          gap: 4px;
          min-width: 0; /* Enable flex-truncation */
        }

        .tv-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .tv-voter-name {
          font-size: 0.75rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100px;
        }

        .tv-voter-temp-badge {
          font-size: 0.75rem;
          font-weight: 700;
          font-family: monospace;
          background: #0f172a;
          padding: 1px 3px;
          border-radius: 3px;
          border: 1px solid #334155;
          min-width: 42px;
          text-align: right;
          flex-shrink: 0;
        }

        .tv-voter-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 70px;
          height: 3px;
          border-radius: 2px;
          background: #334155;
          outline: none;
          flex-shrink: 0;
        }

        .tv-voter-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #10b981;
          cursor: pointer;
        }

        .tv-metric-card {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          width: 100%;
          margin-top: 6px;
        }

        .tv-stat {
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 8px;
          padding: 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .tv-stat-label {
          font-size: 0.65rem;
          font-weight: bold;
          color: #94a3b8;
          text-transform: uppercase;
          margin-bottom: 1px;
        }

        .tv-stat-val {
          font-size: 1.15rem;
          font-weight: 800;
          font-family: monospace;
        }

        .tv-stable-pill, .tv-unstable-pill {
          font-size: 0.6rem;
          font-weight: bold;
          padding: 1px 5px;
          border-radius: 99px;
          margin-top: 2px;
        }

        .tv-stable-pill {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .tv-unstable-pill {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .tv-spectrum-bar-container {
          position: relative;
          background: #0f172a;
          height: 24px;
          border-radius: 6px;
          border: 1px solid #334155;
          margin-top: 6px;
          margin-bottom: 6px;
          overflow: visible;
        }

        .tv-spectrum-label-left, .tv-spectrum-label-right {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          font-size: 0.65rem;
          color: #64748b;
          pointer-events: none;
        }

        .tv-spectrum-label-left { left: 8px; }
        .tv-spectrum-label-right { right: 8px; }

        .tv-spectrum-tick {
          position: absolute;
          width: 3px;
          height: 10px;
          top: 7px;
          border-radius: 1px;
        }

        .tv-spectrum-indicator-line {
          position: absolute;
          width: 2px;
          height: 18px;
          top: 3px;
        }

        .tv-explanation-section {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          font-size: 0.8rem;
          line-height: 1.4;
          color: #cbd5e1;
        }

        @media (min-width: 768px) {
          .tv-explanation-section {
            grid-template-columns: 1fr 1fr;
          }
        }

        .tv-select {
          background: #0f172a;
          color: #f8fafc;
          border: 1px solid #475569;
          padding: 2px 4px;
          border-radius: 4px;
          font-size: 0.75rem;
          cursor: pointer;
        }

        .tv-btn-action {
          background: #334155;
          color: #f8fafc;
          border: none;
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 0.7rem;
          font-weight: bold;
          cursor: pointer;
        }
      `, 'tv-app-theme');
    }

  renderLayout(parent) {
      this.appContainer = makeElement('div', { className: 'tv-app-container' });

      // Build Top Grid
      const grid = makeElement('div', { className: 'tv-grid' });

      // Left Column: Thermostat Panel & Dial
      const leftCol = makeElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } });

      const dialCard = makeElement('div', { className: 'tv-card tv-thermostat-pane' }, [
        makeElement('div', { className: 'tv-card-title' }, [
          makeElement('span', 'Thermostat Core'),
          makeElement('span', { style: { fontSize: '0.75rem', color: '#94a3b8' } }, 'Drag Blue dot onto the dial')
        ]),
        this.svgWrap = makeElement('div', { className: 'tv-svg-wrap' }),
        this.tooltipEl = makeElement('div', { className: 'tv-tooltip' }),
        
        makeElement('div', { className: 'tv-metric-card' }, [
          this.medianStatBlock = makeElement('div', { className: 'tv-stat' }, [
            makeElement('span', { className: 'tv-stat-label' }, 'Median Decision'),
            this.medianValText = makeElement('span', { className: 'tv-stat-val', style: { color: '#f59e0b' } }, '72.0°F'),
            makeElement('span', { className: 'tv-stable-pill' }, '🛡️ Game-Theory Stable')
          ]),
          this.averageStatBlock = makeElement('div', { className: 'tv-stat' }, [
            makeElement('span', { className: 'tv-stat-label' }, 'Mean Average'),
            this.averageValText = makeElement('span', { className: 'tv-stat-val', style: { color: '#ef4444' } }, '72.3°F'),
            makeElement('span', { className: 'tv-unstable-pill' }, '⚠️ Highly Exploitable')
          ])
        ])
      ]);
      leftCol.appendChild(dialCard);

      // Right Column: Tall Room Voters List
      const rightCol = makeElement('div', { className: 'tv-card tv-voters-panel' }, [
        makeElement('div', { className: 'tv-card-title' }, [
          makeElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [
            makeElement('span', 'Voters Count:'),
            this.voterCountSelect = makeElement('select', {
              className: 'tv-select',
              onchange: (e) => {
                this.totalVoterCount = parseInt(e.target.value);
                this.generateVoters();
                this.update();
              }
            }, [
              makeElement('option', { value: '5' }, '5 Voters (Odd)'),
              makeElement('option', { value: '10' }, '10 Voters (Even)'),
              makeElement('option', { value: '11', selected: true }, '11 Voters (Odd)'),
              makeElement('option', { value: '20' }, '20 Voters (Even)'),
              makeElement('option', { value: '21' }, '21 Voters (Odd)')
            ])
          ]),
          makeElement('button', {
            className: 'tv-btn-action',
            onclick: () => this.randomizeVotes()
          }, 'Randomize Preferences')
        ]),
        this.votersListContainer = makeElement('div', { className: 'tv-voters-list' })
      ]);

      grid.appendChild(leftCol);
      grid.appendChild(rightCol);
      this.appContainer.appendChild(grid);

      // Spectrum Plot and Explanation blocks positioned below for clean spacing
      const bottomRow = makeElement('div', { className: 'tv-card', style: { marginTop: '8px' } }, [
        makeElement('div', { className: 'tv-card-title' }, 'Distribution Spectrum (60°F - 85°F)'),
        this.spectrumBarContainer = makeElement('div', { className: 'tv-spectrum-bar-container' }, [
          makeElement('div', { className: 'tv-spectrum-label-left' }, '60°F'),
          makeElement('div', { className: 'tv-spectrum-label-right' }, '85°F')
        ]),
        this.influenceTextContainer = makeElement('div', {
          style: { fontSize: '0.825rem', color: '#cbd5e1', lineHeight: '1.4', background: '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid #334155' }
        })
      ]);
      this.appContainer.appendChild(bottomRow);

      const gameTheoryExplainCard = makeElement('div', { className: 'tv-card', style: { marginTop: '8px' } }, [
        makeElement('div', { className: 'tv-card-title' }, 'The Game Theory of Median Voting'),
        makeElement('div', { className: 'tv-explanation-section' }, [
          makeElement('div', {}, [
            makeElement('p', { style: { marginBottom: '8px' } }, [
              makeElement('strong', { style: { color: '#ef4444' } }, '1. The Vulnerability of Averages: '),
              'Under Average Voting, individuals are incentivized to vote for extreme values (like 120°F or 40°F) to drag the team decision closer to their actual preference. This causes the group consensus system to quickly break down into wild exaggeration spirals.'
            ])
          ]),
          makeElement('div', {}, [
            makeElement('p', { style: { marginBottom: '8px' } }, [
              makeElement('strong', { style: { color: '#f59e0b' } }, '2. The Stability of the Median: '),
              'Under Median Voting, the outcome is the middle-most value. Voting any value higher or lower than the median has exactly the same marginal weight. There is zero tactical reward to exaggerating your preference. Honest representation is the dominant Nash Equilibrium!'
            ])
          ])
        ])
      ]);
      this.appContainer.appendChild(gameTheoryExplainCard);

      parent.appendChild(this.appContainer);

      // Draw the static circular elements of the thermostat SVG
      this.drawThermostatSvg();
    }

  drawThermostatSvg() {
      this.svgWrap.innerHTML = '';

      // Main viewport configuration
      this.svgElement = this.makeSvg('svg', {
        viewBox: '0 0 400 400',
        className: 'tv-thermostat-svg'
      });

      // Outer bezel circle
      const bezel = this.makeSvg('circle', {
        cx: '200',
        cy: '200',
        r: '175',
        fill: '#1e293b',
        stroke: '#334155',
        'stroke-width': '5',
        style: 'filter: drop-shadow(0px 6px 12px rgba(0,0,0,0.35))'
      });
      this.svgElement.appendChild(bezel);

      // Inner screen background
      const screen = this.makeSvg('circle', {
        cx: '200',
        cy: '200',
        r: '124',
        fill: '#090d16',
        stroke: '#273549',
        'stroke-width': '1.5'
      });
      this.svgElement.appendChild(screen);

      // Subtle trace track for dial range [60F to 85F]
      const dialTrack = this.makeSvg('path', {
        d: 'M 99.6 300.4 A 142 142 0 1 1 300.4 300.4',
        fill: 'none',
        stroke: '#161f30',
        'stroke-width': '8',
        'stroke-linecap': 'round'
      });
      this.svgElement.appendChild(dialTrack);

      // Draw static socket reservoir for uncast vote
      const reservoirSocket = this.makeSvg('circle', {
        cx: '200',
        cy: '345',
        r: '16',
        fill: '#090d16',
        stroke: '#273549',
        'stroke-width': '2',
        'stroke-dasharray': '3 3'
      });
      this.svgElement.appendChild(reservoirSocket);

      const reservoirLabel = this.makeSvg('text', {
        x: '200',
        y: '349',
        fill: '#475569',
        'font-size': '8px',
        'font-weight': 'bold',
        'text-anchor': 'middle'
      }, ['DRAG']);
      this.svgElement.appendChild(reservoirLabel);

      // Dynamic graphic layer
      this.dynamicSvgGroup = this.makeSvg('g');
      this.svgElement.appendChild(this.dynamicSvgGroup);

      // Center typography reading indicators
      this.centerDisplayGroup = this.makeSvg('g');
      this.svgElement.appendChild(this.centerDisplayGroup);

      this.svgWrap.appendChild(this.svgElement);
    }

  setupThermostatInteraction() {
      const handleStart = (e) => {
        this.isDragging = true;
        handleMove(e);
      };

      const handleMove = (e) => {
        if (!this.isDragging) return;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const rect = this.svgElement.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        // Map mouse coordinates inside relative 400x400 SVG box
        const svgX = (x / rect.width) * 400;
        const svgY = (y / rect.height) * 400;

        // Calculate radial distance from center (200, 200)
        const dx = svgX - 200;
        const dy = svgY - 200;
        const rDistance = Math.sqrt(dx * dx + dy * dy);

        // Check snapping / popping boundary state rules
        if (!this.userHasVoted) {
          // Snap on if dragged near the circular dial track (Radius 142)
          if (rDistance > 110 && rDistance < 170) {
            this.userHasVoted = true;
          }
        } else {
          // Pop back to reservoir if user drags too far out or too far in
          if (rDistance < 90 || rDistance > 185) {
            this.userHasVoted = false;
            this.hideTooltip();
          }
        }

        if (this.userHasVoted) {
          this.userTemp = this.getTempFromCoords(svgX, svgY, 200, 200);
        }

        this.update();
      };

      const handleEnd = () => {
        this.isDragging = false;
      };

      this.svgElement.addEventListener('mousedown', handleStart);
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);

      // Multi-touch handler bindings
      this.svgElement.addEventListener('touchstart', handleStart, { passive: false });
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }

  getTempFromCoords(mx, my, cx, cy) {
      const dx = mx - cx;
      const dy = my - cy;
      let angle = Math.atan2(dy, dx);

      if (angle < 0.5 * Math.PI) {
        angle += 2 * Math.PI;
      }

      const clampedAngle = Math.max(0.75 * Math.PI, Math.min(2.25 * Math.PI, angle));
      const fraction = (clampedAngle - 0.75 * Math.PI) / (1.5 * Math.PI);
      const temp = 60.0 + fraction * (85.0 - 60.0);
      return Math.round(temp * 10) / 10;
    }

  updateUserVote(temp) {
    const user = this.voters.find(v => v.isUser);
    if (user) {
      user.temp = temp;
      this.update();
    }
  }

  randomizeVotes() {
      this.voters.forEach(v => {
        v.temp = Math.round((62.0 + Math.random() * 20.0) * 10) / 10; // Comfort zone randomize
      });
      this.update();
    }

  update() {
      // 1. Calculations
      const activeVotersList = [...this.voters];
      if (this.userHasVoted) {
        activeVotersList.push({
          id: 'user',
          name: 'You (Your Vote)',
          temp: this.userTemp,
          isUser: true,
          color: '#3b82f6'
        });
      }

      // Sort current cast votes to compute standard Median
      const poolSorted = [...activeVotersList].sort((a, b) => a.temp - b.temp);
      const M = poolSorted.length;

      let medianTemp = 72.0;
      let medianIds = []; // Track the unique voter ID(s) shaping the median split

      if (M > 0) {
        if (M % 2 !== 0) {
          // Odd: single middle element
          const mid = Math.floor(M / 2);
          medianTemp = poolSorted[mid].temp;
          medianIds = [poolSorted[mid].id];
        } else {
          // Even: average of the two middle elements
          const mid1 = (M / 2) - 1;
          const mid2 = M / 2;
          medianTemp = (poolSorted[mid1].temp + poolSorted[mid2].temp) / 2;
          // Both voters share the active median decision influence
          medianIds = [poolSorted[mid1].id, poolSorted[mid2].id];
        }
      }

      // Compute standard Mean Average
      const sumTemps = activeVotersList.reduce((sum, v) => sum + v.temp, 0);
      const averageTemp = M > 0 ? Math.round((sumTemps / M) * 10) / 10 : 72.0;

      // Compute Marginal influence differences
      const others = [...this.voters];
      const othersSorted = [...others].sort((a, b) => a.temp - b.temp);
      const N = othersSorted.length;

      // Median without user
      let medianWithoutUser = 72.0;
      if (N % 2 !== 0) {
        medianWithoutUser = othersSorted[Math.floor(N / 2)].temp;
      } else {
        medianWithoutUser = (othersSorted[(N / 2) - 1].temp + othersSorted[N / 2].temp) / 2;
      }

      const userMedianInfluence = this.userHasVoted ? (medianTemp - medianWithoutUser) : 0;

      // Average without user
      const sumOthers = others.reduce((sum, v) => sum + v.temp, 0);
      const averageWithoutUser = sumOthers / N;
      const userAverageInfluence = this.userHasVoted ? (averageTemp - averageWithoutUser) : 0;

      // Update basic status text
      this.medianValText.textContent = `${medianTemp.toFixed(1)}°F`;
      this.averageValText.textContent = `${averageTemp.toFixed(1)}°F`;

      // 2. Clear dynamic SVG layers
      this.dynamicSvgGroup.innerHTML = '';
      this.centerDisplayGroup.innerHTML = '';

      // Re-add scale dial ticks
      for (let temp = 60; temp <= 85; temp += 1) {
        const theta = 0.75 * Math.PI + ((temp - 60) / (85 - 60)) * 1.5 * Math.PI;
        const isMajor = (temp % 5 === 0);

        const rStart = isMajor ? 116 : 124;
        const rEnd = 132;

        const x1 = 200 + rStart * Math.cos(theta);
        const y1 = 200 + rStart * Math.sin(theta);
        const x2 = 200 + rEnd * Math.cos(theta);
        const y2 = 200 + rEnd * Math.sin(theta);

        const tick = this.makeSvg('line', {
          x1, y1, x2, y2,
          stroke: isMajor ? '#475569' : '#1a2436',
          'stroke-width': isMajor ? '2' : '1'
        });
        this.dynamicSvgGroup.appendChild(tick);

        if (isMajor) {
          const textRadius = 104;
          const tx = 200 + textRadius * Math.cos(theta);
          const ty = 200 + textRadius * Math.sin(theta);

          const tickText = this.makeSvg('text', {
            x: tx,
            y: ty + 3.5,
            fill: '#475569',
            'font-size': '9px',
            'font-weight': 'bold',
            'text-anchor': 'middle',
            'font-family': 'monospace'
          }, [String(temp)]);
          this.dynamicSvgGroup.appendChild(tickText);
        }
      }

      // Draw thick glowing median bar indicator on dial track (Radius 142)
      const medianTheta = 0.75 * Math.PI + ((medianTemp - 60) / (85 - 60)) * 1.5 * Math.PI;
      const mxOuter = 200 + 148 * Math.cos(medianTheta);
      const myOuter = 200 + 148 * Math.sin(medianTheta);
      const mxInner = 200 + 134 * Math.cos(medianTheta);
      const myInner = 200 + 134 * Math.sin(medianTheta);

      const medianTickIndicator = this.makeSvg('line', {
        x1: mxOuter,
        y1: myOuter,
        x2: mxInner,
        y2: myInner,
        stroke: '#f59e0b',
        'stroke-width': '5.5',
        'stroke-linecap': 'round',
        style: 'filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.9))'
      });
      this.dynamicSvgGroup.appendChild(medianTickIndicator);

      // If count is even and there are two median indices, draw a nice connecting halo arc between them
      if (medianIds.length === 2) {
        let tempA = 72.0, tempB = 72.0;
        const voterA = activeVotersList.find(v => v.id === medianIds[0]);
        const voterB = activeVotersList.find(v => v.id === medianIds[1]);
        if (voterA) tempA = voterA.temp;
        if (voterB) tempB = voterB.temp;

        const thetaA = 0.75 * Math.PI + ((tempA - 60) / (85 - 60)) * 1.5 * Math.PI;
        const thetaB = 0.75 * Math.PI + ((tempB - 60) / (85 - 60)) * 1.5 * Math.PI;

        const ax1 = 200 + 142 * Math.cos(thetaA);
        const ay1 = 200 + 142 * Math.sin(thetaA);
        const ax2 = 200 + 142 * Math.cos(thetaB);
        const ay2 = 200 + 142 * Math.sin(thetaB);

        // Simple dashed connecting line to show how the median is shared between the two middle-most voters
        const connector = this.makeSvg('line', {
          x1: ax1, y1: ay1,
          x2: ax2, y2: ay2,
          stroke: '#f59e0b',
          'stroke-width': '2',
          'stroke-dasharray': '2 2',
          opacity: '0.85'
        });
        this.dynamicSvgGroup.appendChild(connector);
      }

      // Draw non-user voter nodes and interactive hitboxes on dial
      this.voters.forEach(v => {
        const theta = 0.75 * Math.PI + ((v.temp - 60) / (85 - 60)) * 1.5 * Math.PI;
        const vx = 200 + 142 * Math.cos(theta);
        const vy = 200 + 142 * Math.sin(theta);

        const isHovered = (this.hoveredVoterId === v.id);
        const isMiddleMedian = medianIds.includes(v.id);

        // Core visual node
        const dot = this.makeSvg('circle', {
          cx: vx,
          cy: vy,
          r: isHovered ? '8.5' : '6',
          fill: '#10b981',
          stroke: isMiddleMedian ? '#f59e0b' : '#090d16',
          'stroke-width': isMiddleMedian ? '2.5' : '1.5',
          style: 'transition: r 0.12s ease;'
        });
        this.dynamicSvgGroup.appendChild(dot);

        // Large Frictionless Pointer Hitbox to make hovering smooth & responsive
        const hitbox = this.makeSvg('circle', {
          cx: vx,
          cy: vy,
          r: '18',
          fill: 'transparent',
          style: 'cursor: pointer;'
        });

        hitbox.addEventListener('mouseover', (e) => {
          // COMPLETELY IGNORE hover overrides when actively dragging your own blue dot!
          if (this.isDragging) return;
          this.hoveredVoterId = v.id;
          this.showTooltip(e, v);
          this.update();
        });

        hitbox.addEventListener('mouseout', () => {
          if (this.isDragging) return;
          this.hoveredVoterId = null;
          this.hideTooltip();
          this.update();
        });

        this.dynamicSvgGroup.appendChild(hitbox);
      });

      // Render User Vote Pointer
      if (this.userHasVoted) {
        const userTheta = 0.75 * Math.PI + ((this.userTemp - 60) / (85 - 60)) * 1.5 * Math.PI;
        const ux = 200 + 142 * Math.cos(userTheta);
        const uy = 200 + 142 * Math.sin(userTheta);

        const userHandle = this.makeSvg('circle', {
          cx: ux,
          cy: uy,
          r: '11',
          fill: '#3b82f6',
          stroke: '#f8fafc',
          'stroke-width': '2.5',
          style: 'cursor: grab; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.45))'
        });
        this.dynamicSvgGroup.appendChild(userHandle);

        const isUserMedian = medianIds.includes('user');
        if (isUserMedian) {
          const userCrown = this.makeSvg('circle', {
            cx: ux,
            cy: uy,
            r: '15',
            fill: 'none',
            stroke: '#f59e0b',
            'stroke-width': '2',
            'stroke-dasharray': '2 1'
          });
          this.dynamicSvgGroup.appendChild(userCrown);
        }
      } else {
        // Draw resting user handle at the bottom reservoir socket (200, 345)
        const uncastHandle = this.makeSvg('circle', {
          cx: '200',
          cy: '345',
          r: '11',
          fill: '#3b82f6',
          stroke: '#f8fafc',
          'stroke-width': '2',
          style: 'cursor: grab; filter: drop-shadow(0px 3px 6px rgba(0,0,0,0.5))'
        });
        this.dynamicSvgGroup.appendChild(uncastHandle);
      }

      // Crown the voter(s) currently forming the Median
      medianIds.forEach(id => {
        let mvTemp = 72.0;
        if (id === 'user') {
          mvTemp = this.userTemp;
        } else {
          const voterMatch = this.voters.find(v => v.id === id);
          if (voterMatch) mvTemp = voterMatch.temp;
        }

        const mTheta = 0.75 * Math.PI + ((mvTemp - 60) / (85 - 60)) * 1.5 * Math.PI;
        const mx = 200 + 142 * Math.cos(mTheta);
        const my = 200 + 142 * Math.sin(mTheta);

        const crown = this.makeSvg('circle', {
          cx: mx,
          cy: my,
          r: '15',
          fill: 'none',
          stroke: '#f59e0b',
          'stroke-width': '2',
          'stroke-dasharray': '3 2'
        });
        this.dynamicSvgGroup.appendChild(crown);
      });

      // Draw Mean indicator line on the dial perimeter
      const avgTheta = 0.75 * Math.PI + ((averageTemp - 60) / (85 - 60)) * 1.5 * Math.PI;
      const ax = 200 + 152 * Math.cos(avgTheta);
      const ay = 200 + 152 * Math.sin(avgTheta);
      const axIn = 200 + 142 * Math.cos(avgTheta);
      const ayIn = 200 + 142 * Math.sin(avgTheta);

      const averageMark = this.makeSvg('line', {
        x1: ax,
        y1: ay,
        x2: axIn,
        y2: ayIn,
        stroke: '#ef4444',
        'stroke-width': '1.5',
        'stroke-dasharray': '2 2'
      });
      this.dynamicSvgGroup.appendChild(averageMark);

      // Center digital display typography
      const stateColor = medianTemp < 71.5 ? '#3b82f6' : (medianTemp > 72.5 ? '#f59e0b' : '#10b981');
      const systemIcon = medianTemp < 71.5 ? '❄️ COOL' : (medianTemp > 72.5 ? '🔥 HEAT' : '🍃 ECON');

      const textValue = this.makeSvg('text', {
        x: '200',
        y: '196',
        fill: '#f59e0b',
        'font-size': '40px',
        'font-weight': '900',
        'text-anchor': 'middle',
        'font-family': 'monospace'
      }, [medianTemp.toFixed(1) + '°']);
      this.centerDisplayGroup.appendChild(textValue);

      // Your Drag Impact direct shift readout
      const shiftSymbol = userMedianInfluence > 0 ? '+' : '';
      const dragShiftLabelText = this.userHasVoted 
        ? `Your Shift: ${shiftSymbol}${userMedianInfluence.toFixed(1)}°F`
        : 'Drag blue dot to vote';

      const textDragShift = this.makeSvg('text', {
        x: '200',
        y: '216',
        fill: this.userHasVoted ? (userMedianInfluence === 0 ? '#10b981' : '#3b82f6') : '#64748b',
        'font-size': '10px',
        'font-weight': 'bold',
        'text-anchor': 'middle'
      }, [dragShiftLabelText]);
      this.centerDisplayGroup.appendChild(textDragShift);

      const labelStatus = this.makeSvg('text', {
        x: '200',
        y: '234',
        fill: stateColor,
        'font-size': '9px',
        'font-weight': '800',
        'letter-spacing': '1px',
        'text-anchor': 'middle'
      }, [systemIcon]);
      this.centerDisplayGroup.appendChild(labelStatus);

      const labelCurrentMode = this.makeSvg('text', {
        x: '200',
        y: '148',
        fill: '#475569',
        'font-size': '8px',
        'font-weight': '800',
        'letter-spacing': '1px',
        'text-anchor': 'middle'
      }, ['MEDIAN TARGET']);
      this.centerDisplayGroup.appendChild(labelCurrentMode);

      const labelUserStatus = this.makeSvg('text', {
        x: '200',
        y: '260',
        fill: '#64748b',
        'font-size': '9px',
        'font-weight': '600',
        'text-anchor': 'middle'
      }, [this.userHasVoted ? `Your Vote: ${this.userTemp.toFixed(1)}°F` : 'VOTE NOT CAST']);
      this.centerDisplayGroup.appendChild(labelUserStatus);

      // 3. Update side lists & bottom indicators
      this.updateVotersPanel(medianIds);
      this.updateSpectrumBar(medianTemp, averageTemp, medianIds);
      this.updateInfluenceSummary(userMedianInfluence, userAverageInfluence);
    }

  updateSpectrumBar(median, average, medianIds) {
      // Clear indicators
      const elements = this.spectrumBarContainer.querySelectorAll('.tv-spectrum-tick, .tv-spectrum-indicator-line');
      elements.forEach(el => el.remove());

      const mapPct = (temp) => {
        const fraction = (temp - 60) / (85 - 60);
        return Math.max(0, Math.min(100, fraction * 100));
      };

      // Plot voters ticks
      this.voters.forEach(v => {
        const pct = mapPct(v.temp);
        const isHovered = (this.hoveredVoterId === v.id);
        const isMed = medianIds.includes(v.id);

        const tick = makeElement('div', {
          className: 'tv-spectrum-tick',
          style: {
            left: `calc(${pct}% - 1.5px)`,
            backgroundColor: isMed ? '#f59e0b' : '#10b981',
            height: isHovered ? '20px' : '12px',
            top: isHovered ? '4px' : '8px',
            zIndex: isMed ? '5' : '1'
          }
        });
        this.spectrumBarContainer.appendChild(tick);
      });

      if (this.userHasVoted) {
        const userPct = mapPct(this.userTemp);
        const isUserHovered = (this.hoveredVoterId === 'user');
        const isUserMed = medianIds.includes('user');

        const userTick = makeElement('div', {
          className: 'tv-spectrum-tick',
          style: {
            left: `calc(${userPct}% - 1.5px)`,
            backgroundColor: isUserMed ? '#f59e0b' : '#3b82f6',
            height: isUserHovered ? '20px' : '14px',
            top: isUserHovered ? '4px' : '7px',
            zIndex: '10'
          }
        });
        this.spectrumBarContainer.appendChild(userTick);
      }

      // Plot calculated median indicator line
      const medPct = mapPct(median);
      const medLine = makeElement('div', {
        className: 'tv-spectrum-indicator-line',
        style: {
          left: `calc(${medPct}% - 1px)`,
          backgroundColor: '#f59e0b',
          boxShadow: '0 0 4px #f59e0b',
          zIndex: '12'
        }
      });
      this.spectrumBarContainer.appendChild(medLine);

      // Plot calculated average indicator line
      const avgPct = mapPct(average);
      const avgLine = makeElement('div', {
        className: 'tv-spectrum-indicator-line',
        style: {
          left: `calc(${avgPct}% - 1px)`,
          backgroundColor: '#ef4444',
          borderLeft: '1px dashed #ef4444',
          zIndex: '11'
        }
      });
      this.spectrumBarContainer.appendChild(avgLine);
    }

  updateInfluenceSummary(medianInf, averageInf) {
      this.influenceTextContainer.innerHTML = '';

      const isOdd = (this.voters.length + (this.userHasVoted ? 1 : 0)) % 2 !== 0;

      const body = makeElement('div', {}, [
        makeElement('div', { style: { fontWeight: '700', marginBottom: '4px' } }, `Marginal Feedback Analysis (${isOdd ? 'Odd' : 'Even'} Voter Count Mode):`),
        makeElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '2px' } }, [
          makeElement('span', {}, 'Influence on Median decision:'),
          makeElement('span', { style: { fontWeight: 'bold', color: medianInf === 0 ? '#10b981' : '#f59e0b' } }, 
            this.userHasVoted ? `${medianInf > 0 ? '+' : ''}${medianInf.toFixed(1)}°F` : '0.0°F (Vote Uncast)'
          )
        ]),
        makeElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' } }, [
          makeElement('span', {}, 'Influence on Mean average decision:'),
          makeElement('span', { style: { fontWeight: 'bold', color: '#ef4444' } }, 
            this.userHasVoted ? `${averageInf > 0 ? '+' : ''}${averageInf.toFixed(1)}°F` : '0.0°F (Vote Uncast)'
          )
        ]),
        makeElement('div', { style: { fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' } }, 
          this.userHasVoted
            ? '💡 Try shifting your vote to extreme values (60°F or 85°F). Notice that your influence on the Median remains minimal or drops to exactly zero, while your influence on the Mean average responds directly to every move!'
            : '💡 Drag the blue uncast handle up onto the thermostat circle to see how adding your preference shifts the group decision.'
        )
      ]);

      this.influenceTextContainer.appendChild(body);
    }

  updateVotersPanel(medianIds) {
      this.votersListContainer.innerHTML = '';

      const listPool = [...this.voters];
      if (this.userHasVoted) {
        listPool.push({
          id: 'user',
          name: 'You (Your Vote)',
          temp: this.userTemp,
          isUser: true,
          color: '#3b82f6'
        });
      }

      const sortedPool = [...listPool].sort((a, b) => a.temp - b.temp);

      sortedPool.forEach(v => {
        const isHovered = (this.hoveredVoterId === v.id);
        const isMedian = medianIds.includes(v.id);

        const row = makeElement('div', {
          className: `tv-voter-item ${isHovered ? 'tv-active' : ''}`,
          style: {
            borderLeft: isMedian ? '4px solid #f59e0b' : '4px solid transparent'
          }
        });

        row.addEventListener('mouseover', () => {
          if (this.isDragging) return;
          this.hoveredVoterId = v.id;
          this.update();
        });

        row.addEventListener('mouseout', () => {
          if (this.isDragging) return;
          this.hoveredVoterId = null;
          this.update();
        });

        const badgeDot = makeElement('div', {
          className: 'tv-badge-dot',
          style: { backgroundColor: v.color }
        });

        // Use clean truncated label to prevent row expansion and horizontal scrollbars
        const nameLabel = makeElement('span', { className: 'tv-voter-name' }, 
          v.isUser ? 'You' : v.name + (isMedian ? ' 👑' : '')
        );

        const info = makeElement('div', { className: 'tv-voter-info' }, [badgeDot, nameLabel]);

        const valueBadge = makeElement('span', { className: 'tv-voter-temp-badge' }, `${v.temp.toFixed(1)}°F`);

        const sliderControl = makeElement('input', {
          type: 'range',
          className: 'tv-voter-slider',
          min: '60.0',
          max: '85.0',
          step: '0.1',
          value: String(v.temp),
          oninput: (e) => {
            if (v.isUser) {
              this.userTemp = parseFloat(e.target.value);
            } else {
              v.temp = parseFloat(e.target.value);
            }
            this.update();
          }
        });

        row.appendChild(info);
        row.appendChild(makeElement('div', { style: { display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 } }, [sliderControl, valueBadge]));
        this.votersListContainer.appendChild(row);
      });
    }

  showTooltip(e, voter) {
      if (this.isDragging) {
        this.hideTooltip();
        return;
      }

      const rect = this.svgWrap.getBoundingClientRect();
      const tooltipWidth = 140;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      this.tooltipEl.innerHTML = `
        <div style="font-weight: bold; color: ${voter.color || '#10b981'}; margin-bottom: 1px;">${voter.name}</div>
        <div>Preference: <span style="font-weight: bold; font-family: monospace;">${voter.temp.toFixed(1)}°F</span></div>
      `;

      // Clamp coordinates perfectly inside the SVG boundaries so tooltip never leaks off screen
      const targetLeft = Math.min(rect.width - tooltipWidth - 10, Math.max(10, x - tooltipWidth / 2));
      const targetTop = Math.max(10, y - 65); // High offset so cursor doesn't collide with hover triggers

      this.tooltipEl.style.left = `${targetLeft}px`;
      this.tooltipEl.style.top = `${targetTop}px`;
      this.tooltipEl.style.opacity = '1';
      this.tooltipEl.style.transform = 'translateY(0)';
    }

  hideTooltip() {
      this.tooltipEl.style.opacity = '0';
      this.tooltipEl.style.transform = 'translateY(4px)';
    }

  highlightVoterRow(id) {
    this.hoveredVoterId = id;
    this.update();
  }

  clearVoterRowHighlights() {
    this.hoveredVoterId = null;
    this.update();
  }

  // Pure SVG generation helper function
  makeSvg(tag, attrs = {}, children = []) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, val] of Object.entries(attrs)) {
      if (key.startsWith('on')) {
        el[key] = val;
      } else {
        el.setAttribute(key, val);
      }
    }
    for (const child of children) {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else {
        el.appendChild(child);
      }
    }
    return el;
  }

  generateVoters() {
      // Create random voters based on current selection
      const othersCount = this.totalVoterCount - 1;
      const names = [
        "Alice", "Bob", "Charlie", "Diana", "Ethan", "Fiona", "George", "Hannah", "Ian", "Julia",
        "Kevin", "Laura", "Mason", "Nora", "Oliver", "Penelope", "Quinn", "Ryan", "Sophia", "Thomas"
      ];

      this.voters = [];
      for (let i = 0; i < othersCount; i++) {
        const name = names[i % names.length] + ` #${Math.floor(i / names.length) + 1}`;
        const temp = Math.round((64.0 + Math.random() * 16.0) * 10) / 10; // Comfort range 64 to 80
        this.voters.push({
          id: i + 1,
          name: name,
          temp: temp,
          color: '#10b981'
        });
      }
    }
}