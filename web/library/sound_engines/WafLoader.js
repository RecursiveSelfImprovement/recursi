class WafLoader {
    constructor(player) {
      this.player = player;
      this.loadingInstruments = new Set();
      this.loadedScripts = new Set();
      this.loadPromises = {};
    }

    loadInstrument(instrumentName, url, variableName) {
      if (this.player.activePresets[instrumentName]) return Promise.resolve();
      if (this.player.activePresets[instrumentName] === null) {
        return Promise.reject(new Error(`Instrument ${instrumentName} failed previous load attempt.`));
      }
      if (this.loadPromises[variableName]) return this.loadPromises[variableName];

      const loadPromise = new Promise((resolve, reject) => {
        if (this.loadedScripts.has(url)) {
          this._waitForVariable(variableName, instrumentName).then(resolve).catch(reject);
          return;
        }

        const script = document.createElement('script');
        script.setAttribute('type', 'text/javascript');
        script.setAttribute('src', url);
        script.async = true;

        script.onload = () => {
          this.loadedScripts.add(url);
          this._waitForVariable(variableName, instrumentName).then(resolve).catch(reject);
        };

        script.onerror = () => {
          this.player.activePresets[instrumentName] = null;
          reject(new Error(`Failed to load script for ${instrumentName} from ${url}`));
        };
        document.head.appendChild(script);
      });

      this.loadPromises[variableName] = loadPromise;
      return loadPromise;
    }

    _waitForVariable(variableName, instrumentName) {
      return new Promise((resolve, reject) => {
        const checkInterval = 100;
        const maxWaitTime = 10000;
        let elapsedTime = 0;

        const check = async () => {
          if (window[variableName]) {
            try {
              await this.player._cachePreset(instrumentName, window[variableName]);
              if (this.player.activePresets[instrumentName]) resolve();
              else reject(new Error(`Failed to process preset for ${instrumentName}`));
            } catch (e) {
              reject(e);
            }
          } else {
            elapsedTime += checkInterval;
            if (elapsedTime >= maxWaitTime) {
              this.player.activePresets[instrumentName] = null;
              reject(new Error(`Timeout waiting for instrument data: ${instrumentName}`));
            } else {
              setTimeout(check, checkInterval);
            }
          }
        };
        check();
      });
    }

  
}