class VoteCurve {
    async run(clientEnv) {
      if (!clientEnv || !clientEnv.container) {
        throw new Error("VoteCurve requires a valid runtime environment with a container element.");
      }
      
      this.env = clientEnv;
      this.container = clientEnv.container;

      // Reset any previous views inside the runtime page
      this.container.innerHTML = '';

      // Initialize state variables
      this.stateRevenue = 35; // % of Total Colony GDP
      this.taxPhilosophy = 0.25; // -1.0 (Head Tax) to 0.0 (Flat Rate) to 1.0 (Egalitarian UBI)
      this.useLogScale = true; // Log scale is default to make billionaires visible with sweepers
      this.hoveredPercentile = null; // Currently tracked percentile for tooltip

      // Generate the colony's income distribution
      this.distribution = this.generateIncomeDistribution();

      // Pre-calculate baseline progressive tax bracket system
      this.currentSystem = this.calculateCurrentSystem();

      // Pre-calculate Gini coefficients to guarantee variables are initialized before rendering
      const preIncomes = this.distribution.map(d => d.preTax);
      const curIncomes = this.currentSystem.map(d => d.postTax);
      this.giniPre = this.calculateGini(preIncomes);
      this.giniCur = this.calculateGini(curIncomes);
      this.giniProp = this.giniCur; // Default fallback

      // Apply stylesheet
      this.applyStyles();

      // Draw the main application workspace (now safe since Ginis are initialized)
      this.renderApp();

      // Launch the floating voter control terminal dialog
      this.launchVoterTerminal();

      // Perform initial simulation update
      this.updateSimulation();

      // Handle window resize
      this._resizeHandler = () => this.drawChart();
      window.addEventListener('resize', this._resizeHandler);
    }

    /**
     * Generates a realistic but skewed 100-percentile income distribution 
     * for a futuristic colony of 100 representative archetypes.
     */
    generateIncomeDistribution() {
      const data = [];
      for (let i = 1; i <= 100; i++) {
        const p = i / 100;
        let preTax = 0;
        let profession = "";

        if (i <= 90) {
          // Normal working class and technical specialists ($12,000 to $160,000)
          preTax = 12000 + 148000 * Math.pow(p, 2.0);
        } else {
          // High-level administrators and corporate/asteroid guild directors ($160,000 to $5,000,000)
          const topP = (i - 90) / 10; // 0.1 to 1.0
          preTax = 160000 + 4840000 * Math.pow(topP, 3.8);
        }

        preTax = Math.round(preTax);

        // Assign futuristic professions mapped to income deciles
        if (i <= 10) profession = "Recycling Bay Sweeper";
        else if (i <= 25) profession = "Hydroponics Harvester";
        else if (i <= 45) profession = "Atmospheric Filter Cleaner";
        else if (i <= 65) profession = "Asteroid Tug Navigator";
        else if (i <= 80) profession = "AI Subroutine Auditor";
        else if (i <= 90) profession = "Heavy Mech Maintenance Engineer";
        else if (i <= 95) profession = "Terraforming Coordinator";
        else if (i <= 98) profession = "Orbit Elevator Commander";
        else if (i <= 99) profession = "Colonial Senator";
        else profession = "Asteroid Mining Guild Director";

        data.push({
          percentile: i,
          preTax,
          profession
        });
      }
      return data;
    }

    /**
     * Calculates progressive tax bracket system for the comparative baseline
     */
    calculateCurrentSystem() {
      return this.distribution.map(d => {
        let tax = 0;
        const inc = d.preTax;

        // Progressive bracket logic
        if (inc <= 20000) {
          tax = inc * 0.05;
        } else if (inc <= 50000) {
          tax = 20000 * 0.05 + (inc - 20000) * 0.12;
        } else if (inc <= 120000) {
          tax = 20000 * 0.05 + 30000 * 0.12 + (inc - 50000) * 0.22;
        } else if (inc <= 350000) {
          tax = 20000 * 0.05 + 30000 * 0.12 + 70000 * 0.22 + (inc - 120000) * 0.35;
        } else {
          tax = 20000 * 0.05 + 30000 * 0.12 + 70000 * 0.22 + 230000 * 0.35 + (inc - 350000) * 0.48;
        }

        tax = Math.round(tax);
        return {
          percentile: d.percentile,
          preTax: inc,
          tax: tax,
          postTax: inc - tax,
          rate: (tax / inc) * 100
        };
      });
    }

    /**
     * Calculates the proposed budget-balanced tax system based on the two interactive sliders
     */
    calculateProposedSystem(revenuePercent, philosophy) {
      const totalGDP = this.distribution.reduce((sum, d) => sum + d.preTax, 0);
      const R = totalGDP * (revenuePercent / 100); // Target state revenue to collect
      const alpha = R / totalGDP; // Average flat-tax rate

      const headTax = R / 100; // Constant dollar amount if everyone pays same
      const E = (totalGDP - R) / 100; // Post-tax equalized average income

      return this.distribution.map(d => {
        const flatTax = alpha * d.preTax;
        const equalTax = d.preTax - E;

        let proposedTax = 0;
        if (philosophy >= 0) {
          // Blend Flat Rate Tax (0.0) with Full Equalization UBI (1.0)
          proposedTax = (1 - philosophy) * flatTax + philosophy * equalTax;
        } else {
          // Blend Flat Rate Tax (0.0) with Regressive Head Tax (-1.0)
          // philosophy is negative here, so we map [-1, 0]
          proposedTax = (1 + philosophy) * flatTax - philosophy * headTax;
        }

        proposedTax = Math.round(proposedTax);
        const postTax = d.preTax - proposedTax;

        return {
          percentile: d.percentile,
          preTax: d.preTax,
          profession: d.profession,
          tax: proposedTax,
          postTax: postTax,
          rate: d.preTax > 0 ? (proposedTax / d.preTax) * 100 : 0
        };
      });
    }

    /**
     * Calculates Gini coefficient for a given array of incomes to show equality dynamics
     */
    calculateGini(incomes) {
      const sorted = [...incomes].sort((a, b) => a - b);
      const n = sorted.length;
      let sumOfDifferences = 0;
      let sumOfIncomes = 0;

      for (let i = 0; i < n; i++) {
        sumOfIncomes += sorted[i];
        for (let j = 0; j < n; j++) {
          sumOfDifferences += Math.abs(sorted[i] - sorted[j]);
        }
      }

      if (sumOfIncomes === 0) return 0;
      return sumOfDifferences / (2 * n * sumOfIncomes);
    }

    /**
     * Updates simulated values, triggers Gini calculations, and redraws the SVG
     */
    updateSimulation() {
      this.proposedSystem = this.calculateProposedSystem(this.stateRevenue, this.taxPhilosophy);

      // Perform Gini Coefficient calculations
      const preIncomes = this.distribution.map(d => d.preTax);
      const curIncomes = this.currentSystem.map(d => d.postTax);
      const propIncomes = this.proposedSystem.map(d => d.postTax);

      this.giniPre = this.calculateGini(preIncomes);
      this.giniCur = this.calculateGini(curIncomes);
      this.giniProp = this.calculateGini(propIncomes);

      // Update dialog text labels
      this.updateTerminalUI();

      // Redraw chart
      this.drawChart();
    }

    /**
     * Main UI application layout
     */
    renderApp() {
      const mainContainer = makeElement('div', { className: 'votecurve-wrapper' });

      // Title & Intro section
      const headerSection = makeElement('header', { className: 'votecurve-header' },
        makeElement('div', { className: 'votecurve-badge' }, 'DIRECT DEMOCRACY PROTOCOL'),
        makeElement('h1', {}, 'VOTECURVE SIMULATOR'),
        makeElement('p', { className: 'votecurve-lead' }, 
          "In the Aethelgard Colony, citizens vote directly on the tax curve. Instead of electing budget representatives, you adjust the state size and tax shape. The median coordinates of all votes formulate the collective tax algorithm."
        )
      );

      // Scale toggle buttons
      const scaleToggleContainer = makeElement('div', { className: 'scale-toggle-container' },
        makeElement('span', {}, 'Vertical Axis Scale:'),
        makeElement('button', {
          className: 'scale-button' + (this.useLogScale ? ' active' : ''),
          onclick: (e) => this.toggleScale(true, e.target)
        }, 'Logarithmic (Details all classes)'),
        makeElement('button', {
          className: 'scale-button' + (!this.useLogScale ? ' active' : ''),
          onclick: (e) => this.toggleScale(false, e.target)
        }, 'Linear (Shows true scale of wealth)')
      );

      // Main visualization container
      const chartContainer = makeElement('div', { 
        className: 'chart-container',
        id: 'voteCurveChartContainer'
      });

      // Quick hover informational panel
      const infoBar = makeElement('div', { className: 'interactive-info-bar' },
        makeElement('div', { className: 'info-cell' },
          makeElement('div', { className: 'info-cell-label' }, 'Pre-Tax GDP Sum'),
          makeElement('div', { className: 'info-cell-value text-gold' }, '$' + this.formatCurrency(this.distribution.reduce((s,d)=>s+d.preTax, 0)))
        ),
        makeElement('div', { className: 'info-cell' },
          makeElement('div', { className: 'info-cell-label' }, 'Pre-Tax Gini Index'),
          makeElement('div', { className: 'info-cell-value' }, this.giniPre.toFixed(3))
        ),
        makeElement('div', { className: 'info-cell' },
          makeElement('div', { className: 'info-cell-label' }, 'Baseline System Gini'),
          makeElement('div', { className: 'info-cell-value text-purple' }, this.giniCur.toFixed(3))
        ),
        makeElement('div', { className: 'info-cell' },
          makeElement('div', { className: 'info-cell-label' }, 'Voted System Gini'),
          makeElement('div', { className: 'info-cell-value text-cyan', id: 'giniPropLabel' }, this.giniProp.toFixed(3))
        )
      );

      mainContainer.appendChild(headerSection);
      mainContainer.appendChild(scaleToggleContainer);
      mainContainer.appendChild(chartContainer);
      mainContainer.appendChild(infoBar);

      this.container.appendChild(mainContainer);
    }

    /**
     * Renders or updates the SVG graph based on current states
     */
    drawChart() {
      const container = document.getElementById('voteCurveChartContainer');
      if (!container) return;

      const width = container.clientWidth || 800;
      const height = 480;

      container.innerHTML = '';

      // Define safe ranges & dimensions
      const paddingLeft = 85;
      const paddingRight = 40;
      const paddingTop = 30;
      const paddingBottom = 50;

      const chartW = width - paddingLeft - paddingRight;
      const chartH = height - paddingTop - paddingBottom;

      const logMin = 2000;
      const logMax = 10000000;
      const linMin = -250000; // accounts for head-tax bankruptcies
      const linMax = 5200000;

      // Coordinate converter helper
      const getX = (percentile) => {
        return paddingLeft + ((percentile - 1) / 99) * chartW;
      };

      const getY = (value) => {
        if (this.useLogScale) {
          const safeVal = Math.max(logMin, value);
          const ratio = (Math.log10(safeVal) - Math.log10(logMin)) / (Math.log10(logMax) - Math.log10(logMin));
          return paddingTop + chartH - ratio * chartH;
        } else {
          const ratio = (value - linMin) / (linMax - linMin);
          return paddingTop + chartH - ratio * chartH;
        }
      };

      // Create main SVG element
      const svg = makeElement('svg:svg', {
        width: '100%',
        height: height + 'px',
        viewBox: '0 0 ' + width + ' ' + height,
        style: { overflow: 'visible', background: '#0e1420', borderRadius: '12px', border: '1px solid #1e293b' }
      });

      // Define gridlines & background pattern
      const defs = makeElement('svg:defs', {},
        makeElement('svg:linearGradient', { id: 'cyan-glow', x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
          makeElement('svg:stop', { offset: '0%', 'stop-color': 'var(--colony-cyan)', 'stop-opacity': '0.4' }),
          makeElement('svg:stop', { offset: '100%', 'stop-color': 'var(--colony-cyan)', 'stop-opacity': '0.0' })
        ),
        makeElement('svg:linearGradient', { id: 'purple-glow', x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
          makeElement('svg:stop', { offset: '0%', 'stop-color': 'var(--colony-purple)', 'stop-opacity': '0.3' }),
          makeElement('svg:stop', { offset: '100%', 'stop-color': 'var(--colony-purple)', 'stop-opacity': '0.0' })
        )
      );
      svg.appendChild(defs);

      // 1. Draw horizontal gridlines & labels
      const yTicks = this.useLogScale 
        ? [2000, 10000, 50000, 200000, 1000000, 5000000, 10000000]
        : [-100000, 0, 500000, 1500000, 3000000, 5000000];

      yTicks.forEach(tick => {
        const y = getY(tick);
        if (y < paddingTop || y > paddingTop + chartH) return;

        svg.appendChild(makeElement('svg:line', {
          x1: paddingLeft,
          y1: y,
          x2: width - paddingRight,
          y2: y,
          stroke: '#1e293b',
          'stroke-width': tick === 0 ? '2' : '1',
          'stroke-dasharray': tick === 0 ? 'none' : '4 4'
        }));

        svg.appendChild(makeElement('svg:text', {
          x: paddingLeft - 12,
          y: y + 4,
          fill: tick === 0 ? '#ef4444' : '#64748b',
          'font-size': '10px',
          'text-anchor': 'end',
          'font-family': 'monospace'
        }, tick < 0 ? '-$' + this.formatCurrency(Math.abs(tick)) : '$' + this.formatCurrency(tick)));
      });

      // 2. Draw vertical gridlines & labels (Percentiles)
      const xTicks = [1, 20, 40, 60, 80, 100];
      xTicks.forEach(tick => {
        const x = getX(tick);
        svg.appendChild(makeElement('svg:line', {
          x1: x,
          y1: paddingTop,
          x2: x,
          y2: paddingTop + chartH,
          stroke: '#1e293b',
          'stroke-width': '1'
        }));

        svg.appendChild(makeElement('svg:text', {
          x: x,
          y: paddingTop + chartH + 20,
          fill: '#64748b',
          'font-size': '10px',
          'text-anchor': 'middle',
          'font-family': 'monospace'
        }, tick === 100 ? '99.9th%' : tick + 'th'));
      });

      // Axis Titles
      svg.appendChild(makeElement('svg:text', {
        x: paddingLeft + chartW / 2,
        y: paddingTop + chartH + 40,
        fill: '#9ca3af',
        'font-size': '11px',
        'text-anchor': 'middle',
        'font-weight': '600'
      }, 'COLONY INCOME PERCENTILES'));

      // 3. Construct transfer shaded polygon zones (subsidized vs taxed)
      let subsidyPoints = [];
      let taxPoints = [];
      let breakEvenPercentile = null;

      this.proposedSystem.forEach(d => {
        const x = getX(d.percentile);
        const yProp = getY(d.postTax);
        const yPre = getY(d.preTax);

        if (d.tax < 0) {
          subsidyPoints.push({ x, yProp, yPre });
        } else {
          if (breakEvenPercentile === null && d.percentile > 1) {
            breakEvenPercentile = d.percentile;
          }
          taxPoints.push({ x, yProp, yPre });
        }
      });

      // Draw Subsidy polygon (Post-tax > Pre-tax)
      if (subsidyPoints.length > 0) {
        let pathStr = 'M ' + subsidyPoints[0].x + ' ' + subsidyPoints[0].yPre;
        subsidyPoints.forEach(pt => {
          pathStr += ' L ' + pt.x + ' ' + pt.yProp;
        });
        for (let i = subsidyPoints.length - 1; i >= 0; i--) {
          pathStr += ' L ' + subsidyPoints[i].x + ' ' + subsidyPoints[i].yPre;
        }
        pathStr += ' Z';
        svg.appendChild(makeElement('svg:path', {
          d: pathStr,
          fill: 'rgba(16, 185, 129, 0.12)',
          stroke: 'none'
        }));
      }

      // Draw Tax polygon (Post-tax < Pre-tax)
      if (taxPoints.length > 0) {
        let pathStr = 'M ' + taxPoints[0].x + ' ' + taxPoints[0].yPre;
        taxPoints.forEach(pt => {
          pathStr += ' L ' + pt.x + ' ' + pt.yProp;
        });
        for (let i = taxPoints.length - 1; i >= 0; i--) {
          pathStr += ' L ' + taxPoints[i].x + ' ' + taxPoints[i].yPre;
        }
        pathStr += ' Z';
        svg.appendChild(makeElement('svg:path', {
          d: pathStr,
          fill: 'rgba(239, 68, 68, 0.08)',
          stroke: 'none'
        }));
      }

      // 4. Draw curves
      const preTaxPath = this.distribution.map(d => getX(d.percentile) + ',' + getY(d.preTax)).join(' L ');
      const currentPath = this.currentSystem.map(d => getX(d.percentile) + ',' + getY(d.postTax)).join(' L ');
      const proposedPath = this.proposedSystem.map(d => getX(d.percentile) + ',' + getY(d.postTax)).join(' L ');

      // Pre-tax Baseline (Gold dashed)
      svg.appendChild(makeElement('svg:path', {
        d: 'M ' + preTaxPath,
        fill: 'none',
        stroke: 'var(--colony-gold)',
        'stroke-width': '2',
        'stroke-dasharray': '5 5',
        opacity: '0.65'
      }));

      // Current system baseline (Purple line)
      svg.appendChild(makeElement('svg:path', {
        d: 'M ' + currentPath,
        fill: 'none',
        stroke: 'var(--colony-purple)',
        'stroke-width': '2.5',
        opacity: '0.75'
      }));

      // Proposed system (Cyan glowing line)
      svg.appendChild(makeElement('svg:path', {
        d: 'M ' + proposedPath,
        fill: 'none',
        stroke: 'var(--colony-cyan)',
        'stroke-width': '3.5',
        style: { filter: 'drop-shadow(0 0 4px rgba(6,182,212,0.6))' }
      }));

      // 5. Draw active interactive cursor vertical line if hovered
      let cursorGroup = null;
      if (this.hoveredPercentile !== null) {
        const itemIdx = this.hoveredPercentile - 1;
        const curD = this.distribution[itemIdx];
        const curSys = this.currentSystem[itemIdx];
        const propSys = this.proposedSystem[itemIdx];

        const cx = getX(curD.percentile);

        cursorGroup = makeElement('svg:g', {},
          // Vertical reference guide line
          makeElement('svg:line', {
            x1: cx, y1: paddingTop, x2: cx, y2: paddingTop + chartH,
            stroke: 'rgba(255, 255, 255, 0.25)',
            'stroke-width': '1.5',
            'stroke-dasharray': '2 2'
          }),
          // Hover dots
          makeElement('svg:circle', { cx: cx, cy: getY(curD.preTax), r: '5', fill: 'var(--colony-gold)' }),
          makeElement('svg:circle', { cx: cx, cy: getY(curSys.postTax), r: '5', fill: 'var(--colony-purple)' }),
          makeElement('svg:circle', { cx: cx, cy: getY(propSys.postTax), r: '6', fill: 'var(--colony-cyan)' })
        );
      }

      // 6. Interactive Overlay to capture mouse tracking
      const interactionArea = makeElement('svg:rect', {
        x: paddingLeft,
        y: paddingTop,
        width: chartW,
        height: chartH,
        fill: 'transparent',
        style: { cursor: 'crosshair', pointerEvents: 'all' }
      });

      // Pointer event listeners
      const trackMove = (e) => {
        const rect = svg.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - paddingLeft;
        
        // Calculate closest percentile index
        let pct = Math.round((mouseX / chartW) * 99) + 1;
        pct = Math.max(1, Math.min(100, pct));

        this.hoveredPercentile = pct;
        this.drawChart(); // Redraw with mouseover elements
        this.updateTooltipHUD(pct);
      };

      const trackLeave = () => {
        this.hoveredPercentile = null;
        this.drawChart();
        this.hideTooltipHUD();
      };

      interactionArea.addEventListener('pointerdown', trackMove);
      interactionArea.addEventListener('pointermove', trackMove);
      interactionArea.addEventListener('pointerleave', trackLeave);

      svg.appendChild(interactionArea);
      if (cursorGroup) svg.appendChild(cursorGroup);

      container.appendChild(svg);
    }

    /**
     * Toggles between Logarithmic and Linear charts
     */
    toggleScale(isLog, buttonEl) {
      this.useLogScale = isLog;
      const sibling = buttonEl.parentNode.querySelectorAll('.scale-button');
      sibling.forEach(btn => btn.classList.remove('active'));
      buttonEl.classList.add('active');
      this.drawChart();
    }

    /**
     * Updates floating high-tech HTML HUD regarding tracked percentile details
     */
    updateTooltipHUD(pct) {
      let hud = document.getElementById('voteCurveTooltipHUD');
      if (!hud) {
        hud = makeElement('div', { id: 'voteCurveTooltipHUD', className: 'votecurve-tooltip-hud' });
        this.container.appendChild(hud);
      }

      const idx = pct - 1;
      const base = this.distribution[idx];
      const cur = this.currentSystem[idx];
      const prop = this.proposedSystem[idx];

      const taxDiff = prop.tax - cur.tax;
      const changeClass = taxDiff < 0 ? 'text-green' : (taxDiff > 0 ? 'text-red' : '');
      const changePrefix = taxDiff < 0 ? 'Gains' : (taxDiff > 0 ? 'Pays More' : 'No Change');

      hud.innerHTML = '<div class="hud-header">\n' +
        '  <span class="hud-percentile">' + (pct === 100 ? '99.9th' : pct + 'th') + ' Percentile</span>\n' +
        '  <span class="hud-profession">' + base.profession + '</span>\n' +
        '</div>\n' +
        '<div class="hud-grid">\n' +
        '  <div class="hud-row font-gold">\n' +
        '    <span>Pre-Tax Income</span>\n' +
        '    <strong>$' + this.formatCurrency(base.preTax) + '/yr</strong>\n' +
        '  </div>\n' +
        '  <div class="hud-divider"></div>\n' +
        '  <div class="hud-row">\n' +
        '    <span class="text-purple">Baseline Post-Tax</span>\n' +
        '    <span>$' + this.formatCurrency(cur.postTax) + ' <small class="text-gray">(' + cur.rate.toFixed(1) + '% Tax)</small></span>\n' +
        '  </div>\n' +
        '  <div class="hud-row">\n' +
        '    <span class="text-cyan">Voted System Post-Tax</span>\n' +
        '    <span class="font-bold">$' + this.formatCurrency(prop.postTax) + ' <small class="text-cyan">(' + prop.rate.toFixed(1) + '% Tax)</small></span>\n' +
        '  </div>\n' +
        '  <div class="hud-divider"></div>\n' +
        '  <div class="hud-row font-bold ' + changeClass + '">\n' +
        '    <span>Net Change under Vote</span>\n' +
        '    <span>' + changePrefix + ' $' + this.formatCurrency(Math.abs(taxDiff)) + '</span>\n' +
        '  </div>\n' +
        '</div>';

      hud.style.display = 'block';
    }

    hideTooltipHUD() {
      const hud = document.getElementById('voteCurveTooltipHUD');
      if (hud) hud.style.display = 'none';
    }

    /**
     * Launches the persistent floating dialog container containing interactive sliders and presets
     */
    launchVoterTerminal() {
      if (this.voterTerminal) {
        this.voterTerminal.close();
      }

      const terminalContent = makeElement('div', { className: 'votecurve-terminal-inner' });

      // Build interactive Sliders
      this.sliderRevenue = UITools.makeControl({
        label: "State Size (Revenue target as % of Colony GDP)",
        type: 'slider',
        min: 10,
        max: 80,
        step: 1,
        value: this.stateRevenue,
        onChange: (val) => {
          this.stateRevenue = val;
          this.updateSimulation();
        }
      });

      this.sliderPhilosophy = UITools.makeControl({
        label: "Tax philosophy (Equalized vs Flat vs Regressive)",
        type: 'slider',
        min: -1.0,
        max: 1.0,
        step: 0.05,
        value: this.taxPhilosophy,
        onChange: (val) => {
          this.taxPhilosophy = val;
          this.updateSimulation();
        }
      });

      // Terminal statistics grid
      const statsPanel = makeElement('div', { className: 'terminal-stats-grid' },
        makeElement('div', { className: 'stat-box' },
          makeElement('div', { className: 'stat-label' }, 'Revenue Size'),
          makeElement('div', { className: 'stat-value text-gold', id: 'termStatRevenue' }, '35%')
        ),
        makeElement('div', { className: 'stat-box' },
          makeElement('div', { className: 'stat-label' }, 'Philosophy Target'),
          makeElement('div', { className: 'stat-value text-cyan', id: 'termStatPhilosophy' }, 'Progressive')
        ),
        makeElement('div', { className: 'stat-box' },
          makeElement('div', { className: 'stat-label' }, 'Inequality Coefficient'),
          makeElement('div', { className: 'stat-value text-purple', id: 'termStatGini' }, '0.420')
        )
      );

      // Preset configurations buttons
      const presetContainer = makeElement('div', { className: 'preset-button-container' },
        makeElement('h4', {}, 'Macro-Economic Presets:'),
        makeElement('div', { className: 'preset-grid' },
          makeElement('button', { onclick: () => this.applyPreset(15, -1.0) }, 'Nightwatchman State (Head Tax)'),
          makeElement('button', { onclick: () => this.applyPreset(20, 0.0) }, 'Flat Budget State (Flat Rate)'),
          makeElement('button', { onclick: () => this.applyPreset(40, 0.45) }, 'Social Democratic Welfare (UBI)'),
          makeElement('button', { onclick: () => this.applyPreset(65, 0.95) }, 'Democratic Egalitarian Syndicate')
        )
      );

      // Context legend explaining values
      const explanationText = makeElement('div', { className: 'colony-explanation' },
        makeElement('h4', {}, 'Curve Philosophies:'),
        makeElement('ul', {},
          makeElement('li', {}, makeElement('strong', {}, '-100% (Head Tax):'), " Every citizen pays the exact same absolute dollar fee. Extremely regressive; lowest percentiles fall into extreme debt."),
          makeElement('li', {}, makeElement('strong', {}, '0% (Flat Rate):'), " Every citizen pays a fixed, proportional percentage of their income. No standard basic safety subsidies."),
          makeElement('li', {}, makeElement('strong', {}, '+100% (Communist Equalizer):'), " Maximum taxation progressivity. Everyone ends up with identical net post-tax income via absolute negative/positive tax transfers.")
        )
      );

      // Append into inner container
      terminalContent.appendChild(this.sliderRevenue.buildDockedView());
      terminalContent.appendChild(this.sliderPhilosophy.buildDockedView());
      terminalContent.appendChild(statsPanel);
      terminalContent.appendChild(presetContainer);
      terminalContent.appendChild(explanationText);

      this.voterTerminal = UITools.makeDialog({
        env: this.env,
        title: "Budget ballot Terminal",
        size: [450, 520],
        position: [60, 100],
        contentElement: terminalContent,
        allowMinimize: true,
        allowMaximize: false
      });
    }

    /**
     * Applies standard macroeconomic philosophies instantly
     */
    applyPreset(revenue, philosophy) {
      this.stateRevenue = revenue;
      this.taxPhilosophy = philosophy;

      // Sync slider widget UI controls
      if (this.sliderRevenue) this.sliderRevenue.setValue(revenue);
      if (this.sliderPhilosophy) this.sliderPhilosophy.setValue(philosophy);

      this.updateSimulation();
    }

    /**
     * Updates text feedback indicators within the floating terminal dashboard
     */
    updateTerminalUI() {
      const gProp = document.getElementById('giniPropLabel');
      if (gProp) gProp.textContent = this.giniProp.toFixed(3);

      const rLabel = document.getElementById('termStatRevenue');
      if (rLabel) rLabel.textContent = this.stateRevenue + '%';

      const pLabel = document.getElementById('termStatPhilosophy');
      if (pLabel) {
        if (this.taxPhilosophy <= -0.7) pLabel.textContent = 'Severe Head Tax';
        else if (this.taxPhilosophy < -0.15) pLabel.textContent = 'Regressive';
        else if (this.taxPhilosophy <= 0.15) pLabel.textContent = 'Proportional (Flat)';
        else if (this.taxPhilosophy < 0.7) pLabel.textContent = 'Progressive (UBI)';
        else pLabel.textContent = 'Maximum Equalizer';
      }

      const gLabel = document.getElementById('termStatGini');
      if (gLabel) gLabel.textContent = this.giniProp.toFixed(3);
    }

    /**
     * Currency formatter helper
     */
    formatCurrency(val) {
      return Math.round(val).toLocaleString('en-US');
    }

    /**
     * Injects custom layout and color palettes safely using concatenated strings (no backticks inside strings)
     */
    applyStyles() {
      const css = ':root {\n' +
        '  --colony-bg: #0b0f19;\n' +
        '  --colony-card: #111827;\n' +
        '  --colony-border: #1f2937;\n' +
        '  --colony-text: #f3f4f6;\n' +
        '  --colony-text-muted: #9ca3af;\n' +
        '  --colony-gold: #fbbf24;\n' +
        '  --colony-cyan: #06b6d4;\n' +
        '  --colony-purple: #a855f7;\n' +
        '  --colony-green: #10b981;\n' +
        '  --colony-red: #ef4444;\n' +
        '}\n' +
        '.votecurve-wrapper {\n' +
        '  color: var(--colony-text);\n' +
        '  font-family: system-ui, -apple-system, sans-serif;\n' +
        '  max-width: 1100px;\n' +
        '  margin: 0 auto;\n' +
        '  padding: 24px;\n' +
        '  box-sizing: border-box;\n' +
        '}\n' +
        '.votecurve-header {\n' +
        '  margin-bottom: 24px;\n' +
        '  border-bottom: 1px solid var(--colony-border);\n' +
        '  padding-bottom: 16px;\n' +
        '}\n' +
        '.votecurve-badge {\n' +
        '  display: inline-block;\n' +
        '  background: rgba(6, 182, 212, 0.15);\n' +
        '  color: var(--colony-cyan);\n' +
        '  border: 1px solid var(--colony-cyan);\n' +
        '  font-size: 10px;\n' +
        '  font-weight: 700;\n' +
        '  letter-spacing: 0.15em;\n' +
        '  padding: 4px 8px;\n' +
        '  border-radius: 4px;\n' +
        '  margin-bottom: 12px;\n' +
        '  text-transform: uppercase;\n' +
        '}\n' +
        '.votecurve-header h1 {\n' +
        '  font-size: 28px;\n' +
        '  font-weight: 800;\n' +
        '  letter-spacing: -0.02em;\n' +
        '  margin: 0 0 8px 0;\n' +
        '  color: var(--colony-text);\n' +
        '}\n' +
        '.votecurve-lead {\n' +
        '  font-size: 14px;\n' +
        '  line-height: 1.6;\n' +
        '  color: var(--colony-text-muted);\n' +
        '  margin: 0;\n' +
        '  max-width: 800px;\n' +
        '}\n' +
        '.scale-toggle-container {\n' +
        '  display: flex;\n' +
        '  align-items: center;\n' +
        '  gap: 12px;\n' +
        '  margin-bottom: 16px;\n' +
        '  font-size: 12px;\n' +
        '  color: var(--colony-text-muted);\n' +
        '}\n' +
        '.scale-button {\n' +
        '  background: #1f2937;\n' +
        '  border: 1px solid #374151;\n' +
        '  color: var(--colony-text-muted);\n' +
        '  padding: 6px 14px;\n' +
        '  border-radius: 6px;\n' +
        '  cursor: pointer;\n' +
        '  font-size: 11px;\n' +
        '  font-weight: 600;\n' +
        '  transition: all 0.2s;\n' +
        '}\n' +
        '.scale-button:hover {\n' +
        '  color: #fff;\n' +
        '  border-color: #4b5563;\n' +
        '}\n' +
        '.scale-button.active {\n' +
        '  background: var(--colony-cyan);\n' +
        '  border-color: var(--colony-cyan);\n' +
        '  color: #0b0f19;\n' +
        '  box-shadow: 0 0 10px rgba(6, 182, 212, 0.4);\n' +
        '}\n' +
        '.chart-container {\n' +
        '  position: relative;\n' +
        '  width: 100%;\n' +
        '  min-height: 480px;\n' +
        '  margin-bottom: 24px;\n' +
        '}\n' +
        '.interactive-info-bar {\n' +
        '  display: grid;\n' +
        '  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));\n' +
        '  gap: 16px;\n' +
        '  background: var(--colony-card);\n' +
        '  border: 1px solid var(--colony-border);\n' +
        '  border-radius: 12px;\n' +
        '  padding: 16px;\n' +
        '  box-shadow: inset 0 1px 0 rgba(255,255,255,0.02);\n' +
        '}\n' +
        '.info-cell {\n' +
        '  display: flex;\n' +
        '  flex-direction: column;\n' +
        '  gap: 4px;\n' +
        '}\n' +
        '.info-cell-label {\n' +
        '  font-size: 10px;\n' +
        '  text-transform: uppercase;\n' +
        '  letter-spacing: 0.08em;\n' +
        '  color: var(--colony-text-muted);\n' +
        '}\n' +
        '.info-cell-value {\n' +
        '  font-size: 18px;\n' +
        '  font-weight: 700;\n' +
        '  font-family: monospace;\n' +
        '}\n' +
        '.text-gold { color: var(--colony-gold); }\n' +
        '.text-cyan { color: var(--colony-cyan); }\n' +
        '.text-purple { color: var(--colony-purple); }\n' +
        '.text-green { color: var(--colony-green); }\n' +
        '.text-red { color: var(--colony-red); }\n' +
        '.votecurve-tooltip-hud {\n' +
        '  position: fixed;\n' +
        '  bottom: 30px;\n' +
        '  right: 30px;\n' +
        '  width: 320px;\n' +
        '  background: rgba(15, 23, 42, 0.95);\n' +
        '  backdrop-filter: blur(8px);\n' +
        '  border: 1.5px solid var(--colony-cyan);\n' +
        '  border-radius: 10px;\n' +
        '  padding: 16px;\n' +
        '  box-shadow: 0 20px 40px rgba(0,0,0,0.6), 0 0 15px rgba(6, 182, 212, 0.25);\n' +
        '  z-index: 999999;\n' +
        '  pointer-events: none;\n' +
        '  display: none;\n' +
        '  font-family: system-ui, sans-serif;\n' +
        '}\n' +
        '.hud-header {\n' +
        '  display: flex;\n' +
        '  justify-content: space-between;\n' +
        '  align-items: baseline;\n' +
        '  margin-bottom: 12px;\n' +
        '  border-bottom: 1px solid rgba(255, 255, 255, 0.1);\n' +
        '  padding-bottom: 8px;\n' +
        '}\n' +
        '.hud-percentile {\n' +
        '  font-size: 14px;\n' +
        '  font-weight: 800;\n' +
        '  color: var(--colony-cyan);\n' +
        '  text-transform: uppercase;\n' +
        '}\n' +
        '.hud-profession {\n' +
        '  font-size: 11px;\n' +
        '  color: var(--colony-text-muted);\n' +
        '}\n' +
        '.hud-grid {\n' +
        '  display: flex;\n' +
        '  flex-direction: column;\n' +
        '  gap: 6px;\n' +
        '}\n' +
        '.hud-row {\n' +
        '  display: flex;\n' +
        '  justify-content: space-between;\n' +
        '  font-size: 12px;\n' +
        '}\n' +
        '.hud-row span {\n' +
        '  color: var(--colony-text-muted);\n' +
        '}\n' +
        '.hud-row strong, .hud-row span:last-child {\n' +
        '  font-family: monospace;\n' +
        '  color: var(--colony-text);\n' +
        '}\n' +
        '.hud-divider {\n' +
        '  height: 1px;\n' +
        '  background: rgba(255,255,255,0.06);\n' +
        '  margin: 4px 0;\n' +
        '}\n' +
        '.votecurve-terminal-inner {\n' +
        '  display: flex;\n' +
        '  flex-direction: column;\n' +
        '  gap: 20px;\n' +
        '}\n' +
        '.terminal-stats-grid {\n' +
        '  display: grid;\n' +
        '  grid-template-columns: repeat(3, 1fr);\n' +
        '  gap: 8px;\n' +
        '  margin-top: 8px;\n' +
        '}\n' +
        '.stat-box {\n' +
        '  background: rgba(255,255,255,0.02);\n' +
        '  border: 1px solid rgba(255,255,255,0.05);\n' +
        '  border-radius: 6px;\n' +
        '  padding: 8px;\n' +
        '  text-align: center;\n' +
        '}\n' +
        '.stat-label {\n' +
        '  font-size: 9px;\n' +
        '  text-transform: uppercase;\n' +
        '  color: var(--colony-text-muted);\n' +
        '  margin-bottom: 4px;\n' +
        '}\n' +
        '.stat-value {\n' +
        '  font-size: 12px;\n' +
        '  font-weight: 700;\n' +
        '  font-family: monospace;\n' +
        '}\n' +
        '.preset-button-container h4, .colony-explanation h4 {\n' +
        '  font-size: 11px;\n' +
        '  text-transform: uppercase;\n' +
        '  letter-spacing: 0.05em;\n' +
        '  color: var(--colony-text-muted);\n' +
        '  margin: 0 0 10px 0;\n' +
        '  border-bottom: 1px solid rgba(255,255,255,0.05);\n' +
        '  padding-bottom: 4px;\n' +
        '}\n' +
        '.preset-grid {\n' +
        '  display: grid;\n' +
        '  grid-template-columns: repeat(2, 1fr);\n' +
        '  gap: 8px;\n' +
        '}\n' +
        '.preset-grid button {\n' +
        '  background: rgba(255,255,255,0.04);\n' +
        '  border: 1px solid rgba(255,255,255,0.1);\n' +
        '  color: var(--colony-text);\n' +
        '  padding: 8px;\n' +
        '  font-size: 10px;\n' +
        '  font-weight: 600;\n' +
        '  border-radius: 6px;\n' +
        '  cursor: pointer;\n' +
        '  text-align: left;\n' +
        '  transition: all 0.15s;\n' +
        '}\n' +
        '.preset-grid button:hover {\n' +
        '  background: rgba(6, 182, 212, 0.12);\n' +
        '  border-color: var(--colony-cyan);\n' +
        '}\n' +
        '.colony-explanation {\n' +
        '  font-size: 10px;\n' +
        '  line-height: 1.5;\n' +
        '  color: var(--colony-text-muted);\n' +
        '}\n' +
        '.colony-explanation ul {\n' +
        '  margin: 0;\n' +
        '  padding-left: 14px;\n' +
        '}\n' +
        '.colony-explanation li {\n' +
        '  margin-bottom: 6px;\n' +
        '}';
      applyCss(css, 'votecurve-custom-styles');
    }

    /**
     * Terminate resize event hooks safely upon closing
     */
    destroy() {
      if (this._resizeHandler) {
        window.removeEventListener('resize', this._resizeHandler);
      }
      if (this.voterTerminal) {
        this.voterTerminal.close();
      }
      this.hideTooltipHUD();
    }
  }