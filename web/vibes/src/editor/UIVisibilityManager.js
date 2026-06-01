// phase2-managed-migration: internal imports/exports stripped
class UIVisibilityManager {
  
  constructor(app) {
    this.app = app;
    this.listeners = new Set();
    this.registeredElements = new Map();
    this.isTicking = false;
    this._hasSetupGlobalListeners = false;

    this._boundNotify = () => {
      this.notify();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this._boundNotify, { passive: true });
    }
  }

  _setupGlobalListeners() {
    if (this._hasSetupGlobalListeners) {
      return;
    }

    this._hasSetupGlobalListeners = true;

    if (!this._boundNotify) {
      this._boundNotify = () => {
        this.notify();
      };
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this._boundNotify, { passive: true });
      window.addEventListener('scroll', this._boundNotify, { passive: true });
    }

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.notify();
      });
    }
  }

  register(element, callback) {
    if (!this.registeredElements) {
      this.registeredElements = new Map();
    }

    if (!element || typeof callback !== 'function') {
      console.error(
        'UIVisibilityManager: Registration failed. Invalid element or callback.'
      );
      return false;
    }

    this.registeredElements.set(element, callback);

    if (this.resizeObserver && typeof Element !== 'undefined' && element instanceof Element) {
      try {
        this.resizeObserver.observe(element);
      } catch (error) {}
    }

    return true;
  }

  unregister(element) {
    if (!this.registeredElements) {
      this.registeredElements = new Map();
      return false;
    }

    if (this.resizeObserver && typeof Element !== 'undefined' && element instanceof Element) {
      try {
        this.resizeObserver.unobserve(element);
      } catch (error) {}
    }

    return this.registeredElements.delete(element);
  }

  _notifySubscribers() {
    if (!this.listeners) {
      this.listeners = new Set();
    }

    if (!this.registeredElements) {
      this.registeredElements = new Map();
    }

    for (const callback of Array.from(this.listeners)) {
      if (typeof callback !== 'function') {
        this.listeners.delete(callback);
        continue;
      }

      try {
        callback();
      } catch (error) {
        console.error('Error in UIVisibilityManager listener callback', error);
      }
    }

    for (const [element, callback] of Array.from(this.registeredElements.entries())) {
      if (!element || !element.isConnected) {
        this.unregister(element);
        continue;
      }

      if (typeof callback !== 'function') {
        this.unregister(element);
        continue;
      }

      try {
        callback(element);
      } catch (error) {
        console.error('Error in UIVisibilityManager element callback', error);
      }
    }
  }

  subscribe(callback) {
    if (!this.listeners) {
      this.listeners = new Set();
    }

    if (typeof callback !== 'function') {
      console.warn(
        'UIVisibilityManager: Subscription ignored. Invalid callback.',
        callback
      );
      return () => false;
    }

    this.listeners.add(callback);

    return () => {
      return this.unsubscribe(callback);
    };
  }

  unsubscribe(callback) {
    if (!this.listeners) {
      this.listeners = new Set();
      return false;
    }

    return this.listeners.delete(callback);
  }

  notify() {
    if (this.isTicking) {
      return;
    }

    this.isTicking = true;

    const run = () => {
      this.isTicking = false;
      this._notifySubscribers();
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(run);
    } else {
      setTimeout(run, 0);
    }
  }

    static _doc_UIVisibilityManager() {
      return `# UIVisibilityManager

## Summary

UIVisibilityManager is a high-performance debounce engine for layout recalibrations. Throughout the Vibes editor, elements like \`GlowBox\` and \`GlowingTooltip\` rely on exact bounding-box pixel coordinates to attach themselves to UI buttons. If the window resizes, or the user scrolls the file tree, those coordinates become instantly invalid. This class broadcasts a single, optimized notification when things move.

The philosophy is avoiding layout thrashing. Attaching dozens of independent scroll and resize event listeners that all call \`getBoundingClientRect()\` simultaneously will cripple browser performance. By funneling all environmental movement into one manager, UI updates are throttled to the display refresh rate.`;
    }


  static _doc_overview() {
      return `# UIVisibilityManager

The \`UIVisibilityManager\` is a high-performance event coordinator that throttles and debounces layout recalculations.
It prevents layout thrashing by funneling multiple resize, scroll, and animation events into a single managed frame update.`;
    }

  static _doc_debouncing() {
      return `## AnimationFrame Synchronization

- **AnimationFrame Debouncing**: When notified of a scroll or resize, the manager defers updates to \`window.requestAnimationFrame\`. It locks further calls until the update is painted, keeping UI transitions butter-smooth.
- **Orphan Cleanup**: Checks registered DOM elements before dispatching. If an element is no longer connected to the document, it is automatically unsubscribed, preventing memory leaks.`;
    }

  static _doc() {
      return [
        this._doc_overview(),
        this._doc_debouncing()
      ].join('\n\n');
    }

  
}

