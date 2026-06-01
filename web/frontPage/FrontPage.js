
class FrontPage {
  constructor() {
      this.commentsApp = null;
      this.lightboxEl = null;
      this.assetBaseUrl = 'https://recursi.dev/SiteResources/frontPage/';
      this._lightboxKeydownHandler = null;
      this.scrollObserver = null;
    }

  init(env) {
      FrontPageStyles.init();
      this._render(env.container);
      this._initScrollAnimations();
      this._initComments();
    }

  _render(target) {
      const heroSection = this._buildHeroSection();
      const content = this._buildContentSection();
      const footer = this._buildFooterSection();
      this.lightboxEl = this._buildLightboxSection();

      target.append(heroSection, content, footer, this.lightboxEl);
    }

  _buildContentSection() {
      const content = makeElement('div', { className: 'content-section' });
      content.appendChild(this._buildManifestoSection());
      content.appendChild(this._buildProjectsSection());
      content.appendChild(this._buildCommentsSection());
      content.appendChild(this._buildMerchSection());
      return content;
    }

  _buildHeroSection() {
      const section = makeElement('section', { className: 'hero-section' });
      const wrapper = this._buildHeroImageWrapper();
      section.appendChild(wrapper);
      return section;
    }

  _buildHeroImageWrapper() {
      const wrapper = makeElement('div', { className: 'hero-image-wrapper' });
      wrapper.append(this._buildHeroImage(), this._buildHeroOverlay());
      return wrapper;
    }

  _buildHeroImage() {
      const img = makeElement('img', {
        src: this._assetUrl('mainImage.png'),
        alt: 'Recursi - a glowing neon workspace with a coder and their dog',
        className: 'hero-image',
      });
      img.onerror = () => {
        img.style.display = 'none';
        img.parentNode.style.minHeight = '60vh';
        img.parentNode.style.background =
          'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 40%, #0a1628 100%)';
      };
      return img;
    }

  _buildHeroOverlay() {
      const overlay = makeElement('div', { className: 'hero-text-overlay' });
      const inner = makeElement('div', { className: 'hero-text-inner' });
      inner.append(this._buildHeroBadge(), this._buildHeroTagline());
      overlay.appendChild(inner);
      return overlay;
    }

  _buildHeroBadge() {
      return makeElement(
        'div',
        { className: 'coming-soon-badge' },
        'Coming Soon'
      );
    }

  _buildHeroTagline() {
      const tagline = makeElement('p', { className: 'hero-tagline' });
      tagline.innerHTML = FrontPageContent.heroTagline();
      return tagline;
    }

  _buildManifestoSection() {
      const div = makeElement('div', { className: 'manifesto fade-up' });
      this._appendManifestoParagraphs(div);
      div.appendChild(this._buildManifestoSignature());
      return div;
    }

  _appendManifestoParagraphs(container) {
      for (const para of FrontPageContent.manifesto()) {
        const p = makeElement('p');
        p.innerHTML = para;
        container.appendChild(p);
      }
    }

  _buildManifestoSignature() {
      const scratchy = makeElement('div', { className: 'scratchy-note' });
      scratchy.innerHTML = '- scratchy<br>';

      const paw = makeElement(
        'span',
        { className: 'paw-print', title: 'Boop the intern' },
        '🐾'
      );

      paw.onclick = (e) => {
        let boops = parseInt(
          localStorage.getItem('recursi_scratchy_boops') || '0',
          10
        );
        boops++;
        localStorage.setItem('recursi_scratchy_boops', boops.toString());

        const floater = makeElement(
          'div',
          { className: 'boop-floater' },
          boops + ' boop' + (boops > 1 ? 's' : '') + '!'
        );
        floater.style.left = e.clientX + 'px';
        floater.style.top = e.clientY - 20 + 'px';
        
        // Scope to rootElement container to ensure sandboxed layout containment
        if (this.rootElement) {
          this.rootElement.appendChild(floater);
        } else {
          document.body.appendChild(floater);
        }

        if (navigator.vibrate) {
          try {
            navigator.vibrate(30);
          } catch (err) {}
        }

        setTimeout(() => floater.remove(), 1200);
      };

      scratchy.appendChild(paw);
      return scratchy;
    }

  _buildProjectsSection() {
      const section = makeElement('div', { className: 'projects-section' });
      section.append(this._buildProjectsHeader(), this._buildProjectsGrid());
      return section;
    }

  _buildProjectsHeader() {
      return makeElement(
        'h2',
        { className: 'section-header cyan' },
        'Built With Recursi'
      );
    }

  _buildProjectsGrid() {
      const grid = makeElement('div', { className: 'projects-grid' });
      FrontPageContent.projects().forEach((p, i) => {
        grid.appendChild(this._buildProjectCard(p, i));
      });
      return grid;
    }

  _buildProjectCard(p, i) {
      const side = p.imageSide === 'right' ? 'right' : 'left';
      const cardClass =
        'project-card project-card-' +
        side +
        (p.featured ? ' featured' : '') +
        (p.comingSoon ? ' coming-soon' : '') +
        ' fade-up delay-' +
        (i + 1);

      const card = makeElement('a', {
        href: p.href,
        className: cardClass,
        'aria-label': p.name,
      });

      card.style.setProperty(
        '--project-image-width',
        (p.imageWidthPct || 29) + '%'
      );
      card.style.setProperty(
        '--project-image-hover-scale',
        String(p.imageHoverScale || 1.33)
      );
      card.style.setProperty(
        '--project-image-overlap',
        (p.imageOverlapPct || 0) + '%'
      );
      card.style.setProperty(
        '--project-image-bottom-offset',
        (p.imageBottomOffsetPct || 0) + '%'
      );

      if (p.comingSoon) {
        card.addEventListener('click', (e) => e.preventDefault());
      }

      card.append(
        this._buildProjectMedia(p),
        this._buildProjectInfo(p),
        this._buildProjectArrow()
      );

      return card;
    }

  _buildProjectIcon(p) {
      const icon = makeElement('div', { className: 'project-icon' });
      icon.innerHTML = p.icon;
      return icon;
    }

  _buildProjectInfo(p) {
      const info = makeElement('div', { className: 'project-info' });
      const h3 = makeElement('h3');
      h3.innerHTML =
        p.name +
        ' <span class="project-tag ' +
        p.tagClass +
        '">' +
        p.tag +
        '</span>';
      const desc = makeElement('p', {}, p.desc);
      info.append(h3, desc);
      return info;
    }

  _buildProjectArrow() {
      return makeElement('span', { className: 'arrow' }, '→');
    }

  _buildCommentsSection() {
      const section = makeElement('div', { className: 'comments-section' });
      section.append(this._buildCommentsHeader(), this._buildCommentsWrapper());
      return section;
    }

  _buildCommentsHeader() {
      return makeElement(
        'h2',
        { className: 'section-header orange' },
        'Discussion'
      );
    }

  _buildCommentsWrapper() {
      return makeElement('div', {
        className: 'comments-wrapper',
        id: 'comments-root',
      });
    }

  _buildMerchSection() {
      const section = makeElement('div', { className: 'merch-section' });
      section.append(
        this._buildMerchHeader(),
        this._buildMerchDisclaimer(),
        this._buildMerchGrid()
      );
      return section;
    }

  _buildMerchHeader() {
      return makeElement('h2', { className: 'section-header pink' }, 'Merch Lab');
    }

  _buildMerchDisclaimer() {
      return makeElement(
        'p',
        { className: 'merch-disclaimer' },
        '[ Inventory currently unavailable. The intern chewed the stock. ]'
      );
    }

  _buildMerchGrid() {
      const grid = makeElement('div', { className: 'merch-grid' });
      FrontPageContent.merch().forEach((item, i) => {
        grid.appendChild(this._buildMerchItem(item, i));
      });
      return grid;
    }

  _buildMerchItem(item, i) {
      const el = makeElement('div', {
        className: 'merch-item fade-up delay-' + (i + 1),
      });
      el.onclick = () => this._openLightbox(item);
      el.append(this._buildMerchThumb(item), this._buildMerchItemInfo(item));
      return el;
    }

  _buildMerchThumb(item) {
      return makeElement('img', {
        src: this._assetUrl(item.thumb),
        alt: item.name,
        className: 'merch-thumb',
        loading: 'lazy',
      });
    }

  _buildMerchItemInfo(item) {
      const info = makeElement('div', { className: 'merch-item-info' });
      info.append(
        makeElement('div', { className: 'merch-item-name' }, item.name),
        makeElement('div', { className: 'merch-item-price' }, item.price)
      );
      return info;
    }

  _buildFooterSection() {
      const footer = makeElement('footer', { className: 'footer' });
      footer.append(this._buildFooterLogo(), this._buildFooterCopyright());
      return footer;
    }

  _buildFooterLogo() {
      return makeElement('div', { className: 'footer-logo' }, 'recursi.dev');
    }

  _buildFooterCopyright() {
      const p = makeElement('p');
      p.innerHTML =
        '&copy; 2026 Scratchy &amp; Friends. All recursions reserved. 🐾';
      return p;
    }

  _buildLightboxSection() {
      const lb = makeElement('div', { className: 'lightbox', id: 'lightbox' });
      lb.append(
        this._buildLightboxClose(),
        this._buildLightboxImageArea(),
        this._buildLightboxInfo()
      );

      // Track bound reference to allow removal during teardown
      this._lightboxKeydownHandler = (e) => {
        if (e.key === 'Escape') this._closeLightbox();
      };
      document.addEventListener('keydown', this._lightboxKeydownHandler);

      return lb;
    }

  _buildLightboxClose() {
      const close = makeElement('button', { className: 'lightbox-close' });
      close.innerHTML = '&times;';
      close.onclick = () => this._closeLightbox();
      return close;
    }

  _buildLightboxImageArea() {
      const imageArea = makeElement('div', { className: 'lightbox-image-area' });
      imageArea.onclick = (e) => {
        if (e.target === imageArea) this._closeLightbox();
      };
      imageArea.appendChild(
        makeElement('img', { id: 'lb-image', src: '', alt: '' })
      );
      return imageArea;
    }

  _buildLightboxInfo() {
      const info = makeElement('div', { className: 'lightbox-info' });
      info.append(
        makeElement('div', { className: 'lightbox-name', id: 'lb-name' }),
        makeElement('div', { className: 'lightbox-desc', id: 'lb-desc' }),
        makeElement('div', { className: 'lightbox-price', id: 'lb-price' }),
        makeElement('div', { className: 'lightbox-soldout' }, 'Out of Stock')
      );
      return info;
    }

  _openLightbox(item) {
      const lb = this.lightboxEl;
      lb.querySelector('#lb-image').src = this._assetUrl(item.full);
      lb.querySelector('#lb-image').alt = item.name;
      lb.querySelector('#lb-name').textContent = item.name;
      lb.querySelector('#lb-desc').textContent = item.desc;
      lb.querySelector('#lb-price').textContent = item.price;
      lb.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

  _closeLightbox() {
      this.lightboxEl.classList.remove('active');
      this.lightboxEl.querySelector('#lb-image').src = '';
      document.body.style.overflow = '';
    }

  _initScrollAnimations() {
      this.scrollObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
          });
        },
        { threshold: 0.1 }
      );
      document.querySelectorAll('.fade-up').forEach((el) => this.scrollObserver.observe(el));
    }

  _initComments() {
      const root = document.getElementById('comments-root');
      if (!root) return;

      try {
        // Comments is loaded by files.json and registered in the global scope
        if (typeof Comments !== 'undefined') {
          this.commentsApp = new Comments();
          this.commentsApp.init(root, {
            threadId: 'main',
            apiMode: 'mock',
            showTitle: false,
          });
          this.commentsApp.applyTheme({
            textColorPrimary: '#e8e4df',
            bgColorPrimary: 'transparent',
            bgColorSecondary: 'rgba(255, 255, 255, 0.04)',
            accentColor: '#ff6a00',
            lineColor: 'rgba(255, 255, 255, 0.08)',
            fontFamily: "'Quicksand', sans-serif",
            borderRadius: 8,
            shadow: 'none',
            alignment: 'left',
          });
        }
      } catch (e) {
        console.error('Comments instantiation error:', e);
      }
    }

  _buildProjectMedia(p) {
      const side = p.imageSide === 'right' ? 'right' : 'left';
      const media = makeElement('div', {
        className: 'project-media project-media-' + side,
      });

      const frame = makeElement('div', {
        className:
          'project-character-frame' + (p.imageBackdrop ? ' has-backdrop' : ''),
      });

      const img = makeElement('img', {
        src: this._assetUrl(p.image),
        alt: p.name + ' character art',
        className: 'project-character',
        loading: 'lazy',
        draggable: 'false',
      });

      if (p.imageObjectPosition) {
        img.style.objectPosition = p.imageObjectPosition;
      }

      if (p.imageAlignY === 'top') {
        frame.classList.add('align-top');
      } else if (p.imageAlignY === 'center') {
        frame.classList.add('align-center');
      } else {
        frame.classList.add('align-bottom');
      }

      frame.appendChild(img);
      media.appendChild(frame);

      return media;
    }

  _assetUrl(fileName) {
      return this.assetBaseUrl + fileName;
    }

  async run(env) {
      if (this.rootElement) {
        this.destroy();
      }
      this.env = env;
      this.rootElement = env.container;
      this.init(env);
      return this;
    }


  destroy() {
      if (this._lightboxKeydownHandler) {
        document.removeEventListener('keydown', this._lightboxKeydownHandler);
        this._lightboxKeydownHandler = null;
      }
      if (this.scrollObserver) {
        this.scrollObserver.disconnect();
        this.scrollObserver = null;
      }
      if (this.commentsApp && typeof this.commentsApp.destroy === 'function') {
        try {
          this.commentsApp.destroy();
        } catch (e) {}
        this.commentsApp = null;
      }
      if (this.rootElement) {
        this.rootElement.innerHTML = '';
      }
      this.rootElement = null;
    }
}

