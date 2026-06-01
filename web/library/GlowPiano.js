

// --- START OF FILE GlowPiano.js ---
class GlowPiano {
constructor(graphicPiano, options = {}) {
    this.basePiano = graphicPiano;
    this.svg = graphicPiano.getSvgElement();
    this.keysData = graphicPiano.getKeysData();

    this.saturatedColors = [
      [255, 0, 0], null, [255, 128, 0], null, [255, 255, 0],
      [0, 255, 0], null, [0, 90, 255], null, [128, 0, 255], null, [255, 0, 255]
    ];

    // <<< Settings restored primarily from GlowPianoOrig.js >>>
    this.settings = {
      pastelFactor: 0.7,
      borderPastelFactor: 0.3,
      borderThickness: 4,
      blackBorderThickness: 2,
      darkGray: [51, 51, 51],
      // Use Orig settings for glow/blur defaults:
      glowThickness: 10, // Generic fallback, specific below
      blurRadius: 4,    // Generic fallback, specific below
      gradientTransition: 2, // Keep this from the newer version, seems reasonable
      activePastelFactor: 0.15, // From Orig
      whiteGlowThickness: 10, // From Orig
      blackGlowThickness: 10, // From Orig (used for left/right glow calculation)
      whiteBlurRadius: 4,     // From Orig
      blackBlurRadius: 4,     // From Orig
      blackPastelFactor: 0.3, // From Orig
      minPlayTime: 1000,      // From Orig
      // Inactive colors (kept hardcoded style)
      inactiveWhiteFillColor: [180, 180, 180],
      inactiveBlackFillColor: [180, 180, 180],
      inactiveBorderColor: [80, 80, 80], // From Orig (slightly darker gray)
      // Semi-active settings (kept sliders style, values from Orig)
      semiActivePastelFactor: 0.4,
      semiActiveBlackPastelFactor: 0.5,
      semiActiveWhiteGlowThickness: 6,  // From Orig
      semiActiveBlackGlowThickness: 6,  // From Orig (used for left/right glow calc)
      semiActiveWhiteBlurRadius: 2,   // From Orig
      semiActiveBlackBlurRadius: 2,    // From Orig
        blackKeyHitboxWidthFactor: 1.5, // e.g., 1.5 means 50% wider than visual key
      // Make hitbox slightly taller too, maybe extending downwards a bit?
      blackKeyHitboxHeightFactor: 1.05, // e.g. 5% taller, extending below
      blackKeyHitboxVerticalOffset: 0 // Pixels to shift hitbox down relative to visual key top
    };

    Object.assign(this.settings, options);
    this.noteCallback = null;
    this.activeNotes = new Map(); // Map<midi, { startTime, isHeld, timeoutId, isProgrammatic, suppressDisplay, customData, triggeredByTouchId }>

    // --- State for Touch Handling ---
    // Maps touchIdentifier to the midi code it's currently activating/glissandoing over
    this.touchStates = new Map(); // Map<touchIdentifier, { currentMidi: number | null }>
  }

setNoteCallback(callback) {
    this.noteCallback = callback;
  }

updateSize(svgWidth, svgHeight) {
    // Re-initialize is necessary as key positions/sizes change
    this.destroy(); // Clean up old listeners first
    this.initialize();
  }

// Renamed from removeGlowElements to reflect it handles more interaction elements
  // Helper to remove all potential glow and hitbox elements for a key
  removeInteractionElements(key) {
    const elementsToRemove = [
        key.glowElement, key.leftGlow, key.rightGlow,
        key.semiGlowElement, key.semiLeftGlow, key.semiRightGlow,
        key.hitboxElement // Also remove the hitbox if it exists
    ];
    elementsToRemove.forEach(el => {
        if (el && el.parentNode) {
            try {
              el.parentNode.removeChild(el);
            } catch (e) {
              // Ignore if already removed
            }
        }
    });
    // Clear references
    delete key.glowElement; delete key.leftGlow; delete key.rightGlow;
    delete key.semiGlowElement; delete key.semiLeftGlow; delete key.semiRightGlow;
    delete key.hitboxElement; // Clear hitbox reference
  }

// Updated method: Now sets data-midi directly on the hitbox
  createHitboxElement(key) {
      if (!key.isBlack || !key.element || !key.bbox || !key.bbox.position || !key.bbox.size) {
          // console.warn("Cannot create hitbox, missing data for black key:", key.midiCode);
          return;
      }

      const visualX = key.bbox.position[0];
      const visualY = key.bbox.position[1];
      const visualWidth = key.bbox.size[0];
      const visualHeight = key.bbox.size[1];

      if (isNaN(visualX) || isNaN(visualY) || isNaN(visualWidth) || isNaN(visualHeight) || visualWidth <= 0 || visualHeight <= 0) {
          console.warn("Invalid bbox for black key hitbox creation:", key.midiCode, key.bbox);
          return;
      }

      const hitboxWidth = visualWidth * this.settings.blackKeyHitboxWidthFactor;
      const hitboxHeight = visualHeight * this.settings.blackKeyHitboxHeightFactor;
      const hitboxX = visualX - (hitboxWidth - visualWidth) / 2;
      const hitboxY = visualY + this.settings.blackKeyHitboxVerticalOffset;

      const hitbox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      hitbox.setAttribute('x', String(hitboxX));
      hitbox.setAttribute('y', String(hitboxY));
      hitbox.setAttribute('width', String(hitboxWidth));
      hitbox.setAttribute('height', String(hitboxHeight));
      hitbox.setAttribute('fill', 'transparent');
      hitbox.setAttribute('stroke', 'none');
      hitbox.setAttribute('pointer-events', 'all');
      // *** Set the data-midi attribute here ***
      hitbox.dataset.midi = key.midiCode;

      key.hitboxElement = hitbox;
      // Append happens later in initialize()
  }

initialize() {
    this.keysData = this.basePiano.getKeysData();
    if (!this.keysData || this.keysData.length === 0) {
      console.warn("GlowPiano: keysData not available, initialization skipped");
      return;
    }

    // --- Clean up previous state and listeners ---
    this.destroy(); // Call destroy to ensure listeners are removed before re-adding

    this.keysData.forEach(key => {
        // Reset visual elements (ensure they are removed before recreating)
        this.removeInteractionElements(key); // Removes glows and hitboxes

        // Reset key state properties
        key.isInactive = key.isInactive || false;
        key.isSemiActive = key.isSemiActive || false;
        key.isActive = false; // Ensure isActive is reset

        // We will add data-midi in setupKeyEvents or createHitboxElement
        if (!key.element) {
             console.warn(`Key element missing for MIDI ${key.midiCode} during initialize`);
        }
    });

    this.setupSvgDefs(); // Must happen before createGlowElements

    // Temporary array to hold hitboxes, so they can be appended last (on top)
    const hitboxesToAppend = [];

    this.keysData.forEach(key => {
        this.assignKeyColor(key); // Uses settings
        this.styleStaticKey(key);   // Uses settings
        this.createGlowElements(key); // Uses settings, creates elements but doesn't add them

        // --- Create Hitbox for Black Keys ---
        if (key.isBlack) {
             // createHitboxElement now sets data-midi on the hitbox
             this.createHitboxElement(key);
             if (key.hitboxElement) {
                 hitboxesToAppend.push(key.hitboxElement);
             }
        }
        // ------------------------------------

        this.updateKeyAppearance(key); // Apply initial appearance (inactive/semi/default)
        // setupKeyEvents will set data-midi on white key elements
        this.setupKeyEvents(key);
    });

    // Append hitboxes last to ensure they are on top for pointer events
    hitboxesToAppend.forEach(hitbox => {
        if (hitbox.parentNode !== this.svg) { // Avoid re-appending if already there
          this.svg.appendChild(hitbox);
        }
    });

    // Setup global listeners for touch move/end and mouse up
    this.setupGlobalListeners();
  }

// Helper to remove all potential glow elements for a key
  removeGlowElements(key) {
    const elementsToRemove = [
        key.glowElement, key.leftGlow, key.rightGlow,
        key.semiGlowElement, key.semiLeftGlow, key.semiRightGlow
    ];
    elementsToRemove.forEach(el => {
        if (el && el.parentNode) {
            try {
              el.parentNode.removeChild(el);
            } catch (e) {
              // Ignore if already removed, helps prevent race conditions on fast re-init
              // console.warn("Error removing glow element:", e);
            }
        }
    });
    // Clear references
    delete key.glowElement; delete key.leftGlow; delete key.rightGlow;
    delete key.semiGlowElement; delete key.semiLeftGlow; delete key.semiRightGlow;
  }

//--------------------- setupSvgDefs (Restored logic, ensures defs exist)
  setupSvgDefs() {
    let defs = this.svg.querySelector('defs');
    if (!defs) {
      // Use standard DOM API for reliability if makeElement is flaky or undefined
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      if (this.svg.firstChild) {
         this.svg.insertBefore(defs, this.svg.firstChild);
      } else {
         this.svg.appendChild(defs);
      }
    }
    this.gradientDefs = defs; // Store reference
    this.createBlackKeyGradients(); // Create gradients within these defs
  }
  //------------------ / setupSvgDefs

// Refined setKeyActive: Doesn't reset isSemiActive when turning isActive off.
setKeyActive(midi, isActive) {
  const key = this.basePiano.getKeyByMidi(midi);
  if (!key) return;
  // Do not change active state if key is explicitly inactive
  if (key.isInactive) {
      // If trying to activate an inactive key, ignore.
      // If trying to deactivate an inactive key (e.g., cleanup), allow isActive flag change but visuals won't update.
      if (isActive) return;
  }

  // Update the active state
  key.isActive = isActive;

  // Update appearance *after* state flags are set correctly.
  // updateKeyAppearance will handle the visual priority (active > semi > inactive > default).
  this.updateKeyAppearance(key);
}

// Refined setKeyInactive: Ensures semi-active is also turned off when inactive is set.
setKeyInactive(midi, isInactive) {
  const key = this.basePiano.getKeyByMidi(midi);
  if (!key) return;

  const previousInactiveState = key.isInactive;
  key.isInactive = isInactive;

  // If becoming inactive:
  if (isInactive) {
      // Ensure any active note is stopped immediately.
      if (this.activeNotes.has(midi)) {
          this.deactivateNote(midi, true); // Force immediate stop
      }
      // Also ensure the semi-active state is turned off. Inactive overrides semi-active.
      key.isSemiActive = false;
  }

  // Only update appearance if the state actually changed
  if (key.isInactive !== previousInactiveState) {
      this.updateKeyAppearance(key);
  }
}

// Minor refinement to setKeySemiActive for clarity and robustness
setKeySemiActive(midi, isSemiActive) {
    const key = this.basePiano.getKeyByMidi(midi);
    if (!key) return;

    const previousSemiActiveState = key.isSemiActive;

    // Logic when trying to turn semi-active ON
    if (isSemiActive) {
        // Cannot become semi-active if explicitly inactive or already fully active.
        if (key.isInactive) {
            console.warn(`Cannot set key ${midi} to semi-active while it is inactive.`);
            return; // Ignore request
        }
         if (key.isActive) {
            console.warn(`Cannot set key ${midi} to semi-active while it is active. It will become semi-active when deactivated if flag remains set.`);
            // We can still set the flag internally, but visuals won't change until isActive is false.
            // Or choose to ignore: return;
            // Let's allow setting the flag so it reverts correctly later.
        }
    }

    // Set the state flag
    key.isSemiActive = isSemiActive;

    // Update appearance only if the state changed AND the key is not currently active
    // (because active appearance overrides semi-active)
    if (key.isSemiActive !== previousSemiActiveState && !key.isActive) {
        this.updateKeyAppearance(key);
    }
    // If it *is* active, updateKeyAppearance will be called when it deactivates,
    // and will then correctly show the semi-active state if the flag is still true.
}

// --- Core Note Activation Logic ---
  activateNote(midi, options = {}) {
    const {
      duration = this.settings.minPlayTime, // Default duration for programmatic
      isProgrammatic = false,
      suppressDisplay = false,
      customData = null,
      triggeredByTouchId = null // Pass null for mouse/programmatic
    } = options;

    const key = this.basePiano.getKeyByMidi(midi);
    // Prevent activating non-existent, inactive keys
    if (!key || key.isInactive) return;
    // Prevent programmatic activation if a touch/mouse is actively holding it
    if (isProgrammatic && this.activeNotes.has(midi) && this.activeNotes.get(midi).isHeld) {
        return;
    }
     // Prevent touch/mouse activation if a programmatic note is playing (avoids visual conflicts)
     // Allow override if the same touch is re-triggering (for glissando/rapid taps)
    const existingNote = this.activeNotes.get(midi);
    if (!isProgrammatic && existingNote && existingNote.isProgrammatic && existingNote.triggeredByTouchId !== triggeredByTouchId) {
        // Maybe stop the programmatic note? Or just ignore the manual input?
        // For now, let's prioritize manual input: stop the programmatic note.
        this.deactivateNote(midi, true); // Force stop programmatic
    }

    const now = Date.now();
    let isRetrigger = false;

    if (existingNote) {
      // --- Rapid Tap / Glissando Re-trigger ---
      // Check if the *same* interaction type is triggering again
      const isSameTouch = triggeredByTouchId !== null && existingNote.triggeredByTouchId === triggeredByTouchId;
      const isSameMouse = triggeredByTouchId === null && existingNote.triggeredByTouchId === null && !existingNote.isProgrammatic;
      const isSameProgrammatic = isProgrammatic && existingNote.isProgrammatic;

      if (isSameTouch || isSameMouse || isSameProgrammatic) {
          isRetrigger = true;
          clearTimeout(existingNote.timeoutId); // Cancel previous end timer
          // Reset start time for minPlayTime calculation on release
          existingNote.startTime = now;
          existingNote.isHeld = !isProgrammatic; // Re-affirm held state for touch/mouse
          existingNote.suppressDisplay = suppressDisplay; // Update suppress flag if needed
          existingNote.customData = customData; // Update custom data

          // Re-notify start for audio re-articulation
          if (this.noteCallback) this.noteCallback(midi, 'start', customData);

          // No need to change visual state if already active
      } else {
          // Different interaction type trying to activate - stop the old one first.
          this.deactivateNote(midi, true); // Force immediate stop of the old note
      }
    }

    if (!isRetrigger) {
        // --- New Note Activation ---
        if (!suppressDisplay) this.setKeyActive(midi, true); // Visual activation
        if (this.noteCallback) this.noteCallback(midi, 'start', customData);

        const newNoteData = {
            startTime: now,
            isHeld: !isProgrammatic, // Held if triggered by touch/mouse
            timeoutId: null,
            isProgrammatic,
            suppressDisplay,
            customData,
            triggeredByTouchId
        };
        this.activeNotes.set(midi, newNoteData);
    }

    // --- Schedule End Timeout ---
    // Always schedule based on minPlayTime for touch/mouse to ensure minimum duration on release
    // Use provided duration for programmatic notes
    const scheduleDelay = isProgrammatic ? duration : this.settings.minPlayTime;
    this.scheduleNoteEnd(midi, scheduleDelay);
  }

// --- Note Deactivation Logic ---
  // Can be called by timeout or forced externally (e.g., setKeyInactive)
  deactivateNote(midi, forceImmediate = false) {
    const note = this.activeNotes.get(midi);
    if (!note) return;

    // If forced, or if the note is not currently held down by touch/mouse
    if (forceImmediate || !note.isHeld) {
        clearTimeout(note.timeoutId); // Stop any pending timeout

        if (!note.suppressDisplay) this.setKeyActive(midi, false); // Visual deactivation
        if (this.noteCallback) this.noteCallback(midi, 'stop', note.customData);

        this.activeNotes.delete(midi); // Remove from active map
    }
    // If it *is* held, the release handler (touchend/mouseup) will eventually call scheduleNoteEnd again.
  }

// Schedule the timeout that will eventually call deactivateNote
  scheduleNoteEnd(midi, duration) {
    const note = this.activeNotes.get(midi);
    if (!note) return;

    // Clear any existing timeout for this specific note before setting a new one
    clearTimeout(note.timeoutId);

    note.timeoutId = setTimeout(() => {
      // When the timeout fires, call deactivateNote.
      // deactivateNote itself will check the 'isHeld' flag.
      this.deactivateNote(midi);
    }, duration);
  }

// Public method for programmatic playback
  playNote(midi, duration, suppressDisplay = false, customData = null) {
    this.activateNote(midi, {
      duration,
      isProgrammatic: true,
      suppressDisplay,
      customData
    });
  }

// Updated method: Now explicitly sets data-midi on white key elements
  setupKeyEvents(key) {
    // Determine the element to attach listeners to AND set data-midi on
    const targetElement = key.isBlack && key.hitboxElement ? key.hitboxElement : key.element;

    if (!targetElement) {
        // console.warn(`No target element found for setting up events on MIDI ${key.midiCode}`);
        return;
    }

    // --- Ensure data-midi is set on the target element ---
    // createHitboxElement sets it for black keys. We set it here for white keys.
    if (!key.isBlack && key.element) {
        key.element.dataset.midi = key.midiCode;
    }
    // Redundant check for black keys, but ensures it's definitely set if hitbox creation failed but element exists
    else if (key.isBlack && key.hitboxElement) {
         // Already set in createHitboxElement, but checking doesn't hurt.
         if (!key.hitboxElement.dataset.midi) {
             key.hitboxElement.dataset.midi = key.midiCode;
             console.warn(`Had to set data-midi late for black key ${key.midiCode}`);
         }
    } else if (key.isBlack && key.element && !key.hitboxElement) {
         // Fallback: If hitbox failed, use visual element but log warning
         console.warn(`Black key ${key.midiCode} missing hitbox, attaching events to visual element.`);
         key.element.dataset.midi = key.midiCode;
         // Update targetElement if it was null before because hitboxElement was missing
         // targetElement = key.element; // This line is problematic - targetElement already assigned
                                        // If targetElement was null, we would have returned earlier.
                                        // We just ensure data-midi is on the fallback element.
    }

    // --- Clean up potential old listeners ---
    // Check both visual and hitbox elements as before
    const elementsToCheck = [key.element, key.hitboxElement].filter(el => el);
    elementsToCheck.forEach(el => {
        // Use a consistent property name on the element to store the reference
        // Avoids relying on key.mousedownHandler matching if object references change
        if (el._mousedownHandler) {
            el.removeEventListener('mousedown', el._mousedownHandler);
            delete el._mousedownHandler;
        }
         if (el._touchstartHandler) {
            el.removeEventListener('touchstart', el._touchstartHandler, { passive: false });
            delete el._touchstartHandler;
        }
    });
    delete key.mousedownHandler; // Clear old stored handler ref from key object
    delete key.touchstartHandler;

    // --- Mousedown (Per Key on Target Element) ---
    key.mousedownHandler = (e) => {
      if (e.button !== 0 || this.touchStates.size > 0) return;
      e.preventDefault();
      // Ensure we use the midi from the element that received the event,
      // which should match key.midiCode but is safer this way.
      const eventMidi = parseInt(e.currentTarget.dataset.midi, 10);
      if (!isNaN(eventMidi)) {
           // Check if the key data associated with this element is inactive
           const eventKeyData = this.basePiano.getKeyByMidi(eventMidi);
           if (eventKeyData && !eventKeyData.isInactive) {
                this.activateNote(eventMidi, { triggeredByTouchId: null });
           }
      }
    };
    targetElement.addEventListener('mousedown', key.mousedownHandler);
    targetElement._mousedownHandler = key.mousedownHandler; // Store ref on element

    // --- Touchstart (Per Key on Target Element) ---
    key.touchstartHandler = (e) => {
      e.preventDefault();

      for (const touch of e.changedTouches) {
          // Get midi from the element that was touched
          const eventMidi = parseInt(e.currentTarget.dataset.midi, 10);
          if (isNaN(eventMidi)) continue; // Should not happen if setup is correct

          // Get the key data for the touched element
          const eventKeyData = this.basePiano.getKeyByMidi(eventMidi);

          // Check if the specific key touched is inactive
          if (eventKeyData && eventKeyData.isInactive) {
               // If touched key is inactive, still track the touch's existence
               // but don't associate it with this MIDI or activate the note.
               // This allows glissando to start if the finger *slides* off the inactive key.
               // We only set the touch state if it's a *new* touch we aren't tracking yet.
               if (!this.touchStates.has(touch.identifier)) {
                   this.touchStates.set(touch.identifier, { currentMidi: null }); // Track touch, but no active MIDI
               }
               continue; // Skip activation for this inactive key
          }

          // If key is active (or doesn't exist which is unlikely here), proceed
          if (eventKeyData) {
             this.touchStates.set(touch.identifier, { currentMidi: eventMidi });
             this.activateNote(eventMidi, { triggeredByTouchId: touch.identifier });
          }
      }
    };
    targetElement.addEventListener('touchstart', key.touchstartHandler, { passive: false });
    targetElement._touchstartHandler = key.touchstartHandler; // Store ref on element
  }

setupGlobalListeners() {
    // Ensure handlers are bound correctly to 'this' and only added once
    if (!this.globalTouchMoveHandler) {
        this.globalTouchMoveHandler = this.handleGlobalTouchMove.bind(this);
        this.svg.addEventListener('touchmove', this.globalTouchMoveHandler, { passive: false });
    }

    if (!this.globalTouchEndHandler) {
        this.globalTouchEndHandler = this.handleGlobalTouchEnd.bind(this);
        // Listen on window to catch touches ending outside the SVG
        window.addEventListener('touchend', this.globalTouchEndHandler, { passive: false });
        window.addEventListener('touchcancel', this.globalTouchEndHandler, { passive: false });
    }

    if (!this.globalMouseUpHandler) {
        this.globalMouseUpHandler = this.handleGlobalMouseUp.bind(this);
        // Listen on window to catch mouseup outside the SVG
        window.addEventListener('mouseup', this.globalMouseUpHandler);
        // Optional: Handle mouse leaving the SVG gracefully (like mouseup)
        // this.svg.addEventListener('mouseleave', this.globalMouseUpHandler);
    }
  }

// --- Global Touch Move Handler (for Glissando) ---
  // Rewritten to use elementsFromPoint to handle inactive key hitboxes blocking underlying keys
  handleGlobalTouchMove(e) {
    e.preventDefault(); // Prevent scrolling during drag

    for (const touch of e.changedTouches) {
        const touchId = touch.identifier;
        const touchState = this.touchStates.get(touchId);

        // Only process touches we are actively tracking from a previous touchstart
        if (!touchState) continue;

        let targetMidi = null; // The MIDI code of the key to potentially activate
        let targetKeyData = null; // The data for the target key

        // Get all elements under the current touch point
        const elementsUnderTouch = document.elementsFromPoint(touch.clientX, touch.clientY);

        // Iterate through the elements (topmost first) to find the first *active* key
        for (const element of elementsUnderTouch) {
            const keyData = this.getKeyDataFromElement(element); // Use our helper

            // Check if we found key data AND the key is NOT inactive
            if (keyData && !keyData.isInactive) {
                // Found an active key! This is our target for glissando.
                targetKeyData = keyData;
                targetMidi = keyData.midiCode;
                break; // Stop searching, we prioritize the topmost *active* key
            }
            // If keyData exists but isInactive is true, we continue checking elements underneath.
            // If keyData is null, it's not a key element, continue checking underneath.
        }
        // After checking all elements, targetMidi will be the MIDI of the topmost active key,
        // or null if no active key was found under the touch point.

        // --- Glissando Logic ---
        // Check if the finger moved onto a *new* active key
        if (targetMidi !== null && targetMidi !== touchState.currentMidi) {
            // Activate the new key for this specific touch
            // The activateNote function already handles re-triggering vs new note logic correctly.
            this.activateNote(targetMidi, { triggeredByTouchId: touchId });
            // Update the state to track that this touch is now activating the new key
            touchState.currentMidi = targetMidi;
        }
        // Check if the finger moved *off* the previously active key area
        // (either onto an inactive key area, off the piano entirely, or onto a different active key handled above)
        else if (targetMidi !== touchState.currentMidi) {
             // If the target is now null (off-key or only over inactive keys)
             // or if the target is a *different* key (handled by the 'if' block above),
             // we update the touch state to reflect it's no longer controlling the *previous* midi.
             // The actual stopping of the *note* for touchState.currentMidi is handled by its
             // own timeout or release logic in handleGlobalTouchEnd/handleGlobalMouseUp.
             // We just need to update the touch's *current association*.
             touchState.currentMidi = targetMidi; // Set to the new midi (null or the new key's midi)
        }
        // If targetMidi is the same as touchState.currentMidi, the finger hasn't moved significantly
        // relative to the active key areas, so do nothing.
    }
  }

// --- Global Touch End/Cancel Handler ---
  handleGlobalTouchEnd(e) {
    // Don't prevent default here generally, only if needed for specific interactions

    for (const touch of e.changedTouches) {
        const touchId = touch.identifier;
        const touchState = this.touchStates.get(touchId); // Check if we were tracking

        // Only process touches we are actively tracking
        if (touchState) {
            // Find ALL active notes associated with this specific touch ending
            this.activeNotes.forEach((note, midi) => { // Iterate through all active notes
                if (note.triggeredByTouchId === touchId) {
                    // Found a note held by the ending touch
                    note.isHeld = false;
                    note.triggeredByTouchId = null; // Dissociate touch AFTER processing

                    // Recalculate remaining time based on minPlayTime
                    const elapsed = Date.now() - note.startTime;
                    const remainingTime = Math.max(0, this.settings.minPlayTime - elapsed);

                    // Reschedule the final 'stop' call (which includes visual update)
                    this.scheduleNoteEnd(midi, remainingTime);
                }
            }); // End forEach over activeNotes

            // Stop tracking this touch identifier *after* processing all its notes
            this.touchStates.delete(touchId);
        }
    }
  }

// --- Global Mouse Up Handler ---
  handleGlobalMouseUp(e) {
    // Process all notes that were potentially held by the mouse (triggeredByTouchId === null)
    this.activeNotes.forEach((note, midi) => {
        if (note.isHeld && note.triggeredByTouchId === null && !note.isProgrammatic) {
            note.isHeld = false;

            // Recalculate remaining time based on minPlayTime
            const elapsed = Date.now() - note.startTime;
            const remainingTime = Math.max(0, this.settings.minPlayTime - elapsed);

            // Reschedule the final 'stop' call
            this.scheduleNoteEnd(midi, remainingTime);
        }
    });
  }

//--------------------- createBlackKeyGradients (Restored from Orig, adapted)
  createBlackKeyGradients() {
      if (!this.gradientDefs) {
          console.warn("Cannot create gradients, defs element not ready.");
          return;
      }
      // Clear previous gradients specific to this piano instance if necessary
      // Safter to rely on unique IDs per instance or full clear if only one piano
       this.gradientDefs.innerHTML = ''; // Simple clear for now

       // Use standard DOM API for creating elements
       const createStop = (offset, color) => {
           const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
           stop.setAttribute('offset', `${offset}%`);
           stop.setAttribute('stop-color', `rgb(${color.join(',')})`);
           return stop;
       };

       const createGradient = (id, leftRgb, rightRgb, pastelFactor, transitionPercent) => {
           const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
           gradient.setAttribute('id', id);
           gradient.setAttribute('x1', '0%'); gradient.setAttribute('y1', '0%'); // Use percentages
           gradient.setAttribute('x2', '100%'); gradient.setAttribute('y2', '0%'); // Use percentages

           const mixedLeft = this.mixWithWhite(leftRgb, pastelFactor);
           const mixedRight = this.mixWithWhite(rightRgb, pastelFactor);

           const centerPercent = 50;
           // Ensure transition stays within valid bounds and doesn't overlap itself
           const halfTransition = Math.min(24.9, transitionPercent / 2); // Cap half transition near center
           const startTransition = Math.max(0.1, centerPercent - halfTransition); // Avoid 0%
           const endTransition = Math.min(99.9, centerPercent + halfTransition);   // Avoid 100%

           gradient.appendChild(createStop(0, mixedLeft)); // Start color at edge
           if (startTransition > 0) { // Add stop just before transition starts
               gradient.appendChild(createStop(startTransition, mixedLeft));
           }
           if (endTransition < 100) { // Add stop just after transition ends
                gradient.appendChild(createStop(endTransition, mixedRight));
           }
           gradient.appendChild(createStop(100, mixedRight)); // End color at edge

           return gradient;
       };

      this.keysData.forEach((key) => {
          if (!key.isBlack || !key.element || !key.bbox) return; // Need element and bbox

          const leftIdx = (key.keyIndex - 1 + 12) % 12;
          const rightIdx = (key.keyIndex + 1) % 12;
          let leftColor = this.saturatedColors[leftIdx];
          let rightColor = this.saturatedColors[rightIdx];

          if (!leftColor || !rightColor) {
              console.warn(`Missing neighbor colors for black key ${key.midiCode}`);
              leftColor = leftColor || [128, 128, 128]; // Fallback gray
              rightColor = rightColor || [128, 128, 128]; // Fallback gray
          }

          // Calculate transition percentage based on key width if needed, or use fixed pixel value
          const keyPixelWidth = key.bbox.size[0]; // Get width from bounding box
          let transitionPercent = 5; // Default small percentage
          if (keyPixelWidth > 0 && this.settings.gradientTransition > 0) {
               // Convert pixel transition to percentage of key width
               transitionPercent = Math.min(50, (this.settings.gradientTransition / keyPixelWidth) * 100);
           }

          // Active gradient
          key.gradientId = `glowpiano-gradient-active-${key.midiCode}`; // Unique ID
          const activeGradient = createGradient(
              key.gradientId,
              leftColor,
              rightColor,
              this.settings.blackPastelFactor, // Use active factor
              transitionPercent
          );
          this.gradientDefs.appendChild(activeGradient);

          // Semi-active gradient
          key.semiGradientId = `glowpiano-gradient-semi-${key.midiCode}`; // Unique ID
           const semiGradient = createGradient(
               key.semiGradientId,
               leftColor,
               rightColor,
               this.settings.semiActiveBlackPastelFactor, // Use semi-active factor
               transitionPercent // Use same transition width for consistency
           );
          this.gradientDefs.appendChild(semiGradient);
      });
  }
  //------------------ / createBlackKeyGradients

//--------------------- assignKeyColor (Restored from Orig)
  assignKeyColor(key) {
    const colorIdx = key.keyIndex % 12;
    key.saturatedColor = this.saturatedColors[colorIdx]; // null for black keys
    if (!key.isBlack) {
        if (!key.saturatedColor) { // Should not happen for white keys, but safety check
             console.warn("White key missing saturated color:", key.midiCode);
             key.saturatedColor = [128, 128, 128]; // Fallback gray
        }
      key.fillColor = this.mixWithWhite(key.saturatedColor, this.settings.pastelFactor);
      key.borderColor = this.mixWithWhite(key.saturatedColor, this.settings.borderPastelFactor);
    } else {
      key.fillColor = this.settings.darkGray;
      key.borderColor = [0, 0, 0]; // Black keys have black border default
    }
  }
  //------------------ / assignKeyColor

//--------------------- styleStaticKey (Restored from Orig)
  styleStaticKey(key) {
    if (!key.element) return; // Safety check
    if (!key.isBlack) {
      key.element.setAttribute('fill', `rgb(${key.fillColor.join(',')})`);
      key.element.setAttribute('stroke', `rgb(${key.borderColor.join(',')})`);
      key.element.setAttribute('stroke-width', String(this.settings.borderThickness));
    } else {
      key.element.setAttribute('fill', `rgb(${key.fillColor.join(',')})`);
      key.element.setAttribute('stroke', `rgb(${key.borderColor.join(',')})`);
      key.element.setAttribute('stroke-width', String(this.settings.blackBorderThickness));
    }
  }
  //------------------ / styleStaticKey

//--------------------- createGlowElements (Restored from Orig, adapted)
  createGlowElements(key) {
      // Use standard DOM API for reliability
      const factory = (name, attrs = {}) => {
          const el = document.createElementNS('http://www.w3.org/2000/svg', name);
          for (const attrKey in attrs) {
              el.setAttribute(attrKey, attrs[attrKey]);
          }
          // Apply style attribute separately if present
          if (attrs.style) {
              el.style.cssText = attrs.style;
          }
          return el;
      };

      this.removeGlowElements(key); // Ensure no old elements linger

      if (!key.isBlack) {
          if (!key.element || !key.saturatedColor) return; // Need element and color
          const d = key.element.getAttribute('d');
          if (!d) return; // Need path data

          // Active Glow
          key.glowElement = factory('path', {
              d: d, fill: 'none', stroke: `rgb(${key.saturatedColor.join(',')})`,
              'stroke-width': this.settings.whiteGlowThickness,
              'stroke-linejoin': 'round',
              style: `filter: blur(${this.settings.whiteBlurRadius}px); pointer-events: none; opacity: 0;` // Start hidden
          });

          // Semi-Active Glow
          key.semiGlowElement = factory('path', {
              d: d, fill: 'none', stroke: `rgb(${key.saturatedColor.join(',')})`,
              'stroke-width': this.settings.semiActiveWhiteGlowThickness,
              'stroke-linejoin': 'round',
              style: `filter: blur(${this.settings.semiActiveWhiteBlurRadius}px); pointer-events: none; opacity: 0;` // Start hidden
          });
      } else { // Black keys
          if (!key.bbox || !key.bbox.position || !key.bbox.size) return; // Need valid bbox
          const x = key.bbox.position[0]; const y = key.bbox.position[1];
          const width = key.bbox.size[0]; const height = key.bbox.size[1];
          if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
              console.warn("Invalid bbox for black key glow:", key.midiCode, key.bbox);
              return;
          }

          const midX = x + width / 2;
          // Use the larger thickness for path calculation to ensure full coverage
          const maxGlowThickness = Math.max(this.settings.blackGlowThickness, this.settings.semiActiveBlackGlowThickness);
          const extendPx = maxGlowThickness / 2; // Extend below key
          const topY = y;
          const bottomY = y + height + extendPx; // Extend glow below key

          // Define path shapes once
          const leftPath = `M ${midX},${topY} L ${x},${topY} L ${x},${bottomY} L ${midX},${bottomY}`;
          const rightPath = `M ${midX},${topY} L ${x + width},${topY} L ${x + width},${bottomY} L ${midX},${bottomY}`;

          // Neighbor colors
          const leftIdx = (key.keyIndex - 1 + 12) % 12;
          const rightIdx = (key.keyIndex + 1) % 12;
          const leftColor = this.saturatedColors[leftIdx] || [128, 128, 128]; // Fallback gray
          const rightColor = this.saturatedColors[rightIdx] || [128, 128, 128]; // Fallback gray
          const leftColorStr = `rgb(${leftColor.join(',')})`;
          const rightColorStr = `rgb(${rightColor.join(',')})`;

          // Active Glows
          key.leftGlow = factory('path', {
              d: leftPath, fill: 'none', stroke: leftColorStr,
              'stroke-width': this.settings.blackGlowThickness, 'stroke-linejoin': 'round',
              style: `filter: blur(${this.settings.blackBlurRadius}px); pointer-events: none; opacity: 0;` // Start hidden
          });
          key.rightGlow = factory('path', {
              d: rightPath, fill: 'none', stroke: rightColorStr,
              'stroke-width': this.settings.blackGlowThickness, 'stroke-linejoin': 'round',
              style: `filter: blur(${this.settings.blackBlurRadius}px); pointer-events: none; opacity: 0;` // Start hidden
          });

          // Semi-Active Glows
          key.semiLeftGlow = factory('path', {
              d: leftPath, fill: 'none', stroke: leftColorStr,
              'stroke-width': this.settings.semiActiveBlackGlowThickness, 'stroke-linejoin': 'round',
              style: `filter: blur(${this.settings.semiActiveBlackBlurRadius}px); pointer-events: none; opacity: 0;` // Start hidden
          });
          key.semiRightGlow = factory('path', {
              d: rightPath, fill: 'none', stroke: rightColorStr,
              'stroke-width': this.settings.semiActiveBlackGlowThickness, 'stroke-linejoin': 'round',
              style: `filter: blur(${this.settings.semiActiveBlackBlurRadius}px); pointer-events: none; opacity: 0;` // Start hidden
          });
      }
  }
  //------------------ / createGlowElements

//--------------------- updateKeyAppearance (Restored from Orig, adapted for state flags and element handling)
  updateKeyAppearance(key) {
      if (!key.element) {
          // console.warn("updateKeyAppearance called on key without element:", key.midiCode);
          return; // Cannot update if element doesn't exist
      }

      // --- Glow Element Management ---
      // Helper to add/remove glow SVGs, ensuring they are appended for correct layering
      const manageGlow = (key, type, show) => {
           const elements = type === 'active'
              ? (key.isBlack ? [key.leftGlow, key.rightGlow] : [key.glowElement])
              : (key.isBlack ? [key.semiLeftGlow, key.semiRightGlow] : [key.semiGlowElement]);

           elements.forEach(el => {
                if (!el) return; // Element might not have been created if data was bad
                if (show) {
                    // Append if not already in DOM, ensures it's added last (on top)
                    if (!el.parentNode) {
                         // Insert *after* the base piano keys group if possible, or just append
                         // Finding the right insertion point is complex; appending is usually sufficient visually.
                         this.svg.appendChild(el);
                    }
                    el.style.opacity = '1'; // Make visible
                } else {
                    // Only hide, don't remove, for performance unless explicitly needed
                    el.style.opacity = '0';
                    // Optional: Remove from DOM if preferred
                    // if (el.parentNode) {
                    //     el.parentNode.removeChild(el);
                    // }
                }
           });
      };

      // --- Determine State and Apply Styles ---
      let fill = '';
      let stroke = '';
      let strokeWidth = '';
      let showActiveGlow = false;
      let showSemiGlow = false;

      if (!key.isBlack) {
          // --- White Keys ---
          strokeWidth = String(this.settings.borderThickness);
          if (!key.saturatedColor) key.saturatedColor = [128, 128, 128]; // Safety fallback

          if (key.isActive) {
              const activeFillColor = this.mixWithWhite(key.saturatedColor, this.settings.activePastelFactor);
              fill = `rgb(${activeFillColor.join(',')})`;
              stroke = fill; // Stroke matches fill when active
              showActiveGlow = true;
          } else if (key.isSemiActive) {
              const semiFillColor = this.mixWithWhite(key.saturatedColor, this.settings.semiActivePastelFactor);
              fill = `rgb(${semiFillColor.join(',')})`;
              stroke = fill; // Stroke matches fill when semi-active
              showSemiGlow = true;
          } else if (key.isInactive) {
              fill = `rgb(${this.settings.inactiveWhiteFillColor.join(',')})`;
              stroke = `rgb(${this.settings.inactiveBorderColor.join(',')})`;
          } else { // Default static state
              fill = `rgb(${key.fillColor.join(',')})`; // Pre-calculated pastel color
              stroke = `rgb(${key.borderColor.join(',')})`; // Pre-calculated border color
          }
      } else {
          // --- Black Keys ---
          strokeWidth = String(this.settings.blackBorderThickness);

          // Calculate stroke color based on neighbors only needed for active/semi-active states that use it
          const calculateMixedStroke = (pastelFactor) => {
              const leftIdx = (key.keyIndex - 1 + 12) % 12;
              const rightIdx = (key.keyIndex + 1) % 12;
              const leftColor = this.saturatedColors[leftIdx] || [128, 128, 128];
              const rightColor = this.saturatedColors[rightIdx] || [128, 128, 128];
              // Average the pastel versions of neighbors
              const mixedLeft = this.mixWithWhite(leftColor, pastelFactor);
              const mixedRight = this.mixWithWhite(rightColor, pastelFactor);
              return mixedLeft.map((c, i) => Math.round((c + mixedRight[i]) / 2));
          };

          if (key.isActive) {
              fill = key.gradientId ? `url(#${key.gradientId})` : `rgb(${this.settings.darkGray.join(',')})`; // Fallback if gradient failed
              // Orig version derived stroke from averaged pastel neighbors
              const strokeColorRgb = calculateMixedStroke(this.settings.blackPastelFactor);
              stroke = `rgb(${strokeColorRgb.join(',')})`;
              showActiveGlow = true;
          } else if (key.isSemiActive) {
              fill = key.semiGradientId ? `url(#${key.semiGradientId})` : `rgb(${this.settings.darkGray.join(',')})`;
              const strokeColorRgb = calculateMixedStroke(this.settings.semiActiveBlackPastelFactor);
              stroke = `rgb(${strokeColorRgb.join(',')})`;
              showSemiGlow = true;
          } else if (key.isInactive) {
              fill = `rgb(${this.settings.inactiveBlackFillColor.join(',')})`;
              stroke = `rgb(${this.settings.inactiveBorderColor.join(',')})`;
          } else { // Default static state
              fill = `rgb(${key.fillColor.join(',')})`; // fillColor is darkGray
              stroke = `rgb(${key.borderColor.join(',')})`; // borderColor is black
          }
      }

      // Apply base key styles
      key.element.setAttribute('fill', fill);
      key.element.setAttribute('stroke', stroke);
      key.element.setAttribute('stroke-width', strokeWidth);

      // Manage glow visibility
      manageGlow(key, 'active', showActiveGlow);
      manageGlow(key, 'semi', showSemiGlow);

  } //------------------ / updateKeyAppearance

//--------------------- mixWithWhite (Restored from Orig)
  mixWithWhite(color, factor) {
      // Ensure color is a valid array
      if (!Array.isArray(color) || color.length < 3) {
          console.warn("Invalid color passed to mixWithWhite:", color);
          return [255, 255, 255]; // Return white as fallback
      }
      // Clamp factor to avoid unexpected results
      const clampedFactor = Math.max(0, Math.min(1, factor));
      return color.map(c => Math.round(c + (255 - c) * clampedFactor));
  }
  //------------------ / mixWithWhite

// --- Utility ---

  getKeysData() {
    return this.keysData;
  }

// Helper to find key data from a DOM element (useful for touchmove)
  // Updated to primarily use 'data-midi' which is now on hitboxes (black) or visual elements (white)
  getKeyDataFromElement(element) {
      if (!element) return null;
      // `closest` searches the element itself and its ancestors.
      // It should find the hitbox first if dragging over a black key's area,
      // or the visual element for a white key.
      const keyElement = element.closest('[data-midi]');
      if (!keyElement || !keyElement.dataset || !keyElement.dataset.midi) {
         // If no element with data-midi is found traversing up, it's not a key interaction element.
         return null;
      }

      const midi = parseInt(keyElement.dataset.midi, 10);
      if (isNaN(midi)) return null;

      // Find the corresponding key data object using the robust method
      return this.basePiano.getKeyByMidi(midi);
  }

destroy() {
      console.log("Destroying GlowPiano instance...");
      // Remove global listeners
      if (this.globalTouchMoveHandler) {
          this.svg.removeEventListener('touchmove', this.globalTouchMoveHandler);
          this.globalTouchMoveHandler = null;
      }
      if (this.globalTouchEndHandler) {
          window.removeEventListener('touchend', this.globalTouchEndHandler);
          window.removeEventListener('touchcancel', this.globalTouchEndHandler);
          this.globalTouchEndHandler = null;
      }
      if (this.globalMouseUpHandler) {
          window.removeEventListener('mouseup', this.globalMouseUpHandler);
          this.globalMouseUpHandler = null;
      }

      // Remove key-specific listeners and clear handlers/elements
      this.keysData.forEach(key => {
           // Determine the element that *should* have had listeners
           const targetElement = key.isBlack && key.hitboxElement ? key.hitboxElement : key.element;

           if (targetElement) {
               // Use the stored handler reference on the key object to remove
               if (key.mousedownHandler) {
                   targetElement.removeEventListener('mousedown', key.mousedownHandler);
               }
               if (key.touchstartHandler) {
                   targetElement.removeEventListener('touchstart', key.touchstartHandler, { passive: false });
               }
           } else {
               // If targetElement is somehow gone, try removing from visual element just in case
               if (key.element) {
                   if (key.mousedownHandler) key.element.removeEventListener('mousedown', key.mousedownHandler);
                   if (key.touchstartHandler) key.element.removeEventListener('touchstart', key.touchstartHandler, { passive: false });
               }
           }

           // Clear handler references from key data
           delete key.mousedownHandler;
           delete key.touchstartHandler;

           // Remove glow elements AND hitbox element from DOM and clear references
           this.removeInteractionElements(key); // This now handles hitboxes too
      });

      // Clear active notes timeouts and state maps
      this.activeNotes.forEach(note => {
           clearTimeout(note.timeoutId);
      });
      this.activeNotes.clear();
      this.touchStates.clear();

      // Optional: Clear gradients from defs
      if (this.gradientDefs) {
           // this.gradientDefs.innerHTML = ''; // Consider selective removal if multiple pianos share SVG
      }

      console.log("GlowPiano listeners, timers, and elements should be cleaned up.");
  }


  

  
} // End of GlowPiano class

// Ensure makeElement or equivalent functionality is available if GraphicPiano relies on it.
// The refactored GlowPiano prefers standard DOM API (createElementNS) for reliability.

// --- END OF FILE GlowPiano.js ---
