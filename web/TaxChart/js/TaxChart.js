class TaxChart {
  async run(env) {
      if (!env || !env.container) {
        throw new Error("Missing valid environment container.");
      }
      this.env = env;
      const targetElement = env.container;

      // Reset state and clear previous elements
      targetElement.innerHTML = '';
      
      this.datasets = [
        { path: '/TaxChart/data/us_estimate.json', label: 'United States Estimate (2024)' },
        { path: '/TaxChart/data/social_democratic.json', label: 'Nordic Social Democratic Model' },
        { path: '/TaxChart/data/concentrated_wealth.json', label: 'AI Automated Post-Job Economy' }
      ];

      this.currentDatasetPath = this.datasets[0].path;
      this.currentData = null;
      
      // Control state
      this.logOffset = 15000; 
      this.isLogarithmic = true; // toggle between log and linear scales
      this.taxRevenuePercent = 30; // 30% of national income
      this.taxProgressivity = 50; // slider range 0 to 100 (0=Poll, 50=Flat, 100=Equalized)
      this.hoveredIndex = null;
      this.customInputs = {};

      this.setupStyles();
      this.renderLayout(targetElement);
      await this.loadSelectedDataset();
    }

  onResize(width, height) {
    if (this.containerSizeDisplay) {
      this.containerSizeDisplay.textContent = `Container size: ${Math.round(
        width
      )}W x ${Math.round(height)}H`;
    }
  }

  createConfigurableBox() {
      if (!this.configTextarea || !this.statusDiv) {
        console.error('Required elements not initialized.');
        return;
      }

      const jsonString = this.configTextarea.value;
      let options;

      try {
        options = JSON.parse(jsonString);
        options.env = this.env; // ENSURE DIALOG IS BOUND TO ENVIRONMENT
        this.statusDiv.textContent = 'Creating box with provided config...';

        const configuredBox = UITools.makeDialog(options);

        if (!options.contentHTML && !options.contentElement) {
          configuredBox.contentElement.appendChild(
            makeElement(
              'p',
              { style: { marginTop: 0 } },
              `Box created with title: "${options.title || 'Untitled'}"`
            )
          );
          configuredBox.contentElement.appendChild(
            makeElement(
              'p',
              `Size: ${options.size ? options.size.join('x') : 'Default'}`
            )
          );
        }

        this.configuredBoxes.push(configuredBox);
        this.statusDiv.textContent = `DialogBox "${options.title || 'Untitled'}" created successfully. Count: ${this.configuredBoxes.length}`;
      } catch (error) {
        console.error('Error parsing JSON config:', error);
        this.statusDiv.textContent = `Error: Invalid JSON configuration. ${error.message}`;
        alert(`Invalid JSON configuration:\n${error.message}\nPlease check the text area.`);
      }
    }

  getLastConfiguredBox() {
    return this.configuredBoxes.length > 0
      ? this.configuredBoxes[this.configuredBoxes.length - 1]
      : null;
  }

  destroy() {
      if (this.appContainer && this.appContainer.parentNode) {
        this.appContainer.parentNode.removeChild(this.appContainer);
      }
    }


  setupStyles() {
      applyCss(`
        /* Global body reset to eliminate white margin borders */
        body {
          margin: 0 !important;
          padding: 0 !important;
          background-color: #0f172a;
        }

        :root {
          --tc-bg: #0f172a;
          --tc-card: #1e293b;
          --tc-border: #334155;
          --tc-text: #f8fafc;
          --tc-muted: #94a3b8;
          --tc-primary: #38bdf8;
          --tc-accent: #f59e0b;
          --tc-success: #10b981;
          --tc-highlight: #ec4899;
          --tc-font: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .tc-container {
          background-color: var(--tc-bg);
          color: var(--tc-text);
          font-family: var(--tc-font);
          padding: 24px;
          min-height: 100vh;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .tc-header {
          border-bottom: 1px solid var(--tc-border);
          padding-bottom: 12px;
        }

        .tc-title {
          font-size: 1.8rem;
          font-weight: 800;
          margin: 0 0 8px 0;
          background: linear-gradient(135deg, var(--tc-primary), var(--tc-success));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .tc-description {
          font-size: 0.95rem;
          color: var(--tc-muted);
          margin: 0;
          line-height: 1.4;
        }

        .tc-dashboard-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }

        @media (min-width: 1024px) {
          .tc-dashboard-grid {
            grid-template-columns: 3fr 1fr;
          }
        }

        .tc-chart-pane {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .tc-svg-container {
          background-color: var(--tc-card);
          border: 1px solid var(--tc-border);
          border-radius: 12px;
          padding: 16px;
          position: relative;
        }

        .tc-svg-element {
          width: 100%;
          height: auto;
          display: block;
        }

        .tc-sliders-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }

        @media (min-width: 768px) {
          .tc-sliders-row {
            grid-template-columns: 1fr 1fr;
          }
        }

        .tc-policy-card {
          background-color: var(--tc-card);
          border: 1px solid var(--tc-border);
          border-radius: 12px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .tc-slider-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .tc-slider-label-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .tc-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: var(--tc-border);
          outline: none;
        }

        .tc-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--tc-primary);
          cursor: pointer;
          transition: background 0.15s ease-in-out;
        }

        .tc-slider::-webkit-slider-thumb:hover {
          background: var(--tc-success);
        }

        .tc-tooltip {
          position: absolute;
          background: rgba(15, 23, 42, 0.95);
          border: 2px solid var(--tc-primary);
          border-radius: 8px;
          padding: 12px;
          font-size: 0.85rem;
          pointer-events: none;
          display: none;
          z-index: 100;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.5);
          width: 280px;
        }

        .tc-tooltip-header {
          font-weight: bold;
          color: var(--tc-primary);
          margin-bottom: 6px;
          border-bottom: 1px solid var(--tc-border);
          padding-bottom: 4px;
        }

        .tc-tooltip-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .tc-tooltip-val {
          font-weight: 600;
          color: var(--tc-text);
        }

        .tc-stats-sidebar {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .tc-stat-card {
          background-color: var(--tc-card);
          border: 1px solid var(--tc-border);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .tc-stat-title {
          font-size: 0.8rem;
          font-weight: bold;
          color: var(--tc-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .tc-stat-value {
          font-size: 1.6rem;
          font-weight: 800;
        }

        .tc-legend {
          display: flex;
          gap: 20px;
          font-size: 0.85rem;
          margin-top: 8px;
          justify-content: center;
        }

        .tc-legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .tc-legend-color {
          width: 14px;
          height: 14px;
          border-radius: 3px;
        }

        .tc-btn {
          background-color: var(--tc-primary);
          color: var(--tc-bg);
          border: none;
          padding: 10px 16px;
          font-weight: bold;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .tc-btn:hover {
          background-color: var(--tc-success);
        }

        .tc-toggle-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          user-select: none;
          font-size: 0.85rem;
          color: var(--tc-muted);
          font-weight: bold;
          cursor: pointer;
        }
      `, 'taxchart-theme-styles');
    }

  renderLayout(parent) {
      this.appContainer = makeElement('div', { className: 'tc-container' });

      // Header row with title & selective dataset load dropdown & log-mode toggle
      const header = makeElement('div', { className: 'tc-header' }, [
        makeElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' } }, [
          makeElement('h1', { className: 'tc-title' }, 'Income & Progressive Taxation Simulator'),
          makeElement('div', { style: { display: 'flex', alignItems: 'center', gap: '16px' } }, [
            // Log/Linear Checkbox Toggle
            makeElement('label', { className: 'tc-toggle-wrap' }, [
              this.logToggleCheckbox = makeElement('input', {
                type: 'checkbox',
                checked: this.isLogarithmic,
                onchange: (e) => {
                  this.isLogarithmic = e.target.checked;
                  this.updateInteractiveElements();
                }
              }),
              makeElement('span', 'Use Logarithmic Scale (Defaults On)')
            ]),
            makeElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [
              makeElement('span', { style: { fontSize: '0.85rem', color: 'var(--tc-muted)', fontWeight: 'bold' } }, 'Dataset:'),
              this.datasetSelect = makeElement('select', {
                className: 'tc-select',
                style: { width: 'auto', minWidth: '220px' },
                onchange: (e) => {
                  this.currentDatasetPath = e.target.value;
                  this.loadSelectedDataset();
                }
              }, this.datasets.map(d => makeElement('option', { value: d.path }, d.label)))
            ])
          ])
        ]),
        this.descriptionLabel = makeElement('p', { className: 'tc-description' }, 'Loading income distribution models...')
      ]);
      this.appContainer.appendChild(header);

      // Create Grid Area
      this.dashboardGrid = makeElement('div', { className: 'tc-dashboard-grid' });
      this.appContainer.appendChild(this.dashboardGrid);

      parent.appendChild(this.appContainer);
    }

  async loadSelectedDataset() {
      try {
        let raw;
        try {
          const response = await fetch(this.currentDatasetPath);
          if (response.ok) {
            raw = await response.json();
          }
        } catch (e) {
          // Fallback handled below
        }

        if (!raw) {
          raw = await this.getFallbackData(this.currentDatasetPath);
        }

        this.currentData = JSON.parse(JSON.stringify(raw));
        this.descriptionLabel.textContent = this.currentData.description || '';
        this.renderDashboardOnce();
        this.updateInteractiveElements();
      } catch (err) {
        this.descriptionLabel.textContent = `Error loading model: ${err.message}`;
      }
    }

  async getFallbackData(path) {
      if (path.includes('social_democratic')) {
        return {
          "name": "Nordic Social Democratic Model",
          "type": "households",
          "totalEntities": 12000000,
          "currency": "€",
          "description": "Compressed income ranges with a high basic floor and low inequality.",
          "data": [
            {"percentile": 2.5, "income": 26000}, {"percentile": 7.5, "income": 31000}, {"percentile": 12.5, "income": 35000},
            {"percentile": 17.5, "income": 39000}, {"percentile": 22.5, "income": 43000}, {"percentile": 27.5, "income": 47000},
            {"percentile": 32.5, "income": 51000}, {"percentile": 37.5, "income": 55000}, {"percentile": 42.5, "income": 59000},
            {"percentile": 47.5, "income": 64000}, {"percentile": 52.5, "income": 69000}, {"percentile": 57.5, "income": 74000},
            {"percentile": 62.5, "income": 80000}, {"percentile": 67.5, "income": 87000}, {"percentile": 72.5, "income": 95000},
            {"percentile": 77.5, "income": 105000}, {"percentile": 82.5, "income": 118000}, {"percentile": 87.5, "income": 136000},
            {"percentile": 92.5, "income": 165000}, {"percentile": 97.5, "income": 230000}
          ]
        };
      } else if (path.includes('concentrated_wealth')) {
        return {
          "name": "AI Automated Post-Job Economy",
          "type": "citizens",
          "totalEntities": 150000000,
          "currency": "$",
          "description": "Extreme automation: 75% of citizens have lost wage earning power (pre-tax $0) due to AI integration, while wealth is captured by AI-infrastructure and robotic service providers.",
          "data": [
            {"percentile": 2.5, "income": 0},
            {"percentile": 7.5, "income": 0},
            {"percentile": 12.5, "income": 0},
            {"percentile": 17.5, "income": 0},
            {"percentile": 22.5, "income": 0},
            {"percentile": 27.5, "income": 0},
            {"percentile": 32.5, "income": 0},
            {"percentile": 37.5, "income": 0},
            {"percentile": 42.5, "income": 0},
            {"percentile": 47.5, "income": 0},
            {"percentile": 52.5, "income": 0},
            {"percentile": 57.5, "income": 0},
            {"percentile": 62.5, "income": 0},
            {"percentile": 67.5, "income": 0},
            {"percentile": 72.5, "income": 0},
            {"percentile": 77.5, "income": 12000},
            {"percentile": 82.5, "income": 95000},
            {"percentile": 87.5, "income": 450000},
            {"percentile": 92.5, "income": 2800000},
            {"percentile": 97.5, "income": 18500000}
          ]
        };
      } else {
        return {
          "name": "United States Estimate (2024)",
          "type": "households",
          "totalEntities": 131400000,
          "currency": "$",
          "description": "Approximate distribution of US household incomes with a wide range and high upper tail.",
          "data": [
            {"percentile": 2.5, "income": 7200}, {"percentile": 7.5, "income": 15000}, {"percentile": 12.5, "income": 23000},
            {"percentile": 17.5, "income": 32000}, {"percentile": 22.5, "income": 41000}, {"percentile": 27.5, "income": 50000},
            {"percentile": 32.5, "income": 60000}, {"percentile": 37.5, "income": 71000}, {"percentile": 42.5, "income": 83000},
            {"percentile": 47.5, "income": 96000}, {"percentile": 52.5, "income": 110000}, {"percentile": 57.5, "income": 126000},
            {"percentile": 62.5, "income": 145000}, {"percentile": 67.5, "income": 170000}, {"percentile": 72.5, "income": 200000},
            {"percentile": 77.5, "income": 240000}, {"percentile": 82.5, "income": 295000}, {"percentile": 87.5, "income": 390000},
            {"percentile": 92.5, "income": 580000}, {"percentile": 97.5, "income": 1250000}
          ]
        };
      }
    }

  calculateGini(incomes) {
      const n = incomes.length;
      if (n === 0) return 0;
      let absoluteDifferenceSum = 0;
      let totalSum = 0;

      for (let i = 0; i < n; i++) {
        totalSum += incomes[i];
        for (let j = 0; j < n; j++) {
          absoluteDifferenceSum += Math.abs(incomes[i] - incomes[j]);
        }
      }

      if (totalSum === 0) return 0;
      return absoluteDifferenceSum / (2 * n * totalSum);
    }

  buildEditorFields() {
      this.editorWrapper.innerHTML = '';
      
      const title = makeElement('div', { 
        style: { fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--tc-primary)', marginBottom: '8px' } 
      }, 'Dynamically Adjust Bracket Incomes');
      
      const subtitle = makeElement('div', { 
        style: { fontSize: '0.8rem', color: 'var(--tc-muted)', marginBottom: '12px' } 
      }, 'Values update live on the chart. Feel free to modify individual percentiles:');

      const cells = makeElement('div', { className: 'tc-editor-grid' });
      
      this.customInputs = {};
      this.currentData.data.forEach((item, index) => {
        const cell = makeElement('div', { className: 'tc-editor-cell' });
        const label = makeElement('label', { 
          style: { fontSize: '0.75rem', color: 'var(--tc-muted)', fontWeight: 'bold' } 
        }, `${item.percentile}%`);
        
        const input = makeElement('input', {
          type: 'number',
          className: 'tc-input',
          style: { padding: '5px 8px', fontSize: '0.8rem' },
          value: String(item.income),
          oninput: (e) => {
            const val = parseFloat(e.target.value) || 0;
            this.currentData.data[index].income = val;
            this.renderChart();
            this.updateTableRow(index, val);
          }
        });
        
        this.customInputs[index] = input;
        cell.appendChild(label);
        cell.appendChild(input);
        cells.appendChild(cell);
      });

      const totalPopGroup = makeElement('div', { 
        style: { display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '16px', alignItems: 'center' } 
      }, [
        makeElement('div', { style: { flex: '1', minWidth: '220px' } }, [
          makeElement('label', { className: 'tc-label' }, `Total Population / ${this.currentData.type || 'Households'}`),
          this.popInput = makeElement('input', {
            type: 'number',
            className: 'tc-input',
            value: String(this.currentData.totalEntities),
            oninput: (e) => {
              this.currentData.totalEntities = parseFloat(e.target.value) || 0;
              this.renderChart();
              this.renderTable();
            }
          })
        ]),
        makeElement('div', { style: { display: 'flex', gap: '8px', marginTop: '22px' } }, [
          makeElement('button', {
            className: 'tc-btn',
            onclick: () => {
              this.currentData.data = this.currentData.data.map(item => ({
                ...item,
                income: Math.round(item.income * 1.05)
              }));
              this.syncInputs();
              this.renderChart();
              this.renderTable();
            }
          }, 'Scale Income +5%'),
          makeElement('button', {
            className: 'tc-btn-secondary',
            onclick: () => {
              this.currentData.data = this.currentData.data.map(item => ({
                ...item,
                income: Math.round(item.income * 0.95)
              }));
              this.syncInputs();
              this.renderChart();
              this.renderTable();
            }
          }, 'Scale -5%')
        ])
      ]);

      this.editorWrapper.appendChild(title);
      this.editorWrapper.appendChild(subtitle);
      this.editorWrapper.appendChild(cells);
      this.editorWrapper.appendChild(totalPopGroup);
    }

  syncInputs() {
      this.currentData.data.forEach((item, index) => {
        if (this.customInputs[index]) {
          this.customInputs[index].value = String(item.income);
        }
      });
      if (this.popInput) {
        this.popInput.value = String(this.currentData.totalEntities);
      }
    }

  renderChart() {
      this.gridDiv.innerHTML = '';

      if (!this.currentData || !this.currentData.data) return;

      const dataPoints = this.currentData.data;
      const totalPop = this.currentData.totalEntities;
      const currency = this.currentData.currency || '$';
      
      // Compute math structures
      const maxIncome = Math.max(...dataPoints.map(p => p.income), 1);
      
      // Log scaling formulas
      // y = log10(income + logOffset) - log10(logOffset)
      const scaleLogY = (val) => {
        if (val <= 0) return 0;
        return Math.log10(val + this.logOffset) - Math.log10(this.logOffset);
      };

      const maxScaledY = scaleLogY(maxIncome);

      // SVG structural dimensions
      const width = 1000;
      const height = 450;
      const padding = { top: 30, right: 40, bottom: 60, left: 80 };

      const chartW = width - padding.left - padding.right;
      const chartH = height - padding.top - padding.bottom;

      // Coordinate mapping helpers
      const mapX = (percentile) => {
        // maps 0% - 100% horizontally
        return padding.left + (percentile / 100) * chartW;
      };

      const mapY = (val) => {
        if (val <= 0) return padding.top + chartH; // zero baseline bottom-aligned
        const scaledVal = scaleLogY(val);
        const fraction = scaledVal / maxScaledY;
        return padding.top + chartH - (fraction * chartH);
      };

      // Calculate economic metrics
      let totalEconomyIncome = 0;
      dataPoints.forEach(p => {
        const bracketPopulation = totalPop * 0.05; // 5% of population in each bracket
        totalEconomyIncome += p.income * bracketPopulation;
      });

      const gini = this.calculateGini(dataPoints);

      // Side analytic cards
      const sidebar = makeElement('div', { className: 'tc-metrics-sidebar' }, [
        makeElement('div', { className: 'tc-card tc-metric-stat' }, [
          makeElement('span', { className: 'tc-label' }, 'Total Aggregate Income'),
          makeElement('span', { className: 'tc-metric-num', style: { color: 'var(--tc-primary)' } }, 
            `${currency}${Math.round(totalEconomyIncome).toLocaleString()}`
          ),
          makeElement('span', { style: { fontSize: '0.75rem', color: 'var(--tc-muted)' } }, `Generated annually by ${totalPop.toLocaleString()} ${this.currentData.type}`)
        ]),
        makeElement('div', { className: 'tc-card tc-metric-stat' }, [
          makeElement('span', { className: 'tc-label' }, 'Calculated Gini Coefficient'),
          makeElement('span', { className: 'tc-metric-num', style: { color: 'var(--tc-highlight)' } }, 
            gini.toFixed(4)
          ),
          makeElement('span', { style: { fontSize: '0.75rem', color: 'var(--tc-muted)' } }, '0.0000 indicates absolute equality. 1.0000 represents total inequality.')
        ])
      ]);

      // Chart area wrapping structure
      const chartPane = makeElement('div', { className: 'tc-chart-pane' });
      const svgWrap = makeElement('div', { className: 'tc-svg-wrap' });
      
      const tooltip = makeElement('div', { className: 'tc-tooltip-box' });
      svgWrap.appendChild(tooltip);

      // Build the SVG child list
      const svgChildren = [];

      // Grid Lines & Axis Lines
      // Horizontal Y lines corresponding to visual intervals
      const yTicks = 5;
      for (let i = 0; i <= yTicks; i++) {
        const frac = i / yTicks;
        // Map back to income scale mathematically
        const scaledTickY = frac * maxScaledY;
        // Inverse formula of scaledY = log10(val + logOffset) - log10(logOffset)
        // val = 10^(scaledTickY + log10(logOffset)) - logOffset
        const reconstructedIncome = Math.pow(10, scaledTickY + Math.log10(this.logOffset)) - this.logOffset;
        const visualIncome = Math.round(reconstructedIncome);
        const yCoord = padding.top + chartH - (frac * chartH);

        svgChildren.push(['svg:line', {
          x1: padding.left,
          y1: yCoord,
          x2: width - padding.right,
          y2: yCoord,
          stroke: 'var(--tc-border)',
          'stroke-width': 1,
          'stroke-dasharray': '4 4'
        }]);

        // Y Labels
        svgChildren.push(['svg:text', {
          x: padding.left - 12,
          y: yCoord + 4,
          'text-anchor': 'end',
          fill: 'var(--tc-muted)',
          'font-size': '11px',
          'font-family': 'monospace'
        }, `${currency}${visualIncome.toLocaleString()}`]);
      }

      // Vertical percentile 5% guide markers
      for (let p = 0; p <= 100; p += 10) {
        const xCoord = mapX(p);
        svgChildren.push(['svg:line', {
          x1: xCoord,
          y1: padding.top,
          x2: xCoord,
          y2: padding.top + chartH,
          stroke: 'rgba(51, 65, 85, 0.4)',
          'stroke-width': 1
        }]);

        svgChildren.push(['svg:text', {
          x: xCoord,
          y: padding.top + chartH + 20,
          'text-anchor': 'middle',
          fill: 'var(--tc-muted)',
          'font-size': '11px'
        }, `${p}%`]);
      }

      // Render actual SVG Area under curve (Baseline-0 up to points)
      let areaPathD = `M ${mapX(0)} ${padding.top + chartH}`;
      
      // Let's draw standard connections
      dataPoints.forEach((p) => {
        areaPathD += ` L ${mapX(p.percentile)} ${mapY(p.income)}`;
      });
      areaPathD += ` L ${mapX(100)} ${padding.top + chartH} Z`;

      svgChildren.push(['svg:path', {
        d: areaPathD,
        fill: 'url(#tc-gradient)',
        opacity: 0.25
      }]);

      // Draw lines between coordinates
      let linePathD = `M ${mapX(dataPoints[0].percentile)} ${mapY(dataPoints[0].income)}`;
      for (let i = 1; i < dataPoints.length; i++) {
        linePathD += ` L ${mapX(dataPoints[i].percentile)} ${mapY(dataPoints[i].income)}`;
      }

      svgChildren.push(['svg:path', {
        d: linePathD,
        fill: 'none',
        stroke: 'var(--tc-primary)',
        'stroke-width': 3,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
      }]);

      // Render SVG gradients
      svgChildren.push(['svg:defs', {}, [
        ['svg:linearGradient', { id: 'tc-gradient', x1: '0%', y1: '0%', x2: '0%', y2: '100%' }, [
          ['svg:stop', { offset: '0%', 'stop-color': 'var(--tc-accent)', 'stop-opacity': 0.8 }],
          ['svg:stop', { offset: '100%', 'stop-color': 'var(--tc-primary)', 'stop-opacity': 0 }]
        ]]
      ]]);

      // Plot midpoint interactive markers
      dataPoints.forEach((p, idx) => {
        const cx = mapX(p.percentile);
        const cy = mapY(p.income);

        const isHovered = (this.hoveredIndex === idx);
        
        // Transparent interaction hitboxes to make hovering effortless
        svgChildren.push(['svg:circle', {
          cx: cx,
          cy: cy,
          r: 16,
          fill: 'transparent',
          style: { cursor: 'pointer' },
          onmouseover: (e) => {
            this.hoveredIndex = idx;
            this.highlightTableRow(idx);
            
            // Build and calculate hovering metrics
            const bracketPop = totalPop * 0.05;
            const bracketTotalIncome = p.income * bracketPop;
            const pctOfTotal = totalEconomyIncome > 0 ? (bracketTotalIncome / totalEconomyIncome * 100) : 0;

            tooltip.style.display = 'block';
            tooltip.innerHTML = '';
            tooltip.appendChild(makeElement('div', { className: 'tc-tooltip-title' }, `Percentile: ${p.percentile - 2.5}% - ${p.percentile + 2.5}%`));
            
            tooltip.appendChild(makeElement('div', { className: 'tc-tooltip-row' }, [
              makeElement('span', 'Midpoint:'),
              makeElement('span', { className: 'tc-tooltip-val' }, `${p.percentile}%`)
            ]));
            tooltip.appendChild(makeElement('div', { className: 'tc-tooltip-row' }, [
              makeElement('span', 'Avg. Income:'),
              makeElement('span', { className: 'tc-tooltip-val' }, `${currency}${p.income.toLocaleString()}`)
            ]));
            tooltip.appendChild(makeElement('div', { className: 'tc-tooltip-row' }, [
              makeElement('span', 'Pop. in Bracket:'),
              makeElement('span', { className: 'tc-tooltip-val' }, `${Math.round(bracketPop).toLocaleString()}`)
            ]));
            tooltip.appendChild(makeElement('div', { className: 'tc-tooltip-row' }, [
              makeElement('span', 'Total Bracket Income:'),
              makeElement('span', { className: 'tc-tooltip-val' }, `${currency}${Math.round(bracketTotalIncome).toLocaleString()}`)
            ]));
            tooltip.appendChild(makeElement('div', { className: 'tc-tooltip-row' }, [
              makeElement('span', 'National Share:'),
              makeElement('span', { className: 'tc-tooltip-val', style: { color: 'var(--tc-highlight)' } }, `${pctOfTotal.toFixed(2)}%`)
            ]));

            // Move the tooltip neatly
            const wrapRect = svgWrap.getBoundingClientRect();
            const tipX = cx + 15;
            const tipY = cy - 20;
            tooltip.style.left = `${tipX}px`;
            tooltip.style.top = `${tipY}px`;
            
            this.renderChart();
          },
          onmouseout: () => {
            this.hoveredIndex = null;
            this.clearTableRowHighlight();
            tooltip.style.display = 'none';
            this.renderChart();
          }
        }]);

        // Visible node markers
        svgChildren.push(['svg:circle', {
          cx: cx,
          cy: cy,
          r: isHovered ? 8 : 5,
          fill: isHovered ? 'var(--tc-highlight)' : 'var(--tc-primary)',
          stroke: 'var(--tc-bg)',
          'stroke-width': isHovered ? 3 : 1.5,
          transition: 'all 0.1s ease'
        }]);
      });

      // Axis Line markers
      svgChildren.push(['svg:line', {
        x1: padding.left,
        y1: padding.top + chartH,
        x2: width - padding.right,
        y2: padding.top + chartH,
        stroke: 'var(--tc-muted)',
        'stroke-width': 2
      }]);
      svgChildren.push(['svg:line', {
        x1: padding.left,
        y1: padding.top,
        x2: padding.left,
        y2: padding.top + chartH,
        stroke: 'var(--tc-muted)',
        'stroke-width': 2
      }]);

      // Render actual SVG inside the viewport container
      const svgElement = makeElement('svg:svg', {
        viewBox: `0 0 ${width} ${height}`,
        className: 'tc-svg-element'
      }, svgChildren);

      svgWrap.appendChild(svgElement);
      chartPane.appendChild(svgWrap);
      
      this.gridDiv.appendChild(chartPane);
      this.gridDiv.appendChild(sidebar);
    }

  renderTable() {
      this.tableWrapper.innerHTML = '';

      if (!this.currentData || !this.currentData.data) return;

      const dataPoints = this.currentData.data;
      const totalPop = this.currentData.totalEntities;
      const currency = this.currentData.currency || '$';

      // Compute total absolute economy value
      let totalEconomyIncome = 0;
      dataPoints.forEach(p => {
        totalEconomyIncome += p.income * (totalPop * 0.05);
      });

      const table = makeElement('table', { className: 'tc-table' });
      
      // Header row
      const thead = makeElement('thead', {}, [
        makeElement('tr', {}, [
          makeElement('th', 'Bracket Percentiles'),
          makeElement('th', 'Midpoint %'),
          makeElement('th', 'Representative Household Income'),
          makeElement('th', 'Group Population (5%)'),
          makeElement('th', 'Total Generated Value'),
          makeElement('th', '% of National Economy')
        ])
      ]);
      table.appendChild(thead);

      const tbody = makeElement('tbody');
      
      dataPoints.forEach((p, idx) => {
        const bracketPop = totalPop * 0.05;
        const totalBracketVal = p.income * bracketPop;
        const economyShare = totalEconomyIncome > 0 ? (totalBracketVal / totalEconomyIncome * 100) : 0;

        const tr = makeElement('tr', {
          id: `tc-tr-${idx}`,
          onmouseover: () => {
            this.hoveredIndex = idx;
            this.renderChart();
            tr.classList.add('tc-active-row');
          },
          onmouseout: () => {
            this.hoveredIndex = null;
            this.renderChart();
            tr.classList.remove('tc-active-row');
          }
        }, [
          makeElement('td', { style: { fontWeight: '600' } }, `${p.percentile - 2.5}% - ${p.percentile + 2.5}%`),
          makeElement('td', `${p.percentile}%`),
          makeElement('td', { id: `tc-td-val-${idx}` }, `${currency}${p.income.toLocaleString()}`),
          makeElement('td', `${Math.round(bracketPop).toLocaleString()}`),
          makeElement('td', `${currency}${Math.round(totalBracketVal).toLocaleString()}`),
          makeElement('td', { style: { color: 'var(--tc-primary)', fontWeight: 'bold' } }, `${economyShare.toFixed(2)}%`)
        ]);

        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      this.tableWrapper.appendChild(table);
    }

  updateTableRow(index, val) {
      const cell = document.getElementById(`tc-td-val-${index}`);
      if (cell) {
        const currency = this.currentData.currency || '$';
        cell.textContent = `${currency}${val.toLocaleString()}`;
      }
      
      // Re-trigger global mathematical aggregates on table without doing heavy rebuild of all rows
      let totalEconomyIncome = 0;
      const totalPop = this.currentData.totalEntities;
      this.currentData.data.forEach(p => {
        totalEconomyIncome += p.income * (totalPop * 0.05);
      });

      // Update rows to reflect new percentage splits
      this.currentData.data.forEach((p, idx) => {
        const tr = document.getElementById(`tc-tr-${idx}`);
        if (tr) {
          const totalBracketVal = p.income * (totalPop * 0.05);
          const economyShare = totalEconomyIncome > 0 ? (totalBracketVal / totalEconomyIncome * 100) : 0;
          
          // Row 4th element is Total Generated Value, 5th element is National Share
          const tdGenerated = tr.children[4];
          const tdShare = tr.children[5];
          const currency = this.currentData.currency || '$';

          if (tdGenerated) tdGenerated.textContent = `${currency}${Math.round(totalBracketVal).toLocaleString()}`;
          if (tdShare) tdShare.textContent = `${economyShare.toFixed(2)}%`;
        }
      });
    }

  highlightTableRow(idx) {
      const tr = document.getElementById(`tc-tr-${idx}`);
      if (tr) {
        tr.classList.add('tc-active-row');
        tr.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

  clearTableRowHighlight() {
      const rows = document.querySelectorAll('.tc-table tr');
      rows.forEach(r => r.classList.remove('tc-active-row'));
    }

  setupDataEditorCollapsible() {
      this.collapsibleContainer = makeElement('div', { className: 'tc-collapsible' });
      
      const trigger = makeElement('div', {
        className: 'tc-collapsible-trigger',
        onclick: () => {
          this.showTable = !this.showTable;
          content.style.display = this.showTable ? 'block' : 'none';
          arrow.textContent = this.showTable ? '▼' : '▶';
          if (this.showTable) {
            this.renderCollapsibleTableOnly();
          }
        }
      }, [
        makeElement('span', 'Manual Bracket Overrides & Dataset Table'),
        this.collapsibleArrow = makeElement('span', '▶')
      ]);
      const arrow = this.collapsibleArrow;

      const content = makeElement('div', {
        className: 'tc-collapsible-content',
        style: { display: 'none' }
      });

      this.editorGrid = makeElement('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }
      });
      content.appendChild(makeElement('h4', { style: { margin: '0 0 10px 0', fontSize: '0.9rem' } }, 'Adjust Income at Percentile Midpoints:'));
      content.appendChild(this.editorGrid);

      // Total population adjuster
      this.populationAdjustmentRow = makeElement('div', {
        style: { display: 'flex', gap: '16px', alignItems: 'center', borderTop: '1px solid var(--tc-border)', paddingTop: '16px' }
      });
      content.appendChild(this.populationAdjustmentRow);

      this.collapsibleContainer.appendChild(trigger);
      this.collapsibleContainer.appendChild(content);
      this.appContainer.appendChild(this.collapsibleContainer);
    }

  buildEditorInputs() {
      this.editorGrid.innerHTML = '';
      this.customInputs = {};

      this.currentData.data.forEach((p, idx) => {
        const item = makeElement('div', {
          style: { display: 'flex', flexDirection: 'column', gap: '4px' }
        }, [
          makeElement('span', { style: { fontSize: '0.75rem', color: 'var(--tc-muted)', fontWeight: 'bold' } }, `${p.percentile}%`),
          this.customInputs[idx] = makeElement('input', {
            type: 'number',
            className: 'tc-input',
            style: { padding: '4px 6px', fontSize: '0.8rem' },
            value: String(p.income),
            oninput: (e) => {
              const val = parseFloat(e.target.value) || 0;
              this.currentData.data[idx].income = val;
              this.updateInteractiveElements();
            }
          })
        ]);
        this.editorGrid.appendChild(item);
      });

      this.populationAdjustmentRow.innerHTML = '';
      this.populationAdjustmentRow.appendChild(
        makeElement('div', { style: { flex: '1' } }, [
          makeElement('label', { style: { display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' } }, `Simulated Population / ${this.currentData.type || 'entities'}`),
          makeElement('input', {
            type: 'number',
            className: 'tc-input',
            style: { maxWidth: '240px' },
            value: String(this.currentData.totalEntities),
            oninput: (e) => {
              this.currentData.totalEntities = parseFloat(e.target.value) || 10000;
              this.updateInteractiveElements();
            }
          })
        ])
      );
    }

  calculateTaxes(dataPoints, totalRevenuePercent, progressivityPercent) {
      const n = dataPoints.length;
      const incomes = dataPoints.map(p => p.income);
      const totalPreTaxIncome = incomes.reduce((a, b) => a + b, 0);
      
      const r = totalRevenuePercent / 100;
      const targetRevenueTotal = totalPreTaxIncome * r;
      const targetTaxPerBracket = targetRevenueTotal / n;
      const averageIncome = totalPreTaxIncome / n;

      let taxes = new Array(n).fill(0);
      const p = progressivityPercent / 100;

      if (p <= 0.5) {
        const linearU = p * 2;
        const u = 1 - Math.pow(1 - linearU, 4);
        for (let i = 0; i < n; i++) {
          taxes[i] = (1 - u) * targetTaxPerBracket + u * (r * incomes[i]);
        }
      } else {
        const u = (p - 0.5) * 2;
        for (let i = 0; i < n; i++) {
          const equalizingTax = incomes[i] - (1 - r) * averageIncome;
          taxes[i] = (1 - u) * (r * incomes[i]) + u * equalizingTax;
        }
      }

      let iterations = 0;
      while (iterations < 10) {
        let shortfall = 0;
        let eligiblePreTaxSum = 0;

        for (let i = 0; i < n; i++) {
          if (taxes[i] > incomes[i]) {
            shortfall += (taxes[i] - incomes[i]);
            taxes[i] = incomes[i];
          } else if (taxes[i] < incomes[i]) {
            eligiblePreTaxSum += incomes[i];
          }
        }

        if (shortfall < 0.1 || eligiblePreTaxSum === 0) break;

        for (let i = 0; i < n; i++) {
          if (taxes[i] < incomes[i]) {
            const share = incomes[i] / eligiblePreTaxSum;
            taxes[i] += shortfall * share;
          }
        }
        iterations++;
      }

      const postTax = incomes.map((inc, i) => Math.max(0, inc - taxes[i]));

      return { taxes, postTax };
    }

  renderDashboard() {
      this.dashboardGrid.innerHTML = '';

      if (!this.currentData || !this.currentData.data) return;

      const dataPoints = this.currentData.data;
      const totalPop = this.currentData.totalEntities;
      const currency = this.currentData.currency || '$';

      // Pre-tax math
      const preTaxIncomes = dataPoints.map(p => p.income);
      const preTaxGini = this.calculateGini(preTaxIncomes);
      
      const preTaxSum = preTaxIncomes.reduce((a, b) => a + b, 0);
      const nationalAnnualIncome = preTaxSum * (totalPop * 0.05);

      // Post-tax math
      const { taxes, postTax } = this.calculateTaxes(dataPoints, this.taxRevenuePercent, this.taxProgressivity);
      const postTaxGini = this.calculateGini(postTax);

      const totalTaxesCollected = taxes.reduce((a, b) => a + b, 0) * (totalPop * 0.05);
      const actualCollectedRatio = nationalAnnualIncome > 0 ? (totalTaxesCollected / nationalAnnualIncome * 100) : 0;

      // 1. Chart Pane (SVG area + Legend)
      const chartPane = makeElement('div', { className: 'tc-chart-pane' });
      
      const svgContainer = makeElement('div', { className: 'tc-svg-container' });
      chartPane.appendChild(svgContainer);

      // Tooltip inside the same absolute container
      const tooltip = makeElement('div', { className: 'tc-tooltip' });
      svgContainer.appendChild(tooltip);

      // SVG coordinate layout configuration
      const width = 1000;
      const height = 440;
      const padding = { top: 30, right: 40, bottom: 50, left: 80 };
      const chartW = width - padding.left - padding.right;
      const chartH = height - padding.top - padding.bottom;

      const maxPreTaxVal = Math.max(...preTaxIncomes, 1);
      const maxPostTaxVal = Math.max(...postTax, 1);
      const maxOverallValue = Math.max(maxPreTaxVal, maxPostTaxVal);

      // Pseudo-log mapping helper
      const scaleLogY = (val) => {
        if (val <= 0) return 0;
        return Math.log10(val + this.logOffset) - Math.log10(this.logOffset);
      };

      const maxScaledValue = scaleLogY(maxOverallValue);

      const mapX = (percentile) => {
        return padding.left + (percentile / 100) * chartW;
      };

      const mapY = (val) => {
        if (val <= 0) return padding.top + chartH; // perfect 0 baseline
        const scaled = scaleLogY(val);
        const fraction = scaled / maxScaledValue;
        return padding.top + chartH - (fraction * chartH);
      };

      const svgChildren = [];

      // Grid helper lines
      const yTicks = 5;
      for (let i = 0; i <= yTicks; i++) {
        const frac = i / yTicks;
        const scaledTickY = frac * maxScaledValue;
        // Inverse mapping
        const val = Math.pow(10, scaledTickY + Math.log10(this.logOffset)) - this.logOffset;
        const visualValue = Math.max(0, Math.round(val));
        const yCoord = padding.top + chartH - (frac * chartH);

        svgChildren.push(['svg:line', {
          x1: padding.left,
          y1: yCoord,
          x2: width - padding.right,
          y2: yCoord,
          stroke: 'var(--tc-border)',
          'stroke-width': 1,
          'stroke-dasharray': '3 3'
        }]);

        svgChildren.push(['svg:text', {
          x: padding.left - 12,
          y: yCoord + 4,
          'text-anchor': 'end',
          fill: 'var(--tc-muted)',
          'font-size': '11px',
          'font-family': 'monospace'
        }, `${currency}${visualValue.toLocaleString()}`]);
      }

      // X Percentile Labels & lines
      for (let p = 0; p <= 100; p += 10) {
        const xCoord = mapX(p);
        svgChildren.push(['svg:line', {
          x1: xCoord,
          y1: padding.top,
          x2: xCoord,
          y2: padding.top + chartH,
          stroke: 'rgba(51, 65, 85, 0.4)',
          'stroke-width': 1
        }]);

        svgChildren.push(['svg:text', {
          x: xCoord,
          y: padding.top + chartH + 20,
          'text-anchor': 'middle',
          fill: 'var(--tc-muted)',
          'font-size': '11px'
        }, `${p}%`]);
      }

      // Render Area under Pre-Tax Curve (soft gradient)
      let preTaxArea = `M ${mapX(0)} ${padding.top + chartH}`;
      dataPoints.forEach(p => {
        preTaxArea += ` L ${mapX(p.percentile)} ${mapY(p.income)}`;
      });
      preTaxArea += ` L ${mapX(100)} ${padding.top + chartH} Z`;

      svgChildren.push(['svg:path', {
        d: preTaxArea,
        fill: 'url(#pre-tax-grad)',
        opacity: 0.15
      }]);

      // Render Area under Post-Tax Curve (different gradient)
      let postTaxArea = `M ${mapX(0)} ${padding.top + chartH}`;
      dataPoints.forEach((p, idx) => {
        postTaxArea += ` L ${mapX(p.percentile)} ${mapY(postTax[idx])}`;
      });
      postTaxArea += ` L ${mapX(100)} ${padding.top + chartH} Z`;

      svgChildren.push(['svg:path', {
        d: postTaxArea,
        fill: 'url(#post-tax-grad)',
        opacity: 0.15
      }]);

      // Draw the Pre-Tax line path
      let preLine = `M ${mapX(dataPoints[0].percentile)} ${mapY(dataPoints[0].income)}`;
      for (let i = 1; i < dataPoints.length; i++) {
        preLine += ` L ${mapX(dataPoints[i].percentile)} ${mapY(dataPoints[i].income)}`;
      }
      svgChildren.push(['svg:path', {
        d: preLine,
        fill: 'none',
        stroke: 'var(--tc-primary)',
        'stroke-width': 3,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
      }]);

      // Draw the Post-Tax line path
      let postLine = `M ${mapX(dataPoints[0].percentile)} ${mapY(postTax[0])}`;
      for (let i = 1; i < dataPoints.length; i++) {
        postLine += ` L ${mapX(dataPoints[i].percentile)} ${mapY(postTax[i])}`;
      }
      svgChildren.push(['svg:path', {
        d: postLine,
        fill: 'none',
        stroke: 'var(--tc-success)',
        'stroke-width': 3.5,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round'
      }]);

      // Gradients definition
      svgChildren.push(['svg:defs', {}, [
        ['svg:linearGradient', { id: 'pre-tax-grad', x1: '0%', y1: '0%', x2: '0%', y2: '100%' }, [
          ['svg:stop', { offset: '0%', 'stop-color': 'var(--tc-primary)', 'stop-opacity': 0.6 }],
          ['svg:stop', { offset: '100%', 'stop-color': 'var(--tc-primary)', 'stop-opacity': 0 }]
        ]],
        ['svg:linearGradient', { id: 'post-tax-grad', x1: '0%', y1: '0%', x2: '0%', y2: '100%' }, [
          ['svg:stop', { offset: '0%', 'stop-color': 'var(--tc-success)', 'stop-opacity': 0.6 }],
          ['svg:stop', { offset: '100%', 'stop-color': 'var(--tc-success)', 'stop-opacity': 0 }]
        ]]
      ]]);

      // Hitboxes and visual indicators for each 5% midpoint bracket
      dataPoints.forEach((p, idx) => {
        const cx = mapX(p.percentile);
        const cyPre = mapY(p.income);
        const cyPost = mapY(postTax[idx]);

        const isHovered = (this.hoveredIndex === idx);

        // Render hovered vertical guideline
        if (isHovered) {
          svgChildren.push(['svg:line', {
            x1: cx,
            y1: padding.top,
            x2: cx,
            y2: padding.top + chartH,
            stroke: 'rgba(255, 255, 255, 0.25)',
            'stroke-width': 1.5,
            'stroke-dasharray': '3 3'
          }]);
        }

        // Invisible pointer target over the full vertical column
        svgChildren.push(['svg:rect', {
          x: cx - (chartW / 40),
          y: padding.top,
          width: chartW / 20,
          height: chartH,
          fill: 'transparent',
          style: { cursor: 'pointer' },
          onmouseover: (e) => {
            this.hoveredIndex = idx;
            
            // Calculate hover details
            const bracketPop = totalPop * 0.05;
            const bracketPreVal = p.income * bracketPop;
            const bracketPostVal = postTax[idx] * bracketPop;
            const preShare = preTaxSum > 0 ? (p.income / preTaxSum * 100) : 0;
            const postSum = postTax.reduce((a, b) => a + b, 0);
            const postShare = postSum > 0 ? (postTax[idx] / postSum * 100) : 0;
            const taxPaid = p.income - postTax[idx];
            const taxRate = p.income > 0 ? (taxPaid / p.income * 100) : 0;

            tooltip.style.display = 'block';
            tooltip.innerHTML = '';
            tooltip.appendChild(makeElement('div', { className: 'tc-tooltip-header' }, `Percentile range: ${p.percentile - 2.5}% - ${p.percentile + 2.5}%`));
            
            tooltip.appendChild(makeElement('div', { className: 'tc-tooltip-row' }, [
              makeElement('span', 'Pre-Tax Income:'),
              makeElement('span', { className: 'tc-tooltip-val', style: { color: 'var(--tc-primary)' } }, `${currency}${p.income.toLocaleString()}`)
            ]));
            tooltip.appendChild(makeElement('div', { className: 'tc-tooltip-row' }, [
              makeElement('span', 'Post-Tax Income:'),
              makeElement('span', { className: 'tc-tooltip-val', style: { color: 'var(--tc-success)' } }, `${currency}${Math.round(postTax[idx]).toLocaleString()}`)
            ]));
            tooltip.appendChild(makeElement('div', { className: 'tc-tooltip-row' }, [
              makeElement('span', 'Effective Tax Paid:'),
              makeElement('span', { className: 'tc-tooltip-val', style: { color: taxPaid < 0 ? 'var(--tc-success)' : 'var(--tc-accent)' } }, 
                taxPaid < 0 ? `+${currency}${Math.round(Math.abs(taxPaid)).toLocaleString()} (Net Credit)` : `${currency}${Math.round(taxPaid).toLocaleString()}`
              )
            ]));
            tooltip.appendChild(makeElement('div', { className: 'tc-tooltip-row' }, [
              makeElement('span', 'Effective Rate:'),
              makeElement('span', { className: 'tc-tooltip-val' }, `${taxRate.toFixed(1)}%`)
            ]));
            tooltip.appendChild(makeElement('div', { className: 'tc-tooltip-row' }, [
              makeElement('span', 'Pre vs Post-Tax Share:'),
              makeElement('span', { className: 'tc-tooltip-val' }, `${preShare.toFixed(1)}% ➔ ${postShare.toFixed(1)}%`)
            ]));

            // Position tooltip dynamically beside cursor safely within wrapper limits
            const isRightSide = (cx > width * 0.6);
            const offsetWidth = isRightSide ? -300 : 20;
            tooltip.style.left = `${cx + offsetWidth}px`;
            tooltip.style.top = `${Math.min(cyPre, cyPost) - 30}px`;

            this.renderChartOnly(svgElement, dataPoints, postTax, mapX, mapY, scaleLogY, maxScaledValue, padding, chartW, chartH, width, height, currency);
          },
          onmouseout: () => {
            this.hoveredIndex = null;
            tooltip.style.display = 'none';
            this.renderChartOnly(svgElement, dataPoints, postTax, mapX, mapY, scaleLogY, maxScaledValue, padding, chartW, chartH, width, height, currency);
          }
        }]);

        // Draw node circles
        svgChildren.push(['svg:circle', {
          cx: cx,
          cy: cyPre,
          r: isHovered ? 6 : 4,
          fill: 'var(--tc-primary)',
          stroke: 'var(--tc-bg)',
          'stroke-width': isHovered ? 2 : 1
        }]);

        svgChildren.push(['svg:circle', {
          cx: cx,
          cy: cyPost,
          r: isHovered ? 7 : 4.5,
          fill: 'var(--tc-success)',
          stroke: 'var(--tc-bg)',
          'stroke-width': isHovered ? 2 : 1
        }]);
      });

      // Axis lines
      svgChildren.push(['svg:line', {
        x1: padding.left, y1: padding.top + chartH,
        x2: width - padding.right, y2: padding.top + chartH,
        stroke: 'var(--tc-border)', 'stroke-width': 1.5
      }]);
      svgChildren.push(['svg:line', {
        x1: padding.left, y1: padding.top,
        x2: padding.left, y2: padding.top + chartH,
        stroke: 'var(--tc-border)', 'stroke-width': 1.5
      }]);

      const svgElement = makeElement('svg:svg', {
        viewBox: `0 0 ${width} ${height}`,
        className: 'tc-svg-element'
      }, svgChildren);

      svgContainer.appendChild(svgElement);

      // Render custom Policy Legend below the SVG
      chartPane.appendChild(makeElement('div', { className: 'tc-legend' }, [
        makeElement('div', { className: 'tc-legend-item' }, [
          makeElement('div', { className: 'tc-legend-color', style: { backgroundColor: 'var(--tc-primary)' } }),
          makeElement('span', 'Pre-Tax Income')
        ]),
        makeElement('div', { className: 'tc-legend-item' }, [
          makeElement('div', { className: 'tc-legend-color', style: { backgroundColor: 'var(--tc-success)' } }),
          makeElement('span', 'After-Tax Disposable Income')
        ]),
        makeElement('div', { className: 'tc-legend-item', style: { fontSize: '0.8rem', color: 'var(--tc-muted)' } }, 
          '● Hover over points to review local tax burdens.'
        )
      ]));

      // 2. Control Panel with Interactive Policy Sliders
      const controlPanel = makeElement('div', { className: 'tc-sliders-panel' }, [
        makeElement('h3', { style: { margin: '0 0 10px 0', fontSize: '1.1rem' } }, 'Simulate Policy Models'),
        
        // Slider for revenue target
        makeElement('div', { className: 'tc-slider-group' }, [
          makeElement('div', { className: 'tc-slider-label-row' }, [
            makeElement('span', 'Government Revenue Target'),
            makeElement('span', { style: { color: 'var(--tc-primary)' } }, `${this.taxRevenuePercent}% of GDP`)
          ]),
          makeElement('input', {
            type: 'range',
            className: 'tc-slider',
            min: '0',
            max: '80',
            value: String(this.taxRevenuePercent),
            oninput: (e) => {
              this.taxRevenuePercent = parseInt(e.target.value) || 0;
              this.renderDashboard();
            }
          }),
          makeElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--tc-muted)' } }, [
            makeElement('span', '0% (No State)'),
            makeElement('span', '80% (Extreme Collective)')
          ])
        ]),

        // Slider for progressiveness
        makeElement('div', { className: 'tc-slider-group' }, [
          makeElement('div', { className: 'tc-slider-label-row' }, [
            makeElement('span', 'Tax Progressivity Index'),
            makeElement('span', { style: { color: 'var(--tc-success)' } }, `${this.taxProgressivity.toFixed(2)}`)
          ]),
          makeElement('input', {
            type: 'range',
            className: 'tc-slider',
            min: '0',
            max: '1',
            step: '0.01',
            value: String(this.taxProgressivity),
            oninput: (e) => {
              this.taxProgressivity = parseFloat(e.target.value);
              this.renderDashboard();
            }
          }),
          makeElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--tc-muted)' } }, [
            makeElement('span', '0.0 (Flat Dollar Poll Tax)'),
            makeElement('span', '1.0 (Flat Final Income)')
          ])
        ]),

        // Visual helper explaining state
        makeElement('div', { style: { padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--tc-muted)', lineHeight: '1.4' } }, 
          this.taxProgressivity === 0 ? 'Current Model: Flat dollar poll tax. Every bracket pays an equal absolute portion of the overall public budget.' :
          this.taxProgressivity === 1 ? 'Current Model: Absolute equalization. Post-tax incomes are completely flattened.' :
          'Current Model: Balanced progressive structure. Lower brackets pay smaller shares or receive supportive net tax credits.'
        )
      ]);

      chartPane.appendChild(controlPanel);
      this.dashboardGrid.appendChild(chartPane);

      // 3. Right Sidebar displaying calculated metrics
      const sidebar = makeElement('div', { className: 'tc-stats-sidebar' }, [
        makeElement('div', { className: 'tc-stat-card' }, [
          makeElement('span', { className: 'tc-stat-title' }, 'Gross National Income'),
          makeElement('span', { className: 'tc-stat-value', style: { color: 'var(--tc-primary)' } }, 
            `${currency}${Math.round(nationalAnnualIncome).toLocaleString()}`
          )
        ]),
        makeElement('div', { className: 'tc-stat-card' }, [
          makeElement('span', { className: 'tc-stat-title' }, 'Public Budget Collected'),
          makeElement('span', { className: 'tc-stat-value', style: { color: 'var(--tc-accent)' } }, 
            `${currency}${Math.round(totalTaxesCollected).toLocaleString()}`
          ),
          makeElement('span', { style: { fontSize: '0.75rem', color: 'var(--tc-muted)' } }, `Effective collection rate: ${actualCollectedRatio.toFixed(1)}%`)
        ]),
        makeElement('div', { className: 'tc-stat-card' }, [
          makeElement('span', { className: 'tc-stat-title' }, 'Pre-Tax Inequality (Gini)'),
          makeElement('span', { className: 'tc-stat-value' }, preTaxGini.toFixed(4))
        ]),
        makeElement('div', { className: 'tc-stat-card' }, [
          makeElement('span', { className: 'tc-stat-title' }, 'Post-Tax Inequality (Gini)'),
          makeElement('span', { className: 'tc-stat-value', style: { color: 'var(--tc-success)' } }, postTaxGini.toFixed(4)),
          makeElement('span', { style: { fontSize: '0.75rem', color: 'var(--tc-muted)' } }, 
            preTaxGini > 0 ? `Gini reduced by ${((preTaxGini - postTaxGini) / preTaxGini * 100).toFixed(1)}%` : ''
          )
        ])
      ]);

      this.dashboardGrid.appendChild(sidebar);

      // Render simplified tables within the collapsible footer without automatic jumps
      this.renderCollapsibleTableOnly(dataPoints, postTax, taxes, currency, totalPop);
    }

  renderChartOnly(svgElement, dataPoints, postTax, mapX, mapY, scaleLogY, maxScaledValue, padding, chartW, chartH, width, height, currency) {
      // Small fast inline repaint of points when mouse moves without doing full heavy layout reconstruction
      const circles = svgElement.querySelectorAll('circle');
      
      dataPoints.forEach((p, idx) => {
        const isHovered = (this.hoveredIndex === idx);
        
        // Find respective pre & post visual circles and update radiuses
        const preCircle = circles[idx * 2];
        const postCircle = circles[idx * 2 + 1];

        if (preCircle) {
          preCircle.setAttribute('r', isHovered ? '8' : '4');
          preCircle.setAttribute('stroke-width', isHovered ? '2.5' : '1');
        }
        if (postCircle) {
          postCircle.setAttribute('r', isHovered ? '9' : '4.5');
          postCircle.setAttribute('stroke-width', isHovered ? '2.5' : '1');
        }
      });
    }

  renderCollapsibleTableOnly() {
      const trigger = this.collapsibleContainer.querySelector('.tc-collapsible-content');
      if (!trigger) return;

      let tableWrap = trigger.querySelector('.tc-table-wrapper');
      if (!tableWrap) {
        tableWrap = makeElement('div', { className: 'tc-table-wrapper', style: { marginTop: '16px', overflowX: 'auto' } });
        trigger.appendChild(tableWrap);
      } else {
        tableWrap.innerHTML = '';
      }

      const dataPoints = this.currentData.data;
      const currency = this.currentData.currency || '$';
      const { taxes, postTax } = this.calculateTaxes(dataPoints, this.taxRevenuePercent, this.taxProgressivity);

      const table = makeElement('table', { className: 'tc-table' }, [
        makeElement('thead', {}, [
          makeElement('tr', {}, [
            makeElement('th', 'Percentile'),
            makeElement('th', 'Pre-Tax Income'),
            makeElement('th', 'Post-Tax Income'),
            makeElement('th', 'Estimated Tax / Credit'),
            makeElement('th', 'Effective Rate')
          ])
        ])
      ]);

      const tbody = makeElement('tbody');
      dataPoints.forEach((p, idx) => {
        const pre = p.income;
        const post = postTax[idx];
        const taxVal = pre - post;
        const rate = pre > 0 ? (taxVal / pre * 100) : 0;

        tbody.appendChild(makeElement('tr', {}, [
          makeElement('td', { style: { fontWeight: 'bold' } }, `${p.percentile}%`),
          makeElement('td', `${currency}${pre.toLocaleString()}`),
          makeElement('td', `${currency}${Math.round(post).toLocaleString()}`),
          makeElement('td', { style: { color: taxVal < 0 ? 'var(--tc-success)' : 'var(--tc-text)' } }, 
            taxVal < 0 ? `+ ${currency}${Math.round(Math.abs(taxVal)).toLocaleString()}` : `${currency}${Math.round(taxVal).toLocaleString()}`
          ),
          makeElement('td', `${pre > 0 ? rate.toFixed(1) + '%' : 'N/A'}`)
        ]));
      });

      table.appendChild(tbody);
      tableWrap.appendChild(table);
    }

  renderDashboardOnce() {
      this.dashboardGrid.innerHTML = '';

      if (!this.currentData || !this.currentData.data) return;

      // 1. Chart Pane shell
      const chartPane = makeElement('div', { className: 'tc-chart-pane' });
      const svgContainer = makeElement('div', { className: 'tc-svg-container' });
      chartPane.appendChild(svgContainer);

      // Tooltip inside same container
      this.tooltipEl = makeElement('div', { className: 'tc-tooltip' });
      svgContainer.appendChild(this.tooltipEl);

      // Create static responsive SVG shell
      const width = 1000;
      const height = 440;
      this.svgElement = makeElement('svg:svg', {
        viewBox: `0 0 ${width} ${height}`,
        className: 'tc-svg-element'
      });
      svgContainer.appendChild(this.svgElement);

      // Legend panel
      chartPane.appendChild(makeElement('div', { className: 'tc-legend' }, [
        makeElement('div', { className: 'tc-legend-item' }, [
          makeElement('div', { className: 'tc-legend-color', style: { backgroundColor: 'var(--tc-primary)' } }),
          makeElement('span', 'Pre-Tax Income')
        ]),
        makeElement('div', { className: 'tc-legend-item' }, [
          makeElement('div', { className: 'tc-legend-color', style: { backgroundColor: 'var(--tc-success)' } }),
          makeElement('span', 'After-Tax Disposable Income')
        ]),
        makeElement('div', { className: 'tc-legend-item', style: { fontSize: '0.8rem', color: 'var(--tc-muted)' } }, 
          '● Hover nodes to review outcomes.'
        )
      ]));

      // 2. Control Panel holding Side-by-Side Policy Sliders
      const slidersRow = makeElement('div', { className: 'tc-sliders-row' }, [
        
        // COLUMN 1: Revenue Target / Public Budget Size
        makeElement('div', { className: 'tc-policy-card' }, [
          makeElement('div', { className: 'tc-slider-group' }, [
            makeElement('div', { className: 'tc-slider-label-row' }, [
              makeElement('span', { style: { color: 'var(--tc-primary)', fontSize: '1rem', fontWeight: '800' } }, 'Government Revenue Target'),
              this.revenueDisplayLabel = makeElement('span', { style: { color: 'var(--tc-primary)', fontWeight: 'bold', fontSize: '1rem' } }, '30%')
            ]),
            this.revenueSliderInput = makeElement('input', {
              type: 'range',
              className: 'tc-slider',
              min: '0',
              max: '80',
              value: String(this.taxRevenuePercent),
              oninput: (e) => {
                this.taxRevenuePercent = parseInt(e.target.value) || 0;
                this.updateInteractiveElements();
              }
            }),
            makeElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--tc-muted)' } }, [
              makeElement('span', '0% (Anarchy)'),
              makeElement('span', '80% (Extreme State)')
            ])
          ]),
          this.revenueExplanationText = makeElement('p', { 
            style: { fontSize: '0.825rem', color: 'var(--tc-muted)', margin: '4px 0 0 0', lineHeight: '1.4' } 
          }, 'Configures what percent of all generated GNI is captured to fund the public budget.')
        ]),

        // COLUMN 2: Tax Code Design / Progressivity
        makeElement('div', { className: 'tc-policy-card' }, [
          makeElement('div', { className: 'tc-slider-group' }, [
            makeElement('div', { className: 'tc-slider-label-row' }, [
              makeElement('span', { style: { color: 'var(--tc-success)', fontSize: '1rem', fontWeight: '800' } }, 'Tax Progressivity'),
              this.progressivityDisplayLabel = makeElement('span', { style: { color: 'var(--tc-success)', fontWeight: 'bold', fontSize: '1rem' } }, '50%')
            ]),
            this.progressivitySliderInput = makeElement('input', {
              type: 'range',
              className: 'tc-slider',
              min: '0',
              max: '100',
              value: String(this.taxProgressivity),
              oninput: (e) => {
                this.taxProgressivity = parseFloat(e.target.value);
                this.updateInteractiveElements();
              }
            }),
            makeElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--tc-muted)' } }, [
              makeElement('span', '0% (Flat Poll Fee)'),
              makeElement('span', '50% (Flat Rate)'),
              makeElement('span', '100% (UBI Equalizer)')
            ])
          ]),
          this.progressivityExplanationText = makeElement('p', { 
            style: { fontSize: '0.825rem', color: 'var(--tc-muted)', margin: '4px 0 0 0', lineHeight: '1.4' } 
          }, 'Determines the distribution design. Above 50%, negative taxes act as basic dividend payouts.')
        ])
      ]);

      chartPane.appendChild(slidersRow);
      this.dashboardGrid.appendChild(chartPane);

      // 3. Right Sidebar holding static metric outputs
      this.sidebarPanel = makeElement('div', { className: 'tc-stats-sidebar' }, [
        makeElement('div', { className: 'tc-stat-card' }, [
          makeElement('span', { className: 'tc-stat-title' }, 'Gross National Income'),
          this.sidebarGniText = makeElement('span', { className: 'tc-stat-value', style: { color: 'var(--tc-primary)' } }, '$0')
        ]),
        makeElement('div', { className: 'tc-stat-card' }, [
          makeElement('span', { className: 'tc-stat-title' }, 'Public Budget Collected'),
          this.sidebarBudgetCollectedText = makeElement('span', { className: 'tc-stat-value', style: { color: 'var(--tc-accent)' } }, '$0'),
          this.sidebarCollectedRatioText = makeElement('span', { style: { fontSize: '0.75rem', color: 'var(--tc-muted)' } }, '0%')
        ]),
        makeElement('div', { className: 'tc-stat-card' }, [
          makeElement('span', { className: 'tc-stat-title' }, 'Pre-Tax Gini Index'),
          this.sidebarPreGiniText = makeElement('span', { className: 'tc-stat-value' }, '0.0000')
        ]),
        makeElement('div', { className: 'tc-stat-card' }, [
          makeElement('span', { className: 'tc-stat-title' }, 'Post-Tax Gini Index'),
          this.sidebarPostGiniText = makeElement('span', { className: 'tc-stat-value', style: { color: 'var(--tc-success)' } }, '0.0000'),
          this.sidebarReductionText = makeElement('span', { style: { fontSize: '0.75rem', color: 'var(--tc-muted)' } }, '0% reduction')
        ])
      ]);

      this.dashboardGrid.appendChild(this.sidebarPanel);
    }

  updateInteractiveElements() {
      if (!this.currentData || !this.currentData.data) return;

      const dataPoints = this.currentData.data;
      const totalPop = this.currentData.totalEntities;
      const currency = this.currentData.currency || '$';

      // 1. Label updates
      this.revenueDisplayLabel.textContent = `${this.taxRevenuePercent}%`;
      this.progressivityDisplayLabel.textContent = `${this.taxProgressivity}%`;

      // Column 1 Description update
      if (this.taxRevenuePercent === 0) {
        this.revenueExplanationText.textContent = `Zero Taxes: No public budget. Essential services, AI security, and infrastructure receive zero state funding. Gini is unaffected.`;
      } else if (this.taxRevenuePercent < 25) {
        this.revenueExplanationText.textContent = `Small Government size: Under ${this.taxRevenuePercent}%, the public budget provides basic functions but lacks capacity for extensive social security nets or transfers.`;
      } else if (this.taxRevenuePercent < 50) {
        this.revenueExplanationText.textContent = `Balanced Governance: A standard fiscal budget collects ${this.taxRevenuePercent}% GNI, allowing robust public programs, infrastructure, and moderate transfers.`;
      } else {
        this.revenueExplanationText.textContent = `Large Social Welfare State: Capturing ${this.taxRevenuePercent}% of national income provides massive resources to finance a solid universal dividend floor or public goods.`;
      }

      // Column 2 Description update
      if (this.taxProgressivity === 0) {
        this.progressivityExplanationText.textContent = `Regressive Poll Tax: Every single bracket pays the exact same absolute dollar fee. Visually flattens lower-income segments to $0.`;
      } else if (this.taxProgressivity < 50) {
        this.progressivityExplanationText.textContent = `Partially Proportional: Mix of equal dollar burdens and income percentages. Moderate Gini reduction for lower classes.`;
      } else if (this.taxProgressivity === 50) {
        this.progressivityExplanationText.textContent = `Flat Percentage Tax: Everyone contributes exactly ${this.taxRevenuePercent}% of their pre-tax income. Gini metrics remain identical pre-tax vs post-tax.`;
      } else if (this.taxProgressivity < 100) {
        this.progressivityExplanationText.textContent = `Progressive / Negative Tax Credits: Wealthier percentiles fund the state, while lower/jobless tiers receive positive net cash dividends (Universal Basic Income).`;
      } else {
        this.progressivityExplanationText.textContent = `Complete Equalization: Post-tax incomes are absolutely equalized. Everyone ends up with the exact same disposable income.`;
      }

      // 2. Perform math equations
      const preTaxIncomes = dataPoints.map(p => p.income);
      const preTaxGini = this.calculateGini(preTaxIncomes);
      const preTaxSum = preTaxIncomes.reduce((a, b) => a + b, 0);
      const nationalAnnualIncome = preTaxSum * (totalPop * 0.05);

      const { taxes, postTax } = this.calculateTaxes(dataPoints, this.taxRevenuePercent, this.taxProgressivity);
      const postTaxGini = this.calculateGini(postTax);

      const totalTaxesCollected = taxes.reduce((a, b) => a + b, 0) * (totalPop * 0.05);
      const actualCollectedRatio = nationalAnnualIncome > 0 ? (totalTaxesCollected / nationalAnnualIncome * 100) : 0;

      // 3. Update Sidebar stat cards directly
      this.sidebarGniText.textContent = `${currency}${Math.round(nationalAnnualIncome).toLocaleString()}`;
      this.sidebarBudgetCollectedText.textContent = `${currency}${Math.round(totalTaxesCollected).toLocaleString()}`;
      this.sidebarCollectedRatioText.textContent = `Target: ${this.taxRevenuePercent}% | Mapped Collection: ${actualCollectedRatio.toFixed(1)}%`;
      this.sidebarPreGiniText.textContent = preTaxGini.toFixed(4);
      this.sidebarPostGiniText.textContent = postTaxGini.toFixed(4);

      if (preTaxGini > 0) {
        const reduction = ((preTaxGini - postTaxGini) / preTaxGini * 100);
        this.sidebarReductionText.textContent = `Inequality reduced by ${reduction.toFixed(1)}%`;
      } else {
        this.sidebarReductionText.textContent = '0% reduction';
      }

      // 4. Update SVG elements directly
      const width = 1000;
      const height = 440;
      const padding = { top: 30, right: 40, bottom: 50, left: 80 };
      const chartW = width - padding.left - padding.right;
      const chartH = height - padding.top - padding.bottom;

      const maxPreTaxVal = Math.max(...preTaxIncomes, 1);
      const maxPostTaxVal = Math.max(...postTax, 1);
      const maxOverallValue = Math.max(maxPreTaxVal, maxPostTaxVal);

      const scaleLogY = (val) => {
        if (val <= 0) return 0;
        return Math.log10(val + this.logOffset) - Math.log10(this.logOffset);
      };

      const maxScaledValue = scaleLogY(maxOverallValue);

      const mapX = (percentile) => padding.left + (percentile / 100) * chartW;
      const mapY = (val) => {
        if (val <= 0) return padding.top + chartH;
        if (this.isLogarithmic) {
          const scaled = scaleLogY(val);
          const fraction = scaled / maxScaledValue;
          return padding.top + chartH - (fraction * chartH);
        } else {
          // Linear mapping
          const fraction = val / maxOverallValue;
          return padding.top + chartH - (fraction * chartH);
        }
      };

      this.svgElement.innerHTML = '';
      const svgChildren = [];

      // Grid lines: Generate rounded clean ticks at precise spots
      const tickValues = this.getTicksForDataset(maxOverallValue, this.isLogarithmic);
      
      tickValues.forEach(tickVal => {
        const yCoord = mapY(tickVal);

        svgChildren.push(['svg:line', {
          x1: padding.left, y1: yCoord,
          x2: width - padding.right, y2: yCoord,
          stroke: 'var(--tc-border)', 'stroke-width': 1, 'stroke-dasharray': '3 3'
        }]);

        svgChildren.push(['svg:text', {
          x: padding.left - 12, y: yCoord + 4,
          'text-anchor': 'end', fill: 'var(--tc-muted)',
          'font-size': '11px', 'font-family': 'monospace'
        }, `${currency}${tickVal.toLocaleString()}`]);
      });

      // X Tickmarks
      for (let p = 0; p <= 100; p += 10) {
        const xCoord = mapX(p);
        svgChildren.push(['svg:line', {
          x1: xCoord, y1: padding.top,
          x2: xCoord, y2: padding.top + chartH,
          stroke: 'rgba(51, 65, 85, 0.4)', 'stroke-width': 1
        }]);

        svgChildren.push(['svg:text', {
          x: xCoord, y: padding.top + chartH + 20,
          'text-anchor': 'middle', fill: 'var(--tc-muted)', 'font-size': '11px'
        }, `${p}%`]);
      }

      // Pre-tax Area Under Curve
      let preTaxArea = `M ${mapX(0)} ${padding.top + chartH}`;
      dataPoints.forEach(p => { preTaxArea += ` L ${mapX(p.percentile)} ${mapY(p.income)}`; });
      preTaxArea += ` L ${mapX(100)} ${padding.top + chartH} Z`;
      svgChildren.push(['svg:path', { d: preTaxArea, fill: 'url(#pre-tax-grad)', opacity: 0.15 }]);

      // Post-tax Area Under Curve
      let postTaxArea = `M ${mapX(0)} ${padding.top + chartH}`;
      dataPoints.forEach((p, idx) => { postTaxArea += ` L ${mapX(p.percentile)} ${mapY(postTax[idx])}`; });
      postTaxArea += ` L ${mapX(100)} ${padding.top + chartH} Z`;
      svgChildren.push(['svg:path', { d: postTaxArea, fill: 'url(#post-tax-grad)', opacity: 0.15 }]);

      // Pre-tax line path
      let preLine = `M ${mapX(dataPoints[0].percentile)} ${mapY(dataPoints[0].income)}`;
      for (let i = 1; i < dataPoints.length; i++) {
        preLine += ` L ${mapX(dataPoints[i].percentile)} ${mapY(dataPoints[i].income)}`;
      }
      svgChildren.push(['svg:path', { d: preLine, fill: 'none', stroke: 'var(--tc-primary)', 'stroke-width': 3 }]);

      // Post-tax line path
      let postLine = `M ${mapX(dataPoints[0].percentile)} ${mapY(postTax[0])}`;
      for (let i = 1; i < dataPoints.length; i++) {
        postLine += ` L ${mapX(dataPoints[i].percentile)} ${mapY(postTax[i])}`;
      }
      svgChildren.push(['svg:path', { d: postLine, fill: 'none', stroke: 'var(--tc-success)', 'stroke-width': 3.5 }]);

      // Defs
      svgChildren.push(['svg:defs', {}, [
        ['svg:linearGradient', { id: 'pre-tax-grad', x1: '0%', y1: '0%', x2: '0%', y2: '100%' }, [
          ['svg:stop', { offset: '0%', 'stop-color': 'var(--tc-primary)', 'stop-opacity': 0.6 }],
          ['svg:stop', { offset: '100%', 'stop-color': 'var(--tc-primary)', 'stop-opacity': 0 }]
        ]],
        ['svg:linearGradient', { id: 'post-tax-grad', x1: '0%', y1: '0%', x2: '0%', y2: '100%' }, [
          ['svg:stop', { offset: '0%', 'stop-color': 'var(--tc-success)', 'stop-opacity': 0.6 }],
          ['svg:stop', { offset: '100%', 'stop-color': 'var(--tc-success)', 'stop-opacity': 0 }]
        ]]
      ]]);

      // Draw responsive nodes and hover coordinates
      dataPoints.forEach((p, idx) => {
        const cx = mapX(p.percentile);
        const cyPre = mapY(p.income);
        const cyPost = mapY(postTax[idx]);

        const isHovered = (this.hoveredIndex === idx);

        if (isHovered) {
          svgChildren.push(['svg:line', {
            x1: cx, y1: padding.top,
            x2: cx, y2: padding.top + chartH,
            stroke: 'rgba(255, 255, 255, 0.25)', 'stroke-width': 1.5, 'stroke-dasharray': '3 3'
          }]);
        }

        // Hitbox rect
        svgChildren.push(['svg:rect', {
          x: cx - (chartW / 40),
          y: padding.top,
          width: chartW / 20,
          height: chartH,
          fill: 'transparent',
          style: { cursor: 'pointer' },
          onmouseover: (e) => {
            this.hoveredIndex = idx;
            
            // Render active tooltip content immediately
            this.updateTooltip(idx);
            this.tooltipEl.style.display = 'block';

            const isRightSide = (cx > width * 0.6);
            const offsetWidth = isRightSide ? -300 : 20;
            this.tooltipEl.style.left = `${cx + offsetWidth}px`;
            this.tooltipEl.style.top = `${Math.min(cyPre, cyPost) - 30}px`;

            this.updateInteractiveElements();
          },
          onmouseout: () => {
            this.hoveredIndex = null;
            this.tooltipEl.style.display = 'none';
            this.updateInteractiveElements();
          }
        }]);

        // Pre circles
        svgChildren.push(['svg:circle', {
          cx: cx, cy: cyPre,
          r: isHovered ? 7 : 4,
          fill: 'var(--tc-primary)', stroke: 'var(--tc-bg)', 'stroke-width': isHovered ? 2 : 1
        }]);

        // Post circles
        svgChildren.push(['svg:circle', {
          cx: cx, cy: cyPost,
          r: isHovered ? 8 : 4.5,
          fill: 'var(--tc-success)', stroke: 'var(--tc-bg)', 'stroke-width': isHovered ? 2 : 1
        }]);
      });

      // Axis borders
      svgChildren.push(['svg:line', {
        x1: padding.left, y1: padding.top + chartH,
        x2: width - padding.right, y2: padding.top + chartH,
        stroke: 'var(--tc-border)', 'stroke-width': 1.5
      }]);
      svgChildren.push(['svg:line', {
        x1: padding.left, y1: padding.top,
        x2: padding.left, y2: padding.top + chartH,
        stroke: 'var(--tc-border)', 'stroke-width': 1.5
      }]);

      // Direct injection
      svgChildren.forEach(child => {
        const tag = child[0];
        const props = child[1];
        const textContent = child[2];
        const nested = child[2];

        const el = document.createElementNS("http://www.w3.org/2000/svg", tag.replace('svg:', ''));
        Object.entries(props).forEach(([k, v]) => {
          if (k.startsWith('on')) {
            el[k] = v;
          } else {
            el.setAttribute(k, v);
          }
        });

        if (tag === 'svg:defs' && Array.isArray(nested)) {
          nested.forEach(nestedGrad => {
            const gradEl = document.createElementNS("http://www.w3.org/2000/svg", nestedGrad[0].replace('svg:', ''));
            Object.entries(nestedGrad[1]).forEach(([gk, gv]) => gradEl.setAttribute(gk, gv));
            if (Array.isArray(nestedGrad[2])) {
              nestedGrad[2].forEach(stop => {
                const stopEl = document.createElementNS("http://www.w3.org/2000/svg", stop[0].replace('svg:', ''));
                Object.entries(stop[1]).forEach(([sk, sv]) => stopEl.setAttribute(sk, sv));
                gradEl.appendChild(stopEl);
              });
            }
            el.appendChild(gradEl);
          });
        } else if (typeof textContent === 'string') {
          el.textContent = textContent;
        }

        this.svgElement.appendChild(el);
      });

      // If a node is active while sliding, keep its tooltip values synchronized in real-time
      if (this.hoveredIndex !== null) {
        this.updateTooltip(this.hoveredIndex);
      }
    }

  getTicksForDataset(maxVal, isLogarithmic) {
      if (!isLogarithmic) {
        // Return 6 evenly spaced round linear ticks
        const ticks = [];
        for (let i = 0; i <= 5; i++) {
          ticks.push(Math.round((i / 5) * maxVal));
        }
        return ticks;
      } else {
        // Logarithmic mode round numbers
        const roundCandidates = [
          0, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 
          500000, 1000000, 2500000, 5000000, 10000000, 25000000, 50000000
        ];
        
        const filtered = roundCandidates.filter(v => v <= maxVal);
        const nextAbove = roundCandidates.find(v => v > maxVal);
        if (nextAbove) {
          filtered.push(nextAbove);
        }
        
        if (filtered.length <= 6) return filtered;
        
        const result = [0];
        const step = (filtered.length - 2) / 4;
        for (let i = 1; i <= 4; i++) {
          const index = Math.round(i * step);
          if (!result.includes(filtered[index])) {
            result.push(filtered[index]);
          }
        }
        if (!result.includes(filtered[filtered.length - 1])) {
          result.push(filtered[filtered.length - 1]);
        }
        return result.sort((a,b) => a-b);
      }
    }

  updateTooltip(idx) {
      if (idx === null || !this.tooltipEl || !this.currentData) return;

      const dataPoints = this.currentData.data;
      const totalPop = this.currentData.totalEntities;
      const currency = this.currentData.currency || '$';
      const p = dataPoints[idx];

      const preTaxIncomes = dataPoints.map(item => item.income);
      const preTaxSum = preTaxIncomes.reduce((a, b) => a + b, 0);

      const { taxes, postTax } = this.calculateTaxes(dataPoints, this.taxRevenuePercent, this.taxProgressivity);
      const postSum = postTax.reduce((a, b) => a + b, 0);

      const bracketPop = totalPop * 0.05;
      const bracketPreVal = p.income * bracketPop;
      const bracketPostVal = postTax[idx] * bracketPop;
      const preShare = preTaxSum > 0 ? (p.income / preTaxSum * 100) : 0;
      const postShare = postSum > 0 ? (postTax[idx] / postSum * 100) : 0;
      const taxPaid = p.income - postTax[idx];
      const taxRate = p.income > 0 ? (taxPaid / p.income * 100) : 0;

      this.tooltipEl.innerHTML = '';
      this.tooltipEl.appendChild(makeElement('div', { className: 'tc-tooltip-header' }, `Percentile: ${p.percentile - 2.5}% - ${p.percentile + 2.5}%`));
      
      this.tooltipEl.appendChild(makeElement('div', { className: 'tc-tooltip-row' }, [
        makeElement('span', 'Pre-Tax Income:'),
        makeElement('span', { className: 'tc-tooltip-val', style: { color: 'var(--tc-primary)' } }, `${currency}${p.income.toLocaleString()}`)
      ]));
      this.tooltipEl.appendChild(makeElement('div', { className: 'tc-tooltip-row' }, [
        makeElement('span', 'Post-Tax Income:'),
        makeElement('span', { className: 'tc-tooltip-val', style: { color: 'var(--tc-success)' } }, `${currency}${Math.round(postTax[idx]).toLocaleString()}`)
      ]));
      this.tooltipEl.appendChild(makeElement('div', { className: 'tc-tooltip-row' }, [
        makeElement('span', 'Effective Tax Paid:'),
        makeElement('span', { className: 'tc-tooltip-val', style: { color: taxPaid < 0 ? 'var(--tc-success)' : 'var(--tc-accent)' } }, 
          taxPaid < 0 ? `+${currency}${Math.round(Math.abs(taxPaid)).toLocaleString()} (Net Credit)` : `${currency}${Math.round(taxPaid).toLocaleString()}`
        )
      ]));
      this.tooltipEl.appendChild(makeElement('div', { className: 'tc-tooltip-row' }, [
        makeElement('span', 'Effective Rate:'),
        makeElement('span', { className: 'tc-tooltip-val' }, `${p.income > 0 ? taxRate.toFixed(1) + '%' : 'N/A'}`)
      ]));
      this.tooltipEl.appendChild(makeElement('div', { className: 'tc-tooltip-row' }, [
        makeElement('span', 'Pre vs Post-Tax Share:'),
        makeElement('span', { className: 'tc-tooltip-val' }, `${preShare.toFixed(1)}% ➔ ${postShare.toFixed(1)}%`)
      ]));
    }
}