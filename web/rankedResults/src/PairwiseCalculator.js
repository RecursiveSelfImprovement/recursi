class PairwiseCalculator {
  constructor(electionData, addWorstLoser = true) {
    this.electionData = electionData;
    this.addWorstLoser = addWorstLoser;
    this.matrix = null;
  } // end constructor

  // Main public method to generate the matrix
  generateMatrix() {
    const realCandidateKeys = Object.keys(this.electionData.candidates);
    let allCompetitors = [...realCandidateKeys];
    if (this.addWorstLoser) {
      allCompetitors.push('WORST_LOSER');
    }

    const matrix = this.initializeMatrix(allCompetitors);

    for (const ballot of this.electionData.ballots) {
      this.processBallot(ballot, matrix, realCandidateKeys);
    }

    this.matrix = matrix;
    return this.matrix;
  } // end generateMatrix

  // Private helper to initialize the matrix structure
  initializeMatrix(competitors) {
    const matrix = {};
    for (let i of competitors) {
      matrix[i] = {};
      for (let j of competitors) {
        if (i !== j) {
          matrix[i][j] = 0;
        }
      }
    }
    return matrix;
  } // end initializeMatrix

  // Private helper to process a single ballot
  processBallot(ballot, matrix, realCandidateKeys) {
    let count, ballotRanks;
    if (ballot && typeof ballot.ranks !== 'undefined') {
      count = ballot.count || 1;
      ballotRanks = ballot.ranks;
    } else {
      console.warn("Skipping malformed ballot:", ballot);
      return;
    }

    const rankedOnThisBallotFlat = ballotRanks.flat();

    this.processRankedPairsOnBallot(ballotRanks, matrix, count);
    this.processRankedVsUnrankedOnBallot(rankedOnThisBallotFlat, matrix, count, realCandidateKeys);

    if (this.addWorstLoser) {
      this.processWorstLoserOnBallot(rankedOnThisBallotFlat, matrix, count, realCandidateKeys);
    }
  } // end processBallot

  // Private helper for pairwise comparisons among explicitly ranked candidates
  processRankedPairsOnBallot(ballotRanks, matrix, count) {
    for (let i = 0; i < ballotRanks.length; i++) {
      const currentRankGroup = Array.isArray(ballotRanks[i]) ? ballotRanks[i] : [ballotRanks[i]];
      for (let j = i + 1; j < ballotRanks.length; j++) {
        const laterRankGroup = Array.isArray(ballotRanks[j]) ? ballotRanks[j] : [ballotRanks[j]];
        for (const candInCurrentGroup of currentRankGroup) {
          for (const candInLaterGroup of laterRankGroup) {
            if (matrix[candInCurrentGroup] && typeof matrix[candInCurrentGroup][candInLaterGroup] !== 'undefined') {
              matrix[candInCurrentGroup][candInLaterGroup] += count;
            }
          }
        }
      }
    }
  } // end processRankedPairsOnBallot

  // Private helper for preferences of ranked candidates over unranked ones
  processRankedVsUnrankedOnBallot(rankedOnBallot, matrix, count, realCandidateKeys) {
    const unrankedRealCandidates = realCandidateKeys.filter(cKey => !rankedOnBallot.includes(cKey));
    for (const rankedCand of rankedOnBallot) {
      for (const unrankedCand of unrankedRealCandidates) {
        if (matrix[rankedCand] && typeof matrix[rankedCand][unrankedCand] !== 'undefined') {
          matrix[rankedCand][unrankedCand] += count;
        }
      }
    }
  } // end processRankedVsUnrankedOnBallot

  // Private helper for handling the WORST_LOSER candidate logic
  processWorstLoserOnBallot(rankedOnBallot, matrix, count, realCandidateKeys) {
    const worstLoserKey = 'WORST_LOSER';
    const unrankedRealCandidates = realCandidateKeys.filter(cKey => !rankedOnBallot.includes(cKey));

    // All explicitly ranked candidates beat WORST_LOSER
    for (const rankedCand of rankedOnBallot) {
      if (matrix[rankedCand] && typeof matrix[rankedCand][worstLoserKey] !== 'undefined') {
        matrix[rankedCand][worstLoserKey] += count;
      }
    }

    // Unranked candidates beat WORST_LOSER if there's more than one of them
    if (unrankedRealCandidates.length > 1) {
      for (const unrankedCand of unrankedRealCandidates) {
        if (matrix[unrankedCand] && typeof matrix[unrankedCand][worstLoserKey] !== 'undefined') {
          matrix[unrankedCand][worstLoserKey] += count;
        }
      }
    }
  } // end processWorstLoserOnBallot

  // Static method to calculate scores from a given matrix
  static calculateScores(matrix) {
    const candidates = Object.keys(matrix).filter(k => k !== "WORST_LOSER");
    if (candidates.length === 0) return [];

    const results = [];
    for (const rKey of candidates) {
      let worstPercentage = 101;
      let opponentForWorst = null;
      let hasOpponents = false;

      for (const cKey of candidates) {
        if (rKey === cKey) continue;
        hasOpponents = true;

        const votesFor_rKey = matrix[rKey]?.[cKey] ?? 0;
        const votesFor_cKey = matrix[cKey]?.[rKey] ?? 0;
        const totalVotes = votesFor_rKey + votesFor_cKey;
        const currentPercentage = totalVotes > 0 ? (votesFor_rKey / totalVotes) * 100 : 50;

        if (currentPercentage < worstPercentage) {
          worstPercentage = currentPercentage;
          opponentForWorst = cKey;
        }
      }

      if (hasOpponents) {
        results.push({ candidate: rKey, score: worstPercentage, opponent: opponentForWorst });
      } else {
        results.push({ candidate: rKey, score: 100, opponent: null });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.map((item, index) => ({ ...item, rank: index + 1 }));
  } // end calculateScores

  // Static method to format the matrix and results for the widget
  static formatMatrixAndCandidates(matrix, rankedResults) {
    let matrixData = {};
    const displayCandidates = rankedResults
      .filter(item => item.candidate !== 'WORST_LOSER')
      .map(item => item.candidate);

    for (const item of rankedResults) {
      const candidate = item.candidate;
      if (candidate === 'WORST_LOSER' || !matrix[candidate]) continue;

      matrixData[candidate] = {
        wins: {},
        score: item.score,
        rank: item.rank,
        worstPairwiseOpponent: item.opponent
      };

      for (let opponent of displayCandidates) {
        if (candidate === opponent) continue;
        if (matrix[candidate].hasOwnProperty(opponent)) {
          matrixData[candidate].wins[opponent] = matrix[candidate][opponent];
        } else {
          matrixData[candidate].wins[opponent] = 0;
        }
      }
    }
    return matrixData;
  } // end formatMatrixAndCandidates

} // end class PairwiseCalculator