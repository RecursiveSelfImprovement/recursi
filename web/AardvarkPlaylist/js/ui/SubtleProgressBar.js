class SubtleProgressBar {
    constructor(player) {
        this.player = player;
        this.container = null;
        this.progressBarFill = null;
        this.thumbEl = null;
        this.isVisible = false;
        this.isHovered = false;
        
        this._boundTimeUpdate = this.onTimeUpdate.bind(this);
        this._boundMouseMove = this.onMouseMove.bind(this);
        this._boundMouseLeave = this.onMouseLeave.bind(this);
        
        this.init();
      }

    init() {
        this.container = makeElement('div', {
          className: 'gt-subtle-progress-bar',
          style: {
            position: 'absolute',
            bottom: '0',
            left: '0',
            height: '24px',
            zIndex: '200000',
            pointerEvents: 'auto',
            cursor: 'pointer',
            opacity: '0',
            transition: 'opacity 0.25s ease-in-out'
          }
        });

        this.progressBarFill = makeElement('svg:rect', {
          id: 'gt-subtle-progress-fill',
          x: '0',
          y: '16',
          width: '0%',
          height: '4',
          fill: 'rgba(0, 125, 255, 0.5)',
          rx: '2',
          ry: '2',
          style: 'transition: width 0.1s linear;'
        });

        this.thumbEl = makeElement('svg:rect', {
          id: 'gt-subtle-progress-thumb',
          x: '0%',
          y: '12',
          width: '6',
          height: '12',
          rx: '3',
          ry: '3',
          fill: '#ffffff',
          stroke: '#007dff',
          'stroke-width': '1.5',
          style: 'transition: x 0.1s linear;'
        });

        const backgroundTrack = makeElement('svg:rect', {
          x: '0',
          y: '16',
          width: '100%',
          height: '4',
          fill: '#1a1a1a',
          stroke: 'rgba(255, 255, 255, 0.2)',
          'stroke-width': '1',
          rx: '2',
          ry: '2'
        });

        this.svgEl = makeElement('svg:svg', {
          width: '100%',
          height: '24',
          style: {
            position: 'absolute',
            bottom: '0',
            left: '0',
            overflow: 'visible',
            display: 'block'
          }
        }, backgroundTrack, this.progressBarFill, this.thumbEl);

        this.container.appendChild(this.svgEl);

        this.container.addEventListener('click', (e) => {
          this.handleProgressBarSeek(e);
        });
      }

    mount(parentEl) {
        const parent = this.player.rootElement;
        if (parent && this.container) {
          parent.appendChild(this.container);
          this.updatePosition();
          
          this._boundGlobalMouseMove = this.onGlobalMouseMove.bind(this);
          this._boundGlobalMouseLeave = this.onGlobalMouseLeave.bind(this);
          
          parent.addEventListener('mousemove', this._boundGlobalMouseMove);
          parent.addEventListener('mouseleave', this._boundGlobalMouseLeave);

          if (this.player.gt) {
            this.player.gt.registerTimeUpdateCallback(this._boundTimeUpdate);
          }
        }
      }

    onTimeUpdate(time, isPlaying, isReset) {
        if (!this.player.gt || !this.player.gt.videoPlayer) return;

        const duration = this.player.gt.videoPlayer.getDuration() || 0;
        if (duration <= 0) return;

        const percentage = (time / duration) * 100;
        if (this.progressBarFill) {
          this.progressBarFill.setAttribute('width', `${percentage}%`);
        }
        if (this.thumbEl) {
          this.thumbEl.setAttribute('x', `calc(${percentage}% - 3px)`);
        }

        this.updatePosition();
        this.evaluateVisibility();
      }

    onMouseMove(e) {
        if (!this.container) return;
        const rect = this.container.getBoundingClientRect();
        const relativeY = e.clientY - rect.top;
        
        if (relativeY >= -25 && relativeY <= 15) {
          this.isHovered = true;
        } else {
          this.isHovered = false;
        }
        this.evaluateVisibility();
      }

    onMouseLeave() {
        this.isHovered = false;
        this.evaluateVisibility();
      }

    evaluateVisibility() {
        if (!this.container || !this.player.gt) {
          this.setBarOpacity(0);
          return;
        }

        const isPianoActive = this.player.gt?.pianoVisuals?.isVisible;
        const style = window.projectApp?.state?.settings?.keyboardStyle || '3d';
        const isKeyboardActive = style !== 'none' && isPianoActive;

        if (isKeyboardActive && this.isHovered) {
          this.setBarOpacity(1);
        } else {
          this.setBarOpacity(0);
        }
      }

    setBarOpacity(opacity) {
        if (this.container) {
          this.container.style.opacity = String(opacity);
        }
      }

    handleProgressBarSeek(e) {
        if (!this.player.gt || !this.player.gt.videoPlayer || !this.container) return;
        
        const rect = this.container.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        
        if (width <= 0) return;
        
        const ratio = Math.max(0, Math.min(1, clickX / width));
        const duration = this.player.gt.videoPlayer.getDuration() || 0;
        
        if (duration > 0) {
          this.player.gt.seekTo(duration * ratio);
        }
      }

    destroy() {
        if (this.container) {
          this.container.remove();
        }
        
        const parent = this.player.rootElement;
        if (parent) {
          parent.removeEventListener('mousemove', this._boundGlobalMouseMove);
          parent.removeEventListener('mouseleave', this._boundGlobalMouseLeave);
        }

        this.container = null;
        this.progressBarFill = null;
        this.thumbEl = null;
      }

    
  
  updatePosition() {
        const viewport = document.getElementById('gt-master-viewport');
        if (!viewport || !this.container) return;

        const rect = viewport.getBoundingClientRect();
        const parentRect = this.player.rootElement.getBoundingClientRect();
        
        this.container.style.left = `${rect.left - parentRect.left + rect.width * 0.015}px`;
        this.container.style.width = `${rect.width * 0.97}px`;
        this.container.style.top = '';
        this.container.style.bottom = '0px';
        this.container.style.height = '24px';
      }

  onGlobalMouseMove(e) {
        if (!this.player.rootElement) return;

        const parentRect = this.player.rootElement.getBoundingClientRect();
        const relativeY = e.clientY - parentRect.top;
        const height = parentRect.height;

        if (relativeY >= height - 80) {
          this.isHovered = true;
        } else {
          this.isHovered = false;
        }
        this.evaluateVisibility();
      }

  onGlobalMouseLeave() {
        this.isHovered = false;
        this.evaluateVisibility();
      }
}