class AardvarkDictation {
  static _messageHandler = null;

  static launchAt(dictationUrl) {
    // Toggle — if already open, close it
    const existing = document.getElementById('aardvark-dictation-iframe');
    if (existing) {
      const dlg = existing.closest('[data-style-exclude]');
      // Clean up message listener
      if (AardvarkDictation._messageHandler) {
        window.removeEventListener('message', AardvarkDictation._messageHandler);
        AardvarkDictation._messageHandler = null;
      }
      if (dlg && dlg._dialogBoxRef) {
        dlg._dialogBoxRef.close();
      } else {
        existing.remove();
        if (dlg) dlg.remove();
      }
      return;
    }

    if (!dictationUrl) {
      console.error('[AardvarkDictation] No URL provided.');
      return;
    }

    // Build iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'aardvark-dictation-iframe';
    iframe.src = dictationUrl;
    iframe.setAttribute('allow', 'microphone');
    iframe.style.cssText = 'width:100%;height:100%;border:none;background:#111;display:block;';

    // Container
    const container = document.createElement('div');
    container.style.cssText = 'width:100%;height:100%;overflow:hidden;';
    container.appendChild(iframe);

    // Use DialogBox
    const box = new DialogBox({
      title: 'Dictation',
      width: '440px',
      height: '380px',
      allowMaximize: true,
      noPadding: true,
      onClose: () => {
        // Clean up message listener on close
        if (AardvarkDictation._messageHandler) {
          window.removeEventListener('message', AardvarkDictation._messageHandler);
          AardvarkDictation._messageHandler = null;
        }
      }
    });

    box.contentElement.style.padding = '0';
    box.contentElement.style.overflow = 'hidden';
    box.contentElement.style.display = 'flex';
    box.contentElement.style.flexDirection = 'column';
    box.contentElement.style.flex = '1 1 auto';
    box.contentElement.style.minHeight = '0';
    box.contentElement.appendChild(container);

    box.element.setAttribute('data-style-exclude', '');
    box.element._dialogBoxRef = box;

    // Listen for messages from iframe (clipboard copy requests)
    AardvarkDictation._messageHandler = (event) => {
      if (!event.data || event.data.type !== 'aardvark-dictation-copy') return;
      const text = event.data.text;
      if (!text) return;

      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          console.log('[Dictation] Copied ' + text.length + ' chars');
        }).catch(() => {
          AardvarkDictation._fallbackCopy(text);
        });
      } else {
        AardvarkDictation._fallbackCopy(text);
      }
    };

    window.addEventListener('message', AardvarkDictation._messageHandler);
  }

  static _fallbackCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      ta.remove();
      console.log('[Dictation] Copied via fallback: ' + text.length + ' chars');
    } catch(e) {
      console.error('[Dictation] Copy failed entirely:', e);
    }
  }

}
