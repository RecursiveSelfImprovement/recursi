
class ScratchyViewerLauncher {
  constructor(app) {
    this._app = app;
  }

  async openViewer() {
      const app = this._app;
      if (!app.projectData) {
        app.statusDiv.textContent = 'Load a project first!';
        return;
      }
      app.statusDiv.textContent = 'Preparing viewer...';

      let blob;
      try {
        blob = await app.exporter.getSb3Blob();
      } catch (e) {
        app.statusDiv.textContent = 'Error preparing SB3: ' + e.message;
        console.error(e);
        return;
      }
      const buffer = await blob.arrayBuffer();

      const wrapper = makeElement('div', {
        style: {
          width: '100%',
          height: '100%',
          background: '#000',
          display: 'flex',
          flexDirection: 'column',
        },
      });

      const iframe = makeElement('iframe', {
        src: '/Scratchy/scratchViewer.html',
        style: { width: '100%', height: '100%', border: 'none', flex: '1' },
        allow: 'autoplay; microphone; camera; clipboard-write',
      });

      wrapper.appendChild(iframe);

      const dialog = UITools.makeDialog({
        env: app.env,
        title: '📺 Scratch Viewer',
        size: [960, 720],
        contentElement: wrapper,
        noPadding: true,
        buttons: [],
        onClose: () => {
          window.removeEventListener('message', this._embeddedMsgHandler);
        },
      });

      this._embeddedMsgHandler = (e) => {
        if (e.origin !== window.location.origin) return;
        if (
          e.data?.type === 'SCRATCH_VIEWER_READY' &&
          e.source === iframe.contentWindow
        ) {
          const cloned = buffer.slice(0);
          iframe.contentWindow.postMessage(
            { type: 'LOAD_SB3', sb3: cloned },
            window.location.origin
          );
          app.statusDiv.textContent = 'Viewer loaded.';
        }
      };
      window.addEventListener('message', this._embeddedMsgHandler);

      const controls = dialog.header.querySelector('.uw-controls');
      const popBtn = makeElement(
        'button',
        {
          className: 'dialog-util-btn',
          title: 'Pop Out to New Window',
          onclick: (e) => {
            e.stopPropagation();
            this._openPopout(buffer);
          },
        },
        '↗'
      );
      controls.insertBefore(popBtn, dialog.closeButton);
    }

  _openPopout(buffer) {
      const app = this._app;
      const win = window.open('/Scratchy/scratchViewer.html', '_blank');
      if (!win) {
        alert('Pop-up blocked. Please allow popups for this site.');
        return;
      }

      // Wait for the new window to signal it is ready before sending data
      const popHandler = (e) => {
        if (e.origin !== window.location.origin) return;
        if (e.data?.type === 'SCRATCH_VIEWER_READY' && e.source === win) {
          const cloned = buffer.slice(0);
          win.postMessage(
            { type: 'LOAD_SB3', sb3: cloned },
            window.location.origin
          );
          app.statusDiv.textContent = 'Viewer popped out.';
          window.removeEventListener('message', popHandler);
        }
      };
      window.addEventListener('message', popHandler);
    }

  
}

