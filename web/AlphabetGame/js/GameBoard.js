class GameBoard {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.totalTiles = cols * rows;
    this.state = [];
    this.moves = 0;
    this.score = 0;
    this.completionScore = 0;
    this.maxDisorder = 0;
    this.activeLetters = []; // To store the current subset of letters
  }

  shuffleAndValidate() {
    this.moves = 0;
    this.score = 0;
    this.maxDisorder = 0; // Reset cached value

    const fullAlphabet = GameBoard.getLetters();
    let numLetters;
    if (this.totalTiles === 36) {
      // 6x6
      numLetters = 26;
    } else if (this.totalTiles === 25) {
      // 5x5
      numLetters = 18;
    } else if (this.totalTiles === 16) {
      // 4x4
      numLetters = 12;
    } else {
      numLetters = Math.round(this.totalTiles * 0.72);
    }

    const firstLetterMaxIndex = fullAlphabet.length - numLetters;
    const firstLetterIndex = Math.floor(
      Math.random() * (firstLetterMaxIndex + 1)
    );

    this.activeLetters = fullAlphabet.slice(
      firstLetterIndex,
      firstLetterIndex + numLetters
    );

    const numEmpty = this.totalTiles - this.activeLetters.length;
    const emptyTile = { key: 'empty' };

    let board;
    do {
      board = [...this.activeLetters, ...Array(numEmpty).fill(emptyTile)];
      for (let i = board.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [board[i], board[j]] = [board[j], board[i]];
      }

      const isSolved = this.isCorrectlySequenced(board);
      if (!isSolved) break;

      console.log('Board was perfectly solved on shuffle. Re-shuffling.');
    } while (true);

    this.state = board;
    this.updateScores();
    return this.state;
  }

  isCorrectlySequenced(boardState) {
    const currentLetters = boardState.filter((t) => t.key !== 'empty');
    if (currentLetters.length === 0) return true;
    if (currentLetters.length !== this.activeLetters.length) return false;

    for (let i = 0; i < currentLetters.length; i++) {
      if (currentLetters[i].key !== this.activeLetters[i].key) {
        return false;
      }
    }
    return true;
  }

  moveTile(fromIndex, toIndex) {
    [this.state[fromIndex], this.state[toIndex]] = [
      this.state[toIndex],
      this.state[fromIndex],
    ];
    this.moves++;
    this.updateScores(); // Renamed from updateScore
  }

  findAdjacentEmpty(tileIndex) {
    const row = Math.floor(tileIndex / this.cols);
    const col = tileIndex % this.cols;
    const results = [];
    const neighbors = [
      { r: row - 1, c: col },
      { r: row + 1, c: col },
      { r: row, c: col - 1 },
      { r: row, c: col + 1 },
    ];
    for (const n of neighbors) {
      if (n.r >= 0 && n.r < this.rows && n.c >= 0 && n.c < this.cols) {
        const index = n.r * this.cols + n.c;
        if (this.state[index].key === 'empty') {
          results.push(index);
        }
      }
    }
    return results;
  }

  findAllReachableEmpty(tileIndex) {
    const reachable = new Set();
    const queue = [];
    const visited = new Set();

    // Find the initial "entry points" into the empty space network
    const initialNeighbors = this.findAdjacentEmpty(tileIndex);
    for (const neighborIndex of initialNeighbors) {
      queue.push(neighborIndex);
      visited.add(neighborIndex);
      reachable.add(neighborIndex);
    }

    // Perform the BFS
    while (queue.length > 0) {
      const currentIndex = queue.shift();
      const neighbors = this.findAdjacentEmpty(currentIndex);

      for (const neighborIndex of neighbors) {
        if (!visited.has(neighborIndex)) {
          visited.add(neighborIndex);
          reachable.add(neighborIndex);
          queue.push(neighborIndex);
        }
      }
    }

    return Array.from(reachable);
  }

  findReachablePaths(tileIndex) {
    const paths = new Map();
    const queue = [];
    const visited = new Set([tileIndex]); // Start by visiting the letter tile itself

    // Find the initial "entry points" and create the first step of the path
    const initialNeighbors = this.findAdjacentEmpty(tileIndex);
    for (const neighborIndex of initialNeighbors) {
      if (!visited.has(neighborIndex)) {
        const path = [neighborIndex];
        queue.push({ index: neighborIndex, path });
        visited.add(neighborIndex);
        paths.set(neighborIndex, path);
      }
    }

    // Perform the BFS to flood-fill through connected empty squares
    while (queue.length > 0) {
      const { index: currentIndex, path: currentPath } = queue.shift();
      const neighbors = this.findAdjacentEmpty(currentIndex);

      for (const neighborIndex of neighbors) {
        if (!visited.has(neighborIndex)) {
          visited.add(neighborIndex);
          const newPath = [...currentPath, neighborIndex];
          paths.set(neighborIndex, newPath);
          queue.push({ index: neighborIndex, path: newPath });
        }
      }
    }

    return paths;
  }

  updateScores() {
    // The main update function now uses the new, flexible calculator.
    const scores = this.calculateScoresForState(this.state);
    this.score = scores.score;
    this.completionScore = scores.completionScore;
  }

  calculateMaxDisorder() {
    if (this.maxDisorder > 0) return this.maxDisorder;
    if (this.activeLetters.length === 0) return 0;

    let totalMaxDisorder = 0;
    const numLetters = this.activeLetters.length;
    for (let i = 0; i < numLetters; i++) {
      const maxDistance = Math.max(i - 0, numLetters - 1 - i);
      totalMaxDisorder += maxDistance;
    }
    this.maxDisorder = totalMaxDisorder;
    return this.maxDisorder;
  }

  shuffleNearlySolved(jumbleCount = 2) {
    let report = `--- "Nearly Solve" Operation Report ---\n`;
    report += `Requested Jumble Count: ${jumbleCount}\n\n`;

    // 1. Start with a perfectly ordered list of this board's active letters.
    let letters = [...this.activeLetters];
    const numLetters = letters.length;

    // 2. Perform `jumbleCount` swaps on this list.
    report += `Step 1: Jumbling the letter sequence...\n`;
    const initialSequence = letters.map((l) => l.key).join(', ');
    for (let i = 0; i < jumbleCount; i++) {
      const index1 = Math.floor(Math.random() * numLetters);
      const offset =
        (Math.floor(Math.random() * 5) + 2) * (Math.random() < 0.5 ? 1 : -1);
      let index2 = Math.max(0, Math.min(numLetters - 1, index1 + offset));
      if (index1 === index2) index2 = (index1 + 1) % numLetters;

      report += `  - Swapping '${letters[index1].key}' (pos ${index1}) with '${letters[index2].key}' (pos ${index2})\n`;
      [letters[index1], letters[index2]] = [letters[index2], letters[index1]];
    }
    const finalSequence = letters.map((l) => l.key).join(', ');
    report += `Initial Letter Sequence: ${initialSequence}\n`;
    report += `Final Letter Sequence:   ${finalSequence}\n\n`;

    // 3. Scatter empty tiles among the jumbled letters.
    report += `Step 2: Scattering empty tiles into the final letter sequence...\n`;
    const numEmpty = this.totalTiles - numLetters;
    let board = [];

    const emptyPositions = new Set();
    while (emptyPositions.size < numEmpty) {
      emptyPositions.add(Math.floor(Math.random() * this.totalTiles));
    }
    report += `Empty tiles will be placed at grid indices: ${Array.from(
      emptyPositions
    )
      .sort((a, b) => a - b)
      .join(', ')}\n\n`;

    let letterIndex = 0;
    for (let i = 0; i < this.totalTiles; i++) {
      if (emptyPositions.has(i)) {
        board.push({ key: 'empty' });
      } else {
        board.push(letters[letterIndex++]);
      }
    }

    this.state = board;
    this.moves = 0;
    this.updateScores();

    report += `Operation complete. Board has been updated.\n`;
    return report;
  }

  calculateScoresForState(stateArray) {
    if (this.activeLetters.length === 0) {
      return { score: 0, completionScore: 100 };
    }

    // Simple Score: number of letters correct from the start of the sequence
    let simpleScore = 0;
    const currentLettersData = stateArray.filter((t) => t.key !== 'empty');
    for (let i = 0; i < currentLettersData.length; i++) {
      if (i >= this.activeLetters.length) break;
      if (currentLettersData[i].key === this.activeLetters[i].key) {
        simpleScore++;
      } else {
        break;
      }
    }

    // Completion Score (Disorder-based)
    const maxDisorder = this.calculateMaxDisorder();
    let currentDisorder = 0;

    const correctIndexMap = new Map();
    this.activeLetters.forEach((letter, index) => {
      correctIndexMap.set(letter.key, index);
    });

    currentLettersData.forEach((tileData, currentIndex) => {
      const letter = tileData.key;
      const correctIndex = correctIndexMap.get(letter);
      if (correctIndex !== undefined) {
        currentDisorder += Math.abs(currentIndex - correctIndex);
      }
    });

    let completionScore = 0;
    if (maxDisorder > 0) {
      const completionRatio = (maxDisorder - currentDisorder) / maxDisorder;
      completionScore = Math.max(0, completionRatio * 100);
    } else {
      completionScore = currentDisorder === 0 ? 100 : 0;
    }

    return { score: simpleScore, completionScore: completionScore };
  }

  static letterNames = {
    A: 'Apple',
    B: 'Bus',
    C: 'Cat',
    D: 'Dog',
    E: 'Egg',
    F: 'Fish',
    G: 'Grape',
    H: 'Hat',
    I: 'Ice Cream',
    J: 'Juice',
    K: 'Kite',
    L: 'Lion',
    M: 'Moon',
    N: 'Nest',
    O: 'Orange',
    P: 'Penguin',
    Q: 'Queen',
    R: 'Robot',
    S: 'Sun',
    T: 'Turtle',
    U: 'Umbrella',
    V: 'Violin',
    W: 'Whale',
    X: 'Xylophone',
    Y: 'Yak',
    Z: 'Zebra',
  };

  static getLetters() {
    return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((char) => ({
      key: char,
      name: GameBoard.letterNames[char],
    }));
  }

}

