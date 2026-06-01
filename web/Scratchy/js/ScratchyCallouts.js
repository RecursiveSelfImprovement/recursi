
class ScratchyCallouts {
  constructor(app) {
    this._app = app;
    this._activeCallout = null;
    this._calloutInstances = {};
  }

  getDefaultCalloutConfig() {
    return {
      open: {
        title: '📂 Open File',
        body: 'Load your Scratch project (.sb3 file). You can also drag-drop it anywhere on the page. Once loaded, you can add extra images and sounds by dropping them in too.',
        fillColor: 'var(--callout-open-bg)',
        borderColor: 'var(--callout-open-border)',
      },
      buildprompt: {
        title: '🎙️ Build Prompt',
        body: 'This is where you tell the AI what you want!\n\nType or dictate your request, then it bundles everything the AI needs — your instructions, your project code, and your message — into one clipboard-ready prompt.\n\nFirst time? Leave all checkboxes on.\nIterating? It auto-unchecks what the AI already has.',
        fillColor: 'var(--callout-prompt-bg)',
        borderColor: 'var(--callout-prompt-border)',
      },
      paste: {
        title: '📋 Paste from LLM',
        body: "After the AI sends back changes, click this button. It reads your clipboard, finds the patch data in the AI's response, and applies the changes to your project automatically.\n\nYou'll see a log of exactly what changed.",
        fillColor: 'var(--callout-paste-bg)',
        borderColor: 'var(--callout-paste-border)',
      },
      save: {
        title: '💾 Save .sb3',
        body: 'Downloads your modified project as an .sb3 file. You can open it directly in Scratch, or drag it back into Scratchy later to keep working on it.',
        fillColor: 'var(--callout-save-bg)',
        borderColor: 'var(--callout-save-border)',
      },
      viewer: {
        title: '📺 Viewer',
        body: 'Opens a built-in Scratch player so you can test your project right here without leaving Scratchy. Press the green flag to run it!\n\nGreat for quick testing between AI edits.',
        fillColor: 'var(--callout-viewer-bg)',
        borderColor: 'var(--callout-viewer-border)',
      },
    };
  }

  createOverlay() {
    const app = this._app;
    app.calloutOverlay = makeElement('div', {
      className: 'scratchy-callout-overlay',
      style: {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: '50',
      },
    });
    return app.calloutOverlay;
  }

  showCallout(buttonKey) {
    this.hideCallout();
    const app = this._app;

    const btnEl = app.buttonElements[buttonKey];
    if (!btnEl) return;

    const info = app.buttonCallouts[buttonKey];
    if (!info) return;

    const callout = new CalloutArrow({
      settings: {
        boxWidth: 405,
        boxHeight: 170,
        cornerRadius: 14,
        arrowHeadWidth: 60,
        arrowHeadHeight: 28,
        arrowShaftWidth: 20,
        arrowShaftHeight: 35,
        arrowPositionPct: 50,
        paddingTop: 18,
        paddingRight: 19,
        paddingBottom: 18,
        paddingLeft: 32,
        fillColor: info.fillColor,
        fillOpacity: 0.95,
        borderColor: info.borderColor,
        borderWidth: 5,
        borderOpacity: 1.0,
        titleText: info.title,
        bodyText: info.body,
        titleFontSize: 22,
        bodyFontSize: 19,
        titleColor: 'var(--text-main)',
        bodyColor: 'var(--text-main)',
        fontFamily: 'var(--font-main)',
        shadowBlur: 12,
        shadowOpacity: 0.5,
        offsetX: 0,
        offsetY: 4,
      },
    });

    const el = callout.render();
    el.style.position = 'absolute';
    el.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateY(-8px)';

    const btnRect = btnEl.getBoundingClientRect();
    const calloutWidth =
      callout.settings.boxWidth + callout.settings.borderWidth * 2;
    const left = btnRect.left + btnRect.width / 2 - calloutWidth / 2;
    const top = btnRect.bottom + 4;
    const clampedLeft = Math.max(
      8,
      Math.min(left, window.innerWidth - calloutWidth - 8)
    );
    el.style.left = clampedLeft + 'px';
    el.style.top = top + 'px';

    app.calloutOverlay.appendChild(el);

    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });

    this._activeCallout = { element: el, callout: callout };
  }

  hideCallout() {
    if (!this._activeCallout) return;
    const el = this._activeCallout.element;
    el.style.opacity = '0';
    el.style.transform = 'translateY(-8px)';
    setTimeout(() => {
      if (el.parentNode) el.remove();
    }, 200);
    this._activeCallout = null;
  }

  openCalloutTuner() {
    const tuner = new CalloutArrow({
      settings: {
        titleText: 'Sample Button',
        bodyText:
          'Adjust sliders to tune the callout look. Dump JSON when done.',
      },
    });
    tuner.openTuningDialog();
  }
}

