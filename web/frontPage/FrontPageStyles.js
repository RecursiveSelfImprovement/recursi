class FrontPageStyles {
  static init() {
    applyCss(this.css());
  }

  static css() {
    return [
      this.cssVariables(),
      this.cssReset(),
      this.cssBody(),
      this.cssHero(),
      this.cssManifesto(),
      this.cssSectionHeaders(),
      this.cssProjects(),
      this.cssMerch(),
      this.cssLightbox(),
      this.cssFooter(),
      this.cssAnimations(),
      this.cssResponsive(),
    ].join('\n');
  }

  static cssVariables() {
    return `
      :root {
        --neon-orange: #ff6a00;
        --neon-cyan: #00e5ff;
        --neon-pink: #ff2d95;
        --neon-green: #39ff14;
        --neon-purple: #b84dff;
        --bg-deep: #0a0a0f;
        --bg-card: rgba(15, 15, 25, 0.85);
        --text-primary: #e8e4df;
        --text-muted: #8a8690;
        --glow-orange: 0 0 20px rgba(255, 106, 0, 0.4), 0 0 60px rgba(255, 106, 0, 0.15);
        --glow-cyan: 0 0 20px rgba(0, 229, 255, 0.4), 0 0 60px rgba(0, 229, 255, 0.15);
        --glow-pink: 0 0 20px rgba(255, 45, 149, 0.4), 0 0 60px rgba(255, 45, 149, 0.15);
      }
    `;
  }

  static cssReset() {
    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html { scroll-behavior: smooth; }
    `;
  }

  static cssBody() {
    return `
      body {
        background: var(--bg-deep);
        color: var(--text-primary);
        font-family: 'Quicksand', sans-serif;
        overflow-x: hidden;
        min-height: 100vh;
      }
      body::before {
        content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: radial-gradient(ellipse at 20% 50%, rgba(255, 106, 0, 0.04) 0%, transparent 60%),
                    radial-gradient(ellipse at 80% 20%, rgba(0, 229, 255, 0.03) 0%, transparent 50%),
                    radial-gradient(ellipse at 60% 80%, rgba(255, 45, 149, 0.03) 0%, transparent 50%);
        pointer-events: none; z-index: 0;
      }
      body::after {
        content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.03) 2px, rgba(0, 0, 0, 0.03) 4px);
        pointer-events: none; z-index: 9999;
      }
    `;
  }

  static cssHero() {
    return `
      .hero-section { position: relative; width: 100%; min-height: 100vh; display: flex; flex-direction: column; align-items: center; }
      .hero-image-wrapper { position: relative; width: 100%; max-width: 1200px; margin: 0 auto; }
      .hero-image { width: 100%; height: auto; display: block; }
      .hero-image-wrapper::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 40%; background: linear-gradient(to bottom, transparent 0%, var(--bg-deep) 100%); pointer-events: none; }
      .hero-text-overlay { position: absolute; bottom: 0; left: 0; right: 0; z-index: 10; padding: 0 2rem 2rem; max-width: 1200px; margin: 0 auto; }
      .hero-text-inner { max-width: 700px; margin: 0 auto; text-align: center; }
      .coming-soon-badge { display: inline-block; font-family: 'Orbitron', sans-serif; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.35em; text-transform: uppercase; color: var(--neon-orange); border: 1px solid var(--neon-orange); padding: 0.4em 1.4em; border-radius: 2px; text-shadow: var(--glow-orange); box-shadow: var(--glow-orange); margin-bottom: 1.2rem; animation: pulse-glow 3s ease-in-out infinite; }
      @keyframes pulse-glow { 0%, 100% { box-shadow: var(--glow-orange); opacity: 1; } 50% { box-shadow: 0 0 30px rgba(255, 106, 0, 0.6), 0 0 80px rgba(255, 106, 0, 0.2); opacity: 0.9; } }
      .hero-tagline { font-family: 'Quicksand', sans-serif; font-size: 1.05rem; font-weight: 300; line-height: 1.7; color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,0.9), 0 0 30px rgba(0,0,0,0.5); margin-bottom: 0.8rem; }
      .hero-tagline strong { color: var(--neon-cyan); font-weight: 600; text-shadow: 0 0 12px rgba(0, 229, 255, 0.5), 0 2px 8px rgba(0,0,0,0.9); }
      .hero-tagline em { font-style: italic; color: var(--neon-orange); text-shadow: 0 0 12px rgba(255, 106, 0, 0.5), 0 2px 8px rgba(0,0,0,0.9); }
      .content-section { position: relative; z-index: 5; max-width: 900px; margin: 0 auto; padding: 1rem 2rem 4rem; }
    `;
  }

  static cssManifesto() {
    return `
      .manifesto { text-align: center; margin-bottom: 4rem; padding: 0 1rem; }
      .manifesto p { font-size: 1.05rem; font-weight: 300; line-height: 1.8; color: var(--text-primary); margin-bottom: 1rem; }
      .manifesto p strong { color: var(--neon-cyan); font-weight: 600; }
      .manifesto p em { font-style: italic; color: var(--neon-orange); }
      .manifesto .scratchy-note { font-family: 'Fira Code', monospace; font-size: 0.85rem; color: var(--neon-green); text-shadow: 0 0 10px rgba(57, 255, 20, 0.3); margin-top: 2rem; line-height: 1.6; }
      .paw-print { display: inline-block; margin-top: 1rem; font-size: 1.6rem; filter: drop-shadow(0 0 8px rgba(57, 255, 20, 0.5)); animation: paw-bounce 2s ease-in-out infinite; }
      @keyframes paw-bounce { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-4px) rotate(-5deg); } }
    `;
  }

  static cssSectionHeaders() {
    return `
      .section-header { font-family: 'Orbitron', sans-serif; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.4em; text-transform: uppercase; text-align: center; margin-bottom: 2.5rem; position: relative; padding-bottom: 1rem; }
      .section-header::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 60px; height: 1px; }
      .section-header.cyan { color: var(--neon-cyan); text-shadow: var(--glow-cyan); }
      .section-header.cyan::after { background: var(--neon-cyan); box-shadow: var(--glow-cyan); }
      .section-header.pink { color: var(--neon-pink); text-shadow: var(--glow-pink); }
      .section-header.pink::after { background: var(--neon-pink); box-shadow: var(--glow-pink); }
      .section-header.orange { color: var(--neon-orange); text-shadow: var(--glow-orange); }
      .section-header.orange::after { background: var(--neon-orange); box-shadow: var(--glow-orange); }
    `;
  }

  static cssProjects() {
    return `
      .projects-section { margin-bottom: 5rem; }
      .projects-grid { display: grid; grid-template-columns: 1fr; gap: 1.35rem; }

      .project-card {
        --project-image-width: 28%;
        --project-image-hover-scale: 1.33;
        --project-image-overlap: 0%;
        --project-image-bottom-offset: 0%;
        background: var(--bg-card);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 18px;
        padding: 1.45rem 1.6rem;
        display: block;
        min-height: 215px;
        text-decoration: none;
        color: var(--text-primary);
        position: relative;
        overflow: visible;
        cursor: pointer;
        isolation: isolate;
        transition: border-color 0.3s ease, background 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
      }
      .project-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 16px;
        right: 16px;
        height: 1px;
        background: linear-gradient(90deg, transparent, var(--neon-cyan), transparent);
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .project-card:hover::before { opacity: 1; }
      .project-card:hover {
        border-color: rgba(0, 229, 255, 0.15);
        background: rgba(0, 229, 255, 0.04);
        transform: translateY(-2px);
        box-shadow: 0 10px 34px rgba(0, 0, 0, 0.34), 0 0 20px rgba(0, 229, 255, 0.05);
        z-index: 20;
      }

      .project-media {
        position: absolute;
        top: 1rem;
        bottom: 1rem;
        width: var(--project-image-width);
        pointer-events: none;
        z-index: 1;
        display: flex;
        align-items: stretch;
      }
      .project-media-left {
        left: calc(1rem - var(--project-image-overlap));
        justify-content: flex-start;
      }
      .project-media-right {
        right: calc(1rem - var(--project-image-overlap));
        justify-content: flex-end;
      }

      .project-character-frame {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
      }
      .project-character-frame.align-top {
        align-items: flex-start;
      }
      .project-character-frame.align-center {
        align-items: center;
      }
      .project-character-frame.align-bottom {
        align-items: flex-end;
      }
      .project-character-frame.has-backdrop::before {
        content: '';
        position: absolute;
        inset: 10% 4% 6%;
        border-radius: 16px;
        background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
        backdrop-filter: blur(6px);
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05);
        z-index: 0;
      }

      .project-character {
        position: relative;
        z-index: 1;
        width: 100%;
        height: auto;
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        user-select: none;
        -webkit-user-drag: none;
        filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.45));
        transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.3s ease;
      }
      .project-media-left .project-character {
        transform-origin: right center;
      }
      .project-media-right .project-character {
        transform-origin: left center;
      }
      .project-card:hover .project-character {
        transform: scale(var(--project-image-hover-scale));
        filter: drop-shadow(0 18px 34px rgba(0, 0, 0, 0.55));
      }

      .project-info {
        position: relative;
        z-index: 2;
        min-height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .project-card-left .project-info {
        margin-left: calc(var(--project-image-width) + 0.95rem);
        margin-right: 2.5rem;
        text-align: left;
      }
      .project-card-right .project-info {
        margin-left: 1rem;
        margin-right: calc(var(--project-image-width) + 0.95rem);
        text-align: left;
      }

      .project-info h3 {
        font-family: 'Orbitron', sans-serif;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        margin-bottom: 0.5rem;
        line-height: 1.45;
      }
      .project-info p {
        font-size: 0.88rem;
        font-weight: 300;
        color: var(--text-muted);
        line-height: 1.6;
      }

      .project-card .arrow {
        position: absolute;
        right: 1.2rem;
        top: 1rem;
        font-size: 1.15rem;
        color: var(--text-muted);
        transition: all 0.3s ease;
        z-index: 3;
      }
      .project-card:hover .arrow {
        color: var(--neon-cyan);
        transform: translateX(4px);
        text-shadow: var(--glow-cyan);
      }

      .project-card.featured {
        border-color: rgba(255, 106, 0, 0.2);
        background: rgba(255, 106, 0, 0.03);
      }
      .project-card.featured::before {
        background: linear-gradient(90deg, transparent, var(--neon-orange), transparent);
        opacity: 0.5;
      }
      .project-card.featured:hover {
        border-color: rgba(255, 106, 0, 0.3);
        background: rgba(255, 106, 0, 0.06);
        box-shadow: 0 10px 34px rgba(0, 0, 0, 0.34), 0 0 20px rgba(255, 106, 0, 0.08);
      }
      .project-card.featured:hover .arrow {
        color: var(--neon-orange);
        text-shadow: var(--glow-orange);
      }

      .project-tag {
        font-family: 'Fira Code', monospace;
        font-size: 0.55rem;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        padding: 0.2em 0.6em;
        border-radius: 3px;
        margin-left: 0.6rem;
        position: relative;
        top: -1px;
        white-space: nowrap;
      }
      .tag-live {
        color: var(--neon-green);
        background: rgba(57, 255, 20, 0.1);
        border: 1px solid rgba(57, 255, 20, 0.2);
      }
      .tag-demo {
        color: var(--neon-purple);
        background: rgba(184, 77, 255, 0.1);
        border: 1px solid rgba(184, 77, 255, 0.2);
      }
      .tag-soon {
        color: var(--neon-orange);
        background: rgba(255, 106, 0, 0.1);
        border: 1px solid rgba(255, 106, 0, 0.2);
      }
    `;
  }

  static cssMerch() {
    return `
      .merch-section { margin-bottom: 4rem; }
      .merch-disclaimer { text-align: center; font-family: 'Fira Code', monospace; font-size: 0.7rem; color: var(--text-muted); margin-bottom: 2rem; opacity: 0.7; }
      .merch-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; }
      .merch-item { cursor: pointer; background: var(--bg-card); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px; overflow: hidden; transition: all 0.3s ease; position: relative; }
      .merch-item:hover { border-color: rgba(255, 45, 149, 0.2); transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4), 0 0 15px rgba(255, 45, 149, 0.08); }
      .merch-thumb { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; filter: saturate(0.9); transition: filter 0.3s ease; }
      .merch-item:hover .merch-thumb { filter: saturate(1.1); }
      .merch-item-info { padding: 0.8rem; }
      .merch-item-name { font-family: 'Orbitron', sans-serif; font-size: 0.55rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-primary); margin-bottom: 0.2rem; }
      .merch-item-price { font-family: 'Fira Code', monospace; font-size: 0.7rem; color: var(--neon-pink); text-shadow: 0 0 8px rgba(255, 45, 149, 0.3); }
    `;
  }

  static cssLightbox() {
    return `
      .lightbox { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 10000; background: rgba(5, 5, 10, 0.97); backdrop-filter: blur(20px); flex-direction: column; animation: fadeIn 0.3s ease; overflow: hidden; }
      .lightbox.active { display: flex; }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .lightbox-close { position: absolute; top: 1rem; right: 1.5rem; font-size: 2rem; color: var(--text-muted); cursor: pointer; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; font-family: 'Quicksand', sans-serif; z-index: 10002; line-height: 1; padding-bottom: 3px; }
      .lightbox-close:hover { color: var(--neon-pink); text-shadow: var(--glow-pink); border-color: rgba(255, 45, 149, 0.3); }
      .lightbox-image-area { flex: 1; display: flex; align-items: center; justify-content: center; overflow: auto; -webkit-overflow-scrolling: touch; padding: 1rem; touch-action: pan-x pan-y pinch-zoom; }
      .lightbox-image-area img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 4px; box-shadow: 0 0 60px rgba(0, 0, 0, 0.6), 0 0 100px rgba(255, 45, 149, 0.06); touch-action: pinch-zoom; user-select: none; -webkit-user-select: none; }
      .lightbox-info { flex-shrink: 0; text-align: center; padding: 1rem 2rem 1.5rem; background: linear-gradient(to top, rgba(5,5,10,0.95), rgba(5,5,10,0.7)); }
      .lightbox-name { font-family: 'Orbitron', sans-serif; font-size: 0.9rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: var(--text-primary); margin-bottom: 0.4rem; }
      .lightbox-desc { font-size: 0.9rem; font-weight: 300; color: var(--text-muted); margin-bottom: 0.6rem; line-height: 1.6; max-width: 600px; margin-left: auto; margin-right: auto; }
      .lightbox-price { font-family: 'Fira Code', monospace; font-size: 1.2rem; color: var(--neon-pink); text-shadow: var(--glow-pink); margin-bottom: 0.6rem; }
      .lightbox-soldout { display: inline-block; font-family: 'Orbitron', sans-serif; font-size: 0.6rem; letter-spacing: 0.3em; text-transform: uppercase; color: var(--text-muted); border: 1px solid rgba(255, 255, 255, 0.1); padding: 0.5em 1.5em; border-radius: 3px; }
    `;
  }

  static cssFooter() {
    return `
      .footer { text-align: center; padding: 3rem 2rem 2rem; border-top: 1px solid rgba(255, 255, 255, 0.04); }
      .footer-logo { font-family: 'Orbitron', sans-serif; font-size: 0.7rem; letter-spacing: 0.4em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem; }
      .footer p { font-size: 0.75rem; color: rgba(138, 134, 144, 0.5); font-weight: 300; }
    `;
  }

  static cssAnimations() {
    return `
      .fade-up { opacity: 0; transform: translateY(20px); transition: opacity 0.6s ease, transform 0.6s ease; }
      .fade-up.visible { opacity: 1; transform: translateY(0); }
      .delay-1 { transition-delay: 0.1s; }
      .delay-2 { transition-delay: 0.2s; }
      .delay-3 { transition-delay: 0.3s; }
      .delay-4 { transition-delay: 0.4s; }
      .delay-5 { transition-delay: 0.5s; }
      .delay-6 { transition-delay: 0.6s; }
      .comments-section { margin-bottom: 4rem; }
      .comments-wrapper { background: rgba(15, 15, 25, 0.5); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; padding: 2rem; }
    `;
  }

  static cssResponsive() {
    return `
      @media (min-width: 600px) {
        .projects-grid { grid-template-columns: 1fr 1fr; }
        .merch-grid { grid-template-columns: repeat(3, 1fr); }
        .hero-tagline { font-size: 1.15rem; }
      }
      @media (min-width: 900px) {
        .merch-grid { grid-template-columns: repeat(3, 1fr); }
      }
      @media (max-width: 599px) {
        .hero-text-overlay { padding: 0 1rem 1rem; }
        .hero-tagline { font-size: 0.9rem; }
        .coming-soon-badge { font-size: 0.6rem; }
        .content-section { padding: 0.5rem 1.2rem 3rem; }

        .project-card {
          min-height: 188px;
          padding: 1.05rem 1rem 1.1rem;
          border-radius: 14px;
          --project-image-width: 29%;
          --project-image-hover-scale: 1.16;
        }
        .project-media {
          top: 0.85rem;
          bottom: 0.85rem;
        }
        .project-card-left .project-info {
          margin-left: calc(var(--project-image-width) + 0.7rem);
          margin-right: 2rem;
        }
        .project-card-right .project-info {
          margin-left: 0.5rem;
          margin-right: calc(var(--project-image-width) + 0.7rem);
        }
        .project-info h3 {
          font-size: 0.7rem;
          margin-bottom: 0.45rem;
        }
        .project-info p {
          font-size: 0.8rem;
          line-height: 1.5;
        }
        .project-tag {
          display: inline-block;
          margin-left: 0;
          margin-top: 0.4rem;
          top: 0;
        }
        .project-card .arrow {
          right: 0.95rem;
          top: 0.8rem;
        }

        .merch-grid { grid-template-columns: repeat(2, 1fr); }
      }
    `;
  }


// FrontPageStyles additions — patch these into FrontPageStyles.js
// Add cssVideoButton() and cssVideoModal() as new static methods,
// then include them in the css() return array.

// 1.  In css(), change the cssHero() call block to remove the coming-soon badge
//     styles (the .coming-soon-badge rule and its @keyframes pulse-glow can stay
//     for now since they're harmless if unused, or remove them for cleanliness).

// 2.  Add the two new methods below and call them from css():

static cssVideoButton() {
  return `
    .hero-video-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.65rem;
      margin-top: 1.4rem;
      padding: 0.65em 1.6em;
      background: rgba(255, 106, 0, 0.12);
      border: 1px solid rgba(255, 106, 0, 0.5);
      border-radius: 40px;
      color: var(--neon-orange);
      font-family: 'Orbitron', sans-serif;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      cursor: pointer;
      text-shadow: var(--glow-orange);
      box-shadow: 0 0 18px rgba(255, 106, 0, 0.18), inset 0 0 12px rgba(255, 106, 0, 0.06);
      transition: all 0.25s ease;
    }
    .hero-video-btn:hover {
      background: rgba(255, 106, 0, 0.22);
      border-color: rgba(255, 106, 0, 0.8);
      box-shadow: var(--glow-orange), inset 0 0 18px rgba(255, 106, 0, 0.1);
      transform: translateY(-1px);
    }
    .video-btn-icon {
      font-size: 0.9rem;
      line-height: 1;
    }
  `;
}

static cssVideoModal() {
  return `
    .video-modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 10001;
      background: rgba(5, 5, 10, 0.92);
      backdrop-filter: blur(16px);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.25s ease;
    }
    .video-modal-box {
      position: relative;
      width: min(860px, 92vw);
      aspect-ratio: 16 / 9;
      background: rgba(15, 15, 25, 0.9);
      border: 1px solid rgba(255, 106, 0, 0.25);
      border-radius: 12px;
      box-shadow: 0 0 80px rgba(255, 106, 0, 0.12), 0 40px 80px rgba(0,0,0,0.6);
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .video-modal-close {
      position: absolute;
      top: 0.75rem;
      right: 1rem;
      background: rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 50%;
      width: 36px;
      height: 36px;
      font-size: 1.3rem;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10002;
      transition: color 0.2s, border-color 0.2s;
      line-height: 1;
      padding-bottom: 2px;
    }
    .video-modal-close:hover {
      color: var(--neon-orange);
      border-color: rgba(255, 106, 0, 0.4);
    }
    .video-modal-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      color: var(--text-muted);
    }
    .video-placeholder-icon {
      font-size: 3rem;
      color: var(--neon-orange);
      opacity: 0.4;
    }
    .video-modal-placeholder p {
      font-family: 'Fira Code', monospace;
      font-size: 0.8rem;
      letter-spacing: 0.1em;
      opacity: 0.5;
    }
  `;
}
  
}