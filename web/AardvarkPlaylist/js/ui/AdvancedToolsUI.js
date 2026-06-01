
class AdvancedToolsUI {
  
  constructor(player) {
    this.player = player;
    this.dialog = null;
    this.editorDialog = null;
    this._injectStyles();
  }

  _injectStyles() {
    const css = `
      .adv-tools-container {
        display: flex;
        flex-direction: column;
        gap: 15px;
        padding: 10px;
        color: #ddd;
      }
      .adv-drop-zone {
        border: 2px dashed #4a90e2;
        border-radius: 8px;
        padding: 30px;
        text-align: center;
        background: rgba(74, 144, 226, 0.05);
        transition: all 0.2s ease;
        cursor: pointer;
      }
      .adv-drop-zone:hover, .adv-drop-zone.drag-hover {
        background: rgba(74, 144, 226, 0.15);
        border-color: #7bb8ff;
      }
      .adv-drop-icon {
        font-size: 32px;
        margin-bottom: 10px;
        pointer-events: none;
      }
      .adv-drop-text {
        font-size: 14px;
        font-weight: 500;
        pointer-events: none;
      }
      .adv-btn-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .adv-btn {
        background: #2a2a2a;
        border: 1px solid #444;
        color: #eee;
        padding: 10px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: background 0.2s, transform 0.1s;
      }
      .adv-btn:hover {
        background: #3a3a3a;
        border-color: #555;
      }
      .adv-btn:active {
        transform: scale(0.98);
      }
      .adv-btn.primary {
        background: #005f9e;
        border-color: #007acc;
      }
      .adv-btn.primary:hover {
        background: #007acc;
      }
      .adv-editor-textarea {
        width: 100%;
        height: 100%;
        min-height: 300px;
        background: #1e1e1e;
        color: #d4d4d4;
        border: 1px solid #444;
        border-radius: 4px;
        padding: 10px;
        font-family: 'Consolas', 'Monaco', monospace;
        font-size: 12px;
        line-height: 1.5;
        resize: none;
        box-sizing: border-box;
        white-space: pre;
        overflow-wrap: normal;
        overflow-x: auto;
      }
      .adv-editor-textarea:focus {
        outline: none;
        border-color: #4a90e2;
      }
    `;
    if (typeof applyCss !== 'undefined') applyCss(css, 'advanced-tools-styles');
  }

  open() {
    if (this.dialog) {
      this.dialog.setZOnTop();
      return;
    }
    this.buildDialog();
  }

  handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.applyVEQText(e.target.result);
    };
    reader.readAsText(file);
  }

  generateVEQText() {
    if (!window.VideoEventQueueClass) return '';
    const veq = window.VideoEventQueueClass.current;
    if (!veq || !veq.timedEvents) return '';
    const transposeOffset = this.player?.gt?.transposeOffset || 0;
    return window.VideoEventQueueClass.serialize(transposeOffset);
  }

  applyVEQText(text) {
    let VEQ = window.VideoEventQueueClass;
    if (!VEQ && typeof VideoEventQueue !== "undefined") {
      VideoEventQueue.expose();
      VEQ = window.VideoEventQueueClass;
    }
    if (!VEQ) {
      this.player.setStatus?.("Piano roll system not ready.", "#f55");
      return;
    }

    if (!text || typeof text !== "string" || !text.trim()) {
      this.player.setStatus?.("Clipboard/input is empty.", "#fa0");
      return;
    }

    try {
      const parsed = VEQ.parse(text);

      if (!parsed || !Array.isArray(parsed.timedEvents) || parsed.timedEvents.length === 0) {
        this.player.setStatus?.(
          "No valid piano roll data found. See console.",
          "#fa0"
        );
        return;
      }

      VEQ.load(parsed);

      if (!this.player.gt) {
        this.player.setStatus?.(
          "Piano roll loaded. Start a video to see it.",
          "#fa0"
        );
        return;
      }

      this.player.gt.originalVeqData = parsed;
      this.player.gt.fileTranspose = parsed.metadata?.transpose || 0;
      this.player.gt.userTranspose = 0;
      this.player.gt.transposeOffset = 0;

      if (this.player.gt.instruments) {
        this.player.gt.instruments.stopAllNotes();
        this.player.gt.instruments.setTranspose(0);
      }

      if (this.player.gt.pianoVisuals) {
        this.player.gt.pianoVisuals.updateLayout();
        this.player.gt.pianoVisuals.loadVeq(parsed);
        this.player.gt.pianoVisuals.show();
      }

      if (this.player.gt.karaokeDisplay) {
        this.player.gt.karaokeDisplay.loadVeq(parsed);
      }

      if (this.player.gt.synchronizer) {
        this.player.gt.synchronizer.loadVEQ(parsed);
      }

      if (this.player.currentPlayItem) {
        this.player.currentPlayItem.hasPianoRoll = true;
        this.player._saveState?.();
        this.player.playlistManager?.renderItems?.();
      }

      if (
        this.player.gt.instruments &&
        this.player.gt.instruments.tracks &&
        !this.player.gt.instruments.tracks[1]
      ) {
        const t0 = this.player.gt.instruments.tracks[0] || {
          instrument: "Piano",
          volume: 5.0,
          octaveShift: 0,
        };
        this.player.gt.instruments.tracks[1] = {
          instrument: t0.instrument,
          volume: t0.volume,
          octaveShift: t0.octaveShift,
        };
      }

      const currentStyle = this.player.state.settings.keyboardStyle;
      if (!currentStyle || currentStyle === "none") {
        this.player.setDisplayMode?.("2d");
      } else {
        this.player._applyDisplayModeAfterLoad?.(currentStyle);
      }

      if (this.player.headerControlsUI) {
        this.player.headerControlsUI.build();
      }

      this.player._refreshVisuals?.();

      try {
        const vp = this.player.gt.videoPlayer;
        if (vp && vp.isReady) {
          const nowMs = (vp.getAccurateTime?.().time ?? 0) * 1000;
          this.player.gt.pianoVisuals?.setTime?.(nowMs, 0, true);
          if (this.player.gt.pianoVisuals?.forceRefreshFlyingBars) {
            this.player.gt.pianoVisuals.forceRefreshFlyingBars(nowMs);
          }
        }
      } catch (e) {}

      if (this.player.gt.synchronizer) {
        this.player.gt.synchronizer.resyncScheduler();
      }

      this.player.setStatus?.(
        `Loaded ${parsed.timedEvents.length} events from pasted piano roll.`,
        "#4f4"
      );
    } catch (e) {
      this.player.setStatus?.(
        "Error parsing piano roll data: " + e.message,
        "#f55"
      );
    }
  }

  async copyToClipboard() {
    const text = this.generateVEQText();
    if (!text) {
      this.player.setStatus('Nothing to copy.', '#fa0');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      this.player.setStatus('Piano roll copied to clipboard.', '#4f4');
    } catch (err) {
      console.error('Failed to copy: ', err);
      this.player.setStatus('Clipboard copy failed.', '#f55');
    }
  }

  async pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        this.applyVEQText(text);
      } else {
        this.player.setStatus('Clipboard is empty.', '#fa0');
      }
    } catch (err) {
      console.error('Failed to paste: ', err);
      this.player.setStatus('Clipboard paste failed.', '#f55');
    }
  }

  exportFile() {
    const text = this.generateVEQText();
    if (!text) {
      this.player.setStatus('Nothing to export.', '#fa0');
      return;
    }
    const filename =
      window.VideoEventQueueClass?.getExportFilename?.() || 'pianoroll.txt';
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = makeElement('a', {
      href: url,
      download: filename,
      style: 'display:none',
    });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 100);
  }

  openTextEditor() {
      if (this.editorDialog) {
        this.editorDialog.setZOnTop();
        return;
      }
  
      const textarea = makeElement('textarea', {
        className: 'adv-editor-textarea',
        value: this.generateVEQText(),
        spellcheck: false,
      });
  
      textarea.onkeydown = (e) => e.stopPropagation();
  
      this.editorDialog = UITools.makeDialog({
        env: this.player.env, // Bind to player environment
        title: 'Raw Piano Roll Editor',
        content: textarea,
        width: '600px',
        height: '500px',
        appendTo: this.player.rootElement,
        buttons: [
          {
            label: 'Apply',
            className: 'primary',
            onClick: () => {
              this.applyVEQText(textarea.value);
              return false;
            },
          },
          {
            label: 'Apply & Close',
            className: 'primary',
            onClick: () => {
              this.applyVEQText(textarea.value);
            },
          },
          {
            label: 'Cancel',
          },
        ],
        onClose: () => {
          this.editorDialog = null;
        },
      });
    }

  async savePianoRollToFolder() {
    if (!window.VideoEventQueueClass) return;
    const veq = window.VideoEventQueueClass.current;
    if (!veq || !veq.timedEvents || veq.timedEvents.length === 0) {
      this.player.setStatus("No piano roll to save.", "#fa0");
      return;
    }

    const transposeOffset = this.player?.gt?.transposeOffset || 0;
    const text = window.VideoEventQueueClass.serialize(transposeOffset);

    let baseName = "";
    const item = this.player.currentPlayItem;
    if (item && item.id) {
      baseName = String(item.id).replace(/[^a-zA-Z0-9]/g, "");
    }
    if (!baseName && veq.videoId) {
      baseName = String(veq.videoId).replace(/[^a-zA-Z0-9]/g, "");
    }
    if (!baseName && veq.metadata?.name) {
      baseName = String(veq.metadata.name)
        .replace(/[^a-zA-Z0-9 _-]/g, "")
        .trim()
        .replace(/\s+/g, "_");
    }
    if (!baseName) baseName = "pianoroll_" + Date.now();
    const filename = baseName + ".txt";

    if (window.showDirectoryPicker) {
      try {
        if (!window._pianorollFolderHandle) {
          this.player.setStatus(
            "Pick your pianorolls folder (once per session)...",
            "#4a90e2"
          );
          window._pianorollFolderHandle = await window.showDirectoryPicker({
            mode: "readwrite",
          });
        }
        const dirHandle = window._pianorollFolderHandle;

        const perm = await dirHandle.queryPermission({ mode: "readwrite" });
        if (perm !== "granted") {
          const req = await dirHandle.requestPermission({ mode: "readwrite" });
          if (req !== "granted") {
            throw new Error("Permission denied for folder.");
          }
        }

        const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(text);
        await writable.close();

        this.player.setStatus(`Saved ${filename} to pianorolls folder.`, "#4f4");
        return;
      } catch (e) {
        window._pianorollFolderHandle = null;
        console.warn("[AdvancedToolsUI] Folder save failed, falling back:", e);
      }
    }

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.player.setStatus(
      `Downloaded ${filename} (browser does not support folder save).`,
      "#fa0"
    );
  }

  buildDialog() {
      if (this.dialog) {
        this.dialog.close?.();
        this.dialog = null;
      }
  
      const container = makeElement("div", { className: "adv-tools-container" });
  
      const dropZone = makeElement("div", { className: "adv-drop-zone" }, [
        makeElement("div", { className: "adv-drop-icon" }, "📥"),
        makeElement(
          "div",
          { className: "adv-drop-text" },
          "Drag & Drop a Piano Roll (.txt) Here"
        ),
        makeElement(
          "div",
          { style: "font-size:11px; color:#888; margin-top:5px;" },
          "(or click to browse)"
        ),
      ]);
  
      const fileInput = makeElement("input", {
        type: "file",
        accept: ".txt",
        style: "display:none",
      });
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) this.handleFile(file);
      };
  
      dropZone.onclick = () => fileInput.click();
      dropZone.ondragover = (e) => {
        e.preventDefault();
        dropZone.classList.add("drag-hover");
      };
      dropZone.ondragleave = () => dropZone.classList.remove("drag-hover");
      dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove("drag-hover");
        const file = e.dataTransfer.files[0];
        if (file) this.handleFile(file);
      };
  
      const btnGrid = makeElement("div", { className: "adv-btn-grid" });
  
      const btnCopy = makeElement(
        "button",
        { className: "adv-btn", onclick: () => this.copyToClipboard() },
        "📋 Copy Piano Roll"
      );
      const btnPaste = makeElement(
        "button",
        { className: "adv-btn", onclick: () => this.pasteFromClipboard() },
        "📝 Paste Piano Roll"
      );
      const btnDownload = makeElement(
        "button",
        { className: "adv-btn", onclick: () => this.exportFile() },
        "💾 Download .txt"
      );
      const btnSaveFolder = makeElement(
        "button",
        {
          className: "adv-btn",
          onclick: () => this.savePianoRollToFolder(),
        },
        "📁 Save to pianorolls Folder"
      );
      const btnEditor = makeElement(
        "button",
        { className: "adv-btn primary", onclick: () => this.openTextEditor() },
        "✏️ Open Text Editor"
      );
  
      btnGrid.append(btnCopy, btnPaste, btnDownload, btnSaveFolder, btnEditor);
      container.append(fileInput, dropZone, btnGrid);
  
      this.dialog = UITools.makeDialog({
        env: this.player.env, // Bind to player environment
        title: "Advanced Piano Roll Tools",
        content: container,
        width: "450px",
        appendTo: this.player.rootElement,
        onClose: () => {
          this.dialog = null;
        },
      });
    }

  

}

/* recursi-meta
{
  "schema": 1,
  "lines": 360,
  "provides": [
    "AdvancedToolsUI"
  ],
  "deps": [
    "DialogBox",
    "applyCss",
    "makeElement"
  ]
}
recursi-meta */

globalThis.AdvancedToolsUI = AdvancedToolsUI;
