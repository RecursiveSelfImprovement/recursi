class CurrentWorkPage {
    // =========================================================================
    // RENDER ROUTINE
    // Generates a beautiful, vertically scrollable editorial column
    // matching the spacious aesthetic of the AI Perspective page.
    // =========================================================================
    render(app) {
      this.app = app;
      this.applyStyles();

      const content = CurrentWorkPage.PAGE_CONTENT;
      const mainContainer = makeElement("div", {className: "current-work-editorial-wrapper"});

      // 1. Status Notice Block
      mainContainer.appendChild(this.buildStatusCard(content.statusBanner));

      // 2. Narrative Column Block
      mainContainer.appendChild(this.buildNarrativeCard(content.narrativeColumn));

      // 3. Spaced-out Scrollable Editorial Stream
      mainContainer.appendChild(this.buildEditorialStream(content.sections));

      return mainContainer;
    }

    buildIntroBlock(app) {
      const p1 = [
        "This section showcases the environment I have spent the last year ",
        "developing. It represents an absolutely ",
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
        makeElement("div", { className: "flex items-center gap-2 text-blue-400 font-mono text-xs bg-blue-950/20 border border-blue-500/20 p-3 rounded" }, [
          makeElement("span", {}, "Status: In-Progress Vibe Coding Environment"),
          makeElement("span", { className: "text-blue-500/60" }, "|"),
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
              "Vibe Coding space."
            ].join(""),
            "⚙️ Self-Improving Code"
          ),
          this.buildHighlightCard(
            "AccuDraw & SmartLine Core Bridge",
            [
              "Tying the workspace back to my 1994 CAD interface innovations. ",
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
              "By creating an independent visual development platform, this workspace ",
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

    // =========================================================================
    // VIDEO PLAYER INITIALIZATION
    // =========================================================================
    loadVideoIntoPlayer(playerId, videoId) {
      const container = document.getElementById(playerId);
      if (!container) return;

      container.innerHTML = "";

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
            endTime: 3600
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
          border: "none",
          aspectRatio: "16/9"
        },
        allow: "autoplay; encrypted-media",
        allowfullscreen: "true"
      });
      container.appendChild(iframe);
    }

    // =========================================================================
    // COMPACT DYNAMIC STYLESHEET
    // =========================================================================
    
  
  static get PAGE_CONTENT() {
      return {
        videoIds: {
          mainWalkthrough: "sDSFBj6MuzY",
          playlistAndPiano: "ply26G4DdcM",
          loremIpsumDemo: "dQw4w9WgXcQ",
          digitalArtDemo: "7VV6poSrk3Y"
        },

        statusBanner: {
          title: "Presentation Enhancements In Progress",
          paragraphs: [
            [
              "Please note that this section is actively being enhanced. The explanatory ",
              "materials, text documentation, and technical demonstration videos are currently ",
              "being trimmed down, edited, and updated to be significantly shorter, more concise, ",
              "and directly to the point. However, the software product itself is fully complete, ",
              "functional, and structurally sound. It has already been shared publicly (though not yet widely), ",
              "and a clear, viable path toward a broader launch is actively being pursued."
            ].join("")
          ]
        },

        narrativeColumn: {
          heading: "Foundational Moats, Earning Potential, and Personal Horizons",
          paragraphs: [
            [
              "Building recursively self-improving Visual and Vibe Coding environments requires ",
              "substantial stability, time, and focus. There is a stark, undeniable contrast between ",
              "authoring core UX paradigms (such as AccuDraw and SmartLine) that historically created ",
              "an estimated $2.3 billion in return on investment for major enterprise CAD vendors, ",
              "and the disruptive personal dislocations of the recent past. Navigating a sudden, ",
              "politically motivated firing, combined with the profound emotional strain of having a ",
              "historically exceptionally close relationship with my daughter disrupted after her mother ",
              "relocated her, has deeply impacted the pacing of this work."
            ].join(""),
            [
              "How much of this personal history is ultimately woven into the public launch material ",
              "remains a decision currently under active consideration. To be completely clear: if ",
              "extreme personal or financial circumstances-such as being forced out on the street ",
              "by family trustees-leave me with no other viable path, there exists a strong, inherent ",
              "incentive to fully document and tell that story as a central pillar of this project's ",
              "broader narrative. For now, the primary goal remains delivering exceptional developer ",
              "tools, but the high-leverage human stakes behind this transition remain undeniable."
            ].join("")
          ]
        },

        sections: [
          {
            id: "main-walkthrough",
            title: "1. Core Technical Walkthrough & Vibe Coding Engine",
            videoIdKey: "mainWalkthrough",
            isLengthy: true,
            apologyText: [
              "We apologize for the length of this primary technical demonstration; it is currently ",
              "quite lengthy and is actively scheduled to be trimmed down to a shorter version. ",
              "However, there is a wealth of core architectural insights, live AST compilation flows, and ",
              "recursively self-improving code demonstrations here that make it highly worth watching in full."
            ].join(""),
            description: [
              "This primary walkthrough demonstrates how the browser-based environment uses natural language ",
              "prompts to recursively inspect, refactor, and rewrite its own JavaScript source files on the fly. ",
              "It shows how abstract syntax trees (ASTs) are safely managed client-side without relying on ",
              "unstable, multi-layered server environments or dynamic backends."
            ].join("")
          },
          {
            id: "playlist-piano",
            title: "2. Ad-Free YouTube Playlists & Visual Piano Keyboard",
            videoIdKey: "playlistAndPiano",
            isLengthy: false,
            description: [
              "This demonstration showcases two highly impressive capabilities of the current system. First, ",
              "it highlights an ad-free YouTube playlist aggregator that allows users to stream, organize, ",
              "and play video feeds completely within the terms of service while bypassing standard distraction overlays. ",
              "Second, it highlights my proprietary digital piano software, featuring sub-millisecond visual latency ",
              "built using visual layouts first established in my early CAD days."
            ].join("")
          },
          {
            id: "lorem-ipsum-demo",
            title: "3. Lorem Ipsum Workspace Environment",
            videoIdKey: "loremIpsumDemo",
            isLengthy: false,
            description: [
              "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras interdum pretium tempor. ",
              "Donec rhoncus elit non accumsan scelerisque. Vivamus scelerisque tempus arcu, ac eleifend ",
              "ex semper a. Aliquam id arcu sit amet erat ultrices congue ut ac lorem."
            ].join("")
          },
          {
            id: "visual-art-demo",
            title: "4. Interactive Screen Layouts & Media Player Showcase",
            videoIdKey: "digitalArtDemo",
            isLengthy: false,
            description: [
              "This workspace showcases responsive, full-screen layouts that dynamically adjust viewports ",
              "and interactive media streams to build a highly engaging client-side application interface."
            ].join("")
          }
        ]
      };
    }

  buildStatusCard(statusData) {
      return makeElement("div", {className: "current-work-status-banner mb-6"}, [
        makeElement("div", {className: "flex items-center gap-2 mb-3"}, [
          makeElement("h3", {className: "text-base font-bold text-amber-500 uppercase tracking-wider"}, statusData.title)
        ]),
        ...statusData.paragraphs.map(p => makeElement("p", {className: "text-sm text-[var(--text-secondary)] leading-relaxed"}, p))
      ]);
    }

  buildNarrativeCard(narrativeData) {
      const children = [
        makeElement("h2", {className: "text-xl font-black text-[var(--text-title)] mb-4"}, narrativeData.heading)
      ];

      narrativeData.paragraphs.forEach(p => {
        children.push(makeElement("p", {className: "narrative-editorial-paragraph mb-4"}, p));
      });

      return makeElement("div", {className: "backstory-gradient-card mb-8"}, children);
    }

  buildEditorialStream(sections) {
      const stream = makeElement("div", {className: "video-editorial-stream space-y-12"});

      sections.forEach(sec => {
        stream.appendChild(this.buildVideoEditorialBlock(sec));
      });

      return makeElement("section", {className: "cad-panel"}, [
        makeElement("div", {className: "dashboard-header-group mb-8"}, [
          makeElement("h2", {
            className: "text-xl font-bold text-[var(--text-title)] uppercase tracking-wider",
            style: {fontFamily: "ui-monospace, monospace"}
          }, "Prototype Demonstration Stream"),
          makeElement("p", {className: "text-sm text-[var(--text-secondary)] mt-1"},
            "A vertical narrative flow demonstrating the visual development interface in action. Scroll down to view all systems."
          )
        ]),
        stream
      ]);
    }

  

  buildVideoEditorialBlock(section) {
      const content = CurrentWorkPage.PAGE_CONTENT;
      const videoId = content.videoIds[section.videoIdKey];
      const playerId = `current-work-player-${section.id}`;

      const children = [
        makeElement("h3", { className: "text-lg font-black text-[var(--text-title)] mb-3" }, section.title)
      ];

      if (section.isLengthy && section.apologyText) {
        children.push(this.buildLengthNotice(section));
      }

      children.push(makeElement("p", { className: "text-sm text-[var(--text-primary)] leading-relaxed mb-6" }, section.description));

      const videoFrame = this.buildVideoFrameContainer(playerId, videoId);
      children.push(makeElement("div", { className: "editorial-video-frame-wrapper mb-4 shadow-xl" }, videoFrame));

      children.push(makeElement("p", { className: "text-xs text-[var(--text-secondary)] italic opacity-80" },
        `Active Feed Link: https://www.youtube.com/watch?v=${videoId}`
      ));

      return makeElement("div", { className: "video-editorial-block pb-10 border-b border-[var(--border-color)] last:border-0 last:pb-0 last:mb-0" }, children);
    }

  buildLengthNotice(section) {
      return makeElement("div", { className: "video-editorial-apology-box mb-4" }, [
        makeElement("span", { className: "text-amber-500 font-mono font-bold block mb-1 text-xs uppercase tracking-wider" }, "Length & Polish Notice"),
        makeElement("p", { className: "text-xs text-[var(--text-secondary)] leading-relaxed italic" }, section.apologyText)
      ]);
    }

  buildVideoFrameContainer(playerId, videoId) {
      return makeElement("div", {
        id: playerId,
        className: "editorial-video-frame-container",
        style: { minHeight: "360px", backgroundColor: "#020306" }
      }, [
        makeElement("div", { className: "editorial-video-placeholder-overlay p-8" }, [
          makeElement("span", { style: { fontSize: "44px", marginBottom: "12px", display: "block" } }, "🎥"),
          makeElement("button", {
            className: "copy-prompt-btn",
            onclick: () => this.loadVideoIntoPlayer(playerId, videoId)
          }, "Play Video Demonstration")
        ])
      ]);
    }

  applyStyles() {
      this.applyEditorialLayoutCSS();
      this.applyEditorialVideoCSS();
    }

  applyEditorialLayoutCSS() {
      applyCss([
        ".current-work-editorial-wrapper {",
        "  display: flex;",
        "  flex-direction: column;",
        "  gap: 36px;",
        "  max-width: 900px;",
        "  margin: 0 auto;",
        "  width: 100%;",
        "}",
        ".current-work-status-banner {",
        "  background-color: rgba(245, 158, 11, 0.04);",
        "  border: 1px solid rgba(245, 158, 11, 0.2);",
        "  padding: 24px;",
        "  border-radius: 12px;",
        "  margin-bottom: 24px;",
        "}",
        ".status-alert-icon {",
        "  font-size: 16px;",
        "}",
        ".narrative-editorial-paragraph {",
        "  font-size: 15px;",
        "  color: var(--text-primary);",
        "  line-height: 1.85;",
        "}"
      ].join("\n"), "current-work-layout-styles");
    }

  applyEditorialVideoCSS() {
      applyCss([
        ".video-editorial-stream {",
        "  display: flex;",
        "  flex-direction: column;",
        "  margin-top: 24px;",
        "}",
        ".video-editorial-block {",
        "  display: flex;",
        "  flex-direction: column;",
        "  margin-bottom: 40px;",
        "}",
        ".video-editorial-apology-box {",
        "  background-color: rgba(245, 158, 11, 0.05);",
        "  border-left: 3px solid #f59e0b;",
        "  padding: 16px 20px;",
        "  border-radius: 0 8px 8px 0;",
        "}",
        ".editorial-video-frame-wrapper {",
        "  border: 1px solid var(--border-color);",
        "  border-radius: 12px;",
        "  overflow: hidden;",
        "  background-color: #010204;",
        "  transition: border-color 0.2s ease;",
        "}",
        ".editorial-video-frame-wrapper:hover {",
        "  border-color: var(--border-hover);",
        "}",
        ".editorial-video-frame-container {",
        "  width: 100%;",
        "  aspect-ratio: 16/9;",
        "  display: flex;",
        "  align-items: center;",
        "  justify-content: center;",
        "  position: relative;",
        "}",
        ".editorial-video-placeholder-overlay {",
        "  display: flex;",
        "  flex-direction: column;",
        "  align-items: center;",
        "  justify-content: center;",
        "  text-align: center;",
        "  width: 100%;",
        "  height: 100%;",
        "}"
      ].join("\n"), "current-work-video-styles");
    }
}