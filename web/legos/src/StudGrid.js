class StudGrid {
  constructor(gridSize = 32) {
    this.gridSize = gridSize;
    this.occupied = [];
    this.topLayerPerStud = [];
    this.clear();
  }

  clear() {
    this.occupied.length = 0;
    this.topLayerPerStud.length = 0;
    for (let x = 0; x < this.gridSize; x++) {
      this.occupied[x] = [];
      this.topLayerPerStud[x] = [];
      for (let z = 0; z < this.gridSize; z++) {
        this.occupied[x][z] = [];
        this.topLayerPerStud[x][z] = 0; // baseplate top = layer 0
      }
    }
  }

  calcBaseLayerForFootprint(anchorX, anchorZ, width, length) {
    let maxTop = 0;
    for (let w = 0; w < width; w++) {
      for (let l = 0; l < length; l++) {
        const x = anchorX + w;
        const z = anchorZ + l;
        const tl = this.topLayerPerStud?.[x]?.[z] ?? 0;
        if (tl > maxTop) maxTop = tl;
      }
    }
    return maxTop + 1; // base layer is one above whatever is underneath
  }

  studsAreFree(anchorX, anchorZ, layer, width, length, heightUnits = 1) {
    for (let w = 0; w < width; w++) {
      for (let l = 0; l < length; l++) {
        const x = anchorX + w;
        const z = anchorZ + l;
        if (x < 0 || x >= this.gridSize || z < 0 || z >= this.gridSize)
          return false;
        for (let h = 0; h < heightUnits; h++) {
          if (this.occupied?.[x]?.[z]?.[layer + h]) return false;
        }
      }
    }
    return true;
  }

  markStuds(brickRecord) {
    const { id, anchorX, anchorZ, baseLayer, width, length, heightUnits } =
      brickRecord;
    for (let w = 0; w < width; w++) {
      for (let l = 0; l < length; l++) {
        const x = anchorX + w;
        const z = anchorZ + l;
        for (let h = 0; h < heightUnits; h++) {
          const layer = baseLayer + h;
          if (!this.occupied[x]) this.occupied[x] = [];
          if (!this.occupied[x][z]) this.occupied[x][z] = [];
          this.occupied[x][z][layer] = { brickId: id, localStud: [w, l, h] };
          if (layer > (this.topLayerPerStud[x]?.[z] ?? 0)) {
            if (!this.topLayerPerStud[x]) this.topLayerPerStud[x] = [];
            this.topLayerPerStud[x][z] = layer;
          }
        }
      }
    }
  }

  getTopLayerAt(x, z) {
    return this.topLayerPerStud?.[x]?.[z] ?? 0;
  }

  getSupportedStuds(anchorX, anchorZ, baseLayer, width, length) {
    const supportLayer = baseLayer - 1;
    let count = 0;
    const coords = [];
    for (let w = 0; w < width; w++) {
      for (let l = 0; l < length; l++) {
        const x = anchorX + w;
        const z = anchorZ + l;
        if (this.occupied?.[x]?.[z]?.[supportLayer]) {
          count++;
          coords.push([x, z]);
        }
      }
    }
    return { count, coords };
  }

  getMaxFreeRectFrom(anchorX, anchorZ, layer, bounds) {
    // same as before – keep your version or this one
    const maxZ = bounds.z + bounds.length;
    const maxX = bounds.x + bounds.width;
    let maxWidthSoFar = Infinity;
    let best = { width: 0, length: 0 };
    for (let dz = 0; anchorZ + dz < maxZ; dz++) {
      const z = anchorZ + dz;
      let rowWidth = 0;
      for (let dx = 0; anchorX + dx < maxX; dx++) {
        const x = anchorX + dx;
        if (this.occupied?.[x]?.[z]?.[layer]) break;
        rowWidth++;
      }
      if (rowWidth === 0) break;
      if (rowWidth < maxWidthSoFar) maxWidthSoFar = rowWidth;
      const candidateWidth = maxWidthSoFar;
      const candidateLength = dz + 1;
      if (candidateWidth * candidateLength > best.width * best.length) {
        best = { width: candidateWidth, length: candidateLength };
      }
    }
    return best;
  }

  // --- ADD THIS ---
  markBaseplate(size = this.gridSize) {
    for (let x = 0; x < size; x++) {
      for (let z = 0; z < size; z++) {
        // layer 0 = top surface of the baseplate
        if (!this.occupied[x][z]) this.occupied[x][z] = [];
        this.occupied[x][z][0] = { brickId: -1, localStud: [0, 0, 0] };
        this.topLayerPerStud[x][z] = 0;
      }
    }
  }

  markBaseplateRect(width, length, layer = 0) {
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < length; z++) {
        if (!this.occupied[x][z]) this.occupied[x][z] = [];
        this.occupied[x][z][layer] = { brickId: -1, localStud: [0, 0, 0] };
        this.topLayerPerStud[x][z] = layer;
      }
    }
  }

  unmarkStuds(brickRecord) {
    const { anchorX, anchorZ, baseLayer, width, length, heightUnits } =
      brickRecord;
    for (let w = 0; w < width; w++) {
      for (let l = 0; l < length; l++) {
        const x = anchorX + w;
        const z = anchorZ + l;
        if (!this.occupied?.[x]?.[z]) continue;

        for (let h = 0; h < heightUnits; h++) {
          this.occupied[x][z][baseLayer + h] = null;
        }

        let newTop = 0;
        for (let lay = this.occupied[x][z].length - 1; lay >= 0; lay--) {
          if (this.occupied[x][z][lay]) {
            newTop = lay;
            break;
          }
        }
        this.topLayerPerStud[x][z] = newTop;
      }
    }
  }

  clone() {
    const newGrid = new StudGrid(this.gridSize);
    newGrid.occupied = JSON.parse(JSON.stringify(this.occupied));
    newGrid.topLayerPerStud = JSON.parse(JSON.stringify(this.topLayerPerStud));
    return newGrid;
  }

}

