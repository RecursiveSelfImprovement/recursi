class SmartDrawKeys {
  static initializeKeyCommands(kch, baseController) {
    this.registerPlaneCommands(kch, baseController);
    this.registerAccuDrawCommands(kch, baseController);
    this.registerDrawingCommands(kch, baseController);
    this.registerElementCommands(kch, baseController);
    this.registerViewCommands(kch, baseController);
    this.registerFileCommands(kch, baseController);
  }

  static registerPlaneCommands(kch, baseController) {
    // Top View (T)
    kch.addKeyCommand('top', '', 'top', function (type, keys) {
      switch (type) {
        case 'command':
          baseController.setDrawingPlane('top');
          return 'Switched plane to TOP';
        case 'queryactive':
          this.statusText = ' plane';
          return true;
      }
    });

    // Front View (F)
    kch.addKeyCommand('front', '', 'front', function (type, keys) {
      switch (type) {
        case 'command':
          baseController.setDrawingPlane('front');
          return 'Switched plane to FRONT';
        case 'queryactive':
          this.statusText = ' plane';
          return true;
      }
    });

    // Side View (S)
    // Note: The string 'side' parses to the key 'S' automatically.
    kch.addKeyCommand('side', '', 'side', function (type, keys) {
      switch (type) {
        case 'command':
          baseController.setDrawingPlane('side');
          return 'Switched plane to SIDE';
        case 'queryactive':
          this.statusText = ' plane';
          return true;
      }
    });
  }

  static registerAccuDrawCommands(kch, baseController) {
    kch.addKeyCommand(
      '&keyboard shortcuts',
      '',
      'show keyboard shortcuts',
      function (type, keys) {
        switch (type) {
          case 'command':
            SmartDrawKeys.showHelpDialog(baseController);
            return null;
          case 'queryactive':
            return true;
        }
      }
    );

    kch.addKeyCommand('lock', '', 'smart lock', function (type, keys) {
      switch (type) {
        case 'command':
          if (baseController.accuDrawLogic) {
            baseController.accuDrawLogic.handleSmartLock();
          }
          return 'Smart Lock';
        case 'queryactive':
          if (baseController.accuDrawLogic) {
            const l = baseController.accuDrawLogic;
            const anyLocked =
              l.isLocked.x ||
              l.isLocked.y ||
              l.isLocked.dist ||
              l.isLocked.angle;
            this.statusText = anyLocked ? ' (locked)' : '';
          }
          return true;
      }
    });

    kch.addKeyCommand('SPACE', '', 'mode toggle', function (type, keys) {
      switch (type) {
        case 'command':
          if (baseController.accuDrawLogic) {
            baseController.accuDrawLogic.switchMode();
          }
          return (
            'Mode: ' +
            (baseController.accuDrawLogic
              ? baseController.accuDrawLogic.mode
              : '?')
          );
        case 'queryactive':
          if (baseController.accuDrawLogic) {
            this.statusText = ' (' + baseController.accuDrawLogic.mode + ')';
          }
          return true;
      }
    });

    kch.addKeyCommand('&get origin', '', 'origin', function (type, keys) {
      if (type === 'command') {
        const pointToUse = baseController.getLastWorldPoint();
        if (pointToUse) {
          baseController.setOrigin(pointToUse);
        }
        if (baseController._tentativeOriginalPoint) {
          TentativePointHandler._clearTentativePoint(baseController);
        }
      }
      return true;
    });

    kch.addKeyCommand('x', '', 'lock X', function (type, keys) {
      if (type === 'command') {
        if (baseController.accuDrawLogic)
          baseController.accuDrawLogic.toggleLock('x');
        return 'X Toggled';
      }
      return true;
    });

    kch.addKeyCommand('y', '', 'lock Y', function (type, keys) {
      if (type === 'command') {
        if (baseController.accuDrawLogic)
          baseController.accuDrawLogic.toggleLock('y');
        return 'Y Toggled';
      }
      return true;
    });

    kch.addKeyCommand('z', '', 'lock Z', function (type, keys) {
      if (type === 'command') {
        if (baseController.accuDrawLogic) {
          baseController.accuDrawLogic.toggleLock('z');
          baseController.zPlaneLocked = baseController.accuDrawLogic.isLocked.z;
        } else {
          baseController.zPlaneLocked = !baseController.zPlaneLocked;
        }
        baseController.refreshMousePosition();
        return 'Z ' + (baseController.zPlaneLocked ? 'Locked' : 'Unlocked');
      }
      return true;
    });

    function scaleExponentially(num) {
      if (num < 0 || num > 9) throw new Error('Input must be between 0 and 9');
      let min = 1.5;
      let max = 300;
      let base = Math.pow(max / min, 1 / 9);
      return min * Math.pow(base, num);
    }

    kch.addKeyCommand(
      'accudraw',
      'size #0-9',
      'set the compass size to a number 0 and 9',
      function (type, keys) {
        switch (type) {
          case 'command':
            var v = parseInt(keys[1]);
            var s = scaleExponentially(v);
            if (baseController?.accuDraw?.setSizeAnimated) {
              baseController.accuDraw.setSizeAnimated(s / 40, 0.5);
            }
            return 'size set to ' + s;
          case 'queryactive':
            this.statusText = ' (current: ' + 9 + ')';
            return true;
        }
      }
    );

    kch.addKeyCommand(
      'accudraw',
      'ui',
      'toggles the visibility of the accudraw panel',
      function (type, keys) {
        switch (type) {
          case 'command':
            if (baseController.accuDraw && baseController.accuDraw.ui) {
              baseController.accuDraw.ui.toggle();
            }
            return 'Toggled AccuDraw UI';
          case 'queryactive':
            return true;
        }
      }
    );

    kch.addKeyCommand(
      'accudraw',
      '&diagnostics',
      'toggle the accudraw diagnostics panel',
      function (type, keys) {
        switch (type) {
          case 'command':
            if (!baseController.accuDrawDiagnostics) {
              baseController.accuDrawDiagnostics = new AccuDrawDiagnostics(
                baseController
              );
            }
            baseController.accuDrawDiagnostics.toggle();
            return 'Toggled Diagnostics';
          case 'queryactive':
            return true;
        }
      }
    );

    kch.addKeyCommand(
      'accudraw',
      'test harness',
      'open the accudraw test harness',
      function (type, keys) {
        switch (type) {
          case 'command':
            if (!baseController.accuDrawTestHarness) {
              baseController.accuDrawTestHarness = new AccuDrawTestHarness(
                baseController
              );
            }
            baseController.accuDrawTestHarness.toggle();
            return 'Toggled Test Harness';
          case 'queryactive':
            return true;
        }
      }
    );
  }

  static registerDrawingCommands(kch, baseController) {
      kch.addKeyCommand(
        'command',
        'rectangle',
        'CR: Switch to Rectangle',
        function (type, keys) {
          if (type === 'command') baseController.setCommandByName('rectangle');
          if (type === 'queryactive') return true;
        }
      );

      kch.addKeyCommand('command', 'circle', '', function (type, keys) {
        if (type === 'command') baseController.setCommandByName('circle');
        if (type === 'queryactive') return true;
      });

      kch.addKeyCommand('command', 'arc', '', function (type, keys) {
        if (type === 'command') baseController.setCommandByName('arc');
        if (type === 'queryactive') return true;
      });

      kch.addKeyCommand('command', 'linear path', '', function (type, keys) {
        if (type === 'command') baseController.setCommandByName('path');
        if (type === 'queryactive') return true;
      });

      kch.addKeyCommand(
        'command',
        'bezier',
        'CL: Switch to Line',
        function (type, keys) {
          if (type === 'command') baseController.setCommandByName('curve');
          if (type === 'queryactive') return true;
        }
      );

      kch.addKeyCommand('command', 'ca&psule', '', function (type, keys) {
        if (type === 'command') baseController.setCommandByName('capsule');
        if (type === 'queryactive') return true;
      });

      kch.addKeyCommand('command', 'move', 'CM: Switch to Move', function (type, keys) {
        if (type === 'command') baseController.setCommandByName('move');
        if (type === 'queryactive') return true;
      });

      kch.addKeyCommand('command', 'ro&tate', 'CT: Switch to Rotate', function (type, keys) {
        if (type === 'command') baseController.setCommandByName('rotate');
        if (type === 'queryactive') return true;
      });
    }

  static registerElementCommands(kch, baseController) {
    kch.addKeyCommand('command', 'select', '', function (type, keys) {
      if (type === 'command') baseController.setCommandByName('select');
      if (type === 'queryactive') return true;
    });

    kch.addKeyCommand('delete', '', '', function (type, keys) {
      switch (type) {
        case 'command':
          ElementOperations.deleteElement(
            baseController.activeCommand.getSelectedElement(),
            baseController.cadElements
          );
          return '';
        case 'queryactive':
          this.statusText = ' ';
          return true;
      }
    });

    kch.addKeyCommand('d&ump info', '', '', function (type, keys) {
      switch (type) {
        case 'command':
          if (
            baseController.activeCommand &&
            typeof baseController.activeCommand.dumpElementInfo === 'function'
          ) {
            baseController.activeCommand.dumpElementInfo();
          }
          return '';
        case 'queryactive':
          this.statusText = ' ';
          return true;
      }
    });

    kch.addKeyCommand('spl&it', '', '', function (type, keys) {
      switch (type) {
        case 'command':
          const selectedElement =
            baseController.activeCommand.getSelectedElement();
          if (selectedElement) {
            const rightHalfElement = ElementOperations.bisectElement(
              selectedElement,
              0
            );
            if (rightHalfElement) {
              baseController.view.scene.add(rightHalfElement.threejsObject);
              ElementOperations.deleteElement(
                selectedElement,
                baseController.cadElements
              );
            } else {
              console.warn('Failed to bisect element');
            }
          } else {
            console.warn('No element selected for splitting');
          }
          return '';
        case 'queryactive':
          this.statusText = ' ';
          return true;
      }
    });

    kch.addKeyCommand('x', 'wireframe', '', function (type, keys) {
      switch (type) {
        case 'command':
          ElementOperations.wireframeElement(
            baseController.activeCommand.getSelectedElement(),
            {
              showEdgesOnly: false,
              lineColor: 0xff0088,
              lineWidth: 4,
              preserveOriginal: false,
              opacity: 1.0,
            }
          );
          return '';
        case 'queryactive':
          this.statusText = ' ';
          return true;
      }
    });

    kch.addKeyCommand('apply &materials', '', '', function (type, keys) {
      switch (type) {
        case 'command':
          ElementOperations.applyMaterials(
            baseController.activeCommand.getSelectedElement(),
            ElementOperations.materialSettings
          );
          return '';
        case 'queryactive':
          this.statusText = ' ';
          return true;
      }
    });
  }

  static registerViewCommands(kch, baseController) {
    kch.addKeyCommand(
      'view',
      'ui',
      'toggles the visibility of the view control panels',
      function (type, keys) {
        switch (type) {
          case 'command':
            ViewControlsManager.toggle();
            return 'Toggled View Controls';
          case 'queryactive':
            return true;
        }
      }
    );

    kch.addKeyCommand('view', 'center', '', function (type, keys) {
      if (type === 'command') {
        TransformView.animateTransformToPoint(
          baseController.getLastWorldPoint(),
          0.3,
          baseController.view
        );
        if (baseController._tentativeOriginalPoint) {
          TentativePointHandler._clearTentativePoint(baseController);
        }
        return;
      }
      if (type === 'queryactive') return true;
    });

    kch.addKeyCommand('view', 'depth', '', function (type, keys) {
      if (type === 'command') {
        TransformView.setViewDepth(
          baseController.getLastWorldPoint(),
          baseController.view
        );

        if (baseController._tentativeOriginalPoint) {
          TentativePointHandler._clearTentativePoint(baseController);
        }
        return;
      }
      if (type === 'queryactive') return true;
    });

    kch.addKeyCommand('view', 'oscillate', '', function (type, keys) {
      if (type === 'command') {
        CameraOrbitAnimator.toggle();
        return;
      }
      if (type === 'queryactive') return true;
    });
  }

  static registerFileCommands(kch, baseController) {
    kch.addKeyCommand('write', '', '', function (type, keys) {
      if (type === 'command') {
        FileUtilities.saveToFile(baseController.cadElements);
        return;
      }
      if (type === 'queryactive') return true;
    });

    kch.addKeyCommand('read', '', '', function (type, keys) {
      if (type === 'command') {
        FileUtilities.loadFromFile(baseController);
        return;
      }
      if (type === 'queryactive') return true;
    });

    kch.addKeyCommand('x', 'l', 'Load GLB', function (type, keys) {
      switch (type) {
        case 'command':
          ModelLoader.loadGLBModel(baseController.view.scene);
          return '';
        case 'queryactive':
          this.statusText = ' ';
          return true;
      }
    });

    kch.addKeyCommand('x', 'p', 'Load GLB (positioned)', function (type, keys) {
      switch (type) {
        case 'command':
          ModelLoader.loadGLBModel(
            baseController.view.scene,
            { min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: 1, z: 1 } },
            true
          );
          return '';
        case 'queryactive':
          this.statusText = ' ';
          return true;
      }
    });
  }

  static showHelpDialog(baseController) {
    const hostContainer =
      baseController?.domElement?.parentElement || document.body;
    const kch = KeyCommandHandler;

    const formatCmd = (cmd) => {
      const displayKey =
        cmd.displayKey ||
        cmd.key ||
        (cmd.numRange ? cmd.numRange[0] + '-' + cmd.numRange[1] : '');
      const pre = '<span style="color:#666">' + (cmd.pre || '') + '</span>';
      const key =
        '<strong style="color:#4af; font-size:1.2em; margin:0 1px;">' +
        displayKey +
        '</strong>';
      const post = '<span style="color:#666">' + (cmd.post || '') + '</span>';
      return pre + key + post;
    };

    const contentContainer = document.createElement('div');
    contentContainer.style.cssText =
      'display:flex; flex-direction:column; gap:12px; max-height:75vh; overflow-y:auto; padding:5px 10px; font-family:-apple-system, system-ui, sans-serif; font-size:12px; color:#ddd;';

    const createSection = (title, items) => {
      const sec = document.createElement('div');
      sec.style.cssText =
        'border:1px solid #333; background:rgba(20,20,20,0.8); border-radius:8px; padding:12px; box-shadow:0 4px 6px rgba(0,0,0,0.2);';

      const h = document.createElement('div');
      h.style.cssText =
        'font-weight:800; color:#4af; border-bottom:1px solid #444; padding-bottom:6px; margin-bottom:10px; text-transform:uppercase; font-size:11px; letter-spacing:1px;';
      h.textContent = title;
      sec.appendChild(h);

      const grid = document.createElement('div');
      grid.style.cssText =
        'display:grid; grid-template-columns:auto 1fr; gap:6px 15px; align-items:center;';

      items.forEach((item) => {
        const kWrap = document.createElement('div');
        kWrap.style.cssText =
          'font-family:monospace; white-space:nowrap; text-align:right;';
        kWrap.innerHTML = item.keyStr;

        const desc = document.createElement('div');
        desc.style.cssText = 'color:#bbb; line-height:1.3;';
        desc.textContent = item.desc;

        grid.appendChild(kWrap);
        grid.appendChild(desc);
      });

      sec.appendChild(grid);
      return sec;
    };

    const standaloneItems = [];
    const menuSections = [];

    kch.commands.forEach((cmd) => {
      if (cmd.children && cmd.children.length > 0) {
        const items = cmd.children.map((child) => {
          return {
            keyStr:
              formatCmd(cmd) +
              ' <span style="color:#555; margin:0 4px">\u203A</span> ' +
              formatCmd(child),
            desc: child.desc || '',
          };
        });
        menuSections.push({
          title:
            (cmd.pre || '') +
            (cmd.displayKey || cmd.key) +
            (cmd.post || '') +
            ' Menu',
          items: items,
        });
      } else {
        standaloneItems.push({
          keyStr: formatCmd(cmd),
          desc: cmd.desc || '',
        });
      }
    });

    if (standaloneItems.length > 0) {
      contentContainer.appendChild(
        createSection('Single Key Commands', standaloneItems)
      );
    }

    menuSections.forEach((sec) => {
      contentContainer.appendChild(createSection(sec.title, sec.items));
    });

    const directItems = [
      {
        keyStr: '<strong style="color:#4af;">L</strong>',
        desc: 'Smart Lock (lock nearest axis)',
      },
      {
        keyStr: '<strong style="color:#4af;">Space</strong>',
        desc: 'Toggle rectangular / polar / mixed mode',
      },
      {
        keyStr: '<strong style="color:#4af;">Left Click</strong>',
        desc: 'Place data point',
      },
      {
        keyStr: '<strong style="color:#4af;">Both Buttons</strong>',
        desc: 'Tentative snap to nearest element',
      },
      {
        keyStr: '<strong style="color:#4af;">Right Click</strong>',
        desc: 'Reset (release tentative \u2192 unlock \u2192 reset command)',
      },
      {
        keyStr: '<strong style="color:#4af;">Alt + Drag</strong>',
        desc: 'Rotate view',
      },
      {
        keyStr: '<strong style="color:#4af;">Shift + Drag</strong>',
        desc: 'Pan view',
      },
      {
        keyStr: '<strong style="color:#4af;">Alt + Scroll</strong>',
        desc: 'Zoom view',
      },
      {
        keyStr: '<strong style="color:#4af;">Type numbers</strong>',
        desc: 'Enter precise distance on active axis',
      },
      {
        keyStr: '<strong style="color:#4af;">Tab</strong>',
        desc: 'Switch active axis (X \u2194 Y)',
      },
      {
        keyStr: '<strong style="color:#4af;">Esc</strong>',
        desc: 'Clear all locks and input',
      },
    ];
    contentContainer.appendChild(
      createSection('Mouse & Direct Hotkeys', directItems)
    );

    // Store reference on controller so we can surgically close it on destroy
    baseController._helpDialog = UITools.makeDialog({
      title: 'Keyboard Shortcuts  \u2014  accuCad',
      content: contentContainer,
      width: '520px',
      height: 'auto',
      buttons: [{ label: 'Close', className: 'primary' }],
      appendTo: hostContainer,
      onClose: () => {
        baseController._helpDialog = null;
      },
    });
  }
}

/* recursi-meta
{
  "schema": 1,
  "lines": 639,
  "provides": [
    "SmartDrawKeys"
  ]
}
recursi-meta */
