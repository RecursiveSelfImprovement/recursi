// File: src/IRV.js
class IRV {
  static defaultColors = [
    "#8dd3c7", "#fdb462", "#ffddaa", "#fb8072", "#80b1d3", "#b3de69",
    "#fc88aa", "#bc80bd", "#ccebc5", "#ffed6f", "#66c2a5", "#fc8d62",
    "#8da0cb", "#e78ac3", "#a6d854", "#e5c494", "#1f78b4", "#b15928"
  ];

  static tabulate(electionData) {
    const parsedCandidates = electionData.candidates; // { A: "Alice", B: "Bob" }
    const originalBallots = electionData.ballots;   // [{ count: N, ranks: [...] }, ...]

    let activeCandidateIds = Object.keys(parsedCandidates);
    const sankeyRoundsData = [];
    let sankeyWinner = null;

    if (activeCandidateIds.length === 0) {
      return {
        candidates: {},
        rounds: [],
        winner: null,
        transfers: []
      };
    }

    // Loop for each round of counting and elimination
    while (activeCandidateIds.length > 0) {
      // 1. Count votes for this round, allowing for fractional votes
      const roundVoteCounts = {};
      activeCandidateIds.forEach(id => roundVoteCounts[id] = 0);
      let totalVotesInRound = 0;
      let exhaustedVotesInRound = 0;

      for (const ballot of originalBallots) {
        let foundHighestRank = false;
        for (const rankGroup of ballot.ranks) {
          const choicesInRank = Array.isArray(rankGroup) ? rankGroup : [rankGroup];
          
          // Find ALL active candidates in this rank group
          const activeChoicesInRank = choicesInRank.filter(cId => activeCandidateIds.includes(cId));

          if (activeChoicesInRank.length > 0) {
            // This is the highest-ranked group with active candidates.
            // Distribute this ballot's vote (fractionally) among them.
            const numTied = activeChoicesInRank.length;
            const voteValue = ballot.count / numTied;

            for (const tiedCandidateId of activeChoicesInRank) {
                roundVoteCounts[tiedCandidateId] += voteValue;
            }

            totalVotesInRound += ballot.count;
            foundHighestRank = true;
            break; // Stop processing further ranks for this ballot
          }
        }

        if (!foundHighestRank) {
          exhaustedVotesInRound += ballot.count; // Ballot is exhausted
        }
      }

      // Store round data for Sankey diagram
      // Ensure all active candidates are in the round data, even if with 0 votes this round
      const currentRoundSankey = activeCandidateIds.map(id => ({
        id,
        votes: roundVoteCounts[id] || 0
      }));
      sankeyRoundsData.push(currentRoundSankey);

      // 2. Check for winner
      if (activeCandidateIds.length === 1) {
        sankeyWinner = activeCandidateIds[0];
        break; // Single candidate remaining is the winner
      }

      const majorityThreshold = totalVotesInRound / 2;
      for (const id of activeCandidateIds) {
        if ((roundVoteCounts[id] || 0) > majorityThreshold) {
          sankeyWinner = id;
          break;
        }
      }
      if (sankeyWinner) {
        break; // Winner found by majority
      }

      // 3. Check for terminal conditions (no more votes, or unbreakable tie)
      if (totalVotesInRound === 0 && activeCandidateIds.length > 0) {
        // All ballots exhausted, but multiple candidates remain with 0 votes.
        // This implies a tie among remaining candidates, or no votes for anyone.
        // For Sankey, we just show this final state. No single winner.
        sankeyWinner = null; 
        break;
      }
      
      if (activeCandidateIds.length <= 1) { // Should be caught by winner check or this
          sankeyWinner = activeCandidateIds.length === 1 ? activeCandidateIds[0] : null;
          break;
      }

      // 4. Identify candidate(s) for elimination
      let minVotes = Infinity;
      activeCandidateIds.forEach(id => {
        const votes = roundVoteCounts[id] || 0;
        if (votes < minVotes) {
          minVotes = votes;
        }
      });

      const lowestVoteCandidates = activeCandidateIds.filter(id => (roundVoteCounts[id] || 0) === minVotes);

      if (lowestVoteCandidates.length === activeCandidateIds.length) {
        // All remaining candidates are tied (e.g., all have 0 votes, or all have same number of votes).
        // This is a terminal tie. No single winner.
        sankeyWinner = null; 
        break;
      }

      // Tie-breaking for elimination: sort by ID alphabetically, eliminate one.
      lowestVoteCandidates.sort(); 
      const candidateToEliminate = lowestVoteCandidates[0];

      // 5. Eliminate candidate
      activeCandidateIds = activeCandidateIds.filter(id => id !== candidateToEliminate);

      if (activeCandidateIds.length === 0 && !sankeyWinner) {
        // All candidates eliminated without a winner (should be rare if logic is correct)
        break;
      }
    }

    const sankeyCandidates = {};
    let colorIndex = 0;
    for (const id in parsedCandidates) {
      sankeyCandidates[id] = {
        name: parsedCandidates[id],
        color: IRV.defaultColors[colorIndex % IRV.defaultColors.length]
      };
      colorIndex++;
    }

    return {
      candidates: sankeyCandidates,
      rounds: sankeyRoundsData,
      winner: sankeyWinner,
      transfers: [] // SankeyDiagram calculates flows from round data
    };
  } // end tabulate

} // end class IRV