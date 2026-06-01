
class CondorcetTabulator {
  constructor(electionData) {
    this.data = electionData;
    // The Condorcet method requires the full pairwise matrix including WORST_LOSER
    const pairwiseCalculator = new PairwiseCalculator(this.data, true);
    this.data.matrix = pairwiseCalculator.generateMatrix();
  } // end constructor

  run() {
    // 1. Matrix is already generated in the constructor. We can reuse it.
    const matrix = this.data.matrix;

    // 2. Determine the winner using Minimax on the pairwise results.
    const actualCandidateKeys = Object.keys(this.data.candidates);
    const winnerName = Minimax.compute(matrix, actualCandidateKeys);
    // (Note: winnerName is calculated but not explicitly used in the final return object structure,
    // which is based on ranked scores. This is fine.)

    // 3. Calculate scores and ranks for all candidates based on worst pairwise percentage.
    const rankedResults = PairwiseCalculator.calculateScores(matrix);

    // 4. Convert to the PairwiseMatrixWidget-ready structure.
    return PairwiseCalculator.formatMatrixAndCandidates(matrix, rankedResults);
  } // end run

} // end class CondorcetTabulator