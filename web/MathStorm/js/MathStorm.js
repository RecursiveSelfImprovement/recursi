class MathStorm {
    setupStyles() {
    applyCss(
      `
    @import url('https://fonts.googleapis.com/css2?family=Lexend+Deca:wght@700&display=swap');

    html, body {
      height: 100%;
      width: 100%;
      overflow: hidden; /* CRITICAL: Prevent scrolling on the root element */
    }
    body {
      margin: 0;
      background: #1a1a2e;
      color: #fff;
      position: relative;
      touch-action: none; /* CRITICAL: Disable browser's default touch actions like pan/zoom/scroll */
    }

    #debug-log-content{
      height:140px;overflow-y:scroll;background:rgba(0,0,0,.2);padding:5px;
      font-family:monospace;font-size:11px;border-radius:3px;border:1px solid #555;
    }

    .game-piece{
      position:absolute;top:0;left:0;font:700 4.5vmin 'Lexend+Deca',sans-serif;
      color:#f0f0f0;padding:1.2vmin 2.0vmin;border-radius:10px;
      background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.25);
      text-shadow:0 0 10px rgba(255,255,255,.5);cursor:grab;user-select:none;
      transition:transform .1s,box-shadow .1s,background-color .1s,border-color .15s;
      will-change:transform;
    }
    .game-piece.dragging,.piece-group.dragging{
      cursor:grabbing;box-shadow:0 0 28px rgba(255,255,128,.8);
      background:rgba(255,255,255,.18);z-index:1000;
    }
    .game-piece.collision-flash,.piece-group.collision-flash{
      background:rgba(255,200,100,.3)!important;box-shadow:0 0 15px rgba(255,200,100,.6)!important;
    }

    .piece-group{
      position:absolute;top:0;left:0;
      border:3px dashed rgba(0,255,255,.75);
      background:rgba(0,255,255,.07);
      border-radius:18px;cursor:grab;min-width:20px;min-height:20px;
      transition:border-color .15s,box-shadow .15s;box-sizing:border-box;
    }
    
    .piece-group::after{
      content:'';position:absolute;
      /* ** STYLE UPDATE: Positioned for tighter padding ** */
      left: 8px; right: 8px; bottom: 4px; height: 16px;
      background:linear-gradient(to top, rgba(255,255,255,.08), rgba(255,255,255,0));
      /* ** STYLE UPDATE: Changed to a thin solid line ** */
      border-top:1px solid rgba(0,255,255,.25);
      border-radius:10px 10px 14px 14px;pointer-events:none;
    }

    .snap-target{box-shadow:0 0 26px rgba(0,255,128,.9)!important;border-color:rgba(0,255,128,.9)!important;}
    .snap-target-invalid{box-shadow:0 0 26px rgba(255,64,64,.9)!important;border-color:rgba(255,64,64,.9)!important;}
    
    .piece-group.solved{
      border-style:solid;
      border-color:rgba(128,255,128,.9);
      box-shadow:0 0 20px rgba(128,255,128,.7);
      cursor:default;
    }
    
    .piece-group.solved::after{
      display:none; /* Hide the grab bar for solved groups */
    }
    `,
      'multiply-game-styles'
    );
  }

  /**
   * Prevents the mobile "swipe from edge to go back" gesture.
   * It works by adding a dummy state to the browser's history,
   * then catching the 'popstate' event (which fires on a back navigation)
   * and immediately pushing the dummy state back on. This effectively
   * traps the user on the current page, preventing accidental navigation.
   */
  setupBackGestureTrap() {
    // 1. Push an initial state onto the history stack.
    history.pushState(null, '', location.href);

    // 2. Listen for the user trying to go back.
    window.addEventListener('popstate', (event) => {
      // 3. When they do, immediately push our state back onto the stack.
      history.pushState(null, '', location.href);
      this.debug.log('Back gesture intercepted.');
    });
  }

  

  

  async run(env) {
      this.env = env;
      const targetElement = env.container;
      
      this.debug = new Debug();
      this.debug.env = env; // Share the environment down
      this.setupStyles();
      this.setupBackGestureTrap();

      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      if (isTouchDevice) {
          applyCss(
              `
              .game-piece { font-size: 7vmin; padding: 2vmin 3vmin; border-radius: 2vmin; }
              .piece-group { border-width: 0.8vmin; border-radius: 3vmin; }
              .piece-group::after { left: 1.5vmin; right: 1.5vmin; bottom: 1vmin; height: 3vmin; border-radius: 2vmin; }
              `,
              'mobile-styles'
          );
      }

      this.equationFactory = new EquationFactory();
      this.gameEngine = new GameEngine(
          targetElement,
          this.equationFactory,
          null,
          this.debug
      );
      this.interactionHandler = new InteractionHandler(
          this.gameEngine,
          this.debug
      );
      this.gameEngine.interactionHandler = this.interactionHandler;

      this.debug.attachEngine(this.gameEngine);

      requestAnimationFrame(() => {
          this.gameEngine.start();
      });
    }
}

