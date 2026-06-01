
class ScoreManager {
  constructor() {
    this.scoreDisplay = makeElement('span', {}, '0 / 0');
    this.completionDisplay = makeElement('span', {}, '0%');
    this.completionPreviewDisplay = makeElement('span', {
      className: 'completion-preview',
    });
    this.movesDisplay = makeElement('span', {}, '0');
    this.showScorePreview = true;
  }

  buildHeader() {
    const completionScoresContainer = makeElement(
      'div',
      { className: 'stat-item-scores' },
      [
        this.completionDisplay,
        document.createTextNode('\u00A0'),
        this.completionPreviewDisplay,
      ]
    );

    return makeElement(
      'div',
      { className: 'game-header' },
      makeElement('div', { className: 'stat-item' }, [
        makeElement('span', { className: 'label' }, 'Score'),
        this.scoreDisplay,
      ]),
      makeElement('div', { className: 'stat-item' }, [
        makeElement('span', { className: 'label' }, 'Completion'),
        completionScoresContainer,
      ]),
      makeElement('div', { className: 'stat-item' }, [
        makeElement('span', { className: 'label' }, 'Moves'),
        this.movesDisplay,
      ])
    );
  }

  updateDisplay(board, boardElements) {
    this.movesDisplay.textContent = board.moves;
    this.scoreDisplay.textContent = `${board.score} / ${board.activeLetters.length}`;
    this.completionDisplay.textContent =
      this.formatScore(board.completionScore) + '%';

    const letterDataInOrder = board.state.filter((t) => t.key !== 'empty');
    const elementMap = new Map();
    boardElements.forEach((el) => {
      if (el.dataset.key) elementMap.set(el.dataset.key, el);
    });

    for (let i = 0; i < letterDataInOrder.length; i++) {
      const tileData = letterDataInOrder[i];
      const element = elementMap.get(tileData.key);
      if (!element) continue;

      const wasCorrect = element.classList.contains('correct');
      const isCorrect =
        board.activeLetters[i] && tileData.key === board.activeLetters[i].key;

      element.classList.toggle('correct', isCorrect);
      if (!wasCorrect && isCorrect) {
        element.classList.add('tile-pop');
        element.addEventListener(
          'animationend',
          () => element.classList.remove('tile-pop'),
          { once: true }
        );
      }
    }
  }

  formatScore(score) {
    const fixedScore = score.toFixed(1);
    return fixedScore.endsWith('.0') ? String(Math.round(score)) : fixedScore;
  }

  updateScorePreview(board, startIndex, targetIndex) {
    const previewEl = this.completionPreviewDisplay;
    if (targetIndex === -1 || startIndex === targetIndex) {
      previewEl.style.display = 'none';
      return;
    }

    const tempState = [...board.state];
    [tempState[startIndex], tempState[targetIndex]] = [
      tempState[targetIndex],
      tempState[startIndex],
    ];

    const hypotheticalScores = board.calculateScoresForState(tempState);
    const diff = hypotheticalScores.completionScore - board.completionScore;

    if (Math.abs(diff) < 0.1) {
      previewEl.style.display = 'none';
      return;
    }

    const formattedDiff = this.formatScore(diff);

    previewEl.classList.remove('gain', 'loss');
    if (diff > 0) {
      previewEl.textContent = formattedDiff.replace('-', '');
      previewEl.classList.add('gain');
    } else {
      previewEl.textContent = formattedDiff;
      previewEl.classList.add('loss');
    }
    previewEl.style.display = 'inline-block';
  }

}

