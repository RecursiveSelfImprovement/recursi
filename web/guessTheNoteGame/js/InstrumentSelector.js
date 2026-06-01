
class InstrumentSelector {
  constructor(gameInstance) {
    this.game = gameInstance;
    this.instruments = [
      'Wurlitzer EP',
      'Electric Guitar',
      'Marimba',
      'Piano',
      'Music Box',
      'Vibes',
      'Harp',
      'Steel Drum',
      'Chimes',
    ];
    this.currentInstrument = 'Piano';
    this.spriteSize = 300;
    this.spriteUrl = 'https://recursi.dev/resources/instruments.png';
  }

  start() {
      this.currentDisplay = makeElement('div', {
        style: {
          position: 'absolute', // MUST BE ABSOLUTE
          background: 'rgba(0, 0, 0, 0.5)', zIndex: '10', cursor: 'pointer', borderRadius: '8px',
          backgroundImage: `url(${this.spriteUrl})`, backgroundSize: '300% 300%', backgroundPosition: '0 0',
          display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', transition: 'opacity 0.2s ease',
        },
      });
      this.game.rootElement.appendChild(this.currentDisplay);

      this.positioner = new SmartElementPositioner(this.currentDisplay, {
        container: this.game.rootElement, // BIND TO SANDBOX
        position: [55, 80], size: [22, 22], aspectRatio: 1,
        sizeCallback: (self, pixelDims) => {
          const fontSize = Math.max(14, Math.min(24, pixelDims.height * 0.35));
          self.element.style.fontSize = `${fontSize}px`;
        },
      });

      this.currentDisplay.addEventListener('click', () => this.showPopup());

      this.overlay = makeElement('div', {
        style: { position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', background: 'rgba(0, 0, 0, 0)', zIndex: '99', opacity: '0', transition: 'opacity 0.4s ease', pointerEvents: 'none' },
      });
      this.game.rootElement.appendChild(this.overlay);

      this.popup = makeElement('div', {
        className: 'instrument-popup',
        style: {
          position: 'absolute', // MUST BE ABSOLUTE
          display: 'none', backgroundImage: `url(${this.spriteUrl})`, backgroundSize: '100% 100%', backgroundColor: 'rgba(0, 0, 0, 0.95)', border: '4px solid black', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)', zIndex: '100', transform: 'translateY(100%)', opacity: '0', transition: 'transform 0.4s ease-out, opacity 0.4s ease-out',
        },
      });
      this.game.rootElement.appendChild(this.popup);

      this.popupPositioner = new SmartElementPositioner(this.popup, {
        container: this.game.rootElement, // BIND TO SANDBOX
        position: [7.5, 15], size: [85, 85], aspectRatio: 1,
        sizeCallback: (self, pixelDims) => {
          self.element.style.width = `${pixelDims.width}px`;
          self.element.style.height = `${pixelDims.height}px`;
          self.element.style.backgroundSize = `${pixelDims.width}px ${pixelDims.height}px`;
        },
      });

      this.popup.addEventListener('click', (e) => this.handleSelection(e));

      const initialIndex = this.instruments.indexOf(this.currentInstrument);
      if (initialIndex !== -1) {
        this.setInstrument(this.currentInstrument);
        this.updateDisplay(initialIndex);
      } else {
        this.currentInstrument = this.instruments[0];
        this.setInstrument(this.currentInstrument);
        this.updateDisplay(0);
      }

      this.positioner.update();
      this.popupPositioner.update();
    }

  showPopup() {
    this.overlay.style.opacity = '0.7';
    this.overlay.style.pointerEvents = 'auto';
    this.popup.style.display = 'block';
    this.popupPositioner.update();
    requestAnimationFrame(() => {
      this.popup.style.transform = 'translateY(0)';
      this.popup.style.opacity = '1';
    });
  }

  hidePopup() {
    this.popup.style.transform = 'translateY(10%)';
    this.popup.style.opacity = '0';
    this.overlay.style.opacity = '0';
    this.overlay.style.pointerEvents = 'none';
    setTimeout(() => {
      this.popup.style.display = 'none';
      this.popup.style.transform = 'translateY(100%)';
    }, 400);
  }

  handleSelection(event) {
      const rect = this.popup.getBoundingClientRect();
      const rootRect = this.game.rootElement.getBoundingClientRect();
      const scale = rect.width / 900;
      const x = (event.clientX - rect.left) / scale;
      const y = (event.clientY - rect.top) / scale;
      const col = Math.floor(x / this.spriteSize);
      const row = Math.floor(y / this.spriteSize);
      const index = row * 3 + col;
      if (index >= 0 && index < this.instruments.length) {
        const selectedInstrument = this.instruments[index];

        const highlight = makeElement('div', {
          style: { position: 'absolute', left: `${col * 33.33}%`, top: `${row * 33.33}%`, width: '33.33%', height: '33.33%', background: 'rgba(0, 255, 255, 0.5)', borderRadius: '10px', zIndex: '101', animation: 'pulseHighlight 0.6s infinite' },
        });
        this.popup.appendChild(highlight);

        this.setInstrument(selectedInstrument)
          .then(() => {
            const popupPixelDims = this.popupPositioner.getPixelDimensions();
            const buttonPixelDims = this.positioner.getPixelDimensions();
            
            // Calculate relative to root container
            const flyStartX = (rect.left - rootRect.left) + (col * popupPixelDims.width) / 3;
            const flyStartY = (rect.top - rootRect.top) + (row * popupPixelDims.height) / 3;

            const flyback = makeElement('div', {
              style: {
                position: 'absolute', // MUST BE ABSOLUTE
                left: `${flyStartX}px`, top: `${flyStartY}px`,
                width: `${popupPixelDims.width / 3}px`, height: `${popupPixelDims.height / 3}px`,
                backgroundImage: `url(${this.spriteUrl})`, backgroundSize: '300% 300%',
                backgroundPosition: `${-(index % 3) * 100}% ${-Math.floor(index / 3) * 100}%`,
                zIndex: '102', transition: 'all 0.5s ease-in',
              },
            });
            this.game.rootElement.appendChild(flyback);

            const buttonRect = this.currentDisplay.getBoundingClientRect();
            const flyEndX = (buttonRect.left - rootRect.left) + buttonRect.width / 2 - buttonPixelDims.width / 2;
            const flyEndY = (buttonRect.top - rootRect.top) + buttonRect.height / 2 - buttonPixelDims.height / 2;

            requestAnimationFrame(() => {
              flyback.style.width = `${buttonPixelDims.width}px`;
              flyback.style.height = `${buttonPixelDims.height}px`;
              flyback.style.transform = `translate(${flyEndX - flyStartX}px, ${flyEndY - flyStartY}px)`;
            });

            setTimeout(() => {
              this.updateDisplay(index);
              this.hidePopup();
              flyback.remove();
              highlight.remove();
            }, 500);
          })
          .catch((error) => {
            highlight.remove();
            this.hidePopup();
          });
      }
    }

  setInstrument(name) {
    this.currentInstrument = name;
    return window.instruments.setActiveInstrument(name);
  }

  updateDisplay(index) {
    const x = -(index % 3) * 100;
    const y = -Math.floor(index / 3) * 100;
    this.currentDisplay.style.opacity = '0';
    setTimeout(() => {
      this.currentDisplay.style.backgroundPosition = `${x}% ${y}%`;
      requestAnimationFrame(() => {
        this.currentDisplay.style.opacity = '1';
      });
    }, 200);
  }

}

