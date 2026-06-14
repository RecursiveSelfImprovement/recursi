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
        { path: '/TaxChart/data/social_democratic.json', label: 'High Unemployment Shock Model (30%)' },
        { path: '/TaxChart/data/concentrated_wealth.json', label: 'AI Automated Post-Job Economy' }
      ];

      this.currentDatasetPath = this.datasets[0].path;
      this.currentData = null;
      
      // Control state
      this.logOffset = 15000; 
      this.isLogarithmic = true; // toggle between log and linear scales
      this.taxRevenuePercent = 30; // 30% of national income
      this.taxProgressivity = 50; // slider range 0 to 100
      this.showAfterTax = false; // default is unchecked
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

        .tc-description {
          font-size: 0.95rem;
          color: var(--tc-muted);
          margin: 0;
          line-height: 1.4;
        }

        .tc-dashboard-grid {
          display: flex;
          flex-direction: column;
          gap: 20px;
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
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
          top: 16px;
          left: 16px;
          background: rgba(15, 23, 42, 0.95);
          border: 1.5px solid var(--tc-border);
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 0.825rem;
          pointer-events: auto !important; /* Ensure clicking and dragging work perfectly */
          z-index: 100;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
          width: 290px;
          box-sizing: border-box;
          transition: border-color 0.15s ease, opacity 0.15s ease;
          display: flex;
          flex-direction: column;
          gap: 6px;
          user-select: none; /* Prevent text highlight while dragging */
        }

        .tc-tooltip-header {
          font-weight: bold;
          color: var(--tc-primary);
          margin-bottom: 4px;
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

        .tc-legend {
          display: flex;
          gap: 20px;
          font-size: 0.85rem;
          margin-top: 8px;
          justify-content: center;
          flex-wrap: wrap;
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

        /* Top Centered Giant Indicators */
        .tc-indicator-header {
          display: flex;
          justify-content: center;
          gap: 24px;
          width: 100%;
          margin: 0 auto 12px auto;
          max-width: 900px;
          flex-wrap: wrap;
        }

        .tc-indicator-card {
          flex: 1;
          min-width: 280px;
          background-color: var(--tc-card);
          border: 1px solid var(--tc-border);
          border-radius: 14px;
          padding: 16px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          position: relative;
          overflow: hidden;
        }

        .tc-indicator-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 3px;
        }

        .tc-indicator-card.gni::before {
          background: linear-gradient(90deg, var(--tc-primary), #0284c7);
        }

        .tc-indicator-card.budget::before {
          background: linear-gradient(90deg, var(--tc-accent), var(--tc-success));
        }

        .tc-indicator-label {
          font-size: 0.825rem;
          font-weight: 700;
          color: var(--tc-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 6px;
        }

        .tc-indicator-value {
          font-size: 2.1rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1.1;
        }

        .tc-indicator-sub {
          font-size: 0.825rem;
          color: var(--tc-muted);
          margin-top: 6px;
          font-weight: 500;
        }

        /* Beautiful Segmented Selection Bar */
        .tc-segmented-picker {
          display: flex;
          background-color: var(--tc-card);
          border: 1px solid var(--tc-border);
          border-radius: 12px;
          padding: 6px;
          gap: 6px;
          margin: 0 auto;
          width: 100%;
          max-width: 900px;
          box-sizing: border-box;
        }

        .tc-segment-btn {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--tc-muted);
          padding: 12px 16px;
          font-size: 0.9rem;
          font-weight: 700;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tc-segment-btn:hover {
          color: var(--tc-text);
          background-color: rgba(255, 255, 255, 0.04);
        }

        .tc-segment-btn.active {
          color: #ffffff;
          background: linear-gradient(135deg, #0284c7, #059669);
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
        }

        /* Central Gini Badge */
        .tc-gini-badge-container {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid var(--tc-border);
          border-radius: 20px;
          padding: 6px 16px;
          margin: 8px auto 0 auto;
          width: max-content;
          font-size: 0.85rem;
          font-weight: 600;
        }
      `, 'taxchart-theme-styles');
    }

  renderLayout(parent) {
      this.appContainer = makeElement('div', { className: 'tc-container' });

      // Row 1: Massive beautiful indicator cards (Gross National Income & Public Budget Collected)
      this.indicatorHeader = makeElement('div', { className: 'tc-indicator-header' }, [
        this.gniCard = makeElement('div', { className: 'tc-indicator-card gni' }, [
          makeElement('span', { className: 'tc-indicator-label' }, 'Gross National Income'),
          this.topGniValue = makeElement('span', { className: 'tc-indicator-value', style: { color: 'var(--tc-primary)' } }, '$0'),
          this.topGniSub = makeElement('span', { className: 'tc-indicator-sub' }, 'Annual aggregate GNI')
        ]),
        this.budgetCard = makeElement('div', { className: 'tc-indicator-card budget' }, [
          makeElement('span', { className: 'tc-indicator-label' }, 'Public Budget Collected'),
          this.topBudgetValue = makeElement('span', { className: 'tc-indicator-value', style: { color: 'var(--tc-accent)' } }, '$0'),
          this.topBudgetSub = makeElement('span', { className: 'tc-indicator-sub' }, 'Target: 30% | Effective: 30%')
        ])
      ]);
      this.appContainer.appendChild(this.indicatorHeader);

      // Row 2: Beautiful Segmented Control Picker
      this.pickerContainer = makeElement('div', { className: 'tc-segmented-picker' }, 
        this.datasets.map((d) => {
          return makeElement('button', {
            className: `tc-segment-btn ${d.path === this.currentDatasetPath ? 'active' : ''}`,
            onclick: (e) => {
              // Deactivate others
              const buttons = this.pickerContainer.querySelectorAll('.tc-segment-btn');
              buttons.forEach(btn => btn.classList.remove('active'));
              // Activate this
              e.currentTarget.classList.add('active');

              this.currentDatasetPath = d.path;
              this.loadSelectedDataset();
            }
          }, d.label);
        })
      );
      this.appContainer.appendChild(this.pickerContainer);

      // Row 3: Description paragraph
      this.descriptionLabel = makeElement('p', { 
        className: 'tc-description',
        style: { textAlign: 'center', margin: '0 auto 12px auto', maxWidth: '800px', fontSize: '0.9rem', color: 'var(--tc-muted)' }
      }, 'Loading income distribution models...');
      this.appContainer.appendChild(this.descriptionLabel);

      // Create Grid Area (single-column)
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
          "name": "High Unemployment Shock Model (30% Unemployed)",
          "type": "households",
          "totalEntities": 131400000,
          "currency": "$",
          "description": "Severe economic downturn simulation: 30% of households are fully unemployed with zero wage income, while the upper-middle class and wealthy brackets retain significant earnings.",
          "data": [
            { "percentile": 2.5, "income": 0 },
            { "percentile": 7.5, "income": 0 },
            { "percentile": 12.5, "income": 0 },
            { "percentile": 17.5, "income": 0 },
            { "percentile": 22.5, "income": 0 },
            { "percentile": 27.5, "income": 0 },
            { "percentile": 32.5, "income": 25000 },
            { "percentile": 37.5, "income": 38000 },
            { "percentile": 42.5, "income": 50000 },
            { "percentile": 47.5, "income": 65000 },
            { "percentile": 52.5, "income": 80000 },
            { "percentile": 57.5, "income": 100000 },
            { "percentile": 62.5, "income": 125000 },
            { "percentile": 67.5, "income": 155000 },
            { "percentile": 72.5, "income": 200000 },
            { "percentile": 77.5, "income": 280000 },
            { "percentile": 82.5, "income": 380000 },
            { "percentile": 87.5, "income": 550000 },
            { "percentile": 92.5, "income": 950000 },
            { "percentile": 97.5, "income": 2500000 }
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
            { "percentile": 2.5, "income": 0 },
            { "percentile": 7.5, "income": 0 },
            { "percentile": 12.5, "income": 0 },
            { "percentile": 17.5, "income": 0 },
            { "percentile": 22.5, "income": 0 },
            { "percentile": 27.5, "income": 0 },
            { "percentile": 32.5, "income": 0 },
            { "percentile": 37.5, "income": 0 },
            { "percentile": 42.5, "income": 0 },
            { "percentile": 47.5, "income": 0 },
            { "percentile": 52.5, "income": 0 },
            { "percentile": 57.5, "income": 0 },
            { "percentile": 62.5, "income": 0 },
            { "percentile": 67.5, "income": 0 },
            { "percentile": 72.5, "income": 0 },
            { "percentile": 77.5, "income": 12000 },
            { "percentile": 82.5, "income": 95000 },
            { "percentile": 87.5, "income": 350000 },
            { "percentile": 92.5, "income": 1200000 },
            { "percentile": 97.5, "income": 2200000 }
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
            { "percentile": 2.5, "income": 7200 },
            { "percentile": 7.5, "income": 15000 },
            { "percentile": 12.5, "income": 23000 },
            { "percentile": 17.5, "income": 32000 },
            { "percentile": 22.5, "income": 41000 },
            { "percentile": 27.5, "income": 50000 },
            { "percentile": 32.5, "income": 60000 },
            { "percentile": 37.5, "income": 71000 },
            { "percentile": 42.5, "income": 83000 },
            { "percentile": 47.5, "income": 96000 },
            { "percentile": 52.5, "income": 110000 },
            { "percentile": 57.5, "income": 126000 },
            { "percentile": 62.5, "income": 145000 },
            { "percentile": 67.5, "income": 170000 },
            { "percentile": 72.5, "income": 210000 },
            { "percentile": 77.5, "income": 260000 },
            { "percentile": 82.5, "income": 330000 },
            { "percentile": 87.5, "income": 450000 },
            { "percentile": 92.5, "income": 700000 },
            { "percentile": 97.5, "income": 2200000 }
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

      // Map progressivity slider S (0 to 100) to internal parameter p (0 to 1)
      // S = 0 -> p = 0 (Poll tax)
      // S = 30 -> p = 0.5 (Flat tax)
      // S = 50 -> p = 0.7 (Reasonable progressive tax)
      // S = 100 -> p = 1.0 (UBI Equalizer)
      const S = progressivityPercent;
      let p = 0.5;
      if (S <= 30) {
        p = (S / 30) * 0.5;
      } else if (S <= 50) {
        p = 0.5 + ((S - 30) / 20) * 0.20;
      } else {
        p = 0.70 + ((S - 50) / 50) * 0.30;
      }

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

      const chartPane = makeElement('div', { className: 'tc-chart-pane' });
      
      const svgContainer = makeElement('div', { 
        className: 'tc-svg-container',
        style: { position: 'relative' } 
      });
      chartPane.appendChild(svgContainer);

      // Tooltip inside same container at permanent sticky position, made draggable
      this.tooltipEl = makeElement('div', { 
        className: 'tc-tooltip',
        style: {
          position: 'absolute',
          width: '290px',
          minHeight: '185px',
          zIndex: '100',
          opacity: '1'
        }
      });
      svgContainer.appendChild(this.tooltipEl);
      
      // Initialize layout structure
      this.renderTooltipPlaceholder();
      this.setupTooltipDragging(this.tooltipEl);

      // Create static responsive SVG shell
      const width = 1000;
      const height = 440;
      this.svgElement = makeElement('svg:svg', {
        viewBox: `0 0 ${width} ${height}`,
        className: 'tc-svg-element'
      });
      svgContainer.appendChild(this.svgElement);

      // 1. SLIDERS ROW: Repositioned immediately under the chart as requested
      const slidersRow = makeElement('div', { className: 'tc-sliders-row', style: { marginTop: '8px' } }, [
        
        // COLUMN 1: Revenue Target / Public Budget Size
        makeElement('div', { className: 'tc-policy-card' }, [
          makeElement('div', { className: 'tc-slider-group' }, [
            makeElement('div', { className: 'tc-slider-label-row' }, [
              makeElement('span', { style: { color: 'var(--tc-primary)', fontSize: '0.95rem', fontWeight: '800' } }, 'Government Revenue Target'),
              this.revenueDisplayLabel = makeElement('span', { style: { color: 'var(--tc-primary)', fontWeight: 'bold', fontSize: '0.95rem' } }, '30%')
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
            style: { fontSize: '0.8rem', color: 'var(--tc-muted)', margin: '4px 0 0 0', lineHeight: '1.4' } 
          }, 'Configures what percent of all generated GNI is captured to fund the public budget.')
        ]),

        // COLUMN 2: Tax Code Design / Progressivity
        makeElement('div', { className: 'tc-policy-card' }, [
          makeElement('div', { className: 'tc-slider-group' }, [
            makeElement('div', { className: 'tc-slider-label-row' }, [
              makeElement('span', { style: { color: 'var(--tc-success)', fontSize: '0.95rem', fontWeight: '800' } }, 'Tax Progressivity'),
              this.progressivityDisplayLabel = makeElement('span', { style: { color: 'var(--tc-success)', fontWeight: 'bold', fontSize: '0.95rem' } }, '50%')
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
              makeElement('span', '0% (Poll Fee)'),
              makeElement('span', '30% (Flat Rate)'),
              makeElement('span', '50% (Progressive)'),
              makeElement('span', '100% (Equalizer)')
            ])
          ]),
          this.progressivityExplanationText = makeElement('p', { 
            style: { fontSize: '0.8rem', color: 'var(--tc-muted)', margin: '4px 0 0 0', lineHeight: '1.4' } 
          }, 'Determines the distribution design. Above 30%, negative taxes act as basic dividend payouts.')
        ])
      ]);
      chartPane.appendChild(slidersRow);

      // Legend panel
      this.preTaxLegendItem = makeElement('div', { className: 'tc-legend-item' }, [
        makeElement('div', { className: 'tc-legend-color', style: { backgroundColor: 'var(--tc-primary)' } }),
        makeElement('span', 'Pre-Tax Income')
      ]);
      this.postTaxLegendItem = makeElement('div', { 
        className: 'tc-legend-item',
        style: { transition: 'opacity 0.2s ease' }
      }, [
        makeElement('div', { className: 'tc-legend-color', style: { backgroundColor: 'var(--tc-success)' } }),
        makeElement('span', 'After-Tax Disposable Income')
      ]);

      // Sleek row containing standard legends
      chartPane.appendChild(makeElement('div', { className: 'tc-legend', style: { marginTop: '12px' } }, [
        this.preTaxLegendItem,
        this.postTaxLegendItem,
        makeElement('div', { className: 'tc-legend-item', style: { fontSize: '0.8rem', color: 'var(--tc-muted)' } }, 
          '● Hover vertical columns to review policy splits.'
        )
      ]));

      // Sleek Gini comparison badge
      this.giniComparisonBadge = makeElement('div', { className: 'tc-gini-badge-container' }, [
        this.giniTextNode = makeElement('span', 'Inequality index loading...')
      ]);
      chartPane.appendChild(this.giniComparisonBadge);

      // Control Row for switches/toggles
      const togglesRow = makeElement('div', { 
        style: { 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '24px', 
          padding: '12px', 
          background: 'rgba(30, 41, 59, 0.4)', 
          borderRadius: '10px', 
          marginTop: '12px',
          marginBottom: '8px',
          flexWrap: 'wrap'
        } 
      }, [
        makeElement('label', { className: 'tc-toggle-wrap', style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' } }, [
          this.afterTaxToggleCheckbox = makeElement('input', {
            type: 'checkbox',
            checked: this.showAfterTax,
            onchange: (e) => {
              this.showAfterTax = e.target.checked;
              this.updateInteractiveElements();
            }
          }),
          makeElement('span', { style: { color: 'var(--tc-success)', fontWeight: 'bold' } }, 'Show After-Tax Income Curve')
        ]),
        makeElement('label', { className: 'tc-toggle-wrap', style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' } }, [
          this.logToggleCheckbox = makeElement('input', {
            type: 'checkbox',
            checked: this.isLogarithmic,
            onchange: (e) => {
              this.isLogarithmic = e.target.checked;
              this.updateInteractiveElements();
            }
          }),
          makeElement('span', { style: { color: 'var(--tc-primary)', fontWeight: 'bold' } }, 'Use Logarithmic Scale')
        ])
      ]);
      chartPane.appendChild(togglesRow);

      this.dashboardGrid.appendChild(chartPane);
    }

  updateInteractiveElements() {
      if (!this.currentData || !this.currentData.data) return;

      const dataPoints = this.currentData.data;
      const totalPop = this.currentData.totalEntities;
      const currency = this.currentData.currency || '$';

      // Update state of dynamic inputs
      if (this.afterTaxToggleCheckbox) {
        this.showAfterTax = this.afterTaxToggleCheckbox.checked;
      }

      // Adjust opacity of the post-tax legend block
      if (this.postTaxLegendItem) {
        this.postTaxLegendItem.style.opacity = this.showAfterTax ? '1' : '0.35';
      }

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
      } else if (this.taxProgressivity < 30) {
        this.progressivityExplanationText.textContent = `Partially Proportional: Mix of equal dollar burdens and income percentages. (Flat Percentage Tax is at 30% on the slider)`;
      } else if (this.taxProgressivity === 30) {
        this.progressivityExplanationText.textContent = `Flat Percentage Tax: Everyone contributes exactly ${this.taxRevenuePercent}% of their pre-tax income. Gini metrics remain identical pre-tax vs post-tax.`;
      } else if (this.taxProgressivity < 50) {
        this.progressivityExplanationText.textContent = `Mildly Progressive: Wealthier percentiles pay larger shares. Lower brackets receive positive net cash dividends or credits.`;
      } else if (this.taxProgressivity === 50) {
        this.progressivityExplanationText.textContent = `Reasonable Progressive Tax: Highly balanced model. Low pre-tax earners are supported up to approximately $50,000 post-tax, funded by reasonable upper brackets.`;
      } else if (this.taxProgressivity < 100) {
        this.progressivityExplanationText.textContent = `Strongly Progressive: Universal Basic Income is highly prioritized. High earners contribute a significant portion of their income to equalize society.`;
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

      // 3. Update beautiful top indicator cards
      if (this.topGniValue) {
        this.topGniValue.textContent = this.formatCurrency(nationalAnnualIncome, currency);
        this.topGniSub.textContent = `For ${totalPop.toLocaleString()} simulated ${this.currentData.type || 'households'}`;
      }

      if (this.topBudgetValue) {
        this.topBudgetValue.textContent = this.formatCurrency(totalTaxesCollected, currency);
        this.topBudgetSub.textContent = `Target: ${this.taxRevenuePercent}% | Effective: ${actualCollectedRatio.toFixed(1)}% of aggregate GNI`;
      }

      // 4. Update the centered Gini badge line below the chart
      if (this.giniTextNode) {
        const reduction = preTaxGini > 0 ? ((preTaxGini - postTaxGini) / preTaxGini * 100) : 0;
        this.giniTextNode.innerHTML = `
          <span style="color: var(--tc-primary)">Pre-Tax Gini: ${preTaxGini.toFixed(4)}</span>
          <span style="color: var(--tc-muted); margin: 0 8px;">➔</span>
          <span style="color: var(--tc-success)">Post-Tax Gini: ${postTaxGini.toFixed(4)}</span>
          <span style="color: var(--tc-highlight); margin-left: 12px; font-weight: 800;">(${reduction.toFixed(1)}% inequality reduction)</span>
        `;
      }

      // 5. Update SVG elements directly
      const width = 1000;
      const height = 440;
      const padding = { top: 30, right: 40, bottom: 50, left: 110 };
      const chartW = width - padding.left - padding.right;
      const chartH = height - padding.top - padding.bottom;

      const maxPreTaxVal = Math.max(...preTaxIncomes, 1);
      const maxPostTaxVal = this.showAfterTax ? Math.max(...postTax, 1) : 1;
      const maxOverallValue = Math.max(maxPreTaxVal, maxPostTaxVal);

      const baselineY = padding.top + chartH;

      const scaleLogY = (val) => {
        if (val <= 0) return 0;
        return Math.log10(val + this.logOffset) - Math.log10(this.logOffset);
      };

      const maxScaledValue = scaleLogY(maxOverallValue);

      const mapX = (percentile) => padding.left + (percentile / 100) * chartW;
      const mapY = (val) => {
        if (val <= 0) return baselineY;
        if (this.isLogarithmic) {
          const scaled = scaleLogY(val);
          const fraction = scaled / maxScaledValue;
          return baselineY - (fraction * chartH);
        } else {
          const fraction = val / maxOverallValue;
          return baselineY - (fraction * chartH);
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

      // Vertical Grid lines: 10% Major gridlines and even fainter 5% minor gridlines
      for (let p = 0; p <= 100; p += 5) {
        const xCoord = mapX(p);
        const isMajor = (p % 10 === 0);

        svgChildren.push(['svg:line', {
          x1: xCoord, y1: padding.top,
          x2: xCoord, y2: baselineY,
          stroke: isMajor ? 'rgba(51, 65, 85, 0.45)' : 'rgba(51, 65, 85, 0.15)',
          'stroke-width': isMajor ? 1 : 0.75
        }]);

        if (isMajor) {
          svgChildren.push(['svg:text', {
            x: xCoord, y: baselineY + 20,
            'text-anchor': 'middle', fill: 'var(--tc-muted)', 'font-size': '11px'
          }, `${p}%`]);
        }
      }

      // Dynamic Node Extrapolations for smooth end boundaries
      const preNodes = [];
      const postNodes = [];

      // Node 0 extrapolation (0%)
      const preZero = Math.max(0, dataPoints[0].income - (dataPoints[1].income - dataPoints[0].income) * 0.5);
      const postZero = Math.max(0, postTax[0] - (postTax[1] - postTax[0]) * 0.5);
      preNodes.push({ x: mapX(0), y: mapY(preZero) });
      postNodes.push({ x: mapX(0), y: mapY(postZero) });

      // JSON midpoints 2.5% up to 97.5%
      dataPoints.forEach((p, idx) => {
        preNodes.push({ x: mapX(p.percentile), y: mapY(p.income) });
        postNodes.push({ x: mapX(p.percentile), y: mapY(postTax[idx]) });
      });

      // Node 21 extrapolation (100%)
      const preOneHundred = dataPoints[19].income + (dataPoints[19].income - dataPoints[18].income) * 0.5;
      const postOneHundred = postTax[19] + (postTax[19] - postTax[18]) * 0.5;
      preNodes.push({ x: mapX(100), y: mapY(preOneHundred) });
      postNodes.push({ x: mapX(100), y: mapY(postOneHundred) });

      // Generate smooth tangent bezier segments
      const preSegments = this.computeBezierSegments(preNodes, baselineY);
      const postSegments = this.computeBezierSegments(postNodes, baselineY);

      // Render backgrounds using paths (Pre-Tax)
      let preAreaD = `M ${mapX(0)} ${baselineY}`;
      preSegments.forEach(seg => {
        preAreaD += ` C ${seg.cp1.x.toFixed(1)} ${seg.cp1.y.toFixed(1)}, ${seg.cp2.x.toFixed(1)} ${seg.cp2.y.toFixed(1)}, ${seg.p1.x.toFixed(1)} ${seg.p1.y.toFixed(1)}`;
      });
      preAreaD += ` L ${mapX(100)} ${baselineY} Z`;
      svgChildren.push(['svg:path', { d: preAreaD, fill: 'url(#pre-tax-grad)', opacity: 0.12 }]);

      // Render backgrounds using paths (Post-Tax - Conditional)
      if (this.showAfterTax) {
        let postAreaD = `M ${mapX(0)} ${baselineY}`;
        postSegments.forEach(seg => {
          postAreaD += ` C ${seg.cp1.x.toFixed(1)} ${seg.cp1.y.toFixed(1)}, ${seg.cp2.x.toFixed(1)} ${seg.cp2.y.toFixed(1)}, ${seg.p1.x.toFixed(1)} ${seg.p1.y.toFixed(1)}`;
        });
        postAreaD += ` L ${mapX(100)} ${baselineY} Z`;
        svgChildren.push(['svg:path', { d: postAreaD, fill: 'url(#post-tax-grad)', opacity: 0.12 }]);
      }

      // Draw standard pre-tax background paths
      preSegments.forEach((seg, idx) => {
        const isHovered = (this.hoveredIndex === idx);
        svgChildren.push(['svg:path', {
          id: `pre-seg-path-${idx}`,
          d: seg.pathD,
          fill: 'none',
          stroke: isHovered ? 'var(--tc-primary)' : 'rgba(56, 189, 248, 0.45)',
          'stroke-width': isHovered ? 6.5 : 2.5,
          'stroke-linecap': 'round',
          transition: 'stroke 0.1s ease, stroke-width 0.1s ease'
        }]);
      });

      // Draw standard post-tax background paths (Conditional)
      if (this.showAfterTax) {
        postSegments.forEach((seg, idx) => {
          const isHovered = (this.hoveredIndex === idx);
          svgChildren.push(['svg:path', {
            id: `post-seg-path-${idx}`,
            d: seg.pathD,
            fill: 'none',
            stroke: isHovered ? 'var(--tc-success)' : 'rgba(16, 185, 129, 0.55)',
            'stroke-width': isHovered ? 7.5 : 3.0,
            'stroke-linecap': 'round',
            transition: 'stroke 0.1s ease, stroke-width 0.1s ease'
          }]);
        });
      }

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

      // Small tick marks at segment boundary dividers (2.5%, 7.5%, etc.)
      for (let i = 0; i < preNodes.length; i++) {
        const nodeX = preNodes[i].x;
        svgChildren.push(['svg:line', {
          x1: nodeX, y1: baselineY - 4,
          x2: nodeX, y2: baselineY + 4,
          stroke: 'rgba(255,255,255,0.3)', 'stroke-width': 1
        }]);
      }

      // 5. INVISIBLE FULL-COLUMN RECT HITBOXES: Trigger hover effortlessly over the entire column segment!
      for (let idx = 0; idx <= 20; idx++) {
        let xStart = 0;
        let xEnd = 0;

        if (idx === 0) {
          xStart = mapX(0);
          xEnd = mapX(2.5);
        } else if (idx === 20) {
          xStart = mapX(97.5);
          xEnd = mapX(100);
        } else {
          xStart = mapX(idx * 5 - 2.5);
          xEnd = mapX(idx * 5 + 2.5);
        }

        const colWidth = xEnd - xStart;

        svgChildren.push(['svg:rect', {
          x: xStart,
          y: padding.top,
          width: colWidth,
          height: chartH,
          fill: 'transparent',
          style: { cursor: 'pointer' },
          onmouseover: (e) => {
            this.hoveredIndex = idx;
            this.updateTooltip(idx);

            // Bring the active curve segment paths to the top of the Z-order
            const activePrePath = this.svgElement.querySelector(`#pre-seg-path-${idx}`);
            const activePostPath = this.svgElement.querySelector(`#post-seg-path-${idx}`);
            if (activePrePath) {
              activePrePath.parentNode.appendChild(activePrePath);
            }
            if (this.showAfterTax && activePostPath) {
              activePostPath.parentNode.appendChild(activePostPath);
            }

            this.updateInteractiveElements();
          },
          onmouseout: () => {
            this.hoveredIndex = null;
            this.renderTooltipPlaceholder();
            this.updateInteractiveElements();
          }
        }]);
      }

      // Draw node circles (Pre-Tax always, After-Tax conditionally)
      dataPoints.forEach((p, idx) => {
        const cx = mapX(p.percentile);
        const cyPre = mapY(p.income);
        const cyPost = mapY(postTax[idx]);

        const isHovered = (this.hoveredIndex === idx);

        // Draw node pre-tax circles
        svgChildren.push(['svg:circle', {
          cx: cx,
          cy: cyPre,
          r: isHovered ? 6 : 4,
          fill: 'var(--tc-primary)',
          stroke: 'var(--tc-bg)',
          'stroke-width': isHovered ? 2 : 1
        }]);

        // Draw node after-tax circles (Conditional)
        if (this.showAfterTax) {
          svgChildren.push(['svg:circle', {
            cx: cx,
            cy: cyPost,
            r: isHovered ? 7 : 4.5,
            fill: 'var(--tc-success)',
            stroke: 'var(--tc-bg)',
            'stroke-width': isHovered ? 2 : 1
          }]);
        }
      });

      // Axis borders
      svgChildren.push(['svg:line', {
        x1: padding.left, y1: baselineY,
        x2: width - padding.right, y2: baselineY,
        stroke: 'var(--tc-border)', 'stroke-width': 1.5
      }]);
      svgChildren.push(['svg:line', {
        x1: padding.left, y1: padding.top,
        x2: padding.left, y2: baselineY,
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

      // If a node is active, keep its tooltip values synchronized in real-time
      if (this.hoveredIndex !== null) {
        this.updateTooltip(this.hoveredIndex);
      }
    }

  getTicksForDataset(maxVal, isLogarithmic) {
      if (!isLogarithmic) {
        const ticks = [];
        for (let i = 0; i <= 5; i++) {
          ticks.push(Math.round((i / 5) * maxVal));
        }
        return ticks;
      } else {
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
      if (idx === null || !this.tooltipEl || !this.currentData) {
        this.renderTooltipPlaceholder();
        return;
      }

      const dataPoints = this.currentData.data;
      const totalPop = this.currentData.totalEntities;
      const currency = this.currentData.currency || '$';

      const preTaxIncomes = dataPoints.map(item => item.income);
      const preTaxSum = preTaxIncomes.reduce((a, b) => a + b, 0);

      const { taxes, postTax } = this.calculateTaxes(dataPoints, this.taxRevenuePercent, this.taxProgressivity);
      const postSum = postTax.reduce((a, b) => a + b, 0);

      const bracketPop = totalPop * 0.05;

      let percentileCenter = idx * 5;
      
      let minVal = Math.ceil(percentileCenter - 2.5);
      let maxVal = Math.floor(percentileCenter + 2.5);

      if (idx === 0) {
        minVal = 0;
        maxVal = 2;
      } else if (idx === 20) {
        minVal = 98;
        maxVal = 100;
      }

      let repPreIncome = 0;
      let repPostIncome = 0;
      if (idx === 0) {
        repPreIncome = dataPoints[0].income;
        repPostIncome = postTax[0];
      } else if (idx === 20) {
        repPreIncome = dataPoints[19].income;
        repPostIncome = postTax[19];
      } else {
        repPreIncome = dataPoints[idx - 1].income;
        repPostIncome = postTax[idx - 1];
      }

      const taxPaid = repPreIncome - repPostIncome;
      const taxRate = repPreIncome > 0 ? (taxPaid / repPreIncome * 100) : 0;
      const preShare = preTaxSum > 0 ? (repPreIncome / preTaxSum * 100) : 0;
      const postShare = postSum > 0 ? (repPostIncome / postSum * 100) : 0;

      this.tooltipEl.innerHTML = '';
      
      const headerEl = makeElement('div', { className: 'tc-tooltip-header', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [
        makeElement('span', `${percentileCenter}th Percentile`),
        makeElement('span', { style: { fontSize: '0.75rem', color: 'var(--tc-muted)', fontWeight: 'normal' } }, `${minVal}% to ${maxVal}%`)
      ]);
      this.tooltipEl.appendChild(headerEl);
      
      const details = [
        ['Pre-Tax Income:', `${currency}${Math.round(repPreIncome).toLocaleString()}`, 'var(--tc-primary)'],
        ['Post-Tax Income:', `${currency}${Math.round(repPostIncome).toLocaleString()}`, 'var(--tc-success)'],
        ['Effective Tax:', taxPaid < 0 ? `+${currency}${Math.round(Math.abs(taxPaid)).toLocaleString()} (Credit)` : `${currency}${Math.round(taxPaid).toLocaleString()}`, taxPaid < 0 ? 'var(--tc-success)' : 'var(--tc-accent)'],
        ['Effective Rate:', `${repPreIncome > 0 ? taxRate.toFixed(1) + '%' : 'N/A'}`, 'var(--tc-text)'],
        ['Share of GNI:', `${preShare.toFixed(1)}% ➔ ${postShare.toFixed(1)}%`, 'var(--tc-highlight)']
      ];

      details.forEach(([label, value, color]) => {
        this.tooltipEl.appendChild(makeElement('div', { className: 'tc-tooltip-row' }, [
          makeElement('span', label),
          makeElement('span', { className: 'tc-tooltip-val', style: { color: color } }, value)
        ]));
      });
    }

  computeBezierSegments(nodes, baselineY) {
      const n = nodes.length;
      const segments = [];
      const slopes = new Array(n);
      
      for (let i = 0; i < n; i++) {
        if (nodes[i].y === baselineY) {
          // Force slope at $0 baseline to be exactly 0. This mathematically guarantees
          // that the Cubic Bezier spline stays flat and does not dip below zero.
          slopes[i] = 0;
        } else if (i === 0) {
          slopes[i] = (nodes[1].y - nodes[0].y) / (nodes[1].x - nodes[0].x);
        } else if (i === n - 1) {
          slopes[i] = (nodes[n-1].y - nodes[n-2].y) / (nodes[n-1].x - nodes[n-2].x);
        } else {
          slopes[i] = (nodes[i+1].y - nodes[i-1].y) / (nodes[i+1].x - nodes[i-1].x);
        }

        // Monotone Spline Safety: clamp slope to zero if there is local extremum to avoid overshoot
        if (i > 0 && i < n - 1) {
          const dy1 = nodes[i].y - nodes[i-1].y;
          const dy2 = nodes[i+1].y - nodes[i].y;
          if (dy1 * dy2 < 0) {
            slopes[i] = 0;
          }
        }
      }

      for (let i = 0; i < n - 1; i++) {
        const p0 = nodes[i];
        const p1 = nodes[i+1];
        const dx = p1.x - p0.x;
        
        const cp1x = p0.x + dx / 3;
        const cp1y = p0.y + slopes[i] * (dx / 3);
        
        const cp2x = p1.x - dx / 3;
        const cp2y = p1.y - slopes[i+1] * (dx / 3);
        
        segments.push({
          p0,
          p1,
          cp1: { x: cp1x, y: cp1y },
          cp2: { x: cp2x, y: cp2y },
          pathD: `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`
        });
      }
      return segments;
    }

  renderTooltipPlaceholder() {
      if (!this.tooltipEl) return;
      this.tooltipEl.innerHTML = '';
      this.tooltipEl.appendChild(makeElement('div', { 
        style: { 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '6px', 
          textAlign: 'center', 
          justifyContent: 'center', 
          height: '100%', 
          color: 'var(--tc-muted)', 
          padding: '10px 4px',
          boxSizing: 'border-box'
        } 
      }, [
        makeElement('div', { style: { fontSize: '1.4rem', marginBottom: '1px' } }, '✥'),
        makeElement('div', { style: { fontWeight: 'bold', color: 'var(--tc-primary)', fontSize: '0.85rem' } }, 'Interactive Inspector'),
        makeElement('div', { style: { fontSize: '0.78rem', lineHeight: '1.4' } }, 'Hover over any percentile column in the chart below to inspect pre vs post tax splits.'),
        makeElement('div', { style: { fontSize: '0.72rem', color: 'var(--tc-accent)', fontStyle: 'italic', marginTop: '4px' } }, '✥ Click & drag this box anywhere')
      ]));
    }

  formatCurrency(val, currency) {
      if (val >= 1e12) {
        return `${currency}${(val / 1e12).toFixed(2)}T`;
      } else if (val >= 1e9) {
        return `${currency}${(val / 1e9).toFixed(1)}B`;
      } else if (val >= 1e6) {
        return `${currency}${(val / 1e6).toFixed(1)}M`;
      } else {
        return `${currency}${Math.round(val).toLocaleString()}`;
      }
    }

  setupTooltipDragging(el) {
      let isDragging = false;
      let startX = 0, startY = 0;
      let initialLeft = 16, initialTop = 16;

      // Ensure position coordinates persist nicely
      if (this.tooltipX !== undefined && this.tooltipY !== undefined) {
        el.style.left = `${this.tooltipX}px`;
        el.style.top = `${this.tooltipY}px`;
      } else {
        this.tooltipX = 16;
        this.tooltipY = 16;
        el.style.left = '16px';
        el.style.top = '16px';
      }

      const onMouseDown = (e) => {
        if (e.button !== 0) return; // limit to standard mouse click
        
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        
        initialLeft = parseFloat(el.style.left) || 16;
        initialTop = parseFloat(el.style.top) || 16;
        
        el.style.transition = 'none'; // clear transitions during movement
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
      };

      const onMouseMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        const newLeft = initialLeft + dx;
        const newTop = initialTop + dy;
        
        // Prevent layout limits overflow
        const clampedLeft = Math.max(-50, Math.min(850, newLeft));
        const clampedTop = Math.max(-20, Math.min(420, newTop));
        
        this.tooltipX = clampedLeft;
        this.tooltipY = clampedTop;
        
        el.style.left = `${clampedLeft}px`;
        el.style.top = `${clampedTop}px`;
      };

      const onMouseUp = () => {
        isDragging = false;
        el.style.transition = 'border-color 0.15s ease, opacity 0.15s ease';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      el.addEventListener('mousedown', onMouseDown);
      el.style.cursor = 'move';
    }
}