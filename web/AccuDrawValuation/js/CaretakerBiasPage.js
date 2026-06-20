class CaretakerBiasPage {
    render(app) {
      this.applyStyles();
      const container = makeElement('div', { className: 'space-y-8' });
      container.appendChild(this.buildCaretakerIntroBlock(app));
      container.appendChild(this.buildCaretakerTimelineBlock(app));
      container.appendChild(this.buildLinkedInExhibitsPanel(app));
      container.appendChild(this.buildVotingContrastPanel(app));
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
        "This analysis demonstrates that the systemic gatekeeping of our mother ",
        "and the abrupt termination of my transition runway are motivated by a ",
        "long-standing personal grudge, fueled by radicalized tribal beliefs that ",
        "justify demonizing close family members."
      ].join("");

      return makeElement('div', { className: 'backstory-gradient-card' }, [
        makeElement('h3', { className: 'text-lg font-bold text-[var(--text-title)]' }, 'Fiduciary Role & Objective of This Dossier'),
        makeElement('p', { className: 'backstory-paragraph-highlight' }, p1),
        makeElement('p', { className: 'backstory-paragraph' }, p2)
      ]);
    }

    buildCaretakerTimelineBlock(app) {
      const item1Text = [
        "During a late-night discussion in Virginia regarding intellectual property economics, ",
        "Kathy's husband Jack asserted: 'If it doesn't make you money, it doesn't have value.' ",
        "Kathy escalated the argument, stating: 'We've got a lot of guns and we're not afraid to use them.' ",
        "Rob's query ('Is that a threat?') was met with complete silence as she walked out. This extreme ",
        "hostility initiated a profound period of personal distress."
      ].join("");

      const item2Text = [
        "Shortly after the Virginia incident, Rob discovered that Kathy had been publicly posting ",
        "condescending and hostile comments on her professional LinkedIn profile (such as the 'Owes You' exhibit). ",
        "Realizing she was publicly denigrating his character soon after his multi-billion dollar CAD contributions ",
        "were dismissed, combined with the active gun threat, devastated Rob's emotional health and necessitated ",
        "professional therapy. This breakdown in family communication occurred in early 2022 (around March)."
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
          "A record of past instances where Kathy refused family assistance based on extreme individualism, contrasted with Rob's immediate personal support."
        ),
        
        makeElement('div', { className: 'elder-analysis-grid' }, [
          this.buildHistoryCard(
            'Refusal to Support Mother (20 Years Ago)',
            [
              "When their mother experienced controlling behavior from their father, ",
              "Rob proposed a unified sibling alliance to protect her. Kathy refused ",
              "to assist, stating that their mother got herself into the situation and ",
              "'asked for it'. She has now assumed complete control over her care."
            ].join(""),
            '❌ Refusal of Aid'
          ),
          this.buildHistoryCard(
            'Refusal of Mediation in San Francisco',
            [
              "During a looming custody and residential crisis, Rob asked Kathy (who was ",
              "visiting SF) to spend just an hour speaking with his ex-wife and her mother ",
              "to help mediate and prevent a custody disaster. Citing individual responsibility, ",
              "she flatly refused to help, worsening the outcome."
            ].join(""),
            '❌ Refusal of Mediation'
          ),
          this.buildHistoryCard(
            'Refusal to Assist with Family Interference',
            [
              "When their late father was micromanaging Rob's legal defense while showing early ",
              "cognitive decline, Rob asked Kathy to ask him to stop interfering. She refused, ",
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
              "that Kathy has consistently failed to return."
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

    buildLinkedInExhibitsPanel(app) {
      const e1Text = [
        "This yellow notepad graphic remains active on Kathleen Brown's professional LinkedIn profile, ",
        "representing her core philosophy of extreme self-reliance. When Rob was forced to negotiate a ",
        "transition runway, she asked condescendingly on the phone: 'Do you think they owe you something?' ",
        "This was in reference to his inventions making Bentley Systems billions of dollars. Rob was later ",
        "laid off due to corporate management changes. Kathy reacted with utter condescension and zero empathy, ",
        "completely ignoring his historic technical legacy. This occurred while Rob was simultaneously ",
        "navigating a painful custody battle where his daughter's mother turned her against him - yet Kathy ",
        "exhibited a total absence of family support."
      ].join("");

      const e2Text = [
        "Kathleen Brown endorsed a post describing public health guidelines as a 'Bizarro World' and ",
        "promoting fringe COVID-19 conspiracies. While this and the other conspiracy screenshots were later ",
        "removed or flagged by LinkedIn for spreading misinformation, they were captured beforehand. As a ",
        "practicing medical doctor, Kathy used her credentials to promote highly unscientific positions that ",
        "she knew her brother strongly disagreed with, violating basic medical and professional standards."
      ].join("");

      const e3Text = [
        "Following a visit with Rob and his daughter, Kathy publicly commented on the Gavin Newsom recall ",
        "election, claiming rumored election fraud and asserting that the recall's failure 'tells you something ",
        "about the people who do live there.' She viewed California through a deeply hostile political lens, ",
        "publicly insulting her brother's home immediately after enjoying his hospitality."
      ].join("");

      const e4Text = [
        "Kathleen Brown publicly liked and promoted a publication by QAnon conspiracist Martin Geddes. ",
        "The article she endorsed focuses on demonizing family members who hold standard, mainstream views, ",
        "declaring relatives as 'satanic' or trapped in a 'cult' because they chose to vaccinate. This get to ",
        "the absolute heart of our current care situation: it shows she normalizes a mindset of discarding ",
        "and isolating close family members over tribal ideological differences."
      ].join("");

      return makeElement('section', { className: 'cad-panel space-y-8' }, [
        makeElement('div', { className: 'dashboard-header-group mb-4' }, [
          makeElement('h3', {}, 'Documented LinkedIn Activity'),
          makeElement('p', {}, [
            "Below are the four verified screenshots from `/images/` documenting Kathleen Brown's public ",
            "activity. Crucially, the 'Owes You' post remains on her profile today, while the other conspiracy ",
            "posts were subsequently flagged or removed by LinkedIn for spreading misinformation."
          ])
        ]),
        
        makeElement('div', { className: 'space-y-8' }, [
          this.buildExhibitItem(app,
            'Exhibit 1: The "Owes You" Yellow Pad',
            '/images/k_owesYou.png',
            e1Text,
            'Kathleen Brown likes this: "Here is a comprehensive list of everything you\'re entitled to and what the world owes you." (Blank yellow pad)'
          ),
          this.buildExhibitItem(app,
            'Exhibit 2: Support for Suspended Figures (Pierre Kory)',
            '/images/k_kory.png',
            e2Text,
            'Kathleen Brown likes and comments on fringe COVID claims: "We need you and your colleagues. Thank you for all your efforts!" (Dr. Pierre Kory, whose medical license was subsequently suspended/revoked)'
          ),
          this.buildExhibitItem(app,
            'Exhibit 3: Anti-California Hostility',
            '/images/k_california.png',
            e3Text,
            'Kathleen Brown comments on Newsom recall: "That Gavin Newsom survived recall tells you something about the people who do live there..."'
          ),
          this.buildExhibitItem(app,
            'Exhibit 4: Martin Geddes / Family Demonization',
            '/images/k_qanon.png',
            e4Text,
            'Kathleen Brown likes: "We will have to face up to many being orphaned... we cannot buckle or bend the knee... We cannot let the children down."'
          )
        ])
      ]);
    }

    buildExhibitItem(app, title, imgSrc, analysis, transcriptText) {
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
              border: '1px dashed var(--border-color)',
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
          makeElement('div', { className: 'transcript-quote-box text-xs italic border-l-2 border-[#f59e0b] pl-3' }, [
            makeElement('span', { className: 'font-bold not-italic text-[var(--text-title)] block mb-1 text-[10px] uppercase tracking-wider' }, 'Verbatim Activity Transcript'),
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
          background-color: var(--bg-panel-inner);
          border: 1px solid var(--border-color);
          border-radius: 8px;
        }
        .elder-analysis-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        @media (min-width: 768px) {
          .elder-analysis-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .elder-analysis-card {
          padding: 24px;
          background-color: var(--bg-panel-inner);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          transition: all 0.2s;
        }
        .elder-analysis-card:hover {
          border-color: var(--border-hover);
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
      `, 'caretaker-bias-page-styles');
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
          makeElement('h3', {}, 'A Study in Worldview: Consensus vs. Extremism'),
          makeElement('p', {}, 'A direct contrast demonstrating Rob\'s decade-long advocacy for unifying, median-based structures versus Kathy\'s explicit rejection of consensus.')
        ]),

        makeElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6' }, [
          makeElement('div', { className: 'elder-analysis-card p-6 border-l-4 border-emerald-500' }, [
            makeElement('span', { className: 'elder-card-badge bg-emerald-950/20 text-emerald-400 border-emerald-500/20' }, 'Rob\'s Quora Essay (12 Years Ago)'),
            makeElement('h4', { className: 'font-bold text-sm text-[var(--text-title)] my-2' }, quoraTitle),
            makeElement('p', { className: 'text-xs text-[var(--text-secondary)] leading-relaxed italic' }, `"${quoraText}"`),
            makeElement('p', { className: 'text-xs text-[var(--text-primary)] mt-3 font-semibold' }, 
              "Rob has spent over a decade publicly researching and advocating for systems that heal political polarization."
            )
          ]),

          makeElement('div', { className: 'elder-analysis-card p-6 border-l-4 border-red-500 flex flex-col justify-between' }, [
            makeElement('div', {}, [
              makeElement('span', { className: 'elder-card-badge bg-red-950/20 text-red-400 border-red-500/20' }, 'Kathy\'s Polarizing Mandate'),
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
}