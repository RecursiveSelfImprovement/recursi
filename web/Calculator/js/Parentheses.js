class Parentheses {
  /**
   * Counts the number of opening and closing parentheses needed to balance an expression.
   * @param {string} expression - The mathematical expression to analyze.
   * @returns {Object} An object with named properties: { left: number, right: number }
   */
  static countParentheses(expression) {
    let balance = 0;
    let minBalance = 0;

    for (let char of expression) {
      if (char === '(') balance++;
      if (char === ')') balance--;
      minBalance = Math.min(minBalance, balance);
    }

    return {
      left: Math.abs(minBalance), // Opening parentheses needed at the start
      right: balance - minBalance, // Closing parentheses needed at the end
    };
  }
}

