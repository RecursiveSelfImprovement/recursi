class FrontPage {
  constructor() {
      this.commentsApp = null;
      this.lightboxEl = null;
      this.assetBaseUrl = 'https://recursi.dev/SiteResources/frontPage/';
      this._lightboxKeydownHandler = null;
      this.scrollObserver = null;
      this._videoDialog = null;
      this._videoPlayer = null;
      this._activeAardvarkCard = null;
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
      inner.append(this._buildHeroTagline(), this._buildVideoButton());
      overlay.appendChild(inner);
      return overlay;
    }

  _buildHeroTagline() {
      const tagline = makeElement('p', { className: 'hero-tagline' });
      tagline.innerHTML = FrontPageContent.heroTagline();
      return tagline;
    }

  _buildVideoButton() {
      const btn = makeElement('button', { className: 'hero-video-btn' });
      btn.innerHTML = `<span class="video-btn-icon">▶</span><span class="video-btn-label">Watch the Demo</span>`;
      btn.onclick = () => this._openVideoModal();
      return btn;
    }

  _buildManifestoSection() {
      const div = makeElement('div', { className: 'manifesto fade-up' });
      this._appendManifestoParagraphs(div);
      return div;
    }

  _appendManifestoParagraphs(container) {
      for (const para of FrontPageContent.manifesto()) {
        const p = makeElement('p');
        p.innerHTML = para;
        container.appendChild(p);
      }
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
        href: p.isAardvark ? '#' : p.href,
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
      } else if (p.isAardvark) {
        card.addEventListener('click', (e) => {
          e.preventDefault();
          this._showAardvarkMenu(e, card);
        });
      }

      card.append(
        this._buildProjectMedia(p),
        this._buildProjectInfo(p),
        this._buildProjectArrow()
      );

      return card;
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
        FrontPageContent.merchDisclaimerText()
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
      p.innerHTML = FrontPageContent.footerCopyright();
      return p;
    }

  _buildLightboxSection() {
      const lb = makeElement('div', { className: 'lightbox', id: 'lightbox' });
      lb.append(
        this._buildLightboxClose(),
        this._buildLightboxImageArea(),
        this._buildLightboxInfo()
      );

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
        makeElement('div', { className: 'lightbox-soldout' }, FrontPageContent.soldOutText())
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

  _openVideoModal() {
      if (this._videoDialog) {
        this._videoDialog.bringToFront();
        return;
      }

      // 5 Video Chapters with 5-6 word descriptions each
      const chapters = [
        { time: 0, label: 'Introduction to Vibes', desc: 'Learn about visual vibe-coding loops' },
        { time: 75, label: 'Composable Architecture', desc: 'Build pages from small units' },
        { time: 150, label: 'YouTube Music Sandbox', desc: 'Experience Aardvark synchronized 3D piano' },
        { time: 225, label: 'Scratchy Local AI', desc: 'Surgically patch Scratch blocks offline' },
        { time: 300, label: 'Markdown & Future', desc: 'Durable notebook keeps conversations alive' }
      ];

      const modalContent = makeElement('div', { className: 'video-modal-layout' });
      const playerWrapper = makeElement('div', { className: 'video-player-pane' });
      const playerContainer = makeElement('div', {
        className: 'dialog-video-player-container',
      });
      playerWrapper.appendChild(playerContainer);

      const chaptersPane = makeElement('div', { className: 'video-chapters-pane' });
      const chaptersHeader = makeElement('div', { className: 'chapters-header' }, 'VIDEO CHAPTERS');
      chaptersPane.appendChild(chaptersHeader);

      const chapterItems = [];

      chapters.forEach((ch, idx) => {
        const item = makeElement('button', { className: 'chapter-item' });
        
        const timeBadge = makeElement('span', { className: 'chapter-time' }, this._formatTime(ch.time));
        const info = makeElement('div', { className: 'chapter-info' });
        const title = makeElement('div', { className: 'chapter-title' }, ch.label);
        const desc = makeElement('div', { className: 'chapter-desc' }, ch.desc);
        
        info.append(title, desc);
        item.append(timeBadge, info);

        item.onclick = () => {
          chapterItems.forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          this._seekVideoTo(ch.time);
        };

        chaptersPane.appendChild(item);
        chapterItems.push(item);
      });

      // Set the first one active initially
      chapterItems[0].classList.add('active');

      modalContent.append(playerWrapper, chaptersPane);

      this._videoDialog = UITools.makeDialog({
        title: '▶  Recursi Vibe Coding Demo',
        content: modalContent,
        width: '940px',
        height: '460px',
        allowMinimize: true,
        allowMaximize: true,
        noPadding: true,
        onClose: () => {
          if (this._videoPlayer) {
            this._videoPlayer.destroy();
            this._videoPlayer = null;
          }
          this._videoDialog = null;
        }
      });

      this._videoPlayer = new VideoPlayer({
        container: playerContainer,
        playerType: 'youtube',
        videoId: '1PIkWmj6SxA',
        autoplay: true,
        controls: true,
        width: '100%',
        height: '100%',
      }, (event) => {
        if (event.type === 'ready') {
          console.log('[FrontPage] VideoPlayer ready in UITools dialog.');
        }
      });
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
      const existingMenu = document.getElementById('aardvark-popup-menu');
      if (existingMenu) {
        existingMenu.remove();
      }
      if (this._videoPlayer) {
        this._videoPlayer.destroy();
        this._videoPlayer = null;
      }
      if (this._videoDialog) {
        this._videoDialog.close();
        this._videoDialog = null;
      }
      if (this.rootElement) {
        this.rootElement.innerHTML = '';
      }
      this.rootElement = null;
    }

  _showAardvarkMenu(e, card) {
      e.preventDefault();
      e.stopPropagation();

      const container = makeElement('div', { className: 'aardvark-dialog-options' });
      const infoText = makeElement('div', { className: 'aardvark-dialog-header-text' }, 'Choose an option to experience the Aardvark playlist integration:');

      const opt1 = makeElement('div', { className: 'aardvark-dialog-card' });
      opt1.append(
        makeElement('div', { className: 'option-label' }, '🎵 Try Canned Playlists (Music App)'),
        makeElement('div', { className: 'option-desc' }, 'Try out the high-quality synchronized audio player directly in your browser with synchronized 3D piano rolls.')
      );
      opt1.onclick = () => {
        dialog.close();
        window.location.href = '/AardvarkPlaylist/';
      };

      const opt2 = makeElement('div', { className: 'aardvark-dialog-card' });
      opt2.append(
        makeElement('div', { className: 'option-label' }, '📦 Install Browser Extension'),
        makeElement('div', { className: 'option-desc' }, 'Download ZIP pack and learn how to run the extension in developer mode for YouTube overlays.')
      );
      opt2.onclick = () => {
        dialog.close();
        this._openExtensionInstallDialog();
      };

      container.append(infoText, opt1, opt2);

      const dialog = UITools.makeDialog({
        title: 'Aardvark Integration Options',
        content: container,
        width: '480px',
        height: 'auto',
        allowMinimize: false,
        allowMaximize: false,
      });
    }

  _openExtensionInstallDialog() {
      const content = makeElement('div', { className: 'extension-dialog-content' });

      const explanation = makeElement('div', { className: 'extension-explanation' });
      explanation.innerHTML = `
        <h3>Aardvark unpacked extension setup</h3>
        <p>To run the extension locally in modern desktop browsers:</p>
        <ol>
          <li>Click the button below to download <code>aardvark-extension.zip</code>.</li>
          <li>Unpack the ZIP file into a permanent directory on your machine.</li>
          <li>Navigate to your browser extension manager (e.g., <code>chrome://extensions</code> or <code>brave://extensions</code>).</li>
          <li>Enable <strong>Developer mode</strong> in the upper right.</li>
          <li>Click the <strong>Load unpacked</strong> button on the top-left and select the unpacked folder.</li>
        </ol>
        <p class="explanation-note">Once loaded, you can open any YouTube playlist to access synchronized visualizer overlays instantly.</p>
      `;

      const downloadBtn = makeElement('button', {
        className: 'extension-download-btn'
      });
      downloadBtn.textContent = '📥 Download Extension ZIP';
      downloadBtn.onclick = () => this._triggerExtensionDownload(downloadBtn);

      content.append(explanation, downloadBtn);

      UITools.makeDialog({
        title: 'Install Aardvark Extension',
        content: content,
        width: '460px',
        height: 'auto',
        allowMinimize: true,
        allowMaximize: false
      });
    }

  async _triggerExtensionDownload(btn) {
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = '🔄 Loading Zipper...';

      const createDummyIconBlob = (size, color) => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          
          ctx.fillStyle = '#0f0f14';
          ctx.fillRect(0, 0, size, size);
          
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.max(2, size / 8);
          ctx.strokeRect(0, 0, size, size);
          
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.floor(size * 0.65)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('A', size / 2, size / 2 + (size > 16 ? 1 : 0));
          
          return new Promise((resolve) => {
            canvas.toBlob((blob) => {
              resolve(blob);
            }, 'image/png');
          });
        } catch (err) {
          return null;
        }
      };

      try {
        await this._loadJSZip();
        btn.textContent = '🔄 Packaging Extension...';

        const zip = new JSZip();
        const baseUrl = '/AardvarkExtension/browserExtension/';

        const files = [
          "background.js",
          "BookMarksOrganizer/css/bookMarksOrganizer.css",
          "BookMarksOrganizer/index.html",
          "BookMarksOrganizer/js/BookMarksOrganizer.js",
          "BookMarksOrganizer/js/BookMarksOrganizerActionsDialog.js",
          "BookMarksOrganizer/js/BookMarksOrganizerActiveItem.js",
          "BookMarksOrganizer/js/BookMarksOrganizerIO.js",
          "BookMarksOrganizer/js/BookMarksOrganizerMutations.js",
          "BookMarksOrganizer/js/BookMarksOrganizerTreeOps.js",
          "BookMarksOrganizer/js/BookMarksOrganizerUI.js",
          "BookMarksOrganizer/js/organizerEntry.js",
          "content/ContentController.js",
          "content/GoogleContent.js",
          "content/PlayerBridge.js",
          "content/YoloPageRelayBridge.js",
          "content/YoloTargetAgent.js",
          "content/YouTubeContent.js",
          "contentScript.js",
          "dictation.html",
          "dictation.js",
          "features/Aardvark.js",
          "features/AardvarkActions.js",
          "features/AardvarkDictation.js",
          "features/AardvarkOverlay.js",
          "features/AardvarkRadialMenu.js",
          "features/AardvarkStyleEditor.js",
          "features/CurveFitter.js",
          "features/DrawingTool.js",
          "features/LlmHelper.js",
          "features/LlmHelperUI.js",
          "features/LooperKeystrokeHandler.js",
          "features/SegmentManager.js",
          "features/TimelineUI.js",
          "features/VideoController.js",
          "features/VideoLooper.js",
          "features/VideoSegment.js",
          "images/icon16.png",
          "images/icon48.png",
          "images/icon128.png",
          "manifest.json",
          "notification.css",
          "popup.html",
          "popup.js",
          "PopupController.js",
          "services/BookmarkService.js",
          "services/YouTubeService.js",
          "utils/applyCss.js",
          "utils/DialogBox.js",
          "utils/KeystrokeHandler.js",
          "utils/makeElement.js",
          "utils/WindowMessenger.js"
        ];

        // Fetch each file in parallel
        const fetchPromises = files.map(async (filePath) => {
          try {
            const res = await fetch(baseUrl + filePath);
            if (!res.ok) {
              throw new Error(`Status ${res.status}`);
            }
            const blob = await res.blob();
            zip.file(filePath, blob);
          } catch (err) {
            console.warn(`[FrontPage] Skipping missing file during extension package: ${filePath}`, err);
            if (filePath.startsWith('images/icon')) {
              const size = filePath.includes('16') ? 16 : filePath.includes('48') ? 48 : 128;
              const fallbackBlob = await createDummyIconBlob(size, '#ff2d95');
              if (fallbackBlob) {
                zip.file(filePath, fallbackBlob);
                console.log(`[FrontPage] Generated fallback icon for: ${filePath}`);
              }
            }
          }
        });

        await Promise.all(fetchPromises);

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);

        const anchor = makeElement('a', {
          href: url,
          download: 'aardvark-extension.zip'
        });
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);

        btn.textContent = '✓ Download Complete!';
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = originalText;
        }, 3000);
      } catch (err) {
        console.error('[FrontPage] Failed to generate extension zip:', err);
        btn.textContent = '❌ Packaging Failed';
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = originalText;
        }, 3000);
      }
    }

  _loadJSZip() {
      return new Promise((resolve, reject) => {
        if (typeof JSZip !== 'undefined') {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load JSZip library from CDN'));
        document.head.appendChild(script);
      });
    }

  _formatTime(sec) {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

  _seekVideoTo(seconds) {
      if (!this._videoPlayer) return;
      try {
        if (typeof this._videoPlayer.seekTo === 'function') {
          this._videoPlayer.seekTo(seconds);
        } else if (this._videoPlayer.player && typeof this._videoPlayer.player.seekTo === 'function') {
          this._videoPlayer.player.seekTo(seconds, true);
        } else {
          const iframe = document.querySelector('.dialog-video-player-container iframe');
          if (iframe) {
            iframe.contentWindow.postMessage(JSON.stringify({
              event: 'command',
              func: 'seekTo',
              args: [seconds, true]
            }), '*');
          }
        }
      } catch (err) {
        console.warn('[FrontPage] Seek failed:', err);
      }
    }
}