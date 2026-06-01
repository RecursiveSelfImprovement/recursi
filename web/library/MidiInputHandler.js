class MidiInputHandler {
    static _getState() {
    if (!this.hasOwnProperty('_state')) {
      Object.defineProperty(this, '_state', {
        value: {
          midiAccess: null,
          inputList: [],
          outputList: [],
          dataHandlers: [],
          isInitialized: false
        },
        writable: true,
        configurable: true
      });
    }
    return this._state;
  }

  static init(callback) {
    if (this._getState().isInitialized) {
      if (callback) callback({ success: 'MIDI already initialized' });
      return;
    }

    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then(
        (midi) => {
          this._getState().midiAccess = midi;
          this._readInputsAndOutputs();

          midi.onstatechange = (event) => {
            console.log(
              'MIDI state change:',
              event.port.name,
              event.port.state
            );
            this._readInputsAndOutputs();
          };

          this._getState().isInitialized = true;

          if (this._getState().inputList.length === 0) {
            if (callback)
              callback({
                warning: 'MIDI initialized but no devices connected',
              });
          } else {
            if (callback)
              callback({
                success: `MIDI initialized with ${this._getState().inputList.length} device(s)`,
              });
          }
        },
        (msg) => {
          console.log('MIDI initialization failed:', msg);
          if (callback) callback({ error: 'Failed to initialize MIDI' });
        }
      );
    } else {
      console.log('MIDI access not supported');
      if (callback)
        callback({ error: 'MIDI access requires a compatible browser' });
    }
  }

  static addDataHandler(cb) {
    this._getState().dataHandlers.push(cb);
    this._attachHandlers();
  }

  static removeDataHandler(cb) {
    const index = this._getState().dataHandlers.indexOf(cb);
    if (index > -1) {
      this._getState().dataHandlers.splice(index, 1);
    }
  }

  static _attachHandlers() {
    for (let i = 0; i < this._getState().inputList.length; i++) {
      this._getState().inputList[i].onmidimessage = (event) => {
        const data = Array.from(event.data);
        for (const handler of this._getState().dataHandlers) {
          handler({ type: data[0], data: data });
        }
      };
    }
  }

  static _readInputsAndOutputs() {
    const inputs = [];
    const outputs = [];
    if (!this._getState().midiAccess) return;
    this._getState().midiAccess.inputs.forEach((input) => inputs.push(input));
    this._getState().midiAccess.outputs.forEach((output) => outputs.push(output));
    this._getState().inputList = inputs;
    this._getState().outputList = outputs;
    this._attachHandlers();
  }

  static resetHandlers() {
    if (this._getState().inputList) {
      for (let i = 0; i < this._getState().inputList.length; i++) {
        this._getState().inputList[i].onmidimessage = null;
      }
    }
  }

  
}

