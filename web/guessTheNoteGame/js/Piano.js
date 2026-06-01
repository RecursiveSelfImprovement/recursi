
class Piano {
  constructor() {
      this.settings = {
        keyWidth: 20,
        keyHeight: 30,
        keySpacing: 5,
        whiteKeyColor: '#e0e0e0',
        blackKeyColor: '#505050',
        fullStartMidi: 53,
        fullEndMidi: 76,
        gameStartMidi: 60,
        gameEndMidi: 71,
        padding: [10, 10], // <-- FIXED: Reduced padding to maximize key length
      };

      this.containerDiv = this.createContainerDiv();
      this.svgElement = this.createSvgElement();
      this.containerDiv.appendChild(this.svgElement);

      this.graphicPiano = new GraphicPiano(this.svgElement, {
        startMidi: this.settings.fullStartMidi,
        endMidi: this.settings.fullEndMidi,
        padding: this.settings.padding,
        blackKeyHeightRatio: 0.55,
        cornerRadius: 5,
        keySpacing: this.settings.keySpacing,
      });
      this.glowPiano = new GlowPiano(this.graphicPiano);

      this.gameRange = {
        startMidi: this.settings.gameStartMidi,
        endMidi: this.settings.gameEndMidi,
      };
    }

  createContainerDiv() {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.overflow = 'hidden';
    container.style.transition = 'left 0.3s ease';
    // Removed: container.style.pointerEvents = 'none';
    return container;
  }

  createSvgElement() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    return svg;
  }

  setGameInstance(gameInstance) {
    this.gameInstance = gameInstance;
    this.glowPiano.setNoteCallback((midi, eventType, customData) => {
      this.gameInstance.handleNoteEvent(midi, eventType, customData);
    });
  }

  setSizeAndPosition(containerWidth, containerHeight, skipInit) {
      let totalWhiteKeys = 0;
      for (let m = this.settings.fullStartMidi; m <= this.settings.fullEndMidi; m++) {
        const keyIndex = m % 12;
        const isBlack = [1, 3, 6, 8, 10].includes(keyIndex);
        if (!isBlack) totalWhiteKeys++;
      }

      // Balance key aspect ratio so they aren't unnaturally tall.
      // 0.22 width vs height provides a classic piano key proportion ratio (~4.5)
      let targetKeyWidth = containerHeight * 0.22;
      let visibleWhiteKeys = containerWidth / targetKeyWidth;

      let gameRangeWhiteKeys = 0;
      for (let m = this.gameRange.startMidi; m <= this.gameRange.endMidi; m++) {
        const isBlack = [1, 3, 6, 8, 10].includes(m % 12);
        if (!isBlack) gameRangeWhiteKeys++;
      }

      const minVisible = Math.max(7, gameRangeWhiteKeys);

      if (visibleWhiteKeys < minVisible) {
        visibleWhiteKeys = minVisible;
        targetKeyWidth = containerWidth / visibleWhiteKeys;
      } else if (visibleWhiteKeys > totalWhiteKeys) {
        visibleWhiteKeys = totalWhiteKeys;
        
        // Scale up slightly to fill space on ultrawide monitors, but cap at a max fatness of 30%
        const maxKeyWidth = containerHeight * 0.30;
        const fillWidth = containerWidth / totalWhiteKeys;
        targetKeyWidth = Math.min(maxKeyWidth, fillWidth);
      }

      const svgWidth = targetKeyWidth * totalWhiteKeys;
      const svgHeight = containerHeight;

      this.containerDiv.style.width = `${svgWidth}px`;
      this.containerDiv.style.height = `${svgHeight}px`;

      if (!skipInit) {
        this.graphicPiano.updateSize(svgWidth, svgHeight);
        this.glowPiano.initialize();
      }

      let gameRangeWhiteKeyCountBefore = 0;
      for (let m = this.settings.fullStartMidi; m < this.gameRange.startMidi; m++) {
        const isBlack = [1, 3, 6, 8, 10].includes(m % 12);
        if (!isBlack) gameRangeWhiteKeyCountBefore++;
      }

      const startPixel = gameRangeWhiteKeyCountBefore * targetKeyWidth;
      const rangeWidthPixel = gameRangeWhiteKeys * targetKeyWidth;
      const centerPixel = startPixel + rangeWidthPixel / 2;

      let leftOffset = containerWidth / 2 - centerPixel;

      if (svgWidth <= containerWidth) {
        leftOffset = (containerWidth - svgWidth) / 2;
      } else {
        const minOffset = containerWidth - svgWidth;
        const maxOffset = 0;
        leftOffset = Math.max(minOffset, Math.min(maxOffset, leftOffset));
      }

      this.containerDiv.style.left = `${leftOffset}px`;
    }

  glowPianoInitialized = false;

  setGameRange(startMidi, endMidi) {
    startMidi = Math.max(
      this.settings.fullStartMidi,
      Math.min(this.settings.fullEndMidi - 11, startMidi)
    );
    endMidi = startMidi + 11;
    this.gameRange = { startMidi, endMidi };

    this.setSizeAndPosition(
      this.containerDiv.parentElement.offsetWidth,
      this.containerDiv.parentElement.offsetHeight,
      true
    );
  }

  addOverlayElement(midi, element, options = {}) {
    const keyData = this.graphicPiano.getKeyByMidi(midi);
    if (!keyData || !keyData.bbox) {
      console.warn(`No bounding box data for MIDI ${midi}`);
      return;
    }

    const {
      position: [x, y],
      size: [width, height],
      isBlack,
    } = keyData.bbox;

    // Default styling
    element.style.position = 'absolute';
    element.style.left = `${x + width / 2}px`; // Center horizontally
    element.style.transform = 'translateX(-50%)'; // Horizontal centering only
    element.style.pointerEvents = 'none'; // Overlays don’t block clicks
    element.style.zIndex = '10';
    element.style.fontFamily = '"Architects Daughter", Arial, sans-serif'; // Consistent font

    // Get element height (assume 48px for text, 50px for SVG unless specified)
    const elementHeight =
      parseFloat(element.style.height) ||
      (element.tagName.toLowerCase() === 'svg' ? 50 : 48);
    // Vertical positioning: bottomOffset is distance from key bottom to element bottom
    const bottomOffset =
      options.bottomOffset !== undefined ? options.bottomOffset : 5; // Default 5px above bottom
    element.style.top = `${y + height - elementHeight - bottomOffset}px`; // Position bottom of element

    // Optional custom styling from options
    if (options.color) element.style.color = options.color;
    if (options.fontSize) element.style.fontSize = options.fontSize;
    if (options.textShadow) element.style.textShadow = options.textShadow;

    // Append to the sliding container
    this.containerDiv.appendChild(element);
  }

  removeOverlayElement(element) {
    if (this.containerDiv.contains(element)) {
      this.containerDiv.removeChild(element);
    }
  }

  getContainer() {
    return this.containerDiv;
  }

}

