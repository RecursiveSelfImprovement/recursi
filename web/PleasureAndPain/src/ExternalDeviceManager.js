class ExternalDeviceManager {
    constructor(app, mainApp) {
      this.app = app;
      this.mainApp = mainApp;
      this.bulbInstances = [];
      this.buttonInstances = [];
      this.interactiveMeshes = [];
    }

    clearDevices() {
      if (this.bulbInstances) {
        for (const bulb of this.bulbInstances) {
          this.app.scene.remove(bulb.group);
          bulb.group.traverse((child) => {
            if (child.isMesh) {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material))
                  child.material.forEach((m) => m.dispose());
                else child.material.dispose();
              }
            }
          });
        }
      }
      this.bulbInstances = [];

      if (this.buttonInstances) {
        for (const btn of this.buttonInstances) {
          this.app.scene.remove(btn.group);
          btn.group.traverse((child) => {
            if (child.isMesh) {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material))
                  child.material.forEach((m) => m.dispose());
                else child.material.dispose();
              }
            }
          });
        }
      }
      this.buttonInstances = [];
      this.interactiveMeshes = [];
    }

    spawnDevices(count) {
      this.clearDevices();
      if (!this.mainApp.bbox) return;

      const THREE = this.app.THREE;
      const min = this.mainApp.bbox.min;
      const max = this.mainApp.bbox.max;

      const faces = ['left', 'right', 'top', 'bottom', 'front', 'back'];
      const themeColors = this.mainApp.getThemeColors();

      const numToSpawn = Math.max(0, count);

      for (let i = 0; i < numToSpawn; i++) {
        const isBulb = Math.random() > 0.5;
        const face = faces[Math.floor(Math.random() * faces.length)];

        let x = 0,
          y = 0,
          z = 0;
        let orientation = 'top';
        const margin = 0.22;

        switch (face) {
          case 'left':
            x = min.x;
            y = this._getRandomInRange(min.y, max.y, margin);
            z = this._getRandomInRange(min.z, max.z, margin);
            orientation = 'left';
            break;
          case 'right':
            x = max.x;
            y = this._getRandomInRange(min.y, max.y, margin);
            z = this._getRandomInRange(min.z, max.z, margin);
            orientation = 'right';
            break;
          case 'top':
            x = this._getRandomInRange(min.x, max.x, margin);
            y = max.y;
            z = this._getRandomInRange(min.z, max.z, margin);
            orientation = 'top';
            break;
          case 'bottom':
            x = this._getRandomInRange(min.x, max.x, margin);
            y = min.y;
            z = this._getRandomInRange(min.z, max.z, margin);
            orientation = 'bottom';
            break;
          case 'front':
            x = this._getRandomInRange(min.x, max.x, margin);
            y = this._getRandomInRange(min.y, max.y, margin);
            z = max.z;
            orientation = 'front';
            break;
          case 'back':
            x = this._getRandomInRange(min.x, max.x, margin);
            y = this._getRandomInRange(min.y, max.y, margin);
            z = min.z;
            orientation = 'back';
            break;
        }

        const colorHex =
          themeColors[Math.floor(Math.random() * themeColors.length)].getHex();
        const scale = 0.5 + Math.random() * 0.4;

        if (isBulb) {
          const bulb = Simple3dShapes.createBulb(this.app, {
            color: colorHex,
            orientation,
            position: { x, y, z },
            scale,
            onClick: (isOn) => {
              this.playSwitchSound(isOn);
            },
          });
          this._registerBulbInstance(bulb);
        } else {
          const btn = Simple3dShapes.createButton(this.app, {
            color: colorHex,
            orientation,
            position: { x, y, z },
            scale,
            onClick: () => {
              this.playClickSound();
              this.mainApp.startWalkerFromButton(btn);
            },
          });
          this._registerButtonInstance(btn);
        }
      }
    }

    _getRandomInRange(minVal, maxVal, margin) {
      if (maxVal - minVal < margin * 2) {
        return (minVal + maxVal) / 2;
      }
      return minVal + margin + Math.random() * (maxVal - minVal - margin * 2);
    }

    _registerBulbInstance(bulb) {
      bulb.isOn = false;
      bulb.maxIntensity = 4.0;
      this.bulbInstances.push(bulb);

      bulb.group.traverse((child) => {
        if (child.isMesh) {
          this.interactiveMeshes.push(child);
        }
      });
    }

    _registerButtonInstance(btn) {
      btn.pressActive = false;
      btn.pressStartTime = 0;
      this.buttonInstances.push(btn);

      btn.group.traverse((child) => {
        if (child.isMesh) {
          this.interactiveMeshes.push(child);
        }
      });
    }

    toggleBulbInstance(bulb) {
      bulb.isOn = !bulb.isOn;
      this.playSwitchSound(bulb.isOn);
      if (typeof bulb.onClick === 'function') {
        bulb.onClick(bulb.isOn);
      }
    }

    pressButtonInstance(btn) {
      btn.pressActive = true;
      btn.pressStartTime = Date.now();
      this.playClickSound();
      if (typeof btn.onClick === 'function') {
        btn.onClick();
      }
    }

    playClickSound() {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } catch (e) {}
    }

    playSwitchSound(state) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(state ? 750 : 380, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      } catch (e) {}
    }
  }