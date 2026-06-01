
class Curve {
  static _generatePathString(vertices, viewTransform) {
    if (!vertices || vertices.length === 0) return '';

    const startPt = viewTransform.worldToScreen(vertices[0].point);
    let d = `M ${startPt[0]} ${startPt[1]}`;
    if (vertices.length < 2) return d;

    for (let i = 0; i < vertices.length - 1; i++) {
      let vStart = vertices[i];
      let vEnd = vertices[i + 1];

      const cp1 = viewTransform.worldToScreen(vStart.controlPoints[1]);
      const cp2 = viewTransform.worldToScreen(vEnd.controlPoints[0]);
      const endPt = viewTransform.worldToScreen(vEnd.point);

      d += ` C ${cp1[0]} ${cp1[1]}, ${cp2[0]} ${cp2[1]}, ${endPt[0]} ${endPt[1]}`;
    }
    return d;
  }

  constructor(svg) {
    this.svg = svg;
    this.vertices = [];
    this.group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.group.setAttribute('class', 'curve-group');

    this.pathElement = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    );
    this.pathElement.setAttribute('stroke', '#eee');
    this.pathElement.setAttribute('stroke-width', '3');
    this.pathElement.setAttribute('fill', 'none');
    this.pathElement.setAttribute('stroke-linecap', 'round');
    this.pathElement.setAttribute('stroke-linejoin', 'round');
    this.pathElement.setAttribute('pointer-events', 'none');
    this.group.appendChild(this.pathElement);

    this.verticesGroup = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'g'
    );
    this.verticesGroup.setAttribute('class', 'vertices');
    this.verticesGroup.setAttribute('pointer-events', 'auto');
    this.group.appendChild(this.verticesGroup);

    this.controlGroup = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'g'
    );
    this.controlGroup.setAttribute('class', 'controls');
    this.controlGroup.setAttribute('pointer-events', 'none');
    this.group.appendChild(this.controlGroup);

    this.vertexElements = [];

    svg.appendChild(this.group);
  }

  updateEphemeralLine(startPt, endPt) {
    if (!this.ephemeralLine) {
      this.ephemeralLine = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'line'
      );
      this.ephemeralLine.setAttribute('stroke', 'gray');
      this.ephemeralLine.setAttribute('stroke-width', '1');
      this.ephemeralLine.setAttribute('stroke-dasharray', '4,2');
      this.ephemeralLine.setAttribute('pointer-events', 'none');
      this.group.appendChild(this.ephemeralLine);
    }
    this.ephemeralLine.setAttribute('x1', startPt[0]);
    this.ephemeralLine.setAttribute('y1', startPt[1]);
    this.ephemeralLine.setAttribute('x2', endPt[0]);
    this.ephemeralLine.setAttribute('y2', endPt[1]);
    this.ephemeralLine.style.display = 'inline';
  }

  hideEphemeralLine() {
    if (this.ephemeralLine) {
      this.ephemeralLine.style.display = 'none';
    }
  }

  addVertex(point, properties = {}) {
    const vertex = new BezierVertex(point);
    // Apply any passed-in properties, like curvature and balance
    Object.assign(vertex, properties);

    this.vertices.push(vertex);

    let circle = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle'
    );
    // The point is in world coordinates. The render method will position it correctly.
    // Setting cx/cy here is temporary until the first render.
    circle.setAttribute('cx', point[0]);
    circle.setAttribute('cy', point[1]);
    circle.setAttribute('r', '4');
    circle.setAttribute('fill', '#2ecc71');
    circle.setAttribute('stroke', '#27ae60');
    circle.setAttribute('stroke-width', '2');

    circle.classList.add('vertex');
    circle._vertex = vertex;
    circle._curve = this;

    this.verticesGroup.appendChild(circle);
    this.vertexElements.push(circle);
    return vertex;
  }

  render(
    viewTransform,
    activeVertex = null,
    hoveredVertex = null,
    previewPoint = null
  ) {
    let renderVertices = this.vertices;
    let iterations = 8;

    if (previewPoint && this.vertices.length > 0) {
      iterations = 4;
      // The previewPoint is in WORLD coordinates, as it comes from getMousePosition
      renderVertices = [...this.vertices];
      const tentativeVertex = new BezierVertex(previewPoint);
      tentativeVertex.isTentative = true;
      renderVertices.push(tentativeVertex);
    }

    UpdateControlPoints.run(renderVertices, iterations);

    let d = Curve._generatePathString(renderVertices, viewTransform);
    this.pathElement.setAttribute('d', d);

    for (let i = 0; i < this.vertices.length; i++) {
      let v = this.vertices[i];
      let circle = this.vertexElements[i];

      const screenPos = viewTransform.worldToScreen(v.point);
      circle.setAttribute('cx', screenPos[0]);
      circle.setAttribute('cy', screenPos[1]);

      const isActive =
        activeVertex && activeVertex.curve === this && activeVertex.index === i;
      const isHovered =
        hoveredVertex &&
        hoveredVertex.curve === this &&
        hoveredVertex.index === i;

      // Note: The radius is a screen-space value, so it doesn't need transformation
      if (isActive) {
        circle.setAttribute('r', '6');
        circle.setAttribute('fill', '#f1c40f');
        circle.setAttribute('stroke', '#f39c12');
      } else if (isHovered) {
        circle.setAttribute('r', '8');
        circle.setAttribute('fill', '#e74c3c');
        circle.setAttribute('stroke', '#c0392b');
      } else {
        circle.setAttribute('r', '4');
        circle.setAttribute('fill', '#2ecc71');
        circle.setAttribute('stroke', '#27ae60');
      }
    }
    this._drawControls(renderVertices, viewTransform, activeVertex);
  }

  _drawControls(verticesArray, viewTransform, activeVertex) {
    while (this.controlGroup.firstChild) {
      this.controlGroup.removeChild(this.controlGroup.firstChild);
    }

    // We now draw controls for ALL vertices, not just the active one.
    // Visibility is handled via CSS classes applied by DrawingApp.

    for (let i = 0; i < verticesArray.length; i++) {
      const v = verticesArray[i];

      // 1. Draw Labels
      const screenPos = viewTransform.worldToScreen(v.point);
      // Simple labeling: A, B, C... Z, AA, AB...
      const charCode = 65 + (i % 26);
      const suffix = Math.floor(i / 26) > 0 ? Math.floor(i / 26) : '';
      const labelText = String.fromCharCode(charCode) + suffix;

      const label = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'text'
      );
      label.textContent = labelText;
      label.setAttribute('x', screenPos[0] + 10);
      label.setAttribute('y', screenPos[1] - 10);
      label.setAttribute('class', 'construction-label');
      this.controlGroup.appendChild(label);

      // 2. Draw Control Handles
      if (v.controlPoints) {
        // CP0 (Incoming tangent)
        if (i > 0) {
          this.controlGroup.appendChild(
            this._createControlElement(
              v.point,
              v.controlPoints[0],
              viewTransform
            )
          );
        }
        // CP1 (Outgoing tangent)
        if (i < verticesArray.length - 1) {
          this.controlGroup.appendChild(
            this._createControlElement(
              v.point,
              v.controlPoints[1],
              viewTransform
            )
          );
        }
      }
    }
  }

  _createControlElement(p1World, p2World, viewTransform) {
    const p1Screen = viewTransform.worldToScreen(p1World);
    const p2Screen = viewTransform.worldToScreen(p2World);

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', p1Screen[0]);
    line.setAttribute('y1', p1Screen[1]);
    line.setAttribute('x2', p2Screen[0]);
    line.setAttribute('y2', p2Screen[1]);
    line.setAttribute('class', 'construction-line'); // Replaces hardcoded styles
    g.appendChild(line);

    const circle = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'circle'
    );
    circle.setAttribute('cx', p2Screen[0]);
    circle.setAttribute('cy', p2Screen[1]);
    circle.setAttribute('class', 'construction-cp'); // Replaces hardcoded styles
    g.appendChild(circle);

    return g;
  }

}

