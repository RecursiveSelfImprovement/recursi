class StylesModule {
    static getStyles_PageAndLayout() {
      return `
        .alphabet-game-wrapper {
          --panel-padding: 20px;
          --grid-size: min(85vw, 85vh, 900px);
          --tile-margin: 4px;
          --border-radius: 8px;
          --bg-color: #1a1a2e;
          --grid-bg-color: #34495e;
          --header-color: #ecf0f1;
          --text-color: #bdc3c7;
          --glow-color: #00aeff;
          --drop-target-color: #2980b9;
          --drop-active-color: #3498db;
          --font-game: 'Architects Daughter', cursive;
          
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          background-color: var(--bg-color);
          color: var(--text-color);
          display: flex;
          justify-content: center;
          align-items: flex-start;
          min-height: 100%;
          width: 100%;
          user-select: none;
          -webkit-touch-callout: none;
          overflow-y: auto;
          overflow-x: hidden;
        }
        .alphabet-game-wrapper .game-container { position: relative; display: flex; flex-direction: column; align-items: center; gap: 20px; padding-top: 20px; padding-bottom: 20px; width: 100%; }
        .alphabet-game-wrapper .game-container.is-dragging { cursor: grabbing; }
        .alphabet-game-wrapper .game-container.is-dragging .game-tile.letter:not(.dragging) { pointer-events: none; }
      `;
    }

    static getStyles_HeaderAndStats() {
      return `
        .alphabet-game-wrapper .game-header { width: var(--grid-size); display: flex; justify-content: space-around; background-color: var(--grid-bg-color); padding: 15px; border-radius: var(--border-radius); box-shadow: 0 4px 10px rgba(0,0,0,0.3); font-size: 1.2em; color: var(--header-color); }
        .alphabet-game-wrapper .stat-item { display: flex; flex-direction: column; align-items: center; min-width: 100px; text-align: center; }
        .alphabet-game-wrapper .stat-item .label { font-size: 0.7em; text-transform: uppercase; color: var(--text-color); }
        .alphabet-game-wrapper .stat-item-scores { display: flex; flex-direction: row; align-items: baseline; justify-content: center; white-space: nowrap; height: 1.5em; }
        .alphabet-game-wrapper .completion-preview { display: none; font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
        .alphabet-game-wrapper .completion-preview.gain { color: #fff; background-color: #27ae60; }
        .alphabet-game-wrapper .completion-preview.loss { color: #fff; background-color: #c0392b; }
      `;
    }

    static getStyles_GameGridAndTiles() {
      return `
        .alphabet-game-wrapper .game-grid { display: grid; grid-template-columns: repeat(var(--grid-cols, 6), 1fr); grid-template-rows: repeat(var(--grid-cols, 6), 1fr); width: var(--grid-size); height: var(--grid-size); gap: var(--tile-margin); padding: var(--tile-margin); background-color: var(--grid-bg-color); border-radius: var(--border-radius); box-shadow: inset 0 0 10px rgba(0,0,0,0.5); position: relative; perspective: 1000px; }
        .alphabet-game-wrapper .game-tile { border-radius: 5px; background-color: #ffffff; display: flex; justify-content: center; align-items: center; overflow: hidden; position: relative; transform-style: preserve-3d; }
        .alphabet-game-wrapper .game-tile.letter { cursor: grab; box-shadow: 0 2px 5px rgba(0,0,0,0.2); transition: transform 0.2s ease, box-shadow 0.2s ease; touch-action: none; }
        .alphabet-game-wrapper .game-tile.letter:hover { transform: scale(1.05); box-shadow: 0 0 15px var(--glow-color); z-index: 10; }
        .alphabet-game-wrapper .game-tile.dragging { cursor: grabbing; box-shadow: 0 10px 25px rgba(0,0,0,0.4); transition: none; z-index: 1000; }
        .alphabet-game-wrapper .tile-image { width: 100%; height: 100%; background-repeat: no-repeat; pointer-events: none; }
        .alphabet-game-wrapper .game-tile.empty { background-color: rgba(0,0,0,0.2); box-shadow: inset 0 2px 4px rgba(0,0,0,0.3); }
        .alphabet-game-wrapper .game-tile.empty.drop-target { background-color: var(--drop-target-color); }
        .alphabet-game-wrapper .game-tile.empty.drop-target-active { background-color: var(--drop-active-color); box-shadow: 0 0 15px var(--drop-active-color); }
        .alphabet-game-wrapper .tile-name { font-family: var(--font-game); position: absolute; bottom: 8%; left: 0; right: 0; text-align: center; font-size: calc(var(--grid-size) / (var(--grid-cols, 6) * 6)); color: white; text-shadow: 0 0 8px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,1), 1px 1px 3px rgba(0,0,0,1), -1px -1px 3px rgba(0,0,0,1), 1px -1px 3px rgba(0,0,0,1), -1px 1px 3px rgba(0,0,0,1); pointer-events: none; opacity: 0; transform: translateY(10px); transition: opacity 0.3s ease, transform 0.3s ease; font-weight: bold; }
        .alphabet-game-wrapper .game-tile.correct .tile-name { opacity: 1; transform: translateY(0); }
        .alphabet-game-wrapper .tile-name::first-letter { font-size: 1.25em; color: #ffdd57; text-shadow: inherit; }
        .alphabet-game-wrapper .game-tile.jiggle { animation: alphabet-jiggle 0.5s ease-in-out; }
        @keyframes alphabet-jiggle {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
          20%, 40%, 60%, 80% { transform: translateX(3px); }
        }
      `;
    }

    static getStyles_AnimationsAndOverlays() {
      return `
        @keyframes alphabet-pop-in { 0% { transform: scale(0.8); opacity: 0; } 70% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
        .alphabet-game-wrapper .game-tile.tile-pop .tile-name { animation: alphabet-pop-in 0.3s ease-out forwards; }
        .alphabet-game-wrapper .game-won .game-tile.letter { animation: alphabet-win-celebrate 1s ease-in-out forwards; animation-delay: var(--delay); }
        @keyframes alphabet-win-celebrate { 0% { transform: scale(1) rotateY(0deg); } 50% { transform: scale(1.2) rotateY(180deg); box-shadow: 0 10px 30px #f1c40f; } 100% { transform: scale(1) rotateY(360deg); } }
        .alphabet-game-wrapper .win-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(44, 62, 80, 0.85); z-index: 2000; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; color: var(--header-color); border-radius: var(--border-radius); opacity: 0; visibility: hidden; transition: opacity 0.5s ease, visibility 0.5s ease; backdrop-filter: blur(5px); }
        .alphabet-game-wrapper .win-overlay.visible { opacity: 1; visibility: visible; }
        .alphabet-game-wrapper .win-overlay h2 { font-size: 4em; font-weight: 300; text-shadow: 3px 3px 8px rgba(0,0,0,0.5); margin: 0; }
        .alphabet-game-wrapper .win-overlay p { font-size: 1.5em; margin: 20px 0; }
        .alphabet-game-wrapper .win-overlay-buttons { display: flex; gap: 20px; margin-top: 20px; }
        .alphabet-game-wrapper .play-again-button, .alphabet-game-wrapper .replay-same-button { font-size: 1.1em; padding: 15px 25px; color: white; border: none; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.2); transition: background-color 0.2s, transform 0.2s; }
        .alphabet-game-wrapper .play-again-button { background-color: #27ae60; }
        .alphabet-game-wrapper .play-again-button:hover { background-color: #2ecc71; transform: translateY(-2px); }
        .alphabet-game-wrapper .replay-same-button { background-color: #3498db; }
        .alphabet-game-wrapper .replay-same-button:hover { background-color: #5dade2; transform: translateY(-2px); }
      `;
    }

    static getStyles_Diagnostics() {
      return `
        .alphabet-game-wrapper .diagnostics-toggle-button { 
          position: absolute; bottom: 5px; right: 5px; background-color: #4a6fa5; color: white; 
          border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; z-index: 100;
          font-size: 0.9em; opacity: 0.7; transition: opacity 0.2s, transform 0.2s; font-weight: 500;
        }
        .alphabet-game-wrapper .diagnostics-toggle-button:hover { opacity: 1; transform: translateY(-1px); }
      `;
    }

    static getStyles_Mobile() {
      return `
        @media (max-width: 600px) {
          .alphabet-game-wrapper .game-header { font-size: 1em; padding: 10px; }
          .alphabet-game-wrapper .stat-item { min-width: 70px; }
          .alphabet-game-wrapper .game-container { gap: 15px; padding-bottom: 20px; }
          .alphabet-game-wrapper .tile-name { font-size: 0; bottom: auto; top: 5%; right: 5%; left: auto; text-align: right; font-weight: 900; text-shadow: 0 0 10px rgba(0,0,0,1), 0 0 15px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,1), 2px 2px 4px rgba(0,0,0,1), -2px -2px 4px rgba(0,0,0,1), 2px -2px 4px rgba(0,0,0,1), -2px 2px 4px rgba(0,0,0,1); }
          .alphabet-game-wrapper .tile-name::after { content: attr(data-first-letter); }
          .alphabet-game-wrapper .tile-name::first-letter { font-size: calc(var(--grid-size) / (var(--grid-cols, 6) * 4)); color: #ffdd57; text-shadow: inherit; }
          .alphabet-game-wrapper .win-overlay h2 { font-size: 3em; }
          .alphabet-game-wrapper .win-overlay p { font-size: 1.2em; }
          .alphabet-game-wrapper .play-again-button, .alphabet-game-wrapper .replay-same-button { font-size: 1em; padding: 12px 25px; }
        }
      `;
    }

    static getStyles_SizeSelector() {
      return `
        .alphabet-game-wrapper .grid-size-selector { display: flex; gap: 10px; background-color: var(--grid-bg-color); padding: 10px; border-radius: var(--border-radius); box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
        .alphabet-game-wrapper .grid-size-selector button { background-color: #2c3e50; color: var(--header-color); border: 2px solid transparent; padding: 10px 20px; font-size: 1em; border-radius: 6px; cursor: pointer; transition: background-color 0.2s, border-color 0.2s; }
        .alphabet-game-wrapper .grid-size-selector button:hover { background-color: #34495e; border-color: #567086; }
        .alphabet-game-wrapper .grid-size-selector button.active { background-color: var(--drop-active-color); border-color: var(--glow-color); box-shadow: 0 0 10px var(--glow-color); pointer-events: none; }
      `;
    }

    static getStyles_DarkModeToggle() {
      return `
        .alphabet-game-wrapper .dark-mode-toggle { position: absolute; bottom: 5px; left: 5px; display: flex; align-items: center; gap: 10px; z-index: 100; }
        .alphabet-game-wrapper .dark-mode-label { font-size: 0.9em; color: var(--text-color); pointer-events: none; font-weight: 500; }
        .alphabet-game-wrapper .dark-mode-switch { position: relative; display: inline-block; width: 50px; height: 28px; }
        .alphabet-game-wrapper .dark-mode-switch input { opacity: 0; width: 0; height: 0; }
        .alphabet-game-wrapper .toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #567086; transition: .4s; border-radius: 28px; }
        .alphabet-game-wrapper .toggle-slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
        .alphabet-game-wrapper input:checked + .toggle-slider { background-color: #f39c12; }
        .alphabet-game-wrapper input:focus + .toggle-slider { box-shadow: 0 0 1px #f39c12; }
        .alphabet-game-wrapper input:checked + .toggle-slider:before { transform: translateX(22px); }
      `;
    }

    static applyAllStyles() {
      const allStyles = [
        this.getStyles_PageAndLayout(),
        this.getStyles_HeaderAndStats(),
        this.getStyles_GameGridAndTiles(),
        this.getStyles_AnimationsAndOverlays(),
        this.getStyles_Diagnostics(),
        this.getStyles_Mobile(),
        this.getStyles_SizeSelector(),
        this.getStyles_DarkModeToggle(),
      ].join('\n');
      applyCss(allStyles, 'alphabet-game-scoped-styles-v1');
    }
  }