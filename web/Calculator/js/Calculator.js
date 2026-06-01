class Calculator {
  // Replace old constructor with a stub so it doesn't break backwards compatibility if instantiated directly
    constructor() {}

  injectStyles() {
    const css = `
      :root {
        --calc-bg-color: #121212;
        --calc-text-color: #e0e0e0;
        --calc-primary: #bb86fc;
        --calc-primary-variant: #3700b3;
        --calc-secondary: #03dac6;
        --calc-error: #cf6679;
        --calc-surface: #1e1e1e;
        --calc-border-radius: 8px;
        --calc-padding: 1rem;
      }

      .calculator-container {
        width: 100%;
        padding: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        box-sizing: border-box;
        font-family: 'Roboto Mono', monospace, system-ui, sans-serif;
        color: var(--calc-text-color);
      }

      .calculator {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        width: 100%;
      }

      .input-container {
        position: relative;
        margin-bottom: 0.5rem;
        display: flex;
        justify-content: center;
        width: 100%;
      }

      .parentheses-container {
        position: absolute;
        pointer-events: none;
        z-index: 2;
        color: var(--calc-primary);
        opacity: 0.7;
        display: flex;
        flex-direction: column;
        align-items: center;
        top: var(--calc-padding);
        height: calc(100% - 2 * var(--calc-padding));
        justify-content: center;
        width: 2rem;
      }

      .opening-parens-container { left: -0.5rem; }
      .closing-parens-container { right: -0.5rem; }

      .paren {
        font-size: 1.5rem;
        line-height: 1.2;
        width: 1.5rem;
        display: inline-block;
        text-align: center;
      }

      #expression {
        width: 90%; 
        min-height: 80px;
        padding: var(--calc-padding);
        font-size: 1.4rem;
        background-color: var(--calc-surface);
        border: 1px solid var(--calc-primary-variant);
        border-radius: var(--calc-border-radius);
        color: var(--calc-text-color);
        resize: vertical;
        overflow: auto;
        box-sizing: border-box;
        font-family: inherit;
        caret-color: var(--calc-secondary);
        transition: border-color 0.2s, box-shadow 0.2s;
      }

      #expression:focus {
        outline: none;
        border-color: var(--calc-primary);
        box-shadow: 0 0 0 2px rgba(187, 134, 252, 0.2);
      }

      .result-container {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 0;
        width: 100%;
      }

      .decimal-result {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.8rem;
        background-color: var(--calc-surface);
        border-radius: var(--calc-border-radius);
        border: 1px solid var(--calc-primary-variant);
        min-height: 3em;
      }

      .result-label {
        color: var(--calc-secondary);
        white-space: nowrap;
        margin-right: 0.5rem;
      }

      #decimal-value {
        font-size: 1.4rem;
        font-weight: bold;
        overflow-x: auto;
        text-align: right;
        flex-grow: 1;
        margin-left: 1rem;
        margin-right: 1rem;
      }

      #copy-btn {
        background-color: var(--calc-primary);
        color: #121212;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: var(--calc-border-radius);
        cursor: pointer;
        font-family: inherit;
        font-weight: bold;
        transition: all 0.2s;
        flex-shrink: 0;
      }

      #copy-btn:hover {
        background-color: var(--calc-secondary);
      }

      /* Fraction Section */
      .fraction-section {
        background-color: var(--calc-surface);
        border-radius: var(--calc-border-radius);
        border: 1px solid var(--calc-primary-variant);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .fraction-toggle-area {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem var(--calc-padding);
        cursor: pointer;
        border-bottom: 1px solid transparent;
        transition: border-color 0.3s ease;
      }

      .fraction-section.open .fraction-toggle-area {
         border-bottom-color: var(--calc-primary-variant);
      }

      .fraction-toggle-label {
        color: var(--calc-secondary);
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-grow: 1;
        user-select: none;
      }
      
      .fraction-toggle-label::after {
        content: '▶';
        display: inline-block;
        margin-left: auto;
        transition: transform 0.3s ease;
        color: var(--calc-primary);
        font-size: 0.8em;
      }
      
      .fraction-section.open .fraction-toggle-label::after {
        transform: rotate(90deg);
      }

      .fraction-content {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.4s ease-out;
        padding: 0 var(--calc-padding);
      }

      .fraction-section.open .fraction-content {
        max-height: 500px;
        padding: var(--calc-padding);
        border-top: 1px solid var(--calc-primary-variant);
        margin-top: -1px;
      }

      .fraction-display {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
        min-height: 3rem;
      }

      .fraction {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        line-height: 1;
        margin-left: 0.5rem;
      }

      .whole-number {
        font-size: 1.5rem;
        display: inline-block;
        margin-right: 0.25rem;
      }

      .numerator {
        font-size: 1.5rem;
        border-bottom: 2px solid var(--calc-primary);
        padding: 0 0.5rem;
      }

      .denominator {
        font-size: 1.5rem;
        padding: 0 0.5rem;
      }

      .fraction-controls {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        align-items: center;
        justify-content: center;
      }

      .fraction-settings {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        align-items: center;
      }

      .fraction-settings label {
          color: var(--calc-text-color);
          font-size: 0.8rem;
      }

      .fraction-settings input[type="number"] {
        padding: 0.4rem;
        background-color: var(--calc-bg-color);
        border: 1px solid var(--calc-primary-variant);
        border-radius: var(--calc-border-radius);
        color: var(--calc-text-color);
        font-family: inherit;
        font-size: 0.8rem;
        width: 80px;
      }
      
      #tolerance { width: 120px; }

      .status {
        height: 1.2rem;
        margin-top: 0;
        font-size: 0.8rem;
        text-align: right;
        color: var(--calc-primary);
        opacity: 0.8;
      }

      .status.error {
        color: var(--calc-error) !important;
        opacity: 1;
      }
    `;
    applyCss(css, 'calculator-styles');
  }

  initUI() {
    this.root.innerHTML = '';
    this.root.appendChild(
      makeElement('div', { className: 'calculator-container' }, [
        // Title is handled by DialogBox
        [
          'div',
          { className: 'calculator' },
          [
            [
              'div',
              { className: 'input-container' },
              [
                [
                  'div',
                  {
                    className: 'parentheses-container opening-parens-container',
                    id: 'opening-parens',
                  },
                ],
                [
                  'textarea',
                  {
                    id: 'expression',
                    placeholder: 'Type expression...',
                    autofocus: true,
                    rows: 3,
                  },
                ],
                [
                  'div',
                  {
                    className: 'parentheses-container closing-parens-container',
                    id: 'closing-parens',
                  },
                ],
              ],
            ],
            ['div', { className: 'status', id: 'status' }],
            [
              'div',
              { className: 'result-container' },
              [
                [
                  'div',
                  { className: 'decimal-result' },
                  [
                    ['span', { className: 'result-label' }, 'Result:'],
                    [
                      'span',
                      {
                        id: 'decimal-value',
                        style: {
                          overflowWrap: 'break-word',
                          wordBreak: 'break-all',
                          flexGrow: 1,
                          textAlign: 'right',
                          marginLeft: '1rem',
                        },
                      },
                      '-',
                    ],
                    ['button', { id: 'copy-btn' }, 'Copy'],
                  ],
                ],
                [
                  'div',
                  {
                    className: `fraction-section ${
                      this.showFractions ? 'open' : ''
                    }`,
                    id: 'fraction-section',
                  },
                  [
                    [
                      'div',
                      {
                        className: 'fraction-toggle-area',
                        id: 'fraction-toggle',
                      },
                      [
                        [
                          'label',
                          {
                            className: 'fraction-toggle-label',
                            htmlFor: 'fraction-toggle-checkbox',
                          },
                          [
                            [
                              'input',
                              {
                                type: 'checkbox',
                                id: 'fraction-toggle-checkbox',
                                style: { display: 'none' },
                                checked: this.showFractions,
                              },
                            ],
                            'Fraction Approximation',
                          ],
                        ],
                      ],
                    ],
                    [
                      'div',
                      { className: 'fraction-content' },
                      [
                        [
                          'div',
                          {
                            className: 'fraction-display',
                            id: 'fraction-display',
                          },
                        ],
                        [
                          'div',
                          { className: 'fraction-controls' },
                          [
                            [
                              'div',
                              { className: 'fraction-settings' },
                              [
                                ['label', { htmlFor: 'tolerance' }, 'Tol:'],
                                [
                                  'input',
                                  {
                                    type: 'number',
                                    id: 'tolerance',
                                    step: 'any',
                                    min: '0',
                                    placeholder: 'e.g., 1e-12',
                                  },
                                ],
                                [
                                  'label',
                                  { htmlFor: 'max-denominator' },
                                  'Max Den:',
                                ],
                                [
                                  'input',
                                  {
                                    type: 'number',
                                    id: 'max-denominator',
                                    min: '1',
                                    step: '1',
                                    placeholder: 'e.g., 500k',
                                  },
                                ],
                              ],
                            ],
                          ],
                        ],
                      ],
                    ],
                  ],
                ],
              ],
            ],
          ],
        ],
      ])
    );

    this.expressionInput = this.root.querySelector('#expression');
    this.decimalValue = this.root.querySelector('#decimal-value');
    this.copyButton = this.root.querySelector('#copy-btn');
    this.statusDisplay = this.root.querySelector('#status');
    this.openingParens = this.root.querySelector('#opening-parens');
    this.closingParens = this.root.querySelector('#closing-parens');
    this.fractionSection = this.root.querySelector('#fraction-section');
    this.fractionToggleArea = this.root.querySelector('#fraction-toggle');
    this.fractionToggleCheckbox = this.root.querySelector(
      '#fraction-toggle-checkbox'
    );
    this.fractionDisplay = this.root.querySelector('#fraction-display');
    this.toleranceInput = this.root.querySelector('#tolerance');
    this.maxDenominatorInput = this.root.querySelector('#max-denominator');
  }

  setupEventListeners() {
    this.expressionInput.addEventListener('input', (e) =>
      this.handleExpressionInput(e)
    );
    this.copyButton.addEventListener('click', () => this.copyResult());
    this.fractionToggleArea.addEventListener('click', () => {
      this.fractionToggleCheckbox.checked =
        !this.fractionToggleCheckbox.checked;
      this.fractionToggleCheckbox.dispatchEvent(new Event('change'));
    });
    this.fractionToggleCheckbox.addEventListener('change', () => {
      this.showFractions = this.fractionToggleCheckbox.checked;
      this.fractionSection.classList.toggle('open', this.showFractions);
      if (
        this.showFractions &&
        typeof this._lastNumericResult === 'number' &&
        isFinite(this._lastNumericResult)
      ) {
        this.checkFractionApproximation(this._lastNumericResult);
      }
    });
    this.toleranceInput.addEventListener('input', () =>
      this.debouncedEvaluate()
    );
    this.maxDenominatorInput.addEventListener('input', () =>
      this.debouncedEvaluate()
    );
  }

  handleExpressionInput(e) {
    let input = e.target.value;
    if (input === this.prevInput) return;
    this.prevInput = input;
    this.debouncedEvaluate();
  }

  debouncedEvaluate() {
    clearTimeout(this.evaluationTimer);
    const debounceDelay = 300;
    this.evaluationTimer = setTimeout(() => {
      this.evaluateExpression();
    }, debounceDelay);
  }

  evaluateExpression() {
    const currentInput = this.expressionInput.value;
    let expandedInput;
    try {
      expandedInput = RepeatingDecimalExpander.expand(currentInput);
    } catch (expansionError) {
      expandedInput = currentInput;
      this.statusDisplay.textContent = 'Warning: Error expanding decimals.';
      this.statusDisplay.className = 'status error';
    }
    const cleanedInputForEval = expandedInput.replace(/\s+/g, '');
    try {
      const { left, right } = Parentheses.countParentheses(currentInput);
      this.updateParenthesesIndicators({ left, right });
    } catch (e) {}

    try {
      if (!cleanedInputForEval) {
        this.decimalValue.textContent = '-';
        this.statusDisplay.textContent = '';
        this.statusDisplay.className = 'status';
        this.fractionDisplay.innerHTML = '';
        this._lastNumericResult = null;
        return;
      }
      const result = this.safeEvaluate(cleanedInputForEval);
      this._lastNumericResult = result;
      const patternInfo = RepeatingDecimal.findRepeatingPattern(result);
      if (patternInfo.repeating) {
        let displayString = patternInfo.nonRepeating;
        if (!displayString.includes('.') && patternInfo.repeating) {
          displayString += '.';
        }
        displayString += `${patternInfo.repeating}${patternInfo.repeating}...`;
        this.decimalValue.textContent = displayString;
      } else {
        this.decimalValue.textContent = patternInfo.nonRepeating;
      }
      if (!this.statusDisplay.textContent.startsWith('Warning')) {
        this.statusDisplay.textContent = 'Calculation successful';
        this.statusDisplay.className = 'status';
      }
      if (typeof result === 'number' && isFinite(result)) {
        this.checkFractionApproximation(result);
      } else {
        this.fractionDisplay.innerHTML = '';
      }
    } catch (error) {
      this.decimalValue.textContent = '-';
      this.statusDisplay.textContent = `Error: ${error.message}`;
      this.statusDisplay.className = 'status error';
      this.fractionDisplay.innerHTML = '';
      this._lastNumericResult = null;
    }
  }

  checkFractionApproximation(value) {
    if (!this.showFractions) return;

    if (typeof value !== 'number' || !isFinite(value)) {
      this.fractionDisplay.innerHTML = '';
      return;
    }
    const tolerance = Number(this.toleranceInput.value);
    const maxDenominator = Number(this.maxDenominatorInput.value);
    if (
      isNaN(tolerance) ||
      tolerance <= 0 ||
      isNaN(maxDenominator) ||
      maxDenominator < 1 ||
      !Number.isInteger(maxDenominator)
    ) {
      this.fractionDisplay.innerHTML =
        '<span style="font-style: italic; opacity: 0.7;">Invalid Settings</span>';
      return;
    }
    Fractions.approximateFraction({
      value,
      tolerance,
      maxDenominator,
      callback: (fraction) => this.displayFractionResult(fraction, value),
    });
  }

  updateParenthesesIndicators({ left, right }) {
    this.openingParens.innerHTML = '';
    this.closingParens.innerHTML = '';
    const maxDisplay = 4;
    for (let i = 0; i < Math.min(left, maxDisplay); i++) {
      this.openingParens.appendChild(
        makeElement('div', { className: 'paren' }, '(')
      );
    }
    if (left > maxDisplay) {
      this.openingParens.appendChild(
        makeElement(
          'div',
          { className: 'paren', style: { opacity: 0.6, fontStyle: 'italic' } },
          `+${left - maxDisplay}`
        )
      );
    }
    for (let i = 0; i < Math.min(right, maxDisplay); i++) {
      this.closingParens.appendChild(
        makeElement('div', { className: 'paren' }, ')')
      );
    }
    if (right > maxDisplay) {
      this.closingParens.appendChild(
        makeElement(
          'div',
          { className: 'paren', style: { opacity: 0.6, fontStyle: 'italic' } },
          `+${right - maxDisplay}`
        )
      );
    }
  }

  safeEvaluate(expr) {
    expr = expr.replace(/×/g, '*').replace(/÷/g, '/');
    expr = expr
      .replace(/(\d)\(/g, '$1*(')
      .replace(/\)(\d)/g, ')*$1')
      .replace(/\)\(/g, ')*(');
    if (!/^[0-9+\-*/.()]+$/.test(expr)) {
      if (expr.includes('...'))
        throw new Error('Invalid syntax: Unexpanded "..." found.');
      throw new Error('Invalid characters found');
    }
    if (/(?<![eE])[+\-*/]{2,}/.test(expr)) {
      throw new Error('Consecutive operators detected');
    }
    const { left, right } = Parentheses.countParentheses(expr);
    const balancedExpr = '('.repeat(left) + expr + ')'.repeat(right);
    const trimmedBalanced = balancedExpr.trim();
    if (/[+*/]$/.test(trimmedBalanced) || /^[+*/]/.test(trimmedBalanced)) {
      throw new Error('Expression starts or ends with an invalid operator');
    }
    if (/\([+*/]/.test(trimmedBalanced) || /[+\-*/]\)/.test(trimmedBalanced)) {
      if (!/\(-\d/.test(trimmedBalanced)) {
        throw new Error('Operator adjacent to parenthesis');
      }
    }
    try {
      const result = new Function(`"use strict"; return (${balancedExpr});`)();
      if (typeof result !== 'number') throw new Error('Result is not a number');
      if (isNaN(result)) throw new Error('Result is NaN');
      return result;
    } catch (e) {
      throw new Error(
        e instanceof SyntaxError ? `Syntax error` : `Calculation error`
      );
    }
  }

  displayFractionResult(fraction, originalValue) {
    this.fractionDisplay.innerHTML = '';
    if (!fraction) {
      this.fractionDisplay.appendChild(
        makeElement(
          'span',
          { style: { fontStyle: 'italic', opacity: 0.7 } },
          'No approx. found'
        )
      );
      return;
    }
    const sign = originalValue < 0 ? -1 : 1;
    const approxNumerator = Math.abs(fraction.numerator);
    const approxDenominator = Math.abs(fraction.denominator);
    const approxAbsValue = approxNumerator / approxDenominator;
    let wholeNumber = Math.floor(approxAbsValue);
    let num = approxNumerator % approxDenominator;
    let signStr = sign < 0 && (wholeNumber !== 0 || num !== 0) ? '-' : '';
    if (wholeNumber !== 0 || num === 0) {
      this.fractionDisplay.appendChild(
        makeElement(
          'span',
          { className: 'whole-number' },
          `${signStr}${wholeNumber}`
        )
      );
      signStr = '';
    }
    if (num !== 0) {
      const fractionEl = makeElement('div', { className: 'fraction' }, [
        ['div', { className: 'numerator' }, `${signStr}${num}`],
        ['div', { className: 'denominator' }, approxDenominator.toString()],
      ]);
      if (wholeNumber !== 0) {
        fractionEl.style.marginLeft = '0.25rem';
      }
      this.fractionDisplay.appendChild(fractionEl);
    }
    if (
      this.fractionDisplay.innerHTML === '' &&
      wholeNumber === 0 &&
      num === 0
    ) {
      this.fractionDisplay.appendChild(
        makeElement('span', { className: 'whole-number' }, '0')
      );
    }
  }

  copyResult() {
    const resultText = this.decimalValue.textContent;
    if (resultText && resultText !== '-') {
      navigator.clipboard
        .writeText(resultText)
        .then(() => {
          this.copyButton.textContent = 'Copied!';
          this.copyButton.style.backgroundColor = 'var(--calc-secondary)';
          setTimeout(() => {
            if (this.copyButton) {
              this.copyButton.textContent = 'Copy';
              this.copyButton.style.backgroundColor = '';
            }
          }, 1500);
        })
        .catch((err) => {
          this.copyButton.textContent = 'Error';
          this.copyButton.style.backgroundColor = 'var(--calc-error)';
          setTimeout(() => {
            if (this.copyButton) {
              this.copyButton.textContent = 'Copy';
              this.copyButton.style.backgroundColor = '';
            }
          }, 2000);
        });
    }
  }

  async run(env) {
      this.env = env;
      this.rootElement = env.container;
      this.rootElement.style.cssText = "position: relative; width: 100%; height: 100%; overflow: hidden; background: #121212;";
      
      this.lastEvaluationTime = 0;
      this.evaluationTimer = null;
      this.prevInput = '';
      this.showFractions = true;
      this._lastNumericResult = null;

      this.injectStyles();

      this.dialog = UITools.makeDialog({
        env: this.env,
        title: 'Smart Calculator',
        width: '450px',
        height: 'auto',
        position: [40, 40],
        transparent: false,
        onClose: () => this.destroy()
      });

      this.root = this.dialog.contentElement;
      
      this.initUI();
      Fractions.initWorker();
      this.setupEventListeners();

      if (this.toleranceInput) this.toleranceInput.value = '0.0000000000001';
      if (this.maxDenominatorInput) this.maxDenominatorInput.value = '500000';

      return this;
    }

  destroy() {
      if (this.evaluationTimer) clearTimeout(this.evaluationTimer);
      if (Fractions.worker) {
        Fractions.worker.terminate();
        Fractions.worker = null;
      }
      if (this.dialog) {
        this.dialog.close();
        this.dialog = null;
      }
      if (this.rootElement) this.rootElement.innerHTML = '';
    }
}
