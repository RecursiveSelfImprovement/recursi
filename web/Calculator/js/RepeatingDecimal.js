class RepeatingDecimal {
  /**
   * Tries to find a repeating pattern in the fractional part of a number.
   * @param {number} number - The number to analyze.
   * @returns {object} An object { nonRepeating: string, repeating: string|null }.
   */
  static findRepeatingPattern(number) {
    if (typeof number !== 'number' || !isFinite(number)) {
      return { nonRepeating: String(number), repeating: null };
    }

    const str = number.toString();
    const parts = str.split('.');
    const integerPart = parts[0] || '0';
    const fractionalPart = parts[1] || '';

    const minLengthForCheck = 6;
    if (fractionalPart.length < minLengthForCheck) {
      return { nonRepeating: str, repeating: null };
    }

    const trimmedFractional = fractionalPart.slice(0, -1);

    if (trimmedFractional.length < minLengthForCheck) {
      return { nonRepeating: str, repeating: null };
    }

    function checkRepeats(text, pattern) {
      if (!pattern || !text) return 0;
      let temp = text;
      let fullRepeats = 0;
      while (temp.startsWith(pattern)) {
        temp = temp.substring(pattern.length);
        fullRepeats++;
      }

      let partialMatchLength = 0;
      if (temp.length > 0 && pattern.startsWith(temp)) {
        partialMatchLength = temp.length;
      }
      const totalMatchedLength =
        fullRepeats * pattern.length + partialMatchLength;

      const minRepeatMatchLength = 6;
      if (
        (fullRepeats >= 2 || (fullRepeats === 1 && partialMatchLength > 0)) &&
        totalMatchedLength >= minRepeatMatchLength
      ) {
        return totalMatchedLength;
      }
      return 0;
    }

    for (let i = 0; i < trimmedFractional.length; i++) {
      for (
        let k = 1;
        k <= Math.floor((trimmedFractional.length - i) / 2);
        k++
      ) {
        const potentialPattern = trimmedFractional.substring(i, i + k);
        const stringToSearchIn = trimmedFractional.substring(i);
        const matchStrength = checkRepeats(stringToSearchIn, potentialPattern);

        if (matchStrength > 0) {
          if (
            potentialPattern.length === stringToSearchIn.length &&
            matchStrength < potentialPattern.length * 1.5
          ) {
            continue;
          }
          const nonRepeatingDigits = trimmedFractional.substring(0, i);
          const formattedNonRepeating = `${integerPart}.${nonRepeatingDigits}`;
          return {
            nonRepeating: formattedNonRepeating,
            repeating: potentialPattern,
          };
        }
      }
    }

    return { nonRepeating: str, repeating: null };
  }
}

