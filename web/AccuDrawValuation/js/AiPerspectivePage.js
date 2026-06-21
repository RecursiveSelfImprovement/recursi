class AiPerspectivePage {
    render(app) {
      this.app = app;
      this.activeModalPlayer = null;
      this.applyStyles();
      return this.buildPage();
    }

    buildAIPerspectivePanel(app) {
      const pIntroHighlight = [
        "The speed AI is moving at has created an extremely narrow window to get things sorted out career-wise. ",
        "The common advice to 'just take any low-level survival job now and rebuild your career later' ",
        "is completely blind to the actual trajectory. Spending a year digging ditches or doing menial labor ",
        "at this critical juncture means missing the boat entirely on the generative transition. ",
        "By the time you try to return, standard coding and interface modeling will be fully automated, ",
        "shutting the door on my visual systems engineering skills for good."
      ].join("");

      const pIntroBody = [
        "With technology changing faster than at any point in human history, the opportunity cost of forced ",
        "professional exile is absolute. This analysis demonstrates why establishing an immediate, ",
        "focused technical runway is a matter of urgent survival, and why forcing an inventor with a history of ",
        "creating billions in value into low-level work is a permanent destruction of human capital."
      ].join("");

      const pEssay1 = [
        "I think AI and robotics are going to replace almost every single job out there. This is a tough ",
        "pill for people to swallow because it messes with our basic assumptions about how society is supposed to work -- ",
        "specifically, the idea that you have to sell your labor just to survive. If you have no job, ",
        "you starve, so people naturally panic and say the tech can't do it. But that's a distribution ",
        "problem we need to solve, not a limit of the technology's capability."
      ].join("");

      const pEssay2 = [
        "I notice people consistently looking at their own jobs and saying: 'AI won't replace what ",
        "I do because my role has these specific, highly complex challenges.' That's just a psychological ",
        "defense mechanism -- a way to avoid being blindsided. It's much smarter to step back, look at the ",
        "larger trajectory across multiple industries, and be honest about how fast things are improving."
      ].join("");

      const pEssay3 = [
        "I focus on graphics, special effects, and animation because it's highly visual and communicates ",
        "the point better than coding. I select this domain not because it is more complex than other jobs, but ",
        "because it is easy to see. Having spent over 45 years in this field -- obsessing over 35mm in-camera ",
        "effects in the late 70s, studying traditional industrial rendering in the 80s, and then building ",
        "3D systems -- I know exactly how hard this stuff is to make conventionally."
      ].join("");

      const pEssay4 = [
        "But this isn't computer graphics in the old-fashioned sense. No one wrote an algorithm telling ",
        "the computer how to render reflections or cast light. They just wrote the learning algorithm, ",
        "set it loose on a mountain of data, and the models figured the rest out on their own. We understand ",
        "how they do it about as well as we understand how our own brains learn -- which is to say, barely at all."
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
            makeElement("h2", { className: "ai-section-heading" }, "1. The Paradigm Shift from Algorithms to Intuition")
          ]),

          makeElement("p", { className: "ai-essay-p" }, pEssay4),
          makeElement("p", { className: "ai-essay-p" }, 
            "We understand how these models learn about as well as we understand how the human brain does -- which is to say, very little. But the outputs are undeniable."
          ),

          this.buildNewAIMediaCard(
            "Star Wars De-Aging & Character Generation",
            [
              "De-aging actors via conventional 3D graphics is incredibly hard, expensive, ",
              "and almost always looks slightly wrong, landing in the uncanny valley. ",
              "Today, AI models do it without missing a beat, and you simply cannot tell."
            ].join(""),
            "/AIImages/star_wars_deaged.png",
            [
              "Luke, Leia, and Lando young again -- realized without human artists spent on ",
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
              "While a keen eye can count a couple of minor glitches -- a slight foot error or background change ",
              "-- it is staggeringly good. This is computer intuition bypassing years of conventional ",
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
            this.buildAIImageFrame("/AIImages/trajectory_14m_right.png", "Today: Photorealistic lighting, solid composition")
          ]),

          makeElement("p", { className: "ai-essay-p", style: { marginTop: "24px" } }, 
            "We went from abstract, barely usable outlines to professional-grade illustrations in a little over a year. Next came the ability to feed the model an existing image and modify it dynamically with perfect contextual awareness."
          ),

          this.buildNewAIMediaCard(
            "Google's Nano Banana Reflection Experiment",
            [
              "I ran an experiment taking a photo of a car with an ugly background, asking a free model ",
              "to replace it. It did not just swap the background -- it calculated and painted photorealistic ",
              "reflections on the car's body matching the new environment."
            ].join(""),
            "/AIImages/car_reflections_nano.png",
            [
              "This requires a deep, structural understanding of materials, lighting, and shape. To achieve ",
              "this in Photoshop or Blender would require hours of tedious manual masks and ray-tracing. ",
              "The AI did it instantly. This is not a collage of existing internet photos -- this is true spatial comprehension."
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
            "It is easy to dismiss this as silly pictures and video tools and assume your white-collar, spreadsheet-heavy, or programming-related job is safe. But you must connect the dots. The people who conventionally do this graphical work are smart, highly technical creatives -- and today, the machine does their job better, faster, and for free."
          ),

          makeElement("p", { className: "ai-essay-p" }, 
            "I see this shift even more acutely in computer programming. The machine's ability to generate, debug, and refactor complex system code is expanding at a rate that is already automating traditional software maintenance. While programming syntax does not communicate as easily as film and animation, it is absolutely leading the pack of AI capabilities."
          ),

          makeElement("p", { className: "ai-essay-p" }, 
            "The researchers building these models are paid enormous sums today, but they are fully aware that they are actively training the very systems that will soon render their own coding jobs obsolete. The idea that automation will simply create 170 million new jobs is a comfortable myth; those new jobs will themselves be automated almost instantly."
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
            "We are heading toward a convergence where every economically valuable human task will be done better, faster, and far cheaper by machines. Rather than hoping it won't happen or railing against energy usage, we must plan for it. For me, that means securing the transition runway now -- putting my core skills in visual systems and conceptual design to work immediately before the window of standard software development is fully closed."
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
            className: "exhibit-image w-full h-auto object-cover rounded-lg border border-[var(--border-color)] shadow-md cursor-pointer",
            onclick: () => this.openMediaModal('image', imgSrc, title, { subtitle: footerText }),
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
          className: "exhibit-image w-full h-auto object-cover rounded cursor-pointer",
          onclick: () => this.openMediaModal('image', imgSrc, caption, { subtitle: caption }),
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
        "The speed AI is moving at has created an extremely narrow window to get things sorted out career-wise. ",
        "The common advice to 'just take any low-level survival job now and rebuild your career later' ",
        "is completely blind to the actual trajectory. Spending a year digging ditches or doing menial labor ",
        "at this critical juncture means missing the boat entirely on the generative transition. ",
        "By the time you try to return, standard coding and interface modeling will be fully automated, ",
        "shutting the door on my visual systems engineering skills for good."
      ].join("");

      const pIntroBody = [
        "With technology changing faster than at any point in human history, the opportunity cost of forced ",
        "professional exile is absolute. Below is one of my typical Quora posts on the subject. In this post, ",
        "I concentrate mostly on a particular side of AI -- graphics and video -- focusing on the Star Wars fan ",
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
        this.buildImageCard(
          '/images/compareDallE_1.webp', 
          'Prompt Comparisons: Group A', 
          'Group A prompts (glass dog, winged unicorn dog, robot hand). Left column shows mid-2022 outputs; right column shows late-2023 outputs. Prompt example: "A hollow glass sculpture of a tricolor border collie with internal optical refractions, on a cobblestone street at twilight."'
        ),
        this.buildImageCard(
          '/images/compareDallE_2.webp', 
          'Prompt Comparisons: Group B', 
          'Group B prompts (cyborg pianist, ceramic elephant). Left column shows mid-2022 outputs; right column shows late-2023 outputs. Prompt example: "A detailed cyborg girl with synthetic skin panels playing an electronic piano in a futuristic cyberpunk environment."'
        )
      ]);
    }

    buildCarReflectionGrid() {
      return makeElement('div', { className: 'quora-car-grid' }, [
        this.buildImageCard('/images/carOriginal.webp', 'Original Red Car', 'Used as input: Clear photo of a classic red car'),
        this.buildImageCard('/images/carStreetArt.png', 'Street Art Swap', 'Reflections on the body that would be incredibly hard to do short of a full 3D model'),
        this.buildImageCard('/images/carMossy.png', 'Forest Moss Swap', 'Completely transformed forest environment: not on a red metallic chassis because that isn\'t even there anymore, but just using elements of the original picture to completely transform it')
      ]);
    }

    openMediaModal(type, source, title, options = {}) {
      const existing = document.getElementById('ai-media-modal');
      if (existing) existing.remove();

      let isFullRes = false;
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let scrollLeft = 0;
      let scrollTop = 0;
      let dragThresholdMet = false;

      const modal = makeElement('div', {
        id: 'ai-media-modal',
        style: {
          position: 'fixed',
          inset: '0',
          zIndex: '100002',
          background: 'rgba(2, 2, 4, 0.98)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          transition: 'opacity 0.25s ease',
          opacity: '0',
          width: '100vw',
          height: '100vh',
          boxSizing: 'border-box',
          overflow: 'hidden'
        },
        onclick: () => this.closeMediaModal()
      });

      const topBar = makeElement('div', {
        style: {
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 24px',
          background: 'rgba(10, 10, 15, 0.95)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: '30'
        }
      }, [
        makeElement('span', {
          style: {
            color: '#ffffff',
            fontWeight: 'bold',
            fontSize: '13px',
            fontFamily: 'ui-monospace, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }
        }, title),
        makeElement('button', {
          style: {
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#ffffff',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            marginRight: '8px'
          },
          onclick: (e) => {
            e.stopPropagation();
            this.closeMediaModal();
          }
        }, '✕')
      ]);

      const badge = makeElement('div', {
        style: {
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.9)',
          color: '#3b82f6',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '20px',
          padding: '6px 16px',
          fontSize: '11px',
          fontFamily: 'ui-monospace, monospace',
          pointerEvents: 'none',
          zIndex: '30',
          boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }
      }, 'Click image for Full Resolution');

      const contentContainer = makeElement('div', { 
        style: {
          flex: '1',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
          position: 'relative',
          padding: '12px',
          background: '#010103',
          cursor: 'zoom-in',
          userSelect: 'none'
        }
      });

      contentContainer.onmousedown = (e) => {
        if (!isFullRes) return;
        isDragging = true;
        dragThresholdMet = false;
        startX = e.clientX;
        startY = e.clientY;
        scrollLeft = contentContainer.scrollLeft;
        scrollTop = contentContainer.scrollTop;
        contentContainer.style.cursor = 'grabbing';
      };

      contentContainer.onmousemove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          dragThresholdMet = true;
        }
        contentContainer.scrollLeft = scrollLeft - dx;
        contentContainer.scrollTop = scrollTop - dy;
      };

      contentContainer.onmouseup = () => {
        if (!isDragging) return;
        isDragging = false;
        contentContainer.style.cursor = isFullRes ? 'zoom-out' : 'zoom-in';
      };

      contentContainer.onmouseleave = () => {
        if (!isDragging) return;
        isDragging = false;
        contentContainer.style.cursor = isFullRes ? 'zoom-out' : 'zoom-in';
      };

      if (type === 'image') {
        const img = makeElement('img', {
          src: source,
          alt: title,
          style: {
            width: '100%',
            height: '100%',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            borderRadius: '4px',
            pointerEvents: 'auto',
            display: 'block'
          }
        });

        contentContainer.onclick = (e) => {
          e.stopPropagation();

          if (dragThresholdMet) {
            dragThresholdMet = false;
            return;
          }

          if (e.target === contentContainer) {
            this.closeMediaModal();
            return;
          }

          isFullRes = !isFullRes;
          if (isFullRes) {
            contentContainer.style.display = 'block';
            img.style.width = 'auto';
            img.style.height = 'auto';
            img.style.maxWidth = 'none';
            img.style.maxHeight = 'none';
            img.style.objectFit = 'none';
            img.style.margin = '0 auto';
            contentContainer.style.cursor = 'zoom-out';
            badge.textContent = 'Click image to fit screen (Drag to pan)';
          } else {
            contentContainer.style.display = 'flex';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            img.style.objectFit = 'contain';
            img.style.margin = '0';
            contentContainer.style.cursor = 'zoom-in';
            badge.textContent = 'Click image for Full Resolution';
          }
        };

        contentContainer.appendChild(badge);
        contentContainer.appendChild(img);
      } else if (type === 'video') {
        const videoContainer = makeElement('div', {
          id: 'ai-lightbox-video-frame',
          style: {
            width: '85vw',
            height: '47.8vw',
            maxWidth: '1200px',
            maxHeight: '675px',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: '#000000',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8)'
          }
        });
        contentContainer.appendChild(videoContainer);
        this.useIframeFallback(videoContainer, source, options.startTime || 0);
      }

      const captionBar = options.subtitle ? makeElement('div', {
        style: {
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '800px',
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '12px 20px',
          color: '#e2e8f0',
          fontSize: '13px',
          lineHeight: '1.5',
          textAlign: 'center',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: '30'
        },
        onclick: (e) => e.stopPropagation()
      }, options.subtitle) : null;

      const dialogWrapper = makeElement('div', { 
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'transparent',
          position: 'relative',
          boxSizing: 'border-box'
        }
      }, [
        topBar,
        contentContainer,
        captionBar
      ]);

      modal.appendChild(dialogWrapper);
      document.body.appendChild(modal);

      requestAnimationFrame(() => {
        modal.style.opacity = '1';
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

    buildQuoraEssayContent() {
      const stream = makeElement('div', { className: 'quora-essay-stream' });
      
      this.appendQuoraIntro(stream);
      this.appendQuoraStarWars(stream);
      this.appendQuoraPigeons(stream);
      this.appendQuoraTrajectory(stream);
      this.appendQuoraCarReflections(stream);
      this.appendQuoraHouses(stream);
      this.appendQuoraRobotics(stream);
      this.appendQuoraConclusion(stream);
      
      return stream;
    }

    appendQuoraIntro(stream) {
      const p1Text = [
        "Yeah, I think AI is going to replace almost every job. This is an ",
        "incredibly difficult thing for many to accept because it challenges ",
        "our fundamental assumptions about society -- specifically, the link ",
        "between work, income, and basic survival. The assumption that we ",
        "must sell our labor just to survive makes the prospect of widespread ",
        "automation feel like an immediate sentence of starvation, but that ",
        "is a structural issue we must solve, not an indictment of the ",
        "technology's capability."
      ].join("");

      const p2Text = [
        "A common bias is to look at your own job and assert: ",
        "'AI won't replace my job because what I do has these unique, highly ",
        "complex challenges.' That is a dangerous defense mechanism. I suggest ",
        "stepping back, analyzing the larger trajectory across ",
        "multiple industries, and looking honestly at the rate of improvement."
      ].join("");

      const p3Text = [
        "To show this speed, I concentrate on graphics and video -- not ",
        "because it is more complex than other jobs, but because it communicates ",
        "visually. Having spent over 45 years in this field -- obsessing over ",
        "35mm in-camera effects in the late 70s (right after I saw Star Wars in the theater at age 13), ",
        "learning traditional industrial rendering in the 80s, and later developing advanced ",
        "3D systems -- I have a clear understanding of what it conventionally ",
        "takes to build these visuals."
      ].join("");

      const p4Text = [
        "What we are seeing today is not computer graphics in the ",
        "conventional sense. No one wrote the rendering equations or hardcoded ",
        "lighting rules here. These are generative AI models that just figure ",
        "seriously complex structures out and execute them on their own. We understand ",
        "how they learn about as well as we understand how our own brains do -- ",
        "which is to say, barely at all."
      ].join("");

      const p5Text = [
        "People love to dismiss this as 'glorified autocomplete.' They say it is ",
        "just statistically predicting the next word, like a parlor trick. But to ",
        "predict the next token accurately across millions of contexts, the model ",
        "has to build an understanding. Calling that a parlor trick is like calling ",
        "human thought 'glorified chemical signals' in a batch of glorified worms. ",
        "If you look closely enough, everything is mechanistic. Our brains are just ",
        "finding electrochemical equilibria tuned by natural selection to help us survive. ",
        "It is either that, or you have to believe in magic."
      ].join("");

      stream.appendChild(makeElement('p', { className: 'quora-paragraph font-medium' }, p1Text));
      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, p2Text));
      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, p3Text));
      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, p4Text));
      stream.appendChild(makeElement('p', { className: 'quora-paragraph italic text-[var(--text-secondary)]' }, p5Text));
    }

    appendQuoraStarWars(stream) {
      const swHeading = makeElement('h2', { className: 'quora-section-title' }, '1. The Star Wars Paradigm Shift');
      
      const swParagraph = [
        "Look at what AI can do with de-aging. Doing this with traditional ",
        "3D rendering is incredibly hard, expensive, and always looks slightly ",
        "wrong and creepy. Today, AI does it without missing a beat, and you simply ",
        "cannot tell. It is done for next to nothing -- with probably a 5,000 to 1 ",
        "disruption ratio as far as cost compared to traditional Hollywood studio production. ",
        "Every little AI glitch you see today? There will be far fewer next year."
      ].join("");

      const swCaption = [
        "Luke, Leia, Lando young again -- realized without spending millions ",
        "on studio rendering. The special effects are executed instantly on the cheap, ",
        "with cost disruptions exceeding a 5,000 to 1 ratio compared to legacy Hollywood techniques."
      ].join("");

      const swMediaText = [
        "I suggest looking closely at these fan-made special effect ",
        "restorations. Think about what is actually going on under the ",
        "hood of these renders:"
      ].join("");

      const swVideoGrid = makeElement('div', { className: 'quora-dalle-grid' }, [
        this.buildVideoCard(
          'KlVPwny_1qw', 
          "Beggar's Canyon Dead Man's Run", 
          'Generative fan reconstruction of classical Star Wars canyon navigation'
        ),
        this.buildVideoCard(
          'Oyd_xFKbkw8', 
          "Beggar's Canyon Shadows of the Empire", 
          'Atmospheric and volumetric lighting restoration from classical conceptual frames'
        )
      ]);

      stream.appendChild(swHeading);
      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, swParagraph));
      stream.appendChild(this.buildImageCard('/images/starWarsDeAging.webp', 'Luke, Leia, and Lando Young Again', swCaption));
      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, swMediaText));
      stream.appendChild(swVideoGrid);
    }

    appendQuoraPigeons(stream) {
      const pigHeading = makeElement('h2', { className: 'quora-section-title' }, '2. Bypassing Traditional Craft Training');
      
      const pigParagraph = [
        "Here is another sequence, done by a hobbyist in an afternoon -- ",
        "just a few hours of work. The animation is darn close to movie quality. ",
        "I count three glitches (extra foot, left pigeon mouthing right pigeon's ",
        "words at one point, buildings different in one shot). But come on. ",
        "An animation instructor explains how this would take a talented ",
        "student an entire semester to a year of intensive labor to put together. ",
        "It is staggeringly good for something done by computer intuition ",
        "rather than by human written algorithms and a ton of human work."
      ].join("");

      const pigCaption = [
        "Visual fidelity put together in a single afternoon by a hobbyist. ",
        "Click to expand full width."
      ].join("");

      stream.appendChild(pigHeading);
      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, pigParagraph));
      stream.appendChild(this.buildVideoCard('-nZD4XLMrNw', 'The 24-Hour Hobbyist Pigeon Animation', pigCaption));
    }

    appendQuoraTrajectory(stream) {
      const trajHeading = makeElement('h2', { className: 'quora-section-title' }, '3. Mapping the Exponential Curve');
      
      const trajP1 = [
        "Let's look at the rapid evolutionary trajectory. Below are two ",
        "side-by-side prompt comparisons across a 14-month window. The ",
        "prompts are identical, but the leap in rendering quality and ",
        "coherence is staggering."
      ].join("");

      const trajP2 = [
        "Comparing the older images with the newer ones makes the vertical ",
        "rate of improvement clear. It highlights the shift from ",
        "abstract, fragmented shapes to solid compositions ",
        "in a little over a year."
      ].join("");

      const trajP3 = [
        "There are things that are a bit... off... in even the images from ",
        "2023. But then it got better, and allowed you to modify or be ",
        "inspired by existing images."
      ].join("");

      stream.appendChild(trajHeading);
      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, trajP1));
      stream.appendChild(this.buildDallEComparisonGrid());
      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, trajP2));
      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, trajP3));
    }

    appendQuoraCarReflections(stream) {
      const carHeading = makeElement('h2', { className: 'quora-section-title' }, '4. Spatial Material Understanding & Light Transport');
      
      const carParagraph = [
        "Here is an experiment I did a year ago, starting with a photo ",
        "of a car with an ugly background, and having a free image ",
        "generator (Google's Nano Banana) replace the background, while ",
        "somehow making realistic reflections... good luck doing ",
        "that in Photoshop. How did it do this, short of magic? What ",
        "degree of understanding of the subject matter is needed? What would ",
        "it have taken to do this using pre-AI technology such as Photoshop ",
        "or Blender?"
      ].join("");

      const carCaption = [
        "(and, for all those who say it is just doing some sort of ",
        "collage from images it has seen on the internet... uhhhhh. No. ",
        "You are in denial.)"
      ].join("");

      stream.appendChild(carHeading);
      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, carParagraph));
      stream.appendChild(this.buildCarReflectionGrid());
      stream.appendChild(makeElement('p', { className: 'quora-paragraph italic text-[var(--text-secondary)]' }, carCaption));
    }

    appendQuoraHouses(stream) {
      const houseHeading = makeElement('h2', { className: 'quora-section-title' }, '5. True Spatial Coherence');
      
      const houseParagraph = [
        "Or how about this. Starting with a single photo I took of a row ",
        "of houses, the model was asked to redraw the scene as a clean ",
        "line drawing from a completely different perspective angle. Again... ",
        "how does it know how to do this short of truly understanding what it ",
        "is seeing? No one drew a single line."
      ].join("");

      const houseCaption = [
        "From a single photographic input, the model projects a ",
        "line drawing from a completely new virtual perspective angle, ",
        "showing structural and spatial understanding."
      ].join("");

      stream.appendChild(houseHeading);
      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, houseParagraph));
      stream.appendChild(this.buildImageCard('/images/housePhotoAndIllustration.webp', 'Pretty Row of Houses Reconstructed as a Line Drawing', houseCaption));
    }

    appendQuoraRobotics(stream) {
      const robHeading = makeElement('h2', { className: 'quora-section-title' }, '6. The Physical Frontier: Humanoid Robotics');
      
      const robParagraph = [
        "While AI manages the digital realm, physical robots are improving ",
        "on an equally vertical trajectory. The main thing that held them back ",
        "was software, and that is advancing ridiculously fast. Now they are ",
        "investing heavily in the mechanical side. They are moving out of labs ",
        "and into warehouses, factories, and manual workflows. Within a decade, ",
        "the economic incentive to utilize human physical labor will disappear entirely."
      ].join("");

      const robCaption = [
        "Breakthroughs in balance, motor control, and task execution ",
        "in physical humanoid robotics (1-minute compilation)."
      ].join("");

      stream.appendChild(robHeading);
      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, robParagraph));
      stream.appendChild(this.buildVideoCard('7VV6poSrk3Y', 'State of the Art Humanoid Robotics Frontier', robCaption, 39));
    }

    appendQuoraConclusion(stream) {
      const concHeading = makeElement('h2', { className: 'quora-section-title' }, '7. Connecting the Dots');
      
      const concP1 = [
        "You may say 'this is just silly pictures and video stuff, not ",
        "nearly as complex as what I do at my job.' But you also know deep ",
        "down, that the people who work on this stuff (film, animation, ",
        "3D graphics, architectural rendering... prior to AI getting involved) ",
        "are smart, talented... and here they are just looking at it and saying ",
        "'oh shit... it just does my job better than I ever could do it. For free or nearly so.'"
      ].join("");

      const concP2 = "I have no doubt that hurts. <strong><em>And to be clear, I am in no way arguing that this is all positive.</em></strong>";
      
      const concP3 = [
        "There's going to be a moment like this for just about everyone. ",
        "I see it mostly in programming, where it has even more superhuman ",
        "capabilities than in film and animation. (programming doesn't ",
        "communicate as easily as film and animation, hence my examples, ",
        "but it is <strong><em>absolutely</em></strong> at the front of ",
        "the pack of AI skills, and I have an <strong><em>immense amount ",
        "of direct experience</em></strong> with it doing stupendously ",
        "complex things)."
      ].join("");

      const concP4 = [
        "You can hope for it to not happen, for AI to just go away. You can ",
        "rail against the data centers on the basis of how they use too much ",
        "water and drive up the prices of electricity. Good luck."
      ].join("");

      const concP5 = [
        "I think it's smarter to take a close look, not just in your own ",
        "field but in others, and especially, map the trajectory. And ",
        "plan for -- what all the evidence suggests -- is going to happen in ",
        "the near future. Which is that it is going to converge on being ",
        "able to do <strong><em>ALL ECONOMICALLY VALUABLE HUMAN TASKS</em>",
        "</strong>, better and faster and far cheaper than humans. Within ",
        "the next few years."
      ].join("");

      const p2Wrapper = makeElement('p', { className: 'quora-paragraph' });
      p2Wrapper.innerHTML = concP2;

      const p3Wrapper = makeElement('p', { className: 'quora-paragraph font-bold text-emerald-400' });
      p3Wrapper.innerHTML = concP3;

      const p5Wrapper = makeElement('p', { className: 'quora-paragraph text-xl font-bold border-t border-[var(--border-color)] pt-6 mt-8' });
      p5Wrapper.innerHTML = concP5;

      stream.appendChild(concHeading);
      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, concP1));
      stream.appendChild(p2Wrapper);
      stream.appendChild(p3Wrapper);
      stream.appendChild(makeElement('p', { className: 'quora-paragraph' }, concP4));
      stream.appendChild(p5Wrapper);
    }
}