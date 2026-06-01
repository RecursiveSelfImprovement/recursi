(function(){
if(window._aardvarkActive){if(window._aardvarkInstance){window._aardvarkInstance.init();}return;}
window._aardvarkActive=true;
if(typeof WebDiagUI==='undefined'){var WebDiagUI={run:function(){alert('WebDiag not available in bookmarklet mode.');}}}
function applyCss(cssString, id, doc) {
const styleId = 'cssId_' + (id || 'default_' + Date.now()); // Use timestamp for default uniqueness
const targetDocument = doc || document;
let styleElement = targetDocument.getElementById(styleId);
if (!styleElement) {
styleElement = targetDocument.createElement('style');
styleElement.id = styleId;
(
targetDocument.head || targetDocument.getElementsByTagName('head')[0]
).appendChild(styleElement);
}
if (styleElement.textContent !== cssString) {
styleElement.textContent = cssString;
}
}
function makeElement(type, ...args) {
let element;
if (type.startsWith('svg:')) {
const svgType = type.substring(4);
element = document.createElementNS('http://www.w3.org/2000/svg', svgType);
} else {
element = document.createElement(type);
}
const attributeMappings = {
className: 'class',
htmlFor: 'for',
};
for (const arg of args) {
if (typeof arg === 'string') {
element.appendChild(document.createTextNode(arg));
} else if (arg instanceof Node) {
element.appendChild(arg);
} else if (Array.isArray(arg)) {
arg.forEach((child) => {
if (Array.isArray(child)) {
if (child.length > 0) {
element.appendChild(makeElement(...child));
}
} else if (child instanceof Node) {
element.appendChild(child);
} else if (typeof child === 'string') {
element.appendChild(document.createTextNode(child));
} else if (child !== null && child !== undefined) {
console.warn('Unhandled item in child array:', child);
}
});
} else if (typeof arg === 'object' && arg !== null) {
Object.entries(arg).forEach(([key, value]) => {
if (key === 'style' && typeof value === 'object') {
Object.assign(element.style, value);
} else if (key === 'textContent' || key === 'innerHTML') {
element[key] = value;
} else if (key.startsWith('on') && typeof value === 'function') {
const eventName = key.substring(2).toLowerCase();
element.addEventListener(eventName, value);
} else if (typeof value === 'boolean') {
const attrName = attributeMappings[key] || key;
if (value) {
element.setAttribute(attrName, '');
} else {
element.removeAttribute(attrName);
}
} else if (value !== undefined && value !== null) {
const attrName = attributeMappings[key] || key;
element.setAttribute(attrName, String(value));
}
});
}
}
return element;
}
class KeystrokeHandler {
static handlers = {};
static showCommand = true;
static listenerAttached = false;
static popupElement = null;
static hideTimeout = null;
static handleKeyDown = null;
static setStyles() {
applyCss(
`
.keystroke-popup {
position: fixed;
top: 50%;
left: 50%;
transform: translate(-50%, -50%) scale(0);
background-color: rgba(0, 0, 0, 0.85);
color: #fff;
padding: 15px 30px;
border-radius: 8px;
font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
font-size: 24px;
opacity: 0;
transition: transform 0.2s cubic-bezier(0.18, 0.89, 0.32, 1.28), opacity 0.2s;
z-index: 2147483647;
pointer-events: none;
box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
text-transform: lowercase;
white-space: pre;
text-align: center;
display: block;
}
.keystroke-popup.show {
transform: translate(-50%, -50%) scale(1);
opacity: 1;
}
.keystroke-popup .keystroke {
font-size: 36px;
font-weight: 700;
color: #ffd700;
margin: 0;
vertical-align: -2px;
line-height: 1;
display: inline-block;
}
.keystroke-popup .special-key {
font-style: italic;
color: #bbb;
font-size: 0.75em;
margin-right: 8px;
vertical-align: middle;
}
`,
'keystrokeHandlerStyles'
);
}
static showPopup(content) {
if (!this.popupElement) {
this.popupElement = makeElement('div', {
className: 'keystroke-popup',
});
document.body.appendChild(this.popupElement);
}
while (this.popupElement.firstChild) {
this.popupElement.firstChild.remove();
}
if (typeof content === 'string') {
this.popupElement.textContent = content;
} else if (content instanceof Node) {
this.popupElement.appendChild(content);
} else if (Array.isArray(content)) {
content.forEach((node) => {
if (typeof node === 'string')
this.popupElement.appendChild(document.createTextNode(node));
else if (node instanceof Node) this.popupElement.appendChild(node);
});
}
requestAnimationFrame(() => {
this.popupElement.classList.add('show');
});
if (this.hideTimeout) clearTimeout(this.hideTimeout);
this.hideTimeout = setTimeout(
() => this.popupElement.classList.remove('show'),
1200
);
}
static addHandler(command, callback) {
let commandName,
keystroke,
suppressPopup = false;
if (typeof command === 'string') {
commandName = command;
keystroke = command[0].toLowerCase();
let ampersandIndex = command.indexOf('&');
if (ampersandIndex !== -1 && ampersandIndex < command.length - 1) {
keystroke = command[ampersandIndex + 1].toLowerCase();
}
} else if (typeof command === 'object') {
commandName = command.name;
keystroke = command.key.toLowerCase();
suppressPopup = command.suppressPopup || false;
}
this.handlers[keystroke] = {
commandName,
callback,
suppressPopup,
};
if (!this.listenerAttached) {
this.setStyles();
this.handleKeyDown = (event) => {
const tag = event.target.tagName;
if (
tag === 'INPUT' ||
tag === 'TEXTAREA' ||
event.target.isContentEditable
)
return;
let key = event.key.toLowerCase();
if (
[
'enter',
' ',
'escape',
'arrowup',
'arrowdown',
'arrowleft',
'arrowright',
].includes(key)
) {
key = event.key.toLowerCase();
}
if (this.handlers[key]) {
event.preventDefault();
event.stopPropagation();
event.stopImmediatePropagation();
let { commandName, callback, suppressPopup } = this.handlers[key];
callback(event);
if (this.showCommand && !suppressPopup) {
const notificationContent = document.createDocumentFragment();
const specialKeys = [
'enter',
' ',
'escape',
'arrowup',
'arrowdown',
'arrowleft',
'arrowright',
];
if (specialKeys.includes(key)) {
notificationContent.appendChild(
makeElement(
'span',
{ className: 'special-key' },
`(${event.key}) `
)
);
notificationContent.appendChild(
document.createTextNode(commandName || event.key)
);
} else {
const cleanName = commandName.replace('&', '');
const lowerName = cleanName.toLowerCase();
const idx = lowerName.indexOf(key);
if (idx !== -1) {
const pre = cleanName.substring(0, idx);
const match = cleanName.substring(idx, idx + key.length);
const post = cleanName.substring(idx + key.length);
if (pre)
notificationContent.appendChild(document.createTextNode(pre));
notificationContent.appendChild(
makeElement('span', { className: 'keystroke' }, match)
);
if (post)
notificationContent.appendChild(
document.createTextNode(post)
);
} else {
notificationContent.appendChild(
document.createTextNode(cleanName)
);
}
}
this.showPopup(notificationContent);
}
}
};
document.addEventListener('keydown', this.handleKeyDown, true);
this.listenerAttached = true;
}
}
static removeHandler(commandName) {
for (let keystroke in this.handlers) {
if (this.handlers[keystroke].commandName === commandName) {
delete this.handlers[keystroke];
break;
}
}
}
static toggleShowCommand() {
this.showCommand = !this.showCommand;
}
static activate() {
if (!this.listenerAttached && this.handleKeyDown) {
document.addEventListener('keydown', this.handleKeyDown, true);
this.listenerAttached = true;
}
}
static deactivate() {
if (this.listenerAttached && this.handleKeyDown) {
document.removeEventListener('keydown', this.handleKeyDown, true);
this.listenerAttached = false;
if (this.popupElement) {
this.popupElement.remove();
this.popupElement = null;
}
}
}
}
class DialogBox {
static baseZIndex = 1000;
static currentZIndex = 1000;
static getNextZ() {
this.currentZIndex += 1;
return this.currentZIndex;
}
static allBoxes = [];
static iframeCovers = [];
static activeDialogCount = 0;
constructor(options = {}) {
this.options = {
title: 'Dialog',
content: null,
buttons: [], // Default empty, but checked below
appearanceManager: null,
width: '600px',
height: 'auto',
position: null,
onClose: null,
onResize: null,
onMove: null,
onGeometryChange: null,
transparent: false,
titleBarAtBottom: false,
noPadding: false,
allowMaximize: true, // New capability
...options,
};
if (this.options.buttons === undefined) {
this.options.buttons = [{ label: 'OK' }];
}
if (
!this.options.appearanceManager &&
window.projectApp?.appearanceManager
) {
this.options.appearanceManager = window.projectApp.appearanceManager;
}
if (this.options.size) {
this.options.width =
typeof this.options.size[0] === 'number'
? `${this.options.size[0]}px`
: this.options.size[0];
this.options.height =
typeof this.options.size[1] === 'number'
? `${this.options.size[1]}px`
: this.options.size[1];
}
if (this.options.contentElement)
this.options.content = this.options.contentElement;
if (this.options.contentHTML)
this.options.content = makeElement('div', {
innerHTML: this.options.contentHTML,
});
this.callback = this.options.onGeometryChange;
this.appearanceUpdateCallback = null;
this.isDragging = false;
this.isResizing = false;
this.isMaximized = false;
this.preMaximizeState = null;
this.dragState = {};
this.resizeState = {};
this.minWidth = 70;
this.minHeight = 40;
this._applyStyles();
DialogBox.allBoxes.push(this);
DialogBox.activeDialogCount++;
const corners = ['TopRight', 'BottomRight', 'BottomLeft', 'TopLeft'];
this.sizers = corners.map((corner, i) =>
makeElement(
'div',
{ className: `dialog-resizer dialog-${corner.toLowerCase()}` },
DialogBox.makeResizerCorner({
width: 15,
height: 15,
whichCorner: i,
className: 'dialog-resizer-svg',
})
)
);
this.header = makeElement('div', { className: 'dialog-header' });
if (this.options.title) {
const titleElement = makeElement(
'span',
{ className: 'dialog-title' },
this.options.title
);
this.header.appendChild(titleElement);
}
this.transparencyButton = makeElement('button', {
className: 'dialog-util-btn',
title: 'Toggle Transparency',
onclick: (e) => {
e.stopPropagation();
this.toggleTransparency();
},
});
this.header.appendChild(this.transparencyButton);
this.closeButton = DialogBox.makeCrossMark({
width: 15,
height: 15,
className: 'dialog-close-btn',
});
this.closeButton.onclick = (e) => {
e.stopPropagation();
this.close();
};
this.header.appendChild(this.closeButton);
if (this.options.allowMaximize) {
this.header.addEventListener('dblclick', (e) => {
if (e.target.closest('button')) return;
this.toggleMaximize();
});
}
this.contentElement = makeElement('div', { className: 'dialog-content' });
if (this.options.noPadding) this.contentElement.style.padding = '0';
if (this.options.content instanceof Node)
this.contentElement.appendChild(this.options.content);
this.element = makeElement('div', { className: 'dialog-box' }, [
this.header,
this.contentElement,
...this.sizers,
]);
this._createFooter();
this._subscribeToAppearanceManager();
this.setZOnTop();
this.element.style.width = this.options.width;
this.element.style.height = this.options.height;
if (this.options.position) {
this.element.style.left = `${this.options.position[0]}px`;
this.element.style.top = `${this.options.position[1]}px`;
this.element.style.transform = 'none';
}
if (this.options.transparent) this.element.classList.add('is-transparent');
if (this.options.titleBarAtBottom)
this.element.classList.add('title-bar-bottom');
this._setupEventListeners();
document.body.appendChild(this.element);
setTimeout(() => this.constrainPosition(), 0);
if (typeof this.options.onResize === 'function') {
this.resizeObserver = new ResizeObserver(() => {
const rect = this.element.getBoundingClientRect();
this.options.onResize(rect.width, rect.height);
});
this.resizeObserver.observe(this.element);
}
}
static prompt(options = {}) {
return new Promise((resolve) => {
const input = document.createElement('input');
input.type = 'text';
input.value = options.defaultValue || '';
input.style.width = '100%';
input.style.marginBottom = '10px';
input.style.padding = '8px';
input.style.backgroundColor = '#333';
input.style.color = '#fff';
input.style.border = '1px solid #555';
input.style.borderRadius = '4px';
const msg = document.createElement('div');
msg.textContent = options.message || '';
msg.style.marginBottom = '10px';
const container = document.createElement('div');
container.append(msg, input);
const d = new DialogBox({
title: options.title || 'Prompt',
content: container,
width: '350px',
buttons: [
{
label: options.okLabel || 'OK',
className: 'primary',
onClick: () => {
resolve(input.value);
},
},
{
label: 'Cancel',
onClick: () => {
resolve(null);
},
},
],
onClose: () => {
resolve(null);
},
});
setTimeout(() => input.focus(), 50);
input.addEventListener('keydown', (e) => {
if (e.key === 'Enter') {
resolve(input.value);
d.close();
}
});
});
}
maximize() {
if (this.isMaximized) return;
this.isMaximized = true;
this.preMaximizeState = {
style: this.element.getAttribute('style'),
class: this.element.className,
};
this.element.classList.add('maximized');
this._createRestoreIndicator();
}
restore() {
if (!this.isMaximized) return;
this.isMaximized = false;
if (this.preMaximizeState) {
this.element.setAttribute('style', this.preMaximizeState.style);
this.element.className = this.preMaximizeState.class;
}
this.element.classList.remove('maximized');
this._removeRestoreIndicator();
this.constrainPosition();
this.setZOnTop();
}
toggleMaximize() {
if (this.isMaximized) this.restore();
else this.maximize();
}
_createRestoreIndicator() {
if (this.restoreIndicator) return;
this.restoreIndicator = makeElement(
'div',
{
className: 'dialog-restore-indicator',
title: 'Restore Dialog',
onclick: (e) => {
e.stopPropagation();
this.restore();
},
},
[
makeElement(
'svg:svg',
{ viewBox: '0 0 24 24', width: 24, height: 24 },
[
makeElement('svg:path', {
d: 'M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-14v3h3v2h-5V5h2z',
fill: 'currentColor',
}),
]
),
]
);
this.restoreIndicator.style.zIndex =
parseInt(this.element.style.zIndex || 1000) + 1;
document.body.appendChild(this.restoreIndicator);
}
_removeRestoreIndicator() {
if (this.restoreIndicator) {
this.restoreIndicator.remove();
this.restoreIndicator = null;
}
}
_createFooter() {
if (
this.options.buttons &&
Array.isArray(this.options.buttons) &&
this.options.buttons.length > 0
) {
this.footer = makeElement('div', { className: 'dialog-footer' });
this.options.buttons.forEach((btnConfig) => {
const button = makeElement(
'button',
{
className: `dialog-button ${btnConfig.className || ''}`,
id: btnConfig.id || null,
onclick: (e) => {
e.stopPropagation();
if (btnConfig.onClick) {
if (btnConfig.onClick(e.currentTarget, this) === false) return;
}
this.close();
},
},
btnConfig.label
);
this.footer.appendChild(button);
});
this.element.appendChild(this.footer);
}
}
_subscribeToAppearanceManager() {
const appearanceManager = this.options.appearanceManager;
if (
appearanceManager &&
typeof appearanceManager.subscribe === 'function'
) {
this.appearanceUpdateCallback = this._applyAppearanceSettings.bind(this);
appearanceManager.subscribe(this.appearanceUpdateCallback);
if (typeof appearanceManager.getCurrentSettings === 'function') {
this._applyAppearanceSettings(appearanceManager.getCurrentSettings());
}
}
}
_applyAppearanceSettings(settings) {
}
setTitle(newTitle) {
this.options.title = newTitle;
const titleEl = this.header.querySelector('.dialog-title');
if (titleEl) titleEl.textContent = newTitle;
}
close() {
if (this.resizeObserver) this.resizeObserver.disconnect();
if (this.options.appearanceManager && this.appearanceUpdateCallback) {
if (typeof this.options.appearanceManager.unsubscribe === 'function') {
this.options.appearanceManager.unsubscribe(
this.appearanceUpdateCallback
);
}
}
this._removeRestoreIndicator();
this.element.style.transition = 'opacity .25s ease, transform .25s ease';
this.element.style.opacity = '0';
const isCssCentered =
this.element.style.left === '50%' && this.element.style.top === '50%';
if (isCssCentered) {
this.element.style.transform = 'translate(-50%, -50%) scale(0.97)';
} else {
const currentTransform = this.element.style.transform;
if (currentTransform && currentTransform !== 'none') {
this.element.style.transform = `${currentTransform} scale(0.97)`;
} else {
this.element.style.transform = 'scale(0.97)';
}
}
const removeFn = () => {
this.element.remove();
DialogBox.allBoxes = DialogBox.allBoxes.filter((b) => b !== this);
DialogBox.activeDialogCount--;
if (typeof this.options.onClose === 'function') {
this.options.onClose();
}
};
this.element.addEventListener('transitionend', removeFn, { once: true });
setTimeout(removeFn, 300);
}
static showIframeCovers() {
document.querySelectorAll('iframe').forEach((iframe) => {
const r = iframe.getBoundingClientRect();
const cover = makeElement('div', {
className: 'dialog-iframe-cover',
style: {
top: `${r.top}px`,
left: `${r.left}px`,
width: `${r.width}px`,
height: `${r.height}px`,
zIndex: DialogBox.getNextZ(),
},
});
document.body.appendChild(cover);
DialogBox.iframeCovers.push(cover);
});
document.body.style.userSelect = 'none';
}
static hideIframeCovers() {
DialogBox.iframeCovers.forEach((c) => c.remove());
DialogBox.iframeCovers.length = 0;
document.body.style.userSelect = '';
}
static handleDragStart(dBox, e) {
if (!e.target.closest('.dialog-header') || e.target.closest('button'))
return;
if (dBox.isResizing || dBox.isMaximized) return;
e.preventDefault();
dBox.isDragging = true;
dBox.setZOnTop();
DialogBox.showIframeCovers();
dBox.element.style.transition = 'none';
const rect = dBox.element.getBoundingClientRect();
dBox.element.style.transform = 'none';
dBox.element.style.left = `${rect.left}px`;
dBox.element.style.top = `${rect.top}px`;
dBox.dragState = { prevX: e.clientX, prevY: e.clientY, rect };
dBox.dragMoveListener = (ev) => DialogBox.handleDragMove(dBox, ev);
dBox.dragEndListener = () => DialogBox.handleDragEnd(dBox);
window.addEventListener('mousemove', dBox.dragMoveListener);
window.addEventListener('mouseup', dBox.dragEndListener);
window.addEventListener('mouseleave', dBox.dragEndListener);
window.addEventListener('blur', dBox.dragEndListener);
}
static handleDragMove(dBox, e) {
if (!dBox.isDragging) return;
e.preventDefault();
const dx = e.clientX - dBox.dragState.prevX;
const dy = e.clientY - dBox.dragState.prevY;
const newLeft = dBox.dragState.rect.left + dx;
const newTop = dBox.dragState.rect.top + dy;
Object.assign(dBox.element.style, {
left: `${newLeft}px`,
top: `${newTop}px`,
});
if (dBox.callback) dBox.triggerCallback();
if (typeof dBox.options.onMove === 'function') {
dBox.options.onMove(newLeft, newTop);
}
}
static handleDragEnd(dBox) {
if (!dBox.isDragging) return;
window.removeEventListener('mousemove', dBox.dragMoveListener);
window.removeEventListener('mouseup', dBox.dragEndListener);
window.removeEventListener('mouseleave', dBox.dragEndListener);
window.removeEventListener('blur', dBox.dragEndListener);
DialogBox.hideIframeCovers();
dBox.isDragging = false;
dBox.dragState = {};
dBox.element.style.transition = '';
dBox.constrainPosition();
}
static handleResizeStart(dBox, e) {
if (dBox.isMaximized) return;
e.preventDefault();
dBox.isResizing = true;
dBox.setZOnTop();
DialogBox.showIframeCovers();
dBox.element.style.transition = 'none';
const rect = dBox.element.getBoundingClientRect();
dBox.element.style.transform = 'none';
dBox.element.style.left = `${rect.left}px`;
dBox.element.style.top = `${rect.top}px`;
const cornerIndex = dBox.sizers.indexOf(e.currentTarget);
dBox.resizeState = {
startX: e.clientX,
startY: e.clientY,
startPos: {
left: rect.left,
top: rect.top,
width: rect.width,
height: rect.height,
},
xFactor: cornerIndex === 0 || cornerIndex === 1 ? 1 : -1,
yFactor: cornerIndex === 1 || cornerIndex === 2 ? 1 : -1,
};
dBox.resizeMoveListener = (ev) => DialogBox.handleResizeMove(dBox, ev);
dBox.resizeEndListener = () => DialogBox.handleResizeEnd(dBox);
window.addEventListener('mousemove', dBox.resizeMoveListener);
window.addEventListener('mouseup', dBox.resizeEndListener, { once: true });
}
static handleResizeMove(dBox, e) {
if (!dBox.isResizing) return;
e.preventDefault();
const { startX, startY, startPos, xFactor, yFactor } = dBox.resizeState;
const dx = e.clientX - startX;
const dy = e.clientY - startY;
let newW = Math.max(startPos.width + dx * xFactor, dBox.minWidth);
let newH = Math.max(startPos.height + dy * yFactor, dBox.minHeight);
let newL = startPos.left;
let newT = startPos.top;
if (xFactor === -1) newL = startPos.left + (startPos.width - newW);
if (yFactor === -1) newT = startPos.top + (startPos.height - newH);
Object.assign(dBox.element.style, {
width: `${newW}px`,
height: `${newH}px`,
left: `${newL}px`,
top: `${newT}px`,
});
if (dBox.callback) dBox.triggerCallback();
if (
(xFactor === -1 || yFactor === -1) &&
typeof dBox.options.onMove === 'function'
) {
dBox.options.onMove(newL, newT);
}
}
static handleResizeEnd(dBox) {
window.removeEventListener('mousemove', dBox.resizeMoveListener);
DialogBox.hideIframeCovers();
dBox.isResizing = false;
if (dBox.callback) dBox.triggerCallback();
if (typeof dBox.options.onMove === 'function') {
const finalLeft = parseFloat(dBox.element.style.left);
const finalTop = parseFloat(dBox.element.style.top);
if (!isNaN(finalLeft) && !isNaN(finalTop)) {
dBox.options.onMove(finalLeft, finalTop);
}
}
dBox.resizeState = {};
dBox.element.style.transition = '';
}
_setupEventListeners() {
this.header.addEventListener('mousedown', (e) =>
DialogBox.handleDragStart(this, e)
);
this.sizers.forEach((r) =>
r.addEventListener('mousedown', (e) =>
DialogBox.handleResizeStart(this, e)
)
);
this.transparencyButton.onclick = () => this.toggleTransparency();
}
triggerCallback() {
if (!this.callback) return;
const rect = this.element.getBoundingClientRect();
const contentRect = this.contentElement.getBoundingClientRect();
this.callback(this, { outer: rect, inner: contentRect });
}
setZOnTop() {
const newZ = DialogBox.getNextZ();
this.element.style.zIndex = newZ;
if (this.restoreIndicator) {
this.restoreIndicator.style.zIndex = newZ + 1;
}
}
toggleTransparency() {
this.element.classList.toggle('is-transparent');
}
constrainPosition() {
const rect = this.element.getBoundingClientRect();
const minVisibleWidth = 50;
const safeMarginTop = 10;
let newTop = rect.top;
let newLeft = rect.left;
if (newTop < safeMarginTop) newTop = safeMarginTop;
if (newLeft < minVisibleWidth - rect.width)
newLeft = minVisibleWidth - rect.width;
if (newLeft > window.innerWidth - minVisibleWidth)
newLeft = window.innerWidth - minVisibleWidth;
if (newTop !== rect.top || newLeft !== rect.left) {
this.element.style.transform = 'none';
this.element.style.top = `${newTop}px`;
this.element.style.left = `${newLeft}px`;
}
}
static isAnyDialogOpen() {
return DialogBox.activeDialogCount > 0;
}
_applyStyles() {
const css = `
.dialog-box {
position: fixed; min-width: 200px; min-height: 150px;
background-color: #2a2a2a; border: 1px solid #4a4a4a;
border-radius: 8px; box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5);
display: flex; flex-direction: column; overflow: visible;
top: 50%; left: 50%; transform: translate(-50%, -50%);
z-index: 1000; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
font-size: 14px; line-height: 1.5; color: #d4d4d4;
box-sizing: border-box; text-align: left;
}
.dialog-box.maximized {
top: 0 !important; left: 0 !important;
width: 100vw !important; height: 100vh !important;
transform: none !important; border-radius: 0 !important;
border: none !important; box-shadow: none !important;
}
.dialog-box.maximized .dialog-header { display: none !important; }
.dialog-box.maximized .dialog-resizer { display: none !important; }
.dialog-box.maximized .dialog-content { border-radius: 0; }
.dialog-restore-indicator {
position: fixed; top: 10px; right: 10px;
width: 40px; height: 40px; background-color: rgba(30,30,30,0.8);
border: 1px solid rgba(255,255,255,0.2); border-radius: 50%;
color: white; display: flex; align-items: center; justify-content: center;
cursor: pointer; backdrop-filter: blur(4px); transition: all 0.2s ease;
box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.dialog-restore-indicator:hover { background-color: var(--accent-blue, #007acc); transform: scale(1.1); }
.dialog-box *, .dialog-box *::before, .dialog-box *::after { box-sizing: border-box; }
.dialog-header {
padding: 8px 12px; background-color: #333333;
border-bottom: 1px solid #4a4a4a; display: flex;
justify-content: space-between; align-items: center;
cursor: move; user-select: none; flex-shrink: 0;
border-radius: 7px 7px 0 0; height: auto; min-height: 32px;
}
.dialog-title {
font-weight: 600; color: #cccccc; pointer-events: none; flex-grow: 1;
margin: 0; padding: 0; font-size: 13px;
white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dialog-close-btn {
background: none !important; border: none !important; cursor: pointer;
padding: 0 !important; margin: 0 0 0 8px !important;
width: 15px !important; height: 15px !important;
min-width: 15px !important; min-height: 15px !important;
border-radius: 4px; transition: all 0.2s ease; flex-shrink: 0;
color: #b0b0b0; display: block;
opacity: 1 !important; visibility: visible !important; box-shadow: none !important;
}
.dialog-close-btn:hover { background-color: #d32f2f !important; color: white !important; transform: scale(1.1); }
.dialog-util-btn {
width: 12px !important; height: 12px !important;
margin: 0 0 0 8px !important; padding: 0 !important;
background-color: rgba(255,255,255,0.2) !important;
border: 1px solid rgba(0,0,0,0.2) !important;
border-radius: 50% !important; cursor: pointer;
transition: all 0.2s ease; min-width: 12px !important; min-height: 12px !important;
box-sizing: border-box !important; display: block; box-shadow: none !important;
}
.dialog-util-btn:hover { background-color: #00bfa5 !important; transform: scale(1.1); }
.maximize-btn:hover { background-color: #28a745 !important; }
.dialog-content {
padding: 16px; flex-grow: 1; overflow: auto;
background-color: #252526; color: #d4d4d4;
display: flex; flex-direction: column;
}
.dialog-footer {
padding: 12px 16px; background-color: #333333;
border-top: 1px solid #4a4a4a; display: flex; justify-content: flex-end; gap: 10px;
flex-shrink: 0; border-radius: 0 0 7px 7px;
}
.dialog-button {
padding: 8px 15px !important; background-color: #6c757d; color: white;
border: none !important; border-radius: 4px; cursor: pointer; font-weight: 500;
transition: background-color 0.2s ease; font-size: 13px !important; line-height: 1.4 !important;
}
.dialog-button:hover { background-color: #5a6268; }
.dialog-button.primary { background-color: #007acc; }
.dialog-button.primary:hover { background-color: #005fa3; }
.dialog-button.danger { background-color: #d32f2f; }
.dialog-button.danger:hover { background-color: #b71c1c; }
.dialog-resizer {
position: absolute; width: 15px; height: 15px; z-index: 10;
opacity: 0; transition: opacity 0.2s ease;
}
.dialog-box:hover .dialog-resizer { opacity: 0.7; }
.dialog-resizer:hover { opacity: 1 !important; transform: scale(1.4); }
.dialog-topleft { top: -2px; left: -2px; cursor: nwse-resize; }
.dialog-topright { top: -2px; right: -2px; cursor: nesw-resize; }
.dialog-bottomleft { bottom: -2px; left: -2px; cursor: nesw-resize; }
.dialog-bottomright { bottom: -2px; right: -2px; cursor: nwse-resize; }
.dialog-resizer-svg { pointer-events: none; color: #b0b0b0; width: 100%; height: 100%; display: block; }
.dialog-resizer:hover .dialog-resizer-svg { color: #d4d4d4; }
.dialog-box.is-transparent { background-color: transparent !important; box-shadow: none !important; border: none !important; }
.dialog-box.is-transparent .dialog-header { background: rgba(0,0,0,0.2) !important; border-bottom: 1px solid rgba(255,255,255,0.2) !important; }
.dialog-box.is-transparent .dialog-content { background: transparent !important; }
.dialog-box.title-bar-bottom { flex-direction: column-reverse; }
.dialog-box.title-bar-bottom .dialog-header { border-bottom: none; border-top: 1px solid #4a4a4a; border-radius: 0 0 7px 7px; }
.dialog-box.title-bar-bottom .dialog-content { border-radius: 7px 7px 0 0; }
.dialog-iframe-cover { position: fixed; background-color: transparent; pointer-events: auto; }
`;
applyCss(css, 'DialogBoxBaseStyles');
}
static createSVGPath({
width,
height,
color,
lineWidth,
joinStyle,
capStyle,
coordinates,
offsetX = 0,
offsetY = 0,
}) {
let d = '';
coordinates.forEach((c, i) => {
const x = (c[0] + offsetX) * width;
const y = (c[1] + offsetY) * height;
d += (i === 0 ? 'M' : 'L') + `${x} ${y} `;
});
return makeElement('svg:path', {
d,
stroke: color || 'currentColor',
'stroke-width': lineWidth || '2',
'stroke-linecap': capStyle || 'round',
'stroke-linejoin': joinStyle || 'round',
fill: 'none',
});
}
static createSVGElement({ width, height, className, elements = [] }) {
return makeElement(
'svg:svg',
{ width, height, class: className },
...elements
);
}
static makeCrossMark(opts) {
const { width: w, height: h } = opts;
const paths = [
[
[0.17, 0.17],
[0.83, 0.83],
],
[
[0.17, 0.83],
[0.83, 0.17],
],
];
const shadow = paths.map((c) =>
DialogBox.createSVGPath({
width: w,
height: h,
lineWidth: 5.8,
color: 'rgba(0,0,0,0.6)',
offsetX: 0.022,
offsetY: 0.022,
coordinates: c,
})
);
const highlight = paths.map((c) =>
DialogBox.createSVGPath({
width: w,
height: h,
lineWidth: 4,
coordinates: c,
})
);
return DialogBox.createSVGElement({
width: w,
height: h,
className: opts.className,
elements: [...shadow, ...highlight],
});
}
static makeResizerCorner(opts) {
const { width: w, height: h, whichCorner } = opts;
const definitivePaths = [
[
[0.2, 0.15],
[0.85, 0.15],
[0.85, 0.8],
],
[
[0.2, 0.85],
[0.85, 0.85],
[0.85, 0.2],
],
[
[0.8, 0.85],
[0.15, 0.85],
[0.15, 0.2],
],
[
[0.8, 0.15],
[0.15, 0.15],
[0.15, 0.8],
],
];
const coords = definitivePaths[whichCorner];
const elems = [
DialogBox.createSVGPath({
width: w,
height: h,
lineWidth: 4.5,
capStyle: 'square',
color: 'rgba(0,0,0,0.5)',
coordinates: coords,
}),
DialogBox.createSVGPath({
width: w,
height: h,
lineWidth: 2.5,
capStyle: 'square',
coordinates: coords,
}),
];
return DialogBox.createSVGElement({
width: w,
height: h,
className: opts.className,
elements: elems,
});
}
}
class AardvarkOverlay {
constructor(aardvark) {
this.main = aardvark; // Reference to the main Aardvark controller
this.hoverElement = null;
this.infoElement = null;
this.statusPanel = null;
this._aardvarkToastEl = null;
this._aardvarkToastTimer = null;
}
setStyles() {
applyCss(
`
.aardvark_highlight {
position: absolute;
background-color: rgba(255, 255, 224, 0.12);
border: 2px solid red;
color: black;
pointer-events: none;
transition: all 0.1s;
z-index: 2000000000;
}
.aardvark_infoElement {
position: absolute;
background-color: rgba(255, 255, 224, 0.8);
border: 1px solid black;
padding: 3px 5px;
font-size: 12px;
font-weight: bold;
font-family: Arial, sans-serif;
z-index: 2000000000;
pointer-events: none;
transition: top 0.1s, left 0.1s;
color: black;
}
.aardvark_infoElement.below {
border-top: none;
border-top-left-radius: 0;
border-top-right-radius: 0;
border-bottom-left-radius: 5px;
border-bottom-right-radius: 5px;
}
.aardvark_infoElement.above {
border-radius: 5px;
}
.aardvark_status {
position: fixed;
top: 100px;
right: 40px;
background-color: rgba(0, 0, 0, 0.85);
color: #fff;
padding: 10px 25px;
border-radius: 8px;
font-family: 'Segoe UI', Arial, sans-serif;
z-index: 2000000010;
cursor: pointer;
box-shadow: 0 5px 15px rgba(0,0,0,0.5);
border: 1px solid rgba(255,255,255,0.15);
transition: transform 0.2s, background-color 0.2s, opacity 1s;
overflow: visible !important;
display: flex;
flex-direction: column;
align-items: center;
text-align: center;
}
.aardvark_status:hover {
transform: scale(1.02);
background-color: rgba(20, 20, 20, 0.95);
}
.aardvark_status_img {
position: absolute;
width: 125px;
height: auto;
top: -88px;
right: -10px;
z-index: -1;
pointer-events: none;
filter: drop-shadow(0px -2px 3px rgba(0,0,0,0.3));
}
.aardvark_status_content {
position: relative;
z-index: 2;
}
.help-container {
display: flex;
flex-direction: column;
gap: 8px;
padding: 10px;
background: #1e1e1e;
color: #ddd;
}
.help-row {
display: flex;
align-items: center;
border-bottom: 1px solid #333;
padding-bottom: 4px;
}
.help-row:last-child {
border-bottom: none;
}
.help-key {
font-weight: bold;
color: #4fc1ff;
background: #2d2d2d;
padding: 2px 8px;
border-radius: 4px;
min-width: 60px;
text-align: center;
margin-right: 15px;
font-family: monospace;
font-size: 1.1em;
}
.help-desc {
font-size: 0.95em;
}
[data-style-exclude]{
-webkit-user-select: none;
user-select: none;
}
`,
'aardvarkStyles'
);
}
displayElementInfo(element) {
if (!this.infoElement) {
this.infoElement = makeElement('div', {
className: 'aardvark_infoElement',
'data-style-exclude': '',
});
document.body.appendChild(this.infoElement);
}
let content = '';
if (element.id) {
content +=
'#' +
element.id.substring(0, 20) +
(element.id.length > 20 ? '...' : '') +
' ';
}
if (element.className && typeof element.className === 'string') {
content +=
'.' +
element.className.split(' ')[0].substring(0, 20) +
(element.className.length > 20 ? '...' : '');
}
content = element.tagName.toLowerCase() + ' ' + content;
this.infoElement.textContent = content;
this.positionInfoElement(element);
}
positionInfoElement(element) {
if (!this.infoElement) return;
let rect = element.getBoundingClientRect();
let tabHeight = this.infoElement.offsetHeight;
let pageHeight = window.innerHeight;
let pageYOffset = window.pageYOffset;
let topPosition = rect.bottom + pageYOffset;
let leftPosition = rect.left + window.pageXOffset;
let isBelow = true;
if (topPosition + tabHeight > pageHeight + pageYOffset - 5) {
topPosition = rect.top + pageYOffset - tabHeight;
isBelow = false;
}
try {
const style = window.getComputedStyle(element);
let radiusStr = isBelow
? style.borderBottomLeftRadius
: style.borderTopLeftRadius;
let radius = parseInt(radiusStr) || 0;
if (radius > 25) radius = 25;
leftPosition += radius;
} catch (e) {}
Object.assign(this.infoElement.style, {
top: topPosition + 'px',
left: leftPosition + 'px',
});
this.infoElement.classList.toggle('below', isBelow);
this.infoElement.classList.toggle('above', !isBelow);
}
highlightElement(element) {
if (!element) return;
var rect = element.getBoundingClientRect();
if (!this.hoverElement) {
this.hoverElement = makeElement('div', {
className: 'aardvark_highlight',
'data-style-exclude': '',
});
document.body.appendChild(this.hoverElement);
}
try {
const style = window.getComputedStyle(element);
this.hoverElement.style.borderRadius = style.borderRadius;
} catch (e) {
this.hoverElement.style.borderRadius = '0';
}
Object.assign(this.hoverElement.style, {
top: rect.top + window.pageYOffset + 'px',
left: rect.left + window.pageXOffset + 'px',
width: rect.width + 'px',
height: rect.height + 'px',
});
}
clearOverlays() {
if (this.hoverElement) {
this.hoverElement.remove();
this.hoverElement = null;
}
if (this.infoElement) {
this.infoElement.remove();
this.infoElement = null;
}
}
unselectCurrentElement() {
this.clearOverlays();
if (this.main) {
this.main.currentElement = null;
}
}
createStatusPanel() {
if (this.statusPanel) return;
const bust = Math.floor(Date.now() / 1000 / (3 * 24 * 60 * 60));
const src = 'https://karmatics.com/aardvark/vark.png?v=' + bust;
const img = new Image();
img.style.position = 'absolute';
img.style.left = '-9999px';
img.style.visibility = 'hidden';
img.onload = () => {
img.remove();
if (img.width === 249 && img.height === 184) {
this._renderStandardPanel(src);
} else {
this._renderAnnouncement(img, src);
}
};
img.onerror = () => {
console.warn('Aardvark: Could not contact HQ (Image load failed).');
};
img.src = src;
}
removeStatusPanel() {
if (this.statusPanel) {
this.statusPanel.remove();
this.statusPanel = null;
}
}
showHelp() {
if (this.helpBox) {
this.helpBox.setZOnTop();
return;
}
const container = makeElement('div', {
style: {
display: 'grid',
gridTemplateColumns: 'auto 1fr',
gap: '6px 12px',
fontSize: '13px',
fontFamily: 'Segoe UI, sans-serif',
color: '#e0e0e0',
padding: '10px',
},
});
this.main.commands.forEach((cmd) => {
if (cmd.hidden) return;
let keyLabel = '';
if (typeof cmd.command === 'object') {
keyLabel = cmd.command.key || '';
} else {
keyLabel = cmd.command.charAt(0);
}
keyLabel = keyLabel.toUpperCase();
const keyEl = makeElement(
'div',
{
style: {
textAlign: 'right',
fontWeight: 'bold',
color: '#00bfa5',
fontFamily: 'monospace',
background: 'rgba(255,255,255,0.05)',
padding: '2px 6px',
borderRadius: '4px',
minWidth: '20px',
display: 'inline-block',
},
},
keyLabel
);
const descEl = makeElement('div', {
style: { display: 'flex', alignItems: 'center' },
innerHTML: cmd.description.replace('&', ''),
});
container.appendChild(keyEl);
container.appendChild(descEl);
});
this.helpBox = new DialogBox({
title: 'Aardvark Commands',
content: container,
width: '320px',
onClose: () => {
this.helpBox = null;
},
});
this.setDataStyleExclude(this.helpBox.element);
}
setDataStyleExclude(element) {
if (element) {
element.setAttribute('data-style-exclude', '');
}
}
showToast(msg, ms = 2200) {
try {
if (!this._aardvarkToastEl || !this._aardvarkToastEl.isConnected) {
const el = document.createElement('div');
el.setAttribute('data-style-exclude', '');
Object.assign(el.style, {
position: 'fixed',
right: '18px',
bottom: '18px',
zIndex: 2147483647,
padding: '10px 12px',
borderRadius: '10px',
fontFamily:
'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
fontSize: '12px',
lineHeight: '1.25',
color: 'rgba(255,255,255,0.95)',
background: 'rgba(0,0,0,0.78)',
border: '1px solid rgba(255,255,255,0.18)',
boxShadow: '0 10px 26px rgba(0,0,0,0.45)',
backdropFilter: 'blur(6px)',
WebkitBackdropFilter: 'blur(6px)',
maxWidth: '46vw',
whiteSpace: 'nowrap',
overflow: 'hidden',
textOverflow: 'ellipsis',
opacity: '0',
transform: 'translateY(6px)',
transition: 'opacity 160ms ease, transform 160ms ease',
pointerEvents: 'none',
});
document.body.appendChild(el);
this._aardvarkToastEl = el;
}
const el = this._aardvarkToastEl;
el.textContent = String(msg || '');
requestAnimationFrame(() => {
el.style.opacity = '1';
el.style.transform = 'translateY(0)';
});
if (this._aardvarkToastTimer) clearTimeout(this._aardvarkToastTimer);
this._aardvarkToastTimer = setTimeout(() => {
try {
el.style.opacity = '0';
el.style.transform = 'translateY(6px)';
} catch (e) {}
}, ms);
} catch (e) {}
}
calculateSmartPosition(rect, dialogWidth, dialogHeight, padding = 20) {
const vw = window.innerWidth;
const vh = window.innerHeight;
const spaces = [
{
name: 'top',
area: rect.top * vw,
fits: rect.top >= dialogHeight + padding,
x: rect.left + rect.width / 2 - dialogWidth / 2,
y: rect.top - dialogHeight - padding,
},
{
name: 'bottom',
area: (vh - rect.bottom) * vw,
fits: vh - rect.bottom >= dialogHeight + padding,
x: rect.left + rect.width / 2 - dialogWidth / 2,
y: rect.bottom + padding,
},
{
name: 'left',
area: rect.left * vh,
fits: rect.left >= dialogWidth + padding,
x: rect.left - dialogWidth - padding,
y: rect.top + rect.height / 2 - dialogHeight / 2,
},
{
name: 'right',
area: (vw - rect.right) * vh,
fits: vw - rect.right >= dialogWidth + padding,
x: rect.right + padding,
y: rect.top + rect.height / 2 - dialogHeight / 2,
},
];
spaces.sort((a, b) => {
if (a.fits && !b.fits) return -1;
if (!a.fits && b.fits) return 1;
return b.area - a.area;
});
return [spaces[0].x, spaces[0].y];
}
showDormantIcon(onWake, onFullQuit) {
this.removeDormantIcon();
const iconSize = 32;
const container = makeElement('div', {
className: 'aardvark-dormant-icon',
'data-style-exclude': '',
title: 'Click to wake Aardvark',
style: {
position: 'fixed',
top: '10px',
right: '10px',
width: `${iconSize}px`,
height: `${iconSize}px`,
zIndex: 2000000010,
cursor: 'pointer',
opacity: '0.4',
transition: 'opacity 0.2s, transform 0.2s',
background:
'url(https://karmatics.com/aardvark/img/aardvarksmall.png) no-repeat center center',
backgroundSize: 'contain',
filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
},
onmouseover: function () {
this.style.opacity = '1';
this.style.transform = 'scale(1.1)';
},
onmouseout: function () {
this.style.opacity = '0.4';
this.style.transform = 'scale(1)';
},
onclick: (e) => {
e.stopPropagation();
e.preventDefault();
if (onWake) onWake();
},
});
const closeBtn = makeElement(
'div',
{
style: {
position: 'absolute',
top: '-6px',
right: '-6px',
width: '16px',
height: '16px',
background: '#d32f2f',
color: 'white',
borderRadius: '50%',
fontSize: '10px',
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
fontWeight: 'bold',
boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
opacity: '0',
transition: 'opacity 0.2s',
},
onclick: (e) => {
e.stopPropagation();
e.preventDefault();
if (onFullQuit) onFullQuit();
},
},
'✕'
);
container.addEventListener('mouseenter', () => {
closeBtn.style.opacity = '1';
});
container.addEventListener('mouseleave', () => {
closeBtn.style.opacity = '0';
});
container.appendChild(closeBtn);
document.body.appendChild(container);
this._dormantIcon = container;
}
removeDormantIcon() {
if (this._dormantIcon) {
this._dormantIcon.remove();
this._dormantIcon = null;
}
}
_renderStandardPanel(src) {
const aardvarkImg = makeElement('img', {
src: src,
className: 'aardvark_status_img',
alt: 'Aardvark',
});
const msg = makeElement(
'div',
{ className: 'aardvark_status_content' },
makeElement(
'div',
{
style: {
fontSize: '18px',
fontWeight: 'bold',
color: '#fff',
marginBottom: '2px',
},
},
'Aardvark'
),
makeElement(
'div',
{ style: { fontSize: '13px', color: '#ffd700', fontStyle: 'italic' } },
'Right-click for menu'
)
);
this.statusPanel = makeElement(
'div',
{
className: 'aardvark_status',
'data-style-exclude': '',
onclick: () => this.showHelp(),
},
aardvarkImg,
msg
);
document.body.appendChild(this.statusPanel);
setTimeout(() => {
if (this.statusPanel) {
this.statusPanel.style.opacity = '0';
setTimeout(() => {
if (this.statusPanel) {
this.statusPanel.remove();
this.statusPanel = null;
}
}, 1000);
}
}, 10000);
}
_renderAnnouncement(originalImg, src) {
const width = originalImg.width;
let config = {
title: 'Message from Aardvark',
text: 'We have an update for you.',
btnLabel: 'Learn More',
url: 'https://karmatics.com/aardvark',
};
switch (width) {
case 300: // Update
config.title = 'Update Available';
config.text =
'A new version of the Aardvark bookmarklet is available. Please update to get the latest features.';
config.btnLabel = 'Get Update';
config.url = 'https://karmatics.com/aardvark';
break;
case 301: // Product Launch
config.title = 'New Product: Fontzy';
config.text =
'We are launching Fontzy, the ultimate typography tool. Try the beta today!';
config.btnLabel = 'Try Fontzy';
config.url = 'https://karmatics.com/fontzy'; // Placeholder
break;
case 302: // Survey
config.title = 'We need your feedback';
config.text =
'How are you using Aardvark? Take our 1-minute survey to help us decide what to build next.';
config.btnLabel = 'Take Survey';
config.url = 'https://karmatics.com/survey';
break;
case 303: // Alert
config.title = 'Important Notice';
config.text =
'We are changing our hosting provider. Please ensure you have the latest bookmarklet code.';
config.btnLabel = 'Read Notice';
config.url = 'https://karmatics.com/blog/update';
break;
case 304: // Soft Message (No Link)
config.title = 'Did you know?';
config.text =
"You can press 'M' to capture elements for LLM analysis. Give it a try!";
config.btnLabel = 'Close';
config.url = null;
break;
default:
config.text = 'Check out the latest news at Karmatics.';
break;
}
const container = makeElement('div', {
style: {
display: 'flex',
flexDirection: 'column',
alignItems: 'center',
gap: '15px',
padding: '10px',
},
});
const displayImg = makeElement('img', {
src: src,
style: {
maxWidth: '100%',
height: 'auto',
borderRadius: '8px',
boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
},
});
const textBlock = makeElement(
'div',
{
style: {
fontSize: '15px',
lineHeight: '1.4',
textAlign: 'center',
color: '#ddd',
},
},
config.text
);
container.appendChild(displayImg);
container.appendChild(textBlock);
const buttons = [];
if (config.url) {
buttons.push({
label: config.btnLabel,
className: 'primary',
onClick: () => {
window.open(config.url, '_blank');
return true; // Close dialog
},
});
}
buttons.push({ label: 'Dismiss' });
new DialogBox({
title: config.title,
size: [450, 'auto'], // Dynamic height
contentElement: container,
buttons: buttons,
});
}
}
class AardvarkStyleEditor {
constructor(aardvark) {
this.main = aardvark;
this._didStyleEditorCss = false;
this._pausedForDialog = false;
this._pauseState = null;
this.lastAppliedChanges = new Map();
}
openStyleEditor() {
if (!this.main.currentElement) {
KeystrokeHandler.showPopup('No element selected');
return;
}
this._pauseForDialog();
const el = this.main.currentElement;
const dialogWidth = 560;
const dialogHeight = 520;
let pos = null;
if (
this.main.overlay &&
typeof this.main.overlay.calculateSmartPosition === 'function'
) {
const rect = el.getBoundingClientRect();
pos = this.main.overlay.calculateSmartPosition(
rect,
dialogWidth,
dialogHeight
);
}
const originalStyleText = el.getAttribute('style') || '';
const originalMap = this._parseInlineStyleMap(originalStyleText);
const changedSet = new Set();
const ui = this._buildStyleEditorUI({
element: el,
originalMap,
originalStyleText,
changedSet,
lastAppliedChanges: this.lastAppliedChanges,
onRequestResume: () => this._resumeAfterDialog(),
});
const box = new DialogBox({
title: 'Style Editor',
size: [dialogWidth, dialogHeight],
position: pos,
contentElement: ui.root,
onClose: () => {
if (ui.restoreOnCloseCheckbox && ui.restoreOnCloseCheckbox.checked) {
ui.revertAll();
} else {
if (ui.sessionChanges.size > 0) {
this.lastAppliedChanges = new Map(ui.sessionChanges);
}
}
this._resumeAfterDialog();
},
});
this.main.overlay.setDataStyleExclude(box.element);
box.element.addEventListener('keydown', (e) => e.stopPropagation(), true);
box.element.addEventListener('keyup', (e) => e.stopPropagation(), true);
box.element.addEventListener('keypress', (e) => e.stopPropagation(), true);
setTimeout(() => {
if (ui.firstFocusable) ui.firstFocusable.focus();
}, 30);
}
_pauseForDialog() {
if (this._pausedForDialog) return;
this._pausedForDialog = true;
this._pauseState = {
listenerAttached: !!this.main.listenerAttached,
hoverWasPresent: !!this.main.overlay.hoverElement,
infoWasPresent: !!this.main.overlay.infoElement,
};
this.main.overlay.clearOverlays();
if (this.main.listenerAttached) {
document.body.removeEventListener(
'mousemove',
this.main.mouseMoveHandler
);
this.main.listenerAttached = false;
}
this.main.removeKeyboardHandlers();
KeystrokeHandler.showPopup('Style Editor (Aardvark paused)');
}
_resumeAfterDialog() {
if (!this._pausedForDialog) return;
this._pausedForDialog = false;
this.main.attachKeyboardHandlers();
const wasTracking = !!this._pauseState?.listenerAttached;
if (wasTracking) {
this.main.attachListener();
if (this.main.currentElement) {
this.main.overlay.highlightElement(this.main.currentElement);
this.main.overlay.displayElementInfo(this.main.currentElement);
}
}
this._pauseState = null;
KeystrokeHandler.showPopup('Aardvark resumed');
}
_buildStyleEditorUI({
element,
originalMap,
originalStyleText,
changedSet,
lastAppliedChanges,
onRequestResume,
}) {
if (!this._didStyleEditorCss) {
this._injectStyles();
}
const sessionChanges = new Map();
const root = makeElement('div', {
className: 'av-styleEditor',
});
const tag = element.tagName.toLowerCase();
const idPart = element.id ? `#${element.id}` : '';
const classPart =
element.className && typeof element.className === 'string'
? '.' + element.className.split(' ')[0]
: '';
const title = makeElement(
'div',
{
className: 'av-styleTitle',
},
[
makeElement(
'div',
{
className: 'main',
},
`Editing: ${tag}${idPart}${classPart}`
),
makeElement(
'div',
{
className: 'sub',
},
'Type property names to see computed values.'
),
]
);
const actionsContainer = makeElement('div', {
className: 'av-styleActions',
});
const grid = makeElement('div', {
className: 'av-styleGrid',
});
const rows = [];
const normalizedOriginal = new Map();
originalMap.forEach((v, k) =>
normalizedOriginal.set(this._normalizeCssPropName(k), v)
);
const makeRow = (prop = '', val = '') => {
const propInput = makeElement('input', {
placeholder: 'property',
value: prop,
});
const valInput = makeElement('input', {
placeholder: 'value',
value: val,
});
const updateComputedPlaceholder = () => {
const p = this._normalizeCssPropName(propInput.value);
if (p && element) {
try {
const computed = window
.getComputedStyle(element)
.getPropertyValue(p);
if (computed && computed !== 'initial') {
valInput.placeholder = computed;
} else {
valInput.placeholder = 'value';
}
} catch (e) {
valInput.placeholder = 'value';
}
} else {
valInput.placeholder = 'value';
}
};
propInput.addEventListener('input', updateComputedPlaceholder);
if (prop) updateComputedPlaceholder();
const stopKeys = (e) => e.stopPropagation();
propInput.addEventListener('keydown', stopKeys);
valInput.addEventListener('keydown', stopKeys);
const delBtn = makeElement(
'div',
{
className: 'av-styleDel',
onclick: (e) => {
e.stopPropagation();
const p = (propInput.value || '').trim();
if (p) api.removeProperty(p);
propInput.value = '';
valInput.value = '';
valInput.placeholder = 'value';
},
},
'✕'
);
const rowEl = makeElement(
'div',
{
className: 'av-styleRow',
},
propInput,
valInput,
delBtn
);
const row = {
rowEl,
propInput,
valInput,
};
rows.push(row);
const applyFromRow = () => {
const pRaw = (propInput.value || '').trim();
const vRaw = (valInput.value || '').trim();
if (!pRaw) return;
if (!vRaw) api.removeProperty(pRaw);
else api.setProperty(pRaw, vRaw);
};
let applyTimer = null;
const scheduleApply = () => {
clearTimeout(applyTimer);
applyTimer = setTimeout(applyFromRow, 60);
};
propInput.addEventListener('input', scheduleApply);
valInput.addEventListener('input', scheduleApply);
propInput.addEventListener('blur', applyFromRow);
valInput.addEventListener('blur', applyFromRow);
grid.appendChild(rowEl);
return row;
};
const api = {
normalize: (p) => this._normalizeCssPropName(p),
setProperty: (pRaw, vRaw) => {
const p = api.normalize(pRaw);
if (!p) return;
element.style.setProperty(p, vRaw);
sessionChanges.set(p, vRaw);
const orig = normalizedOriginal.get(p);
if (orig !== vRaw) changedSet.add(p);
else changedSet.delete(p);
},
removeProperty: (pRaw) => {
const p = api.normalize(pRaw);
if (!p) return;
element.style.removeProperty(p);
sessionChanges.set(p, null);
if (normalizedOriginal.has(p)) changedSet.add(p);
else changedSet.delete(p);
},
refreshRowsFromElement: () => {
const curText = element.getAttribute('style') || '';
const curMap = this._parseInlineStyleMap(curText);
const curNorm = new Map();
curMap.forEach((v, k) => curNorm.set(this._normalizeCssPropName(k), v));
const entries = Array.from(curNorm.entries()).sort((a, b) =>
a[0].localeCompare(b[0])
);
while (rows.length < entries.length + 8) makeRow('', '');
rows.forEach((r) => {
r.propInput.value = '';
r.valInput.value = '';
r.valInput.placeholder = 'value';
});
entries.forEach(([k, v], i) => {
rows[i].propInput.value = k;
rows[i].valInput.value = v;
const p = this._normalizeCssPropName(k);
const comp = window.getComputedStyle(element).getPropertyValue(p);
if (comp) rows[i].valInput.placeholder = comp;
});
},
revertChangedOnly: () => {
Array.from(changedSet).forEach((p) => {
if (normalizedOriginal.has(p))
element.style.setProperty(p, normalizedOriginal.get(p));
else element.style.removeProperty(p);
sessionChanges.delete(p);
});
changedSet.clear();
api.refreshRowsFromElement();
},
clearAllEdits: () => {
Array.from(sessionChanges.keys()).forEach((p) =>
element.style.removeProperty(p)
);
sessionChanges.clear();
api.refreshRowsFromElement();
},
};
const originalEntries = Array.from(normalizedOriginal.entries()).sort(
(a, b) => a[0].localeCompare(b[0])
);
originalEntries.forEach(([k, v]) => makeRow(k, v));
for (let i = 0; i < 8; i++) makeRow('', '');
const firstFocusable =
rows.length > 0 ? rows[0].valInput || rows[0].propInput : null;
const saveBtn = makeElement(
'button',
{
title: 'Save',
onclick: () => this._saveStyles(element),
},
'💾'
);
const loadBtn = makeElement(
'button',
{
title: 'Load',
onclick: () => this._triggerLoadStyles(api),
},
'📂'
);
const prevBtn = makeElement(
'button',
{
className: 'primary',
disabled: !(lastAppliedChanges && lastAppliedChanges.size > 0),
onclick: () => {
lastAppliedChanges.forEach((v, k) =>
v === null ? api.removeProperty(k) : api.setProperty(k, v)
);
api.refreshRowsFromElement();
},
},
'Previous'
);
actionsContainer.append(
saveBtn,
loadBtn,
prevBtn,
makeElement(
'button',
{
onclick: () => api.revertChangedOnly(),
},
'Revert'
),
makeElement(
'button',
{
onclick: () => api.clearAllEdits(),
},
'Clear'
),
makeElement(
'button',
{
onclick: () => onRequestResume(),
},
'Close'
)
);
const topBar = makeElement(
'div',
{
className: 'av-styleTopBar',
},
title,
actionsContainer
);
const bottomBar = makeElement(
'div',
{
className: 'av-styleBottomBar',
},
[
makeElement('label', {}, [
(this.restoreOnCloseCheckbox = makeElement('input', {
type: 'checkbox',
})),
makeElement('span', {}, 'Restore on close'),
]),
makeElement(
'div',
{
className: 'av-styleHint',
},
'Tip: Property name triggers computed value placeholder.'
),
]
);
root.append(topBar, grid, bottomBar);
return {
root,
firstFocusable,
sessionChanges,
revertAll: () => {
if (originalStyleText.trim())
element.setAttribute('style', originalStyleText);
else element.removeAttribute('style');
api.refreshRowsFromElement();
},
};
}
_parseInlineStyleMap(styleText) {
const map = new Map();
if (!styleText) return map;
const parts = String(styleText).split(';');
for (let i = 0; i < parts.length; i++) {
const part = parts[i];
if (!part) continue;
const idx = part.indexOf(':');
if (idx === -1) continue;
const k = part.slice(0, idx).trim();
const v = part.slice(idx + 1).trim();
if (!k) continue;
map.set(k, v);
}
return map;
}
_normalizeCssPropName(prop) {
let p = String(prop || '').trim();
if (!p) return '';
if (p.includes('-')) return p.toLowerCase();
p = p.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
p = p.replace(/_/g, '-').replace(/\s+/g, '-').toLowerCase();
return p;
}
_injectStyles() {
applyCss(
`
.av-styleEditor { display:flex; flex-direction:column; gap:10px; height:100%; }
.av-styleTopBar { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px; border:1px solid rgba(255,255,255,0.12); border-radius:10px; background: rgba(0,0,0,0.18); }
.av-styleTitle { display:flex; flex-direction:column; gap:3px; }
.av-styleTitle .main { font-weight:700; font-size:13px; color:#ddd; }
.av-styleTitle .sub { font-size:12px; color:#aaa; }
.av-styleActions { display:flex; align-items:center; gap:10px; }
.av-styleActions button { font-size:12px; padding:7px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.08); color:#eee; cursor:pointer; }
.av-styleActions button:hover { background: rgba(255,255,255,0.14); }
.av-styleActions button.primary { background: rgba(0,122,204,0.9); border-color: rgba(0,122,204,1); }
.av-styleActions button.primary:hover { background: rgba(0,122,204,1); }
.av-styleGrid { display:flex; flex-direction:column; gap:6px; padding:10px; border:1px solid rgba(255,255,255,0.12); border-radius:10px; background: rgba(0,0,0,0.12); overflow:auto; }
.av-styleRow { display:grid; grid-template-columns: 1fr 1.2fr 34px; gap:8px; align-items:center; }
.av-styleRow input { width:100%; padding:8px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.14); background: rgba(0,0,0,0.25); color:#eee; outline:none; font-size:12.5px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
.av-styleRow input:focus { border-color: rgba(79,193,255,0.8); box-shadow: 0 0 0 3px rgba(79,193,255,0.12); }
.av-styleDel { width:34px; height:34px; border-radius:8px; border:1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color:#ddd; cursor:pointer; display:flex; align-items:center; justify-content:center; user-select:none; }
.av-styleDel:hover { background: rgba(255,60,60,0.18); border-color: rgba(255,60,60,0.4); color: #fff; }
.av-styleBottomBar { display:flex; align-items:center; justify-content:space-between; padding:10px; border:1px solid rgba(255,255,255,0.12); border-radius:10px; background: rgba(0,0,0,0.12); }
.av-styleBottomBar label { display:flex; align-items:center; gap:8px; font-size:12px; color:#bbb; user-select:none; }
.av-styleHint { font-size:12px; color:#aaa; }
`,
'aardvarkStyleEditorStyles'
);
this._didStyleEditorCss = true;
}
_saveStyles(element) {
const styleMap = {};
for (let i = 0; i < element.style.length; i++) {
const key = element.style[i];
styleMap[key] = element.style.getPropertyValue(key);
}
const json = JSON.stringify(styleMap, null, 2);
const blob = new Blob([json], {
type: 'application/json',
});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'aardvark-style.json';
a.click();
URL.revokeObjectURL(url);
KeystrokeHandler.showPopup('Styles Saved');
}
_triggerLoadStyles(api) {
const input = document.createElement('input');
input.type = 'file';
input.accept = '.json';
input.style.display = 'none';
input.onchange = (e) => {
const file = e.target.files[0];
if (!file) return;
const reader = new FileReader();
reader.onload = (evt) => {
try {
const loadedMap = JSON.parse(evt.target.result);
if (typeof loadedMap !== 'object' || loadedMap === null)
throw new Error('Invalid JSON');
Object.entries(loadedMap).forEach(([k, v]) => {
api.setProperty(k, v);
});
api.refreshRowsFromElement();
KeystrokeHandler.showPopup('Styles Loaded');
} catch (err) {
console.error(err);
KeystrokeHandler.showPopup('Load Failed');
}
};
reader.readAsText(file);
};
document.body.appendChild(input);
input.click();
input.remove();
}
hasPreviousStyles() {
return this.lastAppliedChanges && this.lastAppliedChanges.size > 0;
}
applyPreviousStyles() {
if (!this.main.currentElement || !this.hasPreviousStyles()) return;
const el = this.main.currentElement;
let count = 0;
this.lastAppliedChanges.forEach((val, key) => {
const prop = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
if (val === null) {
el.style.removeProperty(prop);
} else {
el.style.setProperty(prop, val);
}
count++;
});
KeystrokeHandler.showPopup(`Applied ${count} styles`);
this.main.overlay.highlightElement(el);
}
}
class AardvarkActions {
constructor(aardvark) {
this.main = aardvark;
this.undoBuffer = [];
this.widerStack = [];
this.llmCaptures = [];
this.pickModeActive = false;
this.pickCallback = null;
this.pickHandler = null;
this._originalStatusText = null;
this.didViewSourceDboxCss = false;
}
removeCurrentElement() {
const el = this.main.currentElement;
if (el) {
const nextSibling = el.nextElementSibling;
const parentElement = el.parentElement;
const removedElement = el;
this.undoBuffer.push({
type: 'remove',
element: removedElement,
nextSibling: nextSibling,
parentElement: parentElement,
});
el.remove();
this.main.currentElement = null;
this.main.overlay.clearOverlays();
}
}
isolateElement() {
const el = this.main.currentElement;
if (el) {
try {
if (
this.main &&
this.main.radialMenu &&
this.main.radialMenu.isOpen()
) {
this.main.radialMenu.close();
}
} catch (e) {}
if (el.parentNode !== null) {
let clone = el.cloneNode(true);
clone.style.textAlign = '';
clone.style.cssFloat = 'none';
clone.style.position = '';
clone.style.padding = '20px';
clone.style.margin = '20px auto';
clone.style.maxWidth = '800px';
if (clone.tagName === 'TR' || clone.tagName === 'TD') {
if (clone.tagName === 'TD') {
clone = makeElement('TR', clone);
}
clone = makeElement('TABLE', makeElement('TBODY', clone));
}
const undoData = {
type: 'isolate',
elements: Array.from(document.body.childNodes).filter(
(e) =>
!e.classList ||
(!e.classList.contains('aardvark_highlight') &&
!e.classList.contains('aardvark_infoElement') &&
!e.classList.contains('aardvark_status') &&
!e.classList.contains('aardvark-radial') &&
!(
e.getAttribute && e.getAttribute('data-style-exclude') != null
))
),
bodyStyles: {
background: document.body.style.background,
backgroundColor: document.body.style.backgroundColor,
backgroundImage: document.body.style.backgroundImage,
margin: document.body.style.margin,
textAlign: document.body.style.textAlign,
overflow: document.body.style.overflow,
},
};
while (document.body.firstChild) {
document.body.firstChild.remove();
}
document.body.style.width = '100%';
document.body.style.background = 'none';
document.body.style.backgroundColor = 'white';
document.body.style.backgroundImage = 'none';
document.body.style.textAlign = 'center';
document.body.style.overflow = 'auto';
document.body.appendChild(clone);
if (this.main.overlay.statusPanel) {
document.body.appendChild(this.main.overlay.statusPanel);
}
this.undoBuffer.push(undoData);
window.scroll(0, 0);
this.main.overlay.clearOverlays();
this.main.currentElement = null;
}
}
}
undo() {
if (this.undoBuffer.length === 0) return false;
const undoData = this.undoBuffer.pop();
switch (undoData.type) {
case 'remove':
if (undoData.nextSibling) {
undoData.parentElement.insertBefore(
undoData.element,
undoData.nextSibling
);
} else {
undoData.parentElement.appendChild(undoData.element);
}
break;
case 'isolate':
while (document.body.firstChild) {
document.body.firstChild.remove();
}
undoData.elements
.filter(
(n) =>
!(
n &&
n.classList &&
(n.classList.contains('aardvark-radial') ||
n.closest?.('.aardvark-radial') ||
n.hasAttribute?.('data-style-exclude'))
)
)
.forEach((element) => {
document.body.appendChild(element);
});
Object.assign(document.body.style, undoData.bodyStyles);
this.main.overlay.clearOverlays();
this.main.currentElement = null;
this.main.overlay.removeStatusPanel(); // clean old ref
this.main.overlay.createStatusPanel();
if (!this.main.listenerAttached) {
this.main.attachListener();
}
break;
case 'style':
if (undoData.element && undoData.originalStyle) {
Object.assign(undoData.element.style, undoData.originalStyle);
if (this.main.currentElement === undoData.element) {
this.main.overlay.highlightElement(this.main.currentElement);
}
}
break;
}
return true;
}
selectParentElement() {
if (this.main.currentElement && this.main.currentElement.parentElement) {
if (this.main.currentElement.tagName === 'BODY') return;
this.widerStack.push(this.main.currentElement);
this.main.currentElement = this.main.currentElement.parentElement;
this.main.overlay.highlightElement(this.main.currentElement);
this.main.overlay.displayElementInfo(this.main.currentElement);
}
}
selectChildElement() {
if (this.widerStack.length > 0) {
this.main.currentElement = this.widerStack.pop();
this.main.overlay.highlightElement(this.main.currentElement);
this.main.overlay.displayElementInfo(this.main.currentElement);
}
}
makeSelector() {
if (this.main.currentElement) {
var s = this.generateSelector(this.main.currentElement);
this.createClipboardDialog(s, 140);
}
}
generateSelector(element) {
if (!(element instanceof Element)) return null;
const escapeSelector = (selector) =>
selector.replace(/(:|\.|\[|\]|,|=|@|>)/g, '\\$1');
const getUniqueSelector = (el) => {
let selector = el.nodeName.toLowerCase();
if (el.id) {
selector += `#${escapeSelector(el.id)}`;
if (document.querySelectorAll(selector).length === 1) return selector;
}
if (el.className && typeof el.className === 'string') {
let classes = Array.from(el.classList).map(escapeSelector).join('.');
if (classes) {
selector += `.${classes}`;
if (document.querySelectorAll(selector).length === 1) return selector;
}
}
return null;
};
const getNthOfType = (el) => {
let sibling = el;
let nth = 1;
while ((sibling = sibling.previousElementSibling)) {
if (sibling.nodeName.toLowerCase() === el.nodeName.toLowerCase()) nth++;
}
return `:nth-of-type(${nth})`;
};
let path = [];
let current = element;
while (
current &&
current.nodeName.toLowerCase() !== 'html' &&
current.nodeName.toLowerCase() !== 'body'
) {
let unique = getUniqueSelector(current);
if (unique) {
path.unshift(unique);
break;
} else {
let nth = getNthOfType(current);
path.unshift(current.nodeName.toLowerCase() + nth);
current = current.parentElement;
}
}
return path.join(' > ');
}
createClipboardDialog(text = '', height = 100) {
var initialHeight = height + 100;
var box = new DialogBox({
title: 'Selector',
size: [400, initialHeight],
});
var textarea = makeElement('textarea', {
style: {
width: '100%',
height: `${height}px`,
boxSizing: 'border-box',
fontSize: '13px',
fontWeight: 'normal',
color: '#222',
backgroundColor: '#fff',
border: '1px solid #ccc',
fontFamily: 'monospace',
resize: 'none',
display: 'block',
marginBottom: '10px',
padding: '8px',
},
});
textarea.value = text;
var copyButton = makeElement(
'button',
{
className: 'dialog-button primary',
style: {
width: '100%',
},
onclick: () => {
textarea.select();
document.execCommand('copy');
copyButton.textContent = 'Successfully copied!';
setTimeout(() => {
copyButton.textContent = 'Copy to Clipboard';
}, 2000);
},
},
'Copy to Clipboard'
);
var container = makeElement(
'div',
{
style: {
display: 'flex',
flexDirection: 'column',
padding: '10px',
},
},
textarea,
copyButton
);
box.contentElement.appendChild(container);
this.main.overlay.setDataStyleExclude(box.element);
}
dark() {
document.body.style.backgroundColor = '#222';
document.body.style.color = '#ccc';
}
viewSource() {
if (this.main.currentElement) {
this.showViewSourceBox(this.main.currentElement);
}
}
trimSpaces(s) {
if (!s) return '';
return s.trim();
}
expandWidth() {
if (this.main.currentElement) {
const element = this.main.currentElement;
const originalStyle = {
width: element.style.width,
minWidth: element.style.minWidth,
maxWidth: element.style.maxWidth,
boxSizing: element.style.boxSizing,
display: element.style.display,
};
this.undoBuffer.push({
type: 'style',
element: element,
originalStyle: originalStyle,
});
const rect = element.getBoundingClientRect();
const currentWidth = rect.width;
const newWidth = currentWidth * 1.5;
const computed = window.getComputedStyle(element);
if (computed.display === 'inline') {
element.style.display = 'inline-block';
}
element.style.boxSizing = 'border-box';
element.style.width = `${newWidth}px`;
element.style.minWidth = `${newWidth}px`;
element.style.maxWidth = 'none';
this.main.overlay.highlightElement(element);
this.main.overlay.displayElementInfo(element);
KeystrokeHandler.showPopup('Expanded');
}
}
createGlobalReference() {
if (!this.main.currentElement) return;
const defaultName = 'g' + this.main.globalVarCounter;
this._showGlobalVarInput(defaultName, (finalName) => {
if (!finalName) return; // Cancelled
window[finalName] = this.main.currentElement;
try {
const tag = this.main.currentElement.tagName.toLowerCase();
this.main.overlay.showToast(`${finalName} = <${tag}>`, 2000);
} catch (e) {}
console.log(`[Aardvark] ${finalName} created:`, this.main.currentElement);
if (finalName === defaultName) {
this.main.globalVarCounter++;
}
});
}
sendToFontzy() {
if (!this.main.currentElement) return;
if (window.fontzyInstance) {
window.fontzyInstance.setTarget(this.main.currentElement);
window.fontzyInstance.open();
} else {
KeystrokeHandler.showPopup('Fontzy not active');
}
}
showViewSourceBox(elem) {
if (!this.didViewSourceDboxCss) {
applyCss(
`
.viewsource {
font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
font-size: 13px;
line-height: 1.35;
white-space: pre-wrap;
overflow-wrap: break-word;
word-wrap: break-word;
}
.viewsource div { margin: 0; padding: 0; }
.viewsource div.vsblock { border-left: 1px solid #ccc; margin-left: 1em; padding-left: 6px; }
.viewsource div.vsline { margin: 0; }
.viewsource div.vsindent { margin-left: 1.5em; }
.viewsource span.tag { color: #800000; font-weight: bold; }
.viewsource span.pname { color: #ff0000; }
.viewsource span.pval { color: #0000ff; font-weight: bold; }
.viewsource span.aname { color: #008000; font-style: italic; font-weight: normal; }
.viewsource span.aval { color: #000080; font-style: italic; font-weight: normal; }
.aardvark-vs-toolbar button {
background: transparent !important;
color: #333 !important;
border: 1px solid transparent !important;
box-shadow: none !important;
font-size: 16px !important;
padding: 2px 5px !important;
cursor: pointer;
min-width: 0 !important;
border-radius: 6px;
line-height: 1;
opacity: 0.75;
}
.aardvark-vs-toolbar button:hover {
opacity: 1;
border-color: rgba(0,0,0,0.15) !important;
background: rgba(255,255,255,0.6) !important;
}
.aardvark-vs-toolbar button.vs-mode.active {
opacity: 1 !important;
background: rgba(0,122,204,0.20) !important;
border-color: rgba(0,122,204,0.55) !important;
box-shadow: 0 1px 0 rgba(255,255,255,0.7) inset, 0 1px 3px rgba(0,0,0,0.18) !important;
transform: translateY(-0.5px);
}
.aardvark-vs-toolbar button.vs-copy:hover {
background: rgba(0,200,120,0.18) !important;
border-color: rgba(0,200,120,0.55) !important;
}
.viewsource::-webkit-scrollbar { width: 10px; height: 10px; }
.viewsource::-webkit-scrollbar-track { background: #f0f0f0; }
.viewsource::-webkit-scrollbar-thumb { background: #ccc; border-radius: 5px; }
`,
'aardvarkViewSourceStyles'
);
this.didViewSourceDboxCss = true;
}
const margin = 30;
const initialWidth = Math.min(
720,
Math.max(320, window.innerWidth - margin)
);
const initialHeight = Math.min(
620,
Math.max(220, window.innerHeight - margin)
);
let cleanupClamp = null;
var box = new DialogBox({
title: 'View Source',
width: `${initialWidth}px`,
height: `${initialHeight}px`,
buttons: [], // No footer
allowMinimize: false,
allowMaximize: true,
onClose: () => {
try {
if (cleanupClamp) cleanupClamp();
} catch (e) {}
},
});
try {
box.element.style.width = `${initialWidth}px`;
box.element.style.height = `${initialHeight}px`;
box.element.style.maxWidth = `calc(100vw - ${margin}px)`;
box.element.style.maxHeight = `calc(100vh - ${margin}px)`;
box.element.style.display = 'flex';
box.element.style.flexDirection = 'column';
} catch (e) {}
cleanupClamp = this._showViewSourceClamp(box, margin);
box.contentElement.style.padding = '0';
box.contentElement.style.overflow = 'hidden';
box.contentElement.style.display = 'flex';
box.contentElement.style.flexDirection = 'column';
box.contentElement.style.backgroundColor = '#ffffff';
box.contentElement.style.flex = '1 1 auto';
box.contentElement.style.minHeight = '0'; // critical for flex scroll areas
box.contentElement.style.userSelect = 'text';
box.contentElement.style.pointerEvents = 'auto';
this.main.overlay.setDataStyleExclude(box.element);
var d = makeElement('div', {
className: 'viewsource',
style: {
width: '100%',
flex: '1 1 auto',
minHeight: '0',
overflow: 'auto',
backgroundColor: '#ffffff',
color: '#000000',
padding: '10px',
boxSizing: 'border-box',
whiteSpace: 'pre-wrap', // UPDATED: Changed from 'pre' to 'pre-wrap'
overflowWrap: 'break-word', // UPDATED: Ensure long strings break
wordWrap: 'break-word', // UPDATED: Fallback
wordBreak: 'normal',
userSelect: 'text',
WebkitUserSelect: 'text',
MozUserSelect: 'text',
msUserSelect: 'text',
cursor: 'text',
pointerEvents: 'auto',
},
});
let viewMode = 0;
const modes = [
{ icon: '📜', title: 'Full Source' },
{ icon: '✂️', title: 'Snipped (truncate huge attribute values)' },
{ icon: '🦴', title: 'Skeleton Structure' },
];
this._vsSnipStats = { items: 0, chars: 0 };
const render = () => {
this._vsSnipStats = { items: 0, chars: 0 };
while (d.firstChild) d.removeChild(d.firstChild);
const sourceTree = this.buildSourceElement(elem, 0, viewMode);
d.appendChild(sourceTree);
if (viewMode === 1) {
try {
const st = this._vsSnipStats || { items: 0, chars: 0 };
this.main.overlay.showToast(
`Snipped ${st.items} value${st.items === 1 ? '' : 's'} (${
st.chars
} chars)`,
1800
);
} catch (e) {}
}
};
render();
box.contentElement.appendChild(d);
const copyTextToClipboard = async (text) => {
const failSafeCopy = (t) => {
try {
const ta = document.createElement('textarea');
ta.value = t;
ta.setAttribute('readonly', '');
ta.style.position = 'fixed';
ta.style.left = '-9999px';
ta.style.top = '-9999px';
document.body.appendChild(ta);
ta.focus();
ta.select();
const ok = document.execCommand && document.execCommand('copy');
document.body.removeChild(ta);
return !!ok;
} catch (e) {
return false;
}
};
try {
if (navigator.clipboard && navigator.clipboard.writeText) {
await navigator.clipboard.writeText(text);
return true;
}
} catch (e) {}
return failSafeCopy(text);
};
const toolbar = makeElement('div', {
className: 'aardvark-vs-toolbar',
style: {
position: 'absolute',
right: '36px',
top: '0',
bottom: '0',
display: 'flex',
alignItems: 'center',
gap: '4px',
zIndex: '10',
height: '100%',
},
'data-style-exclude': '',
});
toolbar.onmousedown = (e) => e.stopPropagation();
const modeButtons = [];
const setActiveMode = (idx) => {
viewMode = idx;
modeButtons.forEach((b, i) => {
b.classList.toggle('active', i === idx);
b.title = modes[i].title;
});
render();
};
const copyBtn = makeElement(
'button',
{
className: 'vs-copy',
title: 'Copy visible source to clipboard',
onclick: async () => {
try {
const text = d && d.innerText ? d.innerText : '';
const ok = await copyTextToClipboard(text);
if (ok) KeystrokeHandler.showPopup('Copied');
else KeystrokeHandler.showPopup('Copy failed');
} catch (e) {
KeystrokeHandler.showPopup('Copy failed');
console.error(e);
}
},
style: { fontSize: '16px' },
},
'📋'
);
toolbar.appendChild(copyBtn);
for (let i = 0; i < modes.length; i++) {
const b = makeElement(
'button',
{
className: 'vs-mode',
title: modes[i].title,
onclick: () => setActiveMode(i),
style: { fontSize: '16px' },
},
modes[i].icon
);
modeButtons.push(b);
}
setActiveMode(0);
toolbar.append(...modeButtons);
const header = box.element.firstElementChild;
if (header) {
if (!header.style.position || header.style.position === 'static') {
header.style.position = 'relative';
}
header.appendChild(toolbar);
}
}
buildSourceElement(node, indent, viewMode) {
const container = document.createDocumentFragment();
switch (node.nodeType) {
case 1: // Element
{
if (node.style.display == 'none') break;
const isSkeleton = viewMode === 2;
const validChildren = Array.from(node.childNodes).filter((c) => {
if (!isSkeleton) return true;
return c.nodeType === 1;
});
const renderOneLine = isSkeleton
? validChildren.length === 0
: node.childNodes.length === 0 &&
this.main.leafElems[node.nodeName];
if (renderOneLine) {
const wrapper = makeElement('div', { className: 'vsindent' });
this.appendStartTag(wrapper, node, true, viewMode);
container.appendChild(wrapper);
} else {
let blockWrapper;
if (indent > 0) {
blockWrapper = makeElement('div', { className: 'vsblock' });
} else {
blockWrapper = container;
}
const startLine = makeElement('div', { className: 'vsline' });
this.appendStartTag(startLine, node, false, viewMode);
blockWrapper.appendChild(startLine);
validChildren.forEach((child) => {
blockWrapper.appendChild(
this.buildSourceElement(child, indent + 1, viewMode)
);
});
const endLine = makeElement('div', { className: 'vsline' });
this.appendEndTag(endLine, node);
blockWrapper.appendChild(endLine);
if (indent > 0) container.appendChild(blockWrapper);
}
}
break;
case 3: // Text
{
if (viewMode === 2) break; // Bone: No text
var v = node.nodeValue;
v = this.trimSpaces(v);
if (v != '' && v != '\n' && v != '\r\n' && v.charCodeAt(0) != 160) {
const div = makeElement('div', { className: 'vsindent' });
div.textContent = v;
container.appendChild(div);
}
}
break;
case 4: // CDATA
case 8: // Comment
if (viewMode === 0) {
const div = makeElement('div', { className: 'vsindent' });
div.textContent =
node.nodeType === 8
? '<!--' + node.nodeValue + '-->'
: '<![CDATA[' + node.nodeValue + ']]>';
container.appendChild(div);
}
break;
}
return container;
}
appendEndTag(container, node) {
container.appendChild(document.createTextNode('</'));
const tagSpan = makeElement('span', { className: 'tag' });
tagSpan.textContent = node.nodeName.toLowerCase();
container.appendChild(tagSpan);
container.appendChild(document.createTextNode('>'));
}
appendStartTag(container, node, isOneLine, viewMode) {
container.appendChild(document.createTextNode('<'));
const tagSpan = makeElement('span', { className: 'tag' });
tagSpan.textContent = node.nodeName.toLowerCase();
container.appendChild(tagSpan);
for (var i = 0; i < node.attributes.length; i++) {
const attr = node.attributes.item(i);
const n = attr.nodeName;
if (viewMode === 2) {
if (n !== 'id' && n !== 'class') continue;
} else if (viewMode === 1) {
if (n && String(n).toLowerCase().startsWith('on')) continue;
}
if (attr.nodeValue != null && attr.nodeValue != '') {
container.appendChild(document.createTextNode(' '));
const pName = makeElement('span', { className: 'pname' });
pName.textContent = attr.nodeName;
container.appendChild(pName);
if (attr.nodeName === 'style' && viewMode === 0) {
container.appendChild(document.createTextNode('="'));
const styleStr = attr.nodeValue;
const parts = styleStr.split(';');
let first = true;
parts.forEach((part) => {
if (!part.trim()) return;
if (!first) container.appendChild(document.createTextNode('; '));
const pair = part.split(':');
if (pair.length === 2) {
const aName = makeElement('span', { className: 'aname' });
aName.textContent = this.trimSpaces(pair[0]);
container.appendChild(aName);
container.appendChild(document.createTextNode(': '));
const aVal = makeElement('span', { className: 'aval' });
aVal.textContent = this.trimSpaces(pair[1]);
container.appendChild(aVal);
} else {
container.appendChild(document.createTextNode(part));
}
first = false;
});
if (styleStr.trim().endsWith(';'))
container.appendChild(document.createTextNode(';'));
container.appendChild(document.createTextNode('"'));
} else {
container.appendChild(document.createTextNode('="'));
const pVal = makeElement('span', { className: 'pval' });
pVal.textContent = this._formatSourceAttrValue(
attr.nodeName,
attr.nodeValue,
viewMode
);
container.appendChild(pVal);
container.appendChild(document.createTextNode('"'));
}
}
}
const isVoid = this.main.leafElems[node.nodeName];
if (isVoid) {
container.appendChild(document.createTextNode(' />'));
} else {
container.appendChild(document.createTextNode('>'));
if (isOneLine) {
this.appendEndTag(container, node);
}
}
}
toggleBigBlocks() {
const existing = document.querySelectorAll('.aardvark_block_highlight');
if (existing.length > 0) {
existing.forEach((el) => {
if (el.dataset.aardvarkOriginalOutline) {
el.style.outline = el.dataset.aardvarkOriginalOutline;
delete el.dataset.aardvarkOriginalOutline;
} else {
el.style.outline = '';
}
el.classList.remove('aardvark_block_highlight');
});
KeystrokeHandler.showPopup('Blocks Cleared');
return;
}
const MIN_AREA = 5000; // e.g. 50x100 pixels
const PARENT_CHILD_RATIO = 0.6; // Child must be < 60% of parent to count parent as a "block container"
const all = document.querySelectorAll('body *');
const blocks = [];
for (let i = 0; i < all.length; i++) {
const el = all[i];
if (
el.classList.contains('aardvark_highlight') ||
el.classList.contains('aardvark_infoElement') ||
el.classList.contains('aardvark_status') ||
el.closest('.aardvark_status') ||
el.closest('.aardvark_highlight')
)
continue;
const rect = el.getBoundingClientRect();
if (rect.width < 10 || rect.height < 10) continue;
const area = rect.width * rect.height;
if (area < MIN_AREA) continue;
if (el.children.length === 0) continue;
let maxChildArea = 0;
for (let j = 0; j < el.children.length; j++) {
const child = el.children[j];
const cRect = child.getBoundingClientRect();
if (cRect.width === 0 || cRect.height === 0) continue;
const cArea = cRect.width * cRect.height;
if (cArea > maxChildArea) maxChildArea = cArea;
}
if (maxChildArea < area * PARENT_CHILD_RATIO) {
blocks.push(el);
}
}
blocks.forEach((el, index) => {
const hue = (index * 137.5) % 360;
let lightness = 50;
if (hue > 45 && hue < 85) lightness = 35; // Yellows
if (hue > 160 && hue < 200) lightness = 40; // Cyans
const color = `hsl(${hue}, 100%, ${lightness}%)`;
el.dataset.aardvarkOriginalOutline = el.style.outline;
el.style.outline = `3px solid ${color}`;
el.classList.add('aardvark_block_highlight');
});
KeystrokeHandler.showPopup(`Highlighted ${blocks.length} Blocks`);
}
flashElement(element, color) {
const originalTransition = element.style.transition;
const originalOutline = element.style.outline;
element.style.transition = 'outline 0.2s ease-in-out';
element.style.outline = `4px solid ${color}`;
setTimeout(() => {
element.style.outline = originalOutline;
setTimeout(() => {
element.style.transition = originalTransition;
}, 200);
}, 800);
}
captureForLlm() {
if (!this.main.currentElement) return;
const selector = this.generateSelector(this.main.currentElement);
if (!selector) {
KeystrokeHandler.showPopup('Could not generate selector');
return;
}
this.llmCaptures.push({
cmd: 'find',
css: selector,
note: `Captured item ${this.llmCaptures.length + 1} (${
this.main.currentElement.tagName
})`,
});
const payload = [
...this.llmCaptures,
{ cmd: 'pulseall', color: 'magenta', count: 2 },
];
const json = JSON.stringify(payload, null, 2);
navigator.clipboard
.writeText(json)
.then(() => {
KeystrokeHandler.showPopup(
`Captured! (${this.llmCaptures.length} items)`
);
})
.catch((e) => {
KeystrokeHandler.showPopup('Clipboard Error');
console.error(e);
});
if (window.webDiagInstance && window.webDiagInstance.updateInput) {
window.webDiagInstance.updateInput(json);
} else if (window.webDiagInstance && window.webDiagInstance.inputArea) {
window.webDiagInstance.inputArea.value = json;
}
}
clearLlmCaptures() {
this.llmCaptures = [];
KeystrokeHandler.showPopup('Capture List Cleared');
if (window.webDiagInstance && window.webDiagInstance.updateInput) {
window.webDiagInstance.updateInput('');
}
}
async playWebDiagFromClipboard() {
try {
const text = await navigator.clipboard.readText();
if (
!text ||
(!text.trim().startsWith('[') && !text.trim().startsWith('{'))
) {
KeystrokeHandler.showPopup('Clipboard not JSON');
return;
}
if (!window.webDiagInstance) {
if (typeof WebDiagUI !== 'undefined') {
window.webDiagInstance = new WebDiagUI();
} else {
KeystrokeHandler.showPopup('WebDiag not loaded');
return;
}
}
const wdl = window.webDiagInstance.wdl;
KeystrokeHandler.showPopup('Running WebDiag...');
const result = await wdl.handle(text);
if (result.startsWith('OK')) {
const count = result.split('\n')[0].split(' ')[1];
KeystrokeHandler.showPopup(`Success: ${count} cmds`);
} else {
KeystrokeHandler.showPopup('WebDiag Error');
console.log(result);
}
} catch (e) {
console.error(e);
KeystrokeHandler.showPopup('Run Failed: ' + e.message);
}
}
startPickMode(message, callback) {
if (this.pickModeActive) this.quitPickMode();
this.pickModeActive = true;
this.pickCallback = callback;
const label = message || "Select element (Press 'x' or 'Enter')";
KeystrokeHandler.showPopup(label);
if (this.main.overlay.statusPanel) {
const msgDiv = this.main.overlay.statusPanel.querySelector(
'.aardvark_status_content div:last-child'
);
if (msgDiv) {
this._originalStatusText = msgDiv.textContent;
msgDiv.textContent = "PICK MODE: Press 'x' to Select";
msgDiv.style.color = '#00ff41'; // Matrix Green
}
}
this.pickHandler = () => {
if (this.main.currentElement && this.pickCallback) {
const el = this.main.currentElement;
this.flashElement(el, '#00ff41');
this.pickCallback(el);
this.quitPickMode();
}
};
KeystrokeHandler.addHandler('x', this.pickHandler);
KeystrokeHandler.addHandler('Enter', this.pickHandler);
}
quitPickMode() {
if (!this.pickModeActive) return;
KeystrokeHandler.removeHandler('x');
KeystrokeHandler.removeHandler('Enter');
if (this.main.overlay.statusPanel && this._originalStatusText) {
const msgDiv = this.main.overlay.statusPanel.querySelector(
'.aardvark_status_content div:last-child'
);
if (msgDiv) {
msgDiv.textContent = this._originalStatusText;
msgDiv.style.color = '#ffd700';
}
}
this.pickModeActive = false;
this.pickCallback = null;
this.pickHandler = null;
KeystrokeHandler.showPopup('Pick Mode Ended');
}
resetTraversalHistory() {
this.widerStack = [];
}
isUndoAvailable() {
return !!(this.undoBuffer && this.undoBuffer.length > 0);
}
isNarrowerAvailable() {
return !!(this.widerStack && this.widerStack.length > 0);
}
_showGlobalVarInput(defaultValue, callback) {
this.main.removeKeyboardHandlers();
if (!document.getElementById('aardvark-global-css')) {
applyCss(
`
@keyframes av-progress-shrink {
from { width: 100%; }
to { width: 0%; }
}
.av-global-box {
position: fixed; top: 20%; left: 50%; transform: translateX(-50%);
width: 220px; background: #222; border: 1px solid #444;
box-shadow: 0 10px 30px rgba(0,0,0,0.5);
border-radius: 6px; padding: 0; z-index: 2147483650;
overflow: hidden; font-family: sans-serif;
}
.av-global-input {
width: 100%; background: transparent; border: none;
color: #fff; font-size: 18px; font-weight: bold;
padding: 12px 15px; outline: none; text-align: center;
}
.av-global-timer {
height: 3px; background: #00bcd4; width: 100%;
}
.av-global-timer.running {
animation: av-progress-shrink 4s linear forwards;
}
`,
'aardvark-global-css'
);
}
const container = makeElement('div', {
className: 'av-global-box',
'data-style-exclude': '',
});
const input = makeElement('input', {
className: 'av-global-input',
value: defaultValue,
'data-style-exclude': '',
});
const timerBar = makeElement('div', {
className: 'av-global-timer running',
'data-style-exclude': '',
});
container.appendChild(input);
container.appendChild(timerBar);
document.body.appendChild(container);
input.select();
input.focus();
let isClosed = false;
let timerId = null;
const close = (resultName) => {
if (isClosed) return;
isClosed = true;
if (timerId) clearTimeout(timerId);
container.remove();
this.main.attachKeyboardHandlers();
if (callback) callback(resultName);
};
timerId = setTimeout(() => {
close(input.value || defaultValue); // Time's up: Save
}, 4000);
input.addEventListener('keydown', (e) => {
e.stopPropagation(); // Stop bubbling
if (e.key === 'Enter') {
close(input.value);
} else if (e.key === 'Escape') {
close(null); // Cancel
}
});
input.addEventListener('input', () => {
if (timerId) {
clearTimeout(timerId);
timerId = null;
}
timerBar.style.display = 'none';
timerBar.classList.remove('running');
});
const clickOutside = (e) => {
if (!container.contains(e.target)) {
document.removeEventListener('mousedown', clickOutside, true);
close(input.value);
}
};
setTimeout(() => {
document.addEventListener('mousedown', clickOutside, true);
}, 100);
}
toggleContentEdit() {
if (!this.main.currentElement) return;
const el = this.main.currentElement;
if (el.isContentEditable) {
el.contentEditable = 'false';
el.blur();
KeystrokeHandler.showPopup('Edit Mode OFF');
this.main.overlay.highlightElement(el); // Refresh highlight
} else {
el.contentEditable = 'true';
el.focus();
this.flashElement(el, '#00bfff'); // Deep Sky Blue
KeystrokeHandler.showPopup('Edit Mode ON — Aardvark paused');
this.main.quit();
}
}
updateColor(color) {
this.main.overlay.highlightElement(this.main.currentElement, color);
}
simulateClick() {
if (this.main.currentElement) {
const el = this.main.currentElement;
this.flashElement(el, '#ff00ff'); // Flash Magenta
KeystrokeHandler.showPopup('Clicking...');
setTimeout(() => {
el.click();
}, 150);
}
}
_truncateString(str, opts) {
const o = opts || {};
const maxLen = typeof o.maxLen === 'number' ? o.maxLen : 180;
const head = typeof o.head === 'number' ? o.head : 60;
const tail = typeof o.tail === 'number' ? o.tail : 40;
if (str == null) return '';
const s = String(str);
if (s.length <= maxLen) {
return { text: s, removed: 0, did: false };
}
const h = Math.max(0, Math.min(head, s.length));
const t = Math.max(0, Math.min(tail, s.length - h));
const removed = Math.max(0, s.length - (h + t));
const start = s.slice(0, h);
const end = t > 0 ? s.slice(s.length - t) : '';
const out = `${start}...(snipped ${removed} chars)...${end}`;
return { text: out, removed: removed, did: true };
}
openLinkInIframe() {
if (!this.main.currentElement) return;
const el = this.main.currentElement;
let url = null;
if (el.tagName === 'A' && el.href) {
url = el.href;
} else {
const childLink = el.querySelector('a[href]');
if (childLink) url = childLink.href;
}
if (!url) {
KeystrokeHandler.showPopup('No link found in selection');
return;
}
const container = makeElement('div', {
style: 'display: flex; flex-direction: column; height: 100%;',
});
const iframe = makeElement('iframe', {
src: url,
style: 'flex-grow: 1; border: 1px solid #444; background: #fff;',
});
container.appendChild(iframe);
const box = new DialogBox({
title: `Browsing: ${url}`,
content: container,
width: '800px',
height: '600px',
allowMinimize: false,
buttons: [
{
label: 'View DOM',
className: 'primary',
onClick: () => {
try {
const doc = iframe.contentDocument;
if (!doc) {
throw new Error(
'Browser blocked access (CORS). Cannot read DOM from different origin.'
);
}
const root = doc.documentElement;
this.showViewSourceBox(root);
} catch (e) {
alert(
`Scrape Failed: ${e.message}\n\nNote: You can only scrape iframes that share the same origin (domain/protocol/port) as the current page.`
);
}
},
},
{
label: 'Close',
onClick: (btn, dialog) => {
dialog.close();
},
},
],
});
this.main.overlay.setDataStyleExclude(box.element);
}
programmaticClick() {
if (this.main.currentElement) {
this.flashElement(this.main.currentElement, '#00ff00');
setTimeout(() => {
if (this.main.currentElement) {
this.main.currentElement.click();
}
}, 50);
}
}
_showViewSourceClamp(box, margin = 24) {
if (!box || !box.element) return () => {};
const clamp = () => {
try {
const maxW = Math.max(260, window.innerWidth - margin);
const maxH = Math.max(180, window.innerHeight - margin);
const curRect = box.element.getBoundingClientRect();
const curW = curRect.width || 600;
const curH = curRect.height || 400;
let w = Math.min(curW, maxW);
let h = Math.min(curH, maxH);
box.element.style.maxWidth = `${maxW}px`;
box.element.style.maxHeight = `${maxH}px`;
box.element.style.width = `${w}px`;
box.element.style.height = `${h}px`;
const r = box.element.getBoundingClientRect();
const pad = 8;
let left = r.left;
let top = r.top;
if (left < pad) left = pad;
if (top < pad) top = pad;
if (left + r.width > window.innerWidth - pad)
left = Math.max(pad, window.innerWidth - pad - r.width);
if (top + r.height > window.innerHeight - pad)
top = Math.max(pad, window.innerHeight - pad - r.height);
box.element.style.transform = 'none';
box.element.style.left = `${left}px`;
box.element.style.top = `${top}px`;
} catch (e) {}
};
clamp();
const onResize = () => clamp();
window.addEventListener('resize', onResize);
const mo = new MutationObserver(() => {
clamp();
});
try {
mo.observe(box.element, { attributes: true, attributeFilter: ['style'] });
} catch (e) {}
return () => {
try {
window.removeEventListener('resize', onResize);
} catch (e) {}
try {
mo.disconnect();
} catch (e) {}
};
}
_tryDecodeURIComponentSafe(s) {
try {
return decodeURIComponent(s);
} catch (e) {
return s;
}
}
_formatSourceAttrValue(attrName, rawValue, viewMode) {
if (rawValue == null) return '';
let v = String(rawValue);
const n = String(attrName || '').toLowerCase();
const isUrlish =
n === 'href' ||
n === 'src' ||
n === 'action' ||
n === 'poster' ||
n === 'data-src' ||
n === 'data-href' ||
n === 'srcset';
if (isUrlish && v.includes('%')) {
if (/%[0-9a-fA-F]{2}/.test(v)) {
v = this._tryDecodeURIComponentSafe(v);
}
}
v = v.replace(/\u00a0/g, ' ');
v = v.replace(/\u2028|\u2029/g, '\n');
if (viewMode === 1) {
const isSvgPath = n === 'd' || n === 'points';
const isDataUrl = v.startsWith('data:');
const looksHuge = v.length > 220;
if (isSvgPath || isDataUrl || looksHuge) {
const t = this._truncateString(v, {
maxLen: isDataUrl ? 140 : isSvgPath ? 160 : 200,
head: isDataUrl ? 50 : isSvgPath ? 60 : 70,
tail: isDataUrl ? 30 : isSvgPath ? 40 : 60,
});
if (t && t.did) {
try {
if (!this._vsSnipStats) this._vsSnipStats = { items: 0, chars: 0 };
this._vsSnipStats.items += 1;
this._vsSnipStats.chars += t.removed || 0;
} catch (e) {}
return t.text;
}
}
}
return v;
}
}
class AardvarkRadialMenu {
constructor(aardvark) {
this.main = aardvark;
this._root = null;
this._items = [];
this._isOpen = false;
this._centerX = 0;
this._centerY = 0;
this._onDocPointerDown = this._onDocPointerDown.bind(this);
this._onDocContextMenu = this._onDocContextMenu.bind(this);
this._onKeyDownCapture = this._onKeyDownCapture.bind(this);
this._onResize = this._onResize.bind(this);
this._didCss = false;
this._hasOpenedOnce = false; // State for animation intensity
this.opts = {
radius: 34,
innerRadius: 8,
padding: 10,
itemHitPad: 6,
maxItems: 12,
ringBlurPx: 2,
};
}
isOpen() {
return !!this._isOpen;
}
close() {
if (!this._isOpen) return;
this._isOpen = false;
try {
document.removeEventListener('pointerdown', this._onDocPointerDown, true);
document.removeEventListener('contextmenu', this._onDocContextMenu, true);
document.removeEventListener('keydown', this._onKeyDownCapture, true);
window.removeEventListener('resize', this._onResize, true);
window.removeEventListener('scroll', this._onResize, true);
} catch (e) {}
this._unfreezeSelection();
if (this._root && this._root.isConnected) {
this._root.remove();
}
this._root = null;
this._items = [];
}
openAt(clientX, clientY, items) {
this._ensureCss();
this.close();
this._items = Array.isArray(items)
? items.slice(0, this.opts.maxItems)
: [];
if (this._items.length === 0) return;
this._freezeSelection();
const root = document.createElement('div');
root.className = 'aardvark-radial';
if (!this._hasOpenedOnce) {
root.classList.add('dramatic');
this._hasOpenedOnce = true;
}
root.setAttribute('data-style-exclude', '');
root.tabIndex = -1;
root.style.left = clientX + 'px';
root.style.top = clientY + 'px';
const ring = document.createElement('div');
ring.className = 'aardvark-radial-ring';
ring.setAttribute('data-style-exclude', '');
const dot = document.createElement('div');
dot.className = 'aardvark-radial-dot';
dot.setAttribute('data-style-exclude', '');
dot.title = 'Dismiss menu';
dot.addEventListener('click', (e) => {
e.preventDefault();
e.stopPropagation();
this.close();
});
const help = document.createElement('div');
help.className = 'aardvark-radial-help';
help.setAttribute('data-style-exclude', '');
help.textContent = '?';
help.title = 'Help';
help.addEventListener('click', (e) => {
e.preventDefault();
e.stopPropagation();
if (this.main && this.main.overlay) this.main.overlay.showHelp();
});
const quit = document.createElement('div');
quit.className = 'aardvark-radial-quit';
quit.setAttribute('data-style-exclude', '');
quit.textContent = 'X';
quit.title = 'Quit Aardvark';
quit.addEventListener('click', (e) => {
e.preventDefault();
e.stopPropagation();
if (this.main) this.main.quit();
});
ring.appendChild(help);
ring.appendChild(dot);
ring.appendChild(quit);
root.appendChild(ring);
this._renderItemsIntoRoot(root);
document.body.appendChild(root);
const clamped = this._clampCenter(clientX, clientY, root);
this._centerX = clamped.x;
this._centerY = clamped.y;
root.style.left = this._centerX + 'px';
root.style.top = this._centerY + 'px';
this._root = root;
this._isOpen = true;
requestAnimationFrame(() => {
if (this._root) this._root.classList.add('open');
});
document.addEventListener('pointerdown', this._onDocPointerDown, true);
document.addEventListener('contextmenu', this._onDocContextMenu, true);
document.addEventListener('keydown', this._onKeyDownCapture, true);
window.addEventListener('resize', this._onResize, true);
window.addEventListener('scroll', this._onResize, true);
}
_ensureCss() {
if (this._didCss) return;
this._didCss = true;
applyCss(
`
.aardvark-radial {
position: fixed; z-index: 2147483647;
width: 1px; height: 1px; left: 0; top: 0;
pointer-events: none; user-select: none;
opacity: 0;
transform: scale(0.8) rotate(-15deg);
transition: opacity 150ms ease-out, transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1.2);
}
.aardvark-radial.dramatic {
transform: scale(0.2) rotate(-320deg);
transition: opacity 300ms ease-out, transform 400ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.aardvark-radial.open { opacity: 1; transform: scale(1) rotate(0deg); }
.aardvark-radial-ring {
position: absolute; left: 50%; top: 50%;
width: 90px; height: 90px;
transform: translate(-50%, -50%);
border-radius: 50%;
background: rgba(0,0,0,0.25);
box-shadow: 0 4px 12px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.08);
pointer-events: none;
}
.aardvark-radial-dot {
position: absolute; left: 50%; top: 50%;
width: 14px; height: 14px;
transform: translate(-50%, -50%);
border-radius: 50%;
background: rgba(80,80,80,0.8);
box-shadow: 0 2px 5px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.3);
pointer-events: auto; cursor: pointer;
display: flex; align-items: center; justify-content: center;
transition: transform 0.2s, background 0.2s;
color: transparent; font-size: 10px; font-weight: bold;
}
.aardvark-radial-dot:hover {
transform: translate(-50%, -50%) scale(1.3);
background: #aaa;
color: #333;
}
.aardvark-radial-dot:hover::after { content: "✕"; }
@keyframes av-pulse-blue {
0% { text-shadow: 0 0 5px rgba(0, 190, 255, 0.5); transform: translate(-50%, -50%) scale(1); }
50% { text-shadow: 0 0 15px rgba(0, 190, 255, 0.9), 0 0 25px rgba(0, 190, 255, 0.6); transform: translate(-50%, -50%) scale(1.1); }
100% { text-shadow: 0 0 5px rgba(0, 190, 255, 0.5); transform: translate(-50%, -50%) scale(1); }
}
.aardvark-radial-help {
position: absolute; top: 50%; left: 28%;
transform: translate(-50%, -50%);
font-family: sans-serif; font-size: 24px; font-weight: bold;
color: #00bfff;
cursor: pointer; pointer-events: auto;
animation: av-pulse-blue 2.5s infinite ease-in-out;
opacity: 0.9; transition: opacity 0.2s;
}
.aardvark-radial-help:hover { opacity: 1; animation: none; text-shadow: 0 0 20px #00bfff; }
.aardvark-radial-quit {
position: absolute; top: 50%; left: 72%;
transform: translate(-50%, -50%);
font-family: sans-serif; font-size: 22px; font-weight: bold;
color: #ff4444;
cursor: pointer; pointer-events: auto;
opacity: 0.8; transition: transform 0.2s, opacity 0.2s, color 0.2s;
}
.aardvark-radial-quit:hover {
opacity: 1; transform: translate(-50%, -50%) scale(1.2);
color: #ff0000; text-shadow: 0 0 10px rgba(255,0,0,0.5);
}
.aardvark-radial-item {
position: absolute; pointer-events: auto; cursor: pointer;
border: 0; padding: 0; margin: 0; background: transparent;
width: max-content; height: max-content;
}
.aardvark-radial-wrap {
display: inline-flex; align-items: baseline; gap: 0;
padding: 5px 8px; border-radius: 6px;
background: rgba(15, 15, 15, 0.85);
box-shadow: 0 0 0 1px rgba(255,255,255,0.15), 4px 6px 12px rgba(0,0,0,0.6);
backdrop-filter: blur(4px);
}
.aardvark-radial-item:hover .aardvark-radial-wrap {
background: rgba(50, 50, 50, 0.95);
box-shadow: 0 0 0 1px rgba(255,255,255,0.3), 6px 8px 16px rgba(0,0,0,0.7);
transform: scale(1.08) translateY(-2px);
z-index: 10;
}
.aardvark-radial-hot {
font-family: monospace; font-size: 19px; font-weight: 900;
line-height: 1; color: #ffd700; display: inline-block;
}
.aardvark-radial-rest {
font-size: 13px; font-weight: 700; line-height: 1;
color: #fff; display: inline-block; white-space: nowrap;
}
`,
'aardvarkRadialMenuStyles'
);
}
_clampCenter(x, y, root) {
const pad = this.opts.padding;
const maxR = this.opts.radius + 70; // ring radius + label padding heuristic
const vw = window.innerWidth;
const vh = window.innerHeight;
try {
const rect = root.getBoundingClientRect();
void rect;
} catch (e) {}
const cx = Math.min(Math.max(x, pad + maxR), vw - pad - maxR);
const cy = Math.min(Math.max(y, pad + maxR), vh - pad - maxR);
return { x: cx, y: cy };
}
_onDocPointerDown(e) {
if (!this._isOpen) return;
const t = e && e.target ? e.target : null;
if (
t &&
this._root &&
(t === this._root || t.closest('.aardvark-radial'))
) {
return;
}
this.close();
}
_onDocContextMenu(e) {
if (!this._isOpen) return;
try {
e.preventDefault();
e.stopPropagation();
if (e.stopImmediatePropagation) e.stopImmediatePropagation();
} catch (err) {}
this.close();
}
_onKeyDownCapture(e) {
if (!this._isOpen) return;
const key = e && e.key ? String(e.key) : '';
if (key === 'Escape') {
try {
e.preventDefault();
e.stopPropagation();
if (e.stopImmediatePropagation) e.stopImmediatePropagation();
} catch (err) {}
this.close();
}
}
_onResize() {
if (!this._isOpen || !this._root) return;
const clamped = this._clampCenter(this._centerX, this._centerY, this._root);
this._centerX = clamped.x;
this._centerY = clamped.y;
this._root.style.left = this._centerX + 'px';
this._root.style.top = this._centerY + 'px';
}
_buildHotLabel(item) {
const hot = (item && item.key ? String(item.key) : '').toUpperCase();
const labelRaw = (item && item.label ? String(item.label) : '').trim();
const wrap = document.createElement('span');
wrap.className = 'aardvark-radial-wrap';
wrap.setAttribute('data-style-exclude', '');
const big = document.createElement('span');
big.className = 'aardvark-radial-hot';
big.textContent = hot || '';
const small = document.createElement('span');
small.className = 'aardvark-radial-rest';
if (!labelRaw) {
small.textContent = '';
wrap.appendChild(big);
return wrap;
}
const idx = hot ? labelRaw.toUpperCase().indexOf(hot) : -1;
if (idx >= 0) {
const pre = labelRaw.slice(0, idx);
const post = labelRaw.slice(idx + 1);
if (pre) {
const preSpan = document.createElement('span');
preSpan.className = 'aardvark-radial-rest';
preSpan.textContent = pre;
wrap.appendChild(preSpan);
}
wrap.appendChild(big);
if (post) {
const postSpan = document.createElement('span');
postSpan.className = 'aardvark-radial-rest';
postSpan.textContent = post;
wrap.appendChild(postSpan);
}
return wrap;
}
wrap.appendChild(big);
const space = document.createElement('span');
space.className = 'aardvark-radial-rest';
space.textContent = ' ';
const rest = document.createElement('span');
rest.className = 'aardvark-radial-rest';
rest.textContent = labelRaw;
wrap.appendChild(space);
wrap.appendChild(rest);
return wrap;
}
_freezeSelection() {
try {
if (!this.main) return;
this._savedListenerAttached = !!this.main.listenerAttached;
if (this.main.listenerAttached && this.main.mouseMoveHandler) {
document.body.removeEventListener(
'mousemove',
this.main.mouseMoveHandler
);
this.main.listenerAttached = false;
}
} catch (e) {}
}
_unfreezeSelection() {
try {
if (!this.main) return;
if (this._savedListenerAttached && !this.main.listenerAttached) {
if (this.main.mouseMoveHandler) {
document.body.addEventListener(
'mousemove',
this.main.mouseMoveHandler
);
this.main.listenerAttached = true;
}
}
} catch (e) {}
this._savedListenerAttached = null;
}
refreshItems(items, opts = {}) {
if (!this._isOpen || !this._root) return;
const animate = opts.animate !== undefined ? !!opts.animate : false;
this._items = Array.isArray(items)
? items.slice(0, this.opts.maxItems)
: [];
if (this._items.length === 0) {
this.close();
return;
}
this._renderItemsIntoRoot(this._root);
const clamped = this._clampCenter(this._centerX, this._centerY, this._root);
this._centerX = clamped.x;
this._centerY = clamped.y;
this._root.style.left = this._centerX + 'px';
this._root.style.top = this._centerY + 'px';
if (animate) {
try {
this._root.classList.remove('open');
requestAnimationFrame(
() => this._root && this._root.classList.add('open')
);
} catch (e) {}
}
}
_renderItemsIntoRoot(root) {
if (!root) return;
const oldBtns = root.querySelectorAll('.aardvark-radial-item');
oldBtns.forEach((b) => b.remove());
const n = this._items.length;
if (n <= 0) return;
const startAngle = 0;
const step = 360 / n;
for (let i = 0; i < n; i++) {
const item = this._items[i];
const angle = startAngle + step * i;
const r = this.opts.radius;
const btn = document.createElement('button');
btn.className = 'aardvark-radial-item';
btn.type = 'button';
btn.setAttribute('data-style-exclude', '');
const hotLabel = this._buildHotLabel(item);
btn.appendChild(hotLabel);
const norm = ((angle % 360) + 360) % 360;
const isLeftSide = norm > 90 && norm < 270;
btn.style.position = 'absolute';
btn.style.left = '50%';
btn.style.top = '50%';
if (!isLeftSide) {
btn.style.transform = `
translate(-50%, -50%)
rotate(${angle}deg)
translateX(${r}px)
translateX(50%)
`;
} else {
btn.style.transform = `
translate(-50%, -50%)
rotate(${angle - 180}deg)
translateX(-${r}px)
translateX(-50%)
`;
}
if (item && item.title) btn.title = String(item.title);
btn.addEventListener('click', (e) => {
e.preventDefault();
e.stopPropagation();
const keepOpen = !!(item && item.keepOpen);
try {
if (item && typeof item.onClick === 'function') item.onClick();
} catch (err) {
console.error(err);
}
if (!keepOpen) {
this.close();
return;
}
try {
if (this.main && typeof this.main._buildRadialItems === 'function') {
this.refreshItems(this.main._buildRadialItems(), {
animate: false,
});
}
} catch (e2) {}
});
root.appendChild(btn);
}
}
getCenter() {
return { x: this._centerX, y: this._centerY };
}
_renderItems() {
if (!this._root) return;
const old = this._root.querySelectorAll('.aardvark-radial-item');
old.forEach((n) => n.remove());
const n = this._items.length;
if (n === 0) return;
const startAngle = -90; // top
const step = 360 / n;
for (let i = 0; i < n; i++) {
const item = this._items[i];
const angle = startAngle + step * i;
const r = this.opts.radius;
const btn = document.createElement('button');
btn.className = 'aardvark-radial-item';
btn.type = 'button';
btn.setAttribute('data-style-exclude', '');
const hotLabel = this._buildHotLabel(item);
btn.appendChild(hotLabel);
const norm = ((angle % 360) + 360) % 360;
const isLeftSide = norm > 90 && norm < 270;
btn.style.position = 'absolute';
btn.style.left = '50%';
btn.style.top = '50%';
if (!isLeftSide) {
btn.style.transform = `
translate(-50%, -50%)
rotate(${angle}deg)
translateX(${r}px)
translateX(50%)
`;
} else {
btn.style.transform = `
translate(-50%, -50%)
rotate(${angle - 180}deg)
translateX(-${r}px)
translateX(-50%)
`;
}
if (item && item.title) btn.title = String(item.title);
btn.addEventListener('click', (e) => {
e.preventDefault();
e.stopPropagation();
const keepOpen = !!(item && item.keepOpen);
try {
if (item && typeof item.onClick === 'function') item.onClick();
} catch (err) {
console.error('[AardvarkRadialMenu] item error', err);
}
if (keepOpen) {
try {
if (
this.main &&
typeof this.main._buildRadialItems === 'function'
) {
this._items = this.main
._buildRadialItems()
.slice(0, this.opts.maxItems);
this._renderItems();
}
} catch (e2) {}
try {
if (this._root) this._root.classList.add('open');
} catch (e3) {}
return;
}
this.close();
});
this._root.appendChild(btn);
}
}
setItemProvider(fn) {
this._itemProvider = typeof fn === 'function' ? fn : null;
}
refresh(items) {
if (!this._isOpen || !this._root) return;
this._items = Array.isArray(items)
? items.slice(0, this.opts.maxItems)
: [];
if (this._items.length === 0) {
this.close();
return;
}
this._rebuildItems(this._root);
const clamped = this._clampCenter(this._centerX, this._centerY, this._root);
this._centerX = clamped.x;
this._centerY = clamped.y;
this._root.style.left = this._centerX + 'px';
this._root.style.top = this._centerY + 'px';
this._root.classList.add('open');
}
_rebuildItems(root) {
this._renderItemsIntoRoot(root);
}
}
class Aardvark {
constructor() {
this.currentElement = null;
this.listenerAttached = false;
this.globalVarCounter = 1;
this.mouseMoveHandler = this.elementMouseHandler.bind(this);
this.overlay = new AardvarkOverlay(this);
this.actions = new AardvarkActions(this);
this.styleEditor = new AardvarkStyleEditor(this);
this.radialMenu = null;
this._aardvarkContextMenuHandler = null;
this.leafElems = { IMG: true, HR: true, BR: true, INPUT: true };
this.commands = [
{
command: { name: 'wider', key: 'w', suppressPopup: false },
description: '&Wider (parent)',
handler: () => this.actions.selectParentElement(),
},
{
command: { name: 'narrower', key: 'n', suppressPopup: false },
description: '&Narrower (child)',
handler: () => this.actions.selectChildElement(),
},
{
command: 'remove',
description: '&Remove element',
handler: () => this.actions.removeCurrentElement(),
},
{
command: 'isolate',
description: '&Isolate element',
handler: () => this.actions.isolateElement(),
},
{
command: 'undo',
description: '&Undo action',
handler: () => this.actions.undo(),
},
{
command: { name: 'text', key: 'e', suppressPopup: false },
description: '&Edit Text',
handler: () => this.actions.toggleContentEdit(),
},
{
command: { name: 'style', key: 's', suppressPopup: false },
description: '&Style editor',
handler: () => this.styleEditor.openStyleEditor(),
},
{
command: 'view source',
description: '&View HTML source',
handler: () => this.actions.viewSource(),
},
{
command: { name: 'selector', key: 't', suppressPopup: false },
description: 'Copy &Tag Selector',
handler: () => this.actions.makeSelector(),
},
{
command: { name: 'frame', key: 'f', suppressPopup: false },
description: '&Frame Linked Page',
handler: () => this.actions.openLinkInIframe(),
},
{
command: 'lock',
description: '&Lock/Unlock selection',
handler: () => this.lockElements(),
},
{
command: 'global',
description: 'Create &global var',
handler: () => this.actions.createGlobalReference(),
},
{
command: { name: 'capture', key: 'm', suppressPopup: false },
description: '&Model Capture (LLM)',
handler: () => this.actions.captureForLlm(),
},
{
command: { name: 'clear captures', key: 'x', suppressPopup: false },
description: 'Clear LLM captures (&X)',
handler: () => this.actions.clearLlmCaptures(),
},
{
command: 'play',
description: 'Run WebDiag from &Clipboard',
handler: () => this.actions.playWebDiagFromClipboard(),
},
{
command: 'blocks',
description: 'Highlight &Big Blocks',
handler: () => this.actions.toggleBigBlocks(),
},
{
command: 'help',
description: 'Show &help menu',
handler: () => this.overlay.showHelp(),
},
{
command: { name: 'quit', key: 'Escape', suppressPopup: false },
description: '&Quit Aardvark',
handler: () => this.quit(),
},
{
command: { name: 'quit_q', key: 'q', suppressPopup: false },
description: 'Quit',
handler: () => this.quit(),
hidden: true,
},
{
command: { name: 'fontzy', suppressPopup: true },
description: 'Apply to &Fontzy',
handler: () => this.actions.sendToFontzy(),
hidden: true,
},
];
}
init() {
this.overlay.setStyles();
this.attachListener();
this.attachKeyboardHandlers();
this.attachContextMenuHandler();
this.overlay.createStatusPanel();
this.scraperResults = [];
this.scraperPaused = false;
this.scraperRunning = false;
this.scraperLogEl = null;
}
attachListener() {
document.body.addEventListener('mousemove', this.mouseMoveHandler);
this.listenerAttached = true;
}
elementMouseHandler(event) {
try {
if (
this.radialMenu &&
this.radialMenu.isOpen &&
this.radialMenu.isOpen()
) {
return;
}
} catch (e) {}
const element = event.target;
if (
!element ||
element.hasAttribute('data-style-exclude') ||
element.closest('[data-style-exclude]') ||
element.closest('.aardvark_highlight') ||
element.closest('.aardvark_infoElement') ||
element.closest('.aardvark_status') ||
element.closest('.radial-menu-root')
) {
this.overlay.unselectCurrentElement();
return;
}
try {
if (this.actions && this.actions.resetTraversalHistory) {
this.actions.resetTraversalHistory();
}
} catch (e) {}
this.currentElement = element;
this.overlay.highlightElement(element);
this.overlay.displayElementInfo(element);
}
attachKeyboardHandlers() {
this.commands.forEach(({ command, handler }) => {
const key = typeof command === 'string' ? command : command.key;
if (key) {
KeystrokeHandler.addHandler(command, handler);
}
});
}
removeKeyboardHandlers() {
this.commands.forEach(({ command }) => {
if (typeof command === 'object') {
KeystrokeHandler.removeHandler(command.name);
} else {
KeystrokeHandler.removeHandler(command);
}
});
}
lockElements() {
if (this.listenerAttached) {
document.body.removeEventListener('mousemove', this.mouseMoveHandler);
this.listenerAttached = false;
KeystrokeHandler.showPopup('Selection Locked');
} else {
this.attachListener();
KeystrokeHandler.showPopup('Selection Unlocked');
}
}
quit() {
if (this.actions && this.actions.pickModeActive) {
this.actions.quitPickMode();
}
if (this.radialMenu) this.radialMenu.close();
this.removeContextMenuHandler();
if (this.listenerAttached) {
document.body.removeEventListener('mousemove', this.mouseMoveHandler);
this.listenerAttached = false;
}
this.removeKeyboardHandlers();
if (this.overlay) {
this.overlay.unselectCurrentElement();
this.overlay.removeStatusPanel();
}
const blocks = document.querySelectorAll('.aardvark_block_highlight');
blocks.forEach((el) => {
if (el.dataset.aardvarkOriginalOutline) {
el.style.outline = el.dataset.aardvarkOriginalOutline;
delete el.dataset.aardvarkOriginalOutline;
} else {
el.style.outline = '';
}
el.classList.remove('aardvark_block_highlight');
});
KeystrokeHandler.deactivate();
if (this.overlay) {
this.overlay.showDormantIcon(
() => this.wakeUp(),
() => this.fullQuit()
);
}
}
attachContextMenuHandler() {
if (this._aardvarkContextMenuHandler) return;
this._aardvarkContextMenuHandler = (e) => this._onContextMenu(e);
document.addEventListener(
'contextmenu',
this._aardvarkContextMenuHandler,
true
);
}
removeContextMenuHandler() {
if (!this._aardvarkContextMenuHandler) return;
document.removeEventListener(
'contextmenu',
this._aardvarkContextMenuHandler,
true
);
this._aardvarkContextMenuHandler = null;
}
_onContextMenu(event) {
try {
const el = event && event.target ? event.target : null;
if (!el) return;
if (
el.hasAttribute('data-style-exclude') ||
el.closest('[data-style-exclude]') ||
el.closest('.aardvark_highlight') ||
el.closest('.aardvark_infoElement') ||
el.closest('.aardvark_status') ||
el.closest('.radial-menu-root')
) {
return;
}
this.currentElement = el;
try {
if (this.actions && this.actions.resetTraversalHistory) {
this.actions.resetTraversalHistory();
}
} catch (e) {}
this.overlay.highlightElement(el);
this.overlay.displayElementInfo(el);
event.preventDefault();
event.stopPropagation();
if (event.stopImmediatePropagation) event.stopImmediatePropagation();
if (!this.radialMenu) {
this.radialMenu = new AardvarkRadialMenu(this);
}
if (this.radialMenu.isOpen()) {
this.radialMenu.close();
return;
}
const items = this._buildRadialMenuItems();
this.radialMenu.openAt(event.clientX, event.clientY, items);
} catch (e) {
console.error('[Aardvark] context menu error', e);
}
}
_buildRadialMenuItems() {
const items = [];
items.push({
key: 'W',
label: 'Wider',
title: 'Select parent',
keepOpen: true,
onClick: () => {
this.actions.selectParentElement();
this._refreshRadialMenu();
},
});
const canNarrow =
this.actions &&
this.actions.isNarrowerAvailable &&
this.actions.isNarrowerAvailable();
if (canNarrow) {
items.push({
key: 'N',
label: 'Narrower',
title: 'Select child',
keepOpen: true,
onClick: () => {
this.actions.selectChildElement();
this._refreshRadialMenu();
},
});
}
items.push({
key: 'E',
label: 'Edit',
title: 'Edit Text Content',
onClick: () => this.actions.toggleContentEdit(),
});
if (this.styleEditor && this.styleEditor.hasPreviousStyles()) {
items.push({
key: 'L',
label: 'Last',
title: 'Apply previous styles',
onClick: () => this.styleEditor.applyPreviousStyles(),
});
}
items.push({
key: 'S',
label: 'Style',
title: 'Style editor',
onClick: () => this.styleEditor.openStyleEditor(),
});
items.push({
key: 'G',
label: 'Global',
title: 'Create global var',
onClick: () => this.actions.createGlobalReference(),
});
if (
this.actions &&
this.actions.isUndoAvailable &&
this.actions.isUndoAvailable()
) {
items.push({
key: 'U',
label: 'Undo',
title: 'Undo last action',
onClick: () => this.actions.undo(),
});
}
items.push({
key: 'V',
label: 'View Src',
title: 'View HTML source',
onClick: () => this.actions.viewSource(),
});
items.push({
key: 'I',
label: 'Isolate',
title: 'Isolate element',
onClick: () => this.actions.isolateElement(),
});
items.push({
key: 'R',
label: 'Remove',
title: 'Remove element',
onClick: () => this.actions.removeCurrentElement(),
});
return items;
}
_refreshRadialMenu() {
try {
if (this.radialMenu && this.radialMenu.isOpen) {
const items = this._buildRadialMenuItems();
this.radialMenu.refresh(items, { animate: false });
}
} catch (e) {
console.error('[Aardvark] refresh error', e);
}
}
_buildRadialItems() {
return this._buildRadialMenuItems();
}
wakeUp() {
if (this.overlay) this.overlay.removeDormantIcon();
this.listenerAttached = false;
this.attachListener();
this.attachKeyboardHandlers();
this.attachContextMenuHandler();
this.overlay.createStatusPanel();
KeystrokeHandler.activate();
KeystrokeHandler.showPopup('Aardvark Active');
}
fullQuit() {
if (this.overlay) {
this.overlay.removeDormantIcon();
}
console.log('Aardvark Terminated');
}
openDpcScraperDialog() {
const container = makeElement('div', {
style: {
display: 'flex',
flexDirection: 'column',
gap: '10px',
height: '100%',
width: '100%',
padding: '10px',
boxSizing: 'border-box',
background: '#222',
},
});
const title = makeElement(
'h3',
{ style: { margin: '0', color: '#ffd700' } },
'DPC Map Scraper'
);
const configRow = makeElement('div', {
style: {
display: 'flex',
gap: '10px',
alignItems: 'center',
color: '#ddd',
},
});
configRow.appendChild(makeElement('span', 'Batch:'));
const countInput = makeElement('input', {
type: 'number',
value: '3',
style: {
width: '50px',
background: '#333',
color: '#fff',
border: '1px solid #555',
padding: '4px',
},
});
configRow.appendChild(countInput);
configRow.appendChild(makeElement('span', 'Delay (s):'));
const delayInput = makeElement('input', {
type: 'text',
value: '1-3',
style: {
width: '60px',
background: '#333',
color: '#fff',
border: '1px solid #555',
padding: '4px',
},
});
configRow.appendChild(delayInput);
const actionRow = makeElement('div', {
style: { display: 'flex', gap: '8px' },
});
const btnStyle =
'padding: 6px 12px; cursor: pointer; border: none; border-radius: 4px; font-weight: bold; flex: 1; font-size: 12px;';
const startBtn = makeElement('button', {
style: btnStyle + 'background: #007acc; color: white;',
textContent: 'Start',
onclick: () => {
if (this.scraperRunning) return;
this.runDpcScraper(parseInt(countInput.value) || 3, delayInput.value);
},
});
const pauseBtn = makeElement('button', {
style: btnStyle + 'background: #d4a000; color: #111;',
textContent: 'Pause',
onclick: () => {
this.scraperPaused = !this.scraperPaused;
pauseBtn.textContent = this.scraperPaused ? 'Resume' : 'Pause';
pauseBtn.style.background = this.scraperPaused ? '#28a745' : '#d4a000';
pauseBtn.style.color = this.scraperPaused ? 'white' : '#111';
this.logScraper(
this.scraperPaused ? '--- PAUSED ---' : '--- RESUMED ---'
);
},
});
const jsonBtn = makeElement('button', {
style: btnStyle + 'background: #444; color: white;',
textContent: 'View JSON',
onclick: () => this.showScraperResults(),
});
actionRow.append(startBtn, pauseBtn, jsonBtn);
const logArea = makeElement('textarea', {
style: {
flex: '1',
width: '100%',
fontFamily: 'monospace',
fontSize: '11px',
background: '#111',
color: '#0f0',
border: '1px solid #444',
padding: '8px',
boxSizing: 'border-box',
resize: 'none',
},
placeholder: 'Log output...',
readOnly: true,
});
this.scraperLogEl = logArea;
container.append(title, configRow, actionRow, logArea);
new DialogBox({
title: 'DPC Automation',
content: container,
width: '400px',
height: '500px',
position: [20, 80],
allowMaximize: true,
noPadding: true,
});
}
async runDpcScraper(count, delayStr) {
this.scraperResults = [];
this.scraperRunning = true;
this.scraperPaused = false;
this.logScraper(`Starting batch of ${count}. Delay: ${delayStr}s`);
const markers = Array.from(document.querySelectorAll('.dpc-marker'));
if (!markers.length) {
this.logScraper('Error: No ".dpc-marker" elements found.');
this.scraperRunning = false;
return;
}
const selected = [];
const pool = [...markers];
for (let i = 0; i < count && pool.length > 0; i++) {
const idx = Math.floor(Math.random() * pool.length);
selected.push(pool[idx]);
pool.splice(idx, 1);
}
for (let i = 0; i < selected.length; i++) {
while (this.scraperPaused) await new Promise((r) => setTimeout(r, 500));
const marker = selected[i];
this.logScraper(`--- Item ${i + 1}/${selected.length} ---`);
const coords = this._getMarkerCoords(marker);
try {
marker.click();
} catch (e) {
this.logScraper('Error clicking marker: ' + e.message);
continue;
}
await this._scraperWait(delayStr);
const sidebar = document.querySelector('.ant-drawer-content');
if (!sidebar) {
this.logScraper('Sidebar not found.');
continue;
}
const basicData = this._scrapeSidebar(sidebar);
const record = {
id: i + 1,
markerLocation: coords,
...basicData,
fullProfileData: {},
};
if (record.profileLink) {
await this._scraperWait(delayStr);
this.logScraper('Loading iframe...');
const iframe = document.createElement('iframe');
Object.assign(iframe.style, {
position: 'fixed',
left: '-9999px',
width: '1200px',
height: '1200px',
});
iframe.src = record.profileLink;
document.body.appendChild(iframe);
await new Promise((r) => setTimeout(r, 3500));
try {
const doc = iframe.contentDocument;
if (doc) {
record.fullProfileData = this._scrapeProfile(doc);
this.logScraper('Iframe data captured.');
} else {
record.fullProfileData = { error: 'CORS/Access Blocked' };
}
} catch (err) {
this.logScraper('Iframe error: ' + err.message);
record.fullProfileData = { error: err.message };
}
iframe.remove();
}
this.scraperResults.push(record);
this.logScraper(`Record saved. Name: ${record.name}`);
const closeBtn = sidebar.querySelector('.ant-drawer-close');
if (closeBtn) {
try {
closeBtn.click();
} catch (e) {}
} else {
document.body.click();
}
await this._scraperWait(delayStr);
}
this.scraperRunning = false;
this.logScraper('Batch complete.');
this.showScraperResults();
}
logScraper(msg) {
if (this.scraperLogEl) {
this.scraperLogEl.value += `[${new Date().toLocaleTimeString()}] ${msg}\n`;
this.scraperLogEl.scrollTop = this.scraperLogEl.scrollHeight;
}
console.log(`[DPC Scraper] ${msg}`);
}
async _scraperWait(delayStr) {
let min = 1,
max = 1;
if (typeof delayStr === 'string' && delayStr.includes('-')) {
const parts = delayStr.split('-').map((s) => parseFloat(s.trim()));
if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
min = Math.min(parts[0], parts[1]);
max = Math.max(parts[0], parts[1]);
}
} else {
const val = parseFloat(delayStr);
if (!isNaN(val)) min = max = val;
}
const duration = Math.random() * (max - min) + min;
await new Promise((resolve) => setTimeout(resolve, duration * 1000));
}
showScraperResults() {
const jsonOutput = JSON.stringify(this.scraperResults, null, 2);
const container = makeElement('div', {
style: {
display: 'flex',
flexDirection: 'column',
height: '100%',
width: '100%',
padding: '0',
},
});
const textArea = makeElement('textarea', {
style: {
flex: '1',
width: '100%',
fontFamily: 'monospace',
whiteSpace: 'pre',
background: '#222',
color: '#fff',
border: 'none',
padding: '10px',
boxSizing: 'border-box',
resize: 'none',
fontSize: '12px',
},
});
textArea.value = jsonOutput;
const footer = makeElement('div', {
style: {
padding: '8px',
background: '#333',
textAlign: 'right',
borderTop: '1px solid #444',
},
});
const copyBtn = makeElement('button', {
className: 'dialog-button primary',
style:
'padding: 6px 15px; cursor: pointer; background: #007acc; color: white; border: none; border-radius: 4px;',
textContent: 'Copy JSON',
onclick: () => {
textArea.select();
document.execCommand('copy');
copyBtn.textContent = 'Copied!';
setTimeout(() => (copyBtn.textContent = 'Copy JSON'), 2000);
},
});
footer.appendChild(copyBtn);
container.append(textArea, footer);
new DialogBox({
title: `Results (${this.scraperResults.length})`,
width: '600px',
height: '500px',
content: container,
noPadding: true,
allowMaximize: true,
});
}
_getMarkerCoords(marker) {
const rect = marker.getBoundingClientRect();
const markerCenterX = rect.left + rect.width / 2;
const markerCenterY = rect.top + rect.height / 2;
let mapContainer = null;
let curr = marker.parentElement;
while (curr && curr !== document.body) {
const style = window.getComputedStyle(curr);
const w = parseFloat(style.width);
const h = parseFloat(style.height);
if (
(w > 400 && h > 300) ||
curr.classList.contains('leaflet-container') ||
curr.classList.contains('gm-style') ||
curr.id.includes('map')
) {
mapContainer = curr;
break;
}
curr = curr.parentElement;
}
if (!mapContainer) mapContainer = document.body;
const mapRect = mapContainer.getBoundingClientRect();
const x = markerCenterX - mapRect.left;
const y = markerCenterY - mapRect.top;
return {
x: parseFloat(x.toFixed(2)),
y: parseFloat(y.toFixed(2)),
};
}
_scrapeSidebar(container) {
const data = {
name: 'Unknown',
tags: [],
details: {},
profileLink: null,
};
try {
const h3 = container.querySelector('.PracticeDetails h3');
data.name = h3
? h3.innerText.trim()
: container.querySelector('.ant-drawer-title')?.innerText.trim() ||
'Unknown';
container
.querySelectorAll('.Tag')
.forEach((t) => data.tags.push(t.innerText.trim()));
container.querySelectorAll('.IconItem').forEach((item) => {
const text = item.innerText.trim();
const link = item.querySelector('a')?.href;
if (item.querySelector('.anticon-check-circle'))
data.details.status = text;
else if (item.querySelector('.anticon-shop'))
data.details.address = text;
else if (item.querySelector('.anticon-phone'))
data.details.phone = text;
else if (item.querySelector('.anticon-link'))
data.details.website = text;
else if (item.querySelector('.anticon-printer'))
data.details.fax = text;
else if (item.querySelector('.anticon-environment') && link)
data.details.directionsUrl = link;
else if (item.querySelector('.anticon-user'))
data.details.doctorName = text;
});
container.querySelectorAll('.InfoItem').forEach((item) => {
const labelEl = item.querySelector('small');
if (!labelEl) return;
const label = labelEl.innerText
.toLowerCase()
.replace(/[^a-z0-9]/g, '_');
const contentEl = item.querySelector('div[style*="margin-top"]');
if (contentEl) {
data.details[label] = this._parseTableOrText(contentEl);
}
});
const links = Array.from(container.querySelectorAll('a'));
const profLink = links.find((a) =>
a.innerText.includes('View Full Profile')
);
if (profLink) data.profileLink = profLink.href;
} catch (e) {
this.logScraper('Error scraping sidebar: ' + e.message);
}
return data;
}
_scrapeProfile(doc) {
const profile = {
metaDescription: '',
doctorName: '',
logoUrl: '',
sections: {},
};
try {
const meta = doc.querySelector('meta[name="description"]');
if (meta) profile.metaDescription = meta.content;
const logo =
doc.querySelector('img.logo') || doc.querySelector('.Header img');
if (logo) profile.logoUrl = logo.src;
const personRow = doc.querySelector('.PersonRow');
if (personRow) {
const h4 = personRow.querySelector('h4');
if (h4) profile.doctorName = h4.innerText.trim();
const spec = personRow.querySelector('p small');
if (spec) profile.doctorSpecialty = spec.innerText.trim();
}
const sections = doc.querySelectorAll('.section');
sections.forEach((sec) => {
const titleEl = sec.querySelector('.sectiontitle, h2, h3');
if (!titleEl) return;
const title = titleEl.innerText.toLowerCase().trim();
const infoData = {};
const infoItems = sec.querySelectorAll('.InfoItem');
if (infoItems.length > 0) {
infoItems.forEach((item) => {
const labelEl = item.querySelector('small');
if (labelEl) {
const key = labelEl.innerText.trim();
const valContainer = item.querySelector(
'div[style*="margin-top"]'
);
if (valContainer) {
infoData[key] = this._parseTableOrText(valContainer);
}
}
});
profile.sections[title] = infoData;
} else {
const contentEl = sec.querySelector('.sectionitem');
if (contentEl) {
profile.sections[title] = contentEl.innerText.trim();
}
}
});
if (profile.sections['prices and fees']) {
profile.pricing = profile.sections['prices and fees'];
}
} catch (e) {
profile.error = 'Error parsing profile: ' + e.message;
}
return profile;
}
_parseTableOrText(element) {
if (!element) return '';
const tables = element.querySelectorAll('.table');
if (tables.length > 0) {
const results = {};
tables.forEach((table) => {
const rows = Array.from(table.children);
rows.forEach((row) => {
const els = Array.from(row.querySelectorAll('p, span, b, div'));
const textNodes = els.filter(
(e) => e.innerText.trim().length > 0 && e.children.length === 0
);
if (textNodes.length >= 2) {
const k = textNodes[0].innerText.trim().replace(/:$/, '');
const v = textNodes[textNodes.length - 1].innerText.trim();
if (k && v) results[k] = v;
}
});
});
if (Object.keys(results).length > 0) return results;
}
return element.innerText.trim();
}
}
var a=new Aardvark();a.init();window._aardvarkInstance=a;
})()