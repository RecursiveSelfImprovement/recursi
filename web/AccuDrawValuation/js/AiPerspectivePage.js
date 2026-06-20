class AiPerspectivePage {
    render(app) {
      this.app = app;
      this.activeModalPlayer = null;
      this.applyStyles();
      return this.buildPage();
    }

    buildAIPerspectivePanel(app) {
      const pIntroHighlight = [
        "The velocity of AI automation has created an urgent, narrow window for career restoration. ",
        "The conventional advice to 'take any low-level, menial job now and rebuild your career later' ",
        "is mathematically and structurally blind to this timeline. Spending a year in survival-level labor ",
        "at this critical juncture means missing the foundational generative AI transition entirely. ",
        "By the time one tries to return, standard software syntax and interaction modeling will be ",
        "fully automated, permanently closing the door on my ability to leverage my extremely rare visual systems engineering skills."
      ].join("");

      const pIntroBody = [
        "With technology changing faster than at any point in human history, the opportunity cost of forced ",
        "professional exile is absolute. This analysis demonstrates why establishing an immediate, ",
        "focused technical runway is a matter of urgent survival, and why forcing an inventor with a history of ",
        "creating billions in value into low-level work is a permanent destruction of human capital."
      ].join("");

      const pEssay1 = [
        "I believe we are on the cusp of an era where AI and Robotics will replace almost every single ",
        "job. This is an incredibly difficult thing for many to accept because it challenges our ",
        "fundamental assumptions about society-specifically, the link between work, income, and ",
        "basic survival. The assumption that we must sell our labor to live makes the prospect of ",
        "widespread automation feel like an immediate sentence of starvation, but that is a structural ",
        "issue we must solve, not an indictment of the technology's capability."
      ].join("");

      const pEssay2 = [
        "A common bias is to look at your own profession and assert: 'AI won't replace my job ",
        "because my role has these unique, highly complex challenges.' This is a dangerous ",
        "defense mechanism. I believe it is smarter to step back, analyze the larger trajectory across ",
        "multiple industries, and look honestly at the rate of improvement."
      ].join("");

      const pEssay3 = [
        "To visually demonstrate this speed, I focus here on graphics, film, special effects, ",
        "and animation. I select this domain not because it is more complex than other jobs, but ",
        "because it communicates visually. Having spent over 45 years in this field-obsessing ",
        "over 35mm in-camera effects in the late 70s, learning traditional industrial rendering in ",
        "the 80s, and later developing advanced 3D systems-I have a deep understanding of what it ",
        "conventionally takes to build these visuals."
      ].join("");

      const pEssay4 = [
        "What we are seeing today is not 'computer graphics' in the conventional sense. This is not ",
        "the result of humans writing complex rendering equations or hardcoding lighting rules. These ",
        "are generative models that have emerged with the ability to look at millions of data points, ",
        "figure seriously complex structures out, and execute them perfectly on their own."
      ].join("");

      return makeElement("div", { className: "ai-editorial-container" }, [
        makeElement("div", { className: "backstory-gradient-card" }, [
          makeElement("h3", { className: "text-xl font-bold text-[var(--text-title)]" }, "The Core Thesis: Automation Timing & Career Recovery"),
          makeElement("p", { className: "backstory-paragraph-highlight" }, pIntroHighlight),
          makeElement("p", { className: "backstory-paragraph" }, pIntroBody)
        ]),

        makeElement("article", { className: "ai-essay-card" }, [
          makeElement("h1", { className: "ai-essay-title" }, "The Great Convergence: Why AI and Robotics Will Replace All Human Labor"),
          makeElement("p", { className: "ai-essay-p" }, pEssay1),
          makeElement("p", { className: "ai-essay-p" }, pEssay2),
          makeElement("p", { className: "ai-essay-p" }, pEssay3),

          makeElement("div", { className: "ai-section-break" }, [
            makeElement("h2", { className: "ai-section-heading" }, "1. The Paradigm Shift from Algorithms to 'Intuition'")
          ]),

          makeElement("p", { className: "ai-essay-p" }, pEssay4),
          makeElement("p", { className: "ai-essay-p" }, 
            "We understand how these models learn and compose outputs about as well as we understand how the human brain does-which is to say, very little. But the outputs are undeniable."
          ),

          this.buildNewAIMediaCard(
            "Star Wars De-Aging & Character Generation",
            [
              "De-aging actors via conventional 3D graphics is incredibly hard, expensive, ",
              "and almost always looks slightly wrong, landing in the 'uncanny valley.' ",
              "Today, AI models do it without missing a beat, and you simply cannot tell."
            ].join(""),
            "/AIImages/star_wars_deaged.png",
            [
              "Luke, Leia, and Lando young again-perfectly realized without human artists spent on ",
              "years of painstaking manual work. It is done for dirt cheap, and it is orders of ",
              "magnitude better than it was a year ago. Every small glitch you see today will be gone tomorrow."
            ].join("")
          ),

          this.buildNewAIMediaCard(
            "The 24-Hour Hobbyist Pigeon Animation",
            [
              "This short sequence was put together by a hobbyist in a single afternoon. To produce ",
              "this conventionally, an animation instructor notes it would take a talented student ",
              "an entire semester to a year of intense labor."
            ].join(""),
            "/AIImages/pigeon_animation.png",
            [
              "While a keen eye can count a couple of minor glitches-a slight foot error or background change ",
              "- it is staggeringly good. This is computer 'intuition' bypassing years of conventional ",
              "training and thousands of hours of manual frame rendering."
            ].join("")
          ),

          makeElement("div", { className: "ai-section-break" }, [
            makeElement("h2", { className: "ai-section-heading" }, "2. Mapping the Trajectory")
          ]),

          makeElement("p", { className: "ai-essay-p" }, 
            "The key is to map the exponential curve. Below is a simple experiment I ran using the exact same prompt across a 14-month window. The leap in capability in just over a year is staggering:"
          ),

          makeElement("div", { className: "ai-dual-grid" }, [
            this.buildAIImageFrame("/AIImages/trajectory_14m_left.png", "14 Months Ago: Fragmented details, low visual cohesion"),
            this.buildAIImageFrame("/AIImages/trajectory_14m_right.png", "Today: Photorealistic lighting, perfect composition")
          ]),

          makeElement("p", { className: "ai-essay-p", style: { marginTop: "24px" } }, 
            "We went from abstract, barely usable outlines to professional-grade illustrations in a little over a year. Next came the ability to feed the model an existing image and modify it dynamically with perfect contextual awareness."
          ),

          this.buildNewAIMediaCard(
            "Google's 'Nano Banana' Reflection Experiment",
            [
              "I ran an experiment taking a photo of a car with an ugly background, asking a free model ",
              "to replace it. It did not just swap the background-it calculated and painted photorealistic ",
              "reflections on the car's body matching the new environment."
            ].join(""),
            "/AIImages/car_reflections_nano.png",
            [
              "This requires a deep, structural understanding of materials, lighting, and shape. To achieve ",
              "this in Photoshop or Blender would require hours of tedious manual masks and ray-tracing. ",
              "The AI did it instantly. This is not a 'collage' of existing internet photos-this is true spatial comprehension."
            ].join("")
          ),

          this.buildNewAIMediaCard(
            "Pretty Row of Houses Reconstructed as a Line Drawing",
            [
              "Starting with a single photo I took of a row of houses, the model was asked to redraw the ",
              "scene as a clean line drawing from a completely different perspective angle."
            ].join(""),
            "/AIImages/houses_line_drawing.png",
            [
              "To do this, the model must understand the three-dimensional geometry of the buildings, translate ",
              "the textures into line weight, and project the objects accurately from a new virtual camera path. ",
              "It did so without a single human drawing a line."
            ].join("")
          ),

          makeElement("div", { className: "ai-section-break" }, [
            makeElement("h2", { className: "ai-section-heading" }, "3. Connecting the Dots Across All Fields")
          ]),

          makeElement("p", { className: "ai-essay-p" }, 
            "It is easy to dismiss this as 'silly pictures and video tools' and assume your white-collar, spreadsheet-heavy, or programming-related job is safe. But you must connect the dots. The people who conventionally do this graphical work are brilliant, highly technical creatives-and today, the machine does their job better, faster, and for free."
          ),

          makeElement("p", { className: "ai-essay-p" }, 
            "I see this shift even more acutely in computer programming. The machine's ability to generate, debug, and refactor complex system code is expanding at a rate that is already automating traditional software maintenance. While programming syntax does not communicate as easily as film and animation, it is absolutely leading the pack of AI capabilities."
          ),

          makeElement("p", { className: "ai-essay-p" }, 
            "The researchers building these models are paid enormous sums today, but they are fully aware that they are actively training the very systems that will soon render their own coding jobs obsolete. The idea that automation will simply create 170 million 'new' jobs is a comfortable myth; those new jobs will themselves be automated almost instantly."
          ),

          this.buildNewAIMediaCard(
            "The Leap in Physical Robotics",
            [
              "While AI manages the digital realm, physical robots are improving just as fast. They are moving ",
              "out of research labs and into structured warehouses, factories, and manual labor roles, closing ",
              "the gap between digital and physical tasks."
            ].join(""),
            "/AIImages/robotics_one_minute.png",
            [
              "A compilation of the state of the art in physical robotics. Once these systems are fully integrated ",
              "with localized multimodal AI models, the economic incentive to utilize human physical labor will ",
              "disappear entirely."
            ].join("")
          ),

          makeElement("p", { 
            className: "ai-essay-p", 
            style: { 
              marginTop: "40px", 
              fontWeight: "600", 
              borderTop: "1px solid var(--border-color)", 
              paddingTop: "24px" 
            } 
          }, 
            "We are heading toward a convergence where every economically valuable human task will be done better, faster, and far cheaper by machines. Rather than hoping it won't happen or railing against energy usage, we must plan for it. For me, that means securing the transition runway now-putting my core skills in visual systems and conceptual design to work immediately before the window of standard software development is fully closed."
          )
        ])
      ]);
    }

    buildNewAIMediaCard(title, bodyText, imgSrc, footerText) {
      return makeElement("div", { className: "ai-media-block" }, [
        makeElement("div", { className: "ai-media-block-img-area" }, [
          makeElement("img", {
            src: imgSrc,
            alt: title,
            className: "exhibit-image w-full h-auto object-cover rounded-lg border border-[var(--border-color)] shadow-md",
            onerror: (e) => {
              e.target.style.display = "none";
              const fb = e.target.parentNode.querySelector(".exhibit-image-fallback");
              if (fb) fb.style.display = "flex";
            }
          }),
          makeElement("div", {
            className: "exhibit-image-fallback",
            style: {
              display: "none",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg-panel-inner)",
              border: "1px dashed var(--border-color)",
              borderRadius: "8px",
              width: "100%",
              height: "180px",
              color: "var(--text-secondary)",
              fontSize: "11px",
              fontFamily: "ui-monospace, monospace",
              padding: "16px",
              textAlign: "center"
            }
          }, [
            makeElement("span", { style: { fontSize: "24px", marginBottom: "8px" } }, "🖼️"),
            makeElement("span", { className: "font-bold text-xs text-[var(--text-title)]" }, title),
            makeElement("span", { style: { fontSize: "9px", marginTop: "4px", opacity: 0.6 } }, `Asset: ${imgSrc}`)
          ])
        ]),
        makeElement("div", { className: "ai-media-block-desc" }, [
          makeElement("h4", { className: "ai-media-block-title" }, title),
          makeElement("p", { className: "ai-media-block-body" }, bodyText),
          makeElement("p", { className: "ai-media-block-footer" }, footerText)
        ])
      ]);
    }

    buildAIImageFrame(imgSrc, caption) {
      return makeElement("div", { className: "flex flex-col gap-2 p-3 bg-slate-900/40 border border-[var(--border-color)] rounded-lg" }, [
        makeElement("img", {
          src: imgSrc,
          alt: caption,
          className: "exhibit-image w-full h-auto object-cover rounded",
          onerror: (e) => {
            e.target.style.display = "none";
            const fb = e.target.parentNode.querySelector(".exhibit-image-fallback");
            if (fb) fb.style.display = "flex";
          }
        }),
        makeElement("div", {
          className: "exhibit-image-fallback",
          style: {
            display: "none",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-panel-inner)",
            border: "1px dashed var(--border-color)",
            borderRadius: "8px",
            width: "100%",
            height: "140px",
            color: "var(--text-secondary)",
            fontSize: "11px",
            fontFamily: "ui-monospace, monospace",
            padding: "12px",
            textAlign: "center"
          }
        }, [
          makeElement("span", { style: { fontSize: "18px", marginBottom: "4px" } }, "📷"),
          makeElement("span", { className: "font-bold text-xs" }, caption)
        ]),
        makeElement("span", { className: "text-xs text-[var(--text-secondary)] text-center font-semibold" }, caption)
      ]);
    }

    applyStyles() {
      applyCss(`
        .quora-reader-container {
          display: flex;
          flex-direction: column;
          gap: 40px;
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
        }
        
        .quora-post-card {
          background-color: var(--bg-panel);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }
        
        @media (min-width: 768px) {
          .quora-post-card {
            padding: 48px;
          }
        }

        .quora-question-title {
          font-size: 24px;
          font-weight: 800;
          color: var(--text-title);
          line-height: 1.35;
          margin-bottom: 24px;
          letter-spacing: -0.01em;
        }
        
        @media (min-width: 768px) {
          .quora-question-title {
            font-size: 30px;
          }
        }

        .quora-author-row {
          display: flex;
          align-items: center;
          gap: 16px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 24px;
          margin-bottom: 32px;
        }

        .quora-author-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 16px;
          flex-shrink: 0;
          box-shadow: 0 4px 10px rgba(59, 130, 246, 0.3);
        }

        .quora-author-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .quora-author-name {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-title);
        }

        .quora-author-bio {
          font-size: 13px;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .quora-post-date {
          font-size: 11px;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        .quora-essay-stream {
          display: flex;
          flex-direction: column;
        }

        .quora-paragraph {
          font-size: 16px;
          line-height: 1.85;
          color: var(--text-primary);
          margin-bottom: 24px;
        }

        .quora-paragraph strong {
          color: var(--text-title);
        }

        .quora-section-title {
          font-size: 18px;
          font-weight: 800;
          color: var(--text-title);
          margin: 44px 0 20px 0;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-family: ui-monospace, monospace;
          border-left: 4px solid #3b82f6;
          padding-left: 16px;
        }

        .quora-image-card, .quora-video-card {
          background-color: var(--bg-panel-inner);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          overflow: hidden;
          margin: 32px 0;
          transition: border-color 0.2s ease, transform 0.2s ease;
        }

        .quora-image-card:hover, .quora-video-card:hover {
          border-color: var(--border-hover);
        }

        .quora-image-wrapper, .quora-video-thumbnail-wrapper {
          position: relative;
          cursor: pointer;
          overflow: hidden;
          background-color: #000;
        }

        .quora-image {
          width: 100%;
          height: auto;
          display: block;
          transition: transform 0.3s ease;
        }

        .quora-image-wrapper:hover .quora-image {
          transform: scale(1.02);
        }

        .quora-image-hover-overlay, .quora-video-play-overlay {
          position: absolute;
          inset: 0;
          background-color: rgba(5, 7, 18, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .quora-image-wrapper:hover .quora-image-hover-overlay {
          opacity: 1;
        }

        .quora-image-hover-overlay span {
          background-color: rgba(15, 23, 42, 0.85);
          color: #ffffff;
          padding: 8px 18px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .quora-image-info, .quora-video-info {
          padding: 20px 24px;
          border-top: 1px solid var(--border-color);
        }

        .quora-image-caption {
          font-size: 13.5px;
          color: var(--text-secondary);
          line-height: 1.6;
          font-style: italic;
          display: block;
        }

        .quora-video-thumbnail {
          width: 100%;
          height: auto;
          aspect-ratio: 16 / 9;
          object-fit: cover;
          display: block;
          transition: transform 0.3s ease;
        }

        .quora-video-thumbnail-wrapper:hover .quora-video-thumbnail {
          transform: scale(1.02);
        }

        .quora-video-thumbnail-wrapper .quora-video-play-overlay {
          opacity: 1;
        }

        .quora-video-play-btn {
          width: 64px;
          height: 64px;
          background: radial-gradient(circle, #3b82f6 0%, #1d4ed8 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 20px rgba(29, 78, 216, 0.4);
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
          border: 2px solid rgba(255, 255, 255, 0.2);
        }

        .quora-video-thumbnail-wrapper:hover .quora-video-play-btn {
          transform: scale(1.1);
          box-shadow: 0 10px 28px rgba(29, 78, 216, 0.65);
        }

        .quora-video-play-icon {
          color: #ffffff;
          font-size: 22px;
          margin-left: 4px;
        }

        .quora-video-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-title);
          margin-bottom: 6px;
        }

        .quora-video-caption {
          font-size: 13.5px;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .quora-dalle-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          margin: 32px 0;
        }
        
        @media (min-width: 640px) {
          .quora-dalle-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .quora-car-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin: 32px 0;
        }
        
        @media (min-width: 768px) {
          .quora-car-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .ai-lightbox-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background-color: rgba(5, 7, 18, 0.85);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.25s cubic-bezier(0.25, 1, 0.5, 1);
        }

        .ai-lightbox-overlay.is-active {
          opacity: 1;
          pointer-events: auto;
        }

        .ai-lightbox-dialog {
          width: 90vw;
          max-width: 1000px;
          background-color: var(--bg-panel);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
          overflow: hidden;
          position: relative;
          transform: scale(0.9) translateY(20px);
          opacity: 0;
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
        }

        .ai-lightbox-overlay.is-active .ai-lightbox-dialog {
          transform: scale(1) translateY(0);
          opacity: 1;
        }

        .ai-lightbox-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background-color: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          font-size: 18px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
          transition: all 0.2s ease;
        }

        .ai-lightbox-close:hover {
          background-color: rgba(255, 255, 255, 0.25);
          transform: scale(1.05);
        }

        .ai-lightbox-content {
          background-color: #000000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ai-lightbox-img {
          max-width: 100%;
          max-height: 70vh;
          object-fit: contain;
          display: block;
        }

        .ai-lightbox-video-frame {
          width: 100%;
          aspect-ratio: 16 / 9;
          background-color: #000;
        }

        .ai-lightbox-caption {
          padding: 20px 24px;
          background-color: var(--bg-panel);
          border-top: 1px solid var(--border-color);
        }

        .ai-lightbox-title {
          font-size: 16px;
          font-weight: 800;
          color: var(--text-title);
          display: block;
          margin-bottom: 4px;
        }

        .ai-lightbox-subtitle {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
        }
      `, 'ai-perspective-quora-styles');
    }
  
  buildPage() {
      return makeElement('div', { className: 'quora-reader-container' }, [
        this.buildContextCard(),
        this.buildQuoraPost()
      ]);
    }

  buildContextCard() {
      const pIntroHighlight = [
        "The velocity of AI automation has created an urgent, narrow window for career restoration. ",
        "The conventional advice to 'take any low-level, menial job now and rebuild your career later' ",
        "is mathematically and structurally blind to this timeline. Spending a year in survival-level labor ",
        "at this critical juncture means missing the foundational generative AI transition entirely. ",
        "By the time one tries to return, standard software syntax and interaction modeling will be ",
        "fully automated, permanently closing the door on my ability to leverage my extremely rare visual systems engineering skills."
      ].join("");

      const pIntroBody = [
        "With technology changing faster than at any point in human history, the opportunity cost of forced ",
        "professional exile is absolute. Below is one of my typical Quora posts on the subject. In this post, ",
        "I concentrate mostly on a particular side of AI - graphics and video - focusing on the Star Wars fan ",
        "creations to illustrate the sheer velocity of change, and why establishing an immediate, focused ",
        "technical runway is a matter of urgent survival."
      ].join("");

      return makeElement('div', { className: 'backstory-gradient-card' }, [
        makeElement('h3', { className: 'text-xl font-bold text-[var(--text-title)]' }, 'The Core Thesis: Automation Timing & Career Recovery'),
        makeElement('p', { className: 'backstory-paragraph-highlight' }, pIntroHighlight),
        makeElement('p', { className: 'backstory-paragraph' }, pIntroBody)
      ]);
    }

  buildQuoraPost() {
      return makeElement('article', { className: 'quora-post-card' }, [
        makeElement('h1', { className: 'quora-question-title' }, 'Do you believe AI will replace most all professions?'),
        this.buildQuoraAuthorRow(),
        this.buildQuoraEssayContent()
      ]);
    }

  buildQuoraAuthorRow() {
      return makeElement('div', { className: 'quora-author-row' }, [
        makeElement('div', { className: 'quora-author-avatar' }, 'RB'),
        makeElement('div', { className: 'quora-author-info' }, [
          makeElement('span', { className: 'quora-author-name' }, 'Rob Brown'),
          makeElement('span', { className: 'quora-author-bio' }, 'Software developer with a whole lot of other interests'),
          makeElement('span', { className: 'quora-post-date' }, 'Updated June 19, 2026')
        ])
      ]);
    }

  buildQuoraEssayContent() {
      const stream = makeElement('div', { className: 'quora-essay-stream' });

      // First Quora paragraph
      stream.appendChild(makeElement('p', { className: 'quora-paragraph font-medium' }, 
        "Yes, I believe AI will replace most all professions. This is an incredibly difficult thing for many to accept because it challenges our fundamental assumptions about society - specifically, the link between work, income, and basic survival. The assumption that we must sell our labor to live makes the prospect of widespread automation feel like an immediate sentence of starvation, but that is a structural issue we must solve, not an indictment of the technology's capability."
      ));

      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, 
        "A common bias is to look at your own profession and assert: 'AI won't replace my job because my role has these unique, highly complex challenges.' This is a dangerous defense mechanism. I believe it is smarter to step back, analyze the larger trajectory across multiple industries, and look honestly at the rate of improvement."
      ));

      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, 
        "To visually demonstrate this speed, I focus here on graphics, film, special effects, and animation. I select this domain not because it is more complex than other jobs, but because it communicates visually. Having spent over 45 years in this field - obsessing over 35mm in-camera effects in the late 70s, learning traditional industrial rendering in the 80s, and later developing advanced 3D systems - I have a deep understanding of what it conventionally takes to build these visuals."
      ));

      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, 
        "What we are seeing today is not 'computer graphics' in the conventional sense. This is not the result of humans writing complex rendering equations or hardcoding lighting rules. These are generative AI models that have emerged with the ability to look at millions of data points, figure seriously complex structures out, and execute them perfectly on their own."
      ));

      // Section 1: Star Wars De-aging
      stream.appendChild(makeElement('h2', { className: 'quora-section-title' }, '1. The Star Wars Paradigm Shift'));
      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, 
        "Notice how AI already massively exceeds the ability of special effects professionals to do things like show an actor how they looked 50 years ago. It isn't just the de-aging; it's the special effects, environments, and complete scene composites that are just done on the cheap - done for almost nothing, with probably a 5,000 to 1 ratio as far as cost compared to traditional Hollywood studio production. To do this conventionally via 3D graphics is incredibly hard, expensive, and almost always lands in the 'uncanny valley.' Today, AI models do it without missing a beat, and you simply cannot tell."
      ));

      // Star Wars image
      stream.appendChild(this.buildImageCard(
        '/images/starWarsDeAging.webp',
        'Luke, Leia, and Lando Young Again',
        'Luke, Leia, Lando, etc. young again - perfectly realized without spending millions on studio rendering. The special effects are executed instantly on the cheap, with a cost disruption ratio exceeding 5,000 to 1 compared to legacy Hollywood techniques.'
      ));

      // Star Wars videos
      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, 
        "I suggest looking closely at these fan-made special effect restorations. Think about what is actually going on under the hood of these renders:"
      ));
      
      const swVideoGrid = makeElement('div', { className: 'quora-dalle-grid' }, [
        this.buildVideoCard('KlVPwny_1qw', 'Beggar\'s Canyon Dead Man\'s Run', 'Generative fan reconstruction of classical Star Wars canyon navigation'),
        this.buildVideoCard('Oyd_xFKbkw8', 'Beggar\'s Canyon Shadows of the Empire', 'Atmospheric and volumetric lighting restoration from classical conceptual frames')
      ]);
      stream.appendChild(swVideoGrid);

      // Section 2: Pigeon Animation
      stream.appendChild(makeElement('h2', { className: 'quora-section-title' }, '2. Bypassing Traditional Craft Training'));
      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, 
        "Here is another sequence, done by a hobbyist in just a few hours - a single afternoon. The animation is darn close to movie quality. I count three glitches (extra foot, left pigeon mouthing right pigeon's words at one point, buildings different in one shot). But come on. An animation instructor explains how this would take a really good student a semester to a year of intensive labor to put together. It is staggeringly good for something done by 'computer intuition' rather than by human written algorithms and a ton of human work."
      ));

      stream.appendChild(this.buildVideoCard(
        '-nZD4XLMrNw', 
        'The 24-Hour Hobbyist Pigeon Animation', 
        'Staggering visual fidelity put together in a single afternoon (just a few hours) by a hobbyist. Click to expand full width.'
      ));

      // Section 3: Trajectory DALL-E 2 vs DALL-E 3
      stream.appendChild(makeElement('h2', { className: 'quora-section-title' }, '3. Mapping the Exponential Curve'));
      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, 
        "Let's talk about trajectory a bit, while sticking with the graphical side of AI. Below are images I prompted across a 14-month window. You can see the difference between the 2022 images and the 2023 images, using the exact same prompts, same product, just a newer version."
      ));

      // DALL-E grid
      stream.appendChild(this.buildDallEComparisonGrid());

      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, 
        "The 2022 images represent Point A: abstract, fragmented outputs of 'glass sculpture of a dog', 'winged unicorn dog in the rain', and 'robot hand with wood and green soft material'. They are interesting, but barely usable. The 2023 images represent Point B: professional-grade outputs showing a 'cyborg girl with a ragged sweater playing an electronic piano' and a 'ceramic elephant sculpture'. Look at the improvement in such a short period."
      ));

      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, 
        "There are things that are a bit... off... in even the images from 2023. But then it got better, and allowed you to modify or be 'inspired by' existing images."
      ));

      // Section 4: Car Reflections
      stream.appendChild(makeElement('h2', { className: 'quora-section-title' }, '4. Spatial Material Understanding & Light Transport'));
      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, 
        "Here is an experiment I did a year ago, starting with a nice photo of a car with an ugly background, and having a free image generator (Google's Nano Banana) replace the background, while somehow making incredibly realistic reflections... good luck doing that in Photoshop. And then, well, having some fun. How did it do this, short of magic? What degree of understanding of the subject matter is needed to do this? What would it have taken to do this using pre-AI technology such as Photoshop or Blender?"
      ));

      // Car grid
      stream.appendChild(this.buildCarReflectionGrid());

      stream.appendChild(makeElement('p', { className: 'quora-paragraph italic text-[var(--text-secondary)]' }, 
        "(and, for all those who say it is just doing some sort of 'collage' from images it has seen on the internet... uhhhhh. No. You are in denial.)"
      ));

      // Section 5: Row of Houses
      stream.appendChild(makeElement('h2', { className: 'quora-section-title' }, '5. True Spatial Coherence'));
      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, 
        "Or how about this. Starting with a single photo I took of a pretty row of houses, the model was asked to redraw the scene as a clean line drawing from a completely different perspective angle. Again... how does it know how to do this short of truly understanding what it is seeing? If it can do this, we are probably very close to it actually being able to do real architecture work, because it seems to have the sort of structural and spatial understanding necessary."
      ));

      stream.appendChild(this.buildImageCard(
        '/images/housePhotoAndIllustration.webp',
        'Pretty Row of Houses Reconstructed as a Line Drawing',
        'From a single photographic input, the model accurately projects a perfect line drawing from a completely new virtual perspective angle, hinting at the automation of architectural modeling.'
      ));

      // Section 6: Physical Robotics (NEW)
      stream.appendChild(makeElement('h2', { className: 'quora-section-title' }, '6. The Physical Frontier: Humanoid Robotics'));
      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, 
        "While generative models rapidly replace digital and creative labor, physical robotics is progressing on an equally vertical trajectory. State-of-the-art humanoid systems are stepping out of research labs and transitioning directly into structured factory floors, logistics centers, and manual workflows. Within the next decade, the integration of physical humanoid robotics with localized multimodal AI models will establish an undeniable economic incentive to automate traditional physical labor, closing the circle of complete workforce automation."
      ));

      stream.appendChild(this.buildVideoCard(
        '7VV6poSrk3Y',
        'State of the Art Humanoid Robotics Frontier',
        'Demonstrating recent breakthroughs in balance, motor control, and task execution in physical humanoid robotics (1-minute compilation).',
        39
      ));

      // Concluding thoughts
      stream.appendChild(makeElement('h2', { className: 'quora-section-title' }, '7. Connecting the Dots'));
      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, 
        "You may say 'this is just silly pictures and video stuff, not nearly as complex as what I do at my job.' But you also know deep down, that the people who work on this stuff (film, animation, 3d graphics and effects, architectural rendering... prior to AI getting involved) are really smart, really talented... and here they are just looking at it and saying 'oh shit... it just does my job better than I ever could do it. For free or nearly so.'"
      ));

      // Bold and italic formatting request applied directly via HTML tags as requested
      const pClearWrapper = makeElement('p', { className: 'quora-paragraph' });
      pClearWrapper.innerHTML = "I have no doubt that hurts. <strong><em>And to be clear, I am in no way arguing that this is all positive.</em></strong>";
      stream.appendChild(pClearWrapper);

      const pExpWrapper = makeElement('p', { className: 'quora-paragraph font-bold text-emerald-400' });
      pExpWrapper.innerHTML = "There's going to be a moment like this for just about everyone. I see it mostly in programming, where it has even more superhuman capabilities than in film and animation. (programming doesn't communicate as easily as film and animation, hence my examples, but it is <strong><em>absolutely</em></strong> at the front of the pack of AI skills, and I have an <strong><em>immense amount of direct experience</em></strong> with it doing stupendously complex things).";
      stream.appendChild(pExpWrapper);

      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, 
        "You can hope for it to not happen, for AI to just go away. You can rail against the data centers on the basis of how they use too much water and drive up the prices of electricity. Good luck."
      ));

      const pFinalWrapper = makeElement('p', { className: 'quora-paragraph text-xl font-bold border-t border-[var(--border-color)] pt-6 mt-8' });
      pFinalWrapper.innerHTML = "I think it's smarter to take a close look, not just in your own field but in others, and especially, map the trajectory. And plan for - what all the evidence suggests - is going to happen in the near future. Which is that it is going to converge on being able to do <strong><em>ALL ECONOMICALLY VALUABLE HUMAN TASKS</em></strong>, better and faster and far cheaper than humans. Within the next few years.";
      stream.appendChild(pFinalWrapper);

      return stream;
    }

  buildVideoCard(videoId, title, caption, startTime = 0) {
      const thumbnailSrc = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

      return makeElement('div', { className: 'quora-video-card' }, [
        makeElement('div', {
          className: 'quora-video-thumbnail-wrapper',
          onclick: () => this.openMediaModal('video', videoId, title, { subtitle: caption, startTime })
        }, [
          makeElement('img', {
            src: thumbnailSrc,
            alt: title,
            className: 'quora-video-thumbnail',
            onerror: (e) => {
              e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800';
            }
          }),
          makeElement('div', { className: 'quora-video-play-overlay' }, [
            makeElement('div', { className: 'quora-video-play-btn' }, [
              makeElement('span', { className: 'quora-video-play-icon' }, '▶')
            ])
          ])
        ]),
        makeElement('div', { className: 'quora-video-info' }, [
          makeElement('h4', { className: 'quora-video-title' }, title),
          makeElement('p', { className: 'quora-video-caption' }, caption)
        ])
      ]);
    }

  buildImageCard(imgSrc, title, caption) {
      return makeElement('div', { className: 'quora-image-card' }, [
        makeElement('div', {
          className: 'quora-image-wrapper',
          onclick: () => this.openMediaModal('image', imgSrc, title, { subtitle: caption })
        }, [
          makeElement('img', {
            src: imgSrc,
            alt: title,
            className: 'quora-image',
            onerror: (e) => {
              e.target.style.display = 'none';
              const fb = e.target.parentNode.querySelector('.quora-image-fallback');
              if (fb) fb.style.display = 'flex';
            }
          }),
          makeElement('div', {
            className: 'quora-image-fallback',
            style: {
              display: 'none',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-panel-inner)',
              border: '1px dashed var(--border-color)',
              borderRadius: '8px',
              width: '100%',
              height: '240px',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              fontFamily: 'ui-monospace, monospace',
              padding: '24px',
              textAlign: 'center'
            }
          }, [
            makeElement('span', { style: { fontSize: '28px', marginBottom: '8px' } }, '📷'),
            makeElement('span', { className: 'font-bold text-sm text-[var(--text-title)]' }, title),
            makeElement('span', { style: { fontSize: '10px', marginTop: '6px', opacity: 0.6 } }, `Asset: ${imgSrc}`)
          ]),
          makeElement('div', { className: 'quora-image-hover-overlay' }, [
            makeElement('span', {}, 'Click to expand 🔍')
          ])
        ]),
        makeElement('div', { className: 'quora-image-info' }, [
          makeElement('span', { className: 'quora-image-caption' }, caption)
        ])
      ]);
    }

  buildDallEComparisonGrid() {
      return makeElement('div', { className: 'quora-dalle-grid' }, [
        this.buildImageCard('/images/compareDallE_1.webp', '2022 Prompts (Point A)', 'Point A: glass sculpture of a dog, winged unicorn dog in the rain, robot hand with wood and green soft material'),
        this.buildImageCard('/images/compareDallE_2.webp', '2023 Prompts (Point B)', 'Point B: cyborg girl with ragged sweater playing an electronic piano, ceramic elephant sculpture')
      ]);
    }

  buildCarReflectionGrid() {
      return makeElement('div', { className: 'quora-car-grid' }, [
        this.buildImageCard('/images/carOriginal.webp', 'Original Red Car', 'Used as input: Clear photo of a classic red car'),
        this.buildImageCard('/images/carStreetArt.png', 'Street Art Swap', 'Seemingly accurate reflections on the body that would be incredibly hard to do short of a full 3D model'),
        this.buildImageCard('/images/carMossy.png', 'Forest Moss Swap', 'Completely transformed forest environment: not on a red metallic chassis because that isn\'t even there anymore, but just using elements of the original picture to completely transform it')
      ]);
    }

  openMediaModal(type, source, title, options = {}) {
      const existing = document.getElementById('ai-media-modal');
      if (existing) existing.remove();

      const modal = makeElement('div', {
        id: 'ai-media-modal',
        className: 'ai-lightbox-overlay',
        onclick: (e) => {
          if (e.target.id === 'ai-media-modal') {
            this.closeMediaModal();
          }
        }
      });

      const closeBtn = makeElement('button', {
        className: 'ai-lightbox-close',
        onclick: () => this.closeMediaModal()
      }, '✕');

      const contentContainer = makeElement('div', { className: 'ai-lightbox-content' });

      if (type === 'image') {
        const img = makeElement('img', {
          src: source,
          alt: title,
          className: 'ai-lightbox-img'
        });
        contentContainer.appendChild(img);
      } else if (type === 'video') {
        const videoContainer = makeElement('div', {
          id: 'ai-lightbox-video-frame',
          className: 'ai-lightbox-video-frame'
        });
        contentContainer.appendChild(videoContainer);

        setTimeout(() => {
          try {
            if (window.VideoPlayer) {
              this.activeModalPlayer = new VideoPlayer({
                container: videoContainer,
                containerId: 'ai-lightbox-video-frame',
                playerType: 'youtube',
                videoId: source,
                autoplay: true,
                controls: true,
                startTime: options.startTime || 0
              });
            } else {
              this.useIframeFallback(videoContainer, source, options.startTime);
            }
          } catch (err) {
            this.useIframeFallback(videoContainer, source, options.startTime);
          }
        }, 50);
      }

      const captionBar = makeElement('div', { className: 'ai-lightbox-caption' }, [
        makeElement('span', { className: 'ai-lightbox-title' }, title),
        options.subtitle ? makeElement('p', { className: 'ai-lightbox-subtitle' }, options.subtitle) : null
      ]);

      const dialogWrapper = makeElement('div', { className: 'ai-lightbox-dialog' }, [
        closeBtn,
        contentContainer,
        captionBar
      ]);

      modal.appendChild(dialogWrapper);
      document.body.appendChild(modal);

      requestAnimationFrame(() => {
        modal.classList.add('is-active');
      });
    }

  closeMediaModal() {
      const modal = document.getElementById('ai-media-modal');
      if (modal) {
        modal.classList.remove('is-active');
        if (this.activeModalPlayer) {
          try {
            this.activeModalPlayer.destroy();
          } catch (e) {}
          this.activeModalPlayer = null;
        }
        setTimeout(() => modal.remove(), 250);
      }
    }

  useIframeFallback(container, videoId, startTime = 0) {
      container.innerHTML = '';
      const iframe = makeElement('iframe', {
        src: `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&start=${startTime}`,
        style: {
          width: '100%',
          height: '100%',
          border: 'none'
        },
        allow: 'autoplay; encrypted-media',
        allowfullscreen: 'true'
      });
      container.appendChild(iframe);
    }
}