class AiPerspectivePage {
    render(app) {
      this.applyStyles();
      return this.buildAIPerspectivePanel(app);
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
        .ai-editorial-container {
          display: flex;
          flex-direction: column;
          gap: 48px;
        }
        .ai-essay-card {
          padding: 48px !important;
          background-color: var(--bg-panel) !important;
          border: 1px solid var(--border-color) !important;
          border-radius: 16px !important;
        }
        .ai-essay-title {
          font-size: 28px !important;
          font-weight: 800 !important;
          color: var(--text-title);
          letter-spacing: -0.02em;
          line-height: 1.35;
          margin-bottom: 28px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 20px;
        }
        @media (min-width: 768px) {
          .ai-essay-title { font-size: 36px !important; }
        }
        .ai-essay-p {
          font-size: 16px !important;
          line-height: 1.85 !important;
          color: var(--text-primary) !important;
          margin-bottom: 1.75rem !important;
        }
        .ai-essay-p:last-of-type {
          margin-bottom: 0 !important;
        }
        .ai-section-break {
          border-left: 4px solid #3b82f6;
          padding-left: 20px;
          margin: 64px 0 32px 0 !important;
        }
        .ai-section-heading {
          font-size: 20px !important;
          font-weight: 800 !important;
          color: var(--text-title) !important;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-family: ui-monospace, monospace;
        }
        .ai-media-block {
          background-color: var(--bg-panel-inner);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 32px !important;
          margin-top: 36px !important;
          margin-bottom: 36px !important;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }
        @media (min-width: 1024px) {
          .ai-media-block {
            flex-direction: row;
            align-items: flex-start;
          }
        }
        .ai-media-block-img-area {
          width: 100%;
          max-width: 100%;
          flex-shrink: 0;
        }
        @media (min-width: 1024px) {
          .ai-media-block-img-area {
            width: 380px;
          }
        }
        .ai-media-block-desc {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .ai-media-block-title {
          font-size: 18px !important;
          font-weight: 700 !important;
          color: var(--text-title);
        }
        .ai-media-block-body {
          font-size: 14.5px !important;
          line-height: 1.75 !important;
          color: var(--text-primary);
          margin-bottom: 1rem !important;
        }
        .ai-media-block-footer {
          font-size: 13.5px !important;
          line-height: 1.75 !important;
          color: var(--text-secondary);
          font-style: italic;
          border-left: 2px solid #3b82f6;
          padding-left: 16px;
        }
        .ai-dual-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 28px;
          margin-top: 24px;
          margin-bottom: 24px;
        }
        @media (min-width: 768px) {
          .ai-dual-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .backstory-paragraph, .backstory-paragraph-highlight {
          margin-bottom: 1.5rem !important;
          line-height: 1.8 !important;
        }
        .backstory-paragraph:last-child, .backstory-paragraph-highlight:last-child {
          margin-bottom: 0 !important;
        }
      `, "ai-perspective-page-styles");
    }
  }