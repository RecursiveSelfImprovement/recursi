class OverviewPage {
    render(app) {
      this.applyStyles();
      return makeElement("div", { className: "space-y-12 pb-12" }, [
        this.buildProfessionalOverview(app),
        makeElement("section", { className: "cad-panel space-y-6" }, [
          makeElement("h2", { 
            className: "text-xl font-bold text-[var(--text-title)] uppercase tracking-wide", 
            style: { fontFamily: "ui-monospace, monospace" } 
          }, "Trust Arrangements & Systemic Roadblocks"),
          this.buildConcernsGrid(app)
        ]),
        this.buildRequestBlock(app)
      ]);
    }

    buildProfessionalOverview(app) {
      return makeElement("div", { className: "backstory-gradient-card" }, [
        makeElement("h3", { className: "text-xl font-bold text-[var(--text-title)]" }, "Fiduciary Impasse & Restorative Runway Proposal"),
        makeElement("p", { className: "backstory-paragraph-highlight" }, [
          "We are now well into the execution of the plan, and the second half of the fund allocation has been cut off because I did not take a low-level, low-wage job. This document is no longer a forward-looking proposal; rather, it is a retrospective explanation of why the unworkable trust terms and the subsequent funding cutoff constitute an unwarranted penalty, and why my decisions were based on absolute mathematical necessity. At 62 years of age and carrying significant debt, abandoning my extremely rare skills - which have historically generated billions of dollars in enterprise value (as detailed on the ",
          makeElement("a", {
            href: "#/value-assessment",
            className: "inline-link-highlight"
          }, "Valuation Assessment page"),
          " and supported by independent AI evaluations) - to take a survival-level job made no practical sense. Doing so would have guaranteed permanent debt with zero path to retirement, whereas a strategic runway focused on high-leverage software creation remained the only realistic path to long-term solvency and self-sufficiency."
        ]),
        this.buildAnalogiesRow() // Embedded side-by-side within the narrative overview
      ]);
    }

    applyStyles() {
      applyCss(`
        .overview-grid-spacing {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px !important;
          margin-top: 16px !important;
        }
        @media (min-width: 768px) {
          .overview-grid-spacing {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        .overview-concern-card {
          background-color: var(--bg-panel-inner) !important;
          border: 1px solid var(--border-color) !important;
          border-radius: 12px !important;
          padding: 28px !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 16px !important;
          transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
        }
        .overview-concern-card:hover {
          border-color: var(--border-hover) !important;
        }
        .overview-concern-title {
          font-size: 16px !important;
          font-weight: 700 !important;
          color: var(--text-title) !important;
          margin: 0 !important;
        }
        .overview-concern-desc {
          font-size: 14px !important;
          color: var(--text-secondary) !important;
          line-height: 1.8 !important;
          margin: 0 !important;
        }
      `, "overview-page-custom-styles");
    }
  
  buildConcernsGrid(app) {
      const concerns = [
        {
          num: "1",
          title: "A Trust Signed Under Practical Duress",
          desc: [
            "The current trust arrangement was not negotiated or designed with ",
            "mutual consultation. It was presented as a fait accompli during ",
            "a severe financial, housing, and mental health crisis. Declining ",
            "would have meant immediate homelessness, leaving no practical ",
            "alternative but to sign."
          ].join("")
        },
        {
          num: "2",
          title: "Structural Impossibility of Long-Term Solvency",
          desc: [
            "The mathematical reality of the plan (which demanded that I take low-paying, ",
            "unrelated work) guaranteed failure. It provided no path to cover ",
            "debt, no ability to build retirement savings, and left no ",
            "cushion against aging or illness, while forcing me to entirely ",
            "miss the current, highly time-sensitive generative AI wave."
          ].join("")
        },
        {
          num: "3",
          title: "Explicit Refusal to Acknowledge Professional Value",
          desc: [
            "The administrator has explicitly treated my professional skills, ",
            "career achievements, and earning potential as irrelevant to how ",
            "support was structured. This stood in direct contrast to a career ",
            "history of building products that generated billions in value, ",
            "and a past professional recommendation that helped build ",
            "a $15B enterprise."
          ].join("")
        },
        {
          num: "4",
          title: "Ideological Framing Over Practical Outcomes",
          desc: [
            "The structure of the support was heavily influenced by an ",
            "individualistic ideology that treats financial setback as a moral ",
            "failure and views restorative support as an improper handout. ",
            "This produced a punitive environment that sustained survival but ",
            "actively blocked professional recovery, culminating in cutting off ",
            "the second half of the allocation."
          ].join("")
        },
        {
          num: "5",
          title: "Inconsistencies and Lack of Transparency",
          desc: [
            "I was told that early financial modifications were impossible due ",
            "to trust limitations and estate risks, and was denied financial ",
            "transparency under the guise of privacy. Yet, when proposing to ",
            "pay back the estate from future lucrative ventures, I was told ",
            "nobody wanted the money back because everyone else is already wealthy."
          ].join("")
        },
        {
          num: "6",
          title: "A Profound Lack of Empathy & Hostile Comments",
          desc: [
            "Expressing vulnerability regarding family isolation was met with the ",
            "dismissive comment that 'at 61 years old, you shouldn't need family ",
            "approval.' This lack of empathy came from an administrator who ",
            "has not faced similar hardships and has previously used hostile ",
            "verbal and physical intimidation (the late 2022 gun threat) ",
            "to assert control."
          ].join("")
        }
      ];

      return makeElement("div", { className: "overview-grid-spacing" }, 
        concerns.map(c => {
          return makeElement("div", { className: "overview-concern-card" }, [
            makeElement("div", { className: "flex justify-between items-center" }, [
              makeElement("span", { className: "elder-card-badge" }, `Concern #${c.num}`)
            ]),
            makeElement("h4", { className: "overview-concern-title" }, c.title),
            makeElement("p", { className: "overview-concern-desc" }, c.desc)
          ]);
        })
      );
    }

  buildRequestBlock(app) {
      return makeElement("div", {
        className: "transcript-quote-box leading-relaxed text-sm text-[var(--text-primary)] space-y-4"
      }, [
        makeElement("h4", { 
          className: "font-bold text-[var(--text-title)] text-base border-b border-[var(--border-color)] pb-2 uppercase tracking-wider" 
        }, "The Restorative Alternative: Why a Strategic Runway Was Requested"),
        makeElement("p", {}, "Rather than seeking venture capital or avoiding responsibility, I had requested a short, front-loaded runway that would have acknowledged:"),
        makeElement("ul", { className: "list-disc pl-5 space-y-2 text-[var(--text-secondary)]" }, [
          makeElement("li", {}, [
            makeElement("strong", {}, "Extremely Rare Skills: "), 
            "My documented expertise in foundational drafting interfaces (such as inventing AccuDraw and inspiring Inspect Element, detailed on the ",
            makeElement("a", {
              href: "#/value-assessment",
              className: "inline-link-highlight"
            }, "Valuation Assessment page"),
            ") remains a rare and valuable asset that should have been leveraged."
          ]),
          makeElement("li", {}, [
            makeElement("strong", {}, "The Timing Window: "), 
            "Missing the current generative AI and visual design wave represents a permanent loss of strategic opportunity."
          ]),
          makeElement("li", {}, [
            makeElement("strong", {}, "Realism and Math: "), 
            "At 62 years of age and in debt, a plan requiring me to abandon my core professional capability to take a low-level job was mathematically guaranteed to fail. It left no path to cover debt or ever retire."
          ])
        ]),
        makeElement("p", { className: "text-xs text-[var(--text-secondary)] italic border-t border-[var(--border-color)] pt-3 mt-4" }, 
          "Conclusion: Cutting off the second half of the allocation as punishment for not taking an unrelated low-level job ignores the underlying math. The requested runway was a realistic, self-funding transition plan."
        )
      ]);
    }

  buildAnalogiesSection(app) {
      return makeElement("section", { className: "cad-panel space-y-6" }, [
        makeElement("h2", { 
          className: "text-xl font-bold text-[var(--text-title)] uppercase tracking-wide", 
          style: { fontFamily: "ui-monospace, monospace" } 
        }, "Conceptual Analogies"),
        
        makeElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6" }, [
          // Life Preserver Analogy Card
          makeElement("div", { className: "elder-analysis-card flex flex-col md:flex-row gap-4 justify-between" }, [
            makeElement("div", { className: "flex-1" }, [
              makeElement("span", { className: "elder-card-badge mb-2 block w-max" }, "⚓ The Life Preserver Analogy"),
              makeElement("p", { className: "text-sm text-[var(--text-primary)] italic leading-relaxed" }, 
                "\"I was drowning, and I was thrown a life preserver. That life preserver keeps me from going under immediately - for which I am grateful - but it does not take me anywhere. What I actually need is to be taken to that boat heading toward shore - my actual career and skills. Instead, I am expected to cling to this preserver indefinitely, guaranteeing eventual failure through debt, aging, or exhaustion.\""
              )
            ]),
            makeElement("div", { className: "w-24 h-24 flex-shrink-0" }, [
              makeElement("img", {
                src: "/images/lifePreserver.png",
                alt: "Life Preserver Analogy",
                className: "w-full h-full object-cover rounded-lg border border-[var(--border-color)]",
                onerror: (e) => {
                  e.target.style.display = "none";
                  const fb = e.target.parentNode.querySelector(".analogy-fb");
                  if (fb) fb.style.display = "flex";
                }
              }),
              makeElement("div", {
                className: "analogy-fb hidden w-full h-full items-center justify-center bg-slate-900/50 border border-dashed border-[var(--border-color)] rounded-lg text-2xl"
              }, "🛟")
            ])
          ]),

          // Carrot Analogy Card
          makeElement("div", { className: "elder-analysis-card flex flex-col md:flex-row gap-4 justify-between" }, [
            makeElement("div", { className: "flex-1" }, [
              makeElement("span", { className: "elder-card-badge mb-2 block w-max" }, "🥕 The Carrot Analogy"),
              makeElement("p", { className: "text-sm text-[var(--text-primary)] italic leading-relaxed" }, 
                "\"A carrot is dangled in front of me but leading me into a desert while I protest that there is a fertile Valley in the other direction. Ultimately, I grab the carrot and run toward the fertile Valley rather than going into the desert where I would die.\""
              )
            ]),
            makeElement("div", { className: "w-24 h-24 flex-shrink-0" }, [
              makeElement("img", {
                src: "/images/carrotAnalogy.png",
                alt: "Carrot Analogy",
                className: "w-full h-full object-cover rounded-lg border border-[var(--border-color)]",
                onerror: (e) => {
                  e.target.style.display = "none";
                  const fb = e.target.parentNode.querySelector(".analogy-fb");
                  if (fb) fb.style.display = "flex";
                }
              }),
              makeElement("div", {
                className: "analogy-fb hidden w-full h-full items-center justify-center bg-slate-900/50 border border-dashed border-[var(--border-color)] rounded-lg text-2xl"
              }, "🥕")
            ])
          ])
        ])
      ]);
    }

  buildAnalogiesRow() {
      return makeElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 mt-6" }, [
        // Life Preserver Analogy
        makeElement("div", { className: "overview-concern-card flex flex-row gap-4 p-6 items-start" }, [
          makeElement("div", { className: "w-24 h-24 flex-shrink-0 relative bg-slate-950/40 rounded-lg border border-[var(--border-color)] overflow-hidden flex items-center justify-center" }, [
            makeElement("img", {
              src: "/images/lifePreserver.png",
              alt: "Life Preserver",
              className: "absolute inset-0 w-full h-full object-cover",
              onerror: (e) => {
                e.target.style.display = "none";
                const fallback = e.target.parentNode.querySelector(".analogy-icon-fallback");
                if (fallback) fallback.style.display = "flex";
              }
            }),
            makeElement("div", {
              className: "analogy-icon-fallback absolute inset-0 hidden items-center justify-center text-3xl",
              style: { backgroundColor: 'rgba(15, 23, 42, 0.6)' }
            }, "⚓")
          ]),
          makeElement("div", { className: "flex-1 min-w-0" }, [
            makeElement("span", { className: "elder-card-badge mb-2 inline-block" }, "⚓ The Life Preserver Analogy"),
            makeElement("p", { className: "text-xs text-[var(--text-primary)] italic leading-relaxed" }, 
              "\"I was drowning, and I was thrown a life preserver. That life preserver keeps me from going under immediately - for which I am grateful - but it does not take me anywhere. What I actually need is to be taken to that boat heading toward shore - my actual career and skills. Instead, I am expected to cling to this preserver indefinitely, guaranteeing eventual failure through debt, aging, or exhaustion.\""
            )
          ])
        ]),

        // Carrot Analogy
        makeElement("div", { className: "overview-concern-card flex flex-row gap-4 p-6 items-start" }, [
          makeElement("div", { className: "w-24 h-24 flex-shrink-0 relative bg-slate-950/40 rounded-lg border border-[var(--border-color)] overflow-hidden flex items-center justify-center" }, [
            makeElement("img", {
              src: "/images/carrotAnalogy.png",
              alt: "The Carrot Analogy",
              className: "absolute inset-0 w-full h-full object-cover",
              onerror: (e) => {
                e.target.style.display = "none";
                const fallback = e.target.parentNode.querySelector(".analogy-icon-fallback");
                if (fallback) fallback.style.display = "flex";
              }
            }),
            makeElement("div", {
              className: "analogy-icon-fallback absolute inset-0 hidden items-center justify-center text-3xl",
              style: { backgroundColor: 'rgba(15, 23, 42, 0.6)' }
            }, "🥕")
          ]),
          makeElement("div", { className: "flex-1 min-w-0" }, [
            makeElement("span", { className: "elder-card-badge mb-2 inline-block" }, "🥕 The Carrot Analogy"),
            makeElement("p", { className: "text-xs text-[var(--text-primary)] italic leading-relaxed" }, 
              "\"A carrot is dangled in front of me but leading me into a desert while I protest that there is a fertile Valley in the other direction. Ultimately, I grab the carrot and run toward the fertile Valley rather than going into the desert where I would die.\""
            )
          ])
        ])
      ]);
    }
}