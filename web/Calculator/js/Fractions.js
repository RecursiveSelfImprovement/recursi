class Fractions {
  static worker = null;

  /**
   * Initializes the web worker for fraction approximation.
   * Must be called before approximating fractions if using workers.
   */
  static initWorker() {
    if (window.Worker) {
      const workerCode = `
        function findFractionApproximation(value, tolerance, maxDenominator) {
          // This algorithm uses the Stern-Brocot tree / continued fractions concept
          // to find the best rational approximation.
          let n = Math.floor(value);
          value -= n;
          if (value < tolerance) {
              return { numerator: n, denominator: 1 };
          }
          if (1 - value < tolerance) {
              return { numerator: n + 1, denominator: 1 };
          }

          let lower_n = 0;
          let lower_d = 1;
          let upper_n = 1;
          let upper_d = 1;

          while (true) {
              let middle_n = lower_n + upper_n;
              let middle_d = lower_d + upper_d;

              if (middle_d > maxDenominator) {
                  break;
              }

              if (value === middle_n / middle_d) {
                  if (middle_d <= maxDenominator) {
                      return { numerator: n * middle_d + middle_n, denominator: middle_d };
                  } else {
                      break;
                  }
              } else if (value > middle_n / middle_d) {
                  lower_n = middle_n;
                  lower_d = middle_d;
              } else {
                  upper_n = middle_n;
                  upper_d = middle_d;
              }
          }

          const lower_err = Math.abs(value - lower_n / lower_d);
          const upper_err = Math.abs(value - upper_n / upper_d);
          
          if (lower_d <= maxDenominator && upper_d > maxDenominator) {
             return { numerator: n * lower_d + lower_n, denominator: lower_d };
          } else if (upper_d <= maxDenominator && lower_d > maxDenominator) {
             return { numerator: n * upper_d + upper_n, denominator: upper_d };
          } else if (lower_err <= upper_err) {
             return { numerator: n * lower_d + lower_n, denominator: lower_d };
          } else {
             return { numerator: n * upper_d + upper_n, denominator: upper_d };
          }
        }

        self.onmessage = function(e) {
          const { value, tolerance, maxDenominator } = e.data;
          // Ensure the sign is handled correctly by working with absolute value
          const sign = value < 0 ? -1 : 1;
          const absValue = Math.abs(value);
          const fraction = findFractionApproximation(absValue, tolerance, maxDenominator);
          
          if (fraction) {
            fraction.numerator *= sign;
          }
          
          postMessage(fraction);
        };
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
    }
  }

  /**
   * Approximates a decimal value as a fraction using a worker or fallback.
   * @param {Object} params - Parameters for the approximation.
   * @param {number} params.value - The decimal value to approximate.
   * @param {number} params.tolerance - The acceptable error margin.
   * @param {number} params.maxDenominator - The maximum denominator allowed.
   * @param {Function} params.callback - Called with the result: { numerator, denominator } or null.
   */
  static approximateFraction({ value, tolerance, maxDenominator, callback }) {
    if (this.worker) {
      this.worker.onmessage = (e) => callback(e.data);
      this.worker.postMessage({ value, tolerance, maxDenominator });
    } else {
      // Fallback logic in case worker isn't initialized or supported
      console.warn(
        'Fraction approximation worker not running. Using fallback.'
      );
      const sign = value < 0 ? -1 : 1;
      const absValue = Math.abs(value);
      const fraction = this.findFractionApproximation(
        absValue,
        tolerance,
        maxDenominator
      );
      if (fraction) {
        fraction.numerator *= sign;
      }
      callback(fraction);
    }
  }

  /**
   * Fallback function to find a fraction approximation. (Worker code copy)
   * This is a simplified version of the logic inside the worker for direct use.
   */
  static findFractionApproximation(value, tolerance, maxDenominator) {
    // This algorithm uses the Stern-Brocot tree / continued fractions concept
    // to find the best rational approximation.
    let n = Math.floor(value);
    value -= n;
    if (value < tolerance) {
      return { numerator: n, denominator: 1 };
    }
    if (1 - value < tolerance) {
      return { numerator: n + 1, denominator: 1 };
    }

    let lower_n = 0;
    let lower_d = 1;
    let upper_n = 1;
    let upper_d = 1;

    while (true) {
      let middle_n = lower_n + upper_n;
      let middle_d = lower_d + upper_d;

      if (middle_d > maxDenominator) {
        break;
      }

      if (value === middle_n / middle_d) {
        if (middle_d <= maxDenominator) {
          return { numerator: n * middle_d + middle_n, denominator: middle_d };
        } else {
          break;
        }
      } else if (value > middle_n / middle_d) {
        lower_n = middle_n;
        lower_d = middle_d;
      } else {
        upper_n = middle_n;
        upper_d = middle_d;
      }
    }

    const lower_err = Math.abs(value - lower_n / lower_d);
    const upper_err = Math.abs(value - upper_n / upper_d);

    if (lower_d <= maxDenominator && upper_d > maxDenominator) {
      return { numerator: n * lower_d + lower_n, denominator: lower_d };
    } else if (upper_d <= maxDenominator && lower_d > maxDenominator) {
      return { numerator: n * upper_d + upper_n, denominator: upper_d };
    } else if (lower_err <= upper_err) {
      return { numerator: n * lower_d + lower_n, denominator: lower_d };
    } else {
      return { numerator: n * upper_d + upper_n, denominator: upper_d };
    }
  }
}

