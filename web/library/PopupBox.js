class PopupBox {
  static okCancelBox = null;

  static _isCssApplied = false;

  static fade(elem) {
    elem.style.transform = 'scale3d(0,1,1)';
    elem.style.opacity = '0';
    setTimeout(function () {
      if (elem.parentNode) elem.parentNode.removeChild(elem);
    }, 150);
  }

  static showBox(elem, scaleFromLeft, x, y, okCancelCb, parentElem) {
    if (scaleFromLeft) {
      elem.style.transform = 'scale3d(0,1,1)';
      elem.style.transformOrigin = '0% 50%';
    } else {
      elem.style.transform = 'scale3d(1,0,1)';
      elem.style.transformOrigin = '50% 50%';
    }
    parentElem = parentElem || document.body;
    parentElem.appendChild(elem);
    var h = elem.offsetHeight;
    elem.style.left = x + 'px';
    var t = y - h / 2;
    if (t < 8) {
      t = 8;
    }
    elem.style.top = t + 'px';
    var w = elem.offsetWidth;
    elem.style.transform = 'scale3d(1,1,1)';

    if (okCancelCb) {
      if (this.okCancelBox) {
        this.cancel();
      }
      this.okCancelBox = {
        elem: elem,
        cb: okCancelCb,
      };
    }
  }

  static ok() {
    if (this.okCancelBox) {
      var cb = this.okCancelBox.cb;
      var elem = this.okCancelBox.elem;
      this.okCancelBox = null;
      this.fade(elem);
      if (cb) cb(true);
      return true;
    }
    return false;
  }

  static cancel() {
    if (this.okCancelBox) {
      var cb = this.okCancelBox.cb;
      var elem = this.okCancelBox.elem;
      this.okCancelBox = null;
      this.fade(elem);
      if (cb) cb(false);
      return true;
    }
    return false;
  }

  static init() {
    // Bypassing the _isCssApplied check here to FORCE your beautiful original CSS to overwrite my bad changes!
    // Load Architects Daughter from Google Fonts
        if (!document.querySelector('link[href*="Architects+Daughter"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://fonts.googleapis.com/css2?family=Architects+Daughter&display=swap';
          document.head.appendChild(link);
        }
        applyCss(
      `
  @import url('https://fonts.googleapis.com/css2?family=Architects+Daughter&display=swap');
  .keyShortcutBox span {
    color: rgb(200,200,200);
  }
  .keyShortcutBox {
    position: fixed;
    padding:0 8px 8px 8px;
    z-index: 2147483647;
    border-style: solid;
    box-shadow: 2px 2px 2px #000;
    line-height: 28px;
    transition: transform .15s ease-out, opacity .1s ease-in;
    font-size: 25px;
    font-family: 'Architects Daughter', sans-serif;
    text-align: left;
    text-shadow: 2px 2px 2px #000;
    color: #eee;
  }
  .keyShortcutSingleCommandActive {
  }
  .keyShortcutSingleCommandDisabled {
    opacity: 0.3;
  }
  .keyShortcutOpenRight {
    border-radius: 5px 0 0 5px;
    border-width: 2px 0 2px 2px;
  }
  .keyShortcutClosedRight {
    border-radius: 5px;
    border-width: 2px;
  }
  .keyShortcutBigLetter {
    font-size: 50px;
    position: relative;
    top: 8px;
  }
  `,
      'popupbox-styles'
    );
    this._isCssApplied = true;
  }

  static makeBox(rgb, isOpenRight) {
    this.init();
    return makeElement('div', {
      className:
        'keyShortcutBox keyShortcut' +
        (isOpenRight ? 'Open' : 'Closed') +
        'Right',
      style: {
        backgroundColor:
          'rgba(' +
          rgb[0] * 0.8 +
          ',' +
          rgb[1] * 0.8 +
          ',' +
          rgb[2] * 0.8 +
          ',' +
          (rgb[3] || 0.32) +
          ')',
        borderColor:
          'rgb(' +
          Math.floor(rgb[0] * 0.6) +
          ',' +
          Math.floor(rgb[1] * 0.6) +
          ',' +
          Math.floor(rgb[2] * 0.6) +
          ')',
      },
    });
  }


  

  
}
