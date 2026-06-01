
class ImageAtlasManager {
  constructor() {
    this.imageAtlases = {
      Simple: {
        name: 'Simple Alphabet',
        path: 'https://recursi.dev/SiteResources/alphabetImages/simpleDrawing.png',
        gridCols: 6,
        gridRows: 6,
      },
      Macabre: {
        name: 'Macabre Alphabet',
        path: 'https://recursi.dev/SiteResources/alphabetImages/macabreImages.png',
        gridCols: 6,
        gridRows: 6,
      },
    };
    this.activeAtlasKey = 'Simple';
    this.onAtlasChanged = null;
  }

  getActiveAtlas() {
    return this.imageAtlases[this.activeAtlasKey];
  }

  changeAtlas(atlasKey) {
    if (this.imageAtlases[atlasKey]) {
      this.activeAtlasKey = atlasKey;
      console.log(`Switched to atlas: ${this.imageAtlases[atlasKey].name}`);
      if (this.onAtlasChanged) {
        this.onAtlasChanged();
      }
    } else {
      console.error(`Attempted to switch to invalid atlas key: ${atlasKey}`);
    }
  }

  async generateImageAtlas() {
    console.log('Generating image atlas...');

    const GRID_SIZE = 6;
    const CELL_SIZE = 300;
    const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;

    const canvas = makeElement('canvas', {
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      style: {
        maxWidth: '90vw',
        maxHeight: '80vh',
        border: '1px solid grey',
      },
    });
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    const statusDialog = new DialogBox({
      title: 'Generating Atlas',
      contentHTML: `<p>Loading and drawing images... 0/${letters.length}</p>`,
      size: [300, 100],
    });
    const statusP = statusDialog.contentElement.querySelector('p');

    const loadImage = (src) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error(`Failed to load ${src}`));
        img.src = src;
      });
    };

    for (let i = 0; i < letters.length; i++) {
      const letter = letters[i];
      const col = i % GRID_SIZE;
      const row = Math.floor(i / GRID_SIZE);

      statusP.textContent = `Loading and drawing images... ${i + 1}/${
        letters.length
      } (${letter}.png)`;

      try {
        const img = await loadImage(`./images/${letter}.png`);

        const cellX = col * CELL_SIZE;
        const cellY = row * CELL_SIZE;

        const scale = Math.min(CELL_SIZE / img.width, CELL_SIZE / img.height);
        const newW = img.width * scale;
        const newH = img.height * scale;
        const dx = cellX + (CELL_SIZE - newW) / 2;
        const dy = cellY + (CELL_SIZE - newH) / 2;

        ctx.drawImage(img, dx, dy, newW, newH);
      } catch (error) {
        console.error(`Failed to load image for letter ${letter}:`, error);
        const cellX = col * CELL_SIZE;
        const cellY = row * CELL_SIZE;
        ctx.fillStyle = 'red';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          `Error: ${letter}.png`,
          cellX + CELL_SIZE / 2,
          cellY + CELL_SIZE / 2
        );
      }
    }

    statusDialog.close();

    new DialogBox({
      title: 'Image Atlas (1800x1800) - Right-click to save',
      contentElement: canvas,
      size: [800, 600],
    });
  }

}

