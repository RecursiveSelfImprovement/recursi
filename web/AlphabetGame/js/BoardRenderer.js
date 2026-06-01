
class BoardRenderer {
  constructor(gridContainer, atlasManager, scoreManager) {
    this.gridContainer = gridContainer;
    this.atlasManager = atlasManager;
    this.scoreManager = scoreManager;
    this.boardElements = [];
  }

  renderBoard(board) {
    this.gridContainer.innerHTML = '';
    this.boardElements = [];

    const activeAtlas = this.atlasManager.getActiveAtlas();
    if (!activeAtlas) {
      console.error(
        `Atlas configuration for key "${this.atlasManager.activeAtlasKey}" not found.`
      );
      this.gridContainer.textContent =
        'Error: Image atlas not configured correctly.';
      return;
    }

    const { path, gridCols, gridRows } = activeAtlas;

    board.state.forEach((tileData) => {
      let tileElement;
      if (tileData.key === 'empty') {
        tileElement = makeElement('div', { className: 'game-tile empty' });
      } else {
        const letterIndex = tileData.key.charCodeAt(0) - 'A'.charCodeAt(0);
        const col = letterIndex % gridCols;
        const row = Math.floor(letterIndex / gridCols);

        const bgPosX = (col / (gridCols - 1)) * 100;
        const bgPosY = (row / (gridRows - 1)) * 100;

        const imageDiv = makeElement('div', {
          className: 'tile-image',
          style: {
            backgroundImage: `url(${path})`,
            backgroundSize: `${gridCols * 100}% ${gridRows * 100}%`,
            backgroundPosition: `${bgPosX}% ${bgPosY}%`,
          },
        });

        const nameLabel = makeElement(
          'span',
          { className: 'tile-name' },
          tileData.name
        );
        tileElement = makeElement(
          'div',
          {
            className: 'game-tile letter',
            'data-key': tileData.key,
          },
          [imageDiv, nameLabel]
        );
      }
      this.gridContainer.appendChild(tileElement);
      this.boardElements.push(tileElement);
    });

    this.scoreManager.updateDisplay(board, this.boardElements);
  }

}

