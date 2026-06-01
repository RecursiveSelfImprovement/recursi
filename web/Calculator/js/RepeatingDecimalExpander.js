class RepeatingDecimalExpander {
  /**
   * Finds the longest repeating block ending the decimal part.
   */
  static findLargestRepeatingBlock(decimalPart) {
    for (
      let blockSize = Math.floor(decimalPart.length / 2);
      blockSize >= 1;
      blockSize--
    ) {
      const block = decimalPart.slice(-blockSize);
      const prevBlockStart = decimalPart.length - blockSize * 2;
      if (prevBlockStart >= 0) {
        const prevBlock = decimalPart.slice(
          prevBlockStart,
          prevBlockStart + blockSize
        );
        if (prevBlock === block) {
          return block;
        }
      }
    }
    return null;
  }

  /**
   * Expands repeating decimal notations within an expression string.
   */
  static expand(expression, places = 17) {
    const repeatingPattern = /(\d*\.\d+)(\.{3})/g;
    const expandMatch = (match, numberPart) => {
      const [integerPart = '0', decimalPart] = numberPart.split('.');
      if (!decimalPart) {
        return match;
      }
      const repeatingBlock = this.findLargestRepeatingBlock(decimalPart);
      if (!repeatingBlock) {
        return match;
      }
      const nonRepeatingPart = decimalPart.slice(
        0,
        decimalPart.length - repeatingBlock.length
      );
      let expandedDecimal = nonRepeatingPart;
      while (expandedDecimal.length < places) {
        expandedDecimal += repeatingBlock;
      }
      expandedDecimal = expandedDecimal.slice(0, places);
      return `${integerPart}.${expandedDecimal}`;
    };
    return expression.replace(repeatingPattern, expandMatch);
  }
}

