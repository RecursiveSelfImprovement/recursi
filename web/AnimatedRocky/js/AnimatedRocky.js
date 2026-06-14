class AnimatedRocky {
  async run(env) {
      if (!env || !env.container) {
        throw new Error("run() requires an environment object with a valid container.");
      }
      this.env = env;
      const targetElement = env.container;

      // App state
      this.state = {
        tailWagSpeed: 1.5,
        earFloppiness: 15,
        pantingSpeed: 1.2,
        collarColor: '#ff3b30',
        bgColor: '#1e293b',
        eyeColor: '#a06a38',
        isPanting: true,
        lookAtMouse: true,
        headTiltOffset: 0,
        currentHeadTilt: 0,
        currentTailAngle: 0,
        currentTongueY: 0,
        currentBlink: 0,
        mouseX: 300,
        mouseY: 260,
        targetMouseX: 300,
        targetMouseY: 260
      };

      // Audio setup
      this.audioCtx = null;

      // Setup styling
      this.applyStyles();

      // Clear container and structure the application layout
      targetElement.innerHTML = '';
      targetElement.classList.add('rocky-app-container');

      // Create main layout: grid with preview on left, control panel on right
      const grid = makeElement('div', { className: 'rocky-grid' });
      const previewCard = makeElement('div', { className: 'rocky-preview-card' });
      const controlsCard = makeElement('div', { className: 'rocky-controls-card' });

      grid.appendChild(previewCard);
      grid.appendChild(controlsCard);
      targetElement.appendChild(grid);

      // Build interactive SVG area inside preview card
      this.buildPreviewArea(previewCard);

      // Build beautiful control dashboard
      this.buildControlsArea(controlsCard);

      // Start animation loop
      this.isAnimating = true;
      this.lastTime = 0;
      this.blinkTimer = 0;
      this.blinkDuration = 0;
      this.nextBlinkTime = Math.random() * 4000 + 2000;

      const animate = (time) => {
        if (!this.isAnimating) return;
        this.updateAnimation(time);
        this.animationFrameId = requestAnimationFrame(animate);
      };
      this.animationFrameId = requestAnimationFrame(animate);

      // Mouse move listener to follow cursor
      this._handleMouseMove = (e) => {
        const svgRect = this.svgElement.getBoundingClientRect();
        // Calculate relative coordinates inside the 600x600 SVG viewBox
        const x = ((e.clientX - svgRect.left) / svgRect.width) * 600;
        const y = ((e.clientY - svgRect.top) / svgRect.height) * 600;
        this.state.targetMouseX = Math.max(0, Math.min(600, x));
        this.state.targetMouseY = Math.max(0, Math.min(600, y));
      };

      this._handleMouseLeave = () => {
        this.state.targetMouseX = 300;
        this.state.targetMouseY = 260;
      };

      this.svgContainer.addEventListener('mousemove', this._handleMouseMove);
      this.svgContainer.addEventListener('mouseleave', this._handleMouseLeave);
    }

  onResize(width, height) {
    if (this.containerSizeDisplay) {
      this.containerSizeDisplay.textContent = `Container size: ${Math.round(
        width
      )}W x ${Math.round(height)}H`;
    }
  }

  createConfigurableBox() {
      if (!this.configTextarea || !this.statusDiv) {
        console.error('Required elements not initialized.');
        return;
      }

      const jsonString = this.configTextarea.value;
      let options;

      try {
        options = JSON.parse(jsonString);
        options.env = this.env; // ENSURE DIALOG IS BOUND TO ENVIRONMENT
        this.statusDiv.textContent = 'Creating box with provided config...';

        const configuredBox = UITools.makeDialog(options);

        if (!options.contentHTML && !options.contentElement) {
          configuredBox.contentElement.appendChild(
            makeElement(
              'p',
              { style: { marginTop: 0 } },
              `Box created with title: "${options.title || 'Untitled'}"`
            )
          );
          configuredBox.contentElement.appendChild(
            makeElement(
              'p',
              `Size: ${options.size ? options.size.join('x') : 'Default'}`
            )
          );
        }

        this.configuredBoxes.push(configuredBox);
        this.statusDiv.textContent = `DialogBox "${options.title || 'Untitled'}" created successfully. Count: ${this.configuredBoxes.length}`;
      } catch (error) {
        console.error('Error parsing JSON config:', error);
        this.statusDiv.textContent = `Error: Invalid JSON configuration. ${error.message}`;
        alert(`Invalid JSON configuration:\n${error.message}\nPlease check the text area.`);
      }
    }

  getLastConfiguredBox() {
    return this.configuredBoxes.length > 0
      ? this.configuredBoxes[this.configuredBoxes.length - 1]
      : null;
  }

  destroy() {
      this.isAnimating = false;
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }
      if (this.svgContainer) {
        this.svgContainer.removeEventListener('mousemove', this._handleMouseMove);
        this.svgContainer.removeEventListener('mouseleave', this._handleMouseLeave);
      }
      if (this.audioCtx) {
        this.audioCtx.close();
      }
    }


  applyStyles() {
      applyCss(`
        .rocky-app-container {
          background-color: #0f172a;
          color: #f1f5f9;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          padding: 24px;
          min-height: 100vh;
          box-sizing: border-box;
          width: 100%;
        }
        .rocky-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }
        @media (max-width: 900px) {
          .rocky-grid {
            grid-template-columns: 1fr;
          }
        }
        .rocky-preview-card {
          background: #1e293b;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.05);
          position: relative;
        }
        .rocky-svg-container {
          width: 100%;
          max-width: 480px;
          aspect-ratio: 1;
          background: radial-gradient(circle, #334155 0%, #1e293b 100%);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: inset 0 2px 8px rgba(0,0,0,0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          cursor: pointer;
        }
        .rocky-controls-card {
          background: #1e293b;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .app-title-section {
          margin-bottom: 12px;
        }
        .app-title-section h1 {
          font-size: 24px;
          margin: 0;
          color: #38bdf8;
          font-weight: 800;
          letter-spacing: -0.5px;
        }
        .app-title-section p {
          margin: 4px 0 0 0;
          color: #94a3b8;
          font-size: 14px;
        }
        .control-group {
          background: rgba(15, 23, 42, 0.4);
          padding: 16px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .control-group-title {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          color: #94a3b8;
          margin-bottom: 12px;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .interaction-overlay {
          margin-top: 12px;
          font-size: 13px;
          color: #38bdf8;
          text-align: center;
          font-weight: 500;
        }
        .color-pickers-row {
          display: flex;
          gap: 16px;
          margin-top: 8px;
        }
        .custom-color-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .custom-color-item label {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 600;
        }
        .picker-btn-wrapper {
          height: 36px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          cursor: pointer;
          transition: transform 0.15s, border-color 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }
        .picker-btn-wrapper:hover {
          transform: scale(1.02);
          border-color: rgba(255, 255, 255, 0.25);
        }
        .sound-board {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .sound-btn {
          background: #38bdf8;
          color: #0f172a;
          border: none;
          padding: 10px 14px;
          font-weight: 700;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .sound-btn:hover {
          background: #7dd3fc;
          transform: translateY(-1px);
        }
        .sound-btn:active {
          transform: translateY(0);
        }
        .sound-btn.secondary {
          background: #475569;
          color: #f1f5f9;
        }
        .sound-btn.secondary:hover {
          background: #64748b;
        }
        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
          cursor: pointer;
          user-select: none;
          font-size: 13px;
          color: #cbd5e1;
        }
        .checkbox-row input {
          cursor: pointer;
        }
      `, 'rocky-styles');
    }

  buildPreviewArea(container) {
      this.svgContainer = makeElement('div', { className: 'rocky-svg-container' });

      // Create main SVG element with namespaces
      const svg = makeElement('svg:svg', {
        viewBox: '0 0 600 600',
        width: '100%',
        height: '100%',
        id: 'rocky-svg'
      });
      this.svgElement = svg;

      // Create radial glow background layer
      const bgGrad = makeElement('svg:defs', {}, [
        ['svg:radialGradient', { id: 'bg-gradient', cx: '50%', cy: '50%', r: '50%' }, [
          ['svg:stop', { offset: '0%', 'stop-color': '#334155' }],
          ['svg:stop', { offset: '100%', 'stop-color': '#111827' }]
        ]],
        ['svg:linearGradient', { id: 'tongue-gradient', x1: '0%', y1: '0%', x2: '0%', y2: '100%' }, [
          ['svg:stop', { offset: '0%', 'stop-color': '#ff85a2' }],
          ['svg:stop', { offset: '100%', 'stop-color': '#e04a70' }]
        ]],
        ['svg:linearGradient', { id: 'collar-gradient', x1: '0%', y1: '0%', x2: '100%', y2: '0%' }, [
          ['svg:stop', { offset: '0%', 'stop-color': '#ef4444' }],
          ['svg:stop', { offset: '100%', 'stop-color': '#b91c1c' }]
        ]],
        ['svg:linearGradient', { id: 'eye-gradient', x1: '0%', y1: '0%', x2: '100%', y2: '100%' }, [
          ['svg:stop', { offset: '0%', 'stop-color': '#c68a4c' }],
          ['svg:stop', { offset: '100%', 'stop-color': '#5c3818' }]
        ]],
        ['svg:filter', { id: 'drop-shadow', x: '-10%', y: '-10%', width: '120%', height: '120%' }, [
          ['svg:feDropShadow', { dx: '0', dy: '6', stdDeviation: '8', 'flood-opacity': '0.35' }]
        ]]
      ]);
      svg.appendChild(bgGrad);

      // Background Card Shape
      this.bgCircle = makeElement('svg:circle', {
        cx: '300',
        cy: '300',
        r: '260',
        fill: 'url(#bg-gradient)'
      });
      svg.appendChild(this.bgCircle);

      // Rocky's Tail (positioned behind body)
      // Base point: (220, 430) extending out to left
      this.tailGroup = makeElement('svg:g', { id: 'tail-group' });
      const tailBase = makeElement('svg:path', {
        d: 'M 210 420 Q 110 390 80 300 Q 60 270 80 250 Q 110 260 140 330 Q 190 380 220 405 Z',
        fill: '#1a1a1c'
      });
      const tailTip = makeElement('svg:path', {
        d: 'M 80 300 Q 60 270 80 250 Q 100 255 115 280 Z',
        fill: '#fcfcfc'
      });
      this.tailGroup.appendChild(tailBase);
      this.tailGroup.appendChild(tailTip);
      svg.appendChild(this.tailGroup);

      // Body / Shoulders
      const bodyGroup = makeElement('svg:g', { id: 'body-group' });
      // Black torso base
      const bodyBack = makeElement('svg:path', {
        d: 'M 160 600 Q 180 430 300 420 Q 420 430 440 600 Z',
        fill: '#131315',
        filter: 'url(#drop-shadow)'
      });
      bodyGroup.appendChild(bodyBack);

      // Fluffy White Chest Ruff (Tricolor typical luxury white chest)
      const chestRuff = makeElement('svg:path', {
        d: 'M 220 430 Q 300 400 380 430 Q 430 520 400 600 L 200 600 Q 170 520 220 430 Z',
        fill: '#fcfcfc'
      });
      // Soft chest shadows to add depth and detail
      const chestShadows = makeElement('svg:path', {
        d: 'M 250 460 Q 300 520 350 460 Q 300 590 250 460 M 270 500 Q 300 540 330 500 Q 300 580 270 500',
        fill: '#e2e8f0',
        opacity: '0.6'
      });
      bodyGroup.appendChild(chestRuff);
      bodyGroup.appendChild(chestShadows);
      svg.appendChild(bodyGroup);

      // Collar Group
      this.collarGroup = makeElement('svg:g', { id: 'collar-group' });
      this.collarPath = makeElement('svg:path', {
        d: 'M 216 430 Q 300 455 384 430 Q 390 444 380 452 Q 300 478 220 452 Z',
        fill: 'url(#collar-gradient)'
      });
      // Collar Charm/Tag
      this.collarTag = makeElement('svg:circle', {
        cx: '300',
        cy: '464',
        r: '12',
        fill: '#eab308',
        stroke: '#ca8a04',
        'stroke-width': '2'
      });
      this.collarTagShine = makeElement('svg:circle', {
        cx: '297',
        cy: '461',
        r: '4',
        fill: '#fef08a'
      });
      this.collarGroup.appendChild(this.collarPath);
      this.collarGroup.appendChild(this.collarTag);
      this.collarGroup.appendChild(this.collarTagShine);
      svg.appendChild(this.collarGroup);

      // HEAD GROUP (Animate Head tilt/rotation here)
      this.headGroup = makeElement('svg:g', { id: 'head-group' });

      // Left & Right Ears (Tipped floppy ear style of standard Collie)
      this.leftEarGroup = makeElement('svg:g', { id: 'left-ear' });
      const leftEarBase = makeElement('svg:path', {
        d: 'M 210 210 Q 130 180 140 100 Q 170 110 215 150 Z',
        fill: '#1a1a1c'
      });
      this.leftEarFlop = makeElement('svg:path', {
        d: 'M 140 100 Q 165 90 190 120 Q 155 140 140 100 Z',
        fill: '#131315'
      });
      const leftEarInner = makeElement('svg:path', {
        d: 'M 180 190 Q 155 170 160 140 Q 175 145 190 170 Z',
        fill: '#fca5a5',
        opacity: '0.4'
      });
      this.leftEarGroup.appendChild(leftEarBase);
      this.leftEarGroup.appendChild(this.leftEarFlop);
      this.leftEarGroup.appendChild(leftEarInner);

      this.rightEarGroup = makeElement('svg:g', { id: 'right-ear' });
      const rightEarBase = makeElement('svg:path', {
        d: 'M 390 210 Q 470 180 460 100 Q 430 110 385 150 Z',
        fill: '#1a1a1c'
      });
      this.rightEarFlop = makeElement('svg:path', {
        d: 'M 460 100 Q 435 90 410 120 Q 445 140 460 100 Z',
        fill: '#131315'
      });
      const rightEarInner = makeElement('svg:path', {
        d: 'M 420 190 Q 445 170 440 140 Q 425 145 410 170 Z',
        fill: '#fca5a5',
        opacity: '0.4'
      });
      this.rightEarGroup.appendChild(rightEarBase);
      this.rightEarGroup.appendChild(this.rightEarFlop);
      this.rightEarGroup.appendChild(rightEarInner);

      this.headGroup.appendChild(this.leftEarGroup);
      this.headGroup.appendChild(this.rightEarGroup);

      // Main Head Silhouette
      const headBase = makeElement('svg:path', {
        d: 'M 200 240 Q 300 130 400 240 Q 410 340 300 390 Q 190 340 200 240 Z',
        fill: '#1a1a1c'
      });
      this.headGroup.appendChild(headBase);

      // White Blaze (Border Collie gorgeous forehead pattern)
      const whiteBlaze = makeElement('svg:path', {
        d: 'M 285 165 Q 300 160 315 165 Q 330 250 350 290 L 250 290 Q 270 250 285 165 Z',
        fill: '#fcfcfc'
      });
      this.headGroup.appendChild(whiteBlaze);

      // Tan Points - Iconic Tricolor features (cheeks, spots above eyes)
      const tanCheeks = makeElement('svg:path', {
        d: 'M 205 290 Q 240 300 245 350 Q 200 350 205 290 M 395 290 Q 360 300 355 350 Q 400 350 395 290',
        fill: '#c68a4c'
      });
      this.headGroup.appendChild(tanCheeks);

      // Eyebrow Spots (Tricolor pips)
      this.leftEyebrow = makeElement('svg:ellipse', {
        cx: '255',
        cy: '205',
        rx: '14',
        ry: '9',
        fill: '#c68a4c',
        transform: 'rotate(-10 255 205)'
      });
      this.rightEyebrow = makeElement('svg:ellipse', {
        cx: '345',
        cy: '205',
        rx: '14',
        ry: '9',
        fill: '#c68a4c',
        transform: 'rotate(10 345 205)'
      });
      this.headGroup.appendChild(this.leftEyebrow);
      this.headGroup.appendChild(this.rightEyebrow);

      // EYES
      this.leftEyeGroup = makeElement('svg:g', { id: 'left-eye-group' });
      const leftEyeSocket = makeElement('svg:ellipse', { cx: '260', cy: '230', rx: '20', ry: '15', fill: '#0f172a' });
      this.leftIris = makeElement('svg:ellipse', { cx: '260', cy: '230', rx: '14', ry: '12', fill: 'url(#eye-gradient)' });
      this.leftPupil = makeElement('svg:ellipse', { cx: '260', cy: '230', rx: '8', ry: '8', fill: '#000000' });
      const leftHighlight = makeElement('svg:circle', { cx: '256', cy: '226', r: '4', fill: '#ffffff' });
      const leftHighlight2 = makeElement('svg:circle', { cx: '264', cy: '233', r: '1.5', fill: '#ffffff', opacity: '0.7' });
      this.leftEyeGroup.appendChild(leftEyeSocket);
      this.leftEyeGroup.appendChild(this.leftIris);
      this.leftEyeGroup.appendChild(this.leftPupil);
      this.leftEyeGroup.appendChild(leftHighlight);
      this.leftEyeGroup.appendChild(leftHighlight2);

      this.rightEyeGroup = makeElement('svg:g', { id: 'right-eye-group' });
      const rightEyeSocket = makeElement('svg:ellipse', { cx: '340', cy: '230', rx: '20', ry: '15', fill: '#0f172a' });
      this.rightIris = makeElement('svg:ellipse', { cx: '340', cy: '230', rx: '14', ry: '12', fill: 'url(#eye-gradient)' });
      this.rightPupil = makeElement('svg:ellipse', { cx: '340', cy: '230', rx: '8', ry: '8', fill: '#000000' });
      const rightHighlight = makeElement('svg:circle', { cx: '336', cy: '226', r: '4', fill: '#ffffff' });
      const rightHighlight2 = makeElement('svg:circle', { cx: '344', cy: '233', r: '1.5', fill: '#ffffff', opacity: '0.7' });
      this.rightEyeGroup.appendChild(rightEyeSocket);
      this.rightEyeGroup.appendChild(this.rightIris);
      this.rightEyeGroup.appendChild(this.rightPupil);
      this.rightEyeGroup.appendChild(rightHighlight);
      this.rightEyeGroup.appendChild(rightHighlight2);

      // Eye Lids for Blinking
      this.leftEyelid = makeElement('svg:path', {
        d: 'M 238 230 Q 260 210 282 230 Z',
        fill: '#1a1a1c',
        style: { transition: 'transform 0.05s' },
        transform: 'scaleY(0)'
      });
      this.rightEyelid = makeElement('svg:path', {
        d: 'M 318 230 Q 340 210 362 230 Z',
        fill: '#1a1a1c',
        style: { transition: 'transform 0.05s' },
        transform: 'scaleY(0)'
      });

      this.headGroup.appendChild(this.leftEyeGroup);
      this.headGroup.appendChild(this.rightEyeGroup);
      this.headGroup.appendChild(this.leftEyelid);
      this.headGroup.appendChild(this.rightEyelid);

      // Mouth / Tongue (Panting)
      this.mouthGroup = makeElement('svg:g', { id: 'mouth-group' });
      // Inner mouth dark area
      const innerMouth = makeElement('svg:path', {
        d: 'M 270 340 Q 300 375 330 340 Q 300 410 270 340',
        fill: '#451a24'
      });
      // The playful tongue!
      this.tongue = makeElement('svg:path', {
        d: 'M 285 350 Q 300 350 315 350 Q 315 390 300 410 Q 285 390 285 350 Z',
        fill: 'url(#tongue-gradient)'
      });
      // Tongue midline
      this.tongueLine = makeElement('svg:path', {
        d: 'M 300 350 L 300 395',
        stroke: '#b91c1c',
        'stroke-width': '1.5',
        opacity: '0.5'
      });

      this.mouthGroup.appendChild(innerMouth);
      this.mouthGroup.appendChild(this.tongue);
      this.mouthGroup.appendChild(this.tongueLine);
      this.headGroup.appendChild(this.mouthGroup);

      // Foreface / Muzzle
      const muzzleWhite = makeElement('svg:path', {
        d: 'M 250 290 Q 300 270 350 290 Q 360 350 300 365 Q 240 350 250 290 Z',
        fill: '#fcfcfc'
      });
      this.headGroup.appendChild(muzzleWhite);

      // Black Nose Leather with nostril details
      this.noseGroup = makeElement('svg:g', { id: 'nose-group', style: { cursor: 'pointer' } });
      const noseShape = makeElement('svg:path', {
        d: 'M 280 295 Q 300 283 320 295 Q 325 315 300 320 Q 275 315 280 295 Z',
        fill: '#131315'
      });
      const noseHighlight = makeElement('svg:ellipse', {
        cx: '293',
        cy: '298',
        rx: '6',
        ry: '3',
        fill: '#ffffff',
        opacity: '0.6',
        transform: 'rotate(-10 293 298)'
      });
      const mouthLine = makeElement('svg:path', {
        d: 'M 300 316 L 300 342 Q 280 342 270 338 M 300 342 Q 320 342 330 338',
        stroke: '#131315',
        'stroke-width': '2.5',
        fill: 'none'
      });
      this.noseGroup.appendChild(noseShape);
      this.noseGroup.appendChild(noseHighlight);
      this.noseGroup.appendChild(mouthLine);
      this.headGroup.appendChild(this.noseGroup);

      // Append Head Group to SVG
      svg.appendChild(this.headGroup);

      // Add SVG to its viewport container
      this.svgContainer.appendChild(svg);
      container.appendChild(this.svgContainer);

      // Add interaction overlay indicator
      const tipText = makeElement('div', { className: 'interaction-overlay' }, '✨ Hover to follow cursor • Click nose to squeak! ✨');
      container.appendChild(tipText);

      // Interactive Click listener on nose
      this.noseGroup.addEventListener('click', (e) => {
        e.stopPropagation();
        this.playSqueak();
        this.triggerNoseBounce();
      });
    }

  buildControlsArea(container) {
      // Header Info
      const headerSection = makeElement('div', { className: 'app-title-section' });
      headerSection.appendChild(makeElement('h1', 'Animated Rocky'));
      headerSection.appendChild(makeElement('p', 'Collie Likeness & Interactive Sandbox'));
      container.appendChild(headerSection);

      // Slider Controls Setup
      const controlsWrapper = makeElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } });

      // Group: Kinematics / Motion
      const kinematicsGroup = makeElement('div', { className: 'control-group' });
      kinematicsGroup.appendChild(makeElement('div', { className: 'control-group-title' }, '🐕 Animations & Kinematics'));
      
      const tailWagContainer = makeElement('div');
      kinematicsGroup.appendChild(tailWagContainer);
      const earFlopContainer = makeElement('div');
      kinematicsGroup.appendChild(earFlopContainer);
      const pantingContainer = makeElement('div');
      kinematicsGroup.appendChild(pantingContainer);

      controlsWrapper.appendChild(kinematicsGroup);

      // Group: Customization & Colors
      const styleGroup = makeElement('div', { className: 'control-group' });
      styleGroup.appendChild(makeElement('div', { className: 'control-group-title' }, '🎨 Color Customization'));

      // Layout for inline color buttons
      const colorsRow = makeElement('div', { className: 'color-pickers-row' });
      styleGroup.appendChild(colorsRow);
      controlsWrapper.appendChild(styleGroup);

      // Sound Board
      const soundGroup = makeElement('div', { className: 'control-group' });
      soundGroup.appendChild(makeElement('div', { className: 'control-group-title' }, '🔊 Audio Board'));
      const buttonsGrid = makeElement('div', { className: 'sound-board' });

      const barkBtn = makeElement('button', { className: 'sound-btn' }, '🎙️ Play Boof!');
      barkBtn.onclick = () => this.playBark(120);
      const squeakBtn = makeElement('button', { className: 'sound-btn secondary' }, '🎈 Squeaky Toy');
      squeakBtn.onclick = () => this.playSqueak();

      buttonsGrid.appendChild(barkBtn);
      buttonsGrid.appendChild(squeakBtn);
      soundGroup.appendChild(buttonsGrid);
      controlsWrapper.appendChild(soundGroup);

      // App features: Look at mouse
      const optGroup = makeElement('div', { className: 'control-group' });
      optGroup.appendChild(makeElement('div', { className: 'control-group-title' }, '⚙️ Options'));
      
      const lookCheckbox = makeElement('input', { type: 'checkbox', checked: this.state.lookAtMouse, id: 'chk-look' });
      lookCheckbox.onchange = (e) => { this.state.lookAtMouse = e.target.checked; };
      const lookLbl = makeElement('label', { htmlFor: 'chk-look', className: 'checkbox-row' }, lookCheckbox, 'Follow Cursor with Head & Eyes');
      
      const pantCheckbox = makeElement('input', { type: 'checkbox', checked: this.state.isPanting, id: 'chk-pant' });
      pantCheckbox.onchange = (e) => {
        this.state.isPanting = e.target.checked;
        this.mouthGroup.style.display = this.state.isPanting ? '' : 'none';
      };
      const pantLbl = makeElement('label', { htmlFor: 'chk-pant', className: 'checkbox-row' }, pantCheckbox, 'Panting Tongue Active');

      optGroup.appendChild(lookLbl);
      optGroup.appendChild(pantLbl);
      controlsWrapper.appendChild(optGroup);

      container.appendChild(controlsWrapper);

      // Initialize Sliders
      this.tailWagSlider = new SliderControl({
        label: 'Tail Wag Speed',
        min: 0,
        max: 5,
        initialValue: this.state.tailWagSpeed,
        callback: (val) => { this.state.tailWagSpeed = val; }
      });
      this.tailWagSlider.appendTo(tailWagContainer);

      this.earFlopSlider = new SliderControl({
        label: 'Ear Fold Position',
        min: 0,
        max: 30,
        initialValue: this.state.earFloppiness,
        callback: (val) => { this.state.earFloppiness = val; }
      });
      this.earFlopSlider.appendTo(earFlopContainer);

      this.pantSlider = new SliderControl({
        label: 'Tongue Pant Speed',
        min: 0,
        max: 4,
        initialValue: this.state.pantingSpeed,
        callback: (val) => { this.state.pantingSpeed = val; }
      });
      this.pantSlider.appendTo(pantingContainer);

      // Setup custom trigger buttons to open native/smart picker dialogs
      this.buildPickerButton(colorsRow, 'Collar Ribbon', this.state.collarColor, (col) => {
        this.state.collarColor = col;
        this.collarPath.setAttribute('fill', col);
      });

      this.buildPickerButton(colorsRow, 'Collie Eyes', this.state.eyeColor, (col) => {
        this.state.eyeColor = col;
        // Re-inject a linear gradient to match dynamic eyes
        const eyeGrad = this.svgElement.querySelector('#eye-gradient');
        if (eyeGrad) {
          eyeGrad.innerHTML = '';
          eyeGrad.appendChild(makeElement('svg:stop', { offset: '0%', 'stop-color': col }));
          eyeGrad.appendChild(makeElement('svg:stop', { offset: '100%', 'stop-color': '#2e1a08' }));
        }
      });

      this.buildPickerButton(colorsRow, 'Ambient Glow', this.state.bgColor, (col) => {
        this.state.bgColor = col;
        const bgGrad = this.svgElement.querySelector('#bg-gradient');
        if (bgGrad) {
          bgGrad.innerHTML = '';
          bgGrad.appendChild(makeElement('svg:stop', { offset: '0%', 'stop-color': col }));
          bgGrad.appendChild(makeElement('svg:stop', { offset: '100%', 'stop-color': '#090d16' }));
        }
      });
    }

  buildPickerButton(container, label, defaultVal, callback) {
      const wrapper = makeElement('div', { className: 'custom-color-item' });
      const labelEl = makeElement('label', {}, label);
      
      const btn = makeElement('div', {
        className: 'picker-btn-wrapper',
        style: {
          backgroundColor: defaultVal,
          color: '#ffffff'
        }
      }, 'Select');

      btn.onclick = () => {
        // Instantiate the system ColorPicker class cleanly
        const pickerInstance = new ColorPicker();
        pickerInstance.openSmartPicker(btn, defaultVal, (newColor) => {
          btn.style.backgroundColor = newColor;
          callback(newColor);
        });
      };

      wrapper.appendChild(labelEl);
      wrapper.appendChild(btn);
      container.appendChild(wrapper);
    }

  updateAnimation(time) {
      const dt = time - this.lastTime;
      this.lastTime = time;

      // 1. Tail Wagging Physics
      if (this.state.tailWagSpeed > 0) {
        this.state.currentTailAngle = Math.sin(time * 0.01 * this.state.tailWagSpeed) * 16;
        this.tailGroup.setAttribute('transform', `rotate(${this.state.currentTailAngle} 210 420)`);
      }

      // 2. Head follow cursor logic
      let targetTilt = 0;
      let targetHeadX = 0;
      let targetHeadY = 0;

      if (this.state.lookAtMouse) {
        // Smoothly interpolate current mouse tracking towards target coordinate
        this.state.mouseX += (this.state.targetMouseX - this.state.mouseX) * 0.1;
        this.state.mouseY += (this.state.targetMouseY - this.state.mouseY) * 0.1;

        // Map mouse coordinates to head offsets
        targetHeadX = (this.state.mouseX - 300) * 0.08;
        targetHeadY = (this.state.mouseY - 260) * 0.08;
        targetTilt = (this.state.mouseX - 300) * 0.05 + this.state.headTiltOffset;
      } else {
        targetTilt = this.state.headTiltOffset;
      }

      // Apply organic head bobbing/breathing
      const breathingBob = Math.sin(time * 0.002) * 3;
      targetHeadY += breathingBob;

      this.state.currentHeadTilt += (targetTilt - this.state.currentHeadTilt) * 0.12;
      this.headGroup.setAttribute('transform', `translate(${targetHeadX} ${targetHeadY}) rotate(${this.state.currentHeadTilt} 300 290)`);

      // 3. Ear folding kinematics
      // Ear fold tilts slightly outwards as ears fold down
      const flopLeftAngle = -this.state.earFloppiness * 0.6;
      const flopRightAngle = this.state.earFloppiness * 0.6;
      this.leftEarFlop.setAttribute('transform', `rotate(${flopLeftAngle} 140 100)`);
      this.rightEarFlop.setAttribute('transform', `rotate(${flopRightAngle} 460 100)`);

      // 4. Eyes pupil alignment direction
      if (this.state.lookAtMouse) {
        const pupilMaxOffset = 4;
        const dx = this.state.mouseX - 300;
        const dy = this.state.mouseY - 260;
        const distance = Math.hypot(dx, dy) || 1;
        const pupilX = (dx / distance) * pupilMaxOffset;
        const pupilY = (dy / distance) * pupilMaxOffset;

        this.leftPupil.setAttribute('transform', `translate(${pupilX} ${pupilY})`);
        this.rightPupil.setAttribute('transform', `translate(${pupilX} ${pupilY})`);
        this.leftIris.setAttribute('transform', `translate(${pupilX * 0.5} ${pupilY * 0.5})`);
        this.rightIris.setAttribute('transform', `translate(${pupilX * 0.5} ${pupilY * 0.5})`);
      } else {
        this.leftPupil.setAttribute('transform', 'none');
        this.rightPupil.setAttribute('transform', 'none');
        this.leftIris.setAttribute('transform', 'none');
        this.rightIris.setAttribute('transform', 'none');
      }

      // 5. Blinking calculation
      this.blinkTimer += dt;
      if (this.blinkTimer >= this.nextBlinkTime) {
        this.state.currentBlink = 1.0;
        this.blinkTimer = 0;
        this.blinkDuration = 0;
        this.nextBlinkTime = Math.random() * 5000 + 1500; // time until next blink
      }

      if (this.state.currentBlink > 0) {
        this.blinkDuration += dt;
        if (this.blinkDuration < 100) {
          // Closing eyelid
          this.leftEyelid.setAttribute('transform', 'scaleY(1.3)');
          this.rightEyelid.setAttribute('transform', 'scaleY(1.3)');
        } else if (this.blinkDuration < 200) {
          // Opening eyelid
          this.leftEyelid.setAttribute('transform', 'scaleY(0)');
          this.rightEyelid.setAttribute('transform', 'scaleY(0)');
          this.state.currentBlink = 0;
        }
      }

      // 6. Mouth / Tongue organic panting motion
      if (this.state.isPanting && this.state.pantingSpeed > 0) {
        const pantScale = 1.0 + Math.sin(time * 0.012 * this.state.pantingSpeed) * 0.08;
        const pantTranslateY = Math.sin(time * 0.012 * this.state.pantingSpeed) * 4;
        this.tongue.setAttribute('transform', `translate(0 ${pantTranslateY}) scale(1 ${pantScale})`);
        this.tongueLine.setAttribute('transform', `translate(0 ${pantTranslateY}) scale(1 ${pantScale})`);
      } else {
        this.tongue.setAttribute('transform', 'none');
        this.tongueLine.setAttribute('transform', 'none');
      }
    }

  triggerNoseBounce() {
      // Create a momentary cute head tilt recoil when nose is clicked
      this.state.headTiltOffset = -12;
      setTimeout(() => {
        this.state.headTiltOffset = 6;
        setTimeout(() => {
          this.state.headTiltOffset = 0;
        }, 150);
      }, 100);
    }

  initAudio() {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
    }

  playSqueak() {
      this.initAudio();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const time = this.audioCtx.currentTime;
      
      // Squeak tone oscillator
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, time);
      // Sweeping frequency pitch upwards rapidly to simulate squeaky rubber toy
      osc.frequency.exponentialRampToValueAtTime(1400, time + 0.12);
      
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.2, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
      
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      osc.start(time);
      osc.stop(time + 0.25);
    }

  playBark(frequencyBase = 120) {
      this.initAudio();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const time = this.audioCtx.currentTime;

      // Dog bark synthesizer (low sweep + noise burst)
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      const filter = this.audioCtx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(frequencyBase, time);
      osc.frequency.exponentialRampToValueAtTime(frequencyBase * 0.4, time + 0.15);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(400, time);
      filter.Q.setValueAtTime(3.0, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.4, time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(time);
      osc.stop(time + 0.25);

      // Momentary high tail wag
      const originalSpeed = this.state.tailWagSpeed;
      this.state.tailWagSpeed = 4.5;
      setTimeout(() => {
        this.state.tailWagSpeed = originalSpeed;
      }, 600);
    }
}