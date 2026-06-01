
class GameSolver {
  constructor(gameBoard) {
    this.board = gameBoard;
    this.solverInterval = null;
    this.isSolving = false;
  }

  findBestMove() {
    const currentState = this.board.state;
    let bestMoves = [];
    // Start with a very low score to ensure any valid move is chosen if all moves are negative
    let bestScore = -Infinity;

    for (let i = 0; i < currentState.length; i++) {
      if (currentState[i].key === 'empty') {
        continue;
      }

      const reachableEmptySquares = this.board.findAllReachableEmpty(i);

      for (const targetIndex of reachableEmptySquares) {
        const tempState = [...currentState];
        [tempState[i], tempState[targetIndex]] = [
          tempState[targetIndex],
          tempState[i],
        ];

        const hypotheticalScores =
          this.board.calculateScoresForState(tempState);
        const newScore = hypotheticalScores.completionScore;

        if (newScore > bestScore) {
          // Found a new best score, clear the old list of moves
          bestScore = newScore;
          bestMoves = [
            { fromIndex: i, toIndex: targetIndex, bestScore: newScore },
          ];
        } else if (newScore === bestScore) {
          // Found another move with the same best score, add it to the list
          bestMoves.push({
            fromIndex: i,
            toIndex: targetIndex,
            bestScore: newScore,
          });
        }
      }
    }

    if (bestMoves.length === 0) {
      return null; // No possible moves
    }

    // Randomly select one of the best moves
    const randomIndex = Math.floor(Math.random() * bestMoves.length);
    return bestMoves[randomIndex];
  }

  startSolving(moveCallback, interval = 500) {
    if (this.isSolving) {
      return;
    }
    console.log(`Starting solver with ${interval}ms interval.`);
    this.isSolving = true;

    this.solverInterval = setInterval(() => {
      if (this.board.completionScore === 100) {
        console.log('Game is solved. Stopping solver.');
        this.stopSolving();
        return;
      }

      const bestMove = this.findBestMove();

      if (bestMove) {
        console.log(
          `Found best move: ${bestMove.fromIndex} -> ${
            bestMove.toIndex
          }, New Score: ${bestMove.bestScore.toFixed(2)}%`
        );
        moveCallback(bestMove);
      } else {
        console.log('No move improves the score. Stopping solver.');
        this.stopSolving();
      }
    }, interval);
  }

  stopSolving() {
    if (this.solverInterval) {
      clearInterval(this.solverInterval);
    }
    this.isSolving = false;
    this.solverInterval = null;
    console.log('Solver stopped.');
  }

  findRandomMove() {
    const letterTiles = [];
    // Find all letter tiles that are adjacent to at least one empty square
    for (let i = 0; i < this.board.state.length; i++) {
      if (this.board.state[i].key !== 'empty') {
        const adjacentEmpty = this.board.findAdjacentEmpty(i);
        if (adjacentEmpty.length > 0) {
          letterTiles.push({ fromIndex: i, toIndices: adjacentEmpty });
        }
      }
    }

    if (letterTiles.length === 0) {
      return null; // No possible moves
    }

    // Pick a random movable letter tile
    const randomTile =
      letterTiles[Math.floor(Math.random() * letterTiles.length)];
    // Pick a random empty square adjacent to that tile
    const toIndex =
      randomTile.toIndices[
        Math.floor(Math.random() * randomTile.toIndices.length)
      ];

    return { fromIndex: randomTile.fromIndex, toIndex: toIndex };
  }

  scramble(moveCount) {
    // 1. Get the correctly ordered list of letters for the current board.
    const letters = this.board.activeLetters;
    if (!letters || letters.length === 0) {
      console.error('Cannot scramble: board has no active letters set.');
      return;
    }
    const numEmpty = this.board.totalTiles - letters.length;

    // 2. Create a new empty board array and find random positions for empty tiles.
    let board = new Array(this.board.totalTiles).fill(null);
    const emptyPositions = new Set();
    while (emptyPositions.size < numEmpty) {
      emptyPositions.add(Math.floor(Math.random() * this.board.totalTiles));
    }

    // 3. Place empty tiles first.
    for (const pos of emptyPositions) {
      board[pos] = { key: 'empty' };
    }

    // 4. Fill the remaining spots with the ordered letters.
    let letterIndex = 0;
    for (let i = 0; i < this.board.totalTiles; i++) {
      if (board[i] === null) {
        board[i] = letters[letterIndex++];
      }
    }

    // 5. Set this correctly solved state as the starting point.
    this.board.state = board;
    this.board.moves = 0;
    this.board.updateScores();

    // 6. Apply `moveCount` random moves from this solved state.
    let movesMade = 0;
    while (movesMade < moveCount) {
      const randomMove = this.findRandomMove();
      if (randomMove) {
        [
          this.board.state[randomMove.fromIndex],
          this.board.state[randomMove.toIndex],
        ] = [
          this.board.state[randomMove.toIndex],
          this.board.state[randomMove.fromIndex],
        ];
        movesMade++;
      } else {
        console.warn('Could not find a random move. Stopping scramble early.');
        break;
      }
    }

    // Final state update
    this.board.moves = 0; // Scrambling doesn't count as player moves
    this.board.updateScores();
    console.log(`Scramble complete after ${movesMade} moves.`);
  }

}

