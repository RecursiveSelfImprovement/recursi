class TreeNode {
    constructor(data, fileTreeViewInstance, parentNode = null) {
      this.id = data.id;
      this.name = data.name;
      this.type = data.type;
      this.isExpanded =
        data.isExpanded ?? (this.type === 'directory' && !parentNode);
      this.parentNode = parentNode;
      this.fileTreeView = fileTreeViewInstance;
      this.readOnly = data.readOnly || false;

      this.children = (data.children || []).map(
        (childData) => new TreeNode(childData, fileTreeViewInstance, this)
      );

      this.metadata = {};

      this.isOpen = false;
      this.isDirty = false;
      this.isSelected = false;
      this.isInMemory = data.isInMemory || false;
      this.hasDocs = data.hasDocs || false;

      this.domElement = null;
      this.contentElement = null;
      this._lastKnownVisibility = true;

      this.currentX = 0;
      this.currentY = 0;
      this.currentOpacity = 0;
    }

    updateStyle() {
      if (!this.domElement) return;

      this.domElement.style.left = `${this.currentX}px`;
      this.domElement.style.top = `${this.currentY}px`;
      this.domElement.style.opacity = this.currentOpacity;
      this.domElement.style.pointerEvents =
        this.currentOpacity > 0.1 ? 'auto' : 'none';
      this.domElement.style.width = `calc(100% - ${this.currentX}px)`;
    }

    updateVisualState() {
      if (!this.domElement) return;

      this.domElement.classList.toggle('file', this.type === 'file');
      this.domElement.classList.toggle('directory', this.type === 'directory');

      const shouldBeOpen = this.isOpen && this.type === 'file';
      const shouldBeSelected = this.isSelected && this.type === 'file';

      this.domElement.classList.toggle('is-open', shouldBeOpen);
      this.domElement.classList.toggle('selected', shouldBeSelected);

      this.domElement.classList.toggle('is-expanded', this.isExpanded && this.type === 'directory');
      this.domElement.classList.toggle('dirty', this.isDirty);
      this.domElement.classList.toggle('has-docs', this.hasDocs);
      this.domElement.classList.toggle('has-children', this.type === 'directory' && this.children.length > 0);

      const isPatched = this.fileTreeView?.app?.patchManager?.patchedFiles?.has(this.id);
      this.domElement.classList.toggle('is-patched', !!isPatched);

      if (this.nameElement) {
         if (this.type === 'file' && this.name.endsWith('.js') && this.metadata?.isStrictCapsule) {
            this.nameElement.textContent = this.name.slice(0, -3);
         } else {
            this.nameElement.textContent = this.name;
         }
      }
    }

    toggleExpandCollapse(onComplete) {
      if (this.type !== 'directory' || this.children.length === 0) {
        if (onComplete) onComplete();
        return;
      }
      this.isExpanded = !this.isExpanded;
      this.updateVisualState();
      this.fileTreeView.handleExpansionChange(this, onComplete);
    }

    setOpen(isOpen) {
      this.isOpen = isOpen;
    }

    setDirty(isDirty) {
      if (this.type !== 'file' || this.isDirty === isDirty) return;
      this.isDirty = isDirty;
      this.updateVisualState();
    }

    setSelected(selected) {
      this.isSelected = selected;
    }

    getConnectionPoint() {
      if (!this.fileTreeView || !this.fileTreeView.options) return null;
      const nodeHeight = this.fileTreeView.options.nodeHeight;
      const indentation = this.fileTreeView.options.indentation;

      const connectionY = this.currentY + nodeHeight * 0.5;
      const verticalLineX = this.currentX + indentation * 0.5;
      const connectionX = this.currentX + indentation * 0.5;

      if (isNaN(connectionX) || isNaN(connectionY) || isNaN(verticalLineX)) {
        return null;
      }
      return { x: connectionX, y: connectionY, verticalLineX };
    }

    updateToggleIcon() {
      if (this.type !== 'directory' || !this.toggleElement) return;

      this.toggleElement.innerHTML = '';
      if (this.children.length === 0) return;

      const options = this.fileTreeView.options;
      const toggleColor = options.toggleColor;

      const shadowColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--bg-secondary')
        .trim();

      const pathData = 'M 6 4 L 10 8 L 6 12';

      const shadowPath = makeElement('svg:path', {
        d: pathData,
        stroke: shadowColor,
        'stroke-width': options.arrowShadowWidth,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        fill: 'none',
      });

      const foregroundPath = makeElement('svg:path', {
        d: pathData,
        stroke: toggleColor,
        'stroke-width': options.arrowForegroundWidth,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        fill: 'none',
      });

      const svg = makeElement('svg:svg', { viewBox: '0 0 16 16' }, [
        shadowPath,
        foregroundPath,
      ]);
      this.toggleElement.appendChild(svg);
    }

    updateMetadata(metadata) {
      const previousHasDocs = !!this.hasDocs;
      this.metadata = metadata || {};

      const docSize = Number(this.metadata.docSize ?? this.metadata.docs ?? 0) || 0;
      const explicitHasDocs =
        this.metadata.hasDocs === true ||
        this.metadata.hasDocumentation === true ||
        this.metadata.documentation === true;

      this.hasDocs = previousHasDocs || explicitHasDocs || docSize > 0;

      if (this.visibilityWidget) {
        this.visibilityWidget.updateSizes(
          {
            code: Number(this.metadata.codeSize ?? this.metadata.code ?? this.metadata.lines ?? 0) || 0,
            docs: docSize,
            isStructured:
              !!this.metadata.isStructured ||
              /\.(js|mjs|cjs|ts|tsx|jsx)$/i.test(this.name),
            hasDocs: this.hasDocs,
            isStrictCapsule: !!this.metadata.isStrictCapsule,
            isPureDocCapsule: !!this.metadata.isPureDocCapsule
          },
          this.fileTreeView.widgetMaxSizes
        );
      }

      this.updateVisualState();
    }

    setVisibilityState(state) {
      if (!this.visibilityWidget) return;

      const input = state && typeof state === "object" ? state : {};

      let codeLevel = input.codeLevel;
      if (codeLevel === "full" || codeLevel === "code") codeLevel = 4;
      else if (codeLevel === "summary") codeLevel = 2;
      else if (codeLevel === "none") codeLevel = 0;
      else if (typeof codeLevel !== "number") {
        codeLevel =
          input.codeSelected !== undefined
            ? input.codeSelected ? 4 : 0
            : input.code !== undefined
              ? input.code ? 4 : 0
              : 0;
      }

      codeLevel = Math.max(0, Math.min(4, Number(codeLevel) || 0));

      let docsLevel = input.docsLevel;
      if (docsLevel === "full" || docsLevel === "signatures") docsLevel = 4;
      else if (docsLevel === "summary") docsLevel = 2;
      else if (docsLevel === "none") docsLevel = 0;
      else if (typeof docsLevel !== "number") {
        docsLevel =
          input.docsSelected !== undefined
            ? input.docsSelected ? 4 : 0
            : input.docs !== undefined
              ? input.docs ? 4 : 0
              : 0;
      }

      docsLevel = Math.max(0, Math.min(4, Number(docsLevel) || 0));

      const signatures =
        input.signatures !== undefined
          ? !!input.signatures
          : input.sig !== undefined
            ? !!input.sig
            : !!input.headerSelected;

      const translatedState = {
        code: codeLevel > 0,
        codeLevel,
        signatures,
        sig: signatures,
        docs: docsLevel > 0,
        docsLevel
      };

      this.visibilityWidget.setState(translatedState, true);
    }

    render() {
      if (!this.domElement) {
        this.domElement = makeElement('div', {
          className: `tree-node ${this.type}`,
          'data-node-id': this.id,
        });

        this.toggleElement = makeElement('span', {
          className: 'node-toggle',
        });

        if (this.type === 'directory') {
          this.updateToggleIcon();
          this.toggleElement.onclick = (e) => {
            e.stopPropagation();
            this.toggleExpandCollapse();
          };
        }

        this.contentElement = makeElement('div', {
          className: 'tree-node-content',
        });

        this.nameElement = makeElement(
          'span',
          {
            className: 'node-name',
            title: this.id,
          },
          this.name
        );

        if (this.type === 'directory') {
          this.contentElement.onclick = () => this.toggleExpandCollapse();
        }

        if (this.type === 'file') {
          this.contentElement.onclick = () =>
            this.fileTreeView._handleNodeSelection(this);

          this.nameElement.onclick = (e) => {
            e.stopPropagation();
            this.fileTreeView._handleFileOpen(this);
          };
        }

        if (typeof this.getIconElement === 'function') {
          this.contentElement.append(this.getIconElement(), this.nameElement);
        } else {
          this.contentElement.append(this.nameElement);
        }

        const actionsContainer = makeElement('div', {
          className: 'node-actions',
        });

        this.dirtyIndicator = makeElement(
          'span',
          {
            className: 'node-dirty-indicator',
          },
          '●'
        );

        actionsContainer.append(this.dirtyIndicator);

        if (this.type === 'file') {
          const isImage = /\.(png|jpg|jpeg|webp|gif|svg|ico|bmp)$/i.test(
            this.name
          );
          const isVisibilitySetFile = String(this.id).includes(
            '/visibilitySets/'
          );
          const isMetadataFile =
            this.name === '_folder.meta.yaml' ||
            this.name === 'file_metadata.json' ||
            this.name === 'project_metadata.json';

          const isHuge =
            (Number(this.metadata.codeSize || this.metadata.code || 0) || 0) >
            6000;

          if (!isImage && !isVisibilitySetFile && !isMetadataFile) {
            const widgetContainer = makeElement('div', {
              className: 'visibility-widget-container',
            });

            const isLib = this.id.startsWith('/library/');
            const pfm = this.fileTreeView.app?.projectFilesManager;
            const hasActiveSet = pfm && !!pfm.currentVisibilitySetName;

            let initCode = !isLib;
            let initSig = !isLib && /\.(js|mjs|cjs|ts|tsx|jsx)$/i.test(this.name);
            let initDocs =
              !isLib &&
              (!!this.hasDocs ||
                !!this.metadata.hasDocs ||
                (Number(this.metadata.docSize ?? this.metadata.docs ?? 0) || 0) >
                  0)
                ? 4
                : 0;

            if (hasActiveSet) {
              initCode = false;
              initSig = false;
              initDocs = 0;
            }

            this.visibilityWidget = new VisibilityWidget({
              fileData: {
                path: this.id,
                name: this.name,
                code:
                  Number(this.metadata.codeSize ?? this.metadata.code ?? 0) || 0,
                docs:
                  Number(this.metadata.docSize ?? this.metadata.docs ?? 0) || 0,
                isStructured:
                  !!this.metadata.isStructured ||
                  /\.(js|mjs|cjs|ts|tsx|jsx)$/i.test(this.name),
                hasDocs:
                  !!this.hasDocs ||
                  !!this.metadata.hasDocs ||
                  (Number(this.metadata.docSize ?? this.metadata.docs ?? 0) ||
                    0) > 0,
                isPureDocCapsule: !!this.metadata.isPureDocCapsule,
                isStrictCapsule: !!this.metadata.isStrictCapsule,
              },
              maxSizes: this.fileTreeView.widgetMaxSizes,
              initialState: {
                code: initCode,
                codeLevel: initCode ? 4 : 0,
                signatures: initSig,
                docsLevel: initDocs,
              },
              onChange: () => {
                if (this.fileTreeView.options.onVisibilityChange) {
                  this.fileTreeView.options.onVisibilityChange();
                }

                const manager = this.fileTreeView.app?.projectFilesManager;
                if (manager && typeof manager.onVisibilityChange === 'function') {
                  manager.onVisibilityChange(this, 'widget', this.fileTreeView);
                }
              },
            });

            widgetContainer.append(this.visibilityWidget.getElement());
            actionsContainer.append(widgetContainer);
          } else if (isHuge) {
            actionsContainer.append(
              makeElement(
                'div',
                {
                  className: 'node-huge-badge',
                  title: `File is too large for prompt selection (${
                    this.metadata.codeSize || 0
                  } lines)`,
                },
                'HUGE'
              )
            );
          }
        }

        this.contentElement.appendChild(actionsContainer);
        this.domElement.append(this.toggleElement, this.contentElement);
      }

      this.updateVisualState();
      this.updateMetadata(this.metadata);
      return this.domElement;
    }

    getIconElement() {
      if (this.iconElement) return this.iconElement;
      
      this.iconElement = makeElement('span', { 
        className: 'node-icon', 
        style: { 
          marginRight: '6px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: '16px',
          opacity: '0.85',
          transition: 'transform 0.15s ease'
        } 
      });

      let svg = '';
      if (this.type === 'directory') {
         svg = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#90CAF9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h4l2 2h6v8H2z"/></svg>`;
      } else {
         const ext = this.name.split('.').pop().toLowerCase();
         if (['js', 'ts', 'jsx', 'tsx'].includes(ext)) {
             svg = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#FDD835" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12L1 8l4-4M11 12l4-4-4-4M8 14L10 2"/></svg>`;
         } else if (['html', 'htm', 'xml'].includes(ext)) {
             svg = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#FF8A65" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5L1 8l3 3M12 5l3 3-3 3M8 2l-2 12"/></svg>`;
         } else if (['css', 'scss', 'less'].includes(ext)) {
             svg = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#64B5F6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h8v8H4zM4 8h8M8 4v8"/></svg>`;
         } else if (ext === 'json') {
             svg = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#81C784" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 2H3v12h2M11 2h2v12h-2M8 4v8"/></svg>`;
         } else if (['md', 'markdown', 'txt'].includes(ext)) {
             svg = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#E0E0E0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2h7l4 4v8H3z"/><path d="M10 2v4h4M5 8h6M5 11h4"/></svg>`;
         } else if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(ext)) {
             svg = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#CE93D8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="12" height="10" rx="2"/><circle cx="5.5" cy="6.5" r="1.5"/><path d="M2 10l3-3 4 4 2-2 3 3"/></svg>`;
         } else {
             svg = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#9E9E9E" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2h6l4 4v8H3z"/><path d="M9 2v4h4"/></svg>`;
         }
      }
      
      this.iconElement.innerHTML = svg;
      return this.iconElement;
    }
  
  static _doc_overview() {
      return [
        "# TreeNode",
        "",
        "The `TreeNode` represents an individual directory or file node within a `FileTreeView`.",
        "It acts as the visual state container, managing class lists, toggle icons, and nested metadata updates."
      ].join('\n');
    }

  static _doc_state() {
      return [
        "## Visual States and Custom Icons",
        "",
        "- **Class Binding**: Binds state classes (selected, open, dirty, has-docs, is-patched) and updates the DOM to display relevant file colors and checkmarks.",
        "- **Capsule Sizing**: Updates the file's `VisibilityWidget` sizes based on metadata line counts.",
        "- **Custom Icons**: Renders custom SVG icons based on file extensions (JS, HTML, CSS, JSON, Markdown, images) to provide clear visual cues."
      ].join('\n');
    }

  static _doc() {
      return [
        this._doc_overview(),
        this._doc_state()
      ].join('\n\n');
    }

  static getMarkdown() {
      return this._doc();
    }
}