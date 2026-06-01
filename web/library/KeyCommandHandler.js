class KeyCommandHandler {
  static pendingFirstItem = null;

  static commands = [];

  static intMap = [];

  static lastSingleCommandItem = null;

  static elems = { topLevel: null, secondLevel: null };

  static keydownEventListener = null;

  static keyupEventListener = null;

  static controlKeyCallback = null;

  static isPaused = false;

  static unusedKeyCallback = null;

  static _getPos(elem) {
    const rect = elem.getBoundingClientRect();
    return { x: rect.left, y: rect.top };
  }

  static setCtrlCallback(cb) {
    if (!this.controlKeyCallback) {
      const el = (e) => {
        if (this.controlKeyCallback && e.key === 'Control') {
          this.controlKeyCallback(false);
        }
      };
      window.addEventListener('keyup', el);
    }
    this.controlKeyCallback = cb;
  }

  static setUnusedKeyCallback(cb) {
    this.unusedKeyCallback = cb;
  }

  static clear() {
    if (this.keydownEventListener)
      window.removeEventListener('keydown', this.keydownEventListener);
    if (this.keyupEventListener)
      window.removeEventListener('keyup', this.keyupEventListener);
    this.commands = [];
    this.intMap = [];
    this.lastNumberCommand = null;
  }

  static markDisabled(a) {
    let count = 0;
    for (let i = 0; i < a.length; i++) {
      const item = a[i];
      item.disabled = null;
      item.statusText = null;
      item.statusMarkup = null;
      if (item.func) {
        if (item.func.call(item, 'queryactive') === false) {
          item.disabled = true;
          count++;
        }
        const qs = item.func('querystate');
        if (qs === true) {
          item.statusMarkup = `<span style="color:#4f4; font-size:1.1em; line-height:1;">✔</span>`;
        } else if (
          qs !== null &&
          qs !== undefined &&
          qs !== false &&
          qs !== ''
        ) {
          // Strip out "Current" or "Current: " safely if it was hardcoded anywhere
          let displayVal = String(qs)
            .replace(/current:?\s*/gi, '')
            .trim();
          if (displayVal.length > 0) {
            // Nudge down slightly using relative positioning to fix baseline mismatch
            item.statusMarkup = `<span style="color:#4a90e2; font-weight:bold; font-size:1.1em; line-height:1; position:relative; top:0.15em;">[${displayVal}]</span>`;
          } else {
            // If it was exactly "Current", show a checkmark instead
            item.statusMarkup = `<span style="color:#4f4; font-size:1.1em; line-height:1;">✔</span>`;
          }
        }
      }
    }
    return a.length - count;
  }

  static processInt(intKey, e) {
    if (intKey === 13) {
      if (PopupBox.ok()) return true;
      // Clear any pending two-level command before processing Enter
      // so it doesn't get swallowed by the exit logic.
      if (this.pendingFirstItem) {
        this.exit();
        this.pendingFirstItem = null;
      }
      if (this.processKey('ENTER')) return true;
    } else if (intKey === 27) {
      if (PopupBox.cancel()) return true;
      if (this.exit()) return true;
      if (this.processKey('ESCAPE')) return true;
    } else if (intKey === 32) {
      // Clear pending so space doesn't get eaten by a stale popup
      if (this.pendingFirstItem) {
        this.exit();
        this.pendingFirstItem = null;
      }
      if (this.processKey('SPACE')) return true;
    }
    if (this.isPaused) return false;
    const intKeyItem = this.intMap[intKey];
    if (intKeyItem) {
      intKeyItem.func(e);
      return true;
    }
    return false;
  }

  static processKey(key) {
    console.log(
      '%c[KCH] processKey("' +
        key +
        '") pending=' +
        (this.pendingFirstItem ? this.pendingFirstItem.key : 'null') +
        ' commands=' +
        this.commands.map((c) => c.key).join(','),
      'color: #0ff'
    );

    if (this.pendingFirstItem) {
      const a = this.pendingFirstItem.children;
      this.markDisabled(a);
      for (let i = 0; i < a.length; i++) {
        const checkStatus = this.checkCommandForKey(a[i], key);
        if (checkStatus != null) {
          if (checkStatus.isDisabled) {
            const sl = this.elems.secondLevel;
            const tl = this.elems.topLevel;
            if (tl) tl.style.opacity = '0';
            if (sl) sl.style.opacity = '0';
            setTimeout(() => {
              if (tl && tl.parentNode) tl.parentNode.removeChild(tl);
              if (sl && sl.parentNode) sl.parentNode.removeChild(sl);
            }, 400);
            this.elems.topLevel = null;
            this.elems.secondLevel = null;
          } else {
            const ret = a[i].func('command', this.pendingFirstItem.key + key);
            // Save this command as the active number binding if it uses a numRange
            if (a[i].numRange) {
              this.lastNumberCommand = {
                parent: this.pendingFirstItem,
                child: a[i],
              };
            }
            this.showSecondLevelCommandDone(i, ret);
          }
          this.pendingFirstItem = null;
          return true;
        }
      }
      // No match in children — exit popup, fall through to top-level
      this.exit();
      this.pendingFirstItem = null;
    }

    // REPEAT LAST NUMBER COMMAND
    if (/^[0-9]$/.test(key) && this.lastNumberCommand) {
      const lnc = this.lastNumberCommand;
      if (lnc.child.func('queryactive') !== false) {
        const ret = lnc.child.func('command', lnc.parent.key + key);
        let followup = null;
        if (ret) {
          if (typeof ret === 'string') {
            followup = ret;
          } else {
            followup =
              (ret.newKey ? ret.newKey + ' ' : '') +
              (ret.followup ? ret.followup : '');
          }
          this.showFollowupBox(
            followup,
            window.innerWidth / 2,
            window.innerHeight / 2 + 80
          );
        }
        return true;
      }
    }

    // Look for top level command
    const a = this.commands;
    for (let i = 0; i < a.length; i++) {
      if (this.checkCommandForKey(a[i], key)) {
        console.log(
          '%c[KCH] MATCHED command key="' +
            a[i].key +
            '" hasChildren=' +
            !!a[i].children,
          'color: #0f0'
        );
        if (a[i].children) {
          const enabledCount = this.markDisabled(a[i].children);
          if (enabledCount) {
            this.pendingFirstItem = a[i];
            this.showTwoLevelCommand(a[i]);
          }
          return true;
        } else {
          const enabledCount = this.markDisabled([a[i]]);
          if (enabledCount) {
            this.showTopLevelCommand(a[i]);
            a[i].func('command', key);
          }
          return true;
        }
      }
    }
    console.log('%c[KCH] NO MATCH for "' + key + '"', 'color: #f44');
    return false;
  }

  static checkCommandForKey(command, key) {
    if (command.numRange) {
      const num = parseInt(key);
      if (
        typeof num === 'number' &&
        num >= command.numRange[0] &&
        num <= command.numRange[1]
      ) {
        return {};
      }
      return null;
    }
    if (command.key === key) return { isDisabled: command.disabled };
    return null;
  }

  static showTopLevelCommand(item) {
    if (this.elems.topLevel) this.exit();
    const boxElem = PopupBox.makeBox([255, 235, 0]);
    this.fillBox(boxElem, [item]);
    const pos = this.getMenuOffset();
    PopupBox.showBox(boxElem, false, pos.x, pos.y);
    setTimeout(() => {
      boxElem.style.opacity = '0';
      setTimeout(() => {
        if (boxElem.parentNode) boxElem.parentNode.removeChild(boxElem);
      }, 300);
    }, 800);
  }

  static showTwoLevelCommand(item) {
    this.elems.topLevel = PopupBox.makeBox([255, 235, 0], true);
    this.fillBox(this.elems.topLevel, [item]);
    const pos = this.getMenuOffset();
    PopupBox.showBox(this.elems.topLevel, false, pos.x, pos.y);
    setTimeout(() => {
      if (this.pendingFirstItem === item) {
        this.elems.secondLevel = PopupBox.makeBox([0, 246, 0]);
        this.fillBox(this.elems.secondLevel, item.children);
        // NO GAP — butted right against top level box
        PopupBox.showBox(
          this.elems.secondLevel,
          true,
          pos.x + this.elems.topLevel.offsetWidth,
          pos.y
        );
      }
    }, 100);
  }

  static exit() {
    this.pendingFirstItem = null;
    if (this.elems.topLevel) {
      const tl = this.elems.topLevel;
      tl.style.transform = 'scale3d(2,2,1)';
      tl.style.opacity = '0';
      this.elems.topLevel = null;
      const sl = this.elems.secondLevel;
      this.elems.secondLevel = null;
      setTimeout(() => {
        if (tl.parentNode) tl.parentNode.removeChild(tl);
        if (sl) {
          sl.style.transform = 'scale3d(2,2,1)';
          sl.style.opacity = '0';
          setTimeout(() => {
            if (sl.parentNode) sl.parentNode.removeChild(sl);
          }, 150);
        }
      }, 150);
      return true;
    }
    return false;
  }

  static showFollowupBox(str, x, y) {
      if (
        typeof window !== 'undefined' &&
        window.UITools &&
        window.UITools.safeArea
      ) {
        const safe = window.UITools.safeArea;
        if (x === window.innerWidth / 2) {
          x = safe.left + (window.innerWidth - safe.left - safe.right) / 2;
        }
      }

      const didBox = PopupBox.makeBox([190, 0, 255]);
      this.fillBox(didBox, this.breakUpString(str, 14));
      PopupBox.showBox(didBox, true, x, y);
      if (didBox) {
        setTimeout(() => {
          didBox.style.transform = 'scale3d(1,0,1)';
          didBox.style.transformOrigin = '50% 50%';
          setTimeout(() => {
            if (didBox.parentNode) didBox.parentNode.removeChild(didBox);
          }, 400);
        }, 1100);
      }
    }

  static showSecondLevelCommandDone(which, returnVal) {
    let followup = null;
    let newKey = null;
    if (returnVal) {
      if (typeof returnVal === 'string') {
        followup = returnVal;
      } else {
        followup = returnVal.followup;
        newKey = returnVal.newKey;
      }
    }

    if (this.elems.secondLevel) {
      let selectedElem;
      const cn = this.elems.secondLevel.childNodes;
      for (let i = 0; i < cn.length; i++) {
        if (i === which) {
          selectedElem = cn[i];
          selectedElem.style.color = '#ff0';
          if (newKey) {
            const spans = selectedElem.getElementsByTagName('span');
            if (spans[0]) spans[0].innerHTML = newKey;
          }
        } else {
          cn[i].style.opacity = '.3';
        }
      }
      const sl = this.elems.secondLevel;
      const tl = this.elems.topLevel;
      if (tl) tl.style.opacity = '0';
      this.elems.topLevel = null;
      this.elems.secondLevel = null;

      if (followup && selectedElem) {
        const pos = this._getPos(sl);
        const posItem = this._getPos(selectedElem);
        this.showFollowupBox(
          followup,
          pos.x + sl.offsetWidth + 8,
          posItem.y + selectedElem.offsetHeight / 2
        );
      }
      setTimeout(() => {
        if (tl && tl.parentNode) tl.parentNode.removeChild(tl);
        sl.style.opacity = '0';
        setTimeout(() => {
          if (sl.parentNode) sl.parentNode.removeChild(sl);
        }, 400);
      }, 400);
    } else {
      setTimeout(() => this.exit(), 400);
    }
  }

  static breakUpString(s, max) {
    const ss = s.split(' ');
    const outArray = [];
    let curr = null;
    for (let i = 0; i < ss.length; i++) {
      const len = ss[i].length;
      if (!curr || curr.pre.length + len > max) {
        curr = { pre: ss[i], key: '', post: '' };
        outArray.push(curr);
      } else {
        curr.pre += ' ' + ss[i];
      }
    }
    return outArray;
  }

  static focus() {
    if (document.activeElement) document.activeElement.blur();
    window.focus();
  }

  static setPaused(isPaused) {
    this.isPaused = isPaused;
    if (!isPaused) this.focus();
  }

  static addCommand(c, f, altName) {
    const item = { func: f };
    if (typeof c === 'number') this.intMap[c] = item;
  }

  static makeTriggerAndLabel(nameString) {
    // Handle special key tokens: ENTER, SPACE, ESCAPE
    const upperName = nameString.toUpperCase().trim();
    if (upperName === 'ENTER' || upperName === '&ENTER') {
      return { pre: '', post: '', key: 'ENTER', displayKey: 'Enter' };
    }
    if (upperName === 'SPACE' || upperName === '&SPACE') {
      return { pre: '', post: '', key: 'SPACE', displayKey: 'Space' };
    }
    if (upperName === 'ESCAPE' || upperName === '&ESCAPE') {
      return { pre: '', post: '', key: 'ESCAPE', displayKey: 'Esc' };
    }

    const numIndex = nameString.indexOf('#');
    if (numIndex !== -1) {
      const first = parseInt(nameString.charAt(numIndex + 1));
      if (nameString.charAt(numIndex + 2) === '-' && first >= 0 && first <= 9) {
        const second = parseInt(nameString.charAt(numIndex + 3));
        if (second > first && second <= 9) {
          return {
            key: first + '-' + second,
            numRange: [first, second],
            pre: nameString.substring(0, numIndex),
            post: nameString.substring(numIndex + 4),
          };
        }
      }
    }
    const index = nameString.indexOf('&');
    if (index === -1) {
      return {
        pre: '',
        post: nameString.substring(1),
        key: nameString.substring(0, 1).toUpperCase(),
      };
    } else if (index === 0) {
      return {
        pre: '',
        post: nameString.substring(2),
        key: nameString.substring(1, 2).toUpperCase(),
      };
    } else {
      return {
        pre: nameString.substring(0, index),
        post: nameString.substring(index + 2),
        key: nameString.substring(index + 1, index + 2).toUpperCase(),
      };
    }
  }

  static addKeyCommand(name1, name2, description, commandFunc) {
    let item = this.makeTriggerAndLabel(name1);
    let found = false;
    for (let i = 0; i < this.commands.length; i++) {
      if (this.commands[i].key === item.key) {
        let origItem = this.commands[i];
        Object.assign(origItem, item);
        item = origItem;
        found = true;
        break;
      }
    }
    if (!found) this.commands.push(item);

    if (name2) {
      item.children = item.children || [];
      let childItem = this.makeTriggerAndLabel(name2);
      found = false;
      for (let i = 0; i < item.children.length; i++) {
        if (item.children[i].key === childItem.key) {
          let oldChild = item.children[i];
          Object.assign(oldChild, childItem);
          item = oldChild;
          found = true;
          break;
        }
      }
      if (!found) {
        item.children.push(childItem);
        item = childItem;
      }
    }
    item.desc = description;
    item.func = commandFunc;
  }

  static fillBox(elem, itemArray) {
    for (let i = 0; i < itemArray.length; i++) {
      const item = itemArray[i];
      const displayKey = item.displayKey || item.key;

      const div = makeElement('div', {
        className: item.disabled ? 'keyShortcutSingleCommandDisabled' : '',
        style:
          'display: flex; justify-content: space-between; align-items: center; min-width: 160px; padding-right: 5px;',
      });

      // Wrap the original text elements in a container so flexbox pushes the status to the far right
      const leftContent = makeElement(
        'div',
        {},
        item.pre,
        makeElement('span', { className: 'keyShortcutBigLetter' }, displayKey),
        item.post
      );
      div.appendChild(leftContent);

      if (item.statusMarkup) {
        const st = makeElement('div', {
          style: 'margin-left: 15px; display: flex; align-items: center;',
        });
        st.innerHTML = item.statusMarkup;
        div.appendChild(st);
      } else if (item.statusText) {
        const st = makeElement(
          'div',
          {
            style:
              'font-size: .8em; color: #ddd; margin-left: 15px; display: flex; align-items: center;',
          },
          item.statusText
        );
        div.appendChild(st);
      }
      elem.appendChild(div);
    }
  }

  static lateFollowupBox(s) {
    const pos = { x: 400, y: 200 };
    const didBox = PopupBox.makeBox([190, 0, 255]);
    this.fillBox(didBox, this.breakUpString(s, 14));
    PopupBox.showBox(didBox, true, pos.x, pos.y);
    if (didBox) {
      setTimeout(() => {
        didBox.style.transform = 'scale3d(1,0,1)';
        didBox.style.transformOrigin = '50% 50%';
        setTimeout(() => {
          if (didBox.parentNode) didBox.parentNode.removeChild(didBox);
        }, 400);
      }, 1300);
    }
  }

  static init() {
      if (navigator.userAgent.toLowerCase().indexOf('android') === -1) {
        this.focus();
        this.keydownEventListener = (e) => {
          // 1. Absolute Release: If keyboard handling is paused, ignore everything immediately
          if (this.isPaused) return;

          const tag = e.target?.tagName;
          const isTextInput = tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable;
          
          if (isTextInput) {
            // Bypass shortcut triggers inside our own accudraw input boxes (so users can type coordinates)
            if (e.target?.classList && e.target.classList.contains('accudrawInput')) {
              return;
            }
            // 2. Absolute Grab: If focus is inside an external field, actively swallow keys to prevent leakage
            e.preventDefault();
            e.stopPropagation();
          }

          if (this.processInt(e.which, e)) {
            e.preventDefault();
            e.stopPropagation();
          } else if (!this.isPaused) {
            const s = String.fromCharCode(e.which);
            const suc = s.toUpperCase();
            if (this.processKey(suc)) {
              e.preventDefault();
              e.stopPropagation();
            } else if (this.unusedKeyCallback) {
              this.unusedKeyCallback({ key: s, event: e });
            }
          }
        };
        window.addEventListener('keydown', this.keydownEventListener);
      }
    }

  static getMenuOffset() {
      let x = 20; // Base padding from the safe edge
      let y = 180; // Pushed down to clear the header

      if (
        typeof window !== 'undefined' &&
        window.UITools &&
        window.UITools.safeArea
      ) {
        x += window.UITools.safeArea.left;
      }
      return { x, y };
    }


  

  

  static destroy() {
      this.clear();
    }
}
