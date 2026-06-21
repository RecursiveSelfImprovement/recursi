class CaretakerBiasPage {
    render(app) {
      this.applyStyles();
      const container = makeElement('div', { className: 'space-y-8' });
      container.appendChild(this.buildCaretakerIntroBlock(app));
      container.appendChild(this.buildCaretakerTimelineBlock(app));
      container.appendChild(this.buildLinkedInExhibitsPanel(app));
      container.appendChild(this.buildVotingContrastPanel(app));
      container.appendChild(this.buildQuoraPolarizationIframe(app)); // Reading and mounting
      container.appendChild(this.buildCaretakerHistoryGrid(app));
      return container;
    }

    buildCaretakerIntroBlock(app) {
      const p1 = [
        "This dossier has been compiled to document a consistent, verifiable ",
        "pattern of personal animosity, ideological bias, and communication ",
        "barriers on the part of Kathleen Brown. Crucially, she is not merely ",
        "managing our 94-year-old mother's personal care; she acts as the sole ",
        "administrator of the financial trust and transition plan established by ",
        "our mother to help me get back on my feet. By structuring this legal agreement ",
        "in an extremely restrictive and punitive manner, she has actively worked ",
        "contrary to our mother's supportive intent."
      ].join("");

      const p2 = [
        "This analysis demonstrates that the initial design of the plan, the systemic ",
        "gatekeeping of our mother and the termination of my transition runway are ",
        "motivated by a long-standing personal grudge, fueled by radicalized tribal ",
        "beliefs that justify demonizing close family members."
      ].join("");

      return makeElement('div', { className: 'backstory-gradient-card' }, [
        makeElement('h3', { className: 'text-lg font-bold text-[var(--text-title)]' }, 'Fiduciary Role & Objective of This Dossier'),
        makeElement('p', { className: 'backstory-paragraph-highlight' }, p1),
        makeElement('p', { className: 'backstory-paragraph' }, p2)
      ]);
    }

    buildCaretakerTimelineBlock(app) {
      const item1Text = [
        "During a seemingly non-political and otherwise benign late-night discussion in Virginia ",
        "regarding intellectual property economics, Kathy's husband Jack asserted: 'If it doesn't make you money, it doesn't have value.' ",
        "something Rob was quietly hurt by after, for instance, making so much money for Bentley ",
        "systems without much recognition or compensation.",
        "Kathy became agitated at some of Rob's thoughts on the subject, and suddenly stated: 'We've got a lot of guns and we're not afraid to use them.' ",
        "Rob's query ('Is that a threat?') was met with complete silence as she walked out."
      ].join("");

      const item2Text = [
        "Shortly after the Virginia incident, Rob discovered that Kathy had been publicly posting ",
        "condescending and hostile comments on her professional LinkedIn profile (such as the 'Owes You' exhibit). ",
        "The realization that she was publicly denigrating his character ", 
        "combined with the active gun threat, devastated Rob's emotional health and necessitated ",
        "professional therapy. This breakdown in family communication occurred in early 2022."
      ].join("");

      const item3Text = [
        "Now acting as the primary care coordinator and sole trust administrator, Kathy's long-standing grudge ",
        "culminated in a complete communication firewall. Care supervisor Shirley confirmed she was under ",
        "strict instructions to block any direct video contact between Rob and his mother unless explicitly ",
        "cleared by Kathy. This selectively isolates Rob while his sisters maintain unmonitored access."
      ].join("");

      return makeElement('section', { className: 'cad-panel space-y-6' }, [
        makeElement('h2', { 
          className: 'text-xl font-bold text-[var(--text-title)] uppercase tracking-wide', 
          style: { fontFamily: 'ui-monospace, monospace' } 
        }, 'Timeline of the Gatekeeping Grudge'),
        
        makeElement('div', { className: 'timeline-flow space-y-6' }, [
          this.buildTimelineItem('Early 2022 (The Virginia Threat)', item1Text, '🔴 The Gun Threat'),
          this.buildTimelineItem('Early 2022 (Soon After / Discoveries)', item2Text, '💬 LinkedIn Discovery & Therapy'),
          this.buildTimelineItem('Early 2026 (The Current Embargo)', item3Text, '🔒 Systemic Gatekeeping')
        ])
      ]);
    }

    buildTimelineItem(time, desc, badge) {
      return makeElement('div', { className: 'timeline-item pl-6 relative' }, [
        makeElement('span', { className: 'timeline-item-dot' }),
        makeElement('div', { className: 'flex justify-between items-center mb-2' }, [
          makeElement('span', { className: 'timeline-time font-bold text-[#3b82f6] text-sm' }, time),
          makeElement('span', { className: 'elder-card-badge' }, badge)
        ]),
        makeElement('p', { className: 'text-sm text-[var(--text-secondary)] leading-relaxed' }, desc)
      ]);
    }

    buildCaretakerHistoryGrid(app) {
      return makeElement('section', { className: 'cad-panel space-y-6' }, [
        makeElement('h2', { 
          className: 'text-xl font-bold text-[var(--text-title)] uppercase tracking-wide', 
          style: { fontFamily: 'ui-monospace, monospace' } 
        }, 'Historical Inconsistencies of "Self-Reliance"'),
        makeElement('p', { className: 'text-sm text-[var(--text-secondary)]' }, 
          "A record of past instances where Kathy refused family assistance  based on extreme individualism, contrasted with Rob's immediate personal support."
        ),
        
        makeElement('div', { className: 'elder-analysis-grid' }, [
          this.buildHistoryCard(
            'Refusal to Support Mother (20 Years Ago)',
            [
              "When their mother experienced controlling behavior from their father, ",
              "Rob,  proposed a unified sibling alliance to protect her, something their mother ",
              "had previously described as being \"her hero\".  Kathy refused ",
              "to assist and discouraged the other siblings from doing so, stating that ",
              "their mother brought the situation on herself. This shut down the discussion."
            ].join(""),
            '❌ Refusal of Aid'
          ),
          this.buildHistoryCard(
            'Refusal of Mediation in San Francisco',
            [
              "During a looming custody crisis, Rob asked Kathy (who was ",
              "visiting SF) to spend just an hour speaking with his then-wife Eve and her mother ",
              "to help mediate and hopefully prevent a custody disaster. Citing individual responsibility, ",
              "she flatly refused to help.  Later than night, Eve and her mother snuck away to Chico with the baby, ",
              "starting a years long custody battle that likely could have been avoided."
            ].join(""),
            '❌ Refusal of Mediation'
          ),
          this.buildHistoryCard(
            'Refusal to Assist with Family Interference',
            [
              "When their late father was micromanaging Rob's legal defense while showing early ",
              "cognitive decline, Rob asked Kathy talk with their father to discourage him from interfering. She refused, ",
              "stating: 'If you accept help, it's going to have strings attached.' While some ",
              "strings are expected, using that as an excuse to allow his defense case to be ruined ",
              "is an absurd and harmful refusal."
            ].join(""),
            '❌ Refusal of Protection'
          ),
          this.buildHistoryCard(
            'Contrast: Rob\'s 2020 Defense of Kathy',
            [
              "When their father's brother Gene sent an abusive email slamming Kathy, ",
              "Rob immediately wrote a strong, unhesitating defense of her, showing loyalty ",
              "that Kathy has consistently failed to return. Notably, this was as personal risk to Rob,",
              "given that Gene was at the time designated by their father with making decisions ",
              "with regard to allocation of their father's estate, in stark contrast to those things that Kathy could have helped with at near zero cost or risk to herself."
            ].join(""),
            '💚 Rob\'s Loyal Defense'
          )
        ])
      ]);
    }

    buildHistoryCard(title, text, badge) {
      return makeElement('div', { className: 'elder-analysis-card' }, [
        makeElement('div', { className: 'flex justify-between items-center mb-3' }, [
          makeElement('span', { className: 'elder-card-badge' }, badge),
        ]),
        makeElement('h4', { className: 'text-base font-bold text-[var(--text-title)] mb-2' }, title),
        makeElement('p', { className: 'text-sm text-[var(--text-secondary)] leading-relaxed' }, text)
      ]);
    }

    

    buildExhibitItem(app, title, imgSrc, analysis, transcriptText, externalArticleLink = null) {
      const footerElements = [
        makeElement('span', { className: 'font-bold not-italic text-[var(--text-title)] block mb-1 text-[10px] uppercase tracking-wider' }, 'Verbatim Activity Transcript'),
        transcriptText
      ];

      if (externalArticleLink) {
        footerElements.push(
          makeElement('div', { className: 'mt-3' }, [
            makeElement('a', {
              href: externalArticleLink,
              target: '_blank',
              rel: 'noopener noreferrer',
              className: 'inline-link-highlight text-[11px] font-bold'
            }, 'Read Reference Article on Credentialed Misinformation ↗')
          ])
        );
      }

      return makeElement('div', { className: 'exhibit-item-row' }, [
        makeElement('div', { className: 'exhibit-image-wrapper' }, [
          makeElement('img', {
            src: imgSrc,
            alt: title,
            className: 'exhibit-image cursor-pointer',
            onclick: () => {
              if (typeof app.openExhibitModal === 'function') {
                app.openExhibitModal(imgSrc, title);
              }
            },
            onerror: (e) => {
              e.target.style.display = 'none';
              const fallback = e.target.parentNode.querySelector('.exhibit-image-fallback');
              if (fallback) fallback.style.display = 'flex';
            }
          }),
          makeElement('div', {
            className: 'exhibit-image-fallback',
            onclick: () => {
              if (typeof app.openExhibitModal === 'function') {
                app.openExhibitModal(imgSrc, title);
              }
            },
            style: {
              display: 'none',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-panel-inner)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              width: '100%',
              height: '220px',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontFamily: 'ui-monospace, monospace',
              padding: '16px',
              textAlign: 'center',
              cursor: 'pointer'
            }
          }, [
            makeElement('span', { style: { fontSize: '18px', marginBottom: '8px' } }, '📷'),
            makeElement('span', {}, `Screenshot: ${imgSrc.split('/').pop()}`),
            makeElement('span', { style: { fontSize: '9px', marginTop: '4px', opacity: 0.7 } }, 'Click to view full size')
          ])
        ]),
        makeElement('div', { className: 'exhibit-content-wrapper' }, [
          makeElement('h4', { className: 'text-base font-bold text-[var(--text-title)] mb-2' }, title),
          makeElement('p', { className: 'text-sm text-[var(--text-primary)] leading-relaxed mb-3' }, analysis),
          makeElement('div', { className: 'transcript-quote-box text-xs italic border-l-2 border-[#f59e0b] pl-3' }, footerElements)
        ])
      ]);
    }

    buildGeddesSubstackPanel(app) {
      const substackP1 = [
        "Kathleen Brown publicly liked and promoted a publication by Martin Geddes, a prominent figure ",
        "in the conspiratorial QAnon movement. The article she endorsed focuses heavily on demonizing and ",
        "cutting off his own family members simply for holding mainstream, standard views. Geddes actually ",
        "declares his own relatives as 'satanic' and trapped in a 'cult' because they chose to vaccinate ",
        "their children like normal citizens. Kathleen's active promotion of this exact piece during the ",
        "COVID-19 pandemic reveals how deeply she has aligned with extreme conspiratorial thinking, which ",
        "views standard medical consensus as a genocidal plot:"
      ].join("");

      const blockquoteText = [
        "\"We will have to face up to many being orphaned, and perhaps the most tear-inducing ",
        "will be the children of the indicted. Their parents may still be alive (if not executed for ",
        "treason), but in remote military prisons for their own safety and security...\""
      ].join("");

      const substackP2 = [
        "This endorsement is highly relevant to our current care situation: it shows she identifies with and ",
        "normalizes a mindset of discarding close family bonds over tribal ideological differences. For a medical ",
        "doctor holding a fiduciary Power of Attorney to endorse writings that demonize loved ones and call for ",
        "the execution of ordinary citizens as 'traitors' highlights a worrying departure from objective, rational ",
        "caretaking standards. It indicates that her systemic gatekeeping of our mother is influenced by a ",
        "broader pattern of ideological alienation."
      ].join("");

      return makeElement("section", { className: "cad-panel space-y-6" }, [
        makeElement("div", { className: "dashboard-header-group" }, [
          makeElement("h3", {}, "Exhibit 8: Promotion of Radical Conspiracy Theorists (Martin Geddes)"),
          makeElement("p", {}, "An analysis of the extreme conspiratorial publications promoted in Kathleen Brown's public feed, reflecting a highly non-standard worldview.")
        ]),
        
        makeElement("div", { className: "transcript-quote-box leading-relaxed text-sm text-[var(--text-primary)] space-y-4" }, [
          makeElement("p", {}, substackP1),
          makeElement("blockquote", { className: "border-l-4 border-red-500 pl-4 italic text-sm text-[var(--text-secondary)] my-4" }, [
            blockquoteText
          ]),
          makeElement("p", {}, substackP2),
          makeElement("div", { className: "pt-4" }, [
            makeElement("a", {
              href: "https://martingeddes.substack.com/p/this-is-agony-and-it-will-pass",
              target: "_blank",
              rel: "noopener noreferrer",
              className: "nav-link-btn nav-link-btn-accent",
              style: {
                display: "inline-block",
                padding: "8px 16px",
                border: "1px solid var(--border-color)",
                background: "var(--btn-bg)",
                color: "var(--btn-text)",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "12px",
                fontWeight: "bold"
              }
            }, "Verify Original Substack Article ↗")
          ])
        ])
      ]);
    }

    
  
  buildVotingContrastPanel(app) {
      const quoraTitle = 'How can we design voting systems to elect centrist candidates and reduce political divisiveness?';
      const quoraText = [
        "To reduce tribalism, we must replace standard plurality voting with median-based systems like Majority Judgment. ",
        "In these consensus-driven systems, voters grade candidates on a qualitative scale (e.g., 'Excellent' to 'Poor') rather ",
        "than selecting just one. The winner is the candidate with the highest median grade. Because extreme candidates receive ",
        "highly polarized grades, the system mathematically favors unifying, centrist candidates who bring the electorate ",
        "together. This is how we heal tribal division and focus on mutual consensus."
      ].join("");

      return makeElement('section', { className: 'cad-panel space-y-6' }, [
        makeElement('div', { className: 'dashboard-header-group' }, [
          makeElement('h3', {}, "Rob's Public Advocacy & Depolarization"),
          makeElement('p', {}, "A direct contrast showcasing Rob's fourteen-year advocacy for unifying, median-based structures versus Kathy's explicit rejection of consensus.")
        ]),

        makeElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6' }, [
          makeElement('div', { className: 'elder-analysis-card p-6 border-l-4 border-emerald-500' }, [
            makeElement('span', { className: 'elder-card-badge bg-emerald-950/20 text-emerald-400 border-emerald-500/20' }, "Rob's Depolarization Advocacy (Starting 14 Years Ago)"),
            makeElement('h4', { className: 'font-bold text-sm text-[var(--text-title)] my-2' }, quoraTitle),
            makeElement('p', { className: 'text-xs text-[var(--text-secondary)] leading-relaxed italic' }, `"${quoraText}"`),
            makeElement('p', { className: 'text-xs text-[var(--text-primary)] mt-3 font-semibold' }, 
              "Rob has spent over a decade publicly researching and advocating for systems that heal political polarization."
            )
          ]),

          makeElement('div', { className: 'elder-analysis-card p-6 border-l-4 border-red-500 flex flex-col justify-between' }, [
            makeElement('div', {}, [
              makeElement('span', { className: 'elder-card-badge bg-red-950/20 text-red-400 border-red-500/20' }, "Kathy's Polarizing Mandate"),
              makeElement('h4', { className: 'font-bold text-sm text-[var(--text-title)] my-2' }, 'Rejection of the Median'),
              makeElement('blockquote', { className: 'text-xs text-[var(--text-secondary)] leading-relaxed italic border-l border-red-500/30 pl-3 my-2' }, 
                "\"I find consensus-seeking offensive... I believe people in the median are some of the worst.\""
              )
            ]),
            makeElement('p', { className: 'text-xs text-[var(--text-primary)] mt-3 font-semibold' }, 
              "Kathy explicitly rejects political balance, framing the moderate middle as a moral failing - Exhibit A of a polarizing mindset."
            )
          ])
        ])
      ]);
    }

  buildQuoraPolarizationIframe(app) {
      const iframe = makeElement('iframe', {
        id: 'quora-inspector-iframe',
        style: {
          width: '100%',
          height: '650px',
          border: 'none',
          display: 'block'
        }
      });

      fetch('/AccuDrawValuation/quoraPolarization.html')
        .then(res => res.text())
        .then(html => {
          const iframeWindow = iframe.contentWindow || iframe.contentDocument.defaultView;
          if (iframeWindow) {
            iframeWindow.document.open();
            iframeWindow.document.write(html);
            iframeWindow.document.close();
            this.applyQuoraStyles(iframeWindow.document);
          }
        })
        .catch(err => console.error("Error loading clean Quora HTML:", err));

      return makeElement('section', { className: 'cad-panel space-y-6' }, [
        makeElement('div', { className: 'dashboard-header-group' }, [
          makeElement('h3', {}, "Rob's Public Advocacy: Antipolarization & Structural Reforms"),
          makeElement('p', {}, "An interactive archive of Rob Brown's archived Quora answers detailing voting reforms and consensus building.")
        ]),
        makeElement('div', {
          style: {
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-panel-inner)',
            boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.4)'
          }
        }, [
          iframe
        ])
      ]);
    }

  // Method 2: Completely separate styling engine containing only CSS declarations for downstream iteration
    

  getLinkedInExhibitSpecs() {
      const e1Text = [
        "This yellow notepad graphic remains active on Kathleen Brown's professional LinkedIn profile, ",
        "representing her core philosophy of extreme self-reliance. When Rob was forced to negotiate a ",
        "transition runway, she asked condescendingly on the phone: 'Do you think they owe you something?' ",
        "This was in reference to his inventions making Bentley Systems billions of dollars, and the fact that Rob was later ",
        "laid off due to corporate politics. Kathy reacted with utter condescension and zero empathy, ",
        "completely ignoring his historic technical legacy. This occurred while Rob was simultaneously ",
        "navigating a painful custody battle where his daughter's mother turned Rob's daughter against him - yet Kathy ",
        "exhibited a total absence of family support."
      ].join("");

      const e2Text = [
        "Kathleen Brown endorsed and commented in support of Pierre Kory, a prominent proponent of fringe, unscientific COVID-19 ",
        "protocols and anti-vaccine theories. Spreading fringe, unproven alternative medical advice under the banner of ",
        "her professional credentials has long been a major concern of mine. It is my firm belief that doctors leveraging ",
        "their professional status to validate highly unscientific alternative paths cost tens of thousands of individuals their lives, ",
        "allowing ideological tribal partisanship and political identity to override medical evidence and safety. This endorsement ",
        "illustrates how deeply political alignment is permitted to override standard peer-reviewed guidelines."
      ].join("");

      const e3Text = [
        "Following a visit in California where she was attending a conference, ",
        "Kathy publicly commented on the Gavin Newsom recall ",
        "election, asserting that the recall's failure 'tells you something ",
        "about the people who do live there.' She viewed California through a deeply hostile political lens, ",
        "publicly insulting her brother's home immediately after visiting. She also spread rumors online that ", 
        "Newsom really was recalled, one of her extreme conspiracy theories given that he beat the recall by 3 million votes."
      ].join("");

      const e4Text = [
        "Kathleen Brown publicly liked and promoted a publication by QAnon conspiracist Martin Geddes. ",
        "The article she endorsed focuses on demonizing family members who hold standard, mainstream views, ",
        "declaring relatives as 'satanic' or trapped in a 'cult' because they chose to vaccinate. This gets to ",
        "the absolute heart of our current care situation: it shows she normalizes a mindset of discarding ",
        "and isolating close family members over tribal ideological differences."
      ].join("");

      return [
        {
          title: 'Exhibit 1: The "Owes You" Yellow Pad',
          imgSrc: '/images/k_owesYou.png',
          analysis: e1Text,
          transcript: [
            "Kathleen Brown likes this: \"Here is a comprehensive list of ",
            "everything you're entitled to and what the world owes you.\" ",
            "(Blank yellow pad)"
          ].join(""),
          link: null
        },
        {
          title: 'Exhibit 2: Support for Suspended Figures (Pierre Kory)',
          imgSrc: '/images/k_kory.png',
          analysis: e2Text,
          transcript: [
            "Kathleen Brown likes and comments on fringe COVID claims: \"We need ",
            "you and your colleagues. Thank you for all your efforts!\" ",
            "(Dr. Pierre Kory, whose alternative treatment advice was heavily ",
            "flagged, resulting in licensing investigations)."
          ].join(""),
          link: 'https://www.medpagetoday.com/'
        },
        {
          title: 'Exhibit 3: Anti-California Hostility',
          imgSrc: '/images/k_california.png',
          analysis: e3Text,
          transcript: [
            "Kathleen Brown comments on Newsom recall: \"That Gavin Newsom survived ",
            "recall tells you something about the people who do live there...\""
          ].join(""),
          link: null
        },
        {
          title: 'Exhibit 4: Martin Geddes / Family Demonization',
          imgSrc: '/images/k_qanon.png',
          analysis: e4Text,
          transcript: [
            "Kathleen Brown likes: \"We will have to face up to many being ",
            "orphaned... we cannot buckle or bend the knee... We cannot let ",
            "the children down.\""
          ].join(""),
          link: null
        }
      ];
    }

  buildLinkedInExhibitsPanel(app) {
      const specs = this.getLinkedInExhibitSpecs();
      const items = specs.map(spec => {
        return this.buildExhibitItem(app, spec.title, spec.imgSrc, spec.analysis, spec.transcript, spec.link);
      });

      return makeElement('section', { className: 'cad-panel space-y-8' }, [
        makeElement('div', { className: 'dashboard-header-group mb-4' }, [
          makeElement('h3', {}, 'Documented LinkedIn Activity'),
          makeElement('p', {}, [
            "Below are the four verified screenshots documenting Kathleen Brown's public ",
            "activity. Crucially, the 'Owes You' post remains on her profile today, while the other conspiracy ",
            "posts were subsequently flagged or removed by LinkedIn for spreading misinformation."
          ])
        ]),
        makeElement('div', { className: 'space-y-8' }, ...items)
      ]);
    }

  applyStyles() {
      this.applyCaretakerTimelineCSS();
      this.applyCaretakerExhibitCSS();
      this.applyCaretakerGridCSS();
    }

  applyCaretakerTimelineCSS() {
      applyCss([
        ".timeline-flow {",
        "  margin-top: 28px !important;",
        "  padding: 16px 0 !important;",
        "}",
        ".timeline-item {",
        "  border-left: 2px solid #3b82f6;",
        "  padding-left: 28px;",
        "  margin-left: 8px;",
        "  position: relative;",
        "  padding-bottom: 32px !important;",
        "}",
        ".timeline-item-dot {",
        "  position: absolute;",
        "  left: -6px;",
        "  top: 4px;",
        "  width: 10px;",
        "  height: 10px;",
        "  border-radius: 50%;",
        "  background-color: #3b82f6;",
        "  border: 2px solid #070a12;",
        "}"
      ].join("\n"), 'caretaker-timeline-styles');
    }

  applyCaretakerExhibitCSS() {
      applyCss([
        ".exhibit-item-row {",
        "  display: flex;",
        "  flex-direction: column;",
        "  gap: 28px;",
        "  padding: 32px !important;",
        "  background-color: var(--bg-panel-inner);",
        "  border: 1px solid var(--border-color);",
        "  border-radius: 12px;",
        "  margin-bottom: 32px !important;",
        "}",
        "@media (min-width: 768px) {",
        "  .exhibit-item-row {",
        "    flex-direction: row;",
        "    align-items: start;",
        "  }",
        "}",
        ".exhibit-image-wrapper {",
        "  width: 100%;",
        "  max-width: 100%;",
        "  flex-shrink: 0;",
        "}",
        "@media (min-width: 768px) {",
        "  .exhibit-image-wrapper {",
        "    width: 280px;",
        "  }",
        "}",
        ".exhibit-image {",
        "  width: 100%;",
        "  height: auto;",
        "  border-radius: 8px;",
        "  border: 1px solid var(--border-color);",
        "}",
        ".exhibit-content-wrapper {",
        "  flex: 1;",
        "  min-width: 0;",
        "}",
        ".exhibit-content-wrapper p {",
        "  margin-bottom: 1.25rem !important;",
        "  line-height: 1.8 !important;",
        "}",
        ".exhibit-content-wrapper p:last-child {",
        "  margin-bottom: 0 !important;",
        "}",
        ".backstory-paragraph, .backstory-paragraph-highlight {",
        "  margin-bottom: 1.75rem !important;",
        "  line-height: 1.85 !important;",
        "}",
        ".backstory-paragraph:last-child, .backstory-paragraph-highlight:last-child {",
        "  margin-bottom: 0 !important;",
        "}",
        ".transcript-quote-box {",
        "  margin-top: 1.25rem !important;",
        "  line-height: 1.8 !important;",
        "  padding: 24px !important;",
        "  background-color: var(--bg-panel-inner);",
        "  border: 1px solid var(--border-color);",
        "  border-radius: 8px;",
        "}"
      ].join("\n"), 'caretaker-exhibit-styles');
    }

  applyCaretakerGridCSS() {
      applyCss([
        ".elder-analysis-grid {",
        "  display: grid;",
        "  grid-template-columns: 1fr;",
        "  gap: 24px;",
        "}",
        "@media (min-width: 768px) {",
        "  .elder-analysis-grid {",
        "    grid-template-columns: repeat(2, 1fr);",
        "  }",
        "}",
        ".elder-analysis-card {",
        "  padding: 24px;",
        "  background-color: var(--bg-panel-inner);",
        "  border: 1px solid var(--border-color);",
        "  border-radius: 12px;",
        "  transition: all 0.2s;",
        "}",
        ".elder-analysis-card:hover {",
        "  border-color: var(--border-hover);",
        "}",
        ".elder-card-badge {",
        "  font-size: 10px;",
        "  font-family: ui-monospace, monospace;",
        "  font-weight: bold;",
        "  text-transform: uppercase;",
        "  color: #3b82f6;",
        "  background: rgba(59, 130, 246, 0.1);",
        "  border: 1px solid rgba(59, 130, 246, 0.2);",
        "  padding: 3px 10px;",
        "  border-radius: 4px;",
        "}"
      ].join("\n"), 'caretaker-grid-styles');
    }

  applyQuoraStyles(doc) {
      const styleBlock = doc.createElement('style');
      styleBlock.id = 'q-injected-stylesheet';

      const vars = [
        ":root {",
        "  --q-red: #b92b27;",
        "  --q-bg: #f8fafc;",
        "  --q-card-bg: #ffffff;",
        "  --q-border: #e2e8f0;",
        "  --q-text: #334155;",
        "  --q-text-sub: #64748b;",
        "  --q-link: #2563eb;",
        "  --q-badge: #f1f5f9;",
        "}",
        "@media (prefers-color-scheme: dark) {",
        "  :root {",
        "    --q-bg: #0c111d;",
        "    --q-card-bg: #141c2b;",
        "    --q-border: #1e293b;",
        "    --q-text: #cbd5e1;",
        "    --q-text-sub: #94a3b8;",
        "    --q-link: #3b82f6;",
        "    --q-badge: #1e293b;",
        "  }",
        "}"
      ].join("\n");

      const layout = [
        "body {",
        "  font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif;",
        "  color: var(--q-text);",
        "  background-color: var(--q-bg);",
        "  margin: 0;",
        "  padding: 24px 16px;",
        "  display: flex;",
        "  flex-direction: column;",
        "  align-items: center;",
        "}",
        ".q-card {",
        "  background-color: var(--q-card-bg) !important;",
        "  border: 1px solid var(--q-border) !important;",
        "  border-radius: 12px !important;",
        "  width: 100% !important;",
        "  max-width: 650px !important;",
        "  padding: 24px !important;",
        "  margin-bottom: 24px !important;",
        "  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05) !important;",
        "  box-sizing: border-box !important;",
        "  display: block !important;",
        "}"
      ].join("\n");

      const author = [
        ".q-author-row {",
        "  display: flex !important;",
        "  flex-direction: row !important;",
        "  align-items: center !important;",
        "  gap: 12px !important;",
        "  margin: 14px 0 !important;",
        "  width: 100% !important;",
        "}",
        ".q-avatar {",
        "  width: 40px !important;",
        "  height: 40px !important;",
        "  border-radius: 50% !important;",
        "  object-fit: cover !important;",
        "  border: 1px solid var(--q-border) !important;",
        "  display: inline-block !important;",
        "  flex-shrink: 0 !important;",
        "}"
      ].join("\n");

      const links = [
        "p a, span a, a.q-explicit-link {",
        "  color: var(--q-link) !important;",
        "  text-decoration: underline !important;",
        "}",
        "a[href*=\"/Whats-so-bad-about-plurality-voting/\"], a[href*=\"/answer/\"], a[title] {",
        "  display: flex !important;",
        "  flex-direction: row !important;",
        "  align-items: center !important;",
        "  border: 1px solid var(--q-border) !important;",
        "  border-radius: 8px !important;",
        "  margin: 16px 0 !important;",
        "  padding: 12px !important;",
        "  background-color: var(--q-badge) !important;",
        "  overflow: hidden !important;",
        "  max-height: 120px !important;",
        "  width: 100% !important;",
        "  box-sizing: border-box !important;",
        "}"
      ].join("\n");

      styleBlock.textContent = [vars, layout, author, links].join("\n");
      doc.head.appendChild(styleBlock);
    }
}