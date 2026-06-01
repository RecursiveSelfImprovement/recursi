/**
 * COPY AND PASTE EVERYTHING BELOW THIS LINE INTO YOUR CHROME DEVTOOLS CONSOLE
 *
 * Usage:
 * Pause the video where you suspect an issue, then run:
 * debugChords(5)
 * (Where 5 is the +/- seconds around the current video time to analyze).
 */

window.debugChords = function (windowSec = 5) {
  const app = window.projectApp;
  if (!app || !app.gt || !app.gt.videoPlayer) {
    console.error(
      'Player not found! Ensure the app is loaded and a video is playing.'
    );
    return;
  }

  const currentTime = app.gt.videoPlayer.getCurrentRawTime();
  const veq = window.VideoEventQueueClass?.current;

  if (!veq || !veq.timedEvents) {
    console.error('No Piano Roll (VEQ) data loaded!');
    return;
  }

  // Get all notes
  const notes = veq.timedEvents.filter((e) => e.type === 'note');
  const minT = (currentTime - windowSec) * 1000;
  const maxT = (currentTime + windowSec) * 1000;

  // Filter notes within our time window (checking origT if it exists, otherwise t)
  const nearbyNotes = notes.filter((n) => {
    const baseT = n.origT !== undefined ? n.origT : n.t;
    return baseT >= minT && baseT <= maxT;
  });

  if (nearbyNotes.length === 0) {
    console.log(
      `No notes found within +/- ${windowSec} seconds of ${currentTime.toFixed(
        2
      )}s.`
    );
    return;
  }

  // Helper to convert MIDI to Note Name
  const midiToName = (mc) => {
    const names = [
      'C',
      'C#',
      'D',
      'D#',
      'E',
      'F',
      'F#',
      'G',
      'G#',
      'A',
      'A#',
      'B',
    ];
    return names[mc % 12] + (Math.floor(mc / 12) - 1);
  };

  const tableData = nearbyNotes.map((n) => {
    // Calculate the exact math the VideoEventScheduler uses for Live Arpeggiation
    const isLiveArp =
      window.arpEnabled && n.tr === 1 && n.chordRank !== undefined;
    let liveArpTime = n.t;
    let liveArpDur = n.d || 500;

    if (isLiveArp) {
      const spread = window.arpGlobalSpread || 0;
      const lenFactor = window.arpGlobalLenFactor || 1.0;
      const anchor = window.arpAnchor !== undefined ? window.arpAnchor : 1.0;
      const pattern = window.arpPattern || [0, 1, 2];
      const stepIndex = pattern.indexOf(n.chordRank);

      if (stepIndex !== -1) {
        const rawOffset = stepIndex * spread;
        const totalArpTime = (pattern.length - 1) * spread;
        const anchorShift = -(anchor * totalArpTime);
        liveArpTime = n.t + rawOffset + anchorShift;
        liveArpDur = liveArpDur * lenFactor;
      }
    }

    return {
      Note: midiToName(n.mc) + ` (${n.mc})`,
      Track: n.tr === 1 ? '1 (Backing)' : '0 (Melody)',
      'Orig T (ms)':
        n.origT !== undefined ? n.origT.toFixed(1) : n.t.toFixed(1),
      'Stored T (ms)': n.t.toFixed(1),
      'Live T (ms)': isLiveArp ? liveArpTime.toFixed(1) : n.t.toFixed(1),
      'Dur (ms)': (n.d || 500).toFixed(1),
      'Chord ID': n.chordId || '-',
      Rank: n.chordRank !== undefined ? n.chordRank : '-',
    };
  });

  console.log(
    `\n--- Chord Debug: +/- ${windowSec}s around ${currentTime.toFixed(2)}s ---`
  );
  console.log(
    `Live Arpeggiator is currently: ${window.arpEnabled ? 'ON' : 'OFF'}`
  );
  console.table(tableData);
  return 'Diagnostics complete.';
};

console.log('✅ Diagnostic tool loaded! Run: debugChords(5) in the console.');

/* recursi-meta
{
  "schema": 1,
  "lines": 113,
  "provides": [],
  "deps": []
}
recursi-meta */
