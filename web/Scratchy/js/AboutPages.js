
class AboutPages {
  init() {
    this.applyBaseStyles();
    this.applyHeaderStyles();
    this.applyImageStyles();
    this.applyProseStyles();
    this.applySectionStyles();
    this.applyFooterStyles();
    this.applyLightboxStyles();
    this.initLightbox();
  }

  applyBaseStyles() {
    applyCss(
      `
  :root {
    --warm-bg: #1a1410;
    --warm-bg-light: #231d16;
    --warm-bg-card: #2a2219;
    --cream: #f0e6d3;
    --cream-dim: #bfb09a;
    --cream-faint: #7a6e5e;
    --amber: #e8a838;
    --amber-glow: #e8a83840;
    --scratch-orange: #ff8c1a;
    --scratch-blue: #4c97ff;
    --scratch-purple: #9966ff;
    --scratch-green: #4cbd56;
    --scratch-yellow: #ffbf00;
    --scratch-red: #ff6680;
    --laika-red: #c44;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: var(--warm-bg);
    color: var(--cream);
    font-family: 'Lora', Georgia, serif;
    line-height: 1.75;
    overflow-x: hidden;
  }

  body::before {
    content: '';
    position: fixed;
    top: -20%;
    right: -10%;
    width: 60vw;
    height: 60vw;
    background: radial-gradient(circle, #e8a83808 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  .container {
    max-width: 680px;
    margin: 0 auto;
    padding: 3rem 1.5rem 6rem;
    position: relative;
    z-index: 1;
  }
    `,
      'about-base-styles'
    );
  }

  applyHeaderStyles() {
    applyCss(
      `
  .header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .header h1 {
    font-family: 'Caveat', cursive;
    font-size: 3.5rem;
    font-weight: 600;
    color: var(--amber);
    letter-spacing: 0.02em;
    margin-bottom: 0.25rem;
    text-shadow: 0 0 40px var(--amber-glow);
  }

  .header .subtitle {
    font-size: 0.95rem;
    color: var(--cream-dim);
    font-style: italic;
    letter-spacing: 0.05em;
  }

  .caption {
    font-family: 'Caveat', cursive;
    font-size: 1.1rem;
    color: var(--cream-dim);
    text-align: center;
    margin-top: 0.75rem;
    margin-bottom: 2.5rem;
  }
    `,
      'about-header-styles'
    );
  }

  applyImageStyles() {
    applyCss(
      `
  .hero-image {
    margin: 2rem 0 0.5rem;
    border-radius: 12px;
    overflow: hidden;
    position: relative;
    background: var(--warm-bg-card);
    border: 1px solid #ffffff0a;
    box-shadow: 0 20px 60px #00000060;
  }

  .hero-image img {
    width: 100%;
    height: auto;
    display: block;
  }

  .story-image {
    margin: 2.5rem 0 0.5rem;
    border-radius: 10px;
    overflow: hidden;
    background: var(--warm-bg-card);
    border: 1px solid #ffffff0a;
    box-shadow: 0 12px 40px #00000050;
  }

  .story-image img {
    width: 100%;
    height: auto;
    display: block;
  }

  .patch-detail {
    margin: 1.5rem auto 0.5rem;
    max-width: 280px;
    border-radius: 50%;
    overflow: hidden;
    border: 3px solid var(--laika-red);
    box-shadow: 0 8px 30px #00000050, 0 0 20px #c4444420;
    aspect-ratio: 1;
  }

  .patch-detail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .gallery {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    margin: 3rem 0 2rem;
  }

  .gallery-item {
    border-radius: 8px;
    overflow: hidden;
    background: var(--warm-bg-card);
    border: 1px solid #ffffff08;
    box-shadow: 0 4px 16px #00000030;
    transition: transform 0.3s, box-shadow 0.3s;
    aspect-ratio: 4/3;
  }

  .gallery-item:hover {
    transform: scale(1.03);
    box-shadow: 0 8px 30px #00000050;
  }

  .gallery-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  @media (max-width: 600px) {
    .gallery {
      grid-template-columns: repeat(2, 1fr);
    }
    .patch-detail {
      max-width: 200px;
    }
  }

  .secondary-image {
    margin: 2.5rem 0 0.5rem;
    border-radius: 10px;
    overflow: hidden;
    background: var(--warm-bg-card);
    aspect-ratio: 3/2;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #ffffff0a;
    box-shadow: 0 12px 40px #00000050;
  }

  .secondary-image .placeholder {
    color: var(--cream-faint);
    font-style: italic;
    font-size: 0.85rem;
    padding: 1.5rem;
    text-align: center;
  }
    `,
      'about-image-styles'
    );
  }

  applyProseStyles() {
    applyCss(
      `
  .prose {
    margin-bottom: 2rem;
  }

  .prose p {
    margin-bottom: 1.25rem;
    font-size: 1.05rem;
    color: var(--cream);
  }

  .prose p.aside {
    color: var(--cream-dim);
    font-size: 0.95rem;
    font-style: italic;
  }

  .prose p.punchline {
    color: var(--amber);
    font-weight: 500;
  }

  .prose a {
    color: var(--amber);
    text-decoration: underline;
    text-decoration-color: #e8a83850;
    text-underline-offset: 3px;
    transition: text-decoration-color 0.3s;
  }

  .prose a:hover {
    text-decoration-color: var(--amber);
  }

  .laika-section {
    border-left: 3px solid var(--laika-red);
    padding: 1.25rem 1.5rem;
    margin: 2.5rem 0;
    background: linear-gradient(90deg, #c4444410 0%, transparent 100%);
    border-radius: 0 8px 8px 0;
  }

  .laika-section p {
    margin-bottom: 0.75rem;
    font-size: 1rem;
    color: var(--cream);
  }

  .laika-section p:last-child {
    margin-bottom: 0;
  }

  .laika-section .laika-name {
    font-weight: 600;
    color: var(--laika-red);
  }

  .scratch-block {
    display: inline-block;
    padding: 0.1em 0.5em;
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.85em;
    font-weight: 500;
    vertical-align: baseline;
    line-height: 1.4;
  }

  .sb-orange { background: var(--scratch-orange); color: #fff; }
  .sb-blue { background: var(--scratch-blue); color: #fff; }
  .sb-purple { background: var(--scratch-purple); color: #fff; }
  .sb-green { background: var(--scratch-green); color: #fff; }
  .sb-yellow { background: var(--scratch-yellow); color: #1a1410; }
    `,
      'about-prose-styles'
    );
  }

  applySectionStyles() {
    applyCss(
      `
  .tool-section {
    background: var(--warm-bg-card);
    border: 1px solid #ffffff0a;
    border-radius: 12px;
    padding: 2rem;
    margin: 3rem 0;
    box-shadow: 0 10px 40px #00000040;
  }

  .tool-section h2 {
    font-family: 'Caveat', cursive;
    font-size: 1.8rem;
    color: var(--amber);
    margin-bottom: 1rem;
  }

  .tool-section p {
    font-size: 1rem;
    color: var(--cream);
    margin-bottom: 1rem;
  }

  .tool-section p:last-child {
    margin-bottom: 0;
  }

  .tool-link {
    display: inline-block;
    margin-top: 1rem;
    padding: 0.75rem 2rem;
    background: var(--amber);
    color: var(--warm-bg);
    font-family: 'Lora', serif;
    font-weight: 600;
    font-size: 1rem;
    border-radius: 8px;
    text-decoration: none;
    transition: all 0.3s;
    box-shadow: 0 4px 20px var(--amber-glow);
  }

  .tool-link:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px #e8a83860;
  }

  .story-links {
    margin: 3rem 0;
  }

  .story-links h2 {
    font-family: 'Caveat', cursive;
    font-size: 1.8rem;
    color: var(--amber);
    margin-bottom: 1.25rem;
  }

  .story-link-item {
    display: block;
    padding: 1rem 1.25rem;
    margin-bottom: 0.75rem;
    background: var(--warm-bg-light);
    border: 1px solid #ffffff08;
    border-radius: 8px;
    text-decoration: none;
    transition: all 0.3s;
  }

  .story-link-item:hover {
    background: var(--warm-bg-card);
    border-color: #ffffff12;
    transform: translateX(4px);
  }

  .story-link-item .link-title {
    font-family: 'Lora', serif;
    font-weight: 500;
    font-size: 1.05rem;
    color: var(--cream);
    display: block;
    margin-bottom: 0.25rem;
  }

  .story-link-item .link-desc {
    font-size: 0.85rem;
    color: var(--cream-dim);
    font-style: italic;
  }
    `,
      'about-section-styles'
    );
  }

  applyFooterStyles() {
    applyCss(
      `
  .disclaimer {
    margin-top: 4rem;
    padding: 1.25rem 1.5rem;
    border: 1px dashed var(--cream-faint);
    border-radius: 8px;
    opacity: 0.65;
    transition: opacity 0.3s;
  }

  .disclaimer:hover {
    opacity: 1;
  }

  .disclaimer p {
    font-size: 0.8rem;
    color: var(--cream-dim);
    line-height: 1.6;
    font-style: italic;
  }

  .signoff {
    margin-top: 3rem;
    text-align: right;
  }

  .signoff .paw {
    font-family: 'Caveat', cursive;
    font-size: 1.6rem;
    color: var(--amber);
  }

  @media (max-width: 600px) {
    .container { padding: 2rem 1.25rem 4rem; }
    .header h1 { font-size: 2.8rem; }
    .tool-section { padding: 1.5rem; }
    .laika-section { padding: 1rem 1.25rem; }
  }

  .fade-in {
    opacity: 0;
    transform: translateY(12px);
    animation: fadeUp 0.8s ease forwards;
  }

  @keyframes fadeUp {
    to { opacity: 1; transform: translateY(0); }
  }

  .fade-in:nth-child(2) { animation-delay: 0.1s; }
  .fade-in:nth-child(3) { animation-delay: 0.2s; }
  .fade-in:nth-child(4) { animation-delay: 0.3s; }
    `,
      'about-footer-styles'
    );
  }

  applyLightboxStyles() {
    applyCss(
      `
  /* Lightbox overlay */
  .lightbox-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(10, 8, 6, 0.95);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
    cursor: zoom-out;
  }

  .lightbox-overlay.active {
    opacity: 1;
    pointer-events: all;
  }

  .lightbox-img-wrap {
    position: relative;
    max-width: 90vw;
    max-height: 80vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .lightbox-img-wrap img {
    max-width: 90vw;
    max-height: 80vh;
    object-fit: contain;
    border-radius: 6px;
    box-shadow: 0 20px 80px rgba(0,0,0,0.6);
    cursor: default;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .lightbox-img-wrap img.loaded {
    opacity: 1;
  }

  .lightbox-caption {
    margin-top: 1.25rem;
    font-family: 'Caveat', cursive;
    font-size: 1.2rem;
    color: var(--cream-dim);
    text-align: center;
    max-width: 600px;
    opacity: 0;
    transition: opacity 0.3s ease 0.15s;
  }

  .lightbox-overlay.active .lightbox-caption {
    opacity: 1;
  }

  .lightbox-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 48px;
    height: 48px;
    border: none;
    background: rgba(232, 168, 56, 0.15);
    color: var(--cream);
    font-size: 1.5rem;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s, transform 0.2s;
    z-index: 10;
    backdrop-filter: blur(4px);
  }

  .lightbox-nav:hover {
    background: rgba(232, 168, 56, 0.35);
    transform: translateY(-50%) scale(1.1);
  }

  .lightbox-nav.prev {
    left: max(1rem, calc(50% - 47vw));
  }

  .lightbox-nav.next {
    right: max(1rem, calc(50% - 47vw));
  }

  .lightbox-close {
    position: absolute;
    top: 1.25rem;
    right: 1.5rem;
    width: 40px;
    height: 40px;
    border: none;
    background: rgba(232, 168, 56, 0.12);
    color: var(--cream-dim);
    font-size: 1.4rem;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s, color 0.2s;
    z-index: 10;
  }

  .lightbox-close:hover {
    background: rgba(232, 168, 56, 0.3);
    color: var(--cream);
  }

  .lightbox-counter {
    position: absolute;
    bottom: 1.25rem;
    left: 50%;
    transform: translateX(-50%);
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    color: var(--cream-faint);
    letter-spacing: 0.1em;
  }

  /* Make images look clickable */
  .hero-image img,
  .story-image img,
  .patch-detail img,
  .gallery-item img {
    cursor: zoom-in;
    transition: transform 0.3s ease, filter 0.3s ease;
  }

  .hero-image:hover img,
  .story-image:hover img,
  .gallery-item:hover img {
    filter: brightness(1.05);
  }

  .lightbox-spinner {
    position: absolute;
    width: 32px; height: 32px;
    border: 3px solid var(--cream-faint);
    border-top-color: var(--amber);
    border-radius: 50%;
    animation: lb-spin 0.7s linear infinite;
  }

  @keyframes lb-spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 600px) {
    .lightbox-nav { width: 40px; height: 40px; font-size: 1.2rem; }
    .lightbox-nav.prev { left: 0.5rem; }
    .lightbox-nav.next { right: 0.5rem; }
    .lightbox-caption { font-size: 1rem; padding: 0 1rem; }
  }
      `,
      'about-lightbox-styles'
    );
  }

  initLightbox() {
    // Build the lightbox DOM
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = [
      '<button class="lightbox-close" aria-label="Close">\u00d7</button>',
      '<button class="lightbox-nav prev" aria-label="Previous">\u2039</button>',
      '<button class="lightbox-nav next" aria-label="Next">\u203a</button>',
      '<div class="lightbox-img-wrap"><div class="lightbox-spinner"></div><img></div>',
      '<div class="lightbox-caption"></div>',
      '<div class="lightbox-counter"></div>',
    ].join('');
    document.body.appendChild(overlay);

    const img = overlay.querySelector('.lightbox-img-wrap img');
    const caption = overlay.querySelector('.lightbox-caption');
    const counter = overlay.querySelector('.lightbox-counter');
    const spinner = overlay.querySelector('.lightbox-spinner');

    // Gather all lightbox-eligible images
    let items = [];
    let currentIdx = 0;

    const collectItems = () => {
      items = [];
      const imgs = document.querySelectorAll('[data-full]');
      // Deduplicate by data-full URL
      const seen = new Set();
      imgs.forEach(el => {
        const url = el.dataset.full;
        if (!seen.has(url)) {
          seen.add(url);
          items.push({ full: url, caption: el.dataset.caption || '' });
        }
      });
    };

    const show = (idx) => {
      currentIdx = idx;
      const item = items[idx];
      if (!item) return;
      img.classList.remove('loaded');
      spinner.style.display = '';
      img.onload = () => { img.classList.add('loaded'); spinner.style.display = 'none'; };
      img.src = item.full;
      caption.textContent = item.caption;
      counter.textContent = (idx + 1) + ' / ' + items.length;
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    };

    const hide = () => {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    };

    const prev = () => { if (items.length) show((currentIdx - 1 + items.length) % items.length); };
    const next = () => { if (items.length) show((currentIdx + 1) % items.length); };

    // Click on any lightbox image
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-full]');
      if (!target) return;
      e.preventDefault();
      collectItems();
      const url = target.dataset.full;
      const idx = items.findIndex(i => i.full === url);
      if (idx >= 0) show(idx);
    });

    // Close
    overlay.querySelector('.lightbox-close').addEventListener('click', (e) => { e.stopPropagation(); hide(); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) hide(); });

    // Nav
    overlay.querySelector('.lightbox-nav.prev').addEventListener('click', (e) => { e.stopPropagation(); prev(); });
    overlay.querySelector('.lightbox-nav.next').addEventListener('click', (e) => { e.stopPropagation(); next(); });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (!overlay.classList.contains('active')) return;
      if (e.key === 'Escape') hide();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    });

    // Swipe support for mobile
    let touchStartX = 0;
    overlay.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
    overlay.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) {
        if (dx > 0) prev(); else next();
      }
    }, { passive: true });
  }

  

  

  async run(env) {
      this.env = env;
      this.init();
      return this;
    }
}

