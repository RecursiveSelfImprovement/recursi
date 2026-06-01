
// ═══════════════════════════════════════════════════════════
// Self-contained Dictation Widget (runs inside iframe)
// ═══════════════════════════════════════════════════════════

const editor = document.getElementById('editor');
const listenBtn = document.getElementById('listenBtn');
const copyBtn = document.getElementById('copyBtn');
const clearBtn = document.getElementById('clearBtn');
const editBtn = document.getElementById('editBtn');
const statusEl = document.getElementById('status');
const debugLog = document.getElementById('debugLog');

let recognition = null;
let isListening = false;
let isEditing = false;
let modifierHeld = false;
let lastTokens = [];
let pendingPunct = [];
let tokenSerial = 1;
let interimCommitTimer = null;
let lastInterimText = '';
const INTERIM_DELAY = 1200;
let spaceWidth = null;

// Popup elements (created at init)
let popupElement = null;
let popupTextElement = null;
let popupSvgPath = null;
let popupSvgConnector = null;
let isPopupVisible = false;
let lastCaretRect = null;
let lastRange = null;
let currentlyHighlighted = [];
let openQuoteSpans = [];

const punctMap = {
  'period': '.', 'comma': ',', 'question mark': '?',
  'exclamation point': '!', 'exclamation mark': '!', 'exclamation': '!',
  'new line': '\n\n', 'newline': '\n\n', 'new paragraph': '\n\n',
  'colon': ':', 'semicolon': ';'
};

const wordToNum = {
  one:1, two:2, three:3, four:4, five:5,
  six:6, seven:7, eight:8, nine:9, ten:10
};

function log(msg) {
  const t = new Date().toLocaleTimeString().split(' ')[0];
  const div = document.createElement('div');
  div.textContent = '[' + t + '] ' + msg;
  debugLog.appendChild(div);
  debugLog.scrollTop = debugLog.scrollHeight;
}

// ── Speech Recognition ─────────────────────────────────────
function setupRecognition() {
  const API = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!API) { log('Speech API not supported'); return; }
  recognition = new API();
  recognition.lang = 'en-US';
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = handleResult;
  recognition.onerror = (e) => { log('Error: ' + e.error); stopListening(); };
  recognition.onend = () => { if (isListening) { try { recognition.start(); } catch(e){} } };
}

function startListening() {
  if (!recognition || isListening) return;
  editor.focus();
  const sel = window.getSelection();
  sel.selectAllChildren(editor);
  sel.collapseToEnd();
  isListening = true;
  try { recognition.start(); } catch(e){}
  updateUI();
  log('Listening started');
}

function stopListening() {
  if (!recognition || !isListening) return;
  cancelInterimTimer();
  isListening = false;
  try { recognition.stop(); } catch(e){}
  updatePopup('');
  updateUI();
  log('Listening stopped');
}

function handleResult(event) {
  let interim = '';
  let final = '';
  let anyFinal = false;

  for (let i = event.resultIndex; i < event.results.length; i++) {
    if (event.results[i].isFinal) {
      final += event.results[i][0].transcript;
      anyFinal = true;
    } else {
      interim += event.results[i][0].transcript;
    }
  }

  // Show interim
  if (interim) {
    const tokens = tokenise(interim);
    lastTokens = tokens;
    const display = renderTokens(tokens);
    lastInterimText = display;
    updatePopup(display);
    const editorRect = editor.getBoundingClientRect();
    if (lastCaretRect) positionPopup(lastCaretRect, editorRect);
    else showPopupCentered(editorRect);
    resetInterimTimer();
  }

  // Commit final
  if (anyFinal) {
    cancelInterimTimer();
    const cmd = parseCommand(final);
    if (cmd.text && cmd.text.trim()) {
      log('Final: "' + cmd.text.substring(0, 50) + '"');
      insertText(cmd.text, false);
    }
    if (cmd.action) requestAnimationFrame(cmd.action);
    updatePopup('');
    lastInterimText = '';
    lastTokens = [];
    pendingPunct = [];
  }
}

// ── Auto-commit timer ──────────────────────────────────────
function resetInterimTimer() {
  cancelInterimTimer();
  interimCommitTimer = setTimeout(commitInterim, INTERIM_DELAY);
}

function cancelInterimTimer() {
  if (interimCommitTimer) { clearTimeout(interimCommitTimer); interimCommitTimer = null; }
}

function commitInterim() {
  interimCommitTimer = null;
  const text = lastInterimText;
  if (!text || !text.trim()) return;

  log('Auto-commit: "' + text.substring(0, 50) + '"');
  const cmd = parseCommand(text);
  if (cmd.text && cmd.text.trim()) insertText(cmd.text, false);
  if (cmd.action) requestAnimationFrame(cmd.action);

  updatePopup('');
  lastInterimText = '';
  lastTokens = [];
  pendingPunct = [];

  // Restart recognition to clear buffer
  if (isListening && recognition) {
    try { recognition.abort(); } catch(e){}
  }
}

// ── Text Processing ────────────────────────────────────────
function processTranscript(raw) {
  const tokens = raw.trim().split(/\s+/);
  if (!tokens.length || (tokens.length === 1 && !tokens[0])) return '';

  let out = '';
  let cap = false;

  for (let i = 0; i < tokens.length; i++) {
    const t1 = tokens[i].toLowerCase();
    const t2 = (tokens[i+1] || '').toLowerCase();
    const twoKey = t1 + ' ' + t2;

    let punct = punctMap[twoKey];
    let consumed = 0;
    if (punct) { consumed = 2; }
    else { punct = punctMap[t1]; if (punct) consumed = 1; }

    if (punct) {
      if (out.endsWith(' ')) out = out.slice(0, -1);
      out += punct;
      if (/[.!?]|\n\n/.test(punct)) cap = true;
      if (/[.,!?;:]/.test(punct)) out += ' ';
      i += consumed - 1;
    } else {
      let word = tokens[i];
      if (word.toLowerCase() === 'i') word = 'I';
      if (cap) { word = word.charAt(0).toUpperCase() + word.slice(1); cap = false; }
      out += word + ' ';
    }
  }
  return out.replace(/^[ \t]+/, '').replace(/[ \t]+$/, '');
}

function insertText(text, isRaw) {
  let frag = isRaw ? text : processTranscript(text);
  if (!frag) return;

  const content = editor.textContent || '';

  // Context-aware casing
  if (/[a-zA-Z0-9]/.test(frag)) {
    if (!content.length || /[.!?\n]\s*$/.test(content)) {
      frag = frag.charAt(0).toUpperCase() + frag.slice(1);
    }
  }

  // Context-aware spacing
  const last = content.charAt(content.length - 1);
  if (content.length && !/^[.,;:!?\n]/.test(frag) && last && !/\s/.test(last)) {
    frag = ' ' + frag;
  }

  editor.focus();
  const sel = window.getSelection();
  if (!sel.rangeCount || !editor.contains(sel.anchorNode)) {
    sel.selectAllChildren(editor);
    sel.collapseToEnd();
  }

  const parts = frag.split('\n');
  parts.forEach((part, idx) => {
    if (part.length) document.execCommand('insertText', false, part);
    if (idx < parts.length - 1) document.execCommand('insertLineBreak');
  });

  updateUI();
  editor.scrollTop = editor.scrollHeight;
}

// ── Voice Commands ─────────────────────────────────────────
function parseCommand(transcript) {
  const c = transcript.trim();
  let m;

  m = c.match(/^(.*)\bsend\s+dictation\s*$/i);
  if (m) return { text: m[1].trim(), action: () => copyToClipboard(true) };

  m = c.match(/^(.*)\bcopy\s+(?:to\s+)?clipboard\s*$/i);
  if (m) return { text: m[1].trim(), action: () => copyToClipboard() };

  m = c.match(/^(.*)\bquick\s+edit\s*$/i);
  if (m) return { text: m[1].trim(), action: () => toggleEdit() };

  m = c.match(/^(.*)\bdelete\s+(?:the\s+last\s+)?(\w+)\s+words?\s*$/i);
  if (m) {
    const prefix = m[1].trim();
    let count = parseInt(m[2], 10);
    if (isNaN(count)) count = wordToNum[m[2].toLowerCase()];
    if (count >= 1 && count <= 10) return { text: prefix, action: () => deleteWords(count) };
  }

  m = c.match(/^(.*)\bclear\s+all\s*$/i);
  if (m) return { text: m[1].trim(), action: () => clearContent() };

  m = c.match(/^(.*)\bselect\s+all\s*$/i);
  if (m) return { text: m[1].trim(), action: () => { editor.focus(); document.execCommand('selectAll'); } };

  return { text: c, action: null };
}

function deleteWords(count) {
  editor.focus();
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  sel.collapseToEnd();
  for (let i = 0; i < count; i++) {
    if (sel.modify) sel.modify('extend', 'backward', 'word');
  }
  sel.getRangeAt(0).deleteContents();
  updateUI();
}

// ── Clipboard ──────────────────────────────────────────────
function copyToClipboard(andClear) {
  if (isEditing) toggleEdit();
  const text = editor.textContent || '';
  if (!text.trim()) return;

  // Cannot use navigator.clipboard in iframe — send to parent page
  window.parent.postMessage({
    type: 'aardvark-dictation-copy',
    text: text
  }, '*');

  log('Sent ' + text.length + ' chars to parent for copy');
  const orig = copyBtn.textContent;
  copyBtn.textContent = '✓ Copied!';
  setTimeout(() => { copyBtn.textContent = orig; }, 1500);

  if (andClear) {
    clearContent();
  }
}


// ── Token Serialization ────────────────────────────────────
function tokenise(str) {
  const words = str.trim().split(/\s+/).filter(Boolean);
  const prev = lastTokens;
  const used = new Set();
  return words.map(w => {
    let serial = null;
    for (let i = 0; i < prev.length; i++) {
      if (!used.has(i) && prev[i].word === w) { serial = prev[i].serial; used.add(i); break; }
    }
    if (serial === null) serial = tokenSerial++;
    return { word: w, serial };
  });
}

function renderTokens(tokens) {
  const pm = {};
  pendingPunct.forEach(p => { (pm[p.serial] = pm[p.serial] || []).push(p.char); });
  return tokens.map((t, i) => {
    let s = t.word;
    if (pm[t.serial]) s += pm[t.serial].join('');
    return s;
  }).join(' ');
}


// ── Popup system (ported from original DictationWidget) ────
function setupPopupUI() {
  popupTextElement = document.createElement('span');
  popupElement = document.createElement('div');
  popupElement.className = 'tentative-popup';
  popupElement.appendChild(popupTextElement);

  const svgNS = 'http://www.w3.org/2000/svg';
  popupSvgPath = document.createElementNS(svgNS, 'path');
  popupSvgConnector = document.createElementNS(svgNS, 'svg');
  popupSvgConnector.setAttribute('class', 'tentative-popup-connector');
  popupSvgConnector.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;display:none;pointer-events:none;overflow:visible;z-index:2147483646;';
  popupSvgConnector.appendChild(popupSvgPath);

  document.body.appendChild(popupElement);
  document.body.appendChild(popupSvgConnector);
  isPopupVisible = false;
}

function updatePopup(text) {
  if (text) {
    popupTextElement.textContent = text;
    showPopup();
  } else {
    hidePopup();
  }
}

function showPopup() {
  if (isPopupVisible) return;
  isPopupVisible = true;
}

function hidePopup() {
  if (!isPopupVisible) return;
  isPopupVisible = false;
  if (popupElement) popupElement.style.display = 'none';
  if (popupSvgConnector) popupSvgConnector.style.display = 'none';
}

function positionPopup(caretRect, editorRect) {
  if (!isPopupVisible || !caretRect || !editorRect) return;

  popupElement.style.display = 'block';
  popupSvgConnector.style.display = 'block';

  // Force reflow
  void popupElement.offsetHeight;

  const pWidth = popupElement.offsetWidth;
  const gap = 10;
  const desiredTop = caretRect.bottom + gap;

  // Center horizontally around caret
  let desiredLeft = caretRect.left + caretRect.width / 2 - pWidth / 2;

  // Clamp horizontally
  const pad = 10;
  if (desiredLeft < pad) desiredLeft = pad;
  if (desiredLeft + pWidth > window.innerWidth - pad) {
    desiredLeft = Math.max(pad, window.innerWidth - pad - pWidth);
  }

  popupElement.style.transform = 'translate3d(' + Math.round(desiredLeft) + 'px, ' + Math.round(desiredTop) + 'px, 0)';

  // Draw connector
  requestAnimationFrame(() => {
    if (popupElement) {
      const popupRect = popupElement.getBoundingClientRect();
      drawPopupConnector(caretRect, popupRect);
    }
  });
}

function drawPopupConnector(caretRect, popupRect) {
  if (!popupSvgPath) return;

  const startX = caretRect.left + caretRect.width / 2;
  const startY = caretRect.bottom;
  const endX = popupRect.left + popupRect.width / 2;
  const endY = popupRect.top;

  const tension = 30;
  popupSvgPath.setAttribute('d',
    'M ' + startX + ',' + startY +
    ' C ' + startX + ',' + (startY + tension) +
    ' ' + endX + ',' + (endY - tension) +
    ' ' + endX + ',' + endY
  );
}

function showPopupCentered(editorRect) {
  if (!isPopupVisible || !editorRect) return;
  if (popupSvgConnector) popupSvgConnector.style.display = 'none';
  popupElement.style.display = 'block';
  void popupElement.offsetHeight;
  const popupRect = popupElement.getBoundingClientRect();
  const top = editorRect.top + editorRect.height / 2 - popupRect.height / 2;
  const left = editorRect.left + editorRect.width / 2 - popupRect.width / 2;
  popupElement.style.transform = 'translate3d(' + Math.round(left) + 'px, ' + Math.round(top) + 'px, 0)';
}

function handleCaretActivity() {
  const sel = window.getSelection();
  if (!sel.rangeCount) { hidePopup(); return; }
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) { hidePopup(); return; }

  lastRange = range.cloneRange();
  const posRange = range.cloneRange();
  posRange.collapse(true);

  let finalCaretRect = null;

  const rects = posRange.getClientRects();
  if (rects && rects.length > 0) {
    const r = rects[0];
    finalCaretRect = {
      left: r.left, top: r.top,
      width: r.width || 8, height: r.height || 16,
      right: r.right || r.left + (r.width || 8),
      bottom: r.bottom || r.top + (r.height || 16)
    };
  } else {
    // Fallback: boundingClientRect
    const b = posRange.getBoundingClientRect ? posRange.getBoundingClientRect() : null;
    if (b && (b.width || b.height) && (b.left || b.top || b.right || b.bottom)) {
      finalCaretRect = {
        left: b.left, top: b.top,
        width: b.width || 8, height: b.height || 16,
        right: b.right || b.left + (b.width || 8),
        bottom: b.bottom || b.top + (b.height || 16)
      };
    } else {
      // Fallback 2: inject marker
      try {
        const marker = document.createElement('span');
        marker.textContent = '\u200B';
        marker.style.cssText = 'display:inline-block;width:0;height:1em;vertical-align:baseline;pointer-events:none;';
        const tempRange = posRange.cloneRange();
        tempRange.insertNode(marker);
        const mr = marker.getBoundingClientRect();
        finalCaretRect = {
          left: mr.left, top: mr.top,
          width: mr.width || 8, height: mr.height || 16,
          right: mr.right || mr.left + 8,
          bottom: mr.bottom || mr.top + 16
        };
        marker.remove();
        sel.removeAllRanges();
        sel.addRange(range);
      } catch(e) {
        finalCaretRect = null;
      }
    }
  }

  lastCaretRect = finalCaretRect;

  const editorRect = editor.getBoundingClientRect();
  if (lastCaretRect) {
    positionPopup(lastCaretRect, editorRect);
  } else {
    showPopupCentered(editorRect);
  }
}

// ── Quick Edit ─────────────────────────────────────────────
function toggleEdit() {
  if (isListening) stopListening();
  isEditing = !isEditing;
  if (isEditing) {
    spanifyContent();
    editor.addEventListener('mousemove', handleEditMouseMove);
    editor.addEventListener('mouseleave', clearHighlights);
  } else {
    clearHighlights();
    deSpanifyContent();
    editor.removeEventListener('mousemove', handleEditMouseMove);
    editor.removeEventListener('mouseleave', clearHighlights);
  }
  updateUI();
}

function getSpaceWidth() {
  if (spaceWidth) return spaceWidth;
  const m = document.createElement('span');
  m.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font:' + window.getComputedStyle(editor).font;
  m.textContent = ' ';
  document.body.appendChild(m);
  spaceWidth = m.getBoundingClientRect().width;
  m.remove();
  return spaceWidth;
}

function spanifyContent() {
  const sw = getSpaceWidth();
  const text = editor.textContent;
  editor.contentEditable = 'false';
  editor.innerHTML = '';

  text.split('\n').forEach((line, li, lines) => {
    (line.match(/\S+|\s+/g) || []).forEach(tok => {
      if (/\S/.test(tok)) {
        const s = document.createElement('span');
        s.className = 'qe-word';
        s.textContent = tok;
        editor.appendChild(s);
      } else {
        for (let i = 0; i < tok.length; i++) {
          const s = document.createElement('span');
          s.className = 'qe-space';
          s.style.width = sw + 'px';
          s.textContent = '\u200B';
          editor.appendChild(s);
        }
      }
    });
    if (li < lines.length - 1) editor.appendChild(document.createElement('br'));
  });
}

function deSpanifyContent() {
  let text = '';
  editor.childNodes.forEach(n => {
    if (n.nodeName === 'BR') text += '\n';
    else if (n.nodeType === 1 && n.classList.contains('qe-space')) text += ' ';
    else text += n.textContent;
  });
  editor.contentEditable = 'true';
  editor.textContent = text;
  editor.focus();
  const sel = window.getSelection();
  sel.selectAllChildren(editor);
  sel.collapseToEnd();
}

function handleEditMouseMove(e) {
  const t = e.target;
  if (!t || (!t.classList.contains('qe-word') && !t.classList.contains('qe-space'))) {
    clearHighlights(); return;
  }
  clearHighlights();
  const hl = (el, cls) => { if (el && (el.classList.contains('qe-word') || el.classList.contains('qe-space'))) { el.classList.add(cls); currentlyHighlighted.push(el); } };

  const space = findTargetSpace(t, e.clientX);
  if (space) {
    hl(space, 'hl-space');
    hl(space.previousElementSibling, 'hl-ctx');
    hl(space.nextElementSibling, 'hl-ctx');
  } else if (t.classList.contains('qe-word')) {
    hl(t, 'hl-main');
  }
}

function clearHighlights() {
  currentlyHighlighted.forEach(el => el.classList.remove('hl-main','hl-ctx','hl-space'));
  currentlyHighlighted = [];
}

function findTargetSpace(t, cx) {
  if (t.classList.contains('qe-space')) return t;
  if (t.classList.contains('qe-word')) {
    const r = t.getBoundingClientRect();
    const rel = (cx - r.left) / r.width;
    if (rel < 0.5) { const p = t.previousElementSibling; return (p && p.classList.contains('qe-space')) ? p : t.nextElementSibling; }
    else { const n = t.nextElementSibling; return (n && n.classList.contains('qe-space')) ? n : t.previousElementSibling; }
  }
  return null;
}

// ── Edit keyboard handlers ─────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Control' || e.key === 'Meta') { modifierHeld = true; updateUI(); }

  if (isEditing) {
    const space = editor.querySelector('.hl-space');
    if (space) {
      if (['.', ',', ';', ':'].includes(e.key)) { e.preventDefault(); smartPunct(e.key, space); }
      else if (e.key === '"') { e.preventDefault(); smartQuote(space); }
      else if (e.key === 'Shift') { e.preventDefault(); toggleCase(space); }
      else if (e.key === ' ') { e.preventDefault(); clearPunct(space); }
    } else if (e.key === 'Shift') {
      const word = editor.querySelector('.hl-main');
      if (word) { e.preventDefault(); toggleCase(word, true); }
    }
  }

  if (isListening && !isEditing && ['.', ',', '?'].includes(e.key)) {
    e.preventDefault();
    if (lastTokens.length) {
      pendingPunct.push({ serial: lastTokens[lastTokens.length-1].serial, char: e.key });
      interimBar.textContent = renderTokens(lastTokens);
    } else {
      insertText(e.key, true);
    }
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'Control' || e.key === 'Meta') { modifierHeld = false; updateUI(); }
});

function smartPunct(key, space) {
  const prev = space.previousElementSibling;
  const next = space.nextElementSibling;
  if (prev && prev.classList.contains('qe-word')) {
    let t = prev.textContent; if (/[.,?!;:]$/.test(t)) t = t.slice(0,-1); prev.textContent = t + key;
  }
  if (key === '.' && next && next.classList.contains('qe-word')) {
    let t = next.textContent; if (t.length) next.textContent = t[0].toUpperCase() + t.slice(1);
  }
}

function smartQuote(space) {
  if (openQuoteSpans.length) {
    const prev = space.previousElementSibling;
    if (prev && prev.classList.contains('qe-word')) { prev.textContent += '"'; openQuoteSpans = []; }
  } else {
    const next = space.nextElementSibling;
    if (next && next.classList.contains('qe-word')) { next.textContent = '"' + next.textContent; openQuoteSpans.push(next); }
  }
}

function toggleCase(span, isSingle) {
  const word = isSingle ? span : span.nextElementSibling;
  if (word && word.classList.contains('qe-word')) {
    let t = word.textContent;
    if (t.length) {
      const f = t[0];
      word.textContent = (f === f.toUpperCase() ? f.toLowerCase() : f.toUpperCase()) + t.slice(1);
    }
  }
}

function clearPunct(space) {
  const prev = space.previousElementSibling;
  if (prev && prev.classList.contains('qe-word')) prev.textContent = prev.textContent.replace(/[.,?!;:]$/, '');
}

// ── UI ─────────────────────────────────────────────────────
function clearContent() {
  editor.innerHTML = '';
  editor.focus();
  updateUI();
}

function hasContent() {
  return (editor.textContent || '').replace(/[\u200B\u00A0]/g, '').trim().length > 0;
}

function updateUI() {
  const has = hasContent();
  clearBtn.style.display = has ? 'inline-block' : 'none';
  copyBtn.style.opacity = has ? '1' : '0.5';

  if (isListening) {
    listenBtn.textContent = 'Stop';
    listenBtn.classList.add('active');
  } else {
    listenBtn.textContent = 'Start';
    listenBtn.classList.remove('active');
  }
  listenBtn.disabled = isEditing;
  editBtn.textContent = isEditing ? 'Done' : 'Quick Edit';

  let s = '\uD83D\uDD07 Ready';
  if (isEditing) s = '\u270F\uFE0F Editing';
  else if (isListening) s = '\uD83C\uDF99\uFE0F Listening';
  if (modifierHeld) s += ' (Raw)';
  statusEl.textContent = s;
}

// ── Button handlers ────────────────────────────────────────
listenBtn.onclick = () => { if (isListening) stopListening(); else startListening(); };
copyBtn.onclick = () => copyToClipboard();
clearBtn.onclick = () => clearContent();
editBtn.onclick = () => toggleEdit();

editor.addEventListener('input', () => { updateUI(); handleCaretActivity(); });
editor.addEventListener('keyup', () => handleCaretActivity());
editor.addEventListener('mouseup', () => handleCaretActivity());
document.addEventListener('selectionchange', () => {
  if (document.activeElement === editor) handleCaretActivity();
});

// ── Init ───────────────────────────────────────────────────
setupRecognition();
setupPopupUI();
updateUI();
log('Ready. Click Start or it will auto-start.');

// Auto-start after a moment
setTimeout(() => {
  if (!isListening) startListening();
}, 500);
