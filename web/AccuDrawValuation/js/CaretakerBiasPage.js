class CaretakerBiasPage {
    render(app) {
      this.applyStyles();
      const container = makeElement("div", { className: "space-y-8" });
      container.appendChild(this.buildCaretakerIntroBlock(app));
      container.appendChild(this.buildCaretakerTimelineBlock(app));
      container.appendChild(this.buildCaretakerHistoryGrid(app));
      container.appendChild(this.buildLinkedInExhibitsPanel(app));
      container.appendChild(this.buildGeddesSubstackPanel(app));
      return container;
    }

    buildCaretakerIntroBlock(app) {
      const p1 = [
        "This dossier has been compiled to document a consistent, verifiable ",
        "pattern of personal animosity, ideological bias, and communication ",
        "barriers on the part of the current Power of Attorney (POA) holder. By ",
        "presenting public social media postings and family records, we demonstrate ",
        "that the strict gatekeeping of our 94-year-old mother is likely motivated ",
        "by a personal grudge rather than objective caregiving needs."
      ].join("");

      const p2 = [
        "This analysis is intended for legal counsel, Adult Protective Services, and ",
        "medical coordinators to provide context for the current communication embargo ",
        "and to support our petition for unpoliced, direct contact with our mother."
      ].join("");

      return makeElement("div", { className: "backstory-gradient-card" }, [
        makeElement("h3", { className: "text-lg font-bold text-[var(--text-title)]" }, "Documentary Objective"),
        makeElement("p", { className: "backstory-paragraph-highlight" }, p1),
        makeElement("p", { className: "backstory-paragraph" }, p2)
      ]);
    }

    buildCaretakerTimelineBlock(app) {
      const item1Text = [
        "Late-night discussion in Virginia regarding intellectual property economics. ",
        "When Rob expressed frustration over career outcomes and the economics of ",
        "digital tools, Kathy's husband Jack asserted: 'If it doesn't make you ",
        "money, it doesn't have value.' Kathy escalated the argument, stating: ",
        "'We've got a lot of guns and we're not afraid to use them.' Rob's query ",
        "('Is that a threat?') was met with silence as she walked out. This event ",
        "forced Rob to seek therapy."
      ].join("");

      const item2Text = [
        "A few months later, sister Suzanne brought up politics on a family group text ",
        "chat. Having previously warned them not to discuss politics, Rob reacted strongly, ",
        "disclosing Kathy's gun threat and demanding boundaries. This led to a complete ",
        "breakdown: Rob and Kathy did not speak for over two years, and Rob did not speak to ",
        "Suzanne for over a year, demonstrating Kathy's deep-seated resentment."
      ].join("");

      const item3Text = [
        "Now acting as the primary POA and care coordinator, Kathy's long-standing grudge ",
        "culminated in a complete communication firewall. When Rob contacted 24/7 care supervisor ",
        "Shirley to arrange a video call with his mother, Shirley stated that she was under ",
        "strict instructions to block any contact unless explicitly cleared by Kathy."
      ].join("");

      return makeElement("section", { className: "cad-panel space-y-6" }, [
        makeElement("h2", { 
          className: "text-xl font-bold text-[var(--text-title)] uppercase tracking-wide", 
          style: { fontFamily: "ui-monospace, monospace" } 
        }, "Timeline of the Gatekeeping Grudge"),
        
        makeElement("div", { className: "timeline-flow space-y-6" }, [
          this.buildTimelineItem("Late 2022 (Dad's Funeral)", item1Text, "🔴 The Gun Threat"),
          this.buildTimelineItem("Late 2022 / Early 2023 (Group Text Blowout)", item2Text, "💬 Group Text Blowout"),
          this.buildTimelineItem("Early 2026 (The Current Embargo)", item3Text, "🔒 Systemic Gatekeeping")
        ])
      ]);
    }

    buildTimelineItem(time, desc, badge) {
      return makeElement("div", { className: "timeline-item pl-6 relative" }, [
        makeElement("span", { className: "timeline-item-dot" }),
        makeElement("div", { className: "flex justify-between items-center mb-2" }, [
          makeElement("span", { className: "timeline-time font-bold text-[#3b82f6] text-sm" }, time),
          makeElement("span", { className: "elder-card-badge" }, badge)
        ]),
        makeElement("p", { className: "text-sm text-[var(--text-secondary)] leading-relaxed" }, desc)
      ]);
    }

    buildCaretakerHistoryGrid(app) {
      return makeElement("section", { className: "cad-panel space-y-6" }, [
        makeElement("h2", { 
          className: "text-xl font-bold text-[var(--text-title)] uppercase tracking-wide", 
          style: { fontFamily: "ui-monospace, monospace" } 
        }, "Historical Inconsistencies of 'Self-Reliance'"),
        makeElement("p", { className: "text-sm text-[var(--text-secondary)]" }, 
          "A record of past instances where Kathy refused family assistance based on extreme individualism, contrasted with Rob's immediate personal support."
        ),
        
        makeElement("div", { className: "elder-analysis-grid" }, [
          this.buildHistoryCard(
            "Refusal to Support Mother (20 Years Ago)",
            [
              "When their mother experienced controlling behavior from their father, ",
              "Rob proposed a unified sibling alliance to protect her. Kathy refused ",
              "to assist, stating that their mother got herself into the situation and ",
              "'asked for it'. She has now assumed complete control over her care."
            ].join(""),
            "❌ Refusal of Aid"
          ),
          this.buildHistoryCard(
            "Refusal of Mediation in San Francisco",
            [
              "During a looming custody and residential crisis, Rob asked Kathy (who was ",
              "visiting SF) to spend just an hour speaking with his ex-wife and her mother ",
              "to help mediate and prevent a custody disaster. Citing individual responsibility, ",
              "she flatly refused to help, worsening the outcome."
            ].join(""),
            "❌ Refusal of Mediation"
          ),
          this.buildHistoryCard(
            "Refusal to Assist with Family Interference",
            [
              "When their late father was micromanaging Rob's legal defense while showing early ",
              "cognitive decline, Rob asked Kathy to ask him to stop interfering. She refused, ",
              "stating: 'If you accept help, it's going to have strings attached.' While some ",
              "strings are expected, using that as an excuse to allow his defense case to be ruined ",
              "is an absurd and harmful refusal."
            ].join(""),
            "❌ Refusal of Protection"
          ),
          this.buildHistoryCard(
            "Contrast: Rob's 2020 Defense of Kathy",
            [
              "When their father's brother Gene sent an abusive email slamming Kathy, ",
              "Rob immediately wrote a strong, unhesitating defense of her, showing loyalty ",
              "that Kathy has consistently failed to return."
            ].join(""),
            "💚 Rob's Loyal Defense"
          )
        ])
      ]);
    }

    buildHistoryCard(title, text, badge) {
      return makeElement("div", { className: "elder-analysis-card" }, [
        makeElement("div", { className: "flex justify-between items-center mb-3" }, [
          makeElement("span", { className: "elder-card-badge" }, badge),
        ]),
        makeElement("h4", { className: "text-base font-bold text-[var(--text-title)] mb-2" }, title),
        makeElement("p", { className: "text-sm text-[var(--text-secondary)] leading-relaxed" }, text)
      ]);
    }

    buildLinkedInExhibitsPanel(app) {
      const e1Text = [
        "Following a visit with Rob and his daughter, Kathleen Brown commented publicly on Gavin ",
        "Newsom's recall election, claiming rumored election fraud and asserting that the recall's ",
        "failure 'tells you something about the people who do live there.' She viewed California ",
        "through a hostile political lens, seeing 'liberals' that she hates, and publicly insulted ",
        "her brother's home right after visiting him."
      ].join("");

      const e2Text = [
        "Kathleen Brown endorsed a post displaying a blank yellow legal pad titled: ",
        "'Here is a comprehensive list of everything you're entitled to and what the world ",
        "owes you.' This directly aligns with her condescending statement to Rob on the phone: ",
        "'Do you think they owe you something?' indicating a rigid bias against family support. ",
        "This stands in shocking contrast to Rob's estimated $2.3 Billion value created for Bentley ",
        "- proving his accomplishments are world-class, yet she declared his talents 'irrelevant' ",
        "and stated that she and her husband would never recommend him for any job."
      ].join("");

      return makeElement("section", { className: "cad-panel space-y-8" }, [
        makeElement("div", { className: "dashboard-header-group mb-4" }, [
          makeElement("h3", {}, "The LinkedIn Documentary Library"),
          makeElement("p", {}, 
            "Captured exhibits of Kathleen Brown's public professional activity from the sibling directory `/LegalImages/`, proving an active ideological and personal bias."
          )
        ]),
        
        makeElement("div", { className: "space-y-8" }, [
          this.buildExhibitItem(app,
            "Exhibit 1: General Anti-California Hostility",
            "/LegalImages/exhibit3_newsom_recall.png",
            e1Text,
            "Kathleen Brown commented on this: 'That Gavin Newsom survived recall tells you something about the people who do live there...'"
          ),
          this.buildExhibitItem(app,
            "Exhibit 2: Hostility to Mutual Support vs. $2.3B Valuation",
            "/LegalImages/exhibit4_blank_notebook.png",
            e2Text,
            "Kathleen Brown likes this: 'Here is a comprehensive list of everything you're entitled to and what the world owes you.' (Blank pad image)."
          ),
          this.buildExhibitItem(app,
            "Exhibit 3: Bob Nelson, MD / 'Bizarro World'",
            "/LegalImages/exhibit1_bizarro.png",
            "Kathleen Brown liked a post advocating peaceful civil disobedience and describing common sense guidelines as a 'Bizarro World'.",
            "Kathleen Brown likes this: 'Does it seem like we are all in a scene from the movie Idiocracy...'"
          ),
          this.buildExhibitItem(app,
            "Exhibit 4: Marty Makary, MD / Covid Risk Low",
            "/LegalImages/exhibit2_flu_season.png",
            "Kathleen Brown liked a post claiming COVID risks are extremely low and accusing public health of feeding fear.",
            "Kathleen Brown likes this: 'the sadness of folks responding to fear fed by propagandized media...'"
          ),
          this.buildExhibitItem(app,
            "Exhibit 5: Marty Makary, MD / McCarthyism",
            "/LegalImages/exhibit5_mccarthyism.png",
            "Kathleen Brown liked a post comparing vaccine authorization to 'modern-day McCarthyism' and complaining of cancellation.",
            "Kathleen Brown finds this insightful: 'Tragically today, anyone suggesting healthy kids stop is subjected to McCarthyism...'"
          ),
          this.buildExhibitItem(app,
            "Exhibit 6: Pierre Kory, MD / CNN Critique",
            "/LegalImages/exhibit6_rogan_ivermectin.png",
            "Kathleen Brown commented publicly supporting a post criticizing mainstream coverage of ivermectin, thanking advocates.",
            "Kathleen Brown commented on this: 'We need you and your colleagues. Thank you for all your efforts!'"
          ),
          this.buildExhibitItem(app,
            "Exhibit 7: Diana Girnita, MD / Vaccine Injury Essay",
            "/LegalImages/exhibit7_vaccinated_hurting.png",
            "Kathleen Brown commented supporting an essay on alleged vaccine injury inside Sacramento, praising the patient perspective.",
            "Kathleen Brown commented: 'Great essay by your patient! Individual stories really matter...'"
          )
        ])
      ]);
    }

    buildExhibitItem(app, title, imgSrc, analysis, transcriptText) {
      return makeElement("div", { className: "exhibit-item-row" }, [
        makeElement("div", { className: "exhibit-image-wrapper" }, [
          makeElement("img", {
            src: imgSrc,
            alt: title,
            className: "exhibit-image cursor-pointer",
            onclick: () => app.openExhibitModal(imgSrc, title),
            onerror: (e) => {
              e.target.style.display = "none";
              const fallback = e.target.parentNode.querySelector(".exhibit-image-fallback");
              if (fallback) fallback.style.display = "flex";
            }
          }),
          makeElement("div", {
            className: "exhibit-image-fallback",
            onclick: () => app.openExhibitModal(imgSrc, title),
            style: {
              display: "none",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg-panel-inner)",
              border: "1px dashed var(--border-color)",
              borderRadius: "8px",
              width: "100%",
              height: "220px",
              color: "var(--text-secondary)",
              fontSize: "11px",
              fontFamily: "ui-monospace, monospace",
              padding: "16px",
              textAlign: "center",
              cursor: "pointer"
            }
          }, [
            makeElement("span", { style: { fontSize: "18px", marginBottom: "8px" } }, "📷"),
            makeElement("span", {}, `Screenshot: ${imgSrc.split("/").pop()}`),
            makeElement("span", { style: { fontSize: "9px", marginTop: "4px", opacity: 0.7 } }, "Click to view fallback")
          ])
        ]),
        makeElement("div", { className: "exhibit-content-wrapper" }, [
          makeElement("h4", { className: "text-base font-bold text-[var(--text-title)] mb-2" }, title),
          makeElement("p", { className: "text-sm text-[var(--text-primary)] leading-relaxed mb-3" }, analysis),
          makeElement("div", { className: "transcript-quote-box text-xs italic border-l-2 border-[#f59e0b] pl-3" }, [
            makeElement("span", { className: "font-bold not-italic text-[var(--text-title)] block mb-1 text-[10px] uppercase tracking-wider" }, "Verbatim Activity Transcript"),
            transcriptText
          ])
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

    applyStyles() {
      applyCss(`
        .timeline-flow {
          margin-top: 28px !important;
          padding: 16px 0 !important;
        }
        .timeline-item {
          border-left: 2px solid #3b82f6;
          padding-left: 28px;
          margin-left: 8px;
          position: relative;
          padding-bottom: 32px !important;
        }
        .timeline-item-dot {
          position: absolute;
          left: -6px;
          top: 4px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: #3b82f6;
          border: 2px solid #070a12;
        }
        .exhibit-item-row {
          display: flex;
          flex-direction: column;
          gap: 28px;
          padding: 32px !important;
          background-color: var(--bg-panel-inner);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          margin-bottom: 32px !important;
        }
        @media (min-width: 768px) {
          .exhibit-item-row {
            flex-direction: row;
            align-items: start;
          }
        }
        .exhibit-image-wrapper {
          width: 100%;
          max-width: 100%;
          flex-shrink: 0;
        }
        @media (min-width: 768px) {
          .exhibit-image-wrapper {
            width: 280px;
          }
        }
        .exhibit-image {
          width: 100%;
          height: auto;
          border-radius: 8px;
          border: 1px solid var(--border-color);
        }
        .exhibit-content-wrapper {
          flex: 1;
          min-width: 0;
        }
        .exhibit-content-wrapper p {
          margin-bottom: 1.25rem !important;
          line-height: 1.8 !important;
        }
        .exhibit-content-wrapper p:last-child {
          margin-bottom: 0 !important;
        }
        .backstory-paragraph, .backstory-paragraph-highlight {
          margin-bottom: 1.75rem !important;
          line-height: 1.85 !important;
        }
        .backstory-paragraph:last-child, .backstory-paragraph-highlight:last-child {
          margin-bottom: 0 !important;
        }
        .transcript-quote-box {
          margin-top: 1.25rem !important;
          line-height: 1.8 !important;
          padding: 24px !important;
        }
        .elder-analysis-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 28px;
          margin-top: 24px;
          margin-bottom: 24px;
        }
        @media (min-width: 768px) {
          .elder-analysis-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .elder-analysis-card {
          background-color: var(--bg-panel-inner);
          border: 1px solid var(--border-color);
          padding: 32px !important;
          border-radius: 12px;
          transition: border-color 0.2s;
        }
        .elder-analysis-card p {
          line-height: 1.8 !important;
          margin-top: 10px;
        }
        .elder-card-badge {
          font-size: 10px;
          font-family: ui-monospace, monospace;
          font-weight: bold;
          text-transform: uppercase;
          color: #3b82f6;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.2);
          padding: 3px 10px;
          border-radius: 4px;
        }
      `, "caretaker-bias-page-styles");
    }
  }