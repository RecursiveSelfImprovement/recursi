
class InstantRunoffWidget {
  element = null;
  sankeyContainer = null;
  svgContainer = null;
  domOverlayContainer = null;
  sankeyDiagramInstance = null;
  resizeObserver = null;

  constructor(irvData) {
    this.element = makeElement("div", { class: "irv-widget" });
    this.injectCss();

    this.sankeyContainer = makeElement('div', { class: 'sankey-wrapper' });
    this.svgContainer = makeElement('div', { class: 'sankey-diagram-svg-container' });
    this.domOverlayContainer = makeElement('div', { class: 'sankey-dom-overlay-container' });

    this.sankeyContainer.append(this.svgContainer, this.domOverlayContainer);
    this.element.append(this.sankeyContainer);

    // The data is already tabulated, so we can draw directly.
    this.drawSankey(irvData);
  } // end constructor

  drawSankey(irvResults) {
    if (this.resizeObserver) {
        this.resizeObserver.disconnect();
    }
    
    if (!irvResults) {
      this.sankeyContainer.textContent = "Error: Invalid IRV results provided to widget.";
      return;
    }
    
    // Check if there are any rounds to display.
    if (!irvResults.rounds || irvResults.rounds.length === 0) {
      let message = "IRV tabulation produced no displayable rounds. This could be due to all ballots being exhausted immediately, or no votes cast.";
      if (irvResults.candidates && Object.keys(irvResults.candidates).length === 0) {
        message = "No candidates to tabulate.";
      }
      this.sankeyContainer.innerHTML = `<p>${message}</p>`;
      return;
    }

    this.sankeyDiagramInstance = new SankeyDiagram(
      this.svgContainer,
      this.domOverlayContainer,
      irvResults
    );

    // Use a ResizeObserver to handle resizing dynamically
    this.resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        // Ensure a minimum height for the diagram
        const effectiveHeight = height > 50 ? height : 500;
        if (width > 0 && this.sankeyDiagramInstance) {
          this.sankeyDiagramInstance.resize(width, effectiveHeight);
        }
      }
    });

    this.resizeObserver.observe(this.sankeyContainer);
    
    // Initial draw might be needed if ResizeObserver doesn't fire immediately
    requestAnimationFrame(() => {
      if (!this.sankeyContainer) return;
      const width = this.sankeyContainer.clientWidth;
      const height = this.sankeyContainer.clientHeight > 50 ? this.sankeyContainer.clientHeight : 500;
      
      if (width > 0 && this.sankeyDiagramInstance) {
        this.sankeyDiagramInstance.resize(width, height);
      } else if (this.sankeyDiagramInstance) {
        // Fallback for environments where clientWidth might be 0 initially
        this.sankeyDiagramInstance.resize(800, 500);
      }
    });
  } // end drawSankey

  injectCss() {
    applyCss(`
      .irv-widget {
        width: 100%;
        height: 100%; 
        min-height: 500px; 
        box-sizing: border-box;
      }
      .sankey-wrapper {
        position: relative; 
        width: 100%;
        height: 100%; 
        background-color: #f9f9f9;
        border: 1px solid #ddd;
        box-sizing: border-box;
      }
      .sankey-diagram-svg-container {
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
      .sankey-diagram-svg-container svg {
          display: block;
      }
      .sankey-dom-overlay-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none; 
      }
      
      /* Base for all labels: no background, basic font settings */
      .sankey-dom-label {
        position: absolute;
        font-family: 'Roboto', sans-serif; /* A fallback, themes will override */
        pointer-events: none; /* Default to none, candidate labels will override */
        white-space: nowrap;
        padding: 2px;
        background-color: transparent; /* NO background by default */
        border-radius: 2px;
      }
      
      /* Candidate labels get the background and are interactive */
      .sankey-dom-candidate-label {
        font-size: 12px;
        color: #333; /* Fallback for light theme */
        background-color: rgba(255, 255, 255, 0.75); /* Fallback for light theme */
        pointer-events: all; /* Allow hover, etc. */
        padding: 2px 4px;
      }
      
      /* Round labels ("Round 1") */
      .sankey-dom-round-label {
        font-weight: bold;
        font-size: 14px;
        color: #333; /* Fallback for light theme */
      }
      
      /* Vote count labels (numbers inside nodes) */
      .sankey-dom-vote-label {
        font-weight: bold;
        font-size: 12px;
        color: white; /* Always light text */
        /* Stronger shadow for contrast on any color */
        text-shadow: 0 0 3px rgba(0,0,0,0.8), 1px 1px 2px rgba(0,0,0,0.6);
      }
      
      /* Class for vote labels on light-colored nodes */
      .sankey-dom-vote-label.dark-text {
        color: #222; 
        text-shadow: 0 0 2px rgba(255,255,255,0.7);
      }
    `, "IRVWidgetStyles");
  } 

  destroy() {
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
    }

} // end class InstantRunoffWidget