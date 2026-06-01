class VideoEventScheduler {

    static init(handlers) {
    this.ves_state(); // Initialize state and dynamic properties
    this.stopAndClearQueue(); // Always clear old state on init
    
    if (!handlers || (typeof handlers !== 'object' && typeof handlers !== 'function')) {
      console.error('VideoEventScheduler: Invalid handlers object provided during init. Must be an object or class.');
      this.eventHandlerRegistry = {};
    } else {
      this.eventHandlerRegistry = handlers;
    }
    this.isInitialized = true;
  }

  static registerHandler(eventType, handlerFn) {
    if (typeof handlerFn !== 'function') {
      console.error(
        `VideoEventScheduler: Handler for "${eventType}" must be a function.`
      );
      return;
    }
    // console.log(`VideoEventScheduler: Registering handler for "${eventType}"`);
    this.eventHandlerRegistry[eventType] = handlerFn;
    if (!this.isInitialized) {
      console.warn(
        'VideoEventScheduler: registerHandler called before init(). Forcing init state.'
      );
      this.isInitialized = true; // Mark as initialized if handler registered before explicit init
    }
  }

  static scheduleEvents(events, currentTime, playbackRate) {
    if (!this.isInitialized) return;
    playbackRate = playbackRate || 1.0;

    const enabled = window.arpEnabled || false;
    const spread = window.arpGlobalSpread || 0;
    const lenFactor = window.arpGlobalLenFactor || 1.0;
    const anchor = window.arpAnchor || 0; // 0=start, 0.5=mid, 1=end
    const pattern = window.arpPattern || [0, 1, 2];

    events.forEach((event) => {
      if (!event || event.t == null || !event.type) return;

      const eventId = event._eventId || `sch_evt_${this.lastEventIdCounter++}`;
      event._eventId = eventId;

      if (this.eventQueue[eventId]) return;

      let finalT = event.t;
      let finalD = event.d || 500;

      // Apply Smart Arpeggio ONLY if:
      // 1. Arp is enabled
      // 2. Note is explicitly on Track 1 (Bass)
      // 3. Note is marked as a chord member
      if (enabled && event.tr === 1 && event.chordRank !== undefined) {
        // Scale duration for ALL members of the chord uniformly
        finalD = finalD * lenFactor;

        // Determine which step in the pattern this note is
        let stepIndex = pattern.indexOf(event.chordRank);

        // If the chord has more notes than the pattern (e.g., 4 notes, 3 steps),
        // wrap the extra notes back around so they stack musically and don't get orphaned.
        if (stepIndex === -1 && pattern.length > 0) {
          stepIndex = event.chordRank % pattern.length;
        }

        if (stepIndex !== -1) {
          // Calculate raw arpeggio offset
          const rawOffset = stepIndex * spread;

          // Apply Anchor shift
          const totalArpTime = (pattern.length - 1) * spread;
          const anchorShift = -(anchor * totalArpTime);

          finalT = event.t + rawOffset + anchorShift;
        }
      }

      const targetTimeSec = finalT / 1000.0;
      const timeUntilEventSec = targetTimeSec - currentTime;
      const onDelayMs = (timeUntilEventSec / playbackRate) * 1000.0;

      if (onDelayMs < -3000) return;

      const effectiveOnDelay = Math.max(0, onDelayMs);
      const timerOn = setTimeout(
        () => this.triggerEvent(event),
        effectiveOnDelay
      );
      const timerOff = setTimeout(() => {
        this.triggerOffEvent(event);
        delete this.eventQueue[eventId];
      }, effectiveOnDelay + finalD / playbackRate);

      this.eventQueue[eventId] = {timerOn, timerOff, event};
    });
  }

  static triggerEvent(event) {
    if (!event || !event.type) return;

    const handler = this.eventHandlerRegistry[event.type];
    if (handler) {
      try {
        handler(event);
      } catch (e) {
        console.error(
          `VideoEventScheduler: Error executing 'on' handler for event type "${event.type}":`,
          e,
          event
        );
      }
    } else {
      // A generic 'event_off' handler might exist for types that don't have a specific off handler
      const genericOffHandler = this.eventHandlerRegistry['event_off'];
      if (genericOffHandler) {
        genericOffHandler(event);
      } else {
        console.warn(
          `VideoEventScheduler: No handler registered for event type "${event.type}"`,
          event
        );
      }
    }
  }

  static stopAndClearQueue() {
    if (Object.keys(this.eventQueue).length === 0) return;

    for (const eventId in this.eventQueue) {
      const entry = this.eventQueue[eventId];
      if (entry) {
        if (entry.timerOn) {
          clearTimeout(entry.timerOn);
        }
        if (entry.timerOff) {
          clearTimeout(entry.timerOff);

          if (entry.event) {
            try {
              this.triggerOffEvent(entry.event);
            } catch (e) {}
          }
        }
      }
    }
    this.eventQueue = {};
  }

  static triggerOffEvent(event) {
    if (!event || !event.type) return;

    const offEventType = `${event.type}_off`;
    const handler = this.eventHandlerRegistry[offEventType];

    if (handler) {
      try {
        handler(event);
      } catch (e) {
        console.error(
          `VideoEventScheduler: Error executing 'off' handler for event type "${offEventType}":`,
          e,
          event
        );
      }
    } else {
      // Fallback to a generic handler if a specific one (e.g., 'note_off') isn't found.
      // This is useful for events that might not have a specific 'off' implementation.
      const genericOffHandler = this.eventHandlerRegistry['event_off'];
      if (genericOffHandler) {
        try {
          genericOffHandler(event);
        } catch (e) {
          console.error(
            `VideoEventScheduler: Error executing generic 'event_off' handler:`,
            e,
            event
          );
        }
      }
      // No warning is issued, as many event types are instantaneous and don't require an 'off' action.
    }
  }

  

  static state() {
    if (!this._state) {
      this._state = {
        eventQueue: {},
        eventHandlerRegistry: {},
        lastEventIdCounter: 0,
        isInitialized: false
      };
    }
    return this._state;
  }

  static ves_state() {
    if (!this._state) {
      this._state = {
        eventQueue: {},
        eventHandlerRegistry: {},
        lastEventIdCounter: 0,
        isInitialized: false
      };
      
      // Define properties dynamically to completely bypass AST getter/setter conflicts
      Object.defineProperties(this, {
        eventQueue: { get: () => this._state.eventQueue, set: v => this._state.eventQueue = v, configurable: true },
        eventHandlerRegistry: { get: () => this._state.eventHandlerRegistry, set: v => this._state.eventHandlerRegistry = v, configurable: true },
        lastEventIdCounter: { get: () => this._state.lastEventIdCounter, set: v => this._state.lastEventIdCounter = v, configurable: true },
        isInitialized: { get: () => this._state.isInitialized, set: v => this._state.isInitialized = v, configurable: true }
      });
    }
    return this._state;
  }
} // End class VideoEventScheduler

