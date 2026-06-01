class PlaylistFormat {

  // Compact text format for playlist entries.
  //
  // Line shapes:
  //   ID Title                              (no piano roll)
  //   ID Title |                            (piano roll, no settings)
  //   ID Title | k=v,k=v,...                (piano roll with settings)
  //
  // Keys:
  //   t   transpose              int, default 0
  //   s   splitMethod            s|p|c (smart|pitch|chord), default s
  //   sp  splitPitch             int, default 60
  //   a   arp                    spread[/anchor[/len[/pat]]], omit if disabled
  //       pat letters: U=[0,1,2] D=[2,1,0] A=[0,2,1] B=[1,0,2]
  //   i   single track (no split) Instr[:vol[:oct]]
  //   i1  track 1                 Instr[:vol[:oct]]
  //   i2  track 2                 Instr[:vol[:oct]]
  //   st  startTime              number
  //   et  endTime                number
  //
  // Defaults for omitted subfields:
  //   volume=3.8, octaveShift=0, instrument=Celesta
  //   arpAnchor=0.8, arpLen=1, arpPattern=U
  //
  // Notes:
  //   - Track `volume` here is the per-instrument volume, NOT YouTube player volume.
  //     YouTube player volume is a user setting and is never stored per-video.
  //   - If only `i=` is given, a single instrument is stored without splitting.
  //   - Titles are cleaned of trailing "(Official Video)" style suffixes.

  // convert stuff in "stuff" to get methods (getArpPatterns).... no loose variables just methods

    static pf_state() {
    if (!this._state) this._state = {
      ARP_PATTERNS: { U: [0, 1, 2], D: [2, 1, 0], A: [0, 2, 1], B: [1, 0, 2] },
      SPLIT_LONG: {s: 'smart', p: 'pitch', c: 'chord'},
      SPLIT_SHORT: {smart: 's', pitch: 'p', chord: 'c'},
      DEFAULTS: { volume: 3.8, octaveShift: 0, instrument: 'Celesta', splitMethod: 'smart', splitPitch: 60, arpAnchor: 0.8, arpLen: 1, arpPattern: [0, 1, 2], transpose: 0 }
    };
    return this._state;
  }

  static get ARP_PATTERNS() { return { U: [0, 1, 2], D: [2, 1, 0], A: [0, 2, 1], B: [1, 0, 2] }; }

  static get SPLIT_LONG() { return {s: 'smart', p: 'pitch', c: 'chord'}; }

  static get SPLIT_SHORT() { return {smart: 's', pitch: 'p', chord: 'c'}; }

  static get DEFAULTS() { return { volume: 3.8, octaveShift: 0, instrument: 'Celesta', splitMethod: 'smart', splitPitch: 60, arpAnchor: 0.8, arpLen: 1, arpPattern: [0, 1, 2], transpose: 0 }; }

  static cleanTitle(title) {
    if (!title) return title;
    let out = title;
    const TITLE_SUFFIX_RE = /\s*[\(\[]\s*(?:official\s+)?(?:music\s+|lyric\s+|lyrics\s+)?(?:video|visualizer|visualiser|audio|m\/v|mv|hd|4k|film\s+version|live\s+video)\s*[\)\]]\s*$/i;
    const TITLE_SUFFIX_BARE_RE = /\s*[\(\[]\s*official\s*[\)\]]\s*$/i;
    for (let i = 0; i < 5; i++) {
      const before = out;
      out = out.replace(TITLE_SUFFIX_RE, '');
      out = out.replace(TITLE_SUFFIX_BARE_RE, '');
      out = out.replace(/\s*[---]\s*official\s+(music\s+|lyric\s+)?video\s*$/i, '');
      if (out === before) break;
    }
    return out.trim();
  }

  static encodeTrack(track) {
    if (!track) return null;
    const instr = track.instrument || this.DEFAULTS.instrument;
    const vol = track.volume;
    const oct = track.octaveShift;
    const hasOct = oct !== undefined && oct !== this.DEFAULTS.octaveShift;
    const hasVol = vol !== undefined && Math.abs(vol - this.DEFAULTS.volume) > 1e-9;
    if (hasOct) return `${instr}:${vol ?? this.DEFAULTS.volume}:${oct}`;
    if (hasVol) return `${instr}:${vol}`;
    return instr;
  }

  static decodeTrack(str) {
    if (!str) return null;
    const parts = str.split(':');
    const track = {
      instrument: parts[0] || this.DEFAULTS.instrument,
      volume: parts[1] !== undefined ? parseFloat(parts[1]) : this.DEFAULTS.volume,
      octaveShift: parts[2] !== undefined ? parseInt(parts[2], 10) : this.DEFAULTS.octaveShift,
    };
    if (isNaN(track.volume)) track.volume = this.DEFAULTS.volume;
    if (isNaN(track.octaveShift)) track.octaveShift = this.DEFAULTS.octaveShift;
    return track;
  }

  static patternToLetter(arr) {
    if (!Array.isArray(arr)) return 'U';
    for (const [letter, pat] of Object.entries(this.ARP_PATTERNS)) {
      if (pat.length === arr.length && pat.every((v, i) => v === arr[i])) return letter;
    }
    return 'U';
  }

  static letterToPattern(letter) {
    return this.ARP_PATTERNS[letter] || this.ARP_PATTERNS.U;
  }

  static serializeSettings(item) {
      if (!item || !item.hasPianoRoll) return null;
      const s = item.songSettings || {};
      const parts = [];

      // Check if this configuration matches the default split profile
      const isDefaultSplit =
        s.splitMethod === 'smart' &&
        s.arpEnabled === true &&
        (s.arpSpread === undefined || s.arpSpread === 30) &&
        (s.arpAnchor === undefined || Math.abs(s.arpAnchor - 0.8) < 1e-9) &&
        (s.arpLen === undefined || Math.abs(s.arpLen - 1.0) < 1e-9) &&
        this.patternToLetter(s.arpPattern) === 'U' &&
        Array.isArray(s.tracks) &&
        s.tracks.length === 2 &&
        (s.tracks[0]?.instrument || 'Piano') === 'Piano' &&
        (s.tracks[0]?.volume || 8.0) === 8.0 &&
        (s.tracks[0]?.octaveShift || 0) === 0 &&
        (s.tracks[1]?.instrument || 'Vibes') === 'Vibes' &&
        (s.tracks[1]?.volume || 4.0) === 4.0 &&
        (s.tracks[1]?.octaveShift || 0) === 0 &&
        (s.transpose === undefined || s.transpose === 0);

      if (isDefaultSplit) {
        const pitch = s.splitPitch !== undefined ? s.splitPitch : 60;
        parts.push(`ds=${this.midiToNoteName(pitch)}`);
        if (item.startTime !== undefined) parts.push(`st=${item.startTime}`);
        if (item.endTime !== undefined) parts.push(`et=${item.endTime}`);
        return parts.join(',');
      }

      if (s.transpose !== undefined && s.transpose !== this.DEFAULTS.transpose) parts.push(`t=${s.transpose}`);
      const split = s.splitMethod;
      if (split && split !== this.DEFAULTS.splitMethod) parts.push(`s=${this.SPLIT_SHORT[split] || 's'}`);
      if (s.splitPitch !== undefined && s.splitPitch !== this.DEFAULTS.splitPitch && (split === 'pitch' || split === 'smart' || split === undefined)) {
        parts.push(`sp=${s.splitPitch}`);
      }
      if (s.arpEnabled) {
        const spread = s.arpSpread !== undefined ? s.arpSpread : 89;
        const anchor = s.arpAnchor !== undefined ? s.arpAnchor : this.DEFAULTS.arpAnchor;
        const len = s.arpLen !== undefined ? s.arpLen : this.DEFAULTS.arpLen;
        const pat = this.patternToLetter(s.arpPattern);
        const anchorDefault = Math.abs(anchor - this.DEFAULTS.arpAnchor) < 1e-9;
        const lenDefault = Math.abs(len - this.DEFAULTS.arpLen) < 1e-9;
        const patDefault = pat === 'U';
        let arpStr = `${spread}`;
        if (!anchorDefault || !lenDefault || !patDefault) arpStr += `/${anchor}`;
        if (!lenDefault || !patDefault) arpStr += `/${len}`;
        if (!patDefault) arpStr += `/${pat}`;
        parts.push(`a=${arpStr}`);
      }
      const tracks = Array.isArray(s.tracks) ? s.tracks : [];
      if (tracks.length === 1) {
        const enc = this.encodeTrack(tracks[0]);
        if (enc && enc !== this.DEFAULTS.instrument) parts.push(`i=${enc}`);
        else if (enc) parts.push(`i=${enc}`);
      } else if (tracks.length >= 2) {
        const enc1 = this.encodeTrack(tracks[0]);
        const enc2 = this.encodeTrack(tracks[1]);
        parts.push(`i1=${enc1}`);
        parts.push(`i2=${enc2}`);
      }
      if (item.startTime !== undefined) parts.push(`st=${item.startTime}`);
      if (item.endTime !== undefined) parts.push(`et=${item.endTime}`);
      return parts.join(',');
    }

  static parseSettings(str) {
      const out = { hasPianoRoll: true, songSettings: undefined, startTime: undefined, endTime: undefined };
      if (!str || !str.trim()) return out;
      const s = {};
      let tracks = [null, null];
      let singleTrack = null;
      let hasAnyTrack = false;
      const kvPairs = str.split(',').map((p) => p.trim()).filter(Boolean);
      for (const pair of kvPairs) {
        const eq = pair.indexOf('=');
        if (eq === -1) {
          // Shorthand for default split with C4 as the default pitch
          if (pair.trim().toLowerCase() === 'ds') {
            s.splitMethod = 'smart';
            s.splitPitch = 60;
            s.arpEnabled = true;
            s.arpSpread = 30;
            s.arpAnchor = 0.8;
            s.arpLen = 1.0;
            s.arpPattern = [0, 1, 2];
            s.tracks = [
              { instrument: 'Piano', volume: 8.0, octaveShift: 0 },
              { instrument: 'Vibes', volume: 4.0, octaveShift: 0 }
            ];
            hasAnyTrack = true;
          }
          continue;
        }
        const key = pair.substring(0, eq).trim();
        const val = pair.substring(eq + 1).trim();
        switch (key) {
          case 'ds': {
            s.splitMethod = 'smart';
            s.splitPitch = val ? this.noteNameToMidi(val) : 60;
            s.arpEnabled = true;
            s.arpSpread = 30;
            s.arpAnchor = 0.8;
            s.arpLen = 1.0;
            s.arpPattern = [0, 1, 2];
            s.tracks = [
              { instrument: 'Piano', volume: 8.0, octaveShift: 0 },
              { instrument: 'Vibes', volume: 4.0, octaveShift: 0 }
            ];
            hasAnyTrack = true;
            break;
          }
          case 't': s.transpose = parseInt(val, 10); break;
          case 's': s.splitMethod = this.SPLIT_LONG[val] || 'smart'; break;
          case 'sp': s.splitPitch = parseInt(val, 10); break;
          case 'a': {
            s.arpEnabled = true;
            const segs = val.split('/');
            s.arpSpread = parseFloat(segs[0]);
            s.arpAnchor = segs[1] !== undefined ? parseFloat(segs[1]) : this.DEFAULTS.arpAnchor;
            s.arpLen = segs[2] !== undefined ? parseFloat(segs[2]) : this.DEFAULTS.arpLen;
            s.arpPattern = this.letterToPattern(segs[3] || 'U');
            break;
          }
          case 'i': singleTrack = this.decodeTrack(val); hasAnyTrack = true; break;
          case 'i1': tracks[0] = this.decodeTrack(val); hasAnyTrack = true; break;
          case 'i2': tracks[1] = this.decodeTrack(val); hasAnyTrack = true; break;
          case 'st': out.startTime = parseFloat(val); break;
          case 'et': out.endTime = parseFloat(val); break;
        }
      }
      if (s.transpose !== undefined && isNaN(s.transpose)) delete s.transpose;
      if (s.splitPitch !== undefined && isNaN(s.splitPitch)) delete s.splitPitch;
      if (singleTrack) s.tracks = [singleTrack];
      else if (hasAnyTrack) {
        if (!tracks[0]) tracks[0] = this.decodeTrack(this.DEFAULTS.instrument);
        if (!tracks[1]) tracks[1] = this.decodeTrack(this.DEFAULTS.instrument);
        s.tracks = tracks;
      }
      if (Object.keys(s).length > 0) {
        if (s.splitMethod === undefined) s.splitMethod = this.DEFAULTS.splitMethod;
        if (s.splitPitch === undefined && (s.splitMethod === 'smart' || s.splitMethod === 'pitch')) s.splitPitch = this.DEFAULTS.splitPitch;
        out.songSettings = s;
      }
      return out;
    }

  static serializeLine(item) {
    if (!item || !item.id) return '';
    const title = this.cleanTitle(item.title || item.id);
    let line = `${item.id} ${title}`;
    if (!item.hasPianoRoll) {
      if (item.startTime !== undefined || item.endTime !== undefined) {
        const parts = [];
        if (item.startTime !== undefined) parts.push(`st=${item.startTime}`);
        if (item.endTime !== undefined) parts.push(`et=${item.endTime}`);
        line += ` | ${parts.join(',')}`;
      }
      return line;
    }
    const settingsStr = this.serializeSettings(item);
    if (settingsStr && settingsStr.length > 0) line += ` | ${settingsStr}`;
    else line += ` |`;
    return line;
  }

  static parseLine(rawLine) {
    let line = rawLine.trim();
    if (!line) return null;
    let extraStr = '';
    let hasPipe = false;
    const pipeIdx = line.indexOf('|');
    if (pipeIdx !== -1) {
      extraStr = line.substring(pipeIdx + 1).trim();
      line = line.substring(0, pipeIdx).trim();
      hasPipe = true;
    }
    const spaceIdx = line.indexOf(' ');
    let id, title;
    if (spaceIdx === -1) {
      id = line;
      title = line;
    } else {
      id = line.substring(0, spaceIdx);
      title = line.substring(spaceIdx + 1).trim();
    }
    if (!id) return null;
    if (!(id.length === 11 || id.includes('.') || id.includes('/'))) return null;
    const item = { id, title: this.cleanTitle(title) || id };
    if (!hasPipe) return item;
    if (extraStr.startsWith('{')) {
      try {
        const json = JSON.parse(extraStr);
        if (json.hasPianoRoll) item.hasPianoRoll = true;
        if (json.songSettings) {
          item.songSettings = json.songSettings;
          delete item.songSettings.youtubeVolume;
          delete item.songSettings.videoVolume;
          delete item.songSettings.ytVolume;
        }
        if (json.startTime !== undefined) item.startTime = json.startTime;
        if (json.endTime !== undefined) item.endTime = json.endTime;
        return item;
      } catch (e) { return item; }
    }
    const parsed = this.parseSettings(extraStr);
    if (parsed.hasPianoRoll) item.hasPianoRoll = true;
    if (parsed.songSettings) item.songSettings = parsed.songSettings;
    if (parsed.startTime !== undefined) item.startTime = parsed.startTime;
    if (parsed.endTime !== undefined) item.endTime = parsed.endTime;
    return item;
  }

  static midiToNoteName(mc) {
      const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const name = names[mc % 12];
      const octave = Math.floor(mc / 12) - 1;
      return name + octave;
    }

  static noteNameToMidi(name) {
      if (!name) return 60;
      const s = name.trim().toUpperCase();
      const match = s.match(/^([A-G]#?|B[BFL]?)(-?\d+)$/);
      if (!match) {
        const num = parseInt(s, 10);
        return isNaN(num) ? 60 : num;
      }
      const noteNames = { 'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11 };
      const base = noteNames[match[1]];
      if (base === undefined) return 60;
      const octave = parseInt(match[2], 10);
      return (octave + 1) * 12 + base;
    }
}