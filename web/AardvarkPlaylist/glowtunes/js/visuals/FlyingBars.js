
class FlyingBars {
  pianoVisuals = null;

  isVisible = false;

  containerList = {};

  constructor(pianoVisualsInstance) {
    this.pianoVisuals = pianoVisualsInstance;
    if (!this.pianoVisuals) {
      throw new Error(`FlyingBars Error: PianoVisuals instance not provided.`);
    }
    // The call to _applyStaticStyles() is removed from here.
    console.log(`FlyingBars: Initialized for inline styling.`);
  }

  init() {
    // console.log('FlyingBars.init() called.');
    this.clearAllBars();
    if (!this.pianoVisuals || !this.pianoVisuals.geometrySettings) {
      console.error('FlyingBars.init: Cannot initialize - missing geometry.');
      return;
    }
    //console.log(
    // 'FlyingBars.init: Ready (Perspective handled by NoteContainers).'
    //);
  }

  setClickability(clickable) {
    this.isClickable = clickable;
    const val = clickable ? 'auto' : 'none';

    Object.values(this.containerList).forEach((nc) => {
      if (!nc || !nc.elems) return;
      [0, 1].forEach((layerIdx) => {
        const layer = nc.elems[layerIdx];
        if (layer) {
          layer.style.pointerEvents = val;
          Array.from(layer.children).forEach((noteEl) => {
            if (
              noteEl.classList.contains('gt-note-wrapper') ||
              noteEl.classList.contains('gt-marker-wrapper') ||
              noteEl.classList.contains('gt-mute-wrapper')
            ) {
              noteEl.style.pointerEvents = val;
              noteEl.style.cursor = clickable ? 'pointer' : 'default';
            }
          });
        }
      });
    });
  }

  clearAllBars() {
      if (this.containerList) {
        Object.keys(this.containerList).forEach((key) => {
          const nc = this.containerList[key];
          if (nc) {
            nc.destroy();
          }
        });
      }
      this.containerList = {};

      // Ensure the master viewport is empty of any stray debug elements except protected ones
      const visuals = this.pianoVisuals;
      if (visuals && visuals.viewport) {
        const allowedElements = [
          visuals.actionBar?.containerW,
          visuals.actionBar?.containerB,
          window.projectApp?.subtleProgressBar?.container
        ];

        // Safely prune non-allowed elements without recursive append loops
        Array.from(visuals.viewport.childNodes).forEach((child) => {
          if (child && !allowedElements.includes(child)) {
            child.remove();
          }
        });
      }
    }

  clearNotesOnly() {
    // This efficiently removes only the note elements, leaving the container divs in place for reuse.
    Object.values(this.containerList).forEach((nc) => nc?.deleteNotes());
  }

  setTime(timeMs, intervalMs, forcePosition) {
      if (
        !this.isVisible ||
        !this.pianoVisuals ||
        !this.pianoVisuals.geometrySettings
      )
        return;
  
      const gs = this.pianoVisuals.geometrySettings;
      if (!gs?.scale || gs.containerTimeSpan <= 0) return;
  
      const animationDurationMs = intervalMs;
      
      const appH = window.projectApp ? window.projectApp.getAppHeight() : window.innerHeight;
      const viewportHeight = appH;
      const bufferTimeMs =
        (viewportHeight / gs.scale) * 1.5 + gs.containerTimeSpan * 2;
  
      const lookbackTimeMs = timeMs - bufferTimeMs;
      const lookaheadTimeMs = timeMs + animationDurationMs + bufferTimeMs;
  
      const startIndex = Math.max(
        0,
        Math.floor(lookbackTimeMs / gs.containerTimeSpan)
      );
      const endIndex = Math.ceil(lookaheadTimeMs / gs.containerTimeSpan);
  
      if (this.containerList) {
        for (const k in this.containerList) {
          const idx = k | 0;
          const nc = this.containerList[idx];
          if (!nc) continue;
  
          const inRange = idx >= startIndex && idx <= endIndex;
  
          if (inRange) {
            // Explicitly unhide segments entering our viewport
            if (typeof nc.show === 'function' && !nc.isVisible) {
              nc.show();
            } else if (
              nc.elems &&
              nc.elems[0] &&
              nc.elems[0].style.display === 'none'
            ) {
              nc.elems.forEach((el) => {
                if (el) el.style.display = 'block';
              });
              nc.isVisible = true;
            }
            nc.setTime(timeMs, animationDurationMs, forcePosition);
          } else if (forcePosition) {
            // Clean up off-screen segments immediately during a jump
            if (typeof nc.hide === 'function' && nc.isVisible !== false) {
              nc.hide();
            } else if (
              nc.elems &&
              nc.elems[0] &&
              nc.elems[0].style.display !== 'none'
            ) {
              nc.elems.forEach((el) => {
                if (el) el.style.display = 'none';
              });
              nc.isVisible = false;
            }
          }
        }
      }
    }

  deleteNote(note) {
    if (note?.domElements) {
      note.domElements.forEach((e) => e?.remove());
      note.domElements = null;
    }
  }

  addNote(note) {
    const gs = this.pianoVisuals.geometrySettings;
    const pv = this.pianoVisuals;
    if (!gs || !pv || !note?.mc) return;

    const noteRenderData = pv.getNoteRenderData(note.mc);
    if (!noteRenderData || gs.containerTimeSpan <= 0) return;

    let visualTime = note.t;
    let visualDuration = note.d || 500;

    if (window.arpEnabled && note.tr === 1 && note.chordRank !== undefined) {
      const spread = window.arpGlobalSpread || 0;
      const lenFactor = window.arpGlobalLenFactor || 1.0;
      const anchor = window.arpAnchor !== undefined ? window.arpAnchor : 1.0;
      const pattern = window.arpPattern || [0, 1, 2];

      visualDuration = visualDuration * lenFactor;

      let stepIndex = pattern.indexOf(note.chordRank);

      if (stepIndex === -1 && pattern.length > 0) {
        stepIndex = note.chordRank % pattern.length;
      }

      if (stepIndex !== -1) {
        const rawOffset = stepIndex * spread;
        const totalArpTime = (pattern.length - 1) * spread;
        const anchorShift = -(anchor * totalArpTime);
        visualTime = note.t + rawOffset + anchorShift;
      }
    }

    const noteEndTime = visualTime + visualDuration;
    const containerIndex = Math.floor(noteEndTime / gs.containerTimeSpan);
    let nc = this.containerList[containerIndex];

    if (!nc) {
      const containerStartTime = containerIndex * gs.containerTimeSpan;
      nc = new NoteContainer(
        containerStartTime,
        gs.containerTimeSpan,
        containerIndex,
        gs
      );
      if (!nc.elems || nc.elems.length !== 2) return;
      this.containerList[containerIndex] = nc;

      // Ensure newly created chunks are instantly clickable if we are in Edit Mode
      if (this.isClickable) {
        nc.elems.forEach((el) => {
          if (el) el.style.pointerEvents = 'auto';
        });
      }
    }

    const relativeStartTime = visualTime - nc.startTime;
    const scaledDuration = Math.max(1, visualDuration * gs.scale);
    const top = nc.bottom - relativeStartTime * gs.scale - scaledDuration;
    const opacity = 0.55;

    const styles = this._getNoteStyles();

    const div = makeElement('div', {
      className: 'gt-note-wrapper',
      style: {
        ...styles.base,
        top: `${top}px`,
        left: `${noteRenderData.left}px`,
        height: `${scaledDuration}px`,
      },
    });
    note.domElements = [div];

    this._styleNote(
      div,
      note,
      noteRenderData,
      scaledDuration,
      opacity,
      nc,
      styles
    );

    if (noteRenderData.isBlack) {
      const shadow = makeElement('div', {
        className: 'gt-note-shadow',
        style: {
          ...styles.shadow,
          top: `${top}px`,
          left: `${noteRenderData.left - 1}px`,
          width: `${noteRenderData.width + 2}px`,
          height: `${scaledDuration + 12}px`,
        },
      });
      note.domElements.push(shadow);
      nc.elems[0]?.appendChild(shadow);
    }
  }

  _styleNoteLegacy(
    div,
    note,
    noteRenderData,
    widthAdder,
    height,
    opacity,
    top,
    noteContainer
  ) {
    const targetContainer = noteContainer.elems[noteRenderData.isBlack ? 1 : 0];

    if (!targetContainer) {
      console.error(
        `_styleNoteLegacy: Missing target container for key ${noteRenderData.mc}, isBlack: ${noteRenderData.isBlack}`
      );
      return;
    }

    const styles = this._getNoteStyles();
    const s = div.style;

    if (noteRenderData.isBlack) {
      Object.assign(s, styles.blackNote);
      // FIX: Removed the '+ 2' that was making the container wider than its contents.
      s.width = noteRenderData.width + 2 * widthAdder + 'px';
      s.borderColor = `rgb(${Math.floor(
        (noteRenderData.c1[0] + noteRenderData.c2[0]) / 3
      )}, ${Math.floor(
        (noteRenderData.c1[1] + noteRenderData.c2[1]) / 3
      )}, ${Math.floor((noteRenderData.c1[2] + noteRenderData.c2[2]) / 3)})`;
      const halfWidth = Math.floor(noteRenderData.width / 2);
      const rightWidth = noteRenderData.width - halfWidth;
      const colorL = noteRenderData.c1;
      const colorR = noteRenderData.c2;
      const bgLOpacity = opacity;
      const bgROpacity = opacity;
      const bgL =
        colorL[0] === colorL[1] && colorL[1] === colorL[2]
          ? `rgba(255,255,255,${bgLOpacity * 0.5})`
          : `rgba(${colorL.join(',')}, ${bgLOpacity})`;
      const bgR =
        colorR[0] === colorR[1] && colorR[1] === colorR[2]
          ? `rgba(255,255,255,${bgROpacity * 0.5})`
          : `rgba(${colorR.join(',')}, ${bgROpacity})`;

      const divL = makeElement('div', {
        style: {
          ...styles.blackNoteL,
          top: `0px`,
          left: `0px`,
          width: `${halfWidth + widthAdder}px`,
          height: `${height + 3}px`,
          backgroundColor: bgL,
        },
      });
      const divR = makeElement('div', {
        style: {
          ...styles.blackNoteR,
          top: `0px`,
          left: `${halfWidth - 1 + widthAdder}px`,
          width: `${rightWidth + widthAdder}px`,
          height: `${height + 3}px`,
          backgroundColor: bgR,
        },
      });

      try {
        div.appendChild(divL);
        div.appendChild(divR);
        note.domElements.push(divL);
        note.domElements.push(divR);
      } catch (e) {
        console.error(
          `Error appending fills for black key ${noteRenderData.mc}:`,
          e
        );
      }
    } else {
      Object.assign(s, styles.whiteNote);
      const color = noteRenderData.c1;
      s.width = noteRenderData.width - 2 + 2 * widthAdder + 'px';
      s.borderColor = `transparent transparent rgb(${color.join(
        ','
      )}) transparent`;
      s.backgroundColor = `rgba(${color.join(',')}, ${opacity - 0.14})`;
    }

    try {
      targetContainer.appendChild(div);
    } catch (e) {
      console.error(
        `Error appending main note div for ${noteRenderData.mc} to target container:`,
        e
      );
      note.domElements.forEach((el) => el?.remove());
      note.domElements = [];
    }
  }

  loadVeq(veq) {
    const eventCount = veq?.timedEvents?.length ?? 0;

    this.clearNotesOnly();

    if (eventCount > 0) {
      const isSorted = veq.timedEvents.every(
        (e, i, a) => i === 0 || a[i - 1].t <= e.t
      );
      if (!isSorted)
        console.warn(
          "[FlyingBars] Input VEQ events are not sorted by time 't'."
        );
      let notesAdded = 0;
      veq.timedEvents.forEach((n) => {
        if (n.type === 'note') {
          this.addNote(n);
          notesAdded++;
        } else if (n.type === 'marker') {
          this.addMarker(n);
        } else if (n.type === 'mute') {
          this.addMute(n);
        }
      });
    } else {
      console.warn('[FlyingBars] Invalid or empty VEQ data provided.', veq);
    }
  }

  show() {
    if (this.isVisible) return;
    //console.log('FlyingBars.show() - Activating.');

    Object.values(this.containerList).forEach((nc) => {
      if (nc && nc.elems) {
        nc.elems.forEach((el) => {
          if (el) {
            el.style.display = 'block';
            el.style.opacity = '1';

            // FIX: Removed the override that forced Z-Index to 30000+.
            // Now we rely on NoteContainer.js (zIndex 100/110) which stays BELOW
            // the Action Bar (zIndex 500).
            // This ensures notes slide UNDER the keys as intended.
            if (el.dataset && el.dataset.layer === 'black') {
              // el.style.zIndex = '30011'; // OLD
              el.style.zIndex = '110'; // Correct
            } else {
              // el.style.zIndex = '30010'; // OLD
              el.style.zIndex = '100'; // Correct
            }
          }
        });
      }
    });

    this.isVisible = true;
  }

  hide() {
    /* ... (no change needed) ... */
    if (!this.isVisible) return;
    // console.log('FlyingBars.hide() - Deactivating time updates.');
    this.isVisible = false;
  }

  destroy() {
    //console.log('FlyingBars: Destroying...');
    this.clearAllBars(); // Now actually removes elements
    this.pianoVisuals = null;
    this.isVisible = false;
  }

  _getNoteStyles() {
    return {
      base: {
        position: 'absolute',
        pointerEvents: 'none',
        willChange:
          'top, left, height, width, background-color, border-color, transform',
        boxSizing: 'border-box',
      },
      shadow: {
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,.36)',
        pointerEvents: 'none',
        zIndex: -1,
        borderRadius: '14px',
        willChange: 'top, left, height, width, transform',
      },
      whiteNote: {
        borderRadius: '3px',
        boxShadow: '0px 0px 5px #fff',
        borderWidth: '0px 0px 10px 0px',
        borderStyle: 'solid',
        textAlign: 'center',
      },
      blackNote: {
        borderRadius: '14px',
        borderWidth: '2px',
        borderStyle: 'solid',
        zIndex: '1',
        overflow: 'visible',
      },
      blackNoteFill: {
        position: 'absolute',
        zIndex: '0',
        boxSizing: 'border-box',
        pointerEvents: 'none',
      },
      blackNoteL: { borderRadius: '14px 0 0 14px' },
      blackNoteR: { borderRadius: '0 14px 14px 0' },
    };
  }

  _styleNote(
    div,
    note,
    noteRenderData,
    height,
    opacity,
    noteContainer,
    styles
  ) {
    const targetContainer = noteContainer.elems[noteRenderData.isBlack ? 1 : 0];
    if (!targetContainer) return;

    const s = div.style;

    let baseColor = noteRenderData.c1;
    let secColor = noteRenderData.c2 || noteRenderData.c1;

    if (noteRenderData.isBlack) {
      Object.assign(s, styles.blackNote);

      const baseOutline = Math.max(0, noteRenderData.width - 2);
      const outlineWidth = Math.max(0, baseOutline + 2);
      div.dataset.baseOutlineWidth = String(baseOutline);
      s.width = `${outlineWidth}px`;

      const borderColor = `rgb(${Math.floor(
        (baseColor[0] + secColor[0]) / 3
      )}, ${Math.floor((baseColor[1] + secColor[1]) / 3)}, ${Math.floor(
        (baseColor[2] + secColor[2]) / 3
      )})`;
      s.borderColor = borderColor;
      div.dataset.origBorderColor = borderColor;

      const borderThickness = 2;
      const usable = Math.max(0, outlineWidth - borderThickness * 2);
      const leftWidth = Math.ceil(usable / 2);
      const rightWidth = usable - leftWidth;
      const fillHeight = Math.max(0, height - borderThickness * 2);

      const divL = makeElement('div', {
        className: 'gt-black-note-l',
        style: {
          position: 'absolute',
          top: `0px`,
          left: `0px`,
          width: `${leftWidth}px`,
          height: `${fillHeight}px`,
          borderRadius: '11px 0 0 11px',
          backgroundColor: `rgba(${baseColor.join(',')}, ${opacity})`,
        },
      });
      const divR = makeElement('div', {
        className: 'gt-black-note-r',
        style: {
          position: 'absolute',
          top: `0px`,
          right: `0px`,
          width: `${rightWidth}px`,
          height: `${fillHeight}px`,
          borderRadius: '0 11px 11px 0',
          backgroundColor: `rgba(${secColor.join(',')}, ${opacity})`,
        },
      });

      div.innerHTML = '';
      div.appendChild(divL);
      div.appendChild(divR);
      s.backgroundColor = 'transparent';
    } else {
      Object.assign(s, styles.whiteNote);
      s.width = `${noteRenderData.width - 2}px`;
      const bc = `transparent transparent rgb(${baseColor.join(
        ','
      )}) transparent`;
      div.dataset.origBorderColor = bc;
      s.borderColor = bc;
      s.backgroundColor = `rgba(${baseColor.join(',')}, ${opacity - 0.14})`;
    }

    if (this.pianoVisuals?.config?.showNoteNames) {
      const nameStr =
        noteRenderData.name || this._getMidiName(noteRenderData.mc);
      const nameDiv = makeElement(
        'div',
        {
          className: 'gt-note-name-label',
          style: {
            ...styles.noteName,
            ...(noteRenderData.isBlack ? styles.noteNameForBlackKey : {}),
          },
        },
        nameStr
      );
      div.appendChild(nameDiv);
    }

    this._applySelectionStyle(div, note, styles, noteRenderData);

    // Click handler attached unconditionally; gated by isClickable in handler.
    // Pointer-events is only 'auto' when edit mode is on, so clicks pass
    // through to controls beneath when not editing.
    div.addEventListener('click', (event) => {
      this._handleNoteClick(note, div, styles, noteRenderData, event);
    });
    div.style.pointerEvents = this.isClickable ? 'auto' : 'none';
    div.style.cursor = this.isClickable ? 'pointer' : 'default';

    targetContainer.appendChild(div);
  }

  setBlackFillTweaks(newTweaks = {}, refresh = true) {
    this.BLACK_FILL_TWEAKS = {
      ...(this.BLACK_FILL_TWEAKS || {
        innerInsetLeftPx: 0,
        innerInsetRightPx: 2,
        widthScale: 0.985,
        centerShiftPx: -1,
        extraHeightPx: 3,
      }),
      ...newTweaks,
    };
    if (refresh) this.refreshAllBlackFills();
  }

  refreshAllBlackFills() {
    const T = this.BLACK_FILL_TWEAKS || {
      outlineWidthAdjustPx: 2,
      innerInsetLeftPx: 0,
      innerInsetRightPx: 0,
      widthScale: 0.98,
      centerShiftPx: 0,
      depthTopInsetPx: 0,
      depthBottomInsetPx: 0,
      depthShiftPx: 0,
      shadowGrowPx: 2,
    };

    const applyToContainer = (el) => {
      if (!el) return;
      // Ensure container itself is visible
      el.style.opacity = '1';
      el.style.display = 'block';

      const notes = el.querySelectorAll('.gt-note-wrapper');
      notes.forEach((noteEl) => {
        // Force visibility
        noteEl.style.display = 'block';
        noteEl.style.opacity = '1';

        // ... (fill tweaks)
        const l = noteEl.querySelector('.gt-black-note-l');
        const r = noteEl.querySelector('.gt-black-note-r');

        if (l && r) {
          const baseOutline = parseInt(
            noteEl.dataset.baseOutlineWidth || '0',
            10
          );
          const outlineWidth = Math.max(
            0,
            baseOutline + (T.outlineWidthAdjustPx || 0)
          );
          if (outlineWidth > 0) noteEl.style.width = `${outlineWidth}px`;

          const usableRaw = Math.max(
            0,
            outlineWidth - (T.innerInsetLeftPx + T.innerInsetRightPx)
          );
          const usable = Math.max(
            0,
            Math.round(usableRaw * (T.widthScale ?? 1))
          );

          let seam = Math.floor(usable / 2) + (T.centerShiftPx || 0);
          if (seam < 0) seam = 0;
          if (seam > usable) seam = usable;

          const leftW = seam;
          const rightW = Math.max(0, usable - seam);

          const outerH = parseInt(noteEl.style.height || '0', 10);

          const trimmedTop = Math.max(0, T.depthTopInsetPx || 0);
          const trimmedBottom = Math.max(0, T.depthBottomInsetPx || 0);
          const fillHeight = Math.max(0, outerH - trimmedTop - trimmedBottom);
          const fillTop = Math.max(0, trimmedTop + (T.depthShiftPx || 0));
          const fillLeft = T.innerInsetLeftPx;

          l.style.top = `${fillTop}px`;
          l.style.left = `${fillLeft}px`;
          l.style.width = `${leftW}px`;
          if (fillHeight > 0) l.style.height = `${fillHeight}px`;

          r.style.top = `${fillTop}px`;
          r.style.left = `${fillLeft + leftW}px`;
          r.style.width = `${rightW}px`;
          if (fillHeight > 0) r.style.height = `${fillHeight}px`;
        }
      });
    };

    Object.values(this.containerList || {}).forEach((nc) => {
      if (!nc?.elems) return;
      applyToContainer(nc.elems[0]);
      applyToContainer(nc.elems[1]);
    });
  }

  _handleNoteClick(note, div, styles, noteRenderData, event) {
    if (!this.isClickable) return;

    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    if (note.pinned) {
      note.pinned = false;
      note.selected = false;
      note._selectedAt = 0;
      if (window.VideoEventQueueClass) {
        window.VideoEventQueueClass.notifySubscribers();
      }
      this.updateSelectionVisuals();
      return;
    }

    // Pass 'keepOthers=true' so multiple items toggle independently
    if (window.VideoEventQueueClass) {
      window.VideoEventQueueClass.toggleEventSelection(note, true);
    }

    this.updateSelectionVisuals();
  }

  _applySelectionStyle(div, note, styles, noteRenderData) {
    const s = div.style;
    s.borderStyle = 'solid';

    if (note.pinned) {
      s.border = '3px dashed #ffffff';
      s.borderStyle = 'dashed';
      s.zIndex = '4000';
    } else if (
      window.showChordColors &&
      note.chordId !== undefined &&
      note.chordRank !== undefined
    ) {
      s.borderWidth = '4px';
      s.borderStyle = 'solid';
      s.zIndex = '3000';
      if (note.chordRank === 0) s.borderColor = '#ff0000';
      else if (note.chordRank === 1) s.borderColor = '#00ff00';
      else if (note.chordRank === 2) s.borderColor = '#0088ff';
    } else if (note.selected) {
      s.border = '2px solid #ffffff';
      s.borderStyle = 'solid';
      s.zIndex = '1500';
    } else {
      s.zIndex = '1';
      // Clear overarching border state before resetting independent properties
      s.border = '';
      if (noteRenderData.isBlack) {
        s.borderWidth = '2px';
        s.borderStyle = 'solid';
        s.borderColor = div.dataset.origBorderColor || '#000';
      } else {
        s.borderWidth = '0px 0px 10px 0px';
        s.borderStyle = 'solid';
        s.borderColor = div.dataset.origBorderColor;
      }
    }
  }

  updateSelectionVisuals() {
    const veq = window.VideoEventQueueClass?.current;
    if (!veq || !veq.timedEvents) return;

    const styles = this._getNoteStyles();

    veq.timedEvents.forEach((note) => {
      if (note.domElements && note.domElements[0]) {
        const wrapper = note.domElements[0];
        if (note.type === 'note') {
          const noteRenderData = this.pianoVisuals.getNoteRenderData(note.mc);
          if (noteRenderData) {
            this._applySelectionStyle(wrapper, note, styles, noteRenderData);
          }
        } else if (note.type === 'marker') {
          this._applyMarkerSelectionStyle(wrapper, note);
        } else if (note.type === 'mute') {
          this._applyMuteSelectionStyle(wrapper, note);
        }
      }
    });
  }

  _getMidiName(mc) {
    const notes = [
      'C',
      'C#',
      'D',
      'D#',
      'E',
      'F',
      'F#',
      'G',
      'G#',
      'A',
      'A#',
      'B',
    ];
    return notes[mc % 12];
  }

  addMarker(event) {
    const gs = this.pianoVisuals.geometrySettings;
    if (!gs || gs.containerTimeSpan <= 0) return;

    const visualTime = event.t;
    const containerIndex = Math.floor(visualTime / gs.containerTimeSpan);
    let nc = this.containerList[containerIndex];

    if (!nc) {
      const containerStartTime = containerIndex * gs.containerTimeSpan;
      nc = new NoteContainer(
        containerStartTime,
        gs.containerTimeSpan,
        containerIndex,
        gs
      );
      if (!nc.elems || nc.elems.length !== 2) return;
      this.containerList[containerIndex] = nc;
      if (this.isClickable)
        nc.elems.forEach((el) => {
          if (el) el.style.pointerEvents = 'auto';
        });
    }

    const relativeStartTime = visualTime - nc.startTime;
    const scaledDuration = 6;
    const top = nc.bottom - relativeStartTime * gs.scale - scaledDuration;

    const div = makeElement('div', {
      className: 'gt-marker-wrapper',
      style: {
        position: 'absolute',
        pointerEvents: this.isClickable ? 'auto' : 'none',
        cursor: this.isClickable ? 'pointer' : 'default',
        top: `${top}px`,
        left: '0px',
        width: '100%',
        height: `${scaledDuration}px`,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        zIndex: '500',
      },
    });

    if (event.label) {
      const labelDiv = makeElement(
        'div',
        {
          style: {
            color: '#fff',
            fontSize: '10px',
            marginLeft: '4px',
            textShadow: '0px 1px 2px #000',
            lineHeight: `${scaledDuration}px`,
            fontFamily: 'sans-serif',
          },
        },
        event.label
      );
      div.appendChild(labelDiv);
    }

    event.domElements = [div];
    this._applyMarkerSelectionStyle(div, event);

    div.addEventListener('click', (e) => {
      if (!this.isClickable) return;
      e.stopPropagation();
      e.preventDefault();
      if (window.VideoEventQueueClass) {
        window.VideoEventQueueClass.toggleEventSelection(event, true);
      }
      this.updateSelectionVisuals();
    });

    nc.elems[0]?.appendChild(div);
  }

  addMute(event) {
    const gs = this.pianoVisuals.geometrySettings;
    if (!gs || gs.containerTimeSpan <= 0) return;

    const visualTime = event.t;
    const containerIndex = Math.floor(visualTime / gs.containerTimeSpan);
    let nc = this.containerList[containerIndex];

    if (!nc) {
      const containerStartTime = containerIndex * gs.containerTimeSpan;
      nc = new NoteContainer(
        containerStartTime,
        gs.containerTimeSpan,
        containerIndex,
        gs
      );
      if (!nc.elems || nc.elems.length !== 2) return;
      this.containerList[containerIndex] = nc;
      if (this.isClickable)
        nc.elems.forEach((el) => {
          if (el) el.style.pointerEvents = 'auto';
        });
    }

    const relativeStartTime = visualTime - nc.startTime;
    const scaledDuration = 3;
    const top = nc.bottom - relativeStartTime * gs.scale - scaledDuration;

    const div = makeElement('div', {
      className: 'gt-mute-wrapper',
      style: {
        position: 'absolute',
        pointerEvents: this.isClickable ? 'auto' : 'none',
        cursor: this.isClickable ? 'pointer' : 'default',
        top: `${top}px`,
        left: '0px',
        width: '100%',
        height: `${scaledDuration}px`,
        backgroundColor: 'rgba(255, 80, 0, 0.6)',
        zIndex: '499',
      },
    });

    event.domElements = [div];
    this._applyMuteSelectionStyle(div, event);

    div.addEventListener('click', (e) => {
      if (!this.isClickable) return;
      e.stopPropagation();
      e.preventDefault();
      if (window.VideoEventQueueClass) {
        window.VideoEventQueueClass.toggleEventSelection(event, true);
      }
      this.updateSelectionVisuals();
    });

    nc.elems[0]?.appendChild(div);
  }

  _applyMarkerSelectionStyle(div, event) {
    if (event.selected) {
      div.style.backgroundColor = 'rgba(0, 255, 255, 0.9)';
      div.style.boxShadow = '0 0 8px rgba(0, 255, 255, 0.8)';
    } else {
      div.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
      div.style.boxShadow = 'none';
    }
  }

  _applyMuteSelectionStyle(div, event) {
    if (event.selected) {
      div.style.backgroundColor = 'rgba(255, 255, 0, 0.9)';
      div.style.boxShadow = '0 0 8px rgba(255, 255, 0, 0.8)';
    } else {
      div.style.backgroundColor = 'rgba(255, 80, 0, 0.6)';
      div.style.boxShadow = 'none';
    }
  }

  
}



