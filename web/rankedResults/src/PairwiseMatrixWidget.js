class PairwiseMatrixWidget {
  CELL_SIZE = 40;

  ROW_LABEL_WIDTH = 120;

  ROW_LABEL_HEIGHT = this.CELL_SIZE;

  COL_LABEL_AREA_HEIGHT = 70;

  COL_LABEL_TEXT_MAX_WIDTH = 90;

  PW_WINS_COL_WIDTH = 70;

  WORST_LOSS_COL_WIDTH = 95;

  SCORE_BAR_HEIGHT = 20;

  SCORE_BAR_ROW_SPACING = 2;

  CHART_PADDING = 8;

  HIGHLIGHT_RECT_PADDING = 3;

  SVG_EFFECTIVE_PADDING = 5;

  FONT_SIZE_PRIMARY = '13px';

  FONT_SIZE_ROW_LABEL = '12px';

  FONT_SIZE_COL_LABEL = '11px';

  FONT_SIZE_PIE_OVERLAY = '10px';

  FONT_SIZE_PW_WINS_NUM = '13px';

  FONT_SIZE_PW_WINS_TEXT = '9px';

  FONT_SIZE_SCORE_TEXT_ON_BAR = '11px';

  FONT_SIZE_SCORE_NUM_IN_COL = '13px';

  FONT_SIZE_WORST_LOSS_TEXT = '10px';

  PIE_R_MAX_DESIGN = (this.CELL_SIZE / 2) * 0.85;

  PIE_STROKE_WIDTH = 1;

  PIE_CIRCLE_STROKE_WIDTH = 0.5;

  popupOffset = 8;

  constructor(matrixData, candidates, options = {}, hostEnv = null) {
      const defaults = {
        view: 'both',
        displayMode: 'none',
        useLocalStorage: true,
      };
      this.options = { ...defaults, ...options };
      this.env = hostEnv;
      this.matrix = matrixData;
      this.cand = candidates;
      this.displayMode = this.options.displayMode;

      if (this.options.useLocalStorage) {
        this.loadSettings();
      }

      this.sortedCandidates = Object.entries(this.matrix)
        .filter(
          ([key, data]) =>
            key !== 'WORST_LOSER' && data && typeof data.rank === 'number'
        )
        .sort(([, a], [, b]) => a.rank - b.rank)
        .map(([key]) => key);

      this.columnSortedCandidates = [...this.sortedCandidates].reverse();
      this.calculatePairwiseWins();

      this.element = makeElement('div', { class: 'pmwHost' });
      this.highlightRects = { row: null, col: null, worstLoss: null };
      this.injectCss();
      this.render();
      this.popup = makeElement('div', { class: 'pairwisePopup' });
      
      if (this.env && this.env.container) {
          this.env.container.appendChild(this.popup);
      } else {
          document.body.append(this.popup);
      }

      this._pieContentCycleFunc = () => {
        if (this.options.view !== 'pies' && this.options.view !== 'both') return;
        const modes = ['numbers', 'percentages', 'none'];
        const currentModeIndex = modes.indexOf(this.displayMode);
        let nextIndex = (currentModeIndex + 1) % modes.length;
        this.displayMode = modes[nextIndex];
        this.saveSettings();
        if (this.pieContentRadioGroup) {
          const radioToSelect = this.pieContentRadioGroup.querySelector(
            `input[name="pmwPieContentDisplay"][value="${this.displayMode}"]`
          );
          if (radioToSelect) radioToSelect.checked = true;
        }
        this.renderContent();
      };

      this._handleKeydown = (e) => {
        if (
          e.key.toLowerCase() === 'p' &&
          document.activeElement?.tagName !== 'TEXTAREA' &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.id !== 'ballotSelector' &&
          document.activeElement?.id !== 'tabulationSelector' &&
          !document.activeElement?.closest('.pmwHost')
        ) {
          e.preventDefault();
          this._pieContentCycleFunc();
        }
      };

      window.addEventListener('keydown', this._handleKeydown);

      this.rowLabelDivs = {};
      this.colLabelDivs = {};
      this.interactivePieElements = [];
      this.worstLossCellDivs = {};
    }

  // Methods remain completely identical except for showPopup sizing...
    calculateWorstLossDetails() {
      this.worstLosses = {};
      const candidateKeys = this.sortedCandidates;
      for (const rKey of candidateKeys) {
        if (rKey === 'WORST_LOSER' || !this.matrix[rKey]) continue;
        let worstPercentage = 101; 
        let opponentForWorst = null;
        let hasOpponents = false;
        for (const cKey of candidateKeys) {
          if (rKey === cKey) continue;
          hasOpponents = true;
          const votesFor_rKey = this.matrix[rKey].wins?.[cKey] ?? 0;
          const votesFor_cKey = this.matrix[cKey]?.wins?.[rKey] ?? 0;
          const totalVotes = votesFor_rKey + votesFor_cKey;
          const currentPercentage =
            totalVotes > 0 ? (votesFor_rKey / totalVotes) * 100 : 50;
          if (currentPercentage < worstPercentage) {
            worstPercentage = currentPercentage;
            opponentForWorst = cKey;
          }
        }
        if (hasOpponents) {
          this.worstLosses[rKey] = { percentage: worstPercentage, against: opponentForWorst };
        } else {
          this.worstLosses[rKey] = { percentage: 100, against: null };
        }
      }
    }

  calculatePairwiseWins() {
      this.pairwiseWins = {};
      for (const candA of this.sortedCandidates) {
        if (!this.matrix[candA] || !this.matrix[candA].wins) {
          this.pairwiseWins[candA] = 0;
          continue;
        }
        this.pairwiseWins[candA] = 0;
        for (const candB of this.sortedCandidates) {
          if (candA === candB || !this.matrix[candB] || !this.matrix[candB].wins)
            continue;
          const winsA = this.matrix[candA].wins[candB] ?? 0;
          const winsB = this.matrix[candB].wins[candA] ?? 0;
          if (winsA > winsB) this.pairwiseWins[candA]++;
        }
      }
    }

  render() {
      this.injectCss(); 
      this.renderContent();
    }

  preparePiePlacementGrid() {
      const N = this.sortedCandidates.length;
      const grid = {};
      for (let i = 0; i < N; i++) {
        grid[this.sortedCandidates[i]] = {};
      }
      for (let i = 0; i < N; i++) {
        const candA = this.sortedCandidates[i];
        for (let j = i + 1; j < N; j++) {
          const candB = this.sortedCandidates[j];
          if (!this.matrix[candA] || !this.matrix[candA].wins || !this.matrix[candB] || !this.matrix[candB].wins) continue;
          const winsA_vs_B = this.matrix[candA].wins[candB] ?? 0;
          const winsB_vs_A = this.matrix[candB].wins[candA] ?? 0;
          let pieWinner, pieLoser, v1_pie, v2_pie;
          if (winsA_vs_B > winsB_vs_A) {
            pieWinner = candA; pieLoser = candB; v1_pie = winsA_vs_B; v2_pie = winsB_vs_A;
          } else if (winsB_vs_A > winsA_vs_B) {
            pieWinner = candB; pieLoser = candA; v1_pie = winsB_vs_A; v2_pie = winsA_vs_B;
          } else {
            pieWinner = candA; pieLoser = candB; v1_pie = winsA_vs_B; v2_pie = winsB_vs_A;
          }
          if (!grid[pieWinner]) grid[pieWinner] = {};
          grid[pieWinner][pieLoser] = { v1: v1_pie, v2: v2_pie, actualWinner: pieWinner, actualLoser: pieLoser };
        }
      }
      return grid;
    }

  drawPieOnCanvas(svgCanvas, cx_abs, cy_abs, v1, v2) {
      const R_DESIGN = this.PIE_R_MAX_DESIGN;
      const tot = v1 + v2;
      if (tot === 0) {
        svgCanvas.append(makeElement('svg:circle', { cx: cx_abs, cy: cy_abs, r: R_DESIGN, class: 'emptyPie', 'stroke-width': this.PIE_CIRCLE_STROKE_WIDTH }));
        return;
      }
      const R_eff = R_DESIGN;
      const slicePath = (ratio, centerAngleRad, cls, drawingRadius) => {
        if (!ratio || ratio <= 0 || drawingRadius <= 0) return null;
        const effectiveRatio = Math.min(ratio, 0.99999);
        const sweepAngle = effectiveRatio * 2 * Math.PI;
        const startAngle = centerAngleRad - sweepAngle / 2;
        const largeArcFlag = sweepAngle > Math.PI ? 1 : 0;
        const sx = cx_abs + drawingRadius * Math.cos(startAngle);
        const sy = cy_abs + drawingRadius * Math.sin(startAngle);
        const ex = cx_abs + drawingRadius * Math.cos(startAngle + sweepAngle);
        const ey = cy_abs + drawingRadius * Math.sin(startAngle + sweepAngle);
        const d = `M ${sx} ${sy} A ${drawingRadius} ${drawingRadius} 0 ${largeArcFlag} 1 ${ex} ${ey} L ${cx_abs} ${cy_abs} Z`;
        return makeElement('svg:path', { d, class: cls, 'stroke-width': this.PIE_STROKE_WIDTH });
      };
      const v1Ratio = v1 / tot;
      const v2Ratio = v2 / tot;
      const slice1Class = 'winsSlice';
      const slice2Class = v1 === v2 ? 'tieSlice' : 'lossSlice';

      if (v1Ratio === 1.0) {
        svgCanvas.append(makeElement('svg:circle', { cx: cx_abs, cy: cy_abs, r: R_eff, class: slice1Class, 'stroke-width': this.PIE_CIRCLE_STROKE_WIDTH }));
      } else if (v2Ratio === 1.0) {
        svgCanvas.append(makeElement('svg:circle', { cx: cx_abs, cy: cy_abs, r: R_eff, class: slice2Class, 'stroke-width': this.PIE_CIRCLE_STROKE_WIDTH }));
      } else {
        const path2 = slicePath(v2Ratio, Math.PI / 2, slice2Class, R_eff);
        const path1 = slicePath(v1Ratio, -Math.PI / 2, slice1Class, R_eff);
        if (path2) svgCanvas.append(path2);
        if (path1) svgCanvas.append(path1);
      }
    }

  renderContent() {
      this.element.innerHTML = '';
      this.rowLabelDivs = {};
      this.colLabelDivs = {};
      this.interactivePieElements = [];
      this.worstLossCellDivs = {};
      this.pieCellCoordinates = {};

      const currentHighlightTypes = Object.keys(this.highlightRects);
      currentHighlightTypes.forEach((type) => { this.hideHighlightRect(type); });
      this.highlightRects = { row: null, col: null, worstLoss: null };

      const N_rows = this.sortedCandidates.length;
      this.renderableColumnKeys = [];
      this.piePlacementGrid = (this.options.view === 'pies' || this.options.view === 'both') && N_rows > 0 ? this.preparePiePlacementGrid() : null;

      if ((this.options.view === 'pies' || this.options.view === 'both') && this.piePlacementGrid && N_rows > 0) {
        for (const colKey of this.columnSortedCandidates) {
          let columnHasPies = false;
          for (const rKey of this.sortedCandidates) {
            if (this.piePlacementGrid[rKey] && this.piePlacementGrid[rKey][colKey]) { columnHasPies = true; break; }
          }
          if (columnHasPies) this.renderableColumnKeys.push(colKey);
        }
      }

      this.controlsContainer = makeElement('div', { class: 'pmwControlsContainer' });
      this.controlsContainer.append(this.createControlsElement());
      this.element.append(this.controlsContainer);
      this.updateControlStates();

      this.contentDiv = makeElement('div', { class: 'pmwContentContainer' });
      this.element.append(this.contentDiv);

      if (N_rows === 0) {
        this.contentDiv.append(makeElement('div', { class: 'pmwCenteredMessage' }, 'No candidate data to display.'));
        const controlsHeight = this.controlsContainer.offsetHeight || 40;
        this.element.style.height = `${controlsHeight + 50 + this.CHART_PADDING * 2}px`;
        return;
      }
      
      this.calculateLayoutDimensions(N_rows);
      this.contentDiv.style.width = `${this.totalContentWidth}px`;
      this.contentDiv.style.height = `${this.totalContentHeight}px`;
      const controlsActualHeight = this.controlsContainer.offsetHeight || 40;
      this.element.style.minHeight = `${controlsActualHeight + this.totalContentHeight + this.CHART_PADDING * 2}px`;

      this.renderRowLabels(N_rows);
      if ((this.options.view === 'pies' || this.options.view === 'both') && this.renderableColumnKeys.length > 0) {
        this.renderColumnLabels();
      }

      if (this.options.view === 'scores' || this.options.view === 'both') {
        let maxScoreValue = 0;
        this.sortedCandidates.forEach((rKey) => {
          if (this.matrix[rKey]?.score !== undefined) maxScoreValue = Math.max(maxScoreValue, this.matrix[rKey].score);
        });
        if (maxScoreValue === 0) maxScoreValue = 100;
        this.renderScoreBars(N_rows, maxScoreValue);
      }

      if ((this.options.view === 'pies' || this.options.view === 'both') && this.piePlacementGrid) {
        const svgPaddedWidth = this.gridAreaWidth + 2 * this.SVG_EFFECTIVE_PADDING;
        const svgPaddedHeight = this.gridAreaHeight + 2 * this.SVG_EFFECTIVE_PADDING;
        this.svgElement = makeElement('svg:svg', {
          class: 'pmwMainSvgCanvas',
          width: svgPaddedWidth,
          height: svgPaddedHeight,
          viewBox: `0 0 ${svgPaddedWidth} ${svgPaddedHeight}`,
        });
        this.svgElement.style.position = 'absolute';
        this.svgElement.style.left = `${this.gridAreaX - this.SVG_EFFECTIVE_PADDING}px`;
        this.svgElement.style.top = `${this.gridAreaY - this.SVG_EFFECTIVE_PADDING}px`;
        this.svgElement.style.width = `${svgPaddedWidth}px`;
        this.svgElement.style.height = `${svgPaddedHeight}px`;
        this.contentDiv.append(this.svgElement);
        this.renderPiesAndOverlays(this.piePlacementGrid, N_rows);
      }

      this.renderRightSideColumns(N_rows);

      this.contentDiv.addEventListener('mouseleave', (event) => {
        const toElement = event.relatedTarget;
        if (!this.element.contains(toElement) && toElement !== this.popup) {
          this.hideHighlightRect('row');
          this.hideHighlightRect('col');
          this.hideHighlightRect('worstLoss');
          this.clearPopupHighlight();
          if (this.popup) {
            this.popup.style.opacity = '0';
            this.popup.classList.remove('visible');
          }
        }
      });

      if ((this.options.view === 'pies' || this.options.view === 'both') && N_rows >= 1 && this.interactivePieElements.length > 0) {
        this.addPieCellPopupInteractivity();
      } else {
        this.clearPopupHighlight();
        if (this.popup) {
          this.popup.style.opacity = '0';
          this.popup.classList.remove('visible');
        }
      }
    }

  calculateLayoutDimensions(N_rows) {
      this.gridAreaX = this.CHART_PADDING + this.ROW_LABEL_WIDTH + this.CHART_PADDING;
      this.gridAreaY = this.CHART_PADDING;
      if (((this.options.view === 'pies' || this.options.view === 'both') && this.renderableColumnKeys.length > 0) || (this.options.view === 'scores' && N_rows > 0)) {
        this.gridAreaY += this.COL_LABEL_AREA_HEIGHT + this.CHART_PADDING;
      }
      if (this.options.view === 'pies' || this.options.view === 'both') {
        this.gridAreaWidth = this.renderableColumnKeys.length * this.CELL_SIZE;
        if (this.renderableColumnKeys.length === 0 && N_rows > 0) this.gridAreaWidth = this.CELL_SIZE;
      } else {
        this.gridAreaWidth = N_rows * this.CELL_SIZE;
        if (N_rows === 0) this.gridAreaWidth = this.CELL_SIZE;
        else if (this.gridAreaWidth === 0 && N_rows > 0) this.gridAreaWidth = this.CELL_SIZE * N_rows;
      }
      if (this.gridAreaWidth <= 0 && N_rows > 0) this.gridAreaWidth = this.CELL_SIZE * 2;
      this.gridAreaHeight = N_rows * this.CELL_SIZE;
      this.totalContentWidth = this.gridAreaX + this.gridAreaWidth + this.CHART_PADDING + this.PW_WINS_COL_WIDTH + this.CHART_PADDING + this.WORST_LOSS_COL_WIDTH + this.CHART_PADDING;
      this.totalContentHeight = this.gridAreaY + this.gridAreaHeight + this.CHART_PADDING;
      if (N_rows === 0) this.totalContentHeight = Math.max(this.totalContentHeight, 50);
    }

  renderRowLabels(N_rows) {
      for (let i = 0; i < N_rows; i++) {
        const rKey = this.sortedCandidates[i];
        const candName = this.cand[rKey] || rKey;
        const yPos = this.gridAreaY + i * this.CELL_SIZE;
        const labelDiv = makeElement('div', { class: 'pmwRowLabel pmwInteractiveLabel', title: candName }, candName);
        labelDiv.style.top = `${yPos}px`; labelDiv.style.left = `${this.CHART_PADDING}px`; labelDiv.style.width = `${this.ROW_LABEL_WIDTH}px`; labelDiv.style.height = `${this.ROW_LABEL_HEIGHT}px`;
        labelDiv.addEventListener('mouseenter', () => {
          this.showRowHighlight(rKey, i);
          const colIdx = this.renderableColumnKeys.indexOf(rKey);
          if (colIdx !== -1) this.showColHighlight(rKey, colIdx);
          else this.hideHighlightRect('col');
        });
        labelDiv.addEventListener('mouseleave', () => { this.hideHighlightRect('row'); this.hideHighlightRect('col'); });
        this.contentDiv.append(labelDiv);
        this.rowLabelDivs[rKey] = labelDiv;
      }
    }

  renderColumnLabels() {
      const COL_LABEL_Y_OFFSET = 12;
      const COL_LABEL_X_OFFSET = 8;
      for (let i = 0; i < this.renderableColumnKeys.length; i++) {
        const cKey = this.renderableColumnKeys[i];
        const candName = this.cand[cKey] || cKey;
        const xPos = this.gridAreaX + i * this.CELL_SIZE;
        const outerDiv = makeElement('div', { class: 'pmwColLabelOuter' });
        outerDiv.style.top = `${this.CHART_PADDING + COL_LABEL_Y_OFFSET}px`; outerDiv.style.left = `${xPos + COL_LABEL_X_OFFSET}px`; outerDiv.style.width = `${this.CELL_SIZE - COL_LABEL_X_OFFSET}px`; outerDiv.style.height = `${this.COL_LABEL_AREA_HEIGHT - COL_LABEL_Y_OFFSET}px`;
        const textSpan = makeElement('span', { class: 'pmwInteractiveLabel' }, candName);
        const innerDiv = makeElement('div', { class: 'pmwColLabelInner' }, textSpan);
        outerDiv.addEventListener('mouseenter', () => {
          this.showColHighlight(cKey, i);
          const rowIdx = this.sortedCandidates.indexOf(cKey);
          if (rowIdx !== -1) this.showRowHighlight(cKey, rowIdx);
          else this.hideHighlightRect('row');
        });
        outerDiv.addEventListener('mouseleave', () => { this.hideHighlightRect('col'); this.hideHighlightRect('row'); });
        outerDiv.append(innerDiv);
        this.contentDiv.append(outerDiv);
        this.colLabelDivs[cKey] = textSpan;
      }
    }

  renderPiesAndOverlays(piePlacementGrid, N_rows) {
      if (!this.svgElement || !piePlacementGrid) return;
      for (let r = 0; r < N_rows; r++) {
        const rKey = this.sortedCandidates[r];
        if (!this.pieCellCoordinates[rKey]) this.pieCellCoordinates[rKey] = {};
        for (let c_idx = 0; c_idx < this.renderableColumnKeys.length; c_idx++) {
          const cKey = this.renderableColumnKeys[c_idx];
          const pieData = piePlacementGrid[rKey]?.[cKey];
          const ox = c_idx * this.CELL_SIZE;
          const oy = r * this.CELL_SIZE;
          this.pieCellCoordinates[rKey][cKey] = { svg_x_abs: ox + this.SVG_EFFECTIVE_PADDING, svg_y_abs: oy + this.SVG_EFFECTIVE_PADDING };
          if (pieData) {
            const cx = this.pieCellCoordinates[rKey][cKey].svg_x_abs + this.CELL_SIZE / 2;
            const cy = this.pieCellCoordinates[rKey][cKey].svg_y_abs + this.CELL_SIZE / 2;
            this.drawPieOnCanvas(this.svgElement, cx, cy, pieData.v1, pieData.v2);
            const overlayDiv = makeElement('div', { class: 'pmwPieOverlay' });
            overlayDiv.style.top = `${this.gridAreaY + oy}px`; overlayDiv.style.left = `${this.gridAreaX + ox}px`; overlayDiv.style.width = `${this.CELL_SIZE}px`; overlayDiv.style.height = `${this.CELL_SIZE}px`;
            if (this.displayMode !== 'none') {
              const valueBox = makeElement('div', { class: 'pmwPieValueBox' });
              const tot = pieData.v1 + pieData.v2;
              if (this.displayMode === 'numbers') {
                valueBox.append(makeElement('div', { class: 'value-line' }, this.fmt(pieData.v1)), makeElement('div', { class: 'value-line' }, this.fmt(pieData.v2)));
              } else if (this.displayMode === 'percentages') {
                const pct = tot > 0 ? ((pieData.v1 / tot) * 100).toFixed(0) + '%' : '50%';
                valueBox.append(makeElement('div', { class: 'value-line' }, pct));
              }
              overlayDiv.append(valueBox);
            }
            this.contentDiv.append(overlayDiv);
            this.interactivePieElements.push({ element: overlayDiv, winnerKey: pieData.actualWinner, loserKey: pieData.actualLoser, v1: pieData.v1, v2: pieData.v2 });
          }
        }
      }
    }

  renderScoreBars(N_rows, maxScoreValue) {
      for (let i = 0; i < N_rows; i++) {
        const rKey = this.sortedCandidates[i];
        const currentScore = this.matrix[rKey]?.score ?? 0;
        const wPct = maxScoreValue > 0 ? (currentScore / maxScoreValue) * 100 : 0;
        let bH, yPos, hideText;
        if (this.options.view === 'both') {
          bH = this.CELL_SIZE - this.SCORE_BAR_ROW_SPACING * 2;
          yPos = this.gridAreaY + i * this.CELL_SIZE + this.SCORE_BAR_ROW_SPACING;
          hideText = true;
        } else {
          bH = this.SCORE_BAR_HEIGHT;
          yPos = this.gridAreaY + i * this.CELL_SIZE + (this.CELL_SIZE - bH) / 2;
          hideText = false;
        }
        const sBar = this.createScoreBarElement(currentScore, wPct, hideText);
        if (this.options.view === 'both') sBar.classList.add('both-mode-bar-container');
        else sBar.classList.add('scores-mode-bar-container');
        sBar.style.top = `${yPos}px`; sBar.style.left = `${this.gridAreaX}px`; sBar.style.width = `${this.gridAreaWidth}px`; sBar.style.height = `${bH}px`;
        this.contentDiv.append(sBar);
      }
    }

  createScoreBarElement(score, wPct, hideText) {
      const c = makeElement('div', { class: 'pmwScoreBarContainer' });
      const b = makeElement('div', { class: 'pmwScoreBar', style: `width: ${Math.max(0, Math.min(100, wPct))}%;` });
      if (this.options.view === 'both') b.classList.add('both-mode-score-fill');
      c.append(b);
      if (!hideText) c.append(makeElement('span', { class: 'pmwScoreTextOnBar' }, score.toFixed(1)));
      return c;
    }

  renderRightSideColumns(N_rows) {
      const pwWinsX = this.gridAreaX + this.gridAreaWidth + this.CHART_PADDING;
      const worstLossColX = pwWinsX + this.PW_WINS_COL_WIDTH + this.CHART_PADDING;
      const titleY = this.gridAreaY - this.COL_LABEL_AREA_HEIGHT;

      if (N_rows > 0) {
        const title1 = makeElement('div', { class: 'pmwRightColTitle pmwPwWinsTitle' });
        title1.innerHTML = 'Pairwise<br>Wins';
        title1.style.top = `${titleY}px`; title1.style.left = `${pwWinsX}px`; title1.style.width = `${this.PW_WINS_COL_WIDTH}px`; title1.style.height = `${this.COL_LABEL_AREA_HEIGHT}px`;
        this.contentDiv.append(title1);
        const title2 = makeElement('div', { class: 'pmwRightColTitle pmwWorstLossColTitle' });
        title2.innerHTML = 'Worst<br>Pairwise Result';
        title2.style.top = `${titleY}px`; title2.style.left = `${worstLossColX}px`; title2.style.width = `${this.WORST_LOSS_COL_WIDTH}px`; title2.style.height = `${this.COL_LABEL_AREA_HEIGHT}px`;
        this.contentDiv.append(title2);
      }
      for (let i = 0; i < N_rows; i++) {
        const rKey = this.sortedCandidates[i];
        const yPos = this.gridAreaY + i * this.CELL_SIZE;
        const wins = this.pairwiseWins[rKey] ?? 0;
        const wDiv = makeElement('div', { class: 'pmwRightColCell pmwPwWinsCell' });
        wDiv.style.top = `${yPos}px`; wDiv.style.left = `${pwWinsX}px`; wDiv.style.width = `${this.PW_WINS_COL_WIDTH}px`; wDiv.style.height = `${this.ROW_LABEL_HEIGHT}px`;
        wDiv.append(makeElement('div', { class: 'pmwRightColNumber pmwPwWinsNumber' }, this.fmt(wins)), makeElement('div', { class: 'pmwRightColLabel pmwPwWinsText' }, wins === 1 ? 'win' : 'wins'));
        this.contentDiv.append(wDiv);

        const lDiv = makeElement('div', { class: 'pmwRightColCell pmwWorstLossCell pmwInteractiveLabel' });
        lDiv.style.top = `${yPos}px`; lDiv.style.left = `${worstLossColX}px`; lDiv.style.width = `${this.WORST_LOSS_COL_WIDTH}px`; lDiv.style.height = `${this.ROW_LABEL_HEIGHT}px`;
        const candData = this.matrix[rKey];
        if (candData) {
          const oppKey = candData.worstPairwiseOpponent;
          const pct = candData.score;
          if (oppKey) {
            const oppName = this.cand[oppKey] || oppKey;
            lDiv.append(makeElement('div', { class: 'pmwWorstLossMargin' }, `${pct.toFixed(1)}%`), makeElement('div', { class: 'pmwWorstLossOpponent' }, `(vs ${oppName})`));
            let winner, loser;
            if (pct > 50) { winner = rKey; loser = oppKey; }
            else if (pct < 50) { winner = oppKey; loser = rKey; }
            else {
              const r_i = this.sortedCandidates.indexOf(rKey);
              const o_i = this.sortedCandidates.indexOf(oppKey);
              winner = r_i < o_i ? rKey : oppKey;
              loser = winner === rKey ? oppKey : rKey;
            }
            lDiv.addEventListener('mouseenter', () => this.showWorstLossHighlight(loser, winner));
            lDiv.addEventListener('mouseleave', () => this.hideHighlightRect('worstLoss'));
          } else {
            lDiv.append(makeElement('div', { class: 'pmwWorstLossMargin' }, `${pct.toFixed(1)}%`));
          }
        }
        this.contentDiv.append(lDiv);
        this.worstLossCellDivs[rKey] = lDiv;
      }
    }

  showRowHighlight(rowCandKey, rowIndex) {
      if (!this.svgElement || !this.piePlacementGrid || (this.options.view !== 'pies' && this.options.view !== 'both')) return;
      if (this.highlightRects.row) this.hideHighlightRect('row');
      let minX = Infinity, maxX = -Infinity;
      let found = false;
      if (this.pieCellCoordinates[rowCandKey]) {
        for (const colCandKey of this.renderableColumnKeys) {
          const c = this.pieCellCoordinates[rowCandKey][colCandKey];
          if (c && this.piePlacementGrid[rowCandKey]?.[colCandKey]) { minX = Math.min(minX, c.svg_x_abs); maxX = Math.max(maxX, c.svg_x_abs + this.CELL_SIZE); found = true; }
        }
      }
      if (found) {
        const nr = makeElement('svg:rect', { x: minX, y: rowIndex * this.CELL_SIZE + this.SVG_EFFECTIVE_PADDING, width: maxX - minX, height: this.CELL_SIZE, class: 'pmwHighlightRect pmwRowHighlightRect' });
        nr._pmw_associated_key = rowCandKey;
        this.highlightRects.row = nr;
        this.svgElement.append(nr);
      }
    }

  showColHighlight(colCandKey, colIndex_renderable) {
      if (!this.svgElement || !this.piePlacementGrid || (this.options.view !== 'pies' && this.options.view !== 'both')) return;
      if (this.highlightRects.col) this.hideHighlightRect('col');
      let minY = Infinity, maxY = -Infinity;
      let found = false;
      for (const rowCandKey of this.sortedCandidates) {
        const c = this.pieCellCoordinates[rowCandKey]?.[colCandKey];
        if (c && this.piePlacementGrid[rowCandKey]?.[colCandKey]) { minY = Math.min(minY, c.svg_y_abs); maxY = Math.max(maxY, c.svg_y_abs + this.CELL_SIZE); found = true; }
      }
      if (found) {
        const nr = makeElement('svg:rect', { x: colIndex_renderable * this.CELL_SIZE + this.SVG_EFFECTIVE_PADDING, y: minY, width: this.CELL_SIZE, height: maxY - minY, class: 'pmwHighlightRect pmwColHighlightRect' });
        nr._pmw_associated_key = colCandKey;
        this.highlightRects.col = nr;
        this.svgElement.append(nr);
      }
    }

  showWorstLossHighlight(loserCandKey, winnerCandKey) {
      if (this.highlightRects.worstLoss) this.hideHighlightRect('worstLoss');
      if (!this.svgElement || !winnerCandKey || !this.pieCellCoordinates[winnerCandKey]?.[loserCandKey] || !this.piePlacementGrid?.[winnerCandKey]?.[loserCandKey] || (this.options.view !== 'pies' && this.options.view !== 'both')) return;
      const c = this.pieCellCoordinates[winnerCandKey][loserCandKey];
      const nr = makeElement('svg:rect', { x: c.svg_x_abs - this.HIGHLIGHT_RECT_PADDING, y: c.svg_y_abs - this.HIGHLIGHT_RECT_PADDING, width: this.CELL_SIZE + this.HIGHLIGHT_RECT_PADDING * 2, height: this.CELL_SIZE + this.HIGHLIGHT_RECT_PADDING * 2, class: 'pmwHighlightRect pmwWorstLossHighlightRect' });
      nr._pmw_associated_key = `${winnerCandKey}_beats_${loserCandKey}`;
      this.highlightRects.worstLoss = nr;
      this.svgElement.append(nr);
    }

  hideHighlightRect(type) {
      const rectElement = this.highlightRects[type];
      if (rectElement) {
        if (rectElement.parentNode) rectElement.parentNode.removeChild(rectElement);
        else try { rectElement.remove(); } catch (e) {}
        this.highlightRects[type] = null;
      }
    }

  addPieCellPopupInteractivity() {
      if (!this.contentDiv || this.interactivePieElements.length === 0) return;
      let fadeOutTimeout;
      this.interactivePieElements.forEach((pieCell) => {
        const cellElement = pieCell.element;
        if (!cellElement) return;
        cellElement.addEventListener('mouseenter', () => {
          clearTimeout(fadeOutTimeout);
          this.popup.classList.remove('visible');
          this.showPopup(pieCell.winnerKey, pieCell.loserKey, pieCell.v1, pieCell.v2);
        });
        cellElement.addEventListener('mouseleave', () => {
          clearTimeout(fadeOutTimeout);
          if (this.popup && !this.popup.matches(':hover')) {
            this.popup.classList.remove('visible');
            this.popup.style.opacity = '0';
            this.hideHighlightRect('row'); this.hideHighlightRect('col'); this.hideHighlightRect('worstLoss');
          } else if (!this.popup) {
            this.hideHighlightRect('row'); this.hideHighlightRect('col'); this.hideHighlightRect('worstLoss');
          }
        });
      });
      if (this.popup) {
        this.popup.addEventListener('mouseenter', () => clearTimeout(fadeOutTimeout));
        this.popup.addEventListener('mouseleave', () => {
          fadeOutTimeout = setTimeout(() => {
            this.popup.classList.remove('visible');
            this.popup.style.opacity = '0';
            this.hideHighlightRect('row'); this.hideHighlightRect('col'); this.hideHighlightRect('worstLoss');
          }, 100);
        });
      }
    }

  createControlsElement() {
      const controlsPanel = makeElement('div', { class: 'pmwControlsPanelContent' });
      const viewModeOptions = [{ label: 'Pie Charts', value: 'pies' }, { label: 'Scores', value: 'scores' }, { label: 'Both', value: 'both' }];
      this.viewModeRadioGroup = this.createRadioGroup('pmwViewMode', 'Display:', viewModeOptions, this.options.view, (val) => {
        this.options.view = val; this.saveSettings(); this.renderContent();
      }, 'row');
      controlsPanel.append(this.viewModeRadioGroup);
      const pieContentOptions = [{ label: 'Numbers', value: 'numbers' }, { label: 'Percentages', value: 'percentages' }, { label: 'Hide Text', value: 'none' }];
      this.pieContentRadioGroup = this.createRadioGroup('pmwPieContentDisplay', 'Pie Content:', pieContentOptions, this.displayMode, (val) => {
        this.displayMode = val; this.saveSettings();
        if (this.options.view === 'pies' || this.options.view === 'both') this.renderContent();
      }, 'row');
      this.pieContentRadioGroup.classList.add('pmw-pie-content-group');
      controlsPanel.append(this.pieContentRadioGroup);
      return controlsPanel;
    }

  createRadioGroup(name, legendText, options, currentValue, onChangeCallback, layout = 'column') {
      const fieldset = makeElement('fieldset', { class: 'pmwRadioGroup' });
      fieldset.classList.add(`pmw-layout-${layout}`);
      if (legendText) fieldset.append(makeElement('legend', {}, legendText));
      const optionsWrapper = makeElement('div', { class: 'pmwRadioOptionsWrapper' });
      options.forEach((opt) => {
        const uniqueId = `pmwRadio_${name}_${opt.value}_${Math.random().toString(36).substring(2, 7)}`;
        const label = makeElement('label', { htmlFor: uniqueId });
        const radio = makeElement('input', { type: 'radio', name, value: opt.value, id: uniqueId, checked: opt.value === currentValue, onchange: () => onChangeCallback(opt.value) });
        label.append(radio, opt.label || opt.value);
        optionsWrapper.append(label);
      });
      fieldset.append(optionsWrapper);
      return fieldset;
    }

  updateControlStates() {
      if (this.viewModeRadioGroup) {
        this.viewModeRadioGroup.querySelectorAll(`input[name="pmwViewMode"]`).forEach(r => r.checked = r.value === this.options.view);
      }
      if (this.pieContentRadioGroup) {
        this.pieContentRadioGroup.querySelectorAll(`input[name="pmwPieContentDisplay"]`).forEach(r => r.checked = r.value === this.displayMode);
        this.pieContentRadioGroup.style.display = (this.options.view === 'pies' || this.options.view === 'both') ? 'flex' : 'none';
      }
    }

  showPopup(winnerKey, loserKey, vWinner, vLoser) {
      const nWinner = this.cand[winnerKey] || winnerKey;
      const nLoser = this.cand[loserKey] || loserKey;
      const tot = vWinner + vLoser;
      const winPct = tot ? ((vWinner / tot) * 100).toFixed(1) : '-';
      let leadText = vWinner === vLoser ? `Tie - ${this.fmt(vWinner)} votes each (${winPct}%)<br>of ${this.fmt(tot)} total` : `${nWinner} beats ${nLoser} (${this.fmt(vWinner)} to ${this.fmt(vLoser)})<br>with ${winPct}% of ${this.fmt(tot)} votes`;
      this.popup.innerHTML = `<div class="popupRow"><div class="popupCard"><div>${nWinner}</div><div>${this.fmt(vWinner)}</div></div><div class="popupCard"><div>${nLoser}</div><div>${this.fmt(vLoser)}</div></div></div><div class="popupLead">${leadText}</div>`;
      this.popup.style.visibility = 'hidden'; this.popup.style.opacity = '1'; this.popup.classList.add('visible');
      const popupHeight = this.popup.offsetHeight; const popupWidth = this.popup.offsetWidth;
      this.popup.style.visibility = 'visible'; this.popup.style.opacity = '0'; this.popup.classList.remove('visible');
      
      const hostRect = this.element.getBoundingClientRect();
      const viewportWidth = this.env && this.env.container ? this.env.container.clientWidth : window.innerWidth;
      const viewportHeight = this.env && this.env.container ? this.env.container.clientHeight : window.innerHeight;
      const margin = 10;
      let targetLeft = hostRect.left + this.popupOffset; let targetTop = hostRect.top + this.popupOffset;
      if (targetLeft + popupWidth + margin > viewportWidth) targetLeft = viewportWidth - popupWidth - margin;
      if (targetLeft < margin) targetLeft = margin;
      if (targetTop + popupHeight + margin > viewportHeight) targetTop = viewportHeight - popupHeight - margin;
      if (targetTop < margin) targetTop = margin;

      this.popup.style.position = 'fixed';
      this.popup.style.left = `${targetLeft}px`;
      this.popup.style.top = `${targetTop}px`;

      requestAnimationFrame(() => { this.popup.style.opacity = '1'; this.popup.classList.add('visible'); });
    }

  highlightPopupCell(winnerKey, loserKey, cellOverlayElement) {
    return;
    this.clearPopupHighlight(); // Clear previous popup-specific highlights
    if (cellOverlayElement) {
      cellOverlayElement.classList.add('cell-hovered');
    }
    // Highlight corresponding row and column names for the popup
    const rowLabelElement = this.rowLabelDivs[winnerKey];
    if (rowLabelElement) {
      rowLabelElement.classList.add('candidateHighlighted');
    }
    const colHeaderSpanElement = this.colLabelDivs[loserKey];
    if (colHeaderSpanElement) {
      colHeaderSpanElement.classList.add('candidateHighlighted');
    }
  }

  clearPopupHighlight() {
      this.interactivePieElements.forEach(pc => { if (pc.element) pc.element.classList.remove('cell-hovered'); });
      Object.values(this.rowLabelDivs).forEach(el => el.classList.remove('candidateHighlighted'));
      Object.values(this.colLabelDivs).forEach(el => el.classList.remove('candidateHighlighted'));
    }

  fmt(n) { return n.toLocaleString('en-US'); }

  injectCss() {
      applyCss(`
        .pmwHost { padding: ${this.CHART_PADDING}px; font-size: 12.5px; display: flex; flex-direction: column; gap: ${this.CHART_PADDING}px; background-color: transparent; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .pmwControlsContainer { padding: ${this.CHART_PADDING}px; border-radius: 3px; }
        .pmwControlsPanelContent { display: flex; flex-direction: row; flex-wrap: wrap; gap: 12px; align-items: center; }
        .pmwRadioGroup { border: none; padding:0; margin:0; display: flex; align-items: flex-start; }
        .pmw-pie-content-group { margin-left: 18px; }
        .pmwRadioGroup.pmw-layout-row .pmwRadioOptionsWrapper { flex-direction: row; gap: 8px; }
        .pmwRadioGroup.pmw-layout-column .pmwRadioOptionsWrapper { flex-direction: column; gap: 2px; }
        .pmwRadioGroup legend { font-weight: 500; font-size: 0.85em; margin-bottom: 4px; padding: 0; }
        .pmwRadioOptionsWrapper { display: flex; align-items: center; }
        .pmwRadioGroup label { display: flex; align-items: center; font-size: 0.8em; padding: 2px 0; cursor:pointer; white-space:nowrap; }
        .pmwRadioGroup input[type="radio"] { margin-right: 4px; width: 12px; height: 12px; position:relative; top:-1px;}
        .pmwRadioGroup input[type="radio"]:checked::before { content: ""; display: block; width: 6px; height: 6px; margin: 2px; background-color: #3498db; border-radius: 50%;}
        .pmwContentContainer { position: relative; }
        .pmwRowLabel, .pmwColLabelOuter, .pmwPieOverlay, .pmwScoreBarContainer, .pmwRightColTitle, .pmwRightColCell, .pmwScoreViewTitle { position: absolute; box-sizing: border-box; display: flex; align-items: center; justify-content: center; }
        .pmwInteractiveLabel { cursor: pointer; }
        .pmwRowLabel { font-size: ${this.FONT_SIZE_ROW_LABEL}; font-weight: 600; padding-left: ${this.CHART_PADDING}px; justify-content: flex-start; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pmwRowLabel.candidateHighlighted { color: #0056b3 !important; }
        .pmwColLabelOuter { align-items: flex-end; justify-content: flex-start; overflow: visible; }
        .pmwColLabelInner { transform: rotate(315deg); transform-origin: bottom left; white-space: nowrap; position: absolute; bottom: 2px; left: ${this.CELL_SIZE / 2 - 12}px; font-size: ${this.FONT_SIZE_COL_LABEL}; font-style: italic; }
        .pmwColLabelInner span { display: inline-block; padding-bottom: 1px; padding-right: 6px; border-bottom: 1px solid #999; max-width: ${this.COL_LABEL_TEXT_MAX_WIDTH}px; overflow: hidden; text-overflow: ellipsis; }
        .pmwColLabelInner span.candidateHighlighted { color: #0056b3 !important; border-bottom-color: #0056b3 !important; }
        .pmwScoreViewTitle { font-size: 0.95em; font-weight: 500; justify-content: flex-start; padding-left: ${this.CHART_PADDING}px; }
        .pmwMainSvgCanvas { z-index: 3; overflow: visible !important; }
        svg.pmwMainSvgCanvas path.winsSlice  { fill:#90d098; stroke:#2a8533; } 
        svg.pmwMainSvgCanvas path.lossSlice  { fill:#f0a6a6; stroke:#d03325; } 
        svg.pmwMainSvgCanvas path.tieSlice   { fill:#c8c8c8; stroke:#999999; } 
        svg.pmwMainSvgCanvas circle.emptyPie { fill:#e8ecf0; stroke:#b0b8c0; } 
        svg.pmwMainSvgCanvas circle.winsSlice{ fill:#90d098; stroke:#2a8533; }
        svg.pmwMainSvgCanvas circle.lossSlice{ fill:#f0a6a6; stroke:#d03325; }
        svg.pmwMainSvgCanvas circle.tieSlice { fill:#c8c8c8; stroke:#999999; }
        .pmwPieOverlay { cursor: default; border: 1px solid transparent; border-radius: 3px; z-index: 5; }
        .pmwPieOverlay.cell-hovered { box-shadow:0 0 6px rgba(0,100,220,.45); border-color: #0066cc; background-color: rgba(230, 240, 255, 0.1); }
        .pmwPieValueBox { display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; height:100%; pointer-events: none; } 
        .pmwPieValueBox .value-line { font-weight:bold; color:#ffffff; text-shadow: 0px 1px 2px rgb(0,0,0); line-height:1.05; font-size: ${this.FONT_SIZE_PIE_OVERLAY}; }
        .pmwScoreBarContainer { border-radius: 3px; overflow: hidden; display: flex; justify-content: flex-start; z-index: 1; }
        .pmwScoreBarContainer.both-mode-bar-container { background-color: transparent; }
        .pmwScoreBar { height: 100%; background-color: #4CAF50; border-radius: 2px; transition: width 0.3s ease-out; }
        .pmwScoreBar.both-mode-score-fill { background-color: #FFC300; border: 1px solid #333333; box-sizing: border-box; }
        .pmwScoreTextOnBar { position: absolute; top: 50%; transform: translateY(-50%); left: 5px; font-size: ${this.FONT_SIZE_SCORE_TEXT_ON_BAR}; color: white; text-shadow: 0px 1px 1px rgba(0,0,0,0.4); line-height:1; white-space: nowrap; pointer-events: none; z-index: 2; }
        .pmwScoreBarContainer.scores-mode-bar-container .pmwScoreBar[style*="width: 0%"] + .pmwScoreTextOnBar, .pmwScoreBarContainer.scores-mode-bar-container .pmwScoreBar[style*="width: 15%"] + .pmwScoreTextOnBar { color: #333; left: auto; right: -30px; text-shadow: none; width: 28px; }
        .pmwRightColTitle { font-size: 0.75em; font-weight: 500; padding: 0 ${this.CHART_PADDING / 2.5}px; align-items: center; padding-bottom: 0px; justify-content: center; text-align: center; line-height: 1.2; border-left: 1px solid #d8dfe5;}
        .pmwRightColCell { flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 0 ${this.CHART_PADDING / 2.5}px; border-left: 1px solid #d8dfe5; line-height: 1.1; }
        .pmwRightColNumber { font-size: ${this.FONT_SIZE_PW_WINS_NUM}; font-weight: 500; }
        .pmwRightColLabel { font-size: ${this.FONT_SIZE_PW_WINS_TEXT}; margin-top: 0px; }
        .pmwPwWinsNumber { color: #127a88; }
        .pmwScoreNumberInCol { color: #0056b3; }
        .pmwWorstLossCell { align-items: flex-start; text-align: left; padding-left: 5px; }
        .pmwWorstLossMargin { font-size: ${this.FONT_SIZE_WORST_LOSS_TEXT}; font-weight: 500; color: #c0392b; }
        .pmwWorstLossMargin:not(:empty)::after { content: " "; }
        .pmwWorstLossCell div:first-child:empty + div.pmwWorstLossOpponent { margin-top: 0; }
        .pmwWorstLossCell div.pmwWorstLossMargin:only-child { text-align: center; width: 100%;}
        .pmwWorstLossOpponent { font-size: calc(${this.FONT_SIZE_WORST_LOSS_TEXT} * 0.85); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
        .pmwHighlightRect { fill-opacity: 0.15; stroke-width: 1.5px; pointer-events: none; rx: 3px; ry: 3px; z-index: 4; }
        .pmwRowHighlightRect { fill: #28a745; stroke: #1e7e34; }
        .pmwColHighlightRect { fill: #dc3545; stroke: #b02a37; }
        .pmwWorstLossHighlightRect { fill: #007bff; stroke: #0056b3; }
        .pmwCenteredMessage { padding: 15px; font-size: 0.9em; text-align: center; width: 100%; }
        .pairwisePopup { position:fixed; pointer-events:none; background:rgba(30,30,30,.97); border-radius:6px; box-shadow:0 3px 10px rgba(0,0,0,.5); padding:8px 12px; max-width:300px; font-size:12px; color:#fafafa; opacity:0; transition:opacity .15s ease, transform .15s ease; z-index:10000; border: 1px solid rgba(255,255,255,0.07); transform: translateY(7px); }
        .pairwisePopup.visible { opacity: 1; transform: translateY(0); }
        .popupRow { display:flex; gap:7px; margin-bottom: 6px; }
        .popupCard { flex:1; background:#505050; border-radius:3px; text-align:center; padding:6px 8px; box-shadow: inset 0 0 2px rgba(0,0,0,0.1); }
        .popupCard div:first-child  { font-weight:bold; margin-bottom:1px; font-size: 0.95em; }
        .popupLead { margin-top:7px; text-align:center; font-weight:normal; line-height:1.4; font-size: 0.85em; }
      `, 'pmwCoreStylesNewLayout');
    }

  loadSettings() {
      if (!this.options.useLocalStorage) return;
      const defaults = { view: 'scores', displayMode: 'none' };
      try {
        const storedSettings = localStorage.getItem('pmwSettings');
        if (storedSettings) {
          const parsed = JSON.parse(storedSettings);
          this.options.view = parsed.view || defaults.view;
          this.displayMode = parsed.displayMode || defaults.displayMode;
        }
      } catch (e) {}
    }

  saveSettings() {
      try {
        localStorage.setItem('pmwSettings', JSON.stringify({ view: this.options.view, displayMode: this.displayMode }));
      } catch (e) {}
    }

  destroy() {
      if (this._handleKeydown) {
          window.removeEventListener('keydown', this._handleKeydown);
      }
      if (this.popup) {
          this.popup.remove();
      }
    }

} // End of PairwiseMatrixWidget class