// File: src/SankeyDiagram.js

class SankeyDiagram {

    // --- Configuration ---
    config = {
        nodeWidth: 25,
        verticalMargin: 50,
        flowOpacity: 0.45,
        colors: { // Default palette if data doesn't provide colors
          A: "#8dd3c7", B: "#fdb462", C: "#bebada", D: "#fb8072",
          E: "#80b1d3", F: "#b3de69", G: "#fccde5", H: "#bc80bd",
          I: "#ccebc5", J: "#ffed6f", K: "#66c2a5", L: "#fc8d62",
          M: "#8da0cb", N: "#e78ac3", O: "#a6d854", P: "#e5c494",
          Default: "#b3b3b3" // A nicer, lighter gray for the fallback
      },
        labelOffset: 8,
        drawNodeVotes: true,
        drawNodeNames: true,
        drawRoundLabels: true,
        bezierCurviness: 0.4,
        minNodeHeightForVoteLabel: 15,
        minColumnGap: 50,
        nodeStrokeColor: 'rgba(0,0,0,0.2)', // Stroke for the vertical node rectangles
        nodeStrokeWidth: 0.75,
        flowStrokeColor: 'rgba(0,0,0,0.3)', // Outline color for flows
        flowStrokeWidth: 0.6,              // Outline width for flows
        labelZIndex: 10,
        minFlowThickness: 0.5, // Minimum pixels for a flow path d calculation
    };

    // --- State ---
    container = null;        // The DIV the SVG element lives in
    svgElement = null;       // The main SVG element itself
    svgDefs = null;          // Store reference to <defs> for gradients
    domOverlayContainer = null; // The DIV the DOM labels live in
    electionData = null;
    calculatedLayout = {};
    currentWidth = 0;
    currentHeight = 0;
    domLabels = [];          // Track created DOM labels for clearing
    gradientCount = 0;     // Counter for unique gradient IDs
    _processedDataCache = null; // Cache for processed round data

    constructor(targetContainer, domOverlayContainer, initialData, options = {}) {
        if (!targetContainer || !domOverlayContainer) {
            throw new Error("SankeyDiagram requires both a target SVG container and a DOM overlay container.");
        }
        this.container = targetContainer;
        this.domOverlayContainer = domOverlayContainer;

        this.configure(options); // Apply initial config overrides
        if (initialData) {
            this.setData(initialData);
        }
    } // end constructor

    configure(newOptions = {}) {
        Object.assign(this.config, newOptions);
        if (this.svgElement && this.electionData) {
            this.draw();
        }
    } // end configure

    setData(data) {
        if (!data || !data.candidates || !data.rounds) {
            console.error("Invalid election data format provided.", data);
            this.clear(); this.electionData = null; return;
        }
        this.electionData = data;
        this._processedDataCache = null; // Clear cache when data changes
        if (this.svgElement && this.currentWidth > 0 && this.currentHeight > 0) {
            this.draw();
        }
    } // end setData

     resize(newWidth, newHeight) {
        if (newWidth <= 0 || newHeight <= 0) { return; }
        this.currentWidth = Math.floor(newWidth); this.currentHeight = Math.floor(newHeight);
        if (this.electionData) { this.draw(); }
     } // end resize

    draw() {
        if (!this.electionData) { this._prepareContainers(); return; }
        if (!this.container || !this.domOverlayContainer) { console.error("Containers missing"); return; }
        if (this.currentWidth <= 0 || this.currentHeight <= 0) { console.warn("Size zero, cannot draw."); return; }

        this._prepareContainers();
        this._getAllProcessedData();
        this._calculateLayout();
        if(!this.calculatedLayout || !this.calculatedLayout.nodePositions || this.calculatedLayout.nodePositions.length === 0) {
            console.warn("Layout calculation failed or produced no rounds.");
            return;
        }

        this._drawBackground();

        const svgDrawingGroup = makeElement('svg:g');
        const allFlowData = [];
        const numRoundsInLayout = this.calculatedLayout.nodePositions.length;

        for (let i = 0; i < numRoundsInLayout - 1; i++) {
            const flows = this._calculateFlows(i, i + 1);
            if (flows) allFlowData.push(...flows);
        }
        allFlowData.sort((a, b) => b.thickness - a.thickness);

        const flowGroup = makeElement('svg:g', { class: 'all-flows' });
        allFlowData.forEach(flowData => {
             const pathElement = this._createFlowElements(flowData);
             if (pathElement) flowGroup.appendChild(pathElement);
        });
        svgDrawingGroup.appendChild(flowGroup);

        const nodeGroup = makeElement('svg:g', { class: 'all-nodes' });
        for (let i = 0; i < numRoundsInLayout; i++) {
             this._drawRoundNodes(nodeGroup, i);
        }
        svgDrawingGroup.appendChild(nodeGroup);
        this.svgElement.appendChild(svgDrawingGroup);

        this._drawRoundLabels();
        this._drawAllNodeLabels();
    } // end draw

    clear() {
        if (this.svgElement) { this.svgElement.remove(); this.svgElement = null; this.svgDefs = null; }
        this.domLabels.forEach(label => label.remove()); this.domLabels = [];
        this.calculatedLayout = {}; this.gradientCount = 0;
        this._processedDataCache = null;
    } // end clear

    _prepareContainers() {
        this.clear();
        this.svgElement = makeElement('svg:svg', { width: this.currentWidth, height: this.currentHeight, class: 'sankey-diagram-svg' });
        this.svgDefs = makeElement('svg:defs'); this.svgElement.appendChild(this.svgDefs);
        while (this.container.firstChild) { this.container.removeChild(this.container.firstChild); }
        this.container.appendChild(this.svgElement);
        while (this.domOverlayContainer.firstChild) { this.domOverlayContainer.removeChild(this.domOverlayContainer.firstChild); }
        if (!this.domOverlayContainer) { console.error("DOM Overlay container is missing!"); }
    } // end _prepareContainers

    // --- Data Processing ---
    _getAllProcessedData() {
      if (this._processedDataCache) {
          return this._processedDataCache;
      }
      if (!this.electionData || !this.electionData.rounds) return [];

      const allProcessed = [];
      // STEP 1: Process every single round sequentially to build a complete history.
      for (let i = 0; i < this.electionData.rounds.length; i++) {
          const roundData = this._getProcessedRoundData(i, allProcessed);
          if (roundData && roundData.length > 0) {
              allProcessed.push(roundData);
          } else {
              break;
          }
      }

      // STEP 2: Filter the fully processed data to remove redundant rounds before drawing.
      const filteredProcessedData = this._filterRedundantRounds(allProcessed);
      
      this._processedDataCache = filteredProcessedData;
      return filteredProcessedData;
  } // end _getAllProcessedData

  _filterRedundantRounds(processedRounds) {
    if (processedRounds.length < 2) {
        return processedRounds;
    }

    const filtered = [processedRounds[0]]; // Always keep the first round

    const areRoundsEffectivelyEqual = (roundA, roundB) => {
        const votesA = new Map(
            roundA.filter(c => c.totalVotes > 1e-9).map(c => [c.id, c.totalVotes])
        );
        const votesB = new Map(
            roundB.filter(c => c.totalVotes > 1e-9).map(c => [c.id, c.totalVotes])
        );

        if (votesA.size !== votesB.size) {
            return false;
        }

        for (const [id, count] of votesA) {
            if (!votesB.has(id) || Math.abs(votesB.get(id) - count) > 1e-9) {
                return false;
            }
        }
        
        return true;
    };

    for (let i = 1; i < processedRounds.length; i++) {
        const lastKeptRound = filtered[filtered.length - 1];
        const currentRound = processedRounds[i];

        if (!areRoundsEffectivelyEqual(lastKeptRound, currentRound) || i === processedRounds.length - 1) {
            filtered.push(currentRound);
        }
    }

    return filtered;
} // end _filterRedundantRounds

  _getProcessedRoundData(targetRoundIndex, allProcessedDataCache) {
    if (allProcessedDataCache[targetRoundIndex]) {
        return allProcessedDataCache[targetRoundIndex];
    }
    if (!this.electionData || !this.electionData.rounds[targetRoundIndex]) {
        console.error(`Missing raw data for round index ${targetRoundIndex}`);
        return [];
    }
    const targetRoundRawData = this.electionData.rounds[targetRoundIndex];

    if (targetRoundIndex === 0) {
        return targetRoundRawData.map(c => ({
            id: c.id, totalVotes: c.votes,
            segments: [{ sourceCandidateId: c.id, votes: c.votes }]
        }));
    }

    const prevProcessedRound = allProcessedDataCache[targetRoundIndex - 1];

    const prevVotesMap = prevProcessedRound.reduce((map, node) => {
        map[node.id] = { totalVotes: node.totalVotes, segments: node.segments.map(s => ({ ...s })) };
        return map;
    }, {});

    const targetVotesMap = targetRoundRawData.reduce((map, c) => {
        map[c.id] = c.votes; return map;
    }, {});

    const prevCandidates = new Set(Object.keys(prevVotesMap));
    const targetCandidates = new Set(Object.keys(targetVotesMap));
    const eliminatedCandidates = [...prevCandidates].filter(id => !targetCandidates.has(id));

    const targetProcessedData = [];

    targetRoundRawData.forEach(targetCandidateInfo => {
        const candidateId = targetCandidateInfo.id;
        const targetTotalVotes = targetCandidateInfo.votes;
        const prevData = prevVotesMap[candidateId];

        if (!prevData) {
            targetProcessedData.push({ id: candidateId, totalVotes: targetTotalVotes, segments: [{sourceCandidateId: candidateId, votes: targetTotalVotes }] });
            return;
        }

        let newSegments = prevData.segments;
        const votesGained = targetTotalVotes - prevData.totalVotes;

        if (votesGained > 1e-9 && eliminatedCandidates.length > 0) {
            const firstElimId = eliminatedCandidates[0];
            newSegments.push({ sourceCandidateId: firstElimId, votes: votesGained });
        }

        const finalSegments = newSegments.filter(s => s.votes > 0.01);
        targetProcessedData.push({
            id: candidateId, totalVotes: targetTotalVotes, segments: finalSegments
        });
    });

    return targetProcessedData;
} // end _getProcessedRoundData

    _calculateLayout() {
        const allProcessedData = this._getAllProcessedData();
        if (!allProcessedData || allProcessedData.length === 0) {
             console.error("Cannot calculate layout, no processed data available.");
             this.calculatedLayout = { colXs: [], nodePositions: [], scaleFactor: 0, columnGap: 0 };
             return;
        }

        const numRounds = allProcessedData.length;
        const numCols = numRounds;

        const availableWidth = this.currentWidth - 2 * this.config.verticalMargin;
        const availableHeight = this.currentHeight - 2 * this.config.verticalMargin;
        let scaleFactor = 1;

        if (availableHeight > 0 && allProcessedData[0]) {
            const totalVotesR1 = allProcessedData[0].reduce((sum, c) => sum + c.totalVotes, 0) || 1;
            scaleFactor = (totalVotesR1 > 0) ? availableHeight / totalVotesR1 : 1;
        } else { scaleFactor = 0; }
        if (scaleFactor === 0 && availableHeight > 0) scaleFactor = 0.01;

        let columnGap = this.config.minColumnGap;
        if (numCols > 1 && availableWidth > 0) {
            const totalNodeWidth = numCols * this.config.nodeWidth;
            const totalGapSpace = availableWidth - totalNodeWidth;
            columnGap = Math.max(this.config.minColumnGap, (totalGapSpace > 0) ? (totalGapSpace / (numCols - 1)) : this.config.minColumnGap);
        } else { columnGap = 0; }

        const colXs = [];
        for (let i = 0; i < numCols; i++) { colXs.push(this.config.verticalMargin + i * (this.config.nodeWidth + columnGap)); }

        const nodePositions = [];

        allProcessedData.forEach((roundData, i) => {
            let currentRoundY = this.config.verticalMargin;
            const roundNodes = {};

            roundData.sort((a, b) => {
                if (b.totalVotes !== a.totalVotes) {
                    return b.totalVotes - a.totalVotes;
                }
                return a.id.localeCompare(b.id);
            });

            roundData.forEach(candidateInfo => {
                const nodeX = colXs[i]; const nodeY = currentRoundY;
                let segmentOffsetY = 0;
                const segmentsWithHeight = candidateInfo.segments.map(segment => {
                    const height = Math.max(0, segment.votes * scaleFactor);
                    const segWithHeight = { ...segment, yOffset: segmentOffsetY, height: height, roundIndex: i };
                    segmentOffsetY += height;
                    return segWithHeight;
                });

                const actualTotalHeight = segmentsWithHeight.reduce((sum, seg) => sum + seg.height, 0);
                const isFinalRound = (i === numRounds - 1);
                const isWinner = isFinalRound && this.electionData.winner === candidateInfo.id;

                roundNodes[candidateInfo.id] = {
                     id: candidateInfo.id, name: this._getCandidateName(candidateInfo.id), x: nodeX, y: nodeY,
                     width: this.config.nodeWidth, height: actualTotalHeight,
                     totalVotes: candidateInfo.totalVotes,
                     segments: segmentsWithHeight,
                     isWinner: isWinner, roundIndex: i
                };
                currentRoundY += actualTotalHeight;
            });
            nodePositions.push(roundNodes);
        });
        this.calculatedLayout = { colXs, nodePositions, scaleFactor, columnGap };
    } // end _calculateLayout

    _drawBackground() {
        if (!this.svgElement) return;
        const background = makeElement('svg:rect', { x: 0, y: 0, width: this.currentWidth, height: this.currentHeight, fill: '#ffffff' });
        if (this.svgDefs) { this.svgElement.insertBefore(background, this.svgDefs.nextSibling); }
        else { this.svgElement.insertBefore(background, this.svgElement.firstChild); }
    } // end _drawBackground

    _drawRoundNodes(parentSvgGroup, roundIndex) {
        const roundPositions = this.calculatedLayout.nodePositions[roundIndex];
        if (!roundPositions) return;
        Object.values(roundPositions).forEach(nodeInfo => {
             if (nodeInfo && typeof nodeInfo.x === 'number' && typeof nodeInfo.y === 'number') { this._drawCandidateNode(parentSvgGroup, nodeInfo); }
             else { console.warn(`Invalid nodeInfo encountered for round ${roundIndex}:`, nodeInfo); }
        });
    } // end _drawRoundNodes

    _drawCandidateNode(parentSvgGroup, nodeInfo) {
        const nodeGroup = makeElement('svg:g', { class: `candidate-node-${nodeInfo.id}` });
        const nodeColor = this._getCandidateColor(nodeInfo.id);
        nodeInfo.segments.forEach(segment => {
            if (segment.height > 0.01) {
                const rectY = nodeInfo.y + segment.yOffset;
                const segmentRect = makeElement('svg:rect', {
                    x: nodeInfo.x, y: rectY, width: nodeInfo.width, height: segment.height, fill: nodeColor,
                    class: 'candidate-node-segment', stroke: this.config.nodeStrokeColor, 'stroke-width': this.config.nodeStrokeWidth,
                    'vector-effect': 'non-scaling-stroke',
                });
                segmentRect.appendChild(makeElement('svg:title', `${this._getCandidateName(segment.sourceCandidateId)}: ${this._formatVoteCount(segment.votes)} votes`));
                nodeGroup.appendChild(segmentRect);
            }
        });
        if (nodeGroup.childNodes.length > 0) { parentSvgGroup.appendChild(nodeGroup); }
    } // end _drawCandidateNode

    _drawRoundLabels() {
        if (!this.config.drawRoundLabels || !this.calculatedLayout.colXs) return;
        const labelY = this.config.verticalMargin - 25;
        const numRoundsInLayout = this.calculatedLayout.nodePositions.length;
        for (let i = 0; i < numRoundsInLayout; i++) {
            if (this.calculatedLayout.colXs[i] !== undefined) {
                 const labelX = this.calculatedLayout.colXs[i] + this.config.nodeWidth / 2;
                 const labelText = (i === numRoundsInLayout - 1 && numRoundsInLayout > 1) ? `Round ${i + 1} (Result)` : `Round ${i + 1}`;
                 this._createDomLabel(labelText, labelX, labelY, ['sankey-dom-round-label'], { h: 'center' });
            }
        }
    } // end _drawRoundLabels

    _drawAllNodeLabels() {
      const numRoundsInLayout = this.calculatedLayout.nodePositions.length;
      this.calculatedLayout.nodePositions.forEach((roundNodes, roundIndex) => {
          const isFinalDisplayedColumn = (roundIndex === numRoundsInLayout - 1);
          Object.values(roundNodes).forEach(nodeInfo => {
               if (nodeInfo && typeof nodeInfo.x === 'number' && typeof nodeInfo.y === 'number') {
                   this._drawSingleNodeDomLabels(nodeInfo, isFinalDisplayedColumn);
               }
          });
      });
  } // end _drawAllNodeLabels

  _drawSingleNodeDomLabels(nodeInfo, isFinalDisplayedColumn) {
    if (nodeInfo.height < 1 && nodeInfo.totalVotes < 1) return;

   // Draw candidate names ONLY for the first and last rounds to reduce clutter.
   const isFirstRound = nodeInfo.roundIndex === 0;
   if (this.config.drawNodeNames && (isFirstRound || isFinalDisplayedColumn)) {
       const nameLabelX = nodeInfo.x + nodeInfo.width + this.config.labelOffset;
       const nameLabelY = nodeInfo.y + nodeInfo.height / 2;
       let nameText = nodeInfo.name;

       // In the final round, append the vote count or winner status to the name.
       if (isFinalDisplayedColumn) {
           if (nodeInfo.isWinner) {
               nameText += " (Winner!)";
           } else if (nodeInfo.totalVotes !== undefined) {
               nameText += ` (${this._formatVoteCount(nodeInfo.totalVotes)})`;
           }
       }
       // Give candidate labels a higher z-index so they appear over vote counts
       this._createDomLabel(nameText, nameLabelX, nameLabelY, ['sankey-dom-candidate-label'], { v: 'middle' }, this.config.labelZIndex + 1);
   }

   // The vote label inside the node should be drawn for all rounds where the node is big enough.
   if (this.config.drawNodeVotes && nodeInfo.height >= this.config.minNodeHeightForVoteLabel && nodeInfo.totalVotes !== undefined) {
       const voteLabelX = nodeInfo.x + nodeInfo.width / 2; const voteLabelY = nodeInfo.y + nodeInfo.height / 2;
       const voteText = String(this._formatVoteCount(nodeInfo.totalVotes)); const nodeColor = this._getCandidateColor(nodeInfo.id);
       const useDarkText = this._isLightColor(nodeColor); const voteClasses = ['sankey-dom-vote-label'];
       if (useDarkText) voteClasses.push('dark-text');
       // Vote labels get the default z-index
       this._createDomLabel(voteText, voteLabelX, voteLabelY, voteClasses, { h: 'center', v: 'middle' }, this.config.labelZIndex);
   }
} // end _drawSingleNodeDomLabels

     _createDomLabel(text, x, y, classes = [], anchor = {}, zIndex = this.config.labelZIndex) {
        const label = makeElement('div', { class: ['sankey-dom-label', ...classes].join(' ') }, text);
        this._positionDomElement(label, x, y, anchor);
        label.style.zIndex = zIndex;
        this.domOverlayContainer.appendChild(label);
        this.domLabels.push(label);
        return label;
    } // end _createDomLabel

    _positionDomElement(element, x, y, anchor = {}) {
         let transform = '';
         if (anchor.h === 'center') { transform += 'translateX(-50%) '; } else if (anchor.h === 'right') { transform += 'translateX(-100%) '; }
         if (anchor.v === 'middle') { transform += 'translateY(-50%)'; } else if (anchor.v === 'bottom') { transform += 'translateY(-100%)'; }
         Object.assign(element.style, { position: 'absolute', left: `${x}px`, top: `${y}px`, transform: transform.trim(), minWidth: '1px', minHeight: '1px' });
    } // end _positionDomElement

    // --- Flow Calculation & Drawing ---

    _calculateFlows(fromRoundIndex, toRoundIndex) {
        const fromNodes = this.calculatedLayout.nodePositions[fromRoundIndex];
        const toNodes = this.calculatedLayout.nodePositions[toRoundIndex];
        if (!fromNodes || !toNodes) { return null; }

        const flows = [];
        const scaleFactor = this.calculatedLayout.scaleFactor;
        const sourceSegmentYOffsets = {};
        const targetSegmentYOffsets = {};

        Object.values(toNodes).forEach(toNode => {
             toNode.segments.forEach(toSegment => {
                 const sourceCandidateId = toSegment.sourceCandidateId;
                 const currentTargetNodeId = toNode.id;
                 const votesReceived = toSegment.votes;

                 if (votesReceived <= 0) return;

                 let effectiveFromNodeId;
                 const sourceNodeInPrevRound = fromNodes[sourceCandidateId];

                 if (sourceNodeInPrevRound) {
                     const sourceNodeInCurrentRound = toNodes[sourceCandidateId];
                     if (!sourceNodeInCurrentRound) {
                         effectiveFromNodeId = sourceCandidateId;
                     } else {
                         effectiveFromNodeId = currentTargetNodeId;
                     }
                 } else {
                     effectiveFromNodeId = currentTargetNodeId;
                 }

                 const fromNode = fromNodes[effectiveFromNodeId];
                 if (!fromNode) {
                      console.warn(`Flow Error: Could not find determined fromNode object ID ${effectiveFromNodeId} for target ${currentTargetNodeId}<-${sourceCandidateId} between R${fromRoundIndex+1} & R${toRoundIndex+1}`);
                      return;
                 }
                 const fromSegment = fromNode.segments.find(s => s.sourceCandidateId === sourceCandidateId);
                 if (!fromSegment) {
                     console.warn(`Flow Error: Determined fromNode ${fromNode.id} (R${fromRoundIndex+1}) does not contain segment for original source ${sourceCandidateId} (Target: ${currentTargetNodeId} in R${toRoundIndex+1})`);
                     return;
                 }

                 const votesToFlow = votesReceived;
                 const flowThickness = Math.max(this.config.minFlowThickness, votesToFlow * scaleFactor);
                 if (flowThickness < this.config.minFlowThickness) { return; }

                 const sourceOffsetYKey = `${fromNode.id}_${sourceCandidateId}`;
                 const targetOffsetYKey = `${toNode.id}_${sourceCandidateId}`;
                 if (sourceSegmentYOffsets[sourceOffsetYKey] === undefined) sourceSegmentYOffsets[sourceOffsetYKey] = 0;
                 if (targetSegmentYOffsets[targetOffsetYKey] === undefined) targetSegmentYOffsets[targetOffsetYKey] = 0;

                 const currentSourceOffset = sourceSegmentYOffsets[sourceOffsetYKey];
                 const currentTargetOffset = targetSegmentYOffsets[targetOffsetYKey];
                 const startY_top = fromNode.y + fromSegment.yOffset + currentSourceOffset;
                 const endY_top = toNode.y + toSegment.yOffset + currentTargetOffset;
                 sourceSegmentYOffsets[sourceOffsetYKey] += flowThickness;
                 targetSegmentYOffsets[targetOffsetYKey] += flowThickness;
                 const startX = fromNode.x + fromNode.width;
                 const endX = toNode.x;
                 const sourceColor = this._getCandidateColor(fromNode.id);
                 const destinationColor = this._getCandidateColor(toNode.id);

                 flows.push({
                     fromId: fromNode.id, toId: toNode.id, originalSourceId: sourceCandidateId,
                     votes: votesToFlow, startX: startX, startY_top: startY_top, endX: endX, endY_top: endY_top,
                     thickness: flowThickness, sourceColor: sourceColor, destinationColor: destinationColor,
                     fromName: this._getCandidateName(fromNode.id), toName: this._getCandidateName(toNode.id),
                     fromRoundIndex: fromRoundIndex, toRoundIndex: toRoundIndex
                 });
             });
         });
        return flows;
    } // end _calculateFlows

     _createFlowElements(flowData) {
        if (!this.svgDefs) { console.error("SVG <defs> element missing."); return null; }
        if (flowData.thickness < this.config.minFlowThickness) { return null; }

        this.gradientCount++;
        const gradientId = `sankeyGradient-${this.gradientCount}`;
        const gradient = makeElement('svg:linearGradient', { id: gradientId, x1: "0%", y1: "0%", x2: "100%", y2: "0%" });
        gradient.appendChild(makeElement('svg:stop', { offset: "0%", 'stop-color': flowData.sourceColor }));
        gradient.appendChild(makeElement('svg:stop', { offset: "100%", 'stop-color': flowData.destinationColor }));
        this.svgDefs.appendChild(gradient);

        const pathD = this._calculateFilledPathD(
           flowData.startX, flowData.startY_top,
           flowData.endX, flowData.endY_top,
           flowData.thickness
        );

        if (!pathD) { return null; }

        const path = makeElement('svg:path', {
            d: pathD, class: 'sankey-flow-path', fill: `url(#${gradientId})`,
            'fill-opacity': this.config.flowOpacity,
            stroke: this.config.flowStrokeColor,
            'stroke-width': this.config.flowStrokeWidth, 'vector-effect': 'non-scaling-stroke',
        });
        path.appendChild(makeElement('svg:title',
            `${flowData.fromName} -> ${flowData.toName} (${this._getCandidateName(flowData.originalSourceId)}): ${this._formatVoteCount(flowData.votes)} votes`
        ));
        return path;
     } // end _createFlowElements

     _calculateFilledPathD(x1, y1_top, x2, y2_top, thickness) {
        if (thickness < this.config.minFlowThickness) return null;
        const y1_bottom = y1_top + thickness; const y2_bottom = y2_top + thickness;
        const curveFactor = this.config.bezierCurviness; const dx = x2 - x1;
        const c1x = x1 + dx * curveFactor; const c2x = x2 - dx * curveFactor;
        const c1y_top = y1_top; const c2y_top = y2_top;
        const c1y_bottom = y1_bottom; const c2y_bottom = y2_bottom;
        const pathData = `M ${x1.toFixed(2)} ${y1_top.toFixed(2)} C ${c1x.toFixed(2)} ${c1y_top.toFixed(2)}, ${c2x.toFixed(2)} ${c2y_top.toFixed(2)}, ${x2.toFixed(2)} ${y2_top.toFixed(2)} L ${x2.toFixed(2)} ${y2_bottom.toFixed(2)} C ${c2x.toFixed(2)} ${c2y_bottom.toFixed(2)}, ${c1x.toFixed(2)} ${c1y_bottom.toFixed(2)}, ${x1.toFixed(2)} ${y1_bottom.toFixed(2)} Z`;
        if (pathData.includes("NaN")) { console.warn("NaN detected in path data:", { x1, y1_top, x2, y2_top, thickness }); return null; }
        return pathData;
    } // end _calculateFilledPathD

    _formatVoteCount(count) {
        if (count === null || count === undefined) return '';
        // A small epsilon to handle floating point inaccuracies for what should be integers
        if (Math.abs(count - Math.round(count)) < 1e-9) {
            return Math.round(count);
        }
        return count.toFixed(2);
    } // end _formatVoteCount

    _getCandidateName(candidateId) { return this.electionData?.candidates[candidateId]?.name || candidateId || "Unknown"; }
    _getCandidateColor(candidateId) {
        const candData = this.electionData?.candidates[candidateId];
        return candData?.color || this.config.colors[candidateId] || this.config.colors.Default;
    } // end _getCandidateColor
    _isLightColor(hexColor) { if (!hexColor || typeof hexColor !== 'string' || !hexColor.startsWith('#')) return false; try { const hex = hexColor.substring(1); let r, g, b; if (hex.length === 3) { r = parseInt(hex[0] + hex[0], 16); g = parseInt(hex[1] + hex[1], 16); b = parseInt(hex[2] + hex[2], 16); } else if (hex.length === 6) { r = parseInt(hex.substring(0, 2), 16); g = parseInt(hex.substring(2, 4), 16); b = parseInt(hex.substring(4, 6), 16); } else { return false; } const luminance = (r * 0.299 + g * 0.587 + b * 0.114); return luminance > 160; } catch (e) { console.warn("Color parsing error in _isLightColor:", hexColor, e); return false; } }


}