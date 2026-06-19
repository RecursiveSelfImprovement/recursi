class CurrentWorkPage {
    render(app) {
      this.applyStyles();
      const container = makeElement("div", { className: "space-y-8 pb-12" });
      container.appendChild(this.buildIntroBlock(app));
      container.appendChild(this.buildSystemHighlightsGrid(app));
      container.appendChild(this.buildVideoShowcase(app));
      return container;
    }

    buildIntroBlock(app) {
      const p1 = [
        "This section showcases the prototype system I have spent the last year ",
        "developing. While officially labeled as 'incomplete,' it represents an absolutely ",
        "state-of-the-art recursively self-improving Vibe Coding environment. By integrating ",
        "my foundational 1994 AccuDraw and SmartLine paradigms with modern generative language models, ",
        "this tool allows developers to build systems that actively write and refactor themselves."
      ].join("");

      const p2 = [
        "In contrast to taking a low-level, menial job - which would have guaranteed long-term ",
        "mathematical insolvency - investing this past year into building high-leverage intellectual ",
        "property puts me in a far superior professional position. This technology represents a viable ",
        "commercial pathway, whether through securing a highly specialized position at Bentley Systems, ",
        "entering the fast-growing San Francisco AI sector, or establishing a modern online programming school ",
        "(a direction my mother had always hoped I would pursue). Unlike hourly development work, which is ",
        "extremely vulnerable to AI automation, this system is designed to generate passive income and a ",
        "sustainable, 15-year career runway."
      ].join("");

      return makeElement("div", { className: "backstory-gradient-card" }, [
        makeElement("h3", { className: "text-xl font-bold text-[var(--text-title)]" }, "Recursively Self-Improving Vibe Coding Environment"),
        makeElement("p", { className: "backstory-paragraph-highlight" }, p1),
        makeElement("p", { className: "backstory-paragraph" }, p2),
        makeElement("div", { className: "flex items-center gap-2 text-amber-500 font-mono text-xs bg-amber-950/20 border border-amber-500/20 p-3 rounded" }, [
          makeElement("span", {}, "⚠️ Status: In-Progress State-of-the-Art Prototype"),
          makeElement("span", { className: "text-amber-500/60" }, "|"),
          makeElement("span", {}, "AccuDraw & SmartLine Unified Core")
        ])
      ]);
    }

    buildSystemHighlightsGrid(app) {
      return makeElement("section", { className: "cad-panel space-y-6" }, [
        makeElement("h2", { 
          className: "text-xl font-bold text-[var(--text-title)] uppercase tracking-wide", 
          style: { fontFamily: "ui-monospace, monospace" } 
        }, "Key System Pathways"),
        
        makeElement("div", { className: "elder-analysis-grid" }, [
          this.buildHighlightCard(
            "Recursive System Generation",
            [
              "The system writes, refactors, and deploys its own codebase in real-time. ",
              "Instead of just writing static code, the application uses AI to recursively ",
              "expand its own capabilities, making it one of the unique tools in the hot ",
              "Vibe Coding space - which was recently highlighted by Collins Dictionary as ",
              "the technical Word of the Year last year."
            ].join(""),
            "⚙️ Self-Improving Code"
          ),
          this.buildHighlightCard(
            "AccuDraw & SmartLine Core Bridge",
            [
              "Tying the prototype back to my 1994 CAD interface innovations. ",
              "By combining real-time coordinate guidance and hotkey drafting ",
              "with natural language inputs, the tool creates an incredibly fast ",
              "visual engineering environment."
            ].join(""),
            "🎯 CAD Heritage Integration"
          ),
          this.buildHighlightCard(
            "The Educational Pathway (Online School)",
            [
              "An option that allows me to build an online academy teaching next-generation ",
              "Vibe Coding and visual layout tools. This fulfills my mother's long-standing wish ",
              "for me to teach, offering a rewarding career that could last the next 15 years."
            ].join(""),
            "🎓 Teaching & Mentorship"
          ),
          this.buildHighlightCard(
            "Passive Income Generation",
            [
              "Hourly software engineering is highly vulnerable to rapid AI automation. ",
              "By creating an independent visual development platform, this prototype ",
              "creates a path toward subscription and license-based passive income, ",
              "safeguarding against future labor shifts."
            ].join(""),
            "💰 Non-Hourly Solvency"
          )
        ])
      ]);
    }

    buildHighlightCard(title, text, badge) {
      return makeElement("div", { className: "elder-analysis-card" }, [
        makeElement("div", { className: "flex justify-between items-center mb-3" }, [
          makeElement("span", { className: "elder-card-badge" }, badge),
        ]),
        makeElement("h4", { className: "text-base font-bold text-[var(--text-title)] mb-2" }, title),
        makeElement("p", { className: "text-sm text-[var(--text-secondary)] leading-relaxed" }, text)
      ]);
    }

    buildVideoShowcase(app) {
      return makeElement("section", { className: "cad-panel space-y-6" }, [
        makeElement("h3", { 
          className: "text-lg font-bold text-[var(--text-title)] uppercase tracking-wide",
          style: { fontFamily: "ui-monospace, monospace" }
        }, "Technical Video Demonstrations"),
        makeElement("p", { className: "text-sm text-[var(--text-secondary)]" }, 
          "Watch the prototype's self-generating interface and CAD core in action."
        ),
        makeElement("div", { className: "elder-analysis-grid" }, [
          this.buildVideoCard("System Walkthrough & Vibe Coding Core", "vibe-player-1"),
          this.buildVideoCard("AccuDraw Interface & AI Integration", "vibe-player-2")
        ])
      ]);
    }

    buildVideoCard(title, playerId) {
      return makeElement("div", { className: "elder-analysis-card flex flex-col justify-between" }, [
        makeElement("h4", { className: "text-sm font-bold text-[var(--text-title)] mb-4" }, title),
        makeElement("div", {
          id: playerId,
          className: "bg-black rounded-lg overflow-hidden border border-[var(--border-color)] aspect-video flex flex-col items-center justify-center p-4 text-center",
          style: { minHeight: "180px" }
        }, [
          makeElement("span", { style: { fontSize: "32px", marginBottom: "8px" } }, "🎥"),
          makeElement("button", {
            className: "copy-prompt-btn",
            onclick: () => this.loadVideoIntoPlayer(playerId)
          }, "Play Video Demonstration")
        ]),
        makeElement("p", { className: "text-xs text-[var(--text-secondary)] mt-3 italic" }, "Click to initialize the Video Player.")
      ]);
    }

    loadVideoIntoPlayer(playerId) {
      const container = document.getElementById(playerId);
      if (!container) return;

      container.innerHTML = "";
      
      const videoId = playerId === "vibe-player-1" ? "ply26G4DdcM" : "dQw4w9WgXcQ";

      try {
        if (window.VideoPlayer) {
          new VideoPlayer({
            container: container,
            containerId: playerId,
            playerType: "youtube",
            videoId: videoId,
            autoplay: true,
            controls: true,
            startTime: 0,
            endTime: 120
          });
        } else {
          this.useIframeFallback(container, videoId);
        }
      } catch (e) {
        this.useIframeFallback(container, videoId);
      }
    }

    useIframeFallback(container, videoId) {
      container.innerHTML = "";
      const iframe = makeElement("iframe", {
        src: `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1`,
        style: {
          width: "100%",
          height: "100%",
          border: "none"
        },
        allow: "autoplay; encrypted-media",
        allowfullscreen: "true"
      });
      container.appendChild(iframe);
    }

    applyStyles() {
      // Dynamic styles
    }
  }