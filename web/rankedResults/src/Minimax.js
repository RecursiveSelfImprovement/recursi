
class Minimax {
  /**
   * Computes the Minimax winner.
   * Minimax winner is the candidate C who minimizes their maximum pairwise defeat margin.
   * The maximum pairwise defeat margin for C is max_O (score(O,C) - score(C,O)).
   * This is consistent with the 'worstDefeat' concept used in calculateScores.
   * @param {Object<string,Object<string,number>>} fullMatrix - The complete pairwise matrix, potentially including WORST_LOSER.
   * @param {string[]} actualCandidateKeys - A list of keys for the 'real' candidates to consider for winning.
   * @returns {string|null} The key of the Minimax winner, or null if no winner can be determined.
   */
  static compute(fullMatrix, actualCandidateKeys) {
    if (!actualCandidateKeys || actualCandidateKeys.length === 0) {
      return null;
    }

    const worstDefeatMargins = {};
    let atLeastOneMarginComputed = false;

    for (const cand of actualCandidateKeys) {
      if (!fullMatrix.hasOwnProperty(cand)) continue; // Candidate not in matrix, skip.

      let maxDefeatForCand = -Infinity;
      let opponentsConsidered = false;
      for (const opponent of Object.keys(fullMatrix)) {
        if (cand === opponent) continue;
        if (!fullMatrix.hasOwnProperty(opponent)) continue; 

        const opponentScoreVsCand = fullMatrix[opponent]?.[cand] ?? 0;
        const candScoreVsOpponent = fullMatrix[cand]?.[opponent] ?? 0;
        const margin = opponentScoreVsCand - candScoreVsOpponent;
        
        maxDefeatForCand = Math.max(maxDefeatForCand, margin);
        opponentsConsidered = true;
      }
      
      worstDefeatMargins[cand] = opponentsConsidered ? maxDefeatForCand : -Infinity; // If no opponents, worst defeat is -Infinity (very good)
      atLeastOneMarginComputed = true;
    }

    if (!atLeastOneMarginComputed) { 
        if (actualCandidateKeys.length === 1 && fullMatrix.hasOwnProperty(actualCandidateKeys[0])) {
            return actualCandidateKeys[0]; 
        }
        return null;
    }
    
    let winner = null;
    let minWorstDefeat = Infinity;

    for (const cand of actualCandidateKeys) {
        if (worstDefeatMargins.hasOwnProperty(cand)) {
            if (winner === null || worstDefeatMargins[cand] < minWorstDefeat) {
                minWorstDefeat = worstDefeatMargins[cand];
                winner = cand;
            } else if (worstDefeatMargins[cand] === minWorstDefeat) {
                // Tie-breaking: prefer earlier candidate in list, or implement specific tie-breaking.
                // Current logic keeps the one found first.
            }
        }
    }
    
    // Fallback for single candidate if not picked up by loop (e.g., margin was -Infinity)
    if (winner === null && actualCandidateKeys.length === 1 && worstDefeatMargins.hasOwnProperty(actualCandidateKeys[0])) {
        return actualCandidateKeys[0];
    }

    return winner;
  } // end compute

} 